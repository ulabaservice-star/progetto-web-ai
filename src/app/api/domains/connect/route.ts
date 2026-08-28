import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { guardMutatingRequest, jsonError } from '@/app/api/_shared/request-guard';
import { guardOwnedSite } from '@/app/api/_shared/route-guards';
import { createServerSupabaseClient, getUser } from '@/data/supabase-ssr';
import { resolveSiteAccountId } from '@/data/account';
import { getAccountEntitlement } from '@/data/subscriptions';
import { normalizeHostname, classifyHostname } from '@/domain/domains/hostname';
import { companionHostname } from '@/domain/domains/companion';
import { dnsInstructionsFor } from '@/domain/domains/dns-instructions';
import { getPlatformDnsTargets, getVercelDomainProvider } from '@/data/domain/vercel';
import { createPendingDomain, type SiteDomainKind } from '@/data/site-domains-write';
import { getDomainByHost } from '@/data/site-domains';
import type { DomainProvider, VerificationRequirement } from '@/domain/domains/domain-port';

// DOM-301/302/303 (macrotask domain-connect, p5-custom-domains-fase2) — POST /api/domains/connect:
// l'endpoint che collega un dominio custom (dell'utente, DOM-D1) a un suo sito. Costruito in tre
// fette che compongono i pezzi gia' verdi:
//  - AUTH (DOM-301): request-guard (same-origin + tetto byte, CSRF) + getUser + route-guards
//    (proprieta' del site_id) + gate entitlement custom_domain letto DAL SERVER. L'accountId e'
//    DERIVATO dal sito posseduto (resolveSiteAccountId), MAI dal body (no IDOR, A01:2025): un Free
//    o un non-proprietario e' respinto QUI, prima di ogni logica/scrittura.
//  - LOGICA (DOM-302): normalizeHostname + classifyHostname (invalid/reserved => 422, DOM-D7);
//    addDomain sulla porta DomainProvider (fake nei test, inerte senza env DOM-D9); createPendingDomain
//    (writer service_role confinato) crea la riga 'pending' col token; risposta 200 con le istruzioni
//    DNS (dnsInstructionsFor + verification[] del provider, R1). Idempotente sull'UNIQUE.
//  - AUTO-WWW (DOM-303): un apex collega anche il companion www (companionHostname), ri-validato
//    dalle STESSE normalize/classify prima di collegarlo; un subdomain non genera companion.
//
// SICUREZZA:
//  - A01:2025 authz/IDOR — gate custom_domain dal server; accountId dal sito posseduto, mai dal body;
//    proprieta' del site_id via route-guards. Nessun service_role nel percorso utente: solo il writer
//    (createPendingDomain) e' service_role confinato (DOM-222).
//  - A01:2025 anti-hijack — addDomain sulla porta viene PRIMA di createPendingDomain: il provider
//    (stesso progetto Vercel) e' la fonte dell'unicita' globale reale, quindi un host gia' collegato
//    da un altro tenant fallisce li', prima che l'upsert su normalized_hostname del writer possa
//    toccare una riga altrui. L'ad 'active' non lo muove questo endpoint (DOM-D4): nasce 'pending'.
//  - A05:2025 validazione — l'hostname non fidato passa da normalize/classify (dominio puro) prima
//    di DB o provider; reserved-domains bloccati.

// Il corpo legittimo e' un solo { siteId, hostname }: 512 byte bastano (hostname <= 253 + uuid).
const MAX_BODY_BYTES = 512;

const ConnectBody = z.object({ siteId: z.string().min(1), hostname: z.string().min(1) }).strict();

// Contesto immutabile di un collegamento, risolto una volta nella fetta auth e passato a connectHost.
type ConnectContext = {
  readonly accountId: string;
  readonly siteId: string;
  readonly provider: DomainProvider;
  readonly targets: { readonly apexTarget: string; readonly cnameTarget: string };
};

// Esito di un singolo collegamento (apex o companion) restituito al client: lo stato 'pending', i
// record DNS da impostare (istruzioni pure) e i requisiti di verifica del provider (challenge, R1).
type LinkResult = {
  readonly hostname: string;
  readonly kind: SiteDomainKind;
  readonly status: 'pending';
  readonly records: readonly { readonly type: string; readonly name: string; readonly value: string }[];
  readonly verification: VerificationRequirement[];
};

/** Compone le istruzioni DNS (record primario + TXT del token) per un host gia' normalizzato. */
function buildLinkResult(
  normalized: string,
  kind: SiteDomainKind,
  ctx: ConnectContext,
  token: string,
  verification: VerificationRequirement[],
): LinkResult {
  const target = kind === 'apex' ? ctx.targets.apexTarget : ctx.targets.cnameTarget;
  return {
    hostname: normalized,
    kind,
    status: 'pending',
    records: dnsInstructionsFor(normalized, kind, target, token),
    verification,
  };
}

/**
 * Collega UN host gia' normalizzato+classificato: idempotente se il chiamante l'ha gia' collegato a
 * QUESTO sito (riusa il token, nessuna nuova scrittura); altrimenti addDomain sulla porta (anti-hijack)
 * poi createPendingDomain col token fresco. Puo' lanciare (errore della porta) => il chiamante lo
 * traduce in 502.
 */
async function connectHost(
  normalized: string,
  kind: SiteDomainKind,
  ctx: ConnectContext,
): Promise<LinkResult> {
  // Idempotenza (DOM-302 AC-302-3 / DOM-303 AC-303-3): una mia riga per QUESTO sito esiste gia'? Allora
  // riuso il token esistente senza ri-chiamare il provider ne' ri-scrivere (nessun duplicato: UNIQUE).
  const existing = await getDomainByHost(normalized);
  if (existing && existing.site_id === ctx.siteId) {
    return buildLinkResult(normalized, kind, ctx, existing.verification_token ?? '', []);
  }

  // addDomain PRIMA della scrittura: il provider rifiuta un host gia' in uso (unicita' globale reale),
  // prima che l'upsert del writer possa toccare una riga di un altro tenant (anti-hijack).
  const { providerDomainId, verification } = await ctx.provider.addDomain(normalized);
  const token = randomUUID();
  await createPendingDomain(ctx.accountId, ctx.siteId, normalized, kind, token, providerDomainId);
  return buildLinkResult(normalized, kind, ctx, token, verification);
}

export async function POST(request: NextRequest): Promise<Response> {
  // ── Fetta AUTH (DOM-301) ──────────────────────────────────────────────────────────────────────
  const guardFailure = guardMutatingRequest(request, { maxBodyBytes: MAX_BODY_BYTES });
  if (guardFailure) return guardFailure;

  const user = await getUser();
  if (!user) return jsonError(401, 'unauthorized');

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, 'invalid-body');
  }
  const parsed = ConnectBody.safeParse(rawBody);
  if (!parsed.success) return jsonError(400, 'invalid-body');
  const { siteId, hostname } = parsed.data;

  // Proprieta' del sito (route-guards): non proprio/inesistente => 404, nessuna scrittura.
  const ownership = await guardOwnedSite(siteId);
  if (ownership) return ownership;

  // Account DERIVATO dal sito (mai dal body). Dopo guardOwnedSite il sito e' del chiamante: un null
  // qui e' un guasto di lettura => 500 (mai proseguire senza account).
  const supabase = await createServerSupabaseClient();
  const accountId = await resolveSiteAccountId(supabase, siteId);
  if (accountId === null) return jsonError(500, 'unavailable');

  // Gate entitlement custom_domain letto DAL SERVER (Pro). Free (o guasto => free) => 403 JSON.
  const entitlement = await getAccountEntitlement(accountId);
  if (entitlement.limits.custom_domain !== true) return jsonError(403, 'forbidden');

  // ── Fetta LOGICA (DOM-302) ────────────────────────────────────────────────────────────────────
  const primary = normalizeHostname(hostname);
  if (!primary.ok) return jsonError(422, primary.reason); // invalid_format
  const primaryClass = classifyHostname(primary.normalized);
  if (!primaryClass.ok) return jsonError(422, primaryClass.reason); // reserved

  const ctx: ConnectContext = {
    accountId,
    siteId,
    provider: getVercelDomainProvider(),
    targets: getPlatformDnsTargets(),
  };

  try {
    const domains: LinkResult[] = [await connectHost(primary.normalized, primaryClass.kind, ctx)];

    // ── AUTO-WWW (DOM-303) ──────────────────────────────────────────────────────────────────────
    // Un apex collega anche www.<apex>: il companion passa dalle STESSE normalize/classify prima di
    // essere collegato (nessun host non validato entra in un collegamento). Un subdomain => nessuno.
    const companion = companionHostname(primary.normalized, primaryClass.kind);
    if (companion) {
      const companionNorm = normalizeHostname(companion.hostname);
      if (companionNorm.ok) {
        const companionClass = classifyHostname(companionNorm.normalized);
        if (companionClass.ok) {
          domains.push(await connectHost(companionNorm.normalized, companionClass.kind, ctx));
        }
      }
    }

    return NextResponse.json({ domains }, { status: 200 });
  } catch (error) {
    console.error('[domains/connect] collegamento fallito', error);
    return jsonError(502, 'connect-failed');
  }
}

import { type NextRequest, type NextResponse } from 'next/server';
import { z } from 'zod';
import { guardMutatingRequest, jsonError } from '@/app/api/_shared/request-guard';
import { getUser } from '@/data/supabase-ssr';
import { getDomainByHost, type SiteDomainSummary } from '@/data/site-domains';

// macrotask domain-verify-disconnect (DOM-311/321, p5-custom-domains-fase2) — il PREAMBOLO condiviso
// dei due endpoint che operano su un collegamento gia' esistente (verify e disconnect): la catena
// same-origin + tetto byte (request-guard), l'identita' (getUser), il parse del corpo { hostname } e
// la RISOLUZIONE del collegamento POSSEDUTO. Estratto perche' entrambe le rotte lo fanno IDENTICO
// (come request-guard/route-guards furono estratti per connect+onboarding): una sola copia della
// catena d'ingresso evita che, alla prossima modifica, una delle due perda un controllo.
//
// PROPRIETA' DEL COLLEGAMENTO (A01:2025, no IDOR): non si guarda il site_id del body ne' si deriva
// l'account da input del client. getDomainByHost legge sotto la RLS di SESSIONE (owner-only): un host
// altrui o inesistente => `record: null` (indistinguibili, P1-D21). Ogni endpoint decide cosa fare del
// null (verify => 404; disconnect => 200 idempotente): il preambolo NON impone lo status, restituisce
// solo il record (o null) dopo aver superato guardie e parse.

// Corpo legittimo: un solo { hostname }. 512 byte bastano (hostname <= 253). Locale al modulo:
// entrambe le rotte passano da resolveOwnedDomainRequest, nessuna deriva un proprio tetto.
const MAX_DOMAIN_BODY_BYTES = 512;

const DomainRequestBody = z.object({ hostname: z.string().min(1) }).strict();

/** Esito del preambolo: `ok:false` porta gia' la risposta di rifiuto (403/413/401/400); `ok:true`
 *  porta il record del collegamento posseduto, o `null` se il chiamante non lo possiede. */
export type OwnedDomainResolution =
  | { readonly ok: true; readonly record: SiteDomainSummary | null }
  | { readonly ok: false; readonly response: NextResponse };

/** Applica guard + auth + parse { hostname } e risolve il collegamento POSSEDUTO (RLS di sessione). */
export async function resolveOwnedDomainRequest(request: NextRequest): Promise<OwnedDomainResolution> {
  const guardFailure = guardMutatingRequest(request, { maxBodyBytes: MAX_DOMAIN_BODY_BYTES });
  if (guardFailure) return { ok: false, response: guardFailure };

  const user = await getUser();
  if (!user) return { ok: false, response: jsonError(401, 'unauthorized') };

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return { ok: false, response: jsonError(400, 'invalid-body') };
  }
  const parsed = DomainRequestBody.safeParse(rawBody);
  if (!parsed.success) return { ok: false, response: jsonError(400, 'invalid-body') };

  // getDomainByHost normalizza (DOM-111) e legge sotto RLS: altrui/inesistente => null.
  const record = await getDomainByHost(parsed.data.hostname);
  return { ok: true, record };
}

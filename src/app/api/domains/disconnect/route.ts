import { NextResponse, type NextRequest } from 'next/server';
import { jsonError } from '@/app/api/_shared/request-guard';
import { resolveOwnedDomainRequest } from '@/app/api/domains/_shared';
import { deleteDomainByHost } from '@/data/site-domains';
import { getVercelDomainProvider } from '@/data/domain/vercel';

// DOM-321 (macrotask domain-verify-disconnect, p5-custom-domains-fase2) — POST /api/domains/disconnect:
// scollegamento VOLONTARIO di un dominio custom del proprietario. removeDomain sulla porta
// DomainProvider + rimozione della riga owner-side (RLS DELETE di sessione, mai service_role: R7).
// Distinto dalla sospensione da downgrade (reversibile, domain-downgrade): qui l'utente RINUNCIA, ma
// il sito su /s/<slug> resta pubblicato — si tocca SOLO site_domains, mai site_publications.
//
// SICUREZZA:
//  - A01:2025 proprieta'/anti-hijack — removeDomain e deleteDomainByHost vengono chiamati SOLO quando
//    resolveOwnedDomainRequest ha restituito un record NON null, cioe' un collegamento che la RLS di
//    sessione riconosce come del chiamante. Un host non-proprio (RLS => record null) NON tocca ne' il
//    provider (Vercel: unicita' globale, rimuoverebbe il dominio di un ALTRO tenant) ne' il DB.
//  - Idempotente — nessun collegamento del chiamante per quell'host => 200 no-op (P1-D21: altrui e
//    inesistente indistinguibili, nessuna enumerazione). removeDomain lato adattatore e' gia'
//    idempotente (404 = gia' assente). NESSUN gate custom_domain: anche un account senza la feature
//    deve poter scollegare un dominio residuo.

export async function POST(request: NextRequest): Promise<Response> {
  const resolved = await resolveOwnedDomainRequest(request);
  if (!resolved.ok) return resolved.response;

  const record = resolved.record;
  // Nessun collegamento del chiamante per quell'host => 200 idempotente, nessuna rimozione (ne' provider
  // ne' DB): non si tocca un eventuale collegamento di un altro tenant.
  if (!record) return NextResponse.json({ ok: true }, { status: 200 });

  const host = record.normalized_hostname;
  try {
    // removeDomain PRIMA della rimozione della riga: se il provider fallisce la riga resta (ritentabile).
    await getVercelDomainProvider().removeDomain(host);
    await deleteDomainByHost(host);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[domains/disconnect] scollegamento fallito', error);
    return jsonError(502, 'disconnect-failed');
  }
}

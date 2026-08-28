import { NextResponse, type NextRequest } from 'next/server';
import { jsonError } from '@/app/api/_shared/request-guard';
import { resolveOwnedDomainRequest } from '@/app/api/domains/_shared';
import { getAccountEntitlement } from '@/data/subscriptions';
import { setDomainStatus } from '@/data/site-domains-write';
import { getVercelDomainProvider } from '@/data/domain/vercel';

// DOM-311 (macrotask domain-verify-disconnect, p5-custom-domains-fase2) — POST /api/domains/verify:
// l'UNICO punto che porta un collegamento ad 'active' (server-side, DOM-D4). Interroga
// getVerificationStatus sulla porta DomainProvider e transiziona lo stato via il writer service_role:
//   'verified'      => 'active' (+verified_at)  — DNS confermato: il dominio diventa instradabile.
//   'pending'       => 'verifying'              — challenge ancora in sospeso: NON instradabile.
//   'misconfigured' => 'error' (+detail)        — DNS errato/incompleto: l'utente deve correggere.
//
// SICUREZZA:
//  - A01:2025 anti-hijack (DOM-D4) — nessun percorso porta ad 'active' senza 'verified' dal provider;
//    la transizione la muove SOLO il server (nessuna UPDATE authenticated su site_domains, DOM-101).
//  - A01:2025 proprieta'/IDOR — la proprieta' del collegamento e' la RLS di sessione dentro
//    resolveOwnedDomainRequest (getDomainByHost owner-only): un host altrui/inesistente => record null
//    => 404, prima di interrogare il provider o scrivere. L'accountId del gate custom_domain deriva
//    dal RECORD (mai dal body).
//  - Idempotenza — un collegamento gia' 'active' e' un no-op: non ri-interroga il provider ne' riscrive.

export async function POST(request: NextRequest): Promise<Response> {
  const resolved = await resolveOwnedDomainRequest(request);
  if (!resolved.ok) return resolved.response;

  const record = resolved.record;
  if (!record) return jsonError(404, 'not-found'); // altrui/inesistente (RLS) => nessuna transizione

  // Gate entitlement custom_domain letto DAL SERVER, accountId dal record posseduto (mai dal body).
  const entitlement = await getAccountEntitlement(record.account_id);
  if (entitlement.limits.custom_domain !== true) return jsonError(403, 'forbidden');

  // Idempotente (AC-311-4): gia' attivo => no-op, senza ri-chiamare il provider.
  if (record.status === 'active') {
    return NextResponse.json({ status: 'active' }, { status: 200 });
  }

  const host = record.normalized_hostname;
  try {
    const result = await getVercelDomainProvider().getVerificationStatus(host);
    if (result.state === 'verified') {
      const verified_at = new Date().toISOString();
      await setDomainStatus(host, 'active', { verified_at });
      return NextResponse.json({ status: 'active', verified_at }, { status: 200 });
    }
    if (result.state === 'pending') {
      await setDomainStatus(host, 'verifying');
      return NextResponse.json({ status: 'verifying' }, { status: 200 });
    }
    // 'misconfigured': DNS errato/incompleto. `detail` fa parte del contratto (diagnostica) anche se
    // lo schema non lo persiste ancora; un default normalizzato quando il provider non ne fornisce uno.
    const detail = result.detail ?? 'dns_misconfigured';
    await setDomainStatus(host, 'error', { detail });
    return NextResponse.json({ status: 'error', detail }, { status: 200 });
  } catch (error) {
    console.error('[domains/verify] verifica fallita', error);
    return jsonError(502, 'verify-failed');
  }
}

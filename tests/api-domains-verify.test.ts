// @vitest-environment node
//
// DOM-311 (macrotask domain-verify-disconnect, p5-custom-domains-fase2) — ORACOLO di
// POST /api/domains/verify. Le asserzioni derivano dagli acceptance_criteria AC-311-1..5
// (09-domain-verify-disconnect.md), taggate `// covers: AC-311-x` sulla riga dell'EXPECT.
//
// verify e' l'UNICO punto che porta un dominio ad 'active' (server-side, DOM-D4): interroga
// getVerificationStatus sulla porta e transiziona lo stato via il writer — 'verified' => 'active'
// (+verified_at), 'pending' => 'verifying', 'misconfigured' => 'error'+detail. Un dominio gia'
// 'active' e' un no-op idempotente (non ri-interroga il provider). La proprieta' del collegamento
// e' garantita da getDomainByHost sotto RLS di sessione: un host altrui/inesistente => null => 404,
// prima di ogni transizione (nessun accountId dal body: no IDOR). Gate custom_domain dal server.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDomainProvider, type FakeDomainProvider } from './helpers/fake-domain-provider';
import type { VerificationState } from '@/domain/domains/domain-port';
import type { SiteDomainSummary, SiteDomainStatus } from '@/data/site-domains';

const { authHolder } = vi.hoisted(() => ({ authHolder: { user: { id: 'user-a' } as { id: string } | null } }));
vi.mock('@/data/supabase-ssr', () => ({
  getUser: async () => authHolder.user,
  createServerSupabaseClient: async () => ({}),
}));

// Il collegamento come lo vede il proprietario sotto RLS: null = altrui/inesistente (indistinguibili).
const { recordHolder } = vi.hoisted(() => ({ recordHolder: { current: null as SiteDomainSummary | null } }));
vi.mock('@/data/site-domains', () => ({
  getDomainByHost: async () => recordHolder.current,
}));

const { entitlementHolder } = vi.hoisted(() => ({
  entitlementHolder: { current: { limits: { custom_domain: true } } as unknown },
}));
vi.mock('@/data/subscriptions', () => ({
  getAccountEntitlement: async () => entitlementHolder.current,
}));

const { setStatusSpy } = vi.hoisted(() => ({ setStatusSpy: vi.fn(async () => undefined) }));
vi.mock('@/data/site-domains-write', () => ({ setDomainStatus: setStatusSpy }));

const { providerHolder } = vi.hoisted(() => ({ providerHolder: { current: null as unknown } }));
vi.mock('@/data/domain/vercel', () => ({
  getVercelDomainProvider: () => providerHolder.current,
}));

import { POST } from '@/app/api/domains/verify/route';

const ORIGIN = 'http://localhost';
const HOST = 'iltuobar.it';

/** Un record di collegamento del proprietario, con lo `status` di partenza voluto. */
function ownedRecord(status: SiteDomainStatus): SiteDomainSummary {
  return {
    id: 'dom-1',
    account_id: 'acc-A',
    site_id: 'site-a',
    hostname: HOST,
    normalized_hostname: HOST,
    kind: 'apex',
    status,
    provider: 'vercel',
    provider_domain_id: 'fake_domain_' + HOST,
    public_slug: null,
    verification_token: 'tok-1',
    verified_at: null,
    created_at: '2026-08-01T00:00:00.000Z',
  };
}

function verifyRequest(hostname: string = HOST): NextRequest {
  const headers = new Headers({
    'content-type': 'application/json',
    origin: ORIGIN,
    'sec-fetch-site': 'same-origin',
  });
  return new NextRequest(new URL('/api/domains/verify', ORIGIN), {
    method: 'POST',
    headers,
    body: JSON.stringify({ hostname }),
  });
}

let fake: FakeDomainProvider;
/** Semina il fake col solo `HOST` allo stato di provider voluto e lo rende il provider attivo. */
function seedProvider(state: VerificationState) {
  fake = createFakeDomainProvider({ [HOST]: state });
  providerHolder.current = fake;
}

beforeEach(() => {
  authHolder.user = { id: 'user-a' };
  recordHolder.current = null;
  entitlementHolder.current = { limits: { custom_domain: true } };
  setStatusSpy.mockClear();
  seedProvider('pending');
});

describe('DOM-311 POST /api/domains/verify — transizione guidata dal provider', () => {
  it("provider 'verified' => 200 e transizione ad 'active' con verified_at (instradabile)", async () => {
    recordHolder.current = ownedRecord('pending');
    seedProvider('verified');

    const res = await POST(verifyRequest());

    expect(res.status).toBe(200); // covers: AC-311-1
    expect((await res.json()).status).toBe('active'); // covers: AC-311-1 — instradabile = 'active'
    expect(setStatusSpy).toHaveBeenCalledWith(
      HOST,
      'active',
      expect.objectContaining({ verified_at: expect.any(String) }),
    ); // covers: AC-311-1 — 'active' + verified_at
    expect(fake.calls.getVerificationStatus).toEqual([HOST]); // covers: AC-311-1 — provider interrogato
  });

  it("provider 'pending' => resta 'verifying', NON 'active' (nessuna attivazione prematura)", async () => {
    recordHolder.current = ownedRecord('pending');
    seedProvider('pending');

    const res = await POST(verifyRequest());

    expect(res.status).toBe(200); // covers: AC-311-2
    expect((await res.json()).status).toBe('verifying'); // covers: AC-311-2 — NON instradabile
    expect(setStatusSpy).toHaveBeenCalledTimes(1); // covers: AC-311-2 — un'unica transizione
    expect(setStatusSpy).toHaveBeenCalledWith(HOST, 'verifying'); // covers: AC-311-2 — 'verifying', mai 'active'
  });

  it("provider 'misconfigured' => 'error' con un detail, senza attivazione", async () => {
    recordHolder.current = ownedRecord('pending');
    seedProvider('misconfigured');

    const res = await POST(verifyRequest());

    expect(res.status).toBe(200); // covers: AC-311-3
    const payload = await res.json();
    expect(payload.status).toBe('error'); // covers: AC-311-3
    expect(typeof payload.detail).toBe('string'); // covers: AC-311-3 — un detail
    expect(payload.detail.length).toBeGreaterThan(0); // covers: AC-311-3
    expect(setStatusSpy).toHaveBeenCalledWith(
      HOST,
      'error',
      expect.objectContaining({ detail: expect.any(String) }),
    ); // covers: AC-311-3 — 'error' + detail, mai 'active'
  });

  it("dominio gia' 'active' => resta 'active' (idempotente, no-op: provider non interrogato)", async () => {
    recordHolder.current = ownedRecord('active');
    seedProvider('verified');

    const res = await POST(verifyRequest());

    expect(res.status).toBe(200); // covers: AC-311-4
    expect((await res.json()).status).toBe('active'); // covers: AC-311-4
    expect(setStatusSpy).not.toHaveBeenCalled(); // covers: AC-311-4 — no-op, nessuna ri-transizione
    expect(fake.calls.getVerificationStatus).toEqual([]); // covers: AC-311-4 — provider non interrogato
  });

  it('utente che NON possiede il collegamento => 404, nessuna transizione', async () => {
    recordHolder.current = null; // RLS: altrui o inesistente => null (indistinguibili)

    const res = await POST(verifyRequest());

    expect(res.status).toBe(404); // covers: AC-311-5
    expect(setStatusSpy).not.toHaveBeenCalled(); // covers: AC-311-5 — nessuna transizione
    expect(fake.calls.getVerificationStatus).toEqual([]); // covers: AC-311-5 — provider mai interrogato
  });

  it('CONTRO-PROVA gate: un collegamento di un account senza custom_domain => 403, nessuna transizione', async () => {
    recordHolder.current = ownedRecord('pending');
    entitlementHolder.current = { limits: { custom_domain: false } };
    seedProvider('verified');

    const res = await POST(verifyRequest());

    expect(res.status).toBe(403); // covers: AC-311-5 — gate server (falsifica un endpoint senza gate)
    expect(setStatusSpy).not.toHaveBeenCalled(); // covers: AC-311-5
  });
});

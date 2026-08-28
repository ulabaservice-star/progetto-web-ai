// @vitest-environment node
//
// DOM-321 (macrotask domain-verify-disconnect, p5-custom-domains-fase2) — ORACOLO di
// POST /api/domains/disconnect. Le asserzioni derivano dagli acceptance_criteria AC-321-1..3
// (09-domain-verify-disconnect.md), taggate `// covers: AC-321-x` sulla riga dell'EXPECT.
//
// disconnect scollega VOLONTARIAMENTE un dominio del proprietario: removeDomain sulla porta +
// rimozione della riga owner-side (RLS DELETE di sessione, mai service_role). Distinto dalla
// sospensione da downgrade (reversibile): qui l'utente rinuncia, ma il sito /s/<slug> resta
// pubblicato (si tocca SOLO site_domains, mai site_publications). Idempotente: un host non del
// chiamante (RLS => null, indistinguibile da inesistente, P1-D21) => 200 no-op SENZA rimozione —
// la proprieta' di sicurezza e' che removeDomain/delete NON vengono chiamati su un host non-proprio.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDomainProvider, type FakeDomainProvider } from './helpers/fake-domain-provider';
import type { SiteDomainSummary, SiteDomainStatus } from '@/data/site-domains';

const { authHolder } = vi.hoisted(() => ({ authHolder: { user: { id: 'user-a' } as { id: string } | null } }));
vi.mock('@/data/supabase-ssr', () => ({
  getUser: async () => authHolder.user,
  createServerSupabaseClient: async () => ({}),
}));

const { recordHolder, deleteSpy } = vi.hoisted(() => ({
  recordHolder: { current: null as SiteDomainSummary | null },
  deleteSpy: vi.fn(async () => undefined),
}));
vi.mock('@/data/site-domains', () => ({
  getDomainByHost: async () => recordHolder.current,
  deleteDomainByHost: deleteSpy,
}));

const { providerHolder } = vi.hoisted(() => ({ providerHolder: { current: null as unknown } }));
vi.mock('@/data/domain/vercel', () => ({
  getVercelDomainProvider: () => providerHolder.current,
}));

import { POST } from '@/app/api/domains/disconnect/route';

const ORIGIN = 'http://localhost';
const HOST = 'iltuobar.it';

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

function disconnectRequest(hostname: string = HOST): NextRequest {
  const headers = new Headers({
    'content-type': 'application/json',
    origin: ORIGIN,
    'sec-fetch-site': 'same-origin',
  });
  return new NextRequest(new URL('/api/domains/disconnect', ORIGIN), {
    method: 'POST',
    headers,
    body: JSON.stringify({ hostname }),
  });
}

let fake: FakeDomainProvider;
beforeEach(() => {
  authHolder.user = { id: 'user-a' };
  recordHolder.current = null;
  deleteSpy.mockClear();
  fake = createFakeDomainProvider({ [HOST]: 'verified' });
  providerHolder.current = fake;
});

describe('DOM-321 POST /api/domains/disconnect — scollegamento volontario', () => {
  it("collegamento 'active' del proprietario => removeDomain + riga rimossa (sito resta pubblicato)", async () => {
    recordHolder.current = ownedRecord('active');

    const res = await POST(disconnectRequest());

    expect(res.status).toBe(200); // covers: AC-321-1
    expect(fake.calls.removeDomain).toEqual([HOST]); // covers: AC-321-1 — porta chiamata
    expect(deleteSpy).toHaveBeenCalledWith(HOST); // covers: AC-321-1 — riga rimossa (owner-side)
    // "sito resta pubblicato": per costruzione l'endpoint tocca SOLO site_domains (mai site_publications).
  });

  it('utente che NON possiede il collegamento => nessuna rimozione (provider e riga intatti)', async () => {
    recordHolder.current = null; // RLS: collegamento altrui => null

    const res = await POST(disconnectRequest());

    expect(res.status).toBe(200); // covers: AC-321-2 — no-enumeration (P1-D21)
    expect(fake.calls.removeDomain).toEqual([]); // covers: AC-321-2 — provider mai chiamato sull'altrui
    expect(deleteSpy).not.toHaveBeenCalled(); // covers: AC-321-2 — nessuna rimozione
  });

  it('host gia\' scollegato o inesistente => 200 idempotente senza errore', async () => {
    recordHolder.current = null; // gia' scollegato per l'utente

    const res = await POST(disconnectRequest('mai.collegato.it'));

    expect(res.status).toBe(200); // covers: AC-321-3 — idempotente
    expect(fake.calls.removeDomain).toEqual([]); // covers: AC-321-3 — nessuna chiamata
    expect(deleteSpy).not.toHaveBeenCalled(); // covers: AC-321-3
  });
});

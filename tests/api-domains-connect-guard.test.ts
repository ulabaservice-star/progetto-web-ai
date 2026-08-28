// @vitest-environment node
//
// DOM-301 (macrotask domain-connect, p5-custom-domains-fase2) — ORACOLO della fetta AUTH di
// POST /api/domains/connect. Le asserzioni derivano dagli acceptance_criteria AC-301-1..3
// (08-domain-connect.md), taggate `// covers: AC-301-x` sulla riga dell'EXPECT.
//
// PROPRIETA' DI SICUREZZA: il gate custom_domain e' letto DAL SERVER e l'accountId e' DERIVATO
// dal sito posseduto (mai dal body): un Free o un non-proprietario e' respinto PRIMA di ogni
// scrittura (createPendingDomain mai chiamato, provider mai chiamato). Cross-origin/oltre-byte
// => request-guard (403/413), come gli altri POST del progetto.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDomainProvider, type FakeDomainProvider } from './helpers/fake-domain-provider';

const { authHolder, siteAccountHolder, entitlementHolder, sitesHolder, providerHolder } = vi.hoisted(
  () => ({
    authHolder: { user: null as { id: string } | null },
    siteAccountHolder: { id: null as string | null },
    entitlementHolder: { current: { limits: { custom_domain: false } } as unknown },
    sitesHolder: { list: { ok: true, sites: [] as { id: string }[] } as unknown },
    providerHolder: { current: null as unknown },
  }),
);

vi.mock('@/data/supabase-ssr', () => ({
  getUser: async () => authHolder.user,
  createServerSupabaseClient: async () => ({}),
}));
vi.mock('@/data/account', () => ({
  resolveSiteAccountId: async () => siteAccountHolder.id,
}));
vi.mock('@/data/subscriptions', () => ({
  getAccountEntitlement: async () => entitlementHolder.current,
}));
vi.mock('@/data/sites', () => ({ listSites: async () => sitesHolder.list }));
vi.mock('@/data/briefs', () => ({ getBrief: async () => ({ ok: true, brief: null }) }));
vi.mock('@/data/domain/vercel', () => ({
  getVercelDomainProvider: () => providerHolder.current,
  getPlatformDnsTargets: () => ({ apexTarget: '76.76.21.21', cnameTarget: 'cname.vercel-dns.com' }),
}));
vi.mock('@/data/site-domains', () => ({ getDomainByHost: async () => null }));

const { createPendingSpy } = vi.hoisted(() => ({ createPendingSpy: vi.fn(async () => undefined) }));
vi.mock('@/data/site-domains-write', () => ({ createPendingDomain: createPendingSpy }));

import { POST } from '@/app/api/domains/connect/route';

const ORIGIN = 'http://localhost';
const SITE_A = 'site-of-a';

type Init = { origin?: string | null; fetchSite?: string | null; contentLength?: string; body?: unknown };
function connectRequest(init: Init = {}): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  const origin = init.origin === undefined ? ORIGIN : init.origin;
  if (origin !== null) headers.set('origin', origin);
  const fetchSite = init.fetchSite === undefined ? 'same-origin' : init.fetchSite;
  if (fetchSite !== null) headers.set('sec-fetch-site', fetchSite);
  if (init.contentLength !== undefined) headers.set('content-length', init.contentLength);
  const body = init.body === undefined ? { siteId: SITE_A, hostname: 'iltuobar.it' } : init.body;
  return new NextRequest(new URL('/api/domains/connect', ORIGIN), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

let fake: FakeDomainProvider;
beforeEach(() => {
  fake = createFakeDomainProvider();
  providerHolder.current = fake;
  authHolder.user = { id: 'user-a' };
  siteAccountHolder.id = 'acc-A';
  sitesHolder.list = { ok: true, sites: [{ id: SITE_A }] };
  entitlementHolder.current = { limits: { custom_domain: false } };
  createPendingSpy.mockClear();
});

describe('DOM-301 POST /api/domains/connect — fetta auth (guardie + gate custom_domain)', () => {
  it('utente Free proprietario => 403 e nessuna riga creata (gate server)', async () => {
    entitlementHolder.current = { limits: { custom_domain: false } };

    const res = await POST(connectRequest());

    expect(res.status).toBe(403); // covers: AC-301-1
    expect(createPendingSpy).not.toHaveBeenCalled(); // covers: AC-301-1 — nessuna riga site_domains
    expect(fake.calls.addDomain).toEqual([]); // covers: AC-301-1 — provider mai chiamato
  });

  it('utente che NON possiede il sito => respinto (404) prima di ogni scrittura', async () => {
    sitesHolder.list = { ok: true, sites: [{ id: 'site-of-someone-else' }] };

    const res = await POST(connectRequest());

    expect(res.status).toBe(404); // covers: AC-301-2
    expect(createPendingSpy).not.toHaveBeenCalled(); // covers: AC-301-2 — nessuna scrittura
    expect(fake.calls.addDomain).toEqual([]); // covers: AC-301-2
  });

  it('richiesta cross-origin (CSRF) => 403 da request-guard, nessuna scrittura', async () => {
    entitlementHolder.current = { limits: { custom_domain: true } }; // anche Pro: la guardia precede il gate

    const res = await POST(connectRequest({ fetchSite: 'cross-site' }));

    expect(res.status).toBe(403); // covers: AC-301-3
    expect(createPendingSpy).not.toHaveBeenCalled(); // covers: AC-301-3
  });

  it('Content-Length oltre il tetto => 413 prima di leggere il corpo, nessuna scrittura', async () => {
    const res = await POST(connectRequest({ contentLength: '100000' }));

    expect(res.status).toBe(413); // covers: AC-301-3
    expect(createPendingSpy).not.toHaveBeenCalled(); // covers: AC-301-3
  });

  it('Sec-Fetch-Site assente => 403 fail-closed, nessuna scrittura', async () => {
    const res = await POST(connectRequest({ fetchSite: null }));

    expect(res.status).toBe(403); // covers: AC-301-3
    expect(createPendingSpy).not.toHaveBeenCalled(); // covers: AC-301-3
  });

  it('CONTRO-PROVA: Pro proprietario supera il gate (non 403 di gate) e collega', async () => {
    entitlementHolder.current = { limits: { custom_domain: true } };

    const res = await POST(connectRequest({ body: { siteId: SITE_A, hostname: 'iltuobar.it' } }));

    expect(res.status).toBe(200); // covers: AC-301-1 — il gate NON blocca un Pro (falsifica un gate sempre-403)
    expect(createPendingSpy).toHaveBeenCalled(); // covers: AC-301-1
  });
});

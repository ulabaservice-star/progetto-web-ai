// @vitest-environment node
//
// DOM-303 (macrotask domain-connect, p5-custom-domains-fase2) — ORACOLO dell'auto-www di
// POST /api/domains/connect. Le asserzioni derivano dagli acceptance_criteria AC-303-1..3
// (08-domain-connect.md), taggate `// covers: AC-303-x`.
//
// Un apex collega DUE righe (apex + www.<apex>); un subdomain ne collega UNA (nessun companion).
// Il companion passa dalle STESSE normalize/classify dell'host primario (security_note). Lo store
// in-memory prova l'idempotenza: un apex gia' collegato col suo www => nessun duplicato al ri-invio.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDomainProvider, type FakeDomainProvider } from './helpers/fake-domain-provider';

const { authHolder } = vi.hoisted(() => ({ authHolder: { user: { id: 'user-a' } as { id: string } } }));
vi.mock('@/data/supabase-ssr', () => ({
  getUser: async () => authHolder.user,
  createServerSupabaseClient: async () => ({}),
}));
vi.mock('@/data/account', () => ({ resolveSiteAccountId: async () => 'acc-A' }));
vi.mock('@/data/subscriptions', () => ({
  getAccountEntitlement: async () => ({ limits: { custom_domain: true } }),
}));
vi.mock('@/data/sites', () => ({ listSites: async () => ({ ok: true, sites: [{ id: 'site-of-a' }] }) }));
vi.mock('@/data/briefs', () => ({ getBrief: async () => ({ ok: true, brief: null }) }));

const { providerHolder } = vi.hoisted(() => ({ providerHolder: { current: null as unknown } }));
vi.mock('@/data/domain/vercel', () => ({
  getVercelDomainProvider: () => providerHolder.current,
  getPlatformDnsTargets: () => ({ apexTarget: '76.76.21.21', cnameTarget: 'cname.vercel-dns.com' }),
}));

const { store, createdHolder, createPendingSpy } = vi.hoisted(() => {
  const store = new Map<string, { site_id: string; verification_token: string }>();
  const createdHolder = { created: [] as string[] };
  return {
    store,
    createdHolder,
    createPendingSpy: vi.fn(
      async (_accountId: string, siteId: string, normalized: string, _kind: string, token: string) => {
        store.set(normalized, { site_id: siteId, verification_token: token });
        createdHolder.created.push(normalized);
      },
    ),
  };
});
vi.mock('@/data/site-domains-write', () => ({ createPendingDomain: createPendingSpy }));
vi.mock('@/data/site-domains', () => ({
  getDomainByHost: async (host: string) => store.get(host) ?? null,
}));

import { POST } from '@/app/api/domains/connect/route';

const ORIGIN = 'http://localhost';
const SITE_A = 'site-of-a';
function connectRequest(hostname: string): NextRequest {
  const headers = new Headers({
    'content-type': 'application/json',
    origin: ORIGIN,
    'sec-fetch-site': 'same-origin',
  });
  return new NextRequest(new URL('/api/domains/connect', ORIGIN), {
    method: 'POST',
    headers,
    body: JSON.stringify({ siteId: SITE_A, hostname }),
  });
}

let fake: FakeDomainProvider;
beforeEach(() => {
  fake = createFakeDomainProvider();
  providerHolder.current = fake;
  store.clear();
  createdHolder.created = [];
  createPendingSpy.mockClear();
});

describe('DOM-303 POST /api/domains/connect — auto-www (companion apex+www)', () => {
  it('collegando un apex => DUE righe pending: apex e www.<apex>', async () => {
    const res = await POST(connectRequest('iltuobar.it'));

    expect(res.status).toBe(200); // covers: AC-303-1
    // Esistono DUE collegamenti: l'apex e il suo companion www, entrambi 'pending'.
    expect(createdHolder.created).toEqual(['iltuobar.it', 'www.iltuobar.it']); // covers: AC-303-1
    expect(fake.calls.addDomain).toEqual(['iltuobar.it', 'www.iltuobar.it']); // covers: AC-303-1
    const payload = await res.json();
    expect(payload.domains.map((d: { hostname: string }) => d.hostname)).toEqual([
      'iltuobar.it',
      'www.iltuobar.it',
    ]); // covers: AC-303-1
    expect(payload.domains.map((d: { kind: string }) => d.kind)).toEqual(['apex', 'subdomain']); // covers: AC-303-1
  });

  it('collegando un subdomain => UNA sola riga (nessun companion)', async () => {
    const res = await POST(connectRequest('menu.iltuobar.it'));

    expect(res.status).toBe(200); // covers: AC-303-2
    expect(createdHolder.created).toEqual(['menu.iltuobar.it']); // covers: AC-303-2 — nessun companion per un sottodominio
    expect(createPendingSpy).toHaveBeenCalledTimes(1); // covers: AC-303-2
  });

  it('re-inviando il connect di un apex gia collegato col suo www => nessun duplicato (idempotente)', async () => {
    const first = await POST(connectRequest('iltuobar.it'));
    expect(first.status).toBe(200); // covers: AC-303-3
    expect(createdHolder.created).toEqual(['iltuobar.it', 'www.iltuobar.it']); // covers: AC-303-3 — due righe dopo il primo

    createPendingSpy.mockClear();
    createdHolder.created = [];
    fake.calls.addDomain.length = 0; // azzera il registro del fake tra i due invii

    const second = await POST(connectRequest('iltuobar.it'));
    expect(second.status).toBe(200); // covers: AC-303-3
    expect(createdHolder.created).toEqual([]); // covers: AC-303-3 — nessun nuovo insert (apex e www gia' presenti)
    expect(fake.calls.addDomain).toEqual([]); // covers: AC-303-3 — provider non ri-chiamato
    // Restano DUE righe nello store (apex + www), non duplicate.
    expect([...store.keys()].sort()).toEqual(['iltuobar.it', 'www.iltuobar.it']); // covers: AC-303-3
  });
});

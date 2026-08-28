// @vitest-environment node
//
// DOM-302 (macrotask domain-connect, p5-custom-domains-fase2) — ORACOLO della fetta LOGICA di
// POST /api/domains/connect. Le asserzioni derivano dagli acceptance_criteria AC-302-1..3
// (08-domain-connect.md), taggate `// covers: AC-302-x`.
//
// Un SUBDOMAIN (menu.iltuobar.it) isola questa fetta dall'auto-www (DOM-303, testato a parte):
// un subdomain non genera companion, quindi un collegamento riuscito crea UNA sola riga. Lo store
// in-memory (condiviso da createPendingDomain e getDomainByHost) prova l'idempotenza: al ri-invio
// la riga esiste gia' => nessun secondo insert, nessun secondo addDomain.

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

// Store in-memory condiviso: createPendingDomain scrive, getDomainByHost legge => idempotenza reale.
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

describe('DOM-302 POST /api/domains/connect — fetta logica (valida + pending + addDomain)', () => {
  it('Pro proprietario, hostname valido nuovo => 200 con istruzioni DNS e una riga pending', async () => {
    const res = await POST(connectRequest('menu.iltuobar.it'));

    expect(res.status).toBe(200); // covers: AC-302-1
    const payload = await res.json();
    // Istruzioni DNS presenti: il record primario CNAME (subdomain) verso il target + il TXT del token.
    expect(payload.domains[0].records[0]).toMatchObject({ type: 'CNAME', value: 'cname.vercel-dns.com' }); // covers: AC-302-1
    expect(payload.domains[0].records.some((r: { type: string }) => r.type === 'TXT')).toBe(true); // covers: AC-302-1
    // Una riga 'pending' per (S, host) esiste e la porta e' stata chiamata.
    expect(createPendingSpy).toHaveBeenCalledTimes(1); // covers: AC-302-1
    expect(createdHolder.created).toEqual(['menu.iltuobar.it']); // covers: AC-302-1
    expect(fake.calls.addDomain).toEqual(['menu.iltuobar.it']); // covers: AC-302-1
  });

  it('Pro, host riservato o malformato => 422 con la reason e nessuna riga', async () => {
    const reserved = await POST(connectRequest('ulaba.net')); // reserved-domain (DOM-D7)
    expect(reserved.status).toBe(422); // covers: AC-302-2
    expect((await reserved.json()).error).toBe('reserved'); // covers: AC-302-2

    const malformed = await POST(connectRequest('iltuobar')); // niente TLD => invalid_format
    expect(malformed.status).toBe(422); // covers: AC-302-2
    expect((await malformed.json()).error).toBe('invalid_format'); // covers: AC-302-2

    expect(createPendingSpy).not.toHaveBeenCalled(); // covers: AC-302-2 — nessuna scrittura
    expect(fake.calls.addDomain).toEqual([]); // covers: AC-302-2 — provider mai chiamato
  });

  it('Pro re-invia lo stesso host gia pending per lo stesso sito => una sola riga (idempotente)', async () => {
    const first = await POST(connectRequest('menu.iltuobar.it'));
    expect(first.status).toBe(200); // covers: AC-302-3

    const second = await POST(connectRequest('menu.iltuobar.it'));
    expect(second.status).toBe(200); // covers: AC-302-3 — risposta idempotente
    expect(createPendingSpy).toHaveBeenCalledTimes(1); // covers: AC-302-3 — nessun secondo insert
    expect(createdHolder.created).toEqual(['menu.iltuobar.it']); // covers: AC-302-3 — una sola riga
    expect(fake.calls.addDomain).toEqual(['menu.iltuobar.it']); // covers: AC-302-3 — provider non ri-chiamato
  });
});

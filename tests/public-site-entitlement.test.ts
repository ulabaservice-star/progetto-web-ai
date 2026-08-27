import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';

// BIL-302/303 (macrotask plan-gates) — FAIL-SAFE del reader server-side getPublicSiteEntitlement:
// il serving pubblico e' anon e non puo' leggere account_id/subscriptions, quindi il reader gira su
// service_role CONFINATO. Qui si prova il suo contratto FAIL-SAFE TOTALE senza DB, iniettando un
// doppio del client admin: slug non pubblicato/sconosciuto, account senza subscription, o QUALSIASI
// guasto (client che lancia, error di query) => free; una subscription pro attiva => pro. MAI un
// piano superiore per errore. E' la radice di "entitlement non risolvibile => trattamento Free"
// (AC-302-3 / AC-303-3): il badge non sparisce e il SEO avanzato non si concede per un errore.

type QueryResult = { data: unknown; error: unknown };

// Doppio del client admin: due esiti configurabili, uno per site_publications e uno per subscriptions.
function fakeAdmin(pub: QueryResult, sub: QueryResult) {
  const make = (table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: async () => (table === 'subscriptions' ? sub : pub),
    };
    return builder;
  };
  return { from: (table: string) => make(table) };
}

const { adminMock } = vi.hoisted(() => ({ adminMock: vi.fn() }));
vi.mock('@/data/supabase-admin', () => ({ createAdminClient: adminMock }));

import { getPublicSiteEntitlement } from '@/data/public-site-entitlement';

const futureIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
// slug UNICI per caso: getPublicSiteEntitlement e' cache()d per-slug, cosi' i casi non si contaminano.
const slug = () => `bil302-${randomUUID()}`;

beforeEach(() => {
  adminMock.mockReset();
});

describe('BIL-302/303 getPublicSiteEntitlement — fail-safe verso Free', () => {
  it('sito pubblicato con account su piano pro attivo => pro (no_badge, seo_advanced)', async () => {
    adminMock.mockReturnValue(
      fakeAdmin(
        { data: { account_id: 'acc-pro' }, error: null },
        { data: { plan: 'pro', status: 'active', current_period_end: futureIso }, error: null },
      ),
    );
    const ent = await getPublicSiteEntitlement(slug());
    expect(ent.plan).toBe('pro');
    expect(ent.limits.no_badge).toBe(true);
    expect(ent.limits.seo_advanced).toBe(true);
  });

  it('slug non pubblicato/sconosciuto (nessuna publication) => free', async () => {
    adminMock.mockReturnValue(
      fakeAdmin({ data: null, error: null }, { data: null, error: null }),
    );
    const ent = await getPublicSiteEntitlement(slug());
    expect(ent.plan).toBe('free');
    expect(ent.limits.no_badge).toBe(false); // badge presente
    expect(ent.limits.seo_advanced).toBe(false); // solo SEO base
  });

  it('account pubblicato SENZA subscription => free (default, nessun piano superiore)', async () => {
    adminMock.mockReturnValue(
      fakeAdmin({ data: { account_id: 'acc-x' }, error: null }, { data: null, error: null }),
    );
    const ent = await getPublicSiteEntitlement(slug());
    expect(ent.plan).toBe('free');
  });

  it('errore di lettura della publication => free (fail-safe, non fail-open)', async () => {
    adminMock.mockReturnValue(
      fakeAdmin({ data: null, error: { message: 'boom', code: 'XX000' } }, { data: null, error: null }),
    );
    const ent = await getPublicSiteEntitlement(slug());
    expect(ent.plan).toBe('free');
  });

  it('errore di lettura della subscription => free (fail-safe)', async () => {
    adminMock.mockReturnValue(
      fakeAdmin(
        { data: { account_id: 'acc-y' }, error: null },
        { data: null, error: { message: 'boom', code: 'XX000' } },
      ),
    );
    const ent = await getPublicSiteEntitlement(slug());
    expect(ent.plan).toBe('free');
  });

  it('il client admin che LANCIA (env mancante) => free, mai un crash ne un piano superiore', async () => {
    adminMock.mockImplementation(() => {
      throw new Error('Variabili d\'ambiente mancanti');
    });
    const ent = await getPublicSiteEntitlement(slug());
    expect(ent.plan).toBe('free');
    expect(ent.limits.max_sites).toBe(1);
  });
});

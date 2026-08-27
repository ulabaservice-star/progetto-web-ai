import { describe, it, expect, vi, afterEach } from 'vitest';

// BIL-401/402 (macrotask billing-ui, p5-billing-fase1) — il reader getAccountBillingState
// espone, oltre all'entitlement RISOLTO, lo STATO GREZZO della subscription (status +
// current_period_end) di cui la UI ha bisogno per etichettare active/past_due/canceled.
// Client Supabase FAKE iniettato: il rischio qui e' il MAPPING (esporre lo status mentre
// l'entitlement resta risolto: past_due→pro in grazia, canceled→free) e il FAIL-SAFE, non la
// RLS — gia' coperta a runtime da billing-get-account-entitlement (stessa query readSubscriptionRow).

const { clientHolder } = vi.hoisted(() => ({
  clientHolder: { current: null as unknown },
}));

vi.mock('@/data/supabase-ssr', () => ({
  createServerSupabaseClient: async () => clientHolder.current,
}));

import { getAccountBillingState } from '@/data/subscriptions';

// Un fake che riproduce SOLO la catena usata dal reader: from().select().eq().maybeSingle().
function fakeClient(result: { data: unknown; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => result,
        }),
      }),
    }),
  };
}

const FUTURE = '2999-01-01T00:00:00.000Z'; // periodo pagato ancora valido
const PAST = '2000-01-01T00:00:00.000Z'; // periodo scaduto

afterEach(() => {
  clientHolder.current = null;
  vi.restoreAllMocks();
});

describe('getAccountBillingState — entitlement risolto + stato grezzo esposto', () => {
  it('nessuna riga: entitlement free e subscription null (fail-safe percorso felice)', async () => {
    clientHolder.current = fakeClient({ data: null, error: null });

    const state = await getAccountBillingState('acc-1');

    expect(state.entitlement.plan).toBe('free');
    expect(state.subscription).toBeNull();
  });

  it('pro attiva nel periodo: entitlement pro e status "active" esposto', async () => {
    clientHolder.current = fakeClient({
      data: { plan: 'pro', status: 'active', current_period_end: FUTURE },
      error: null,
    });

    const state = await getAccountBillingState('acc-1');

    expect(state.entitlement.plan).toBe('pro');
    expect(state.subscription).toEqual({ status: 'active', current_period_end: FUTURE });
  });

  it('past_due nel periodo: entitlement resta pro (grazia) MA lo status esposto e "past_due"', async () => {
    clientHolder.current = fakeClient({
      data: { plan: 'pro', status: 'past_due', current_period_end: FUTURE },
      error: null,
    });

    const state = await getAccountBillingState('acc-1');

    expect(state.entitlement.plan).toBe('pro'); // BIL-D6: grazia, non si spegne
    expect(state.subscription?.status).toBe('past_due'); // la UI lo etichetta come grazia, non scaduto
  });

  it('canceled: entitlement degrada a free MA lo status "canceled" resta esposto per la UI', async () => {
    clientHolder.current = fakeClient({
      data: { plan: 'pro', status: 'canceled', current_period_end: PAST },
      error: null,
    });

    const state = await getAccountBillingState('acc-1');

    expect(state.entitlement.plan).toBe('free');
    expect(state.subscription?.status).toBe('canceled'); // la UI offre il ri-abbonamento (AC-402-3)
  });

  it('guasto di lettura: fail-safe totale — entitlement free e subscription null (mai pro per errore)', async () => {
    clientHolder.current = fakeClient({ data: null, error: { message: 'boom' } });

    const state = await getAccountBillingState('acc-1');

    expect(state.entitlement.plan).toBe('free');
    expect(state.subscription).toBeNull();
  });
});

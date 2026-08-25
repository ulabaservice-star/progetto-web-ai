// @vitest-environment node
//
// BIL-202 (macrotask stripe-checkout-webhook, p5-billing-fase1) — Endpoint webhook firmato +
// idempotente. Le asserzioni derivano dagli acceptance_criteria AC-202-1..4
// (02-stripe-checkout-webhook.md).
//
// Il route e' esercitato END-TO-END con la PORTA fake (nessuna rete/chiave) e un client admin
// IN-MEMORY iniettato al posto di createAdminClient: cosi' la vera applySubscriptionEvent
// (dedup per event id + upsert) gira davvero e osserviamo lo STATO risultante di subscriptions,
// non solo lo status code. La firma non valida e' simulata dal fake che lancia (come
// constructEvent). Un test diretto di applySubscriptionEvent con uno store iniettato inchioda
// l'idempotenza (AC-202-2).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakePaymentProvider } from './helpers/fake-payment-provider';
import type { SubscriptionEvent } from '@/domain/billing/payment-port';

// ── Client Supabase admin IN-MEMORY (backing di subscriptions + ledger degli eventi) ────────
type FakeAdmin = {
  client: unknown;
  subscriptions: Map<string, Record<string, unknown>>;
  events: Set<string>;
  failUpsert: boolean;
};

function makeFakeAdmin(): FakeAdmin {
  const state: FakeAdmin = {
    client: null,
    subscriptions: new Map(),
    events: new Set(),
    failUpsert: false,
  };
  state.client = {
    from(table: string) {
      if (table === 'subscriptions') {
        return {
          upsert(row: Record<string, unknown>) {
            if (state.failUpsert) return Promise.resolve({ error: { message: 'boom' } });
            const key = row.account_id as string;
            state.subscriptions.set(key, { ...state.subscriptions.get(key), ...row });
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'billing_webhook_events') {
        return {
          select() {
            return {
              eq(_col: string, value: string) {
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: state.events.has(value) ? { event_id: value } : null,
                      error: null,
                    });
                  },
                };
              },
            };
          },
          insert(row: { event_id: string }) {
            if (state.events.has(row.event_id)) {
              return Promise.resolve({ error: { code: '23505' } });
            }
            state.events.add(row.event_id);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`fakeAdmin: tabella non gestita ${table}`);
    },
  };
  return state;
}

// ── Mock dei confini: la porta (adattatore Stripe) e il client admin ────────────────────────
const { providerHolder, adminHolder } = vi.hoisted(() => ({
  providerHolder: { current: null as ReturnType<typeof Object> | null },
  adminHolder: { current: null as unknown },
}));

vi.mock('@/data/payment/stripe', () => ({
  getStripePaymentProvider: () => providerHolder.current,
}));
vi.mock('@/data/supabase-admin', () => ({
  createAdminClient: () => adminHolder.current,
}));

import { POST } from '@/app/api/billing/webhook/route';
import { applySubscriptionEvent, type SubscriptionStore } from '@/data/subscriptions-write';

const ORIGIN = 'http://localhost';
function webhookRequest(rawBody: string, signature: string | null): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (signature !== null) headers.set('stripe-signature', signature);
  return new NextRequest(new URL('/api/billing/webhook', ORIGIN), {
    method: 'POST',
    headers,
    body: rawBody,
  });
}

const activatedEvent: SubscriptionEvent = {
  event_id: 'evt_1',
  type: 'subscription_activated',
  account_id: 'acc-A',
  plan: 'pro',
  status: 'active',
  provider: 'stripe',
  provider_subscription_id: 'sub_1',
  provider_customer_id: 'cus_1',
  current_period_end: null,
};

let admin: FakeAdmin;
beforeEach(() => {
  admin = makeFakeAdmin();
  adminHolder.current = admin.client;
  providerHolder.current = null;
});

describe('BIL-202 POST /api/billing/webhook — firma + idempotenza', () => {
  it('checkout.session.completed valido (account A, pro) => subscriptions di A a pro/active, 2xx', async () => {
    providerHolder.current = fakePaymentProvider({ webhookEvent: activatedEvent });

    const res = await POST(webhookRequest(JSON.stringify({ id: 'evt_1' }), 'valid'));

    expect(res.status).toBe(200); // covers: AC-202-1
    const row = admin.subscriptions.get('acc-A');
    expect(row?.plan).toBe('pro'); // covers: AC-202-1
    expect(row?.status).toBe('active'); // covers: AC-202-1
    expect(admin.events.has('evt_1')).toBe(true); // registrato solo ad avvenuta applicazione (BIL-D5)
  });

  it('stesso event id consegnato due volte => lo stato NON cambia la seconda volta, 2xx', async () => {
    providerHolder.current = fakePaymentProvider({ webhookEvent: activatedEvent });

    const first = await POST(webhookRequest(JSON.stringify({ id: 'evt_1' }), 'valid'));
    expect(first.status).toBe(200);
    // sentinella: se la seconda consegna RIAPPLICASSE l'upsert, sovrascriverebbe questo valore
    admin.subscriptions.set('acc-A', { ...admin.subscriptions.get('acc-A'), plan: 'sentinella' });

    const second = await POST(webhookRequest(JSON.stringify({ id: 'evt_1' }), 'valid'));

    expect(second.status).toBe(200); // covers: AC-202-2
    expect(admin.subscriptions.get('acc-A')?.plan).toBe('sentinella'); // covers: AC-202-2 — nessun re-apply
  });

  it('payload con firma NON valida => 400 e nessuna riga subscriptions scritta', async () => {
    providerHolder.current = fakePaymentProvider({ webhookEvent: activatedEvent });

    const res = await POST(webhookRequest(JSON.stringify({ id: 'evt_1' }), 'invalid'));

    expect(res.status).toBe(400); // covers: AC-202-3
    expect(admin.subscriptions.size).toBe(0); // covers: AC-202-3 — nessuna scrittura
    expect(admin.events.size).toBe(0); // covers: AC-202-3
  });

  it('customer.subscription.deleted per l\'account A => subscription di A a status canceled', async () => {
    const canceledEvent: SubscriptionEvent = {
      ...activatedEvent,
      event_id: 'evt_2',
      type: 'subscription_canceled',
      status: 'canceled',
    };
    providerHolder.current = fakePaymentProvider({ webhookEvent: canceledEvent });

    const res = await POST(webhookRequest(JSON.stringify({ id: 'evt_2' }), 'valid'));

    expect(res.status).toBe(200); // covers: AC-202-4
    expect(admin.subscriptions.get('acc-A')?.status).toBe('canceled'); // covers: AC-202-4
  });

  it('evento verificato ma non pertinente (parseWebhook => null) => 2xx no-op, nessuna scrittura', async () => {
    providerHolder.current = fakePaymentProvider({ webhookEvent: null });

    const res = await POST(webhookRequest(JSON.stringify({ id: 'evt_x' }), 'valid'));

    expect(res.status).toBe(200);
    expect(admin.subscriptions.size).toBe(0);
  });

  it('errore interno di scrittura => non-2xx (500), mai un 2xx opaco a registrazione mancante', async () => {
    admin.failUpsert = true;
    providerHolder.current = fakePaymentProvider({ webhookEvent: activatedEvent });

    const res = await POST(webhookRequest(JSON.stringify({ id: 'evt_1' }), 'valid'));

    expect(res.status).toBe(500); // BIL-D5: catch che logga, non-2xx => Stripe riprova
    expect(admin.events.has('evt_1')).toBe(false); // non registrato: l'evento non e' stato applicato
  });
});

describe('BIL-202 applySubscriptionEvent — idempotenza per event id (store iniettato)', () => {
  function memoryStore() {
    const subscriptions = new Map<string, Record<string, unknown>>();
    const events = new Set<string>();
    let upsertCount = 0;
    const store: SubscriptionStore = {
      async isEventProcessed(eventId) {
        return events.has(eventId);
      },
      async upsertSubscription(row) {
        upsertCount += 1;
        subscriptions.set(row.account_id, { ...row });
      },
      async markEventProcessed(eventId) {
        events.add(eventId);
      },
    };
    return { store, subscriptions, events, upsertCount: () => upsertCount };
  }

  it('primo evento => applica (upsert + registra), applied=true', async () => {
    const m = memoryStore();
    const out = await applySubscriptionEvent(activatedEvent, m.store);
    expect(out.applied).toBe(true); // covers: AC-202-1
    expect(m.subscriptions.get('acc-A')?.status).toBe('active');
    expect(m.events.has('evt_1')).toBe(true);
  });

  it('stesso event id => secondo tentativo NON riapplica (upsert una sola volta), applied=false', async () => {
    const m = memoryStore();
    await applySubscriptionEvent(activatedEvent, m.store);
    const out = await applySubscriptionEvent(activatedEvent, m.store);
    expect(out.applied).toBe(false); // covers: AC-202-2
    expect(m.upsertCount()).toBe(1); // covers: AC-202-2 — un solo upsert per event id
  });
});

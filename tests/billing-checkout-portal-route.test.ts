// @vitest-environment node
//
// BIL-203 (macrotask stripe-checkout-webhook, p5-billing-fase1) — Endpoint checkout + billing
// portal con guardie identita'/account. Le asserzioni derivano dagli acceptance_criteria
// AC-203-1..3 (02-stripe-checkout-webhook.md).
//
// PROPRIETA' DI SICUREZZA CENTRALE: l'accountId NON e' un input — e' DERIVATO dall'identita'
// server (accounts.owner_id === auth.uid()). Non c'e' quindi modo di indirizzare l'azione a
// un account altrui: la porta e' SEMPRE invocata con l'account del chiamante. Il body e'
// z.object({}).strict(): un tentativo di iniettare account_id (o qualunque campo) => 403
// (il client non decide l'identita'). Non-auth => 401. Cross-origin => 403 (guardia CSRF).
// Nessun dato di carta transita da noi: la porta ritorna solo una url (redirect a Stripe).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakePaymentProvider, type FakePaymentProvider } from './helpers/fake-payment-provider';

const { authHolder, accountHolder, providerHolder } = vi.hoisted(() => ({
  authHolder: { user: null as { id: string } | null },
  accountHolder: { data: null as { id: string } | null, error: null as unknown },
  providerHolder: { current: null as unknown },
}));

vi.mock('@/data/supabase-ssr', () => ({
  getUser: async () => authHolder.user,
  createServerSupabaseClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: accountHolder.data, error: accountHolder.error }),
        }),
      }),
    }),
  }),
}));
vi.mock('@/data/payment/stripe', () => ({
  getStripePaymentProvider: () => providerHolder.current,
}));

import { POST as checkoutPOST } from '@/app/api/billing/checkout/route';
import { POST as portalPOST } from '@/app/api/billing/portal/route';

const ORIGIN = 'http://localhost';
type ReqInit = { body?: string; origin?: string | null; fetchSite?: string | null };
function billingRequest(path: string, init: ReqInit = {}): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  const origin = init.origin === undefined ? ORIGIN : init.origin;
  if (origin !== null) headers.set('origin', origin);
  const fetchSite = init.fetchSite === undefined ? 'same-origin' : init.fetchSite;
  if (fetchSite !== null) headers.set('sec-fetch-site', fetchSite);
  return new NextRequest(new URL(path, ORIGIN), {
    method: 'POST',
    headers,
    body: init.body ?? '{}',
  });
}

let fake: FakePaymentProvider;
beforeEach(() => {
  fake = fakePaymentProvider();
  providerHolder.current = fake;
  authHolder.user = null;
  accountHolder.data = null;
  accountHolder.error = null;
});

function asAccountOwner() {
  authHolder.user = { id: 'user-A' };
  accountHolder.data = { id: 'acc-A' };
}

describe('BIL-203 POST /api/billing/checkout — createCheckout con guardie', () => {
  it('utente autenticato => url di checkout, porta invocata con l\'account DERIVATO (mai dal body)', async () => {
    asAccountOwner();

    const res = await checkoutPOST(billingRequest('/api/billing/checkout'));

    expect(res.status).toBe(200); // covers: AC-203-1
    const payload = await res.json();
    expect(payload.url).toMatch(/^https?:\/\//); // covers: AC-203-1 — una url di checkout
    expect(fake.calls.createCheckout).toEqual([{ accountId: 'acc-A', plan: 'pro' }]); // covers: AC-203-1 — account derivato, piano Pro
  });

  it('richiesta NON autenticata => 401 prima di chiamare la porta', async () => {
    authHolder.user = null;

    const res = await checkoutPOST(billingRequest('/api/billing/checkout'));

    expect(res.status).toBe(401); // covers: AC-203-2
    expect(fake.calls.createCheckout).toEqual([]); // covers: AC-203-2 — porta mai invocata
  });

  it('body che tenta di specificare account_id (identita' + ' dal client) => 403, porta mai invocata', async () => {
    asAccountOwner();

    const res = await checkoutPOST(
      billingRequest('/api/billing/checkout', { body: JSON.stringify({ account_id: 'acc-B' }) }),
    );

    expect(res.status).toBe(403); // covers: AC-203-2 — il client non decide l'account (cross-account respinto)
    expect(fake.calls.createCheckout).toEqual([]); // covers: AC-203-2 — porta mai invocata
  });

  it('richiesta cross-origin (CSRF) => 403 prima di chiamare la porta', async () => {
    asAccountOwner();

    const res = await checkoutPOST(billingRequest('/api/billing/checkout', { fetchSite: 'cross-site' }));

    expect(res.status).toBe(403); // covers: AC-203-2
    expect(fake.calls.createCheckout).toEqual([]);
  });
});

describe('BIL-203 POST /api/billing/portal — openBillingPortal con guardie', () => {
  it('utente autenticato con abbonamento gestibile => url del billing portal (dalla porta)', async () => {
    asAccountOwner();

    const res = await portalPOST(billingRequest('/api/billing/portal'));

    expect(res.status).toBe(200); // covers: AC-203-3
    const payload = await res.json();
    expect(payload.url).toMatch(/^https?:\/\//); // covers: AC-203-3
    expect(fake.calls.openBillingPortal).toEqual([{ accountId: 'acc-A' }]); // covers: AC-203-3 — account derivato
  });

  it('richiesta NON autenticata => 401 prima di chiamare la porta', async () => {
    authHolder.user = null;

    const res = await portalPOST(billingRequest('/api/billing/portal'));

    expect(res.status).toBe(401); // covers: AC-203-2
    expect(fake.calls.openBillingPortal).toEqual([]); // covers: AC-203-2
  });
});

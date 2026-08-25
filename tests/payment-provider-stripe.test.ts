// @vitest-environment node
//
// BIL-201 (macrotask stripe-checkout-webhook, p5-billing-fase1) — Adattatore Stripe della
// porta PaymentProvider + fake per i test. Le asserzioni derivano dagli acceptance_criteria
// AC-201-1..3 (02-stripe-checkout-webhook.md) + la MAPPATURA degli eventi nativi Stripe su
// SubscriptionEvent normalizzato (checkout.session.completed / subscription.updated|deleted
// / invoice.payment_failed), che sostiene AC-202-1/4 del webhook.
//
// NESSUNA RETE, NESSUNA CHIAVE REALE: parseWebhook usa constructEvent (verifica cripto LOCALE
// della firma HMAC sul solo webhook secret) e le firme di test si generano con
// generateTestHeaderString. I valori "chiave" qui sono FINTI (gli underscore spezzano i
// pattern degli scanner di segreti) e non sono mai usati per una chiamata di rete.

import { describe, it, expect } from 'vitest';
import Stripe from 'stripe';
import { createStripePaymentProvider } from '@/data/payment/stripe';
import { fakePaymentProvider } from './helpers/fake-payment-provider';

const API_KEY = 'sk_test_no_real_key'; // finto: gli underscore spezzano il pattern sk_test_[a-z0-9]{10,}
const WEBHOOK_SECRET = 'whsec_no_real_secret';

function providerUnderTest() {
  const stripe = new Stripe(API_KEY);
  const provider = createStripePaymentProvider({
    stripe,
    webhookSecret: WEBHOOK_SECRET,
    priceIdForPlan: () => 'price_test_pro',
    checkoutSuccessUrl: 'https://app.example/ok',
    checkoutCancelUrl: 'https://app.example/cancel',
    portalReturnUrl: 'https://app.example/account',
  });
  return { stripe, provider };
}

// Firma il payload GREZZO col webhook secret di test, come farebbe Stripe.
function signed(stripe: Stripe, event: unknown, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return { payload, signature };
}

describe('BIL-201 adattatore Stripe — parseWebhook (firma + normalizzazione)', () => {
  it('checkout.session.completed con firma VALIDA => SubscriptionEvent normalizzato pro/active', async () => {
    const { stripe, provider } = providerUnderTest();
    const { payload, signature } = signed(stripe, {
      id: 'evt_activated_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          object: 'checkout.session',
          metadata: { account_id: 'acc-A' },
          subscription: 'sub_1',
          customer: 'cus_1',
        },
      },
    });

    const result = await provider.parseWebhook(payload, signature);

    expect(result).not.toBeNull(); // covers: AC-201-1
    expect(result?.event_id).toBe('evt_activated_1'); // covers: AC-201-1
    expect(result?.type).toBe('subscription_activated'); // covers: AC-201-1
    expect(result?.account_id).toBe('acc-A'); // covers: AC-201-1 — dal metadata, mai inferito
    expect(result?.plan).toBe('pro'); // covers: AC-201-1
    expect(result?.status).toBe('active'); // covers: AC-201-1
    expect(result?.provider).toBe('stripe'); // covers: AC-201-1
    expect(result?.provider_subscription_id).toBe('sub_1'); // covers: AC-201-1
    expect(result?.provider_customer_id).toBe('cus_1'); // covers: AC-201-1
  });

  it('firma NON valida (secret sbagliato) => throw, nessun SubscriptionEvent (anti-spoof)', async () => {
    const { stripe, provider } = providerUnderTest();
    const payload = JSON.stringify({
      id: 'evt_x',
      type: 'checkout.session.completed',
      data: { object: { metadata: { account_id: 'acc-A' } } },
    });
    // firma generata con un secret DIVERSO da quello che l'adattatore usa per verificare
    const badSignature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_a_different_secret',
    });

    await expect(provider.parseWebhook(payload, badSignature)).rejects.toThrow(); // covers: AC-201-2
  });

  it('customer.subscription.deleted con firma valida => type canceled, status canceled', async () => {
    const { stripe, provider } = providerUnderTest();
    const { payload, signature } = signed(stripe, {
      id: 'evt_canceled_1',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_1',
          object: 'subscription',
          status: 'canceled',
          customer: 'cus_1',
          metadata: { account_id: 'acc-A' },
          current_period_end: 1735689600, // 2025-01-01T00:00:00Z
        },
      },
    });

    const result = await provider.parseWebhook(payload, signature);

    expect(result?.type).toBe('subscription_canceled'); // covers: AC-201-1 (mappatura) — supporta AC-202-4
    expect(result?.status).toBe('canceled'); // supporta AC-202-4
    expect(result?.account_id).toBe('acc-A');
    expect(result?.current_period_end).toBe('2025-01-01T00:00:00.000Z'); // epoch -> ISO
  });

  it('customer.subscription.updated con status past_due => type updated, status past_due', async () => {
    const { stripe, provider } = providerUnderTest();
    const { payload, signature } = signed(stripe, {
      id: 'evt_updated_1',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          object: 'subscription',
          status: 'past_due',
          customer: 'cus_1',
          metadata: { account_id: 'acc-A' },
          current_period_end: 1767225600, // 2026-01-01T00:00:00Z
        },
      },
    });

    const result = await provider.parseWebhook(payload, signature);

    expect(result?.type).toBe('subscription_updated');
    expect(result?.status).toBe('past_due'); // downgrade morbido: past_due resta servito (BIL-D6)
    expect(result?.plan).toBe('pro');
  });

  it('evento verificato ma NON pertinente (es. customer.created) => null (no-op del webhook)', async () => {
    const { stripe, provider } = providerUnderTest();
    const { payload, signature } = signed(stripe, {
      id: 'evt_irrelevant_1',
      type: 'customer.created',
      data: { object: { id: 'cus_1', object: 'customer' } },
    });

    const result = await provider.parseWebhook(payload, signature);

    expect(result).toBeNull(); // firma valida ma tipo non gestito: nessun effetto
  });
});

describe('BIL-201 fake PaymentProvider — iniettabile, senza rete', () => {
  it('createCheckout(accountId, "pro") => { url } senza alcuna chiamata di rete', async () => {
    const fake = fakePaymentProvider();

    const res = await fake.createCheckout('acc-A', 'pro');

    expect(res.url).toMatch(/^https?:\/\//); // covers: AC-201-3 — una url di checkout
    expect(fake.calls.createCheckout).toEqual([{ accountId: 'acc-A', plan: 'pro' }]); // covers: AC-201-3 — nessuna rete, chiamata registrata
  });

  it('openBillingPortal(accountId) => { url } e registra la chiamata', async () => {
    const fake = fakePaymentProvider();

    const res = await fake.openBillingPortal('acc-A');

    expect(res.url).toMatch(/^https?:\/\//);
    expect(fake.calls.openBillingPortal).toEqual([{ accountId: 'acc-A' }]);
  });

  it('parseWebhook: firma marcata invalida => throw; altrimenti ritorna l\'evento programmato', async () => {
    const event = {
      event_id: 'evt_fake_1',
      type: 'subscription_activated' as const,
      account_id: 'acc-A',
      plan: 'pro' as const,
      status: 'active' as const,
      provider: 'stripe',
      provider_subscription_id: 'sub_1',
      provider_customer_id: 'cus_1',
      current_period_end: null,
    };
    const fake = fakePaymentProvider({ webhookEvent: event });

    await expect(fake.parseWebhook('{}', 'invalid')).rejects.toThrow();
    await expect(fake.parseWebhook('{}', 'valid')).resolves.toEqual(event);
  });
});

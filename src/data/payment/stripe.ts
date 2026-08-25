import 'server-only';

// BIL-201 (macrotask stripe-checkout-webhook, p5-billing-fase1) — L'ADATTATORE Stripe della
// porta PaymentProvider. E' l'UNICO punto che conosce l'SDK Stripe (BIL-D4): il resto del
// sistema dipende dalla porta (src/domain/billing/payment-port.ts). Modello del confine come
// src/data/anthropic.ts — `import 'server-only'` (i segreti stanno di qua) + client
// costruito LAZY dietro una config INIETTABILE, cosi' importare il modulo senza chiavi non
// lancia e i test iniettano un'istanza senza rete.
//
// SICUREZZA: la firma del webhook e' verificata QUI con constructEvent (HMAC timing-safe
// dell'SDK) sul webhook secret letto da env — firma non valida => throw, nessun evento
// (anti-spoof, A08:2025/BIL-D5). Il secret e i price id sono config di DEPLOY (env Vercel),
// MAI nel sorgente.

import Stripe from 'stripe';
import type { Plan } from '@/domain/billing/entitlement';
import type {
  PaymentProvider,
  SubscriptionEvent,
  SubscriptionEventType,
} from '@/domain/billing/payment-port';

/** Dipendenze dell'adattatore, iniettabili (i test passano un'istanza Stripe senza rete). */
export type StripeConfig = {
  readonly stripe: Stripe;
  /** Segreto di firma del webhook (env STRIPE_WEBHOOK_SECRET). */
  readonly webhookSecret: string;
  /** Price id Stripe per un piano acquistabile (Fase 1: solo 'pro'). */
  readonly priceIdForPlan: (plan: Plan) => string;
  readonly checkoutSuccessUrl: string;
  readonly checkoutCancelUrl: string;
  readonly portalReturnUrl: string;
  /**
   * Risolve il customer id Stripe di un account (per il billing portal). Iniettato dal wiring
   * reale (legge subscriptions.provider_customer_id sotto RLS); assente nei test unit che non
   * esercitano il portal. Null => nessun customer => nessun portal apribile.
   */
  readonly resolveCustomerId?: (accountId: string) => Promise<string | null>;
};

// ── Estrazione difensiva dal payload (robusta alle differenze di API version) ─────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Un campo Stripe che puo' essere una stringa id, un oggetto con `id`, o null. */
function refId(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (isRecord(v) && typeof v.id === 'string') return v.id;
  return null;
}

/** Epoch (secondi) => ISO-8601, oppure null. */
function epochToIso(v: unknown): string | null {
  return typeof v === 'number' && Number.isFinite(v) ? new Date(v * 1000).toISOString() : null;
}

/** account_id dal metadata di un oggetto (session/subscription); mai inferito. */
function accountIdFromMetadata(obj: Record<string, unknown>): string | null {
  const meta = obj.metadata;
  if (isRecord(meta) && typeof meta.account_id === 'string') return meta.account_id;
  return null;
}

/** account_id di un'invoice: sui subscription_details.metadata o sul metadata dell'invoice. */
function accountIdFromInvoice(inv: Record<string, unknown>): string | null {
  const details = inv.subscription_details;
  if (isRecord(details)) {
    const dm = details.metadata;
    if (isRecord(dm) && typeof dm.account_id === 'string') return dm.account_id;
  }
  return accountIdFromMetadata(inv);
}

// Stati Stripe -> stati del dominio. Sconosciuti/incompleti => 'canceled' (fail-safe: degrada
// a free, mai un piano superiore per errore).
function mapStripeStatus(status: unknown): SubscriptionEvent['status'] {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    default:
      return 'canceled';
  }
}

/** Normalizza un evento Stripe verificato in un SubscriptionEvent, o null se non pertinente. */
function normalize(event: Stripe.Event): SubscriptionEvent | null {
  const obj = isRecord(event.data?.object) ? (event.data.object as Record<string, unknown>) : {};

  const base = (
    type: SubscriptionEventType,
    account_id: string,
    over: Partial<SubscriptionEvent>,
  ): SubscriptionEvent => ({
    event_id: event.id,
    type,
    account_id,
    plan: 'pro',
    status: 'active',
    provider: 'stripe',
    provider_subscription_id: null,
    provider_customer_id: null,
    current_period_end: null,
    ...over,
  });

  switch (event.type) {
    case 'checkout.session.completed': {
      const accountId = accountIdFromMetadata(obj);
      if (!accountId) return null;
      return base('subscription_activated', accountId, {
        plan: 'pro',
        status: 'active',
        provider_subscription_id: refId(obj.subscription),
        provider_customer_id: refId(obj.customer),
      });
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const accountId = accountIdFromMetadata(obj);
      if (!accountId) return null;
      const canceled = event.type === 'customer.subscription.deleted';
      return base(
        canceled ? 'subscription_canceled' : 'subscription_updated',
        accountId,
        {
          plan: 'pro',
          status: canceled ? 'canceled' : mapStripeStatus(obj.status),
          provider_subscription_id: refId(obj.id),
          provider_customer_id: refId(obj.customer),
          current_period_end: epochToIso(obj.current_period_end),
        },
      );
    }
    case 'invoice.payment_failed': {
      const accountId = accountIdFromInvoice(obj);
      if (!accountId) return null;
      return base('payment_failed', accountId, {
        plan: 'pro',
        status: 'past_due',
        provider_subscription_id: refId(obj.subscription),
        provider_customer_id: refId(obj.customer),
      });
    }
    default:
      return null;
  }
}

/**
 * Costruisce un PaymentProvider su una config Stripe iniettata. createCheckout/openBillingPortal
 * chiamano l'API Stripe (rete); parseWebhook e' locale (verifica firma + normalizzazione).
 */
export function createStripePaymentProvider(config: StripeConfig): PaymentProvider {
  return {
    async createCheckout(accountId: string, plan: Plan) {
      const session = await config.stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: config.priceIdForPlan(plan), quantity: 1 }],
        success_url: config.checkoutSuccessUrl,
        cancel_url: config.checkoutCancelUrl,
        // account_id nel metadata della sessione E della subscription creata: cosi' TUTTI gli
        // eventi (checkout.session.completed e customer.subscription.*) lo riportano e il
        // webhook attiva l'account giusto — chiude la catena checkout -> webhook (BIL-203).
        client_reference_id: accountId,
        metadata: { account_id: accountId },
        subscription_data: { metadata: { account_id: accountId } },
      });
      if (!session.url) throw new Error('stripe: checkout session senza url');
      return { url: session.url };
    },

    async openBillingPortal(accountId: string) {
      const customerId = config.resolveCustomerId
        ? await config.resolveCustomerId(accountId)
        : null;
      if (!customerId) throw new Error('stripe: nessun customer per l\'account');
      const session = await config.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: config.portalReturnUrl,
      });
      return { url: session.url };
    },

    async parseWebhook(payload: string, signature: string) {
      // constructEvent verifica la firma HMAC (timing-safe, SDK): firma non valida => throw.
      const event = config.stripe.webhooks.constructEvent(payload, signature, config.webhookSecret);
      return normalize(event);
    },
  };
}

// ── Wiring reale, LAZY (env di deploy; mai importato nei test unit che iniettano il fake) ──

let cached: PaymentProvider | null = null;

function configFromEnv(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const pricePro = process.env.STRIPE_PRICE_PRO;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!secretKey || !webhookSecret || !pricePro || !appUrl) {
    throw new Error(
      "Variabili d'ambiente Stripe mancanti: STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_PRO / NEXT_PUBLIC_APP_URL",
    );
  }
  return {
    stripe: new Stripe(secretKey),
    webhookSecret,
    priceIdForPlan: (plan) => {
      if (plan === 'pro') return pricePro;
      throw new Error(`stripe: piano non acquistabile in Fase 1: ${plan}`);
    },
    checkoutSuccessUrl: `${appUrl}/account?checkout=success`,
    checkoutCancelUrl: `${appUrl}/account?checkout=cancel`,
    portalReturnUrl: `${appUrl}/account`,
  };
}

/** Adattatore Stripe reale, costruito una sola volta alla prima chiamata (env-driven). */
export function getStripePaymentProvider(): PaymentProvider {
  cached ??= createStripePaymentProvider(configFromEnv());
  return cached;
}

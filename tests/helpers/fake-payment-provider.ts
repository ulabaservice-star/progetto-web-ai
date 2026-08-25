// BIL-201 (macrotask stripe-checkout-webhook, p5-billing-fase1) — Fake PaymentProvider per
// i test: implementa la porta SENZA rete ne' chiavi reali (BIL-D4), cosi' il checkpoint e'
// verde senza segreti. E' un doppio ISPEZIONABILE (registra le chiamate in `calls`) e
// PROGRAMMABILE (evento del webhook, url, o un'impl custom di parseWebhook) — lo iniettano i
// test dei route checkout/portal (BIL-203) e webhook (BIL-202) via vi.mock del modulo data.

import type { Plan } from '@/domain/billing/entitlement';
import type { PaymentProvider, SubscriptionEvent } from '@/domain/billing/payment-port';

export type FakePaymentProvider = PaymentProvider & {
  readonly calls: {
    createCheckout: Array<{ accountId: string; plan: Plan }>;
    openBillingPortal: Array<{ accountId: string }>;
    parseWebhook: Array<{ payload: string; signature: string }>;
  };
};

type FakeOptions = {
  /** Url ritornata da createCheckout (default: una url di checkout finta ma assoluta). */
  checkoutUrl?: string;
  /** Url ritornata da openBillingPortal. */
  portalUrl?: string;
  /**
   * Evento che parseWebhook ritorna quando la firma NON e' 'invalid'. `null` (default) simula
   * un evento verificato ma non pertinente (no-op). Ignorato se si passa `parseWebhookImpl`.
   */
  webhookEvent?: SubscriptionEvent | null;
  /**
   * Impl custom di parseWebhook per i test del route. Se assente vale il default:
   * signature === 'invalid' => throw (firma non valida), altrimenti => `webhookEvent`.
   */
  parseWebhookImpl?: (payload: string, signature: string) => Promise<SubscriptionEvent | null>;
};

/** Costruisce un fake PaymentProvider iniettabile. Nessuna rete: le url sono costanti. */
export function fakePaymentProvider(options: FakeOptions = {}): FakePaymentProvider {
  const checkoutUrl = options.checkoutUrl ?? 'https://checkout.stripe.test/session';
  const portalUrl = options.portalUrl ?? 'https://billing.stripe.test/portal';
  const webhookEvent = options.webhookEvent ?? null;

  const calls: FakePaymentProvider['calls'] = {
    createCheckout: [],
    openBillingPortal: [],
    parseWebhook: [],
  };

  const defaultParse = async (
    _payload: string,
    signature: string,
  ): Promise<SubscriptionEvent | null> => {
    if (signature === 'invalid') {
      throw new Error('fake: firma non valida');
    }
    return webhookEvent;
  };

  return {
    calls,
    async createCheckout(accountId: string, plan: Plan) {
      calls.createCheckout.push({ accountId, plan });
      return { url: checkoutUrl };
    },
    async openBillingPortal(accountId: string) {
      calls.openBillingPortal.push({ accountId });
      return { url: portalUrl };
    },
    async parseWebhook(payload: string, signature: string) {
      calls.parseWebhook.push({ payload, signature });
      return (options.parseWebhookImpl ?? defaultParse)(payload, signature);
    },
  };
}

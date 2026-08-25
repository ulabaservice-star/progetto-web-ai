// BIL-201 (macrotask stripe-checkout-webhook, p5-billing-fase1) — La PORTA del payment
// provider, dominio PURO (solo tipi: nessun SDK, nessuna rete, nessun segreto). Il resto
// del sistema dipende da QUESTA interfaccia, mai da Stripe (BIL-D4): un provider LATAM
// (Oltre-P5) sara' un nuovo adattatore che implementa la stessa porta, gating invariato.
//
// Tre capacita':
//  • createCheckout      — apre una sessione di pagamento per passare a un piano (-> url).
//  • openBillingPortal   — apre il portale di gestione (cambio carta/disdetta) (-> url).
//  • parseWebhook        — VERIFICA la firma del webhook e normalizza l'evento del
//                          provider in un SubscriptionEvent neutro (o null se non pertinente).
//
// Il webhook (BIL-202) e' l'UNICO che muove subscriptions, e lo fa a partire dal
// SubscriptionEvent normalizzato: nessun campo dell'evento e' "fidato dal client" —
// arriva da un payload la cui FIRMA e' stata verificata dall'adattatore (anti-spoof).

import type { Plan, SubscriptionStatus } from '@/domain/billing/entitlement';

/**
 * Il tipo NORMALIZZATO dell'evento (indipendente dal provider). L'adattatore traduce gli
 * eventi nativi del provider (per Stripe: checkout.session.completed,
 * customer.subscription.updated|deleted, invoice.payment_failed) in questi quattro casi.
 */
export type SubscriptionEventType =
  | 'subscription_activated'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'payment_failed';

/**
 * L'evento di abbonamento NORMALIZZATO che l'adattatore produce dopo aver verificato la
 * firma. Porta gia' `plan` e `status` RISOLTI dall'adattatore (il webhook non re-interpreta
 * l'evento nativo): il webhook si limita a persistere questi campi sotto service_role.
 *
 * `account_id` NON e' inferito: e' recuperato dal metadata della sessione/subscription,
 * impostato al checkout (BIL-203) — cosi' il webhook sa quale account attivare.
 * `event_id` e' l'id opaco dell'evento del provider: e' la CHIAVE di idempotenza (BIL-202),
 * perche' il provider puo' ri-consegnare lo stesso evento piu' volte.
 */
export type SubscriptionEvent = {
  /** Id dell'evento presso il provider: chiave di dedup/idempotenza (BIL-202, BIL-D5). */
  readonly event_id: string;
  /** Tipo normalizzato, indipendente dal provider. */
  readonly type: SubscriptionEventType;
  /** Account da attivare/aggiornare: dal metadata dell'evento, mai inferito (BIL-D2). */
  readonly account_id: string;
  /** Piano risolto dall'adattatore a partire dall'evento nativo. */
  readonly plan: Plan;
  /** Stato risolto dall'adattatore a partire dall'evento nativo. */
  readonly status: SubscriptionStatus;
  /** Nome del provider ('stripe' oggi). */
  readonly provider: string;
  /** Id opaco della subscription presso il provider (per il billing portal). Nullable. */
  readonly provider_subscription_id: string | null;
  /** Id opaco del customer presso il provider. Nullable. */
  readonly provider_customer_id: string | null;
  /** Fine periodo pagato, ISO-8601 (o null): sostiene la scadenza dell'entitlement. */
  readonly current_period_end: string | null;
};

/**
 * La porta del payment provider. L'adattatore Stripe (src/data/payment/stripe.ts) la
 * implementa contro l'SDK reale; nei test un fake iniettato la implementa senza rete ne'
 * chiavi (BIL-D4), cosi' il checkpoint e' verde senza segreti reali.
 */
export type PaymentProvider = {
  /**
   * Apre una sessione di checkout per attivare `plan` sull'account `accountId`. L'adattatore
   * incorpora `accountId` nel metadata della sessione, cosi' il webhook (via parseWebhook)
   * lo recupera e attiva l'account giusto — chiude la catena checkout -> webhook (BIL-203).
   */
  createCheckout(accountId: string, plan: Plan): Promise<{ url: string }>;
  /** Apre il billing portal (gestione/disdetta) per l'account `accountId`. */
  openBillingPortal(accountId: string): Promise<{ url: string }>;
  /**
   * VERIFICA la firma del webhook sul payload GREZZO e normalizza l'evento. Firma non valida
   * => RIFIUTA (throw), nessun evento (anti-spoof, BIL-D5). Evento verificato ma non
   * pertinente ai quattro tipi gestiti => `null` (il webhook risponde 2xx no-op).
   */
  parseWebhook(payload: string, signature: string): Promise<SubscriptionEvent | null>;
};

import 'server-only';

// BIL-202 (macrotask stripe-checkout-webhook, p5-billing-fase1) — La SCRITTURA di
// subscriptions, riservata al webhook. E' l'UNICO percorso che muove l'entitlement (BIL-D2):
// gira sotto service_role (createAdminClient) FUORI dal percorso utente, e la sua guardia
// applicativa e' la FIRMA verificata a monte (parseWebhook), non una catena same-origin.
// Il client NON puo' mai fare questa scrittura: subscriptions ha RLS SELECT owner-only e
// nessuna policy/GRANT DML per authenticated (anti self-grant/self-reset).
//
// IDEMPOTENZA (BIL-D5): il provider ri-consegna lo stesso evento. La dedup e' per event id
// contro il ledger billing_webhook_events: un evento gia' registrato NON viene riapplicato.
// L'ordine — controlla, upserta, POI registra — fa si' che l'event id sia marcato SOLO ad
// avvenuta applicazione: se l'upsert lancia, l'evento resta non registrato e un retry del
// provider lo riprovera' (2xx solo a registrazione avvenuta).
//
// Lo STORE e' una porta iniettabile: il default parla col DB via service_role; i test
// iniettano uno store in-memory e inchiodano l'idempotenza senza DB.

import { createAdminClient } from '@/data/supabase-admin';
import type { SubscriptionEvent } from '@/domain/billing/payment-port';

/** La riga di subscriptions che il webhook persiste (derivata dal SubscriptionEvent). */
export type SubscriptionUpsert = {
  readonly account_id: string;
  readonly plan: SubscriptionEvent['plan'];
  readonly status: SubscriptionEvent['status'];
  readonly provider: string;
  readonly provider_subscription_id: string | null;
  readonly provider_customer_id: string | null;
  readonly current_period_end: string | null;
};

/** Porta di persistenza: dedup per event id + upsert della subscription. */
export type SubscriptionStore = {
  isEventProcessed(eventId: string): Promise<boolean>;
  upsertSubscription(row: SubscriptionUpsert): Promise<void>;
  markEventProcessed(eventId: string): Promise<void>;
};

const SUBSCRIPTIONS = 'subscriptions';
const WEBHOOK_EVENTS = 'billing_webhook_events';

/** Store reale su service_role (confinato al webhook, fuori dal percorso utente). */
function adminStore(): SubscriptionStore {
  const admin = createAdminClient();
  return {
    async isEventProcessed(eventId) {
      const { data } = await admin
        .from(WEBHOOK_EVENTS)
        .select('event_id')
        .eq('event_id', eventId)
        .maybeSingle();
      return data !== null;
    },
    async upsertSubscription(row) {
      const { error } = await admin
        .from(SUBSCRIPTIONS)
        .upsert(
          { ...row, updated_at: new Date().toISOString() },
          { onConflict: 'account_id' },
        );
      if (error) throw new Error(`subscriptions upsert fallito: ${error.message}`);
    },
    async markEventProcessed(eventId) {
      const { error } = await admin.from(WEBHOOK_EVENTS).insert({ event_id: eventId });
      if (error) throw new Error(`registrazione evento fallita: ${error.message}`);
    },
  };
}

/**
 * Applica un SubscriptionEvent gia' verificato: idempotente per event id. Ritorna
 * `{ applied: false }` se l'evento era gia' stato processato (replay, nessun effetto),
 * `{ applied: true }` alla prima applicazione.
 */
export async function applySubscriptionEvent(
  event: SubscriptionEvent,
  store: SubscriptionStore = adminStore(),
): Promise<{ applied: boolean }> {
  if (await store.isEventProcessed(event.event_id)) {
    return { applied: false };
  }
  await store.upsertSubscription({
    account_id: event.account_id,
    plan: event.plan,
    status: event.status,
    provider: event.provider,
    provider_subscription_id: event.provider_subscription_id,
    provider_customer_id: event.provider_customer_id,
    current_period_end: event.current_period_end,
  });
  await store.markEventProcessed(event.event_id);
  return { applied: true };
}

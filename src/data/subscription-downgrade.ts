import 'server-only';

// BIL-502 (macrotask downgrade-lifecycle, p5-billing-fase1) — L'APPLICAZIONE della
// retrocessione morbida, nel percorso del webhook (service_role confinato, FUORI dal percorso
// utente — A01/R7). Legge i siti dell'account, calcola applyDowngrade (dominio puro, BIL-501)
// e porta is_published=false i SOLI siti eccedenti: MAI un DELETE (BIL-D6, nessun dato perso).
//
// IDEMPOTENTE: dopo la prima applicazione resta un solo sito pubblicato (limite free) e una
// seconda esecuzione non trova eccedenti (no-op). Il ritorno del badge non richiede scrittura
// extra: discende dall'entitlement (BIL-302). Riattivando Pro nessun sito viene toccato
// (applyDowngrade su un entitlement pro non produce eccedenti) e i dati restano intatti.
//
// Lo STORE e' una porta iniettabile (gemella di SubscriptionStore, BIL-202): il default parla
// col DB via service_role; i test iniettano uno store in-memory e inchiodano idempotenza e
// non-delete senza DB ne' chiavi.

import { createAdminClient } from '@/data/supabase-admin';
import { applyDowngrade, type DowngradeSite } from '@/domain/billing/downgrade';
import { type Plan, type Subscription } from '@/domain/billing/entitlement';

/** Porta di applicazione: elenca i siti dell'account e ne ritira la pubblicazione (non-delete). */
export type SiteDowngradeStore = {
  listAccountSites(accountId: string): Promise<DowngradeSite[]>;
  unpublishSite(siteId: string): Promise<void>;
};

const SITE_PUBLICATIONS = 'site_publications';

/** Store reale su service_role (confinato al webhook, fuori dal percorso utente — A01/R7). */
function adminSiteDowngradeStore(): SiteDowngradeStore {
  const admin = createAdminClient();
  return {
    async listAccountSites(accountId) {
      const { data, error } = await admin
        .from(SITE_PUBLICATIONS)
        .select('site_id, is_published')
        .eq('account_id', accountId);
      if (error) throw new Error(`lettura siti account fallita: ${error.message}`);
      return (data ?? []).map((r) => ({
        id: r.site_id as string,
        is_published: r.is_published as boolean,
      }));
    },
    async unpublishSite(siteId) {
      // Ritiro NON distruttivo: solo is_published=false; lo snapshot e lo slug restano (BIL-D6).
      const { error } = await admin
        .from(SITE_PUBLICATIONS)
        .update({ is_published: false, updated_at: new Date().toISOString() })
        .eq('site_id', siteId);
      if (error) throw new Error(`ritiro pubblicazione fallito: ${error.message}`);
    },
  };
}

/**
 * Applica la retrocessione morbida a un account alla luce del suo stato di abbonamento.
 * Idempotente e non distruttiva: porta offline SOLO i siti pubblicati eccedenti; nulla e'
 * cancellato. Se l'entitlement resta pro (grazia/attivo) non tocca nulla.
 *
 * @param accountId l'account su cui applicare la decisione (dal SubscriptionEvent, mai dal client).
 * @param subscription lo stato dell'abbonamento appena persistito (o null => free).
 * @param now l'istante corrente, preso UNA volta al confine (call-site).
 * @param store la porta di persistenza (default: service_role confinato al webhook).
 */
export async function applySoftDowngrade(
  accountId: string,
  subscription: Subscription | null,
  now: Date,
  store: SiteDowngradeStore = adminSiteDowngradeStore(),
): Promise<{ effectivePlan: Plan; unpublished: string[] }> {
  const sites = await store.listAccountSites(accountId);
  const { effectivePlan, sitesToUnpublish } = applyDowngrade(subscription, sites, now);
  for (const siteId of sitesToUnpublish) {
    await store.unpublishSite(siteId);
  }
  return { effectivePlan, unpublished: [...sitesToUnpublish] };
}

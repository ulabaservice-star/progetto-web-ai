// BIL-501 (macrotask downgrade-lifecycle, p5-billing-fase1) — La DECISIONE di retrocessione
// morbida, dominio PURO. Nessun DB, nessuna rete, nessun orologio interno (now INIETTATO,
// gemello di resolveEntitlement, BIL-D3/D6): dato lo stato dell'abbonamento, l'elenco dei siti
// e l'istante, decide COSA comporta una decadenza — senza eseguirla.
//
// GRAZIA = current_period_end (BIL-D6): si RIUSA resolveEntitlement per il verdetto di piano,
// cosi' la finestra di grazia ha UNA sola definizione (past_due entro il periodo resta pro,
// oltre decade a free) e non si duplica la logica. La retrocessione riguarda SOLO il passaggio
// a free: finche' l'entitlement resta pro (grazia o attivo) non si tocca nulla.
//
// NESSUN DATO PERSO (BIL-D6): il ritorno non prevede alcuna cancellazione. sitesToUnpublish e'
// solo l'elenco dei siti PUBBLICATI oltre il limite free, da portare non-pubblicati (offline
// reversibile). Riattivando l'abbonamento tornano pubblicabili senza perdita.

import {
  resolveEntitlement,
  type Plan,
  type Subscription,
} from '@/domain/billing/entitlement';

/** La porzione di un sito che la decisione di retrocessione consuma: id + stato di pubblicazione. */
export type DowngradeSite = {
  readonly id: string;
  readonly is_published: boolean;
};

/** L'esito PURO della decisione di retrocessione. Nessun campo di cancellazione (BIL-D6).
 *  Locale (return type di applyDowngrade): i chiamanti lo consumano per struttura, non per nome. */
type DowngradeOutcome = {
  /** Il piano EFFETTIVO dopo la valutazione (grazia => resta 'pro'; decadenza => 'free'). */
  readonly effectivePlan: Plan;
  /** true quando il piano effettivo mostra di nuovo il badge (deriva dai limiti, nessuna magia). */
  readonly badgeRestored: boolean;
  /** Gli id dei siti PUBBLICATI oltre il limite del piano free, da portare non-pubblicati. */
  readonly sitesToUnpublish: readonly string[];
};

/**
 * Decide la retrocessione morbida di un account. PURA: funzione di (subscription, sites, now).
 * Riusa resolveEntitlement per il verdetto di piano (una sola definizione di grazia, BIL-D6):
 *  - entitlement pro (grazia past_due entro il periodo, o attivo) => nessuna retrocessione;
 *  - entitlement free (fine grazia o canceled) => il badge torna e i siti PUBBLICATI oltre
 *    max_sites (free = 1) vanno messi offline (mai cancellati).
 *
 * @param subscription lo stato dell'abbonamento (o null => free).
 * @param sites i siti dell'account (id + is_published); solo i pubblicati contano verso il limite.
 * @param now l'istante corrente, preso UNA volta al confine (call-site) e passato qui.
 */
export function applyDowngrade(
  subscription: Subscription | null,
  sites: readonly DowngradeSite[],
  now: Date,
): DowngradeOutcome {
  const entitlement = resolveEntitlement(subscription, now);
  const effectivePlan = entitlement.plan;
  // Il badge torna quando il piano effettivo NON lo rimuove (free.no_badge=false => badge presente).
  const badgeRestored = !entitlement.limits.no_badge;

  // Grazia o attivo: l'entitlement resta pro => nessuna retrocessione (BIL-D6).
  if (effectivePlan !== 'free') {
    return { effectivePlan, badgeRestored, sitesToUnpublish: [] };
  }

  // Decadenza a free: i siti PUBBLICATI oltre il limite free (tenendo i primi max_sites) vanno
  // offline. Solo i pubblicati contano (sostiene l'idempotenza a valle in BIL-502).
  const published = sites.filter((s) => s.is_published);
  const sitesToUnpublish = published
    .slice(entitlement.limits.max_sites)
    .map((s) => s.id);

  return { effectivePlan, badgeRestored, sitesToUnpublish };
}

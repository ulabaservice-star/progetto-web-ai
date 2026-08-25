// BIL-102 (macrotask entitlement-core, p5-billing-fase1) — I LIMITI di piano e la
// RISOLUZIONE dell'entitlement, dominio PURO. Nessun DB, nessuna rete, nessun orologio
// interno: resolveEntitlement e' una funzione dei suoi argomenti (subscription + `now`
// INIETTATO, BIL-D3), cosi' la logica del piano e deterministica e testabile senza
// aspettare tempo reale.
//
// LIMITI IN CODICE, NON NEL DB (BIL-D3): PLAN_LIMITS sono costanti pure e versionate.
// Cambiare un tetto o un flag e' un DEPLOY (ricompilare), non una migrazione: nessuna
// riga di configurazione runtime che un attore possa spostare. La tabella subscriptions
// (BIL-101) porta lo STATO dell'abbonamento; la MAPPA dei diritti sta qui.
//
// FAIL-SAFE (BIL-D2/D3): ogni stato non riconducibile a un piano attivo — subscription
// assente, status non-attivo, periodo scaduto, piano non ancora mappato (business,
// Oltre-P5) — degrada a 'free'. MAI a un piano superiore per errore (nessun fail-open:
// un bug non deve regalare 'pro').

/** I piani vendibili. 'business' e DICHIARATO (lo ammette anche il CHECK del DB) ma e
 *  Oltre-P5 (agenzie): non ha ancora una entry in PLAN_LIMITS, quindi in Fase 1 una
 *  subscription 'business' attiva degrada a 'free' (fail-safe) finche' il tier non esiste. */
export type Plan = 'free' | 'pro' | 'business';

/** Gli stati dell'abbonamento presso il provider (specchio del CHECK di BIL-101). */
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

/** I diritti concreti di un piano. Costanti pure (BIL-D3): cambiarli e un deploy. */
export type PlanLimits = {
  /** Numero massimo di siti pubblicabili con questo piano. */
  readonly max_sites: number;
  /** Tetto mensile di usi AI on-demand (parametro del cap, consumato da plan-gates). */
  readonly ai_monthly_cap: number;
  /** Sblocca i campi SEO avanzati nel generatore. */
  readonly seo_advanced: boolean;
  /** Rimuove il badge "fatto con Ulaba" dai siti pubblicati. */
  readonly no_badge: boolean;
  /** Abilita il collegamento di un dominio custom (la vendita/host-routing e Fase 2). */
  readonly custom_domain: boolean;
};

/**
 * La mappa dei diritti per piano. SOLO free e pro sono attivi in Fase 1 ('business' e
 * Oltre-P5: verra' aggiunto qui, con un ramo in resolveEntitlement, quando sara' vendibile).
 * I valori numerici (max_sites, ai_monthly_cap) sono DEPLOY-TUNABLE: la loro modifica e
 * una ricompilazione, non una migrazione ne un dato runtime.
 */
export const PLAN_LIMITS: Record<'free' | 'pro', PlanLimits> = {
  free: {
    max_sites: 1,
    ai_monthly_cap: 30,
    seo_advanced: false,
    no_badge: false, // il badge C'E' in free (e il gancio, BIL-D1)
    custom_domain: false,
  },
  pro: {
    max_sites: 5,
    ai_monthly_cap: 500,
    seo_advanced: true,
    no_badge: true,
    custom_domain: true, // il collegamento e Pro; la vendita del dominio e Fase 2 (BIL-D7)
  },
};

/**
 * La porzione di riga subscription che DETERMINA l'entitlement. Il reader (BIL-103)
 * mappa la riga DB su questo tipo; resolveEntitlement non ha bisogno degli id opachi del
 * provider per decidere il piano — solo piano, stato e fine periodo.
 */
export type Subscription = {
  readonly plan: Plan;
  readonly status: SubscriptionStatus;
  /** Fine del periodo pagato, ISO-8601 (o null se assente). Confrontata con `now`. */
  readonly current_period_end: string | null;
};

/** L'entitlement risolto: il piano EFFETTIVO servito (mai 'business' in Fase 1) + i suoi limiti. */
export type Entitlement = {
  readonly plan: Plan;
  readonly limits: PlanLimits;
};

// Gli stati che, con un periodo ancora valido, servono il piano pieno. 'past_due' e
// INCLUSO di proposito: e la retrocessione morbida (BIL-D6) — un pagamento in ritardo
// resta servito Pro fino a fine grazia (qui: current_period_end), non si spegne di colpo.
// 'canceled' NON c'e': un abbonamento disdetto decade a free.
const ACTIVE_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  'active',
  'trialing',
  'past_due',
]);

const FREE_ENTITLEMENT: Entitlement = { plan: 'free', limits: PLAN_LIMITS.free };

/**
 * Risolve l'entitlement effettivo da una subscription e da un istante `now` INIETTATO.
 * Puro: nessun Date.now/Math.random, nessun accesso a DB/rete. Assenza, stato non-attivo,
 * periodo scaduto o piano non mappato ⇒ 'free' (fail-safe, mai un piano superiore per errore).
 *
 * @param subscription la riga (porzione) dell'abbonamento, oppure null se l'account non
 *   ne ha alcuna (⇒ free).
 * @param now l'istante corrente, preso UNA volta al confine (call-site) e passato qui.
 */
export function resolveEntitlement(
  subscription: Subscription | null,
  now: Date,
): Entitlement {
  if (subscription === null) return FREE_ENTITLEMENT;

  const periodOk =
    subscription.current_period_end !== null &&
    new Date(subscription.current_period_end).getTime() > now.getTime();

  const active = ACTIVE_STATUSES.has(subscription.status) && periodOk;
  if (!active) return FREE_ENTITLEMENT;

  // Attivo e nel periodo: serve il piano della subscription SE e mappato in PLAN_LIMITS.
  if (subscription.plan === 'pro') {
    return { plan: 'pro', limits: PLAN_LIMITS.pro };
  }
  // 'free' (una sub attiva ma di piano free) o 'business' (Oltre-P5, non ancora un tier):
  // in entrambi i casi i diritti serviti sono quelli free (fail-safe).
  return FREE_ENTITLEMENT;
}

import 'server-only';
import { createServerSupabaseClient } from '@/data/supabase-ssr';
import { resolveOwnAccountId } from '@/data/account';
import {
  resolveEntitlement,
  FREE_ENTITLEMENT,
  type Entitlement,
  type Plan,
  type Subscription,
  type SubscriptionStatus,
} from '@/domain/billing/entitlement';

/** Il client SSR legato alla sessione (RLS attiva), come restituito dal costruttore. */
type SessionClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** La porzione di riga subscriptions che determina l'entitlement (plan/status/period). */
export type SubscriptionRow = {
  plan: Plan;
  status: SubscriptionStatus;
  current_period_end: string | null;
};

/**
 * Mappa una riga (porzione) di subscriptions sul dominio e risolve l'entitlement col `now` dato.
 * Estratto (BIL-302/303) per condividere la mappatura riga->Entitlement tra il reader di SESSIONE
 * (getAccountEntitlement, qui) e quello PUBBLICO su service_role (getPublicSiteEntitlement), senza
 * duplicarla. `row` null (nessuna riga) => resolveEntitlement(null) => free.
 */
export function entitlementFromRow(row: SubscriptionRow | null, now: Date): Entitlement {
  const subscription: Subscription | null = row
    ? { plan: row.plan, status: row.status, current_period_end: row.current_period_end }
    : null;
  return resolveEntitlement(subscription, now);
}

// BIL-103 (macrotask entitlement-core, p5-billing-fase1) — il READER server-side unico da
// cui il resto del sistema chiede "qual e il piano di questo account". Legge la riga
// subscriptions (BIL-101) col client Supabase legato alla SESSIONE (RLS attiva), MAI la
// service_role (R7/A01): l'account non e una fonte di verita del permesso presa dal client,
// e l'isolamento per tenant lo garantisce la RLS SELECT owner-only. Applica poi la funzione
// PURA resolveEntitlement (BIL-102) con un `now` REALE preso QUI, al confine — cosi il
// dominio resta senza orologio.
//
// FAIL-SAFE (BIL-D2/D3): assenza di riga => free (percorso felice, NON un errore: usiamo
// maybeSingle, che non lancia sul "nessuna riga"); un guasto di lettura non-fatale => free,
// mai un piano superiore per errore (nessun fail-open). Il reader non lancia sul percorso
// felice mancante.

const TABLE = 'subscriptions';

/**
 * Legge la (porzione della) riga subscriptions dell'account sotto RLS (client di SESSIONE),
 * o null se assente. Un guasto di lettura NON-fatale => null (fail-safe: chi legge il piano
 * degrada a free, mai un piano superiore per errore, e non rilancia). maybeSingle non lancia
 * sul "nessuna riga". Estratto (BIL-401) perche' condiviso da getAccountEntitlement e
 * getAccountBillingState: una sola query, un solo punto dove vive il fail-safe della lettura.
 */
async function readSubscriptionRow(
  supabase: SessionClient,
  accountId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('plan, status, current_period_end')
    .eq('account_id', accountId)
    .maybeSingle();

  if (error) return null;
  return (data as SubscriptionRow | null) ?? null;
}

/**
 * Ritorna l'entitlement effettivo dell'account: legge la sua subscription sotto RLS (client
 * di sessione) e la risolve con resolveEntitlement e il `now` corrente. Nessuna riga o
 * guasto di lettura => piano free (fail-safe).
 */
export async function getAccountEntitlement(accountId: string): Promise<Entitlement> {
  const supabase = await createServerSupabaseClient();
  const row = await readSubscriptionRow(supabase, accountId);
  // now al CONFINE (call-site del dominio puro): preso una volta e passato a resolveEntitlement.
  return entitlementFromRow(row, new Date());
}

/**
 * Lo stato di billing per la UI (BIL-401/402): l'entitlement RISOLTO (il piano effettivo servito,
 * per decidere la CTA) PIU' lo stato GREZZO della subscription (status + fine periodo, per
 * etichettare active/past_due/canceled). I due non coincidono di proposito: un past_due nel
 * periodo e' entitlement 'pro' (grazia, BIL-D6) ma status 'past_due'; un canceled e' entitlement
 * 'free' ma status 'canceled' (la UI offre il ri-abbonamento). `subscription` null = nessuna
 * subscription (o guasto di lettura): la UI mostra il solo piano Free.
 */
export type AccountBillingState = {
  entitlement: Entitlement;
  subscription: { status: SubscriptionStatus; current_period_end: string | null } | null;
};

/**
 * Legge lo stato di billing dell'account sotto RLS (client di sessione) e ne deriva
 * l'entitlement risolto + lo stato grezzo della subscription. Nessuna riga o guasto di
 * lettura => { free, subscription: null } (fail-safe, mai pro per errore).
 */
export async function getAccountBillingState(accountId: string): Promise<AccountBillingState> {
  const supabase = await createServerSupabaseClient();
  const row = await readSubscriptionRow(supabase, accountId);
  const now = new Date();
  return {
    entitlement: entitlementFromRow(row, now),
    subscription: row
      ? { status: row.status, current_period_end: row.current_period_end }
      : null,
  };
}

/**
 * Lo stato di billing dell'account POSSEDUTO dall'utente (BIL-401/402): risolve l'account
 * dall'identita' (owner_id = auth.uid()), poi delega a getAccountBillingState. Client di
 * SESSIONE (RLS), mai service_role. Fail-safe: nessun account risolvibile o guasto =>
 * { free, subscription: null }. Usato dalla pagina "Abbonamento".
 */
export async function getOwnBillingState(userId: string): Promise<AccountBillingState> {
  try {
    const supabase = await createServerSupabaseClient();
    const accountId = await resolveOwnAccountId(supabase, userId);
    if (accountId === null) return { entitlement: FREE_ENTITLEMENT, subscription: null };
    return await getAccountBillingState(accountId);
  } catch {
    return { entitlement: FREE_ENTITLEMENT, subscription: null };
  }
}

/**
 * L'entitlement dell'account POSSEDUTO dall'utente (BIL-304). Risolve l'account dall'identita'
 * (owner_id = auth.uid()), poi delega a getAccountEntitlement. Client di SESSIONE (RLS), mai
 * service_role. Fail-safe: nessun account risolvibile o guasto di lettura => free (mai pro per
 * errore). Usato dagli endpoint AI per parametrizzare il cap sul piano dell'account.
 */
export async function getAccountEntitlementForUser(userId: string): Promise<Entitlement> {
  try {
    const supabase = await createServerSupabaseClient();
    const accountId = await resolveOwnAccountId(supabase, userId);
    if (accountId === null) return entitlementFromRow(null, new Date());
    return await getAccountEntitlement(accountId);
  } catch {
    // Qualsiasi guasto (costruzione del client, rete) => free: fail-safe totale, mai un cap piu'
    // ampio per errore. Il cap del piano non deve poter allargarsi per un guasto di lettura.
    return entitlementFromRow(null, new Date());
  }
}

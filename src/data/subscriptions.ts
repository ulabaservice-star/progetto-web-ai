import 'server-only';
import { createServerSupabaseClient } from '@/data/supabase-ssr';
import { resolveOwnAccountId } from '@/data/account';
import {
  resolveEntitlement,
  type Entitlement,
  type Plan,
  type Subscription,
  type SubscriptionStatus,
} from '@/domain/billing/entitlement';

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
 * Ritorna l'entitlement effettivo dell'account: legge la sua subscription sotto RLS (client
 * di sessione) e la risolve con resolveEntitlement e il `now` corrente. Nessuna riga o
 * guasto di lettura => piano free (fail-safe).
 */
export async function getAccountEntitlement(accountId: string): Promise<Entitlement> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select('plan, status, current_period_end')
    .eq('account_id', accountId)
    .maybeSingle();

  // now al CONFINE (call-site del dominio puro): preso una volta e passato a resolveEntitlement.
  const now = new Date();

  // Guasto di lettura non-fatale => free (fail-safe): non regaliamo pro per un errore, e non
  // rilanciamo sul reader (chi legge il piano non deve rompersi per un guasto del DB).
  if (error) {
    return entitlementFromRow(null, now);
  }

  return entitlementFromRow(data ?? null, now);
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

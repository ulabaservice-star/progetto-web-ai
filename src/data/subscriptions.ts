import 'server-only';
import { createServerSupabaseClient } from '@/data/supabase-ssr';
import {
  resolveEntitlement,
  type Entitlement,
  type Subscription,
} from '@/domain/billing/entitlement';

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
    return resolveEntitlement(null, now);
  }

  const subscription: Subscription | null = data
    ? {
        plan: data.plan,
        status: data.status,
        current_period_end: data.current_period_end,
      }
    : null;

  return resolveEntitlement(subscription, now);
}

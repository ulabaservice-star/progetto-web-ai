import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

// Risoluzione dell'account POSSEDUTO dall'utente (owner_id = auth.uid()), sotto il client di SESSIONE
// dato (RLS attiva), mai service_role. account_id DERIVATO dall'identita', mai fidato da input del
// client (A01:2025). UNIQUE(owner_id) + auto-provision => al piu' una riga.
//
// Estratto (fix igiene del checkpoint plan-gates): lo stesso pattern "accounts.id dove owner_id =
// auth.uid()" era ripetuto in createSite (T-101), nel preambolo billing (_guard.ts, BIL-203) e nel
// reader del cap AI (getAccountEntitlementForUser, BIL-304). Una sola copia qui: ogni call-site
// traduce il `null` (nessun account / guasto di lettura) nel proprio esito (400/500/free).
//
// `.single()` come i call-site originali: UNIQUE(owner_id) + auto-provision garantiscono al piu' una
// riga; 0 righe o guasto => `error` (PGRST116 incluso), tradotto in `null` — nessun throw propagato.

/** L'id dell'account dell'utente, o `null` se assente o su guasto di lettura. */
export async function resolveOwnAccountId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('owner_id', userId)
    .single();
  if (error || !data) return null;
  return data.id as string;
}

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

// DOM-301 (macrotask domain-connect, p5-custom-domains-fase2) — l'account_id del SITO, sotto il
// client di SESSIONE (RLS attiva), mai service_role. L'endpoint connect deriva l'account dal sito
// POSSEDUTO (mai dal body: no IDOR, A01:2025) per il gate entitlement custom_domain. La RLS di
// sites nasconde i siti altrui => un site_id non del chiamante (o inesistente) da' `null`,
// indistinguibili (P1-D21). `maybeSingle` non lancia sul "nessuna riga"; un guasto di lettura =>
// `null` (fail-safe, il call-site lo traduce nel proprio esito). Gemello di resolveOwnAccountId.

/** L'id dell'account del sito (sotto RLS di sessione), o `null` se non proprio/inesistente o su guasto. */
export async function resolveSiteAccountId(
  supabase: SupabaseClient,
  siteId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('sites')
    .select('account_id')
    .eq('id', siteId)
    .maybeSingle();
  if (error || !data) return null;
  return data.account_id as string;
}

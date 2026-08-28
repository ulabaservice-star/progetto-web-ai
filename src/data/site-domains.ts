import 'server-only';
import { createServerSupabaseClient } from '@/data/supabase-ssr';
import { normalizeHostname } from '@/domain/domains/hostname';

/** Il client SSR legato alla sessione (RLS attiva), come restituito dal costruttore. */
type SessionClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

// DOM-221 (macrotask domain-store, p5-custom-domains-fase2) — il READER owner-side dei
// collegamenti dominio<->sito. Legge site_domains col client Supabase legato alla SESSIONE
// (RLS attiva), MAI la service_role (R7/A01:2025): l'isolamento per tenant lo garantisce la
// RLS SELECT owner-only di DOM-101 (is_account_member(account_id)), non il codice qui. Il
// writer di STATO (transizioni service_role dopo la verifica DNS) e' un modulo separato
// (site-domains-write.ts): qui SOLO letture del proprietario.
//
// FAIL-SAFE: un guasto di lettura non-fatale => insieme vuoto / null, mai un lancio nel
// percorso utente. maybeSingle non lancia sul "nessuna riga".

/** Ciclo di vita del collegamento (schema site_domains). */
export type SiteDomainStatus = 'pending' | 'verifying' | 'active' | 'suspended' | 'error';

/** La riga di site_domains come la vede il PROPRIETARIO (tutte le colonne, sotto RLS). */
export type SiteDomainSummary = {
  id: string;
  account_id: string;
  site_id: string;
  hostname: string;
  normalized_hostname: string;
  kind: 'apex' | 'subdomain';
  status: SiteDomainStatus;
  provider: string | null;
  provider_domain_id: string | null;
  public_slug: string | null;
  verification_token: string | null;
  verified_at: string | null;
  created_at: string;
};

const TABLE = 'site_domains';

// Colonne proiettate al proprietario: include verification_token (gli serve per le istruzioni
// DNS del record TXT) — leggibile solo dall'owner sotto RLS, mai da anon (GRANT column-level).
const OWNER_COLUMNS =
  'id, account_id, site_id, hostname, normalized_hostname, kind, status, provider, provider_domain_id, public_slug, verification_token, verified_at, created_at';

// Query base owner-side su site_domains con le colonne del proprietario. SINCRONA (riceve il
// client gia' risolto): ritorna il builder, mai awaitato qui — un PostgrestFilterBuilder e'
// thenable, awaitarlo lo ESEGUIREBBE. I due reader vi concatenano solo il proprio
// filtro/terminatore, senza ripetere il blocco from+select.
function ownerQuery(supabase: SessionClient) {
  return supabase.from(TABLE).select(OWNER_COLUMNS);
}

/**
 * Elenca i collegamenti dominio di un sito, sotto RLS (client di SESSIONE): ritorna SOLO le
 * righe dell'account del chiamante (la RLS di gestione filtra per is_account_member). Un
 * guasto di lettura => [] (fail-safe, mai un lancio).
 */
export async function listSiteDomains(siteId: string): Promise<SiteDomainSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await ownerQuery(supabase)
    .eq('site_id', siteId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data as SiteDomainSummary[] | null) ?? [];
}

/**
 * Lookup di un collegamento per host, sotto RLS (client di SESSIONE). L'host grezzo e'
 * NORMALIZZATO (forma canonica/punycode, DOM-111) PRIMA del match esatto su
 * normalized_hostname: un host non canonico (maiuscole/schema URL) trova comunque la riga; un
 * host sintatticamente invalido => null (nessun match possibile). Tenant diverso => null (RLS).
 */
export async function getDomainByHost(host: string): Promise<SiteDomainSummary | null> {
  const norm = normalizeHostname(host);
  if (!norm.ok) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await ownerQuery(supabase)
    .eq('normalized_hostname', norm.normalized)
    .maybeSingle();
  if (error) return null;
  return (data as SiteDomainSummary | null) ?? null;
}

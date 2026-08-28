import { normalizeHostname } from '@/domain/domains/hostname';
import { createAnonServerClient } from '@/data/supabase-ssr';

// DOM-401 (macrotask domain-routing, p5-custom-domains-fase2) — l'UNICA lettura host->slug del
// routing per dominio custom, gemella di public-site.ts. Gira come `anon` (createAnonServerClient,
// MAI service_role: R7/A01:2025) sull'edge (middleware). Su quel ruolo agisce, senza che questo
// modulo la ripeta, la policy DOM-102 `site_domains_select_active_anon` (using status='active'):
// anon vede SOLO i collegamenti ATTIVI. Lo `status` NON e' nominato qui e NON e' nel GRANT
// column-level anon (solo normalized_hostname, public_slug): e' la RLS a filtrare il non-attivo,
// in modo trasparente (come is_published in public-site.ts). Questo rende INDISTINGUIBILI un host
// inesistente e uno non-attivo (P1-D21): entrambi => null, mai un errore che riveli la riga.
//
// UGUAGLIANZA ESATTA su normalized_hostname: `.eq(...)` — mai like/ilike/interpolazione (A05:2025).
// L'host grezzo e' NORMALIZZATO (DOM-111) PRIMA del match: un host non canonico (case/schema URL)
// trova comunque; un host sintatticamente invalido => null senza toccare il DB. Lo UNIQUE globale
// su normalized_hostname garantisce al piu' una riga => `.maybeSingle()`.
//
// FAIL-CLOSED: host invalido / nessuna riga / errore di lettura / public_slug non popolato => null.
// Il chiamante (middleware) traduce null in "nessun rewrite host-custom" (degrada sicuro).

/**
 * Lo slug pubblico del sito collegato a un dominio custom ATTIVO, o `null`. `null` copre in modo
 * INDISTINGUIBILE host invalido, host non registrato, collegamento non-attivo (filtrato dalla RLS
 * anon) e guasto di lettura (fail-closed, P1-D21).
 * @param host l'Host della richiesta (grezzo), normalizzato prima del match esatto.
 */
export async function readSiteSlugForHost(host: string): Promise<{ public_slug: string } | null> {
  const norm = normalizeHostname(host);
  if (!norm.ok) return null;
  try {
    const supabase = createAnonServerClient();
    const { data, error } = await supabase
      .from('site_domains')
      .select('public_slug')
      .eq('normalized_hostname', norm.normalized)
      .maybeSingle();
    if (error || !data) return null;
    const slug = (data as { public_slug: string | null }).public_slug;
    return slug ? { public_slug: slug } : null;
  } catch {
    return null;
  }
}

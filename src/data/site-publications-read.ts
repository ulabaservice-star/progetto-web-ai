import 'server-only';
import { createServerSupabaseClient } from '@/data/supabase-ssr';

// Opzione A (macrotask domain-routing, p5-custom-domains-fase2) — la LETTURA owner-side dello slug
// pubblico di un sito, sotto RLS di SESSIONE (client anon+cookie, mai service_role: R7/A01:2025).
// Modulo READER separato (import 'server-only'), gemello di site-domains.ts: NON vive in
// site-publications.ts perche' quel file e' 'use server' (ogni export vi diventa una Server Action
// invocabile dal client); questa e' una lettura INTERNA consumata server-side dal verify (DOM-311),
// non un'azione. FAIL-SAFE come gli altri reader: qualsiasi guasto => null, mai un lancio nel
// percorso utente. La RLS di site_publications (is_account_member) garantisce l'isolamento per
// tenant: un site_id di un altro account => nessuna riga => null.

/**
 * Lo slug pubblico (public_slug) del sito posseduto, sotto RLS di sessione (owner-only), o `null`
 * se il sito non ha una publication (mai pubblicato) o la lettura fallisce. Serve al verify
 * (Opzione A) per DENORMALIZZARE lo slug su site_domains all'attivazione del dominio custom, cosi'
 * che il routing anon (DOM-401) possa proiettarlo da site_domains senza join. UNIQUE(site_id) =>
 * al piu' una riga => maybeSingle. FAIL-SAFE: qualsiasi guasto => null.
 */
export async function readPublishedSlugForSite(siteId: string): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('site_publications')
      .select('public_slug')
      .eq('site_id', siteId)
      .maybeSingle();
    if (error || !data) return null;
    return (data as { public_slug: string | null }).public_slug ?? null;
  } catch {
    return null;
  }
}

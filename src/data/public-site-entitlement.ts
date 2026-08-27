import 'server-only';
import { cache } from 'react';
import { createAdminClient } from '@/data/supabase-admin';
import { entitlementFromRow } from '@/data/subscriptions';
import { FREE_ENTITLEMENT, type Entitlement } from '@/domain/billing/entitlement';

// BIL-302/303 (macrotask plan-gates, p5-billing-fase1) — READER dell'entitlement dell'account
// PROPRIETARIO di un sito PUBBLICATO, per il serving pubblico /s/<slug> (badge + SEO avanzato).
//
// PERCHE' service_role QUI. Il serving e' ANON e non ha una sessione: non puo' leggere ne
// account_id di site_publications (GRANT column-level: anon vede solo public_slug/document/locale/
// published_at) ne subscriptions (RLS SELECT owner-only, nessun GRANT anon => 42501). Questo reader
// gira server-side con service_role CONFINATO (createAdminClient), FUORI dal percorso utente
// autenticato; la sua UNICA authz e' "leggi il piano dell'account che possiede QUESTO slug
// pubblicato" per decidere badge/SEO. Nessun dato cross-tenant e' esposto al visitatore: dell'account
// altrui non si restituisce nulla, si usa solo il suo piano per montare o meno il badge.
//
// Query TIPATE (.eq), mai .or()/.filter() con lo slug (A03/A05): niente PostgREST filter injection.
//
// FAIL-SAFE TOTALE (BIL-D2). Slug non pubblicato/sconosciuto, account senza subscription, o QUALSIASI
// guasto (client/env/query) => free. MAI un piano superiore per errore (nessun fail-open): in dubbio
// il sito e' trattato come Free — badge PRESENTE, SEO base. Il badge non sparisce mai per un errore.
//
// cache() per-richiesta: generateMetadata e la page condividono un'unica risoluzione per slug (come
// readPublishedSite), evitando una seconda query admin nello stesso render.

export const getPublicSiteEntitlement = cache(
  async (slug: string): Promise<Entitlement> => {
    try {
      const admin = createAdminClient();

      // 1) slug pubblicato -> account proprietario. is_published nel filtro: un non-pubblicato non
      //    concede alcun trattamento di piano (coerente con l'anti-enumerazione del serving).
      const { data: pub, error: pubError } = await admin
        .from('site_publications')
        .select('account_id')
        .eq('public_slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      if (pubError || !pub) return FREE_ENTITLEMENT;

      // 2) subscription dell'account -> entitlement (via il mapping condiviso, `now` al confine).
      const { data: sub, error: subError } = await admin
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('account_id', pub.account_id as string)
        .maybeSingle();
      if (subError) return FREE_ENTITLEMENT;

      return entitlementFromRow(sub ?? null, new Date());
    } catch {
      // Qualsiasi guasto non previsto (env mancante, rete, parsing) => free, mai un fail-open.
      return FREE_ENTITLEMENT;
    }
  },
);

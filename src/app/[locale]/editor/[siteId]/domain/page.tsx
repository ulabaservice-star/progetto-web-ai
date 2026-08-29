import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/ui/shell/AppShell';
import { DomainSection, type DomainView } from '@/ui/domains/DomainSection';
import { enterSiteRoute } from '@/app/[locale]/_shared/site-route-guard';
import { createServerSupabaseClient } from '@/data/supabase-ssr';
import { resolveSiteAccountId } from '@/data/account';
import { getAccountEntitlement } from '@/data/subscriptions';
import { listSiteDomains } from '@/data/site-domains';
import { dnsInstructionsFor } from '@/domain/domains/dns-instructions';
import { getPlatformDnsTargets } from '@/data/domain/vercel';

// DOM-501/502 (macrotask domain-ui, p5-custom-domains-fase2) — ROTTA PROTETTA
// /{locale}/editor/{siteId}/domain: la pagina "Dominio personalizzato" del sito. Gemella di
// billing/page.tsx: risolve TUTTO server-side (identita' + proprieta' + entitlement + collegamenti)
// e passa alla sezione (isola client) dati gia' pronti, che li RIFLETTE (DOM-D5: la UI non decide).
//
// Sicurezza:
//  - A01:2025 — stessa catena d'ingresso delle altre rotte per-sito (enterSiteRoute): locale
//    vincolato all'allowlist, identita' server-side (getUser), proprieta' del sito (RLS). Un sito
//    altrui/inesistente => notFound (P1-D21), prima di leggere collegamenti o entitlement.
//  - Gate Pro/Free (DOM-502) letto DAL SERVER: entitlement.limits.custom_domain (getAccountEntitlement),
//    accountId DERIVATO dal sito posseduto (resolveSiteAccountId), mai dal client. Fail-safe => free
//    (mai un piano superiore per errore).
//  - R7 — nessuna service_role nel percorso di pagina: listSiteDomains legge owner-side sotto RLS.
//  - I record DNS li compone il dominio puro (dnsInstructionsFor) sui target di PIATTAFORMA (env di
//    deploy). Senza env Vercel (DOM-D9) getPlatformDnsTargets LANCIA: qui e' fail-safe (nessun record
//    mostrato), non un 500 all'apertura — coerente con l'inerzia dichiarata senza env.

// NOINDEX (come /editor, T-411): superficie protetta dell'app, mai nell'indice di un motore.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type DomainPageProps = {
  params: Promise<{ locale: string; siteId: string }>;
};

export default async function DomainPage({ params }: DomainPageProps) {
  const { locale: rawLocale, siteId } = await params;
  // Catena comune: locale vincolato -> identita' -> proprieta' del sito (notFound se non tuo).
  const { locale, site } = await enterSiteRoute(
    { locale: rawLocale, siteId },
    { errorLabel: 'domain: elenco siti non disponibile' },
  );

  const tNav = await getTranslations({ locale, namespace: 'nav' });

  // Entitlement Pro/Free letto DAL SERVER, accountId derivato dal sito posseduto (mai dal client).
  // Un guasto di lettura (accountId null) => free (fail-safe): mai il form a chi non ha la feature.
  const supabase = await createServerSupabaseClient();
  const accountId = await resolveSiteAccountId(supabase, site.id);
  const entitlement = accountId ? await getAccountEntitlement(accountId) : null;
  const plan: 'free' | 'pro' = entitlement?.limits.custom_domain === true ? 'pro' : 'free';

  // I collegamenti del sito (owner-side, RLS). I target di piattaforma per le istruzioni DNS sono
  // env di deploy: assenti (DOM-D9) => nessun record composto, non un errore di pagina.
  const rows = await listSiteDomains(site.id);
  let targets: { readonly apexTarget: string; readonly cnameTarget: string } | null = null;
  try {
    targets = getPlatformDnsTargets();
  } catch {
    targets = null;
  }

  const initialDomains: DomainView[] = rows.map((row) => ({
    hostname: row.normalized_hostname,
    status: row.status,
    records: targets
      ? dnsInstructionsFor(
          row.normalized_hostname,
          row.kind,
          row.kind === 'apex' ? targets.apexTarget : targets.cnameTarget,
          row.verification_token ?? undefined,
        )
      : [],
  }));

  return (
    <AppShell
      navItems={[
        { href: `/${locale}/dashboard`, label: tNav('dashboard') },
        { href: `/${locale}/billing`, label: tNav('subscription') },
      ]}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-lg">
        <DomainSection
          plan={plan}
          siteId={site.id}
          initialDomains={initialDomains}
          subscriptionHref={`/${locale}/billing`}
        />
      </div>
    </AppShell>
  );
}

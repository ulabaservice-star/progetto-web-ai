import { redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/ui/shell/AppShell';
import { BillingPanel } from '@/ui/billing/BillingPanel';
import { getUser } from '@/data/supabase-ssr';
import { getOwnBillingState } from '@/data/subscriptions';
import { routing } from '@/i18n/routing';

// BIL-401/402 (macrotask billing-ui, p5-billing-fase1) — la pagina "Abbonamento". Legge lo
// stato di billing SERVER-SIDE (getOwnBillingState, sotto RLS di sessione: R7, nessuna
// service_role nel percorso di pagina) e lo passa al pannello, che lo RIFLETTE (BIL-D2: la UI
// non decide l'entitlement). Il piano effettivo determina la CTA (Free → Passa a Pro), lo stato
// grezzo l'etichetta (active/past_due/canceled).
//
// Sicurezza (A01:2025): la rotta e' protetta a monte (middleware); qui si ri-verifica
// l'identita' server-side (getUser) e, in sua assenza, si reindirizza al login del locale —
// difesa in profondita', destinazione interna FISSA (anti open-redirect). Il segmento [locale]
// e' input controllabile: si vincola all'allowlist routing.locales prima di interpolarlo.

type BillingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BillingPage({ params }: BillingPageProps) {
  const { locale: rawLocale } = await params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  const user = await getUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const tNav = await getTranslations({ locale, namespace: 'nav' });

  // Stato di billing dell'account posseduto dall'utente: entitlement risolto + stato grezzo
  // della subscription. Fail-safe totale (guasto => free, subscription null): mai un piano
  // superiore per errore.
  const { entitlement, subscription } = await getOwnBillingState(user.id);

  // In Fase 1 l'entitlement effettivo e' solo free|pro ('business' degrada a free in
  // resolveEntitlement): il pannello parla questo vocabolario ristretto.
  const plan = entitlement.plan === 'pro' ? 'pro' : 'free';

  return (
    <AppShell
      navItems={[
        { href: `/${locale}/dashboard`, label: tNav('dashboard') },
        { href: `/${locale}/billing`, label: tNav('subscription') },
      ]}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-lg">
        <BillingPanel plan={plan} status={subscription?.status ?? null} />
      </div>
    </AppShell>
  );
}

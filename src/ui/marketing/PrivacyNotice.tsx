'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

// PUB-341 (macrotask privacy-page, p6a-public-surface) — l'INFORMATIVA PRIVACY della waitlist, resa
// sotto il chrome marketing (PUB-131). Estratta in un componente client renderizzabile in jsdom
// (pattern MarketingHome / MarketingHeader) così da essere provata sui cataloghi REALI dentro
// NextIntlClientProvider; il copy vive nel namespace i18n 'privacy' (parità di chiavi it↔es).
//
// CONTENUTO (P6A-D7, postura onesta v1): titolare del trattamento, finalità (raccolta email per la
// waitlist di lancio), base giuridica (consenso), dati raccolti (email + locale, NESSUN IP in chiaro),
// conservazione (Supabase EU), assenza di double opt-in in v1, diritti dell'interessato + contatto. È
// la destinazione del link di consenso del form (PUB-242).
//
// SICUREZZA (A05:2025): output SOLO testo JSX (escaping React). Nessun innerHTML/
// dangerouslySetInnerHTML, nessun dato utente reale (contenuto statico), nessuna auth, nessuna query.
// Ogni etichetta viene dal catalogo (nessuna stringa hard-coded fuori da 'privacy'). Ogni sezione è
// resa con un contenitore marcato data-testid="privacy-<sezione>" per l'osservabilità.
export function PrivacyNotice(): ReactElement {
  const t = useTranslations('privacy');

  return (
    <main className="site-page">
      <article className="mx-auto flex max-w-3xl flex-col gap-lg px-md py-2xl">
        <header className="flex flex-col gap-sm">
          <h1 className="text-balance text-4xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-lg text-muted-foreground">{t('intro')}</p>
        </header>

        <section
          data-testid="privacy-controller"
          aria-labelledby="privacy-controller-heading"
          className="flex flex-col gap-sm"
        >
          <h2 id="privacy-controller-heading" className="text-2xl font-semibold text-foreground">
            {t('controller.heading')}
          </h2>
          <p className="text-muted-foreground">{t('controller.body')}</p>
        </section>

        <section
          data-testid="privacy-purpose"
          aria-labelledby="privacy-purpose-heading"
          className="flex flex-col gap-sm"
        >
          <h2 id="privacy-purpose-heading" className="text-2xl font-semibold text-foreground">
            {t('purpose.heading')}
          </h2>
          <p className="text-muted-foreground">{t('purpose.body')}</p>
        </section>

        <section
          data-testid="privacy-lawfulBasis"
          aria-labelledby="privacy-lawfulBasis-heading"
          className="flex flex-col gap-sm"
        >
          <h2 id="privacy-lawfulBasis-heading" className="text-2xl font-semibold text-foreground">
            {t('lawfulBasis.heading')}
          </h2>
          <p className="text-muted-foreground">{t('lawfulBasis.body')}</p>
        </section>

        <section
          data-testid="privacy-dataCollected"
          aria-labelledby="privacy-dataCollected-heading"
          className="flex flex-col gap-sm"
        >
          <h2 id="privacy-dataCollected-heading" className="text-2xl font-semibold text-foreground">
            {t('dataCollected.heading')}
          </h2>
          <p className="text-muted-foreground">{t('dataCollected.body')}</p>
        </section>

        <section
          data-testid="privacy-retention"
          aria-labelledby="privacy-retention-heading"
          className="flex flex-col gap-sm"
        >
          <h2 id="privacy-retention-heading" className="text-2xl font-semibold text-foreground">
            {t('retention.heading')}
          </h2>
          <p className="text-muted-foreground">{t('retention.body')}</p>
        </section>

        <section
          data-testid="privacy-noDoubleOptIn"
          aria-labelledby="privacy-noDoubleOptIn-heading"
          className="flex flex-col gap-sm"
        >
          <h2 id="privacy-noDoubleOptIn-heading" className="text-2xl font-semibold text-foreground">
            {t('noDoubleOptIn.heading')}
          </h2>
          <p className="text-muted-foreground">{t('noDoubleOptIn.body')}</p>
        </section>

        <section
          data-testid="privacy-rights"
          aria-labelledby="privacy-rights-heading"
          className="flex flex-col gap-sm"
        >
          <h2 id="privacy-rights-heading" className="text-2xl font-semibold text-foreground">
            {t('rights.heading')}
          </h2>
          <p className="text-muted-foreground">{t('rights.body')}</p>
          <p className="text-muted-foreground">{t('rights.contact')}</p>
        </section>
      </article>
    </main>
  );
}

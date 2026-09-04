'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import { WaitlistForm } from '@/ui/waitlist/WaitlistForm';

// PUB-141 (macrotask marketing-home, p6a-public-surface) — la HOME pubblica STRUTTURALE: hero,
// value-props e closing-CTA, copy risolto dal namespace 'landing' (PUB-121). Estratta in un
// componente client renderizzabile in jsdom (pattern DomainSection / MarketingHeader) così da
// essere provata sui cataloghi REALI dentro NextIntlClientProvider; il chrome header/footer resta
// nel layout del group (marketing) (PUB-131), non qui.
//
// SLOT P6b (P6A-D13): la hero espone un placeholder VUOTO data-testid="hero-preview-slot" per
// l'anteprima istantanea "nome attività → ecco il tuo sito", che P6b riempirà senza rework. Non
// rende MAI contenuto non fidato: è un div senza figli (aria-hidden).
//
// PUNTI DI MONTAGGIO WAITLIST: due placeholder VUOTI data-testid="waitlist-slot" (uno nella hero,
// uno nella closing-CTA a fondo pagina) che il form di waitlist (PUB-241) riempirà.
//
// SICUREZZA (A05:2025): output SOLO testo JSX (escaping React). Nessun innerHTML/
// dangerouslySetInnerHTML, nessun dato utente, nessuna auth, nessuna query. Ogni etichetta viene
// dal catalogo (nessuna stringa hard-coded fuori da 'landing').
export function MarketingHome(): ReactElement {
  const t = useTranslations('landing');

  return (
    <main className="site-page">
      {/* HERO — headline + sub, lo slot P6b riservato (vuoto) e il primo punto di montaggio waitlist. */}
      <section
        aria-labelledby="home-hero-heading"
        data-testid="hero"
        className="mx-auto flex max-w-5xl flex-col gap-md px-md py-2xl"
      >
        <h1 id="home-hero-heading" className="text-balance text-4xl font-semibold text-foreground">
          {t('hero.headline')}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t('hero.sub')}</p>

        {/* Slot RISERVATO all'anteprima istantanea di P6b: placeholder VUOTO, nessun figlio di
            contenuto (P6b lo riempirà senza rework). Non rende input non fidato. */}
        <div data-testid="hero-preview-slot" aria-hidden="true" />

        {/* Punto di montaggio #1 del form waitlist (PUB-241): la CTA è l'etichetta del catalogo. */}
        <div className="flex flex-col gap-sm">
          <p className="font-medium text-foreground">{t('hero.cta')}</p>
          <div data-testid="waitlist-slot" data-slot="hero">
            <WaitlistForm slot="hero" />
          </div>
        </div>
      </section>

      {/* VALUE PROPS — perché Ulaba, tre punti dal catalogo. */}
      <section
        aria-labelledby="home-valueprops-heading"
        className="mx-auto flex max-w-5xl flex-col gap-md px-md py-xl"
      >
        <h2 id="home-valueprops-heading" className="text-2xl font-semibold text-foreground">
          {t('valueProps.title')}
        </h2>
        <ul className="grid gap-md sm:grid-cols-3">
          <li className="text-muted-foreground">{t('valueProps.item1')}</li>
          <li className="text-muted-foreground">{t('valueProps.item2')}</li>
          <li className="text-muted-foreground">{t('valueProps.item3')}</li>
        </ul>
      </section>

      {/* CLOSING-CTA — re-invito a fondo pagina + secondo punto di montaggio waitlist. */}
      <section
        aria-labelledby="home-closing-heading"
        className="mx-auto flex max-w-5xl flex-col gap-md px-md py-2xl"
      >
        <h2 id="home-closing-heading" className="text-2xl font-semibold text-foreground">
          {t('nav.waitlistCta')}
        </h2>
        {/* Punto di montaggio #2 del form waitlist (PUB-241). */}
        <div data-testid="waitlist-slot" data-slot="closing">
          <WaitlistForm slot="closing" />
        </div>
      </section>
    </main>
  );
}

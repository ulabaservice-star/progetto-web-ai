'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

// PUB-131 (macrotask marketing-layout, p6a-public-surface) — l'HEADER del chrome marketing: la nav
// landing (home/blog/privacy). Estratto in un componente client renderizzabile in jsdom (pattern
// DomainSection) così da essere provato sui cataloghi REALI dentro NextIntlClientProvider. Le
// etichette vengono dal namespace 'landing' (PUB-121, useTranslations); il locale corrente da
// useLocale(). Gli href sono rotte STATICHE per-locale (`/{locale}`, `/{locale}/blog`,
// `/{locale}/privacy`): il locale proviene dall'allowlist del routing, MAI da input libero →
// nessun open-redirect/XSS (security_notes A05:2025). Nessun link ad app (dashboard/login/…): il
// group (marketing) avvolge SOLO le rotte pubbliche (AC-131-2, non-regressione P6A-D4).
export function MarketingHeader(): ReactElement {
  const t = useTranslations('landing.nav');
  const locale = useLocale();

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-md px-md py-sm">
        <Link href={`/${locale}`} className="font-semibold text-foreground">
          {t('home')}
        </Link>
        <ul className="flex items-center gap-md">
          <li>
            <Link href={`/${locale}/blog`} className="text-muted-foreground">
              {t('blog')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/privacy`} className="text-muted-foreground">
              {t('privacy')}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

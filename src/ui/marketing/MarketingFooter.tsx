'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

// PUB-131 (macrotask marketing-layout, p6a-public-surface) — il FOOTER del chrome marketing: la
// tagline landing + i link a privacy/blog. Stesse regole d'igiene dell'header (etichette dai
// cataloghi REALI via useTranslations, href STATICI per-locale, nessun valore utente interpolato).
export function MarketingFooter(): ReactElement {
  const t = useTranslations('landing.footer');
  const locale = useLocale();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-xs px-md py-md text-sm text-muted-foreground">
        <p>{t('tagline')}</p>
        <ul className="flex gap-md">
          <li>
            <Link href={`/${locale}/privacy`}>{t('privacy')}</Link>
          </li>
          <li>
            <Link href={`/${locale}/blog`}>{t('blog')}</Link>
          </li>
        </ul>
        <p>{t('rights')}</p>
      </div>
    </footer>
  );
}

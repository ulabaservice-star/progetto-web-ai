import '../globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { routing } from '@/i18n/routing';
import { resolveInitialLocale } from '@/i18n/resolveInitialLocale';
import { getBrandName } from '@/config/brand';

// Title di DEFAULT dell'app: il nome del brand CONFIGURATO (getBrandName, NEXT_PUBLIC_BRAND_NAME),
// non un literal hardcoded — così le pagine senza un proprio title (es. /blog, /privacy) mostrano il
// brand vero (Ulaba in prod), coerente con AppShell e il JSON-LD Organization. Le pagine che vogliono
// un title descrittivo (home, post) lo dichiarano nel proprio generateMetadata.
export const metadata: Metadata = {
  title: getBrandName(),
  description: 'AI website builder per micro-business locali',
};

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

// Layout radice per segmento di locale: qui vivono html/body (pattern ufficiale
// next-intl con i18n routing, nessun root layout separato). La guardia sul
// locale precede setRequestLocale/getMessages: un locale fuori allowlist → 404.
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale: urlLocale } = await params;

  if (!hasLocale(routing.locales, urlLocale)) {
    notFound();
  }

  // Locale EFFETTIVO al bootstrap (T-083): cookie NEXT_LOCALE > preferenza
  // persistita profiles.locale > locale dell'URL. In assenza di cookie, la
  // preferenza dell'utente autenticato determina la lingua resa.
  const locale = await resolveInitialLocale(urlLocale);

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import { MarketingHeader } from '@/ui/marketing/MarketingHeader';
import { MarketingFooter } from '@/ui/marketing/MarketingFooter';

// PUB-131 (macrotask marketing-layout, p6a-public-surface) — ORACOLO del chrome marketing.
// Le stringhe NON si mockano: si risolvono dai cataloghi REALI (itMessages) dentro
// NextIntlClientProvider (locale 'it') — così il test misura la SCELTA DELLE CHIAVI del chrome
// (nav da `landing.nav.*`, tagline da `landing.footer.tagline`), non stringhe del test. Le query
// sono scoped ai landmark (banner = <header>, contentinfo = <footer>) perché header e footer
// espongono entrambi un link privacy/blog: within() disambigua senza fragilità.

const L = itMessages.landing;

function wrap(ui: ReactNode) {
  return (
    <NextIntlClientProvider locale="it" messages={itMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

afterEach(cleanup);

describe('PUB-131 marketing chrome — nav landing + footer, nessun link app', () => {
  it('AC-131-1: header rende i 3 link nav landing con href per-locale e il footer la tagline', () => {
    render(
      wrap(
        <>
          <MarketingHeader />
          <MarketingFooter />
        </>,
      ),
    );

    const header = within(screen.getByRole('banner'));
    const home = header.getByRole('link', { name: L.nav.home });
    const blog = header.getByRole('link', { name: L.nav.blog });
    const privacy = header.getByRole('link', { name: L.nav.privacy });
    expect(home.getAttribute('href')).toBe('/it'); // covers: AC-131-1
    expect(blog.getAttribute('href')).toBe('/it/blog'); // covers: AC-131-1
    expect(privacy.getAttribute('href')).toBe('/it/privacy'); // covers: AC-131-1

    const footer = within(screen.getByRole('contentinfo'));
    expect(footer.getByText(L.footer.tagline)).toBeTruthy(); // covers: AC-131-1
  });

  it('AC-131-2: il chrome NON espone alcun link ad app (dashboard)', () => {
    render(
      wrap(
        <>
          <MarketingHeader />
          <MarketingFooter />
        </>,
      ),
    );

    expect(screen.queryByRole('link', { name: /dashboard/i })).toBeNull(); // covers: AC-131-2
    expect(screen.queryByRole('link', { name: /login|onboarding|editor/i })).toBeNull(); // covers: AC-131-2
  });
});

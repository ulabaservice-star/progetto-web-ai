// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';
import { flattenKeys } from '@/i18n/keys';
import { PrivacyNotice } from '@/ui/marketing/PrivacyNotice';

// PUB-341 (macrotask privacy-page, p6a-public-surface) — ORACOLO dell'informativa privacy.
// Le stringhe NON si mockano: si risolvono dai cataloghi REALI (it/es) dentro
// NextIntlClientProvider — così il test misura la SCELTA DELLE CHIAVI del namespace 'privacy' e la
// presenza del copy localizzato, non stringhe del test. Copre: le sezioni controller/purpose/rights
// rese in it con testo non vuoto e agganciato al catalogo it (AC-341-1); le stesse in es con testo
// localizzato es (AC-341-2); parità dei path-foglia del namespace 'privacy' fra it ed es (AC-341-3).

function wrap(ui: ReactNode, locale: 'it' | 'es') {
  const messages = locale === 'it' ? itMessages : esMessages;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

// I tre contenitori di sezione richiesti dagli AC (data-testid + valore atteso dal catalogo).
const REQUIRED_SECTIONS = ['controller', 'purpose', 'rights'] as const;

afterEach(cleanup);

describe('PUB-341 privacy page — sezioni it/es + parità namespace', () => {
  it('AC-341-1: in it le sezioni controller/purpose/rights esistono con testo non vuoto dal catalogo it', () => {
    render(wrap(<PrivacyNotice />, 'it'));

    for (const key of REQUIRED_SECTIONS) {
      const section = within(screen.getByTestId(`privacy-${key}`));
      const heading = section.getByRole('heading', { level: 2 });
      const expected = itMessages.privacy[key].heading;
      expect(expected.length).toBeGreaterThan(0); // covers: AC-341-1
      expect(heading.textContent).toBe(expected); // covers: AC-341-1
      // il corpo della sezione è reso e non vuoto (contenuto legale presente)
      expect(itMessages.privacy[key].body.length).toBeGreaterThan(0); // covers: AC-341-1
      expect(section.getByText(itMessages.privacy[key].body)).toBeTruthy(); // covers: AC-341-1
    }
  });

  it('AC-341-2: in es le stesse sezioni esistono con testo localizzato es non vuoto', () => {
    render(wrap(<PrivacyNotice />, 'es'));

    for (const key of REQUIRED_SECTIONS) {
      const section = within(screen.getByTestId(`privacy-${key}`));
      const heading = section.getByRole('heading', { level: 2 });
      const expected = esMessages.privacy[key].heading;
      expect(expected.length).toBeGreaterThan(0); // covers: AC-341-2
      expect(heading.textContent).toBe(expected); // covers: AC-341-2
      expect(section.getByText(esMessages.privacy[key].body)).toBeTruthy(); // covers: AC-341-2
    }
  });

  it('AC-341-3: i path-foglia del namespace privacy coincidono fra it ed es (parità)', () => {
    const ki = flattenKeys(itMessages.privacy as unknown as Record<string, unknown>);
    const ke = flattenKeys(esMessages.privacy as unknown as Record<string, unknown>);
    expect(ki.size).toBeGreaterThan(0); // covers: AC-341-3
    expect([...ki].sort()).toEqual([...ke].sort()); // covers: AC-341-3
  });
});

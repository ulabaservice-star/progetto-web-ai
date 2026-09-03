// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';
import { MarketingHome } from '@/ui/marketing/MarketingHome';

// PUB-141 (macrotask marketing-home, p6a-public-surface) — ORACOLO della home strutturale.
// Le stringhe NON si mockano: si risolvono dai cataloghi REALI (it/es) dentro
// NextIntlClientProvider — così il test misura la SCELTA DELLE CHIAVI del catalogo 'landing', non
// stringhe del test. Copre: la hero rende landing.hero.headline + uno slot P6b VUOTO (AC-141-1);
// esattamente 2 punti di montaggio waitlist (AC-141-2); la headline resa in es differisce dalla it
// (AC-141-3).

function wrap(ui: ReactNode, locale: 'it' | 'es') {
  const messages = locale === 'it' ? itMessages : esMessages;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

afterEach(cleanup);

describe('PUB-141 marketing home — hero + slot P6b + 2 punti waitlist, rende it/es', () => {
  it('AC-141-1: la hero rende landing.hero.headline ed espone uno slot P6b VUOTO', () => {
    render(wrap(<MarketingHome />, 'it'));

    const hero = within(screen.getByTestId('hero'));
    // La headline della hero viene dal catalogo it (nessuna stringa hard-coded).
    const heading = hero.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe(itMessages.landing.hero.headline); // covers: AC-141-1

    // Lo slot dell'anteprima P6b esiste ma è VUOTO: nessun nodo figlio (né elementi né testo),
    // così P6b potrà riempirlo senza rework e nessun contenuto non fidato è reso ora.
    const previewSlot = screen.getByTestId('hero-preview-slot');
    expect(previewSlot.childNodes.length).toBe(0); // covers: AC-141-1
    expect(previewSlot.textContent).toBe(''); // covers: AC-141-1
  });

  it('AC-141-2: la home espone esattamente 2 punti di montaggio waitlist', () => {
    render(wrap(<MarketingHome />, 'it'));

    // Uno nella hero, uno nella closing-CTA a fondo pagina (placeholder che PUB-241 riempirà).
    expect(screen.getAllByTestId('waitlist-slot')).toHaveLength(2); // covers: AC-141-2
  });

  it('AC-141-3: la headline resa in es è quella del catalogo es e differisce dalla it', () => {
    render(wrap(<MarketingHome />, 'es'));

    const hero = within(screen.getByTestId('hero'));
    const heading = hero.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe(esMessages.landing.hero.headline); // covers: AC-141-3
    expect(esMessages.landing.hero.headline).not.toBe(itMessages.landing.hero.headline); // covers: AC-141-3
  });
});

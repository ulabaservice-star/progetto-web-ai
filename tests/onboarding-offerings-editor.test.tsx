// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import { OfferingsEditor } from '@/ui/onboarding/OfferingsEditor';

// OGW-202 (macrotask offerings-editor) — ORACOLO del componente OfferingsEditor:
// editor GENERICO e settore-agnostico delle voci d'offerta. Le asserzioni derivano
// da AC-202-1..4 di docs/blueprint/onboarding-guided-wizard/02-offerings-editor.md;
// ognuna e' taggata `// covers: AC-202-<n>`.
//
// NON si mocka next-intl: le stringhe si risolvono dai cataloghi REALI (itMessages)
// dentro NextIntlClientProvider, lo stesso provider del layout — cosi' AC-202-2/3
// misurano la SCELTA DELLE CHIAVI del componente (l'etichetta viene da resolveOfferings
// via `site.offerings.*`, l'hint da `onboarding.offerings.*`), non stringhe del test.
//
// Anti-tautologia: le voci di fixture hanno PIU' campi (name+price) e l'edit di uno
// asserisce che gli altri SOPRAVVIVONO; l'etichetta e' provata su un vertical NON
// ristorazione (fitness→Corsi) con l'assenza di 'Menu', cosi' un'etichetta fissa muore;
// l'hint e' provato su ENTRAMBI i versanti (compare per salone, assente per ristorazione).

const OFF = itMessages.onboarding.offerings;

function wrap(ui: ReactNode) {
  return (
    <NextIntlClientProvider locale="it" messages={itMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

afterEach(cleanup);

describe('OGW-202 OfferingsEditor', () => {
  it('add/edit/remove: onChange riceve l’array offerings aggiornato che riflette l’azione', () => {
    const onChange = vi.fn();
    render(
      wrap(
        <OfferingsEditor
          vertical="ristorazione"
          offerings={[{ name: 'Espresso', price: '1.20' }]}
          onChange={onChange}
        />,
      ),
    );

    // EDIT del nome: l'altro campo (price) della voce SOPRAVVIVE.
    fireEvent.change(screen.getByDisplayValue('Espresso'), {
      target: { value: 'Espresso doppio' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ name: 'Espresso doppio', price: '1.20' }]); // covers: AC-202-1

    // ADD: appende una voce vuota, senza toccare quella esistente.
    onChange.mockClear();
    fireEvent.click(screen.getByRole('button', { name: OFF.add }));
    expect(onChange).toHaveBeenLastCalledWith([{ name: 'Espresso', price: '1.20' }, { name: '' }]); // covers: AC-202-1

    // REMOVE: toglie la voce indicata, l'array resta senza di essa.
    onChange.mockClear();
    fireEvent.click(screen.getByRole('button', { name: OFF.remove }));
    expect(onChange).toHaveBeenLastCalledWith([]); // covers: AC-202-1
  });

  it('l’etichetta di sezione riflette il vertical via resolveOfferings, non una fissa', () => {
    render(wrap(<OfferingsEditor vertical="fitness" offerings={[]} onChange={() => {}} />));

    // fitness → site.offerings.courses → "Corsi" (non il "Menu" della ristorazione).
    expect(screen.queryByText('Corsi')).not.toBeNull(); // covers: AC-202-2
    expect(screen.queryByText('Menu')).toBeNull(); // covers: AC-202-2
  });

  it('mostra l’hint del prezzo solo quando il settore non lo rende sul sito', () => {
    // salone_studio → show_price false → l'hint compare.
    render(wrap(<OfferingsEditor vertical="salone_studio" offerings={[]} onChange={() => {}} />));
    expect(screen.queryByText(OFF.priceHiddenHint)).not.toBeNull(); // covers: AC-202-3
    cleanup();

    // ristorazione → show_price true → l'hint NON compare.
    render(wrap(<OfferingsEditor vertical="ristorazione" offerings={[]} onChange={() => {}} />));
    expect(screen.queryByText(OFF.priceHiddenHint)).toBeNull(); // covers: AC-202-3
  });

  it('rende testo non fidato solo in value di input, mai come HTML o href (T-151)', () => {
    const HOSTILE = '<img src=x onerror="alert(1)">';
    const { container } = render(
      wrap(
        <OfferingsEditor
          vertical="ristorazione"
          offerings={[{ name: HOSTILE }]}
          onChange={() => {}}
        />,
      ),
    );

    // Il payload compare come VALUE di un input (reso da React come testo, non parsato).
    expect(screen.queryByDisplayValue(HOSTILE)).not.toBeNull(); // covers: AC-202-4
    // Nessun <img> iniettato (niente innerHTML) e nessun <a>/href da avvelenare.
    expect(container.querySelector('img')).toBeNull(); // covers: AC-202-4
    expect(container.querySelector('a')).toBeNull(); // covers: AC-202-4
  });
});

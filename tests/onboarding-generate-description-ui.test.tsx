// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import { GenerateDescriptionField } from '@/ui/onboarding/GenerateDescriptionField';

// OGW-302 (macrotask generate-description) — ORACOLO del componente UI ✨ dello step
// Racconto. Le asserzioni derivano da AC-302-4 (la descrizione proposta NON entra nel brief
// senza conferma esplicita) e dalla parte UI di AC-302-3 (al cap il pulsante e' disabilitato
// con un messaggio); ognuna e' taggata `// covers: AC-302-<n>`.
//
// La chiamata all'endpoint e' INIETTATA come prop `onGenerate` (come OfferingsEditor non
// tiene stato autoritativo): il componente si prova in ISOLAMENTO, senza rete ne' rotta.
// L'integrazione nel flusso (step Racconto, onGenerate cablato al POST) e' demandata a
// wizard-shell (OGW-501), come per OfferingsEditor (§2). i18n dai cataloghi REALI, cosi' le
// asserzioni misurano la SCELTA DELLE CHIAVI del componente, non stringhe del test.

const GEN = itMessages.onboarding.generateDescription;

function wrap(ui: ReactNode) {
  return (
    <NextIntlClientProvider locale="it" messages={itMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

afterEach(cleanup);

describe('OGW-302 GenerateDescriptionField', () => {
  // covers: AC-302-4
  it('la descrizione proposta dal pulsante resta editabile e NON e\' salvata finche\' l\'utente non conferma', async () => {
    const onConfirm = vi.fn();
    const onGenerate = vi.fn(async () => ({ ok: true as const, description: 'Descrizione generata dal modello.' }));
    render(wrap(<GenerateDescriptionField value="" onConfirm={onConfirm} onGenerate={onGenerate} />));

    // when: si preme "genera"
    fireEvent.click(screen.getByRole('button', { name: GEN.generate }));

    // then: la proposta compare in un campo EDITABILE (value di textarea, reso come testo)…
    const field = await screen.findByDisplayValue('Descrizione generata dal modello.');
    expect(field).toBeTruthy(); // covers: AC-302-4
    // …ma NON e' ancora entrata nel brief: onConfirm non e' stato chiamato dalla generazione.
    expect(onConfirm).not.toHaveBeenCalled(); // covers: AC-302-4

    // l'utente MODIFICA la proposta prima di confermarla (resta editabile)
    fireEvent.change(field, { target: { value: 'Testo rivisto a mano.' } });
    expect(onConfirm).not.toHaveBeenCalled(); // covers: AC-302-4

    // CONTRO-PROVA: solo la conferma ESPLICITA salva nel brief, e col testo corrente del campo.
    fireEvent.click(screen.getByRole('button', { name: GEN.confirm }));
    expect(onConfirm).toHaveBeenCalledTimes(1); // covers: AC-302-4
    expect(onConfirm).toHaveBeenCalledWith('Testo rivisto a mano.'); // covers: AC-302-4
  });

  // covers: AC-302-3
  it('al cap del budget AI: il pulsante di generazione e\' disabilitato e compare il messaggio', async () => {
    const onGenerate = vi.fn(async () => ({ ok: true as const, description: 'x' }));
    render(wrap(<GenerateDescriptionField value="" onConfirm={() => {}} onGenerate={onGenerate} atCap />));

    // then: il pulsante e' disabilitato e premerlo non chiama l'endpoint.
    const generateButton = screen.getByRole('button', { name: GEN.generate }) as HTMLButtonElement;
    expect(generateButton.disabled).toBe(true); // covers: AC-302-3
    fireEvent.click(generateButton);
    expect(onGenerate).not.toHaveBeenCalled(); // covers: AC-302-3
    // then: il messaggio di cap raggiunto e' visibile.
    expect(screen.queryByText(GEN.capReached)).not.toBeNull(); // covers: AC-302-3
  });

  // Invariante T-151 (anti-injection): la descrizione e' output del modello / input non
  // fidato → resa SOLO in `value` di textarea (React testo, mai parsato), mai in innerHTML o
  // href. Non un AC nuovo: la stessa difesa del pannello, ri-asserita sul canale nuovo.
  it('rende il testo non fidato solo come value del campo, mai come HTML o href', () => {
    const HOSTILE = '<img src=x onerror="alert(1)">';
    const { container } = render(
      wrap(<GenerateDescriptionField value={HOSTILE} onConfirm={() => {}} onGenerate={async () => ({ ok: false as const })} />),
    );
    expect(screen.queryByDisplayValue(HOSTILE)).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });
});

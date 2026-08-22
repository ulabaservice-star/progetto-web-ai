// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import { OfferingSuggestions } from '@/ui/onboarding/OfferingSuggestions';

// OGW-402 (macrotask suggest-offerings) — ORACOLO del componente UI ✨ dei suggerimenti
// d'offerta. Le asserzioni derivano da AC-402-3 (solo la voce confermata entra nelle offerte;
// le non confermate NON entrano nel brief) e dalla parte UI del cap; ognuna e' taggata.
//
// La chiamata all'endpoint e' INIETTATA come prop `onSuggest` (come GenerateDescriptionField /
// OfferingsEditor non tengono stato autoritativo): il componente si prova in ISOLAMENTO. La
// conferma per-voce e' `onAccept`. L'integrazione nel flusso (onSuggest cablato al POST,
// onAccept che aggiorna le offerte del brief) e' demandata a wizard-shell (OGW-502). i18n dai
// cataloghi REALI, cosi' le asserzioni misurano la SCELTA DELLE CHIAVI del componente.

const SUG = itMessages.onboarding.suggestOfferings;

function wrap(ui: ReactNode) {
  return (
    <NextIntlClientProvider locale="it" messages={itMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

afterEach(cleanup);

describe('OGW-402 OfferingSuggestions', () => {
  // covers: AC-402-3
  it('conferma una voce e ne lascia altre: solo la confermata esce via onAccept, le altre no', async () => {
    const onAccept = vi.fn();
    const onSuggest = vi.fn(async () => ({
      ok: true as const,
      offerings: [
        { name: 'Margherita', section: 'Pizze' },
        { name: 'Marinara', section: 'Pizze' },
      ],
    }));
    render(wrap(<OfferingSuggestions onSuggest={onSuggest} onAccept={onAccept} />));

    // when: si preme "Suggerisci voci tipiche"
    fireEvent.click(screen.getByRole('button', { name: SUG.button }));

    // then: i suggerimenti compaiono come placeholder "esempio" (a prezzo vuoto)
    const margherita = await screen.findByText('Margherita');
    expect(margherita).toBeTruthy(); // covers: AC-402-3
    expect(screen.getByText('Marinara')).toBeTruthy(); // covers: AC-402-3
    expect(screen.getAllByText(SUG.exampleBadge).length).toBe(2); // covers: AC-402-3 — etichetta esempio
    // nessuna voce e' ancora entrata: onAccept non e' stato chiamato dalla proposta
    expect(onAccept).not.toHaveBeenCalled(); // covers: AC-402-3

    // when: si CONFERMA solo la prima voce (clic di "Aggiungi" nella sua riga)
    const margheritaRow = margherita.closest('li') as HTMLElement;
    fireEvent.click(within(margheritaRow).getByRole('button', { name: SUG.add }));

    // then: SOLO la voce confermata esce, con name+section, prezzo assente
    expect(onAccept).toHaveBeenCalledTimes(1); // covers: AC-402-3
    expect(onAccept).toHaveBeenCalledWith({ name: 'Margherita', section: 'Pizze' }); // covers: AC-402-3
    // la confermata sparisce dai suggerimenti pendenti; la NON confermata resta e non e' entrata
    expect(screen.queryByText('Margherita')).toBeNull(); // covers: AC-402-3
    expect(screen.getByText('Marinara')).toBeTruthy(); // covers: AC-402-3 — non confermata, non entrata
    expect(onAccept).toHaveBeenCalledTimes(1); // covers: AC-402-3 — mai chiamata per la seconda
  });

  // Scarto libero: una voce scartata non entra e sparisce, senza chiamare onAccept.
  it('scarta una voce: non entra e sparisce dai pendenti', async () => {
    const onAccept = vi.fn();
    const onSuggest = vi.fn(async () => ({ ok: true as const, offerings: [{ name: 'Marinara' }] }));
    render(wrap(<OfferingSuggestions onSuggest={onSuggest} onAccept={onAccept} />));
    fireEvent.click(screen.getByRole('button', { name: SUG.button }));
    const row = (await screen.findByText('Marinara')).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: SUG.discard }));
    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.queryByText('Marinara')).toBeNull();
  });

  // Parte UI del cap: al cap il pulsante e' disabilitato e non chiama l'endpoint (la difesa
  // autoritativa resta il 429 dell'endpoint).
  it('al cap del budget AI: il pulsante e\' disabilitato e compare il messaggio', () => {
    const onSuggest = vi.fn(async () => ({ ok: true as const, offerings: [] }));
    render(wrap(<OfferingSuggestions onSuggest={onSuggest} onAccept={() => {}} atCap />));
    const button = screen.getByRole('button', { name: SUG.button }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onSuggest).not.toHaveBeenCalled();
    expect(screen.queryByText(SUG.capReached)).not.toBeNull();
  });

  // Invariante T-151 (anti-injection): il nome del suggerimento e' output del modello / input
  // non fidato -> reso SOLO come nodo di testo, mai in innerHTML o href.
  it('rende il testo non fidato solo come testo, mai come HTML o href', async () => {
    const HOSTILE = '<img src=x onerror="alert(1)">';
    const onSuggest = vi.fn(async () => ({ ok: true as const, offerings: [{ name: HOSTILE }] }));
    const { container } = render(wrap(<OfferingSuggestions onSuggest={onSuggest} onAccept={() => {}} />));
    fireEvent.click(screen.getByRole('button', { name: SUG.button }));
    expect(await screen.findByText(HOSTILE)).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  // Fallimento della chiamata iniettata: messaggio d'errore, nessun suggerimento, nessun onAccept.
  it('onSuggest fallisce: mostra l\'errore e non propone nulla', async () => {
    const onAccept = vi.fn();
    const onSuggest = vi.fn(async () => ({ ok: false as const }));
    render(wrap(<OfferingSuggestions onSuggest={onSuggest} onAccept={onAccept} />));
    fireEvent.click(screen.getByRole('button', { name: SUG.button }));
    expect(await screen.findByText(SUG.error)).toBeTruthy();
    expect(onAccept).not.toHaveBeenCalled();
  });
});

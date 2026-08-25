// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';

// OGW-502 (macrotask wizard-shell) — ORACOLO d'INTEGRAZIONE del wizard completo. Le asserzioni
// derivano da AC-502-1..3 di 05-wizard-shell.md; ognuna e' taggata `// covers: AC-502-<n>`.
// (AC-502-4 = i due percorsi end-to-end in Chromium, e2e/onboarding-wizard.spec.ts.)
//
// Cosa si mocka e perche' NON e' hollow:
//  - `@/ui/onboarding/ai-calls`: il confine client verso gli endpoint AI (fetch). Mockarlo pilota
//    l'esito ✨ SENZA rete, ma il WIRING reale (lo step chiama requestDescription/requestOffering-
//    Suggestions e ne rende l'esito) resta esercitato — e' cio' che AC-502-1 verifica.
//  - `@/data/briefs` upsertBrief/confirmBrief: server action (RLS/cookies) non eseguibili in jsdom;
//    pilotano l'esito. upsertBrief e' il seam del persist-on-Advance; confirmBrief della conferma.
//  - `next/navigation` useRouter: si spia il redirect a /generate dopo la conferma (AC-502-3).
//  - NON si mocka next-intl: le stringhe vengono dai cataloghi REALI, cosi' le asserzioni misurano
//    la scelta delle chiavi dei componenti composti.

const requestDescription = vi.hoisted(() => vi.fn());
const requestOfferingSuggestions = vi.hoisted(() => vi.fn());
// Si sovrascrivono SOLO le due chiamate di rete; `withAtCap` (adattatore puro, niente rete) resta
// quello REALE, cosi' il wiring atCap degli step e' esercitato sul codice di produzione.
vi.mock('@/ui/onboarding/ai-calls', async (importActual) => ({
  ...(await importActual<typeof import('@/ui/onboarding/ai-calls')>()),
  requestDescription,
  requestOfferingSuggestions,
}));

const upsertBrief = vi.hoisted(() => vi.fn());
const confirmBrief = vi.hoisted(() => vi.fn());
vi.mock('@/data/briefs', () => ({ upsertBrief, confirmBrief }));

const importBriefFromUrl = vi.hoisted(() => vi.fn());
vi.mock('@/data/import', () => ({ importBriefFromUrl }));

const routerPush = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPush }) }));

// Import DOPO i mock.
import { OnboardingWorkspace } from '@/ui/onboarding/OnboardingWorkspace';
import { makeWizardReducer, initWizardState } from '@/ui/onboarding/wizard/wizard-reducer';
import { emptyBrief, type Brief } from '@/domain/onboarding/brief';

const SITE_ID = 'site-1';
const o = itMessages.onboarding;
const w = o.wizard;
const GEN = o.generateDescription;
const OFF = o.offerings;
const SUG = o.suggestOfferings;
const V = o.verticals;
const G = o.goals;

function wrap(ui: ReactNode) {
  return render(<NextIntlClientProvider locale="it" messages={itMessages}>{ui}</NextIntlClientProvider>);
}

beforeEach(() => {
  requestDescription.mockReset();
  requestOfferingSuggestions.mockReset();
  upsertBrief.mockReset().mockResolvedValue({ ok: true, complete: false });
  confirmBrief.mockReset().mockResolvedValue({ ok: true });
  importBriefFromUrl.mockReset();
  routerPush.mockReset();
});
afterEach(cleanup);

async function proceedToBase(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: w.entry.continue }));
  await screen.findByLabelText(w.base.name);
}
async function clickNextTo(user: ReturnType<typeof userEvent.setup>, heading: string) {
  await user.click(screen.getByRole('button', { name: w.nav.next }));
  await screen.findByRole('heading', { name: heading });
}

describe('wizard integrato — step AI e review->genera', () => {
  it('AC-502-1: lo step Racconto espone ✨ genera-descrizione, lo step Offerte OfferingsEditor + ✨ suggerisci', async () => {
    const user = userEvent.setup();
    requestDescription.mockResolvedValue({ ok: true, value: 'Trattoria romana dal 1980.' });
    requestOfferingSuggestions.mockResolvedValue({ ok: true, value: [{ name: 'Carbonara', section: 'Primi' }] });
    wrap(<OnboardingWorkspace siteId={SITE_ID} initialBrief={emptyBrief('it')} />);

    // --- Racconto ---
    await proceedToBase(user);
    await clickNextTo(user, w.steps.story);
    // Il ✨ genera-descrizione e' esposto e CABLATO all'endpoint (iniettato): un click lo chiama e
    // ne rende l'esito editabile.
    expect(screen.getByRole('button', { name: GEN.generate })).toBeTruthy(); // covers: AC-502-1
    await user.type(screen.getByLabelText(GEN.label), 'trattoria romana');
    await user.click(screen.getByRole('button', { name: GEN.regenerate }));
    await screen.findByDisplayValue('Trattoria romana dal 1980.'); // covers: AC-502-1
    expect(requestDescription).toHaveBeenCalledWith(SITE_ID, 'trattoria romana');

    // --- Offerte ---
    await clickNextTo(user, w.steps.offerings);
    expect(screen.getByRole('button', { name: OFF.add })).toBeTruthy(); // OfferingsEditor // covers: AC-502-1
    expect(screen.getByRole('button', { name: SUG.button })).toBeTruthy(); // ✨ suggerisci // covers: AC-502-1
    // Il ✨ suggerisci e' cablato: un click propone voci-esempio a prezzo vuoto.
    await user.click(screen.getByRole('button', { name: SUG.button }));
    expect(await screen.findByText('Carbonara')).toBeTruthy(); // covers: AC-502-1
    expect(requestOfferingSuggestions).toHaveBeenCalledWith(SITE_ID);
  });

  it('AC-502-2: la review mostra tutti i campi raccolti attraverso gli step, editabili', async () => {
    const user = userEvent.setup();
    requestDescription.mockResolvedValue({ ok: true, value: 'Cucina casalinga romana.' });
    wrap(<OnboardingWorkspace siteId={SITE_ID} initialBrief={emptyBrief('it')} />);

    // Base: nome + tipo + obiettivo
    await proceedToBase(user);
    await user.type(screen.getByLabelText(w.base.name), 'Bar Sole');
    await user.click(screen.getByRole('button', { name: V.ristorazione }));
    await user.click(screen.getByRole('button', { name: G.prenota }));

    // Racconto: genera + conferma la descrizione (entra nel brief solo su conferma)
    await clickNextTo(user, w.steps.story);
    await user.click(screen.getByRole('button', { name: GEN.generate }));
    await screen.findByDisplayValue('Cucina casalinga romana.');
    await user.click(screen.getByRole('button', { name: GEN.confirm }));

    // Offerte: aggiungi una voce e dàlle un nome
    await clickNextTo(user, w.steps.offerings);
    await user.click(screen.getByRole('button', { name: OFF.add }));
    await user.type(screen.getByLabelText(OFF.name), 'Carbonara');

    // Contatti&orari: telefono + un giorno di apertura
    await clickNextTo(user, w.steps.contacts);
    await user.type(screen.getByLabelText(o.fields.phone), '06 1234567');
    await user.click(screen.getByRole('button', { name: o.panel.hoursAdd }));
    await user.type(screen.getByLabelText('Giorno 1'), 'lun-ven');

    // Rivedi: tutti i campi raccolti sono presenti ed EDITABILI (input con quei valori)
    await clickNextTo(user, w.steps.review);
    expect(screen.getByDisplayValue('Bar Sole')).toBeTruthy(); // base // covers: AC-502-2
    expect(screen.getByDisplayValue('Cucina casalinga romana.')).toBeTruthy(); // descrizione // covers: AC-502-2
    expect(screen.getByDisplayValue('Carbonara')).toBeTruthy(); // offerte // covers: AC-502-2
    expect(screen.getByDisplayValue('06 1234567')).toBeTruthy(); // contatti // covers: AC-502-2
    expect(screen.getByDisplayValue('lun-ven')).toBeTruthy(); // orari // covers: AC-502-2
  });

  it('AC-502-3: da review, Conferma avvia il percorso /generate col brief salvato', async () => {
    const user = userEvent.setup();
    const full: Brief = {
      ...emptyBrief('it'),
      business_name: 'Trattoria Rosa',
      vertical: 'ristorazione',
      primary_goal: 'prenota',
    };
    wrap(<OnboardingWorkspace siteId={SITE_ID} initialBrief={full} />);

    await proceedToBase(user);
    await clickNextTo(user, w.steps.story);
    await clickNextTo(user, w.steps.offerings);
    await clickNextTo(user, w.steps.contacts);
    await clickNextTo(user, w.steps.review);

    // Conferma esplicita a due passi (ReviewConfirm): arma, poi conferma.
    await user.click(screen.getByRole('button', { name: o.review.confirm }));
    await user.click(screen.getByRole('button', { name: o.review.confirmYes }));

    expect(confirmBrief).toHaveBeenCalledWith(SITE_ID); // covers: AC-502-3
    // La conferma porta a /generate (percorso INVARIATO), destinazione interna costruita da noi.
    expect(routerPush).toHaveBeenCalledWith(`/it/generate/${SITE_ID}`); // covers: AC-502-3
  });
});

// OGW-502 security_notes: "nessun testo non fidato in innerHTML/href". Chiude il gap dichiarato in
// OGW-501 (anti-injection di offerte/orari/descrizione rimandata a OGW-502): un brief ostile
// attraversa i rich-step senza generare markup vivo. Continuita' di T-151.
describe('wizard integrato — anti-injection nei rich-step', () => {
  const HOSTILE = '<img src=x onerror="document.title=1"><a href="javascript:alert(1)">x</a>Ostile';

  it('un brief ostile attraversa Racconto/Offerte/Contatti senza generare img/script/href/src', async () => {
    const user = userEvent.setup();
    const hostile: Brief = {
      ...emptyBrief('it'),
      business_name: 'Bar',
      vertical: 'ristorazione',
      primary_goal: 'prenota',
      description: HOSTILE,
      hours: { lun: HOSTILE },
      content: { offerings: [{ name: HOSTILE, section: HOSTILE }], social_links: [], highlights: [] },
    };
    const { container } = wrap(<OnboardingWorkspace siteId={SITE_ID} initialBrief={hostile} />);

    const assertConfined = () => {
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('[src]')).toBeNull();
      expect(container.querySelector('a[href*="javascript:"]')).toBeNull();
    };

    await proceedToBase(user);
    await clickNextTo(user, w.steps.story);
    expect(screen.getByDisplayValue(HOSTILE)).toBeTruthy(); // descrizione nel value, mai parsata
    assertConfined();

    await clickNextTo(user, w.steps.offerings);
    expect(screen.getAllByDisplayValue(HOSTILE).length).toBeGreaterThan(0); // nome/sezione in value
    assertConfined();

    await clickNextTo(user, w.steps.contacts);
    expect(screen.getByDisplayValue(HOSTILE)).toBeTruthy(); // valore orario ostile nel value
    assertConfined();
  });
});

// Unita' pure delle azioni reducer aggiunte da OGW-502 (kill-point diretti per la mutazione).
describe('wizard-reducer OGW-502 (puro)', () => {
  const reducer = makeWizardReducer(6);

  it('setOfferings aggiorna SOLO content.offerings del draft, persisted intatto (non salva)', () => {
    const s0 = initWizardState(emptyBrief('it'));
    // draft != persisted PER RIFERIMENTO (initWizardState li parte identici): senza questo un
    // setOfferings che scrivesse `persisted = draft` resterebbe indistinguibile (falso verde).
    const dirty = reducer(s0, { type: 'patchCore', patch: { business_name: 'Bar' } });
    const offerings = [{ name: 'Carbonara' }];
    const s1 = reducer(dirty, { type: 'setOfferings', offerings });
    expect(s1.draft.content.offerings).toEqual(offerings);
    expect(s1.draft.content.social_links).toEqual(s0.draft.content.social_links);
    expect(s1.persisted).toBe(s0.persisted); // persisted resta l'ORIGINALE, mai il draft
  });

  it('markSaved porta persisted allo snapshot salvato, senza toccare il draft', () => {
    const s0 = initWizardState(emptyBrief('it'));
    const dirty = reducer(s0, { type: 'patchCore', patch: { business_name: 'Bar Sole' } });
    const saved = reducer(dirty, { type: 'markSaved', brief: dirty.draft });
    expect(saved.persisted).toBe(dirty.draft);
    expect(saved.draft).toBe(dirty.draft);
  });
});

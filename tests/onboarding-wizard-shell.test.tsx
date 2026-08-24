// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';

// OGW-501 (macrotask wizard-shell) — ORACOLO del guscio wizard. Le asserzioni derivano da
// AC-501-1..4 di 05-wizard-shell.md; ognuna e' taggata `// covers: AC-501-<n>`.
//
// Cosa si mocka e perche' NON e' hollow:
//  - `@/data/import` importBriefFromUrl: la Server Action d'import (gia' gated/validata altrove).
//    E' il seam che AC-501-2 pretende mockato per pilotare una proposta a buon fine SENZA rete.
//  - NON si mocka next-intl: le stringhe si risolvono dai cataloghi REALI dentro
//    NextIntlClientProvider, cosi' le asserzioni misurano la SCELTA DELLE CHIAVI dei componenti.
//
// In OGW-501 il flusso e' PURO IN-MEMORIA: non esiste percorso di persistenza, quindi "l'import
// non salva" (AC-501-2) e "navigare non perde lo stato" (AC-501-1) sono strutturali (nessun
// upsertBrief da spiare, il reducer preserva il draft per riferimento). Il persist arriva in
// OGW-502; questo oracolo pinna che 501 NON scrive.

const importBriefFromUrl = vi.hoisted(() => vi.fn());
vi.mock('@/data/import', () => ({ importBriefFromUrl }));

// Import DOPO i mock (vi.mock/vi.hoisted sono issati).
import { OnboardingWorkspace } from '@/ui/onboarding/OnboardingWorkspace';
import { WIZARD_STEPS } from '@/ui/onboarding/wizard/steps';
import { makeWizardReducer, initWizardState } from '@/ui/onboarding/wizard/wizard-reducer';
import { wizardReadiness } from '@/ui/onboarding/wizard/readiness';
import { emptyBrief, isBriefComplete, type Brief } from '@/domain/onboarding/brief';

const SITE_ID = 'site-1';
const w = itMessages.onboarding.wizard;
const V = itMessages.onboarding.verticals;
const G = itMessages.onboarding.goals;

function wrap(ui: ReactNode) {
  return render(<NextIntlClientProvider locale="it" messages={itMessages}>{ui}</NextIntlClientProvider>);
}

beforeEach(() => {
  importBriefFromUrl.mockReset();
});
afterEach(cleanup);

// ---------------------------------------------------------------------------
// Logica pura del reducer e della readiness (mutation-friendly).
// ---------------------------------------------------------------------------
describe('wizard-reducer (puro)', () => {
  const reducer = makeWizardReducer(3);

  it('goNext avanza e satura all ultimo step; goBack satura a 0', () => {
    const s0 = initWizardState(emptyBrief('it'));
    const s1 = reducer(s0, { type: 'goNext' });
    const s2 = reducer(s1, { type: 'goNext' });
    const s3 = reducer(s2, { type: 'goNext' });
    expect([s1.stepIndex, s2.stepIndex, s3.stepIndex]).toEqual([1, 2, 2]);
    const back = reducer(reducer(s1, { type: 'goBack' }), { type: 'goBack' });
    expect(back.stepIndex).toBe(0);
  });

  it('la navigazione NON tocca i dati: draft e persisted restano lo STESSO riferimento', () => {
    const s0 = initWizardState(emptyBrief('it'));
    const s1 = reducer(s0, { type: 'goNext' });
    // Se goNext ricostruisse il draft, "navigare preserva lo stato" cadrebbe: lo pinniamo per identita'.
    expect(s1.draft).toBe(s0.draft); // covers: AC-501-1
    expect(s1.persisted).toBe(s0.persisted);
  });

  it('applyProposal fonde SOLO nel draft (persisted invariato) e non cambia il locale del sito', () => {
    const s0 = initWizardState(emptyBrief('it'));
    const proposal: Brief = { ...emptyBrief('es'), business_name: 'Trattoria Rosa', vertical: 'ristorazione' };
    const s1 = reducer(s0, { type: 'applyProposal', proposal });
    expect(s1.draft.business_name).toBe('Trattoria Rosa'); // covers: AC-501-2
    expect(s1.draft.vertical).toBe('ristorazione');
    expect(s1.draft.locale).toBe('it'); // il locale e' del sito, mai della proposta (T-151)
    expect(s1.persisted).toBe(s0.persisted); // l import NON salva: persisted intatto // covers: AC-501-2
  });

  it('patchCore aggiorna un campo core del draft', () => {
    const s0 = initWizardState(emptyBrief('it'));
    const s1 = reducer(s0, { type: 'patchCore', patch: { vertical: 'fitness' } });
    expect(s1.draft.vertical).toBe('fitness'); // covers: AC-501-3
  });
});

describe('wizardReadiness (puro)', () => {
  it('un brief senza nome/obiettivo NON e pronto e nomina i campi minimi mancanti', () => {
    const r = wizardReadiness(emptyBrief('it'));
    expect(r.ready).toBe(false);
    expect(r.missing).toContain('business_name'); // covers: AC-501-4
    expect(r.missing).toContain('primary_goal'); // covers: AC-501-4
  });

  it('ready coincide con isBriefComplete (il locale e sempre presente in un Brief valido)', () => {
    const empty = emptyBrief('it');
    const full: Brief = { ...empty, business_name: 'Bar Sole', vertical: 'ristorazione', primary_goal: 'ordina' };
    expect(wizardReadiness(empty).ready).toBe(isBriefComplete(empty));
    expect(wizardReadiness(full).ready).toBe(isBriefComplete(full));
    expect(wizardReadiness(full).ready).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integrazione UI del guscio.
// ---------------------------------------------------------------------------
async function proceedToBase(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: w.entry.continue }));
}

async function advanceToReview(user: ReturnType<typeof userEvent.setup>) {
  await proceedToBase(user);
  // base -> story -> offerings -> contacts -> review: 4 "Avanti"
  for (let i = 0; i < 4; i += 1) {
    await user.click(screen.getByRole('button', { name: w.nav.next }));
  }
}

describe('T-wizard il guscio naviga e conserva lo stato', () => {
  it('AC-501-1: il nome scritto in Base sopravvive a Avanti + Indietro', async () => {
    const user = userEvent.setup();
    wrap(<OnboardingWorkspace siteId={SITE_ID} initialBrief={emptyBrief('it')} />);

    await proceedToBase(user);
    await user.type(screen.getByLabelText(w.base.name), 'Bar Sole');
    await user.click(screen.getByRole('button', { name: w.nav.next })); // -> story
    await user.click(screen.getByRole('button', { name: w.nav.back })); // -> base

    const name = screen.getByLabelText(w.base.name) as HTMLInputElement;
    expect(name.value).toBe('Bar Sole'); // covers: AC-501-1
  });

  it('AC-501-2: un import a buon fine pre-compila il draft come proposta, senza salvare', async () => {
    const user = userEvent.setup();
    const proposal: Brief = { ...emptyBrief('it'), business_name: 'Trattoria Rosa', vertical: 'ristorazione' };
    importBriefFromUrl.mockResolvedValue({ ok: true, brief: proposal });
    wrap(<OnboardingWorkspace siteId={SITE_ID} initialBrief={emptyBrief('it')} />);

    await user.type(screen.getByLabelText(itMessages.onboarding.import.url), 'https://example.com');
    await user.click(screen.getByRole('button', { name: itMessages.onboarding.import.submit }));
    await waitFor(() => expect(importBriefFromUrl).toHaveBeenCalledTimes(1));

    await proceedToBase(user);
    expect((screen.getByLabelText(w.base.name) as HTMLInputElement).value).toBe('Trattoria Rosa'); // covers: AC-501-2
    expect(
      screen.getByRole('button', { name: V.ristorazione }).getAttribute('aria-pressed'),
    ).toBe('true'); // covers: AC-501-2
  });

  it('AC-501-3: i bottoni tipo/obiettivo settano vertical/primary_goal dall allowlist (aria-pressed)', async () => {
    const user = userEvent.setup();
    wrap(<OnboardingWorkspace siteId={SITE_ID} initialBrief={emptyBrief('it')} />);

    await proceedToBase(user);
    await user.click(screen.getByRole('button', { name: V.ristorazione }));
    await user.click(screen.getByRole('button', { name: G.prenota }));

    expect(screen.getByRole('button', { name: V.ristorazione }).getAttribute('aria-pressed')).toBe('true'); // covers: AC-501-3
    expect(screen.getByRole('button', { name: G.prenota }).getAttribute('aria-pressed')).toBe('true'); // covers: AC-501-3
    // una scelta non fatta resta non premuta
    expect(screen.getByRole('button', { name: V.fitness }).getAttribute('aria-pressed')).toBe('false');
  });

  it('AC-501-4: senza un campo minimo la CTA Genera e disabilitata e la UI nomina cosa manca', async () => {
    const user = userEvent.setup();
    wrap(<OnboardingWorkspace siteId={SITE_ID} initialBrief={emptyBrief('it')} />);

    await advanceToReview(user);
    const generate = screen.getByRole('button', { name: w.nav.generate }) as HTMLButtonElement;
    expect(generate.disabled).toBe(true); // covers: AC-501-4
    expect(screen.getByRole('status').textContent).toContain(w.missing.business_name); // covers: AC-501-4
    expect(screen.getByRole('status').textContent).toContain(w.missing.primary_goal); // covers: AC-501-4
  });

  it('AC-501-4: con nome+tipo+obiettivo la CTA Genera e disponibile', async () => {
    const user = userEvent.setup();
    const full: Brief = {
      ...emptyBrief('it'),
      business_name: 'Trattoria Rosa',
      vertical: 'ristorazione',
      primary_goal: 'ordina',
    };
    wrap(<OnboardingWorkspace siteId={SITE_ID} initialBrief={full} />);

    await advanceToReview(user);
    const generate = screen.getByRole('button', { name: w.nav.generate }) as HTMLButtonElement;
    expect(generate.disabled).toBe(false); // covers: AC-501-4
  });
});

// Ancora di sanita': la config espone i sei step attesi, in ordine.
describe('WIZARD_STEPS', () => {
  it('dichiara i sei step del flusso, in ordine', () => {
    expect(WIZARD_STEPS.map((s) => s.id)).toEqual([
      'entry',
      'base',
      'story',
      'offerings',
      'contacts',
      'review',
    ]);
  });
});

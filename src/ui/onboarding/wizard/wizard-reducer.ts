import type { Brief } from '@/domain/onboarding/brief';
import { mergeProposal } from '@/ui/onboarding/wizard/proposal';

// OGW-501 (macrotask wizard-shell) — lo STATO del wizard come reducer PURO, unica sede dello
// stato condiviso (come lo era OnboardingWorkspace per chat+pannello). Tre campi:
//  - `draft`  = la VISTA: cio' che l'utente vede e modifica, dove entra il pre-riempimento di un
//               import (che NON e' salvato). Le azioni di navigazione lo lasciano PER RIFERIMENTO,
//               quindi "navigare non perde lo stato" (AC-501-1) e' irrappresentabile, non un
//               invariante da testare a mano.
//  - `persisted` = cio' che il DB contiene: base del diff (T-123). In OGW-501 non cambia mai (gli
//               step non scrivono ancora); `markSaved` di OGW-502 vi fondera' le patch salvate.
//  - `stepIndex` = il passo corrente in una config ordinata di step (steps.tsx).
// La distinzione draft/persisted e' quella gia' deliberata in T-151: applyProposal tocca SOLO
// `draft`, cosi' l'import non "salva" nemmeno nello stato.

export type WizardState = {
  draft: Brief;
  persisted: Brief;
  stepIndex: number;
};

// I campi CORE che gli step del wizard settano direttamente sul draft: i top-level del Brief,
// mai `content` (le collezioni hanno azioni loro in OGW-502) ne' `locale` (proprieta' del sito,
// immutabile — escluderlo dal tipo lo rende non-settabile per costruzione, come in ProposalCore).
type CorePatch = Partial<Omit<Brief, 'content' | 'locale'>>;

export type WizardAction =
  | { type: 'applyProposal'; proposal: Brief }
  | { type: 'patchCore'; patch: CorePatch }
  | { type: 'goNext' }
  | { type: 'goBack' }
  | { type: 'goTo'; stepIndex: number };

export function initWizardState(initialBrief: Brief): WizardState {
  return { draft: initialBrief, persisted: initialBrief, stepIndex: 0 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Factory: `stepCount` chiude la navigazione entro i limiti della config (un reducer di
// useReducer prende solo (state, action), quindi il numero di step si lega qui). Puro e
// unit-testabile: `makeWizardReducer(n)(state, action)`.
export function makeWizardReducer(stepCount: number) {
  const lastIndex = Math.max(stepCount - 1, 0);
  return function wizardReducer(state: WizardState, action: WizardAction): WizardState {
    switch (action.type) {
      case 'applyProposal':
        // Solo il draft: l'import propone, non salva (persisted resta la base del diff).
        return { ...state, draft: mergeProposal(state.draft, action.proposal) };
      case 'patchCore':
        return { ...state, draft: { ...state.draft, ...action.patch } };
      case 'goNext':
        // draft e persisted restano per riferimento: la navigazione non tocca i dati.
        return { ...state, stepIndex: clamp(state.stepIndex + 1, 0, lastIndex) };
      case 'goBack':
        return { ...state, stepIndex: clamp(state.stepIndex - 1, 0, lastIndex) };
      case 'goTo':
        return { ...state, stepIndex: clamp(action.stepIndex, 0, lastIndex) };
    }
  };
}

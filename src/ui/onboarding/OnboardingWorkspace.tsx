'use client';

import { useReducer } from 'react';
import { useTranslations } from 'next-intl';
import type { Brief } from '@/domain/onboarding/brief';
import { WIZARD_STEPS } from '@/ui/onboarding/wizard/steps';
import { initWizardState, makeWizardReducer } from '@/ui/onboarding/wizard/wizard-reducer';
import { WizardNav } from '@/ui/onboarding/wizard/WizardNav';

// OGW-501 (macrotask wizard-shell) — RISCRITTURA IN LOCO: da onboarding chat-led a WIZARD guidato
// a step (OGW-D1: l'onboarding non e' piu' conversazionale, l'AI e' on-demand). Questo resta
// l'unica sede dello stato condiviso, ora un reducer puro (wizard-reducer.ts) invece di una
// manciata di useState. Non monta piu' la chat ne' il pannello brief: ChatPanel.tsx e
// BriefPanel.tsx sono ELIMINATI (orfanati dalla riscrittura), mentre il DOMINIO chat
// (interview.ts) e l'endpoint POST /turn restano in repo finche' OGW-601 non li rimuove.
// Import e generazione INVARIATI.
//
// La distinzione draft (vista) / persisted (DB) di T-151 sopravvive nel reducer, e con essa
// l'invariante "l'import PROPONE, non salva" (applyProposal tocca solo il draft). mergeProposal
// vive ora in wizard/proposal.ts, riusata verbatim.
//
// `siteId` entra nel flusso con OGW-502 (fetch degli endpoint AI e redirect a /generate): in
// OGW-501 il percorso e' puro in-memoria, quindi la prop c'e' nel contratto ma non e' ancora usata.

const reducer = makeWizardReducer(WIZARD_STEPS.length);

type OnboardingWorkspaceProps = {
  siteId: string;
  initialBrief: Brief;
};

export function OnboardingWorkspace({ initialBrief }: OnboardingWorkspaceProps) {
  const t = useTranslations('onboarding');
  const [state, dispatch] = useReducer(reducer, initialBrief, initWizardState);
  const step = WIZARD_STEPS[state.stepIndex];
  const StepComponent = step.Component;

  return (
    <div className="flex flex-col gap-lg">
      <h2 className="text-md font-semibold text-foreground">{t(`wizard.steps.${step.id}`)}</h2>
      <StepComponent draft={state.draft} dispatch={dispatch} />
      <WizardNav
        draft={state.draft}
        stepIndex={state.stepIndex}
        stepCount={WIZARD_STEPS.length}
        canSkip={step.canSkip}
        dispatch={dispatch}
      />
    </div>
  );
}

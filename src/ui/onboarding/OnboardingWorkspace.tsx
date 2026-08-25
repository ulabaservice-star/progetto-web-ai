'use client';

import { useReducer, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Brief } from '@/domain/onboarding/brief';
import { upsertBrief } from '@/data/briefs';
import { WIZARD_STEPS } from '@/ui/onboarding/wizard/steps';
import { initWizardState, makeWizardReducer } from '@/ui/onboarding/wizard/wizard-reducer';
import { WizardNav } from '@/ui/onboarding/wizard/WizardNav';
import { briefDiff } from '@/ui/onboarding/wizard/brief-diff';

// OGW-501/502 (macrotask wizard-shell) — RISCRITTURA IN LOCO: da onboarding chat-led a WIZARD
// guidato a step (OGW-D1). Unica sede dello stato condiviso (reducer puro). Non monta piu' la
// chat ne' il pannello brief (ChatPanel/BriefPanel ELIMINATI; interview.ts + POST /turn restano
// finche' OGW-601 non li rimuove). La distinzione draft (vista) / persisted (DB) di T-151 vive nel
// reducer, e con essa l'invariante "l'import PROPONE, non salva".
//
// OGW-502 — ORCHESTRAZIONE:
//  - persist-on-Advance: a ogni «Avanti»/«Salta» si salva il DIFF (briefDiff) del draft rispetto
//    al persistito e si aggiorna la base (markSaved). Serve perche' gli endpoint AI e /generate
//    leggono il brief PERSISTITO (body strict), non il draft in memoria. Best-effort: se il
//    salvataggio fallisce si avanza comunque (il draft resta) e un avviso non bloccante lo dichiara.
//  - `atCap`: un 429 da una chiamata AI (budget esaurito) alza questo flag, che disabilita i ✨.
//  - `siteId` ora e' nel flusso (endpoint AI + redirect a /generate dallo step Rivedi).

const reducer = makeWizardReducer(WIZARD_STEPS.length);

type OnboardingWorkspaceProps = {
  siteId: string;
  initialBrief: Brief;
};

export function OnboardingWorkspace({ siteId, initialBrief }: OnboardingWorkspaceProps) {
  const t = useTranslations('onboarding');
  const [state, dispatch] = useReducer(reducer, initialBrief, initWizardState);
  const [atCap, setAtCap] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const step = WIZARD_STEPS[state.stepIndex];
  const StepComponent = step.Component;

  // persist-on-Advance: salva il diff, poi naviga. Lo snapshot del draft e' catturato PRIMA della
  // POST e passato a markSaved, cosi' una battitura arrivata durante la richiesta non viene marcata
  // come salvata. Patch vuota (niente di cambiato) -> nessuna richiesta, si naviga e basta.
  async function advance() {
    const snapshot = state.draft;
    const patch = briefDiff(state.persisted, snapshot);
    if (Object.keys(patch).length > 0) {
      setSaveFailed(false);
      const result = await upsertBrief(siteId, patch);
      if (result.ok) dispatch({ type: 'markSaved', brief: snapshot });
      else setSaveFailed(true);
    }
    dispatch({ type: 'goNext' });
  }

  return (
    <div className="flex flex-col gap-lg">
      <h2 className="text-md font-semibold text-foreground">{t(`wizard.steps.${step.id}`)}</h2>
      <StepComponent
        draft={state.draft}
        persisted={state.persisted}
        dispatch={dispatch}
        siteId={siteId}
        atCap={atCap}
        onAtCap={() => setAtCap(true)}
      />
      {saveFailed && (
        <p role="alert" className="text-sm font-medium text-foreground">
          {t('panel.saveError')}
        </p>
      )}
      <WizardNav
        draft={state.draft}
        stepIndex={state.stepIndex}
        stepCount={WIZARD_STEPS.length}
        canSkip={step.canSkip}
        dispatch={dispatch}
        onAdvance={advance}
      />
    </div>
  );
}

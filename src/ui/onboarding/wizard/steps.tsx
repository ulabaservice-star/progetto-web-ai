import type { ComponentType, Dispatch } from 'react';
import type { Brief } from '@/domain/onboarding/brief';
import type { WizardAction } from '@/ui/onboarding/wizard/wizard-reducer';
import { StepEntry } from '@/ui/onboarding/wizard/StepEntry';
import { StepBase } from '@/ui/onboarding/wizard/StepBase';
import { StepPlaceholder } from '@/ui/onboarding/wizard/StepPlaceholder';

// OGW-501 (macrotask wizard-shell) — la CONFIG dichiarativa degli step. Il guscio rende
// `WIZARD_STEPS[stepIndex].Component`: aggiungere o riordinare uno step e' un edit di questo
// array, non un intervento sulla navigazione (e' il confine su cui OGW-502 innesta gli step
// AI/Contatti/Review al posto dei placeholder, senza toccare il guscio).
//
// In OGW-501 sono reali solo Ingresso e Base (il flusso e' puro in-memoria); Racconto, Offerte,
// Contatti&orari e Rivedi sono `StepPlaceholder` — dichiarati con `id`/`canSkip` definitivi, cosi'
// la navigazione e la readiness (che vive nel guscio/WizardNav) sono gia' complete e testabili
// end-to-end fra gli step. Il titolo di uno step si deriva dall'`id` (`wizard.steps.<id>`), quindi
// non c'e' una chiave i18n da tenere in sincrono nella config.

type StepComponentProps = {
  draft: Brief;
  dispatch: Dispatch<WizardAction>;
};

type WizardStepId = 'entry' | 'base' | 'story' | 'offerings' | 'contacts' | 'review';

export type WizardStep = {
  id: WizardStepId;
  // "Salta" e' offerto solo sui passi non essenziali (P1: il minimo per generare resta basso).
  canSkip: boolean;
  Component: ComponentType<StepComponentProps>;
};

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'entry', canSkip: false, Component: StepEntry },
  { id: 'base', canSkip: false, Component: StepBase },
  { id: 'story', canSkip: true, Component: StepPlaceholder },
  { id: 'offerings', canSkip: true, Component: StepPlaceholder },
  { id: 'contacts', canSkip: true, Component: StepPlaceholder },
  { id: 'review', canSkip: false, Component: StepPlaceholder },
];

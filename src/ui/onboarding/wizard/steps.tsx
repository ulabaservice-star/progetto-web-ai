import type { ComponentType } from 'react';
import type { StepComponentProps } from '@/ui/onboarding/wizard/step-props';
import { StepEntry } from '@/ui/onboarding/wizard/StepEntry';
import { StepBase } from '@/ui/onboarding/wizard/StepBase';
import { StepStory } from '@/ui/onboarding/wizard/StepStory';
import { StepOfferings } from '@/ui/onboarding/wizard/StepOfferings';
import { StepContacts } from '@/ui/onboarding/wizard/StepContacts';
import { StepReview } from '@/ui/onboarding/wizard/StepReview';

// OGW-501/502 (macrotask wizard-shell) — la CONFIG dichiarativa degli step. Il guscio rende
// `WIZARD_STEPS[stepIndex].Component`: aggiungere o riordinare uno step e' un edit di questo
// array, non un intervento sulla navigazione. In OGW-502 i quattro placeholder sono sostituiti
// dai componenti reali (Racconto/Offerte/Contatti&orari/Rivedi) — il guscio non e' cambiato,
// e' cambiata solo questa tabella (piu' l'orchestrazione del persist-on-Advance nel guscio).
//
// Il titolo di uno step si deriva dall'`id` (`wizard.steps.<id>`): niente chiave i18n da tenere
// in sincrono nella config. Tutti gli step ricevono la stessa borsa `StepComponentProps` (in un
// modulo a se', step-props.ts, per non creare un ciclo con questo file) e usano cio' che serve.

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
  { id: 'story', canSkip: true, Component: StepStory },
  { id: 'offerings', canSkip: true, Component: StepOfferings },
  { id: 'contacts', canSkip: true, Component: StepContacts },
  { id: 'review', canSkip: false, Component: StepReview },
];

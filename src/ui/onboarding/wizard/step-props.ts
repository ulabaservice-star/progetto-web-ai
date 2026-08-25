import type { Dispatch } from 'react';
import type { Brief } from '@/domain/onboarding/brief';
import type { WizardAction } from '@/ui/onboarding/wizard/wizard-reducer';

// OGW-502 (macrotask wizard-shell) — il CONTRATTO DEI PROPS che il guscio passa a ogni step. Vive
// in un modulo a se' (non in steps.tsx) apposta: steps.tsx importa i componenti step, e se questi
// importassero il tipo DA steps.tsx si formerebbe un ciclo di import (che il controllo d'igiene del
// checkpoint — madge — vieta). Tutti gli step ricevono la stessa borsa di props e usano cio' che
// serve loro: entry/base solo draft+dispatch; gli step AI anche siteId + atCap (il cap 429) + onAtCap;
// review anche `persisted` (la base del diff = cio' che e' in tabella, che ReviewConfirm pretende).
export type StepComponentProps = {
  // La VISTA editabile (dove entra l'import non salvato e ogni battitura).
  draft: Brief;
  // Cio' che il DB contiene (aggiornato dal persist-on-Advance): base del diff e del recap.
  persisted: Brief;
  dispatch: Dispatch<WizardAction>;
  siteId: string;
  // Budget AI esaurito (429 da una chiamata precedente): disabilita i pulsanti ✨.
  atCap: boolean;
  // Alza `atCap` quando una chiamata AI torna 429. Chiamata dagli step AI.
  onAtCap: () => void;
};

'use client';

import { GenerateDescriptionField } from '@/ui/onboarding/GenerateDescriptionField';
import { requestDescription, withAtCap } from '@/ui/onboarding/ai-calls';
import type { StepComponentProps } from '@/ui/onboarding/wizard/step-props';

// OGW-502 (macrotask wizard-shell) — lo step "Racconta la tua attivita'": monta il campo ✨
// genera-descrizione (OGW-302), cablando la chiamata iniettata all'endpoint reale (ai-calls) e la
// conferma alla patch del brief. La descrizione e' un campo CORE -> patchCore. Il 429 (budget
// esaurito) alza `atCap` nel guscio, che disabilita il ✨.
export function StepStory({ draft, dispatch, siteId, atCap, onAtCap }: StepComponentProps) {
  const onGenerate = async (phrase: string) => {
    const r = withAtCap(await requestDescription(siteId, phrase), onAtCap);
    return r.ok ? { ok: true as const, description: r.value } : { ok: false as const };
  };

  return (
    <GenerateDescriptionField
      value={draft.description ?? ''}
      onConfirm={(description) => dispatch({ type: 'patchCore', patch: { description } })}
      onGenerate={onGenerate}
      atCap={atCap}
    />
  );
}

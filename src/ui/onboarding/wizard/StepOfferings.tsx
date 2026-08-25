'use client';

import { OfferingsEditor } from '@/ui/onboarding/OfferingsEditor';
import { OfferingSuggestions } from '@/ui/onboarding/OfferingSuggestions';
import { requestOfferingSuggestions, withAtCap } from '@/ui/onboarding/ai-calls';
import type { StepComponentProps } from '@/ui/onboarding/wizard/step-props';

// OGW-502 (macrotask wizard-shell) — lo step "Che cosa offri": l'editor delle offerte (OGW-202,
// controllato dal draft via l'azione setOfferings) accanto al pulsante ✨ "Suggerisci" (OGW-402,
// cablato all'endpoint reale). Una voce suggerita entra nelle offerte SOLO su conferma per-voce
// (onAccept), appesa alla lista corrente. Il 429 alza `atCap` nel guscio.
export function StepOfferings({ draft, dispatch, siteId, atCap, onAtCap }: StepComponentProps) {
  const offerings = draft.content.offerings;

  const onSuggest = async () => {
    const r = withAtCap(await requestOfferingSuggestions(siteId), onAtCap);
    return r.ok ? { ok: true as const, offerings: r.value } : { ok: false as const };
  };

  return (
    <div className="flex flex-col gap-lg">
      <OfferingsEditor
        vertical={draft.vertical}
        offerings={offerings}
        onChange={(next) => dispatch({ type: 'setOfferings', offerings: next })}
      />
      <OfferingSuggestions
        onSuggest={onSuggest}
        onAccept={(offering) => dispatch({ type: 'setOfferings', offerings: [...offerings, offering] })}
        atCap={atCap}
      />
    </div>
  );
}

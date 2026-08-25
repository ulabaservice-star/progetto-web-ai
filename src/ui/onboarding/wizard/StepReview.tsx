'use client';

import { ReviewConfirm } from '@/ui/onboarding/ReviewConfirm';
import type { StepComponentProps } from '@/ui/onboarding/wizard/step-props';

// OGW-502 (macrotask wizard-shell) — l'ultimo step "Rivedi e genera": monta ReviewConfirm (T-152)
// sul brief PERSISTITO (la base del diff che ReviewConfirm pretende = cio' che e' in tabella; il
// persist-on-Advance lo tiene allineato). La CONFERMA di ReviewConfirm e' il traguardo del wizard:
// con `afterConfirmHref` porta a /generate invece che alla dashboard, cosi' dopo aver confermato il
// brief l'utente arriva alla generazione (percorso /generate INVARIATO). La barra del wizard su
// questo step mostra solo "Indietro" (WizardNav non duplica la CTA finale).
export function StepReview({ persisted, siteId }: StepComponentProps) {
  return (
    <ReviewConfirm
      siteId={siteId}
      brief={persisted}
      locale={persisted.locale}
      afterConfirmHref={`/${persisted.locale}/generate/${encodeURIComponent(siteId)}`}
    />
  );
}

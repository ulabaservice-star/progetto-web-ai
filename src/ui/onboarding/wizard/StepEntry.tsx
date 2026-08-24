'use client';

import type { Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/ui/primitives';
import { UrlImportBar } from '@/ui/onboarding/UrlImportBar';
import type { Brief } from '@/domain/onboarding/brief';
import type { WizardAction } from '@/ui/onboarding/wizard/wizard-reducer';

// OGW-501 (macrotask wizard-shell) — Ingresso a DUE PORTE (P1-D5): importa da un URL esistente,
// oppure prosegui e compila a mano. L'import (UrlImportBar -> importBriefFromUrl, gia' gated e
// validato) PROPONE: la proposta entra solo nel `draft` via `applyProposal` (nessun salvataggio,
// AC-501-2). "Prosegui" avanza allo step Base (con o senza proposta) — l'avanzamento di Entry vive
// nello step, non nel WizardNav (che su Entry non mostra "Avanti", per non doppiare il controllo).

type StepEntryProps = {
  draft: Brief;
  dispatch: Dispatch<WizardAction>;
};

export function StepEntry({ dispatch }: StepEntryProps) {
  const t = useTranslations('onboarding');
  return (
    <div className="flex flex-col gap-md">
      <p className="text-sm text-muted-foreground">{t('wizard.entry.hint')}</p>
      <UrlImportBar onProposal={(proposal) => dispatch({ type: 'applyProposal', proposal })} />
      <Button type="button" onClick={() => dispatch({ type: 'goNext' })}>
        {t('wizard.entry.continue')}
      </Button>
    </div>
  );
}

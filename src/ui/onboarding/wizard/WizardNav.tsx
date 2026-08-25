'use client';

import type { Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/ui/primitives';
import type { Brief } from '@/domain/onboarding/brief';
import type { WizardAction } from '@/ui/onboarding/wizard/wizard-reducer';
import { wizardReadiness } from '@/ui/onboarding/wizard/readiness';

// OGW-501/502 (macrotask wizard-shell) — la barra di navigazione, data-driven dallo stato del
// guscio. Indietro (se non sei al primo passo), Avanti/Salta (se non sei all'ultimo).
//
// OGW-502:
//  - Avanti/Salta passano da `onAdvance` (persist-on-Advance nel guscio: salva il draft, poi
//    naviga) invece di un goNext diretto — gli endpoint AI e /generate leggono il brief PERSISTITO.
//  - Sull'ULTIMO passo (Rivedi) la barra NON mostra piu' una CTA "Genera": il traguardo e' la
//    CONFERMA di ReviewConfirm (montato dallo step), che porta a /generate. Qui resta solo
//    "Indietro" e — se il minimo non c'e' — il banner di readiness che NOMINA cosa manca. La
//    readiness AVVISA, non blocca: /generate resta il gate reale (`generatable`).

type WizardNavProps = {
  draft: Brief;
  stepIndex: number;
  stepCount: number;
  canSkip: boolean;
  dispatch: Dispatch<WizardAction>;
  // OGW-502: avanza salvando (persist-on-Advance). Il guscio la fornisce; Avanti e Salta la usano.
  onAdvance: () => void;
};

export function WizardNav({
  draft,
  stepIndex,
  stepCount,
  canSkip,
  dispatch,
  onAdvance,
}: WizardNavProps) {
  const t = useTranslations('onboarding');
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === stepCount - 1;
  const readiness = wizardReadiness(draft);

  return (
    <div className="flex flex-col gap-sm">
      {isLast && !readiness.ready && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('wizard.missing.intro')}{' '}
          {readiness.missing.map((field) => t(`wizard.missing.${field}`)).join(', ')}
        </p>
      )}
      <div className="flex flex-wrap gap-xs">
        {!isFirst && (
          <Button type="button" variant="secondary" onClick={() => dispatch({ type: 'goBack' })}>
            {t('wizard.nav.back')}
          </Button>
        )}
        {!isFirst && !isLast && (
          <Button type="button" onClick={onAdvance}>
            {t('wizard.nav.next')}
          </Button>
        )}
        {!isFirst && !isLast && canSkip && (
          <Button type="button" variant="secondary" onClick={onAdvance}>
            {t('wizard.nav.skip')}
          </Button>
        )}
      </div>
    </div>
  );
}

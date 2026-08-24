'use client';

import type { Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/ui/primitives';
import type { Brief } from '@/domain/onboarding/brief';
import type { WizardAction } from '@/ui/onboarding/wizard/wizard-reducer';
import { wizardReadiness } from '@/ui/onboarding/wizard/readiness';

// OGW-501 (macrotask wizard-shell) — la barra di navigazione, data-driven dallo stato del guscio.
// Indietro (se non sei al primo passo), Avanti (se non sei all'ultimo), Salta (solo se lo step e'
// saltabile), e sull'ultimo passo la CTA "Genera". La readiness (nome+tipo+obiettivo) NON e' il
// gate di generazione (quello e' `generatable`, server-side): qui disabilita la CTA e NOMINA cio'
// che manca (AC-501-4). Il wiring di "Genera" al redirect verso /generate arriva con OGW-502
// (`onGenerate`); in OGW-501 e' assente, quindi la CTA e' un indicatore di readiness.

type WizardNavProps = {
  draft: Brief;
  stepIndex: number;
  stepCount: number;
  canSkip: boolean;
  dispatch: Dispatch<WizardAction>;
  // OGW-502: cablata al redirect verso /generate. Assente in OGW-501.
  onGenerate?: () => void;
};

export function WizardNav({
  draft,
  stepIndex,
  stepCount,
  canSkip,
  dispatch,
  onGenerate,
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
          <Button type="button" onClick={() => dispatch({ type: 'goNext' })}>
            {t('wizard.nav.next')}
          </Button>
        )}
        {!isFirst && !isLast && canSkip && (
          <Button type="button" variant="secondary" onClick={() => dispatch({ type: 'goNext' })}>
            {t('wizard.nav.skip')}
          </Button>
        )}
        {isLast && (
          <Button type="button" disabled={!readiness.ready} onClick={() => onGenerate?.()}>
            {t('wizard.nav.generate')}
          </Button>
        )}
      </div>
    </div>
  );
}

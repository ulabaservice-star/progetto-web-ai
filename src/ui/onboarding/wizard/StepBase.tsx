'use client';

import type { Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label } from '@/ui/primitives';
import { GOAL_OPTIONS, VERTICAL_OPTIONS } from '@/ui/onboarding/brief-fields';
import type { Brief } from '@/domain/onboarding/brief';
import type { WizardAction } from '@/ui/onboarding/wizard/wizard-reducer';

// OGW-501 (macrotask wizard-shell) — step Base (essenziale, zero AI): nome + tipo + obiettivo.
// I <select> del vecchio pannello diventano BOTTONI (P1: piu' diretti). Tipo e obiettivo sono lo
// STESSO pattern (una scelta mutuamente esclusiva da un'allowlist, con `aria-pressed` a rendere
// osservabile la selezione, AC-501-3): un unico `ChoiceGroup` lo rende una volta sola, cosi'
// scriverlo due volte non e' un blocco duplicato. Ogni bottone setta il campo dall'ALLOWLIST
// (VERTICAL_OPTIONS/GOAL_OPTIONS, gia' i valori di dominio), quindi il valore non passa mai da
// input libero. Il testo non fidato dell'utente vive solo in `value` dell'Input del nome.

type StepBaseProps = {
  draft: Brief;
  dispatch: Dispatch<WizardAction>;
};

// Una scelta mutuamente esclusiva da un'allowlist, resa come bottoni: legenda, opzioni, quale e'
// selezionata, come etichettarla, cosa fare alla scelta. Il chiamante porta l'i18n (`labelFor`) e
// il dominio (`onSelect`); il gruppo non conosce ne' le chiavi ne' il reducer.
function ChoiceGroup<T extends string>({
  legend,
  options,
  selected,
  labelFor,
  onSelect,
}: {
  legend: string;
  options: readonly T[];
  selected: T | undefined;
  labelFor: (option: T) => string;
  onSelect: (option: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-xs">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-xs">
        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <Button
              key={option}
              type="button"
              variant={isSelected ? 'default' : 'secondary'}
              aria-pressed={isSelected}
              onClick={() => onSelect(option)}
            >
              {labelFor(option)}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function StepBase({ draft, dispatch }: StepBaseProps) {
  const t = useTranslations('onboarding');
  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <Label htmlFor="wizard-name">{t('wizard.base.name')}</Label>
        <Input
          id="wizard-name"
          value={draft.business_name ?? ''}
          onChange={(event) =>
            dispatch({ type: 'patchCore', patch: { business_name: event.target.value } })
          }
        />
      </div>

      <ChoiceGroup
        legend={t('fields.vertical')}
        options={VERTICAL_OPTIONS}
        selected={draft.vertical}
        labelFor={(option) => t(`verticals.${option}`)}
        onSelect={(option) => dispatch({ type: 'patchCore', patch: { vertical: option } })}
      />

      <ChoiceGroup
        legend={t('fields.primaryGoal')}
        options={GOAL_OPTIONS}
        selected={draft.primary_goal}
        labelFor={(option) => t(`goals.${option}`)}
        onSelect={(option) => dispatch({ type: 'patchCore', patch: { primary_goal: option } })}
      />
    </div>
  );
}

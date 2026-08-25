'use client';

import { useTranslations } from 'next-intl';
import { Input, Label } from '@/ui/primitives';
import { HoursEditor } from '@/ui/onboarding/HoursEditor';
import type { BriefCorePatch } from '@/ui/onboarding/brief-fields';
import type { StepComponentProps } from '@/ui/onboarding/wizard/step-props';

// OGW-502 (macrotask wizard-shell) — lo step "Contatti e orari": i campi di contatto (indirizzo,
// telefono, WhatsApp, email — tutti CORE, patchCore) e il widget orari ricreato (HoursEditor).
// Nessuna chiamata AI qui.
//
// Sicurezza (T-151): i valori sono resi solo in `value` di <input> (mai in href/innerHTML). Le
// etichette dei campi vengono da chiavi i18n FISSE, non dal valore.

// I campi di contatto e la chiave i18n della loro etichetta, in una sola sede. `as const` rende
// `labelKey` una chiave i18n LETTERALE (next-intl tipizza `t()`: vuole una chiave nota, non
// `string`) e `name` un letterale che e' anche chiave di BriefCorePatch e di Brief.
const CONTACT_FIELDS = [
  ['address', 'fields.address'],
  ['phone', 'fields.phone'],
  ['whatsapp', 'fields.whatsapp'],
  ['email', 'fields.email'],
] as const;

export function StepContacts({ draft, dispatch }: StepComponentProps) {
  const t = useTranslations('onboarding');

  return (
    <div className="flex flex-col gap-md">
      {CONTACT_FIELDS.map(([name, labelKey]) => (
        <div key={name} className="flex flex-col gap-xs">
          <Label htmlFor={`contact-${name}`}>{t(labelKey)}</Label>
          <Input
            id={`contact-${name}`}
            value={draft[name] ?? ''}
            onChange={(event) =>
              dispatch({ type: 'patchCore', patch: { [name]: event.target.value } as BriefCorePatch })
            }
          />
        </div>
      ))}

      <HoursEditor
        hours={draft.hours}
        onChange={(hours) => dispatch({ type: 'patchCore', patch: { hours } })}
      />
    </div>
  );
}

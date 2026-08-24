'use client';

import { useTranslations } from 'next-intl';

// OGW-501 (macrotask wizard-shell) — segnaposto degli step non ancora implementati (Racconto,
// Offerte, Contatti&orari, Rivedi). OGW-502 li sostituisce nella config `WIZARD_STEPS` con i
// componenti reali (StepStory/StepOfferings/StepContacts/StepReview). Ignora i props di step
// (draft/dispatch): il suo scopo e' solo tenere la navigazione percorribile fra gli step.
export function StepPlaceholder() {
  const t = useTranslations('onboarding');
  return <p className="text-sm text-muted-foreground">{t('wizard.placeholder')}</p>;
}

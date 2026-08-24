import type { Brief } from '@/domain/onboarding/brief';

// OGW-501 (macrotask wizard-shell) — READINESS UI del wizard: il minimo perche' abbia senso
// offrire "Genera". NON e' il gate di generazione (quello e' `generatable`, server-side, sul
// brief PERSISTITO, sui BLOCCHI superstiti — non un conteggio di campi): questa e' solo
// ergonomia del wizard, che disabilita la CTA finale e NOMINA cio' che manca (AC-501-4).
//
// I campi minimi sono quelli del blueprint: nome + tipo + obiettivo. Corrispondono a
// `isBriefComplete` (T-122) MENO `locale`, che uno schema valido porta sempre — un test lega le
// due nozioni cosi' che una divergenza non resti muta.
//
// NOTA DICHIARATA (coerente con T-122): `vertical` ha `default('altro')` in T-121, quindi porta
// SEMPRE un valore e non risulta mai "mancante" — cio' che discrimina davvero la readiness sono
// `business_name` e `primary_goal`. Resta in elenco perche' e' un campo minimo del prodotto
// (un bottone lo sceglie, AC-501-3) e perche' l'elenco deve leggere `isBriefComplete`, non un
// suo sottoinsieme scritto a mano.
const MINIMUM_FIELDS = ['business_name', 'vertical', 'primary_goal'] as const;
type MinimumField = (typeof MINIMUM_FIELDS)[number];

export type WizardReadiness = {
  ready: boolean;
  missing: MinimumField[];
};

export function wizardReadiness(brief: Brief): WizardReadiness {
  const missing = MINIMUM_FIELDS.filter((field) => {
    const value = brief[field];
    return value === undefined || value === null || value === '';
  });
  return { ready: missing.length === 0, missing };
}

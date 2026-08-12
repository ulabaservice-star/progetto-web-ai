import { describe, it, expect, vi } from 'vitest';

// DE-103 (macrotask visual-skin) — COERENZA della mappa font<->tema. Complemento UNIT dell'e2e
// (che esercita solo Fraunces, la famiglia del tema fissato): qui si prova che OGNI famiglia PRIMARIA
// usata dai temi del catalogo (THEMES) e' self-host — cioe' presente in FONT_VAR_BY_FAMILY e legata a
// una variabile DAVVERO dichiarata da un loader (in SITE_FONT_VARIABLE_CLASSNAME). Se un domani un
// tema usasse un font fuori dal catalogo self-host, o si scrivesse male il nome della variabile, questo
// test diventerebbe ROSSO invece di lasciare quel tema su Georgia in silenzio. Nessun tag `// covers`:
// l'oracolo degli AC di DE-103 resta l'e2e (AC-DE-103-1/2); questo e' copertura di regressione a monte.

// next/font/google e' un import COMPILE-TIME trasformato da Next: in vitest il loader grezzo non gira.
// Lo mocchiamo elencando i named export usati da site-fonts.ts, ciascuno un loader che espone la
// `variable` LITERALE che gli viene passata. FONT_VAR_BY_FAMILY resta comunque l'oggetto letterale
// REALE (indipendente dal ritorno del loader); SITE_FONT_VARIABLE_CLASSNAME diventa la join delle
// stesse variabili, cosi' si puo' verificare che ogni valore mappato sia una variabile dichiarata.
vi.mock('next/font/google', () => {
  const loader = (options: { variable: string }) => ({
    variable: options.variable,
    className: 'mock',
    style: { fontFamily: 'mock' },
  });
  return {
    Fraunces: loader,
    Source_Sans_3: loader,
    Space_Grotesk: loader,
    Inter: loader,
    Barlow_Condensed: loader,
    Barlow: loader,
    Libre_Baskerville: loader,
    Karla: loader,
    Poppins: loader,
    Nunito_Sans: loader,
  };
});

// Import DOPO il mock (vi.mock e' hoisted).
import { FONT_VAR_BY_FAMILY, SITE_FONT_VARIABLE_CLASSNAME } from '@/ui/site/site-fonts';
import { THEMES } from '@/domain/generation/themes';

/** Le famiglie PRIMARIE (la 1a voce di ogni stack) di heading E body di OGNI tema del catalogo. */
function primaryFamilies(): string[] {
  const set = new Set<string>();
  for (const theme of THEMES) {
    set.add(theme.typography.font_family.heading.split(',')[0].trim());
    set.add(theme.typography.font_family.body.split(',')[0].trim());
  }
  return [...set];
}

describe('DE-103 — FONT_VAR_BY_FAMILY copre e lega ogni famiglia primaria dei temi', () => {
  it('ci sono piu temi e piu famiglie primarie distinte (non vacuo)', () => {
    expect(THEMES.length).toBeGreaterThan(1);
    expect(primaryFamilies().length).toBeGreaterThan(1);
  });

  it('OGNI famiglia primaria di OGNI tema e mappata in FONT_VAR_BY_FAMILY', () => {
    const mapped = Object.keys(FONT_VAR_BY_FAMILY);
    const unmapped = primaryFamilies().filter((family) => !mapped.includes(family));
    // Un tema che usasse un font fuori dal catalogo self-host cadrebbe qui (invece di restare su Georgia).
    expect(unmapped).toEqual([]);
  });

  it('OGNI variabile mappata e DAVVERO dichiarata da un loader (presente in SITE_FONT_VARIABLE_CLASSNAME)', () => {
    const declared = SITE_FONT_VARIABLE_CLASSNAME.split(/\s+/).filter(Boolean);
    const dangling = Object.values(FONT_VAR_BY_FAMILY).filter((variable) => !declared.includes(variable));
    // Un typo nel nome della variabile (--font-fraunces vs --font-frauces) lascerebbe un valore
    // "appeso" a nessun loader: qui diventa rosso.
    expect(dangling).toEqual([]);
  });

  it('e FALSIFICABILE: una famiglia fuori catalogo NON risulta mappata', () => {
    // Contro-prova che il check di copertura non e' vacuo: un font che nessun tema usa non e' mappato.
    expect(Object.keys(FONT_VAR_BY_FAMILY).includes('Comic Sans MS')).toBe(false);
  });
});

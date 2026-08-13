import { describe, it, expect, vi } from 'vitest';

// DE11-102 (macrotask editorial-skin) — IL FONT DISPLAY SELF-HOST provato alla SORGENTE. Complemento
// UNIT dell'e2e (e2e/editorial-skin.spec.ts, che misura il font-family COMPUTATO dell'hero in un
// browser vero): qui si prova, ISPEZIONANDO il modulo come tests/site-fonts-mapping.test.ts, che la
// serif didone dei display editoriali e' dichiarata via next/font A LIVELLO DI MODULO (self-host, con
// display:'swap' e subset latin), che FONT_VAR_BY_FAMILY mappa la famiglia display di OGNI tema del
// catalogo, e che quel --font-* e' DAVVERO dichiarato da un loader (presente in
// SITE_FONT_VARIABLE_CLASSNAME). Le asserzioni DERIVANO da AC-DE11-102-3 (given/when/then), taggate
// `// covers: AC-DE11-102-3` sulla riga dell'expect.

// next/font/google e' un import COMPILE-TIME trasformato da Next: in vitest il loader grezzo non gira.
// Lo mocchiamo elencando i named export usati da site-fonts.ts, ciascuno un loader che espone la
// `variable` LITERALE. Per Playfair_Display (la display didone) il loader CATTURA in piu' le opzioni
// passate, cosi' il test verifica che display:'swap' e subsets ['latin'] siano davvero stati richiesti
// (self-host, nessun host esterno). Il captor e' `vi.hoisted` perche' la factory di vi.mock e' issata
// sopra ogni altro codice del modulo.
const captured = vi.hoisted(() => ({
  playfair: null as
    | { subsets?: readonly string[]; display?: string; variable?: string; weight?: readonly string[] }
    | null,
}));

vi.mock('next/font/google', () => {
  const loader = (options: { variable: string }) => ({
    variable: options.variable,
    className: 'mock',
    style: { fontFamily: 'mock' },
  });
  const playfairLoader = (options: {
    subsets?: readonly string[];
    display?: string;
    variable: string;
    weight?: readonly string[];
  }) => {
    captured.playfair = options;
    return { variable: options.variable, className: 'mock', style: { fontFamily: 'mock' } };
  };
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
    Playfair_Display: playfairLoader,
  };
});

// Import DOPO il mock (vi.mock e' hoisted).
import { FONT_VAR_BY_FAMILY, SITE_FONT_VARIABLE_CLASSNAME } from '@/ui/site/site-fonts';
import { THEMES } from '@/domain/generation/themes';
import { siteThemeStyle } from '@/ui/site/theme-style';

/** La famiglia display PRIMARIA (la 1a voce dello stack `display`) di ogni tema del catalogo. */
function displayPrimaryFamilies(): string[] {
  const set = new Set<string>();
  for (const theme of THEMES) {
    set.add(theme.typography.font_family.display.split(',')[0].trim());
  }
  return [...set];
}

describe('DE11-102 — la display didone e self-host via next/font, mappata e dichiarata (AC-DE11-102-3)', () => {
  it('non e vacuo: piu temi, e ogni tema espone uno stack display', () => {
    expect(THEMES.length).toBeGreaterThan(1);
    expect(displayPrimaryFamilies().length).toBeGreaterThanOrEqual(1);
    for (const theme of THEMES) {
      expect(theme.typography.font_family.display.length).toBeGreaterThan(0);
    }
  });

  it('la display e dichiarata via next/font a livello di modulo, self-host, con display:swap e subset latin', () => {
    // when: importare site-fonts.ts esegue il loader di modulo -> il captor ha registrato le opzioni.
    // then (self-host a livello di modulo): il loader Playfair_Display E' stato invocato con opzioni.
    expect(captured.playfair).not.toBeNull(); // covers: AC-DE11-102-3
    // then (display:'swap'): il font-display richiesto e' 'swap' (niente FOIT; nessuna rete esterna).
    expect(captured.playfair?.display).toBe('swap'); // covers: AC-DE11-102-3
    // then (self-host): subset latin richiesto -> Next inlinea i .woff2 sotto 'self', nessun host esterno.
    expect(captured.playfair?.subsets).toContain('latin'); // covers: AC-DE11-102-3
    // La variable e' un literal --font-* (richiesto dal compilatore next/font).
    expect(captured.playfair?.variable).toBe('--font-playfair-display'); // covers: AC-DE11-102-3
  });

  it('ogni stack display del tema ha il FALLBACK SERIF di sistema come ultima voce (mai un font solo)', () => {
    // then (fallback serif): lo stack `display` non e' una sola famiglia — termina col fallback di
    // sistema 'serif', cosi' un font che non carica non lascia i titoli senza grazie.
    for (const theme of THEMES) {
      const stack = theme.typography.font_family.display.split(',').map((part) => part.trim());
      expect(stack.length).toBeGreaterThan(1); // covers: AC-DE11-102-3
      expect(stack[stack.length - 1]).toBe('serif'); // covers: AC-DE11-102-3
    }
  });

  it('FONT_VAR_BY_FAMILY mappa la famiglia display di OGNI tema, e la variabile e quella del loader', () => {
    const mapped = Object.keys(FONT_VAR_BY_FAMILY);
    const unmapped = displayPrimaryFamilies().filter((family) => !mapped.includes(family));
    // Una display fuori dal catalogo self-host cadrebbe qui (invece di restare su Georgia in silenzio).
    expect(unmapped).toEqual([]); // covers: AC-DE11-102-3
    // La variabile mappata per la display coincide con quella che il loader ha ricevuto: nessuna deriva
    // fra la mappa e il font davvero dichiarato.
    for (const family of displayPrimaryFamilies()) {
      expect(FONT_VAR_BY_FAMILY[family]).toBe(captured.playfair?.variable); // covers: AC-DE11-102-3
    }
  });

  it('il --font-* della display e DAVVERO dichiarato da un loader (presente in SITE_FONT_VARIABLE_CLASSNAME)', () => {
    const declared = SITE_FONT_VARIABLE_CLASSNAME.split(/\s+/).filter(Boolean);
    for (const family of displayPrimaryFamilies()) {
      const variable = FONT_VAR_BY_FAMILY[family];
      // Un typo nel nome (--font-playfair-display vs --font-playfair) lascerebbe un valore "appeso" a
      // nessun loader: qui diventa rosso. In vitest la variable e' il literal (il mock la rispecchia).
      expect(declared).toContain(variable); // covers: AC-DE11-102-3
    }
  });

  it('e FALSIFICABILE: una serif fuori catalogo NON risulta mappata come display', () => {
    // Contro-prova che la copertura non e' vacua: una didone che nessun tema usa non e' mappata.
    expect(Object.keys(FONT_VAR_BY_FAMILY).includes('Bodoni Moda')).toBe(false); // covers: AC-DE11-102-3
  });

  it('theme-style ANTEPONE var(--font-*) allo stack display in --site-font-display (deliverable DE11-102)', () => {
    // Il cuore di DE11-102: --site-font-display deve acquistare il PREFISSO var(--font-*) della display
    // self-host, cosi' il browser usa il font CARICATO prima dello stack del tema (che resta fallback).
    // fontStackWithVariable (theme-style) antepone 'var(--font-playfair-display), ' quando la primaria e'
    // in FONT_VAR_BY_FAMILY. Un test prefix-AGNOSTICO (toContain(stack)) passerebbe anche SENZA il prepend;
    // qui si pinna il PREFISSO, cosi' rimuoverlo (la display tornerebbe allo stack grezzo) diventa rosso.
    for (const theme of THEMES) {
      const primary = theme.typography.font_family.display.split(',')[0].trim();
      const variable = FONT_VAR_BY_FAMILY[primary];
      expect(variable, theme.id).toBeTruthy(); // covers: AC-DE11-102-3
      const projected = siteThemeStyle(theme) as unknown as Record<string, string>;
      expect(projected['--site-font-display'], theme.id).toBe(
        `var(${variable}), ${theme.typography.font_family.display}`,
      ); // covers: AC-DE11-102-3
    }
  });
});

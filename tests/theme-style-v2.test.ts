// DV2-102 (macrotask `foundation`) — oracolo di conformità-logica: theme-style.ts proietta i token
// semantici di Claude Design come custom property alla radice del render. Asserzioni DERIVATE dagli
// acceptance_criteria (docs/blueprint/design-engine-v2/01-foundation.md), tag `// covers`.
import { describe, it, expect, vi } from 'vitest';

// theme-style importa site-fonts, che a import-time chiama i loader next/font/google (un trasform
// compile-time di Next che in vitest non gira): li mocchiamo, come fa site-fonts-mapping.test.ts.
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
    Playfair_Display: loader,
  };
});

// Import DOPO il mock (vi.mock è hoisted).
import { siteThemeStyle } from '@/ui/site/theme-style';
import { THEMES } from '@/domain/generation/themes';

// I 7 token semantici CD "portanti" che i blocchi v2 useranno di più.
const CD_CORE_TOKENS = [
  'surface_page', 'surface_dark', 'text_heading', 'accent', 'line', 'on_dark', 'eyebrow_color',
] as const;

function isLiteralColor(v: string): boolean {
  // hex, rgb(), hsl(): i letterali che AC-231-4 vieta. NON è un letterale: var(...) e color-mix(...)
  // che REFERENZIA solo var/parole chiave — ma qui i valori vengono dal tema (dominio), quindi un
  // color-mix con hex del tema è ammesso: controlliamo l'INCLUSIONE nei valori del tema, non la forma.
  return /#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(/.test(v);
}

describe('design-engine-v2 · foundation · theme-style proietta i token CD', () => {
  // covers: AC-DV2-102-1 — ogni token colore semantico CD → una custom property --site-color-* col valore del token.
  it('per ogni token colore del tema emette --site-color-<token> col valore del tema', () => {
    for (const theme of THEMES) {
      const style = siteThemeStyle(theme) as Record<string, string>;
      for (const [token, value] of Object.entries(theme.colors)) {
        const cssVar = `--site-color-${token.replace(/_/g, '-')}`;
        expect(style[cssVar], `${theme.id} ${cssVar}`).toBe(value);
      }
      // i token portanti CD ci sono, con il trattino al posto dell'underscore
      for (const token of CD_CORE_TOKENS) {
        const cssVar = `--site-color-${token.replace(/_/g, '-')}`;
        expect(style[cssVar], `${theme.id} ${cssVar} mancante`).toBeTruthy();
      }
    }
  });

  // covers: AC-DV2-102-2 — copertura TOTALE: nessun token del tipo resta senza la sua custom property.
  it('la mappatura token→custom-property è totale (nessun buco)', () => {
    for (const theme of THEMES) {
      const style = siteThemeStyle(theme) as Record<string, string>;
      const emittedColorVars = new Set(
        Object.keys(style).filter((k) => k.startsWith('--site-color-')),
      );
      const expectedColorVars = Object.keys(theme.colors).map(
        (t) => `--site-color-${t.replace(/_/g, '-')}`,
      );
      // ogni token del tema ha la sua --site-color-* (nessun token dimenticato)
      for (const v of expectedColorVars) {
        expect(emittedColorVars.has(v), `${theme.id}: manca ${v}`).toBe(true);
      }
      // e non ci sono --site-color-* di troppo che non corrispondano a un token
      expect(emittedColorVars.size).toBe(expectedColorVars.length);
      // le famiglie/scale/spazi/raggi sono anch'essi proiettati (il tipo è totale)
      expect(style['--site-font-display']).toBeTruthy();
      expect(style['--site-numeric-figure']).toBeTruthy();
      expect(style['--site-scale-3xl']).toBeTruthy();
      expect(style['--site-space-lg']).toBeTruthy();
      expect(style['--site-radius-pill']).toBeTruthy();
    }
  });

  // covers: AC-DV2-102-3 — i valori colore emessi provengono TUTTI dal tema (nessun letterale iniettato).
  it('ogni valore colore emesso proviene dal tema (nessun colore letterale iniettato dalla proiezione)', () => {
    for (const theme of THEMES) {
      const style = siteThemeStyle(theme) as Record<string, string>;
      const themeColorValues = new Set(Object.values(theme.colors));
      for (const [key, value] of Object.entries(style)) {
        if (!key.startsWith('--site-color-')) continue;
        // Il valore è ESATTAMENTE un valore del tema: la proiezione non introduce colori propri.
        // (Che il tema usi hex/color-mix è lecito: vive nel dominio, fuori da src/ui/site — DS-V2-D7.)
        expect(themeColorValues.has(value), `${theme.id} ${key}=${value} non è un valore del tema`).toBe(true);
        // difesa in più: se per errore comparisse un letterale, deve almeno essere uno del tema.
        if (isLiteralColor(value)) {
          expect(themeColorValues.has(value)).toBe(true);
        }
      }
    }
  });
});

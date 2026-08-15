// DV2-103 (macrotask `foundation`) — site.css allineato ai token semantici di Claude Design: 0 colori
// letterali, riferimenti ai token CD, regole editoriali. Asserzioni DERIVATE dagli acceptance_criteria
// (docs/blueprint/design-engine-v2/01-foundation.md), tag // covers. Riusa lo scanner condiviso (nessun
// secondo scanner, nessun clone jscpd).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hasLiteralColor } from './helpers/css-literal-color';

const SITE_CSS = fileURLToPath(new URL('../src/ui/site/site.css', import.meta.url));
const css = readFileSync(SITE_CSS, 'utf8');

describe('design-engine-v2 · foundation · site.css a token CD', () => {
  // covers: AC-DV2-103-1 — 0 colori letterali (hex/rgb/hsl): ogni colore è un var(--...).
  it('non contiene alcun colore letterale', () => {
    expect(hasLiteralColor(css)).toBe(false);
  });

  // covers: AC-DV2-103-2 — le regole di superficie/testo/accento/linea usano i token semantici CD.
  it('referenzia i token semantici di Claude Design e non i nomi legacy migrati', () => {
    for (const token of ['surface-page', 'surface-card', 'text-heading', 'line', 'accent']) {
      expect(css.includes(`var(--site-color-${token})`), `manca var(--site-color-${token})`).toBe(true);
    }
    // i nomi legacy migrati non compaiono più come colore (background→surface-page, border→line)
    for (const legacy of ['background', 'border']) {
      expect(css.includes(`var(--site-color-${legacy})`), `residuo legacy var(--site-color-${legacy})`).toBe(false);
    }
  });

  // covers: AC-DV2-103-3 — regole editoriali a token: display sui titoli, tabular-nums sui prezzi, leader-dots.
  it('porta le regole editoriali (display, tabular-nums, leader-dots), senza colori letterali', () => {
    expect(css.includes('var(--site-font-display)'), 'display sui titoli').toBe(true);
    expect(css.includes('var(--site-numeric-figure)'), 'tabular-nums sui prezzi').toBe(true);
    // leader-dots: guida di punti decorativa prima del prezzo (bordo dotted, colore da var)
    expect(/\.site-offerings__price::before[\s\S]*?dotted/.test(css), 'leader-dots').toBe(true);
  });
});

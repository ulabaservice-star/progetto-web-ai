import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// DE-101 (macrotask visual-skin) — AC-DE-101-2: nessun file .css sotto src/ui/site/** contiene
// un valore di colore LETTERALE (esadecimale, rgb(), hsl()). E' il gemello di AC-231-4
// (site-blocks-style.test.ts, che sorveglia i SORGENTI del layer) esteso al FOGLIO DI STILE
// nato con questo macrotask: il divieto di letterale vale ovunque il layer produca stile, non
// solo nei componenti. I colori arrivano dai token del tema tradotti in var(--site-color-*)
// alla radice del render, mai scritti a mano nel CSS.

const SITE_DIR = fileURLToPath(new URL('../src/ui/site', import.meta.url));
const CSS = /\.css$/;

function walkCss(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walkCss(full));
    else if (CSS.test(full)) found.push(full);
  }
  return found;
}

// Le STESSE forme vietate di T-231. `HEX` pretende '#' + 3..8 cifre esadecimali con un confine
// finale; `RGB`/`HSL` prendono la funzione col suo '(' e la variante con alfa. var(--site-...)
// non contiene '#', 'rgb(' ne 'hsl(', quindi non e' un falso positivo.
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RGB = /\brgba?\(/;
const HSL = /\bhsla?\(/;

const cssFiles = walkCss(SITE_DIR);

describe('DE-101 AC-DE-101-2 — src/ui/site/**/*.css senza colori letterali', () => {
  it('lo scan trova ALMENO un file .css (non passa per vacuita)', () => {
    // Senza un .css il filtro sarebbe vuoto e "nessun offender" non proverebbe nulla.
    expect(cssFiles.length).toBeGreaterThanOrEqual(1); // covers: AC-DE-101-2
  });

  it('nessun file .css contiene un colore letterale (hex, rgb(), hsl())', () => {
    const offenders = cssFiles.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return HEX.test(source) || RGB.test(source) || HSL.test(source);
    });
    expect(offenders).toEqual([]); // covers: AC-DE-101-2
  });

  it('il controllo e FALSIFICABILE: gli scanner riconoscono le forme vietate e non i token', () => {
    // Le forme vietate sono ASSEMBLATE a runtime (concatenazione) cosi' lo scanner non
    // scatterebbe nemmeno sul proprio sorgente. Valori DISCORDANTI per esercitare ogni ramo.
    const hash = '#';
    const openParen = '(';
    expect(HEX.test('color: ' + hash + 'ffffff')).toBe(true); // covers: AC-DE-101-2
    expect(HEX.test('color: ' + hash + 'a1b')).toBe(true); // covers: AC-DE-101-2
    expect(RGB.test('color: ' + 'rgb' + openParen + '12, 34, 56)')).toBe(true); // covers: AC-DE-101-2
    expect(RGB.test('color: ' + 'rgba' + openParen + '0, 0, 0, 0.5)')).toBe(true); // covers: AC-DE-101-2
    expect(HSL.test('color: ' + 'hsl' + openParen + '210, 40%, 30%)')).toBe(true); // covers: AC-DE-101-2
    expect(HSL.test('color: ' + 'hsla' + openParen + '210, 40%, 30%, 0.5)')).toBe(true); // covers: AC-DE-101-2
    // e NON scatta su cio' che il foglio usa davvero al posto dei letterali:
    expect(HEX.test('background-color: var(--site-color-accent)')).toBe(false); // covers: AC-DE-101-2
    expect(RGB.test('background-color: var(--site-color-accent)')).toBe(false); // covers: AC-DE-101-2
    expect(HSL.test('background-color: var(--site-color-accent)')).toBe(false); // covers: AC-DE-101-2
    expect(HEX.test('font-size: clamp(2rem, 5vw, var(--site-scale-3xl))')).toBe(false); // covers: AC-DE-101-2
  });
});

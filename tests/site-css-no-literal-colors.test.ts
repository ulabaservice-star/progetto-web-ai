import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HEX, RGB, HSL, hasLiteralColor, cssFilesUnder } from './helpers/css-literal-color';

// DE-101 (macrotask visual-skin) — AC-DE-101-2: nessun file .css sotto src/ui/site/** contiene
// un valore di colore LETTERALE (esadecimale, rgb(), hsl()). E' il gemello di AC-231-4
// (site-blocks-style.test.ts, che sorveglia i SORGENTI del layer) esteso al FOGLIO DI STILE
// nato con questo macrotask: il divieto di letterale vale ovunque il layer produca stile, non
// solo nei componenti. I colori arrivano dai token del tema tradotti in var(--site-color-*)
// alla radice del render, mai scritti a mano nel CSS.
//
// Lo SCANNER (le forme vietate + il walk ricorsivo) vive ora in ./helpers/css-literal-color e si
// IMPORTA: DE-207 lo riusa sul solo site.css senza ricopiarlo (un secondo scanner divergerebbe in
// silenzio, e sarebbe un clone jscpd).

const SITE_DIR = fileURLToPath(new URL('../src/ui/site', import.meta.url));

const cssFiles = cssFilesUnder(SITE_DIR);

describe('DE-101 AC-DE-101-2 — src/ui/site/**/*.css senza colori letterali', () => {
  it('lo scan trova ALMENO un file .css (non passa per vacuita)', () => {
    // Senza un .css il filtro sarebbe vuoto e "nessun offender" non proverebbe nulla.
    expect(cssFiles.length).toBeGreaterThanOrEqual(1); // covers: AC-DE-101-2
  });

  it('nessun file .css contiene un colore letterale (hex, rgb(), hsl())', () => {
    const offenders = cssFiles.filter((file) => hasLiteralColor(readFileSync(file, 'utf8')));
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

// DE11-103 (macrotask editorial-skin) — AC-DE11-103-3: le regole tipografiche editoriali aggiunte a
// site.css (display sui titoli/prezzi/citazioni, label uppercase tracciate, cifre tabulari, leader-dots,
// «» sulle citazioni, ritmo delle sezioni) restano DENTRO il divieto di colore LETTERALE — i colori sono
// SOLO var(--site-color-*). E' la ri-asserzione ANCORATA all'AC v1.1 richiesta dal blueprint, sullo
// STESSO scanner condiviso di sopra (nessun secondo scanner, nessun clone): il foglio ESTESO non
// introduce alcun hex/rgb/hsl. La pinna su site.css garantisce che la superficie di DE11-103 sia davvero
// scandita (non passa per vacuita' se il file rientra negli ambiti).
describe('DE11-103 AC-DE11-103-3 — site.css editoriale senza colori letterali', () => {
  // Il singolo foglio site.css fra i file scanditi, individuato per suffisso di percorso (robusto al
  // separatore di OS): la superficie che DE11-103 estende. Deve essercene ESATTAMENTE uno.
  const siteCssFiles = cssFiles.filter((file) => file.replace(/\\/g, '/').endsWith('/src/ui/site/site.css'));

  it('site.css e negli ambiti scanditi (non passa per vacuita)', () => {
    expect(siteCssFiles).toHaveLength(1); // covers: AC-DE11-103-3
  });

  it('site.css non contiene alcun colore letterale dopo le regole editoriali (solo var(--site-color-*))', () => {
    const offenders = siteCssFiles.filter((file) => hasLiteralColor(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]); // covers: AC-DE11-103-3
  });

  it('nessun file .css di src/ui/site ha un colore letterale, col foglio esteso da DE11-103', () => {
    // La re-scansione dell'intera directory: le regole editoriali non hanno sporcato NESSUN foglio.
    const offenders = cssFiles.filter((file) => hasLiteralColor(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]); // covers: AC-DE11-103-3
  });
});

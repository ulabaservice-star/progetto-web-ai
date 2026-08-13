// Scanner CONDIVISO dei colori LETTERALI in un foglio di stile, ESTRATTO da
// tests/site-css-no-literal-colors.test.ts (DE-101) perche' piu' test ne hanno bisogno
// (DE-101 su tutta src/ui/site/**, DE-207 sul solo site.css con le nuove varianti): si IMPORTA
// da qui, non si RICOPIA — cosi' non nasce un secondo scanner che diverge in silenzio, ne un
// clone jscpd (R-04). Le forme vietate sono le STESSE di T-231: un valore di colore esadecimale,
// una funzione rgb()/rgba(), una funzione hsl()/hsla(). `var(--site-...)` non contiene '#',
// 'rgb(' ne 'hsl(', quindi non e' un falso positivo.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// `HEX` pretende '#' + 3..8 cifre esadecimali con un confine finale; `RGB`/`HSL` prendono la
// funzione col suo '(' e la variante con alfa. Esportate singolarmente perche' la contro-prova
// di falsificabilita' esercita ogni ramo separatamente.
export const HEX = /#[0-9a-fA-F]{3,8}\b/;
export const RGB = /\brgba?\(/;
export const HSL = /\bhsla?\(/;

/** true se la sorgente contiene ALMENO una forma di colore letterale (hex, rgb(), hsl()). */
export function hasLiteralColor(source: string): boolean {
  return HEX.test(source) || RGB.test(source) || HSL.test(source);
}

/** Tutti i file .css sotto `dir`, ricorsivamente. */
export function cssFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...cssFilesUnder(full));
    else if (/\.css$/.test(full)) found.push(full);
  }
  return found;
}

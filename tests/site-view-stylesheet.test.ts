import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// DE-101 (macrotask visual-skin) — AC-DE-101-3: il foglio site.css e' importato ESATTAMENTE UNA
// VOLTA, dal renderer condiviso SiteView.tsx, e da NESSUN altro file del layer. SiteView e' il
// solo punto da cui i blocchi (card, anteprima, /s/) discendono: un unico import qui copre ogni
// superficie, e una seconda copia altrove sarebbe stile duplicato che diverge in silenzio. Il
// test guarda i SORGENTI (non l'albero reso), come i gemelli di stile del layer.

const SITE_DIR = fileURLToPath(new URL('../src/ui/site', import.meta.url));
const SITE_VIEW = join(SITE_DIR, 'SiteView.tsx');
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

// Riconosce un import di site.css in QUALUNQUE forma (relativa './site.css' o via alias
// '@/ui/site/site.css'): il gruppo prima di 'site.css' assorbe il prefisso del percorso. Global,
// cosi' `match` restituisce TUTTE le occorrenze e ne possiamo contare il numero.
const CSS_IMPORT = /import\s+['"][^'"]*site\.css['"]/g;

function countCssImports(source: string): number {
  return source.match(CSS_IMPORT)?.length ?? 0;
}

function walkSources(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walkSources(full));
    else if (SOURCE.test(full)) found.push(full);
  }
  return found;
}

describe('DE-101 AC-DE-101-3 — un solo import di site.css, dal renderer condiviso', () => {
  it('SiteView.tsx importa ./site.css esattamente una volta', () => {
    const source = readFileSync(SITE_VIEW, 'utf8');
    expect(countCssImports(source)).toBe(1); // covers: AC-DE-101-3
  });

  it('nessun ALTRO file di src/ui/site importa site.css (nessuna copia dell import)', () => {
    const others = walkSources(SITE_DIR).filter((file) => file !== SITE_VIEW);
    const offenders = others.filter((file) => countCssImports(readFileSync(file, 'utf8')) > 0);
    expect(offenders).toEqual([]); // covers: AC-DE-101-3
  });

  it('il conteggio e FALSIFICABILE: la regex conta 2 su due import e 0 su nessuno', () => {
    // Contro-prova: la regex NON e' tautologica — riconosce e conta davvero l'import.
    const two = "import './site.css';\nimport '@/ui/site/site.css';";
    const none = "import { SiteView } from '@/ui/site/SiteView';";
    expect(countCssImports(two)).toBe(2); // covers: AC-DE-101-3
    expect(countCssImports(none)).toBe(0); // covers: AC-DE-101-3
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// DE-301 (macrotask effects-runtime) — LE DUE PROMESSE DEL FOGLIO CHE NESSUN BROWSER PUO' SMENTIRE
// DA SOLO. Gli acceptance_criteria di DE-301 vivono nell'e2e (stato pieno senza JS, movimento zero
// sotto reduce); restano pero' scoperti due bullet della definition_of_done, ed entrambi si leggono
// nel SORGENTE del foglio:
//
//  (1) "keyframe solo transform/opacity": un keyframe che animasse height o width ricalcherebbe il
//      layout a ogni frame. Nessun test in un browser lo direbbe — l'animazione girerebbe lo stesso,
//      solo peggio. Qui si legge il corpo del keyframe e si guardano le PROPRIETA' dichiarate.
//  (2) "hover L2 in CSS": le regole devono esistere DAVVERO e puntare a classi che i blocchi rendono
//      davvero. Una regola su una classe inesistente e' CSS morto che nessun oracolo vedrebbe.
//
// Il file legge il foglio come TESTO (vitest gira dalla radice del repo, come gli altri test che
// leggono site.css) e ogni predicato porta la propria CONTRO-PROVA: un estrattore che sbagliasse a
// ritagliare il keyframe restituirebbe il vuoto, e il vuoto passa qualunque controllo di inclusione.

const SITE_DIR = join(process.cwd(), 'src', 'ui', 'site');

function siteCss(): string {
  return readFileSync(join(SITE_DIR, 'site.css'), 'utf8');
}

/**
 * Il CORPO di un @keyframes, ritagliato contando le graffe (i blocchi `from`/`to` sono annidati,
 * quindi la prima `}` NON e' la fine della regola).
 */
function keyframesBody(css: string, name: string): string {
  const start = css.indexOf(`@keyframes ${name}`);
  if (start === -1) throw new Error(`@keyframes ${name} non trovato nel foglio`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    else if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  throw new Error(`@keyframes ${name} non e' chiuso`);
}

/** Le proprieta' DICHIARATE in un corpo di regole (il nome a sinistra dei due punti). */
function declaredProperties(body: string): string[] {
  return [...body.matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1]);
}

// Le SOLE due proprieta' che un'animazione puo' toccare senza far ricalcolare il layout.
const ANIMABILI = new Set(['opacity', 'transform']);

describe('DE-301 il foglio anima solo transform e opacity', () => {
  it('il keyframe del reveal L2 dichiara esclusivamente opacity e transform', () => {
    const body = keyframesBody(siteCss(), 'site-hero-rise');
    const proprieta = declaredProperties(body);

    // Anti-vacuita': il ritaglio ha preso un corpo VERO (from + to, due proprieta' ciascuno), non una
    // stringa vuota che passerebbe qualunque inclusione.
    expect(proprieta.length).toBeGreaterThanOrEqual(4);
    expect(proprieta.every((nome) => ANIMABILI.has(nome))).toBe(true);
  });

  it('il predicato DISCRIMINA: una proprieta di layout nel keyframe cadrebbe', () => {
    // CONTRO-PROVA su fixture virtuale: senza questa, un estrattore rotto (corpo vuoto) o un insieme
    // sbagliato renderebbero il controllo qui sopra sempre verde.
    const rotto = declaredProperties('from { opacity: 0; height: 0; } to { opacity: 1; height: 10px; }');
    expect(rotto.every((nome) => ANIMABILI.has(nome))).toBe(false);
    expect(declaredProperties('from { opacity: 0; } to { opacity: 1; }').every((n) => ANIMABILI.has(n))).toBe(
      true,
    );
  });
});

describe('DE-301 gli hover L2 esistono e puntano a classi che i blocchi rendono', () => {
  it('almeno due regole di hover sono dichiarate per il livello L2', () => {
    const regole = [...siteCss().matchAll(/\[data-effects='L2'\][^{}]*:hover[^{]*\{/g)];
    // Due: il color-swap della CTA e lo sliding-fill della voce di offerta (definition_of_done).
    expect(regole.length).toBeGreaterThanOrEqual(2);
  });

  it('le classi bersaglio degli hover sono rese davvero dai blocchi (nessuna regola morta)', () => {
    const cta = readFileSync(join(SITE_DIR, 'blocks', 'CtaWhatsapp.tsx'), 'utf8');
    const offerte = readFileSync(join(SITE_DIR, 'blocks', 'Offerte.tsx'), 'utf8');

    expect(siteCss()).toContain('.site-cta__button');
    expect(cta).toContain('site-cta__button');
    expect(siteCss()).toContain('.site-offerings__item');
    expect(offerte).toContain('site-offerings__item');
  });
});

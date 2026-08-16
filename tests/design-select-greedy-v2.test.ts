import { describe, it, expect } from 'vitest';
import { selectDesign, type DesignSelection } from '@/domain/generation/design-select';
import { allowedCombinations, type Combo, type Vertical } from '@/domain/generation/design-matrix';

// DV2-503 (macrotask variety-select, design-engine-v2) — ORACOLO della SELEZIONE GREEDY MULTI-ASSE
// (farthest-first deterministico, DS-V2-D4). Le asserzioni DERIVANO dagli acceptance_criteria
// AC-DV2-503-1..3 (docs/blueprint/design-engine-v2/05-variety-select.md); ogni EXPECT porta il tag
// `// covers: <AC-id>`.
//
// COSA CAMBIA (DS-V2-D4): `buildVariants` passa dal DEDUP-PER-HERO al FARTHEST-FIRST su TUTTI gli assi di
// varieta' v2 (DS-V2-D9: theme, hero, menu, section-layout, recipe): la prima variante e' la prima del
// pool mescolato col seed; la variante `i` MINIMIZZA la somiglianza massima (numero di assi in comune,
// recipe INCLUSA) con le gia' scelte, con ESCLUSIONE DURA di hero_layout_id e theme_id finche' c'e'
// materiale; tie-break deterministico via il PRNG seminato. Puro e deterministico (nessun
// Date/Math.random): stessi (vertical, seed) -> stesse 5 varianti byte per byte.
//
// PERCHE' NON E' TAUTOLOGICO: la metrica di somiglianza e la nozione di "candidato eleggibile" sono
// RICALCOLATE QUI dal pool (`allowedCombinations`), non importate dall'implementazione. Il test verifica
// che, ad ogni passo, la variante scelta raggiunga il MINIMO della somiglianza massima fra i candidati
// eleggibili — cioe' la PROPRIETA' del farthest-first — non che l'impl sia uguale a se stessa.

// Gli assi di varieta' v2 (DS-V2-D9): la somiglianza si misura su QUESTI cinque, recipe inclusa.
const VARIETY_AXES = [
  'theme_id',
  'hero_layout_id',
  'menu_layout_id',
  'section_layout_id',
  'recipe_id',
] as const;

type Assi = Pick<Combo, (typeof VARIETY_AXES)[number]>;

/** Somiglianza = numero di assi di varieta' con lo STESSO valore fra due combinazioni. */
function somiglianza(a: Assi, b: Assi): number {
  return VARIETY_AXES.reduce((n, axis) => (a[axis] !== undefined && a[axis] === b[axis] ? n + 1 : n), 0);
}

/** La somiglianza MASSIMA di `c` con un insieme di gia' scelte (0 se l'insieme e' vuoto). */
function somiglianzaMax(c: Assi, scelte: readonly Assi[]): number {
  return scelte.reduce((max, s) => Math.max(max, somiglianza(c, s)), 0);
}

/** Firma COMPLETA di una combo (tutti i campi, ordinati): identifica una voce del pool in modo univoco. */
function firma(c: Combo | DesignSelection): string {
  return JSON.stringify(
    Object.keys(c)
      .sort()
      .map((k) => [k, (c as Record<string, unknown>)[k]]),
  );
}

const RISTORAZIONE: Vertical = 'ristorazione';
const VARIANTI = 5;

/** Le 5 varianti di un seed, nell'ordine 0..4. */
function cinqueVarianti(vertical: Vertical, seed: string): DesignSelection[] {
  return Array.from({ length: VARIANTI }, (_, i) => selectDesign(vertical, seed, i));
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-503-1 — hero_layout_id e theme_id a due a due DIVERSI (esclusione dura).
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-503 AC-DV2-503-1 — esclusione dura: hero e theme a due a due diversi', () => {
  it('le 5 varianti di un seed hanno hero_layout_id distinti E theme_id distinti', () => {
    const variants = cinqueVarianti(RISTORAZIONE, 'gen-greedy-uno');
    expect(new Set(variants.map((v) => v.hero_layout_id)).size).toBe(VARIANTI); // covers: AC-DV2-503-1
    expect(new Set(variants.map((v) => v.theme_id)).size).toBe(VARIANTI); // covers: AC-DV2-503-1
  });

  it('vale su piu seed diversi (non e un caso fortunato di un seed)', () => {
    for (const seed of ['alfa', 'beta-2', 'gamma-33', 'delta-444']) {
      const variants = cinqueVarianti(RISTORAZIONE, seed);
      expect(new Set(variants.map((v) => v.hero_layout_id)).size, seed).toBe(VARIANTI); // covers: AC-DV2-503-1
      expect(new Set(variants.map((v) => v.theme_id)).size, seed).toBe(VARIANTI); // covers: AC-DV2-503-1
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-503-2 — ogni variante i minimizza la somiglianza massima (farthest-first); recipe diversificati.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-503 AC-DV2-503-2 — farthest-first: ogni passo minimizza la somiglianza massima', () => {
  it('ad ogni passo i>=1 la variante scelta raggiunge il MINIMO della somiglianza massima fra gli eleggibili', () => {
    const seed = 'gen-greedy-farthest';
    const variants = cinqueVarianti(RISTORAZIONE, seed);
    const pool = allowedCombinations(RISTORAZIONE);

    const usedHero = new Set<string>();
    const usedTheme = new Set<string>();
    const sceltiFirme = new Set<string>();
    const scelte: Assi[] = [];

    for (let i = 0; i < variants.length; i += 1) {
      const v = variants[i];
      if (i >= 1) {
        // Candidati ELEGGIBILI dall'esclusione DURA: non gia' scelti, hero e theme mai usati. Il
        // materiale della ristorazione garantisce che l'insieme non sia vuoto (>=5 hero e >=5 theme).
        const eleggibili = pool.filter(
          (c) =>
            !sceltiFirme.has(firma(c)) &&
            !usedHero.has(c.hero_layout_id) &&
            !usedTheme.has(c.theme_id),
        );
        expect(eleggibili.length, `passo ${i}: materiale eleggibile`).toBeGreaterThan(0); // covers: AC-DV2-503-2

        // Il MINIMO della somiglianza massima raggiungibile da un candidato eleggibile...
        const minMax = Math.min(...eleggibili.map((c) => somiglianzaMax(c, scelte)));
        // ...e' esattamente quello che la variante scelta raggiunge (farthest-first, non un candidato
        // qualsiasi). Metrica RICALCOLATA qui: non e' `impl === impl`.
        expect(somiglianzaMax(v, scelte), `passo ${i}: minimo`).toBe(minMax); // covers: AC-DV2-503-2

        // E l'esclusione dura ha retto: hero/theme della scelta non erano gia' usati.
        expect(usedHero.has(v.hero_layout_id), `passo ${i}: hero nuovo`).toBe(false); // covers: AC-DV2-503-2
        expect(usedTheme.has(v.theme_id), `passo ${i}: theme nuovo`).toBe(false); // covers: AC-DV2-503-2
      }
      usedHero.add(v.hero_layout_id);
      usedTheme.add(v.theme_id);
      sceltiFirme.add(firma(v));
      scelte.push(v);
    }
  });

  it('i recipe_id sono DIVERSIFICATI (>=2 distinti fra le 5 varianti): la copy varia, non tutte uguali', () => {
    const variants = cinqueVarianti(RISTORAZIONE, 'gen-greedy-recipe');
    const recipes = new Set(variants.map((v) => v.recipe_id));
    expect(recipes.size).toBeGreaterThanOrEqual(2); // covers: AC-DV2-503-2
    // Anche gli assi del corpo/menu del pool sono diversificati (non collassati su un valore): la varieta'
    // non e' solo hero/theme (esclusi per forza) ma tocca gli assi soft che la metrica minimizza.
    expect(new Set(variants.map((v) => v.menu_layout_id)).size).toBeGreaterThanOrEqual(2); // covers: AC-DV2-503-2
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-503-3 — determinismo: stesso (vertical, seed) -> stesse 5 varianti byte per byte.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-503 AC-DV2-503-3 — determinismo: nessun Date/Math.random', () => {
  it('due esecuzioni di selectDesign per lo stesso (vertical, seed) danno le stesse 5 varianti', () => {
    const seed = 'gen-greedy-det';
    const a = cinqueVarianti(RISTORAZIONE, seed);
    const b = cinqueVarianti(RISTORAZIONE, seed);
    for (let i = 0; i < VARIANTI; i += 1) {
      expect(b[i], `variante ${i}`).toEqual(a[i]); // covers: AC-DV2-503-3
    }
  });

  it('seed diversi danno (in generale) sequenze diverse: la selezione dipende dal seed', () => {
    const a = cinqueVarianti(RISTORAZIONE, 'seed-uno');
    const b = cinqueVarianti(RISTORAZIONE, 'seed-due-molto-diverso');
    // Almeno una variante differisce (il seed semina lo shuffle e il tie-break): non e' una costante.
    const diverse = a.some((v, i) => firma(v) !== firma(b[i]));
    expect(diverse).toBe(true); // covers: AC-DV2-503-3
  });
});

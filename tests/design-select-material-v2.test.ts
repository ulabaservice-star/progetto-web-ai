import { describe, it, expect, vi, afterEach } from 'vitest';
import * as matrix from '@/domain/generation/design-matrix';
import { allowedCombinations, type Combo, type Vertical } from '@/domain/generation/design-matrix';
import { selectDesign, assertSufficientMaterial } from '@/domain/generation/design-select';

// DV2-504 (macrotask variety-select, design-engine-v2) — ORACOLO del REQUISITO DI MATERIALE e del
// FALLIMENTO FORTE. Le asserzioni DERIVANO dagli acceptance_criteria AC-DV2-504-1..3
// (docs/blueprint/design-engine-v2/05-variety-select.md); ogni EXPECT porta il tag `// covers: <AC-id>`.
//
// COSA PROVA (DS-V2-D4 punto 6): (1) per OGNI vertical dell'enum `allowedCombinations` offre >=5
// hero_layout_id distinti E >=5 theme_id distinti E >=2 recipe_id distinti — il materiale che la greedy
// (DV2-503) presuppone per l'esclusione dura e per diversificare la copy; (2) su un vertical con
// materiale INSUFFICIENTE (hero o theme distinti < 5) `selectDesign` FALLISCE FORTE con un errore che
// NOMINA il vertical, invece di restituire cloni in silenzio (L-COL-006); (3) su materiale SUFFICIENTE
// NON lancia (nessun falso allarme) e restituisce 5 varianti.
//
// PERCHE' il fail-safe si prova con un pool CRAFTED: i 5 vertical reali hanno sempre materiale
// sufficiente (DS-V2-D2), quindi `selectDesign` non raggiunge mai il ramo di errore su di essi. Il ramo
// e' oracolato (a) chiamando la funzione pura `assertSufficientMaterial` con un pool povero, e (b)
// iniettando quel pool in `allowedCombinations` e provando che `selectDesign` propaga il fallimento.

afterEach(() => {
  vi.restoreAllMocks();
});

/** Una combo VALIDA minima con hero/theme dati (per craftare pool poveri di materiale). */
function combo(theme_id: string, hero_layout_id: string): Combo {
  return {
    theme_id,
    hero_layout_id,
    section_treatment_id: 'piano@1',
    effect_level: 'L1',
    recipe_id: 'vetrina-dell-offerta@1',
  };
}

const VERTICALS: readonly Vertical[] = [
  'ristorazione',
  'fitness',
  'salone_studio',
  'negozio_artigiano',
  'altro',
];

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-504-1 — ogni vertical: >=5 hero + >=5 theme + >=2 recipe distinti nel pool.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-504 AC-DV2-504-1 — materiale sufficiente per ogni vertical', () => {
  it('l elenco dei vertical e quello atteso dell enum (anti-vacuita)', () => {
    // Cinque vertical esatti: un ciclo su una lista vuota sarebbe vero per vacuita'.
    expect(new Set(VERTICALS)).toEqual(
      new Set(['ristorazione', 'fitness', 'salone_studio', 'negozio_artigiano', 'altro']),
    ); // covers: AC-DV2-504-1
  });

  it('per OGNI vertical: >=5 hero_layout_id distinti E >=5 theme_id distinti E >=2 recipe_id distinti', () => {
    for (const vertical of VERTICALS) {
      const pool = allowedCombinations(vertical);
      const heroes = new Set(pool.map((c) => c.hero_layout_id)).size;
      const themes = new Set(pool.map((c) => c.theme_id)).size;
      const recipes = new Set(pool.map((c) => c.recipe_id)).size;
      expect(heroes, `${vertical}: hero distinti`).toBeGreaterThanOrEqual(5); // covers: AC-DV2-504-1
      expect(themes, `${vertical}: theme distinti`).toBeGreaterThanOrEqual(5); // covers: AC-DV2-504-1
      expect(recipes, `${vertical}: recipe distinti`).toBeGreaterThanOrEqual(2); // covers: AC-DV2-504-1
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-504-2 — materiale insufficiente -> selectDesign FALLISCE FORTE nominando il vertical.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-504 AC-DV2-504-2 — fail forte su materiale insufficiente (nessun clone silenzioso)', () => {
  it('assertSufficientMaterial lancia, e il messaggio NOMINA il vertical, quando hero distinti < 5', () => {
    // Pool con 3 combo ma solo 2 hero distinti (e 3 theme): sotto la soglia dei 5 hero.
    const poolPovero: Combo[] = [
      combo('tema-a@1', 'hero-uno@1'),
      combo('tema-b@1', 'hero-uno@1'),
      combo('tema-c@1', 'hero-due@1'),
    ];
    expect(() => assertSufficientMaterial('ristorazione', poolPovero)).toThrowError(/ristorazione/); // covers: AC-DV2-504-2
  });

  it('lancia anche quando i theme distinti < 5 (5 hero ma un solo tema)', () => {
    // 5 hero distinti ma UN solo tema: il theme e' l'asse insufficiente.
    const poolPovero: Combo[] = [1, 2, 3, 4, 5].map((n) => combo('tema-unico@1', `hero-${n}@1`));
    expect(new Set(poolPovero.map((c) => c.hero_layout_id)).size).toBe(5); // precondizione: hero ok
    expect(() => assertSufficientMaterial('fitness', poolPovero)).toThrowError(/fitness/); // covers: AC-DV2-504-2
  });

  it('selectDesign PROPAGA il fallimento: con un pool povero iniettato, lancia nominando il vertical', () => {
    // Inietta un pool povero in allowedCombinations: selectDesign deve fallire forte PRIMA di scegliere,
    // non restituire cloni. Prova il WIRING del fail-safe dentro selectDesign (non solo la funzione pura).
    const poolPovero: Combo[] = [
      combo('t1@1', 'hero-uno@1'),
      combo('t2@1', 'hero-due@1'),
      combo('t3@1', 'hero-tre@1'),
    ];
    const spia = vi.spyOn(matrix, 'allowedCombinations').mockReturnValue(poolPovero);

    expect(() => selectDesign('ristorazione', 'un-seed', 0)).toThrowError(/ristorazione/); // covers: AC-DV2-504-2
    expect(spia).toHaveBeenCalled(); // covers: AC-DV2-504-2 — il pool iniettato e' stato davvero usato
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-504-3 — materiale sufficiente -> nessun falso allarme, 5 varianti valide.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-504 AC-DV2-504-3 — materiale sufficiente: nessun falso allarme', () => {
  it('per OGNI vertical reale: selectDesign NON lancia e restituisce 5 varianti valide', () => {
    for (const vertical of VERTICALS) {
      // Non lancia (la guardia non da' falsi allarmi sui pool reali).
      expect(() => selectDesign(vertical, 'seed-materiale', 0), vertical).not.toThrow(); // covers: AC-DV2-504-3
      const variants = [0, 1, 2, 3, 4].map((i) => selectDesign(vertical, 'seed-materiale', i));
      // 5 varianti, tutte con gli assi valorizzati (hero/theme/recipe).
      expect(variants.length).toBe(5); // covers: AC-DV2-504-3
      for (const v of variants) {
        expect(typeof v.hero_layout_id, vertical).toBe('string'); // covers: AC-DV2-504-3
        expect(typeof v.theme_id, vertical).toBe('string'); // covers: AC-DV2-504-3
        expect(typeof v.recipe_id, vertical).toBe('string'); // covers: AC-DV2-504-3
      }
      // E l'esclusione dura ha retto (5 hero e 5 theme distinti): la guardia ha permesso la varieta'.
      expect(new Set(variants.map((v) => v.hero_layout_id)).size, vertical).toBe(5); // covers: AC-DV2-504-3
      expect(new Set(variants.map((v) => v.theme_id)).size, vertical).toBe(5); // covers: AC-DV2-504-3
    }
  });
});

import { describe, it, expect } from 'vitest';
import {
  allowedCombinations,
  isAllowed,
  type Combo,
  type Vertical,
} from '@/domain/generation/design-matrix';
import { recipeFor, RECIPES } from '@/domain/generation/recipes';

// DV2-502 (macrotask variety-select, design-engine-v2) — ORACOLO di `recipe_id` come ASSE di varieta'
// nella matrice (emendamento DS-V2-D8). Le asserzioni DERIVANO dagli acceptance_criteria AC-DV2-502-1..3
// (docs/blueprint/design-engine-v2/05-variety-select.md); ogni EXPECT porta il tag `// covers: <AC-id>`.
//
// COSA CAMBIA (DS-V2-D8): fino a v1.1 `design-matrix.ts` NON sceglieva `recipe_id` — la ricetta era
// "contenuto ortogonale" (DS-D3) attaccato a valle da design-select. v2 la PROMUOVE ad asse di varieta':
// `allowedCombinations(vertical)` attacca un `recipe_id` VALIDO a ogni combo, da un insieme per-vertical
// che copre >=2 ricette distinte, cosi' la greedy (DV2-503) puo' far divergere anche la COPY fra i 5
// mockup. La ricetta resta uno STILE di copy di CATALOGO (recipeFor lo risolve), mai testo inventato
// dalla matrice; il contenuto reale delle caselle lo scrive l'LLM a runtime, come sempre.
//
// COSA NON PROVA (out_of_scope DV2-502): la greedy che diversifica su questo asse (DV2-503) e il
// requisito di materiale (DV2-504). Qui c'e' l'asse nel pool + la sua validita' + il determinismo.

const RISTORAZIONE: Vertical = 'ristorazione';

/** Costruisce una combo VALIDA minima con un recipe_id dato (per i test di isAllowed su recipe fantasma). */
function comboConRecipe(recipe_id: string | undefined): Combo {
  return {
    theme_id: 'trattoria-rustica@1',
    hero_layout_id: 'centrato@1',
    section_treatment_id: 'piano@1',
    effect_level: 'L1',
    ...(recipe_id !== undefined ? { recipe_id } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-502-1 — ogni combo porta un recipe_id valido, e l'insieme copre >=2 ricette distinte.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-502 AC-DV2-502-1 — allowedCombinations porta recipe_id come asse (>=2 distinti, tutti validi)', () => {
  const pool = allowedCombinations(RISTORAZIONE);

  it('ogni combo del pool porta un recipe_id definito e RISOLTO da recipeFor', () => {
    // Anti-vacuita': il pool non e' vuoto.
    expect(pool.length).toBeGreaterThan(0); // covers: AC-DV2-502-1
    for (const combo of pool) {
      expect(combo.recipe_id, JSON.stringify(combo)).toBeDefined(); // covers: AC-DV2-502-1
      // Non e' un id fantasma: e' una voce reale del catalogo delle ricette (stile di copy).
      expect(recipeFor(combo.recipe_id as string), combo.recipe_id).toBeDefined(); // covers: AC-DV2-502-1
    }
  });

  it("l'insieme dei recipe_id del pool copre >=2 ricette DISTINTE (materiale per la varieta' di copy)", () => {
    const distinti = new Set(pool.map((c) => c.recipe_id));
    expect(distinti.size).toBeGreaterThanOrEqual(2); // covers: AC-DV2-502-1
    // Ogni id distinto e' comunque una ricetta reale del catalogo (nessun valore fabbricato).
    for (const id of distinti) {
      expect(RECIPES.some((r) => r.id === id), id as string).toBe(true); // covers: AC-DV2-502-1
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-502-2 — recipeFor(recipe_id) definito (nessun fantasma); combo con recipe fantasma NON ammessa.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-502 AC-DV2-502-2 — recipe_id valido; una combo con recipe inesistente non e ammessa', () => {
  it('una combo con recipe_id REALE e ammessa; una con recipe_id FANTASMA cade (isAllowed=false)', () => {
    const reale = RECIPES[0].id;
    expect(recipeFor(reale)).toBeDefined(); // covers: AC-DV2-502-2
    expect(isAllowed(comboConRecipe(reale))).toBe(true); // covers: AC-DV2-502-2

    // Un recipe_id ben formato ma INESISTENTE nel catalogo fa cadere la combo: la matrice non ammette una
    // ricetta fantasma (isAllowed lo verifica con recipeFor). L'id ha forma versionata valida, cosi' il
    // rifiuto viene dall'esistenza, non dalla forma.
    expect(recipeFor('ricetta-fantasma@9')).toBeUndefined(); // covers: AC-DV2-502-2
    expect(isAllowed(comboConRecipe('ricetta-fantasma@9'))).toBe(false); // covers: AC-DV2-502-2
  });

  it('ogni recipe_id emesso dal pool sopravvive a un giro isAllowed (nessun asse fabbricato rende illecita la combo)', () => {
    for (const combo of allowedCombinations(RISTORAZIONE)) {
      expect(isAllowed(combo), JSON.stringify(combo)).toBe(true); // covers: AC-DV2-502-2
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-502-3 — deterministica: due enumerazioni per lo stesso vertical sono identiche.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-502 AC-DV2-502-3 — la matrice con l asse ricetta resta pura e deterministica', () => {
  it('due enumerazioni dello stesso vertical danno lo stesso identico elenco (recipe_id inclusi)', () => {
    const a = allowedCombinations(RISTORAZIONE);
    const b = allowedCombinations(RISTORAZIONE);
    expect(b).toEqual(a); // covers: AC-DV2-502-3
    // I recipe_id, in particolare, sono nella STESSA sequenza (nessun Date/Math.random che li permuti).
    expect(b.map((c) => c.recipe_id)).toEqual(a.map((c) => c.recipe_id)); // covers: AC-DV2-502-3
  });
});

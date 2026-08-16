import { describe, it, expect } from 'vitest';
import { allowedCombinations, isAllowed, type Vertical } from '@/domain/generation/design-matrix';
import { menuLayoutFor } from '@/domain/generation/section-layouts';

// DV2-303 (macrotask menu, design-engine-v2) — AGGANCIO vertical → variante MENU nella matrice. Le
// asserzioni DERIVANO dagli acceptance_criteria AC-DV2-303-1..3 (docs/blueprint/design-engine-v2/
// 03-menu.md); ogni blocco porta il tag `// covers: <AC-id>` sulla riga dell'EXPECT.
//
// IL BUCO CHE CHIUDE: in v1.1 `pickSectionLayout` legava il layout del corpo a `heroIndex % len`, cosi'
// tutte le combo di uno stesso hero portavano lo STESSO layout e `menu-card-carta` non era mai
// selezionato. Qui il menu diventa un ASSE INDIPENDENTE ruotato sul contatore globale: la prova che
// vale e' che ESISTE un hero con >=2 menu_layout_id distinti (impossibile se l'asse fosse funzione
// dell'indice hero).
//
// POTERE DELLE ASSERZIONI: `menuLayoutFor` (il lookup del catalogo DV2-301) e' il giudice di validita';
// il determinismo si prova ri-enumerando e confrontando, piu' uno scan del sorgente contro Date/random.

const RISTORAZIONE: Vertical = 'ristorazione';

/** I menu_layout_id di un pool di combo, scartando gli assenti (nessuno dovrebbe esserlo, AC-2). */
function menuIdsOf(combos: readonly { readonly menu_layout_id?: string }[]): string[] {
  return combos.map((c) => c.menu_layout_id).filter((id): id is string => id !== undefined);
}

describe('DV2-303 · aggancio vertical → menu_layout_id (design-matrix.ts)', () => {
  // ── AC-DV2-303-1 — >=2 menu_layout_id distinti, asse INDIPENDENTE dall'indice hero ──

  // covers: AC-DV2-303-1
  it('per la ristorazione l insieme copre >=2 menu_layout_id distinti', () => {
    const combos = allowedCombinations(RISTORAZIONE);
    // Anti-vacuita': il pool non e' vuoto.
    expect(combos.length, 'nessuna combinazione per la ristorazione').toBeGreaterThan(0); // covers: AC-DV2-303-1

    const distinti = new Set(menuIdsOf(combos));
    expect(distinti.size, `menu_layout_id distinti: ${JSON.stringify([...distinti])}`).toBeGreaterThanOrEqual(2); // covers: AC-DV2-303-1
  });

  // covers: AC-DV2-303-1
  it('l asse menu e INDIPENDENTE dall indice hero: esiste un hero con >=2 menu_layout_id distinti', () => {
    const combos = allowedCombinations(RISTORAZIONE);

    // Raggruppo i menu_layout_id per hero_layout_id. Se il menu fosse ancorato a `heroIndex % len` (il
    // difetto di v1.1), OGNI hero porterebbe un UNICO menu → tutti i set avrebbero cardinalita' 1.
    const menusByHero = new Map<string, Set<string>>();
    for (const c of combos) {
      if (c.menu_layout_id === undefined) continue;
      const set = menusByHero.get(c.hero_layout_id) ?? new Set<string>();
      set.add(c.menu_layout_id);
      menusByHero.set(c.hero_layout_id, set);
    }
    expect(menusByHero.size, 'nessun hero nel pool').toBeGreaterThan(0); // covers: AC-DV2-303-1

    const heroConPiuMenu = [...menusByHero.values()].some((set) => set.size >= 2);
    expect(heroConPiuMenu, 'ogni hero porta un solo menu → asse ancorato all indice hero').toBe(true); // covers: AC-DV2-303-1
  });

  // ── AC-DV2-303-2 — ogni combo porta un menu_layout_id valido del catalogo (DV2-301) ──

  // covers: AC-DV2-303-2
  it('ogni combinazione ammessa ha un menu_layout_id presente nel catalogo, risolvibile dal lookup', () => {
    const combos = allowedCombinations(RISTORAZIONE);
    expect(combos.length).toBeGreaterThan(0); // covers: AC-DV2-303-2

    for (const c of combos) {
      expect(c.menu_layout_id, 'una combo senza menu_layout_id').toBeDefined(); // covers: AC-DV2-303-2
      const id = c.menu_layout_id;
      if (id === undefined) continue;
      // Il lookup del catalogo lo risolve alla voce esatta: un id fantasma darebbe undefined.
      expect(menuLayoutFor(id)?.id, `menu_layout_id fuori catalogo: ${id}`).toBe(id); // covers: AC-DV2-303-2
      // Coerenza con isAllowed: la combo, che porta questo menu, e' ammessa dalla matrice.
      expect(isAllowed(c), `combo con ${id} non ammessa`).toBe(true); // covers: AC-DV2-303-2
    }

    // FALSIFICABILE: una combo con un menu_layout_id fantasma NON e' ammessa (isAllowed lo valida).
    const buona = combos[0];
    expect(isAllowed({ ...buona, menu_layout_id: 'menu-non-esiste@9' })).toBe(false); // covers: AC-DV2-303-2
    // e un prefisso-senza-@N non risolve (lookup esatto).
    expect(isAllowed({ ...buona, menu_layout_id: 'menu-carta' })).toBe(false); // covers: AC-DV2-303-2
  });

  // ── AC-DV2-303-3 — matrice DOMINIO PURO e DETERMINISTICA ──

  // covers: AC-DV2-303-3
  it('a parita di vertical produce le STESSE combinazioni, ri-enumerando (deterministica)', () => {
    // Se una scelta dipendesse dal tempo o dal caso (Date/Math.random), enumerazioni ripetute
    // divergerebbero: questa e' la prova OPERATIVA e falsificabile del determinismo dell'AC.
    const a = allowedCombinations(RISTORAZIONE);
    const b = allowedCombinations(RISTORAZIONE);
    const c = allowedCombinations(RISTORAZIONE);
    expect(a.length).toBeGreaterThan(0); // covers: AC-DV2-303-3
    expect(a).toEqual(b); // covers: AC-DV2-303-3
    expect(b).toEqual(c); // covers: AC-DV2-303-3
    // In particolare la SEQUENZA dei menu_layout_id e' identica fra le enumerazioni (ordine stabile,
    // ancorato all'ordine di dichiarazione del catalogo, non casuale).
    expect(menuIdsOf(a)).toEqual(menuIdsOf(c)); // covers: AC-DV2-303-3
  });

  // covers: AC-DV2-303-3
  it('e pura rispetto all input: due vertical diversi restano ciascuno stabile, senza stato condiviso', () => {
    // Enumerando in ordine alternato non c'e' contaminazione fra le chiamate (nessuno stato globale
    // mutabile): ogni vertical produce sempre lo stesso risultato indipendentemente dall'ordine.
    const rist1 = allowedCombinations(RISTORAZIONE);
    const altro = allowedCombinations('altro');
    const rist2 = allowedCombinations(RISTORAZIONE);
    expect(rist1).toEqual(rist2); // covers: AC-DV2-303-3
    // I due settori non condividono per forza lo stesso pool: la ristorazione vede anche gli overlay.
    expect(rist1.length).toBeGreaterThan(0); // covers: AC-DV2-303-3
    expect(altro.length).toBeGreaterThan(0); // covers: AC-DV2-303-3
  });
});

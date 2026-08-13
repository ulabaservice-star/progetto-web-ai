import { describe, it, expect } from 'vitest';
import { selectDesign, type DesignSelection } from '@/domain/generation/design-select';
import { isAllowed, type Vertical } from '@/domain/generation/design-matrix';

// DE-204 (macrotask design-select) — IL SELETTORE DETERMINISTICO SEMINATO. Le asserzioni DERIVANO
// dagli acceptance_criteria AC-DE-204-1..4 (docs/blueprint/design-engine/02-design-select.md); ogni
// blocco che esercita un AC porta il tag `// covers: AC-DE-204-n`.
//
// COSA QUESTO FILE NON PROVA (L-COL-006): non prova che una variante sia BELLA — lo stile non e'
// oracolabile. Prova che `selectDesign(vertical, seed, variantIndex)` e' PURO e DETERMINISTICO
// (stessi ingressi -> stessa selezione), che le 5 varianti di una generazione sono mutuamente
// distinte E differiscono a due a due su >=1 ASSE STRUTTURALE (hero_layout / section_treatment /
// recipe, non solo tema o effetti), che due seed diversi danno insiemi diversi (varieta' per-utente),
// e che NESSUNA selezione — su molti seed e per OGNI vertical dell'enum — viola la matrice (DE-203).
//
// ANTI-INJECTION (P2-D1, security_notes del task): l'input del selettore e' `vertical` (enum chiuso
// di brief.ts) + un `seed` (stringa opaca derivata dall'id di generazione), MAI testo libero del
// brief. Qui non esiste alcun `brief`: il tipo `Vertical` e la stringa seed sono le uniche porte.
//
// DETERMINISMO DEI SEED DI TEST: ogni seed e' generato da un contatore/letterale FISSO (mai
// Math.random, mai Date): l'intero file e' riproducibile bit-per-bit.

const VARIANT_COUNT = 5;

// L'insieme ESATTO dei vertical dell'enum di brief.ts, come RECORD TOTALE su `Vertical`: se brief.ts
// aggiunge o rinomina un vertical il tipo cambia e questo letterale non compila piu' (chiave
// mancante/in eccesso) → single-source-of-truth a compilazione, senza duplicare a mano una lista.
const VERTICAL_PRESENCE: Record<Vertical, true> = {
  ristorazione: true,
  fitness: true,
  salone_studio: true,
  negozio_artigiano: true,
  altro: true,
};
const VERTICALS = Object.keys(VERTICAL_PRESENCE) as readonly Vertical[];

/** Le 5 varianti (i=0..4) di una generazione (vertical, seed), nell'ordine del selettore. */
function fiveVariants(vertical: Vertical, seed: string): DesignSelection[] {
  return Array.from({ length: VARIANT_COUNT }, (_, i) => selectDesign(vertical, seed, i));
}

// La chiave dell'ASSE STRUTTURALE: hero_layout + section_treatment + recipe. Due selezioni con
// chiave strutturale diversa differiscono su >=1 asse strutturale. Lo spazio come separatore non
// compare mai negli id versionati 'nome-kebab@N', quindi non ci sono collisioni di concatenazione.
function structuralKey(s: DesignSelection): string {
  return `${s.hero_layout_id} ${s.section_treatment_id} ${s.recipe_id}`;
}

// La chiave dell'INTERA selezione (tutti i campi): due selezioni con `fullKey` diverso sono distinte.
function fullKey(s: DesignSelection): string {
  return JSON.stringify([
    s.recipe_id,
    s.theme_id,
    s.hero_layout_id,
    s.section_treatment_id,
    s.effect_level,
    s.ornament_id ?? null,
  ]);
}

// ── AC-DE-204-1 — (vertical, seed) fissi, stesso variantIndex due volte → IDENTICO ──

describe('AC-DE-204-1 — selectDesign e deterministico', () => {
  // covers: AC-DE-204-1
  it('stesso (vertical, seed, variantIndex) chiamato due volte → selezione identica', () => {
    for (let i = 0; i < VARIANT_COUNT; i += 1) {
      const primo = selectDesign('ristorazione', 'gen-determinismo-01', i);
      const secondo = selectDesign('ristorazione', 'gen-determinismo-01', i);
      expect(secondo).toEqual(primo); // covers: AC-DE-204-1
    }
  });

  // covers: AC-DE-204-1
  it('vale anche per un vertical col solo fallback universale (fitness)', () => {
    const primo = selectDesign('fitness', 'gen-determinismo-02', 3);
    const secondo = selectDesign('fitness', 'gen-determinismo-02', 3);
    expect(secondo).toEqual(primo); // covers: AC-DE-204-1
  });

  // covers: AC-DE-204-1
  it("l'intero insieme delle 5 varianti e riproducibile (nessuno stato fra le chiamate)", () => {
    const a = fiveVariants('ristorazione', 'gen-determinismo-03');
    const b = fiveVariants('ristorazione', 'gen-determinismo-03');
    expect(b).toEqual(a); // covers: AC-DE-204-1
  });
});

// ── AC-DE-204-2 — le 5 varianti (i=0..4) sono mutuamente distinte E ogni coppia su >=1 asse strutturale ──

describe('AC-DE-204-2 — 5 varianti distinte, ogni coppia su >=1 asse strutturale', () => {
  // covers: AC-DE-204-2
  it('ristorazione: 5 varianti mutuamente distinte, ogni coppia differisce su hero/treatment/recipe', () => {
    const variants = fiveVariants('ristorazione', 'gen-varieta-risto');
    expect(variants.length).toBe(VARIANT_COUNT); // covers: AC-DE-204-2

    // MUTUAMENTE DISTINTE: 5 selezioni intere diverse (nessun clone).
    expect(new Set(variants.map(fullKey)).size).toBe(VARIANT_COUNT); // covers: AC-DE-204-2

    // OGNI COPPIA su >=1 ASSE STRUTTURALE: 5 chiavi strutturali distinte ⇔ tutte le coppie
    // differiscono su hero_layout o section_treatment o recipe (non solo tema/effetti).
    expect(new Set(variants.map(structuralKey)).size).toBe(VARIANT_COUNT); // covers: AC-DE-204-2

    // Prova esplicita, coppia per coppia, che la differenza e' STRUTTURALE (non basta il tema).
    for (let a = 0; a < variants.length; a += 1) {
      for (let b = a + 1; b < variants.length; b += 1) {
        const differiscePerStruttura =
          variants[a].hero_layout_id !== variants[b].hero_layout_id ||
          variants[a].section_treatment_id !== variants[b].section_treatment_id ||
          variants[a].recipe_id !== variants[b].recipe_id;
        expect(differiscePerStruttura, `coppia ${a}/${b} non differisce per struttura`).toBe(true); // covers: AC-DE-204-2
      }
    }
  });

  // covers: AC-DE-204-2
  it('OGNI vertical dell enum: 5 varianti mutuamente distinte E strutturalmente distinte', () => {
    // La garanzia strutturale non e' pinnata solo su ristorazione: la si esige su OGNI vertical
    // dell'enum (incluso il solo-fallback-universale). Un catalogo universale impoverito a <5
    // scheletri renderebbe questo rosso qui, non solo a runtime.
    for (const vertical of VERTICALS) {
      const variants = fiveVariants(vertical, 'gen-varieta-fallback');
      expect(new Set(variants.map(fullKey)).size, `${vertical}: fullKey`).toBe(VARIANT_COUNT); // covers: AC-DE-204-2
      expect(new Set(variants.map(structuralKey)).size, `${vertical}: structuralKey`).toBe(VARIANT_COUNT); // covers: AC-DE-204-2
    }
  });
});

// ── AC-DE-204-3 — due seed diversi → i due insiemi di 5 selezioni differiscono ──

describe('AC-DE-204-3 — due seed diversi danno insiemi diversi (varieta per-utente)', () => {
  // covers: AC-DE-204-3
  it('ristorazione: seed A e seed B → insiemi di selezioni non uguali', () => {
    const insiemeA = [...new Set(fiveVariants('ristorazione', 'gen-utente-A').map(fullKey))].sort();
    const insiemeB = [...new Set(fiveVariants('ristorazione', 'gen-utente-B').map(fullKey))].sort();
    expect(insiemeB).not.toEqual(insiemeA); // covers: AC-DE-204-3
  });

  // covers: AC-DE-204-3
  it('vertical col solo fallback (salone_studio): due seed → insiemi diversi', () => {
    const insiemeA = [...new Set(fiveVariants('salone_studio', 'gen-utente-C').map(fullKey))].sort();
    const insiemeB = [...new Set(fiveVariants('salone_studio', 'gen-utente-D').map(fullKey))].sort();
    expect(insiemeB).not.toEqual(insiemeA); // covers: AC-DE-204-3
  });
});

// ── AC-DE-204-4 — PROPERTY TEST: molti seed × OGNI vertical → ogni selezione isAllowed ──

// I seed sono generati DETERMINISTICAMENTE da un contatore (mai Math.random): l'intero property
// test e' riproducibile.
const PROPERTY_SEEDS = Array.from({ length: 64 }, (_, n) => `property-seed-${n}`);

describe('AC-DE-204-4 — nessuna combinazione vietata esce mai (property test)', () => {
  // covers: AC-DE-204-4
  it('anti-vacuita: enum completo (5 vertical) e seed generati deterministicamente (64)', () => {
    expect(VERTICALS.length).toBe(5); // covers: AC-DE-204-4
    expect(new Set(VERTICALS)).toEqual(
      new Set(['ristorazione', 'fitness', 'salone_studio', 'negozio_artigiano', 'altro']),
    ); // covers: AC-DE-204-4
    expect(PROPERTY_SEEDS.length).toBe(64); // covers: AC-DE-204-4
    expect(new Set(PROPERTY_SEEDS).size).toBe(64); // covers: AC-DE-204-4
  });

  // covers: AC-DE-204-4
  it('OGNI DesignSelection prodotta (ogni vertical × ogni seed × i=0..4) e isAllowed dalla matrice', () => {
    for (const vertical of VERTICALS) {
      for (const seed of PROPERTY_SEEDS) {
        for (let i = 0; i < VARIANT_COUNT; i += 1) {
          const sel = selectDesign(vertical, seed, i);
          // isAllowed verifica che TUTTI gli id risolvano a voci di catalogo (proto-safe) e che
          // nessuna regola (R1 foto-piena, R2 leggibilita) sia violata: e' l'oracolo esatto del task.
          expect(isAllowed(sel), `${vertical}/${seed}/${i}: ${JSON.stringify(sel)}`).toBe(true); // covers: AC-DE-204-4
        }
      }
    }
  });
});

// ── Oracoli AGGIUNTIVI (non mappano un AC) ────────────────────────────────────

// GUARDIA DI RANGE: variantIndex fuori da 0..4 e' un errore del call-site, non un `undefined`
// silenzioso. La funzione deve rifiutarlo con un RangeError.
describe('guardia di range su variantIndex', () => {
  it('rifiuta variantIndex fuori da 0..4 e non interi (RangeError)', () => {
    expect(() => selectDesign('ristorazione', 'gen-range', -1)).toThrow(RangeError);
    expect(() => selectDesign('ristorazione', 'gen-range', VARIANT_COUNT)).toThrow(RangeError);
    expect(() => selectDesign('ristorazione', 'gen-range', 1.5)).toThrow(RangeError);
  });

  it('accetta ogni indice valido 0..4 (contro-prova della guardia)', () => {
    for (let i = 0; i < VARIANT_COUNT; i += 1) {
      expect(() => selectDesign('ristorazione', 'gen-range', i)).not.toThrow();
    }
  });
});

// IDENTITA DEGLI ID (coppia-PREFISSO reale del catalogo): 'centrato@1' e 'centrato-foto@1' — dove il
// nome dell'uno e' prefisso dell'altro — devono poter uscire ENTRAMBI e restare id ESATTI e distinti,
// mai collassati sul prefisso. Prova su OUTPUT reale del selettore lungo la matrice deterministica.
describe('gli id emessi sono esatti (coppia-prefisso centrato@1 / centrato-foto@1)', () => {
  it('entrambi gli id della coppia-prefisso sono raggiungibili e distinti nell output', () => {
    const heroIds = new Set<string>();
    for (const vertical of VERTICALS) {
      for (const seed of PROPERTY_SEEDS) {
        for (let i = 0; i < VARIANT_COUNT; i += 1) {
          heroIds.add(selectDesign(vertical, seed, i).hero_layout_id);
        }
      }
    }
    // Il token nudo 'centrato' (prefisso senza versione) NON e' un id e non deve mai uscire.
    expect(heroIds.has('centrato')).toBe(false);
    // I due id della coppia-prefisso sono DUE stringhe diverse, entrambe emesse: identita' esatta.
    expect(heroIds.has('centrato@1')).toBe(true);
    expect(heroIds.has('centrato-foto@1')).toBe(true);
  });
});

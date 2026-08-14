import { describe, it, expect } from 'vitest';
import {
  selectDesign,
  type DesignSelection,
  type DesignSignals,
} from '@/domain/generation/design-select';
import { isAllowed, type Vertical } from '@/domain/generation/design-matrix';

// DE11-204 (macrotask variety-engine, design-engine-v1.1) — IL SELETTORE PLUGGABILE + DISTINZIONE
// RAFFORZATA. Le asserzioni DERIVANO dagli acceptance_criteria AC-DE11-204-1..5; ogni riga che esercita
// un AC porta il tag `// covers: AC-DE11-204-n`. Questo file NON tocca tests/design-select.test.ts (v1),
// che resta valido: i nuovi assi sono OPZIONALI e la garanzia rafforzata (5 hero distinti) IMPLICA la
// vecchia (5 scheletri distinti), quindi non regredisce.
//
// COSA PROVA (rispetto a v1): che `selectDesign(vertical, seed, variantIndex, signals?)` e' PURO e
// DETERMINISTICO anche col 4o argomento (con/senza/arbitrario), che il PIANO A IGNORA `signals`
// (uscita identica), che le 5 varianti hanno hero_layout_id a due a due DIVERSI (tutti e 5, piu' forte
// della vecchia chiave hero+trattamento) E differiscono su >=1 ASSE DEL CORPO (section_layout / ricetta
// / nastro / illustrazione), che seed diversi danno insiemi diversi, che NESSUNA selezione — su molti
// seed e per OGNI vertical dell'enum — viola la matrice (DE11-203), e che la selezione TRASPORTA i nuovi
// assi (h1_treatment_id / section_layout_id sempre popolati) con id ESATTI e versionati.
//
// COSA NON PROVA (L-COL-006): non prova che una variante sia BELLA — lo stile non e' oracolabile.
//
// ANTI-INJECTION (P2-D1, security_notes del task): gli ingressi del selettore sono `vertical` (enum
// chiuso di brief.ts) + `seed` (stringa opaca) + `signals` (flag booleani DERIVATI), MAI testo libero
// del brief. Qui non esiste alcun `brief`: `DesignSignals` e' un record di booleani si'/no, non prosa.
//
// DETERMINISMO DEI SEED DI TEST: ogni seed nasce da un contatore/letterale FISSO (mai Math.random, mai
// Date): l'intero file e' riproducibile bit-per-bit.

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

// LETTERALI di catalogo scritti A MANO, NON importati dai cataloghi: il lato ATTESO di un'uguaglianza
// non deve essere il binding che l'implementazione risolve, o la prova sarebbe tautologica (X===X).
// DISCIPLINA FIXTURE: >1 elemento, valori DISCORDANTI e un id che e' PREFISSO di un altro
// ('occhiello@1' prefisso di 'occhiello-corsivo@1'; 'contatti-scheda@1' prefisso di
// 'contatti-scheda-mappa@1'), cosi' le prove sull'identita' esatta non passano per caso.
const H1_TREATMENT_IDS: readonly string[] = [
  'accento-ondulato@1',
  'occhiello@1',
  'occhiello-corsivo@1',
];
const SECTION_LAYOUT_IDS: readonly string[] = [
  'chi-siamo-ritratto@1',
  'chi-siamo-timeline@1',
  'orari-tabella@1',
  'orari-griglia@1',
  'contatti-scheda@1',
  'contatti-scheda-mappa@1',
  'menu-card-carta@1',
];

/** Le 5 varianti (i=0..4) di una generazione (vertical, seed), nell'ordine del selettore. */
function fiveVariants(vertical: Vertical, seed: string): DesignSelection[] {
  return Array.from({ length: VARIANT_COUNT }, (_, i) => selectDesign(vertical, seed, i));
}

// La chiave dell'INTERA selezione (TUTTI gli assi, inclusi i nuovi di DE11-203): due selezioni con
// `fullKey` diverso sono distinte. Gli assi opzionali assenti diventano `null`, distinto da ogni id.
function fullKey(s: DesignSelection): string {
  return JSON.stringify([
    s.recipe_id,
    s.theme_id,
    s.hero_layout_id,
    s.section_treatment_id,
    s.effect_level,
    s.ornament_id ?? null,
    s.h1_treatment_id ?? null,
    s.section_layout_id ?? null,
    s.ribbon_id ?? null,
    s.illustration_id ?? null,
  ]);
}

// La chiave dei SOLI ASSI DEL CORPO (la pagina SOTTO l'hero): il layout di sezione, il nastro,
// l'illustrazione e la RICETTA (che decide quali sezioni e in che ordine — il contenuto). NON include
// hero/tema/effetto/titolo/ornamento. Due selezioni con `bodyKey` diverso differiscono su >=1 asse del
// corpo. La ricetta e' sempre presente (per costruzione del selettore), quindi la chiave non e' vuota.
function bodyKey(s: DesignSelection): string {
  return JSON.stringify([
    s.section_layout_id ?? null,
    s.ribbon_id ?? null,
    s.illustration_id ?? null,
    s.recipe_id,
  ]);
}

// ── AC-DE11-204-1 — (vertical, seed) fissi, stesso variantIndex due volte → IDENTICO (anche signals) ──

describe('AC-DE11-204-1 — selectDesign deterministico (identico con/senza signals)', () => {
  // covers: AC-DE11-204-1
  it('stesso (vertical, seed, variantIndex) due volte → identico; signals non altera nulla', () => {
    const SIGNALS: DesignSignals = { haFoto: true, cercaMovimento: false, densoDiContenuti: true };
    for (let i = 0; i < VARIANT_COUNT; i += 1) {
      const senza1 = selectDesign('ristorazione', 'gen-det-01', i);
      const senza2 = selectDesign('ristorazione', 'gen-det-01', i);
      const con1 = selectDesign('ristorazione', 'gen-det-01', i, SIGNALS);
      const con2 = selectDesign('ristorazione', 'gen-det-01', i, SIGNALS);
      expect(senza2).toEqual(senza1); // covers: AC-DE11-204-1
      expect(con2).toEqual(con1); // covers: AC-DE11-204-1
      // Con signals ARBITRARI l'uscita coincide con quella SENZA: il Piano A lo ignora (anche AC-5).
      expect(con1).toEqual(senza1); // covers: AC-DE11-204-1
    }
  });

  // covers: AC-DE11-204-1
  it("l'intero insieme delle 5 varianti e' riproducibile (nessuno stato fra le chiamate)", () => {
    const a = fiveVariants('negozio_artigiano', 'gen-det-02');
    const b = fiveVariants('negozio_artigiano', 'gen-det-02');
    expect(b).toEqual(a); // covers: AC-DE11-204-1
  });

  // covers: AC-DE11-204-1
  it('vale anche per un vertical col solo fallback universale (fitness)', () => {
    const primo = selectDesign('fitness', 'gen-det-03', 3);
    const secondo = selectDesign('fitness', 'gen-det-03', 3);
    expect(secondo).toEqual(primo); // covers: AC-DE11-204-1
  });
});

// ── AC-DE11-204-2 — 5 varianti: hero tutti diversi E ogni coppia su >=1 asse del corpo ──

describe('AC-DE11-204-2 — 5 varianti: hero a due a due diversi E >=1 asse del corpo per coppia', () => {
  // covers: AC-DE11-204-2
  it('OGNI vertical: le 5 varianti hanno hero_layout_id a due a due DIVERSI (tutti e 5 distinti)', () => {
    for (const vertical of VERTICALS) {
      const variants = fiveVariants(vertical, 'gen-hero-distinti');
      expect(variants.length, `${vertical}`).toBe(VARIANT_COUNT); // covers: AC-DE11-204-2
      const heroes = variants.map((v) => v.hero_layout_id);
      expect(new Set(heroes).size, `${vertical}: hero non tutti distinti`).toBe(VARIANT_COUNT); // covers: AC-DE11-204-2
    }
  });

  // covers: AC-DE11-204-2
  it('OGNI vertical: ogni coppia differisce su hero_layout_id E su >=1 asse del corpo', () => {
    for (const vertical of VERTICALS) {
      const variants = fiveVariants(vertical, 'gen-coppie-corpo');
      for (let a = 0; a < variants.length; a += 1) {
        for (let b = a + 1; b < variants.length; b += 1) {
          expect(
            variants[a].hero_layout_id,
            `${vertical} ${a}/${b}: stesso hero`,
          ).not.toEqual(variants[b].hero_layout_id); // covers: AC-DE11-204-2
          expect(
            bodyKey(variants[a]),
            `${vertical} ${a}/${b}: corpo identico (nessun asse del corpo differisce)`,
          ).not.toEqual(bodyKey(variants[b])); // covers: AC-DE11-204-2
        }
      }
    }
  });

  // covers: AC-DE11-204-2
  it('OGNI vertical: anche il LAYOUT DEL CORPO (section_layout_id) e distinto fra le 5 varianti', () => {
    for (const vertical of VERTICALS) {
      const variants = fiveVariants(vertical, 'gen-corpo-distinto');
      const layouts = variants.map((v) => v.section_layout_id ?? null);
      // Il corpo non e' piu' "sempre lo stesso testo impilato" (difetto v1): ai 5 hero distinti la
      // matrice ancora 5 layout di sezione distinti (DE11-203), che la selezione trasporta. Nessun
      // `null` (l'asse e' sempre popolato) e 5 valori a due a due diversi.
      expect(layouts.every((l) => l !== null), `${vertical}: un section_layout_id manca`).toBe(true); // covers: AC-DE11-204-2
      expect(new Set(layouts).size, `${vertical}: layout di corpo non tutti distinti`).toBe(VARIANT_COUNT); // covers: AC-DE11-204-2
    }
  });

  // covers: AC-DE11-204-2
  it('OGNI vertical: anche la RICETTA (recipe_id) e distinta fra le 5 varianti (2 asse del corpo)', () => {
    for (const vertical of VERTICALS) {
      const variants = fiveVariants(vertical, 'gen-ricetta-distinta');
      const ricette = variants.map((v) => v.recipe_id);
      // La ricetta e' un ULTERIORE asse del CORPO (rotazione seminata su 5 ricette distinte, DE11-204):
      // senza questa asserzione una mutazione che rendesse la ricetta COSTANTE sui 5 varianti
      // sopravviverebbe, perche' la distinzione del corpo la porterebbe da sola `section_layout_id`. Qui
      // la ricetta ha i suoi denti.
      expect(new Set(ricette).size, `${vertical}: ricette non tutte distinte`).toBe(VARIANT_COUNT); // covers: AC-DE11-204-2
    }
  });

  // covers: AC-DE11-204-2
  it('OGNI vertical: 5 varianti mutuamente distinte per intero (nessun clone)', () => {
    for (const vertical of VERTICALS) {
      const variants = fiveVariants(vertical, 'gen-mutue');
      expect(new Set(variants.map(fullKey)).size, `${vertical}`).toBe(VARIANT_COUNT); // covers: AC-DE11-204-2
    }
  });
});

// ── AC-DE11-204-3 — due seed diversi → i due insiemi di 5 selezioni differiscono ──

describe('AC-DE11-204-3 — due seed diversi danno insiemi diversi (varieta per-utente)', () => {
  // Batch deterministico di seed (contatore fisso, mai Math.random/Date): riproducibile bit-per-bit.
  const SEEDS = Array.from({ length: 24 }, (_, n) => `gen-seed-${n}`);

  // L'insieme (ordinato e deduplicato) delle 5 selezioni di una generazione, come stringa confrontabile.
  function designSet(vertical: Vertical, seed: string): string {
    return JSON.stringify([...new Set(fiveVariants(vertical, seed).map(fullKey))].sort());
  }

  // covers: AC-DE11-204-3
  it('OGNI vertical: 24 seed NON collassano tutti allo stesso insieme (>=2 insiemi distinti)', () => {
    for (const vertical of VERTICALS) {
      const insiemi = SEEDS.map((s) => designSet(vertical, s));
      // Se il seed conta, i 24 insiemi non possono essere tutti identici; >=2 distinti ⇒ (principio dei
      // cassetti) ESISTE almeno una coppia di seed con insiemi diversi. Prova l'AC senza scommettere su
      // una singola coppia hard-coded, quindi robusto alla crescita del catalogo che perturba lo shuffle.
      expect(
        new Set(insiemi).size,
        `${vertical}: tutti i 24 seed danno lo stesso insieme (seed ignorato?)`,
      ).toBeGreaterThan(1); // covers: AC-DE11-204-3
    }
  });

  // covers: AC-DE11-204-3
  it('ristorazione: coppia TESTIMONE (primo seed vs primo diverso) → insiemi non uguali', () => {
    const insiemi = SEEDS.map((s) => designSet('ristorazione', s));
    const primo = insiemi[0];
    // La coppia esiste per il test sopra; la NOMINIAMO per rendere esplicito "seed A ≠ seed B → insiemi
    // diversi" senza dipendere dal caso (scelta dinamica del primo seed che differisce dal primo).
    const indiceDiverso = insiemi.findIndex((x) => x !== primo);
    expect(indiceDiverso, 'nessun seed del batch differisce dal primo').toBeGreaterThan(0); // covers: AC-DE11-204-3
    expect(insiemi[indiceDiverso]).not.toEqual(primo); // covers: AC-DE11-204-3
  });
});

// ── AC-DE11-204-4 — PROPERTY TEST: molti seed × OGNI vertical → ogni selezione isAllowed ──

describe('AC-DE11-204-4 — nessuna selezione vietata esce mai (property test)', () => {
  const SEEDS_PER_VERTICAL = 48;

  // covers: AC-DE11-204-4
  it('anti-vacuita: enum completo (5 vertical) e conteggio dei seed deterministici', () => {
    expect(VERTICALS.length).toBe(5); // covers: AC-DE11-204-4
    expect(new Set(VERTICALS)).toEqual(
      new Set(['ristorazione', 'fitness', 'salone_studio', 'negozio_artigiano', 'altro']),
    ); // covers: AC-DE11-204-4
    expect(SEEDS_PER_VERTICAL).toBeGreaterThanOrEqual(32); // covers: AC-DE11-204-4
  });

  // covers: AC-DE11-204-4
  it('OGNI DesignSelection (ogni vertical × molti seed × i=0..4) e isAllowed dalla matrice', () => {
    for (const vertical of VERTICALS) {
      for (let n = 0; n < SEEDS_PER_VERTICAL; n += 1) {
        // Seed deterministici nella forma 'v-'+vertical+'-'+i (mai Math.random): riproducibili.
        const seed = `v-${vertical}-${n}`;
        for (let i = 0; i < VARIANT_COUNT; i += 1) {
          const sel = selectDesign(vertical, seed, i);
          // isAllowed verifica che TUTTI gli id (inclusi i nuovi assi) risolvano a voci di catalogo
          // (proto-safe) e che nessuna regola (R1 foto-piena, R2 leggibilita, R3 hero↔illustrazione)
          // sia violata: e' l'oracolo esatto del task.
          expect(isAllowed(sel), `${vertical}/${seed}/${i}: ${JSON.stringify(sel)}`).toBe(true); // covers: AC-DE11-204-4
        }
      }
    }
  });

  // covers: AC-DE11-204-4
  it('ogni selezione TRASPORTA gli assi DE11-203 sempre popolati (h1_treatment_id, section_layout_id)', () => {
    for (const vertical of VERTICALS) {
      for (let i = 0; i < VARIANT_COUNT; i += 1) {
        const sel = selectDesign(vertical, `assi-${vertical}`, i);
        // La matrice popola SEMPRE questi due assi (nessun caso "nessuno"): la selezione DEVE
        // trasportarli, o il documento non potrebbe congelarli e la varieta' di titolo/corpo si
        // perderebbe. Uccide una mutazione che li lasciasse cadere nel map. Lato ATTESO = letterali.
        expect(sel.h1_treatment_id, `${vertical}/${i}: h1_treatment_id assente`).toBeDefined(); // covers: AC-DE11-204-4
        expect(
          H1_TREATMENT_IDS.includes(sel.h1_treatment_id ?? ''),
          `${vertical}/${i}: h1_treatment_id fuori catalogo`,
        ).toBe(true); // covers: AC-DE11-204-4
        expect(sel.section_layout_id, `${vertical}/${i}: section_layout_id assente`).toBeDefined(); // covers: AC-DE11-204-4
        expect(
          SECTION_LAYOUT_IDS.includes(sel.section_layout_id ?? ''),
          `${vertical}/${i}: section_layout_id fuori catalogo`,
        ).toBe(true); // covers: AC-DE11-204-4
      }
    }
  });
});

// ── AC-DE11-204-5 — signals opzionale: senza vs con signals arbitrari → output IDENTICO ──

describe('AC-DE11-204-5 — signals opzionale, IGNORATO nel Piano A (output identico)', () => {
  // Casi arbitrari (incluso il vuoto): flag DISCORDANTI, mai testo libero (record di booleani).
  const CASI_SIGNALS: readonly DesignSignals[] = [
    {},
    { haFoto: true },
    { haFoto: false, cercaMovimento: true, densoDiContenuti: true },
  ];

  // covers: AC-DE11-204-5
  it('la firma accetta l opzionale; output IDENTICO con/senza signals (anche arbitrari), OGNI vertical', () => {
    for (const vertical of VERTICALS) {
      for (let i = 0; i < VARIANT_COUNT; i += 1) {
        const base = selectDesign(vertical, 'gen-signals', i);
        for (const signals of CASI_SIGNALS) {
          expect(
            selectDesign(vertical, 'gen-signals', i, signals),
            `${vertical}/${i}: signals ha alterato l'uscita`,
          ).toEqual(base); // covers: AC-DE11-204-5
        }
      }
    }
  });
});

// ── Oracoli AGGIUNTIVI (non mappano un AC) ────────────────────────────────────

// GUARDIA DI RANGE: variantIndex fuori da 0..4 e' un errore del call-site, non un `undefined`
// silenzioso. La funzione deve rifiutarlo con un RangeError — anche quando `signals` e' presente
// (l'ordine dei controlli non dipende da signals).
describe('guardia di range su variantIndex (RangeError)', () => {
  it('rifiuta variantIndex fuori da 0..4 e non interi', () => {
    expect(() => selectDesign('ristorazione', 'gen-range', -1)).toThrow(RangeError);
    expect(() => selectDesign('ristorazione', 'gen-range', VARIANT_COUNT)).toThrow(RangeError);
    expect(() => selectDesign('ristorazione', 'gen-range', 1.5)).toThrow(RangeError);
    expect(() => selectDesign('ristorazione', 'gen-range', -1, { haFoto: true })).toThrow(RangeError);
  });

  it('accetta ogni indice valido 0..4', () => {
    for (let i = 0; i < VARIANT_COUNT; i += 1) {
      expect(() => selectDesign('ristorazione', 'gen-range', i)).not.toThrow();
    }
  });
});

// IDENTITA DEGLI ID (coppie-PREFISSO reali) su OUTPUT reale del selettore, raccolto UNA VOLTA su molti
// seed deterministici e OGNI vertical. Prova che gli id emessi sono ESATTI e versionati, mai il token
// nudo (prefisso senza @N): la stessa trappola di 'centrato'/'centrato-foto' negli hero e
// 'contatti-scheda'/'contatti-scheda-mappa' nei layout di sezione.
const EMITTED_HERO_IDS = new Set<string>();
const EMITTED_SECTION_LAYOUT_IDS = new Set<string>();
for (const vertical of VERTICALS) {
  for (let n = 0; n < 48; n += 1) {
    for (let i = 0; i < VARIANT_COUNT; i += 1) {
      const sel = selectDesign(vertical, `esatti-${vertical}-${n}`, i);
      EMITTED_HERO_IDS.add(sel.hero_layout_id);
      if (sel.section_layout_id !== undefined) EMITTED_SECTION_LAYOUT_IDS.add(sel.section_layout_id);
    }
  }
}

describe('gli id emessi sono ESATTI e mai per prefisso (coppie-prefisso reali del catalogo)', () => {
  it('hero: centrato@1 e centrato-foto@1 entrambi emessi e distinti, mai il nudo "centrato"', () => {
    // I 5 hero universali compaiono tutti per ogni vertical (dedup per hero), quindi la coppia-prefisso
    // e' raggiungibile su output reale.
    expect(EMITTED_HERO_IDS.has('centrato')).toBe(false);
    expect(EMITTED_HERO_IDS.has('centrato@1')).toBe(true);
    expect(EMITTED_HERO_IDS.has('centrato-foto@1')).toBe(true);
  });

  it('section_layout: contatti-scheda@1 emesso, mai il nudo "contatti-scheda"', () => {
    // 'contatti-scheda@1' e' il layout ancorato all'hero editoriale-illustrato@1 (sempre fra i 5 hero
    // universali) → raggiungibile; il token nudo 'contatti-scheda' non e' un id e non deve mai uscire.
    expect(EMITTED_SECTION_LAYOUT_IDS.has('contatti-scheda')).toBe(false);
    expect(EMITTED_SECTION_LAYOUT_IDS.has('contatti-scheda@1')).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import {
  DESIGN_SELECTION_DEFAULTS,
  parseDocument,
  type SiteDocument,
} from '@/domain/generation/document';

// DE-205 (macrotask design-select) — FREEZE degli id di SELEZIONE nel documento. Le asserzioni
// derivano dagli acceptance_criteria AC-DE-205-1..3 (docs/blueprint/design-engine/02-design-select.md).
// Dominio PURO: nessun DB, nessun client Supabase, nessuna rete, nessun tempo.
//
// COSA AGGIUNGE DE-205 A `SiteDocumentSchema`: quattro manopole visive congelate (DS-D4) — un
// hero_layout_id, un section_treatment_id, un effect_level (enum L0..L4) e un ornament_id opzionale.
// Sono OPZIONALI per retro-compatibilita': un documento in formato P4 non li porta e valida ancora,
// col GATE che applica i default (`DESIGN_SELECTION_DEFAULTS`), ornament_id escluso. Congelarli nel
// documento — invece di riderivarli al render — e' cio' che impedisce a un sito pubblicato di
// re-stilarsi da solo dopo un ritocco ai cataloghi (DS-D4).
//
// COME SONO VALIDATI: sono FORMA-check, esattamente come recipe_id/theme_id (T-202). Gli id sono
// versionati 'nome@N'; effect_level e' l'ENUM chiuso {L0..L4}. `parseDocument` NON li confronta coi
// cataloghi DE-201/DE-202 (quello e' un existence-check di un altro strato): un id ben formato ma
// inesistente passa la forma. Cio' che il gate NON tollera — un effect_level fuori dai cinque livelli,
// un id non versionato — fa cadere l'INTERO documento (invariante P2/P4: un documento malformato cade
// tutto). L'assunzione che i cinque simboli e i tre default coincidano coi cataloghi DE-201/DE-202 e'
// documentata in document.ts, non importata (altitudine: document.ts fa solo format-check).
//
// Disciplina delle fixture: mai un solo elemento — la home ha DUE blocchi con contenuti DISCORDANTI e
// id in cui uno e' PREFISSO dell'altro ('hero' / 'hero-2') — e gli id di selezione provati includono
// una coppia in cui uno e' PREFISSO dell'altro ('centrato@1' / 'centrato-foto@1'): la forma versionata
// deve conservare l'id ESATTO, mai una radice normalizzata per prefisso.

// Le fixture sono LASCHE nel tipo: devono poter portare un effect_level fuori vocabolario e id
// malformati — cioe' cio' che il gate deve rifiutare, e che un tipo stretto renderebbe inscrivibile.
type BloccoFixture = {
  id: string;
  content: Record<string, unknown>;
  data: Record<string, unknown>;
  brief_fields_rendered: string[];
  images: Record<string, unknown>[];
};
type PaginaFixture = {
  slug: string;
  role: string;
  title: string;
  meta_description: string;
  blocks: BloccoFixture[];
};
type DocumentoFixture = {
  recipe_id: string;
  theme_id: string;
  pages: PaginaFixture[];
  hero_layout_id?: unknown;
  section_treatment_id?: unknown;
  effect_level?: unknown;
  ornament_id?: unknown;
};

// Gli id VERSIONATI di ricetta e tema (come T-202): valori DISCORDANTI fra loro.
const RICETTA = 'aurora-lineare@3';
const TEMA = 'terracotta-chiara@7';

/** Il primo blocco della home. 'hero' e' PREFISSO di 'hero-2' (vedi `bloccoAbout`). */
function bloccoHero(): BloccoFixture {
  return {
    id: 'hero',
    content: { hero_title: 'Il pane a lievitazione naturale di via Roma' },
    data: {},
    brief_fields_rendered: [],
    images: [],
  };
}

/** Il secondo blocco: id 'hero-2' (con 'hero' prefisso) e contenuto DISCORDANTE dal primo. */
function bloccoAbout(): BloccoFixture {
  return {
    id: 'hero-2',
    content: { about_title: 'Chi siamo' },
    data: {},
    brief_fields_rendered: [],
    images: [],
  };
}

function paginaHome(): PaginaFixture {
  return {
    slug: 'home',
    role: 'home',
    title: 'Panificio Aurora — pane a lievitazione naturale',
    meta_description: 'Il pane a lievitazione naturale di via Roma, sfornato tre volte al giorno.',
    blocks: [bloccoHero(), bloccoAbout()],
  };
}

/** Un documento in FORMATO P4: NESSUN campo di selezione design. */
function documentoP4(): DocumentoFixture {
  return { recipe_id: RICETTA, theme_id: TEMA, pages: [paginaHome()] };
}

function accettato(res: ReturnType<typeof parseDocument>): SiteDocument {
  if (!res.ok) throw new Error(`il documento doveva validare: ${JSON.stringify(res.error.issues)}`);
  return res.document;
}

function rifiutato(res: ReturnType<typeof parseDocument>) {
  if (res.ok) throw new Error(`il documento NON doveva validare: ${JSON.stringify(res.document)}`);
  return res.error.issues;
}

/** Cio' che parseDocument restituisce davvero, serializzato: per "il valore ostile non sopravvive". */
function serializza(res: ReturnType<typeof parseDocument>): string {
  return JSON.stringify(res.ok ? res.document : res.error.issues);
}

describe('DE-205 AC-DE-205-1 — i campi di selezione validi sono registrati nel documento', () => {
  // covers: AC-DE-205-1
  it('accetta un documento coi quattro campi validi e li CONSERVA esatti e distinti', () => {
    // Valori DISCORDANTI su tutti gli assi, cosi' che uno scambio fra due campi si veda.
    const input: DocumentoFixture = {
      ...documentoP4(),
      hero_layout_id: 'centrato-foto@1',
      section_treatment_id: 'a-scheda@1',
      effect_level: 'L3',
      ornament_id: 'watermark-cibo@1',
    };
    const documento = accettato(parseDocument(input)); // covers: AC-DE-205-1

    expect(documento.hero_layout_id).toBe('centrato-foto@1'); // covers: AC-DE-205-1
    expect(documento.section_treatment_id).toBe('a-scheda@1'); // covers: AC-DE-205-1
    expect(documento.effect_level).toBe('L3'); // covers: AC-DE-205-1
    expect(documento.ornament_id).toBe('watermark-cibo@1'); // covers: AC-DE-205-1

    // Nessun campo e' letto al posto di un altro: gli id sono a due a due diversi.
    expect(documento.hero_layout_id).not.toBe(documento.section_treatment_id); // covers: AC-DE-205-1
    expect(documento.hero_layout_id).not.toBe(documento.ornament_id); // covers: AC-DE-205-1

    // I default NON hanno soppiantato i valori presenti (i presenti vincono).
    expect(documento.hero_layout_id).not.toBe(DESIGN_SELECTION_DEFAULTS.hero_layout_id); // covers: AC-DE-205-1
    expect(documento.effect_level).not.toBe(DESIGN_SELECTION_DEFAULTS.effect_level); // covers: AC-DE-205-1
  });

  // covers: AC-DE-205-1
  it('non confonde due id in cui uno e PREFISSO dell altro: centrato@1 resta centrato@1', () => {
    // 'centrato' e' PREFISSO di 'centrato-foto': la forma versionata conserva l'id ESATTO, non una
    // radice normalizzata. Due documenti che differiscono per la SOLA variabile hero_layout_id.
    const centrato = accettato(parseDocument({ ...documentoP4(), hero_layout_id: 'centrato@1' })); // covers: AC-DE-205-1
    const centratoFoto = accettato(
      parseDocument({ ...documentoP4(), hero_layout_id: 'centrato-foto@1' }),
    ); // covers: AC-DE-205-1

    expect(centrato.hero_layout_id).toBe('centrato@1'); // covers: AC-DE-205-1
    expect(centratoFoto.hero_layout_id).toBe('centrato-foto@1'); // covers: AC-DE-205-1
    expect(centrato.hero_layout_id).not.toBe(centratoFoto.hero_layout_id); // covers: AC-DE-205-1
  });

  // covers: AC-DE-205-1
  it('registra ciascuno dei cinque livelli di effetto L0..L4', () => {
    // L'enum e' ESATTAMENTE {L0..L4}: ognuno passa e viene conservato tale e quale.
    for (const livello of ['L0', 'L1', 'L2', 'L3', 'L4']) {
      const documento = accettato(parseDocument({ ...documentoP4(), effect_level: livello })); // covers: AC-DE-205-1
      expect(documento.effect_level, `effect_level '${livello}'`).toBe(livello); // covers: AC-DE-205-1
    }
  });
});

describe('DE-205 AC-DE-205-2 — un documento P4 senza i campi valida ancora, coi default applicati', () => {
  // covers: AC-DE-205-2
  it('accetta il documento in formato P4 e applica i default di selezione, senza errore', () => {
    const input = documentoP4();
    // Precondizione della fixture: NESSUN campo di selezione e' presente nell'input.
    expect('hero_layout_id' in input).toBe(false);
    expect('section_treatment_id' in input).toBe(false);
    expect('effect_level' in input).toBe(false);
    expect('ornament_id' in input).toBe(false);

    const res = parseDocument(input);
    expect(res.ok).toBe(true); // covers: AC-DE-205-2 — nessun errore
    const documento = accettato(res); // covers: AC-DE-205-2

    expect(documento.hero_layout_id).toBe(DESIGN_SELECTION_DEFAULTS.hero_layout_id); // covers: AC-DE-205-2
    expect(documento.section_treatment_id).toBe(DESIGN_SELECTION_DEFAULTS.section_treatment_id); // covers: AC-DE-205-2
    expect(documento.effect_level).toBe(DESIGN_SELECTION_DEFAULTS.effect_level); // covers: AC-DE-205-2

    // I default sono PINNATI e allineati per assunzione ai cataloghi DE-201/DE-202 (centrato@1, piano@1,
    // L1): cambiarli e' una decisione, non un dettaglio, e deve costare un test rosso. Ogni id e' nella
    // forma versionata, effect_level e' un livello valido.
    expect(DESIGN_SELECTION_DEFAULTS).toEqual({
      hero_layout_id: 'centrato@1',
      section_treatment_id: 'piano@1',
      effect_level: 'L1',
    }); // covers: AC-DE-205-2

    // ornament_id NON ha default: un sito puo' non avere ornamento (DS-D5). Assente nell'input, resta
    // ASSENTE nel documento parseato — non compare come chiave, non e' inventato.
    expect('ornament_id' in documento).toBe(false); // covers: AC-DE-205-2
    expect(documento.ornament_id).toBeUndefined(); // covers: AC-DE-205-2
  });

  // covers: AC-DE-205-2
  it('i campi PRESENTI vincono sul default, gli ASSENTI prendono il default (documento parziale)', () => {
    // Una sola variabile presente (effect_level): viene conservata; hero_layout_id e
    // section_treatment_id assenti prendono il default. Prova che il default riempie il BUCO, non
    // sovrascrive cio' che c'e'.
    const documento = accettato(parseDocument({ ...documentoP4(), effect_level: 'L4' })); // covers: AC-DE-205-2
    expect(documento.effect_level).toBe('L4'); // covers: AC-DE-205-2 — il presente vince
    expect(documento.effect_level).not.toBe(DESIGN_SELECTION_DEFAULTS.effect_level); // covers: AC-DE-205-2
    expect(documento.hero_layout_id).toBe(DESIGN_SELECTION_DEFAULTS.hero_layout_id); // covers: AC-DE-205-2 — l'assente default
    expect(documento.section_treatment_id).toBe(DESIGN_SELECTION_DEFAULTS.section_treatment_id); // covers: AC-DE-205-2
  });

  // covers: AC-DE-205-2
  it('il risultato e una COPIA nuova anche dopo i default (mai l oggetto d ingresso)', () => {
    // Il gate normalizza SU UNA COPIA: chi tiene l'input non trova i default iniettati nel proprio
    // oggetto, e il documento restituito non e' l'ingresso (invariante P2-D12/AC-202-12, preservata
    // dai default).
    const input = documentoP4();
    const documento = accettato(parseDocument(input)); // covers: AC-DE-205-2
    expect(documento).not.toBe(input); // covers: AC-DE-205-2
    expect('effect_level' in input).toBe(false); // covers: AC-DE-205-2 — l'input non e' stato mutato
    expect(documento.effect_level).toBe(DESIGN_SELECTION_DEFAULTS.effect_level); // covers: AC-DE-205-2
  });
});

describe('DE-205 AC-DE-205-3 — un effect_level fuori da L0..L4 fa cadere l INTERO documento', () => {
  // covers: AC-DE-205-3
  it('rifiuta ogni effect_level fuori dai cinque livelli, nominando il campo', () => {
    // Fuori vocabolario per ragioni diverse: sesto livello, negativo, due cifre, minuscolo, spazi ai
    // bordi, vuoto, non-stringa. Nessuno di questi e' uno dei cinque simboli.
    const fuori: unknown[] = ['L5', 'L-1', 'L10', 'l1', 'L1 ', ' L1', 'L', '', 'x', 4, null, true];
    for (const valore of fuori) {
      const input: Record<string, unknown> = { ...documentoP4(), effect_level: valore };
      const res = parseDocument(input);

      expect(res.ok, `effect_level ${JSON.stringify(valore)}`).toBe(false); // covers: AC-DE-205-3
      const invalido = rifiutato(res).find((issue) => issue.path.includes('effect_level'));
      expect(invalido, `effect_level ${JSON.stringify(valore)}`).toBeDefined(); // covers: AC-DE-205-3
      expect(invalido?.path, `effect_level ${JSON.stringify(valore)}`).toEqual(['effect_level']); // covers: AC-DE-205-3
    }
  });

  // covers: AC-DE-205-3
  it('il rifiuto e TOTALE: un effect_level invalido fa cadere un documento per il resto valido', () => {
    // Gemello ACCETTATO che differisce per UNA sola variabile: effect_level valido vs invalido. Il
    // resto del documento e' identico e legittimo, quindi il rifiuto viene SOLO dall'effect_level.
    const valido: Record<string, unknown> = { ...documentoP4(), effect_level: 'L2' };
    expect(parseDocument(valido).ok).toBe(true); // covers: AC-DE-205-3

    const invalido: Record<string, unknown> = { ...documentoP4(), effect_level: 'L9' };
    const res = parseDocument(invalido);
    expect(res.ok).toBe(false); // covers: AC-DE-205-3 — cade TUTTO
    // Non esce alcun documento "parziale": e' un rifiuto, non un documento con l'effect_level scartato.
    if (res.ok) throw new Error('un effect_level invalido non deve produrre un documento');
  });

  // covers: AC-DE-205-3
  it('il gate copre anche gli ALTRI id di selezione: una forma non versionata li fa cadere', () => {
    // "come per gli altri campi versionati" (AC-DE-205-3): parseDocument resta il gate anche sui campi
    // nuovi (security_notes DE-205). Un hero_layout_id/section_treatment_id/ornament_id non nella forma
    // 'nome@N' — o che contenga ':' '/' o una chiave speciale di JavaScript — fa cadere l'intero
    // documento, e il valore ostile non sopravvive nel risultato.
    const casi: readonly (readonly [string, string])[] = [
      ['hero_layout_id', 'centrato'], // manca @N
      ['hero_layout_id', 'https://evil.example/x@1'], // ':' '/' esclusi dalla forma
      ['section_treatment_id', 'A-Scheda@1'], // maiuscola
      ['section_treatment_id', 'piano@'], // '@' senza numero
      ['ornament_id', '__proto__'], // chiave speciale, non versionata
      ['ornament_id', 'divisori-linea'], // manca @N
    ];
    for (const [campo, valore] of casi) {
      const input: Record<string, unknown> = { ...documentoP4(), [campo]: valore };
      const res = parseDocument(input);

      expect(res.ok, `${campo}='${valore}'`).toBe(false); // covers: AC-DE-205-3
      const invalido = rifiutato(res).find((issue) => issue.path.includes(campo));
      expect(invalido, `${campo}='${valore}'`).toBeDefined(); // covers: AC-DE-205-3
      expect(serializza(res), `${campo}='${valore}'`).not.toContain('evil.example'); // covers: AC-DE-205-3
    }

    // Gemelli ACCETTATI: gli stessi campi con una forma versionata valida (una variabile per volta).
    expect(parseDocument({ ...documentoP4(), hero_layout_id: 'split@1' }).ok).toBe(true); // covers: AC-DE-205-3
    expect(parseDocument({ ...documentoP4(), section_treatment_id: 'fasce-alternate@1' }).ok).toBe(
      true,
    ); // covers: AC-DE-205-3
    expect(parseDocument({ ...documentoP4(), ornament_id: 'fregio-centrale@1' }).ok).toBe(true); // covers: AC-DE-205-3
  });
});

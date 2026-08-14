import { describe, it, expect } from 'vitest';
import {
  DESIGN_SELECTION_DEFAULTS,
  parseDocument,
  type SiteDocument,
} from '@/domain/generation/document';

// DE11-205 (macrotask variety-engine, design-engine-v1.1) — FREEZE dei NUOVI assi di selezione nel
// documento. Le asserzioni derivano dagli acceptance_criteria AC-DE11-205-1..3
// (docs/blueprint/design-engine-v1.1/02-variety-engine.md). Dominio PURO: nessun DB, nessun client
// Supabase, nessuna rete, nessun tempo.
//
// COSA AGGIUNGE DE11-205 A `SiteDocumentSchema` (oltre ai 4 assi gia' congelati da DE-205): quattro
// manopole visive NUOVE — h1_treatment_id (il tratto dell'H1, DE11-201), section_layout_id (il layout
// del CORPO, DE11-202), ribbon_id (il nastro divisorio, DE11-202) e illustration_id (l'illustrazione
// dell'hero editoriale, DE11-201). Sono OPZIONALI per retro-compatibilita': un documento in formato P4
// non li porta e valida ancora. DUE hanno un DEFAULT applicato dal GATE (h1_treatment_id,
// section_layout_id); DUE no (ribbon_id, illustration_id: un sito puo' non avere nastro ne'
// illustrazione). Congelarli nel documento — invece di riderivarli al render — e' cio' che impedisce a
// un sito pubblicato di re-stilarsi da solo dopo un ritocco ai cataloghi (DS-D4).
//
// COME SONO VALIDATI: sono FORMA-check, esattamente come recipe_id/theme_id/hero_layout_id (T-202,
// DE-205). Gli id sono versionati 'nome@N'. `parseDocument` NON li confronta coi cataloghi
// DE11-201/DE11-202 (quello e' un existence-check di un altro strato): un id ben formato ma inesistente
// passa la forma. Cio' che il gate NON tollera — un id non versionato, con ':' '/' o una chiave speciale
// di JavaScript — fa cadere l'INTERO documento (invariante P2/P4: un documento malformato cade tutto).
// L'assunzione che i due default coincidano coi cataloghi DE11-201/DE11-202 e' documentata in
// document.ts, non importata (altitudine: document.ts fa solo format-check).
//
// Disciplina delle fixture: mai un solo elemento — la home ha DUE blocchi con contenuti DISCORDANTI e id
// in cui uno e' PREFISSO dell'altro ('hero' / 'hero-2') — e gli id di selezione provati includono coppie
// in cui uno e' PREFISSO dell'altro ('occhiello@1' / 'occhiello-corsivo@1' per l'H1,
// 'contatti-scheda@1' / 'contatti-scheda-mappa@1' per il layout di sezione, 'gingham@1' /
// 'gingham-incrociato@1' per il nastro): la forma versionata deve conservare l'id ESATTO, mai una radice
// normalizzata per prefisso. Il lato ATTESO di ogni uguaglianza e' un LETTERALE scritto nel test, mai il
// binding che l'implementazione importa (niente X===X tautologico) — salvo il pin ESPLICITO di
// `DESIGN_SELECTION_DEFAULTS` contro un oggetto-letterale, che e' proprio il test che deve diventare
// rosso se qualcuno cambia un default.

// Le fixture sono LASCHE nel tipo: devono poter portare id malformati sui nuovi assi — cioe' cio' che il
// gate deve rifiutare, e che un tipo stretto renderebbe inscrivibile.
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
  h1_treatment_id?: unknown;
  section_layout_id?: unknown;
  ribbon_id?: unknown;
  illustration_id?: unknown;
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

/** Un documento in FORMATO P4: NESSUN campo di selezione design (ne' i 4 di DE-205 ne' i 4 di DE11-205). */
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

describe('DE11-205 AC-DE11-205-1 — i nuovi assi validi versionati sono registrati nel documento', () => {
  // covers: AC-DE11-205-1
  it('accetta un documento coi quattro nuovi assi validi e li CONSERVA esatti e distinti', () => {
    // Valori DISCORDANTI su tutti gli assi, cosi' che uno scambio fra due campi si veda. Gli id
    // scelti includono i MEMBRI-LUNGHI di coppie-prefisso reali ('occhiello-corsivo@1' contiene
    // 'occhiello', 'contatti-scheda-mappa@1' contiene 'contatti-scheda'): la forma versionata deve
    // conservarli interi.
    const input: DocumentoFixture = {
      ...documentoP4(),
      h1_treatment_id: 'occhiello-corsivo@1',
      section_layout_id: 'contatti-scheda-mappa@1',
      ribbon_id: 'gingham-incrociato@1',
      illustration_id: 'mattarello@1',
    };
    const documento = accettato(parseDocument(input)); // covers: AC-DE11-205-1

    expect(documento.h1_treatment_id).toBe('occhiello-corsivo@1'); // covers: AC-DE11-205-1
    expect(documento.section_layout_id).toBe('contatti-scheda-mappa@1'); // covers: AC-DE11-205-1
    expect(documento.ribbon_id).toBe('gingham-incrociato@1'); // covers: AC-DE11-205-1
    expect(documento.illustration_id).toBe('mattarello@1'); // covers: AC-DE11-205-1

    // Nessun campo e' letto al posto di un altro: gli id sono a due a due diversi.
    expect(documento.h1_treatment_id).not.toBe(documento.section_layout_id); // covers: AC-DE11-205-1
    expect(documento.ribbon_id).not.toBe(documento.illustration_id); // covers: AC-DE11-205-1

    // I default NON hanno soppiantato i valori presenti (i presenti vincono): h1_treatment_id porta il
    // MEMBRO-LUNGO della coppia-prefisso, non il default 'occhiello@1' che ne e' il prefisso.
    expect(documento.h1_treatment_id).not.toBe(DESIGN_SELECTION_DEFAULTS.h1_treatment_id); // covers: AC-DE11-205-1
    expect(documento.section_layout_id).not.toBe(DESIGN_SELECTION_DEFAULTS.section_layout_id); // covers: AC-DE11-205-1
  });

  // covers: AC-DE11-205-1
  it('non confonde due id in cui uno e PREFISSO dell altro: occhiello@1 resta occhiello@1', () => {
    // 'occhiello' e' PREFISSO di 'occhiello-corsivo' (e il DEFAULT dell'H1 e' proprio 'occhiello@1'): la
    // forma versionata conserva l'id ESATTO, non una radice normalizzata. Due documenti che differiscono
    // per la SOLA variabile h1_treatment_id.
    const diritto = accettato(parseDocument({ ...documentoP4(), h1_treatment_id: 'occhiello@1' })); // covers: AC-DE11-205-1
    const corsivo = accettato(
      parseDocument({ ...documentoP4(), h1_treatment_id: 'occhiello-corsivo@1' }),
    ); // covers: AC-DE11-205-1

    expect(diritto.h1_treatment_id).toBe('occhiello@1'); // covers: AC-DE11-205-1
    expect(corsivo.h1_treatment_id).toBe('occhiello-corsivo@1'); // covers: AC-DE11-205-1
    expect(diritto.h1_treatment_id).not.toBe(corsivo.h1_treatment_id); // covers: AC-DE11-205-1
  });

  // covers: AC-DE11-205-1
  it('e FORMA-check, non existence-check: un id versionato ben formato ma FUORI catalogo passa', () => {
    // Altitudine (come recipe_id/theme_id): document.ts NON importa i cataloghi DE11-201/DE11-202 e non
    // verifica l'appartenenza — vincola solo la FORMA 'nome@N'. Un id ben formato ma INESISTENTE e'
    // ACCETTATO (l'esistenza e' un existence-check di un altro strato). Una mutazione che aggiungesse
    // un controllo di appartenenza al catalogo QUI verrebbe uccisa da questa asserzione.
    const documento = accettato(
      parseDocument({ ...documentoP4(), section_layout_id: 'zzz-inesistente@9' }),
    ); // covers: AC-DE11-205-1
    expect(documento.section_layout_id).toBe('zzz-inesistente@9'); // covers: AC-DE11-205-1
  });

  // covers: AC-DE11-205-1
  it('conserva anche la coppia-prefisso del layout di sezione e del nastro (id esatti)', () => {
    // 'contatti-scheda' e' prefisso di 'contatti-scheda-mappa'; 'gingham' e' prefisso di
    // 'gingham-incrociato': il membro CORTO e il membro LUNGO sono id distinti, e il gate non normalizza
    // l'uno nell'altro.
    const corto = accettato(
      parseDocument({
        ...documentoP4(),
        section_layout_id: 'contatti-scheda@1',
        ribbon_id: 'gingham@1',
      }),
    ); // covers: AC-DE11-205-1
    const lungo = accettato(
      parseDocument({
        ...documentoP4(),
        section_layout_id: 'contatti-scheda-mappa@1',
        ribbon_id: 'gingham-incrociato@1',
      }),
    ); // covers: AC-DE11-205-1

    expect(corto.section_layout_id).toBe('contatti-scheda@1'); // covers: AC-DE11-205-1
    expect(lungo.section_layout_id).toBe('contatti-scheda-mappa@1'); // covers: AC-DE11-205-1
    expect(corto.section_layout_id).not.toBe(lungo.section_layout_id); // covers: AC-DE11-205-1
    expect(corto.ribbon_id).toBe('gingham@1'); // covers: AC-DE11-205-1
    expect(lungo.ribbon_id).toBe('gingham-incrociato@1'); // covers: AC-DE11-205-1
    expect(corto.ribbon_id).not.toBe(lungo.ribbon_id); // covers: AC-DE11-205-1
  });

  // covers: AC-DE11-205-1
  it('i nuovi assi NON regrediscono i quattro assi di DE-205 sullo stesso documento', () => {
    // Un documento che porta TUTTI e otto gli assi (i 4 di DE-205 + i 4 di DE11-205), tutti versionati e
    // discordanti: ognuno e' conservato tale e quale accanto agli altri (nessuna interferenza fra i due
    // gruppi). Prova che l'aggiunta di DE11-205 e' ADDITIVA.
    const input: Record<string, unknown> = {
      ...documentoP4(),
      hero_layout_id: 'split@1',
      section_treatment_id: 'a-scheda@1',
      effect_level: 'L3',
      ornament_id: 'watermark-cibo@1',
      h1_treatment_id: 'accento-ondulato@1',
      section_layout_id: 'orari-tabella@1',
      ribbon_id: 'scacchi-conici@1',
      illustration_id: 'piatto-fondo@1',
    };
    const documento = accettato(parseDocument(input)); // covers: AC-DE11-205-1

    expect(documento.hero_layout_id).toBe('split@1'); // covers: AC-DE11-205-1
    expect(documento.section_treatment_id).toBe('a-scheda@1'); // covers: AC-DE11-205-1
    expect(documento.effect_level).toBe('L3'); // covers: AC-DE11-205-1
    expect(documento.ornament_id).toBe('watermark-cibo@1'); // covers: AC-DE11-205-1
    expect(documento.h1_treatment_id).toBe('accento-ondulato@1'); // covers: AC-DE11-205-1
    expect(documento.section_layout_id).toBe('orari-tabella@1'); // covers: AC-DE11-205-1
    expect(documento.ribbon_id).toBe('scacchi-conici@1'); // covers: AC-DE11-205-1
    expect(documento.illustration_id).toBe('piatto-fondo@1'); // covers: AC-DE11-205-1
  });
});

describe('DE11-205 AC-DE11-205-2 — un documento senza i nuovi campi valida ancora, coi 2 default', () => {
  // covers: AC-DE11-205-2
  it('accetta il documento P4 e applica i due default (h1_treatment_id, section_layout_id)', () => {
    const input = documentoP4();
    // Precondizione della fixture: NESSUN dei quattro nuovi assi e' presente nell'input.
    expect('h1_treatment_id' in input).toBe(false);
    expect('section_layout_id' in input).toBe(false);
    expect('ribbon_id' in input).toBe(false);
    expect('illustration_id' in input).toBe(false);

    const res = parseDocument(input);
    expect(res.ok).toBe(true); // covers: AC-DE11-205-2 — nessun errore
    const documento = accettato(res); // covers: AC-DE11-205-2

    // I due assi CON default prendono il valore pinnato (lato ATTESO = LETTERALE, non solo il binding).
    expect(documento.h1_treatment_id).toBe('occhiello@1'); // covers: AC-DE11-205-2
    expect(documento.section_layout_id).toBe('chi-siamo-ritratto@1'); // covers: AC-DE11-205-2
    expect(documento.h1_treatment_id).toBe(DESIGN_SELECTION_DEFAULTS.h1_treatment_id); // covers: AC-DE11-205-2
    expect(documento.section_layout_id).toBe(DESIGN_SELECTION_DEFAULTS.section_layout_id); // covers: AC-DE11-205-2
  });

  // covers: AC-DE11-205-2
  it('ribbon_id e illustration_id NON hanno default: assenti nell input, restano ASSENTI', () => {
    // Un sito puo' non avere nastro ne' illustrazione (DS-D5): il gate non li fabbrica. Assenti
    // nell'input, non compaiono come chiave nel documento parseato — non sono inventati.
    const documento = accettato(parseDocument(documentoP4())); // covers: AC-DE11-205-2
    expect('ribbon_id' in documento).toBe(false); // covers: AC-DE11-205-2
    expect(documento.ribbon_id).toBeUndefined(); // covers: AC-DE11-205-2
    expect('illustration_id' in documento).toBe(false); // covers: AC-DE11-205-2
    expect(documento.illustration_id).toBeUndefined(); // covers: AC-DE11-205-2
  });

  // covers: AC-DE11-205-2
  it('i default sono PINNATI e allineati per assunzione ai cataloghi DE11-201/DE11-202', () => {
    // L'INTERO oggetto dei default e' pinnato contro un LETTERALE (i 3 di DE-205 + i 2 di DE11-205):
    // cambiarne uno e' una decisione, non un dettaglio, e deve costare QUESTO test rosso. E' l'unico
    // punto in cui il lato atteso e' il binding importato — di proposito, perche' e' il binding stesso a
    // essere sotto esame.
    expect(DESIGN_SELECTION_DEFAULTS).toEqual({
      hero_layout_id: 'centrato@1',
      section_treatment_id: 'piano@1',
      effect_level: 'L1',
      h1_treatment_id: 'occhiello@1',
      section_layout_id: 'chi-siamo-ritratto@1',
    }); // covers: AC-DE11-205-2
    // I default NON contengono ribbon_id ne' illustration_id (quelli non hanno default).
    expect('ribbon_id' in DESIGN_SELECTION_DEFAULTS).toBe(false); // covers: AC-DE11-205-2
    expect('illustration_id' in DESIGN_SELECTION_DEFAULTS).toBe(false); // covers: AC-DE11-205-2
  });

  // covers: AC-DE11-205-2
  it('i campi PRESENTI vincono sul default, gli ASSENTI prendono il default (documento parziale)', () => {
    // Una sola variabile CON-default presente (h1_treatment_id): viene conservata; section_layout_id
    // assente prende il default. Prova che il default riempie il BUCO, non sovrascrive cio' che c'e'.
    const documento = accettato(
      parseDocument({ ...documentoP4(), h1_treatment_id: 'accento-ondulato@1' }),
    ); // covers: AC-DE11-205-2
    expect(documento.h1_treatment_id).toBe('accento-ondulato@1'); // covers: AC-DE11-205-2 — il presente vince
    expect(documento.h1_treatment_id).not.toBe(DESIGN_SELECTION_DEFAULTS.h1_treatment_id); // covers: AC-DE11-205-2
    expect(documento.section_layout_id).toBe('chi-siamo-ritratto@1'); // covers: AC-DE11-205-2 — l'assente default
    expect(documento.section_layout_id).toBe(DESIGN_SELECTION_DEFAULTS.section_layout_id); // covers: AC-DE11-205-2
  });

  // covers: AC-DE11-205-2
  it('un ribbon_id/illustration_id PRESENTE e valido e conservato (nessun default lo cancella)', () => {
    // I due assi senza-default, quando PRESENTI e ben formati, sopravvivono: lo spread `...document` li
    // porta com'erano. Prova che "nessun default" non significa "scartato".
    const documento = accettato(
      parseDocument({ ...documentoP4(), ribbon_id: 'scacchi-conici@1', illustration_id: 'foglia@1' }),
    ); // covers: AC-DE11-205-2
    expect(documento.ribbon_id).toBe('scacchi-conici@1'); // covers: AC-DE11-205-2
    expect(documento.illustration_id).toBe('foglia@1'); // covers: AC-DE11-205-2
  });

  // covers: AC-DE11-205-2
  it('il risultato e una COPIA nuova anche dopo i default (mai l oggetto d ingresso)', () => {
    // Il gate normalizza SU UNA COPIA: chi tiene l'input non trova i default iniettati nel proprio
    // oggetto, e il documento restituito non e' l'ingresso (invariante P2-D12/AC-202-12, preservata dai
    // due default nuovi esattamente come dai tre di DE-205).
    const input = documentoP4();
    const documento = accettato(parseDocument(input)); // covers: AC-DE11-205-2
    expect(documento).not.toBe(input); // covers: AC-DE11-205-2
    expect('h1_treatment_id' in input).toBe(false); // covers: AC-DE11-205-2 — l'input non e' stato mutato
    expect('section_layout_id' in input).toBe(false); // covers: AC-DE11-205-2
    expect(documento.h1_treatment_id).toBe('occhiello@1'); // covers: AC-DE11-205-2 — il default e' solo sulla copia
  });
});

describe('DE11-205 AC-DE11-205-3 — un id malformato sui nuovi assi fa cadere l INTERO documento', () => {
  // covers: AC-DE11-205-3
  it('rifiuta ogni id NON versionato sui quattro nuovi assi, nominando il campo, senza farlo sopravvivere', () => {
    // "come per gli altri campi versionati" (AC-DE11-205-3): parseDocument resta il gate anche sui campi
    // nuovi. Un id non nella forma 'nome@N' — o che contenga ':' '/' o una chiave speciale di JavaScript
    // — fa cadere l'INTERO documento, e il valore ostile non sopravvive nel risultato.
    const casi: readonly (readonly [string, string])[] = [
      ['h1_treatment_id', 'accento-ondulato'], // manca @N
      ['h1_treatment_id', '__proto__'], // chiave speciale, non versionata
      ['section_layout_id', 'https://evil.example/x@1'], // ':' '/' esclusi dalla forma
      ['section_layout_id', 'Chi-Siamo-Ritratto@1'], // maiuscola
      ['ribbon_id', 'gingham@'], // '@' senza numero
      ['ribbon_id', 'gingham'], // manca @N
      ['illustration_id', 'constructor'], // chiave ereditata da Object.prototype, non versionata
      ['illustration_id', 'piatto@1@2'], // doppio '@'
    ];
    for (const [campo, valore] of casi) {
      const input: Record<string, unknown> = { ...documentoP4(), [campo]: valore };
      const res = parseDocument(input);

      expect(res.ok, `${campo}='${valore}'`).toBe(false); // covers: AC-DE11-205-3
      const invalido = rifiutato(res).find((issue) => issue.path.includes(campo));
      expect(invalido, `${campo}='${valore}'`).toBeDefined(); // covers: AC-DE11-205-3
      expect(invalido?.path, `${campo}='${valore}'`).toEqual([campo]); // covers: AC-DE11-205-3
      expect(serializza(res), `${campo}='${valore}'`).not.toContain('evil.example'); // covers: AC-DE11-205-3
    }

    // Gemelli ACCETTATI: gli stessi campi con una forma versionata valida (una variabile per volta).
    expect(parseDocument({ ...documentoP4(), h1_treatment_id: 'occhiello@1' }).ok).toBe(true); // covers: AC-DE11-205-3
    expect(parseDocument({ ...documentoP4(), section_layout_id: 'orari-griglia@1' }).ok).toBe(true); // covers: AC-DE11-205-3
    expect(parseDocument({ ...documentoP4(), ribbon_id: 'gingham@1' }).ok).toBe(true); // covers: AC-DE11-205-3
    expect(parseDocument({ ...documentoP4(), illustration_id: 'mappa@1' }).ok).toBe(true); // covers: AC-DE11-205-3
  });

  // covers: AC-DE11-205-3
  it('il rifiuto e TOTALE: un id nuovo invalido fa cadere un documento per il resto valido', () => {
    // Gemello ACCETTATO che differisce per UNA sola variabile: section_layout_id valido vs invalido. Il
    // resto del documento e' identico e legittimo, quindi il rifiuto viene SOLO dal campo nuovo — non
    // esce alcun documento "parziale" con l'asse scartato.
    const valido: Record<string, unknown> = { ...documentoP4(), section_layout_id: 'orari-tabella@1' };
    expect(parseDocument(valido).ok).toBe(true); // covers: AC-DE11-205-3

    const invalido: Record<string, unknown> = { ...documentoP4(), section_layout_id: 'orari-tabella' };
    const res = parseDocument(invalido);
    expect(res.ok).toBe(false); // covers: AC-DE11-205-3 — cade TUTTO
    if (res.ok) throw new Error('un section_layout_id invalido non deve produrre un documento');
  });

  // covers: AC-DE11-205-3
  it('rifiuta un id nuovo NON-stringa (numero, null, booleano, oggetto): la forma vuole una stringa', () => {
    // Un valore non testuale non ha "forma versionata": cade, e nessun documento parziale ne esce.
    const nonStringhe: unknown[] = [1, 0, null, true, false, {}, [], { id: 'occhiello@1' }];
    for (const valore of nonStringhe) {
      const input: Record<string, unknown> = { ...documentoP4(), h1_treatment_id: valore };
      const res = parseDocument(input);
      expect(res.ok, `h1_treatment_id ${JSON.stringify(valore)}`).toBe(false); // covers: AC-DE11-205-3
      const invalido = rifiutato(res).find((issue) => issue.path.includes('h1_treatment_id'));
      expect(invalido, `h1_treatment_id ${JSON.stringify(valore)}`).toBeDefined(); // covers: AC-DE11-205-3
    }
  });
});

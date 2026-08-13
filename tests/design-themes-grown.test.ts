import { describe, it, expect } from 'vitest';
import { THEMES, themeFor, type SiteTheme } from '@/domain/generation/themes';

// DE-202 (macrotask design-select) — THEMES CRESCIUTI (>=6) e DISACCOPPIATI dalla ricetta, con
// `themeFor` spostato in themes.ts ed ESPORTATO come lookup ESATTO su array (proto-safe), pronto per
// il selettore (DE-204). Le asserzioni DERIVANO dagli acceptance_criteria AC-DE-202-1..3
// (docs/blueprint/design-engine/02-design-select.md), ciascun blocco taggato con l'AC che esercita.
//
// COSA QUESTO FILE NON PROVA (L-COL-006): non prova che i temi siano BELLI, ne che una palette sia
// leggibile o armoniosa — lo stile non e' oracolabile. Prova che il catalogo e' CRESCIUTO (>=6),
// che le palette sono DISTINTE a due a due, che il lookup e' per UGUAGLIANZA ESATTA (mai per
// prefisso, mai un membro ereditato da Object.prototype) e che i cinque id storici — quelli congelati
// nei documenti P4 e citati dalle RECIPES — restano tutti risolvibili.

// ── AC-DE-202-1 — almeno sei temi, palette a due a due distinte ───────────────

describe('AC-DE-202-1 — >=6 temi con palette distinte a coppie', () => {
  // covers: AC-DE-202-1
  it('THEMES conta almeno sei temi', () => {
    // Il minimo dichiarato dalla DoD. Il conteggio da solo non basta (due copie dello stesso tema
    // lo gonfierebbero) — la distinzione delle palette e' provata nel caso qui sotto.
    expect(THEMES.length).toBeGreaterThanOrEqual(6); // covers: AC-DE-202-1
  });

  // covers: AC-DE-202-1
  it('ogni coppia di temi differisce su almeno un token di colore (palette confrontate, non contate)', () => {
    const coppie: { a: SiteTheme; b: SiteTheme }[] = [];
    for (let i = 0; i < THEMES.length; i += 1) {
      for (let j = i + 1; j < THEMES.length; j += 1) {
        const a = THEMES[i];
        const b = THEMES[j];
        if (a && b) coppie.push({ a, b });
      }
    }

    // Anti-vacuita': con n>=6 le coppie sono almeno C(6,2)=15. Il QUINDICI e' un letterale (non
    // derivato da THEMES.length), cosi' un catalogo ridotto — che renderebbe il ciclo vero per
    // vacuita' — cade qui. L'uguaglianza strutturale col numero di coppie del doppio ciclo e' un
    // controllo in piu' che il ciclo le ha costruite tutte.
    expect(coppie.length).toBeGreaterThanOrEqual(15); // covers: AC-DE-202-1
    expect(coppie).toHaveLength((THEMES.length * (THEMES.length - 1)) / 2); // covers: AC-DE-202-1

    for (const { a, b } of coppie) {
      const tokens = Object.keys(a.colors) as (keyof SiteTheme['colors'])[];
      const diversi = tokens.filter((token) => a.colors[token] !== b.colors[token]);
      // La lettera dell'AC: le palette sono confrontate (>=1 token diverso), non solo contate. Due
      // temi con palette identica cadrebbero qui anche col conteggio a posto.
      expect(diversi.length, `${a.id} e ${b.id} hanno la stessa palette`).toBeGreaterThan(0); // covers: AC-DE-202-1
    }
  });
});

// ── AC-DE-202-2 — themeFor per id ESATTO, mai sul prefisso ────────────────────

describe('AC-DE-202-2 — themeFor risolve per id esatto, nessun match sul prefisso', () => {
  // Fixture VIVA nel catalogo: due temi i cui id condividono un prefisso di stringa. 'linea-essenziale'
  // e' un prefisso GENUINO di ENTRAMBI 'linea-essenziale@1' e 'linea-essenziale-notte@1'. Un lookup
  // lasco (startsWith/includes) confonderebbe i due; l'uguaglianza esatta no.
  const BASE = 'linea-essenziale@1';
  const VARIANTE = 'linea-essenziale-notte@1';
  const PREFISSO_CONDIVISO = 'linea-essenziale';

  // covers: AC-DE-202-2
  it('i due temi in relazione di prefisso esistono davvero, e la relazione di prefisso e reale', () => {
    // Se uno dei due sparisse, la prova sul prefisso sarebbe vacua: sono ancorati come presenti.
    expect(THEMES.some((tema) => tema.id === BASE), BASE).toBe(true); // covers: AC-DE-202-2
    expect(THEMES.some((tema) => tema.id === VARIANTE), VARIANTE).toBe(true); // covers: AC-DE-202-2
    // La relazione di prefisso e' letterale sulle stringhe, non un modo di dire: il piu' corto e'
    // prefisso di ENTRAMBI gli id, ed e' la cosa che un lookup esatto deve NON confondere.
    expect(BASE.startsWith(PREFISSO_CONDIVISO), BASE).toBe(true); // covers: AC-DE-202-2
    expect(VARIANTE.startsWith(PREFISSO_CONDIVISO), VARIANTE).toBe(true); // covers: AC-DE-202-2
    expect(BASE).not.toBe(VARIANTE); // covers: AC-DE-202-2
  });

  // covers: AC-DE-202-2
  it('themeFor(id esatto) risolve SOLO quel tema, mai la variante che ne condivide il prefisso', () => {
    const base = themeFor(BASE);
    const variante = themeFor(VARIANTE);
    expect(base?.id, BASE).toBe(BASE); // covers: AC-DE-202-2
    expect(variante?.id, VARIANTE).toBe(VARIANTE); // covers: AC-DE-202-2
    // Il cuore dell'AC: l'id esatto del BASE non tira su la VARIANTE piu' lunga.
    expect(base?.id).not.toBe(VARIANTE); // covers: AC-DE-202-2
  });

  // covers: AC-DE-202-2
  it('themeFor(prefisso condiviso) non risolve NULLA: uguaglianza esatta, non startsWith', () => {
    // 'linea-essenziale' e' prefisso di due id reali ma non e' l'id di alcun tema. Un lookup per
    // prefisso restituirebbe uno dei due; l'uguaglianza esatta restituisce undefined.
    expect(themeFor(PREFISSO_CONDIVISO)).toBeUndefined(); // covers: AC-DE-202-2
    // e la contro-prova che il caso non e' vacuo: nessun tema porta davvero quell'id nudo.
    expect(THEMES.some((tema) => tema.id === PREFISSO_CONDIVISO)).toBe(false); // covers: AC-DE-202-2
  });

  // ── oracolo AGGIUNTIVO (non deriva da un AC): LOOKUP PROTO-SAFE ──────────────
  // La ricerca e' su ARRAY per uguaglianza, non su un oggetto indicizzato per id: un id come
  // 'constructor'/'__proto__'/'toString' non deve risolvere un membro EREDITATO da Object.prototype
  // al posto di "nessun tema". Nessun tag `// covers`: e' disciplina, non un acceptance criterion.
  it('un id ereditato da Object.prototype non risolve alcun tema (proto-safe)', () => {
    for (const chiave of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      expect(themeFor(chiave), chiave).toBeUndefined();
    }
  });
});

// ── AC-DE-202-3 — i cinque id storici restano risolvibili ─────────────────────

describe('AC-DE-202-3 — i 5 id tema storici risolvono (nessuna regressione sui documenti P4)', () => {
  // Gli id CONGELATI nei documenti P4 e citati dalle cinque RECIPES. LETTERALI e scritti a mano: sono
  // il contratto verso gli artefatti gia' pubblicati, non un dato da rileggere dal catalogo che si
  // sta giudicando. Un rename di uno di questi rende rosso qui invece di rompere un sito in silenzio.
  const STORICI = [
    'sole-mediterraneo@1',
    'linea-essenziale@1',
    'scatto-vitale@1',
    'bottega-artigiana@1',
    'brezza-costiera@1',
  ] as const;

  // covers: AC-DE-202-3
  it('themeFor risolve ciascuno dei cinque id storici a un tema con quell id esatto', () => {
    // I cinque sono cinque id distinti (l'elenco non nasconde un duplicato che indebolirebbe il ciclo).
    expect(new Set(STORICI).size).toBe(5); // covers: AC-DE-202-3

    for (const id of STORICI) {
      const tema = themeFor(id);
      expect(tema, id).toBeDefined(); // covers: AC-DE-202-3
      expect(tema?.id, id).toBe(id); // covers: AC-DE-202-3
    }
  });

  // covers: AC-DE-202-3
  it('tutti e cinque gli storici sono presenti nel catalogo cresciuto', () => {
    const idPresenti = new Set(THEMES.map((tema) => tema.id));
    for (const id of STORICI) {
      expect(idPresenti.has(id), id).toBe(true); // covers: AC-DE-202-3
    }
  });
});

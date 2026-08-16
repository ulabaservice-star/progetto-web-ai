import { describe, it, expect } from 'vitest';
import {
  BODY_LAYOUTS,
  bodyLayoutFor,
  type SiteBodyLayout,
} from '@/domain/generation/section-layouts';

// DV2-401 (macrotask body-sections, design-engine-v2) — IL CATALOGO DELLE VARIANTI DI CORPO. Le
// asserzioni DERIVANO dagli acceptance_criteria AC-DV2-401-1..3
// (docs/blueprint/design-engine-v2/04-body-sections.md) e dalla definition_of_done del task DV2-401.
//
// Questo file cresce con i sotto-macrotask: body-sections-a copre chi-siamo/recensioni/faq;
// body-sections-b aggiungera' orari/contatti (+ header/footer sono chrome, fuori dal catalogo di
// sezione, DS-V2-D11). Gli insiemi attesi (SECTION/VARIANT) sono LETTERALI scritti qui, mai importati
// dall'implementazione: un catalogo svuotato o una voce sbagliata rende ROSSO, non verde per tautologia.
//
// COSA NON PROVA (L-COL-006): che una variante di corpo sia BELLA (non oracolabile). Prova che le
// varianti esistono come voci versionate '<section>-<kebab>@N', UNICHE, con l'asse VISIBILE `variant`
// nel vocabolario; che ogni tipo-sezione porta >=2 varianti; che due varianti della STESSA sezione
// differiscono sull'asse visibile (mai solo per nome); che il lookup e' per UGUAGLIANZA ESATTA su array
// (mai per prefisso, mai un membro ereditato da Object.prototype).

// La forma canonica di un id versionato (document.ts, VersionedIdSchema). Scritta qui a mano: gli id del
// corpo devono essere pronti al freeze di variety-select senza far cadere il documento.
const ID_VERSIONATO = /^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$/;

// Le chiavi speciali di JavaScript: se il lookup fosse un oggetto indicizzato risolverebbero il membro
// EREDITATO da Object.prototype invece di 'nessuna voce'.
const CHIAVI_PROTO = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty', 'prototype', ''];

// I VOCABOLARI ATTESI degli assi VISIBILI, per sezione (letterali attesi, scritti a mano).
const STORY_VARIANTS = new Set([
  'overlap', 'timeline', 'punti-sotto', 'banda-scura', 'lettera', 'mosaico',
  'numeri', 'citazione', 'foto-piena', 'colonne', 'ritratti', 'manifesto',
]);
const REVIEWS_VARIANTS = new Set([
  'cards', 'centrale', 'scure', 'colonna', 'stelle', 'gigante', 'numerate', 'cornici', 'scontrini', 'banda-accent',
]);
const FAQ_VARIANTS = new Set([
  'accordion', 'griglia', 'due-colonne', 'numerata', 'centrale', 'scura', 'tavola', 'schede', 'minimal', 'carta',
]);
const BODY_VARIANTS = new Set<string>([...STORY_VARIANTS, ...REVIEWS_VARIANTS, ...FAQ_VARIANTS]);

// Le SEZIONI di corpo coperte finora (cresce coi sotto-macrotask).
const BODY_SECTIONS = new Set<string>(['chi-siamo', 'recensioni', 'faq']);

const SCOPE_AMMESSI = new Set(['universale', 'ristorazione']);

describe('DV2-401 · catalogo delle varianti di corpo (section-layouts.ts)', () => {
  // ── AC-DV2-401-1 — ogni tipo-sezione >=2 varianti, id versionati unici, struttura non vuota ──

  // covers: AC-DV2-401-1
  it('esporta id versionati distinti, ognuno con section e variant nel vocabolario', () => {
    expect(BODY_LAYOUTS.length, 'catalogo di corpo troppo piccolo').toBeGreaterThanOrEqual(2); // covers: AC-DV2-401-1

    for (const l of BODY_LAYOUTS) {
      expect(l.id, `body id non versionato: ${l.id}`).toMatch(ID_VERSIONATO); // covers: AC-DV2-401-1
      expect(BODY_SECTIONS.has(l.section), `section ignota: ${l.id} → ${l.section}`).toBe(true); // covers: AC-DV2-401-1
      expect(BODY_VARIANTS.has(l.variant), `variant ignoto: ${l.id} → ${l.variant}`).toBe(true); // covers: AC-DV2-401-1
      expect(SCOPE_AMMESSI.has(l.scope), `scope ignoto: ${l.id} → ${l.scope}`).toBe(true); // covers: AC-DV2-401-1
      // L'id NOMINA la sezione: '<section>-...' — cosi' un id non puo' appartenere alla sezione sbagliata.
      expect(l.id.startsWith(`${l.section}-`), `id non prefissato dalla sezione: ${l.id}`).toBe(true); // covers: AC-DV2-401-1
    }

    // Id UNICI (un doppione renderebbe il lookup ambiguo).
    expect(new Set(BODY_LAYOUTS.map((l) => l.id)).size, 'id di corpo duplicati').toBe(BODY_LAYOUTS.length); // covers: AC-DV2-401-1
  });

  // covers: AC-DV2-401-1
  it('OGNI tipo-sezione presente porta >=2 varianti con struttura non vuota', () => {
    const perSezione = new Map<string, SiteBodyLayout[]>();
    for (const l of BODY_LAYOUTS) {
      const gruppo = perSezione.get(l.section) ?? [];
      gruppo.push(l);
      perSezione.set(l.section, gruppo);
    }
    // Tutte le sezioni dichiarate DEVONO essere presenti nel catalogo (non solo un sottoinsieme).
    for (const sezione of BODY_SECTIONS) {
      const gruppo = perSezione.get(sezione) ?? [];
      expect(gruppo.length, `sezione '${sezione}' con meno di 2 varianti`).toBeGreaterThanOrEqual(2); // covers: AC-DV2-401-1
    }
  });

  // ── AC-DV2-401-2 — lookup ESATTO su array, mai per prefisso, proto-safe ──────────

  // covers: AC-DV2-401-2
  it('bodyLayoutFor risolve un id noto alla sua struttura esatta (valori discordanti su dati reali)', () => {
    const timeline: SiteBodyLayout | undefined = bodyLayoutFor('chi-siamo-timeline@1');
    expect(timeline?.id).toBe('chi-siamo-timeline@1'); // covers: AC-DV2-401-2
    expect(timeline?.section).toBe('chi-siamo'); // covers: AC-DV2-401-2
    expect(timeline?.variant).toBe('timeline'); // covers: AC-DV2-401-2

    const citazione: SiteBodyLayout | undefined = bodyLayoutFor('chi-siamo-citazione@1');
    expect(citazione?.variant).toBe('citazione'); // covers: AC-DV2-401-2
    // Voci DISTINTE: se il lookup collassasse, i variant coinciderebbero → ROSSO.
    expect(timeline?.variant).not.toBe(citazione?.variant); // covers: AC-DV2-401-2
  });

  // covers: AC-DV2-401-2
  it('un id inesistente non risolve a un default silenzioso (senza @N, prefisso di sezione, id esteso)', () => {
    for (const l of BODY_LAYOUTS) {
      expect(bodyLayoutFor(l.id)?.id, `${l.id} non trovato per id esatto`).toBe(l.id); // covers: AC-DV2-401-2
      const senzaVersione = l.id.replace(/@[0-9]+$/, '');
      expect(senzaVersione, `${l.id} gia privo di @N`).not.toBe(l.id);
      expect(bodyLayoutFor(senzaVersione), `body ${senzaVersione}`).toBeUndefined(); // covers: AC-DV2-401-2
      expect(bodyLayoutFor(`${l.id}0`), `body ${l.id}0`).toBeUndefined(); // covers: AC-DV2-401-2
    }
    // Il prefisso di SEZIONE nudo ('chi-siamo') non e' una voce.
    expect(bodyLayoutFor('chi-siamo')).toBeUndefined(); // covers: AC-DV2-401-2
    expect(bodyLayoutFor('chi-siamo-non-esiste@9')).toBeUndefined(); // covers: AC-DV2-401-2
  });

  // covers: AC-DV2-401-2
  it('bodyLayoutFor con chiavi di Object.prototype restituisce undefined', () => {
    for (const chiave of CHIAVI_PROTO) {
      expect(bodyLayoutFor(chiave), `body: ${chiave}`).toBeUndefined(); // covers: AC-DV2-401-2
    }
  });

  // ── AC-DV2-401-3 — due varianti della STESSA sezione differiscono su un asse VISIBILE ──

  // covers: AC-DV2-401-3
  it('nella stessa sezione nessuna coppia di id distinti condivide il variant: distinzione VISIBILE', () => {
    // Il cuore dell'AC: due section_layout_id distinti della STESSA sezione differiscono su almeno un
    // asse VISIBILE (la struttura dell'impaginato), MAI solo per il nome. La firma (section|variant) e'
    // quindi UNICA per voce.
    const firme = BODY_LAYOUTS.map((l) => `${l.section}|${l.variant}`);
    expect(new Set(firme).size, `due varianti condividono (section, variant): ${JSON.stringify(firme)}`).toBe(
      BODY_LAYOUTS.length,
    ); // covers: AC-DV2-401-3
  });

  // covers: AC-DV2-401-3
  it('FALSIFICABILE: la firma (section|variant) scatta su una collisione simulata', () => {
    const collisione = ['chi-siamo|timeline', 'chi-siamo|timeline', 'chi-siamo|citazione'];
    expect(new Set(collisione).size).not.toBe(collisione.length); // covers: AC-DV2-401-3
  });
});

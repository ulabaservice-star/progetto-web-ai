import { describe, it, expect } from 'vitest';
import {
  SECTION_LAYOUTS,
  sectionLayoutFor,
  RIBBONS,
  ribbonFor,
  type SiteSectionLayout,
  type SiteRibbon,
} from '@/domain/generation/section-layouts';

// DE11-202 (macrotask variety-engine, design-engine-v1.1) — SECTION-LAYOUTS RICCHI + NASTRI DIVISORI.
// Le asserzioni DERIVANO dagli acceptance_criteria AC-DE11-202-1..3 (docs/blueprint/design-engine-v1.1/
// 02-variety-engine.md) e dalla definition_of_done del task; ogni blocco porta il tag dell'AC che
// esercita. Il NUOVO catalogo `section-layouts` NON tocca `section-treatments.ts` (che resta la leva
// R2 della matrice per la leggibilita' di superficie): qui si prova SOLO il catalogo dei LAYOUT veri
// di sezione (chi-siamo/orari/contatti/menu come griglie/tabelle/card) e i nastri divisori.
//
// COSA QUESTO FILE NON PROVA (L-COL-006): non prova che un layout sia BELLO ne che un nastro sia
// elegante — lo stile non e' oracolabile. Prova che i cataloghi esistono, che gli id sono versionati
// 'nome@N', che ogni sezione con >=2 varianti le porta con un DESCRITTORE (`kind`) davvero DISTINTO
// (non lo stesso trattamento-bordo di v1), che la voce menu card-carta e i nastri esistono come voci
// versionate, e che i lookup sono per UGUAGLIANZA ESATTA su array (mai per prefisso, mai un membro
// ereditato da Object.prototype).
//
// POTERE DELLE ASSERZIONI: il lato ATTESO di ogni uguaglianza e' un LETTERALE scritto qui (i valori
// di `kind`/`pattern`/`section`, la regex dell'id), mai il binding importato dall'implementazione: un
// export neutralizzato (catalogo svuotato) o una voce sbagliata (il prefisso al posto dell'esatto)
// rende ROSSO, non verde per tautologia.

// La forma canonica di un id versionato, DERIVATA dallo schema del documento (document.ts,
// SiteDocumentSchema / VersionedIdSchema: `^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$`). Scritta qui a mano,
// non importata: gli id dei nuovi assi devono essere pronti al freeze di DE11-205 senza far cadere il
// documento.
const ID_VERSIONATO = /^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$/;

// Le chiavi speciali di JavaScript: se un lookup fosse un oggetto indicizzato per id risolverebbero il
// membro EREDITATO da Object.prototype invece di 'nessuna voce'.
const CHIAVI_PROTO = [
  'constructor',
  '__proto__',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'prototype',
  '',
];

// Le sezioni per cui l'AC-1 pretende >=2 varianti con descrittore distinto (letterali, non import).
const SEZIONI_MULTIVARIANTE = ['chi-siamo', 'orari', 'contatti'] as const;

describe('DE11-202 · section-layouts ricchi + nastri divisori', () => {
  // ── AC-DE11-202-1 — >=2 varianti per chi-siamo/orari/contatti, descrittori DISTINTI ──

  // covers: AC-DE11-202-1
  it('ogni sezione chi-siamo/orari/contatti ha >=2 varianti con un descrittore (kind) davvero DISTINTO', () => {
    // Anti-vacuita': un catalogo svuotato renderebbe i cicli veri per vacuita'.
    expect(SECTION_LAYOUTS.length, 'catalogo section-layouts vuoto').toBeGreaterThanOrEqual(2); // covers: AC-DE11-202-1

    for (const sezione of SEZIONI_MULTIVARIANTE) {
      const varianti = SECTION_LAYOUTS.filter((l) => l.section === sezione);
      // Almeno DUE varianti per la sezione.
      expect(varianti.length, `sezione ${sezione}: meno di 2 varianti`).toBeGreaterThanOrEqual(2); // covers: AC-DE11-202-1

      // I DESCRITTORI (`kind`) sono a due a due DISTINTI fra le varianti della STESSA sezione: tante
      // kind uniche quante le varianti. Se due varianti condividessero il descrittore (l'ennesimo
      // trattamento-bordo ridipinto) il Set sarebbe piu' piccolo → ROSSO. E' il cuore dell'AC: la
      // distinzione dev'essere sul LAYOUT, non solo sull'id.
      const kinds = varianti.map((l) => l.kind);
      expect(
        new Set(kinds).size,
        `sezione ${sezione}: due varianti condividono lo stesso descrittore ${JSON.stringify(kinds)}`,
      ).toBe(varianti.length); // covers: AC-DE11-202-1

      // Difesa esplicita contro la tautologia "id diversi ma stesso kind": gli id sono gia' unici
      // (provato altrove), quindi confrontiamo i DESCRITTORI, non gli id.
      const ids = varianti.map((l) => l.id);
      expect(new Set(ids).size, `sezione ${sezione}: id duplicati`).toBe(varianti.length); // covers: AC-DE11-202-1
    }
  });

  // covers: AC-DE11-202-1
  it('i descrittori attesi di ciascuna sezione sono LETTERALI di layout (griglia/tabella/card...), non bordi', () => {
    // Prova su DATI REALI coi valori DISCORDANTI: ogni variante nota si raggiunge per id esatto e
    // porta il suo `kind` letterale. Un lookup che restituisse la voce sbagliata darebbe il kind
    // sbagliato → ROSSO; un descrittore ridipinto (stesso kind su due varianti) rompe il `not.toBe`.
    const chiSiamoRitratto: SiteSectionLayout | undefined = sectionLayoutFor('chi-siamo-ritratto@1');
    const chiSiamoTimeline: SiteSectionLayout | undefined = sectionLayoutFor('chi-siamo-timeline@1');
    expect(chiSiamoRitratto?.section).toBe('chi-siamo'); // covers: AC-DE11-202-1
    expect(chiSiamoTimeline?.section).toBe('chi-siamo'); // covers: AC-DE11-202-1
    expect(chiSiamoRitratto?.kind).toBe('ritratto-testo'); // covers: AC-DE11-202-1
    expect(chiSiamoTimeline?.kind).toBe('timeline'); // covers: AC-DE11-202-1
    expect(chiSiamoRitratto?.kind).not.toBe(chiSiamoTimeline?.kind); // covers: AC-DE11-202-1

    const orariTabella: SiteSectionLayout | undefined = sectionLayoutFor('orari-tabella@1');
    const orariGriglia: SiteSectionLayout | undefined = sectionLayoutFor('orari-griglia@1');
    expect(orariTabella?.section).toBe('orari'); // covers: AC-DE11-202-1
    expect(orariGriglia?.section).toBe('orari'); // covers: AC-DE11-202-1
    expect(orariTabella?.kind).toBe('tabella'); // covers: AC-DE11-202-1
    expect(orariGriglia?.kind).toBe('griglia'); // covers: AC-DE11-202-1
    expect(orariTabella?.kind).not.toBe(orariGriglia?.kind); // covers: AC-DE11-202-1

    const contattiScheda: SiteSectionLayout | undefined = sectionLayoutFor('contatti-scheda@1');
    const contattiSchedaMappa: SiteSectionLayout | undefined =
      sectionLayoutFor('contatti-scheda-mappa@1');
    expect(contattiScheda?.section).toBe('contatti'); // covers: AC-DE11-202-1
    expect(contattiSchedaMappa?.section).toBe('contatti'); // covers: AC-DE11-202-1
    expect(contattiScheda?.kind).toBe('card'); // covers: AC-DE11-202-1
    expect(contattiSchedaMappa?.kind).toBe('mappa-fianco'); // covers: AC-DE11-202-1
    expect(contattiScheda?.kind).not.toBe(contattiSchedaMappa?.kind); // covers: AC-DE11-202-1
  });

  // ── AC-DE11-202-2 — la voce menu card-carta e i nastri esistono come voci versionate ──

  // covers: AC-DE11-202-2
  it('la voce menu card-carta esiste come voce di catalogo con id versionato nome@N', () => {
    const menu: SiteSectionLayout | undefined = sectionLayoutFor('menu-card-carta@1');
    expect(menu, 'menu-card-carta@1 assente').toBeDefined(); // covers: AC-DE11-202-2
    expect(menu?.id).toBe('menu-card-carta@1'); // covers: AC-DE11-202-2
    expect(menu?.section).toBe('menu'); // covers: AC-DE11-202-2
    // Il descrittore e' la card-carta (il "menu di carta"), non un bordo.
    expect(menu?.kind).toBe('card-carta'); // covers: AC-DE11-202-2
    expect(menu?.id).toMatch(ID_VERSIONATO); // covers: AC-DE11-202-2
  });

  // covers: AC-DE11-202-2
  it('i nastri divisori esistono: >=2 pattern distinti (scacchi-conici, gingham), id versionati nome@N', () => {
    // Anti-vacuita' + soglia dei nastri.
    expect(RIBBONS.length, 'meno di 2 nastri').toBeGreaterThanOrEqual(2); // covers: AC-DE11-202-2

    // >=2 pattern a due a due distinti (il campo VISIBILE, non solo l'id).
    const patterns = RIBBONS.map((r) => r.pattern);
    expect(new Set(patterns).size).toBeGreaterThanOrEqual(2); // covers: AC-DE11-202-2

    // I due pattern richiesti dal task esistono come valori del catalogo (letterali attesi).
    expect(patterns, 'manca il pattern scacchi-conici').toContain('scacchi-conici'); // covers: AC-DE11-202-2
    expect(patterns, 'manca il pattern gingham').toContain('gingham'); // covers: AC-DE11-202-2

    // Si raggiungono per id esatto e portano il loro `pattern` letterale (valori discordanti).
    const scacchi: SiteRibbon | undefined = ribbonFor('scacchi-conici@1');
    const gingham: SiteRibbon | undefined = ribbonFor('gingham@1');
    expect(scacchi?.id).toBe('scacchi-conici@1'); // covers: AC-DE11-202-2
    expect(scacchi?.pattern).toBe('scacchi-conici'); // covers: AC-DE11-202-2
    expect(gingham?.id).toBe('gingham@1'); // covers: AC-DE11-202-2
    expect(gingham?.pattern).toBe('gingham'); // covers: AC-DE11-202-2
    expect(scacchi?.pattern).not.toBe(gingham?.pattern); // covers: AC-DE11-202-2

    // Ogni id di nastro e' versionato nome@N.
    for (const r of RIBBONS) {
      expect(r.id, `nastro id non versionato: ${r.id}`).toMatch(ID_VERSIONATO); // covers: AC-DE11-202-2
    }
  });

  // ── DoD — id versionati e UNICI su ENTRAMBI i cataloghi (pronti per il freeze DE11-205) ──

  // covers: AC-DE11-202-2
  it('ogni id di section-layouts e di ribbons e nella forma versionata nome@N ed e unico', () => {
    // Soglie prima dei cicli, cosi' un catalogo svuotato non passa per vacuita'.
    expect(SECTION_LAYOUTS.length).toBeGreaterThanOrEqual(2); // covers: AC-DE11-202-2
    expect(RIBBONS.length).toBeGreaterThanOrEqual(2); // covers: AC-DE11-202-2
    for (const l of SECTION_LAYOUTS) {
      expect(l.id, `section-layout id non versionato: ${l.id}`).toMatch(ID_VERSIONATO); // covers: AC-DE11-202-2
    }
    // Id UNICI (un doppione renderebbe il lookup ambiguo).
    expect(new Set(SECTION_LAYOUTS.map((l) => l.id)).size).toBe(SECTION_LAYOUTS.length); // covers: AC-DE11-202-2
    expect(new Set(RIBBONS.map((r) => r.id)).size).toBe(RIBBONS.length); // covers: AC-DE11-202-2
  });

  // ── AC-DE11-202-3 — lookup ESATTO su array, mai per prefisso, proto-safe ──────────

  // covers: AC-DE11-202-3
  it('sectionLayoutFor risolve la coppia-prefisso contatti-scheda@1 / contatti-scheda-mappa@1 per id ESATTO', () => {
    // La relazione di prefisso e' REALE sui dati: il NOME 'contatti-scheda' e' prefisso-stringa del
    // NOME 'contatti-scheda-mappa' (come 'occhiello'/'occhiello-corsivo', 'piatto'/'piatto-fondo').
    expect('contatti-scheda-mappa'.startsWith('contatti-scheda')).toBe(true);

    const scheda: SiteSectionLayout | undefined = sectionLayoutFor('contatti-scheda@1');
    const schedaMappa: SiteSectionLayout | undefined = sectionLayoutFor('contatti-scheda-mappa@1');
    expect(scheda?.id).toBe('contatti-scheda@1'); // covers: AC-DE11-202-3
    expect(schedaMappa?.id).toBe('contatti-scheda-mappa@1'); // covers: AC-DE11-202-3
    // Voci DISTINTE con descrittori discordanti: se il lookup collassasse sul prefisso, i kind
    // coinciderebbero → ROSSO (non basta l'id: si prova sul valore).
    expect(scheda?.kind).not.toBe(schedaMappa?.kind); // covers: AC-DE11-202-3

    // Il PREFISSO nudo 'contatti-scheda' (senza '@N') NON e' una voce; ne lo e' l'id esteso '@10'.
    expect(sectionLayoutFor('contatti-scheda')).toBeUndefined(); // covers: AC-DE11-202-3
    expect(sectionLayoutFor('contatti-scheda@10')).toBeUndefined(); // covers: AC-DE11-202-3
  });

  // covers: AC-DE11-202-3
  it('ribbonFor risolve la coppia-prefisso gingham@1 / gingham-incrociato@1 per id ESATTO', () => {
    // Anche i nastri portano una coppia-prefisso REALE: 'gingham' e' prefisso-stringa di
    // 'gingham-incrociato'.
    expect('gingham-incrociato'.startsWith('gingham')).toBe(true);

    const gingham: SiteRibbon | undefined = ribbonFor('gingham@1');
    const ginghamIncrociato: SiteRibbon | undefined = ribbonFor('gingham-incrociato@1');
    expect(gingham?.id).toBe('gingham@1'); // covers: AC-DE11-202-3
    expect(ginghamIncrociato?.id).toBe('gingham-incrociato@1'); // covers: AC-DE11-202-3
    // Pattern discordanti: un collasso sul prefisso li farebbe coincidere → ROSSO.
    expect(gingham?.pattern).not.toBe(ginghamIncrociato?.pattern); // covers: AC-DE11-202-3

    // Il PREFISSO nudo 'gingham' (senza '@N') NON e' una voce; ne lo e' l'id esteso '@10'.
    expect(ribbonFor('gingham')).toBeUndefined(); // covers: AC-DE11-202-3
    expect(ribbonFor('gingham@10')).toBeUndefined(); // covers: AC-DE11-202-3
  });

  // covers: AC-DE11-202-3
  it('ogni id vero si risolve per uguaglianza esatta, mai per il nome senza @N ne per l id esteso (entrambi i cataloghi)', () => {
    // Su TUTTE le voci reali: l'id esatto trova SOLO l'esatto, il nome senza '@N' e l'id esteso no.
    for (const l of SECTION_LAYOUTS) {
      expect(sectionLayoutFor(l.id)?.id, `section-layout ${l.id} non trovato per id esatto`).toBe(
        l.id,
      ); // covers: AC-DE11-202-3
      const senzaVersione = l.id.replace(/@[0-9]+$/, '');
      expect(senzaVersione, `${l.id} gia privo di @N`).not.toBe(l.id);
      expect(sectionLayoutFor(senzaVersione), `section-layout ${senzaVersione}`).toBeUndefined(); // covers: AC-DE11-202-3
      expect(sectionLayoutFor(`${l.id}0`), `section-layout ${l.id}0`).toBeUndefined(); // covers: AC-DE11-202-3
    }
    for (const r of RIBBONS) {
      expect(ribbonFor(r.id)?.id, `nastro ${r.id} non trovato per id esatto`).toBe(r.id); // covers: AC-DE11-202-3
      const senzaVersione = r.id.replace(/@[0-9]+$/, '');
      expect(senzaVersione, `${r.id} gia privo di @N`).not.toBe(r.id);
      expect(ribbonFor(senzaVersione), `nastro ${senzaVersione}`).toBeUndefined(); // covers: AC-DE11-202-3
      expect(ribbonFor(`${r.id}0`), `nastro ${r.id}0`).toBeUndefined(); // covers: AC-DE11-202-3
    }
  });

  // covers: AC-DE11-202-3
  it('sectionLayoutFor e ribbonFor con chiavi di Object.prototype restituiscono undefined', () => {
    // Se un lookup fosse un accesso a un oggetto indicizzato per id, queste chiavi risolverebbero un
    // membro EREDITATO da Object.prototype invece di 'nessuna voce'.
    for (const chiave of CHIAVI_PROTO) {
      expect(sectionLayoutFor(chiave), `section-layouts: ${chiave}`).toBeUndefined(); // covers: AC-DE11-202-3
      expect(ribbonFor(chiave), `ribbons: ${chiave}`).toBeUndefined(); // covers: AC-DE11-202-3
    }
  });

  // ── DoD — ogni voce marca lo scope; i cataloghi mescolano universale e overlay ristorazione ──

  // covers: AC-DE11-202-2
  it('ogni voce marca lo scope (universale|ristorazione) e i cataloghi mescolano universale e overlay', () => {
    const scopeAmmessi = new Set(['universale', 'ristorazione']);
    for (const l of SECTION_LAYOUTS) {
      expect(scopeAmmessi.has(l.scope), `section-layout scope ignoto: ${l.id} → ${l.scope}`).toBe(
        true,
      ); // covers: AC-DE11-202-2
    }
    for (const r of RIBBONS) {
      expect(scopeAmmessi.has(r.scope), `nastro scope ignoto: ${r.id} → ${r.scope}`).toBe(true); // covers: AC-DE11-202-2
    }
    // Distinzione OSSERVABILE su dati reali: entrambi i cataloghi mescolano universale e overlay
    // ristorazione (il menu card-carta e il gingham della tovaglia sono di settore), cosi' il
    // fallback della matrice (DE11-203) ha davvero due casi da separare.
    const scopeLayout = new Set(SECTION_LAYOUTS.map((l) => l.scope));
    expect(scopeLayout.has('universale')).toBe(true); // covers: AC-DE11-202-2
    expect(scopeLayout.has('ristorazione')).toBe(true); // covers: AC-DE11-202-2
    const scopeRibbon = new Set(RIBBONS.map((r) => r.scope));
    expect(scopeRibbon.has('universale')).toBe(true); // covers: AC-DE11-202-2
    expect(scopeRibbon.has('ristorazione')).toBe(true); // covers: AC-DE11-202-2
  });
});

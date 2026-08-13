import { describe, it, expect } from 'vitest';
import {
  ILLUSTRATIONS,
  illustrationFor,
  type SiteIllustration,
} from '@/domain/generation/illustrations';

// DE11-104 (macrotask editorial-skin, design-engine-v1.1) — IL CATALOGO ILLUSTRAZIONI SVG (DS-D11).
// Le asserzioni DERIVANO dagli acceptance_criteria AC-DE11-104-1..4
// (docs/blueprint/design-engine-v1.1/01-editorial-skin.md), ogni blocco taggato con l'AC che
// esercita. Dominio puro: nessun DB, nessuna rete, nessun mock, nessun tempo — solo dati e un lookup.
//
// COSA QUESTO FILE NON PROVA (L-COL-006): non prova che un'illustrazione sia BELLA ne che il piatto
// somigli a un piatto — lo stile non e' oracolabile. Prova che il catalogo esiste, che il lookup e'
// per UGUAGLIANZA ESATTA (mai per prefisso, mai un membro ereditato da Object.prototype), che le
// scene dipingono con `currentColor` senza risorse esterne, e che gli id sono versionati 'nome@N'.

// La forma canonica di un id versionato, DERIVATA dallo schema del documento (document.ts,
// SiteDocumentSchema: `/^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$/`, il gate P2/P4). La STESSA regex usata
// dagli altri cataloghi (tests/design-catalogs.test.ts): questi id nascono pronti per il freeze.
const ID_VERSIONATO = /^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$/;

// ── AC-DE11-104-1 — lookup per id ESATTO, mai sul prefisso di nome ─────────────

describe('AC-DE11-104-1 — illustrationFor risolve per id esatto, nessun match sul prefisso', () => {
  // Fixture VIVA nel catalogo: due voci i cui id condividono il prefisso di NOME 'piatto'. 'piatto'
  // e' prefisso GENUINO di ENTRAMBI 'piatto@1' e 'piatto-fondo@1'. Un lookup lasco (startsWith/
  // includes) confonderebbe le due scene; l'uguaglianza esatta no.
  const BASE = 'piatto@1';
  const VARIANTE = 'piatto-fondo@1';
  const PREFISSO_CONDIVISO = 'piatto';

  // covers: AC-DE11-104-1
  it('le due voci in relazione di prefisso esistono davvero, e la relazione di prefisso e reale', () => {
    // Se una delle due sparisse, la prova sul prefisso sarebbe vacua: sono ancorate come presenti.
    expect(ILLUSTRATIONS.some((v) => v.id === BASE), BASE).toBe(true); // covers: AC-DE11-104-1
    expect(ILLUSTRATIONS.some((v) => v.id === VARIANTE), VARIANTE).toBe(true); // covers: AC-DE11-104-1
    // La relazione di prefisso e' LETTERALE sulle stringhe, non un modo di dire: il piu' corto e'
    // prefisso di ENTRAMBI gli id, ed e' la cosa che il lookup esatto deve NON confondere.
    expect(BASE.startsWith(PREFISSO_CONDIVISO), BASE).toBe(true); // covers: AC-DE11-104-1
    expect(VARIANTE.startsWith(PREFISSO_CONDIVISO), VARIANTE).toBe(true); // covers: AC-DE11-104-1
    expect(BASE).not.toBe(VARIANTE); // covers: AC-DE11-104-1
  });

  // covers: AC-DE11-104-1
  it('illustrationFor(id esatto) risolve SOLO quella voce, mai la variante che ne condivide il prefisso', () => {
    const base = illustrationFor(BASE);
    const variante = illustrationFor(VARIANTE);
    expect(base?.id, BASE).toBe(BASE); // covers: AC-DE11-104-1
    expect(variante?.id, VARIANTE).toBe(VARIANTE); // covers: AC-DE11-104-1
    // Il cuore dell'AC: l'id esatto del BASE non tira su la VARIANTE piu' lunga (e viceversa).
    expect(base?.id).not.toBe(VARIANTE); // covers: AC-DE11-104-1
    expect(variante?.id).not.toBe(BASE); // covers: AC-DE11-104-1
  });

  // covers: AC-DE11-104-1
  it('illustrationFor(prefisso nudo) non risolve NULLA: uguaglianza esatta, non startsWith', () => {
    // 'piatto' e' prefisso di due id reali ma non e' l'id di alcuna voce. Un lookup per prefisso ne
    // restituirebbe una; l'uguaglianza esatta restituisce undefined.
    expect(illustrationFor(PREFISSO_CONDIVISO)).toBeUndefined(); // covers: AC-DE11-104-1
    // e la contro-prova che il caso non e' vacuo: nessuna voce porta davvero quell'id nudo.
    expect(ILLUSTRATIONS.some((v) => v.id === PREFISSO_CONDIVISO)).toBe(false); // covers: AC-DE11-104-1
  });
});

// ── AC-DE11-104-2 — lookup PROTO-SAFE (mai un membro di Object.prototype) ──────

describe('AC-DE11-104-2 — un id ereditato da Object.prototype non risolve alcuna voce', () => {
  // covers: AC-DE11-104-2
  it("le chiavi speciali di JS ('constructor'/'__proto__'/'toString'/…) danno undefined", () => {
    for (const chiave of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      // Con una mappa-oggetto queste risolverebbero il membro EREDITATO; la find su array no.
      expect(illustrationFor(chiave), chiave).toBeUndefined(); // covers: AC-DE11-104-2
    }
  });
});

// ── AC-DE11-104-3 — currentColor, nessuna risorsa esterna ─────────────────────

describe('AC-DE11-104-3 — le scene usano currentColor e nessun riferimento esterno', () => {
  // I marcatori di risorsa ESTERNA che nessuna scena deve contenere: un URL http(s), un `xlink:href`
  // (canale classico di riferimento esterno negli SVG), un tag `<image>` o uno schema `data:`. Se una
  // scena ne portasse uno, aprirebbe una richiesta fuori da 'self' e sfonderebbe la CSP di /s/.
  const RIFERIMENTI_ESTERNI: readonly RegExp[] = [
    /https?:/i,
    /xlink:href/i,
    /<image\b/i,
    /\bhref\s*=/i,
    /\bsrc\s*=/i,
    /url\(/i,
    /data:/i,
  ];

  // Anti-vacuita': il catalogo non e' vuoto (altrimenti il forEach non proverebbe nulla).
  it('il catalogo contiene almeno il core set ristorazione', () => {
    expect(ILLUSTRATIONS.length).toBeGreaterThanOrEqual(4); // covers: AC-DE11-104-3
  });

  // covers: AC-DE11-104-3
  it('ogni voce e un <symbol>, dipinge con currentColor e non contiene risorse esterne', () => {
    for (const voce of ILLUSTRATIONS) {
      // E' davvero un elemento <symbol> (lo sprite che il renderer richiamera' via <use>).
      expect(voce.svg, voce.id).toMatch(/^<symbol\b/); // covers: AC-DE11-104-3
      expect(voce.svg, voce.id).toContain('</symbol>'); // covers: AC-DE11-104-3
      // Il colore e' EREDITATO: la scena nomina currentColor e nessun altro colore lo blocca.
      expect(voce.svg, voce.id).toContain('currentColor'); // covers: AC-DE11-104-3
      // Nessun riferimento a risorsa esterna, per marcatore.
      for (const marcatore of RIFERIMENTI_ESTERNI) {
        expect(marcatore.test(voce.svg), `${voce.id} :: ${marcatore}`).toBe(false); // covers: AC-DE11-104-3
      }
    }
  });

  // Contro-prova che il controllo sui marcatori NON e' vacuo: gli stessi marcatori scattano davvero su
  // una scena avvelenata (se non scattassero, il ciclo sopra sarebbe una tautologia sempre verde).
  it('i marcatori di risorsa esterna scattano su una scena avvelenata (il controllo non e vacuo)', () => {
    const avvelenata = '<symbol viewBox="0 0 24 24"><image xlink:href="https://evil.example/x.png" /></symbol>';
    expect(RIFERIMENTI_ESTERNI.some((m) => m.test(avvelenata))).toBe(true); // covers: AC-DE11-104-3
  });

  // Ogni valore di fill= / stroke= nelle scene. La DoD chiede scene tematizzabili via currentColor
  // (nessun fill/stroke che BLOCCHI l'ereditarieta' del colore): il core set dipinge SOLO con
  // 'currentColor' o 'none', mai un colore FISSO. NB: illustrations.ts sta in src/domain, FUORI dallo
  // scanner colori-letterali AC-231-4 (DS-D11-a, per posizione) — senza questo pin una scena con
  // fill="#c1440e" passerebbe (contiene currentColor, id valido, nessun ref esterno) pur violando la DoD.
  const FILL_STROKE = /(?:fill|stroke)\s*=\s*["']([^"']*)["']/gi;

  // covers: AC-DE11-104-3
  it('nessuna scena ha un fill/stroke con colore letterale che blocchi currentColor (DoD)', () => {
    for (const voce of ILLUSTRATIONS) {
      const valori = [...voce.svg.matchAll(FILL_STROKE)].map((m) => m[1].trim().toLowerCase());
      // Non vacuo: il core set DIPINGE, quindi almeno un fill/stroke c'e' da qualche parte nel catalogo.
      for (const valore of valori) {
        expect(['currentcolor', 'none'], `${voce.id} :: fill/stroke='${valore}'`).toContain(valore); // covers: AC-DE11-104-3
      }
    }
  });

  // Contro-prova che il pin NON e' vacuo: un fill esadecimale FISSO (che bloccherebbe l'ereditarieta')
  // viene colto come valore diverso da currentColor/none.
  it('il pin fill/stroke coglie un colore letterale bloccante (il controllo non e vacuo)', () => {
    const avvelenata = '<symbol viewBox="0 0 24 24"><path stroke="currentColor" fill="#c1440e" /></symbol>';
    const valori = [...avvelenata.matchAll(FILL_STROKE)].map((m) => m[1].trim().toLowerCase());
    expect(valori.some((v) => v !== 'currentcolor' && v !== 'none')).toBe(true); // covers: AC-DE11-104-3
  });
});

// ── AC-DE11-104-4 — id versionati 'nome@N' ───────────────────────────────────

describe('AC-DE11-104-4 — ogni id del catalogo e nella forma nome@N', () => {
  // covers: AC-DE11-104-4
  it('ogni voce ha un id versionato, e gli id sono unici (nessun duplicato che indebolisca il ciclo)', () => {
    expect(ILLUSTRATIONS.length).toBeGreaterThan(0); // covers: AC-DE11-104-4
    for (const voce of ILLUSTRATIONS) {
      expect(voce.id, voce.id).toMatch(ID_VERSIONATO); // covers: AC-DE11-104-4
    }
    // Gli id sono distinti: un duplicato gonfierebbe il catalogo e renderebbe ambiguo il lookup.
    const ids: readonly string[] = ILLUSTRATIONS.map((v: SiteIllustration) => v.id);
    expect(new Set(ids).size, 'id duplicati nel catalogo').toBe(ids.length); // covers: AC-DE11-104-4
  });

  // Contro-prova che la regex NON e' vacua: rifiuta un id senza versione e uno malformato.
  it('la regex rifiuta un id non versionato (il controllo di forma non e vacuo)', () => {
    expect(ID_VERSIONATO.test('piatto')).toBe(false); // covers: AC-DE11-104-4
    expect(ID_VERSIONATO.test('Piatto@1')).toBe(false); // covers: AC-DE11-104-4
    expect(ID_VERSIONATO.test('piatto@')).toBe(false); // covers: AC-DE11-104-4
  });
});

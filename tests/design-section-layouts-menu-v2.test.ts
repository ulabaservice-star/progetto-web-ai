import { describe, it, expect } from 'vitest';
import {
  MENU_LAYOUTS,
  menuLayoutFor,
  type SiteMenuLayout,
} from '@/domain/generation/section-layouts';

// DV2-301 (macrotask menu, design-engine-v2) — IL CATALOGO DELLE VARIANTI MENU. Le asserzioni DERIVANO
// dagli acceptance_criteria AC-DV2-301-1..3 (docs/blueprint/design-engine-v2/03-menu.md) e dalla
// definition_of_done del task; ogni blocco porta il tag `// covers: <AC-id>` sulla riga dell'EXPECT.
//
// COSA QUESTO FILE NON PROVA (L-COL-006): non prova che una variante di menu sia BELLA — lo stile non
// e' oracolabile. Prova che le 20 varianti esistono come voci versionate 'menu-<kebab>@N', UNICHE, con
// i DUE assi visibili (disposizione + trattamento del prezzo) NON vuoti; che due varianti distinte
// differiscono su almeno un asse VISIBILE (mai solo per nome); che il lookup e' per UGUAGLIANZA ESATTA
// su array (mai per prefisso, mai un membro ereditato da Object.prototype).
//
// POTERE DELLE ASSERZIONI: il lato ATTESO di ogni uguaglianza e' un LETTERALE scritto qui (i valori di
// `arrangement`/`price`, la regex dell'id), mai il binding importato dall'implementazione: un catalogo
// svuotato o una voce sbagliata (il prefisso al posto dell'esatto) rende ROSSO, non verde per tautologia.

// La forma canonica di un id versionato, DERIVATA dallo schema del documento (document.ts,
// VersionedIdSchema: `^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$`). Scritta qui a mano, non importata: gli id
// del menu devono essere pronti al freeze di variety-select senza far cadere il documento.
const ID_VERSIONATO = /^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$/;

// Le chiavi speciali di JavaScript: se il lookup fosse un oggetto indicizzato per id risolverebbero il
// membro EREDITATO da Object.prototype invece di 'nessuna voce'.
const CHIAVI_PROTO = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty', 'prototype', ''];

// I valori ammessi dei due assi (letterali attesi, scritti qui a mano — non importati). Un asse vuoto o
// fuori da questi insiemi rende ROSSO.
const ARRANGEMENTS = new Set([
  'carta', 'griglia', 'due-colonne', 'colonne-scure', 'indice', 'lavagna', 'registro', 'centrale',
  'pannelli', 'degustazione', 'bifold', 'mosaico', 'riquadri', 'foto-in-testa', 'serale', 'tavolata',
  'mercato', 'minimal', 'contrasto', 'strisce',
]);
const PRICE_TREATMENTS = new Set(['leader-dots', 'colonna', 'sotto', 'badge', 'in-linea']);

describe('DV2-301 · catalogo delle varianti menu (section-layouts.ts)', () => {
  // ── AC-DV2-301-1 — >=4 (di fatto 20) id distinti versionati, ogni asse struttura NON vuoto ──

  // covers: AC-DV2-301-1
  it('esporta >=4 menu_layout_id distinti versionati, ognuno con arrangement e price non vuoti', () => {
    // Anti-vacuita': un catalogo svuotato renderebbe i cicli veri per vacuita'.
    expect(MENU_LAYOUTS.length, 'catalogo menu troppo piccolo').toBeGreaterThanOrEqual(4); // covers: AC-DV2-301-1

    for (const m of MENU_LAYOUTS) {
      expect(m.id, `menu id non versionato: ${m.id}`).toMatch(ID_VERSIONATO); // covers: AC-DV2-301-1
      // Gli assi struttura sono valori REALI del vocabolario, non stringhe vuote/assenti.
      expect(ARRANGEMENTS.has(m.arrangement), `arrangement ignoto: ${m.id} → ${m.arrangement}`).toBe(true); // covers: AC-DV2-301-1
      expect(PRICE_TREATMENTS.has(m.price), `price ignoto: ${m.id} → ${m.price}`).toBe(true); // covers: AC-DV2-301-1
    }

    // Id UNICI (un doppione renderebbe il lookup ambiguo).
    expect(new Set(MENU_LAYOUTS.map((m) => m.id)).size, 'id di menu duplicati').toBe(MENU_LAYOUTS.length); // covers: AC-DV2-301-1
  });

  // covers: AC-DV2-301-1
  it('ogni voce marca uno scope ammesso e il catalogo mescola universale e overlay ristorazione', () => {
    const scopeAmmessi = new Set(['universale', 'ristorazione']);
    for (const m of MENU_LAYOUTS) {
      expect(scopeAmmessi.has(m.scope), `menu scope ignoto: ${m.id} → ${m.scope}`).toBe(true); // covers: AC-DV2-301-1
    }
    // Distinzione OSSERVABILE su dati reali: universale (ogni blocco offerte) + overlay ristorazione
    // (la carta su scuro), cosi' la matrice (DV2-303) ha davvero due casi da separare per scope.
    const scopes = new Set(MENU_LAYOUTS.map((m) => m.scope));
    expect(scopes.has('universale'), 'nessuna variante universale').toBe(true); // covers: AC-DV2-301-1
    expect(scopes.has('ristorazione'), 'nessun overlay ristorazione').toBe(true); // covers: AC-DV2-301-1
  });

  // ── AC-DV2-301-2 — lookup ESATTO su array, mai per prefisso, proto-safe ──────────

  // covers: AC-DV2-301-2
  it('menuLayoutFor risolve un id noto alla sua struttura esatta (valori discordanti su dati reali)', () => {
    // Prova su DATI REALI coi valori DISCORDANTI: ogni variante nota si raggiunge per id esatto e porta
    // i suoi assi LETTERALI. Un lookup che restituisse la voce sbagliata darebbe l'asse sbagliato.
    const carta: SiteMenuLayout | undefined = menuLayoutFor('menu-carta@1');
    expect(carta?.id).toBe('menu-carta@1'); // covers: AC-DV2-301-2
    expect(carta?.arrangement).toBe('carta'); // covers: AC-DV2-301-2
    expect(carta?.price).toBe('leader-dots'); // covers: AC-DV2-301-2

    const tavolata: SiteMenuLayout | undefined = menuLayoutFor('menu-tavolata@1');
    expect(tavolata?.arrangement).toBe('tavolata'); // covers: AC-DV2-301-2
    expect(tavolata?.price).toBe('colonna'); // covers: AC-DV2-301-2

    const riquadri: SiteMenuLayout | undefined = menuLayoutFor('menu-riquadri@1');
    expect(riquadri?.arrangement).toBe('riquadri'); // covers: AC-DV2-301-2
    expect(riquadri?.price).toBe('badge'); // covers: AC-DV2-301-2
  });

  // covers: AC-DV2-301-2
  it('un id inesistente non risolve a un default silenzioso (nome senza @N e id esteso danno undefined)', () => {
    for (const m of MENU_LAYOUTS) {
      expect(menuLayoutFor(m.id)?.id, `${m.id} non trovato per id esatto`).toBe(m.id); // covers: AC-DV2-301-2
      const senzaVersione = m.id.replace(/@[0-9]+$/, '');
      expect(senzaVersione, `${m.id} gia privo di @N`).not.toBe(m.id);
      expect(menuLayoutFor(senzaVersione), `menu ${senzaVersione}`).toBeUndefined(); // covers: AC-DV2-301-2
      expect(menuLayoutFor(`${m.id}0`), `menu ${m.id}0`).toBeUndefined(); // covers: AC-DV2-301-2
    }
    // Un id palesemente fantasma non cade su una variante di default.
    expect(menuLayoutFor('menu-non-esiste@9')).toBeUndefined(); // covers: AC-DV2-301-2
  });

  // covers: AC-DV2-301-2
  it('le due coppie-prefisso si risolvono per id ESATTO, non per prefisso', () => {
    // Relazioni di prefisso REALI sui dati: il NOME dell'uno e' prefisso-stringa del NOME dell'altro.
    expect('menu-carta-foto'.startsWith('menu-carta')).toBe(true);
    expect('menu-colonne-scure'.startsWith('menu-colonne')).toBe(true);

    const carta = menuLayoutFor('menu-carta@1');
    const cartaFoto = menuLayoutFor('menu-carta-foto@1');
    expect(carta?.id).toBe('menu-carta@1'); // covers: AC-DV2-301-2
    expect(cartaFoto?.id).toBe('menu-carta-foto@1'); // covers: AC-DV2-301-2
    // Voci DISTINTE: se il lookup collassasse sul prefisso, l'arrangement coinciderebbe → ROSSO.
    expect(carta?.arrangement).not.toBe(cartaFoto?.arrangement); // covers: AC-DV2-301-2

    const colonne = menuLayoutFor('menu-colonne@1');
    const colonneScure = menuLayoutFor('menu-colonne-scure@1');
    expect(colonne?.arrangement).not.toBe(colonneScure?.arrangement); // covers: AC-DV2-301-2

    // I PREFISSI nudi (senza '@N') NON sono voci.
    expect(menuLayoutFor('menu-carta')).toBeUndefined(); // covers: AC-DV2-301-2
    expect(menuLayoutFor('menu-colonne')).toBeUndefined(); // covers: AC-DV2-301-2
  });

  // covers: AC-DV2-301-2
  it('menuLayoutFor con chiavi di Object.prototype restituisce undefined', () => {
    for (const chiave of CHIAVI_PROTO) {
      expect(menuLayoutFor(chiave), `menu: ${chiave}`).toBeUndefined(); // covers: AC-DV2-301-2
    }
  });

  // ── AC-DV2-301-3 — due varianti distinte differiscono su un asse VISIBILE (non solo il nome) ──

  // covers: AC-DV2-301-3
  it('nessuna coppia di id distinti ha (arrangement, price) identici: la distinzione e VISIBILE, non nominale', () => {
    // Il cuore dell'AC: due menu_layout_id distinti devono differire su almeno un asse VISIBILE
    // (disposizione voci O trattamento prezzi), MAI solo per il nome. La firma (arrangement|price)
    // e' quindi UNICA per voce — se due varianti coincidessero su entrambi gli assi, sarebbero lo
    // stesso menu con due nomi → ROSSO.
    const firme = MENU_LAYOUTS.map((m) => `${m.arrangement}|${m.price}`);
    expect(new Set(firme).size, `due varianti condividono (arrangement, price): ${JSON.stringify(firme)}`).toBe(
      MENU_LAYOUTS.length,
    ); // covers: AC-DV2-301-3

    // Piu' forte: ogni ARRANGEMENT compare una sola volta (20 disposizioni davvero diverse, non lo
    // stesso menu ricolorato) — l'asse strutturale primario, da solo, gia' distingue tutte le voci.
    const arrangements = MENU_LAYOUTS.map((m) => m.arrangement);
    expect(new Set(arrangements).size, 'due varianti condividono la disposizione').toBe(MENU_LAYOUTS.length); // covers: AC-DV2-301-3
  });

  // covers: AC-DV2-301-3
  it('l asse del prezzo porta >=2 trattamenti distinti (non un unico stile ridipinto)', () => {
    const prices = new Set(MENU_LAYOUTS.map((m) => m.price));
    expect(prices.size, 'un unico trattamento del prezzo su tutte le varianti').toBeGreaterThanOrEqual(2); // covers: AC-DV2-301-3

    // Una coppia SPECIFICA che differisce sul solo asse prezzo a parita' di "famiglia" visibile:
    // menu-carta@1 (leader-dots) vs menu-serale@1 (in-linea) — prezzo trattato in modo diverso.
    expect(menuLayoutFor('menu-carta@1')?.price).toBe('leader-dots'); // covers: AC-DV2-301-3
    expect(menuLayoutFor('menu-serale@1')?.price).toBe('in-linea'); // covers: AC-DV2-301-3
    expect(menuLayoutFor('menu-carta@1')?.price).not.toBe(menuLayoutFor('menu-serale@1')?.price); // covers: AC-DV2-301-3
  });

  // covers: AC-DV2-301-3
  it('FALSIFICABILE: la firma (arrangement|price) scatta su una collisione simulata', () => {
    // Contro-prova del predicato di unicita': due firme uguali riducono la cardinalita' del Set.
    const collisione = ['carta|leader-dots', 'carta|leader-dots', 'griglia|badge'];
    expect(new Set(collisione).size).not.toBe(collisione.length); // covers: AC-DV2-301-3
  });
});

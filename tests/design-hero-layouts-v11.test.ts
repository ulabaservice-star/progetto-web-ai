import { describe, it, expect } from 'vitest';
import {
  HERO_LAYOUTS,
  heroLayoutFor,
  type SiteHeroLayout,
} from '@/domain/generation/hero-layouts';
import {
  H1_TREATMENTS,
  h1TreatmentFor,
  type SiteH1Treatment,
} from '@/domain/generation/h1-treatments';

// DE11-201 (macrotask variety-engine, design-engine-v1.1) — HERO RICCHI + ASSE TRATTAMENTO-H1. Le
// asserzioni DERIVANO dagli acceptance_criteria AC-DE11-201-1..4 (docs/blueprint/design-engine-v1.1/
// 02-variety-engine.md) e dalla definition_of_done del task; ogni blocco porta il tag dell'AC (o
// della riga di DoD) che esercita. I cataloghi v1 stanno in tests/design-catalogs.test.ts e NON
// vengono toccati qui: questo file prova SOLO le aggiunte v1.1 (il 5o hero universale col media
// nuovo 'testo-illustrazione' + i suoi slot ricchi, e il catalogo trattamento-H1).
//
// COSA QUESTO FILE NON PROVA (L-COL-006): non prova che un hero sia BELLO ne che un trattamento-H1
// sia elegante — lo stile non e' oracolabile. Prova che i cataloghi esistono, che gli id sono
// versionati 'nome@N', che il lookup e' per UGUAGLIANZA ESATTA su array (mai per prefisso, mai un
// membro ereditato da Object.prototype), e — cuore del macrotask — che gli hero UNIVERSALI sono
// almeno cinque con MEDIA a due a due DISTINTE (la correzione del difetto v1 "3/5 stesso hero").
//
// POTERE DELLE ASSERZIONI: il lato ATTESO di ogni uguaglianza e' un LETTERALE scritto qui (i valori
// di media/style, la regex dell'id), mai il binding importato dall'implementazione: un export
// neutralizzato o una voce sbagliata (il prefisso) rende rosso, non verde per tautologia.

// La forma canonica di un id versionato, DERIVATA dallo schema del documento (document.ts,
// SiteDocumentSchema / VersionedIdSchema: `^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$`). Scritta qui a mano,
// non importata: gli id dei nuovi assi devono essere pronti al freeze di DE11-205 senza far cadere
// il documento.
const ID_VERSIONATO = /^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$/;

// Le chiavi speciali di JavaScript: se un lookup fosse un oggetto indicizzato per id risolverebbero
// il membro EREDITATO da Object.prototype invece di 'nessuna voce'.
const CHIAVI_PROTO = [
  'constructor',
  '__proto__',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'prototype',
  '',
];

// L'id versionato del nuovo hero ricco 2-col asimmetrico (fixture: e' un LETTERALE, non un import).
const HERO_RICCO = 'editoriale-illustrato@1';

describe('DE11-201 · hero ricchi + asse trattamento-H1', () => {
  // ── AC-DE11-201-1 — heroLayoutFor trova SOLO l'id esatto, MAI il prefisso ──────

  // covers: AC-DE11-201-1
  it('heroLayoutFor risolve la coppia-prefisso centrato@1 / centrato-foto@1 per id ESATTO, mai il prefisso', () => {
    // La relazione di prefisso e' REALE sui dati: 'centrato' e' prefisso-stringa di ENTRAMBI gli id.
    const ids = HERO_LAYOUTS.map((h) => h.id);
    expect(ids, 'manca centrato@1').toContain('centrato@1'); // covers: AC-DE11-201-1
    expect(ids, 'manca centrato-foto@1').toContain('centrato-foto@1'); // covers: AC-DE11-201-1

    // I due id risolvono a voci DISTINTE con media discordanti: un lookup che restituisse il
    // prefisso al posto dell'esatto darebbe la media sbagliata → rosso (non basta il solo id).
    const centrato: SiteHeroLayout | undefined = heroLayoutFor('centrato@1');
    const centratoFoto: SiteHeroLayout | undefined = heroLayoutFor('centrato-foto@1');
    expect(centrato?.id).toBe('centrato@1'); // covers: AC-DE11-201-1
    expect(centratoFoto?.id).toBe('centrato-foto@1'); // covers: AC-DE11-201-1
    expect(centrato?.media).toBe('senza-foto'); // covers: AC-DE11-201-1
    expect(centratoFoto?.media).toBe('foto-riquadro'); // covers: AC-DE11-201-1
    expect(centrato?.media).not.toBe(centratoFoto?.media); // covers: AC-DE11-201-1

    // Il PREFISSO nudo 'centrato' (prefisso-stringa di entrambi gli id veri) NON e' una voce; ne lo
    // e' 'centrato-foto' senza versione, ne 'centrato@1' esteso a '@11'.
    expect(heroLayoutFor('centrato')).toBeUndefined(); // covers: AC-DE11-201-1
    expect(heroLayoutFor('centrato-foto')).toBeUndefined(); // covers: AC-DE11-201-1
    expect(heroLayoutFor('centrato@11')).toBeUndefined(); // covers: AC-DE11-201-1
  });

  // covers: AC-DE11-201-1
  it('anche il nuovo hero ricco si risolve per id ESATTO e non per il suo nome nudo', () => {
    const ricco = heroLayoutFor(HERO_RICCO);
    expect(ricco?.id, `${HERO_RICCO} non trovato per id esatto`).toBe(HERO_RICCO); // covers: AC-DE11-201-1
    // Il nome senza '@N' non e' una voce, e nemmeno l'id esteso '@10'.
    expect(heroLayoutFor('editoriale-illustrato')).toBeUndefined(); // covers: AC-DE11-201-1
    expect(heroLayoutFor(`${HERO_RICCO}0`)).toBeUndefined(); // covers: AC-DE11-201-1
  });

  // ── AC-DE11-201-2 — il catalogo trattamento-H1: >=2 valori distinti, id versionati ──

  // covers: AC-DE11-201-2
  it('H1_TREATMENTS elenca >=2 trattamenti DISTINTI, inclusi accento-ondulato e occhiello-corsivo', () => {
    // Anti-vacuita': un catalogo vuoto renderebbe i cicli veri per vacuita'.
    expect(H1_TREATMENTS.length).toBeGreaterThanOrEqual(2); // covers: AC-DE11-201-2

    // >=2 tratti VISIBILI a due a due distinti (il campo `style`, non solo l'id).
    const styles = H1_TREATMENTS.map((t) => t.style);
    expect(new Set(styles).size).toBeGreaterThanOrEqual(2); // covers: AC-DE11-201-2

    // I due tratti richiesti dal task esistono come valori del catalogo (letterali attesi).
    expect(styles, 'manca il tratto accento-ondulato').toContain('accento-ondulato'); // covers: AC-DE11-201-2
    expect(styles, 'manca il tratto occhiello-corsivo').toContain('occhiello-corsivo'); // covers: AC-DE11-201-2

    // Ogni id del catalogo trattamento-H1 e' nella forma versionata 'nome@N'.
    for (const t of H1_TREATMENTS) {
      expect(t.id, `id non versionato: ${t.id}`).toMatch(ID_VERSIONATO); // covers: AC-DE11-201-2
    }
    // Id UNICI dentro il catalogo (un doppione renderebbe il lookup ambiguo).
    expect(new Set(H1_TREATMENTS.map((t) => t.id)).size).toBe(H1_TREATMENTS.length); // covers: AC-DE11-201-2
  });

  // covers: AC-DE11-201-2
  it('h1TreatmentFor risolve per id ESATTO e restituisce il tratto giusto (valori discordanti)', () => {
    // I due trattamenti richiesti si raggiungono per id esatto e portano il loro `style` letterale:
    // un lookup che restituisse la voce sbagliata darebbe lo style sbagliato → rosso.
    const accento: SiteH1Treatment | undefined = h1TreatmentFor('accento-ondulato@1');
    const occhielloCorsivo: SiteH1Treatment | undefined = h1TreatmentFor('occhiello-corsivo@1');
    expect(accento?.id).toBe('accento-ondulato@1'); // covers: AC-DE11-201-2
    expect(accento?.style).toBe('accento-ondulato'); // covers: AC-DE11-201-2
    expect(occhielloCorsivo?.id).toBe('occhiello-corsivo@1'); // covers: AC-DE11-201-2
    expect(occhielloCorsivo?.style).toBe('occhiello-corsivo'); // covers: AC-DE11-201-2
    expect(accento?.style).not.toBe(occhielloCorsivo?.style); // covers: AC-DE11-201-2
  });

  // covers: AC-DE11-201-2
  it('il catalogo trattamento-H1 porta una coppia-prefisso (occhiello@1 / occhiello-corsivo@1), risolta per id esatto', () => {
    // Come le altre voci di catalogo (centrato/centrato-foto, piatto/piatto-fondo): un nome e'
    // prefisso-stringa dell'altro, e il lookup ESATTO NON deve confonderli.
    const occhiello: SiteH1Treatment | undefined = h1TreatmentFor('occhiello@1');
    const occhielloCorsivo: SiteH1Treatment | undefined = h1TreatmentFor('occhiello-corsivo@1');
    expect(occhiello?.id).toBe('occhiello@1'); // covers: AC-DE11-201-2
    expect(occhielloCorsivo?.id).toBe('occhiello-corsivo@1'); // covers: AC-DE11-201-2
    // Due voci diverse con tratti diversi: se il lookup collassasse sul prefisso, gli style
    // coinciderebbero → rosso.
    expect(occhiello?.style).not.toBe(occhielloCorsivo?.style); // covers: AC-DE11-201-2
    // Il PREFISSO nudo 'occhiello-corsivo' senza '@N' e l'id esteso '@10' non sono voci.
    expect(h1TreatmentFor('occhiello-corsivo')).toBeUndefined(); // covers: AC-DE11-201-2
    expect(h1TreatmentFor('occhiello-corsivo@10')).toBeUndefined(); // covers: AC-DE11-201-2
  });

  // ── AC-DE11-201-3 — ogni voce (hero-layout E trattamento-H1) ha un id 'nome@N' ──

  // covers: AC-DE11-201-3
  it('ogni id di hero-layouts e del trattamento-H1 e nella forma versionata nome@N', () => {
    // Anti-vacuita': soglie prima dei cicli, cosi' un catalogo svuotato non passa per vacuita'.
    expect(HERO_LAYOUTS.length).toBeGreaterThanOrEqual(5); // covers: AC-DE11-201-3
    expect(H1_TREATMENTS.length).toBeGreaterThanOrEqual(2); // covers: AC-DE11-201-3
    for (const h of HERO_LAYOUTS) {
      expect(h.id, `hero-layout id non versionato: ${h.id}`).toMatch(ID_VERSIONATO); // covers: AC-DE11-201-3
    }
    for (const t of H1_TREATMENTS) {
      expect(t.id, `trattamento-H1 id non versionato: ${t.id}`).toMatch(ID_VERSIONATO); // covers: AC-DE11-201-3
    }
  });

  // ── AC-DE11-201-4 — lookup proto-safe su ENTRAMBI i cataloghi ──────────────────

  // covers: AC-DE11-201-4
  it('heroLayoutFor e h1TreatmentFor con chiavi di Object.prototype restituiscono undefined', () => {
    // Se un lookup fosse un accesso a un oggetto indicizzato per id, queste chiavi risolverebbero un
    // membro EREDITATO da Object.prototype invece di 'nessuna voce'.
    for (const chiave of CHIAVI_PROTO) {
      expect(heroLayoutFor(chiave), `hero-layouts: ${chiave}`).toBeUndefined(); // covers: AC-DE11-201-4
      expect(h1TreatmentFor(chiave), `trattamento-H1: ${chiave}`).toBeUndefined(); // covers: AC-DE11-201-4
    }
  });

  // ── DoD — il nuovo hero 2-col asimmetrico RICCO (slot testo/illustrazione/badge/CTA/meta) ──

  // covers: DoD-201 hero-ricco-2col-asimmetrico
  it('espone un hero 2-col ASIMMETRICO ricco (media testo-illustrazione, senza foto) coi suoi slot', () => {
    const ricco = heroLayoutFor(HERO_RICCO);
    expect(ricco, `${HERO_RICCO} assente`).toBeDefined(); // covers: DoD-201
    // Universale (porta gli hero universali a >=5, requisito della distinzione rafforzata a valle).
    expect(ricco?.scope).toBe('universale'); // covers: DoD-201
    // Media NUOVA 'testo-illustrazione' (2-col testo + illustrazione), DISTINTA da split 'foto-affiancata'.
    expect(ricco?.media).toBe('testo-illustrazione'); // covers: DoD-201
    expect(ricco?.media).not.toBe(heroLayoutFor('split@1')?.media); // covers: DoD-201
    // 2 colonne ASIMMETRICHE: il tratto che lo distingue dallo split simmetrico.
    expect(ricco?.columns).toBe('asimmetriche'); // covers: DoD-201
    // Gli SLOT ricchi dichiarati: testo, illustrazione, badge, CTA, meta/chip.
    const slots = ricco?.slots ?? [];
    for (const atteso of ['testo', 'illustrazione', 'badge', 'cta', 'chip'] as const) {
      expect(slots, `slot mancante: ${atteso}`).toContain(atteso); // covers: DoD-201
    }
  });

  // ── DoD — gli hero UNIVERSALI sono >=5 con >=5 MEDIA distinte (varieta' del primo schermo) ──
  // MIGRATO da DV2-201 (design-engine-v2): la bijezione v1.1 "tante media quanti gli hero universali"
  // (il fix "3/5 stesso hero" quando gli hero universali erano cinque) e' SUPERATA dal catalogo Claude
  // Design (DS-V2-D1/D9): le 20 varianti CD REIMPIEGANO deliberatamente la stessa `media` piu' volte,
  // distinte dal `title_treatment` e dalla STRUTTURA (non da una media unica ciascuna). La distinzione
  // del PRIMO SCHERMO fra le 5 varianti SCELTE resta garantita da `hero_layout_id` DISTINTO
  // (design-select, provato in design-select-v11), non piu' dalla media-bijezione. Qui si pinna il FLOOR
  // di varieta' (>=5 media distinte) e la presenza delle 5 media canoniche v1.1.

  // covers: DoD-201 hero-universali-media-distinte
  it('gli hero universali sono almeno cinque e coprono almeno cinque MEDIA distinte', () => {
    const universali = HERO_LAYOUTS.filter((h) => h.scope === 'universale');
    // Almeno cinque hero universali: e' la premessa che permette >=5 combo con hero VISIBILE diverso.
    expect(universali.length, 'meno di cinque hero universali').toBeGreaterThanOrEqual(5); // covers: DoD-201
    // FLOOR di varieta' del primo schermo: almeno cinque `media` DISTINTE fra gli universali (soglia
    // LETTERALE >=5, NON la bijezione col conteggio degli hero — DS-V2-D9: piu' varianti CD per media).
    const media = universali.map((h) => h.media);
    expect(
      new Set(media).size,
      'meno di cinque media distinte fra gli hero universali',
    ).toBeGreaterThanOrEqual(5); // covers: DoD-201
    // Le cinque media v1.1 attese sono TUTTE ancora presenti (letterali): la copertura strutturale storica.
    for (const atteso of [
      'senza-foto',
      'foto-riquadro',
      'foto-piena',
      'foto-affiancata',
      'testo-illustrazione',
    ] as const) {
      expect(media, `media universale mancante: ${atteso}`).toContain(atteso); // covers: DoD-201
    }
  });

  // ── DoD — ogni voce marca l'idoneita' (scope); i trattamenti-H1 sono tutti universali ──

  // covers: DoD-201 idoneita-scope
  it('ogni voce marca lo scope; i trattamenti-H1 sono tutti universali, gli hero mescolano universale e overlay', () => {
    const scopeAmmessi = new Set(['universale', 'ristorazione']);
    for (const h of HERO_LAYOUTS) {
      expect(scopeAmmessi.has(h.scope), `hero-layout scope ignoto: ${h.id} → ${h.scope}`).toBe(true); // covers: DoD-201
    }
    // I trattamenti-H1 sono TUTTI universali (nessun overlay di settore in questo asse).
    for (const t of H1_TREATMENTS) {
      expect(t.scope, `trattamento-H1 non universale: ${t.id}`).toBe('universale'); // covers: DoD-201
    }
    // Gli hero mescolano universale e overlay ristorazione (scena-scura@1 e' overlay): il fallback
    // della matrice ha davvero due casi da separare.
    const scopeHero = new Set(HERO_LAYOUTS.map((h) => h.scope));
    expect(scopeHero.has('universale')).toBe(true); // covers: DoD-201
    expect(scopeHero.has('ristorazione')).toBe(true); // covers: DoD-201
  });
});

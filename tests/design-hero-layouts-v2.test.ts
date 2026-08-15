import { describe, it, expect } from 'vitest';
import {
  HERO_LAYOUTS,
  heroLayoutFor,
  type SiteHeroLayout,
} from '@/domain/generation/hero-layouts';

// DV2-201 (macrotask hero, design-engine-v2) — AMPLIAMENTO DEL CATALOGO HERO. Le asserzioni DERIVANO
// dagli acceptance_criteria AC-DV2-201-1..3 (scratchpad/hero-build-brief.md §DV2-201); ogni blocco
// porta il tag `// covers: <AC>` dell'AC che esercita. Le voci v1/v1.1 (le sei legacy) sono provate
// altrove (tests/design-catalogs.test.ts, tests/design-hero-layouts-v11.test.ts) e NON vengono
// riprovate qui: questo file prova le AGGIUNTE v2 (le 20 varianti Claude Design 'hero-<kebab>@1', il
// nuovo asse `title_treatment`, i placement `media` CD) e che il lookup resta esatto/proto-safe.
//
// COSA QUESTO FILE NON PROVA: non prova che un hero sia BELLO (lo stile non e' oracolabile). Prova che
// il catalogo si e' ampliato, che gli id sono versionati e distinti, che il lookup e' per UGUAGLIANZA
// ESATTA su array (mai per prefisso, mai un membro ereditato da Object.prototype), e — cuore del task
// — che due varianti differiscono su un asse VISIBILE (media OPPURE title_treatment), non solo per id.
//
// PROVENIENZA (niente X===X): il lato ATTESO di ogni uguaglianza e' un LETTERALE scritto QUI (le
// stringhe media/title_treatment, la regex dell'id, le soglie), MAI il binding importato che
// l'implementazione usa. Un export neutralizzato o una voce sbagliata (il prefisso) rende rosso.

// La forma di un id versionato secondo l'AC-DV2-201-1 (scritta a mano, non importata).
const ID_VERSIONATO = /^[a-z0-9-]+@\d+$/;

// Le chiavi speciali di JavaScript: se il lookup fosse un oggetto indicizzato per id, risolverebbero
// il membro EREDITATO da Object.prototype invece di 'nessuna voce'.
const CHIAVI_PROTO = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'];

// I 20 id delle varianti Claude Design (scratchpad/hero-build-brief.md §"Naming id"). Lista LETTERALE
// scritta a mano: la usiamo per isolare le voci CD dalle sei legacy senza leggere l'implementazione.
const CD_IDS: readonly string[] = [
  'hero-full@1',
  'hero-split@1',
  'hero-editorial@1',
  'hero-full-centrato@1',
  'hero-split-inverso@1',
  'hero-banda@1',
  'hero-copertina@1',
  'hero-duale@1',
  'hero-carta-su-foto@1',
  'hero-poster@1',
  'hero-arco@1',
  'hero-biglietto@1',
  'hero-manifesto@1',
  'hero-laterale@1',
  'hero-collage@1',
  'hero-cornice@1',
  'hero-angolo@1',
  'hero-fasce@1',
  'hero-tipografico@1',
  'hero-gazzetta@1',
];

// FIXTURE per l'AC-DV2-201-2/3: elenco con >=2 elementi, valori DISCORDANTI, e la coppia-prefisso
// hero-split@1 / hero-split-inverso@1 (il token nudo 'hero-split' NON deve risolvere). I valori attesi
// sono LETTERALI scritti a mano (non importati): se una voce cambiasse media/trattamento, o il lookup
// collassasse sul prefisso, l'uguaglianza fallirebbe. Include ANCHE la coppia same-media
// hero-full@1 / hero-carta-su-foto@1 (stessa media 'foto-full-bleed', trattamento 'overlay' vs
// 'carta'): prova che l'asse titolo discrimina a parita' di placement foto.
const CD_ATTESI: ReadonlyArray<{
  readonly id: string;
  readonly media: string;
  readonly title_treatment: string;
}> = [
  { id: 'hero-split@1', media: 'foto-split-dx', title_treatment: 'standard' },
  { id: 'hero-split-inverso@1', media: 'foto-split-sx', title_treatment: 'standard' },
  { id: 'hero-full@1', media: 'foto-full-bleed', title_treatment: 'overlay' },
  { id: 'hero-tipografico@1', media: 'senza-foto-tipografico', title_treatment: 'gigante' },
  { id: 'hero-carta-su-foto@1', media: 'foto-full-bleed', title_treatment: 'carta' },
];

describe('DV2-201 · ampliamento catalogo hero (20 varianti Claude Design + asse title_treatment)', () => {
  // ── AC-DV2-201-1 — il catalogo si e' ampliato: >=8 id versionati DISTINTI, campi non vuoti ──

  // covers: AC-DV2-201-1
  it('espone >=8 hero con id versionati DISTINTI e media non vuota (title_treatment sulle voci CD)', () => {
    // Soglia LETTERALE (non derivata dall'implementazione): 6 legacy + 20 CD = 26 >= 8.
    expect(HERO_LAYOUTS.length).toBeGreaterThanOrEqual(8); // covers: AC-DV2-201-1

    // Ogni id e' nella forma versionata 'nome@N' e gli id sono tutti DISTINTI (nessun doppione, che
    // renderebbe il lookup ambiguo).
    const ids = HERO_LAYOUTS.map((h) => h.id);
    for (const h of HERO_LAYOUTS) {
      expect(h.id, `id non versionato: ${h.id}`).toMatch(ID_VERSIONATO); // covers: AC-DV2-201-1
    }
    expect(new Set(ids).size, 'id duplicati nel catalogo').toBe(ids.length); // covers: AC-DV2-201-1

    // Ogni voce ha una `media` troncabile NON vuota (nessun campo struttura svuotato).
    for (const h of HERO_LAYOUTS) {
      expect(typeof h.media, `media non stringa: ${h.id}`).toBe('string'); // covers: AC-DV2-201-1
      expect(h.media.trim().length, `media vuota: ${h.id}`).toBeGreaterThan(0); // covers: AC-DV2-201-1
    }

    // Le 20 voci CD dichiarano IN PIU' un `title_treatment` non vuoto (il campo e' opzionale sul tipo
    // per retro-compat con le sei legacy, ma le voci CD lo portano SEMPRE).
    for (const id of CD_IDS) {
      const voce: SiteHeroLayout | undefined = heroLayoutFor(id);
      expect(voce, `voce CD assente: ${id}`).toBeDefined(); // covers: AC-DV2-201-1
      const tt = voce?.title_treatment;
      expect(typeof tt, `title_treatment non stringa: ${id}`).toBe('string'); // covers: AC-DV2-201-1
      expect((tt ?? '').trim().length, `title_treatment vuoto: ${id}`).toBeGreaterThan(0); // covers: AC-DV2-201-1
    }
  });

  // ── AC-DV2-201-2 — lookup per UGUAGLIANZA ESATTA: prefisso non risolve, proto-safe ──

  // covers: AC-DV2-201-2
  it('heroLayoutFor risolve hero-split@1 alla voce ESATTA e NON risolve il prefisso hero-split', () => {
    // La voce esatta porta la media LETTERALE attesa (non HERO_LAYOUTS[i].media): una voce sbagliata
    // o un lookup che collassasse sul prefisso darebbe la media sbagliata → rosso.
    const split: SiteHeroLayout | undefined = heroLayoutFor('hero-split@1');
    expect(split?.id).toBe('hero-split@1'); // covers: AC-DV2-201-2
    expect(split?.media).toBe('foto-split-dx'); // covers: AC-DV2-201-2
    expect(split?.title_treatment).toBe('standard'); // covers: AC-DV2-201-2

    // La coppia-prefisso: hero-split-inverso@1 e' una voce DIVERSA con media discordante; il token
    // nudo 'hero-split' (prefisso-stringa di entrambi) NON e' una voce, ne lo e' l'id esteso a '@11'.
    const splitInverso: SiteHeroLayout | undefined = heroLayoutFor('hero-split-inverso@1');
    expect(splitInverso?.media).toBe('foto-split-sx'); // covers: AC-DV2-201-2
    expect(split?.media).not.toBe(splitInverso?.media); // covers: AC-DV2-201-2
    expect(heroLayoutFor('hero-split')).toBeUndefined(); // covers: AC-DV2-201-2
    expect(heroLayoutFor('hero-split@11')).toBeUndefined(); // covers: AC-DV2-201-2
  });

  // covers: AC-DV2-201-2
  it('heroLayoutFor con chiavi di Object.prototype restituisce undefined (proto-safe)', () => {
    // Se il lookup fosse un accesso a un oggetto indicizzato per id, queste chiavi risolverebbero un
    // membro EREDITATO da Object.prototype invece di 'nessuna voce'.
    expect(heroLayoutFor('__proto__')).toBeUndefined(); // covers: AC-DV2-201-2
    expect(heroLayoutFor('constructor')).toBeUndefined(); // covers: AC-DV2-201-2
    for (const chiave of CHIAVI_PROTO) {
      expect(heroLayoutFor(chiave), `proto-key risolta: ${chiave}`).toBeUndefined(); // covers: AC-DV2-201-2
    }
  });

  // covers: AC-DV2-201-2
  it('ogni voce della fixture si risolve per id ESATTO ai valori LETTERALI attesi (niente tautologia)', () => {
    // Anti-vacuita': la fixture ha >=2 elementi con valori discordanti.
    expect(CD_ATTESI.length).toBeGreaterThanOrEqual(2); // covers: AC-DV2-201-2
    for (const atteso of CD_ATTESI) {
      const voce = heroLayoutFor(atteso.id);
      expect(voce?.id, `id non risolto: ${atteso.id}`).toBe(atteso.id); // covers: AC-DV2-201-2
      expect(voce?.media, `media inattesa: ${atteso.id}`).toBe(atteso.media); // covers: AC-DV2-201-2
      expect(voce?.title_treatment, `title_treatment inatteso: ${atteso.id}`).toBe(
        atteso.title_treatment,
      ); // covers: AC-DV2-201-2
    }
  });

  // ── AC-DV2-201-3 — due voci distinte differiscono su un asse VISIBILE (media O title_treatment) ──

  // covers: AC-DV2-201-3
  it('due voci distinte (hero-full@1 vs hero-tipografico@1) differiscono su un asse VISIBILE, non solo per id', () => {
    // Valori LETTERALI attesi: media diverse (foto-full-bleed vs senza-foto-tipografico).
    const full = heroLayoutFor('hero-full@1');
    const tipografico = heroLayoutFor('hero-tipografico@1');
    expect(full?.id).not.toBe(tipografico?.id); // covers: AC-DV2-201-3
    expect(full?.media).toBe('foto-full-bleed'); // covers: AC-DV2-201-3
    expect(tipografico?.media).toBe('senza-foto-tipografico'); // covers: AC-DV2-201-3
    // Differiscono su media OPPURE title_treatment (l'asse visibile), non per il solo id.
    const asseVisibileDiverso =
      full?.media !== tipografico?.media ||
      full?.title_treatment !== tipografico?.title_treatment;
    expect(asseVisibileDiverso, 'due voci coincidono su media E title_treatment').toBe(true); // covers: AC-DV2-201-3
  });

  // covers: AC-DV2-201-3
  it('fra i 20 id CD i media distinti sono >=2 e almeno una coppia SAME-MEDIA ha title_treatment diverso', () => {
    const cd = CD_IDS.map((id) => heroLayoutFor(id)).filter(
      (v): v is SiteHeroLayout => v !== undefined,
    );
    expect(cd.length, 'una o piu voci CD non risolvono').toBe(CD_IDS.length); // covers: AC-DV2-201-3

    // Soglia LETTERALE >=2: la varieta' cromatica NON basta, servono placement foto diversi.
    const mediaDistinti = new Set(cd.map((v) => v.media));
    expect(mediaDistinti.size).toBeGreaterThanOrEqual(2); // covers: AC-DV2-201-3

    // Esiste almeno una coppia con la STESSA media ma title_treatment DIVERSO (prova che l'asse titolo
    // discrimina anche a parita' di placement foto).
    const perMedia = new Map<string, Set<string>>();
    for (const v of cd) {
      const set = perMedia.get(v.media) ?? new Set<string>();
      set.add(v.title_treatment ?? '');
      perMedia.set(v.media, set);
    }
    const esisteSameMediaTrattamentoDiverso = [...perMedia.values()].some((s) => s.size >= 2);
    expect(
      esisteSameMediaTrattamentoDiverso,
      'nessuna coppia same-media con title_treatment diverso',
    ).toBe(true); // covers: AC-DV2-201-3

    // Ancoraggio LETTERALE della coppia same-media: hero-full@1 e hero-carta-su-foto@1 condividono la
    // media 'foto-full-bleed' ma trattano il titolo in modo diverso ('overlay' vs 'carta').
    const full = heroLayoutFor('hero-full@1');
    const carta = heroLayoutFor('hero-carta-su-foto@1');
    expect(full?.media).toBe('foto-full-bleed'); // covers: AC-DV2-201-3
    expect(carta?.media).toBe('foto-full-bleed'); // covers: AC-DV2-201-3
    expect(full?.title_treatment).toBe('overlay'); // covers: AC-DV2-201-3
    expect(carta?.title_treatment).toBe('carta'); // covers: AC-DV2-201-3
    expect(full?.title_treatment).not.toBe(carta?.title_treatment); // covers: AC-DV2-201-3
  });
});

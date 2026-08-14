// DE-201 (macrotask design-select) — CATALOGO DEI LAYOUT DI HERO. La prima delle nuove "manopole"
// visive, ORTOGONALE al contenuto: la ricetta (recipes.ts) decide QUALI sezioni e in che ordine; il
// layout di hero decide come si presenta il primo schermo. Dominio PURO sul modello di themes.ts:
// nessun accesso al DB, nessun I/O, nessun Date/Math.random — solo un catalogo dichiarato e un lookup.
//
// GLI ID NASCONO VERSIONATI (`nome-kebab@N`), la stessa forma che `SiteDocumentSchema` (document.ts)
// impone agli id congelati: e' cosi' che DE-205 potra' registrare `hero_layout_id` senza far cadere
// il documento, e che un ritocco futuro a un layout passa da '@1' a '@2' invece di cambiare sotto i
// piedi i siti che lo citano. IL LOOKUP E' PER UGUAGLIANZA ESATTA SU ARRAY (mai un oggetto indicizzato
// per id): un id come 'constructor' o '__proto__' non deve risolvere un membro ereditato da
// Object.prototype, e il token nudo 'centrato' — prefisso-stringa di 'centrato@1' e 'centrato-foto@1'
// — non deve mai risolvere una voce.
//
// I NOMI ATTINGONO A docs/design-system/ristorazione.md §2.3 (Layout di HERO): centrato elegante (C),
// centrato con foto protagonista, immagine full-bleed + overlay (A), split testo/foto (B), scena scura
// drammatica con un piatto protagonista (D). Il layout video-bg (F) e' rimandato (serve un asset).
//
// DE11-201 (macrotask variety-engine, design-engine-v1.1) — ARRICCHIMENTO. Si aggiunge il 5o hero
// UNIVERSALE 'editoriale-illustrato@1': un 2-col ASIMMETRICO ricco (testo + illustrazione, SENZA foto)
// con slot badge/CTA/meta. Nasce per due ragioni: (1) porta gli hero universali a >=5 con MEDIA a due
// a due distinte, la premessa perche' la matrice offra >=5 combo con hero VISIBILE diverso (la
// correzione del difetto v1 "3/5 stesso hero"); (2) introduce la media 'testo-illustrazione', DISTINTA
// da 'foto-affiancata' di split@1 (che affianca una FOTO), cosi' un hero senza foto ma comunque ricco
// esiste anche quando il cliente non ha immagini. I campi ricchi (`slots`, `columns`) sono AGGIUNTI in
// modo ADDITIVO e OPZIONALE: le 5 voci v1 restano valide senza toccarle e `heroLayoutFor` non cambia.

import type { CatalogScope } from './design-catalog';

/**
 * COME l'hero impagina la fotografia: e' il tratto STRUTTURALE che distingue un layout dall'altro
 * (non il colore). La matrice di compatibilita' (DE-203) lo leggera' — es. un hero a immagine piena
 * regge meno movimento — e il CSS delle varianti (DE-207) lo consuma via `data-hero-layout`.
 */
type HeroMedia =
  | 'foto-piena' // full-bleed + overlay, la foto e' lo sfondo dell'intero primo schermo
  | 'foto-riquadro' // una foto incorniciata accanto/sotto al testo
  | 'foto-affiancata' // testo e foto in due colonne (split), la colonna media e' una FOTO
  | 'foto-scena' // una sola foto-piatto protagonista su fondo scuro
  | 'testo-illustrazione' // due colonne testo + ILLUSTRAZIONE (non una foto): ricco anche senza immagini
  | 'senza-foto'; // solo tipografia e spazio, nessuna foto

/**
 * UNO SLOT RICCO dell'hero: il pezzo di contenuto che il layout prevede oltre al titolo. E' il
 * vocabolario dei blocchi che il renderer ricco (DE11-301) potra' comporre; un layout dichiara QUALI
 * slot ospita. Union CHIUSA: uno slot non previsto non compila.
 */
type HeroSlot =
  | 'testo' // il corpo testuale (titolo + occhiello + paragrafo)
  | 'illustrazione' // una scena SVG del catalogo illustrazioni (DE11-104)
  | 'badge' // un sigillo/etichetta (es. "dal 1998", "consigliato")
  | 'cta' // il bottone d'azione (prenota/chiama/scopri)
  | 'chip'; // una meta-chip breve (orari, quartiere, telefono in pillola)

/**
 * L'IMPAGINAZIONE A COLONNE dell'hero (quando ne ha due): 'asimmetriche' = due colonne di peso
 * diverso (la cifra del 2-col editoriale ricco), distinta dallo split simmetrico. Campo OPZIONALE:
 * le voci v1 non lo dichiarano (nessuna colonna fissata), la nuova voce ricca si'.
 */
type HeroColumns = 'asimmetriche';

/** UN LAYOUT DI HERO. Il tipo e' totale sulle chiavi OBBLIGATORIE: una voce cui manchi un campo non compila. */
export type SiteHeroLayout = {
  /** Identificatore STABILE e VERSIONATO nella forma 'nome-kebab@N' (vedi l'intestazione). */
  readonly id: string;
  /** L'idoneita' di settore: fallback universale o overlay di un vertical (DE-203). */
  readonly scope: CatalogScope;
  /** Il tratto strutturale del layout, letto dalla matrice e dal CSS. */
  readonly media: HeroMedia;
  /**
   * Gli SLOT ricchi che il layout ospita (DE11-201). OPZIONALE e retro-compat: gli hero v1 non lo
   * dichiarano e il renderer li tratta come il solo blocco testo; il 2-col ricco elenca i suoi slot.
   */
  readonly slots?: readonly HeroSlot[];
  /** L'impaginazione a colonne (DE11-201), OPZIONALE: solo il 2-col asimmetrico ricco la fissa. */
  readonly columns?: HeroColumns;
};

/**
 * I LAYOUT DI HERO offerti. Include DI PROPOSITO la coppia 'centrato@1' / 'centrato-foto@1', in cui
 * il nome dell'uno e' prefisso dell'altro: e' la prova su dati REALI che il lookup discrimina per id
 * esatto e non per prefisso (AC-DE-201-1 / AC-DE11-201-1).
 *
 * I QUATTRO hero v1 universali (centrato, centrato-foto, immagine-piena, split) piu' il 5o v1.1
 * 'editoriale-illustrato@1' hanno MEDIA a due a due DISTINTE — nessun hero universale ripete la media
 * di un altro: e' la condizione strutturale perche' a valle le >=5 varianti mostrino primi schermi
 * davvero diversi, non lo stesso hero ricolorato. 'scena-scura@1' resta l'overlay di ristorazione.
 */
export const HERO_LAYOUTS: readonly SiteHeroLayout[] = [
  { id: 'centrato@1', scope: 'universale', media: 'senza-foto' },
  { id: 'centrato-foto@1', scope: 'universale', media: 'foto-riquadro' },
  { id: 'immagine-piena@1', scope: 'universale', media: 'foto-piena' },
  { id: 'split@1', scope: 'universale', media: 'foto-affiancata' },
  // Il 2-col ASIMMETRICO ricco (DE11-201): testo + illustrazione, SENZA foto, con badge/CTA/meta-chip.
  {
    id: 'editoriale-illustrato@1',
    scope: 'universale',
    media: 'testo-illustrazione',
    columns: 'asimmetriche',
    slots: ['testo', 'illustrazione', 'badge', 'cta', 'chip'],
  },
  { id: 'scena-scura@1', scope: 'ristorazione', media: 'foto-scena' },
];

/**
 * Il layout di hero con questo id, o `undefined` se nessuno lo porta. Confronto per UGUAGLIANZA
 * ESATTA e ricerca sull'ARRAY (mai su un oggetto indicizzato per id): le chiavi speciali di
 * JavaScript ('__proto__', 'constructor', 'toString') danno `undefined`, non un membro ereditato.
 */
export function heroLayoutFor(id: string): SiteHeroLayout | undefined {
  return HERO_LAYOUTS.find((layout) => layout.id === id);
}

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

import type { CatalogScope } from './design-catalog';

/**
 * COME l'hero impagina la fotografia: e' il tratto STRUTTURALE che distingue un layout dall'altro
 * (non il colore). La matrice di compatibilita' (DE-203) lo leggera' — es. un hero a immagine piena
 * regge meno movimento — e il CSS delle varianti (DE-207) lo consuma via `data-hero-layout`.
 */
type HeroMedia =
  | 'foto-piena' // full-bleed + overlay, la foto e' lo sfondo dell'intero primo schermo
  | 'foto-riquadro' // una foto incorniciata accanto/sotto al testo
  | 'foto-affiancata' // testo e foto in due colonne (split)
  | 'foto-scena' // una sola foto-piatto protagonista su fondo scuro
  | 'senza-foto'; // solo tipografia e spazio, nessuna foto

/** UN LAYOUT DI HERO. Il tipo e' totale sulle chiavi: una voce cui manchi un campo non compila. */
export type SiteHeroLayout = {
  /** Identificatore STABILE e VERSIONATO nella forma 'nome-kebab@N' (vedi l'intestazione). */
  readonly id: string;
  /** L'idoneita' di settore: fallback universale o overlay di un vertical (DE-203). */
  readonly scope: CatalogScope;
  /** Il tratto strutturale del layout, letto dalla matrice e dal CSS. */
  readonly media: HeroMedia;
};

/**
 * I LAYOUT DI HERO offerti. Include DI PROPOSITO la coppia 'centrato@1' / 'centrato-foto@1', in cui
 * il nome dell'uno e' prefisso dell'altro: e' la prova su dati REALI che il lookup discrimina per id
 * esatto e non per prefisso (AC-DE-201-1).
 */
export const HERO_LAYOUTS: readonly SiteHeroLayout[] = [
  { id: 'centrato@1', scope: 'universale', media: 'senza-foto' },
  { id: 'centrato-foto@1', scope: 'universale', media: 'foto-riquadro' },
  { id: 'immagine-piena@1', scope: 'universale', media: 'foto-piena' },
  { id: 'split@1', scope: 'universale', media: 'foto-affiancata' },
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

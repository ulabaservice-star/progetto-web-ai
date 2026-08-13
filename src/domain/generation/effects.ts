// DE-201 (macrotask design-select) — CATALOGO DEI LIVELLI DI EFFETTO (movimento). La terza manopola:
// quanto "vive" il sito, da fermo a narrativo-con-lo-scroll. Dominio PURO come themes.ts: solo dati e
// lookup, nessun DB/I/O/Date/Math.random — l'IMPLEMENTAZIONE degli effetti (CSS + isola client) e' un
// altro macrotask (effects-runtime); qui si dichiara SOLO il vocabolario dei livelli.
//
// I CINQUE LIVELLI SONO ESATTAMENTE L0..L4, ancorati a docs/design-system/ristorazione.md §2.5:
//   L0 statico · L1 vivo (reveal + hover, default consigliato) · L2 ricco (+ cascata-hero, carosello,
//   parallax) · L3 premium (+ Ken Burns, preloader, split-lettera, lightbox) · L4 narrativo (+ sticky
//   pin-and-reveal, §2.8). Il `level` e' la chiave CANONICA riusata altrove: `effect_level` nel
//   documento (DE-205, enum L0..L4) e `data-effects` nel render (DE-207). L'ID, invece, resta
//   versionato 'nome-kebab@N' come ogni voce di catalogo (AC-DE-201-2), cosi' un ritocco a un livello
//   passa da '@1' a '@2'.
//
// IL LOOKUP E' PER UGUAGLIANZA ESATTA SU ARRAY (per id versionato): 'statico' senza versione o
// 'constructor' danno `undefined`, mai un membro ereditato da Object.prototype.

import type { CatalogScope } from './design-catalog';

/**
 * I CINQUE LIVELLI DI MOVIMENTO, dal fermo al narrativo. E' l'unione CHIUSA che DE-205 riusa come
 * enum di `effect_level` nel documento: un valore fuori da qui fa cadere il documento (gate P2/P4).
 */
export type EffectLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

/** UN LIVELLO DI EFFETTO. Tipo totale sulle chiavi: una voce incompleta non compila. */
export type SiteEffect = {
  /** Identificatore STABILE e VERSIONATO 'nome-kebab@N' (vedi l'intestazione). */
  readonly id: string;
  /** La chiave canonica del livello (L0..L4), riusata da documento e render. */
  readonly level: EffectLevel;
  /** L'idoneita' di settore: i livelli di movimento valgono per ogni vertical (universale). */
  readonly scope: CatalogScope;
};

/**
 * I LIVELLI offerti: ESATTAMENTE uno per ciascun L0..L4 (AC-DE-201-3), nell'ordine crescente di
 * movimento. Sono universali: il moto non e' un tratto di settore (la sua opportunita' la decide la
 * matrice, non l'idoneita').
 */
export const EFFECTS: readonly SiteEffect[] = [
  { id: 'statico@1', level: 'L0', scope: 'universale' },
  { id: 'vivo@1', level: 'L1', scope: 'universale' },
  { id: 'ricco@1', level: 'L2', scope: 'universale' },
  { id: 'premium@1', level: 'L3', scope: 'universale' },
  { id: 'narrativo@1', level: 'L4', scope: 'universale' },
];

/**
 * Il livello di effetto con questo id versionato, o `undefined`. UGUAGLIANZA ESATTA e ricerca
 * sull'ARRAY: mai per prefisso, mai un membro ereditato da Object.prototype.
 */
export function effectFor(id: string): SiteEffect | undefined {
  return EFFECTS.find((effect) => effect.id === id);
}

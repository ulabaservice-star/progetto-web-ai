// DE-201 (macrotask design-select) — CATALOGO DEGLI ORNAMENTI. La quarta manopola: gli elementi
// decorativi che danno "carattere" senza foto (DS-D5) — un divisore in accento, un fregio sotto ai
// titoli, un watermark line-art negli angoli, un badge "dal 19xx". Dominio PURO come themes.ts: solo
// dati e lookup, nessun DB/I/O/Date/Math.random; il rendering degli ornamenti e' altrove (DE-207).
//
// GLI ID SONO VERSIONATI 'nome-kebab@N' (pronti per `ornament_id?` in DE-205, opzionale: un sito puo'
// NON avere ornamento). IL LOOKUP E' PER UGUAGLIANZA ESATTA SU ARRAY: 'divisori-linea' senza versione
// o 'constructor' danno `undefined`, mai un membro ereditato da Object.prototype.
//
// E' IL CATALOGO CHE MOSTRA MEGLIO L'IDONEITA': alcuni ornamenti sono UNIVERSALI (un divisore, un
// fregio, un badge d'anzianita' valgono per ogni settore), altri sono OVERLAY di settore — il
// watermark line-art di CIBO ha senso solo in ristorazione. E' su questa distinzione che il fallback
// della matrice (DE-203) lavora. I nomi attingono a docs/design-system/ristorazione.md §2.6.

import type { CatalogScope } from './design-catalog';

/**
 * DOVE vive l'ornamento nella pagina: e' il tratto che il render (DE-207) consuma per collocarlo.
 * Valori DISCORDANTI a due a due, cosi' il lookup per id prova identita'.
 */
type OrnamentPlacement =
  | 'divisore' // una linea/regola fra le sezioni
  | 'sotto-titolo' // un fregio/flourish centrato sotto i titoli
  | 'angoli' // un watermark line-art negli angoli
  | 'badge'; // un bollo ("dal 19xx", anni di attivita')

/** UN ORNAMENTO. Tipo totale sulle chiavi: una voce incompleta non compila. */
export type SiteOrnament = {
  /** Identificatore STABILE e VERSIONATO 'nome-kebab@N' (vedi l'intestazione). */
  readonly id: string;
  /** L'idoneita' di settore: universale o overlay di un vertical (qui la distinzione e' viva). */
  readonly scope: CatalogScope;
  /** La collocazione dell'ornamento, letta dal render. */
  readonly placement: OrnamentPlacement;
};

/**
 * GLI ORNAMENTI offerti. MESCOLANO universale e overlay ristorazione DI PROPOSITO: 'watermark-cibo@1'
 * e' un overlay di settore, gli altri sono fallback universali — cosi' la matrice (DE-203) ha
 * davvero due casi da separare.
 */
export const ORNAMENTS: readonly SiteOrnament[] = [
  { id: 'divisori-linea@1', scope: 'universale', placement: 'divisore' },
  { id: 'fregio-centrale@1', scope: 'universale', placement: 'sotto-titolo' },
  { id: 'watermark-cibo@1', scope: 'ristorazione', placement: 'angoli' },
  { id: 'badge-anzianita@1', scope: 'universale', placement: 'badge' },
];

/**
 * L'ornamento con questo id, o `undefined`. UGUAGLIANZA ESATTA e ricerca sull'ARRAY: mai per
 * prefisso, mai un membro ereditato da Object.prototype.
 */
export function ornamentFor(id: string): SiteOrnament | undefined {
  return ORNAMENTS.find((ornament) => ornament.id === id);
}

// DE-201 (macrotask design-select) — CATALOGO DEI TRATTAMENTI DI SEZIONE. La seconda manopola
// visiva: dato l'ELENCO e l'ORDINE delle sezioni (che restano decisi dalla ricetta), il trattamento
// decide il loro RITMO visivo — sezioni piatte sul fondo, sezioni pari sollevate a scheda, fasce che
// si alternano. Dominio PURO come themes.ts: nessun DB, nessun I/O, nessun tempo, solo dati e lookup.
//
// GLI ID SONO VERSIONATI (`nome-kebab@N`), pronti per il freeze di `section_treatment_id` in DE-205
// senza far cadere il documento. IL LOOKUP E' PER UGUAGLIANZA ESATTA SU ARRAY: 'a-scheda' senza
// versione, o una chiave come 'constructor', danno `undefined` e mai un membro ereditato da
// Object.prototype.
//
// LA `surface` E' LA LEVA DELLA MATRICE (DE-203): la regola "tema scuro → niente trattamento a-scheda
// CHIARO" nasce dal fatto che qui 'a-scheda@1' dichiara una superficie chiara. I nomi attingono a
// docs/design-system/ristorazione.md §2.4 (varianti di sezione) e §2.1 (base chiara/scura).

import type { CatalogScope } from './design-catalog';

/**
 * IL TONO DI SUPERFICIE che il trattamento impone alle sezioni che colora: 'ereditato' resta sui
 * token del tema (nessun tono fissato), 'chiaro'/'scuro' fissano una superficie a prescindere dal
 * tema — ed e' quel valore fissato che la matrice (DE-203) puo' vietare in accoppiamento a un tema
 * di segno opposto (contrasto illeggibile).
 */
type SectionSurface = 'ereditato' | 'chiaro' | 'scuro';

/** UN TRATTAMENTO DI SEZIONE. Tipo totale sulle chiavi: una voce incompleta non compila. */
export type SiteSectionTreatment = {
  /** Identificatore STABILE e VERSIONATO 'nome-kebab@N' (vedi l'intestazione). */
  readonly id: string;
  /** L'idoneita' di settore: fallback universale o overlay di un vertical (DE-203). */
  readonly scope: CatalogScope;
  /** Il tono di superficie imposto, leva della matrice di compatibilita'. */
  readonly surface: SectionSurface;
};

/**
 * I TRATTAMENTI DI SEZIONE offerti. Superfici DISCORDANTI a due a due, cosi' il lookup per id prova
 * identita' (una voce sbagliata avrebbe una superficie sbagliata) e la matrice ha davvero casi da
 * separare.
 */
export const SECTION_TREATMENTS: readonly SiteSectionTreatment[] = [
  { id: 'piano@1', scope: 'universale', surface: 'ereditato' },
  { id: 'a-scheda@1', scope: 'universale', surface: 'chiaro' },
  { id: 'fasce-alternate@1', scope: 'universale', surface: 'scuro' },
];

/**
 * Il trattamento con questo id, o `undefined`. UGUAGLIANZA ESATTA e ricerca sull'ARRAY: mai per
 * prefisso, mai un membro ereditato da Object.prototype.
 */
export function sectionTreatmentFor(id: string): SiteSectionTreatment | undefined {
  return SECTION_TREATMENTS.find((treatment) => treatment.id === id);
}

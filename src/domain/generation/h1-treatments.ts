// DE11-201 (macrotask variety-engine, design-engine-v1.1) — CATALOGO DEI TRATTAMENTI DELL'H1. Il
// nuovo asse tipografico del titolo di HERO: dato il TESTO del titolo (deciso a monte), il
// trattamento decide COME l'H1 si presenta — una parola-accento sottolineata a onda, un occhiello
// tracciato sopra un titolo diritto, o l'occhiello sopra un corsivo gigante. Dominio PURO come
// hero-layouts.ts / section-treatments.ts: nessun accesso al DB, nessun I/O, nessun Date/Math.random
// — solo un catalogo dichiarato e un lookup.
//
// PERCHE' UN CATALOGO A SE' E NON UN CAMPO DEL TEMA: il tratto dell'H1 e' ORTOGONALE al colore e al
// layout. La stessa palette regge un titolo con accento ondulato o con occhiello corsivo; lo stesso
// hero regge trattamenti d'H1 diversi. Tenerlo separato e' cio' che permette alla matrice (DE11-203)
// di combinarlo come un asse a parte e alla selezione (DE11-204) di variarlo indipendentemente — e'
// uno dei ~7 assi ricchi con cui v1.1 rompe il difetto v1 "3/5 stesso hero, corpo mai variato".
//
// GLI ID NASCONO VERSIONATI ('nome-kebab@N'), la stessa disciplina di THEMES/HERO_LAYOUTS: la
// versione e' DENTRO l'id perche' un ritocco a un trattamento non deve riscrivere in silenzio un
// mockup che gia' lo cita — si passa da '@1' a '@2'. E' cosi' che DE11-205 potra' congelare
// `h1_treatment_id` nel documento senza farlo cadere. IL NOME puo' essere PREFISSO di un altro nome
// ('occhiello' e' prefisso di 'occhiello-corsivo'): e' voluto, ed e' cio' che il lookup esatto deve
// NON confondere (vedi `h1TreatmentFor`) — lo stesso trucco di 'centrato'/'centrato-foto' negli hero
// e 'piatto'/'piatto-fondo' nelle illustrazioni.
//
// TUTTE LE VOCI SONO 'universale': il tratto dell'H1 non e' un overlay di settore — un occhiello
// corsivo veste bene un ristorante come un salone. Il campo `scope` resta comunque presente e
// dichiarato, cosi' l'asse ha la STESSA forma degli altri cataloghi e la matrice puo' filtrarlo con
// lo stesso `availableByScope` senza un caso speciale.
//
// LO STILE E' UN COMMENTO, NON UN'ASSERZIONE (L-COL-006): "gigante", "elegante", "tracciato" dicono
// a chi legge che sensazione punta a dare il trattamento; nessun test prova che un H1 sia BELLO. I
// test provano che il catalogo esiste, che gli id sono versionati e unici, che i tratti sono a due a
// due distinti e che il lookup e' per uguaglianza esatta su array (proto-safe).

import type { CatalogScope } from './design-catalog';

/**
 * IL TRATTO VISIBILE dell'H1: e' cio' che distingue un trattamento dall'altro (non il colore), letto
 * dalla matrice (DE11-203) e consumato dal CSS delle varianti a valle (DE11-301) via un data-attribute.
 * Union CHIUSA cosi' un valore non previsto non compila.
 *   - 'accento-ondulato': una PAROLA-accento del titolo con una sottolineatura a ONDA (wavy).
 *   - 'occhiello-diritto': un OCCHIELLO (kicker/eyebrow) tracciato in maiuscoletto sopra un titolo
 *      dal peso normale/diritto.
 *   - 'occhiello-corsivo': lo stesso occhiello tracciato, ma sopra un titolo in CORSIVO gigante.
 */
type H1Style = 'accento-ondulato' | 'occhiello-diritto' | 'occhiello-corsivo';

/** UN TRATTAMENTO DELL'H1. Tipo TOTALE sulle chiavi: una voce cui manchi un campo non compila. */
export type SiteH1Treatment = {
  /** Identificatore STABILE e VERSIONATO nella forma 'nome-kebab@N' (vedi l'intestazione). */
  readonly id: string;
  /** L'idoneita' di settore: qui SEMPRE 'universale' (il tratto dell'H1 non e' un overlay). */
  readonly scope: CatalogScope;
  /** Il tratto VISIBILE dell'H1, letto dalla matrice e dal CSS. */
  readonly style: H1Style;
};

/**
 * I TRATTAMENTI DELL'H1 offerti. Tratti (`style`) DISCORDANTI a due a due, cosi' il lookup per id
 * prova identita' (una voce sbagliata avrebbe un tratto sbagliato). Include DI PROPOSITO la coppia
 * 'occhiello@1' / 'occhiello-corsivo@1', in cui il nome dell'uno e' prefisso dell'altro: e' la prova
 * su dati REALI che `h1TreatmentFor` discrimina per id esatto e non per prefisso (AC-DE11-201-2).
 */
export const H1_TREATMENTS: readonly SiteH1Treatment[] = [
  { id: 'accento-ondulato@1', scope: 'universale', style: 'accento-ondulato' },
  { id: 'occhiello@1', scope: 'universale', style: 'occhiello-diritto' },
  { id: 'occhiello-corsivo@1', scope: 'universale', style: 'occhiello-corsivo' },
];

/**
 * Il trattamento dell'H1 con questo id versionato, o `undefined` se nessuno lo porta. Stesso
 * contratto di `heroLayoutFor` / `themeFor`: UGUAGLIANZA ESATTA e ricerca sull'ARRAY (mai un oggetto
 * indicizzato per id).
 *
 * PERCHE' SULL'ARRAY E NON SU UN OGGETTO INDICIZZATO: l'id puo' arrivare da un documento salvato o
 * comunque da fuori, e una mappa-oggetto risolverebbe le chiavi speciali di JavaScript
 * ('__proto__', 'constructor', 'toString') sul membro EREDITATO da Object.prototype — restituendo
 * qualcosa che NON e' un trattamento. `find` per uguaglianza non ha quel membro ereditato.
 *
 * PERCHE' ESATTO E MAI PER PREFISSO: 'occhiello' e' un prefisso genuino di 'occhiello@1' e di
 * 'occhiello-corsivo@1' ma non e' l'id di alcuna voce; un match lasco (startsWith/includes)
 * confonderebbe l'occhiello diritto col corsivo. L'uguaglianza restituisce la voce giusta o
 * `undefined`.
 */
export function h1TreatmentFor(id: string): SiteH1Treatment | undefined {
  return H1_TREATMENTS.find((treatment) => treatment.id === id);
}

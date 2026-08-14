// DE11-202 (macrotask variety-engine, design-engine-v1.1) — CATALOGO DEI LAYOUT DI SEZIONE + NASTRI
// DIVISORI. Il nuovo asse del CORPO della pagina: dato QUALE sezione va resa (chi-siamo, orari,
// contatti, menu — l'elenco lo decide la ricetta, recipes.ts), il layout decide COME quella sezione
// si impagina — un ritratto affiancato al testo, una timeline della storia, una tabella settimanale
// degli orari, una griglia di card, una scheda contatti col fianco-mappa, il menu su card di carta.
// Dominio PURO come hero-layouts.ts / section-treatments.ts: nessun accesso al DB, nessun I/O, nessun
// Date/Math.random — solo un catalogo dichiarato e due lookup.
//
// PERCHE' UN CATALOGO NUOVO E NON UN CAMPO DI section-treatments.ts: `section-treatments.ts` resta la
// leva R2 della matrice (la SUPERFICIE piano/scheda/fasce che decide la leggibilita' tema↔sezione) e
// NON va toccato. Il difetto n.1 di v1 era proprio che il corpo NON variava mai: le sezioni erano lo
// stesso testo impilato con un bordo diverso. Qui il tratto distintivo e' il `kind` — un DESCRITTORE
// di LAYOUT VERO (griglia/tabella/card/timeline/…), non l'ennesimo trattamento-bordo. E' uno dei ~7
// assi ricchi con cui v1.1 rompe "3/5 stesso hero, corpo mai variato": la matrice (DE11-203) lo
// combina come asse a se' e la selezione (DE11-204) lo varia indipendentemente.
//
// GLI ID NASCONO VERSIONATI ('nome-kebab@N'), la stessa disciplina di THEMES/HERO_LAYOUTS: la versione
// e' DENTRO l'id perche' un ritocco a un layout non deve riscrivere in silenzio un mockup che gia' lo
// cita — si passa da '@1' a '@2'. E' cosi' che DE11-205 potra' congelare `section_layout_id` (e
// `ribbon_id`) nel documento senza farlo cadere. I NOMI portano DI PROPOSITO una coppia-prefisso:
// 'contatti-scheda' e' prefisso di 'contatti-scheda-mappa', e 'gingham' e' prefisso di
// 'gingham-incrociato' — e' cio' che i lookup esatti devono NON confondere (vedi `sectionLayoutFor` /
// `ribbonFor`), lo stesso trucco di 'centrato'/'centrato-foto' negli hero e 'piatto'/'piatto-fondo'
// nelle illustrazioni.
//
// IDONEITA' DI SETTORE (scope): alcuni layout sono UNIVERSALI (un ritratto, una timeline, una tabella
// orari valgono per ogni settore), altri sono OVERLAY di ristorazione — il MENU su card di carta e il
// nastro GINGHAM (la tovaglia a quadretti della trattoria) hanno senso di settore. E' su questa
// distinzione che il fallback della matrice (DE11-203) lavora, mescolando universale e overlay.
//
// I NASTRI (RIBBONS) sono l'altra manopola di questo file: fasce a pattern (scacchi conici, gingham)
// che separano/legano le sezioni. I PATTERN SONO COSTANTI DEL CODICE, MAI DA TESTO UTENTE (security):
// qui non c'e' nessun percorso brief→markup; il valore e' un token di un'union chiusa, il render a
// valle (DE11-302) lo consuma via data-attribute e disegna il pattern in CSS/SVG locale — nessuna
// risorsa esterna.
//
// LO STILE E' UN COMMENTO, NON UN'ASSERZIONE (L-COL-006): "elegante", "di carta", "della trattoria"
// dicono che sensazione punta a dare la voce; nessun test prova che una sezione sia BELLA. I test
// provano che i cataloghi esistono, che gli id sono versionati e unici, che ogni sezione con >=2
// varianti le porta con un `kind` davvero distinto, e che i lookup sono per uguaglianza esatta su
// array (proto-safe).

import type { CatalogScope } from './design-catalog';

/**
 * LA SEZIONE a cui il layout appartiene: e' il campo su cui la matrice/selezione raggruppa le varianti
 * (per offrire alternative della STESSA sezione). Union CHIUSA: una sezione non prevista non compila.
 */
type SiteSection = 'chi-siamo' | 'orari' | 'contatti' | 'menu';

/**
 * IL DESCRITTORE DI LAYOUT: il tratto STRUTTURALE che distingue una variante dall'altra dentro la
 * stessa sezione (NON il colore ne il bordo). E' cio' che il CSS delle varianti (DE11-302) consuma via
 * `data-section-layout` per impaginare davvero in modo diverso. Union CHIUSA cosi' un descrittore non
 * previsto non compila.
 *   - 'ritratto-testo': due colonne, un ritratto/immagine accanto al testo del racconto.
 *   - 'timeline': una linea del tempo verticale (la storia per tappe/anni).
 *   - 'tabella': una tabella a righe (l'uso tipico degli orari: giorno → fascia).
 *   - 'griglia': una griglia di celle/card (giorni, servizi, punti).
 *   - 'card': una singola scheda raccolta (recapiti in un riquadro).
 *   - 'mappa-fianco': scheda contatti con la mappa/indirizzo affiancata.
 *   - 'card-carta': il menu impaginato come una card "di carta" (il menu del locale).
 */
type SectionLayoutKind =
  | 'ritratto-testo'
  | 'timeline'
  | 'tabella'
  | 'griglia'
  | 'card'
  | 'mappa-fianco'
  | 'card-carta';

/** UN LAYOUT DI SEZIONE. Tipo TOTALE sulle chiavi: una voce cui manchi un campo non compila. */
export type SiteSectionLayout = {
  /** Identificatore STABILE e VERSIONATO nella forma 'nome-kebab@N' (vedi l'intestazione). */
  readonly id: string;
  /** L'idoneita' di settore: fallback universale o overlay di un vertical (DE11-203). */
  readonly scope: CatalogScope;
  /** La sezione a cui la variante appartiene (le varianti si raggruppano per questo campo). */
  readonly section: SiteSection;
  /** Il DESCRITTORE di layout, letto dalla matrice e dal CSS: e' cio' che rende le varianti diverse. */
  readonly kind: SectionLayoutKind;
};

/**
 * IL PATTERN VISIBILE del nastro divisorio: e' il tratto che distingue un nastro dall'altro, letto dal
 * render (DE11-302) via data-attribute. Union CHIUSA cosi' un pattern non previsto non compila.
 *   - 'scacchi-conici': scacchi a spicchi conici (un raggiera/sunburst a scacchi), universale.
 *   - 'gingham': la trama a quadretti della tovaglia (la trattoria), overlay ristorazione.
 *   - 'gingham-incrociato': lo stesso gingham ma incrociato in diagonale (bias), variante ristorazione.
 */
type RibbonPattern = 'scacchi-conici' | 'gingham' | 'gingham-incrociato';

/** UN NASTRO DIVISORIO. Tipo TOTALE sulle chiavi: una voce cui manchi un campo non compila. */
export type SiteRibbon = {
  /** Identificatore STABILE e VERSIONATO nella forma 'nome-kebab@N' (vedi l'intestazione). */
  readonly id: string;
  /** L'idoneita' di settore: universale o overlay di un vertical. */
  readonly scope: CatalogScope;
  /** Il pattern VISIBILE del nastro, letto dal render. */
  readonly pattern: RibbonPattern;
};

/**
 * I LAYOUT DI SEZIONE offerti. Per chi-siamo, orari e contatti ci sono >=2 varianti CIASCUNA con un
 * `kind` DIVERSO (non lo stesso trattamento-bordo ridipinto), piu' la voce menu card-carta. Include DI
 * PROPOSITO la coppia 'contatti-scheda@1' / 'contatti-scheda-mappa@1', in cui il NOME dell'uno e'
 * prefisso dell'altro: e' la prova su dati REALI che `sectionLayoutFor` discrimina per id esatto e non
 * per prefisso (AC-DE11-202-3). Gli `scope` mescolano universale e overlay ristorazione (il menu
 * card-carta e' di settore), cosi' il fallback della matrice ha davvero due casi da separare.
 */
export const SECTION_LAYOUTS: readonly SiteSectionLayout[] = [
  // CHI-SIAMO — due impaginazioni davvero diverse: il ritratto affiancato e la timeline della storia.
  { id: 'chi-siamo-ritratto@1', scope: 'universale', section: 'chi-siamo', kind: 'ritratto-testo' },
  { id: 'chi-siamo-timeline@1', scope: 'universale', section: 'chi-siamo', kind: 'timeline' },
  // ORARI — la tabella settimanale classica e la griglia di card-giorno.
  { id: 'orari-tabella@1', scope: 'universale', section: 'orari', kind: 'tabella' },
  { id: 'orari-griglia@1', scope: 'universale', section: 'orari', kind: 'griglia' },
  // CONTATTI — la scheda raccolta e la scheda col fianco-mappa. 'contatti-scheda' e' prefisso-NOME di
  // 'contatti-scheda-mappa': la coppia-prefisso che il lookup esatto NON deve confondere.
  { id: 'contatti-scheda@1', scope: 'universale', section: 'contatti', kind: 'card' },
  {
    id: 'contatti-scheda-mappa@1',
    scope: 'universale',
    section: 'contatti',
    kind: 'mappa-fianco',
  },
  // MENU — la card "di carta": overlay di ristorazione (un settore senza menu non la usa).
  { id: 'menu-card-carta@1', scope: 'ristorazione', section: 'menu', kind: 'card-carta' },
];

/**
 * I NASTRI DIVISORI offerti. >=2 pattern DISCORDANTI (scacchi-conici, gingham), con una coppia-prefisso
 * REALE 'gingham@1' / 'gingham-incrociato@1' (il NOME dell'uno e' prefisso dell'altro) per provare che
 * `ribbonFor` risolve per id esatto e non per prefisso. Gli `scope` mescolano universale (scacchi
 * conici) e overlay ristorazione (il gingham della tovaglia).
 */
export const RIBBONS: readonly SiteRibbon[] = [
  { id: 'scacchi-conici@1', scope: 'universale', pattern: 'scacchi-conici' },
  { id: 'gingham@1', scope: 'ristorazione', pattern: 'gingham' },
  { id: 'gingham-incrociato@1', scope: 'ristorazione', pattern: 'gingham-incrociato' },
];

/**
 * Il layout di sezione con questo id versionato, o `undefined` se nessuno lo porta. Stesso contratto di
 * `heroLayoutFor` / `themeFor`: UGUAGLIANZA ESATTA e ricerca sull'ARRAY (mai un oggetto indicizzato per
 * id).
 *
 * PERCHE' SULL'ARRAY E NON SU UN OGGETTO INDICIZZATO: l'id puo' arrivare da un documento salvato o
 * comunque da fuori, e una mappa-oggetto risolverebbe le chiavi speciali di JavaScript
 * ('__proto__', 'constructor', 'toString') sul membro EREDITATO da Object.prototype — restituendo
 * qualcosa che NON e' un layout. `find` per uguaglianza non ha quel membro ereditato.
 *
 * PERCHE' ESATTO E MAI PER PREFISSO: 'contatti-scheda' e' un prefisso genuino di 'contatti-scheda@1' e
 * di 'contatti-scheda-mappa@1' ma non e' l'id di alcuna voce; un match lasco (startsWith/includes)
 * confonderebbe la scheda con la scheda-mappa. L'uguaglianza restituisce la voce giusta o `undefined`.
 */
export function sectionLayoutFor(id: string): SiteSectionLayout | undefined {
  return SECTION_LAYOUTS.find((layout) => layout.id === id);
}

/**
 * Il nastro divisorio con questo id versionato, o `undefined`. UGUAGLIANZA ESATTA e ricerca sull'ARRAY,
 * identico contratto di `sectionLayoutFor`: mai per prefisso ('gingham' non risolve 'gingham@1'), mai
 * un membro ereditato da Object.prototype ('constructor'/'__proto__' danno `undefined`).
 */
export function ribbonFor(id: string): SiteRibbon | undefined {
  return RIBBONS.find((ribbon) => ribbon.id === id);
}

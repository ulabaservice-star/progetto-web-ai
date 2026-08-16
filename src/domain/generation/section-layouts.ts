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

// ── DV2-301 (macrotask menu, design-engine-v2) — IL CATALOGO DELLE VARIANTI MENU ──────────────────
//
// Il menu e' la 2a sezione piu' identitaria della ristorazione. Claude Design (progetto c1dafc1f,
// components/menu/MenuSection.jsx) ne porta VENTI varianti a parita' di slot (portata → voci
// nome/descrizione/prezzo): carta di carta su fondo scuro, griglia di card, due colonne, lavagna,
// registro a bande, tavolata a tabella, riquadri col prezzo a badge, e cosi' via. Le traduciamo qui in
// un catalogo DOMINIO PURO di `menu_layout_id` versionati, che `Offerte.tsx` (DV2-302) rende come
// renderer unico e la matrice (DV2-303) offre come ASSE per-vertical indipendente.
//
// PERCHE' UN CATALOGO E UN TIPO SEPARATI da `SECTION_LAYOUTS` (e non 20 nuove voci `section: 'menu'`):
// il catalogo v1.1 `SECTION_LAYOUTS` porta l'invariante DE11-202 "ogni sezione con >=2 varianti ha
// `kind` a due a due DISTINTI" (7 descrittori chiusi). Venti varianti di menu NON sono sette bordi
// diversi: hanno il PROPRIO vocabolario visibile (disposizione delle voci + trattamento del prezzo).
// Ammassarle in `SECTION_LAYOUTS` con lo stesso `kind: 'card-carta'` violerebbe quell'invariante (o
// costringerebbe a 20 `kind` fittizi). Un tipo dedicato `SiteMenuLayout` tiene il menu ORTOGONALE:
// `SECTION_LAYOUTS`/`menu-card-carta@1` restano invariati (il corpo v1.1 non regredisce), il menu v2
// vive nel suo asse. Stessa disciplina degli altri cataloghi: id versionati 'nome@N', lookup per
// UGUAGLIANZA ESATTA su array (proto-safe), scope universale/overlay.
//
// I DUE ASSI VISIBILI (AC-DV2-301-3, la distinzione NON e' cromatica come v1): `arrangement` = COME le
// voci si dispongono (una carta unica, una griglia, due colonne, una tabella, bande orizzontali…) —
// uno per variante, e' il tratto strutturale primario; `price` = COME il prezzo e' trattato
// (leader-dots nome···prezzo, colonna allineata, sotto il nome, badge d'angolo, in linea). Due
// varianti differiscono sempre sull'`arrangement`, e la maggior parte anche sul `price`: e' cio' che
// `Offerte.tsx` consuma via `data-menu-layout` per impaginare DAVVERO in modo diverso, non ricolorare.
//
// LE COPPIE-PREFISSO REALI (prova del lookup ESATTO, come 'contatti-scheda'/'contatti-scheda-mappa'):
// 'menu-carta@1' e' prefisso-NOME di 'menu-carta-foto@1' (la carta e la carta con foto in testa);
// 'menu-colonne@1' di 'menu-colonne-scure@1' (le due colonne chiare e le colonne su fondo scuro). Un
// match lasco (startsWith) confonderebbe l'una con l'altra: `menuLayoutFor` risolve per uguaglianza.
//
// LO SCOPE mescola universale e overlay: le disposizioni GENERICHE (griglia, due colonne, tabella,
// riquadri, pannelli, minimal, indice, mercato, mosaico, centrale, contrasto) valgono per QUALSIASI
// blocco offerte (anche corsi/servizi/catalogo di altri settori) e sono 'universale'; le varianti dal
// sapore di CARTA-RISTORANTE (carta su scuro, colonne scure, lavagna, degustazione, libretto bifold,
// serale, strisce, carta-foto, registro) sono overlay di 'ristorazione'. Cosi' `availableByScope`
// (design-matrix) offre al menu ristorazione tutte e 20 le varianti, e agli altri settori le sole
// generiche — materiale abbondante per la greedy (DS-V2-D2), mai una scatola vuota.

/**
 * LA DISPOSIZIONE delle voci del menu: il tratto STRUTTURALE primario che distingue una variante
 * dall'altra (NON il colore). Uno per variante. Union CHIUSA: una disposizione non prevista non
 * compila. Letto da `Offerte.tsx` (DV2-302) via il record variante e proiettato su `data-menu-layout`.
 */
type MenuArrangement =
  | 'carta' // una carta unica "di carta" con tutte le portate
  | 'griglia' // una griglia di card, una per portata
  | 'due-colonne' // le portate scorrono su due colonne di testo
  | 'colonne-scure' // colonne su fondo scuro, senza carta
  | 'indice' // un indice laterale delle portate + le card a destra
  | 'lavagna' // una lavagna incorniciata, voci corsive centrate
  | 'registro' // righe piene con bande di portata (da registro)
  | 'centrale' // colonna centrata stretta, prezzo sotto il nome
  | 'pannelli' // pannelli con testata colorata per portata
  | 'degustazione' // un percorso degustazione numerato in verticale
  | 'bifold' // un libretto aperto: due pagine affiancate su scuro
  | 'mosaico' // colonne a incastro (masonry) di card
  | 'riquadri' // ogni voce in un box, prezzo a badge d'angolo
  | 'foto-in-testa' // una carta con una foto panoramica in testa
  | 'serale' // scuro, rado, maiuscoletto, da menu della sera
  | 'tavolata' // una tabella con intestazioni Piatto/Descrizione/Prezzo
  | 'mercato' // testata laterale + gruppi a destra
  | 'minimal' // righe rade, descrizione in linea
  | 'contrasto' // la prima portata in evidenza su un pannello scuro
  | 'strisce'; // una banda piena, alternata, per portata

/**
 * IL TRATTAMENTO DEL PREZZO: il secondo asse VISIBILE, ortogonale alla disposizione. Due varianti con
 * disposizione affine restano distinguibili se trattano il prezzo in modo diverso. Union CHIUSA.
 *   - 'leader-dots': nome ····· prezzo, coi puntini di guida (il classico da carta stampata).
 *   - 'colonna': il prezzo in una colonna allineata a destra (tabella/registro).
 *   - 'sotto': il prezzo sotto il nome, centrato (la colonna stretta).
 *   - 'badge': il prezzo in un'etichetta d'angolo del riquadro.
 *   - 'in-linea': il prezzo accanto al nome, sulla stessa riga (serale/minimal/lavagna).
 */
export type MenuPriceTreatment = 'leader-dots' | 'colonna' | 'sotto' | 'badge' | 'in-linea';

/** UNA VARIANTE DI MENU. Tipo TOTALE sulle chiavi: una voce cui manchi un campo non compila. */
export type SiteMenuLayout = {
  /** Identificatore STABILE e VERSIONATO nella forma 'menu-<kebab>@N' (vedi l'intestazione). */
  readonly id: string;
  /** L'idoneita' di settore: universale (ogni blocco offerte) o overlay 'ristorazione'. */
  readonly scope: CatalogScope;
  /** La DISPOSIZIONE delle voci (asse VISIBILE primario), letta dal renderer e dal test. */
  readonly arrangement: MenuArrangement;
  /** Il TRATTAMENTO del prezzo (asse VISIBILE secondario). */
  readonly price: MenuPriceTreatment;
};

/**
 * LE 20 VARIANTI DI MENU offerte, tradotte 1:1 da Claude Design (components/menu/MenuSection.jsx). Ogni
 * `arrangement` compare UNA sola volta (venti disposizioni davvero diverse, non lo stesso menu
 * ricolorato); il `price` ruota fra i cinque trattamenti. Include DI PROPOSITO le coppie-prefisso
 * 'menu-carta@1'/'menu-carta-foto@1' e 'menu-colonne@1'/'menu-colonne-scure@1' (il NOME dell'una e'
 * prefisso dell'altra) per provare il lookup ESATTO (AC-DV2-301-2). Lo scope mescola universale e
 * overlay ristorazione (AC-DV2-303: il menu ristorazione le vede tutte).
 */
export const MENU_LAYOUTS: readonly SiteMenuLayout[] = [
  { id: 'menu-carta@1', scope: 'ristorazione', arrangement: 'carta', price: 'leader-dots' },
  { id: 'menu-griglia@1', scope: 'universale', arrangement: 'griglia', price: 'leader-dots' },
  { id: 'menu-colonne@1', scope: 'universale', arrangement: 'due-colonne', price: 'leader-dots' },
  {
    id: 'menu-colonne-scure@1',
    scope: 'ristorazione',
    arrangement: 'colonne-scure',
    price: 'leader-dots',
  },
  { id: 'menu-indice@1', scope: 'universale', arrangement: 'indice', price: 'leader-dots' },
  { id: 'menu-lavagna@1', scope: 'ristorazione', arrangement: 'lavagna', price: 'in-linea' },
  { id: 'menu-registro@1', scope: 'universale', arrangement: 'registro', price: 'colonna' },
  { id: 'menu-centrale@1', scope: 'universale', arrangement: 'centrale', price: 'sotto' },
  { id: 'menu-pannelli@1', scope: 'universale', arrangement: 'pannelli', price: 'leader-dots' },
  {
    id: 'menu-degustazione@1',
    scope: 'ristorazione',
    arrangement: 'degustazione',
    price: 'in-linea',
  },
  { id: 'menu-bifold@1', scope: 'ristorazione', arrangement: 'bifold', price: 'leader-dots' },
  { id: 'menu-mosaico@1', scope: 'universale', arrangement: 'mosaico', price: 'leader-dots' },
  { id: 'menu-riquadri@1', scope: 'universale', arrangement: 'riquadri', price: 'badge' },
  { id: 'menu-carta-foto@1', scope: 'ristorazione', arrangement: 'foto-in-testa', price: 'leader-dots' },
  { id: 'menu-serale@1', scope: 'ristorazione', arrangement: 'serale', price: 'in-linea' },
  { id: 'menu-tavolata@1', scope: 'universale', arrangement: 'tavolata', price: 'colonna' },
  { id: 'menu-mercato@1', scope: 'universale', arrangement: 'mercato', price: 'leader-dots' },
  { id: 'menu-minimal@1', scope: 'universale', arrangement: 'minimal', price: 'colonna' },
  { id: 'menu-contrasto@1', scope: 'universale', arrangement: 'contrasto', price: 'leader-dots' },
  { id: 'menu-strisce@1', scope: 'ristorazione', arrangement: 'strisce', price: 'leader-dots' },
];

/**
 * La variante di menu con questo id versionato, o `undefined`. Stesso contratto di `sectionLayoutFor` /
 * `heroLayoutFor` / `themeFor`: UGUAGLIANZA ESATTA e ricerca sull'ARRAY (mai un oggetto indicizzato per
 * id → le chiavi '__proto__'/'constructor'/'toString' danno `undefined`, non un membro ereditato), mai
 * per prefisso ('menu-carta' non risolve 'menu-carta@1' ne 'menu-carta-foto@1').
 */
export function menuLayoutFor(id: string): SiteMenuLayout | undefined {
  return MENU_LAYOUTS.find((layout) => layout.id === id);
}

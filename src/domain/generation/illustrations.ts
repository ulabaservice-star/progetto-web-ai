// DE11-104 (macrotask editorial-skin, design-engine-v1.1) — IL SISTEMA DI ILLUSTRAZIONI SVG (DS-D11).
// Dominio PURO come themes.ts / effects.ts: solo DATI e un lookup, nessun import, nessun DB, nessun
// I/O, niente Date/Math.random. Il modulo dichiara un CATALOGO di scene SVG statiche e nient'altro —
// non conosce React, non tocca il DOM, non sceglie quando un'illustrazione compare (quella e' la
// selezione a valle: l'Hero DE11-301 e la libreria estesa DE11-404).
//
// PERCHE' QUI E NON IN src/ui/site (§1bis del 00-INDEX, emendamento DS-D11-a): un'illustrazione di
// catalogo e' un ASSET DI DESIGN dichiarato una volta e versionato, allo stesso rango di un tema o di
// un livello di effetto; non e' un pezzo di rendering. Per questo abita src/domain/generation accanto
// a THEMES/EFFECTS, ed e' FUORI dallo scanner colori-letterali per POSIZIONE (00-INDEX §4): lo
// scanner AC-231-4 guarda src/ui/site/**, non il dominio. La regola qui non e' allentata, e' spostata:
// le scene NON portano colori propri, dipingono con `currentColor` e prendono il colore dal contesto
// in cui il renderer (a valle) le innesta — cosi' un piatto e' terracotta su un tema e ink su un
// altro senza toccare questo file.
//
// GLI ID NASCONO VERSIONATI 'nome-kebab@N', la stessa disciplina di THEMES (T-202) ed EFFECTS
// (DE-201): la versione e' DENTRO l'id perche' un ritocco a una scena non deve riscrivere in silenzio
// un mockup che gia' la cita — si passa da '@1' a '@2'. Il NOME puo' essere PREFISSO di un altro nome
// ('piatto' e' prefisso di 'piatto-fondo'): e' voluto, ed e' cio' che il lookup esatto deve NON
// confondere (vedi `illustrationFor`).
//
// LE SCENE SONO COSTANTI DEL CODICE, MAI DA TESTO UTENTE (security_notes DE11-104): nessun percorso
// brief->SVG, nessun `dangerouslySetInnerHTML` su input non fidato a valle. E nessuna RISORSA ESTERNA
// dentro le stringhe (niente http(s), niente `xlink:href` verso l'esterno, niente `<image>`): un
// riferimento esterno aprirebbe una richiesta fuori da 'self' e sfonderebbe la CSP di /s/
// (deploy-hardening T-3). Le scene disegnano solo con primitive vettoriali locali.
//
// COSA NON C'E' QUI, deliberatamente:
// - la LIBRERIA ristorazione COMPLETA (estende questo core set): e' DE11-404;
// - l'INNESTO delle scene nel render (sprite <use>, scelta per settore/hero): e' DE11-301/DE11-404;
// - qualunque projection in CSS custom property: il tema colora via `currentColor`, non serve un token.

/**
 * UNA VOCE DEL CATALOGO ILLUSTRAZIONI. Tipo TOTALE sulle chiavi (come SiteTheme/SiteEffect): una voce
 * a cui manchi `id` o `svg` non compila.
 *
 * `svg` e' un elemento `<symbol>` completo (viewBox + geometria), pronto a finire in uno sprite e a
 * essere richiamato via `<use>` dal renderer a valle. Il colore NON e' nella stringa: le primitive
 * ereditano `stroke="currentColor"` dal contenitore, quindi la scena si tinge del colore di testo del
 * contesto in cui viene innestata.
 */
export type SiteIllustration = {
  /** Identificatore STABILE e VERSIONATO 'nome-kebab@N', come ogni voce di catalogo del dominio. */
  readonly id: string;
  /** L'elemento `<symbol>` SVG statico: geometria pura, colore ereditato via `currentColor`. */
  readonly svg: string;
};

/**
 * IL CORE SET RISTORAZIONE. Scene minime e riconoscibili — il piatto, il piatto fondo, il mattarello,
 * la mappa (pin) — piu' un pugno di icone base trasversali (posata, orologio degli orari, telefono,
 * foglia del fresco). Tutte in linea (stroke) su viewBox 0 0 24 24, `fill="none"` per non annegare la
 * forma e `stroke="currentColor"` sul `<symbol>` cosi' i figli EREDITANO il colore del contesto: qui
 * NON c'e' nessun colore letterale che blocchi quell'ereditarieta'.
 *
 * 'piatto@1' e 'piatto-fondo@1' condividono di proposito il prefisso di NOME 'piatto': e' la coppia
 * che prova, nel test, che `illustrationFor` risolve per uguaglianza esatta e non per prefisso — lo
 * stesso trucco di 'linea-essenziale@1' / 'linea-essenziale-notte@1' nei temi.
 */
export const ILLUSTRATIONS: readonly SiteIllustration[] = [
  {
    // PIATTO (vista dall'alto): due cerchi concentrici, la tesa e il fondo. L'icona-ancora del settore.
    id: 'piatto@1',
    svg:
      '<symbol id="piatto@1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" />' +
      '</symbol>',
  },
  {
    // PIATTO FONDO (vista di profilo): la scodella piu' due filetti di vapore. Il nome estende 'piatto'
    // di proposito — e' la variante che il lookup esatto NON deve confondere col piatto base.
    id: 'piatto-fondo@1',
    svg:
      '<symbol id="piatto-fondo@1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 12 h18 a9 9 0 0 1 -18 0 Z" /><path d="M9 4 c0 1.4 -1 1.9 -1 3 M13 4 c0 1.4 -1 1.9 -1 3" />' +
      '</symbol>',
  },
  {
    // MATTARELLO (orizzontale): il cilindro centrale a raggio pieno e i due manici. Il gesto della
    // pasta fatta in casa.
    id: 'mattarello@1',
    svg:
      '<symbol id="mattarello@1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="6" y="9" width="12" height="6" rx="3" /><path d="M3 12 h3 M18 12 h3" />' +
      '</symbol>',
  },
  {
    // MAPPA (pin di luogo): la goccia col foro centrale. "Dove siamo" — la scena dei contatti/indirizzo.
    id: 'mappa@1',
    svg:
      '<symbol id="mappa@1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 21 s6 -5.3 6 -10 a6 6 0 1 0 -12 0 c0 4.7 6 10 6 10 Z" /><circle cx="12" cy="11" r="2.2" />' +
      '</symbol>',
  },
  {
    // POSATA (forchetta e coltello): l'icona base del "menu / mangiare qui".
    id: 'posata@1',
    svg:
      '<symbol id="posata@1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M6 3 v5 a2 2 0 0 0 4 0 V3 M8 3 v18" /><path d="M16 3 c1.8 1.6 1.8 6.4 0 8 v10" />' +
      '</symbol>',
  },
  {
    // OROLOGIO (orari di apertura): quadrante e lancette. L'icona base del "quando siamo aperti".
    id: 'orologio@1',
    svg:
      '<symbol id="orologio@1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="9" /><path d="M12 7 v5 l3.5 2" />' +
      '</symbol>',
  },
  {
    // TELEFONO (cornetta): l'icona base del contatto/prenotazione.
    id: 'telefono@1',
    svg:
      '<symbol id="telefono@1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M6.5 3 h3 l1.5 4 -2 1.5 a12 12 0 0 0 5 5 l1.5 -2 4 1.5 v3 a2 2 0 0 1 -2 2 A16 16 0 0 1 4.5 5 a2 2 0 0 1 2 -2 Z" />' +
      '</symbol>',
  },
  {
    // FOGLIA (del fresco / di stagione): l'icona base del vegetale, per cucine verdi e materia prima.
    id: 'foglia@1',
    svg:
      '<symbol id="foglia@1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 20 C4 11 11 4 20 4 c0 9 -7 16 -16 16 Z" /><path d="M4 20 L12 12" />' +
      '</symbol>',
  },
];

/**
 * L'ILLUSTRAZIONE con questo id versionato, o `undefined` se nessuna la porta. Stesso contratto di
 * `themeFor` (T-202) ed `effectFor` (DE-201): UGUAGLIANZA ESATTA e ricerca sull'ARRAY.
 *
 * PERCHE' SULL'ARRAY E NON SU UN OGGETTO INDICIZZATO: l'id puo' arrivare da un artefatto salvato o
 * comunque da fuori, e una mappa-oggetto risolverebbe le chiavi speciali di JavaScript
 * ('__proto__', 'constructor', 'toString') sul membro EREDITATO da Object.prototype — restituendo
 * qualcosa che NON e' un'illustrazione. `find` per uguaglianza non ha quel membro ereditato.
 *
 * PERCHE' ESATTO E MAI PER PREFISSO: 'piatto' e' un prefisso genuino di 'piatto@1' e di
 * 'piatto-fondo@1' ma non e' l'id di alcuna voce; un match lasco (startsWith/includes) confonderebbe
 * il piatto col piatto fondo. L'uguaglianza restituisce la voce giusta o `undefined`.
 */
export function illustrationFor(id: string): SiteIllustration | undefined {
  return ILLUSTRATIONS.find((illustration) => illustration.id === id);
}

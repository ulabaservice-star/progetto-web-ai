# 01-editorial-skin — Macrotask `editorial-skin`

> Modulo del blueprint **design-engine-v1.1** ("wow, meglio di Wix") di Belora/Ulaba.
> Un modulo = un macrotask: l'unità al cui confine gira il checkpoint (`L-COL-018`) e
> l'unità di commit atomico su git (`L-COL-024`). Task atomici secondo lo schema trueline
> (`L-COL-019`): definition_of_done + acceptance_criteria + target_tests. Identificatori in
> inglese, prosa in italiano. Design a monte:
> `docs/superpowers/specs/2026-08-13-design-engine-v1.1-design.md` (ledger DS-D10…DS-D15).

## Obiettivo del macrotask

La **pelle editoriale**: il DNA di settore FISSO e tematizzabile (§6 della spec) che tutte
le varianti condividono. v1 ha caricato i font e dato scala all'hero, ma le regole
tipografiche sono minimali (serif solo sul titolo) e la palette è cromatica-piatta; le
illustrazioni non esistono. Questo macrotask **arricchisce** i `THEMES` con le regole
tipografiche editoriali (serif didone display / sans corpo, tracking estremo sulle label,
`tabular-nums`, italic per asse) e con la palette estesa (crema/panna/rosso-mattone/oro/
verde-basilico/ink + una **superficie scura per-tema**); **self-hosta il font display**
(didone, `next/font`, CSP intatta); codifica le regole tipografiche in `site.css` (display su
titoli/prezzi/citazioni, label uppercase tracked, leader-dots sui prezzi, `«»` automatiche,
corpo `line-height 1.65`, ritmo delle sezioni); e introduce il **sistema di illustrazioni SVG**
(`illustrations.ts`, dominio puro: `<symbol>` + id versionati, tematizzabili via `currentColor`)
col core set ristorazione. Nessuna nuova manopola di varietà qui (quella è `variety-engine`):
qui il DNA invariante che rende ogni mockup *editoriale*, non testo impilato.

Ripartizione di altitudine (§1bis del `00-INDEX`): i `THEMES` e `illustrations.ts` sono
**dominio puro** (`src/domain/generation`); i font e il CSS vivono in `src/ui/site`. Colori
**solo** `var(--site-color-*)` in `src/ui/site/**` (AC-231-4 esteso al `.css`); le scene SVG
di `illustrations.ts` (dominio) sono asset di design, fuori dallo scanner per posizione (vedi
`00-INDEX §4`, emendamento `DS-D11-a`). Nessun accesso dati nuovo, nessuna nuova tabella/RLS.

## Task atomici

```yaml
- id: DE11-101
  title: "THEMES arricchiti: regole tipografiche editoriali + palette estesa + superficie scura per-tema"
  macrotask: "editorial-skin"
  depends_on: []

  objective: >
    Arricchire i bundle THEMES (src/domain/generation/themes.ts) con le regole tipografiche
    editoriali (serif didone display / sans corpo, tracking sulle label, tabular-nums, hook
    italic per l'asse trattamento-H1) e con la palette estesa del DNA ristorazione (crema,
    panna, rosso-mattone, oro, verde-basilico, ink) più una superficie SCURA per-tema, come
    token tipizzati totali sulle chiavi. Nessun consumatore hardcoda i colori: i valori vivono
    solo nei bundle-dato THEMES e passano da var(--site-color-*) / var(--site-font-*) /
    var(--site-tracking-*) generati dal theme-style.

  definition_of_done:
    - "THEMES estende ogni tema con regole tipografiche (display/body family key, tracking label, flag tabular-nums, hook italic per l'asse H1) come campi tipizzati totali: un token mancante non compila"
    - "Ogni tema espone la palette estesa (crema, panna, rosso-mattone, oro, verde-basilico, ink) e una superficie SCURA distinta dalla superficie chiara, come token colore"
    - "theme-style.ts proietta i nuovi token in CSS custom properties (--site-color-*, --site-font-*, --site-tracking-*, --site-numeric-*) alla radice del render — nessun nuovo colore letterale nei consumatori src/ui/site"
    - "I temi storici (i 5+ id versionati esistenti) restano presenti e risolvono via themeFor (retro-compat coi documenti P4/v1)"

  acceptance_criteria:
    - id: AC-DE11-101-1
      given: "ogni tema di THEMES"
      when: "si leggono i suoi token"
      then: "espone i nuovi token tipografici (display/body/tracking-label/tabular-nums) e i nuovi token colore (crema, panna, rosso-mattone, oro, verde-basilico, ink)"
    - id: AC-DE11-101-2
      given: "ogni tema di THEMES"
      when: "si confrontano superficie chiara e superficie scura del tema"
      then: "il tema espone una superficie scura distinta dalla chiara (per il menu su fondo scuro e le sezioni alternate)"
    - id: AC-DE11-101-3
      given: "il proiettore theme-style per un tema"
      when: "si generano le CSS custom properties alla radice"
      then: "le nuove --site-color-* (rosso-mattone, oro, verde-basilico, ink, superficie scura), --site-font-* (display/body) e --site-tracking-label sono presenti come custom properties"
    - id: AC-DE11-101-4
      given: "gli id tema storici (versionati) dei documenti P4/v1"
      when: "themeFor per ciascuno"
      then: "tutti risolvono (nessuna regressione sui documenti congelati)"

  target_tests:
    - file: "tests/design-themes-editorial.test.ts"
      covers: [AC-DE11-101-1, AC-DE11-101-2, AC-DE11-101-3, AC-DE11-101-4]

  out_of_scope:
    - "L'applicazione delle regole nel CSS (DE11-103) e i font concreti self-host (DE11-102)"

- id: DE11-102
  title: "Font display self-host: serif didone via next/font mappato a --site-font-display (CSP intatta)"
  macrotask: "editorial-skin"
  depends_on: [DE11-101]

  objective: >
    Caricare davvero il font display editoriale. src/ui/site/site-fonts.ts dichiara via
    next/font (self-host) una serif didone (tipo Playfair/Bodoni-like) mappata a
    --site-font-display, con font-display swap e uno stack serif di fallback; alla radice del
    render la classe-variabile è applicata e --site-font-display mappa a var(--font-display).
    La CSP di /s/ resta intatta: font-src 'self', nessun host esterno.

  definition_of_done:
    - "src/ui/site/site-fonts.ts dichiara la serif didone display via next/font a livello di modulo (self-host), mappata a --site-font-display, con font-display: swap e stack serif di fallback"
    - "Alla radice del render la classe-variabile del font display è applicata e --site-font-display risolve a var(--font-...) con lo stack serif del tema come fallback"
    - "Nessun <link>/@import a host esterno per i font: font-src 'self' preservato (CSP deploy-hardening T-3 intatta)"

  acceptance_criteria:
    - id: AC-DE11-102-1
      given: "un sito reso su /s/<slug> con un tema del catalogo, viewport desktop"
      when: "si legge il font-family COMPUTATO dell'<h1> hero"
      then: "contiene la famiglia display didone del catalogo, non solo un fallback di sistema (Georgia/serif)"
    - id: AC-DE11-102-2
      given: "la rotta /s/ con la sua CSP"
      when: "la pagina carica i font"
      then: "document.fonts.check risolve la famiglia display come LOADED e nessuna richiesta di font parte verso un host esterno (font serviti da 'self')"
    - id: AC-DE11-102-3
      given: "src/ui/site/site-fonts.ts (sorgente)"
      when: "si legge la dichiarazione del font display"
      then: "è dichiarato via next/font a livello di modulo (self-host), con fallback serif e font-display: swap (nessun host esterno)"

  target_tests:
    - file: "e2e/editorial-skin.spec.ts"
      covers: [AC-DE11-102-1, AC-DE11-102-2]
    - file: "tests/site-fonts-display.test.ts"
      covers: [AC-DE11-102-3]

  security_notes:
    - "Self-host next/font mantiene font-src 'self': non si allarga la CSP di /s/ (deploy-hardening T-3); nessuna risorsa font esterna"

- id: DE11-103
  title: "Regole tipografiche editoriali in site.css: display, label tracked, leader-dots, «», corpo lh 1.65, ritmo"
  macrotask: "editorial-skin"
  depends_on: [DE11-101, DE11-102]

  objective: >
    Codificare in site.css le regole d'uso tipografico del DNA (non lasciate al caso): font
    display su titoli/prezzi/citazioni; label/eyebrow uppercase con tracking esteso
    (var(--site-tracking-label)); tabular-nums su orari/prezzi; leader-dots decorativi sui
    prezzi; «» automatiche sulle citazioni (quotes CSS); corpo line-height 1.65; ritmo delle
    sezioni (padding-block clamp, container width). Colori solo var(--site-color-*).

  definition_of_done:
    - "site.css applica --site-font-display su titoli/prezzi/citazioni e la sans-corpo con line-height 1.65 sul corpo"
    - "Label/eyebrow uppercase con letter-spacing = var(--site-tracking-label); tabular-nums su orari/prezzi (font-variant-numeric)"
    - "Leader-dots decorativi sui prezzi (regola CSS, es. border-bottom/::after) e «» automatiche sulle citazioni (quotes); ritmo sezioni via padding-block clamp e container min(width, %)"
    - "Nessun colore letterale nel .css: solo var(--site-color-*); lo scanner AC-231-4 resta esteso a src/ui/site/**/*.css"

  acceptance_criteria:
    - id: AC-DE11-103-1
      given: "un sito reso su /s/ con corpo e titolo"
      when: "si misurano il font-family computato dell'<h1> hero e il line-height computato del corpo"
      then: "l'<h1> usa la famiglia display e il corpo ha line-height ~1.65 (ritmo di lettura editoriale)"
    - id: AC-DE11-103-2
      given: "una label/eyebrow resa su /s/"
      when: "si leggono letter-spacing e text-transform COMPUTATI"
      then: "è uppercase con tracking esteso (letter-spacing > del corpo)"
    - id: AC-DE11-103-3
      given: "site.css e i componenti di src/ui/site/**"
      when: "si scansiona per notazione colore letterale (hex/rgb/hsl), col test esteso al .css"
      then: "non ne trova nessuna (i colori sono solo var(--site-color-*))"

  target_tests:
    - file: "e2e/editorial-skin.spec.ts"
      covers: [AC-DE11-103-1, AC-DE11-103-2]
    - file: "tests/site-css-no-literal-colors.test.ts"
      covers: [AC-DE11-103-3]

- id: DE11-104
  title: "Sistema di illustrazioni SVG: illustrations.ts (dominio puro) + core set ristorazione, currentColor"
  macrotask: "editorial-skin"
  depends_on: []

  objective: >
    Introdurre il sistema di illustrazioni di catalogo (DS-D11): src/domain/generation/
    illustrations.ts, dominio puro, dichiara <symbol> SVG con id versionati nome@N e un lookup
    illustrationFor(id) per uguaglianza esatta su ARRAY (proto-safe). Un core set ristorazione
    (piatto, mattarello, mappa, icone base) statico, tematizzabile via currentColor. Nessun
    input utente negli SVG (costanti del codice); nessuna risorsa esterna (CSP /s/ intatta).

  definition_of_done:
    - "src/domain/generation/illustrations.ts puro (nessun I/O/DB): definizioni <symbol> SVG con id versionati nome@N e lookup illustrationFor(id) per UGUAGLIANZA ESATTA su array (mai oggetto indicizzato: proto-safety)"
    - "Core set ristorazione presente: piatto, mattarello, mappa, icone base — statiche, tematizzabili via currentColor"
    - "Le icone usano currentColor (nessun fill/stroke che blocchi l'ereditarietà del colore); nessuna risorsa esterna (nessun href/src http(s) o xlink esterno) nelle stringhe SVG"

  acceptance_criteria:
    - id: AC-DE11-104-1
      given: "il catalogo illustrazioni con >=2 voci di cui un id è PREFISSO di un altro (fixture: es. piatto@1 e piatto-fondo@1)"
      when: "illustrationFor per id esatto"
      then: "trova solo l'esatto e MAI il prefisso"
    - id: AC-DE11-104-2
      given: "un lookup con id 'constructor' o '__proto__' o 'toString'"
      when: "illustrationFor"
      then: "restituisce 'nessuna voce' (mai un membro ereditato da Object.prototype)"
    - id: AC-DE11-104-3
      given: "le voci icona del catalogo"
      when: "si ispeziona la stringa SVG di ciascuna"
      then: "usano currentColor (colore ereditabile dal contesto) e non contengono riferimenti a risorse esterne (nessun http(s)/xlink esterno)"
    - id: AC-DE11-104-4
      given: "ogni voce del catalogo illustrazioni"
      when: "si verificano gli id"
      then: "tutti nella forma nome@N (versionati)"

  target_tests:
    - file: "tests/design-illustrations.test.ts"
      covers: [AC-DE11-104-1, AC-DE11-104-2, AC-DE11-104-3, AC-DE11-104-4]

  security_notes:
    - "SVG STATICI del catalogo (costanti del codice), mai da testo utente/brief: nessun percorso input→SVG; iniettati dal renderer unico senza dangerouslySetInnerHTML su input non fidato"
    - "Nessuna risorsa esterna negli SVG: coerente con la CSP di /s/ (nessun host esterno)"

  out_of_scope:
    - "La libreria SVG ristorazione COMPLETA (estende il core set) è DE11-404"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` su questa dir di blueprint —
  atteso exit 0 / tutti i controlli OK (`11` §5.1).
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task; i
  rilievi vanno all'human-in-the-loop (`11` §5.2–§5.3).

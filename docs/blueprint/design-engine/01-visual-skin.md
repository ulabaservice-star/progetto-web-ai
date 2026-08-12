# 01-visual-skin — Macrotask `visual-skin`

> Modulo del blueprint **design-engine** (motore visivo di generazione) di Belora/Ulaba.
> Un modulo = un macrotask: l'unità al cui confine gira il checkpoint (`L-COL-018`) e
> l'unità di commit atomico su git (`L-COL-024`). Task atomici secondo lo schema trueline
> (`L-COL-019`): definition_of_done + acceptance_criteria + target_tests. Identificatori in
> inglese, prosa in italiano. Design a monte:
> `docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md` (ledger DS-D1…DS-D9).

## Obiettivo del macrotask

La **fondazione**: rendere il sito generato finalmente *disegnato*, con il tema e la ricetta
**esistenti**. Oggi i token di scala e spazio (`--site-scale-*`, `--site-space-*`) sono definiti
in `theme-style.ts` ma **nessun blocco li consuma**, i font dei temi non sono caricati (fallback
Georgia), e `SiteSection` avvolge ogni blocco (hero incluso) nella stessa `<section>` con stili
statici inline → tutto impilato uguale. Questo macrotask introduce l'**unico foglio `site.css`**
agganciato alle classi che i blocchi hanno già, sposta gli stili statici inline nel CSS, dà
all'hero un tipo (`data-block-kind`), **carica i font self-host** (`next/font`, CSP intatta) e
riempie di ricchezza non-fotografica i placeholder immagine. Nessuna nuova manopola di varietà qui
(quella è `design-select`): qui un mockup smette di sembrare testo impilato.

Ripartizione di altitudine (§1bis del `00-INDEX`): il CSS/render/font vivono in `src/ui/site`;
nessun accesso dati nuovo, nessuna logica di dominio nuova. Colori **solo** `var(--site-color-*)`
(AC-231-4 esteso al `.css`).

## Task atomici

```yaml
- id: DE-101
  title: "site.css globale + consumo token scala/spazio + tipografia fluida dell'hero"
  macrotask: "visual-skin"
  depends_on: []

  objective: >
    Introdurre l'unico foglio di stile del sito generato src/ui/site/site.css, importato una
    volta dal renderer unico SiteView, che consuma finalmente i token di scala e spazio del tema
    (--site-scale-*, --site-space-*) — oggi definiti ma non usati — dando ai titoli dimensione
    reale (tipografia fluida clamp) e alle sezioni un ritmo verticale vero. Colori solo via
    var(--site-color-*).

  definition_of_done:
    - "File src/ui/site/site.css creato e importato una sola volta dal renderer unico SiteView (copre card, anteprima, /s/)"
    - ".site-hero__title usa font-size fluida clamp(<min>, <vw>, var(--site-scale-3xl)) e line-height stretta"
    - "La gerarchia dei titoli e il ritmo verticale consumano --site-scale-* e --site-space-* (nessuna dimensione hardcoded dove esiste un token)"
    - "Nessun colore letterale nel .css: solo var(--site-color-*); il test AC-231-4 esteso a scansionare anche src/ui/site/**/*.css"

  acceptance_criteria:
    - id: AC-DE-101-1
      given: "un documento reso sulla rotta pubblica /s/<slug> su viewport desktop"
      when: "si misura il font-size computato dell'<h1> hero"
      then: "è >= 40px (i titoli non sono più alla dimensione di default del browser)"
    - id: AC-DE-101-2
      given: "src/ui/site/site.css e i componenti di src/ui/site/**"
      when: "si scansiona per notazione colore letterale (hex/rgb/hsl), col test esteso al .css"
      then: "non ne trova nessuna (i colori sono solo var(--site-color-*))"
    - id: AC-DE-101-3
      given: "il renderer unico SiteView"
      when: "si legge il sorgente del modulo di render"
      then: "importa src/ui/site/site.css esattamente una volta (un solo import condiviso, nessuna copia)"

  target_tests:
    - file: "e2e/visual-skin.spec.ts"
      covers: [AC-DE-101-1]
    - file: "tests/site-css-no-literal-colors.test.ts"
      covers: [AC-DE-101-2]
    - file: "tests/site-view-stylesheet.test.ts"
      covers: [AC-DE-101-3]

  out_of_scope:
    - "Le varianti hero-layout/section-treatment (DE-207) e gli effetti (DE-301/302)"

- id: DE-102
  title: "Stili statici inline dei blocchi spostati in site.css + data-block-kind (hero distinto)"
  macrotask: "visual-skin"
  depends_on: [DE-101]

  objective: >
    Togliere gli stili statici inline dai componenti blocco (SiteSection e simili) portandoli in
    site.css, e dare a ogni sezione un data-block-kind (hero/offerte/…) così che il CSS distingua
    l'hero dal resto. Resta inline solo siteThemeStyle(theme) alla radice (dinamico).

  definition_of_done:
    - "SiteSection non porta più stili statici inline (backgroundColor/padding/borderColor/fontFamily); quelle regole vivono in site.css su .site-section"
    - "Ogni <section> porta data-block-kind col tipo del blocco (hero, offerte, orari, chi-siamo, faq, contatti, cta-whatsapp, recensioni)"
    - "site.css rende l'hero visivamente distinto: .site-section[data-block-kind=\"hero\"] ha trattamento pieno (full-bleed/spazio/background diversi) rispetto alle altre sezioni"
    - "Renderer unico invariato: nessuna copia dei blocchi; siteThemeStyle resta l'unico stile inline alla radice"

  acceptance_criteria:
    - id: AC-DE-102-1
      given: "una pagina resa con hero + almeno un'altra sezione (fixture con >1 blocco, tipi discordanti)"
      when: "si ispeziona il DOM"
      then: "la section hero porta data-block-kind=\"hero\" e le altre il proprio kind, tutti diversi tra loro"
    - id: AC-DE-102-2
      given: "i componenti di src/ui/site/blocks/** e SiteSection"
      when: "si cercano stili colore inline letterali"
      then: "non ce ne sono (i colori passano da css/var)"
    - id: AC-DE-102-3
      given: "l'hero e una sezione non-hero rese su /s/"
      when: "si confrontano gli stili computati distintivi (es. larghezza/background)"
      then: "l'hero è distinto (non l'ennesima scheda identica alle altre)"

  target_tests:
    - file: "tests/site-section-block-kind.test.ts"
      covers: [AC-DE-102-1, AC-DE-102-2]
    - file: "e2e/visual-skin.spec.ts"
      covers: [AC-DE-102-3]

- id: DE-103
  title: "Font self-host via next/font (CSP intatta) mappati ai token --site-font-*"
  macrotask: "visual-skin"
  depends_on: [DE-101]

  objective: >
    Caricare davvero i font dei temi. src/ui/site/site-fonts.ts dichiara via next/font (self-host)
    le famiglie del catalogo; alla radice del render si applicano le variabili-font del tema scelto
    e --site-font-heading/body mappano alle variabili next/font con lo stack del tema come fallback.
    La CSP di /s/ resta intatta (font-src 'self').

  definition_of_done:
    - "src/ui/site/site-fonts.ts dichiara le famiglie del catalogo via next/font a livello di modulo (self-host)"
    - "Alla radice del render si applicano le classi-variabile del tema scelto e --site-font-heading/--site-font-body mappano a var(--font-...) con lo stack del tema come fallback"
    - "font-display: swap + metriche di fallback per contenere il CLS"

  acceptance_criteria:
    - id: AC-DE-103-1
      given: "un sito reso su /s/ con un tema del catalogo"
      when: "si legge il font-family computato dell'<h1> hero (via document.fonts / computed style)"
      then: "risolve alla famiglia di catalogo del tema, non al solo fallback di sistema (Georgia/serif)"
    - id: AC-DE-103-2
      given: "la rotta /s/ con la sua CSP"
      when: "la pagina carica i font"
      then: "nessuna richiesta di font a un host esterno (font serviti da 'self')"

  target_tests:
    - file: "e2e/visual-skin.spec.ts"
      covers: [AC-DE-103-1, AC-DE-103-2]

  security_notes:
    - "Self-host next/font mantiene font-src 'self': non si allarga la CSP di /s/ introdotta dal deploy-hardening (T-3)"

- id: DE-104
  title: "Placeholder ricco per lo slot immagine (ricchezza non-fotografica), branch uploaded invariato"
  macrotask: "visual-skin"
  depends_on: [DE-101]

  objective: >
    L'hero senza foto dell'utente non deve mai essere una scatola grigia. Il trattamento CSS dello
    slot immagine (gradiente/pattern derivati da var(--site-color-*)) riempie lo spazio; il branch
    uploaded (P4) resta invariato: se c'è un asset, rende <img src=assetPublicUrl(asset_id)>.

  definition_of_done:
    - "Lo slot immagine senza asset uploaded riceve un trattamento ricco (classe/CSS con background non neutro derivato da var(--site-color-*)), non una scatola vuota"
    - "Il branch uploaded di SiteImage resta invariato: asset presente → <img src={assetPublicUrl(asset_id)}>"

  acceptance_criteria:
    - id: AC-DE-104-1
      given: "un hero il cui slot immagine non ha asset uploaded"
      when: "reso"
      then: "l'elemento placeholder porta il trattamento ricco (classe placeholder con background-image/gradient) e non è una scatola vuota/neutra"
    - id: AC-DE-104-2
      given: "un hero il cui slot immagine HA un asset uploaded"
      when: "reso"
      then: "rende <img> con src = assetPublicUrl(asset_id) (branch P4 invariato, nessuna regressione)"

  target_tests:
    - file: "tests/site-image-rich-placeholder.test.ts"
      covers: [AC-DE-104-1, AC-DE-104-2]
```

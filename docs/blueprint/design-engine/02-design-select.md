# 02-design-select — Macrotask `design-select`

> Modulo del blueprint **design-engine** di Belora/Ulaba. Un modulo = un macrotask (checkpoint al
> confine, commit atomico). Schema trueline (`L-COL-019`). Design a monte:
> `docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md` (DS-D1…DS-D9).

## Obiettivo del macrotask

Il **cuore combinatorio**: il layer di selezione design ORTOGONALE alle ricette (DS-D3). La ricetta
resta il CONTENUTO (quali sezioni, in che ordine); un nuovo layer puro decide lo STILE. Introduce i
**cataloghi curati** (hero-layout, trattamenti-sezione, livelli-effetti, ornamenti; temi cresciuti e
disaccoppiati dalla ricetta), la **matrice di compatibilità** (quali combinazioni sono ammesse), e
il **selettore deterministico** `selectDesign(vertical, seed, variantIndex)` che pesca SOLO
combinazioni ammesse e produce **5 varianti distinte per-utente**. Estende lo schema documento per
**congelare** gli id di selezione (versionati), e innesta tutto in `variant-document.ts`. Aggiunge il
CSS delle varianti hero/section. Zero LLM nelle scelte visive: l'input è `vertical` (enum) + `seed`,
mai testo libero del brief (DS-D1, anti-injection).

Ripartizione di altitudine (§1bis): cataloghi + matrice + selettore + schema = `src/domain`; il CSS
delle varianti e lo `SiteView` che scrive i data-attribute = `src/ui/site`. Nessun accesso dati
nuovo, nessuna nuova tabella/RLS.

## Task atomici

```yaml
- id: DE-201
  title: "Cataloghi puri: hero-layouts, section-treatments, effects, ornaments (versionati)"
  macrotask: "design-select"
  depends_on: []

  objective: >
    Introdurre i cataloghi di dominio puri delle nuove manopole visive, versionati e tipizzati
    totali sulle chiavi, sul modello di themes.ts: hero-layouts.ts, section-treatments.ts,
    effects.ts, ornaments.ts. Ogni catalogo dichiara voci con id nome@N e un lookup per uguaglianza
    esatta su array (proto-safe).

  definition_of_done:
    - "src/domain/generation/hero-layouts.ts (>=3 voci), section-treatments.ts (>=2), effects.ts (livelli L0..L4), ornaments.ts (>=1), tutti puri (nessun I/O/DB), id versionati nome@N"
    - "Ogni catalogo espone un lookup xFor(id) per UGUAGLIANZA ESATTA, ricerca su array (mai oggetto indicizzato per id: proto-safety)"
    - "Ogni voce marca l'idoneità universale vs overlay-di-settore (campo che il fallback userà)"

  acceptance_criteria:
    - id: AC-DE-201-1
      given: "un catalogo con >=2 voci di cui un id è PREFISSO di un altro (fixture: es. centrato@1 e centrato-foto@1)"
      when: "si cerca per id esatto"
      then: "trova solo l'esatto e MAI il prefisso"
    - id: AC-DE-201-2
      given: "ogni catalogo"
      when: "si verificano gli id"
      then: "tutti nella forma nome@N (versionati)"
    - id: AC-DE-201-3
      given: "effects.ts"
      when: "si elencano i livelli"
      then: "esattamente {L0, L1, L2, L3, L4}"
    - id: AC-DE-201-4
      given: "un lookup con id 'constructor' o '__proto__'"
      when: "si cerca"
      then: "restituisce 'nessuna voce' (mai un membro ereditato da Object.prototype)"

  target_tests:
    - file: "tests/design-catalogs.test.ts"
      covers: [AC-DE-201-1, AC-DE-201-2, AC-DE-201-3, AC-DE-201-4]

- id: DE-202
  title: "THEMES cresciuti (>=6, palette distinte) e disaccoppiati dalla ricetta"
  macrotask: "design-select"
  depends_on: []

  objective: >
    Estendere THEMES a >=6 bundle armoniosi (palette distinte, id versionati) e disaccoppiare la
    scelta del tema dalla ricetta: il tema non è più derivato SOLO da recipe.theme_id, ma è un asse
    che il selettore sceglie; themeFor resta un lookup esatto su array.

  definition_of_done:
    - "THEMES esteso a >=6 temi con palette distinte, id versionati nome@N, tipi totali sulle chiavi (un token mancante non compila)"
    - "I 5 id tema originali (sole-mediterraneo@1, linea-essenziale@1, scatto-vitale@1, bottega-artigiana@1, brezza-costiera@1) restano presenti (documenti P4 vecchi validano)"
    - "themeFor(id) lookup esatto su array (proto-safe), esportato per il selettore"

  acceptance_criteria:
    - id: AC-DE-202-1
      given: "THEMES"
      when: "si contano e si confrontano le palette"
      then: ">=6 temi con palette a due a due distinte"
    - id: AC-DE-202-2
      given: "due temi con id uno prefisso dell'altro (fixture)"
      when: "themeFor per id esatto"
      then: "nessun match sul prefisso"
    - id: AC-DE-202-3
      given: "i 5 id tema storici"
      when: "themeFor per ciascuno"
      then: "tutti risolvono (nessuna regressione sui documenti congelati P4)"

  target_tests:
    - file: "tests/design-themes-grown.test.ts"
      covers: [AC-DE-202-1, AC-DE-202-2, AC-DE-202-3]

- id: DE-203
  title: "design-matrix: matrice di compatibilità (dati + predicato puro isAllowed / allowedCombinations)"
  macrotask: "design-select"
  depends_on: [DE-201, DE-202]

  objective: >
    src/domain/generation/design-matrix.ts: la matrice di compatibilità come dati + predicato puro.
    isAllowed(combo) vieta gli accoppiamenti brutti (es. hero immagine-piena → effetti <= L2; tema
    scuro → non trattamento a-scheda chiaro); allowedCombinations(vertical) enumera le ammesse col
    fallback universale.

  definition_of_done:
    - "src/domain/generation/design-matrix.ts puro; isAllowed(combo): boolean codifica le regole di compatibilità dichiarate da noi"
    - "allowedCombinations(vertical): readonly Combo[] enumera SOLO le combinazioni ammesse per quel vertical (overlay ristorazione + fallback universale)"
    - "Nessuna regola muta: ogni regola mappa a pezzi di catalogo esistenti"

  acceptance_criteria:
    - id: AC-DE-203-1
      given: "una combo che viola una regola dichiarata (fixture: hero immagine-piena + effetti L4)"
      when: "isAllowed"
      then: "false"
    - id: AC-DE-203-2
      given: "una combo conforme alle regole"
      when: "isAllowed"
      then: "true"
    - id: AC-DE-203-3
      given: "vertical='ristorazione'"
      when: "allowedCombinations"
      then: ">=5 combinazioni, tutte isAllowed"
    - id: AC-DE-203-4
      given: "OGNI vertical dell'enum (ristorazione, fitness, salone_studio, negozio_artigiano, altro)"
      when: "allowedCombinations (col fallback universale)"
      then: ">=5 combinazioni ciascuno"

  target_tests:
    - file: "tests/design-matrix.test.ts"
      covers: [AC-DE-203-1, AC-DE-203-2, AC-DE-203-3, AC-DE-203-4]

  security_notes:
    - "Input della matrice = valori di catalogo + vertical (enum chiuso, brief.ts z.enum), mai testo libero del brief: nessun percorso injection→scelta visiva (P2-D1)"

- id: DE-204
  title: "design-select: selettore deterministico seminato (5 distinte, matrice mai violata)"
  macrotask: "design-select"
  depends_on: [DE-203]

  objective: >
    src/domain/generation/design-select.ts: selectDesign(vertical, seed, variantIndex) →
    DesignSelection puro. PRNG hash→mulberry (nessun Date/Math.random), enumera le ammesse (DE-203),
    shuffle deterministico per seed, variante i = i-esimo → 5 distinte, con garanzia di distinzione
    su >=1 asse strutturale.

  definition_of_done:
    - "selectDesign(vertical, seed, variantIndex) puro e deterministico (PRNG seminato, nessuna sorgente non deterministica: niente Date/Math.random)"
    - "Restituisce DesignSelection { recipe_id, theme_id, hero_layout_id, section_treatment_id, effect_level, ornament_id? } con soli id di catalogo esistenti"
    - "Le 5 varianti di una generazione sono mutuamente distinte e differiscono su >=1 asse strutturale (hero/treatment/recipe), non solo tema/effetti"

  acceptance_criteria:
    - id: AC-DE-204-1
      given: "(vertical, seed) fissi"
      when: "selectDesign è chiamato due volte per lo stesso variantIndex"
      then: "restituisce una selezione identica (deterministico)"
    - id: AC-DE-204-2
      given: "una generazione"
      when: "si producono le 5 varianti (i=0..4)"
      then: "sono mutuamente distinte E ogni coppia differisce su >=1 asse strutturale"
    - id: AC-DE-204-3
      given: "due seed diversi"
      when: "si producono le 5 varianti per ciascuno"
      then: "i due insiemi di selezioni differiscono (varietà per-utente)"
    - id: AC-DE-204-4
      given: "molti seed e OGNI vertical dell'enum (property test)"
      when: "si selezionano tutte le varianti"
      then: "ogni DesignSelection è isAllowed dalla matrice (nessuna combinazione vietata esce mai)"

  target_tests:
    - file: "tests/design-select.test.ts"
      covers: [AC-DE-204-1, AC-DE-204-2, AC-DE-204-3, AC-DE-204-4]

  security_notes:
    - "Input = vertical (enum) + seed derivato da id di generazione; MAI testo libero del brief (brand_hints escluso, come per il tema). Nessun percorso brief→design (P2-D1, anti-injection)"

- id: DE-205
  title: "Schema documento: freeze degli id di selezione (versionati, opzionali con default)"
  macrotask: "design-select"
  depends_on: []

  objective: >
    Estendere SiteDocumentSchema (document.ts) per registrare la selezione con id versionati
    opzionali con default (hero_layout_id, section_treatment_id, effect_level, ornament_id?);
    parseDocument accetta/registra; i documenti P4 senza i campi validano ancora (default).

  definition_of_done:
    - "SiteDocumentSchema estende con hero_layout_id, section_treatment_id, effect_level (enum L0..L4), ornament_id opzionale — opzionali con default per retro-compatibilità"
    - "parseDocument in scrittura e in render accetta e registra i campi nuovi"
    - "Un documento privo dei campi (formato P4) valida ancora, con i default applicati"

  acceptance_criteria:
    - id: AC-DE-205-1
      given: "un documento con i campi di selezione validi"
      when: "parseDocument"
      then: "ok e i campi presenti nel documento parseato"
    - id: AC-DE-205-2
      given: "un documento P4 SENZA i campi di selezione"
      when: "parseDocument"
      then: "ok (default applicati, nessun errore)"
    - id: AC-DE-205-3
      given: "un documento con effect_level fuori da {L0..L4}"
      when: "parseDocument"
      then: "rifiutato (l'intero documento cade, come per gli altri campi versionati)"

  target_tests:
    - file: "tests/document-design-selection.test.ts"
      covers: [AC-DE-205-1, AC-DE-205-2, AC-DE-205-3]

  security_notes:
    - "parseDocument resta il gate in scrittura E in render anche sui campi nuovi (invariante P4/P2): un documento malformato cade tutto"

- id: DE-206
  title: "Wiring in variant-document: resolveVariantHome usa selectDesign e congela la tupla"
  macrotask: "design-select"
  depends_on: [DE-204, DE-205]

  objective: >
    resolveVariantHome (variant-document.ts) usa selectDesign(brief.vertical, seed, variantIndex) al
    posto del solo themeFor(recipe.theme_id): ottiene la DesignSelection, risolve recipe/theme dagli
    id, compone la home, passa da parseDocument, e congela l'intera tupla nel documento.

  definition_of_done:
    - "resolveVariantHome ottiene la DesignSelection via selectDesign(brief.vertical, seed, variantIndex), risolve recipeFor/themeFor dagli id, compone, parseDocument, congela hero_layout_id/section_treatment_id/effect_level/ornament_id nel documento"
    - "Il seed è derivato da un identificatore STABILE della generazione (es. generation_id) combinato con variantIndex — deterministico e riproducibile; il valore concreto è fornito DAL CALL-SITE, non inventato"
    - "I CALL-SITE di resolveVariantHome sono aggiornati per passare (brief/vertical, seed, variantIndex) al posto della recipe pre-scelta: la recipe ora nasce DENTRO la selezione, non più fuori. Nessun consumatore resta con la vecchia firma (niente codice orfano)"
    - "Il documento congelato passa ancora parseDocument (gate invariato)"

  acceptance_criteria:
    - id: AC-DE-206-1
      given: "una generazione con 5 varianti"
      when: "resolveVariantHome per i=0..4"
      then: "ogni documento congela una DesignSelection e le 5 sono distinte su >=1 asse strutturale"
    - id: AC-DE-206-2
      given: "(seed, variantIndex) fissi"
      when: "resolveVariantHome due volte"
      then: "documento riproducibile (stessi id congelati)"
    - id: AC-DE-206-3
      given: "un pool che compone una home valida"
      when: "resolveVariantHome"
      then: "il documento restituito passa parseDocument (gate), altrimenti null (invariante P2)"

  target_tests:
    - file: "tests/variant-document-design.test.ts"
      covers: [AC-DE-206-1, AC-DE-206-2, AC-DE-206-3]

  security_notes:
    - "Input della selezione = brief.vertical (enum) + seed di generazione, MAI testo libero del brief: l'iniezione nel brief non può alterare la scelta visiva (P2-D1)"

- id: DE-207
  title: "CSS delle varianti hero-layout + section-treatment (consuma i data-attribute congelati)"
  macrotask: "design-select"
  depends_on: [DE-206, DE-101]

  objective: >
    SiteView setta alla radice data-hero-layout/data-section-treatment/data-ornament dai campi del
    documento; site.css implementa ogni variante. Colori solo var(--site-color-*).

  definition_of_done:
    - "SiteView/SitePageView scrivono data-hero-layout, data-section-treatment, data-ornament E data-effects (dal campo effect_level) alla radice del render dai campi congelati del documento — data-effects è il gancio letto dal CSS effetti (DE-301) e dall'isola (DE-302)"
    - "site.css implementa le varianti: [data-hero-layout=\"...\"] .site-hero {…}, [data-section-treatment=\"...\"] .site-section:nth-of-type(even) {…}, ornamenti"
    - "Nessun colore letterale nel .css (solo var(--site-color-*))"

  acceptance_criteria:
    - id: AC-DE-207-1
      given: "un documento con hero_layout_id, section_treatment_id ed effect_level noti"
      when: "reso"
      then: "la radice porta data-hero-layout/data-section-treatment/data-ornament/data-effects con quei valori"
    - id: AC-DE-207-2
      given: "due documenti con hero_layout_id diversi (es. 'centrato' vs 'split')"
      when: "resi"
      then: "i due DOM radice portano data-hero-layout diversi (la varietà strutturale è nel markup, non solo nel colore)"
    - id: AC-DE-207-3
      given: "site.css con le nuove varianti"
      when: "si scansiona per colore letterale"
      then: "nessuno"

  target_tests:
    - file: "tests/site-view-design-attributes.test.ts"
      covers: [AC-DE-207-1, AC-DE-207-2, AC-DE-207-3]

  out_of_scope:
    - "La prova a RUNTIME che i layout computati differiscono davvero (e2e) è in DE-401"
```

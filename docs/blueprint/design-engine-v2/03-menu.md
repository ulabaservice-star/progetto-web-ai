# 03-menu — Macrotask `menu`

> Modulo del blueprint **design-engine-v2** di Belora/Ulaba. Un modulo = un macrotask
> (checkpoint al confine + gate visivo, commit atomico). Schema trueline (`L-COL-019`). Design a
> monte: `docs/superpowers/specs/2026-08-15-design-engine-v2-design.md` (§5.3). Dipende da `foundation`.

## Obiettivo del macrotask

Il menu è la seconda sezione più identitaria della ristorazione e il pezzo che dà l'aria da "guida
gastronomica". Qui si **traducono le varianti menu di Claude Design** (progetto `c1dafc1f`) in tre
artefatti: (1) il **catalogo** delle varianti menu in `section-layouts.ts` (menu_layout_id versionati,
dominio puro); (2) il **renderer unico** `Offerte.tsx` che rende la variante attiva — card-carta su
`var(--site-color-surface-dark)`, doppia cornice, voci nome+prezzo con **leader-dots** e prezzi
`tabular-nums`; (3) l'**aggancio `vertical` → variante menu** nella matrice: `allowedCombinations`
offre `menu_layout_id` come **asse per-vertical indipendente** (chiude il buco di v1.1, dove
`menu-card-carta@1` non era mai selezionato perché ancorato a `heroIndex % len`).

`site.css` è toccato sia da hero sia da menu → **un macrotask alla volta** evita i conflitti (menu
dopo hero). Renderer unico; solo token (`var(--…)`), nessun colore letterale; escaping React; niente
`dangerouslySetInnerHTML`; prezzi/nomi da campi documento validati (`parseDocument`).

## Task atomici

```yaml
- id: DV2-301
  title: "section-layouts.ts: le varianti menu di Claude Design (menu_layout_id versionati, catalogo puro)"
  macrotask: "menu"
  depends_on: [DV2-101]

  objective: >
    Ampliare src/domain/generation/section-layouts.ts con le varianti menu di Claude Design (progetto
    c1dafc1f): >=4 menu_layout_id versionati (nome@N), ognuno con la sua struttura (disposizione voci,
    presenza leader-dots, colonna prezzi, cornice). Dominio puro: nessun React, nessun colore letterale.
    Lookup per id esatto e proto-safe.

  definition_of_done:
    - "section-layouts.ts esporta TUTTE le varianti menu del catalogo CD (minimo 4) come menu_layout_id distinti versionati (nome@N), ognuno con i campi struttura non vuoti"
    - "Il catalogo e' dominio puro (nessun React/DB, nessun colore letterale); lookup per id esatto/proto-safe"
    - "Ogni variante menu dichiara gli slot/parti che Offerte.tsx dovra' rendere (voci nome/prezzo, leader-dots, cornice)"

  acceptance_criteria:
    - id: AC-DV2-301-1
      given: "il catalogo section-layouts.ts (parte menu) di v2"
      when: "si contano i menu_layout_id e si ispeziona ciascuno"
      then: "ci sono >=4 id distinti versionati, ognuno con i campi struttura non vuoti"
    - id: AC-DV2-301-2
      given: "un menu_layout_id noto"
      when: "lo si risolve col lookup"
      then: "restituisce esattamente quella struttura; un id inesistente non risolve a un default silenzioso (proto-safe)"
    - id: AC-DV2-301-3
      given: "due menu_layout_id distinti"
      when: "si confrontano le strutture"
      then: "differiscono su almeno un asse VISIBILE (disposizione voci o trattamento prezzi/cornice), non solo per nome"

  target_tests:
    - file: "tests/design-section-layouts-menu-v2.test.ts"
      covers: [AC-DV2-301-1, AC-DV2-301-2, AC-DV2-301-3]

  security_notes:
    - "Catalogo dominio puro, statico: mai da input utente, nessuna risorsa esterna; riferimenti token simbolici, nessun colore letterale"

  out_of_scope:
    - "Il rendering (DV2-302) e l'offerta per-vertical nella matrice (DV2-303)"

- id: DV2-302
  title: "Offerte.tsx renderer unico: card-carta su fondo scuro, leader-dots, prezzi tabular, data-menu-layout"
  macrotask: "menu"
  depends_on: [DV2-104, DV2-301]

  objective: >
    Riscrivere src/ui/site/blocks/Offerte.tsx come renderer UNICO che consuma menu_layout_id dal
    documento e rende la variante CD attiva: card-carta su var(--site-color-surface-dark) con doppia
    cornice (contenitore + bordo interno), voci nome+prezzo con un elemento leader-dots decorativo tra
    i due, prezzi in una colonna allineata con la classe tabular-nums stilata da site.css. La radice
    porta data-menu-layout col valore congelato. Solo token (nessun colore letterale); escaping React;
    niente dangerouslySetInnerHTML.

  definition_of_done:
    - "Offerte.tsx consuma menu_layout_id e rende una card-carta su var(--site-color-surface-dark) con doppia cornice; la radice porta data-menu-layout col valore congelato"
    - "Ogni voce con prezzo ha nome + leader-dots + prezzo; i prezzi portano la classe/markup della colonna prezzi (allineata, tabular-nums via site.css)"
    - "Renderer unico invariato; solo var(--site-color-*) (nessun colore letterale); escaping React; nessun dangerouslySetInnerHTML"

  acceptance_criteria:
    - id: AC-DV2-302-1
      given: "un menu con >=2 voci con prezzo e un menu_layout_id noto"
      when: "Offerte e' reso"
      then: "ogni voce ha nome e prezzo con un elemento leader-dots tra i due, e la radice porta data-menu-layout con quel valore"
    - id: AC-DV2-302-2
      given: "il menu reso"
      when: "si ispeziona la struttura"
      then: "e' una card-carta (doppia cornice: contenitore + bordo interno) su una superficie scura del tema (var(--site-color-surface-dark), non un colore letterale)"
    - id: AC-DV2-302-3
      given: "i prezzi resi"
      when: "si ispeziona il markup dei prezzi"
      then: "gli elementi prezzo portano la classe/markup della colonna prezzi (allineata, stilata tabular-nums da site.css)"
    - id: AC-DV2-302-4
      given: "un menu il cui testo di voci/prezzi contiene payload ostile"
      when: "Offerte e' reso"
      then: "nessun markup iniettato: nomi e prezzi sono escapati da React, nessun src/href nasce dal testo"

  target_tests:
    - file: "tests/site-menu-v2.test.ts"
      covers: [AC-DV2-302-1, AC-DV2-302-2, AC-DV2-302-3, AC-DV2-302-4]

  security_notes:
    - "Prezzi/nomi da campi documento validati (parseDocument); escaping React; niente dangerouslySetInnerHTML (AC-231-4); nessun colore letterale (solo var(--site-color-*)); renderer unico SiteView"

  out_of_scope:
    - "L'offerta di menu_layout_id come asse per-vertical (DV2-303) e la selezione greedy (variety-select)"

- id: DV2-303
  title: "Aggancio vertical -> variante menu: menu_layout_id asse per-vertical indipendente nella matrice"
  macrotask: "menu"
  depends_on: [DV2-301]

  objective: >
    Chiudere il buco di v1.1 (menu-card-carta mai selezionato perche' ancorato a heroIndex % len):
    in design-matrix.ts, allowedCombinations(vertical) deve offrire menu_layout_id come ASSE
    INDIPENDENTE per-vertical, non derivato dall'indice hero. Per ogni vertical della ristorazione,
    l'insieme delle combinazioni ammesse copre >=2 menu_layout_id distinti (materiale per la varieta'
    di menu), e ogni combo porta un menu_layout_id valido del catalogo (DV2-301).

  definition_of_done:
    - "allowedCombinations(vertical) porta menu_layout_id come asse indipendente (non menu = layouts[heroIndex % len]); ogni combo ha un menu_layout_id valido del catalogo"
    - "Per ogni vertical ristorazione, l'insieme delle combo ammesse copre >=2 menu_layout_id distinti"
    - "Nessuna regressione sulla purezza/determinismo della matrice (dominio puro, nessun Date/Math.random)"

  acceptance_criteria:
    - id: AC-DV2-303-1
      given: "un vertical ristorazione"
      when: "si enumerano allowedCombinations(vertical) e si leggono i menu_layout_id"
      then: "l'insieme copre >=2 menu_layout_id distinti e nessuno di essi e' ancorato all'indice hero (l'asse e' indipendente)"
    - id: AC-DV2-303-2
      given: "una combinazione ammessa per un vertical"
      when: "si legge il suo menu_layout_id"
      then: "e' un id valido presente nel catalogo section-layouts (DV2-301), risolvibile dal lookup"
    - id: AC-DV2-303-3
      given: "la matrice v2"
      when: "si ispeziona il modulo"
      then: "resta dominio puro e deterministica (nessun Date/Math.random; stesse combinazioni a parita' di vertical)"

  target_tests:
    - file: "tests/design-matrix-menu-v2.test.ts"
      covers: [AC-DV2-303-1, AC-DV2-303-2, AC-DV2-303-3]

  security_notes:
    - "design-matrix e' dominio puro; l'unico ingresso e' vertical (enum), mai testo libero (anti-injection P2-D1); determinismo (nessun Date/Math.random)"

  out_of_scope:
    - "La selezione greedy multi-asse che sfrutta questo asse per diversificare (DV2-502)"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task.
- **Gate visivo** (DS-V2-D6, non oracolabile): screenshot su `/s/` del menu card-carta CD; l'utente
  giudica il "wow". Se non convince, ci si ferma.

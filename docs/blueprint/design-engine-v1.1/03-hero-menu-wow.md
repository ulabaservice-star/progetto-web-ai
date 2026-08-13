# 03-hero-menu-wow — Macrotask `hero-menu-wow`

> Modulo del blueprint **design-engine-v1.1** di Belora/Ulaba. Un modulo = un macrotask
> (checkpoint al confine, commit atomico). Schema trueline (`L-COL-019`). Design a monte:
> `docs/superpowers/specs/2026-08-13-design-engine-v1.1-design.md` (§3.1, DS-D15).

## Obiettivo del macrotask

Il **NUCLEO di varietà** e il **GATE** dell'intero approccio (DS-D15: nucleo validato PRIMA
dell'inventario completo). `Hero` e `Menu` sono le due sezioni più identitarie: qui vengono
riscritti come componenti *progettati* che consumano gli assi congelati (hero-layout,
trattamento-H1, illustrazione, section-layout menu) e la pelle editoriale di M1. L'hero diventa
un layout 2-col asimmetrico con illustrazione SVG di catalogo, badge, CTA, meta/chip, titolo col
font display; il menu diventa una card-carta su superficie scura del tema, con leader-dots sui
prezzi, doppia cornice e prezzi allineati. Il macrotask **si chiude con l'e2e-nucleo**
(`e2e/visual-engine-v11.spec.ts`): il gate che prova, sulle 5 varianti REALI di uno stesso seed
(via `selectDesign`, non documenti costruiti a mano), che l'hero VISIBILE e ≥1 asse del corpo
divergano davvero (computed-style) — il buco di v1 — e che il "wow" strutturale sia presente
(illustrazione + menu impaginato con prezzi), con **canary rosso** prima del verde.

Ripartizione di altitudine (§1bis): i blocchi ricchi e l'e2e vivono in `src/ui/site` / `e2e`;
la selezione degli assi resta dominio puro (M2). Renderer UNICO `SiteView` (P2-D8): il "wow"
vale per card, anteprima e `/s/`. Escaping React; SVG statici di catalogo; nessun `src/href` da
testo libero.

## Task atomici

```yaml
- id: DE11-301
  title: "Hero blocco ricco: assi + illustrazione SVG + badge + CTA + meta/chip (font display)"
  macrotask: "hero-menu-wow"
  depends_on: [DE11-103, DE11-201, DE11-204, DE11-205]

  objective: >
    Riscrivere src/ui/site/blocks/Hero.tsx come componente progettato che consuma gli assi
    congelati (hero_layout_id, h1_treatment_id) e l'illustrazione SVG di catalogo
    (illustration_id via <use> al symbol), con slot badge + CTA + meta/chip e titolo col font
    display. Alla radice del blocco i data-attribute dell'asse (data-hero-layout,
    data-h1-treatment). Renderer unico, escaping React, nessun src/href da testo libero.

  definition_of_done:
    - "Hero.tsx riscritto: consuma hero_layout_id + h1_treatment_id dal documento; layout 2-col asimmetrico con slot testo/illustrazione/badge/CTA/meta-chip"
    - "L'illustrazione hero è un SVG di catalogo (illustrationFor + <use> al symbol), non un <img> a risorsa esterna; l'<h1> usa --site-font-display"
    - "La radice del blocco porta data-hero-layout e data-h1-treatment coi valori congelati; la struttura del trattamento-H1 attivo è resa (kicker+italic oppure accent-wavy)"
    - "Renderer unico invariato (nessuna copia); escaping React; nessun src/href derivato da testo libero del brief"

  acceptance_criteria:
    - id: AC-DE11-301-1
      given: "un documento con hero_layout_id, h1_treatment_id, illustration_id noti"
      when: "Hero è reso"
      then: "la radice del blocco porta data-hero-layout e data-h1-treatment con quei valori"
    - id: AC-DE11-301-2
      given: "un hero reso"
      when: "si ispeziona il DOM"
      then: "contiene l'illustrazione SVG di catalogo (<svg>/<use> al symbol) e gli slot badge, CTA e meta/chip"
    - id: AC-DE11-301-3
      given: "un documento con un dato trattamento-H1 (es. kicker-tracked-italic vs accent-wavy)"
      when: "Hero è reso"
      then: "la struttura del trattamento attivo è presente e coerente con l'id (kicker+main italic, oppure accento con sottolineatura wavy)"
    - id: AC-DE11-301-4
      given: "un documento il cui testo dei campi hero contiene payload ostile"
      when: "Hero è reso"
      then: "nessun markup iniettato: l'SVG resta costante di catalogo, il testo è escapato da React e nessun src/href nasce dal testo"

  target_tests:
    - file: "tests/site-hero-rich.test.ts"
      covers: [AC-DE11-301-1, AC-DE11-301-2, AC-DE11-301-3, AC-DE11-301-4]

  security_notes:
    - "Escaping React sul testo; SVG statico di catalogo (mai da input utente); nessun src/href da testo libero (P2-D1/P2-D12). Renderer unico SiteView (P2-D8)"

- id: DE11-302
  title: "Menu blocco ricco: card-carta su fondo scuro, leader-dots prezzi, doppia cornice, prezzi allineati"
  macrotask: "hero-menu-wow"
  depends_on: [DE11-103, DE11-202, DE11-205]

  objective: >
    Riscrivere il blocco menu (Offerte/menu-list per ristorazione) come card-carta su una
    superficie SCURA del tema (var(--site-color-surface-dark)), con doppia cornice, voci
    nome+prezzo, leader-dots decorativi tra nome e prezzo, e prezzi allineati con tabular-nums.
    Consuma i token (nessun colore letterale); renderer unico; escaping React.

  definition_of_done:
    - "Il blocco menu rende una card-carta su superficie scura del tema (var(--site-color-surface-dark)) con doppia cornice (contenitore + bordo interno)"
    - "Ogni voce ha nome e prezzo con un elemento leader-dots decorativo tra i due; i prezzi portano il markup dei prezzi (colonna allineata, classe che site.css stila con tabular-nums)"
    - "Nessun colore letterale (solo var(--site-color-*)); renderer unico invariato; escaping React"

  acceptance_criteria:
    - id: AC-DE11-302-1
      given: "un menu con >=2 voci con prezzo"
      when: "reso"
      then: "ogni voce ha nome e prezzo con un elemento leader-dots tra i due"
    - id: AC-DE11-302-2
      given: "il menu reso"
      when: "si ispeziona la struttura"
      then: "è una card-carta (doppia cornice: contenitore + bordo interno) su una superficie scura del tema (classe/var, non colore letterale)"
    - id: AC-DE11-302-3
      given: "i prezzi resi"
      when: "si ispeziona il markup dei prezzi"
      then: "gli elementi prezzo portano la classe/markup della colonna prezzi (allineata, stilata tabular-nums da site.css)"

  target_tests:
    - file: "tests/site-menu-rich.test.ts"
      covers: [AC-DE11-302-1, AC-DE11-302-2, AC-DE11-302-3]

  security_notes:
    - "Prezzi/nomi da campi documento validati (parseDocument); escaping React; nessun colore letterale nel markup (solo var(--site-color-*)). Renderer unico SiteView"

- id: DE11-303
  title: "e2e-nucleo (GATE): 5 varianti reali di un seed divergono su hero VISIBILE + corpo (computed) + canary"
  macrotask: "hero-menu-wow"
  depends_on: [DE11-301, DE11-302]

  objective: >
    e2e/visual-engine-v11.spec.ts (Chromium, ANON su /s/<slug>): il GATE del nucleo. Renderizza
    le 5 varianti REALI di uno stesso seed (prodotte via selectDesign, NON documenti costruiti a
    mano) e prova che differiscano sull'asse hero VISIBILE (computed-style) E su >=1 asse del
    corpo; che il "wow" strutturale sia presente (illustrazione SVG resa, menu impaginato con
    prezzi + leader-dots, font display hero >= soglia); e un CANARY che rende ROSSO lo stesso
    oracolo di varietà (il verde vale solo perché il canary sa fallire).

  definition_of_done:
    - "e2e/visual-engine-v11.spec.ts creato: seed + /s/<slug> anon (riusa l'harness e2e P4), 5 varianti dello STESSO seed ottenute via selectDesign (non doc a mano)"
    - "Prova di varietà: le 5 varianti differiscono sull'asse hero VISIBILE (computed-style: es. display/grid o layout dell'hero) E su >=1 asse del corpo (computed)"
    - "Prova di 'wow' strutturale: illustrazione SVG di catalogo presente, menu impaginato (card + prezzi + leader-dots), font-size hero display >= soglia (computato)"
    - "CANARY confinato che rende ROSSO l'oracolo di varietà (es. hero-layout forzato identico / difetto deliberato): il verde vale solo perché il canary sa diventare rosso"

  acceptance_criteria:
    - id: AC-DE11-303-1
      given: "le 5 varianti REALI di uno stesso seed (via selectDesign)"
      when: "rese su /s/ e misurate in computed-style"
      then: "differiscono sull'asse hero VISIBILE E su >=1 asse del corpo (varietà reale, non solo colore)"
    - id: AC-DE11-303-2
      given: "una variante resa su /s/"
      when: "si ispezionano hero e menu"
      then: "l'illustrazione SVG di catalogo è presente, il menu è impaginato (card con prezzi + leader-dots) e il font-size hero display computato è >= soglia"
    - id: AC-DE11-303-3
      given: "un CANARY confinato (hero-layout forzato identico o difetto deliberato)"
      when: "gira lo STESSO oracolo di varietà"
      then: "diventa ROSSO (prova che l'oracolo sa fallire)"

  target_tests:
    - file: "e2e/visual-engine-v11.spec.ts"
      covers: [AC-DE11-303-1, AC-DE11-303-2, AC-DE11-303-3]

  security_notes:
    - "Le 5 varianti nascono da selectDesign(vertical, seed), MAI dal testo del brief: la varietà non è un vettore di injection (P2-D1). Canary rosso obbligatorio (L-COL-006)"

  out_of_scope:
    - "Le sezioni chi-siamo/orari/contatti/footer complete (M4) e l'e2e verticale end-to-end su tutte le sezioni + anti-injection (M5)"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` su questa dir di blueprint —
  atteso exit 0 / tutti i controlli OK (`11` §5.1).
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task; i
  rilievi vanno all'human-in-the-loop (`11` §5.2–§5.3).

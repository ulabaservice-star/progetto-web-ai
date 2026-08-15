# 02-hero — Macrotask `hero`

> Modulo del blueprint **design-engine-v2** di Belora/Ulaba. Un modulo = un macrotask
> (checkpoint al confine + gate visivo, commit atomico). Schema trueline (`L-COL-019`). Design a
> monte: `docs/superpowers/specs/2026-08-15-design-engine-v2-design.md` (§5.2). Dipende da `foundation`.

## Obiettivo del macrotask

L'hero è il **primo schermo**: l'asse che l'occhio nota per primo e il pezzo più identitario della
varietà. Qui si **traducono le varianti hero di Claude Design** (progetto `c1dafc1f`, ordine di
grandezza ~8–20) in due artefatti: (1) il **catalogo** `hero-layouts.ts` ampliato agli N id versionati
(dominio puro, ogni id porta la sua struttura: posizione media, slot, trattamento titolo); (2) il
**renderer unico** `Hero.tsx` che consuma `hero_layout_id` dal documento congelato e rende la variante
attiva con slot editabili (eyebrow, titolo display, sottotitolo, CTA, `PhotoPlaceholder`), proiettando
`data-hero-layout` sulla radice del blocco.

Renderer **UNICO** (P2-D8): l'hero vale identico per card, anteprima e `/s/`. Il titolo usa
`--site-font-display`; le foto sono `PhotoPlaceholder` di catalogo (DS-V2-D3), mai `<img>` a risorsa
esterna. Escaping React su tutti gli slot; **niente `dangerouslySetInnerHTML`** (AC-231-4); nessun
`src`/`href` nato dal testo libero del brief (anti-injection P2-D1). Colori solo via `var(--…)`.

## Task atomici

```yaml
- id: DV2-201
  title: "hero-layouts.ts ampliato agli N id di Claude Design (catalogo puro, id versionati)"
  macrotask: "hero"
  depends_on: [DV2-101]

  objective: >
    Ampliare src/domain/generation/hero-layouts.ts al set di varianti hero di Claude Design (progetto
    c1dafc1f): >=8 hero_layout_id versionati (nome@N), ognuno con la sua struttura dichiarata (posizione
    del media: split/editoriale/full/testo-illustrazione, slot presenti, trattamento del titolo). E'
    dominio puro: nessun React, nessun colore letterale (solo riferimenti simbolici ai token). Il
    lookup per id e' esatto e proto-safe (un id inesistente non risolve a un default silenzioso).

  definition_of_done:
    - "hero-layouts.ts esporta TUTTE le varianti hero del catalogo CD (~20; minimo 8) come hero_layout_id distinti versionati (nome@N), ciascuno con i campi struttura (media placement, slot, trattamento titolo)"
    - "Il catalogo e' dominio puro (nessun import React/DB, nessun colore letterale) e il lookup per id e' esatto/proto-safe"
    - "Ogni layout dichiara gli slot che il renderer dovra' popolare (eyebrow, title, subtitle, cta, photo-placeholder), in modo che Hero.tsx sappia cosa rendere"

  acceptance_criteria:
    - id: AC-DV2-201-1
      given: "il catalogo hero-layouts.ts di v2"
      when: "si contano gli hero_layout_id e si ispeziona ciascuno"
      then: "ci sono >=8 id distinti versionati (nome@N), ognuno con i campi struttura non vuoti (media placement, slot)"
    - id: AC-DV2-201-2
      given: "un hero_layout_id noto del catalogo"
      when: "lo si risolve col lookup"
      then: "restituisce esattamente quella struttura; un id inesistente non risolve a un clone/default silenzioso (proto-safe)"
    - id: AC-DV2-201-3
      given: "due hero_layout_id distinti del catalogo"
      when: "si confrontano le loro strutture"
      then: "differiscono su almeno un asse VISIBILE (posizione media o trattamento titolo), non solo per nome"

  target_tests:
    - file: "tests/design-hero-layouts-v2.test.ts"
      covers: [AC-DV2-201-1, AC-DV2-201-2, AC-DV2-201-3]

  security_notes:
    - "Catalogo dominio puro, statico: mai da input utente, nessuna risorsa esterna. Riferimenti ai token simbolici, nessun colore letterale"

  out_of_scope:
    - "Il rendering delle varianti (DV2-202) e l'offerta per-vertical / selezione (macrotask variety-select)"

- id: DV2-202
  title: "Hero.tsx renderer unico: traduce le varianti CD, slot editabili, data-hero-layout, escaping"
  macrotask: "hero"
  depends_on: [DV2-104, DV2-201]

  objective: >
    Riscrivere src/ui/site/blocks/Hero.tsx come renderer UNICO che consuma hero_layout_id dal documento
    congelato e rende la variante CD attiva: slot editabili (eyebrow, titolo col font display,
    sottotitolo, CTA via Button, media come PhotoPlaceholder), con la struttura (2-col split /
    editoriale / full) dettata dal layout. La radice del blocco porta data-hero-layout col valore
    congelato. Consuma i primitivi di DV2-104; solo token (var(--...)), nessun colore letterale;
    escaping React; niente dangerouslySetInnerHTML; nessun src/href da testo libero.

  definition_of_done:
    - "Hero.tsx consuma hero_layout_id dal documento e rende la variante corrispondente con gli slot eyebrow/title/subtitle/cta/photo; la radice porta data-hero-layout col valore congelato"
    - "Il titolo usa --site-font-display; il media e' un PhotoPlaceholder di catalogo (nessun <img> esterno); la CTA usa il primitivo Button"
    - "Renderer unico invariato (nessuna copia del render tra card/anteprima/serving); solo var(--...) (nessun colore letterale); escaping React; nessun dangerouslySetInnerHTML"

  acceptance_criteria:
    - id: AC-DV2-202-1
      given: "un documento con un hero_layout_id noto"
      when: "Hero e' reso"
      then: "la radice del blocco porta data-hero-layout con quel valore e la struttura resa (posizione media, slot) e' coerente con la variante CD di quell'id"
    - id: AC-DV2-202-2
      given: "un hero reso"
      when: "si ispeziona il DOM"
      then: "contiene gli slot eyebrow, titolo (con --site-font-display), sottotitolo, CTA (Button) e un PhotoPlaceholder di catalogo (nessuna risorsa esterna)"
    - id: AC-DV2-202-3
      given: "due hero_layout_id distinti dello stesso documento-base"
      when: "resi e ispezionati"
      then: "il markup differisce su un asse strutturale VISIBILE (es. ordine/posizione del blocco media), non solo per un attributo"
    - id: AC-DV2-202-4
      given: "un documento il cui testo dei campi hero contiene payload ostile"
      when: "Hero e' reso"
      then: "nessun markup iniettato: il testo e' escapato da React, il PhotoPlaceholder resta di catalogo e nessun src/href nasce dal testo"

  target_tests:
    - file: "tests/site-hero-v2.test.ts"
      covers: [AC-DV2-202-1, AC-DV2-202-2, AC-DV2-202-3, AC-DV2-202-4]

  security_notes:
    - "Escaping React sugli slot; niente dangerouslySetInnerHTML (AC-231-4); PhotoPlaceholder di catalogo, mai risorsa esterna (CSP/DS-V2-D3); nessun src/href da testo libero (P2-D1/P2-D12); renderer unico SiteView (P2-D8); nessun colore letterale"

  out_of_scope:
    - "La proiezione degli assi nel documento reale e l'inoltro design+vertical ai blocchi (macrotask variety-select)"
    - "La prova e2e computed-style su /s/ (macrotask e2e-visual-v2)"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task.
- **Gate visivo** (DS-V2-D6, non oracolabile): screenshot su `/s/` di un mockup con hero CD; l'utente
  giudica il "wow" dell'hero. Se non convince, ci si ferma (Piano B).

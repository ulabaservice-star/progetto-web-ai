# 06-e2e-visual-v2 — Macrotask `e2e-visual-v2`

> Modulo del blueprint **design-engine-v2** di Belora/Ulaba. Un modulo = un macrotask
> (checkpoint al confine + gate visivo, commit atomico). Schema trueline (`L-COL-019`). Design a
> monte: `docs/superpowers/specs/2026-08-15-design-engine-v2-design.md` (§5.6). Dipende da
> `variety-select`. **ULTIMO nodo del DAG.**

## Obiettivo del macrotask

Il **gate finale** end-to-end: prova, a runtime su `/s/` (Chromium, ANON), che le **5 varianti reali**
di uno stesso seed — prodotte via `selectDesign`, **non** documenti costruiti a mano — (a) **divergano
davvero** sull'asse hero VISIBILE (computed-style) **e** su ≥1 asse del corpo; (b) mostrino il **"wow"
strutturale** di v2 (hero editoriale con `PhotoPlaceholder`, menu card-carta con prezzi + leader-dots,
font display ≥ soglia computata); (c) con un **CANARY** che rende ROSSO lo stesso oracolo (il verde
vale solo perché il canary sa fallire). In più, l'**anti-injection** si ri-prova sui **nuovi blocchi
ricchi**: un documento ostile pubblicato su `/s/` non produce alcun effetto d'iniezione, anch'esso con
canary rosso.

Riusa l'**harness P4** (`e2e/support/seed.ts`, la rotta `/s/<slug>` anon, `e2e/support/effect-assertions.ts`,
`e2e/fixtures/hostile-brief.ts`). Misura **computed-style**, non pixel-diff. Per un macrotask di soli
test la **mutazione** muta la PRODUZIONE (es. `site.css` o un blocco) e verifica il rosso dopo
`next build`; ripristino **backup+sha256**, mai `git checkout`.

## Task atomici

```yaml
- id: DV2-601
  title: "e2e-nucleo GATE: 5 varianti reali di un seed divergono su hero VISIBILE + corpo (computed) + wow + canary"
  macrotask: "e2e-visual-v2"
  depends_on: [DV2-503, DV2-504]

  objective: >
    Creare e2e/visual-engine-v2.spec.ts (Chromium, ANON su /s/<slug>): il GATE del motore v2.
    Renderizza le 5 varianti REALI di uno stesso seed (prodotte via selectDesign, NON documenti a mano)
    e prova che differiscano sull'asse hero VISIBILE (computed-style) E su >=1 asse del corpo; che il
    "wow" strutturale sia presente (hero editoriale con PhotoPlaceholder, menu card-carta con prezzi +
    leader-dots, font-size hero display >= soglia computata); e un CANARY confinato che rende ROSSO lo
    stesso oracolo di varieta'. Riusa l'harness e2e P4 (seed, /s/ anon).

  definition_of_done:
    - "e2e/visual-engine-v2.spec.ts creato: seed + /s/<slug> anon (harness P4), 5 varianti dello STESSO seed via selectDesign (non doc a mano)"
    - "Prova di varieta': le 5 varianti differiscono sull'asse hero VISIBILE (computed-style: es. layout/posizione media dell'hero) E su >=1 asse del corpo (computed)"
    - "Prova di 'wow' strutturale: PhotoPlaceholder di catalogo presente nell'hero, menu impaginato (card-carta + prezzi + leader-dots), font-size hero display computato >= soglia"
    - "CANARY confinato che rende ROSSO l'oracolo di varieta' (es. hero-layout forzato identico): il verde vale solo perche' il canary sa diventare rosso"

  acceptance_criteria:
    - id: AC-DV2-601-1
      given: "le 5 varianti REALI di uno stesso seed (via selectDesign)"
      when: "rese su /s/ e misurate in computed-style"
      then: "differiscono sull'asse hero VISIBILE E su >=1 asse del corpo (varieta' reale, non solo colore)"
    - id: AC-DV2-601-2
      given: "una variante resa su /s/"
      when: "si ispezionano hero e menu"
      then: "l'hero ha un PhotoPlaceholder di catalogo, il menu e' una card-carta impaginata (prezzi + leader-dots) e il font-size hero display computato e' >= soglia"
    - id: AC-DV2-601-3
      given: "un CANARY confinato (hero-layout forzato identico o difetto deliberato)"
      when: "gira lo STESSO oracolo di varieta'"
      then: "diventa ROSSO (prova che l'oracolo sa fallire)"

  target_tests:
    - file: "e2e/visual-engine-v2.spec.ts"
      covers: [AC-DV2-601-1, AC-DV2-601-2, AC-DV2-601-3]

  security_notes:
    - "Le 5 varianti nascono da selectDesign(vertical, seed), MAI dal testo del brief: la varieta' non e' un vettore di injection (P2-D1). Canary rosso obbligatorio (L-COL-006). /s/ anon: RLS anon-published (P4) invariata"

  out_of_scope:
    - "L'anti-injection sui nuovi blocchi ricchi (DV2-602)"

- id: DV2-602
  title: "e2e anti-injection su /s/ coi nuovi blocchi ricchi: documento ostile senza effetto + canary rosso"
  macrotask: "e2e-visual-v2"
  depends_on: [DV2-501]

  objective: >
    Estendere l'harness ostile P4 (e2e/fixtures/hostile-brief.ts, effect-assertions.ts) ai NUOVI blocchi
    ricchi di v2 (Hero, Offerte, chi-siamo/orari/contatti/recensioni/faq/header/footer): un documento
    OSTILE pubblicato e reso su /s/<slug> anon non produce ALCUN effetto d'iniezione (nessun markup
    iniettato, nessun src/href nato dal testo, PhotoPlaceholder/SVG restano di catalogo, nessuna risorsa
    esterna), con assertNoInjectionEffect + un CANARY ROSSO sulla stessa allowlist.

  definition_of_done:
    - "e2e/public-hostile-v2.spec.ts (o estensione dello spec P4) copre i nuovi blocchi ricchi con un documento ostile pubblicato su /s/ anon"
    - "assertNoInjectionEffect: nessun markup iniettato dai campi testo, nessun src/href dal testo, PhotoPlaceholder/SVG restano di catalogo, allowlist host esclude host attaccante"
    - "CANARY ROSSO sulla stessa allowlist (il verde vale solo perche' il canary sa fallire)"

  acceptance_criteria:
    - id: AC-DV2-602-1
      given: "un documento OSTILE (payload nei campi testo di hero/menu/corpo) pubblicato su /s/ anon"
      when: "e' reso e misurato con effect-assertions"
      then: "nessun effetto d'iniezione: testo escapato, nessun src/href dal testo, PhotoPlaceholder/SVG di catalogo, nessuna risorsa esterna"
    - id: AC-DV2-602-2
      given: "il rendering ostile dei nuovi blocchi"
      when: "si applica l'allowlist degli host"
      then: "gli unici host ammessi sono quelli app+storage derivati; l'host attaccante e' escluso"
    - id: AC-DV2-602-3
      given: "un CANARY (blocco reso in modo deliberatamente insicuro sulla stessa superficie)"
      when: "gira lo STESSO oracolo anti-injection"
      then: "diventa ROSSO (prova che l'oracolo sa fallire)"

  target_tests:
    - file: "e2e/public-hostile-v2.spec.ts"
      covers: [AC-DV2-602-1, AC-DV2-602-2, AC-DV2-602-3]

  security_notes:
    - "Riuso dell'harness ostile P4 (T-417): allowlist host derivata, escaping React, PhotoPlaceholder/SVG di catalogo mai da input; /s/ anon con RLS anon-published invariata; canary rosso obbligatorio (L-COL-006)"

  out_of_scope:
    - "La prova di varieta'/wow (DV2-601); le foto reali (P4-D7/F)"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task.
- **Gate visivo finale** (DS-V2-D6): con l'e2e verde, l'ultimo giudizio del "wow" complessivo resta
  umano (non oracolabile, L-COL-006). Merge su `main` human-gated (deploy-coupling `coupled`).

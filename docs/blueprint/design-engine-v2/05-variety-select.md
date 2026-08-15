# 05-variety-select — Macrotask `variety-select`

> Modulo del blueprint **design-engine-v2** di Belora/Ulaba. Un modulo = un macrotask
> (checkpoint al confine + gate visivo, commit atomico). Schema trueline (`L-COL-019`). Design a
> monte: `docs/superpowers/specs/2026-08-15-design-engine-v2-design.md` (§4, §5.5, DS-V2-D4/D5) +
> emendamento **DS-V2-D8** (ricetta come asse). Dipende da `hero`, `menu`, `body-sections`.

## Obiettivo del macrotask

Qui la varietà diventa **vera**. Tre pezzi: (1) il **riuso dell'aggancio di varietà** dal branch
`hero-menu-wow` (`fff6904`, DS-V2-D5): `variant-document` congela **tutti** gli assi + `vertical` nel
documento, `SiteView`/`SiteDesignSelection` li proiettano come `data-*` e inoltrano `design`+`vertical`
ai blocchi via `registry`/`SiteBlockProps` — così gli assi variati **raggiungono i mockup** (il buco di
v1.1); (2) **`recipe_id` come asse della matrice** (DS-V2-D8): oggi `design-matrix.ts` **non** sceglie
`recipe_id` (contenuto ortogonale, DS-D3) e la ricetta è attaccata a valle → `allowedCombinations`
comincia a portare `recipe_id` come asse per-vertical, così la **copy** varia tra i 5 mockup; (3) la
**selezione greedy multi-asse** (DS-V2-D4) in `design-select.ts`: `buildVariants` passa dal
dedup-per-hero al **farthest-first deterministico** — la variante `i` minimizza la somiglianza massima
(numero di assi in comune, **ricetta inclusa**) con le già scelte, con **esclusione dura** di
`hero_layout_id` e `theme_id` finché c'è materiale, seminata dal seed (`mulberry32`, nessun
`Date`/`Math.random`), tie-break deterministico via `rng`.

Il tutto è **puro e deterministico** (stessi `vertical`+`seed` → stesse 5 varianti byte per byte),
istantaneo, sicuro (scelta = manopole nostre, mai il modello; ingresso `vertical`+`seed`, mai testo
libero — P2-D1). Un test **pinna il materiale**: `allowedCombinations` offre ≥5 `hero_layout_id`
distinti **e** ≥5 `theme_id` (**e** ≥2 `recipe_id`) per ogni `vertical`, altrimenti `selectDesign`
**fallisce forte** nominando il vertical.

> **Emendamento DS-V2-D8 (decisione utente).** La ricetta era "contenuto ortogonale" fuori dalla
> matrice (DS-D3). v2 la promuove ad **asse di varietà**: la matrice sceglie anche lo stile-ricetta,
> per far divergere la copy tra i mockup. La ricetta resta **stile di copy di catalogo** (nessun testo
> inventato dalla matrice); il contenuto reale delle caselle lo scrive l'LLM a runtime, come sempre.

## Task atomici

```yaml
- id: DV2-501
  title: "Riuso aggancio di varieta': variant-document congela tutti gli assi + inoltro design+vertical ai blocchi"
  macrotask: "variety-select"
  depends_on: [DV2-202, DV2-302, DV2-303, DV2-402, DV2-403, DV2-404]

  objective: >
    Riusare l'aggancio di varieta' del branch hero-menu-wow (fff6904, DS-V2-D5): variant-document
    congela TUTTI gli assi scelti (theme_id, hero_layout_id, menu_layout_id, section_layout_id per
    sezione, recipe_id) PIU' vertical nel documento; SiteView/SiteDesignSelection li proiettano come
    data-* alla radice e inoltrano design+vertical ai blocchi via registry/SiteBlockProps. Cosi' gli
    assi variati raggiungono i blocchi ricchi (Hero/Offerte/corpo di 02-04) invece dei default. Si
    scartano i blocchi poveri e il refactor illustrazioni di v1.1.

  definition_of_done:
    - "variant-document congela gli assi di varieta' v2 (DS-V2-D9: theme_id, hero_layout_id, menu_layout_id, section_layout_id per sezione, recipe_id) + vertical (id versionati nome@N); gli assi decorativi legacy di v1.1 restano inerti (non congelati come varieta')"
    - "SiteView/SiteDesignSelection proiettano gli assi come data-* alla radice e inoltrano design+vertical ai blocchi via registry/SiteBlockProps"
    - "I blocchi ricchi (Hero/Offerte/corpo) ricevono e consumano gli assi congelati (non i default): un mockup reso riflette gli assi scelti"

  acceptance_criteria:
    - id: AC-DV2-501-1
      given: "un design selezionato (assi noti) per un vertical"
      when: "si costruisce il documento congelato via variant-document"
      then: "il documento porta tutti gli assi (theme_id, hero_layout_id, menu_layout_id, section_layout_id per sezione, recipe_id) e vertical, con id versionati"
    - id: AC-DV2-501-2
      given: "un documento congelato con assi noti"
      when: "e' reso da SiteView"
      then: "gli assi sono proiettati come data-* alla radice e i blocchi ricevono design+vertical via props (non i default)"
    - id: AC-DV2-501-3
      given: "due documenti congelati con hero_layout_id/menu_layout_id diversi"
      when: "sono resi"
      then: "i blocchi Hero/Offerte riflettono gli assi congelati distinti (data-hero-layout/data-menu-layout diversi), provando che l'aggancio arriva ai mockup"

  target_tests:
    - file: "tests/document-design-selection-v2.test.ts"
      covers: [AC-DV2-501-1, AC-DV2-501-2, AC-DV2-501-3]

  security_notes:
    - "Gli assi congelati nascono da selectDesign(vertical, seed), MAI dal testo del brief (anti-injection P2-D1); id versionati congelati (freeze); renderer unico SiteView (P2-D8)"

  out_of_scope:
    - "L'asse ricetta nella matrice (DV2-502), l'algoritmo greedy (DV2-503), il requisito di materiale (DV2-504)"

- id: DV2-502
  title: "design-matrix: recipe_id come asse di varieta' in allowedCombinations (emendamento DS-V2-D8)"
  macrotask: "variety-select"
  depends_on: [DV2-501]

  objective: >
    Oggi design-matrix.ts NON sceglie recipe_id (contenuto ortogonale, DS-D3): resta assente dalle
    combo e la ricetta e' attaccata a valle. Per aumentare la varieta' anche nella COPY tra i 5 mockup
    (decisione utente, emendamento DS-V2-D8), allowedCombinations(vertical) attacca un recipe_id a ogni
    combo, scelto da un insieme per-vertical: la matrice ora sceglie anche lo stile-ricetta come ASSE.
    Puro e deterministico (nessun Date/Math.random); ogni recipe_id e' valido (recipeFor lo risolve).
    La ricetta resta stile-di-copy di catalogo, NON testo inventato dalla matrice.

  definition_of_done:
    - "allowedCombinations(vertical) porta recipe_id come asse: ogni combo ha un recipe_id valido (recipeFor(recipe_id) != undefined)"
    - "Per ogni vertical ristorazione l'insieme delle combo copre >=2 recipe_id distinti (materiale per la varieta' di copy)"
    - "La matrice resta dominio puro e deterministica; l'emendamento DS-D3 -> DS-V2-D8 e' registrato nel 00-INDEX (la ricetta diventa un asse di varieta', non piu' solo contenuto ortogonale)"

  acceptance_criteria:
    - id: AC-DV2-502-1
      given: "un vertical ristorazione"
      when: "si enumerano allowedCombinations(vertical) e si leggono i recipe_id"
      then: "ogni combo porta un recipe_id valido (risolto da recipeFor) e l'insieme copre >=2 recipe_id distinti"
    - id: AC-DV2-502-2
      given: "una combinazione ammessa"
      when: "si valida il suo recipe_id"
      then: "recipeFor(recipe_id) e' definito (nessun recipe_id fantasma); una combo con recipe_id inesistente non e' ammessa"
    - id: AC-DV2-502-3
      given: "la matrice v2 con l'asse ricetta"
      when: "si enumerano le combo due volte per lo stesso vertical"
      then: "sono identiche (deterministica, nessun Date/Math.random); il modulo resta dominio puro"

  target_tests:
    - file: "tests/design-matrix-recipe-v2.test.ts"
      covers: [AC-DV2-502-1, AC-DV2-502-2, AC-DV2-502-3]

  security_notes:
    - "design-matrix dominio puro; ingresso vertical (enum), mai testo libero (P2-D1); recipe_id valido (recipeFor); la matrice sceglie uno STILE di copy di catalogo, non fabbrica testo; determinismo"

  out_of_scope:
    - "La selezione greedy che diversifica su questo asse (DV2-503); il requisito di materiale (DV2-504)"

- id: DV2-503
  title: "Selezione greedy multi-asse (farthest-first deterministico) in design-select.ts"
  macrotask: "variety-select"
  depends_on: [DV2-501, DV2-502]

  objective: >
    Sostituire in design-select.ts il dedup-per-hero con la selezione greedy multi-asse (DS-V2-D4):
    buildVariants enumera pool = allowedCombinations(vertical) (ora con gli assi theme_id,
    hero_layout_id, menu_layout_id, section_layout_id, recipe_id — assi di varieta' v2 di DS-V2-D9); rng =
    mulberry32(hash(seed)) UNICA sorgente seminata; prima variante = prima del pool mescolato col seed;
    variante i (i>=1) = fra le combo non scelte, quella che MINIMIZZA la somiglianza massima (n. assi in
    comune, RECIPE INCLUSA) con le gia' scelte, con esclusione DURA di hero_layout_id e theme_id finche'
    c'e' materiale, tie-break deterministico via rng. Puro e deterministico (nessun Date/Math.random).

  definition_of_done:
    - "buildVariants implementa il farthest-first deterministico sugli assi di varieta' v2 (DS-V2-D9: theme, hero, menu, section-layout, recipe): variante i minimizza la somiglianza massima con le gia' scelte; tie-break via rng seminato; gli assi decorativi legacy di v1.1 sono ignorati"
    - "Esclusione dura di hero_layout_id e theme_id finche' esistono hero/temi liberi; recipe_id e gli altri assi sono diversificati (soft) dalla metrica di distanza; rilassamento in ordine (prima gli assi meno visibili) solo se il materiale finisce"
    - "Puro e deterministico: unica sorgente rng = mulberry32(hash(seed)); nessun Date/Math.random; stessi vertical+seed -> stesse 5 varianti byte per byte"

  acceptance_criteria:
    - id: AC-DV2-503-1
      given: "un vertical con materiale sufficiente e un seed"
      when: "si generano le 5 varianti via buildVariants/selectDesign"
      then: "hanno hero_layout_id a due a due diversi E theme_id a due a due diversi (esclusione dura rispettata)"
    - id: AC-DV2-503-2
      given: "le 5 varianti di un seed"
      when: "si misura la somiglianza (assi in comune, recipe inclusa) tra ciascuna e le precedenti"
      then: "ogni variante i>=1 minimizza la somiglianza massima con le gia' scelte (farthest-first) e i recipe_id sono diversificati (non tutti uguali quando c'e' materiale)"
    - id: AC-DV2-503-3
      given: "lo stesso vertical+seed"
      when: "si eseguono selectDesign due volte"
      then: "producono le stesse 5 varianti byte per byte (determinismo; nessun Date/Math.random)"

  target_tests:
    - file: "tests/design-select-greedy-v2.test.ts"
      covers: [AC-DV2-503-1, AC-DV2-503-2, AC-DV2-503-3]

  security_notes:
    - "Selezione = manopole nostre: input vertical (enum) + seed, MAI testo libero (anti-injection P2-D1); determinismo (unica rng seminata, nessun Date/Math.random); dominio puro"

  out_of_scope:
    - "Il requisito di materiale e il fallimento forte (DV2-504); la prova e2e computed-style (e2e-visual-v2)"

- id: DV2-504
  title: "Requisito di materiale pinnato: >=5 hero + >=5 theme (+ >=2 recipe) per vertical, altrimenti selectDesign fallisce forte"
  macrotask: "variety-select"
  depends_on: [DV2-503]

  objective: >
    Pinnare con un test il requisito di materiale che la greedy presuppone (DS-V2-D4 punto 6): per OGNI
    vertical, allowedCombinations deve offrire >=5 hero_layout_id distinti E >=5 theme_id distinti (E
    >=2 recipe_id distinti, per l'asse ricetta di DS-V2-D8); altrimenti selectDesign FALLISCE FORTE con
    un errore che NOMINA il vertical, invece di restituire cloni in silenzio. E' la rete che impedisce
    alla varieta' di degradare a "5 quasi-uguali" quando il catalogo di un vertical e' povero.

  definition_of_done:
    - "Un test verifica, per ogni vertical ristorazione, >=5 hero_layout_id distinti E >=5 theme_id distinti E >=2 recipe_id distinti in allowedCombinations(vertical)"
    - "selectDesign, su un vertical con materiale insufficiente (hero o theme < 5), lancia un errore che NOMINA il vertical (nessun clone silenzioso)"
    - "Il percorso di fallimento e' deterministico e non intercetta i vertical con materiale sufficiente (nessun falso allarme)"

  acceptance_criteria:
    - id: AC-DV2-504-1
      given: "ogni vertical ristorazione supportato"
      when: "si contano hero_layout_id, theme_id e recipe_id distinti in allowedCombinations(vertical)"
      then: ">=5 hero_layout_id distinti E >=5 theme_id distinti E >=2 recipe_id distinti per ciascun vertical"
    - id: AC-DV2-504-2
      given: "un vertical con materiale insufficiente (hero o theme distinti < 5)"
      when: "si chiama selectDesign su quel vertical"
      then: "lancia un errore il cui messaggio nomina il vertical (fallimento forte, nessun clone restituito)"
    - id: AC-DV2-504-3
      given: "un vertical con materiale sufficiente"
      when: "si chiama selectDesign"
      then: "NON lancia: restituisce 5 varianti valide (la guardia non da' falsi allarmi)"

  target_tests:
    - file: "tests/design-select-material-v2.test.ts"
      covers: [AC-DV2-504-1, AC-DV2-504-2, AC-DV2-504-3]

  security_notes:
    - "Il fallimento forte e' un fail-safe di correttezza (mai un verde finto, L-COL-006): meglio un errore esplicito che 5 cloni silenziosi. Determinismo e purezza invariati"

  out_of_scope:
    - "La prova a runtime della varieta' su /s/ (computed-style) e il canary (macrotask e2e-visual-v2)"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task.
- **Gate visivo** (DS-V2-D6, non oracolabile): screenshot delle 5 varianti reali di un seed su `/s/`;
  l'utente giudica se sono davvero diverse **e** belle. È il gate che v1.1 non ha superato.

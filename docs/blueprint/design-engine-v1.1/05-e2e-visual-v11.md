# 05-e2e-visual-v11 — Macrotask `e2e-visual-v11`

> Modulo del blueprint **design-engine-v1.1** di Belora/Ulaba. Un modulo = un macrotask
> (checkpoint al confine, commit atomico). Schema trueline (`L-COL-019`). Design a monte:
> `docs/superpowers/specs/2026-08-13-design-engine-v1.1-design.md` (§13).

## Obiettivo del macrotask

La **prova di punta verticale**. La bellezza non è oracolabile → l'e2e prova **struttura + il
difetto specifico**, l'estetica la giudica l'utente (merge human-gated). Estende
`e2e/visual-engine-v11.spec.ts` (nato come gate del nucleo in DE11-303) alla pagina COMPLETA:
le 5 varianti reali di uno stesso seed devono differire **end-to-end su tutte le sezioni** (hero
+ chi-siamo + orari + contatti + menu + footer), con **tutti i blocchi ricchi** resi (niente
testo impilato); l'**anti-injection** su documento pubblicato ostile (selezione invariata +
effetto nullo, riusando l'harness P4: `hostile-brief`, `seedAsset`/`seedPublication`,
`assertNoInjectionEffect`); il progressive-enhancement + reduced-motion; e il **canary rosso**
prima del verde.

Riusa l'harness e2e di P4 (seed + rotta pubblica anon `/s/<slug>`, `assertNoInjectionEffect`,
`hostile-brief`). Estende T-241/T-317/T-417 alla superficie del motore visivo v1.1. È l'**ultimo
nodo** del DAG: al suo verde (+ gate umano) il workstream v1.1 è completo.

## Task atomici

```yaml
- id: DE11-501
  title: "e2e verticale completo: 5 mockup diversi su tutte le sezioni + blocchi ricchi + anti-injection + canary"
  macrotask: "e2e-visual-v11"
  depends_on: [DE11-401, DE11-402, DE11-403, DE11-404]

  objective: >
    Estendere e2e/visual-engine-v11.spec.ts (Chromium, ANON su /s/<slug>) alla pagina completa:
    le 5 varianti REALI di uno stesso seed (via selectDesign) differiscono end-to-end su hero +
    corpo con tutte le sezioni ricche rese (chi-siamo/orari/contatti/menu/footer), non testo
    impilato; anti-injection su documento pubblicato ostile (selezione invariata + effetto
    nullo, riusa harness P4); PE + reduced-motion; e un CANARY che rende ROSSO lo stesso oracolo
    (varietà/anti-injection).

  definition_of_done:
    - "e2e/visual-engine-v11.spec.ts esteso: le 5 varianti dello STESSO seed (via selectDesign) differiscono end-to-end su hero VISIBILE + >=1 asse del corpo, misurato in computed-style, su TUTTE le sezioni"
    - "Tutti i blocchi ricchi resi: hero (illustrazione + trattamento-H1), chi-siamo (feature/illustrazione), orari (tabella + card pasto), contatti (mappa SVG + fondale), menu (card-carta + prezzi + leader-dots), footer + accessori — nessuna sezione è testo impilato"
    - "Anti-injection: documento pubblicato OSTILE (riusa hostile-brief P4 + seedAsset/seedPublication) -> selezione design invariata (id catalogo, nessun payload) e assertNoInjectionEffect dà effetto nullo"
    - "Progressive-enhancement + reduced-motion: contenuto intero senza JS e con prefers-reduced-motion, nessuno <script> inline, nessun movimento residuo"
    - "CANARY confinato che rende ROSSO lo stesso oracolo (varietà/anti-injection): il verde vale solo perché il canary sa diventare rosso"

  acceptance_criteria:
    - id: AC-DE11-501-1
      given: "le 5 varianti REALI di uno stesso seed (via selectDesign)"
      when: "rese su /s/ e misurate end-to-end in computed-style"
      then: "differiscono sull'asse hero VISIBILE E su >=1 asse del corpo, con tutte le sezioni (chi-siamo/orari/contatti/menu/footer) presenti e impaginate"
    - id: AC-DE11-501-2
      given: "una variante resa su /s/"
      when: "si ispeziona ogni sezione"
      then: "ogni sezione mostra il proprio layout ricco (feature-grid / tabella-orari / mappa-SVG / menu-card con prezzi), non testo impilato"
    - id: AC-DE11-501-3
      given: "un documento pubblicato OSTILE (riusa hostile-brief P4)"
      when: "reso su /s/"
      then: "la selezione design è invariata (id catalogo, nessun campo derivato dal testo del brief) e assertNoInjectionEffect dà effetto nullo (payload come TESTO)"
    - id: AC-DE11-501-4
      given: "prefers-reduced-motion: reduce e, separatamente, JS disabilitato"
      when: "il sito è reso su /s/"
      then: "il contenuto è intero e visibile, nessuno <script> inline è introdotto e non c'è movimento residuo (PE + reduced-motion)"
    - id: AC-DE11-501-5
      given: "il CANARY confinato attivo"
      when: "gira lo STESSO oracolo (varietà/anti-injection)"
      then: "diventa ROSSO (prova che l'oracolo sa fallire)"

  target_tests:
    - file: "e2e/visual-engine-v11.spec.ts"
      covers: [AC-DE11-501-1, AC-DE11-501-2, AC-DE11-501-3, AC-DE11-501-4, AC-DE11-501-5]

  security_notes:
    - "Prova sull'EFFETTO alla superficie pubblica: estende T-241/T-317/T-417; input selezione = vertical+seed, un brief ostile non altera il design; assertNoInjectionEffect con allowlist DERIVATA da assetPublicUrl (esclude l'host attaccante); canary rosso obbligatorio (L-COL-006)"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` su questa dir di blueprint —
  atteso exit 0 / tutti i controlli OK (`11` §5.1).
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task; i
  rilievi vanno all'human-in-the-loop (`11` §5.2–§5.3).

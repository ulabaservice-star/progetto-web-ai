# 04-e2e-visual — Macrotask `e2e-visual`

> Modulo del blueprint **design-engine** di Belora/Ulaba. Un modulo = un macrotask (checkpoint al
> confine, commit atomico). Schema trueline (`L-COL-019`). Design a monte:
> `docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md` (§12).

## Obiettivo del macrotask

La **prova di punta**. La bellezza non è oracolabile → l'e2e prova la **struttura e il difetto
specifico**, l'estetica la giudica l'utente (merge human-gated). Un unico e2e Chromium su `/s/`
riunisce le quattro prove: **pelle** (font-size hero ≥ soglia + font di catalogo caricato) —
l'oracolo che pinna il difetto "titoli minuscoli"; **varietà** (due varianti con hero-layout
computati distinti — la prova che i mockup differiscono per struttura, non solo per colore);
**effetti** (reveal allo scroll, reduced-motion nessun movimento + contenuto visibile, contenuto
visibile senza JS); **anti-injection** (documento pubblicato ostile → selezione design invariata +
effetto nullo). Il **canary** rende ROSSO l'oracolo: il verde vale solo perché il canary sa fallire.

Riusa l'harness e2e di P4 (seed + rotta pubblica anon `/s/<slug>`, `assertNoInjectionEffect`,
`hostile-brief`). Estende T-241/T-317/T-417 alla superficie del motore visivo.

## Task atomici

```yaml
- id: DE-401
  title: "e2e Chromium su /s/: pelle + varietà + effetti + anti-injection + canary rosso"
  macrotask: "e2e-visual"
  depends_on: [DE-101, DE-206, DE-207, DE-302]

  objective: >
    e2e/visual-engine.spec.ts (Chromium) su un sito pubblicato: prova la pelle (font-size hero >=
    soglia + font caricato), la varietà (due varianti/seed con hero-layout computati diversi), gli
    effetti (reveal allo scroll, reduced-motion nessun movimento + contenuto visibile, contenuto
    visibile senza JS), l'anti-injection (documento ostile → selezione design invariata + effetto
    nullo), e un CANARY che rende rosso l'oracolo della pelle/anti-injection.

  definition_of_done:
    - "e2e/visual-engine.spec.ts su un sito pubblicato (riusa l'harness e2e P4: seed + /s/<slug> anon)"
    - "Prova pelle: font-size hero >= soglia + font di catalogo caricato; varietà: due varianti con data-hero-layout computati distinti; effetti: reveal .is-visible allo scroll, prefers-reduced-motion nessun movimento + contenuto visibile, contenuto visibile con JS disabilitato"
    - "Anti-injection: documento pubblicato ostile (riusa hostile-brief) → la selezione design è invariata e nessun effetto injection (assertNoInjectionEffect)"
    - "CANARY confinato che rende ROSSO l'oracolo della pelle/anti-injection (es. componente con font-size minuscolo/insicuro deliberato): il verde vale solo perché il canary sa diventare rosso"

  acceptance_criteria:
    - id: AC-DE-401-1
      given: "un sito pubblicato reso su /s/"
      when: "l'e2e misura la pelle"
      then: "font-size hero >= soglia e font di catalogo caricato (non fallback di sistema)"
    - id: AC-DE-401-2
      given: "due varianti con hero-layout diversi"
      when: "rese su /s/"
      then: "gli hero hanno layout computati distinti (varietà visiva reale, non solo colore)"
    - id: AC-DE-401-3
      given: "gli effetti"
      when: "si scrolla con motion default; poi con prefers-reduced-motion; poi con JS disabilitato"
      then: "[data-reveal] ottiene .is-visible con motion; nessun movimento e contenuto visibile con reduced-motion; contenuto visibile senza JS"
    - id: AC-DE-401-4
      given: "un documento pubblicato OSTILE"
      when: "reso su /s/"
      then: "la selezione design è invariata (nessun campo di selezione derivato dal testo del brief) e assertNoInjectionEffect dà effetto nullo (payload come TESTO)"
    - id: AC-DE-401-5
      given: "il CANARY confinato attivo"
      when: "gira lo stesso oracolo della pelle/anti-injection"
      then: "diventa ROSSO (prova che l'oracolo sa fallire)"

  target_tests:
    - file: "e2e/visual-engine.spec.ts"
      covers: [AC-DE-401-1, AC-DE-401-2, AC-DE-401-3, AC-DE-401-4, AC-DE-401-5]

  security_notes:
    - "Prova sull'EFFETTO alla superficie pubblica: estende T-241/T-317/T-417; input selezione = vertical+seed, un brief ostile non altera il design; canary rosso obbligatorio (L-COL-006: prima di credere a un verde, prova che lo strumento sa diventare rosso)"
```

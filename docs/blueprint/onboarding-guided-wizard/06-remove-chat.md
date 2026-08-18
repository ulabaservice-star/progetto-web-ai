# 06-remove-chat — Macrotask `remove-chat`

> Modulo del blueprint `onboarding-guided-wizard`. **Ultimo** nodo: rimuove la chat libera, ora
> sostituita dal wizard. Si rimuove **solo dopo** `wizard-shell` (mai lasciare l'onboarding senza
> input). Dipende da `wizard-shell`.

## Obiettivo del macrotask

Rimozione ordinata di `ChatPanel`, `interview.ts` (`runInterviewTurn` + tool `update_brief`/
`mark_ready`), `POST /api/onboarding/[siteId]/turn`, e i loro test e stringhe i18n. Il modello
onboarding **resta** (serve le funzioni AI mirate). Prova di **non-regressione**: il `Brief` e la
generazione sono invariati, quindi un brief prodotto dal wizard genera lo stesso documento.

## Task atomici

```yaml
- id: OGW-601
  title: "Rimozione chat (ChatPanel/interview/POST turn) + non-regressione della generazione"
  macrotask: "remove-chat"
  depends_on: [OGW-502]
  objective: >
    Eliminare la superficie della chat libera senza dead-code residuo ne riferimenti rotti, e
    dimostrare che la generazione non regredisce: lo stesso Brief produce lo stesso documento di prima
    (Brief e motore invariati).
  definition_of_done:
    - "ChatPanel, interview.ts e la rotta POST /api/onboarding/[siteId]/turn rimossi"
    - "Nessun import residuo ne dead-code nuovo (knip/tsc puliti); stringhe i18n della chat rimosse"
    - "Il modello onboarding resta configurato (serve le funzioni AI mirate), non piu' la chat"
  acceptance_criteria:
    - id: AC-601-1
      given: "l'app dopo la rimozione"
      when: "si richiede POST /api/onboarding/{siteId}/turn"
      then: "l'endpoint non esiste piu' (rotta rimossa)"
    - id: AC-601-2
      given: "il codebase dopo la rimozione"
      when: "si eseguono tsc e knip"
      then: "nessun import residuo di ChatPanel/interview e nessun dead-code nuovo introdotto"
    - id: AC-601-3
      given: "un Brief fisso prodotto dal wizard"
      when: "lo si porta a documento con il percorso di generazione (invariato)"
      then: "il documento e' identico a quello che lo stesso Brief produceva prima (non-regressione)"
  target_tests:
    - file: "tests/onboarding-chat-removed.test.ts"
      covers: [AC-601-1, AC-601-2]
    - file: "tests/onboarding-generation-regression.test.ts"
      covers: [AC-601-3]
  security_notes:
    - "La rimozione riduce la superficie (un endpoint mutante in meno); nessun nuovo canale introdotto"
  out_of_scope:
    - "Il modello Z (wizard a risposte assistite) e la resa per-settore — roadmap separata"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` — exit 0.
- **Confine checkpoint**: knip (dead-code) + regressione generazione + e2e; mutazione: lasciare un
  import residuo di ChatPanel → knip/AC-601-2 rosso.

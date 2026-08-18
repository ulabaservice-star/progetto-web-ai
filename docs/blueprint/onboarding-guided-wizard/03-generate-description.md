# 03-generate-description — Macrotask `generate-description`

> Modulo del blueprint `onboarding-guided-wizard`. La prima delle due funzioni AI **nuove**
> (l'import esiste già): espande la frase dell'utente in una descrizione (copy). On-demand,
> anti-invenzione, dietro il budget di `ai-usage-guard`. Dipende da `ai-usage-guard`.

## Obiettivo del macrotask

Il pulsante **✨ Genera descrizione** dello step Racconto: da `vertical` + una frase libera
dell'utente, produce una descrizione (entro `BRIEF_LIMITS.description`) resa in un campo
**editabile** che l'utente accetta/modifica/scarta. Il prompt vincola il modello a **espandere le
parole dell'utente**, non ad aggiungere fatti (P2-D7). Dominio puro rispetto all'I/O (porta LLM
iniettata, come `runInterviewTurn`); l'endpoint applica guardie + budget.

## Task atomici

```yaml
- id: OGW-301
  title: "Dominio generateDescription (porta LLM iniettata, anti-invenzione, output validato)"
  macrotask: "generate-description"
  depends_on: []
  objective: >
    Una funzione di dominio che, ricevuta una porta LLM iniettata, un vertical (enum) e una frase
    dell'utente, ritorna una descrizione validata (entro il tetto). Il system prompt vincola il
    modello a espandere le parole date senza aggiungere fatti; l'output e' ri-validato per forma.
  definition_of_done:
    - "generateDescription(port, {vertical, phrase}) ritorna una descrizione entro BRIEF_LIMITS.description"
    - "Il system prompt inviato alla porta contiene l'istruzione anti-invenzione (espandi le parole date, non aggiungere fatti)"
    - "Output vuoto o oltre il tetto e' respinto (nessuna descrizione fuori forma proposta)"
  acceptance_criteria:
    - id: AC-301-1
      given: "un vertical e una frase dell'utente, con una porta LLM finta che risponde entro il tetto"
      when: "si chiama generateDescription"
      then: "ritorna la descrizione non vuota, entro BRIEF_LIMITS.description"
    - id: AC-301-2
      given: "una porta LLM finta che risponde con testo oltre il tetto o vuoto"
      when: "si chiama generateDescription"
      then: "il risultato e' respinto/segnalato (nessuna descrizione fuori forma restituita come valida)"
    - id: AC-301-3
      given: "una chiamata a generateDescription"
      when: "si ispeziona il system prompt passato alla porta LLM"
      then: "contiene la clausola anti-invenzione (espandere le parole dell'utente, non aggiungere fatti non dati)"
  target_tests:
    - file: "tests/onboarding-generate-description.test.ts"
      covers: [AC-301-1, AC-301-2, AC-301-3]
  security_notes:
    - "Input = frase utente (non fidato) + vertical (enum); nessun contenuto esterno in ingresso -> superficie di prompt-injection minima"
    - "Output = suggerimento editabile, mai auto-scritto nel brief (P2-D7)"
  out_of_scope:
    - "L'endpoint e la UI (OGW-302)"

- id: OGW-302
  title: "Endpoint genera-descrizione (guardie + budget) + UI pulsante nello step Racconto"
  macrotask: "generate-description"
  depends_on: [OGW-301, OGW-102]
  objective: >
    Esporre generateDescription dietro le guardie di rotta condivise e il budget AI (checkAiBudget
    prima, recordAiUsage dopo successo); il pulsante nello step Racconto propone la descrizione in
    un campo editabile senza salvarla finche' l'utente non conferma.
  definition_of_done:
    - "Endpoint con guardie condivise (same-origin/CSRF, tetto byte, identita, proprieta sito)"
    - "checkAiBudget prima della chiamata AI; recordAiUsage solo dopo successo (consume-on-success); 429 al cap"
    - "UI: pulsante che mostra la descrizione proposta in un campo editabile; disabilitato con messaggio al cap"
    - "Il catch dell'endpoint LOGGA la causa reale (nessun 502 opaco)"
  acceptance_criteria:
    - id: AC-302-1
      given: "una richiesta senza header same-origin o su un sito non del chiamante"
      when: "colpisce l'endpoint"
      then: "e' rifiutata dalle guardie (403/404), senza chiamare il modello"
    - id: AC-302-2
      given: "un sito sotto il budget AI"
      when: "l'endpoint genera la descrizione con successo"
      then: "risponde 200 con la descrizione e il contatore d'uso del sito incrementa di uno"
    - id: AC-302-3
      given: "un sito che ha raggiunto il cap AI"
      when: "colpisce l'endpoint"
      then: "risponde 429 senza chiamare il modello e senza incrementare; la UI disabilita il pulsante con un messaggio"
    - id: AC-302-4
      given: "una descrizione proposta dal pulsante"
      when: "l'utente non la conferma"
      then: "non e' salvata nel brief (resta editabile; entra solo su conferma esplicita)"
  target_tests:
    - file: "tests/onboarding-generate-description-route.test.ts"
      covers: [AC-302-1, AC-302-2, AC-302-3]
    - file: "tests/onboarding-generate-description-ui.test.tsx"
      covers: [AC-302-4]
  security_notes:
    - "Guardie condivise (_shared/request-guard: same-origin/byte; route-guards: identita/proprieta P1-D21); nessun service_role"
    - "Budget consume-on-success (OGW-102); output editabile non auto-scritto; catch che logga (no 502 opaco)"
  out_of_scope:
    - "Il pulsante Suggerisci-offerte (OGW-402)"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` — exit 0.
- **Confine checkpoint**: unit dominio (doppio LLM) + route test + UI test; mutazione: saltare
  checkAiBudget → il test 429 rosso; auto-salvare la descrizione → AC-302-4 rosso.

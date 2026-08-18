# 04-suggest-offerings — Macrotask `suggest-offerings`

> Modulo del blueprint `onboarding-guided-wizard`. La seconda funzione AI nuova, e l'unico punto in
> cui l'AI propone contenuto plausibile-ma-non-reale → la mitigazione è **strutturale**: placeholder
> a **prezzo vuoto**, confermati **per-voce** (OGW-D2). Dipende da `ai-usage-guard` e `offerings-editor`.

## Obiettivo del macrotask

Il pulsante **✨ Suggerisci voci tipiche** nell'`OfferingsEditor`: da `vertical` (+ descrizione
opzionale) propone voci d'esempio del settore (es. pizzeria → "Margherita", "Marinara") come
**placeholder** a prezzo vuoto, etichettati "esempio — personalizzalo". **Nessuna** entra nel brief
finché l'utente non la conferma (clic per voce). Dominio puro (porta LLM iniettata); endpoint con
guardie + budget.

## Task atomici

```yaml
- id: OGW-401
  title: "Dominio suggestOfferings (placeholder prezzo-vuoto, output validato)"
  macrotask: "suggest-offerings"
  depends_on: []
  objective: >
    Una funzione di dominio che, ricevuta una porta LLM iniettata e un vertical (+ descrizione
    opzionale), ritorna voci d'offerta d'esempio come placeholder a prezzo VUOTO, validate per forma.
    Il prompt chiede esempi tipici del settore, non dati reali dell'attivita'.
  definition_of_done:
    - "suggestOfferings(port, {vertical, description?}) ritorna una lista di voci {name, section?} con price vuoto"
    - "Le voci fuori forma (nome vuoto, campi oltre i tetti) sono scartate dalla validazione"
    - "Nessuna voce restituita porta un prezzo valorizzato (placeholder a prezzo vuoto)"
  acceptance_criteria:
    - id: AC-401-1
      given: "un vertical e una porta LLM finta che propone alcune voci"
      when: "si chiama suggestOfferings"
      then: "ritorna almeno una voce con name non vuoto e price vuoto"
    - id: AC-401-2
      given: "una porta LLM finta che propone anche voci fuori forma"
      when: "si chiama suggestOfferings"
      then: "le voci fuori forma sono scartate; restano solo quelle valide"
    - id: AC-401-3
      given: "una porta LLM finta che propone voci con un prezzo valorizzato"
      when: "si chiama suggestOfferings"
      then: "il prezzo e' azzerato/ignorato: nessuna voce proposta porta un prezzo (placeholder, OGW-D2)"
  target_tests:
    - file: "tests/onboarding-suggest-offerings.test.ts"
      covers: [AC-401-1, AC-401-2, AC-401-3]
  security_notes:
    - "Input = vertical (enum) + descrizione opzionale; output = placeholder editabili, mai dati reali dell'attivita'"
    - "Anti-invenzione strutturale: prezzo vuoto + conferma per-voce a valle (P2-D7)"
  out_of_scope:
    - "L'endpoint, la UI e la conferma per-voce (OGW-402)"

- id: OGW-402
  title: "Endpoint suggerisci-offerte (guardie + budget) + UI con conferma per-voce"
  macrotask: "suggest-offerings"
  depends_on: [OGW-401, OGW-102, OGW-202]
  objective: >
    Esporre suggestOfferings dietro guardie + budget AI; nell'OfferingsEditor i suggerimenti
    compaiono come placeholder etichettati, e ciascuno entra nell'editor SOLO su conferma per-voce.
  definition_of_done:
    - "Endpoint con guardie condivise + checkAiBudget prima / recordAiUsage dopo successo (429 al cap)"
    - "UI: i suggerimenti sono mostrati come placeholder 'esempio', a prezzo vuoto"
    - "Ogni voce entra nell'editor solo su clic di conferma; le non confermate non entrano; scarto libero"
    - "Il catch dell'endpoint LOGGA la causa reale (no 502 opaco)"
  acceptance_criteria:
    - id: AC-402-1
      given: "un sito sotto il budget AI"
      when: "l'endpoint suggerisce le offerte con successo"
      then: "risponde 200 con i suggerimenti e il contatore d'uso incrementa di uno"
    - id: AC-402-2
      given: "un sito che ha raggiunto il cap AI"
      when: "colpisce l'endpoint"
      then: "risponde 429 senza chiamare il modello e senza incrementare"
    - id: AC-402-3
      given: "un elenco di suggerimenti mostrato nell'editor"
      when: "l'utente conferma una voce e ne lascia altre"
      then: "solo la voce confermata entra nelle offerte; le non confermate non entrano nel brief"
    - id: AC-402-4
      given: "una richiesta senza header same-origin o su un sito non del chiamante"
      when: "colpisce l'endpoint"
      then: "e' rifiutata dalle guardie, senza chiamare il modello"
  target_tests:
    - file: "tests/onboarding-suggest-offerings-route.test.ts"
      covers: [AC-402-1, AC-402-2, AC-402-4]
    - file: "tests/onboarding-suggest-offerings-ui.test.tsx"
      covers: [AC-402-3]
  security_notes:
    - "Guardie condivise (same-origin/byte + identita/proprieta P1-D21); budget consume-on-success (OGW-102)"
    - "Conferma per-voce: nessun suggerimento auto-inserito nel brief (P2-D7); catch che logga"
  out_of_scope:
    - "L'integrazione nel wizard a step (OGW-502)"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` — exit 0.
- **Confine checkpoint**: unit dominio (doppio LLM) + route + UI; mutazione: auto-inserire i
  suggerimenti senza conferma → AC-402-3 rosso; proporre un prezzo → AC-401-3 rosso.

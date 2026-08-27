# 11-domain-ui — Macrotask `domain-ui`

> La UI "Dominio personalizzato": la **sezione** con stato/istruzioni/azioni (DOM-501) e il **gate
> Pro/Free** (DOM-502). Unico macrotask con **gate visivo umano** (come `billing-ui` in Fase 1).

## Task atomici

```yaml
- id: DOM-501
  title: "Sezione 'Dominio personalizzato': stato + istruzioni DNS copiabili + Verifica/Scollega (escaping)"
  macrotask: "domain-ui"
  depends_on: [DOM-311, DOM-321, DOM-131]
  objective: >
    Costruire la sezione per un Pro: form hostname, elenco record DNS (da dnsInstructionsFor) copiabili,
    badge di stato (pending/verifying/active/error), pulsanti Verifica (POST /verify) e Scollega (POST
    /disconnect). Stato caricato server-side; azioni via gli endpoint del macrotask domain-connect/
    verify-disconnect. Host reso sempre come testo con escaping (mai innerHTML/href non sanificato).
  definition_of_done:
    - "Componente in src/ui/domains/ montato nell'editor/dashboard del sito, dietro identità+proprietà"
    - "Mostra i record DNS (type/name/value) copiabili e lo stato del collegamento in chiaro"
    - "Verifica -> POST /api/domains/verify; Scollega -> POST /api/domains/disconnect; lo stato si aggiorna dall'esito server"
    - "host/valori resi come testo con escaping, mai innerHTML né href interpolato non sanificato"
  acceptance_criteria:
    - id: AC-501-1
      given: "un utente Pro con un collegamento 'verifying' per il sito S"
      when: "apre la sezione Dominio personalizzato"
      then: "vede i record DNS attesi e lo stato 'in verifica' in chiaro"
    - id: AC-501-2
      given: "un utente Pro con un collegamento 'pending'"
      when: "preme Verifica"
      then: "viene invocato POST /api/domains/verify e lo stato mostrato riflette l'esito"
    - id: AC-501-3
      given: "un utente Pro con un collegamento 'active'"
      when: "preme Scollega"
      then: "viene invocato POST /api/domains/disconnect e la sezione torna a 'nessun dominio collegato'"
    - id: AC-501-4
      given: "un hostname con caratteri pericolosi per il markup"
      when: "la sezione mostra l'host"
      then: "è reso come testo con escaping, mai iniettato in innerHTML/href non sanificato"
  target_tests:
    - file: "tests/ui-domain-section.test.tsx"
      covers: [AC-501-1, AC-501-2, AC-501-3, AC-501-4]
  security_notes:
    - "A05:2025 XSS/escaping — l'hostname è input non fidato: solo testo con escaping; mai innerHTML/href non sanificato (invariante di progetto)"
    - "A01:2025 — la sezione è dietro identità+proprietà; le azioni passano dagli endpoint guardati (la UI non scrive lo stato)"
  out_of_scope:
    - "Il gate Free/CTA upgrade (DOM-502)"

- id: DOM-502
  title: "Gate visivo Pro: Free vede la CTA 'Passa a Pro' al posto del form"
  macrotask: "domain-ui"
  depends_on: [DOM-501]
  objective: >
    Condizionare la sezione all'entitlement letto dal server: Pro => form (DOM-501); Free => card di
    upgrade con CTA verso la pagina Abbonamento (Fase 1), senza form né azioni. Coerente con billing-ui.
  definition_of_done:
    - "La sezione legge getAccountEntitlement server-side: custom_domain=true => form; false => card upgrade con link alla pagina Abbonamento"
    - "Il ramo Free NON monta form né pulsanti (nessuna azione dominio disponibile)"
    - "la decisione è server-side, non un flag dal client"
  acceptance_criteria:
    - id: AC-502-1
      given: "un account Pro (custom_domain=true)"
      when: "apre la sezione Dominio personalizzato"
      then: "vede il form di collegamento, non la CTA di upgrade"
    - id: AC-502-2
      given: "un account Free (custom_domain=false)"
      when: "apre la sezione Dominio personalizzato"
      then: "vede la card 'Passa a Pro' con link alla pagina Abbonamento e nessun form/pulsante"
    - id: AC-502-3
      given: "la resa della sezione"
      when: "si ispeziona da dove viene la decisione Pro/Free"
      then: "deriva dall'entitlement server (getAccountEntitlement), non da un flag del client"
  target_tests:
    - file: "tests/ui-domain-gate.test.tsx"
      covers: [AC-502-1, AC-502-2, AC-502-3]
  security_notes:
    - "A01:2025 — gate visivo coerente col gate server (DOM-301): la UI non è l'unica difesa ma non mostra un form inerte al Free; entitlement dal server"
  out_of_scope:
    - "Il flusso di pagamento/upgrade (pagina Abbonamento, Fase 1)"
```

## Self-check

- **Gate visivo umano** (come `billing-ui`): rivedere stato/istruzioni/CTA prima del merge.
  **Checkpoint**: azioni via endpoint guardati; entitlement server; escaping host. **Mutazione**: host
  via `innerHTML` → AC-501-4 rosso; form mostrato al Free → AC-502-2 rosso.

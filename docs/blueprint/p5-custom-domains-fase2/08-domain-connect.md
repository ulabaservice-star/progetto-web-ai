# 08-domain-connect — Macrotask `domain-connect`

> L'endpoint `POST /api/domains/connect`, costruito in tre fette test-first: la **fetta auth**
> (guardie + gate Pro, DOM-301), la **fetta logica** (valida host + crea pending + addDomain, DOM-302),
> e l'**auto-www** (collega apex+www insieme, DOM-303, R3).

## Task atomici

```yaml
- id: DOM-301
  title: "POST /connect — request-guard + route-guards (proprietà sito) + gate custom_domain server"
  macrotask: "domain-connect"
  depends_on: [DOM-221]
  objective: >
    Stabilire la fetta di sicurezza dell'endpoint: same-origin + limite byte (request-guard), utente
    autenticato proprietario del site_id (route-guards), e gate entitlement custom_domain letto DAL
    SERVER (getAccountEntitlement, Fase 1). L'accountId deriva dal sito posseduto, mai dal body. Un
    Free o un non-proprietario è respinto QUI, prima di ogni logica.
  definition_of_done:
    - "Route POST src/app/api/domains/connect/route.ts dietro request-guard (same-origin + byte) e route-guards (autenticato + proprietario del site_id)"
    - "getAccountEntitlement(accountId).limits.custom_domain !== true => 403 JSON (mai redirect); accountId dal sito posseduto"
    - "utente non proprietario del site_id => respinto (403/404) prima di qualunque scrittura"
  acceptance_criteria:
    - id: AC-301-1
      given: "un utente Free (custom_domain=false) proprietario del sito S"
      when: "chiama POST /api/domains/connect con un host valido"
      then: "risponde 403 e nessuna riga site_domains viene creata (gate server)"
    - id: AC-301-2
      given: "un utente che NON possiede il sito S"
      when: "chiama POST /api/domains/connect per S"
      then: "è respinto dalle guardie (403/404), nessuna scrittura"
    - id: AC-301-3
      given: "una richiesta cross-origin o oltre il limite byte"
      when: "colpisce l'endpoint"
      then: "è respinta da request-guard (same-origin/byte), come gli altri POST del progetto"
  target_tests:
    - file: "tests/api-domains-connect-guard.test.ts"
      covers: [AC-301-1, AC-301-2, AC-301-3]
  security_notes:
    - "A01:2025 authz — gate custom_domain letto dal server; accountId dal sito posseduto, mai dal body (no IDOR); route-guards proprietà del site_id"
    - "A01:2025 CSRF/same-origin — request-guard sull'endpoint mutante"
  out_of_scope:
    - "La validazione host e la creazione della riga (DOM-302)"

- id: DOM-302
  title: "POST /connect — valida host + crea 'pending' (writer) + addDomain (porta) + idempotenza"
  macrotask: "domain-connect"
  depends_on: [DOM-301, DOM-111, DOM-112, DOM-131, DOM-202, DOM-222]
  objective: >
    Aggiungere la logica dell'endpoint (dietro la fetta auth di DOM-301): normalizeHostname +
    classifyHostname (invalid/reserved => 422), chiamata addDomain sulla porta, creazione della riga
    'pending' con verification_token via il writer, e risposta con le istruzioni DNS (dnsInstructionsFor
    composte con l'eventuale challenge del provider, R1). Idempotente su ri-invio dello stesso host.
  definition_of_done:
    - "Host validato con normalizeHostname+classifyHostname; ok:false => 422 con la reason; nessuna scrittura"
    - "addDomain chiamato sulla porta; createPendingDomain crea la riga 'pending' con token e provider_domain_id"
    - "risposta 200 con le istruzioni DNS (dnsInstructionsFor + verification[] del provider, R1)"
    - "idempotente: ri-collegare lo stesso host per lo stesso sito non duplica righe (UNIQUE) né ricrea il token se in corso"
  acceptance_criteria:
    - id: AC-302-1
      given: "un utente Pro proprietario del sito S che invia un hostname valido nuovo"
      when: "chiama POST /api/domains/connect"
      then: "risponde 200 con le istruzioni DNS e una riga 'pending' per (S, host) esiste"
    - id: AC-302-2
      given: "un utente Pro che invia un host riservato o malformato"
      when: "chiama POST /api/domains/connect"
      then: "risponde 422 con la reason e nessuna riga viene creata"
    - id: AC-302-3
      given: "un utente Pro che re-invia lo stesso host valido già 'pending' per lo stesso sito"
      when: "chiama di nuovo POST /api/domains/connect"
      then: "resta una sola riga (nessun duplicato), risposta idempotente"
  target_tests:
    - file: "tests/api-domains-connect-logic.test.ts"
      covers: [AC-302-1, AC-302-2, AC-302-3]
  security_notes:
    - "A05:2025 validazione — hostname non fidato passa da normalize/classify prima di DB/provider; reserved bloccati (DOM-D7)"
    - "R7 — la scrittura 'pending' usa il writer service_role confinato (DOM-222)"
  out_of_scope:
    - "L'auto-www (DOM-303); la transizione ad 'active' (domain-verify)"

- id: DOM-303
  title: "POST /connect — auto-www: collega apex + www.<apex> insieme (companion), idempotente"
  macrotask: "domain-connect"
  depends_on: [DOM-302, DOM-121]
  objective: >
    Quando l'host collegato è un apex, collegare nello stesso passaggio anche il companion www
    (companionHostname), creando il secondo 'pending' che passa dalle stesse validazione/guardie.
    Per un subdomain nessun companion. Idempotente: ricollegare non duplica il www.
  definition_of_done:
    - "Se classifyHostname => 'apex', l'endpoint collega anche companionHostname (www.<apex>) con lo stesso flusso (validato, pending, addDomain)"
    - "Se 'subdomain' => nessun companion collegato"
    - "idempotente: righe apex e www non duplicate su ri-invio; la risposta elenca entrambi i collegamenti e le rispettive istruzioni DNS"
  acceptance_criteria:
    - id: AC-303-1
      given: "un utente Pro che collega l'apex 'iltuobar.it'"
      when: "chiama POST /api/domains/connect"
      then: "esistono DUE righe 'pending': 'iltuobar.it' (apex) e 'www.iltuobar.it' (subdomain)"
    - id: AC-303-2
      given: "un utente Pro che collega il subdomain 'menu.iltuobar.it'"
      when: "chiama POST /api/domains/connect"
      then: "esiste UNA sola riga (nessun companion per un sottodominio)"
    - id: AC-303-3
      given: "un apex già collegato con il suo www"
      when: "si re-invia il connect dell'apex"
      then: "restano due righe (apex+www), nessun duplicato (idempotente)"
  target_tests:
    - file: "tests/api-domains-connect-www.test.ts"
      covers: [AC-303-1, AC-303-2, AC-303-3]
  security_notes:
    - "Il companion passa dalle stesse validazione/guardie/gate dell'host principale: nessun host non validato entra in un collegamento (A05:2025)"
  out_of_scope:
    - "Redirect www->apex a livello HTTP (fuori Fase 2: entrambi servono lo stesso sito via routing)"
```

## Self-check

- **Checkpoint**: guardie condivise + gate `custom_domain` server; provider **fake** iniettato.
  **Mutazione**: gate entitlement rimosso → AC-301-1 rosso; accountId dal body → AC-301-2 rosso;
  companion creato anche per subdomain → AC-303-2 rosso.

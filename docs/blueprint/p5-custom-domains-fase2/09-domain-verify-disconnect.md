# 09-domain-verify-disconnect — Macrotask `domain-verify-disconnect`

> Le due transizioni di stato guidate dal provider: **verify** (DOM-311, pending→active solo a DNS
> confermato) e **disconnect** (DOM-321, scollegamento volontario). Endpoint distinti, un micro-task
> ciascuno.

## Task atomici

```yaml
- id: DOM-311
  title: "POST /verify — getVerificationStatus (porta) => active/verifying/error; idempotente; solo proprietario"
  macrotask: "domain-verify-disconnect"
  depends_on: [DOM-302, DOM-222, DOM-202]
  objective: >
    Per un collegamento del proprietario, chiamare getVerificationStatus sulla porta e transizionare lo
    stato via il writer: 'verified' => 'active' (+verified_at); 'pending' => 'verifying'; 'misconfigured'
    => 'error'+detail. È l'UNICO punto che porta un dominio ad 'active' (server-side), coerente con
    l'assenza di UPDATE authenticated. Dietro le stesse guardie + gate custom_domain.
  definition_of_done:
    - "Route POST src/app/api/domains/verify/route.ts dietro request-guard + route-guards (proprietà del collegamento) + gate custom_domain"
    - "getVerificationStatus(host): 'verified' -> setDomainStatus 'active'+verified_at; 'pending' -> 'verifying'; 'misconfigured' -> 'error'+detail"
    - "idempotente: verificare un dominio già 'active' resta 'active' (no-op); un non-proprietario è respinto"
  acceptance_criteria:
    - id: AC-311-1
      given: "un collegamento 'pending' del proprietario e un provider (fake) che risponde 'verified'"
      when: "chiama POST /api/domains/verify"
      then: "lo status passa ad 'active' con verified_at e il dominio diventa instradabile"
    - id: AC-311-2
      given: "un collegamento 'pending' e un provider che risponde 'pending'"
      when: "chiama POST /api/domains/verify"
      then: "lo status resta 'verifying' e il dominio NON è instradabile (nessuna attivazione prematura)"
    - id: AC-311-3
      given: "un collegamento 'pending' e un provider che risponde 'misconfigured'"
      when: "chiama POST /api/domains/verify"
      then: "lo status diventa 'error' con un detail, senza attivazione"
    - id: AC-311-4
      given: "un collegamento già 'active'"
      when: "chiama di nuovo POST /api/domains/verify"
      then: "resta 'active' (idempotente, no-op)"
    - id: AC-311-5
      given: "un utente che non possiede il collegamento"
      when: "chiama POST /api/domains/verify per quell'host"
      then: "è respinto dalle guardie e nessuna transizione avviene"
  target_tests:
    - file: "tests/api-domains-verify.test.ts"
      covers: [AC-311-1, AC-311-2, AC-311-3, AC-311-4, AC-311-5]
  security_notes:
    - "A01:2025 anti-hijack (DOM-D4) — nessun percorso porta ad 'active' senza 'verified' dal provider; unico writer dello stato attivo (server)"
    - "A01:2025 proprietà — solo il proprietario verifica il proprio collegamento (route-guards); R7 transizione via writer service_role"
  out_of_scope:
    - "Il polling automatico (l'UI richiama verify); lo scollegamento (DOM-321)"

- id: DOM-321
  title: "POST /disconnect — removeDomain (porta) + rimozione riga; idempotente; sito resta pubblicato"
  macrotask: "domain-verify-disconnect"
  depends_on: [DOM-302, DOM-222, DOM-202]
  objective: >
    Per il proprietario, scollegare volontariamente un dominio: removeDomain sulla porta + rimozione/
    marcatura della riga. Distinto dalla sospensione da downgrade (reversibile): qui l'utente rinuncia.
    Il sito su /s/<slug> resta pubblicato (si rimuove solo il legame host). Idempotente.
  definition_of_done:
    - "Route POST src/app/api/domains/disconnect/route.ts dietro request-guard + route-guards (proprietà del collegamento)"
    - "removeDomain(host) sulla porta + rimozione della riga del proprietario; il sito /s/<slug> resta pubblicato"
    - "idempotente: scollegare un host inesistente/già scollegato risponde 200 senza errore"
  acceptance_criteria:
    - id: AC-321-1
      given: "un collegamento 'active' del proprietario"
      when: "chiama POST /api/domains/disconnect"
      then: "removeDomain è chiamato e la riga non è più instradabile; il sito /s/<slug> resta pubblicato"
    - id: AC-321-2
      given: "un utente che non possiede il collegamento"
      when: "chiama POST /api/domains/disconnect per quell'host"
      then: "è respinto dalle guardie, nessuna rimozione"
    - id: AC-321-3
      given: "un host già scollegato o inesistente per l'utente"
      when: "chiama POST /api/domains/disconnect"
      then: "risponde 200 idempotente senza errore"
  target_tests:
    - file: "tests/api-domains-disconnect.test.ts"
      covers: [AC-321-1, AC-321-2, AC-321-3]
  security_notes:
    - "A01:2025 proprietà — solo il proprietario scollega il proprio dominio; R7 chiamata/scrittura via service_role confinato"
    - "Non distruttivo sul sito — disconnect rimuove SOLO il legame host, mai la pubblicazione del sito (distinto dal downgrade reversibile)"
  out_of_scope:
    - "La sospensione automatica in downgrade (macrotask domain-downgrade)"
```

## Self-check

- **Checkpoint**: endpoint dietro guardie; provider **fake** iniettato; attivazione solo a `verified`.
  **Mutazione**: attivazione senza `verified` → AC-311-2 rosso; disconnect che spubblica il sito →
  AC-321-1 rosso.

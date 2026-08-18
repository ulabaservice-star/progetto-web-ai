# 01-ai-usage-guard — Macrotask `ai-usage-guard`

> Modulo del blueprint `onboarding-guided-wizard`. Fondativo: il **controllo di spesa** dei tre
> pulsanti AI on-demand (import / genera-descrizione / suggerisci-offerte). Nessuna dipendenza.

## Obiettivo del macrotask

Impedire che l'assistenza AI dell'onboarding diventi un vettore di costo non governato (OGW-D4).
Un **contatore d'uso AI per-sito** persistito (RLS owner-only) + un helper deterministico che
**nega** oltre un tetto (429) e oltre una frequenza (rate-limit a finestra), incrementando **solo
su chiamata riuscita**. Nessun orologio nel dominio: la finestra temporale è iniettata dal call-site.

## Task atomici

```yaml
- id: OGW-101
  title: "Contatore d'uso AI per-sito (migrazione + RLS owner-only)"
  macrotask: "ai-usage-guard"
  depends_on: []
  objective: >
    Creare la tabella che conta gli usi AI dell'onboarding per sito, isolata per proprietario
    via RLS (nessun accesso cross-tenant, nessun accesso anon), con FK al sito.
  definition_of_done:
    - "Migrazione supabase che crea la tabella onboarding_ai_usage (site_id, account_id, used_at, kind)"
    - "RLS abilitata con policy owner-only (account proprietario del sito), nessun USING(true)"
    - "FK composita (account_id, site_id) -> sites; nessun GRANT ad anon"
  acceptance_criteria:
    - id: AC-101-1
      given: "il proprietario del sito A (client con sessione, RLS attiva)"
      when: "inserisce una riga d'uso AI per il sito A"
      then: "la riga esiste con site_id = A e account_id del proprietario"
    - id: AC-101-2
      given: "un utente del tenant B"
      when: "tenta di leggere o scrivere il contatore del sito A"
      then: "riceve insieme vuoto / errore RLS (isolamento per tenant)"
    - id: AC-101-3
      given: "il ruolo Postgres anon (nessuna sessione)"
      when: "tenta di leggere onboarding_ai_usage"
      then: "non ottiene alcuna riga (nessun GRANT/policy anon)"
  target_tests:
    - file: "tests/onboarding-ai-usage-rls.test.ts"
      covers: [AC-101-1, AC-101-2, AC-101-3]
  security_notes:
    - "RLS isolation per tenant (categoria killer Supabase, A01:2025): owner-only account-esplicito, mai USING(true)"
    - "Nessun service_role nel percorso utente; nessun GRANT ad anon sul contatore"
  out_of_scope:
    - "Il ledger crediti P5 (billing) — questo è solo un contatore anti-abuso"

- id: OGW-102
  title: "Helper checkAndConsumeAiBudget: cap -> 429, rate-limit a finestra, consume-on-success"
  macrotask: "ai-usage-guard"
  depends_on: [OGW-101]
  objective: >
    Esporre il gating della spesa AI: una funzione di controllo (allow/deny con motivo: cap o
    rate-limit) e una di consumo (incrementa il contatore del sito). Deterministica: il tempo
    corrente e i tetti sono ingressi, non letti da un orologio nel dominio (nessun Date.now).
  definition_of_done:
    - "checkAiBudget(siteId, now, limits) ritorna {allow} oppure {deny, reason: 'cap'|'rate'}"
    - "recordAiUsage(siteId, kind) incrementa il contatore per-sito di uno"
    - "L'endpoint consuma SOLO dopo una chiamata AI riuscita (consume-on-success), non prima"
  acceptance_criteria:
    - id: AC-102-1
      given: "un sito con usi totali sotto il cap e nessuna raffica nella finestra"
      when: "si chiama checkAiBudget"
      then: "ritorna allow"
    - id: AC-102-2
      given: "un sito che ha raggiunto il cap totale di usi AI"
      when: "si chiama checkAiBudget"
      then: "ritorna deny con reason 'cap' (nessun incremento avviene nel check)"
    - id: AC-102-3
      given: "un sito con troppe chiamate entro la finestra di rate-limit (finestra iniettata come 'now')"
      when: "si chiama checkAiBudget"
      then: "ritorna deny con reason 'rate' — deterministico, senza orologio reale"
    - id: AC-102-4
      given: "una chiamata AI andata a buon fine"
      when: "si chiama recordAiUsage"
      then: "il contatore d'uso del sito aumenta esattamente di uno"
  target_tests:
    - file: "tests/onboarding-ai-budget.test.ts"
      covers: [AC-102-1, AC-102-2, AC-102-3, AC-102-4]
  security_notes:
    - "Per-sito, proprieta accertata a monte (route-guards, P1-D21); il conteggio non e' un canale cross-tenant"
    - "Determinismo: 'now' e i tetti sono iniettati (no Date.now/Math.random nel dominio)"
  out_of_scope:
    - "Il rate-limit distribuito d'infrastruttura (edge) — qui basta il per-sito"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Confine checkpoint**: RLS provata a runtime (`rls_check` + test); helper deterministico
  (finestra iniettata). Mutazione: `USING(true)` sulla policy → RLS rossa; `deny`→`allow` al cap → test rosso.

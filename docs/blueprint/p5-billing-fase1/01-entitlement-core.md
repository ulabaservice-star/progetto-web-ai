# 01-entitlement-core — Macrotask `entitlement-core`

> Modulo del blueprint `p5-billing-fase1`. **Cuore tecnico**, nessuna dipendenza: la tabella
> `subscriptions` (RLS owner-only, sola lettura client), i limiti di piano puri e testabili, la
> funzione pura `resolveEntitlement`, e il reader server-side unico da cui i gate leggono
> l'entitlement. Tutto il resto del billing poggia qui.

## Obiettivo del macrotask

L'abbonamento vive sull'**account** (non sul sito): il n° di siti è una feature del piano e `accounts`
è già l'entità di tenancy. Lo stato del piano è **fidato solo dal server** (webhook): il client lo
**legge**, non lo scrive. I **limiti** stanno in codice puro (cambiarli è un deploy, non una
migrazione); l'entitlement è una **funzione pura** della subscription + `now` iniettato (assenza o
scadenza ⇒ `free`). Un **reader** server-side unico centralizza "qual è il piano di questo account".

## Task atomici

```yaml
- id: BIL-101
  title: "Tabella subscriptions (RLS SELECT owner-only, nessuna scrittura client) + GRANT"
  macrotask: "entitlement-core"
  depends_on: []
  objective: >
    Creare la tabella account-scoped che rappresenta l'abbonamento di un account, isolata per
    proprietario via RLS in SOLA LETTURA: il client legge il proprio piano ma non lo scrive mai
    (l'entitlement lo muove solo il webhook, service_role, fuori dal percorso utente). Modello
    anti-self-grant, gemello di onboarding_ai_usage ma con scritture client azzerate del tutto.
  definition_of_done:
    - "Migrazione supabase che crea public.subscriptions (account_id, plan, status, provider, provider_subscription_id, provider_customer_id, current_period_end, created_at, updated_at)"
    - "plan CHECK in ('free','pro','business'); status CHECK in ('active','trialing','past_due','canceled')"
    - "FK account_id -> public.accounts(id) on delete cascade; UNIQUE su account_id (una subscription per account)"
    - "RLS abilitata con UNA sola policy SELECT owner-only (public.is_account_member(account_id)); NESSUNA policy INSERT/UPDATE/DELETE per authenticated"
    - "revoke all + GRANT SELECT ad authenticated; nessun GRANT ad anon; scritture solo a service_role"
  acceptance_criteria:
    - id: AC-101-1
      given: "la migrazione è applicata sul DB di test"
      when: "si interroga il catalogo pg per public.subscriptions"
      then: "relrowsecurity = true ed esiste esattamente una policy, di comando SELECT"
    - id: AC-101-2
      given: "il proprietario dell'account A con una riga subscription (piantata via service_role)"
      when: "legge subscriptions col client di sessione (RLS attiva)"
      then: "vede la propria riga con account_id = A"
    - id: AC-101-3
      given: "un utente del tenant B"
      when: "tenta di leggere la subscription dell'account A"
      then: "riceve insieme vuoto (RLS isola per tenant)"
    - id: AC-101-4
      given: "il proprietario dell'account A col client di sessione (authenticated)"
      when: "tenta INSERT/UPDATE/DELETE sulla propria riga subscription"
      then: "l'operazione è negata dalla RLS (nessuna policy di scrittura per authenticated)"
    - id: AC-101-5
      given: "il ruolo Postgres anon (nessuna sessione)"
      when: "tenta di leggere subscriptions"
      then: "non ottiene alcuna riga (nessun GRANT/policy anon)"
  target_tests:
    - file: "tests/subscriptions-rls.test.ts"
      covers: [AC-101-1, AC-101-2, AC-101-3, AC-101-4, AC-101-5]
  security_notes:
    - "A01:2025 tenancy — RLS owner-only con account_id ESPLICITO nel testo (auditabile da rls_check, R4); mai USING(true)"
    - "Integrità entitlement (BIL-D2) — nessuna policy di scrittura client: il piano lo muove SOLO il webhook (service_role, fuori dal percorso utente); anti self-grant/self-reset come onboarding_ai_usage"
    - "R7 — nessun service_role nel percorso utente; nessun GRANT ad anon; revoke all annulla anche REFERENCES/TRIGGER/TRUNCATE di default"
  out_of_scope:
    - "site_domains e dominio custom (Fase 2)"

- id: BIL-102
  title: "PLAN_LIMITS puri + resolveEntitlement puro (now iniettato, default free)"
  macrotask: "entitlement-core"
  depends_on: []
  objective: >
    Definire i limiti per piano come costanti pure e versionate (n° siti, cap AI, flag
    seo_advanced/no_badge/custom_domain) e una funzione pura che risolve l'entitlement effettivo da
    una subscription e da un istante 'now' iniettato: nessun Date.now interno, così la logica è
    deterministica e testabile.
  definition_of_done:
    - "PLAN_LIMITS = { free, pro } (business dichiarato ma Oltre-P5) con: max_sites, ai_monthly_cap, seo_advanced:boolean, no_badge:boolean, custom_domain:boolean"
    - "resolveEntitlement(subscription | null, now) -> { plan, limits } funzione pura, nessun accesso a orologio/rete/DB"
    - "subscription assente => free; status non-attivo o current_period_end < now (fuori grazia) => free"
  acceptance_criteria:
    - id: AC-102-1
      given: "subscription null"
      when: "si chiama resolveEntitlement(null, now)"
      then: "ritorna plan 'free' con i limiti free (max_sites=1, no_badge=false, seo_advanced=false)"
    - id: AC-102-2
      given: "una subscription pro con status 'active' e current_period_end nel futuro rispetto a now"
      when: "si chiama resolveEntitlement"
      then: "ritorna plan 'pro' con i limiti pro (max_sites=5, no_badge=true, seo_advanced=true)"
    - id: AC-102-3
      given: "una subscription pro con status 'canceled' (o current_period_end < now)"
      when: "si chiama resolveEntitlement"
      then: "ritorna plan 'free' (l'entitlement decade all'assenza di piano attivo)"
    - id: AC-102-4
      given: "la stessa subscription e due valori di now diversi"
      when: "si chiama resolveEntitlement due volte senza altri input"
      then: "l'esito dipende SOLO dagli argomenti (funzione pura, nessun Date.now interno)"
  target_tests:
    - file: "tests/billing-resolve-entitlement.test.ts"
      covers: [AC-102-1, AC-102-2, AC-102-3, AC-102-4]
  security_notes:
    - "Determinismo (BIL-D3) — now iniettato, nessun Date.now/Math.random nel dominio; PLAN_LIMITS puri => cambiarli è un deploy, non una migrazione"
    - "Fail-safe — ogni stato non riconducibile a un piano attivo degrada a 'free', mai a un piano superiore per errore"
  out_of_scope:
    - "La lettura della subscription dal DB (BIL-103) — qui la funzione è pura sui suoi argomenti"

- id: BIL-103
  title: "Reader server-side getAccountEntitlement(accountId) sotto RLS"
  macrotask: "entitlement-core"
  depends_on: [BIL-101, BIL-102]
  objective: >
    Esporre l'unico punto server-side da cui il resto del sistema chiede "qual è il piano di questo
    account": legge la subscription col client di sessione (RLS attiva, mai service_role nel percorso
    utente), applica resolveEntitlement con un now reale al confine, e ritorna l'entitlement. Assenza
    di riga o guasto non-fatale => free (fail-safe).
  definition_of_done:
    - "getAccountEntitlement(accountId) legge subscriptions col client di sessione e ritorna { plan, limits }"
    - "L'istante now è preso al confine (call-site) e passato a resolveEntitlement, non letto dentro la funzione pura"
    - "Nessuna riga => free; il reader non lancia sul percorso felice mancante"
  acceptance_criteria:
    - id: AC-103-1
      given: "un account con una subscription pro attiva (client di sessione del proprietario)"
      when: "si chiama getAccountEntitlement(accountId)"
      then: "ritorna plan 'pro' con i limiti pro"
    - id: AC-103-2
      given: "un account senza alcuna riga subscription"
      when: "si chiama getAccountEntitlement(accountId)"
      then: "ritorna plan 'free' (default, nessun errore)"
    - id: AC-103-3
      given: "il reader eseguito nel percorso utente"
      when: "si ispeziona quale client Supabase usa"
      then: "usa il client di sessione (RLS), mai la service_role key"
  target_tests:
    - file: "tests/billing-get-account-entitlement.test.ts"
      covers: [AC-103-1, AC-103-2, AC-103-3]
  security_notes:
    - "R7/A01 — lettura col client di sessione (RLS), mai service_role nel percorso utente; l'account non arriva dal client come fonte di verità del permesso"
    - "Fail-safe — assenza/guasto di lettura => free, mai un piano superiore per errore (nessun fail-open)"
  out_of_scope:
    - "L'applicazione dei gate (plan-gates, modulo 03) — qui si LEGGE l'entitlement, non lo si applica"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Confine checkpoint**: RLS di `subscriptions` provata (`rls_check` statico: 1 sola policy SELECT,
  nessuna scrittura authenticated, no anon; runtime dove il DB di test c'è). Dominio puro testato per
  valore. Mutazione: aggiungere una policy INSERT/UPDATE authenticated → AC-101-4 rosso; `Date.now`
  dentro `resolveEntitlement` → AC-102-4 rosso; default `pro` invece di `free` → AC-102-1/103-2 rossi.

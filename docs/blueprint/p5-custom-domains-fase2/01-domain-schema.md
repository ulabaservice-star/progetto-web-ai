# 01-domain-schema — Macrotask `domain-schema`

> Il modello dati `site_domains` in **una** migrazione, spezzato in due micro-task: la superficie di
> **gestione owner-only** (DOM-101) e la superficie di **lettura pubblica per il routing** (DOM-102).
> Due superfici RLS distinte, testabili a sé. Nessuna dipendenza esterna.

## Task atomici

```yaml
- id: DOM-101
  title: "Migrazione site_domains + RLS gestione owner-only (SELECT/INSERT/DELETE, nessuna UPDATE authenticated)"
  macrotask: "domain-schema"
  depends_on: []
  objective: >
    Creare la tabella public.site_domains con il ciclo di vita del collegamento e la RLS di GESTIONE:
    il proprietario legge/crea/elimina i propri collegamenti ma NON auto-attiva (nessuna UPDATE per
    authenticated: lo stato lo muove il server). Isolamento per account via is_account_member.
  definition_of_done:
    - "Migrazione supabase che crea public.site_domains (id, account_id, site_id, hostname, normalized_hostname, kind, status, verification_token, provider, provider_domain_id, created_at, updated_at, verified_at)"
    - "kind CHECK in ('apex','subdomain'); status CHECK in ('pending','verifying','active','suspended','error')"
    - "UNIQUE su normalized_hostname; FK account_id->accounts(id) e site_id->sites(id) on delete cascade"
    - "RLS abilitata; policy SELECT owner-only + INSERT owner-only + DELETE owner-only (is_account_member(account_id), TO authenticated); NESSUNA policy UPDATE per authenticated"
    - "revoke all + GRANT SELECT/INSERT/DELETE ad authenticated; scritture di stato solo a service_role"
  acceptance_criteria:
    - id: AC-101-1
      given: "la migrazione applicata sul DB di test"
      when: "si interroga il catalogo pg per public.site_domains"
      then: "relrowsecurity = true ed esistono policy SELECT/INSERT/DELETE owner-only e NESSUNA policy UPDATE per authenticated"
    - id: AC-101-2
      given: "il proprietario dell'account A con un collegamento (piantato via service_role)"
      when: "legge site_domains col client di sessione (RLS)"
      then: "vede la propria riga con account_id = A"
    - id: AC-101-3
      given: "un utente del tenant B"
      when: "tenta di leggere i domini dell'account A"
      then: "riceve insieme vuoto (RLS isola per tenant)"
    - id: AC-101-4
      given: "il proprietario col client di sessione (authenticated)"
      when: "tenta UPDATE dello status del proprio collegamento (es. portarlo ad 'active')"
      then: "l'operazione è negata (nessuna policy UPDATE authenticated: l'attivazione la muove il server)"
  target_tests:
    - file: "tests/site-domains-rls-owner.test.ts"
      covers: [AC-101-1, AC-101-2, AC-101-3, AC-101-4]
  security_notes:
    - "A01:2025 tenancy — RLS owner-only con account_id ESPLICITO nel testo policy (rls_check R4); mai USING(true) (R3); TO authenticated esplicito (R5)"
    - "A01:2025 integrità ciclo di vita (DOM-D4/D5) — nessuna UPDATE authenticated: la transizione ad 'active' la muove solo il server; anti self-activation"
    - "R7 — scritture di stato solo a service_role, confinata fuori dal percorso utente"
  out_of_scope:
    - "La lettura pubblica host->slug (DOM-102)"

- id: DOM-102
  title: "Policy SELECT anon sui soli domini attivi + GRANT column-level (superficie di routing)"
  macrotask: "domain-schema"
  depends_on: [DOM-101]
  objective: >
    Aggiungere alla stessa tabella la SOLA lettura di cui ha bisogno l'host-routing (edge, senza
    sessione): una policy SELECT per anon vincolata a status='active', con GRANT column-level sulle
    sole colonne pubbliche (normalized_hostname, public_slug-equivalente). Nessun altro accesso anon.
  definition_of_done:
    - "UNA policy SELECT per anon (TO anon) vincolata a status = 'active'"
    - "GRANT SELECT column-level ad anon sulle sole (normalized_hostname, public_slug o join equivalente); nessun altro GRANT ad anon"
    - "verification_token, account_id e le colonne private NON leggibili da anon; nessun GRANT di scrittura anon"
  acceptance_criteria:
    - id: AC-102-1
      given: "un dominio 'active' e uno 'pending' (piantati via service_role)"
      when: "anon interroga site_domains proiettando (normalized_hostname, public_slug)"
      then: "vede la sola riga 'active'; la 'pending' è filtrata (indistinguibile da inesistente)"
    - id: AC-102-2
      given: "il ruolo anon"
      when: "tenta di leggere verification_token o account_id, o di scrivere"
      then: "è negato (GRANT column-level: solo hostname+slug; nessun GRANT di scrittura anon)"
    - id: AC-102-3
      given: "il catalogo pg dopo la migrazione"
      when: "si contano le policy anon su site_domains"
      then: "esiste esattamente una policy SELECT per anon, vincolata a status='active'"
  target_tests:
    - file: "tests/site-domains-rls-public.test.ts"
      covers: [AC-102-1, AC-102-2, AC-102-3]
  security_notes:
    - "A01:2025 lettura minima (DOM-D6) — anon vede SOLO gli attivi e SOLO hostname+slug; nessun dato privato del tenant; niente USING(true)"
    - "Fail-closed — i non attivi sono indistinguibili da inesistenti per anon (P1-D21), come gli slug non pubblicati"
  out_of_scope:
    - "Il reader applicativo che consuma questa policy (DOM-401)"
```

## Self-check

- **Checkpoint**: `rls_check` statico (SELECT/INSERT/DELETE owner-only, nessuna UPDATE authenticated,
  una SELECT anon-active). **Mutazione**: policy UPDATE authenticated → AC-101-4 rosso; policy anon
  senza `status='active'` → AC-102-1 rosso.

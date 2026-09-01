# 06-waitlist-schema — Macrotask `waitlist-schema`

> Il modello dati `public.waitlist_leads` in **una** migrazione. La superficie RLS più chiusa del
> repo: RLS abilitata + **ZERO policy** per anon/authenticated (più chiuso di owner-only — *nessun*
> owner) + `revoke all` + nessun GRANT ad anon/authenticated. Il client non legge né scrive: solo il
> server via `service_role` (che bypassa la RLS) inserisce. UNIQUE su `normalized_email` per
> l'idempotenza (P6A-D5). Nessuna dipendenza esterna.

## Task atomici

```yaml
- id: PUB-201
  title: "Migrazione waitlist_leads + RLS zero-policy (deny-all anon/authenticated, scrive solo service_role) + UNIQUE normalized_email"
  macrotask: "waitlist-schema"
  depends_on: []
  objective: >
    Creare la tabella public.waitlist_leads che raccoglie i lead anonimi della waitlist con la POSTURA
    di sicurezza più chiusa del repo: RLS abilitata ma NESSUNA policy per anon/authenticated (deny-all
    deliberato, non owner-only: la superficie pubblica non ha owner), revoke all e nessun GRANT ad
    anon/authenticated. Solo il server (service_role, che bypassa la RLS) inserisce. UNIQUE su
    normalized_email rende l'iscrizione idempotente (un duplicato solleva 23505, non una seconda riga).
  definition_of_done:
    - "Migrazione supabase supabase/migrations/<timestamp>_waitlist_leads.sql che crea public.waitlist_leads (id uuid primary key default gen_random_uuid(), email text not null, normalized_email text not null, locale text not null, source text, created_at timestamptz not null default now())"
    - "locale con CHECK (locale in ('it','es')); nessuna colonna per l'IP in chiaro (P6A-D7)"
    - "UNIQUE (normalized_email) per l'idempotenza dell'iscrizione"
    - "alter table ... enable row level security; NESSUNA policy creata per anon o authenticated (deny-all deliberato)"
    - "revoke all on public.waitlist_leads from anon, authenticated, service_role; grant select, insert on public.waitlist_leads to service_role; NESSUN grant ad anon o authenticated"
  acceptance_criteria:
    - id: AC-201-1
      given: "la migrazione applicata sul DB di test"
      when: "si interroga il catalogo pg (pg_class.relrowsecurity e pg_policies) per public.waitlist_leads"
      then: "relrowsecurity = true e il numero di policy che nominano il ruolo anon o authenticated è 0"
    - id: AC-201-2
      given: "un client ANON reale (anon key, nessun sign-in)"
      when: "anon esegue SELECT su waitlist_leads"
      then: "è negato con codice 42501 (nessun GRANT: nessuna colonna pubblica), nessuna riga esposta"
    - id: AC-201-3
      given: "un client ANON reale"
      when: "anon tenta INSERT di un lead in waitlist_leads"
      then: "è negato con codice 42501 (nessun GRANT di scrittura anon) e nessuna riga è scritta"
    - id: AC-201-4
      given: "un client service_role (bypassa la RLS)"
      when: "inserisce un lead con normalized_email 'mario@bar.it', email 'mario@bar.it', locale 'it'"
      then: "la riga esiste (verificata da una lettura service_role indipendente) con normalized_email 'mario@bar.it' e locale 'it'"
    - id: AC-201-5
      given: "un lead con normalized_email 'mario@bar.it' già presente (piantato via service_role)"
      when: "service_role tenta un secondo INSERT con lo stesso normalized_email 'mario@bar.it'"
      then: "l'operazione fallisce con codice 23505 (UNIQUE su normalized_email), nessuna seconda riga"
  target_tests:
    - file: "tests/waitlist-rls.test.ts"
      covers: [AC-201-1, AC-201-2, AC-201-3, AC-201-4, AC-201-5]
  security_notes:
    - "A01:2025 tenancy/esposizione — RLS abilitata + ZERO policy anon/authenticated + revoke all + nessun GRANT ad anon/authenticated: il client non legge né scrive; l'email è PII e non è mai leggibile da anon (42501)"
    - "R2 (RLS-on ⇒ ≥1 policy) NON si applica qui: il deny-all è la POSTURA VOLUTA (l'app non usa mai anon/authenticated su questa tabella); il funzionamento server-side passa solo da service_role e il test RLS DB-reale lo PROVA (anti-placebo)"
    - "R7 — le scritture passano SOLO da service_role, confinato server-side fuori dal percorso utente; R3 — nessuna policy con USING(true) (non esistono policy affatto)"
    - "P6A-D7 — nessuna colonna IP in chiaro; nessun double opt-in in v1 (nessun provider email attivo)"
  out_of_scope:
    - "Il writer applicativo che inserisce via service_role (PUB-211)"
    - "L'endpoint /api/waitlist e l'anti-spam (PUB-231/PUB-232)"
```

## Self-check

- **Checkpoint**: `rls_check` (RLS abilitata su `waitlist_leads`, deny-all senza policy anon/authenticated
  registrato come postura voluta) + il test RLS DB-reale `tests/waitlist-rls.test.ts` sotto client **anon
  reale** (anti-placebo: un oracolo indipendente service_role prova che la tabella NON è vuota, quindi il
  42501/negato è soppressione d'accesso, non assenza di dati).
- **Mutazione**: un `grant insert on public.waitlist_leads to anon` → AC-201-3 rosso; rimuovere il
  `unique (normalized_email)` → AC-201-5 rosso (il secondo insert non solleva più 23505).

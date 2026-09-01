# 07-waitlist-store — Macrotask `waitlist-store`

> Il writer applicativo che inserisce un lead in `waitlist_leads` (PUB-201) via **service_role
> confinato** (`import 'server-only'`), dietro uno **store iniettabile** `WaitlistStore` (gemello di
> `SiteDomainWriteStore`, DOM-222). `insertLead` normalizza l'email (trim + lowercase → `normalized_email`)
> e mappa la unique-violation `23505` a un esito idempotente `'already'` — un secondo invio della stessa
> email non è un errore, è "già in lista". Nessuna scrittura passa mai dal client (P6A-D5).

## Task atomici

```yaml
- id: PUB-211
  title: "src/data/waitlist.ts: writer service_role confinato + store iniettabile; insertLead normalizza email e mappa 23505 -> 'already'"
  macrotask: "waitlist-store"
  depends_on: [PUB-201]
  objective: >
    Introdurre src/data/waitlist.ts con import 'server-only': una funzione insertLead({email, locale,
    source}) che normalizza l'email (trim + lowercase in normalized_email, preservando email come
    inserita) e la scrive via service_role (createAdminClient di default, confinato server-side). Lo
    store WaitlistStore e' INIETTABILE (gemello di SiteDomainWriteStore) cosi' i test usano un fake
    in-memory senza rete. Un secondo inserimento della stessa normalized_email solleva 23505 (UNIQUE,
    PUB-201): insertLead lo INTERCETTA e ritorna { status: 'already' } (idempotente), mai un throw;
    un inserimento nuovo ritorna { status: 'inserted' }.
  definition_of_done:
    - "Nuovo modulo src/data/waitlist.ts con import 'server-only' in testa"
    - "Tipo WaitlistStore iniettabile (gemello di SiteDomainWriteStore) con il metodo di insert usato da insertLead; default costruito su createAdminClient (service_role, src/data/supabase-admin.ts)"
    - "insertLead({ email, locale, source }, store?) normalizza normalized_email = email.trim().toLowerCase() e scrive { email: email.trim(), normalized_email, locale, source }"
    - "unique-violation 23505 intercettata -> ritorna { status: 'already' } senza rilanciare; insert riuscito -> { status: 'inserted' }"
    - "Nessun import di service_role o createAdminClient in moduli 'use client' o nel percorso edge (confinamento server-only)"
  acceptance_criteria:
    - id: AC-211-1
      given: "uno store fake in-memory iniettato e nessun lead presente"
      when: "insertLead({ email: '  Mario@Bar.IT ', locale: 'it', source: 'hero' }, fakeStore)"
      then: "ritorna { status: 'inserted' } e lo store riceve normalized_email = 'mario@bar.it' (trim + lowercase)"
    - id: AC-211-2
      given: "uno store fake che alla insert solleva l'errore Postgres con code '23505' (UNIQUE)"
      when: "insertLead({ email: 'mario@bar.it', locale: 'it', source: 'hero' }, fakeStore)"
      then: "ritorna { status: 'already' } senza propagare l'eccezione"
    - id: AC-211-3
      given: "uno store fake iniettato con una spy sulla insert"
      when: "insertLead(..., fakeStore) viene invocato"
      then: "la spy dello store INIETTATO e' chiamata (non il default createAdminClient), a prova dell'iniettabilita'"
  target_tests:
    - file: "tests/waitlist-store.test.ts"
      covers: [AC-211-1, AC-211-2, AC-211-3]
  security_notes:
    - "R7 — scrittura SOLO via service_role, confinata da import 'server-only' fuori dal percorso utente/edge; nessun client anon/authenticated tocca la tabella (RLS zero-policy, PUB-201)"
    - "A07:2025 — nessun segreto nel sorgente: la service_role key arriva da env via createAdminClient; nei test lo store fake evita ogni chiave reale (verde senza segreti)"
    - "P6A-D7 — insertLead NON riceve ne' scrive alcun IP; scrive solo email/normalized_email/locale/source"
  out_of_scope:
    - "L'endpoint /api/waitlist, le guardie e l'anti-spam (PUB-231/PUB-232)"
    - "La validazione della forma dell'email (zod nell'endpoint, PUB-232)"
```

## Self-check

- **Checkpoint**: `hygiene` (nuovo file clone-free; store iniettabile gemello di DOM-222 = pattern già
  in baseline), `security` (`rls_check` invariato: nessuna nuova policy; service_role confinato),
  `suite` + `AC` (`tests/waitlist-store.test.ts` con store fake, nessuna rete).
- **Mutazione**: togliere il `toLowerCase()` dalla normalizzazione → AC-211-1 rosso; ri-lanciare
  l'errore invece di mappare `23505` → AC-211-2 rosso (throw invece di `'already'`); usare il default
  `createAdminClient` ignorando lo store iniettato → AC-211-3 rosso (spy non chiamata).

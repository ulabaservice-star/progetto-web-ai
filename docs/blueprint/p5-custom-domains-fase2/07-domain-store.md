# 07-domain-store — Macrotask `domain-store`

> Il data layer di `site_domains`, spezzato in **reader owner-side** (DOM-221, sotto RLS) e **writer
> di stato** (DOM-222, service_role confinato). Estratto dagli endpoint così questi restano sottili.

## Task atomici

```yaml
- id: DOM-221
  title: "Reader owner-side listSiteDomains(siteId) / getDomain(host) sotto RLS (client di sessione)"
  macrotask: "domain-store"
  depends_on: [DOM-101]
  objective: >
    Esporre le letture dei collegamenti dominio per il proprietario: elenco per sito e lookup per host,
    col client di sessione (RLS attiva, mai service_role nel percorso utente). Nessuna riga di altri
    tenant (garantito dalla RLS owner-only di DOM-101).
  definition_of_done:
    - "src/data/site-domains.ts con listSiteDomains(siteId) e getDomainByHost(normalized) col client di sessione"
    - "Ritornano solo i collegamenti dell'account del chiamante (RLS); nessun uso di service_role"
    - "host normalizzato prima del lookup esatto"
  acceptance_criteria:
    - id: AC-221-1
      given: "il proprietario del sito S con due collegamenti"
      when: "chiama listSiteDomains(S)"
      then: "riceve i due collegamenti del proprio account"
    - id: AC-221-2
      given: "un utente del tenant B"
      when: "chiama getDomainByHost per un host dell'account A"
      then: "riceve null (RLS isola per tenant)"
    - id: AC-221-3
      given: "il reader eseguito nel percorso utente"
      when: "si ispeziona quale client Supabase usa"
      then: "usa il client di sessione (RLS), mai la service_role key"
  target_tests:
    - file: "tests/site-domains-reader.test.ts"
      covers: [AC-221-1, AC-221-2, AC-221-3]
  security_notes:
    - "R7/A01:2025 — lettura col client di sessione (RLS), mai service_role nel percorso utente"
  out_of_scope:
    - "Le scritture di stato (DOM-222)"

- id: DOM-222
  title: "Writer di stato service_role: createPending / setActive / setSuspended / setError (confinato)"
  macrotask: "domain-store"
  depends_on: [DOM-101]
  objective: >
    Esporre le scritture di stato del collegamento con service_role CONFINATO (fuori dal percorso
    utente): creare una riga 'pending' con token, e le transizioni 'active'/'suspended'/'error' che il
    client non può fare (nessuna UPDATE authenticated). Iniettabile come store per i test.
  definition_of_done:
    - "createPendingDomain(accountId, siteId, normalized, kind, token, providerDomainId) inserisce/aggiorna in 'pending'"
    - "setDomainStatus(host, status, {verified_at?, detail?}) per active/suspended/error, via service_role confinato"
    - "Store SiteDomainWriteStore iniettabile per i test; nessun service_role esposto al client"
  acceptance_criteria:
    - id: AC-222-1
      given: "un account e un sito validi"
      when: "si chiama createPendingDomain"
      then: "esiste una riga site_domains 'pending' per (site, host) con il token e provider_domain_id"
    - id: AC-222-2
      given: "un collegamento 'pending'"
      when: "si chiama setDomainStatus(host, 'active', { verified_at })"
      then: "la riga passa ad 'active' con verified_at valorizzato (scrittura service_role)"
    - id: AC-222-3
      given: "il writer"
      when: "si ispeziona dove gira"
      then: "usa service_role confinato server-side, mai esposto al client (nessun percorso authenticated di UPDATE)"
  target_tests:
    - file: "tests/site-domains-writer.test.ts"
      covers: [AC-222-1, AC-222-2, AC-222-3]
  security_notes:
    - "R7 — scritture di stato via service_role confinato, coerenti con l'assenza di UPDATE authenticated in RLS (DOM-101)"
    - "A01:2025 integrità — la transizione ad 'active' passa solo di qui (server), mai dal client"
  out_of_scope:
    - "Chi decide QUANDO chiamare setActive (endpoint verify, DOM-311) o setSuspended (downgrade, DOM-602)"
```

## Self-check

- **Checkpoint**: reader sotto RLS (client di sessione); writer service_role confinato, iniettabile.
  **Mutazione**: reader che usa service_role → AC-221-3 rosso; writer che espone service_role al client
  → security nota/R7 rosso.

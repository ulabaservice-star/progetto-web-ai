# 10-domain-routing — Macrotask `domain-routing`

> Far sì che visitare un dominio custom serva il sito: il **reader pubblico** host→slug (DOM-401, anon,
> solo attivi) e la modifica del **middleware** (DOM-402, rewrite verso `/s/<slug>`). Il serving resta
> quello di P4. Dipende da `domain-schema`; procede in parallelo agli endpoint.

## Task atomici

```yaml
- id: DOM-401
  title: "Reader pubblico readSiteSlugForHost(host) — anon, solo attivi, esatto, fail-closed, dedup"
  macrotask: "domain-routing"
  depends_on: [DOM-102]
  objective: >
    Esporre l'unica lettura host->slug per il routing: come anon (mai service_role), uguaglianza esatta
    sul normalized_hostname, proiezione delle sole colonne pubbliche, filtrata ai soli 'active' dalla
    policy di DOM-102. Host inesistente/non attivo/guasto => null (fail-closed). Gemello di public-site.ts.
  definition_of_done:
    - "src/data/public-domain.ts con readSiteSlugForHost(host) -> { public_slug } | null (anon, edge-compatibile)"
    - "uguaglianza esatta su normalized_hostname (.eq), mai like/ilike/interpolazione; host normalizzato prima della query"
    - "riga solo se 'active' (policy DOM-102); non attivo/inesistente/errore => null; dedup per richiesta"
  acceptance_criteria:
    - id: AC-401-1
      given: "un dominio 'active' per lo slug 'il-tuo-bar'"
      when: "si chiama readSiteSlugForHost('iltuobar.it') come anon"
      then: "ritorna { public_slug: 'il-tuo-bar' }"
    - id: AC-401-2
      given: "un dominio 'verifying' (non attivo)"
      when: "si chiama readSiteSlugForHost per quell'host"
      then: "ritorna null (la policy anon espone solo gli attivi)"
    - id: AC-401-3
      given: "un host mai registrato o con case/schema"
      when: "si chiama readSiteSlugForHost"
      then: "l'host è normalizzato e la lookup esatta ritorna null (fail-closed, nessun match per prefisso/case)"
  target_tests:
    - file: "tests/public-domain-read.test.ts"
      covers: [AC-401-1, AC-401-2, AC-401-3]
  security_notes:
    - "A01:2025 lettura minima (DOM-D6) — anon, solo attivi, solo hostname+slug; mai service_role sul percorso pubblico (R7)"
    - "A05:2025 no-injection — uguaglianza esatta, mai like/ilike/filter interpolato (modello public-site.ts); fail-closed (P1-D21)"
  out_of_scope:
    - "Il rewrite nel middleware (DOM-402)"

- id: DOM-402
  title: "Middleware host-routing — Host custom attivo => rewrite /s/<slug>; piattaforma invariato; sconosciuto degrada"
  macrotask: "domain-routing"
  depends_on: [DOM-401]
  objective: >
    Modificare src/middleware.ts perché, PRIMA del routing per locale e della guardia auth, riconosca
    un Host non-piattaforma: se readSiteSlugForHost lo risolve a uno slug attivo, rewrite a /s/<slug>
    (querystring preservata, senza prefisso di locale); host di piattaforma (ulaba.net/*.ulaba.net/
    localhost/preview) => flusso attuale INVARIATO; host sconosciuto => degrada sicuro (nessun sito).
  definition_of_done:
    - "Il middleware distingue host di piattaforma (allowlist da env) da host custom, PRIMA di locale/guardia auth"
    - "Host custom risolto => NextResponse.rewrite verso /s/<slug> (querystring preservata); niente prefisso di locale (parità con l'esclusione /s/*)"
    - "Host di piattaforma => flusso attuale invariato (non-regressione); host custom non risolto => nessun rewrite (degrada sicuro)"
    - "path riservati /s e /api non vengono re-riscritti; lookup come anon (nessun service_role sull'edge)"
  acceptance_criteria:
    - id: AC-402-1
      given: "una richiesta con Host 'iltuobar.it' che risolve allo slug attivo 'il-tuo-bar' su path '/'"
      when: "il middleware la processa"
      then: "emette un rewrite verso '/s/il-tuo-bar' senza prefisso di locale"
    - id: AC-402-2
      given: "una richiesta con Host di piattaforma 'ulaba.net' verso '/it/dashboard'"
      when: "il middleware la processa"
      then: "il comportamento è INVARIATO (routing locale + guardia auth come oggi; nessun rewrite host-custom)"
    - id: AC-402-3
      given: "una richiesta con Host custom sconosciuto 'attaccante.example' (nessuna riga attiva)"
      when: "il middleware la processa"
      then: "NON viene emesso alcun rewrite host-custom: la richiesta prosegue nel flusso di piattaforma esistente e nessun sito viene servito (fail-closed)"
    - id: AC-402-4
      given: "una richiesta con Host custom attivo e querystring '?utm=x'"
      when: "il middleware fa il rewrite"
      then: "la querystring è preservata nel path riscritto"
    - id: AC-402-5
      given: "una richiesta con Host custom attivo verso un path già '/s/...' o '/api/...'"
      when: "il middleware la processa"
      then: "non ricorsivizza il rewrite (i path riservati /s e /api non vengono re-riscritti)"
  target_tests:
    - file: "tests/middleware-host-routing.test.ts"
      covers: [AC-402-1, AC-402-2, AC-402-3, AC-402-4, AC-402-5]
  security_notes:
    - "A01:2025 host-header — la mappa host->sito è vincolata ai soli domini ATTIVI nel DB; un Host arbitrario non fa servire un sito non collegato (no host spoofing verso siti terzi)"
    - "Non-regressione — l'esclusione /s/* e la guardia auth per gli host di piattaforma restano INVARIATE (il caso host-custom è aggiunto PRIMA); nessun service_role sull'edge (R7)"
  out_of_scope:
    - "L'emissione dei certificati TLS (Vercel per i domini aggiunti al progetto, DOM-211)"
```

## Self-check

- **Checkpoint**: reader anon solo-attivi; middleware rewrite solo su host risolto dal DB, piattaforma
  invariati (non-regressione su `tests/auth-middleware.test.ts`). **Mutazione**: rewrite su host
  sconosciuto → AC-402-3 rosso; reader che espone i non attivi → AC-401-2 rosso.

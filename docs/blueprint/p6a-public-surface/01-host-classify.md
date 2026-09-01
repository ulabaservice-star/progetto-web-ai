# 01-host-classify — Macrotask `host-classify`

> La terza categoria di Host (`landing`) accanto ad `app` e `custom`, spezzata in due micro-task
> disgiunti: la **classificazione PURA** senza env (PUB-101, `classifyRequestHost` in un modulo dominio
> nuovo) e l'**accessor env** che ricava l'hostname della landing da `NEXT_PUBLIC_LANDING_URL`
> (PUB-102, gemello di `getSiteBaseUrl` in `src/config/env.ts`). Nessuna dipendenza esterna: fondamenta
> del guard simmetrico (`host-guard`, PUB-111). Fail-safe verso `custom`: in assenza di config la landing
> non riceve mai trattamento speciale (P6A-D2).

## Task atomici

```yaml
- id: PUB-101
  title: "classifyRequestHost puro (host, {appHost, landingHost}) -> 'app'|'landing'|'custom', fail-safe verso custom"
  macrotask: "host-classify"
  depends_on: []
  objective: >
    Introdurre una funzione PURA in un modulo dominio nuovo (src/domain/hosting/classify-host.ts) che
    classifichi l'Host di una richiesta in tre categorie a partire DAI SOLI argomenti: appHost e
    landingHost li passa il chiamante (nessuna lettura di process.env dentro la pura). 'app' = appHost o
    un suo sottodominio; 'landing' = landingHost o 'www.'+landingHost; ogni altro host = 'custom'. Se
    landingHost e' null (config assente) nessun host viene mai classificato 'landing': si degrada a
    'custom' o 'app', mai verso la landing (fail-safe). L'host in ingresso e' gia' minuscolo e senza
    porta (lo normalizza il chiamante nel middleware).
  definition_of_done:
    - "Nuovo modulo src/domain/hosting/classify-host.ts che esporta la funzione pura classifyRequestHost"
    - "Firma classifyRequestHost(host: string, opts: { appHost: string | null; landingHost: string | null }): 'app' | 'landing' | 'custom'"
    - "host === appHost oppure host termina con '.' + appHost => 'app' (apex e sottodomini)"
    - "host === landingHost oppure host === 'www.' + landingHost => 'landing'"
    - "landingHost === null => nessun ramo 'landing' raggiungibile (fail-safe): l'esito e' 'app' o 'custom'"
    - "appHost === null e landingHost === null => 'custom' per qualunque host"
    - "Nessun riferimento a process.env, next/headers o I/O nel modulo (funzione pura, deterministica)"
  acceptance_criteria:
    - id: AC-101-1
      given: "opts = { appHost: 'app.ulaba.net', landingHost: 'ulaba.net' }"
      when: "si classifica 'app.ulaba.net' (apex app) e poi 'preview.app.ulaba.net' (sottodominio app)"
      then: "entrambi ritornano 'app'"
    - id: AC-101-2
      given: "opts = { appHost: 'app.ulaba.net', landingHost: 'ulaba.net' }"
      when: "si classifica 'ulaba.net' e poi 'www.ulaba.net'"
      then: "entrambi ritornano 'landing'"
    - id: AC-101-3
      given: "opts = { appHost: 'app.ulaba.net', landingHost: 'ulaba.net' }"
      when: "si classifica un host cliente 'iltuobar.it'"
      then: "ritorna 'custom'"
    - id: AC-101-4
      given: "opts = { appHost: 'app.ulaba.net', landingHost: null } (NEXT_PUBLIC_LANDING_URL assente a monte)"
      when: "si classifica un host ignoto 'ulaba.net' (che sarebbe la landing se nota)"
      then: "ritorna 'custom', mai 'landing' (fail-safe: senza landingHost la landing non e' trattata)"
  target_tests:
    - file: "tests/host-classify.test.ts"
      covers: [AC-101-1, AC-101-2, AC-101-3, AC-101-4]
  security_notes:
    - "A01:2025 confini host — la categoria decide il trattamento (guard/redirect); logica PURA sui soli argomenti, testabile senza segreti ne rete"
    - "Fail-safe — landingHost === null => nessun host classificato 'landing': config assente ⇒ nessun trattamento landing (mai servire/redirigere la landing per un Host arbitrario)"
  out_of_scope:
    - "La lettura di NEXT_PUBLIC_LANDING_URL (PUB-102) e l'uso nel middleware (PUB-111)"
    - "La normalizzazione minuscolo/senza-porta dell'Host (gia' fatta dal chiamante nel middleware)"

- id: PUB-102
  title: "getLandingHost() + getLandingBaseUrl() in src/config/env.ts da NEXT_PUBLIC_LANDING_URL (host / base URL assoluta), fail-safe se assente"
  macrotask: "host-classify"
  depends_on: []
  objective: >
    Aggiungere in src/config/env.ts un accessor getLandingHost, gemello di getSiteBaseUrl, che ricavi
    l'hostname della landing da NEXT_PUBLIC_LANDING_URL. Ritorna l'hostname minuscolo senza porta se la
    variabile e' valorizzata e parsabile come URL; ritorna null se assente, whitespace o non parsabile
    (fail-safe). Stesso pattern degli altri accessor: source parametrizzabile (default process.env),
    vuoto/whitespace = non impostata. NEXT_PUBLIC_LANDING_URL e' CONFIG PUBBLICA (l'origine della landing,
    la stessa che il browser vede), non un segreto. Aggiunge ANCHE getLandingBaseUrl (gemello di
    getSiteBaseUrl): la base URL ASSOLUTA (schema+host) della landing senza slash finale, da cui il SEO
    (robots/sitemap/canonical, PUB-301/311/321) compone URL assoluti; assente => default di sviluppo,
    mai getSiteBaseUrl né l'Host grezzo della richiesta.
  definition_of_done:
    - "src/config/env.ts esporta getLandingHost(source?: Record<string, string | undefined>): string | null"
    - "Legge NEXT_PUBLIC_LANDING_URL; assente o solo-whitespace => null (come loadEnv/getSiteBaseUrl)"
    - "Valore valorizzato => new URL(value).hostname in minuscolo, senza porta; parse fallito => null (fail-safe, mai lancia)"
    - "Nessun default hardcoded verso un dominio reale: getLandingHost assente => null, non un hostname di ripiego"
    - "src/config/env.ts esporta ANCHE getLandingBaseUrl(source?: Record<string, string | undefined>): string — NEXT_PUBLIC_LANDING_URL ripulito e senza slash finale (gemello di getSiteBaseUrl); assente/whitespace => default di sviluppo 'http://localhost:3000', mai getSiteBaseUrl né un dominio reale hardcoded"
  acceptance_criteria:
    - id: AC-102-1
      given: "source = { NEXT_PUBLIC_LANDING_URL: 'https://Ulaba.net:443' }"
      when: "si invoca getLandingHost(source)"
      then: "ritorna 'ulaba.net' (minuscolo, senza porta)"
    - id: AC-102-2
      given: "source senza NEXT_PUBLIC_LANDING_URL (oppure valore '   ')"
      when: "si invoca getLandingHost(source)"
      then: "ritorna null (fail-safe: nessun host landing noto)"
    - id: AC-102-3
      given: "source = { NEXT_PUBLIC_LANDING_URL: 'non-un-url' } (stringa non parsabile come URL)"
      when: "si invoca getLandingHost(source)"
      then: "ritorna null senza lanciare eccezione"
    - id: AC-102-4
      given: "source = { NEXT_PUBLIC_LANDING_URL: 'https://ulaba.net/' }"
      when: "si invoca getLandingBaseUrl(source)"
      then: "ritorna 'https://ulaba.net' (schema+host, senza slash finale); con source vuoto ritorna il default di sviluppo 'http://localhost:3000' (come getSiteBaseUrl)"
  target_tests:
    - file: "tests/env-landing.test.ts"
      covers: [AC-102-1, AC-102-2, AC-102-3, AC-102-4]
  security_notes:
    - "A07:2025 config via env — NEXT_PUBLIC_LANDING_URL letto SOLO da process.env (source iniettabile nei test), mai hardcoded nel sorgente"
    - "Fail-safe — assente/whitespace/non-parsabile => null: a valle nessun host viene classificato 'landing' senza config valida"
  out_of_scope:
    - "L'uso di getLandingHost nel middleware e il guard simmetrico (PUB-111)"
    - "La validazione https/host-pubblico in produzione (semmai in assertProductionEnv, fuori da questo macrotask)"
```

## Self-check

- **Checkpoint**: `hygiene` (nuovi file clone-free: modulo `classify-host.ts` + accessor gemello),
  `suite` (host-classify + env-landing verdi), `AC` (ogni AC tracciato dal suo `target_test`). Nessuna
  RLS/segreto toccato (funzione pura + accessor env).
- **Mutazione**: nel ramo landing di `classifyRequestHost` sostituire `landingHost === null` con `false`
  (trattare landing anche senza config) => AC-101-4 rosso; in `getLandingHost` togliere il fallback a
  `null` sul parse fallito => AC-102-3 rosso; ritornare l'hostname senza `toLowerCase` => AC-102-1 rosso.

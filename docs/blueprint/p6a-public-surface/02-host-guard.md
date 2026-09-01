# 02-host-guard — Macrotask `host-guard`

> Il guard **simmetrico** nel middleware unico (`src/middleware.ts`): rotte d'app viste su Host
> `landing` → 308 verso `app.`, rotte marketing viste su Host `app` → 308 verso la landing. Un solo
> task chirurgico (PUB-111) che aggancia `classifyRequestHost` (PUB-101) + `getLandingHost` (PUB-102)
> nel flusso di piattaforma **senza toccare** `/s/*`, `/api` (gia' escluso dal matcher), il ramo
> host-custom (`routeCustomHost`) ne' la guardia auth. Confini netti e canonical stabile (P6A-D2);
> fail-safe quando `NEXT_PUBLIC_LANDING_URL` e' assente (tutto come oggi).

## Task atomici

```yaml
- id: PUB-111
  title: "Guard host simmetrico nel middleware (308): app-path su landing -> app.; marketing-path su app -> landing; /s,/api,host-custom,auth invariati"
  macrotask: "host-guard"
  depends_on: [PUB-101, PUB-102]
  objective: >
    Agganciare nel middleware unico un guard SIMMETRICO che tenga i confini netti tra la superficie
    d'app e quella marketing sullo stesso monolite. Per gli Host di piattaforma si classifica l'Host con
    classifyRequestHost(host, { appHost: platformAppHost(), landingHost: getLandingHost() }): su Host
    'landing' + path d'APP (tutto cio' che non e' marketing ne' /s/*) => redirect 308 verso l'appHost
    stesso path+query; su Host 'app' + path MARKETING (home '/{locale}', '/{locale}/blog', '/{locale}/privacy')
    => redirect 308 verso il landingHost stesso path+query. Perche' la landing (apex + www) sia servita
    come piattaforma e NON finisca nel ramo host-custom, isPlatformHost riconosce anche il landing host.
    NON si toccano: l'esclusione di /s/* (isPublicStandalonePath), l'esclusione /api del matcher, il ramo
    host-custom per i domini cliente (routeCustomHost), la guardia auth (guardProtectedRoute). Fail-safe:
    getLandingHost() === null => nessun redirect landing, comportamento identico ad oggi.
  definition_of_done:
    - "src/middleware.ts applica il guard SOLO agli Host di piattaforma (dopo la deviazione host-custom), riusando classifyRequestHost + getLandingHost + platformAppHost"
    - "Predicato marketing (esportato per osservabilita', come protectedRoute/isPublicStandalonePath): isMarketingPath(pathname) vero per '/{locale}' esatto, '/{locale}/blog'(+sotto-path) e '/{locale}/privacy', falso altrove; app-path = complemento (non marketing, non /s/*)"
    - "Host 'landing' + app-path => NextResponse.redirect(url, 308) con url.hostname = appHost, pathname+search preservati"
    - "Host 'app' + marketing-path => NextResponse.redirect(url, 308) con url.hostname = landingHost, pathname+search preservati"
    - "isPlatformHost riconosce il landing host (landingHost e 'www.'+landingHost) come piattaforma: la landing non entra in routeCustomHost (nessuna lookup DB readSiteSlugForHost per la landing)"
    - "getLandingHost() === null => classifyRequestHost non produce 'landing' e il ramo app non ha destinazione landing: NESSUN redirect di guard, si prosegue nel flusso odierno"
    - "/s/* invariato (nessun redirect di guard), guardia auth invariata (protectedRoute -> guardProtectedRoute), ramo host-custom dei domini cliente invariato (routeCustomHost)"
  acceptance_criteria:
    - id: AC-111-1
      given: "NEXT_PUBLIC_APP_URL='https://app.ulaba.net', NEXT_PUBLIC_LANDING_URL='https://ulaba.net'; richiesta Host='ulaba.net' path '/it/dashboard'"
      when: "il middleware processa la richiesta"
      then: "risponde 308 con Location host = app.ulaba.net e pathname '/it/dashboard' (query preservata); handleI18n e guardProtectedRoute NON invocati"
    - id: AC-111-2
      given: "stessa config; richiesta Host='app.ulaba.net' path '/it/blog'"
      when: "il middleware processa la richiesta"
      then: "risponde 308 con Location host = ulaba.net e pathname '/it/blog'"
    - id: AC-111-3
      given: "stessa config; richiesta Host='ulaba.net' path '/it' (home marketing)"
      when: "il middleware processa la richiesta"
      then: "NESSUN redirect di guard (la home landing e' servita: flusso di piattaforma prosegue) e readSiteSlugForHost NON viene invocato (la landing e' piattaforma, non host-custom)"
    - id: AC-111-4
      given: "stessa config; richiesta Host='iltuobar.it' (dominio cliente) path '/it'"
      when: "il middleware processa la richiesta"
      then: "il ramo host-custom e' invariato: readSiteSlugForHost('iltuobar.it') viene invocato e NON parte alcun redirect 308 di guard verso app/landing"
    - id: AC-111-5
      given: "NEXT_PUBLIC_APP_URL='https://app.ulaba.net' ma NEXT_PUBLIC_LANDING_URL ASSENTE; richiesta Host='app.ulaba.net' path '/it/blog'"
      when: "il middleware processa la richiesta"
      then: "fail-safe: NESSUN redirect 308 verso una landing (getLandingHost null) e la richiesta prosegue nel flusso odierno (handleI18n invocato)"
  target_tests:
    - file: "tests/middleware-host-guard.test.ts"
      covers: [AC-111-1, AC-111-2, AC-111-3, AC-111-4, AC-111-5]
  security_notes:
    - "A01:2025 confini host netti — l'app non e' raggiungibile sul canale marketing e viceversa; canonical stabile (una sola origine serve ogni superficie), redirect 308 con hostname FISSO da env, mai da input utente (anti open-redirect, come guardProtectedRoute)"
    - "Non-regressione OBBLIGATORIA (citata): tests/auth-middleware.test.ts (guardia auth su rotte protette), tests/middleware-public-exclusion.test.ts (/s/* fuori dal locale), tests/middleware-host-routing.test.ts (ramo host-custom) devono restare VERDI — il guard e' additivo sul flusso di piattaforma, non riscrive quei rami"
    - "Fail-safe — getLandingHost() null => nessun redirect landing: env assente lascia il comportamento identico ad oggi (nessuna rottura della root durante il cutover, P6A-D12)"
  out_of_scope:
    - "Le pagine marketing servite (route group (marketing), home, /blog, /privacy) — altri macrotask"
    - "La regola Cloudflare che nega le rotte a-consumo su host landing (azione manuale founder, §10)"
    - "Qualsiasi modifica a /s/*, alla guardia auth o al ramo host-custom dei domini cliente"
```

## Self-check

- **Checkpoint**: `suite` (nuovo `middleware-host-guard` verde + le tre suite di non-regressione
  ancora verdi), `AC` (ogni AC tracciato dal suo `target_test`), `hygiene` (aggiunta chirurgica al
  middleware, nessun clone). Nessuna RLS/segreto: solo routing per-Host.
- **Mutazione**: invertire le due destinazioni del guard (app-path→landing, marketing-path→app) =>
  AC-111-1/AC-111-2 rossi; rimuovere la guardia `getLandingHost() === null` (redigere sempre) =>
  AC-111-5 rosso; togliere il riconoscimento del landing host in `isPlatformHost` (landing tornerebbe
  host-custom) => AC-111-3 rosso (readSiteSlugForHost invocato per la landing).

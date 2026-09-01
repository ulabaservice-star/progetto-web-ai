# 11-seo-robots — Macrotask `seo-robots`

> Rendere `src/app/robots.ts` **host-aware** (P6A-D8): con lo split di dominio (P6A-D1) il robots oggi
> globale non basta più. Sull'host **landing** (`ulaba.net`) la superficie di marketing è indicizzabile
> e la riga `Sitemap:` punta alla sitemap landing; sull'host **app** (`app.ulaba.net`) l'app **non è mai
> indicizzabile** (disallow totale) e il robots landing **non nomina mai** l'host dell'app. L'host si
> legge da `headers()` e si classifica con `classifyRequestHost` (host-classify) — mai da testo libero.

## Task atomici

```yaml
- id: PUB-301
  title: "robots.ts host-aware: landing indicizzabile + Sitemap landing; app disallow-all; nessun leak dell'host app"
  macrotask: "seo-robots"
  depends_on: [PUB-131, PUB-101, PUB-102]
  objective: >
    Trasformare src/app/robots.ts (oggi globale, base da getSiteBaseUrl) in una funzione async che
    legge l'header Host via headers() e lo classifica con classifyRequestHost (host-classify): sull'host
    'landing' emette regole di marketing indicizzabili (allow '/' e '/s/', conserva i Disallow di
    editor/preview) con Sitemap verso la sitemap landing (getLandingBaseUrl); sull'host 'app' emette un
    Disallow totale ('/') senza alcuna regola di marketing né riga Sitemap landing. Il robots servito
    su host landing non contiene mai l'host dell'app (NEXT_PUBLIC_APP_URL).
  definition_of_done:
    - "src/app/robots.ts diventa async e legge l'header 'host' via headers() (next/headers), forzando il render dinamico"
    - "l'host è classificato con classifyRequestHost(host) (host-classify, PUB-101) in 'app' | 'landing' | 'custom'"
    - "ramo 'landing': rules con allow che include '/' e '/s/', disallow che conserva ['/*/editor','/*/preview'], sitemap = `${getLandingBaseUrl()}/sitemap.xml`"
    - "ramo 'app' (e ogni host non-landing non-custom): rules con disallow '/' (disallow-all), nessuna regola di marketing, nessuna proprietà sitemap landing"
    - "il ramo 'custom' preserva il comportamento pre-esistente P5 (allow '/s/', sitemap getSiteBaseUrl) — non-regressione, fuori scope qui"
    - "getLandingBaseUrl prodotto da host-classify (PUB-102, env.ts): la base landing non è mai getSiteBaseUrl né l'Host grezzo della richiesta"
  acceptance_criteria:
    - id: AC-301-1
      given: "l'header Host uguale all'host landing (NEXT_PUBLIC_LANDING_URL)"
      when: "si valuta robots()"
      then: "rules.allow include '/' e '/s/', rules.disallow include '/*/editor' e '/*/preview', e sitemap === `${getLandingBaseUrl()}/sitemap.xml`"
    - id: AC-301-2
      given: "l'header Host uguale all'host app (NEXT_PUBLIC_APP_URL)"
      when: "si valuta robots()"
      then: "rules.disallow è '/' (disallow-all) e l'oggetto non porta alcuna proprietà sitemap landing né alcuna riga allow di marketing"
    - id: AC-301-3
      given: "robots() valutato con Host landing"
      when: "si serializza l'oggetto risultante in stringa e vi si cerca l'host dell'app"
      then: "la stringa non contiene mai il valore di NEXT_PUBLIC_APP_URL (nessun leak dell'host app dal robots landing)"
  target_tests:
    - file: "tests/robots-host-aware.test.ts"
      covers: [AC-301-1, AC-301-2, AC-301-3]
  security_notes:
    - "A01:2025 visibilità — l'app (app.ulaba.net) è non-indicizzabile: sull'host app robots emette disallow-all; nessuna superficie privata dell'app finisce nell'indice"
    - "Nessun leak dell'host app dal robots landing (AC-301-3): l'host landing non annuncia mai app.* (superficie di ricognizione minima)"
    - "A05:2025 — l'host arriva da headers() e passa per classifyRequestHost (allowlist), mai interpolato da testo libero nella riga Sitemap; base da getLandingBaseUrl (env), non dall'Host grezzo"
  out_of_scope:
    - "La classificazione host in sé e getLandingBaseUrl (host-classify, PUB-101)"
    - "Il comportamento robots sull'host 'custom' (immutato da P5)"
    - "La sitemap landing vera e propria (seo-sitemap, PUB-311)"
```

## Self-check

- **Checkpoint**: la suite `tests/robots-host-aware.test.ts` verde 3/3 con `headers()`/`classifyRequestHost`
  mockati (o pinnati via env), `getLandingBaseUrl`/`getSiteBaseUrl` reali. Non-regressione: le rotte
  `/s/*` restano indicizzabili sul ramo che le serve.
- **Mutazione**: rimuovere il ramo 'app' (emettere sempre le regole landing) → AC-301-2 rosso;
  sostituire `getLandingBaseUrl()` con `getSiteBaseUrl()` nel ramo landing → AC-301-1 rosso se le due
  basi divergono; concatenare l'host app nella riga Sitemap → AC-301-3 rosso.

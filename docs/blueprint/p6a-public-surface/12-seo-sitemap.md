# 12-seo-sitemap — Macrotask `seo-sitemap`

> La **sitemap della landing** (`src/app/sitemap.ts`, oggi inesistente: c'è solo la sitemap per-sito
> `/s/<slug>/sitemap.xml`): home + `/privacy` + indice `/blog`, ognuno con **hreflang IT↔ES**
> (`alternates.languages`), base assoluta dall'host landing (`getLandingBaseUrl` / `NEXT_PUBLIC_LANDING_URL`).
> I singoli **post** del blog li aggiungerà `blog-sitemap` (PUB-441): qui solo le pagine stabili (P6A-D8).

## Task atomici

```yaml
- id: PUB-311
  title: "src/app/sitemap.ts landing: home + /privacy + /blog con hreflang IT↔ES, base host landing"
  macrotask: "seo-sitemap"
  depends_on: [PUB-131, PUB-102]
  objective: >
    Creare src/app/sitemap.ts (MetadataRoute.Sitemap) per la landing: una voce per la home, una per
    /privacy e una per l'indice /blog, ciascuna con alternates.languages { it, es } (hreflang tra le due
    lingue del routing esistente, localePrefix 'always'). Gli URL sono assoluti sull'host landing,
    composto da getLandingBaseUrl() (NEXT_PUBLIC_LANDING_URL), senza slash finale — mai getSiteBaseUrl
    né l'Host della richiesta. I post del blog restano fuori (li aggiunge PUB-441).
  definition_of_done:
    - "Nuovo file src/app/sitemap.ts che esporta default `sitemap(): MetadataRoute.Sitemap`"
    - "base assoluta da getLandingBaseUrl() (host-classify, PUB-102), ripulita da slash finale"
    - "voce home con alternates.languages { it: `${base}/it`, es: `${base}/es` }"
    - "voce /privacy con url localizzato e alternates.languages { it, es }"
    - "voce indice /blog con url localizzato e alternates.languages { it, es }"
    - "nessuna voce per i singoli post del blog (aggiunta da blog-sitemap, PUB-441)"
  acceptance_criteria:
    - id: AC-311-1
      given: "NEXT_PUBLIC_LANDING_URL impostato a un host landing"
      when: "si valuta sitemap() e si prende la voce della home"
      then: "la voce ha alternates.languages con chiavi 'it' ed 'es' che valgono `${base}/it` e `${base}/es`"
    - id: AC-311-2
      given: "sitemap() valutata"
      when: "si elencano gli url delle voci"
      then: "esiste una voce il cui percorso è '/privacy' (localizzato it/es) con alternates.languages { it, es }"
    - id: AC-311-3
      given: "NEXT_PUBLIC_LANDING_URL impostato a un host landing diverso da NEXT_PUBLIC_SITE_URL"
      when: "si legge la loc di una voce qualsiasi"
      then: "l'origine (schema+host) è quella di getLandingBaseUrl (host landing), non getSiteBaseUrl"
  target_tests:
    - file: "tests/sitemap-landing.test.ts"
      covers: [AC-311-1, AC-311-2, AC-311-3]
  security_notes:
    - "Nessun dato privato: solo URL pubblici e statici (home/privacy/blog); nessuna enumerazione di righe DB"
    - "A05:2025 / open-redirect — la base è da env landing (getLandingBaseUrl), mai dall'Host della richiesta né da input utente; hreflang tra i soli locali dell'allowlist ('it','es')"
  out_of_scope:
    - "Le voci dei singoli post del blog (blog-sitemap, PUB-441)"
    - "La sitemap per-sito /s/<slug>/sitemap.xml (P4, immutata)"
```

## Self-check

- **Checkpoint**: `tests/sitemap-landing.test.ts` verde 3/3 con `NEXT_PUBLIC_LANDING_URL` pinnata via
  source-injection/env, `getLandingBaseUrl` reale; si osservano gli `alternates.languages` e l'origine
  degli URL.
- **Mutazione**: rimuovere `alternates.languages` dalla voce home → AC-311-1 rosso; comporre la base
  con `getSiteBaseUrl()` invece di `getLandingBaseUrl()` → AC-311-3 rosso (basi divergenti); omettere la
  voce `/privacy` → AC-311-2 rosso.

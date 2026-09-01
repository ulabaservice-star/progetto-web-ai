# 13-seo-metadata — Macrotask `seo-metadata`

> I **metadata della landing** via `generateMetadata` nella superficie marketing (`(marketing)`):
> **canonical fisso sull'host landing** (`ulaba.net`, P6A-D4 — mai derivato dall'Host della richiesta),
> **Open Graph** (title/description/image 1200×630 placeholder), **Twitter card**, e
> **`alternates.languages` it/es** (hreflang). `metadataBase` è l'host landing così che canonical/OG
> risolvano assoluti (P6A-D8). La base viene da `getLandingBaseUrl`, non da testo libero.

## Task atomici

```yaml
- id: PUB-321
  title: "generateMetadata marketing: canonical fisso landing + OG 1200x630 + Twitter card + hreflang it/es"
  macrotask: "seo-metadata"
  depends_on: [PUB-131, PUB-102]
  objective: >
    Aggiungere generateMetadata alla superficie marketing (layout/pagina di route group (marketing),
    creata da marketing-layout PUB-131) che imposta metadataBase = new URL(getLandingBaseUrl()),
    alternates.canonical FISSO sull'host landing (P6A-D4, mai dall'Host della richiesta),
    alternates.languages { it, es } (hreflang), openGraph con title/description e images
    [{ url, width: 1200, height: 630 }] (placeholder finché il founder non carica l'immagine, §10), e
    twitter.card 'summary_large_image'. La stringa del canonical/OG non è mai interpolata da input utente.
  definition_of_done:
    - "metadataBase = new URL(getLandingBaseUrl()) impostato UNA volta nel layout marketing ((marketing)/layout.tsx) (host landing, host-classify PUB-102); generateMetadata della HOME ritorna il proprio Metadata"
    - "alternates.canonical della HOME = base landing (getLandingBaseUrl); l'HOST del canonical è FISSO landing (P6A-D4), mai derivato dall'Host della richiesta; NON un canonical unico nel layout (che /privacy e /blog erediterebbero): ogni pagina marketing canonicalizza alla PROPRIA path"
    - "alternates.languages = { it: `${base}/it`, es: `${base}/es` } (hreflang)"
    - "openGraph con title, description e images: [{ url: <og placeholder>, width: 1200, height: 630 }]"
    - "twitter.card = 'summary_large_image'"
  acceptance_criteria:
    - id: AC-321-1
      given: "la home marketing (locale it)"
      when: "si valuta generateMetadata e si legge alternates.canonical"
      then: "vale l'host landing (getLandingBaseUrl()), lo stesso indipendentemente dal locale della richiesta"
    - id: AC-321-2
      given: "la home marketing"
      when: "si legge openGraph.images[0]"
      then: "ha width === 1200 e height === 630"
    - id: AC-321-3
      given: "la home marketing"
      when: "si legge alternates.languages"
      then: "contiene le chiavi 'it' ed 'es'"
    - id: AC-321-4
      given: "la home marketing"
      when: "si legge twitter.card"
      then: "vale 'summary_large_image'"
  target_tests:
    - file: "tests/marketing-metadata.test.ts"
      covers: [AC-321-1, AC-321-2, AC-321-3, AC-321-4]
  security_notes:
    - "A05:2025 / open-redirect nei metadati — canonical e metadataBase da env landing (getLandingBaseUrl), MAI dall'Host della richiesta né da input utente; nessun valore di canonical interpolato da testo libero"
    - "Canonical FISSO su ulaba.net (P6A-D4): un Host ostile non sposta il canonical, il segnale SEO resta stabile"
  out_of_scope:
    - "JSON-LD Organization/WebSite (seo-jsonld, PUB-331)"
    - "L'immagine OG definitiva 1200×630 (azione manuale del founder, §10) — qui solo il placeholder"
    - "I metadata per-articolo del blog (blog-post, PUB-431)"
```

## Self-check

- **Checkpoint**: `tests/marketing-metadata.test.ts` verde 4/4 importando e invocando `generateMetadata`
  con params it/es, `NEXT_PUBLIC_LANDING_URL` pinnata; si osservano canonical, `openGraph.images`,
  `alternates.languages`, `twitter.card`.
- **Mutazione**: derivare il canonical dall'Host della richiesta invece di `getLandingBaseUrl()` →
  AC-321-1 rosso; portare l'og:image a dimensioni ≠ 1200×630 → AC-321-2 rosso; rimuovere il ramo `es`
  da `alternates.languages` → AC-321-3 rosso.

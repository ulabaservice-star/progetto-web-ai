# 20-blog-sitemap — Macrotask `blog-sitemap`

> Estende la sitemap globale `src/app/sitemap.ts` (creata da `seo-sitemap`, PUB-311) con gli URL dei
> **post del blog**, ciascuno con `alternates.languages` (hreflang) **SOLO fra traduzioni reali**
> (`resolvePostAlternates`, PUB-411). Un post con traduzione ha alternates `it`+`es`; un post
> mono-lingua **non** ha alternate fittizio (P6A-D8/D9). Solo URL pubblici della landing: mai `app.`,
> mai rotte non pubbliche.

## Task atomici

```yaml
- id: PUB-441
  title: "Estensione sitemap.ts coi post del blog e hreflang alternates solo fra traduzioni reali"
  macrotask: "blog-sitemap"
  depends_on: [PUB-311, PUB-411]
  objective: >
    Estendere src/app/sitemap.ts (creata in seo-sitemap, PUB-311) aggiungendo una voce per ogni post
    pubblicato di entrambi i locali (da listPosts, PUB-411), con url assoluto <base>/<locale>/blog/<slug>
    (stessa base della SEO landing) e alternates.languages popolato SOLO con i locali che hanno una
    traduzione reale (resolvePostAlternates). Un post mono-lingua non riceve alcun alternate fittizio.
    Nessun URL dell'app ne rotte non pubbliche entra nella sitemap.
  definition_of_done:
    - "src/app/sitemap.ts include una voce per ogni post di listPosts('it') e listPosts('es') (esclusi i draft, ereditato da PUB-411)"
    - "Ogni voce ha url assoluto <base>/<locale>/blog/<slug> (base della landing, stessa sorgente del canonical SEO PUB-311)"
    - "Ogni voce con traduzione reale ha alternates.languages con le chiavi dei locali che condividono translationKey; un post mono-lingua NON ha la chiave dell'altro locale"
    - "Nessun URL con host app. ne rotta non pubblica introdotto dall'estensione"
  acceptance_criteria:
    - id: AC-441-1
      given: "una fixture/seed con un post it e un post es"
      when: "si chiama la funzione sitemap()"
      then: "l'array include gli url <base>/it/blog/<slugIt> e <base>/es/blog/<slugEs>"
    - id: AC-441-2
      given: "un post it con controparte es (stesso translationKey)"
      when: "si chiama sitemap()"
      then: "la voce del post it ha alternates.languages con entrambe le chiavi 'it' ed 'es'"
    - id: AC-441-3
      given: "un post mono-lingua (solo it)"
      when: "si chiama sitemap()"
      then: "la voce di quel post NON ha, in alternates.languages, la chiave dell'altro locale (nessun alternate fittizio)"
  target_tests:
    - file: "tests/blog-sitemap.test.ts"
      covers: [AC-441-1, AC-441-2, AC-441-3]
  security_notes:
    - "Solo URL pubblici della landing — nessun host app. ne rotta non pubblica nella sitemap (coerente col robots host-aware, P6A-D8)"
    - "Hreflang onesto (P6A-D9) — alternates.languages solo fra traduzioni reali; un post mono-lingua non genera un alternate verso un locale senza post"
  out_of_scope:
    - "La creazione iniziale di src/app/sitemap.ts e le voci non-blog (PUB-311)"
    - "La resa della pagina del post (PUB-431)"
```

## Self-check

- **Checkpoint**: suite (`blog-sitemap.test.ts` 3/3) + igiene (estensione di file esistente, nessun
  clone) + `sec_check` (nessun URL `app.`). **Mutazione**: emettere `alternates.languages` con entrambi
  i locali anche per un post mono-lingua → AC-441-3 rosso; comporre gli url con base relativa → AC-441-1
  rosso.

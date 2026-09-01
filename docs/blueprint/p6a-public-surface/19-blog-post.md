# 19-blog-post — Macrotask `blog-post`

> La rotta del **singolo post** `src/app/[locale]/(marketing)/blog/[slug]/page.tsx` in **SSG**
> (`generateStaticParams` su tutti i post) che rende l'**HTML SANIFICATO** (`dangerouslySetInnerHTML`
> **solo** sull'html già passato da rehype-sanitize in PUB-401) + un **JSON-LD `Article`**
> (`serializeJsonLdSafe`, riuso da `jsonld.ts`, PUB-331) + `generateMetadata` (canonical, Open Graph)
> con **hreflang alternates SOLO fra traduzioni reali** (`resolvePostAlternates`, PUB-411). Slug
> inesistente → `notFound()` (404). Il punto di sicurezza: l'html reso è **solo** quello della pipeline
> (P6A-D9, A05:2025). La base assoluta del canonical è la stessa della SEO (PUB-321).

## Task atomici

```yaml
- id: PUB-431
  title: "Rotta blog post SSG: HTML sanificato + JSON-LD Article + generateMetadata con hreflang solo reali"
  macrotask: "blog-post"
  depends_on: [PUB-411, PUB-321, PUB-331]
  objective: >
    Aggiungere la rotta src/app/[locale]/(marketing)/blog/[slug]/page.tsx come Server Component SSG:
    generateStaticParams enumera i post di tutti i locali; la pagina rende getPost(locale, slug).html
    via dangerouslySetInnerHTML (l'unico html e' quello GIA' sanificato da renderMarkdown, PUB-401),
    emette un <script type application/ld+json> con un oggetto @type Article serializzato con
    serializeJsonLdSafe (PUB-331), e generateMetadata produce canonical assoluto + Open Graph +
    alternates.languages con hreflang SOLO per i locali con traduzione reale (resolvePostAlternates,
    PUB-411). Uno slug inesistente porta a notFound() (404).
  definition_of_done:
    - "Nuova rotta src/app/[locale]/(marketing)/blog/[slug]/page.tsx (Server Component, SSG)"
    - "generateStaticParams enumera i post di TUTTI i locali -> voci { locale, slug }"
    - "La pagina rende getPost(locale, slug).html via dangerouslySetInnerHTML: l'html reso e' ESCLUSIVAMENTE quello della pipeline sanificata (PUB-401), mai input grezzo"
    - "Emette un <script type=\"application/ld+json\"> con un oggetto @type 'Article' (headline dal frontmatter.title) serializzato con serializeJsonLdSafe (riuso da src/domain/generation/jsonld.ts)"
    - "generateMetadata: canonical assoluto (stessa base della SEO landing, PUB-321), openGraph, e alternates.languages popolato SOLO con i locali che hanno traduzione reale (resolvePostAlternates); nessun hreflang per un post mono-lingua"
    - "getPost -> null => notFound() (risposta 404)"
  acceptance_criteria:
    - id: AC-431-1
      given: "un post il cui getPost.html sanificato e' <p>ciao</p> (e un corpo che conteneva uno <script> gia' rimosso a monte)"
      when: "si rende la pagina del post"
      then: "il DOM contiene <p>ciao</p> (da dangerouslySetInnerHTML) e NON contiene alcun tag <script> proveniente dal corpo"
    - id: AC-431-2
      given: "un post con frontmatter.title = 'Titolo'"
      when: "si rende la pagina del post"
      then: "il DOM contiene uno <script type=\"application/ld+json\"> il cui JSON ha @type uguale ad 'Article' e headline uguale a 'Titolo'"
    - id: AC-431-3
      given: "un post it con controparte es (resolvePostAlternates non vuoto) e, separatamente, un post it mono-lingua"
      when: "si chiama generateMetadata su ciascuno"
      then: "sul primo alternates.languages contiene la chiave 'es' con l'URL del post es; sul secondo alternates.languages NON contiene la chiave dell'altro locale"
    - id: AC-431-4
      given: "uno slug inesistente per il locale richiesto"
      when: "si rende la pagina (getPost ritorna null)"
      then: "la rotta chiama notFound() (risposta 404)"
  target_tests:
    - file: "tests/blog-post-route.test.tsx"
      covers: [AC-431-1, AC-431-2, AC-431-3, AC-431-4]
  security_notes:
    - "A05:2025 injection — dangerouslySetInnerHTML riceve SOLO l'html gia' passato da rehype-sanitize (PUB-401), mai testo grezzo del corpo o del frontmatter"
    - "A05:2025 injection — il JSON-LD Article e' emesso con serializeJsonLdSafe (anti breakout del tag <script>, riuso jsonld.ts): il titolo del post non puo' chiudere il tag"
    - "Hreflang onesto (P6A-D9) — alternates.languages solo per traduzioni reali; nessun alternate fittizio verso un locale senza post"
  out_of_scope:
    - "La lista dei post (PUB-421)"
    - "L'inserimento dei post nella sitemap (PUB-441)"
```

## Self-check

- **Checkpoint**: suite (`blog-post-route.test.tsx` 4/4) + `sec_check` (unico
  `dangerouslySetInnerHTML` alimentato dalla pipeline sanificata; JSON-LD via `serializeJsonLdSafe`) +
  igiene. **Mutazione**: alimentare `dangerouslySetInnerHTML` col markdown grezzo invece che con
  `.html` → AC-431-1 rosso; emettere il JSON-LD con `JSON.stringify` nudo → il canary di breakout in
  `sec_check`/AC rosso; popolare `alternates.languages` sempre con entrambi i locali → AC-431-3 rosso;
  togliere il `notFound()` → AC-431-4 rosso.

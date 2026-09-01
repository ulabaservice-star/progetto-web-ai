# 18-blog-list — Macrotask `blog-list`

> La rotta di **listing** `src/app/[locale]/(marketing)/blog/page.tsx` in **SSG**
> (`generateStaticParams` sui locali) che rende le **card** dei post (title/description/date/link a
> `/<locale>/blog/<slug>`) leggendo `listPosts(locale)` (PUB-411) dentro il layout `(marketing)`
> (PUB-131). Un locale senza post → **lista vuota**, nessun crash. Output solo testo JSX (escaping
> React), nessun dato/auth.

## Task atomici

```yaml
- id: PUB-421
  title: "Rotta blog listing SSG (generateStaticParams sui locali) con le card dei post"
  macrotask: "blog-list"
  depends_on: [PUB-411, PUB-131]
  objective: >
    Aggiungere la rotta src/app/[locale]/(marketing)/blog/page.tsx come Server Component SSG che
    enumera i locali con generateStaticParams e rende una card per ogni post di listPosts(locale)
    (title, description, date, link a /<locale>/blog/<slug>). Un locale senza post rende una lista
    vuota senza eccezioni. La rotta vive nel route group (marketing) (PUB-131) e prende le etichette
    dal namespace i18n del blog.
  definition_of_done:
    - "Nuova rotta src/app/[locale]/(marketing)/blog/page.tsx (Server Component, SSG)"
    - "generateStaticParams ritorna una voce per ogni locale di routing.locales: [{ locale: 'it' }, { locale: 'es' }]"
    - "Per ogni post di listPosts(locale) rende una card con title, description, date e un link con href /<locale>/blog/<slug>"
    - "Locale senza post (listPosts ritorna []) -> nessuna card, nessuna eccezione (markup della lista vuoto)"
    - "Nuovo namespace i18n 'blog' in messages/it.json + messages/es.json con le etichette del listing (es. pageTitle, listHeading, readMore, label data); ES localizzato per paese"
    - "Il set dei path-foglia del namespace 'blog' è IDENTICO fra it.json ed es.json (parità, nessuna chiave orfana)"
    - "Etichette statiche (intestazione lista) risolte dal namespace 'blog', non stringhe hardcoded"
  acceptance_criteria:
    - id: AC-421-1
      given: "una fixture/seed con N post it"
      when: "si rende la pagina per locale 'it'"
      then: "il DOM contiene N link con href /it/blog/<slug> e i titoli degli N post"
    - id: AC-421-2
      given: "la rotta blog listing"
      when: "si chiama generateStaticParams()"
      then: "ritorna esattamente [{ locale: 'it' }, { locale: 'es' }]"
    - id: AC-421-3
      given: "un locale per cui listPosts ritorna []"
      when: "si rende la pagina"
      then: "il DOM non contiene alcuna card di post e la resa non lancia eccezioni"
    - id: AC-421-4
      given: "il namespace 'blog' in messages/it.json e messages/es.json"
      when: "si raccolgono ricorsivamente i path-foglia di 'blog' in ciascun catalogo e si confrontano"
      then: "i due insiemi sono uguali (differenza simmetrica vuota: nessuna chiave orfana fra IT ed ES)"
  target_tests:
    - file: "tests/blog-list-route.test.tsx"
      covers: [AC-421-1, AC-421-2, AC-421-3]
    - file: "tests/blog-i18n-parity.test.ts"
      covers: [AC-421-4]
  security_notes:
    - "Output solo testo JSX (escaping React su title/description/href-slug): nessun innerHTML, nessun dato privato ne autenticazione toccati (A05:2025)"
  out_of_scope:
    - "La rotta del singolo post e il suo HTML/JSON-LD (PUB-431)"
    - "La sitemap del blog (PUB-441)"
```

## Self-check

- **Checkpoint**: suite (`blog-list-route.test.tsx` 3/3) + igiene (nuovo file) + `arch_check` (la rotta
  UI non raggiunge `src/data`). **Mutazione**: far ritornare a `generateStaticParams` un solo locale →
  AC-421-2 rosso; far lanciare la resa su lista vuota (invece di markup vuoto) → AC-421-3 rosso.

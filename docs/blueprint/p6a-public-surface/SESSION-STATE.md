# SESSION-STATE — p6a-public-surface

> Fonte di verità sullo **stato vivo** del workstream `p6a-public-surface` (superficie pubblica: split
> dominio + landing + waitlist + SEO + blog), consumata da BUILD e aggiornata a ogni `session-end`.
> Istanza distinta da quelle di P0…P4, design-engine v1/v1.1/v2, architecture-hardening,
> deploy-hardening, onboarding-guided-wizard, p5-billing-fase1, p5-custom-domains-fase2 e di Trueline.
> Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P6a (superficie pubblica) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-09-05 (BUILD `blog-sitemap` — checkpoint 4/4 verde + mutazione 5/5, MERGIATO `0a30762`) |
| **Sessione corrente (BUILD `blog-sitemap`, PUB-441)** | **CHIUSO+MERGIATO** (`0a30762`, atomico `5e17467`, deploy coupled; nessuna migrazione; nessuna rotta API; nessuna dep nuova). **20/22 macrotask done.** |
| **Sessione precedente (BUILD `blog-post`, PUB-431)** | **CHIUSO+MERGIATO** (`b7c0294`, atomico `6d55cf6`, deploy coupled; nessuna migrazione; nessuna rotta API; nessuna dep nuova). |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| # | Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|---|
| 01 | `host-classify` (PUB-101/102) | **done** | 4/4 ✅ (`d8dd235`) | — |
| 02 | `host-guard` (PUB-111) | **done** | 4/4 ✅ (`9244fe5`) | `host-classify` |
| 03 | `marketing-i18n` (PUB-121) | **done** | 4/4 ✅ (`f397f82`) | — |
| 04 | `marketing-layout` (PUB-131) | **done** | 4/4 ✅ (`b06107d`) | `marketing-i18n` |
| 05 | `marketing-home` (PUB-141) | **done** | 4/4 ✅ (`40a0fa3`) | `marketing-layout` |
| 06 | `waitlist-schema` (PUB-201) | **done** | 4/4 ✅ (`8f74307`) | — |
| 07 | `waitlist-store` (PUB-211) | **done** | 4/4 ✅ (`70418f2`) | `waitlist-schema` |
| 08 | `captcha-port` (PUB-221/222) | **done** | 4/4 ✅ (`5933c12`) | — |
| 09 | `waitlist-endpoint` (PUB-231/232) | **done** | 4/4 ✅ (`193ba0e`) | `waitlist-store`, `captcha-port` |
| 10 | `waitlist-form` (PUB-241/242) | **done** | 4/4 ✅ (`4c5cb52`) | `marketing-home`, `waitlist-endpoint` |
| 11 | `seo-robots` (PUB-301) | **done** | 4/4 ✅ (`90d0907`) | `marketing-layout` |
| 12 | `seo-sitemap` (PUB-311) | **done** | 4/4 ✅ (`52fb2c5`) | `marketing-layout` |
| 13 | `seo-metadata` (PUB-321) | **done** | 4/4 ✅ (`16318d7`, branch) | `marketing-layout` |
| 14 | `seo-jsonld` (PUB-331) | **done** | 4/4 ✅ (`853aa09`, merge `744b0ae`) | `marketing-home` |
| 15 | `privacy-page` (PUB-341) | **done** | 4/4 ✅ (`65aa7a7`, merge `a329b41`) | `marketing-layout` |
| 16 | `blog-pipeline` (PUB-401) | **done** | 4/4 ✅ (`bcaa800`, merge `b1e41ce`) | — |
| 17 | `blog-content` (PUB-411) | **done** | 4/4 ✅ (`1954efd`, merge `0a5b16b`) | `blog-pipeline` |
| 18 | `blog-list` (PUB-421) | **done** | 4/4 ✅ (`280e905`, merge `12a3ca2`) | `blog-content`, `marketing-layout` |
| 19 | `blog-post` (PUB-431) | **done** | 4/4 ✅ (`6d55cf6`, merge `b7c0294`) | `blog-content`, `seo-metadata`, `seo-jsonld` |
| 20 | `blog-sitemap` (PUB-441) | **done** | 4/4 ✅ (`5e17467`, merge `0a30762`) | `seo-sitemap`, `blog-content` |
| 21 | `blog-seed` (PUB-451) | **todo** | — | `blog-content` |
| 22 | `cutover` (PUB-501) | **todo** | — | (tutte le superfici pubbliche) |

**Eleggibili ora (dipendenze verdi):** `blog-seed` (PUB-451 — da `blog-content`, **date QUOTATE** per lo
schema zod). È l'ULTIMO eleggibile prima di `cutover` (PUB-501, per ULTIMO) e **quello che dà finalmente
contenuto reale**: finché assente, listing/post/sitemap-post rendono a vuoto / 404 (`listPosts` → `[]`).
**`blog-sitemap` (PUB-441) è CHIUSO+MERGIATO** (`0a30762`, atomico `5e17467`): `src/app/sitemap.ts` (la
sitemap landing di PUB-311) ora aggiunge, alle tre pagine stabili, **una voce per OGNI post pubblicato di
ENTRAMBI i locali** (`routing.locales.flatMap` su `listPosts`, esclusi i draft, PUB-411) con url assoluto
`<base>/<locale>/blog/<slug>` sulla base landing (`getLandingBaseUrl`, MAI l'Host né `getSiteBaseUrl` —
A05:2025 host-injection) e `alternates.languages` popolato **SOLO fra traduzioni REALI**
(`resolvePostAlternates`, P6A-D8/D9): il post tradotto porta le chiavi `it`+`es` (self + controparte), il post
mono-lingua **non emette alcun hreflang fittizio** (idioma identico a `generateMetadata` di `blog-post`
PUB-431: `alternates.length > 0 ? {…} : undefined`). Solo url pubblici della landing, mai host `app.`, mai
rotte non pubbliche; funzione **PURA** (nessun `headers()`) → `/sitemap.xml` resta prerenderizzata **Static**
in `next build`. Estensione **additiva**: le tre voci stabili di PUB-311 restano (provato nel test) e la suite
esistente `sitemap-landing.test.ts` resta verde (senza seed `listPosts` → `[]`, la sitemap resta a 3 voci).
Checkpoint 4/4 + mutazione 5/5, `next build` 0, e2e 37/37. Nessuna rotta API, nessuna migrazione, nessuna dep
nuova. Restano a valle `blog-seed` (PUB-451) e poi `cutover` (PUB-501). Sono **indipendenti fra loro sui
file**; `cutover` per ULTIMO.
**`blog-post` (PUB-431) è CHIUSO+MERGIATO** (`b7c0294`, atomico `6d55cf6`): la rotta del singolo post
`src/app/[locale]/(marketing)/blog/[slug]/page.tsx` (Server Component, SSG) — `generateStaticParams` enumera i
post di TUTTI i locali (`routing.locales.flatMap` su `listPosts`, PUB-411), la pagina rende `getPost().html`
via **`dangerouslySetInnerHTML` alimentato SOLO dall'HTML già sanificato** dalla pipeline `renderMarkdown`
(PUB-401, mai testo grezzo di corpo/frontmatter, A05:2025), emette un `<script type="application/ld+json">`
`@type Article` (headline dal frontmatter) serializzato con **`serializeJsonLdSafe` RIUSATO** (PUB-331,
anti-breakout del tag, montato come figlio testuale), e `generateMetadata` produce canonical/OG assoluti su
`getLandingBaseUrl()` (host landing, mai l'Host) + `alternates.languages` popolato **SOLO fra traduzioni REALI**
(`resolvePostAlternates`, P6A-D9: un post mono-lingua NON emette hreflang; con controparte il set è reciproco,
self incluso). Slug inesistente → `getPost` null → `notFound()` (404), come `/s/<slug>` (P4). Checkpoint 4/4 +
mutazione 5/5, `next build` 0 con `/[locale]/blog/[slug]` come **`●` SSG**, e2e 37/37. Nessuna rotta API, nessuna
migrazione, nessuna dep nuova. Restano a valle `blog-sitemap` (PUB-441) e `blog-seed` (PUB-451, date QUOTATE),
poi `cutover`. **`blog-list` (PUB-421) è CHIUSO+MERGIATO** (`12a3ca2`, atomico
`280e905`): la rotta di listing `src/app/[locale]/(marketing)/blog/page.tsx` (Server Component, SSG) —
`generateStaticParams` enumera `routing.locales` → `[{it},{es}]` (AC-421-2), carica i post con `listPosts(locale)`
(PUB-411) e **delega la resa delle card al componente client** `src/ui/marketing/BlogList.tsx` (renderizzabile in
jsdom sui cataloghi REALI, pattern `MarketingHome`/`PrivacyNotice`, sotto il chrome marketing PUB-131). Ogni card:
`title`/`description`/`date` + link `/<locale>/blog/<slug>`; un locale senza post → ramo lista-vuota (messaggio dal
catalogo), **nessuna card, nessuna eccezione** (AC-421-3). Nuovo namespace i18n `blog` in `messages/{it,es}.json`
(`pageTitle`/`listHeading`/`readMore`/`dateLabel`/`empty`), **parità di path-foglia it↔es** (AC-421-4), ES
localizzato non calco. **Sicurezza (A05:2025):** output solo testo JSX (escaping React); l'href per-locale nasce da
`locale` (allowlist del routing, 404 nel layout radice) e da uno slug già vincolato a `[a-z0-9-]+` dal loader
(PUB-411) — nessun valore libero raggiunge l'URL; la rotta UI legge SOLO dal dominio (`@/domain/blog/content`), MAI
da `src/data` (arch_check). Nessuna rotta API, nessuna migrazione, nessuna dep nuova. Restano a valle `blog-post`
(PUB-431, rende `getPost().html` + hreflang + JSON-LD Article), `blog-sitemap` (PUB-441), `blog-seed` (PUB-451, date
QUOTATE), poi `cutover`. **`blog-content` (PUB-411) è CHIUSO+MERGIATO** (`0a5b16b`, atomico `1954efd`): nuovo
modulo di dominio `src/domain/blog/content.ts` — il **loader** dei post sopra `content/blog/{it,es}/<slug>.md`,
poggiato sulla pipeline pura `renderMarkdown` (PUB-401). Espone `listPosts(locale, {root?})` (post del locale
esclusi i `draft`, ordinati per data DESC; `[]` se la dir non esiste ancora — il seed arriva con PUB-451),
`getPost(locale, slug, {root?})` (`{ slug, locale, frontmatter, html }` con html SANIFICATO, o `null` se il
file non esiste), `resolvePostAlternates(locale, slug, {root?})` (le traduzioni dell'ALTRO locale che
condividono `translationKey`; `[]` senza controparte = nessun hreflang fittizio, P6A-D9) e
`blogFrontmatterSchema` (zod: `title`/`description`/`date`/`translationKey` stringhe non vuote, `draft`
opzionale; fail-closed che NOMINA il campo mancante/invalido). **Sicurezza:** slug vincolato a `[a-z0-9-]+`
PRIMA di comporre il path (A01:2025 path-traversal, CWE-22: nessun `readFile` fuori da `content/blog`,
fail-closed a `null`; la stessa guardia filtra i nomi letti da `listPosts`); corpo sanificato a valle
(rehype-sanitize, PUB-401), frontmatter validato zod; `import 'server-only'` (la lettura FS non finisce nel
bundle client — risolto a empty.js nei test come gli adattatori `src/data/**`). **Root del contenuto
INIETTABILE** (default `join(process.cwd(),'content','blog')`) → il test gira su fixture temporanea senza
dipendere dal seed. `date` è una STRINGA ISO (nel markdown va QUOTATA, o YAML la coerce a Date e zod la
respinge — gotcha documentato per PUB-451). Nessuna rotta (la resa è di `blog-post` PUB-431), nessuna dep
nuova, nessuna migrazione. Sblocca l'intera catena blog a valle. **`blog-pipeline`
(PUB-401) è CHIUSO+MERGIATO** (`b1e41ce`, atomico `bcaa800`): modulo di dominio PURO
`src/domain/blog/markdown.ts` che esporta `renderMarkdown(raw): { frontmatter, html }` — `gray-matter`
per il frontmatter + catena `unified` (`remark-parse` → `remark-rehype` `allowDangerousHtml` →
`rehype-raw` → `rehype-sanitize` → `rehype-stringify`) per il corpo, SINCRONA (`processSync`) e
deterministica, nessun accesso a env/FS/rete. `rehype-raw` è la scelta che rende la sanificazione
OSSERVABILE (ri-parsa l'HTML grezzo in veri elementi hast, così `rehype-sanitize` lo VEDE e rimuove
`<script>`/`on*`/`javascript:` — P6A-D9); senza di esso `remark-rehype` scarterebbe l'HTML grezzo e la
mutazione «togli sanitize» sarebbe un placebo. 7 nuove dep runtime (unified, remark-parse, remark-rehype,
rehype-raw, rehype-sanitize, rehype-stringify, gray-matter) sotto OSV (0 nuovi ≥HIGH). Nessuna dep di
altri macrotask, nessuna rotta (la resa è di `blog-post` PUB-431), nessuna migrazione. Sblocca la catena
blog (→ `blog-content` → `blog-list`/`blog-post`/`blog-sitemap`/`blog-seed`). **`privacy-page` (PUB-341) è CHIUSO+MERGIATO**
(`a329b41`, atomico `65aa7a7`): pagina pubblica `/{locale}/privacy` sotto il chrome marketing
(PUB-131) + namespace i18n `privacy` (17 path-foglia, parità it↔es, ES localizzato non calco).
Client component `src/ui/marketing/PrivacyNotice.tsx` (`useTranslations('privacy')`, 7 sezioni con
`data-testid='privacy-<sezione>'`, output SOLO testo JSX — A05:2025); server wrapper sottile
`(marketing)/privacy/page.tsx` che NON ridefinisce canonical/OG (riusa il `metadataBase` del layout
marketing, PUB-321). Contenuto onesto v1 (P6A-D7): consenso come base giuridica, dati = email +
locale, NESSUN IP, conservazione Supabase EU, niente double opt-in. È la destinazione del link di
consenso del form (PUB-242). Nessuna dep nuova, nessuna migrazione. Sblocca (lato layout) nulla di
nuovo: i blog restano su `blog-pipeline`.
**`seo-jsonld` (PUB-331) è CHIUSO+MERGIATO** (`744b0ae`): due `<script type="application/ld+json">`
(`Organization` + `WebSite`) sulla home marketing, montati come **figlio testuale** con
`serializeJsonLdSafe` RIUSATO da `@/domain/generation/jsonld` (mai `dangerouslySetInnerHTML`); builder
PURI `src/domain/marketing/organization-jsonld.ts` (base landing + nome brand come argomenti). Sblocca
il lato JSON-LD di `blog-post` (PUB-431), che dipende da `seo-metadata` + `seo-jsonld`. **`seo-metadata`
(PUB-321) è CHIUSO+MERGIATO** (`374e2f7`): `generateMetadata` della home marketing (canonical fisso
landing + OG 1200×630 + twitter + hreflang HTML-level it/es) — RISOLVE il flag hreflang di seo-sitemap
con l’opzione (b) e sblocca il lato metadati di `blog-post` (PUB-431). **`seo-sitemap` (PUB-311) è
CHIUSO** (`52fb2c5`): `src/app/sitemap.ts` (MetadataRoute.Sitemap) landing — home + `/privacy` + indice
`/blog`, ognuno con hreflang IT↔ES da `getLandingBaseUrl` — è in main e materializza la Sitemap che
`robots.ts` (PUB-301) già nomina sul ramo `'landing'`. Sblocca `blog-sitemap` (PUB-441) sul lato SEO.

## 2. Macrotask corrente

- **`blog-sitemap` (20) CHIUSO+MERGIATO** (`0a30762`, atomico `5e17467`, branch `trueline/build/blog-sitemap`
  **cancellato** dopo il merge). Estende `src/app/sitemap.ts` (la sitemap landing di `seo-sitemap`, PUB-311):
  alle tre pagine stabili (home/`/privacy`/indice `/blog`, invariate in una `const stable`) aggiunge un blocco
  `posts` = `routing.locales.flatMap((locale) => listPosts(locale as BlogLocale).map(...))` — **una voce per OGNI
  post pubblicato di ENTRAMBI i locali** (esclusi i `draft`, ereditato da `listPosts` PUB-411), con `url` assoluto
  `${getLandingBaseUrl()}/${locale}/blog/${post.slug}` (base landing, **MAI** l'Host della richiesta né
  `getSiteBaseUrl` — A05:2025 host-injection/open-redirect) e `alternates.languages` popolato **SOLO fra
  traduzioni REALI** via `resolvePostAlternates` (P6A-D8/D9): il post tradotto porta `it`+`es` (self `[locale]:
  url` + le controparti reali), il post mono-lingua → `languages` è `undefined` → voce `{ url }` senza alcun
  hreflang fittizio. L'**idioma è identico** a `generateMetadata` di `blog-post` (PUB-431): `alternates.length >
  0 ? {…} : undefined`. Solo url pubblici della landing, mai host `app.`, mai rotte non pubbliche; **nessun
  `headers()`** → la funzione resta pura e `/sitemap.xml` resta **prerenderizzata Static** (`○`) in `next build`.
  L'estensione è **additiva**: le tre voci stabili restano (asserito nel test) e la suite esistente
  `sitemap-landing.test.ts` resta verde (senza seed `listPosts` → `[]`, la sitemap resta a 3 voci → `toHaveLength(3)`
  regge). Oracolo `tests/blog-sitemap.test.ts` (3 test, AC-441-1..3) col loader di dominio **mockato** (fixture:
  coppia tradotta `guida`↔`guia` + post solo-it `solo-it`), senza dipendere dal seed reale (PUB-451). **Nessuna UI
  machine-readable → nessun gate visivo dovuto** (XML). Nessuna rotta API, nessuna migrazione, nessuna dep nuova.
  Il prossimo BUILD è `blog-seed` (PUB-451, ultimo eleggibile: dà il contenuto reale IT+ES, **date QUOTATE**); poi
  `cutover` (PUB-501) per ULTIMO.
- **`blog-post` (19) CHIUSO+MERGIATO** (`b7c0294`, atomico `6d55cf6`, branch `trueline/build/blog-post` locale
  ancora presente). Rotta del singolo post `src/app/[locale]/(marketing)/blog/[slug]/page.tsx` (Server Component,
  SSG) dentro il route group `(marketing)` (chrome PUB-131). **`generateStaticParams`** enumera i post di TUTTI i
  locali (`routing.locales.flatMap((locale) => listPosts(locale).map(...))` → voci `{ locale, slug }`; con
  `content/blog` ancora vuoto il seed arriva con PUB-451 → 0 voci prerese, ma la rotta è registrata SSG `●`). La
  **page** carica `getPost(locale, slug)` (PUB-411): `null` → `notFound()` (404, come `/s/<slug>` P4); altrimenti
  rende `post.html` via **`dangerouslySetInnerHTML`** — l'**UNICO** html iniettato è quello GIÀ passato da
  `rehype-sanitize` nella pipeline PURA `renderMarkdown` (PUB-401), MAI testo grezzo di corpo/frontmatter
  (A05:2025) — con titolo/data come figli di testo React (escaping). Emette un `<script
  type="application/ld+json">` `@type Article` (headline/description/datePublished dal frontmatter) serializzato
  con **`serializeJsonLdSafe` RIUSATO** da `@/domain/generation/jsonld` (`<` `>` `&` U+2028/U+2029 → escape
  unicode: la chiusura del tag è irrappresentabile anche se il titolo la contenesse), montato come **figlio
  TESTUALE** del `<script>`, mai `innerHTML` grezzo. **`generateMetadata`**: `canonical =
  ${getLandingBaseUrl()}/${locale}/blog/${slug}` (host landing, mai l'Host della richiesta), `openGraph`
  (type `article`, url canonical, `images` 1200×630 placeholder, `locale` BCP-47), `twitter.card
  summary_large_image`, e **`alternates.languages` popolato SOLO fra traduzioni REALI** (`resolvePostAlternates`,
  P6A-D9): un post mono-lingua → nessun blocco `languages` (nessun hreflang fittizio); con controparte → set
  reciproco (self + i locali reali). **UI → gate visivo umano DOVUTO ma RINVIATO** (in blocco su tutta la
  superficie pubblica prima del `cutover`: la home È la demo). Nessuna rotta API, nessuna migrazione, nessuna dep
  nuova. Il prossimo BUILD sceglie un eleggibile della catena blog: `blog-sitemap` (PUB-441) o `blog-seed`
  (PUB-451) — indipendenti fra loro sui file; `cutover` per ULTIMO.
- **`blog-list` (18) CHIUSO+MERGIATO** (`12a3ca2`, atomico `280e905`, branch `trueline/build/blog-list` locale
  ancora presente). Rotta di listing `src/app/[locale]/(marketing)/blog/page.tsx` (Server Component, SSG):
  `generateStaticParams` → `[{it},{es}]`; carica i post con `listPosts(locale)` (PUB-411) e **delega la resa al
  componente client** `src/ui/marketing/BlogList.tsx` (jsdom-provabile sui cataloghi REALI, pattern
  `MarketingHome`/`PrivacyNotice`, sotto il chrome marketing PUB-131). Card: `title`/`description`/`date` + link
  `/<locale>/blog/<slug>`; lista vuota → ramo lista-vuota (messaggio dal catalogo `blog.empty`), nessuna card,
  nessuna eccezione. Nuovo namespace i18n `blog` in `messages/{it,es}.json` (`pageTitle`/`listHeading`/`readMore`/
  `dateLabel`/`empty`), parità it↔es, ES localizzato. **Sicurezza (A05:2025):** solo testo JSX; href da `locale`
  (allowlist routing) + slug `[a-z0-9-]+` (loader) — nessun valore libero nell'URL; rotta UI legge SOLO dal dominio,
  mai da `src/data`. **UI → gate visivo umano DOVUTO ma RINVIATO** (coerente col gate landing rinviato: la home È la
  demo; da valutare in blocco su tutta la superficie pubblica prima del `cutover`). Nessuna rotta API, nessuna
  migrazione, nessuna dep nuova. Il prossimo BUILD sceglie un eleggibile della catena blog: `blog-post` (PUB-431),
  `blog-sitemap` (PUB-441) o `blog-seed` (PUB-451) — indipendenti fra loro sui file; `cutover` per ULTIMO.
- **`blog-content` (17) CHIUSO+MERGIATO** (`0a5b16b`, atomico `1954efd`, branch `trueline/build/blog-content`
  locale ancora presente). Nuovo modulo di dominio `src/domain/blog/content.ts`: `listPosts`/`getPost`/
  `resolvePostAlternates` + `blogFrontmatterSchema` (zod). Legge `content/blog/{it,es}/<slug>.md` con **root
  iniettabile** (default alla dir reale); usa `renderMarkdown` (PUB-401) per l'HTML sanificato del corpo e
  valida il frontmatter con zod (fail-closed che nomina il campo). Guardia anti path-traversal `[a-z0-9-]+`
  sullo slug PRIMA di comporre il path; `import 'server-only'` (la lettura FS mai nel bundle client);
  ordinamento per data DESC (stringa ISO quotata), `draft` esclusi da `listPosts`, accoppiamento traduzioni
  per `translationKey` senza alternate fittizi (P6A-D9). **Nessuna UI → nessun gate visivo dovuto.** Il
  prossimo BUILD sceglie un eleggibile della catena blog: `blog-list` (PUB-421), `blog-post` (PUB-431),
  `blog-sitemap` (PUB-441) o `blog-seed` (PUB-451) — indipendenti fra loro sui file; `cutover` per ULTIMO.
- **`blog-pipeline` (16) CHIUSO+MERGIATO** (`b1e41ce`, atomico `bcaa800`, branch locale ancora presente).
  Nuovo modulo di dominio PURO `src/domain/blog/markdown.ts`: `renderMarkdown(raw: string): { frontmatter:
  Record<string, unknown>; html: string }`. `gray-matter` estrae il frontmatter (mappa opaca — la
  validazione zod + `translationKey` sono di `blog-content` PUB-411); la catena `unified`
  (`remark-parse` → `remark-rehype` con `allowDangerousHtml: true` → `rehype-raw` → `rehype-sanitize`
  schema di default → `rehype-stringify`) converte il corpo in HTML SANIFICATO. Il processore è costruito
  e **congelato** una sola volta (`.freeze()`) e riusato: `processSync` → PURA, SINCRONA, deterministica,
  nessun accesso a env/FS/rete (dominio puro, confermato dal contratto globale `architecture-contract`).
  **Decisione di implementazione (oltre i 6 dep del DoD): aggiunto `rehype-raw`.** Il DoD elencava la
  catena-scheletro senza `rehype-raw`, ma `remark-rehype` di default SCARTA l'HTML grezzo del markdown →
  `<script>`/`<img onerror>` sparirebbero da soli e `rehype-sanitize` non avrebbe nulla da rimuovere
  (placebo). Con `allowDangerousHtml` + `rehype-raw` l'HTML grezzo entra come nodi `raw`, viene ri-parsato
  in veri elementi hast, e SOLO allora `rehype-sanitize` li VEDE e neutralizza (P6A-D9, A05:2025). Prova
  empirica: con la catena completa `<script>`/`onerror`/`onclick` rimossi e `<h1>`/`<p>` presenti; togliendo
  `rehype-sanitize` SOPRAVVIVONO (→ la mutazione M1 è rossa, non placebo). La resa dell'HTML nella pagina è
  di `blog-post` (PUB-431), il loading dei file di `blog-content` (PUB-411). **Nessuna UI → nessun gate
  visivo dovuto.** Il prossimo BUILD sceglie l'eleggibile `blog-content` (PUB-411, unica dip = questo
  macrotask, ora verde); a valle `blog-list`/`blog-post`/`blog-sitemap`/`blog-seed`, poi `cutover` per ultimo.
- **`seo-jsonld` (14) CHIUSO+MERGIATO** (`744b0ae`, atomico `853aa09`, branch cancellato). Aggiunge alla
  home marketing (`src/app/[locale]/(marketing)/page.tsx`, server component) due blocchi JSON-LD di
  schema.org — `Organization` e `WebSite` — costruiti da funzioni PURE (`src/domain/marketing/organization-jsonld.ts`:
  `buildOrganizationJsonLd(baseUrl, name)` / `buildWebSiteJsonLd(baseUrl, name)`, nessun accesso a env,
  base e nome sono ARGOMENTI), serializzati con `serializeJsonLdSafe` **RIUSATO** da
  `@/domain/generation/jsonld` (`<` `>` `&` U+2028/U+2029 → escape unicode) e montati come **figlio
  TESTUALE** di `<script type="application/ld+json">` (mai `dangerouslySetInnerHTML` né concatenazione
  grezza — P6A-D8, A05:2025). La base nasce da `getLandingBaseUrl()` (`NEXT_PUBLIC_LANDING_URL`, mai
  l'Host della richiesta), il nome brand da `getBrandName()`; gli `<script>` sono fratelli del `<main>`
  della home (come il JSON-LD LocalBusiness della serving T-410, P4, che resta sulle rotte `/s/<slug>`,
  NON su questa). Sblocca il lato JSON-LD di `blog-post` (PUB-431). Il prossimo BUILD sceglie un
  eleggibile (§1): `privacy-page` (PUB-341 — da `marketing-layout`) o `blog-pipeline` (PUB-401 — nuove
  dep markdown/rehype).
- **`seo-metadata` (13) CHIUSO+MERGIATO** (`374e2f7`, atomico `16318d7`, branch cancellato). `src/app/[locale]/(marketing)/layout.tsx` fissa `metadataBase` (host landing da
  `getLandingBaseUrl`, UNA volta) e `src/app/[locale]/(marketing)/page.tsx` aggiunge `generateMetadata` alla
  home: canonical = `getLandingBaseUrl()` (P6A-D4, invariante a locale/Host), `alternates.languages { it, es }`
  (hreflang HTML-level reciproco), `openGraph` title/description/url + `images` 1200×630 placeholder,
  `twitter.card ’summary_large_image’`; title/description da `landing.meta.*` (it/es). Il precedente
  `seo-sitemap` (12) resta mergiato: `src/app/sitemap.ts`
  (`MetadataRoute.Sitemap`, file convention Next) è la sitemap della LANDING (`/sitemap.xml`), sorella
  pubblica della sitemap per-sito `/s/<slug>/sitemap.xml` (P4). Emette le **tre pagine stabili** — home
  (`${base}/it`), `/privacy`, indice `/blog` — ciascuna con **una voce** `alternates.languages { it, es }`
  (hreflang tra i soli `routing.locales`, `localePrefix 'always'` → anche `it` è prefissato). L'origine di
  OGNI URL nasce SEMPRE da `getLandingBaseUrl()` (`NEXT_PUBLIC_LANDING_URL`), **mai** `getSiteBaseUrl` né
  l'Host della richiesta (A05:2025 host-injection/open-redirect): la funzione è **pura** rispetto alla
  richiesta (nessun `headers()`) → `/sitemap.xml` resta **statico** (`○`), diverso da `robots.ts` che è
  `ƒ`. I singoli post del blog restano fuori (li aggiunge `blog-sitemap`, PUB-441). Il prossimo BUILD
  sceglie un eleggibile (§1) rispettando il DAG: `seo-jsonld` (PUB-331 → JSON-LD via `serializeJsonLdSafe`),
  `privacy-page` (da `marketing-layout`), `blog-pipeline` (PUB-401) — indipendenti tra loro.
- **Metodo**: UN macrotask per sessione via **dynamic workflow command-free** (builder solo Read/Write/
  Edit; oracoli — checkpoint 4/4 + mutazione — in **foreground** dall'orchestratore, unico giudice del
  verde). Vedi 00-INDEX §Granularità e la memoria `dynamic-workflow-build-method`.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/blog-sitemap` (atomico `5e17467`, **mergiato** in `main`; branch locale **cancellato** dopo il merge) |
| Ultimo commit | `0a30762` (merge `--no-ff` blog-sitemap in main) + docs session-end (in corso) |
| Stato merge su `main` | **done** (via umana esplicita → merge `0a30762` → push, deploy coupled; nessuna migrazione) |
| Deploy-coupling | **coupled** (push su `main` = deploy su ulaba.net) → verifica locale FATTA prima del merge (vitest full **2024 passati / 1 rosso** = **lo STESSO** TS2589 scaffold pre-esistente invariante `scaffold.test.ts`→`e2e/effects.spec.ts:103` — riprodotto con i file del macrotask STASHATI su clean main, quindi NON è una regressione; **+3 test nuovi** = `blog-sitemap.test.ts` 3/3; tsc solo il TS2589 invariante, nessun errore nuovo sui file del macrotask; next build exit 0 con **`/sitemap.xml` `○` Static**; **e2e Chromium 37/37**). Nessuna migrazione. Nessuna rotta API. Nessuna dep nuova. Push OK (`dc714db..0a30762`) |

## 4. Baseline & budget

- **`blog-sitemap` (PUB-441):** C1 green con **`dead-code:0 dup:247 cycle:0 twin:degr` e blockers VUOTI**
  (nessuna regressione d'igiene NUOVA). Nessun dead-code nuovo: `sitemap.ts` è un file convention Next
  (default export = entrypoint di rotta, riconosciuto da knip) e `tests/blog-sitemap.test.ts` importa `sitemap` +
  i tipi `BlogLocale`/`BlogPostSummary`/`PostAlternate` (già consumati da `content.ts`). **Nota di ri-baseline
  ONESTA:** al primo giro C1 segnalava **1 duplication NUOVO** con blocker in `eval/reference-app/src/app/[locale]/
  (marketing)/blog/[slug]/page.tsx` — un path **fuori dal repo** (fixture interna della skill Trueline, non su
  disco qui). Verificato con **A/B stash**: la stessa identica duplicazione (fingerprint `c8d6398c…`, `dup:247`)
  compare su **clean main con i file del macrotask STASHATI** → delta ZERO da PUB-441, drift ambientale
  pre-esistente. Aggiunto QUEL SOLO fingerprint alla `.trueline/hygiene-baseline.json` (versionata via negazione
  `!/.trueline/hygiene-baseline.json`; le altre `.trueline/*` gitignorate) → C1 verde `0 nuovi`. C2 green
  (`gitleaks:3 scan-scope-escl:28 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**): **nessuna dep nuova** (osv `4`
  invariato), nessun segreto (nessun env nel sorgente; la sitemap non tocca `src/data`/`service_role`), nessuna
  tabella/policy RLS toccata (rotta pubblica statica). Gli url nascono da `getLandingBaseUrl()`, mai dall'Host
  (host-injection chiuso alla sorgente). tsc: nessun errore nuovo sui file del macrotask — resta **solo** il
  TS2589 invariante di `e2e/effects.spec.ts:103` (pre-esistente su clean main).
- **`blog-post` (PUB-431):** C1 green con **`dead-code:0 dup:246 cycle:0 twin:degr` e blockers VUOTI** (nessuna
  regressione d'igiene NUOVA). Nessun dead-code nuovo: `generateStaticParams` + `generateMetadata` + il default
  della `page.tsx` sono entrypoint di rotta Next (knip li riconosce) e `tests/blog-post-route.test.tsx` importa
  tutti e tre; nessun export orfano (i tipi importati dal test — `BlogLocale`/`BlogPost`/`PostAlternate` — sono di
  `content.ts`, già consumati). C2 green (`gitleaks:3 scan-scope-escl:26 osv:4 semgrep:0 rls:3`, **0 nuovi
  ≥HIGH**): **nessuna dep nuova** (osv `4` invariato), nessun segreto (nessun env nel sorgente; la rotta non tocca
  `src/data`/`service_role`), nessuna tabella/policy RLS toccata (rotta pubblica statica). **Nota su
  `dangerouslySetInnerHTML`:** semgrep è DIFFERITO a M4 nel checkpoint di questo ecosistema (C2 = gitleaks + rls +
  osv), quindi non produce finding qui; la sicurezza del sink è provata **sull'effetto** dal target_test
  (l'unico html è `post.html` già sanificato da `rehype-sanitize`; gli unici `<script>` sono `ld+json`) e dalla
  mutazione M1/M3 (feed dal frontmatter / `JSON.stringify` nudo → ROSSI). tsc: nessun errore nuovo sui file del
  macrotask — resta **solo** il TS2589 invariante di `e2e/effects.spec.ts:103` (Playwright `evaluateAll` generico,
  file immutato dal 2026-08-13, riprodotto coi file del macrotask rimossi ⇒ pre-esistente, NON regressione; NON
  intercettato da `next build`, il cui type-check app-reachable passa in 17s). next build exit 0 con
  `/[locale]/blog/[slug]` marcata **`●` (SSG)** — `generateStaticParams` gira al build (0 voci finché il seed
  PUB-451 non posa i `.md`). Mutazione **5/5** (§5).
- **`blog-list` (PUB-421):** C1 green con **`dead-code:0 dup:246 cycle:0` e blockers VUOTI** (nessuna
  regressione d'igiene NUOVA; i pre-esistenti restano segnalati). Nessun dead-code nuovo: gli export del
  macrotask sono tutti CONSUMATI — `generateStaticParams` + il default della `page.tsx` sono entrypoint di rotta
  Next (knip li riconosce) e `tests/blog-list-route.test.tsx` importa sia `generateStaticParams` sia `BlogList`/
  `BlogListItem`; la `page.tsx` importa `BlogList`/`BlogListItem`. C2 green (`gitleaks:3 scan-scope-escl:26 osv:4
  semgrep:0 rls:3`, **0 nuovi ≥HIGH**): **nessuna dep nuova** (osv invariato), nessun segreto (nessun env nel
  sorgente; la rotta non tocca `src/data`/`service_role`), nessuna tabella/policy RLS toccata (superficie pubblica
  statica). tsc: nessun errore nuovo sui file del macrotask (solo il TS2589 invariante di `e2e/effects.spec.ts`);
  next build exit 0 con `/[locale]/blog` nel route table (marcata `ƒ` come home/privacy — il layout radice legge
  il cookie locale via `resolveInitialLocale`, quindi la rotta è server-rendered on-demand pur con
  `generateStaticParams` presente; comportamento identico alle altre pagine marketing, non una regressione).
- **`blog-content` (PUB-411):** C1 green con **`dead-code:0 dup:246 cycle:0` e blockers VUOTI**. **Gotcha
  affrontato in-sessione:** al primo giro C1 era **rosso** con **2 dead-code NUOVI** su `content.ts` —
  `blogFrontmatterSchema` (export) e `BlogFrontmatter` (tipo). Non era codice morto accidentale: il DoD
  **impone** di esportare lo schema zod (consumatori a valle: `blog-list`/`blog-post`). Risolto **senza
  baseline** e in modo migliore: aggiunti 3 test che **importano ed esercitano lo schema** (fail-closed che
  nomina il campo + `draft` opzionale + `title` vuoto), coprendo un **bullet del DoD fuori dai 5 AC** e
  rendendo gli export CONSUMATI (knip segue gli import dei `.test.ts` via plugin vitest) → C1 verde, 0
  fingerprint aggiunti alla baseline (resta **247**). C2 green (`gitleaks:3 osv:4 semgrep:0 rls:3`, **0
  nuovi ≥HIGH**): **nessuna dep nuova** (osv invariato), nessun segreto (FS server-side dietro `server-only`,
  nessun env nel sorgente), nessuna tabella/policy RLS toccata. tsc: nessun errore nuovo (solo il TS2589
  invariante di `e2e/effects.spec.ts`); eslint 0 sui 2 file. next build exit 0, route list invariata (loader
  di dominio, non una rotta).
- **`blog-pipeline` (PUB-401):** C1 green con **`dead-code:0 dup:246 cycle:0` e blockers VUOTI** (0 cloni
  nuovi): il nuovo modulo `src/domain/blog/markdown.ts` è clone-free (catena `unified` minimale, nessun
  preambolo strutturale condiviso) e il `.test.ts` è escluso dal corpus jscpd → **nessun ratchet**, la
  baseline resta a **247** fingerprint (il `dup:246` è il conteggio raw jscpd corpus-sensitive, non
  fingerprint nuovi). C2 green (`gitleaks:3 scan-scope-escl:46 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**):
  **le 7 nuove dep del blog (unified/remark-parse/remark-rehype/rehype-raw/rehype-sanitize/rehype-stringify/
  gray-matter) passano OSV senza nuovi ≥HIGH** — `osv:4` invariato (le voci pre-esistenti: postcss + altre;
  `nanoid` HIGH via postcss e `qs` via stripe erano GIÀ nel lock di `main` prima di questo BUILD → non sono
  finding NUOVI del macrotask). Nessun segreto nel sorgente (dominio puro, nessun env/FS/rete), nessuna
  policy RLS toccata, la difesa anti-XSS è LIBRERIA provata (`rehype-sanitize`), non artigianale. tsc:
  nessun errore nuovo (solo il TS2589 invariante di `e2e/effects.spec.ts`). **Nota OSV/C2 (registrazione
  dep, session-end punto 4):** primo macrotask del workstream a introdurre dep nuove; il gate OSV le vede e
  le assolve.
- **`privacy-page` (PUB-341):** C1 green con **`dead-code:0 dup:248 cycle:0` e blockers VUOTI** (0 cloni
  nuovi): il componente `PrivacyNotice.tsx` è ripetitivo per struttura (7 sezioni simili) ma **sotto la
  soglia jscpd** (i blocchi `<section>` variano per `data-testid`/`id`/chiave i18n; nessuna sequenza
  verbatim ≥ `min_tokens`), il wrapper `page.tsx` è minimale, i JSON i18n e il `.test.tsx` sono fuori dal
  corpus jscpd (o additivi) → **nessun ratchet**, baseline resta a **247** fingerprint. C2 green
  (`gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**): pagina statica solo-testo, copy dai cataloghi
  i18n (nessun `innerHTML`, escaping React — A05:2025), l'email di contatto `privacy@ulaba.net` è dato
  pubblico (non un segreto → gitleaks invariato), **nessuna dep nuova** (osv invariato), nessuna tabella/
  policy RLS toccata (rls invariato). tsc: nessun errore nuovo (solo il TS2589 invariante di
  `e2e/effects.spec.ts`); i tipi `itMessages.privacy[key]` risolvono via `messages.d.ts` (`typeof it.json`),
  che ora include il namespace `privacy`.
- **`seo-jsonld` (PUB-331):** C1 green con **`dup:248` e blockers VUOTI** (0 cloni nuovi): il nuovo
  modulo `src/domain/marketing/organization-jsonld.ts` è clone-free (builder minimi, nessun preambolo
  strutturale condiviso), le ~27 righe aggiunte a `(marketing)/page.tsx` non introducono cloni e il
  `.test.ts` è escluso dal corpus jscpd → **nessun ratchet**, baseline resta a **247** fingerprint. C2
  green (`gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**): il JSON-LD è solo-logica, la difesa
  anti-XSS è il riuso di `serializeJsonLdSafe` (nessuna serializzazione artigianale), base/nome da env
  pubbliche (`getLandingBaseUrl`/`getBrandName`, mai l'Host della richiesta — A05:2025), nessun segreto,
  nessuna nuova policy RLS, nessuna dep. tsc: nessun errore nuovo (solo il TS2589 invariante di
  `e2e/effects.spec.ts`).
- **`seo-metadata` (PUB-321):** C1 green con **`dup:248` e blockers VUOTI** (0 cloni nuovi): i due file
  toccati (`(marketing)/layout.tsx` +metadataBase, `(marketing)/page.tsx` +`generateMetadata`) non introducono
  preambolo clonato e il `.test.ts` è escluso dal corpus jscpd → **nessun ratchet**, baseline resta a **247**.
  C2 green (`gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**): canonical/OG/metadataBase nascono da
  `getLandingBaseUrl` (env, mai l’Host della richiesta né testo libero — A05:2025), nessun segreto (la site key
  resta di `waitlist-form`), nessuna nuova policy RLS, nessuna dep. tsc: nessun errore nuovo (solo il TS2589
  invariante di `e2e/effects.spec.ts`); la union `Twitter` di Next non espone `card` in accesso diretto → nel
  test si asserisce con `toMatchObject`, non con `.card`.
- **`seo-sitemap` (PUB-311):** C1 green con **`dup:248` e blockers VUOTI** (0 cloni nuovi): `src/app/sitemap.ts`
  è un modulo nuovo e clone-free (non condivide preambolo strutturale né con `robots.ts` né con il route
  handler della sitemap per-sito), i `.test.ts` sono esclusi dal corpus jscpd → **nessun ratchet**, la
  baseline resta a **247** fingerprint. C2 su `seo-sitemap` = `gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi
  ≥HIGH**: la sitemap è solo-logica, nessun segreto (le basi da env via `getLandingBaseUrl`, gli hreflang
  dai soli `routing.locales`), nessun dato privato/enumerazione DB, nessuna nuova policy RLS. tsc: nessun
  errore nuovo (solo il TS2589 pre-esistente di `e2e/effects.spec.ts`); il tipo `Object.fromEntries(...)`
  (`Record<string,string>`) è assegnabile a `Languages<string>` (chiavi tutte opzionali). Revisione
  avversariale (workflow 3 lenti + verify): **0 finding confermati**; l'unico rilievo — hreflang
  **una-voce-per-pagina** (idioma `MetadataRoute` di Next) invece di una voce per-locale reciproca — è
  **conforme al DoD P6A-D8** (auto-ammesso "not a deviation"), registrato come flag di design in §6, non
  bloccante.
- **`seo-robots` (PUB-301):** C1 ha mostrato **1 clone NUOVO** (`dup:248`, fingerprint
  `1cbd93ae6dc47486d112f33d8415ec3f`) su `src/ui/waitlist/waitlist-calls.ts` — la **coppia gemella
  PRE-ESISTENTE** `domain-calls.ts ↔ waitlist-calls.ts` (il confine POST same-origin, gemello dichiarato
  da PUB-241), sotto-soglia a `waitlist-form` e **affiorata dal cambio-corpus jscpd** dei miei file
  `robots.ts`/`env.ts`. Triangolazione diretta (`pub-c1-triangulate.mjs`, jscpd@50): dei **248 cloni,
  `clonesTouchingMyDiff: 0`** → i miei 5 file aggiungono **0 cloni**; il +1 è codice PRE-ESISTENTE su
  main. Risoluzione = **ratchet additivo onesto 246→247 fingerprint** (`pub-hygiene-ratchet.mjs`), NON
  un refactor dei confini (fuori scope); dopo il ratchet C1 torna green (0 nuovi). C2 su `seo-robots` =
  `gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**: `robots.ts` è solo-logica, nessun segreto
  (l'host arriva da `headers()` + allowlist `classifyRequestHost`, mai testo libero; le basi da env), il
  ramo app è disallow-all (nessun leak dell'host app dal robots landing, AC-301-3). **Nota C2**: al
  PRIMO run C2 era rosso con **2 gitleaks CRITICAL su `docs/…/SESSION-STATE.md`** — la prosa citava
  verbatim un pattern `identificatore-KEY = 'stringa≥24'` (il lesson di `waitlist-form` sul FP
  `trueline-generic-assigned-secret`), aggiunto dal session-end di `waitlist-form` (`c9e156b`) DOPO il
  suo checkpoint → primo checkpoint che lo vede. **FP documentale** (il valore è il NOME di una env
  pubblica). Gitleaks gira **working-tree** (non history) → **eliminato alla radice** riscrivendo le 2
  righe di prosa (rotto il pattern assegnazione), NON baselinato (coerente col lesson: NON baselinare un
  FP eliminabile). Dopo il fix `gitleaks:3` (torna alla baseline).
- **Baseline di sicurezza** (C2): `gitleaks/osv/semgrep/rls` — con `waitlist-schema` l'oracolo RLS vede
  ora `waitlist_leads` e emette **`RLS002_NO_POLICY` MEDIUM** (RLS enabled + zero policy = deny-all): è
  la **postura VOLUTA** (P6A-D5), **NON blocca** (gate C2 = ≥HIGH; MEDIUM è sotto soglia). `rls:3` = 2
  HIGH pre-esistenti baselinati (`site_publications`, `site_domains`) + questo 1 nuovo MEDIUM. **Baseline
  security NON modificata**: la voce non va baselinata perché è già sotto la soglia di gate (diversamente
  dalle 2 HIGH, baselinate proprio perché altrimenti bloccherebbero). Le nuove dep del blog passeranno
  OSV al loro BUILD. In `captcha-port` C2 = `gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**: il
  `TURNSTILE_SECRET_KEY` è letto **solo da env** (`source` iniettabile nei test), MAI nel sorgente, e
  `import 'server-only'` tiene l'adattatore fuori dal bundle client (gitleaks non vede segreti; nel verde
  nessuna chiave reale, solo un fake + `fetchImpl` iniettato).
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` — ratchet additivo **237→244** in `host-classify`
  (7 cloni PRE-ESISTENTI su main: 5 doc bootstrap p6a + 2 file P5, provati fuori dal diff del macrotask),
  poi **244→245** in `marketing-home` (1 clone PRE-ESISTENTE `MarketingHeader`↔`MarketingFooter` fp
  `c40fc0b6`: il preambolo `'use client'`+import+commento PUB-131 di marketing-layout, 51 token / 1
  sopra-soglia, latente dal merge di marketing-layout e affiorato dal cambio-corpus jscpd; codice
  committato fuori dal diff del macrotask, i file di `marketing-home` aggiungono 0 cloni). In
  `waitlist-schema` C1 ha mostrato `dup:246` (raw) ma **0 nuovi fingerprint** (blockers vuoti, C1 green):
  `.sql` non è nel corpus jscpd e i `.test.ts` sono esclusi → né la migrazione né il test aggiungono
  cloni; il +1 raw è re-partizione del conteggio jscpd (corpus-sensitive, già visto), **nessun ratchet**.
  In `waitlist-store` C1 conferma `dup:246` con **blockers vuoti** (C1 green): `src/data/waitlist.ts` e'
  clone-free (gemello di `SiteDomainWriteStore`, già in baseline) e il `.test.ts` e' escluso dal corpus →
  **0 nuovi cloni, nessun ratchet** (baseline resta a 245). C2 su `waitlist-store` = `gitleaks:3 osv:4
  semgrep:0 rls:3`, **0 nuovi ≥HIGH** (writer server puro, nessun segreto, nessuna nuova policy RLS: il
  modulo scrive via service_role, non tocca la postura di `waitlist_leads`). In `captcha-port` C1 conferma
  `dup:246` con **blockers vuoti** (C1 green): la porta è gemella di `domain-port` e l'adattatore gemello
  di `vercel.ts` (entrambi i pattern già in baseline), i `.test.ts` esclusi dal corpus → **0 nuovi cloni,
  nessun ratchet** (baseline resta a 245). In `waitlist-endpoint` C1 conferma `dup:246` con **blockers
  vuoti** (C1 green): il route handler condivide il preambolo guard+parse+`jsonError` con `generate`/
  `domains/connect` ma sotto-soglia jscpd (nessun clone nuovo), il getter `getTurnstileVerifier` è gemello
  di `getVercelDomainProvider` e i `.test.ts` sono esclusi dal corpus → **0 nuovi cloni, nessun ratchet**
  (baseline resta a 245). In `waitlist-form` C1 ha mostrato **1 clone NUOVO** (`dup:247`, fingerprint
  `a58520bad9f5ce3b39f6ff954c4ef355`) su `src/app/api/domains/connect/route.ts` [116-123] ↔
  `waitlist/route.ts` [66-73] e `generate/route.ts` [105-112] — il **preambolo dei route handler**
  (guard+parse+`jsonError`, 65 token) che a `waitlist-endpoint` era sotto-soglia e ora è affiorato dal
  **cambio-corpus jscpd** dei miei 2 file client. Prova triangolata su `.trueline/jscpd-c1`: **0 dei 137
  cloni tocca `waitlist-calls.ts`/`WaitlistForm.tsx`/`MarketingHome.tsx`** → il mio diff aggiunge **0
  cloni**; il +1 è codice PRE-ESISTENTE su main, fuori dal diff. Risoluzione = **ratchet additivo onesto
  245→246 fingerprint** (`pub-hygiene-ratchet.mjs`), NON un refactor dei route (fuori scope, churn su file
  non toccati); dopo il ratchet C1 torna green (0 nuovi). C2 su `waitlist-endpoint` = `gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi
  ≥HIGH**: nessun segreto nel sorgente (il secret Turnstile resta dietro l'adattatore `server-only`, letto
  da env nel getter), **nessuna `service_role` nel percorso utente** (la scrittura passa SOLO da
  `insertLead`), same-origin presente (`guardMutatingRequest`), nessuna nuova policy RLS. In
  `waitlist-form` C2 ha inizialmente segnalato **1 finding NUOVO ≥HIGH** (`gitleaks:4`, CRITICAL) su
  `tests/ui-waitlist-form.test.tsx`: il rule custom della skill `trueline-generic-assigned-secret` ha
  colto la costante di test `SITE_KEY` col NOME dell'env `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — identificatore "sensibile" (contiene KEY) +
  valore ≥24 char `[a-z0-9_-]`. **Falso positivo** (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` è il NOME della env,
  non un segreto; e la site key è comunque PUBBLICA). Fix onesto = **rinominare** la costante di test
  `SITE_KEY`→`TURNSTILE_ENV` (identificatore non-sensibile) così il rule non scatta più — NON un baseline
  del FP: dopo il fix C2 = `gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**. Il componente
  `WaitlistForm.tsx` legge la site key con `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY` (RHS non-quotata →
  il rule non la vede) e non contiene alcun segreto (solo la site key pubblica, A07:2025).
- **Budget**: un macrotask alla volta; loop di fix con tetto in `references/oracles/thresholds.md`.

## 5. Esiti dell'ultima sessione (framing onesto)

**BUILD `blog-sitemap` (PUB-441) — CHIUSO+MERGIATO (`0a30762`, atomico `5e17467`).** `src/app/sitemap.ts`
(la sitemap landing di PUB-311) ora aggiunge alle tre pagine stabili una voce per OGNI post pubblicato di
ENTRAMBI i locali (`routing.locales.flatMap` su `listPosts`, esclusi i draft, PUB-411), con url assoluto
`<base>/<locale>/blog/<slug>` su `getLandingBaseUrl()` (mai l'Host — A05:2025) e `alternates.languages`
popolato SOLO fra traduzioni reali (`resolvePostAlternates`, P6A-D8/D9): post tradotto → `it`+`es` (self +
controparte), post mono-lingua → `{ url }` senza hreflang fittizio (idioma identico a `generateMetadata` di
`blog-post`). Funzione pura (nessun `headers()`) → `/sitemap.xml` resta Static (`○`). Estensione additiva: le
tre voci stabili restano e `sitemap-landing.test.ts` resta verde (senza seed `listPosts`→`[]`).

- **Metodo:** dynamic workflow command-free — **2 builder paralleli su file disgiunti** (impl `sitemap.ts` +
  test `blog-sitemap.test.ts`), briefs chirurgici (righe deterministiche perché i mutanti agganciassero
  stringhe stabili); tutta la verifica (checkpoint 4/4 + mutazione + next build + e2e) in **foreground**
  dall'orchestratore. Nessuna deriva: i due builder hanno prodotto codice corretto, nessun fix di logica/
  collocazione dall'orchestratore.
- **Checkpoint 4/4 verde (dal JSON):** C1 dead-code green (`dup:247`, blockers vuoti — dopo ri-baseline
  onesta del fingerprint pre-esistente, sotto); C2 security green (`gitleaks:3 osv:4 semgrep:0 rls:3`, 0
  nuovi ≥HIGH); C3 regressioni green (**2024 passed / 1 rosso** = TS2589 scaffold invariante PRE-ESISTENTE,
  riprodotto con i file STASHATI su clean main); C4 conformità green (`blog-sitemap.test.ts` **3/3**,
  AC-441-1..3). **Mutazione 5/5** (red && restored bit-identico): M1 hreflang-fittizio-mono (AC-441-3), M2
  url-base-relativa (AC-441-1), M3 mai-hreflang (AC-441-2), M4 nessun-post-in-sitemap (AC-441-1), M5
  self-hreflang-omesso (AC-441-2). `next build` exit 0 (`/sitemap.xml` `○` Static); e2e Chromium **37/37**.
- **Lezioni (carry-over):** (1) **Ri-baseline C1 solo dopo A/B stash.** Il primo giro C1 dava "1 duplication
  NUOVO" con blocker in `eval/reference-app/.../blog/[slug]/page.tsx` (path fuori dal repo = fixture interna
  della skill; fingerprint content-based, path-indipendente — coerente con la lezione storica in §6). La prova
  che NON è mia: `git stash -u` dei file del macrotask → `node .trueline/pub-checkpoint.mjs` mostra la
  **stessa identica** duplicazione (stesso fingerprint `c8d6398c…`, stesso `dup:247`, un solo blocker) su clean
  main → **delta zero**. Se avessi introdotto un clone nuovo, il giro con-modifiche avrebbe mostrato un
  fingerprint diverso o `dup:248`; non è successo. Aggiunto QUEL SOLO fingerprint alla baseline (mirata,
  onesta). (2) **`.trueline/hygiene-baseline.json` è VERSIONATO** (negazione `!/.trueline/hygiene-baseline.json`
  in `.gitignore` che altrimenti ignora `/.trueline/*`) → va nel commit atomico; il resto di `.trueline/`
  (mutant harness incluso) è gitignorato e NON entra. (3) **Test di funzione pura = ambiente node** (nessun
  `// @vitest-environment jsdom`), loader di dominio mockato (fixture coppia+mono) come `blog-post`/`blog-list`
  — nessuna dipendenza dal seed. (4) L'estensione additiva va **provata** (asserto che la voce home stabile
  resta) per uccidere una mutazione che azzeri l'array o che rompa `stable`. (5) Verdetto dal JSON del
  checkpoint (green/summary/blockers[]), mai dall'exit code.

**BUILD `blog-post` (PUB-431) — CHIUSO+MERGIATO (`b7c0294`, atomico `6d55cf6`).** La rotta del singolo post
`src/app/[locale]/(marketing)/blog/[slug]/page.tsx` (Server Component SSG): `generateStaticParams` enumera i post
di TUTTI i locali (`routing.locales.flatMap` su `listPosts`, PUB-411); la page carica `getPost(locale, slug)` →
`null` → `notFound()` (404), altrimenti rende `post.html` via `dangerouslySetInnerHTML` (l'UNICO html è quello già
sanificato da `rehype-sanitize` in `renderMarkdown` PUB-401) + un `<script>` JSON-LD `@type Article` serializzato
con `serializeJsonLdSafe` RIUSATO (PUB-331); `generateMetadata` produce canonical/OG su `getLandingBaseUrl()` +
`alternates.languages` SOLO fra traduzioni reali (`resolvePostAlternates`, P6A-D9). Checkpoint **4/4 verde** (C1
`dead-code:0 dup:246 cycle:0 twin:degr`, 0-nuovi; C2 `gitleaks:3 osv:4 semgrep:0 rls:3`, 0-nuovi ≥HIGH, **nessuna
dep nuova**; C3 suite full **2021 pass / 1 rosso invariante** pre-esistente `scaffold.test.ts`→TS2589; C4 target
`tests/blog-post-route.test.tsx` **6/6** = AC-431-1/2/3/4 + DoD `generateStaticParams` su it+es). Mutazione **5/5**
(M1 `dangerouslySetInnerHTML` dal `frontmatter.title` invece che `post.html` → AC-431-1 rosso, il corpo `<p>ciao</p>`
sparisce; M2 `@type` non-`Article` → AC-431-2 rosso; M3 `JSON.stringify` nudo invece di `serializeJsonLdSafe` →
AC-431-2 rosso, il `</script>` del titolo ostile sopravvive; M4 `alternates` forzati verso `es` sempre → AC-431-3
rosso, un post mono-lingua emette un hreflang fittizio; M5 rimosso `notFound()` sulla page → AC-431-4 rosso, il
render prosegue su `post` null; tutti ripristinati sha256 bit-identico, MAI git checkout — file uncommitted). next
build exit 0 (`/[locale]/blog/[slug]` marcata **`●` SSG**), **e2e Chromium 37/37**.

**Lezioni `blog-post`:**
- **Il sink `dangerouslySetInnerHTML` è LEGITTIMO qui perché la sanificazione è a MONTE e la difesa si prova
  sull'EFFETTO, non sulla fiducia.** L'unico `__html` è `post.html`, già passato da `rehype-sanitize` nella pipeline
  pura `renderMarkdown` (PUB-401) dentro il loader `getPost` (PUB-411): il macrotask non ri-sanifica, riusa la
  proprietà provata a monte. Il target_test lo pinna in modo falsificabile — con corpo `<p>ciao</p>` il DOM contiene
  `<p>ciao</p>` E gli UNICI `<script>` della pagina sono `application/ld+json` (nessuno nato dal corpo) — e la
  mutazione M1 (feed dal `frontmatter.title`) lo rende rosso. Il warning dell'hook di sicurezza sul sink è **atteso**:
  la posizione è documentata nel sorgente e negli oracoli. semgrep (che avrebbe una regola sul sink) è DIFFERITO a M4
  nel checkpoint dell'ecosistema, quindi C2 non lo segnala; la garanzia è il test + la mutazione, non l'assenza di
  scanner.
- **Anti-breakout del JSON-LD provato con un titolo OSTILE, non con `serializeJsonLdSafe` fidato ciecamente.** Il
  target_test rende un post il cui `frontmatter.title` contiene `</script><script>alert(1)</script>`: asserisce che
  il testo dello `<script>` NON contenga la chiusura grezza del tag, che `<` sia diventato `<`, e che
  `JSON.parse` round-trippi headline == titolo esatto. Così la mutazione M3 (`JSON.stringify` nudo) è ROSSA a livello
  di pagina, non solo di unità — stesso pattern falsificabile di `seo-jsonld` (PUB-331), riuso dello **stesso**
  serializzatore.
- **Hreflang ONESTO = gate su `resolvePostAlternates().length > 0`, e il killer è il caso MONO-LINGUA.** La
  mutazione naturale «popola sempre l'altro locale» (M4: `alternates` forzati a `[{es, slug}]`) sopravviverebbe al
  solo caso bilingue (dove sia l'onesto sia il mutante emettono `es`); a ucciderla è l'asserzione sul post
  mono-lingua (`resolvePostAlternates` → `[]` → nessuna chiave `es`). Lezione generale: per una proprietà
  «solo-quando-X», il test discriminante è il ramo **¬X**, non il ramo X.
- **Render dell'async Server Component in jsdom = `render(await Page({ params: Promise.resolve(...) }))`.** Il default
  export è `async` (attende `params`); si attende la funzione per ottenere il `ReactElement`, poi `render()` sincrono.
  `getPost`/`resolvePostAlternates`/`listPosts` (il loader `server-only` che legge FS) sono **mockati** con spie
  hoisted → nessuna fixture su disco, ogni test inietta il post che vuole. `next/navigation.notFound` è un
  throw-sentinel hoisted (come `editor-route-guard`): AC-431-4 asserisce `rejects.toBe(NOT_FOUND)` + spy chiamata 1×.
- **`next build`: la rotta `[slug]` con `generateStaticParams` risulta `●` (SSG) anche con 0 post** (il seed arriva
  con PUB-451): `generateStaticParams` gira al build e la rotta è registrata SSG; a runtime uno slug senza `.md` →
  `getPost` null → `notFound()`. Diversa dal listing `/[locale]/blog` (`ƒ`): la marcatura statica/dinamica è
  un'analisi di Next, il contratto SSG del DoD (enumerazione dei post di tutti i locali) è soddisfatto a codice+test.
- **Il rosso invariante `scaffold.test.ts`→TS2589 è pre-esistente, VERIFICATO rimuovendo i file del macrotask.** Con
  `src/app/[locale]/(marketing)/blog/[slug]/` e `tests/blog-post-route.test.tsx` spostati fuori, `tsc --noEmit`
  riproduce identico `e2e/effects.spec.ts(103,10): error TS2589` (Playwright `evaluateAll` generico, file immutato dal
  2026-08-13). `npm run typecheck` È `tsc --noEmit` → lo scaffold test fallisce per lo stesso motivo su main pulito.
  NON intercettato da `next build` (il suo type-check app-reachable passa in 17s, non tocca gli spec e2e). Coerente
  con la sessione `blog-list` che lo registrava già.

**BUILD `blog-list` (PUB-421) — CHIUSO+MERGIATO (`12a3ca2`, atomico `280e905`).** La rotta di listing
`src/app/[locale]/(marketing)/blog/page.tsx` (Server Component SSG): `generateStaticParams` → `[{it},{es}]`,
`listPosts(locale)` (PUB-411) → card, resa DELEGATA al componente client `src/ui/marketing/BlogList.tsx` (sotto il
chrome marketing PUB-131). Nuovo namespace i18n `blog` (`pageTitle`/`listHeading`/`readMore`/`dateLabel`/`empty`),
parità it↔es, ES localizzato. Checkpoint **4/4 verde** (C1 `dead-code:0 dup:246 cycle:0`, 0-nuovi; C2 `gitleaks:3
osv:4 semgrep:0 rls:3`, 0-nuovi ≥HIGH, **nessuna dep nuova**; C3 suite full **2015 pass / 1 rosso invariante**
pre-esistente `scaffold.test.ts`→TS2589; C4 target `tests/blog-list-route.test.tsx` **3/3** = AC-421-1/2/3 +
`tests/blog-i18n-parity.test.ts` **1/1** = AC-421-4). Mutazione **5/5** (M1 `generateStaticParams` un-solo-locale →
AC-421-2 rosso; M2 guardia lista-vuota invertita → AC-421-1 rosso, con N post si rende il ramo vuoto; M3 href senza
prefisso locale → AC-421-1 rosso, nessun link `/it/blog/<slug>`; M4 ramo lista-vuota che tocca `posts[0]` → AC-421-3
rosso, la resa su `[]` lancia; M5 rimuovi `dateLabel` da `es.blog` → AC-421-4 rosso; tutti ripristinati sha256
bit-identico, MAI git checkout — file uncommitted). next build exit 0 (`/[locale]/blog` presente), **e2e Chromium
37/37**.

**Lezioni `blog-list`:**
- **La separazione server-wrapper + client-component è il pattern testabile del progetto (confermato la 3ª volta):**
  come `MarketingHomePage`→`MarketingHome` e `PrivacyPage`→`PrivacyNotice`, la `page.tsx` (Server Component che legge
  `params`/`listPosts` — server-only) resta sottilissima e delega la resa a `BlogList` (`'use client'`,
  `useTranslations`). Così l'oracolo C4 rende il componente in jsdom sotto `NextIntlClientProvider` coi cataloghi
  REALI (misura la SCELTA DELLE CHIAVI, non stringhe del test), mentre `generateStaticParams` — funzione pura — si
  importa e si asserisce a parte. Nessun bisogno di `getTranslations` nella `page.tsx` (le stringhe statiche arrivano
  al client dal provider del layout radice): la rotta importa solo `routing` + `listPosts` + `BlogList`.
- **Il tipo del namespace i18n `blog` viene GRATIS da `messages.d.ts` (`typeof it.json`):** appena aggiunto `blog`
  a `messages/it.json`, `useTranslations('blog')` e `t('pageTitle')`/… typecheckano; senza quella voce, tsc segnala
  TS2345 su `'blog'` (osservato durante la controprova: uno `git stash` dei SOLI file tracciati — le due `.json` —
  ha lasciato i nuovi `.tsx` untracked e fatto sparire il namespace, riproducendo l'errore). Corollario:
  **`git stash` di default NON stascia gli untracked** → per una baseline pulita serve `git stash -u`, altrimenti la
  controprova misura uno stato ibrido.
- **Mutazione su due file + un catalogo, driver generalizzato:** `.trueline/pub-blog-list-mutants.mjs` fa il backup
  di `page.tsx`, `BlogList.tsx` e `messages/es.json` e porta ogni mutante sul PROPRIO `target_test` (route vs
  parity). Ogni AC ha almeno un mutante che lo uccide (5/5), scelti perché **realmente raggiungibili** dal test, non
  cosmetici (anti-placebo).
- **`generateStaticParams` è presente e verde (AC-421-2), ma la rotta risulta `ƒ` in `next build`:** il layout radice
  `[locale]/layout.tsx` chiama `resolveInitialLocale` (legge il cookie `NEXT_LOCALE`) → tutte le pagine del segmento
  `[locale]` (home, privacy e ora blog) sono server-rendered on-demand. È il comportamento già in essere delle altre
  pagine marketing, non una regressione; il contratto SSG del DoD (una voce per locale) è soddisfatto a livello di
  codice e di test.
- **Gate visivo umano DOVUTO ma RINVIATO:** la pagina blog è UI. Coerente col gate landing già rinviato (la home È la
  demo), il gate estetico va valutato in blocco su tutta la superficie pubblica prima del `cutover`, non
  frammentato. La bellezza/UX non è oracolabile (L-COL-006): resta cura umana.

**BUILD `blog-content` (PUB-411) — CHIUSO+MERGIATO (`0a5b16b`, atomico `1954efd`).** Nuovo modulo di
dominio `src/domain/blog/content.ts`: il **loader** dei post sopra `content/blog/{it,es}/<slug>.md`, sopra
la pipeline pura `renderMarkdown` (PUB-401). Espone `listPosts(locale,{root?})` (draft esclusi, data DESC,
`[]` se dir assente), `getPost(locale,slug,{root?})` (`{slug,locale,frontmatter,html}` o `null`),
`resolvePostAlternates(locale,slug,{root?})` (traduzioni per `translationKey`, `[]` senza controparte) e
`blogFrontmatterSchema` (zod). Checkpoint **4/4 verde** (C1 `dead-code:0 dup:246 cycle:0` 0-nuovi dopo la
risoluzione del rosso iniziale, vedi sotto; C2 `gitleaks:3 osv:4 semgrep:0 rls:3` 0-nuovi ≥HIGH, **nessuna
dep nuova**; C3 suite full **2011 pass / 1 rosso invariante** pre-esistente `scaffold.test.ts`→TS2589; C4
target `tests/blog-content.test.ts` **8/8** = 5 AC + 3 sullo schema). Mutazione **4/4** (M1 inverti
ordinamento → AC-411-1 rosso; M2 rimuovi filtro `draft` → AC-411-1 rosso, il post `draft:true` con data
più recente compare in testa; M3 regex slug permissiva `/^.*$/` → AC-411-5 rosso, `../../secret` supera la
guardia e il file fuori da `content/blog` viene letto; M4 accoppiamento a prescindere da `translationKey`
→ AC-411-4 rosso; tutti ripristinati sha256 bit-identico, MAI git checkout — file uncommitted).

**Lezioni `blog-content`:**
- **Bug di destrutturazione colto dal C4 al primo giro (rosso→verde in-sessione):** avevo scritto
  `const { data, html } = renderMarkdown(...)`, ma il tipo di ritorno è `{ frontmatter, html }` (non
  `{ data }`, che è la forma di `gray-matter` grezzo). `data` era `undefined` → `zodSchema.parse(undefined)`
  lanciava «Expected object, received undefined» su 4/5 test. Fix: `const { frontmatter: raw, html } = …`.
  **Lezione: quando riusi un modulo a valle, la firma è il contratto — non presumere che riesporti la forma
  della libreria che incapsula** (`renderMarkdown` normalizza `gray-matter.data` in `.frontmatter`).
- **Dead-code su export DoD-obbligatori: risolvibile con un test, meglio del baseline.** Il DoD impone di
  esportare lo schema zod, ma il suo consumatore reale è a valle (`blog-list`/`blog-post`) → C1 lo vedeva
  come dead-code (con `BlogFrontmatter`). Invece di baseline-are due export che il DoD forza, ho aggiunto 3
  test che **importano ed esercitano** lo schema (fail-closed che nomina il campo + `draft` opzionale +
  `title` vuoto): coprono un **bullet del DoD fuori dai 5 AC** e rendono gli export CONSUMATI. **knip segue
  gli import dei `.test.ts`** (plugin vitest) → C1 verde, baseline invariata (247), zero fingerprint
  aggiunti. **Preferire un test onesto al baseline quando l'export è pubblico ma il consumatore non è ancora
  nato.**
- **Anti-placebo del mutante path-traversal (M3):** togliere la guardia sullo slug NON basta a rendere
  rosso AC-411-5 se il bersaglio non esiste (il `join` uscirebbe da `content/blog` in un ENOENT → `null`
  comunque). Per rendere la mutazione ROSSA il test posa un `secret.md` VALIDO **due livelli sopra la root**
  (`join(root,'it','../../secret.md') === tmp/secret.md`): senza guardia getPost lo legge e ritorna
  non-`null`. Il test asserisce anche `existsSync(secret)` per provare che è la guardia a fermare la
  lettura, non un file mancante. **Una guardia di sicurezza va testata contro un bersaglio realmente
  raggiungibile, altrimenti la mutazione è cieca.**
- **Gotcha `date` (per PUB-451):** `gray-matter`/YAML coerce una data NUDA (`date: 2026-03-01`) a un
  oggetto `Date`; lo schema la vuole `z.string().min(1)` → nel markdown la data va **QUOTATA**
  (`date: "2026-03-01"`). Documentato nel commento dello schema: il seed (PUB-451) deve quotare le date.
- **`import 'server-only'` in un modulo di dominio:** legittimo qui perché il loader legge il filesystem e
  non deve MAI finire nel bundle client (come gli adattatori `src/data/**`); vitest lo risolve a `empty.js`
  (alias in `vitest.config.ts`), quindi non lancia nei test. Non viola il contratto di altitudine
  (`server-only` non è uno strato). È il primo modulo `src/domain/**` che tocca l'FS: l'impurità è dichiarata
  e circoscritta al confine server.

**BUILD `blog-pipeline` (PUB-401) — CHIUSO+MERGIATO (`b1e41ce`, atomico `bcaa800`).** Modulo di dominio
PURO `src/domain/blog/markdown.ts`: `renderMarkdown(raw) → { frontmatter, html }` con `gray-matter` +
catena `unified` `remark-parse → remark-rehype(allowDangerousHtml) → rehype-raw → rehype-sanitize →
rehype-stringify`, `processSync` deterministica, nessun I/O. Checkpoint **4/4 verde** (C1
`dead-code:0 dup:246 cycle:0` 0-nuovi, nessun ratchet; C2 `gitleaks:3 osv:4 semgrep:0 rls:3` 0-nuovi
≥HIGH, **7 dep nuove sotto OSV assolte**; C3 suite full **2003 pass / 1 rosso invariante** pre-esistente
`scaffold.test.ts`→TS2589; C4 target `tests/blog-pipeline.test.ts` **4/4**). Mutazione **2/2** (M1 rimuovi
`rehype-sanitize` → AC-401-2/3 rossi, `<script>`/`onerror`/`onclick` sopravvivono; M2 passo
non-deterministico `+ Math.random()` → AC-401-4 rosso; entrambi ripristinati sha256 bit-identico, MAI git
checkout). next build exit 0 (nessuna rotta cambiata). Metodo: authoring diretto dell'orchestratore (un
solo file di dominio + test + mutanti, strettamente accoppiati: i mutanti citano stringhe-sorgente esatte
→ sequenziali dopo il modulo) + **verifica avversariale empirica ANTE-scrittura** (probe throwaway sui reali
comportamenti di libreria), poi oracoli in foreground = unico giudice.

**Lezioni nuove (carry-over `blog-pipeline`):**
- **`rehype-raw` non è opzionale se la sanificazione dev'essere OSSERVABILE (anti-placebo).** Il DoD
  elencava 6 dep (senza `rehype-raw`) e la catena-scheletro `remark-parse → remark-rehype →
  rehype-sanitize → rehype-stringify`. Ma `remark-rehype` di **default** (senza `allowDangerousHtml`)
  **scarta** l'HTML grezzo del markdown: `<script>`/`<img onerror>` spariscono da soli, così gli AC-401-2/3
  passerebbero **anche senza `rehype-sanitize`** e la mutazione «togli sanitize» **non andrebbe rossa**
  (placebo). La correzione — provata empiricamente PRIMA di scrivere il modulo (probe: con la catena
  completa i tag pericolosi sono rimossi; senza sanitize sopravvivono) — è `allowDangerousHtml: true` +
  `rehype-raw`, che ri-parsa il grezzo in veri elementi hast così `rehype-sanitize` li VEDE e neutralizza.
  È la sola implementazione che onora SIA gli AC SIA la mutazione del self-check (P6A-D9). Aggiungere un
  dep oltre la lista del DoD è **legittimo quando serve a rendere reale/osservabile la proprietà di
  sicurezza dichiarata** — registrato e giustificato qui, non deriva silenziosa. Generalizza le lezioni
  «anti-placebo» del workstream (test RLS DB-reale sotto anon; hreflang solo fra traduzioni reali).
- **Registrazione OSV delle dep nuove (session-end C2).** Primo macrotask P6a a introdurre dipendenze: le
  7 dep del blog (unified/remark-parse/remark-rehype/rehype-raw/rehype-sanitize/rehype-stringify/gray-matter)
  passano il gate OSV senza nuovi ≥HIGH (`osv:4` invariato). Attenzione al **framing onesto**: `npm audit`
  segnala `nanoid` HIGH (via postcss) e `qs` (via stripe), ma **entrambi erano GIÀ nel lock di `main`
  prima del BUILD** (provato con `git show main:package-lock.json`) → non sono finding del macrotask; e
  osv-scanner (DB OSV.dev, gate baseline-delta) non li conta come nuovi ≥HIGH. `npm audit` ≠ osv-scanner:
  il giudice è l'oracolo C2, non `npm audit`.
- **ESM-only + tsc/vitest/next OK.** L'ecosistema `unified@11` è ESM puro; con `moduleResolution: 'bundler'`
  (tsconfig) tsc risolve senza attriti, vitest importa nativamente, next build compila. Il tipo `Processor`
  di unified non è stato annotato (l'inferenza del chain `.use().freeze()` basta; annotarlo con `Processor`
  nudo causerebbe mismatch dei parametri di tipo e un import inutilizzato → knip).

**BUILD `privacy-page` (PUB-341) — CHIUSO+MERGIATO (`a329b41`, atomico `65aa7a7`).** Aggiunge la
pagina pubblica `/{locale}/privacy` (route group `(marketing)`, chrome PUB-131) e il namespace i18n
`privacy` (top-level in `messages/it.json`+`es.json`, **17 path-foglia**, parità it↔es). Il copy
(bilingue) è stato prodotto con un **dynamic workflow di 2 agenti** (draft → review avversariale su
parità chiavi + accuratezza legale P6A-D7 + localizzazione ES non-calco) e inserito nei JSON via
merge-script `JSON.parse`/`stringify` **CRLF-preserving** (diff = sole aggiunte, righe esistenti
byte-identiche). Componente client `src/ui/marketing/PrivacyNotice.tsx` (`useTranslations('privacy')`)
rende 7 sezioni — controller/purpose/lawfulBasis/dataCollected/retention/noDoubleOptIn/rights — ognuna
in un `<section data-testid="privacy-<sezione>">` con h2 + corpo; `rights` rende anche il contatto
(`privacy@ulaba.net`). Output **SOLO testo JSX** (escaping React, A05:2025), nessun
`innerHTML`/`dangerouslySetInnerHTML`, nessun dato utente (contenuto statico), nessuna auth/query.
Server wrapper `(marketing)/privacy/page.tsx` sottile (`export default function PrivacyPage(): return
<PrivacyNotice/>`), pattern MarketingHomePage→MarketingHome; **NON ridefinisce** canonical/OG (DoD
PUB-341: riusa il `metadataBase` del layout marketing PUB-321, non dichiara metadati propri).
Contenuto onesto v1 (P6A-D7): base giuridica = consenso (art. 6.1.a GDPR), dati = **email + locale**,
**NESSUN IP**, conservazione su **Supabase EU** di proprietà, **niente double opt-in**, diritti
dell'interessato + contatto. È la destinazione del link di consenso del form (PUB-242). Target test
`tests/privacy-page.test.tsx` (jsdom, `NextIntlClientProvider` sui cataloghi REALI it/es, `flattenKeys`
riusato da `@/i18n/keys`): AC-341-1 (it: controller/purpose/rights esistono, heading == catalogo it,
corpo reso e non vuoto), AC-341-2 (es: le stesse sezioni, heading == catalogo es), AC-341-3 (parità
path-foglia `privacy` it↔es via `toEqual` degli array ordinati). Checkpoint **4/4**: C1 green
(`dead-code:0 dup:248 cycle:0`, **0 nuovi**, baseline 247), C2 green (`gitleaks:3 osv:4 semgrep:0
rls:3`, **0 nuovi ≥HIGH**), C3 **1999 passati / 1 rosso** (il rosso è `scaffold.test.ts`→typecheck,
SOLO per il TS2589 invariante di `e2e/effects.spec.ts`; **+3 test nuovi verdi**), C4 target **3/3**.
Mutazione **3/3** (M1 rinomina `data-testid="privacy-rights"` ⇒ AC-341-1 rosso; M2 chiave orfana solo
in `it.json` ⇒ AC-341-3 rosso per parità rotta; M3 rinomina il namespace `privacy` in `es.json` ⇒
AC-341-2 rosso; ciascuno red + restore sha256 bit-identico, driver `.trueline/pub-privacy-mutants.mjs`,
multi-file). tsc nessun errore nuovo; eslint 0 sui 3 file di codice; `next build` exit 0
(`/[locale]/privacy` **ƒ** come la home — il layout radice legge cookie); **e2e non impattato** (nessuno
spec `e2e/*` referenzia privacy, rotta puramente additiva disgiunta dalla copertura e2e); **nessuna
migrazione**. **Merge `a329b41` + push su main ESEGUITI su via umana esplicita (deploy coupled su
ulaba.net).**

- **Lezioni (carry-over privacy-page):** (1) **il target_test qui è `.tsx`, quindi JSX è ammesso** (a
  differenza del `.ts` di seo-jsonld che rifiutava JSX): render diretto `<PrivacyNotice/>` dentro
  `NextIntlClientProvider`, nessun `createElement` a mano. (2) **inserire un namespace in un JSON CRLF
  senza churn**: `JSON.parse` → set del nuovo key → `JSON.stringify(obj,null,2)` → `\n`→`\r\n` → append
  `\r\n`; git rende il diff come **sole aggiunte** (la riga di chiusura di `landing` `  }` è matchata
  con la nuova chiusura del namespace `privacy`, e la virgola/blocco nuovi sono additivi) — nessuna riga
  esistente riscritta. (3) **agganciare gli AC ai cataloghi reali uccide i mutanti**: AC-341-2 asserisce
  `heading.textContent === esMessages.privacy[key].heading`; se il namespace es sparisce (M3) il test
  fallisce sia perché `esMessages.privacy` è `undefined` (TypeError) sia perché il render non ha il
  testo atteso — non basta "testo non vuoto" (il fallback next-intl renderebbe il key-path, non vuoto).
  (4) **DoD > nota storica**: la §6 di seo-metadata ipotizzava "/privacy dichiarerà il PROPRIO
  canonical", ma il DoD di PUB-341 dice esplicitamente di NON ridefinire i metadati qui (lo scope di
  seo-metadata era solo la home) → build-to-spec, niente `generateMetadata` sulla privacy (il canonical
  per-pagina di /privacy resta un'eventuale evoluzione futura, fuori da questo macrotask). (5)
  **ri-confermato il gotcha `.snap`**: il `vitest run` full ha riscritto
  `onboarding-generation-regression.test.ts.snap` col solo EOL → ripristinato con `git checkout`, staged
  solo i 5 file del macrotask. (6) **la mutazione multi-file** (un file diverso per mutante) funziona con
  backup/restore per-mutante dentro il ciclo (buffer + sha256 per file), non un unico backup globale.


marketing due blocchi JSON-LD di schema.org — `Organization` e `WebSite` — con **builder PURI**
(`src/domain/marketing/organization-jsonld.ts`: `buildOrganizationJsonLd(baseUrl, name)` /
`buildWebSiteJsonLd(baseUrl, name)`, `@context`/`@type` costanti, `name` e `url` dagli ARGOMENTI, nessun
env). La home (`(marketing)/page.tsx`, server component) risolve `base = getLandingBaseUrl()` (mai l'Host
della richiesta — A05:2025) e `name = getBrandName()`, serializza con **`serializeJsonLdSafe` RIUSATO**
(`@/domain/generation/jsonld`, nessuna serializzazione artigianale) e monta due
`<script type="application/ld+json">` come **figlio TESTUALE** (mai `dangerouslySetInnerHTML`), fratelli
del `<main>`. Target test `tests/jsonld-organization.test.ts` (5): 2 unit sui builder puri + Gruppo B che
RENDE la home (jsdom, `createElement` + `NextIntlClientProvider` coi cataloghi reali) con **brand ostile**
`Ulaba</script><script>alert(1)</script>` iniettato via `vi.stubEnv('NEXT_PUBLIC_BRAND_NAME', …)` e
`NEXT_PUBLIC_LANDING_URL` pinnata (landing ≠ sito): AC-331-1 (≥2 script, uno `Organization` + uno
`WebSite`), AC-331-2 (nessun `</script>` grezzo, `<` presente, nessuno `<script>` eseguibile nato dal
breakout), AC-331-3 (round-trip `JSON.parse` trasparente, `name`/`url` ricostruiti). Checkpoint **4/4**:
C1 green (`dup:248`, **0 nuovi**, nessun ratchet, baseline 247), C2 green (`gitleaks:3 osv:4 semgrep:0
rls:3`, **0 nuovi ≥HIGH**), C3 **1996 passati / 1 rosso** (il rosso è `scaffold.test.ts`→typecheck, SOLO
per il TS2589 invariante di `e2e/effects.spec.ts`; **+5 test nuovi verdi**), C4 target **5/5**. Mutazione
**3/3** (M1 figlio testuale → `dangerouslySetInnerHTML` con JSON grezzo ⇒ AC-331-2 rosso, M2 rimozione del
blocco `WebSite` ⇒ AC-331-1 rosso, M3 `serializeJsonLdSafe`→`JSON.stringify` grezzo ⇒ AC-331-2 rosso;
ciascuno red + restore sha256 bit-identico, driver `.trueline/pub-jsonld-mutants.mjs`). tsc nessun errore
nuovo; eslint 0 sui 3 file; `next build` exit 0 (`/[locale]` **ƒ** già dinamica, nessuna nuova rotta); e2e
non impattato; **nessuna migrazione**. **Merge `744b0ae` + push su main ESEGUITI su via umana esplicita
(deploy coupled su ulaba.net).**

- **Lezioni (carry-over seo-jsonld):** (1) **il target_test `.ts` NON accetta JSX** in questo setup
  oxc/vite (`PARSE_ERROR "Expected > but found Identifier"`): il modulo 14-seo-jsonld.md nomina
  `tests/jsonld-organization.test.ts` (non `.tsx`) → build-to-spec, si compone l'albero con
  `createElement`, mai JSX. (2) **`createElement(Component, props, children)` con props che ESIGONO
  `children`**: il 3° arg posizionale NON soddisfa il tipo in TS strict (TS2769 "Property 'children' is
  missing") → si mette `children` DENTRO le props (`createElement(NextIntlClientProvider, { locale,
  messages, children: ui })`). (3) **le non-null assertion `!` accendono
  `@typescript-eslint/no-non-null-assertion`** → il test scaffold `npm run lint` va rosso (un **2° rosso**
  oltre l'invariante typecheck); si narrowa con `if (x === undefined) throw` invece di `x!`. ⚠️ **Un run
  full con 2 rossi va DIAGNOSTICATO, non liquidato**: qui il 1° era il typecheck invariante, il 2° il lint
  sulle mie `!` — la baseline attesa è **1** rosso, quindi 2 = una regressione mia da chiudere (fatto:
  fix TS2769 + rimozione `!` → tornati a 1 rosso). (4) **React monta il figlio testuale di `<script>` via
  `textContent`, e dentro un raw-text element NON escapa le entità HTML**: è proprio perché React non
  difende qui che serve `serializeJsonLdSafe`; una variante non-escaped lascia il `</script>` grezzo e
  toglie `<` dal testo (M3 red). (5) **un server component può leggere env al RENDER**
  (`getLandingBaseUrl`/`getBrandName` chiamate dentro `MarketingHomePage`, non a import-time) → l'import
  statico del test è sicuro e `vi.stubEnv` pilota i valori per-caso; leggere env in un server component
  NON cambia la staticità (`/[locale]` resta `ƒ` per il cookie-read del layout radice, come per
  `seo-metadata`). (6) Ri-confermato il gotcha `.snap`: `vitest run` full ha riscritto
  `onboarding-generation-regression.test.ts.snap` col solo EOL → ripristinato (`git checkout`, file
  committato), staged solo i 3 file del macrotask.

**BUILD `seo-metadata` (PUB-321) — CHIUSO+MERGIATO (`374e2f7`, atomico `16318d7`).** Aggiunge
i **metadati della landing** alla superficie marketing. `(marketing)/layout.tsx` imposta **una volta**
`metadataBase = new URL(getLandingBaseUrl())` (host LANDING da `NEXT_PUBLIC_LANDING_URL`, config pubblica, MAI
l’Host della richiesta — A05:2025 host-injection/open-redirect; `getLandingBaseUrl` ha un ripiego di sviluppo
valido → `new URL()` non lancia). `(marketing)/page.tsx` aggiunge `generateMetadata` alla **home**:
`alternates.canonical` = `getLandingBaseUrl()` **FISSO** (P6A-D4, invariante al locale E all’Host della
richiesta — la home = radice della landing, canonical della PROPRIA pagina, NON un canonical unico nel layout
che /privacy e /blog erediterebbero), `alternates.languages { it, es }` (**hreflang HTML-level reciproco** —
questo RISOLVE il flag di design di seo-sitemap con l’opzione (b): la sitemap resta com’è, la reciprocità la
garantisce il `<head>`), `openGraph` con title/description/url + `images [{ url, width:1200, height:630 }]`
(placeholder finché il founder non carica l’immagine, VISION §10), `twitter.card ’summary_large_image’`.
title/description vengono da `landing.meta.title`/`landing.meta.description` (nuove chiavi in it/es, parità
mantenuta). Target test `tests/marketing-metadata.test.ts` (AC-321-1/2/3/4): `getTranslations` mockato sui
cataloghi REALI it/es (idioma dashboard-onboarding-cta), accessor env REALI pinnati con **landing ≠ site**
(uccide la mutazione canonical→origine diversa). Checkpoint **4/4**: C1 green (`dup:248`, **0 nuovi**, nessun
ratchet, baseline 247), C2 green (`gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**), C3 **1991 passati /
1 rosso** (il rosso è `scaffold.test.ts`→typecheck, SOLO per il TS2589 invariante di `e2e/effects.spec.ts`;
**+5 test nuovi verdi**), C4 target **5/5** (4 AC + 1 localizzazione). Mutazione **3/3** (M1 canonical con origine
diversa dalla landing ⇒ AC-321-1 rosso, M2 og:image ≠ 1200×630 ⇒ AC-321-2 rosso, M3 rimozione ramo `es` da
`alternates.languages` ⇒ AC-321-3 rosso; ciascuno red + restore sha256 bit-identico, driver
`.trueline/pub-metadata-mutants.mjs`). tsc nessun errore nuovo; `next build` exit 0 (`/[locale]` **ƒ** — già
dinamica prima, non un effetto dei metadati); e2e non impattato; **nessuna migrazione**. **Merge `374e2f7` + push su main ESEGUITI su via umana
(deploy coupled su ulaba.net).**

- **Lezioni (carry-over seo-metadata):** (1) **canonical della home = base landing NUDA, non `${base}/it`**:
  il DoD/AC-321-1 vogliono `alternates.canonical === getLandingBaseUrl()` (la radice), invariante al locale — la
  home canonicalizza alla radice della landing (che redirige a /it), coerente con l’host fisso P6A-D4; gli
  hreflang `alternates.languages` sono invece per-locale (`${base}/it`, `${base}/es`). (2) **la union `Twitter`
  di Next non espone `.card` in accesso diretto** (un membro ne è privo) → in TS strict `meta.twitter?.card` dà
  TS2339; si asserisce con `expect(meta.twitter).toMatchObject({ card: … })`, senza toccare la proprietà sul
  tipo union. (3) **`getTranslations({ locale, namespace })` in `generateMetadata`**: si passa il `locale`
  esplicito (generateMetadata può girare prima di `setRequestLocale`); nei test si mocka `next-intl/server`
  risolvendo dai cataloghi REALI (namespace annidato `landing.meta` risolto per split del path). (4)
  **metadataBase nel layout, canonical per-pagina**: un `alternates.canonical` nel layout sarebbe ereditato da
  /privacy e /blog (tutte canonicalizzate alla home) → il layout mette SOLO `metadataBase`, ogni pagina dichiara
  il proprio canonical. (5) **`/[locale]` era GIÀ `ƒ`**: il cookie-read di `resolveInitialLocale` (layout radice)
  la rende dinamica da prima; aggiungere `generateMetadata` NON cambia la staticità (diverso da robots, dove
  `headers()` portò `/robots.txt` da ○ a ƒ). (6) Ri-confermato il gotcha `.snap`: `vitest run` full ha riscritto
  `onboarding-generation-regression.test.ts.snap` col solo EOL → ripristinato (`git checkout`, file committato),
  staged solo i 5 file del macrotask.

**BUILD `seo-sitemap` (PUB-311) — CHIUSO+MERGIATO (`52fb2c5`, atomico `42a866d`).** Crea
`src/app/sitemap.ts` (`MetadataRoute.Sitemap`, file convention Next), la **sitemap della LANDING**
(`/sitemap.xml`): oggi esisteva solo la sitemap PER-SITO `/s/<slug>/sitemap.xml` (P4). Emette le **tre
pagine stabili** — home (`${base}/it`, il locale di default prefissato perché `localePrefix 'always'`),
`/privacy`, indice `/blog` — ciascuna come **UNA voce** con `alternates.languages { it, es }` (hreflang tra
i soli `routing.locales`, single-source-of-truth). Ogni URL è **ASSOLUTO** e la sua origine nasce SEMPRE da
`getLandingBaseUrl()` (`NEXT_PUBLIC_LANDING_URL`), **mai** `getSiteBaseUrl` né l'Host della richiesta
(A05:2025 host-injection/open-redirect): la funzione è **pura** rispetto alla richiesta (nessun
`headers()`) → `/sitemap.xml` resta **statico** (`○`) in `next build`, diverso da `robots.ts` (`ƒ`).
Materializza la Sitemap che `robots.ts` (PUB-301) già **nomina** sul ramo `'landing'`; i post del blog
restano fuori (li aggiunge `blog-sitemap`, PUB-441 — ora sbloccato sul lato SEO). Target test
`tests/sitemap-landing.test.ts` (AC-311-1/2/3): basi **landing ≠ sito** pinnate via `vi.stubEnv` (uccide la
mutazione `getLandingBaseUrl`→`getSiteBaseUrl`), accessor env REALI; verifica voce home `{ it, es }`, voce
`/privacy` localizzata, l'**origine di ogni loc E di ogni hreflang** == host landing (mai host sito), ed
**esattamente 3 voci** (nessun post). Checkpoint **4/4**: C1 green (`dup:248`, **0 nuovi**, nessun ratchet,
baseline 247), C2 green (`gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**), C3 **1986 passati / 1 rosso**
(il rosso è `scaffold.test.ts` che lancia `npm run typecheck` → fallisce SOLO per il TS2589 invariante di
`e2e/effects.spec.ts`; **+4 test nuovi verdi**), C4 target **4/4**. Mutazione **3/3** (M1 svuota
`alternates.languages` ⇒ AC-311-1 rosso, M2 base diverge dalla landing ⇒ AC-311-3 rosso, M3 omette
`/privacy` da `LANDING_PATHS` ⇒ AC-311-2 rosso; ciascuno red + restore sha256 bit-identico, driver
`pub-sitemap-mutants.mjs`). tsc nessun errore nuovo; `next build` exit 0 (`/sitemap.xml` `○` statico); e2e
non impattato; **nessuna migrazione**.

- **Lezioni (carry-over seo-sitemap):** (1) **la sitemap landing è STATICA, il robots è DINAMICO** — sono
  sorelle ma opposte in staticità: `robots.ts` legge `headers()` (host-aware, `ƒ`), la sitemap NO (base da
  env, `○`). Volutamente non-host-aware: una sitemap ridiretta da un Host contraffatto sarebbe un
  open-redirect (A05:2025); la base la fissa la config, non il traffico. (2) **hreflang una-voce-per-pagina
  ≠ una-voce-per-locale**: l'idioma `MetadataRoute.Sitemap` di Next (una `<url>` col map `alternates.languages`)
  NON è strettamente reciproco secondo Google (il `/es` non ottiene un proprio `<loc>` con il return-link
  verso `/it`). È **conforme al DoD P6A-D8** (che chiede "una voce per la home … con `alternates.languages
  { it, es }`") e la revisione avversariale l'ha auto-classificato "not a deviation" → **non toccato**
  (build-to-spec, non ridiscutere il design mid-build), ma è un **flag di design** da valutare per il
  mercato ES/LATAM (vedi §6). (3) **`Object.fromEntries` tipizza `{[k:string]:string}`**, assegnabile a
  `Languages<string>` di Next perché le chiavi del target sono tutte opzionali — nessun cast necessario
  (verificato in `next/dist/lib/metadata/types/*`). (4) Ri-confermato il gotcha `.snap`: `vitest run` full
  ha riscritto `onboarding-generation-regression.test.ts.snap` col solo EOL → ripristinato con `git
  checkout` (file COMMITTATO, quindi checkout lecito; solo i 2 file uncommitted del macrotask non vanno mai
  git-checkout), staged solo i 2 file del macrotask. (5) **`git merge -F -` NON legge stdin** (a differenza
  di `git commit -F -`): per un messaggio di merge multi-riga con accenti serve un file temporaneo
  (`-F /tmp/…`), non un heredoc su `-`.

**BUILD `seo-robots` (PUB-301) — CHIUSO+MERGIATO (`90d0907`, atomico `d49c935`).** Rende
`src/app/robots.ts` **host-aware** (P6A-D8): da funzione globale sincrona a `async` che legge l'Host via
`headers()` (forza il render **dinamico**: `/robots.txt` passa da statico a `ƒ`) e lo classifica SEMPRE
con `classifyRequestHost(host, { appHost: getAppHost(), landingHost: getLandingHost() })` (host-classify
PUB-101, allowlist da env, mai testo libero — A05:2025). Tre rami: **`'landing'`** (ulaba.net) → marketing
indicizzabile (`allow: ['/', '/s/']`, conserva Disallow `/*/editor`/`/*/preview`, `sitemap =
${getLandingBaseUrl()}/sitemap.xml` — mai `getSiteBaseUrl` né l'Host grezzo); il robots landing **non
nomina mai** l'host app (AC-301-3, ricognizione minima). **`'app'`** (app.ulaba.net, e ogni host
non-landing non-custom) → **Disallow totale `'/'`**, nessuna regola marketing, nessuna Sitemap (app mai
indicizzabile, A01:2025). **`'custom'`** → postura P5/P4 **immutata** (`allow: '/s/'`, Disallow
editor/preview, `sitemap = ${getSiteBaseUrl()}/…`) + il **fail-safe** senza config (appHost/landingHost
null ⇒ 'custom' ⇒ tutto come oggi). `env.ts`: fattorizzato `hostnameFromUrl` (gemello di
`normalizeBaseUrl`), `getLandingHost` lo riusa e si aggiunge **`getAppHost`** (da `NEXT_PUBLIC_APP_URL`,
fail-safe null). Target test `tests/robots-host-aware.test.ts` (AC-301-1/2/3): `next/headers` mockato
(host per-caso), `classifyRequestHost`+accessor env REALI, basi **landing ≠ site** (uccide la mutazione
base). `tests/env-landing.test.ts` esteso con 3 test `getAppHost`; `tests/sitemap-robots.test.ts`
**aggiornato** al `robots()` async (mock `next/headers` con host CUSTOM ⇒ ramo legacy, AC-411-3
non-regressione). Checkpoint **4/4**: C1 green (`dup:248`, **0 nuovi dopo ratchet onesto 246→247** del
clone PRE-ESISTENTE `domain-calls↔waitlist-calls`, §4; triangolato: 0 cloni sui miei file), C2 green
(`gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH** dopo eliminazione alla radice dei 2 FP doc in
SESSION-STATE.md, §4), C3 **1982 passati / 1 rosso** (unico rosso = TS2589 scaffold pre-esistente
invariante; **+6 test nuovi verdi**), C4 target **3/3**. Mutazione **3/3** (M1 ramo-app disattivato ⇒
AC-301-2 rosso, M2 `getLandingBaseUrl`→`getSiteBaseUrl` ⇒ AC-301-1 rosso, M3 leak `getAppHost()` nella
Sitemap ⇒ AC-301-3 rosso; ciascuno red + restore sha256 bit-identico, driver `pub-robots-mutants.mjs`).
tsc nessun errore nuovo; `next build` exit 0 (`/robots.txt` ora `ƒ` dynamic); e2e non impattato; **nessuna
migrazione**.

- **Lezioni (carry-over seo-robots):** (1) **il render dinamico è una conseguenza di `headers()`** — un
  `robots()` che legge `headers()` diventa `ƒ` (Dynamic) in `next build` (era `○` statico): è VOLUTO
  (P6A-D8, un robots per-host non può essere statico). (2) **`referenceApp` = il repo reale; `eval/
  reference-app/` è solo l'ETICHETTA canonica** del normalizer (checkpoint.mjs) → i path blocker portano
  quel prefisso ma sono i MIEI file (lesson ereditata da host-classify, ri-confermata). (3) **gitleaks
  gira WORKING-TREE, non history** (`gitleaks dir`, checkpoint.mjs) → un FP nel working tree si elimina
  **editando il file** (non serve riscrivere la history); un FP DOCUMENTALE (prosa che cita un pattern
  `KEY = 'stringa'`) si rompe riscrivendo la prosa, NON si baselina (coerente col lesson `waitlist-form`).
  ⚠️ **Il session-end può INTRODURRE un FP C2**: la prosa di SESSION-STATE.md è nel corpus gitleaks, e un
  lesson che cita verbatim il pattern colpevole lo riaccende al PROSSIMO checkpoint (qui `waitlist-form`
  l'ha seminato in `c9e156b`, `seo-robots` l'ha trovato). Regola: **nei lesson non scrivere
  `identificatore-sensibile = 'valore≥24char'` verbatim** — parafrasare. (4) **aggiornare la firma di una
  rotta metadata (sync→async) ROMPE i suoi test esistenti**: `tests/sitemap-robots.test.ts` chiamava
  `robots()` sincrono; renderlo `async` esige `await robots()` + mock `next/headers` in QUEL file (con
  host custom per riprodurre il ramo legacy). È una **conseguenza attesa**, non una regressione mascherata
  (il contratto è cambiato; il test si adegua e resta verde). (5) **la triangolazione C1 diretta è la
  prova**: `pub-c1-triangulate.mjs` elenca TUTTE le coppie jscpd@50 e filtra sui 5 file del diff →
  `clonesTouchingMyDiff: 0` è la prova che il +1 è pre-esistente, non retorica. (6) Ri-confermato il
  gotcha `.snap`: `vitest run` full ha riscritto `onboarding-generation-regression.test.ts.snap` col solo
  EOL → ripristinato (`git checkout`), mai committato (staged solo i 5 file del macrotask + hygiene-baseline
  + il fix FP di SESSION-STATE.md).

**BUILD `waitlist-form` (PUB-241/242) — CHIUSO+MERGIATO (`4c5cb52`, atomico `fedafe4`).** Completa il
canale waitlist end-to-end (form → endpoint → store → tabella) montando il form client nei due
`data-testid=waitlist-slot` della home (`MarketingHome`, PUB-141). **PUB-241 (componente + stati +
confine):** `src/ui/waitlist/WaitlistForm.tsx` (`'use client'`) consuma il namespace `landing.waitlist`
e rende email + submit + regione widget + esito; `src/ui/waitlist/waitlist-calls.ts` (gemello di
`domain-calls.ts`) è l'UNICO punto che conosce la rotta, POSTa **same-origin** a `/api/waitlist` e mappa
il contratto `{ status }` (PUB-232) al tipo stretto `{ kind: 'inserted'|'already'|'error' }` — un
non-2xx/rete caduta/forma inattesa → `'error'` (la UI non inventa uno stato). Stati: `idle` →
`submitting` → `successNew` (inserted) / `successExisting` (already, **amichevole non errore**) / `error`.
Il **widget Turnstile** si monta SOLO con la site key PUBBLICA `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (letta
LETTERALE nel render, inline Next; lo script Cloudflare caricato una volta, idempotente); assente →
regione `unavailable`, nessun crash (inerte, P6A-D6/D9, coerente con l'endpoint che degrada senza il
secret). **Honeypot** invisibile (fuori dal tab order, `aria-hidden`). **PUB-242 (consenso GDPR):**
checkbox NON pre-spuntato (opt-in esplicito, P6A-D7); il submit resta **BLOCCATO** (`disabled` + guardia
nell'handler, nessun fetch) finché il consenso non è dato; link privacy con href interno **FISSO**
`/{locale}/privacy` (mai da input utente, anti open-redirect). Presentazionale: riflette l'esito del
server, non decide (P6A-D5); output SOLO testo JSX (escaping React), nessun `innerHTML`; nel client vive
SOLO la site key pubblica (A07:2025). Target test `tests/ui-waitlist-form.test.tsx` (7 test): AC-241-1
(inserted → successNew + POST a `/api/waitlist` con `{email, locale:'it'}`), AC-241-2 (already →
successExisting, + contro-prova non-2xx → error), AC-241-3 (senza site key → `unavailable`, nessun
`.cf-turnstile`, nessun throw), AC-242-1 (consenso non spuntato → submit `disabled`, nessun fetch),
AC-242-2 (spuntato → submit abilitato, fetch invocato una volta), AC-242-3 (href = `/it/privacy`). Store
e rete iniettati via `fetch` mockato + `vi.stubEnv` (nessuna chiave/DB nel verde). Checkpoint **4/4**:
C1 green (`dup:247 cycle:0 dead-code:0`, **0 nuovi dopo ratchet onesto 245→246** del clone PRE-ESISTENTE
sui route handler, §4), C2 green (`gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH** dopo la rimozione
del FP `trueline-generic-assigned-secret`, §4), C3 **1976/1977** (unico rosso = TS2589 scaffold
pre-esistente in `e2e/effects.spec.ts`, invariato; **+7 test nuovi verdi**), C4 target test **7/7**.
Mutazione **4/4** (M1 `already`→error nel confine ⇒ AC-241-2 rosso, M2 widget-mancante-lancia ⇒ AC-241-3
rosso, M3 consenso pre-spuntato `useState(true)` ⇒ AC-242-1 rosso, M4 submit non-gated dal consenso ⇒
AC-242-1 rosso; ciascuno red + restore sha256 bit-identico, driver `.trueline/pub-form-mutants.mjs`
multi-file src). tsc nessun errore nuovo; `next build` exit 0 (`/[locale]` e `/api/waitlist` ƒ); e2e non
impattato (nessun `goto` alla home); **nessuna migrazione**.

- **Lezioni (carry-over waitlist-form):** (1) **il rule gitleaks della skill colpisce l'identificatore, non
  il valore** — la costante di test `SITE_KEY` col NOME dell'env `NEXT_PUBLIC_TURNSTILE_SITE_KEY` accende `trueline-generic-assigned-secret`
  perché l'identificatore contiene `key` E il valore (il NOME della env, 30 char) supera la soglia
  ≥24-char/entropia. Falso positivo (la site key è pubblica; quello è il nome della variabile). Fix onesto:
  **rinominare** la costante (`SITE_KEY`→`TURNSTILE_ENV`, senza `key/token/secret/cred/passwd/password`) — il
  rule pretende un identificatore sensibile IMMEDIATAMENTE prima di `=`, quindi con un nome innocuo non
  scatta, indipendentemente dal valore. NON baselinare un FP che si può eliminare alla radice. **Trappola
  `sed g`**: `s/SITE_KEY/TURNSTILE_ENV/g` corrompe anche `NEXT_PUBLIC_TURNSTILE_SITE_KEY` dentro la stringa
  → il nome env va ripristinato (deve restare quello reale letto dal componente). (2) **il componente legge
  NEXT_PUBLIC con RHS non-quotata** (`process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`, member-expression) → il
  rule (che pretende `["'](valore)["']`) non lo vede: solo la stringa-literal nel test lo accendeva. La
  lettura è **letterale nel render** (non un getter con `source`): Next inietta la NEXT_PUBLIC a build-time
  solo sulle occorrenze letterali `process.env.NEXT_PUBLIC_*`, e `vi.stubEnv` la pilota per-caso nei test
  (un getter parametrico romperebbe l'inlining nel browser). (3) **il clone C1 era PRE-ESISTENTE affiorato,
  non mio** — il `dup:247` è il preambolo dei route handler (`guard+parse+jsonError`, 65 token) tra
  `connect`/`waitlist`/`generate` route.ts, sotto-soglia a `waitlist-endpoint` e affiorato dal cambio-corpus
  dei miei 2 file client. Prova su `.trueline/jscpd-c1`: 0/137 cloni tocca i miei file → **0 cloni miei**,
  ratchet additivo onesto (come host-classify/marketing-home), NON refactor dei route (fuori scope). (4)
  **montare il form nei slot NON rompe `marketing-home`** — i due `<div data-testid=waitlist-slot>` restano
  (il form è loro FIGLIO), quindi AC-141-2 (conteggio 2) tiene; lo `hero-preview-slot` è un div separato,
  AC-141-1 (vuoto) invariato; con `NEXT_PUBLIC_TURNSTILE_SITE_KEY` assente il form rende `unavailable`,
  nessuna asserzione della home tocca il form → 3/3 verde. (5) **il gate del submit è `disabled` + guardia
  nell'handler**: la mutazione che rimuove `!consent` dal `disabled` è colta dall'asserzione
  `disabled===true` di AC-242-1 anche se la guardia dell'handler blocca comunque il fetch (belt-and-
  suspenders: due mutazioni distinte, entrambe rosse). (6) Ri-confermato il gotcha `.snap`: `vitest run`
  full ha riscritto `onboarding-generation-regression.test.ts.snap` col solo EOL → ripristinato (`git
  checkout`), mai committato (staged solo i 5 file del macrotask + la hygiene-baseline).

**BUILD `waitlist-endpoint` (PUB-231/232) — CHIUSO+MERGIATO (`193ba0e`, atomico `92d4013`).** Crea
`POST /api/waitlist` (`src/app/api/waitlist/route.ts`), l'UNICO canale di scrittura della waitlist
pubblica, componendo i pezzi già verdi in due fette. **PUB-231 (guardie + anti-spam):**
`guardMutatingRequest(request, { maxBodyBytes: 4096 })` (same-origin fail-closed + tetto byte, riuso
`_shared/request-guard`) PRIMA di leggere il corpo; poi zod sulla **forma** del body (`email` string,
`locale` enum it|es, `honeypot?`, `captchaToken?`, `.strict()`); **honeypot** non vuoto → **200 SILENTE
senza insert** (`{ status: 'inserted' }`, indistinguibile); **CaptchaVerifier** verificata SOLO se
`isTurnstileConfigured()` è true (default `getTurnstileVerifier()`, fake iniettato nei test), esito
`{ ok:false }` → **403**, nessun insert; senza env Turnstile l'endpoint **degrada** (honeypot+same-origin
restano) e **NON risponde 500** (P6A-D6/D9). **PUB-232 (validazione + insert):** la **forma dell'email**
(`z.string().email()`) applicata DOPO l'anti-spam, malformata → **422** senza insert; poi `insertLead({
email, locale, source: 'landing' })` (store service_role confinato PUB-211). `{ status:'inserted' }` e
`{ status:'already' }` (23505 assorbita) sono **ENTRAMBI 200** col medesimo contratto `{ status }`
(anti-enumerazione P6A-D5, contratto condiviso col form PUB-241). Endpoint sotto `/api` (escluso dal
middleware): difesa **nel route handler** (P6A-D3), **anonimo** (nessun `getUser` — un lead non è un
account). Aggiunge il getter env-gated `getTurnstileVerifier` all'adattatore `server-only` (gemello di
`getVercelDomainProvider`/`getStripePaymentProvider`: il secret resta dietro `server-only`, il route non
lo legge). Target test `tests/api-waitlist-guard.test.ts` (AC-231-1..4 + 3 contro-prove) e
`tests/api-waitlist-insert.test.ts` (AC-232-1..3 + contro-prova locale es). Store e verifier **iniettabili
via `vi.mock`** dei loro moduli (idioma DOM-301): nessun DB reale, nessuna chiave nel verde. Checkpoint
**4/4**: C1 green (`dup:246`, **0 nuovi cloni**, nessun ratchet), C2 green (`gitleaks:3 osv:4 semgrep:0
rls:3`, **0 nuovi ≥HIGH**), C3 **1969/1970** (unico rosso = TS2589 scaffold pre-esistente in
`e2e/effects.spec.ts`, invariato; **+11 test nuovi verdi**), C4 **11/11**. Mutazione **5/5**
(M1 guard-bypass→AC-231-1, M2 insert-su-honeypot→AC-231-2, M3 captcha-ignorato→AC-231-3, M4
email-non-validata→AC-232-3, M5 already-mascherato-inserted→AC-232-2; ciascuno red + restore sha256
bit-identico, driver `.trueline/pub-endpoint-mutants.mjs`, tutti i mutanti in `route.ts` → un solo
backup). tsc nessun errore nuovo; `next build` exit 0 (`/api/waitlist` ƒ registrata); e2e non impattato;
**nessuna migrazione** (schema `waitlist_leads` già applicato in PUB-201).

- **Lezioni (carry-over waitlist-endpoint):** (1) **`vi.hoisted` è issato SOPRA gli import**: non può
  invocare `makeFakeCaptchaVerifier` (non ancora inizializzato) → `ReferenceError: Cannot access
  '__vi_import_1__' before initialization`. Fix: il verifierHolder parte con un **literal inline**
  (`{ verify: async () => ({ ok:true }) }`) e `beforeEach` lo rimpiazza col fake reale (che gira DOPO gli
  import). Il **tipo** `CaptchaVerifier` in annotazione va bene (erased a runtime), solo la CHIAMATA runtime
  rompe. (2) **tsc coglie lo spy troppo-stretto**: `vi.fn(async () => ({ status: 'inserted' as const }))`
  inferisce `{ status:'inserted' }`, e `mockResolvedValue({ status:'already' })` → TS2322. Fix: annotare il
  ritorno dello spy sull'esito reale `Promise<{ status:'inserted'|'already' }>` (InsertLeadResult), così
  entrambi i rami dell'idempotenza sono assegnabili. (3) **l'inerzia Turnstile è nel getter, non nel
  route**: il route legge SOLO `isTurnstileConfigured()` e, se true, `getTurnstileVerifier().verify(...)`;
  il secret è letto da env dentro l'adattatore `server-only` (mai nel route), come `getVercelDomainProvider`.
  Il test lo prova mockando `getTurnstileVerifier` a **throw** quando Turnstile non è configurato (nel test
  insert): con `configured=false` il getter **non è mai invocato** → nessun 500, l'endpoint degrada.
  (4) **honeypot PRIMA dell'email-format**: la forma email (`.email()`) è validata DOPO l'anti-spam, così
  un bot che riempie l'honeypot con un'email malformata riceve comunque il 200 silente (indistinguibile) —
  la validazione stretta a monte lo avrebbe tradito con un 422. (5) **`{ status: result.status }` è find
  unico** per M5: il ramo honeypot usa il literal `{ status: 'inserted' }`, il ramo finale
  `{ status: result.status }` → il mutante che li equipara distingue le due righe. (6) Ri-confermato il
  gotcha `.snap`: `vitest run` full ha riscritto `tests/__snapshots__/onboarding-generation-regression.test.ts.snap`
  col solo EOL → ripristinato (`git checkout`), mai committato (staged solo i 4 file del macrotask).

**BUILD `captcha-port` (PUB-221/222) — CHIUSO+MERGIATO (`5933c12`, atomico `810af55`).** Mette l'anti-spam
captcha dietro una **porta** pura + un **adattatore** server-only inerte, gemello del pattern
`domain-port` + `vercel.ts`. PUB-221 `src/domain/captcha/captcha-port.ts`: interfaccia `CaptchaVerifier`
con `verify(token: string): Promise<{ ok: boolean }>` (dominio PURO — nessun I/O/env/rete/segreto) +
`makeFakeCaptchaVerifier({ ok })` iniettabile (il fake usa una fn 0-aria, assegnabile a `verify(token)`,
così **nessun arg inutilizzato** da lint — lezione `waitlist-store`). PUB-222 `src/data/captcha/turnstile.ts`
(`import 'server-only'`): `isTurnstileConfigured(source?)` è `true` **solo** con `TURNSTILE_SECRET_KEY`
valorizzato (whitespace=false, semantica di `loadEnv`) + `createTurnstileVerifier({ secret, fetchImpl? })`
che POSTa secret+token all'endpoint **FISSO** Cloudflare siteverify (anti-SSRF) via `fetchImpl` iniettabile
e mappa `success`→`{ ok }`. **INERTE dichiarato** (P6A-D6/D9): secret assente ⇒ nessuna rete e `{ ok: false }`;
qualunque errore di rete/parse ⇒ `{ ok: false }` **senza lanciare** (nessun 500) — come le CTA Stripe inerti.
Nessuna chiave reale nel verde (fake + `fetchImpl`). Target test `tests/captcha-port.test.ts` (AC-221-1/2 +
guard di purezza) e `tests/captcha-turnstile.test.ts` (AC-222-1/2/3 + contro-prova configured=true +
inerzia secret-vuoto senza rete + guard `import 'server-only'`/no-secret-hardcoded). Checkpoint **4/4**:
C1 green (`dead-code:0 dup:246 cycle:0`, **0 nuovi cloni**, nessun ratchet), C2 green (`gitleaks:3 osv:4
semgrep:0 rls:3`, **0 nuovi ≥HIGH**), C3 **1958/1959** (unico rosso = TS2589 scaffold pre-esistente in
`e2e/effects.spec.ts`, invariato; lint pulito; +9 test nuovi verdi), C4 target **10/10**. Mutazione **4/4**
(M1 `isTurnstileConfigured`→`true`⇒AC-222-1 rosso, M2 `verify` ri-lancia sull'errore di rete⇒AC-222-3 rosso,
M3 ignora `success`⇒AC-222-2 rosso, M4 il fake hardcoda `ok:true`⇒AC-221-2 rosso; ciascuno red + restore
sha256 bit-identico, driver `.trueline/pub-captcha-mutants.mjs` per-mutante src+test). tsc nessun errore
nuovo; `next build` exit 0; e2e non impattato; **nessuna migrazione**.

- **Lezioni (carry-over captcha-port):** (1) **fn 0-aria per il fake** — un `verify()` senza parametri è
  assegnabile a `verify(token: string)` (come i fake di `domain-port`) ⇒ niente arg inutilizzato, evitata a
  monte la lint-regression `no-unused-vars` che in `waitlist-store` era emersa solo dal C3 (il config del
  repo non onora il prefisso `_`). (2) **inerzia a DUE porte** — l'adattatore è inerte sia per
  `isTurnstileConfigured` (env assente ⇒ l'endpoint degrada, non 500) sia dentro `verify` (secret vuoto ⇒
  short-circuit senza rete): un test-spy prova che con secret vuoto `fetchImpl` **non** è chiamato. (3) **AC-222-3
  copre due guasti** — `{ success: false }` **e** un `fetchImpl` che lancia: entrambi ⇒ `{ ok: false }`, il
  secondo esercita il `try/catch` (nessuna propagazione). (4) **mutazione multi-file** — il driver fa il
  backup per-file e instrada ogni mutante al suo target_test (adattatore→`captcha-turnstile`, porta→
  `captcha-port`), find SINGLE-LINE, restore sha256-verificato (MAI git checkout — file uncommitted).
  (5) Ri-confermato il gotcha `.snap`: `vitest run` full ha riscritto
  `onboarding-generation-regression.test.ts.snap` col solo EOL → ripristinato (`git checkout`), mai
  committato (staged solo i 4 file del macrotask).

**BUILD `waitlist-store` (PUB-211) — CHIUSO+MERGIATO (`70418f2`, atomico `7db344c`).** Introduce
`src/data/waitlist.ts` (`import 'server-only'`, gemello di `SiteDomainWriteStore` DOM-222): `insertLead({
email, locale, source }, store?)` normalizza `normalized_email = email.trim().toLowerCase()` (preservando
`email` al netto del trim) e scrive via **service_role confinato** (`createAdminClient` di default) su
`waitlist_leads` — l'UNICO percorso di scrittura della tabella (RLS zero-policy PUB-201: il client non la
tocca mai). Lo store `WaitlistStore` e' una **porta iniettabile**: i test usano un fake in-memory / una
spy senza rete ne' chiave reale (il default `adminStore()` resta inerte: `createAdminClient` — che esige
env — non e' mai invocato quando si inietta lo store). La unique-violation `23505` (UNIQUE
`normalized_email`) e' **intercettata → `{ status: 'already' }`** (idempotente, mai un throw); un insert
nuovo → `{ status: 'inserted' }`. Nessun IP, nessun double opt-in (P6A-D7). Target test
`tests/waitlist-store.test.ts` (AC-211-1/2/3): trim+lowercase + `email` cased preservata + `source`→null;
`23505` assorbita mentre un `42501` risale (mappatura **23505-specifica**); iniettabilita' provata dalla
spy. Checkpoint **4/4**: C1 green (`dead-code:0 dup:246 cycle:0`, **0 nuovi cloni**, nessun ratchet), C2
green (`gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH**), C3 **1948/1949** (unico rosso = TS2589
scaffold pre-esistente in `e2e/effects.spec.ts`, invariato; +5 test nuovi verdi), C4 **5/5**. Mutazione
**3/3** (M1 `no-lowercase`→AC-211-1 rosso, M2 `rethrow-23505`→AC-211-2 rosso, M3 `ignore-injected-store`→
AC-211-3 rosso; ciascuno red + ripristino sha256 bit-identico). tsc nessun errore nuovo; `next build` exit
0; e2e non impattato; **nessuna migrazione** (schema gia' applicato in PUB-201).

- **Lezioni (carry-over waitlist-store):** (1) **il confine dello store porta il `code` Postgres, non lo
  scarta** — il gemello `SiteDomainWriteStore.insertPending` fa `throw new Error(msg)`, che PERDEREBBE il
  `code`. Qui l'idempotenza vive proprio sul `code 23505`, quindi lo store reale fa `throw
  Object.assign(new Error(...), { code: error.code })` e `insertLead` lo legge con `(err as {code?})?.code
  === '23505'`. Divergenza VOLUTA dal gemello, motivata dall'AC-211-2. (2) **la mappatura e'
  23505-specifica, non un catch-all** — aggiunto un secondo caso (`42501` risale) cosi' che il test provi
  che solo il duplicato diventa `'already'`; un `catch` che assorbisse tutto passerebbe AC-211-2 ma
  maschererebbe guasti veri. (3) **REGRESSIONE LINT trovata dal C3, non dal target test** — la spy scritta
  `vi.fn(async (_row: WaitlistLeadRow) => {})` ha acceso `@typescript-eslint/no-unused-vars` (il config del
  repo NON onora il prefisso `_` qui) → lo scaffold-test `npm run lint` (prima verde) e' andato rosso: **2
  falliti invece di 1**. Il verdetto C3 e' `no test prima-verde ora-rosso`, quindi la 2ª rottura e' una
  **regressione mia**, non il debito TS2589. Fix nel loop: `vi.fn(async () => {})` (la spy registra
  comunque gli arg a runtime) → lint exit 0, C3 torna a **1 rosso** (solo TS2589). Lezione: **il gate C3
  include `npm run lint` via lo scaffold-test; un lint error e' una regressione, conta le due sotto-prove
  di `scaffold.test.ts` separatamente**. (4) La mutazione qui e' **file-based** (muta `src/data/waitlist.ts`,
  non la live DB come PUB-201): driver `.trueline/pub-store-mutants.mjs`, find SINGLE-LINE, restore
  sha256-verificato (MAI git checkout — file uncommitted). (5) Ri-confermato il gotcha `.snap`: `vitest run`
  full ha riscritto `onboarding-generation-regression.test.ts.snap` col solo EOL → ripristinato (`git
  checkout`), mai committato (staged solo i 2 file del macrotask).

**BUILD `waitlist-schema` (PUB-201) — CHIUSO+MERGIATO (`8f74307`, atomico `f856f40`).** Crea
`public.waitlist_leads` in UNA migrazione (`supabase/migrations/20260903000100_waitlist_leads.sql`): la
postura RLS più chiusa del repo — RLS abilitata + **ZERO policy** anon/authenticated (deny-all
DELIBERATO, P6A-D5; NON owner-only: la superficie pubblica non ha owner) + `revoke all` + GRANT **solo**
a `service_role` (`select, insert`; niente update/delete). Il client non legge né scrive mai; solo il
server (service_role, che BYPASSA la RLS) inserisce. `UNIQUE(normalized_email)` per l'idempotenza
(duplicato ⇒ `23505`). Colonne: `id/email/normalized_email/locale (check it|es)/source/created_at` —
**nessun IP in chiaro, nessun updated_at, nessuna FK** (P6A-D7, tabella standalone). Test RLS DB-reale
`tests/waitlist-rls.test.ts` (AC-201-1..5, template `subscriptions-rls.test.ts`): catalogo
(relrowsecurity=true, `pols.length===0`, GRANT `has_table_privilege` service_role-only), anon
SELECT/INSERT ⇒ `42501`, service_role INSERT ⇒ riga con valori attesi, secondo INSERT stesso
`normalized_email` ⇒ `23505` senza seconda riga. **ANTI-PLACEBO**: oracolo indipendente
(service_role/superuser) prova che la tabella NON è vuota ⇒ il `42501` è soppressione d'accesso, non
assenza di dati. Checkpoint **4/4**: C1 green (`dead-code:0 dup:246 cycle:0`, **0 nuovi fingerprint**),
C2 green (`gitleaks:3 osv:4 semgrep:0 rls:3`, **0 nuovi ≥HIGH** — il nuovo `RLS002_NO_POLICY` è MEDIUM =
deny-all voluto, sotto soglia), C3 **1943/1944** (unico rosso = TS2589 scaffold pre-esistente in
`e2e/effects.spec.ts`, invariato; +5 test nuovi verdi), C4 **5/5**. Mutazione **2/2** (M1 `grant insert
on waitlist_leads to anon` ⇒ AC-201-1 rosso via l'asserzione `has_table_privilege(anon,INSERT)=false`;
M2 `drop constraint waitlist_leads_normalized_email_key` ⇒ AC-201-5 rosso, il secondo insert non solleva
più `23505`; entrambe ripristinate + verifica catalogo `{ins_anon:false, unique_present:true}`). tsc
nessun errore nuovo; `next build` exit 0. **Migrazione applicata al Cloud** (POOLER, `supabase db push`
--dry-run poi apply) e verificata via node pg su TLS **CA-verified** (relrowsecurity=true, policies:[],
grant service_role-only, UNIQUE presente) — Cloud identico al locale.

- **Lezioni (carry-over waitlist-schema):** (1) **la mutazione di uno SCHEMA si applica alla LIVE local
  DB, non al file** — il test RLS legge il DB reale, quindi mutare il `.sql` senza ri-applicarlo non
  cambierebbe l'esito. Driver `.trueline/pub-waitlist-mutants.mjs` (node pg superuser): applica/ripristina
  la mutazione con inverso esatto (`revoke insert`; `add constraint <nome>`), verificabile via catalogo
  prima e dopo. Il nome del constraint UNIQUE è auto-generato `waitlist_leads_normalized_email_key` —
  catturarlo per ricrearlo identico nel restore. (2) **`grant insert to anon` NON flippa il codice
  comportamentale di AC-201-3** — con GRANT ma zero policy, la RLS nega comunque l'INSERT anon con
  `42501` (stesso codice del deny-per-GRANT), solo messaggio diverso. Il KILL affidabile della mutazione
  è l'asserzione a livello di **GRANT** in AC-201-1 (`has_table_privilege(anon,INSERT)=false`), non
  l'asserzione di codice in AC-201-3: inserire SEMPRE la sonda GRANT accanto a quella comportamentale.
  (3) **PostgREST schema cache**: dopo `supabase migration up` locale ho forzato `notify pgrst, 'reload
  schema'` via pgQuery prima dei test, per evitare `PGRST205` (tabella non nel cache → 404 invece del
  `42501` atteso). (4) **service_role NON ha GRANT DELETE** su questa tabella e la tabella non ha FK →
  niente cascade cleanup: il teardown del test cancella via **pgQuery superuser** (bypassa il no-delete);
  email PER-RUN uniche (randomUUID) per rerunnabilità. (5) **TLS Cloud senza `rejectUnauthorized:false`**:
  il pooler presenta la catena `*.pooler.supabase.com ← Supabase Intermediate 2021 CA ← Supabase Root
  2021 CA` (root self-signed, non nel CA store di Node → `SELF_SIGNED_CERT_IN_CHAIN`). Estratto il root
  dalla catena via `openssl s_client -starttls postgres` e usato come `ssl:{ca, rejectUnauthorized:true}`
  ⇒ verifica reale (il leaf deve incatenarsi a quel root), non disabilitata. (6) **`RLS002_NO_POLICY`
  MEDIUM non si baselina**: il gate C2 è ≥HIGH, quindi il deny-all voluto non blocca e non serve
  aggiungerlo alla baseline security (diversamente dalle 2 HIGH `RLS004` di site_publications/site_domains,
  baselinate proprio perché altrimenti bloccherebbero). (7) Ri-confermato il gotcha `.snap`: `vitest run`
  full ha riscritto `onboarding-generation-regression.test.ts.snap` col solo EOL → ripristinato via `git
  checkout`, mai committato (staged solo i 2 file del macrotask).

**BUILD `marketing-home` (PUB-141) — CHIUSO+MERGIATO (`40a0fa3`, atomico `bbbc707`).** Crea la home
pubblica `/{locale}` come `src/app/[locale]/(marketing)/page.tsx` (server component sottile) che rende
`src/ui/marketing/MarketingHome.tsx` — composizione client (pattern DomainSection/MarketingHeader,
renderizzabile in jsdom sui cataloghi REALI) con **hero** (`hero.headline`+`hero.sub`), **value-props**
(`valueProps.title`+3 item) e **closing-CTA** (`nav.waitlistCta`), copy TUTTO dal namespace `landing`
(PUB-121), nessuna stringa hard-coded. La hero espone lo **SLOT P6b riservato** `data-testid=
hero-preview-slot` VUOTO (P6A-D13: P6b lo riempirà senza rework) + il **primo** punto di montaggio
waitlist; la closing-CTA il **secondo** (`data-testid=waitlist-slot`, `data-slot=hero`/`closing`, che
PUB-241 riempirà). Output solo testo JSX (escaping React), nessun `innerHTML`, nessun dato/auth (A05:2025).
**Il vecchio placeholder `[locale]/page.tsx` è stato RIMOSSO** (spostato nel group): due `page.tsx` che
risolvono alla stessa rotta `/{locale}` romperebbero `next build`. Target test `tests/marketing-home.test.tsx`
(AC-141-1/2/3): la hero rende `hero.headline` + slot P6b vuoto (`childNodes.length===0`); esattamente 2
`waitlist-slot`; la headline es == catalogo es e ≠ it. Checkpoint **4/4**: C1 green (`dead-code:0 dup:246
cycle:0`, 0 nuovi dopo ratchet onesto 244→245), C2 green (`gitleaks:3 osv:4 semgrep:0 rls:2`, 0 nuovi
≥HIGH — solo UI/nessun segreto), C3 **1938/1939** (unico rosso = scaffold→typecheck→TS2589 pre-esistente
in `e2e/effects.spec.ts`, invariato; +3 test nuovi verdi), C4 target **3/3**. Mutazione **3/3** (M1
rimozione `waitlist-slot`→AC-141-2 rosso, M2 slot P6b riempito→AC-141-1 rosso, M3 headline hard-coded
`{'HARDCODED'}`→AC-141-3 rosso; ciascuno red + ripristino sha256 bit-identico). tsc nessun errore nuovo;
`next build` exit 0 (rotta `/[locale]` senza conflitto, servita dal group); e2e non impattato.

- **Lezioni (carry-over marketing-home):** (1) **la home DEVE migrare nel group** — un route group con
  `page.tsx` NON cambia l'URL, quindi `(marketing)/page.tsx` e `[locale]/page.tsx` risolvono entrambi a
  `/{locale}` → "two parallel pages" a `next build`. Il placeholder va rimosso (`git rm`); i due test di
  confine (`anthropic-boundary`/`supabase-clients`) citano `'src/app/[locale]/page.tsx'` **solo come
  filename virtuale di lint** (config-matching ESLint, MAI `existsSync` su quel path — solo i `vero:true`
  sono existsSync-checked) → la rimozione non li rompe (verificato: 1938/1939, entrambi verdi). (2) **Il
  clone C1 era un PRE-ESISTENTE affiorato, non mio** — C1 ha segnalato 1 clone su `MarketingHeader.tsx`
  righe 1-7. Prova triangolata: rimuovere i miei file lo lascia; `run_dupcheck` grezzo (min-tokens 50,
  strict) mostra il fragment = `MarketingHeader`↔`MarketingFooter` (il preambolo `'use client'`+import+
  commento **PUB-131** di marketing-layout, 51 token); su main pristino non compariva. È **igiene
  corpus-sensitive di jscpd**: marketing-layout l'ha lasciato latente (baseline a 244, non 245 come
  narrato), la modifica del corpus l'ha reso visibile. Preambolo React irriducibile (`'use client'`+
  import non si fattorizzano) → **ratchet additivo onesto** 244→245 (precedente host-classify), NON un
  root-fix impossibile né churn sui file di marketing-layout; i file di `marketing-home` aggiungono **0
  cloni**. (3) **Due slot con stesso `data-testid` ma `data-slot` distinto** (`hero`/`closing`): il test
  li conta con `getAllByTestId('waitlist-slot')`→2, e la mutazione trova la riga in modo univoco (senza
  `data-slot` le due righe sarebbero substring l'una dell'altra per la sola indentazione → `split` non
  unico). (4) Ri-confermato il gotcha `.snap`: `vitest run` full ha ri-scritto
  `onboarding-generation-regression.test.ts.snap` col solo EOL → ripristinato (`git checkout`), mai
  committato (staged solo i 3 file + la deletion + la hygiene-baseline).

**BUILD `marketing-layout` (PUB-131) — CHIUSO+MERGIATO (`b06107d`, atomico `9361f04`).** Introduce il
route group `src/app/[locale]/(marketing)/layout.tsx` che avvolge le sole rotte pubbliche (home/blog/
privacy) col chrome marketing: header con nav `landing` (home/blog/privacy, href per-locale) e footer
(tagline + privacy/blog), risolti dal namespace `landing` (PUB-121) via next-intl. Header e footer
estratti in componenti client renderizzabili in jsdom (`src/ui/marketing/MarketingHeader.tsx`,
`MarketingFooter.tsx`, pattern DomainSection) e provati sui cataloghi REALI. Il layout radice
`[locale]/layout.tsx` resta **INVARIATO**: il group `(marketing)` è annidato e non avvolge né linka le
rotte app (dashboard/login/onboarding/generate/preview/editor), che vivono fuori dal group
(non-regressione P6A-D4). Href verso rotte statiche per-locale (locale dall'allowlist, mai input libero
→ anti open-redirect/XSS; nessun `innerHTML`/`dangerouslySetInnerHTML`; A05:2025). Target test
`tests/marketing-layout.test.tsx` (AC-131-1/2): i 3 link nav con href `/it`,`/it/blog`,`/it/privacy` +
`footer.tagline` (query scoped ai landmark `banner`/`contentinfo`, che disambiguano i link privacy/blog
duplicati header↔footer), e nessun link ad app nel chrome. Checkpoint **4/4**: C1 verde (`dead-code:0
dup:245 cycle:0 twin:0`, 0 nuovi — TSX+test non introducono cloni), C2 verde (`gitleaks:3 osv:4
semgrep:0 rls:2`, 0 nuovi ≥HIGH — solo UI/nessun segreto), C3 **1935/1936** (unico rosso = scaffold/
TS2589 pre-esistente in `e2e/effects.spec.ts`, invariato; +2 test nuovi verdi vs 1933/1934), C4 target
test 2/2. Mutazione **5/5** (M1..M3 href header sballati → AC-131-1 rosso, M4 tagline sostituita →
AC-131-1 rosso, M5 link `dashboard` iniettato nel chrome → AC-131-2 rosso; ciascuno red + ripristino
sha256 bit-identico). tsc nessun errore nuovo; `next build` exit 0; e2e non impattato (group orfano
finché `marketing-home` non aggiunge la page).

- **Lezioni (carry-over marketing-layout):** (1) un **route group con solo `layout.tsx` e nessuna page**
  è valido: `next build` esce 0 e il group semplicemente non emette rotte finché `marketing-home`
  (PUB-141) non aggiunge la page — nessun conflitto con l'attuale `[locale]/page.tsx`. (2) Header e
  footer espongono **entrambi** un link privacy/blog → un `getByRole` globale sarebbe ambiguo: il test
  usa `within(getByRole('banner'))` / `within(getByRole('contentinfo'))` per lo scoping ai landmark
  (`<header>`=banner, `<footer>`=contentinfo), robusto e non fragile. (3) Chrome **senza copy
  hardcoded**: i 3 link nav sono le sole etichette e vengono tutte dai cataloghi (nessun brand string
  letterale) → il test misura la scelta delle CHIAVI, non stringhe del test; l'estetica (brand,
  spaziature, hero) è cura di `marketing-home`/polish, non gate qui. (4) Ri-confermato il gotcha `.snap`:
  `vitest run` full ha riscritto `onboarding-generation-regression.test.ts.snap` col solo EOL →
  ripristinato via `git checkout`, mai committato (staged solo i 4 file del macrotask).

**BUILD `marketing-i18n` (PUB-121) — CHIUSO+MERGIATO (`f397f82`, atomico `35faf6b`).** Aggiunge il
namespace `landing` (copy pubblico: nav/hero/waitlist/valueProps/footer) a `messages/it.json` **e**
`messages/es.json`, dentro il routing `[locale]` esistente. Set di CHIAVI identico fra i due cataloghi
(parità); valori ES **localizzati per paese** (tú/vos/ustedes — es. `Unite`/`Sumate`/`contás`/`Volvé`),
non calco dell'IT. Solo dati: nessun sorgente/rotta/UI toccati (marketing-layout PUB-131 consumerà queste
chiavi). Target test `tests/marketing-i18n-parity.test.ts` (AC-121-1/2/3): differenza simmetrica dei
path-foglia di `landing` vuota, 12 path richiesti risolvono a stringa non vuota in entrambi,
hero.headline/hero.sub/waitlist.submit divergono IT↔ES. Checkpoint **4/4**: C1 verde (`dead-code:0
dup:245 cycle:0 twin:0`, 0 nuovi — JSON+test non introducono cloni; i .test.ts sono esclusi da jscpd),
C2 verde (`gitleaks:3 osv:4 semgrep:0 rls:2`, 0 nuovi ≥HIGH — copy pubblico, nessun segreto/PII), C3
**1933/1934** (unico rosso = scaffold/TS2589 pre-esistente in `e2e/effects.spec.ts`, invariato; +3 test
nuovi vs 1930/1931), C4 target test **3/3**. Mutazione **5/5** (M1 rinomina foglia es→parità rotta, M2
headline es=IT→divergenza persa, M3 unavailable es svuotato→foglia vuota, M4 rinomina foglia it→parità
rotta lato IT, M5 submit es=IT→divergenza persa; ciascuno red + ripristino sha256 bit-identico). tsc
nessun errore nuovo; `next build` exit 0; e2e non impattato (nessuna UI/rotta).

- **Lezioni (carry-over marketing-i18n):** (1) i cataloghi `messages/*.json` sono `JSON.stringify(obj,
  null, 2) + '
'` con **EOL CRLF** → per un diff additivo puro (solo il blocco `landing`) l'edit
  ri-serializza e ri-applica CRLF (`.replace(/
/g,'
')`), verificato byte-identico sul resto del
  file. (2) La divergenza IT↔ES (AC-121-3) è un **oracolo di anti-calco** debole ma reale: la mutazione
  M2/M5 (es=IT) la fa rossa → il test coglie una traduzione meccanica sui 3 campi-chiave; la qualità
  della localizzazione oltre quei 3 campi resta cura umana, non gate. (3) Driver mutazione multi-file
  `.trueline/pub-i18n-mutants.mjs`: find/repl **costruiti dai valori live via `JSON.stringify`** (non
  literal non-ASCII hardcoded) → robusto su UTF-8/CRLF; find reso unico dal prefisso-chiave (`"submit":
  "Unite a la lista"` ≠ `"waitlistCta": "Unite a la lista"`, stesso valore). (4) Ri-confermato: il
  target test NON ha ri-churnato lo `.snap` onboarding (non lo tocca); lo `.snap` va comunque ispezionato
  a fine suite (gotcha noto).
- **host-guard (storico, `9244fe5`, atomico `ebf4291`).** Cabla lo split
app/landing nel middleware unico: guard SIMMETRICO applicato ai **soli Host di piattaforma**, DOPO la
deviazione host-custom e PRIMA di locale/guardia auth. `src/middleware.ts`: (1) `isPlatformHost`
riconosce ora la landing (apex + `www.`) come piattaforma → **non** entra in `routeCustomHost` (nessuna
lookup DB per la landing); (2) `normalizeRequestHost` fattorizzato (dedup, `customHostname` e il guard
lo condividono → C1 dup:245 invariato, zero cloni nuovi); (3) `isMarketingPath` **esportato** (home
`/{locale}`, `/{locale}/blog[/*]`, `/{locale}/privacy`); (4) `hostBoundaryRedirect`: landing+app-path →
308 verso `appHost`, app+marketing → 308 verso `landingHost`, hostname **fisso da env** (anti
open-redirect), pathname+query preservati. Checkpoint **4/4**: C1 verde (`dead-code:0 dup:245 cycle:0
twin:0`, 0 nuovi), C2 verde (`gitleaks:3 osv:4 semgrep:0 rls:2`, 0 nuovi ≥HIGH), C3 **1930/1931**
(unico rosso = scaffold/TS2589 pre-esistente in `e2e/effects.spec.ts`, invariato), C4 target test 5 AC
verdi. Mutazione **5/5** (red + ripristino sha256 bit-identico). tsc nessun errore nuovo; `next build`
exit 0; e2e **inerte** (guard env-gated off senza `NEXT_PUBLIC_LANDING_URL`/`APP_URL`).

- **Lezioni (carry-over host-guard):** (1) **decisione di collocazione** — la radice nuda `/` NON è
  app-path: app-path = complemento marketing **locale-prefissato** (`^/(it|es)(/.*)?$ && !marketing`),
  così `/` e i path non-prefissati restano a next-intl sull'Host corrente e la landing root non
  rimbalza mai verso l'app (canonical stabile). Deviazione voluta dalla lettera "complemento" della
  DoD, giustificata dal fine "canonical stabile": nessun AC testa `/`, tutti gli AC restano verdi.
  (2) Il guard è **intrinsecamente solo-piattaforma**: i domini cliente classificano `'custom'` e non
  lo attivano → non-regressione host-routing gratuita; posizionarlo dopo `routeCustomHost` (come da
  DoD) è comunque corretto e chiaro. (3) **Non-regressione env-based**: i test esistenti usano host
  `localhost`/nessun host → il guard è no-op lì; solo un Host che combacia con `app`/`landing` da env
  lo attiva. (4) Ri-confermato il gotcha `.snap` (lesson §5.5 host-classify): `vitest run` ha riscritto
  `onboarding-generation-regression.test.ts.snap` col solo line-ending → **ripristinato**, mai
  committato (staged solo `middleware.ts` + il nuovo test).
- **host-classify (storico, `d8dd235`/`fd371fe`):** Spina dorsale
dello split app/landing/custom (P6A-D1/D2), **inerte** finché `host-guard` non lo cabla. PUB-101
`src/domain/hosting/classify-host.ts`: `classifyRequestHost(host,{appHost,landingHost})` puro →
app/landing/custom, fail-safe verso custom senza landingHost. PUB-102 `src/config/env.ts`:
`getLandingHost` (hostname da `NEXT_PUBLIC_LANDING_URL`, null fail-safe) + `getLandingBaseUrl` (base
assoluta, default dev); `getSiteBaseUrl`/`getLandingBaseUrl` fattorizzati in `normalizeBaseUrl` (dedup
C1). Checkpoint **4/4**: C1 igiene verde (`dead-code:0 dup:245 cycle:0 twin:0`, 0 nuovi dopo ratchet
onesto 237→244), C2 verde (`gitleaks:3 osv:2 semgrep:0 rls:2`), C3 **1924/1925** (unico rosso =
scaffold/TS2589 pre-esistente in `e2e/effects.spec.ts`), C4 **10/10**. Mutazione **6/6** (kill +
ripristino bit-identico sha256). `next build` ok; e2e non impattato (export non ancora cablate).

- **Lezioni (carry-over):** (1) la jscpd della skill scansiona una COPIA del repo etichettata
  `eval/reference-app/` → i path blocker portano quel prefisso ma sono i MIEI file (fingerprint
  content-based, path-indipendenti); (2) il **bootstrap** (docs-only, senza checkpoint) ha lasciato su
  main **7 cloni-doc non baselinati** → assorbiti col primo BUILD via ratchet additivo onesto (provati
  fuori dal diff del macrotask); (3) un clone di accessor (`getLandingBaseUrl`↔`getSiteBaseUrl`) si
  risolve **alla radice** (helper condiviso `normalizeBaseUrl`), non ratchettando; (4) i mutanti
  **multilinea** in un driver `.mjs` scritto su Windows falliscono (CRLF vs `\n`) → find **single-line**;
  (5) `vitest run` può riscrivere uno `.snap` col solo line-ending (diff vuoto) → ripristinare, mai
  committare; (6) verdetto dal JSON del checkpoint, mai dall'exit code (C3 "rosso" era il debito TS2589).
- **Bootstrap (storico 2026-09-01):** blueprint 22 macrotask/26 task, strutturale 5/5 `ok:true`, rilievi
  semantici risolti, rate-limit v1 rinviato/annotato in VISION. Commit `31b60fc`/`aa361f6`/`40ad5ec`.

## 6. Prossimi passi

- **20/22 macrotask done** (`host-classify`, `host-guard`, `marketing-i18n`, `marketing-layout`,
  `marketing-home`, `waitlist-schema`, `waitlist-store`, `captcha-port`, `waitlist-endpoint`,
  `waitlist-form`, `seo-robots`, `seo-sitemap`, `seo-metadata`, `seo-jsonld`, `privacy-page`,
  `blog-pipeline`, `blog-content`, `blog-list`, `blog-post`, `blog-sitemap` — tutti mergiati su main;
  `blog-sitemap` = `0a30762`). **Prossima sessione = BUILD di `blog-seed`** (PUB-451): è **l'ULTIMO eleggibile**
  prima di `cutover` — i post `.md` reali IT+ES sotto `content/blog/{it,es}`, **date QUOTATE** per lo schema zod
  di `blog-content` (PUB-411), accoppiati per `translationKey`. Sblocca il **render effettivo** di
  listing/post/sitemap-post (finché assente `listPosts`→`[]` → listing/post/sitemap rendono a vuoto / 404).
  `cutover` (PUB-501) per ULTIMO. Superfici pubbliche home-side complete (chrome + home + i quattro SEO +
  privacy) + **pipeline + loader + listing `/blog` + post `/blog/<slug>` + sitemap dei post posati**; resta
  **solo** il seed dei contenuti reali e poi il cutover. Il canale waitlist resta **completo end-to-end**: resta
  un **gate visivo umano** opportuno su TUTTA la superficie pubblica (landing + le pagine blog, la home È la demo)
  e, al go-live, la site key pubblica `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + il secret `TURNSTILE_SECRET_KEY` su
  Vercel (finché assenti: form `unavailable` + endpoint che degrada, inerti dichiarati, nessun 500).
- **Copertura dichiarata blog-sitemap (§6):** target_test `tests/blog-sitemap.test.ts` (3 test) copre AC-441-1
  (fixture con post it `guida` + post es `guia` → `sitemap()` include gli url ASSOLUTI `${LANDING_URL}/it/blog/guida`
  e `${LANDING_URL}/es/blog/guia`), AC-441-2 (il post it `guida`, con controparte es → la sua voce ha
  `alternates.languages` con ENTRAMBE le chiavi `it` ed `es`, con `languages.it` == `${LANDING_URL}/it/blog/guida`
  e `languages.es` == `${LANDING_URL}/es/blog/guia`), AC-441-3 (post mono-lingua `solo-it` → `'es' in languages`
  === false + `languages.es` === undefined, e la voce home stabile `${LANDING_URL}/it` resta presente = estensione
  additiva). Loader di dominio (`listPosts`/`resolvePostAlternates`) **mockato** con fixture sintetica; base
  landing pinnata via `stubEnv` → url ancorati alla base (uccide la mutazione base-relativa). Mutazione **5/5**
  (§5). **NON coperto (dichiarato):** la **resa con post SEED reali** (`blog-seed` PUB-451 — qui il loader è
  mockato, nessun `.md` su disco); il **render XML reale** di `/sitemap.xml` da Next è provato solo
  indirettamente da `next build` (`/sitemap.xml` `○` Static), non da un GET reale del feed; la **cardinalità
  effettiva** delle voci coi post reali (dipende dal seed); il **wiring reale** su `NEXT_PUBLIC_LANDING_URL` di
  produzione (env stubbata nel verde); la **validazione della sitemap** presso i motori di ricerca (azione
  esterna). Nessuna tabella/RLS/auth toccata (funzione pura, legge solo dal dominio `@/domain/blog/content`).
- **Copertura dichiarata blog-post (§6):** target_test `tests/blog-post-route.test.tsx` (6 test) copre AC-431-1
  (post con `html '<p>ciao</p>'` → il DOM contiene `<p>ciao</p>` via `dangerouslySetInnerHTML` e gli UNICI
  `<script>` sono `application/ld+json` → nessuno nato dal corpo), AC-431-2 (titolo OSTILE con `</script>` → lo
  `<script ld+json>` ha `@type 'Article'` e `headline` == il titolo esatto via `JSON.parse`, MA il testo non
  contiene la chiusura grezza del tag né `<` grezzo, `<` → `<`), AC-431-3 (post con controparte es →
  `alternates.languages.es` == `${base}/es/blog/<slug-es>` + canonical su base landing ≠ host sito; post mono-lingua
  → `languages` NON contiene `es`), AC-431-4 (`getPost` → null → `notFound()` throw-sentinel + spy 1×), + 1 test DoD
  (`generateStaticParams` con `listPosts` mockato per it/es → voci `{ locale, slug }` di TUTTI i locali). Mutazione
  **5/5** (§5). **NON coperto (dichiarato):** il **render SSR reale** della rotta da Next (provato indirettamente da
  `next build`, `/[locale]/blog/[slug]` `●` SSG, e dal componente in jsdom, non da un GET reale); la **resa con post
  SEED reali** (`blog-seed` PUB-451 — qui `getPost`/`resolvePostAlternates`/`listPosts` sono MOCKATI, nessun `.md`
  su disco); la **robustezza della sanificazione** dell'html è quella di `renderMarkdown`/`rehype-sanitize` (PUB-401),
  non ri-testata qui (il macrotask riusa la proprietà a monte, non la ri-prova); le **voci dei post nella sitemap**
  (`blog-sitemap` PUB-441); l'**og:image reale** 1200×630 (azione founder, VISION §10 — qui solo il placeholder
  `/og-image.png`); il **wiring reale** su `NEXT_PUBLIC_LANDING_URL` di produzione (env stubbata nel verde);
  l'**estetica/responsive** della pagina post (cura del polish + gate visivo umano, non oracolabile). Nessuna
  tabella/RLS/auth toccata (rotta pubblica, legge solo dal dominio `@/domain/blog/content`).
- **Copertura dichiarata blog-list (§6):** target_test `tests/blog-list-route.test.tsx` (3 test) copre AC-421-1
  (`BlogList` con N card → N link `/it/blog/<slug>` + i titoli, sotto il `pageTitle` del catalogo `blog`),
  AC-421-2 (`generateStaticParams()` → `[{locale:'it'},{locale:'es'}]`), AC-421-3 (`posts=[]` → nessun
  `blog-card`, nessuna eccezione, nessun link `/it/blog/`); + `tests/blog-i18n-parity.test.ts` (1 test) copre
  AC-421-4 (parità dei path-foglia di `blog` fra it ed es, differenza simmetrica vuota). Mutazione **5/5** (§5).
  **NON coperto (dichiarato):** il **render SSR reale** della rotta `/{locale}/blog` da Next è provato
  indirettamente da `next build` (compila, `/[locale]/blog` presente) e dal componente client in jsdom, non da un
  GET reale; la **lista con post SEED reali** (`blog-seed` PUB-451 — qui solo card sintetiche iniettate); la
  **rotta del singolo post** e il suo HTML/JSON-LD (`blog-post` PUB-431); la **sitemap blog** (`blog-sitemap`
  PUB-441); l'**estetica/responsive** e l'ordine visivo delle card (cura del polish + gate visivo umano, non
  oracolabile); nessuna tabella/RLS/auth toccata (rotta pubblica statica, legge solo dal dominio).
- **Copertura dichiarata blog-content (§6):** target_test `tests/blog-content.test.ts` (8 test su fixture
  temporanea con root iniettata) copre AC-411-1 (`listPosts('it')` → slug `['primo','secondo','terzo']` per
  data DESC, il `draft:true` `bozza` — data la più recente — NON compare), AC-411-2 (`getPost('it','primo')`
  → `frontmatter.title === 'Primo'` + `html` non vuoto che contiene `<p>Corpo primo.</p>`; slug inesistente
  → `null`), AC-411-3 (`resolvePostAlternates('it','primo')` → `[{locale:'es',slug:'primo-es'}]`, + il
  reciproco es→it), AC-411-4 (`resolvePostAlternates('it','secondo')` con `translationKey 'solo-it'` → `[]`),
  AC-411-5 (`getPost('it','../../secret')` → `null` con bersaglio reale posato fuori da root) + **3 test del
  DoD sullo schema** (frontmatter conforme con `draft` opzionale assente; frontmatter senza `translationKey`
  → `safeParse` fallisce NOMINANDO il campo; `title` vuoto → fallisce). Mutazione **4/4** (§5). **NON coperto
  (dichiarato):** le **rotte** di listing/post (`blog-list` PUB-421 / `blog-post` PUB-431) e la **resa reale**
  dell'HTML in pagina; i **post seed reali** (`blog-seed` PUB-451 — qui solo fixture sintetiche); il
  comportamento su un file con **frontmatter invalido dentro `listPosts`** (fail-closed: zod lancia, non
  testato con asserzione dedicata — content fidato via git review); la robustezza della **sanificazione** è
  quella di `renderMarkdown`/`rehype-sanitize` (PUB-401), non ri-testata qui; l'ordinamento assume **date ISO
  quotate** valide (`Date.parse`), una data malformata degraderebbe l'ordine ma il contenuto è git-reviewed.
  Nessuna tabella/RLS/auth toccata (loader di dominio, lettura FS server-side dietro `server-only`).
- **Copertura dichiarata blog-pipeline (§6):** target_test `tests/blog-pipeline.test.ts` copre AC-401-1
  (frontmatter `title` == valore + `html` contiene `<h1>Benvenuto</h1>` e `<p>` col testo del corpo),
  AC-401-2 (`<script>alert(1)</script>` nel corpo → `html` NON contiene `<script`, ma il testo circostante
  resta), AC-401-3 (`<img onerror>`/`<a onclick>` → `html` NON contiene `onerror` né `onclick`), AC-401-4
  (stesso `raw` → i due `html` identici). Mutazione **2/2** (§5). **NON coperto (dichiarato):** la
  **validazione zod** del frontmatter e l'accoppiamento `translationKey` sono di `blog-content` (PUB-411),
  qui `frontmatter` è una mappa opaca (`gray-matter` restituisce anche `date` come `Date`, non normalizzato);
  la **resa reale** dell'HTML in una pagina (React `dangerouslySetInnerHTML` sul solo output GIÀ sanificato)
  è di `blog-post` (PUB-431) — qui la pipeline non tocca il DOM; il **caricamento file/FS** è fuori (dominio
  puro); la robustezza della sanificazione oltre i tre vettori testati (`<script>`, `on*`) è quella dello
  **schema di default di `rehype-sanitize`** (libreria provata, non ridefinito qui) — la fiducia è nella
  libreria, non in un allow-list artigianale; il comportamento su markdown malformato / frontmatter assente
  non ha asserzioni dedicate (fuori dagli AC). Nessuna tabella/RLS/auth toccata (dominio puro).
- **Copertura dichiarata privacy-page (§6):** target_test `tests/privacy-page.test.tsx` copre AC-341-1
  (la pagina resa in it: i contenitori `privacy-controller`/`privacy-purpose`/`privacy-rights` esistono,
  l'h2 di ciascuno == `itMessages.privacy[key].heading`, il corpo è reso e non vuoto), AC-341-2 (resa in
  es: le stesse tre sezioni, h2 == `esMessages.privacy[key].heading` → aggancio al catalogo ES reale, non
  solo "non vuoto"), AC-341-3 (parità: `flattenKeys(itMessages.privacy)` vs `flattenKeys(esMessages.privacy)`,
  array ordinati uguali). Mutazione 3/3 (§5). **NON coperto (dichiarato):** il **render SSR reale** della
  rotta `/{locale}/privacy` da parte di Next è provato indirettamente via `next build` (compila,
  `/[locale]/privacy` ƒ) e via il componente client in jsdom, non da un GET reale; le sezioni
  `lawfulBasis`/`dataCollected`/`retention`/`noDoubleOptIn`/`title`/`intro` sono rese e in parità (parte
  di AC-341-3) ma non hanno asserzioni di render dedicate oltre alle 3 richieste dagli AC; la **qualità/
  correttezza legale** del copy IT/ES oltre la fedeltà ai fatti P6A-D7 (rivista dall'agente avversariale,
  non oracolabile) resta cura umana; il **canonical/OG per-pagina** di /privacy è deliberatamente assente
  (DoD PUB-341 → riusa il `metadataBase` del layout, nessun metadato proprio) — un'eventuale canonical
  dedicata è fuori scope; l'**estetica/responsive** della pagina è cura del polish, non gate qui; nessuna
  tabella/RLS/auth toccata (pagina statica pubblica).
- **Copertura dichiarata seo-jsonld (§6):** target_test `tests/jsonld-organization.test.ts` copre AC-331-1
  (la home resa espone ≥2 `<script type="application/ld+json">`, uno `@type` `Organization` e uno
  `WebSite`), AC-331-2 (con un nome brand ostile contenente `</script>`: nessuno dei due testi contiene la
  sequenza grezza di chiusura, `<` non sopravvive → è diventato `<`, e gli UNICI `<script>` della
  pagina sono `application/ld+json` — nessuno eseguibile nato dal breakout), AC-331-3 (round-trip
  `JSON.parse` trasparente: `@type`/`name`/`url` ricostruiti, `url` == base landing pinnata) + 2 unit sui
  builder puri (`@context`/`@type`/`name`/`url` dagli argomenti). Mutazione 3/3 (§5). **NON coperto
  (dichiarato):** il **render SSR reale** del `<script>` da parte di Next è provato indirettamente via
  `next build` (compila, `/[locale]` ƒ) e via il componente in jsdom, non da un GET reale del `<head>`;
  il JSON-LD **`Article`** dei post del blog è di `blog-post` (PUB-431), il **`LocalBusiness`** delle rotte
  `/s/<slug>` è di P4 (immutato, non su questa rotta); la **validazione dei tipi schema.org** presso i
  motori di ricerca (Rich Results) è azione esterna; il **wiring reale** su `NEXT_PUBLIC_LANDING_URL`/
  `NEXT_PUBLIC_BRAND_NAME` di produzione è provato solo strutturalmente (env stubbata nel verde).
- **⚑ Flag di design (hreflang sitemap) — RISOLTO da `seo-metadata` (PUB-321) con l’opzione (b):** l’hreflang
  **HTML `<link rel=alternate>`** è ora emesso dalla home via `alternates.languages { it, es }` (reciproco per
  costruzione), la reciprocità che la sola sitemap non garantiva; la **sitemap resta com’è** (spec-conforme,
  discovery), nessun emendamento a DoD/test della sitemap. Storico del flag: `seo-sitemap` emetteva **una
  voce per pagina** con `alternates.languages { it, es }` (idioma `MetadataRoute` di Next, conforme al DoD
  P6A-D8). Non è **strettamente reciproco** secondo Google (il `/es` non ha un proprio `<loc>` con il
  return-link verso `/it`; e non c'è ancora hreflang HTML-level, che arriverà con `seo-metadata` PUB-321).
  Opzioni per una reciprocità piena, SE si decide di rivederlo: (a) emettere **una voce per (pagina ×
  locale)** = 6 voci con lo stesso map (rompe l'AC "una voce"/il test `toHaveLength(3)` → serve emendare
  DoD+test), oppure (b) affidarsi all'hreflang **HTML `<link rel=alternate>`** che `seo-metadata` aggiungerà
  su ogni pagina (reciproco per costruzione), lasciando la sitemap come discovery. **Raccomandazione:** (b)
  — la sitemap resta com'è (spec-conforme) e la reciprocità la garantisce PUB-321 nel `<head>`. Decisione
  utente/ledger da prendere al BUILD di `seo-metadata`.
- **Copertura dichiarata seo-metadata (§6):** target_test `tests/marketing-metadata.test.ts` copre AC-321-1
  (canonical della home == `getLandingBaseUrl()`, invariante it/es, con base landing ≠ base sito pinnata → mai
  l’Host della richiesta o il sito), AC-321-2 (`openGraph.images[0]` width 1200 × height 630), AC-321-3
  (`alternates.languages` contiene it ed es, con languages.es == base/es → uccide la rimozione del ramo es),
  AC-321-4 (`twitter.card` == `summary_large_image`) + un test extra di localizzazione (title/description da
  `landing.meta.*`, it ≠ es). Mutazione 3/3 (§5). **NON coperto (dichiarato):** l’**og:image reale** (il file
  1200×630 è azione manuale del founder, VISION §10 — qui solo il path placeholder `/og-image.png` risolto da
  metadataBase); il **render reale di `<meta>`/`<link rel=alternate>`** da parte di Next è provato solo
  indirettamente via `next build` (compila, `/[locale]` ƒ), non da un GET reale del `<head>`; il **canonical di
  /privacy e /blog** è dei rispettivi macrotask (PUB-341 e blog), qui solo la home; il **wiring reale** su
  `NEXT_PUBLIC_LANDING_URL` di produzione è provato solo strutturalmente (env stubbato nel verde).
- **Copertura dichiarata seo-sitemap (§6):** target_test `tests/sitemap-landing.test.ts` copre AC-311-1
  (voce home con `alternates.languages { it: `${base}/it`, es: `${base}/es` }`, base landing pinnata),
  AC-311-2 (esiste la voce `/privacy` localizzata `{ it, es }`; + contro-prova indice `/blog` presente e
  **nessun** post `/blog/…`, `toHaveLength(3)`), AC-311-3 (l'origine di OGNI `loc` e di OGNI hreflang ==
  `getLandingBaseUrl`, mai `getSiteBaseUrl`, con le due basi divergenti pinnate). Mutazione 3/3 (§5).
  **NON coperto (dichiarato):** la **reciprocità hreflang per-locale** (flag di design sopra) — la sitemap
  emette una voce per pagina, non una per `/es`; l'**hreflang HTML-level** `<link rel=alternate>` è di
  `seo-metadata` (PUB-321), non qui; le **voci dei singoli post** del blog sono di `blog-sitemap` (PUB-441);
  il **render XML reale** di `/sitemap.xml` da parte di Next (serializzazione `MetadataRoute`→`<urlset>`
  con `<xhtml:link>`) è provato SOLO indirettamente via `next build` (rotta `/sitemap.xml` emessa `○`), non
  da un GET reale; il **wiring reale** su `NEXT_PUBLIC_LANDING_URL` di produzione è provato solo
  strutturalmente (`getLandingBaseUrl` con env stubbato nel verde), non da un render a-request reale.
- **Copertura dichiarata seo-robots (§6):** target_test `tests/robots-host-aware.test.ts` copre AC-301-1
  (Host landing → `allow` include `/` e `/s/`, `disallow` include `/*/editor` e `/*/preview`, `sitemap
  === ${getLandingBaseUrl()}/sitemap.xml`), AC-301-2 (Host app → `disallow` `['/']`, nessuna `allow`,
  `sitemap` assente), AC-301-3 (robots landing serializzato non contiene mai `NEXT_PUBLIC_APP_URL`).
  `tests/env-landing.test.ts` copre `getAppHost` (hostname senza porta / null fail-safe / non-parsabile).
  Mutazione 3/3 (§5). **NON coperto (dichiarato):** il ramo `'custom'` è provato da
  `tests/sitemap-robots.test.ts` (AC-411-3, ora async, host custom → legacy) ma il suo comportamento è
  **fuori scope** qui (immutato da P5, non-regressione); la **sitemap landing vera** (`/sitemap.xml`
  landing) è di `seo-sitemap` (PUB-311) — `robots.ts` la NOMINA soltanto; il **wiring reale** su
  `NEXT_PUBLIC_APP_URL`/`NEXT_PUBLIC_LANDING_URL` in produzione (host reali di Vercel) è provato solo
  strutturalmente (accessor env + `classifyRequestHost`, con env stubbati nel verde), non da un render
  a-request reale; il render dell'output `MetadataRoute.Robots` in `robots.txt` testuale da parte di Next
  è provato indirettamente via `next build` (rotta `/robots.txt` emessa `ƒ`), non da un GET reale.
- **Copertura dichiarata waitlist-form (§6):** target_test `tests/ui-waitlist-form.test.tsx` copre AC-241-1
  (inserted → `successNew` + POST a `/api/waitlist` con `{email, locale}`), AC-241-2 (already →
  `successExisting`, + contro-prova non-2xx → `error`), AC-241-3 (senza site key → `unavailable`, nessun
  `.cf-turnstile`, nessun throw), AC-242-1 (consenso non spuntato → submit `disabled`, nessun fetch),
  AC-242-2 (spuntato → abilitato + fetch invocato), AC-242-3 (href `/it/privacy`). Mutazione 4/4 (§5).
  **NON coperto (dichiarato):** l'**esecuzione reale del challenge Turnstile** (lo script Cloudflare non gira
  in jsdom; il token è letto da `cf-turnstile-response` se presente, altrimenti stringa vuota → il server
  decide) e il **wiring reale** su una site key valida (provato solo strutturalmente: con la site key stubbata
  si monta `.cf-turnstile` con `data-sitekey`, senza si mostra `unavailable`); l'**estetica/responsive** del
  form (brand, spaziature) — cura del polish, non gate qui; la **prova di consenso lato server** (IP/timestamp
  legale) è fuori scope v1 (P6A-D7); il render SSR end-to-end della home col form è provato indirettamente
  via `next build` (compila, `/[locale]` ƒ) e via il componente in jsdom, non da un render SSR reale.
- **Copertura dichiarata captcha-port (§6):** target_test `tests/captcha-port.test.ts` copre AC-221-1
  (fake `{ ok: true }` → `verify` risolve `{ ok: true }`), AC-221-2 (fake `{ ok: false }` → `{ ok: false }`)
  + un guard di purezza (nessun import di rete/env/adattatore); `tests/captcha-turnstile.test.ts` copre
  AC-222-1 (`isTurnstileConfigured` false senza secret / con whitespace) + contro-prova true con secret,
  AC-222-2 (`fetchImpl` `{ success: true }` → `{ ok: true }`), AC-222-3 (`{ success: false }` **e**
  `fetchImpl` che lancia → `{ ok: false }` senza propagare) + inerzia secret-vuoto (nessuna chiamata di rete)
  + guard `import 'server-only'`/no-secret-hardcoded. Mutazione 4/4 (§5). **NON coperto (dichiarato):** la
  **decisione dell'endpoint** quando `isTurnstileConfigured` è false (degrado a "non disponibile") è di
  `waitlist-endpoint` (PUB-231); il **widget client** e la site key pubblica sono di `waitlist-form`
  (PUB-241); il **wiring reale** dell'adattatore su `process.env` è provato solo strutturalmente (default
  `fetch`/`process.env`) — nel verde nessuna chiamata reale a Cloudflare (fake + `fetchImpl`), l'inerzia
  senza env resta dichiarata come le CTA Stripe.
- **Copertura dichiarata waitlist-store (§6):** target_test `tests/waitlist-store.test.ts` copre AC-211-1
  (`insertLead` con email spazi/maiuscole → `normalized_email='mario@bar.it'` trim+lowercase, `email`
  cased preservata, `source`→null, esito `inserted`), AC-211-2 (store che solleva `23505` → `already`
  senza propagare; un `42501` invece risale → mappatura 23505-specifica), AC-211-3 (spy dello store
  iniettato chiamata coi valori normalizzati → iniettabilita'). Mutazione 3/3 (§5). **NON coperto
  (dichiarato):** la **validazione della forma** dell'email (zod) e l'**anti-spam** (honeypot/Turnstile/
  same-origin) sono dell'endpoint `waitlist-endpoint` (PUB-231/232), non del writer; il **default
  `adminStore()`** (service_role reale su `createAdminClient`) e' provato solo STRUTTURALMENTE (import
  `server-only` + `@/data/supabase-admin`) e dal confine globale (`architecture-contract`/`supabase-clients`),
  non da un round-trip DB reale — il runtime del divieto lato DB (anon negato) e' gia' provato da
  `waitlist-rls` (PUB-201); la scrittura end-to-end reale sara' esercitata da `waitlist-endpoint`.
- **Copertura dichiarata waitlist-schema (§6):** target_test `tests/waitlist-rls.test.ts` copre AC-201-1
  (catalogo: relrowsecurity=true, zero policy, GRANT service_role-only, anon/authenticated niente),
  AC-201-2 (anon SELECT ⇒ 42501, tabella non vuota anti-placebo), AC-201-3 (anon INSERT ⇒ 42501, nessuna
  riga scritta), AC-201-4 (service_role INSERT ⇒ riga con `normalized_email`/`locale` attesi), AC-201-5
  (secondo INSERT stesso `normalized_email` ⇒ 23505, nessuna seconda riga). Mutazione 2/2 (§5).
  Verificata anche sul Cloud via node pg (§3). **NON coperto (dichiarato):** la normalizzazione
  dell'email (lowercase/trim) è cura del writer `waitlist-store` (PUB-211), qui `normalized_email` è
  fornito esplicito dal test; il comportamento dell'endpoint / anti-spam (honeypot/Turnstile/same-origin)
  è di `waitlist-endpoint` (PUB-231/232); il test gira solo con Supabase locale attivo
  (`describe.skipIf(!SB)`), su CI senza DB si SKIPpa in modo dichiarato.
- **Copertura dichiarata marketing-home (§6):** target_test `tests/marketing-home.test.tsx` copre AC-141-1
  (la hero rende `landing.hero.headline` + slot `hero-preview-slot` VUOTO), AC-141-2 (esattamente 2
  `waitlist-slot`), AC-141-3 (la headline resa in es == catalogo es e ≠ it). Mutazione 3/3 (§5). **NON
  coperto (dichiarato):** l'estetica/responsive della home (brand, spaziature, hero reale) — cura di P6b
  (che riempie lo slot) e del polish, non gate qui; il **contenuto** dei due punti waitlist e lo stato/
  inerzia del form (PUB-241); metadata/canonical/OG/JSON-LD della home (PUB-321/331); il render SSR
  end-to-end del server component `page.tsx` è provato indirettamente via `next build` (compila, rotta
  `/[locale]` emessa) e via il componente client in jsdom, non da un render SSR reale.
- **Copertura dichiarata marketing-layout (§6):** target_test `tests/marketing-layout.test.tsx` copre
  AC-131-1 (i 3 link nav `landing` con href per-locale `/it`,`/it/blog`,`/it/privacy` + `footer.tagline`,
  scoped ai landmark banner/contentinfo) e AC-131-2 (nessun link ad app nel chrome). Mutazione 5/5 (§5).
  **NON coperto (dichiarato):** l'estetica del chrome (brand, spaziature, responsive) e lo slot hero —
  cura di `marketing-home`/polish, non gate qui; la composizione reale del layout server (`layout.tsx`)
  è provata indirettamente via `next build` (compila) e i suoi componenti in jsdom, non da un render SSR
  end-to-end (il group è orfano finché `marketing-home` non aggiunge la page).
- **Copertura dichiarata marketing-i18n (§6):** target_test `tests/marketing-i18n-parity.test.ts` copre
  AC-121-1 (parità path-foglia `landing` it↔es), AC-121-2 (12 path richiesti → stringa non vuota in
  entrambi), AC-121-3 (hero.headline/hero.sub/waitlist.submit divergono). Mutazione 5/5 (§5). **NON
  coperto (dichiarato):** la qualità/registro della localizzazione ES oltre i 3 campi di AC-121-3 (cura
  umana, non gate); il consumo delle chiavi in UI (rinviato a `marketing-layout`/`marketing-home`).
- **Copertura dichiarata host-guard:** target_test `tests/middleware-host-guard.test.ts`
  copre AC-111-1…5 + proprietà `isMarketingPath` (confine esatto per ogni locale). Mutazione 5/5
  (M1 dest landing, M2 dest app, M3 guardia fail-safe, M4 riconoscimento landing in `isPlatformHost`,
  M5 predicato app-path). **NON coperto (dichiarato):** e2e reale con `NEXT_PUBLIC_LANDING_URL`
  valorizzato (rinviato al `cutover`, che accende l'env e lancia le sonde `evaluateCutover`); la
  regola Cloudflare che nega le rotte a-consumo sull'host landing resta azione manuale founder (VISION §10).
- Apri con `prompts/session-start.md`; branch `trueline/build/<macrotask>` da main pulito; **dynamic
  workflow command-free** + checkpoint 4/4 + mutazione in foreground. I driver `.trueline/pub-*.mjs`
  (checkpoint/hygiene-ratchet/mutants) sono pronti e riusabili (gitignorati).

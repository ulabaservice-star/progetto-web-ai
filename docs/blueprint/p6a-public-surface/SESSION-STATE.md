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
| **Ultimo aggiornamento** | 2026-09-03 (BUILD `marketing-home` — checkpoint 4/4 verde, MERGIATO `40a0fa3`) |
| **Sessione corrente (BUILD `marketing-home`, PUB-141)** | **CHIUSO+MERGIATO** (`40a0fa3`, atomico `bbbc707`, deploy coupled avviato/pushato). **5/22 macrotask done.** |

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
| 06 | `waitlist-schema` (PUB-201) | **todo** | — | — |
| 07 | `waitlist-store` (PUB-211) | **todo** | — | `waitlist-schema` |
| 08 | `captcha-port` (PUB-221/222) | **todo** | — | — |
| 09 | `waitlist-endpoint` (PUB-231/232) | **todo** | — | `waitlist-store`, `captcha-port` |
| 10 | `waitlist-form` (PUB-241/242) | **todo** | — | `marketing-home`, `waitlist-endpoint` |
| 11 | `seo-robots` (PUB-301) | **todo** | — | `marketing-layout` |
| 12 | `seo-sitemap` (PUB-311) | **todo** | — | `marketing-layout` |
| 13 | `seo-metadata` (PUB-321) | **todo** | — | `marketing-layout` |
| 14 | `seo-jsonld` (PUB-331) | **todo** | — | `marketing-home` |
| 15 | `privacy-page` (PUB-341) | **todo** | — | `marketing-layout` |
| 16 | `blog-pipeline` (PUB-401) | **todo** | — | — |
| 17 | `blog-content` (PUB-411) | **todo** | — | `blog-pipeline` |
| 18 | `blog-list` (PUB-421) | **todo** | — | `blog-content`, `marketing-layout` |
| 19 | `blog-post` (PUB-431) | **todo** | — | `blog-content`, `seo-metadata`, `seo-jsonld` |
| 20 | `blog-sitemap` (PUB-441) | **todo** | — | `seo-sitemap`, `blog-content` |
| 21 | `blog-seed` (PUB-451) | **todo** | — | `blog-content` |
| 22 | `cutover` (PUB-501) | **todo** | — | (tutte le superfici pubbliche) |

**Eleggibili ora (dipendenze verdi):** `seo-robots`/`seo-sitemap`/`seo-metadata`/`privacy-page`
(sbloccati da `marketing-layout`), `seo-jsonld` (sbloccato ora da `marketing-home`),
`waitlist-schema`, `captcha-port`, `blog-pipeline`. `waitlist-form` resta bloccato (serve
`waitlist-endpoint`); `cutover` per ultimo.

## 2. Macrotask corrente

- **Nessuno in corso** — `marketing-home` (05) chiuso e mergiato. La home `/{locale}` vive ora nel route
  group `(marketing)` (col chrome header/footer di PUB-131) ed espone lo slot hero riservato P6b + i 2
  punti di montaggio waitlist. Il prossimo BUILD sceglie un eleggibile (§1) rispettando il DAG:
  `seo-jsonld` (PUB-331, ora sbloccato da `marketing-home` → JSON-LD Organization+WebSite via
  `serializeJsonLdSafe`), i quattro `seo-robots`/`seo-sitemap`/`seo-metadata`/`privacy-page` (da
  `marketing-layout`), `waitlist-schema` (→ store→endpoint), `captcha-port`, `blog-pipeline` — questi
  tre indipendenti tra loro. `waitlist-form` (PUB-241) resta bloccato finché non è pronto
  `waitlist-endpoint`.
- **Metodo**: UN macrotask per sessione via **dynamic workflow command-free** (builder solo Read/Write/
  Edit; oracoli — checkpoint 4/4 + mutazione — in **foreground** dall'orchestratore, unico giudice del
  verde). Vedi 00-INDEX §Granularità e la memoria `dynamic-workflow-build-method`.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/marketing-home` (atomico `bbbc707`, **mergiato** in `main`) |
| Ultimo commit | `40a0fa3` (merge `--no-ff` marketing-home in main) + push `f573e32..40a0fa3` |
| Stato merge su `main` | **done** (checkpoint 4/4 verde → merge → push, deploy coupled avviato) |
| Deploy-coupling | **coupled** (push su `main` = deploy su ulaba.net) → verifica locale FATTA prima del merge (vitest full 1938/1939, tsc solo TS2589 invariante, next build exit 0 con rotta `/[locale]` senza conflitto servita dal group; e2e non impattato — nessuno spec naviga la home nuda) |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): `gitleaks/osv/semgrep/rls` — al primo BUILD l'oracolo RLS vedrà la
  nuova `waitlist_leads` (RLS enabled, zero-policy, giustificata P6A-D5); le nuove dep del blog passano
  OSV.
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` — ratchet additivo **237→244** in `host-classify`
  (7 cloni PRE-ESISTENTI su main: 5 doc bootstrap p6a + 2 file P5, provati fuori dal diff del macrotask),
  poi **244→245** in `marketing-home` (1 clone PRE-ESISTENTE `MarketingHeader`↔`MarketingFooter` fp
  `c40fc0b6`: il preambolo `'use client'`+import+commento PUB-131 di marketing-layout, 51 token / 1
  sopra-soglia, latente dal merge di marketing-layout e affiorato dal cambio-corpus jscpd; codice
  committato fuori dal diff del macrotask, i file di `marketing-home` aggiungono 0 cloni).
- **Budget**: un macrotask alla volta; loop di fix con tetto in `references/oracles/thresholds.md`.

## 5. Esiti dell'ultima sessione (framing onesto)

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

- **5/22 macrotask done** (`host-classify`, `host-guard`, `marketing-i18n`, `marketing-layout`,
  `marketing-home`). **Prossima sessione = BUILD di un eleggibile** (§1): `seo-jsonld` (PUB-331 — ora
  sbloccato da `marketing-home`: JSON-LD Organization+WebSite via `serializeJsonLdSafe`, anti-XSS),
  `seo-robots`/`seo-sitemap`/`seo-metadata`/`privacy-page` (PUB-301/311/321/341 — sbloccati da
  `marketing-layout`), `waitlist-schema` (PUB-201 — introduce la migrazione `waitlist_leads` RLS
  enabled/zero-policy → applicarla al Cloud POOLER e verificare RLS/GRANT via node pg, §4),
  `captcha-port` (PUB-221/222) o `blog-pipeline` (PUB-401, nuove dep markdown/rehype → registrare sotto
  OSV). Questi tre indipendenti tra loro. `waitlist-form` (PUB-241) resta bloccato finché non è pronto
  `waitlist-endpoint`.
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

# 00-INDEX — p6a-public-surface

> Mappa del blueprint trueline di **P6a — superficie pubblica** di Ulaba/Belora (`supabase-jsts`). Un
> modulo = un macrotask (checkpoint al confine + commit atomico). Schema task:
> `references/blueprint/atomic-task-schema.md`. Prosa in italiano, identificatori in inglese. Primo
> workstream post-P5 (billing Fase 1 + custom-domains Fase 2, DAG chiusi). Nasce dal brainstorming
> del 2026-09-01 (rifusione del blueprint esterno Fable 5 sullo stack reale Next.js 16 + Vercel).

## Scopo

Separare l'**app privata** dal **sito pubblico** sullo stesso dominio, mettere online una **landing con
waitlist** anti-spam e posare le **fondamenta SEO** (tecniche + un blog operativo file-based). Con P6a
completo: `ulaba.net` serve una landing indicizzabile IT+ES con form waitlist funzionante;
`app.ulaba.net` serve l'app **invariata** dietro Cloudflare Access; un blog (`ulaba.net/blog`) rende
articoli reali da markdown con dati strutturati e sitemap; le fondamenta SEO (robots per-host, sitemap
hreflang IT↔ES, canonical, Open Graph, JSON-LD) sono in piedi. **Nessuna modifica funzionale all'app;
Stripe resta spento.** L'anteprima istantanea del sito è deliberatamente **fuori scope → P6b** (la hero
lascia lo slot).

## Granularità e metodo (perché 22 macrotask piccoli)

Il piano è scomposto in **22 macrotask piccoli e mono-responsabilità** (1–2 micro-task ciascuno, poche
AC): gli 8 macrotask del brainstorming (VISION §9) sono stati **massimizzati** spezzando i grandi
(marketing-shell → i18n/layout/home; waitlist → schema/store/captcha/endpoint/form; seo → robots/
sitemap/metadata/jsonld/privacy; blog → pipeline/content/list/post/sitemap/seed). Un macrotask = una
sessione leggera = un checkpoint = un commit atomico.

**Metodo di build (decisione utente 2026-09-01):** **UN macrotask per sessione**, costruito con un
**dynamic workflow multi-agente command-free** (ultracode): per ogni unità 1 builder solo Read/Write/
Edit (i subagenti che eseguono `tsc`/`vitest`/`knip` si stallano → watchdog → morte), unità in
parallelo se non condividono file, poi **UN solo ciclo di oracoli** (checkpoint 4/4 + batteria di
mutazione) dell'orchestratore in **foreground** = unico giudice del verde. L'oracolo emette il
verdetto, mai l'LLM. Vedi la memoria `dynamic-workflow-build-method`.

## Mappa dei macrotask

| # | Macrotask | Contenuto | Dipende da |
|---|---|---|---|
| 01 | `host-classify` | `classifyRequestHost` puro app/landing/custom (PUB-101) + getter landing `getLandingHost`/`getLandingBaseUrl` da `NEXT_PUBLIC_LANDING_URL`, fail-safe (PUB-102). | — |
| 02 | `host-guard` | Guard **simmetrico** nel middleware (308): app-route su host landing → app.; marketing-route su host app → landing (PUB-111). | `host-classify` |
| 03 | `marketing-i18n` | Namespace `landing` in it.json+es.json, ES localizzato per paese; parità di chiavi IT↔ES (PUB-121). | — |
| 04 | `marketing-layout` | Route group `(marketing)` + layout/chrome (nav home/blog/privacy) (PUB-131). | `marketing-i18n` |
| 05 | `marketing-home` | Home **strutturale** (blocchi + **slot hero riservato P6b** + 2 punti di montaggio waitlist) (PUB-141). | `marketing-layout` |
| 06 | `waitlist-schema` | Migrazione `waitlist_leads` + **RLS enabled zero-policy** + revoke/no-grant + UNIQUE `normalized_email` (PUB-201). | — |
| 07 | `waitlist-store` | Writer service_role confinato + store iniettabile; `insertLead` con idempotenza `23505` (PUB-211). | `waitlist-schema` |
| 08 | `captcha-port` | Porta pura `CaptchaVerifier` + fake (PUB-221) + adattatore Turnstile server-only env-gated inerte (PUB-222). | — |
| 09 | `waitlist-endpoint` | `POST /api/waitlist`: guardie same-origin+byte, honeypot, captcha (PUB-231); valida+insert+idempotenza (PUB-232). | `waitlist-store`, `captcha-port` |
| 10 | `waitlist-form` | Form client + stati/`inert-senza-env` (PUB-241) + consenso GDPR non pre-spuntato + confine calls (PUB-242). | `marketing-home`, `waitlist-endpoint` |
| 11 | `seo-robots` | `robots.ts` **host-aware**: landing indicizzabile, app disallow, mai linkare `app.` (PUB-301). | `marketing-layout` |
| 12 | `seo-sitemap` | `sitemap.ts` landing (home+privacy+indice blog) con hreflang IT↔ES (PUB-311). | `marketing-layout` |
| 13 | `seo-metadata` | Canonical fisso `ulaba.net` + Open Graph/Twitter + `alternates.languages` it/es (PUB-321). | `marketing-layout` |
| 14 | `seo-jsonld` | JSON-LD Organization + WebSite via `serializeJsonLdSafe` (riuso, anti-XSS) (PUB-331). | `marketing-home` |
| 15 | `privacy-page` | Pagina `/privacy` IT+ES (titolare, finalità, diritti; no double opt-in v1) (PUB-341). | `marketing-layout` |
| 16 | `blog-pipeline` | Pipeline markdown **pura** unified+rehype-sanitize+gray-matter → `{frontmatter, html}` (PUB-401). | — |
| 17 | `blog-content` | Loader `content/blog/{it,es}` + schema frontmatter (zod) + accoppiamento `translationKey` (PUB-411). | `blog-pipeline` |
| 18 | `blog-list` | Rotta listing `[locale]/(marketing)/blog` SSG (card dei post) (PUB-421). | `blog-content`, `marketing-layout` |
| 19 | `blog-post` | Rotta post SSG + html sanificato + JSON-LD `Article` + hreflang solo fra traduzioni reali (PUB-431). | `blog-content`, `seo-metadata`, `seo-jsonld` |
| 20 | `blog-sitemap` | Integra i post nella sitemap landing con hreflang onesto (PUB-441). | `seo-sitemap`, `blog-content` |
| 21 | `blog-seed` | 1–2 post seed reali IT+ES con `translationKey` condiviso (PUB-451). | `blog-content` |
| 22 | `cutover` | Go-live **human-gated** con ordine obbligato (P6A-D12) + `evaluateCutover` puro + runbook `curl` (PUB-501). | `host-guard`, `waitlist-form`, `seo-robots`, `seo-sitemap`, `privacy-page`, `blog-post`, `blog-sitemap` |

**Build order (DAG per macrotask):**
```
host-classify ── host-guard ─────────────────────────────┐
marketing-i18n ── marketing-layout ─┬─ marketing-home ─┐  │
                                     ├─ seo-robots      │  │
                                     ├─ seo-sitemap ────┼──┤
                                     ├─ seo-metadata    │  │
                                     └─ privacy-page ───┼──┤
marketing-home ─┬─ seo-jsonld                           │  │
                └─ (con waitlist-endpoint) waitlist-form ┤  │
waitlist-schema ── waitlist-store ─┐                     │  │
captcha-port ──────────────────────┴─ waitlist-endpoint ─┘  │
blog-pipeline ── blog-content ─┬─ blog-list                 │
                               ├─ blog-post ────────────────┤
                               ├─ blog-sitemap (con seo-sitemap)
                               └─ blog-seed                  │
                                                    (tutto) → cutover
```
Primi eleggibili (nessuna dipendenza, in parallelo su file disgiunti): `host-classify`,
`marketing-i18n`, `waitlist-schema`, `captcha-port`, `blog-pipeline`. `cutover` per ultimo.

## ID dei task

Prefisso `PUB-`. Numerazione per macrotask: host-classify `10x`, host-guard `11x`, marketing-i18n
`12x`, marketing-layout `13x`, marketing-home `14x`, waitlist-schema `20x`, waitlist-store `21x`,
captcha-port `22x`, waitlist-endpoint `23x`, waitlist-form `24x`, seo-robots `30x`, seo-sitemap `31x`,
seo-metadata `32x`, seo-jsonld `33x`, privacy-page `34x`, blog-pipeline `40x`, blog-content `41x`,
blog-list `42x`, blog-post `43x`, blog-sitemap `44x`, blog-seed `45x`, cutover `50x`. ID stabili, mai
riusati.

## Decision ledger

Il ledger completo (**P6A-D1…D13**, decisioni **bloccate** dal brainstorming 2026-09-01) vive in
`VISION-AND-CONSTRAINTS.md §6`: architettura **B** monolite host-guard (D1/D2), API a-consumo difese a
3 livelli non nel middleware (D3), route group `(marketing)` + canonical fisso (D4), `waitlist_leads`
**RLS zero-policy** solo-server (D5), `/api/waitlist` honeypot+Turnstile dietro porta inerte-senza-env
+ idempotenza `23505` (D6), niente double opt-in / niente IP in chiaro (D7), SEO robots host-aware +
sitemap hreflang (D8), blog file-based + rehype-sanitize + hreflang onesto (D9), IT+ES da subito (D10),
contatore spento + analytics cookieless (D11), **cutover human-gated ordinato** (D12), anteprima/
referral/badge/programmatic-SEO **→ P6b** con slot hero riservato (D13). I moduli citano gli ID D*.

## Manifest ecosistema

- **Ecosistema attivo:** `supabase-jsts` (Next.js 16 App Router + TypeScript + Supabase Cloud EU).
- **Superficie prevista:** `src/domain/hosting/` (classify-host, cutover — puri) + `src/domain/captcha/`
  (porta) + `src/domain/blog/` (markdown pipeline pura, content loader) + `src/data/waitlist.ts`
  (writer) + `src/data/captcha/turnstile.ts` (adattatore) + `src/app/api/waitlist/route.ts` +
  `src/app/[locale]/(marketing)/**` (layout, home, privacy, blog listing/post) + `src/ui/waitlist/**`
  (form) + `src/app/robots.ts` (host-aware) + `src/app/sitemap.ts` (nuovo, landing) + `src/config/env.ts`
  (getter landing) + `src/middleware.ts` (host-guard simmetrico) + `content/blog/{it,es}/*.md` (seed) +
  **1 migrazione** (`waitlist_leads`). Serving `/s/<slug>`, routing custom-domains, motore v2 invariati.
- **Baseline sicurezza attesa:** nuova tabella `waitlist_leads` (RLS enabled **zero-policy** solo-server)
  → `rls_check`; endpoint dietro guardie same-origin condivise; segreto Turnstile via env, mai nel
  sorgente; JSON-LD/blog HTML sanificati (injection). Nuove dep del blog (unified/rehype-sanitize/
  gray-matter) passano **OSV** (C2). Nessun blocco `architecture:` per-blueprint: vale il globale
  `tests/architecture-contract.test.ts` (dominio puro; `ui→domain` lecito; `service_role` fuori dal
  percorso utente/edge) — coerente con DOM-D10/BIL-D8.
- **Deploy-coupling `coupled`:** merge su `main` human-gated; verifica **locale** (vitest, e2e Chromium,
  `next build`) prima del merge. **Config di deploy (prereq go-live, non blueprint, VISION §10):** env
  Vercel `NEXT_PUBLIC_LANDING_URL`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; DNS
  `app`/`www`; rescope Cloudflare Access; Supabase Auth Site/Redirect URL → `app.`; Google Search
  Console; copy definitivo + OG 1200×630.

## Invarianti (project-start)

App invariata sotto `app.`; separazione per **Host** nel monolite (mai repo/deploy separato);
`waitlist_leads` **RLS enabled zero-policy**, scrive **solo** il server (service_role), mai il client;
entitlement/stato mai deciso dal client; `/api/waitlist` dietro guardie same-origin+byte + honeypot +
Turnstile dietro porta (fake nei test, inerte senza env); niente IP in chiaro, niente double opt-in v1;
host-guard simmetrico che **non tocca** `/s/*`, il locale-routing, il ramo host-custom, né la guardia
auth; robots host-aware (landing indicizzabile, app disallow, mai linkare `app.`); canonical/hreflang
onesti (alternate solo fra traduzioni reali); output solo testo JSX (mai `innerHTML`/`href`
interpolato), JSON-LD via `serializeJsonLdSafe`, HTML del blog via `rehype-sanitize`; RLS con testo
esplicito, mai `USING (true)`; nessun `service_role` nel percorso utente/edge; segreti via env; git a
strati + deploy-coupling coupled; **cutover human-gated ordinato**; oracle-as-judge + gate umano.

## Fonti di verità

- **Piano**: questo blueprint (`00-INDEX` + moduli `01`–`22`) + `VISION-AND-CONSTRAINTS.md`.
- **Stato vivo**: `docs/blueprint/p6a-public-surface/SESSION-STATE.md`.
- **Materiale d'origine (sole idee)**: `docs/ideas/2026-08-29-fable-waitlist-promo-idee.md` + memorie
  `waitlist-launch-project`, `waitlist-launch-research`.
- **Fase successiva**: **P6b — motore-come-marketing** (anteprima istantanea + programmatic-SEO +
  referral + badge; suo blueprint + brainstorming dedicato).

## Self-check del blueprint

- **Strutturale**: `validate_blueprint.mjs` su questa dir — atteso **verde 5/5** (`ok:true`).
- **Semantico**: `self-check-checklist.md` punti 6–10 su ogni task; rilievi → human-in-the-loop.

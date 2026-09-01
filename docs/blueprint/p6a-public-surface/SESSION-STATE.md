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
| **Ultimo aggiornamento** | 2026-09-01 (BUILD `host-classify` — checkpoint 4/4 verde, MERGIATO `d8dd235`) |
| **Sessione corrente (BUILD `host-classify`, PUB-101/102)** | **CHIUSO+MERGIATO** (`d8dd235`, atomico `fd371fe`, deploy coupled avviato). **1/22 macrotask done.** |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| # | Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|---|
| 01 | `host-classify` (PUB-101/102) | **done** | 4/4 ✅ (`d8dd235`) | — |
| 02 | `host-guard` (PUB-111) | **todo** | — | `host-classify` |
| 03 | `marketing-i18n` (PUB-121) | **todo** | — | — |
| 04 | `marketing-layout` (PUB-131) | **todo** | — | `marketing-i18n` |
| 05 | `marketing-home` (PUB-141) | **todo** | — | `marketing-layout` |
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

**Eleggibili ora (dipendenze verdi):** `host-guard` (sbloccato da `host-classify`), `marketing-i18n`,
`waitlist-schema`, `captcha-port`, `blog-pipeline`. `cutover` per ultimo.

## 2. Macrotask corrente

- **Nessuno in corso** — `host-classify` (01) chiuso e mergiato. Il prossimo BUILD sceglie un eleggibile
  (§1) rispettando il DAG; `host-guard` (PUB-111) è ora sbloccato ed è il seguito naturale (cabla
  `classifyRequestHost`/`getLandingHost` nel middleware con guard simmetrico).
- **Metodo**: UN macrotask per sessione via **dynamic workflow command-free** (builder solo Read/Write/
  Edit; oracoli — checkpoint 4/4 + mutazione — in **foreground** dall'orchestratore, unico giudice del
  verde). Vedi 00-INDEX §Granularità e la memoria `dynamic-workflow-build-method`.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/host-classify` (atomico `fd371fe`, **mergiato** in `main`) |
| Ultimo commit | `d8dd235` (merge `--no-ff` host-classify in main) |
| Stato merge su `main` | **done** (checkpoint 4/4 verde → merge → push, deploy coupled avviato) |
| Deploy-coupling | **coupled** (push su `main` = deploy su ulaba.net) → verifica locale FATTA prima del merge |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): `gitleaks/osv/semgrep/rls` — al primo BUILD l'oracolo RLS vedrà la
  nuova `waitlist_leads` (RLS enabled, zero-policy, giustificata P6A-D5); le nuove dep del blog passano
  OSV.
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` — ratchet additivo **237→244** in `host-classify`
  (7 cloni PRE-ESISTENTI su main: 5 doc bootstrap p6a + 2 file P5, provati fuori dal diff del macrotask).
- **Budget**: un macrotask alla volta; loop di fix con tetto in `references/oracles/thresholds.md`.

## 5. Esiti dell'ultima sessione (framing onesto)

**BUILD `host-classify` (PUB-101/102) — CHIUSO+MERGIATO (`d8dd235`, atomico `fd371fe`).** Spina dorsale
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

- **1/22 macrotask done** (`host-classify`). **Prossima sessione = BUILD di un eleggibile** (§1):
  seguito naturale `host-guard` (PUB-111 — cabla `classifyRequestHost`/`getLandingHost` nel middleware
  con guard **simmetrico**; NON toccare `/s/*`, la guardia auth, né il ramo host-custom: non-regressione
  `auth-middleware`/`public-exclusion`/`host-routing`), oppure `marketing-i18n` ∥ `waitlist-schema` ∥
  `captcha-port` ∥ `blog-pipeline` (indipendenti, parallelizzabili).
- Apri con `prompts/session-start.md`; branch `trueline/build/<macrotask>` da main pulito; **dynamic
  workflow command-free** + checkpoint 4/4 + mutazione in foreground. I driver `.trueline/pub-*.mjs`
  (checkpoint/hygiene-ratchet/mutants) sono pronti e riusabili (gitignorati).

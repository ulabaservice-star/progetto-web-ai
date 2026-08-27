# SESSION-STATE — p5-billing-fase1

> Fonte di verità sullo **stato vivo** del workstream `p5-billing-fase1` (Fase 1 di P5 — nucleo
> billing), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di
> P0…P4, design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard.
> Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 1 (nucleo billing) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-27 (session-end del BUILD `plan-gates`) |
| **Sessione corrente** | BUILD `plan-gates` — CHIUSA (checkpoint 4/4 verde; mutazione 5/5; **commit di branch `01d822e` + e2e `bf5843e`**; merge su `main` **PENDING** — human-gate deploy-coupled) |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|
| `entitlement-core` (BIL-101/102/103) | **done** | verde 4/4 (2026-08-25) | — |
| `stripe-checkout-webhook` (BIL-201/202/203) | **done** | verde 4/4 (2026-08-25) | `entitlement-core` ✅ |
| `plan-gates` (BIL-301/302/303/304) | **done** | **verde 4/4** (2026-08-27) | `entitlement-core` ✅ |
| `billing-ui` (BIL-401/402) | todo | — | `entitlement-core` ✅, `stripe-checkout-webhook` ✅ |
| `downgrade-lifecycle` (BIL-501/502) | todo | — | `entitlement-core` ✅, `stripe-checkout-webhook` ✅ |

**Build order (DAG):** `entitlement-core ✅ → {stripe-checkout-webhook ✅, plan-gates ✅} → {billing-ui, downgrade-lifecycle}`.

## 2. Macrotask corrente

- **Prossimo**: `billing-ui` (BIL-401/402) oppure `downgrade-lifecycle` (BIL-501/502) — entrambi con le
  dipendenze verdi (`entitlement-core` + `stripe-checkout-webhook`). `billing-ui` porta la pagina
  "Passa a Pro" (gate VISIVO umano); `downgrade-lifecycle` la retrocessione morbida. La scelta è
  libera nel DAG; naturale `billing-ui` (chiude il ciclo utente: incassa → applica → mostra/vende).
- Alla ripresa: aprire `prompts/session-start.md`, leggere questo file, scegliere il macrotask e il branch.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/plan-gates` (da `main` pulito `ed0fdcc`) |
| Commit del macrotask | `01d822e` (16 file, +900/-40) + `bf5843e` (e2e, 2 file, +35) |
| Stato merge su `main` | **PENDING** — human-gate (deploy-coupling **coupled**: push su `main` = deploy su ulaba.net). Verifica locale PASSATA: vitest 1800/1801, lint 0, next build verde, **e2e Chromium 37/37** (public-hostile adattato al contratto SEO Pro-only). |
| Deploy-coupling | **coupled** — confermato. |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): **verde**, invariata nella sostanza. Nessun finding nuovo ≥ HIGH:
  `gitleaks:3` (baseline), `osv:2` (baseline), `semgrep:0` (il reader admin `getPublicSiteEntitlement`
  usa service_role **confinato** server-side senza pattern vietati; query tipate `.eq`, mai `.or/.filter`),
  `rls:1` (il preesistente `site_publications`, baseline). L'HIGH resta il preesistente.
- **Baseline d'igiene** (C1): **verde SENZA ri-baseline**. `dup 229 → 227` (**MIGLIORA**), `dead-code 0`,
  `cycle 0`, `twin 0`, **0 nuovi**. Il driver aveva flaggato 1 dup "nuovo" su `billing/_guard.ts` — era
  il **reshuffle** del clone preesistente `createSite ↔ _guard.ts` (pattern "account da owner_id"),
  acuito dal 3° call-site introdotto (`getAccountEntitlementForUser`). **Fix root-cause (non ri-baseline):**
  estratto l'helper condiviso `resolveOwnAccountId` (`src/data/account.ts`) usato da createSite + _guard.ts
  + reader cap AI → 3 copie ridotte a 1, clone eliminato alla radice. Misura diretta `jscpd@4 --min-tokens 50
  --mode strict`: 0 cloni sui file del macrotask.
- **Budget consumato**: 3 macrotask (10 task atomici Fase 1). Un ciclo di fix d'igiene (de-dup root-cause),
  nessun loop di fix di sicurezza (C2 verde al primo colpo). Regressioni da cambio-contratto risolte
  (SEO Pro-only, gate site-limit) aggiornando i test del meccanismo, non mascherando.

## 5. Esiti dell'ultima sessione (framing onesto)

- **`plan-gates` COSTRUITO test-first, 4/4 task verdi** — l'ENFORCEMENT dell'entitlement, server-side e
  **fail-safe verso Free** (in dubbio: badge presente, SEO base, cap stretto — mai un piano superiore per
  errore):
  - **BIL-301** — gate creazione sito in `createSite`: legge `getAccountEntitlement` + conta i siti
    dell'account vs `limits.max_sites`; alla soglia `{ ok:false, status:403 }`, **nessun insert** (free=1,
    pro=5); guasto del conteggio ⇒ 500 (mai bypass). Test runtime `plan-gate-site-limit` (RLS reale).
  - **BIL-302** — badge condizionale in `/s/<slug>`: monta `BeloraBadge` solo se `!no_badge`. Il serving è
    **anon** e non può leggere `account_id`/`subscriptions` ⇒ **reader server-side confinato**
    `getPublicSiteEntitlement` (`src/data/public-site-entitlement.ts`, `createAdminClient`, `cache()`d,
    try/catch ⇒ free). `.catch(()=>FREE_ENTITLEMENT)` nel serving = "mai assente per errore".
  - **BIL-303** — SEO avanzato gated in `generateMetadata` + render: **insieme avanzato esplicito e chiuso**
    = `{openGraph completo, twitter, JSON-LD LocalBusiness}` solo se `seo_advanced`; **base per tutti** =
    `{title, description, canonical, sitemap}` (il canonical resta base: è igiene anti-duplicato).
  - **BIL-304** — cap AI parametrico in `_shared/ai-endpoint.ts`: la soglia di `checkAiBudget` deriva da
    `limits.ai_monthly_cap` (`getAccountEntitlementForUser`, fail-safe totale ⇒ free), **non più una
    costante**; rate-limit (finestra) invariato; 429 al cap del piano. Spia sul `checkAiBudget` REALE.
- **Dominio/dati**: `FREE_ENTITLEMENT` esportato; `entitlementFromRow` (mapping riga→Entitlement condiviso
  tra reader di sessione e admin); `resolveOwnAccountId` (`account.ts`, de-dup). La guardia statica di
  `billing-get-account-entitlement` resta verde (subscriptions.ts non importa `supabase-admin` — il reader
  admin è nel file separato `public-site-entitlement.ts`).
- **Checkpoint 4/4 VERDE**: C1 igiene (dup 227, de-dup root-cause), C2 sicurezza (0 nuovi ≥ HIGH), C3
  regressioni (vitest **1800/1801**; l'unico rosso è `scaffold.test.ts` perché `tsc` fallisce su un
  **TS2589 PREESISTENTE** in `e2e/effects.spec.ts`, **provato non nel diff**, NON del macrotask; `next
  build` verde, lint 0), C4 conformità (5 target test, ogni AC tracciato con `covers:`).
- **Batteria di mutazione 5/5** (backup+sha256, ripristini bit-identici, mai `git checkout` sul macrotask
  uncommitted): gate off ⇒ site-limit rosso; badge-sempre ⇒ AC-302-2 rosso; seoAdvanced=true ⇒ AC-303-1/3
  rossi; costante al posto del cap ⇒ AC-304-2/3 rossi; fail-OPEN del reader ⇒ public-site-entitlement rosso.
- **Cambio di contratto dichiarato (BIL-303)**: il **SEO avanzato passa da free-tier a Pro-only**. I test
  del *meccanismo* (`seo-metadata`, `jsonld-localbusiness`, e2e `public-hostile`) fissano il piano a **Pro**
  per esercitare il campo; il *gate* free/Pro è nei `plan-gate` test. `sites-actions` (T-101): seed Pro per
  esercitare la creazione multi-sito. **Il free-tier non ha più openGraph/JSON-LD** — decisione di prodotto
  allineata al blueprint ("Free ⇒ solo SEO base"), da confermare col titolare del prodotto se indesiderata.
- **NON coperto, dichiarato (L-COL-006)**: `getPublicSiteEntitlement` reale (rete admin) è provato con
  fake iniettato (fail-safe) + serving mockato; l'e2e Chromium completo (**37/37 verde**) esercita il
  serving reale su `/s/` con account Pro. Il cap AI resta **per-sito totale** come oggi (out-of-scope): parametrizzo
  solo il valore dalla mappa del piano, non la granularità (per-sito vs per-account, "total" vs "mensile").

## 6. Prossimi passi

- **Merge su `main`**: **PENDING human-gate** (deploy-coupling coupled). Verifica locale COMPLETA e verde
  (vitest/lint/build/e2e 37/37). Al "vai": `git checkout main && git merge --no-ff trueline/build/plan-gates`
  + push (⇒ deploy su ulaba.net).
- **Prossimo macrotask**: `billing-ui` (poi `downgrade-lifecycle`) — Fase 2 (`custom-domains`) blueprint separato.
- **Config di deploy (non blueprint)**: env Vercel `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` /
  `STRIPE_PRICE_PRO` / `NEXT_PUBLIC_APP_URL`; registrare l'endpoint webhook su Stripe. Prima che il billing
  sia operativo, non prima del merge.
- **Migrazioni cloud**: `subscriptions` + `billing_webhook_events` **già applicate** (2026-08-27). plan-gates
  NON aggiunge migrazioni (solo enforcement applicativo su tabelle esistenti).
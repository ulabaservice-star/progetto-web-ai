# SESSION-STATE — p5-billing-fase1

> Fonte di verità sullo **stato vivo** del workstream `p5-billing-fase1` (Fase 1 di P5 — nucleo
> billing), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di
> P0…P4, design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard.
> Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 1 (nucleo billing) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-27 (session-end del BUILD `billing-ui`) |
| **Sessione corrente** | BUILD `billing-ui` — CHIUSA + **MERGIATO** su `main` (`5e2b1aa`, `--no-ff`; checkpoint 4/4 verde; mutazione 5/5; gate visivo APPROVATO; e2e Chromium 37/37; deploy coupled avviato su ulaba.net) |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|
| `entitlement-core` (BIL-101/102/103) | **done** | verde 4/4 (2026-08-25) | — |
| `stripe-checkout-webhook` (BIL-201/202/203) | **done** | verde 4/4 (2026-08-25) | `entitlement-core` ✅ |
| `plan-gates` (BIL-301/302/303/304) | **done** | **verde 4/4** (2026-08-27) | `entitlement-core` ✅ |
| `billing-ui` (BIL-401/402) | **done** | **verde 4/4** (2026-08-27) | `entitlement-core` ✅, `stripe-checkout-webhook` ✅ |
| `downgrade-lifecycle` (BIL-501/502) | todo | — | `entitlement-core` ✅, `stripe-checkout-webhook` ✅ |

**Build order (DAG):** `entitlement-core ✅ → {stripe-checkout-webhook ✅, plan-gates ✅} → {billing-ui ✅, downgrade-lifecycle}`.

## 2. Macrotask corrente

- **Prossimo (ULTIMO di Fase 1)**: `downgrade-lifecycle` (BIL-501/502) — dipendenze verdi
  (`entitlement-core` + `stripe-checkout-webhook`). Retrocessione **morbida con grazia**:
  `applyDowngrade` puro (badge torna, siti eccedenti → non-pubblicati **mai cancellati**,
  `past_due` servito Pro fino a fine grazia) + applicazione idempotente scatenata dal webhook.
  Chiude la Fase 1 (Fase 2 `custom-domains` = blueprint separato).
- Alla ripresa: aprire `prompts/session-start.md`, leggere questo file, scegliere il macrotask e il branch.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/billing-ui` (da `main` pulito `55d1d6c`) |
| Commit del macrotask | `9e79f47` (10 file: pagina + BillingPanel + billing-calls + reader + dashboard-nav + i18n it/es + 3 test) |
| Stato merge su `main` | ✅ **FATTO** — merge `--no-ff` `5e2b1aa` + push `origin/main` (`55d1d6c..5e2b1aa`) dopo il "vai" umano → deploy coupled avviato su ulaba.net. Verifica locale PASSATA: vitest 1811/1812, lint 0, next build, **e2e Chromium 37/37**. |
| Deploy-coupling | **coupled** — confermato. |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): **verde**, invariata. Nessun finding nuovo ≥ HIGH:
  `gitleaks:3` (baseline), `osv:2` (baseline), `semgrep:0`, `rls:1` (il preesistente `site_publications`,
  baseline). billing-ui non aggiunge superficie di rischio: la pagina legge sotto RLS di sessione (nessun
  `service_role`), il client `billing-calls` fa POST same-origin body `{}` agli endpoint già guardati
  (`_guard`), il redirect è a una url del provider validata nella forma. L'HIGH resta il preesistente.
- **Baseline d'igiene** (C1): **verde SENZA ri-baseline**. `dup 227` (**invariata**, **0 nuovi**),
  `dead-code 0`, `cycle 0`, `twin 0`. Il potenziale clone della query subscriptions (reader di sessione
  vs billing-state) è stato evitato alla radice estraendo `readSubscriptionRow` in `src/data/subscriptions.ts`
  (una sola query condivisa da `getAccountEntitlement` + `getAccountBillingState`); `getAccountEntitlement`
  rifattorizzato a usarla, comportamento invariato (test runtime RLS `billing-get-account-entitlement` 5/5).
  L'export `AccountBillingState` non ha prodotto dead-code (usato dalla pagina via `getOwnBillingState`).
- **Budget consumato**: 4 macrotask (12 task atomici Fase 1). Nessun loop di fix (C1/C2 verdi al primo colpo).
  Un artefatto EOL su `onboarding-generation-regression.test.ts.snap` (LF→CRLF, 0 righe) ripristinato
  con `git checkout` (file NON del macrotask, contenuto identico): il diff finale è circoscritto ai 10 file.

## 5. Esiti dell'ultima sessione (framing onesto)

- **`billing-ui` COSTRUITO test-first, 4/4 task verdi + gate visivo APPROVATO** — la superficie utente del
  billing, che riusa gli endpoint di `stripe-checkout-webhook` e riflette l'entitlement server-side (BIL-D2:
  la UI non decide il piano):
  - **BIL-401** — pannello "Abbonamento" (`src/ui/billing/BillingPanel.tsx`, client): mostra il piano
    corrente (Free/Pro) letto server-side; se Free, CTA "Passa a Pro" che apre il Checkout via
    `/api/billing/checkout` e reindirizza; se Pro nessuna CTA di upgrade. Target `billing-plan-panel.test.tsx`
    (AC-401-1/2/3), stringhe dai cataloghi REALI.
  - **BIL-402** — gestione: "Gestisci abbonamento" via `/api/billing/portal` (⟺ sub viva: active/trialing/
    past_due); stati esposti con etichette i18n; **past_due = "Ancora attivo — regolarizza il pagamento"**
    (grazia BIL-D6, MAI "scaduto"); canceled = "Disdetto" + CTA ri-abbonarsi. Target `billing-manage-portal.test.tsx`
    (AC-402-1/2/3, anti-tautologia: il pannello non contiene "scadut").
- **Dati (additivo, RLS di sessione)**: `readSubscriptionRow` privato condiviso (de-dup root-cause) +
  `getAccountBillingState`/`getOwnBillingState` che espongono lo STATO GREZZO della subscription (status +
  fine periodo) OLTRE all'entitlement risolto — i due non coincidono di proposito (past_due→pro in grazia,
  canceled→free). Fail-safe totale (guasto/assenza → free, subscription null). `getAccountEntitlement`
  rifattorizzato su `readSubscriptionRow` (comportamento invariato). Reader supporto `billing-account-state.test.ts` (5/5).
- **Confine client `billing-calls.ts`**: unico punto che conosce le rotte; POST same-origin body vuoto
  (accountId derivato dal server, mai dal client — cross-account impossibile), redirect a url validata nella
  forma, iniettabile (`navigate` prop) per i test. Nessun dato di carta da noi (PCI).
- **Pagina `[locale]/billing/page.tsx`** (glue, coperta da next build + e2e): getUser + redirect-a-login se
  assente (difesa in profondità); `getOwnBillingState(user.id)`; monta il pannello; voce nav "Abbonamento"
  agganciata nella dashboard (l'hub). i18n `billing.*` + `nav.subscription` it/es (parità verde).
- **Checkpoint 4/4 VERDE**: C1 igiene (dup 227, 0 nuovi), C2 sicurezza (0 nuovi ≥ HIGH), C3 regressioni
  (vitest **1811/1812**; unico rosso `scaffold.test.ts` per il **TS2589 PREESISTENTE** in `e2e/effects.spec.ts`,
  NON del macrotask; `next build` verde, lint 0; **e2e Chromium 37/37**), C4 conformità (6 AC tracciati con covers).
- **Batteria di mutazione 5/5** (backup+sha256, ripristini bit-identici, mai `git checkout` sul macrotask
  uncommitted): showUpgrade=true (CTA a Pro) → AC-401-3 rosso; past_due→active → AC-402-2 rosso;
  showManage=false → AC-402-1 rosso; checkout→portal → AC-401-2 rosso; reader subscription sempre null → reader-status rosso.
- **Gate visivo APPROVATO**: 4 stati (Free / Pro attivo / Pro past_due / canceled) resi via preview isolata
  temporanea + next dev + screenshot; coerenti coi token del design system. La route di preview è stata
  RIMOSSA prima del commit (non committata). L'estetica dell'area autenticata resta in coda a tutto il piano
  ([[polish-estetico-a-fine-piano]]).

## 6. Prossimi passi

- **Merge su `main`**: ✅ **FATTO** — merge `--no-ff` `5e2b1aa` + push `origin/main` (`55d1d6c..5e2b1aa`)
  dopo il "vai" umano; deploy coupled avviato su ulaba.net. Verifica locale completa e verde
  (vitest 1811/1812, lint 0, next build, e2e Chromium 37/37).
- **Prossimo macrotask (ULTIMO di Fase 1)**: `downgrade-lifecycle` (BIL-501/502) — retrocessione morbida
  con grazia (`applyDowngrade` puro + applicazione idempotente scatenata dal webhook). Chiude la Fase 1.
- **Config di deploy (non blueprint)**: env Vercel `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` /
  `STRIPE_PRICE_PRO` / `NEXT_PUBLIC_APP_URL`; registrare l'endpoint webhook su Stripe. La pagina
  `/[locale]/billing` è ora live ma le CTA restano inerti finché gli endpoint non hanno le chiavi Stripe in env.
- **Migrazioni cloud**: nessuna nuova (billing-ui è solo UI + reader su tabelle esistenti). `subscriptions`
  + `billing_webhook_events` già applicate (2026-08-27).

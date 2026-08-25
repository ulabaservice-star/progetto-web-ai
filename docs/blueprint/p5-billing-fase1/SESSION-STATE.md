# SESSION-STATE — p5-billing-fase1

> Fonte di verità sullo **stato vivo** del workstream `p5-billing-fase1` (Fase 1 di P5 — nucleo
> billing), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di
> P0…P4, design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard.
> Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 1 (nucleo billing) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-25 (session-end del BUILD `stripe-checkout-webhook`) |
| **Sessione corrente** | BUILD `stripe-checkout-webhook` — CHIUSA (checkpoint 4/4 verde; **commit di branch `2b62108`**; merge su `main` **PENDING human-gate** — deploy-coupling coupled) |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|
| `entitlement-core` (BIL-101/102/103) | **done** | verde 4/4 (2026-08-25) | — |
| `stripe-checkout-webhook` (BIL-201/202/203) | **done** | **verde 4/4** (2026-08-25) | `entitlement-core` ✅ |
| `plan-gates` (BIL-301/302/303/304) | todo | — | `entitlement-core` ✅ |
| `billing-ui` (BIL-401/402) | todo | — | `entitlement-core` ✅, `stripe-checkout-webhook` ✅ |
| `downgrade-lifecycle` (BIL-501/502) | todo | — | `entitlement-core` ✅, `stripe-checkout-webhook` ✅ |

**Build order (DAG):** `entitlement-core ✅ → {stripe-checkout-webhook ✅, plan-gates} → {billing-ui, downgrade-lifecycle}`.

## 2. Macrotask corrente

- **Prossimo**: `plan-gates` (BIL-301/302/303/304) — unica dipendenza `entitlement-core` verde;
  consuma `getAccountEntitlement`/`PLAN_LIMITS` (pronti). Con `stripe-checkout-webhook` ora chiuso,
  si sbloccano anche `billing-ui` e `downgrade-lifecycle` (che dipendono da entrambi): il DAG li
  mette dopo. La scelta naturale è `plan-gates` (enforcement dell'entitlement letto dal DB), poi
  `billing-ui`/`downgrade-lifecycle`.
- **Prerequisito operativo per `plan-gates` in produzione**: la migrazione `subscriptions`
  (`20260825000100`) va applicata al cloud (vedi §6); sul locale è già applicata.
- Alla ripresa: aprire `prompts/session-start.md`, leggere questo file, scegliere il macrotask e il branch.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/stripe-checkout-webhook` (da `main` pulito `ef19cc0`) |
| Commit del macrotask | `2b62108` (branch) — 18 file, +1520/-14 |
| Stato merge su `main` | **PENDING human-gate.** Checkpoint 4/4 verde + verifica locale passata (vitest 1781 pass, `next build` verde). Il merge deployerebbe (deploy-coupling **coupled**, push su `main` = deploy su ulaba.net): resta gate umano — attende il "vai". |
| Deploy-coupling | **coupled** — confermato. |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): invariata nella sostanza. Nessun finding nuovo ≥ HIGH: `gitleaks`
  vede solo i 3 secret già in baseline (le chiavi-fake dei test non scattano); `osv` nessun nuovo
  HIGH introdotto da `stripe` (aggiunge solo `stripe` + deps di `qs`); `semgrep` 0 (il webhook usa
  service_role confinato senza pattern vietati); `rls_check` pulito sul nuovo ledger
  `billing_webhook_events` (RLS abilitata + deny esplicito `authenticated using(false)` + GRANT solo
  service_role → `RLS002` risolto). L'unico HIGH resta il preesistente `site_publications` (baseline).
- **Baseline d'igiene** (C1): `224 → 225` fingerprint. **Ri-baseline onesta di +1**: un solo
  fingerprint di **dup-reshuffle** (`SESSION-STATE.md` ↔ `VISION-AND-CONSTRAINTS.md`, la tabella di
  metadati boilerplate) su **doc NON toccati dal branch** (entrambi dal bootstrap `93676f4`). Misura
  diretta `jscpd@4 --mode strict`: **0 cloni toccano il codice del macrotask** (i due endpoint
  checkout/portal sono stati de-duplicati con `billingActionRoute`, e `jsonError` è riusato da
  `request-guard` invece di ridefinirlo). `dead-code:0` (i type/funzioni interne di `_guard.ts` resi
  locali). `cycle:0`.
- **Budget consumato**: 2 macrotask (6 task atomici). Nessun loop di fix di sicurezza (C2 verde al
  primo colpo). Un ciclo di fix d'igiene C1 (de-dup + dead-code + ratchet reshuffle).

## 5. Esiti dell'ultima sessione (framing onesto)

- **`stripe-checkout-webhook` COSTRUITO test-first, 3/3 task verdi:**
  - **BIL-201** — porta `PaymentProvider` (dominio puro `src/domain/billing/payment-port.ts`: solo
    tipi, `createCheckout`/`openBillingPortal`/`parseWebhook`) + `SubscriptionEvent` normalizzato
    (`event_id` incluso, chiave d'idempotenza) + adattatore Stripe `src/data/payment/stripe.ts`
    (`server-only`, client **lazy iniettabile** come `anthropic.ts`; `constructEvent` verifica la firma
    HMAC → firma invalida `throw`; mappa `checkout.session.completed`/`customer.subscription.updated|
    deleted`/`invoice.payment_failed`) + **fake iniettabile** `tests/helpers/fake-payment-provider.ts`.
    `Plan`/`SubscriptionStatus` ora **esportati** da `entitlement.ts` (consumati dalla porta → esce il
    carry-over "li riesporterà plan-gates"). Test `payment-provider-stripe.test.ts` (8): firma
    valida/invalida (via `generateTestHeaderString`, zero rete) + mappatura eventi.
  - **BIL-202** — `POST /api/billing/webhook`: raw body (`request.text()`), **niente
    `guardMutatingRequest`** (server-to-server), firma verificata via la porta (invalida ⇒ 400),
    `applySubscriptionEvent` (`src/data/subscriptions-write.ts`, **store iniettabile**, default
    service_role via `createAdminClient`) con **dedup per event id** contro il nuovo ledger
    `billing_webhook_events` — 2xx solo ad avvenuta registrazione, catch che **logga** + 500 (mai 2xx
    opaco). Test `billing-webhook-route.test.ts` (8): route end-to-end su admin-client in-memory
    (osserva lo stato di subscriptions) + idempotenza diretta.
  - **BIL-203** — `POST /api/billing/{checkout,portal}`: preambolo condiviso `_guard.ts`
    (`resolveBillingActor` + `billingActionRoute`) = `guardMutatingRequest` + `getUser` (401) + body
    `z.object({}).strict()` (un `account_id` iniettato ⇒ **403**) + **accountId DERIVATO** da
    `accounts.owner_id === auth.uid()` (mai dal client). Fase 1 vende **solo Pro** (piano fisso). Test
    `billing-checkout-portal-route.test.ts` (6): account derivato, non-auth ⇒ 401, body-injection ⇒
    403, cross-origin ⇒ 403.
- **Checkpoint 4/4 VERDE** (driver decomposto `bil-checkpoint` per C1+C2; C3+C4 via vitest/build):
  C1 igiene verde (dopo de-dup + dead-code + ratchet reshuffle), C2 sicurezza verde, C3 regressioni
  (vitest **1781 pass**; l'unico rosso è `scaffold.test.ts` perché `npm run typecheck` fallisce su un
  **TS2589 PREESISTENTE** in `e2e/effects.spec.ts` — un generico Playwright, **provato identico su
  main `ef19cc0`**, NON introdotto da questo macrotask; `next build` **verde**, le 3 route billing nel
  manifest), C4 conformità (22 target test, **10/10 AC** tracciati con `covers:`).
- **Batteria di mutazione 4/4** (backup+sha256, ripristini bit-identici, mai `git checkout` sul
  macrotask uncommitted): firma saltata → AC-201-2 rosso; dedup rimosso → AC-202-2 rosso; body
  non-strict (accountId dal client) → AC-203-2 rosso; segreto Stripe hardcoded → gitleaks rosso.
- **Framing onesto**: il codice fa ciò che i task chiedevano, senza morto nuovo, senza vuln nuove
  ≥ HIGH, senza regressioni nuove — **NON** "il billing è completo/sicuro in assoluto". Questo è il
  canale che *incassa* (webhook = sorgente di verità, checkout/portal = azioni utente); i **gate** che
  *applicano* l'entitlement (plan-gates) e la retrocessione (downgrade-lifecycle) arrivano dopo.
- **NON coperto, dichiarato (L-COL-006)**: l'idempotenza + l'upsert sono provati **in-memory** (nessun
  test runtime del webhook contro il DB); `createCheckout`/`openBillingPortal` **reali** (rete Stripe)
  non sono testati a unità (il verde usa il **fake** iniettato); le chiavi Stripe (secret + signing +
  price id) sono **config di deploy** (env Vercel), non nel verde. La RLS del ledger
  `billing_webhook_events` è verificata solo **staticamente** (rls_check su DDL): il cloud non è ancora
  migrato. Il resolver del customer id per il billing portal reale è iniettabile ma non cablato a un
  reader dedicato (openBillingPortal reale non esercitato nei test).

## 6. Prossimi passi

- **Merge su `main`**: ⏳ **PENDING human-gate** (deploy-coupling coupled). Verifica locale passata
  (vitest 1781 pass, `next build` verde). Attende il "vai" umano; poi merge `--no-ff` + push
  (= deploy su ulaba.net).
- **⏳ Migrazioni al cloud — DA FARE (manuale)**: (1) `subscriptions` (`20260825000100`) — ancora da
  applicare, prereq di `plan-gates`; (2) **`billing_webhook_events` (`20260825000200`)** — nuova,
  prereq del webhook in produzione. Applicare entrambe a Supabase Cloud (SQL Editor + registrazione in
  `supabase_migrations.schema_migrations`, come per `onboarding_ai_usage`), verificando RLS/GRANT
  (`anon` assente). Sul **locale** `subscriptions` è già applicata; `billing_webhook_events` va
  applicata al locale con `db reset`/SQL (non richiesta per il verde, ma per i futuri test runtime).
- **Prossimo macrotask**: `plan-gates` (poi `billing-ui`/`downgrade-lifecycle`).
- **Config di deploy (non blueprint)**: env Vercel `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` /
  `STRIPE_PRICE_PRO` / `NEXT_PUBLIC_APP_URL` (documentate in `.env.example`); registrare l'endpoint
  webhook su Stripe. Vanno impostate prima che il billing sia operativo, non prima del merge.

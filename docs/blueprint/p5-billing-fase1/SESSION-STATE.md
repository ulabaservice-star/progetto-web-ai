# SESSION-STATE — p5-billing-fase1

> Fonte di verità sullo **stato vivo** del workstream `p5-billing-fase1` (Fase 1 di P5 — nucleo
> billing), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di
> P0…P4, design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard.
> Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 1 (nucleo billing) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-25 (session-end del BUILD `entitlement-core`) |
| **Sessione corrente** | BUILD `entitlement-core` — CHIUSA (checkpoint 4/4 verde; **MERGIATO su `main` `2f07dd3`** dopo "vai" umano; deploy coupled avviato) |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|
| `entitlement-core` (BIL-101/102/103) | **done** | **verde 4/4** (2026-08-25) | — |
| `stripe-checkout-webhook` (BIL-201/202/203) | todo | — | `entitlement-core` ✅ |
| `plan-gates` (BIL-301/302/303/304) | todo | — | `entitlement-core` ✅ |
| `billing-ui` (BIL-401/402) | todo | — | `entitlement-core` ✅, `stripe-checkout-webhook` |
| `downgrade-lifecycle` (BIL-501/502) | todo | — | `entitlement-core` ✅, `stripe-checkout-webhook` |

**Build order (DAG):** `entitlement-core ✅ → {stripe-checkout-webhook, plan-gates} → {billing-ui, downgrade-lifecycle}`.

## 2. Macrotask corrente

- **Prossimo**: `stripe-checkout-webhook` **oppure** `plan-gates` (entrambi hanno l'unica dipendenza
  `entitlement-core` ora verde; il DAG li mette in parallelo — il prossimo `session-start` sceglie).
  Nota di sequenza: `plan-gates` consuma già `getAccountEntitlement`/`PLAN_LIMITS` (pronti); il webhook
  è la sorgente che *scrive* lo stato. Nessun blocco tecnico su nessuno dei due.
- Alla ripresa: aprire `prompts/session-start.md`, leggere questo file, scegliere il macrotask e il branch.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/entitlement-core` (da `main` pulito `a9c6db4`) |
| Commit del macrotask | `876d24d` (branch) → merge `2f07dd3` su `main` |
| Stato merge su `main` | **MERGIATO** (`2f07dd3`, `--no-ff`) dopo "vai" umano; push su `origin/main` → deploy coupled avviato. Verifica locale passata prima del merge (vitest 1760/1760, `next build` ok) |
| Deploy-coupling | **coupled** — confermato. Il merge deployerebbe: resta gate umano anche sul checkpoint verde |

## 4. Baseline & budget

- **Baseline di sicurezza**: invariata (findings noti P0–P4 + OGW). La nuova tabella `subscriptions` è
  stata **validata dal checkpoint** (C2 verde: `rls_check` — 1 sola policy SELECT owner-only
  `is_account_member(account_id)`, nessuna scrittura authenticated, no anon; semgrep 0, nessun finding
  nuovo ≥ HIGH).
- **Baseline d'igiene**: `219 → 225` fingerprint (ri-baseline **onesta**: i 9 dup "nuovi" erano tutti su
  file `.md` del blueprint committati nel bootstrap docs-only `a9c6db4` — **0 su codice**, misura diretta
  `jscpd@4 --mode strict`; guard anti-codice superato). `dead-code:0` dopo aver reso locali i type
  `Plan`/`SubscriptionStatus` (non ancora consumati esternamente; li ri-esporterà `plan-gates`).
- **Budget consumato**: 1 macrotask (3 task atomici), nessun loop di fix di sicurezza (C2 verde al primo colpo).

## 5. Esiti dell'ultima sessione (framing onesto)

- **`entitlement-core` COSTRUITO test-first, 3/3 task verdi:**
  - **BIL-101** — migrazione `20260825000100_subscriptions.sql`: `public.subscriptions` con `account_id`
    PK (una sub per account, strutturale) + FK→accounts cascade; CHECK `plan`/`status`; **RLS: 1 sola
    policy SELECT owner-only**, zero scrittura authenticated; GRANT SELECT solo authenticated, scritture
    solo service_role, niente anon. Test RLS runtime `subscriptions-rls.test.ts` (5/5) contro il DB
    **locale** (mai il cloud): INSERT/UPDATE/DELETE client → **42501** (no GRANT + no policy, difesa a
    due strati), anon → 42501, oracolo indipendente anti-placebo.
  - **BIL-102** — dominio puro `src/domain/billing/entitlement.ts`: `PLAN_LIMITS {free,pro}`
    (business Oltre-P5, degrada a free) + `resolveEntitlement(sub|null, now)` puro, `now` iniettato,
    fail-safe (assente/non-attivo/scaduto/non-mappato ⇒ free). Test `billing-resolve-entitlement.test.ts`
    (6/6). `past_due` servito Pro fino a `current_period_end` (coerente BIL-D6).
  - **BIL-103** — reader `src/data/subscriptions.ts`: `getAccountEntitlement(accountId)` legge sotto RLS
    col **client di sessione** (mai service_role), `now` al confine, nessuna riga/guasto ⇒ free. Test
    `billing-get-account-entitlement.test.ts` (5/5): prova comportamentale che usa il client di sessione
    (con un tenant diverso l'entitlement di A è free) + guardia statica (no import admin/chiave).
- **Checkpoint 4/4 VERDE**: C1 igiene (verde dopo ri-baseline documentale), C2 sicurezza (verde),
  C3 regressioni (vitest **1760/1760**; il solo `scaffold.test.ts` era un falso rosso da contesa con
  `next build` concorrente — verde isolato), C4 conformità (16/16 target test).
- **Batteria di mutazione 3/3** (ripristino backup+sha256, mai `git checkout` sul macrotask uncommitted):
  policy INSERT authenticated → AC-101-1 rosso; `Date.now` interno → AC-102-4 rosso; default `pro` →
  AC-102-1/3/4 + AC-103-2 rossi. Tutti catturati, poi verde ripristinato.
- **Framing onesto**: il codice fa ciò che i task chiedevano, senza morto nuovo, senza vuln nuove ≥ HIGH,
  senza regressioni — **NON** "il billing è completo/sicuro in assoluto" (è il primo anello; il webhook
  che *muove* l'entitlement e i gate che lo *applicano* arrivano nei macrotask successivi).

## 6. Prossimi passi

- **Merge su `main`**: ✅ FATTO (`2f07dd3`, deploy coupled avviato).
- **⏳ Migrazione `subscriptions` al cloud — DA FARE (manuale)**: applicare a Supabase Cloud (SQL Editor +
  registrazione in `supabase_migrations.schema_migrations`, come per `onboarding_ai_usage`) **prima**
  che i gate dipendenti (`plan-gates`) diventino attivi. Sul **locale** è già applicata (BUILD/test).
- **Prossimo macrotask**: `stripe-checkout-webhook` o `plan-gates` (paralleli nel DAG).
- **Nota**: le chiavi Stripe (secret + signing) e i price id sono config di deploy (env Vercel), non
  artefatti del blueprint; il verde del checkpoint usa un fake `PaymentProvider` iniettato.

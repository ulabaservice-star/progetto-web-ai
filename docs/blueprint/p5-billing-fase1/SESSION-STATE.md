# SESSION-STATE — p5-billing-fase1

> Fonte di verità sullo **stato vivo** del workstream `p5-billing-fase1` (Fase 1 di P5 — nucleo
> billing), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di
> P0…P4, design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard.
> Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 1 (nucleo billing) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-25 (session-end del bootstrap) |
| **Sessione corrente** | bootstrap — CHIUSA |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|
| `entitlement-core` (BIL-101/102/103) | todo | — | — |
| `stripe-checkout-webhook` (BIL-201/202/203) | todo | — | `entitlement-core` |
| `plan-gates` (BIL-301/302/303/304) | todo | — | `entitlement-core` |
| `billing-ui` (BIL-401/402) | todo | — | `entitlement-core`, `stripe-checkout-webhook` |
| `downgrade-lifecycle` (BIL-501/502) | todo | — | `entitlement-core`, `stripe-checkout-webhook` |

**Build order (DAG):** `entitlement-core → {stripe-checkout-webhook, plan-gates} → {billing-ui, downgrade-lifecycle}`.

## 2. Macrotask corrente

- **Selezionato**: `entitlement-core` (nessuna dipendenza aperta: è la base del DAG).
- **Task atomici**: BIL-101 (tabella subscriptions + RLS), BIL-102 (PLAN_LIMITS + resolveEntitlement
  puro), BIL-103 (reader getAccountEntitlement).
- **Criteri/test di riferimento**: modulo `01-entitlement-core.md`; `target_tests`
  `tests/subscriptions-rls.test.ts`, `tests/billing-resolve-entitlement.test.ts`,
  `tests/billing-get-account-entitlement.test.ts`.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | — nessuno (bootstrap docs-only committato direttamente su `main`); il BUILD userà `trueline/build/entitlement-core` da `main` pulito |
| Ultimo commit | `93676f4` (docs: bootstrap blueprint p5-billing-fase1) — pushato su `origin/main` |
| Stato merge su `main` | bootstrap (solo docs) su `main`; **nessun macrotask di CODICE ancora costruito** |
| Deploy-coupling | **coupled** (push su `main` = deploy su ulaba.net); il bootstrap è docs-only → non altera il sito servito. Il CODICE del BUILD sarà human-gated con verifica locale prima del merge |

## 4. Baseline & budget

- **Baseline di sicurezza**: quella del repo (findings noti P0–P4 + OGW invariati); la nuova tabella
  `subscriptions` sarà validata dal checkpoint (RLS SELECT owner-only, nessuna scrittura client, no
  anon).
- **Budget consumato**: 0 (bootstrap).

## 5. Esiti dell'ultima sessione (framing onesto)

- Blueprint `p5-billing-fase1` generato dai template trueline: 5 moduli, 14 task atomici, DAG
  `entitlement-core → {stripe-checkout-webhook, plan-gates} → {billing-ui, downgrade-lifecycle}`.
- **Self-check strutturale (`validate_blueprint.mjs`) ESEGUITO: VERDE — exit 0, 14 task, 5/5 controlli
  (TASKS_PRESENT, REQUIRED_FIELDS, AC_COVERAGE, DAG_VALID, UNIQUE_IDS, MACROTASK_OWNERSHIP).**
- **Self-check semantico (punti 6–10): nessun rilievo aperto.** R1 (catena checkout→webhook:
  `account_id` incorporato nel `metadata` della sessione da `createCheckout` e recuperato da
  `parseWebhook`) risolto in-place nel DoD di BIL-201/203; rilievi dichiarati non bloccanti — set
  concreto dei campi SEO-avanzati (BIL-303) da fissare a inizio macrotask; cap-AI (BIL-304) deriva
  l'account dal sito col pattern esistente di `generate-description`.
- **Framing onesto:** il piano ha superato i controlli strutturali e non presenta rilievi semantici
  aperti — NON "il piano è giusto" (la correttezza dell'intento resta una scelta umana).
- Blueprint committato + pushato su `main`: `93676f4` (docs-only). Memoria di progetto aggiornata.

## 6. Prossimi passi

- **Prima sessione BUILD: macrotask `entitlement-core`** su branch `trueline/build/entitlement-core`
  (apri `prompts/session-start.md` in sessione fresca).
- Migrazione `subscriptions` da applicare a Supabase Cloud (SQL Editor + registrazione in
  `schema_migrations`, come per `onboarding_ai_usage`) prima che i gate dipendenti diventino attivi.
- **Nota:** le chiavi Stripe (secret + signing) e i price id sono config di deploy (env Vercel), non
  artefatti del blueprint; il verde del checkpoint usa un fake PaymentProvider iniettato.

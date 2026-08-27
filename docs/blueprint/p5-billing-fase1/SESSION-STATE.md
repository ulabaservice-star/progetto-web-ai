# SESSION-STATE — p5-billing-fase1

> Fonte di verità sullo **stato vivo** del workstream `p5-billing-fase1` (Fase 1 di P5 — nucleo
> billing), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di
> P0…P4, design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard.
> Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 1 (nucleo billing) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-27 (session-end del BUILD `downgrade-lifecycle`) |
| **Sessione corrente** | BUILD `downgrade-lifecycle` — CHIUSA + **MERGIATO** su `main` (`749017c`, `--no-ff`; checkpoint 4/4 verde; mutazione 5/5; e2e Chromium 37/37; deploy coupled avviato su ulaba.net). **Fase 1 COMPLETA — DAG chiuso.** |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|
| `entitlement-core` (BIL-101/102/103) | **done** | verde 4/4 (2026-08-25) | — |
| `stripe-checkout-webhook` (BIL-201/202/203) | **done** | verde 4/4 (2026-08-25) | `entitlement-core` ✅ |
| `plan-gates` (BIL-301/302/303/304) | **done** | verde 4/4 (2026-08-27) | `entitlement-core` ✅ |
| `billing-ui` (BIL-401/402) | **done** | verde 4/4 (2026-08-27) | `entitlement-core` ✅, `stripe-checkout-webhook` ✅ |
| `downgrade-lifecycle` (BIL-501/502) | **done** | **verde 4/4** (2026-08-27) | `entitlement-core` ✅, `stripe-checkout-webhook` ✅ |

**Build order (DAG):** `entitlement-core ✅ → {stripe-checkout-webhook ✅, plan-gates ✅} → {billing-ui ✅, downgrade-lifecycle ✅}` — **DAG CHIUSO, Fase 1 COMPLETA**.

## 2. Macrotask corrente

- **NESSUNO** — tutti i 5 macrotask (14 task atomici) della Fase 1 sono `done` e mergiati su `main`.
  Alla fine della Fase 1 **si incassa già**: Pro sblocca niente-badge + SEO avanzato + 5 siti + cap AI
  ampio (GEO in Free), l'entitlement lo muove solo il webhook, la retrocessione è **morbida con grazia**.
- **Prossimo workstream**: **Fase 2 `custom-domains`** — **blueprint SEPARATO** (`DomainProvider` +
  host-routing, solo connessione non vendita; Vercel/Cloudflare al build). Va **bootstrappato** a parte,
  non è un macrotask di questo blueprint (BIL-D7: i domini custom sono fuori dalla Fase 1).
- **NB**: il polish estetico dell'area autenticata resta in coda a TUTTO il piano (non ora).

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/downgrade-lifecycle` (da `main` pulito `cb9963c`) |
| Commit del macrotask | `4770380` (7 file, +393/−3: `applyDowngrade` dominio puro + `applySoftDowngrade` data + aggancio webhook + 2 target test + fake admin `site_publications` nel test webhook + re-baseline igiene) |
| Stato merge su `main` | ✅ **FATTO** — merge `--no-ff` `749017c` + push `origin/main` (`cb9963c..749017c`) dopo il "vai" umano → deploy coupled avviato su ulaba.net. Verifica locale PASSATA: vitest 1820/1821, lint 0, next build, **e2e Chromium 37/37**. |
| Deploy-coupling | **coupled** — confermato. |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): **verde**, invariata. Nessun finding nuovo ≥ HIGH:
  `gitleaks:3` (baseline), `osv:2` (baseline), `semgrep:0`, `rls:1` (il preesistente `site_publications`,
  baseline). downgrade-lifecycle non aggiunge superficie di rischio: dominio puro (nessun DB/rete) +
  applicazione nel percorso del webhook già confinato (service_role fuori dal percorso utente, A01/R7),
  che riusa la porta iniettabile e `unpublish` NON distruttivo (mai DELETE). Nessuna nuova migrazione.
- **Baseline d'igiene** (C1): **verde con re-baseline ONESTA 225→227** (`.trueline/hygiene-baseline.json`).
  I 2 fingerprint aggiunti (`a67e8781…`, `dfe884de…`) sono **entrambi su `eval/reference-app/src/app/
  [locale]/dashboard/page.tsx`** — file ESTRANEO al macrotask: pura riorganizzazione dei cluster jscpd
  (jscpd non è stabile fra macrotask vicini). **Contro-prova diretta jscpd@4** (`--min-tokens 50 --mode
  strict`): **0 cloni** toccano i file del macrotask (`downgrade.ts`, `subscription-downgrade.ts`,
  `webhook/route.ts`) su 129 totali in `src`. `dead-code 0`, `cycle 0`, `twin 0`. `DowngradeOutcome` reso
  NON esportato (return type locale) per non introdurre dead-code.
- **Budget consumato**: 5 macrotask (14 task atomici Fase 1) — **DAG completo**. Nessun loop di fix
  (C1/C2 verdi; il rosso C1 iniziale era la re-baseline onesta di riorganizzazione, non un difetto).
  Artefatto EOL su `onboarding-generation-regression.test.ts.snap` (LF→CRLF, 0 righe di contenuto)
  ripristinato con `git checkout` (file NON del macrotask): il diff finale è circoscritto ai 7 file.

## 5. Esiti dell'ultima sessione (framing onesto)

- **`downgrade-lifecycle` COSTRUITO test-first, 4/4 task verdi** — la rete di sicurezza del cliente
  (BIL-D6: il sito non si spegne mai di colpo), che riusa `resolveEntitlement` e `unpublishSite`:
  - **BIL-501** — `applyDowngrade(subscription, sites, now)` PURO (`src/domain/billing/downgrade.ts`):
    riusa `resolveEntitlement` → **una sola definizione di grazia** (`current_period_end`, no `graceDays`
    separato). `past_due` entro il periodo resta pro (nessuna azione); a fine grazia o `canceled` decade
    a free, `badgeRestored = !limits.no_badge` (deriva dai limiti), `sitesToUnpublish` = i siti PUBBLICATI
    oltre `max_sites` free (=1), tenendo i primi. **Mai una cancellazione** (il contratto non ha campo
    delete). Target `billing-apply-downgrade.test.ts` (AC-501-1..4, 5 test).
  - **BIL-502** — `applySoftDowngrade(accountId, subscription, now, store)` (`src/data/subscription-
    downgrade.ts`): applica l'esito nel percorso del webhook. Porta `SiteDowngradeStore` iniettabile
    (gemella di `SubscriptionStore`), default `service_role` confinato; `unpublishSite` NON distruttivo
    (solo `is_published=false`). **Idempotente** (solo i pubblicati contano → seconda esecuzione no-op),
    riattivando Pro i dati sono intatti. **Agganciato in `webhook/route.ts`** dopo `applySubscriptionEvent`
    (Subscription costruita dall'event, `now` al confine, sempre chiamato → robusto ai retry). Target
    `billing-downgrade-apply.test.ts` (AC-502-1..3, 3 test) + test comportamentale dell'aggancio nel
    `billing-webhook-route.test.ts` (fake admin esteso a `site_publications`).
- **Checkpoint 4/4 VERDE**: C1 igiene (0 nuovi, re-baseline onesta §4), C2 sicurezza (0 nuovi ≥ HIGH),
  C3 regressioni (vitest **1820/1821**; unico rosso `scaffold.test.ts` per il **TS2589 PREESISTENTE** in
  `e2e/effects.spec.ts`, NON del macrotask, 0 errori TS nei file miei; `next build` verde, lint 0;
  **e2e Chromium 37/37**), C4 conformità (7 AC tracciati con covers, target test 9/9).
- **Batteria di mutazione 5/5** (backup+sha256, ripristini bit-identici, mai `git checkout` sul macrotask
  uncommitted): (1) grazia ignorata → AC-501-1 rosso; (2) `.slice(0)` conteggio eccedenti → AC-501-3
  rosso; (3) `badgeRestored=false` → AC-501-2 rosso; (4) filtro pubblicati rimosso (non idempotente) →
  AC-502-2 rosso; (5) applicazione disattivata (no unpublish) → AC-502-1 + webhook rosso.
- **Nessun gate visivo** (macrotask senza UI: dominio + data + aggancio webhook server-side).

## 6. Prossimi passi

- **Merge su `main`**: ✅ **FATTO** — merge `--no-ff` `749017c` + push `origin/main`
  (`cb9963c..749017c`) dopo il "vai" umano; deploy coupled avviato su ulaba.net.
- **Fase 1 COMPLETA**: nucleo billing pronto. **Prossimo = Fase 2 `custom-domains`** (blueprint separato
  da bootstrappare, BIL-D7) — NON un macrotask di questo blueprint.
- **Config di deploy (non blueprint, prereq go-live)**: env Vercel `STRIPE_SECRET_KEY` /
  `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PRO` / `NEXT_PUBLIC_APP_URL`; registrare l'endpoint webhook su
  Stripe. Le CTA billing e il ciclo checkout→webhook→(entitlement/downgrade) restano inerti finché le
  chiavi Stripe non sono in env Vercel. Prereq infrastruttura: Vercel Pro + Supabase Pro (~$45/mo).
- **Migrazioni cloud**: nessuna nuova (downgrade-lifecycle è dominio puro + applicazione su tabelle
  esistenti `subscriptions`/`site_publications`, già applicate).

# 00-INDEX — p5-billing-fase1

> Mappa del blueprint trueline della **Fase 1 di P5 — nucleo billing ("incassa")** di Ulaba/Belora
> (`supabase-jsts`). Design a monte (approvato): `docs/superpowers/specs/2026-08-25-p5-billing-design.md`.
> Un modulo = un macrotask (checkpoint al confine + commit atomico). Schema task:
> `references/blueprint/atomic-task-schema.md`. Prosa in italiano, identificatori in inglese.

## Scopo

Dare al prodotto l'ultimo anello mancante: **incassare**. Introdurre il modello di ricavo
**freemium a tier-bundle** (Free = gancio / Pro = serio + trovato) senza mai castrare la qualità del
sito generato. Alla fine della Fase 1 **si incassa già**: Pro sblocca niente-badge + SEO avanzato +
5 siti + cap AI ampio (GEO è in Free). L'entitlement vive sull'`account`, lo muove **solo** il
webhook del payment provider (mai il client). Stripe è dietro la porta `PaymentProvider`. I **domini
custom** sono la **Fase 2** (blueprint separato), fuori da qui.

## Mappa dei macrotask

| # | Macrotask | Obiettivo | Dipende da |
|---|---|---|---|
| 01 | `entitlement-core` | Cuore tecnico: tabella `subscriptions` (RLS owner-only, **solo lettura client**) + `PLAN_LIMITS` puri + `resolveEntitlement` puro + reader server-side `getAccountEntitlement`. Base di tutto. | — |
| 02 | `stripe-checkout-webhook` | Porta `PaymentProvider` + adattatore Stripe (checkout, billing portal, parse webhook con firma) + **endpoint webhook firmato/idempotente** (sorgente di verità dello stato) + endpoint checkout/portal con guardie account. | `entitlement-core` |
| 03 | `plan-gates` | Enforcement server-side sull'entitlement dal DB: **limite siti** (free=1/pro=5), **badge** (free) / **no-badge** (pro), **campi SEO avanzati** (pro), **cap AI parametrico** dal piano (riusa `onboarding_ai_usage`). | `entitlement-core` |
| 04 | `billing-ui` | Pagina "Passa a Pro": stato abbonamento dall'entitlement (server) + CTA che apre il Checkout Stripe + link al **Billing Portal** per gestione/disdetta. Nessuna UI di carta custodita da noi. | `entitlement-core`, `stripe-checkout-webhook` |
| 05 | `downgrade-lifecycle` | Retrocessione **morbida con grazia**: `applyDowngrade` puro (badge torna, siti eccedenti → non-pubblicati **mai cancellati**, `past_due` servito Pro fino a fine grazia) + applicazione idempotente scatenata dal webhook. | `entitlement-core`, `stripe-checkout-webhook` |

**Build order (DAG):** `entitlement-core → {stripe-checkout-webhook, plan-gates} → {billing-ui, downgrade-lifecycle}`.

## ID dei task

Prefisso `BIL-`. entitlement-core `BIL-1xx`, stripe-checkout-webhook `BIL-2xx`, plan-gates
`BIL-3xx`, billing-ui `BIL-4xx`, downgrade-lifecycle `BIL-5xx`. ID stabili, mai riusati.

## Decision ledger (BIL-D)

- **BIL-D1 — Freemium a tier-bundle, non crediti/add-on.** Si gate-a il **valore commerciale**
  (no-badge, dominio, SEO avanzato, più siti), mai la qualità del sito generato (design v2 "meglio di
  Wix" è in Free, è il gancio). Le funzioni pro stanno **dentro un tier**, non a voce singola. Supera
  la vecchia decisione ricavi 2026-07-22 (niente crediti/add-on à la carte).
- **BIL-D2 — Entitlement mai fidato dal client.** Lo stato del piano lo muove **solo** il webhook
  server (firma verificata). `subscriptions` ha RLS **SELECT owner-only** e **nessuna policy di
  scrittura per il client**: la scrittura è server-side (service_role confinato, fuori dal percorso
  utente). Stesso principio anti-self-reset di `onboarding_ai_usage` (append-only / server-only).
- **BIL-D3 — Limiti in codice, non nel DB.** `PLAN_LIMITS = { free, pro }` sono costanti **pure e
  testabili** (n° siti, cap AI, flag SEO-avanzato/no-badge/dominio-custom). Cambiarli è un **deploy**,
  non una migrazione. `resolveEntitlement(subscription, now)` è **puro** (nessun `Date.now` interno;
  `now` iniettato): assenza/scadenza ⇒ `free`.
- **BIL-D4 — Provider esterni dietro una porta.** Il pagamento è astratto dietro `PaymentProvider`
  (`createCheckout`, `openBillingPortal`, `parseWebhook`): il resto del sistema non conosce Stripe.
  Un provider LATAM (Oltre P5) è un nuovo adattatore, gating invariato. Nei test il provider è un
  **fake iniettato**; nessuna chiave reale è richiesta per il verde del checkpoint.
- **BIL-D5 — Webhook = sorgente di verità, idempotente.** Firma Stripe verificata + dedup per event
  id (Stripe ri-invia). Catch che **logga** (mai un 502 opaco); 2xx solo ad avvenuta registrazione.
- **BIL-D6 — Retrocessione morbida, nessun dato perso.** Il sito **non si spegne mai di colpo**:
  grazia (`past_due` resta Pro fino a fine grazia), poi badge che torna + siti eccedenti
  **non-pubblicati ma MAI cancellati** (riattivabili pagando). `applyDowngrade` è **puro**.
- **BIL-D7 — Domini custom fuori dalla Fase 1.** Lo scollegamento del dominio custom in downgrade e
  l'host-routing sono **Fase 2**: in `downgrade-lifecycle` di Fase 1 non si tocca alcun dominio custom.
- **BIL-D8 — Altitudine riusata dal globale.** Nessun blocco `architecture:` nel blueprint: vale il
  contratto globale `tests/architecture-contract.test.ts` (dominio puro; `ui→domain` lecito;
  `service_role` fuori dal percorso utente). Coerente con `onboarding-guided-wizard` (OGW-D6).

## Manifest ecosistema

- **Ecosistema attivo:** `supabase-jsts` (Next.js 16 App Router + TypeScript + Supabase Cloud EU).
- **Superficie:** `src/domain/billing` (dominio puro: PLAN_LIMITS, resolveEntitlement, applyDowngrade)
  + `src/data/subscriptions.ts` + `src/data/payment/` (porta + adattatore Stripe) +
  `src/app/api/billing/**` (webhook, checkout, portal) + `src/ui/billing/**` (pagina "Passa a Pro")
  + gate nei punti esistenti (`site-publications`/serving badge, creazione sito, generatore SEO,
  `_shared/ai-endpoint`) + **1 migrazione** (`subscriptions`). Brief, generazione e motore v2 invariati.
- **Baseline sicurezza attesa:** una nuova tabella `subscriptions` con **RLS SELECT owner-only, zero
  policy di scrittura client** → il checkpoint la valida (`rls_check`); il webhook verifica firma +
  idempotenza; i nuovi endpoint riusano le guardie condivise (`request-guard`, `route-guards`).
- **Deploy-coupling `coupled`:** merge su `main` human-gated; verifica locale (vitest, e2e Chromium,
  `next build`) prima del merge; segreti Stripe via env Vercel, mai nel sorgente.

## Invarianti (project-start)

Non castrare la qualità (design v2 in Free); GDPR base sempre incluso; entitlement mosso solo dal
webhook (client legge, non decide); RLS con `account_id`/`owner` esplicito nel testo policy (no
`USING (true)`); nessun `service_role` nel percorso utente; provider dietro porta; webhook firmato +
idempotente; retrocessione morbida senza perdita dati; guardie di rotta condivise; escaping (mai testo
non fidato in `innerHTML`/`href`); `ui→domain` lecito; git a strati + deploy-coupling coupled;
oracle-as-judge + gate umano.

## Fonti di verità

- **Piano**: questo blueprint (`00-INDEX` + moduli `01`–`05`).
- **Stato vivo**: `docs/blueprint/p5-billing-fase1/SESSION-STATE.md`.
- **Design a monte**: `docs/superpowers/specs/2026-08-25-p5-billing-design.md` (approvato, `037c27d`).

## Self-check del blueprint

- **Strutturale**: `validate_blueprint.mjs` su questa dir — atteso exit 0 (5 controlli).
- **Semantico**: `self-check-checklist.md` punti 6–10 su ogni task; rilievi → human-in-the-loop.

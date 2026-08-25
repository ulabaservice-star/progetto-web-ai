# VISION & CONSTRAINTS — p5-billing-fase1

> Visione e vincoli della Fase 1 di P5 (nucleo billing) di Ulaba/Belora. Il *perché*, il *per chi*,
> i *non-goals*, i *vincoli*. Input dell'utente (design approvato), non invenzione dell'LLM.
> Prosa in italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 1 (nucleo billing) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Owner / stakeholder** | Ulaba/Belora |
| **Design a monte** | `docs/superpowers/specs/2026-08-25-p5-billing-design.md` (approvato, `037c27d`) |

---

## 1. Perché esiste (problema)

I piani P0–P4 sono completi; la qualità di generazione (`design-engine-v2`, "meglio di Wix") e il
flusso d'ingresso (`onboarding-guided-wizard`) sono risolti. Manca l'ultimo anello per essere un
prodotto: **incassare**. Oggi non c'è monetizzazione — nessun concetto di piano a pagamento, nessun
gate di valore, nessuna superficie di pagamento. L'unica spesa governata (`onboarding_ai_usage`) è un
cap anti-abuso dell'AI, non un billing legato a denaro. P5 introduce il modello di ricavo.

## 2. Per chi (utenti)

Micro-business locali IT/ES/LATAM (ristorazione, fitness, saloni/studi, negozi artigiani) che
costruiscono un sito con Ulaba. Il **Free** è il gancio virale (ogni sito gratuito, live con badge, è
una vetrina del prodotto); il **Pro** è per chi vuole "sembrare serio ed essere trovato" (dominio
custom — Fase 2 —, niente badge, SEO avanzato, fino a 5 siti, cap AI ampio).

## 3. Obiettivo (cosa significa "fatto")

Alla fine della Fase 1 **si incassa già**: un utente può passare a Pro (Checkout Stripe), il webhook
firmato attiva l'entitlement sull'account, e i gate server-side sbloccano no-badge + SEO avanzato + 5
siti + cap AI ampio. Un Pro che decade retrocede in modo **morbido** (grazia, poi badge che torna e
siti eccedenti offline ma non cancellati). "Fatto" = oracoli verdi al confine di ogni macrotask
(`target_tests`), **non** una dichiarazione dell'LLM.

## 4. Non-goals (cosa NON facciamo in Fase 1)

- **Domini custom** (`site_domains`, `DomainProvider`, host-routing): sono la **Fase 2** (blueprint
  separato). Anche lo *scollegamento* del dominio in downgrade è Fase 2.
- **Provider di pagamento LATAM** (Mercado Pago, Pix, EBANX/dLocal): nuovo adattatore della porta,
  *Oltre P5*.
- **Tier Business / agenzie** (multi-sito illimitato, team, white-label, GDPR/analytics avanzati):
  *Oltre P5*.
- **Crediti a consumo / add-on à la carte**: esclusi per scelta (anti-pattern per il pubblico; costo
  AI già trascurabile, ~1¢/batch).
- **UI di gestione carta custodita da noi**: la gestione (cambio carta, disdetta) passa dal **Billing
  Portal Stripe**; non custodiamo dati di pagamento.
- **Polish estetico UI**: in coda a tutto il piano, sessione dedicata.

## 5. Vincoli

| Tipo | Vincolo |
|---|---|
| Ecosistema | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| Sicurezza | RLS su `subscriptions` con `account_id`/owner **esplicito** nel testo policy; **SELECT owner-only, nessuna scrittura client** (entitlement mosso solo dal webhook); nessun `service_role` nel percorso utente; nessun segreto Stripe nel sorgente (env Vercel) |
| Integrità | Webhook firma-verificata + **idempotente** (dedup per event id); il client legge il piano, non lo decide |
| Provider | Pagamento dietro porta `PaymentProvider` (Stripe = primo adattatore); fake iniettato nei test |
| Git | branch a strati; merge su `main` gated dal verde; **deploy-coupling coupled** → verifica locale prima del merge (`L-COL-024`, `L-COL-025`) |
| Invarianza | Brief, generazione e motore v2 **invariati**; il badge free-tier esistente (T-408) diventa condizionale sul piano, non scompare |

## 6. Parity gate (promessa forte)

Conformità alla specifica = i `target_tests` dei task del macrotask passano al checkpoint. Dominio
puro (`resolveEntitlement`, `applyDowngrade`, `PLAN_LIMITS`) testato per valore; RLS provata via
`rls_check` (+ test a runtime dove il DB di test è disponibile); webhook provato con firma
valida/invalida e replay (idempotenza).

## 7. Baseline & budget

- **Baseline di sicurezza**: quella del repo (findings noti P0–P4 + OGW invariati) + la nuova tabella
  `subscriptions` validata dal checkpoint. Nessun nuovo GRANT ad `anon`.
- **Budget**: loop di fix entro i tetti di `references/oracles/thresholds.md`.
- **Prereq go-live (non build):** Vercel Pro + Supabase Pro (~$45/mo) + chiavi Stripe live — config di
  deploy, fuori dal blueprint.

## 8. Fonti di verità

- **Piano**: il blueprint (`00-INDEX` + moduli `01`–`05`).
- **Stato vivo**: `docs/blueprint/p5-billing-fase1/SESSION-STATE.md`.
- **Design**: `docs/superpowers/specs/2026-08-25-p5-billing-design.md`.

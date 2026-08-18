# 00-INDEX — onboarding-guided-wizard

> Mappa del blueprint trueline del ridisegno onboarding di Ulaba/Belora (`supabase-jsts`).
> Design a monte: `docs/superpowers/specs/2026-08-18-onboarding-guided-wizard-design.md`.
> Un modulo = un macrotask (checkpoint al confine + commit atomico). Schema task:
> `references/blueprint/atomic-task-schema.md`. Prosa in italiano, identificatori in inglese.

## Scopo

Sostituire l'onboarding **chat-led** (P1, inaffidabile/costoso/poco ergonomico) con un **wizard
guidato deterministico + AI mirata on-demand** (import-URL, genera-descrizione, suggerisci-offerte),
governando la spesa con un contatore per-sito. `Brief`, generazione e motore v2 restano invariati.

## Mappa dei macrotask

| # | Macrotask | Obiettivo | Dipende da |
|---|---|---|---|
| 01 | `ai-usage-guard` | Contatore d'uso AI per-sito (migrazione + RLS owner-only) + helper `checkAndConsumeAiBudget` (cap → 429, rate-limit a finestra iniettata). Governa la spesa dei 3 pulsanti AI. | — |
| 02 | `offerings-editor` | Rendere le **offerte editabili**: `BriefCorePatch` esteso a `offerings` + `OfferingsEditor` (UI generica, etichetta per-settore da `resolveOfferings`, hint prezzo per salone). | — |
| 03 | `generate-description` | Dominio `generateDescription` (porta LLM iniettata, anti-invenzione, validazione) + endpoint (guardie + budget) + UI ✨ nello step Racconto. | `ai-usage-guard` |
| 04 | `suggest-offerings` | Dominio `suggestOfferings` (placeholder prezzo-vuoto, validazione) + endpoint (guardie + budget) + UI ✨ nell'editor con **conferma per-voce**. | `ai-usage-guard`, `offerings-editor` |
| 05 | `wizard-shell` | Contenitore wizard a step (Ingresso import/da-zero → Base bottoni → Racconto → Offerte → Contatti&orari → Rivedi→Genera), navigazione, "Salta", stato condiviso; riorganizza `OnboardingWorkspace` e integra i pezzi. | `offerings-editor`, `generate-description`, `suggest-offerings` |
| 06 | `remove-chat` | Rimozione `ChatPanel`/`interview.ts`/`POST /turn` + test/i18n chat; regressione: la generazione produce lo stesso brief/documento. | `wizard-shell` |

**Build order (DAG):** `{ai-usage-guard, offerings-editor} → generate-description · suggest-offerings → wizard-shell → remove-chat`.

## ID dei task

Prefisso `OGW-`. ai-usage-guard `OGW-1xx`, offerings-editor `OGW-2xx`, generate-description
`OGW-3xx`, suggest-offerings `OGW-4xx`, wizard-shell `OGW-5xx`, remove-chat `OGW-6xx`. ID stabili,
mai riusati.

## Decision ledger (OGW-D)

- **OGW-D1 — Chat libera rimossa.** L'onboarding non è più conversazionale; l'AI è on-demand.
  Supera il "fix intervista": niente `update_brief` conversazionale da rendere affidabile.
- **OGW-D2 — AI = suggerimento editabile (anti-invenzione P2-D7).** Ogni output dei 3 pulsanti AI
  è proposto e confermato; niente entra nel brief senza un clic. Suggerimenti-offerte = placeholder
  a **prezzo vuoto**, confermati per-voce.
- **OGW-D3 — Offerte settore-agnostiche.** Il form edita `offerings[]` generico; il `vertical`
  decide solo l'etichetta (via `resolveOfferings`) e se il prezzo appare sul sito (già in `blocks.ts`).
  La **resa visiva** per settori non-ristorazione è fuori scope (macrotask "settori").
- **OGW-D4 — Spesa governata per-sito, non a crediti.** Contatore d'uso AI per-sito (cap → 429) +
  rate-limit a finestra; il ledger crediti è P5. Incremento **solo su chiamata riuscita**.
- **OGW-D5 — Brief/generazione/motore-v2 invariati.** Il wizard scrive gli stessi campi
  (`applyBriefUpdate`/`upsertBrief`); `/generate` e il motore v2 non cambiano.
- **OGW-D6 — Altitudine riusata dal globale.** Nessun blocco `architecture:` nel blueprint:
  vale `tests/architecture-contract.test.ts` (dominio puro, `ui→domain` lecito).

## Manifest ecosistema

- **Ecosistema attivo:** `supabase-jsts` (Next.js 16 App Router + TypeScript + Supabase).
- **Superficie:** `src/domain/onboarding` + `src/ui/onboarding` + `src/app/api/onboarding` +
  `src/domain/import` (riuso) + **1 migrazione** (contatore uso AI + RLS). Nessuna modifica a
  `Brief`, generazione, motore v2.
- **Baseline sicurezza attesa:** una nuova tabella con **RLS owner-only** (OGW-101) → il checkpoint
  la valida (`rls_check`); i nuovi endpoint AI riusano le guardie condivise. 2 FP noti invariati.
- **Deploy-coupling `coupled`:** merge su `main` human-gated; verifica locale (vitest, e2e, build).

## Invarianti (project-start)

Wizard deterministico; AI solo on-demand (import/genera-descrizione/suggerisci-offerte); ogni output
AI = suggerimento editabile confermato (anti-invenzione P2-D7); offerte settore-agnostiche; spesa
governata per-sito (cap→429 + rate-limit); Brief/generazione/motore-v2 invariati; guardie di rotta +
RLS owner-only + fetchSafe; escaping (mai testo non fidato in `innerHTML`/`href`); `ui→domain` lecito;
git a strati + deploy-coupling coupled; oracle-as-judge + gate umano.

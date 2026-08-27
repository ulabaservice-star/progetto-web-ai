# SESSION-STATE — p5-custom-domains-fase2

> Fonte di verità sullo **stato vivo** del workstream `p5-custom-domains-fase2` (Fase 2 di P5 — domini
> custom), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di P0…P4,
> design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard,
> p5-billing-fase1 e di Trueline. Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 2 (domini custom) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-27 (BOOTSTRAP — blueprint generato) |
| **Sessione corrente** | BOOTSTRAP — blueprint `p5-custom-domains-fase2` creato (**12 macrotask, 22 task atomici**). Granularità fine (BUILD sessione-per-sessione). Nessun codice prodotto. |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| # | Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|---|
| 01 | `domain-schema` (DOM-101/102) | **todo** | — | — |
| 02 | `domain-hostname` (DOM-111/112) | **todo** | — | — |
| 03 | `domain-companion` (DOM-121) | **todo** | — | `domain-hostname` |
| 04 | `domain-dns` (DOM-131) | **todo** | — | `domain-hostname` |
| 05 | `domain-port` (DOM-201/202) | **todo** | — | — |
| 06 | `domain-vercel` (DOM-211) | **todo** | — | `domain-port` |
| 07 | `domain-store` (DOM-221/222) | **todo** | — | `domain-schema` |
| 08 | `domain-connect` (DOM-301/302/303) | **todo** | — | `domain-hostname`, `domain-companion`, `domain-port`, `domain-store` |
| 09 | `domain-verify-disconnect` (DOM-311/321) | **todo** | — | `domain-connect`, `domain-vercel` |
| 10 | `domain-routing` (DOM-401/402) | **todo** | — | `domain-schema` |
| 11 | `domain-ui` (DOM-501/502) | **todo** | — | `domain-verify-disconnect` |
| 12 | `domain-downgrade` (DOM-601/602) | **todo** | — | `domain-schema`, `domain-store` |

**Primi eleggibili (nessuna dipendenza):** `domain-schema`, `domain-hostname`, `domain-port`. Il DAG
completo è in `00-INDEX.md` §Build order.

## 2. Macrotask corrente

- **NESSUNO ancora selezionato** — BOOTSTRAP appena concluso. Alla prossima sessione il dispatch
  risolve **BUILD**.
- **Suggerito**: iniziare da **`domain-schema`** (fonda la tabella `site_domains` + le due superfici
  RLS su cui poggia tutto), poi `domain-hostname` e `domain-port` (entrambi senza dipendenze, dominio
  puro / tipi). Ogni macrotask è piccolo (1–3 micro-task): una sessione leggera.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | — (nessun branch di build ancora; il blueprint si crea/commit su un branch docs) |
| Ultimo commit | — (blueprint non ancora committato) |
| Stato merge su `main` | n/a (BOOTSTRAP: nessun codice) |
| Deploy-coupling | **coupled** — ereditato e confermato dalla Fase 1 (push su `main` = deploy su ulaba.net → verifica locale prima del merge). `main_deploy_coupled: true`. |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): ereditata dalla Fase 1 — `gitleaks:3` (baseline), `osv:2` (baseline),
  `semgrep:0`, `rls:1` (preesistente `site_publications`, baseline). La Fase 2 aggiungerà `site_domains`
  (RLS: gestione owner-only + una SELECT anon-active, nessuna UPDATE authenticated) e l'adattatore
  Vercel (segreti via env, `import 'server-only'`): il checkpoint di ogni macrotask ri-valida. Attesa
  **1 nuova migrazione** (`site_domains`, macrotask `domain-schema`).
- **Baseline d'igiene** (C1): `.trueline/hygiene-baseline.json` ereditata; ogni macrotask ri-baseline
  onestamente se necessario (jscpd non stabile fra macrotask vicini).
- **Budget**: **12 macrotask (22 task atomici)**. Un macrotask alla volta; loop di fix con tetto in
  `references/oracles/thresholds.md`. Granularità fine per sessioni leggere.

## 5. Esiti dell'ultima sessione (framing onesto)

- **BOOTSTRAP concluso** — blueprint `p5-custom-domains-fase2` generato in stile-utente: `00-INDEX`,
  `VISION-AND-CONSTRAINTS`, 12 moduli (`01`–`12`), i 3 prompt di lifecycle, questa `SESSION-STATE`.
  **11 decisioni bloccate** nel decision ledger (DOM-D1…DOM-D11).
- **Decisioni umane raccolte** (non inventate): provider **Vercel Domains API** dietro `DomainProvider`
  (scelto su analisi costi vs Cloudflare for SaaS: $0 marginale vs $0.10/host/mese oltre 100); **apex +
  sottodominio**; **auto-www** (DOM-D11, connettere l'apex collega anche il www); **scollegamento in
  downgrade INCLUSO** (chiude BIL-D7); **granularità fine** (12 macrotask piccoli per BUILD
  sessione-per-sessione, su richiesta utente).
- **Self-check strutturale**: `validate_blueprint.mjs` sulla dir — **verde 5/5** (`ok:true`, 22 task,
  REQUIRED_FIELDS / AC_COVERAGE / DAG_VALID / UNIQUE_IDS / MACROTASK_OWNERSHIP tutti OK).
- **Self-check semantico**: presentato (punti 6–10); rilievi R1 (doppia sorgente DNS: comporre
  `dnsInstructionsFor` con `verification[]` del provider in DOM-302) e R2 (densità) portati in nota nei
  moduli. R3 (auto-www) **risolto** con i task DOM-121/DOM-303. Nessun codice prodotto.

## 6. Prossimi passi

- **Chiudere il BOOTSTRAP**: strutturale **verde** ✅ + self-check semantico presentato → conferma umana
  → commit del blueprint su un branch docs.
- **Prima sessione BUILD**: `domain-schema` (migrazione + RLS). Preparare il branch
  `trueline/build/domain-schema` da `main` pulito.
- **Config di deploy (prereq go-live, non blueprint)**: env Vercel `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`,
  `VERCEL_TEAM_ID` (se team), `NEXT_PUBLIC_APEX_DOMAIN`/target dei record. Collegamento reale inerte
  finché le chiavi non sono in env (DOM-D9), come le CTA Stripe di Fase 1.
- **Aggiornare le memorie di progetto** con l'apertura del workstream Fase 2 (blueprint bootstrappato).

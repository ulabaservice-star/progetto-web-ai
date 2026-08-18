# SESSION-STATE — onboarding-guided-wizard

> Fonte di verità sullo **stato vivo** del workstream `onboarding-guided-wizard`, consumata da BUILD
> e aggiornata a ogni `session-end`. Istanza distinta da quelle di P0…P4, design-engine v1/v1.1/v2,
> `architecture-hardening`, `deploy-hardening`. Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Stato** | **BLUEPRINT PRONTO (BOOTSTRAP completato 2026-08-18)** — nessun macrotask costruito. Self-check strutturale VERDE (11 task, `validate_blueprint` exit 0); semantico senza rilievi bloccanti (2 note dichiarate). Prossima sessione: **BUILD** dal primo macrotask le cui dipendenze sono verdi. |

---

## 1. Stato dei macrotask

> Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|
| `ai-usage-guard` (OGW-101/102) | **todo** | — | — |
| `offerings-editor` (OGW-201/202) | **todo** | — | — |
| `generate-description` (OGW-301/302) | **todo** | — | `ai-usage-guard` |
| `suggest-offerings` (OGW-401/402) | **todo** | — | `ai-usage-guard`, `offerings-editor` |
| `wizard-shell` (OGW-501/502) | **todo** | — | `offerings-editor`, `generate-description`, `suggest-offerings` |
| `remove-chat` (OGW-601) | **todo** | — | `wizard-shell` |

**Build order (DAG):** `{ai-usage-guard, offerings-editor} → generate-description · suggest-offerings → wizard-shell → remove-chat`.

## 2. Macrotask corrente

- **Nessuno costruito.** I primi selezionabili (dipendenze vuote) sono **`ai-usage-guard`** e
  **`offerings-editor`** (indipendenti). Consiglio d'ordine: `ai-usage-guard` per primo (fondativo,
  tocca DB/RLS → baseline di sicurezza), poi `offerings-editor`.
- Criteri/test di riferimento: i moduli `01…06` e i `target_tests` dei task.

## 3. Stato git

| Campo | Valore |
|---|---|
| Branch di lavoro | da aprire (es. `trueline/build/ai-usage-guard`) da `main` pulito. Mai lavorare su `main` |
| Ultimo commit | blueprint bootstrap (docs), su `main` |
| Stato merge su `main` | nessun macrotask ancora costruito |
| `main_deploy_coupled` | **true** (Vercel connesso al repo `ulabaservice-star/progetto-web-ai`: push su `main` = deploy su ulaba.net) → merge **human-gated anche sul verde**; verifica locale (vitest, e2e, `next build`) prima di ogni merge |

## 4. Baseline & budget

- **Baseline di sicurezza**: da ri-catturare a inizio BUILD (`.trueline/checkpoint-baseline.json`,
  ARRAY; 2 FP noti = osv postcss MEDIUM + rls anon-policy). **OGW-101 aggiunge 1 tabella con RLS
  owner-only** → il checkpoint la valida (`rls_check`), attendersi la nuova policy come legittima.
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` (jscpd; `e2e/` escluso). Ri-attribuire
  prima di ri-catturare se scatta R-04.
- **Budget**: retry ≤2 per checkpoint; batteria di mutazione per macrotask (mutazione fatale +
  ripristino via **backup+sha256**, MAI `git checkout` — il macrotask è uncommitted).
- **Contratto altitudine**: riusato dal globale (`tests/architecture-contract.test.ts`); nessun blocco
  `architecture:` nel blueprint (OGW-D6). Dominio puro; `ui→domain` lecito.

## 5. Carry-over / note ereditate (dal design doc + gate delle assunzioni)

- **OGW-D1** chat libera rimossa (`remove-chat` = ULTIMO, dopo il wizard). **OGW-D2** ogni output AI =
  suggerimento editabile confermato; suggerimenti-offerte = placeholder a **prezzo vuoto**. **OGW-D4**
  spesa governata per-sito (cap→429 + rate-limit, consume-on-success). **OGW-D5** Brief/generazione/
  motore-v2 invariati.
- **Riuso confermato dal codice**: `fromUrl`+`fetchSafe`+`extract_brief` (import, anti-invenzione già
  forte); **widget orari** già in `BriefPanel`; `resolveOfferings` (etichette per-settore, `show_price`);
  `upsertBrief`/`briefToUpdate` accettano già `offerings`.
- **Gap noti (input al build)**: oggi in `BriefPanel` le offerte sono **read-only** (→ OGW-202);
  `BriefCorePatch` non porta `offerings` (→ OGW-201); il modello onboarding è economico (verificare la
  qualità di `generateDescription`, eventualmente il modello di generazione per quel solo passo).
- **Nota semantica (dichiarata, L-COL-006)**: l'anti-invenzione di `generateDescription`/`suggestOfferings`
  è oracolata come **proxy** (il prompt contiene la clausola; le voci a prezzo vuoto), non come prova che
  il modello non inventi — la difesa reale è **strutturale** (suggerimento editabile + conferma). Gate
  visivo umano sui suggerimenti in build.
- **Nota atomicità (dichiarata)**: `OGW-501`/`OGW-502` sono i task più grossi (contenitore + integrazione
  + e2e); se in build non stanno in un ciclo, sono splittabili senza toccare il DAG.

## 6. Copertura dichiarata

- Da compilare a ogni `session-end` col macrotask chiuso (target_tests coperti, mutazioni, gate).
- **NON coperto per costruzione (L-COL-006)**: la qualità *editoriale* della copy generata e l'ovvietà
  del confine "placeholder da personalizzare" non sono oracolabili → gate visivo umano. Foto reali e resa
  per-settore delle offerte fuori scope (roadmap "settori").

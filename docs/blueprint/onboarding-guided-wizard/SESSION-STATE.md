# SESSION-STATE — onboarding-guided-wizard

> Fonte di verità sullo **stato vivo** del workstream `onboarding-guided-wizard`, consumata da BUILD
> e aggiornata a ogni `session-end`. Istanza distinta da quelle di P0…P4, design-engine v1/v1.1/v2,
> `architecture-hardening`, `deploy-hardening`. Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Stato** | **BUILD IN CORSO** — `ai-usage-guard` (OGW-101/102) COSTRUITO su branch, **checkpoint 4/4 VERDE**, in attesa del gate umano per il merge su `main` (deploy-coupled). Prossimo selezionabile: `offerings-editor` o `generate-description` (dip. `ai-usage-guard` ora verde). |

---

## 1. Stato dei macrotask

> Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|
| `ai-usage-guard` (OGW-101/102) | **done (branch, pre-merge)** | **4/4 VERDE** | — |
| `offerings-editor` (OGW-201/202) | **todo** | — | — |
| `generate-description` (OGW-301/302) | **todo** | — | `ai-usage-guard` |
| `suggest-offerings` (OGW-401/402) | **todo** | — | `ai-usage-guard`, `offerings-editor` |
| `wizard-shell` (OGW-501/502) | **todo** | — | `offerings-editor`, `generate-description`, `suggest-offerings` |
| `remove-chat` (OGW-601) | **todo** | — | `wizard-shell` |

**Build order (DAG):** `{ai-usage-guard, offerings-editor} → generate-description · suggest-offerings → wizard-shell → remove-chat`.

## 2. Macrotask corrente

- **`ai-usage-guard` COSTRUITO** (branch `trueline/build/ai-usage-guard`, checkpoint 4/4 VERDE, pre-merge).
  - **OGW-101**: migrazione `20260818000100_onboarding_ai_usage.sql` — tabella righe-per-uso
    (`id, account_id, site_id, used_at, kind`), FK composita `(account_id, site_id)→sites(account_id, id)`,
    **RLS owner-only APPEND-ONLY** (solo SELECT+INSERT `is_account_member`; niente UPDATE/DELETE utente =
    il contatore non si azzera per aggirare il cap), nessun grant anon. Provata a runtime
    (`tests/onboarding-ai-usage-rls.test.ts`, AC-101-1/2/3).
  - **OGW-102**: dominio puro `src/domain/onboarding/ai-budget.ts` — porta `AiUsagePort` iniettata,
    `checkAiBudget` (cap→'cap', rate a finestra→'rate', **no side-effect**) + `recordAiUsage`
    (consume-on-success, append-only) + `DEFAULT_AI_BUDGET_LIMITS` (maxTotal 30 / windowMs 60000 /
    maxInWindow 6); `now`/`at`/`limits` iniettati (nessun `Date.now`). Test deterministico fake-port
    (`tests/onboarding-ai-budget.test.ts`, AC-102-1/2/3/4).
- **Prossimo selezionabile** (DAG): **`offerings-editor`** (indipendente, UI) o **`generate-description`**
  (dip. `ai-usage-guard` ora verde). Consiglio: `offerings-editor` (l'altro fondativo, chiude la base
  UI/editor prima degli endpoint AI che riusano `checkAiBudget`).

## 3. Stato git

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/ai-usage-guard` (da `main` pulito). Commit atomico del macrotask sul branch |
| Ultimo commit | (branch) `feat(ai-usage-guard)` OGW-101/102, checkpoint 4/4 verde |
| Stato merge su `main` | **SOSPESO — gate umano** (deploy-coupled). Verifica locale fatta: tsc 0, eslint 0, suite 1725/1725, `next build` da confermare al merge, mutazioni 2/2 |
| `main_deploy_coupled` | **true** (Vercel connesso al repo `ulabaservice-star/progetto-web-ai`: push su `main` = deploy su ulaba.net) → merge **human-gated anche sul verde**; verifica locale (vitest, e2e, `next build`) prima di ogni merge |

## 4. Baseline & budget

- **Baseline di sicurezza**: RI-CATTURATA a inizio BUILD ai-usage-guard (§4 dovuto) su stato base
  SENZA i file del macrotask → `.trueline/checkpoint-baseline.json` (ARRAY, gitignorato, locale):
  **6 FP pre-esistenti** = 2 dependency-vuln (osv postcss + 1) + **3 secret FP GITIGNORATI**
  (`.env.local` generic+anthropic-api-key, `siti css/*.txt`; `git check-ignore` positivo → mai nel
  repo) + 1 rls (anon-policy public-serving). Delta del macrotask = **0** (la RLS nuova non aggiunge
  finding: `rls_check` la valida owner-only).
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` (jscpd; `e2e/` escluso) RI-CATTURATA
  (VERSIONATA, committata): **count 223 invariato**, 4/223 fingerprint aggiornati = drift dei documenti
  blueprint tra Aug 16→18, NON del macrotask (`dead-code:0`, nessun dup nuovo mio). Metodo checkpoint:
  **decomposto** — driver `.trueline/ogw-checkpoint.mjs` (import `control1Hygiene`/`control2Security`
  reali + `loadHygieneBaseline`/`classify`/`loadManifest`/`loadBaseline`, `blueprintDir` passato ma
  nessun contratto arch → gate arch no-op per OGW-D6) per C1+C2 in foreground; C3+C4 = `vitest run`
  completo (1725/1725, ~5 min < cap). Il monolitico resta da evitare in background (0xC0000142).
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

- **`ai-usage-guard` (OGW-101/102)** — target_tests coperti: `tests/onboarding-ai-usage-rls.test.ts`
  (AC-101-1/2/3, **RLS provata a runtime** con oracolo indipendente anti-placebo; isolamento A→B
  simmetrico + scrittura cross-tenant negata su 2 fronti RLS 42501 e FK composita 23503) +
  `tests/onboarding-ai-budget.test.ts` (AC-102-1/2/3/4, gating deterministico fake-port, no `Date.now`).
  **Mutazioni 2/2 UCCISE** (ripristino backup+sha256): cap dominio `>=maxTotal`→`+1000` ⇒ AC-102-2 rosso;
  RLS `is_account_member`→`using(true)` sulla SELECT ⇒ AC-101-2 rosso (A vede le righe di B). Checkpoint
  decomposto 4/4 verde. Nessun gate visivo (macrotask DB+dominio, senza UI).
- Da compilare a ogni `session-end` col macrotask chiuso (target_tests coperti, mutazioni, gate).
- **NON coperto per costruzione (L-COL-006)**: la qualità *editoriale* della copy generata e l'ovvietà
  del confine "placeholder da personalizzare" non sono oracolabili → gate visivo umano. Foto reali e resa
  per-settore delle offerte fuori scope (roadmap "settori").

# SESSION-STATE — Belora/Ulaba · design-engine (motore visivo di generazione)

> Fonte di verità sullo **stato vivo** del workstream design-engine, consumata da BUILD e aggiornata
> a ogni chiusura di sessione (`prompts/session-end.md`). Istanza distinta dalle SESSION-STATE di
> P0…P4, di `architecture-hardening`, `deploy-hardening` e da quella della skill trueline. Prosa in
> italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-12 (**BOOTSTRAP COMPLETO e CHIUSO**: blueprint generato dalla spec approvata, `validate_blueprint` VERDE 6/6, self-check semantico eseguito con 2 gap corretti, blueprint committato+pushato su `main` `3627b1d`. Nessun macrotask ancora costruito) |
| **Sessione corrente** | — (**sessione chiusa dopo il BOOTSTRAP**). **Prossima sessione = BUILD del primo macrotask `visual-skin`**: aprire `prompts/session-start.md` |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `visual-skin` | **todo** | — | 4 task (DE-101…DE-104): `site.css` + consumo token/tipografia fluida, stili inline→css + `data-block-kind`, font self-host `next/font`, placeholder ricco. **Primo nodo del DAG** |
| `design-select` | **todo** | — | 7 task (DE-201…DE-207): cataloghi puri, THEMES cresciuti+disaccoppiati, `design-matrix`, `design-select` deterministico, freeze schema documento, wiring `variant-document`, CSS varianti |
| `effects-runtime` | **todo** | — | 2 task (DE-301…DE-302): CSS effetti L0–L4 + progressive-enhancement/reduced-motion, isola client `SiteMotion` |
| `e2e-visual` | **todo** | — | 1 task (DE-401): e2e Chromium su `/s/` (pelle + varietà + effetti + anti-injection + canary rosso). **Ultimo nodo** |

## 2. Macrotask corrente

- **Prossimo da costruire**: `visual-skin` (nessuna dipendenza aperta). È la fondazione: rende un
  mockup *disegnato* con tema/ricetta esistenti, prima di introdurre la varietà combinatoria.
- Ordine del DAG: `visual-skin` → `design-select` → `effects-runtime` → `e2e-visual`.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | — (BOOTSTRAP: nessun branch di build ancora aperto; il blueprint è documentazione su `main`). Prossima sessione: aprire `trueline/build/visual-skin` |
| Ultimo commit | `3627b1d` docs(design-engine): blueprint del motore visivo v1 (su `main`, pushato origin). Spec: `d0347fc` |
| Stato merge su `main` | n/a (nessun macrotask costruito). I commit su `main` finora sono **solo documentazione** (spec + blueprint), coerenti con la cronologia docs del progetto; nessun codice, nessun deploy di sostanza innescato |
| Deploy-coupling | **`coupled`** — Vercel è connesso al repo (`ulabaservice-star/progetto-web-ai`): **push su `main` = deploy in produzione** su `ulaba.net`. Il merge di ogni macrotask resta **human-gated anche sul verde**; deploy non supervisionato BLOCCATO. Verificare le fix **in locale** prima del merge |

## 4. Baseline & budget

- **Baseline di sicurezza**: da ri-catturare a inizio BUILD `visual-skin`. **Superficie bassa**:
  design-engine non aggiunge tabelle/RLS/segreti/accesso-dati — solo dominio puro (`src/domain`),
  `src/ui/site` e file `e2e/`. Attesa: nessun finding NUOVO oltre la baseline P4 ereditata
  (`.trueline/checkpoint-baseline.json`, formato ARRAY). Registrare in questa sezione a inizio BUILD.
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` (versionata), ultimo valore noto **125**
  (fine P4). **R-04 atteso**: i nuovi moduli di dominio (`hero-layouts`, `section-treatments`,
  `effects`, `ornaments`, `design-matrix`, `design-select`) sono in `src/` → possono ri-fingerprintare
  impronte pre-esistenti; **ri-attribuire prima di ri-catturare** (le impronte sono sensibili alla
  POSIZIONE). I file `e2e/` sono esclusi da jscpd.
- **Budget**: da fissare a inizio BUILD (retry ≤2 per finding, poi terminale all'umano).

## 5. Carry-over / note ereditate

- **Deploy-coupling coupled** (da `deploy-hardening`): verificare tutto **in locale** (specie e2e +
  computed-style) prima di ogni merge; il merge su `main` innesca il deploy su `ulaba.net`.
- **Contratto `architecture:` repo-wide** (P3-D7 + AH-D6): dominio puro vs `src/ui/site`; gate
  `tests/architecture-contract.test.ts`.
- **Gotcha checkpoint P4 (ricorrenti)**: `run_checkpoint --baseline` vuole un file **array**; RLS004
  sulla policy anon pubblica = FP già baselinato (non toccare); `vitest fileParallelism:false` per i
  canary globali; **checkpoint MONOLITICO in background detached = `0xC0000142`** → DECOMPORRE
  (foreground funziona per build/e2e/vitest/driver); **ripristino mutazioni via backup+sha256, MAI
  `git checkout`** (il macrotask è uncommitted).
- **DB parametri di design**: `docs/design-system/ristorazione.md` è la bussola del catalogo (Parte 2:
  7 famiglie-palette, coppie tipografiche, hero-layout, varianti-sezione, effetti E1–E6 + L0–L4,
  ornamenti, foto).

## 6. Copertura dichiarata

- (da aggiornare a ogni checkpoint: quali AC/target_tests sono passati, cosa NON è coperto)

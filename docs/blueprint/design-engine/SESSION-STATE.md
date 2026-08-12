# SESSION-STATE — Belora/Ulaba · design-engine (motore visivo di generazione)

> Fonte di verità sullo **stato vivo** del workstream design-engine, consumata da BUILD e aggiornata
> a ogni chiusura di sessione (`prompts/session-end.md`). Istanza distinta dalle SESSION-STATE di
> P0…P4, di `architecture-hardening`, `deploy-hardening` e da quella della skill trueline. Prosa in
> italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-13 (**BUILD `visual-skin` COMPLETO E MERGIATO su `main`** `4739be5`, fast-forward, gate umano approvato → **deploy Vercel su `ulaba.net` innescato**: DE-101…104 (workflow 8 agenti, 0 errori) + 4 fix orchestratore; checkpoint decomposto VERDE 4/4 + e2e Chromium 13/13 + mutazioni 4/4 uccise) |
| **Sessione corrente** | — (**sessione chiusa dopo il merge di `visual-skin`**). Prossima sessione = BUILD `design-select`: aprire `prompts/session-start.md` |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `visual-skin` | **done** | **VERDE 4/4** (branch) | 4 task (DE-101…DE-104): `site.css` + consumo token/tipografia fluida hero (clamp), stili inline→css + `data-block-kind` (hero distinto), font self-host `next/font` (CSP intatta), placeholder ricco. e2e 13/13 + mutazioni 4/4. **Merge su `main` gated dall'umano** |
| `design-select` | **todo** | — | 7 task (DE-201…DE-207): cataloghi puri, THEMES cresciuti+disaccoppiati, `design-matrix`, `design-select` deterministico, freeze schema documento, wiring `variant-document`, CSS varianti |
| `effects-runtime` | **todo** | — | 2 task (DE-301…DE-302): CSS effetti L0–L4 + progressive-enhancement/reduced-motion, isola client `SiteMotion` |
| `e2e-visual` | **todo** | — | 1 task (DE-401): e2e Chromium su `/s/` (pelle + varietà + effetti + anti-injection + canary rosso). **Ultimo nodo** |

## 2. Macrotask corrente

- **Prossimo da costruire**: `design-select` (dipendenze aperte: nessuna che non sia già verde — poggia
  sulla pelle di `visual-skin`, ora done). È il cuore combinatorio: cataloghi puri + matrice + selettore
  deterministico (5 varianti distinte per-utente) + freeze degli id nel documento.
- Ordine del DAG: `visual-skin` ✅ → **`design-select`** → `effects-runtime` → `e2e-visual`.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/visual-skin` (aperto da `main` pulito, pushato su origin). **Mergiato su `main` in fast-forward** → prossimo macrotask aprirà `trueline/build/design-select`. |
| Ultimo commit | **`4739be5`** feat(design-engine): visual-skin (DE-101…104 + fix orchestratore + hygiene-baseline 136), su `main`. |
| Stato merge su `main` | **MERGIATO** (fast-forward, gate umano approvato 2026-08-13). Checkpoint VERDE 4/4 verificato in locale prima del merge. **Deploy Vercel su `ulaba.net` innescato dal push su `main`.** |
| Deploy-coupling | **`coupled`** — Vercel è connesso al repo (`ulabaservice-star/progetto-web-ai`): **push su `main` = deploy in produzione** su `ulaba.net`. Il merge di ogni macrotask resta **human-gated anche sul verde**; deploy non supervisionato BLOCCATO. Verificato **in locale** (vitest 1450, e2e 13/13, computed-style) prima del merge |

## 4. Baseline & budget

- **Baseline di sicurezza**: **mantenuta la P4** (`.trueline/checkpoint-baseline.json`, ARRAY, 2 fp = osv
  postcss MEDIUM + rls FP anon-policy) — riflette lo stato pre-build di `main`; NON ri-catturata (una
  ri-cattura in-place la avrebbe gonfiata coi segreti dev **gitignorati**). visual-skin: **0 finding NUOVO
  committabile** (superficie nulla: solo CSS/font/render + test, nessuna tabella/RLS/segreto/dep).
  **Gotcha misurato**: il driver decomposto gira **in-place** → gitleaks scansiona il filesystem inclusi i
  **gitignorati** (`.env.local` con la chiave Anthropic reale, `.superpowers/`, `siti css/`) e li segnala
  come "nuovi"; sono **non-leak fuori scope** (git non li vede). Scope corretto = **file tracciati + nuovi
  del macrotask** (provato copiandoli in una dir temp → gitleaks **0**). semgrep 1.172.0 (Docker) + gitleaks
  **8.30.1** (release ufficiale in `.trueline/bin/` gitignorata; il preflight la segna "missing" per mismatch
  del suo marker pinnato ma l'**oracolo** la risolve project-local e gira) ripristinati per il rigore pieno.
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` — **ratchettata 125 → 136** (+11 R-04). Le 11
  impronte "nuove" erano **TUTTE doc blueprint** (`design-engine/*.md`, `P4-publish/*.md`, la spec — già su
  `main` dal bootstrap, mai baselinate) + `interview.ts` (shift di fingerprint per il cambio di corpus):
  **zero in codice visual-skin** (ri-attribuite prima del refresh). dead-code 0, cycle 0, arch 0. `e2e/`
  escluso da jscpd. Il de-dup dello scanner colore in `site-section-block-kind.test.ts` (rilievo verifier)
  ha evitato un clone verbatim.
- **Budget**: retry ≤2 per finding rispettato. Consumo: 4 fix orchestratore (tutti su rilievi verifier
  confermati) + 1 correzione e2e AC-103-1 (formato famiglia next/font misurato con probe). Nessuno stato
  terminale.

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

**`visual-skin` — tutti gli AC coperti e provati (checkpoint VERDE 4/4):**

- **DE-101** — AC-DE-101-1 (`e2e/visual-skin.spec.ts`: hero h1 ≥40px su `/s/`, misurato 52px con
  sole-mediterraneo@1) · AC-DE-101-2 (`tests/site-css-no-literal-colors.test.ts`: scanner esteso ai
  `.css`, 0 letterali) · AC-DE-101-3 (`tests/site-view-stylesheet.test.ts`: `import './site.css'` esatto ×1).
- **DE-102** — AC-DE-102-1+2 (`tests/site-section-block-kind.test.ts`: 4 kind discordanti distinti +
  no colore letterale inline, scanner **compatto non-clone**) · AC-DE-102-3 (e2e: hero background computato
  ≠ sezione non-hero).
- **DE-103** — AC-DE-103-1 (e2e: font-family computato contiene **"Fraunces Fallback"** = variabile next/font
  APPLICATA, pin del prepend; next/font Next 16 usa i nomi reali, non `__hash`) · AC-DE-103-2 (e2e: 0 richieste
  a host font esterni + ≥1 woff2 self-host da `/_next/static/media`) · **extra** `tests/site-fonts-mapping.test.ts`
  (coerenza mappa 10 famiglie ↔ temi).
- **DE-104** — AC-DE-104-1+2 (`tests/site-image-rich-placeholder.test.ts`: placeholder ricco a gradiente
  var(--site-color-*) [`transparent`→3 stop var, rilievo verifier] + branch uploaded invariato
  `assetPublicUrl(asset_id)`).

**Prove d'insieme**: vitest **1450/1450** (148 file; era 1396 a fine P4) · e2e Chromium **13/13** (4 visual-skin
+ 9 regressione/canary) · batteria di mutazione **4/4 uccise** (kind costante, letterale css, mappa font,
prepend font e2e) con ripristino sha256 bit-identico.

**Non coperto / dichiarato**: l'effetto self-host dei font è provato SOLO in e2e (browser reale col compilatore
Next); sotto vitest `next/font/google` è un **doppio** (`tests/helpers/next-font-google-stub.ts` via alias in
`vitest.config.ts`, stessa idea di `server-only`). La varietà combinatoria (5 design distinti) NON è di questo
macrotask — è `design-select`.

**Infra oracoli** (per i prossimi checkpoint): gitleaks 8.30.1 in `.trueline/bin/` + copia in `go/bin`;
semgrep via Docker (daemon da avviare a inizio sessione). Baseline igiene ARRAY-di-fingerprint refreshabile con
`baseline.mjs capture . --hygiene --out .trueline/hygiene-baseline.json`.

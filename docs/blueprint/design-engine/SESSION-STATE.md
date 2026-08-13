# SESSION-STATE — Belora/Ulaba · design-engine (motore visivo di generazione)

> Fonte di verità sullo **stato vivo** del workstream design-engine, consumata da BUILD e aggiornata
> a ogni chiusura di sessione (`prompts/session-end.md`). Istanza distinta dalle SESSION-STATE di
> P0…P4, di `architecture-hardening`, `deploy-hardening` e da quella della skill trueline. Prosa in
> italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-13 (**BUILD `design-select` COMPLETO E MERGIATO su `main`** `29969f3`, fast-forward, gate umano approvato → **deploy Vercel su `ulaba.net` innescato**: DE-201…207 (workflow 14 agenti = 7 builder + 7 verifier BLIND, 0 errori) + 7 fix orchestratore su rilievi verifier confermati + 1 DRY refactor; checkpoint decomposto VERDE 4/4 + suite 1509/1509 + e2e Chromium 13/13 + mutazioni 5/5 uccise) |
| **Sessione corrente** | — (**sessione chiusa dopo il merge di `design-select`**). Prossima sessione = BUILD `effects-runtime`: aprire `prompts/session-start.md` |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `visual-skin` | **done** | **VERDE 4/4** (`4739be5`) | 4 task (DE-101…DE-104): `site.css` + consumo token/tipografia fluida hero (clamp), stili inline→css + `data-block-kind` (hero distinto), font self-host `next/font` (CSP intatta), placeholder ricco. vitest 1450/1450 · e2e 13/13 · mutazioni 4/4 · igiene ratchet 125→136. **Mergiato su `main`** (gate umano approvato) |
| `design-select` | **done** | **VERDE 4/4** (`29969f3`) | 7 task (DE-201…207): cataloghi puri (hero-layouts/section-treatments/effects L0..L4/ornaments, `xFor` proto-safe su array), THEMES 5→8 + `themeFor` esportato/disaccoppiato, `design-matrix` (`isAllowed`/`allowedCombinations` ≥5/vertical), `design-select` deterministico (FNV-1a+mulberry32, 5 distinte su asse strutturale), freeze schema documento (opzionali+default, gate), wiring `resolveVariantHome`+call-site al seed, CSS varianti + data-attribute radice. suite 1509/1509 · e2e 13/13 · mutazioni 5/5 · igiene ratchet 136→138. **Mergiato su `main`** (gate umano approvato) |
| `effects-runtime` | **todo** | — | 2 task (DE-301…DE-302): CSS effetti L0–L4 + progressive-enhancement/reduced-motion, isola client `SiteMotion` |
| `e2e-visual` | **todo** | — | 1 task (DE-401): e2e Chromium su `/s/` (pelle + varietà + effetti + anti-injection + canary rosso). **Ultimo nodo** |

## 2. Macrotask corrente

- **Prossimo da costruire**: `effects-runtime` (2 task DE-301…302; dipende da DE-101 [pelle, done] e
  DE-206 [wiring + gancio `data-effects`, done] — dipendenze verdi). CSS effetti L0–L4 (stato
  finale/hover, keyframe) + progressive-enhancement/`prefers-reduced-motion`, e **isola client
  `SiteMotion`** (`IntersectionObserver`, driver rAF per L3/L4, nessuno `<script>` inline → CSP intatta).
  Il gancio è già in place: `SiteView` scrive `data-effects` alla radice dal campo `effect_level`.
- Ordine del DAG: `visual-skin` ✅ → `design-select` ✅ → **`effects-runtime`** → `e2e-visual`.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/design-select` (aperto da `main` pulito, pushato su origin). **Mergiato su `main` in fast-forward** (`42b2680..29969f3`) → prossimo macrotask aprirà `trueline/build/effects-runtime`. |
| Ultimo commit | **`29969f3`** feat(design-engine): design-select (DE-201…207 + 7 fix orchestratore + DRY `DesignSelection=Combo&{recipe_id}` + hygiene-baseline 138), su `main`. |
| Stato merge su `main` | **MERGIATO** (fast-forward, gate umano approvato 2026-08-13). Checkpoint decomposto VERDE 4/4 + suite 1509/1509 + e2e Chromium 13/13 + `next build` verificati in locale prima del merge. **Deploy Vercel su `ulaba.net` innescato dal push su `main`.** |
| Deploy-coupling | **`coupled`** — Vercel è connesso al repo (`ulabaservice-star/progetto-web-ai`): **push su `main` = deploy in produzione** su `ulaba.net`. Il merge di ogni macrotask resta **human-gated anche sul verde**; deploy non supervisionato BLOCCATO. Verificato **in locale** (vitest 1450, e2e 13/13, computed-style) prima del merge |

## 4. Baseline & budget

- **Baseline di sicurezza**: **mantenuta la P4** (`.trueline/checkpoint-baseline.json`, ARRAY, 2 fp = osv
  postcss MEDIUM + rls FP anon-policy) — NON ri-catturata. design-select: **0 finding NUOVO committabile**
  (superficie nulla: dominio/render/schema + test, nessuna tabella/RLS/segreto/dep). **Gotcha ricorrente
  ri-provato**: il driver decomposto gira **in-place** → gitleaks segnala 3 "nuovi" CRITICAL nei
  **gitignorati** (`.env.local`, `.superpowers/`, `siti css/`); `git check-ignore` li conferma esclusi e
  gitleaks su **468 file tracciati+nuovi** (copiati in dir pulita) = **0** → FP fuori scope. semgrep 0,
  rls 1 (anon-policy baselinato), osv 2 (baselinati).
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` — **ratchettata 136 → 138**. Il **solo clone di
  CODICE** (i tipi `Combo`↔`DesignSelection`, stessa tupla) risolto con un **DRY reale**
  (`DesignSelection = Combo & { readonly recipe_id: string }` — tolto anche l'import `EffectLevel` orfano),
  NON ri-baselinato. Le impronte nuove ri-baselinate sono **dati** (blocchi-tema di `themes.ts`, simili
  per costruzione come i 5 storici) + **doc blueprint** (VISION/SESSION-STATE/INDEX, shift posizionali) —
  ri-attribuite prima del refresh. dead-code 0, cycle 0, arch 0. `e2e/` escluso da jscpd.
- **Budget**: retry ≤2 rispettato. Consumo: 7 fix orchestratore (tutti su rilievi verifier confermati:
  1 MAJOR byte-NUL nel test DE-204 + 6 minor) + 1 DRY refactor (rilievo jscpd del checkpoint). Batteria
  di mutazione **5/5** (index-ignored, matrice-ceiling, proto-effect, ornament-fabricated, css-literal),
  ripristini sha256. Nessuno stato terminale.

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
- **CHECKPOINT DECOMPOSTO — ricetta provata (design-select)**: driver in
  `scratchpad/ckpt-driver.mjs` che importa da `checkpoint.mjs` `control1Hygiene`/`control2Security`/
  `control4Conformance` + `classify`/`loadManifest` + `loadHygieneBaseline` + `loadTasks`/`assertionTrace`,
  e li invoca **UNO alla volta in foreground** su `PROJECT` in-place (manifest `supabase-jsts`, baseline
  sicurezza ARRAY + igiene, `blueprintDir` assoluto). **Gotcha critico**: il manifest ha
  `test_runner.run_file = "node --test {file}"` — **INCOMPATIBILE coi file vitest** → il ramo AC-acceptance
  del controllo 4 NON gira via driver. Ricostruzione fedele: **c4trace** (Fase A scope + Fase B
  `assertionTrace` covers) via driver + **esecuzione dei target_test dentro la suite vitest in 2 shard**
  (`--shard=1/2`,`2/2`; = controlli 3 e 4) + **potere via batteria di mutazione manuale**. Verdetto dal
  JSON per-controllo, mai dall'exit code.
- **THEMES 5→8 (DS-D3) tocca molti test esistenti**: la crescita dei temi + il disaccoppiamento hanno
  forzato aggiornamenti a ~10 test di generazione/editor (conteggi 5→8, coppie 10→28) e la **rimozione
  della biiezione `Set(theme_id citati) == Set(THEMES)`** in `generation-recipes.test.ts` (era proprio
  l'accoppiamento che DS-D3 elimina) → sostituita con inclusione + `THEMES` sovrainsieme proprio. Non è
  regressione: un tema non citato lo offre già la ThemeSwitcher e lo sceglie `selectDesign`.

## 6. Copertura dichiarata

**`design-select` — tutti gli AC coperti e provati (checkpoint VERDE 4/4):**

- **DE-201** — `tests/design-catalogs.test.ts`: AC-1 lookup esatto, coppia-prefisso REALE
  `centrato@1`/`centrato-foto@1` + `heroLayoutFor('centrato')`→undefined · AC-2 tutti id `nome@N` · AC-3
  effects ESATTAMENTE L0..L4 (set nei due versi) · AC-4 `constructor`/`__proto__`/`toString` →undefined.
- **DE-202** — `tests/design-themes-grown.test.ts`: AC-1 ≥6 temi, palette confrontate a due a due (28
  coppie) · AC-2 coppia-prefisso `linea-essenziale@1`/`-notte@1`, `themeFor('linea-essenziale')`→undefined
  · AC-3 i 5 id storici risolvono. `themeFor` esportato da `themes.ts`, importato anche da `design-matrix`.
- **DE-203** — `tests/design-matrix.test.ts`: AC-1 hero foto-piena+L4→false + leggibilità (superficie
  opposta al tema) · AC-2 conformi→true · AC-3 ristorazione ≥5 tutte ammesse · AC-4 OGNI vertical ≥5.
  **Rinforzi orchestratore**: trap proto-safe su `effect_level` (unico object-index) + cardinalità
  strutturale ≥5 per OGNI vertical.
- **DE-204** — `tests/design-select.test.ts`: AC-1 deterministico · AC-2 5 distinte su asse strutturale
  (pairwise ristorazione **+ loop su OGNI vertical**, rinforzo) · AC-3 due seed→insiemi diversi · AC-4
  property test 5 vertical × 64 seed deterministici, ogni selezione `isAllowed`. **Fix MAJOR: byte-NUL
  del separatore `structuralKey` → spazio** (rendeva il file binario per gli oracoli grep/rg).
- **DE-205** — `tests/document-design-selection.test.ts`: AC-1 campi presenti · AC-2 doc P4 SENZA i campi
  valida (default) · AC-3 `effect_level` fuori L0..L4 → l'INTERO documento cade. Schema `.strict()`,
  default a runtime nel gate, nessun import cataloghi (altitudine).
- **DE-206** — `tests/variant-document-design.test.ts`: AC-1 5 doc congelano fedele `selectDesign`,
  scheletri distinti · AC-2 riproducibile · AC-3 gate P2. **Rinforzo**: ramo `ornament_id` ASSENTE
  (`gen-senza-ornamento`@4) → niente id fabbricato (DS-D5). Call-site (generation-choose,
  GenerationChooser, VariantCard, 2 fixture e2e) al `seed` = generation_id.
- **DE-207** — `tests/site-view-design-attributes.test.ts`: AC-1 4 data-attribute alla RADICE · AC-2 due
  hero_layout→attributi diversi · AC-3 scanner colore **importato** da `tests/helpers/css-literal-color.ts`
  (no clone R-04). `render-draft-page` ora propaga `design` (fix DoD).

**Prove d'insieme**: vitest **1509/1509** (155 file; era 1450 a fine visual-skin) · e2e Chromium **13/13**
(regressione: computed-style visual-skin + anti-injection editor/public/hostile, nessun nuovo spec di
questo macrotask) · batteria di mutazione **5/5 uccise** (index-ignored, matrice-ceiling, proto-effect,
ornament-fabricated, css-literal) con ripristino sha256 bit-identico · `next build` OK · typecheck+lint 0.

**Non coperto / dichiarato**: la prova a RUNTIME che i layout hero computati differiscono davvero (non solo
i data-attribute nel markup) è **DE-401** (e2e-visual), non di questo macrotask. Gli **effetti L0–L4** (CSS
+ isola client) sono `effects-runtime` — qui `SiteView` scrive solo il gancio `data-effects`, non lo stila.

**Infra oracoli** (per i prossimi checkpoint): gitleaks 8.30.1 in `.trueline/bin/` + copia in `go/bin`;
semgrep via Docker (daemon da avviare a inizio sessione). Baseline igiene ARRAY-di-fingerprint refreshabile con
`baseline.mjs capture . --hygiene --out .trueline/hygiene-baseline.json`.

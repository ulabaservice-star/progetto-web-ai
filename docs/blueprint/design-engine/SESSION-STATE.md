# SESSION-STATE — Belora/Ulaba · design-engine (motore visivo di generazione)

> Fonte di verità sullo **stato vivo** del workstream design-engine, consumata da BUILD e aggiornata
> a ogni chiusura di sessione (`prompts/session-end.md`). Istanza distinta dalle SESSION-STATE di
> P0…P4, di `architecture-hardening`, `deploy-hardening` e da quella della skill trueline. Prosa in
> italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-13 (**BUILD `e2e-visual` COMPLETO E MERGIATO su `main`** `d8e6020`, fast-forward, gate umano approvato → **deploy Vercel su `ulaba.net` innescato**: DE-401 (workflow 2 agenti = 1 builder + 1 verifier BLIND, 0 errori) + 3 rilievi MINOR/NIT applicati dall'orchestratore; checkpoint decomposto VERDE 4/4 + suite 1521/1521 + e2e Chromium 26/26 + mutazioni 2/2 uccise selettive) → **design-engine COMPLETO 4/4, DAG CHIUSO** |
| **Sessione corrente** | — (**sessione chiusa dopo il merge di `e2e-visual`, ULTIMO nodo**). Il workstream design-engine è **COMPLETO**: nessun macrotask residuo. Prossimo lavoro **FUORI design-engine** (DS-D9: fix del flusso-intervista, spec propria; poi P5 billing) |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `visual-skin` | **done** | **VERDE 4/4** (`4739be5`) | 4 task (DE-101…DE-104): `site.css` + consumo token/tipografia fluida hero (clamp), stili inline→css + `data-block-kind` (hero distinto), font self-host `next/font` (CSP intatta), placeholder ricco. vitest 1450/1450 · e2e 13/13 · mutazioni 4/4 · igiene ratchet 125→136. **Mergiato su `main`** (gate umano approvato) |
| `design-select` | **done** | **VERDE 4/4** (`29969f3`) | 7 task (DE-201…207): cataloghi puri (hero-layouts/section-treatments/effects L0..L4/ornaments, `xFor` proto-safe su array), THEMES 5→8 + `themeFor` esportato/disaccoppiato, `design-matrix` (`isAllowed`/`allowedCombinations` ≥5/vertical), `design-select` deterministico (FNV-1a+mulberry32, 5 distinte su asse strutturale), freeze schema documento (opzionali+default, gate), wiring `resolveVariantHome`+call-site al seed, CSS varianti + data-attribute radice. suite 1509/1509 · e2e 13/13 · mutazioni 5/5 · igiene ratchet 136→138. **Mergiato su `main`** (gate umano approvato) |
| `effects-runtime` | **done** | **VERDE 4/4** (`9c7b0ed`) | 2 task (DE-301…302): CSS effetti L0–L4 in `site.css` (micro-transizione per i soli L1..L4 a uguaglianza esatta, stato nascosto SOLO sotto `.site-motion-ready`, `.is-visible`, cascata-hero L2, hover color-swap + sliding-fill, consumo `--progress` con fallback statico, `@media reduce` che forza lo stato finale) + gancio `data-reveal` sul wrapper `.site-block` (un solo punto) + isola client `SiteMotion` (gate solo se rivelerà davvero, observer scopato alla propria radice, `editable→L0`, driver scroll L3/L4). suite 1521/1521 · e2e 18/18 · mutazioni 6/6 · **igiene INVARIATA 138** (nessuna ri-baselina). **Mergiato su `main`** (gate umano approvato) |
| `e2e-visual` | **done** | **VERDE 4/4** (`d8e6020`) | 1 task (DE-401): `e2e/visual-engine.spec.ts` (Chromium, ANON su `/s/<slug>`, viewport 1280×720). Pelle (font hero ≥40 **computato** + webfont Fraunces **loaded** via `document.fonts.check`); varietà (`centrato@1` flex vs `split@1` grid → layout **computati** distinti + trappola-prefisso `centrato-foto@1` su id esatto); effetti (reveal→`.is-visible` allo scroll, reduce no-op + contenuto visibile con ancora `data-motion-level`, no-JS visibile); anti-injection (doc pubblicato ostile → selezione design invariata [id catalogo, nessun payload] + `assertNoInjectionEffect` nullo, near-collision uuid); 2 canary (pelle font-8px + injection sink-innerHTML) sugli STESSI oracoli del reale. **Solo test, zero `src/`**; riusa harness P4. suite 1521/1521 · e2e 26/26 (18 regressione + 8 nuovi) · mutazioni 2/2 uccise **selettive** (pelle+varietà rossi, resto verde) · **igiene INVARIATA 138** (`e2e/` escluso da jscpd) · sicurezza 0-nuovi (2 gitleaks = FP gitignorati in-place, provati con dir pulita). **Mergiato su `main`** (gate umano approvato). **ULTIMO nodo → DAG CHIUSO** |

## 2. Macrotask corrente

- **DAG COMPLETO**: `visual-skin` ✅ → `design-select` ✅ → `effects-runtime` ✅ → `e2e-visual` ✅.
  **Nessun macrotask residuo** nel workstream design-engine. `c4trace`: ogni target_test dichiarato è in
  scope e ogni AC è tracciato — non resta alcun target assente.
- **Prossimo lavoro (FUORI design-engine)**: **DS-D9** — fix del flusso-intervista (`update_brief` in
  ritardo/inaffidabile, prompt debole in `interview.ts`) come spec/blueprint propri; poi **P5**
  billing/crediti. Vedi `00-INDEX §7` (fuori scope di design-engine v1) e la memoria di progetto.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/e2e-visual` (aperto da `main` pulito, pushato su origin). **Mergiato su `main` in fast-forward** (`f1b45e9..d8e6020`). **Workstream design-engine CHIUSO**: la prossima sessione (fuori design-engine) aprirà un nuovo branch. |
| Ultimo commit | **`d8e6020`** feat(design-engine): e2e-visual (DE-401 + 3 rilievi MINOR/NIT applicati), su `main`. |
| Stato merge su `main` | **MERGIATO** (fast-forward, gate umano approvato 2026-08-13). Checkpoint decomposto VERDE 4/4 + suite 1521/1521 + e2e Chromium 26/26 + `eslint .` + `tsc --noEmit` + `next build` verificati in locale prima del merge. **Deploy Vercel su `ulaba.net` innescato dal push su `main`.** |
| Deploy-coupling | **`coupled`** — Vercel è connesso al repo (`ulabaservice-star/progetto-web-ai`): **push su `main` = deploy in produzione** su `ulaba.net`. Il merge di ogni macrotask resta **human-gated anche sul verde**; deploy non supervisionato BLOCCATO. Verificato **in locale** (vitest 1521, e2e 26/26, computed-style) prima del merge |

## 4. Baseline & budget

> **e2e-visual (aggiornamento 2026-08-13)** — **Baseline di sicurezza**: mantenuta la P4, NON
> ri-catturata (superficie nulla: **un solo file `e2e/`**, nessun `src/`/tabella/RLS/dep/segreto). Il
> **gotcha in-place si è ripresentato identico**: il driver decomposto gira in-place → gitleaks segnala
> **2 CRITICAL** nei **gitignorati** (`.env.local` anthropic-api-key riga 21 di `.gitignore`; `siti css/`
> riga 45), classificati `new` solo perché il path esce dal PROJECT. Contro-prova canonica: `git
> check-ignore -v` li conferma esclusi + gitleaks su dir PULITA (`git archive HEAD` + il solo spec nuovo)
> = **"no leaks found"** → FP fuori scope. osv 2 e rls 1 baselinati, semgrep 0. **Baseline d'igiene:
> INVARIATA a 138 — R-04 NON scattato** (`e2e/` è **escluso da jscpd**: un file e2e nuovo non
> ri-fingerprinta nulla; dup 140 tutti `pre-existing`, per lo più in `eval/reference-app/`, dead-code 0,
> arch 0). **Budget**: nessun retry consumato (0 checkpoint rossi di merito; il C2 "red" era solo il FP
> gitignorato). 3 rilievi verifier applicati, tutti MINOR/NIT (vedi §6). Mutazione **2/2 uccise selettive**.

> **effects-runtime (aggiornamento 2026-08-13)** — **Baseline di sicurezza**: mantenuta la P4, NON
> ri-catturata (0 finding nuovo committabile: superficie = CSS + un componente client + test). Il
> **gotcha del driver in-place si è ripresentato identico**: gitleaks segnala 2 CRITICAL nei
> **gitignorati** (`.env.local`, `siti css/`), `git check-ignore -v` li conferma esclusi e gitleaks sui
> **478 file tracciati+nuovi** (copiati in dir pulita) = **0 leak** → FP fuori scope. osv 2 e rls 1
> baselinati, semgrep 0. **Baseline d'igiene: INVARIATA a 138 — R-04 NON è scattato** (dead-code 0,
> dup 141 finding tutti `pre-existing`, cycle 0, twin 0, arch 0): è la prima volta nel workstream che
> due file nuovi in `tests/` non forzano una ri-baselina — il `vi.mock('next-intl/server')` idiomatico
> e il blocco di import non superano la soglia dell'oracolo (la misura `jscpd --min-tokens 50` del
> builder, +4 coppie, è più aggressiva della configurazione reale: **non confondere le due**).
> **Budget**: nessun retry consumato (0 checkpoint rossi di merito). 7 interventi orchestratore, tutti
> su rilievi verifier CONFERMATI leggendo il codice — 3 di produzione (deps sulla forma dell'albero,
> reveal sincrono di ciò che è già in vista, driver rAF armato da scroll/resize invece che perpetuo) e
> 4 sugli oracoli (contro-prova del `@media` nell'e2e, `tests/site-effects-css.test.ts` per il
> keyframe, ramo reduce in vitest, `--progress` in vitest). Mutazione **6/6 uccise**.

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
- **`scratchpad/` NON è gitignorato**: il driver del checkpoint va **cancellato prima del commit** (o
  finisce nel diff e nello scope degli oracoli). Ricostruirlo costa ~10 minuti dalla ricetta qui
  sotto; una copia dell'ultimo driver funzionante è fuori dal repo in
  `%TEMP%\ckpt-driver.mjs` (`C:\Users\claud\AppData\Local\Temp`), non versionata e non garantita.
- **`matchMedia` è una proprietà ACCESSOR** in questo ambiente di test: salvare il descrittore,
  assegnare uno stub e ri-definire il descrittore **NON ripristina nulla** (l'assegnazione passa dal
  setter, e il getter ripristinato continua a restituire lo stub) → ogni test successivo del file
  girerebbe in un mondo `prefers-reduced-motion: reduce` senza accorgersene. Si usa **`vi.stubGlobal`
  + `vi.unstubAllGlobals`**, e si ASSERISCE il ripristino con lo stesso predicato del codice di
  produzione (jsdom non implementa `matchMedia`: "assente" è un esito legittimo quanto "falso").
- **CHECKPOINT DECOMPOSTO — ricetta provata (design-select, ri-provata su effects-runtime)**: driver in
  `scratchpad/ckpt-driver.mjs` che importa da `checkpoint.mjs` `control1Hygiene`/`control2Security`/
  `control4Conformance` + `classify`/`loadManifest` + `loadHygieneBaseline` + `loadTasks`/`assertionTrace`,
  e li invoca **UNO alla volta in foreground** su `PROJECT` in-place (manifest `supabase-jsts`, baseline
  sicurezza ARRAY + igiene, `blueprintDir` assoluto). **Gotcha critico**: il manifest ha
  `test_runner.run_file = "node --test {file}"` — **INCOMPATIBILE coi file vitest** → il ramo AC-acceptance
  del controllo 4 NON gira via driver. Ricostruzione fedele: **c4trace** (Fase A scope + Fase B
  `assertionTrace` covers) via driver + **esecuzione dei target_test dentro la suite vitest in 2 shard**
  (`--shard=1/2`,`2/2`; = controlli 3 e 4) + **potere via batteria di mutazione manuale**. Verdetto dal
  JSON per-controllo, mai dall'exit code. **Gotcha del driver `c4trace` (provato su e2e-visual)**:
  `assertionTrace` ritorna un **oggetto** `{ok, detail, untracked}`, non un array → la riga `green` del
  driver che faceva `untracked.length === 0` dava `undefined === 0` = **falso spurio** anche con
  `missing:[]` e `untracked:[]`. Leggere il verdetto reale dai campi (`missing.length===0 &&
  untracked.ok && untracked.untracked.length===0`), non dal `green` calcolato. Per un macrotask di soli
  test e2e la batteria di mutazione muta la **PRODUZIONE** (es. `site.css`: font-hero → 8px, `split@1`
  `display:grid`→`flex`) e verifica il rosso dell'e2e dopo `next build` (il CSS è compilato nel bundle),
  ripristino `site.css` con **backup+sha256** — il file è tracciato ma il macrotask è uncommitted.
- **THEMES 5→8 (DS-D3) tocca molti test esistenti**: la crescita dei temi + il disaccoppiamento hanno
  forzato aggiornamenti a ~10 test di generazione/editor (conteggi 5→8, coppie 10→28) e la **rimozione
  della biiezione `Set(theme_id citati) == Set(THEMES)`** in `generation-recipes.test.ts` (era proprio
  l'accoppiamento che DS-D3 elimina) → sostituita con inclusione + `THEMES` sovrainsieme proprio. Non è
  regressione: un tema non citato lo offre già la ThemeSwitcher e lo sceglie `selectDesign`.

## 6. Copertura dichiarata

**`e2e-visual` — tutti gli AC coperti e provati (checkpoint VERDE 4/4):**

- **DE-401** — `e2e/visual-engine.spec.ts` (Chromium, ANON `storageState` vuoto su `/s/<slug>`, viewport
  1280×720; 8 test): **AC-1 (pelle)** oracolo condiviso `assertHeroTitleFontSize` legge la `fontSize`
  **computata** di `h1.site-hero__title` ≥40 (il clamp `clamp(2rem,5vw,--site-scale-3xl)` risolve al 3xl
  del tema `sole-mediterraneo@1` = 52px) + `fontFamily` contiene `fraunces` e **non** un fallback +
  `document.fonts.check('40px "Fraunces"')` (webfont **loaded**, non solo registrato) · **AC-2 (varietà)**
  TRE varianti: `getComputedStyle(section[data-block-kind=hero]).display` = `flex` (`centrato@1`) vs `grid`
  (`split@1`) + `gridTemplateColumns` `none` vs 2 tracce; trappola-prefisso `centrato-foto@1` provata sul
  `data-hero-layout` alla radice (id ESATTO, il ramo CSS è condiviso con `centrato@1` → non distinguibile
  per layout; la discriminazione-per-selezione è dominio, DE-201) · **AC-3 (effetti)** tre describe:
  motion-default reveal sotto-piega `opacity 0`→scroll→`.is-visible`+`opacity 1` (ancora `data-motion-level`);
  `reducedMotion:'reduce'` contenuto intero + `transition-duration 0s`, `.site-motion-ready` count 0, ancora
  `data-motion-level`; `javaScriptEnabled:false` contenuto visibile, nessun `.site-motion-ready` · **AC-4
  (anti-injection)** `buildPublishedHostileDocument(used)` + `seedAsset` used/sibling near-collision → i
  `data-*` di design matchano id catalogo (`^[a-z0-9]+(-[a-z0-9]+)*@[0-9]+$`, `^L[0-4]$`), nessun payload;
  `assertNoInjectionEffect` (allowlist `[APP_HOST, storageHostOf(used)]` DERIVATA da `assetPublicUrl`,
  esclude `attacker.example`; `attachObservables` prima del goto; `expectedUrl` fissato) risolve; `<img>`
  src esatto su `used` mai `sibling` · **AC-5 (canary)** DUE canary via `setContent` (mai una rotta): pelle
  (`h1` font-8px → `assertHeroTitleFontSize` `rejects`) e injection (`insecureCanaryHtml` sink innerHTML →
  `assertNoInjectionEffect` `rejects`), STESSI oracoli e STESSA forma di allowlist del reale.
- **Rilievi verifier BLIND applicati (3, tutti MINOR/NIT, nessun BLOCKER/MAJOR)**: (#1) il check
  `document.fonts` era tautologico (`some(includes('fraunces'))` vero per ogni tema perché next/font
  registra le 10 famiglie) → sostituito con `document.fonts.check('40px "Fraunces"')` (loaded) + commento
  che la prova PORTANTE della mappatura tema→font è la riga `fontFamily` computed; (#2) rimossa
  l'asserzione ridondante `not.toBe('centrato@1')` e chiarito che il render prova la proiezione fedele
  dell'id; (#3) aggiunta l'ancora anti-vacuità `data-motion-level` al caso reduce (parità col
  motion-default: l'isola monta anche sotto reduce — `SiteMotion.tsx:84` scrive il livello PRIMA del ramo
  reduce).
- **Batteria di mutazione — 2/2 uccise, SELETTIVE** (backup+`sha256sum -c`, mai `git checkout`; entrambe in
  un solo `next build`): `.site-hero__title` font-size → `8px` → **AC-1 ROSSO**; `[data-hero-layout=split@1]`
  `display:grid`→`flex` → **AC-2 ROSSO**; **AC-3/4/5 restano VERDI** (nessun falso rosso globale). `site.css`
  ripristinato bit-identico.
- **Prove d'insieme**: vitest **1521/1521** (invariata — vitest non raccoglie `e2e/`) · e2e Chromium
  **26/26** (18 di regressione + 8 nuovi) · `eslint .` 0 · `tsc --noEmit` 0 · `next build` OK · checkpoint
  decomposto VERDE 4/4 (igiene 138 invariata, sicurezza 0-nuovi, c4trace ogni AC tracciato).
- **Non coperto / dichiarato**: la **bellezza estetica non è oracolabile** (la giudica l'utente, merge
  human-gated) — l'e2e prova struttura e difetto specifico, non il gusto. La varietà è provata su UNA
  coppia di layout (`flex`↔`grid`) più robusta e tema-indipendente: gli altri assi (`immagine-piena@1`
  vs `scena-scura@1` per `backgroundColor`, `data-section-treatment`, `data-ornament`) non hanno un test
  computed proprio qui. La prova a runtime che `document.fonts` corrisponda al FONT EFFETTIVAMENTE reso
  (non solo caricato) resta indiretta: la mappatura tema→font è inchiodata dalla riga `fontFamily`
  computed, non dal check `document.fonts`.

---

**`effects-runtime` — tutti gli AC coperti e provati (checkpoint VERDE 4/4):**

- **DE-301** — `e2e/effects.spec.ts` (Chromium, ANON su `/s/<slug>`, viewport 1280×720): AC-1 in un
  describe con `javaScriptEnabled: false` — la radice **non** porta `.site-motion-ready` (asserito, non
  assunto), ≥3 `[data-reveal]`, ognuno visibile con `opacity` **computata** 1 e `transform: none`, e
  l'ultimo **sotto la piega** · AC-2 in un describe con `contextOptions.reducedMotion: 'reduce'` e JS
  attivo (la preferenza è verificata via `matchMedia().matches`): visibile, `opacity 1`, `transform none`,
  `animation-name none`, `transition-duration 0s` + **contro-prova del `@media`** (si aggiunge a mano il
  solo gate `.site-motion-ready` e il contenuto resta intero: senza quel blocco cadrebbe) · **controllo
  di non-vacuità** in un terzo describe: a L1 la transizione esiste (durata > 0) e a **L0** è `0s`
  (trappola del prefisso: `[data-effects^='L']` confonderebbe i cinque livelli).
  `tests/site-effects-css.test.ts` copre i bullet di DoD senza AC: il keyframe dichiara **solo**
  `opacity`/`transform` (ritaglio a conteggio di graffe + contro-prova su fixture virtuale) e le due
  regole hover L2 esistono e puntano a classi che i blocchi rendono davvero (nessun CSS morto).
- **DE-302** — `e2e/effects.spec.ts`: AC-1 il reveal sotto la piega è `opacity 0` **prima** dello scroll
  (metà causale) e ottiene `.is-visible` dopo · AC-2 sotto `reduce` l'isola **monta** (`data-motion-level`
  = ancora di non-vacuità) ma è no-op: zero gate, zero `.is-visible`, contenuto intero anche dopo aver
  percorso la pagina. `tests/site-motion.test.ts`: AC-3 stesso documento `L3` reso **due volte** —
  editable → `L0`, nessun gate, nessun observer; read-only → `L3`, gate, observer **scopato alla propria
  radice** (l'altra radice è già nel DOM: una query su `document` cadrebbe) · AC-4 nessun `<script>` nel
  markup reso in entrambe le modalità + nessuna via di HTML grezzo nel sorgente + `'use client'`, col
  predicato che **discrimina**. Aggiunte dell'orchestratore nello stesso file: ramo `reduce` in vitest
  (`vi.stubGlobal`, con ripristino asserito), `--progress` scritto a L3 e **non** a L1, e la
  **regressione dell'albero che cresce** (rerender con un blocco in più sotto la stessa radice → il
  blocco nuovo viene osservato, non resta nascosto per sempre).

**Batteria di mutazione — 6/6 uccise** (backup + `sha256sum -c`, mai `git checkout`): stato nascosto
neutralizzato → e2e AC-302-1 ROSSO · `@media reduce` rimosso → AC-301-2 ROSSO · `@media` privato del
**solo** stato finale → ROSSO sulla contro-prova nuova (`effects.spec.ts:226`, prova che non è cosmetica)
· `blocks` fuori dalle dipendenze → regressione dell'albero ROSSA · gating `reduce` rimosso → ramo reduce
vitest ROSSO · driver che non scrive `--progress` → ROSSO.

**Non coperto / dichiarato**: il **FOUC inverso** è mitigato (i reveal già in vista sono marcati in modo
sincrono al mount) ma la mitigazione **non ha un test proprio** — nessun oracolo misura "non c'è lampo".
Il consumo visivo di `--progress` (la scala del placeholder che segue lo scroll) è provato solo lato
scrittura: nessun AC misura la trasformazione risultante in browser. `data-motion-level` è un attributo
di produzione che nasce come **osservabile di test**: giustificato (è l'ancora anti-vacuità di 6
asserzioni in 2 file) ma è comportamento oltre il DoD, e va detto.

---

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

**Prove d'insieme (effects-runtime)**: vitest **1521/1521** (157 file; erano 1509 a fine design-select),
eseguiti in 2 shard `--shard=1/2`/`2/2` = controlli 3 e 4 · e2e Chromium **18/18** (13 di regressione + 5
nuovi) · `c4trace`: **ogni AC valutato è tracciato** da un `// covers:` in un target_test in scope; unico
target dichiarato e **assente** = `e2e/visual-engine.spec.ts` di **DE-401** (macrotask successivo, non un
buco di questo) · `eslint .` 0 · `tsc --noEmit` 0 · `next build` OK.

**Prove d'insieme (design-select)**: vitest **1509/1509** (155 file; era 1450 a fine visual-skin) · e2e Chromium **13/13**
(regressione: computed-style visual-skin + anti-injection editor/public/hostile, nessun nuovo spec di
questo macrotask) · batteria di mutazione **5/5 uccise** (index-ignored, matrice-ceiling, proto-effect,
ornament-fabricated, css-literal) con ripristino sha256 bit-identico · `next build` OK · typecheck+lint 0.

**Non coperto / dichiarato**: la prova a RUNTIME che i layout hero computati differiscono davvero (non solo
i data-attribute nel markup) è **DE-401** (e2e-visual), non di questo macrotask. Gli **effetti L0–L4** (CSS
+ isola client) sono `effects-runtime` — qui `SiteView` scrive solo il gancio `data-effects`, non lo stila.

**Infra oracoli** (per i prossimi checkpoint): gitleaks 8.30.1 in `.trueline/bin/` + copia in `go/bin`;
semgrep via Docker (daemon da avviare a inizio sessione). Baseline igiene ARRAY-di-fingerprint refreshabile con
`baseline.mjs capture . --hygiene --out .trueline/hygiene-baseline.json`.

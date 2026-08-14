# SESSION-STATE — Belora/Ulaba · design-engine-v1.1 ("wow, meglio di Wix")

> Fonte di verità sullo **stato vivo** del workstream design-engine-v1.1, consumata da BUILD e
> aggiornata a ogni chiusura di sessione (`prompts/session-end.md`). Istanza distinta dalle
> SESSION-STATE di P0…P4, di design-engine v1, di `architecture-hardening`, `deploy-hardening` e da
> quella della skill trueline. Prosa in italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-14 (**`variety-engine` COSTRUITO, VERDE E MERGIATO+DEPLOYATO su `main`** `ffcbcbe`: checkpoint decomposto VERDE 4/4 + mutazioni 4/4 uccise + suite 1616/1616 + `next build` exit 0. **2/5 macrotask fatti.** Prossimo: BUILD di `hero-menu-wow` (NUCLEO+GATE umano)) |
| **Sessione corrente** | 2026-08-14 — BUILD di `variety-engine` (DE11-201..205) via dynamic workflow (builder + verifier BLIND per task). **Recupero da stallo:** il workflow standard si stalla (subagenti che eseguono `tsc`/`vitest` in background → watchdog 180s → morte) → **workflow COMMAND-FREE** (subagenti solo scrittura) + verifica reale in FOREGROUND. Regressione `variant-document-design` (ornament da shuffle perturbato) fixata alla radice (precondizione dinamica). +2 rafforzamenti da rilievi verifier (ricetta distinta, altitudine solo-forma). Checkpoint decomposto (C1 dead-code:0/dup pre-esist/arch:0; C2 solo FP gitignorati+baselinati provati; C3 1616/1616; C4 5 target in-scope+covers+verdi), mutazioni 4/4 (distinzione/default/R3/ricetta), ripristini sha256. **Mergiato+pushato su `main` (deploy ulaba.net) su scelta umana.** Aprire `prompts/session-start.md` per il prossimo macrotask |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `editorial-skin` | **done** | **VERDE 4/4** (`4c157cc`) | 4 task (DE11-101…104): THEMES arricchiti (palette crema/panna/rosso-mattone/oro/verde-basilico/ink + `surface_dark` per-tema + token display/tracking/tabular-nums/hook-h1-italic, tipizzati totali), font display **Playfair Display** self-host (next/font → `--site-font-display`, CSP intatta), regole `site.css` (display su titoli/prezzi/citazioni con `!important` sull'inline legacy, corpo lh 1.65, label tracked, tabular-nums, leader-dots, «», ritmo), `illustrations.ts` (dominio puro, `<symbol>` id versionati, `illustrationFor` exact proto-safe, core set ristorazione currentColor). Riconciliato hero `<h1>`→display (e2e visual-skin/visual-engine) |
| `variety-engine` | **done** | **VERDE 4/4** (`ffcbcbe`) | 5 task (DE11-201…205): 5° hero universale `editoriale-illustrato@1` (2-col asimmetrico, media `testo-illustrazione`) → 5 hero universali a media distinte + asse trattamento-H1 (`h1-treatments.ts`); `section-layouts.ts` (chi-siamo/orari/contatti ×2 con `kind` distinti + `menu-card-carta@1`) + nastri (scacchi-conici/gingham/gingham-incrociato); `design-matrix` Combo +4 assi opzionali + **regola R3** (illustrazione solo su hero con slot `illustrazione`) + `allowedCombinations` con `pickSectionLayout` **iniettiva** → ≥5 combo **hero_layout_id tutti diversi + corpo diverso**/vertical; `selectDesign(…, signals?)` (Piano B solo predisposto, `void`) dedup **per hero** (corregge "3/5 stesso hero"); freeze documento (4 campi opzionali versionati + 2 default). Dominio puro (arch:0). Dip: `editorial-skin` |
| `hero-menu-wow` | **todo** | — | 3 task (DE11-301…303): Hero ricco (assi + illustrazione + badge + CTA + meta/chip), Menu ricco (card-carta fondo scuro + leader-dots + doppia cornice), **e2e-nucleo GATE** (`e2e/visual-engine-v11.spec.ts`: 5 varianti reali di un seed divergono su hero VISIBILE + corpo computed + canary rosso). **NUCLEO + gate di validazione** (DS-D15). Dip: `editorial-skin`, `variety-engine` |
| `section-inventory` | **todo** | — | 4 task (DE11-401…404): ChiSiamo (2 varianti), Orari (tabella + card sun/moon, giorno-corrente dall'isola), Contatti (mappa SVG + fondale marrone/verde), footer + restanti assi accessori + libreria SVG ristorazione completa. Dip: `variety-engine`, `hero-menu-wow` |
| `e2e-visual-v11` | **todo** | — | 1 task (DE11-501): `e2e/visual-engine-v11.spec.ts` esteso — 5 mockup diversi end-to-end su tutte le sezioni + blocchi ricchi + anti-injection (harness P4) + canary rosso. **ULTIMO nodo del DAG.** Dip: `section-inventory` |

## 2. Macrotask corrente

- **Selezionato**: prossimo è **`hero-menu-wow`** (dip: `editorial-skin` + `variety-engine`, entrambi
  verdi). È il **NUCLEO + GATE UMANO** (DS-D15): 3 task (DE11-301 Hero ricco, DE11-302 Menu ricco,
  DE11-303 e2e-nucleo GATE) che **renderizzano** gli assi del motore e provano che le 5 varianti reali
  di un seed divergono su hero VISIBILE + corpo (computed) + canary rosso. **Qui l'approccio si valida
  visivamente**: se le 5 varianti non convincono, fermarsi (eventuale Piano B, DS-D14). Ordine restante:
  `hero-menu-wow` → `section-inventory` → `e2e-visual-v11`.
- **Aggancio al render (carry-over da variety-engine)**: `resolve.ts`/`variant-document.ts` NON scrivono
  ancora i nuovi assi nel documento reale (fuori scope di variety-engine) → un mockup generato oggi
  prende i DEFAULT, non gli assi variati. `hero-menu-wow` deve **agganciare** selectDesign→documento→render.
- **Criteri/test di riferimento**: vedi il modulo `03-hero-menu-wow.md` e i `target_tests` dei task.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `variety-engine` costruito su `trueline/build/variety-engine`, poi **fast-forward su `main`** (`ffcbcbe`). Prossimo: aprire `trueline/build/hero-menu-wow` da `main` pulito. Mai lavorare su `main` |
| Ultimo commit | **`ffcbcbe`** feat(design-engine): variety-engine — motore di varietà v1.1 (DE11-201..205), su `main` (pushato → deploy). Preceduto da `e7af148` (docs) |
| Stato merge su `main` | **`variety-engine` MERGIATO+PUSHATO su `main`** (`ffcbcbe`, ff) su **scelta umana esplicita** → deploy in produzione su ulaba.net. Build verificata in locale (`next build` exit 0 + suite 1616/1616) prima del push; **e2e NON rieseguito** (variety-engine è dominio-puro, zero modifiche a render/UI → superficie e2e invariata). I prossimi macrotask restano **human-gated anche sul verde** |
| Deploy-coupling | **`coupled`** — Vercel è connesso al repo (`ulabaservice-star/progetto-web-ai`): **push su `main` = deploy in produzione** su `ulaba.net`. Verificare **in locale** (vitest, e2e Chromium, computed-style, `next build`) prima di ogni merge |

## 4. Baseline & budget

- **Baseline di sicurezza**: da ri-catturare a inizio BUILD (mantenere la P4 come punto di partenza:
  `.trueline/checkpoint-baseline.json`, ARRAY, 2 fp = osv postcss MEDIUM + rls FP anon-policy).
  Superficie v1.1 **bassa**: nessuna nuova tabella/RLS/segreto; solo dominio puro + `src/ui/site` +
  e2e. **Gotcha ricorrente atteso** (da v1/P4): il driver decomposto gira in-place → gitleaks segnala
  CRITICAL nei **gitignorati** (`.env.local`, `siti css/`, `scratchpad/`) come "nuovi" solo perché il
  path esce dal PROJECT → FP fuori scope (contro-prova: `git check-ignore -v` + gitleaks su dir
  pulita).
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` — **ri-catturata a 173** (era 138 fine v1)
  al confine di `editorial-skin`: +35 dup NUOVE tutte FP legittimi (record-dato dei temi arricchiti
  in `themes.ts` — non rifattorizzabili, artefatto congelato — + boilerplate prosa dei doc blueprint +
  `scratchpad/kimi-2.html`), zero dup in `site.css`/`illustrations.ts`/`theme-style.ts`/test. Nessuna
  logica di produzione duplicata → ri-cattura giustificata (mai gonfiare policy). Ri-attribuire prima
  di ri-catturare (R-04, impronte = hash di CONTENUTO → i 138 pre-esistenti hanno matchato tutti);
  `e2e/` escluso da jscpd; `arch:0` (gate altitudine col blueprint: dominio-puro OK).
- **variety-engine (confine, `ffcbcbe`)**: baseline igiene **STA a 173** (nessuna dup NUOVA dai file
  v1.1 → dead-code:0 / dup:172 pre-esist / arch:0 / cycle:0 → **NESSUNA ri-cattura**, più pulito di
  editorial-skin); baseline sicurezza **invariata** (2 FP: osv postcss MEDIUM + rls anon-policy). I 3
  "secret" del c2 = i FP **gitignorati** provati con `git check-ignore -v` (`.env.local` r.21, `siti
  css/` r.45). Zero retry consumati. Suite 1616/1616, `next build` exit 0.
- **Budget**: retry ≤2 per checkpoint; batteria di mutazione per macrotask (mutazione palesemente
  fatale + ripristino via **backup+sha256, MAI `git checkout`** — il macrotask è uncommitted).

## 5. Carry-over / note ereditate

- **WORKFLOW SI STALLA — usa COMMAND-FREE** (lezione variety-engine, 2026-08-14): il metodo standard
  (subagenti builder/verifier che eseguono `tsc`/`vitest`/`knip` in background-workflow) **si stalla**
  (watchdog "no progress 180s" → 6 retry → morte del workflow, cugino del `0xC0000142`). **Rimedio
  provato:** workflow **COMMAND-FREE** (subagenti SOLO Read/Write/Edit/Grep, VIETATO eseguire comandi) +
  TUTTA la verifica reale (tsc/eslint/knip/suite/oracoli/mutazioni) in **FOREGROUND** (affidabile). Il
  build workflow di 202-205 così è passato liscio dove il monolitico 201-205 era morto.
- **AGGANCIO RENDER MANCANTE** (per `hero-menu-wow`): `resolve.ts`/`variant-document.ts` NON scrivono i
  nuovi assi (h1_treatment/section_layout/ribbon/illustration) nel documento reale → la varietà è
  provata NEL MOTORE (`design-select-v11`) ma non raggiunge i mockup (prendono i default). `hero-menu-wow`
  deve agganciare selectDesign→documento→render.
- **BUCO COPERTURA SELETTORE** (per `section-inventory` M4): `pickSectionLayout = layouts[heroIndex %
  len]` arriva a indice hero max 5 → `menu-card-carta@1` (idx 6) e `contatti-scheda-mappa@1` (idx 5 non
  raggiunto dai 5 hero universali) **non sono mai selezionati**. Da agganciare quando il render delle
  sezioni li userà (probabile: il menu-layout va scelto separatamente dalla rotazione per-hero).
- **Deploy-coupling coupled** (da `deploy-hardening`): verificare tutto **in locale** (specie e2e +
  computed-style) prima di ogni merge; il merge su `main` innesca il deploy su `ulaba.net`.
- **Contratto `architecture:` repo-wide** (P3-D7 + AH-D6): cataloghi/matrice/selettore/schema puri vs
  `src/ui/site`; gate `tests/architecture-contract.test.ts`. Una regola `forbidden` che mappa a 0
  moduli = non-verde.
- **Gotcha checkpoint (ricorrenti da P4/v1)**: `run_checkpoint --baseline` vuole un file **ARRAY**
  (`.trueline/checkpoint-baseline.json`); RLS004 sulla policy anon pubblica = FP già baselinato (non
  toccare); `vitest fileParallelism:false` per i canary globali; **checkpoint MONOLITICO in
  background detached = `0xC0000142`** → DECOMPORRE (foreground funziona per build/e2e/vitest/driver);
  **ripristino mutazioni via backup+sha256, MAI `git checkout`** (il macrotask è uncommitted).
- **CHECKPOINT DECOMPOSTO — ricetta provata (design-select/effects-runtime/e2e-visual di v1)**: driver
  in `scratchpad/ckpt-driver.mjs` che importa da `checkpoint.mjs` `control1Hygiene`/`control2Security`/
  `control4Conformance` + `classify`/`loadManifest` + baseline (ARRAY sicurezza + igiene), invocati
  UNO alla volta in foreground; il manifest ha `run_file = "node --test {file}"` **INCOMPATIBILE coi
  file vitest** → il ramo AC-acceptance del controllo 4 non gira via driver: ricostruire con **c4trace**
  (scope + `assertionTrace` covers) + esecuzione dei target_test in **2 shard** vitest + **batteria di
  mutazione manuale**. Verdetto dal JSON per-controllo, mai dall'exit code. `assertionTrace` ritorna un
  **oggetto** `{ok, detail, untracked}` — leggere i campi, non un `green` calcolato.
- **`scratchpad/` NON è gitignorato**: il driver del checkpoint va **cancellato prima del commit** (o
  finisce nel diff e nello scope degli oracoli). Una copia dell'ultimo driver è fuori dal repo in
  `%TEMP%\ckpt-driver.mjs`, non versionata e non garantita.
- **`matchMedia` è una proprietà ACCESSOR** in questo ambiente di test: usare `vi.stubGlobal` +
  `vi.unstubAllGlobals` e ASSERIRE il ripristino (non salvare/riassegnare il descrittore).
- **THEMES/cataloghi cresciuti toccano molti test esistenti** (come DS-D3 in v1: conteggi, coppie
  palette, biiezioni): aggiornare i test di generazione/editor senza reintrodurre l'accoppiamento
  che DS-D3 elimina (inclusione, non biiezione `Set(theme_id) == Set(THEMES)`).
- **DB parametri di design**: `docs/design-system/ristorazione.md` è la bussola del catalogo (palette,
  coppie tipografiche, hero-layout, varianti-sezione, effetti, ornamenti). Riferimenti "wow"
  build-time (non versionati): `scratchpad/kimi-1.html`, `scratchpad/kimi-2.html`.
- **E2E Chromium su /s/ (DE11-303/DE11-501)**: computed-style (font-size hero, display/grid, background,
  layout del corpo), non screenshot pixel-diff. Le 5 varianti nascono da `selectDesign` (non doc a
  mano). Il CANARY viene PRIMA del verde. Per un macrotask di soli test e2e la mutazione muta la
  PRODUZIONE (es. `site.css`, un blocco) e verifica il rosso dopo `next build`, ripristino backup+sha256.

## 6. Copertura dichiarata

- **`variety-engine` (DE11-201..205)**: tutti gli AC coperti e verdi (target: `design-hero-layouts-v11`,
  `design-section-layouts-v11`, `design-matrix-v11`, `design-select-v11`, `document-design-selection-v11`;
  tutti in-scope + `covers` tracciati + eseguiti verdi). Distinzione RAFFORZATA provata a runtime: le 5
  varianti reali di un seed hanno **hero_layout_id a due a due diversi + section_layout_id + recipe_id
  distinti** su OGNI vertical (batteria mutazione: dedup-per-scheletro → "4≠5"). Mutazioni 4/4 uccise
  (distinzione 204, default 205, regola R3 203, ricetta-costante 204). **NON coperto (dichiarato):** la
  BELLEZZA non è oracolabile (gate umano = `hero-menu-wow`); la varietà **non è ancora renderizzata**
  (resolve/variant-document non toccati); `menu-card-carta@1`/`contatti-scheda-mappa@1` non ancora
  raggiungibili dal selettore (vedi §5).
- **`editorial-skin` (DE11-101..104)**: tutti gli AC coperti e verdi. Unit: `design-themes-editorial`
  (AC-101-1..4: nuovi token colore+tipografia per-tema, `surface_dark≠surface`, proiezione custom
  property, id storici risolvibili), `site-fonts-display` (AC-102-3 + guardiano AGGIUNTO sul prefisso
  `var(--font-playfair-display)` in `--site-font-display`), `site-css-no-literal-colors` (AC-103-3),
  `design-illustrations` (AC-104-1..4 + asserzione AGGIUNTA "nessun fill/stroke bloccante"). E2E
  Chromium `editorial-skin.spec.ts` (AC-102-1/2, AC-103-1/2 con tracking RAFFORZATO al rapporto em>0.12).
  Mutazioni 4/4 uccise (illustrationFor `===`, prepend var display, `surface_dark`, e2e display-su-hero).
- **NON coperto (dichiarato)**: la **bellezza estetica non è oracolabile** (la giudica l'utente; il vero
  gate visivo è il NUCLEO `hero-menu-wow`). Tre voci DoD di DE11-103 (leader-dots, tabular-nums, «»)
  sono regole `site.css` PRONTE ma **non esercitate** da alcun elemento di produzione in v1 (nessun AC
  le tocca): resa reale non verificata dagli oracoli finché i blocchi ricchi non le usano. `h1_italic_default`
  è un token-dato senza consumatore runtime finché DE11-201 non lo applica.

---

**Infra oracoli** (per i checkpoint): gitleaks in `.trueline/bin/` + copia in `go/bin`; semgrep via
Docker (daemon da avviare a inizio sessione). Baseline igiene ARRAY-di-fingerprint refreshabile con
`baseline.mjs capture . --hygiene --out .trueline/hygiene-baseline.json`.

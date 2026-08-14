# SESSION-STATE — Belora/Ulaba · design-engine-v1.1 ("wow, meglio di Wix")

> Fonte di verità sullo **stato vivo** del workstream design-engine-v1.1, consumata da BUILD e
> aggiornata a ogni chiusura di sessione (`prompts/session-end.md`). Istanza distinta dalle
> SESSION-STATE di P0…P4, di design-engine v1, di `architecture-hardening`, `deploy-hardening` e da
> quella della skill trueline. Prosa in italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-14 (**`editorial-skin` COSTRUITO, VERDE E MERGIATO+DEPLOYATO su `main`** `4c157cc`: checkpoint decomposto VERDE 4/4 + mutazioni 4/4 uccise. 1/5 macrotask fatti. Prossimo: BUILD di `variety-engine`) |
| **Sessione corrente** | 2026-08-14 — BUILD di `editorial-skin` (DE11-101..104) via 1 dynamic workflow (4 builder + 4 verifier BLIND). Riconciliato 1 BLOCKER cross-macrotask (hero `<h1>`→font display Playfair: aggiornati e2e visual-skin/visual-engine) + rafforzati 3 test su rilievi verifier. Checkpoint decomposto (C1 igiene re-baseline R-04 138→173, C2 sicurezza FP gitignorati provati, C3 1552/1552, C4 e2e 30/30), mutazioni 4/4. **Mergiato+pushato su `main` (deploy ulaba.net) su scelta umana.** Aprire `prompts/session-start.md` per il prossimo macrotask |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `editorial-skin` | **done** | **VERDE 4/4** (`4c157cc`) | 4 task (DE11-101…104): THEMES arricchiti (palette crema/panna/rosso-mattone/oro/verde-basilico/ink + `surface_dark` per-tema + token display/tracking/tabular-nums/hook-h1-italic, tipizzati totali), font display **Playfair Display** self-host (next/font → `--site-font-display`, CSP intatta), regole `site.css` (display su titoli/prezzi/citazioni con `!important` sull'inline legacy, corpo lh 1.65, label tracked, tabular-nums, leader-dots, «», ritmo), `illustrations.ts` (dominio puro, `<symbol>` id versionati, `illustrationFor` exact proto-safe, core set ristorazione currentColor). Riconciliato hero `<h1>`→display (e2e visual-skin/visual-engine) |
| `variety-engine` | **todo** | — | 5 task (DE11-201…205): hero-layouts ricchi + asse trattamento-H1, section-layouts ricchi (chi-siamo/orari/contatti/menu) + nastri, `design-matrix` (≥5 scheletri VISIBILMENTE distinti/vertical), `design-select` pluggabile (`signals?` — Piano B predisposto) + distinzione rafforzata, freeze schema documento. Dip: `editorial-skin` |
| `hero-menu-wow` | **todo** | — | 3 task (DE11-301…303): Hero ricco (assi + illustrazione + badge + CTA + meta/chip), Menu ricco (card-carta fondo scuro + leader-dots + doppia cornice), **e2e-nucleo GATE** (`e2e/visual-engine-v11.spec.ts`: 5 varianti reali di un seed divergono su hero VISIBILE + corpo computed + canary rosso). **NUCLEO + gate di validazione** (DS-D15). Dip: `editorial-skin`, `variety-engine` |
| `section-inventory` | **todo** | — | 4 task (DE11-401…404): ChiSiamo (2 varianti), Orari (tabella + card sun/moon, giorno-corrente dall'isola), Contatti (mappa SVG + fondale marrone/verde), footer + restanti assi accessori + libreria SVG ristorazione completa. Dip: `variety-engine`, `hero-menu-wow` |
| `e2e-visual-v11` | **todo** | — | 1 task (DE11-501): `e2e/visual-engine-v11.spec.ts` esteso — 5 mockup diversi end-to-end su tutte le sezioni + blocchi ricchi + anti-injection (harness P4) + canary rosso. **ULTIMO nodo del DAG.** Dip: `section-inventory` |

## 2. Macrotask corrente

- **Selezionato**: prossimo è **`variety-engine`** (dip: `editorial-skin`, già verde). `editorial-skin`
  è **done+mergiato**. Ordine restante: `variety-engine` → `hero-menu-wow` (nucleo/gate) →
  `section-inventory` → `e2e-visual-v11`.
- **Task atomici in corso**: — (`variety-engine` non avviato). DE11-201..205: hero-layouts ricchi +
  asse trattamento-H1 (usa `h1_italic_default` già in THEMES), section-layouts ricchi + nastri,
  `design-matrix` ≥5 scheletri distinti, `design-select` pluggabile (`signals?`), freeze schema documento.
- **Criteri/test di riferimento**: vedi il modulo `02-variety-engine.md` e i `target_tests` dei task.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `editorial-skin` costruito su `trueline/build/editorial-skin`, poi **fast-forward su `main`**. Prossimo: aprire `trueline/build/variety-engine` da `main` pulito. Mai lavorare su `main` |
| Ultimo commit | **`4c157cc`** feat(design-engine): editorial-skin — pelle editoriale v1.1 (DE11-101..104), su `main` (pushato → deploy). Preceduto da `f73c437` (docs) |
| Stato merge su `main` | **`editorial-skin` MERGIATO+PUSHATO su `main`** (`4c157cc`, ff) su **scelta umana esplicita** → deploy in produzione su ulaba.net. Build verificata in locale (`next build` exit 0 + e2e 30/30) prima del push. I prossimi macrotask restano **human-gated anche sul verde** |
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
- **Budget**: retry ≤2 per checkpoint; batteria di mutazione per macrotask (mutazione palesemente
  fatale + ripristino via **backup+sha256, MAI `git checkout`** — il macrotask è uncommitted).

## 5. Carry-over / note ereditate

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

# SESSION-STATE — Belora/Ulaba · design-engine-v1.1 ("wow, meglio di Wix")

> Fonte di verità sullo **stato vivo** del workstream design-engine-v1.1, consumata da BUILD e
> aggiornata a ogni chiusura di sessione (`prompts/session-end.md`). Istanza distinta dalle
> SESSION-STATE di P0…P4, di design-engine v1, di `architecture-hardening`, `deploy-hardening` e da
> quella della skill trueline. Prosa in italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-14 (**BOOTSTRAP completato E COMMITTATO su `main`**: spec `0451db1` + blueprint `design-engine-v1.1` `68bd63c` — 5 macrotask, 17 task atomici, 61 AC, oracolo strutturale 6/6 + self-check semantico verdi. **0 macrotask di CODICE costruiti**. Prossimo: BUILD di `editorial-skin`) |
| **Sessione corrente** | — (**blueprint pronto e committato, nessun BUILD ancora avviato**). Il workstream è **pianificato ma non costruito**: baseline vuota, primo checkpoint da girare al confine di `editorial-skin`. Aprire `prompts/session-start.md` in sessione fresca |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `editorial-skin` | **todo** | — | 4 task (DE11-101…104): THEMES arricchiti (tipografia editoriale + palette estesa + superficie scura), font display self-host (didone next/font → `--site-font-display`, CSP intatta), regole tipografiche editoriali in `site.css` (display/label tracked/leader-dots/«»/lh 1.65/ritmo), sistema illustrazioni SVG `illustrations.ts` (dominio puro + core set ristorazione). Nessuna dipendenza esterna |
| `variety-engine` | **todo** | — | 5 task (DE11-201…205): hero-layouts ricchi + asse trattamento-H1, section-layouts ricchi (chi-siamo/orari/contatti/menu) + nastri, `design-matrix` (≥5 scheletri VISIBILMENTE distinti/vertical), `design-select` pluggabile (`signals?` — Piano B predisposto) + distinzione rafforzata, freeze schema documento. Dip: `editorial-skin` |
| `hero-menu-wow` | **todo** | — | 3 task (DE11-301…303): Hero ricco (assi + illustrazione + badge + CTA + meta/chip), Menu ricco (card-carta fondo scuro + leader-dots + doppia cornice), **e2e-nucleo GATE** (`e2e/visual-engine-v11.spec.ts`: 5 varianti reali di un seed divergono su hero VISIBILE + corpo computed + canary rosso). **NUCLEO + gate di validazione** (DS-D15). Dip: `editorial-skin`, `variety-engine` |
| `section-inventory` | **todo** | — | 4 task (DE11-401…404): ChiSiamo (2 varianti), Orari (tabella + card sun/moon, giorno-corrente dall'isola), Contatti (mappa SVG + fondale marrone/verde), footer + restanti assi accessori + libreria SVG ristorazione completa. Dip: `variety-engine`, `hero-menu-wow` |
| `e2e-visual-v11` | **todo** | — | 1 task (DE11-501): `e2e/visual-engine-v11.spec.ts` esteso — 5 mockup diversi end-to-end su tutte le sezioni + blocchi ricchi + anti-injection (harness P4) + canary rosso. **ULTIMO nodo del DAG.** Dip: `section-inventory` |

## 2. Macrotask corrente

- **Selezionato**: nessuno ancora costruito. Il primo nel DAG è **`editorial-skin`** (nessuna
  dipendenza). Rispettare l'ordine: `editorial-skin` → `variety-engine` → `hero-menu-wow` (nucleo/
  gate) → `section-inventory` → `e2e-visual-v11`.
- **Task atomici in corso**: — (BUILD non avviato).
- **Criteri/test di riferimento**: vedi il modulo `01-editorial-skin.md` e i `target_tests` dei task
  (oracolo del controllo 4 in BUILD).

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | — (da aprire da `main` pulito alla prima sessione di BUILD, es. `trueline/build/editorial-skin`). Mai lavorare su `main` |
| Ultimo commit | **`68bd63c`** docs(design-engine): blueprint v1.1 bootstrappato (preceduto da spec `0451db1`), su `main`. **Solo DOCS: nessun codice di prodotto ancora.** |
| Stato merge su `main` | Blueprint + spec **committati su `main`** (docs-only, deploy no-op — verificato working tree pulito). **Nessun macrotask di CODICE mergiato** ancora. Ogni macrotask sarà mergiato **human-gated anche sul verde**; deploy non supervisionato BLOCCATO |
| Deploy-coupling | **`coupled`** — Vercel è connesso al repo (`ulabaservice-star/progetto-web-ai`): **push su `main` = deploy in produzione** su `ulaba.net`. Verificare **in locale** (vitest, e2e Chromium, computed-style, `next build`) prima di ogni merge |

## 4. Baseline & budget

- **Baseline di sicurezza**: da ri-catturare a inizio BUILD (mantenere la P4 come punto di partenza:
  `.trueline/checkpoint-baseline.json`, ARRAY, 2 fp = osv postcss MEDIUM + rls FP anon-policy).
  Superficie v1.1 **bassa**: nessuna nuova tabella/RLS/segreto; solo dominio puro + `src/ui/site` +
  e2e. **Gotcha ricorrente atteso** (da v1/P4): il driver decomposto gira in-place → gitleaks segnala
  CRITICAL nei **gitignorati** (`.env.local`, `siti css/`, `scratchpad/`) come "nuovi" solo perché il
  path esce dal PROJECT → FP fuori scope (contro-prova: `git check-ignore -v` + gitleaks su dir
  pulita).
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` — punto di partenza **138** (fine
  design-engine v1). Ri-attribuire prima di ri-catturare (impronte sensibili alla POSIZIONE — R-04);
  i nuovi moduli di dominio (`illustrations.ts`, cataloghi arricchiti, blocchi ricchi) possono
  ri-fingerprintare impronte pre-esistenti; `e2e/` escluso da jscpd.
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

- **Nessuna ancora**: il BUILD non è avviato. La copertura per-macrotask (quali AC/target_tests sono
  passati, cosa NON è coperto) sarà registrata qui a ogni `session-end`, come in v1 — dichiarando
  esplicitamente il non-coperto (la **bellezza estetica non è oracolabile**: la giudica l'utente,
  merge human-gated; l'e2e prova struttura e difetto specifico, non il gusto).

---

**Infra oracoli** (per i checkpoint): gitleaks in `.trueline/bin/` + copia in `go/bin`; semgrep via
Docker (daemon da avviare a inizio sessione). Baseline igiene ARRAY-di-fingerprint refreshabile con
`baseline.mjs capture . --hygiene --out .trueline/hygiene-baseline.json`.

# SESSION-STATE — Belora/Ulaba · design-engine-v2 (catalogo da Claude Design + varietà greedy)

> Fonte di verità sullo **stato vivo** del workstream design-engine-v2, consumata da BUILD e
> aggiornata a ogni chiusura di sessione (`prompts/session-end.md`). Istanza distinta dalle
> SESSION-STATE di P0…P4, di design-engine v1 / v1.1, di `architecture-hardening`, `deploy-hardening`
> e da quella della skill trueline. Prosa in italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-15 (**BOOTSTRAP del blueprint design-engine-v2 completato**: 00-INDEX + VISION + 6 moduli (DV2-1xx…6xx, 19 task atomici) + SESSION-STATE + 3 prompt. Self-check strutturale `validate_blueprint` **VERDE** (19 task, 5/5 controlli OK); semantico con 3 decisioni recepite (R1 scheletro placeholder reviews/faq; R3 `recipe_id` asse matrice = DS-V2-D8; inventario assi = DS-V2-D9: ritira le manopole decorative v1.1, varietà solo da CD + tutte le varianti del catalogo). **Nessun macrotask costruito.** Prossimo: BUILD di `foundation` (DV2-101…104), primo nodo del DAG) |
| **Sessione corrente** | 2026-08-15 — BOOTSTRAP trueline: generato il blueprint dai template + spec a monte (`docs/superpowers/specs/2026-08-15-design-engine-v2-design.md`). Superato lo strutturale; in attesa della conferma umana sui rilievi semantici prima di aprire BUILD. Aprire `prompts/session-start.md` per il primo macrotask |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `foundation` | **todo** | — | 4 task (DV2-101…104): themes.ts con le palette CD (≥8) + vocabolario token semantici (SiteTheme stabile, inclusione non biiezione); theme-style proietta ogni token come custom property; site.css a token (0 colori letterali); primitivi condivisi (Button/SectionHead/PhotoPlaceholder) a token, escaping React, no HTML grezzo. **Radice del DAG.** Dip: — |
| `hero` | **todo** | — | 2 task (DV2-201…202): hero-layouts.ts ampliato agli N id CD (catalogo puro, ≥8); Hero.tsx renderer unico (slot editabili, PhotoPlaceholder, data-hero-layout, escaping). Dip: `foundation` |
| `menu` | **todo** | — | 3 task (DV2-301…303): section-layouts menu (≥4 id CD); Offerte.tsx (card-carta su surface-dark + leader-dots + prezzi tabular, data-menu-layout); aggancio `vertical`→menu (menu_layout_id asse per-vertical indipendente, chiude il buco v1.1). Dip: `foundation` |
| `body-sections` | **todo** | — | 4 task (DV2-401…404): section-layouts corpo (chi-siamo/orari/contatti/recensioni/faq/header/footer, ≥2 varianti/tipo); blocchi **ESISTENTI** chi-siamo+recensioni+faq ri-stilati (recensioni/faq con **scheletro placeholder**, copy UI fissa, no invenzione + composizione mockup li emette); orari (giorno-corrente client) + contatti (SVG catalogo, no risorsa esterna); header+footer. **Spariscono i vuoti.** Split in 2 sotto-macrotask ammesso se troppo grande. Dip: `foundation` |
| `variety-select` | **todo** | — | 4 task (DV2-501…504): riuso aggancio varietà (variant-document congela tutti gli assi + inoltro design+vertical ai blocchi, da `hero-menu-wow` `fff6904`); **`recipe_id` asse della matrice (DS-V2-D8)**; greedy multi-asse farthest-first (esclusione dura hero+theme, **recipe inclusa**, seed mulberry32); requisito materiale ≥5 hero + ≥5 theme + ≥2 recipe/vertical o `selectDesign` fallisce forte. Dip: `hero`, `menu`, `body-sections` |
| `e2e-visual-v2` | **todo** | — | 2 task (DV2-601…602): e2e-nucleo GATE (5 varianti reali di un seed divergono su hero VISIBILE + corpo computed + wow + canary rosso); anti-injection sui nuovi blocchi ricchi (doc ostile su /s/ + canary). Harness P4. **ULTIMO nodo del DAG.** Dip: `variety-select` |

## 2. Macrotask corrente

- **Selezionato**: primo è **`foundation`** (nessuna dipendenza, radice del DAG). 4 task (DV2-101
  themes CD, DV2-102 theme-style, DV2-103 site.css, DV2-104 primitivi). È la fondazione: palette CD +
  token semantici + primitivi che tutti i blocchi ricchi (hero/menu/corpo) riuseranno.
- **Ordine (DAG):** `foundation → {hero, menu, body-sections} → variety-select → e2e-visual-v2`. I tre
  macrotask del corpo dipendono solo da `foundation` e sono indipendenti fra loro; `hero`, `menu`,
  `body-sections` toccano `site.css` → **un macrotask alla volta** per evitare conflitti.
- **Criteri/test di riferimento**: vedi il modulo `01-foundation.md` e i `target_tests` dei task.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | Bootstrap su `trueline/bootstrap/design-engine-v2` (00-INDEX+VISION `b3fa389`, spec `f383961`). Prossimo: aprire `trueline/build/foundation` da `main` pulito per il primo macrotask. Mai lavorare su `main` |
| Ultimo commit | `b3fa389` docs(design-engine-v2): bootstrap trueline — 00-INDEX + VISION. I 6 moduli + SESSION-STATE + prompt sono da committare a chiusura del bootstrap |
| Stato merge su `main` | Nessun merge. Il bootstrap non tocca `main`. I macrotask di BUILD restano **human-gated anche sul verde** (deploy-coupling coupled) |
| Deploy-coupling | **`coupled`** — Vercel connesso al repo (`ulabaservice-star/progetto-web-ai`): **push su `main` = deploy in produzione** su `ulaba.net`. Verificare **in locale** (vitest, e2e Chromium, computed-style, `next build`) prima di ogni merge |

## 4. Baseline & budget

- **Baseline di sicurezza**: da ri-catturare a inizio BUILD (punto di partenza P4/v1.1:
  `.trueline/checkpoint-baseline.json`, ARRAY, 2 FP = osv postcss MEDIUM + rls anon-policy).
  Superficie v2: **nessuna nuova tabella/RLS/segreto** (i mockup girano sul documento congelato; RLS
  anon-published già in piedi da P4). Baseline sicurezza attesa **invariata**. **Gotcha ricorrente**
  (da v1.1/P4): il driver decomposto gira in-place → gitleaks segnala CRITICAL nei **gitignorati**
  (`.env.local`, `siti css/`, `scratchpad/`) come "nuovi" → FP fuori scope (contro-prova:
  `git check-ignore -v`).
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` — punto di partenza **173** (fine v1.1,
  `ffcbcbe`). Superficie v2 **ALTA** su cataloghi (`themes.ts`, `hero-layouts.ts`, `section-layouts.ts`
  cresciuti) + `src/ui/site` (blocchi ricchi riscritti) → attendersi **ri-attribuzione + ri-cattura**
  al confine dei macrotask (R-04, impronte sensibili alla POSIZIONE: i record-dato dei temi/cataloghi
  ri-fingerprintano impronte pre-esistenti; sono FP legittimi, mai gonfiare policy). `e2e/` escluso da
  jscpd. Ri-attribuire **prima** di ri-catturare.
- **Contratto altitudine**: v2 **non ridichiara** il contratto — riusa quello **globale** enforced dal
  repo (`tests/architecture-contract.test.ts`, AH-D6): `domain→ui/data/app` e `data→ui` vietati;
  `ui→domain` lecito (i blocchi importano i cataloghi del dominio). Cataloghi/matrice/selettore/schema
  puri; render in `src/ui/site`.
- **Budget**: retry ≤2 per checkpoint; batteria di mutazione per macrotask (mutazione palesemente
  fatale + ripristino via **backup+sha256, MAI `git checkout`** — il macrotask è uncommitted).

## 5. Carry-over / note ereditate

- **WORKFLOW SI STALLA — usa COMMAND-FREE** (lezione variety-engine v1.1): i subagenti che eseguono
  `tsc`/`vitest`/`knip` in background-workflow **si stallano** (watchdog 180s → morte, cugino del
  `0xC0000142`). **Rimedio provato:** workflow **COMMAND-FREE** (subagenti SOLO Read/Write/Edit/Grep) +
  TUTTA la verifica reale (tsc/eslint/knip/suite/oracoli/mutazioni) in **FOREGROUND**.
- **RIUSO AGGANCIO DA `hero-menu-wow` `fff6904`** (per `variety-select`): il branch
  `trueline/build/hero-menu-wow` (**non mergiato**) contiene l'aggancio di varietà (variant-document
  congela tutti gli assi + inoltro design+vertical ai blocchi via registry/SiteBlockProps). Da
  **riusare** (cherry-pick o riscrittura mirata); si **scartano** i blocchi poveri e il refactor
  illustrazioni. Verificare i path reali all'apertura (v1.1 è su `main`, potrebbero essere evoluti).
- **BUCO SELETTORE v1.1 chiuso da `menu` (DV2-303)**: in v1.1 `pickSectionLayout = layouts[heroIndex %
  len]` non raggiungeva `menu-card-carta@1`. v2 rende `menu_layout_id` un asse per-vertical
  indipendente nella matrice.
- **DS-V2-D8 — `recipe_id` asse della matrice** (decisione utente al self-check semantico): oggi
  `design-matrix.ts` NON porta `recipe_id` (ortogonale, DS-D3). DV2-502 lo attacca alle combo (≥2/vertical);
  la greedy (DV2-503) lo include nella distanza → varia la copy. Resta uno **stile di catalogo** (`recipeFor`),
  mai testo fabbricato dalla matrice.
- **DS-V2-D9 — Inventario assi (mia raccomandazione, delegata dall'utente per "wow massimo")**: il tipo
  `Combo` (v1.1) porta 9 assi. Gli assi di varietà v2 sono l'insieme **esplicito** `{theme, hero_layout,
  menu_layout, section_layout, recipe}`; gli assi **decorativi legacy** (`section_treatment_id`,
  `effect_level`, `ornament_id`, `ribbon_id`, `illustration_id`) sono **ritirati dalla varietà** (bocciati
  come amatoriali al gate v1.1): nessun renderer v2 li consuma, la greedy li ignora, restano **inerti**
  nel `Combo` (rimozione = pulizia separata fuori scope). La decorazione (divisori/accenti/micro-motion,
  CSP + reduced-motion) vive **dentro le varianti CD**. I moduli traducono **tutte** le varianti del
  catalogo CD (non un minimo). **Tetto del wow (L-COL-006):** coi soli `PhotoPlaceholder` il wow ha un
  limite; la leva #1 (fotografia reale) resta **P4-D7/F**, fuori v2 — anticiparla è una decisione a sé.
- **RECENSIONI/FAQ sono blocchi ESISTENTI** (`src/ui/site/blocks/Recensioni.tsx`, `Faq.tsx`), ma
  `generatable.ts` dice che **nessun campo del Brief v1 li soddisfa** → oggi non entrano nei mockup. v2
  (DV2-402, decisione utente R1) li ri-stila e rende uno **scheletro placeholder** con copy UI FISSA
  (stringa statica, MAI slot LLM → anti-invenzione intatta) + la composizione del mockup li emette, così
  "spariscono i vuoti". NON serve registrare blocchi nuovi.
- **THEMES/cataloghi cresciuti toccano molti test esistenti** (come DS-D3 in v1): aggiornare i test di
  generazione/editor per **inclusione, non biiezione** (`Set(theme_id) == Set(THEMES)` è
  l'accoppiamento da eliminare, DS-V2-D1).
- **Deploy-coupling coupled** (da `deploy-hardening`): verificare tutto **in locale** (specie e2e +
  computed-style + `next build`) prima di ogni merge; push su `main` = deploy su `ulaba.net`.
- **Gotcha checkpoint (ricorrenti da P4/v1.1)**: `run_checkpoint --baseline` vuole un file **ARRAY**
  (`.trueline/checkpoint-baseline.json`); RLS004 sulla policy anon pubblica = FP già baselinato (non
  toccare); `vitest fileParallelism:false` per i canary globali; **checkpoint MONOLITICO in background
  detached = `0xC0000142`** → DECOMPORRE (foreground funziona per build/e2e/vitest/driver);
  **ripristino mutazioni via backup+sha256, MAI `git checkout`** (il macrotask è uncommitted).
- **CHECKPOINT DECOMPOSTO — ricetta provata (v1/v1.1)**: driver in `scratchpad/ckpt-driver.mjs` che
  importa `control1Hygiene`/`control2Security`/`control4Conformance` + `classify`/`loadManifest` +
  baseline (ARRAY sicurezza + igiene), invocati UNO alla volta in foreground; il manifest ha
  `run_file = "node --test {file}"` **INCOMPATIBILE coi file vitest** → il ramo AC del controllo 4 si
  ricostruisce con **c4trace** (`assertionTrace` ritorna `{ok, detail, untracked}` — leggere i campi,
  non un `green` calcolato) + esecuzione dei target_test in **shard** vitest + mutazione manuale.
  Verdetto dal JSON per-controllo, mai dall'exit code.
- **`scratchpad/` NON è gitignorato**: il driver del checkpoint va **cancellato prima del commit** (o
  finisce nel diff e nello scope degli oracoli).
- **`matchMedia` è un ACCESSOR** in questo ambiente di test: `vi.stubGlobal` + `vi.unstubAllGlobals`,
  ASSERIRE il ripristino.
- **DB parametri di design**: `docs/design-system/ristorazione.md` è la bussola del catalogo.
  **Catalogo CD**: progetto Claude Design `c1dafc1f-8150-49a6-8c5a-016c2c3b15c5` (~20 varianti/sezione
  + 23 palette) — letto a BUILD-time via **DesignSync** (`list_files`/`get_file`), tradotto in blocchi
  strutturati (mai HTML iniettato, DS-V2-D7).
- **E2E Chromium su /s/ (DV2-601/602)**: computed-style (font-size hero, layout/posizione media,
  background, layout corpo), non pixel-diff. Le 5 varianti nascono da `selectDesign` (non doc a mano).
  Il CANARY viene PRIMA del verde. Mutazione su macrotask e2e = muta la PRODUZIONE + rosso dopo
  `next build`, ripristino backup+sha256.

## 6. Copertura dichiarata

- **Nessun macrotask ancora costruito** — il blueprint è il piano. Copertura da popolare a ogni
  `session-end` col commit del checkpoint, gli AC coperti/verdi e il **non coperto dichiarato**.
- **NON coperto per costruzione (dichiarato, L-COL-006)**: la **bellezza estetica non è oracolabile** —
  la giudica l'utente al **gate visivo** di ogni sezione (screenshot su `/s/`); gli oracoli provano
  struttura, sicurezza, varietà (assi VISIBILI + corpo), determinismo e assenza di regressioni. Le
  **foto reali** sono fuori scope (P4-D7/F): v2 rende i `PhotoPlaceholder` tipografici di CD.

---

**Infra oracoli** (per i checkpoint): gitleaks in `.trueline/bin/`; semgrep via Docker (daemon da
avviare a inizio sessione); `rls_check` built-in. Baseline igiene ARRAY-di-fingerprint refreshabile con
`baseline.mjs capture . --hygiene --out .trueline/hygiene-baseline.json`.

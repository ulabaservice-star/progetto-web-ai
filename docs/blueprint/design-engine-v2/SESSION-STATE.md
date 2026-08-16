# SESSION-STATE — Belora/Ulaba · design-engine-v2 (catalogo da Claude Design + varietà greedy)

> Fonte di verità sullo **stato vivo** del workstream design-engine-v2, consumata da BUILD e
> aggiornata a ogni chiusura di sessione (`prompts/session-end.md`). Istanza distinta dalle
> SESSION-STATE di P0…P4, di design-engine v1 / v1.1, di `architecture-hardening`, `deploy-hardening`
> e da quella della skill trueline. Prosa in italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-16 (**`body-sections-a` COSTRUITO — checkpoint VERDE 4/4 + merge su `main`** (`77ccb12`, deploy ulaba.net): split del macrotask corpo in 2 (DS-V2-D11 #1). Parte-a = chi-siamo/recensioni/faq. **`section_layout_id` PER-BLOCCO** nel `BlockSchema` (DS-V2-D11 #2, corpo eterogeneo; `VersionedIdSchema` anticipato per la TDZ); catalogo dedicato `SiteBodyLayout`+`BODY_LAYOUTS` (12+10+10, `bodyLayoutFor` proto-safe); renderer unici `ChiSiamo`/`Recensioni`/`Faq` + `body-kit` (container/eyebrow/**foto M5** un solo URL builder); **recensioni = scheletro** (copy UI fissa i18n `site.reviews.placeholder`, mai testimonianze finte), **faq = dual-mode** (Q&A reali o scheletro); **composizione di presentazione** `presentation.ts`/`withPresentationSections` agganciata in `resolveVariantHome` emette recensioni/faq SENZA toccare `blocksFor`/`generatable` (gate costo P5 intatto, P2-D7 preservato, DS-V2-D11 #3). Checkpoint: C1 R-04 **210→179** delta0, C2 semgrep 0 + gitleaks gitignorati + osv/rls invariati, C3 **1669/1669**, C4 covers; `next build` 0; **e2e Chromium 30/30**; mutazioni 2/2; **gate visivo APPROVATO**. **Prossimo: BUILD di `body-sections-b`** (orari/contatti/header+footer)) |
| **Sessione corrente** | 2026-08-16 — BUILD `body-sections-a` COMPLETO E MERGIATO (deploy). **Gate delle assunzioni con l'utente** (4 decisioni → DS-V2-D11): split in 2, section_layout_id per-blocco, composizione di presentazione (non toccare generatable), header/footer = chrome. Metodo FOREGROUND (io scrivo test-first + verifico; niente subagenti). Gate visivo APPROVATO al 1° giro (galleria `renderToStaticMarkup`, 32 varianti). Migrati `site-blocks-data` (selettori v2) + `generation-chooser` (T-232). Prossimo: aprire `prompts/session-start.md`, macrotask `body-sections-b` |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `foundation` | **done** | **VERDE 4/4** (`70c756a`) | 4 task DV2-101..104: themes.ts=23 palette CD (valori esatti, `color-mix`) + `THEME_ID_ALIASES`+`themeFor` proto-safe (id storici risolvibili); theme-style INVARIATO (già proietta); site.css migrato ai NOMI CD (valori preservati, 0 regressioni); primitivi a token, escaping, PhotoPlaceholder box "FOTO·label". **3 test v1.1 di biiezione ritirati** (invarianti migrate a design-themes-v2). **Fix e2e-scoperto: 6 punti render/serve THEMES.find→themeFor** (l'alias serve end-to-end o /s/ dà 404 sui theme_id storici). Merge su `main` su tuo via (deploy). Dip: — |
| `hero` | **done** | **VERDE 4/4** (`14b27f1`) | DV2-201/202: hero-layouts.ts **+20 layout CD** (`hero-<kebab>@1`, `media` placement + `title_treatment`, 6 legacy invariati, lookup esatto/proto-safe); Hero.tsx renderer unico 20 varianti CD + `data-hero-layout`/landmark + slot in `SiteText` + CTA i18n statiche + PhotoPlaceholder; **wiring minimo design→blocco** (types/registry/SiteView) + **edge-to-edge** (site.css) + i18n `site.hero.*`; **M5 preservato** (`HeroPhoto`: foto caricata `<img>` o placeholder, etichetta soppressa nei full-bleed). Emendamenti approvati dall'utente (wiring/CTA/edge/M5 anticipati qui, parte da variety-select). Dip: `foundation` |
| `menu` | **done** | **VERDE 4/4** (`df642ef`) | DV2-301/302/303: **tipo dedicato `SiteMenuLayout` + `MENU_LAYOUTS` (20)** + `menuLayoutFor` (assi `arrangement`/`price`, `SECTION_LAYOUTS` INVARIATO); `Offerte.tsx` renderer unico 20 varianti CD (card-carta/leader-dots/tabular/`data-menu-layout`, classi `site-menu-v2__*`) + **wiring `menu_layout_id`** (schema doc + SiteView + registry + `SiteBlockProps.design`) + **M5** (`block.images` via SiteImage); `design-matrix` **asse `menu_layout_id` INDIPENDENTE** (`pickMenuLayout` su `flavor`). Rifinitura visiva post-gate (in-linea centrate/numerate/full-width). Migrati 2 test v1 (`site-blocks-data`, `site-effects-css`). Dip: `foundation` |
| `body-sections-a` (chi-siamo/recensioni/faq) | **done** | **VERDE 4/4** (`77ccb12`) | DV2-401/402/403 parte-a: **`section_layout_id` PER-BLOCCO** nel `BlockSchema` (DS-V2-D11 #2, corpo eterogeneo); catalogo `SiteBodyLayout`+`BODY_LAYOUTS` (12 chi-siamo, 10 recensioni, 10 faq) + `bodyLayoutFor` proto-safe; renderer unici `ChiSiamo`/`Recensioni`/`Faq` + `body-kit` (container/eyebrow/**foto M5** un solo URL builder); **recensioni = scheletro** (copy UI fissa i18n, mai testimonianze finte), **faq = dual-mode** (Q&A reali o scheletro); **composizione di presentazione** (`presentation.ts`) emette recensioni/faq nel mockup SENZA toccare `blocksFor`/`generatable` (gate di costo P5 intatto, P2-D7 preservato, DS-V2-D11 #3). Checkpoint 4/4: suite **1669/1669**, `next build` 0, **e2e Chromium 30/30**, R-04 **210→179**, semgrep 0, mutazioni 2/2. **Gate visivo APPROVATO.** Migrati `site-blocks-data`/`generation-chooser`. Dip: `foundation` |
| `body-sections-b` (orari/contatti/header+footer) | **todo** | — | DV2-401/403/404 parte-b: orari (giorno-corrente = effetto **client**, doc byte-identico) + contatti (mappa **SVG di catalogo**, no risorsa esterna) + **header/footer = CHROME del SiteView** (fuori dal doc congelato, DS-V2-D11 #4). Riusa il wiring per-blocco + `body-kit` + `withPresentationSections` (se emettere anche orari/contatti da valutare). Dip: `foundation`, `body-sections-a` |
| `variety-select` | **todo** | — | 4 task (DV2-501…504): riuso aggancio varietà (variant-document congela tutti gli assi + inoltro design+vertical ai blocchi, da `hero-menu-wow` `fff6904`); **`recipe_id` asse della matrice (DS-V2-D8)**; greedy multi-asse farthest-first (esclusione dura hero+theme, **recipe inclusa**, seed mulberry32); requisito materiale ≥5 hero + ≥5 theme + ≥2 recipe/vertical o `selectDesign` fallisce forte. Dip: `hero`, `menu`, `body-sections` |
| `e2e-visual-v2` | **todo** | — | 2 task (DV2-601…602): e2e-nucleo GATE (5 varianti reali di un seed divergono su hero VISIBILE + corpo computed + wow + canary rosso); anti-injection sui nuovi blocchi ricchi (doc ostile su /s/ + canary). Harness P4. **ULTIMO nodo del DAG.** Dip: `variety-select` |

## 2. Macrotask corrente

- **`body-sections-a` è DONE** (checkpoint 4/4, mergiato `77ccb12`, gate visivo APPROVATO, deploy ulaba.net):
  chi-siamo/recensioni/faq con `section_layout_id` **per-blocco**, scheletro presentazione, dual-mode faq. **SELEZIONATO
  per la PROSSIMA sessione: `body-sections-b`** (DV2-401/403/404 parte-b, DS-V2-D11 #1) — orari + contatti + header/footer,
  dip `foundation`+`body-sections-a` (verdi). Task: orari (tabella/card a token che consuma `section_layout_id`; l'evidenza
  del **giorno-corrente = effetto CLIENT** dell'isola, `matchMedia` accessor → `vi.stubGlobal`, doc byte-identico) +
  contatti (card recapiti + mappa **SVG di catalogo**/PhotoPlaceholder, MAI risorsa esterna, href da costruttori validati)
  + **header/footer = CHROME del SiteView** (DS-V2-D11 #4, fuori dal doc congelato; contenuti da attributi-sito derivati,
  non slot LLM; meno blast-radius su slots.ts/generatable). **Riusabili da body-a:** wiring per-blocco (`block.section_layout_id`),
  `body-kit` (BodyContainer/BodyEyebrow/**BodyPhoto M5**), `withPresentationSections` (valutare se emettere anche
  orari/contatti). Catalogo CD via DesignSync: `components/orari|contatti|chrome` (~20 varianti/tipo). Poi `variety-select`.
- **Ordine (DAG):** `foundation → {hero, menu, body-sections} → variety-select → e2e-visual-v2`. I tre
  macrotask del corpo dipendono solo da `foundation` e sono indipendenti fra loro; `hero`, `menu`,
  `body-sections` toccano `site.css` → **un macrotask alla volta** per evitare conflitti.
- **Criteri/test di riferimento**: vedi il modulo `01-foundation.md` e i `target_tests` dei task.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `body-sections-a` costruito su `trueline/build/body-sections-a` (da `main` pulito), poi **mergiato su `main`** (ff `77ccb12`). Prossimo: aprire `trueline/build/body-sections-b` da `main` pulito. Mai lavorare su `main` |
| Ultimo commit | `77ccb12` feat(design-engine-v2): body-sections-a — chi-siamo/recensioni/faq (12+10+10 varianti CD) + section_layout_id per-blocco + composizione di presentazione (DV2-401/402/403) [checkpoint VERDE 4/4]. Preceduto da `menu` (`df642ef`), `hero` (`14b27f1`), `foundation` (`70c756a`) |
| Stato merge su `main` | **`body-sections-a` MERGIATO su `main`** su via umana esplicita (deploy-coupling coupled → deploy su ulaba.net). Verifica locale COMPLETA prima del merge: vitest **1669/1669**, `next build` 0, **e2e Chromium 30/30**, checkpoint 4/4 (C1 R-04 210→179 delta0, C2 semgrep 0), mutazioni 2/2, gate visivo APPROVATO. I prossimi macrotask restano human-gated anche sul verde |
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
- **`menu` (confine, VERDE `df642ef`)**: baseline igiene **RI-CATTURATA 174→210** (`baseline.mjs capture . --hygiene`):
  R-04 legittimo — le 20 varianti CD di `Offerte.tsx` (componenti-slot ripetuti) + prosa dei docs blueprint → 40 dup
  "nuove" vs baseline hero, ri-attribuite (menu + docs) e ri-catturate. **Dopo i fix estetici post-gate** (le 4 in-linea
  rifinite) → `delta --hygiene` **new=0** (i cloni sono SCESI a 193 ⊆ 210, nessuna re-cattura necessaria). Baseline
  sicurezza **invariata** — semgrep **0** (`src/`, 12 regole/166 file), gitleaks solo gitignorati (`.next/`,`.env.local`,
  `siti css/`, contro-provati con `git check-ignore`), osv/rls senza migrazioni/dip nuove. knip 0, madge 0, arch (suite).
  **0 retry**. Batteria mutazione 2/2 uccise (Offerte leader-dots→AC-302-1 rosso; `pickMenuLayout` flavor→heroIndex→AC-303-1
  rosso; backup+sha256). **GOTCHA GATE VISIVO: la galleria jsdom SCARTA i `padding: clamp(...)`** (testi "attaccati ai
  bordi" = falso allarme) → generare con **`renderToStaticMarkup` (react-dom/server, `@vitest-environment node`)**, non
  `render`/jsdom. **Checkpoint monolitico `run_checkpoint.mjs` gira sulla reference-app della SKILL, non sul repo** →
  driver decomposto O oracoli diretti (semgrep docker su `$(pwd -W)/src`, `run_gitleaks.mjs`/`run_dupcheck.mjs <repo>`,
  `baseline.mjs delta/capture . --hygiene`).
- **`hero` (confine, VERDE `14b27f1`)**: baseline igiene **RI-CATTURATA** (`baseline.mjs capture . --hygiene`):
  R-04 legittimo — le 20 varianti CD (struttura condivisa dei componenti-slot + text-stack) + prosa dei docs
  blueprint → ~22 dup "nuove" vs baseline v1.1, ri-attribuite e assorbite (**178 dup totali baselinati**).
  Aggiungere `background` ai 4 full-bleed DOPO la re-baseline NON ha spostato le impronte tracciate → **nessuna 2a
  re-baseline**. Baseline sicurezza **invariata** — semgrep 0 (`src/`), **gitleaks 0 sul diff `main..HEAD`** (i 3
  CRITICAL erano FP su `.env.local`/`siti css/` gitignorati, contro-provati), osv/rls 2 FP noti. knip 0, madge 0.
  **0 retry** (checkpoint verde; il rosso su C2 era FP, e sull'e2e AC-DE-401-2 = invariante v1.1 migrata, non un
  difetto). Batteria mutazione 2/2 uccise (sed + backup+sha256).
- **`foundation` (confine, VERDE `70c756a`)**: baseline igiene **INVARIATA** — jscpd **0 cloni** nei file
  nuovi (l'helper `cdColors` deriva i token legacy → nessuna dup verbatim dei 23 record; **NESSUNA
  ri-cattura**, a differenza di editorial-skin v1.1). Baseline sicurezza **invariata** — gitleaks 0
  (`main..HEAD`), semgrep 0 (`src/`), osv/rls senza migrazioni/dip nuove (2 FP noti). knip 0, madge 0,
  arch verde. **0 retry consumati** (checkpoint verde; l'unico rosso è stato l'e2e — 404 su /s/ — fixato
  con `themeFor`). Batteria mutazione 2/2 uccise (backup+sha256).
- **Contratto altitudine**: v2 **non ridichiara** il contratto — riusa quello **globale** enforced dal
  repo (`tests/architecture-contract.test.ts`, AH-D6): `domain→ui/data/app` e `data→ui` vietati;
  `ui→domain` lecito (i blocchi importano i cataloghi del dominio). Cataloghi/matrice/selettore/schema
  puri; render in `src/ui/site`.
- **Budget**: retry ≤2 per checkpoint; batteria di mutazione per macrotask (mutazione palesemente
  fatale + ripristino via **backup+sha256, MAI `git checkout`** — il macrotask è uncommitted).

## 5. Carry-over / note ereditate

- **🔴 LEZIONE body-a — WIRING PER-BLOCCO `section_layout_id` (pattern per body-b).** A differenza di hero/menu (un
  blocco → un asse-DOCUMENTO), il corpo ha sezioni ETEROGENEE: `section_layout_id` è un campo OPZIONALE del
  `BlockSchema` (SENZA default per-blocco; un default sarebbe di settore). Il renderer legge `block.section_layout_id`
  (NON `design.*`) → NON serve toccare registry/SiteView/`SiteBlockProps.design` (quelli restano per gli assi doc-level).
  `VersionedIdSchema` va dichiarato PRIMA di `BlockSchema` (TDZ: un `const` non è hoistato). Ogni renderer del corpo rende
  il PROPRIO `<section aria-label data-block-id data-block-kind data-section-layout className="site-<sez>-v2">` (pattern
  `Offerte`, edge-to-edge in site.css) — NON `SiteSection`. `variantFor` = `bodyLayoutFor(id)?.variant` + `Object.hasOwn`
  proto-safe + fallback (nessun record id→variant duplicato: la fonte è il catalogo).
- **🔴 LEZIONE body-a — COMPOSIZIONE DI PRESENTAZIONE (non toccare il gate di costo).** `withPresentationSections`
  (`presentation.ts`, dominio puro) emette recensioni/faq scheletro nella HOME del documento mockup, agganciata in
  `resolveVariantHome` A VALLE di `resolve`. `blocksFor`/`generatable` INTATTI (P5 e P2-D7 preservati); `recensioni.precondition`
  resta `()=>false`. **GUARD CRITICO: home con 0 blocchi → NON aggiungere** (altrimenti un pool vuoto darebbe una card fatta
  solo di scheletri, aggirando la difesa "card vuota → null"; l'ha colto `variant-document-design`). Idempotente per id
  (faq reale non duplicata). Ha reso UNIFORME la presenza recensioni/faq nelle 5 card → **migrato `generation-chooser`**
  (T-232: da "1 card senza faq" a "tutte con recensioni/faq"; la varietà v2 resta provata dalle 5 sequenze distinte).
- **LEZIONE body-a — SCHELETRO = copy UI FISSA i18n + barre decorative, MAI dati finti.** Recensioni/faq non alimentate
  rendono `site.reviews/faq.placeholder` (i18n, testo di catalogo) + barre `aria-hidden` (color-mix su `--site-color-line`),
  nessun autore/quote/Q&A inventati (anti-invenzione intatta). Faq è **dual-mode**: `faq_items` reali (via SiteText) o scheletro.
- **LEZIONE body-a — GOTCHA AC-231-4: il test vieta la STRINGA `dangerously`+`SetInnerHTML` anche nei COMMENTI**
  (scan substring su `src/ui/site/**`). Non scrivere il nome dell'API nei commenti: usare "iniezione di HTML grezzo".
- **LEZIONE body-a — ORACOLI SUL REPO, non sulla reference-app della skill.** `baseline.mjs delta . --hygiene` carica di
  DEFAULT `.trueline/baseline.json` (sicurezza) → passare `--baseline "$(pwd -W)/.trueline/hygiene-baseline.json"` ESPLICITO
  + dir `"$(pwd -W)"`. `run_semgrep.mjs "$(pwd -W)"` SENZA `MSYS_NO_PATHCONV` sul prefix (corromperebbe il path node). I path
  dei finding escono con prefisso `eval/reference-app/` ma sono i file del repo (la reference-app rispecchia il repo).

- **🔴 LEZIONE menu — IL GATE VISIVO SI FA CON `renderToStaticMarkup`, MAI CON jsdom.** La galleria di anteprima
  generata con `render` (testing-library, jsdom) **SCARTA i `padding: clamp(...)`** (e ogni valore CSS con virgole)
  dagli stili inline → i testi sembrano "attaccati ai bordi" e le card compresse (FALSO ALLARME che ha fatto fallire
  il 1° gate). Rimedio: generatore con `import { renderToStaticMarkup } from 'react-dom/server'` + `// @vitest-environment
  node` + `renderToStaticMarkup(await Offerte({...}))` → i clamp sono PRESERVATI, la resa è fedele a `/s/` (Next SSR).
  **Per body-sections: la galleria del gate DEVE usare renderToStaticMarkup.** (Contro-prova: `grep -c 'clamp(' gallery.html`
  — se 0, la galleria è rotta.)
- **LEZIONE menu — WIRING `<asse>_layout_id` design→blocco (pattern da riusare per body-sections).** Il menu ha esteso
  il canale design→blocco per un nuovo asse: (1) `SiteDocumentSchema` +campo `VersionedIdSchema.optional()` **senza
  default** (un default globale sarebbe di settore); (2) `SiteView` `SiteDesignSelection` Pick +campo, estrazione da
  `siteDocument`, proiezione `data-<asse>-layout` alla radice; (3) `registry.renderBlock` 4° arg tipo `{hero_layout_id?,
  <asse>_layout_id?}`; (4) `SiteBlockProps.design` +campo; (5) il blocco legge `design?.<asse>_layout_id ?? FALLBACK`.
  Il congelamento PIENO in generazione resta a `variety-select`. **Renderer unico:** record `LAYOUT_TO_VARIANT` id→variante
  + `Object.hasOwn` proto-safe + `FALLBACK_VARIANT`; **classi uniformi** (`site-<blocco>-v2__name/__price/__item` + `data-*`)
  su TUTTE le varianti così i selettori/AC reggono anche sul fallback e su qualunque variante.
- **LEZIONE menu — CATALOGO: tipo DEDICATO, non gonfiare `SECTION_LAYOUTS`.** Il menu ha un tipo `SiteMenuLayout` +
  array `MENU_LAYOUTS` + `menuLayoutFor` SEPARATI (non 20 voci in `SECTION_LAYOUTS`): l'invariante v1.1 DE11-202 ("ogni
  sezione ≥2 varianti ha `kind` distinti", 7 kind chiusi) si sarebbe rotta con 20 voci. Per body-sections valutare se
  ri-stilare i tipi ESISTENTI di `SECTION_LAYOUTS` (chi-siamo/orari/contatti hanno già ≥2 kind) o tipi dedicati.
- **LEZIONE menu — MIGRAZIONE ONESTA test v1→v2.** Riscrivere un blocco (Offerte) cambia i selettori: `site-blocks-data`
  (AC-237-*) migrato ai selettori v2 preservando le garanzie (voci rese, etichetta i18n per-vertical, layout logico
  `data-offerings-layout` ortogonale a `data-menu-layout`); `site-effects-css` (hover L2) ri-puntato a `.site-menu-v2__item`.
  **`resolveOfferings` (T-210) RESTA** la sede vertical→variante-logica (etichetta+show_price), ortogonale alla variante VISIVA.
- **LEZIONE menu — asse INDIPENDENTE dall'indice hero.** `pickMenuLayout(menuLayouts, flavor)` (contatore globale), NON
  `heroIndex` (che ancorava `pickSectionLayout` v1.1 → `menu-card-carta` mai selezionato). Prova: esiste un hero con ≥2
  menu distinti nel pool.
- **LEZIONE hero — SUBAGENTI INAFFIDABILI QUI, VERIFICA IN FOREGROUND**: nel workflow di build i **verifier
  BLIND hanno restituito garbage** (oggetto stub che soddisfa lo schema, `file:"a.ts"`) e il **fixer M5 si è
  stallato** (watchdog 600s, cugino del `0xC0000142`) lasciando lavoro parziale (finito a mano). Per cambiamenti
  ampi/dettagliati come Hero.tsx (20 varianti), la strada che tiene è: builder scrive → **orchestratore verifica
  e completa in FOREGROUND** (tsc/eslint/vitest/oracoli). Non fidarsi del verdetto di un verifier.
- **PATTERN `HeroPhoto` RIUSABILE (M5 da preservare OVUNQUE)**: la foto PRINCIPALE di ogni variante rende
  l'immagine CARICATA (`<img src=assetPublicUrl(asset_id)>` object-fit cover) o il `PhotoPlaceholder` di catalogo
  (prop `background` sopprime l'etichetta nei full-bleed, altrimenti galleggia sul titolo). **Sostituire
  `block.images`→PhotoPlaceholder ROMPE P4-M5**: menu/body-sections che oggi rendono `block.images` via
  `SiteSection`→`SiteImage` devono riusare `HeroPhoto` (o SiteImage) per non perdere le foto caricate.
- **SELEZIONE v1.1 ORA PESCA I 20 HERO CD** (universali) → la distinzione `section_layout_id` v1.1 (`heroIndex % N`)
  degrada transitoriamente; la distinzione PIENA del corpo passa a **variety-select (DV2-503 greedy)**. Migrate 2
  invarianti-biiezione unit v1.1 (`design-hero-layouts-v11` media→floor, `design-select-v11` section_layout→floor;
  la garanzia per-coppia resta via `recipe`/`bodyKey`). `LAYOUT_TO_VARIANT` mappa i 6 id legacy→variante CD vicina
  (i doc P4 già pubblicati rendono la pelle v2), fallback `'full'`.
- **BLAST-RADIUS E2E (per i prossimi blocchi)**: gli spec v1/v1.1 (`visual-skin`/`visual-engine`/`editorial-skin`)
  asserivano le vecchie classi `.site-hero__title/brand/kicker` → rinominate `.site-hero-v2__title/brand/eyebrow`;
  **AC-DE-401-2 migrato** dal `display` della `.site-section` (v1.1) alla **posizione della foto** della variante
  (v2: absolute full-bleed vs relative incorniciata — la varietà vive nella STRUTTURA, non in una regola CSS
  `[data-hero-layout] .site-section`). Le garanzie semantiche (hero≥40px, Playfair display, tracking editoriale)
  reggono in v2 perché il renderer usa gli stessi token INLINE.
- **R-04 hero — RE-BASELINE LEGITTIMO** (a differenza di foundation): le 20 varianti CD (struttura condivisa dei
  componenti-slot + text-stack) + prosa dei docs blueprint → 178 dup, ~22 "nuove" vs baseline v1.1 →
  ri-attribuite (catalogo + docs) e **ri-catturate** (`baseline.mjs capture . --hygiene`). NB: aggiungere `background`
  ai 4 full-bleed DOPO la re-baseline **non ha spostato** le impronte tracciate (erano i componenti/text-stack, non
  le righe-foto) → **nessuna seconda re-baseline**. `scratchpad/` NON gitignorato: driver/galleria cancellati prima del commit.
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
- **LEZIONE foundation — `THEMES.find` → `themeFor` OVUNQUE si risolva un `theme_id` di documento**
  (CRITICO per hero/menu/body): l'alias DS-V2-D1 vive SOLO in `themeFor`. Un `THEMES.find(id===theme_id)`
  diretto bypassa l'alias → un documento con `theme_id` storico non risolve → `/s/[slug]` fa `notFound()`
  (404). L'e2e l'ha scoperto (18 rossi su /s/); fix `70c756a` (6 punti: s/[slug], editor, render-draft,
  preview, generation-phase2, ThemeSwitcher). **I renderer di hero/menu/body devono usare `themeFor`.**
- **LEZIONE — l'e2e è il gate che conta prima del merge**: vitest era 1603 verde ma l'e2e ha trovato il
  404. Sempre `db:reset` + `next build` + `npm run test:e2e` (computed-style + serving /s/) prima del merge.
- **LEZIONE — l'helper `cdColors` ha azzerato la duplicazione jscpd** dei 23 record-palette (a differenza
  di editorial-skin v1.1 che ri-baselinò): un helper che deriva riduce i cloni verbatim → nessuna ri-baseline.
- **GOTCHA oracolo — `run_semgrep.mjs <dir>` monta la dir della SKILL come /src, non il progetto**:
  esegui `docker run -v <progetto>/src:/src:ro -v <ruleset>:/rules.yml:ro semgrep/semgrep scan --config /rules.yml --json /src`.
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

- **`menu` (DV2-301..303) — tutti gli AC coperti e verdi + GATE VISIVO ESEGUITO E APPROVATO.** Target_tests:
  `design-section-layouts-menu-v2` (AC-301-1\2\3: ≥4 (20) id versionati, arrangement+price non vuoti, lookup esatto\
  proto-safe, 2 coppie-prefisso, firma `arrangement|price` UNICA per voce — distinzione VISIBILE non nominale);
  `site-menu-v2` (AC-302-1\2\3\4: leader-dots TRA nome e prezzo + `data-menu-layout`, card-carta su `surface-dark` senza
  letterali, prezzi `.site-menu-v2__price` tabular da site.css, anti-injection); `design-matrix-menu-v2` (AC-303-1\2\3:
  ≥2 menu_layout_id distinti + INDIPENDENZA da heroIndex, id di catalogo, determinismo ri-enumerando). Migrati
  `site-blocks-data`/`site-effects-css` (v1→v2). **Mutazioni 2/2 uccise** (leader-dots→AC-302-1; asse→heroIndex→AC-303-1).
  e2e 30/30, next build 0, suite 1635/1635. **Gate visivo: galleria `renderToStaticMarkup` (20 varianti × 2 temi),
  1° giro NON passato (artefatto jsdom clamp), rifinite 4 in-linea, 2° giro APPROVATO.**
- **NON coperto / dichiarato (L-COL-006, menu):** (a) il **congelamento** di `menu_layout_id` in generazione (i 5 mockup
  che pescano menu diversi) è di **variety-select** (DV2-501/greedy) — qui c'è il WIRING, non la selezione: a runtime su
  /s/ senza congelamento Offerte cade sul fallback `menu-griglia@1`. (b) Il **menu per vertical non-ristorazione** usa le
  sole varianti `universale` (le generiche) — non testato a fondo (il blueprint è ristorazione). (c) La **bellezza** non è
  oracolabile (gate umano fatto). (d) **Foto reali** fuori scope (P4-D7/F): il menu è tipografico, la banda M5 rende solo
  gli slot `uploaded`.
- **`hero` (DV2-201..202) — tutti gli AC coperti e verdi + GATE VISIVO ESEGUITO.** Target_tests:
  `design-hero-layouts-v2` (AC-201-1/2/3: ≥8 (26) id versionati distinti, media+title_treatment non vuoti su tutti i
  20 CD, lookup esatto/proto-safe, asse VISIBILE media/title_treatment), `site-hero-v2` (AC-202-1/2/3/4:
  data-hero-layout+landmark, slot+`<h1>` display+CTA+PhotoPlaceholder, distinzione strutturale full vs split,
  anti-injection). Provenienza rispettata (lato atteso letterale). **Mutazioni 2/2 uccise** (src M5→AC-416-5 rosso;
  `LAYOUT_TO_VARIANT` collasso→AC-202-1/3 rosso), ripristino sha256. e2e su `/s/` 30/30 (varietà computed, pelle,
  anti-injection, canary rosso). **Gate visivo ESEGUITO** (galleria 20 varianti rese col vero site.css) e
  **APPROVATO dall'utente** ("meglio di Wix") — a differenza di foundation (non eseguito formalmente).
- **NON coperto / dichiarato (L-COL-006, hero):** (a) **Tetto del wow = PhotoPlaceholder**: senza foto reali i box
  tratteggiati restano il limite; la fotografia reale è **P4-D7/F**, fuori scope. (b) **M5 preservato SOLO nell'hero**
  in questo macrotask (gli altri blocchi già rendevano `block.images`; menu/body-sections dovranno riusare
  `HeroPhoto`/SiteImage). (c) La **distinzione section_layout piena** fra le 5 varianti è DEMANDATA a variety-select
  (qui degradata a floor); la garanzia per-coppia resta via `recipe`. (d) La **bellezza estetica non è oracolabile**.
- **`foundation` (DV2-101..104) — tutti gli AC coperti e verdi.** Target_tests: `design-themes-v2`
  (AC-DV2-101-1..4: 23 palette complete, token semantici CD, `themeFor` esatto+alias+proto-safe,
  inclusione non biiezione; + invarianti migrate: no `var()`, palette distinte, id versionato via schema),
  `theme-style-v2` (AC-102-1..3: proiezione totale token→`--site-color-*`, valori dal tema),
  `site-css-no-literal-colors-v2` (AC-103-1..3: 0 letterali, token CD, regole editoriali),
  `site-primitives-v2` (AC-104-1..3: a token, PhotoPlaceholder box, escaping). Mutazioni 2/2 uccise.
- **NON coperto / dichiarato (L-COL-006):** (a) **Gate visivo NON eseguito formalmente** per foundation
  (nessuno screenshot su `/s/` in questa sessione): il merge è avvenuto su checkpoint-verde + e2e 30/30
  + via umana esplicita, giustificato dal fatto che foundation è dominio/token/primitivi — le palette CD
  si applicano ai blocchi v1.1 esistenti, il "wow" pieno arriva con hero/menu (dove il gate visivo conta
  davvero). **L'utente può verificare a occhio su ulaba.net.** (b) I **primitivi** (`primitives.tsx`) non
  sono ancora **consumati** da alcun blocco (li useranno Hero/Offerte/corpo in 02-04): oggi provati solo
  dal loro test. (c) La **bellezza estetica non è oracolabile** — gate visivo umano per sezione. (d) **Foto
  reali** fuori scope (P4-D7/F).
- **NON coperto per costruzione (dichiarato, L-COL-006)**: la **bellezza estetica non è oracolabile** —
  la giudica l'utente al **gate visivo** di ogni sezione (screenshot su `/s/`); gli oracoli provano
  struttura, sicurezza, varietà (assi VISIBILI + corpo), determinismo e assenza di regressioni. Le
  **foto reali** sono fuori scope (P4-D7/F): v2 rende i `PhotoPlaceholder` tipografici di CD.

---

**Infra oracoli** (per i checkpoint): gitleaks in `.trueline/bin/`; semgrep via Docker (daemon da
avviare a inizio sessione); `rls_check` built-in. Baseline igiene ARRAY-di-fingerprint refreshabile con
`baseline.mjs capture . --hygiene --out .trueline/hygiene-baseline.json`.

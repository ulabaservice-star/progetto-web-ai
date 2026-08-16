# SESSION-STATE — Belora/Ulaba · design-engine-v2 (catalogo da Claude Design + varietà greedy)

> Fonte di verità sullo **stato vivo** del workstream design-engine-v2, consumata da BUILD e
> aggiornata a ogni chiusura di sessione (`prompts/session-end.md`). Istanza distinta dalle
> SESSION-STATE di P0…P4, di design-engine v1 / v1.1, di `architecture-hardening`, `deploy-hardening`
> e da quella della skill trueline. Prosa in italiano, identificatori/nomi-file in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-16 (**`variety-select` COSTRUITO — checkpoint VERDE + merge su `main`** (`362847f`, deploy ulaba.net): la varietà diventa VERA. **DV2-501:** `variant-document` congela TUTTI gli assi v2 (theme/hero/menu + **`section_layout_id` PER-BLOCCO** del corpo via `selectBodyLayout` + recipe) + **`vertical`** (SiteView lo inoltra ai blocchi: NON arrivava via `block.data` — `vertical` è consultato, non reso → il menu cadeva su 'altro'). **DV2-502:** `recipe_id` ASSE in `allowedCombinations` (DS-V2-D8, `pickRecipe` su flavor). **DV2-503:** **greedy farthest-first** (esclusione dura hero+theme, recipe nella distanza, `mulberry32(seed)`). **DV2-504:** requisito materiale (≥5 hero/theme + ≥2 recipe) o `selectDesign` fallisce forte (`assertSufficientMaterial` esportata, testata con pool crafted). **Rifiniture emerse al GATE, incluse nel commit:** (1) `site.css .site-page gap:0` — bande full-bleed CONTINUE (le strisce bianche erano il fondo `body` visto tra le bande); (2) migrazione e2e **DE-102** (distinzione hero v2 = tipografica, non background di sezione — in v2 la `<section>` è trasparente); (3) **IBRIDO PALETTE A+B (DV2-505):** greedy massimizza anche la **distanza cromatica** (accent-hue + luminosità fondo) + 2 palette a fondo NON-crema (`trattoria-a-lume` scura, `osteria-di-lago` fredda) → 5 mockup con palette davvero distinte (rosso/oro/verde/teal/magenta + una scura), non 5 caldi. Checkpoint: C1 R-04 **207→223** delta0 poi **new=0** post-palette (color-mix a valori unici, come `cdColors`), C2 semgrep 0, C3 **1717/1717**, C4 covers; `next build` 0; **e2e Chromium 30/30**; **mutazioni 6/6**; **gate visivo APPROVATO** (tema scuro premium). **Prossimo: `e2e-visual-v2`** (ULTIMO nodo del DAG)) |
| **Sessione corrente** | 2026-08-16 — BUILD `variety-select` COMPLETO E MERGIATO (deploy). Metodo FOREGROUND (io scrivo test-first + verifico; niente subagenti). Gate visivo su `/s/` (5 varianti reali di un seed via Playwright, JS-off per catturare l'SSR intero) → 2 giri di rifinitura con l'utente: (a) `gap:0` per le bande continue, (b) ibrido palette A+B (accento spread + 2 palette non-crema) per la varietà cromatica. Recensioni "attaccato" = misurato 102px corretto (era il layout pre-`gap:0`). Prossimo: aprire `prompts/session-start.md`, macrotask `e2e-visual-v2` |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `foundation` | **done** | **VERDE 4/4** (`70c756a`) | 4 task DV2-101..104: themes.ts=23 palette CD (valori esatti, `color-mix`) + `THEME_ID_ALIASES`+`themeFor` proto-safe (id storici risolvibili); theme-style INVARIATO (già proietta); site.css migrato ai NOMI CD (valori preservati, 0 regressioni); primitivi a token, escaping, PhotoPlaceholder box "FOTO·label". **3 test v1.1 di biiezione ritirati** (invarianti migrate a design-themes-v2). **Fix e2e-scoperto: 6 punti render/serve THEMES.find→themeFor** (l'alias serve end-to-end o /s/ dà 404 sui theme_id storici). Merge su `main` su tuo via (deploy). Dip: — |
| `hero` | **done** | **VERDE 4/4** (`14b27f1`) | DV2-201/202: hero-layouts.ts **+20 layout CD** (`hero-<kebab>@1`, `media` placement + `title_treatment`, 6 legacy invariati, lookup esatto/proto-safe); Hero.tsx renderer unico 20 varianti CD + `data-hero-layout`/landmark + slot in `SiteText` + CTA i18n statiche + PhotoPlaceholder; **wiring minimo design→blocco** (types/registry/SiteView) + **edge-to-edge** (site.css) + i18n `site.hero.*`; **M5 preservato** (`HeroPhoto`: foto caricata `<img>` o placeholder, etichetta soppressa nei full-bleed). Emendamenti approvati dall'utente (wiring/CTA/edge/M5 anticipati qui, parte da variety-select). Dip: `foundation` |
| `menu` | **done** | **VERDE 4/4** (`df642ef`) | DV2-301/302/303: **tipo dedicato `SiteMenuLayout` + `MENU_LAYOUTS` (20)** + `menuLayoutFor` (assi `arrangement`/`price`, `SECTION_LAYOUTS` INVARIATO); `Offerte.tsx` renderer unico 20 varianti CD (card-carta/leader-dots/tabular/`data-menu-layout`, classi `site-menu-v2__*`) + **wiring `menu_layout_id`** (schema doc + SiteView + registry + `SiteBlockProps.design`) + **M5** (`block.images` via SiteImage); `design-matrix` **asse `menu_layout_id` INDIPENDENTE** (`pickMenuLayout` su `flavor`). Rifinitura visiva post-gate (in-linea centrate/numerate/full-width). Migrati 2 test v1 (`site-blocks-data`, `site-effects-css`). Dip: `foundation` |
| `body-sections-a` (chi-siamo/recensioni/faq) | **done** | **VERDE 4/4** (`77ccb12`) | DV2-401/402/403 parte-a: **`section_layout_id` PER-BLOCCO** nel `BlockSchema` (DS-V2-D11 #2, corpo eterogeneo); catalogo `SiteBodyLayout`+`BODY_LAYOUTS` (12 chi-siamo, 10 recensioni, 10 faq) + `bodyLayoutFor` proto-safe; renderer unici `ChiSiamo`/`Recensioni`/`Faq` + `body-kit` (container/eyebrow/**foto M5** un solo URL builder); **recensioni = scheletro** (copy UI fissa i18n, mai testimonianze finte), **faq = dual-mode** (Q&A reali o scheletro); **composizione di presentazione** (`presentation.ts`) emette recensioni/faq nel mockup SENZA toccare `blocksFor`/`generatable` (gate di costo P5 intatto, P2-D7 preservato, DS-V2-D11 #3). Checkpoint 4/4: suite **1669/1669**, `next build` 0, **e2e Chromium 30/30**, R-04 **210→179**, semgrep 0, mutazioni 2/2. **Gate visivo APPROVATO.** Migrati `site-blocks-data`/`generation-chooser`. Dip: `foundation` |
| `body-sections-b` (orari/contatti/header+footer) | **done** | **VERDE 4/4** (`d405eaa`) | DV2-401b/403/404: `BODY_LAYOUTS` +12 orari +12 contatti + **catalogo dedicato `CHROME_LAYOUTS`** (6 header + 6 footer, `chromeLayoutFor`). `Orari`/`Contatti` renderer per-blocco v2 (24 varianti); **giorno-corrente = isola CLIENT** (`OrariToday`+`matchTodayKey` puro, doc byte-identico); **mappa = PhotoPlaceholder+pin**, geo in data-attr, href validati. **Header/footer = CHROME del SiteView** (DS-V2-D11 #4, `deriveChromeData`, contenuti derivati non-LLM, credito neutro **senza `new Date`**, nav `#slug`+`id=slug`). i18n `site.contact/footer.*`. Fix overflow foto (aspect-ratio+stretch). Checkpoint 4/4: suite **1692/1692**, `next build` 0, **e2e 30/30**, R-04 **179→207**, semgrep 0, mutazioni 2/2. **Gate visivo APPROVATO.** Migrati `site-blocks-data`/`site-blocks-untrusted`/`public-site-route`. Dip: `foundation`, `body-sections-a` |
| `variety-select` | **done** | **VERDE** (`362847f`) | DV2-501/502/503/504 + rifiniture gate (`gap:0`, DE-102 e2e, ibrido palette A+B/DV2-505). Freeze per-blocco `section_layout_id` (`selectBodyLayout`) + menu + `vertical` (inoltrato da SiteView, non in `block.data`); `recipe_id` asse matrice; greedy farthest-first (esclusione dura hero+theme + **distanza cromatica** accent-hue/bg-lightness); `assertSufficientMaterial` fail-forte. themes.ts +2 palette non-crema. Suite **1717/1717**, e2e 30/30, next build 0, mutazioni 6/6, gate APPROVATO. Migrati 0 test (5 nuovi: document-design-selection-v2, design-matrix-recipe-v2, design-select-greedy-v2, design-select-material-v2, design-select-palette-v2). Dip: `hero`, `menu`, `body-sections` |
| `e2e-visual-v2` | **todo** | — | 2 task (DV2-601…602): e2e-nucleo GATE (5 varianti reali di un seed divergono su hero VISIBILE + corpo computed + wow + canary rosso); anti-injection sui nuovi blocchi ricchi (doc ostile su /s/ + canary). Harness P4. **ULTIMO nodo del DAG.** Dip: `variety-select` |

## 2. Macrotask corrente

- **`variety-select` è DONE** (checkpoint VERDE, mergiato `362847f`, gate visivo APPROVATO, deploy ulaba.net) →
  **la varietà è VERA su /s/**: le 5 varianti di un seed divergono su hero, menu, palette (accento + fondo scuro/freddo),
  e OGNI sezione del corpo ha un layout diverso; le bande sono continue (`gap:0`).
  **SELEZIONATO per la PROSSIMA sessione: `e2e-visual-v2`** (DV2-601/602, ULTIMO nodo del DAG), dip `variety-select` (verde).
  Task: e2e-nucleo GATE (5 varianti reali di un seed divergono su hero VISIBILE computed + ≥1 asse del corpo computed + wow
  + **canary rosso PRIMA del verde**); anti-injection sui blocchi ricchi (doc ostile su /s/ + canary). Harness P4 (seed.ts,
  hostile-brief.ts, effect-assertions.ts). **NB:** l'e2e generale (30/30) già copre /s/ ma NON la MISURA computed della
  varietà fra 5 varianti reali — quello è DV2-601. Riusare l'idea del gate-spec throwaway di questa sessione (5 varianti via
  `resolveVariantHome` seed `gate-visivo-v2`, screenshot JS-off), ma con asserzioni computed-style + canary, non screenshot.
- **Ordine (DAG):** `foundation → {hero, menu, body-sections} → variety-select → e2e-visual-v2`. Restano solo `e2e-visual-v2`.
- **Criteri/test di riferimento**: vedi il modulo `06-e2e-visual-v2.md` e i `target_tests` dei task.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `variety-select` costruito su `trueline/build/variety-select` (da `main` pulito), poi **mergiato ff su `main`** (`362847f`) e branch cancellato. Prossimo: aprire `trueline/build/e2e-visual-v2` da `main` pulito. Mai lavorare su `main` |
| Ultimo commit | `362847f` feat(design-engine-v2): variety-select — greedy farthest-first + freeze assi + palette ibrida A+B (DV2-501..505) [checkpoint VERDE, gate APPROVATO]. Preceduto da `body-sections-b` (`d405eaa`), `body-sections-a` (`77ccb12`), `menu` (`df642ef`), `hero` (`14b27f1`), `foundation` (`70c756a`) |
| Stato merge su `main` | **`variety-select` MERGIATO su `main`** su via umana esplicita (deploy-coupling coupled → deploy su ulaba.net). Verifica locale COMPLETA prima del merge: vitest **1717/1717**, `next build` 0, **e2e Chromium 30/30**, checkpoint (C1 R-04 207→223 delta0 + new=0 post-palette, C2 semgrep 0), mutazioni 6/6, gate visivo APPROVATO. `e2e-visual-v2` resta human-gated anche sul verde |
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
- **`variety-select` (confine, VERDE `362847f`)**: baseline igiene **RI-CATTURATA 207→223** al 1° confine (18 dup NUOVE
  tutte LOW nei renderer del corpo NON toccati — la mia edit a `Offerte.tsx` ri-attribuisce le coppie clone Offerte↔body
  preesistenti; **0 cloni nei miei file**). **Post-ibrido-palette (A+B): delta new=0 SENZA re-cattura** — le 2 palette nuove
  col pattern `color-mix`/valori unici + il codice palette-distance NON creano dup verbatim (stessa lezione di `cdColors`
  foundation). Baseline sicurezza **INVARIATA**: **semgrep 0** (`run_semgrep.mjs "$(pwd -W)"`, docker), gitleaks solo
  gitignorati (`.env.local`/`siti css/`, contro-provati), osv/rls invarianti (**nessuna dip/migrazione/segreto**: solo TS
  puro + dati palette). knip 0, tsc/eslint 0. **0 retry.** Batteria mutazione **6/6 uccise**: freeze `vertical:'altro'`→
  AC-501-1/2; `selectBodyLayout` ignora variantIndex→AC-501-3; `pickRecipe` costante→AC-502-1; greedy `<`→`>`→AC-503-2;
  soglia materiale `<1`→AC-504-2; `paletteDistance`→0→AC-505 (test **rinforzato a 24 seed** perché pochi seed passavano
  anche senza la feature: `paletteDistance→0` = greedy originale = i cluster caldi lamentati). Ripristino backup+sha256.
  **🔴 GOTCHA GATE su /s/: scattare con JS OFF** (`javaScriptEnabled:false`), NON `reducedMotion` — l'isola reveal
  (IntersectionObserver) nasconde i blocchi sotto la piega e lo screenshot full-page li perde; senza JS l'SSR resta a
  opacità piena (progressive-enhancement, DE-401-3). Il clip full-page+viewport dà "Clipped area outside": usare scroll +
  viewport screenshot. **GOTCHA:** `scratchpad/` NON gitignorato → i suoi `.json` gonfiano jscpd (1 falso "new"); cancellarlo
  prima del delta/commit. **GOTCHA:** commit message con apostrofi italiani → `git commit -F <file>` (l'here-string PS
  `@'...'@` NON vale nel tool Bash).
- **`body-sections-b` (confine, VERDE `d405eaa`)**: baseline igiene **RI-CATTURATA 179→207** (`baseline.mjs capture
  "$(pwd -W)" --oracles jscpd --out .trueline/hygiene-baseline.json`): le 24 varianti CD di `Orari`/`Contatti` + la chrome
  (`SiteHeader`/`SiteFooter`) hanno introdotto **31 dup NUOVE, tutte LOW** — 16 nei renderer body-b (componenti-slot ripetuti
  delle varianti, FP legittimi come Offerte/ChiSiamo) + 14 sull'ALTRO capo di coppie cross-file con `Recensioni`/`Hero`/`Faq`
  (file NON toccati; R-04 sensibile alla POSIZIONE) + 1 prosa doc → ri-attribuite e ri-catturate (delta post **new=0**, anche
  dopo le micro-edit del fix overflow). Baseline **sicurezza INVARIATA**: **semgrep 0** (`run_semgrep.mjs "$(pwd -W)"`, docker,
  ruleset trueline-ai), gitleaks solo gitignorati (`.next/`/`.env.local`/`siti css/`, contro-provati `git check-ignore`),
  osv/rls invarianti (**nessuna dip/migrazione**: `git diff --name-only` pulito su package-lock/supabase). knip 0, tsc/eslint 0.
  **0 retry.** Batteria mutazione 2/2 uccise (Orari `data-section-layout` fisso → provenienza ROSSA; `deriveChromeData`
  whatsappHref grezzo → anti-injection chrome ROSSA), ripristino backup+sha256. **GOTCHA:** l'oracolo igiene è `--oracles
  jscpd` (non un flag `--hygiene`); `baseline.mjs delta` di default carica `.trueline/baseline.json` (sicurezza) → passare
  `--baseline .../hygiene-baseline.json` esplicito.
- **`body-sections-a` (confine, VERDE `77ccb12`)**: baseline igiene **RI-CATTURATA 210→179** (`baseline.mjs capture
  "$(pwd -W)" --hygiene`): i blocchi del corpo v1 riscritti hanno rimosso ~44 dup v1 e introdotto **13 dup NUOVE** — tutte
  LOW nei renderer `ChiSiamo`/`Recensioni`/`Faq` (componenti-slot ripetuti delle varianti CD) + 1 doc, **FP legittimi come
  `Offerte`** → ri-catturate (delta post = new 0). Baseline **sicurezza INVARIATA**: **semgrep 0** (`src/`, ruleset trueline
  via `run_semgrep.mjs "$(pwd -W)"`), gitleaks 3 CRITICAL SOLO su gitignorati (`.env.local`/`siti css/`, contro-provati
  `git check-ignore`), osv 2 MEDIUM su dip PRE-esistenti (nanoid/postcss, **package-lock non toccato**), rls 1 FP noto
  (anon-policy) — nessuna migrazione/dip/segreto nuovi. knip 0, tsc/eslint 0. **0 retry.** Batteria mutazione 2/2 uccise
  (ChiSiamo `data-section-layout` fisso → provenienza ROSSA; `presentation` senza faq → presentation+chooser ROSSI),
  ripristino backup+sha256. **GOTCHA oracoli (vedi §5):** `baseline.mjs delta` di default carica `.trueline/baseline.json`
  (sicurezza), non `hygiene-baseline.json` → passare `--baseline` esplicito.
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

- **🔴 LEZIONE variety-select — `vertical` NON arriva ai blocchi via `block.data` (va INOLTRATO).** `vertical` è
  "consultato, non reso" (blocks.ts): NON è in `brief_fields_rendered` di offerte, quindi `resolve` non lo copia in
  `block.data` → su /s/ `Offerte` cadeva sul settore generico 'altro' (layout logico sbagliato). DV2-501: congelare
  `vertical` nel documento (`SiteDocumentSchema` riusa `BriefUpdateSchema.shape.vertical`) e **inoltrarlo** via
  `SiteView`→`renderBlock`→`SiteBlockProps.vertical` accanto a `design`; `Offerte` legge `props.vertical ?? block.data.vertical
  ?? 'altro'`. Wiring reale, non speculativo (colmava un buco).
- **🔴 LEZIONE variety-select — `section_layout_id` PER-BLOCCO del corpo = derivazione seminata, non asse-documento.** Il
  Combo/`DesignSelection` porta UN `section_layout_id` (doc-level, `SECTION_LAYOUTS` v1.1, morto nel render v2). I blocchi del
  corpo v2 leggono `block.section_layout_id` da `BODY_LAYOUTS` (per tipo-sezione). `variant-document` assegna a ogni blocco del
  corpo (chi-siamo/orari/contatti/recensioni/faq) un id via `selectBodyLayout(section, vertical, seed, variantIndex)` =
  `candidati[(offset+variantIndex) % len]` su `BODY_LAYOUTS[section]` scope-filtrato (offset seminato dal seed). Con ≥5
  varianti/sezione, le 5 varianti (0..4) cadono su id DISTINTI → il corpo varia. hero/offerte (asse-documento) → `undefined`.
- **🔴 LEZIONE variety-select — IBRIDO PALETTE A+B (la greedy per-ID non spande il COLORE).** L'esclusione dura del `theme_id`
  dà 5 temi distinti ma NON palette visibilmente diverse (catalogo ristorazione caldo-crema → 5 accenti caldi, "palette sempre
  uguale" al gate). **A:** obiettivo SECONDARIO nel farthest-first = massimizzare `minPaletteDistTo` (distanza cromatica =
  tinta d'accento circolare×saturazione + luminosità del `surface_page`×0.7); a parità di similarità-assi vince la palette più
  lontana; tie-break seminato. Non regredisce le invarianti greedy (il PRIMARIO resta min-similarità). **B:** `themes.ts` +2
  palette a fondo NON-crema — una SCURA (`trattoria-a-lume`: surface_page scuro, text_heading/on_dark chiari, line chiare-
  trasparenti, accento brillante con `accent_contrast` SCURO, surface_dark il più scuro per le bande) e una FREDDA
  (`osteria-di-lago`: fondo grigio-salvia, accento teal). Il fondo-scuro RENDE PREMIUM (le bande dei blocchi reggono: text
  chiaro ovunque, card in rilievo). Conteggi temi via `toBeGreaterThanOrEqual` (inclusione) → aggiungere è sicuro.
- **🔴 GOTCHA variety-select — `.site-page gap` = STRISCE BIANCHE tra le bande v2.** `.site-page` aveva `gap: 2xl` (ritmo a
  CARD di v1, quando le sezioni erano schede dentro la colonna). In v2 le sezioni sono BANDE full-bleed 100vw (`margin-inline:
  calc(50%-50vw)`) con fondo proprio + padding interno (`BODY_SECTION_PAD_Y` 56-104px); il `body` è `#ffffff`, `.site-view`/
  `.site-page` senza fondo → il gap mostrava il bianco del body tra le bande. **Fix: `gap: 0`** (bande a contatto, continue).
- **🔴 LEZIONE variety-select — DE-102 e2e OBSOLETO in v2 (background di sezione).** In v2 lo sfondo dei blocchi sta su `<div>`
  INTERNI (Hero.tsx full-bleed), non sulla `<section>` → `getComputedStyle(section).backgroundColor` è TRASPARENTE per ogni
  sezione. L'asserzione v1 "hero bg ≠ non-hero bg" non regge (la greedy pesca hero tipografici es. `hero-gazzetta`). Migrata:
  il **titolo display dell'hero domina in font-size** l'intestazione del corpo (distinzione strutturale, robusta a ogni hero).
- **🔴 LEZIONE variety-select — `assertSufficientMaterial` ESPORTATA per oracolabilità.** Il fail-forte (hero o theme < 5) non
  è raggiungibile dai 5 vertical reali (materiale abbondante) → estratto in funzione pura esportata, testata con pool CRAFTED
  (povero) + un test che INIETTA il pool in `allowedCombinations` (`vi.spyOn`) provando che `selectDesign` propaga.
- **🔴 LEZIONE body-b — HEADER/FOOTER = CHROME del SiteView (DS-V2-D11 #4), NON blocchi.** `deriveChromeData(document)`
  (`src/ui/site/chrome/derive.ts`, PURA) estrae gli attributi-sito: nome dall'hero (`data.business_name`, primo blocco che
  ce l'ha, per PRESENZA di campo non per id), nav dalle PAGINE (`title` → `#slug`; `SitePageView` porta ora `id={page.slug}`
  come ancora), recapiti dal blocco contatti, orari dal blocco orari. `SiteView` rende `<SiteHeader>` + `<SiteFooter>`
  ATTORNO alle pagine (dentro `.site-view`, edge-to-edge 100vw), risolve le label i18n (`site.footer.*`, CTA da
  `site.actions.whatsapp`/`site.nav.contact`) e passa i dati. **Catalogo DEDICATO `CHROME_LAYOUTS`** (non `BODY_LAYOUTS`: un
  blocco non deve poter chiedere `section_layout_id:'header-…'`). **Contenuti DERIVATI, MAI slot LLM**; href SOLO dai
  costruttori validati o `#slug`; **credito NEUTRO senza `new Date`** (il Footer CD usava `getFullYear()` → RIMOSSO, romperebbe
  il determinismo). Il **badge P4-D5** resta fratello di `<main>`, fuori dalla chrome (nessun nuovo vincolo di pubblicazione).
- **🔴 LEZIONE body-b — SELEZIONE chrome FUORI SCOPE (DS-V2-D9).** header/footer NON sono assi di varietà ({theme, hero,
  menu, section, recipe}). In body-b la chrome rende la VARIANTE DEFAULT (`header-classico@1`/`footer-classico@1`); il
  renderer supporta comunque tutte le 6+6 via id (materiale per una futura selezione), MA **nessun campo document-level**
  header_layout_id/footer_layout_id (sarebbe un ORFANO: variety-select non lo congelerebbe). Il catalogo porta ≥2/slot per
  AC-DV2-401-1; `chromeLayoutFor` proto-safe.
- **🔴 LEZIONE body-b — GIORNO-CORRENTE = isola CLIENT + funzione PURA.** `OrariToday.tsx` (`'use client'`, `useEffect`
  post-mount) marca `data-today`/`aria-current` sulla riga di oggi; il match sta in `hours-today.ts` `matchTodayKey(keys,
  weekday)` PURA (best-effort: normalizza minuscole/accenti, inclusione piena o per RADICE 3-lettere — copre 'lun-ven'),
  oracolabile senza orologio. **`new Date` vive SOLO nell'isola** (nel browser); il server-render (renderToStaticMarkup) NON
  porta alcun marcatore → documento byte-identico (AC-403-2, provato). Ogni riga porta `data-hours-key` (isola) e
  `.site-hours-v2__value` (cifre tabulari + test). CSS marker in `[data-today='true']` (color-mix accent, no letterali).
- **🔴 GOTCHA body-b — aspect-ratio + `align-items: stretch` = OVERFLOW.** Un `.site-photo-ph` (aspect-ratio 16/9) in una
  colonna di griglia con `alignItems:'stretch'` risolve la LARGHEZZA dall'altezza stirata (min-width:auto non basta,
  `min-width:0` NON risolve) e sfonda la traccia sovrapponendosi alla colonna accanto (visto su orari `con-foto` e contatti
  `quartiere` al gate). **Fix: non stirare la foto** (`alignItems` default/`'start'`), passare un `ratio` esplicito. Il gate
  visivo con `renderToStaticMarkup` l'ha colto (jsdom no).
- **LEZIONE body-b — mappa contatti = `.site-contact-v2__map .site-photo-ph`** (box tematico) + pin a goccia in accent, `geo`
  in `data-geo-lat/lng`, `role=img`+aria-label i18n, **NESSUN src/href** (AC-403-3). I chip social rendono l'URL intero (il
  Brief non porta etichette social) — onesto (valore-slot editabile) ma grezzo; eventuale raffinamento = etichetta derivata.
- **GOTCHA body-b — oracolo IGIENE = `baseline.mjs ... --oracles jscpd`** (non un flag `--hygiene`); `delta` di default carica
  `.trueline/baseline.json` (sicurezza) → `--baseline .../hygiene-baseline.json` esplicito. **vitest `include` = `tests/**`
  SOLO** → una galleria/driver in `scratchpad/` NON viene raccolta: serve un config effimero (`vitest.gallery.config.ts`
  `mergeConfig(base,{include:['scratchpad/**']})`), **da cancellare col resto di scratchpad prima del commit**.
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

- **`variety-select` (DV2-501..505) — tutti gli AC coperti e verdi + GATE VISIVO ESEGUITO E APPROVATO.** Target_tests:
  `document-design-selection-v2` (AC-501-1/2/3: freeze theme/hero/menu versionati + `vertical` + `section_layout_id` per-blocco
  valido per tipo-sezione; SiteView proietta i data-* + inoltra design+vertical; Offerte riceve menu congelato E vertical
  [`data-offerings-layout=menu-sections`]; due doc hero/menu diversi → data-* distinti + corpo diverge); `design-matrix-recipe-v2`
  (AC-502-1/2/3: `recipe_id` valido ≥2/vertical, `recipeFor` risolve, deterministico); `design-select-greedy-v2` (AC-503-1/2/3:
  hero+theme distinti; farthest-first ricalcolato dal pool [non tautologico]; recipe/menu diversificati; determinismo);
  `design-select-material-v2` (AC-504-1/2/3: ≥5 hero/theme + ≥2 recipe/vertical; fail-forte con pool crafted + inietta pool in
  selectDesign; nessun falso allarme); `design-select-palette-v2` (DV2-505 ibrido A: ogni seed ≥1 accento freddo + media
  famiglie ≥3.5 su 24 seed, tinta ricalcolata dal catalogo). **Mutazioni 6/6 uccise.** Suite 1717, next build 0, e2e 30/30.
  **Gate visivo: 5 varianti reali di un seed su /s/ (Playwright JS-off), APPROVATO** — palette spread (rosso/oro/verde/teal/
  magenta + tema SCURO premium) + bande continue.
- **NON coperto / dichiarato (L-COL-006, variety-select):** (a) la **bellezza** non è oracolabile (gate umano fatto). (b) La
  MISURA COMPUTED della varietà fra 5 varianti reali su /s/ (font-size hero, layout corpo, background) + il **canary** sono di
  **`e2e-visual-v2`** (DV2-601) — qui il gate è per screenshot umano, l'e2e generale (30/30) copre /s/ ma non la misura inter-
  variante. (c) L'asse `section_layout` per-blocco del corpo NON entra nella distanza farthest-first della greedy (è derivato
  da `selectBodyLayout` seminato per-variante, non un asse-Combo): le 5 varianti hanno corpo diverso per variantIndex, non per
  metrica di distanza. (d) **Foto reali** fuori scope (P4-D7/F): PhotoPlaceholder. (e) `osteria-di-lago` (palette fredda) non
  selezionata dal seed di gate, ma il catalogo+greedy la offrono (materiale per altri seed). (f) Il `section_layout_id`
  doc-level del Combo (`SECTION_LAYOUTS` v1.1) resta un asse greedy ma è **morto nel render v2** (i blocchi leggono BODY_LAYOUTS
  per-blocco) — inerte, non rimosso (pulizia fuori scope).
- **`body-sections-b` (DV2-401b/403/404 parte-b) — tutti gli AC coperti e verdi + GATE VISIVO ESEGUITO E APPROVATO.**
  Target_tests: `design-section-layouts-body-v2` (ESTESO: orari/contatti in `BODY_LAYOUTS` + blocco dedicato per `CHROME_LAYOUTS`
  — AC-401-1/2/3 su tutti e 7 i tipi, ≥2 varianti/tipo, id versionati unici, lookup esatto proto-safe, firma `section|variant`
  / `slot|variant` UNICA); `site-body-hours-contact-v2` (AC-403-1: `data-section-layout` congelato + tutte le voci orario
  (trappola 'sab'/'sabato') + recapiti con href da costruttori validati + fallback; AC-403-2: **determinismo** — server
  byte-identico, niente `data-today`/`aria-current`, `matchTodayKey` oracolata senza orologio; AC-403-3: mappa senza risorse
  esterne, geo in data-attr, anti-injection escaping + href-safe); `site-header-footer-v2` (`deriveChromeData` estrazione +
  href sicuri; `SiteHeader`/`SiteFooter` `data-*-layout` congelato + slot + credito neutro **senza anno** + determinismo;
  integrazione SiteView monta la chrome + anti-injection). AC-404-2 (no colori letterali / no HTML grezzo) coperto per
  `src/ui/site/chrome/**` dallo scan ricorsivo di `site-blocks-style`. Migrati `site-blocks-data`/`site-blocks-untrusted`/
  `public-site-route` (selettori v2). **Mutazioni 2/2 uccise.** e2e Chromium 30/30, next build 0, suite 1692. **Gate visivo:
  galleria `renderToStaticMarkup` (36 varianti × trattoria-rustica), APPROVATO dopo fix overflow foto.**
- **NON coperto / dichiarato (L-COL-006, body-b):** (a) il **congelamento** dei `section_layout_id` per-blocco di
  orari/contatti (e dei `menu_layout_id`) in generazione è di **variety-select** (DV2-503) — qui c'è il WIRING + i renderer,
  non la selezione: su /s/ senza congelamento i blocchi del corpo cadono sul fallback. (b) La **selezione della variante
  chrome** (header/footer) è FUORI SCOPE (DS-V2-D9: non sono assi di varietà): si rende la default; il catalogo+renderer
  supportano tutte le 6+6 per un'eventuale selezione futura, senza campo orfano. (c) Il **giorno-corrente** è client
  (l'isola non gira nel server-render / negli unit con renderToStaticMarkup — la logica è provata via `matchTodayKey`; il
  comportamento DOM dell'isola è verificato dall'e2e generale, non da un unit dedicato). (d) I **chip social** rendono l'URL
  intero (il Brief non porta etichette). (e) La **bellezza** non è oracolabile (gate umano fatto). (f) **Foto reali** fuori
  scope (P4-D7/F): `BodyPhoto`/mappa rendono PhotoPlaceholder.
- **`body-sections-a` (DV2-401/402/403 parte-a) — tutti gli AC coperti e verdi + GATE VISIVO ESEGUITO E APPROVATO.**
  Target_tests: `site-document-block-layout-v2` (wiring per-blocco: accetta/preserva `section_layout_id` versionato, no
  default per-blocco, rifiuta forma errata, strict intatto); `design-section-layouts-body-v2` (AC-401-1/2/3: ≥2 varianti/
  sezione, id versionati unici, lookup esatto proto-safe, firma `section|variant` UNICA = distinzione VISIBILE);
  `site-body-about-reviews-faq-v2` (AC-402-1/2/4: `data-section-layout` congelato + slot resi, provenienza, scheletro copy
  UI fissa senza dati finti, dual-mode faq, anti-injection escaping, nessun colore letterale); `presentation-sections-v2`
  (AC-402-3: composizione emette recensioni/faq, idempotente, immutabile, re-gate, guard tetto/home-vuota). Migrati
  `site-blocks-data` (selettori v2) + `generation-chooser` (T-232). **Mutazioni 2/2 uccise.** e2e Chromium 30/30, next
  build 0, suite 1669. **Gate visivo: galleria `renderToStaticMarkup` (32 varianti × tema trattoria-rustica), APPROVATO al 1° giro.**
- **NON coperto / dichiarato (L-COL-006, body-a):** (a) il **congelamento** dei `section_layout_id` per-blocco in
  generazione (i 5 mockup che pescano layout di corpo diversi) è di **variety-select** (DV2-503 greedy) — qui c'è il WIRING
  + la composizione di presentazione, non la selezione: su /s/ senza congelamento i blocchi del corpo cadono sul fallback.
  (b) **orari/contatti/header/footer** sono di **body-sections-b**. (c) `withPresentationSections` è agganciato in
  `resolveVariantHome` (card/mockup della home) — l'estensione al documento pubblicato multi-page/pagine interne è dichiarata
  per variety-select/verifica successiva (recensioni non ha comunque pagina propria). (d) La **bellezza** non è oracolabile
  (gate umano fatto). (e) **Foto reali** fuori scope (P4-D7/F): i blocchi rendono `PhotoPlaceholder`/`BodyPhoto` M5.
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

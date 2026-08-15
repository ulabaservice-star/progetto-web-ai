# 00-INDEX — design-engine-v2 · catalogo da Claude Design + varietà greedy

> Mappa del blueprint trueline `design-engine-v2` di Belora/Ulaba (supabase-jsts, Next.js 16 + TS +
> Supabase). Design a monte: `docs/superpowers/specs/2026-08-15-design-engine-v2-design.md`.
> Prosa in italiano, identificatori/nomi-file in inglese. Un modulo = un macrotask (checkpoint al
> confine, commit atomico). Schema task: `references/blueprint/atomic-task-schema.md` (trueline).

## Scopo

Sostituire i blocchi "poveri" della combinatoria di manopole (design-engine-v1.1, **gated dall'utente
come amatoriale**) con un **catalogo di livello professionale tradotto da Claude Design** (progetto
`c1dafc1f-8150-49a6-8c5a-016c2c3b15c5`: **~20 varianti per sezione** + **23 palette**, componenti con
prop `variant` + stessi slot + solo token semantici), preservando **editor inline, sicurezza, mockup
istantanei**. La varietà "5 mockup diversi tra loro" diventa vera via **selezione greedy multi-asse
deterministica**. Gate visivo passato: *"è meglio di Wix"*.

## Mappa dei macrotask

| # | Macrotask | Obiettivo | Dipende da |
|---|---|---|---|
| 01 | `foundation` | Riscrivere `themes.ts` con le 23 palette di CD (token semantici) + allineare `theme-style.ts`/`site.css` ai token CD + primitivi condivisi (Button, SectionHead, Photo-placeholder) a token, escaping React, zero HTML grezzo. | — |
| 02 | `hero` | Tradurre le ~20 varianti hero di CD in `Hero.tsx` (renderer unico, slot editabili, `data-hero-layout` sulla radice del blocco) + ampliare `hero-layouts.ts` ai 20 id. | `foundation` |
| 03 | `menu` | Tradurre le ~20 varianti menu (card-carta su `surface-dark`, leader-dots, prezzi tabular) in `Offerte.tsx` + `section-layouts.ts`. Chiude l'aggancio `vertical` → variante menu. | `foundation` |
| 04 | `body-sections` | Ri-stilare i blocchi **esistenti** chi-siamo/orari/contatti/recensioni/faq/header/footer alle varianti CD → spariscono i vuoti. Recensioni/faq (non alimentate dal Brief) rendono uno **scheletro placeholder** tipografico (copy UI fissa, mai contenuto inventato); la composizione del mockup le emette. | `foundation` |
| 05 | `variety-select` | Riuso dell'aggancio di varietà (da `hero-menu-wow` `fff6904`) + **`recipe_id` come asse della matrice** (DS-V2-D8) + **selezione greedy multi-asse** in `design-select.ts`/`design-matrix.ts` (sostituisce il dedup-per-hero). | `hero`, `menu`, `body-sections` |
| 06 | `e2e-visual-v2` | Gate finale: 5 mockup reali di un seed su `/s/` (computed-style), varietà su hero VISIBILE + ≥1 asse corpo, "wow" strutturale, canary rosso; harness P4. | `variety-select` |

**Build order (DAG):** `foundation → {hero, menu, body-sections} → variety-select → e2e-visual-v2`.
I tre macrotask del corpo (02/03/04) dipendono solo da `foundation` e sono indipendenti fra loro (si
costruiscono in sequenza; `menu` e `hero` toccano `site.css` → un macrotask alla volta evita conflitti).

## ID dei task

Prefisso `DV2-`. Foundation `DV2-1xx`, hero `DV2-2xx`, menu `DV2-3xx`, body-sections `DV2-4xx`,
variety-select `DV2-5xx`, e2e `DV2-6xx`. ID stabili, mai riusati.

## Decision ledger (DS-V2)

- **DS-V2-D1 — Palette da Claude Design.** `themes.ts` riscritto con ≥8 (di fatto 23) palette coese di
  CD, ognuna una personalità (`trattoria-rustica`, `pizzeria-napoletana`, `fine-dining`, `enoteca-scura`,
  …), sostituendo gli 8 temi. La forma `SiteTheme` (Record totale) resta l'interfaccia stabile; il
  vocabolario dei token colore si **estende** ai semantici di CD (`surface-page/alt/card/dark`,
  `ink`/`text-*`, `on-dark*`, `line*`, `accent`/`accent-2`, `eyebrow-color`). I test dei temi si
  aggiornano per **inclusione**, non biiezione (`Set(theme_id) == Set(THEMES)` è l'accoppiamento che
  DS-D3 elimina).
- **DS-V2-D2 — Catalogo ampio.** ~20 varianti per sezione + 23 palette. Materiale abbondante per la
  greedy: nessuna scarsità che "finisca i pezzi" al 3°–4° mockup.
- **DS-V2-D3 — Placeholder ora, foto in P4-D7/F.** I blocchi rendono i placeholder tipografici di CD
  (box con etichetta `FOTO · …`), nessuna risorsa esterna. Le foto reali sono fuori scope.
- **DS-V2-D4 — Selezione greedy multi-asse.** `buildVariants` (design-select.ts) passa dal dedup-per-hero
  a **farthest-first deterministico**: la variante `i` minimizza la somiglianza massima (n. assi in
  comune) con le già scelte; esclusione dura di `hero_layout_id` e `theme_id` finché c'è materiale;
  seminata dal seed (nessun Date/Math.random). Un test pinna: ≥5 hero distinti **e** ≥5 theme per
  vertical, altrimenti `selectDesign` fallisce forte.
- **DS-V2-D5 — Riuso dell'aggancio di varietà.** Da `hero-menu-wow` `fff6904`: `variant-document` congela
  tutti gli assi + `vertical`; `SiteView`/`SiteDesignSelection` proiettano `data-*` e inoltrano
  `design`+`vertical` ai blocchi via `registry`/`SiteBlockProps`. Si scartano i blocchi poveri e il
  refactor illustrazioni.
- **DS-V2-D6 — Trueline + gate visivo.** Un macrotask alla volta con gli oracoli (dead-code, sicurezza,
  RLS, regressioni, conformità-logica) **+ gate visivo umano** (screenshot su `/s/`) al confine di ogni
  sezione. Se una sezione non convince, ci si ferma lì.
- **DS-V2-D7 — Traduzione a componenti React sorgente, non HTML iniettato.** I componenti di CD (inline
  styles + `var()` + `color-mix()`) si traducono in **JSX server** dei nostri blocchi (mai
  `dangerouslySetInnerHTML`, vietato in `src/ui/site/**` da AC-231-4). Gli inline `var()`/`color-mix()`
  non sono colori letterali (lo scanner AC-231-4 cerca hex/rgb/hsl): ammessi; i valori esadecimali
  vivono solo nelle palette (`themes.ts`, dominio, fuori dallo scanner).
- **DS-V2-D8 — `recipe_id` come asse di varietà (emendamento a DS-D3).** In v1.1 la ricetta era
  **contenuto ortogonale** fuori dalla matrice (`design-matrix.ts`: "la matrice NON lo sceglie…
  `recipe_id` resta assente"), attaccata a valle. Su decisione utente v2 la **promuove ad asse**:
  `allowedCombinations(vertical)` attacca un `recipe_id` a ogni combo (≥2 distinti/vertical) e la
  **greedy** (DV2-503) la include nella metrica di distanza → la **copy** varia tra i 5 mockup. La
  ricetta resta uno **stile di copy di catalogo** risolto da `recipeFor` (la matrice sceglie lo stile,
  **non fabbrica testo**; il contenuto reale delle caselle lo scrive l'LLM a runtime, come sempre). Il
  requisito di materiale (DV2-504) pinna anche `recipe_id`. Nuovo task `DV2-502`; la greedy e il
  materiale scalano di ID (503/504).
- **DS-V2-D9 — Inventario assi: la decorazione è intrinseca alle varianti CD, non manopole separate.**
  Il gate v1.1 ha bocciato come **amatoriali** le manopole decorative hand-made (`section_treatment_id`,
  `effect_level`, `ornament_id`, i nastri fatti a mano) + le illustrazioni line-art (già scartate,
  DS-V2-D5). In Claude Design la decorazione (divisori, accenti, micro-motion) è **progettata dentro
  ogni variante**, non un knob ortogonale. Perciò gli **assi di varietà di v2** sono l'insieme
  **esplicito** `{theme_id, hero_layout_id, menu_layout_id, section_layout_id, recipe_id}`: la greedy
  (DV2-503) diversifica **solo** su questi e l'aggancio (DV2-501) congela **solo** questi (+ `vertical`).
  Gli assi decorativi legacy di v1.1 (`section_treatment_id`, `effect_level`, `ornament_id`,
  `ribbon_id`, `illustration_id`) **NON** sono assi di varietà v2: nessun renderer v2 li consuma, la
  greedy li ignora. Restano **inerti** nel tipo `Combo` (rimozione = pulizia separata, fuori scope,
  per non innescare un refactor ampio su matrice+test). Divisori/accenti/motion tasteful (CSP intatta +
  prefers-reduced-motion) vivono **dentro** le varianti CD tradotte nei blocchi (macrotask 02–04), non
  come assi combinatori. **Massima ricchezza:** i moduli traducono **tutte** le varianti disponibili nel
  catalogo CD (non un minimo) — più mattoncini belli = più mockup distinti. **Tetto del wow dichiarato
  (L-COL-006):** con i soli `PhotoPlaceholder` (DS-V2-D3) il wow ha un limite strutturale; la leva #1
  (fotografia reale) resta **P4-D7/F**, fuori da v2.

## Contratto di altitudine (architecture)

design-engine-v2 **non ridichiara** il contratto: riusa quello **globale** già enforced dal repo
(`docs/blueprint/P3-editor/00-INDEX.md §1bis` + `tests/architecture-contract.test.ts`, AH-D6): layers
`ui`/`domain`/`data`/`app`; forbidden `domain→ui/data/app`, `data→ui`. `ui → domain` è **lecito** — i
blocchi importano i cataloghi del dominio (temi/hero-layouts/section-layouts). Cataloghi/matrice/
selettore/schema restano **puri** (nessun React/DB); il render vive in `src/ui/site`.

## Manifest ecosistema

- **Ecosistema attivo:** `supabase-jsts` (Next.js 16 App Router + TypeScript + Supabase).
- **Superficie v2:** ALTA su `src/domain/generation` (temi/cataloghi/selettore) + `src/ui/site` (render
  blocchi/css) + `e2e`; **nessuna nuova tabella/RLS/segreto** (i mockup girano sul documento congelato,
  RLS anon-published già in piedi da P4). Baseline sicurezza attesa **invariata** (2 FP: osv postcss
  MEDIUM + rls anon-policy). Baseline igiene da ri-attribuire al confine (R-04, impronte sensibili alla
  posizione) quando i cataloghi crescono.
- **Deploy-coupling `coupled`:** push su `main` = deploy su `ulaba.net` → merge human-gated anche sul
  verde; verificare in locale (vitest, e2e Chromium, computed-style, `next build`) prima di ogni merge.

## Invarianti (project-start)

Manopole nostre / l'LLM tocca solo il testo a runtime; la varietà è **greedy deterministica**, mai il
modello che sceglie il design; determinismo + freeze versionato (id `nome@N`); renderer unico +
`parseDocument` gate; escaping React, **niente `dangerouslySetInnerHTML` in `src/ui/site/**`**; CSP
intatta + progressive-enhancement + prefers-reduced-motion; **nessun colore letterale** in
`src/ui/site/**` (solo `var(--site-color-*)`/`var(--…)`); `ui → domain` lecito; editor inline (P3)
preservato; git a strati + deploy-coupling coupled; oracle-as-judge + gate visivo umano per la bellezza
(non oracolabile, L-COL-006).

## Moduli

- `01-foundation.md` · `02-hero.md` · `03-menu.md` · `04-body-sections.md` · `05-variety-select.md` ·
  `06-e2e-visual-v2.md` — task atomici (schema trueline). `VISION-AND-CONSTRAINTS.md` per il perché/non-goal.
  `SESSION-STATE.md` per lo stato vivo. `prompts/` per i 3 prompt di lifecycle.

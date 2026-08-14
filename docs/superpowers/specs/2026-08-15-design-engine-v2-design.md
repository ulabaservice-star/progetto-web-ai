# design-engine-v2 — catalogo da Claude Design + varietà greedy

> Design doc a monte (brainstorming architetturale, 2026-08-15). Da questo nasce il blueprint
> trueline `design-engine-v2`. Prosa in italiano, identificatori/nomi-file in inglese.
> Progetto: Belora/Ulaba (supabase-jsts, Next.js 16 + TypeScript + Supabase).

## 1. Perché v2 (motivazione)

`design-engine-v1.1` costruiva la varietà per **combinatoria di manopole nostre** (temi × hero-layout
× trattamenti × effetti × ornamenti) con mattoncini disegnati a mano. Al **gate umano** (screenshot
delle 5 varianti reali su `/s/`) l'utente ha giudicato il risultato **amatoriale**: spazi vuoti fra le
sezioni, corpo (chi-siamo/orari/contatti) come testo impilato, illustrazioni line-art a 2 tratti da
icona, zero fotografia. Diagnosi condivisa: il motore funziona, ma i **mattoncini sono poveri**.

È stato validato un secondo gate su **Claude Design** (`claude.ai/design`, progetto "Design System
Ristoranti Italia", id `a9c624c7-...`): design system professionale — palette calda coerente, tipografia
editoriale (Playfair + Source Sans), 3 hero veri (split/editorial/full), menu-carta su fondo scuro con
leader-dots, componenti React con props, token semantici. Verdetto utente: **"è meglio di Wix, la
strada è quella giusta"**. Unico requisito esplicito: **rendere vera la varietà "5 mockup diversi tra
loro"**.

## 2. L'idea centrale — tre ruoli

- **Claude Design = la fabbrica del catalogo** (build-time): genera molte varianti *belle* per ogni
  sezione + molte palette, già in token semantici. Non gira mai a runtime (nessuna latenza/costo per
  sito, nessun LLM che sceglie il design).
- **Noi = i traduttori**: ogni variante-componente di Claude Design diventa un **blocco strutturato**
  del nostro documento (documento → pagine → blocchi → slot). Qui si preservano **editor inline (P3),
  sicurezza (escaping React, niente HTML grezzo in `src/ui/site/**`, `parseDocument`) e mockup
  istantanei**. I token dei componenti (`var(--surface-page)`, `--accent`, `--font-display`) si mappano
  sui nostri token del tema, proiettati alla radice da `theme-style.ts`.
- **Il motore di varietà (già costruito) = il combinatore**: `variety-engine` + l'aggancio render
  scelgono e combinano struttura × palette × ricetta → 5 mockup distinti *e* belli.

Il contratto invariante resta: **manopole nostre / l'LLM tocca solo il testo dentro caselle validate a
runtime**; determinismo + freeze versionato; renderer unico + gate `parseDocument`; CSP intatta +
progressive-enhancement + prefers-reduced-motion; nessun colore letterale in `src/ui/site/**`;
`ui → domain` lecito (`domain → ui/data/app` e `data → ui` vietati).

## 3. Decisioni chiave

- **DS-V2-D1 — Palette da Claude Design.** Riscriviamo `themes.ts` con **≥8 palette coese generate da
  Claude Design** (ognuna una "personalità" di locale), sostituendo gli 8 temi attuali. La forma
  `SiteTheme` (Record totale di token colore/tipografia/scala/spazio/raggi) resta l'interfaccia stabile
  che il motore consuma; cambia il *contenuto* dei token e, se serve, si **estende il vocabolario dei
  token colore** ai semantici di Claude Design (`surface-page`, `ink`, `ink-70`, `line`, `gold`,
  `basil`, `surface-dark`, `on-dark`, …). La varietà cromatica dei 5 mockup viene da qui.
- **DS-V2-D2 — Catalogo ampio (molte varianti per sezione).** Non "3 hero e 2 menu": chiediamo a Claude
  Design **molte** varianti per ogni sezione (ordine di grandezza ~8–12 hero, ~4–6 menu, ~2–3 per
  chi-siamo/orari/contatti/recensioni/faq, header/footer) + le ≥8 palette. Più mattoncini belli → più
  combinazioni distinte. Il tempo non è il vincolo; la ricchezza sì.
- **DS-V2-D3 — Placeholder ora, foto vere dopo.** Nei mockup teniamo i **placeholder tipografici** di
  Claude Design (box con etichetta `FOTO · …`). Le foto reali (stock/AI, ritocco) restano il macrotask
  **P4-D7/F**, fuori da v2.
- **DS-V2-D4 — Selezione greedy multi-asse (il cuore della varietà).** Vedi §4. Sostituisce il
  dedup-per-hero attuale con una selezione greedy deterministica che, mockup dopo mockup, **massimizza
  la differenza dai precedenti su TUTTI gli assi** (hero, menu, palette, layout-corpo, ricetta),
  escludendo gli assi chiave già usati finché c'è materiale. È l'intuizione dell'utente ("genera il
  secondo tenendo conto del primo ed escludendo ciò che il primo contiene") realizzata come **algoritmo
  di scelta deterministico**, non come chiamate LLM in sequenza.
- **DS-V2-D5 — Riuso dell'aggancio di varietà.** L'aggancio render costruito nel branch
  `hero-menu-wow` (commit `fff6904`) — `variant-document` congela **tutti** gli assi (incl. `vertical`),
  `SiteView`/`SiteDesignSelection` li proiettano come `data-*` alla radice e inoltrano `design`+`vertical`
  ai blocchi via `registry`/`SiteBlockProps` — è **riusato** come fondazione. Si **scartano** i blocchi
  Hero/Offerte "poveri" e il refactor illustrazioni (le foto/placeholder di CD rimpiazzano le scene
  line-art).
- **DS-V2-D6 — Metodo trueline + gate visivo.** Un nuovo blueprint `design-engine-v2`, costruito **un
  macrotask alla volta** con gli oracoli deterministici (security/RLS/dead-code/hygiene) **più un gate
  visivo umano** (screenshot su `/s/`) al confine di ogni sezione. Se una sezione non convince, ci si
  ferma lì.

## 4. La selezione greedy multi-asse (DS-V2-D4)

**Oggi** `buildVariants` (in `design-select.ts`) fa dedup su un solo asse: enumera
`allowedCombinations(vertical)`, mescola col seed, e prende **la prima combinazione di ogni
`hero_layout_id` distinto** → 5 hero diversi. La differenza sul resto è solo un effetto collaterale
(section_layout ancorato all'hero, ricetta a rotazione).

**v2** generalizza a **farthest-first deterministico** su tutti gli assi:

1. `pool = allowedCombinations(vertical)` — ogni combo porta gli assi: `theme_id`, `hero_layout_id`,
   `menu_layout_id`/`section_layout_id`, `recipe_id`, e gli accessori (nastro, ecc.).
2. `rng = mulberry32(hashStringToInt(seed))` — **unica** sorgente di casualità, seminata (nessun
   `Date`/`Math.random`, come oggi).
3. Prima variante: prendi la prima del pool mescolato col seed.
4. Variante `i` (i≥1): fra le combo **non ancora scelte**, prendi quella che **minimizza la somiglianza
   massima** con le già scelte — dove `somiglianza(a,b)` = numero di assi in comune fra `a` e `b`. In
   pratica: la combo "più lontana" da tutte le precedenti. Tie-break deterministico via `rng`.
5. **Esclusione dura** degli assi identitari `hero_layout_id` e `theme_id`: mai riusati finché esistono
   hero/temi liberi (il primo schermo e la palette sono ciò che l'occhio nota per primo). Se il
   materiale finisse prima di 5, l'esclusione si rilassa in ordine (prima gli assi meno visibili) —
   ma con DS-V2-D2 (molte varianti + ≥8 palette) non accade per N=5.
6. **Requisito di materiale**, pinnato da un test: `allowedCombinations` deve offrire ≥5
   `hero_layout_id` distinti **e** ≥5 `theme_id` per ogni `vertical`; altrimenti `selectDesign` **fallisce
   forte** con un errore che nomina il vertical (come già fa oggi), invece di restituire cloni in
   silenzio.

Proprietà: **puro e deterministico** (stessi `vertical`+`seed` → stesse 5 varianti, byte per byte),
**istantaneo** (nessuna attesa/costo di 5 generazioni), **sicuro** (la scelta è manopole nostre, mai il
modello). L'oracolo del gate (§ e2e-nucleo) prova a runtime che le 5 varianti reali divergono su hero
VISIBILE (computed) **e** su ≥1 asse del corpo, con canary rosso.

## 5. Decomposizione in macrotask (build order)

Ogni macrotask chiude con checkpoint (oracoli) **+ gate visivo**.

1. **`foundation`** — riscrittura `themes.ts` con le ≥8 palette di CD (DS-V2-D1) + estensione dei token
   colore/tipografia; allineamento `theme-style.ts` + `site.css` ai token di CD (`--surface-page`,
   `--ink`, `--gold`, `--surface-dark`, …); primitivi condivisi (Button, SectionHead, Photo-placeholder)
   come componenti `src/ui/site` a token, escaping React, nessun HTML grezzo. Aggiorna i molti test che
   pinnano i temi (conteggi, coppie, biiezioni) senza reintrodurre l'accoppiamento che DS-D3 elimina.
2. **`hero`** — traduzione delle N varianti hero di CD in `Hero.tsx` (renderer unico, slot editabili,
   `data-hero-layout` sulla radice del blocco) + riallineamento/ampliamento catalogo `hero-layouts.ts`.
3. **`menu`** — traduzione delle N varianti menu di CD in `Offerte.tsx` (card-carta su `surface-dark`,
   leader-dots, prezzi tabular) + `section-layouts.ts`. Chiude l'aggancio `vertical` → variante menu.
4. **`body-sections`** — chi-siamo, orari, contatti, recensioni, faq, header/footer, ciascuna con le sue
   varianti tradotte → spariscono i vuoti. Possibile decomposizione in 2 sotto-macrotask se troppo grande.
5. **`variety-select`** — l'aggancio di varietà (riuso da `hero-menu-wow`, DS-V2-D5) + la **selezione
   greedy multi-asse** (DS-V2-D4) in `design-select.ts`/`design-matrix.ts`.
6. **`e2e-visual-v2`** — il gate finale: 5 mockup reali di un seed su `/s/` (computed-style), varietà su
   hero VISIBILE + corpo, "wow" strutturale, **canary rosso**; harness P4 (seed, /s/, effect-assertions).

## 6. Rapporto col branch `hero-menu-wow`

Congelato in `fff6904` (branch `trueline/build/hero-menu-wow`, **non mergiato**). Da lì si **riusa**
l'aggancio di varietà (§ DS-V2-D5), via cherry-pick o riscrittura mirata dentro `foundation`/`hero`;
si **scartano** i blocchi poveri e il refactor illustrazioni. `main` resta l'unico ramo pubblicato
(deploy-coupling `coupled`: push su `main` = deploy su `ulaba.net` — merge human-gated anche sul verde).

## 7. Fuori scope / rischi / non coperto

- **Foto reali**: fuori (P4-D7/F). I mockup mostrano placeholder tipografici; il "wow" pieno con foto è
  successivo.
- **La bellezza non è oracolabile** (L-COL-006): gli oracoli provano struttura/sicurezza/varietà; il
  "wow" lo giudica l'utente al gate di ogni sezione.
- **Rifare i temi tocca molto codice a valle** (design-select, matrice, resolve, editor, molti test):
  `foundation` mantiene l'interfaccia `SiteTheme` stabile e aggiorna i test derivando dai cataloghi,
  senza biiezione rigida (inclusione, non `Set(theme_id) == Set(THEMES)`).
- **Materiale sufficiente per la greedy**: coperto da DS-V2-D2 + pinnato dal test di `selectDesign`.
- **Altri verticali**: v2 costruisce il catalogo ristorazione; il motore resta settore-agnostico, gli
  altri settori sono E/E2 nella roadmap.

## 8. Primo passo pratico

Dopo l'approvazione di questo spec: (a) l'utente **amplia il catalogo su Claude Design** (molte varianti
per sezione + ≥8 palette, DS-V2-D2), (b) io lo leggo via **DesignSync** (`list_files`/`get_file`), (c)
avvio **trueline bootstrap** per generare il blueprint `design-engine-v2` con i macrotask di §5 come task
atomici verificabili, (d) build del primo macrotask `foundation`.

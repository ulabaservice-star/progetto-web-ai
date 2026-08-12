# Orchestrazione del motore di generazione — motore visivo (v1) — design

> Design del workstream **QUALITÀ della generazione** di **Belora/Ulaba** (AI website builder,
> Next.js 16 + Supabase). Poggia su P0–P4, tutti completi e verdi su `main`; deploy staging
> privato live su `ulaba.net`. Scope e decisioni chiuse in brainstorming con l'utente il
> 2026-08-12. Prosa in italiano, identificatori/nomi-file in inglese. Questo è il **design**: il
> piano atomico (blueprint) lo genera writing-plans / il bootstrap trueline a valle.
>
> Fonte dei parametri di design: `docs/design-system/ristorazione.md`. Kickoff:
> `docs/design-system/ORCHESTRATION-KICKOFF.md`.

## 1 · Perché siamo qui

Lo smoke test su `ulaba.net` ha provato la pipeline end-to-end, ma le "5 proposte" generate sono
**"1 layout in 5 colori"**: titoli minuscoli, zero spazio, font dei temi non caricati, nessun
hero, nessun effetto. La copy testuale che l'LLM scrive è discreta; è lo **strato di design
visivo** che non esiste.

**Diagnosi confermata leggendo il motore reale:**
- `themes.ts` definisce `scale` (sm…3xl) e `spacing` per ogni tema, ma **nessun blocco legge
  `--site-scale-*`** → i titoli escono alla dimensione di default del browser. `Hero.tsx` mette
  `<h1>` senza font-size.
- I font (`Fraunces`, `Space Grotesk`, `Barlow Condensed`…) sono **dichiarati ma mai caricati** →
  fallback su Georgia/sistema.
- `SiteSection.tsx` avvolge **ogni** blocco (Hero incluso) nella stessa `<section>` con sfondo
  `surface` e `padding: xl` inline → tutto impilato uguale, nessun hero, zero gerarchia.
- Le "5 proposte" = 5 ricette, ognuna legata a **1 tema** (`variant-document.ts` →
  `resolveVariantHome`). Poiché il render è identico, la differenza percepita collassa al **solo
  colore di sfondo**. Le manopole strutturali (hero-layout, varianti-sezione, effetti) **non
  esistono ancora**.

**Obiettivo v1:** un motore che, **senza far disegnare all'LLM**, produce **5 mockup davvero
diversi per ogni utente** — belli per costruzione — partendo dal settore **ristorazione**.

## 2 · Il principio (zero LLM nel design)

Non generiamo il design: lo **selezioniamo e combiniamo** da un catalogo fatto a mano da noi.
L'LLM scrive **solo** la prosa che riempie gli slot; ogni scelta *visiva* la fa il nostro codice.
È l'invariante P2-D1 portata alle conseguenze estreme.

1. **Catalogo curato** (tutto disegnato e vagliato da noi → "impossibile venga brutto"): famiglie
   di temi (palette+font+scala+spazi+raggi), hero-layout, trattamenti-sezione, livelli-effetti,
   ornamenti.
2. **Selettore deterministico** `selectDesign(vertical, seed, variantIndex)` puro: da (settore,
   seed stabile dell'utente, indice 0..4) → una combinazione ammessa.
3. **Matrice di compatibilità**: dichiariamo *noi* quali pezzi stanno insieme; il selettore pesca
   **solo** combinazioni ammesse. Vagliamo le *regole* una volta, non i milioni di output.

Stesso motore, zero LLM nelle scelte visive: utenti diversi vedono siti diversi, e le 5 proposte
di ciascuno sono diverse tra loro.

## 3 · Scope

**In v1 (questo design):**
- **Pelle CSS + font**: i token diventano finalmente dimensioni, spazio, gerarchia reali; font
  self-host caricati.
- **Layer di selezione design ORTOGONALE** alle ricette: cataloghi + matrice + selettore
  combinatorio deterministico.
- **Varietà vera per-utente**: 5 mockup combinati diversi, vincolati dalla matrice, distinti su
  ≥1 asse strutturale.
- **Effetti L0–L4** (inclusa narrativa-scroll L4, selettiva) in CSS + una piccola isola client
  `IntersectionObserver`, con `prefers-reduced-motion` e progressive-enhancement.
- **Ricchezza visiva senza foto utente** + slot-immagine che fanno upgrade all'upload (riuso P4).
- **Settore ristorazione** come primo overlay di catalogo; meccanismo settore-agnostico con
  fallback universale.

**Rimandato (spec successive):**
- **Fix del flusso-intervista** (`update_brief` chiamato in ritardo, prompt debole in
  `interview.ts`) → **spec propria**, subito dopo questa.
- **Split del tema** in palette + tipografia **indipendenti** (v1 tiene i bundle curati per
  armonia garantita).
- **Overlay di catalogo per altri settori** (v1 = ristorazione + universale).
- **Foto/video reali** come motore visivo primario e **immagini stock** (licenze/costi).
- **P5 billing/crediti**, ritocco/sfondi AI, gating a pagamento.

## 4 · Decision ledger (DS-D1…DS-D9)

| ID | Decisione | Scelta | Stato |
|---|---|---|---|
| `DS-D1` | Chi disegna | **Catalogo curato + selettore deterministico + matrice; l'LLM scrive solo testo.** Nessuna scelta visiva al modello (P2-D1 estesa) | chiusa |
| `DS-D2` | Struttura della varietà | **Combinatorio con matrice di compatibilità** (non 5 pacchetti fissi): 5 mockup diversi *per ogni utente*, diversi tra utenti | chiusa |
| `DS-D3` | Dove vivono le manopole | **Layer `design-select` ORTOGONALE** alle ricette. Ricetta = contenuto (sezioni+ordine); nuovo layer = stile. Ricetta **disaccoppiata dal tema** | chiusa |
| `DS-D4` | Congelamento della selezione | **Id versionati nel documento** (`hero_layout_id`, `section_treatment_id`, `effect_level`, `ornament_id?`), non ri-derivati al render → un sito pubblicato non si re-stila mai da solo (come `theme_id`) | chiusa |
| `DS-D5` | Immagini in v1 | **Ricchezza visiva SENZA foto utente** (gradienti, blocchi di colore, pattern, ornamenti, tipografia, spazio); slot-immagine fanno **upgrade all'upload** (riuso P4 M4/M5). Niente stock, zero licenze | chiusa |
| `DS-D6` | Consegna della pelle | **Unico `site.css` globale** agganciato alle classi esistenti dei blocchi + data-attribute; consuma solo `var(--site-*)`. Stili statici inline spostati nel CSS. Scartati: inline-espansi (no keyframe/media-query) e CSS-Modules (scoping inutile) | chiusa |
| `DS-D7` | Font | **Self-host via `next/font`** → `font-src 'self'`, la CSP di `/s/` resta intatta. Scartato `<link>` a Google Fonts (rompe/indebolisce la CSP) | chiusa |
| `DS-D8` | Tetto effetti v1 | **L0–L4** (inclusa narrativa-scroll), ma L4 **selettiva** (concessa dalla matrice a pochi hero-layout), sempre `prefers-reduced-motion` + progressive-enhancement | chiusa |
| `DS-D9` | Confine con l'intervista | **Il fix del flusso-intervista è una spec separata**, subito dopo. Questa spec resta il motore visivo | chiusa |

## 5 · Architettura & moduli

Il layer di selezione design vive nel **dominio puro** (`src/domain/generation/`), accanto a
`themes.ts`/`recipes.ts`: nessun accesso al DB, nessun I/O, nessun side effect, id versionati.

| Modulo | Tipo | Cosa dichiara / fa | Effetto nel render |
|---|---|---|---|
| `themes.ts` | esiste, **cresciuto + disaccoppiato dalla ricetta** | palette+font+scala+spazi+raggi in bundle curati e armoniosi (~6–7 per coprire le famiglie del DB) | `--site-*` alla radice |
| `hero-layouts.ts` | nuovo, puro | hero: centrato · split testo/visual · immagine-piena (placeholder ricco) · asimmetrico (~3–4) | `data-hero-layout` |
| `section-treatments.ts` | nuovo, puro | ritmo sezioni: bande alternate · a-scheda · a-tutta-larghezza (~2–3) | `data-section-treatment` |
| `effects.ts` | nuovo, puro | livelli L0–L4 | `data-effects` + isola client |
| `ornaments.ts` | nuovo, puro (minimo v1) | pochi ornamenti/pattern | `data-ornament` |
| `design-matrix.ts` | nuovo, puro | quali combinazioni sono ammesse (predicato + dati) | — |
| `design-select.ts` | nuovo, puro | `selectDesign(vertical, seed, variantIndex)` → `DesignSelection` | — |

**Confine architetturale (arch-check P3-D7/AH-D6):** cataloghi + matrice + selettore = dominio
puro; CSS/render/isola in `src/ui/site`; serving in `src/app`. **Nessun nuovo accesso-dati,
nessuna nuova tabella o RLS** → superficie di sicurezza bassa rispetto a P4.

**Input della selezione = solo `vertical` (enum controllato del brief) + `seed` deterministico.**
Mai testo libero del brief (`brand_hints` resta escluso, come per il tema): nessun percorso
dall'injection alla scelta visiva.

## 6 · Il selettore deterministico

**`selectDesign(vertical, seed, variantIndex) → DesignSelection`** — funzione **pura** (nessun
I/O, nessun `Date`/`Math.random`, stessi argomenti → stesso risultato), sul modello di
`applyRecipe`.

```
type DesignSelection = {
  recipe_id, theme_id,            // contenuto + linguaggio visivo (bundle armonioso)
  hero_layout_id, section_treatment_id, effect_level, ornament_id?  // stile
}
```
Anche `recipe_id` entra nel draw: il contenuto è un asse della combinatoria, non più fisso per
variante.

**Il seed.** `seed_i = hash(generation_id, variantIndex, regen_count_i)`. Due proprietà insieme:
- **deterministico e riproducibile** → il sito congelato resta congelato, i test sono esatti;
- **unico per utente** (generation_id diverso → draw diverso).

PRNG hash→PRNG puro e stabile (es. `xmur3`→`mulberry32`): nessuna dipendenza esterna, nessuna
sorgente non deterministica.

**Algoritmo del draw (garantisce distinzione + validità di matrice):**
1. Enumera le **combinazioni ammesse** per quel `vertical` (recipe × theme × hero × treatment ×
   effetti, filtrate da `design-matrix.ts`).
2. **Mescola** la lista con il seed di generazione; **variante `i` = `i`-esimo** dello shuffle →
   le 5 sono **mutuamente distinte per costruzione**.
3. **Vincolo anti-"5 colori"**: le 5 devono differire su **almeno un asse strutturale**
   (hero-layout / trattamento / ricetta), **non solo** su tema o effetti.

**Fallback settore.** L'enum reale è `VERTICALS = ['ristorazione', 'fitness', 'salone_studio',
'negozio_artigiano', 'altro']` (`brief.ts`, `z.enum` chiuso e strict → l'input della selezione è
un valore controllato, mai testo libero). In v1 solo `ristorazione` ha l'overlay di catalogo
pieno; gli altri 4 pescano dall'insieme **universale** (pezzi marcati universali). Un test
asserisce che **ogni vertical dell'enum produce ≥5 combinazioni ammesse** (altrimenti il draw a
5-distinti non regge).

**Rigenerazione ("rigenera questa proposta").** Coerente con la copia-su-scrittura per-variante
(P2-D3): si incrementa `regen_count_i`, si ridisegna una combinazione ammessa **non tra le 4
attualmente mostrate**, e si ri-congela il documento di *quella sola* variante.

**Innesto:** in `variant-document.ts` (`resolveVariantHome`), che oggi fa `themeFor(recipe.theme_id)`.
Diventa: `selectDesign(...)` → risolve tema+ricetta dai loro id → compone → `parseDocument` →
congela la tupla completa nel documento.

## 7 · La pelle CSS & i font

**Un unico `src/ui/site/site.css`**, importato una volta dal renderer UNICO (`SiteView`) → copre
card, anteprima e serving `/s/`. Regole agganciate alle **classi che i blocchi hanno già**
(`site-hero__title`, `site-section`, …) più i data-attribute. Colori **solo** `var(--site-color-*)`
→ l'invariante "nessun colore letterale" (AC-231-4) tiene; **il test AC-231-4 si estende a
scansionare anche il `.css`**.

**Il fix n.1, concreto:**
- **Sposto gli stili statici inline dei blocchi dentro `site.css`** (sempre via `var(--site-*)`).
  Resta inline **solo** `siteThemeStyle(theme)` alla radice, che è dinamico.
- **I titoli hanno finalmente dimensione**: `.site-hero__title` prende `--site-scale-3xl`,
  line-height stretta, **tipografia fluida** `clamp(min, viewport, var(--site-scale-3xl))` → scala
  fino a ~150px su desktop, leggibile su mobile. Ritmo verticale reale, gerarchia vera.
- **Il blocco conosce il suo tipo**: aggiungo `data-block-kind` (hero/offerte/…) su `SiteSection`,
  così il CSS distingue l'hero (`.site-section[data-block-kind="hero"] { …full-bleed… }`).
- **La varietà è pura CSS sui data-attribute**: `[data-hero-layout="split"] .site-hero {…}`,
  `[data-section-treatment="bande-alternate"] .site-section:nth-of-type(even) {…}`.

**I font — `src/ui/site/site-fonts.ts`.** Dichiara tutte le famiglie del catalogo via **`next/font`**
a livello di modulo (self-host → `font-src 'self'`). Alla radice si applicano le variabili-font del
tema scelto e si mappa `--site-font-heading: var(--font-fraunces), Fraunces, Georgia, serif` (lo
stack del tema resta fallback). `font-display: swap` + metriche di fallback per contenere il CLS.

## 8 · Effetti L0–L4 & l'isola client

**Livelli** (dal vocabolario del DB): L0 statico · L1 reveal-on-scroll `fadeInUp` staggerato · L2
= L1 + hover raffinati (color-swap, sliding-fill) e micro-transizioni · L3 = + parallax leggero ·
L4 narrativa-scroll. Il livello arriva **congelato** (`effect_level`) → `data-effects` alla radice.

**Divisione del lavoro:**
- **Il CSS fa quasi tutto**: hover, transizioni, keyframe, *stato finale* dei reveal.
- **Una sola isola client — `SiteMotion`** (resa una volta da `SiteView`) guida ciò che serve JS:
  `IntersectionObserver` che aggiunge `.is-visible` a `[data-reveal]` all'ingresso (stagger via
  `transition-delay` per indice); per L3/L4 un driver di scroll throttlato con `requestAnimationFrame`
  che mappa il progresso su `--progress` che il CSS consuma. Solo `transform`/`opacity`
  (compositor-friendly).

**Progressive enhancement (critico):** il contenuto deve essere **visibile anche senza JS**
(crawler, hydration fallita, JS off). Lo stato "nascosto" dei reveal si applica **solo dopo** che
l'isola monta (`.site-motion-ready [data-reveal] { opacity:0; transform:… }`). Prima del mount, o
se l'isola non parte mai, tutto è già visibile. Cruciale per la SEO su `/s/` e per l'affidabilità
dell'artefatto congelato.

**`prefers-reduced-motion: reduce`** è la prima cosa che l'isola controlla: se attiva, **non fa
nulla**, e il CSS forza lo stato finale (nessun `transform`, nessuna animazione).

**CSP & performance:** l'isola è JS **bundlato** (hydration di Next), nessun `<script>` inline → la
CSP di `/s/` non si tocca. Gli observer si attaccano solo se il livello lo richiede e solo a
elementi esistenti. **L4 selettiva** (matrice, mai ovunque). In modalità editor il livello scende a
L0 (editing calmo).

## 9 · Immagini

- **Ricchezza a zero-foto dal nostro catalogo, in CSS**: gradienti derivati da
  `--site-color-accent`/`surface`, blocchi di colore, pattern, ornamenti, tipografia grande, spazio.
  Un hero senza foto **non è mai una scatola grigia** — è un trattamento pieno guidato da
  `data-hero-layout`/`data-ornament`.
- **Lo slot immagine esiste già** (`ImageSlot`, reso da `SiteImage`). L'unica modifica è rendere
  **ricco il placeholder** tramite il trattamento CSS dell'hero-layout.
- **Upgrade all'upload già cablato (P4 M4/M5)**: slot con asset → `SiteImage` ramo `uploaded`
  (`<img src={assetPublicUrl(asset_id)}>`); `ImageUploadPanel` + `setUploadedImage` persistono via
  save-point esistente. **Nessun nuovo canale di scrittura, nessuna nuova RLS.**
- Gli hero-layout orientati-immagine (split, immagine-piena) stanno bene **sia vuoti** (placeholder
  ricco) **sia pieni** (foto utente); la matrice tiene gli effetti compatibili.

## 10 · Il documento congelato (schema)

Estendo `SiteDocumentSchema` (T-202, `document.ts`) per registrare la selezione con **id
versionati**, accanto a `theme_id`/`recipe_id`: `hero_layout_id`, `section_treatment_id`,
`effect_level`, `ornament_id?`.

- **Campi opzionali con default** → i documenti P4 **già pubblicati** continuano a validare e
  rendono con la nuova pelle-base (miglioramento puro, nessuna regressione).
- **`parseDocument` in scrittura E in render** anche sui campi nuovi.
- Ritocchi a catalogo/matrice **alzano la versione** degli id → un sito già scelto o pubblicato
  non si re-stila mai da solo (stessa filosofia di `themes.ts`/`recipes.ts`).

## 11 · Invarianti non negoziabili

- **P2-D1 / anti-injection**: input = `vertical` (enum) + seed; **mai** testo libero del brief. I
  test ostili esistenti (T-241/T-317/T-417) restano verdi; nessun nuovo percorso brief→design.
- **Renderer UNICO (P2-D8)**: card, anteprima, `/s/` da `SiteView`; CSS + data-attribute + isola
  valgono per tutte e tre.
- **Artefatto congelato**: id versionati nel documento; nessun re-stile silenzioso.
- **Layering (arch-check)**: dominio puro vs render vs serving; nessun nuovo accesso-dati.
- **CSP/SEO su `/s/` intatte**: font self-host, isola bundlata, progressive-enhancement
  crawler-safe, JSON-LD invariato.
- **Nessun colore letterale in `src/ui/site/**`** (AC-231-4, esteso al `.css`).
- **PRIMA DI CREDERE A UN VERDE, PROVA CHE LO STRUMENTO SA DIVENTARE ROSSO** (canary).

## 12 · Testing / l'oracolo

La **bellezza NON è oracolabile** (P1 §6-bis): l'oracolo prova **struttura + il difetto
specifico**; l'estetica la giudica l'utente al confine del macrotask (**merge human-gated**).

**Deterministici/strutturali (vitest, puri):**
1. `selectDesign` deterministico (stesso input → stesso output).
2. **Le 5 varianti sono distinte e differiscono su ≥1 asse strutturale** → *pinna il difetto "5
   colori"*.
3. **Property test sulla matrice**: su molti seed/vertical il selettore **non emette mai** una
   combinazione vietata. Fixture con >1 elemento, valori discordanti, un id **prefisso** di un
   altro.
4. **≥5 combinazioni ammesse** per ogni vertical (fallback universale incluso).
5. Igiene catalogo (come themes/recipes): id versionati `nome@N`, nessun id pendente
   cross-catalogo, confronto per uguaglianza esatta, lookup su array (proto-safety).
6. Schema documento: campi nuovi accettati/registrati dal gate, malformati rifiutati, **documenti
   P4 vecchi validano e rendono con default**.
7. Rigenerazione: counter incrementato → selezione **non tra le 4** attualmente mostrate.

**e2e Chromium su `/s/` (l'unico vero oracolo della pelle — jsdom non applica CSS esterno):**
8. `font-size` computato dell'`<h1>` hero **≥ soglia** (il "titoli minuscoli" diventa rosso se
   regredisce); **font di catalogo effettivamente caricato** (non Georgia); due varianti con
   `data-hero-layout` diversi.
9. **Effetti**: reveal aggiunge `.is-visible` allo scroll; con `prefers-reduced-motion` **nessun
   movimento e contenuto visibile**; **contenuto visibile senza JS**.
10. Anti-injection (famiglia T-417) resta verde: brief ostile non altera la selezione design.

Niente screenshot pixel-diff (flaky). Computed-style + strutturali + gate estetico umano.

**Checkpoint trueline** al confine di macrotask (dead-code · sicurezza · regressioni suite intera ·
arch-check) + **batteria di mutazione** (mutazione fatale ripristinata via **backup+sha256**, mai
`git checkout` — il macrotask è uncommitted).

## 13 · Metodo & deploy-coupling

- **Metodo trueline**: writing-plans → build come **dynamic workflow multi-agente per macrotask**
  (builder + verifier BLIND), **oracolo-giudice mai LLM**, fix-loop obbligatorio, human-in-the-loop
  sulle fix. Vedi memoria `dynamic-workflow-build-method`.
- **Deploy-coupling = coupled**: Vercel è connesso al repo → **push su main = deploy in
  produzione**. Si costruisce su branch, si verifica **in locale** (specie e2e + computed-style),
  **merge human-gated**.
- **Un settore alla volta**: si parte da **ristorazione** (DB pronto), poi si replica il metodo.

## 14 · Cosa NON c'è qui, deliberatamente

- **Fix del flusso-intervista** → spec propria (DS-D9).
- **Split tema → palette + tipografia indipendenti** → evoluzione futura (v1: bundle curati).
- **Altri settori** → overlay successivi (v1: ristorazione + universale).
- **Foto/video reali come motore primario, stock imagery** → spec successiva.
- **P5 billing/crediti, ritocco/sfondi AI, gating a pagamento**.

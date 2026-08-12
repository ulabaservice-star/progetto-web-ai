# 00-INDEX — Blueprint design-engine · Motore visivo di generazione di Belora/Ulaba

> Mappa, piano di build, decision ledger e manifest del workstream **QUALITÀ della generazione**
> (motore visivo) del progetto Belora/Ulaba (AI website builder, Next.js 16 + Supabase). Generato in
> modalità BOOTSTRAP dalla skill *trueline*. **Nessun codice**: solo il piano. Fonte dell'intento:
> `docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md`.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Workstream** | design-engine — motore visivo di generazione (v1), settore ristorazione |
| **Poggia su** | P0…P4 — **tutti completi e verdi su `main`** — più i pass `architecture-hardening` (gate `architecture:` repo-wide) e `deploy-hardening` (staging privato live su `ulaba.net`, CSP su `/s/`) |
| **Ingresso** | Il motore di generazione esistente: `themes.ts`/`recipes.ts` (5+5), `variant-document.ts` (`resolveVariantHome`), `SiteView`/`SiteSection`/blocchi + `theme-style.ts` (token definiti ma non consumati) |
| **Uscita** | 5 mockup **davvero diversi per-utente** — belli per costruzione, senza LLM nel design — con pelle CSS reale, font caricati, hero-layout/trattamenti/effetti L0–L4, id di selezione **congelati** nel documento |
| **Schema task** | schema atomico trueline (`L-COL-019`): definition_of_done + acceptance_criteria + target_tests |

---

## 1. Mappa dei macrotask

| # | File | Macrotask | Cosa costruisce |
|---|---|---|---|
| 01 | `01-visual-skin.md` | `visual-skin` | **La fondazione**: unico `site.css` globale che consuma i token (scala/spazio, tipografia fluida), stili statici inline spostati nel CSS + `data-block-kind` (hero distinto), **font self-host** `next/font` (CSP intatta), **placeholder ricco** non-fotografico. Rende un mockup *disegnato* con tema/ricetta esistenti |
| 02 | `02-design-select.md` | `design-select` | **Il cuore combinatorio**: cataloghi puri (hero-layout, trattamenti-sezione, effetti, ornamenti; temi cresciuti+disaccoppiati), **matrice di compatibilità**, **selettore deterministico** `selectDesign` (5 varianti distinte per-utente, matrice mai violata), **freeze** degli id nel documento, wiring in `variant-document`, CSS delle varianti |
| 03 | `03-effects-runtime.md` | `effects-runtime` | **Gli effetti L0–L4**: CSS (stato finale/hover, keyframe) + **isola client** `SiteMotion` (`IntersectionObserver`, driver rAF per L3/L4), **progressive-enhancement** (contenuto visibile senza JS) + **prefers-reduced-motion**, nessuno `<script>` inline |
| 04 | `04-e2e-visual.md` | `e2e-visual` | **La prova di punta**: e2e Chromium su `/s/` — pelle (font-size hero pinna "titoli minuscoli") + varietà (hero-layout distinti) + effetti (reveal/reduced-motion/no-JS) + anti-injection (documento ostile → design invariato) + **canary ROSSO** |

## 1bis. Contratto di altitudine (repo-wide — già attivo)

Il contratto `architecture:` non è una novità di design-engine: è **attivato in P3** (P3-D7) e reso
**repo-wide** dal pass `architecture-hardening` (AH-D6, `0` archi `forbidden`). L'**enforcement** vive
nel gate versionato `tests/architecture-contract.test.ts` (alias-aware, repo-wide), che carica il
contratto dalla sua fonte unica in `docs/blueprint/P3-editor/00-INDEX.md` §1bis. Lo dichiariamo
**anche qui** perché `validate_blueprint` valida la forma del blocco sulla dir design-engine
(check `(6)`): è lo **stesso** contratto, non una seconda fonte di verità.

design-engine aderisce senza eccezioni: i **cataloghi + matrice + selettore + schema documento** sono
**logica pura** in `src/domain`; il **CSS/render/font/isola client** stanno in `src/ui/site`. Nessun
accesso dati nuovo, nessuna nuova tabella/RLS. Nessun arco `forbidden`.

```yaml
architecture:
  layers:
    ui: "src/ui/**"
    domain: "src/domain/**"
    data: "src/data/**"
    app: "src/app/**"
  forbidden:
    - { from: domain, to: ui }
    - { from: domain, to: data }
    - { from: domain, to: app }
    - { from: data, to: ui }
```

## 2. Piano di build (ordine topologico del DAG)

Il DAG dei `depends_on` è **interno a design-engine**; P0…P4, `architecture-hardening` e
`deploy-hardening` sono substrati già costruiti, referenziati in prosa nei moduli e **non** nel DAG,
così `validate_blueprint` resta pulito sulla dir design-engine.

```
visual-skin
 ├─ DE-101 site.css globale + consumo token scala/spazio + tipografia fluida hero      [ ]
 ├─ DE-102 stili statici inline → css + data-block-kind (hero distinto)                 [DE-101]
 ├─ DE-103 font self-host next/font mappati a --site-font-* (CSP intatta)               [DE-101]
 └─ DE-104 placeholder ricco non-fotografico (branch uploaded invariato)                [DE-101]

design-select
 ├─ DE-201 cataloghi puri: hero-layouts, section-treatments, effects, ornaments         [ ]
 ├─ DE-202 THEMES cresciuti (>=6) e disaccoppiati dalla ricetta                          [ ]
 ├─ DE-203 design-matrix: isAllowed / allowedCombinations (>=5 per ogni vertical)        [DE-201, DE-202]
 ├─ DE-204 design-select: selettore deterministico seminato (5 distinte, matrice ok)     [DE-203]
 ├─ DE-205 schema documento: freeze id di selezione (opzionali con default)              [ ]
 ├─ DE-206 wiring variant-document: selectDesign → congela la tupla                      [DE-204, DE-205]
 └─ DE-207 CSS varianti hero-layout + section-treatment (data-attribute congelati)       [DE-206, DE-101]

effects-runtime
 ├─ DE-301 CSS effetti L0–L4: stato finale/hover, progressive-enhancement, reduced-motion [DE-101]
 └─ DE-302 isola client SiteMotion (IntersectionObserver, gating, editable→L0)           [DE-301, DE-206]

e2e-visual
 └─ DE-401 e2e Chromium su /s/: pelle + varietà + effetti + anti-injection + canary rosso [DE-101, DE-206, DE-207, DE-302]
```

**Ordine dei macrotask:** `visual-skin` → `design-select` → `effects-runtime` → `e2e-visual`. Ogni
macrotask si chiude al suo confine col checkpoint (dead-code · sicurezza · regressioni ·
conformità-logica sui `target_tests`), poi commit atomico sul branch (`L-COL-024`); merge su `main`
gated dal verde **e** dal deploy-coupling `coupled` (**human-gated anche sul verde**: Vercel è
connesso al repo → push su `main` = deploy in produzione — vedi `SESSION-STATE` §3).

**Nota sui `covers:` nei file di test.** In BUILD col controllo 4 attivo (`--blueprint`), ogni blocco
di test che esercita un AC porta `// covers: AC-DE-xxx-n`: un AC non tracciato rende il controllo 4
rosso prima di eseguire. Convenzione del file di test, non campo del blueprint.

## 3. Aggancio alla sicurezza (`07`)

design-engine è a **bassa superficie di sicurezza** rispetto a P4: **nessuna nuova tabella, nessuna
nuova RLS, nessun nuovo accesso dati, nessun byte non fidato nuovo**. I punti di attenzione sono tre,
tutti su invarianti già stabilite:

- **Anti-injection (DS-D1, P2-D1)**: l'input della selezione design è `brief.vertical` (enum chiuso
  `z.enum`, `brief.ts`) + un `seed` derivato dall'id di generazione — **mai** testo libero del brief
  (`brand_hints` escluso, come per il tema). Non esiste percorso dal testo del brief alla scelta
  visiva: un'iniezione riuscita nel brief non può alterare l'aspetto del sito. Provato in DE-204
  (unit) e DE-401 (e2e ostile).
- **Documento come input non fidato (P2/P4)**: `parseDocument` resta il gate **in scrittura e in
  render** anche sui campi di selezione nuovi (DE-205); un documento malformato (`effect_level` fuori
  L0–L4) cade tutto. Il `SiteView` resta a escaping React (nessun `dangerouslySetInnerHTML`, nessun
  `src/href` da testo libero: URL asset da `asset_id`, P2-D12/P4).
- **CSP di `/s/` (deploy-hardening T-3)**: i font sono **self-host** (`next/font` → `font-src 'self'`,
  DE-103) e l'isola effetti è **JS bundlato** (nessuno `<script>` inline, DE-302) → la CSP non si
  allarga. Provato in DE-103 e DE-302/DE-401.
- **Prova sull'EFFETTO + canary (L-COL-006)**: DE-401 estende `assertNoInjectionEffect` alla superficie
  del motore visivo con **canary rosso** — il verde vale solo perché il canary sa fallire.
- **Altitudine (gate repo-wide)**: dominio puro vs `src/ui/site`; nessun arco `forbidden` (§1bis).

## 4. Decision ledger

> Le decisioni si modificano SOLO con emendamento esplicito registrato qui. `DS-D1`…`DS-D9` vengono
> dal design approvato del 2026-08-12 (§3 della spec), in forma compatta: la motivazione integrale
> sta nella spec.

| ID | Decisione | Scelta | Stato |
|---|---|---|---|
| `DS-D1` | Chi disegna | **Catalogo curato + selettore deterministico + matrice; l'LLM scrive solo testo.** Nessuna scelta visiva al modello (P2-D1 estesa) | chiusa |
| `DS-D2` | Struttura della varietà | **Combinatorio con matrice di compatibilità** (non 5 pacchetti fissi): 5 mockup diversi *per ogni utente*, diversi tra utenti | chiusa |
| `DS-D3` | Dove vivono le manopole | **Layer `design-select` ORTOGONALE** alle ricette. Ricetta = contenuto; nuovo layer = stile. Ricetta **disaccoppiata dal tema** | chiusa |
| `DS-D4` | Congelamento della selezione | **Id versionati nel documento** (`hero_layout_id`, `section_treatment_id`, `effect_level`, `ornament_id?`), non ri-derivati al render → un sito pubblicato non si re-stila mai da solo | chiusa |
| `DS-D5` | Immagini in v1 | **Ricchezza visiva SENZA foto utente** (gradienti/blocchi di colore/pattern/ornamenti/tipografia/spazio); slot-immagine fanno **upgrade all'upload** (riuso P4 M4/M5). Niente stock, zero licenze | chiusa |
| `DS-D6` | Consegna della pelle | **Unico `site.css` globale** agganciato alle classi esistenti + data-attribute; consuma solo `var(--site-*)`. Stili statici inline spostati nel CSS. Scartati: inline-espansi (no keyframe/media-query) e CSS-Modules | chiusa |
| `DS-D7` | Font | **Self-host via `next/font`** → `font-src 'self'`, la CSP di `/s/` resta intatta. Scartato `<link>` a Google Fonts | chiusa |
| `DS-D8` | Tetto effetti v1 | **L0–L4** (inclusa narrativa-scroll), L4 **selettiva** (matrice), sempre `prefers-reduced-motion` + progressive-enhancement | chiusa |
| `DS-D9` | Confine con l'intervista | **Il fix del flusso-intervista è una spec/blueprint separati**, subito dopo. Questo workstream resta il motore visivo | chiusa |

### Emendamenti al ledger

- (nessuno finora)

## 5. Fonti di verità

- **Piano**: questo blueprint (`00-INDEX` + moduli `01-visual-skin` … `04-e2e-visual`).
- **Design a monte**: `docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md`.
- **Database parametri di design**: `docs/design-system/ristorazione.md` (bussola del catalogo);
  kickoff `docs/design-system/ORCHESTRATION-KICKOFF.md`.
- **Stato vivo**: `SESSION-STATE.md` (fonte di verità del workstream design-engine — distinta da
  quelle di P0…P4, di `architecture-hardening`, `deploy-hardening` e della skill trueline).
- **Contratto `architecture:`**: `docs/blueprint/P3-editor/00-INDEX.md` §1bis (fonte unica);
  enforcement `tests/architecture-contract.test.ts` (repo-wide).
- **Substrato**: `src/domain/generation/` (`themes.ts`, `recipes.ts`, `document.ts`,
  `variant-document.ts`, `theme-style.ts`), `src/ui/site/` (`SiteView`, `SiteSection`, `SiteImage`,
  blocchi, `theme-style.ts`), l'harness e2e P4 (`e2e/seed.ts`, `hostile-brief.ts`,
  `assertNoInjectionEffect`), `assetPublicUrl`/`SITE_ASSETS_BUCKET` (`src/config/storage.ts`).

## 6. Self-check del blueprint

- **Strutturale**: `node <trueline>/scripts/blueprint/validate_blueprint.mjs docs/blueprint/design-engine`
  — atteso exit 0 (`11` §5.1): campi obbligatori, copertura AC→test, DAG aciclico, id univoci,
  ownership del macrotask, contratto `architecture:` ben formato (check `(6)`).
- **Semantico**: `self-check-checklist.md` punti 6–10 su ogni task (`11` §5.2); rilievi →
  human-in-the-loop.

## 7. Fuori scope di design-engine v1 (rimandato)

- **Fix del flusso-intervista** (`update_brief` in ritardo, prompt debole in `interview.ts`) →
  spec/blueprint propri, subito dopo (DS-D9).
- **Split del tema** in palette + tipografia **indipendenti** → evoluzione futura (v1: bundle curati
  per armonia garantita).
- **Overlay di catalogo per altri settori** (fitness/salone_studio/negozio_artigiano) → successivi
  (v1: ristorazione + fallback universale).
- **Foto/video reali come motore visivo primario** e **immagini stock** (licenze/costi) → spec
  successiva (v1: ricchezza non-fotografica + upgrade all'upload, DS-D5).
- **P5 billing/crediti, ritocco/sfondi AI, gating a pagamento**.

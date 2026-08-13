# 00-INDEX — Blueprint design-engine-v1.1 · "wow, meglio di Wix"

> Mappa, piano di build, decision ledger e manifest del secondo giro del **motore visivo di
> generazione** di Belora/Ulaba (AI website builder, Next.js 16 + Supabase). Generato in modalità
> BOOTSTRAP dalla skill *trueline*. **Nessun codice di prodotto**: solo il piano. Fonte
> dell'intento: `docs/superpowers/specs/2026-08-13-design-engine-v1.1-design.md`.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Workstream** | design-engine-v1.1 — motore visivo "wow, meglio di Wix", settore ristorazione |
| **Poggia su** | **design-engine v1** (completo e verde su `main`: `site.css`, `design-select`, `effects-runtime`, `e2e-visual`) + P0…P4 + `architecture-hardening` + `deploy-hardening` (staging privato live su `ulaba.net`, CSP su `/s/`) |
| **Ingresso** | Il motore v1: `themes.ts`/`recipes.ts`, `design-catalog`/`hero-layouts`/`section-treatments`/`effects`/`ornaments`, `design-matrix`/`design-select`, `document.ts`/`variant-document.ts`, `SiteView`+blocchi + `site.css` + `site-fonts.ts` + `SiteMotion.tsx`, harness e2e P4 |
| **Uscita** | 5 mockup **"wow, meglio di Wix"** e **davvero diversi** (layout editoriali, illustrazioni SVG, sezioni ricche): DNA di settore FISSO + varietà su ~7 assi VISIBILI (hero + corpo), senza LLM a runtime, deterministico, CSP intatta, editabile, id di selezione **congelati** |
| **Schema task** | schema atomico trueline (`L-COL-019`): definition_of_done + acceptance_criteria + target_tests |

---

## 1. Mappa dei macrotask

| # | File | Macrotask | Cosa costruisce |
|---|---|---|---|
| 01 | `01-editorial-skin.md` | `editorial-skin` | **La pelle editoriale (DNA fisso)**: `THEMES` arricchiti (regole tipografiche display/corpo, tracking, tabular-nums, italic per asse; palette estesa crema/panna/rosso-mattone/oro/verde-basilico/ink + superficie scura per-tema); **font display self-host** (didone `next/font`, CSP intatta); regole tipografiche editoriali in `site.css` (display, label tracked, leader-dots, «», corpo lh 1.65, ritmo); **sistema illustrazioni SVG** `illustrations.ts` (dominio puro, `<symbol>` + `currentColor`) + core set ristorazione |
| 02 | `02-variety-engine.md` | `variety-engine` | **Il motore di varietà (~7 assi)**: `hero-layouts` ricchi (2-col asimmetrico) + asse **trattamento-H1**; `section-layouts` ricchi (chi-siamo/orari/contatti/menu come layout veri) + **nastri**; `design-matrix` aggiornata (≥5 scheletri VISIBILMENTE distinti/vertical); `design-select` **pluggabile** (`signals?` — Piano B predisposto, DS-D14) + distinzione rafforzata; **freeze** dei nuovi assi nel documento |
| 03 | `03-hero-menu-wow.md` | `hero-menu-wow` | **Il NUCLEO + GATE** (DS-D15): `Hero` ricco (assi + illustrazione + badge + CTA + meta/chip) e `Menu` ricco (card-carta su fondo scuro, leader-dots, doppia cornice); **e2e-nucleo** (`e2e/visual-engine-v11.spec.ts`): 5 varianti REALI di un seed divergono su hero VISIBILE + corpo (computed) + wow strutturale + **canary rosso** |
| 04 | `04-section-inventory.md` | `section-inventory` | **L'inventario completo ristorazione**: `ChiSiamo` (2 varianti), `Orari` (tabella + card sun/moon, giorno-corrente dall'isola), `Contatti` (mappa SVG + fondale marrone/verde), footer + restanti assi accessori (FAB/marquee/orbitanti/drop-cap) + libreria SVG ristorazione completa |
| 05 | `05-e2e-visual-v11.md` | `e2e-visual-v11` | **La prova verticale**: `e2e/visual-engine-v11.spec.ts` esteso — 5 mockup davvero diversi end-to-end su TUTTE le sezioni, tutti i blocchi ricchi resi, **anti-injection** (documento ostile → selezione invariata + effetto nullo, harness P4), **canary rosso** |

## 1bis. Contratto di altitudine (repo-wide — già attivo)

Il contratto `architecture:` non è una novità di v1.1: è **attivato in P3** (P3-D7) e reso
**repo-wide** dal pass `architecture-hardening` (AH-D6, `0` archi `forbidden`). L'**enforcement**
vive nel gate versionato `tests/architecture-contract.test.ts` (alias-aware, repo-wide), che carica
il contratto dalla sua fonte unica in `docs/blueprint/P3-editor/00-INDEX.md` §1bis. Lo dichiariamo
**anche qui** perché `validate_blueprint` valida la forma del blocco sulla dir del blueprint
(check `(6)`): è lo **stesso** contratto, non una seconda fonte di verità.

design-engine-v1.1 aderisce senza eccezioni: i **cataloghi (hero-layouts/section-layouts/
illustrations) + matrice + selettore + schema documento** sono **logica pura** in `src/domain`; i
**font, il CSS, i blocchi e l'isola client** stanno in `src/ui/site`. Nessun accesso dati nuovo,
nessuna nuova tabella/RLS. Nessun arco `forbidden`.

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

Il DAG dei `depends_on` è **interno a design-engine-v1.1**; design-engine v1, P0…P4,
`architecture-hardening` e `deploy-hardening` sono substrati già costruiti, referenziati in prosa
nei moduli e **non** nel DAG, così `validate_blueprint` resta pulito sulla dir del blueprint.

```
editorial-skin
 ├─ DE11-101 THEMES arricchiti: tipografia editoriale + palette estesa + superficie scura         [ ]
 ├─ DE11-102 font display self-host (didone next/font → --site-font-display, CSP intatta)          [DE11-101]
 ├─ DE11-103 regole tipografiche editoriali in site.css (display/label/leader-dots/«»/lh/ritmo)    [DE11-101, DE11-102]
 └─ DE11-104 sistema illustrazioni SVG (illustrations.ts dominio puro + core set ristorazione)     [ ]

variety-engine
 ├─ DE11-201 hero-layouts ricchi (2-col asimmetrico) + asse trattamento-H1                         [DE11-101, DE11-104]
 ├─ DE11-202 section-layouts ricchi (chi-siamo/orari/contatti/menu) + nastri                       [DE11-101]
 ├─ DE11-203 design-matrix aggiornata (>=5 scheletri VISIBILMENTE distinti/vertical)               [DE11-201, DE11-202]
 ├─ DE11-204 design-select pluggabile (signals? — Piano B predisposto) + distinzione rafforzata    [DE11-203]
 └─ DE11-205 freeze schema documento (nuovi assi opzionali con default, parseDocument gate)        [DE11-201, DE11-202]

hero-menu-wow  (NUCLEO + GATE, DS-D15)
 ├─ DE11-301 Hero blocco ricco (assi + illustrazione + badge + CTA + meta/chip)                    [DE11-103, DE11-201, DE11-204, DE11-205]
 ├─ DE11-302 Menu blocco ricco (card-carta fondo scuro, leader-dots, doppia cornice)               [DE11-103, DE11-202, DE11-205]
 └─ DE11-303 e2e-nucleo GATE: 5 varianti reali divergono hero VISIBILE + corpo (computed) + canary [DE11-301, DE11-302]

section-inventory
 ├─ DE11-401 ChiSiamo ricco (2 varianti: feature-side+drop-cap | illustrazione-ruotata+feature-row) [DE11-202, DE11-303]
 ├─ DE11-402 Orari ricco (tabella + card sun/moon; giorno-corrente dall'isola, PE)                  [DE11-202, DE11-303]
 ├─ DE11-403 Contatti ricco (righe + mappa SVG; fondale marrone|verde; card-mappa ruotata)          [DE11-202, DE11-104, DE11-303]
 └─ DE11-404 footer + restanti assi accessori + libreria SVG ristorazione completa                  [DE11-202, DE11-104, DE11-303]

e2e-visual-v11
 └─ DE11-501 e2e verticale: 5 mockup diversi su tutte le sezioni + blocchi ricchi + anti-inj + canary [DE11-401, DE11-402, DE11-403, DE11-404]
```

**Ordine dei macrotask:** `editorial-skin` → `variety-engine` → `hero-menu-wow` (nucleo/gate) →
`section-inventory` → `e2e-visual-v11`. Ogni macrotask si chiude al suo confine col checkpoint
(dead-code · sicurezza · regressioni · conformità-logica sui `target_tests`), poi commit atomico
sul branch (`L-COL-024`); merge su `main` gated dal verde **e** dal deploy-coupling `coupled`
(**human-gated anche sul verde**: Vercel è connesso al repo → push su `main` = deploy su
`ulaba.net` — vedi `SESSION-STATE` §3). **Il nucleo (`hero-menu-wow`) è il gate di validazione
dell'intero approccio** (DS-D15): se le 5 varianti reali non risultano davvero diverse e belle, ci
si ferma lì (eventuale Piano B, §DS-D14) prima di costruire l'inventario completo.

**Nota sui `covers:` nei file di test.** In BUILD col controllo 4 attivo (`--blueprint`), ogni
blocco di test che esercita un AC porta `// covers: AC-DE11-xxx-n`: un AC non tracciato rende il
controllo 4 rosso prima di eseguire. Convenzione del file di test, non campo del blueprint.

## 3. Aggancio alla sicurezza (`07`)

design-engine-v1.1 è a **bassa superficie di sicurezza** come v1: **nessuna nuova tabella, nessuna
nuova RLS, nessun nuovo accesso dati, nessun byte non fidato nuovo**. I punti di attenzione sono
sugli invarianti già stabiliti (spec §12):

- **Anti-injection (DS-D1/P2-D1)**: l'input della selezione è `brief.vertical` (enum chiuso
  `z.enum`, `brief.ts`) + un `seed` derivato dall'id di generazione (+ eventuali **segnali
  derivati** per il Piano B, sempre ri-validati) — **mai** testo libero del brief. Un'iniezione
  riuscita nel brief può al massimo produrre **un'altra combinazione VALIDA**, mai iniettare
  codice. Provato in DE11-204 (unit/property) e DE11-303/DE11-501 (e2e ostile).
- **Documento come input non fidato (P2/P4)**: `parseDocument` resta il gate **in scrittura e in
  render** anche sui nuovi campi di selezione (DE11-205); un id di asse fuori catalogo/forma fa
  cadere tutto. `SiteView` resta a escaping React (nessun `dangerouslySetInnerHTML` su input non
  fidato; nessun `src/href` da testo libero: URL asset da `asset_id`, P2-D12/P4).
- **Illustrazioni SVG (DS-D11)**: SVG **statici del catalogo** (costanti del codice), mai da testo
  utente; iniettati dal renderer unico; icone via `currentColor`; **nessuna risorsa esterna**
  (coerente con la CSP di `/s/`). Provato in DE11-104 e DE11-404.
- **CSP di `/s/` (deploy-hardening T-3)**: i font display sono **self-host** (`next/font` →
  `font-src 'self'`, DE11-102) e l'isola effetti/giorno-corrente è **JS bundlato** (nessuno
  `<script>` inline; marquee/nastri sono CSS puro, DE11-402/DE11-404) → la CSP non si allarga.
- **Determinismo a runtime**: nessun `Date`/`Math.random` nel Piano A. Il "giorno corrente" degli
  orari è un effetto client dell'isola, **fuori dal documento congelato** (DE11-402).
- **Prova sull'EFFETTO + canary (L-COL-006)**: DE11-303 e DE11-501 estendono
  `assertNoInjectionEffect` alla superficie del motore visivo v1.1 con **canary rosso** — il verde
  vale solo perché il canary sa fallire.
- **Altitudine (gate repo-wide)**: dominio puro vs `src/ui/site`; nessun arco `forbidden` (§1bis).

## 4. Decision ledger

> Le decisioni si modificano SOLO con emendamento esplicito registrato qui. `DS-D10`…`DS-D15`
> vengono dalla spec del 2026-08-13 (§4), in forma compatta; `DS-D1`…`DS-D9` restano nel design v1
> (`docs/blueprint/design-engine/00-INDEX.md` §4) e sono confermate.

| ID | Decisione | Scelta | Stato |
|---|---|---|---|
| `DS-D10` | Dove vive la varietà | **~7 assi ricchi e VISIBILI distribuiti su tutta la pagina** (hero + corpo), non 2 assi deboli/locali. Vincolo di distinzione rafforzato: le 5 divergono sull'asse visibile dell'hero E nel corpo | chiusa |
| `DS-D11` | Immagini (emenda DS-D5) | **Zero-foto = libreria di ILLUSTRAZIONI SVG di catalogo**, tematizzabili via `currentColor` (sistema `<symbol>`+`<use>`), non solo gradienti. Generate build-time, curate da noi | chiusa |
| `DS-D12` | Chi disegna (estende DS-D1) | **Catalogo zero-LLM a RUNTIME**; **Kimi K3 usato BUILD-TIME** per costruire il catalogo, MAI a runtime | chiusa |
| `DS-D13` | Font | **Self-host via `next/font`** (CSP-safe) con **regole editoriali**: serif didone SOLO per display, sans per corpo, tracking sulle label, italic, `tabular-nums`. NON stack di sistema | chiusa |
| `DS-D14` | La selezione è pluggabile | **`selectDesign` = interfaccia** (input: vertical+seed+segnali; output: tupla di assi validata dalla matrice). Piano A = selettore deterministico PRNG. **Piano B** = LLM orchestratore che restituisce la STESSA tupla (structured output dal catalogo, NON HTML). Matrice + `parseDocument` contengono l'anti-injection. **In v1.1 solo l'interfaccia è predisposta (signals?), il Piano B NON è implementato** | chiusa |
| `DS-D15` | Ordine di build | **Nucleo di varietà (hero+menu) validato PRIMA** dell'inventario completo | chiusa |

### Emendamenti al ledger

- **`DS-D11-a` (chiarimento di blueprint — risolve il nodo aperto §12 della spec):** il divieto di
  **colore letterale** resta **scoped a `src/ui/site/**`** (AC-231-4, esteso al `.css`).
  `illustrations.ts` vive in `src/domain/generation` (asset di design, non stile di layout) →
  è **naturalmente fuori** dallo scanner per posizione. Le scene SVG possono contenere hex
  coordinati con la palette; le icone usano `currentColor`. **Nessuna estensione dello scanner al
  dominio** (lo scanner non insegue asset di design). Motivo: gli SVG sono contenuto-dato di
  catalogo, non fogli di stile; estendere lo scanner a `src/domain` gonfia i falsi positivi senza
  aggiungere garanzia (i colori dei layout restano `var(--site-color-*)` in `src/ui/site`).

## 5. Fonti di verità

- **Piano**: questo blueprint (`00-INDEX` + moduli `01-editorial-skin` … `05-e2e-visual-v11`).
- **Design a monte**: `docs/superpowers/specs/2026-08-13-design-engine-v1.1-design.md` (v1.1) e
  `docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md` (v1, ledger DS-D1…DS-D9).
- **Database parametri di design**: `docs/design-system/ristorazione.md` (bussola del catalogo);
  riferimenti "wow" build-time (non versionati): `scratchpad/kimi-1.html`, `scratchpad/kimi-2.html`.
- **Stato vivo**: `SESSION-STATE.md` (fonte di verità del workstream v1.1 — distinta da quelle di
  P0…P4, di design-engine v1, di `architecture-hardening`, `deploy-hardening` e della skill trueline).
- **Contratto `architecture:`**: `docs/blueprint/P3-editor/00-INDEX.md` §1bis (fonte unica);
  enforcement `tests/architecture-contract.test.ts` (repo-wide).
- **Substrato v1**: `src/domain/generation/` (`themes.ts`, `hero-layouts.ts`,
  `section-treatments.ts`, `effects.ts`, `ornaments.ts`, `design-matrix.ts`, `design-select.ts`,
  `document.ts`, `variant-document.ts`), `src/ui/site/` (`SiteView`, `SiteSection`, `SiteImage`,
  `SiteMotion`, blocchi, `site.css`, `site-fonts.ts`, `theme-style.ts`), l'harness e2e P4
  (`e2e/support/seed.ts`, `e2e/fixtures/hostile-brief.ts`, `e2e/support/effect-assertions.ts`),
  `assetPublicUrl`/`SITE_ASSETS_BUCKET` (`src/config/storage.ts`).

## 6. Self-check del blueprint

- **Strutturale**: `node <trueline>/scripts/blueprint/validate_blueprint.mjs
  docs/blueprint/design-engine-v1.1` — atteso exit 0 (`11` §5.1): campi obbligatori, copertura
  AC→test, DAG aciclico, id univoci, ownership del macrotask, contratto `architecture:` ben formato
  (check `(6)`).
- **Semantico**: `self-check-checklist.md` punti 6–10 su ogni task (`11` §5.2); rilievi →
  human-in-the-loop.

## 7. Fuori scope di design-engine-v1.1 (rimandato)

- **Piano B costruito** (orchestratore LLM a runtime): solo **predisposto** come interfaccia
  (`signals?`, DS-D14); si costruisce se il Piano A non convince al gate del nucleo.
- **Altri settori** (workstream E): il metodo build-time con Kimi K3 si replica per fitness,
  bellezza, ecc. dopo ristorazione.
- **Foto reali** (F), **split-tema** (G), **P5+** (billing/crediti, ritocco/sfondi AI, gating a
  pagamento).
- **Cambio del modello di generazione a runtime**: Kimi resta build-time; la generazione dei
  mockup a runtime resta il motore zero-LLM esistente.

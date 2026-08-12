# VISION & CONSTRAINTS — Belora/Ulaba · design-engine (motore visivo di generazione)

> Perché questo workstream esiste, per chi, cosa NON fa, e i vincoli. Input dall'utente e dalla spec
> approvata (`docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md`), non invenzione
> dell'LLM. Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Owner / stakeholder** | Fondatore non tecnico; costruisce con Claude Code (priorità: managed, bassa manutenzione, task atomici) |

---

## 1. Perché esiste (problema)

Lo smoke test su `ulaba.net` ha provato la pipeline end-to-end, ma le "5 proposte" generate sono
**"1 layout in 5 colori"**: titoli minuscoli, zero spazio, font dei temi non caricati, nessun hero,
nessun effetto, nessuna foto. La copy testuale che l'LLM scrive è discreta; è lo **strato di design
visivo** che non esiste. Diagnosi blindata leggendo il motore: i token di scala/spazio esistono ma
nessun blocco li consuma; i font sono dichiarati ma mai caricati; ogni blocco è la stessa `<section>`
con stili inline; le 5 varianti sono 5 ricette legate 1:1 a un tema, con render identico → la
differenza percepita collassa al colore. Un Wix migliore che genera questo **non si vende**.

## 2. Per chi (utenti)

Micro-business locali di IT/ES/LATAM, titolari non tecnici, spesso da telefono. Vogliono, in pochi
minuti, un sito che **sembri disegnato da un professionista** — non un template scarno — e che sia
**diverso** da quello del concorrente della porta accanto. Non sanno (e non devono sapere) cosa sia
un hero-layout, una matrice di compatibilità o un `IntersectionObserver`: la bellezza è
**strutturale**, garantita da noi, non una loro responsabilità.

## 3. Obiettivo (cosa significa "fatto")

Un motore che, **senza far disegnare all'LLM**, produce **5 mockup davvero diversi per ogni utente**
— belli per costruzione — partendo da ristorazione: (a) una **pelle CSS** reale (scala grande, ritmo,
gerarchia, hero vero) coi **font caricati**; (b) un **layer di selezione design** ortogonale
(cataloghi curati + matrice + selettore deterministico) che combina hero-layout × trattamento ×
effetti × tema in combinazioni **solo ammesse**, distinte su ≥1 asse strutturale; (c) gli **effetti
L0–L4** (CSS + isola client, progressive-enhancement + reduced-motion); (d) gli id di selezione
**congelati** nel documento (un sito pubblicato non si re-stila mai da solo).

Il blueprint scompone l'obiettivo in quattro macrotask; i `target_tests` dei task ne diventano
l'oracolo del checkpoint. "Fatto" = oracoli verdi al confine di ogni macrotask + **l'estetica
approvata dall'utente** (la bellezza non è oracolabile: gate umano, `L-COL-002`/`L-COL-006`).

## 4. Non-goals (cosa NON facciamo in design-engine v1)

- **Fix del flusso-intervista** (`update_brief` chiamato in ritardo, prompt debole in `interview.ts`)
  → spec/blueprint **separati**, subito dopo (DS-D9): dominio ortogonale (affidabilità di un tool LLM,
  non rendering).
- **Split del tema** in palette + tipografia **indipendenti** → evoluzione futura. In v1 i temi sono
  **bundle curati** (palette+font insieme) per armonia garantita.
- **Overlay di catalogo per altri settori** → successivi. In v1 solo **ristorazione** ha l'overlay
  pieno; gli altri vertical pescano dal **fallback universale**.
- **Foto/video reali come motore visivo primario** e **immagini stock** → spec successiva. In v1
  **ricchezza non-fotografica** (gradienti/pattern/tipografia/spazio) + **upgrade all'upload** riusando
  la pipeline media P4 (DS-D5).
- **P5 billing/crediti, ritocco/sfondi AI, gating a pagamento**.

## 5. Vincoli

| Tipo | Vincolo |
|---|---|
| Ecosistema | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| Design senza LLM | **Le manopole sono NOSTRE e curate; il modello scrive SOLO testo** (DS-D1/P2-D1). Input della selezione = `vertical` (enum) + `seed`; mai testo libero del brief → nessun percorso injection→scelta visiva |
| Bellezza garantita | La matrice ammette **solo** combinazioni vagliate da noi: nessun output può degenerare ("impossibile venga brutto"). I 5 mockup differiscono su ≥1 asse strutturale (anti-"5 colori") |
| Determinismo / artefatto congelato | Selettore e cataloghi **puri** (niente `Date`/`Math.random`); id **versionati** congelati nel documento; un ritocco al catalogo alza la versione → un sito già scelto/pubblicato non si re-stila (come `theme_id`) |
| Renderer | **Unico**: card, anteprima e `/s/` passano sempre dal `SiteView` reale (P2-D8); CSS + data-attribute + isola valgono per tutte e tre |
| Sicurezza — documento | `parseDocument` gate in scrittura **e** in render anche sui campi di selezione nuovi; escaping React del `SiteView`; nessun `src/href` da testo libero (URL asset da `asset_id`, P2-D12) |
| Sicurezza — CSP `/s/` | Font **self-host** (`next/font` → `font-src 'self'`) + isola effetti **JS bundlato** (nessuno `<script>` inline): la CSP del deploy-hardening (T-3) resta intatta |
| Accessibilità/motion | Tutti gli effetti rispettano `prefers-reduced-motion: reduce` (movimento zero, contenuto intero); il contenuto è visibile **senza JS** (progressive-enhancement, crawler-safe) |
| Colori | **Nessun colore letterale in `src/ui/site/**`** (AC-231-4 esteso al `.css`): solo `var(--site-color-*)` |
| Altitudine | Contratto `architecture:` **attivo repo-wide** (P3-D7 + AH-D6): dominio puro vs `src/ui/site`; nessun accesso dati nuovo; `tests/architecture-contract.test.ts` gate assoluto |
| Git / deploy | branch a strati; merge su `main` gated dal verde **e** dal deploy-coupling `coupled` (**human-gated anche sul verde**: Vercel connesso al repo → push su `main` = deploy in produzione) (`L-COL-024`, `L-COL-025`) |

## 6. Parity gate (promessa forte)

Conformità alla specifica = i `target_tests` dei task del macrotask passano al checkpoint. Nessuna
promessa di "bello/pronto": si dichiara la **copertura strutturale** (la bellezza la giudica l'utente),
e il verde di una prova sull'effetto vale **solo** perché il canary sa diventare rosso (DE-401).

## 7. Baseline & budget

- **Baseline di sicurezza**: da ri-catturare a inizio BUILD, ma **superficie bassa** (nessuna nuova
  tabella/RLS/segreto; solo dominio puro + `src/ui/site` + e2e). Registrata in `SESSION-STATE` §4.
- **Baseline d'igiene**: ri-attribuire prima di ri-catturare (le impronte sono sensibili alla
  POSIZIONE — R-04); i nuovi file di dominio in `src/` possono ri-fingerprintare impronte pre-esistenti
  (come M2/M5 di P4); i file `e2e/` sono esclusi da jscpd (come M6). Registrata in `SESSION-STATE` §4.
- **Budget**: limiti di spesa/tempo per ciclo in `SESSION-STATE` §4.

## 8. Fonti di verità

- **Piano**: il blueprint (`00-INDEX` + `01-visual-skin` … `04-e2e-visual`).
- **Stato vivo**: `SESSION-STATE.md` (fonte di verità del workstream design-engine — distinta dalle
  altre e da quella della skill trueline).
- **Design a monte**: `docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md`.
- **DB parametri di design**: `docs/design-system/ristorazione.md`.
- **Contratto `architecture:`**: `docs/blueprint/P3-editor/00-INDEX.md` §1bis; enforcement
  `tests/architecture-contract.test.ts` (repo-wide).

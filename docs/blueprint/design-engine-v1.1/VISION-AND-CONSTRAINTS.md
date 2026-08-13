# VISION & CONSTRAINTS — Belora/Ulaba · design-engine-v1.1 ("wow, meglio di Wix")

> Perché questo workstream esiste, per chi, cosa NON fa, e i vincoli. Input dall'utente e dalla
> spec approvata (`docs/superpowers/specs/2026-08-13-design-engine-v1.1-design.md`), non invenzione
> dell'LLM. Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Belora/Ulaba |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Owner / stakeholder** | Fondatore non tecnico; costruisce con Claude Code (priorità: managed, bassa manutenzione, task atomici) |

---

## 1. Perché esiste (problema)

Lo smoke test di **design-engine v1** su `ulaba.net` ha provato che v1 ha risolto il "1 layout in 5
colori" **solo sulla carta**: i test sono verdi ma la percezione no. Due difetti confermati
(immagini reali + codice):

- **Varietà solo cromatica.** Su 5 varianti reali, **3 condividono l'hero** e cambiano solo
  colore/ornamento. Il vincolo di v1 (`skeletonKey = hero_layout + section_treatment`) **lascia
  ripetere l'hero**, e il CORPO della pagina (sezioni) **non varia mai**. Gli assi che v1 varia sono
  o locali (hero, 1 blocco su 6) o deboli (section-treatment = bordi su sezioni alternate). L'unico
  asse visibile e globale è il tema (colore) → l'occhio legge "stesso layout, colore diverso".
- **Blocchi grezzi.** Il CSS c'è ed è applicato, ma le sezioni sono testo impilato a piena larghezza
  senza design di componente: niente griglie, contenitori, illustrazioni, gerarchia; corpo minuscolo;
  bande vuote tra i blocchi. Sembra bozza, non sito progettato.

Un Wix migliore che genera questo **non si vende**. v1.1 porta i 5 mockup a **"wow, meglio di Wix"**
(layout editoriali, illustrazioni, sezioni ricche) e li fa vedere **davvero diversi** — senza
rinunciare a "impossibile venga brutto", determinismo, CSP, editabilità.

## 2. Per chi (utenti)

Micro-business locali di IT/ES/LATAM, titolari non tecnici, spesso da telefono. Vogliono, in pochi
minuti, un sito che **sembri disegnato da un professionista** — non un template scarno — e che sia
**diverso** da quello del concorrente della porta accanto. Non sanno (e non devono sapere) cosa sia
un hero-layout, un asse di trattamento-H1 o una matrice di compatibilità: la bellezza è
**strutturale**, garantita da noi, non una loro responsabilità. Settore pilota: **ristorazione**
(verticale-blueprint completo, poi replicato agli altri settori nel workstream E).

## 3. Obiettivo (cosa significa "fatto")

Un motore che, **senza far disegnare all'LLM a runtime**, produce **5 mockup "wow" e davvero diversi
per ogni utente** — belli per costruzione — partendo da ristorazione: (a) una **pelle editoriale**
(DNA di settore FISSO: regole tipografiche display/corpo, palette estesa + superficie scura, font
display self-host, illustrazioni SVG di catalogo); (b) un **motore di varietà** su ~7 assi ricchi e
VISIBILI distribuiti su TUTTA la pagina (hero + corpo) con matrice e selettore **pluggabile**
(`selectDesign(vertical, seed, variantIndex, signals?)`, Piano B predisposto ma non implementato);
(c) i **blocchi ricchi** (Hero, Menu, ChiSiamo, Orari, Contatti, footer) come componenti progettati;
(d) gli id di selezione **congelati** nel documento (un sito pubblicato non si re-stila mai da solo).

Il blueprint scompone l'obiettivo in cinque macrotask; i `target_tests` dei task ne diventano
l'oracolo del checkpoint. "Fatto" = oracoli verdi al confine di ogni macrotask + **l'estetica
approvata dall'utente** (la bellezza non è oracolabile: gate umano, `L-COL-002`/`L-COL-006`). Il
**nucleo hero+menu** (`hero-menu-wow`) è il gate di validazione dell'intero approccio (DS-D15).

## 4. Non-goals (cosa NON facciamo in design-engine-v1.1)

- **Piano B costruito** (orchestratore LLM a runtime) → solo **predisposto** come interfaccia
  (`signals?`, DS-D14): si costruisce se il Piano A non convince al gate del nucleo.
- **Altri settori** (fitness/bellezza/ecc.) → successivi (workstream E): il metodo build-time con
  Kimi K3 si replica per settore.
- **Foto/video reali** come motore visivo primario e **immagini stock** → spec successiva. In v1.1
  **ricchezza non-fotografica** = **illustrazioni SVG di catalogo** (DS-D11) + upgrade all'upload
  (pipeline media P4).
- **Split del tema** in palette + tipografia indipendenti (workstream G) → evoluzione futura. In
  v1.1 i temi sono **bundle curati** (palette+font+regole insieme) per armonia garantita.
- **Cambio del modello di generazione a runtime** (Kimi resta build-time); **P5** billing/crediti,
  ritocco/sfondi AI, gating a pagamento.
- **Fix del flusso-intervista** (`update_brief`) → spec/blueprint separati (dominio ortogonale).

## 5. Vincoli

| Tipo | Vincolo |
|---|---|
| Ecosistema | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| Design senza LLM a runtime | **Le manopole sono NOSTRE e curate; il modello scrive SOLO testo** (DS-D1/DS-D12/P2-D1). Input della selezione = `vertical` (enum) + `seed` (+ segnali derivati, sempre ri-validati); mai testo libero del brief → nessun percorso injection→scelta visiva |
| Bellezza garantita | La matrice ammette **solo** combinazioni vagliate da noi: nessun output può degenerare ("impossibile venga brutto"). Distinzione **rafforzata**: le 5 differiscono sull'asse hero VISIBILE **e** su ≥1 asse del corpo (anti-"5 colori" e anti-"3/5 stesso hero") |
| Determinismo / artefatto congelato | Selettore e cataloghi **puri** (niente `Date`/`Math.random` nel Piano A); id **versionati** congelati nel documento; un ritocco al catalogo alza la versione → un sito già scelto/pubblicato non si re-stila. Il "giorno corrente" degli orari è un effetto client dell'isola, **fuori dal documento congelato** |
| Illustrazioni SVG | `illustrations.ts` **dominio puro** (`<symbol>` + id versionati + `currentColor`), SVG **statici del catalogo** (mai da input utente), **nessuna risorsa esterna** |
| Renderer | **Unico**: card, anteprima e `/s/` passano sempre dal `SiteView` reale (P2-D8); pelle + assi + blocchi ricchi + isola valgono per tutte e tre |
| Sicurezza — documento | `parseDocument` gate in scrittura **e** in render anche sui nuovi campi di selezione; escaping React del `SiteView`; nessun `src/href` da testo libero (URL asset da `asset_id`, P2-D12) |
| Sicurezza — CSP `/s/` | Font display **self-host** (`next/font` → `font-src 'self'`) + isola effetti/giorno-corrente **JS bundlato** (nessuno `<script>` inline: marquee/nastri sono CSS puro): la CSP del deploy-hardening (T-3) resta intatta |
| Accessibilità/motion | Tutti gli effetti rispettano `prefers-reduced-motion: reduce` (movimento zero, contenuto intero); il contenuto è visibile **senza JS** (progressive-enhancement, crawler-safe) |
| Colori | **Nessun colore letterale in `src/ui/site/**`** (AC-231-4 esteso al `.css`): solo `var(--site-color-*)`. `illustrations.ts` (dominio) è esente per posizione (`00-INDEX §4`, `DS-D11-a`) |
| Altitudine | Contratto `architecture:` **attivo repo-wide** (P3-D7 + AH-D6): cataloghi/matrice/selettore/schema puri vs `src/ui/site`; nessun accesso dati nuovo; `tests/architecture-contract.test.ts` gate assoluto |
| Git / deploy | branch a strati; merge su `main` gated dal verde **e** dal deploy-coupling `coupled` (**human-gated anche sul verde**: Vercel connesso al repo → push su `main` = deploy in produzione) (`L-COL-024`, `L-COL-025`) |

## 6. Parity gate (promessa forte)

Conformità alla specifica = i `target_tests` dei task del macrotask passano al checkpoint. Nessuna
promessa di "bello/pronto": si dichiara la **copertura strutturale** (la bellezza la giudica
l'utente), e il verde di una prova sull'effetto vale **solo** perché il canary sa diventare rosso
(DE11-303, DE11-501). Il **nucleo hero+menu** è il gate umano di validazione dell'approccio (DS-D15).

## 7. Baseline & budget

- **Baseline di sicurezza**: da ri-catturare a inizio BUILD, ma **superficie bassa** (nessuna nuova
  tabella/RLS/segreto; solo dominio puro + `src/ui/site` + e2e). Registrata in `SESSION-STATE` §4.
- **Baseline d'igiene**: ri-attribuire prima di ri-catturare (le impronte sono sensibili alla
  POSIZIONE — R-04); i nuovi file di dominio in `src/` possono ri-fingerprintare impronte
  pre-esistenti (come M2/M5 di P4 e `design-select` di v1); i file `e2e/` sono esclusi da jscpd.
  Registrata in `SESSION-STATE` §4.
- **Budget**: limiti di spesa/tempo per ciclo in `SESSION-STATE` §4.

## 8. Fonti di verità

- **Piano**: il blueprint (`00-INDEX` + `01-editorial-skin` … `05-e2e-visual-v11`).
- **Stato vivo**: `SESSION-STATE.md` (fonte di verità del workstream v1.1 — distinta dalle altre e
  da quella della skill trueline).
- **Design a monte**: `docs/superpowers/specs/2026-08-13-design-engine-v1.1-design.md`; a monte di
  esso `docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md` (v1).
- **DB parametri di design**: `docs/design-system/ristorazione.md`.
- **Contratto `architecture:`**: `docs/blueprint/P3-editor/00-INDEX.md` §1bis; enforcement
  `tests/architecture-contract.test.ts` (repo-wide).

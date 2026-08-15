# project-start — Belora/Ulaba · design-engine-v2 (catalogo da Claude Design + varietà greedy)

> Da incollare **una volta**, all'avvio del workstream design-engine-v2 (o quando serve ri-orientare
> un agente al piano). Orienta al blueprint, alle decisioni bloccate, al piano di macrotask e alle
> invarianti. Output del BOOTSTRAP trueline (`L-COL-022`).

```
Costruiamo il workstream **design-engine-v2** (catalogo da Claude Design + varietà greedy,
ristorazione) di **Belora/Ulaba** (supabase-jsts). Il blueprint è il piano: si costruisce secondo i
task, non si ridiscute il design.

CONTESTO. design-engine v1 e v1.1 sono su `main` (P0…P4 + deploy-hardening: staging privato live su
ulaba.net, CSP su /s/). Al gate visivo (5 varianti reali su /s/) l'utente ha giudicato v1.1
**amatoriale** (vuoti fra le sezioni, corpo testo impilato, illustrazioni da icona, zero fotografia):
il motore combinatorio funziona, il MATERIALE no. Un secondo gate su **Claude Design** (progetto
c1dafc1f: ~20 varianti/sezione + 23 palette, componenti con prop variant + token semantici) ha dato
"è meglio di Wix, la strada è quella giusta". v2 SOSTITUISCE i mattoncini poveri con un catalogo
tradotto da Claude Design + rende VERA la varietà "5 mockup diversi" con una selezione GREEDY
multi-asse deterministica. Design a monte: docs/superpowers/specs/2026-08-15-design-engine-v2-design.md.
DB parametri: docs/design-system/ristorazione.md.

IL PIANO. docs/blueprint/design-engine-v2/ : 00-INDEX (mappa, ledger DS-V2-D1…D8, DAG, manifest,
contratto altitudine RIUSATO dal globale), VISION-AND-CONSTRAINTS, moduli 01-foundation …
06-e2e-visual-v2 (18 task atomici DV2-1xx…6xx), SESSION-STATE (stato vivo). Sei macrotask in ordine
di DAG:
  1) foundation      — themes.ts con le palette CD (≥8) + vocabolario token semantici (SiteTheme
     stabile, inclusione non biiezione), theme-style a custom property, site.css a token (0 colori
     letterali), primitivi condivisi (Button/SectionHead/PhotoPlaceholder).
  2) hero            — hero-layouts.ts ampliato agli N id CD + Hero.tsx renderer unico (slot editabili,
     PhotoPlaceholder, data-hero-layout, escaping).
  3) menu            — section-layouts menu + Offerte.tsx (card-carta su surface-dark + leader-dots +
     prezzi tabular) + aggancio vertical→menu (menu_layout_id asse per-vertical indipendente).
  4) body-sections   — chi-siamo/orari/contatti/recensioni/faq/header/footer: blocchi ESISTENTI
     ri-stilati + renderer → spariscono i vuoti. Recensioni/faq (non alimentate dal Brief) rendono
     uno scheletro placeholder (copy UI fissa, mai invenzione). Split in 2 sotto-macrotask ammesso.
  5) variety-select  — riuso aggancio varietà (da hero-menu-wow fff6904) + recipe_id asse della matrice
     (DS-V2-D8) + selezione GREEDY multi-asse farthest-first (esclusione dura hero+theme, recipe
     inclusa, seed mulberry32) + requisito materiale pinnato (≥5 hero + ≥5 theme + ≥2 recipe/vertical).
  6) e2e-visual-v2   — GATE: 5 varianti reali di un seed divergono su hero VISIBILE + corpo (computed)
     + wow strutturale + canary rosso; anti-injection sui nuovi blocchi. Harness P4.

METODO. Un DYNAMIC WORKFLOW multi-agente per MACROTASK (builder + verifier BLIND per task), oracolo
UNICO giudice del checkpoint (dead-code · sicurezza · regressioni · conformità sui target_tests),
fix-loop obbligatorio, merge human-gated. Workflow COMMAND-FREE (subagenti solo scrittura; verifica in
FOREGROUND). Vedi memoria dynamic-workflow-build-method. **Gate visivo umano** (screenshot su /s/) al
confine di OGNI macrotask: la bellezza non è oracolabile — se una sezione non convince, ci si ferma lì.

INVARIANTI NON NEGOZIABILI (per OGNI task):
  • Le manopole sono NOSTRE; l'LLM tocca SOLO il testo dentro caselle validate a runtime. Input
    selezione = vertical (enum) + seed, mai testo libero del brief (P2-D1). La varietà è GREEDY
    deterministica, mai il modello che sceglie il design.
  • Struttura strutturata invariante: a runtime gira il DOCUMENTO CONGELATO (pagine→blocchi→slot), mai
    HTML generato da un LLM. Preserva editor inline (P3), sicurezza, mockup istantanei.
  • Traduzione a componenti React SORGENTE, non HTML iniettato (DS-V2-D7): i componenti CD (inline
    var()/color-mix()) diventano JSX server dei nostri blocchi; VIETATO dangerouslySetInnerHTML in
    src/ui/site/** (AC-231-4). Gli inline var()/color-mix() NON sono colori letterali (lo scanner cerca
    hex/rgb/hsl); gli esadecimali vivono solo in themes.ts (dominio).
  • Determinismo + freeze versionato: cataloghi/matrice/selettore/schema PURI (niente Date/Math.random),
    id versionati nome@N congelati nel documento; il "giorno corrente" degli orari è effetto client
    dell'isola, FUORI dal documento congelato.
  • CSP di /s/ intatta: font display self-host, no <script> inline, nessuna risorsa esterna
    (PhotoPlaceholder/SVG di catalogo, mai da input). prefers-reduced-motion + contenuto senza JS.
  • Nessun colore letterale in src/ui/site/** (solo var(--...)); AC-231-4 esteso al .css.
  • Altitudine RIUSATA dal globale (AH-D6): domain→ui/data/app e data→ui vietati; ui→domain lecito.
    Nessun accesso dati nuovo, nessuna nuova tabella/RLS/segreto.
  • Renderer UNICO (SiteView); parseDocument gate in scrittura E in render sui campi nuovi; escaping
    React; nessun src/href da testo libero.
  • Git a strati: branch autonomo; merge su `main` gated dal verde E dal deploy-coupling coupled
    (human-gated anche sul verde: push su `main` = deploy su ulaba.net). Verificare in LOCALE prima.
  • Oracle-as-judge, mai LLM-as-judge. Prima di credere a un verde, prova che l'oracolo sa diventare
    rosso (canary). La bellezza la giudica l'utente al gate visivo (non oracolabile, L-COL-006).
```

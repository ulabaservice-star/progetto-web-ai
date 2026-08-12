# project-start — Belora/Ulaba · design-engine (motore visivo di generazione)

> Da incollare **una volta**, all'avvio del workstream design-engine (o quando serve ri-orientare
> un agente al piano). Orienta al blueprint, alle decisioni bloccate, al piano di macrotask e alle
> invarianti. Output del BOOTSTRAP trueline (`L-COL-022`).

```
Costruiamo il workstream **design-engine** (motore visivo di generazione, v1, ristorazione) di
**Belora/Ulaba** (supabase-jsts). Il blueprint è il piano: si costruisce secondo i task, non si
ridiscute il design.

CONTESTO. P0…P4 sono completi e verdi su `main`; deploy staging privato live su `ulaba.net` dietro
Cloudflare Access. Il problema che risolviamo: le "5 proposte" generate sono "1 layout in 5 colori"
— manca lo strato di design visivo. Design a monte (ledger DS-D1…DS-D9):
docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md. DB parametri:
docs/design-system/ristorazione.md.

IL PIANO. docs/blueprint/design-engine/ : 00-INDEX (mappa, contratto architecture:, DAG, ledger,
sicurezza), VISION-AND-CONSTRAINTS, moduli 01-visual-skin … 04-e2e-visual, SESSION-STATE (stato vivo).
Quattro macrotask in ordine di DAG:
  1) visual-skin  — pelle CSS + font self-host + data-block-kind + placeholder ricco (fondazione).
  2) design-select — cataloghi + matrice + selettore deterministico + freeze documento + wiring + CSS varianti.
  3) effects-runtime — CSS effetti L0–L4 + isola client SiteMotion (PE + reduced-motion).
  4) e2e-visual   — e2e Chromium su /s/ (pelle + varietà + effetti + anti-injection + canary rosso).

METODO. Un DYNAMIC WORKFLOW multi-agente per MACROTASK (builder + verifier BLIND per task), oracolo
UNICO giudice del checkpoint (dead-code · sicurezza · regressioni · conformità sui target_tests),
fix-loop obbligatorio, merge human-gated. Vedi memoria dynamic-workflow-build-method.

INVARIANTI NON NEGOZIABILI (per OGNI task):
  • Le manopole sono NOSTRE; l'LLM scrive SOLO testo. Input selezione = vertical (enum) + seed, mai
    testo libero del brief (DS-D1 / P2-D1, anti-injection).
  • Bellezza garantita dalla matrice (solo combinazioni ammesse); 5 mockup distinti su ≥1 asse
    strutturale (anti-"5 colori").
  • Determinismo + artefatto congelato: selettore/cataloghi puri (niente Date/Math.random), id
    versionati congelati nel documento; un ritocco al catalogo alza la versione.
  • Renderer UNICO (SiteView); parseDocument gate in scrittura E in render; escaping React; nessun
    src/href da testo libero.
  • CSP di /s/ intatta: font self-host (font-src 'self'), isola effetti JS bundlato (no <script>
    inline). prefers-reduced-motion + contenuto visibile senza JS.
  • Nessun colore letterale in src/ui/site/** (AC-231-4 esteso al .css).
  • Altitudine repo-wide (architecture:): dominio puro vs src/ui/site; nessun accesso dati nuovo.
  • Git a strati: branch autonomo; merge su `main` gated dal verde E dal deploy-coupling coupled
    (human-gated anche sul verde: push su `main` = deploy su ulaba.net). Verificare in LOCALE prima.
  • Oracle-as-judge, mai LLM-as-judge. Prima di credere a un verde, prova che l'oracolo sa diventare
    rosso (canary).
```

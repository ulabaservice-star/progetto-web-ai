# session-start — Belora/Ulaba · design-engine (motore visivo di generazione)

> Da incollare **all'apertura di ogni sessione** di lavoro su design-engine (dopo la prima). Legge
> SESSION-STATE, sceglie il macrotask corrente, ripete task/criteri/test, prepara il branch.

```
Riprendiamo il lavoro su **design-engine** (motore visivo di generazione, v1, ristorazione) di
**Belora/Ulaba** (supabase-jsts). Il blueprint è il piano: si costruisce secondo i task, non si
ridiscute il design.

1) RECUPERO CONTESTO — leggi PRIMA di qualunque azione:
   • docs/blueprint/design-engine/SESSION-STATE.md → stato vivo: macrotask fatti/in corso, baseline,
     budget, stato git, §5 carry-over, §6 copertura dichiarata.
   • docs/blueprint/design-engine/ → il piano (00-INDEX + moduli) per il macrotask di oggi.
   • Verifica i path reali del motore all'apertura (potrebbero essere evoluti): src/domain/generation/
     (themes/recipes/document/variant-document/theme-style), src/ui/site/ (SiteView/SiteSection/
     SiteImage/blocchi), l'harness e2e P4 (e2e/seed.ts, hostile-brief.ts, assertNoInjectionEffect).

2) SELEZIONA IL MACROTASK CORRENTE rispettando il DAG interno:
   visual-skin (nessuna dipendenza) → design-select (usa la pelle) → effects-runtime (usa effect_level
   congelato) → e2e-visual (richiede pelle + varietà + effetti). Scegli il primo non chiuso le cui
   dipendenze sono già verdi.

3) RIPETI i task atomici del macrotask scelto. Per ciascuno enuncia, dal blueprint:
   definition_of_done · acceptance_criteria (given/when/then) · target_tests (l'ORACOLO del controllo 4).

4) PREPARA IL BRANCH DI LAVORO (es. trueline/build/visual-skin). Lavora SU BRANCH, MAI su `main`.

5) PROMEMORIA: al CONFINE DEL MACROTASK gira il CHECKPOINT prima di committare. Merge su `main` GATED
   dal verde E dal deploy-coupling coupled (human-gated anche sul verde: push su `main` = deploy su
   ulaba.net). Verificare in LOCALE (specie e2e + computed-style) prima del merge.

6) METODO — UN DYNAMIC WORKFLOW multi-agente per MACROTASK. Tu (ORCHESTRATORE) coordini:
   • BUILDER — implementano i task in ordine di DAG. TEST-FIRST con asserzioni DERIVATE dagli
     acceptance_criteria (mai inventate), tag // covers: <AC-id>, diff minimo, nessun dead-code nuovo,
     security_notes onorate. FIXTURE con PIÙ DI UN ELEMENTO, valori DISCORDANTI, e almeno un id/slug
     PREFISSO di un altro (cruciale qui per: lookup di catalogo per id versionato, distinzione delle 5
     varianti, matrice, temi). Una fixture con un solo elemento non prova nulla sull'identità.
   • VERIFIER (agenti DIVERSI, BLIND) — revisione AVVERSARIALE: (a) l'AC è davvero asserito o vero per
     costruzione della fixture? (b) anti-injection (selezione = vertical+seed, mai testo libero),
     parseDocument gate sui campi nuovi, escaping SiteView, CSP intatta (font self-host, no <script>
     inline), progressive-enhancement (contenuto senza JS) + prefers-reduced-motion, determinismo
     (niente Date/Math.random), nessun colore letterale nel .css, canary che sa diventare rosso; (c)
     disciplina trueline (niente comportamento inventato, niente astrazioni speculative, niente orfani,
     RENDERER UNICO). Emettono RILIEVI; NON dichiarano "verde".
   • FIXER (agenti DIVERSI) — su checkpoint ROSSO o rilievi confermati: diagnosi CAUSA RADICE
     (systematic-debugging) + patch minima proposta.
   • ORCHESTRATORE (tu) — selezioni macrotask/branch, lanci le fasi, APPLICHI le patch approvate
     (human-in-the-loop), ESEGUI gli oracoli, committi/merge, aggiorni SESSION-STATE. Fra i task una
     BATTERIA DI MUTAZIONE: mutazione palesemente fatale + ripristino CON L'HASH (backup+sha256, MAI
     git checkout — il macrotask è uncommitted).
   Sequenza: preflight+selezione+branch → BUILD → VERIFY (BLIND) → CHECKPOINT run_checkpoint.mjs = IL
   GIUDICE → se ROSSO/rilievi: FIX → RIESEGUI LO STESSO ORACOLO + i test (budget retry ≤2, poi
   terminale all'umano) → verde: commit atomico + merge gated + push, aggiorni SESSION-STATE.
   Forma che tiene (P1/P2/P3/P4): 2 agenti per workflow, un task per volta, UN workflow di build per
   MACROTASK. Controlla SEMPRE agents_error prima del valore di ritorno (un workflow morto restituisce
   array vuoti che SEMBRANO verdi).

NOTE OPERATIVE (imparate sul campo — non riscoprirle):
  • Verdetto dal JSON del checkpoint (green, summary, controls[]), MAI dall'exit code o via | tail.
    Scrivi l'output INTERO su file e leggilo da lì.
  • CHECKPOINT MONOLITICO in background detached = 0xC0000142 (gli oracoli non spawnano i sottoprocessi)
    → DECOMPORRE (foreground funziona per build/e2e/vitest/driver). run_checkpoint --baseline vuole un
    file ARRAY (.trueline/checkpoint-baseline.json).
  • CHECKPOINT SU STATO PULITO: rm -rf .next + db:reset PRIMA del monolite.
  • BASELINE D'IGIENE: ri-attribuire prima di ri-catturare (impronte sensibili alla POSIZIONE — R-04);
    i nuovi moduli di dominio in src/ possono ri-fingerprintare impronte pre-esistenti. e2e/ escluso da jscpd.
  • ARCH_CHECK repo-wide: dominio puro vs src/ui/site; una regola forbidden che mappa a 0 moduli = non-verde.
  • E2E Chromium su /s/ (DE-401): computed-style (font-size hero), non screenshot pixel-diff. Il CANARY
    viene PRIMA del verde: se non sa prendere il componente insicuro, non prova nulla.

INVARIANTI (vedi project-start): manopole nostre / LLM solo testo; matrice garantisce la bellezza;
determinismo + freeze versionato; renderer unico + parseDocument; CSP intatta + PE + reduced-motion;
no colore letterale; altitudine; git a strati + deploy-coupling coupled; oracle-as-judge + canary.

Dopo aver letto SESSION-STATE: dichiara in poche righe lo stato, il macrotask scelto coi suoi
task/criteri/test, il branch preparato, ed eventuali blocchi. Poi attendi il mio via.
```

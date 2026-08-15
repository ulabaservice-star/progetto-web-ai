# session-start — Belora/Ulaba · design-engine-v2 (catalogo da Claude Design + varietà greedy)

> Da incollare **all'apertura di ogni sessione** di lavoro su design-engine-v2 (dopo la prima).
> Legge SESSION-STATE, sceglie il macrotask corrente, ripete task/criteri/test, prepara il branch.

```
Riprendiamo il lavoro su **design-engine-v2** (catalogo da Claude Design + varietà greedy,
ristorazione) di **Belora/Ulaba** (supabase-jsts). Il blueprint è il piano: si costruisce secondo i
task, non si ridiscute il design.

1) RECUPERO CONTESTO — leggi PRIMA di qualunque azione:
   • docs/blueprint/design-engine-v2/SESSION-STATE.md → stato vivo: macrotask fatti/in corso,
     baseline, budget, stato git, §5 carry-over, §6 copertura dichiarata.
   • docs/blueprint/design-engine-v2/ → il piano (00-INDEX + moduli) per il macrotask di oggi.
   • Verifica i path reali del motore all'apertura (v1/v1.1 sono su `main`, potrebbero essere evoluti):
     src/domain/generation/ (themes/hero-layouts/section-layouts/design-matrix/design-select/
     variant-document/resolve), src/ui/site/ (SiteView/SiteSection/blocchi Hero/Offerte/corpo/
     site.css/theme-style + i primitivi Button/SectionHead/PhotoPlaceholder), l'harness e2e P4
     (e2e/support/seed.ts, e2e/fixtures/hostile-brief.ts, e2e/support/effect-assertions.ts).
   • Se serve il catalogo di Claude Design (build-time): leggilo via DesignSync (list_files/get_file)
     dal progetto c1dafc1f; traducilo in blocchi strutturati (mai HTML iniettato, DS-V2-D7).

2) SELEZIONA IL MACROTASK CORRENTE rispettando il DAG:
   foundation → {hero, menu, body-sections} → variety-select → e2e-visual-v2.
   Scegli il primo non chiuso le cui dipendenze sono già verdi. I tre del corpo (hero/menu/
   body-sections) dipendono solo da foundation ma toccano site.css → UNO alla volta.

3) RIPETI i task atomici del macrotask scelto. Per ciascuno enuncia, dal blueprint:
   definition_of_done · acceptance_criteria (given/when/then) · target_tests (l'ORACOLO del controllo 4).

4) PREPARA IL BRANCH DI LAVORO (es. trueline/build/foundation) da `main` pulito. Lavora SU BRANCH,
   MAI su `main`.

5) PROMEMORIA: al CONFINE DEL MACROTASK gira il CHECKPOINT prima di committare, PIÙ il GATE VISIVO
   umano (screenshot su /s/). Merge su `main` GATED dal verde E dal deploy-coupling coupled
   (human-gated anche sul verde: push su `main` = deploy su ulaba.net). Verificare in LOCALE (vitest,
   e2e Chromium + computed-style, next build) prima del merge. La BELLEZZA non è oracolabile: se una
   sezione non convince all'occhio, fermarsi lì (non nascondere dietro il verde).

6) METODO — UN DYNAMIC WORKFLOW multi-agente per MACROTASK. Tu (ORCHESTRATORE) coordini:
   • BUILDER — implementano i task in ordine di DAG. TEST-FIRST con asserzioni DERIVATE dagli
     acceptance_criteria (mai inventate), tag // covers: <AC-id>, diff minimo, nessun dead-code nuovo,
     security_notes onorate. FIXTURE con PIÙ DI UN ELEMENTO, valori DISCORDANTI, e almeno un id/slug
     PREFISSO di un altro (cruciale qui per: lookup di catalogo per id versionato, distinzione delle
     varianti, palette, section-layout). Una fixture con un solo elemento non prova nulla sull'identità.
     Per la VARIETÀ: la prova che vale è sull'asse VISIBILE dell'hero E su ≥1 asse del corpo (computed),
     su 5 varianti REALI di un seed (via selectDesign), non su documenti costruiti a mano.
   • VERIFIER (agenti DIVERSI, BLIND) — revisione AVVERSARIALE: (a) l'AC è davvero asserito o vero per
     costruzione della fixture? La distinzione è su asse VISIBILE hero + corpo, o è cromatica-debole
     come v1? (b) anti-injection (selezione = vertical+seed, mai testo libero; parseDocument gate sui
     campi nuovi; escaping React; VIETATO dangerouslySetInnerHTML in src/ui/site; PhotoPlaceholder/SVG
     di catalogo, mai da input; CSP intatta), determinismo (niente Date/Math.random; giorno-corrente =
     isola client), nessun colore letterale nel .css/blocchi, canary che sa diventare rosso; (c)
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
   terminale all'umano) → verde: commit atomico + GATE VISIVO + merge gated + push, aggiorni
   SESSION-STATE. Forma che tiene (P1/P2/P3/P4/v1/v1.1): 2 agenti per workflow, un task per volta, UN
   workflow di build per MACROTASK. Il WORKFLOW STANDARD SI STALLA se i subagenti eseguono comandi →
   usa COMMAND-FREE (subagenti solo scrittura) + verifica in FOREGROUND. Controlla SEMPRE agents_error
   prima del valore di ritorno (un workflow morto restituisce array vuoti che SEMBRANO verdi).

NOTE OPERATIVE (imparate sul campo — non riscoprirle):
  • Verdetto dal JSON del checkpoint (green, summary, controls[]), MAI dall'exit code o via | tail.
    Scrivi l'output INTERO su file e leggilo da lì.
  • CHECKPOINT MONOLITICO in background detached = 0xC0000142 (gli oracoli non spawnano i sottoprocessi)
    → DECOMPORRE (foreground funziona per build/e2e/vitest/driver). run_checkpoint --baseline vuole un
    file ARRAY (.trueline/checkpoint-baseline.json). c4trace: assertionTrace ritorna un OGGETTO
    {ok, detail, untracked} — leggi i campi, non un green calcolato.
  • CHECKPOINT SU STATO PULITO: rm -rf .next + db:reset PRIMA del monolite (se lo usi).
  • BASELINE D'IGIENE: ri-attribuire prima di ri-catturare (impronte sensibili alla POSIZIONE — R-04);
    i cataloghi cresciuti (themes/hero-layouts/section-layouts) e i blocchi riscritti possono
    ri-fingerprintare impronte pre-esistenti (FP legittimi, mai gonfiare policy). e2e/ escluso da jscpd.
    Verifica baseline_status, non la misura jscpd dell'agente. Punto di partenza igiene: 173 (fine v1.1).
  • ARCH_CHECK repo-wide RIUSATO dal globale (AH-D6): dominio puro vs src/ui/site; ui→domain lecito.
    Nessuna nuova regola forbidden nel blueprint v2 (non ridichiara il contratto).
  • E2E Chromium su /s/ (DV2-601/602): computed-style (font-size hero, layout/posizione media,
    background, layout corpo), non screenshot pixel-diff. 5 varianti REALI di un seed via selectDesign.
    Il CANARY viene PRIMA del verde: se non sa prendere il difetto, non prova nulla.
  • matchMedia è un ACCESSOR: vi.stubGlobal + vi.unstubAllGlobals, asserisci il ripristino.
  • THEMES/cataloghi cresciuti toccano molti test esistenti: aggiornare per INCLUSIONE, non biiezione
    (Set(theme_id) == Set(THEMES) è l'accoppiamento che DS-V2-D1 elimina).
  • Ripristino mutazioni: backup+sha256, MAI git checkout (il macrotask è uncommitted). scratchpad/ NON
    è gitignorato: cancella il driver del checkpoint prima del commit.

INVARIANTI (vedi project-start): manopole nostre / LLM solo testo a runtime; varietà greedy
deterministica; documento congelato + freeze versionato; traduzione a componenti React sorgente (no
HTML iniettato, no dangerouslySetInnerHTML); PhotoPlaceholder/SVG di catalogo; renderer unico +
parseDocument; CSP intatta + PE + reduced-motion; no colore letterale; altitudine riusata dal globale
(ui→domain lecito); git a strati + deploy-coupling coupled; oracle-as-judge + canary + gate visivo umano.

Dopo aver letto SESSION-STATE: dichiara in poche righe lo stato, il macrotask scelto coi suoi
task/criteri/test, il branch preparato, ed eventuali blocchi. Poi attendi il mio via.
```

# SESSION-STATE — onboarding-guided-wizard

> Fonte di verità sullo **stato vivo** del workstream `onboarding-guided-wizard`, consumata da BUILD
> e aggiornata a ogni `session-end`. Istanza distinta da quelle di P0…P4, design-engine v1/v1.1/v2,
> `architecture-hardening`, `deploy-hardening`. Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Stato** | **BUILD 4/6** — `suggest-offerings` (OGW-401/402) **COMPLETO**, checkpoint 4/4 VERDE, mutazioni 5/5, gate visivo umano APPROVATO (con rifinitura: pulsante primario + icona). Storia precedente: **BUILD 3/6** — `generate-description` (OGW-301/302) **COMPLETO E MERGIATO su `main` (`605b1fa`)**, checkpoint 4/4 VERDE, mutazioni 5/5, gate visivo umano APPROVATO, deploy Vercel partito. `ai-usage-guard` (`0e3d2ba`) + `offerings-editor` (`08c8404`) mergiati. ⚠️ **Migrazione `20260818000100` ANCORA da applicare a Supabase Cloud**: l'endpoint `generate-description` la consuma ma è **DORMIENTE** (UI non cablata nel flusso → OGW-501); da applicare prima che `wizard-shell` lo colleghi. Prossimo selezionabile: `suggest-offerings` (OGW-401/402, dip. `ai-usage-guard`+`offerings-editor` verdi). |

---

## 1. Stato dei macrotask

> Stati: `todo` | `in_progress` | `done`.

| Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|
| `ai-usage-guard` (OGW-101/102) | **done — mergiato `main` (`0e3d2ba`)** | **4/4 VERDE** | — |
| `offerings-editor` (OGW-201/202) | **done — mergiato `main` (`08c8404`)** | **4/4 VERDE** | — |
| `generate-description` (OGW-301/302) | **done — mergiato `main` (`605b1fa`)** | **4/4 VERDE** | `ai-usage-guard` |
| `suggest-offerings` (OGW-401/402) | **done** | **4/4 VERDE** | `ai-usage-guard`, `offerings-editor` |
| `wizard-shell` (OGW-501/502) | **todo** | — | `offerings-editor`, `generate-description`, `suggest-offerings` |
| `remove-chat` (OGW-601) | **todo** | — | `wizard-shell` |

**Build order (DAG):** `{ai-usage-guard, offerings-editor} → generate-description · suggest-offerings → wizard-shell → remove-chat`.

## 2. Macrotask corrente

- **`generate-description` COSTRUITO E MERGIATO** (branch `trueline/build/generate-description`, feat
  `605b1fa`, checkpoint 4/4 VERDE, mutazioni 5/5, gate visivo umano APPROVATO, merge ff-only su `main` +
  push → deploy Vercel).
  - **OGW-301**: `src/domain/onboarding/generate-description.ts` — dominio PURO `generateDescription(llm,
    {vertical, phrase})`. **Riusa `OnboardingLlmPort`** con `tools: []` (nessun secondo confine LLM,
    P1-D7); il provider reale `onboardingLlmPort` funziona senza modifiche. `vertical` (enum chiuso) nel
    system, `phrase` (non fidato) nel ruolo user (difesa injection come `briefStateSection`). System prompt
    con **clausola anti-invenzione** (espandi le parole, non aggiungere fatti — proxy L-COL-006, difesa
    reale = suggerimento editabile). Output concatenato dai blocchi `text`, trimmato, RI-VALIDATO: vuoto o
    `> BRIEF_LIMITS.description` → `{ok:false, reason:'empty'|'too_long'}`, mai troncato. Test
    `tests/onboarding-generate-description.test.ts` (AC-301-1/2/3, doppio della porta che cattura il `turn`).
  - **OGW-302**: provider reale `src/data/ai-usage.ts` (`createAiUsagePort` → `AiUsagePort` su
    `onboarding_ai_usage`, client con sessione/RLS, **account_id dalla riga `sites` del siteId**, non da
    `owner_id` — vedi §5) + endpoint `src/app/api/onboarding/[siteId]/generate-description/route.ts`
    (guardie condivise `guardMutatingRequest`/`getUser`/`guardOwnedSite`/`loadRouteBrief` → `checkAiBudget`
    PRIMA → confine LLM → `recordAiUsage` **consume-on-success**, 429 al cap, catch che LOGGA no-502-opaco)
    + UI `src/ui/onboarding/GenerateDescriptionField.tsx` (controllato/isolato: proposta editabile, conferma
    ESPLICITA `onConfirm`, `onGenerate` iniettata, `atCap` disabilita + messaggio; anti-injection T-151).
    Chiavi `onboarding.generateDescription.*` it+es. Test route (`...-route.test.ts`, AC-302-1/2/3, fake
    porta usage in-memory) + UI (`...-ui.test.tsx`, AC-302-4).
  - **DECISIONE DI SCOPE (gate umano):** l'**integrazione nel flusso UI** (cablare `onGenerate` al POST e
    `onConfirm` alla patch del brief, step "Racconto") è **DEMANDATA a `wizard-shell` (OGW-501)** — stesso
    confine di `offerings-editor`. Il componente NON è dead-code (usato dai test).
- **`suggest-offerings` COSTRUITO** (branch `trueline/build/suggest-offerings`, checkpoint 4/4 VERDE,
  mutazioni 5/5, gate visivo umano APPROVATO). **Sessione precedente interrotta** (guasto infrastrutturale)
  col codice scritto ma MAI committato e il checkpoint fermo su C1 rosso; ripresa e chiusa il 2026-08-22.
  - **OGW-401**: `src/domain/onboarding/suggest-offerings.ts` — dominio PURO `suggestOfferings(llm,
    {vertical, description?})`. A differenza di `generateDescription` (testo, `tools:[]`) il trasporto è
    **TOOL-USE**: l'output è una LISTA, quindi arriva via lo strumento `propose_offerings` e il dominio ne
    VALIDA l'input; la porta condivisa `OnboardingLlmPort` non cambia. `input_schema` **senza `price`** +
    tipo di ritorno `{name, section?}` ⇒ **placeholder a prezzo vuoto STRUTTURALE** (non una promessa del
    prompt): `.strip()` di zod ignora un `price` proposto senza scartare la voce. Voci fuori-forma
    scartate una a una (una voce rotta non fa cadere l'elenco), tetti da `BRIEF_LIMITS`, cap prudente di 12
    suggerimenti (dichiarato, non un AC); risposta senza `tool_use` → lista vuota, mai un errore.
    `description` (non fidata) nel ruolo user, `vertical` (enum) nel system.
  - **OGW-402**: endpoint `src/app/api/onboarding/[siteId]/suggest-offerings/route.ts` (stessa catena del
    gemello M3: guardie condivise → `checkAiBudget` PRIMA → confine LLM → `recordAiUsage` consume-on-success,
    429 al cap, catch che LOGGA) — **body `{}` strict, nessun input dal client**: `vertical`/`description`
    vengono dal BRIEF del sito, quindi zero nuova superficie non fidata (tetto byte 256). Zero suggerimenti
    validi = **502 senza consumo**. UI `src/ui/onboarding/OfferingSuggestions.tsx`: proposte pendenti nello
    stato del componente, ognuna col badge "esempio — personalizzalo", che escono verso il brief SOLO con
    `onAccept` per-voce (AC-402-3 **strutturale**: non esiste percorso che inserisca senza clic); scarto
    libero; `atCap` disabilita. Chiavi `onboarding.suggestOfferings.*` it+es.
  - **Rifinitura del gate visivo**: pulsante da `variant="secondary"` a **primario** + icona ✨ nel testo
    i18n it/es (il blueprint la citava nella prosa; non era un AC).
- **Prossimo selezionabile** (DAG): **`wizard-shell`** (OGW-501/502, dip. `offerings-editor` +
  `generate-description` + `suggest-offerings` tutti verdi). Poi `remove-chat` (OGW-601). ⚠️ La **migrazione
  `20260818000100`** va applicata a Supabase Cloud prima che un endpoint AI sia usato a runtime dalla UI
  (oggi endpoint dormiente).

## 3. Stato git

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/suggest-offerings` (mergiato ff-only, non cancellato) |
| Ultimo commit | feat `605b1fa` su `main` (+ commit `docs(...): session-end` di questa chiusura) |
| Stato merge su `main` | **MERGIATO** (via umana esplicita, ff-only `c72e0ad..605b1fa` + push → deploy Vercel). Verifica locale VERDE: tsc 0, eslint 0, knip 0, suite **1745/1745**, `next build` 0, checkpoint 4/4, mutazioni 5/5, gate visivo approvato. |
| `main_deploy_coupled` | **true** (Vercel connesso al repo `ulabaservice-star/progetto-web-ai`: push su `main` = deploy su ulaba.net) → merge **human-gated anche sul verde**; verifica locale (vitest, e2e, `next build`) prima di ogni merge |

## 4. Baseline & budget

- **Baseline di sicurezza**: RI-CATTURATA a inizio BUILD ai-usage-guard (§4 dovuto) su stato base
  SENZA i file del macrotask → `.trueline/checkpoint-baseline.json` (ARRAY, gitignorato, locale):
  **6 FP pre-esistenti** = 2 dependency-vuln (osv postcss + 1) + **3 secret FP GITIGNORATI**
  (`.env.local` generic+anthropic-api-key, `siti css/*.txt`; `git check-ignore` positivo → mai nel
  repo) + 1 rls (anon-policy public-serving). Delta del macrotask = **0** (la RLS nuova non aggiunge
  finding: `rls_check` la valida owner-only).
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` (jscpd; `e2e/` escluso). **M2: RIGENERATA
  control-compatibile** (formato `fingerprints[]`, **224 fp**, committata in `15dc511`). Motivo: la
  baseline M1 (formato `capture --hygiene`) non conteneva il fingerprint del dup pre-esistente
  `onboarding_ai_usage.sql`↔`assets_and_storage.sql` (50 token, LOW) — e `capture --hygiene` lo
  rigenerava con un fingerprint **incompatibile** con quello di `control1Hygiene`, quindi il gate lo
  vedeva "nuovo". Rimedio (§5): estrarre i fingerprint da `control1Hygiene(...).findings` (stesso metodo
  del gate) → match garantito. **Verificato che 0 cloni coinvolgono file M2** (`dead-code:0`, dup delta 0).
  Metodo checkpoint:
  **decomposto** — driver `.trueline/ogw-checkpoint.mjs` (import `control1Hygiene`/`control2Security`
  reali + `loadHygieneBaseline`/`classify`/`loadManifest`/`loadBaseline`, `blueprintDir` passato ma
  nessun contratto arch → gate arch no-op per OGW-D6) per C1+C2 in foreground; C3+C4 = `vitest run`
  completo (1725/1725, ~5 min < cap). Il monolitico resta da evitare in background (0xC0000142).
- **Budget**: retry ≤2 per checkpoint; batteria di mutazione per macrotask (mutazione fatale +
  ripristino via **backup+sha256**, MAI `git checkout` — il macrotask è uncommitted).
- **Contratto altitudine**: riusato dal globale (`tests/architecture-contract.test.ts`); nessun blocco
  `architecture:` nel blueprint (OGW-D6). Dominio puro; `ui→domain` lecito.
- **M3 `generate-description`: §4 NON dovuto (baseline invariate).** Nessuna nuova migrazione/RLS
  (l'endpoint riusa `onboarding_ai_usage` + le guardie esistenti) → baseline di **sicurezza** invariata
  (C2 green, gitleaks:3/osv:2/rls:1 tutti pre-esistenti). Baseline d'**igiene** invariata (`224 fp`,
  `15dc511`): il primo `ai-usage.ts` introduceva **1 dup nuova**, risolta alla radice (§5) → C1 green
  con `dup:228` 0-nuove **senza ri-baselinare** (il clone coinvolgeva un file del macrotask → una
  ri-baseline sarebbe stata mascheramento, non ratchet legittimo).

## 5. Carry-over / note ereditate (dal design doc + gate delle assunzioni)

- **OGW-D1** chat libera rimossa (`remove-chat` = ULTIMO, dopo il wizard). **OGW-D2** ogni output AI =
  suggerimento editabile confermato; suggerimenti-offerte = placeholder a **prezzo vuoto**. **OGW-D4**
  spesa governata per-sito (cap→429 + rate-limit, consume-on-success). **OGW-D5** Brief/generazione/
  motore-v2 invariati.
- **Riuso confermato dal codice**: `fromUrl`+`fetchSafe`+`extract_brief` (import, anti-invenzione già
  forte); **widget orari** già in `BriefPanel`; `resolveOfferings` (etichette per-settore, `show_price`);
  `upsertBrief`/`briefToUpdate` accettano già `offerings`.
- **Gap noti (input al build)**: oggi in `BriefPanel` le offerte sono **read-only** (→ OGW-202);
  `BriefCorePatch` non porta `offerings` (→ OGW-201); il modello onboarding è economico (verificare la
  qualità di `generateDescription`, eventualmente il modello di generazione per quel solo passo).
- **Nota semantica (dichiarata, L-COL-006)**: l'anti-invenzione di `generateDescription`/`suggestOfferings`
  è oracolata come **proxy** (il prompt contiene la clausola; le voci a prezzo vuoto), non come prova che
  il modello non inventi — la difesa reale è **strutturale** (suggerimento editabile + conferma). Gate
  visivo umano sui suggerimenti in build.
- **Nota atomicità (dichiarata)**: `OGW-501`/`OGW-502` sono i task più grossi (contenitore + integrazione
  + e2e); se in build non stanno in un ciclo, sono splittabili senza toccare il DAG.

- **M4 `suggest-offerings`: §4 dovuto SOLO sull'igiene (sicurezza invariata).** Nessuna migrazione/RLS
  nuova (riusa `onboarding_ai_usage` + le guardie) → C2 green, baseline di sicurezza INVARIATA
  (gitleaks:3/osv:2/rls:1 pre-esistenti). Baseline d'**igiene** RI-BASELINATA 224 → 227 fingerprint**:
  C1 segnalava "3 duplication NUOVO" fra `turn/route.ts` ↔ `generate-description/route.ts` e
  `api/generate/route.ts` — tutti file **già su `main`**, sfuggiti al gate di M3 (che chiuse a `dup:228`
  0-nuove; il route M3 è cambiato dopo). **Contro-prova anti-mascheramento eseguita** (regola M2/M3):
  rimossi i file del macrotask (backup+sha256, ripristino verificato identico) → jscpd dà **230 dup
  IDENTICI, stessi 3 blocchi**, e **0 cloni coinvolgono `suggest-offerings`** ⇒ delta d'igiene del
  macrotask = **0**, ratchet legittimo (non mascheramento). Refactor alla radice scartato per scope:
  i 3 cloni vivono in `turn/route.ts`, che **`remove-chat` (OGW-601) elimina**. Metodo: fingerprint presi
  da `control1Hygiene` (mai `capture --hygiene`), aggiunti al set esistente, poi **stesso oracolo rieseguito**
  → C1 green `[dead-code:0 dup:230 cycle:0 twin:0]`.
- **Nota sulla baseline d'igiene (ereditata, non toccare):** `hygiene-baseline.json` porta
  `"project": "eval/reference-app"` (residuo della cattura originale su una fixture della skill) e per
  questo i `location.file` dei finding d'igiene escono con quel prefisso spurio — **i path reali sono
  relativi al repo** (verificato lanciando `run_dupcheck.mjs` a mano). Cambiare `project` invaliderebbe
  tutti i fingerprint: si legge attraverso il prefisso, non lo si corregge.

### Lezioni build M1 `ai-usage-guard` (2026-08-18)

- **Baseline STALE all'inizio build → ri-catturala SEMPRE (§4 dovuto).** La baseline (Aug 6/16) era più
  vecchia del repo → il gate segnalava rumore pre-esistente come "nuovo" (2 dup fra `SESSION-STATE.md` di
  ALTRI blueprint + 3 secret FP GITIGNORATI: `.env.local`, `siti css/*.txt`). Prima di attribuire finding
  al macrotask, **verifica `location.file`** (nessuno dei miei 4 file toccato) e `git check-ignore`; poi
  ricattura oracle-driven: sposta i file del macrotask FUORI dal repo → `capture(repo, ['gitleaks',
  'rls-check','osv'])` in `.trueline/checkpoint-baseline.json` come **ARRAY** (`Object.values(snap.findings)`,
  NON lo snapshot) + `capture(repo, ['jscpd'])` in `.trueline/hygiene-baseline.json` (snapshot) → ripristina
  → il driver conferma delta 0. `hygiene-baseline.json` è VERSIONATO (committato); `checkpoint-baseline.json`
  è gitignorato (locale).
- **RLS di un contatore anti-abuso = APPEND-ONLY, per sicurezza.** Niente policy UPDATE/DELETE per
  `authenticated`: con DELETE l'utente azzererebbe il contatore per aggirare il cap; con UPDATE
  falsificherebbe `used_at`. Cleanup solo via cascade. Vale per ogni futuro contatore/ledger anti-abuso.
- **Checkpoint decomposto (driver `.trueline/ogw-checkpoint.mjs`, gitignorato):** import `control1Hygiene`/
  `control2Security` reali + `loadHygieneBaseline`/`classify`/`loadManifest`/`loadBaseline`; `blueprintDir`
  passato ma gate arch no-op (nessun `architecture:`, OGW-D6). **C3+C4 = `vitest run` completo** (1725/1725,
  ~5 min < cap → niente shard). Verdetto dai campi `.green`, mai exit code. Foreground funziona; monolitico
  in background = `0xC0000142`.
- **Migrazione DB ≠ deploy app.** Il push su `main` deploya l'app su Vercel ma NON applica le migrazioni a
  Supabase Cloud. `20260818000100` va applicata al cloud (`supabase db push`) **prima di OGW-303** (il 1°
  endpoint che usa la tabella). Non urgente finché nessun endpoint la consuma.

### Lezioni build M2 `offerings-editor` (2026-08-18)

- **Integrazione UI di un componente riorganizzato a valle → rimandala.** L'`OfferingsEditor` è pronto e
  testato, ma cablarlo nel `BriefPanel` legacy avrebbe richiesto di riscrivere il test di sicurezza T-151
  (`onboarding-ui.test.tsx`) — che `wizard-shell` (OGW-501) riorganizza comunque. Gate umano → integrazione
  demandata a OGW-501. Il componente NON è dead-code: knip lo vede usato dai test (`tests/**` è nel `project`).
- **AC "senza far fallire il salvataggio" vive al layer di dominio, non all'endpoint.** `upsertBrief` fa
  `BriefUpdateSchema.safeParse` → **400 sull'intera patch** su una voce d'offerta malformata; lo scarto
  campo-per-campo (che mantiene gli altri campi) è di `applyBriefUpdate`. Il target test lo esercita lì e
  lo **dichiara** (L-COL-006). Regola generale: leggi DOVE un AR è realmente osservabile prima di scegliere
  il livello del test.
- **Rebaseline d'igiene: usa i fingerprint del GATE, non di `capture`.** `baseline.mjs capture --hygiene` e
  `control1Hygiene` possono calcolare fingerprint **diversi per lo stesso clone** (visto sul dup SQL al
  limite dei 50 token) → un pre-esistente resta "nuovo" per sempre. Rimedio robusto: `control1Hygiene(repo,
  {baseline:∅}).findings.map(f=>f.fingerprint)` → scrivi `{fingerprints:[…]}` (formato che `loadHygieneBaseline`
  legge). Prima **prova che 0 cloni coinvolgono i file del macrotask** (contro-prova anti-mascheramento).
- **`classify(repo)` ritorna la STRINGA id** (`'supabase-jsts'`), non un oggetto → `loadManifest(ecoId)` diretto;
  con `eco.id` (undefined) il manifest è null e il gate **salta jscpd in silenzio** (C1 falsamente verde senza dup).
- **Gate visivo di un componente non ancora cablato = preview isolata usa-e-getta.** Route temporanea
  `src/app/[locale]/<name>/page.tsx` (client, monta il componente in `Card` con dati d'esempio) + `next dev`
  + screenshot Chrome DevTools, poi RIMUOVI la route. Gotcha: una cartella con prefisso **`_`** è *private
  folder* di Next App Router → **404** (usa un nome senza underscore).
- **`git stash -u`/`pop` converte LF→CRLF** (autocrlf on): dopo il pop i file "risultano modificati" per solo
  EOL (`diff` ignorando `\r` è vuoto). Ripristina i **byte testati** dai backup `.bak` (verifica sha256) prima
  di committare, così il diff resta pulito.

### Lezioni build M3 `generate-description` (2026-08-18)

- **Dup del blocco "deriva account_id" → deriva l'account dalla riga `sites`, non da `owner_id`.** Il primo
  `ai-usage.ts` copiava verbatim `getUser + accounts.select('id').eq('owner_id',…).single()`, blocco già
  duplicato (in baseline) fra `briefs.ts`/`sites.ts`/`generations.ts` → C1 rosso (1 dup nuova). Estrarre un
  helper condiviso avrebbe richiesto di rifattorizzare 3 file P1/P2 (l'helper stesso clonerebbe finché una
  copia inline resta). Rimedio a **scope contenuto e più corretto**: per l'INSERT ricava `account_id` da
  `sites.select('account_id').eq('id', siteId)` (coerente con la FK composita `(account_id,site_id)→sites`);
  blocco diverso → niente clone, nessun file P1/P2 toccato. Più un builder interno unico per `countTotal`/
  `countSince` (la finestra è solo un `.gte('used_at',…)` in più) → elimina il self-clone.
- **Ri-baseline d'igiene VIETATA se il clone coinvolge un file del macrotask** (contro-prova M2): è
  mascheramento, non ratchet. Si risolve il clone alla radice (sopra), non spostando la baseline.
- **Turbopack `next dev` crasha "Jest worker … child process exceptions" sotto stress** (dopo suite+build+
  checkpoint sulla stessa macchina): NON è un errore del codice (il log non ha `Module not found`/sintassi).
  Rimedio: **riavvio pulito** di `next dev` (`taskkill` dei node sulle porte 312x + restart) → compila e
  rende. Il gate visivo con preview isolata resta il metodo M2 (route senza `_`, rimuovila dopo).
- **Consume-on-success STRETTO all'endpoint AI:** `recordAiUsage` SOLO su `result.ok===true`. Output
  fuori-forma (vuoto/oltre tetto) e confine che lancia = **502 loggato, nessun consumo**; `checkAiBudget`
  PRIMA (429 al cap, modello mai chiamato). `now` prelevato UNA volta e passato a check+record.
- **Riuso `OnboardingLlmPort` con `tools: []`** per `generateDescription`: nessun secondo confine LLM da
  sorvegliare (P1-D7); il provider reale `onboardingLlmPort` funziona senza modifiche. `vertical` (enum)
  nel system, `phrase` (non fidato) nel ruolo user.
- **knip: un `type` esportato ma usato solo nel file è dead-code** (`Unused exported types`) → renderlo
  LOCALE (structural typing: il chiamante passa un oggetto conforme senza importarlo), no export speculativo.

### Lezioni build M4 `suggest-offerings` (2026-08-22, sessione ripresa)

- **Ripresa di una sessione interrotta: ricostruisci lo stato dagli ARTEFATTI, non dalla memoria.**
  `git status` (file uncommitted) + `SESSION-STATE` (macrotask atteso) + il **timestamp dei file in
  `.trueline/`** dicono dove si era fermata: qui `dbg-c1.mjs` (l'ultimo file scritto, 18:32) indicava che
  la sessione stava indagando proprio il C1 rosso. Prima di ri-verificare, **ri-esegui tutto da zero**
  (tsc/eslint/knip/target/suite/build/checkpoint): nessun verde ereditato per sentito dire (L-COL-002).
- **Un finding "nuovo" che non nomina nessun file del macrotask va CONTRO-PROVATO, non creduto.** La
  contro-prova è misurare l'oracolo sullo **stato base** (file del macrotask rimossi, i18n a HEAD) e
  confrontare: identico ⇒ debito pre-esistente, delta 0. Vale in entrambe le direzioni — è la stessa prova
  che in M3 VIETÒ la ri-baseline (lì il clone toccava il macrotask) e che qui la AUTORIZZA.
- **jscpd non è stabile fra macrotask vicini.** Aggiungere un file simile ai precedenti ri-organizza i
  cluster: un clone già visto può ripresentarsi con `startLoc/endLoc` diversi ⇒ **fingerprint diverso ⇒
  "nuovo"** anche senza codice nuovo. Non attribuirlo al macrotask senza la contro-prova sopra.
- **Tool-use vs testo al confine LLM.** Quando l'output del dominio è una **lista** (non prosa), usare lo
  strumento e validarne l'input è più robusto del parsing di testo: il tetto strutturale (niente `price`
  nell'`input_schema`) fa metà del lavoro anti-invenzione, e `.strip()` di zod chiude l'altra metà
  ignorando i campi non dichiarati **senza scartare la voce** (una voce con prezzo sopravvive, il prezzo no).
- **`vitest run` completo supera i 10 minuti sotto carico** (267s a freddo, oltre 600s dopo suite+build+
  dev server sulla stessa macchina): lanciarlo **in background** e leggere il log, invece di far scadere il
  comando in foreground. Il gotcha Turbopack di M3 si ripresenta identico (riavvio pulito).
- **`next dev` non muore col wrapper `npx`.** Fermare il task di shell lascia vivo il processo Next (che poi
  rifiuta un secondo server: *"Another next dev server is already running"*): chiudi per **PID sulla porta**
  (`Get-NetTCPConnection -LocalPort … | Stop-Process`), non solo il comando di shell.

## 6. Copertura dichiarata

- **`ai-usage-guard` (OGW-101/102)** — target_tests coperti: `tests/onboarding-ai-usage-rls.test.ts`
  (AC-101-1/2/3, **RLS provata a runtime** con oracolo indipendente anti-placebo; isolamento A→B
  simmetrico + scrittura cross-tenant negata su 2 fronti RLS 42501 e FK composita 23503) +
  `tests/onboarding-ai-budget.test.ts` (AC-102-1/2/3/4, gating deterministico fake-port, no `Date.now`).
  **Mutazioni 2/2 UCCISE** (ripristino backup+sha256): cap dominio `>=maxTotal`→`+1000` ⇒ AC-102-2 rosso;
  RLS `is_account_member`→`using(true)` sulla SELECT ⇒ AC-101-2 rosso (A vede le righe di B). Checkpoint
  decomposto 4/4 verde. Nessun gate visivo (macrotask DB+dominio, senza UI).
- **`offerings-editor` (OGW-201/202)** — target_tests coperti: `tests/onboarding-offerings-patch.test.ts`
  (AC-201-1 offerte valide accettate dal gate `BriefUpdateSchema` e leggibili; AC-201-2 voce fuori-forma
  scartata campo-per-campo da `applyBriefUpdate` senza far fallire gli altri campi — livello dichiarato) +
  `tests/onboarding-offerings-editor.test.tsx` (AC-202-1 add/edit/remove→onChange con preservazione dei
  campi non toccati; AC-202-2 etichetta da `resolveOfferings` non fissa; AC-202-3 hint prezzo condizionale
  su `show_price`; AC-202-4 anti-injection: payload solo in `value`, nessun `img`/`a` iniettato). **Mutazioni
  2/2 UCCISE** (ripristino backup+sha256): name via `innerHTML` ⇒ AC-202-4 rosso; etichetta fissa `'Menu'` ⇒
  AC-202-2 rosso. Checkpoint decomposto 4/4 verde. **Gate visivo umano APPROVATO** (preview isolata).
  **Integrazione nel flusso NON coperta qui** (demandata a OGW-501, §2).
- **`generate-description` (OGW-301/302)** — target_tests coperti: `tests/onboarding-generate-description.test.ts`
  (AC-301-1 output non vuoto entro `BRIEF_LIMITS.description`; AC-301-2 vuoto/oltre-tetto → `ok:false`;
  AC-301-3 il system prompt passato alla porta contiene la clausola anti-invenzione + `tools:[]` + la
  `phrase` non entra nel system) + `tests/onboarding-generate-description-route.test.ts` (AC-302-1 guardie
  403/404/401 senza chiamare il modello; AC-302-2 200 + contatore +1 col vertical del brief; AC-302-3 429 al
  cap senza modello né incremento; + consume-on-success su output fuori-forma/confine-lancia; + body 400) +
  `tests/onboarding-generate-description-ui.test.tsx` (AC-302-4 proposta editabile NON salvata senza conferma
  esplicita; + cap disabilita il pulsante con messaggio; + anti-injection T-151). **Mutazioni 5/5 UCCISE**
  (backup+sha256): salto gate 429 ⇒ AC-302-3 rosso; `if(!result.ok)`→`if(false)` (consume su fuori-forma) ⇒
  route rosso; rimozione scarto `empty` ⇒ AC-301-2 rosso; generazione che auto-salva ⇒ AC-302-4 rosso;
  clausola anti-invenzione rimossa ⇒ AC-301-3 rosso. Checkpoint decomposto 4/4 verde. **Gate visivo umano
  APPROVATO** (preview isolata, 3 stati). **Integrazione nel flusso NON coperta qui** (→ OGW-501).
- **`suggest-offerings` (OGW-401/402)** — target_tests coperti: `tests/onboarding-suggest-offerings.test.ts`
  (AC-401-1 almeno una voce con `name` non vuoto e senza prezzo; AC-401-2 voci fuori-forma scartate, restano
  le valide; AC-401-3 un `price` proposto è ignorato e la voce sopravvive; + risposta senza `tool_use` → lista
  vuota; + la `description` non fidata resta nel ruolo user) + `tests/onboarding-suggest-offerings-route.test.ts`
  (AC-402-1 200 coi suggerimenti e contatore +1 con `kind: suggest_offerings`; AC-402-2 429 al cap senza
  modello né incremento; AC-402-4 guardie same-origin/sessione/proprietà, mai il modello; + zero suggerimenti
  validi = 502 senza consumo; + confine che lancia = 502 senza consumo; + body con chiavi extra = 400) +
  `tests/onboarding-suggest-offerings-ui.test.tsx` (AC-402-3 solo la voce confermata esce via `onAccept`, le
  altre restano pendenti e non entrano; + scarto; + `atCap`; + anti-injection T-151; + errore di suggerimento).
  **Mutazioni 5/5 UCCISE** (backup+sha256, ripristino verificato): propagazione del `raw` col prezzo ⇒ AC-401-3
  rosso; voci fuori-forma accettate ⇒ AC-401-2 rosso; auto-`onAccept` alla proposta ⇒ AC-402-3 rosso; gate 429
  saltato ⇒ AC-402-2 rosso; `guardOwnedSite` neutralizzata ⇒ AC-402-4 rosso. Checkpoint decomposto 4/4 verde
  (C1 dopo ri-baseline legittima, §4). **Gate visivo umano APPROVATO** con rifinitura (pulsante primario + ✨).
  **Integrazione nel flusso NON coperta qui** (demandata a OGW-502, §2).
- Da compilare a ogni `session-end` col macrotask chiuso (target_tests coperti, mutazioni, gate).
- **NON coperto per costruzione (L-COL-006)**: la qualità *editoriale* della copy generata e l'ovvietà
  del confine "placeholder da personalizzare" non sono oracolabili → gate visivo umano. Foto reali e resa
  per-settore delle offerte fuori scope (roadmap "settori").

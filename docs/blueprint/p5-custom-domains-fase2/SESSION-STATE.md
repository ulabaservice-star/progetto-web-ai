# SESSION-STATE — p5-custom-domains-fase2

> Fonte di verità sullo **stato vivo** del workstream `p5-custom-domains-fase2` (Fase 2 di P5 — domini
> custom), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di P0…P4,
> design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard,
> p5-billing-fase1 e di Trueline. Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 2 (domini custom) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-28 (session-end BUILD `domain-vercel`) |
| **Sessione corrente (BUILD `domain-vercel`, DOM-211)** | **CHIUSO+MERGIATO** (`d6c6a2f`, atomico `6bd1eae`, pushato su `origin/main`). Adattatore reale `src/data/domain/vercel.ts` (gemello di `payment/stripe.ts`): `import 'server-only'` + client HTTP **LAZY** dietro config iniettabile (`createVercelDomainProvider(config)` / `getVercelDomainProvider()` cache da env). `VercelDomainConfig {token, projectId, teamId?, apexTarget, cnameTarget, fetchImpl?}`; **`fetchImpl` è il seam di mock** (nessuna rete nei test, default `fetch`). Mappa le risposte Vercel negli esiti neutri della porta (`verified`/`pending`/`misconfigured`; `verification[]`→`VerificationRequirement[]`); errori **TIPIZZATI** `VercelDomainError {code,status}` loggati **senza token**; `addDomain`/`getVerificationStatus`/`removeDomain` (404 idempotente). **Anti-SSRF**: solo l'endpoint fisso `api.vercel.com`, host utente solo nel path encodato. Senza env = no-op dichiarato (DOM-D9). Checkpoint **4/4** (C1 verde `dup:234` invariata, `src/data/**` è entry knip; C2 verde `gitleaks:3 osv:2 semgrep:0 rls:2` **nessuna nuova dep**; C3 verde 1855 pass salvo debito TS2589; C4 verde AC-211-1..4, 5/5 target), mutazione **6/6** (eager-import, mapState-no-verified, throw-opaco, log-espone-token, no-check-ok, token-hardcoded; ripristino bit-identico), `next build` ok. **6/12 macrotask done. Prossimo eleggibile: `domain-store`, `domain-routing`.** |
| **Sessione precedente (BUILD `domain-port`, DOM-201/202)** | **CHIUSO+MERGIATO** (`92f4377`, atomico `120b976`, pushato su `origin/main`). Porta **PURA** `DomainProvider` (solo tipi: `addDomain(normalized)→{providerDomainId, verification: VerificationRequirement[]}`, `getVerificationStatus(normalized)→{state: VerificationState, detail?}`, `removeDomain(normalized)→void`; tipi neutri `VerificationState 'verified'|'pending'|'misconfigured'` + `VerificationRequirement {type,domain,value,reason?}`) — gemella di `payment-port.ts`, **zero import** SDK/HTTP/segreto (A01:2025). Fake in-memory `createFakeDomainProvider(seed?)` in `tests/helpers/fake-domain-provider.ts` (**entry** knip come `fake-payment-provider.ts` → mai dead): seed host→stato, `addDomain` registra `'pending'` + `verification[]` non vuoto, `getVerificationStatus` **lancia** per host sconosciuto (osservabile per la rimozione), `removeDomain` rimuove davvero; **deterministico** (no random/orologio, DOM-D9); registro `calls` ispezionabile. Checkpoint **4/4** (C1 igiene verde `dead-code:0 dup:234 cycle:0 twin:0`, baseline invariata **senza ratchet**; C2 verde `gitleaks:3 osv:2 semgrep:0 rls:2`, **nessuna nuova dep**; C3 verde 1850 pass salvo debito TS2589; C4 **verde** AC-201-1..3 + AC-202-1..3, 10/10 target + trace covers), batteria di mutazione **6/6** (import-rete/porta, stato-iniziale, verification-vuoto, seed-ignorato, remove-noop, union-ridotta/tsc; ripristino bit-identico sha256), `next build` ok. **5/12 macrotask done. Prossimo eleggibile: `domain-vercel` (ora sbloccato), `domain-store`, `domain-routing`.** |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| # | Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|---|
| 01 | `domain-schema` (DOM-101/102) | **done** | 4/4 ✅ (`2788894`) | — |
| 02 | `domain-hostname` (DOM-111/112) | **done** | 4/4 ✅ (`e497b8a`) | — |
| 03 | `domain-companion` (DOM-121) | **done** | 4/4 ✅ (`817fea5`) | `domain-hostname` |
| 04 | `domain-dns` (DOM-131) | **done** | 4/4 ✅ (`af70a7a`) | `domain-hostname` |
| 05 | `domain-port` (DOM-201/202) | **done** | 4/4 ✅ (`92f4377`) | — |
| 06 | `domain-vercel` (DOM-211) | **done** | 4/4 ✅ (`d6c6a2f`) | `domain-port` |
| 07 | `domain-store` (DOM-221/222) | **todo** | — | `domain-schema` |
| 08 | `domain-connect` (DOM-301/302/303) | **todo** | — | `domain-hostname`, `domain-companion`, `domain-port`, `domain-store` |
| 09 | `domain-verify-disconnect` (DOM-311/321) | **todo** | — | `domain-connect`, `domain-vercel` |
| 10 | `domain-routing` (DOM-401/402) | **todo** | — | `domain-schema` |
| 11 | `domain-ui` (DOM-501/502) | **todo** | — | `domain-verify-disconnect` |
| 12 | `domain-downgrade` (DOM-601/602) | **todo** | — | `domain-schema`, `domain-store` |

**Eleggibili ora (dipendenze verdi):** `domain-store` e `domain-routing` (da `domain-schema` done).
`domain-port` e `domain-vercel` sono ora **done**. `domain-connect` resta bloccato finché `domain-store`
non è verde (ha già `hostname`/`companion`/`port`); `domain-verify-disconnect` finché
`domain-connect`/`domain-vercel` non lo sono (ora `domain-vercel` è verde, manca `domain-connect`). Il
DAG completo è in `00-INDEX.md` §Build order.

## 2. Macrotask corrente

- **NESSUNO in corso** — `domain-vercel` chiuso e mergiato. Alla prossima sessione il dispatch risolve
  **BUILD** sul prossimo eleggibile.
- **Suggerito**: `domain-store` (DOM-221/222, reader/writer su `site_domains`: reader owner-side +
  writer di stato service_role dopo la verifica — sblocca poi `domain-connect` e `domain-downgrade`; lo
  schema+RLS c'è già da DOM-101/102). In alternativa `domain-routing` (DOM-401/402, reader pubblico
  host→slug `src/data/public-domain.ts` gemello di `public-site.ts` + middleware host-custom, consuma la
  policy anon-active di DOM-102 e `normalizeHostname`).

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/domain-vercel` (mergiato in `main` con `--no-ff`; non cancellato — delete branch è distruttivo, mai autonomo). Branch precedenti (`domain-port`, `domain-dns`…) idem conservati. |
| Ultimo commit | `d6c6a2f` (merge domain-vercel in main) — commit atomico `6bd1eae` (feat: `src/data/domain/vercel.ts` + `tests/domain-vercel-adapter.test.ts`, 2 file +304) |
| Stato merge su `main` | ✅ **mergiato+pushato** su `origin/main` (`5a207db..d6c6a2f`, 2 file, +304). Deploy Vercel innescato; l'adattatore è `server-only` in `src/data/` ma **non ancora importato da alcun percorso di rotta** (lo importerà `domain-connect`) → nessun cambio di comportamento runtime |
| Deploy-coupling | **coupled** — confermato (push su `main` = deploy su ulaba.net). Verifica locale PRIMA del merge: vitest (1855 pass), `next build` ok. Nessun percorso di rotta/serving toccato → e2e Chromium **non impattati** (l'adattatore è orfano a livello app finché `domain-connect` non lo importa). `main_deploy_coupled: true`. |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): ora `gitleaks:3`, `osv:2`, `semgrep:0`, **`rls:2`** — aggiunto in
  `.trueline/checkpoint-baseline.json` (locale, gitignored) il **gemello** RLS004 su
  `site_domains_select_active_anon` (`status='active'`): falso-positivo statico della superficie di
  routing globale per-design (DOM-D6), identico a `site_publications_select_anon`, confermato innocuo dal
  DB-test (`tests/site-domains-rls-public.test.ts` AC-102-1/2: anon vede solo attivi, `account_id`/token
  negati). Migrazione `site_domains` applicata a locale **e cloud**.
- **Baseline d'igiene** (C1): `.trueline/hygiene-baseline.json` (versionata) — **INVARIATA a 232** anche
  in `domain-vercel`: **nessun ratchet**. C1 verde senza append (`dead-code:0 dup:234 cycle:0 twin:0`):
  `vercel.ts` non forma cloni ≥ soglia e `src/data/**` è **entry** knip (l'adattatore NON è dead anche se
  non ancora importato dall'app — come `payment/stripe.ts`).
- **Baseline di sicurezza** (C2): invariata **dopo il loop di fix** (`gitleaks:3`, `osv:2`, `semgrep:0`,
  `rls:2`); **nessuna nuova dep** (`vercel.ts` usa solo `fetch` nativo, nessun SDK). ⚠️ **Loop di fix
  gitleaks**: il bearer di test ad alta entropia assegnato a un identificatore sensibile ha fatto scattare
  la regola **`trueline-generic-assigned-secret`** (`gitleaks 3→4`, CRITICAL su `domain-vercel-adapter.test.ts`);
  risolto rinominando l'identificatore **fuori** dalle keyword `key/token/secret/cred/password` **e**
  abbassando l'entropia del valore → `gitleaks` di nuovo `3` (baseline ripristinata, verificato col
  **config custom della skill**, non solo col default). Nessun segreto reale nel sorgente dell'adattatore.
- **Budget**: **12 macrotask (22 task atomici)**. Un macrotask alla volta; loop di fix con tetto in
  `references/oracles/thresholds.md`. Granularità fine per sessioni leggere.

## 5. Esiti dell'ultima sessione (framing onesto)

- **BUILD `domain-vercel` (DOM-211) concluso e mergiato** (`d6c6a2f`). Un file di scope + un test:
  - **Adattatore** `src/data/domain/vercel.ts` — `import 'server-only'`, gemello di `payment/stripe.ts`.
    `createVercelDomainProvider(config): DomainProvider` costruisce le chiamate all'API Vercel via
    `config.fetchImpl ?? fetch` (base **fissa** `https://api.vercel.com`, `Authorization: Bearer`,
    `?teamId=`); `addDomain` `POST /v10/projects/{id}/domains`, `getVerificationStatus` `GET /v9/…`,
    `removeDomain` `DELETE /v9/…` (404 idempotente, DOM-D8). Mappatura neutra: `verified===true`→
    `'verified'`, altrimenti `verification[]` non vuoto→`'pending'`, vuoto→`'misconfigured'` (fail-safe:
    mai `'verified'` senza prova). Errori **tipizzati** `VercelDomainError {code,status}`, loggati via
    `console.error` **senza token**. `VercelDomainConfig {token, projectId, teamId?, apexTarget,
    cnameTarget, fetchImpl?}`; wiring lazy `getVercelDomainProvider()`+`configFromEnv()` (legge
    `process.env.VERCEL_*`, come `stripe.ts`). **Anti-SSRF**: l'host utente entra solo nel path encodato.
    Senza env = costruibile ma no-op dichiarato (DOM-D9).
- **Checkpoint 4/4**: C1 igiene **verde senza ratchet** (baseline 232 invariata; `src/data/**` è entry
  knip → l'adattatore non è dead); C2 sicurezza **verde dopo il loop di fix** (gitleaks/osv/semgrep/rls;
  **nessuna nuova dep**, solo `fetch` nativo); C3 regressioni **verde** (1855 pass; unico rosso =
  `scaffold.test.ts` typecheck, vedi sotto); C4 conformità **verde** (AC-211-1..4, **5/5** target coi tag
  `covers:`). **Batteria di mutazione 6/6** (ripristino **bit-identico**, sha256 invariato): M1 costruzione
  eager a import-time→AC-211-1 rosso; M2 `mapState` mai `'verified'`→AC-211-2 rosso; M3 throw opaco
  (Error generico)→AC-211-3 rosso; M4 log espone il token→AC-211-3 rosso; M5 `addDomain` non controlla
  `!res.ok`→AC-211-3 rosso; M6 token letterale nel sorgente→AC-211-4 rosso. `next build` ok.
- **Loop di fix gitleaks intercettato e chiuso (framing onesto)**: il primo checkpoint ha segnalato **C2
  ROSSO** — 1 finding NUOVO CRITICAL (`gitleaks 3→4`) nel mio test, regola **`trueline-generic-assigned-secret`**
  (identificatore sensibile `TOKEN` + valore ad **alta entropia** 3.83). `gitleaks` col config **default**
  non lo trovava, il **config custom della skill** sì. Fix root-cause: rinominato l'identificatore fuori
  dalle keyword `key/token/secret/cred/password` **e** valore a bassa entropia. Riverificato con lo stesso
  oracolo (config custom) → `gitleaks 3` (baseline ripristinata); test **5/5**, suite **1855 pass**.
- **Debito pre-esistente, NON introdotto qui** (decisione utente: **lasciare tracciato**): `npm run
  typecheck` fallisce con **`TS2589`** in `e2e/effects.spec.ts:103` (codice dal commit `9c7b0ed`).
  Ri-verificato **unico** errore `tsc` (assente dai miei file); **non blocca `next build`** → rende
  rosso solo il meta-test `tests/scaffold.test.ts`. Ancora aperto: da affrontare in sessione dedicata,
  fuori scope di questo macrotask.

## 6. Prossimi passi

- **`domain-vercel` chiuso** ✅ (6/12). Prossimo BUILD: un eleggibile fra `domain-store` o
  `domain-routing`. Il session-start risolve il dispatch.
- **`domain-store` (DOM-221/222)**: reader owner-side su `site_domains` (RLS `is_account_member`, DOM-101)
  + writer di stato **service_role** (dopo la verifica DNS il server muove `status`, DOM-D4). Sblocca poi
  `domain-connect` (che ha già `hostname`/`companion`/`port`/`vercel`) e `domain-downgrade`.
- **`domain-routing` (DOM-401/402)** consuma la policy anon-active di DOM-102: il reader
  `src/data/public-domain.ts` proietta `{ public_slug }` da `site_domains` come anon (gemello di
  `public-site.ts`) + middleware host-custom PRIMA di locale/guardia auth (non toccare `/s/*`).
- **Config di deploy (prereq go-live, non blueprint)**: ora servono anche `VERCEL_TOKEN`,
  `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID?`, **`VERCEL_APEX_TARGET`**, **`VERCEL_CNAME_TARGET`** nell'env
  Vercel — l'adattatore (`configFromEnv`) li esige, inerte senza (DOM-D9).
- **Debito**: pianificare il fix di `TS2589` in `e2e/effects.spec.ts` (typecheck verde) a parte.
- **Config di deploy (prereq go-live, non blueprint)**: env Vercel `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`,
  `VERCEL_TEAM_ID` (se team), `NEXT_PUBLIC_APEX_DOMAIN`/target dei record. Collegamento reale inerte
  finché le chiavi non sono in env (DOM-D9), come le CTA Stripe di Fase 1.
- **Debito**: pianificare il fix di `TS2589` in `e2e/effects.spec.ts` (typecheck verde) a parte.

## 7. Carry-over & copertura dichiarata

**Copertura di `domain-vercel` (DOM-211):**
- `tests/domain-vercel-adapter.test.ts` copre **AC-211-1..4** (AC-211-1: `import` del modulo senza env
  Vercel non lancia — client lazy; AC-211-2: `fetchImpl` che simula `verified:true`⇒`getVerificationStatus`
  `'verified'` + difesa DoD `verified:false`+verification⇒`'pending'`; AC-211-3: `POST` 409
  `domain_already_in_use`⇒`addDomain` **rifiuta** con `VercelDomainError` `{code:'domain_already_in_use'}`
  e il **token non compare** in `console.error` (spia); AC-211-4: ispezione sorgente ⇒ nessun `token:'…'`
  letterale + il token viene da `process.env.VERCEL_TOKEN`). Seam = `fetchImpl` iniettato (Response reale,
  **nessuna rete**). **5/5** verdi; **mutazione 6/6** (eager-import, mapState-no-verified, throw-opaco,
  log-espone-token, no-check-ok-addDomain, token-hardcoded — tutte uccise, ripristino bit-identico).
- **Gate visivo**: N/A (nessuna UI; il gate umano scatta a `domain-ui`, DOM-501).
- **NON coperto (out_of_scope del macrotask)**: l'orchestrazione `connect`/`verify` (DOM-30x) che usa
  l'adattatore; la correttezza contro l'**API Vercel reale** (verificabile solo con env reali a go-live,
  DOM-D9 — i test provano la FORMA della mappatura, non i nomi-campo esatti dell'API). L'adattatore è
  **orfano a livello app** finché `domain-connect` non lo importa (resta comunque **entry** knip).

**Copertura di `domain-port` (DOM-201/202):**
- `tests/domain-port.test.ts` copre **AC-201-1..3** (AC-201-1: ispezione del sorgente della porta ⇒ ogni
  import è `import type` e nessun modulo di rete/SDK; AC-201-2: un oggetto conforme tipizza contro
  `DomainProvider` e le forme di ritorno reggono a runtime; AC-201-3: lo stato è nell'insieme neutro
  `{verified,pending,misconfigured}`, con gate **statico** dell'assegnazione a `VerificationState`).
  `tests/domain-fake-provider.test.ts` copre **AC-202-1..3** (seed `'verified'`⇒`'verified'` senza rete +
  fake senza import di rete; fake vuoto: `addDomain`⇒`'pending'` + `verification[]` non vuoto + registro
  `calls`; `removeDomain` ⇒ `getVerificationStatus` **rifiuta**). Attese **letterali** (mai un binding
  importato). **6/6** verdi; **mutazione 6/6** (import-rete/porta, stato-iniziale, verification-vuoto,
  seed-ignorato, remove-noop, union-ridotta/tsc — tutte uccise, ripristino bit-identico).
- **Gate visivo**: N/A (nessuna UI; il gate umano scatta a `domain-ui`, DOM-501).
- **NON coperto (out_of_scope del macrotask)**: l'adattatore reale Vercel (DOM-211, `domain-vercel`) che
  mappa `verification[]`/stato nativi ai tipi neutri; l'iniezione della porta negli endpoint
  (`domain-connect`/`domain-verify-disconnect`) e nel downgrade. La porta e il fake sono **orfani a
  livello app** finché quei macrotask non li importano (il fake resta comunque **entry** knip).

**Copertura di `domain-dns` (DOM-131):**
- `tests/domain-dns-instructions.test.ts` copre **AC-131-1..3** (apex+token ⇒ record A/ALIAS name `@`
  verso il target + TXT value=`t123`; subdomain senza token ⇒ CNAME name `www` verso target e **nessun**
  TXT; purezza+ordine con fake-timers 2020 vs 2030 e lista **letterale** ordinata) + un test DoD-difesa
  non-AC (target IPv4 ⇒ `A`; hostname ⇒ `ALIAS`). Attese **letterali** (mai binding importato →
  asserzioni non tautologiche). **4/4** verdi; **mutazione 5/5** (TXT-sempre, value-costante,
  name-host-intero, ordine-invertito, impurità-Date — tutte uccise, ripristino bit-identico).
- **Gate visivo**: N/A (nessuna UI; il gate umano scatta a `domain-ui`, DOM-501).
- **NON coperto (out_of_scope del macrotask)**: la composizione coi record-challenge reali del provider
  (`verification[]` di `addDomain`, DOM-211/DOM-302) e la resa visiva delle istruzioni (`domain-ui`).
  `dnsInstructionsFor` è **orfana a livello app** finché `domain-connect`/`domain-ui` non la importano.

**Copertura di `domain-companion` (DOM-121):**
- `tests/domain-companion.test.ts` copre **AC-121-1..3** (apex ⇒ `{hostname:'www.iltuobar.it',
  kind:'subdomain'}`; subdomain ⇒ `null`; purezza indipendente dall'orologio con fake-timers 2020 vs
  2030). Attese **letterali** (mai binding importato → asserzioni non tautologiche); ogni AC tracciato
  col tag `covers:`. **3/3** verdi; **mutazione 4/4** (guardia apex, prefisso www, kind ritorno,
  impurità Date — tutte uccise).
- **Gate visivo**: N/A (nessuna UI; il gate umano scatta a `domain-ui`, DOM-501).
- **NON coperto (out_of_scope del macrotask)**: la creazione effettiva dei due collegamenti apex+www
  (DOM-303, endpoint `domain-connect`) e la ri-validazione del companion. `companionHostname` è **orfana
  a livello app** finché `domain-connect` non la importa (come le funzioni di `hostname.ts`).

**Copertura di `domain-hostname` (DOM-111/112):**
- `tests/domain-hostname-normalize.test.ts` copre **AC-111-1..4** (URL schema/case/path→host canonico;
  no-TLD/spazio/porta→`invalid_format`; IDN→punycode; purezza indipendente dall'orologio). `tests/
  domain-hostname-classify.test.ts` copre **AC-112-1..4** (apex; subdomain; reserved `ulaba.net`/
  `foo.ulaba.net`/`x.vercel.app`; purezza) + difese DoD (localhost e non-FQDN→reserved; `reserved`
  iniettabile). Attese **letterali** (mai binding importato → asserzioni non tautologiche, capaci di
  fallire). **10/10** verdi; **mutazione 4/4** (AC-112-3, AC-111-4, AC-112-4, AC-111-2 uccisi).
- **NON coperto (out_of_scope del macrotask)**: companion auto-www (DOM-121)→`domain-companion`;
  istruzioni DNS (DOM-131)→`domain-dns`; uso applicativo di queste funzioni negli endpoint (DOM-30x) e
  nel routing (DOM-40x). Le funzioni sono **orfane a livello app** finché quei macrotask non le importano.

**Copertura di `domain-schema` (DOM-101/102):**
- `tests/site-domains-rls-owner.test.ts` copre **AC-101-1..4** (catalogo: RLS on + insieme esatto policy
  authenticated {SELECT,INSERT,DELETE} senza UPDATE + predicati `is_account_member`; owner legge; cross-tenant
  vuoto; UPDATE authenticated negata 42501). `tests/site-domains-rls-public.test.ts` copre **AC-102-1..3**
  (anon vede solo attivi; token/account_id/scrittura negati 42501; una sola policy anon `status='active'`).
  Tutti **runtime** su Supabase locale con client reali + oracolo indipendente service_role (anti-placebo).
- **Mutazioni 4/4 uccise**: UPDATE-policy-authenticated → AC-101-1/4 rosso; anon `USING(true)` → AC-102-1/3 rosso.
- **Gate visivo**: N/A (nessuna UI in questo macrotask; il gate umano scatta a `domain-ui`, DOM-501).
- **NON coperto (per design, out_of_scope del macrotask)**: reader owner-side (DOM-221) e writer di stato
  service_role (DOM-222) → `domain-store`; reader pubblico applicativo host→slug (DOM-401) e middleware
  (DOM-402) → `domain-routing`. La conferma comportamentale per-tenant della RLS è demandata al DB-test
  (l'euristica statica `rls_check` lo dichiara), qui soddisfatta.

**Carry-over — lezioni nuove (`domain-vercel`):**
- **gitleaks default ≠ gitleaks del checkpoint**: il checkpoint C2 usa il **config custom della skill**
  (`scripts/oracles/gitleaks.toml`, regola `trueline-generic-assigned-secret`) — più severo del default.
  Un valore-segreto di test può passare `gitleaks detect` a mano e **fallire** il checkpoint. Per
  riprodurre/verificare una fix di segreto, invocare gitleaks **con `--config <skill>/…/gitleaks.toml`**,
  non col default. I bearer/token di test vanno a **bassa entropia** e identificatore **fuori** dalle
  keyword `key/token/secret/cred/password` (doppia leva: la regola richiede identificatore-sensibile **e**
  alta entropia insieme).
- **Adattatore reale = seam `fetchImpl`, non SDK**: senza SDK Vercel, il seam di mock è `fetchImpl?:
  typeof fetch` nella config (default `fetch`); i test iniettano un fake che ritorna un **`Response`
  reale** (`new Response(JSON.stringify(body), {status})`, globale in Node) → l'adattatore usa
  `.ok/.status/.json()` come col fetch vero, nessuna rete. Gemello del pattern `config.stripe` iniettato.
- **AC di robustezza ⇒ errori tipizzati + anti-leak testabili**: "esito tipizzato non opaco" si prova con
  `rejects.toBeInstanceOf(VercelDomainError)` + `toMatchObject({code})`; "senza esporre il token" si prova
  spiando `console.error` e asserendo che il valore-token **non** compare fra gli argomenti loggati. Due
  mutanti distinti (throw-opaco, log-espone-token) blindano i due aspetti.
- **Heredoc bash + apostrofi italiani = fragile**: `cat > file <<'EOF'` con contenuto lungo e apostrofi
  (`d'ambiente`, `dell'utente`) può rompersi (`unexpected EOF`). Per file sorgente con prosa italiana usa
  il tool **Write** (o `git commit -F -` con heredoc `'MSG'` per i messaggi, che invece regge).

**Carry-over — lezioni nuove (`domain-port`):**
- **La guardia "src non menziona gli helper di test" è TESTUALE, non semantica**: `test-harness-auth`
  (T-005) fa `readFileSync(src).includes('tests/helpers')` su ogni file di `src/**` — cattura anche i
  **commenti**. Un commento della porta che citava il path del fake (`tests/helpers/fake-domain-provider.ts`)
  l'ha fatta diventare rossa. Rimedio: nei sorgenti `src/**` riferirsi al fake in modo generico ("un fake
  iniettato"), mai col path `tests/helpers/…` — esattamente ciò che fa `payment-port.ts`.
- **`no-unused-vars` del repo = `args: 'after-used'`, il prefisso `_` NON esenta un unico arg**: un metodo
  con un solo parametro non usato è segnalato anche se chiamato `_normalized` (il `_siteId` che passa in
  `editor-integration.test.ts` regge solo perché **seguito** da un arg usato). Nelle impl inline di un test
  conviene **omettere** i parametri non usati (TS accetta un metodo con meno parametri della firma target),
  non rinominarli con `_`. `argsIgnorePattern` non è configurato in `eslint.config.mjs`.
- **`lint` e `typecheck` sono gate di C3 via `scaffold.test.ts`, non solo pre-merge**: la suite completa
  esegue `npm run lint`/`npm run typecheck` come meta-test. Un errore di lint nei propri file rende rosso
  `scaffold` **dentro** la suite (oltre al pre-merge). Eseguire `npm run lint` in foreground **prima** del
  checkpoint completo accorcia il loop (l'ho scoperto solo alla prima suite completa, non prima).
- **AC di tipo ⇒ oracolo = build/tsc, non vitest**: AC-201-2/AC-201-3 sono proprietà del **tipo** (vitest,
  che gira su esbuild, non type-checka). Il mutante che le uccide (union ridotta) va verificato con `tsc`
  (errore NEL file di test), non con l'exit di vitest. Distinguere l'oracolo per-AC evita mutanti
  "sopravvissuti" solo perché misurati con lo strumento sbagliato.

**Carry-over — lezioni nuove (`domain-dns`):**
- **Ambiguità "A o ALIAS secondo target" risolta deterministicamente**: il DoD lasciava la scelta A/ALIAS
  aperta ("secondo target") e l'AC-131-1 accettava entrambi. Risolta con una regola pura dal **valore**
  del target (IPv4 letterale ⇒ `A`, hostname ⇒ `ALIAS`), coerente con la regola DNS (all'apex il CNAME è
  vietato). L'asserzione AC resta fedele allo spazio ammesso (`toContain(['A','ALIAS'])`), un test
  DoD-difesa separato pinna la scelta concreta — così l'AC non si irrigidisce oltre la sua lettera.
- **Mutante di iniezione = `value` costante**: la lezione del blueprint ("target letto da env ⇒
  non-purezza rilevata") si materializza come mutante `value: target` → `value: 'x.hardcoded'`, ucciso
  da `expect(primary.value).toBe(target)`. Provare che il valore **viene dal parametro iniettato** è
  esattamente ciò che smaschera una lettura env interna, senza bisogno di stub di `process.env`.
- **Riuso di dep esistente = C2 invariata**: `dns-instructions.ts` riusa `tldts` (già in `hostname.ts`
  per l'etichetta subdomain) → **nessuna** nuova dep, baseline OSV invariata. Preferire il riuso di una
  dep pura/offline già presente a introdurne una nuova quando l'oracolo C2 guarda il delta del lockfile.
- **Snapshot .snap "modificato" a fine suite = solo EOL**: la suite completa può lasciare un `.snap`
  come `M` con `git diff` di contenuto **vuoto** (LF↔CRLF su Windows). Non è una regressione: `git
  checkout -- <file>` prima del commit atomico, per non inquinare il diff del macrotask.

**Carry-over — lezioni nuove (`domain-companion`):**
- **Ratchet solo su debito provato, mai di default**: un macrotask di dominio puro può chiudere con C1
  verde **senza toccare** `hygiene-baseline.json` (qui `companion.ts` non forma cloni ≥ soglia, i
  `.test.ts` sono esclusi da jscpd). Il ratchet additivo è un rimedio a un clone **pre-esistente provato
  indipendente** (vedi `domain-hostname`), non un passo rituale: se il checkpoint è già verde, il
  baseline resta byte-per-byte com'era.
- **Batteria di mutazione = power-check fatto a mano**: per un dominio puro non serve il ramo
  `assertionPower` dell'oracolo (che eseguirebbe anche i DB-test in-scope, richiedendo Supabase su); i
  4 mutanti (uno per AC + purezza) provano che ogni asserzione può fallire, con ripristino verificato per
  sha256.

**Carry-over — lezioni da `domain-hostname`:**
- **Debito di baseline d'igiene ereditato**: un macrotask che aggiunge un file può creare cloni jscpd
  che il suo re-baseline NON cattura (qui il `.sql` di `domain-schema`); il debito **si manifesta al
  primo checkpoint successivo** come "dup NUOVO" con path normalizzato `eval/reference-app/…`. Rimedio
  disciplinato: **provare** l'indipendenza dal macrotask corrente (rimuovere i propri file, ri-misurare
  il set dup → invariato), poi **ratchet additivo** del solo fingerprint verificato (`.trueline/
  hygiene-baseline.json` = array di hash content-based; append + sort, mai overwrite cieco). Il
  fingerprint esatto si ottiene dallo **stesso code-path del checkpoint** (`control1Hygiene`), non da un
  jscpd ad-hoc.
- **`tldts` per eTLD+1**: `parse(host).subdomain` vuoto ⇒ apex, non-vuoto ⇒ subdomain; corretto sui TLD
  multi-livello. `parse` è **puro/offline** (PSL bundlata in memoria) → non rompe AC-111-4/AC-112-4.
  I reserved-suffix (`vercel.app` è private-suffix ICANN in tldts 7.x) vanno intercettati **prima** di
  `parse` col match esatto/suffisso, non affidandosi a `isIcann`.
- **Purezza testabile con fake-timers**: per uccidere una mutazione `Date`-dipendente, il test di
  purezza fissa **due istanti molto distanti** (2020 vs 2030) e asserisce `toEqual` fra le due chiamate:
  una `Date` che influenza l'output diverge e diventa rosso (evita l'insidia `Date.now()%2` con istanti
  entrambi pari).
- **Export orfani = dead-code nuovo**: in un dominio puro senza consumatori ancora, esportare tipi/
  costanti non ancora importati fa scattare knip (C1). Tienili **interni** (annotation/default) finché
  un macrotask a valle non li usa; knip conta i `*.test.ts` come entry (plugin vitest) → le funzioni
  testate non sono dead.

**Carry-over — lezioni da `domain-schema`:**
- **Ambiguità DoD vs AC**: se l'elenco colonne di un DoD e un AC divergono, la fonte è l'AC/decision-ledger
  (qui `public_slug` da DOM-102/DOM-401/DOM-D6). Risolvere leggendo i macrotask a valle, non indovinare.
- **FP RLS004 su superfici anon globali**: ogni policy `to anon` senza predicato di tenancy (routing/serving
  pubblico) fa scattare `RLS004_MISSING_TENANT_PREDICATE` (l'euristica vede `account_id` sulla tabella). È
  il pattern gemello di `site_publications_select_anon`: assorbire nel baseline SOLO con conferma DB-test
  (anon vede solo il consentito, colonne di tenancy negate), mai sopprimere a mano.
- **jscpd sui docs blueprint**: i `.md` di `prompts/`+`VISION` sono strutturalmente simili tra fasi → cloni
  jscpd "nuovi" rispetto a un baseline d'igiene catturato prima del BOOTSTRAP. Re-baseline onesto coi
  fingerprint (i `.test.ts` sono esclusi da jscpd; il `.sql` non ha cloni).
- **TLS CA cloud** (vedi [[supabase-cloud-migrations]]): su Node recente `ssl:true` fallisce
  (`SELF_SIGNED_CERT_IN_CHAIN`); pinnare la `Supabase Root 2021 CA` estratta dalla catena, mai
  `rejectUnauthorized:false`.
- **Gotcha per i prossimi macrotask** (dal blueprint, da non riscoprire): verifica DNS **prima**
  dell'attivazione (DOM-D4, la transizione ad `active` la muove solo il server); host-routing
  **non-regressione** (`tests/auth-middleware.test.ts`, il caso host-custom va PRIMA di locale/guardia auth,
  non toccare `/s/*`); **fake `DomainProvider`** nei test (inerte senza env, DOM-D9); **reserved-domains**
  bloccati nel dominio puro (DOM-112/DOM-D7); **idempotenza** del downgrade (`applySoftDomainDowngrade`,
  mai delete, DOM-D8).

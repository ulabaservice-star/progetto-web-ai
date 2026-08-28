# SESSION-STATE — p5-custom-domains-fase2

> Fonte di verità sullo **stato vivo** del workstream `p5-custom-domains-fase2` (Fase 2 di P5 — domini
> custom), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di P0…P4,
> design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard,
> p5-billing-fase1 e di Trueline. Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 2 (domini custom) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-28 (session-end BUILD `domain-port`) |
| **Sessione corrente** | BUILD `domain-port` (DOM-201/202) — **CHIUSO+MERGIATO** (`92f4377`, atomico `120b976`, pushato su `origin/main`). Porta **PURA** `DomainProvider` (solo tipi: `addDomain(normalized)→{providerDomainId, verification: VerificationRequirement[]}`, `getVerificationStatus(normalized)→{state: VerificationState, detail?}`, `removeDomain(normalized)→void`; tipi neutri `VerificationState 'verified'|'pending'|'misconfigured'` + `VerificationRequirement {type,domain,value,reason?}`) — gemella di `payment-port.ts`, **zero import** SDK/HTTP/segreto (A01:2025). Fake in-memory `createFakeDomainProvider(seed?)` in `tests/helpers/fake-domain-provider.ts` (**entry** knip come `fake-payment-provider.ts` → mai dead): seed host→stato, `addDomain` registra `'pending'` + `verification[]` non vuoto, `getVerificationStatus` **lancia** per host sconosciuto (osservabile per la rimozione), `removeDomain` rimuove davvero; **deterministico** (no random/orologio, DOM-D9); registro `calls` ispezionabile. Checkpoint **4/4** (C1 igiene verde `dead-code:0 dup:234 cycle:0 twin:0`, baseline invariata **senza ratchet**; C2 verde `gitleaks:3 osv:2 semgrep:0 rls:2`, **nessuna nuova dep**; C3 verde 1850 pass salvo debito TS2589; C4 **verde** AC-201-1..3 + AC-202-1..3, 10/10 target + trace covers), batteria di mutazione **6/6** (import-rete/porta, stato-iniziale, verification-vuoto, seed-ignorato, remove-noop, union-ridotta/tsc; ripristino bit-identico sha256), `next build` ok. **5/12 macrotask done. Prossimo eleggibile: `domain-vercel` (ora sbloccato), `domain-store`, `domain-routing`.** |

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
| 06 | `domain-vercel` (DOM-211) | **todo** | — | `domain-port` |
| 07 | `domain-store` (DOM-221/222) | **todo** | — | `domain-schema` |
| 08 | `domain-connect` (DOM-301/302/303) | **todo** | — | `domain-hostname`, `domain-companion`, `domain-port`, `domain-store` |
| 09 | `domain-verify-disconnect` (DOM-311/321) | **todo** | — | `domain-connect`, `domain-vercel` |
| 10 | `domain-routing` (DOM-401/402) | **todo** | — | `domain-schema` |
| 11 | `domain-ui` (DOM-501/502) | **todo** | — | `domain-verify-disconnect` |
| 12 | `domain-downgrade` (DOM-601/602) | **todo** | — | `domain-schema`, `domain-store` |

**Eleggibili ora (dipendenze verdi):** `domain-vercel` (**ora sbloccato** da `domain-port` done),
`domain-store` e `domain-routing` (da `domain-schema` done). `domain-port` è ora **done**.
`domain-connect` resta bloccato finché `domain-store` non è verde (ha già `hostname`/`companion`/`port`);
`domain-verify-disconnect` finché `domain-connect`/`domain-vercel` non lo sono. Il DAG completo è in
`00-INDEX.md` §Build order.

## 2. Macrotask corrente

- **NESSUNO in corso** — `domain-port` chiuso e mergiato. Alla prossima sessione il dispatch risolve
  **BUILD** sul prossimo eleggibile.
- **Suggerito**: `domain-vercel` (DOM-211, adattatore reale `src/data/domain/vercel.ts` che implementa
  `DomainProvider` contro l'API Vercel con `import 'server-only'` + client LAZY su config iniettabile —
  gemello di `payment/stripe.ts`; mappa `verification[]`/stato nativi ai tipi neutri della porta; inerte
  senza env, DOM-D9). In alternativa `domain-store` (reader/writer su `site_domains`, lo schema c'è) o
  `domain-routing` (reader pubblico host→slug + middleware, consuma la policy anon-active di DOM-102 e
  `normalizeHostname`).

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/domain-port` (mergiato in `main` con `--no-ff`; non cancellato — delete branch è distruttivo, mai autonomo) |
| Ultimo commit | `92f4377` (merge domain-port in main) — commit atomico `120b976` (feat: `domain-port.ts` + `tests/helpers/fake-domain-provider.ts` + 2 test, 4 file +251) |
| Stato merge su `main` | ✅ **mergiato+pushato** su `origin/main` (`9859c28..92f4377`, 4 file, +251). Deploy Vercel innescato; porta+fake **non importati dall'app** (fake in `tests/`) → nessun cambio di comportamento runtime |
| Deploy-coupling | **coupled** — confermato (push su `main` = deploy su ulaba.net). Verifica locale PRIMA del merge: vitest (1850 pass), `next build` ok. Nessun file runtime dell'app toccato → e2e Chromium non impattati. `main_deploy_coupled: true`. |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): ora `gitleaks:3`, `osv:2`, `semgrep:0`, **`rls:2`** — aggiunto in
  `.trueline/checkpoint-baseline.json` (locale, gitignored) il **gemello** RLS004 su
  `site_domains_select_active_anon` (`status='active'`): falso-positivo statico della superficie di
  routing globale per-design (DOM-D6), identico a `site_publications_select_anon`, confermato innocuo dal
  DB-test (`tests/site-domains-rls-public.test.ts` AC-102-1/2: anon vede solo attivi, `account_id`/token
  negati). Migrazione `site_domains` applicata a locale **e cloud**.
- **Baseline d'igiene** (C1): `.trueline/hygiene-baseline.json` (versionata) — **INVARIATA a 232** anche
  in `domain-port`: **nessun ratchet**. Il checkpoint C1 è verde senza append (`dead-code:0 dup:234
  cycle:0 twin:0`, nessuna regressione NUOVA): `domain-port.ts`/il fake non formano cloni ≥ soglia, i
  `.test.ts` sono esclusi da jscpd e `tests/helpers/**` è **entry** knip (il fake NON è dead anche se
  importato solo dai test — come `fake-payment-provider.ts`). Ratchet **solo** su clone nuovo provato
  pre-esistente/indipendente — qui non ce n'è.
- **Baseline di sicurezza** (C2): invariata (`gitleaks:3`, `osv:2`, `semgrep:0`, `rls:2`); **nessuna nuova
  dep** in `domain-port` (porta = zero import; fake importa solo tipi interni), nessun segreto nel sorgente.
- **Budget**: **12 macrotask (22 task atomici)**. Un macrotask alla volta; loop di fix con tetto in
  `references/oracles/thresholds.md`. Granularità fine per sessioni leggere.

## 5. Esiti dell'ultima sessione (framing onesto)

- **BUILD `domain-port` (DOM-201/202) concluso e mergiato** (`92f4377`). Due file di scope + due test:
  - **Porta** `src/domain/domains/domain-port.ts` — **solo tipi** (dominio puro, **zero import**):
    `type DomainProvider` con `addDomain(normalized)→{providerDomainId, verification: VerificationRequirement[]}`,
    `getVerificationStatus(normalized)→{state: VerificationState, detail?}`, `removeDomain(normalized)→void`;
    tipi neutri `VerificationState = 'verified'|'pending'|'misconfigured'` e `VerificationRequirement =
    {type,domain,value,reason?}` (forma neutra del record-challenge). Gemella di `payment-port.ts`: i
    segreti vivono solo nell'adattatore reale (DOM-211, `server-only`), mai nella porta (A01:2025).
  - **Fake** `tests/helpers/fake-domain-provider.ts` — `createFakeDomainProvider(seed?)` in-memory,
    **senza rete**: `seed` registra host→stato; `addDomain` registra `'pending'` + `verification[]` non
    vuoto e ritorna `providerDomainId` deterministico; `getVerificationStatus` ritorna lo stato o
    **lancia** per host sconosciuto (rende osservabile la rimozione); `removeDomain` rimuove davvero.
    **Deterministico** (no `Math.random`/`Date`, DOM-D9): `providerDomainId`/`verification[]` derivano
    dall'host. Registro `calls` ispezionabile (gemello di `fake-payment-provider.ts`).
- **Checkpoint 4/4**: C1 igiene **verde senza ratchet** (§4: nessun clone/dead-code nuovo, baseline 232
  invariata; `tests/helpers/**` è entry knip → il fake non è dead); C2 sicurezza **verde** (gitleaks/osv/
  semgrep/rls; **nessuna nuova dep**); C3 regressioni **verde** (1850 pass; unico rosso = `scaffold.test.ts`
  typecheck, vedi sotto); C4 conformità **verde** (AC-201-1..3 + AC-202-1..3, **10/10** target coi tag
  `covers:`). **Batteria di mutazione 6/6** (ripristino **bit-identico**, sha256 di porta+fake invariati):
  M1 import di rete nella porta→AC-201-1 rosso; M2 stato iniziale `'verified'`→AC-202-2 rosso; M3
  `verification[]` vuoto→AC-202-2 rosso; M4 seed ignorato→AC-202-1 rosso; M5 `removeDomain` no-op→AC-202-3
  rosso; M6 union ridotta (rimosso `'misconfigured'`)→AC-201-3 rosso via **tsc** (AC di tipo). `next build` ok.
- **Regressioni intercettate e chiuse nel loop di fix (framing onesto)**: la prima suite completa ha
  segnalato **3 rossi NUOVI** miei — (a) `test-harness-auth` T-005 perché il commento della porta citava
  letteralmente `tests/helpers/…` (la guardia "nessun `src/**` menziona gli helper di test" è **testuale**,
  cattura anche i commenti) → rimosso il path dal commento (come `payment-port.ts`); (b/c) `scaffold`
  `npm run lint` per **6** parametri inline non usati nei test (`no-unused-vars`, regola repo `args:
  'after-used'`, il prefisso `_` NON basta su un unico arg) → omessi i parametri (TS accetta impl con
  meno parametri della firma normalizzata). Post-fix: `lint` 0 errori, suite **1850 pass**, unico rosso
  residuo = il debito TS2589.
- **Debito pre-esistente, NON introdotto qui** (decisione utente: **lasciare tracciato**): `npm run
  typecheck` fallisce con **`TS2589`** in `e2e/effects.spec.ts:103` (codice dal commit `9c7b0ed`).
  Ri-verificato **unico** errore `tsc` (assente dai miei file); **non blocca `next build`** → rende
  rosso solo il meta-test `tests/scaffold.test.ts`. Ancora aperto: da affrontare in sessione dedicata,
  fuori scope di questo macrotask.

## 6. Prossimi passi

- **`domain-port` chiuso** ✅ (5/12). Prossimo BUILD: un eleggibile fra `domain-vercel` (**ora sbloccato**),
  `domain-store` o `domain-routing`. Il session-start risolve il dispatch.
- **`domain-vercel` (DOM-211)**: adattatore reale `src/data/domain/vercel.ts` che implementa
  `DomainProvider` contro l'API Vercel Domains, con `import 'server-only'` + client **LAZY** su config
  iniettabile (`VERCEL_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID` da env) — gemello di `payment/stripe.ts`.
  Mappa la risposta nativa (`verification[]`, stato) ai tipi neutri della porta; **inerte senza env**
  (DOM-D9); nei test il **fake** (già pronto) sostituisce l'adattatore → verde senza chiavi reali.
- **`domain-routing` (DOM-401/402)** consuma la policy anon-active di DOM-102: il reader
  `src/data/public-domain.ts` proietta `{ public_slug }` da `site_domains` come anon (gemello di
  `public-site.ts`).
- **Config di deploy (prereq go-live, non blueprint)**: env Vercel `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`,
  `VERCEL_TEAM_ID` (se team), `NEXT_PUBLIC_APEX_DOMAIN`/target dei record. Collegamento reale inerte
  finché le chiavi non sono in env (DOM-D9), come le CTA Stripe di Fase 1.
- **Debito**: pianificare il fix di `TS2589` in `e2e/effects.spec.ts` (typecheck verde) a parte.

## 7. Carry-over & copertura dichiarata

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

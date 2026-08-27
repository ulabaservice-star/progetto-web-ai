# SESSION-STATE — p5-custom-domains-fase2

> Fonte di verità sullo **stato vivo** del workstream `p5-custom-domains-fase2` (Fase 2 di P5 — domini
> custom), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di P0…P4,
> design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard,
> p5-billing-fase1 e di Trueline. Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 2 (domini custom) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-28 (session-end BUILD `domain-hostname`) |
| **Sessione corrente** | BUILD `domain-hostname` (DOM-111/112) — **CHIUSO+MERGIATO** (`e497b8a`, pushato su `origin/main`). Dominio **PURO**: `normalizeHostname(raw)` (forma canonica: trim/lowercase, schema http(s):// rimosso con scarto path/porta/userinfo, IDN→punycode via `node:url domainToASCII`, rifiuto porta/path/wildcard/spazi/non-FQDN) + `classifyHostname(normalized, reserved)` (apex=eTLD+1 registrabile vs subdomain via **tldts** — PSL bundlata, corretto su `.co.uk`/`.com.br`; reserved `ulaba.net/*`,`*.vercel.app`,`localhost` e non-FQDN → `reserved`, DOM-D7 anti-hijack). Nuova dep **`tldts`** (puro/offline). Checkpoint **4/4** (C1 verde dopo **ratchet additivo onesto** del fingerprint clone DDL `.sql` PRE-ESISTENTE di `domain-schema`; C2 verde; C3 verde salvo debito TS2589; C4 **10/10**), batteria di mutazione **4/4**, `next build` ok. **2/12 macrotask done. Prossimo eleggibile: `domain-companion`/`domain-dns` (da hostname), `domain-port`, `domain-store`, `domain-routing`.** |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| # | Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|---|
| 01 | `domain-schema` (DOM-101/102) | **done** | 4/4 ✅ (`2788894`) | — |
| 02 | `domain-hostname` (DOM-111/112) | **done** | 4/4 ✅ (`e497b8a`) | — |
| 03 | `domain-companion` (DOM-121) | **todo** | — | `domain-hostname` |
| 04 | `domain-dns` (DOM-131) | **todo** | — | `domain-hostname` |
| 05 | `domain-port` (DOM-201/202) | **todo** | — | — |
| 06 | `domain-vercel` (DOM-211) | **todo** | — | `domain-port` |
| 07 | `domain-store` (DOM-221/222) | **todo** | — | `domain-schema` |
| 08 | `domain-connect` (DOM-301/302/303) | **todo** | — | `domain-hostname`, `domain-companion`, `domain-port`, `domain-store` |
| 09 | `domain-verify-disconnect` (DOM-311/321) | **todo** | — | `domain-connect`, `domain-vercel` |
| 10 | `domain-routing` (DOM-401/402) | **todo** | — | `domain-schema` |
| 11 | `domain-ui` (DOM-501/502) | **todo** | — | `domain-verify-disconnect` |
| 12 | `domain-downgrade` (DOM-601/602) | **todo** | — | `domain-schema`, `domain-store` |

**Eleggibili ora (dipendenze verdi):** `domain-companion` e `domain-dns` (sbloccati da `domain-hostname`
done), `domain-port` (senza dipendenze), più `domain-store` e `domain-routing` (da `domain-schema` done).
Il DAG completo è in `00-INDEX.md` §Build order.

## 2. Macrotask corrente

- **NESSUNO in corso** — `domain-hostname` chiuso e mergiato. Alla prossima sessione il dispatch risolve
  **BUILD** sul prossimo eleggibile.
- **Suggerito**: `domain-port` (porta `DomainProvider` + fake in-memory, dominio puro/tipi, sessione
  leggera senza tocco DB) o `domain-companion` (auto-www puro `companionHostname`, da `domain-hostname`).
  In alternativa `domain-store` (reader/writer su `site_domains`, lo schema c'è) o `domain-routing`
  (reader pubblico host→slug + middleware, consuma la policy anon-active di DOM-102 e ora `normalizeHostname`).

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/domain-hostname` (mergiato in `main` con `--no-ff`; non cancellato — delete branch è distruttivo, mai autonomo) |
| Ultimo commit | `e497b8a` (merge domain-hostname in main) — commit atomico `905d363` (feat: `hostname.ts` + 2 test + ratchet `hygiene-baseline` + dep `tldts`) |
| Stato merge su `main` | ✅ **mergiato+pushato** su `origin/main` (`27ba64a..e497b8a`, 6 file, +201/−9). Deploy Vercel innescato; dominio puro **non importato dall'app** → nessun cambio di comportamento runtime |
| Deploy-coupling | **coupled** — confermato (push su `main` = deploy su ulaba.net). Verifica locale PRIMA del merge: vitest (1837 pass), `next build` ok. Nessun file runtime dell'app toccato → e2e Chromium non impattati. `main_deploy_coupled: true`. |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): ora `gitleaks:3`, `osv:2`, `semgrep:0`, **`rls:2`** — aggiunto in
  `.trueline/checkpoint-baseline.json` (locale, gitignored) il **gemello** RLS004 su
  `site_domains_select_active_anon` (`status='active'`): falso-positivo statico della superficie di
  routing globale per-design (DOM-D6), identico a `site_publications_select_anon`, confermato innocuo dal
  DB-test (`tests/site-domains-rls-public.test.ts` AC-102-1/2: anon vede solo attivi, `account_id`/token
  negati). Migrazione `site_domains` applicata a locale **e cloud**.
- **Baseline d'igiene** (C1): `.trueline/hygiene-baseline.json` (versionata) — **231→232** in
  `domain-hostname`: **+1 fingerprint** (`e895fc68…`) del clone DDL boilerplate **PRE-ESISTENTE** della
  migrazione `20260827000100_site_domains.sql` (introdotta da `domain-schema`, che formava 2 cloni ≥50
  token con `20260818000100`/`20260806000300` ma NON li catturò — la nota "`.sql` senza cloni" del
  session-end precedente era imprecisa). **Provato indipendente** da questo macrotask: con i file di
  `domain-hostname` rimossi il set dup resta **234 identico**; `hostname.ts` non forma cloni, i
  `.test.ts` sono esclusi da jscpd. Ratchet **additivo e monotono** (append del solo hash verificato,
  231 entries preservate byte-per-byte), stesso code-path del checkpoint (`control1Hygiene`). I 4
  fingerprint docs restano.
- **Baseline di sicurezza** (C2): invariata (`gitleaks:3`, `osv:2`, `semgrep:0`, `rls:2`); la nuova dep
  `tldts` **non introduce CVE** (osv verde), nessun segreto nel sorgente.
- **Budget**: **12 macrotask (22 task atomici)**. Un macrotask alla volta; loop di fix con tetto in
  `references/oracles/thresholds.md`. Granularità fine per sessioni leggere.

## 5. Esiti dell'ultima sessione (framing onesto)

- **BUILD `domain-hostname` (DOM-111/112) concluso e mergiato** (`e497b8a`). Modulo `src/domain/domains/
  hostname.ts`, dominio **PURO** (nessun DB/rete/DNS/orologio):
  - `normalizeHostname(raw)` → `{ok:true,normalized}|{ok:false,'invalid_format'}`: trim/lowercase, schema
    `http(s)://` rimosso (con scarto di path/query/fragment, porta, userinfo — è un URL), IDN→punycode via
    `node:url domainToASCII`, rimozione trailing dot; rifiuto per caratteri illegali (`:` porta, `/?#`
    path, `*` wildcard, spazi, `_`, `\`, `@`) e per forma non-FQDN (regex sintattica, non PSL).
  - `classifyHostname(normalized, reserved=RESERVED_DOMAINS)` → `{ok:true,kind:'apex'|'subdomain'}|
    {ok:false,'reserved'}`: apex=eTLD+1 registrabile via **`tldts`** (PSL bundlata → corretto su
    `.co.uk`/`.com.br`), reserved (match esatto o suffisso `.r`) e non-FQDN → `reserved` (DOM-D7,
    A01:2025 anti-hijack, respinto **prima** di qualunque scrittura/provider).
- **Decisione utente**: provider PSL = **`tldts`** (dep runtime pura/offline) scelto su lista curata
  inline, per correttezza sui TLD multi-livello dei mercati IT/ES/LATAM. Tipi di esito e
  `RESERVED_DOMAINS` tenuti **interni** (nessun consumatore ancora → nessun export orfano; C1 dead-code
  verde) — si esporteranno con `domain-connect`/`domain-routing`.
- **Checkpoint 4/4**: C1 igiene **verde dopo ratchet additivo onesto** (§4: assorbito il fingerprint del
  clone DDL `.sql` pre-esistente di `domain-schema`, provato indipendente); C2 sicurezza **verde**
  (gitleaks/osv/semgrep/rls; `tldts` senza CVE); C3 regressioni **verde salvo debito** (unico rosso =
  `scaffold.test.ts`, vedi sotto); C4 conformità **verde 10/10** (AC-111-1..4 + AC-112-1..4). **Batteria
  di mutazione 4/4**: M1 reserved neutralizzato→AC-112-3 rosso; M2 `Date` in normalize→AC-111-4 rosso;
  M3 `Date` in classify→AC-112-4 rosso; M4 forma FQDN aperta→AC-111-2 rosso. Ripristino **bit-identico**
  (sha256 invariato). `next build` ok.
- **Debito pre-esistente, NON introdotto qui** (decisione utente: **lasciare tracciato**): `npm run
  typecheck` fallisce con **`TS2589`** in `e2e/effects.spec.ts:103` (codice dal commit `9c7b0ed`).
  Provato pre-esistente (l'unico errore `tsc`, assente dai miei file); **non blocca `next build`** →
  rende rosso solo il meta-test `tests/scaffold.test.ts`. Ancora aperto: da affrontare in sessione
  dedicata, fuori scope di questo macrotask.

## 6. Prossimi passi

- **`domain-hostname` chiuso** ✅ (2/12). Prossimo BUILD: un eleggibile fra `domain-port` (puro,
  sessione leggera), `domain-companion`/`domain-dns` (da hostname), `domain-store` o `domain-routing`.
  Il session-start risolve il dispatch.
- **`domain-companion` (DOM-121)** e **`domain-dns` (DOM-131)** ora sbloccati: entrambi consumano
  `normalizeHostname`/`classifyHostname` (companion apex⇒www; istruzioni DNS dal `kind`).
- **`domain-routing` (DOM-401/402)** consuma la policy anon-active di DOM-102: il reader
  `src/data/public-domain.ts` proietta `{ public_slug }` da `site_domains` come anon (gemello di
  `public-site.ts`).
- **Config di deploy (prereq go-live, non blueprint)**: env Vercel `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`,
  `VERCEL_TEAM_ID` (se team), `NEXT_PUBLIC_APEX_DOMAIN`/target dei record. Collegamento reale inerte
  finché le chiavi non sono in env (DOM-D9), come le CTA Stripe di Fase 1.
- **Debito**: pianificare il fix di `TS2589` in `e2e/effects.spec.ts` (typecheck verde) a parte.

## 7. Carry-over & copertura dichiarata

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

**Carry-over — lezioni nuove di questa sessione (`domain-hostname`):**
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

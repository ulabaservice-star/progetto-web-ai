# SESSION-STATE — Belora · `deploy-hardening` (staging privato dietro Cloudflare Access)

> Fonte di verità sullo **stato vivo** del pass trasversale `deploy-hardening` (deploy dello
> staging privato di Belora). Istanza distinta dalle SESSION-STATE di P0…P4, di
> `architecture-hardening` e da quella della skill trueline. Prosa in italiano,
> identificatori/nomi-file in inglese.
>
> **Nota d'onestà (build):** le sezioni §1–§5 sono una registrazione **a posteriori** del *build
> pass* (costruito e mergiato il 2026-08-07/08). Gli esiti degli oracoli lì citati vengono **dai
> commit** `9a3a30f…1d6bb8f` (in particolare `48ce63b`), **non rieseguiti**.
>
> **Nota d'onestà (esecuzione, §9):** la sezione §9 registra **a posteriori** l'ESECUZIONE del
> deploy (2026-08-08→10, sessione `b2d3d745`) ricostruita dal **transcript** di quella sessione
> (screenshot e conferme dell'utente ai clic) + lo **stato repo verificato il 2026-08-11**. Il
> deploy è stato eseguito **manualmente dall'utente** con l'agente a guidarlo; l'agente **non** ha
> deployato né ri-eseguito nulla. La verifica del muro è **manuale** (incognito), non un oracolo.

| | |
|---|---|
| **Progetto** | Belora |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-11 (allineamento a posteriori dell'**ESECUZIONE del deploy** dell'8-10 ago, §9; il build pass era stato mergiato ff su `main` `1d6bb8f` il 2026-08-08, checkpoint DECOMPOSTO VERDE 4/4) |
| **Sessione corrente** | — (build pass CHIUSO lato-repo; **deploy ESEGUITO**: staging privato **LIVE su `https://ulaba.net`** dietro Cloudflare Access. Unico aperto: smoke test + misura costo, **bloccati** dal 502 dell'intervista onboarding — §9) |

> **Perché questo doc era disallineato (fino al 2026-08-11):** la sessione `b2d3d745` che ha
> eseguito il deploy (8-10 ago) è morta per **overflow di contesto** ("Prompt is too long") in pieno
> debug del 502, **senza** aggiornare la documentazione. La sessione successiva (`3581a9cb`, 10 ago
> 09:46) ha fatto `/clear` e ha scritto questa SESSION-STATE basandosi su commit+memoria, **ignara
> del deploy** → affermava "muro non eseguito · DNS in propagazione · staging non online". §6/§7/§8
> e §9 sono la correzione.

---

## 1. Stato dei macrotask

> `deploy-hardening` è un **pass trasversale** (parallelo ad `architecture-hardening`), non un
> macrotask di fase. Un solo nodo.

| Macrotask | Stato | Checkpoint | Note |
|---|---|---|---|
| `deploy-hardening` | **done** | **DECOMPOSTO VERDE 4/4 (`48ce63b`)** | 4 task (T-1…T-4) + CI build-gate + runbook. Ramo `trueline/build/deploy-hardening` → `main` ff `1d6bb8f`, pushato. Suite 1433/1433; mutazione 2/2 uccise |

## 2. Contenuto del pass (cosa è stato costruito)

- **T-1 — muro dei signup (gate applicativo):** `isSignupAllowed(email, allowlist)` PURA in
  `src/domain/auth/validation.ts` (allowlist vuota ⇒ aperto per dev/test; non vuota ⇒ match ESATTO
  case-insensitive, mai prefisso: `me@ulaba.net` non ammette `me@ulaba.net.attacker.com`);
  `getSignupAllowlist` in `src/config/env.ts` (parse di `SIGNUP_ALLOWLIST`); Server Action signup
  (`src/app/[locale]/signup/actions.ts`): email fuori allowlist ⇒ **stesso messaggio generico** di
  un fallimento auth (anti user-enumeration) e `supabase.auth.signUp` **mai invocato**.
- **T-2 — gate fail-fast della config di produzione:** `assertProductionEnv` in `src/config/env.ts`
  esige le 3 chiavi Supabase + `ANTHROPIC_API_KEY` + `NEXT_PUBLIC_SITE_URL` (https pubblica, validata
  con `new URL()` sull'host reale — no localhost, loopback `[::1]` coperto) + `SIGNUP_ALLOWLIST` non
  vuota; raccoglie TUTTI i problemi in un solo errore (nessun segreto nel messaggio).
  `src/instrumentation.ts`: `register()` invoca il gate su **`VERCEL_ENV` = production O preview**
  (non `NODE_ENV`: `next start`/e2e girano in `NODE_ENV=production` ma non sono deploy reali).
  **Interlock T-1↔T-2:** in prod il boot FALLISCE se l'allowlist è vuota ⇒ il ramo "vuota = aperto"
  di T-1 non può mai valere in produzione (prod = muro sempre armato; dev/test = aperto).
  **⇒ Provato in produzione, §9:** il 1° deploy Vercel è crashato proprio perché una env critica era
  mal-nominata — il fail-fast ha fatto esattamente il suo lavoro.
- **T-3 — CSP + security header sulla superficie pubblica `/s/<slug>`:**
  `src/config/security-headers.ts` (builder PURI: `buildPublicSiteCsp` + `publicSecurityHeaders`;
  `img-src`/`connect-src` ammettono SOLO self + il NOSTRO host Storage derivato da
  `NEXT_PUBLIC_SUPABASE_URL` ⇒ rinforza P2-D12; `object-src`/`base-uri` `'none'`, `frame-ancestors`
  `'none'`, `form-action 'self'` + nosniff/Referrer-Policy/X-Frame-Options/HSTS/Permissions-Policy).
  `next.config.ts` `headers()` li applica a `/s/:path*` (scoped: assenti su `/it`).
  **Limite dichiarato:** `script-src 'unsafe-inline'` (la rotta è fuori dal middleware, niente nonce)
  ⇒ la difesa XSS vera resta l'**escaping del renderer unico**, non la CSP.
- **T-4 — cap giornaliero delle generazioni (cintura di costo):** `getDailyGenerationCap`
  (`GENERATION_DAILY_CAP`, default 20); `countGenerationsSince` in `src/data/generations.ts` (client
  di SESSIONE RLS-scoped, **mai service_role**, `count exact head`, `.gte('created_at')`);
  `/api/generate`: dopo il gate `generatable` e **PRIMA** di `createGeneration`/della chiamata al
  modello ⇒ **429** oltre il tetto, **FAIL-OPEN** su errore di conteggio (backstop = spend cap
  Anthropic). Cap **SOFT** (`site_generations` cancellabile dal tenant), copre la **generazione**
  (modello top), non l'intervista (Haiku, cap per-conversazione).
- **CI build-gate:** `.github/workflows/ci.yml` aggiunge `npm run build` dopo lint, prima di Supabase.
- **Runbook:** `docs/DEPLOY-RUNBOOK.md` — procedura passo-passo dello staging privato (ora con la
  sezione **"Stato esecuzione"** che ne registra l'esito reale).

## 3. Stato git

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/deploy-hardening` (pushato). `main` = `1d6bb8f` (build) → `71786eb` (registrazione doc), mergiati ff, lineari |
| Commit del pass | `9a3a30f` (T-1+T-2) · `21347a1` (T-3+T-4) · `48ce63b` (gate: rilievi verifier + checkpoint) · `1d6bb8f` (CI + runbook) |
| Repository | **trasferito** durante l'esecuzione (§9): `claudiosnivel-dot/progetto-web-ai` → **`ulabaservice-star/progetto-web-ai`** (remote locale già ripuntato; push verificato) |
| Stato merge su `main` | **MERGIATO** (ff, pushato) su via ESPLICITA dell'utente (deploy-coupled) |
| Deploy-coupling | **`coupled` — RICONFERMATO**. Il deploy pubblico è stato eseguito **a mano dall'utente** (§9); l'agente ha solo guidato e mergiato codice, mai innescato un deploy |

## 4. Baseline & budget

- **Sicurezza (dal checkpoint `48ce63b`):** `gitleaks:0 · osv:1 · semgrep:0 · rls:1`. `osv:1`/`rls:1`
  sono carry-over noti (advisory MODERATE su `next`/`postcss`; policy anon pubblica di P4 baselinata
  come FP). Il pass **non** introduce tabelle/RLS/bucket nuovi (solo app + config + CI + doc).
- **Igiene (C1):** VERDE, `dup:127, 0 blocker, invariata` — nessuna duplicazione nuova bloccante
  attribuita al pass.
- **Budget:** 1 pass (`deploy-hardening`), 4 task, checkpoint DECOMPOSTO VERDE 4/4.

## 5. Esiti del build (framing onesto)

> Solo fatti del *build*, citati dai commit del pass. Gli esiti dell'*esecuzione* sono in §9.

- **Checkpoint DECOMPOSTO VERDE 4/4** (`48ce63b`): C1 igiene VERDE · C2 sicurezza VERDE
  (`gitleaks:0 osv:1 semgrep:0 rls:1`) · C3+C4 suite **1433/1433** (shard 799+634).
- **Batteria di mutazione 2/2 UCCISE:** `isSignupAllowed` fail-open → `signup-allowlist` ROSSO; cap
  429 neutralizzato → `generate-api-guards` ROSSO. Ripristino **sha256 byte-identico**, tree pristine.
- **Verifier BLIND avversariale:** rilievo **B1 (blocker)** applicato — l'allowlist applicativa è
  **DIFESA IN PROFONDITÀ, non il muro**: `POST /auth/v1/signup` (anon key) e OAuth la scavalcano;
  il **muro VERO** è lato-piattaforma (Supabase `enable_signup=OFF` + invito self + OAuth off) +
  **Cloudflare Access**. Rilievi M1/M2/M3/m3/m5/m7/m4 applicati (cap SOFT dichiarato; gate su
  `VERCEL_ENV` prod|preview; validazione URL con `new URL()`; commenti allineati; test di wiring 429).

## 6. Copertura dichiarata (cosa è verificato, cosa NO)

- **Verificato dagli oracoli (run del build):** allowlist pura anti-prefisso + signup mai invocato
  fuori lista; gate env fail-fast al boot su `VERCEL_ENV`; header/CSP **scoped** su `/s/` (presenti su
  `/s/`, assenti su `/it`; e2e 9/9 non rotto); cap 429 **prima** della spesa, RLS-scoped, fail-open;
  falsificabilità provata dalla mutazione 2/2.
- **Verificato a mano in produzione (utente, §9):** app LIVE su `https://ulaba.net`; il **muro
  Cloudflare Access funziona** (in incognito `ulaba.net` chiede il login Access; `ulaba.net/s/test`
  **NON** lo chiede = bypass `/s/*` OK); il fail-fast T-2 ha **realmente** bloccato il boot con una env
  critica mal-nominata; login app end-to-end OK; muro Supabase (signup OFF + OAuth off) impostato.
  *(Verifiche manuali via screenshot, non oracoli automatici.)*
- **NON coperto / ancora aperto (dichiarato):**
  - 🔴 **Smoke test + MISURA DEL COSTO NON fatti** — **bloccati**: l'intervista onboarding non conclude,
    `POST /api/onboarding/turn` → **502** (prima chiamata Anthropic reale, mai testata fuori dai mock).
    Sospetto: model id `claude-haiku-4-5` (non datato) in `src/config/env.ts:47` — id valido
    `claude-haiku-4-5-20251001`. **Fix non confermata né committata** (HEAD `71786eb`). Nessuna
    generazione ⇒ **nessun costo misurato** ⇒ P5 ancora senza il suo input.
  - **Rebrand Belora → Ulaba** non fatto: l'app mostra ancora "Belora" mentre il dominio è `ulaba.net`.
  - **URL grezzo `progetto-web-ai.vercel.app`** ancora pubblico (bypassa Access) — Vercel Deployment
    Protection non impostata. Non critico ora (signup Supabase chiusi), ma da chiudere.
  - **CSP con `script-src 'unsafe-inline'`** su `/s/` (niente nonce fuori dal middleware): la difesa XSS
    provata è l'escaping del renderer unico, non la CSP; CSP stretta = lancio/P5.
  - Il cap generazioni è **SOFT**; il freno HARD è lo **spend cap Anthropic** (impostato dall'utente);
    il ledger crediti append-only è P5.
  - **CI:** dopo il push al **nuovo** repo, verificare la tab Actions (build-gate incluso; e2e resta al
    checkpoint locale). `osv`: 2 advisory MODERATE (`next`, `postcss`) carry-over.

## 7. Carry-over

**Aperti (prossime azioni):**
- 🔴 **Sbloccare lo smoke test:** diagnosticare/fixare il **502 dell'onboarding** (`/api/onboarding/turn`;
  verificare il model id dell'intervista sulla reference ufficiale prima di pushare) → percorrere
  onboarding → **5 mockup** → pubblicare `/s/<slug>` → **MISURA DEL COSTO** (Anthropic → Usage) = input
  per il pricing di **P5**.
- **Rebrand Belora → Ulaba** (header/badge/stringhe i18n/JSON-LD, disciplina trueline) — decisione utente.
- **Vercel Deployment Protection** sull'URL grezzo `*.vercel.app`.
- (minor) **sitemap** `/s/<slug>/sitemap.xml` sotto il bypass Access `/s/*` — affinare per il lancio.
- **CI:** controllare la tab Actions del nuovo repo dopo il primo push.

**Chiusi (da onorare, non riaprire):**
- **Deploy ESEGUITO (§9):** Supabase Cloud EU (12 migrazioni + bucket `site-assets` + muro 3 caselle +
  Site/Redirect URL) · Anthropic (key + spend cap) · Vercel (7 env + deploy live) · dominio `ulaba.net`
  (NS Hostinger→Cloudflare, A `76.76.21.21` proxied, Full strict, HTTPS) · **Cloudflare Access A+B
  testati** · repo trasferito a `ulabaservice-star` · login e2e OK.
- Interlock T-1↔T-2 (prod = muro sempre armato); header/CSP scoped su `/s/`; cap 429 pre-spesa
  RLS-scoped fail-open; nessuna tabella/RLS/bucket nuovo (blast-radius zero su P4).

## 8. Prossimi passi

1. **Build pass chiuso lato-repo** (§1/§3) e **deploy ESEGUITO** (§9): staging privato **LIVE su
   `https://ulaba.net`** dietro Cloudflare Access, con `/s/*` pubblico.
2. **Sblocco immediato:** fixare il **502 dell'onboarding** (model id intervista) → smoke test completo
   (onboarding → 5 mockup → pubblica `/s/<slug>`) → **misura del costo** = input per il pricing di **P5**.
   Hosting pubblico dedicato (R2/domini custom) resta **P4-D1**.
3. **Deploy-coupling = `coupled` RICONFERMATO** (§3): deploy eseguito a mano dall'utente; nessun deploy
   dall'agente.
4. **Dopo la misura costo:** **P5** (billing/crediti, gating a pagamento, rimozione badge P4-D5,
   ritocco/sfondi AI P4-D7) parte da un proprio blueprint (BOOTSTRAP) e una propria SESSION-STATE.

## 9. Esecuzione del deploy (2026-08-08→10) — allineamento a posteriori

> Ricostruito dal transcript della sessione `b2d3d745` (8-10 ago; screenshot e conferme dell'utente) +
> stato repo verificato il 2026-08-11. Deploy eseguito **a mano dall'utente**, agente come guida.

**Coordinate (non segrete):**
- Repo: **`ulabaservice-star/progetto-web-ai`** (Public) — trasferito da `claudiosnivel-dot` prima di
  collegare Vercel/CI (timing pulito: niente da riagganciare).
- Supabase Cloud: progetto **`swpnvtgmcvzsfzrmhgew`**, regione **EU**. URL pubblico
  `https://swpnvtgmcvzsfzrmhgew.supabase.co`.
- Vercel: progetto **`progetto-web-ai`**, team **`ulaba`**.
- Dominio: **`ulaba.net`** (registrar Hostinger → DNS Cloudflare).

**① Supabase Cloud (backend + muro piattaforma):**
- `supabase login` + `supabase link --project-ref swpnvtgmcvzsfzrmhgew` + **`supabase db push`** → **12
  migrazioni applicate** in ordine (baseline → … → `assets_and_storage`), incluso il **bucket Storage
  `site-assets`**. Nessun errore sulle policy `storage.objects`.
- **Muro (le 3 caselle 🔴):** signup pubblici **OFF** · **utente self-invitato** (poi **ricreato con
  password + Auto-Confirm** — l'invito iniziale creava un account senza password ⇒ "credenziali non
  valide" al login) · Google/OAuth **OFF**.
- **URL Configuration:** Site URL `https://ulaba.net`, Redirect URLs `https://ulaba.net/**`.
- **Chiavi (nuovo formato Supabase):** `ANON` = publishable `sb_publishable_…` (pubblica per design);
  `SERVICE_ROLE` = secret `sb_secret_…` (digitata solo su Vercel). Il client `@supabase/supabase-js`
  ^2.110 supporta il nuovo formato (piano B legacy JWT `eyJ…` non necessario).

**② Anthropic:** API key creata + **spending limit impostato** (confermato dall'utente 2026-08-11) =
freno di costo HARD.

**③ Vercel (app):**
- Repo importato (Next.js). **7 env** su Production/Preview: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
  `NEXT_PUBLIC_SITE_URL=https://ulaba.net`, `SIGNUP_ALLOWLIST=<email>`, `GENERATION_DAILY_CAP=20`.
- **1° deploy → crash `MIDDLEWARE_INVOCATION_FAILED`.** Causa (dai runtime log Vercel):
  `Configurazione di produzione incompleta: manca NEXT_PUBLIC_SUPABASE_ANON_KEY` — la env era stata
  salvata col nome Supabase `…_PUBLISHABLE_KEY`. **È il fail-fast T-2 che funziona** (rifiuto boot vs
  app rotta silenziosa). **Fix = rinominare la env in `NEXT_PUBLIC_SUPABASE_ANON_KEY` + redeploy, ZERO
  codice.** Dopo il redeploy l'app parte (middleware `/`→`/it`, render SSR OK).

**④ Dominio `ulaba.net`:**
- Registrar **Hostinger**: nameserver → **`lindsey.ns.cloudflare.com` / `razvan.ns.cloudflare.com`**,
  DNSSEC OFF. Cloudflare → **Active** (email arrivata).
- Vercel → Settings → Domains → **`ulaba.net`** (apex, **senza** "redirect to www": il canonical è
  l'apex, `NEXT_PUBLIC_SITE_URL=https://ulaba.net`).
- Cloudflare DNS: record **`A ulaba.net → 76.76.21.21`**, prima **DNS-only (grigio)** per far verificare
  Vercel ed emettere il certificato, poi **Proxied (arancione)** per il muro. **SSL/TLS Full (strict)**.
  `https://ulaba.net` live in HTTPS. *(Restare sulla tab "DNS Records", MAI "Vercel DNS": cambiare i NS
  a Vercel perderebbe Cloudflare Access.)*

**⑤ Cloudflare Access (Zero Trust) — IL MURO:**
- Team creato (piano **Free**).
- **App A `Ulaba App`** — Self-hosted, domain `ulaba.net`, **path VUOTO** (tutto il dominio). Identity:
  **One-time PIN** (email). Policy `solo io`: **Allow**, Include Emails = email dell'utente.
- **App B `Ulaba siti pubblici`** — Self-hosted, domain `ulaba.net`, **path `s/*`**. Policy: **Bypass**,
  Include **Everyone** (la regola più specifica vince → i siti pubblicati restano pubblici).
- **Testato in incognito:** `ulaba.net` → schermata Access chiede email (muro OK); `ulaba.net/s/test`
  → carica **senza** login Access (bypass OK; pagina 404 perché nessuno slug "test" pubblicato = giusto).
- **Login end-to-end OK:** Access → login app (account Supabase) → dashboard ("Non hai creato nessun
  sito" = stato normale a zero siti; l'errore "lettura siti" iniziale era il cold-start della funzione).

**Traguardo:** **produzione privata su dominio vero, dietro muro, con `/s/*` pubblico.**

**⛔ Dove la sessione si è fermata (contesto esaurito, 10 ago 09:02):** avviando lo smoke test,
l'onboarding **non conclude**. Dai log Vercel: il salvataggio del brief va (`POST /it/onboarding/…` →
200) ma **`POST /api/onboarding/turn` → 502** (la chiamata AI dell'intervista, prima chiamata Anthropic
reale). Sospetto forte: il **model id** dell'intervista `claude-haiku-4-5` (`src/config/env.ts:47`) non
datato. **La verifica/fix non è mai stata fatta** (la sessione è morta prima). ⇒ è il **carry-over §7
n.1**, il muro fra lo staging e la **misura del costo**.

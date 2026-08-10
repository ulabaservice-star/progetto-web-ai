# SESSION-STATE — Belora · `deploy-hardening` (staging privato dietro Cloudflare Access)

> Fonte di verità sullo **stato vivo** del pass trasversale `deploy-hardening` (deploy dello
> staging privato di Belora). Istanza distinta dalle SESSION-STATE di P0…P4, di
> `architecture-hardening` e da quella della skill trueline. Prosa in italiano,
> identificatori/nomi-file in inglese.
>
> **Nota d'onestà:** questo documento è una registrazione **a posteriori** del pass (costruito e
> mergiato il 2026-08-07/08). Gli esiti degli oracoli qui sotto sono **citati dai commit**
> `9a3a30f…1d6bb8f` (in particolare `48ce63b`), **non rieseguiti** nella sessione di scrittura.

| | |
|---|---|
| **Progetto** | Belora |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase) |
| **Ultimo aggiornamento** | 2026-08-10 (registrazione del pass `deploy-hardening`; costruito e mergiato ff su `main` `1d6bb8f` il 2026-08-08, checkpoint DECOMPOSTO VERDE 4/4) |
| **Sessione corrente** | — (pass CHIUSO lato-repo; il **muro vero** e lo smoke test sono lato-utente, `docs/DEPLOY-RUNBOOK.md`) |

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
- **Runbook:** `docs/DEPLOY-RUNBOOK.md` — procedura passo-passo dello staging privato.

## 3. Stato git

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/deploy-hardening` (pushato). `main` = `1d6bb8f` (mergiato ff, lineare) |
| Commit del pass | `9a3a30f` (T-1+T-2) · `21347a1` (T-3+T-4) · `48ce63b` (gate: rilievi verifier + checkpoint) · `1d6bb8f` (CI + runbook) |
| Stato merge su `main` | **MERGIATO** (ff, pushato) su via ESPLICITA dell'utente (deploy-coupled) |
| Deploy-coupling | **`coupled` — RICONFERMATO**. Nessun deploy innescato dall'agente; il deploy pubblico resta azione umana supervisionata |

## 4. Baseline & budget

- **Sicurezza (dal checkpoint `48ce63b`):** `gitleaks:0 · osv:1 · semgrep:0 · rls:1`. `osv:1`/`rls:1`
  sono carry-over noti (advisory MODERATE su `next`/`postcss`; policy anon pubblica di P4 baselinata
  come FP). Il pass **non** introduce tabelle/RLS/bucket nuovi (solo app + config + CI + doc).
- **Igiene (C1):** VERDE, `dup:127, 0 blocker, invariata` — nessuna duplicazione nuova bloccante
  attribuita al pass.
- **Budget:** 1 pass (`deploy-hardening`), 4 task, checkpoint DECOMPOSTO VERDE 4/4.

## 5. Esiti (framing onesto)

> Solo fatti, citati dai commit del pass. **Non** "il deploy è sicuro/pronto".

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

- **Verificato ora (oracoli, run del pass):** allowlist pura anti-prefisso + signup mai invocato fuori
  lista; gate env fail-fast al boot su `VERCEL_ENV`; header/CSP **scoped** su `/s/` (presenti su `/s/`,
  assenti su `/it`; e2e 9/9 non rotto); cap 429 **prima** della spesa, RLS-scoped, fail-open;
  falsificabilità provata dalla mutazione 2/2.
- **NON coperto (dichiarato):**
  - **Il MURO VERO è lato-piattaforma e MANUALE, non ancora eseguito:** Supabase `enable_signup=OFF`
    + invito self + OAuth off, Cloudflare Access (App A allow email / App B bypass `/s/*`), spend cap
    Anthropic. L'allowlist app-level da sola NON è il muro.
  - **DNS `ulaba.net` in propagazione** (Hostinger → Cloudflare); staging non ancora online.
  - **CI mai girata da una run reale** (`gh` non installato); `test:e2e` non cablato in `ci.yml`.
  - **CSP con `script-src 'unsafe-inline'`** su `/s/` (niente nonce fuori dal middleware): la difesa
    XSS provata è l'escaping del renderer unico, non la CSP; CSP stretta = lancio/P5.
  - Il cap è **SOFT**; il freno HARD è lo **spend cap Anthropic**; il ledger crediti append-only è P5.

## 7. Carry-over

**Aperti (azioni lato-utente, `docs/DEPLOY-RUNBOOK.md`):**
- Eseguire il runbook: Cloudflare (DNS + Access wall) · Supabase Cloud EU (migrazioni `db push`,
  🔴 signup OFF + invito + OAuth off + Site/Redirect URL) · Anthropic (key + spend cap) · Vercel (env
  vars + build + dominio) → **smoke test + MISURA DEL COSTO** (sblocca il pricing di P5).
- **CI:** dopo il primo push, controllare la tab Actions (build-gate incluso; e2e resta al checkpoint
  locale). `osv`: 2 advisory MODERATE (`next`, `postcss`) carry-over.

**Chiusi (da onorare, non riaprire):**
- Interlock T-1↔T-2 (prod = muro sempre armato); header/CSP scoped su `/s/`; cap 429 pre-spesa
  RLS-scoped fail-open; nessuna tabella/RLS/bucket nuovo (blast-radius zero su P4).

## 8. Prossimi passi

1. **`deploy-hardening` chiuso lato-repo** (§1/§3): mergiato ff su `main` (`1d6bb8f`), checkpoint 4/4.
2. **Azione umana:** eseguire `docs/DEPLOY-RUNBOOK.md` (muro vero + online) → smoke test → **misura
   costo** = input per il pricing di **P5**. Hosting pubblico dedicato (R2/domini custom) resta **P4-D1**.
3. **Deploy-coupling = `coupled` RICONFERMATO** (§3): merge human-gated, nessun deploy dall'agente.
4. **Dopo il deploy/misura:** **P5** (billing/crediti, gating a pagamento, rimozione badge P4-D5,
   ritocco/sfondi AI P4-D7) parte da un proprio blueprint (BOOTSTRAP) e una propria SESSION-STATE.

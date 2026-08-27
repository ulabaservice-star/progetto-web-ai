# SESSION-STATE — p5-custom-domains-fase2

> Fonte di verità sullo **stato vivo** del workstream `p5-custom-domains-fase2` (Fase 2 di P5 — domini
> custom), consumata da BUILD e aggiornata a ogni `session-end`. Istanza distinta da quelle di P0…P4,
> design-engine v1/v1.1/v2, architecture-hardening, deploy-hardening, onboarding-guided-wizard,
> p5-billing-fase1 e di Trueline. Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 2 (domini custom) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-08-28 (session-end BUILD `domain-schema`) |
| **Sessione corrente** | BUILD `domain-schema` (DOM-101/102) — **CHIUSO+MERGIATO** (`2788894`, pushato su `origin/main`). Tabella `public.site_domains` + RLS (gestione owner-only, NO UPDATE authenticated; routing anon-active column-level). Checkpoint **4/4 verde**, batteria di mutazione **4/4** (M1→AC-101-1/4 rosso, M2→AC-102-1/3 rosso), `next build` ok, migrazione `20260827000100` **applicata al cloud** (POOLER) e RLS/GRANT **verificati** via node pg (CA Supabase pinnata). **1/12 macrotask done. Prossimo eleggibile: `domain-hostname` / `domain-port` / `domain-store` / `domain-routing`.** |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| # | Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|---|
| 01 | `domain-schema` (DOM-101/102) | **done** | 4/4 ✅ (`2788894`) | — |
| 02 | `domain-hostname` (DOM-111/112) | **todo** | — | — |
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

**Eleggibili ora (dipendenze verdi):** `domain-hostname`, `domain-port` (senza dipendenze), più
`domain-store` e `domain-routing` (sbloccati da `domain-schema` done). Il DAG completo è in
`00-INDEX.md` §Build order.

## 2. Macrotask corrente

- **NESSUNO in corso** — `domain-schema` chiuso e mergiato. Alla prossima sessione il dispatch risolve
  **BUILD** sul prossimo eleggibile.
- **Suggerito**: `domain-hostname` (dominio puro: `normalizeHostname` + `classifyHostname` apex/subdomain
  + reserved) o `domain-port` (porta `DomainProvider` + fake) — entrambi puri/tipi, sessioni leggere e
  senza tocco DB. In alternativa `domain-store` (reader/writer su `site_domains`, ora che lo schema c'è)
  o `domain-routing` (reader pubblico host→slug + middleware, consuma la policy anon-active di DOM-102).

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | `trueline/build/domain-schema` (mergiato in `main` con `--no-ff`; non cancellato — delete branch è distruttivo, mai autonomo) |
| Ultimo commit | `2788894` (merge domain-schema in main) — commit atomico `c43aba0` (feat: migrazione + 2 test + baseline igiene) + `cc4cf74` (fix blueprint AC-402-3) |
| Stato merge su `main` | ✅ **mergiato+pushato** su `origin/main` (`658eccd..2788894`, 5 file, +624). Deploy Vercel innescato; codice senza nuove rotte/UI (macrotask solo-schema) → nessun cambio di comportamento runtime; migrazione già sul cloud |
| Deploy-coupling | **coupled** — confermato (push su `main` = deploy su ulaba.net). Verifica locale fatta PRIMA del merge (vitest, `next build` ok) + cloud RLS/GRANT verificati. `main_deploy_coupled: true`. |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): ora `gitleaks:3`, `osv:2`, `semgrep:0`, **`rls:2`** — aggiunto in
  `.trueline/checkpoint-baseline.json` (locale, gitignored) il **gemello** RLS004 su
  `site_domains_select_active_anon` (`status='active'`): falso-positivo statico della superficie di
  routing globale per-design (DOM-D6), identico a `site_publications_select_anon`, confermato innocuo dal
  DB-test (`tests/site-domains-rls-public.test.ts` AC-102-1/2: anon vede solo attivi, `account_id`/token
  negati). Migrazione `site_domains` applicata a locale **e cloud**.
- **Baseline d'igiene** (C1): `.trueline/hygiene-baseline.json` (versionata) — **+4 fingerprint** dei
  cloni jscpd pre-esistenti nei docs BOOTSTRAP (`prompts/session-start.md`, `session-end.md`,
  `VISION-AND-CONSTRAINTS.md`), NON toccati da questo macrotask (`.test.ts` esclusi da jscpd, `.sql`
  senza cloni). Re-baseline onesto (227→231).
- **Budget**: **12 macrotask (22 task atomici)**. Un macrotask alla volta; loop di fix con tetto in
  `references/oracles/thresholds.md`. Granularità fine per sessioni leggere.

## 5. Esiti dell'ultima sessione (framing onesto)

- **BUILD `domain-schema` (DOM-101/102) concluso e mergiato** (`2788894`). Migrazione
  `20260827000100_site_domains.sql`: tabella con ciclo di vita del collegamento, `kind`
  (apex/subdomain), `status` (pending/verifying/active/suspended/error), UNIQUE su
  `normalized_hostname`, FK `account_id→accounts` + **FK composita** `(account_id,site_id)→sites`
  (difesa cross-tenant), `public_slug` **denormalizzato** per il routing anon (risolta l'ambiguità:
  DOM-101 non lo elencava, ma DOM-102/DOM-401/DOM-D6 lo esigono).
- **RLS a due superfici**: gestione owner-only (SELECT/INSERT/DELETE `to authenticated` su
  `is_account_member`, **nessuna UPDATE authenticated** = anti self-activation) + routing (una SELECT
  `to anon` su `status='active'` + GRANT column-level `normalized_hostname,public_slug`; token/account_id
  negati). Provata **a runtime** con client reali + oracolo indipendente service_role (anti-placebo).
- **Checkpoint 4/4 verde**; **batteria di mutazione 4/4** (M1 policy UPDATE authenticated → AC-101-1/4
  rosso; M2 anon `USING(true)` → AC-102-1/3 rosso; DB-level, sha256 migrazione invariato). `next build`
  ok. Cloud: migrazione applicata via POOLER, RLS/GRANT verificati via node pg con **CA Supabase
  pinnata** (Root 2021 CA estratta dalla catena + verificata) — RLS on, 4 policy attese, GRANT corretti.
- **Fix blueprint** (`cc4cf74`): AC-402-3 aveva il token vago bannato "sicuro" → floor
  `ac_observability_check` rosso → riformulato osservabile ("nessun rewrite host-custom emesso;
  fail-closed"). Nessun cambio di semantica.
- **Debito pre-esistente rilevato, NON introdotto qui** (decisione utente: **lasciare tracciato**):
  `npm run typecheck` (`tsc --noEmit` su tutto, incluso e2e) fallisce con **`TS2589`** in
  `e2e/effects.spec.ts:103` (inferenza tipi Playwright `evaluateAll<…>`, codice dal commit `9c7b0ed`).
  Provato pre-esistente (fallisce sull'albero senza i miei file); **non blocca `next build`** (staging
  live lo conferma) → rende rosso solo il meta-test `tests/scaffold.test.ts` sul typecheck. Da
  affrontare in una sessione dedicata, fuori dallo scope di questo macrotask.

## 6. Prossimi passi

- **`domain-schema` chiuso** ✅ (1/12). Prossimo BUILD: un eleggibile fra `domain-hostname`,
  `domain-port` (puri, sessioni leggere), `domain-store` o `domain-routing` (ora sbloccati). Il
  session-start risolve il dispatch.
- **`domain-routing` (DOM-401/402)** consuma la policy anon-active di DOM-102: il reader
  `src/data/public-domain.ts` proietta `{ public_slug }` da `site_domains` come anon (gemello di
  `public-site.ts`).
- **Config di deploy (prereq go-live, non blueprint)**: env Vercel `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`,
  `VERCEL_TEAM_ID` (se team), `NEXT_PUBLIC_APEX_DOMAIN`/target dei record. Collegamento reale inerte
  finché le chiavi non sono in env (DOM-D9), come le CTA Stripe di Fase 1.
- **Debito**: pianificare il fix di `TS2589` in `e2e/effects.spec.ts` (typecheck verde) a parte.

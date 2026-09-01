# SESSION-STATE — p6a-public-surface

> Fonte di verità sullo **stato vivo** del workstream `p6a-public-surface` (superficie pubblica: split
> dominio + landing + waitlist + SEO + blog), consumata da BUILD e aggiornata a ogni `session-end`.
> Istanza distinta da quelle di P0…P4, design-engine v1/v1.1/v2, architecture-hardening,
> deploy-hardening, onboarding-guided-wizard, p5-billing-fase1, p5-custom-domains-fase2 e di Trueline.
> Prosa in italiano, identificatori in inglese.

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P6a (superficie pubblica) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Ultimo aggiornamento** | 2026-09-01 (BOOTSTRAP Trueline — blueprint generato, nessun macrotask costruito) |
| **Sessione corrente** | BOOTSTRAP (piano pronto; primo BUILD nella prossima sessione) |

---

## 1. Stato dei macrotask

> Aggiornato a ogni `session-end`. Stati: `todo` | `in_progress` | `done`.

| # | Macrotask | Stato | Checkpoint | Dip |
|---|---|---|---|---|
| 01 | `host-classify` (PUB-101/102) | **todo** | — | — |
| 02 | `host-guard` (PUB-111) | **todo** | — | `host-classify` |
| 03 | `marketing-i18n` (PUB-121) | **todo** | — | — |
| 04 | `marketing-layout` (PUB-131) | **todo** | — | `marketing-i18n` |
| 05 | `marketing-home` (PUB-141) | **todo** | — | `marketing-layout` |
| 06 | `waitlist-schema` (PUB-201) | **todo** | — | — |
| 07 | `waitlist-store` (PUB-211) | **todo** | — | `waitlist-schema` |
| 08 | `captcha-port` (PUB-221/222) | **todo** | — | — |
| 09 | `waitlist-endpoint` (PUB-231/232) | **todo** | — | `waitlist-store`, `captcha-port` |
| 10 | `waitlist-form` (PUB-241/242) | **todo** | — | `marketing-home`, `waitlist-endpoint` |
| 11 | `seo-robots` (PUB-301) | **todo** | — | `marketing-layout` |
| 12 | `seo-sitemap` (PUB-311) | **todo** | — | `marketing-layout` |
| 13 | `seo-metadata` (PUB-321) | **todo** | — | `marketing-layout` |
| 14 | `seo-jsonld` (PUB-331) | **todo** | — | `marketing-home` |
| 15 | `privacy-page` (PUB-341) | **todo** | — | `marketing-layout` |
| 16 | `blog-pipeline` (PUB-401) | **todo** | — | — |
| 17 | `blog-content` (PUB-411) | **todo** | — | `blog-pipeline` |
| 18 | `blog-list` (PUB-421) | **todo** | — | `blog-content`, `marketing-layout` |
| 19 | `blog-post` (PUB-431) | **todo** | — | `blog-content`, `seo-metadata`, `seo-jsonld` |
| 20 | `blog-sitemap` (PUB-441) | **todo** | — | `seo-sitemap`, `blog-content` |
| 21 | `blog-seed` (PUB-451) | **todo** | — | `blog-content` |
| 22 | `cutover` (PUB-501) | **todo** | — | (tutte le superfici pubbliche) |

**Eleggibili ora (nessuna dipendenza, in parallelo su file disgiunti):** `host-classify`,
`marketing-i18n`, `waitlist-schema`, `captcha-port`, `blog-pipeline`. `cutover` per ultimo.

## 2. Macrotask corrente

- **Nessuno selezionato** — bootstrap appena chiuso. Il primo BUILD parte dalla prossima sessione:
  scegli uno degli eleggibili (§1) rispettando il DAG (00-INDEX §Build order).
- **Metodo**: UN macrotask per sessione via **dynamic workflow command-free** (builder solo Read/Write/
  Edit; oracoli — checkpoint 4/4 + mutazione — in **foreground** dall'orchestratore, unico giudice del
  verde). Vedi 00-INDEX §Granularità e la memoria `dynamic-workflow-build-method`.

## 3. Stato git

> Registrato a ogni `session-end`. Mai lavorare su `main`.

| Campo | Valore |
|---|---|
| Branch di lavoro | — (nessun BUILD ancora; il bootstrap committa solo docs di piano) |
| Ultimo commit | (bootstrap: 00-INDEX + moduli 01–22 + SESSION-STATE + prompts) |
| Stato merge su `main` | n/a (nessun codice; gated dal verde del checkpoint per i BUILD) |
| Deploy-coupling | **coupled** (push su `main` = deploy su ulaba.net) → verifica locale prima del merge |

## 4. Baseline & budget

- **Baseline di sicurezza** (C2): `gitleaks/osv/semgrep/rls` — al primo BUILD l'oracolo RLS vedrà la
  nuova `waitlist_leads` (RLS enabled, zero-policy, giustificata P6A-D5); le nuove dep del blog passano
  OSV.
- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` — ratchet solo **additivo** e giustificato.
- **Budget**: un macrotask alla volta; loop di fix con tetto in `references/oracles/thresholds.md`.

## 5. Esiti dell'ultima sessione (framing onesto)

- BOOTSTRAP Trueline eseguito: generato il blueprint (00-INDEX + 22 moduli + SESSION-STATE + 3 prompt)
  dalla spec approvata `VISION-AND-CONSTRAINTS.md` (ledger P6A-D1…D13). Metodo: dynamic workflow di
  design (6 agenti di cluster + 1 critico di coerenza).
- Self-check **strutturale** (`validate_blueprint.mjs`): **verde 5/5, `ok:true`, 26 task atomici**
  (REQUIRED_FIELDS, AC_COVERAGE, DAG_VALID aciclico, UNIQUE_IDS, MACROTASK_OWNERSHIP).
- Self-check **semantico** (checklist 6–10) + coerenza cross-modulo: rilievi del critico **RISOLTI** —
  chiuso l'orfano `getLandingBaseUrl` (prodotto in PUB-102, consumato da seo-robots/sitemap/metadata);
  firma `guardMutatingRequest` a oggetto `{ maxBodyBytes }` (PUB-231); namespace i18n `blog` con parità
  IT↔ES (PUB-421); schema corpo `/api/waitlist` `{ status: 'inserted'|'already' }` pinnato PUB-232↔PUB-241;
  etichette OWASP-2025 corrette (injection=A05, path-traversal=A01, DI non-injection in PUB-222). DAG
  aciclico, nessuna collisione ID, contratti (testid/i18n/firme/schema) coerenti.
- **Decisione aperta (nota)**: il rate-limit in-memory citato in VISION §5/D6-D7 non è consegnato da
  alcun task (l'anti-spam v1 resta honeypot + Turnstile + same-origin). Da decidere: aggiungere un
  micro-task o annotarne il rinvio in VISION (in serverless il rate-limit in-memory è per-istanza,
  best-effort).

## 6. Prossimi passi

- Confermare la chiusura del bootstrap (strutturale verde + rilievi semantici risolti/accettati).
- Aprire la prima sessione di BUILD su un macrotask eleggibile (§1) col dynamic workflow command-free.

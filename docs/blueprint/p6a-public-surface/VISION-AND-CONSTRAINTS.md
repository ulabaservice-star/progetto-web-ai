# VISION & CONSTRAINTS — p6a-public-surface

> Visione e vincoli del blueprint trueline di **P6a — superficie pubblica** di Ulaba/Belora
> (`supabase-jsts`). Prosa in italiano, identificatori/nomi-file in inglese. Cattura il *perché*, il
> *per chi*, i *non-goals*, i *vincoli* e le *decisioni tracciabili*. È il primo workstream post-P5
> (billing + custom-domains chiusi). Nasce dal brainstorming del 2026-09-01 che ha **rifuso** un
> blueprint esterno di Fable 5 (strategia valida, stack allucinato) sul nostro stack reale
> Next.js 16 App Router + Vercel. **P6a è la spina dorsale pubblica**; l'anteprima istantanea del sito
> ("nome attività → ecco il tuo sito") è deliberatamente separata in **P6b** (suo blueprint).

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P6a (superficie pubblica: split dominio + landing + waitlist + SEO + blog) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU, Vercel, Cloudflare DNS+Access) |
| **Owner / stakeholder** | claudiosnivel (solo dev, ~3h/settimana, budget promozione 0) |

---

## 1. Perché esiste (problema)

Oggi **tutto `ulaba.net` è dietro il muro Cloudflare Access** (messo per proteggere i test con API
Anthropic a consumo). Conseguenza: **impossibile raccogliere lead o farsi indicizzare da Google**. Il
prodotto è in costruzione, il lancio non è imminente, ma SEO e audience **compongono nel tempo**:
iniziare ora la superficie pubblica rende più che aspettare il lancio. Serve separare l'**app privata**
dal **sito pubblico** sullo stesso dominio, mettere online una **landing con waitlist** e posare le
**fondamenta SEO** (tecniche + un blog operativo). La landing **è la demo del prodotto**: se è
bella/veloce conferma la promessa "faccio siti belli"; se è lenta/amatoriale la contraddice (trust
signal #1, più di ogni scelta di sottodominio).

## 2. Per chi (utenti)

- **Visitatori/lead** — micro-business locali IT ed ES/LATAM che scoprono Ulaba e lasciano l'email in
  waitlist (in attesa del lancio). Superficie **anonima**: nessun login per iscriversi.
- **Founder** — legge i lead dalla dashboard Supabase; pubblica articoli scrivendo file markdown;
  compie le azioni manuali di infrastruttura (§10). Vincolo di tempo reale: **~3h/settimana**, quindi
  ogni scelta minimizza la manutenzione.

## 3. Obiettivo (cosa significa "fatto")

Con P6a completo: `ulaba.net` serve una **landing pubblica indicizzabile** (IT+ES) con **form
waitlist** funzionante e anti-spam; `app.ulaba.net` serve l'**app invariata** dietro Access; un
**blog operativo** (`ulaba.net/blog`) rende articoli reali da file markdown, con dati strutturati e
sitemap; le fondamenta SEO tecniche (robots per-host, sitemap con hreflang IT↔ES, canonical, Open
Graph, JSON-LD) sono in piedi e pronte per Google Search Console. Nessuna modifica **funzionale**
all'app; Stripe resta spento.

Il blueprint scompone questo obiettivo in macrotask; i `target_tests` dei task atomici ne diventano
l'oracolo del checkpoint. "Fatto" = oracoli verdi sul confine di ogni macrotask, **non** una
dichiarazione dell'LLM.

## 4. Non-goals (cosa NON facciamo in P6a)

- **Anteprima istantanea del sito** ("inserisci nome attività → ecco il tuo sito"). È il vantaggio
  competitivo #1 ed è **fattibile in modo deterministico** (motore a blocchi già puro — `selectDesign`
  seedato — + copy da template settoriali, **zero API a consumo**), ma è un pezzo grande e indipendente
  → **P6b**, suo blueprint. La hero di P6a nasce però con uno **slot riservato** per accoglierla senza
  rework. (P6A-D13)
- **Referral "salta la fila", badge "Made with Ulaba", programmatic SEO settore×città.** Armi del
  motore-come-marketing, rimandate (P6b/oltre). (P6A-D13)
- **Attivazione Stripe / founder-deal.** Bloccati dal nodo fiscale; nessun prezzo, nessun pagamento.
- **Provider email transazionale + double opt-in.** Nessun servizio email attivo in v1 → niente double
  opt-in (si aggiunge quando esisterà un provider). (P6A-D7)
- **Tool di email marketing terzi** (Mailchimp/ConvertKit): i lead vivono su Supabase, dati di
  proprietà. (P6A-D5)
- **Modifiche funzionali all'app** su `app.ulaba.net`: cambia solo l'hostname e la sua configurazione.
- **Crowdfunding.** Fuori fit per SaaS in abbonamento; la cassa anticipata verrà dal founder-deal sulla
  waitlist (dopo il fisco).

## 5. Vincoli

| Tipo | Vincolo |
|---|---|
| Ecosistema | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU, Vercel, Cloudflare DNS+Access). **Monolite**: landing e app nello stesso progetto Next/Vercel, separati per Host (no repo/deploy separato). |
| Host-partitioning | tre categorie di Host — `app` (`NEXT_PUBLIC_APP_URL`), `landing` (`NEXT_PUBLIC_LANDING_URL` = apex + `www`), `custom` (domini cliente, invariato). Guard **simmetrico** nel middleware: rotte app su host landing → 308 verso `app.`; rotte marketing su host app → 308 verso la landing. La rotta `/s/*` e il routing per locale **non** vanno toccati (non-regressione `auth-middleware`/host-routing). |
| Sicurezza — API a consumo | il middleware **non gira su `/api/*`** (escluso dal matcher): la difesa NON è lì. Tre livelli: (1) guardia auth nei route handler (già `401` senza sessione → un anonimo non spende); (2) **Cloudflare Access** resta su `app.ulaba.net`; (3) regola Cloudflare opzionale che nega le rotte a-consumo su host landing. (P6A-D3) |
| Sicurezza — waitlist | `waitlist_leads` con **RLS enabled + ZERO policy** anon/authenticated: il client non legge né scrive; **solo il server** via `createAdminClient` (service_role, mai nel browser) inserisce. `/api/waitlist` dietro `guardMutatingRequest` (same-origin + byte), **honeypot** + **Turnstile** dietro porta `CaptchaVerifier`. Idempotenza su unique-violation `23505` → `200` "già in lista". **Niente IP in chiaro**. Anti-spam v1 **consegnato** = **honeypot + Turnstile + same-origin**; il **rate-limit in-memory è RINVIATO** e non è consegnato da alcun task P6a (in serverless è per-istanza/best-effort ⇒ scarsa efficacia): si valuterà un rate-limit distribuito se/quando il volume lo richiederà (nota di bootstrap 2026-09-01). (P6A-D5, P6A-D6, P6A-D7) |
| Sicurezza — output | hostname/valori resi solo come testo JSX (escaping React), mai `innerHTML`/`href` interpolato; JSON-LD emesso con `serializeJsonLdSafe` (riuso da `jsonld.ts`, anti-XSS); markdown del blog sanitizzato in pipeline (`rehype-sanitize`) anche se contenuto fidato. |
| i18n | landing + blog **IT+ES da subito** (contenuti + infra), dentro il routing `[locale]` esistente (`localePrefix: 'always'`); ES **localizzato per paese** (tú/vos/ustedes), non tradotto meccanicamente. La waitlist salva `locale`. (P6A-D10) |
| Provider/env | Turnstile inerte senza `TURNSTILE_SECRET_KEY`/`NEXT_PUBLIC_TURNSTILE_SITE_KEY` (il form dichiara "non disponibile", non un 500), come le CTA Stripe. `NEXT_PUBLIC_LANDING_URL` è la sorgente del canonical/host landing. |
| Dipendenze | il repo è parsimonioso (evita perfino un parser HTML in `fromUrl.ts`). Il blog introduce ~4 dep (unified/rehype/rehype-sanitize/gray-matter): passano sotto l'oracolo **OSV** (C2), nessuna con CVE note. |
| Git/Deploy | branch a strati; merge su `main` gated dal verde; deploy-coupling **coupled** (push su `main` = deploy su ulaba.net) → verifica **locale** prima del merge (vitest, e2e Chromium, `next build`). Il **cutover di dominio** ha ordine obbligato ed è un macrotask human-gated (§9, P6A-D12). |

## 6. Decisioni tracciabili (ledger del brainstorming 2026-09-01)

| ID | Decisione | Razionale |
|---|---|---|
| P6A-D1 | Architettura **B** (`ulaba.net`=landing, `app.ulaba.net`=app), **monolite** Next con host-guard nel middleware. | Standard SaaS professionale; SEO neutra (A e B pari). Monolite riusa stack/i18n/RLS/motore (per P6b), un solo deploy. Repo separato scartato (duplica tutto, niente riuso motore). |
| P6A-D2 | `classifyRequestHost(host) → 'app'\|'landing'\|'custom'` + guard **simmetrico** (redirect 308). | Il middleware oggi conosce solo platform/custom; la landing è la terza categoria. Redirect simmetrico tiene i confini netti e il canonical stabile. |
| P6A-D3 | API a consumo difese a 3 livelli (auth-guard route handler + Access su app + regola Cloudflare opzionale); **non** nel middleware. | Il matcher esclude `/api/*`: il middleware non può bloccarle. Le guardie auth già impediscono spesa anonima; Access è la cintura di rete. |
| P6A-D4 | Rotte marketing in **route group `[locale]/(marketing)/`** (home, blog, privacy); canonical host **fisso** `ulaba.net`. | Confini netti marketing/app nello stesso albero; IT+ES gratis dal routing `[locale]`. |
| P6A-D5 | `waitlist_leads` **RLS zero-policy**; scrive **solo** il server (service_role); dati su Supabase (no tool terzi). | Pattern più chiuso del repo (owner-only *senza owner*); budget zero, dati di proprietà. |
| P6A-D6 | `/api/waitlist` con honeypot + **Turnstile dietro porta `CaptchaVerifier`** (fake nei test) + idempotenza `23505`; inerte senza env. | Anti-spam gratuito; nessuna chiave reale nel verde; UX idempotente ("già in lista"); nessun 500 senza config. |
| P6A-D7 | **Niente double opt-in** in v1; niente IP in chiaro. Anti-spam v1 consegnato = **honeypot + Turnstile + same-origin**; **rate-limit in-memory RINVIATO** (per-istanza/best-effort in serverless, non consegnato da un task P6a — nota di bootstrap 2026-09-01). | Nessun provider email attivo (double opt-in quando esisterà). Il rate-limit distribuito si valuta se il volume lo richiede; l'in-memory su Vercel non darebbe garanzie reali. |
| P6A-D8 | SEO tecnico: **robots host-aware** (`headers()`), **`sitemap.ts` con hreflang IT↔ES**, canonical + OG/Twitter, JSON-LD Organization/WebSite. | robots.ts oggi è globale; con lo split serve per-Host (landing indicizzabile, app disallow, mai linkare `app.` dal robots landing). |
| P6A-D9 | Blog **file-based** (`content/blog/{it,es}/<slug>.md` + frontmatter `translationKey`), pipeline **unified + rehype-sanitize + gray-matter**, **SSG**, JSON-LD `Article`, hreflang **solo tra traduzioni reali**. | Contenuto fidato (git review); pipeline pura → oracolo deterministico; sanitizzazione libreria-provata, non artigianale; hreflang onesto (post mono-lingua ⇒ nessun alternate fittizio). |
| P6A-D10 | **IT+ES da subito** (contenuti + infra), ES localizzato per paese. | `es` è già cablato (`messages/es.json` + `[locale]`); il costo è il copy, sostenuto dal founder. |
| P6A-D11 | Contatore iscritti **spento** in v1; analytics **Cloudflare Web Analytics** cookieless. | Numeri <~50 danneggiano la fiducia (benchmark); cookieless ⇒ nessun cookie banner. |
| P6A-D12 | **Cutover human-gated** con ordine obbligato: landing live+verde su `ulaba.net` PRIMA di spostare l'app su `app.ulaba.net`; **Supabase Auth** Site/Redirect URL → `app.` PRIMA (o magic-link/OAuth si rompono); poi rescope Access. | Evita che la root vada giù o che l'auth si rompa durante lo spostamento. |
| P6A-D13 | **Fuori scope P6a → P6b**: anteprima istantanea deterministica, referral, badge, programmatic SEO. La hero P6a lascia lo **slot** per l'anteprima. | Un blueprint focalizzato alla volta; sblocca subito lead+SEO; l'anteprima è grande e merita il suo spec. |

## 7. Parity gate (promessa forte)

Conformità alla specifica = i `target_tests` dei task del macrotask passano al checkpoint 4/4 (igiene,
sicurezza, suite, AC) + batteria di mutazione (ripristino bit-identico sha256). Verdetto dal **JSON**
del checkpoint, mai dall'exit code. Testabilità **senza segreti**: Turnstile con fake iniettato,
waitlist store in-memory iniettabile, pipeline markdown pura, **RLS `waitlist_leads` verificata con DB
reale sotto anon** (anti-placebo, come `site_domains`).

## 8. Baseline & budget

- **Baseline d'igiene**: `.trueline/hygiene-baseline.json` (versionata) — ratchet solo **additivo** e
  giustificato (nuovi file clone-free; eventuali cloni-boilerplate di route handler dello stesso genere
  già in baseline).
- **Baseline di sicurezza** (C2): `gitleaks/osv/semgrep/rls` — l'oracolo RLS vedrà la nuova
  `waitlist_leads` (RLS enabled, zero-policy); le nuove dep del blog passano OSV.
- **Budget**: un macrotask alla volta; loop di fix con tetto in `references/oracles/thresholds.md`.
  Metodo di esecuzione: **dynamic workflow command-free** (builder solo Read/Write/Edit in parallelo
  su file disgiunti; oracoli in **foreground** dall'orchestratore, unico giudice del verde).

## 9. Sequenza macrotask proposta (input per il bootstrap)

DAG a 8 macrotask piccoli (il bootstrap Trueline li raffina in task atomici con AC/`target_tests`):

1. **host-classify** — `classifyRequestHost` + env landing + host-guard **simmetrico** nel middleware;
   non-regressione `auth-middleware`/host-routing. *(nessuna dip.)*
2. **marketing-shell** — route group `(marketing)` + layout + home **strutturale** (blocchi, slot hero
   riservato per P6b) + namespace i18n `landing` IT+ES. *(nessuna dip.)*
3. **waitlist-store** — migrazione `waitlist_leads` + RLS **zero-policy** + writer service_role
   iniettabile + test RLS DB-reale. *(nessuna dip.)*
4. **waitlist-endpoint** — `/api/waitlist` + porta `CaptchaVerifier` (Turnstile) + honeypot +
   idempotenza `23505` + guardie. *(dip. 3)*
5. **waitlist-form** — form client (hero + fondo pagina), stati (già-in-lista/errore/inerte-senza-env),
   consenso GDPR non pre-spuntato. *(dip. 2, 4)*
6. **seo-tech** — robots host-aware + `sitemap.ts` hreflang + metadata OG/canonical + JSON-LD
   Organization/WebSite + `/privacy` IT+ES. *(dip. 2)*
7. **blog** — pipeline unified + `content/blog` + rotte listing/post (SSG) + JSON-LD `Article` +
   integrazione sitemap + 1–2 post seed IT+ES. *(dip. 2, 6)*
8. **cutover** — go-live human-gated con ordine obbligato (§P6A-D12): deploy landing → verifica → Auth
   URL → Access rescope → sposta app → verifica oracolare `curl`. *(dip. tutto)*

Eleggibili per primi (in parallelo, file disgiunti): **host-classify ∥ marketing-shell ∥
waitlist-store**. `cutover` per ultimo.

## 10. Azioni manuali del founder (non-codice)

Il blueprint lascia tutto pronto e verifica con oracolo `curl`; queste azioni restano al founder:
rescope **Cloudflare Access** → solo `app.ulaba.net`; DNS `app`/`www`; chiavi **Turnstile** (site +
secret) + `NEXT_PUBLIC_LANDING_URL` su Vercel; **Supabase Auth** Site/Redirect URL → `app.`;
CORS/webhook Stripe-test da `ulaba.net`→`app.`; **Google Search Console** (verifica DNS TXT + invio
sitemap); copy definitivo landing IT+ES + immagine OG 1200×630.

## 11. Fonti di verità

- **Piano**: il blueprint (`00-INDEX` + moduli `01`–`08`) — generato dal bootstrap Trueline.
- **Stato vivo**: `docs/blueprint/p6a-public-surface/SESSION-STATE.md` (distinta da quelle di P0…P4,
  design-engine, onboarding-guided-wizard, p5-billing-fase1, p5-custom-domains-fase2, Trueline).
- **Materiale d'origine (sole idee)**: `docs/ideas/2026-08-29-fable-waitlist-promo-idee.md` (blueprint
  Fable 5, stack allucinato) + memorie `waitlist-launch-project` e `waitlist-launch-research`
  (deep research 2026-08-29: architettura A/B, due imbuti, motore-come-marketing, benchmark waitlist,
  canali IT/ES/LATAM).
- **Fase successiva**: **P6b — "motore-come-marketing"** (suo blueprint + brainstorming dedicato).
  **L'apertura di P6b decide quali delle 4 armi entrano e in che ordine**: anteprima istantanea
  deterministica + programmatic SEO settore×città (**nucleo accoppiato al motore** — riusano
  `selectDesign` puro + i copy-template settoriali), referral "salta la fila" e badge "Made with
  Ulaba" (armi **indipendenti dal motore**, valutate lì per collocazione/taglia; il badge ha impatto
  differito finché non esistono siti Free pubblicati). Nessuna delle quattro è persa: qui restano
  tracciate come rimandate (P6A-D13).

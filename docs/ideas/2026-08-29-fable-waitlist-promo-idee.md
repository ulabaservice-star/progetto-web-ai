<!-- ============================================================ -->
<!-- ⚠️ MATERIALE DI SOLE IDEE — NON è un blueprint esecutivo    -->
<!-- ============================================================ -->

# ⚠️ Nota di stato — leggere prima

Questo documento è stato generato da **Fable 5** in una conversazione esterna ed è conservato **solo come fonte di idee/ispirazione** per il workstream **P6 (lancio/waitlist)**. **NON va eseguito alla lettera**: non è un blueprint operativo, nonostante il suo tono.

**Perché solo idee:** la *strategia* è valida, ma lo *stack* descritto è allucinato.

- Il doc assume "React + Vite + shadcn su **Cloudflare Pages** / **Pages Functions**".
- La realtà del repo è **Next.js 16 App Router su Vercel** + Supabase Cloud EU + Cloudflare (DNS + Access). Le "Pages Functions" da noi sono **Route Handler Next** (`src/app/api/.../route.ts`) + guardie `_shared/request-guard` + `route-guards`.
- `/s/*` è **già pubblico** (eccezione Cloudflare Access già configurata); l'i18n `es` è **già cablato** (`messages/es.json` + routing `[locale]`).

**Correzione strategica** (dalla deep research 2026-08-29): il baricentro promozionale NON è "SEO + build-in-public" ma **due imbuti separati** (canale-founder ≠ canale-ICP) + **il motore stesso come strumento di marketing** (anteprima istantanea, programmatic SEO settore×città, badge "Made with Ulaba"). Architettura raccomandata: **B** (`app.ulaba.net` = app, `ulaba.net` = landing), con blog sempre in `ulaba.net/blog`.

Il blueprint **esecutivo** vero nascerà dal **brainstorming P6** (prossima sessione) e sarà rifuso sul nostro stack. Diagnosi completa e ricerca nelle memorie `waitlist-launch-project` e `waitlist-launch-research`.

Data cattura: 2026-08-29.

---

<!-- ↓↓↓ Testo originale di Fable 5, integrale e non modificato ↓↓↓ -->

# ULABA — BLUEPRINT: Split dominio, Waitlist pubblica, Fondamenta di promozione organica

> Documento operativo per Claude Code. Scope chiuso: eseguire le fasi in ordine, senza estendere il perimetro.
> Formato decisioni: ledger con ID tracciabili `L-ULA-1xx` (infrastruttura), `L-ULA-2xx` (waitlist), `L-ULA-3xx` (SEO/contenuti).

---

## 0. CONTESTO E STATO ATTUALE

- **Prodotto:** Ulaba (ulaba.net) — SaaS in abbonamento, modello freemium (Free + Pro), in costruzione. Lancio non imminente.
- **Stack esistente:** React + Vite + TypeScript + Tailwind + shadcn/ui su Cloudflare Pages; backend Supabase (Postgres + RLS). Integrazione Stripe (checkout, portal, webhook) già costruita ma **NON attiva** — resta disattivata finché l'inquadramento fiscale non è definito.
- **Problema attuale:** l'intero dominio `ulaba.net` è dietro un muro di login Cloudflare Access (messo per proteggere i test con API Anthropic a consumo). Conseguenza: impossibile raccogliere lead o farsi indicizzare da Google.
- **Obiettivo di questo blueprint:** separare app privata e sito pubblico sullo stesso dominio, mettere online una landing con waitlist, posare le fondamenta SEO. Budget promozione: **zero**. Tempo disponibile del founder: **~3 h/settimana** → ogni scelta deve minimizzare la manutenzione.

---

## 1. DECISIONI BLOCCATE (LEDGER)

| ID | Decisione | Razionale |
|---|---|---|
| L-ULA-101 | L'app attuale si sposta su `app.ulaba.net`; la root `ulaba.net` diventa sito pubblico. **Nessun nuovo dominio.** | SEO e backlink devono maturare sul dominio definitivo; un dominio ponte richiederebbe una migrazione con perdita parziale di autorità. |
| L-ULA-102 | Cloudflare Access resta attivo **solo** su `app.ulaba.net`. La root deve essere pubblica e indicizzabile. | Il muro serve a proteggere i test con API a consumo, non il marketing. |
| L-ULA-103 | Landing e app sono **due progetti Cloudflare Pages separati**. | Isolamento totale: la landing non può toccare le API a consumo; deploy indipendenti. |
| L-ULA-201 | La waitlist scrive su **Supabase** (progetto già esistente), nessun tool terzo (no Mailchimp/ConvertKit). | Budget zero, stack già noto, dati di proprietà. |
| L-ULA-202 | L'inserimento passa da una **Pages Function** server-side, mai da insert diretto client→Supabase. | Tiene la service key fuori dal client, permette validazione Turnstile e rate limiting. |
| L-ULA-203 | Anti-spam: **Cloudflare Turnstile** (gratuito) + honeypot. Niente double opt-in in v1 (non c'è servizio email attivo). | Zero costi, zero dipendenze email. Il double opt-in si aggiunge quando esisterà un provider email. |
| L-ULA-301 | La landing è **statica / prerenderizzata** (HTML servito, non SPA client-side). | È una pagina SEO: il contenuto deve essere nell'HTML iniziale. |
| L-ULA-302 | Contenuti solo in **italiano** in v1. Spagnolo e LATAM rimandati. | 3 h/settimana non reggono due mercati. |
| L-ULA-303 | **Nessuna campagna di crowdfunding** (Kickstarter/Indiegogo). | Fit pessimo per SaaS in abbonamento (regole Kickstarter escludono web business che richiedono manutenzione); una campagna riuscita obbligherebbe all'apertura immediata della partita IVA, anticipando il nodo fiscale ancora aperto; senza audience preesistente le campagne falliscono. La "cassa anticipata" si otterrà con il founder deal sulla waitlist (vedi §7). |

---

## 2. ARCHITETTURA TARGET

```
ulaba.net            → Progetto Pages "ulaba-landing" (pubblico, statico, SEO)
www.ulaba.net        → redirect 301 → ulaba.net
app.ulaba.net        → Progetto Pages esistente (app React) + Cloudflare Access
```

- La landing espone: home con waitlist, `/privacy`, `/blog` (anche vuoto in v1, ma con struttura pronta), `sitemap.xml`, `robots.txt`.
- L'app non subisce modifiche funzionali: cambia solo l'hostname.

---

## 3. FASE 1 — INFRASTRUTTURA CLOUDFLARE

### 3.1 Spostamento app su app.ulaba.net
1. Nel progetto Pages esistente dell'app: aggiungere custom domain `app.ulaba.net` (Cloudflare crea il record DNS CNAME automaticamente se la zona è su Cloudflare).
2. Verificare che l'app funzioni su `app.ulaba.net` (auth Supabase: aggiornare **Site URL e Redirect URLs** nel dashboard Supabase → Authentication → URL Configuration, altrimenti i magic link/OAuth torneranno sul vecchio host).
3. Aggiornare eventuali variabili d'ambiente / allowed origins (CORS Supabase, webhook Stripe in modalità test, ecc.) da `ulaba.net` a `app.ulaba.net`.
4. Solo dopo verifica: rimuovere il custom domain `ulaba.net` dal progetto app.

### 3.2 Rescope di Cloudflare Access
1. Zero Trust → Access → Applications: individuare l'applicazione self-hosted che oggi copre `ulaba.net`.
2. Modificare l'application domain in `app.ulaba.net` (coprire l'intero hostname, path `/*`). Non creare policy che tocchino la root.
3. **Verifica oracolare (obbligatoria):**
   - `curl -sI https://app.ulaba.net` → deve rispondere con redirect al login Access (302 verso `cloudflareaccess.com`).
   - `curl -sI https://ulaba.net` → deve rispondere 200 (o 404 finché la landing non è deployata), **senza** redirect Access.
4. Controllare che non esistano altre Access apps o WAF rules residue sulla root.

### 3.3 DNS e redirect
- `ulaba.net` e `www.ulaba.net` → custom domains del nuovo progetto "ulaba-landing".
- Bulk redirect o regola: `www.ulaba.net/*` → 301 → `ulaba.net/$1` (un solo host canonico).

---

## 4. FASE 2 — LANDING + WAITLIST

### 4.1 Progetto e stack
- Nuovo repo/progetto Pages `ulaba-landing`.
- Stack coerente col resto del portfolio ma **static-first** (L-ULA-301): Vite + React con prerender in build, oppure HTML statico + Tailwind se più semplice. Vincolo non negoziabile: il contenuto testuale della home deve essere presente nell'HTML servito (verificare con `curl https://ulaba.net | grep "<h1"`).
- Peso pagina: target < 100 KB trasferiti (esclusi font). Niente librerie superflue.

### 4.2 Struttura pagina home
Ordine dei blocchi (copy da definire col founder, qui i placeholder strutturali):
1. **Hero:** H1 col problema che Ulaba risolve (non il nome del prodotto come claim), sottotitolo, form waitlist inline (solo campo email + submit).
2. **Sezione problema/soluzione:** 3 blocchi brevi.
3. **Come funzionerà:** 2–3 step.
4. **Founder deal teaser:** "I primi iscritti avranno condizioni riservate al lancio" — nessun prezzo, nessun pagamento (Stripe resta spento).
5. **Secondo form waitlist** a fondo pagina.
6. Footer: link `/privacy`, contatto email.

### 4.3 Backend waitlist (Supabase)
Migrazione SQL:

```sql
create table public.waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'landing',        -- per tracciare provenienza (landing, blog, social)
  locale text default 'it',
  consent boolean not null default false, -- checkbox privacy
  created_at timestamptz not null default now()
);

alter table public.waitlist_leads enable row level security;
-- Nessuna policy per anon: né select né insert dal client.
-- Tutte le scritture passano dalla Pages Function con service role key.
```

Note:
- Email normalizzata lato server (trim + lowercase) prima dell'insert.
- Violazione unique (23505) → risposta 200 con messaggio "sei già in lista" (non rivelare/errore, UX idempotente).
- **Non** salvare IP in chiaro. Se serve rate limiting persistente, salvare solo un hash troncato. In v1 basta il rate limiting in memoria + Turnstile.

### 4.4 Pages Function `/api/waitlist`
- Metodo POST, body `{ email, consent, turnstileToken, website }` (`website` = honeypot: se valorizzato → rispondere 200 e scartare).
- Flusso: valida honeypot → verifica token Turnstile via `https://challenges.cloudflare.com/turnstile/v0/siteverify` → valida formato email → valida `consent === true` → insert su Supabase con service role key (secret di progetto Pages, mai nel client).
- Risposte: sempre JSON minimale; nessun dettaglio interno negli errori.
- Env vars progetto landing: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`.

### 4.5 GDPR (minimo indispensabile)
- Checkbox consenso non pre-spuntata, con link a `/privacy`.
- Pagina `/privacy` con: titolare, finalità (avviso lancio Ulaba + comunicazioni sul prodotto), base giuridica (consenso), conservazione, diritto di cancellazione via email.
- Dati raccolti: solo email + consenso + timestamp. Niente analytics con cookie in v1 (se servono metriche: Cloudflare Web Analytics, cookieless, gratuito).

### 4.6 Verifiche oracolari Fase 2
- `curl -X POST https://ulaba.net/api/waitlist` con payload valido → 200 e riga presente in `waitlist_leads`.
- Stesso payload ripetuto → 200 "già in lista", nessuna riga duplicata.
- Payload con honeypot valorizzato → 200 ma nessuna riga.
- Payload senza token Turnstile valido → 4xx.
- Query da client con anon key su `waitlist_leads` → negata da RLS.

---

## 5. FASE 3 — FONDAMENTA SEO

### 5.1 Tecnico (da fare nel progetto landing)
- `<title>` e meta description unici per pagina; H1 unico.
- Open Graph + Twitter card (immagine statica 1200×630 anche provvisoria).
- `robots.txt`: allow all sulla root; **nessun riferimento** ad `app.ulaba.net` (l'app è comunque dietro Access, ma non linkarla).
- `sitemap.xml` generata in build (home, privacy, articoli blog).
- Canonical su ogni pagina; host canonico `https://ulaba.net`.
- Dati strutturati JSON-LD: `Organization` + `WebSite` in home; `Article` sui post.
- Al termine: registrare la proprietà su **Google Search Console** (verifica via DNS TXT) e inviare la sitemap. → azione manuale del founder, il blueprint deve solo lasciare tutto pronto.

### 5.2 Struttura blog
- Route `/blog` con listing e post statici (markdown → HTML in build).
- Ogni post: slug pulito, title/description propri, data, JSON-LD Article.
- Il blog può partire vuoto: la struttura deve esistere da subito perché i primi articoli arrivino senza lavoro infra.

### 5.3 Linea editoriale (vincolo strategico, non di codice)
- Keyword **problem-first**: articoli che rispondono alle ricerche di chi ha il problema che Ulaba risolve, non articoli sul prodotto.
- Cadenza sostenibile con 3 h/settimana: **1 articolo ogni 2 settimane**, riciclato sui social (vedi §6). Meglio 2 articoli/mese per 12 mesi che 8 articoli in un mese e poi silenzio.
- Ogni articolo chiude con CTA alla waitlist (form o link ancorato).

---

## 6. FASE 4 — PROMOZIONE ORGANICA (playbook per il founder, non per Claude Code)

- **Canale primario: SEO** (lavora anche nelle settimane in cui il founder non c'è).
- **Canale secondario: build in public** — 1 post/settimana su un solo social (scegliere quello dove sta il target di Ulaba), raccontando avanzamento reale dello sviluppo. Il post rimanda alla waitlist. Se la costanza settimanale non regge, sospendere il social e proteggere la cadenza del blog.
- **Riciclo:** ogni articolo del blog → 2–3 post social derivati. Mai contenuto social originale che non derivi dal blog (economia di tempo).
- **Misura minima:** iscritti waitlist/settimana + click da Search Console. Nient'altro in v1.

---

## 7. FOUNDER DEAL (dipendenza esterna: inquadramento fiscale)

- **Bloccato finché la posizione fiscale non è aperta.** Nessun pagamento, nessun prezzo pubblico, Stripe spento.
- Quando sbloccato: offerta riservata agli iscritti waitlist (sconto founder o lifetime deal sul piano Pro) via email. Funziona da validazione della domanda e cassa anticipata — è il sostituto deliberato del crowdfunding (L-ULA-303).
- Prerequisito tecnico futuro: scelta di un provider email transazionale (fuori scope ora).

---

## 8. FUORI SCOPE ESPLICITO

- Nessuna modifica funzionale all'app su `app.ulaba.net`.
- Nessuna attivazione Stripe.
- Nessuna versione spagnola/inglese della landing.
- Nessun tool di email marketing terzo.
- Nessuna campagna crowdfunding.

---

## 9. SESSION-STATE INIZIALE

```
FASE 1 (infra Cloudflare)     : ☐ non iniziata
FASE 2 (landing + waitlist)   : ☐ non iniziata
FASE 3 (fondamenta SEO)       : ☐ non iniziata
FASE 4 (playbook promozione)  : n/a per Claude Code — responsabilità founder
FOUNDER DEAL                  : ⏸ bloccato da inquadramento fiscale
Azioni manuali founder        : ☐ Search Console  ☐ chiavi Turnstile  ☐ copy definitivo landing  ☐ scelta social build-in-public
```

Ordine di esecuzione vincolante: Fase 1 → verifica oracolare §3.2 → Fase 2 → verifiche §4.6 → Fase 3. Non aprire la fase successiva con verifiche pendenti.

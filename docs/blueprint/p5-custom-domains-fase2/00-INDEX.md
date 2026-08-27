# 00-INDEX — p5-custom-domains-fase2

> Mappa del blueprint trueline della **Fase 2 di P5 — domini custom** di Ulaba/Belora
> (`supabase-jsts`). Un modulo = un macrotask (checkpoint al confine + commit atomico). Schema task:
> `references/blueprint/atomic-task-schema.md`. Prosa in italiano, identificatori in inglese. Seguito
> di `p5-billing-fase1` (nucleo billing, DAG chiuso 2026-08-27).

## Scopo

Realizzare la feature Pro che la Fase 1 ha già venduto ma non costruito: **collegare il dominio del
cliente** al suo sito pubblicato. **Solo connessione, non vendita** (l'utente porta un dominio suo);
**apex + sottodominio** (con **auto-www**); HTTPS automatico; provider **Vercel Domains API** dietro la
porta `DomainProvider`. Chiude anche il ciclo BIL-D7: lo **scollegamento morbido** del dominio in
downgrade Pro→Free (reversibile, mai delete).

## Granularità (perché 12 macrotask piccoli)

Il BUILD è **sessione-per-sessione** (niente workflow multi-agente): il piano è scomposto in **macrotask
piccoli e mono-responsabilità** (1–3 micro-task ciascuno, pochi AC), così ogni sessione carica poco
contesto e costruisce poco. Un macrotask = una sessione leggera = un checkpoint = un commit atomico.

## Mappa dei macrotask

| # | Macrotask | Contenuto | Dipende da |
|---|---|---|---|
| 01 | `domain-schema` | Migrazione `site_domains` + RLS **owner-only** gestione (DOM-101) e policy **SELECT anon-active** column-level per il routing (DOM-102). | — |
| 02 | `domain-hostname` | Dominio puro: `normalizeHostname` forma (DOM-111) + `classifyHostname` apex/subdomain + reserved (DOM-112). | — |
| 03 | `domain-companion` | Dominio puro auto-www: `companionHostname` (apex ⇒ www; subdomain ⇒ nessuno) (DOM-121). | `domain-hostname` |
| 04 | `domain-dns` | Dominio puro: `dnsInstructionsFor` (A/ALIAS apex, CNAME subdomain, TXT verifica) (DOM-131). | `domain-hostname` |
| 05 | `domain-port` | Porta `DomainProvider` pura (DOM-201) + **fake** in-memory per i test (DOM-202). | — |
| 06 | `domain-vercel` | Adattatore **Vercel** (server-only, lazy, env-gated, no segreti) (DOM-211). | `domain-port` |
| 07 | `domain-store` | Data layer: reader owner-side RLS (DOM-221) + writer di stato service_role confinato (DOM-222). | `domain-schema` |
| 08 | `domain-connect` | `POST /connect`: guardie+gate Pro (DOM-301), valida+crea pending+addDomain (DOM-302), **auto-www** apex+www (DOM-303). | `domain-hostname`, `domain-companion`, `domain-port`, `domain-store` |
| 09 | `domain-verify-disconnect` | `POST /verify` (attiva solo a DNS confermato, DOM-311) + `POST /disconnect` (DOM-321). | `domain-connect`, `domain-vercel` |
| 10 | `domain-routing` | Reader pubblico host→slug anon-active (DOM-401) + middleware rewrite `/s/<slug>` (DOM-402). | `domain-schema` |
| 11 | `domain-ui` | Sezione UI stato/istruzioni/azioni (DOM-501) + gate Pro/Free (DOM-502). **Gate visivo umano**. | `domain-verify-disconnect` |
| 12 | `domain-downgrade` | `applyDomainDowngrade` puro (DOM-601) + applicazione idempotente nel webhook (DOM-602). Chiude BIL-D7. | `domain-schema`, `domain-store` |

**Build order (DAG per macrotask):**
```
domain-schema ─┬─ domain-store ─┐
               └─ domain-routing │
domain-hostname ─┬─ domain-companion ─┐
                 └─ domain-dns         │
domain-port ─── domain-vercel          │
                 (schema+hostname+companion+port+store) → domain-connect
domain-connect ─┬─ domain-verify-disconnect ─── domain-ui
                └─ (con schema+store)       domain-downgrade
```
Primi eleggibili (nessuna dipendenza): `domain-schema`, `domain-hostname`, `domain-port`.

## ID dei task

Prefisso `DOM-`. Numerazione per macrotask: schema `1xx`, hostname `11x`, companion `12x`, dns `13x`,
port `20x`, vercel `21x`, store `22x`, connect `30x`, verify/disconnect `31x/32x`, routing `40x`, ui
`50x`, downgrade `60x`. 22 task atomici, id stabili, mai riusati.

## Decision ledger (DOM-D)

- **DOM-D1 — Solo connessione, non vendita.** Dominio già dell'utente; non registrar. Fuori scope:
  MX/email, redirect, DNS hosting. **bloccata**.
- **DOM-D2 — Provider = Vercel Domains API, dietro porta.** Scelto su analisi costi vs Cloudflare for
  SaaS: Vercel $0 marginale (già su Vercel Pro, SSL incluso), Cloudflare $0.10/host/mese oltre 100. La
  porta isola la scelta (futuro adattatore Cloudflare senza toccare dominio/routing). **bloccata**.
- **DOM-D3 — Apex + sottodominio.** Entrambi: apex (A/ALIAS) e subdomain (CNAME). Istruzioni DNS pure
  dal tipo. **bloccata**.
- **DOM-D4 — Verifica di proprietà obbligatoria prima dell'attivazione.** ad `active` solo dopo la
  conferma DNS del provider (anti domain-hijack, A01:2025). **bloccata**.
- **DOM-D5 — Entitlement mai fidato dal client.** Gate `custom_domain` (Pro) dal server
  (`getAccountEntitlement`); RLS gestione owner-only; nessuna scrittura anon. **bloccata**.
- **DOM-D6 — Lettura di routing pubblica e minima.** anon su policy solo-`active`, solo
  `hostname`+`public_slug` (GRANT column-level); non attivo/inesistente indistinguibile (P1-D21).
  **bloccata**.
- **DOM-D7 — Reserved domains.** `ulaba.net`/*, `*.vercel.app`, `localhost`, non-FQDN non collegabili
  (enforcement nel dominio puro, DOM-112). **bloccata**.
- **DOM-D8 — Retrocessione morbida, nessun dato perso.** Pro→Free: `active`→`suspended` reversibile,
  mai delete/rimozione distruttiva; `applyDomainDowngrade` puro; applicazione idempotente nel webhook
  (gemella BIL-D6). **bloccata**.
- **DOM-D9 — Provider inerte senza env.** Adattatore lazy su config iniettabile; senza
  `VERCEL_TOKEN`/`VERCEL_PROJECT_ID` il collegamento reale è no-op dichiarato (come le CTA Stripe);
  checkpoint verde col fake. **bloccata**.
- **DOM-D10 — Altitudine riusata dal globale.** Nessun blocco `architecture:`: vale
  `tests/architecture-contract.test.ts` (dominio puro; `ui→domain` lecito; `service_role` fuori dal
  percorso utente). Coerente con BIL-D8/OGW-D6. **bloccata**.
- **DOM-D11 — Auto-www.** Collegare un **apex** collega automaticamente anche il companion `www`
  (stesso flusso/validazione/guardie); un **subdomain** non genera companion. Parte pura in
  `domain-companion` (DOM-121), applicazione in `domain-connect` (DOM-303). Nessun redirect HTTP
  www→apex in Fase 2: entrambi servono lo stesso sito via routing. **bloccata** (decisione utente
  2026-08-27). **[nuova]**

## Manifest ecosistema

- **Ecosistema attivo:** `supabase-jsts` (Next.js 16 App Router + TypeScript + Supabase Cloud EU).
- **Superficie prevista:** `src/domain/domains/` (dominio puro: hostname, companion, dns-instructions,
  domain-port, domain-downgrade) + `src/data/site-domains.ts` (reader/writer) + `src/data/public-domain.ts`
  (lettura pubblica host→slug) + `src/data/domain/vercel.ts` (adattatore) + `src/data/domain-downgrade.ts`
  (applicazione) + `src/app/api/domains/**` (connect/verify/disconnect) + `src/ui/domains/**` (UI) +
  `src/middleware.ts` (host-routing) + aggancio in `src/app/api/billing/webhook/route.ts` + **1
  migrazione** (`site_domains`). Serving `/s/<slug>`, brief, generazione e motore v2 invariati.
- **Baseline sicurezza attesa:** nuova tabella `site_domains` (RLS gestione owner-only + una SELECT
  anon-active column-level) → `rls_check`; verifica DNS prima dell'attivazione; endpoint dietro guardie
  condivise; segreti Vercel via env, mai nel sorgente.
- **Deploy-coupling `coupled`:** merge su `main` human-gated; verifica locale (vitest, e2e Chromium,
  `next build`) prima del merge. **Config di deploy (prereq go-live, non blueprint):** env Vercel
  `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (se team), `NEXT_PUBLIC_APEX_DOMAIN`/target dei
  record; wildcard `*.ulaba.net` già gestito da Vercel.

## Invarianti (project-start)

Solo connessione mai vendita; entitlement `custom_domain` mosso solo dal server (client legge, non
decide); verifica DNS **prima** dell'attivazione; RLS con `account_id`/`owner` esplicito (no
`USING (true)`); lettura di routing pubblica ai soli attivi + colonne minime; nessun `service_role`
nel percorso utente/edge; provider dietro porta + inerte senza env; host-routing che non tocca
locali/`/s/*` e degrada sicuro su host sconosciuto; reserved-domains non collegabili; auto-www
sull'apex; retrocessione morbida senza perdita dati; host mai in `href`/`innerHTML` non sanificato;
`ui→domain` lecito; git a strati + deploy-coupling coupled; oracle-as-judge + gate umano.

## Fonti di verità

- **Piano**: questo blueprint (`00-INDEX` + moduli `01`–`12`).
- **Stato vivo**: `docs/blueprint/p5-custom-domains-fase2/SESSION-STATE.md`.
- **Fase precedente**: `docs/blueprint/p5-billing-fase1/` (entitlement `custom_domain`,
  `applySoftDowngrade`, BIL-D7).

## Self-check del blueprint

- **Strutturale**: `validate_blueprint.mjs` su questa dir — **verde 5/5** (22 task, `ok:true`).
- **Semantico**: `self-check-checklist.md` punti 6–10 su ogni task; rilievi → human-in-the-loop.

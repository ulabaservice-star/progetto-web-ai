# P5 — Billing & Piani (freemium a tier) — design

> Design doc (brainstorming → spec) per la **monetizzazione** di Ulaba/Belora.
> Prosa in italiano, identificatori/nomi-file in inglese. Ecosistema: `supabase-jsts`
> (Next.js 16 App Router + TypeScript + Supabase). Segue il completamento di
> `onboarding-guided-wizard` (DAG chiuso, 2026-08-25). **Consegna in due fasi: P5 Fase 1
> (nucleo billing, "incassa") e P5 Fase 2 (domini custom).** Prossimo passo dopo
> l'approvazione: **bootstrap del blueprint con `trueline`** (sessione dedicata, contesto
> fresco) → build.
>
> Nota terminologica: in questo doc **"P5 Fase 1 / P5 Fase 2"** indica lo *split di consegna*
> del lavoro di P5 (due blueprint sequenziali). **"MVP di P5"** = P5 Fase 1 + Fase 2 insieme
> (il primo prodotto monetizzabile completo). Ciò che è **fuori da P5** (LATAM, tier agenzie,
> vendita domini…) è chiamato **"Oltre P5"**, mai "fase 2", per evitare ambiguità.

## 1. Contesto e problema

Ulaba genera siti per **micro-business locali** (ristorazione, fitness, saloni/studi,
negozi artigiani, altro) in IT/ES/LATAM, con una visione "**Wix migliore**". I piani
tecnici P0–P4 sono completi; qualità di generazione (`design-engine-v2`, "meglio di Wix")
e flusso d'ingresso (`onboarding-guided-wizard`, wizard guidato) sono risolti. Manca
l'ultimo anello per essere un prodotto: **incassare**.

Oggi **non c'è monetizzazione**: nessun concetto di piano a pagamento, nessun gate di
valore, nessuna superficie di pagamento. L'unica "spesa governata" esistente
(`onboarding_ai_usage`) è un **cap anti-abuso** dell'AI, non un billing legato a denaro.
P5 introduce il modello di ricavo.

## 2. Decisione di fondo

**Freemium a tier-bundle.** Si gate-a il **valore commerciale** (apparire professionale,
essere trovati, scalare), **mai** la qualità del sito generato — che è il gancio che porta
l'utente a costruire. Le "funzioni pro" stanno **dentro un tier** (Pro), **non** come add-on
à la carte sommati uno a uno.

Perché tier-bundle e non altri modelli (motivazioni dalla ricerca di mercato, §14):
- Il modello **dominante e vincente** nei website builder (Wix, Squarespace, Hostinger,
  Framer, Durable) è l'abbonamento con **gate alla pubblicazione**; il momento-valore
  pagato è sempre *"il mio sito è online e mio"*.
- I **crediti a consumo** sono un anti-pattern per micro-business non-tech (attrito
  psicologico, scoraggiano proprio la sperimentazione AI) e risolverebbero un problema di
  costo che **non abbiamo** (~1¢/batch mockup); il cap anti-abuso esistente basta.
- Gli **add-on à la carte** per feature software a costo marginale ~zero (SEO/GEO/GDPR)
  frammentano l'offerta e creano **decision paralysis** proprio nel pubblico meno adatto:
  la regola di mercato mette quelle feature (domanda 50–80%) **in un tier**, non a voce
  singola.

## 3. Principi invarianti (non negoziabili)

- **Non castrare la qualità.** Il design v2 "meglio di Wix" (varietà, temi premium) è
  **in Free**. È il gancio, non merce da gate.
- **GDPR di base è sempre incluso.** Cookie banner conforme + privacy policy sono **obbligo
  di legge** in IT/ES: baseline gratuita per tutti. Solo il GDPR *avanzato* è tier alto.
- **Entitlement mai fidato dal client.** Lo stato del piano lo muove **solo** il webhook
  del payment provider (server, firma verificata). Il client non scrive mai l'entitlement.
  Stesso principio anti-self-reset di `onboarding_ai_usage` (append-only / server-only).
- **Sicurezza delle rotte ereditata.** RLS con `account_id` **esplicito** nel testo di ogni
  policy (auditabile dall'oracolo RLS, lezione tenancy); nessun `service_role` nel percorso
  utente; guardie condivise (`_shared/request-guard`, `route-guards`) sugli endpoint nuovi.
- **Provider esterni dietro una porta.** Pagamento e dominio sono astratti dietro
  interfacce (`PaymentProvider`, `DomainProvider`): il resto del sistema non conosce Stripe
  né Vercel/Cloudflare. Sostituibili senza toccare il gating.

## 4. I piani

| Feature | **Free** (gancio) | **Pro** (serio + trovato) | **Business** (Oltre P5, agenzie) |
|---|---|---|---|
| Generazione AI + design v2 "meglio di Wix" | ✅ pieno | ✅ | ✅ |
| Onboarding wizard + AI on-demand | ✅ cap mensile (esistente) | ✅ cap ampio | ✅ |
| Editor | ✅ completo | ✅ | ✅ |
| Pubblicazione live | ✅ `nomecliente.ulaba.net` **+ badge "Fatto con Ulaba"** | ✅ **dominio custom + niente badge** | ✅ |
| N° siti / account | **1** | **5** | multi / illimitati |
| SEO | base (meta, title, sitemap) | **avanzato** (schema, OG, redirect, per-pagina) | avanzato |
| GEO / visibilità AI | **✅ (gancio)** | ✅ (+ eventuale monitoraggio) | ✅ |
| Rigenerazioni / foto AI | cap mensile (anti-abuso) | quota ampia | quota massima |
| Storage foto caricate | quota bassa | quota alta | massima |
| GDPR | base conforme (obbligo) | base | avanzato (richieste dati, consent granulare, DPA) |
| Analytics | — | base | avanzato |
| Team / collaboratori | — | — | ✅ multi-membro |
| Supporto | community | email | prioritario |

Decisioni di taratura già prese al brainstorming:
- **GEO in Free** (l'amo di moda 2026: "il tuo sito appare sui motori AI"). Pro resta forte
  lo stesso: dominio + no-badge + SEO avanzato + 5 siti + AI ampia.
- **Free pubblica live con badge** (freemium virale): ogni sito gratuito è una vetrina del
  prodotto e converte quando il business vuole "sembrare serio".
- **Free = 1 sito, Pro = 5 siti.** Il tier **Business** (multi-sito, team, white-label) è
  **Oltre P5**, pensato per **agenzie** che gestiscono più clienti; si definisce dopo.

## 5. Architettura entitlement (cuore tecnico)

L'abbonamento vive sull'**`account`** (non sul sito): il n° di siti è una feature del piano,
e `accounts` è già l'entità di tenancy.

- **Tabella `subscriptions`** (account-scoped): `account_id`, `plan` (`free`|`pro`|`business`),
  `status` (`active`|`trialing`|`past_due`|`canceled`), `provider` (`stripe`|…),
  `provider_subscription_id`, `provider_customer_id`, `current_period_end`, timestamps.
  RLS owner-only in SELECT; **INSERT/UPDATE solo server-side** (nessuna policy di scrittura
  per il client — l'entitlement si muove per webhook). GRANT column-consapevoli come le
  altre tabelle P0–P4.
- **Limiti per piano in codice, non nel DB**: `PLAN_LIMITS = { free: {...}, pro: {...} }`
  (n° siti, cap AI, storage, flag SEO-avanzato/no-badge/dominio-custom). **Puri e
  versionati/testabili**; cambiarli è un deploy, non una migrazione.
- **`resolveEntitlement(subscription, now) → { plan, limits }`**: funzione **pura** (niente
  `Date.now` interno; `now` iniettato). L'assenza di subscription attiva ⇒ `free`. Un
  `status` non attivo/scaduto ⇒ `free` (con la coda di grazia gestita in §8).
- **Punti di gate (tutti server-side sull'entitlement dal DB):**
  1. **Pubblicazione** (server action publish, T-403): free ⇒ forza sottodominio + badge;
     pro ⇒ ammette dominio custom + niente badge.
  2. **Creazione sito** oltre il limite del piano (free=1, pro=5).
  3. **Campi SEO avanzati** nel generatore/renderer (inclusi solo se il piano li concede).
  4. **Cap AI parametrico sul piano** — riusa la macchina di `onboarding_ai_usage`, con la
     soglia derivata da `PLAN_LIMITS` anziché costante.

## 6. Pagamenti — Stripe dietro `PaymentProvider`

- **Provider MVP: Stripe Billing** (abbonamenti ricorrenti; carte + SEPA per IT/ES; copre
  anche BR/MX). Astrarre dietro la porta **`PaymentProvider`**:
  `createCheckout(accountId, plan) → url`, `openBillingPortal(accountId) → url`,
  `parseWebhook(payload, signature) → SubscriptionEvent`.
- **Webhook = sorgente di verità dello stato.** Endpoint dedicato con **firma verificata**
  (Stripe signing secret) e **idempotente** (Stripe ri-invia): su
  `checkout.session.completed`, `customer.subscription.updated|deleted`,
  `invoice.payment_failed` aggiorna la riga `subscriptions`. Catch che **logga** (mai un
  errore opaco), risposta 2xx solo ad avvenuta registrazione.
- **Checkout & gestione**: il client apre un Checkout Stripe (redirect) e il **Billing
  Portal** Stripe per cambiare carta / disdire — così l'MVP **non** custodisce dati di
  pagamento né costruisce UI di gestione carta.
- **Oltre P5**: **Mercado Pago / Pix Automático / EBANX** entrano come **nuovo adattatore**
  della stessa porta, **gating invariato** (la ricerca §14 conferma che nessun provider
  copre bene sia EU sia tutta LATAM: la porta è una necessità strutturale, non speculazione).

## 7. Domini custom — `site_domains` dietro `DomainProvider` (P5 Fase 2)

Solo **connessione** di un dominio che il cliente **già possiede** (non vendita/registrazione).

- **Tabella `site_domains`**: `hostname` (unique globale), `site_id`, `account_id`,
  `verification_status`, `ssl_status`, timestamps. RLS come `site_publications`
  (membri in CRUD sulle proprie righe con `account_id` esplicito; il serving pubblico legge
  la mappa host→sito lato server). FK composita `(account_id, site_id)` → `sites` (difesa
  cross-tenant oltre la RLS, come già in `site_publications`).
- **Porta `DomainProvider`**: `addHostname(hostname) → {dnsRecords}`,
  `checkStatus(hostname) → {verified, sslActive}`, `removeHostname(hostname)`. Provider
  concreto **deciso al build**: **Vercel Domains API** di default (app già su Vercel, zero
  costo per-dominio, SSL auto-rinnovato) oppure **Cloudflare for SaaS / Custom Hostnames**
  (100 hostname inclusi anche su piano Free Cloudflare, poi $0.10/host/mese; Delegated DCV =
  rinnovi eterni). Non bloccante per il design: è config dietro la porta.
- **Host-based routing nel middleware**: richiesta su `pizzeria-rossi.it` → risolve
  l'hostname contro `site_domains` (host **validato**, mai serving di host arbitrari) →
  serve il documento pubblicato (stesso `SiteView` / snapshot di `site_publications`). Va
  composto con l'attuale routing per-locale e con l'esclusione `/s/*` (P4-D4).
- **Nota operativa**: i domini dei clienti sono **pubblici** → non passano da Cloudflare
  Access (che protegge oggi lo staging).
- **Gate**: collegare un dominio custom richiede entitlement **Pro** (dipende da §5).

## 8. Lifecycle & downgrade morbido con grazia

Quando un Pro decade (carta rifiutata → `past_due`, o cancellazione → `canceled`):
1. **Grazia**: retry automatici Stripe + email di sollecito, periodo di grazia (proposto
   **7–14 giorni**); durante la grazia l'entitlement resta **Pro** (`past_due` è ancora
   servito come Pro fino a fine grazia).
2. **Retrocessione a Free** (fine grazia / `canceled`), **morbida**:
   - il badge "Fatto con Ulaba" **torna**;
   - il **dominio custom si scollega** → il sito torna sul sottodominio `ulaba.net`;
   - i **siti eccedenti** (oltre il limite Free) diventano **non-pubblicati ma MAI
     cancellati** (read-only/offline, riattivabili);
   - **nessun dato perso**: riattivi pagando e tutto torna.
3. Il sito **non viene mai spento di colpo** senza grazia: rovinerebbe il business del
   cliente e la reputazione della piattaforma.

La logica di transizione è **pura** e testabile: `applyDowngrade(entitlement, sites, now)`
decide cosa retrocede, senza effetti collaterali nascosti.

## 9. Sicurezza (coerente col progetto security-first)

- **Entitlement**: nessuna policy di scrittura client su `subscriptions`; solo il webhook
  server-verificato la muove. Il client **legge** il proprio piano, non lo decide.
- **RLS** su `subscriptions` e `site_domains` con `account_id` **esplicito** nel testo
  (auditabile staticamente dall'oracolo RLS); GRANT precisi, mai `USING (true)`; nessun
  `service_role` nel percorso utente.
- **Webhook**: firma verificata + idempotenza (dedup per event id) → nessun replay né
  spoof dell'attivazione Pro.
- **Host-routing**: serve **solo** hostname presenti e verificati in `site_domains`; nessun
  serving di host arbitrario, nessun `src/href` da input libero (eredita P2-D12).
- **Gate server-side**: ogni enforcement (siti, badge, SEO, cap AI, dominio) legge
  l'entitlement dal DB **server-side**; il client non è mai la fonte di verità del permesso.

## 10. Consegna in due fasi + decomposizione (input al bootstrap trueline)

Il design è completo ma corposo → si consegna in **due blueprint sequenziali**.

### P5 Fase 1 — nucleo billing ("incassa")
Alla fine della Fase 1 **si incassa già**: Pro sblocca niente-badge + SEO avanzato + 5 siti
+ AI ampia (GEO è già in Free). Macrotask (DAG):
- `entitlement-core` — `subscriptions` + RLS + `PLAN_LIMITS` + `resolveEntitlement` puro. **Base.**
- `stripe-checkout-webhook` — porta `PaymentProvider` + Checkout + webhook firmato/idempotente. *(dip: entitlement-core)*
- `plan-gates` — enforcement: limite siti, badge/no-badge, SEO avanzato, cap AI parametrico. *(dip: entitlement-core)*
- `billing-ui` — pagina "Passa a Pro", stato abbonamento, link al Billing Portal Stripe. *(dip: entitlement-core, stripe-checkout-webhook)*
- `downgrade-lifecycle` — grazia + retrocessione morbida (`applyDowngrade` puro). *(dip: entitlement-core, stripe-checkout-webhook)*

### P5 Fase 2 — domini custom
Aggiunge il valore di punta di Pro; tecnicamente il pezzo più complesso, semi-indipendente.
- `custom-domains` — `site_domains` + porta `DomainProvider` + host-routing nel middleware +
  verifica DNS/SSL + gate Pro. *(dip: entitlement-core)*

**DAG complessivo:** `entitlement-core → { stripe-checkout-webhook, plan-gates } →
{ billing-ui, downgrade-lifecycle }`; `custom-domains` dipende solo da `entitlement-core`
(consegnato in Fase 2). ~6 macrotask totali.

## 11. Non-goals / evoluzioni Oltre P5

- **Vendita/registrazione domini** (diventare reseller: rinnovi, WHOIS/ICANN, fatturazione
  dominio separata). Nell'MVP: solo *connessione*.
- **Provider di pagamento LATAM** (Mercado Pago, Pix Automático, EBANX/dLocal): nuovo
  adattatore di `PaymentProvider`, quando arrivano clienti LATAM fuori BR/MX.
- **Tier Business / agenzie** (multi-sito illimitato, team, white-label, GDPR avanzato,
  analytics avanzato).
- **Crediti a consumo** — esclusi per scelta (anti-pattern per il pubblico; costo AI già
  trascurabile).
- **Polish estetico UI** — in coda a tutto il piano, sessione dedicata.

## 12. Prerequisiti go-live (runbook, non lavoro di P5)

- **Vercel Pro** (~$20/mese): Hobby è vietato per uso commerciale dai ToS; la Domains API
  multi-tenant è comunque feature Pro.
- **Supabase Pro** (~$25/mese): il Free mette in pausa il progetto per inattività — inaccettabile
  per il sito pubblico di un cliente pagante.
- Account **Stripe** attivo; **signing secret** del webhook e chiavi in env (mai in chiaro).
- Costo fisso piattaforma ~$45/mese: coperto da **3–4 clienti Pro**. Stripe non aggiunge
  canone (solo fee per transazione).
- Nota: si **progetta e costruisce** tutto P5 sul free tier (locale/staging); l'upgrade
  serve solo al **go-live commerciale reale**.

## 13. Parametri aperti (da tarare in review — non bloccano l'architettura)

- **Prezzo Pro**: proposta di partenza **9–15 €/mese** (o annuale scontato) per micro-business
  IT/ES; da tarare sul mercato (eventuale ricerca prezzi concorrenti IT/ES/LATAM).
- **Trial**: lo schema supporta `trialing`. Proposta: **niente trial al lancio** (o 14gg) —
  decisione go-to-market, non architetturale.
- **Numeri esatti dei cap** (AI, storage) di Free/Pro: da fissare in `PLAN_LIMITS` al build.
- **Provider dominio concreto** (Vercel vs Cloudflare for SaaS): scelto al build di Fase 2.

## 14. Alternative considerate e scartate (con evidenza di mercato)

- **Crediti a consumo** — scartato: attrito per pubblico non-tech; risolve un costo che non
  abbiamo (~1¢/batch); i crediti nel mercato esistono solo come add-on AI, mai come modello
  centrale di un builder.
- **Add-on à la carte** (+5€ per SEO, +5€ per GEO, …) — scartato: SEO/GEO/GDPR hanno domanda
  50–80% ⇒ la regola di mercato li mette **in un tier**; l'à la carte crea decision paralysis
  (ogni tier oltre il 3° ≈ −4,3% conversione; consolidare i piani aumenta la conversione) nel
  pubblico meno adatto. Gli add-on veri restano per cose a **costo marginale reale** (dominio,
  email, foto AI extra), Oltre P5.
- **Vendita domini nell'MVP** — scartato: il micro-business un dominio ce l'ha già o lo compra
  a ~10€ dove vuole; il valore è *connetterlo con SSL senza smanettare*. Reseller = business nel
  business (rinnovi, ICANN).
- **Provider LATAM subito** — scartato per l'MVP: i primi clienti sono con ogni probabilità
  IT/ES; la porta `PaymentProvider` rende l'aggiunta indolore quando servirà.
- **Gate duro (Free = solo anteprima privata)** — scartato: rinuncia al marketing virale del
  sito gratuito con badge, che è una leva di acquisizione forte per questo segmento.

### Riferimenti di ricerca (2026)
- Stripe — *How to Accept Payments in Latin America*; LATAM payment gateways guide (dev.to).
- EBANX — *Pix Automático* / *Recurring Payments for SaaS* (whitepaper).
- Dodo Payments / buildmvpfast — *SaaS add-ons pricing: when to bundle vs charge separately*.
- glencoyne — *SaaS pricing tiers psychology* (decision paralysis, −4,3%/tier).
- Cloudflare for Platforms docs — *Custom hostnames* / *Getting started*; domainee.dev pricing.
- Vercel docs — *Multi-tenant Platforms: configuring custom domains* / *limits*.
- websitebuilderexpert / Fuzen — Wix vs Squarespace 2026 (SEO/GEO nei piani).

## 15. Prossimo passo

Design **approvato** dall'utente (2026-08-25). **Bootstrap del blueprint con `trueline`** in
una **sessione dedicata a contesto fresco** (scelta utente), a partire da questo doc: genererà
`docs/blueprint/P5-billing/` (VISION-AND-CONSTRAINTS + 00-INDEX + moduli per i macrotask di
§10 + SESSION-STATE), un macrotask alla volta, con checkpoint oracolari (security/RLS/secret/
dead-code) e **gate visivo umano** per i macrotask con UI (`billing-ui`, gli stati di gate).

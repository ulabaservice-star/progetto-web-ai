# VISION & CONSTRAINTS — p5-custom-domains-fase2

> Visione e vincoli del blueprint trueline della **Fase 2 di P5 — domini custom** di Ulaba/Belora
> (`supabase-jsts`). Prosa in italiano, identificatori/nomi-file in inglese. Cattura il *perché*, il
> *per chi*, i *non-goals* e i *vincoli*. È il seguito di `p5-billing-fase1` (nucleo billing), che ha
> chiuso il DAG lasciando `custom_domain` come entitlement Pro **già definito** e lo scollegamento del
> dominio in downgrade **rimandato qui** (BIL-D7).

| | |
|---|---|
| **Progetto** | Ulaba/Belora — P5 Fase 2 (domini custom) |
| **Ecosistema** | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| **Owner / stakeholder** | claudiosnivel (solo dev) |

---

## 1. Perché esiste (problema)

Un micro-business locale che passa a **Pro** vuole "sembrare serio ed essere trovato": il primo segno
di serietà è il **proprio dominio** (`iltuobar.it`) al posto di `ulaba.net/s/il-tuo-bar`. La Fase 1 ha
già venduto il collegamento del dominio come feature Pro (`PLAN_LIMITS.pro.custom_domain = true`) ma
**non lo realizza**: oggi il collegamento non esiste. La Fase 2 lo costruisce — **solo connessione**,
non vendita: l'utente porta un dominio che possiede già (comprato da un registrar qualsiasi) e noi lo
colleghiamo al suo sito pubblicato, con HTTPS automatico.

## 2. Per chi (utenti)

Gli abbonati **Pro** di Ulaba (micro-business locali IT/ES/LATAM) con almeno un sito pubblicato e un
dominio già in loro possesso. Non è per chi vuole *comprare* un dominio da noi (non siamo un registrar)
né per il piano Free (che resta su `ulaba.net/s/<slug>` con badge).

## 3. Obiettivo (cosa significa "fatto")

Un utente Pro collega il proprio dominio — **apex** (`iltuobar.it`) **o sottodominio**
(`www.iltuobar.it`, `menu.iltuobar.it`) — a un suo sito pubblicato; dopo aver impostato i record DNS
indicati e superato la verifica, visitare quel dominio serve il sito in **HTTPS** con certificato
valido. Collegando un **apex** si collega automaticamente anche il companion `www` (**auto-www**,
DOM-D11), così `iltuobar.it` e `www.iltuobar.it` puntano entrambi al sito. In downgrade Pro→Free il
dominio si **sospende in modo reversibile** (mai cancellato), riattivabile ripagando. Tutto dietro la
porta `DomainProvider` (adattatore **Vercel Domains API**; fake nei test).

Il blueprint scompone questo obiettivo in macrotask; i `target_tests` dei task atomici ne diventano
l'oracolo del checkpoint. "Fatto" = oracoli verdi sul confine di ogni macrotask, **non** una
dichiarazione dell'LLM.

## 4. Non-goals (cosa NON facciamo)

- **Vendita/registrazione di domini.** Non siamo un registrar: non compriamo né rivendiamo domini.
  L'utente arriva con un dominio già suo. (DOM-D1)
- **Email/MX, redirect, DNS hosting.** Colleghiamo il dominio al sito (record A/CNAME + verifica);
  non gestiamo la posta né ospitiamo la zona DNS del cliente.
- **Cloudflare for SaaS.** Scelto Vercel Domains ($0 marginale, già su Vercel Pro) contro Cloudflare
  ($0.10/host/mese oltre 100). La porta lascia aperto un futuro adattatore Cloudflare senza riscrivere
  dominio/host-routing, ma **non** è in scope ora. (DOM-D2)
- **Più domini per sito senza limite / wildcard cliente.** Fase 2: **un dominio custom per sito**
  (apex+www trattati come coppia dello stesso collegamento). Wildcard e alias multipli: oltre Fase 2.
- **Cambio del provider di hosting.** Il serving resta su Vercel; l'host-routing fa rewrite verso la
  rotta pubblica esistente `/s/<slug>`, non un secondo runtime di serving.

## 5. Vincoli

| Tipo | Vincolo |
|---|---|
| Ecosistema | supabase-jsts (Next.js 16 App Router + TypeScript + Supabase Cloud EU) |
| Sicurezza | RLS per-tenant su `site_domains` (owner-only gestione); **lettura pubblica host→slug solo per domini ATTIVI+verificati**; verifica di proprietà DNS obbligatoria prima dell'attivazione (anti domain-hijack); `VERCEL_TOKEN`/`VERCEL_PROJECT_ID` via env, mai nel sorgente; nessun `service_role` nel percorso utente; host normalizzato mai iniettato in `href`/`innerHTML` |
| Entitlement | il collegamento è gated su `custom_domain` (Pro) letto **dal server** via `getAccountEntitlement` (Fase 1); il client non decide il permesso |
| Provider | dietro la porta `DomainProvider` (gemella di `PaymentProvider`); adattatore reale **inerte** finché le env Vercel non sono presenti (come Stripe in Fase 1) — le CTA restano no-op senza chiavi |
| Git | branch a strati; merge su `main` gated dal verde; deploy-coupling **coupled** (push su `main` = deploy su ulaba.net) → verifica locale prima del merge |
| Host-routing | il middleware NON deve toccare il routing per locale né la rotta `/s/*`; un Host sconosciuto degrada in modo sicuro (nessun sito servito per errore) |

## 6. Parity gate (promessa forte)

Conformità alla specifica = i `target_tests` dei task del macrotask passano al checkpoint. Dominio
puro (validazione hostname, classificazione apex/subdomain, istruzioni DNS, downgrade) testato **per
valore** con `now`/input iniettati; la porta provider testata con un **fake iniettato** (nessuna chiave
Vercel reale nel verde).

## 7. Baseline & budget

- **Baseline di sicurezza**: `.trueline/hygiene-baseline.json` + baseline oracolare del checkpoint
  (gitleaks/osv/semgrep/rls) — findings noti e soglie ereditati dalla Fase 1.
- **Budget**: un macrotask alla volta; loop di fix con tetto in `references/oracles/thresholds.md`.

## 8. Fonti di verità

- **Piano**: il blueprint (`00-INDEX` + moduli `01`–`06`).
- **Stato vivo**: `docs/blueprint/p5-custom-domains-fase2/SESSION-STATE.md` (distinta dalle
  SESSION-STATE di P0…P4, design-engine, onboarding-guided-wizard, p5-billing-fase1 e di Trueline).
- **Fase precedente**: `docs/blueprint/p5-billing-fase1/` (entitlement `custom_domain`, BIL-D7).

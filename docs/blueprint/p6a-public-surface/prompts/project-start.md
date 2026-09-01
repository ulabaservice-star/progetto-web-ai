# project-start — p6a-public-surface

> Da incollare UNA volta all'avvio del workstream (prima sessione), per orientare l'agente al blueprint,
> alle decisioni bloccate, al piano di macrotask e alle invarianti dell'intera P6a.

```
Avvio il workstream **p6a-public-surface** (superficie pubblica: split dominio + landing + waitlist +
SEO + blog) di Ulaba/Belora (supabase-jsts). Primo workstream post-P5 (billing Fase 1 + custom-domains
Fase 2, DAG chiusi). Il blueprint è il piano: si costruisce secondo i task, non si ridiscute il design
(le decisioni sono bloccate nel ledger P6A-D1…D13).

1) LEGGI PRIMA di qualunque azione:
   • docs/blueprint/p6a-public-surface/VISION-AND-CONSTRAINTS.md (perché, per chi, non-goals, vincoli, ledger)
   • docs/blueprint/p6a-public-surface/00-INDEX.md (mappa 22 macrotask, DAG, ID, invarianti)
   • docs/blueprint/p6a-public-surface/SESSION-STATE.md (stato vivo)
   • i moduli 01–22 (task atomici con definition_of_done · acceptance_criteria · target_tests)

2) DECISIONI BLOCCATE (ledger P6A-D — non ridiscuterle, sono input umano):
   • D1/D2 architettura B monolite (ulaba.net=landing, app.ulaba.net=app), host-guard nel middleware
   • D3 API a-consumo difese a 3 livelli (auth-guard route + Access + regola Cloudflare), NON nel middleware
   • D4 route group (marketing) + canonical fisso ulaba.net
   • D5 waitlist_leads RLS enabled ZERO-POLICY, scrive solo il server (service_role)
   • D6 /api/waitlist honeypot + Turnstile dietro porta CaptchaVerifier (fake nei test) + idempotenza 23505 + inerte senza env
   • D7 niente double opt-in v1; niente IP in chiaro; consenso GDPR opt-in
   • D8 SEO: robots host-aware, sitemap hreflang IT↔ES, canonical, OG, JSON-LD Organization/WebSite
   • D9 blog file-based, pipeline unified+rehype-sanitize+gray-matter, SSG, JSON-LD Article, hreflang solo fra traduzioni reali
   • D10 IT+ES da subito (ES localizzato per paese)
   • D11 contatore iscritti spento v1; analytics Cloudflare cookieless
   • D12 cutover HUMAN-GATED con ordine obbligato (landing verde → Auth URL → Access rescope → sposta app → curl)
   • D13 fuori scope → P6b: anteprima istantanea, referral, badge, programmatic-SEO; la hero lascia lo SLOT

3) PIANO DI BUILD — 22 macrotask PICCOLI, **UN macrotask per sessione** con **dynamic workflow
   command-free** (ultracode): builder solo Read/Write/Edit in parallelo su file disgiunti, poi UN
   ciclo di oracoli (checkpoint 4/4 + mutazione) in FOREGROUND dall'orchestratore = unico giudice del
   verde. Primi eleggibili {host-classify, marketing-i18n, waitlist-schema, captcha-port, blog-pipeline};
   cutover per ultimo. DAG completo in 00-INDEX §Build order.

4) INVARIANTI (valgono per tutta P6a):
   app invariata sotto app.; separazione per Host nel monolite; waitlist_leads RLS zero-policy solo-server
   (mai il client); /api/waitlist dietro guardie same-origin+byte + honeypot + Turnstile dietro porta
   (inerte senza env); niente IP in chiaro / no double opt-in; host-guard simmetrico che NON tocca /s/*,
   il locale-routing, il ramo host-custom, né la guardia auth; robots host-aware (app disallow, mai
   linkare app.); canonical/hreflang onesti; output testo JSX (mai innerHTML/href interpolato), JSON-LD
   via serializeJsonLdSafe, HTML blog via rehype-sanitize; RLS con testo esplicito (mai USING(true));
   nessun service_role nel percorso utente/edge; segreti via env; ui→domain lecito (contratto globale);
   git a strati + deploy-coupling coupled; cutover human-gated ordinato; oracle-as-judge + gate umano.

Poi passa al session-start per selezionare il primo macrotask eleggibile.
```

# 03-plan-gates — Macrotask `plan-gates`

> Modulo del blueprint `p5-billing-fase1`. L'**enforcement**: quattro gate server-side che leggono
> l'entitlement dal DB (`getAccountEntitlement`, BIL-103) e applicano il piano — limite siti, badge,
> SEO avanzato, cap AI parametrico. Dipende da `entitlement-core`. Ogni gate è server-side: il client
> non è mai la fonte di verità del permesso.

## Obiettivo del macrotask

Rendere reale la differenza Free/Pro nei punti dove il valore commerciale si manifesta, **senza mai
toccare la qualità del sito generato**. Free = 1 sito + badge + SEO base + cap AI base; Pro = 5 siti
+ niente badge + SEO avanzato + cap AI ampio. GEO resta in Free (non è un gate). Ogni enforcement
legge l'entitlement server-side e degrada in modo sicuro (in dubbio ⇒ trattamento Free).

## Task atomici

```yaml
- id: BIL-301
  title: "Gate creazione sito oltre il limite del piano (free=1, pro=5)"
  macrotask: "plan-gates"
  depends_on: [BIL-103]
  objective: >
    Impedire, server-side, la creazione di un sito oltre il numero consentito dal piano dell'account:
    Free ammette 1 sito, Pro 5. Il conteggio dei siti esistenti e il limite dall'entitlement decidono;
    il client non può aggirarlo.
  definition_of_done:
    - "Il punto di creazione sito legge getAccountEntitlement e confronta il conteggio siti dell'account con limits.max_sites"
    - "Alla soglia raggiunta la creazione è rifiutata con un esito esplicito (es. 403/limite), nessuna riga creata"
    - "Sotto soglia la creazione procede invariata"
  acceptance_criteria:
    - id: AC-301-1
      given: "un account Free con 1 sito già esistente"
      when: "tenta di creare un secondo sito"
      then: "la creazione è rifiutata (limite piano) e nessun nuovo sito è scritto"
    - id: AC-301-2
      given: "un account Pro con 1 sito esistente"
      when: "crea un altro sito"
      then: "la creazione procede (sotto il limite di 5)"
    - id: AC-301-3
      given: "un account Pro con 5 siti"
      when: "tenta di creare il sesto"
      then: "la creazione è rifiutata (limite piano)"
  target_tests:
    - file: "tests/plan-gate-site-limit.test.ts"
      covers: [AC-301-1, AC-301-2, AC-301-3]
  security_notes:
    - "A01/BIL-D2 — gate server-side sull'entitlement dal DB; il client non decide il permesso; conteggio siti sotto RLS del proprio account"
  out_of_scope:
    - "La UI del messaggio 'hai raggiunto il limite, passa a Pro' (billing-ui/dashboard) oltre l'esito dell'endpoint"

- id: BIL-302
  title: "Badge 'Made with Belora' condizionale sul piano (free=badge, pro=no-badge)"
  macrotask: "plan-gates"
  depends_on: [BIL-103]
  objective: >
    Rendere il badge del sito pubblicato condizionale sull'entitlement dell'account proprietario del
    sito: Free mostra il badge (T-408 esistente), Pro no. La decisione è server-side nella serving,
    fuori dall'albero del documento (il badge non è mai rimovibile/spoofabile dal documento).
  definition_of_done:
    - "La serving /s/<slug> risolve l'entitlement dell'account del sito e monta BeloraBadge SOLO se il piano non concede no_badge"
    - "Free => badge presente; Pro => badge assente; la decisione è server-side, non dal documento"
    - "In dubbio (entitlement non risolvibile) => badge presente (trattamento Free, fail-safe)"
  acceptance_criteria:
    - id: AC-302-1
      given: "un sito pubblicato il cui account è Free"
      when: "si serve la pagina pubblica /s/<slug>"
      then: "il badge 'Made with Belora' è presente nell'output"
    - id: AC-302-2
      given: "un sito pubblicato il cui account è Pro (no_badge)"
      when: "si serve la pagina pubblica /s/<slug>"
      then: "il badge è assente"
    - id: AC-302-3
      given: "un sito il cui entitlement non è risolvibile"
      when: "si serve la pagina pubblica"
      then: "il badge è presente (fail-safe verso Free), mai assente per errore"
  target_tests:
    - file: "tests/plan-gate-badge.test.ts"
      covers: [AC-302-1, AC-302-2, AC-302-3]
  security_notes:
    - "A01 — l'entitlement è letto server-side dall'account del sito, non da un flag nel documento (il documento è jsonb opaco, non fidato); il badge resta fuori dall'albero del documento (T-408)"
    - "Fail-safe — entitlement non risolvibile => badge presente (Free), mai la rimozione del badge per errore"
  out_of_scope:
    - "Lo scollegamento del dominio custom (Fase 2)"

- id: BIL-303
  title: "Campi SEO avanzati gated sul piano (base per Free, avanzato per Pro)"
  macrotask: "plan-gates"
  depends_on: [BIL-103]
  objective: >
    Includere i campi SEO avanzati (es. JSON-LD esteso / OpenGraph completo / canonical per-pagina)
    nel documento servito SOLO se il piano dell'account li concede (limits.seo_advanced). Il SEO base
    (meta, title, sitemap) resta per tutti. È il flag di entitlement applicato al punto SEO esistente,
    non un nuovo catalogo SEO.
  definition_of_done:
    - "Il punto di generazione/serving dei metadati SEO consulta limits.seo_advanced dell'account del sito"
    - "Free => solo SEO base (meta, title, sitemap già esistenti); Pro => in più i campi avanzati definiti"
    - "Il set esatto dei campi 'avanzati' è un insieme minimo esplicito e chiuso in questo task"
  acceptance_criteria:
    - id: AC-303-1
      given: "un sito il cui account è Free"
      when: "si generano/servono i metadati SEO"
      then: "sono presenti i campi SEO base e ASSENTI i campi avanzati gated"
    - id: AC-303-2
      given: "un sito il cui account è Pro (seo_advanced)"
      when: "si generano/servono i metadati SEO"
      then: "sono presenti i campi SEO base E i campi avanzati gated"
    - id: AC-303-3
      given: "un sito il cui entitlement non è risolvibile"
      when: "si generano/servono i metadati SEO"
      then: "sono presenti solo i campi base (fail-safe verso Free)"
  target_tests:
    - file: "tests/plan-gate-seo-advanced.test.ts"
      covers: [AC-303-1, AC-303-2, AC-303-3]
  security_notes:
    - "A01 — flag di entitlement letto server-side; nessun campo SEO deriva da testo non fidato in href/innerHTML (eredita P2-D12: escaping preservato)"
    - "Fail-safe — in dubbio si serve il set base, non quello avanzato"
  out_of_scope:
    - "L'espansione del catalogo SEO avanzato oltre l'insieme minimo gated (evoluzione successiva)"

- id: BIL-304
  title: "Cap AI parametrico dal piano (soglia da PLAN_LIMITS, riusa onboarding_ai_usage)"
  macrotask: "plan-gates"
  depends_on: [BIL-103]
  objective: >
    Rendere il cap d'uso AI dell'onboarding parametrico sul piano: la soglia di checkAiBudget deriva
    da limits.ai_monthly_cap dell'account anziché da una costante. Riusa la macchina esistente
    (onboarding_ai_usage + checkAiBudget): Pro ottiene un cap ampio, Free il cap base.
  definition_of_done:
    - "La soglia passata a checkAiBudget deriva da getAccountEntitlement (limits.ai_monthly_cap), non da una costante hardcoded"
    - "Free => cap base; Pro => cap ampio; il consume-on-success e il rate-limit restano invariati"
    - "Al cap del piano l'endpoint AI risponde 429 come già oggi"
  acceptance_criteria:
    - id: AC-304-1
      given: "un account Free che ha raggiunto il cap AI base"
      when: "invoca un pulsante AI on-demand"
      then: "riceve 429 (cap del piano free)"
    - id: AC-304-2
      given: "un account Pro con lo stesso numero di usi che satura il cap Free"
      when: "invoca un pulsante AI on-demand"
      then: "la chiamata è ammessa (il cap ampio Pro non è ancora raggiunto)"
    - id: AC-304-3
      given: "un endpoint AI on-demand"
      when: "si ispeziona la soglia usata da checkAiBudget"
      then: "proviene dall'entitlement dell'account, non da una costante di modulo"
  target_tests:
    - file: "tests/plan-gate-ai-cap.test.ts"
      covers: [AC-304-1, AC-304-2, AC-304-3]
  security_notes:
    - "BIL-D3 — soglia dal piano (PLAN_LIMITS), determinismo invariato (now iniettato); il contatore resta append-only owner-only (onboarding_ai_usage)"
    - "R7/A01 — l'entitlement è letto server-side nell'endpoint; il cap non è un canale cross-tenant"
  out_of_scope:
    - "Un ledger crediti a consumo (escluso per scelta, BIL-D1)"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Confine checkpoint**: ogni gate provato ai due lati della soglia (Free vs Pro) + il caso fail-safe
  (entitlement non risolvibile ⇒ trattamento Free). Mutazione: costante al posto dell'entitlement →
  AC-30x-3 rosso; fail-open (in dubbio ⇒ Pro) → AC-302-3/303-3 rossi; limite siti letto dal client →
  AC-301 rosso.

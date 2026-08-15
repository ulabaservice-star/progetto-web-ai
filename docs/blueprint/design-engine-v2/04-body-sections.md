# 04-body-sections — Macrotask `body-sections`

> Modulo del blueprint **design-engine-v2** di Belora/Ulaba. Un modulo = un macrotask
> (checkpoint al confine + gate visivo, commit atomico). Schema trueline (`L-COL-019`). Design a
> monte: `docs/superpowers/specs/2026-08-15-design-engine-v2-design.md` (§5.4). Dipende da `foundation`.

## Obiettivo del macrotask

È il macrotask che **fa sparire i vuoti**: al gate visivo di v1.1 il corpo (chi-siamo/orari/contatti)
era "testo impilato" fra sezioni con spazi morti. Qui si **traducono le varianti di corpo di Claude
Design** (progetto `c1dafc1f`) per **chi-siamo, orari, contatti, recensioni, faq, header/footer**,
ognuna con le proprie varianti nel catalogo + il rispettivo renderer che consuma `section_layout_id`
dal documento e proietta `data-section-layout` sulla radice.

Nota di determinismo: il **giorno-corrente** degli orari (evidenza del giorno di oggi) è un effetto
**client** dell'isola, FUORI dal documento congelato — il documento resta byte-identico a parità di
`vertical`+`seed`. Contatti usa una mappa SVG di catalogo / `PhotoPlaceholder`, mai una risorsa
esterna (niente tile remoti, CSP intatta). Renderer unico; solo token; escaping React; niente
`dangerouslySetInnerHTML`; i campi nuovi passano dal gate `parseDocument`.

**Nota di dimensione (DS-V2, §5.4):** questo è il macrotask più grande; se in BUILD i task risultano
troppi per un ciclo, è ammesso **spezzarlo in due sotto-macrotask** (es. `body-sections-a`
chi-siamo/recensioni/faq, `body-sections-b` orari/contatti/header/footer) mantenendo gli stessi ID.

## Task atomici

```yaml
- id: DV2-401
  title: "section-layouts.ts: varianti di corpo CD per tutte le sezioni (chi-siamo/orari/contatti/recensioni/faq/header/footer)"
  macrotask: "body-sections"
  depends_on: [DV2-101]

  objective: >
    Ampliare src/domain/generation/section-layouts.ts con le varianti di corpo di Claude Design per
    ogni tipo-sezione: chi-siamo, orari, contatti, recensioni, faq, header, footer. Ogni tipo-sezione
    porta >=2 varianti (section_layout_id versionati, nome@N) con la struttura dichiarata. Dominio
    puro; lookup per id esatto/proto-safe; kind di sezione esplicito per ogni layout.

  definition_of_done:
    - "Per OGNI tipo-sezione (chi-siamo, orari, contatti, recensioni, faq, header, footer) esistono >=2 section_layout_id versionati con struttura non vuota"
    - "Ogni layout dichiara il proprio kind di sezione (per il render e per la matrice) e gli slot da popolare"
    - "Catalogo dominio puro (nessun React/DB, nessun colore letterale); lookup per id esatto/proto-safe"

  acceptance_criteria:
    - id: AC-DV2-401-1
      given: "il catalogo section-layouts.ts (parte corpo) di v2"
      when: "si raggruppano i layout per kind di sezione"
      then: "ogni tipo-sezione (chi-siamo, orari, contatti, recensioni, faq, header, footer) ha >=2 varianti con struttura non vuota"
    - id: AC-DV2-401-2
      given: "un section_layout_id di corpo noto"
      when: "lo si risolve col lookup"
      then: "restituisce esattamente quella struttura col suo kind; un id inesistente non risolve a un default silenzioso (proto-safe)"
    - id: AC-DV2-401-3
      given: "due varianti dello stesso kind di sezione"
      when: "si confrontano le strutture"
      then: "differiscono su almeno un asse VISIBILE, non solo per nome"

  target_tests:
    - file: "tests/design-section-layouts-body-v2.test.ts"
      covers: [AC-DV2-401-1, AC-DV2-401-2, AC-DV2-401-3]

  security_notes:
    - "Catalogo dominio puro, statico: mai da input utente, nessuna risorsa esterna; nessun colore letterale"

  out_of_scope:
    - "Il rendering delle sezioni (DV2-402/403/404) e la selezione (variety-select)"

- id: DV2-402
  title: "Blocchi chi-siamo + recensioni + faq (ESISTENTI) ri-stilati alle varianti CD; reviews/faq con scheletro placeholder"
  macrotask: "body-sections"
  depends_on: [DV2-104, DV2-401]

  objective: >
    Ri-stilare i blocchi ESISTENTI src/ui/site/blocks/ChiSiamo.tsx, Recensioni.tsx, Faq.tsx alle
    varianti CD: consumano section_layout_id e rendono la variante attiva con gli slot editabili gia'
    definiti (chi-siamo: titolo/testo/citazioni; recensioni: reviews_title/reviews_intro; faq:
    faq_title/faq_items), radice con data-section-layout. Recensioni e faq OGGI non entrano nei mockup
    (nessun campo del Brief le soddisfa, generatable.ts): per FAR SPARIRE I VUOTI, quando non sono
    alimentate rendono uno SCHELETRO PLACEHOLDER tipografico con copy UI FISSA (es. "Le recensioni dei
    tuoi clienti appariranno qui") — MAI contenuto inventato, MAI uno slot LLM riempito con recensioni
    finte (regola anti-invenzione). La composizione del mockup (blocks/pages) emette i blocchi
    recensioni/faq cosi' che la sezione mostri l'impaginato. Solo token; escaping React; niente
    dangerouslySetInnerHTML.

  definition_of_done:
    - "ChiSiamo/Recensioni/Faq (blocchi ESISTENTI) ri-stilati per consumare section_layout_id; la radice porta data-section-layout col valore congelato (nessun blocco nuovo da registrare)"
    - "Recensioni e faq, quando non alimentate dal Brief, rendono uno scheletro placeholder tipografico con copy UI FISSA (stringa statica del componente, non uno slot LLM) — nessun contenuto inventato"
    - "La composizione del mockup (blocks/pages/generatable) emette i blocchi recensioni/faq per un vertical ristorazione, cosi' che le sezioni non restino vuote"
    - "Solo var(--site-*) (nessun colore letterale); escaping React; nessun dangerouslySetInnerHTML; PhotoPlaceholder di catalogo dove serve (nessuna risorsa esterna)"

  acceptance_criteria:
    - id: AC-DV2-402-1
      given: "un documento con blocchi chi-siamo/recensioni/faq e section_layout_id noti"
      when: "sono resi"
      then: "ogni blocco porta data-section-layout col valore congelato e rende la variante CD prevista con i suoi slot"
    - id: AC-DV2-402-2
      given: "un blocco recensioni/faq NON alimentato dal Brief"
      when: "e' reso"
      then: "mostra uno scheletro placeholder con copy UI FISSA del componente (nessun contenuto inventato, nessuno slot LLM riempito con dati finti)"
    - id: AC-DV2-402-3
      given: "un vertical ristorazione"
      when: "si costruisce il documento mockup (composizione blocks/pages)"
      then: "include i blocchi recensioni e faq (che rendono lo scheletro), cosi' le sezioni non restano vuote"
    - id: AC-DV2-402-4
      given: "un blocco chi-siamo/recensioni/faq il cui testo contiene payload ostile"
      when: "e' reso"
      then: "il testo e' escapato da React (nessun markup iniettato, nessun src/href dal testo); nessun dangerouslySetInnerHTML"

  target_tests:
    - file: "tests/site-body-about-reviews-faq-v2.test.ts"
      covers: [AC-DV2-402-1, AC-DV2-402-2, AC-DV2-402-3, AC-DV2-402-4]

  security_notes:
    - "Lo scheletro placeholder e' una stringa UI STATICA del componente, mai uno slot LLM: la regola anti-invenzione resta intatta (recensioni/faq non fabbricate). Campi esistenti gia' dietro parseDocument; escaping React; niente dangerouslySetInnerHTML (AC-231-4); PhotoPlaceholder di catalogo; nessun colore letterale; renderer unico"

  out_of_scope:
    - "orari/contatti (DV2-403), header/footer (DV2-404); una vera sorgente di recensioni nel Brief (fuori v2)"

- id: DV2-403
  title: "Blocchi orari + contatti: giorno-corrente come effetto client, contatti senza risorsa esterna"
  macrotask: "body-sections"
  depends_on: [DV2-104, DV2-401]

  objective: >
    Implementare i renderer di orari e contatti. Orari: tabella/card a token che consuma
    section_layout_id; l'evidenza del GIORNO CORRENTE e' un effetto CLIENT dell'isola (fuori dal
    documento congelato: il documento resta byte-identico a parita' di seed). Contatti: card con
    indirizzo/telefono/orari + mappa SVG di catalogo o PhotoPlaceholder, MAI tile/risorse remote.
    Radice con data-section-layout. Solo token; escaping React; niente dangerouslySetInnerHTML.

  definition_of_done:
    - "orari e contatti resi dai rispettivi blocchi che consumano section_layout_id; la radice porta data-section-layout col valore congelato"
    - "L'evidenza del giorno corrente in orari e' prodotta lato client dall'isola (il documento congelato NON contiene il giorno-di-oggi; resta deterministico)"
    - "Contatti usa una mappa SVG di catalogo / PhotoPlaceholder e nessuna risorsa esterna (nessun tile remoto, CSP intatta); solo var(--site-*); escaping React; nessun dangerouslySetInnerHTML"

  acceptance_criteria:
    - id: AC-DV2-403-1
      given: "un documento con blocchi orari/contatti e section_layout_id noti"
      when: "sono resi"
      then: "ogni blocco porta data-section-layout col valore congelato e rende la struttura prevista (righe orari; card contatti con indirizzo/telefono)"
    - id: AC-DV2-403-2
      given: "lo stesso vertical+seed reso due volte"
      when: "si confronta il documento congelato (server-render)"
      then: "e' byte-identico: il giorno-corrente non compare nel documento (e' un effetto client dell'isola), il determinismo e' intatto"
    - id: AC-DV2-403-3
      given: "il blocco contatti reso"
      when: "si ispeziona il markup"
      then: "la mappa e' un SVG di catalogo / PhotoPlaceholder e non c'e' alcuna risorsa esterna (nessun url() remoto, nessun <img> a dominio terzo)"

  target_tests:
    - file: "tests/site-body-hours-contact-v2.test.ts"
      covers: [AC-DV2-403-1, AC-DV2-403-2, AC-DV2-403-3]

  security_notes:
    - "Giorno-corrente = effetto client isolato (determinismo del documento intatto); contatti senza risorse esterne (CSP, no tile remoti); escaping React; niente dangerouslySetInnerHTML; nessun colore letterale"

  out_of_scope:
    - "chi-siamo/recensioni/faq (DV2-402), header/footer (DV2-404)"

- id: DV2-404
  title: "Header + footer: renderer a token, slot editabili, data-section-layout, escaping"
  macrotask: "body-sections"
  depends_on: [DV2-104, DV2-401]

  objective: >
    Implementare i renderer di header e footer che consumano section_layout_id e rendono la variante CD
    attiva con slot editabili (nome locale/nav/CTA in header; contatti/orari sintetici/credito in
    footer). Radice con data-section-layout. Solo token; escaping React; niente dangerouslySetInnerHTML;
    nessun src/href da testo libero; badge/credito coerente con la policy P4 (gating badge = P4-D5, non
    v2: header/footer non introducono nuovi vincoli di pubblicazione).

  definition_of_done:
    - "header e footer resi dai rispettivi blocchi che consumano section_layout_id; la radice porta data-section-layout col valore congelato"
    - "Gli slot editabili (nome locale/nav/CTA; contatti/credito) sono resi via React; nessun src/href nasce dal testo libero"
    - "Solo var(--site-*) (nessun colore letterale); escaping React; nessun dangerouslySetInnerHTML"

  acceptance_criteria:
    - id: AC-DV2-404-1
      given: "un documento con header/footer e section_layout_id noti"
      when: "sono resi"
      then: "ogni blocco porta data-section-layout col valore congelato e rende gli slot previsti (nome/nav/CTA; contatti/credito)"
    - id: AC-DV2-404-2
      given: "header/footer resi"
      when: "si ispeziona il markup"
      then: "usa solo var(--site-*) (nessun colore letterale) e nessun dangerouslySetInnerHTML"
    - id: AC-DV2-404-3
      given: "un header/footer il cui testo di slot contiene payload ostile"
      when: "e' reso"
      then: "il testo e' escapato da React e nessun src/href nasce dal testo libero"

  target_tests:
    - file: "tests/site-header-footer-v2.test.ts"
      covers: [AC-DV2-404-1, AC-DV2-404-2, AC-DV2-404-3]

  security_notes:
    - "Escaping React; niente dangerouslySetInnerHTML (AC-231-4); nessun src/href da testo libero (P2-D1); nessun colore letterale; renderer unico; nessuna modifica ai vincoli di pubblicazione P4"

  out_of_scope:
    - "chi-siamo/recensioni/faq (DV2-402), orari/contatti (DV2-403); il gating del badge (P4-D5)"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task.
- **Gate visivo** (DS-V2-D6, non oracolabile): screenshot su `/s/` di un mockup completo (spariti i
  vuoti); l'utente giudica il "wow" del corpo. Se non convince, ci si ferma.

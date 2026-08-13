# 02-variety-engine — Macrotask `variety-engine`

> Modulo del blueprint **design-engine-v1.1** di Belora/Ulaba. Un modulo = un macrotask
> (checkpoint al confine, commit atomico). Schema trueline (`L-COL-019`). Design a monte:
> `docs/superpowers/specs/2026-08-13-design-engine-v1.1-design.md` (DS-D10, DS-D14).

## Obiettivo del macrotask

Il **motore di varietà** (§7 della spec): i ~7 assi ricchi e VISIBILI distribuiti su tutta la
pagina, la matrice che li ammette, il selettore che li combina, il documento che li congela. È
la risposta al difetto n.1 di v1 ("3/5 stesso hero, corpo mai variato"): qui si arricchiscono i
cataloghi `hero-layouts` (layout 2-col asimmetrico + asse trattamento-H1) e `section-layouts`
(chi-siamo/orari/contatti/menu come LAYOUT veri — griglie/tabelle/card — + nastri divisori); si
aggiorna la `design-matrix` perché garantisca **≥5 scheletri VISIBILMENTE distinti per ogni
vertical** (hero visibile + ≥1 asse del corpo diversi); si rende `selectDesign` **pluggabile**
(firma con `signals?` opzionale che predispone il Piano B **senza implementarlo**, DS-D14) con
la **distinzione rafforzata** rispetto a v1; e si **congelano** i nuovi assi nel documento (id
versionati opzionali con default). Zero-LLM a runtime: l'input della selezione è `vertical`
(enum) + `seed` (+ segnali derivati, sempre ri-validati), mai testo libero del brief.

Ripartizione di altitudine (§1bis): cataloghi + matrice + selettore + schema = **dominio puro**
(`src/domain/generation`). Nessun accesso dati nuovo, nessuna nuova tabella/RLS. La resa dei
nuovi assi (blocchi ricchi + CSS) è `hero-menu-wow` / `section-inventory`.

## Task atomici

```yaml
- id: DE11-201
  title: "hero-layouts ricchi (2-col asimmetrico) + asse trattamento-H1 (accent-wavy | kicker-italic)"
  macrotask: "variety-engine"
  depends_on: [DE11-101, DE11-104]

  objective: >
    Arricchire src/domain/generation/hero-layouts.ts con un layout 2-col asimmetrico
    (testo/illustrazione + slot badge + CTA + meta/chip), id versionati nome@N, lookup
    heroLayoutFor esatto su array (proto-safe). Introdurre il nuovo asse "trattamento H1" come
    catalogo puro con >=2 valori distinti (accent con sottolineatura wavy | kicker-tracked +
    main italic gigante), id versionati, lookup esatto. Ogni voce marca idoneità universale vs
    overlay ristorazione.

  definition_of_done:
    - "hero-layouts.ts espone almeno un layout 2-col asimmetrico ricco (slot: testo, illustrazione, badge, CTA, meta/chip) oltre ai layout esistenti, id versionati nome@N, heroLayoutFor esatto su array"
    - "Nuovo catalogo puro dell'asse trattamento-H1 con >=2 valori distinti (accent-wavy, kicker-tracked-italic), id versionati, lookup esatto su array (proto-safe)"
    - "Ogni voce marca l'idoneità universale vs overlay-di-settore (campo che il fallback userà)"

  acceptance_criteria:
    - id: AC-DE11-201-1
      given: "il catalogo hero-layouts con >=2 voci di cui un id è PREFISSO di un altro (fixture)"
      when: "heroLayoutFor per id esatto"
      then: "trova solo l'esatto e MAI il prefisso"
    - id: AC-DE11-201-2
      given: "il catalogo dell'asse trattamento-H1"
      when: "si elencano i valori"
      then: ">=2 trattamenti distinti (accent-wavy, kicker-tracked-italic), tutti con id versionati nome@N"
    - id: AC-DE11-201-3
      given: "ogni voce di hero-layouts e del trattamento-H1"
      when: "si verificano gli id"
      then: "tutti nella forma nome@N (versionati)"
    - id: AC-DE11-201-4
      given: "un lookup (hero-layout o trattamento-H1) con id 'constructor' o '__proto__'"
      when: "si cerca"
      then: "restituisce 'nessuna voce' (mai un membro ereditato)"

  target_tests:
    - file: "tests/design-hero-layouts-v11.test.ts"
      covers: [AC-DE11-201-1, AC-DE11-201-2, AC-DE11-201-3, AC-DE11-201-4]

- id: DE11-202
  title: "section-layouts ricchi (chi-siamo/orari/contatti/menu come LAYOUT veri) + nastri divisori"
  macrotask: "variety-engine"
  depends_on: [DE11-101]

  objective: >
    Far evolvere section-treatments.ts in LAYOUT di sezione veri (non solo bordi): chi-siamo
    (2 varianti), orari (2), contatti (2), menu (card-carta) come griglie/tabelle/card
    computabili; e introdurre i nastri divisori (scacchi conici | gingham incrociato) come
    voci di catalogo puro. Id versionati, lookup esatto su array proto-safe, ogni variante con
    un layout descriptor DISTINTO (non l'ennesimo trattamento-bordo di v1).

  definition_of_done:
    - "Catalogo section-layouts puro con >=2 varianti per chi-siamo, >=2 per orari, >=2 per contatti, e la variante menu card-carta — ciascuna con un layout descriptor (griglia/tabella/card) distinto, id versionati nome@N"
    - "Nastri divisori (scacchi conici, gingham) come voci di catalogo con id versionati"
    - "Lookup esatto su array (proto-safe) per section-layout e per nastro; ogni voce marca universale vs overlay ristorazione"

  acceptance_criteria:
    - id: AC-DE11-202-1
      given: "il catalogo section-layouts"
      when: "si enumerano le varianti per chi-siamo, orari, contatti"
      then: ">=2 varianti per ciascuna sezione, ognuna con un layout descriptor distinto (non solo un trattamento-bordo)"
    - id: AC-DE11-202-2
      given: "la voce menu card-carta e i nastri divisori"
      when: "si ispezionano gli id"
      then: "esistono come voci di catalogo con id versionati nome@N (>=2 nastri distinti: conico, gingham)"
    - id: AC-DE11-202-3
      given: "un catalogo con id-prefisso (fixture) e i lookup di section-layout/nastro"
      when: "si cerca per id esatto e per 'constructor'/'__proto__'"
      then: "l'id esatto trova solo l'esatto (mai il prefisso) e i lookup proto restituiscono 'nessuna voce'"

  target_tests:
    - file: "tests/design-section-layouts-v11.test.ts"
      covers: [AC-DE11-202-1, AC-DE11-202-2, AC-DE11-202-3]

- id: DE11-203
  title: "design-matrix aggiornata: ammette le nuove combinazioni, >=5 scheletri VISIBILMENTE distinti/vertical"
  macrotask: "variety-engine"
  depends_on: [DE11-201, DE11-202]

  objective: >
    Aggiornare src/domain/generation/design-matrix.ts perché ammetta le nuove combinazioni
    (hero-layout ricchi × trattamento-H1 × section-layouts × nastro × illustrazione × tema ×
    effect_level). isAllowed codifica le nuove regole di compatibilità (leggibilità, coerenza
    superfici); allowedCombinations(vertical) garantisce >=5 combinazioni per OGNI vertical, a
    due a due distinte sull'asse hero VISIBILE e su >=1 asse del corpo. Nessuna regola muta:
    ogni regola mappa a pezzi di catalogo esistenti.

  definition_of_done:
    - "isAllowed(combo) copre gli assi nuovi (hero-layout, trattamento-H1, section-layout, nastro, illustrazione) oltre a tema/effect_level; vieta gli accoppiamenti brutti (es. superficie/tema incoerenti, hero pieno + effetti > tetto)"
    - "allowedCombinations(vertical): readonly Combo[] enumera SOLO combinazioni ammesse (overlay ristorazione + fallback universale), >=5 per OGNI vertical dell'enum"
    - "Le >=5 combinazioni di un vertical sono a due a due distinte sull'asse hero VISIBILE e su >=1 asse del corpo (distinzione rafforzata, non lo scheletro debole di v1)"

  acceptance_criteria:
    - id: AC-DE11-203-1
      given: "una combo che viola una regola dichiarata (fixture: accoppiamento vietato tra i nuovi assi)"
      when: "isAllowed"
      then: "false"
    - id: AC-DE11-203-2
      given: "una combo conforme alle regole"
      when: "isAllowed"
      then: "true"
    - id: AC-DE11-203-3
      given: "vertical='ristorazione'"
      when: "allowedCombinations"
      then: ">=5 combinazioni, tutte isAllowed, a due a due distinte sull'asse hero visibile E su >=1 asse del corpo"
    - id: AC-DE11-203-4
      given: "OGNI vertical dell'enum (ristorazione, fitness, salone_studio, negozio_artigiano, altro)"
      when: "allowedCombinations (col fallback universale)"
      then: ">=5 combinazioni ciascuno, tutte isAllowed"

  target_tests:
    - file: "tests/design-matrix-v11.test.ts"
      covers: [AC-DE11-203-1, AC-DE11-203-2, AC-DE11-203-3, AC-DE11-203-4]

  security_notes:
    - "Input della matrice = valori di catalogo + vertical (enum chiuso, brief.ts z.enum), mai testo libero del brief: nessun percorso injection→scelta visiva (P2-D1)"

- id: DE11-204
  title: "design-select interfaccia pluggabile (signals? — Piano B predisposto) + distinzione rafforzata"
  macrotask: "variety-engine"
  depends_on: [DE11-203]

  objective: >
    Portare src/domain/generation/design-select.ts alla firma pluggabile DS-D14:
    selectDesign(vertical, seed, variantIndex, signals?) -> DesignSelection, deterministico
    (PRNG seminato, nessun Date/Math.random), output validato dalla matrice (isAllowed). Le 5
    varianti divergono sull'asse hero VISIBILE + >=1 asse del corpo (distinzione rafforzata vs
    v1). L'interfaccia AMMETTE una sorgente alternativa (Piano B orchestratore) senza cambiare
    il contratto: signals? opzionale, tipo di ritorno stabile e documentato — PREDISPOSIZIONE,
    non implementazione del Piano B (il Piano A ignora signals).

  definition_of_done:
    - "selectDesign(vertical, seed, variantIndex, signals?) puro e deterministico (PRNG seminato); il parametro signals è opzionale e nel Piano A NON altera l'output (predisposizione Piano B)"
    - "Restituisce una DesignSelection (tupla di assi: recipe/theme/hero_layout/h1_treatment/section_layout(s)/ribbon/illustration/effect_level/ornament?) con soli id di catalogo esistenti, ogni volta isAllowed dalla matrice"
    - "Le 5 varianti di una generazione differiscono sull'asse hero VISIBILE E su >=1 asse del corpo (non più lo scheletro debole di v1)"
    - "Il contratto dell'interfaccia (input/output) è documentato e stabile: il Piano B (orchestratore) potrebbe restituire la STESSA tupla senza toccare renderer/freeze/CSP"

  acceptance_criteria:
    - id: AC-DE11-204-1
      given: "(vertical, seed) fissi"
      when: "selectDesign è chiamato due volte per lo stesso variantIndex (con e senza signals)"
      then: "restituisce una selezione identica (deterministico; nel Piano A signals non cambia l'esito)"
    - id: AC-DE11-204-2
      given: "una generazione"
      when: "si producono le 5 varianti (i=0..4)"
      then: "ogni coppia differisce sull'asse hero VISIBILE E su >=1 asse del corpo (distinzione rafforzata)"
    - id: AC-DE11-204-3
      given: "due seed diversi"
      when: "si producono le 5 varianti per ciascuno"
      then: "i due insiemi di selezioni differiscono (varietà per-utente)"
    - id: AC-DE11-204-4
      given: "molti seed e OGNI vertical dell'enum (property test)"
      when: "si selezionano tutte le varianti"
      then: "ogni DesignSelection è isAllowed dalla matrice (nessuna combinazione vietata esce mai)"
    - id: AC-DE11-204-5
      given: "il contratto dell'interfaccia con signals? opzionale"
      when: "si chiama selectDesign senza signals e con signals arbitrari"
      then: "la firma accetta il parametro opzionale, l'output resta la tupla validata dalla matrice (contratto stabile che predispone il Piano B senza implementarlo)"

  target_tests:
    - file: "tests/design-select-v11.test.ts"
      covers: [AC-DE11-204-1, AC-DE11-204-2, AC-DE11-204-3, AC-DE11-204-4, AC-DE11-204-5]

  security_notes:
    - "Input = vertical (enum) + seed + eventuali segnali DERIVATI dal brief, MAI markup/testo libero; ogni selezione passa comunque da isAllowed (matrice) + parseDocument (freeze). Un'iniezione nel brief può al massimo produrre un'altra combinazione VALIDA, mai iniettare codice (P2-D1)"
    - "Piano B NON implementato qui: solo l'interfaccia. Se costruito, ri-validato da isAllowed + parseDocument prima del freeze"

- id: DE11-205
  title: "Freeze schema documento: nuovi assi (id versionati opzionali con default), parseDocument gate"
  macrotask: "variety-engine"
  depends_on: [DE11-201, DE11-202]

  objective: >
    Estendere SiteDocumentSchema (document.ts) per congelare i nuovi assi (h1_treatment_id,
    section_layout id/i, ribbon_id, illustration_id — accanto ai campi di selezione v1) come id
    versionati OPZIONALI con default; parseDocument accetta/registra in scrittura e in render.
    I documenti v1 (senza i nuovi campi) validano ancora (default); un id di asse fuori catalogo
    o mal-formato fa cadere l'INTERO documento.

  definition_of_done:
    - "SiteDocumentSchema estende con i nuovi campi di selezione (h1_treatment_id, section_layout(s), ribbon_id, illustration_id) come id versionati opzionali con default (retro-compat)"
    - "parseDocument in scrittura E in render accetta e registra i campi nuovi; i default sono applicati quando assenti"
    - "Un documento v1 privo dei nuovi campi valida ancora (default); un id di asse mal-formato/fuori forma fa cadere tutto il documento"

  acceptance_criteria:
    - id: AC-DE11-205-1
      given: "un documento coi nuovi campi di selezione validi"
      when: "parseDocument"
      then: "ok e i campi nuovi sono presenti nel documento parseato"
    - id: AC-DE11-205-2
      given: "un documento v1 SENZA i nuovi campi di selezione"
      when: "parseDocument"
      then: "ok (default applicati, nessun errore)"
    - id: AC-DE11-205-3
      given: "un documento con un id di asse mal-formato/fuori forma (es. h1_treatment_id non nella forma nome@N)"
      when: "parseDocument"
      then: "rifiutato (l'INTERO documento cade, come per gli altri campi versionati)"

  target_tests:
    - file: "tests/document-design-selection-v11.test.ts"
      covers: [AC-DE11-205-1, AC-DE11-205-2, AC-DE11-205-3]

  security_notes:
    - "parseDocument resta il gate in scrittura E in render anche sui campi nuovi (invariante P4/P2): un documento malformato cade tutto"

  out_of_scope:
    - "La resa dei nuovi assi (Hero/Menu ricchi) è DE11-301/302; le sezioni chi-siamo/orari/contatti sono M4"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` su questa dir di blueprint —
  atteso exit 0 / tutti i controlli OK (`11` §5.1).
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task; i
  rilievi vanno all'human-in-the-loop (`11` §5.2–§5.3).

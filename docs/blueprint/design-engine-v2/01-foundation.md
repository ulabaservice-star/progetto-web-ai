# 01-foundation — Macrotask `foundation`

> Modulo del blueprint **design-engine-v2** di Belora/Ulaba. Un modulo = un macrotask
> (checkpoint al confine + gate visivo, commit atomico). Schema trueline (`L-COL-019`). Design a
> monte: `docs/superpowers/specs/2026-08-15-design-engine-v2-design.md` (§3 DS-V2-D1, §5.1).

## Obiettivo del macrotask

La **radice** dell'intero motore v2: sostituire gli 8 temi "poveri" con le **palette coese di Claude
Design** (progetto `c1dafc1f`, ≥8 di fatto 23, ognuna una personalità di locale) e portare l'intero
vocabolario colore/tipografia ai **token semantici** di CD, senza spezzare l'interfaccia stabile che
il motore consuma. La forma `SiteTheme` (Record totale) resta invariata; cambiano il *contenuto* dei
token e, per estensione, il vocabolario (`surface-page/alt/card/dark`, `ink`/`text-*`, `on-dark*`,
`line*`, `accent`/`accent-2`, `eyebrow-color`). `theme-style.ts` proietta i nuovi token come custom
property alla radice; `site.css` si allinea ai `var(--…)` **senza un solo colore letterale**; nascono
i **primitivi condivisi** (`Button`, `SectionHead`, `PhotoPlaceholder`) come componenti `src/ui/site`
a token, con escaping React e **nessun HTML grezzo**. I molti test che pinnano i temi si aggiornano
per **inclusione, non biiezione** (DS-V2-D1: `Set(theme_id) == Set(THEMES)` è l'accoppiamento da
eliminare).

Ripartizione di altitudine: `themes.ts` è **dominio puro** (nessun React/DB, gli esadecimali vivono
qui, fuori dallo scanner AC-231-4); `theme-style.ts`, `site.css`, i primitivi vivono in `src/ui/site`.
`ui → domain` è lecito. Nessuna nuova tabella/RLS/segreto: la superficie è cataloghi + render.

## Task atomici

```yaml
- id: DV2-101
  title: "themes.ts: le palette di Claude Design (>=8) + vocabolario token semantici, SiteTheme stabile"
  macrotask: "foundation"
  depends_on: []

  objective: >
    Riscrivere src/domain/generation/themes.ts con le palette coese di Claude Design (progetto
    c1dafc1f), almeno 8, ognuna una personalita' di locale (trattoria-rustica, pizzeria-napoletana,
    fine-dining, enoteca-scura, ...). La forma SiteTheme resta un Record TOTALE (interfaccia stabile
    consumata dal motore); il vocabolario dei token colore si ESTENDE ai semantici di CD
    (surface-page/alt/card/dark, ink/text-*, on-dark*, line*, accent/accent-2, eyebrow-color) piu'
    i token tipografia/scala/spazio/raggi. Gli esadecimali vivono SOLO qui (dominio puro). I test dei
    temi si aggiornano per INCLUSIONE, non per biiezione con una lista fissa.

  definition_of_done:
    - "themes.ts esporta TUTTE le palette del catalogo CD (di fatto 23; minimo 8), ognuna un SiteTheme completo (Record totale: nessun token del tipo mancante)"
    - "Il vocabolario token colore e' esteso ai semantici CD (surface-page/alt/card/dark, ink, text-*, on-dark*, line*, accent, accent-2, eyebrow-color); i token tipografia/scala/spazio/raggi restano presenti"
    - "L'interfaccia esportata SiteTheme e la firma dei lookup (per id versionato nome@N) restano stabili; gli id storici usati altrove restano risolvibili o sono rimappati esplicitamente"
    - "I test dei temi aggiornati verificano l'INCLUSIONE (ogni THEME e' un SiteTheme ben formato) senza reintrodurre l'accoppiamento biiettivo Set(theme_id)==Set(THEMES)"

  acceptance_criteria:
    - id: AC-DV2-101-1
      given: "il catalogo THEMES di v2"
      when: "si contano le palette e si ispeziona ciascuna"
      then: "ci sono >=8 palette e ognuna e' un SiteTheme con TUTTI i token del tipo valorizzati (nessun campo mancante o vuoto)"
    - id: AC-DV2-101-2
      given: "una palette del catalogo"
      when: "si leggono i suoi token colore"
      then: "porta i token semantici CD (surface-page, surface-dark, ink, accent, line, on-dark, eyebrow-color) con valori distinti per surface vs surface-dark"
    - id: AC-DV2-101-3
      given: "un theme_id versionato del catalogo (nome@N)"
      when: "lo si risolve col lookup dei temi"
      then: "restituisce esattamente quella palette; un id inesistente non risolve a un clone silenzioso (errore o undefined esplicito, proto-safe)"
    - id: AC-DV2-101-4
      given: "la suite dei temi aggiornata"
      when: "gira"
      then: "verifica le palette per inclusione (ognuna ben formata) e NON asserisce una biiezione con una lista di id hard-coded"

  target_tests:
    - file: "tests/design-themes-v2.test.ts"
      covers: [AC-DV2-101-1, AC-DV2-101-2, AC-DV2-101-3, AC-DV2-101-4]

  security_notes:
    - "themes.ts e' dominio puro: nessun input utente, nessuna risorsa esterna. Gli esadecimali sono confinati qui (fuori da src/ui/site, esenti dallo scanner AC-231-4 per posizione). Nessun colore letterale migra in src/ui/site"

  out_of_scope:
    - "La proiezione dei token come custom property (DV2-102) e le regole site.css (DV2-103)"

- id: DV2-102
  title: "theme-style.ts: proiezione dei token semantici CD come custom property alla radice"
  macrotask: "foundation"
  depends_on: [DV2-101]

  objective: >
    Allineare src/ui/site theme-style (la funzione che emette le custom property del tema sulla radice
    del sito) al vocabolario esteso di DV2-101: OGNI token colore/tipografia del SiteTheme diventa una
    custom property --site-color-* / --site-font-* proiettata alla radice. Nessun token dimenticato
    (un token del tipo senza custom property e' un buco che i blocchi renderebbero senza colore).
    Nessun colore letterale nel codice della proiezione: i valori vengono dal tema.

  definition_of_done:
    - "theme-style proietta una custom property per OGNI token colore semantico CD del SiteTheme (surface-page/alt/card/dark, ink, text-*, on-dark*, line*, accent, accent-2, eyebrow-color) e per i token font"
    - "La mappatura token->custom-property e' totale: non esiste un token del tipo SiteTheme senza la sua --site-* corrispondente (guardiano di completezza nel test)"
    - "Nessun colore letterale nel modulo di proiezione: i valori provengono dall'oggetto tema"

  acceptance_criteria:
    - id: AC-DV2-102-1
      given: "un SiteTheme del catalogo v2"
      when: "si genera lo stile del tema (custom property della radice)"
      then: "per ogni token colore semantico CD del tema esiste una custom property --site-color-* col valore del token"
    - id: AC-DV2-102-2
      given: "il tipo SiteTheme e la funzione di proiezione"
      when: "si confrontano le chiavi dei token con le custom property emesse"
      then: "la copertura e' totale: nessun token del tipo resta senza la sua custom property (nessun buco)"
    - id: AC-DV2-102-3
      given: "il modulo di proiezione dei token"
      when: "si ispeziona il sorgente"
      then: "non contiene colori letterali (hex/rgb/hsl): ogni valore colore proviene dal tema"

  target_tests:
    - file: "tests/theme-style-v2.test.ts"
      covers: [AC-DV2-102-1, AC-DV2-102-2, AC-DV2-102-3]

  security_notes:
    - "La proiezione consuma solo l'oggetto tema (dominio, nessun input utente). Nessun colore letterale in src/ui/site (AC-231-4)"

  out_of_scope:
    - "Le regole tipografiche/di layout di site.css (DV2-103)"

- id: DV2-103
  title: "site.css allineato ai token CD: solo var(--...), zero colori letterali"
  macrotask: "foundation"
  depends_on: [DV2-101, DV2-102]

  objective: >
    Allineare src/ui/site/site.css ai token semantici CD proiettati da DV2-102: superfici, testo,
    accenti, linee/bordi, tipografia editoriale (display sui titoli/prezzi/citazioni, corpo lh
    editoriale, label tracked, tabular-nums, leader-dots) espressi ESCLUSIVAMENTE via var(--site-*).
    Nessun colore letterale nel .css (lo scanner AC-231-4 e' esteso al .css). Le regole preparano i
    primitivi e i blocchi ricchi (DV2-104 e macrotask hero/menu/body).

  definition_of_done:
    - "site.css usa i token semantici CD via var(--site-color-*) per superfici/testo/accenti/linee; nessun valore colore e' scritto in chiaro"
    - "Sono presenti le regole editoriali di base a token (display su titoli/prezzi/citazioni, corpo a interlinea editoriale, label tracked, tabular-nums per i prezzi, leader-dots decorativi)"
    - "Lo scanner colori-letterali su site.css riporta 0 occorrenze hex/rgb/hsl"

  acceptance_criteria:
    - id: AC-DV2-103-1
      given: "site.css di v2"
      when: "lo scanner dei colori letterali (AC-231-4 esteso al .css) lo analizza"
      then: "riporta 0 occorrenze di colore letterale (hex/rgb/hsl): ogni colore e' un var(--...)"
    - id: AC-DV2-103-2
      given: "site.css di v2"
      when: "si cercano i riferimenti ai token"
      then: "le regole di superficie/testo/accento usano le custom property CD (var(--site-color-surface-*/ink/accent/line/on-dark)) proiettate da theme-style"
    - id: AC-DV2-103-3
      given: "site.css di v2"
      when: "si ispezionano le regole tipografiche"
      then: "esistono le regole editoriali a token per display sui titoli, tabular-nums sui prezzi e leader-dots, senza colori letterali"

  target_tests:
    - file: "tests/site-css-no-literal-colors-v2.test.ts"
      covers: [AC-DV2-103-1, AC-DV2-103-2, AC-DV2-103-3]

  security_notes:
    - "site.css statico, servito self-host (CSP intatta). Nessun colore letterale (AC-231-4 esteso al .css); nessuna risorsa esterna (no url() remoti)"

  out_of_scope:
    - "I componenti primitivi (DV2-104) e i blocchi di sezione (macrotask 02-04)"

- id: DV2-104
  title: "Primitivi condivisi a token: Button, SectionHead, PhotoPlaceholder (escaping React, no HTML grezzo)"
  macrotask: "foundation"
  depends_on: [DV2-101, DV2-103]

  objective: >
    Creare in src/ui/site i primitivi condivisi che tutti i blocchi ricchi riuseranno: Button (varianti
    a token), SectionHead (eyebrow + titolo display + sottotitolo, slot editabili), PhotoPlaceholder
    (il box tipografico di CD con etichetta FOTO . <label>, DS-V2-D3, nessuna risorsa esterna). Tutti
    consumano SOLO i token via var(--...); il testo passa da slot ed e' escapato da React; e' VIETATO
    dangerouslySetInnerHTML in src/ui/site/** (AC-231-4). Nessun colore letterale.

  definition_of_done:
    - "Button, SectionHead, PhotoPlaceholder implementati come componenti src/ui/site che rendono a token (var(--site-*)), senza colori letterali"
    - "PhotoPlaceholder rende un box tipografico con etichetta 'FOTO . <label>' (placeholder di catalogo), nessun <img> a risorsa esterna"
    - "Il testo degli slot e' reso via React (escaping automatico); nessun uso di dangerouslySetInnerHTML in questi componenti"

  acceptance_criteria:
    - id: AC-DV2-104-1
      given: "i primitivi Button/SectionHead/PhotoPlaceholder"
      when: "vengono resi con slot noti"
      then: "il markup usa classi/var(--site-*) a token e non contiene colori letterali ne' dangerouslySetInnerHTML"
    - id: AC-DV2-104-2
      given: "un PhotoPlaceholder con label"
      when: "e' reso"
      then: "produce un box tipografico con l'etichetta 'FOTO . <label>' e nessun <img>/risorsa esterna"
    - id: AC-DV2-104-3
      given: "un SectionHead/Button il cui testo di slot contiene payload ostile (es. <script>, javascript:)"
      when: "e' reso"
      then: "il testo e' escapato da React (nessun markup iniettato, nessun href/src nato dal testo)"

  target_tests:
    - file: "tests/site-primitives-v2.test.ts"
      covers: [AC-DV2-104-1, AC-DV2-104-2, AC-DV2-104-3]

  security_notes:
    - "Escaping React su tutti gli slot testo; VIETATO dangerouslySetInnerHTML in src/ui/site/** (AC-231-4); PhotoPlaceholder e' un placeholder di catalogo, mai una risorsa esterna (CSP, DS-V2-D3); nessun colore letterale"

  out_of_scope:
    - "L'uso dei primitivi dentro Hero/Offerte/blocchi corpo (macrotask 02-04)"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` sulla dir del blueprint —
  atteso exit 0 / tutti i controlli OK (`11` §5.1).
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task; i
  rilievi vanno all'human-in-the-loop (`11` §5.2–§5.3).
- **Gate visivo** (DS-V2-D6, non oracolabile): al confine del macrotask, screenshot su `/s/` di un
  mockup che esercita le palette CD + primitivi; l'utente giudica il "wow". Se non convince, ci si ferma.

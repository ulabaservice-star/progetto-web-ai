# 02-offerings-editor — Macrotask `offerings-editor`

> Modulo del blueprint `onboarding-guided-wizard`. Rende le **offerte editabili** nel form
> (oggi sono solo in lettura in `BriefPanel`). Editor **generico** e settore-agnostico (OGW-D3).
> Nessuna dipendenza. La selezione/conferma AI dei suggerimenti è del macrotask `suggest-offerings`.

## Obiettivo del macrotask

Un `OfferingsEditor` che edita `offerings[]` come lista generica di voci
`{nome, descrizione?, prezzo?, gruppo?}`, con l'etichetta di sezione derivata dal `vertical`
(`resolveOfferings`: Menu/Corsi/Servizi/Catalogo/Elenco) e un hint quando il prezzo non compare
sul sito (salone/studio). Il canale di persistenza è quello esistente (`BriefCorePatch` esteso →
`upsertBrief`, che già accetta `offerings`). Nessun ramo per-settore: solo etichette.

## Task atomici

```yaml
- id: OGW-201
  title: "Estendere BriefCorePatch a offerings + persistenza via canale esistente"
  macrotask: "offerings-editor"
  depends_on: []
  objective: >
    Portare le offerte nel canale editabile del pannello: la patch include offerings (voci
    name/description?/price?/section?), validate server-side, scritte da upsertBrief (che gia'
    le accetta). Nessuna modifica al Brief ne al motore.
  definition_of_done:
    - "BriefCorePatch (brief-fields.ts) include offerings tipizzato come lista di voci"
    - "Il pannello spedisce offerings nella patch; upsertBrief le persiste"
    - "La forma delle voci e' validata server-side (OfferingSchema/BriefUpdateSchema, invariati)"
  acceptance_criteria:
    - id: AC-201-1
      given: "una patch con offerte valide per un sito del proprietario"
      when: "viene salvata"
      then: "le offerte sono persistite nel brief (leggibili dopo il salvataggio)"
    - id: AC-201-2
      given: "una patch con una voce d'offerta fuori forma (campo oltre i tetti o tipo errato)"
      when: "viene salvata"
      then: "la voce invalida e' scartata dalla validazione senza far fallire l'intero salvataggio"
  target_tests:
    - file: "tests/onboarding-offerings-patch.test.ts"
      covers: [AC-201-1, AC-201-2]
  security_notes:
    - "Le offerte sono testo non fidato: validate server-side da BriefUpdateSchema/OfferingSchema (T-121, invariati); scarto campo-per-campo (applyBriefUpdate)"
  out_of_scope:
    - "La generazione/suggerimento AI delle offerte (OGW-402)"

- id: OGW-202
  title: "OfferingsEditor: editor generico voci + etichetta per-settore + hint prezzo"
  macrotask: "offerings-editor"
  depends_on: [OGW-201]
  objective: >
    Un componente UI che aggiunge/modifica/rimuove voci d'offerta, con l'etichetta di sezione
    derivata dal vertical (resolveOfferings) e un hint quando il prezzo non comparira' sul sito.
    Testo non fidato reso solo in input/nodi di testo (mai innerHTML/href), invariante T-151.
  definition_of_done:
    - "OfferingsEditor rende le voci come campi editabili (nome/descrizione/prezzo/gruppo) con add/remove"
    - "L'etichetta della sezione riflette il vertical via resolveOfferings (Menu/Corsi/Servizi/Catalogo/Elenco)"
    - "Un hint compare quando show_price e' false per il vertical (salone/studio)"
    - "onChange restituisce l'array offerings aggiornato al contenitore"
  acceptance_criteria:
    - id: AC-202-1
      given: "l'editor con alcune voci"
      when: "l'utente aggiunge, modifica o rimuove una voce"
      then: "onChange e' chiamato con l'array offerings aggiornato che riflette l'azione"
    - id: AC-202-2
      given: "un vertical (es. fitness)"
      when: "si rende l'editor"
      then: "l'etichetta di sezione e' quella di resolveOfferings per quel vertical (es. Corsi), non 'Menu' fisso"
    - id: AC-202-3
      given: "un vertical con show_price false (salone_studio)"
      when: "si rende l'editor"
      then: "compare l'hint che il prezzo non verra' mostrato sul sito; per un vertical con show_price true l'hint non compare"
    - id: AC-202-4
      given: "una voce con testo ostile (es. <img onerror=...>) nel nome"
      when: "l'editor la rende"
      then: "il testo compare solo in value di input / nodi di testo, mai in innerHTML o in un href"
  target_tests:
    - file: "tests/onboarding-offerings-editor.test.tsx"
      covers: [AC-202-1, AC-202-2, AC-202-3, AC-202-4]
  security_notes:
    - "Testo non fidato reso in value/nodi di testo, mai innerHTML/href (invariante pannello T-151); nessun colore/HTML da input"
  out_of_scope:
    - "Il pulsante Suggerisci-offerte e la conferma per-voce (OGW-402)"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` — exit 0.
- **Confine checkpoint**: e2e/component per l'editor; mutazione: rendere il nome via innerHTML →
  test anti-injection rosso; etichetta fissa 'Menu' → AC-202-2 rosso.

# 05-wizard-shell — Macrotask `wizard-shell`

> Modulo del blueprint `onboarding-guided-wizard`. Il **cuore**: il contenitore wizard a step che
> riorganizza `OnboardingWorkspace` e integra i pezzi (editor, pulsanti AI, review→genera).
> Dipende da `offerings-editor`, `generate-description`, `suggest-offerings`.

## Obiettivo del macrotask

Il flusso guidato: **Ingresso** (import-URL o da-zero) → **Base** (nome + bottoni tipo/obiettivo) →
**Racconto** (✨ genera-descrizione) → **Offerte** (`OfferingsEditor` + ✨ suggerisci) →
**Contatti & orari** (widget esistente) → **Rivedi & conferma → Genera**. Navigazione con
"Avanti/Indietro/Salta"; il minimo per generare resta basso (nome + tipo + obiettivo). Lo stato del
brief-bozza vive nel contenitore (come oggi `OnboardingWorkspace`). Import e generazione invariati.

## Task atomici

```yaml
- id: OGW-501
  title: "Contenitore wizard a step: navigazione + ingresso import/da-zero + step Base"
  macrotask: "wizard-shell"
  depends_on: [OGW-202]
  objective: >
    Riorganizzare OnboardingWorkspace in un wizard a step con navigazione (avanti/indietro/salta) e
    stato del brief-bozza condiviso; l'ingresso offre import-URL (fromUrl -> mergeProposal, proposta
    rivedibile) o partenza da zero; lo step Base raccoglie nome + tipo/obiettivo via bottoni.
  definition_of_done:
    - "Contenitore wizard con step ordinati e navigazione avanti/indietro/salta; stato brief-bozza unico"
    - "Ingresso: import-URL pre-compila il brief come PROPOSTA (mergeProposal, non auto-salvata) oppure da-zero"
    - "Step Base: bottoni tipo (VERTICAL_OPTIONS) e obiettivo (GOAL_OPTIONS) che settano vertical/primary_goal"
    - "Con nome+tipo+obiettivo il passaggio a Genera e' disponibile; altrimenti e' indicato cosa manca"
  acceptance_criteria:
    - id: AC-501-1
      given: "il wizard con dati parziali nel brief-bozza"
      when: "l'utente naviga avanti, indietro o salta uno step"
      then: "lo stato del brief-bozza e' preservato attraverso la navigazione"
    - id: AC-501-2
      given: "l'ingresso con un URL importabile (fromUrl finto che propone campi)"
      when: "l'import va a buon fine"
      then: "il brief-bozza e' pre-compilato come proposta (mergeProposal), senza salvataggio automatico"
    - id: AC-501-3
      given: "lo step Base"
      when: "l'utente sceglie un tipo e un obiettivo dai bottoni"
      then: "vertical e primary_goal assumono i valori dell'allowlist scelti (VERTICAL_OPTIONS/GOAL_OPTIONS)"
    - id: AC-501-4
      given: "un brief-bozza senza uno dei campi minimi (nome/tipo/obiettivo)"
      when: "si valuta la disponibilita' del passo Genera"
      then: "il passo non e' disponibile e la UI indica quale campo minimo manca"
  target_tests:
    - file: "tests/onboarding-wizard-shell.test.tsx"
      covers: [AC-501-1, AC-501-2, AC-501-3, AC-501-4]
  security_notes:
    - "locale e' proprieta' del sito (mai da import/UI, mergeProposal lo riafferma); destinazioni interne fisse; testo non fidato in value/nodi di testo"
  out_of_scope:
    - "L'integrazione degli step AI e la review->genera (OGW-502)"

- id: OGW-502
  title: "Integrazione step Racconto/Offerte/Contatti&orari + Rivedi->Genera (percorso e2e)"
  macrotask: "wizard-shell"
  depends_on: [OGW-501, OGW-302, OGW-402]
  objective: >
    Comporre nel wizard lo step Racconto (✨ genera-descrizione), lo step Offerte (OfferingsEditor +
    ✨ suggerisci), lo step Contatti&orari (widget esistente), e il passaggio a Rivedi&conferma ->
    Genera (ReviewConfirm esteso alle offerte). Il percorso arriva a un documento pubblicabile.
  definition_of_done:
    - "Lo step Racconto integra ✨ genera-descrizione (OGW-302); lo step Offerte integra OfferingsEditor (OGW-202) + ✨ suggerisci (OGW-402)"
    - "Lo step Contatti&orari usa il widget orari esistente; la review mostra tutti i campi editabili incl. offerte"
    - "Da review, Genera avvia la generazione col brief persistito (percorso /generate invariato)"
  acceptance_criteria:
    - id: AC-502-1
      given: "il wizard integrato"
      when: "si aprono gli step Racconto e Offerte"
      then: "lo step Racconto espone ✨ genera-descrizione e lo step Offerte espone OfferingsEditor + ✨ suggerisci"
    - id: AC-502-2
      given: "un brief-bozza compilato attraverso gli step"
      when: "si apre Rivedi & conferma"
      then: "mostra tutti i campi raccolti (base, descrizione, offerte, contatti, orari) editabili"
    - id: AC-502-3
      given: "il brief confermato in review"
      when: "l'utente preme Genera"
      then: "la generazione parte col brief salvato (percorso /generate invariato) e produce un documento"
    - id: AC-502-4
      given: "i due percorsi 'import -> step -> genera' e 'da zero -> minimo -> genera' (Chromium)"
      when: "eseguiti end-to-end"
      then: "entrambi arrivano a una generazione riuscita / documento pubblicabile"
  target_tests:
    - file: "tests/onboarding-wizard-integration.test.tsx"
      covers: [AC-502-1, AC-502-2, AC-502-3]
    - file: "e2e/onboarding-wizard.spec.ts"
      covers: [AC-502-4]
  security_notes:
    - "Generazione invariata (stesso brief in uscita); nessun testo non fidato in innerHTML/href; i pulsanti AI riusano guardie + budget"
  out_of_scope:
    - "La rimozione della chat (OGW-601)"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` — exit 0.
- **Confine checkpoint** + **GATE VISIVO** (il wizard è UI): screenshot del flusso; mutazione:
  navigazione che perde lo stato → AC-501-1 rosso; import che auto-salva → AC-501-2 rosso.

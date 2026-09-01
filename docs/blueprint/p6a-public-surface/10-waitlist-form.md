# 10-waitlist-form — Macrotask `waitlist-form`

> Il form waitlist client, montato nei due `data-testid='waitlist-slot'` della home (PUB-141), in due
> fette: **PUB-241** il componente e i suoi stati (idle/submitting/success-nuovo/già-in-lista/errore/
> inerte-senza-site-key) + il confine `waitlist-calls.ts` verso `/api/waitlist` (gemello di
> `domain-calls.ts`); **PUB-242** il **consenso GDPR non pre-spuntato** (link a `/privacy`, submit
> bloccato finché non è dato) e l'output sicuro (solo testo JSX). Copy dal namespace `landing.waitlist.*`
> (PUB-121). Presentazionale: riflette l'esito del server, non decide.

## Task atomici

```yaml
- id: PUB-241
  title: "WaitlistForm client + stati (success/già-in-lista/errore/inerte-senza-site-key) + confine waitlist-calls.ts"
  macrotask: "waitlist-form"
  depends_on: [PUB-141, PUB-231, PUB-232]
  objective: >
    Introdurre src/ui/waitlist/WaitlistForm.tsx (isola client, 'use client') e src/ui/waitlist/
    waitlist-calls.ts (confine client verso POST /api/waitlist, gemello di domain-calls/billing-calls:
    unico punto che conosce la rotta, fa fetch same-origin, traduce la risposta in un tipo stretto; un
    non-2xx/rete caduta => esito d'errore, la UI non inventa uno stato). Il form ha gli stati idle,
    submitting, success (nuovo iscritto -> landing.waitlist.successNew), already-in-list (risposta 'già
    in lista' -> landing.waitlist.successExisting, stessa famiglia amichevole), error
    (landing.waitlist.error). Il widget Turnstile si monta solo se NEXT_PUBLIC_TURNSTILE_SITE_KEY e'
    presente; assente => stato "non disponibile" (landing.waitlist.unavailable), nessun crash. Il form si
    monta nei due data-testid='waitlist-slot' della home.
  definition_of_done:
    - "Nuovo componente client src/ui/waitlist/WaitlistForm.tsx che consuma il namespace 'landing.waitlist' e rende un campo email + submit"
    - "Nuovo confine src/ui/waitlist/waitlist-calls.ts ('use client') con la sola funzione che POSTa a /api/waitlist e MAPPA il corpo { status: 'inserted' | 'already' } (contratto PUB-232) a un tipo stretto { kind: 'inserted' | 'already' | 'error' }; non-2xx / rete caduta => { kind: 'error' }"
    - "Stati resi: submit ok 'inserted' -> testo landing.waitlist.successNew; 'already' -> landing.waitlist.successExisting; errore/non-2xx -> landing.waitlist.error"
    - "NEXT_PUBLIC_TURNSTILE_SITE_KEY assente => regione widget mostra landing.waitlist.unavailable, il form non lancia (inerte)"
    - "Il form è montato nei due data-testid='waitlist-slot' della home (PUB-141)"
  acceptance_criteria:
    - id: AC-241-1
      given: "il form reso con NextIntlClientProvider sui cataloghi reali e un fetch mockato che risponde 200 'inserted'"
      when: "l'utente invia un'email valida"
      then: "compare il testo landing.waitlist.successNew (stato di successo per il nuovo iscritto)"
    - id: AC-241-2
      given: "un fetch mockato che risponde 200 con esito 'already'"
      when: "l'utente invia l'email"
      then: "compare il testo landing.waitlist.successExisting (stato amichevole 'già in lista', non un errore)"
    - id: AC-241-3
      given: "NEXT_PUBLIC_TURNSTILE_SITE_KEY assente"
      when: "il form viene reso"
      then: "la regione widget mostra landing.waitlist.unavailable e il componente non lancia (nessun crash)"
  target_tests:
    - file: "tests/ui-waitlist-form.test.tsx"
      covers: [AC-241-1, AC-241-2, AC-241-3]
  security_notes:
    - "A05:2025 output — email e valori resi SOLO come testo JSX (escaping React), mai innerHTML/dangerouslySetInnerHTML; nessuna interpolazione in href"
    - "A07:2025 — nel client vive SOLO la site key pubblica (NEXT_PUBLIC_TURNSTILE_SITE_KEY); il secret Turnstile resta server-side (PUB-222)"
    - "P6A-D5 — il form non decide nulla: POSTa e riflette l'esito del server; nessuna scrittura diretta"
  out_of_scope:
    - "Il consenso GDPR e il blocco del submit (PUB-242)"
    - "L'endpoint e le guardie (PUB-231/PUB-232)"

- id: PUB-242
  title: "Consenso GDPR non pre-spuntato (link a /privacy) che blocca il submit finché non dato"
  macrotask: "waitlist-form"
  depends_on: [PUB-141, PUB-231, PUB-232]
  objective: >
    Aggiungere al form un checkbox di consenso GDPR NON pre-spuntato (opt-in esplicito, P6A-D7) con
    l'etichetta landing.waitlist.consentLabel e un link a /{locale}/privacy: il submit resta BLOCCATO
    (disabilitato, nessun fetch) finche' il consenso non e' dato. Nessun valore e' pre-selezionato per
    l'utente; il consenso e' una scelta attiva.
  definition_of_done:
    - "Un checkbox di consenso reso NON spuntato di default (defaultChecked assente/false), con label landing.waitlist.consentLabel"
    - "Un link nel testo di consenso che punta a /{locale}/privacy (href interno fisso, mai da input utente)"
    - "Il pulsante di submit e' disabilitato / il submit e' bloccato (nessun fetch) finche' il consenso non e' spuntato"
  acceptance_criteria:
    - id: AC-242-1
      given: "il form appena reso (consenso non spuntato)"
      when: "si ispeziona il pulsante di submit e si tenta l'invio"
      then: "il submit e' bloccato (pulsante disabilitato) e nessuna chiamata fetch parte"
    - id: AC-242-2
      given: "il form reso"
      when: "l'utente spunta il checkbox di consenso e poi invia un'email valida"
      then: "il submit e' abilitato e la funzione di waitlist-calls (fetch a /api/waitlist) e' invocata"
    - id: AC-242-3
      given: "il testo di consenso reso in locale 'it'"
      when: "si legge l'href del link privacy"
      then: "punta a /it/privacy"
  target_tests:
    - file: "tests/ui-waitlist-form.test.tsx"
      covers: [AC-242-1, AC-242-2, AC-242-3]
  security_notes:
    - "P6A-D7 — consenso opt-in ESPLICITO, mai pre-spuntato; il submit bloccato senza consenso impedisce una raccolta senza base giuridica"
    - "A05:2025 output — il link privacy ha un href interno FISSO /{locale}/privacy, mai interpolato da input utente (anti open-redirect)"
  out_of_scope:
    - "Il contenuto legale della pagina /privacy (PUB-341)"
    - "La persistenza della prova di consenso lato server (fuori scope v1; nessun IP/timestamp legale in v1, P6A-D7)"
```

## Self-check

- **Checkpoint**: `hygiene` (`WaitlistForm.tsx` + `waitlist-calls.ts` clone-free; il confine calls è
  gemello di `domain-calls.ts` = pattern in baseline), `suite` + `AC` (`tests/ui-waitlist-form.test.tsx`
  jsdom + `NextIntlClientProvider` sui cataloghi REALI, `fetch` mockato), gate visivo umano opzionale
  (il form è parte della demo del prodotto).
- **Mutazione**: mappare `'already'` sullo stato di errore → AC-241-2 rosso; rendere il widget mancante
  come throw invece di `unavailable` → AC-241-3 rosso; pre-spuntare il consenso (`defaultChecked`) →
  AC-242-1 rosso (submit non più bloccato); permettere il submit con consenso non dato → AC-242-1 rosso.

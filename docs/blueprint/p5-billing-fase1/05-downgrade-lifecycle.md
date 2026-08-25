# 05-downgrade-lifecycle — Macrotask `downgrade-lifecycle`

> Modulo del blueprint `p5-billing-fase1`. La rete di sicurezza del cliente: quando un Pro decade, il
> sito **non si spegne mai di colpo**. Grazia (`past_due` servito Pro fino a fine grazia), poi
> retrocessione **morbida** — badge che torna, siti eccedenti non-pubblicati ma **mai cancellati**.
> Dipende da `entitlement-core` e `stripe-checkout-webhook`. **Domini custom esclusi** (Fase 2, BIL-D7).

## Obiettivo del macrotask

Modellare la transizione Pro→Free come una decisione **pura** (`applyDowngrade`) e applicarla in modo
**idempotente** quando il webhook segnala la decadenza. Nessun dato perso: riattivando (ripagando)
tutto torna. La logica di cosa retrocede è testabile senza effetti collaterali; l'applicazione tocca
solo lo stato di pubblicazione dei siti eccedenti (offline, non delete).

## Task atomici

```yaml
- id: BIL-501
  title: "applyDowngrade puro: grazia + cosa retrocede (badge, siti eccedenti offline)"
  macrotask: "downgrade-lifecycle"
  depends_on: [BIL-102]
  objective: >
    Decidere, come funzione pura di (entitlement/subscription, elenco siti, now), cosa comporta una
    decadenza: durante la grazia (past_due entro la finestra) l'entitlement resta Pro; a fine grazia o
    a canceled si torna Free, il badge torna, e i siti oltre il limite Free vengono marcati da mettere
    offline (mai da cancellare). Nessun accesso a orologio/DB: tutto dagli argomenti.
  definition_of_done:
    - "applyDowngrade(subscription, sites, now) -> { effectivePlan, sitesToUnpublish, badgeRestored } puro"
    - "past_due entro la finestra di grazia (parametro iniettato) => effectivePlan resta 'pro', nessuna azione"
    - "past_due oltre la grazia o canceled => effectivePlan 'free', badgeRestored true, sitesToUnpublish = i siti oltre max_sites free"
    - "sitesToUnpublish non contiene MAI una cancellazione: è solo un elenco da portare non-pubblicato"
  acceptance_criteria:
    - id: AC-501-1
      given: "una subscription past_due con now DENTRO la finestra di grazia"
      when: "si chiama applyDowngrade"
      then: "effectivePlan resta 'pro' e sitesToUnpublish è vuoto (grazia: nessuna retrocessione)"
    - id: AC-501-2
      given: "una subscription past_due con now OLTRE la finestra di grazia"
      when: "si chiama applyDowngrade"
      then: "effectivePlan è 'free', badgeRestored true, e i siti oltre il limite free sono in sitesToUnpublish"
    - id: AC-501-3
      given: "un account con 3 siti che retrocede a Free (limite 1)"
      when: "si chiama applyDowngrade"
      then: "sitesToUnpublish contiene esattamente i 2 siti eccedenti; nessuno è marcato per cancellazione"
    - id: AC-501-4
      given: "gli stessi argomenti"
      when: "si chiama applyDowngrade due volte"
      then: "l'esito è identico (funzione pura, nessun Date.now/effetto)"
  target_tests:
    - file: "tests/billing-apply-downgrade.test.ts"
      covers: [AC-501-1, AC-501-2, AC-501-3, AC-501-4]
  security_notes:
    - "BIL-D6 — nessun dato perso: la decisione non prevede DELETE, solo unpublish reversibile; il sito non si spegne mai senza grazia"
    - "Determinismo — now e finestra di grazia iniettati; nessun orologio nel dominio (gemello di resolveEntitlement)"
  out_of_scope:
    - "Lo scollegamento del dominio custom (Fase 2, BIL-D7): applyDowngrade in Fase 1 non nomina domini"

- id: BIL-502
  title: "Applicazione idempotente della retrocessione morbida (unpublish eccedenti, badge torna)"
  macrotask: "downgrade-lifecycle"
  depends_on: [BIL-501, BIL-202]
  objective: >
    Applicare l'esito di applyDowngrade quando il webhook segnala la decadenza: portare non-pubblicati
    i siti eccedenti (senza cancellarli) e lasciare che il badge torni (già derivato dall'entitlement
    in BIL-302). Idempotente: rieseguire non fa danni; riattivando l'abbonamento i siti sono
    ri-pubblicabili senza perdita.
  definition_of_done:
    - "All'evento di decadenza (dal webhook) si calcola applyDowngrade e si portano is_published=false i siti in sitesToUnpublish"
    - "Nessuna riga di sito/pubblicazione è cancellata: lo snapshot resta, il sito è solo offline"
    - "Applicazione idempotente: una seconda esecuzione con lo stesso stato non cambia nulla"
    - "Il ritorno del badge non richiede scrittura extra: discende dall'entitlement (BIL-302)"
  acceptance_criteria:
    - id: AC-502-1
      given: "un account Pro con 3 siti pubblicati che passa a Free (fine grazia)"
      when: "si applica la retrocessione"
      then: "i 2 siti eccedenti diventano is_published=false e 1 resta pubblicato; nessun sito è cancellato"
    - id: AC-502-2
      given: "la retrocessione già applicata"
      when: "la si applica una seconda volta con lo stesso stato"
      then: "lo stato dei siti non cambia (idempotente)"
    - id: AC-502-3
      given: "un account retrocesso i cui siti sono offline"
      when: "l'abbonamento Pro viene riattivato"
      then: "i siti eccedenti sono di nuovo pubblicabili (dati intatti, nessuna perdita)"
  target_tests:
    - file: "tests/billing-downgrade-apply.test.ts"
      covers: [AC-502-1, AC-502-2, AC-502-3]
  security_notes:
    - "A01/R7 — l'applicazione avviene server-side nel percorso del webhook (service_role confinato), non su richiesta del client"
    - "BIL-D6 — solo unpublish reversibile, mai DELETE: nessun dato perso, riattivazione senza perdita"
  out_of_scope:
    - "Email di sollecito/dunning e retry di pagamento (li gestisce Stripe; qui si applica solo l'esito di stato)"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Confine checkpoint**: `applyDowngrade` provata ai due lati della grazia + conteggio eccedenti +
  idempotenza; applicazione provata (unpublish non-delete + idempotente + riattivazione). Mutazione:
  DELETE al posto di unpublish → AC-501-3/502-1 rossi (nessuna cancellazione ammessa);
  ignorare la grazia (retrocede subito past_due) → AC-501-1 rosso; applicazione non idempotente →
  AC-502-2 rosso.

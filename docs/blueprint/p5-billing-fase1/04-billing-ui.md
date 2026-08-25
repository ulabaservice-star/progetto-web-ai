# 04-billing-ui — Macrotask `billing-ui`

> Modulo del blueprint `p5-billing-fase1`. La superficie utente del billing: una pagina "Passa a Pro"
> che mostra lo stato dell'abbonamento (dall'entitlement server-side) e offre le due azioni — aprire
> il Checkout per l'upgrade e il Billing Portal per gestione/disdetta. Dipende da `entitlement-core`
> e `stripe-checkout-webhook`.

## Obiettivo del macrotask

Dare all'utente un posto chiaro dove vedere il proprio piano e diventare Pro, riusando gli endpoint di
`stripe-checkout-webhook`. La UI **non custodisce dati di pagamento** (redirect a Stripe) e **non
decide l'entitlement** (lo legge dal server). i18n it+es come il resto della piattaforma.

## Task atomici

```yaml
- id: BIL-401
  title: "Pagina/pannello stato piano + CTA 'Passa a Pro' che apre il Checkout"
  macrotask: "billing-ui"
  depends_on: [BIL-103, BIL-203]
  objective: >
    Mostrare all'utente il piano corrente (Free/Pro) letto server-side dall'entitlement e, se Free,
    una CTA che avvia l'upgrade aprendo il Checkout (via l'endpoint createCheckout). Nessuna decisione
    di permesso lato client: la UI riflette l'entitlement, non lo determina.
  definition_of_done:
    - "Una pagina/route billing sotto /[locale] che legge getAccountEntitlement server-side e mostra il piano corrente"
    - "Se Free: CTA 'Passa a Pro' che chiama l'endpoint createCheckout e reindirizza alla url ricevuta"
    - "Se Pro: lo stato mostra il piano attivo (nessuna CTA di upgrade)"
    - "Chiavi i18n billing.* in it e es"
  acceptance_criteria:
    - id: AC-401-1
      given: "un utente Free sulla pagina billing"
      when: "la pagina è resa"
      then: "mostra il piano Free e una CTA 'Passa a Pro'"
    - id: AC-401-2
      given: "un utente Free che clicca 'Passa a Pro'"
      when: "la CTA è attivata"
      then: "l'endpoint createCheckout è invocato e l'utente è reindirizzato alla url di checkout"
    - id: AC-401-3
      given: "un utente Pro sulla pagina billing"
      when: "la pagina è resa"
      then: "mostra il piano Pro attivo e nessuna CTA di upgrade"
  target_tests:
    - file: "tests/billing-plan-panel.test.tsx"
      covers: [AC-401-1, AC-401-2, AC-401-3]
  security_notes:
    - "BIL-D2 — la UI legge l'entitlement server-side; non scrive il piano né lo determina lato client"
    - "PCI — l'upgrade è un redirect a Checkout Stripe; nessun dato di pagamento nella nostra UI"
  out_of_scope:
    - "La gestione/disdetta via Billing Portal (BIL-402)"

- id: BIL-402
  title: "Gestione abbonamento via Billing Portal + esposizione stati (active/past_due/canceled)"
  macrotask: "billing-ui"
  depends_on: [BIL-203, BIL-103]
  objective: >
    Per un account con abbonamento, offrire l'accesso al Billing Portal (cambio carta/disdetta) e
    mostrare lo stato dell'abbonamento in modo comprensibile (attivo, in ritardo di pagamento,
    disdetto in grazia). Nessuna UI di carta custodita da noi.
  definition_of_done:
    - "Un pulsante 'Gestisci abbonamento' che chiama openBillingPortal e reindirizza alla url del portale"
    - "Lo stato dell'abbonamento (active/past_due/canceled) è mostrato con un'etichetta chiara i18n"
    - "past_due in grazia è comunicato come 'ancora attivo, regolarizza il pagamento' (coerente con downgrade-lifecycle)"
  acceptance_criteria:
    - id: AC-402-1
      given: "un utente con un abbonamento gestibile"
      when: "clicca 'Gestisci abbonamento'"
      then: "l'endpoint openBillingPortal è invocato e l'utente è reindirizzato al portale"
    - id: AC-402-2
      given: "un abbonamento in stato past_due (in grazia)"
      when: "la pagina billing è resa"
      then: "mostra uno stato che indica 'ancora attivo, regolarizza il pagamento', non 'scaduto'"
    - id: AC-402-3
      given: "un abbonamento canceled"
      when: "la pagina billing è resa"
      then: "mostra lo stato disdetto e (se applicabile) l'opzione di ri-abbonarsi"
  target_tests:
    - file: "tests/billing-manage-portal.test.tsx"
      covers: [AC-402-1, AC-402-2, AC-402-3]
  security_notes:
    - "PCI — cambio carta/disdetta avvengono nel Billing Portal Stripe (redirect); nessun dato sensibile nella nostra UI"
    - "A01 — l'accesso al portale passa dalle guardie account di BIL-203 (utente sul proprio account)"
  out_of_scope:
    - "Il calcolo di cosa retrocede al termine della grazia (downgrade-lifecycle, modulo 05)"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Confine checkpoint**: rendering provato per Free (CTA presente) e Pro (nessuna CTA); la CTA
  invoca l'endpoint (mock) e reindirizza; stati past_due/canceled etichettati. Mutazione: mostrare la
  CTA upgrade anche a Pro → AC-401-3 rosso; etichettare past_due come 'scaduto' → AC-402-2 rosso.

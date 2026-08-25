# 02-stripe-checkout-webhook — Macrotask `stripe-checkout-webhook`

> Modulo del blueprint `p5-billing-fase1`. Il canale che **incassa**: la porta `PaymentProvider`
> (Stripe è il primo adattatore), il **webhook firmato e idempotente** che è la sorgente di verità
> dello stato dell'abbonamento, e gli endpoint che aprono il Checkout e il Billing Portal. Dipende da
> `entitlement-core`.

## Obiettivo del macrotask

Astrarre il pagamento dietro `PaymentProvider` (`createCheckout`, `openBillingPortal`, `parseWebhook`)
così che il resto del sistema non conosca Stripe. Il **webhook** è l'unico che muove
`subscriptions`: firma verificata (anti-spoof), idempotenza per event id (Stripe ri-invia), scrittura
server-side (service_role confinato). Gli endpoint checkout/portal aprono le superfici Stripe con le
guardie di identità/proprietà dell'account, senza custodire dati di pagamento.

## Task atomici

```yaml
- id: BIL-201
  title: "Porta PaymentProvider + adattatore Stripe (checkout, billing portal, parseWebhook con firma)"
  macrotask: "stripe-checkout-webhook"
  depends_on: [BIL-101, BIL-102]
  objective: >
    Definire l'interfaccia PaymentProvider e il suo adattatore Stripe, con la verifica della firma
    del webhook dentro l'adattatore (confine col provider). Il resto del sistema dipende dalla porta,
    mai dall'SDK Stripe; nei test la porta è un fake iniettato, così il checkpoint è verde senza
    chiavi reali.
  definition_of_done:
    - "Interfaccia PaymentProvider: createCheckout(accountId, plan) -> {url}, openBillingPortal(accountId) -> {url}, parseWebhook(payload, signature) -> SubscriptionEvent"
    - "Adattatore Stripe che implementa la porta; il segreto di firma è letto da env (mai hardcoded)"
    - "parseWebhook verifica la firma e ritorna un SubscriptionEvent normalizzato { type, account_id, plan, status, provider_ids, current_period_end }; firma non valida => errore, nessun evento"
    - "account_id nel SubscriptionEvent è recuperato dal metadata della sessione (impostato al checkout, BIL-203), non inferito: il webhook sa quale account attivare"
    - "Un fake PaymentProvider per i test (nessuna dipendenza di rete/chiave reale)"
  acceptance_criteria:
    - id: AC-201-1
      given: "un payload di webhook con firma VALIDA (segreto di test iniettato)"
      when: "si chiama parseWebhook(payload, signature)"
      then: "ritorna un SubscriptionEvent normalizzato coi campi attesi (type, account_id, plan, status)"
    - id: AC-201-2
      given: "un payload con firma NON valida"
      when: "si chiama parseWebhook(payload, signature)"
      then: "solleva/rifiuta senza produrre alcun SubscriptionEvent (anti-spoof)"
    - id: AC-201-3
      given: "un fake PaymentProvider iniettato"
      when: "si chiama createCheckout(accountId, 'pro')"
      then: "ritorna una url di checkout, senza alcuna chiamata di rete reale"
  target_tests:
    - file: "tests/payment-provider-stripe.test.ts"
      covers: [AC-201-1, AC-201-2, AC-201-3]
  security_notes:
    - "A08:2025 integrità — firma del webhook verificata nell'adattatore; firma non valida => nessun evento (no spoof dell'attivazione Pro)"
    - "Segreti — Stripe secret + signing secret letti da env (Vercel), MAI nel sorgente (gitleaks nel checkpoint)"
    - "BIL-D4 — il sistema dipende dalla porta, non dall'SDK; provider sostituibile senza toccare il gating"
  out_of_scope:
    - "Provider LATAM (Mercado Pago/Pix/EBANX) — nuovo adattatore Oltre P5"

- id: BIL-202
  title: "Endpoint webhook firmato + idempotente che aggiorna subscriptions"
  macrotask: "stripe-checkout-webhook"
  depends_on: [BIL-201, BIL-101]
  objective: >
    Esporre l'endpoint che riceve gli eventi del provider, ne verifica la firma via la porta, e
    aggiorna la riga subscriptions dell'account in modo idempotente (Stripe ri-invia lo stesso
    evento): dedup per event id, scrittura server-side, catch che logga, 2xx solo ad avvenuta
    registrazione.
  definition_of_done:
    - "POST /api/billing/webhook: legge il raw body, chiama parseWebhook (firma), poi upsert della subscription dell'account"
    - "Gestisce checkout.session.completed, customer.subscription.updated|deleted, invoice.payment_failed mappandoli su plan/status"
    - "Idempotenza: un event id già processato non riapplica l'effetto (dedup) e risponde 2xx"
    - "Firma non valida => 400 senza scrittura; errore interno => log + non-2xx (mai 2xx opaco a registrazione mancata)"
  acceptance_criteria:
    - id: AC-202-1
      given: "un evento checkout.session.completed valido per l'account A (plan pro)"
      when: "arriva a POST /api/billing/webhook"
      then: "la riga subscriptions di A passa a plan 'pro' status attivo e l'endpoint risponde 2xx"
    - id: AC-202-2
      given: "lo STESSO evento (stesso event id) consegnato una seconda volta"
      when: "arriva di nuovo al webhook"
      then: "lo stato non cambia una seconda volta (idempotente) e risponde comunque 2xx"
    - id: AC-202-3
      given: "un payload con firma non valida"
      when: "arriva al webhook"
      then: "risponde 400 e nessuna riga subscriptions viene scritta"
    - id: AC-202-4
      given: "un evento customer.subscription.deleted per l'account A"
      when: "arriva al webhook"
      then: "la subscription di A passa a status 'canceled'"
  target_tests:
    - file: "tests/billing-webhook-route.test.ts"
      covers: [AC-202-1, AC-202-2, AC-202-3, AC-202-4]
  security_notes:
    - "A08:2025 — firma verificata + idempotenza (dedup per event id): nessun replay né spoof dell'attivazione Pro"
    - "BIL-D2/R7 — la scrittura di subscriptions è server-side (service_role confinato al webhook, fuori dal percorso utente); il client non muove mai l'entitlement"
    - "Osservabilità — catch che LOGGA, mai un 502 opaco; 2xx solo ad avvenuta registrazione"
  out_of_scope:
    - "L'applicazione della retrocessione morbida sui siti (downgrade-lifecycle, modulo 05)"

- id: BIL-203
  title: "Endpoint checkout e billing portal con guardie identità/account"
  macrotask: "stripe-checkout-webhook"
  depends_on: [BIL-201]
  objective: >
    Esporre le due azioni che il client invoca per pagare e gestire: aprire un Checkout per passare a
    Pro e aprire il Billing Portal per cambiare carta/disdire. Entrambe passano dalle guardie
    same-origin + identità dell'account (l'utente agisce solo sul PROPRIO account), poi delegano alla
    porta; nessun dato di pagamento transita da noi.
  definition_of_done:
    - "Endpoint (route o server action) createCheckout: guardie (same-origin + utente autenticato + account proprio) -> PaymentProvider.createCheckout -> url"
    - "Endpoint openBillingPortal: stesse guardie -> PaymentProvider.openBillingPortal -> url"
    - "accountId derivato dall'identità server (mai fidato dal client come campo libero)"
    - "createCheckout incorpora accountId nel metadata della sessione, così parseWebhook (BIL-201) lo recupera e il webhook (BIL-202) attiva l'account giusto: chiude la catena checkout->webhook"
  acceptance_criteria:
    - id: AC-203-1
      given: "un utente autenticato che richiede l'upgrade del proprio account"
      when: "chiama l'endpoint createCheckout"
      then: "riceve una url di checkout (dalla porta) e nessun dato di pagamento passa dal nostro server"
    - id: AC-203-2
      given: "una richiesta non autenticata o cross-account (accountId altrui)"
      when: "chiama createCheckout o openBillingPortal"
      then: "è respinta (401/403/404) prima di chiamare la porta"
    - id: AC-203-3
      given: "un utente autenticato con un abbonamento gestibile"
      when: "chiama openBillingPortal"
      then: "riceve una url del Billing Portal (dalla porta)"
  target_tests:
    - file: "tests/billing-checkout-portal-route.test.ts"
      covers: [AC-203-1, AC-203-2, AC-203-3]
  security_notes:
    - "A01:2025 — guardie identità/proprietà account (route-guards/request-guard condivise); accountId dall'identità server, mai campo libero del client; cross-account respinto prima della porta"
    - "PCI — nessun dato di carta transita da noi: si delega a Checkout/Billing Portal Stripe (redirect)"
  out_of_scope:
    - "La pagina UI 'Passa a Pro' che invoca questi endpoint (billing-ui, modulo 04)"
```

## Self-check

- **Strutturale**: `validate_blueprint.mjs` sulla dir del blueprint — exit 0.
- **Confine checkpoint**: firma verificata provata con payload valido/invalido; idempotenza provata
  con doppia consegna; guardie provate col caso cross-account. Mutazione: saltare la verifica firma →
  AC-201-2/202-3 rossi; rimuovere il dedup → AC-202-2 rosso; leggere accountId dal body → AC-203-2
  rosso; segreto hardcoded → gitleaks rosso.

# 12-domain-downgrade — Macrotask `domain-downgrade`

> Chiude BIL-D7: in downgrade Pro→Free i domini si **sospendono in modo reversibile** (mai delete). La
> decisione **pura** (DOM-601) e l'applicazione **idempotente** nel webhook (DOM-602), gemella di
> `applySoftDowngrade` (Fase 1). Dipende da `domain-schema` e `domain-store`.

## Task atomici

```yaml
- id: DOM-601
  title: "applyDomainDowngrade(entitlement, domains) puro — attivi -> suspended quando il piano non ha custom_domain"
  macrotask: "domain-downgrade"
  depends_on: [DOM-101]
  objective: >
    Funzione pura che, dato l'entitlement risolto (riuso di resolveEntitlement, Fase 1) e i collegamenti
    dell'account, decide quali sospendere: custom_domain=false => tutti gli 'active' diventano
    'suspended'; true => nessuna azione. MAI una cancellazione (solo active->suspended reversibile).
    Nessun DB/rete. Gemella di applyDowngrade (BIL-501).
  definition_of_done:
    - "src/domain/domains/domain-downgrade.ts con applyDomainDowngrade(entitlement, domains) -> { domainsToSuspend: id[] } puro"
    - "custom_domain=false => domainsToSuspend = id dei domini 'active'; true => lista vuota"
    - "nessuna cancellazione proposta in nessun caso; nessun accesso a orologio/rete/DB"
  acceptance_criteria:
    - id: AC-601-1
      given: "un entitlement free (custom_domain=false) con due 'active' e uno 'error'"
      when: "si chiama applyDomainDowngrade"
      then: "domainsToSuspend contiene i due 'active' e NON il non-attivo"
    - id: AC-601-2
      given: "un entitlement pro (custom_domain=true) con domini 'active'"
      when: "si chiama applyDomainDowngrade"
      then: "domainsToSuspend è vuoto (nessuna sospensione mentre il piano include il dominio)"
    - id: AC-601-3
      given: "un qualsiasi input"
      when: "si ispeziona l'output"
      then: "non propone mai una cancellazione: solo transizioni active->suspended (reversibili)"
    - id: AC-601-4
      given: "lo stesso input"
      when: "si chiama applyDomainDowngrade due volte"
      then: "l'esito dipende SOLO dagli argomenti (pura, nessun orologio/DB interno)"
  target_tests:
    - file: "tests/domain-apply-downgrade.test.ts"
      covers: [AC-601-1, AC-601-2, AC-601-3, AC-601-4]
  security_notes:
    - "A01:2025 fail-safe — la decisione deriva dai limiti dell'entitlement risolto server-side (Fase 1), mai da un flag del client"
    - "Nessuna perdita dati (DOM-D8) — solo active->suspended reversibile; mai delete; determinismo (gemello BIL-501)"
  out_of_scope:
    - "L'applicazione sul DB e l'aggancio al webhook (DOM-602)"

- id: DOM-602
  title: "applySoftDomainDowngrade — applica la sospensione nel webhook, idempotente, mai delete"
  macrotask: "domain-downgrade"
  depends_on: [DOM-601, DOM-222]
  objective: >
    Applicare l'esito di applyDomainDowngrade nel percorso del webhook, subito dopo applySoftDowngrade
    (Fase 1): entitlement dall'evento (now al confine), lettura dei domini via store iniettabile
    (service_role confinato), transizione ad 'suspended' (writer). Idempotente (già sospesi => no-op);
    riattivando Pro i legami sono intatti. Sempre invocato => robusto ai retry di Stripe.
  definition_of_done:
    - "src/data/domain-downgrade.ts con applySoftDomainDowngrade(accountId, entitlement, store) che sospende i domini indicati"
    - "store DomainDowngradeStore iniettabile (gemello SiteDowngradeStore), default service_role confinato; suspend NON distruttivo (solo status='suspended')"
    - "idempotente: solo gli 'active' vengono toccati => seconda esecuzione no-op; i 'suspended' restano riattivabili"
    - "agganciato in src/app/api/billing/webhook/route.ts dopo applySoftDowngrade, con now al confine, sempre invocato"
  acceptance_criteria:
    - id: AC-602-1
      given: "un account che decade a free con due domini 'active'"
      when: "il webhook applica applySoftDomainDowngrade"
      then: "i due passano a 'suspended' e non sono più instradabili (persi dalla policy anon-active); nessuna riga cancellata"
    - id: AC-602-2
      given: "lo stesso downgrade applicato una seconda volta (retry Stripe)"
      when: "il webhook riesegue applySoftDomainDowngrade"
      then: "è un no-op (già 'suspended'); nessun errore, nessun effetto aggiuntivo"
    - id: AC-602-3
      given: "un account tornato a Pro dopo la sospensione"
      when: "si ispezionano i suoi domini sospesi"
      then: "righe e legami sono intatti e riattivabili/ri-verificabili (nessuna perdita dati)"
    - id: AC-602-4
      given: "un evento che risolve l'entitlement a pro (pagamento riuscito)"
      when: "si esegue applySoftDomainDowngrade"
      then: "nessun dominio viene sospeso (applyDomainDowngrade ritorna lista vuota)"
  target_tests:
    - file: "tests/domain-downgrade-apply.test.ts"
      covers: [AC-602-1, AC-602-2, AC-602-3, AC-602-4]
  security_notes:
    - "R7 — applicazione nel percorso del webhook già confinato (service_role fuori dal percorso utente); store iniettabile"
    - "A01:2025 integrità entitlement — la sospensione la muove SOLO il webhook firmato/idempotente (Fase 1), mai il client (gemello BIL-D2/D5)"
    - "Nessuna perdita dati (DOM-D8) — suspend reversibile (mai delete); robusto ai retry; riattivazione senza perdita"
  out_of_scope:
    - "La ri-verifica automatica al ritorno a Pro (l'utente/UI richiama /verify)"
```

## Self-check

- **Checkpoint**: dominio puro per valore; applicazione idempotente nel webhook (fake store); nessun
  delete. **Mutazione**: sospensione con `custom_domain=true` → AC-601-2 rosso; `delete` invece di
  `suspended` → AC-601-3/AC-602-3 rossi; filtro `active` rimosso → AC-602-2 rosso. Nessun gate visivo.

# 05-domain-port — Macrotask `domain-port`

> La **porta** `DomainProvider` (dominio puro, solo tipi) e il suo **fake** in-memory per i test. Due
> micro-task piccoli. L'adattatore reale Vercel è separato (`domain-vercel`), così il fake sblocca i
> test degli endpoint senza attendere l'integrazione reale.

## Task atomici

```yaml
- id: DOM-201
  title: "Porta DomainProvider (dominio puro: addDomain / removeDomain / getVerificationStatus)"
  macrotask: "domain-port"
  depends_on: []
  objective: >
    Definire l'interfaccia della porta come dominio PURO (solo tipi: nessun SDK/rete/segreto), con
    esiti normalizzati indipendenti dal provider, così il sistema dipende dalla forma e non da Vercel.
    Include i tipi neutri dell'esito di verifica e del target restituito da addDomain.
  definition_of_done:
    - "src/domain/domains/domain-port.ts con type DomainProvider { addDomain, removeDomain, getVerificationStatus }"
    - "addDomain(normalized) -> { providerDomainId, verification: VerificationRequirement[] }"
    - "getVerificationStatus(normalized) -> { state: 'verified'|'pending'|'misconfigured', detail? }; removeDomain(normalized) -> void"
    - "nessun import di SDK/HTTP/segreto nel file di dominio (come payment-port.ts)"
  acceptance_criteria:
    - id: AC-201-1
      given: "il file domain-port.ts"
      when: "si ispezionano i suoi import"
      then: "non importa alcun SDK/HTTP/segreto: solo tipi (dominio puro)"
    - id: AC-201-2
      given: "un oggetto che implementa i tre metodi con le firme normalizzate"
      when: "lo si tipizza contro DomainProvider"
      then: "il compilatore lo accetta"
    - id: AC-201-3
      given: "l'esito di getVerificationStatus"
      when: "se ne enumera lo stato"
      then: "è uno dei valori neutri 'verified' | 'pending' | 'misconfigured'"
  target_tests:
    - file: "tests/domain-port.test.ts"
      covers: [AC-201-1, AC-201-2, AC-201-3]
  security_notes:
    - "A01:2025 confine — la porta è dominio puro: i segreti vivono solo nell'adattatore (server-only), come payment-port vs stripe.ts"
  out_of_scope:
    - "L'adattatore reale Vercel (DOM-211); il fake (DOM-202)"

- id: DOM-202
  title: "createFakeDomainProvider() — implementazione in-memory della porta per i test"
  macrotask: "domain-port"
  depends_on: [DOM-201]
  objective: >
    Fornire un fake che implementa DomainProvider senza rete, con stato configurabile (host già
    verificato / pending / misconfigured, registro degli addDomain/removeDomain), per iniezione nei
    test di endpoint, UI e downgrade. È il pezzo che rende verde il checkpoint senza chiavi Vercel.
  definition_of_done:
    - "createFakeDomainProvider(seed?) che implementa la porta in-memory (nessun import di rete)"
    - "getVerificationStatus ritorna lo stato configurato per l'host; addDomain registra e ritorna verification[]; removeDomain rimuove"
    - "esposto per i test (tests/helpers o src) senza dipendenze reali"
  acceptance_criteria:
    - id: AC-202-1
      given: "un fake seminato con l'host 'iltuobar.it' come 'verified'"
      when: "un consumatore chiama getVerificationStatus('iltuobar.it')"
      then: "riceve state 'verified' senza alcuna chiamata di rete"
    - id: AC-202-2
      given: "un fake vuoto"
      when: "si chiama addDomain('iltuobar.it') e poi getVerificationStatus"
      then: "l'host risulta registrato con stato iniziale 'pending' e verification[] non vuoto"
    - id: AC-202-3
      given: "un host registrato nel fake"
      when: "si chiama removeDomain(host) e poi getVerificationStatus"
      then: "l'host non è più registrato (rimozione effettiva in-memory)"
  target_tests:
    - file: "tests/domain-fake-provider.test.ts"
      covers: [AC-202-1, AC-202-2, AC-202-3]
  security_notes:
    - "Determinismo dei test (DOM-D9) — il fake consente il verde del checkpoint senza chiavi Vercel reali; nessun segreto coinvolto"
  out_of_scope:
    - "La mappatura delle risposte Vercel reali (DOM-211)"
```

## Self-check

- **Checkpoint**: la porta è pura (nessun import SDK — auditabile); il fake non importa rete.
  **Mutazione**: import di SDK nella porta → AC-201-1 rosso; fake che colpisce la rete → AC-202-1 rosso.

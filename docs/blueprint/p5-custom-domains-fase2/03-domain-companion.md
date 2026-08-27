# 03-domain-companion — Macrotask `domain-companion`

> La parte **pura** dell'auto-www (rilievo R3): dato un hostname classificato, derivare il suo
> "companion" — collegare l'apex implica offrire anche il `www`. Nessun DB/rete: pura. La parte
> applicativa (creare i due collegamenti) vive nell'endpoint (macrotask `domain-connect`, DOM-303).

## Task atomici

```yaml
- id: DOM-121
  title: "companionHostname(normalized, kind) — apex => www.<apex>; subdomain => nessuno"
  macrotask: "domain-companion"
  depends_on: [DOM-112]
  objective: >
    Funzione pura che, dato un host normalizzato e la sua classe, ritorna l'eventuale hostname
    companion da collegare insieme: per un apex 'iltuobar.it' il companion è 'www.iltuobar.it'
    (kind subdomain); per un subdomain non c'è companion (evita catene sorprendenti). Deterministica.
  definition_of_done:
    - "companionHostname(normalized, kind) -> { hostname, kind:'subdomain' } | null puro"
    - "kind 'apex' => companion 'www.<apex>' con kind 'subdomain'"
    - "kind 'subdomain' => null (nessun companion; niente auto-apex)"
  acceptance_criteria:
    - id: AC-121-1
      given: "normalized 'iltuobar.it', kind 'apex'"
      when: "si chiama companionHostname"
      then: "ritorna { hostname:'www.iltuobar.it', kind:'subdomain' }"
    - id: AC-121-2
      given: "normalized 'www.iltuobar.it', kind 'subdomain'"
      when: "si chiama companionHostname"
      then: "ritorna null (nessun companion per un sottodominio)"
    - id: AC-121-3
      given: "lo stesso input"
      when: "si chiama companionHostname due volte"
      then: "produce lo stesso esito (pura, deterministica)"
  target_tests:
    - file: "tests/domain-companion.test.ts"
      covers: [AC-121-1, AC-121-2, AC-121-3]
  security_notes:
    - "Il companion passa comunque dalla validazione/classificazione (DOM-111/112) prima di essere collegato; nessun host non validato entra nel collegamento (l'endpoint DOM-303 lo impone)"
  out_of_scope:
    - "La creazione dei due collegamenti apex+www (DOM-303, endpoint connect)"
```

## Self-check

- **Checkpoint**: dominio puro testato per valore. **Mutazione**: companion restituito anche per un
  subdomain → AC-121-2 rosso.

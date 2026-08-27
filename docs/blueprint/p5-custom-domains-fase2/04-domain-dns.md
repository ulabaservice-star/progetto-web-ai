# 04-domain-dns — Macrotask `domain-dns`

> Il dominio **puro** che deriva i record DNS attesi da un host classificato + un target di
> piattaforma iniettato. Un solo micro-task. Nessun DB/rete: pura. (In BUILD i record del provider —
> `verification[]` di `addDomain`, DOM-211 — si comporranno con questi nell'endpoint connect, R1.)

## Task atomici

```yaml
- id: DOM-131
  title: "dnsInstructionsFor(normalized, kind, target, token) — A/ALIAS apex, CNAME subdomain, TXT verifica"
  macrotask: "domain-dns"
  depends_on: [DOM-112]
  objective: >
    Da un hostname normalizzato e classificato più un target di piattaforma iniettato (valore dei
    record verso Vercel, da env al call-site), derivare puramente l'elenco dei record che l'utente
    deve impostare: A/ALIAS all'apex, CNAME al sottodominio, più un TXT di verifica quando è fornito
    un token. target e token INIETTATI (nessun env/lettura interna). Output stabile e ordinato.
  definition_of_done:
    - "dnsInstructionsFor(normalized, kind, target, token?) -> lista di { type, name, value } pura e ordinata"
    - "kind 'apex' => record 'A' (o 'ALIAS' secondo target) con name '@'; kind 'subdomain' => 'CNAME' con name = etichetta"
    - "token fornito => include un record TXT di verifica ('_ulaba-verify') con value = token; token assente => nessun TXT"
  acceptance_criteria:
    - id: AC-131-1
      given: "normalized 'iltuobar.it', kind 'apex', target 'a.b.vercel-dns.com', token 't123'"
      when: "si chiama dnsInstructionsFor"
      then: "la lista contiene un record A/ALIAS name '@' verso il target e un TXT di verifica con value 't123'"
    - id: AC-131-2
      given: "normalized 'www.iltuobar.it', kind 'subdomain', target 'cname.vercel-dns.com', nessun token"
      when: "si chiama dnsInstructionsFor"
      then: "la lista contiene un CNAME name 'www' verso il target e NESSUN record TXT"
    - id: AC-131-3
      given: "gli stessi argomenti"
      when: "si chiama dnsInstructionsFor due volte"
      then: "produce la stessa lista, nello stesso ordine (pura e deterministica)"
  target_tests:
    - file: "tests/domain-dns-instructions.test.ts"
      covers: [AC-131-1, AC-131-2, AC-131-3]
  security_notes:
    - "A02:2025 configurazione — il target di piattaforma è iniettato da env al call-site (NEXT_PUBLIC_APEX_DOMAIN/target Vercel), mai hardcoded nel dominio puro né segreto"
  out_of_scope:
    - "La composizione con i record challenge del provider (endpoint connect, DOM-302, R1)"
    - "La resa visiva delle istruzioni (domain-ui)"
```

## Self-check

- **Checkpoint**: dominio puro testato per valore. **Mutazione**: TXT emesso anche senza token →
  AC-131-2 rosso; target letto da env dentro la funzione → non-purezza rilevata.

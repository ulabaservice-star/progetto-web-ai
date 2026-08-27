# 02-domain-hostname — Macrotask `domain-hostname`

> Il dominio **puro** che rende sicuro un hostname grezzo, in due micro-task: normalizzazione di
> **forma** (DOM-111) e **classificazione + reserved-domains** (DOM-112). Nessun DB/rete: pure sui
> loro argomenti. Base per endpoint, DNS e routing.

## Task atomici

```yaml
- id: DOM-111
  title: "normalizeHostname(raw) — forma canonica (case/schema/porta/path/punycode/FQDN)"
  macrotask: "domain-hostname"
  depends_on: []
  objective: >
    Funzione pura che porta un hostname grezzo a forma canonica o lo rifiuta per forma: lowercase +
    trim, rimozione schema http(s)://, punycode per gli IDN; rifiuto di porta/path/query/wildcard/
    spazi/underscore illegali e di non-FQDN. Nessun accesso a rete/DNS/orologio.
  definition_of_done:
    - "normalizeHostname(raw) -> { ok:true, normalized } | { ok:false, reason:'invalid_format' } puro"
    - "rimuove schema/case/trailing dot; converte IDN in punycode; rifiuta porta/path/query/wildcard/spazi"
    - "un input senza TLD valido o non-FQDN => ok:false 'invalid_format'"
  acceptance_criteria:
    - id: AC-111-1
      given: "l'input '  HTTPS://IlTuoBar.IT/menu '"
      when: "si chiama normalizeHostname"
      then: "ritorna ok:true con normalized 'iltuobar.it' (schema/path/case rimossi)"
    - id: AC-111-2
      given: "un input 'iltuobar' (no TLD), 'a b.it' (spazio) o 'iltuobar.it:8080' (porta)"
      when: "si chiama normalizeHostname"
      then: "ritorna ok:false con reason 'invalid_format'"
    - id: AC-111-3
      given: "un IDN 'caffè.it'"
      when: "si chiama normalizeHostname"
      then: "ritorna ok:true con normalized in punycode ('xn--caff-8oa.it')"
    - id: AC-111-4
      given: "lo stesso input"
      when: "si chiama normalizeHostname due volte"
      then: "l'esito dipende SOLO dall'argomento (pura, nessun accesso a rete/DNS/orologio)"
  target_tests:
    - file: "tests/domain-hostname-normalize.test.ts"
      covers: [AC-111-1, AC-111-2, AC-111-3, AC-111-4]
  security_notes:
    - "A05:2025 validazione al confine — hostname non fidato reso canonico server-side; l'output è sicuro per query esatte e per la resa (escaping a valle)"
  out_of_scope:
    - "Classificazione apex/subdomain e reserved-domains (DOM-112)"

- id: DOM-112
  title: "classifyHostname(normalized) — apex vs subdomain + rifiuto reserved-domains"
  macrotask: "domain-hostname"
  depends_on: [DOM-111]
  objective: >
    Da un hostname già normalizzato, classificarlo come 'apex' (dominio registrabile di 2° livello,
    etldp1) o 'subdomain', e respingere i reserved-domains (ulaba.net e sottodomini, *.vercel.app,
    localhost, non-FQDN) con reason 'reserved'. Pura, con la lista reserved iniettata/costante.
  definition_of_done:
    - "classifyHostname(normalized, reserved) -> { ok:true, kind:'apex'|'subdomain' } | { ok:false, reason:'reserved' } puro"
    - "kind 'apex' quando l'host è etldp1; 'subdomain' quando ha un'etichetta in più"
    - "reserved-domains (ulaba.net/*, *.vercel.app, localhost) => ok:false 'reserved'"
  acceptance_criteria:
    - id: AC-112-1
      given: "normalized 'iltuobar.it'"
      when: "si chiama classifyHostname"
      then: "ritorna ok:true kind 'apex'"
    - id: AC-112-2
      given: "normalized 'www.iltuobar.it'"
      when: "si chiama classifyHostname"
      then: "ritorna ok:true kind 'subdomain'"
    - id: AC-112-3
      given: "un dominio riservato 'ulaba.net', 'foo.ulaba.net' o 'x.vercel.app'"
      when: "si chiama classifyHostname"
      then: "ritorna ok:false con reason 'reserved'"
    - id: AC-112-4
      given: "lo stesso input"
      when: "si chiama classifyHostname due volte"
      then: "l'esito dipende SOLO dagli argomenti (pura)"
  target_tests:
    - file: "tests/domain-hostname-classify.test.ts"
      covers: [AC-112-1, AC-112-2, AC-112-3, AC-112-4]
  security_notes:
    - "A01:2025 anti-hijack (DOM-D7) — i reserved-domains (piattaforma + vercel.app + localhost) sono rifiutati nel dominio puro, prima di qualunque scrittura o chiamata al provider"
  out_of_scope:
    - "La prova che l'utente POSSIEDA il dominio (verifica DNS, macrotask domain-verify)"
```

## Self-check

- **Checkpoint**: dominio puro testato per valore. **Mutazione**: reserved non rifiutati → AC-112-3
  rosso; `Date.now`/DNS lookup dentro le funzioni → AC-111-4/AC-112-4 rossi.

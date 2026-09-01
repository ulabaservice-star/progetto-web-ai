# 14-seo-jsonld — Macrotask `seo-jsonld`

> Il **JSON-LD `Organization` + `WebSite`** sulla home della landing, emesso con **`serializeJsonLdSafe`
> RIUSATO** da `src/domain/generation/jsonld.ts` (anti-XSS: `<` `>` `&` U+2028/U+2029 → escape unicode),
> montato come **figlio testuale** di `<script type="application/ld+json">`, **mai** `innerHTML`/
> `dangerouslySetInnerHTML` grezzo (P6A-D8). I builder sono **puri** (la base URL arriva come argomento
> dalla home, che già la risolve); il nome brand da `getBrandName`.

## Task atomici

```yaml
- id: PUB-331
  title: "JSON-LD Organization + WebSite sulla home landing, serializeJsonLdSafe riusato, figlio testuale del <script>"
  macrotask: "seo-jsonld"
  depends_on: [PUB-141]
  objective: >
    Aggiungere alla home della landing (marketing-home, PUB-141) due blocchi JSON-LD — Organization e
    WebSite di schema.org — costruiti da funzioni PURE (base URL landing e nome brand come argomenti,
    nessun accesso a env nel builder), serializzati con serializeJsonLdSafe RIUSATO da
    src/domain/generation/jsonld.ts, e montati come FIGLIO TESTUALE di <script type="application/ld+json">
    (mai dangerouslySetInnerHTML). Nessuna concatenazione grezza nel <script>: la sequenza di chiusura
    del tag non è rappresentabile dopo l'escape (A05:2025 injection).
  definition_of_done:
    - "Builder puri (es. src/domain/marketing/organization-jsonld.ts): buildOrganizationJsonLd(baseUrl, name) e buildWebSiteJsonLd(baseUrl, name); nessuna lettura di env, base e nome sono argomenti"
    - "Organization ha '@context' 'https://schema.org', '@type' 'Organization', name (getBrandName, passato dalla home) e url = base landing"
    - "WebSite ha '@type' 'WebSite', name e url = base landing"
    - "la home monta due <script type=\"application/ld+json\"> con figlio TESTUALE = serializeJsonLdSafe(...) (riuso da @/domain/generation/jsonld)"
    - "nessun dangerouslySetInnerHTML e nessuna concatenazione grezza di stringhe dentro <script>"
  acceptance_criteria:
    - id: AC-331-1
      given: "la home landing renderizzata"
      when: "si raccolgono gli <script type=\"application/ld+json\"> e se ne fa il JSON.parse del contenuto"
      then: "ce ne sono almeno due, uno con '@type' === 'Organization' e uno con '@type' === 'WebSite'"
    - id: AC-331-2
      given: "una stringa JSON-LD contenente un valore ostile con la sottostringa '</script>'"
      when: "la si emette via serializeJsonLdSafe come figlio del <script>"
      then: "il testo dello <script> non contiene la sequenza grezza '</script' (il '<' è diventato l'escape unicode \\u003c)"
    - id: AC-331-3
      given: "il contenuto testuale di uno <script> JSON-LD della home"
      when: "si esegue JSON.parse"
      then: "il round-trip è valido e ricostruisce l'oggetto con il '@type' atteso (serializeJsonLdSafe trasparente al parser JSON)"
  target_tests:
    - file: "tests/jsonld-organization.test.ts"
      covers: [AC-331-1, AC-331-2, AC-331-3]
  security_notes:
    - "A05:2025 injection — serializeJsonLdSafe RIUSATO da jsonld.ts (nessuna serializzazione artigianale), montato come figlio testuale, mai innerHTML grezzo; '<' '>' '&' U+2028/U+2029 escapati (AC-331-2)"
    - "Round-trip trasparente al parser JSON (AC-331-3): l'escape non corrompe i dati strutturati, li rende solo inerti come markup"
  out_of_scope:
    - "Il JSON-LD Article dei post del blog (blog-post, PUB-431)"
    - "Il JSON-LD LocalBusiness delle rotte /s/<slug> (P4, immutato)"
    - "OG/Twitter/canonical (seo-metadata, PUB-321)"
```

## Self-check

- **Checkpoint**: `tests/jsonld-organization.test.ts` (jsdom) verde 3/3: rende la home, estrae gli
  `<script type="application/ld+json">`, verifica `@type` Organization/WebSite, l'assenza di `</script`
  grezzo e il round-trip `JSON.parse`. `serializeJsonLdSafe` reale (riuso), non ri-implementato.
- **Mutazione**: sostituire il figlio testuale con `dangerouslySetInnerHTML` senza escape → AC-331-2
  rosso; rimuovere il blocco WebSite → AC-331-1 rosso; bypassare `serializeJsonLdSafe` (JSON.stringify
  grezzo) su un valore con `</script>` → AC-331-2 rosso.

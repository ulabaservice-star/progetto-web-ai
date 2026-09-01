# 17-blog-content — Macrotask `blog-content`

> Il **loader** dei post `src/domain/blog/content.ts` sopra `content/blog/{it,es}/<slug>.md`:
> `listPosts(locale)` (ordinati per data decrescente), `getPost(locale, slug)`, schema **zod** del
> frontmatter (`title`, `description`, `date`, `translationKey`, `draft?`) e **accoppiamento delle
> traduzioni per `translationKey`** fra i due locali. La root del contenuto è **iniettabile** (default
> alla dir reale) così il test gira su fixture temporanea senza dipendere dal seed (che arriva dopo,
> PUB-451). Onestà hreflang: un post senza controparte → **nessun** accoppiamento (P6A-D9). Dipende
> dalla pipeline pura (PUB-401) per rendere l'HTML.

## Task atomici

```yaml
- id: PUB-411
  title: "Loader content/blog: listPosts/getPost, schema zod del frontmatter, accoppiamento traduzioni per translationKey"
  macrotask: "blog-content"
  depends_on: [PUB-401]
  objective: >
    Esporre src/domain/blog/content.ts che legge i post markdown da content/blog/{it,es}/<slug>.md
    (root iniettabile via opzione per i test): listPosts(locale) ritorna i post del locale ordinati
    per data decrescente (esclusi i draft), getPost(locale, slug) ritorna frontmatter + html (via
    renderMarkdown, PUB-401) o null, e resolvePostAlternates(locale, slug) accoppia le traduzioni fra
    i locali per translationKey. Il frontmatter e' validato con zod; uno slug malformato non raggiunge
    il filesystem (anti path-traversal).
  definition_of_done:
    - "Nuovo modulo src/domain/blog/content.ts che esporta listPosts, getPost, resolvePostAlternates e lo schema zod del frontmatter; root del contenuto iniettabile via opzione (default alla dir content/blog reale) per la testabilita' su fixture"
    - "Schema zod: title, description, date, translationKey stringhe non vuote; draft opzionale booleano; frontmatter non conforme -> errore che nomina il campo mancante/invalido"
    - "listPosts(locale) ritorna i post del locale (esclusi draft:true) ordinati per date DECRESCENTE"
    - "getPost(locale, slug) ritorna { slug, locale, frontmatter, html } con html da renderMarkdown, oppure null se il file non esiste"
    - "resolvePostAlternates(locale, slug) ritorna gli { locale, slug } dell'ALTRO locale che condividono translationKey; array VUOTO se nessuno (nessun alternate fittizio)"
    - "getPost valida lo slug contro [a-z0-9-]+ PRIMA di comporre il path: uno slug con .. o separatori ritorna null senza leggere fuori da content/blog"
  acceptance_criteria:
    - id: AC-411-1
      given: "una fixture con tre post it di date diverse piu' un post it con draft:true"
      when: "si chiama listPosts('it')"
      then: "gli slug tornano ordinati per date decrescente (il piu' recente primo) e lo slug del post draft:true NON compare"
    - id: AC-411-2
      given: "un post it esistente e uno slug inesistente"
      when: "si chiama getPost('it', slug)"
      then: "sul post esistente ritorna frontmatter.title del file e un html non vuoto reso da renderMarkdown; sullo slug inesistente ritorna null"
    - id: AC-411-3
      given: "un post it e un post es con lo stesso translationKey 'k1'"
      when: "si chiama resolvePostAlternates('it', slugIt)"
      then: "ritorna esattamente [{ locale: 'es', slug: slugEs }]"
    - id: AC-411-4
      given: "un post it con translationKey 'solo-it' senza controparte es"
      when: "si chiama resolvePostAlternates('it', slugIt)"
      then: "ritorna [] (insieme vuoto: nessun alternate fittizio)"
    - id: AC-411-5
      given: "uno slug ostile '../../secret'"
      when: "si chiama getPost('it', '../../secret')"
      then: "ritorna null e nessun accesso al filesystem avviene fuori da content/blog (slug respinto dalla validazione)"
  target_tests:
    - file: "tests/blog-content.test.ts"
      covers: [AC-411-1, AC-411-2, AC-411-3, AC-411-4, AC-411-5]
  security_notes:
    - "A01:2025 path traversal (CWE-22) — lo slug e' vincolato a [a-z0-9-]+ prima di comporre il path del file: nessun .. o separatore raggiunge fs.readFile (fail-closed a null)"
    - "A05:2025 injection — contenuto fidato (git review) ma comunque sanificato a valle da renderMarkdown (PUB-401); frontmatter validato con zod (fail-closed sul campo mancante)"
  out_of_scope:
    - "Le rotte di listing e post (PUB-421, PUB-431)"
    - "I post seed reali (PUB-451)"
```

## Self-check

- **Checkpoint**: suite (`blog-content.test.ts` 5/5) + igiene (nuovo file) + `sec_check` (nessuna
  lettura FS con path da input non validato). **Mutazione**: invertire l'ordinamento in `listPosts` →
  AC-411-1 rosso; togliere il filtro `draft` → AC-411-1 rosso; rimuovere la validazione dello slug →
  AC-411-5 rosso; far accoppiare `resolvePostAlternates` anche senza `translationKey` condiviso →
  AC-411-4 rosso.

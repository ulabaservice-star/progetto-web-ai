# 16-blog-pipeline — Macrotask `blog-pipeline`

> La **pipeline markdown pura** del blog in un solo modulo di dominio `src/domain/blog/markdown.ts`:
> `gray-matter` per il frontmatter + `unified` (remark-parse → remark-rehype → **rehype-sanitize** →
> rehype-stringify) per il corpo. `renderMarkdown(raw)` → `{ frontmatter, html }` **deterministica e
> SANIFICATA**. Nessun accesso a env/FS/rete: è il cuore oracolabile su cui poggiano loader (PUB-411),
> rotte (PUB-421/PUB-431) e seed (PUB-451). La sanificazione è di **libreria provata**, non artigianale,
> ed è difesa in profondità anche se il contenuto è fidato (git review) — P6A-D9. Nessuna dipendenza da
> altri macrotask.

## Task atomici

```yaml
- id: PUB-401
  title: "Pipeline markdown pura renderMarkdown: gray-matter + unified/rehype-sanitize, deterministica e sanificata"
  macrotask: "blog-pipeline"
  depends_on: []
  objective: >
    Esporre una funzione pura src/domain/blog/markdown.ts renderMarkdown(raw) che estrae il
    frontmatter con gray-matter e converte il corpo markdown in HTML con la catena unified
    remark-parse -> remark-rehype -> rehype-sanitize -> rehype-stringify. L'output {frontmatter, html}
    e' deterministico (stesso input -> stesso output) e l'HTML e' SANIFICATO da rehype-sanitize (tag e
    attributi pericolosi rimossi) anche se il contenuto e' fidato: difesa in profondita' (P6A-D9).
    Dominio PURO: nessun accesso a env, filesystem o rete.
  definition_of_done:
    - "Nuovo modulo src/domain/blog/markdown.ts che esporta renderMarkdown(raw: string): { frontmatter: Record<string, unknown>; html: string }"
    - "Frontmatter estratto con gray-matter (blocco di apertura ---); corpo convertito con unified: remark-parse -> remark-rehype -> rehype-sanitize -> rehype-stringify"
    - "Elaborazione SINCRONA (processSync) e deterministica: nessuna sorgente non-deterministica (data/random), nessun accesso a env/FS/rete"
    - "rehype-sanitize con schema di default: <script>, gestori inline on* e URL javascript: rimossi dall'HTML prodotto"
    - "Nuove dipendenze unified, remark-parse, remark-rehype, rehype-sanitize, rehype-stringify, gray-matter dichiarate in package.json (passano l'oracolo OSV C2)"
  acceptance_criteria:
    - id: AC-401-1
      given: "un markdown con frontmatter (title, date) seguito da un corpo con un titolo # e un paragrafo"
      when: "si chiama renderMarkdown(raw)"
      then: "frontmatter.title e' uguale al valore del frontmatter e html contiene un <h1> e un <p> col testo del corpo"
    - id: AC-401-2
      given: "un markdown il cui corpo contiene <script>alert(1)</script>"
      when: "si chiama renderMarkdown(raw)"
      then: "html NON contiene la sottostringa <script (il tag e' rimosso da rehype-sanitize)"
    - id: AC-401-3
      given: "un markdown il cui corpo contiene <img src=x onerror=\"alert(1)\"> e un <a onclick=\"x()\">"
      when: "si chiama renderMarkdown(raw)"
      then: "html NON contiene le sottostringhe onerror ne onclick (gli attributi-gestore sono rimossi)"
    - id: AC-401-4
      given: "lo stesso valore raw"
      when: "si chiama renderMarkdown(raw) due volte"
      then: "i due html restituiti sono stringhe identiche (determinismo)"
  target_tests:
    - file: "tests/blog-pipeline.test.ts"
      covers: [AC-401-1, AC-401-2, AC-401-3, AC-401-4]
  security_notes:
    - "A05:2025 injection — rehype-sanitize applicato anche se il contenuto e' fidato (git review): difesa in profondita' con schema di default, non sanificazione artigianale (P6A-D9)"
    - "Dominio puro — nessun eval, nessun dangerouslySetInnerHTML qui: l'HTML sanificato sara' reso solo a valle (PUB-431); nessun segreto ne env toccati (A07:2025)"
  out_of_scope:
    - "Il caricamento dei file e la validazione del frontmatter (PUB-411)"
    - "La resa dell'HTML nella pagina (PUB-431)"
```

## Self-check

- **Checkpoint**: `sec_check` (nessun sink XSS nel dominio) + suite (`blog-pipeline.test.ts` 4/4) +
  igiene (nuovo file clone-free) + OSV sulle nuove dep. **Mutazione**: rimuovere `rehype-sanitize`
  dalla catena → AC-401-2/AC-401-3 rossi (script/attributi-gestore sopravvivono); sostituire
  `processSync` con un passo non-deterministico → AC-401-4 rosso.

# 21-blog-seed — Macrotask `blog-seed`

> Uno–due **post seed reali** `content/blog/it/<slug>.md` + `content/blog/es/<slug>.md` con frontmatter
> valido e `translationKey` **condiviso** (ES **localizzato per paese**, non traduzione meccanica —
> P6A-D10). I seed passano lo schema del loader (PUB-411), si **accoppiano** it↔es via `translationKey`,
> e rendono via pipeline (PUB-401) senza che la sanificazione rimuova il contenuto legittimo. Sono il
> materiale su cui listing (PUB-421), post (PUB-431) e sitemap (PUB-441) mostrano contenuto reale al
> lancio.

## Task atomici

```yaml
- id: PUB-451
  title: "Post seed reali it+es con frontmatter valido e translationKey condiviso"
  macrotask: "blog-seed"
  depends_on: [PUB-411]
  objective: >
    Aggiungere almeno una coppia di post seed content/blog/it/<slug>.md + content/blog/es/<slug>.md
    con frontmatter valido secondo lo schema del loader (PUB-411), translationKey condiviso fra i due,
    e corpo ES localizzato per paese (non traduzione meccanica). I seed devono passare listPosts/getPost,
    accoppiarsi via resolvePostAlternates e rendere via renderMarkdown senza che la sanificazione
    rimuova il contenuto legittimo.
  definition_of_done:
    - "Almeno una coppia di file seed: content/blog/it/<slug>.md e content/blog/es/<slug>.md"
    - "Frontmatter di ciascuno valido secondo lo schema zod (PUB-411): title, description, date, translationKey condiviso fra it/es; nessun draft:true"
    - "Corpo ES localizzato per paese (tu/vos/ustedes) e distinto dall'IT, non una traduzione meccanica (P6A-D10)"
    - "I file compaiono in listPosts, sono leggibili con getPost e la coppia si accoppia via resolvePostAlternates"
  acceptance_criteria:
    - id: AC-451-1
      given: "i file seed it ed es"
      when: "si validano i loro frontmatter con lo schema zod del loader (PUB-411)"
      then: "ogni frontmatter e' valido (nessun errore zod) e nessuno ha draft:true"
    - id: AC-451-2
      given: "la coppia seed con translationKey condiviso"
      when: "si chiama resolvePostAlternates('it', slugSeedIt)"
      then: "ritorna [{ locale: 'es', slug: slugSeedEs }] (le due lingue si accoppiano)"
    - id: AC-451-3
      given: "il corpo di un post seed"
      when: "lo si rende con renderMarkdown (PUB-401)"
      then: "l'html contiene un frammento legittimo noto del post (es. un <h2> o un paragrafo del corpo): la sanificazione non rimuove il contenuto legittimo"
  target_tests:
    - file: "tests/blog-seed.test.ts"
      covers: [AC-451-1, AC-451-2, AC-451-3]
  security_notes:
    - "Contenuto fidato (git review) ma frontmatter validato via zod (PUB-411) e corpo comunque sanificato a valle (PUB-401): difesa in profondita' (P6A-D9)"
  out_of_scope:
    - "La logica del loader e dell'accoppiamento (PUB-411)"
    - "Le rotte e la sitemap che consumano i seed (PUB-421, PUB-431, PUB-441)"
```

## Self-check

- **Checkpoint**: suite (`blog-seed.test.ts` 3/3, che gira i seed reali attraverso il loader e la
  pipeline) + igiene (nuovi file di contenuto). **Mutazione**: cambiare un `translationKey` così che non
  coincida più fra it/es → AC-451-2 rosso; rimuovere un campo obbligatorio dal frontmatter di un seed →
  AC-451-1 rosso.

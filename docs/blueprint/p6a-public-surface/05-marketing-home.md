# 05-marketing-home — Macrotask `marketing-home`

> La home pubblica `src/app/[locale]/(marketing)/page.tsx` **strutturale**: blocchi hero, value-props e
> closing-CTA, copy dal namespace `landing` (PUB-121), dentro il chrome del group `(marketing)`
> (PUB-131). La hero nasce con uno **SLOT RISERVATO** per l'anteprima istantanea di P6b (P6A-D13:
> "nome attività → ecco il tuo sito"), placeholder vuoto che P6b riempirà senza rework. La pagina
> espone **due punti di montaggio** per il form waitlist (hero + closing-CTA a fondo pagina), che il
> macrotask `waitlist-form` (PUB-241) riempirà. Rende in IT ed ES. Output solo testo JSX; nessun dato,
> nessuna auth.

## Task atomici

```yaml
- id: PUB-141
  title: "Home marketing strutturale: hero con slot P6b riservato + 2 punti di montaggio waitlist, rende in it ed es"
  macrotask: "marketing-home"
  depends_on: [PUB-131]
  objective: >
    Creare src/app/[locale]/(marketing)/page.tsx come home STRUTTURALE con i blocchi hero, value-props e
    closing-CTA, copy risolto dal namespace 'landing'. La hero contiene uno slot riservato VUOTO per
    l'anteprima istantanea di P6b (marcato con data-testid) e il primo punto di montaggio waitlist; la
    closing-CTA a fondo pagina contiene il secondo punto di montaggio waitlist. Entrambi i punti di
    montaggio sono placeholder marcati che waitlist-form (PUB-241) riempirà. La pagina rende in it ed es.
    Le sezioni sono estratte in una composizione renderizzabile in jsdom (pattern DomainSection) così da
    essere testabili sui cataloghi REALI.
  definition_of_done:
    - "Creato src/app/[locale]/(marketing)/page.tsx come home strutturale con sezioni hero, value-props e closing-CTA, copy dal namespace 'landing'"
    - "La hero contiene uno slot riservato per l'anteprima P6b: elemento placeholder VUOTO marcato data-testid='hero-preview-slot' (nessun rendering di contenuto non fidato; riempito da P6b senza rework)"
    - "Due punti di montaggio waitlist marcati data-testid='waitlist-slot' (uno nella hero, uno nella closing-CTA a fondo pagina), placeholder che PUB-241 riempirà"
    - "La pagina rende il copy 'landing' in it ed es (nessuna stringa hard-coded fuori dal catalogo)"
    - "Il footer di sito resta nel layout marketing (PUB-131), non nella pagina; output solo testo JSX (nessun innerHTML)"
  acceptance_criteria:
    - id: AC-141-1
      given: "la home renderizzata dentro NextIntlClientProvider con i cataloghi REALI (locale 'it')"
      when: "si interroga il DOM per la regione hero"
      then: "la hero rende il testo landing.hero.headline ed espone un elemento data-testid='hero-preview-slot' VUOTO (senza nodi figli di contenuto)"
    - id: AC-141-2
      given: "la home renderizzata"
      when: "si esegue getAllByTestId('waitlist-slot')"
      then: "la lista ha lunghezza 2 (un punto di montaggio nella hero, uno nella closing-CTA)"
    - id: AC-141-3
      given: "la home renderizzata con i cataloghi es"
      when: "si legge il testo della hero headline"
      then: "è uguale a es.landing.hero.headline e diverso da it.landing.hero.headline (rende in es)"
  target_tests:
    - file: "tests/marketing-home.test.tsx"
      covers: [AC-141-1, AC-141-2, AC-141-3]
  security_notes:
    - "A05:2025 injection — output solo testo JSX (escaping React); lo slot P6b è un placeholder VUOTO, nessun innerHTML/dangerouslySetInnerHTML né rendering di input non fidato"
    - "Solo contenuto statico: nessun dato utente, nessuna auth, nessuna query"
  out_of_scope:
    - "La logica e gli stati del form waitlist (già-in-lista/errore/inerte-senza-env) (PUB-241)"
    - "L'anteprima istantanea reale che riempirà lo slot (P6b)"
    - "Metadata/canonical/OG/JSON-LD della home (seo-tech)"
    - "Il chrome header/footer di sito (PUB-131)"
```

## Self-check

- **Checkpoint**: la hero rende `hero.headline` + slot `hero-preview-slot` vuoto; esattamente 2
  `waitlist-slot`; la headline es differisce dalla it. **Mutazione**: rimuovere un `waitlist-slot` →
  AC-141-2 rosso (attesi 2, trovato 1); riempire lo slot P6b con un figlio → AC-141-1 rosso; usare una
  stringa hard-coded per la headline invece del catalogo → AC-141-3 rosso.

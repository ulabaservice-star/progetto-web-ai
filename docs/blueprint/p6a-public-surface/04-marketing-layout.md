# 04-marketing-layout — Macrotask `marketing-layout`

> Il **route group** `src/app/[locale]/(marketing)/layout.tsx` che avvolge le sole rotte pubbliche
> (home, blog, privacy) con il **chrome marketing** — header con nav landing (home/blog/privacy) e
> footer — risolti dal namespace `landing` (PUB-121). Il layout radice `[locale]/layout.tsx`
> (html/body + `NextIntlClientProvider` + `ThemeProvider`) resta intatto: il group `(marketing)` è un
> layout annidato che **non** avvolge le rotte app (`dashboard`/`login`/`onboarding`/…), che vivono
> fuori dal group (non-regressione, P6A-D4). Output solo testo JSX (escaping React), mai `innerHTML`.

## Task atomici

```yaml
- id: PUB-131
  title: "Route group (marketing) + chrome (header nav landing + footer) via namespace 'landing', senza avvolgere le rotte app"
  macrotask: "marketing-layout"
  depends_on: [PUB-121]
  objective: >
    Introdurre il route group src/app/[locale]/(marketing)/layout.tsx che compone il chrome marketing —
    header con nav landing (home/blog/privacy) e footer — leggendo il namespace 'landing' via next-intl.
    Header e footer sono estratti in componenti renderizzabili in jsdom (pattern DomainSection) così da
    essere testabili sui cataloghi REALI. Il group avvolge SOLO le rotte marketing; le rotte app restano
    fuori dal group e non vengono toccate (il layout radice [locale]/layout.tsx non cambia).
  definition_of_done:
    - "Creato src/app/[locale]/(marketing)/layout.tsx che avvolge le rotte del group con header + footer marketing"
    - "Chrome estratto in componenti consumabili in jsdom (es. src/ui/marketing/MarketingHeader.tsx, src/ui/marketing/MarketingFooter.tsx) che usano il namespace 'landing' via next-intl (useTranslations)"
    - "Header con nav landing: link home, blog, privacy con href per-locale (/{locale}, /{locale}/blog, /{locale}/privacy); footer con landing.footer.tagline + link privacy/blog"
    - "Il group (marketing) NON avvolge né linka rotte app (dashboard/login/onboarding/generate/preview/editor): quelle restano fuori dal group; [locale]/layout.tsx invariato"
    - "Nessun innerHTML/dangerouslySetInnerHTML; href verso rotte statiche costanti (nessun valore utente interpolato)"
  acceptance_criteria:
    - id: AC-131-1
      given: "il chrome marketing (header + footer) reso dentro NextIntlClientProvider con i cataloghi REALI (locale 'it')"
      when: "si interroga il DOM per i link di navigazione e il testo del footer"
      then: "esistono i link con label da landing.nav (home/blog/privacy) con href rispettivamente '/it', '/it/blog', '/it/privacy', e il footer rende il testo landing.footer.tagline"
    - id: AC-131-2
      given: "lo stesso chrome marketing reso"
      when: "si cerca nel DOM un link verso una rotta app (queryByRole('link', name /dashboard/i))"
      then: "il risultato è null: il chrome espone SOLO la nav landing, nessun link ad app (le rotte app non sono avvolte da questo layout)"
  target_tests:
    - file: "tests/marketing-layout.test.tsx"
      covers: [AC-131-1, AC-131-2]
  security_notes:
    - "A05:2025 injection — output solo testo JSX (escaping React), mai innerHTML/dangerouslySetInnerHTML"
    - "Anti open-redirect/XSS — href verso rotte statiche costanti per-locale, nessun valore utente interpolato nell'href"
  out_of_scope:
    - "La home strutturale e gli slot hero/waitlist (PUB-141)"
    - "Il montaggio del form waitlist (PUB-241)"
    - "Host-guard/redirect 308 e classificazione host (host-classify)"
    - "Metadata/canonical/JSON-LD (seo-tech)"
```

## Self-check

- **Checkpoint**: il chrome marketing rende i 3 link nav landing con href per-locale + footer.tagline,
  e non espone alcun link ad app (non-regressione). **Mutazione**: rimuovere il link `privacy`
  dall'header → AC-131-1 rosso; aggiungere un link `dashboard` al chrome marketing → AC-131-2 rosso.

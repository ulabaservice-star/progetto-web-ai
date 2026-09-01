# 03-marketing-i18n — Macrotask `marketing-i18n`

> Il namespace `landing` dei cataloghi i18n in **un** micro-task: il vocabolario pubblico della landing
> (hero, waitlist, nav, footer, value-props) aggiunto a `messages/it.json` **e** `messages/es.json`,
> dentro il routing `[locale]` esistente (`localePrefix: 'always'`, `locales ['it','es']`). ES
> **localizzato per paese** (tú/vos/ustedes), non traduzione meccanica (P6A-D10). Nessun dato, nessuna
> auth: solo contenuto. È la base testuale che `marketing-layout` (PUB-131) e `marketing-home`
> (PUB-141) consumano. Nessuna dipendenza esterna.

## Task atomici

```yaml
- id: PUB-121
  title: "Namespace i18n 'landing' in it.json + es.json (hero/waitlist/nav/footer/value-props), parità chiavi IT↔ES"
  macrotask: "marketing-i18n"
  depends_on: []
  objective: >
    Aggiungere ai due cataloghi esistenti (messages/it.json, messages/es.json) un unico namespace
    'landing' con il vocabolario della superficie pubblica: hero (headline/sub/cta), waitlist
    (label/placeholder/submit/stati incluso "già in lista"/errore/"non disponibile"/consenso), nav
    (home/blog/privacy) e footer. Il set di CHIAVI deve essere IDENTICO fra i due file (parità, nessuna
    chiave orfana), mentre i VALORI ES sono localizzati per paese (tú/vos/ustedes), non un calco dei
    valori IT. È solo copy pubblico: nessun segreto, nessun dato utente.
  definition_of_done:
    - "messages/it.json e messages/es.json contengono un namespace 'landing' con i sotto-oggetti nav (home, blog, privacy, waitlistCta), hero (headline, sub, cta), waitlist (emailLabel, emailPlaceholder, submit, submitting, consentLabel, successNew, successExisting, error, unavailable), valueProps (almeno titolo + 3 voci), footer (tagline, rights, privacy, blog)"
    - "Il set dei path-foglia del namespace 'landing' è IDENTICO fra it.json ed es.json (nessuna chiave presente in uno solo)"
    - "Ogni valore è una stringa non vuota; i valori ES sono localizzati per paese (tú/vos/ustedes), diversi dai corrispondenti IT su hero e waitlist"
    - "Entrambi i JSON restano validi (nessuna chiave duplicata); nessuna modifica ai namespace esistenti (common/nav/dashboard/onboarding/site/generate/preview/editor/billing/domains)"
  acceptance_criteria:
    - id: AC-121-1
      given: "messages/it.json e messages/es.json entrambi con il namespace 'landing'"
      when: "si raccoglie ricorsivamente l'insieme dei path-foglia di 'landing' in ciascun catalogo e si confrontano"
      then: "i due insiemi sono uguali (differenza simmetrica vuota: nessuna chiave orfana o mancante)"
    - id: AC-121-2
      given: "il namespace 'landing' in entrambi i cataloghi"
      when: "si risolvono i path richiesti hero.headline, hero.sub, hero.cta, waitlist.emailLabel, waitlist.submit, waitlist.consentLabel, waitlist.successExisting, waitlist.unavailable, nav.home, nav.blog, nav.privacy, footer.tagline"
      then: "ognuno risolve a una stringa non vuota sia in it.json sia in es.json"
    - id: AC-121-3
      given: "i valori 'landing' nei due cataloghi"
      when: "si confrontano i valori IT vs ES per hero.headline, hero.sub e waitlist.submit"
      then: "ciascuna coppia è diversa (ES localizzato, non identico all'IT)"
  target_tests:
    - file: "tests/marketing-i18n-parity.test.ts"
      covers: [AC-121-1, AC-121-2, AC-121-3]
  security_notes:
    - "A07:2025 secret via env — il catalogo contiene solo copy pubblico: nessun segreto, chiave o PII; le credenziali (Turnstile, ecc.) restano in env, mai nei messages"
    - "Solo contenuto: nessuna tabella/RLS/auth toccata da questo task"
  out_of_scope:
    - "Il chrome marketing che consuma queste chiavi (PUB-131)"
    - "La home strutturale e gli slot (PUB-141)"
    - "Le stringhe del blog/privacy e SEO (seo-tech, blog)"
```

## Self-check

- **Checkpoint**: parità chiavi it↔es (differenza simmetrica vuota), presenza dei path richiesti,
  divergenza dei valori IT/ES su hero+waitlist. **Mutazione**: rimuovere una foglia da `landing` in
  es.json → AC-121-1 rosso; rendere `es.landing.hero.headline` identico all'IT → AC-121-3 rosso;
  svuotare `waitlist.unavailable` → AC-121-2 rosso.

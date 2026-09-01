# 15-privacy-page — Macrotask `privacy-page`

> La pagina `/privacy` IT+ES sotto il route group `(marketing)`, destinazione del link di consenso del
> form waitlist (PUB-242). Contenuto legale minimo e onesto per la v1: titolare del trattamento,
> finalità (waitlist), base giuridica (consenso), dati raccolti (email + locale, **nessun IP**),
> conservazione su **Supabase EU** di proprietà, **niente double opt-in** in v1, diritti dell'interessato.
> Il copy vive in un namespace i18n `privacy` (IT+ES, parità di chiavi); output solo testo JSX.

## Task atomici

```yaml
- id: PUB-341
  title: "Pagina /privacy IT+ES (titolare, finalità waitlist, dati, diritti; no double opt-in v1) + namespace i18n 'privacy'"
  macrotask: "privacy-page"
  depends_on: [PUB-131]
  objective: >
    Creare src/app/[locale]/(marketing)/privacy/page.tsx che rende l'informativa privacy sotto il chrome
    marketing (PUB-131), con il copy in un nuovo namespace i18n 'privacy' aggiunto a messages/it.json e
    messages/es.json (parità di chiavi, ES localizzato). Le sezioni: titolare del trattamento, finalità
    (raccolta email per la waitlist di lancio), base giuridica (consenso), dati raccolti (email + locale,
    nessun IP in chiaro, P6A-D7), conservazione (su Supabase EU, dati di proprietà), assenza di double
    opt-in in v1, diritti dell'interessato (accesso/rettifica/cancellazione + contatto). E' la
    destinazione del link di consenso del form (PUB-242).
  definition_of_done:
    - "Nuova pagina src/app/[locale]/(marketing)/privacy/page.tsx resa sotto il layout marketing, per locale it ed es"
    - "Nuovo namespace 'privacy' in messages/it.json e messages/es.json con almeno le sezioni: controller (titolare), purpose (finalità waitlist), lawfulBasis (consenso), dataCollected (email+locale, no IP), retention (Supabase EU), noDoubleOptIn (v1), rights (diritti + contatto)"
    - "Il set dei path-foglia del namespace 'privacy' è IDENTICO fra it.json ed es.json (parità)"
    - "Ogni sezione è resa con un contenitore marcato (es. data-testid='privacy-<sezione>') per l'osservabilità; output solo testo JSX (nessun innerHTML)"
    - "La pagina non richiede autenticazione (superficie pubblica) e riusa i target di canonical/metadata marketing (seo-metadata) senza ridefinirli qui"
  acceptance_criteria:
    - id: AC-341-1
      given: "la pagina resa in locale 'it' con NextIntlClientProvider sui cataloghi reali"
      when: "si cercano i contenitori delle sezioni controller, purpose, rights"
      then: "tutti e tre esistono (data-testid='privacy-controller'/'privacy-purpose'/'privacy-rights') con testo non vuoto"
    - id: AC-341-2
      given: "la pagina resa in locale 'es'"
      when: "si cercano le stesse sezioni controller, purpose, rights"
      then: "tutte e tre esistono con testo non vuoto (contenuto localizzato ES presente)"
    - id: AC-341-3
      given: "il namespace 'privacy' nei due cataloghi it.json ed es.json"
      when: "si raccolgono ricorsivamente i path-foglia di 'privacy' in ciascuno e si confrontano"
      then: "i due insiemi sono uguali (nessuna chiave orfana o mancante fra IT ed ES)"
  target_tests:
    - file: "tests/privacy-page.test.tsx"
      covers: [AC-341-1, AC-341-2, AC-341-3]
  security_notes:
    - "P6A-D7 — l'informativa dichiara: nessun IP raccolto, nessun double opt-in in v1, consenso come base giuridica; coerente con la postura della waitlist"
    - "A05:2025 output — copy legale reso solo come testo JSX (escaping React), nessun innerHTML; nessun dato utente reale nella pagina (contenuto statico)"
    - "Nessuna tabella/RLS/auth toccata: pagina statica pubblica"
  out_of_scope:
    - "Il checkbox di consenso e il link che punta qui (PUB-242)"
    - "La registrazione della prova di consenso lato server (fuori scope v1)"
```

## Self-check

- **Checkpoint**: `hygiene` (pagina + chiavi i18n clone-free), `suite` + `AC`
  (`tests/privacy-page.test.tsx` jsdom + `NextIntlClientProvider` sui cataloghi REALI, render it ed es),
  gate visivo umano opzionale (pagina pubblica della demo).
- **Mutazione**: rimuovere il contenitore `privacy-rights` → AC-341-1 rosso; lasciare una chiave del
  namespace `privacy` solo in `it.json` → AC-341-3 rosso (insiemi diversi); non risolvere il copy ES
  (namespace mancante in `es.json`) → AC-341-2 rosso.

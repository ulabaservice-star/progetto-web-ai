# 04-section-inventory — Macrotask `section-inventory`

> Modulo del blueprint **design-engine-v1.1** di Belora/Ulaba. Un modulo = un macrotask
> (checkpoint al confine, commit atomico). Schema trueline (`L-COL-019`). Design a monte:
> `docs/superpowers/specs/2026-08-13-design-engine-v1.1-design.md` (§3.2, §7).

## Obiettivo del macrotask

L'**inventario completo ristorazione** (DS-D15: solo dopo che il nucleo hero+menu ha
convinto). Riscrive le sezioni rimanenti come componenti *progettati* che consumano gli assi
del corpo congelati (M2): `ChiSiamo` (2 varianti — feature-side + drop-cap | illustrazione
ruotata + feature-row), `Orari` (tabella settimana + card pasto sun/moon, giorno-corrente
evidenziato **dall'isola client** fuori dal documento congelato), `Contatti` (righe contatto +
mappa SVG di catalogo, fondale variabile marrone|verde, card-mappa ruotata opzionale); aggiunge
il **footer** + i restanti assi accessori (FAB WhatsApp, marquee dei piatti, elementi
orbitanti, drop-cap) e completa la **libreria SVG ristorazione** (estende il core set di
DE11-104). Così il corpo della pagina varia davvero, non è più testo impilato.

Ripartizione di altitudine (§1bis): i blocchi ricchi, il CSS e gli accessori vivono in
`src/ui/site`; l'estensione della libreria SVG resta dominio puro (`illustrations.ts`). Il
"giorno corrente" degli orari è un effetto CLIENT dell'isola `SiteMotion` (Date fuori dal
documento congelato → determinismo del Piano A preservato); marquee/nastri sono CSS puro
(nessuno `<script>` inline). Progressive-enhancement + `prefers-reduced-motion`. Renderer unico.

## Task atomici

```yaml
- id: DE11-401
  title: "ChiSiamo ricco: 2 varianti (feature-side + drop-cap | illustrazione ruotata + feature-row)"
  macrotask: "section-inventory"
  depends_on: [DE11-202, DE11-303]

  objective: >
    Riscrivere src/ui/site/blocks/ChiSiamo.tsx come componente progettato con 2 varianti guidate
    dal section_layout congelato: feature 2x2 a lato + drop-cap; illustrazione incorniciata
    ruotata + feature-row da 4. La radice del blocco porta il data-attribute della variante;
    colori solo var(--site-color-*); renderer unico; escaping React.

  definition_of_done:
    - "ChiSiamo.tsx riscritto: consuma il section_layout id congelato e rende la variante corrispondente (feature-side 2x2 + drop-cap; oppure illustrazione ruotata + feature-row da 4)"
    - "La radice del blocco porta data-* della variante chi-siamo; l'illustrazione (dove prevista) è un SVG di catalogo (<use>), non un <img> esterno"
    - "Nessun colore letterale (solo var(--site-color-*)); renderer unico invariato; escaping React"

  acceptance_criteria:
    - id: AC-DE11-401-1
      given: "un documento con la variante chi-siamo 'feature-side'"
      when: "ChiSiamo è reso"
      then: "il DOM porta il layout feature 2x2 a lato + un elemento drop-cap"
    - id: AC-DE11-401-2
      given: "un documento con la variante chi-siamo 'illustrazione-ruotata'"
      when: "ChiSiamo è reso"
      then: "il DOM porta l'illustrazione SVG incorniciata (ruotata) + una feature-row da 4"
    - id: AC-DE11-401-3
      given: "le due varianti chi-siamo"
      when: "rese"
      then: "la radice del blocco porta data-* di variante distinti (struttura diversa, non solo colore)"

  target_tests:
    - file: "tests/site-chisiamo-rich.test.ts"
      covers: [AC-DE11-401-1, AC-DE11-401-2, AC-DE11-401-3]

  security_notes:
    - "Testo da campi documento validati (parseDocument); escaping React; SVG statico di catalogo. Renderer unico SiteView"

- id: DE11-402
  title: "Orari ricco: tabella settimana + card pasto sun/moon; giorno-corrente evidenziato dall'isola (PE)"
  macrotask: "section-inventory"
  depends_on: [DE11-202, DE11-303]

  objective: >
    Riscrivere src/ui/site/blocks/Orari.tsx come tabella della settimana + card pasto (pranzo/
    cena, sun/moon) con tabular-nums sugli orari, in 2 varianti (settimana statica + pannello
    pranzo/cena; giorno corrente evidenziato + card sun/moon). Il giorno-corrente è un effetto
    CLIENT dell'isola SiteMotion (Date fuori dal documento congelato): additivo, progressive
    enhancement — il markup base rende la settimana INTERA senza JS.

  definition_of_done:
    - "Orari.tsx rende la tabella della settimana intera + card pasto (pranzo/cena, sun/moon), con tabular-nums sugli orari; contenuto completo senza JS"
    - "La variante 'giorno-corrente' evidenzia il giorno corrente via una classe applicata dall'isola client SiteMotion (Date lato client), non da un campo del documento congelato"
    - "Progressive enhancement: senza JS o con prefers-reduced-motion nessun giorno è nascosto e l'evidenziazione è puramente additiva (nessuno <script> inline)"

  acceptance_criteria:
    - id: AC-DE11-402-1
      given: "un documento orari reso senza JS"
      when: "reso"
      then: "la tabella della settimana intera è visibile con tabular-nums e le card pasto (pranzo/cena, sun/moon) — contenuto completo, nessun giorno nascosto"
    - id: AC-DE11-402-2
      given: "la variante 'giorno-corrente' con JS attivo"
      when: "l'isola SiteMotion monta"
      then: "evidenzia il giorno corrente via classe (effetto client, non nel documento congelato)"
    - id: AC-DE11-402-3
      given: "prefers-reduced-motion: reduce oppure JS disabilitato"
      when: "la sezione orari è resa"
      then: "il contenuto orari è intero e nessun giorno è nascosto (l'evidenziazione è additiva; nessuno <script> inline)"

  target_tests:
    - file: "tests/site-orari-rich.test.ts"
      covers: [AC-DE11-402-1]
    - file: "tests/site-motion-current-day.test.ts"
      covers: [AC-DE11-402-2, AC-DE11-402-3]

  security_notes:
    - "Il 'giorno corrente' (Date) vive nell'isola client, FUORI dal documento congelato: il determinismo del Piano A e il freeze restano intatti; nessuno <script> inline (JS bundlato); PE + reduced-motion"

- id: DE11-403
  title: "Contatti ricco: righe contatto + mappa SVG di catalogo; fondale marrone|verde; card-mappa ruotata opz."
  macrotask: "section-inventory"
  depends_on: [DE11-202, DE11-104, DE11-303]

  objective: >
    Riscrivere src/ui/site/blocks/Contatti.tsx con righe contatto + una mappa SVG di catalogo
    (illustrationFor + <use>), fondale variabile (marrone monocromo | verde bosco
    complementare, dall'asse fondale/tema) e card-mappa ruotata opzionale. I recapiti vengono
    dai campi documento (link WhatsApp/tel via contact-links esistente, nessun href da testo
    libero). Colori solo var(--site-color-*); renderer unico.

  definition_of_done:
    - "Contatti.tsx rende le righe contatto + la mappa SVG di catalogo (<use> al symbol mappa), non un <img>/embed esterno"
    - "Il fondale è variabile (marrone | verde) dall'asse/tema, applicato via var(--site-color-*) (nessun colore letterale); card-mappa ruotata opzionale coerente con l'id"
    - "I link (WhatsApp/tel/email) derivano dai campi documento via contact-links (nessun href da testo libero); renderer unico; escaping React"

  acceptance_criteria:
    - id: AC-DE11-403-1
      given: "un documento contatti reso"
      when: "reso"
      then: "le righe contatto sono presenti e la mappa SVG di catalogo (<use> al symbol) è resa"
    - id: AC-DE11-403-2
      given: "la variante fondale 'verde' vs 'marrone'"
      when: "rese"
      then: "la radice del blocco porta data-* del fondale distinti e il background viene da var(--site-color-*), non da colore letterale"
    - id: AC-DE11-403-3
      given: "la variante con card-mappa ruotata"
      when: "resa"
      then: "la card-mappa porta la classe/struttura ruotata (opzionale, coerente con l'id)"

  target_tests:
    - file: "tests/site-contatti-rich.test.ts"
      covers: [AC-DE11-403-1, AC-DE11-403-2, AC-DE11-403-3]

  security_notes:
    - "Recapiti da campi documento validati; link via contact-links (nessun src/href da testo libero, P2-D12); mappa SVG statica di catalogo (mai da input utente). Renderer unico"

- id: DE11-404
  title: "Footer + restanti assi accessori (FAB/marquee/orbitanti/drop-cap) + libreria SVG ristorazione completa"
  macrotask: "section-inventory"
  depends_on: [DE11-202, DE11-104, DE11-303]

  objective: >
    Rendere il footer e i restanti assi accessori (FAB WhatsApp, marquee dei piatti con CSS
    puro, elementi orbitanti, drop-cap) come voci di catalogo/asse 'accessori' additive e
    PE-safe; e completare la libreria SVG ristorazione in illustrations.ts (estende il core set
    di DE11-104: piatti, mattarello, mappa, icone complete), tutte tematizzabili via
    currentColor, id versionati, nessuna risorsa esterna. Marquee/nastri CSS puro (no <script>
    inline).

  definition_of_done:
    - "Footer reso + gli accessori (FAB WhatsApp, marquee dei piatti, elementi orbitanti, drop-cap) come asse 'accessori' additivo e progressive-enhancement (contenuto visibile senza JS)"
    - "Il marquee dei piatti è animato via CSS puro (nessuno <script> inline nel markup); il contenuto resta visibile senza JS"
    - "illustrations.ts esteso alla libreria ristorazione completa (piatti, mattarello, mappa, icone), id versionati nome@N, currentColor, lookup esatto proto-safe, nessuna risorsa esterna"

  acceptance_criteria:
    - id: AC-DE11-404-1
      given: "un documento con footer e un accessorio attivo (es. FAB WhatsApp)"
      when: "reso"
      then: "footer e accessorio sono presenti nel DOM"
    - id: AC-DE11-404-2
      given: "il marquee dei piatti"
      when: "reso"
      then: "è animato via CSS puro (nessuno <script> inline nel markup) e il contenuto è visibile senza JS"
    - id: AC-DE11-404-3
      given: "la libreria SVG ristorazione completa"
      when: "si enumerano le voci"
      then: "copre il set dichiarato (piatti, mattarello, mappa, icone), tutte con id nome@N e currentColor, nessuna risorsa esterna"
    - id: AC-DE11-404-4
      given: "un lookup proto-safe sulla libreria estesa"
      when: "si cerca 'constructor'/'__proto__' e un id-prefisso"
      then: "i lookup proto restituiscono 'nessuna voce' e l'id esatto non matcha il prefisso"

  target_tests:
    - file: "tests/site-footer-accessories.test.ts"
      covers: [AC-DE11-404-1, AC-DE11-404-2]
    - file: "tests/design-illustrations-restaurant.test.ts"
      covers: [AC-DE11-404-3, AC-DE11-404-4]

  security_notes:
    - "Marquee/nastri CSS puro (nessuno <script> inline: CSP di /s/ intatta); SVG statici di catalogo (mai da input utente, nessuna risorsa esterna); accessori additivi PE-safe (contenuto senza JS)"
```

## Self-check

- **Strutturale** (deterministico): `validate_blueprint.mjs` su questa dir di blueprint —
  atteso exit 0 / tutti i controlli OK (`11` §5.1).
- **Semantico** (checklist guidata): `self-check-checklist.md` punti 6–10 su ogni task; i
  rilievi vanno all'human-in-the-loop (`11` §5.2–§5.3).

# Gate visivo umano — superficie pubblica P6a

> Companion del runbook `cutover.md`. È il **gate visivo umano** rinviato durante il build: un giro guidato
> di TUTTA la superficie pubblica (landing + blog, IT ed ES) da fare **prima** di eseguire il cutover di
> dominio reale. Gli oracoli hanno già provato struttura, sicurezza e i18n (parità chiavi, escaping, hreflang,
> sanitizzazione); qui l'occhio umano giudica ciò che gli oracoli non vedono: **copy, tono, estetica,
> credibilità**. Nessun blocco di codice residuo: gli eventuali difetti trovati qui sono di copy/estetica
> (azione founder VISION §10 + eventuale ritocco componenti), non di logica.

## 0. Come vedere la superficie in locale

```
npm run dev          # Next dev → http://localhost:3000
```

In **locale** l'host-guard è **fail-safe**: `localhost` è sempre «piattaforma» e, **senza** `NEXT_PUBLIC_LANDING_URL`,
non c'è lo split di dominio → le rotte marketing rendono **direttamente** agli URL qui sotto (nessun redirect a
`app.`). Lo split reale (`ulaba.net` landing vs `app.ulaba.net` app) si osserva solo in produzione, ed è oggetto
del `cutover.md`, non di questo gate.

Fai il giro **due volte**, una per locale: prefisso `/it` e prefisso `/es`.

### Atteso in locale — NON sono bug

- **Form waitlist «non disponibile»**: senza `NEXT_PUBLIC_TURNSTILE_SITE_KEY` il widget Turnstile non si monta e
  la regione mostra il messaggio `unavailable`; il form resta inerte (nessun crash). L'invio end-to-end si prova
  solo dove le chiavi Turnstile + il canale sono configurati (staging/prod). È il comportamento «inerte
  dichiarato» voluto.
- **Immagine OG placeholder**: `og:image` punta a `/og-image.png` 1200×630 segnaposto. L'immagine definitiva è
  un'**azione founder** (VISION §10) — l'anteprima social mostrerà il placeholder finché non la carichi.
- **Slot anteprima nella hero invisibile**: c'è un `div` vuoto `data-testid="hero-preview-slot"` (aria-hidden)
  riservato a P6b. In P6a NON deve mostrare nulla: è corretto che sia invisibile.
- **Nessun contatore iscritti** (P6A-D11: spento in v1) e **nessuna analytics** in locale (Cloudflare Web
  Analytics cookieless si attiva in prod).

## 1. Home — `/it` e `/es`

Copy di riferimento (IT). Verifica che a schermo sia **questo** e che l'ES sia localizzato (non un calco):

- **Header** (chrome): brand «Ulaba» (link a home) · nav **Blog** · **Privacy**. In ES: Inicio/Blog/Privacidad.
- **Hero**:
  - headline IT «Il sito della tua attività, pronto in pochi minuti» — ES «La web de tu negocio, lista en unos minutos».
  - sub (2 righe) + CTA «Richiedi l'accesso anticipato» / «Pide acceso anticipado».
  - **Form waitlist #1** sotto la hero (vedi §2).
- **Value props**: titolo «Perché Ulaba» + **3** punti (AI / attività locali sul territorio / online in un attimo).
- **Closing-CTA** a fondo pagina: heading «Entra in lista» / «Unite a la lista» + **Form waitlist #2**.
- **Footer**: tagline + link Privacy + Blog.

Da giudicare con l'occhio: il tono è credibile e non «templato»? Le tre value-props parlano al micro-business
locale (ristoranti/palestre/saloni/negozi/artigiani)? L'ES suona naturale per il pubblico ispano/LATAM
(registro, «sumate/unite», non italiano tradotto)?

## 2. Form waitlist (nei due slot della home)

- La checkbox di **consenso NON è pre-spuntata**; il bottone d'invio è **disabilitato** finché non la spunti.
- Il link «Privacy» nell'etichetta di consenso porta a `/{locale}/privacy` (provalo).
- Etichetta consenso IT: «Acconsento a ricevere aggiornamenti sul lancio. Niente spam, ti disiscrivi con un clic.»
- Stati del form (visibili solo con canale attivo): `successNew` («Ci sei! …»), `successExisting` (già in lista),
  `error`. In locale, senza Turnstile, resta sul messaggio `unavailable` — atteso (§0).

## 3. Privacy — `/it/privacy` e `/es/privacy`

Sette sezioni (`data-testid="privacy-*"`). Verifica che il contenuto onesto v1 (P6A-D7) sia coerente:
consenso come **base giuridica**, dati raccolti = **email + locale** (NESSUN IP), conservazione su **Supabase EU**,
**niente double opt-in** in v1. È la destinazione del link di consenso del form. ES localizzato, non calco.

## 4. Blog — lista e post (IT + ES)

**Lista** `/it/blog` e `/es/blog`: le card mostrano titolo/descrizione/data + «leggi», ordinate per **data
decrescente** (il post del 2026-09-01 prima di quello del 2026-08-20), link al post. Nessuna card orfana.

**Post** (4 URL esatti — apri e leggi il corpo reso, titolo, data, e la resa Markdown→HTML):

| Coppia | IT | ES |
|---|---|---|
| local-web-vs-social | `/it/blog/perche-il-tuo-negozio-ha-bisogno-di-un-sito` | `/es/blog/por-que-tu-negocio-necesita-una-pagina-web` |
| build-site-with-ai | `/it/blog/crea-il-tuo-sito-con-ai-in-pochi-minuti` | `/es/blog/crea-tu-web-con-inteligencia-artificial` |

Da giudicare: il corpo è ben impaginato (titoli `##`, paragrafi, liste)? La versione **ES è localizzata per il
mercato LATAM** (esempi propri, rilievo a WhatsApp, registro naturale — P6A-D10), non una traduzione meccanica
dell'IT? I titoli reggono come pezzi reali e non «riempitivo»?

## 5. Controlli trasversali (entrambi i locali)

- **Responsive**: prova mobile (~375px) e desktop. Griglia value-props a 3 colonne su desktop, impilata su mobile;
  hero e card leggibili, niente overflow.
- **Parità IT↔ES**: stesse sezioni e stessi link in entrambi i locali; nessuna stringa rimasta in italiano su `/es`.
- **Nessuna perdita verso l'app**: dalla landing NON deve esserci alcun link a `app.*` (header/footer/hero
  puntano solo a home/blog/privacy della landing).
- **View-source (bonus SEO)**: su `/it` il `<link rel="canonical">` e gli `og:`/`twitter:` puntano alla **base
  landing** (mai all'Host locale); c'è l'hreflang IT↔ES; ci sono i due `<script application/ld+json>`
  (Organization + WebSite). Su un post: JSON-LD `Article`. `og:image` = placeholder (§0).
- **Machine-readable (bonus)**: `/sitemap.xml` elenca home/privacy/indice blog + una voce per ogni post dei due
  locali con hreflang tra traduzioni reali; `/robots.txt` sulla landing è indicizzabile e nomina la Sitemap.
- **Console del browser**: nessun errore rosso; nessuna richiesta a font/host esterni (i font sono self-host).

## 6. Esito

- **Tutto ok** → il gate visivo è superato; si può procedere col `cutover.md` (ordine P6A-D12).
- **Difetti di copy/estetica** → NON sono bug di logica: annotali. Il copy definitivo IT+ES e l'immagine OG sono
  **azioni founder** (VISION §10); ritocchi ai componenti (spaziature, gerarchia, micro-copy dai cataloghi
  `messages/{it,es}.json`) sono una sessione di polish mirata. Solo dopo, il cutover.

## 7. Primo giro (2026-09-06) — 3 rilievi trovati e RISOLTI

Giro headless (Chromium) su home/privacy/blog IT+ES, desktop+mobile. Sostanza superata (rendering,
parità IT↔ES, ES localizzato LATAM autentico, privacy onesta v1, blog list DESC, corpi sanificati,
responsive). Tre rilievi, tutti risolti al sorgente (commit `fix(p6a/public-surface)`):

1. **Header brand** mostrava "Home"/"Inicio" invece del brand → ora wordmark `getBrandName()`.
2. **`<title>` "Belora"** su `/blog` e `/privacy` (hardcode legacy in `[locale]/layout.tsx`) → ora
   `getBrandName()`.
3. **Corpo blog senza tipografia** (`##`/liste come paragrafi) → classe scoped `.blog-prose`.

**⚠️ Prerequisito prod (env founder):** header/title/JSON-LD leggono `getBrandName()`, che senza
`NEXT_PUBLIC_BRAND_NAME` ricade su `Belora`. Impostare **`NEXT_PUBLIC_BRAND_NAME=Ulaba` su Vercel**
(vedi `cutover.md` §azioni founder) o in produzione il brand mostrato sarà "Belora" mentre il copy dice
"Ulaba". Restano azioni founder: copy definitivo IT+ES e immagine OG 1200×630.

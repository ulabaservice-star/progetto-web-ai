# Database di design — Ristorazione (bar · ristoranti · caffè · trattorie)

> **Documento vivo.** È il "cervello di design" del motore per il settore ristorazione: un
> catalogo di design reali (da cui impariamo) distillato in **parametri riutilizzabili**
> ("manopole") che il motore **combina** per generare siti sempre diversi e sempre belli.
>
> **Invariante non negoziabile:** le manopole sono **nostre e curate**. Il motore le sceglie
> in modo deterministico (per settore + una variazione controllata/seed); **il modello LLM
> continua a scrivere SOLO il testo**, mai a scegliere struttura/colori/effetti. Così teniamo
> insieme *varietà*, *"impossibile che venga brutto"* e *anti-injection* (P2-D1).

---

## Come si legge e si aggiorna

- **Fonti:** i template ristorazione di Envato Elements — CSS del tema (`.../themes/<nome>/style.css`)
  + Google Fonts + osservazione dei Live Preview per gli effetti.
- **A lotti:** 10-15 template per volta. Ogni lotto → si riempie la Parte 1 e si aggiorna la
  Parte 2. Ci si ferma quando i nuovi template **smettono di aggiungere pattern nuovi**.
- **Cosa NON leggiamo:** le librerie stock linkate (bootstrap, owl/swiper, animate.css,
  font-icone, elementor-frontend) — sono note e non contengono parametri di questo settore.
- **Stato:** SCHELETRO. 4 schede compilate (1 dal CSS, 3 da osservazione). Parte 2 = valori iniziali.

---

## Parte 1 — Catalogo per template (osservazioni)

### Schema di una scheda
```
### T-NN <Nome> — <URL demo> · fonte: [CSS | visivo]
- mood/famiglia   : (in quale palette-famiglia e carattere ricade)
- palette (hex)   : bg · surface · text · text_muted · accent · accent_contrast · border
- tipografia      : display=<font>  ·  corpo=<font>   (+ dove sono caricati)
- scala titoli    : hero=<px>  section=<px>  body=<px>
- spazi           : padding sezione=<px>  ·  divisori/ritmo
- hero            : <tipo di hero>
- sezioni presenti: <elenco>
- effetti         : <reveal/carosello/lightbox/parallax/hover/sticky/counters/preloader>
- ornamenti       : <divisori/watermark/badge/icone>
- foto            : <full-bleed/incorniciata/png-cutout/collage/duotone>
- note            : <cosa la rende bella / cosa riusare>
```

### Schede

### T-01 Winta — shthemes.net/demosd/winta · fonte: **CSS** (`assets/css/style.css`)
- mood/famiglia   : **Scuro fine-dining / steakhouse-bar**, grintoso-premium
- palette (hex)   : bg `#101010` · light `#f8f4f3` · text `rgba(0,0,0,.8)` / su scuro `#fff` · accent **`#991b1f`** (bordeaux)
- tipografia      : display=**Pirata One** (blackletter, Google Font) · corpo=**Mukta** (Google Font) — caricati via `@import`
- scala titoli    : hero=**90px** · section=**60px** · banner=50px · h6=27px · body=15px  (Pirata One sempre weight 400)
- spazi           : padding sezione=**90px 0** · divisori linea 70px `#991b1f`
- hero            : scuro drammatico + **preloader** d'ingresso; collage con box "25 anni d'esperienza" (numero contorno)
- sezioni presenti: hero · about(collage+stat) · menu-list (icone categoria) · gallery · ...
- effetti         : reveal `opacity 0→1 + translateY` easing `cubic-bezier(.19,1,.22,1)` 0.8s, **a cascata** (h4 .2s / h1 .6s / p 1s) · hover img `scale(1.1)` · bottoni **riempimento a scorrimento** (`::before/::after width 0→100%` .4s) · transizioni `all .4s` · **preloader**
- ornamenti       : divisori-linea 70px accento · cerchi pseudo-elemento · overlay gallery `rgba(0,0,0,.4)`
- foto            : full-bleed scure (bistecca su brace) · collage sovrapposto · overlay scuro
- note            : bottoni **flat (radius 0)**, avatar/icone cerchio (50%). Ottimo esempio di **scala grande + spazio generoso + accento unico forte**.

### T-02 Ramyeon — demo2.eightheme.com/ramyeon · fonte: visivo
- mood/famiglia   : **Brillante-moderno / casual energico** (asiatico)
- palette (hex)   : bg chiaro `#fafafa` + hero scuro · accent **rosso** (~`#e8342b`) · testo scuro
- tipografia      : display=sans bold moderno · corpo=sans  (da confermare da CSS)
- scala titoli    : hero grande (~64px) · section centrato grande
- spazi           : generosi, card su griglia
- hero            : foto scura a tutta pagina + **card-piatto flottanti sovrapposte** (ritagli circolari) + **video lightbox** (play)
- sezioni presenti: hero · menu-card (foto+prezzo-badge) · about (collage sovrapposto + card scura + video) · snack (foto-prodotto ritagliate) · ...
- effetti         : **sticky nav** · video lightbox · card/immagini flottanti a livelli · badge flottanti prezzo · hover su card
- ornamenti       : etichetta rossa piccola + titolo grande centrato · badge prezzo circolari
- foto            : **png-cutout** (prodotto ritagliato che "galleggia") · foto tonde · full-bleed hero
- note            : png-cutout = richiede rimozione sfondo (→ P4-D7 AI). Pattern "etichetta+titolo centrato" molto usato.

### T-03 Grillino — wordpress.vecurosoft.com/grillino · fonte: visivo
- mood/famiglia   : **Caldo atmosferico / casual-premium** (grill)
- palette (hex)   : chiaro caldo + hero scuro · accent **arancio** · script arancio per accenti
- tipografia      : display=serif · **accenti in script/corsivo** · corpo=sans
- scala titoli    : section serif grande centrato
- spazi           : generosi
- hero            : **video di sfondo con scintille/braci animate** · **nav a "pillola" flottante** sopra la hero
- sezioni presenti: hero · services (carosello) · ...
- effetti         : **carosello auto-rotante** con frecce · **watermark line-art di cibo** negli angoli · divisori a fregio · **FAB torna-su** · reveal
- ornamenti       : **watermark decorativi** (burger/pizza outline) · fregi/flourish sotto i titoli
- foto            : incorniciate nelle card · video-hero (asset)
- note            : video-hero = serve asset (rimandato). La nav a pillola flottante è una firma forte.

### T-04 Bouchérie — themes.vamtam.com/boucherie · fonte: visivo
- mood/famiglia   : **Caldo editoriale / elegante** (bistrot/steakhouse fine)
- palette (hex)   : bg crema (~`#fdf6ec`) · text quasi-nero · accent **terracotta** (~`#c0492b`)
- tipografia      : display=**serif** (tipo Fraunces/Playfair) · corpo=sans
- scala titoli    : hero serif grande · titoloni "Where every flavor tells a story"
- spazi           : molto ariosi, editoriali
- hero            : centrato elegante · **grandi foto di cibo** protagoniste · CTA "Reservation"
- sezioni presenti: hero · our story · menu · reservation form · ...
- effetti         : nav centrata sticky · hover · (da confermare)
- ornamenti       : minimal, raffinati
- foto            : **grandi foto di cibo** full-bleed, centrali
- note            : riferimento-guida per la famiglia "caldo editoriale". Le foto sono il cuore.

### T-05 Qichen — theme=qichen · fonte: **CSS inline**
- mood/famiglia   : **Scuro elegante/caldo** (ristorante classico)
- palette (hex)   : bg scuro `#0e1317` · text `#fff`/`#7a7a7a` · **accent `#df3f00`** (arancio-rosso) · nero
- tipografia      : display=**Forum** (serif/roman caps) · corpo=**Open Sans** (+ Roboto/Roboto Slab)
- effetti/foto    : (visivo) foto cibo, layout classico, sezioni menu
- note            : accento arancio-rosso forte su fondo scuro; Forum = tono "insegna classica".

### T-06 Intro — hello-elementor · fonte: **live (computed styles)** + CSS
- mood/famiglia   : **Editoriale elegante, chiaro + oro**
- palette (hex)   : bg **#ffffff** · text **#363636** · **accent #bf9261** (bronzo/oro) · nero
- tipografia      : display=**Cormorant** (serif) · corpo=**Jost** (sans geometrico)
- scala           : **H1 112px** (hero enorme, testo bianco su foto scura)
- note            : bianco + accento bronzo/oro. Hero 112px = **scala estrema** (come Djaen 110). Conferma il pattern "accento oro/bronzo caldo".

### T-07 Luwe — hello-elementor · fonte: CSS
- mood/famiglia   : **Classico chiaro/familiare** (chef, prenotazione)
- tipografia      : font locali/Elementor (no Google Fonts nel sorgente) — da approfondire
- palette         : esterno · visivo: chiaro + accento arancio, foto chef/famiglia
- note            : layout "reservation form" + "why choose us" + foto persone.

### T-08 Ticrou — theme=ticrou · fonte: CSS
- mood/famiglia   : **Tradizionale caldo**
- tipografia      : display=**Libre Baskerville** (serif) · **accento=Rouge Script** (script) · corpo=**DM Sans**/**Poppins**
- palette         : esterno · visivo: crema/oro caldo
- note            : tripletta **serif + script + sans** = ricchezza tipografica (3 ruoli).

### T-09 Dinenos — Elementor · fonte: CSS + **palette live**
- mood/famiglia   : **Raffinato moderno**
- tipografia      : display=**Arapey** (serif elegante) · corpo=**Plus Jakarta Sans** (sans moderno)
- palette (hex)   : fondo **#ffffff** · titoli **#111111** (quasi-nero) · corpo **#777777** (grigio) · **accent arancio caldo #dd5903** + ambra **#ffa200** (secondario)
- note            : Arapey+Plus Jakarta = elegante-contemporaneo, pulito. Palette = **bianco + arancio bruciato**: gerarchia solo su titolo-nero / corpo-grigio, l'arancio è l'unico colore (CTA/dettagli). Conferma la famiglia "chiaro elegante con accento caldo".

### T-10 Coliv — hello-elementor · fonte: **CSS kit** (post-4) + 4 pagine
- mood/famiglia   : **Giocoso/casual, giallo**
- palette (hex)   : text/scuro **#413232** (bruno) · **accent #FFCC00** (giallo) · bianco/nero
- tipografia      : display=**Arima Madurai** (decorativo) · **accento=Pacifico** (script) · corpo=**Roboto**
- scala           : hero ~**70px** · sezioni 50/35/30px
- note            : le 4 pagine (home/about/menu/gallery) = utili per le **varianti di sezione**. (Il display è Arima Madurai, non Roboto Slab: corretto dal CSS.)

### T-11 Foodio — theme=foodio · fonte: **CSS inline**
- mood/famiglia   : **Brillante fast-food**
- palette (hex)   : **accent `#f3274c`** (pink-red) + **`#ffd40d`** (giallo) · scuro `#32373c`/nero · bianco
- tipografia      : display=**Fredoka One** (rounded bold) · corpo=**Epilogue** (+ Roboto)
- note            : rounded playful + doppio accento acceso = firma fast-food.

### T-12 Yummye — theme=yummye · fonte: **CSS inline**
- mood/famiglia   : **Elegante caldo** (wine/restaurant)
- palette (hex)   : **accent `#c5a47e`** (oro/tan) · scuro `#232323` · bianco
- tipografia      : display=**Cormorant Garamond** (serif) · corpo=sans
- note            : oro su scuro = elegante-premium, sobrio.

### T-13 Djaen — hello-elementor · fonte: **CSS kit** (post-8)
- mood/famiglia   : **Scuro elegante + oro** (fine-dining drammatico)
- palette (hex)   : bg **#04070C / #080D16** (quasi-nero) · **accent/primary #DCA26B** (oro) · **#E5CFBD** (crema) · #757575
- tipografia      : display=**Playfair Display** · corpo=**Source Sans Pro**
- scala           : **H1 110px** (tablet 72 / mobile 35) · H2 45 · H4 28 · H5 22 — hero MOLTO grande
- note            : oro su quasi-nero + Playfair grande = esempio di **scala estrema** e contrasto elegante.

### T-14 Domnoo — theme=domnoo · fonte: **CSS inline**
- mood/famiglia   : **Caldo classico + oro** (con accento script)
- palette (hex)   : **oro/ambra #f5c328 / #d8a200 / #ce9721** · scuro #212121 · (verde #5fbd74 secondario)
- tipografia      : **accento=Arizonia** (script) · corpo=**Roboto** (+ Source Sans Pro)
- scala           : titoli ~40px+
- note            : oro caldo + script Arizonia = insegna classica/festiva.

### T-15 Bresto — hello-elementor · fonte: **CSS kit (post-5) + palette live**
- mood/famiglia   : **Moderno vivace** (restaurant & cafe) — indaco freddo + caldo su bianco/crema
- palette (hex)   : fondo **#ffffff** + superfici crema **#fff6ea / #ffeedb** · corpo **#333333** · titoli **#121212** · muted **#7a7a7a** · **primary indaco #292277** (titoli hero) · **CTA rosso #f82b35** + **arancio #fb7d2c** (secondario)
- tipografia      : display=**Playfair Display** (serif, weight 600) · corpo=**Poppins** (+ Roboto/Roboto Slab secondari)
- scala           : hero **100px** (Playfair) — **scala estrema** · corpo Poppins
- note            : combo distintiva **indaco freddo sui titoli + rosso/arancio caldo sulle CTA + superfici crema** = nuova famiglia palette (contrasto caldo-freddo, non solo mono-accento). Bottone pieno rosso, testo bianco.

### T-16 Merida — theme=merida (NON Elementor) · fonte: **palette live + CSS inline**
- mood/famiglia   : **Elegante caldo con foto** (restaurant, hero full-bleed) — chiaro + accento arancio
- palette (hex)   : fondo **#ffffff** + superfici crema **#f4efe3** / grigio **#f6f6f6** · corpo **#74787c** · titoli **#1a1a1a** / **#2c2c2c** · **accent arancio #fe6a13**
- tipografia      : display=**Cormorant Garamond** (serif, weight 700) · corpo=**Jost** (+ **Hanken Grotesk** variabile)
- scala           : hero **70px** (Cormorant, bianco su foto) · corpo Jost
- note            : hero **full-bleed foto + overlay**, titolo bianco 700; bottone hero **invertito** (bianco su testo scuro). Famiglia "chiaro elegante" declinata su **arancio** (`#fe6a13`) con superfici crema. Tema classico (AOS probabile) → effetti dedicati (vedi 2.4).

### Riferimenti dal vivo — siti REALI del settore (IT), non template
> Fonte: articolo SiteGround "migliori siti web" (`it.siteground.com/blog/migliori-siti-web`, 13 siti). Diversi sono **micro-business italiani food/vino = il nostro target esatto** → valgono più dei template Envato per capire cosa è "bello davvero" da noi. Palette+font+motion estratti dal vivo (computed styles + fingerprint librerie). Sono siti d'agenzia (stack moderno GSAP/Swiper, non Elementor) → mostrano il **traguardo di qualità**, non un template da clonare.

- **R-02 · Chef Max Mariola** (`maxmariola.com`, chef) — bianco `#ffffff` / near-nero `#111111`, **accent cremisi `#d42344`**. Tipografia **premium editoriale**: hero **Tiempos Fine** (serif) 70px w400 + corpo **function_pro** (sans custom). Motion: **GSAP + Swiper** (reveal scroll custom, caroselli). Pulito, sicuro, foto energiche. = famiglia "chiaro elegante" con **accento rosso acceso**.
- **R-03 · Chianina e Syrah** (`chianinaesyrah.com`, steakhouse+vino) — bianco / grigio `#494949`, **accent bordeaux-vino `#ac354c`** (richiamo al Syrah), foto **B&N**. **Source Sans Pro** ovunque, hero 60px w700 bianco su **video hero**. Motion: Swiper + video. Essenziale, poche info in home. = "scuro-su-foto" leggero con **accento vino**.
- **R-04 · Cantina Montenellago** (`montenellago.it`, cantina) — bianco / grigio `#333333`, **hero calligrafico ESTREMO**: font **Italianno** (script) a **150px** in **verde-acqua tenue `#87cbc3`** + rosa `#cc3366` secondario. Motion: Swiper + **animazioni a dissolvenza** (67 keyframe). = "naturale/poetico" con **accento cool** (primo teal del settore, rompe il monopolio caldo).
- *Bloccati dall'estensione (permesso dominio):* **BBANG** (`bbang.it`, panificio — animazioni audaci, colori vivaci), **Oleissimo** (`oleissimo.com`, olio — elegante, palette delicata), **Duca Pipe** (`ducapipe.com`, http). Da riprendere se servono (l'utente li apre / navigazione manuale).

**Cosa ci portiamo via (nuovo per il DB):**
- **Accenti nuovi**: **cremisi `#d42344`** e **bordeaux-vino `#ac354c`** (rinforzano la famiglia rossa) + **teal naturale `#87cbc3`** (PRIMO accento *freddo/naturale* del settore → varietà, ottimo per pesce/vegetariano/cantina).
- **Tipografia**: **serif editoriale premium** (Tiempos) e **script calligrafico gigante** (Italianno 150px) come opzioni-hero → confermano e SPINGONO la scala estrema oltre i 112px.
- **Motion reale IT**: lo stack vero di questi siti è **GSAP + Swiper (+ video hero)**, non Elementor/WOW — **più vicino al nostro** (JS moderno). Ricetta ricorrente: bianco + 1 accento + **foto/video ad alta risoluzione** + display serif/script + reveal-on-scroll. La **foto/video di qualità è il vero motore visivo** (più della decorazione).

### (in arrivo — prossimi lotti)
<!-- Boucherie.txt = landing store VamTam (non il demo) → Bouchérie resta T-04 dal visivo. -->
<!-- sito 13.txt = duplicato di Bresto (T-15), altra pagina → utile solo per varianti di sezione. -->

---

## Parte 2 — Parametri distillati (le "manopole" del motore)

> Valori iniziali dalle 4 schede sopra. Crescono a ogni lotto. Sono i value-set che il motore
> combina; diventeranno l'evoluzione tipizzata di `themes.ts` / `recipes.ts` + nuove dimensioni.

### 2.1 Palette-famiglia (7 token: bg · surface · text · text_muted · accent · accent_contrast · border) — **hex REALI**
1. **Caldo-crema** — crema/panna + terracotta/oro. Es. Bouchérie (crema+terracotta ~`#c0492b`) · Ticrou (crema/oro). Elegante, accogliente.
2. **Scuro + accento caldo (fine-dining)** — quasi-nero + oro/bordeaux/arancio. Es. Winta (`#101010`+bordeaux `#991b1f`) · Qichen (`#0e1317`+arancio-rosso `#df3f00`) · Yummye (`#232323`+oro `#c5a47e`). Grintoso-premium.
3. **Brillante casual / fast-food** — chiaro + accento acceso (spesso doppio). Es. Foodio (pink-red `#f3274c` + giallo `#ffd40d`) · Ramyeon (rosso). Energico, commerciale.
4. **Chiaro elegante / minimal** — bianco + UN solo accento caldo, gerarchia su titolo-scuro/corpo-grigio, tanta aria. Due tinte d'accento: **bronzo/oro** (Intro `#bf9261` su `#ffffff`, testo `#363636`) o **arancio bruciato** (Dinenos `#dd5903`+`#ffa200` su `#ffffff`, titoli `#111111`/corpo `#777777`).
5. **Giocoso** — chiaro + accento vivace (giallo/verde). Es. Coliv (giallo).
6. **Contrasto caldo-freddo** — bianco + superfici crema, titoli in tinta **fredda** (indaco/navy) e CTA in tinta **calda** (rosso/arancio). Es. Bresto (titoli indaco `#292277` · CTA rosso `#f82b35` + arancio `#fb7d2c` · superfici `#fff6ea`/`#ffeedb`). Moderno, dinamico: sfrutta il contrasto di temperatura invece del mono-accento.
7. **Naturale / cool** *(da riferimenti reali IT)* — bianco + accento **freddo/naturale** (teal, verde, salvia) invece del solito caldo. Es. Cantina Montenellago (**teal `#87cbc3`** + rosa `#cc3366`). **Rompe il monopolio caldo** del settore → ideale per pesce, vegetariano, cantina, healthy. Accenti rossi "premium" osservati dal vivo: **cremisi `#d42344`** (Chef Mariola), **bordeaux-vino `#ac354c`** (Chianina e Syrah).
> Nota: ogni famiglia dichiara se è *base chiara* o *scura* (decide overlay/hero). Gli hex "esterni"
> (temi hello-elementor) si completano leggendo i `post-*.css` quando servirà precisione.

### 2.2 Coppie tipografiche (display + corpo) + scala — **font REALI raccolti**
- **serif editoriale + sans** (la più comune nel settore):
  Cormorant + Jost (Intro) · Arapey + Plus Jakarta Sans (Dinenos) · Cormorant Garamond + sans (Yummye) ·
  Forum + Open Sans (Qichen) · Libre Baskerville + DM Sans (Ticrou) · Fraunces + sans (Bouchérie) ·
  **Playfair Display + Source Sans Pro** (Djaen)
- **script (accento) + serif/slab/sans**:  Rouge Script (Ticrou) · Pacifico (Coliv) · **Arizonia** (Domnoo) · Cormorant-italic (mock)
- **decorativo/display + sans**:  Pirata One-blackletter (Winta) · **Arima Madurai** (Coliv) · Cinzel/Cinzel Decorative (mock)
- **rounded playful + sans**:  Fredoka One + Epilogue (Foodio)
- **slab** (spesso secondario): Roboto Slab (Coliv, Qichen)
- **bold sans moderno**:  Ramyeon
- **scala** (grande, è il fix chiave): hero **56-112px** (Winta 90 · Djaen 110 · Intro 112 = **scala estrema** nei minimal-eleganti) · section **38-60px** (Winta 60) · body 15-18px · label 12-14px maiuscolo
- **⚠ i font vanno CARICATI** (Google Fonts per tema): oggi NON lo sono → il difetto n.1. Quasi tutti i temi
  del settore usano Google Fonts (facile da replicare); pochi (Luwe, Djaen) usano font locali/Elementor.

### 2.3 Layout di HERO (nuova dimensione)
- A) full-bleed foto + overlay + testo (sinistra o centro)
- B) split testo / foto affiancati
- C) centrato elegante (+ eventuale form prenotazione)
- D) scuro drammatico, un piatto protagonista
- E) foto + **card-piatto flottanti sovrapposte**
- F) **video-bg** *(rimandato: serve asset per cliente)*

### 2.4 Varianti di SEZIONE (stessa sezione, più layout)
- **menu**: lista con leader-dots+prezzo · griglia-card con foto+badge-prezzo · tab per categoria
- **about**: split testo+foto · collage con **stat-box** ("dal 19xx", "N anni")
- **gallery**: masonry · carosello · lightbox
- **offerte**: badge/banner promozionale
- **chef/team** · **recensioni** · **orari** · **contatti+mappa** · **numeri** · **CTA banner** full-width
> (Oggi i blocchi sono 8: hero, chi-siamo, offerte, orari, faq, contatti, cta-whatsapp, recensioni.
> Qui si vede quali AGGIUNGERE — gallery, chef, numeri, mappa — e quante VARIANTI-layout dare a ciascuno.)

### 2.5 EFFETTI — vocabolario reale (mappato da 13 template)
> Estratto file-per-file dai dump (grep su `@keyframes`/`elementor-animation-*`/`data-settings _animation`/`data-animation`/`transition`/`:hover`). **Attenzione al metodo:** i tempi d'**entrata** e gli **hover a solo colore** sono spesso INLINE = **misurati (✓)**; i valori numerici di scale/translate/shadow degli hover-movimento vivono quasi sempre nei `.min.css` **esterni** non catturati → li segno **~ (dedotti dal nome-classe / valore canonico della libreria)**. Il nostro motore NON userà WOW/owl/Elementor: reimplementeremo questi effetti con **CSS + IntersectionObserver + JS minimo**.

**Le 6 manopole-effetto (i value-set riusabili):**
- **E1 · Reveal-on-scroll** *(UNIVERSALE — l'effetto n.1, presente in ~tutti tranne gli statici-per-scelta)*: fade + slide direzionale all'entrata in viewport. Vocabolario: **`fadeInUp` dominante**, poi `fadeIn` / `fadeInLeft` / `fadeInRight` / `fadeInDown`. **Durata ✓ 0.8–1.5s** (misurate: 1s e 1.2s Dinenos, 1.5s Ticrou, 600ms layer Slider-Rev). **Stagger ✓ step 150–300ms** (200 Qichen/Djaen, 250 Intro, .4/.6/.8s Yummye). Easing ~ ease-out / `power3.out` (expo). Stato iniziale nascosto finché in-view.
- **E2 · Cascata d'entrata dell'hero** *(premium)*: reveal sequenziale dei sotto-elementi hero (occhiello→titolo→sottotitolo→CTA). Misurato: **Merida .6s→1.2s→1.7s→2s**; **Domnoo** (Slider Revolution) coreografia layer con `power3.out`, `sp:600/1500ms`, start staggerati 350→2460ms, trasformazioni iniziali **scale 2 + rotate 90°** e **flip-3D `rX/rY:-20deg`**.
- **E3 · Hover bottone** *(scegli UNO stile per tema)*: **(a) color-swap verso l'accento** — il più comune e ✓misurato: Qichen→`#DF3F00`, Yummye→`#c5a47e`, Domnoo `#f5c328→#ce9721`, Djaen→`#e2498a`; `transition ✓ 0.3s`. **(b) sliding-fill** (pseudo-elemento/`<span>` che scorre): Winta, Dinenos (`fx-slide`), Yummye (wrapper `<span>`). **(c) micro-transform** Elementor: `grow` ~scale 1.1 (Djaen), `shrink` ~scale .9 (Intro), `sink` ~translateY 8px (Intro).
- **E4 · Hover immagine/card**: **image-zoom** ~`scale 1.05–1.12` (Yummye `hover-zoomin`, Winta); **bordo-card → accento** (Domnoo `#f5c328`); **reveal CTA nascosta** al passaggio (Domnoo, Yummye); overlay-fade (canonico).
- **E5 · Hover link/nav**: **colore → accento** ✓ `0.3s` (Yummye/Qichen `#c5a47e`/`#DF3F00`); underline/overline-pointer (Luwe HFE `grow`+`overline`).
- **E6 · Movimento decorativo** *(opzionale, dà il "premium")*: **carosello autoplay** ~universale (3–5s, fade/slide; Owl/Slick/Slider-Rev/Elementor); **Ken Burns hero** (Coliv-menu: zoom-out ✓5s + fade ✓500ms); **parallax scroll** sobrio, desktop-only (Intro `translateY` speed 3; Foodio); **PNG ornamentali flottanti** (Yummye `.animations-01/02`, Merida cibo-PNG che entrano); **preloader letter-by-letter** (Ticrou); **reveal split lettera-per-lettera** (Foodio `wow letter`, Ticrou hero-word); **shape-divider** (Intro `split`, Bresto `drops` — statici).
- **Baseline transition ✓ `0.3s ease`** su tutto l'interattivo; i reveal 0.8–1.5s.

**Mappa per-template (cosa usa ciascuno — ✓=misurato inline, ~=dedotto):**

| Template | E1 entrance | E3 hover bottone | E4 hover img/card | E6 decorativo |
|---|---|---|---|---|
| Winta | reveal opacity+translateY a cascata | sliding-fill | ~scale 1.1 | — |
| Qichen | Elementor `ova-move-*`+headShake, ✓stagger 200/400 | color→`#DF3F00` ✓0.3s | — | testimonial carousel ✓3000ms |
| Intro | fadeIn ✓250/500/750, fadeInDown ✓1000 | `shrink` ~scale .9 | `shrink`+`sink` ~translateY 8px | parallax scroll (speed3, desktop) + shape-divider `split` |
| Luwe | nessuna | — | — | carousel autoplay fade ✓5000ms; menu HFE `grow` |
| Ticrou | WOW `fadeInUp` ✓1500ms, delay ✓0–300 | theme-btn (esterno) | — | **preloader letter-by-letter**; hero owl; hero animated-word |
| Dinenos | WOW `fadeInUp` ✓1s/1.2s, ✓delay .3s (stagger .15/.5/.8) | `fx-slide` sliding-fill | — | slick slider |
| Coliv | home nessuna · menu **Ken Burns** ✓5s/fade500 | Elementor default | — | Ken Burns hero (zoom-out) |
| Foodio | Elementor `fadeIn*` ✓delay 100/200/300 + WOW `skewIn` + `wow letter` | color→`#f3274c` (esterno) | — | **Slider Revolution** hero; parallax Elementor |
| Yummye | WOW `fadeIn*` ✓delay .4/.6/.8s | color→`#c5a47e` + `<span>` fill | **`hover-zoomin`** zoom | PNG flottanti; slick caroselli |
| Djaen | Elementor `fadeInUp*` ✓delay 200/400/600 (21 nodi) | `grow` ~scale 1.1 ✓0.3s | — | scroll-to-top; minimal |
| Domnoo | **Slider-Rev** hero: `power3.out`, ✓600/1500ms, scale2+rot90/flip-3D | color `#f5c328→#ce9721` | bordo-card→`#f5c328`+reveal CTA | Owl caroselli autoplay |
| Bresto | **nessuna** (`animation:none`) — STATICO | (esterno) | — | shape-divider `drops` + PNG assoluti (statici) |
| Merida | **cascata hero** ✓.6/1.2/1.7/2s + PNG cibo `fadeInUp/Right` | theme-btns (esterno) | img brightness 75% ✓.4s (yt); Topper Pack (esterno) | slick hero; floating food-PNG |

**Livelli di movimento (per il motore — combinazioni pronte, àncorate ai dati):**
- **L0 · statico** — nessun moto. *Reale:* Bresto, Coliv-home (scelta deliberata: layout+colore fanno il lavoro).
- **L1 · vivo (default consigliato)** — E1 reveal `fadeInUp` staggerato + E3 hover-bottone + E5 hover-link + E4 image-zoom + sticky nav. *Reale:* Qichen, Djaen, Yummye baseline.
- **L2 · ricco** — L1 + E2 cascata-hero + E6 carosello autoplay + parallax sobrio. *Reale:* Intro, Dinenos, Merida.
- **L3 · premium** — L2 + Ken Burns hero, preloader, reveal split-lettera, coreografia layer stile Slider-Rev, lightbox. *Reale:* Foodio, Domnoo, Ticrou.
> Realizzati con **CSS moderno + IntersectionObserver + JS minimo** (NON owl/jQuery/Elementor/WOW: stack pesante, non adatto a noi — ne prendiamo il *vocabolario*, non le librerie).

### 2.6 Pacchetti ORNAMENTO
- divisori: linea 70px accento · fregio/flourish centrale
- **watermark** line-art di cibo negli angoli
- **badge**: prezzo circolare · "dal 19xx" · premi/stelle
- set di **icone** categoria (per il menu)

### 2.7 Trattamenti FOTO
- full-bleed · incorniciata/arrotondata · **png-cutout** *(serve rimozione sfondo → P4-D7 AI)* · collage sovrapposto · duotone/overlay scuro

### 2.8 NARRATIVA con lo scroll (scrollytelling) — *cross-settore, da promuovere a doc motion condiviso*
> Riferimento **R-01: Apple iPhone 17** (`apple.com/it`, `sito 15.txt`, 650KB). NON è ristorazione: è il *gold standard* della narrazione guidata dallo scroll. Estratto per la dimensione **motion/narrativa**, non per palette. **Scoperta chiave: Apple usa DUE livelli, e quello base è identico al nostro** (E1/E2). Il livello alto (video-scrub) è aspirazionale per noi.

**Come è fatta (meccanica reale estratta):**
- **Architettura a "beat"**: la pagina è una **pila di sezioni-storia** (`section-product-story`, `data-anim-scroll-group="Cameras"`, deep-linkabili). 49 occorrenze del cluster scrollytelling = tutto il corpo è narrazione.
- **Pin + scrub** *(il primitivo dello scrollytelling)*: `sticky-height-container` → `content-sticky-container` → `viewport-content`. La sezione è **alta** (traccia di scroll lunga), il contenuto interno è **`position:sticky`** (bloccato in viewport) e **anima man mano che scorri** attraverso l'altezza della sezione.
- **Keyframe ancorati in `vh`** *(grammatica elegante, risoluzione-indipendente)*: il "quando" è espresso rispetto ai bordi di un elemento-àncora che attraversa il viewport ± vh. Es. reveal semplice `data-anim-keyframe='{"start":"t - 70vh","cssClass":"animate"}'` (aggiunge la classe `.animate` quando il top è a 70vh dal trigger); es. scrub `{"start":"a0t - 50vh","end":"a0b - 100vh - css(--animation-padding)","progress":[0,1.0],"easeFunction":"bezier(0.22,0.01,0.82,0.64)"}` (`a0t/a0b`=top/bottom dell'àncora 0). **Ease misurato: `cubic-bezier(0.22,0.01,0.82,0.64)`.**
- **Video-scrub** *(l'effetto "wow", COSTOSO)*: `.video-scrub-container[data-component-list="VideoScrub"]` con `<video playsinline muted>` il cui **`currentTime` è mappato sul progresso di scroll** (`data-video-progress-kf` progress [0→1]). Ha `.startframe-container` (poster statico prima del load) + `<noscript>` con `<picture>` statica → **degrada a immagine ferma**. Richiede **asset video bespoke per beat** (render-farm: fuori portata per un bar).
- **Reveal economico + stagger** *(= il NOSTRO E1/E2)*: per l'index Apple usa `StaggeredFadeIn` + `data-staggered-item` → fade dei figli scaglionato, via semplice toggle di classe CSS. Stesso identico approccio nostro.
- **Progressive enhancement OBBLIGATORIA**: ogni media animato ha (1) sorgente vuota base64, (2) `data-lazy`/`data-download-area-keyframe` = caricamento a finestra-scroll, (3) `<noscript>` con `<picture>` small/large 2x, (4) `disabledWhen` per degradare. **8 hit `prefers-reduced-motion`** → tutta la narrativa si spegne se l'utente riduce il moto.

**Cosa è TRASFERIBILE a noi (micro-business) — e cosa no:**
- ✅ **Sticky pin + reveal** (CSS `position:sticky` + IntersectionObserver / scroll-progress): sezione "storia/chi-siamo" che si **blocca** mentre rivela statistiche/testo accanto a una foto-piatto ferma. **Costo ~zero, nessun video bespoke.**
- ✅ **Keyframe in `vh` ancorati** all'elemento (adottiamo la grammatica: "rivela quando il top è a Xvh"): niente pixel magici, responsive gratis.
- ✅ **Progressive enhancement + `prefers-reduced-motion`**: per noi è **obbligatorio** (SEO, accessibilità, mobile lento) — sempre un fallback statico.
- ✅ **Scroll-media economico**: invece del video-scrub bespoke, la foto-hero che fa **parallax/scale leggero** su scroll, o un **loop-video di un piatto** in autoplay-on-view.
- ❌ **Video-scrub / image-sequence bespoke**: richiede produzione asset che un bar non ha → **NON default**. Semmai upsell premium con asset forniti (P?-futuro).

**Nuovo livello di movimento → L4 (aggiunta alla scala 2.5):**
- **L4 · narrativo** — L3 + **sticky pin-and-reveal** su 1-2 sezioni-storia (chi-siamo, "come nasce il piatto"), keyframe ancorati in vh, parallax-hero leggero. *Riferimento:* Apple (versione low-cost, senza video-scrub). Da usare con parsimonia: 1 beat ben fatto > 5 mediocri.

---

## Parte 3 — Aggancio al motore (come queste manopole diventano codice)

| Manopola | Dove vive oggi | Evoluzione |
|---|---|---|
| Palette-famiglia | `themes.ts` `colors` | più temi + **caricamento font** (Google Fonts) |
| Coppia tipografica + scala | `themes.ts` `typography` | più coppie + scala **più grande** + font caricati |
| Layout HERO | — (assente) | **nuova** dimensione: variante hero per ricetta/seed |
| Varianti SEZIONE | `recipes.ts` (solo ordine) | ordine **+ layout-variant** per sezione |
| Effetti / motion | — (assente) | **nuova**: livello effetti + classi CSS |
| Ornamenti | — (assente) | **nuova**: pacchetto ornamento per famiglia |
| Trattamento foto | parziale (SiteImage) | **nuova**: treatment per hero/sezione |
| Narrativa scroll (L4) | — (assente) | **nuova**: sticky pin+reveal, keyframe in vh, reduced-motion (low-cost, no video-scrub) |
| **Pelle CSS** | — (**ASSENTE**) | **da scrivere**: `src/ui/site` CSS che usa i token → il fix visivo n.1 |

**Selezione & varietà:** il motore sceglie per settore (ristorazione → famiglie/ricette pertinenti)
+ una **variazione controllata (seed)** che diversifica i 5 mockup su **layout hero + varianti sezione +
tipografia**, non solo sul colore. È così che le 5 proposte smettono di essere "1 layout in 5 colori".

---

## Log dei lotti
- **Lotto 0 (2026-08-12):** scheletro + 4 schede (Winta da CSS; Ramyeon/Grillino/Bouchérie da visivo) + Parte 2 iniziale.
- **Lotto 1 (2026-08-12):** 9 nuove schede (T-05…T-13) dai file `siti css/*.txt` dell'utente —
  Qichen, Intro, Luwe, Ticrou, Dinenos, Coliv, Foodio, Yummye, Djaen. **Font reali** raccolti per tutti
  (grande arricchimento di 2.2); **palette hex** dai 3 con CSS inline (Qichen/Foodio/Yummye) + Winta;
  gli altri (hello-elementor) hanno i token in `post-*.css` esterno → completabili quando serve precisione.
  Boucherie.txt scartato (è la landing store, non il demo).
  **Da approfondire (opzionale):** palette/scala esatte dei temi Elementor (Intro/Luwe/Dinenos/Coliv/Djaen)
  via fetch dei loro `post-*.css`; font locali di Luwe/Djaen.
- **Lotto 2 (2026-08-12):** approfondimento CSS esterni. **PRECISI ora:** Coliv (post-4: `#413232`+`#FFCC00`,
  **Arima Madurai**+Pacifico+Roboto, hero ~70px) · Djaen (post-8 kit: `#04070C`+oro `#DCA26B`+crema `#E5CFBD`,
  **Playfair Display**+Source Sans Pro, **H1 110px**). **+ T-14 Domnoo** (script Arizonia + Roboto, oro `#f5c328`).
  **Restano da esterno:** Intro (fonts Cormorant+Jost noti; palette in kit non raggiunto) · Luwe (server rifiuta
  https; font locali) · Dinenos (URL relativi; fonts Arapey+Plus Jakarta noti). Per questi la palette esatta si
  prende, se serve, navigando le demo dal vivo (computed styles).
- **Lotto 3 (2026-08-12):** palette dal vivo (browser, computed styles). **Intro PRECISO** (bg `#ffffff`,
  text `#363636`, accent bronzo/oro `#bf9261`, Cormorant **112px** + Jost). **Dinenos PRECISO** (bg `#ffffff`,
  titoli `#111111`, corpo `#777777`, **accent arancio caldo `#dd5903`** + ambra `#ffa200`; Arapey+Plus Jakarta).
  **Luwe:** navigazione ancora BLOCCATA — il demo è su `http://alfb.rudhisasmito.com` e l'estensione non naviga
  quel dominio (la sessione MCP gira su un gruppo separato dai tab aperti a mano); palette rimandata (scheda
  solo-font, priorità bassa). **Pattern confermato/ampliato:** hero a **scala estrema** (110-112px) e **accento
  caldo** ricorrente — due sotto-famiglie: **oro/bronzo** (Intro `#bf9261`, Djaen `#DCA26B`, Yummye `#c5a47e`)
  e **arancio/rosso** (Dinenos `#dd5903`, Qichen `#df3f00`, Foodio `#f3274c`).
- **Lotto 4 (2026-08-12):** `sito 12.txt` → **T-15 Bresto** (hello-elementor, kit post-5 + palette live). PRECISO:
  bg `#ffffff` + crema `#fff6ea`/`#ffeedb`, corpo `#333333` (Poppins), titoli `#121212`, **hero Playfair Display
  100px in indaco `#292277`**, **CTA rosso `#f82b35`** + arancio `#fb7d2c`. **Nuova famiglia palette #6 "contrasto
  caldo-freddo"** (titoli freddi + CTA calde, non mono-accento) — prima volta nel settore.
- **Lotto 5 (2026-08-12):** **passata EFFETTI** su tutti i file (5 agenti paralleli, uno per gruppo). + `sito 14.txt`
  → **T-16 Merida** (Cormorant Garamond 70px su hero-foto, Jost+Hanken Grotesk, accent arancio `#fe6a13`, crema
  `#f4efe3`); `sito 13.txt` = duplicato Bresto (altra pagina). **Riscritta la 2.5 come vocabolario reale** (6
  manopole E1–E6 + tabella per-template 13 righe + livelli L0–L3 àncorati). **Scoperte chiave:** (1) il **reveal-on-scroll
  `fadeInUp` staggerato è UNIVERSALE** (stagger ✓150–300ms, durata ✓0.8–1.5s) = da implementare per primo; (2) hover-bottone
  dominante = **color-swap verso accento ✓0.3s** (o sliding-fill via `<span>`/pseudo); (3) baseline transition ✓`0.3s ease`;
  (4) alcuni template sono **statici per scelta** (Bresto, Coliv-home); (5) chicche premium reali: Ken Burns hero
  (Coliv ✓5s), cascata-hero (Merida ✓.6-2s), Slider-Rev choreography (Domnoo scale2+rot90/flip-3D), preloader/split-lettera
  (Ticrou/Foodio), PNG flottanti (Yummye/Merida). **Limite metodo:** i valori numerici di scale/translate/shadow degli
  hover-movimento sono in `.min.css` esterni non nei dump → segnati `~` (canonici da nome-classe); entrance e hover-colore
  sono `✓` misurati inline. **DB ora: 16 schede, 6 famiglie palette, vocabolario effetti completo.**
- **Lotto 6 (2026-08-12):** `sito 15.txt` = **Apple iPhone 17** (NON ristorazione) → riferimento **R-01** per la **narrativa con lo scroll**.
  Nuova sezione **2.8** + livello **L4 narrativo**. Meccanica estratta: architettura a "beat" (`section-product-story`+`data-anim-scroll-group`),
  **pin+scrub** (`sticky-height-container`), **keyframe ancorati in vh** (`a0t/a0b ± Nvh`, ease `cubic-bezier(0.22,0.01,0.82,0.64)`),
  **video-scrub** (`currentTime` mappato sullo scroll, COSTOSO/bespoke → non-default per noi), reveal economico `StaggeredFadeIn`
  (= identico al nostro E1/E2), progressive-enhancement + `prefers-reduced-motion` obbligatori. **Trasferibile low-cost:** sticky
  pin+reveal per sezioni-storia, keyframe vh, parallax-hero leggero; **NON** il video-scrub bespoke. **Nota struttura:** 2.8 è
  cross-settore → da promuovere a un doc `motion` condiviso quando partiranno altri settori.
- **Lotto 7 (2026-08-12):** articolo SiteGround "migliori siti web" → **riferimenti REALI IT del settore** (nuova sezione in Parte 1).
  Estratti dal vivo: **R-02 Chef Max Mariola** (Tiempos Fine serif + function_pro, accent cremisi `#d42344`, GSAP+Swiper),
  **R-03 Chianina e Syrah** (Source Sans Pro, bordeaux-vino `#ac354c`, foto B&N + video hero, Swiper), **R-04 Cantina Montenellago**
  (hero **script Italianno 150px** in **teal `#87cbc3`**, dissolvenze+Swiper). **Novità DB:** (1) **primo accento FREDDO/naturale**
  (teal `#87cbc3`) → rompe il monopolio caldo, ottimo per pesce/veg/cantina; (2) accenti rossi nuovi (cremisi `#d42344`, vino `#ac354c`);
  (3) scala hero spinta a **150px** (script calligrafico); (4) **lo stack reale IT = GSAP + Swiper + video hero** (non Elementor) →
  più vicino al nostro; **foto/video ad alta risoluzione = il vero motore visivo**. **Bloccati** (permesso dominio): BBANG, Oleissimo, Duca Pipe.

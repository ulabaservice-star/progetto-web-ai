# design-engine v1.1 — "wow, meglio di Wix" — design

> Design del secondo giro del motore visivo di **Belora/Ulaba** (AI website builder, Next.js 16 +
> Supabase). Poggia su **design-engine v1** (completo e verde su `main`: `site.css`, `design-select`,
> `effects-runtime`, `e2e-visual`) e su P0–P4 + deploy-hardening. Scope e decisioni chiuse in
> brainstorming con l'utente il 2026-08-13. Prosa in italiano, identificatori in inglese. Questo è il
> **design**: il blueprint atomico lo genera il bootstrap trueline a valle.
>
> A monte: `docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md` (v1). Riferimenti di
> design (build-time, non versionati): `scratchpad/kimi-1.html`, `scratchpad/kimi-2.html` (generati da
> Kimi K3). Ordine di lavoro: memoria `build-order-roadmap`. Strumento build-time: memoria
> `kimi-k3-design-tool`.

## 1 · Perché siamo qui

Lo smoke test di v1 su `ulaba.net` ha provato che v1 ha risolto il "1 layout in 5 colori" **solo sulla
carta**: i test sono verdi ma la percezione no. Due difetti confermati (immagini reali + codice):

- **Varietà solo cromatica.** Su 5 varianti reali, **3 condividono l'hero** (`immagine-piena`) e cambiano
  solo colore/ornamento. Il vincolo di v1 (`skeletonKey = hero_layout + section_treatment`,
  `design-select.ts:101`) **lascia ripetere l'hero**, e il CORPO della pagina (sezioni) **non varia mai**.
  Gli assi che v1 varia sono o locali (hero, 1 blocco su 6) o deboli (section-treatment = bordi su sezioni
  alternate). L'unico asse visibile e globale è il tema (colore) → l'occhio legge "stesso layout, colore
  diverso".
- **Blocchi grezzi.** Il CSS c'è ed è applicato (card/preview usano lo stesso `SiteView`+`site.css` di
  `/s/`), ma le sezioni sono testo impilato a piena larghezza senza design di componente: niente griglie,
  contenitori, illustrazioni, gerarchia; corpo minuscolo; bande vuote tra i blocchi. Sembra bozza, non
  sito progettato.

**Obiettivo v1.1:** portare i 5 mockup a **"wow, meglio di Wix"** (layout editoriali, illustrazioni,
sezioni ricche) — e far sì che si vedano **davvero diversi** — senza rinunciare a "impossibile venga
brutto", determinismo, CSP, editabilità. Settore pilota: **ristorazione** (verticale-blueprint completo,
poi replicato agli altri settori nel workstream E).

## 2 · Il principio

Analizzando due siti "wow" generati da Kimi K3 per lo stesso brief, il pattern è netto: un **DNA
invariante** + variazione su **pochi assi ricchi e visibili**. Lo replichiamo, curato da noi (zero-LLM a
runtime).

- **DNA di settore FISSO** (tematizzabile): palette coesa, **regole tipografiche editoriali**, ritmo
  verticale, inventario di componenti, ordine delle sezioni.
- **Varietà su ~7 ASSI ricchi distribuiti su TUTTA la pagina** (non 2 assi deboli e locali). È ciò che
  uccide "5 colori": le varianti divergono nell'hero **e nel corpo**.
- **Zero-LLM a runtime** (DS-D1 tenuto): il catalogo+selettore compongono; l'LLM non tocca il design a
  runtime. Veloce (~1 centesimo, secondi), deterministico, CSP intatta, editabile.
- **Kimi K3 come strumento di design BUILD-TIME**: genera siti "wow" per settore; noi ne estraiamo il DNA
  e lo codifichiamo nel catalogo. A runtime Kimi è improponibile (~18 min, ~$0,60/sito, HTML libero
  incompatibile con editor/freeze/CSP — vedi `kimi-k3-design-tool`).

## 3 · Scope

**In v1.1 — costruzione INCREMENTALE (DS-D15):**
1. **Nucleo di varietà (primo macrotask):** `Hero` + `Menu` (le due sezioni più identitarie) portati a
   "wow", 3-4 assi di varietà, il selettore aggiornato, il set di illustrazioni SVG core. **Serve a
   validare presto il punto più incerto**: che i 5 mockup risultino *davvero* diversi e belli.
2. **Inventario completo ristorazione:** `ChiSiamo`, `Orari`, `Contatti`, footer + i restanti assi + la
   libreria SVG completa. Solo dopo che il nucleo ha convinto.
3. **Font self-host** con regole editoriali; **THEMES** arricchiti; **matrice** e **selezione**
   aggiornate; **isola `SiteMotion`** estesa (reveal, giorno-corrente); nastri/marquee CSS puri.

**Rimandato (spec/workstream successivi):**
- **Altri settori** (E): il metodo build-time con Kimi si replica per fitness, bellezza, ecc.
- **Piano B a runtime** (orchestratore LLM): predisposto come interfaccia, costruito solo se il
  deterministico non basta (§9).
- **Foto reali** (F), split-tema (G), P5+.

## 4 · Decision ledger (continua da DS-D9)

| ID | Decisione | Scelta | Stato |
|---|---|---|---|
| `DS-D10` | Dove vive la varietà | **~7 assi ricchi e VISIBILI distribuiti su tutta la pagina** (hero + corpo), non 2 assi deboli/locali. Vincolo di distinzione rafforzato: le 5 divergono sull'asse visibile dell'hero E nel corpo | chiusa |
| `DS-D11` | Immagini (emenda DS-D5) | **Zero-foto = libreria di ILLUSTRAZIONI SVG di catalogo**, tematizzabili via `currentColor` (sistema `<symbol>`+`<use>`), non solo gradienti. Generate build-time da Kimi, curate da noi. Metà del "wow" | chiusa |
| `DS-D12` | Chi disegna (estende DS-D1) | **Catalogo zero-LLM a RUNTIME**; **Kimi K3 usato BUILD-TIME** per costruire il catalogo, MAI a runtime | chiusa |
| `DS-D13` | Font | **Self-host via next/font** (CSP-safe) con **regole editoriali**: serif didone SOLO per display, sans per corpo, tracking estremo sulle label, italic, `tabular-nums`. NON stack di sistema (degrada cross-device) | chiusa |
| `DS-D14` | La selezione è pluggabile | **`selectDesign` = interfaccia** (input: vertical+seed+segnali; output: tupla di assi validata dalla matrice). Piano A = selettore deterministico PRNG. **Piano B** = LLM orchestratore che restituisce la STESSA tupla (structured output dal catalogo, NON HTML). Matrice + `parseDocument` contengono l'anti-injection | chiusa |
| `DS-D15` | Ordine di build | **Nucleo di varietà (hero+menu) validato PRIMA** dell'inventario completo | chiusa |

## 5 · Architettura & moduli

Tutto resta nei confini di v1 (arch-check P3-D7/AH-D6): cataloghi/matrice/selettore = **dominio puro**
(`src/domain/generation`), CSS/render/illustrazioni/isola = `src/ui/site`, serving = `src/app`. Nessun
nuovo accesso dati, nessuna nuova tabella/RLS.

| Modulo | Stato | v1.1 |
|---|---|---|
| `themes.ts` | esiste | **arricchito**: regole tipografiche (display/body, tracking, tabular-nums), più token colore/spacing, superfici scure per-tema |
| `hero-layouts.ts` | esiste | **layout ricchi** (2-col asimmetrico + illustrazione + badge + CTA + meta/chip), + l'asse "trattamento H1" |
| `section-treatments.ts` | esiste | **evoluto in layout di sezione veri** (griglie/card/tabelle), non solo bordi |
| `illustrations.ts` | **nuovo** | libreria SVG `<symbol>` per settore (piatti, mattarello, mappa, icone), tematizzabili `currentColor` |
| `design-matrix.ts` | esiste | ammette le nuove combinazioni; ≥5 scheletri per vertical con assi visibili distinti |
| `design-select.ts` | esiste | **interfaccia pluggabile** (DS-D14) + vincolo di distinzione su asse visibile |
| `document.ts` | esiste | freeze dei nuovi assi (id versionati opzionali con default) |
| blocchi `src/ui/site/*` | esistono | **riscritti** come componenti progettati (Hero, Menu, ChiSiamo, Orari, Contatti) |
| `SiteMotion.tsx` | esiste | esteso: reveal stagger (già c'è), giorno-corrente evidenziato; marquee/nastri sono CSS puro |

## 6 · Il DNA di ristorazione (dai riferimenti Kimi)

Estratto dai due siti (dettaglio completo nell'analisi di sessione; qui la sintesi che il catalogo
codifica):

- **Palette:** crema calda (bg pagina), panna (superfici/card), **rosso mattone** (accento: titoli,
  prezzi, brand), **oro** (ornamento/bordi), **verde basilico** (sezione complementare), **ink brown**
  (testo, mai nero puro); WhatsApp verde isolato come colore funzionale.
- **Tipografia:** serif didone (display) + sans (corpo); display 700 con tracking negativo; label/eyebrow
  uppercase con tracking `.18em`–`.4em`; corpo `line-height 1.65`; `tabular-nums` sugli orari; `«»`
  automatiche; leader-dots sui prezzi.
- **Ritmo:** sezioni `padding-block clamp(4rem, 8-9vw, 6.5-7rem)`, container `min(1120-1140px, 92%)`,
  header sezione→contenuto `clamp(2.4rem, 5vw, 3.6rem)`, alternanza chiaro/scuro separata da nastri.
- **Componenti:** card iconate hover-lift, badge circolare "dal 1978", nastro tovaglia (conic/gingham),
  card-carta del menu (doppia cornice), tabella orari, mappa CSS, blockquote oro, bottoni pill.

## 7 · Il motore di varietà (DS-D10)

I ~7 assi, ciascuno con 2-3 valori, combinati deterministicamente dal selettore (§9). Coprono hero **e**
corpo, così le 5 varianti si vedono diverse:

| Asse | Valori |
|---|---|
| Trattamento H1 | accent con sottolineatura *wavy* · kicker-tracked + main *italic* gigante |
| Layout "Chi siamo" | feature 2×2 a lato + drop-cap · illustrazione incorniciata ruotata + feature-row da 4 |
| Modulo Orari | settimana statica + pannello pranzo/cena · giorno corrente evidenziato + card sun/moon |
| Fondale Contatti | marrone monocromo · verde bosco complementare (+ card-mappa ruotata) |
| Nastro divisorio | scacchi conici · gingham incrociato |
| Illustrazione hero | soggetto/tecnica diversi (dal catalogo SVG) |
| Accessori | FAB WhatsApp · marquee dei piatti · elementi orbitanti · drop-cap |

**Vincolo di distinzione rafforzato:** le 5 varianti devono differire sull'**asse visibile dell'hero** e
su ≥1 asse del corpo — non basta più lo "scheletro distinto" debole di v1. La matrice garantisce ≥5
combinazioni così distinte per ogni vertical.

## 8 · Illustrazioni SVG di catalogo (DS-D11)

- Sistema **`<symbol>` + `<use>`** con `currentColor`: le icone/illustrazioni ereditano il colore dal
  contesto CSS → pienamente tematizzabili per tema/sezione. (È l'approccio più DRY osservato in Kimi.)
- Un modulo `illustrations.ts` (dominio puro: solo stringhe SVG + id versionati) che il renderer inietta.
  Le scene grandi (piatto, mappa, sfoglia) coordinano i colori con la palette; le icone da `currentColor`.
- **Sicurezza:** SVG **statici del catalogo** (nessun SVG da testo utente), iniettati dal renderer unico
  con lo stesso rigore del resto (nessun `dangerouslySetInnerHTML` su input non fidato; l'SVG è costante
  del codice, non contenuto del brief). Nessuna risorsa esterna (coerente con la CSP di `/s/`).

## 9 · Selezione pluggabile & Piano B (DS-D14)

`selectDesign(vertical, seed, variantIndex, signals?) → DesignSelection` resta l'**unico punto** che
decide gli assi. Due implementazioni dietro la stessa interfaccia:

- **Piano A (default):** selettore **deterministico** (PRNG seminato, come v1) sugli assi di §7. Gratis,
  riproducibile, congelato nel documento.
- **Piano B (fallback, se i 5 mockup non convincono):** un **LLM orchestratore** riceve i segnali del
  brief e restituisce la **stessa tupla di assi** (structured output limitato agli enum del catalogo),
  scegliendo combinazioni più adatte al contenuto. **NON genera markup.**

**Perché il Piano B è sicuro e pluggabile:**
- L'output è una **tupla di id di catalogo**, identica a quella del Piano A → freeze, CSP, editor P3,
  renderer restano intatti; cambia solo la *sorgente* della selezione.
- **Anti-injection:** la selezione passa comunque da `isAllowed` (matrice, enum chiusi) + `parseDocument`.
  Un'iniezione nel brief può al massimo far uscire *un'altra combinazione valida*, mai iniettare codice.
- **Costo di predisporlo ora ≈ zero:** basta tenere la selezione dietro un'interfaccia pulita (buona
  architettura comunque).
- **Nodo aperto:** latenza/costo di Kimi K3 a runtime (reasoning always-on, ~minuti). Con output piccolo
  (una selezione, non 45 KB) *dovrebbe* calare — da **misurare** se ci arriviamo. **Fallback del
  fallback:** un modello veloce ed economico (Sonnet) come orchestratore — orchestrare richiede *capire il
  contenuto*, non essere il #1 sul frontend; Kimi K3 resta build-time.

## 10 · Processo build-time con Kimi K3

Ripetibile per settore (vedi `kimi-k3-design-tool` per l'API e i gotcha):
1. **Genera:** N siti "wow" per il settore da brief realistici (API `kimi-k3`, streaming, `max_tokens`
   alto, reasoning always-on, chiave in `.env.local`).
2. **Estrai:** il DNA (palette, tipografia, ritmo, componenti, assi, tecniche SVG) — come fatto in questa
   sessione.
3. **Codifica:** token + blocchi + assi + illustrazioni nel catalogo zero-LLM.
   Gli output grezzi restano riferimenti build-time (non versionati/`scratchpad`, non committati).

## 11 · Font & tipografia (DS-D13)

- **Self-host via `next/font`** (già in v1): serif didone display + sans corpo. Scelta dei font concreti
  in build (es. una didone tipo Playfair/Bodoni-like self-host + la sans esistente). `font-src 'self'`,
  CSP intatta.
- **Regole d'uso codificate nei THEMES/CSS** (non lasciate al caso): display SOLO su titoli/prezzi/
  citazioni; corpo sans lh 1.65; label uppercase tracked; `tabular-nums` sugli orari; italic secondo
  l'asse "trattamento H1".
- Motivo della scelta: gli stack di sistema didone (Bodoni/Didot) **mancano su Windows/Android/mobile** →
  il look si degraderebbe su metà dei device reali. Self-host lo blinda.

## 12 · Invarianti non negoziabili (da v1, confermate)

- **Anti-injection (P2-D1):** input della selezione = `vertical` (enum) + seed (+ segnali derivati per il
  Piano B, sempre ri-validati da matrice+`parseDocument`); **mai** markup da testo del brief. T-241/T-317/
  T-417 restano verdi.
- **Renderer UNICO (P2-D8):** card, anteprima, `/s/` da `SiteView`; il "wow" vale per tutti e tre.
- **Artefatto congelato (DS-D4):** id versionati degli assi nel documento; nessun re-stile silenzioso.
- **CSP/SEO su `/s/` intatte:** font self-host, isola JS bundlata (nessun `<script>` inline: reveal e
  giorno-corrente vivono in `SiteMotion`; marquee/nastri sono CSS puro), progressive-enhancement,
  `prefers-reduced-motion`, JSON-LD invariato.
- **Nessun colore letterale in `src/ui/site/**`** (AC-231-4, esteso al `.css`). Nota: le scene SVG del
  catalogo possono contenere hex coordinati — da decidere in blueprint se estendere lo scanner o
  esentare `illustrations.ts` (asset di design, non stile di layout).
- **Determinismo a runtime:** nessun `Date`/`Math.random` nel Piano A. (Il "giorno corrente" degli orari
  è un effetto client dell'isola, fuori dal documento congelato.)
- **Altitudine (arch-check):** dominio puro vs render vs serving; nessun arco `forbidden`.

## 13 · Testing / l'oracolo

La **bellezza NON è oracolabile**: l'oracolo prova **struttura + il difetto specifico**; l'estetica la
giudica l'utente (merge human-gated). Novità rispetto a v1:

- **Varietà provata su asse VISIBILE:** l'e2e non deve solo verificare che *due documenti costruiti a mano*
  con hero diversi rendano diverso (v1) — deve verificare che **le 5 varianti REALI di uno stesso seed**
  differiscano sull'asse visibile dell'hero **e** su ≥1 asse del corpo (computed-style). È il buco di v1
  che ha lasciato passare "3/5 stesso hero".
- **Blocchi ricchi:** unit/e2e per i nuovi componenti (menu-card, tabella orari, feature-grid, mappa) —
  struttura e presenza, non pixel-diff.
- **Illustrazioni SVG:** presenza, `currentColor` ereditato, nessun `<img>`/risorsa esterna, nessun SVG da
  input utente.
- **CSP/PE:** contenuto visibile senza JS; nessun `<script>` inline nel markup reso; reduced-motion.
- **Interfaccia di selezione:** il Piano A resta deterministico e `isAllowed`; il contratto della tupla è
  stabile (predispone il Piano B).
- **Canary rosso PRIMA del verde** (L-COL-006), come sempre.

## 14 · Metodo & deploy-coupling

- **Metodo trueline:** questa spec → **bootstrap trueline** (blueprint `design-engine-v1.1` con
  SESSION-STATE proprio) → build come dynamic workflow multi-agente per macrotask (builder + verifier
  BLIND), oracolo-giudice mai LLM. Vedi memoria `dynamic-workflow-build-method`.
- **Deploy-coupling = coupled:** push su `main` = deploy su `ulaba.net`; build su branch, verifica **in
  locale** (specie e2e + computed-style), merge human-gated.
- **Nucleo prima:** il primo macrotask (hero+menu) è anche il gate di validazione dell'intero approccio.

## 15 · Cosa NON c'è qui, deliberatamente

- **Piano B costruito** (orchestratore a runtime): solo predisposto come interfaccia; si costruisce se il
  Piano A non basta.
- **Altri settori** (E) → si replica il processo build-time dopo ristorazione.
- **Foto reali** (F), **split-tema** (G), **P5+**.
- **Cambio del modello di generazione a runtime:** Kimi resta build-time; la generazione dei mockup a
  runtime resta il motore zero-LLM esistente.

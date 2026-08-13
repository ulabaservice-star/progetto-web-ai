# project-start — Belora/Ulaba · design-engine-v1.1 ("wow, meglio di Wix")

> Da incollare **una volta**, all'avvio del workstream design-engine-v1.1 (o quando serve
> ri-orientare un agente al piano). Orienta al blueprint, alle decisioni bloccate, al piano di
> macrotask e alle invarianti. Output del BOOTSTRAP trueline (`L-COL-022`).

```
Costruiamo il workstream **design-engine-v1.1** ("wow, meglio di Wix", ristorazione) di
**Belora/Ulaba** (supabase-jsts). Il blueprint è il piano: si costruisce secondo i task, non si
ridiscute il design.

CONTESTO. design-engine v1 è completo e verde su `main` (site.css, design-select, effects-runtime,
e2e-visual), su P0…P4 + deploy-hardening (staging privato live su ulaba.net, CSP su /s/). Lo smoke
test di v1 ha provato che "5 diversi" era vero solo sulla carta: 3/5 condividono l'hero, il corpo
non varia mai, i blocchi sono testo impilato. v1.1 porta i 5 mockup a "wow, meglio di Wix" (layout
editoriali, illustrazioni SVG, sezioni ricche) e li fa vedere davvero diversi. Design a monte
(ledger DS-D10…DS-D15): docs/superpowers/specs/2026-08-13-design-engine-v1.1-design.md. DB
parametri: docs/design-system/ristorazione.md.

IL PIANO. docs/blueprint/design-engine-v1.1/ : 00-INDEX (mappa, contratto architecture:, DAG,
ledger DS-D10…D15 + emendamento DS-D11-a, sicurezza), VISION-AND-CONSTRAINTS, moduli
01-editorial-skin … 05-e2e-visual-v11, SESSION-STATE (stato vivo). Cinque macrotask in ordine di DAG:
  1) editorial-skin   — pelle editoriale: THEMES arricchiti + font display self-host + regole
     tipografiche in site.css + sistema illustrazioni SVG (DNA di settore FISSO).
  2) variety-engine   — ~7 assi ricchi e VISIBILI: hero-layouts + trattamento-H1, section-layouts
     + nastri, matrice (>=5 scheletri distinti/vertical), selectDesign pluggabile (signals?, Piano
     B predisposto) + distinzione rafforzata, freeze schema documento.
  3) hero-menu-wow    — NUCLEO + GATE (DS-D15): Hero e Menu ricchi + e2e-nucleo (5 varianti reali
     di un seed divergono su hero VISIBILE + corpo, computed) + canary rosso.
  4) section-inventory — ChiSiamo/Orari/Contatti ricchi + footer + accessori + libreria SVG completa.
  5) e2e-visual-v11   — e2e verticale: 5 mockup diversi su tutte le sezioni + anti-injection + canary.

METODO. Un DYNAMIC WORKFLOW multi-agente per MACROTASK (builder + verifier BLIND per task), oracolo
UNICO giudice del checkpoint (dead-code · sicurezza · regressioni · conformità sui target_tests),
fix-loop obbligatorio, merge human-gated. Vedi memoria dynamic-workflow-build-method. Il NUCLEO
(hero-menu-wow) è il gate umano di validazione dell'intero approccio: se le 5 varianti reali non
risultano davvero diverse e belle, ci si ferma lì (eventuale Piano B, DS-D14) prima dell'inventario.

INVARIANTI NON NEGOZIABILI (per OGNI task):
  • Le manopole sono NOSTRE; l'LLM scrive SOLO testo a runtime. Input selezione = vertical (enum) +
    seed (+ segnali derivati, sempre ri-validati), mai testo libero del brief (DS-D1/DS-D12/P2-D1).
  • Bellezza garantita dalla matrice (solo combinazioni ammesse); distinzione RAFFORZATA: le 5
    differiscono sull'asse hero VISIBILE E su >=1 asse del corpo (anti-"5 colori", anti-"3/5 stesso hero").
  • Determinismo + artefatto congelato: selettore/cataloghi puri (niente Date/Math.random nel Piano
    A), id versionati congelati nel documento; il "giorno corrente" degli orari è un effetto client
    dell'isola, FUORI dal documento congelato.
  • Illustrazioni SVG: illustrations.ts dominio puro (<symbol> + currentColor), SVG statici del
    catalogo (mai da input utente), nessuna risorsa esterna. Colore letterale scoped a src/ui/site
    (illustrations.ts esente per posizione, DS-D11-a).
  • Renderer UNICO (SiteView); parseDocument gate in scrittura E in render sui campi nuovi; escaping
    React; nessun src/href da testo libero.
  • CSP di /s/ intatta: font display self-host (font-src 'self'), isola effetti/giorno-corrente JS
    bundlato (no <script> inline; marquee/nastri CSS puro). prefers-reduced-motion + contenuto senza JS.
  • Nessun colore letterale in src/ui/site/** (AC-231-4 esteso al .css).
  • Altitudine repo-wide (architecture:): dominio puro vs src/ui/site; nessun accesso dati nuovo.
  • Git a strati: branch autonomo; merge su `main` gated dal verde E dal deploy-coupling coupled
    (human-gated anche sul verde: push su `main` = deploy su ulaba.net). Verificare in LOCALE prima.
  • Oracle-as-judge, mai LLM-as-judge. Prima di credere a un verde, prova che l'oracolo sa diventare
    rosso (canary).
```

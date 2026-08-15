# VISION-AND-CONSTRAINTS — design-engine-v2

> Perché v2, per chi, non-goal, vincoli. Consumato da BOOTSTRAP (contesto del piano) e da chi entra nel
> workstream. Prosa in italiano, identificatori in inglese.

## Perché

`design-engine-v1.1` costruiva la varietà per **combinatoria di manopole nostre** con mattoncini
disegnati a mano. Al **gate visivo** (5 varianti reali su `/s/`) l'utente l'ha giudicato **amatoriale**:
spazi vuoti fra le sezioni, corpo (chi-siamo/orari/contatti) come testo impilato, illustrazioni line-art
da icona, zero fotografia. Il motore combinatorio funziona; il **materiale** che gli davamo no.

Un secondo gate su **Claude Design** ha prodotto un design system professionale (palette coese,
tipografia editoriale, hero e menu veri, componenti con props, token semantici) — verdetto utente: **"è
meglio di Wix, la strada è quella giusta"**. v2 **sostituisce i mattoncini poveri con un catalogo tradotto
da Claude Design**, mantenendo intatto ciò che ci dà il vantaggio su Wix: **struttura strutturata**
(editor inline, sicurezza, mockup istantanei).

## Per chi

Micro-business locali della **ristorazione** (trattorie, osterie, pizzerie) in Italia (poi ES/LATAM). Il
prodotto genera per loro un sito partendo da un brief; i 5 mockup devono essere **belli e distinti** al
primo colpo d'occhio, senza che il cliente sappia nulla di design.

## Cosa cambia (in una riga)

Da "un layout in cinque colori" a "**20 strutture × 23 palette**, combinate da una **selezione greedy
deterministica** in 5 mockff genuinamente diversi", con blocchi di livello da guida gastronomica.

## Non-goal (fuori da v2, dichiarati)

- **Foto reali** (stock/AI, ritocco): sono **P4-D7/F**. v2 rende i placeholder tipografici di Claude
  Design (box con etichetta `FOTO · …`). Il "wow" pieno con fotografia è successivo.
- **Altri verticali** (fitness/salone/negozio): il motore resta settore-agnostico, ma v2 costruisce il
  catalogo **ristorazione**. Gli altri settori sono E/E2 nella roadmap.
- **Billing / crediti / gating a pagamento**: P5, dopo.
- **Bellezza garantita da un oracolo**: la bellezza **non è oracolabile** (L-COL-006). Gli oracoli
  provano struttura, sicurezza, varietà e assenza di regressioni; il "wow" lo giudica l'utente al **gate
  visivo** di ogni sezione. Se una sezione non convince, ci si ferma lì.

## Vincoli

- **Struttura strutturata invariante.** A runtime gira sempre il **documento congelato** (pagine →
  blocchi → slot), mai HTML generato da un LLM. Questo preserva **editor inline (P3)**, **sicurezza**
  (escaping React, `parseDocument` gate, niente `dangerouslySetInnerHTML` in `src/ui/site/**`), e
  **mockup istantanei** (nessuna chiamata al modello per l'aspetto).
- **Manopole nostre, LLM solo testo.** La scelta del design è **greedy deterministica** (seminata dal
  seed), mai il modello. L'unico ingresso di settore è `vertical` (enum); nessun percorso dal testo del
  brief all'aspetto (anti-injection P2-D1).
- **Determinismo + freeze versionato.** Stessi `vertical`+`seed` → stesse 5 varianti byte per byte; id di
  catalogo versionati `nome@N`; un sito scelto non si re-stila da solo dopo un ritocco ai cataloghi.
- **CSP + accessibilità.** CSP di `/s/` intatta (font self-host, no `<script>` inline, no risorse
  esterne); progressive-enhancement (contenuto senza JS) + prefers-reduced-motion.
- **Nessun colore letterale** in `src/ui/site/**` (solo `var(...)`); gli esadecimali vivono solo in
  `themes.ts` (dominio, fuori dallo scanner AC-231-4).
- **Deploy-coupling `coupled`.** Push su `main` = deploy su `ulaba.net` → merge human-gated anche sul
  verde; verifica in locale (vitest, e2e Chromium, computed-style, `next build`) prima di ogni merge.
- **Tempo non è il vincolo; la qualità e la varietà sì** (indicazione esplicita dell'utente: "ne farei
  molte di più anche se ci volesse più tempo").

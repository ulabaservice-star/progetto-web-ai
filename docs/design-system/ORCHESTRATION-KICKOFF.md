# KICKOFF — Orchestrazione del motore di generazione (workstream QUALITÀ)

> Da leggere **all'inizio della prossima sessione**. Questo workstream NON ha (ancora) un blueprint:
> la prima cosa da fare è **progettarlo**. Fonte dei parametri: `docs/design-system/ristorazione.md`.
> Deciso con l'utente il 2026-08-12: **prima la qualità della generazione + il flusso utente, poi P5 (billing)**.

## Perché siamo qui
Lo smoke test su `ulaba.net` ha provato la pipeline end-to-end, ma i 5 mockup generati sono **"1 layout in
5 colori"**: titoli minuscoli, zero spazio, font dei temi non caricati, nessun effetto, nessuna foto/hero.
Diagnosi blindata: il motore ha ~2 manopole (5 temi × 5 ordini) e **manca la "pelle" CSS** per i blocchi
`src/ui/site`. Il modello LLM scrive bene la COPY; è lo **strato di design** che non esiste.

## Cosa abbiamo già costruito (l'input)
`docs/design-system/ristorazione.md` — database di parametri ricavato da template + siti reali:
- **Parte 1:** 16 schede-template (T-01…T-16, font/palette/scala reali) + **riferimenti dal vivo IT** del
  settore (R-02 Chef Mariola, R-03 Chianina e Syrah, R-04 Cantina Montenellago) + R-01 Apple (scroll).
- **Parte 2 (le manopole):** 2.1 **7 famiglie-palette** (incl. #6 contrasto caldo-freddo, #7 naturale/cool) ·
  2.2 coppie tipografiche + scala (hero **fino a 150px**) · 2.3 layout-hero · 2.4 varianti-sezione ·
  2.5 **vocabolario effetti E1–E6** + livelli **L0–L4** (L4 = narrativa-scroll) · 2.6 ornamenti · 2.7 foto ·
  2.8 narrativa-scroll (riferimento Apple, low-cost per noi).
- **Parte 3:** aggancio al motore (quale manopola vive dove oggi, come evolve).

## Il metodo (non ridiscuterlo, applicalo)
1. **superpowers:brainstorming PRIMA di qualunque codice** → produce la SPEC di design in
   `docs/superpowers/specs/AAAA-MM-GG-orchestrazione-motore-design.md`, approvata dall'utente.
2. Poi **superpowers:writing-plans** → piano di implementazione.
3. Poi **build** col metodo trueline (dynamic workflow multi-agente per macrotask, oracolo-giudice,
   merge human-gated — vedi memoria [[dynamic-workflow-build-method]]).

## Domande di design da chiudere nel brainstorming
- **Il fix n.1 — la PELLE CSS:** scrivere il CSS di `src/ui/site` che consuma i token del tema
  (`theme-style.ts` → `--site-*`) con scala grande, spazi ~90px, gerarchia vera. + **caricare i font**
  (Google Fonts per tema; oggi cadono su Georgia di sistema).
- **Varietà vera:** come il motore combina `settore + seed` per dare **5 mockup DIVERSI** (hero-layout +
  varianti-sezione + tipografia + livello-effetti), non solo il colore. È il cuore del "un Wix migliore".
- **Nuove dimensioni** da aggiungere oltre a `themes.ts`/`recipes.ts`: hero-layout, effetti/motion (E1–E6 +
  L0–L4), ornamenti, trattamento-foto. Quali tipizzare subito, quali dopo.
- **Foto/video = il vero motore visivo** (lezione dai siti reali IT): dare spazio e trattamento a hero/sezioni
  immagine è ciò che sposta di più. Come gestirlo con gli asset che un micro-business ha (o non ha).
- **Effetti** reimplementati con **CSS + IntersectionObserver + JS minimo** (NON owl/WOW/Elementor): E1
  reveal-on-scroll `fadeInUp` staggerato è il primo da fare; hover color-swap/sliding-fill; `prefers-reduced-motion`.
- **Flusso utente** (l'altro tema che l'utente vuole affrontare): l'intervista che compila il brief in modo
  inaffidabile (`update_brief` chiamato in ritardo — prompt debole in `interview.ts`), e il legame
  intervista↔form. Decidere se rientra in questo workstream o è un fix a parte.

## Invarianti
- **Le manopole sono NOSTRE e curate; il modello LLM scrive SOLO testo** (P2-D1: varietà + "impossibile venga
  brutto" + anti-injection). Il design non lo inventa il modello.
- **Deploy-coupling = coupled:** Vercel è connesso al repo → **push su main = deploy in produzione**. Si
  costruisce su branch, si verifica in locale, **merge human-gated**.
- Un settore alla volta: si parte da **ristorazione** (DB pronto), poi si replica il metodo per gli altri.

## Stato di partenza (file del motore da rivedere all'inizio)
`src/domain/generation/` (themes.ts, recipes.ts, tool.ts) · `src/ui/site/` (blocks/*, SiteView, theme-style.ts).
Verifica i path reali all'apertura (potrebbero essere evoluti). Il DB parametri è la bussola.

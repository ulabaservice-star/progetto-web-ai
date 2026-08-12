# 03-effects-runtime — Macrotask `effects-runtime`

> Modulo del blueprint **design-engine** di Belora/Ulaba. Un modulo = un macrotask (checkpoint al
> confine, commit atomico). Schema trueline (`L-COL-019`). Design a monte:
> `docs/superpowers/specs/2026-08-12-orchestrazione-motore-design.md` (DS-D8).

## Obiettivo del macrotask

Gli **effetti L0–L4** (DS-D8), reimplementati con **CSS + una sola isola client**
`IntersectionObserver` — niente librerie tipo Elementor/WOW. Il CSS fa quasi tutto (hover,
transizioni, stato finale dei reveal); un unico componente client `SiteMotion` guida il
reveal-on-scroll e il driver di scroll per L3/L4. Due invarianti dure: **progressive enhancement**
(il contenuto è visibile anche senza JS — crawler/hydration fallita/JS off) e **prefers-reduced-motion**
(movimento zero, contenuto intero). L4 (narrativa-scroll) è **selettiva**, concessa dalla matrice a
pochi hero-layout. Nessuno `<script>` inline: la CSP di `/s/` (deploy-hardening T-3) resta intatta.

Ripartizione di altitudine (§1bis): CSS ed isola client vivono in `src/ui/site`. Il livello effetti
arriva **congelato** nel documento (`effect_level`, DE-205) → `data-effects` alla radice.

## Task atomici

```yaml
- id: DE-301
  title: "CSS degli effetti L0–L4: stato finale/hover, progressive-enhancement, prefers-reduced-motion"
  macrotask: "effects-runtime"
  depends_on: [DE-101]

  objective: >
    In site.css, implementare gli effetti come CSS: lo stato 'nascosto' dei reveal SOLO sotto
    .site-motion-ready (progressive enhancement), gli hover L2, i keyframe; @media
    (prefers-reduced-motion: reduce) forza lo stato finale. Solo transform/opacity.

  definition_of_done:
    - "[data-effects] .site-motion-ready [data-reveal] ha lo stato nascosto (opacity/transform); SENZA .site-motion-ready gli stessi elementi sono a stato pieno (visibili)"
    - "Hover L2 (color-swap/sliding-fill) e micro-transizioni in CSS; keyframe solo transform/opacity"
    - "@media (prefers-reduced-motion: reduce) forza lo stato finale (nessuna animazione/transform)"

  acceptance_criteria:
    - id: AC-DE-301-1
      given: "data-effects=\"L1\" e la radice SENZA .site-motion-ready (JS non montato/assente)"
      when: "reso"
      then: "gli elementi [data-reveal] sono visibili (opacity piena) — il contenuto non dipende dal JS"
    - id: AC-DE-301-2
      given: "prefers-reduced-motion: reduce"
      when: "reso"
      then: "nessuna animazione/transform sui reveal e il contenuto è visibile"

  target_tests:
    - file: "e2e/effects.spec.ts"
      covers: [AC-DE-301-1, AC-DE-301-2]

  security_notes:
    - "Effetti in CSS + JS bundlato: nessuno <script> inline, la CSP di /s/ (font/script-src) resta intatta"

- id: DE-302
  title: "Isola client SiteMotion (IntersectionObserver): reveal, gating per livello, reduced-motion, editable→L0"
  macrotask: "effects-runtime"
  depends_on: [DE-301, DE-206]

  objective: >
    src/ui/site/SiteMotion.tsx client component reso una volta da SiteView con effect_level dal
    documento. Su mount aggiunge .site-motion-ready, controlla prefers-reduced-motion (se reduce →
    no-op), attacca IntersectionObserver che aggiunge .is-visible a [data-reveal] all'ingresso; L0
    non attacca nulla; L3/L4 driver rAF su --progress. In editable → L0. Nessuno <script> inline.

  definition_of_done:
    - "src/ui/site/SiteMotion.tsx ('use client') reso una volta da SiteView, riceve effect_level dal documento"
    - "Su mount aggiunge .site-motion-ready alla radice; se prefers-reduced-motion: reduce → no-op (nessun observer)"
    - "Per L1/L2 un IntersectionObserver aggiunge .is-visible a [data-reveal] all'ingresso; L0 non attacca observer; L3/L4 driver requestAnimationFrame su --progress"
    - "In modalità editable il livello scende a L0; nessuno <script> inline introdotto (JS bundlato)"

  acceptance_criteria:
    - id: AC-DE-302-1
      given: "data-effects=\"L1\" e JS attivo (motion default)"
      when: "un [data-reveal] entra nel viewport allo scroll"
      then: "ottiene la classe .is-visible"
    - id: AC-DE-302-2
      given: "prefers-reduced-motion: reduce"
      when: "l'isola monta"
      then: "NON aggiunge .is-visible (no-op) e il contenuto è già visibile"
    - id: AC-DE-302-3
      given: "la modalità editable"
      when: "si rende"
      then: "il livello effettivo è L0 (nessun movimento)"
    - id: AC-DE-302-4
      given: "la pagina /s/ renderizzata"
      when: "si ispeziona l'HTML servito"
      then: "non c'è alcuno <script> inline introdotto dall'isola (solo JS bundlato)"

  target_tests:
    - file: "e2e/effects.spec.ts"
      covers: [AC-DE-302-1, AC-DE-302-2]
    - file: "tests/site-motion.test.ts"
      covers: [AC-DE-302-3, AC-DE-302-4]

  security_notes:
    - "L'isola è JS bundlato (hydration di Next), mai <script> inline: la CSP di /s/ non si tocca; observer attaccati solo se il livello lo richiede e solo a elementi esistenti"
```

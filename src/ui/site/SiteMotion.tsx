'use client';

// DE-302 (macrotask effects-runtime) — L'UNICA ISOLA CLIENT DEL MOVIMENTO. Il CSS (DE-301) fa quasi
// tutto: stato nascosto dei reveal, stato rivelato, hover, keyframe, e il @media reduce che forza lo
// stato finale. Qui vive SOLO cio' che un foglio di stile non puo' sapere — quando un elemento entra
// nel viewport e quanto e' scorsa la pagina. Nessuno <script> inline: e' un componente client, cioe'
// JS BUNDLATO da Next, quindi la CSP di /s/ (script-src 'self') resta intatta. E nessun HTML grezzo
// entra da qui: l'isola scrive SOLO classi, attributi e custom property — mai markup.
//
// LA RADICE E' IL PADRE DEL MARCATORE, non `document`. SiteView rende questa isola come PRIMO FIGLIO
// della propria radice `.site-view`, che e' anche l'elemento che porta `data-effects` (DE-207) e su
// cui il foglio aggancia il compound [data-effects='L1'].site-motion-ready. Il <span hidden> e' il
// solo modo di farsi dare QUELL'elemento da React senza che l'isola diventi il wrapper dell'intero
// documento. Lo scope per-radice non e' un dettaglio: la pagina del selettore rende CINQUE SiteView
// (le card), e un observer su `document` le mescolerebbe tutte.
//
// L'ORDINE DELLE OPERAZIONI E' L'INVARIANTE OSSERVABILE. Si scrive PRIMA `data-motion-level` — il
// livello EFFETTIVO applicato, che SiteView abbassa a 'L0' in modalita editable — e POI si decide.
// Chi vede quell'attributo sa percio' che la decisione e' gia' stata presa: un test che poi asserisce
// "NON c'e' .site-motion-ready" non sta guardando un'isola non ancora montata (anti-vacuita').
//
// .site-motion-ready SI AGGIUNGE SOLO SE SI PUO' DAVVERO RIVELARE. Quella classe e' il GATE dello
// stato NASCOSTO del foglio: aggiungerla senza poi togliere il nascosto lascerebbe il contenuto
// invisibile per sempre. Percio' OGNI ramo che non rivela (L0, prefers-reduced-motion, observer
// assente, radice non trovata) esce PRIMA di aggiungerla: no-op silenzioso, mai un throw, contenuto
// intero. Il @media del foglio resta la prima cintura, questa e' la seconda.
//
// IL REVEAL COPRE L1..L4, NON SOLO L1/L2: e' lo stato nascosto di site.css a coprire quei quattro
// livelli, quindi a L3/L4 un'isola senza observer lascerebbe la pagina vuota. L3/L4 AGGIUNGONO il
// driver di scroll, non lo sostituiscono al reveal.
//
// L'AGGANCIO SEGUE LA FORMA DELL'ALBERO, non solo il livello: `blocks` e' la firma del documento
// reso e sta nelle dipendenze dell'effetto. Senza, un albero che cresce SOTTO una radice gia' gated
// (il "rigenera questa variante" del selettore rifa' il render server-side senza smontare la radice)
// produrrebbe wrapper nuovi che nessun observer guarda: nascosti dal gate e mai rivelati.
//
// CIO' CHE E' GIA' IN VISTA SI RIVELA SUBITO, in modo SINCRONO. La prima pittura (SSR, nessun gate)
// mostra il contenuto pieno: se l'isola si limitasse a mettere il gate, il primo schermo lampeggerebbe
// a vuoto per il frame che separa il gate dalla prima notifica dell'observer. Marcarlo qui evita il
// lampo e risparmia un aggancio; cio' che sta sotto la piega resta all'observer.

import { useEffect, useRef } from 'react';
import type { EffectLevel } from '@/domain/generation/effects';

/** La preferenza di accessibilita': movimento zero quando l'utente lo chiede. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Il GATE dello stato nascosto dei reveal in site.css: la si aggiunge solo se si rivelera'. */
const READY_CLASS = 'site-motion-ready';

/** Lo stato RIVELATO di un singolo elemento, all'ingresso nel viewport. */
const VISIBLE_CLASS = 'is-visible';

/** Il gancio per-blocco che il renderer mette sul wrapper `.site-block` (DE-301). */
const REVEAL_SELECTOR = '[data-reveal]';

/** L'osservabile della decisione dell'isola: il livello EFFETTIVAMENTE applicato. */
const LEVEL_ATTRIBUTE = 'data-motion-level';

/** La custom property che il driver di scroll scrive sulla radice; il foglio la legge a L3/L4. */
const PROGRESS_PROPERTY = '--progress';

/** I livelli col DRIVER di scroll (premium, narrativo). Uguaglianza esatta, mai un prefisso. */
const SCROLL_DRIVER_LEVELS: readonly EffectLevel[] = ['L3', 'L4'];

/**
 * Un elemento e' GIA' DENTRO il viewport verticale? Serve solo a decidere chi rivelare subito e chi
 * affidare all'observer: il confronto e' sull'asse Y, l'unico su cui la pagina scorre.
 */
function inViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

export function SiteMotion({ level, blocks }: { level: EffectLevel; blocks: number }) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = marker.current?.parentElement ?? null;
    // Radice non trovata (marcatore non ancora nel DOM, o isola resa fuori da una radice): no-op.
    if (root === null) return;

    // Prima l'osservabile, poi la decisione (vedi l'intestazione).
    root.setAttribute(LEVEL_ATTRIBUTE, level);

    // matchMedia manca in ambienti non-browser (jsdom): la sua assenza significa "nessuna preferenza
    // espressa", non "riduci il movimento".
    const reducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;

    // I TRE RAMI CHE NON RIVELANO — e che percio' non toccano il gate: livello statico, preferenza di
    // movimento ridotto, IntersectionObserver assente (browser vecchio). In tutti e tre il contenuto
    // resta a stato pieno, come senza JS.
    if (level === 'L0' || reducedMotion || typeof IntersectionObserver === 'undefined') return;

    root.classList.add(READY_CLASS);

    // Un elemento rivelato non torna nascosto: `unobserve` lo toglie dall'osservazione, cosi' un
    // secondo passaggio nel viewport non ripaga il costo di una callback.
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(VISIBLE_CLASS);
        observer.unobserve(entry.target);
      }
    });
    for (const reveal of root.querySelectorAll(REVEAL_SELECTOR)) {
      // Gia' in vista: rivelato SUBITO, nello stesso giro in cui e' arrivato il gate (niente lampo),
      // e mai osservato — l'observer serve per cio' che deve ancora entrare.
      if (inViewport(reveal)) reveal.classList.add(VISIBLE_CLASS);
      else observer.observe(reveal);
    }

    // DRIVER DI SCROLL (L3/L4): la sola cosa che scrive --progress. Il minimo indispensabile — quota
    // di pagina scorsa, normalizzata in [0,1] — perche' il foglio ne fa una trasformazione e nient'
    // altro. Pagina piu' corta del viewport: nulla da scorrere, quindi progresso pieno (stato finale).
    // SI SCRIVE QUANDO QUALCOSA SI MUOVE, non a ogni frame: un rAF perpetuo terrebbe sveglia la CPU
    // (e forzerebbe il layout con le sue due letture) anche su una pagina ferma, che e' il caso
    // normale di un sito pubblicato. Un solo frame in volo: le raffiche di scroll si coalescono.
    let frame = 0;
    let detachDriver: (() => void) | null = null;
    if (SCROLL_DRIVER_LEVELS.includes(level)) {
      const write = () => {
        frame = 0;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 1;
        root.style.setProperty(PROGRESS_PROPERTY, progress.toFixed(3));
      };
      const schedule = () => {
        if (frame === 0) frame = window.requestAnimationFrame(write);
      };
      // Il valore iniziale e' SINCRONO: il foglio ha gia' il suo fallback var(--progress, 1), ma cosi'
      // la custom property esiste dal primo frame invece che dal secondo.
      write();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      detachDriver = () => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
      };
    }

    return () => {
      observer.disconnect();
      if (detachDriver !== null) detachDriver();
      if (frame !== 0) window.cancelAnimationFrame(frame);
      // Si toglie anche il GATE: se il livello cambia (l'editor che entra in modalita editable) il
      // nuovo effetto potrebbe non rivelare piu' nulla, e una classe rimasta li' terrebbe nascosto un
      // contenuto che nessun observer scoprirebbe piu'.
      root.classList.remove(READY_CLASS);
    };
  }, [level, blocks]);

  // Il marcatore: nessuna dimensione, nessun contenuto, fuori dall'albero di accessibilita'. Serve
  // solo a farsi dare la radice (parentElement) e a tenere l'isola dentro il render di SiteView.
  return <span ref={marker} hidden />;
}

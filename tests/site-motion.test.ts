// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import itMessages from '../messages/it.json';
import { parseDocument, type SiteDocument } from '@/domain/generation/document';
import { THEMES } from '@/domain/generation/themes';

// DE-302 (macrotask effects-runtime) — L'ISOLA CLIENT DEL MOVIMENTO, montata dal renderer REALE. Le
// asserzioni derivano dagli acceptance_criteria di 03-effects-runtime.md, taggate `// covers:` sulla
// RIGA dell'expect:
//
//  - AC-DE-302-3: in modalita EDITABLE il livello EFFETTIVO e' L0 (nessun movimento). L'osservabile e'
//    `data-motion-level`, che l'isola scrive sulla radice PRIMA di ogni altra decisione: e' il gancio
//    che rende la scelta ispezionabile senza inventare un componente finto.
//  - AC-DE-302-4: il render dell'isola non introduce ALCUN elemento <script> e il suo sorgente non ha
//    alcuna via di iniezione di HTML grezzo — l'isola e' un componente client, cioe' JS BUNDLATO da
//    Next, e la CSP di /s/ (script-src 'self') resta intatta.
//
// FIXTURE DISCORDANTE (disciplina P1): lo STESSO documento — effect_level 'L3' congelato, DUE pagine
// ('home' e 'home-storia', la seconda col prefisso della prima) e PIU' blocchi — reso DUE VOLTE, con
// `editable` e senza. Un solo ramo non proverebbe nulla: 'L0' potrebbe essere il livello del
// documento invece che l'effetto della modalita.
//
// L'ORDINE DEI DUE RENDER E' PORTANTE: prima l'EDITABLE, poi il read-only. Cosi', quando la seconda
// isola monta, i [data-reveal] della PRIMA radice sono gia' nel documento — ed e' l'unica
// disposizione in cui un observer attaccato a `document` invece che alla PROPRIA radice si vede (ne
// pescherebbe il doppio). Il selettore del selettore-di-varianti rende cinque SiteView nella stessa
// pagina: lo scope per-radice e' un requisito reale, non un'ipotesi.
//
// COSA SI MOCKA E PERCHE' NON E' HOLLOW: solo `next-intl/server` getTranslations (risolto dal catalogo
// REALE it) e `IntersectionObserver`, che jsdom non implementa. Il doppio dell'observer non simula
// l'ingresso nel viewport — REGISTRA soltanto se e a QUALI elementi l'isola si e' agganciata: il
// reveal vero (la classe .is-visible allo scroll) e' provato in un browser dall'e2e (AC-DE-302-1/2),
// non qui. SiteView, SiteMotion, il registry e i blocchi NON sono mockati: rendono per davvero.

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { locale: string; namespace: string }) => {
    const ns = ((itMessages as Record<string, unknown>)[namespace] ?? {}) as Record<string, unknown>;
    return (key: string) => {
      const value = key
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ns);
      return typeof value === 'string' ? value : `${namespace}.${key}`;
    };
  },
}));

// Import DOPO il mock (vi.mock e' hoisted).
import { SiteView } from '@/ui/site/SiteView';

// ── il doppio di IntersectionObserver ────────────────────────────────────────
// jsdom non lo implementa: senza doppio l'isola prenderebbe il proprio ramo di guardia (no-op
// silenzioso) e il ramo che ATTACCA non sarebbe mai esercitato. Il doppio ignora la callback — cio'
// che questo file misura e' il GATING, non l'effetto del reveal — e implementa solo i due metodi che
// il montaggio usa davvero: `observe` (aggancio) e `disconnect` (cleanup dell'useEffect).
const instances: FakeIntersectionObserver[] = [];

class FakeIntersectionObserver {
  readonly observed: Element[] = [];
  disconnected = false;

  constructor() {
    instances.push(this);
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  disconnect(): void {
    this.disconnected = true;
  }
}

(window as unknown as Record<string, unknown>).IntersectionObserver = FakeIntersectionObserver;

beforeEach(() => {
  instances.length = 0;
});

afterEach(() => {
  cleanup();
});

// ── fixture: due pagine, piu' blocchi, effect_level 'L3' CONGELATO ───────────
// Il documento passa da parseDocument (gate in scrittura), cosi' si rende cio' che il gate
// normalizza. 'home-storia' ha 'home' come PREFISSO: i reveal di ENTRAMBE le pagine stanno sotto la
// stessa radice, quindi un aggancio ritagliato per prefisso di pagina ne prenderebbe la meta'.
function buildDocument(options?: { level?: string; extraBlock?: boolean }): SiteDocument {
  // `level` e `extraBlock` sono le due sole varianti che i controlli qui sotto chiedono: il LIVELLO
  // (perche' il driver di scroll e' privilegio di L3/L4) e un blocco IN PIU' sull'ultima pagina
  // (l'albero che cresce sotto una radice gia' montata). Tutto il resto della fixture resta identico,
  // cosi' cio' che cambia fra due casi e' esattamente cio' che si sta misurando.
  const raw = {
    recipe_id: 'ricetta-prova@1',
    theme_id: THEMES[0].id,
    hero_layout_id: 'centrato@1',
    section_treatment_id: 'piano@1',
    effect_level: options?.level ?? 'L3',
    pages: [
      {
        slug: 'home',
        role: 'home',
        title: 'Home della Trattoria Aurora',
        meta_description: 'La trattoria Aurora nel centro storico',
        blocks: [
          {
            id: 'hero',
            content: { hero_title: 'Benvenuti alla Trattoria Aurora' },
            data: {},
            brief_fields_rendered: [],
            images: [],
          },
          {
            id: 'chi-siamo',
            content: { about_title: 'La nostra storia', about_body: 'Cucina di mercato dal 1980' },
            data: {},
            brief_fields_rendered: [],
            images: [],
          },
        ],
      },
      {
        slug: 'home-storia',
        role: 'contact',
        title: 'La storia della Trattoria Aurora',
        meta_description: 'Quarant anni di cucina di mercato',
        blocks: [
          {
            id: 'hero',
            content: { hero_title: 'Dal 1980 nel centro storico' },
            data: {},
            brief_fields_rendered: [],
            images: [],
          },
          ...(options?.extraBlock === true
            ? [
                {
                  id: 'chi-siamo',
                  content: { about_title: 'Le persone', about_body: 'Una famiglia e due cuochi' },
                  data: {},
                  brief_fields_rendered: [],
                  images: [],
                },
              ]
            : []),
        ],
      },
    ],
  };
  const parsed = parseDocument(raw);
  if (!parsed.ok) {
    throw new Error(`fixture DE-302 non valida: ${JSON.stringify(parsed.error.issues)}`);
  }
  return parsed.document;
}

/** Rende il documento col renderer REALE e restituisce la RADICE del render (`.site-view`). */
async function renderRoot(doc: SiteDocument, editable?: boolean): Promise<HTMLElement> {
  const ui = await SiteView({ document: doc, theme: THEMES[0], locale: 'it', editable });
  const { container } = render(ui);
  const root = container.querySelector('.site-view');
  if (root === null) throw new Error('nessuna radice .site-view resa');
  return root as HTMLElement;
}

/** I ganci di reveal sotto una radice, in ordine di DOM. */
function reveals(root: HTMLElement): Element[] {
  return [...root.querySelectorAll('[data-reveal]')];
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-302-3 — in modalita editable il livello effettivo e' L0 (nessun movimento).
// ─────────────────────────────────────────────────────────────────────────────

describe('DE-302 AC-DE-302-3 — in modalita editable il livello effettivo scende a L0', () => {
  it('stesso documento L3: editable -> L0 senza observer, read-only -> L3 con observer sulla PROPRIA radice', async () => {
    const doc = buildDocument();

    // when: PRIMA la modalita editable (vedi l'intestazione: l'ordine e' portante).
    const editableRoot = await renderRoot(doc, true);

    // then: il livello EFFETTIVO e' L0 — l'isola e' montata (l'attributo c'e') e la sua decisione e'
    // gia' presa.
    expect(editableRoot.getAttribute('data-motion-level')).toBe('L0'); // covers: AC-DE-302-3
    // NESSUN MOVIMENTO, nei due modi in cui e' osservabile: il gate dello stato nascosto non e' stato
    // aggiunto (classList.contains e' un match di TOKEN esatto, non di sottostringa) ...
    expect(editableRoot.classList.contains('site-motion-ready')).toBe(false); // covers: AC-DE-302-3
    // ... e nessun observer e' stato costruito.
    expect(instances).toHaveLength(0); // covers: AC-DE-302-3

    // Il DOCUMENTO CONGELATO non e' stato riscritto: data-effects porta ancora il livello scelto
    // (L3). E' il livello EFFETTIVO a scendere, non la selezione — un sito in editing resta lo
    // stesso sito.
    expect(editableRoot.getAttribute('data-effects')).toBe('L3'); // covers: AC-DE-302-3
    // Anti-vacuita': la fixture ha PIU' di un gancio di reveal su cui un observer avrebbe potuto
    // attaccarsi (due pagine, tre blocchi), quindi lo zero qui sopra e' una scelta, non un vuoto.
    expect(reveals(editableRoot).length).toBeGreaterThan(2); // covers: AC-DE-302-3

    // when: lo STESSO documento, senza `editable`.
    const readOnlyRoot = await renderRoot(doc);

    // then: il livello effettivo e' quello congelato — i due rami DIFFERISCONO, e differiscono per la
    // modalita e non per il documento.
    expect(readOnlyRoot.getAttribute('data-motion-level')).toBe('L3'); // covers: AC-DE-302-3
    expect(readOnlyRoot.getAttribute('data-motion-level')).not.toBe(
      editableRoot.getAttribute('data-motion-level'),
    ); // covers: AC-DE-302-3
    expect(readOnlyRoot.classList.contains('site-motion-ready')).toBe(true); // covers: AC-DE-302-3
    expect(instances).toHaveLength(1); // covers: AC-DE-302-3

    // L'OSSERVAZIONE E' SCOPATA ALLA PROPRIA RADICE: esattamente i reveal di questa radice (tutti,
    // anche quelli della seconda pagina), e NESSUNO di quelli dell'altra radice gia' nel documento —
    // che e' cio' che cadrebbe con una query su `document`.
    const attesi = reveals(readOnlyRoot);
    const estranei = reveals(editableRoot);
    expect(attesi.length).toBeGreaterThan(2); // covers: AC-DE-302-3
    expect(instances[0].observed).toHaveLength(attesi.length); // covers: AC-DE-302-3
    expect(instances[0].observed.every((el, i) => el === attesi[i])).toBe(true); // covers: AC-DE-302-3
    expect(instances[0].observed.some((el) => estranei.includes(el))).toBe(false); // covers: AC-DE-302-3
  });

  it('smontando la radice L3 l isola fa cleanup: observer disconnesso e gate rimosso', async () => {
    // Il gate non deve sopravvivere all'isola che lo ha messo: una .site-motion-ready orfana
    // terrebbe nascosto un contenuto che nessun observer tornerebbe a rivelare.
    const root = await renderRoot(buildDocument());
    expect(root.classList.contains('site-motion-ready')).toBe(true); // covers: AC-DE-302-3
    expect(instances).toHaveLength(1); // covers: AC-DE-302-3

    cleanup();

    expect(instances[0].disconnected).toBe(true); // covers: AC-DE-302-3
    expect(root.classList.contains('site-motion-ready')).toBe(false); // covers: AC-DE-302-3
  });

  // REGRESSIONE (rilievo del verifier, non un AC): il gate vive sulla radice, l'aggancio vive sui
  // singoli wrapper. Se l'albero cresce SENZA che la radice smonti — il "rigenera questa variante"
  // del selettore rifa' il render server-side e React riconcilia sugli stessi nodi — un blocco nuovo
  // nascerebbe sotto una radice ancora gated e, non essendo osservato da nessuno, resterebbe nascosto
  // per sempre. La firma della forma dell'albero (prop `blocks`) e' cio' che rimette l'isola in pari.
  it('se l albero cresce sotto la stessa radice, il blocco nuovo viene osservato (non resta nascosto)', async () => {
    const ui = await SiteView({ document: buildDocument(), theme: THEMES[0], locale: 'it' });
    const { container, rerender } = render(ui);
    const root = container.querySelector('.site-view') as HTMLElement;
    expect(root.classList.contains('site-motion-ready')).toBe(true);
    const agganciatiPrima = instances[0].observed.length;
    expect(agganciatiPrima).toBe(reveals(root).length);

    // when: lo STESSO sito rende un blocco in piu' (un pool rigenerato che riempie uno slot prima
    // mancante), senza smontare la radice.
    const cresciuto = buildDocument({ extraBlock: true });
    rerender(await SiteView({ document: cresciuto, theme: THEMES[0], locale: 'it' }));

    const dopo = reveals(root);
    // L'albero e' DAVVERO cresciuto (senza questa riga il resto sarebbe vero per vacuita')...
    expect(dopo).toHaveLength(agganciatiPrima + 1);
    // ... e l'isola si e' ri-agganciata a TUTTI i reveal, compreso quello nato dopo il mount.
    const ultimo = instances[instances.length - 1];
    expect(ultimo.observed).toHaveLength(dopo.length);
    expect(ultimo.observed).toContain(dopo[dopo.length - 1]);
    // Il gate e' ancora in vigore: si e' ricostruito, non semplicemente sopravvissuto.
    expect(root.classList.contains('site-motion-ready')).toBe(true);
    expect(instances.length).toBeGreaterThan(1);
  });

  // AC-DE-302-2 in UNITARIO. jsdom non implementa matchMedia, quindi senza doppio il ramo della
  // preferenza di movimento ridotto non e' esercitabile qui e vivrebbe solo nell'e2e: una mutazione
  // che togliesse il gating lascerebbe VERDE tutta la suite vitest. Il doppio risponde `matches: true`
  // SOLO alla query della preferenza — non si finge un browser che risponde di si' a tutto.
  it('con prefers-reduced-motion: reduce l isola monta ed e no-op: nessun gate, nessun observer', async () => {
    // Si passa da `vi.stubGlobal` e NON da un'assegnazione con ripristino a mano: qui `matchMedia` e'
    // una proprieta' ACCESSOR, quindi assegnarla ne invoca il SETTER e il descrittore catturato prima
    // resta lo stesso getter — ripristinarlo rimetterebbe in piedi lo stub, silenziosamente, per tutti
    // i test successivi del file.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
    }));

    try {
      const root = await renderRoot(buildDocument());

      // ANTI-VACUITA': l'isola E' montata e ha gia' deciso (l'attributo lo prova), quindi lo zero qui
      // sotto e' una decisione, non il silenzio di un componente che non e' mai partito.
      expect(root.getAttribute('data-motion-level')).toBe('L3'); // covers: AC-DE-302-2
      expect(root.classList.contains('site-motion-ready')).toBe(false); // covers: AC-DE-302-2
      expect(instances).toHaveLength(0); // covers: AC-DE-302-2
      // Nessun reveal e' stato marcato: il contenuto resta quello pieno del render.
      expect(reveals(root).length).toBeGreaterThan(2); // covers: AC-DE-302-2
      expect(reveals(root).some((el) => el.classList.contains('is-visible'))).toBe(false); // covers: AC-DE-302-2
    } finally {
      vi.unstubAllGlobals();
    }

    // Il ripristino e' PROVATO, non assunto: se lo stub sopravvivesse, ogni test successivo girerebbe
    // in un mondo che riduce il movimento e non se ne accorgerebbe (l'isola sarebbe no-op ovunque). Il
    // predicato e' lo STESSO dell'isola — jsdom non implementa matchMedia, quindi "assente" e' un esito
    // legittimo quanto "presente e falso", e cio' che conta e' che la preferenza non sia in vigore.
    const riduceAncora =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    expect(riduceAncora).toBe(false);
  });

  // Il DRIVER DI SCROLL (terzo bullet della definition_of_done) non aveva alcun oracolo: cancellarlo
  // per intero lasciava la suite verde. Il valore iniziale e' scritto in modo sincrono al mount,
  // quindi qui non serve alcun timer: si legge la custom property subito dopo il render.
  it('il driver di scroll scrive --progress ai soli livelli che lo prevedono (L3 si, L1 no)', async () => {
    const l3 = await renderRoot(buildDocument());
    expect(l3.getAttribute('data-motion-level')).toBe('L3');
    const progresso = l3.style.getPropertyValue('--progress');
    expect(progresso).not.toBe('');
    expect(Number(progresso)).toBeGreaterThanOrEqual(0);
    expect(Number(progresso)).toBeLessThanOrEqual(1);

    cleanup();

    // Stesso documento, livello 'L1': il reveal c'e' (il gate e' messo) ma il driver no — il consumo
    // CSS di --progress e' dichiarato per i soli L3/L4.
    const l1 = await renderRoot(buildDocument({ level: 'L1' }));
    expect(l1.getAttribute('data-motion-level')).toBe('L1');
    expect(l1.classList.contains('site-motion-ready')).toBe(true);
    expect(l1.style.getPropertyValue('--progress')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-302-4 — l'isola non introduce alcuno <script> inline (solo JS bundlato).
// ─────────────────────────────────────────────────────────────────────────────

/** Il sorgente dell'isola. vitest gira dalla radice del repo (come in site-view-design-attributes). */
function siteMotionSource(): string {
  return readFileSync(join(process.cwd(), 'src', 'ui', 'site', 'SiteMotion.tsx'), 'utf8');
}

/**
 * LE VIE DI HTML GREZZO che un componente puo' aprire: la prop di React che bypassa l'escaping e
 * l'assegnazione diretta di markup a un nodo. Sono le forme con cui uno <script> nascerebbe DENTRO
 * l'albero dell'isola invece che dal bundle — cioe' l'unico modo in cui questo componente potrebbe
 * introdurre script inline.
 */
function apreHtmlGrezzo(source: string): boolean {
  return source.includes('dangerouslySetInnerHTML') || /innerHTML|insertAdjacentHTML/i.test(source);
}

describe('DE-302 AC-DE-302-4 — nessuno script inline: l isola e JS bundlato', () => {
  it('il render dell isola non produce alcun elemento script, in nessuna delle due modalita', async () => {
    const doc = buildDocument();
    const editableRoot = await renderRoot(doc, true);
    const readOnlyRoot = await renderRoot(doc);

    // Anti-vacuita': l'isola e' DAVVERO montata in entrambi i render (l'attributo lo prova), quindi
    // lo zero qui sotto non e' lo zero di un componente che non c'e'.
    expect(editableRoot.hasAttribute('data-motion-level')).toBe(true); // covers: AC-DE-302-4
    expect(readOnlyRoot.hasAttribute('data-motion-level')).toBe(true); // covers: AC-DE-302-4

    expect(editableRoot.querySelectorAll('script')).toHaveLength(0); // covers: AC-DE-302-4
    expect(readOnlyRoot.querySelectorAll('script')).toHaveLength(0); // covers: AC-DE-302-4
  });

  it('il sorgente dell isola non ha alcuna via di HTML grezzo ed e un componente client (bundlato)', () => {
    const source = siteMotionSource();

    expect(apreHtmlGrezzo(source)).toBe(false); // covers: AC-DE-302-4
    // E' un COMPONENTE CLIENT: la sua direttiva e' il meccanismo per cui Next lo spedisce come
    // bundle: un'isola che non fosse tale non potrebbe montare alcun observer nel browser, e la sola
    // alternativa sarebbe stata proprio uno <script> nella pagina.
    expect(source.startsWith("'use client';")).toBe(true); // covers: AC-DE-302-4
  });

  it('il predicato DISCRIMINA: riconosce le vie di HTML grezzo e non un normale componente', () => {
    // Contro-prova (fixture VIRTUALI): senza righe di VIOLAZIONE, un predicato che dicesse sempre
    // `false` passerebbe il controllo qui sopra.
    expect(apreHtmlGrezzo('<div dangerouslySetInnerHTML={{ __html: x }} />')).toBe(true); // covers: AC-DE-302-4
    expect(apreHtmlGrezzo('root.innerHTML = x;')).toBe(true); // covers: AC-DE-302-4
    expect(apreHtmlGrezzo('root.insertAdjacentHTML("beforeend", x);')).toBe(true); // covers: AC-DE-302-4
    expect(apreHtmlGrezzo('root.classList.add("site-motion-ready");')).toBe(false); // covers: AC-DE-302-4
  });
});

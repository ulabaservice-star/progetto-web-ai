// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import itMessages from '../messages/it.json';
import type { SiteBlock } from '@/domain/generation/document';

// DV2-402 (macrotask body-sections-a, design-engine-v2) — I RENDERER DEL CORPO chi-siamo/recensioni/faq.
// Le asserzioni DERIVANO dagli acceptance_criteria AC-DV2-402-1..4
// (docs/blueprint/design-engine-v2/04-body-sections.md); ogni EXPECT porta il tag `// covers: <AC-id>`.
//
// FEDELTA' AL SERVING: il markup e' quello di `renderToStaticMarkup` (react-dom/server), lo STESSO che
// Next produce su /s/ — a differenza di `render` (jsdom) che SCARTA i valori CSS con virgole (clamp,
// color-mix) dagli stili inline (lezione menu). Qui si asserisce sulla STRINGA fedele (colori, escaping)
// e, per la struttura, si parseggia la stringa in un DOM (document.body.innerHTML) per querySelector.
//
// COSA NON PROVA (L-COL-006): non prova che una sezione sia BELLA (gate visivo umano). Prova che ogni
// blocco consuma il `section_layout_id` per-blocco e proietta `data-section-layout` congelato; che gli
// slot sono resi; che lo scheletro placeholder e' copy UI FISSA quando non alimentato; che il testo
// ostile e' escapato (nessun markup/attributo iniettato); che i colori passano SOLO da var(--site-*).

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { locale: string; namespace: string }) => {
    const ns = ((itMessages as Record<string, unknown>)[namespace] ?? {}) as Record<string, unknown>;
    return (key: string) => {
      const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ns);
      return typeof value === 'string' ? value : `${namespace}.${key}`;
    };
  },
}));

import { ChiSiamo } from '@/ui/site/blocks/ChiSiamo';
import { Recensioni } from '@/ui/site/blocks/Recensioni';
import { Faq } from '@/ui/site/blocks/Faq';

// Un colore LETTERALE (hex/rgb/hsl): i colori del corpo devono passare SOLO da var(--site-color-*).
// 'in srgb' del color-mix NON matcha (\brgb richiede confine di parola + '(' subito dopo).
const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

/** Parseggia la stringa SSR in un DOM per querySelector (senza ri-renderizzare React). */
function parse(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

function aboutBlock(over?: Partial<SiteBlock>): SiteBlock {
  return {
    id: 'chi-siamo',
    content: {
      about_title: 'Tre generazioni ai fornelli',
      about_body: 'Nonna Rosa apriva la saracinesca nel 1962: pasta fatta in casa, nessuna scorciatoia.',
      about_points: ['Pasta fatta in casa', 'Forno a legna dal 1962', 'Spesa al mercato'],
    },
    data: {},
    brief_fields_rendered: [],
    images: [],
    ...over,
  };
}

describe('DV2-402 · ChiSiamo v2 (renderer unico multi-variante)', () => {
  // ── AC-DV2-402-1 — data-section-layout congelato + la variante con i suoi slot ──

  // covers: AC-DV2-402-1
  it('la radice porta data-section-layout col valore congelato e rende gli slot editabili', async () => {
    const html = renderToStaticMarkup(
      await ChiSiamo({ block: aboutBlock({ section_layout_id: 'chi-siamo-timeline@1' }), locale: 'it' }),
    );
    const root = parse(html).querySelector('.site-about-v2');
    expect(root, 'radice del blocco assente').not.toBeNull(); // covers: AC-DV2-402-1
    // Lato atteso LETTERALE: un id diverso o assente lo tradirebbe.
    expect(root?.getAttribute('data-section-layout')).toBe('chi-siamo-timeline@1'); // covers: AC-DV2-402-1
    expect(root?.getAttribute('data-block-kind')).toBe('chi-siamo'); // covers: AC-DV2-402-1
    // Gli slot (about_title/body/points) sono resi (prosa del modello, escaped da React).
    expect(html).toContain('Tre generazioni ai fornelli'); // covers: AC-DV2-402-1
    expect(html).toContain('Nonna Rosa apriva la saracinesca'); // covers: AC-DV2-402-1
    expect(html).toContain('Forno a legna dal 1962'); // covers: AC-DV2-402-1
  });

  // covers: AC-DV2-402-1
  it('un blocco SENZA section_layout_id cade sul fallback (radice presente, id di fallback)', async () => {
    const html = renderToStaticMarkup(await ChiSiamo({ block: aboutBlock(), locale: 'it' }));
    const root = parse(html).querySelector('.site-about-v2');
    expect(root?.getAttribute('data-section-layout')).toBe('chi-siamo-overlap@1'); // covers: AC-DV2-402-1
  });

  // covers: AC-DV2-402-1
  it('la variante segue section_layout_id: due id distinti danno data-section-layout distinti (provenienza)', async () => {
    const a = parse(
      renderToStaticMarkup(await ChiSiamo({ block: aboutBlock({ section_layout_id: 'chi-siamo-timeline@1' }), locale: 'it' })),
    ).querySelector('.site-about-v2')?.getAttribute('data-section-layout');
    const b = parse(
      renderToStaticMarkup(await ChiSiamo({ block: aboutBlock({ section_layout_id: 'chi-siamo-citazione@1' }), locale: 'it' })),
    ).querySelector('.site-about-v2')?.getAttribute('data-section-layout');
    expect(a).toBe('chi-siamo-timeline@1'); // covers: AC-DV2-402-1
    expect(b).toBe('chi-siamo-citazione@1'); // covers: AC-DV2-402-1
    expect(a).not.toBe(b); // covers: AC-DV2-402-1
  });

  // covers: AC-DV2-402-1
  it('un section_layout_id ignoto (o di un ALTRA sezione) cade sul fallback, non rompe', async () => {
    const html = renderToStaticMarkup(
      await ChiSiamo({ block: aboutBlock({ section_layout_id: 'faq-accordion@1' }), locale: 'it' }),
    );
    const root = parse(html).querySelector('.site-about-v2');
    // La radice congela l'id passato, ma il RENDERER cade sul fallback (nessun crash, contenuto reso).
    expect(root).not.toBeNull(); // covers: AC-DV2-402-1
    expect(html).toContain('Tre generazioni ai fornelli'); // covers: AC-DV2-402-1
  });

  // ── AC-DV2-402-4 — testo ostile ESCAPED, nessun markup/attributo iniettato ──

  // covers: AC-DV2-402-4
  it('title/body/points ostili sono ESCAPED: nessun <img>/<script>/onerror iniettato', async () => {
    const html = renderToStaticMarkup(
      await ChiSiamo({
        block: aboutBlock({
          content: {
            about_title: '<img src=x onerror="alert(1)">',
            about_body: '<script>alert(1)</script>',
            about_points: ['<b>iniettato</b>', "javascript:alert(1)"],
          },
        }),
        locale: 'it',
      }),
    );
    const doc = parse(html);
    // images=[] → nessuna foto CARICATA (i placeholder non sono <img>): un <img> qui sarebbe iniezione.
    expect(doc.querySelector('img'), 'un <img> iniettato dal payload').toBeNull(); // covers: AC-DV2-402-4
    expect(doc.querySelector('script'), 'uno <script> iniettato dal payload').toBeNull(); // covers: AC-DV2-402-4
    expect(doc.querySelector('[onerror]'), 'un attributo onerror iniettato').toBeNull(); // covers: AC-DV2-402-4
    // Nessun onerror ATTRIBUTO (con virgoletta REALE): il payload lo porta escapato (onerror=&quot;),
    // che e' TESTO, non un attributo — 'onerror="' con la virgoletta vera non compare mai.
    expect(html).not.toContain('onerror="'); // covers: AC-DV2-402-4
    // Il payload compare come TESTO escapato, non come markup.
    expect(html).toContain('&lt;img'); // covers: AC-DV2-402-4
    expect(html).toContain('&lt;script&gt;'); // covers: AC-DV2-402-4
    expect(html).toContain('&lt;b&gt;iniettato&lt;/b&gt;'); // covers: AC-DV2-402-4
  });

  // covers: AC-DV2-402-4 (regola del layer: nessun colore letterale)
  it('nessun colore LETTERALE nel markup: i colori passano da var(--site-color-*)', async () => {
    // Provata su una variante a fondo scuro con velo (color-mix): il piu' a rischio di letterali.
    const html = renderToStaticMarkup(
      await ChiSiamo({ block: aboutBlock({ section_layout_id: 'chi-siamo-foto-piena@1' }), locale: 'it' }),
    );
    expect(LITERAL_COLOR.test(html), `colore letterale nel markup: ${html.slice(0, 200)}`).toBe(false); // covers: AC-DV2-402-4
  });
});

function reviewsBlock(over?: Partial<SiteBlock>): SiteBlock {
  return {
    id: 'recensioni',
    content: {},
    data: {},
    brief_fields_rendered: [],
    images: [],
    ...over,
  };
}

describe('DV2-402 · Recensioni v2 (scheletro placeholder, mai testimonianze finte)', () => {
  // ── AC-DV2-402-2 — scheletro con copy UI FISSA, nessun contenuto inventato ──

  // covers: AC-DV2-402-2
  it('non alimentato: mostra la copy UI FISSA (i18n) e NESSUNA testimonianza (nessuna citazione/autore finti)', async () => {
    const html = renderToStaticMarkup(await Recensioni({ block: reviewsBlock({ section_layout_id: 'recensioni-cards@1' }), locale: 'it' }));
    const doc = parse(html);
    // La copy UI FISSA di catalogo (i18n) e' presente ED e' esattamente quella (non una testimonianza).
    const ph = doc.querySelector('.site-reviews-v2__placeholder');
    expect(ph, 'copy placeholder assente').not.toBeNull(); // covers: AC-DV2-402-2
    expect(ph?.textContent).toBe('Le recensioni dei tuoi clienti compariranno qui, appena le riceverai.'); // covers: AC-DV2-402-2
    // NESSUNA citazione resa: lo scheletro sono barre decorative, mai un <blockquote> con testo finto.
    expect(doc.querySelectorAll('blockquote').length, 'una citazione fabbricata').toBe(0); // covers: AC-DV2-402-2
    // Il titolo di ripiego e' etichetta di catalogo (i18n), non prosa inventata.
    expect(html).toContain('Dicono di noi'); // covers: AC-DV2-402-2
    // Le barre dello scheletro esistono (la FORMA), e sono decorative (aria-hidden).
    expect(doc.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0); // covers: AC-DV2-402-2
  });

  // covers: AC-DV2-402-1
  it('la radice porta data-section-layout congelato e rende gli slot reviews_title/intro se presenti', async () => {
    const html = renderToStaticMarkup(
      await Recensioni({
        block: reviewsBlock({ section_layout_id: 'recensioni-scure@1', content: { reviews_title: 'Parola dei clienti', reviews_intro: 'Quello che ci scrivono.' } }),
        locale: 'it',
      }),
    );
    const root = parse(html).querySelector('.site-reviews-v2');
    expect(root?.getAttribute('data-section-layout')).toBe('recensioni-scure@1'); // covers: AC-DV2-402-1
    expect(root?.getAttribute('data-block-kind')).toBe('recensioni'); // covers: AC-DV2-402-1
    // reviews_title/intro (slot esistenti) sono resi (prosa del modello, editabile via SiteText).
    expect(html).toContain('Parola dei clienti'); // covers: AC-DV2-402-1
    expect(html).toContain('Quello che ci scrivono.'); // covers: AC-DV2-402-1
    // La copy placeholder resta (le testimonianze non esistono comunque).
    expect(parse(html).querySelector('.site-reviews-v2__placeholder')).not.toBeNull(); // covers: AC-DV2-402-1
  });

  // covers: AC-DV2-402-1
  it('senza section_layout_id cade sul fallback (recensioni-cards@1)', async () => {
    const html = renderToStaticMarkup(await Recensioni({ block: reviewsBlock(), locale: 'it' }));
    expect(parse(html).querySelector('.site-reviews-v2')?.getAttribute('data-section-layout')).toBe('recensioni-cards@1'); // covers: AC-DV2-402-1
  });

  // ── AC-DV2-402-4 — testo ostile degli slot ESCAPED ──

  // covers: AC-DV2-402-4
  it('reviews_title/intro ostili sono ESCAPED: nessun <script>/<img>/onerror iniettato', async () => {
    const html = renderToStaticMarkup(
      await Recensioni({
        block: reviewsBlock({ content: { reviews_title: '<script>alert(1)</script>', reviews_intro: '<img src=x onerror="alert(1)">' } }),
        locale: 'it',
      }),
    );
    const doc = parse(html);
    expect(doc.querySelector('script')).toBeNull(); // covers: AC-DV2-402-4
    expect(doc.querySelector('img')).toBeNull(); // covers: AC-DV2-402-4
    expect(doc.querySelector('[onerror]')).toBeNull(); // covers: AC-DV2-402-4
    expect(html).not.toContain('onerror="'); // covers: AC-DV2-402-4
    expect(html).toContain('&lt;script&gt;'); // covers: AC-DV2-402-4
  });

  // covers: AC-DV2-402-4 (nessun colore letterale)
  it('nessun colore LETTERALE nel markup (provata su una variante scura)', async () => {
    const html = renderToStaticMarkup(await Recensioni({ block: reviewsBlock({ section_layout_id: 'recensioni-scontrini@1' }), locale: 'it' }));
    expect(LITERAL_COLOR.test(html), `colore letterale: ${html.slice(0, 200)}`).toBe(false); // covers: AC-DV2-402-4
  });
});

function faqBlock(over?: Partial<SiteBlock>): SiteBlock {
  return {
    id: 'faq',
    content: {},
    data: {},
    brief_fields_rendered: [],
    images: [],
    ...over,
  };
}

const DUE_QA = [
  { question: 'Serve prenotare?', answer: 'Nel weekend si, meglio avvisare entro le 18.' },
  { question: 'Avete opzioni vegetariane?', answer: "C'e' sempre almeno un primo vegetariano." },
];

describe('DV2-402 · Faq v2 (dual-mode: Q&A reali o scheletro)', () => {
  // ── AC-DV2-402-1 — Q&A reali: data-section-layout congelato + slot resi ──

  // covers: AC-DV2-402-1
  it('con faq_items REALI: radice con data-section-layout congelato, domande/risposte rese, nessuno scheletro', async () => {
    const html = renderToStaticMarkup(
      await Faq({ block: faqBlock({ section_layout_id: 'faq-griglia@1', content: { faq_title: 'Prima di venire', faq_items: DUE_QA } }), locale: 'it' }),
    );
    const doc = parse(html);
    const root = doc.querySelector('.site-faq-v2');
    expect(root?.getAttribute('data-section-layout')).toBe('faq-griglia@1'); // covers: AC-DV2-402-1
    expect(root?.getAttribute('data-block-kind')).toBe('faq'); // covers: AC-DV2-402-1
    expect(html).toContain('Prima di venire'); // covers: AC-DV2-402-1
    expect(html).toContain('Serve prenotare?'); // covers: AC-DV2-402-1
    expect(html).toContain('Nel weekend si, meglio avvisare entro le 18.'); // covers: AC-DV2-402-1
    // Con dati reali NON compare la copy placeholder (non e' uno scheletro).
    expect(doc.querySelector('.site-faq-v2__placeholder'), 'placeholder presente con dati reali').toBeNull(); // covers: AC-DV2-402-1
  });

  // ── AC-DV2-402-2 — senza faq_items: scheletro con copy UI FISSA, nessun Q&A inventato ──

  // covers: AC-DV2-402-2
  it('senza faq_items: mostra lo scheletro con copy UI FISSA (i18n), nessuna domanda/risposta inventata', async () => {
    const html = renderToStaticMarkup(await Faq({ block: faqBlock({ section_layout_id: 'faq-accordion@1' }), locale: 'it' }));
    const doc = parse(html);
    const ph = doc.querySelector('.site-faq-v2__placeholder');
    expect(ph, 'copy placeholder assente').not.toBeNull(); // covers: AC-DV2-402-2
    expect(ph?.textContent).toBe('Le risposte alle domande dei tuoi clienti compariranno qui.'); // covers: AC-DV2-402-2
    // Titolo di ripiego di catalogo (i18n), non inventato.
    expect(html).toContain('Domande frequenti'); // covers: AC-DV2-402-2
    // Le righe scheletro esistono e sono decorative.
    expect(doc.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0); // covers: AC-DV2-402-2
  });

  // covers: AC-DV2-402-1
  it('senza section_layout_id cade sul fallback (faq-accordion@1)', async () => {
    const html = renderToStaticMarkup(await Faq({ block: faqBlock({ content: { faq_items: DUE_QA } }), locale: 'it' }));
    expect(parse(html).querySelector('.site-faq-v2')?.getAttribute('data-section-layout')).toBe('faq-accordion@1'); // covers: AC-DV2-402-1
  });

  // ── AC-DV2-402-4 — question/answer ostili ESCAPED ──

  // covers: AC-DV2-402-4
  it('question/answer ostili sono ESCAPED: nessun <script>/<img>/onerror iniettato', async () => {
    const html = renderToStaticMarkup(
      await Faq({
        block: faqBlock({ content: { faq_items: [{ question: '<img src=x onerror="alert(1)">', answer: '<script>alert(1)</script>' }] } }),
        locale: 'it',
      }),
    );
    const doc = parse(html);
    expect(doc.querySelector('img')).toBeNull(); // covers: AC-DV2-402-4
    expect(doc.querySelector('script')).toBeNull(); // covers: AC-DV2-402-4
    expect(doc.querySelector('[onerror]')).toBeNull(); // covers: AC-DV2-402-4
    expect(html).not.toContain('onerror="'); // covers: AC-DV2-402-4
    expect(html).toContain('&lt;script&gt;'); // covers: AC-DV2-402-4
  });

  // covers: AC-DV2-402-4 (nessun colore letterale)
  it('nessun colore LETTERALE nel markup (provata su una variante scura, dati reali)', async () => {
    const html = renderToStaticMarkup(await Faq({ block: faqBlock({ section_layout_id: 'faq-scura@1', content: { faq_items: DUE_QA } }), locale: 'it' }));
    expect(LITERAL_COLOR.test(html), `colore letterale: ${html.slice(0, 200)}`).toBe(false); // covers: AC-DV2-402-4
  });
});

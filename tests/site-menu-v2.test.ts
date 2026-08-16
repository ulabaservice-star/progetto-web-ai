// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import itMessages from '../messages/it.json';
import type { SiteBlock } from '@/domain/generation/document';

// DV2-302 (macrotask menu, design-engine-v2) — IL RENDERER UNICO DEL MENU. Le asserzioni DERIVANO dagli
// acceptance_criteria AC-DV2-302-1..4 (docs/blueprint/design-engine-v2/03-menu.md); ogni EXPECT porta
// il tag `// covers: <AC-id>`. Il blocco e' un Server Component async, invocato come funzione e reso.
//
// COSA NON PROVA (L-COL-006): non prova che il menu sia BELLO (gate visivo umano). Prova che consuma
// `menu_layout_id` dal documento e proietta `data-menu-layout`; che le voci hanno nome + leader-dots +
// prezzo; che e' una card-carta su una superficie scura del TEMA (var, mai un letterale); che i prezzi
// portano la classe stilata tabular da site.css; che nome/prezzo ostili sono TESTO, mai markup/attributi.

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { locale: string; namespace: string }) => {
    const ns = ((itMessages as Record<string, unknown>)[namespace] ?? {}) as Record<string, unknown>;
    return (key: string) => {
      const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ns);
      return typeof value === 'string' ? value : `${namespace}.${key}`;
    };
  },
}));

import { Offerte } from '@/ui/site/blocks/Offerte';

afterEach(() => cleanup());

// Regex di un colore LETTERALE (hex/rgb/hsl): i colori del menu devono passare SOLO da var(--site-color-*).
const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

// Un blocco offerte di ristorazione (show_price = true) con voci nella STESSA sezione — piu' di una
// voce con prezzo, cosi' i conteggi non passano per vacuita'.
function menuBlock(offerings: SiteBlock['data']['offerings']): SiteBlock {
  return {
    id: 'offerte',
    content: { offerings_title: 'Il nostro menu', offerings_intro: 'Pochi piatti, quelli giusti' },
    data: { vertical: 'ristorazione', offerings },
    brief_fields_rendered: ['offerings'],
    images: [],
  };
}

const DUE_PIATTI: SiteBlock['data']['offerings'] = [
  { name: 'Cacio e pepe', price: '11,00 EUR', section: 'Primi' },
  { name: 'Amatriciana', price: '12,00 EUR', section: 'Primi' },
];

// ── AC-DV2-302-1 — voci con nome + leader-dots + prezzo; radice con data-menu-layout congelato ──

describe('DV2-302 AC-1 · voci con leader-dots e data-menu-layout congelato', () => {
  it('ogni voce con prezzo ha nome + un leader-dots TRA nome e prezzo, e la radice porta data-menu-layout', async () => {
    const block = menuBlock(DUE_PIATTI);
    // La variante card-carta (leader-dots): l'id del catalogo DV2-301 scende via `design.menu_layout_id`.
    const container = render(await Offerte({ block, locale: 'it', design: { menu_layout_id: 'menu-carta@1' } })).container;

    const root = container.querySelector('.site-menu-v2');
    expect(root, 'radice del menu assente').not.toBeNull(); // covers: AC-DV2-302-1
    // La radice porta il valore congelato (lato atteso LETTERALE): un id diverso o assente lo tradirebbe.
    expect(root?.getAttribute('data-menu-layout')).toBe('menu-carta@1'); // covers: AC-DV2-302-1

    const items = [...container.querySelectorAll('.site-menu-v2__item')];
    // Piu' di una voce (una fixture di una sola non proverebbe l'identita').
    expect(items.length).toBe(2); // covers: AC-DV2-302-1

    for (const item of items) {
      const name = item.querySelector('.site-menu-v2__name');
      const leader = item.querySelector('.site-menu-v2__leader');
      const price = item.querySelector('.site-menu-v2__price');
      expect(name, 'voce senza nome').not.toBeNull(); // covers: AC-DV2-302-1
      expect(price, 'voce senza prezzo').not.toBeNull(); // covers: AC-DV2-302-1
      expect(leader, 'voce senza leader-dots').not.toBeNull(); // covers: AC-DV2-302-1
      // Il leader-dots sta TRA il nome e il prezzo (ordine del DOM): segue il nome e precede il prezzo.
      expect(name!.compareDocumentPosition(leader!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // covers: AC-DV2-302-1
      expect(leader!.compareDocumentPosition(price!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // covers: AC-DV2-302-1
      // Il leader-dots e' DECORATIVO (aria-hidden): non e' contenuto per l'accessibilita'.
      expect(leader!.getAttribute('aria-hidden')).toBe('true'); // covers: AC-DV2-302-1
    }

    // I nomi e i prezzi sono quelli del brief, coi propri valori.
    const names = [...container.querySelectorAll('.site-menu-v2__name')].map((n) => n.textContent);
    expect(names).toEqual(['Cacio e pepe', 'Amatriciana']); // covers: AC-DV2-302-1
    const prices = [...container.querySelectorAll('.site-menu-v2__price')].map((p) => p.textContent);
    expect(prices).toEqual(['11,00 EUR', '12,00 EUR']); // covers: AC-DV2-302-1
  });

  it('la variante VISIVA segue menu_layout_id: due id distinti danno data-menu-layout distinti (provenienza)', async () => {
    const carta = render(await Offerte({ block: menuBlock(DUE_PIATTI), locale: 'it', design: { menu_layout_id: 'menu-carta@1' } })).container;
    const cartaLayout = carta.querySelector('.site-menu-v2')?.getAttribute('data-menu-layout');
    cleanup();
    const tavolata = render(await Offerte({ block: menuBlock(DUE_PIATTI), locale: 'it', design: { menu_layout_id: 'menu-tavolata@1' } })).container;
    const tavolataLayout = tavolata.querySelector('.site-menu-v2')?.getAttribute('data-menu-layout');

    expect(cartaLayout).toBe('menu-carta@1'); // covers: AC-DV2-302-1
    expect(tavolataLayout).toBe('menu-tavolata@1'); // covers: AC-DV2-302-1
    expect(cartaLayout).not.toBe(tavolataLayout); // covers: AC-DV2-302-1
  });

  it('senza selezione (design assente) cade sul fallback e rende comunque le voci', async () => {
    const container = render(await Offerte({ block: menuBlock(DUE_PIATTI), locale: 'it' })).container;
    const root = container.querySelector('.site-menu-v2');
    // Il fallback e' un id valido del catalogo, non `undefined`: la radice porta comunque un layout.
    expect(root?.getAttribute('data-menu-layout')).toBe('menu-griglia@1'); // covers: AC-DV2-302-1
    expect(container.querySelectorAll('.site-menu-v2__item')).toHaveLength(2); // covers: AC-DV2-302-1
  });
});

// ── AC-DV2-302-2 — card-carta (doppia cornice) su una superficie SCURA del tema, mai un letterale ──

describe('DV2-302 AC-2 · card-carta su surface-dark del tema, nessun colore letterale', () => {
  it('la variante carta e una card di carta (surface-card + bordo) su un fondo scuro (surface-dark), tutto da var()', async () => {
    const container = render(await Offerte({ block: menuBlock(DUE_PIATTI), locale: 'it', design: { menu_layout_id: 'menu-carta@1' } })).container;
    const root = container.querySelector('.site-menu-v2');
    expect(root).not.toBeNull();

    const styled = [...root!.querySelectorAll('[style]')].map((el) => el.getAttribute('style') ?? '');
    expect(styled.length).toBeGreaterThan(1);

    // Il CONTENITORE e' una superficie SCURA del tema (var, non un letterale).
    const hasDarkSurface = styled.some((s) => s.includes('var(--site-color-surface-dark)'));
    expect(hasDarkSurface, 'nessun fondo surface-dark').toBe(true); // covers: AC-DV2-302-2
    // La CARTA interna e' una superficie chiara (surface-card): la seconda cornice della card.
    const hasCardSurface = styled.some((s) => s.includes('var(--site-color-surface-card)'));
    expect(hasCardSurface, 'nessuna carta surface-card').toBe(true); // covers: AC-DV2-302-2
    // La carta ha un BORDO (il filo in testa): il "bordo interno" della doppia cornice.
    const hasCardBorder = styled.some(
      (s) => s.includes('var(--site-color-surface-card)') && /border/.test(s),
    );
    expect(hasCardBorder, 'la carta non ha bordo').toBe(true); // covers: AC-DV2-302-2

    // NESSUN colore letterale in tutto il markup reso: i colori passano SOLO da var(--site-color-*).
    for (const s of styled) {
      expect(LITERAL_COLOR.test(s), `colore letterale inline: ${s}`).toBe(false); // covers: AC-DV2-302-2
    }
    // FALSIFICABILE: il predicato scatta su un letterale, non su un token var().
    expect(LITERAL_COLOR.test('background:#241A10')).toBe(true); // covers: AC-DV2-302-2
    expect(LITERAL_COLOR.test('background:var(--site-color-surface-dark)')).toBe(false); // covers: AC-DV2-302-2
  });
});

// ── AC-DV2-302-3 — i prezzi portano la classe della colonna prezzi, stilata tabular da site.css ──

describe('DV2-302 AC-3 · prezzi con la classe tabular stilata da site.css', () => {
  it('gli elementi prezzo portano .site-menu-v2__price e site.css la stila font-variant-numeric', async () => {
    const container = render(await Offerte({ block: menuBlock(DUE_PIATTI), locale: 'it', design: { menu_layout_id: 'menu-carta@1' } })).container;
    const prices = [...container.querySelectorAll('.site-menu-v2__price')];
    expect(prices.length).toBeGreaterThanOrEqual(2); // covers: AC-DV2-302-3

    // La regola tabular in site.css include la classe dei prezzi del menu (cifre a larghezza fissa,
    // allineate). Isolo il blocco con `font-variant-numeric` e verifico che vi compaia la classe.
    const css = readFileSync(join(process.cwd(), 'src', 'ui', 'site', 'site.css'), 'utf8');
    const tabularRule = css.split('}').find((rule) => rule.includes('font-variant-numeric'));
    expect(tabularRule, 'nessuna regola font-variant-numeric in site.css').toBeDefined(); // covers: AC-DV2-302-3
    expect(tabularRule).toContain('.site-menu-v2__price'); // covers: AC-DV2-302-3
    // La proprieta' e' proprio la cifra tabulare del sistema (commutatore del tema).
    expect(tabularRule).toContain('var(--site-numeric-figure)'); // covers: AC-DV2-302-3
  });
});

// ── AC-DV2-302-4 — nome/prezzo ostili sono TESTO, nessun markup iniettato, nessun src/href da testo ──

describe('DV2-302 AC-4 · anti-injection: voci ostili rese come testo', () => {
  it('un <script> nel nome e un URL di terzi nel prezzo non generano elementi ne attributi src/href', async () => {
    const SCRIPT = '<script>window.__pwned = 1</script>';
    const IFRAME = '<iframe srcdoc="<script>alert(1)</script>"></iframe>';
    const THIRD_PARTY = 'https://evil-cdn.example.com/x.png';
    const ostile: SiteBlock['data']['offerings'] = [
      { name: `Tagliere ${SCRIPT}`, price: `${THIRD_PARTY}`, section: 'Taglieri' },
      { name: 'Tagliere', description: IFRAME, price: '9 EUR', section: 'Taglieri' }, // 'Tagliere' prefisso
    ];
    const container = render(
      await Offerte({ block: menuBlock(ostile), locale: 'it', design: { menu_layout_id: 'menu-carta@1' } }),
    ).container;

    // I payload compaiono VERBATIM come testo (l'asserzione non passa per vacuita').
    expect(container.textContent).toContain(SCRIPT); // covers: AC-DV2-302-4
    expect(container.textContent).toContain(IFRAME); // covers: AC-DV2-302-4
    expect(container.textContent).toContain(THIRD_PARTY); // covers: AC-DV2-302-4

    // Nessun elemento nasce dal testo: il testo non fidato passa solo dall'escape di React.
    expect(container.querySelectorAll('script')).toHaveLength(0); // covers: AC-DV2-302-4
    expect(container.querySelectorAll('iframe')).toHaveLength(0); // covers: AC-DV2-302-4
    expect(container.querySelectorAll('img')).toHaveLength(0); // covers: AC-DV2-302-4 (nessuna foto uploaded)

    // Nessun src/href porta l'URL di terzi: un prezzo-URL non diventa mai un attributo.
    const attrs = [...container.querySelectorAll('[src], [href]')].flatMap((el) => [
      el.getAttribute('src') ?? '',
      el.getAttribute('href') ?? '',
    ]);
    for (const value of attrs) {
      expect(value).not.toContain(THIRD_PARTY); // covers: AC-DV2-302-4
    }
  });
});

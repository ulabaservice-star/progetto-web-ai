// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';

// DV2-202 (macrotask hero, design-engine-v2) — IL RENDERER UNICO dell'hero, le 20 varianti di Claude
// Design. Le asserzioni derivano dagli acceptance_criteria del task, taggate `// covers: <AC>` sulla
// riga dell'EXPECT. Il LATO ATTESO e' un letterale scritto qui (mai `design.hero_layout_id` o un
// binding dell'implementazione): l'asserzione DEVE poter fallire.
//
// getTranslations REALE dal catalogo (namespace 'site'): cosi' il test prova ANCHE che le chiavi
// nuove `site.hero.ctaPrimary/ctaSecondary/photoLabel` esistono davvero (un fallback `site.hero.*`
// farebbe cadere le asserzioni sull'etichetta). Stesso pattern di tests/site-blocks-untrusted.
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => {
    const cat = (locale === 'es' ? esMessages : itMessages) as Record<string, unknown>;
    const ns = (cat[namespace] ?? {}) as Record<string, unknown>;
    return (key: string) => {
      const value = key
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ns);
      return typeof value === 'string' ? value : `${namespace}.${key}`;
    };
  },
}));

// Import DOPO il mock (vi.mock e' hoisted).
import { Hero } from '@/ui/site/blocks/Hero';
import { parseDocument, type SiteBlock } from '@/domain/generation/document';

afterEach(() => cleanup());

// ── fixture: un blocco hero VALIDO, passato dal gate REALE (parseDocument) ──────────────────────
// Non si costruisce il blocco a mano bypassando lo schema: si compone un documento minimo e si estrae
// il blocco dall'uscita del gate, cosi' i campi passano davvero la validazione (e per AC-4 si prova
// che il testo OSTILE e' accettato dal gate ed e' il RENDER a neutralizzarlo con l'escape di React).
function gatedHeroBlock(content: Record<string, string>, data: Record<string, unknown>): SiteBlock {
  const parsed = parseDocument({
    recipe_id: 'ricetta-prova@1',
    theme_id: 'tema-prova@1',
    pages: [
      {
        slug: 'home',
        role: 'home',
        title: 'Home',
        meta_description: 'Benvenuti nel sito',
        blocks: [
          {
            id: 'hero',
            content,
            data,
            brief_fields_rendered: 'business_name' in data ? ['business_name'] : [],
            images: [],
          },
        ],
      },
    ],
  });
  if (!parsed.ok) {
    throw new Error(`fixture hero non valida: ${JSON.stringify(parsed.error.issues)}`);
  }
  return parsed.document.pages[0].blocks[0];
}

// Contenuto PULITO, piu' campi valorizzati e DISCORDANTI (occhiello != titolo != sottotitolo != brand).
const CLEAN_CONTENT = {
  hero_title_kicker: 'Osteria dal 1962',
  hero_title: 'Cucina romana verace',
  hero_subtitle: 'Pasta fatta a mano e vini del Lazio',
};
const CLEAN_DATA = { business_name: 'Da Nonna Rosa' };

// Etichette di catalogo ATTESE (locale it): letterali, non importati dal binding dell'implementazione.
const CTA_PRIMARY_IT = 'Prenota un tavolo';
const CTA_SECONDARY_IT = "Vedi l'offerta";
// La sola etichetta i18n (senza il prefisso "FOTO · " che aggiunge il primitivo): confronto robusto
// al separatore, e prova che la label viene dal catalogo e non dal testo del brief.
const PHOTO_LABEL_IT = 'ambiente del locale';

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-202-1 — la radice porta il data-hero-layout CONGELATO e la struttura e' quella della variante.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-202 AC-DV2-202-1 — data-hero-layout congelato + marcatore strutturale della variante', () => {
  it('hero-split@1: la radice porta il layout esatto e la foto e AFFIANCATA/incorniciata (non overlay)', async () => {
    const block = gatedHeroBlock(CLEAN_CONTENT, CLEAN_DATA);
    const { container } = render(
      await Hero({ block, locale: 'it', design: { hero_layout_id: 'hero-split@1' } }),
    );

    const section = container.querySelector('section');
    // Contro il LETTERALE 'hero-split@1', non contro design.hero_layout_id (falsificabile).
    expect(section?.getAttribute('data-hero-layout')).toBe('hero-split@1'); // covers: AC-DV2-202-1
    expect(section?.getAttribute('data-block-kind')).toBe('hero'); // covers: AC-DV2-202-1
    expect(section?.getAttribute('data-block-id')).toBe('hero'); // covers: AC-DV2-202-1

    // Marcatore strutturale della variante split: la foto e' incorniciata a fianco (position relative),
    // parte della composizione a due colonne — non un overlay full-bleed.
    const photo = container.querySelector('.site-photo-ph') as HTMLElement | null;
    expect(photo?.style.position).toBe('relative'); // covers: AC-DV2-202-1
  });

  it('hero-full@1: la radice porta il proprio layout e la foto e un OVERLAY full-bleed (position absolute)', async () => {
    const block = gatedHeroBlock(CLEAN_CONTENT, CLEAN_DATA);
    const { container } = render(
      await Hero({ block, locale: 'it', design: { hero_layout_id: 'hero-full@1' } }),
    );

    const section = container.querySelector('section');
    expect(section?.getAttribute('data-hero-layout')).toBe('hero-full@1'); // covers: AC-DV2-202-1

    const photo = container.querySelector('.site-photo-ph') as HTMLElement | null;
    expect(photo?.style.position).toBe('absolute'); // covers: AC-DV2-202-1
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-202-2 — occhiello, <h1> display, sottotitolo, CTA i18n, PhotoPlaceholder di catalogo.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-202 AC-DV2-202-2 — gli slot resi, il titolo display, le CTA di catalogo, nessun <img>', () => {
  it('rende occhiello + h1(display) + sottotitolo + due CTA i18n + PhotoPlaceholder, senza src esterno', async () => {
    const block = gatedHeroBlock(CLEAN_CONTENT, CLEAN_DATA);
    const element = await Hero({ block, locale: 'it', design: { hero_layout_id: 'hero-split@1' } });
    const { container } = render(element);

    // Occhiello (dal kicker).
    expect(container.querySelector('.site-hero-v2__eyebrow')?.textContent).toBe('Osteria dal 1962'); // covers: AC-DV2-202-2

    // Titolo in <h1> con la serif display. Il font-family a `var()` si legge dalla serializzazione di
    // React (renderToStaticMarkup), non dalla CSSOM di jsdom che puo' scartare var() da font-family.
    const h1 = container.querySelector('h1');
    expect(h1?.textContent).toBe('Cucina romana verace'); // covers: AC-DV2-202-2
    const html = renderToStaticMarkup(element);
    expect(html).toMatch(/<h1[^>]*font-family:var\(--site-font-display\)/); // covers: AC-DV2-202-2

    // Sottotitolo.
    expect(container.querySelector('.site-hero-v2__subtitle')?.textContent).toBe(
      'Pasta fatta a mano e vini del Lazio',
    ); // covers: AC-DV2-202-2

    // Due CTA: <a> del Button con etichetta i18n e href INTERNA statica.
    const anchors = [...container.querySelectorAll('a')];
    expect(anchors).toHaveLength(2); // covers: AC-DV2-202-2
    expect(anchors[0]?.getAttribute('href')).toBe('#offerte'); // covers: AC-DV2-202-2
    expect(anchors[0]?.textContent).toBe(CTA_PRIMARY_IT); // covers: AC-DV2-202-2
    expect(anchors[1]?.getAttribute('href')).toBe('#contatti'); // covers: AC-DV2-202-2
    expect(anchors[1]?.textContent).toBe(CTA_SECONDARY_IT); // covers: AC-DV2-202-2

    // PhotoPlaceholder di catalogo (.site-photo-ph, "FOTO · <label i18n>"): nessun <img>/src esterno.
    // La label viene dal catalogo (i18n), non dal brief; robusto al separatore fra "FOTO" e la label.
    const photo = container.querySelector('.site-photo-ph');
    expect(photo).not.toBeNull(); // covers: AC-DV2-202-2
    expect(photo?.textContent?.startsWith('FOTO')).toBe(true); // covers: AC-DV2-202-2
    expect(photo?.textContent).toContain(PHOTO_LABEL_IT); // covers: AC-DV2-202-2
    expect(container.querySelector('img')).toBeNull(); // covers: AC-DV2-202-2
    expect(container.querySelector('[src]')).toBeNull(); // covers: AC-DV2-202-2
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-202-3 — due layout distinti -> markup diverso su un asse strutturale VISIBILE.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-202 AC-DV2-202-3 — hero-full@1 vs hero-split@1 differiscono nella struttura, non solo nell attributo', () => {
  it('la foto passa da overlay full-bleed (absolute) a incorniciata affiancata (relative)', async () => {
    const block = gatedHeroBlock(CLEAN_CONTENT, CLEAN_DATA);
    const full = render(
      await Hero({ block, locale: 'it', design: { hero_layout_id: 'hero-full@1' } }),
    ).container;
    const split = render(
      await Hero({ block, locale: 'it', design: { hero_layout_id: 'hero-split@1' } }),
    ).container;

    const fullPhoto = full.querySelector('.site-photo-ph') as HTMLElement | null;
    const splitPhoto = split.querySelector('.site-photo-ph') as HTMLElement | null;

    expect(fullPhoto?.style.position).toBe('absolute'); // covers: AC-DV2-202-3
    expect(splitPhoto?.style.position).toBe('relative'); // covers: AC-DV2-202-3
    // La differenza NON e' il solo attributo data-hero-layout: e' la disposizione della foto.
    expect(fullPhoto?.style.position).not.toBe(splitPhoto?.style.position); // covers: AC-DV2-202-3
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-202-4 — testo hero OSTILE: escaping, nessun elemento/attributo iniettato, nessun src/href dal testo.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-202 AC-DV2-202-4 — payload ostile reso come TESTO, PhotoPlaceholder di catalogo, href solo statici', () => {
  it('titolo <img onerror> e sottotitolo javascript: non generano elementi/attributi ne src/href', async () => {
    const IMG_PAYLOAD = '<img src=x onerror=alert(1)>';
    const JS_PAYLOAD = 'Contattaci su javascript:alert(1) adesso';
    const block = gatedHeroBlock(
      { hero_title_kicker: 'Osteria', hero_title: IMG_PAYLOAD, hero_subtitle: JS_PAYLOAD },
      { business_name: 'Da Nonna Rosa' },
    );
    const { container } = render(
      await Hero({ block, locale: 'it', design: { hero_layout_id: 'hero-split@1' } }),
    );

    // Il payload compare VERBATIM come TESTO (l'asserzione non passa per vacuita').
    expect(container.textContent).toContain(IMG_PAYLOAD); // covers: AC-DV2-202-4
    expect(container.textContent).toContain('javascript:alert(1)'); // covers: AC-DV2-202-4

    // Nessun elemento iniettato: niente <img>, niente attributo onerror, niente tag <img reale nel markup.
    expect(container.querySelector('img')).toBeNull(); // covers: AC-DV2-202-4
    expect(container.querySelector('[onerror]')).toBeNull(); // covers: AC-DV2-202-4
    expect(container.innerHTML).not.toContain('<img src=x'); // covers: AC-DV2-202-4

    // Il PhotoPlaceholder resta di catalogo (etichetta i18n), non il testo ostile.
    const photo = container.querySelector('.site-photo-ph');
    expect(photo?.textContent?.startsWith('FOTO')).toBe(true); // covers: AC-DV2-202-4
    expect(photo?.textContent).toContain(PHOTO_LABEL_IT); // covers: AC-DV2-202-4

    // Nessun src; gli UNICI href sono le CTA statiche interne — nessun 'javascript:' nato dal testo.
    expect(container.querySelector('[src]')).toBeNull(); // covers: AC-DV2-202-4
    const hrefs = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? '');
    expect(hrefs).toEqual(['#offerte', '#contatti']); // covers: AC-DV2-202-4
    for (const href of hrefs) {
      expect(href.toLowerCase()).not.toContain('javascript:'); // covers: AC-DV2-202-4
    }
  });
});

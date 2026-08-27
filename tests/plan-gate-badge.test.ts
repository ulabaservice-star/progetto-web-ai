// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';
import { THEMES } from '@/domain/generation/themes';
import { parseDocument, type SiteBlock, type SiteDocument } from '@/domain/generation/document';
import { PLAN_LIMITS, type Entitlement } from '@/domain/billing/entitlement';

// BIL-302 (macrotask plan-gates, p5-billing-fase1) — ORACOLO del BADGE condizionale sul piano nella
// serving pubblica /s/<slug>. Le asserzioni derivano dagli acceptance_criteria AC-302-1/2/3
// (03-plan-gates.md), taggate `// covers:` sull'expect.
//
// COSA SI MOCKA E PERCHE'. Come public-site-route (T-405): notFound con throw-sentinel; getTranslations
// dai cataloghi REALI it/es (il badge e i landmark hanno etichette autentiche); readPublishedSite = il
// seam del documento pubblicato. IN PIU', il seam BIL-302: getPublicSiteEntitlement — l'entitlement
// dell'account del sito, che la serving consulta per decidere il badge. Pilotandolo Free/Pro/guasto si
// esercitano i tre criteri SENZA DB. Il renderer, il badge e il gate della page NON sono mockati: il
// badge e' montato (o no) dalla page reale, e la sua presenza si legge dal DOM (`[data-belora-badge]`).
//
// Il fail-safe REALE del reader (non risolvibile => free) e' provato a parte in
// tests/public-site-entitlement.test.ts; qui AC-302-3 prova l'altra meta': un guasto del reader non fa
// MAI sparire il badge dalla serving (la page degrada a Free, badge presente).

const { notFoundSpy } = vi.hoisted(() => {
  const sentinel = Symbol('not-found');
  return { notFoundSpy: vi.fn(() => { throw sentinel; }) };
});
vi.mock('next/navigation', () => ({ notFound: notFoundSpy, redirect: vi.fn() }));

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => {
    const cat = (locale === 'es' ? esMessages : itMessages) as Record<string, unknown>;
    const ns = ((cat[namespace] ?? {}) as Record<string, unknown>) ?? {};
    return (key: string) => {
      const value = key
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ns);
      return typeof value === 'string' ? value : `${namespace}.${key}`;
    };
  },
}));

const { pubHolder, readPublishedSiteSpy } = vi.hoisted(() => {
  const holder = { document: null as unknown, locale: 'it', slug: 'bar' };
  return {
    pubHolder: holder,
    readPublishedSiteSpy: vi.fn(async (slug: string) =>
      slug === holder.slug
        ? { document: holder.document, public_slug: slug, locale: holder.locale }
        : null,
    ),
  };
});
vi.mock('@/data/public-site', () => ({ readPublishedSite: readPublishedSiteSpy }));

const { entMock } = vi.hoisted(() => ({ entMock: vi.fn() }));
vi.mock('@/data/public-site-entitlement', () => ({ getPublicSiteEntitlement: entMock }));

// Import DOPO i mock.
import PublicSitePage from '@/app/s/[slug]/page';

const THEME = THEMES[0];
const SLUG = 'bar';

function heroBlock(title: string): SiteBlock {
  return {
    id: 'hero',
    content: { hero_title: title },
    data: {},
    brief_fields_rendered: [],
    images: [],
  };
}

const DOC: SiteDocument = {
  recipe_id: 'vetrina@1',
  theme_id: THEME.id,
  pages: [
    { slug: 'home', role: 'home', title: 'Benvenuti', meta_description: 'La home', blocks: [heroBlock('CIAO')] },
  ],
};

const FREE_ENT: Entitlement = { plan: 'free', limits: PLAN_LIMITS.free };
const PRO_ENT: Entitlement = { plan: 'pro', limits: PLAN_LIMITS.pro };

const renderPage = async (slug: string) =>
  render(await PublicSitePage({ params: Promise.resolve({ slug }) }));

beforeEach(() => {
  pubHolder.document = DOC;
  pubHolder.locale = 'it';
  pubHolder.slug = SLUG;
  notFoundSpy.mockClear();
  readPublishedSiteSpy.mockClear();
  entMock.mockReset();
});
afterEach(() => cleanup());

describe('BIL-302 — badge "Made with Belora" condizionale sul piano nella serving /s/<slug>', () => {
  it('sanity: la fixture del documento e VALIDA (altrimenti il render sarebbe vacuo)', () => {
    expect(parseDocument(DOC).ok).toBe(true);
  });

  // covers: AC-302-1
  it('account Free (no_badge=false) => il badge e PRESENTE nell output', async () => {
    entMock.mockResolvedValue(FREE_ENT);
    const { container } = await renderPage(SLUG);
    expect(container.querySelector('[data-belora-badge]')).not.toBeNull(); // covers: AC-302-1
    expect(notFoundSpy).not.toHaveBeenCalled(); // covers: AC-302-1
  });

  // covers: AC-302-2
  it('account Pro (no_badge=true) => il badge e ASSENTE', async () => {
    entMock.mockResolvedValue(PRO_ENT);
    const { container } = await renderPage(SLUG);
    expect(container.querySelector('[data-belora-badge]')).toBeNull(); // covers: AC-302-2
    // Controprova: la pagina si e' comunque resa (main presente), il badge manca per il piano, non per errore.
    expect(container.querySelector('main')).not.toBeNull(); // covers: AC-302-2
  });

  // covers: AC-302-3
  it('entitlement non risolvibile (il reader rigetta) => badge PRESENTE (fail-safe verso Free), mai assente per errore', async () => {
    entMock.mockRejectedValue(new Error('reader boom'));
    const { container } = await renderPage(SLUG);
    expect(container.querySelector('[data-belora-badge]')).not.toBeNull(); // covers: AC-302-3
    expect(container.querySelector('main')).not.toBeNull(); // covers: AC-302-3 — la pagina si serve comunque
  });
});

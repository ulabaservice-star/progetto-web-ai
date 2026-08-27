// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';
import { THEMES } from '@/domain/generation/themes';
import { type SiteBlock, type SiteDocument } from '@/domain/generation/document';
import { PLAN_LIMITS, type Entitlement } from '@/domain/billing/entitlement';

// BIL-303 (macrotask plan-gates, p5-billing-fase1) — ORACOLO dei campi SEO AVANZATI gated sul piano.
// Le asserzioni derivano dagli acceptance_criteria AC-303-1/2/3 (03-plan-gates.md), taggate `// covers:`.
//
// Insieme AVANZATO (esplicito e chiuso in questo task): twitter card + JSON-LD LocalBusiness. Insieme
// BASE (per tutti, Free incluso): title, description, canonical, openGraph completo (l'anteprima
// social del link condiviso — canale di acquisizione dei micro-business, non si degrada al Free) e la
// sitemap (gia' per tutti, non toccata qui). Il gate legge getPublicSiteEntitlement (seo_advanced);
// pilotandolo Free/Pro/guasto si esercitano i tre criteri senza DB. generateMetadata si ispeziona
// direttamente (oggetto Metadata); il JSON-LD (nel render) si legge dal DOM (`script[ld+json]`).

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
import PublicSitePage, { generateMetadata } from '@/app/s/[slug]/page';

const THEME = THEMES[0];
const SLUG = 'bar';

function heroBlock(title: string): SiteBlock {
  return {
    id: 'hero',
    content: { hero_title: title },
    data: { business_name: 'Trattoria Prova' },
    brief_fields_rendered: ['business_name'],
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

const meta = (slug: string) => generateMetadata({ params: Promise.resolve({ slug }) });
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

describe('BIL-303 — campi SEO avanzati gated sul piano (serving /s/<slug>)', () => {
  // covers: AC-303-1
  it('account Free => SEO BASE presente (title/description/canonical/openGraph) e AVANZATI assenti (twitter/JSON-LD)', async () => {
    entMock.mockResolvedValue(FREE_ENT);

    const m = await meta(SLUG);
    // Base per tutti: title, canonical E openGraph completo (anteprima social).
    expect(m.title).toBeTruthy(); // covers: AC-303-1 — SEO base
    expect(m.alternates?.canonical).toBeTruthy(); // covers: AC-303-1 — canonical base
    expect(m.openGraph).toBeDefined(); // covers: AC-303-1 — openGraph e' BASE (anche in Free)
    expect((m.openGraph as { url?: unknown }).url).toBeTruthy(); // covers: AC-303-1 — openGraph completo in Free
    // Avanzati ASSENTI in Free: twitter card + JSON-LD.
    expect(m.twitter).toBeUndefined(); // covers: AC-303-1 — twitter gated (Pro-only)

    const { container } = await renderPage(SLUG);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull(); // covers: AC-303-1 — JSON-LD gated
  });

  // covers: AC-303-2
  it('account Pro => SEO base E avanzati presenti (openGraph completo, twitter, JSON-LD)', async () => {
    entMock.mockResolvedValue(PRO_ENT);

    const m = await meta(SLUG);
    expect(m.title).toBeTruthy(); // covers: AC-303-2 — base
    expect(m.alternates?.canonical).toBeTruthy(); // covers: AC-303-2 — base
    // Avanzati PRESENTI in Pro: openGraph completo (url + locale della riga) + twitter.
    expect(m.openGraph).toBeDefined(); // covers: AC-303-2 — openGraph
    expect((m.openGraph as { url?: unknown }).url).toBeTruthy(); // covers: AC-303-2 — openGraph completo
    expect((m.openGraph as { locale?: unknown }).locale).toBe('it'); // covers: AC-303-2 — locale della riga
    expect(m.twitter).toBeDefined(); // covers: AC-303-2 — twitter

    const { container } = await renderPage(SLUG);
    expect(container.querySelector('script[type="application/ld+json"]')).not.toBeNull(); // covers: AC-303-2
  });

  // covers: AC-303-3
  it('entitlement non risolvibile (reader rigetta) => SEO base + openGraph, avanzati assenti (fail-safe verso Free)', async () => {
    entMock.mockRejectedValue(new Error('reader boom'));

    const m = await meta(SLUG);
    expect(m.title).toBeTruthy(); // covers: AC-303-3 — base c'e sempre
    expect(m.alternates?.canonical).toBeTruthy(); // covers: AC-303-3 — canonical base
    expect(m.openGraph).toBeDefined(); // covers: AC-303-3 — openGraph base anche in dubbio
    expect(m.twitter).toBeUndefined(); // covers: AC-303-3 — nessun avanzato in dubbio

    const { container } = await renderPage(SLUG);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull(); // covers: AC-303-3 — JSON-LD gated
  });
});

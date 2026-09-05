// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { BlogLocale, BlogPost, PostAlternate } from '@/domain/blog/content';

// PUB-431 (macrotask blog-post, p6a-public-surface) — ORACOLO della rotta del singolo post. Le
// asserzioni DERIVANO da AC-431-1..4 (19-blog-post.md), taggate `// covers: AC-431-<n>` sull'EXPECT.
//
// SEAM. Il loader di dominio @/domain/blog/content legge il filesystem (import 'server-only') → è
// MOCKATO con spie hoisted: così ogni test inietta il post che vuole (html già sanificato, frontmatter,
// controparti) senza dipendere dal seed reale (PUB-451). next/navigation.notFound è un throw-sentinel,
// come in produzione (in Next lancia per interrompere il render → 404). serializeJsonLdSafe resta REALE
// (non mockato): l'escaping anti-breakout del JSON-LD è provato sull'effetto, non sulla fiducia.

const { NOT_FOUND, notFoundSpy } = vi.hoisted(() => {
  const notFoundSentinel = Symbol('not-found');
  return {
    NOT_FOUND: notFoundSentinel,
    notFoundSpy: vi.fn(() => {
      throw notFoundSentinel;
    }),
  };
});

vi.mock('next/navigation', () => ({ notFound: notFoundSpy }));

const { getPostMock, resolveAlternatesMock, listPostsMock } = vi.hoisted(() => ({
  getPostMock: vi.fn(),
  resolveAlternatesMock: vi.fn(),
  listPostsMock: vi.fn(),
}));

vi.mock('@/domain/blog/content', () => ({
  getPost: getPostMock,
  resolvePostAlternates: resolveAlternatesMock,
  listPosts: listPostsMock,
}));

import BlogPostPage, {
  generateMetadata,
  generateStaticParams,
} from '@/app/[locale]/(marketing)/blog/[slug]/page';

const LANDING_URL = 'https://ulaba.net';
const SITE_URL = 'https://sites.ulaba.example'; // distinto dalla base landing (uccide la mutazione base)

// La sequenza di chiusura tag, spezzata in due letterali così che NON compaia mai grezza nel sorgente
// del test (che altrimenti la conterrebbe come stringa cercata).
const CLOSE_SCRIPT = '</' + 'script>';

function postWith(overrides: Partial<BlogPost>): BlogPost {
  return {
    slug: 'un-post',
    locale: 'it' as BlogLocale,
    frontmatter: {
      title: 'Titolo',
      description: 'Descrizione del post',
      date: '2026-03-01',
      translationKey: 'chiave',
    },
    html: '<p>corpo</p>',
    ...overrides,
  };
}

const renderPage = async (locale: string, slug: string) =>
  render(await BlogPostPage({ params: Promise.resolve({ locale, slug }) }));

const metaFor = (locale: string, slug: string) =>
  generateMetadata({ params: Promise.resolve({ locale, slug }) });

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_LANDING_URL', LANDING_URL);
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
  resolveAlternatesMock.mockReturnValue([]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-431-1 — l'html sanificato del corpo è reso, e nessuno <script> nasce dal corpo
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-431 blog post route — corpo sanificato via dangerouslySetInnerHTML (AC-431-1)', () => {
  it('rende post.html (<p>ciao</p>) e nessun <script> eseguibile dal corpo', async () => {
    getPostMock.mockReturnValue(
      postWith({ slug: 'ciao-post', html: '<p>ciao</p>', frontmatter: {
        title: 'Titolo diverso dal corpo',
        description: 'Descrizione del post',
        date: '2026-03-01',
        translationKey: 'chiave',
      } }),
    );

    await renderPage('it', 'ciao-post');

    // Il corpo sanificato è nel DOM (mutazione __html: post.html → post.frontmatter.title lo rimuove).
    expect(screen.getByText('ciao')).toBeTruthy(); // covers: AC-431-1
    // GLI UNICI <script> della pagina sono ld+json (non eseguibili): nessuno script è nato dal corpo.
    for (const el of document.querySelectorAll('script')) {
      expect(el.getAttribute('type')).toBe('application/ld+json'); // covers: AC-431-1
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-431-2 — JSON-LD Article (headline = frontmatter.title) serializzato in modo anti-breakout
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-431 blog post route — JSON-LD Article sicuro (AC-431-2)', () => {
  it('emette uno <script ld+json> @type Article con headline = title, con breakout del titolo neutralizzato', async () => {
    // Titolo OSTILE: tenta di chiudere il <script> e aprirne uno eseguibile. serializeJsonLdSafe deve
    // renderlo irrappresentabile come markup (una mutazione a JSON.stringify nudo lo lascerebbe passare).
    const hostileTitle = 'Titolo' + CLOSE_SCRIPT + '<script>alert(1)</script>';
    getPostMock.mockReturnValue(postWith({ frontmatter: {
      title: hostileTitle,
      description: 'Descrizione del post',
      date: '2026-03-01',
      translationKey: 'chiave',
    } }));

    await renderPage('it', 'un-post');

    const ldScripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    expect(ldScripts.length).toBeGreaterThanOrEqual(1); // covers: AC-431-2
    const text = ldScripts[0].textContent ?? '';

    // Anti-breakout sull'EFFETTO: nel testo montato non sopravvive la sequenza grezza di chiusura tag,
    // né alcun '<' grezzo; il '<' del titolo è diventato l'escape unicode.
    expect(text.includes(CLOSE_SCRIPT)).toBe(false); // covers: AC-431-2
    expect(text.includes('<')).toBe(false); // covers: AC-431-2
    expect(text).toContain('\\u003c'); // covers: AC-431-2

    // Round-trip TRASPARENTE: @type Article e headline = il titolo esatto (l'escape non corrompe il dato).
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed['@type']).toBe('Article'); // covers: AC-431-2
    expect(parsed.headline).toBe(hostileTitle); // covers: AC-431-2

    // Nessuno script ESEGUIBILE è nato dal breakout: gli unici <script> sono ld+json.
    for (const el of document.querySelectorAll('script')) {
      expect(el.getAttribute('type')).toBe('application/ld+json'); // covers: AC-431-2
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-431-3 — hreflang alternates SOLO fra traduzioni reali
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-431 blog post route — hreflang onesto (AC-431-3)', () => {
  it('post con controparte es → languages contiene la chiave es con l’URL del post es', async () => {
    getPostMock.mockReturnValue(postWith({ slug: 'primo' }));
    resolveAlternatesMock.mockReturnValue([
      { locale: 'es', slug: 'primo-es' } as PostAlternate,
    ]);

    const meta = await metaFor('it', 'primo');
    const languages = (meta.alternates?.languages ?? {}) as Record<string, string>;

    expect(meta.alternates?.canonical).toBe(`${LANDING_URL}/it/blog/primo`); // covers: AC-431-3
    expect(languages.es).toBe(`${LANDING_URL}/es/blog/primo-es`); // covers: AC-431-3
    expect(meta.alternates?.canonical).not.toBe(SITE_URL); // covers: AC-431-3 — mai l'host sito
  });

  it('post mono-lingua (nessuna controparte) → languages NON contiene la chiave dell’altro locale', async () => {
    getPostMock.mockReturnValue(postWith({ slug: 'solo-it' }));
    resolveAlternatesMock.mockReturnValue([]); // nessuna traduzione reale

    const meta = await metaFor('it', 'solo-it');
    const languages = (meta.alternates?.languages ?? {}) as Record<string, string>;

    // Nessun hreflang fittizio verso 'es' (mutazione "popola sempre entrambi i locali" → rossa qui).
    expect(languages.es).toBeUndefined(); // covers: AC-431-3
    expect(Object.keys(languages)).not.toContain('es'); // covers: AC-431-3
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-431-4 — slug inesistente → notFound() (404)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-431 blog post route — slug inesistente → 404 (AC-431-4)', () => {
  it('getPost → null fa chiamare notFound() e interrompe il render', async () => {
    getPostMock.mockReturnValue(null);

    await expect(renderPage('it', 'inesistente')).rejects.toBe(NOT_FOUND); // covers: AC-431-4
    expect(notFoundSpy).toHaveBeenCalledTimes(1); // covers: AC-431-4
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// DoD (oltre gli AC) — generateStaticParams enumera i post di TUTTI i locali → voci { locale, slug }
// ─────────────────────────────────────────────────────────────────────────────────────────────────
describe('PUB-431 blog post route — generateStaticParams su tutti i locali (DoD)', () => {
  it('enumera i post di it ed es come voci { locale, slug }', () => {
    listPostsMock.mockImplementation((locale: BlogLocale) =>
      locale === 'it'
        ? [{ slug: 'it-uno' }, { slug: 'it-due' }]
        : [{ slug: 'es-uno' }],
    );

    const params = generateStaticParams();

    expect(params).toEqual([
      { locale: 'it', slug: 'it-uno' },
      { locale: 'it', slug: 'it-due' },
      { locale: 'es', slug: 'es-uno' },
    ]);
  });
});

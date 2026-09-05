import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BlogLocale, BlogPostSummary, PostAlternate } from '@/domain/blog/content';

// PUB-441 (macrotask blog-sitemap, p6a-public-surface) — ORACOLO dell'estensione della sitemap landing
// con i POST del blog. Le asserzioni DERIVANO da AC-441-1..3 (20-blog-sitemap.md), taggate
// `// covers: AC-441-<n>` sulla riga dell'EXPECT.
//
// SEAM. sitemap() enumera i post via il loader di dominio @/domain/blog/content (listPosts +
// resolvePostAlternates), che legge il filesystem (import 'server-only'). Qui e' MOCKATO con spie hoisted:
// cosi' la fixture (una COPPIA tradotta it<->es + un post SOLO-it) e' INIETTATA nel test senza dipendere
// dal seed reale (PUB-451) ne dai file su content/blog. Gli accessor env restano REALI: la base assoluta
// e' pinnata via vi.stubEnv(NEXT_PUBLIC_LANDING_URL), cosi' gli url si ancorano a una base nota e la
// mutazione "url con base relativa" e' uccisa da AC-441-1.

const { listPostsMock, resolveAlternatesMock } = vi.hoisted(() => ({
  listPostsMock: vi.fn(),
  resolveAlternatesMock: vi.fn(),
}));

vi.mock('@/domain/blog/content', () => ({
  listPosts: listPostsMock,
  resolvePostAlternates: resolveAlternatesMock,
}));

import sitemap from '@/app/sitemap';

const LANDING_URL = 'https://ulaba.net';

type Entry = ReturnType<typeof sitemap>[number];
const languagesOf = (e: Entry): Record<string, string> =>
  (e.alternates?.languages ?? {}) as Record<string, string>;

// Riassunto sintetico di un post (senza HTML: le liste della sitemap non ne hanno bisogno).
function summary(slug: string, locale: BlogLocale, translationKey: string): BlogPostSummary {
  return {
    slug,
    locale,
    frontmatter: {
      title: `Titolo ${slug}`,
      description: `Descrizione di ${slug}`,
      date: '2026-03-01',
      translationKey,
    },
  };
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_LANDING_URL', LANDING_URL);

  // Fixture: it ha una COPPIA tradotta ('guida', translationKey k-guida) + un post SOLO-it ('solo-it',
  // k-solo); es ha solo la controparte ('guia', k-guida). listPosts switcha sul locale.
  listPostsMock.mockImplementation((locale: BlogLocale): BlogPostSummary[] => {
    if (locale === 'it') {
      return [summary('guida', 'it', 'k-guida'), summary('solo-it', 'it', 'k-solo')];
    }
    if (locale === 'es') {
      return [summary('guia', 'es', 'k-guida')];
    }
    return [];
  });

  // resolvePostAlternates switcha su (locale, slug): la coppia tradotta si rimanda a vicenda,
  // il post mono-lingua non ha alcuna controparte (array vuoto → nessun alternate fittizio, P6A-D9).
  resolveAlternatesMock.mockImplementation((locale: BlogLocale, slug: string): PostAlternate[] => {
    if (locale === 'it' && slug === 'guida') return [{ locale: 'es', slug: 'guia' }];
    if (locale === 'es' && slug === 'guia') return [{ locale: 'it', slug: 'guida' }];
    return []; // 'solo-it' (e qualunque altro) → mono-lingua
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-441-1 — i post di ENTRAMBI i locali entrano in sitemap, con url assoluto sulla base landing
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-441 blog sitemap — i post it ed es entrano con url assoluto (AC-441-1)', () => {
  it('include gli url `${base}/it/blog/guida` e `${base}/es/blog/guia`', () => {
    const map = sitemap();
    const urls = map.map((e) => e.url);

    // Ancorati alla base landing PINNATA (non un url qualsiasi): una mutazione a base relativa
    // (`/it/blog/guida`) romperebbe questi confronti assoluti.
    expect(urls.some((u) => u === `${LANDING_URL}/it/blog/guida`)).toBe(true); // covers: AC-441-1
    expect(urls.some((u) => u === `${LANDING_URL}/es/blog/guia`)).toBe(true); // covers: AC-441-1
    expect(map.find((e) => e.url === `${LANDING_URL}/it/blog/guida`)).toBeDefined(); // covers: AC-441-1
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-441-2 — il post tradotto ha alternates.languages con ENTRAMBE le chiavi it ed es
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-441 blog sitemap — hreflang it+es per il post tradotto (AC-441-2)', () => {
  it('la voce del post it "guida" ha languages { it, es } sugli url dei due post reali', () => {
    const entry = sitemap().find((e) => e.url === `${LANDING_URL}/it/blog/guida`);
    expect(entry).toBeDefined();
    const languages = languagesOf(entry!);

    expect('it' in languages).toBe(true); // covers: AC-441-2
    expect('es' in languages).toBe(true); // covers: AC-441-2
    expect(languages.it).toBe(`${LANDING_URL}/it/blog/guida`); // covers: AC-441-2
    expect(languages.es).toBe(`${LANDING_URL}/es/blog/guia`); // covers: AC-441-2
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-441-3 — il post mono-lingua NON ha alternate fittizio; la parte stabile resta (estensione additiva)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-441 blog sitemap — mono-lingua senza hreflang fittizio + parte stabile intatta (AC-441-3)', () => {
  it('la voce di "solo-it" NON ha la chiave es, e le voci stabili (home) restano presenti', () => {
    const map = sitemap();
    const solo = map.find((e) => e.url === `${LANDING_URL}/it/blog/solo-it`);
    expect(solo).toBeDefined();
    const languages = languagesOf(solo!);

    // Nessun alternate fittizio verso 'es' (mutazione "emetti sempre entrambi i locali" → rossa qui).
    expect('es' in languages).toBe(false); // covers: AC-441-3
    expect(languages.es).toBeUndefined(); // covers: AC-441-3

    // L'estensione e' ADDITIVA: le pagine stabili (home/privacy/indice blog) di PUB-311 non spariscono —
    // la voce home `${base}/it` deve restare presente.
    expect(map.some((e) => e.url === `${LANDING_URL}/it`)).toBe(true); // covers: AC-441-3
  });
});

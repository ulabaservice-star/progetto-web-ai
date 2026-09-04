import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// PUB-311 (macrotask seo-sitemap, p6a-public-surface) — ORACOLO della sitemap landing (/sitemap.xml). Le
// asserzioni DERIVANO da AC-311-1..3 (12-seo-sitemap.md), taggate `// covers: AC-311-<n>` sulla riga
// dell'EXPECT. Non si mocka nulla: sitemap() e' pura rispetto alla richiesta (nessun headers()); gli
// accessor env (getLandingBaseUrl/getSiteBaseUrl) restano REALI, pinnati via vi.stubEnv. Le due basi sono
// DISTINTE (landing != site) cosi' la mutazione getLandingBaseUrl->getSiteBaseUrl e' uccisa da AC-311-3.

import sitemap from '@/app/sitemap';
import { getLandingBaseUrl, getSiteBaseUrl } from '@/config/env';

const LANDING_URL = 'https://ulaba.net';
const SITE_URL = 'https://sites.ulaba.example'; // distinto dalla base landing (uccide la mutazione base)

type Entry = ReturnType<typeof sitemap>[number];
const languagesOf = (e: Entry): Record<string, string> =>
  (e.alternates?.languages ?? {}) as Record<string, string>;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_LANDING_URL', LANDING_URL);
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-311-1 — voce home con alternates.languages { it, es } su base landing
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-311 sitemap landing — voce home con hreflang IT/ES (AC-311-1)', () => {
  // covers: AC-311-1
  it('home => alternates.languages { it: `${base}/it`, es: `${base}/es` }', () => {
    const base = getLandingBaseUrl();
    const home = sitemap().find((e) => e.url === `${base}/it`);
    expect(home).toBeDefined(); // covers: AC-311-1 — esiste la voce home (default locale prefissato)
    expect(languagesOf(home!)).toEqual({
      it: `${base}/it`,
      es: `${base}/es`,
    }); // covers: AC-311-1
    // Base landing pinnata: non un valore qualsiasi, proprio l'host landing di config.
    expect(languagesOf(home!).it).toBe(`${LANDING_URL}/it`); // covers: AC-311-1
    expect(languagesOf(home!).es).toBe(`${LANDING_URL}/es`); // covers: AC-311-1
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-311-2 — esiste la voce /privacy (localizzata it/es) con alternates.languages { it, es }
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-311 sitemap landing — voce /privacy con hreflang IT/ES (AC-311-2)', () => {
  // covers: AC-311-2
  it('esiste una voce il cui percorso e /privacy, con alternates.languages { it, es }', () => {
    const base = getLandingBaseUrl();
    const privacy = sitemap().find((e) => /\/privacy$/.test(e.url));
    expect(privacy).toBeDefined(); // covers: AC-311-2 — la pagina privacy e' in sitemap
    expect(languagesOf(privacy!)).toEqual({
      it: `${base}/it/privacy`,
      es: `${base}/es/privacy`,
    }); // covers: AC-311-2 — localizzata nelle due lingue
  });

  it('esiste anche la voce indice /blog (pagina stabile), ma nessun post singolo', () => {
    const base = getLandingBaseUrl();
    const map = sitemap();
    const blog = map.find((e) => /\/blog$/.test(e.url));
    expect(blog).toBeDefined();
    expect(languagesOf(blog!)).toEqual({
      it: `${base}/it/blog`,
      es: `${base}/es/blog`,
    });
    // Solo le 3 pagine stabili: home, /privacy, indice /blog. Nessuna voce per i singoli post (PUB-441).
    expect(map).toHaveLength(3);
    expect(map.some((e) => /\/blog\/.+/.test(e.url))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-311-3 — l'origine di ogni URL e' quella landing, mai quella del sito (getSiteBaseUrl)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-311 sitemap landing — origine sempre host landing, mai host sito (AC-311-3)', () => {
  // covers: AC-311-3
  it('ogni loc (e ogni hreflang) ha origine getLandingBaseUrl, non getSiteBaseUrl', () => {
    const landingOrigin = new URL(getLandingBaseUrl()).origin;
    const siteOrigin = new URL(getSiteBaseUrl()).origin;
    expect(landingOrigin).not.toBe(siteOrigin); // pre-condizione: le due basi divergono davvero

    for (const entry of sitemap()) {
      expect(new URL(entry.url).origin).toBe(landingOrigin); // covers: AC-311-3
      expect(new URL(entry.url).origin).not.toBe(siteOrigin); // covers: AC-311-3
      for (const href of Object.values(languagesOf(entry))) {
        expect(new URL(href).origin).toBe(landingOrigin); // covers: AC-311-3 — anche gli hreflang
      }
    }
  });
});

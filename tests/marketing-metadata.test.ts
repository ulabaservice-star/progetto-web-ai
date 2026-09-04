import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';

// PUB-321 (macrotask seo-metadata, p6a-public-surface) — ORACOLO dei metadati della HOME marketing. Le
// asserzioni DERIVANO da AC-321-1..4 (13-seo-metadata.md), taggate `// covers: AC-321-<n>` sull'EXPECT.
// getTranslations di next-intl/server è mockato per risolvere dai cataloghi REALI it/es (idioma
// dashboard-onboarding-cta): così il test misura la SCELTA DELLE CHIAVI (landing.meta.*), non stringhe
// del test. Gli accessor env (getLandingBaseUrl/getSiteBaseUrl) restano REALI, pinnati via vi.stubEnv, con
// landing != site: così la mutazione canonical getLandingBaseUrl->getSiteBaseUrl (Host della richiesta) è
// uccisa da AC-321-1.

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => {
    const cat = (locale === 'es' ? esMessages : itMessages) as Record<string, unknown>;
    const ns = namespace
      .split('.')
      .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], cat) as Record<string, unknown>;
    return (key: string) => {
      const value = (ns ?? {})[key];
      return typeof value === 'string' ? value : `${namespace}.${key}`;
    };
  },
}));

import { generateMetadata } from '@/app/[locale]/(marketing)/page';
import { getLandingBaseUrl } from '@/config/env';

const LANDING_URL = 'https://ulaba.net';
const SITE_URL = 'https://sites.ulaba.example'; // distinto dalla base landing (uccide la mutazione base)

const metaFor = (locale: 'it' | 'es') =>
  generateMetadata({ params: Promise.resolve({ locale }) });

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_LANDING_URL', LANDING_URL);
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-321-1 — canonical = host landing, indipendente dal locale (mai l'Host della richiesta / il sito)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-321 marketing metadata — canonical fisso landing (AC-321-1)', () => {
  it('il canonical della home vale getLandingBaseUrl(), lo stesso in it ed es', async () => {
    const base = getLandingBaseUrl();
    const it = await metaFor('it');
    const es = await metaFor('es');

    expect(it.alternates?.canonical).toBe(base); // covers: AC-321-1
    expect(it.alternates?.canonical).toBe(`${LANDING_URL}`); // covers: AC-321-1 — proprio l'host landing di config
    expect(es.alternates?.canonical).toBe(base); // covers: AC-321-1 — invariato al variare del locale
    // Base landing != base sito (pinnata): il canonical non deriva mai dal sito/Host della richiesta.
    expect(it.alternates?.canonical).not.toBe(SITE_URL); // covers: AC-321-1
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-321-2 — og:image 1200×630
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-321 marketing metadata — og:image 1200×630 (AC-321-2)', () => {
  it('openGraph.images[0] ha width 1200 e height 630', async () => {
    const meta = await metaFor('it');
    const images = meta.openGraph?.images;
    const first = Array.isArray(images) ? images[0] : images;
    expect(first).toMatchObject({ width: 1200, height: 630 }); // covers: AC-321-2
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-321-3 — alternates.languages contiene it ed es (hreflang HTML-level reciproco)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-321 marketing metadata — hreflang it/es (AC-321-3)', () => {
  it('alternates.languages contiene le chiavi it ed es, su base landing', async () => {
    const base = getLandingBaseUrl();
    const meta = await metaFor('it');
    const languages = (meta.alternates?.languages ?? {}) as Record<string, string>;

    expect(Object.keys(languages)).toEqual(expect.arrayContaining(['it', 'es'])); // covers: AC-321-3
    expect(languages.it).toBe(`${base}/it`); // covers: AC-321-3
    expect(languages.es).toBe(`${base}/es`); // covers: AC-321-3 — il ramo es esiste (uccide la mutazione "rimuovi es")
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-321-4 — twitter.card = 'summary_large_image'
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-321 marketing metadata — twitter card (AC-321-4)', () => {
  it("twitter.card vale 'summary_large_image'", async () => {
    const meta = await metaFor('it');
    // La union Twitter di Next non espone `card` in accesso diretto (un membro ne è privo): si asserisce
    // sull'oggetto con toMatchObject, senza accedere alla proprietà sul tipo union.
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' }); // covers: AC-321-4
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Localizzazione (oltre gli AC): title/description vengono da landing.meta.* del catalogo del locale,
// così un cambio di namespace/chiave o un calco IT in ES viene colto.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
describe('PUB-321 marketing metadata — title/description localizzati da landing.meta', () => {
  it('title/description sono le stringhe del catalogo del locale (it != es)', async () => {
    const it = await metaFor('it');
    const es = await metaFor('es');

    expect(it.title).toBe(itMessages.landing.meta.title);
    expect(it.description).toBe(itMessages.landing.meta.description);
    expect(es.title).toBe(esMessages.landing.meta.title);
    expect(es.title).not.toBe(itMessages.landing.meta.title); // ES localizzato, non calco dell'IT
  });
});

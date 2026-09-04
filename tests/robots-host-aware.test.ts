import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// PUB-301 (macrotask seo-robots, p6a-public-surface) — ORACOLO di robots() host-aware (P6A-D8). Le
// asserzioni DERIVANO da AC-301-1..3 (11-seo-robots.md), taggate `// covers: AC-301-<n>` sulla riga
// dell'EXPECT. Si mocka SOLO next/headers (il TRASPORTO dell'Host, come auth-google-oauth.test.ts);
// classifyRequestHost e gli accessor env (getAppHost/getLandingHost/getLandingBaseUrl/getSiteBaseUrl)
// restano REALI, pinnati via vi.stubEnv. Le tre basi sono DISTINTE (landing != site) cosi' la mutazione
// getLandingBaseUrl->getSiteBaseUrl e' uccisa da AC-301-1.

const HOST = { value: '' };
vi.mock('next/headers', () => ({
  headers: async () => new Headers(HOST.value ? { host: HOST.value } : {}),
}));

import robots from '@/app/robots';
import { getLandingBaseUrl } from '@/config/env';

const LANDING_URL = 'https://ulaba.net';
const APP_URL = 'https://app.ulaba.net';
const SITE_URL = 'https://sites.ulaba.example'; // distinto dalla base landing (uccide la mutazione base)
const LANDING_HOST = 'ulaba.net';
const APP_HOST = 'app.ulaba.net';

// Normalizza la parte `rules` (oggetto singolo o array) e i campi allow/disallow (stringa o array).
type Robots = Awaited<ReturnType<typeof robots>>;
const rulesOf = (r: Robots) => (Array.isArray(r.rules) ? r.rules : [r.rules!]);
const asArray = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_LANDING_URL', LANDING_URL);
  vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL);
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
  HOST.value = '';
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-301-1 — Host landing: marketing indicizzabile (allow '/' e '/s/'), Disallow editor/preview,
// Sitemap = base LANDING
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-301 robots host-aware — Host landing indicizzabile con Sitemap landing (AC-301-1)', () => {
  // covers: AC-301-1
  it('Host = landing => allow include "/" e "/s/", disallow include editor/preview, sitemap = base landing', async () => {
    HOST.value = LANDING_HOST;
    const r = await robots();
    const allow = rulesOf(r).flatMap((rule) => asArray(rule.allow));
    const disallow = rulesOf(r).flatMap((rule) => asArray(rule.disallow));

    expect(allow).toContain('/'); // covers: AC-301-1 — la home di marketing e' indicizzabile
    expect(allow).toContain('/s/'); // covers: AC-301-1 — i siti pubblicati restano indicizzabili
    expect(disallow).toContain('/*/editor'); // covers: AC-301-1
    expect(disallow).toContain('/*/preview'); // covers: AC-301-1
    // La riga Sitemap punta alla sitemap LANDING (getLandingBaseUrl), mai getSiteBaseUrl.
    expect(r.sitemap).toBe(`${getLandingBaseUrl()}/sitemap.xml`); // covers: AC-301-1
    expect(r.sitemap).toBe(`${LANDING_URL}/sitemap.xml`); // covers: AC-301-1 — base landing pinnata
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-301-2 — Host app: disallow-all, nessuna regola di marketing, nessuna Sitemap landing
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-301 robots host-aware — Host app disallow-all (AC-301-2)', () => {
  // covers: AC-301-2
  it('Host = app => disallow "/" (disallow-all), nessuna proprieta sitemap, nessuna allow di marketing', async () => {
    HOST.value = APP_HOST;
    const r = await robots();
    const disallow = rulesOf(r).flatMap((rule) => asArray(rule.disallow));
    const allow = rulesOf(r).flatMap((rule) => asArray(rule.allow));

    expect(disallow).toEqual(['/']); // covers: AC-301-2 — disallow totale
    expect(allow).toEqual([]); // covers: AC-301-2 — nessuna regola di marketing (allow assente)
    expect(r.sitemap).toBeUndefined(); // covers: AC-301-2 — nessuna riga Sitemap landing
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// AC-301-3 — nessun leak dell'host app dal robots landing
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('PUB-301 robots host-aware — nessun leak dell host app dal robots landing (AC-301-3)', () => {
  // covers: AC-301-3
  it('robots() con Host landing serializzato non contiene mai il valore di NEXT_PUBLIC_APP_URL', async () => {
    HOST.value = LANDING_HOST;
    const serialized = JSON.stringify(await robots());
    expect(serialized).not.toContain(APP_HOST); // covers: AC-301-3 — mai app.* dal robots landing
    expect(serialized).not.toContain(APP_URL); // covers: AC-301-3 — ne l'URL app completo
  });
});

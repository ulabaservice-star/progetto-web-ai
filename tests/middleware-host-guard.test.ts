import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// PUB-111 — Guard host SIMMETRICO nel middleware UNICO (p6a-public-surface). Sullo stesso monolite,
// una rotta d'APP vista sull'Host della LANDING => 308 verso l'app; una pagina MARKETING vista
// sull'Host dell'APP => 308 verso la landing. Confini netti, canonical stabile (P6A-D2), destinazione
// con hostname FISSO da env (anti open-redirect). NON si toccano /s/*, il ramo host-custom dei domini
// cliente, ne' la guardia auth (non-regressione: auth-middleware / public-exclusion / host-routing).
// Mockiamo le stesse tre cuciture del test host-routing (DOM-402) per osservare la DECISIONE senza
// rete ne' next-intl reale:
//  - next-intl `createMiddleware` -> una spia (`handleI18n`): vediamo SE il locale middleware viene
//    invocato (il guard NON deve invocarlo quando rimbalza; deve invocarlo quando prosegue).
//  - `getUserFromRequest` -> per non toccare Supabase nella guardia auth.
//  - `readSiteSlugForHost` -> la lookup anon host->slug: ne osserviamo l'ASSENZA per la landing
//    (piattaforma) e la PRESENZA per un dominio cliente (ramo host-custom invariato).
const { readSiteSlugForHostMock, handleI18nSpy, createMiddlewareMock, getUserFromRequestMock } =
  vi.hoisted(() => {
    const handleI18nSpy = vi.fn();
    return {
      handleI18nSpy,
      createMiddlewareMock: vi.fn(() => handleI18nSpy),
      getUserFromRequestMock: vi.fn(),
      readSiteSlugForHostMock: vi.fn(),
    };
  });

vi.mock('next-intl/middleware', () => ({ default: createMiddlewareMock }));
vi.mock('@/data/supabase-ssr', () => ({ getUserFromRequest: getUserFromRequestMock }));
vi.mock('@/data/public-domain', () => ({ readSiteSlugForHost: readSiteSlugForHostMock }));

// Import DOPO i mock (vi.mock e' hoisted): la funzione middleware reale + il predicato marketing.
import middleware, { isMarketingPath } from '@/middleware';

const APP_URL = 'https://app.ulaba.net';
const LANDING_URL = 'https://ulaba.net';

// L'URL della NextRequest e' sempre http://localhost: l'Host di piattaforma vero e' deciso
// dall'header Host, non dall'authority dell'URL (cosi' un Host non e' vero-per-costruzione).
const run = (pathname: string, host?: string) =>
  middleware(
    new NextRequest(
      new URL(pathname, 'http://localhost'),
      host ? { headers: { host } } : undefined,
    ),
  );

describe('PUB-111 middleware: guard host simmetrico app <-> landing', () => {
  let savedApp: string | undefined;
  let savedLanding: string | undefined;

  beforeEach(() => {
    savedApp = process.env.NEXT_PUBLIC_APP_URL;
    savedLanding = process.env.NEXT_PUBLIC_LANDING_URL;
    process.env.NEXT_PUBLIC_APP_URL = APP_URL;
    process.env.NEXT_PUBLIC_LANDING_URL = LANDING_URL;
    handleI18nSpy.mockReset();
    handleI18nSpy.mockReturnValue(NextResponse.next());
    getUserFromRequestMock.mockReset();
    getUserFromRequestMock.mockResolvedValue(null);
    readSiteSlugForHostMock.mockReset();
    readSiteSlugForHostMock.mockResolvedValue(null);
  });

  afterEach(() => {
    // Ripristino onesto dell'ambiente: NEXT_PUBLIC_LANDING_URL non e' usato da nessun altro test,
    // non lo lasciamo trapelare.
    if (savedApp === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = savedApp;
    if (savedLanding === undefined) delete process.env.NEXT_PUBLIC_LANDING_URL;
    else process.env.NEXT_PUBLIC_LANDING_URL = savedLanding;
  });

  // AC-111-1 — Host landing + rotta d'APP: 308 verso app., pathname+query preservati; il locale
  // middleware e la guardia auth NON vengono invocati (il rimbalzo precede il flusso di piattaforma).
  it('AC-111-1: landing host + /it/dashboard -> 308 verso app. (query preservata), senza locale/guardia', async () => {
    const res = await run('/it/dashboard?foo=bar', 'ulaba.net');

    expect(res.status).toBe(308); // covers: AC-111-1
    const loc = new URL(res.headers.get('location') as string);
    expect(loc.hostname).toBe('app.ulaba.net'); // covers: AC-111-1
    expect(loc.pathname).toBe('/it/dashboard'); // covers: AC-111-1
    expect(loc.search).toBe('?foo=bar'); // covers: AC-111-1
    expect(handleI18nSpy).not.toHaveBeenCalled(); // covers: AC-111-1
    expect(getUserFromRequestMock).not.toHaveBeenCalled(); // covers: AC-111-1
  });

  // AC-111-2 — Host app + pagina MARKETING: 308 verso la landing, pathname preservato.
  it('AC-111-2: app host + /it/blog -> 308 verso la landing', async () => {
    const res = await run('/it/blog', 'app.ulaba.net');

    expect(res.status).toBe(308); // covers: AC-111-2
    const loc = new URL(res.headers.get('location') as string);
    expect(loc.hostname).toBe('ulaba.net'); // covers: AC-111-2
    expect(loc.pathname).toBe('/it/blog'); // covers: AC-111-2
    expect(handleI18nSpy).not.toHaveBeenCalled(); // covers: AC-111-2
  });

  // AC-111-3 — Host landing + home marketing /it: NESSUN redirect di guard (la home landing e'
  // servita, il flusso di piattaforma prosegue) e readSiteSlugForHost NON viene invocato: la landing
  // e' piattaforma, non un host-custom.
  it('AC-111-3: landing host + /it (home marketing) -> nessun redirect di guard; nessuna lookup host->slug', async () => {
    const res = await run('/it', 'ulaba.net');

    expect(res.status).not.toBe(308); // covers: AC-111-3
    expect(res.headers.get('location')).toBeNull(); // covers: AC-111-3
    // la landing prosegue nel flusso di piattaforma: il locale middleware viene invocato per /it.
    expect(handleI18nSpy).toHaveBeenCalledTimes(1); // covers: AC-111-3
    // e la landing non tocca il DB dei domini cliente.
    expect(readSiteSlugForHostMock).not.toHaveBeenCalled(); // covers: AC-111-3
  });

  // AC-111-4 — Host di un dominio CLIENTE: il ramo host-custom resta invariato (readSiteSlugForHost
  // invocato con quell'host) e NESSUN 308 di guard parte verso app/landing.
  it('AC-111-4: host cliente (iltuobar.it) -> ramo host-custom invariato (lookup invocata), nessun 308 di guard', async () => {
    const res = await run('/it', 'iltuobar.it');

    expect(readSiteSlugForHostMock).toHaveBeenCalledWith('iltuobar.it'); // covers: AC-111-4
    expect(res.status).not.toBe(308); // covers: AC-111-4
    expect(res.headers.get('location')).toBeNull(); // covers: AC-111-4
  });

  // AC-111-5 — FAIL-SAFE: NEXT_PUBLIC_LANDING_URL assente + Host app + pagina marketing => nessun
  // redirect verso una landing (getLandingHost null) e la richiesta prosegue nel flusso odierno.
  it('AC-111-5: LANDING assente + app host + /it/blog -> fail-safe: nessun 308, il flusso odierno prosegue', async () => {
    delete process.env.NEXT_PUBLIC_LANDING_URL;
    const res = await run('/it/blog', 'app.ulaba.net');

    expect(res.status).not.toBe(308); // covers: AC-111-5
    expect(res.headers.get('location')).toBeNull(); // covers: AC-111-5
    expect(handleI18nSpy).toHaveBeenCalledTimes(1); // covers: AC-111-5
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUB-111 — Proprieta' del predicato marketing (osservabilita', schema come T-406/DOM-402): il
// guard sopra prova l'ESITO nei casi nominali; qui si prova il CONFINE ESATTO di isMarketingPath,
// l'oracolo su cui il guard decide l'appartenenza alla superficie marketing. Costruito dal predicato
// ESPORTATO dal modulo (mai da una copia), cosi' una mutazione del confine lo rende rosso.
import { routing } from '@/i18n/routing';

describe('PUB-111 isMarketingPath: confine esatto della superficie marketing', () => {
  it('vero per home/blog/privacy localizzati (ogni locale supportato), falso per app/radice/standalone', () => {
    expect(routing.locales.length).toBeGreaterThan(0); // anti-vacuita'

    const marketing = routing.locales.flatMap((l) => [
      `/${l}`, // home marketing
      `/${l}/blog`, // indice blog
      `/${l}/blog/come-creare-un-sito`, // sotto-path del blog
      `/${l}/privacy`, // privacy (pagina esatta)
    ]);
    for (const p of marketing) {
      expect(isMarketingPath(p), p).toBe(true); // covers: AC-111-2, AC-111-3
    }

    // NON marketing: la radice nuda, le rotte d'app, lo standalone /s/*, e il confine lasco
    // (/it/privacy/extra non e' la privacy; /support inizia per 's' ma non e' localizzato).
    for (const p of [
      '/',
      '/it/dashboard',
      '/it/login',
      '/es/onboarding/00000000-0000-0000-0000-0000000000aa',
      '/s',
      '/s/shop',
      '/it/privacy/extra',
      '/support',
      '/it/blogx',
    ]) {
      expect(isMarketingPath(p), p).toBe(false); // covers: AC-111-1 (app-path = complemento)
    }
  });
});

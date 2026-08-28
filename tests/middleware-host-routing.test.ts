import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// DOM-402 — Host-routing per domini custom nel middleware UNICO. Un Host di
// PIATTAFORMA (apex dell'app + sottodomini, localhost/preview) segue il flusso
// esistente INVARIATO (locale + guardia auth). Un Host CUSTOM risolto a uno slug
// ATTIVO viene servito come il sito standalone: rewrite INTERNO verso /s/<slug>
// (nessun prefisso di locale, querystring preservata). Un Host custom NON risolto
// degrada nel flusso di piattaforma (fail-closed, A01:2025). Mockiamo tre cuciture
// per osservare la DECISIONE senza rete ne' next-intl reale:
//  - next-intl `createMiddleware` → una spia (`handleI18n`): vediamo SE il locale
//    middleware viene invocato o NO (non-regressione + fallback host-custom).
//  - `getUserFromRequest` (@/data/supabase-ssr) → per non toccare Supabase nella
//    guardia auth (AC-402-2 esercita una route protetta senza sessione).
//  - `readSiteSlugForHost` (@/data/public-domain) → la lookup anon host→slug: la
//    pilotiamo (slug attivo | null) e ne osserviamo l'invocazione (o la sua
//    ASSENZA per gli host di piattaforma e i path riservati).
const { readSiteSlugForHostMock, handleI18nSpy, createMiddlewareMock, getUserFromRequestMock } =
  vi.hoisted(() => {
    const handleI18nSpy = vi.fn();
    return {
      handleI18nSpy,
      // createMiddleware(routing) → restituisce la spia: nel modulo diventa handleI18n.
      createMiddlewareMock: vi.fn(() => handleI18nSpy),
      getUserFromRequestMock: vi.fn(),
      readSiteSlugForHostMock: vi.fn(),
    };
  });

vi.mock('next-intl/middleware', () => ({ default: createMiddlewareMock }));
vi.mock('@/data/supabase-ssr', () => ({ getUserFromRequest: getUserFromRequestMock }));
vi.mock('@/data/public-domain', () => ({ readSiteSlugForHost: readSiteSlugForHostMock }));

// Import DOPO i mock (vi.mock è hoisted): la funzione middleware reale.
import middleware from '@/middleware';

// Costruisce la richiesta col solo Host header rilevante. L'URL è sempre
// http://localhost (l'host di PIATTAFORMA vero e proprio è deciso dall'header Host,
// non dall'authority dell'URL): così un Host custom non è vero-per-costruzione.
const run = (pathname: string, host?: string) =>
  middleware(
    new NextRequest(
      new URL(pathname, 'http://localhost'),
      host ? { headers: { host } } : undefined,
    ),
  );

describe('DOM-402 middleware: host-routing per domini custom', () => {
  beforeEach(() => {
    // L'apex di piattaforma: ulaba.net e i suoi sottodomini sono PIATTAFORMA,
    // tutto il resto è un dominio CUSTOM candidato all'host-routing.
    process.env.NEXT_PUBLIC_APP_URL = 'https://ulaba.net';
    handleI18nSpy.mockReset();
    handleI18nSpy.mockReturnValue(NextResponse.next());
    getUserFromRequestMock.mockReset();
    getUserFromRequestMock.mockResolvedValue(null);
    readSiteSlugForHostMock.mockReset();
  });

  // AC-402-1 — Host custom risolto a uno slug ATTIVO: rewrite interno verso
  // /s/<slug>, SENZA prefisso di locale, e il locale middleware NON viene invocato.
  it('AC-402-1: Host custom risolto → rewrite verso /s/<slug> senza prefisso di locale', async () => {
    readSiteSlugForHostMock.mockResolvedValue({ public_slug: 'il-tuo-bar' });
    const res = await run('/', 'iltuobar.it');

    const rewrite = res.headers.get('x-middleware-rewrite');
    expect(rewrite).not.toBeNull(); // covers: AC-402-1
    const target = new URL(rewrite as string);
    // il sito standalone, non un percorso localizzato…
    expect(target.pathname).toBe('/s/il-tuo-bar'); // covers: AC-402-1
    // …e NESSUN prefisso di locale (non inizia con /it o /es).
    expect(target.pathname.startsWith('/it')).toBe(false); // covers: AC-402-1
    expect(target.pathname.startsWith('/es')).toBe(false); // covers: AC-402-1
    // la negoziazione di locale non è nemmeno stata invocata.
    expect(handleI18nSpy).not.toHaveBeenCalled(); // covers: AC-402-1
  });

  // AC-402-2 — Host di PIATTAFORMA: comportamento INVARIATO. /it/dashboard senza
  // sessione → redirect 307 a /it/login (come oggi), e la lookup host→slug non
  // viene NEMMENO tentata (gli host di piattaforma saltano del tutto il DB).
  it('AC-402-2: Host di piattaforma → flusso invariato (307 a /it/login), nessuna lookup host→slug', async () => {
    getUserFromRequestMock.mockResolvedValue(null);
    const res = await run('/it/dashboard', 'ulaba.net');

    expect(res.status).toBe(307); // covers: AC-402-2
    expect(new URL(res.headers.get('location') as string).pathname).toBe('/it/login'); // covers: AC-402-2
    // Host di piattaforma: nessun tocco al DB dei domini.
    expect(readSiteSlugForHostMock).not.toHaveBeenCalled(); // covers: AC-402-2
  });

  // AC-402-3 — Host custom NON risolto (readSiteSlugForHost → null): NESSUN rewrite
  // verso /s/*, si degrada nel flusso di piattaforma (fail-closed). Per la home '/'
  // il flusso di piattaforma invoca il locale middleware.
  it('AC-402-3: Host custom non risolto → nessun rewrite, degrada nel flusso di piattaforma', async () => {
    readSiteSlugForHostMock.mockResolvedValue(null);
    const res = await run('/', 'attaccante.example');

    // nessun rewrite host-custom: l'header non è presente.
    expect(res.headers.get('x-middleware-rewrite')).toBeNull(); // covers: AC-402-3
    // la lookup È stata tentata (host custom) ma ha detto null…
    expect(readSiteSlugForHostMock).toHaveBeenCalledWith('attaccante.example'); // covers: AC-402-3
    // …e il flusso prosegue in platformFlow → il locale middleware viene invocato.
    expect(handleI18nSpy).toHaveBeenCalled(); // covers: AC-402-3
  });

  // AC-402-4 — Il rewrite verso /s/<slug> PRESERVA la querystring della richiesta.
  it('AC-402-4: rewrite verso /s/<slug> preserva la querystring', async () => {
    readSiteSlugForHostMock.mockResolvedValue({ public_slug: 'il-tuo-bar' });
    const res = await run('/?utm=x', 'iltuobar.it');

    const target = new URL(res.headers.get('x-middleware-rewrite') as string);
    expect(target.pathname).toBe('/s/il-tuo-bar'); // covers: AC-402-4
    expect(target.search).toBe('?utm=x'); // covers: AC-402-4
  });

  // AC-402-5 — I path RISERVATI /s/* e /api NON vengono ri-riscritti (no ricorsione):
  // anche con un Host custom ATTIVO, la lookup host→slug non viene nemmeno tentata,
  // e il path prosegue nel flusso di piattaforma.
  describe('AC-402-5: i path riservati /s e /api non vengono ri-riscritti (no ricorsione)', () => {
    it('(a) /s/* con Host custom attivo: nessuna lookup, nessun rewrite host-custom', async () => {
      readSiteSlugForHostMock.mockResolvedValue({ public_slug: 'x' });
      const res = await run('/s/gia-servito', 'iltuobar.it');

      // reserved path: la lookup non parte affatto…
      expect(readSiteSlugForHostMock).not.toHaveBeenCalled(); // covers: AC-402-5
      // …e /s/* prosegue nel flusso di piattaforma (NextResponse.next, locale NON invocato).
      expect(handleI18nSpy).not.toHaveBeenCalled(); // covers: AC-402-5
      // nessun rewrite verso /s/x (il path resta /s/gia-servito).
      expect(res.headers.get('x-middleware-rewrite')).toBeNull(); // covers: AC-402-5
    });

    it('(b) /api/* con Host custom attivo: nessuna lookup host→slug', async () => {
      readSiteSlugForHostMock.mockResolvedValue({ public_slug: 'x' });
      await run('/api/qualcosa', 'iltuobar.it');

      // reserved path: nessun rewrite host-custom, la lookup non viene tentata.
      expect(readSiteSlugForHostMock).not.toHaveBeenCalled(); // covers: AC-402-5
    });
  });
});

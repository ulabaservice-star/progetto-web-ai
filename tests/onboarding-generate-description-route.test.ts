// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

// OGW-302 (macrotask generate-description) — ORACOLO dell'endpoint genera-descrizione.
// Le asserzioni derivano da AC-302-1/2/3 (03-generate-description.md); ognuna e' taggata
// `// covers: AC-302-<n>`.
//
// Cosa si mocka e perche' NON e' hollow:
//  - @/data/supabase-ssr getUser, @/data/sites listSites, @/data/briefs getBrief: i seam
//    delle guardie condivise (identita' / proprieta' P1-D21 / brief per il vertical).
//  - @/data/anthropic runOnboardingTurn: si mocka il CONFINE LLM (T-131), NON il dominio.
//    Cosi' generateDescription (OGW-301) gira per davvero e la validazione dell'output e'
//    esercitata dal codice di produzione (onboardingLlmPort === runOnboardingTurn).
//  - @/data/ai-usage createAiUsagePort: la porta del contatore d'uso AI (OGW-101) e' un
//    DOPPIO in-memory {siteId,kind,at}; e' cio' che rende osservabili l'incremento (AC-302-2)
//    e il cap che nega senza consumare (AC-302-3), senza DB ne' tempo reale.

const { authHolder } = vi.hoisted(() => ({ authHolder: { user: null as { id: string } | null } }));
vi.mock('@/data/supabase-ssr', () => ({ getUser: async () => authHolder.user }));

const { sitesHolder, listSitesSpy } = vi.hoisted(() => {
  const holder = { list: { ok: true, sites: [] } as unknown };
  return { sitesHolder: holder, listSitesSpy: vi.fn(async () => holder.list) };
});
vi.mock('@/data/sites', () => ({ listSites: listSitesSpy }));

const { briefsHolder, getBriefSpy } = vi.hoisted(() => {
  const holder = { get: null as unknown };
  return { briefsHolder: holder, getBriefSpy: vi.fn(async () => holder.get) };
});
vi.mock('@/data/briefs', () => ({ getBrief: getBriefSpy }));

vi.mock('@/data/anthropic', () => ({ runOnboardingTurn: vi.fn() }));

// Doppio in-memory della porta OGW-101, con la STESSA superficie di ai-budget.ts.
const { usageHolder, createAiUsagePortSpy } = vi.hoisted(() => {
  type Row = { siteId: string; kind: string; at: Date };
  const holder = {
    rows: [] as Row[],
    port: null as unknown,
  };
  holder.port = {
    async countTotal(siteId: string) {
      return holder.rows.filter((r) => r.siteId === siteId).length;
    },
    async countSince(siteId: string, since: Date) {
      return holder.rows.filter((r) => r.siteId === siteId && r.at.getTime() >= since.getTime()).length;
    },
    async record(siteId: string, kind: string, at: Date) {
      holder.rows.push({ siteId, kind, at });
    },
  };
  return { usageHolder: holder, createAiUsagePortSpy: vi.fn(async () => holder.port) };
});
vi.mock('@/data/ai-usage', () => ({ createAiUsagePort: createAiUsagePortSpy }));

// Import DOPO i mock.
import { POST } from '@/app/api/onboarding/[siteId]/generate-description/route';
import { runOnboardingTurn } from '@/data/anthropic';
import { DEFAULT_AI_BUDGET_LIMITS } from '@/domain/onboarding/ai-budget';
import { applyBriefUpdate, emptyBrief } from '@/domain/onboarding/brief';

const boundary = vi.mocked(runOnboardingTurn);

const ORIGIN = 'http://localhost';
const SITE = 'site-of-a';
const OTHER = 'site-of-b';
const UNKNOWN = 'site-che-non-esiste';

// Il brief del sito: vertical noto, cosi' AC-302-2 puo' provare che il vertical passato al
// dominio viene dal brief del sito richiesto (non una costante).
const SITE_BRIEF = applyBriefUpdate(emptyBrief('it'), {
  vertical: 'ristorazione',
  business_name: 'Trattoria da A',
}).brief;

// Risposta del confine: solo `content` e' letto dal dominio (come in onboarding-route.test).
function modelReply(text: string): Anthropic.Message {
  return {
    id: 'msg_ogw302',
    role: 'assistant',
    type: 'message',
    content: [{ type: 'text', text, citations: null }],
  } as unknown as Anthropic.Message;
}
const GOOD_DESCRIPTION = 'Trattoria familiare nel centro di A: piatti della tradizione, ogni giorno.';

type Init = { origin?: string | null; fetchSite?: string | null; rawBody?: string };

function buildRequest(siteId: string, body: unknown, init: Init = {}): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  const origin = init.origin === undefined ? ORIGIN : init.origin;
  if (origin !== null) headers.set('origin', origin);
  const fetchSite = init.fetchSite === undefined ? 'same-origin' : init.fetchSite;
  if (fetchSite !== null) headers.set('sec-fetch-site', fetchSite);
  return new NextRequest(new URL(`/api/onboarding/${siteId}/generate-description`, ORIGIN), {
    method: 'POST',
    headers,
    body: init.rawBody ?? JSON.stringify(body),
  });
}
const run = (siteId: string, body: unknown, init: Init = {}) =>
  POST(buildRequest(siteId, body, init), { params: Promise.resolve({ siteId }) });

const VALID_BODY = { phrase: 'trattoria a napoli, cucina tradizionale' };

beforeEach(() => {
  authHolder.user = { id: 'user-a' };
  sitesHolder.list = { ok: true, sites: [{ id: SITE }, { id: OTHER }] };
  briefsHolder.get = { ok: true, brief: SITE_BRIEF, status: 'draft', complete: false };
  usageHolder.rows.length = 0;
  listSitesSpy.mockClear();
  getBriefSpy.mockClear();
  createAiUsagePortSpy.mockClear();
  boundary.mockReset();
  boundary.mockResolvedValue(modelReply(GOOD_DESCRIPTION));
});

describe('OGW-302 endpoint genera-descrizione (guardie + budget consume-on-success)', () => {
  // covers: AC-302-2
  it('sotto il budget: 200 con la descrizione e il contatore del sito incrementa di uno', async () => {
    const before = usageHolder.rows.filter((r) => r.siteId === SITE).length;

    const res = await run(SITE, VALID_BODY);
    expect(res.status).toBe(200); // covers: AC-302-2
    const json = (await res.json()) as { description?: string };
    expect(json.description).toBe(GOOD_DESCRIPTION); // covers: AC-302-2

    // il modello e' stato chiamato col vertical DEL BRIEF del sito (non una costante)
    expect(boundary).toHaveBeenCalledTimes(1); // covers: AC-302-2
    expect((boundary.mock.calls[0][0] as { system: string }).system).toContain('ristorazione'); // covers: AC-302-2

    // consume-on-success: esattamente una riga in piu', del sito richiesto, con il kind giusto
    const after = usageHolder.rows.filter((r) => r.siteId === SITE);
    expect(after.length).toBe(before + 1); // covers: AC-302-2
    expect(after[after.length - 1].kind).toBe('generate_description'); // covers: AC-302-2
  });

  // covers: AC-302-3
  it('al cap del budget AI: 429, senza chiamare il modello e senza incrementare il contatore', async () => {
    // Semina maxTotal usi FUORI dalla finestra: isola il cap dal rate-limit.
    const base = new Date('2026-08-18T12:00:00.000Z').getTime();
    for (let i = 0; i < DEFAULT_AI_BUDGET_LIMITS.maxTotal; i++) {
      usageHolder.rows.push({ siteId: SITE, kind: 'import', at: new Date(base - (10 + i) * 60_000) });
    }
    const before = usageHolder.rows.length;

    const res = await run(SITE, VALID_BODY);
    expect(res.status).toBe(429); // covers: AC-302-3
    expect(boundary).not.toHaveBeenCalled(); // covers: AC-302-3 — nessuna chiamata al modello
    expect(usageHolder.rows.length).toBe(before); // covers: AC-302-3 — nessun incremento
  });

  // covers: AC-302-1
  it('guardie: origine non same-origin, sessione assente, sito non proprio -> rifiuto senza chiamare il modello', async () => {
    const cases: Array<{ init: Init; siteId: string; status: number; setup?: () => void }> = [
      { init: { origin: 'https://evil.example.com' }, siteId: SITE, status: 403 },
      { init: { fetchSite: null }, siteId: SITE, status: 403 },
      { init: {}, siteId: SITE, status: 401, setup: () => { authHolder.user = null; } },
      { init: {}, siteId: UNKNOWN, status: 404 },
    ];
    for (const c of cases) {
      authHolder.user = { id: 'user-a' };
      sitesHolder.list = { ok: true, sites: [{ id: SITE }, { id: OTHER }] };
      usageHolder.rows.length = 0;
      boundary.mockClear();
      c.setup?.();

      const res = await run(c.siteId, VALID_BODY, c.init);
      expect(res.status).toBe(c.status); // covers: AC-302-1
      expect(boundary).not.toHaveBeenCalled(); // covers: AC-302-1 — mai il modello
      expect(usageHolder.rows.length).toBe(0); // covers: AC-302-1 — nessun uso registrato
    }
  });

  // covers: AC-302-2
  // Consume-on-success STRETTO: se il modello risponde ma l'output e' fuori forma (vuoto),
  // NON e' un successo -> nessuna descrizione proposta e nessun incremento del contatore.
  it('output del modello fuori forma: 502 e nessun consumo del budget', async () => {
    boundary.mockResolvedValue(modelReply('   \n  '));
    const res = await run(SITE, VALID_BODY);
    expect(res.status).toBe(502); // covers: AC-302-2
    expect(usageHolder.rows.length).toBe(0); // covers: AC-302-2 — non consumato senza descrizione valida
  });

  // covers: AC-302-2
  // Il confine LLM che LANCIA e' un 502 onesto (catch che LOGGA), e non consuma budget.
  it('confine LLM che lancia: 502 e nessun consumo del budget', async () => {
    boundary.mockRejectedValue(new Error('confine giu'));
    const res = await run(SITE, VALID_BODY);
    expect(res.status).toBe(502); // covers: AC-302-2
    expect(usageHolder.rows.length).toBe(0); // covers: AC-302-2
  });

  it('body invalido (phrase assente o di soli spazi): 400, nessun modello, nessun consumo', async () => {
    for (const body of [{}, { phrase: '' }, { phrase: '   ' }, { phrase: 123 }, { phrase: 'ok', extra: 1 }]) {
      boundary.mockClear();
      usageHolder.rows.length = 0;
      const res = await run(SITE, body);
      expect(res.status).toBe(400);
      expect(boundary).not.toHaveBeenCalled();
      expect(usageHolder.rows.length).toBe(0);
    }
  });
});

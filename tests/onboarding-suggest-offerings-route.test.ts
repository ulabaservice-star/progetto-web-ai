// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

// OGW-402 (macrotask suggest-offerings) — ORACOLO dell'endpoint suggerisci-offerte. Le
// asserzioni derivano da AC-402-1/2/4 (04-suggest-offerings.md); ognuna e' taggata
// `// covers: AC-402-<n>`. Stessa impalcatura di onboarding-generate-description-route.test:
//  - @/data/supabase-ssr getUser, @/data/sites listSites, @/data/briefs getBrief: i seam delle
//    guardie condivise (identita' / proprieta' P1-D21 / brief per il vertical).
//  - @/data/anthropic runOnboardingTurn: si mocka il CONFINE LLM (T-131), NON il dominio; cosi'
//    suggestOfferings (OGW-401) gira davvero e la validazione dell'output e' esercitata.
//  - @/data/ai-usage createAiUsagePort: doppio in-memory del contatore (OGW-101), rende
//    osservabili l'incremento (AC-402-1) e il cap che nega senza consumare (AC-402-2).

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

const { usageHolder, createAiUsagePortSpy } = vi.hoisted(() => {
  type Row = { siteId: string; kind: string; at: Date };
  const holder = { rows: [] as Row[], port: null as unknown };
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
import { POST } from '@/app/api/onboarding/[siteId]/suggest-offerings/route';
import { runOnboardingTurn } from '@/data/anthropic';
import { DEFAULT_AI_BUDGET_LIMITS } from '@/domain/onboarding/ai-budget';
import { applyBriefUpdate, emptyBrief } from '@/domain/onboarding/brief';

const boundary = vi.mocked(runOnboardingTurn);

const ORIGIN = 'http://localhost';
const SITE = 'site-of-a';
const OTHER = 'site-of-b';
const UNKNOWN = 'site-che-non-esiste';

// Il brief del sito: vertical noto, cosi' AC-402-1 puo' provare che il vertical passato al
// dominio viene dal brief del sito richiesto (non una costante).
const SITE_BRIEF = applyBriefUpdate(emptyBrief('it'), {
  vertical: 'ristorazione',
  business_name: 'Trattoria da A',
}).brief;

// Risposta del confine: un blocco tool_use `propose_offerings` (il dominio legge l'input dello
// strumento). Solo `content` e' letto (come in onboarding-generate-description-route.test).
function toolReply(items: unknown): Anthropic.Message {
  return {
    id: 'msg_ogw402',
    role: 'assistant',
    type: 'message',
    content: [{ type: 'tool_use', id: 'toolu_1', name: 'propose_offerings', input: { items } }],
  } as unknown as Anthropic.Message;
}
const GOOD_ITEMS = [
  { name: 'Margherita', section: 'Pizze' },
  { name: 'Marinara', section: 'Pizze' },
];

type Init = { origin?: string | null; fetchSite?: string | null; rawBody?: string };

function buildRequest(siteId: string, body: unknown, init: Init = {}): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  const origin = init.origin === undefined ? ORIGIN : init.origin;
  if (origin !== null) headers.set('origin', origin);
  const fetchSite = init.fetchSite === undefined ? 'same-origin' : init.fetchSite;
  if (fetchSite !== null) headers.set('sec-fetch-site', fetchSite);
  return new NextRequest(new URL(`/api/onboarding/${siteId}/suggest-offerings`, ORIGIN), {
    method: 'POST',
    headers,
    body: init.rawBody ?? JSON.stringify(body),
  });
}
const run = (siteId: string, body: unknown, init: Init = {}) =>
  POST(buildRequest(siteId, body, init), { params: Promise.resolve({ siteId }) });

// Il body atteso e' vuoto: vertical e descrizione vengono dal brief del sito (nessun input
// non fidato nuovo). Le chiavi extra sono rifiutate (strict).
const EMPTY_BODY = {};

beforeEach(() => {
  authHolder.user = { id: 'user-a' };
  sitesHolder.list = { ok: true, sites: [{ id: SITE }, { id: OTHER }] };
  briefsHolder.get = { ok: true, brief: SITE_BRIEF, status: 'draft', complete: false };
  usageHolder.rows.length = 0;
  listSitesSpy.mockClear();
  getBriefSpy.mockClear();
  createAiUsagePortSpy.mockClear();
  boundary.mockReset();
  boundary.mockResolvedValue(toolReply(GOOD_ITEMS));
});

describe('OGW-402 endpoint suggerisci-offerte (guardie + budget consume-on-success)', () => {
  // covers: AC-402-1
  it('sotto il budget: 200 con i suggerimenti e il contatore del sito incrementa di uno', async () => {
    const before = usageHolder.rows.filter((r) => r.siteId === SITE).length;

    const res = await run(SITE, EMPTY_BODY);
    expect(res.status).toBe(200); // covers: AC-402-1
    const json = (await res.json()) as { offerings?: Array<{ name: string; section?: string }> };
    expect(json.offerings).toEqual(GOOD_ITEMS); // covers: AC-402-1

    // il modello e' stato chiamato col vertical DEL BRIEF del sito (non una costante)
    expect(boundary).toHaveBeenCalledTimes(1); // covers: AC-402-1
    expect((boundary.mock.calls[0][0] as { system: string }).system).toContain('ristorazione'); // covers: AC-402-1

    // consume-on-success: esattamente una riga in piu', del sito richiesto, col kind giusto
    const after = usageHolder.rows.filter((r) => r.siteId === SITE);
    expect(after.length).toBe(before + 1); // covers: AC-402-1
    expect(after[after.length - 1].kind).toBe('suggest_offerings'); // covers: AC-402-1
  });

  // covers: AC-402-2
  it('al cap del budget AI: 429, senza chiamare il modello e senza incrementare il contatore', async () => {
    const base = new Date('2026-08-18T12:00:00.000Z').getTime();
    for (let i = 0; i < DEFAULT_AI_BUDGET_LIMITS.maxTotal; i++) {
      usageHolder.rows.push({ siteId: SITE, kind: 'import', at: new Date(base - (10 + i) * 60_000) });
    }
    const before = usageHolder.rows.length;

    const res = await run(SITE, EMPTY_BODY);
    expect(res.status).toBe(429); // covers: AC-402-2
    expect(boundary).not.toHaveBeenCalled(); // covers: AC-402-2 — nessuna chiamata al modello
    expect(usageHolder.rows.length).toBe(before); // covers: AC-402-2 — nessun incremento
  });

  // covers: AC-402-4
  it('guardie: origine non same-origin, sessione assente, sito non proprio -> rifiuto senza modello', async () => {
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

      const res = await run(c.siteId, EMPTY_BODY, c.init);
      expect(res.status).toBe(c.status); // covers: AC-402-4
      expect(boundary).not.toHaveBeenCalled(); // covers: AC-402-4 — mai il modello
      expect(usageHolder.rows.length).toBe(0); // covers: AC-402-4 — nessun uso registrato
    }
  });

  // Consume-on-success STRETTO: il modello risponde ma senza voci valide (lista vuota) -> NON
  // e' un successo -> 502 e nessun incremento del contatore (simmetrico a generate-description).
  it('nessun suggerimento valido: 502 e nessun consumo del budget', async () => {
    boundary.mockResolvedValue(toolReply([{ name: '   ' }, { name: '' }])); // tutte fuori-forma
    const res = await run(SITE, EMPTY_BODY);
    expect(res.status).toBe(502);
    expect(usageHolder.rows.length).toBe(0); // non consumato senza suggerimenti validi
  });

  // Il confine LLM che LANCIA e' un 502 onesto (catch che LOGGA), e non consuma budget.
  it('confine LLM che lancia: 502 e nessun consumo del budget', async () => {
    boundary.mockRejectedValue(new Error('confine giu'));
    const res = await run(SITE, EMPTY_BODY);
    expect(res.status).toBe(502);
    expect(usageHolder.rows.length).toBe(0);
  });

  it('body non vuoto (chiavi extra): 400, nessun modello, nessun consumo', async () => {
    for (const body of [{ description: 'x' }, { foo: 1 }, [], 123]) {
      boundary.mockClear();
      usageHolder.rows.length = 0;
      const res = await run(SITE, body);
      expect(res.status).toBe(400);
      expect(boundary).not.toHaveBeenCalled();
      expect(usageHolder.rows.length).toBe(0);
    }
  });
});

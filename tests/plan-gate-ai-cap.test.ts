import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { PLAN_LIMITS, type Entitlement } from '@/domain/billing/entitlement';
import { DEFAULT_AI_BUDGET_LIMITS } from '@/domain/onboarding/ai-budget';

// BIL-304 (macrotask plan-gates, p5-billing-fase1) — ORACOLO del cap AI PARAMETRICO sul piano nella
// pipeline condivisa degli endpoint AI on-demand (aiEndpoint). Le asserzioni derivano dagli
// acceptance_criteria AC-304-1/2/3 (03-plan-gates.md), taggate `// covers:`.
//
// COSA SI MOCKA E PERCHE'. Si isolano le GUARDIE (same-origin/identita'/proprieta'/brief) — non sono
// il soggetto — e si pilotano i due input del gate: l'entitlement dell'account (Free/Pro) e il numero
// di usi gia' spesi (la porta d'uso in-memory). checkAiBudget NON e' mockato: e' lo spy sul REALE
// (importOriginal), cosi' il verdetto 429/200 e' quello vero del dominio E la SOGLIA passata e'
// ispezionabile (AC-304-3). Gli usi sono seedati FUORI dalla finestra (countSince=0) per isolare il
// CAP dal rate-limit (che il piano NON cambia).

vi.mock('@/app/api/_shared/request-guard', () => ({ guardMutatingRequest: () => undefined }));

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));
vi.mock('@/data/supabase-ssr', () => ({ getUser: getUserMock }));

const { guardOwnedSiteMock, loadRouteBriefMock } = vi.hoisted(() => ({
  guardOwnedSiteMock: vi.fn(),
  loadRouteBriefMock: vi.fn(),
}));
vi.mock('@/app/api/_shared/route-guards', () => ({
  guardOwnedSite: guardOwnedSiteMock,
  loadRouteBrief: loadRouteBriefMock,
}));

const { portHolder, createAiUsagePortMock } = vi.hoisted(() => {
  const holder = { total: 0 };
  return {
    portHolder: holder,
    createAiUsagePortMock: vi.fn(async () => ({
      countTotal: async () => holder.total,
      countSince: async () => 0, // nessun uso nella finestra: isola il CAP dal rate-limit
      record: async () => {},
    })),
  };
});
vi.mock('@/data/ai-usage', () => ({ createAiUsagePort: createAiUsagePortMock }));

const { entHolder, entForUserMock } = vi.hoisted(() => {
  const holder = { current: null as Entitlement | null };
  return { entHolder: holder, entForUserMock: vi.fn(async () => holder.current) };
});
vi.mock('@/data/subscriptions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAccountEntitlementForUser: entForUserMock,
}));

// checkAiBudget: spy sul REALE (comportamento vero + ispezione della soglia passata).
const { checkAiBudgetSpy } = vi.hoisted(() => ({ checkAiBudgetSpy: vi.fn() }));
vi.mock('@/domain/onboarding/ai-budget', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/onboarding/ai-budget')>();
  checkAiBudgetSpy.mockImplementation(actual.checkAiBudget);
  return { ...actual, checkAiBudget: checkAiBudgetSpy };
});

import { aiEndpoint } from '@/app/api/_shared/ai-endpoint';

const FREE: Entitlement = { plan: 'free', limits: PLAN_LIMITS.free };
const PRO: Entitlement = { plan: 'pro', limits: PLAN_LIMITS.pro };

const POST = aiEndpoint({
  maxBodyBytes: 10_000,
  bodySchema: z.object({}).strict(),
  logTag: 'test/ai-cap',
  kind: 'generate_description',
  failReason: 'ai-failed',
  run: async () => ({ ok: true }),
});

const req = () => ({ json: async () => ({}) }) as unknown as NextRequest;
const call = (siteId: string) => POST(req(), { params: Promise.resolve({ siteId }) });

beforeEach(() => {
  getUserMock.mockResolvedValue({ id: 'user-1' });
  guardOwnedSiteMock.mockResolvedValue(undefined);
  loadRouteBriefMock.mockResolvedValue({ ok: true, brief: {} });
  portHolder.total = 0;
  entHolder.current = FREE;
  checkAiBudgetSpy.mockClear();
});

describe('BIL-304 — cap AI parametrico dal piano (aiEndpoint)', () => {
  // covers: AC-304-1
  it('account Free che ha saturato il cap base => 429 (cap del piano free)', async () => {
    entHolder.current = FREE;
    portHolder.total = PLAN_LIMITS.free.ai_monthly_cap; // 30 usi, tutti fuori finestra
    const res = await call('site-1');
    expect(res.status).toBe(429); // covers: AC-304-1
  });

  // covers: AC-304-2
  it('account Pro con lo STESSO numero di usi che satura il Free => ammesso (cap ampio Pro)', async () => {
    entHolder.current = PRO;
    portHolder.total = PLAN_LIMITS.free.ai_monthly_cap; // 30: satura free ma non pro (500)
    const res = await call('site-1');
    expect(res.status).toBe(200); // covers: AC-304-2
  });

  // covers: AC-304-3
  it('la soglia passata a checkAiBudget proviene dall entitlement (ai_monthly_cap), non da una costante', async () => {
    entHolder.current = PRO;
    portHolder.total = 0;
    await call('site-1');
    const proLimits = checkAiBudgetSpy.mock.calls.at(-1)?.[3] as { maxTotal: number };
    expect(proLimits.maxTotal).toBe(PLAN_LIMITS.pro.ai_monthly_cap); // covers: AC-304-3 — 500 dal piano pro
    expect(proLimits.maxTotal).not.toBe(DEFAULT_AI_BUDGET_LIMITS.maxTotal); // covers: AC-304-3 — non la costante

    // Controprova Free: la soglia SEGUE il piano (30), non e' fissa.
    checkAiBudgetSpy.mockClear();
    entHolder.current = FREE;
    await call('site-1');
    const freeLimits = checkAiBudgetSpy.mock.calls.at(-1)?.[3] as { maxTotal: number };
    expect(freeLimits.maxTotal).toBe(PLAN_LIMITS.free.ai_monthly_cap); // covers: AC-304-3 — 30 dal piano free
    // Il rate-limit (finestra) NON dipende dal piano: resta quello di default.
    const freeLimitsFull = checkAiBudgetSpy.mock.calls.at(-1)?.[3] as { windowMs: number; maxInWindow: number };
    expect(freeLimitsFull.windowMs).toBe(DEFAULT_AI_BUDGET_LIMITS.windowMs); // covers: AC-304-3 — rate invariato
    expect(freeLimitsFull.maxInWindow).toBe(DEFAULT_AI_BUDGET_LIMITS.maxInWindow); // covers: AC-304-3
  });
});

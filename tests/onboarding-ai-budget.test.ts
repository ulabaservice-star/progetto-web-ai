import { describe, it, expect } from 'vitest';
import {
  checkAiBudget,
  recordAiUsage,
  DEFAULT_AI_BUDGET_LIMITS,
  type AiUsageKind,
  type AiUsagePort,
  type AiBudgetLimits,
} from '@/domain/onboarding/ai-budget';

// OGW-102 (macrotask ai-usage-guard) — la DECISIONE di spesa AI e' dominio PURO e
// DETERMINISTICO: `now` e `limits` sono INIETTATI, mai letti da un orologio reale. Qui la
// porta e' un DOPPIO in-memory che tiene le righe d'uso {siteId, kind, at}; le asserzioni
// controllano allow / deny('cap'|'rate') e l'incremento esatto, derivando dagli
// acceptance_criteria AC-102-1/2/3/4 (01-ai-usage-guard.md). Nessun DB, nessun tempo reale.

type Row = { siteId: string; kind: AiUsageKind; at: Date };

/** Doppio in-memory della porta OGW-101: conteggi per-sito e per-finestra, insert append-only. */
function fakePort(seed: Row[] = []): AiUsagePort & { rows: Row[] } {
  const rows: Row[] = [...seed];
  return {
    rows,
    async countTotal(siteId) {
      return rows.filter((r) => r.siteId === siteId).length;
    },
    async countSince(siteId, since) {
      return rows.filter((r) => r.siteId === siteId && r.at.getTime() >= since.getTime()).length;
    },
    async record(siteId, kind, at) {
      rows.push({ siteId, kind, at });
    },
  };
}

const SITE = 'site-1';
const OTHER = 'site-2';
// Istante di riferimento FISSO (nessun Date.now): tutta la finestra e' calcolata da qui.
const NOW = new Date('2026-08-18T12:00:00.000Z');
const LIMITS: AiBudgetLimits = { maxTotal: 5, windowMs: 60_000, maxInWindow: 3 };

describe('OGW-102 checkAiBudget/recordAiUsage — gating deterministico della spesa AI', () => {
  // covers: AC-102-1
  it('sotto il cap e senza raffica nella finestra -> allow', async () => {
    const port = fakePort([
      // Un solo uso, 5 minuti fa: fuori dalla finestra di 60s e ben sotto il cap di 5.
      { siteId: SITE, kind: 'import', at: new Date(NOW.getTime() - 5 * 60_000) },
    ]);
    const decision = await checkAiBudget(port, SITE, NOW, LIMITS);
    expect(decision).toEqual({ allow: true }); // covers: AC-102-1
  });

  // covers: AC-102-2
  it('raggiunto il cap totale -> deny reason "cap"; il check NON incrementa il contatore', async () => {
    // maxTotal righe, tutte FUORI dalla finestra: isola il cap dal rate-limit.
    const seed: Row[] = Array.from({ length: LIMITS.maxTotal }, (_, i) => ({
      siteId: SITE,
      kind: 'import' as AiUsageKind,
      at: new Date(NOW.getTime() - (10 + i) * 60_000),
    }));
    const port = fakePort(seed);
    const before = port.rows.length;

    const decision = await checkAiBudget(port, SITE, NOW, LIMITS);
    expect(decision).toEqual({ allow: false, reason: 'cap' }); // covers: AC-102-2
    expect(port.rows.length).toBe(before); // covers: AC-102-2 — nessun incremento nel check
  });

  // covers: AC-102-3
  it('troppe chiamate entro la finestra -> deny reason "rate"; deterministico con `now` iniettato', async () => {
    // maxInWindow usi DENTRO la finestra (totale 3 < cap 5): solo il rate-limit morde.
    const seed: Row[] = [
      { siteId: SITE, kind: 'import', at: new Date(NOW.getTime() - 10_000) },
      { siteId: SITE, kind: 'generate_description', at: new Date(NOW.getTime() - 20_000) },
      { siteId: SITE, kind: 'suggest_offerings', at: new Date(NOW.getTime() - 30_000) },
    ];
    const port = fakePort(seed);

    const denied = await checkAiBudget(port, SITE, NOW, LIMITS);
    expect(denied).toEqual({ allow: false, reason: 'rate' }); // covers: AC-102-3

    // DETERMINISMO: stesse identiche righe, ma spostando `now` oltre la finestra le tre righe
    // cadono fuori -> allow. L'esito dipende SOLO da `now` iniettato, non da un orologio reale.
    const later = new Date(NOW.getTime() + LIMITS.windowMs + 1);
    const allowed = await checkAiBudget(port, SITE, later, LIMITS);
    expect(allowed).toEqual({ allow: true }); // covers: AC-102-3
  });

  // covers: AC-102-4
  it('recordAiUsage incrementa il contatore del sito di esattamente uno (per-sito, append-only)', async () => {
    const port = fakePort([
      { siteId: SITE, kind: 'import', at: new Date(NOW.getTime() - 1_000) },
      // Un uso di un ALTRO sito: recordAiUsage non deve toccarlo (contatore per-sito).
      { siteId: OTHER, kind: 'import', at: new Date(NOW.getTime() - 1_000) },
    ]);
    const beforeSite = await port.countTotal(SITE);
    const beforeOther = await port.countTotal(OTHER);

    await recordAiUsage(port, SITE, 'generate_description', NOW);

    expect(await port.countTotal(SITE)).toBe(beforeSite + 1); // covers: AC-102-4 — +1 esatto
    expect(await port.countTotal(OTHER)).toBe(beforeOther); // covers: AC-102-4 — l'altro sito invariato

    // La riga registrata porta kind e istante INIETTATI: un solo record append-only.
    const last = port.rows[port.rows.length - 1];
    expect(last).toEqual({ siteId: SITE, kind: 'generate_description', at: NOW }); // covers: AC-102-4
  });

  it('DEFAULT_AI_BUDGET_LIMITS: taratura sana (cap finito oltre l\'onboarding curato, finestra positiva)', () => {
    expect(DEFAULT_AI_BUDGET_LIMITS.maxTotal).toBeGreaterThan(6); // oltre i 3-6 usi di un onboarding curato
    expect(DEFAULT_AI_BUDGET_LIMITS.windowMs).toBeGreaterThan(0);
    expect(DEFAULT_AI_BUDGET_LIMITS.maxInWindow).toBeGreaterThan(0);
    expect(DEFAULT_AI_BUDGET_LIMITS.maxInWindow).toBeLessThanOrEqual(DEFAULT_AI_BUDGET_LIMITS.maxTotal);
  });
});

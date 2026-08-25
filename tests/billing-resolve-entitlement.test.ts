import { describe, it, expect } from 'vitest';
import {
  PLAN_LIMITS,
  resolveEntitlement,
  type Subscription,
} from '@/domain/billing/entitlement';

// BIL-102 (macrotask entitlement-core, p5-billing-fase1) — PLAN_LIMITS puri +
// resolveEntitlement puro. Le asserzioni derivano dagli acceptance_criteria
// AC-102-1..4 (01-entitlement-core.md). Funzione PURA: nessun DB, nessun orologio
// interno (now iniettato, BIL-D3). Ogni stato non riconducibile a un piano attivo
// degrada a 'free', MAI a un piano superiore per errore (fail-safe).

// Una subscription 'pro' base; i singoli test sovrascrivono status/current_period_end.
const proSub = (over: Partial<Subscription> = {}): Subscription => ({
  plan: 'pro',
  status: 'active',
  current_period_end: '2100-01-01T00:00:00.000Z', // lontano nel futuro salvo override
  ...over,
});

const now = new Date('2026-08-25T12:00:00.000Z');

describe('BIL-102 resolveEntitlement — risoluzione pura dell\'entitlement', () => {
  // covers: AC-102-1
  it('subscription null => piano free con i limiti free (max_sites=1, no_badge=false, seo_advanced=false)', () => {
    const ent = resolveEntitlement(null, now);
    expect(ent.plan).toBe('free'); // covers: AC-102-1
    expect(ent.limits).toBe(PLAN_LIMITS.free); // covers: AC-102-1 — stessi limiti free
    expect(ent.limits.max_sites).toBe(1); // covers: AC-102-1
    expect(ent.limits.no_badge).toBe(false); // covers: AC-102-1
    expect(ent.limits.seo_advanced).toBe(false); // covers: AC-102-1
  });

  // covers: AC-102-2
  it('subscription pro active con current_period_end nel futuro => piano pro (max_sites=5, no_badge=true, seo_advanced=true)', () => {
    const ent = resolveEntitlement(
      proSub({ status: 'active', current_period_end: '2026-09-25T12:00:00.000Z' }),
      now,
    );
    expect(ent.plan).toBe('pro'); // covers: AC-102-2
    expect(ent.limits).toBe(PLAN_LIMITS.pro); // covers: AC-102-2 — limiti pro
    expect(ent.limits.max_sites).toBe(5); // covers: AC-102-2
    expect(ent.limits.no_badge).toBe(true); // covers: AC-102-2
    expect(ent.limits.seo_advanced).toBe(true); // covers: AC-102-2
  });

  // covers: AC-102-3
  it('subscription pro canceled => free (l\'entitlement decade all\'assenza di piano attivo)', () => {
    const ent = resolveEntitlement(
      proSub({ status: 'canceled', current_period_end: '2026-09-25T12:00:00.000Z' }),
      now,
    );
    expect(ent.plan).toBe('free'); // covers: AC-102-3 — status non-attivo degrada a free
    expect(ent.limits).toBe(PLAN_LIMITS.free); // covers: AC-102-3
  });

  // covers: AC-102-3
  it('subscription pro con current_period_end nel passato (scaduta) => free', () => {
    const ent = resolveEntitlement(
      proSub({ status: 'active', current_period_end: '2026-08-24T12:00:00.000Z' }),
      now,
    );
    expect(ent.plan).toBe('free'); // covers: AC-102-3 — scadenza passata degrada a free
    expect(ent.limits).toBe(PLAN_LIMITS.free); // covers: AC-102-3
  });

  // covers: AC-102-4
  it('funzione pura: con la stessa subscription e lo stesso now l\'esito e identico (nessun effetto collaterale)', () => {
    const sub = proSub({ current_period_end: '2026-09-25T12:00:00.000Z' });
    const a = resolveEntitlement(sub, now);
    const b = resolveEntitlement(sub, now);
    expect(a).toEqual(b); // covers: AC-102-4 — deterministico
    expect(a.plan).toBe('pro'); // covers: AC-102-4
  });

  // covers: AC-102-4
  it('funzione pura: l\'esito dipende SOLO da now (nessun Date.now interno) — stessa sub, now attorno alla scadenza da esiti opposti', () => {
    const sub = proSub({ status: 'active', current_period_end: '2026-08-25T12:00:00.000Z' });
    // now un istante PRIMA della scadenza => ancora pro
    const prima = resolveEntitlement(sub, new Date('2026-08-25T11:59:59.000Z'));
    expect(prima.plan).toBe('pro'); // covers: AC-102-4 — now e l'unico driver della scadenza
    // now un istante DOPO la scadenza => free, sulla STESSA sub
    const dopo = resolveEntitlement(sub, new Date('2026-08-25T12:00:01.000Z'));
    expect(dopo.plan).toBe('free'); // covers: AC-102-4 — l'esito cambia solo per il now iniettato
  });
});

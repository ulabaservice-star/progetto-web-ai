import { describe, it, expect } from 'vitest';
import { applyDowngrade, type DowngradeSite } from '@/domain/billing/downgrade';
import { type Subscription } from '@/domain/billing/entitlement';

// BIL-501 (macrotask downgrade-lifecycle, p5-billing-fase1) — applyDowngrade PURO.
// Le asserzioni derivano dagli acceptance_criteria AC-501-1..4 (05-downgrade-lifecycle.md).
// Funzione PURA: nessun DB, nessun orologio (now iniettato). La finestra di grazia coincide
// con current_period_end (riuso di resolveEntitlement, BIL-D6): past_due entro il periodo e'
// grazia (resta pro); a fine grazia o canceled decade a free. La retrocessione non prevede
// mai una cancellazione: sitesToUnpublish e' solo un elenco da portare non-pubblicato.

const now = new Date('2026-08-25T12:00:00.000Z');
const inGrace = '2026-09-25T12:00:00.000Z'; // futuro: dentro la finestra di grazia
const pastGrace = '2026-08-24T12:00:00.000Z'; // passato: oltre la finestra di grazia

const pub = (id: string): DowngradeSite => ({ id, is_published: true });

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  plan: 'pro',
  status: 'past_due',
  current_period_end: inGrace,
  ...over,
});

describe('BIL-501 applyDowngrade — retrocessione morbida pura', () => {
  // covers: AC-501-1
  it('past_due DENTRO la grazia => resta pro, nessun sito da mettere offline', () => {
    const r = applyDowngrade(
      sub({ status: 'past_due', current_period_end: inGrace }),
      [pub('a'), pub('b'), pub('c')],
      now,
    );
    expect(r.effectivePlan).toBe('pro'); // covers: AC-501-1
    expect(r.sitesToUnpublish).toEqual([]); // covers: AC-501-1 — grazia: nessuna retrocessione
  });

  // covers: AC-501-2
  it('past_due OLTRE la grazia => free, badge torna, siti oltre il limite free offline', () => {
    const r = applyDowngrade(
      sub({ status: 'past_due', current_period_end: pastGrace }),
      [pub('a'), pub('b'), pub('c')],
      now,
    );
    expect(r.effectivePlan).toBe('free'); // covers: AC-501-2
    expect(r.badgeRestored).toBe(true); // covers: AC-501-2
    expect(r.sitesToUnpublish).toEqual(['b', 'c']); // covers: AC-501-2 — oltre max_sites free (1)
  });

  // covers: AC-501-3
  it('3 siti che retrocedono a Free (limite 1) => esattamente i 2 eccedenti, nessuna cancellazione', () => {
    const r = applyDowngrade(
      sub({ status: 'canceled', current_period_end: inGrace }),
      [pub('s1'), pub('s2'), pub('s3')],
      now,
    );
    // La forma completa del ritorno: 2 eccedenti in sitesToUnpublish, NESSUN campo di
    // cancellazione (il contratto non prevede una delete — BIL-D6, dato mai perso).
    expect(r).toEqual({
      effectivePlan: 'free',
      badgeRestored: true,
      sitesToUnpublish: ['s2', 's3'],
    }); // covers: AC-501-3
    expect(r.sitesToUnpublish).toHaveLength(2); // covers: AC-501-3
  });

  // covers: AC-501-4
  it('funzione pura: due chiamate con gli stessi argomenti danno esito identico', () => {
    const sites = [pub('a'), pub('b'), pub('c')];
    const s = sub({ status: 'canceled', current_period_end: inGrace });
    const r1 = applyDowngrade(s, sites, now);
    const r2 = applyDowngrade(s, sites, now);
    expect(r2).toEqual(r1); // covers: AC-501-4
    expect(r2).toEqual({
      effectivePlan: 'free',
      badgeRestored: true,
      sitesToUnpublish: ['b', 'c'],
    }); // covers: AC-501-4 — esito deterministico
  });

  // covers: AC-501-3 — solo i PUBBLICATI contano (idempotenza a valle, BIL-502)
  it('solo i siti pubblicati contano verso il limite: i non-pubblicati sono ignorati', () => {
    const r = applyDowngrade(
      sub({ status: 'canceled', current_period_end: inGrace }),
      [pub('p1'), { id: 'off', is_published: false }, pub('p2')],
      now,
    );
    expect(r.sitesToUnpublish).toEqual(['p2']); // covers: AC-501-3 — 2 pubblicati, tiene 1, offline 1
  });
});

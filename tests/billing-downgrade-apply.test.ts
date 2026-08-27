import { describe, it, expect } from 'vitest';
import {
  applySoftDowngrade,
  type SiteDowngradeStore,
} from '@/data/subscription-downgrade';
import { type Subscription } from '@/domain/billing/entitlement';

// BIL-502 (macrotask downgrade-lifecycle, p5-billing-fase1) — applicazione idempotente della
// retrocessione morbida. Store IN-MEMORY iniettato (nessun DB, nessuna service_role): idempotenza
// e non-delete provati senza rete. Le asserzioni derivano dagli acceptance_criteria AC-502-1..3.

type Row = { site_id: string; is_published: boolean };

function memStore(initial: Row[]): SiteDowngradeStore & { rows: Row[] } {
  const rows = initial.map((r) => ({ ...r }));
  return {
    rows,
    async listAccountSites() {
      return rows.map((r) => ({ id: r.site_id, is_published: r.is_published }));
    },
    async unpublishSite(siteId: string) {
      const row = rows.find((r) => r.site_id === siteId);
      if (row) row.is_published = false; // NON distruttivo: la riga resta, solo il flag cambia
    },
  };
}

const now = new Date('2026-08-25T12:00:00.000Z');
// canceled => resolveEntitlement free => decadenza (fine grazia)
const canceledSub: Subscription = {
  plan: 'pro',
  status: 'canceled',
  current_period_end: '2026-09-25T12:00:00.000Z',
};
// pro attivo nel periodo => resolveEntitlement pro => nessuna retrocessione
const activeProSub: Subscription = {
  plan: 'pro',
  status: 'active',
  current_period_end: '2026-09-25T12:00:00.000Z',
};

const threePublished = (): Row[] => [
  { site_id: 's1', is_published: true },
  { site_id: 's2', is_published: true },
  { site_id: 's3', is_published: true },
];

describe('BIL-502 applySoftDowngrade — applicazione idempotente, non distruttiva', () => {
  // covers: AC-502-1
  it('3 siti pubblicati che passano a Free => 2 offline, 1 pubblicato, nessuno cancellato', async () => {
    const store = memStore(threePublished());
    const r = await applySoftDowngrade('acc', canceledSub, now, store);
    expect(r.unpublished).toEqual(['s2', 's3']); // covers: AC-502-1 — i 2 eccedenti offline
    expect(
      store.rows.filter((x) => x.is_published).map((x) => x.site_id),
    ).toEqual(['s1']); // covers: AC-502-1 — 1 resta pubblicato
    expect(store.rows).toHaveLength(3); // covers: AC-502-1 — nessuna riga cancellata
  });

  // covers: AC-502-2
  it('idempotente: una seconda applicazione con lo stesso stato non cambia nulla', async () => {
    const store = memStore(threePublished());
    await applySoftDowngrade('acc', canceledSub, now, store);
    const snapshot = store.rows.map((r) => ({ ...r }));
    const r2 = await applySoftDowngrade('acc', canceledSub, now, store);
    expect(r2.unpublished).toEqual([]); // covers: AC-502-2 — niente altro da mettere offline
    expect(store.rows).toEqual(snapshot); // covers: AC-502-2 — stato dei siti invariato
  });

  // covers: AC-502-3
  it('riattivazione Pro: dati intatti, i siti eccedenti tornano pubblicabili', async () => {
    const store = memStore(threePublished());
    await applySoftDowngrade('acc', canceledSub, now, store);
    // Nessun dato perso: le 3 righe esistono ancora dopo la retrocessione.
    expect(store.rows.map((r) => r.site_id).sort()).toEqual(['s1', 's2', 's3']); // covers: AC-502-3
    // Riattivando Pro non si tocca nulla (l'entitlement e pro => nessuna retrocessione).
    const r = await applySoftDowngrade('acc', activeProSub, now, store);
    expect(r.unpublished).toEqual([]); // covers: AC-502-3 — pro: nessuna azione
    expect(r.effectivePlan).toBe('pro'); // covers: AC-502-3
    expect(store.rows).toHaveLength(3); // covers: AC-502-3 — dati intatti, ripubblicabili
  });
});

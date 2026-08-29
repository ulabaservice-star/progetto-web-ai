import { describe, it, expect } from 'vitest';
import {
  applySoftDomainDowngrade,
  type DomainDowngradeStore,
} from '@/data/domain-downgrade';
import { PLAN_LIMITS, type Entitlement } from '@/domain/billing/entitlement';

// DOM-602 (macrotask domain-downgrade, p5-custom-domains-fase2) — applicazione idempotente della
// sospensione morbida dei domini custom. Store IN-MEMORY iniettato (nessun DB, nessuna
// service_role): idempotenza e non-delete provati senza rete. Le asserzioni derivano dagli
// acceptance_criteria AC-602-1..4.

const freeEnt: Entitlement = { plan: 'free', limits: PLAN_LIMITS.free };
const proEnt: Entitlement = { plan: 'pro', limits: PLAN_LIMITS.pro };

type Row = { id: string; status: string; normalized_hostname: string };

function memStore(
  initial: Row[],
): DomainDowngradeStore & { rows: Row[]; suspendCalls: string[] } {
  const rows = initial.map((r) => ({ ...r }));
  const suspendCalls: string[] = [];
  return {
    rows,
    suspendCalls,
    async listAccountDomains() {
      return rows.map((r) => ({
        id: r.id,
        status: r.status,
        normalized_hostname: r.normalized_hostname,
      }));
    },
    async suspendDomain(host: string) {
      suspendCalls.push(host);
      const row = rows.find((r) => r.normalized_hostname === host);
      if (row) row.status = 'suspended'; // NON distruttivo: la riga resta, cambia solo lo stato
    },
  };
}

const twoActive = (): Row[] => [
  { id: 'd1', status: 'active', normalized_hostname: 'uno.example.com' },
  { id: 'd2', status: 'active', normalized_hostname: 'due.example.com' },
];

describe('DOM-602 applySoftDomainDowngrade — sospensione morbida idempotente, non distruttiva', () => {
  // covers: AC-602-1
  it('Free con 2 domini active => entrambi suspended, nessuna riga persa, 2 chiamate', async () => {
    const store = memStore(twoActive());
    const r = await applySoftDomainDowngrade('acc', freeEnt, store);
    // I 2 collegamenti attivi passano a 'suspended'.
    expect(store.rows.every((x) => x.status === 'suspended')).toBe(true); // covers: AC-602-1
    expect(store.rows).toHaveLength(2); // covers: AC-602-1 — nessuna riga cancellata
    expect(store.suspendCalls).toHaveLength(2); // covers: AC-602-1 — un suspend per dominio
    expect(r.suspended).toEqual(['d1', 'd2']); // covers: AC-602-1 — ritorno con i 2 id
  });

  // covers: AC-602-2
  it('idempotente: una seconda applicazione (gia suspended) non sospende nulla', async () => {
    const store = memStore(twoActive());
    await applySoftDomainDowngrade('acc', freeEnt, store);
    expect(store.suspendCalls).toHaveLength(2); // covers: AC-602-2 — prima passata: 2 suspend
    const r2 = await applySoftDomainDowngrade('acc', freeEnt, store);
    expect(store.suspendCalls).toHaveLength(2); // covers: AC-602-2 — retry: nessun suspend in piu'
    expect(r2.suspended).toEqual([]); // covers: AC-602-2 — replay = no-op, nessun errore
  });

  // covers: AC-602-3
  it('dati intatti: dopo la sospensione ogni riga esiste ancora per id/host (riattivabile)', async () => {
    const original = twoActive();
    const store = memStore(original);
    await applySoftDomainDowngrade('acc', freeEnt, store);
    expect(store.rows).toHaveLength(2); // covers: AC-602-3 — nessuna perdita dati
    for (const orig of original) {
      const still = store.rows.find(
        (x) => x.id === orig.id && x.normalized_hostname === orig.normalized_hostname,
      );
      expect(still).toBeDefined(); // covers: AC-602-3 — id/host intatti, riattivabili
      expect(still?.status).toBe('suspended'); // covers: AC-602-3 — solo lo stato e' cambiato
    }
  });

  // covers: AC-602-4
  it('Pro (custom_domain=true): nessuna sospensione anche con domini active', async () => {
    const store = memStore(twoActive());
    const r = await applySoftDomainDowngrade('acc', proEnt, store);
    expect(store.suspendCalls).toHaveLength(0); // covers: AC-602-4 — piano include il dominio
    expect(r.suspended).toEqual([]); // covers: AC-602-4 — nessuna azione
    expect(store.rows.every((x) => x.status === 'active')).toBe(true); // covers: AC-602-4
  });
});

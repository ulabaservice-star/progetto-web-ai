import { describe, it, expect } from 'vitest';
import {
  applyDomainDowngrade,
  type DowngradeDomain,
} from '@/domain/domains/domain-downgrade';
import { PLAN_LIMITS, type Entitlement } from '@/domain/billing/entitlement';

// DOM-601 (macrotask domain-downgrade, p5-custom-domains-fase2) — applyDomainDowngrade PURO.
// Le asserzioni derivano dagli acceptance_criteria AC-601-1..4 (06-domain-downgrade.md).
// Funzione PURA: nessun DB, nessuna rete, nessun orologio (entitlement gia' risolto e iniettato).
// La decisione ha UNA sola fonte: limits.custom_domain (riuso dell'entitlement Fase 1, DOM-D8).
// La sospensione morbida non prevede mai una cancellazione: domainsToSuspend e' solo un elenco
// di collegamenti ATTIVI da portare 'suspended' (reversibile, nessun dato perso).

const freeEnt: Entitlement = { plan: 'free', limits: PLAN_LIMITS.free };
const proEnt: Entitlement = { plan: 'pro', limits: PLAN_LIMITS.pro };

const dom = (id: string, status: string): DowngradeDomain => ({ id, status });

describe('DOM-601 applyDomainDowngrade — sospensione morbida pura', () => {
  // covers: AC-601-1
  it('piano senza dominio custom => sospende SOLO gli active, esclude i non-attivi', () => {
    const r = applyDomainDowngrade(freeEnt, [
      dom('a', 'active'),
      dom('b', 'active'),
      dom('c', 'error'),
    ]);
    expect(r.domainsToSuspend).toEqual(['a', 'b']); // covers: AC-601-1 — esatto, 'c' escluso
    expect(r.domainsToSuspend).not.toContain('c'); // covers: AC-601-1 — il non-attivo non compare
  });

  // covers: AC-601-2
  it('piano che include il dominio custom => nessuna sospensione anche con domini active', () => {
    const r = applyDomainDowngrade(proEnt, [
      dom('a', 'active'),
      dom('b', 'active'),
    ]);
    expect(r.domainsToSuspend).toEqual([]); // covers: AC-601-2 — piano attivo: nessuna azione
  });

  // covers: AC-601-3
  it('nessuna cancellazione: solo active in domainsToSuspend, i non-attivi mai presenti', () => {
    const r = applyDomainDowngrade(freeEnt, [
      dom('act1', 'active'),
      dom('sus', 'suspended'),
      dom('err', 'error'),
      dom('pen', 'pending'),
      dom('act2', 'active'),
    ]);
    // Il contratto non prevede alcuna delete (DOM-D8, collegamento mai perso).
    expect(r).not.toHaveProperty('domainsToDelete'); // covers: AC-601-3
    expect(r).not.toHaveProperty('domainsToRemove'); // covers: AC-601-3
    // Solo i due 'active' compaiono; ogni id ritornato era 'active'.
    expect(r.domainsToSuspend).toEqual(['act1', 'act2']); // covers: AC-601-3
    // I non-attivi passati NON compaiono in domainsToSuspend.
    expect(r.domainsToSuspend).not.toContain('sus'); // covers: AC-601-3 — 'suspended' escluso
    expect(r.domainsToSuspend).not.toContain('err'); // covers: AC-601-3 — 'error' escluso
    expect(r.domainsToSuspend).not.toContain('pen'); // covers: AC-601-3 — 'pending' escluso
  });

  // covers: AC-601-4
  it('funzione pura: due chiamate con gli stessi argomenti danno esito identico', () => {
    const domains = [dom('a', 'active'), dom('b', 'suspended'), dom('c', 'active')];
    const r1 = applyDomainDowngrade(freeEnt, domains);
    const r2 = applyDomainDowngrade(freeEnt, domains);
    expect(r1).toEqual(r2); // covers: AC-601-4 — deterministica, nessun orologio/DB
    expect(r2).toEqual({ domainsToSuspend: ['a', 'c'] }); // covers: AC-601-4 — esito atteso
  });
});

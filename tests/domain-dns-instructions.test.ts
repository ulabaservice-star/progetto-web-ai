import { describe, it, expect, vi } from 'vitest';
import { dnsInstructionsFor } from '@/domain/domains/dns-instructions';

// DOM-131 (macrotask domain-dns, p5-custom-domains-fase2) — dnsInstructionsFor PURO.
// Le asserzioni derivano dagli acceptance_criteria AC-131-1..3 (04-domain-dns.md).
// apex => A/ALIAS name '@' verso target; subdomain => CNAME name = etichetta; token => TXT di verifica.
// Attese LETTERALI (mai un binding importato): l'asserzione puo' fallire davvero. PURA: nessun orologio.

describe('DOM-131 dnsInstructionsFor — record DNS puri e ordinati', () => {
  // covers: AC-131-1
  it('apex + token => record A/ALIAS name @ verso il target + TXT di verifica col token', () => {
    const records = dnsInstructionsFor('iltuobar.it', 'apex', 'a.b.vercel-dns.com', 't123');
    const primary = records.find((r) => r.name === '@');
    expect(primary).toBeDefined();
    expect(['A', 'ALIAS']).toContain(primary!.type); // covers: AC-131-1
    expect(primary!.value).toBe('a.b.vercel-dns.com'); // covers: AC-131-1 — verso il target
    expect(records).toContainEqual({ type: 'TXT', name: '_ulaba-verify', value: 't123' }); // covers: AC-131-1
  });

  // covers: AC-131-2
  it('subdomain senza token => CNAME name della etichetta verso il target, nessun TXT', () => {
    const records = dnsInstructionsFor('www.iltuobar.it', 'subdomain', 'cname.vercel-dns.com');
    expect(records).toContainEqual({ type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' }); // covers: AC-131-2
    expect(records.some((r) => r.type === 'TXT')).toBe(false); // covers: AC-131-2 — nessun TXT senza token
  });

  // covers: AC-131-3
  it('pura e deterministica: stessi argomenti => stessa lista, stesso ordine', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
      const first = dnsInstructionsFor('iltuobar.it', 'apex', 'a.b.vercel-dns.com', 't123');
      vi.setSystemTime(new Date('2030-06-15T12:34:56.000Z'));
      const second = dnsInstructionsFor('iltuobar.it', 'apex', 'a.b.vercel-dns.com', 't123');
      expect(second).toEqual(first); // covers: AC-131-3 — indipendente dall'orologio
      expect(first).toEqual([
        { type: 'ALIAS', name: '@', value: 'a.b.vercel-dns.com' },
        { type: 'TXT', name: '_ulaba-verify', value: 't123' },
      ]); // covers: AC-131-3 — lista letterale ordinata (primario poi TXT)
    } finally {
      vi.useRealTimers();
    }
  });

  // DoD-difesa (non-AC): "A (o ALIAS secondo target)" — target IPv4 => A, target hostname => ALIAS
  it('apex verso IP => record A; apex verso hostname => ALIAS', () => {
    expect(dnsInstructionsFor('iltuobar.it', 'apex', '76.76.21.21')).toContainEqual({
      type: 'A',
      name: '@',
      value: '76.76.21.21',
    });
    expect(dnsInstructionsFor('iltuobar.it', 'apex', 'a.b.vercel-dns.com')).toContainEqual({
      type: 'ALIAS',
      name: '@',
      value: 'a.b.vercel-dns.com',
    });
  });
});

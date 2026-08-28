import { describe, it, expect, vi } from 'vitest';
import { companionHostname } from '@/domain/domains/companion';

// DOM-121 (macrotask domain-companion, p5-custom-domains-fase2) — companionHostname PURO.
// Le asserzioni derivano dagli acceptance_criteria AC-121-1..3 (03-domain-companion.md).
// apex => companion www (kind subdomain); subdomain => null (nessun auto-apex, niente catene).
// Attese LETTERALI (mai un binding importato): l'asserzione puo' fallire davvero. PURA: nessun orologio.

describe('DOM-121 companionHostname — auto-www puro', () => {
  // covers: AC-121-1
  it('apex => companion www con kind subdomain', () => {
    expect(companionHostname('iltuobar.it', 'apex')).toEqual({
      hostname: 'www.iltuobar.it',
      kind: 'subdomain',
    }); // covers: AC-121-1
  });

  // covers: AC-121-2
  it('subdomain => nessun companion (null): niente auto-apex, niente catene', () => {
    expect(companionHostname('www.iltuobar.it', 'subdomain')).toBeNull(); // covers: AC-121-2
  });

  // covers: AC-121-3
  it('pura: stesso input => stesso esito, indipendente dall orologio', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
      const first = companionHostname('iltuobar.it', 'apex');
      vi.setSystemTime(new Date('2030-06-15T12:34:56.000Z'));
      const second = companionHostname('iltuobar.it', 'apex');
      expect(second).toEqual(first); // covers: AC-121-3 — nessuna dipendenza dall'orologio
      expect(second).toEqual({ hostname: 'www.iltuobar.it', kind: 'subdomain' }); // covers: AC-121-3
    } finally {
      vi.useRealTimers();
    }
  });
});

import { describe, it, expect, vi } from 'vitest';
import { normalizeHostname } from '@/domain/domains/hostname';

// DOM-111 (macrotask domain-hostname, p5-custom-domains-fase2) — normalizeHostname PURO.
// Le asserzioni derivano dagli acceptance_criteria AC-111-1..4 (02-domain-hostname.md).
// Funzione PURA: nessun DB/rete/DNS/orologio — l'esito dipende SOLO dall'argomento. Le attese
// sono LETTERALI scritti qui (mai un binding importato): l'asserzione puo' fallire davvero.

describe('DOM-111 normalizeHostname — forma canonica', () => {
  // covers: AC-111-1
  it('URL con schema/case/path/spazi => host canonico minuscolo', () => {
    const r = normalizeHostname('  HTTPS://IlTuoBar.IT/menu ');
    expect(r).toEqual({ ok: true, normalized: 'iltuobar.it' }); // covers: AC-111-1
  });

  // covers: AC-111-2
  it('senza TLD, con spazio o con porta => invalid_format', () => {
    expect(normalizeHostname('iltuobar')).toEqual({ ok: false, reason: 'invalid_format' }); // covers: AC-111-2
    expect(normalizeHostname('a b.it')).toEqual({ ok: false, reason: 'invalid_format' }); // covers: AC-111-2
    expect(normalizeHostname('iltuobar.it:8080')).toEqual({ ok: false, reason: 'invalid_format' }); // covers: AC-111-2
  });

  // covers: AC-111-3
  it('IDN => punycode', () => {
    const r = normalizeHostname('caffè.it');
    expect(r).toEqual({ ok: true, normalized: 'xn--caff-8oa.it' }); // covers: AC-111-3
  });

  // covers: AC-111-4
  it('pura: stesso input => stesso esito, indipendente dall orologio', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
      const first = normalizeHostname('caffè.it');
      vi.setSystemTime(new Date('2030-06-15T12:34:56.000Z'));
      const second = normalizeHostname('caffè.it');
      expect(second).toEqual(first); // covers: AC-111-4 — nessuna dipendenza dall'orologio
      expect(second).toEqual({ ok: true, normalized: 'xn--caff-8oa.it' }); // covers: AC-111-4
    } finally {
      vi.useRealTimers();
    }
  });
});

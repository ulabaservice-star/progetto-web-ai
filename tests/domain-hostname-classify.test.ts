import { describe, it, expect, vi } from 'vitest';
import { classifyHostname } from '@/domain/domains/hostname';

// DOM-112 (macrotask domain-hostname, p5-custom-domains-fase2) — classifyHostname PURO.
// Le asserzioni derivano dagli acceptance_criteria AC-112-1..4 (02-domain-hostname.md).
// apex = eTLD+1 registrabile; subdomain = etichetta in piu'; reserved-domains respinti (DOM-D7).
// Attese LETTERALI (mai un binding importato): l'asserzione puo' fallire davvero. PURA: nessun orologio.

describe('DOM-112 classifyHostname — apex/subdomain + reserved', () => {
  // covers: AC-112-1
  it('registrable di 2° livello => apex', () => {
    expect(classifyHostname('iltuobar.it')).toEqual({ ok: true, kind: 'apex' }); // covers: AC-112-1
  });

  // covers: AC-112-2
  it('con etichetta in piu => subdomain', () => {
    expect(classifyHostname('www.iltuobar.it')).toEqual({ ok: true, kind: 'subdomain' }); // covers: AC-112-2
  });

  // covers: AC-112-3
  it('domini riservati (piattaforma/vercel) => reserved', () => {
    expect(classifyHostname('ulaba.net')).toEqual({ ok: false, reason: 'reserved' }); // covers: AC-112-3
    expect(classifyHostname('foo.ulaba.net')).toEqual({ ok: false, reason: 'reserved' }); // covers: AC-112-3
    expect(classifyHostname('x.vercel.app')).toEqual({ ok: false, reason: 'reserved' }); // covers: AC-112-3
  });

  // covers: AC-112-4
  it('pura: stesso input => stesso esito, indipendente dall orologio', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
      const first = classifyHostname('www.iltuobar.it');
      vi.setSystemTime(new Date('2030-06-15T12:34:56.000Z'));
      const second = classifyHostname('www.iltuobar.it');
      expect(second).toEqual(first); // covers: AC-112-4 — nessuna dipendenza dall'orologio
      expect(second).toEqual({ ok: true, kind: 'subdomain' }); // covers: AC-112-4
    } finally {
      vi.useRealTimers();
    }
  });
});

// Difese addizionali del DoD DOM-112 (fuori dagli AC nominali, per la batteria di mutazione):
// localhost e non-FQDN => reserved; la lista reserved e' INIETTABILE (default costante).
describe('DOM-112 classifyHostname — difese DoD', () => {
  it('localhost e non-FQDN => reserved', () => {
    expect(classifyHostname('localhost')).toEqual({ ok: false, reason: 'reserved' });
    expect(classifyHostname('iltuobar')).toEqual({ ok: false, reason: 'reserved' });
  });

  it('reserved iniettabile: lista custom rispettata, lista vuota non riserva un apex valido', () => {
    expect(classifyHostname('example.com', ['example.com'])).toEqual({ ok: false, reason: 'reserved' });
    expect(classifyHostname('example.com', [])).toEqual({ ok: true, kind: 'apex' });
  });
});

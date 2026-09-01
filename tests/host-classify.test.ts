import { describe, it, expect, vi } from 'vitest';
import { classifyRequestHost } from '@/domain/hosting/classify-host';

// PUB-101 (macrotask host-classify, p6a-public-surface) — classifyRequestHost PURO.
// Le asserzioni derivano dagli acceptance_criteria AC-101-1..4 (01-host-classify.md).
// app = appHost o suo sottodominio; landing = landingHost o 'www.'+landingHost; altrimenti custom.
// Fail-safe: landingHost null => mai 'landing'. Attese LETTERALI, nessun binding importato.

const cfg = { appHost: 'app.ulaba.net', landingHost: 'ulaba.net' } as const;

describe('PUB-101 classifyRequestHost — app/landing/custom', () => {
  // covers: AC-101-1
  it('app apex e sottodominio app => app', () => {
    expect(classifyRequestHost('app.ulaba.net', cfg)).toBe('app'); // covers: AC-101-1
    expect(classifyRequestHost('preview.app.ulaba.net', cfg)).toBe('app'); // covers: AC-101-1
  });

  // covers: AC-101-2
  it('landing apex e www => landing', () => {
    expect(classifyRequestHost('ulaba.net', cfg)).toBe('landing'); // covers: AC-101-2
    expect(classifyRequestHost('www.ulaba.net', cfg)).toBe('landing'); // covers: AC-101-2
  });

  // covers: AC-101-3
  it('host cliente => custom', () => {
    expect(classifyRequestHost('iltuobar.it', cfg)).toBe('custom'); // covers: AC-101-3
  });

  // covers: AC-101-4
  it('fail-safe: senza landingHost, un host che sarebbe la landing => custom (mai landing)', () => {
    const noLanding = { appHost: 'app.ulaba.net', landingHost: null } as const;
    expect(classifyRequestHost('ulaba.net', noLanding)).toBe('custom'); // covers: AC-101-4
    expect(classifyRequestHost('www.ulaba.net', noLanding)).toBe('custom'); // covers: AC-101-4
  });

  // covers: AC-101-1 — pura: nessuna dipendenza dall'orologio
  it('pura: stesso input => stesso esito indipendente dall orologio', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
      const first = classifyRequestHost('preview.app.ulaba.net', cfg);
      vi.setSystemTime(new Date('2030-06-15T12:34:56.000Z'));
      const second = classifyRequestHost('preview.app.ulaba.net', cfg);
      expect(second).toBe(first); // covers: AC-101-1
      expect(second).toBe('app'); // covers: AC-101-1
    } finally {
      vi.useRealTimers();
    }
  });
});

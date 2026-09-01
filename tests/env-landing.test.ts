import { describe, it, expect } from 'vitest';
import { getLandingHost, getLandingBaseUrl } from '@/config/env';

// PUB-102 (macrotask host-classify, p6a-public-surface) — accessor landing da NEXT_PUBLIC_LANDING_URL.
// Le asserzioni derivano dagli acceptance_criteria AC-102-1..4 (01-host-classify.md). `source` sempre
// INIETTATO (mai il process.env reale): l'asserzione puo' fallire davvero.

describe('PUB-102 getLandingHost — hostname da NEXT_PUBLIC_LANDING_URL', () => {
  // covers: AC-102-1
  it('URL valorizzato => hostname minuscolo senza porta', () => {
    expect(getLandingHost({ NEXT_PUBLIC_LANDING_URL: 'https://Ulaba.net:443' })).toBe('ulaba.net'); // covers: AC-102-1
  });

  // covers: AC-102-2
  it('assente o solo-whitespace => null (fail-safe)', () => {
    expect(getLandingHost({})).toBeNull(); // covers: AC-102-2
    expect(getLandingHost({ NEXT_PUBLIC_LANDING_URL: '   ' })).toBeNull(); // covers: AC-102-2
  });

  // covers: AC-102-3
  it('non parsabile come URL => null, senza lanciare', () => {
    expect(getLandingHost({ NEXT_PUBLIC_LANDING_URL: 'non-un-url' })).toBeNull(); // covers: AC-102-3
  });
});

describe('PUB-102 getLandingBaseUrl — base assoluta landing', () => {
  // covers: AC-102-4
  it('URL con slash finale => base senza slash finale', () => {
    expect(getLandingBaseUrl({ NEXT_PUBLIC_LANDING_URL: 'https://ulaba.net/' })).toBe('https://ulaba.net'); // covers: AC-102-4
  });

  // covers: AC-102-4
  it('assente => default di sviluppo (come getSiteBaseUrl)', () => {
    expect(getLandingBaseUrl({})).toBe('http://localhost:3000'); // covers: AC-102-4
  });
});

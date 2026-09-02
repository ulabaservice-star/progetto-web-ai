import { describe, it, expect } from 'vitest';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';
import { flattenKeys } from '@/i18n/keys';

// Differenza simmetrica tra due Set: elementi presenti in uno solo dei due.
function symmetricDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  const diff = new Set<T>();
  for (const x of a) if (!b.has(x)) diff.add(x);
  for (const x of b) if (!a.has(x)) diff.add(x);
  return diff;
}

// Risolve un path puntato ("hero.headline") dentro un oggetto di messaggi.
function resolve(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, key) =>
      acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
    obj,
  );
}

// Il namespace 'landing' è tipizzato tramite messages.d.ts (typeof it.json); qui
// lo trattiamo come Record per la visita per-chiave dei test di parità.
const itLanding = itMessages.landing as Record<string, unknown>;
const esLanding = esMessages.landing as Record<string, unknown>;

// I path-foglia richiesti da AC-121-2 (devono risolvere a stringa non vuota in entrambi i cataloghi).
const REQUIRED_LEAVES = [
  'hero.headline',
  'hero.sub',
  'hero.cta',
  'waitlist.emailLabel',
  'waitlist.submit',
  'waitlist.consentLabel',
  'waitlist.successExisting',
  'waitlist.unavailable',
  'nav.home',
  'nav.blog',
  'nav.privacy',
  'footer.tagline',
];

// Le coppie IT/ES che AC-121-3 esige divergenti (ES localizzato, non calco dell'IT).
const DIVERGENT_LEAVES = ['hero.headline', 'hero.sub', 'waitlist.submit'];

describe('PUB-121 parità namespace i18n landing (it ↔ es)', () => {
  it('i path-foglia di landing coincidono fra it ed es (differenza simmetrica vuota)', () => {
    const ki = flattenKeys(itLanding);
    const ke = flattenKeys(esLanding);
    expect(ki.size).toBeGreaterThan(0);
    expect(symmetricDifference(ki, ke).size).toBe(0); // covers: AC-121-1
    expect([...ki].sort()).toEqual([...ke].sort()); // covers: AC-121-1
  });

  it('ogni path richiesto risolve a una stringa non vuota sia in it sia in es', () => {
    for (const path of REQUIRED_LEAVES) {
      for (const [catalog, root] of [
        ['it', itLanding],
        ['es', esLanding],
      ] as const) {
        const value = resolve(root, path);
        expect(typeof value, `${catalog}.landing.${path}`).toBe('string');
        expect((value as string).length, `${catalog}.landing.${path}`).toBeGreaterThan(0); // covers: AC-121-2
      }
    }
  });

  it('i valori ES di hero.headline, hero.sub e waitlist.submit divergono dall’IT (localizzati, non calchi)', () => {
    for (const path of DIVERGENT_LEAVES) {
      const vi = resolve(itLanding, path);
      const ve = resolve(esLanding, path);
      expect(typeof vi).toBe('string');
      expect(typeof ve).toBe('string');
      expect(ve, `${path} deve essere localizzato in ES`).not.toBe(vi); // covers: AC-121-3
    }
  });
});

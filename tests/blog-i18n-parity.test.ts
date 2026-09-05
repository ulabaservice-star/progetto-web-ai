import { describe, it, expect } from 'vitest';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';
import { flattenKeys } from '@/i18n/keys';

// PUB-421 (macrotask blog-list, p6a-public-surface) — parita' del namespace i18n 'blog' fra it ed es.
// AC-421-4: i path-foglia di 'blog' sono IDENTICI nei due cataloghi (nessuna chiave orfana). Gemello di
// marketing-i18n-parity (namespace 'landing') e della parita' 'privacy' in privacy-page.

// Differenza simmetrica tra due Set: elementi presenti in uno solo dei due.
function symmetricDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  const diff = new Set<T>();
  for (const x of a) if (!b.has(x)) diff.add(x);
  for (const x of b) if (!a.has(x)) diff.add(x);
  return diff;
}

describe('PUB-421 parità namespace i18n blog (it ↔ es)', () => {
  it('AC-421-4: i path-foglia di blog coincidono fra it ed es (differenza simmetrica vuota)', () => {
    const ki = flattenKeys(itMessages.blog as unknown as Record<string, unknown>);
    const ke = flattenKeys(esMessages.blog as unknown as Record<string, unknown>);
    expect(ki.size).toBeGreaterThan(0); // covers: AC-421-4
    expect(symmetricDifference(ki, ke).size).toBe(0); // covers: AC-421-4
    expect([...ki].sort()).toEqual([...ke].sort()); // covers: AC-421-4
  });
});

// PUB-501 — cutover: test dell'oracolo di go-live evaluateCutover.
// Le asserzioni derivano da AC-501-1..4 del blueprint 22-cutover.md (P6A-D12,
// ordine obbligato delle sonde: landing root 200 -> app raggiungibile ->
// auth redirect sull'app host -> host-split di robots corretto).
// Prosa in italiano, identificatori in inglese.
import { describe, it, expect } from 'vitest';
import { evaluateCutover } from '@/domain/hosting/cutover';

// Sonde-base "tutte verdi": punto di partenza da cui ogni caso sovrascrive un
// singolo campo per isolare il blocker sotto esame.
const green = {
  appHost: 'app.ulaba.net',
  landingRootStatus: 200,
  appReachable: true,
  authRedirectHost: 'app.ulaba.net',
  robotsHostSplitCorrect: true,
} as const;

describe('evaluateCutover', () => {
  it('da go quando tutte le sonde sono verdi', () => {
    // covers: AC-501-1
    const result = evaluateCutover(green);
    expect(result.go).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('blocca quando la landing root non risponde 200', () => {
    // covers: AC-501-2
    const result = evaluateCutover({ ...green, landingRootStatus: 502 });
    expect(result.go).toBe(false);
    expect(result.reasons).toContain('landing-root-not-200');
  });

  it("blocca quando l'auth redirect non punta all'app host", () => {
    // covers: AC-501-3
    const result = evaluateCutover({ ...green, authRedirectHost: 'ulaba.net' });
    expect(result.go).toBe(false);
    expect(result.reasons).toContain('auth-redirect-not-app-host');
  });

  it('blocca quando lo host-split di robots e scorretto', () => {
    // covers: AC-501-4
    const result = evaluateCutover({ ...green, robotsHostSplitCorrect: false });
    expect(result.go).toBe(false);
    expect(result.reasons).toContain('robots-host-split-incorrect');
  });
});

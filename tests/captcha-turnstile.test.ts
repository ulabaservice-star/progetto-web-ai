import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isTurnstileConfigured, createTurnstileVerifier } from '@/data/captcha/turnstile';

// PUB-222 (macrotask captcha-port, p6a-public-surface) — adattatore Turnstile della porta CaptchaVerifier.
// Asserzioni da AC-222-1..3 (08-captcha-port.md): (1) source senza TURNSTILE_SECRET_KEY (o '   ') =>
// isTurnstileConfigured false (inerte, l'endpoint degradera' a 'non disponibile', mai un 500); (2)
// fetchImpl fake { success: true } => verify => { ok: true }; (3) fetchImpl fake { success: false } o che
// LANCIA un errore di rete => verify => { ok: false } SENZA propagare. Il seam di rete e' `fetchImpl`
// iniettato: nel verde nessuna chiamata reale a Cloudflare, nessun segreto reale. Attese LETTERALI.

const TURNSTILE_PATH = fileURLToPath(new URL('../src/data/captcha/turnstile.ts', import.meta.url));

// Secret di test a BASSA entropia (identificatore non-sensibile): serve solo a costruire il verifier,
// non deve somigliare a una chiave vera ne' essere scambiato per un segreto da gitleaks.
const FAKE_SECRET = 'fake-secret-not-real';

// fetchImpl fake: risponde con un Response reale (globale in Node) col body JSON dato, cosi' l'adattatore
// usa .json()/.ok come col fetch vero. `throws: true` simula invece un guasto di rete (fetch che rigetta).
function fakeFetch(body: unknown, opts: { throws?: boolean; status?: number } = {}): typeof fetch {
  return (async () => {
    if (opts.throws) throw new Error('network down');
    return new Response(JSON.stringify(body), { status: opts.status ?? 200 });
  }) as typeof fetch;
}

describe('PUB-222 adattatore Turnstile di CaptchaVerifier', () => {
  // covers: AC-222-1
  it('source senza TURNSTILE_SECRET_KEY => isTurnstileConfigured false', () => {
    expect(isTurnstileConfigured({})).toBe(false); // covers: AC-222-1
    expect(isTurnstileConfigured({ TURNSTILE_SECRET_KEY: '   ' })).toBe(false); // covers: AC-222-1
  });

  // Contro-prova (non-tautologia di AC-222-1): un secret valorizzato => true.
  it('source con TURNSTILE_SECRET_KEY valorizzato => isTurnstileConfigured true', () => {
    expect(isTurnstileConfigured({ TURNSTILE_SECRET_KEY: 'x' })).toBe(true);
  });

  // covers: AC-222-2
  it('fetchImpl che risponde { success: true } => verify => { ok: true }', async () => {
    const verifier = createTurnstileVerifier({ secret: FAKE_SECRET, fetchImpl: fakeFetch({ success: true }) });
    const result = await verifier.verify('token-valido');
    expect(result).toEqual({ ok: true }); // covers: AC-222-2
  });

  // covers: AC-222-3
  it('fetchImpl che risponde { success: false } => verify => { ok: false }', async () => {
    const verifier = createTurnstileVerifier({ secret: FAKE_SECRET, fetchImpl: fakeFetch({ success: false }) });
    const result = await verifier.verify('token');
    expect(result).toEqual({ ok: false }); // covers: AC-222-3
  });

  // covers: AC-222-3
  it('fetchImpl che LANCIA un errore di rete => verify => { ok: false } senza propagare', async () => {
    const verifier = createTurnstileVerifier({ secret: FAKE_SECRET, fetchImpl: fakeFetch({}, { throws: true }) });
    await expect(verifier.verify('token')).resolves.toEqual({ ok: false }); // covers: AC-222-3
  });

  // covers: AC-222-3 (inerte: secret assente => nessuna rete, { ok: false } senza lanciare)
  it('secret vuoto => verify => { ok: false } senza toccare la rete', async () => {
    let called = false;
    const spyFetch = (async () => {
      called = true;
      return new Response('{}');
    }) as typeof fetch;
    const verifier = createTurnstileVerifier({ secret: '', fetchImpl: spyFetch });
    await expect(verifier.verify('token')).resolves.toEqual({ ok: false }); // covers: AC-222-3
    expect(called).toBe(false);
  });

  // Guard di DoD: import 'server-only' in testa + nessun secret hardcoded nel sorgente.
  it('ha import "server-only" in testa e nessun secret hardcoded (guard DoD)', () => {
    const src = readFileSync(TURNSTILE_PATH, 'utf8');
    expect(/^\s*import\s+['"]server-only['"];?/m.test(src)).toBe(true);
    expect(src.includes('0x4AAAAAAA')).toBe(false);
  });
});

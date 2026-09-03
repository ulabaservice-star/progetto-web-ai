import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makeFakeCaptchaVerifier, type CaptchaVerifier } from '@/domain/captcha/captcha-port';

// PUB-221 (macrotask captcha-port, p6a-public-surface) — la PORTA CaptchaVerifier, dominio PURO
// (un'interfaccia + un fake iniettabile). Le asserzioni derivano dagli acceptance_criteria AC-221-1/2
// (08-captcha-port.md): un fake { ok: true } => verify risolve { ok: true }; un fake { ok: false } =>
// verify risolve { ok: false }. Attese LETTERALI: nessun binding importato guida l'esito, il test puo'
// fallire davvero. La purezza della porta (nessun import di rete/env/adattatore) e' un guard di DoD.

const PORT_PATH = fileURLToPath(new URL('../src/domain/captcha/captcha-port.ts', import.meta.url));

describe('PUB-221 CaptchaVerifier — porta pura + fake iniettabile', () => {
  // covers: AC-221-1
  it('un fake { ok: true } risolve verify(token) => { ok: true }', async () => {
    const verifier: CaptchaVerifier = makeFakeCaptchaVerifier({ ok: true });
    const result = await verifier.verify('qualsiasi-token');
    expect(result).toEqual({ ok: true }); // covers: AC-221-1
  });

  // covers: AC-221-2
  it('un fake { ok: false } risolve verify(token) => { ok: false }', async () => {
    const verifier: CaptchaVerifier = makeFakeCaptchaVerifier({ ok: false });
    const result = await verifier.verify('qualsiasi-token');
    expect(result).toEqual({ ok: false }); // covers: AC-221-2
  });

  // Guard di DoD (non un AC): la porta e' pura — nessun import di VALORE, nessun modulo di rete/env/
  // adattatore. Se qualcuno cabla fetch/undici/next/process.env o l'adattatore Turnstile qui, rosso.
  it('non importa alcun modulo di rete/env/adattatore: dominio puro (guard DoD)', () => {
    const src = readFileSync(PORT_PATH, 'utf8');
    const importLines = src.split(/\r?\n/).filter((l) => /^\s*import\b/.test(l));
    expect(importLines.every((l) => /^\s*import\s+type\b/.test(l))).toBe(true);
    expect(
      importLines.some((l) =>
        /next|process\.env|undici|node-fetch|node:https?|https?:|turnstile/i.test(l),
      ),
    ).toBe(false);
  });
});

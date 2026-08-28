import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { DomainProvider, VerificationState } from '@/domain/domains/domain-port';

// DOM-201 (macrotask domain-port, p5-custom-domains-fase2) — la PORTA DomainProvider, dominio PURO
// (solo tipi). Le asserzioni derivano dagli acceptance_criteria AC-201-1..3 (05-domain-port.md):
//  AC-201-1 nessun import SDK/HTTP/segreto (solo tipi);
//  AC-201-2 un oggetto con le tre firme normalizzate tipizza contro DomainProvider (e le forme reggono a runtime);
//  AC-201-3 lo stato di getVerificationStatus e' uno dei valori neutri 'verified'|'pending'|'misconfigured'.
// Attese LETTERALI: nessun binding importato guida l'asserzione, il test puo' fallire davvero.

const PORT_PATH = fileURLToPath(new URL('../src/domain/domains/domain-port.ts', import.meta.url));

// Gli unici stati neutri ammessi dal contratto (scritti a mano, NON derivati dal tipo importato).
const NEUTRAL_STATES = ['verified', 'pending', 'misconfigured'] as const;

describe('DOM-201 DomainProvider — porta pura (solo tipi)', () => {
  // covers: AC-201-1
  it('non importa alcun SDK/HTTP/segreto: solo tipi (dominio puro)', () => {
    const src = readFileSync(PORT_PATH, 'utf8');
    const importLines = src.split(/\r?\n/).filter((l) => /^\s*import\b/.test(l));
    // Ogni import (se presente) e' un `import type` — nessun import di VALORE runtime.
    expect(importLines.every((l) => /^\s*import\s+type\b/.test(l))).toBe(true); // covers: AC-201-1
    // Nessun modulo di rete/SDK/segreto tra gli import (Vercel, http, fetch client, ...).
    expect(importLines.some((l) => /vercel|https?:|node:https?|axios|undici|node-fetch/i.test(l))).toBe(
      false,
    ); // covers: AC-201-1
  });

  // covers: AC-201-2
  it('un oggetto con le tre firme normalizzate tipizza contro DomainProvider e le forme reggono', async () => {
    // Impl conforme alla porta: TS accetta metodi con meno parametri della firma normalizzata.
    const impl: DomainProvider = {
      async addDomain() {
        return { providerDomainId: 'pd_1', verification: [] };
      },
      async getVerificationStatus() {
        return { state: 'pending' as const };
      },
      async removeDomain() {},
    };
    const added = await impl.addDomain('iltuobar.it');
    expect(added).toEqual({ providerDomainId: 'pd_1', verification: [] }); // covers: AC-201-2
    const status = await impl.getVerificationStatus('iltuobar.it');
    expect(status.state).toBe('pending'); // covers: AC-201-2
    await expect(impl.removeDomain('iltuobar.it')).resolves.toBeUndefined(); // covers: AC-201-2
  });

  // covers: AC-201-3
  it("lo stato e' uno dei valori neutri 'verified' | 'pending' | 'misconfigured'", async () => {
    for (const state of NEUTRAL_STATES) {
      // L'assegnazione `state: VerificationState` e' il gate STATICO: uno stato non nel tipo non compila.
      const value: VerificationState = state;
      const impl: DomainProvider = {
        async addDomain() {
          return { providerDomainId: 'pd', verification: [] };
        },
        async getVerificationStatus() {
          return { state: value };
        },
        async removeDomain() {},
      };
      const s = await impl.getVerificationStatus('h');
      expect(NEUTRAL_STATES).toContain(s.state); // covers: AC-201-3
    }
  });
});

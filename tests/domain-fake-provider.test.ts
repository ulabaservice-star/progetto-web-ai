import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFakeDomainProvider } from './helpers/fake-domain-provider';

// DOM-202 (macrotask domain-port, p5-custom-domains-fase2) — createFakeDomainProvider(): implementazione
// in-memory della porta per i test, SENZA rete ne' chiavi (DOM-D9). Asserzioni da AC-202-1..3
// (05-domain-port.md):
//  AC-202-1 seed 'verified' => getVerificationStatus ritorna 'verified' senza rete;
//  AC-202-2 fake vuoto: addDomain registra (stato iniziale 'pending' + verification[] non vuoto);
//  AC-202-3 removeDomain rimuove davvero (host non piu' registrato).
// Attese LETTERALI: nessun binding importato guida l'esito.

const FAKE_PATH = fileURLToPath(new URL('./helpers/fake-domain-provider.ts', import.meta.url));

describe('DOM-202 createFakeDomainProvider — porta in-memory per i test', () => {
  // covers: AC-202-1
  it("seed 'verified' => getVerificationStatus ritorna 'verified' senza rete", async () => {
    const fake = createFakeDomainProvider({ 'iltuobar.it': 'verified' });
    const status = await fake.getVerificationStatus('iltuobar.it');
    expect(status.state).toBe('verified'); // covers: AC-202-1
    // "senza rete": il file del fake non importa alcun modulo di rete/SDK.
    const src = readFileSync(FAKE_PATH, 'utf8');
    const importLines = src.split(/\r?\n/).filter((l) => /^\s*import\b/.test(l));
    expect(importLines.some((l) => /vercel|https?:|node:https?|axios|undici|node-fetch/i.test(l))).toBe(
      false,
    ); // covers: AC-202-1
  });

  // covers: AC-202-2
  it("fake vuoto: addDomain registra con stato iniziale 'pending' e verification[] non vuoto", async () => {
    const fake = createFakeDomainProvider();
    const added = await fake.addDomain('iltuobar.it');
    expect(added.providerDomainId).toBeTruthy(); // covers: AC-202-2
    expect(added.verification.length).toBeGreaterThan(0); // covers: AC-202-2 — verification[] non vuoto
    const status = await fake.getVerificationStatus('iltuobar.it');
    expect(status.state).toBe('pending'); // covers: AC-202-2 — stato iniziale
    expect(fake.calls.addDomain).toContain('iltuobar.it'); // registro ispezionabile
  });

  // covers: AC-202-3
  it('removeDomain rimuove davvero: dopo la rimozione l host non e piu registrato', async () => {
    const fake = createFakeDomainProvider({ 'iltuobar.it': 'verified' });
    await fake.removeDomain('iltuobar.it');
    // "non piu' registrato": interrogare lo stato di un host sconosciuto e' un errore (come il provider reale).
    await expect(fake.getVerificationStatus('iltuobar.it')).rejects.toThrow(); // covers: AC-202-3
    expect(fake.calls.removeDomain).toContain('iltuobar.it'); // registro ispezionabile
  });
});

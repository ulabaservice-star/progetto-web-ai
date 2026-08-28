import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createVercelDomainProvider,
  VercelDomainError,
  type VercelDomainConfig,
} from '@/data/domain/vercel';

// DOM-211 (macrotask domain-vercel, p5-custom-domains-fase2) — adattatore Vercel di DomainProvider.
// Asserzioni da AC-211-1..4 (06-domain-vercel.md): (1) import senza env non lancia (lazy); (2) config che
// simula 'verified' => getVerificationStatus 'verified'; (3) 'domain già usato' su addDomain => esito
// TIPIZZATO (VercelDomainError), loggato, SENZA esporre il token; (4) nessun segreto hardcoded nel sorgente.
// Il seam di rete e' `fetchImpl` iniettato (nessuna rete reale). Attese LETTERALI.

const VERCEL_PATH = fileURLToPath(new URL('../src/data/domain/vercel.ts', import.meta.url));
// Bearer di test: valore a BASSA entropia e identificatore non-sensibile, cosi' non e' scambiato per un
// segreto reale dall'oracolo gitleaks (regola trueline-generic-assigned-secret). Serve solo a provare
// che NON compaia nei log (AC-211-3), non deve somigliare a un token vero.
const FAKE_AUTH = 'fake-auth-not-secret';

// fetchImpl fake: risponde in base a method+path con {status, body}. Ritorna un Response reale
// (globale in Node) — cosi' l'adattatore usa .ok/.status/.json() come col fetch vero.
function fakeFetch(
  route: (method: string, url: string) => { status: number; body: unknown },
): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const { status, body } = route(method, url);
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}

function baseConfig(fetchImpl: typeof fetch): VercelDomainConfig {
  return {
    token: FAKE_AUTH,
    projectId: 'prj_test',
    apexTarget: '76.76.21.21',
    cnameTarget: 'cname.vercel-dns.com',
    fetchImpl,
  };
}

describe('DOM-211 adattatore Vercel di DomainProvider', () => {
  // covers: AC-211-1
  it('importare il modulo senza alcuna env Vercel non lancia (client lazy)', async () => {
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    await expect(import('@/data/domain/vercel')).resolves.toBeDefined(); // covers: AC-211-1
  });

  // covers: AC-211-2
  it("config che simula una risposta Vercel 'verified' => getVerificationStatus 'verified'", async () => {
    const fetchImpl = fakeFetch((method) => {
      if (method === 'GET') return { status: 200, body: { verified: true, verification: [] } };
      return { status: 200, body: {} };
    });
    const provider = createVercelDomainProvider(baseConfig(fetchImpl));
    const status = await provider.getVerificationStatus('iltuobar.it');
    expect(status.state).toBe('verified'); // covers: AC-211-2
  });

  // covers: AC-211-2 (difesa DoD: non-verificato => 'pending')
  it("non verificato con verification[] => 'pending' (mappatura)", async () => {
    const fetchImpl = fakeFetch(() => ({
      status: 200,
      body: {
        verified: false,
        verification: [
          { type: 'TXT', domain: '_vercel.iltuobar.it', value: 'vc-abc', reason: 'pending_domain_verification' },
        ],
      },
    }));
    const provider = createVercelDomainProvider(baseConfig(fetchImpl));
    const status = await provider.getVerificationStatus('iltuobar.it');
    expect(status.state).toBe('pending');
  });

  // covers: AC-211-3
  it("'domain già usato' su addDomain => VercelDomainError tipizzato, loggato, senza esporre il token", async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const fetchImpl = fakeFetch((method) => {
        if (method === 'POST') {
          return {
            status: 409,
            body: { error: { code: 'domain_already_in_use', message: 'in use' } },
          };
        }
        return { status: 200, body: {} };
      });
      const provider = createVercelDomainProvider(baseConfig(fetchImpl));
      await expect(provider.addDomain('iltuobar.it')).rejects.toBeInstanceOf(VercelDomainError); // covers: AC-211-3
      await expect(provider.addDomain('iltuobar.it')).rejects.toMatchObject({
        code: 'domain_already_in_use',
      }); // covers: AC-211-3 — non un throw opaco
      // il token NON compare in nessun argomento loggato (anti-leak).
      const loggedText = errSpy.mock.calls.flat().map(String).join(' ');
      expect(loggedText).not.toContain(FAKE_AUTH); // covers: AC-211-3
    } finally {
      errSpy.mockRestore();
    }
  });

  // covers: AC-211-4
  it('nessun segreto hardcoded nel sorgente: il token arriva da config/env', () => {
    const src = readFileSync(VERCEL_PATH, 'utf8');
    // Nessun `token: '...'` letterale (il token viene iniettato via config).
    expect(src).not.toMatch(/token\s*:\s*['"][^'"]+['"]/); // covers: AC-211-4
    // Il token reale proviene da process.env (wiring lazy), non dal sorgente.
    expect(src).toContain('process.env.VERCEL_TOKEN'); // covers: AC-211-4
  });
});

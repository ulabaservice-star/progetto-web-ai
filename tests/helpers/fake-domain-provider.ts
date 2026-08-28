// DOM-202 (macrotask domain-port, p5-custom-domains-fase2) — Fake DomainProvider per i test: implementa
// la porta (domain-port.ts) SENZA rete ne' chiavi reali (DOM-D9), cosi' il checkpoint degli endpoint/UI/
// downgrade e' verde senza segreti Vercel. E' un doppio ISPEZIONABILE (registra le chiamate in `calls`) e
// CONFIGURABILE (seed host->stato). Gemello di fake-payment-provider.ts. Deterministico: nessun
// Math.random/Date — providerDomainId e verification[] derivano dall'host.

import type {
  DomainProvider,
  VerificationRequirement,
  VerificationState,
} from '@/domain/domains/domain-port';

/** Fake iniettabile: la porta + un registro ispezionabile delle chiamate. */
export type FakeDomainProvider = DomainProvider & {
  readonly calls: {
    addDomain: string[];
    removeDomain: string[];
    getVerificationStatus: string[];
  };
};

/** Challenge di verifica finto ma NON vuoto e deterministico (derivato dall'host). */
function fakeVerification(normalized: string): VerificationRequirement[] {
  return [
    {
      type: 'TXT',
      domain: '_ulaba-verify.' + normalized,
      value: 'fake-verify-' + normalized,
      reason: 'pending_domain_verification',
    },
  ];
}

/**
 * Costruisce un fake DomainProvider in-memory. `seed` registra host gia' presenti con lo stato voluto
 * (es. { 'iltuobar.it': 'verified' }). addDomain registra l'host come 'pending' con un verification[]
 * non vuoto; getVerificationStatus ritorna lo stato registrato e RIFIUTA (throw) per un host sconosciuto
 * (come il provider reale interrogato su un dominio mai aggiunto); removeDomain lo rimuove davvero.
 */
export function createFakeDomainProvider(
  seed: Record<string, VerificationState> = {},
): FakeDomainProvider {
  const registry = new Map<string, { state: VerificationState; verification: VerificationRequirement[] }>();
  for (const [host, state] of Object.entries(seed)) {
    registry.set(host, { state, verification: fakeVerification(host) });
  }

  const calls: FakeDomainProvider['calls'] = {
    addDomain: [],
    removeDomain: [],
    getVerificationStatus: [],
  };

  return {
    calls,
    async addDomain(normalized: string) {
      calls.addDomain.push(normalized);
      const verification = fakeVerification(normalized);
      registry.set(normalized, { state: 'pending', verification });
      return { providerDomainId: 'fake_domain_' + normalized, verification };
    },
    async getVerificationStatus(normalized: string) {
      calls.getVerificationStatus.push(normalized);
      const entry = registry.get(normalized);
      if (!entry) {
        throw new Error('fake: dominio non registrato: ' + normalized);
      }
      return { state: entry.state };
    },
    async removeDomain(normalized: string) {
      calls.removeDomain.push(normalized);
      registry.delete(normalized);
    },
  };
}

import 'server-only';

// DOM-211 (macrotask domain-vercel, p5-custom-domains-fase2) — L'ADATTATORE Vercel della porta
// DomainProvider. E' l'UNICO punto che conosce l'API Vercel Domains/Projects (DOM-D2): il resto del
// sistema dipende dalla porta (src/domain/domains/domain-port.ts), mai da Vercel. Modello del confine
// come src/data/payment/stripe.ts e src/data/anthropic.ts — `import 'server-only'` (i segreti stanno di
// qua, fuori dal bundle client) + client HTTP costruito LAZY dietro config INIETTABILE, cosi' importare
// il modulo senza chiavi non lancia e i test iniettano un `fetchImpl` senza rete.
//
// SICUREZZA:
//  - A07/A02:2025 — VERCEL_TOKEN/projectId sono config di DEPLOY (env Vercel), MAI nel sorgente.
//  - A01:2025 SSRF — si chiama SOLO l'endpoint FISSO api.vercel.com; l'hostname dell'utente entra solo
//    nel PATH/body come parametro (encodeURIComponent), mai come URL base: nessun probe verso il dominio
//    del cliente.
//  - Robustezza (gemello BIL-D5) — errori del provider TIPIZZATI (VercelDomainError) e loggati, mai un
//    502 opaco; il token non finisce nei log/errori.

import type {
  DomainProvider,
  VerificationRequirement,
  VerificationState,
} from '@/domain/domains/domain-port';

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Config dell'adattatore, iniettabile. `fetchImpl` e' il seam di mock: i test passano un doppio che
 * simula le risposte Vercel senza rete (default: `fetch` globale nel wiring reale). `apexTarget`/
 * `cnameTarget` sono i target di piattaforma (record A/CNAME) che l'orchestrazione a valle
 * (domain-connect, DOM-302) compone con `dnsInstructionsFor` (DOM-131); l'adattatore non li invia a Vercel.
 */
export type VercelDomainConfig = {
  readonly token: string;
  readonly projectId: string;
  readonly teamId?: string;
  readonly apexTarget: string;
  readonly cnameTarget: string;
  /** Seam iniettabile per i test (nessuna rete). Default: `fetch` globale. */
  readonly fetchImpl?: typeof fetch;
};

/** Errore TIPIZZATO del provider (mai un throw opaco). Porta il `code` normalizzato e lo status HTTP. */
export class VercelDomainError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'VercelDomainError';
    this.code = code;
    this.status = status;
  }
}

// -- Estrazione difensiva dal payload (robusta alle differenze di API version) --------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Il `code` d'errore Vercel dal payload (`{ error: { code } }`), o un fallback neutro. */
function errorCode(payload: unknown): string {
  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.code === 'string') {
    return payload.error.code;
  }
  return 'vercel_error';
}

/** Id opaco del dominio presso il provider (uid/id/name), fallback all'host normalizzato. */
function domainId(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    for (const key of ['uid', 'id', 'name'] as const) {
      if (typeof payload[key] === 'string') return payload[key] as string;
    }
  }
  return fallback;
}

/** Mappa il `verification[]` nativo di Vercel nella forma neutra della porta. */
function mapVerification(payload: unknown): VerificationRequirement[] {
  const list = isRecord(payload) && Array.isArray(payload.verification) ? payload.verification : [];
  const out: VerificationRequirement[] = [];
  for (const item of list) {
    if (!isRecord(item)) continue;
    if (
      typeof item.type === 'string' &&
      typeof item.domain === 'string' &&
      typeof item.value === 'string'
    ) {
      out.push({
        type: item.type,
        domain: item.domain,
        value: item.value,
        reason: typeof item.reason === 'string' ? item.reason : undefined,
      });
    }
  }
  return out;
}

/** Stato neutro dal payload di getVerificationStatus (fail-safe: mai 'verified' senza prova). */
function mapState(payload: unknown): VerificationState {
  if (isRecord(payload) && payload.verified === true) return 'verified';
  // Non verificato: challenge ancora in sospeso => 'pending'; nessun challenge => DNS errato => 'misconfigured'.
  return mapVerification(payload).length > 0 ? 'pending' : 'misconfigured';
}

/**
 * Costruisce un DomainProvider su una config Vercel iniettata. Ogni metodo chiama l'API Vercel (rete)
 * via `fetchImpl`; gli errori sono tipizzati (VercelDomainError) e loggati SENZA il token.
 */
export function createVercelDomainProvider(config: VercelDomainConfig): DomainProvider {
  const doFetch = config.fetchImpl ?? fetch;
  const query = config.teamId ? `?teamId=${encodeURIComponent(config.teamId)}` : '';

  // L'host entra SOLO qui, encodato nel path: mai come URL base (anti-SSRF, A01:2025).
  const url = (path: string) => `${VERCEL_API_BASE}${path}${query}`;

  async function call(method: string, path: string, body?: unknown): Promise<Response> {
    return doFetch(url(path), {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /** Logga un errore del provider senza MAI il token, poi solleva un VercelDomainError. */
  function fail(op: string, normalized: string, status: number, payload: unknown): never {
    const code = errorCode(payload);
    console.error(`[vercel] ${op} ${normalized} fallito: HTTP ${status} (${code})`);
    throw new VercelDomainError(code, status, `Vercel ${op} fallito per ${normalized} (${code})`);
  }

  return {
    async addDomain(normalized: string) {
      const res = await call('POST', `/v10/projects/${config.projectId}/domains`, { name: normalized });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) fail('addDomain', normalized, res.status, payload);
      return { providerDomainId: domainId(payload, normalized), verification: mapVerification(payload) };
    },

    async getVerificationStatus(normalized: string) {
      const res = await call(
        'GET',
        `/v9/projects/${config.projectId}/domains/${encodeURIComponent(normalized)}`,
      );
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) fail('getVerificationStatus', normalized, res.status, payload);
      return { state: mapState(payload) };
    },

    async removeDomain(normalized: string) {
      const res = await call(
        'DELETE',
        `/v9/projects/${config.projectId}/domains/${encodeURIComponent(normalized)}`,
      );
      // 404 = gia' assente: rimozione idempotente, non un errore (DOM-D8, gemello del downgrade).
      if (!res.ok && res.status !== 404) {
        const payload: unknown = await res.json().catch(() => null);
        fail('removeDomain', normalized, res.status, payload);
      }
    },
  };
}

// -- Wiring reale, LAZY (env di deploy; mai importato nei test unit che iniettano il fake) --

let cached: DomainProvider | null = null;

function configFromEnv(): VercelDomainConfig {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  const apexTarget = process.env.VERCEL_APEX_TARGET;
  const cnameTarget = process.env.VERCEL_CNAME_TARGET;
  if (!token || !projectId || !apexTarget || !cnameTarget) {
    throw new Error(
      "Variabili d'ambiente Vercel mancanti: VERCEL_TOKEN / VERCEL_PROJECT_ID / VERCEL_APEX_TARGET / VERCEL_CNAME_TARGET",
    );
  }
  return { token, projectId, teamId, apexTarget, cnameTarget };
}

/** Adattatore Vercel reale, costruito una sola volta alla prima chiamata (env-driven, DOM-D9). */
export function getVercelDomainProvider(): DomainProvider {
  cached ??= createVercelDomainProvider(configFromEnv());
  return cached;
}

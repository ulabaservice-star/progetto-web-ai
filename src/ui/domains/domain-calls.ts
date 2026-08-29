'use client';

// DOM-501 (macrotask domain-ui, p5-custom-domains-fase2) — il CONFINE CLIENT verso i tre endpoint
// dei domini (connect/verify/disconnect). Gemello di src/ui/billing/billing-calls.ts: qui vive
// l'UNICO punto che conosce le rotte, fa il `fetch` same-origin e traduce la risposta in un tipo
// stretto; un non-2xx / rete caduta / forma inattesa => esito nullo (la UI non inventa uno stato).
//
// Perche' un fetch e non una Server Action: gli endpoint sono route handler dietro le guardie
// condivise (request-guard: same-origin + tetto byte; identita'; proprieta'/gate letti dal server).
// Un fetch same-origin POST porta con se' Sec-Fetch-Site: same-origin, che guardMutatingRequest
// esige. La UI passa SOLO { siteId?, hostname }: l'accountId lo deriva il server dall'identita' e dal
// sito posseduto (mai dal client), quindi "cross-account" resta impossibile (DOM-D5).

import type { SiteDomainStatus } from '@/data/site-domains';

/** Un record DNS che l'utente deve impostare (forma neutra, gia' derivata dal server). */
export type DnsRecordView = { readonly type: string; readonly name: string; readonly value: string };

/** La vista di un collegamento come la consuma la sezione UI (sottoinsieme di SiteDomainSummary). */
export type ConnectedDomainView = {
  readonly hostname: string;
  readonly status: SiteDomainStatus;
  readonly records: readonly DnsRecordView[];
};

async function postJson(endpoint: string, body: unknown): Promise<unknown | null> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Estrae i soli record DNS ben formati (type/name/value stringa) da un valore non fidato. */
function toDnsRecords(value: unknown): DnsRecordView[] {
  if (!Array.isArray(value)) return [];
  const out: DnsRecordView[] = [];
  for (const item of value) {
    if (
      isRecord(item) &&
      typeof item.type === 'string' &&
      typeof item.name === 'string' &&
      typeof item.value === 'string'
    ) {
      out.push({ type: item.type, name: item.name, value: item.value });
    }
  }
  return out;
}

const STATUSES: readonly SiteDomainStatus[] = [
  'pending',
  'verifying',
  'active',
  'suspended',
  'error',
];

/** Normalizza uno `status` non fidato all'unione nota, o null se fuori vocabolario. */
function toStatus(value: unknown): SiteDomainStatus | null {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
    ? (value as SiteDomainStatus)
    : null;
}

/**
 * Collega un hostname a un sito (POST /api/domains/connect). Ritorna i collegamenti creati (apex +
 * eventuale companion www), gia' con le istruzioni DNS composte dal server; null se la richiesta
 * fallisce o la forma e' inattesa (nessuno stato inventato).
 */
export async function requestConnect(
  siteId: string,
  hostname: string,
): Promise<ConnectedDomainView[] | null> {
  const data = await postJson('/api/domains/connect', { siteId, hostname });
  if (!isRecord(data) || !Array.isArray(data.domains)) return null;
  const out: ConnectedDomainView[] = [];
  for (const entry of data.domains) {
    if (!isRecord(entry) || typeof entry.hostname !== 'string') continue;
    out.push({
      hostname: entry.hostname,
      status: toStatus(entry.status) ?? 'pending',
      records: toDnsRecords(entry.records),
    });
  }
  return out;
}

/**
 * Verifica lo stato DNS di un collegamento (POST /api/domains/verify). Ritorna lo stato risultante
 * dall'esito del server (active/verifying/error), o null se la richiesta fallisce.
 */
export async function requestVerify(hostname: string): Promise<SiteDomainStatus | null> {
  const data = await postJson('/api/domains/verify', { hostname });
  if (!isRecord(data)) return null;
  return toStatus(data.status);
}

/**
 * Scollega un collegamento (POST /api/domains/disconnect). Ritorna true SOLO su { ok: true }
 * esplicito; qualunque altra forma o errore => false (la UI non rimuove uno stato non confermato).
 */
export async function requestDisconnect(hostname: string): Promise<boolean> {
  const data = await postJson('/api/domains/disconnect', { hostname });
  return isRecord(data) && data.ok === true;
}

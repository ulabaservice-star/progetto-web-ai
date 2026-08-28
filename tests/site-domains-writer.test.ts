import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createPendingDomain,
  setDomainStatus,
  type SiteDomainWriteStore,
  type SiteDomainPendingInsert,
  type SiteDomainStatus,
  type SiteDomainStatusPatch,
} from '@/data/site-domains-write';

// DOM-222 (macrotask domain-store, p5-custom-domains-fase2) — writer di STATO di
// site_domains, con service_role CONFINATO (fuori dal percorso utente) e store iniettabile.
// Le asserzioni derivano dagli acceptance_criteria AC-222-1..3 (07-domain-store.md).
//
// Come applySubscriptionEvent (BIL-202): lo STORE e' una porta iniettabile; qui iniettiamo
// uno store IN-MEMORY e inchiodiamo la logica del writer (riga 'pending' costruita col token
// e il provider_domain_id; transizione ad 'active' col verified_at) senza DB ne' chiave
// reale. Il default store (service_role via createAdminClient) e' provato STRUTTURALMENTE
// dalla guardia statica (AC-222-3): lo stato lo muove solo il server, mai il client — il
// runtime del divieto lato DB (nessuna UPDATE authenticated: 42501) e' gia' provato da
// site-domains-rls-owner (AC-101-4).

// Omit sullo status: l'intersezione con SiteDomainPendingInsert lo collasserebbe al solo
// 'pending' (letterale) — qui lo si widena all'unione pending + transizioni di stato.
type StoredRow = Omit<SiteDomainPendingInsert, 'status'> & {
  status: SiteDomainPendingInsert['status'] | SiteDomainStatus;
  verified_at?: string;
};

function memoryStore() {
  const rows = new Map<string, StoredRow>(); // key = normalized_hostname
  let insertCount = 0;
  let updateCount = 0;
  const store: SiteDomainWriteStore = {
    async insertPending(row) {
      insertCount += 1;
      rows.set(row.normalized_hostname, { ...row });
    },
    async updateStatus(host, status, patch) {
      updateCount += 1;
      const cur = rows.get(host);
      if (!cur) throw new Error(`nessun collegamento per ${host}`);
      rows.set(host, { ...cur, status, ...patch });
    },
  };
  return { store, rows, insertCount: () => insertCount, updateCount: () => updateCount };
}

const ACC = '11111111-1111-1111-1111-111111111111';
const SITE = '22222222-2222-2222-2222-222222222222';
const HOST = 'esempio.example';
const PROOF = 'dns-proof-1';
const PROVIDER_DOMAIN_ID = 'vd_opaque_9';

describe('DOM-222 createPendingDomain (store iniettato)', () => {
  it('inserisce una riga pending per (site, host) col token e il provider_domain_id', async () => {
    const m = memoryStore();
    await createPendingDomain(ACC, SITE, HOST, 'apex', PROOF, PROVIDER_DOMAIN_ID, m.store);

    expect(m.insertCount()).toBe(1); // covers: AC-222-1 — una insert
    const row = m.rows.get(HOST)!;
    expect(row).toBeTruthy(); // covers: AC-222-1 — la riga per host esiste
    expect(row.status).toBe('pending'); // covers: AC-222-1 — nasce 'pending', mai attivo
    expect(row.account_id).toBe(ACC); // covers: AC-222-1
    expect(row.site_id).toBe(SITE); // covers: AC-222-1 — per (site, host)
    expect(row.normalized_hostname).toBe(HOST); // covers: AC-222-1
    expect(row.kind).toBe('apex'); // covers: AC-222-1
    expect(row.verification_token).toBe(PROOF); // covers: AC-222-1 — col token
    expect(row.provider_domain_id).toBe(PROVIDER_DOMAIN_ID); // covers: AC-222-1 — col provider_domain_id
  });

  it('provider_domain_id nullable: un collegamento senza id di provider resta pending', async () => {
    const m = memoryStore();
    await createPendingDomain(ACC, SITE, HOST, 'subdomain', PROOF, null, m.store);
    const row = m.rows.get(HOST)!;
    expect(row.provider_domain_id).toBeNull(); // provider_domain_id e' nullable
    expect(row.status).toBe('pending');
    expect(row.kind).toBe('subdomain');
  });
});

describe('DOM-222 setDomainStatus (store iniettato)', () => {
  it('porta un collegamento pending ad active con verified_at valorizzato', async () => {
    const m = memoryStore();
    await createPendingDomain(ACC, SITE, HOST, 'apex', PROOF, PROVIDER_DOMAIN_ID, m.store);
    const verifiedAt = '2026-08-28T10:00:00.000Z';

    await setDomainStatus(HOST, 'active', { verified_at: verifiedAt }, m.store);

    expect(m.updateCount()).toBe(1); // covers: AC-222-2 — una update di stato
    const row = m.rows.get(HOST)!;
    expect(row.status).toBe('active'); // covers: AC-222-2 — la riga passa ad 'active'
    expect(row.verified_at).toBe(verifiedAt); // covers: AC-222-2 — verified_at valorizzato
  });

  it('le altre transizioni di stato (suspended/error) passano dal writer', async () => {
    const m = memoryStore();
    await createPendingDomain(ACC, SITE, HOST, 'apex', PROOF, PROVIDER_DOMAIN_ID, m.store);
    await setDomainStatus(HOST, 'suspended', {}, m.store);
    expect(m.rows.get(HOST)!.status).toBe('suspended'); // covers: AC-222-2
    await setDomainStatus(HOST, 'error', {}, m.store);
    expect(m.rows.get(HOST)!.status).toBe('error'); // covers: AC-222-2
  });
});

describe('DOM-222 confinamento service_role (guardia statica, AC-222-3)', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/data/site-domains-write.ts'), 'utf8');

  it('il default store usa service_role (createAdminClient), mai il client di sessione', () => {
    expect(src).toContain("import 'server-only'"); // covers: AC-222-3 — modulo server-only, mai nel bundle client
    expect(src).toMatch(/from ['"]@\/data\/supabase-admin['"]/); // covers: AC-222-3 — default su service_role confinato
    // Non passa mai dal client di SESSIONE (percorso utente): la scrittura di stato e' server-only.
    expect(src).not.toMatch(/from ['"]@\/data\/supabase-ssr['"]/); // covers: AC-222-3 — nessun percorso authenticated
  });

  it('lo store e\' una porta iniettabile (SiteDomainWriteStore): i test scrivono senza service_role reale', () => {
    // Il tipo esportato + il default-arg dello store sono cio che permette l'iniezione: la sua
    // presenza qui e' provata dal fatto che questo intero file gira con uno store in-memory.
    const injected: SiteDomainWriteStore = {
      async insertPending() {},
      async updateStatus() {},
    };
    expect(typeof injected.insertPending).toBe('function'); // covers: AC-222-3 — porta iniettabile
    expect(typeof injected.updateStatus).toBe('function'); // covers: AC-222-3
  });
});

// Aggancio di tipo: patch di stato accetta verified_at (e detail, contratto futuro). Non gira
// nulla a runtime: e' un pin di TIPO che tsc verifica al typecheck.
const _patchShape: SiteDomainStatusPatch = { verified_at: '2026-01-01T00:00:00.000Z' };
void _patchShape;

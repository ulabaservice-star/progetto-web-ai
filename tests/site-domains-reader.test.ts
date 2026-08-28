import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type SupabaseClient } from '@supabase/supabase-js';
import {
  adminClient,
  createTestUser,
  signInAs,
  deleteTestUser,
} from './helpers/supabase-test';

// DOM-221 (macrotask domain-store, p5-custom-domains-fase2) — reader owner-side di
// site_domains RUNTIME contro il Supabase locale. Le asserzioni derivano dagli
// acceptance_criteria AC-221-1..3 (07-domain-store.md).
//
// Come billing-get-account-entitlement (BIL-103): mockiamo SOLO la costruzione del client
// SSR (createServerSupabaseClient, dipendente dai cookie di next/headers non disponibili in
// node) con un client ad AUTH REALE (signInAs -> JWT, ruolo authenticated, RLS ATTIVA). Il
// reader (listSiteDomains / getDomainByHost sotto RLS) gira per intero contro il DB locale.
//
// AC-221-3 (usa il client di SESSIONE, mai service_role) e provato in modo COMPORTAMENTALE:
// col client di un TENANT DIVERSO (B) le letture dei collegamenti di A tornano vuote/null
// (la RLS di B non li vede). Un reader su service_role li vedrebbe: il vuoto e la prova che
// rispetta la RLS del client passato. Piu una guardia STATICA: il sorgente non importa il
// client admin.

const SB = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.DATABASE_URL
);

const { clientHolder } = vi.hoisted(() => ({
  clientHolder: { current: null as SupabaseClient | null },
}));

vi.mock('@/data/supabase-ssr', () => ({
  createServerSupabaseClient: async () => clientHolder.current,
}));

import { listSiteDomains, getDomainByHost } from '@/data/site-domains';

describe.skipIf(!SB)('DOM-221 reader owner-side di site_domains (runtime, Supabase locale, RLS attiva)', () => {
  const password = 'Password123!';
  const emailA = `dom221a_${randomUUID()}@example.test`;
  const emailB = `dom221b_${randomUUID()}@example.test`;

  let userAId = '';
  let userBId = '';
  let accountA = '';
  let accountB = '';
  let siteA = '';
  let siteB = '';
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;

  // apex + il suo companion www: due collegamenti dello STESSO sito A (AC-221-1).
  const apexA = `a-${randomUUID().slice(0, 8)}.example`;
  const wwwA = `www.${apexA}`;
  const hostB = `b-${randomUUID().slice(0, 8)}.example`;

  async function accountIdOf(ownerId: string): Promise<string> {
    const { data } = await adminClient()
      .from('accounts')
      .select('id')
      .eq('owner_id', ownerId)
      .single();
    return data!.id as string;
  }

  async function seedSite(accountId: string, name: string): Promise<string> {
    const { data, error } = await adminClient()
      .from('sites')
      .insert({ account_id: accountId, name, slug: `seed-${randomUUID()}` })
      .select('id')
      .single();
    if (error) throw error;
    return data!.id as string;
  }

  beforeAll(async () => {
    const a = await createTestUser(emailA, password);
    const b = await createTestUser(emailB, password);
    userAId = a.id;
    userBId = b.id;
    accountA = await accountIdOf(userAId);
    accountB = await accountIdOf(userBId);
    siteA = await seedSite(accountA, 'Bar A');
    siteB = await seedSite(accountB, 'Bar B');

    // Semina via service_role (bypassa la RLS): due collegamenti per il sito A (apex 'active'
    // + companion www 'pending') e uno per il sito B. Stati diversi apposta: l'owner li vede
    // tutti (la RLS di gestione non filtra per status; quello e' della lettura anon di routing).
    const { error: seedErr } = await adminClient()
      .from('site_domains')
      .insert([
        {
          account_id: accountA,
          site_id: siteA,
          hostname: apexA,
          normalized_hostname: apexA,
          kind: 'apex',
          status: 'active',
          verification_token: `tok_apexA_${randomUUID().slice(0, 8)}`,
          provider: 'vercel',
          provider_domain_id: `vd_apexA_${randomUUID().slice(0, 8)}`,
          public_slug: 'bar-a',
        },
        {
          account_id: accountA,
          site_id: siteA,
          hostname: wwwA,
          normalized_hostname: wwwA,
          kind: 'subdomain',
          status: 'pending',
          verification_token: `tok_wwwA_${randomUUID().slice(0, 8)}`,
          provider: 'vercel',
        },
        {
          account_id: accountB,
          site_id: siteB,
          hostname: hostB,
          normalized_hostname: hostB,
          kind: 'apex',
          status: 'active',
          verification_token: `tok_B_${randomUUID().slice(0, 8)}`,
          provider: 'vercel',
        },
      ]);
    expect(seedErr).toBeNull();

    clientA = await signInAs(emailA, password);
    clientB = await signInAs(emailB, password);

    expect(accountA).not.toBe(accountB);
  }, 60_000);

  afterAll(async () => {
    // cascade: auth.users -> accounts -> sites -> site_domains.
    if (userAId) await deleteTestUser(userAId);
    if (userBId) await deleteTestUser(userBId);
  });

  it('il proprietario del sito S con due collegamenti riceve i due (client di sessione, RLS)', async () => {
    clientHolder.current = clientA;
    const rows = await listSiteDomains(siteA);
    const hosts = rows.map((r) => r.normalized_hostname).sort();
    expect(hosts).toEqual([apexA, wwwA].sort()); // covers: AC-221-1 — i due collegamenti del sito
    const apexRow = rows.find((r) => r.normalized_hostname === apexA)!;
    expect(apexRow.kind).toBe('apex'); // covers: AC-221-1
    expect(apexRow.status).toBe('active'); // covers: AC-221-1 — l'owner vede lo stato reale
    expect(apexRow.provider_domain_id).toBeTruthy(); // covers: AC-221-1
    const wwwRow = rows.find((r) => r.normalized_hostname === wwwA)!;
    expect(wwwRow.kind).toBe('subdomain'); // covers: AC-221-1
    expect(wwwRow.status).toBe('pending'); // covers: AC-221-1 — l'owner vede anche i non-attivi
  });

  it('getDomainByHost normalizza l\'host prima del lookup esatto (case/URL) e trova la riga del proprietario', async () => {
    clientHolder.current = clientA;
    // Forma NON canonica: schema http:// + maiuscole. Il reader deve normalizzare prima del
    // match esatto su normalized_hostname, altrimenti non troverebbe la riga.
    const row = await getDomainByHost(`HTTP://${apexA.toUpperCase()}`);
    expect(row).not.toBeNull(); // covers: AC-221-1 — lookup dopo normalizzazione
    expect(row!.normalized_hostname).toBe(apexA); // covers: AC-221-1
    expect(row!.site_id).toBe(siteA); // covers: AC-221-1
  });

  it('un host sintatticamente invalido => null (nessun match possibile, nessun lancio)', async () => {
    clientHolder.current = clientA;
    const row = await getDomainByHost('non un host valido');
    expect(row).toBeNull(); // il reader degrada a null, non lancia
  });

  it('un utente del tenant B che chiede un host dell\'account A riceve null (RLS isola per tenant)', async () => {
    clientHolder.current = clientB;
    const row = await getDomainByHost(apexA);
    expect(row).toBeNull(); // covers: AC-221-2 — la RLS di B non vede il collegamento di A

    // ORACOLO INDIPENDENTE (service_role, RLS bypassata): il collegamento di A ESISTE -> il
    // null sopra e soppressione RLS del client di B, non assenza di dati.
    const { data: real } = await adminClient()
      .from('site_domains')
      .select('account_id')
      .eq('normalized_hostname', apexA)
      .single();
    expect(real!.account_id).toBe(accountA); // covers: AC-221-2 — la riga di A c'e davvero
  });

  it('usa il client di SESSIONE (RLS), mai service_role: col client di B listSiteDomains(siteA) e vuoto (anti-placebo)', async () => {
    clientHolder.current = clientB;
    const rows = await listSiteDomains(siteA);
    expect(rows).toHaveLength(0); // covers: AC-221-3 — nessun bypass RLS

    // ORACOLO INDIPENDENTE: i collegamenti del sito A ESISTONO (2) -> il vuoto e RLS.
    const { data: real } = await adminClient()
      .from('site_domains')
      .select('id')
      .eq('site_id', siteA);
    expect((real ?? []).length).toBe(2); // covers: AC-221-3 — le righe di A ci sono
  });

  it('il sorgente del reader non importa il client admin/service_role (guardia statica)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/data/site-domains.ts'), 'utf8');
    // Assenza STRUTTURALE del bypass (import del client admin / uso della chiave), non la mera
    // menzione della parola nei commenti (che spiegano cosa il reader NON fa).
    expect(src).not.toMatch(/from ['"]@\/data\/supabase-admin['"]/); // covers: AC-221-3 — non importa il client admin
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/); // covers: AC-221-3 — non usa la chiave service_role
    expect(src).toContain('createServerSupabaseClient'); // covers: AC-221-3 — client di sessione
  });
});

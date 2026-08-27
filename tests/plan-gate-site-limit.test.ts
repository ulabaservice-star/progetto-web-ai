import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  adminClient,
  createTestUser,
  signInAs,
  deleteTestUser,
} from './helpers/supabase-test';

// BIL-301 (macrotask plan-gates, p5-billing-fase1) — GATE creazione sito sul limite del
// piano (free=1, pro=5), RUNTIME contro il Supabase locale con RLS ATTIVA. Le asserzioni
// derivano dagli acceptance_criteria AC-301-1/2/3 (03-plan-gates.md), taggate `// covers:`.
//
// Come sites-actions (T-101): mockiamo SOLO createServerSupabaseClient (dipende dai cookie
// di next/headers, non disponibili in node) con un client ad AUTH REALE (signInAs -> JWT,
// ruolo authenticated, RLS attiva). createSite gira per intero: risolve l'account
// dall'identita, legge l'entitlement (subscriptions sotto RLS), conta i siti e decide.
//
// L'entitlement e' pilotato dal DATO seedato via service_role (setup, non browser): un
// account SENZA subscription => free (max_sites 1); con subscription pro attiva => pro
// (max_sites 5). Il conteggio "reale" e' verificato con un ORACOLO INDIPENDENTE su
// service_role (RLS bypassata): prova che alla soglia NESSUNA riga e' scritta, non l'esito.

const SB = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { clientHolder } = vi.hoisted(() => ({
  clientHolder: { current: null as SupabaseClient | null },
}));

vi.mock('@/data/supabase-ssr', () => ({
  createServerSupabaseClient: async () => clientHolder.current,
}));

import { createSite } from '@/data/sites';

async function accountIdOf(ownerId: string): Promise<string> {
  const { data } = await adminClient()
    .from('accounts')
    .select('id')
    .eq('owner_id', ownerId)
    .single();
  return data!.id as string;
}

async function seedSites(accountId: string, n: number): Promise<void> {
  if (n === 0) return;
  const rows = Array.from({ length: n }, (_, i) => ({
    account_id: accountId,
    name: `Seed ${i}`,
    slug: `seed-${randomUUID()}`,
  }));
  const { error } = await adminClient().from('sites').insert(rows);
  if (error) throw error;
}

async function seedProSubscription(accountId: string): Promise<void> {
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await adminClient().from('subscriptions').insert({
    account_id: accountId,
    plan: 'pro',
    status: 'active',
    provider: 'stripe',
    provider_subscription_id: `sub_${randomUUID().slice(0, 8)}`,
    provider_customer_id: `cus_${randomUUID().slice(0, 8)}`,
    current_period_end: periodEnd,
  });
  if (error) throw error;
}

async function countSites(accountId: string): Promise<number> {
  const { count, error } = await adminClient()
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId);
  if (error) throw error;
  return count ?? 0;
}

describe.skipIf(!SB)('BIL-301 gate creazione sito sul limite di piano (runtime, RLS attiva)', () => {
  const password = 'Password123!';
  const emailFree = `bil301free_${randomUUID()}@example.test`;
  const emailProLow = `bil301prolow_${randomUUID()}@example.test`;
  const emailProFull = `bil301profull_${randomUUID()}@example.test`;

  let freeUserId = '';
  let proLowUserId = '';
  let proFullUserId = '';
  let freeAccount = '';
  let proLowAccount = '';
  let proFullAccount = '';
  let clientFree: SupabaseClient;
  let clientProLow: SupabaseClient;
  let clientProFull: SupabaseClient;

  beforeAll(async () => {
    const uFree = await createTestUser(emailFree, password);
    const uProLow = await createTestUser(emailProLow, password);
    const uProFull = await createTestUser(emailProFull, password);
    freeUserId = uFree.id;
    proLowUserId = uProLow.id;
    proFullUserId = uProFull.id;

    freeAccount = await accountIdOf(freeUserId);
    proLowAccount = await accountIdOf(proLowUserId);
    proFullAccount = await accountIdOf(proFullUserId);

    // Free: 1 sito gia' esistente, nessuna subscription (=> free, max_sites 1, ALLA soglia).
    await seedSites(freeAccount, 1);
    // Pro (sotto soglia): 1 sito + subscription pro attiva (=> pro, max_sites 5).
    await seedProSubscription(proLowAccount);
    await seedSites(proLowAccount, 1);
    // Pro (alla soglia): 5 siti + subscription pro attiva.
    await seedProSubscription(proFullAccount);
    await seedSites(proFullAccount, 5);

    clientFree = await signInAs(emailFree, password);
    clientProLow = await signInAs(emailProLow, password);
    clientProFull = await signInAs(emailProFull, password);
  }, 60_000);

  afterAll(async () => {
    if (freeUserId) await deleteTestUser(freeUserId);
    if (proLowUserId) await deleteTestUser(proLowUserId);
    if (proFullUserId) await deleteTestUser(proFullUserId);
  });

  // covers: AC-301-1
  it('account Free con 1 sito: il secondo e rifiutato (403 limite) e nessuna riga e scritta', async () => {
    clientHolder.current = clientFree;
    expect(await countSites(freeAccount)).toBe(1); // precondizione: Free alla soglia

    const res = await createSite('Secondo Sito Free');
    expect(res.ok).toBe(false); // covers: AC-301-1
    if (res.ok) throw new Error('createSite avrebbe dovuto rifiutare al limite free');
    expect(res.status).toBe(403); // covers: AC-301-1 — esito esplicito di limite piano

    expect(await countSites(freeAccount)).toBe(1); // covers: AC-301-1 — nessuna riga creata
  });

  // covers: AC-301-2
  it('account Pro con 1 sito: la creazione procede (sotto il limite di 5)', async () => {
    clientHolder.current = clientProLow;
    const res = await createSite('Secondo Sito Pro');
    expect(res.ok).toBe(true); // covers: AC-301-2

    expect(await countSites(proLowAccount)).toBe(2); // covers: AC-301-2 — sito creato
  });

  // covers: AC-301-3
  it('account Pro con 5 siti: il sesto e rifiutato (403 limite) e nessuna riga e scritta', async () => {
    clientHolder.current = clientProFull;
    expect(await countSites(proFullAccount)).toBe(5); // precondizione: Pro alla soglia

    const res = await createSite('Sesto Sito Pro');
    expect(res.ok).toBe(false); // covers: AC-301-3
    if (res.ok) throw new Error('createSite avrebbe dovuto rifiutare al limite pro');
    expect(res.status).toBe(403); // covers: AC-301-3

    expect(await countSites(proFullAccount)).toBe(5); // covers: AC-301-3 — nessuna riga creata
  });
});

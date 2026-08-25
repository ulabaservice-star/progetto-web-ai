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

// BIL-103 (macrotask entitlement-core, p5-billing-fase1) — reader server-side
// getAccountEntitlement(accountId) RUNTIME contro il Supabase locale. Le asserzioni
// derivano dagli acceptance_criteria AC-103-1..3 (01-entitlement-core.md).
//
// Come briefs-actions (T-123): mockiamo SOLO la costruzione del client SSR
// (createServerSupabaseClient, dipendente dai cookie di next/headers non disponibili in
// node) con un client ad AUTH REALE (signInAs -> JWT, ruolo authenticated, RLS ATTIVA).
// Il reader (lettura di subscriptions sotto RLS + resolveEntitlement col now al confine)
// gira per intero contro il DB locale.
//
// AC-103-3 (usa il client di SESSIONE, mai service_role) e provato in modo
// COMPORTAMENTALE: iniettando il client di un TENANT DIVERSO (B) e chiedendo l'entitlement
// dell'account A, la RLS del client di B non vede la subscription di A -> free. Un reader
// che usasse la service_role la vedrebbe (pro): il free e la prova che rispetta la RLS del
// client passato. Piu una guardia STATICA: il sorgente non importa il client admin.

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

import { getAccountEntitlement } from '@/data/subscriptions';

describe.skipIf(!SB)('BIL-103 getAccountEntitlement (runtime, Supabase locale, RLS attiva)', () => {
  const password = 'Password123!';
  const emailA = `bil103a_${randomUUID()}@example.test`;
  const emailB = `bil103b_${randomUUID()}@example.test`;

  let userAId = '';
  let userBId = '';
  let accountA = '';
  let accountB = '';
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  beforeAll(async () => {
    const a = await createTestUser(emailA, password);
    const b = await createTestUser(emailB, password);
    userAId = a.id;
    userBId = b.id;

    const admin = adminClient();
    const { data: accs } = await admin
      .from('accounts')
      .select('id, owner_id')
      .in('owner_id', [userAId, userBId]);
    accountA = (accs ?? []).find((r) => r.owner_id === userAId)!.id as string;
    accountB = (accs ?? []).find((r) => r.owner_id === userBId)!.id as string;

    // Solo A ha una subscription pro attiva (piantata via service_role). B non ne ha:
    // e l'account "senza riga" di AC-103-2.
    const { error: seedErr } = await admin.from('subscriptions').insert({
      account_id: accountA,
      plan: 'pro',
      status: 'active',
      provider: 'stripe',
      provider_subscription_id: `sub_${randomUUID().slice(0, 8)}`,
      provider_customer_id: `cus_${randomUUID().slice(0, 8)}`,
      current_period_end: periodEnd,
    });
    expect(seedErr).toBeNull();

    clientA = await signInAs(emailA, password);
    clientB = await signInAs(emailB, password);

    expect(accountA).not.toBe(accountB);
  }, 60_000);

  afterAll(async () => {
    if (userAId) await deleteTestUser(userAId);
    if (userBId) await deleteTestUser(userBId);
  });

  // covers: AC-103-1
  it('account con subscription pro attiva (client di sessione del proprietario) => plan pro con i limiti pro', async () => {
    clientHolder.current = clientA;
    const ent = await getAccountEntitlement(accountA);
    expect(ent.plan).toBe('pro'); // covers: AC-103-1
    expect(ent.limits.max_sites).toBe(5); // covers: AC-103-1 — limiti pro
    expect(ent.limits.no_badge).toBe(true); // covers: AC-103-1
  });

  // covers: AC-103-2
  it('account senza alcuna subscription => plan free (default, nessun errore lanciato)', async () => {
    clientHolder.current = clientB;
    const ent = await getAccountEntitlement(accountB);
    expect(ent.plan).toBe('free'); // covers: AC-103-2 — assenza di riga => free
    expect(ent.limits.max_sites).toBe(1); // covers: AC-103-2 — limiti free
  });

  // covers: AC-103-3
  it('usa il client di SESSIONE (RLS), mai la service_role: col client di un tenant diverso l\'entitlement di A e free (la sub di A esiste comunque — anti-placebo)', async () => {
    // Client di B (tenant diverso) che chiede l'entitlement di A: la RLS di B non vede la
    // subscription di A -> il reader legge "nessuna riga" -> free. Un reader su service_role
    // vedrebbe la riga (pro): il free prova che rispetta la RLS del client di sessione.
    clientHolder.current = clientB;
    const ent = await getAccountEntitlement(accountA);
    expect(ent.plan).toBe('free'); // covers: AC-103-3 — nessun bypass RLS

    // ORACOLO INDIPENDENTE (service_role, RLS bypassata): la sub di A ESISTE ed e pro ->
    // il free sopra e soppressione RLS del client di B, non assenza di dati.
    const { data: real } = await adminClient()
      .from('subscriptions')
      .select('plan')
      .eq('account_id', accountA)
      .single();
    expect(real!.plan).toBe('pro'); // covers: AC-103-3 — la riga di A c'e davvero
  });

  // DoD "assenza di riga o guasto non-fatale => free": un errore di lettura degrada a
  // free (fail-safe, mai un piano superiore per errore) e NON viene rilanciato.
  it('un guasto di lettura del DB degrada a free senza lanciare (fail-safe)', async () => {
    const fakeErrorClient = {
      from() {
        return this;
      },
      select() {
        return this;
      },
      eq() {
        return this;
      },
      async maybeSingle() {
        return { data: null, error: { message: 'boom', code: 'XX000' } };
      },
    } as unknown as SupabaseClient;
    clientHolder.current = fakeErrorClient;
    const ent = await getAccountEntitlement(accountA);
    expect(ent.plan).toBe('free'); // fail-safe: guasto => free, non pro
    expect(ent.limits.max_sites).toBe(1);
  });

  // covers: AC-103-3 (guardia statica)
  it('il sorgente del reader non importa il client admin/service_role', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/data/subscriptions.ts'), 'utf8');
    // Assenza STRUTTURALE del bypass (import del client admin / uso della chiave), non la
    // mera menzione della parola nei commenti (che spiegano cosa il reader NON fa).
    expect(src).not.toMatch(/from ['"]@\/data\/supabase-admin['"]/); // covers: AC-103-3 — non importa il client admin
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/); // covers: AC-103-3 — non usa la chiave service_role
    expect(src).toContain('createServerSupabaseClient'); // covers: AC-103-3 — client di sessione
  });
});

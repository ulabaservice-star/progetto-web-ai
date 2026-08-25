import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { pgQuery } from './helpers/pg';
import {
  adminClient,
  createTestUser,
  signInAs,
  deleteTestUser,
} from './helpers/supabase-test';

// BIL-101 (macrotask entitlement-core, p5-billing-fase1) — RLS OWNER-ONLY in SOLA
// LETTURA di public.subscriptions, PROVATA A RUNTIME (OWASP A01:2025 + BIL-D2).
// L'oracolo statico (rls_check del checkpoint) prova la FORMA della policy; qui si
// prova il COMPORTAMENTO con client reali e, soprattutto, la proprieta di sicurezza
// centrale del billing: il client LEGGE il proprio piano ma non lo SCRIVE MAI —
// l'entitlement lo muove solo il webhook (service_role, fuori dal percorso utente).
//
//  - (AC-101-1) contratto di CATALOGO: relrowsecurity=true e l'insieme ESATTO delle
//    policy e ['SELECT'] (nessuna policy di scrittura: default-deny). L'uguaglianza
//    dell'insieme — non un "contiene" — e cio che rende ROSSA l'AGGIUNTA di una
//    qualsiasi policy INSERT/UPDATE/DELETE (mutazione del blueprint), anche senza
//    GRANT DML. Predicato ESATTO = is_account_member(account_id); GRANT: authenticated
//    solo SELECT, anon NIENTE.
//  - (AC-101-2) il proprietario dell'account A, con la propria riga piantata via
//    service_role, la LEGGE col client di sessione (account_id=A, plan='pro').
//  - (AC-101-3) A che filtra la subscription di B riceve INSIEME VUOTO (la RLS e
//    simmetrica per tenant: "A non vede B" <=> "B non vede A").
//  - (AC-101-4) A col client di sessione NON puo INSERT/UPDATE/DELETE la propria riga:
//    manca sia il GRANT DML sia la policy di scrittura -> 42501 su tutti e tre; la riga
//    resta INVARIATA (oracolo indipendente service_role).
//  - (AC-101-5) l'anon che SELECT subscriptions prende 42501 (nessun GRANT/colonna
//    pubblica): plan/status/provider non esposti.
//
// ANTI-PLACEBO: un ORACOLO INDIPENDENTE service_role (RLS bypassata) prova che le righe
// di A e B ESISTONO e che la tabella NON e vuota -> il vuoto/negato visto sopra e
// SOPPRESSIONE, non assenza di dati. Client di SESSIONE reale per le asserzioni, MAI
// service_role (bypasserebbe la RLS -> verde VACUO). service_role / pgQuery (superuser)
// SOLO per setup e per l'oracolo indipendente. Un solo sign-in (rate limit auth): la
// RLS e simmetrica, l'isolamento A->B copre AC-101-3.
//
// Le asserzioni derivano dagli acceptance_criteria AC-101-1..5 (01-entitlement-core.md).

const SB = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.DATABASE_URL
);

// pg_policies rende l'espressione secondo il search_path: `public.` puo comparire o no
// e gli spazi non sono significativi. Unica normalizzazione ammessa: comprime gli spazi
// e toglie il prefisso di schema, NON allenta nulla del predicato.
const norm = (e: string | null): string | null =>
  e == null ? null : e.replace(/\s+/g, ' ').replace(/\bpublic\./g, '').trim();

type PolicyRow = {
  policyname: string;
  cmd: string;
  roles: string[];
  qual: string | null;
  with_check: string | null;
};

describe.skipIf(!SB)(
  'BIL-101 RLS owner-only SOLA LETTURA su public.subscriptions — 1 sola policy SELECT (insieme esatto), owner legge il proprio piano, cross-tenant vuoto, scritture client negate (42501), anon 42501; oracolo indipendente anti-placebo',
  () => {
    const password = 'Password123!';
    const emailA = `bil101a_${randomUUID()}@example.test`;
    const emailB = `bil101b_${randomUUID()}@example.test`;

    let userAId = '';
    let userBId = '';
    let accountA = '';
    let accountB = '';
    let clientA: SupabaseClient;
    let anon: SupabaseClient;

    // current_period_end nel FUTURO: una subscription pro "attiva" e non scaduta.
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

      // Semina via service_role (bypassa la RLS, prova pure il GRANT service_role): UNA
      // riga pro per A e UNA per B (UNIQUE su account_id). Servono all'anti-placebo (le
      // righe esistono davvero) e alla trappola dell'isolamento (A non deve vedere B).
      const { error: seedErr } = await admin.from('subscriptions').insert([
        {
          account_id: accountA,
          plan: 'pro',
          status: 'active',
          provider: 'stripe',
          provider_subscription_id: `sub_A_${randomUUID().slice(0, 8)}`,
          provider_customer_id: `cus_A_${randomUUID().slice(0, 8)}`,
          current_period_end: periodEnd,
        },
        {
          account_id: accountB,
          plan: 'pro',
          status: 'active',
          provider: 'stripe',
          provider_subscription_id: `sub_B_${randomUUID().slice(0, 8)}`,
          provider_customer_id: `cus_B_${randomUUID().slice(0, 8)}`,
          current_period_end: periodEnd,
        },
      ]);
      expect(seedErr).toBeNull();

      // Un solo sign-in: client autenticato col JWT reale di A (RLS attiva).
      clientA = await signInAs(emailA, password);

      // Client ANON reale: anon key, NESSUN sign-in -> ruolo Postgres `anon`.
      anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // Guardrail sulla fixture: account distinti su tenant diversi.
      expect(accountA).not.toBe(accountB);
    }, 60_000);

    afterAll(async () => {
      // cascade: auth.users -> accounts -> subscriptions.
      if (userAId) await deleteTestUser(userAId);
      if (userBId) await deleteTestUser(userBId);
    });

    // covers: AC-101-1
    it('contratto di catalogo: relrowsecurity=true e l\'insieme ESATTO delle policy e [SELECT] con predicato is_account_member(account_id); GRANT: authenticated solo SELECT, anon niente', async () => {
      const rls = await pgQuery<{ relrowsecurity: boolean }>(
        `select relrowsecurity from pg_class where oid = 'public.subscriptions'::regclass`,
      );
      expect(rls[0].relrowsecurity).toBe(true); // covers: AC-101-1 — RLS abilitata

      const pols = await pgQuery<PolicyRow>(
        `select policyname, cmd, roles::text[] as roles, qual, with_check
           from pg_policies
          where schemaname = 'public' and tablename = 'subscriptions'`,
      );
      // Insieme ESATTO dei comandi: e questo che rende ROSSA l'aggiunta di QUALSIASI
      // policy di scrittura (mutazione), a prescindere dal GRANT DML.
      expect(pols.map((p) => p.cmd).sort()).toEqual(['SELECT']); // covers: AC-101-1
      const sel = pols.find((p) => p.cmd === 'SELECT')!;
      expect(sel.roles).toEqual(['authenticated']); // covers: AC-101-1
      expect(norm(sel.qual)).toBe('is_account_member(account_id)'); // covers: AC-101-1 — account_id ESPLICITO
      expect(sel.with_check).toBeNull(); // covers: AC-101-1 — nessun WITH CHECK su una SELECT

      // GRANT (BIL-D2): authenticated puo SELECT ma non scrivere; anon non ha alcun
      // privilegio (nessuna colonna pubblica). Difesa a due strati con l'assenza di policy.
      const grants = await pgQuery<{
        can_sel_auth: boolean;
        can_ins_auth: boolean;
        can_upd_auth: boolean;
        can_del_auth: boolean;
        can_sel_anon: boolean;
      }>(
        `select
           has_table_privilege('authenticated', 'public.subscriptions', 'SELECT') as can_sel_auth,
           has_table_privilege('authenticated', 'public.subscriptions', 'INSERT') as can_ins_auth,
           has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE') as can_upd_auth,
           has_table_privilege('authenticated', 'public.subscriptions', 'DELETE') as can_del_auth,
           has_table_privilege('anon', 'public.subscriptions', 'SELECT') as can_sel_anon`,
      );
      expect(grants[0].can_sel_auth).toBe(true); // covers: AC-101-1 — GRANT SELECT authenticated
      expect(grants[0].can_ins_auth).toBe(false); // covers: AC-101-1 — no GRANT INSERT
      expect(grants[0].can_upd_auth).toBe(false); // covers: AC-101-1 — no GRANT UPDATE
      expect(grants[0].can_del_auth).toBe(false); // covers: AC-101-1 — no GRANT DELETE
      expect(grants[0].can_sel_anon).toBe(false); // covers: AC-101-1, AC-101-5 — anon niente
    });

    // covers: AC-101-2
    it('il proprietario di A legge la PROPRIA subscription col client di sessione: account_id=A, plan=pro', async () => {
      const { data, error } = await clientA
        .from('subscriptions')
        .select('account_id, plan, status')
        .eq('account_id', accountA)
        .single();
      expect(error).toBeNull(); // covers: AC-101-2 — SELECT owner-only passa per il proprio account
      expect(data!.account_id).toBe(accountA); // covers: AC-101-2
      expect(data!.plan).toBe('pro'); // covers: AC-101-2
      expect(data!.status).toBe('active'); // covers: AC-101-2

      // ORACOLO INDIPENDENTE: la riga di A esiste davvero, con account_id=A.
      const { data: real } = await adminClient()
        .from('subscriptions')
        .select('account_id, plan')
        .eq('account_id', accountA)
        .single();
      expect(real!.account_id).toBe(accountA); // covers: AC-101-2
      expect(real!.plan).toBe('pro'); // covers: AC-101-2
    });

    // covers: AC-101-3
    it('isolamento per tenant: A che filtra la subscription di B riceve VUOTO; ma la riga di B ESISTE (anti-placebo, RLS simmetrica)', async () => {
      const byAccount = await clientA
        .from('subscriptions')
        .select('account_id, plan')
        .eq('account_id', accountB);
      expect(byAccount.error).toBeNull(); // covers: AC-101-3 — RLS, non errore di privilegio
      expect(byAccount.data ?? []).toHaveLength(0); // covers: AC-101-3 — riga di B invisibile ad A

      // Anche senza filtro: A vede SOLO la propria riga, mai quella di B.
      const all = await clientA.from('subscriptions').select('account_id');
      expect(all.error).toBeNull(); // covers: AC-101-3
      const visibili = (all.data ?? []).map((r) => r.account_id);
      expect(visibili).toContain(accountA); // covers: AC-101-3 — la propria si vede
      expect(visibili).not.toContain(accountB); // covers: AC-101-3 — quella di B no

      // ORACOLO INDIPENDENTE (service_role, RLS bypassata): la riga di B ESISTE -> il
      // vuoto sopra e soppressione RLS, non assenza di dati.
      const { data: realB } = await adminClient()
        .from('subscriptions')
        .select('account_id')
        .eq('account_id', accountB);
      expect((realB ?? []).length).toBe(1); // covers: AC-101-3 — la riga di B c'e
    });

    // covers: AC-101-4
    it('il proprietario di A NON puo INSERT/UPDATE/DELETE la propria subscription col client di sessione (42501: no GRANT + no policy); la riga resta INVARIATA (anti-placebo)', async () => {
      // INSERT: manca il GRANT INSERT e non esiste policy di scrittura -> 42501.
      const ins = await clientA
        .from('subscriptions')
        .insert({ account_id: accountA, plan: 'free', status: 'active' })
        .select('account_id');
      expect(ins.error?.code).toBe('42501'); // covers: AC-101-4 — scrittura client negata
      expect(ins.data).toBeNull(); // covers: AC-101-4

      // UPDATE della PROPRIA riga: nessun GRANT UPDATE -> 42501 (non un self-grant a 'free'->qui e a 'pro').
      const upd = await clientA
        .from('subscriptions')
        .update({ plan: 'free', status: 'canceled' })
        .eq('account_id', accountA)
        .select('account_id');
      expect(upd.error?.code).toBe('42501'); // covers: AC-101-4 — l'utente non muove il proprio piano
      expect(upd.data).toBeNull(); // covers: AC-101-4

      // DELETE della PROPRIA riga: nessun GRANT DELETE -> 42501.
      const del = await clientA
        .from('subscriptions')
        .delete()
        .eq('account_id', accountA)
        .select('account_id');
      expect(del.error?.code).toBe('42501'); // covers: AC-101-4
      expect(del.data).toBeNull(); // covers: AC-101-4

      // ORACOLO INDIPENDENTE: la riga di A e INVARIATA (ancora 'pro'/'active') e presente.
      const { data: real } = await adminClient()
        .from('subscriptions')
        .select('plan, status')
        .eq('account_id', accountA)
        .single();
      expect(real!.plan).toBe('pro'); // covers: AC-101-4 — nessun downgrade/self-mutation
      expect(real!.status).toBe('active'); // covers: AC-101-4
    });

    // covers: AC-101-5
    it('l\'anon che SELECT subscriptions prende 42501 (nessun GRANT/colonna pubblica); plan/status/provider non esposti, ma la tabella NON e vuota (anti-placebo)', async () => {
      const anonAll = await anon.from('subscriptions').select('account_id');
      expect(anonAll.error?.code).toBe('42501'); // covers: AC-101-5 — anon negato
      expect(anonAll.data).toBeNull(); // covers: AC-101-5

      // Nessuna colonna sensibile e esposta interrogandola per nome.
      const anonPlan = await anon.from('subscriptions').select('plan');
      expect(anonPlan.error?.code).toBe('42501'); // covers: AC-101-5 — plan non esposto
      const anonProv = await anon.from('subscriptions').select('provider_customer_id');
      expect(anonProv.error?.code).toBe('42501'); // covers: AC-101-5 — id provider non esposti

      // ORACOLO INDIPENDENTE: la tabella HA righe (A e B) -> il 42501 e negazione
      // d'accesso, non una tabella vuota.
      const { count } = await adminClient()
        .from('subscriptions')
        .select('account_id', { count: 'exact', head: true });
      expect(count ?? 0).toBeGreaterThan(0); // covers: AC-101-5
    });
  },
);

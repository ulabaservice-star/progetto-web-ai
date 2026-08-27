import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { type SupabaseClient } from '@supabase/supabase-js';
import { pgQuery } from './helpers/pg';
import { adminClient, createTestUser, signInAs, deleteTestUser } from './helpers/supabase-test';

// DOM-101 (macrotask domain-schema, p5-custom-domains-fase2) — RLS OWNER-ONLY di
// GESTIONE su public.site_domains, PROVATA A RUNTIME (OWASP A01:2025 + DOM-D5).
// L'oracolo statico (rls_check del checkpoint) prova la FORMA delle policy; qui si
// prova il COMPORTAMENTO con client reali e la proprieta di sicurezza centrale del
// collegamento dominio: il proprietario LEGGE/CREA/ELIMINA i propri collegamenti ma NON
// li AUTO-ATTIVA — la transizione ad 'active' la muove solo il server (nessuna policy
// UPDATE per authenticated), dopo la verifica DNS.
//
//  - (AC-101-1) contratto di CATALOGO: relrowsecurity=true e l'insieme ESATTO dei
//    comandi delle policy per `authenticated` e ['DELETE','INSERT','SELECT'] — NESSUNA
//    policy UPDATE. L'uguaglianza dell'insieme — non un "contiene" — e cio che rende
//    ROSSA l'AGGIUNTA di una policy UPDATE authenticated (mutazione del blueprint).
//    Predicato ESATTO = is_account_member(account_id); GRANT: authenticated
//    SELECT/INSERT/DELETE ma non UPDATE.
//  - (AC-101-2) il proprietario dell'account A, con un collegamento piantato via
//    service_role, lo LEGGE col client di sessione (account_id=A).
//  - (AC-101-3) A che filtra il collegamento di B riceve INSIEME VUOTO (la RLS e
//    simmetrica per tenant: "A non vede B" <=> "B non vede A").
//  - (AC-101-4) A col client di sessione NON puo UPDATE lo status del proprio
//    collegamento (es. portarlo ad 'active'): 42501 (no GRANT UPDATE + no policy); la
//    riga resta 'pending' (oracolo indipendente service_role) — anti self-activation.
//
// ANTI-PLACEBO: un ORACOLO INDIPENDENTE service_role (RLS bypassata) prova che le righe
// di A e B ESISTONO -> il vuoto/negato visto sopra e SOPPRESSIONE, non assenza di dati.
// Client di SESSIONE reale per le asserzioni, MAI service_role (bypasserebbe la RLS ->
// verde VACUO). service_role / pgQuery (superuser) SOLO per setup e oracolo indipendente.
//
// Le asserzioni derivano dagli acceptance_criteria AC-101-1..4 (01-domain-schema.md).

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
  'DOM-101 RLS owner-only di GESTIONE su public.site_domains — SELECT/INSERT/DELETE owner-only, NESSUNA UPDATE authenticated (anti self-activation), cross-tenant vuoto; oracolo indipendente anti-placebo',
  () => {
    const password = 'Password123!';
    const emailA = `dom101a_${randomUUID()}@example.test`;
    const emailB = `dom101b_${randomUUID()}@example.test`;

    let userAId = '';
    let userBId = '';
    let accountA = '';
    let accountB = '';
    let siteA = '';
    let siteB = '';
    let clientA: SupabaseClient;

    const hostA = `a-${randomUUID().slice(0, 8)}.example`;
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

      // Semina via service_role (bypassa la RLS, prova pure il GRANT service_role): un
      // collegamento 'pending' per A e uno per B. 'pending' e' voluto: AC-101-4 prova
      // che A non puo' portarlo ad 'active' da se'.
      const { error: seedErr } = await adminClient()
        .from('site_domains')
        .insert([
          {
            account_id: accountA,
            site_id: siteA,
            hostname: hostA,
            normalized_hostname: hostA,
            kind: 'apex',
            status: 'pending',
            verification_token: `tok_A_${randomUUID().slice(0, 8)}`,
            provider: 'vercel',
          },
          {
            account_id: accountB,
            site_id: siteB,
            hostname: hostB,
            normalized_hostname: hostB,
            kind: 'apex',
            status: 'pending',
            verification_token: `tok_B_${randomUUID().slice(0, 8)}`,
            provider: 'vercel',
          },
        ]);
      expect(seedErr).toBeNull();

      clientA = await signInAs(emailA, password);
      expect(accountA).not.toBe(accountB);
    }, 60_000);

    afterAll(async () => {
      // cascade: auth.users -> accounts -> sites -> site_domains.
      if (userAId) await deleteTestUser(userAId);
      if (userBId) await deleteTestUser(userBId);
    });

    it('contratto di catalogo: relrowsecurity=true; per authenticated l\'insieme ESATTO dei comandi e [DELETE,INSERT,SELECT] (nessuna UPDATE); predicato is_account_member(account_id); GRANT SELECT/INSERT/DELETE ma non UPDATE', async () => {
      const rls = await pgQuery<{ relrowsecurity: boolean }>(
        `select relrowsecurity from pg_class where oid = 'public.site_domains'::regclass`,
      );
      expect(rls[0].relrowsecurity).toBe(true); // covers: AC-101-1 — RLS abilitata

      const pols = await pgQuery<PolicyRow>(
        `select policyname, cmd, roles::text[] as roles, qual, with_check
           from pg_policies
          where schemaname = 'public' and tablename = 'site_domains'`,
      );
      // Sottoinsieme delle policy che si applicano al ruolo authenticated (la SELECT anon
      // di DOM-102 e' esclusa qui: appartiene alla superficie di routing).
      const authPols = pols.filter((p) => p.roles.includes('authenticated'));
      // Insieme ESATTO dei comandi authenticated: rende ROSSA l'aggiunta di una policy
      // UPDATE authenticated (mutazione del blueprint), a prescindere dal GRANT.
      expect(authPols.map((p) => p.cmd).sort()).toEqual(['DELETE', 'INSERT', 'SELECT']); // covers: AC-101-1
      expect(authPols.find((p) => p.cmd === 'UPDATE')).toBeUndefined(); // covers: AC-101-1, AC-101-4 — nessuna UPDATE authenticated

      const sel = authPols.find((p) => p.cmd === 'SELECT')!;
      expect(sel.roles).toEqual(['authenticated']); // covers: AC-101-1
      expect(norm(sel.qual)).toBe('is_account_member(account_id)'); // covers: AC-101-1 — account_id ESPLICITO
      const ins = authPols.find((p) => p.cmd === 'INSERT')!;
      expect(ins.roles).toEqual(['authenticated']); // covers: AC-101-1
      expect(norm(ins.with_check)).toBe('is_account_member(account_id)'); // covers: AC-101-1
      const del = authPols.find((p) => p.cmd === 'DELETE')!;
      expect(del.roles).toEqual(['authenticated']); // covers: AC-101-1
      expect(norm(del.qual)).toBe('is_account_member(account_id)'); // covers: AC-101-1

      const grants = await pgQuery<{
        sel: boolean;
        ins: boolean;
        upd: boolean;
        del: boolean;
      }>(
        `select
           has_table_privilege('authenticated', 'public.site_domains', 'SELECT') as sel,
           has_table_privilege('authenticated', 'public.site_domains', 'INSERT') as ins,
           has_table_privilege('authenticated', 'public.site_domains', 'UPDATE') as upd,
           has_table_privilege('authenticated', 'public.site_domains', 'DELETE') as del`,
      );
      expect(grants[0].sel).toBe(true); // covers: AC-101-1 — GRANT SELECT authenticated
      expect(grants[0].ins).toBe(true); // covers: AC-101-1 — GRANT INSERT authenticated
      expect(grants[0].del).toBe(true); // covers: AC-101-1 — GRANT DELETE authenticated
      expect(grants[0].upd).toBe(false); // covers: AC-101-1, AC-101-4 — nessun GRANT UPDATE authenticated
    });

    it('il proprietario di A legge il PROPRIO collegamento col client di sessione (account_id=A)', async () => {
      const { data, error } = await clientA
        .from('site_domains')
        .select('account_id, normalized_hostname, status')
        .eq('normalized_hostname', hostA)
        .single();
      expect(error).toBeNull(); // covers: AC-101-2 — SELECT owner-only passa per il proprio account
      expect(data!.account_id).toBe(accountA); // covers: AC-101-2
      expect(data!.normalized_hostname).toBe(hostA); // covers: AC-101-2

      // ORACOLO INDIPENDENTE: la riga di A esiste davvero, con account_id=A.
      const { data: real } = await adminClient()
        .from('site_domains')
        .select('account_id')
        .eq('normalized_hostname', hostA)
        .single();
      expect(real!.account_id).toBe(accountA); // covers: AC-101-2
    });

    it('isolamento per tenant: A che filtra il collegamento di B riceve VUOTO; ma la riga di B ESISTE (anti-placebo, RLS simmetrica)', async () => {
      const byHost = await clientA
        .from('site_domains')
        .select('account_id')
        .eq('normalized_hostname', hostB);
      expect(byHost.error).toBeNull(); // covers: AC-101-3 — RLS, non errore di privilegio
      expect(byHost.data ?? []).toHaveLength(0); // covers: AC-101-3 — riga di B invisibile ad A

      // Senza filtro: A vede SOLO i propri host, mai quelli di B.
      const all = await clientA.from('site_domains').select('normalized_hostname');
      expect(all.error).toBeNull(); // covers: AC-101-3
      const visti = (all.data ?? []).map((r) => r.normalized_hostname);
      expect(visti).toContain(hostA); // covers: AC-101-3 — il proprio si vede
      expect(visti).not.toContain(hostB); // covers: AC-101-3 — quello di B no

      // ORACOLO INDIPENDENTE (service_role, RLS bypassata): la riga di B ESISTE -> il
      // vuoto sopra e soppressione RLS, non assenza di dati.
      const { data: realB } = await adminClient()
        .from('site_domains')
        .select('account_id')
        .eq('normalized_hostname', hostB);
      expect((realB ?? []).length).toBe(1); // covers: AC-101-3 — la riga di B c'e
    });

    it('il proprietario di A NON puo UPDATE lo status del proprio collegamento (42501: no GRANT + no policy); la riga resta pending (anti self-activation)', async () => {
      // Tentata AUTO-ATTIVAZIONE: portare il proprio collegamento a 'active' dal client.
      const upd = await clientA
        .from('site_domains')
        .update({ status: 'active' })
        .eq('normalized_hostname', hostA)
        .select('normalized_hostname');
      expect(upd.error?.code).toBe('42501'); // covers: AC-101-4 — l'utente non muove lo stato
      expect(upd.data).toBeNull(); // covers: AC-101-4

      // ORACOLO INDIPENDENTE: la riga di A e INVARIATA (ancora 'pending').
      const { data: real } = await adminClient()
        .from('site_domains')
        .select('status')
        .eq('normalized_hostname', hostA)
        .single();
      expect(real!.status).toBe('pending'); // covers: AC-101-4 — nessuna self-activation
    });
  },
);

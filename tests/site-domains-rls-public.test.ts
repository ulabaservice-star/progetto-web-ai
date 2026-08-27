import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { pgQuery } from './helpers/pg';
import { adminClient, createTestUser, deleteTestUser } from './helpers/supabase-test';

// DOM-102 (macrotask domain-schema, p5-custom-domains-fase2) — la SOLA superficie di
// LETTURA PUBBLICA per l'host-routing, PROVATA A RUNTIME (OWASP A01:2025 + DOM-D6).
// anon (edge, senza sessione) legge SOLO i domini 'active' e SOLO (normalized_hostname,
// public_slug); tutto il resto e' negato. Gemella della superficie anon di
// site_publications (P4): policy anon-active + GRANT column-level.
//
//  - (AC-102-1) un dominio 'active' e uno 'pending' esistono; anon proiettando
//    (normalized_hostname, public_slug) vede SOLO l'attivo — il 'pending' e' filtrato
//    (indistinguibile da inesistente, fail-closed P1-D21).
//  - (AC-102-2) anon che legge verification_token o account_id, o che scrive, e' NEGATO
//    (GRANT column-level: solo hostname+slug; nessun GRANT di scrittura anon) -> 42501.
//  - (AC-102-3) contratto di CATALOGO: esiste ESATTAMENTE una policy SELECT per anon,
//    vincolata a status='active' (mai USING(true)).
//
// ANTI-PLACEBO: un ORACOLO INDIPENDENTE service_role prova che ENTRAMBE le righe (attiva
// e pending) esistono -> il fatto che anon veda solo l'attiva e' FILTRO della policy,
// non assenza di dati. Client ANON reale per le asserzioni (mai service_role).
//
// Le asserzioni derivano dagli acceptance_criteria AC-102-1..3 (01-domain-schema.md).

const SB = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.DATABASE_URL
);

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
  'DOM-102 superficie di routing anon su public.site_domains — SELECT solo sugli attivi, GRANT column-level (hostname+slug), UNA sola policy anon-active; oracolo indipendente anti-placebo',
  () => {
    const password = 'Password123!';
    const email = `dom102_${randomUUID()}@example.test`;

    let userId = '';
    let accountId = '';
    let siteId = '';
    let slug = '';
    let anon: SupabaseClient;

    const activeHost = `active-${randomUUID().slice(0, 8)}.example`;
    const pendingHost = `pending-${randomUUID().slice(0, 8)}.example`;

    beforeAll(async () => {
      const u = await createTestUser(email, password);
      userId = u.id;
      const { data: acc } = await adminClient()
        .from('accounts')
        .select('id')
        .eq('owner_id', userId)
        .single();
      accountId = acc!.id as string;

      slug = `seed-${randomUUID()}`;
      const { data: site, error: siteErr } = await adminClient()
        .from('sites')
        .insert({ account_id: accountId, name: 'Bar Pubblico', slug })
        .select('id')
        .single();
      if (siteErr) throw siteErr;
      siteId = site!.id as string;

      // Due collegamenti via service_role: uno 'active' (con public_slug denormalizzato)
      // e uno 'pending'. La policy anon deve mostrare SOLO l'attivo.
      const { error: seedErr } = await adminClient()
        .from('site_domains')
        .insert([
          {
            account_id: accountId,
            site_id: siteId,
            hostname: activeHost,
            normalized_hostname: activeHost,
            kind: 'apex',
            status: 'active',
            public_slug: slug,
            verification_token: `tok_act_${randomUUID().slice(0, 8)}`,
            provider: 'vercel',
            verified_at: new Date().toISOString(),
          },
          {
            account_id: accountId,
            site_id: siteId,
            hostname: pendingHost,
            normalized_hostname: pendingHost,
            kind: 'subdomain',
            status: 'pending',
            public_slug: slug,
            verification_token: `tok_pen_${randomUUID().slice(0, 8)}`,
            provider: 'vercel',
          },
        ]);
      expect(seedErr).toBeNull();

      anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
    }, 60_000);

    afterAll(async () => {
      // cascade: auth.users -> accounts -> sites -> site_domains.
      if (userId) await deleteTestUser(userId);
    });

    it('anon proiettando (normalized_hostname, public_slug) vede SOLO il dominio active; il pending e filtrato (ma esiste: anti-placebo)', async () => {
      const { data, error } = await anon
        .from('site_domains')
        .select('normalized_hostname, public_slug');
      expect(error).toBeNull(); // covers: AC-102-1 — GRANT+policy consentono la proiezione pubblica
      const hosts = (data ?? []).map((r) => r.normalized_hostname);
      expect(hosts).toContain(activeHost); // covers: AC-102-1 — l'attivo si vede
      expect(hosts).not.toContain(pendingHost); // covers: AC-102-1 — il pending e' filtrato (fail-closed)
      const activeRow = (data ?? []).find((r) => r.normalized_hostname === activeHost)!;
      expect(activeRow.public_slug).toBe(slug); // covers: AC-102-1 — proiezione host->slug

      // Lookup mirato sul pending: anon non lo vede (indistinguibile da inesistente).
      const pend = await anon
        .from('site_domains')
        .select('normalized_hostname')
        .eq('normalized_hostname', pendingHost);
      expect(pend.error).toBeNull(); // covers: AC-102-1
      expect(pend.data ?? []).toHaveLength(0); // covers: AC-102-1 — il pending non e' esposto

      // ORACOLO INDIPENDENTE (service_role, RLS bypassata): ENTRAMBE le righe esistono ->
      // il filtro sopra e' policy, non assenza di dati.
      const { data: real } = await adminClient()
        .from('site_domains')
        .select('normalized_hostname, status')
        .in('normalized_hostname', [activeHost, pendingHost]);
      expect((real ?? []).length).toBe(2); // covers: AC-102-1 — entrambe presenti
      expect((real ?? []).find((r) => r.normalized_hostname === pendingHost)!.status).toBe('pending'); // covers: AC-102-1
    });

    it('anon NON puo leggere verification_token/account_id ne scrivere (GRANT column-level: solo hostname+slug; nessun GRANT di scrittura anon) -> 42501', async () => {
      const tok = await anon.from('site_domains').select('verification_token');
      expect(tok.error?.code).toBe('42501'); // covers: AC-102-2 — token non leggibile da anon
      const acc = await anon.from('site_domains').select('account_id');
      expect(acc.error?.code).toBe('42501'); // covers: AC-102-2 — account_id non leggibile da anon

      const ins = await anon
        .from('site_domains')
        .insert({
          account_id: accountId,
          site_id: siteId,
          hostname: `evil-${randomUUID().slice(0, 8)}.example`,
          normalized_hostname: `evil-${randomUUID().slice(0, 8)}.example`,
          kind: 'apex',
          status: 'active',
        })
        .select('normalized_hostname');
      expect(ins.error?.code).toBe('42501'); // covers: AC-102-2 — nessun GRANT di scrittura anon
      expect(ins.data).toBeNull(); // covers: AC-102-2

      // ORACOLO INDIPENDENTE: le colonne private ESISTONO e sono valorizzate (la
      // negazione sopra e' privilegio mancante, non colonna assente/vuota).
      const { data: real } = await adminClient()
        .from('site_domains')
        .select('verification_token, account_id')
        .eq('normalized_hostname', activeHost)
        .single();
      expect(real!.verification_token).toBeTruthy(); // covers: AC-102-2
      expect(real!.account_id).toBe(accountId); // covers: AC-102-2
    });

    it('contratto di catalogo: esiste ESATTAMENTE una policy SELECT per anon, vincolata a status=active (mai USING(true))', async () => {
      const pols = await pgQuery<PolicyRow>(
        `select policyname, cmd, roles::text[] as roles, qual, with_check
           from pg_policies
          where schemaname = 'public' and tablename = 'site_domains'`,
      );
      const anonPols = pols.filter((p) => p.roles.includes('anon'));
      expect(anonPols).toHaveLength(1); // covers: AC-102-3 — UNA sola policy anon
      const anonPol = anonPols[0];
      expect(anonPol.cmd).toBe('SELECT'); // covers: AC-102-3 — sola lettura
      expect(norm(anonPol.qual)).toContain("status = 'active'"); // covers: AC-102-3 — vincolata agli attivi
      expect(norm(anonPol.qual)).not.toBe('true'); // covers: AC-102-3 — mai USING(true)

      // GRANT: anon ha SELECT (column-level, verificato a runtime sopra) ma nessuna
      // scrittura di tabella.
      const grants = await pgQuery<{ ins: boolean; upd: boolean; del: boolean }>(
        `select
           has_table_privilege('anon', 'public.site_domains', 'INSERT') as ins,
           has_table_privilege('anon', 'public.site_domains', 'UPDATE') as upd,
           has_table_privilege('anon', 'public.site_domains', 'DELETE') as del`,
      );
      expect(grants[0].ins).toBe(false); // covers: AC-102-3 — nessuna INSERT anon
      expect(grants[0].upd).toBe(false); // covers: AC-102-3 — nessuna UPDATE anon
      expect(grants[0].del).toBe(false); // covers: AC-102-3 — nessuna DELETE anon
    });
  },
);

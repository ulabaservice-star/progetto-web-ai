import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { pgQuery } from './helpers/pg';
import { adminClient } from './helpers/supabase-test';

// PUB-201 (macrotask waitlist-schema, p6a-public-surface) — POSTURA RLS di
// public.waitlist_leads PROVATA A RUNTIME con client reali contro il Supabase locale.
// La tabella e' un ENDPOINT PUBBLICO di raccolta lead: la scrittura passa SOLO dalla
// server action (service_role, fuori dal percorso del browser), MAI dal client anon.
// La postura di sicurezza e' quindi ZERO-TRUST verso anon/authenticated:
//
//  - (AC-201-1) contratto di CATALOGO: relrowsecurity=true; ZERO policy in assoluto
//    (nessuna policy nomina 'anon'/'authenticated' — asserzione LETTERALE dell'AC — e
//    pols.length===0, il contratto esatto zero-policy). GRANT: SOLO service_role puo
//    SELECT/INSERT; anon e authenticated NON hanno alcun privilegio. L'asserzione
//    anon-INSERT=false e' il KILL della mutazione 'grant insert to anon'.
//  - (AC-201-2) l'anon che SELECT waitlist_leads prende 42501 (nessun GRANT): i lead
//    raccolti non sono leggibili dal browser.
//  - (AC-201-3) l'anon che INSERT waitlist_leads prende 42501 e NESSUNA riga viene
//    scritta: il browser non puo iniettare lead scavalcando la server action.
//  - (AC-201-4) service_role INSERT passa (e' il percorso legittimo della server action):
//    la riga esiste con normalized_email e locale attesi (oracolo indipendente).
//  - (AC-201-5) UNIQUE(normalized_email): un secondo INSERT con lo stesso
//    normalized_email fallisce con 23505 e NON crea una seconda riga (idempotenza
//    anti-doppione dell'iscrizione).
//
// ANTI-PLACEBO: un ORACOLO INDIPENDENTE (service_role, che bypassa GRANT e RLS) prova
// che la tabella NON e' vuota (la seed row esiste) -> il 42501/negato dell'anon e'
// SOPPRESSIONE d'accesso, non assenza di dati. Client ANON reale per TUTTE le asserzioni
// di negazione, MAI service_role (bypasserebbe -> verde VACUO). service_role / pgQuery
// (superuser) SOLO per setup, oracolo indipendente e CLEANUP (service_role non ha il
// GRANT DELETE: il cleanup DEVE passare da pgQuery superuser).
//
// Nessun utente auth: la tabella non ha owner. Email PER-RUN uniche (nessuna FK ->
// niente cascade cleanup): si generano con randomUUID e si ripuliscono in afterAll.
//
// Le asserzioni derivano dagli acceptance_criteria AC-201-1..5.

const SB = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.DATABASE_URL
);

type PolicyRow = {
  policyname: string;
  cmd: string;
  roles: string[];
};

describe.skipIf(!SB)(
  'PUB-201 postura RLS su public.waitlist_leads — RLS abilitata + ZERO policy, GRANT solo service_role, anon SELECT/INSERT negati (42501), UNIQUE(normalized_email) 23505; oracolo indipendente anti-placebo',
  () => {
    // Email uniche per-run: la tabella non ha FK, il cleanup e' per normalized_email.
    let seedEmail = '';
    let dupEmail = '';
    let anonEmail = '';
    let insEmail = '';

    let anon: SupabaseClient;

    beforeAll(async () => {
      seedEmail = 'seed_' + randomUUID() + '@bar.it';
      dupEmail = 'dup_' + randomUUID() + '@bar.it';
      anonEmail = 'anon_' + randomUUID() + '@bar.it';
      insEmail = 'mario_' + randomUUID() + '@bar.it';

      // Client ANON reale: anon key, NESSUN sign-in -> ruolo Postgres `anon`.
      anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // Semina via service_role (bypassa la RLS, prova pure il GRANT INSERT service_role):
      // UNA riga. Serve all'anti-placebo (la tabella HA righe davvero).
      const { error: seedErr } = await adminClient()
        .from('waitlist_leads')
        .insert({ email: seedEmail, normalized_email: seedEmail, locale: 'it', source: 'test' });
      expect(seedErr).toBeNull();
    }, 60_000);

    afterAll(async () => {
      // CLEANUP via pgQuery (superuser): service_role NON ha il GRANT DELETE, quindi il
      // teardown DEVE passare dalla connessione superuser che bypassa il no-delete-grant.
      await pgQuery(
        `delete from public.waitlist_leads where normalized_email = any($1)`,
        [[seedEmail, dupEmail, anonEmail, insEmail]],
      );
    });

    // covers: AC-201-1
    it('contratto di catalogo: relrowsecurity=true, ZERO policy (nessuna nomina anon/authenticated, pols.length=0), GRANT solo service_role SELECT/INSERT; anon e authenticated niente', async () => {
      const rls = await pgQuery<{ relrowsecurity: boolean }>(
        `select relrowsecurity from pg_class where oid = 'public.waitlist_leads'::regclass`,
      );
      expect(rls[0].relrowsecurity).toBe(true); // covers: AC-201-1 — RLS abilitata

      const pols = await pgQuery<PolicyRow>(
        `select policyname, cmd, roles::text[] as roles
           from pg_policies
          where schemaname = 'public' and tablename = 'waitlist_leads'`,
      );
      // (a) NESSUNA policy nomina 'anon' o 'authenticated' (asserzione LETTERALE dell'AC).
      const exposed = pols.filter(
        (p) => p.roles.includes('anon') || p.roles.includes('authenticated'),
      );
      expect(exposed).toHaveLength(0); // covers: AC-201-1
      // (b) ZERO policy in assoluto (contratto esatto zero-policy): la scrittura passa
      // solo dal GRANT service_role, mai da una policy che apra la tabella ai ruoli client.
      expect(pols.length).toBe(0); // covers: AC-201-1

      // GRANT: solo service_role puo SELECT/INSERT; anon e authenticated NIENTE.
      const grants = await pgQuery<{
        sel_svc: boolean;
        ins_svc: boolean;
        sel_anon: boolean;
        ins_anon: boolean;
        sel_auth: boolean;
        ins_auth: boolean;
      }>(
        `select
           has_table_privilege('service_role', 'public.waitlist_leads', 'SELECT') as sel_svc,
           has_table_privilege('service_role', 'public.waitlist_leads', 'INSERT') as ins_svc,
           has_table_privilege('anon', 'public.waitlist_leads', 'SELECT') as sel_anon,
           has_table_privilege('anon', 'public.waitlist_leads', 'INSERT') as ins_anon,
           has_table_privilege('authenticated', 'public.waitlist_leads', 'SELECT') as sel_auth,
           has_table_privilege('authenticated', 'public.waitlist_leads', 'INSERT') as ins_auth`,
      );
      expect(grants[0].sel_svc).toBe(true); // covers: AC-201-1 — service_role SELECT
      expect(grants[0].ins_svc).toBe(true); // covers: AC-201-1 — service_role INSERT
      expect(grants[0].sel_anon).toBe(false); // covers: AC-201-1 — anon niente SELECT
      expect(grants[0].ins_anon).toBe(false); // covers: AC-201-1 — KILL 'grant insert to anon'
      expect(grants[0].sel_auth).toBe(false); // covers: AC-201-1 — authenticated niente SELECT
      expect(grants[0].ins_auth).toBe(false); // covers: AC-201-1 — authenticated niente INSERT
    });

    // covers: AC-201-2
    it('l\'anon che SELECT waitlist_leads prende 42501 (nessun GRANT); ma la tabella NON e\' vuota (anti-placebo)', async () => {
      const { data, error } = await anon.from('waitlist_leads').select('email');
      expect(error?.code).toBe('42501'); // covers: AC-201-2 — SELECT anon negato
      expect(data).toBeNull(); // covers: AC-201-2

      // ANTI-PLACEBO: la tabella HA righe (la seed row) -> il 42501 e' negazione
      // d'accesso, non una tabella vuota.
      const { count } = await adminClient()
        .from('waitlist_leads')
        .select('id', { count: 'exact', head: true });
      expect(count ?? 0).toBeGreaterThan(0); // covers: AC-201-2
    });

    // covers: AC-201-3
    it('l\'anon che INSERT waitlist_leads prende 42501 e NON scrive nulla', async () => {
      const { data, error } = await anon
        .from('waitlist_leads')
        .insert({ email: anonEmail, normalized_email: anonEmail, locale: 'it' })
        .select('id');
      expect(error?.code).toBe('42501'); // covers: AC-201-3 — INSERT anon negato
      expect(data).toBeNull(); // covers: AC-201-3

      // Oracolo indipendente (superuser): nessuna riga con quella email e' stata scritta.
      const rows = await pgQuery<{ n: number }>(
        `select count(*)::int as n from public.waitlist_leads where normalized_email = $1`,
        [anonEmail],
      );
      expect(rows[0].n).toBe(0); // covers: AC-201-3 — nessuna riga scritta
    });

    // covers: AC-201-4
    it('service_role INSERT passa (percorso legittimo della server action): la riga esiste con normalized_email e locale attesi', async () => {
      const { error } = await adminClient()
        .from('waitlist_leads')
        .insert({ email: insEmail, normalized_email: insEmail, locale: 'it' })
        .select('id')
        .single();
      expect(error).toBeNull(); // covers: AC-201-4 — INSERT service_role passa

      // ORACOLO INDIPENDENTE: la riga esiste davvero, con i valori attesi.
      const { data: real } = await adminClient()
        .from('waitlist_leads')
        .select('normalized_email, locale')
        .eq('normalized_email', insEmail)
        .single();
      expect(real!.normalized_email).toBe(insEmail); // covers: AC-201-4
      expect(real!.locale).toBe('it'); // covers: AC-201-4
    });

    // covers: AC-201-5
    it('UNIQUE(normalized_email): un secondo INSERT con lo stesso normalized_email fallisce con 23505 e NON crea una seconda riga (anti-placebo)', async () => {
      // Prima riga via service_role: passa.
      const first = await adminClient()
        .from('waitlist_leads')
        .insert({ email: dupEmail, normalized_email: dupEmail, locale: 'it' });
      expect(first.error).toBeNull(); // covers: AC-201-5

      // Secondo INSERT con lo STESSO normalized_email: viola la UNIQUE -> 23505.
      const second = await adminClient()
        .from('waitlist_leads')
        .insert({ email: dupEmail, normalized_email: dupEmail, locale: 'it' })
        .select('id');
      expect(second.error?.code).toBe('23505'); // covers: AC-201-5 — UNIQUE violata
      expect(second.data).toBeNull(); // covers: AC-201-5

      // ANTI-PLACEBO: esattamente UNA riga con quel normalized_email (nessun doppione).
      const rows = await pgQuery<{ n: number }>(
        `select count(*)::int as n from public.waitlist_leads where normalized_email = $1`,
        [dupEmail],
      );
      expect(rows[0].n).toBe(1); // covers: AC-201-5 — nessuna seconda riga
    });
  },
);

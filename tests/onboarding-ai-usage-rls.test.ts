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

// OGW-101 (macrotask ai-usage-guard, onboarding-guided-wizard) — RLS OWNER-ONLY del
// contatore d'uso AI public.onboarding_ai_usage, PROVATA A RUNTIME (OWASP A01:2025).
// L'oracolo qui non e' lo schema (gia' coperto staticamente da rls_check) ma il
// COMPORTAMENTO con client reali:
//
//  - (AC-101-1) il proprietario del sito A inserisce una riga d'uso PROPRIA
//    (account_id=A, site_id=A): la scrittura passa (WITH CHECK is_account_member) e la
//    riga esiste con site_id=A e account_id del proprietario;
//  - (AC-101-2) l'isolamento per tenant (simmetrico): A che SELECT il contatore di B
//    riceve INSIEME VUOTO (RLS); A che tenta di SCRIVERE il contatore altrui e' respinto
//    su DUE fronti — WITH CHECK RLS (account_id del vicino -> 42501) e FK COMPOSITA
//    (proprio account_id + sito del vicino -> 23503, non puoi ancorare al sito altrui);
//  - (AC-101-3) l'anon che SELECT onboarding_ai_usage prende 42501 (nessun GRANT: il
//    contatore non ha colonne pubbliche) -> account_id/site_id/kind non esposti.
//
// ANTI-PLACEBO: un ORACOLO INDIPENDENTE service_role (RLS bypassata) prova che le righe
// di B ESISTONO e che la tabella NON e' vuota -> il vuoto/negato visto sopra e'
// SOPPRESSIONE, non assenza di dati. Client di SESSIONE reale per le asserzioni, MAI
// service_role (bypasserebbe la RLS -> verde VACUO). service_role / pgQuery (superuser)
// SOLO per setup e per l'oracolo indipendente. Un solo sign-in (rate limit auth): come
// in assets-rls, l'isolamento e' esercitato A->B (la RLS e' simmetrica per tenant).
//
// Le asserzioni derivano dagli acceptance_criteria AC-101-1/2/3 (01-ai-usage-guard.md).

const SB = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.DATABASE_URL
);

describe.skipIf(!SB)(
  'OGW-101 RLS owner-only su public.onboarding_ai_usage — proprietario conta il proprio, cross-tenant SELECT/INSERT negati (RLS + FK), anon 42501; oracolo indipendente anti-placebo',
  () => {
    const password = 'Password123!';
    const suffisso = randomUUID().slice(0, 8);
    const emailA = `ogw101a_${randomUUID()}@example.test`;
    const emailB = `ogw101b_${randomUUID()}@example.test`;

    let userAId = '';
    let userBId = '';
    let accountA = '';
    let accountB = '';
    let siteA = '';
    let siteB = '';
    let clientA: SupabaseClient;
    let anon: SupabaseClient;

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

      // Un sito per account (FK composita (account_id, site_id) -> sites). Slug per-account,
      // namespacizzato col suffisso; name discordanti.
      const siteRows = await pgQuery<{ id: string; account_id: string }>(
        `insert into public.sites (account_id, name, slug)
         values ($1, 'A shop', $3),
                ($2, 'B bazar', $4)
         returning id, account_id`,
        [accountA, accountB, `ogw101-a-${suffisso}`, `ogw101-b-${suffisso}`],
      );
      siteA = siteRows.find((r) => r.account_id === accountA)!.id;
      siteB = siteRows.find((r) => r.account_id === accountB)!.id;

      // Semina via service_role (bypassa la RLS, NON i vincoli): DUE righe d'uso di B, kind
      // discordanti. Servono all'anti-placebo (le righe di B esistono davvero; la tabella
      // non e' vuota) e alla trappola dell'isolamento (A non deve vederle).
      const { error: seedErr } = await admin.from('onboarding_ai_usage').insert([
        { account_id: accountB, site_id: siteB, kind: 'import' },
        { account_id: accountB, site_id: siteB, kind: 'suggest_offerings' },
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

      // Guardrail sulla fixture: account e siti distinti su tenant diversi.
      expect(accountA).not.toBe(accountB);
      expect(siteA).not.toBe(siteB);
    }, 60_000);

    afterAll(async () => {
      // cascade: auth.users -> accounts -> sites -> onboarding_ai_usage.
      if (userAId) await deleteTestUser(userAId);
      if (userBId) await deleteTestUser(userBId);
    });

    // covers: AC-101-1
    it('il proprietario di A inserisce una riga d\'uso PROPRIA: scrittura ammessa, account_id=A e site_id=A', async () => {
      const { data, error } = await clientA
        .from('onboarding_ai_usage')
        .insert({ account_id: accountA, site_id: siteA, kind: 'generate_description' })
        .select('id, account_id, site_id, kind')
        .single();
      expect(error).toBeNull(); // covers: AC-101-1 — WITH CHECK is_account_member(A) passa
      expect(data!.account_id).toBe(accountA); // covers: AC-101-1 — riga ancorata all'account A
      expect(data!.site_id).toBe(siteA); // covers: AC-101-1
      expect(data!.kind).toBe('generate_description'); // covers: AC-101-1

      // ORACOLO INDIPENDENTE: la riga esiste davvero, con account_id=A e site_id=A.
      const { data: real } = await adminClient()
        .from('onboarding_ai_usage')
        .select('account_id, site_id')
        .eq('id', data!.id)
        .single();
      expect(real!.account_id).toBe(accountA); // covers: AC-101-1
      expect(real!.site_id).toBe(siteA); // covers: AC-101-1
    });

    // covers: AC-101-2
    it('l\'isolamento per tenant: A che SELECT il contatore di B riceve VUOTO; A che tenta di SCRIVERE il contatore altrui e\' respinto (RLS 42501 e FK composita 23503); ma le righe di B ESISTONO (anti-placebo)', async () => {
      // SELECT del contatore di B: la RLS (is_account_member) filtra -> 0 righe, SENZA errore.
      const byAccount = await clientA
        .from('onboarding_ai_usage')
        .select('id, account_id, kind')
        .eq('account_id', accountB);
      expect(byAccount.error).toBeNull(); // covers: AC-101-2 — RLS, non errore di privilegio
      expect(byAccount.data ?? []).toHaveLength(0); // covers: AC-101-2 — righe di B invisibili ad A

      // Anche filtrando per il SITO di B: comunque 0 righe (la RLS e' per account).
      const bySite = await clientA
        .from('onboarding_ai_usage')
        .select('id')
        .eq('site_id', siteB);
      expect(bySite.error).toBeNull(); // covers: AC-101-2
      expect(bySite.data ?? []).toHaveLength(0); // covers: AC-101-2

      // SCRITTURA cross-tenant, fronte RLS: A prova a scrivere col account_id del vicino ->
      // WITH CHECK is_account_member(B) falso -> 42501, nessuna riga.
      const wrongAccount = await clientA
        .from('onboarding_ai_usage')
        .insert({ account_id: accountB, site_id: siteB, kind: 'import' })
        .select('id');
      expect(wrongAccount.error?.code).toBe('42501'); // covers: AC-101-2 — RLS nega la scrittura altrui
      expect(wrongAccount.data).toBeNull(); // covers: AC-101-2

      // SCRITTURA cross-tenant, fronte FK COMPOSITA (difesa in profondita'): A col PROPRIO
      // account_id ma il SITO del vicino -> (accountA, siteB) non esiste in sites -> 23503.
      const foreignSite = await clientA
        .from('onboarding_ai_usage')
        .insert({ account_id: accountA, site_id: siteB, kind: 'import' })
        .select('id');
      expect(foreignSite.error?.code).toBe('23503'); // covers: AC-101-2 — FK composita: sito non tuo
      expect(foreignSite.data).toBeNull(); // covers: AC-101-2

      // ORACOLO INDIPENDENTE (service_role, RLS bypassata): le righe di B ESISTONO -> il vuoto
      // sopra e' soppressione RLS, non assenza di dati; e nessuna riga spuria e' stata creata.
      const { data: realB } = await adminClient()
        .from('onboarding_ai_usage')
        .select('kind')
        .eq('account_id', accountB);
      expect((realB ?? []).length).toBeGreaterThanOrEqual(2); // covers: AC-101-2 — le righe di B ci sono
      const { data: spurio } = await adminClient()
        .from('onboarding_ai_usage')
        .select('id')
        .eq('account_id', accountA)
        .eq('site_id', siteB);
      expect(spurio ?? []).toHaveLength(0); // covers: AC-101-2 — nessuna riga (A, siteB) e' passata
    });

    // covers: AC-101-3
    it('l\'anon che SELECT onboarding_ai_usage prende 42501 (nessun GRANT/colonna pubblica); account_id/site_id/kind non esposti, ma la tabella NON e\' vuota (anti-placebo)', async () => {
      const anonAll = await anon.from('onboarding_ai_usage').select('id');
      expect(anonAll.error?.code).toBe('42501'); // covers: AC-101-3 — anon negato
      expect(anonAll.data).toBeNull(); // covers: AC-101-3

      // Nessuna colonna sensibile e' esposta interrogandola per nome.
      const anonAcc = await anon.from('onboarding_ai_usage').select('account_id');
      expect(anonAcc.error?.code).toBe('42501'); // covers: AC-101-3 — account_id non esposto
      const anonSite = await anon.from('onboarding_ai_usage').select('site_id');
      expect(anonSite.error?.code).toBe('42501'); // covers: AC-101-3 — site_id non esposto
      const anonKind = await anon.from('onboarding_ai_usage').select('kind');
      expect(anonKind.error?.code).toBe('42501'); // covers: AC-101-3 — kind non esposto

      // ORACOLO INDIPENDENTE: la tabella HA righe (quelle di A e B) -> il 42501 e' negazione
      // d'accesso, non una tabella vuota.
      const { count } = await adminClient()
        .from('onboarding_ai_usage')
        .select('id', { count: 'exact', head: true });
      expect(count ?? 0).toBeGreaterThan(0); // covers: AC-101-3
    });
  },
);

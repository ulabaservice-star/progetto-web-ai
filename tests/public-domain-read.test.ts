import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { adminClient, createTestUser, deleteTestUser } from './helpers/supabase-test';

// DOM-401 (macrotask domain-routing, p5-custom-domains-fase2) — reader pubblico host->slug
// (readSiteSlugForHost) PROVATO A RUNTIME contro il Supabase locale sotto la RLS ANON reale
// (oracolo forte, anti-placebo). Gemello di tests/site-domains-rls-public.test.ts. Le asserzioni
// derivano dagli acceptance_criteria AC-401-1..3 (10-domain-routing.md).
//
// Il reader costruisce il suo client via createAnonServerClient(): lo mockiamo per iniettare un
// client ANON REALE (createClient con la anon key, ruolo Postgres `anon`, RLS ATTIVA), cosi' la
// query gira per intero contro il DB — la policy DOM-102 `site_domains_select_active_anon` (solo
// gli attivi) e il GRANT column-level fanno il gate reale, non un mock. clientHolder via vi.hoisted:
// il client si costruisce in beforeAll (come site-domains-rls-public) e si inietta nel mock.

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
  createAnonServerClient: () => clientHolder.current,
}));

import { readSiteSlugForHost } from '@/data/public-domain';

describe.skipIf(!SB)(
  'DOM-401 reader pubblico host->slug (runtime, Supabase locale, RLS anon reale) — solo attivi, esatto, fail-closed',
  () => {
    const password = 'Password123!';
    const email = `dom401_${randomUUID()}@example.test`;

    let userId = '';
    let accountId = '';
    let siteId = '';

    const activeHost = `active-${randomUUID().slice(0, 8)}.example`;
    const verifyingHost = `verifying-${randomUUID().slice(0, 8)}.example`;
    const activeSlug = `seed-${randomUUID()}`;
    const verifyingSlug = `seed-${randomUUID()}`;

    beforeAll(async () => {
      const u = await createTestUser(email, password);
      userId = u.id;
      const { data: acc } = await adminClient()
        .from('accounts')
        .select('id')
        .eq('owner_id', userId)
        .single();
      accountId = acc!.id as string;

      const { data: site, error: siteErr } = await adminClient()
        .from('sites')
        .insert({ account_id: accountId, name: 'Bar Routing', slug: `seed-${randomUUID()}` })
        .select('id')
        .single();
      if (siteErr) throw siteErr;
      siteId = site!.id as string;

      // Due collegamenti via service_role (bypassa la RLS): uno 'active' (che anon deve vedere) e
      // uno 'verifying' (che la policy anon deve NASCONDERE). public_slug denormalizzato su entrambi.
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
            provider: 'vercel',
            verification_token: randomUUID(),
            public_slug: activeSlug,
            verified_at: new Date().toISOString(),
          },
          {
            account_id: accountId,
            site_id: siteId,
            hostname: verifyingHost,
            normalized_hostname: verifyingHost,
            kind: 'apex',
            status: 'verifying',
            provider: 'vercel',
            verification_token: randomUUID(),
            public_slug: verifyingSlug,
          },
        ]);
      expect(seedErr).toBeNull();

      // Client ANON REALE (mai service_role): stesso costruttore di site-domains-rls-public.
      clientHolder.current = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
    }, 60_000);

    afterAll(async () => {
      // cascade: auth.users -> accounts -> sites -> site_domains.
      if (userId) await deleteTestUser(userId);
    });

    it('AC-401-1: host attivo -> { public_slug }; normalizza (case/schema URL) prima del match esatto', async () => {
      expect(await readSiteSlugForHost(activeHost)).toEqual({ public_slug: activeSlug }); // covers: AC-401-1
      // Forma NON canonica (schema https:// + maiuscole + path/query): il reader normalizza (DOM-111)
      // PRIMA del match, quindi risolve comunque allo stesso attivo.
      expect(
        await readSiteSlugForHost('HTTPS://' + activeHost.toUpperCase() + '/path?x=1'),
      ).toEqual({ public_slug: activeSlug }); // covers: AC-401-1
    });

    it('AC-401-2: host verifying (non attivo) -> null; la RLS anon lo nasconde (ma la riga esiste: anti-placebo)', async () => {
      // ORACOLO INDIPENDENTE (service_role, RLS bypassata): la riga verifying ESISTE davvero -> il
      // null del reader e' FILTRO della policy anon, non assenza di dati.
      const { data: real } = await adminClient()
        .from('site_domains')
        .select('normalized_hostname')
        .eq('normalized_hostname', verifyingHost)
        .maybeSingle();
      expect(real).not.toBeNull(); // covers: AC-401-2 — la riga non-attiva esiste

      expect(await readSiteSlugForHost(verifyingHost)).toBeNull(); // covers: AC-401-2 — anon non la vede
    });

    it('AC-401-3: host mai registrato -> null; host sintatticamente invalido -> null (nessuna query)', async () => {
      expect(
        await readSiteSlugForHost('nomatch-' + randomUUID().slice(0, 8) + '.example'),
      ).toBeNull(); // covers: AC-401-3 — host mai registrato
      expect(await readSiteSlugForHost('non e un host')).toBeNull(); // covers: AC-401-3 — norm !ok, nessuna query
    });
  },
);

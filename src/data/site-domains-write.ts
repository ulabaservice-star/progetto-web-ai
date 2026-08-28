import 'server-only';
import { createAdminClient } from '@/data/supabase-admin';

// DOM-222 (macrotask domain-store, p5-custom-domains-fase2) — il WRITER di STATO dei
// collegamenti dominio, con service_role CONFINATO (fuori dal percorso utente). E' l'UNICO
// percorso che muove lo stato del collegamento: la creazione 'pending' e le transizioni
// 'active'/'suspended'/'error' che il client NON puo' fare. site_domains ha RLS SELECT/INSERT/
// DELETE owner-only e NESSUNA policy/GRANT UPDATE per authenticated (DOM-101): un UPDATE del
// client sarebbe self-activation di un dominio non verificato (domain-hijack). La transizione
// ad 'active' passa SOLO di qui, server-side, DOPO la verifica DNS (chi decide QUANDO e' il
// verify endpoint DOM-311, fuori da questo modulo).
//
// Lo STORE e' una porta iniettabile (gemella di subscriptions-write): il default parla col DB
// via service_role (createAdminClient); i test iniettano uno store in-memory e inchiodano la
// logica del writer senza chiave reale ne' DB.

const TABLE = 'site_domains';

// DOM-D2: 'vercel' e' l'unico provider dietro la porta DomainProvider oggi; un adattatore
// domani cambia solo questa costante (o diventa un parametro).
const PROVIDER = 'vercel';

export type SiteDomainKind = 'apex' | 'subdomain';

/** Le transizioni di stato che muove SOLO il server (mai il client): post-creazione. */
export type SiteDomainStatus = 'active' | 'suspended' | 'error';

/** La riga 'pending' che il writer crea all'avvio del collegamento. */
export type SiteDomainPendingInsert = {
  account_id: string;
  site_id: string;
  hostname: string;
  normalized_hostname: string;
  kind: SiteDomainKind;
  status: 'pending';
  verification_token: string;
  provider: string;
  provider_domain_id: string | null;
};

// Patch della transizione di stato. `detail` fa parte del contratto (diagnostica futura) ma lo
// schema DOM-101 non ha ancora una colonna dedicata => oggi non e' persistito: si scrive solo
// cio' che ha una colonna reale (status, verified_at).
export type SiteDomainStatusPatch = { verified_at?: string; detail?: string };

/** Porta di persistenza dello stato: insert 'pending' + update di stato (service_role). */
export type SiteDomainWriteStore = {
  insertPending(row: SiteDomainPendingInsert): Promise<void>;
  updateStatus(
    normalizedHostname: string,
    status: SiteDomainStatus,
    patch: SiteDomainStatusPatch,
  ): Promise<void>;
};

/** Store reale su service_role (createAdminClient): confinato server-side, mai nel browser. */
function adminStore(): SiteDomainWriteStore {
  const admin = createAdminClient();
  return {
    async insertPending(row) {
      // upsert su normalized_hostname (unico globale): ri-avviare un collegamento non ancora
      // attivo riparte da 'pending' con un token fresco, senza violare l'UNIQUE.
      const { error } = await admin
        .from(TABLE)
        .upsert(
          { ...row, updated_at: new Date().toISOString() },
          { onConflict: 'normalized_hostname' },
        );
      if (error) throw new Error(`site_domains insert pending fallito: ${error.message}`);
    },
    async updateStatus(host, status, patch) {
      const update: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (patch.verified_at !== undefined) update.verified_at = patch.verified_at;
      const { error } = await admin
        .from(TABLE)
        .update(update)
        .eq('normalized_hostname', host);
      if (error) throw new Error(`site_domains update stato fallito: ${error.message}`);
    },
  };
}

/**
 * Crea (o ri-avvia) un collegamento in stato 'pending' per (account, sito, host), col token di
 * verifica e l'eventuale id opaco del provider. Nasce SEMPRE 'pending': l'attivazione passa da
 * setDomainStatus dopo la verifica DNS. service_role confinato (store di default), mai il client.
 */
export async function createPendingDomain(
  accountId: string,
  siteId: string,
  normalized: string,
  kind: SiteDomainKind,
  token: string,
  providerDomainId: string | null,
  store: SiteDomainWriteStore = adminStore(),
): Promise<void> {
  await store.insertPending({
    account_id: accountId,
    site_id: siteId,
    // hostname (grezzo, per la UI) e normalized_hostname (match esatto) coincidono qui: il
    // chiamante passa la forma canonica. NOT NULL su hostname => valorizzato comunque.
    hostname: normalized,
    normalized_hostname: normalized,
    kind,
    status: 'pending',
    verification_token: token,
    provider: PROVIDER,
    provider_domain_id: providerDomainId,
  });
}

/**
 * Muove lo stato di un collegamento (per normalized_hostname) ad 'active'/'suspended'/'error'
 * via service_role confinato. `verified_at` si valorizza all'attivazione. Solo il server passa
 * di qui: il client non ha alcun percorso di UPDATE (DOM-101).
 */
export async function setDomainStatus(
  host: string,
  status: SiteDomainStatus,
  patch: SiteDomainStatusPatch = {},
  store: SiteDomainWriteStore = adminStore(),
): Promise<void> {
  await store.updateStatus(host, status, patch);
}

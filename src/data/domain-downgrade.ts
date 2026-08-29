import 'server-only';

// DOM-602 (macrotask domain-downgrade, p5-custom-domains-fase2) — L'APPLICAZIONE della
// sospensione morbida dei domini custom, nel percorso del webhook (service_role confinato,
// FUORI dal percorso utente — A01/R7). Legge i collegamenti dell'account, calcola
// applyDomainDowngrade (dominio puro, DOM-601) e porta status='suspended' i SOLI collegamenti
// eccedenti: MAI un DELETE (DOM-D8, nessun dato perso, riattivabile a Pro).
//
// IDEMPOTENTE: solo i collegamenti 'active' vengono toccati, quindi una seconda esecuzione
// (replay del provider) non trova piu' nulla da sospendere (no-op). Riattivando Pro nessun
// collegamento viene toccato (un entitlement con custom_domain non produce eccedenti) e i dati
// restano intatti, pronti a tornare 'active' dal percorso di verifica.
//
// NODO id->host: la decisione pura ragiona per id (DOM-601) ma il writer setDomainStatus
// (DOM-222) sospende per normalized_hostname; percio' lo store elenca id+status+host e qui si
// mappa id->host prima di sospendere.
//
// Lo STORE e' una porta iniettabile (gemella di SiteDowngradeStore, BIL-502): il default parla
// col DB via service_role; i test iniettano uno store in-memory e inchiodano idempotenza e
// non-delete senza DB ne' chiavi.

import { createAdminClient } from '@/data/supabase-admin';
import {
  applyDomainDowngrade,
  type DowngradeDomain,
} from '@/domain/domains/domain-downgrade';
import { setDomainStatus } from '@/data/site-domains-write';
import { type Entitlement } from '@/domain/billing/entitlement';

/** Riga letta dallo store: id+status (per la decisione DOM-601) + normalized_hostname (per il writer). */
type AccountDomainRow = DowngradeDomain & { readonly normalized_hostname: string };

/** Porta di applicazione: elenca i collegamenti dell'account e ne sospende uno (per host, non-delete). */
export type DomainDowngradeStore = {
  listAccountDomains(accountId: string): Promise<AccountDomainRow[]>;
  suspendDomain(normalizedHostname: string): Promise<void>;
};

const TABLE = 'site_domains';

/** Store reale su service_role (confinato al webhook, fuori dal percorso utente — A01/R7). */
function adminDomainDowngradeStore(): DomainDowngradeStore {
  const admin = createAdminClient();
  return {
    async listAccountDomains(accountId) {
      const { data, error } = await admin
        .from(TABLE)
        .select('id, status, normalized_hostname')
        .eq('account_id', accountId);
      if (error) throw new Error(`lettura domini account fallita: ${error.message}`);
      return (data ?? []).map((r) => ({
        id: r.id as string,
        status: r.status as string,
        normalized_hostname: r.normalized_hostname as string,
      }));
    },
    async suspendDomain(normalizedHostname) {
      // Riuso del writer di stato (DOM-222): solo status='suspended', MAI delete (DOM-D8).
      await setDomainStatus(normalizedHostname, 'suspended');
    },
  };
}

/**
 * Applica la sospensione morbida ai domini di un account, dato l'entitlement risolto al confine.
 * Idempotente e non distruttiva: sospende SOLO i collegamenti 'active'; nulla e' cancellato. Se
 * l'entitlement include custom_domain (Pro) non tocca nulla. Robusta ai retry del provider.
 *
 * @param accountId l'account (dal SubscriptionEvent, mai dal client).
 * @param entitlement l'entitlement risolto al confine (resolveEntitlement, Fase 1).
 * @param store la porta di persistenza (default: service_role confinato al webhook).
 */
export async function applySoftDomainDowngrade(
  accountId: string,
  entitlement: Entitlement,
  store: DomainDowngradeStore = adminDomainDowngradeStore(),
): Promise<{ suspended: string[] }> {
  const rows = await store.listAccountDomains(accountId);
  const { domainsToSuspend } = applyDomainDowngrade(entitlement, rows);
  const hostById = new Map(rows.map((r) => [r.id, r.normalized_hostname]));
  const suspended: string[] = [];
  for (const id of domainsToSuspend) {
    const host = hostById.get(id);
    if (host === undefined) continue; // difensivo: id sempre presente in rows
    await store.suspendDomain(host);
    suspended.push(id);
  }
  return { suspended };
}

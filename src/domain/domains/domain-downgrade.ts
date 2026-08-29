// DOM-601 (macrotask domain-downgrade, p5-custom-domains-fase2) — La DECISIONE di
// sospensione morbida dei domini custom, dominio PURO. Nessun DB, nessuna rete, nessun
// orologio interno (gemella di applyDowngrade, BIL-501): dato l'entitlement GIA' risolto
// e l'elenco dei collegamenti dominio, decide COSA comporta una decadenza — senza eseguirla.
//
// ENTITLEMENT RIUSATO (DOM-D8/BIL-D7): si consuma l'Entitlement gia' calcolato server-side
// da resolveEntitlement (Fase 1), cosi' la definizione di "piano che include il dominio
// custom" ha UNA sola fonte (limits.custom_domain) e non si duplica la logica. La sospensione
// riguarda SOLO il passaggio a un piano senza dominio: finche' custom_domain resta true
// (piano attivo o in grazia) non si tocca nulla.
//
// NESSUN DATO PERSO (DOM-D8): il ritorno non prevede alcuna cancellazione. domainsToSuspend
// e' solo l'elenco dei collegamenti ATTIVI da portare 'suspended' (offline reversibile).
// Ripristinando il piano tornano attivabili senza perdita del collegamento ne della verifica.

import { type Entitlement } from '@/domain/billing/entitlement';

/** La porzione di un collegamento dominio che la decisione consuma: id + stato del ciclo di vita. */
export type DowngradeDomain = {
  readonly id: string;
  readonly status: string;
};

/** L'esito PURO della decisione. Nessun campo di cancellazione (DOM-D8): solo id da sospendere.
 *  Locale (return type di applyDomainDowngrade): i chiamanti lo consumano per struttura, non per nome. */
type DomainDowngradeOutcome = {
  readonly domainsToSuspend: readonly string[];
};

/**
 * Decide la sospensione morbida dei domini di un account, dato l'entitlement risolto server-side.
 * PURA: funzione di (entitlement, domains). custom_domain=true => nessuna sospensione (lista vuota);
 * custom_domain=false => sospendi SOLO i collegamenti 'active' (gli altri stati restano intatti).
 * MAI una cancellazione: solo transizioni active->suspended (reversibili). Gemella di applyDowngrade.
 *
 * @param entitlement l'entitlement gia' risolto (resolveEntitlement, Fase 1); decide via custom_domain.
 * @param domains i collegamenti dominio dell'account (id + status del ciclo di vita).
 */
export function applyDomainDowngrade(
  entitlement: Entitlement,
  domains: readonly DowngradeDomain[],
): DomainDowngradeOutcome {
  // Il piano include il dominio custom: nessuna azione (BIL-D7/DOM-D8).
  if (entitlement.limits.custom_domain) {
    return { domainsToSuspend: [] };
  }
  // Decadenza: solo gli 'active' vengono sospesi (sostiene l'idempotenza a valle in DOM-602:
  // dopo il primo giro non restano 'active', la seconda esecuzione non trova nulla da sospendere).
  const domainsToSuspend = domains
    .filter((d) => d.status === 'active')
    .map((d) => d.id);
  return { domainsToSuspend };
}

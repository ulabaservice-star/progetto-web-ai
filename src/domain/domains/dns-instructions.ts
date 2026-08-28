// DOM-131 (macrotask domain-dns, p5-custom-domains-fase2) — dominio PURO che deriva i record DNS
// attesi da un hostname normalizzato+classificato e da un target di piattaforma INIETTATO (valore dei
// record verso il provider, da env al call-site: A02:2025 — mai hardcoded qui, mai un segreto).
// Nessun DB/rete/DNS/orologio: puro sui suoi argomenti. La composizione coi record-challenge reali del
// provider (verification[] di addDomain, DOM-211) avviene nell'endpoint connect (domain-connect, R1).

import { parse } from 'tldts';

// Tipo di esito INTERNO (annotation di ritorno). NON esportato finché domain-connect/domain-ui non lo
// importano — evita un export orfano (dead-code nuovo), come i tipi di hostname.ts/companion.ts.
/** Record DNS che l'utente deve impostare presso il proprio provider. */
type DnsRecord = {
  readonly type: 'A' | 'ALIAS' | 'CNAME' | 'TXT';
  readonly name: string;
  readonly value: string;
};

// Un target IPv4 letterale => record 'A' (all'apex verso un IP); un hostname => 'ALIAS' (all'apex non
// e' ammesso un CNAME). E' "A o ALIAS secondo target" (DOM-131 DoD). IPv6/AAAA fuori scope (nessun AC).
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * Deriva i record DNS attesi per collegare un host GIA' normalizzato e classificato al target di
 * piattaforma iniettato. Puro/deterministico/ordinato: record primario, poi (se c'e' un token) il TXT.
 * - kind 'apex'      => { type:'A'|'ALIAS', name:'@', value:target } (A se target IPv4, ALIAS se hostname)
 * - kind 'subdomain' => { type:'CNAME', name:<etichetta>, value:target }
 * - token fornito    => aggiunge { type:'TXT', name:'_ulaba-verify', value:token }; assente => nessun TXT
 */
export function dnsInstructionsFor(
  normalized: string,
  kind: 'apex' | 'subdomain',
  target: string,
  token?: string,
): readonly DnsRecord[] {
  const primary: DnsRecord =
    kind === 'apex'
      ? { type: IPV4.test(target) ? 'A' : 'ALIAS', name: '@', value: target }
      : { type: 'CNAME', name: parse(normalized).subdomain || normalized, value: target };
  return token ? [primary, { type: 'TXT', name: '_ulaba-verify', value: token }] : [primary];
}

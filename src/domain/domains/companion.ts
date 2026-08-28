// DOM-121 (macrotask domain-companion, p5-custom-domains-fase2) — parte PURA dell'auto-www
// (DOM-D11): dato un hostname normalizzato e la sua classe, deriva l'eventuale "companion" da
// collegare insieme. Collegare un apex implica offrire anche il www; un subdomain non genera
// companion (niente auto-apex, niente catene sorprendenti). Nessun DB/rete/orologio: puro.
// La creazione effettiva dei due collegamenti apex+www vive nell'endpoint (domain-connect, DOM-303),
// che ri-valida il companion via normalizeHostname/classifyHostname prima di collegarlo (security_note).

// Tipo di esito INTERNO (annotation di ritorno). NON esportato finché domain-connect (DOM-303) non lo
// importa — evita un export orfano (dead-code nuovo), come i tipi di hostname.ts.
/** Companion da collegare insieme all'host primario, oppure nessuno. */
type Companion = { readonly hostname: string; readonly kind: 'subdomain' } | null;

/**
 * Deriva il companion auto-www di un host GIA' normalizzato e classificato. Puro: dipende solo dagli
 * argomenti (nessun orologio/DB/rete).
 * - kind 'apex'      => { hostname: 'www.<apex>', kind: 'subdomain' } (companion www)
 * - kind 'subdomain' => null (nessun companion; nessun auto-apex)
 */
export function companionHostname(normalized: string, kind: 'apex' | 'subdomain'): Companion {
  if (kind !== 'apex') return null;
  return { hostname: 'www.' + normalized, kind: 'subdomain' } as const;
}

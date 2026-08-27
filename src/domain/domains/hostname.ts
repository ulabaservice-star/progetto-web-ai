// DOM-111/112 (macrotask domain-hostname, p5-custom-domains-fase2) — dominio PURO che rende
// sicuro un hostname grezzo, in due passi: normalizeHostname (forma canonica) e classifyHostname
// (apex/subdomain + reserved). Nessun DB/rete/DNS/orologio: pure sui loro argomenti.
//  • A05:2025 — validazione al confine: l'hostname non fidato e' reso canonico server-side, cosi'
//    l'output e' sicuro per query esatte e per la resa (escaping a valle).
//  • A01:2025 — anti-hijack (DOM-D7): i reserved-domains (piattaforma + vercel.app + localhost) e i
//    non-FQDN sono respinti nel dominio puro, PRIMA di qualunque scrittura o chiamata al provider.
// Base per endpoint, DNS e routing (domain-connect, domain-dns, domain-routing).

import { domainToASCII } from 'node:url';
import { parse } from 'tldts';

// Tipi di esito interni: usati come annotation di ritorno. NON esportati finché un consumatore
// reale (domain-connect / domain-routing) non li importa — evita un export orfano (dead-code nuovo).
/** Esito di normalizeHostname: forma canonica o rifiuto di FORMA. */
type NormalizeResult =
  | { readonly ok: true; readonly normalized: string }
  | { readonly ok: false; readonly reason: 'invalid_format' };

/** Esito di classifyHostname: tipo del collegabile o rifiuto reserved. */
type ClassifyResult =
  | { readonly ok: true; readonly kind: 'apex' | 'subdomain' }
  | { readonly ok: false; readonly reason: 'reserved' };

// Caratteri mai ammessi in un hostname grezzo (porta `:`, path `/`, query `?`, fragment `#`,
// wildcard `*`, spazi, underscore, backslash, userinfo `@`): la loro presenza — quando NON fanno
// parte di uno schema URL gia' rimosso — e' forma illegale (DOM-111 DoD).
const ILLEGAL_HOST_CHARS = /[\s/?#:*_\\@]/;

// Forma FQDN sintattica (post-punycode, ASCII): ≥2 label, ogni label 1–63 caratteri
// alfanumerici/trattino senza trattino iniziale/finale, TLD finale alfabetico (≥2) oppure IDN-TLD
// punycode (xn--…). E' validazione di FORMA, non appartenenza alla Public Suffix List (quella e' di
// classifyHostname). Un input senza TLD (`iltuobar`) non ha il punto finale => non matcha => rifiutato.
const FQDN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+([a-z]{2,}|xn--[a-z0-9-]{2,})$/;

/**
 * Porta un hostname grezzo a forma canonica o lo rifiuta per FORMA. Puro: dipende solo da `raw`.
 * - trim + lowercase, rimozione schema http(s)://; con schema, path/porta/userinfo dell'URL scartati;
 * - IDN → punycode (domainToASCII);
 * - rifiuto di porta/path/query/wildcard/spazi/underscore e di non-FQDN => { ok:false, 'invalid_format' }.
 */
export function normalizeHostname(raw: string): NormalizeResult {
  const invalid = { ok: false, reason: 'invalid_format' } as const;
  if (typeof raw !== 'string') return invalid;

  let s = raw.trim();

  // Schema URL esplicito: e' un URL, non un hostname grezzo => estrai l'authority scartando ciò
  // che nell'URL e' legittimamente separato (path/query/fragment, porta, userinfo).
  if (/^https?:\/\//i.test(s)) {
    s = s.replace(/^https?:\/\//i, '');
    s = s.split(/[/?#]/, 1)[0]; // via path/query/fragment
    s = s.split(':', 1)[0]; // via porta
    s = s.split('@').pop() ?? ''; // via userinfo
  }

  s = s.toLowerCase().replace(/\.$/, ''); // case-fold + rimozione trailing dot

  if (s === '' || ILLEGAL_HOST_CHARS.test(s)) return invalid;

  const ascii = domainToASCII(s); // IDN → punycode; '' su input non convertibile
  if (ascii === '' || !FQDN.test(ascii)) return invalid;

  return { ok: true, normalized: ascii } as const;
}

// Reserved-domains di piattaforma non collegabili (DOM-D7): match esatto o sottodominio. Costante
// INTERNA (default iniettabile del parametro `reserved`); si esporterà quando un consumatore la userà.
const RESERVED_DOMAINS: readonly string[] = ['ulaba.net', 'vercel.app', 'localhost'];

/**
 * Classifica un hostname GIA' normalizzato come apex (eTLD+1 registrabile) o subdomain, e respinge i
 * reserved-domains (match esatto o sottodominio) e i non-FQDN con reason 'reserved'. Puro: dipende
 * solo dagli argomenti — tldts usa la Public Suffix List bundlata in memoria (eTLD+1 corretto anche
 * su TLD multi-livello tipo .co.uk / .com.br), nessuna rete/DNS/orologio.
 */
export function classifyHostname(
  normalized: string,
  reserved: readonly string[] = RESERVED_DOMAINS,
): ClassifyResult {
  const reservedResult = { ok: false, reason: 'reserved' } as const;

  for (const r of reserved) {
    if (normalized === r || normalized.endsWith('.' + r)) return reservedResult;
  }

  const parsed = parse(normalized);
  // Non-FQDN / senza public suffix ICANN valido => non collegabile (DOM-112 DoD).
  if (!parsed.domain || !parsed.isIcann) return reservedResult;

  const kind = parsed.subdomain ? 'subdomain' : 'apex';
  return { ok: true, kind } as const;
}

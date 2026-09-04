// PUB-331 (macrotask seo-jsonld, p6a-public-surface) — I BUILDER PURI del JSON-LD della LANDING:
// `Organization` e `WebSite` di schema.org. Dominio PURO: nessun accesso a env, nessun I/O, nessuna
// costruzione di URL dall'Host della richiesta. La base URL della landing e il nome brand arrivano
// GIA' RISOLTI come argomenti dalla home (che legge getLandingBaseUrl/getBrandName): il dominio non
// sceglie l'origine (A05:2025 host-injection/open-redirect), la riceve.
//
// PERCHE' DUE BLOCCHI. `Organization` descrive l'ENTITA' (il brand Ulaba/Belora, `url` = radice della
// landing); `WebSite` descrive il SITO (stesso nome e stessa `url`). Sono i due tipi che i motori di
// ricerca leggono dalla home per il knowledge panel e per il nome del sito.
//
// LA DIFESA ANTI-XSS NON E' QUI. I valori restano testo (il nome brand e' config pubblica, ma il
// contratto e' lo stesso del brief non fidato): l'escaping che rende irrappresentabile la chiusura di
// `<script>` sta in `serializeJsonLdSafe` (@/domain/generation/jsonld), applicato dalla home al
// momento del montaggio come figlio testuale del <script type="application/ld+json"> — mai innerHTML
// grezzo, mai serializzazione artigianale (P6A-D8, riuso dell'unico serializzatore sicuro).

/**
 * L'oggetto `Organization` di schema.org: l'ENTITA' brand. `@context`/`@type` costanti; `name` e `url`
 * sono i due argomenti (il nome brand e la base landing gia' risolti dalla home).
 */
export type OrganizationJsonLd = {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'Organization';
  readonly name: string;
  readonly url: string;
};

/**
 * L'oggetto `WebSite` di schema.org: il SITO. Stesso `name` e stessa `url` dell'Organization (la home
 * e' la radice della landing).
 */
export type WebSiteJsonLd = {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'WebSite';
  readonly name: string;
  readonly url: string;
};

/**
 * Costruisce l'oggetto `Organization`. Puro: `baseUrl` (base landing, es. https://ulaba.net) e `name`
 * (nome brand) sono argomenti; nessuna lettura di env, nessuna composizione di URL dalla richiesta.
 */
export function buildOrganizationJsonLd(baseUrl: string, name: string): OrganizationJsonLd {
  return { '@context': 'https://schema.org', '@type': 'Organization', name, url: baseUrl };
}

/**
 * Costruisce l'oggetto `WebSite`. Puro, stesso contratto di `buildOrganizationJsonLd`: `name` e `url`
 * dagli argomenti, il resto costante.
 */
export function buildWebSiteJsonLd(baseUrl: string, name: string): WebSiteJsonLd {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name, url: baseUrl };
}

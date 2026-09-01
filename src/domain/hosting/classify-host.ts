// PUB-101 (macrotask host-classify, p6a-public-surface) — classifyRequestHost PURO.
// La TERZA categoria di Host (landing) accanto ad app e custom (P6A-D1/D2): decide QUALE superficie
// serve un Host, a partire dai SOLI argomenti. appHost e landingHost li passa il chiamante (il
// middleware, da NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_LANDING_URL): qui NON si legge process.env.
//   - 'app'     = appHost esatto o un suo sottodominio (apex + preview.*);
//   - 'landing' = landingHost esatto o il suo companion 'www.' + landingHost;
//   - 'custom'  = ogni altro Host (dominio cliente collegato, gestito altrove).
// FAIL-SAFE (P6A-D2): se landingHost e' null (config assente) NESSUN Host e' mai 'landing' — non si
// serve/reindirizza mai la landing per un Host arbitrario. PURA: nessun process.env / next-headers /
// I/O / orologio; l'Host in ingresso e' gia' minuscolo e senza porta (lo normalizza il middleware).

export type RequestHostCategory = 'app' | 'landing' | 'custom';

/** appHost/landingHost risolti dal chiamante da env; null quando la relativa config e' assente. */
export interface HostClassifyConfig {
  readonly appHost: string | null;
  readonly landingHost: string | null;
}

/** Classifica l'Host (gia' minuscolo, senza porta) nella superficie che lo serve. */
export function classifyRequestHost(host: string, config: HostClassifyConfig): RequestHostCategory {
  const { appHost, landingHost } = config;
  if (appHost !== null && (host === appHost || host.endsWith('.' + appHost))) return 'app';
  if (landingHost !== null && (host === landingHost || host === 'www.' + landingHost)) return 'landing';
  return 'custom';
}

import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { getUserFromRequest } from './data/supabase-ssr';
import { readSiteSlugForHost } from './data/public-domain';

// Middleware UNICO: compone il routing per locale di next-intl (T-080) con la
// guardia auth di route (T-041). Il routing di locale NON viene mai
// corto-circuitato: la guardia intercetta solo le route protette senza sessione,
// tutto il resto prosegue nel normale flusso next-intl (es. /es/dashboard non
// autenticato → /es/login, non /it/login).
const handleI18n = createMiddleware(routing);

// Route protette: /{locale}/dashboard, /{locale}/onboarding (T-150), /{locale}/generate
// (T-230), /{locale}/preview (T-235) e /{locale}/editor (T-311), con ogni sotto-route. Il locale
// è vincolato ai locali supportati (unica sorgente di verità: routing.locales), mai a input libero.
// Gli endpoint /api (turno chat di T-150, POST /api/generate di T-230) vivono sotto /api,
// che il matcher esclude del tutto: la loro guardia è nel route handler stesso (401/403 JSON,
// non un 307 verso il login, che un fetch non potrebbe leggere).
// PROMEMORIA (T-230/T-235/T-311, come per onboarding): il matcher esclude ogni pathname con un
// punto, quindi per un siteId come 'a.b' questa guardia non parte affatto — la difesa resta la
// guardia server-side nella pagina (getUser in ./guard). Non si affida nulla al middleware.
// /editor entra qui per PARITÀ di hardening con /preview (T-311, D4): la guardia-pagina resta
// comunque l'unica difesa per un siteId con un punto, ma /editor non deve essere pubblica quando
// il pathname è "pulito".
const PROTECTED_SEGMENTS = ['dashboard', 'onboarding', 'generate', 'preview', 'editor'] as const;
// ESPORTATA per l'audit degli oracoli (tests/auth-middleware.test.ts): e' la regex REALE che
// decide se una rotta e' GUARDATA — derivata da PROTECTED_SEGMENTS. `config.matcher` dice solo
// SE il middleware gira (catch-all), non se protegge, quindi la membership di /generate e
// /preview va asserita contro QUESTA, cosi' togliere un segmento fa cadere anche l'audit.
export const protectedRoute = new RegExp(
  `^/(${routing.locales.join('|')})/(?:${PROTECTED_SEGMENTS.join('|')})(?:/.*)?$`,
);

// P4-D4 — /s/<slug> è la rotta pubblica STANDALONE, servita FUORI dal segmento
// [locale]. 's' è uno slug RISERVATO, MAI un locale: il routing per locale di
// next-intl NON deve toccare questo prefisso (niente redirect da Accept-Language,
// niente prefisso /it|/es aggiunto). Cattura ESATTAMENTE `/s` e i suoi sotto-path
// (`/s/...`), non un path qualsiasi che inizia per 's' (es. /support, /services).
// ESPORTATA per rendere OSSERVABILE la decisione nei test (T-406), come protectedRoute.
export const PUBLIC_STANDALONE_PREFIX = '/s';
export const isPublicStandalonePath = (pathname: string): boolean =>
  pathname === PUBLIC_STANDALONE_PREFIX ||
  pathname.startsWith(`${PUBLIC_STANDALONE_PREFIX}/`);

// Flusso di PIATTAFORMA (invariato da P4-D4/T-041): esclusione /s/*, guardia auth sulle route
// protette, altrimenti routing di locale next-intl. Estratto come funzione perché il fallback
// dell'host-routing (host custom NON risolto) lo riusa senza duplicare il comportamento.
function platformFlow(
  request: NextRequest,
  pathname: string,
): NextResponse | Promise<NextResponse> {
  // P4-D4: /s/* è pubblica e standalone → ESCLUSA dal routing per locale
  // (handleI18n NON viene invocato: nessun prefisso di locale, nessuna
  // negoziazione Accept-Language, nessun rewrite verso segmenti autenticati).
  // Il middleware CONTINUA comunque a girare su questo path (NextResponse.next())
  // per non perdere le protezioni globali: si esclude SOLO il locale, non la
  // sicurezza (A05:2025). Va PRIMA della guardia auth: /s/* non tocca /{locale}.
  if (isPublicStandalonePath(pathname)) {
    return NextResponse.next();
  }
  const match = pathname.match(protectedRoute);
  if (match) {
    return guardProtectedRoute(request, match[1]);
  }
  // Route pubbliche (login, signup, callback, home, …) e asset esclusi dal
  // matcher: nessuna guardia, prosegue il routing di locale.
  return handleI18n(request);
}

// DOM-402 — host di PIATTAFORMA (allowlist da env): l'apex dell'app (NEXT_PUBLIC_APP_URL) e i suoi
// sottodomini, piu' gli host tecnici locali/preview. Tutto il resto e' un dominio CUSTOM candidato
// all'host-routing. FAIL-SAFE: se NEXT_PUBLIC_APP_URL manca, ogni host e' trattato come piattaforma
// (nessun rewrite host-custom): mai servire un sito per un Host arbitrario in assenza di config.
function platformAppHost(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;
  try {
    return new URL(appUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isPlatformHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;
  const appHost = platformAppHost();
  if (!appHost) return true; // env assente => fail-safe: tutto piattaforma
  return host === appHost || host.endsWith('.' + appHost);
}

// L'Host della richiesta, minuscolo e senza porta; null se assente. Un Host di piattaforma => null
// (il chiamante prosegue nel flusso di piattaforma senza toccare il DB).
function customHostname(request: NextRequest): string | null {
  const raw = request.headers.get('host');
  if (!raw) return null;
  const host = raw.toLowerCase().split(':')[0];
  return isPlatformHost(host) ? null : host;
}

// Path riservati che NON vanno mai riscritti verso /s/<slug> (no ricorsione del rewrite): il
// prefisso pubblico standalone /s e le API /api.
function isReservedRewritePath(pathname: string): boolean {
  return (
    isPublicStandalonePath(pathname) ||
    pathname === '/api' ||
    pathname.startsWith('/api/')
  );
}

// DOM-402 — un Host custom risolto a uno slug ATTIVO viene servito come il sito standalone:
// rewrite INTERNO verso /s/<slug> (nessun prefisso di locale, querystring preservata). Host non
// risolto => degrada nel flusso di piattaforma (nessun sito servito, fail-closed A01:2025 contro
// host-spoofing verso siti non collegati).
async function routeCustomHost(
  request: NextRequest,
  host: string,
  pathname: string,
): Promise<NextResponse> {
  const resolved = await readSiteSlugForHost(host);
  if (!resolved) {
    return platformFlow(request, pathname);
  }
  const url = request.nextUrl.clone();
  url.pathname = `/s/${resolved.public_slug}`;
  return NextResponse.rewrite(url);
}

// La funzione NON è async nel percorso di piattaforma: per le route non protette ritorna in modo
// SINCRONO la response di next-intl (preserva il comportamento verificato in T-080). Solo per le
// route protette delega alla guardia asincrona, che legge la sessione server-side. Il percorso
// host-custom (DOM-402) è invece asincrono (lookup DB anon).
export default function middleware(
  request: NextRequest,
): NextResponse | Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  // DOM-402: un Host custom (non-piattaforma) su un path non riservato => tentativo di host-routing
  // PRIMA del locale e della guardia auth. Gli host di piattaforma saltano del tutto la lookup DB.
  const customHost = customHostname(request);
  if (customHost && !isReservedRewritePath(pathname)) {
    return routeCustomHost(request, customHost, pathname);
  }
  return platformFlow(request, pathname);
}

// Guardia server-side (A01:2025): nega l'accesso alle route protette senza
// identità valida. getUserFromRequest è isolato in @/data/supabase-ssr (anon +
// cookie, RLS attiva) ed è mockabile nei test.
async function guardProtectedRoute(
  request: NextRequest,
  locale: string,
): Promise<NextResponse> {
  const user = await getUserFromRequest(request);
  if (!user) {
    // Destinazione FISSA e interna (/{locale}/login), mai da input utente
    // (anti open-redirect). Il locale corrente è preservato.
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl, 307);
  }
  // Utente valido: prosegue nel flusso di locale next-intl (NextResponse.next).
  return handleI18n(request);
}

export const config = {
  // Esclude /api, /_next, /_vercel e ogni percorso con estensione (file statici,
  // es. favicon.ico): né il routing di locale né la guardia vengono applicati lì.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

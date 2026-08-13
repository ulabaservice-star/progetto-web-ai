// DE-103 (macrotask visual-skin) — I FONT DEL SITO GENERATO, self-host via next/font. Prima di
// questo modulo i temi (T-211) dichiaravano stack come 'Fraunces, Georgia, serif' ma nessun font
// veniva caricato: il browser ricadeva sul primo fallback di sistema (Georgia). Qui le famiglie
// PRIMARIE del catalogo — la 1a voce di ogni stack heading/body dei cinque temi — vengono caricate
// self-host dal compilatore Next, e a ciascuna resta associata una variabile CSS (--font-*) che il
// render applica alla radice (SiteView).
//
// LA CSP DI /s/ RESTA INTATTA (security_notes DE-103): next/font in modalita' self-host non emette
// alcun <link> a fonts.googleapis.com ne scarica da fonts.gstatic.com — i .woff2 sono serviti da
// 'self' (/_next/static/media). Non si allarga font-src oltre 'self' (deploy-hardening T-3).
//
// PERCHE' A LIVELLO DI MODULO. next/font esige che ogni loader sia chiamato in un const di modulo
// con opzioni LITERALI: e' cosi' che il compilatore Next lo trasforma, a build, in font self-host +
// la classe che lega la variabile. display:'swap' e le metriche di fallback (adjustFontFallback,
// attivo di default) contengono il CLS senza dipendere da una rete esterna.

import {
  Fraunces,
  Source_Sans_3,
  Space_Grotesk,
  Inter,
  Barlow_Condensed,
  Barlow,
  Libre_Baskerville,
  Karla,
  Poppins,
  Nunito_Sans,
  Playfair_Display,
} from 'next/font/google';

// Le famiglie primarie di heading/body del catalogo (la display didone segue piu' sotto, DE11-102).
// Le famiglie VARIABILI non chiedono un peso; quelle NON variabili (Barlow Condensed, Barlow,
// Poppins) lo esigono per tipo — 400/700 coprono corpo e titolo. Ogni `variable` e' un literal
// (richiesto dal compilatore next/font).
const fraunces = Fraunces({ subsets: ['latin'], display: 'swap', variable: '--font-fraunces' });
const sourceSans3 = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-sans-3',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-barlow-condensed',
  weight: ['400', '700'],
});
const barlow = Barlow({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-barlow',
  weight: ['400', '700'],
});
const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-libre-baskerville',
});
const karla = Karla({ subsets: ['latin'], display: 'swap', variable: '--font-karla' });
const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '700'],
});
const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito-sans',
});
// DE11-102 — la serif DIDONE dei DISPLAY editoriali (titoli/prezzi/citazioni), CONDIVISA da tutti i
// temi: e' la 1a voce dello stack `display` di ogni tema (T-211, cresciuto in DE11-101:
// 'Playfair Display, Georgia, serif'). Self-host come le altre — nessun <link>/@import esterno, la
// CSP font-src 'self' di /s/ resta intatta (deploy-hardening T-3). E' VARIABILE (asse wght), quindi
// non chiede un peso; il fallback serif del tema (Georgia, serif) resta lo stack se il font non carica.
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair-display',
});

/**
 * Le classi-variabile di TUTTE le istanze, unite da spazio. Applicata alla radice del render
 * definisce ogni --font-* nello STESSO scope che porta siteThemeStyle, cosi' le custom property si
 * risolvono fra loro (il tema sceglie quale --font-* usare in --site-font-heading/body).
 */
export const SITE_FONT_VARIABLE_CLASSNAME = [
  fraunces.variable,
  sourceSans3.variable,
  spaceGrotesk.variable,
  inter.variable,
  barlowCondensed.variable,
  barlow.variable,
  libreBaskerville.variable,
  karla.variable,
  poppins.variable,
  nunitoSans.variable,
  playfairDisplay.variable,
].join(' ');

/**
 * Il NOME della famiglia primaria (la 1a voce dello stack di un tema, es. 'Fraunces') mappato al
 * nome della sua variabile CSS (es. '--font-fraunces'). theme-style.ts la usa per anteporre
 * var(--font-x) allo stack del tema. Le chiavi sono i nomi-di-display CON gli spazi, quelli che
 * compaiono davvero negli stack di THEMES (es. 'Source Sans 3', non 'Source_Sans_3').
 */
export const FONT_VAR_BY_FAMILY: Record<string, string> = {
  Fraunces: '--font-fraunces',
  'Source Sans 3': '--font-source-sans-3',
  'Space Grotesk': '--font-space-grotesk',
  Inter: '--font-inter',
  'Barlow Condensed': '--font-barlow-condensed',
  Barlow: '--font-barlow',
  'Libre Baskerville': '--font-libre-baskerville',
  Karla: '--font-karla',
  Poppins: '--font-poppins',
  'Nunito Sans': '--font-nunito-sans',
  // DE11-102 — la famiglia display: theme-style.fontStackWithVariable antepone var(--font-playfair-display)
  // allo stack `display` del tema, cosi' --site-font-display carica il self-host PRIMA del fallback serif.
  'Playfair Display': '--font-playfair-display',
};

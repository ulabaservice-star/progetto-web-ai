// Infrastruttura di test (la stessa idea dell'alias 'server-only' in vitest.config.ts):
// next/font/google e' interamente una TRASFORMAZIONE del compilatore Next. A runtime il modulo
// e' VUOTO — i named export (Fraunces, Inter, ...) sono `undefined` — perche' la vera resa
// (font self-host + la classe che lega la variabile CSS) la produce il loader di build, non un
// modulo eseguibile. Sotto vitest quella trasformazione non gira: chiamare i loader a livello di
// modulo in src/ui/site/site-fonts.ts lancerebbe "Fraunces is not a function" e romperebbe ogni
// test che rende SiteView. Questo doppio restituisce la STESSA FORMA del vero next/font
// (className/variable/style), cosi' i test di render non si rompono. L'EFFETTO reale dei font
// (self-host, font-family risolta, nessuna richiesta esterna) e' provato dall'e2e in un browser
// vero — dove gira il compilatore Next — non da questo doppio.

type FontLoaderOptions = { readonly variable?: string };
type LoadedFont = {
  readonly className: string;
  readonly variable: string;
  readonly style: { readonly fontFamily: string };
};

/** Un finto loader deterministico: la sua `.variable` deriva dalla variabile CSS richiesta. */
function fontLoader(family: string): (options?: FontLoaderOptions) => LoadedFont {
  return (options) => ({
    className: `stub-className-${family}`,
    variable: options?.variable ? `stub-var-${options.variable}` : `stub-var-${family}`,
    style: { fontFamily: family },
  });
}

export const Fraunces = fontLoader('Fraunces');
export const Source_Sans_3 = fontLoader('Source_Sans_3');
export const Space_Grotesk = fontLoader('Space_Grotesk');
export const Inter = fontLoader('Inter');
export const Barlow_Condensed = fontLoader('Barlow_Condensed');
export const Barlow = fontLoader('Barlow');
export const Libre_Baskerville = fontLoader('Libre_Baskerville');
export const Karla = fontLoader('Karla');
export const Poppins = fontLoader('Poppins');
export const Nunito_Sans = fontLoader('Nunito_Sans');

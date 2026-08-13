// T-231 (macrotask generation-ui, P2) — L'UNICO PUNTO in cui un SiteTheme (T-211) diventa
// stile applicabile: le sue tabelle (colori, tipografia, spaziature, raggi) proiettate in
// CSS custom properties (`--site-...`) impostate alla RADICE del render (SitePageView /
// SiteView). Da qui in poi i componenti dei blocchi riferiscono `var(--site-...)` e non
// leggono mai un valore del tema direttamente: e' cosi' che il divieto di colore letterale
// (AC-231-4) e' STRUTTURALE e non sorvegliato blocco per blocco. `theme.colors.x` compare
// SOLO qui, e `var(--site-...)` non e' un colore letterale — non c'e' notazione esadecimale,
// ne rgb, ne hsl in nessun file di src/ui/site/**.
//
// PERCHE' QUI E NON UN IMPORT DI src/ui/theme/tokens (P2-D14): i token del BUILDER sono
// riferimenti a variabili decise a runtime dal pannello; il sito del cliente e' un artefatto
// CONGELATO e non puo' poggiarvi. La regola ESLint di T-211 vieta quell'import da
// src/ui/site/**; questo modulo non ne ha bisogno, perche' i valori arrivano dal SiteTheme
// passato per prop, mai dal design system dell'app.

import type { CSSProperties } from 'react';
import type { SiteTheme } from '@/domain/generation/themes';
import { FONT_VAR_BY_FAMILY } from '@/ui/site/site-fonts';

/**
 * DE-103 — antepone allo stack tipografico del tema la variabile next/font della sua famiglia
 * PRIMARIA, quando questa e' nel catalogo self-host: il valore diventa `var(--font-x), <stack del
 * tema>`, cioe' il font caricato PRIMA e lo stack del tema come FALLBACK. La famiglia primaria si
 * estrae con uno split su ',' + trim (deterministico). Nessuna regressione se una famiglia non
 * fosse mappata: resta lo stack grezzo del tema.
 */
function fontStackWithVariable(stack: string): string {
  const primary = stack.split(',')[0].trim();
  const variable = FONT_VAR_BY_FAMILY[primary];
  return variable ? `var(${variable}), ${stack}` : stack;
}

/**
 * Le custom property del sito, derivate TOTALMENTE dalle tabelle del tema: un token nuovo in
 * SiteTheme diventa una variabile senza toccare questa funzione. Gli underscore dei nomi di
 * token (`text_muted`, `accent_contrast`) diventano trattini nella variabile
 * (`--site-color-text-muted`), cosi' i componenti riferiscono nomi uniformemente a trattini.
 */
export function siteThemeStyle(theme: SiteTheme): CSSProperties {
  const style: Record<string, string> = {};

  for (const [token, value] of Object.entries(theme.colors)) {
    style[`--site-color-${token.replace(/_/g, '-')}`] = value;
  }
  style['--site-font-heading'] = fontStackWithVariable(theme.typography.font_family.heading);
  style['--site-font-body'] = fontStackWithVariable(theme.typography.font_family.body);
  // DE11-101 — la serif didone dei DISPLAY editoriali, con lo stesso trattamento var(--font-x) +
  // fallback delle altre due famiglie: finche' DE11-102 non la self-hosta, resta lo stack grezzo col
  // fallback serif del tema (mai un sito senza titoli).
  style['--site-font-display'] = fontStackWithVariable(theme.typography.font_family.display);
  // Il tracking esteso delle label/eyebrow uppercase e il commutatore delle cifre tabulari (DNA
  // ristorazione): valori-dato del tema, proiettati come custom property che DE11-103 consumera'. Il
  // numeric e' 'tabular-nums'|'normal' — l'unica forma che `font-variant-numeric` accetta dal flag.
  style['--site-tracking-label'] = theme.typography.tracking.label;
  style['--site-numeric-figure'] = theme.typography.tabular_nums ? 'tabular-nums' : 'normal';
  for (const [step, value] of Object.entries(theme.typography.scale)) {
    style[`--site-scale-${step}`] = value;
  }
  for (const [step, value] of Object.entries(theme.spacing)) {
    style[`--site-space-${step}`] = value;
  }
  for (const [step, value] of Object.entries(theme.radius)) {
    style[`--site-radius-${step}`] = value;
  }

  // Le chiavi `--site-*` non fanno parte di CSSProperties per tipo: il cast e' l'idioma di
  // React per le custom property, e i valori restano stringhe del tema, mai letterali.
  return style as CSSProperties;
}

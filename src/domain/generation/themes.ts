// DV2-101 (macrotask `foundation`, design-engine-v2) — I TEMI DEL SITO GENERATO, ora tradotti dal
// design system PROFESSIONALE di Claude Design (progetto "Design System Ristoranti Italia"). Sono i
// colori/tipografia/spaziature/raggi che appartengono al SITO DEL CLIENTE, non al chrome del builder.
// Dominio PURO: nessun accesso al DB, nessun I/O, nessun side effect, nessun import.
//
// PERCHE' VIVONO QUI E NON IN src/ui/theme/ (P2-D14): il design system del PANNELLO cambia col
// pannello e i suoi colori sono riferimenti `var(--color-...)` decisi a runtime; un tema del sito
// generato e' un ARTEFATTO CONGELATO, scelto una volta e pubblicato, e non puo' poggiare su quei
// riferimenti. Per questo i valori qui sono PROPRI — esadecimali e `color-mix()` — e non c'e' alcun
// `var(--...)`. La separazione e' imposta da una regola ESLint (no-restricted-imports) che vieta a
// src/ui/site/** di importare src/ui/theme/tokens (verificata da generation-theme-isolation.test.ts).
//
// GLI ID NASCONO VERSIONATI ('nome-kebab@N'): il documento congelato registra `theme_id` in questa
// forma e un ritocco futuro a un tema non deve riscrivere un sito gia' scelto (si passa a '@2').
//
// DS-V2-D1 — le 23 PALETTE di Claude Design sostituiscono gli 8 temi "poveri" di v1.1 (gated come
// amatoriali al gate visivo). La forma `SiteTheme` (Record TOTALE) resta l'interfaccia stabile; il
// vocabolario dei token colore si ESTENDE ai 21 semantici di Claude Design. In Claude Design la
// tipografia/spaziatura/raggi sono GLOBALI (token condivisi, non per-palette): la varieta' viene dalla
// palette + dalla struttura, non da una scala tipografica diversa per tema. I valori-colore sono
// COPIATI ESATTI dai file `palettes/<nome>.css` del catalogo (inclusi i `color-mix()`).
//
// RETRO-COMPAT (DS-V2-D1) — gli id storici (es. 'sole-mediterraneo@1') restano RISOLVIBILI via
// THEME_ID_ALIASES: `recipes.ts` li cita per stringa e i documenti P4 gia' congelati li registrano in
// `theme_id`; l'alias li rimappa alla paletta CD piu' vicina (nessun clone silenzioso, nessuna rottura).
//
// LO STILE NON E' ORACOLABILE (L-COL-006): i commenti di carattere ("terracotta", "vinaccia") dicono a
// chi si rivolge la paletta, non asseriscono che sia bella. I test provano che il layer esiste, che le
// chiavi sono le stesse ovunque, che le palette hanno i token semantici e che nessun valore e' un
// riferimento del builder.

/**
 * I TOKEN DI COLORE, gli stessi per tutti i temi. Sono SEMANTICI (non descrittivi): e' cio' che
 * permette al rendering di essere scritto una volta per tutti i temi.
 */
type ColorToken =
  // I 21 token SEMANTICI di Claude Design (DS-V2-D1) — l'interfaccia colore primaria dei blocchi v2.
  | 'surface_page' | 'surface_alt' | 'surface_card' | 'surface_dark' | 'surface_dark_raise'
  | 'text_heading' | 'text_body' | 'text_muted'
  | 'on_dark' | 'on_dark_70' | 'on_dark_line'
  | 'line' | 'line_strong'
  | 'accent' | 'accent_hover' | 'accent_contrast'
  | 'accent_2' | 'accent_2_deep' | 'accent_2_contrast'
  | 'eyebrow_color' | 'eyebrow_on_dark'
  // Token LEGACY (P2/DE11) mantenuti DERIVATI per retro-compat coi blocchi non ancora riscritti
  // (Hero/Offerte/corpo dei macrotask 02-04) e coi loro test: transitori, spariranno quando quei
  // blocchi useranno i token CD. Sono DERIVATI dai semantici CD in `cdColors()`, mai scritti a mano.
  | 'background' | 'surface' | 'text' | 'border'
  | 'crema' | 'panna' | 'rosso_mattone' | 'oro' | 'verde_basilico' | 'ink';

/** I ruoli tipografici: titoli, corpo, e il `display` (serif didone editoriale di Claude Design). */
type FontRole = 'heading' | 'body' | 'display';

/** Il tracking (letter-spacing) memorizzato dal tema. `label` = tracking esteso delle eyebrow uppercase. */
type TrackingToken = 'label';

/** I passi della scala tipografica, dal piu' piccolo al piu' grande. */
type TypeScaleStep = 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';

/** I passi del ritmo verticale e orizzontale, dal piu' stretto al piu' largo. */
type SpacingStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** I raggi di bordo. `pill` e' il raggio "completo" dei bottoni a pillola. */
type RadiusStep = 'sm' | 'md' | 'lg' | 'pill';

/**
 * UN TEMA DEL SITO GENERATO. Il tipo e' TOTALE sulle chiavi: ogni gruppo e' un `Record` sulla propria
 * unione chiusa di token, quindi un tema a cui manchi anche un solo token NON COMPILA. Il rendering
 * legge i token per nome senza chiedersi se il tema li ha: un token mancante sarebbe un `undefined` in
 * una proprieta' CSS, cioe' un difetto invisibile finche' non lo vede un cliente.
 */
export type SiteTheme = {
  readonly id: string;
  readonly colors: Readonly<Record<ColorToken, string>>;
  readonly typography: {
    readonly font_family: Readonly<Record<FontRole, string>>;
    readonly scale: Readonly<Record<TypeScaleStep, string>>;
    readonly tracking: Readonly<Record<TrackingToken, string>>;
    readonly tabular_nums: boolean;
    readonly h1_italic_default: boolean;
  };
  readonly spacing: Readonly<Record<SpacingStep, string>>;
  readonly radius: Readonly<Record<RadiusStep, string>>;
};

/**
 * I 21 token semantici di una paletta di Claude Design, così come vivono in `palettes/<nome>.css`.
 * `cdColors` li completa coi token legacy DERIVATI, così ogni tema resta un Record TOTALE su ColorToken.
 */
type CdPalette = {
  readonly surface_page: string;
  readonly surface_alt: string;
  readonly surface_card: string;
  readonly surface_dark: string;
  readonly surface_dark_raise: string;
  readonly text_heading: string;
  readonly text_body: string;
  readonly text_muted: string;
  readonly on_dark: string;
  readonly on_dark_70: string;
  readonly on_dark_line: string;
  readonly line: string;
  readonly line_strong: string;
  readonly accent: string;
  readonly accent_hover: string;
  readonly accent_contrast: string;
  readonly accent_2: string;
  readonly accent_2_deep: string;
  readonly accent_2_contrast: string;
  readonly eyebrow_color: string;
  readonly eyebrow_on_dark: string;
};

/**
 * Completa i 21 token CD coi 10 token LEGACY, DERIVATI dai semantici (mai scritti a mano): così i
 * blocchi non ancora riscritti (che leggono `--site-color-background/surface/text/border/...`) e i loro
 * test restano verdi finché i macrotask 02-04 non passano ai token CD.
 */
function cdColors(c: CdPalette): Readonly<Record<ColorToken, string>> {
  return {
    ...c,
    background: c.surface_page,
    surface: c.surface_card,
    text: c.text_heading,
    border: c.line,
    crema: c.surface_alt,
    panna: c.surface_page,
    ink: c.text_heading,
    rosso_mattone: c.accent,
    oro: c.eyebrow_color,
    verde_basilico: c.accent_2,
  };
}

/**
 * Tipografia, spaziatura e raggi CONDIVISI da tutti i temi (in Claude Design sono token globali in
 * `tokens/typography.css` + `tokens/spacing.css`). Playfair Display (titoli/display) + Source Sans 3
 * (corpo); scala/spazi/raggi editoriali. La famiglia display e' self-host (site-fonts.ts).
 */
const CD_TYPOGRAPHY: SiteTheme['typography'] = {
  font_family: {
    // Nomi di famiglia SENZA virgolette: theme-style.fontStackWithVariable fa split(',')[0].trim() e
    // cerca la chiave in FONT_VAR_BY_FAMILY ('Playfair Display' / 'Source Sans 3'), entrambe self-host.
    heading: 'Playfair Display, Georgia, serif',
    body: 'Source Sans 3, Helvetica Neue, Arial, sans-serif',
    display: 'Playfair Display, Georgia, serif',
  },
  scale: {
    sm: '14px',
    base: '16.5px',
    lg: 'clamp(17px, 1.6vw, 20px)',
    xl: 'clamp(22px, 2.4vw, 27px)',
    '2xl': 'clamp(32px, 4.2vw, 50px)',
    '3xl': 'clamp(44px, 6vw, 78px)',
  },
  tracking: { label: '0.22em' },
  tabular_nums: true,
  h1_italic_default: false,
};
const CD_SPACING: SiteTheme['spacing'] = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '32px',
  xl: '48px',
  '2xl': '64px',
};
const CD_RADIUS: SiteTheme['radius'] = { sm: '5px', md: '10px', lg: '16px', pill: '999px' };

/**
 * I TEMI: le 23 palette coese di Claude Design (DS-V2-D1, ordine alfabetico, valori COPIATI ESATTI da
 * `palettes/<nome>.css`) PIU' 2 palette a FONDO NON-CREMA (DV2-505, ibrido B) in coda — una scura, una
 * fredda — per allargare lo spettro cromatico dei 5 mockup. Ognuna e' una "personalita'" di locale. Sono
 * dichiarate da noi e non inventate dal modello (P2-D1): la scelta del design e' manopole nostre, il
 * modello scrive solo prosa a runtime.
 */
export const THEMES: readonly SiteTheme[] = [
  {
    // Agriturismo toscano — girasole, sienna e cipresso.
    id: 'agriturismo-toscano@1',
    colors: cdColors({
      surface_page: '#FBF5E6', surface_alt: '#F3E8CF', surface_card: '#FFFDF3', surface_dark: '#262012',
      surface_dark_raise: 'color-mix(in srgb, #262012 86%, white)',
      text_heading: '#2B2415', text_body: 'color-mix(in srgb, #2B2415 80%, #FBF5E6)', text_muted: 'color-mix(in srgb, #2B2415 55%, #FBF5E6)',
      on_dark: '#F4E9CE', on_dark_70: 'color-mix(in srgb, #F4E9CE 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F4E9CE 18%, transparent)',
      line: 'color-mix(in srgb, #2B2415 14%, transparent)', line_strong: 'color-mix(in srgb, #2B2415 28%, transparent)',
      accent: '#B4652A', accent_hover: 'color-mix(in srgb, #B4652A 78%, black)', accent_contrast: '#FCF3E4',
      accent_2: '#4F5B2E', accent_2_deep: 'color-mix(in srgb, #4F5B2E 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#B18A2C', eyebrow_on_dark: '#E0C583',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Alpina elegante — ardesia e pino, tono freddo.
    id: 'alpina-elegante@1',
    colors: cdColors({
      surface_page: '#F6F7F4', surface_alt: '#E9ECE6', surface_card: '#FFFFFF', surface_dark: '#232A26',
      surface_dark_raise: 'color-mix(in srgb, #232A26 86%, white)',
      text_heading: '#252B27', text_body: 'color-mix(in srgb, #252B27 80%, #F6F7F4)', text_muted: 'color-mix(in srgb, #252B27 55%, #F6F7F4)',
      on_dark: '#ECEFE9', on_dark_70: 'color-mix(in srgb, #ECEFE9 72%, transparent)', on_dark_line: 'color-mix(in srgb, #ECEFE9 18%, transparent)',
      line: 'color-mix(in srgb, #252B27 14%, transparent)', line_strong: 'color-mix(in srgb, #252B27 28%, transparent)',
      accent: '#44614F', accent_hover: 'color-mix(in srgb, #44614F 78%, black)', accent_contrast: '#F0F5F1',
      accent_2: '#7E6A4A', accent_2_deep: 'color-mix(in srgb, #7E6A4A 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#7E7458', eyebrow_on_dark: '#C0B79A',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Baita di montagna — legno scuro e abete.
    id: 'baita-di-montagna@1',
    colors: cdColors({
      surface_page: '#F8F2E7', surface_alt: '#EDE2CF', surface_card: '#FFFBF2', surface_dark: '#241A10',
      surface_dark_raise: 'color-mix(in srgb, #241A10 86%, white)',
      text_heading: '#2C2114', text_body: 'color-mix(in srgb, #2C2114 80%, #F8F2E7)', text_muted: 'color-mix(in srgb, #2C2114 55%, #F8F2E7)',
      on_dark: '#F1E5CF', on_dark_70: 'color-mix(in srgb, #F1E5CF 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F1E5CF 18%, transparent)',
      line: 'color-mix(in srgb, #2C2114 14%, transparent)', line_strong: 'color-mix(in srgb, #2C2114 28%, transparent)',
      accent: '#8A4B24', accent_hover: 'color-mix(in srgb, #8A4B24 78%, black)', accent_contrast: '#F9EFE1',
      accent_2: '#3E5232', accent_2_deep: 'color-mix(in srgb, #3E5232 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#A0762E', eyebrow_on_dark: '#D3B27E',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Bistrot mediterraneo — azzurro profondo e sabbia.
    id: 'bistrot-mediterraneo@1',
    colors: cdColors({
      surface_page: '#FAF6ED', surface_alt: '#F0E9D8', surface_card: '#FFFEF8', surface_dark: '#1E2A30',
      surface_dark_raise: 'color-mix(in srgb, #1E2A30 86%, white)',
      text_heading: '#23303A', text_body: 'color-mix(in srgb, #23303A 80%, #FAF6ED)', text_muted: 'color-mix(in srgb, #23303A 55%, #FAF6ED)',
      on_dark: '#EAF0EE', on_dark_70: 'color-mix(in srgb, #EAF0EE 72%, transparent)', on_dark_line: 'color-mix(in srgb, #EAF0EE 18%, transparent)',
      line: 'color-mix(in srgb, #23303A 14%, transparent)', line_strong: 'color-mix(in srgb, #23303A 28%, transparent)',
      accent: '#2E6E7E', accent_hover: 'color-mix(in srgb, #2E6E7E 78%, black)', accent_contrast: '#F2F7F5',
      accent_2: '#C4703B', accent_2_deep: 'color-mix(in srgb, #C4703B 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#B08A3E', eyebrow_on_dark: '#D9C08D',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Caffè storico — espresso e rame.
    id: 'caffe-storico@1',
    colors: cdColors({
      surface_page: '#F7F1E9', surface_alt: '#ECE2D4', surface_card: '#FFFBF5', surface_dark: '#211812',
      surface_dark_raise: 'color-mix(in srgb, #211812 86%, white)',
      text_heading: '#2A1F17', text_body: 'color-mix(in srgb, #2A1F17 80%, #F7F1E9)', text_muted: 'color-mix(in srgb, #2A1F17 55%, #F7F1E9)',
      on_dark: '#EFE3D6', on_dark_70: 'color-mix(in srgb, #EFE3D6 72%, transparent)', on_dark_line: 'color-mix(in srgb, #EFE3D6 18%, transparent)',
      line: 'color-mix(in srgb, #2A1F17 14%, transparent)', line_strong: 'color-mix(in srgb, #2A1F17 28%, transparent)',
      accent: '#96502F', accent_hover: 'color-mix(in srgb, #96502F 78%, black)', accent_contrast: '#F8EEE5',
      accent_2: '#5C4B3B', accent_2_deep: 'color-mix(in srgb, #5C4B3B 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#A87E2F', eyebrow_on_dark: '#D6B98A',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Cantina naturale — ambra, ruggine e carta grezza.
    id: 'cantina-naturale@1',
    colors: cdColors({
      surface_page: '#F9F3E6', surface_alt: '#F0E5CE', surface_card: '#FFFBEF', surface_dark: '#271E14',
      surface_dark_raise: 'color-mix(in srgb, #271E14 86%, white)',
      text_heading: '#2C2216', text_body: 'color-mix(in srgb, #2C2216 80%, #F9F3E6)', text_muted: 'color-mix(in srgb, #2C2216 55%, #F9F3E6)',
      on_dark: '#F2E7CF', on_dark_70: 'color-mix(in srgb, #F2E7CF 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F2E7CF 18%, transparent)',
      line: 'color-mix(in srgb, #2C2216 14%, transparent)', line_strong: 'color-mix(in srgb, #2C2216 28%, transparent)',
      accent: '#A34E22', accent_hover: 'color-mix(in srgb, #A34E22 78%, black)', accent_contrast: '#FAEFE3',
      accent_2: '#7A6A2E', accent_2_deep: 'color-mix(in srgb, #7A6A2E 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#B08434', eyebrow_on_dark: '#DCBE83',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Costiera di sera — teal profondo e perla, fine dining di mare.
    id: 'costiera-di-sera@1',
    colors: cdColors({
      surface_page: '#F7F7F2', surface_alt: '#EBECE4', surface_card: '#FFFFFB', surface_dark: '#12262A',
      surface_dark_raise: 'color-mix(in srgb, #12262A 86%, white)',
      text_heading: '#1B2C30', text_body: 'color-mix(in srgb, #1B2C30 80%, #F7F7F2)', text_muted: 'color-mix(in srgb, #1B2C30 55%, #F7F7F2)',
      on_dark: '#EBF0EC', on_dark_70: 'color-mix(in srgb, #EBF0EC 72%, transparent)', on_dark_line: 'color-mix(in srgb, #EBF0EC 18%, transparent)',
      line: 'color-mix(in srgb, #1B2C30 14%, transparent)', line_strong: 'color-mix(in srgb, #1B2C30 28%, transparent)',
      accent: '#1F5F66', accent_hover: 'color-mix(in srgb, #1F5F66 78%, black)', accent_contrast: '#EFF6F4',
      accent_2: '#A8763F', accent_2_deep: 'color-mix(in srgb, #A8763F 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#93804C', eyebrow_on_dark: '#CBBC8E',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Cucina di mare — verde mare e corallo.
    id: 'cucina-di-mare@1',
    colors: cdColors({
      surface_page: '#F8FAF6', surface_alt: '#EAF0E9', surface_card: '#FFFFFF', surface_dark: '#14262B',
      surface_dark_raise: 'color-mix(in srgb, #14262B 86%, white)',
      text_heading: '#1C2E33', text_body: 'color-mix(in srgb, #1C2E33 80%, #F8FAF6)', text_muted: 'color-mix(in srgb, #1C2E33 55%, #F8FAF6)',
      on_dark: '#E8F1EE', on_dark_70: 'color-mix(in srgb, #E8F1EE 72%, transparent)', on_dark_line: 'color-mix(in srgb, #E8F1EE 18%, transparent)',
      line: 'color-mix(in srgb, #1C2E33 14%, transparent)', line_strong: 'color-mix(in srgb, #1C2E33 28%, transparent)',
      accent: '#C25B4A', accent_hover: 'color-mix(in srgb, #C25B4A 78%, black)', accent_contrast: '#FDF4F0',
      accent_2: '#2F6B62', accent_2_deep: 'color-mix(in srgb, #2F6B62 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#8E8449', eyebrow_on_dark: '#C9C08A',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Da Nonna Rosa — crema, mattone, oro, basilico (la palette di partenza di Claude Design).
    id: 'da-nonna-rosa@1',
    colors: cdColors({
      surface_page: '#FBF6EC', surface_alt: '#F3EADB', surface_card: '#FFFDF7', surface_dark: '#221B13',
      surface_dark_raise: 'color-mix(in srgb, #221B13 86%, white)',
      text_heading: '#27211B', text_body: 'color-mix(in srgb, #27211B 80%, #FBF6EC)', text_muted: 'color-mix(in srgb, #27211B 55%, #FBF6EC)',
      on_dark: '#F3E9D7', on_dark_70: 'color-mix(in srgb, #F3E9D7 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F3E9D7 18%, transparent)',
      line: 'color-mix(in srgb, #27211B 14%, transparent)', line_strong: 'color-mix(in srgb, #27211B 28%, transparent)',
      accent: '#A23E2C', accent_hover: 'color-mix(in srgb, #A23E2C 78%, black)', accent_contrast: '#FBF6EC',
      accent_2: '#4C6440', accent_2_deep: 'color-mix(in srgb, #4C6440 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#A87E2F', eyebrow_on_dark: '#D9C08D',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Enoteca scura — vinaccia e pergamena fredda.
    id: 'enoteca-scura@1',
    colors: cdColors({
      surface_page: '#F5F1EA', surface_alt: '#EAE3D8', surface_card: '#FDFBF6', surface_dark: '#241820',
      surface_dark_raise: 'color-mix(in srgb, #241820 86%, white)',
      text_heading: '#2B2026', text_body: 'color-mix(in srgb, #2B2026 80%, #F5F1EA)', text_muted: 'color-mix(in srgb, #2B2026 55%, #F5F1EA)',
      on_dark: '#EFE5E0', on_dark_70: 'color-mix(in srgb, #EFE5E0 72%, transparent)', on_dark_line: 'color-mix(in srgb, #EFE5E0 18%, transparent)',
      line: 'color-mix(in srgb, #2B2026 14%, transparent)', line_strong: 'color-mix(in srgb, #2B2026 28%, transparent)',
      accent: '#6E2436', accent_hover: 'color-mix(in srgb, #6E2436 78%, black)', accent_contrast: '#F6EBE7',
      accent_2: '#746A54', accent_2_deep: 'color-mix(in srgb, #746A54 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#97753C', eyebrow_on_dark: '#CFAF7E',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Fine dining — avorio e champagne, quasi monocroma.
    id: 'fine-dining@1',
    colors: cdColors({
      surface_page: '#F8F6F1', surface_alt: '#EFEBE2', surface_card: '#FFFFFF', surface_dark: '#191714',
      surface_dark_raise: 'color-mix(in srgb, #191714 86%, white)',
      text_heading: '#1E1C18', text_body: 'color-mix(in srgb, #1E1C18 80%, #F8F6F1)', text_muted: 'color-mix(in srgb, #1E1C18 55%, #F8F6F1)',
      on_dark: '#EDE7DA', on_dark_70: 'color-mix(in srgb, #EDE7DA 72%, transparent)', on_dark_line: 'color-mix(in srgb, #EDE7DA 18%, transparent)',
      line: 'color-mix(in srgb, #1E1C18 14%, transparent)', line_strong: 'color-mix(in srgb, #1E1C18 28%, transparent)',
      accent: '#8C7845', accent_hover: 'color-mix(in srgb, #8C7845 78%, black)', accent_contrast: '#FAF8F2',
      accent_2: '#5A5346', accent_2_deep: 'color-mix(in srgb, #5A5346 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#9A854E', eyebrow_on_dark: '#D6C69A',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Forno e farina — grano, crosta e lievito madre.
    id: 'forno-e-farina@1',
    colors: cdColors({
      surface_page: '#FCF8EF', surface_alt: '#F5ECDB', surface_card: '#FFFEF8', surface_dark: '#251D12',
      surface_dark_raise: 'color-mix(in srgb, #251D12 86%, white)',
      text_heading: '#2A2318', text_body: 'color-mix(in srgb, #2A2318 80%, #FCF8EF)', text_muted: 'color-mix(in srgb, #2A2318 55%, #FCF8EF)',
      on_dark: '#F4ECDA', on_dark_70: 'color-mix(in srgb, #F4ECDA 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F4ECDA 18%, transparent)',
      line: 'color-mix(in srgb, #2A2318 14%, transparent)', line_strong: 'color-mix(in srgb, #2A2318 28%, transparent)',
      accent: '#9E6B2F', accent_hover: 'color-mix(in srgb, #9E6B2F 78%, black)', accent_contrast: '#FBF3E7',
      accent_2: '#5E6039', accent_2_deep: 'color-mix(in srgb, #5E6039 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#AD8737', eyebrow_on_dark: '#DBC28C',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Griglia e brace — carbone, fumo e brace.
    id: 'griglia-e-brace@1',
    colors: cdColors({
      surface_page: '#F6F2EC', surface_alt: '#EAE4DA', surface_card: '#FFFCF7', surface_dark: '#1B1917',
      surface_dark_raise: 'color-mix(in srgb, #1B1917 86%, white)',
      text_heading: '#232019', text_body: 'color-mix(in srgb, #232019 80%, #F6F2EC)', text_muted: 'color-mix(in srgb, #232019 55%, #F6F2EC)',
      on_dark: '#EFE8DE', on_dark_70: 'color-mix(in srgb, #EFE8DE 72%, transparent)', on_dark_line: 'color-mix(in srgb, #EFE8DE 18%, transparent)',
      line: 'color-mix(in srgb, #232019 14%, transparent)', line_strong: 'color-mix(in srgb, #232019 28%, transparent)',
      accent: '#C05A2B', accent_hover: 'color-mix(in srgb, #C05A2B 78%, black)', accent_contrast: '#FCF2E9',
      accent_2: '#575148', accent_2_deep: 'color-mix(in srgb, #575148 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#B07E35', eyebrow_on_dark: '#D9B888',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Liberty storico — borgogna e ottone, salotto d'epoca.
    id: 'liberty-storico@1',
    colors: cdColors({
      surface_page: '#F8F3EC', surface_alt: '#EFE5D8', surface_card: '#FFFDF7', surface_dark: '#26161A',
      surface_dark_raise: 'color-mix(in srgb, #26161A 86%, white)',
      text_heading: '#2C1D20', text_body: 'color-mix(in srgb, #2C1D20 80%, #F8F3EC)', text_muted: 'color-mix(in srgb, #2C1D20 55%, #F8F3EC)',
      on_dark: '#F1E4DC', on_dark_70: 'color-mix(in srgb, #F1E4DC 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F1E4DC 18%, transparent)',
      line: 'color-mix(in srgb, #2C1D20 14%, transparent)', line_strong: 'color-mix(in srgb, #2C1D20 28%, transparent)',
      accent: '#86293A', accent_hover: 'color-mix(in srgb, #86293A 78%, black)', accent_contrast: '#F8ECE8',
      accent_2: '#6A5B3E', accent_2_deep: 'color-mix(in srgb, #6A5B3E 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#A5813B', eyebrow_on_dark: '#D8BC86',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Moderno minimale — grigi caldi, un solo rosso pomodoro.
    id: 'moderno-minimale@1',
    colors: cdColors({
      surface_page: '#F9F8F5', surface_alt: '#EFEDE8', surface_card: '#FFFFFF', surface_dark: '#211F1C',
      surface_dark_raise: 'color-mix(in srgb, #211F1C 86%, white)',
      text_heading: '#232019', text_body: 'color-mix(in srgb, #232019 80%, #F9F8F5)', text_muted: 'color-mix(in srgb, #232019 55%, #F9F8F5)',
      on_dark: '#F0EEE8', on_dark_70: 'color-mix(in srgb, #F0EEE8 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F0EEE8 18%, transparent)',
      line: 'color-mix(in srgb, #232019 14%, transparent)', line_strong: 'color-mix(in srgb, #232019 28%, transparent)',
      accent: '#C13E2B', accent_hover: 'color-mix(in srgb, #C13E2B 78%, black)', accent_contrast: '#FDF5F2',
      accent_2: '#6E6A61', accent_2_deep: 'color-mix(in srgb, #6E6A61 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#8F8677', eyebrow_on_dark: '#C9C0B0',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Orto vegetariano — salvia, erbe e senape chiara.
    id: 'orto-vegetariano@1',
    colors: cdColors({
      surface_page: '#F9FAF3', surface_alt: '#EEF0E2', surface_card: '#FFFFFC', surface_dark: '#22281C',
      surface_dark_raise: 'color-mix(in srgb, #22281C 86%, white)',
      text_heading: '#262C20', text_body: 'color-mix(in srgb, #262C20 80%, #F9FAF3)', text_muted: 'color-mix(in srgb, #262C20 55%, #F9FAF3)',
      on_dark: '#EFF2E2', on_dark_70: 'color-mix(in srgb, #EFF2E2 72%, transparent)', on_dark_line: 'color-mix(in srgb, #EFF2E2 18%, transparent)',
      line: 'color-mix(in srgb, #262C20 14%, transparent)', line_strong: 'color-mix(in srgb, #262C20 28%, transparent)',
      accent: '#5E7C3A', accent_hover: 'color-mix(in srgb, #5E7C3A 78%, black)', accent_contrast: '#F6F9EC',
      accent_2: '#B98A2C', accent_2_deep: 'color-mix(in srgb, #B98A2C 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#9C8A33', eyebrow_on_dark: '#D9CC8A',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Osteria contemporanea — senape e petrolio.
    id: 'osteria-contemporanea@1',
    colors: cdColors({
      surface_page: '#FAF6EC', surface_alt: '#F0E8D6', surface_card: '#FFFDF4', surface_dark: '#1D2A2A',
      surface_dark_raise: 'color-mix(in srgb, #1D2A2A 86%, white)',
      text_heading: '#223030', text_body: 'color-mix(in srgb, #223030 80%, #FAF6EC)', text_muted: 'color-mix(in srgb, #223030 55%, #FAF6EC)',
      on_dark: '#EDEFE6', on_dark_70: 'color-mix(in srgb, #EDEFE6 72%, transparent)', on_dark_line: 'color-mix(in srgb, #EDEFE6 18%, transparent)',
      line: 'color-mix(in srgb, #223030 14%, transparent)', line_strong: 'color-mix(in srgb, #223030 28%, transparent)',
      accent: '#B98A22', accent_hover: 'color-mix(in srgb, #B98A22 78%, black)', accent_contrast: '#26220F',
      accent_2: '#2F5455', accent_2_deep: 'color-mix(in srgb, #2F5455 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#96742A', eyebrow_on_dark: '#D6BC79',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Osteria di città — sangue di bue e grigi caldi, urbana.
    id: 'osteria-di-citta@1',
    colors: cdColors({
      surface_page: '#F7F3ED', surface_alt: '#EDE6DC', surface_card: '#FFFEFA', surface_dark: '#241F1E',
      surface_dark_raise: 'color-mix(in srgb, #241F1E 86%, white)',
      text_heading: '#262120', text_body: 'color-mix(in srgb, #262120 80%, #F7F3ED)', text_muted: 'color-mix(in srgb, #262120 55%, #F7F3ED)',
      on_dark: '#EFE7DD', on_dark_70: 'color-mix(in srgb, #EFE7DD 72%, transparent)', on_dark_line: 'color-mix(in srgb, #EFE7DD 18%, transparent)',
      line: 'color-mix(in srgb, #262120 14%, transparent)', line_strong: 'color-mix(in srgb, #262120 28%, transparent)',
      accent: '#7E2D26', accent_hover: 'color-mix(in srgb, #7E2D26 78%, black)', accent_contrast: '#F7EFE7',
      accent_2: '#55584A', accent_2_deep: 'color-mix(in srgb, #55584A 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#8A6D3B', eyebrow_on_dark: '#CDB588',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Pizzeria napoletana — pomodoro, basilico e bianco mozzarella.
    id: 'pizzeria-napoletana@1',
    colors: cdColors({
      surface_page: '#FFF9F0', surface_alt: '#FBEEDD', surface_card: '#FFFFFF', surface_dark: '#26221C',
      surface_dark_raise: 'color-mix(in srgb, #26221C 86%, white)',
      text_heading: '#2B2118', text_body: 'color-mix(in srgb, #2B2118 80%, #FFF9F0)', text_muted: 'color-mix(in srgb, #2B2118 55%, #FFF9F0)',
      on_dark: '#FBF1E0', on_dark_70: 'color-mix(in srgb, #FBF1E0 72%, transparent)', on_dark_line: 'color-mix(in srgb, #FBF1E0 18%, transparent)',
      line: 'color-mix(in srgb, #2B2118 14%, transparent)', line_strong: 'color-mix(in srgb, #2B2118 28%, transparent)',
      accent: '#C6392B', accent_hover: 'color-mix(in srgb, #C6392B 78%, black)', accent_contrast: '#FFF6EC',
      accent_2: '#3E7A3F', accent_2_deep: 'color-mix(in srgb, #3E7A3F 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#C98A2E', eyebrow_on_dark: '#F0C87E',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Rosticceria popolare — paprika e zafferano, popolare e viva.
    id: 'rosticceria-popolare@1',
    colors: cdColors({
      surface_page: '#FDF7EC', surface_alt: '#F8ECD6', surface_card: '#FFFFF9', surface_dark: '#291E13',
      surface_dark_raise: 'color-mix(in srgb, #291E13 86%, white)',
      text_heading: '#2C2115', text_body: 'color-mix(in srgb, #2C2115 80%, #FDF7EC)', text_muted: 'color-mix(in srgb, #2C2115 55%, #FDF7EC)',
      on_dark: '#F6EBD5', on_dark_70: 'color-mix(in srgb, #F6EBD5 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F6EBD5 18%, transparent)',
      line: 'color-mix(in srgb, #2C2115 14%, transparent)', line_strong: 'color-mix(in srgb, #2C2115 28%, transparent)',
      accent: '#B23A24', accent_hover: 'color-mix(in srgb, #B23A24 78%, black)', accent_contrast: '#FBEFE7',
      accent_2: '#C08A24', accent_2_deep: 'color-mix(in srgb, #C08A24 60%, black)', accent_2_contrast: '#2B2110',
      eyebrow_color: '#B58A2E', eyebrow_on_dark: '#E2C77F',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Sicilia e agrumi — limone, zafferano e maiolica blu.
    id: 'sicilia-e-agrumi@1',
    colors: cdColors({
      surface_page: '#FCF8EA', surface_alt: '#F6EDD2', surface_card: '#FFFFF8', surface_dark: '#1E2837',
      surface_dark_raise: 'color-mix(in srgb, #1E2837 86%, white)',
      text_heading: '#24303F', text_body: 'color-mix(in srgb, #24303F 80%, #FCF8EA)', text_muted: 'color-mix(in srgb, #24303F 55%, #FCF8EA)',
      on_dark: '#F5EFDC', on_dark_70: 'color-mix(in srgb, #F5EFDC 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F5EFDC 18%, transparent)',
      line: 'color-mix(in srgb, #24303F 14%, transparent)', line_strong: 'color-mix(in srgb, #24303F 28%, transparent)',
      accent: '#2C5F8A', accent_hover: 'color-mix(in srgb, #2C5F8A 78%, black)', accent_contrast: '#F1F6FA',
      accent_2: '#C9912B', accent_2_deep: 'color-mix(in srgb, #C9912B 60%, black)', accent_2_contrast: '#2B2110',
      eyebrow_color: '#C08F2C', eyebrow_on_dark: '#E6C878',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Trattoria adriatica — blu notte e sabbia dorata.
    id: 'trattoria-adriatica@1',
    colors: cdColors({
      surface_page: '#F9F6EF', surface_alt: '#EFE9DB', surface_card: '#FFFEF9', surface_dark: '#182231',
      surface_dark_raise: 'color-mix(in srgb, #182231 86%, white)',
      text_heading: '#202B3A', text_body: 'color-mix(in srgb, #202B3A 80%, #F9F6EF)', text_muted: 'color-mix(in srgb, #202B3A 55%, #F9F6EF)',
      on_dark: '#EAEDF0', on_dark_70: 'color-mix(in srgb, #EAEDF0 72%, transparent)', on_dark_line: 'color-mix(in srgb, #EAEDF0 18%, transparent)',
      line: 'color-mix(in srgb, #202B3A 14%, transparent)', line_strong: 'color-mix(in srgb, #202B3A 28%, transparent)',
      accent: '#27476E', accent_hover: 'color-mix(in srgb, #27476E 78%, black)', accent_contrast: '#EEF2F7',
      accent_2: '#B9763C', accent_2_deep: 'color-mix(in srgb, #B9763C 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#A08243', eyebrow_on_dark: '#CDBA8C',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Trattoria rustica — terracotta e oliva su carta calda.
    id: 'trattoria-rustica@1',
    colors: cdColors({
      surface_page: '#FAF4E8', surface_alt: '#F1E6D2', surface_card: '#FFFCF4', surface_dark: '#2A2014',
      surface_dark_raise: 'color-mix(in srgb, #2A2014 86%, white)',
      text_heading: '#2E2418', text_body: 'color-mix(in srgb, #2E2418 80%, #FAF4E8)', text_muted: 'color-mix(in srgb, #2E2418 55%, #FAF4E8)',
      on_dark: '#F4EAD6', on_dark_70: 'color-mix(in srgb, #F4EAD6 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F4EAD6 18%, transparent)',
      line: 'color-mix(in srgb, #2E2418 14%, transparent)', line_strong: 'color-mix(in srgb, #2E2418 28%, transparent)',
      accent: '#B05A31', accent_hover: 'color-mix(in srgb, #B05A31 78%, black)', accent_contrast: '#FBF3E6',
      accent_2: '#6B6B33', accent_2_deep: 'color-mix(in srgb, #6B6B33 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#9C7B2F', eyebrow_on_dark: '#D8C08A',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  // ── DV2-505 (variety-select, ibrido B) — PALETTE A FONDO NON-CREMA ──────────────────────────────────
  // Le 23 palette CD sopra hanno tutte un `surface_page` CREMA caldo (DS-V2-D1: identita' trattoria calda):
  // ottima coesione, ma al gate i 5 mockup apparivano "sempre la stessa palette". Queste due allargano lo
  // SPETTRO del FONDO — una SCURA (a lume) e una FREDDA (lacustre) — cosi' la greedy (che ora massimizza
  // anche la distanza di LUMINOSITA' del fondo, ibrido A) puo' far divergere davvero le 5 palette. Stessa
  // forma token-completa delle altre (mai un token mancante); i valori derivati con lo stesso `color-mix`.
  {
    // Trattoria a lume — sala scura a lume di candela: fondo espresso, bagliore d'ambra, oro caldo.
    // FONDO SCURO: text_heading/on_dark sono CHIARI (crema), le linee sono chiare-trasparenti, l'accento
    // e' brillante (pop su scuro) col contrasto SCURO per il testo sui bottoni. surface_dark resta il
    // piu' scuro (le bande "scure" dei blocchi restano distinguibili dal fondo gia' scuro).
    id: 'trattoria-a-lume@1',
    colors: cdColors({
      surface_page: '#1E1915', surface_alt: '#272019', surface_card: '#2F2820', surface_dark: '#130F0C',
      surface_dark_raise: 'color-mix(in srgb, #130F0C 82%, white)',
      text_heading: '#F4EAD8', text_body: 'color-mix(in srgb, #F4EAD8 82%, #1E1915)', text_muted: 'color-mix(in srgb, #F4EAD8 52%, #1E1915)',
      on_dark: '#F4EAD8', on_dark_70: 'color-mix(in srgb, #F4EAD8 72%, transparent)', on_dark_line: 'color-mix(in srgb, #F4EAD8 18%, transparent)',
      line: 'color-mix(in srgb, #F4EAD8 15%, transparent)', line_strong: 'color-mix(in srgb, #F4EAD8 30%, transparent)',
      accent: '#D98A3C', accent_hover: 'color-mix(in srgb, #D98A3C 82%, white)', accent_contrast: '#1E1915',
      accent_2: '#C7A560', accent_2_deep: 'color-mix(in srgb, #C7A560 66%, white)', accent_2_contrast: '#1E1915',
      eyebrow_color: '#CDA153', eyebrow_on_dark: '#DDB472',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
  {
    // Osteria di lago — luce lacustre: fondo grigio-salvia FREDDO, accento teal d'acqua, controcanto
    // terracotta. Struttura a fondo CHIARO (come le CD), ma la TINTA del fondo e' fredda, non crema.
    id: 'osteria-di-lago@1',
    colors: cdColors({
      surface_page: '#EEF3F1', surface_alt: '#DCE6E3', surface_card: '#FAFDFC', surface_dark: '#15292B',
      surface_dark_raise: 'color-mix(in srgb, #15292B 86%, white)',
      text_heading: '#1E2B2B', text_body: 'color-mix(in srgb, #1E2B2B 80%, #EEF3F1)', text_muted: 'color-mix(in srgb, #1E2B2B 55%, #EEF3F1)',
      on_dark: '#E6EFEC', on_dark_70: 'color-mix(in srgb, #E6EFEC 72%, transparent)', on_dark_line: 'color-mix(in srgb, #E6EFEC 18%, transparent)',
      line: 'color-mix(in srgb, #1E2B2B 14%, transparent)', line_strong: 'color-mix(in srgb, #1E2B2B 28%, transparent)',
      accent: '#1E7A78', accent_hover: 'color-mix(in srgb, #1E7A78 78%, black)', accent_contrast: '#EAF6F4',
      accent_2: '#B06A33', accent_2_deep: 'color-mix(in srgb, #B06A33 60%, black)', accent_2_contrast: '#F6F2E8',
      eyebrow_color: '#3E7C6E', eyebrow_on_dark: '#8FC3B3',
    }),
    typography: CD_TYPOGRAPHY, spacing: CD_SPACING, radius: CD_RADIUS,
  },
];

/**
 * RETRO-COMPAT (DS-V2-D1): gli id dei temi STORICI di v1.1 → la paletta di Claude Design piu' vicina.
 * `recipes.ts` cita questi id per stringa (`theme_id`) e i documenti P4 gia' congelati li registrano;
 * `themeFor` li rimappa cosi' che continuino a rendere invece di cadere. Rimappatura ESPLICITA, mai un
 * clone silenzioso. Non sono selezionabili: il pool di varieta' (design-matrix) offre solo i 23 CD.
 */
export const THEME_ID_ALIASES: Readonly<Record<string, string>> = {
  'sole-mediterraneo@1': 'trattoria-rustica@1',
  'bottega-artigiana@1': 'agriturismo-toscano@1',
  'scatto-vitale@1': 'griglia-e-brace@1',
  'brezza-costiera@1': 'cucina-di-mare@1',
  'linea-essenziale@1': 'moderno-minimale@1',
  'linea-essenziale-notte@1': 'enoteca-scura@1',
  'festa-brillante@1': 'pizzeria-napoletana@1',
  'orto-salvia@1': 'orto-vegetariano@1',
};

/**
 * IL TEMA DI QUESTO ID, o `undefined` se nessuno lo porta. Confronto per UGUAGLIANZA ESATTA (mai per
 * prefisso: gli id sono versionati 'nome@N'), poi ALIAS storico (DS-V2-D1). PROTO-SAFE: la ricerca dei
 * temi e' su ARRAY (non un oggetto indicizzato) e l'alias usa `hasOwnProperty`, così '__proto__' /
 * 'constructor' provenienti da un artefatto salvato non risolvono un membro ereditato di Object.prototype.
 */
export function themeFor(themeId: string): SiteTheme | undefined {
  const exact = THEMES.find((theme) => theme.id === themeId);
  if (exact) return exact;
  if (Object.prototype.hasOwnProperty.call(THEME_ID_ALIASES, themeId)) {
    const aliased = THEME_ID_ALIASES[themeId];
    return THEMES.find((theme) => theme.id === aliased);
  }
  return undefined;
}

// T-211 (macrotask generation-engine, P2; cresciuti in DE-202) — I TEMI DEL SITO GENERATO: colori,
// tipografia, spaziature e raggi che appartengono al SITO DEL CLIENTE e non al chrome
// del builder. Dominio PURO: nessun accesso al DB, nessun I/O, nessun side effect — e
// nessun import, perche' il modulo e' un catalogo dichiarato e nient'altro.
//
// PERCHE' VIVONO QUI E NON IN src/ui/theme/ (P2-D14): il design system dell'app
// (src/ui/theme/tokens.ts) e' il vestito del PANNELLO e cambia quando cambia il
// pannello; i suoi colori sono per costruzione dei RIFERIMENTI a CSS custom property
// ('var(--color-background)'), cioe' valori che qualcun altro decide a runtime. Un tema
// del sito generato non puo' poggiare su quei riferimenti: il sito del cliente e' un
// ARTEFATTO CONGELATO, scelto una volta e pubblicato, e un ritocco al pannello non deve
// poterlo riscrivere. Per questo i valori qui sotto sono PROPRI — esadecimali, rem, nomi
// di famiglia — e non c'e' alcun 'var(--...)' in nessuno di essi.
//
// LA SEPARAZIONE E' IMPOSTA DAL MECCANISMO, non sorvegliata dalla disciplina: una regola
// ESLint no-restricted-imports (eslint.config.mjs) vieta a src/ui/site/** — il layer che
// rendera' i blocchi, T-231 — di importare src/ui/theme/tokens, per alias e per percorso
// relativo. E' lo stesso pattern con cui P1-D7 chiude il confine LLM (T-131), ed e'
// verificata da tests/generation-theme-isolation.test.ts eseguendo ESLint su un modulo
// fixture VIRTUALE. Senza quella regola la separazione sarebbe una convenzione, cioe'
// una cosa che regge finche' nessuno ha fretta.
//
// GLI ID NASCONO VERSIONATI, ed e' una PRECONDIZIONE EREDITATA e misurata (T-202,
// 2026-07-28): il documento congelato registra `theme_id` nella forma 'nome-kebab@N' e
// un id senza '@N' fa cadere l'INTERO documento, non solo il campo. La versione e' DENTRO
// l'id e non accanto perche' e' cosi' che un ritocco futuro a un tema non riscrive un
// sito gia' scelto: cambiare i valori di 'sole-mediterraneo@1' senza passare a '@2'
// significa cambiare sotto i piedi i siti che lo citano.
//
// IL CARATTERE DI OGNI TEMA E' DICHIARATO IN UN COMMENTO, MA IL COMMENTO NON E'
// UN'ASSERZIONE (L-COL-006): "caldo", "essenziale", "asciutto" dicono a chi si rivolge il
// tema e che sensazione punta a dare, e servono a chi in futuro dovra' scegliere dove
// mettere le mani. Nessun test prova che un tema sia BELLO — lo stile non e' oracolabile
// (P1 §6-bis p.8). Cio' che i test provano e' che il layer esiste, che le chiavi sono le
// stesse ovunque, che le palette sono distinte a due a due e che nessun valore rimanda al
// builder.
//
// COSA NON C'E' QUI, deliberatamente:
// - l'APPLICAZIONE del tema nel rendering (T-231): questo modulo dichiara i valori, non
//   li scrive in nessuna pagina e non conosce React;
// - l'ACCOPPIAMENTO tema-ricetta (T-212): quale direzione usi quale tema e' una
//   decisione delle ricette, e dichiararla qui la scriverebbe due volte;
// - `brand_hints` come SELETTORE del tema: escluso in v1. E' testo libero che il cliente
//   scrive e che il modello puo' riscrivere (update_brief, T-132): farne un selettore
//   aprirebbe un canale dal testo NON FIDATO alla scelta dell'aspetto del sito, cioe'
//   una leva in piu' per chi tentasse un'injection. Il tema lo sceglie la ricetta.
// - l'IMAGERY del tema: il documento (T-202) nomina i placeholder con un token, ma il
//   catalogo di quei token non e' di questo task.

/**
 * I TOKEN DI COLORE, gli stessi per tutti i temi. Sono SEMANTICI e non descrittivi
 * ('accent', non 'arancione'): e' cio' che permette al rendering (T-231) di essere
 * scritto una volta sola per tutti i temi.
 *
 * `accent_contrast` e' il colore del testo che sta SOPRA l'accento (l'etichetta dentro
 * il bottone): non e' un secondo accento, e tenerlo separato e' cio' che evita che un
 * tema scuro finisca con un testo scuro su fondo scuro.
 */
type ColorToken =
  // I token SEMANTICI storici (P2), INVARIATI per retro-compat: i documenti gia' congelati e il
  // rendering (T-231) li leggono per nome, quindi non si toccano.
  | 'background'
  | 'surface'
  | 'text'
  | 'text_muted'
  | 'accent'
  | 'accent_contrast'
  | 'border'
  // DE11-101 — la palette EDITORIALE del DNA ristorazione, per-tema e coordinata col carattere di
  // ciascuno, PIU' una superficie SCURA distinta dalla chiara (`surface_dark`: menu su fondo scuro,
  // sezioni alternate). Token DESCRITTIVI che AFFIANCANO i semantici, non li sostituiscono; poiche'
  // `colors` e' un Record TOTALE su questa unione, ogni tema DEVE definirli o non compila.
  | 'crema'
  | 'panna'
  | 'rosso_mattone'
  | 'oro'
  | 'verde_basilico'
  | 'ink'
  | 'surface_dark';

/**
 * I ruoli tipografici: i titoli, il corpo, e — DE11-101 — il `display`, la serif didone dei DISPLAY
 * editoriali (titoli/prezzi/citazioni). La famiglia display e' CONDIVISA da tutti i temi e verra'
 * caricata self-host da DE11-102; qui e' solo lo STACK dichiarato, col fallback serif di sistema.
 */
type FontRole = 'heading' | 'body' | 'display';

/**
 * DE11-101 — i token di TRACKING (letter-spacing) memorizzati dal tema. `label` e' il tracking
 * esteso delle label/eyebrow uppercase del DNA editoriale. Qui e' solo il valore-dato: l'APPLICAZIONE
 * nel CSS e' DE11-103.
 */
type TrackingToken = 'label';

/** I passi della scala tipografica, dal piu' piccolo al piu' grande. */
type TypeScaleStep = 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';

/** I passi del ritmo verticale e orizzontale, dal piu' stretto al piu' largo. */
type SpacingStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** I raggi di bordo. `pill` e' il raggio "completo" dei bottoni a pillola. */
type RadiusStep = 'sm' | 'md' | 'lg' | 'pill';

/**
 * UN TEMA DEL SITO GENERATO.
 *
 * IL TIPO E' TOTALE SULLE CHIAVI, ed e' il punto: ogni gruppo e' un `Record` sulla
 * propria unione chiusa di token, quindi un tema a cui manchi anche un solo token NON
 * COMPILA (AC-211-5). Non e' pedanteria: il rendering leggera' `colors.border` senza
 * chiedersi se quel tema ce l'ha, e un token mancante diventerebbe `undefined` in una
 * proprieta' CSS — cioe' un bordo che sparisce in produzione su un tema solo, che e' il
 * genere di difetto che nessuno vede finche' non lo vede un cliente.
 */
export type SiteTheme = {
  /**
   * Identificatore STABILE e VERSIONATO nella forma 'nome-kebab@N', che e' quella
   * richiesta da `SiteDocumentSchema` (T-202) per `theme_id`. Qui non e' confrontato con
   * quello schema — il confronto vive dove il documento si costruisce (T-214) — ma e'
   * scelto per passarlo, e il test lo verifica DERIVANDO il controllo da quello schema.
   */
  readonly id: string;
  readonly colors: Readonly<Record<ColorToken, string>>;
  readonly typography: {
    /** Stack completi, col fallback di sistema: un font che non carica non lascia il sito senza testo. */
    readonly font_family: Readonly<Record<FontRole, string>>;
    readonly scale: Readonly<Record<TypeScaleStep, string>>;
    /**
     * DE11-101 — le regole tipografiche editoriali MEMORIZZATE dal tema (l'APPLICAZIONE nel CSS e'
     * DE11-103, l'asse trattamento-H1 e' DE11-201): il tracking esteso delle label, il flag
     * `tabular_nums` del DNA ristorazione (cifre a larghezza fissa su orari/prezzi), e l'hook
     * `h1_italic_default` — qui solo un token booleano, non ancora applicato.
     */
    readonly tracking: Readonly<Record<TrackingToken, string>>;
    readonly tabular_nums: boolean;
    readonly h1_italic_default: boolean;
  };
  readonly spacing: Readonly<Record<SpacingStep, string>>;
  readonly radius: Readonly<Record<RadiusStep, string>>;
};

/**
 * I TEMI, nell'ordine in cui vengono offerti. Sono dichiarati a mano da noi e non inventati dal
 * modello (P2-D1): insieme alle ricette (T-212) sono la ragione per cui la promessa "risultati
 * brutti strutturalmente impossibili" e' verificabile — il modello scrive prosa, non sceglie i
 * colori.
 *
 * NATI CINQUE (T-211), CRESCIUTI A OTTO con DE-202, e DISACCOPPIATI dalla ricetta (DS-D3): il tema
 * non e' piu' un'appendice 1:1 di una direzione, ma un ASSE che il selettore design (DE-204)
 * sceglie fra tutti quelli ammessi dalla matrice. Per questo i temi sono PIU' delle cinque ricette:
 * i primi cinque id restano quelli storici (i documenti P4 gia' congelati li citano per id), gli
 * altri allargano la tavolozza di scelta senza che nessuna ricetta debba "possederli".
 *
 * I VALORI SONO PROPRI DI P2. Nessuno e' un 'var(--...)', nemmeno dove coincide per caso
 * con un numero del builder: una spaziatura di '1rem' e' un rem scelto qui, non il
 * medesimo rem del pannello, e il giorno in cui il pannello cambia il suo questo resta
 * dov'e'.
 */
export const THEMES: readonly SiteTheme[] = [
  {
    // SOLE MEDITERRANEO — per osterie, trattorie, forni e botteghe di gastronomia.
    // Terracotta su crema, titoli con le grazie: punta alla sensazione della tavola
    // apparecchiata di giorno, calda e senza pretese. E' il tema piu' "vecchia insegna"
    // dei cinque.
    id: 'sole-mediterraneo@1',
    colors: {
      background: '#fdf6ec',
      surface: '#fffdf9',
      text: '#2b1d14',
      text_muted: '#7a6a5c',
      accent: '#c0492b',
      accent_contrast: '#fff8f2',
      border: '#e6d7c3',
      // DE11-101 — palette editoriale calda "vecchia insegna": crema/panna morbide, mattone e oro
      // di terracotta, basilico spento; superficie scura per menu/sezioni su fondo bruno.
      crema: '#f3e3c9',
      panna: '#fbf3e3',
      rosso_mattone: '#a83a22',
      oro: '#c69a3e',
      verde_basilico: '#5c7a3f',
      ink: '#241812',
      surface_dark: '#33241a',
    },
    typography: {
      font_family: {
        heading: 'Fraunces, Georgia, serif',
        body: 'Source Sans 3, Segoe UI, sans-serif',
        display: 'Playfair Display, Georgia, serif',
      },
      scale: {
        sm: '0.875rem',
        base: '1.0625rem',
        lg: '1.375rem',
        xl: '1.875rem',
        '2xl': '2.5rem',
        '3xl': '3.25rem',
      },
      tracking: { label: '0.18em' },
      tabular_nums: true,
      h1_italic_default: true,
    },
    spacing: {
      xs: '0.375rem',
      sm: '0.75rem',
      md: '1.25rem',
      lg: '2rem',
      xl: '3.25rem',
      '2xl': '5rem',
    },
    radius: { sm: '0.25rem', md: '0.5rem', lg: '1rem', pill: '99rem' },
  },
  {
    // LINEA ESSENZIALE — per studi professionali, consulenti, saloni con clientela
    // urbana. Grafite su bianco, un blu di lavoro come unico accento, raggi quasi vivi:
    // punta alla sensazione della competenza sobria, dove il sito non alza la voce.
    id: 'linea-essenziale@1',
    colors: {
      background: '#ffffff',
      surface: '#f5f7f9',
      text: '#14171a',
      text_muted: '#5c656e',
      accent: '#1f4fd8',
      accent_contrast: '#ffffff',
      border: '#dfe3e8',
      // DE11-101 — palette editoriale FREDDA e sobria: crema/panna quasi bianche, mattone e oro
      // desaturati, basilico ombroso; superficie scura grafite per le sezioni notturne.
      crema: '#eef1f4',
      panna: '#f8fafb',
      rosso_mattone: '#b23a2e',
      oro: '#b8923f',
      verde_basilico: '#4a7358',
      ink: '#101418',
      surface_dark: '#1b2129',
    },
    typography: {
      font_family: {
        heading: 'Space Grotesk, Helvetica Neue, sans-serif',
        body: 'Inter, Helvetica Neue, sans-serif',
        display: 'Playfair Display, Georgia, serif',
      },
      scale: {
        sm: '0.8125rem',
        base: '1rem',
        lg: '1.25rem',
        xl: '1.625rem',
        '2xl': '2.125rem',
        '3xl': '2.75rem',
      },
      tracking: { label: '0.18em' },
      tabular_nums: true,
      h1_italic_default: false,
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.75rem',
      xl: '2.75rem',
      '2xl': '4rem',
    },
    radius: { sm: '0.125rem', md: '0.25rem', lg: '0.5rem', pill: '99rem' },
  },
  {
    // SCATTO VITALE — per palestre, box di functional training, scuole di danza.
    // Il tema SCURO fra i cinque storici: lime elettrico su antracite, titoli condensati,
    // spigoli vivi (il raggio piu' piccolo e' zero). Punta alla sensazione dell'energia
    // e del movimento, ed e' anche il tema che regge meglio le foto a tutta larghezza.
    id: 'scatto-vitale@1',
    colors: {
      background: '#0f1115',
      surface: '#191d24',
      text: '#f2f5f8',
      text_muted: '#9aa6b2',
      accent: '#b6ff3b',
      accent_contrast: '#101318',
      border: '#2b323d',
      // DE11-101 — palette editoriale su fondo scuro: crema/panna pallide per il testo caldo,
      // mattone e oro accesi, basilico lime; superficie scura ANCORA piu' profonda della base.
      crema: '#e4e7d0',
      panna: '#f0f2e6',
      rosso_mattone: '#c8452b',
      oro: '#cbb23f',
      verde_basilico: '#7fae3a',
      ink: '#0a0c0f',
      surface_dark: '#10141a',
    },
    typography: {
      font_family: {
        heading: 'Barlow Condensed, Oswald, sans-serif',
        body: 'Barlow, Roboto, sans-serif',
        display: 'Playfair Display, Georgia, serif',
      },
      scale: {
        sm: '0.875rem',
        base: '1.0625rem',
        lg: '1.3125rem',
        xl: '1.75rem',
        '2xl': '2.375rem',
        '3xl': '3.5rem',
      },
      tracking: { label: '0.18em' },
      tabular_nums: true,
      h1_italic_default: false,
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.625rem',
      md: '1.125rem',
      lg: '1.5rem',
      xl: '2.5rem',
      '2xl': '3.5rem',
    },
    radius: { sm: '0rem', md: '0.125rem', lg: '0.25rem', pill: '99rem' },
  },
  {
    // BOTTEGA ARTIGIANA — per laboratori, negozi di quartiere, produttori che vendono
    // cio' che fanno. Carta e inchiostro con un verde bosco, titoli con le grazie e
    // ritmo stretto: punta alla sensazione del mestiere fatto a mano, dove conta il
    // prodotto e non la vetrina.
    id: 'bottega-artigiana@1',
    colors: {
      background: '#f4f1ea',
      surface: '#fffdf8',
      text: '#1f2a1f',
      text_muted: '#6b7566',
      accent: '#2f6b4f',
      accent_contrast: '#f7fdf9',
      border: '#d8d2c2',
      // DE11-101 — palette editoriale "carta e inchiostro": crema/panna calde, mattone terroso,
      // oro spento, verde bosco a fare da basilico; superficie scura verde-inchiostro.
      crema: '#ece3cf',
      panna: '#f7f1e2',
      rosso_mattone: '#9c3b26',
      oro: '#b58a3c',
      verde_basilico: '#3f6b4a',
      ink: '#1a221a',
      surface_dark: '#2b3327',
    },
    typography: {
      font_family: {
        heading: 'Libre Baskerville, Georgia, serif',
        body: 'Karla, Helvetica, sans-serif',
        display: 'Playfair Display, Georgia, serif',
      },
      scale: {
        sm: '0.8125rem',
        base: '1rem',
        lg: '1.1875rem',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '2.625rem',
      },
      tracking: { label: '0.18em' },
      tabular_nums: true,
      h1_italic_default: true,
    },
    spacing: {
      xs: '0.375rem',
      sm: '0.625rem',
      md: '1rem',
      lg: '1.625rem',
      xl: '2.5rem',
      '2xl': '3.75rem',
    },
    radius: { sm: '0.1875rem', md: '0.375rem', lg: '0.625rem', pill: '99rem' },
  },
  {
    // BREZZA COSTIERA — per B&B, case vacanza, stabilimenti, servizi al turismo.
    // Acqua e sabbia chiara, geometrie morbide e uno dei ritmi piu' ARIOSI (spaziature
    // fra le piu' larghe del catalogo): punta alla sensazione dell'aria aperta e del
    // tempo che non stringe.
    id: 'brezza-costiera@1',
    colors: {
      background: '#f5fafc',
      surface: '#ffffff',
      text: '#0e2a38',
      text_muted: '#5b7684',
      accent: '#0f7c93',
      accent_contrast: '#ffffff',
      border: '#cfe2ea',
      // DE11-101 — palette editoriale marina: crema/panna sabbiose, un mattone corallo, oro caldo
      // e un basilico verde-mare; superficie scura blu profondo per le sezioni notturne.
      crema: '#f0ead8',
      panna: '#f9f5ea',
      rosso_mattone: '#b8503a',
      oro: '#cba64a',
      verde_basilico: '#4f8f78',
      ink: '#0e2330',
      surface_dark: '#123141',
    },
    typography: {
      font_family: {
        heading: 'Poppins, Avenir Next, sans-serif',
        body: 'Nunito Sans, Segoe UI, sans-serif',
        display: 'Playfair Display, Georgia, serif',
      },
      scale: {
        sm: '0.875rem',
        base: '1.0625rem',
        lg: '1.3125rem',
        xl: '1.6875rem',
        '2xl': '2.25rem',
        '3xl': '3rem',
      },
      tracking: { label: '0.18em' },
      tabular_nums: true,
      h1_italic_default: false,
    },
    spacing: {
      xs: '0.5rem',
      sm: '0.875rem',
      md: '1.375rem',
      lg: '2.25rem',
      xl: '3.5rem',
      '2xl': '5.5rem',
    },
    radius: { sm: '0.5rem', md: '0.875rem', lg: '1.5rem', pill: '99rem' },
  },
  {
    // LINEA ESSENZIALE NOTTE — la sorella NOTTURNA di 'linea-essenziale', per gli stessi studi e
    // consulenti quando l'insegna e' accesa dopo il tramonto: grafite scura con un oro caldo e
    // sobrio, lo STESSO carattere geometrico dei titoli su fondo profondo. E' fra i temi SCURI
    // (con 'scatto-vitale'), ma dove scatto e' energia elettrica questo e'
    // eleganza trattenuta. DE-202: cresce il catalogo e — non per caso — porta un id il cui NOME
    // e' PREFISSO di quello base ('linea-essenziale'), cosi' che `themeFor` provi l'uguaglianza
    // esatta e non un match lasco sul prefisso.
    id: 'linea-essenziale-notte@1',
    colors: {
      background: '#0f1319',
      surface: '#171d26',
      text: '#eef2f6',
      text_muted: '#97a2b0',
      accent: '#d9a441',
      accent_contrast: '#14171d',
      border: '#29323e',
      // DE11-101 — palette editoriale notturna "eleganza trattenuta": crema/panna tenui, mattone
      // sobrio, oro caldo, basilico attutito; superficie scura ancora piu' profonda della base.
      crema: '#e7e2d3',
      panna: '#f2eee2',
      rosso_mattone: '#b4472f',
      oro: '#cf9c3d',
      verde_basilico: '#5c7d5a',
      ink: '#0b0e13',
      surface_dark: '#10151c',
    },
    typography: {
      font_family: {
        heading: 'Space Grotesk, Helvetica Neue, sans-serif',
        body: 'Nunito Sans, Segoe UI, sans-serif',
        display: 'Playfair Display, Georgia, serif',
      },
      scale: {
        sm: '0.875rem',
        base: '1.0625rem',
        lg: '1.4375rem',
        xl: '2rem',
        '2xl': '2.75rem',
        '3xl': '3.75rem',
      },
      tracking: { label: '0.18em' },
      tabular_nums: true,
      h1_italic_default: true,
    },
    spacing: {
      xs: '0.3125rem',
      sm: '0.6875rem',
      md: '1.1875rem',
      lg: '1.75rem',
      xl: '2.875rem',
      '2xl': '4.25rem',
    },
    radius: { sm: '0.125rem', md: '0.25rem', lg: '0.5rem', pill: '99rem' },
  },
  {
    // FESTA BRILLANTE — per pizzerie, street food, gelaterie, chi vende allegria oltre al piatto.
    // Bianco caldo con un arancio ACCESO e titoli tondi: punta alla sensazione della festa di
    // quartiere, colorata e diretta. E' il tema piu' vivace dei nostri, l'unico dichiaratamente
    // giocoso, e regge le promozioni e i banner senza spegnersi.
    id: 'festa-brillante@1',
    colors: {
      background: '#fffdf7',
      surface: '#ffffff',
      text: '#2a2018',
      text_muted: '#7c7160',
      accent: '#e6541f',
      accent_contrast: '#fff6f0',
      border: '#f0e7d6',
      // DE11-101 — palette editoriale della festa: crema/panna dorate, un mattone-arancio acceso,
      // oro brillante, basilico vivo; superficie scura calda per banner e promozioni su fondo bruno.
      crema: '#ffe9cf',
      panna: '#fff4e6',
      rosso_mattone: '#d23f1c',
      oro: '#e2a233',
      verde_basilico: '#5f9a42',
      ink: '#241a12',
      surface_dark: '#3a2a1c',
    },
    typography: {
      font_family: {
        heading: 'Poppins, Avenir Next, sans-serif',
        body: 'Barlow, Roboto, sans-serif',
        display: 'Playfair Display, Georgia, serif',
      },
      scale: {
        sm: '0.9375rem',
        base: '1.125rem',
        lg: '1.5rem',
        xl: '2.0625rem',
        '2xl': '2.875rem',
        '3xl': '4rem',
      },
      tracking: { label: '0.18em' },
      tabular_nums: true,
      h1_italic_default: false,
    },
    spacing: {
      xs: '0.4375rem',
      sm: '0.8125rem',
      md: '1.3125rem',
      lg: '2.125rem',
      xl: '3.375rem',
      '2xl': '5.25rem',
    },
    radius: { sm: '0.5rem', md: '0.875rem', lg: '1.5rem', pill: '99rem' },
  },
  {
    // ORTO SALVIA — per cucine vegetali, poke, gastronomie del fresco, cantine e chi racconta la
    // materia prima. Bianco venato di verde con un accento salvia: e' il nostro tema NATURALE, il
    // solo dove l'accento e' un verde fresco e non un caldo — pensato per pesce, vegetariano,
    // healthy, dove il colore deve dire "di stagione" prima ancora del testo. Titoli con le grazie,
    // ritmo ampio e arioso.
    id: 'orto-salvia@1',
    colors: {
      background: '#f6faf6',
      surface: '#ffffff',
      text: '#1b2a20',
      text_muted: '#5f7166',
      accent: '#4f8f6b',
      accent_contrast: '#f6fbf8',
      border: '#d9e5da',
      // DE11-101 — palette editoriale naturale "di stagione": crema/panna verdoline, mattone
      // terroso, oro-ottone spento, basilico fresco; superficie scura verde-inchiostro.
      crema: '#eef0dd',
      panna: '#f7f8ec',
      rosso_mattone: '#a84a30',
      oro: '#bfa049',
      verde_basilico: '#4f8f6b',
      ink: '#14201a',
      surface_dark: '#1e2c24',
    },
    typography: {
      font_family: {
        heading: 'Fraunces, Georgia, serif',
        body: 'Karla, Helvetica, sans-serif',
        display: 'Playfair Display, Georgia, serif',
      },
      scale: {
        sm: '0.8125rem',
        base: '1rem',
        lg: '1.3125rem',
        xl: '1.75rem',
        '2xl': '2.375rem',
        '3xl': '3.125rem',
      },
      tracking: { label: '0.18em' },
      tabular_nums: true,
      h1_italic_default: true,
    },
    spacing: {
      xs: '0.5rem',
      sm: '0.9375rem',
      md: '1.5rem',
      lg: '2.375rem',
      xl: '3.625rem',
      '2xl': '6rem',
    },
    radius: { sm: '0.25rem', md: '0.5rem', lg: '1rem', pill: '99rem' },
  },
];

/**
 * IL TEMA DI QUESTO ID, o `undefined` se nessuno lo porta. RIALLOCATO qui da variant-document.ts
 * (DE-202) ed ESPORTATO: era un helper privato del compositore delle card, ma il selettore design
 * (DE-204) sceglie il tema come ASSE proprio — disaccoppiato dalla ricetta (DS-D3) — quindi ha
 * bisogno dello stesso lookup canonico. Averne uno solo, qui accanto al catalogo che interroga,
 * evita un secondo confronto che divergerebbe in silenzio.
 *
 * IL CONFRONTO E' PER UGUAGLIANZA ESATTA E MAI PER PREFISSO: gli id dei temi sono versionati
 * ('nome-kebab@N'), quindi 'linea-essenziale' e 'linea-essenziale@1' sono due stringhe diverse e la
 * prima non e' un tema; e due temi possono condividere un prefisso di nome ('linea-essenziale@1' e
 * 'linea-essenziale-notte@1') senza che l'uno risolva l'altro. Un confronto lasco registrerebbe nel
 * documento (T-202) un id che nessuna versione ha mai prodotto.
 *
 * LA RICERCA E' SULL'ARRAY, non su un oggetto indicizzato per id, per la stessa ragione di
 * `recipeFor` (T-212): l'id puo' arrivare da un artefatto salvato (il `theme_id` di un documento
 * gia' scritto), quindi con una mappa-oggetto le chiavi speciali di JavaScript ('__proto__',
 * 'constructor', 'toString') risolverebbero il membro EREDITATO da Object.prototype e questa
 * funzione restituirebbe qualcosa che non e' un tema.
 */
export function themeFor(themeId: string): SiteTheme | undefined {
  return THEMES.find((theme) => theme.id === themeId);
}

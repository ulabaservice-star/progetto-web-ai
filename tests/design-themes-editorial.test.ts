import { describe, it, expect } from 'vitest';
import { THEMES, themeFor, type SiteTheme } from '@/domain/generation/themes';
import { siteThemeStyle } from '@/ui/site/theme-style';

// DE11-101 (macrotask editorial-skin) — THEMES ARRICCHITI: la palette editoriale estesa del DNA
// ristorazione (crema/panna/rosso-mattone/oro/verde-basilico/ink + una superficie SCURA per-tema) e
// le regole tipografiche editoriali (serif didone display, tracking sulle label, tabular-nums, hook
// italic per l'asse H1) come token TIPIZZATI TOTALI. Le asserzioni DERIVANO dagli acceptance_criteria
// AC-DE11-101-1..4 (docs/blueprint/design-engine-v1.1/01-editorial-skin.md), ogni blocco/riga che
// esercita un AC porta il tag `// covers:`.
//
// CIO' CHE QUESTO FILE NON PROVA (L-COL-006): non prova che una palette sia BELLA o leggibile, ne che
// il font display sia gradevole — lo stile non e' oracolabile. Prova che ogni tema ESPONE i nuovi
// token (colore e tipografia), che la superficie scura e' DISTINTA dalla chiara, che la proiezione
// unica (siteThemeStyle) emette le nuove custom property, e che gli id storici restano risolvibili.
//
// FUORI SCOPE (out_of_scope del task): il caricamento self-host del font display (DE11-102) e
// l'applicazione delle regole nel CSS (DE11-103). Qui si giudica solo il layer-DATO dei temi.

// I NUOVI token colore, elencati a mano (LETTERALI): derivarli da THEMES li renderebbe veri per
// costruzione. La forma con l'underscore e' quella delle CHIAVI del catalogo; la variante a trattino
// (per le custom property) e' pinnata piu' sotto, dove conta.
const NUOVI_TOKEN_COLORE = [
  'crema',
  'panna',
  'rosso_mattone',
  'oro',
  'verde_basilico',
  'ink',
  'surface_dark',
] as const;

/** La forma canonica di un valore colore del catalogo: esadecimale a 6 cifre minuscole (come i semantici). */
const HEX6 = /^#[0-9a-f]{6}$/;

// ── AC-DE11-101-1 — ogni tema espone i nuovi token tipografici e colore ───────────────

describe('AC-DE11-101-1 — ogni tema espone i nuovi token editoriali (tipografia + palette)', () => {
  // Anti-vacuita': il catalogo ha piu' di un tema, altrimenti i cicli sarebbero veri per vacuita'.
  it('il catalogo non e vuoto e i nuovi token colore sono SETTE distinti (non un elenco degenere)', () => {
    expect(THEMES.length).toBeGreaterThan(1); // covers: AC-DE11-101-1
    // I sette token nuovi non nascondono un duplicato che indebolirebbe il ciclo qui sotto.
    expect(new Set(NUOVI_TOKEN_COLORE).size).toBe(7); // covers: AC-DE11-101-1
  });

  it('ogni tema porta i nuovi token COLORE (valori propri esadecimali), accanto ai semantici storici', () => {
    for (const tema of THEMES) {
      const chiavi = Object.keys(tema.colors);
      for (const token of NUOVI_TOKEN_COLORE) {
        // Il token e' DAVVERO una chiave del tema (non un indexing su chiave assente).
        expect(chiavi, `${tema.id}: manca il token ${token}`).toContain(token); // covers: AC-DE11-101-1
        // ...ed e' un valore PROPRIO (esadecimale), non vuoto ne un riferimento var().
        const valore = tema.colors[token as keyof SiteTheme['colors']];
        expect(valore, `${tema.id}.colors.${token}`).toMatch(HEX6); // covers: AC-DE11-101-1
      }
      // I token SEMANTICI storici restano presenti (retro-compat): la palette estesa AFFIANCA, non sostituisce.
      expect(chiavi, `${tema.id}: token storici persi`).toEqual(
        expect.arrayContaining(['background', 'surface', 'text', 'accent', 'border']),
      ); // covers: AC-DE11-101-1
    }
  });

  it('ogni tema porta i nuovi token TIPOGRAFICI: display (stack serif), tracking.label, tabular_nums (flag)', () => {
    for (const tema of THEMES) {
      // La serif didone dei DISPLAY: uno STACK (col fallback), non un nome nudo.
      expect(typeof tema.typography.font_family.display, tema.id).toBe('string'); // covers: AC-DE11-101-1
      expect(tema.typography.font_family.display, tema.id).toContain(','); // covers: AC-DE11-101-1
      // Il tracking delle label e' un valore-dato (letter-spacing), presente e non vuoto.
      expect(typeof tema.typography.tracking.label, tema.id).toBe('string'); // covers: AC-DE11-101-1
      expect(tema.typography.tracking.label.length, tema.id).toBeGreaterThan(0); // covers: AC-DE11-101-1
      // tabular_nums e h1_italic_default sono FLAG booleani (l'hook italic e' solo memorizzato: lo applica DE11-201).
      expect(typeof tema.typography.tabular_nums, tema.id).toBe('boolean'); // covers: AC-DE11-101-1
      expect(typeof tema.typography.h1_italic_default, tema.id).toBe('boolean'); // covers: AC-DE11-101-1
    }
  });

  it('e FALSIFICABILE: un token inventato NON e fra le chiavi colore di alcun tema', () => {
    // Contro-prova che il controllo di presenza non e' vacuo: una chiave che nessun tema porta manca davvero.
    for (const tema of THEMES) {
      expect(Object.keys(tema.colors)).not.toContain('rosso_ciliegia'); // covers: AC-DE11-101-1
    }
  });

  it('h1_italic_default e un TOKEN per-tema, non una costante: nel catalogo compaiono ENTRAMBI i valori', () => {
    // Non e' un AC ma tiene onesto il flag: se fosse cablato a un solo valore ovunque, sarebbe un
    // token finto. Il catalogo mescola temi con italic di default e temi senza.
    const valori = new Set(THEMES.map((tema) => tema.typography.h1_italic_default));
    expect(valori.has(true)).toBe(true); // covers: AC-DE11-101-1
    expect(valori.has(false)).toBe(true); // covers: AC-DE11-101-1
  });
});

// ── AC-DE11-101-2 — la superficie scura e' distinta dalla chiara, tema per tema ───────

describe('AC-DE11-101-2 — ogni tema ha una superficie scura DISTINTA dalla chiara', () => {
  it('surface_dark !== surface per OGNI tema (menu su fondo scuro, sezioni alternate)', () => {
    // Anti-vacuita': il catalogo non e' vuoto, altrimenti "per ogni tema" sarebbe vero per vacuita'.
    expect(THEMES.length).toBeGreaterThan(1); // covers: AC-DE11-101-2

    for (const tema of THEMES) {
      // Entrambe sono valori propri (esadecimali), cosi' il confronto non e' fra due `undefined` uguali.
      expect(tema.colors.surface, `${tema.id}.surface`).toMatch(HEX6); // covers: AC-DE11-101-2
      expect(tema.colors.surface_dark, `${tema.id}.surface_dark`).toMatch(HEX6); // covers: AC-DE11-101-2
      // Il cuore dell'AC: la superficie scura NON coincide con quella chiara del proprio tema.
      expect(tema.colors.surface_dark, `${tema.id}: surface_dark uguale a surface`).not.toBe(
        tema.colors.surface,
      ); // covers: AC-DE11-101-2
    }
  });
});

// ── AC-DE11-101-3 — theme-style proietta le nuove custom property ─────────────────────

describe('AC-DE11-101-3 — siteThemeStyle emette le nuove --site-color-*/--site-font-*/--site-tracking-*', () => {
  // Le NUOVE custom property attese: i colori con l'underscore tradotto a trattino (rosso_mattone ->
  // --site-color-rosso-mattone, surface_dark -> --site-color-surface-dark), piu' font display/body e
  // il tracking label. Elenco LETTERALE, non derivato dalla proiezione che si sta giudicando.
  const NUOVE_PROPRIETA = [
    '--site-color-crema',
    '--site-color-panna',
    '--site-color-rosso-mattone',
    '--site-color-oro',
    '--site-color-verde-basilico',
    '--site-color-ink',
    '--site-color-surface-dark',
    '--site-font-display',
    '--site-font-body',
    '--site-tracking-label',
    '--site-numeric-figure',
  ] as const;

  it('per OGNI tema la proiezione contiene tutte le nuove custom property, coi valori del tema', () => {
    expect(THEMES.length).toBeGreaterThan(1); // covers: AC-DE11-101-3

    for (const tema of THEMES) {
      const style = siteThemeStyle(tema) as Record<string, string>;
      const chiavi = Object.keys(style);

      for (const proprieta of NUOVE_PROPRIETA) {
        expect(chiavi, `${tema.id}: manca ${proprieta}`).toContain(proprieta); // covers: AC-DE11-101-3
      }

      // I VALORI, non solo le chiavi: la traduzione underscore->trattino porta davvero il valore-dato
      // del token (una proiezione che emettesse la chiave con valore sbagliato cadrebbe qui).
      expect(style['--site-color-rosso-mattone']).toBe(tema.colors.rosso_mattone); // covers: AC-DE11-101-3
      expect(style['--site-color-surface-dark']).toBe(tema.colors.surface_dark); // covers: AC-DE11-101-3
      expect(style['--site-tracking-label']).toBe(tema.typography.tracking.label); // covers: AC-DE11-101-3
      // Il font display porta la famiglia didone del tema (con o senza il prefisso var(--font-x) che
      // aggiungera' DE11-102: in entrambi i casi lo stack del tema e' CONTENUTO nel valore proiettato).
      expect(style['--site-font-display']).toContain(tema.typography.font_family.display); // covers: AC-DE11-101-3
      // Il commutatore delle cifre deriva dal flag del tema, non da una costante.
      expect(style['--site-numeric-figure']).toBe(
        tema.typography.tabular_nums ? 'tabular-nums' : 'normal',
      ); // covers: AC-DE11-101-3

      // Nessuna regressione: la proiezione storica dei semantici resta (un colore fra tutti a campione).
      expect(style['--site-color-accent']).toBe(tema.colors.accent); // covers: AC-DE11-101-3
    }
  });

  it('e FALSIFICABILE: una custom property inesistente NON compare nella proiezione', () => {
    const style = siteThemeStyle(THEMES[0]) as Record<string, string>;
    // Contro-prova di non-vacuita': lo scanner distingue una chiave vera da una inventata.
    expect(Object.keys(style)).not.toContain('--site-color-rosso-ciliegia'); // covers: AC-DE11-101-3
  });
});

// ── AC-DE11-101-4 — gli id storici versionati restano risolvibili ─────────────────────

describe('AC-DE11-101-4 — i temi storici (versionati) risolvono via themeFor (nessuna regressione P4/v1)', () => {
  // Gli id CONGELATI nei documenti P4/v1: LETTERALI e scritti a mano, come in design-themes-grown.test.ts.
  // Sono il contratto verso gli artefatti gia' pubblicati, non un dato da rileggere dal catalogo che si
  // sta arricchendo. Un rename di uno di questi rende rosso qui invece di rompere un sito in silenzio.
  const STORICI = [
    'sole-mediterraneo@1',
    'linea-essenziale@1',
    'scatto-vitale@1',
    'bottega-artigiana@1',
    'brezza-costiera@1',
  ] as const;

  it('themeFor risolve ciascuno degli id storici al tema con quell id ESATTO', () => {
    // I cinque sono id distinti (l'elenco non nasconde un duplicato che indebolirebbe il ciclo).
    expect(new Set(STORICI).size).toBe(5); // covers: AC-DE11-101-4

    for (const id of STORICI) {
      const tema = themeFor(id);
      expect(tema, id).toBeDefined(); // covers: AC-DE11-101-4
      expect(tema?.id, id).toBe(id); // covers: AC-DE11-101-4
      // E il tema risolto porta gia' la palette arricchita: l'arricchimento non ha "perso" gli storici.
      expect(tema?.colors.surface_dark, id).toMatch(HEX6); // covers: AC-DE11-101-4
    }
  });

  it('la risoluzione resta per UGUAGLIANZA ESATTA: il nome senza @N non risolve alcun tema', () => {
    // Trappola del prefisso ereditata (DS/T-202): 'sole-mediterraneo' e' prefisso stretto di
    // 'sole-mediterraneo@1' ma non e' l'id di alcun tema. Un lookup lasco lo confonderebbe.
    for (const id of STORICI) {
      const senzaVersione = id.replace(/@[0-9]+$/, '');
      expect(senzaVersione, `id gia privo di versione: ${id}`).not.toBe(id);
      expect(themeFor(senzaVersione), senzaVersione).toBeUndefined(); // covers: AC-DE11-101-4
    }
  });
});

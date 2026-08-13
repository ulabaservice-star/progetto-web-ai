// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import itMessages from '../messages/it.json';
import { parseDocument, type SiteDocument } from '@/domain/generation/document';
import { THEMES } from '@/domain/generation/themes';
import { hasLiteralColor } from './helpers/css-literal-color';

// DE-207 (macrotask design-select) — SiteView scrive ALLA RADICE del render i data-attribute
// congelati nel documento e site.css li consuma. Le asserzioni derivano DIRETTAMENTE dagli
// acceptance_criteria di 02-design-select.md (AC-DE-207-1..3), taggate `// covers:` sulla riga
// dell'EXPECT.
//
//  (1) AC-DE-207-1: un documento con hero_layout_id/section_treatment_id/effect_level (e ornament_id)
//      noti, RESO dal renderer REALE (SiteView), porta sulla radice `.site-view`
//      data-hero-layout/-section-treatment/-ornament/-effects con QUEI valori. L'ornamento e'
//      opzionale (DS-D5): assente nel documento -> attributo assente, mentre gli altri tre restano
//      (il gate applica i default DE-205).
//  (2) AC-DE-207-2: due documenti con hero_layout_id diversi -> due radici con data-hero-layout
//      diversi (la varieta' strutturale e' nel markup, non solo nel colore). Include la TRAPPOLA DEL
//      PREFISSO 'centrato@1' / 'centrato-foto@1': l'id VERSIONATO e' portato per intero, mai un
//      prefisso, cosi' due layout distinti non collassano sullo stesso attributo.
//  (3) AC-DE-207-3: site.css con le nuove varianti, scansionato per colore letterale -> nessuno.
//      Riusa lo scanner condiviso (./helpers/css-literal-color, lo stesso di DE-101): importato, mai
//      ricopiato (R-04).

// getTranslations REALE dal catalogo it (namespace richiesto), come negli altri test di render:
// i blocchi chiamano siteBlockLabel (getTranslations) e in jsdom non c'e' un contesto di richiesta
// next-intl. Una chiave assente ricade sul proprio path, cosi' un blocco senza etichetta non fa
// cadere il render.
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { locale: string; namespace: string }) => {
    const ns = ((itMessages as Record<string, unknown>)[namespace] ?? {}) as Record<string, unknown>;
    return (key: string) => {
      const value = key
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ns);
      return typeof value === 'string' ? value : `${namespace}.${key}`;
    };
  },
}));

// Import DOPO il mock (vi.mock e' hoisted).
import { SiteView } from '@/ui/site/SiteView';

afterEach(() => {
  cleanup();
});

// ── fixture: home valida a un blocco, con la selezione design CONGELATA e passata dal gate ─────
// I campi di selezione vivono a livello di DOCUMENTO; la home minima porta un solo blocco hero (una
// pagina ha almeno un blocco). Ogni fixture passa da parseDocument, cosi' si prova cio' che il
// render consuma davvero (l'uscita del gate, normalizzata).
type DesignSelection = {
  readonly hero_layout_id?: string;
  readonly section_treatment_id?: string;
  readonly effect_level?: string;
  readonly ornament_id?: string;
};

function rawDocument(design: DesignSelection): Record<string, unknown> {
  return {
    recipe_id: 'ricetta-prova@1',
    theme_id: THEMES[0].id,
    ...design,
    pages: [
      {
        slug: 'home',
        role: 'home',
        title: 'Home della Trattoria Aurora',
        meta_description: 'La trattoria Aurora nel centro storico',
        blocks: [
          {
            id: 'hero',
            content: { hero_title: 'Benvenuti alla Trattoria Aurora' },
            data: {},
            brief_fields_rendered: [],
            images: [],
          },
        ],
      },
    ],
  };
}

function buildDocument(design: DesignSelection): SiteDocument {
  const parsed = parseDocument(rawDocument(design));
  if (!parsed.ok) {
    throw new Error(`fixture DE-207 non valida: ${JSON.stringify(parsed.error.issues)}`);
  }
  return parsed.document;
}

/** Rende il documento col renderer REALE e restituisce la RADICE del render (`.site-view`). */
async function renderRoot(doc: SiteDocument): Promise<HTMLElement> {
  const ui = await SiteView({ document: doc, theme: THEMES[0], locale: 'it' });
  const { container } = render(ui);
  const root = container.querySelector('.site-view');
  if (root === null) throw new Error('nessuna radice .site-view resa');
  return root as HTMLElement;
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-207-1 — la radice porta i data-attribute dai campi congelati del documento.
// ─────────────────────────────────────────────────────────────────────────────

describe('DE-207 AC-DE-207-1 — la radice porta i data-attribute della selezione congelata', () => {
  it('data-hero-layout/-section-treatment/-effects/-ornament riflettono i campi del documento', async () => {
    // Valori DISCORDANTI, ognuno di un kind diverso del proprio catalogo.
    const root = await renderRoot(
      buildDocument({
        hero_layout_id: 'immagine-piena@1',
        section_treatment_id: 'a-scheda@1',
        effect_level: 'L2',
        ornament_id: 'fregio-centrale@1',
      }),
    );

    expect(root.getAttribute('data-hero-layout')).toBe('immagine-piena@1'); // covers: AC-DE-207-1
    expect(root.getAttribute('data-section-treatment')).toBe('a-scheda@1'); // covers: AC-DE-207-1
    expect(root.getAttribute('data-effects')).toBe('L2'); // covers: AC-DE-207-1
    expect(root.getAttribute('data-ornament')).toBe('fregio-centrale@1'); // covers: AC-DE-207-1
  });

  it('ornament_id assente (opzionale, DS-D5): data-ornament assente, gli altri tre coi default del gate', async () => {
    // Un documento in formato P4 non porta i campi: il gate (DE-205) applica i default a
    // hero/section/effect ('centrato@1' / 'piano@1' / 'L1'), l'ornamento resta assente. L'attributo
    // riflette QUEL fatto: presente per i tre normalizzati, assente per l'ornamento mancante.
    const root = await renderRoot(buildDocument({}));

    expect(root.getAttribute('data-hero-layout')).toBe('centrato@1'); // covers: AC-DE-207-1
    expect(root.getAttribute('data-section-treatment')).toBe('piano@1'); // covers: AC-DE-207-1
    expect(root.getAttribute('data-effects')).toBe('L1'); // covers: AC-DE-207-1
    expect(root.hasAttribute('data-ornament')).toBe(false); // covers: AC-DE-207-1
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-207-2 — hero_layout_id diversi -> data-hero-layout diversi (varieta' strutturale).
// ─────────────────────────────────────────────────────────────────────────────

describe('DE-207 AC-DE-207-2 — hero-layout diversi producono data-hero-layout diversi', () => {
  it('centrato vs split: le due radici portano data-hero-layout distinti', async () => {
    const centrato = await renderRoot(buildDocument({ hero_layout_id: 'centrato@1' }));
    const split = await renderRoot(buildDocument({ hero_layout_id: 'split@1' }));

    expect(centrato.getAttribute('data-hero-layout')).toBe('centrato@1'); // covers: AC-DE-207-2
    expect(split.getAttribute('data-hero-layout')).toBe('split@1'); // covers: AC-DE-207-2
    // La varieta' e' nel MARKUP: i due attributi sono diversi (non solo il colore del tema).
    expect(centrato.getAttribute('data-hero-layout')).not.toBe(
      split.getAttribute('data-hero-layout'),
    ); // covers: AC-DE-207-2
  });

  it('trappola del prefisso: centrato@1 e centrato-foto@1 restano ESATTI e distinti', async () => {
    // Il token nudo 'centrato' e' prefisso di entrambi gli id. L'attributo deve portare l'id
    // VERSIONATO per intero, mai il prefisso: due layout diversi non collassano sullo stesso valore.
    const centrato = await renderRoot(buildDocument({ hero_layout_id: 'centrato@1' }));
    const centratoFoto = await renderRoot(buildDocument({ hero_layout_id: 'centrato-foto@1' }));

    expect(centrato.getAttribute('data-hero-layout')).toBe('centrato@1'); // covers: AC-DE-207-2
    expect(centratoFoto.getAttribute('data-hero-layout')).toBe('centrato-foto@1'); // covers: AC-DE-207-2
    expect(centrato.getAttribute('data-hero-layout')).not.toBe(
      centratoFoto.getAttribute('data-hero-layout'),
    ); // covers: AC-DE-207-2
    // e nessuno dei due e' il token nudo 'centrato' (l'id e' portato per intero, non troncato).
    expect(centrato.getAttribute('data-hero-layout')).not.toBe('centrato'); // covers: AC-DE-207-2
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-207-3 — site.css con le nuove varianti: nessun colore letterale.
// ─────────────────────────────────────────────────────────────────────────────

describe('DE-207 AC-DE-207-3 — site.css senza colori letterali', () => {
  it('site.css non contiene alcun colore letterale (hex/rgb/hsl)', () => {
    // vitest gira dalla radice del repo; sotto jsdom il costruttore URL globale non e' quello di
    // Node, quindi il path si compone da process.cwd().
    const source = readFileSync(join(process.cwd(), 'src', 'ui', 'site', 'site.css'), 'utf8');
    expect(hasLiteralColor(source)).toBe(false); // covers: AC-DE-207-3

    // Anti-vacuita': il foglio contiene DAVVERO le varianti nuove che questo AC sorveglia (altrimenti
    // "nessun colore letterale" sarebbe vero anche su un foglio senza le varianti).
    expect(source).toContain('data-hero-layout'); // covers: AC-DE-207-3
    expect(source).toContain('data-section-treatment'); // covers: AC-DE-207-3
    expect(source).toContain('data-ornament'); // covers: AC-DE-207-3
  });

  it('lo scanner e FALSIFICABILE: riconosce un letterale (assemblato) e non un token var()', () => {
    const hash = '#';
    const open = '(';
    expect(hasLiteralColor('color: ' + hash + 'ffffff')).toBe(true); // covers: AC-DE-207-3
    expect(hasLiteralColor('color: ' + 'rgb' + open + '12, 34, 56)')).toBe(true); // covers: AC-DE-207-3
    expect(hasLiteralColor('color: ' + 'hsl' + open + '210, 40%, 30%)')).toBe(true); // covers: AC-DE-207-3
    expect(hasLiteralColor('background-color: var(--site-color-accent)')).toBe(false); // covers: AC-DE-207-3
  });
});

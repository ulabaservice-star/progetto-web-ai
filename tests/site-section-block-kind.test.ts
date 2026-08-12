// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import itMessages from '../messages/it.json';
import { parseDocument, type SiteDocument } from '@/domain/generation/document';
import { THEMES } from '@/domain/generation/themes';

// DE-102 (macrotask visual-skin) — AC-DE-102-1 / AC-DE-102-2. Le asserzioni derivano dagli
// acceptance_criteria del task (01-visual-skin.md), taggate `// covers: <AC-id>` sulla riga
// dell'EXPECT.
//
// (1) EFFETTO (AC-DE-102-1): una pagina resa dal renderer REALE (SiteView) con PIU' blocchi di kind
//     DISCORDANTI porta su ogni <section> un `data-block-kind` col tipo del blocco — l'hero il suo,
//     le altre il proprio — e sono TUTTI DIVERSI tra loro. E' cio' che permette al CSS (site.css) di
//     dare all'hero un trattamento distinto (`.site-section[data-block-kind="hero"]`).
// (2) SCAN (AC-DE-102-2): i sorgenti di src/ui/site/blocks/** e SiteSection non contengono alcun
//     colore LETTERALE inline (hex/rgb/hsl) — i colori passano da css/var. Gemello scoperto di
//     AC-231-4, mirato ai file che DE-102 tocca (SiteSection) e ai blocchi che li avvolge.

// getTranslations REALE dal catalogo it (namespace richiesto), come in site-renderer-identity.test:
// risolve il path puntato dentro il namespace, e una chiave assente ricade sul proprio path — cosi'
// un blocco senza etichetta non fa cadere il render. Serve perche' i blocchi chiamano
// siteBlockLabel (getTranslations) e in jsdom non c'e' un contesto di richiesta next-intl.
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

// ── fixture: un documento VALIDO, KIND DISCORDANTI, passato dal gate reale ────────────────────
// QUATTRO blocchi di kind DISCORDANTI (hero, chi-siamo, offerte, orari) su un'unica home. Dentro le
// offerte un nome e' PREFISSO di un altro ('Antipasto' / 'Antipasto della casa'): la trappola del
// prefisso della disciplina fixture. Nessun kind del catalogo e' prefisso di un altro, quindi al
// livello dei KIND la discordanza e' per valori distinti (verificata col confronto d'insieme).
const RAW_DOCUMENT = {
  recipe_id: 'ricetta-prova@1',
  theme_id: 'sole-mediterraneo@1',
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
        {
          id: 'chi-siamo',
          content: { about_title: 'Chi siamo', about_body: 'Tre generazioni ai fornelli' },
          data: {},
          brief_fields_rendered: [],
          images: [],
        },
        {
          id: 'offerte',
          content: { offerings_title: 'Le nostre offerte', offerings_intro: 'Piatti di stagione' },
          data: {
            offerings: [
              { name: 'Antipasto' },
              { name: 'Antipasto della casa' }, // 'Antipasto' e' PREFISSO di questo
              { name: 'Dolce' },
            ],
          },
          brief_fields_rendered: [],
          images: [],
        },
        {
          id: 'orari',
          content: { hours_title: 'I nostri orari' },
          data: { hours: { 'lun-ven': '12:00-15:00', sab: '19:00-23:00' } },
          brief_fields_rendered: [],
          images: [],
        },
      ],
    },
  ],
};

// L'ORDINE dei blocchi nella home e' l'ordine di reso (SitePageView mappa page.blocks in ordine),
// quindi l'ordine atteso dei data-block-kind nel DOM. Valori LETTERALI, scritti qui nel test.
const EXPECTED_KINDS = ['hero', 'chi-siamo', 'offerte', 'orari'];

function buildDocument(): SiteDocument {
  const parsed = parseDocument(RAW_DOCUMENT);
  if (!parsed.ok) {
    throw new Error('fixture DE-102: il documento con kind discordanti non ha superato parseDocument');
  }
  return parsed.document;
}

/** I data-block-kind delle <section> rese, in ordine di DOM. */
function sectionKinds(root: ParentNode): string[] {
  return [...root.querySelectorAll('section[data-block-kind]')].map(
    (el) => (el as HTMLElement).getAttribute('data-block-kind') ?? '',
  );
}

describe('DE-102 AC-DE-102-1 — ogni sezione porta data-block-kind col proprio tipo, tutti diversi', () => {
  it('rende una pagina con hero + chi-siamo + offerte + orari e ogni section ha il proprio kind', async () => {
    const siteDoc = buildDocument();

    // when: rendo il documento col renderer REALE (SiteView) e il tema del catalogo sole-mediterraneo.
    const ui = await SiteView({ document: siteDoc, theme: THEMES[0], locale: 'it' });
    const container = document.createElement('div');
    render(ui, { container });

    const kinds = sectionKinds(container);

    // then: piu' di un blocco (una fixture con un solo elemento non proverebbe l'identita').
    expect(kinds.length).toBe(4); // covers: AC-DE-102-1
    // then: ogni section porta il proprio kind, in ordine — l'hero il suo, le altre il proprio.
    expect(kinds).toEqual(['hero', 'chi-siamo', 'offerte', 'orari']); // covers: AC-DE-102-1
    // then: sono TUTTI DIVERSI tra loro (l'insieme ha tanti elementi quante le sezioni).
    expect(new Set(kinds).size).toBe(4); // covers: AC-DE-102-1

    // then: la section HERO, individuata per data-block-id, porta data-block-kind="hero"; una
    // section non-hero (offerte) porta il PROPRIO kind, diverso da "hero".
    const heroSection = container.querySelector('section[data-block-id="hero"]');
    const offerteSection = container.querySelector('section[data-block-id="offerte"]');
    expect(heroSection?.getAttribute('data-block-kind')).toBe('hero'); // covers: AC-DE-102-1
    expect(offerteSection?.getAttribute('data-block-kind')).toBe('offerte'); // covers: AC-DE-102-1
    expect(offerteSection?.getAttribute('data-block-kind')).not.toBe('hero'); // covers: AC-DE-102-1
  });

  it('l ordine atteso e i kind sono davvero discordanti (contro-prova della fixture)', () => {
    // La fixture NON e' degenere: quattro kind, tutti distinti — cosi' "tutti diversi" non e' vero
    // per vacuita' su una lista di un solo elemento.
    expect(EXPECTED_KINDS.length).toBeGreaterThan(1);
    expect(new Set(EXPECTED_KINDS).size).toBe(EXPECTED_KINDS.length);
  });
});

// ── scan: nessun colore letterale inline nei blocchi e in SiteSection (AC-DE-102-2) ─────────────
// AC-DE-102-2 e' gia' sorvegliato IN AMPIEZZA da AC-231-4 (site-blocks-style.test.ts, tutta
// src/ui/site/**). Qui lo si ANCORA ai file che DE-102 tocca — SiteSection + gli otto blocchi — con
// un check COMPATTO su una lista PIATTA (blocks/ non ha sotto-cartelle), NON un secondo walk
// ricorsivo: evita un clone verbatim dello scanner (jscpd / R-04). La radice e' process.cwd()
// (vitest gira dalla radice del repo): sotto jsdom il costruttore URL globale non e' quello di Node.
const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

function inlineColorTargets(): string[] {
  const siteDir = join(process.cwd(), 'src', 'ui', 'site');
  const blocks = readdirSync(join(siteDir, 'blocks'))
    .filter((entry) => /\.(tsx?|jsx?)$/.test(entry))
    .map((entry) => join(siteDir, 'blocks', entry));
  return [...blocks, join(siteDir, 'SiteSection.tsx')];
}

describe('DE-102 AC-DE-102-2 — blocchi e SiteSection senza colori letterali inline', () => {
  it('piu di un file scansionato, nessuno con un colore letterale (hex/rgb/hsl)', () => {
    const targets = inlineColorTargets();
    // Piu' di un elemento: gli otto blocchi piu' SiteSection (una lista di uno non proverebbe nulla).
    expect(targets.length).toBeGreaterThan(1); // covers: AC-DE-102-2
    const offenders = targets.filter((file) => LITERAL_COLOR.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]); // covers: AC-DE-102-2
    // FALSIFICABILE: il predicato scatta su un letterale (assemblato a runtime) e non su un token var().
    expect(LITERAL_COLOR.test('color: ' + '#' + 'a1b')).toBe(true); // covers: AC-DE-102-2
    expect(LITERAL_COLOR.test("color: 'var(--site-color-accent)'")).toBe(false); // covers: AC-DE-102-2
  });
});

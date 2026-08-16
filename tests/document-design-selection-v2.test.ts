// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import itMessages from '../messages/it.json';
import { applyBriefUpdate, emptyBrief } from '@/domain/onboarding/brief';
import {
  resolveVariantHome,
  type VariantResolution,
} from '@/domain/generation/variant-document';
import { selectDesign } from '@/domain/generation/design-select';
import { parseDocument, type SiteDocument } from '@/domain/generation/document';
import { bodyLayoutFor } from '@/domain/generation/section-layouts';

// DV2-501 (macrotask variety-select, design-engine-v2) — ORACOLO del RIUSO DELL'AGGANCIO DI VARIETA':
// variant-document congela TUTTI gli assi v2 (theme/hero/menu + section_layout_id PER-BLOCCO del corpo +
// recipe) PIU' `vertical` nel documento, e SiteView li proietta come data-* alla radice e inoltra
// design+vertical ai blocchi (registry/SiteBlockProps), cosi' gli assi variati RAGGIUNGONO i mockup
// invece dei default. Le asserzioni DERIVANO dagli acceptance_criteria AC-DV2-501-1..3
// (docs/blueprint/design-engine-v2/05-variety-select.md); ogni EXPECT porta il tag `// covers: <AC-id>`.
//
// COSA PROVA (DV2-501): (1) il documento congelato porta gli assi di varieta' — theme/hero/menu
// versionati, section_layout_id PER-BLOCCO valido per il tipo-sezione (catalogo BODY_LAYOUTS), e
// `vertical`; (2) reso da SiteView, la radice porta i data-* degli assi e i blocchi ricevono la
// selezione (Offerte il menu congelato, non il fallback) e il vertical (il layout LOGICO segue il
// vertical, non 'altro'); i blocchi del corpo rendono il PROPRIO section_layout congelato; (3) due
// documenti con hero/menu diversi rendono data-hero-layout/data-menu-layout distinti — l'aggancio
// arriva ai mockup.
//
// COSA NON PROVA (L-COL-006 / out_of_scope DV2-501): la SELEZIONE greedy (DV2-503), l'asse ricetta nella
// matrice (DV2-502) e il requisito di materiale (DV2-504). Qui c'e' il freeze + il wiring; la varieta'
// come farthest-first e la sua misura a runtime (computed-style) sono di DV2-503 / e2e-visual-v2.

// getTranslations REALE dal catalogo it (namespace richiesto), come negli altri test di render (i blocchi
// e la chrome chiamano getTranslations e in jsdom non c'e' un contesto di richiesta next-intl). Una
// chiave assente ricade sul proprio path, cosi' un blocco senza etichetta non fa cadere il render.
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

// I TIPI-SEZIONE del CORPO che congelano un section_layout_id PER-BLOCCO (catalogo BODY_LAYOUTS): sono i
// block.id dei renderer del corpo (DV2-402/403). hero/offerte/cta-whatsapp NON sono qui — hero e menu
// hanno un asse di DOCUMENTO (hero_layout_id/menu_layout_id), non un layout per-blocco.
const BODY_SECTIONS = ['chi-siamo', 'orari', 'contatti', 'recensioni', 'faq'] as const;

// Brief RICCO, dominio REALE (vertical 'ristorazione'): i blocchi di home esistono, cosi' la home e' NON
// vuota. DISCIPLINA FIXTURE: PIU' di un elemento, valori DISCORDANTI, e un id che e' PREFISSO di un altro
// (tre offerte, 'Antipasto' PREFISSO di 'Antipasto della casa'). Copiato dalla fixture di
// variant-document-design.test.ts (DE-206), la sede sorella del freeze.
const RICH_BRIEF = applyBriefUpdate(emptyBrief('it'), {
  business_name: 'Trattoria Aurora',
  vertical: 'ristorazione',
  description: 'Cucina di mercato nel centro storico, aperta dal 1980.',
  whatsapp: '+39 333 4445566',
  phone: '+39 06 5551234',
  address: 'Via Verdi 12, Roma',
  hours: { 'lun-ven': '12:00-15:00', sab: '19:00-23:00' },
  offerings: [
    { name: 'Antipasto', section: 'Cucina' },
    { name: 'Antipasto della casa', section: 'Cucina' },
    { name: 'Dolce', section: 'Dessert' },
  ],
}).brief;

// Un pool 'home' che riempie TUTTI gli slot dei blocchi della home con valori DISCORDANTI, cosi' nessun
// blocco viene scartato da `resolve` e la home e' valida per `parseDocument`.
function homePool(firma: string): { pages: { home: Record<string, unknown> } } {
  return {
    pages: {
      home: {
        hero_title_kicker: `Occhiello ${firma}`,
        hero_title: `Titolo hero ${firma}`,
        hero_subtitle: `Sottotitolo hero ${firma}`,
        offerings_title: `Le nostre offerte ${firma}`,
        offerings_intro: `Introduzione alle offerte ${firma}`,
        about_title: `Chi siamo ${firma}`,
        about_body: `La nostra storia ${firma}`,
        about_points: [`Primo punto ${firma}`, `Secondo punto ${firma}`],
        hours_title: `I nostri orari ${firma}`,
        hours_intro: `Nota sugli orari ${firma}`,
        contact_title: `Contattaci ${firma}`,
        contact_intro: `Scrivici per informazioni ${firma}`,
        faq_title: `Domande frequenti ${firma}`,
        faq_items: [
          { question: `Prima domanda ${firma}?`, answer: `Prima risposta ${firma}` },
          { question: `Seconda domanda ${firma}?`, answer: `Seconda risposta ${firma}` },
        ],
        whatsapp_cta_title: `Scrivici su WhatsApp ${firma}`,
      },
    },
  };
}

const SHARED_POOL = homePool('condiviso');
const SEED = '11111111-1111-4111-8111-111111111111';

/** La risoluzione congelata (recipe/theme/document) della variante `i`, o lancia se null. */
function frozenResolved(seed: string, i: number): VariantResolution {
  const resolved = resolveVariantHome(SHARED_POOL, RICH_BRIEF, seed, i);
  if (resolved === null) {
    throw new Error(`resolveVariantHome ha ritornato null per (seed=${seed}, i=${i})`);
  }
  return resolved;
}

/** Il documento congelato della variante `i`. */
function frozenDoc(seed: string, i: number): SiteDocument {
  return frozenResolved(seed, i).document;
}

/** Rende una risoluzione col renderer REALE (SiteView) e ritorna container + radice `.site-view`. */
async function renderResolved(resolved: VariantResolution) {
  const ui = await SiteView({ document: resolved.document, theme: resolved.theme, locale: 'it' });
  const { container } = render(ui);
  const root = container.querySelector('.site-view');
  if (root === null) throw new Error('nessuna radice .site-view resa');
  return { container, root: root as HTMLElement };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-501-1 — il documento congelato porta TUTTI gli assi di varieta' v2 + vertical.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-501 AC-DV2-501-1 — variant-document congela gli assi v2 + vertical', () => {
  it('congela theme/hero/menu versionati, recipe, vertical, e section_layout_id PER-BLOCCO valido', () => {
    const doc = frozenDoc(SEED, 0); // covers: AC-DV2-501-1

    // Gli assi di DOCUMENTO sono id VERSIONATI 'nome@N' (li ha appena accettati parseDocument).
    expect(doc.recipe_id).toMatch(/@\d+$/); // covers: AC-DV2-501-1
    expect(doc.theme_id).toMatch(/@\d+$/); // covers: AC-DV2-501-1
    expect(doc.hero_layout_id).toMatch(/@\d+$/); // covers: AC-DV2-501-1
    // menu_layout_id CONGELATO (non piu' undefined -> fallback): presente, versionato, = quello della
    // selezione per (vertical, seed, 0). Il cross-check con selectDesign prova il WIRING del freeze.
    const sel = selectDesign(RICH_BRIEF.vertical, SEED, 0);
    expect(doc.menu_layout_id).toBeDefined(); // covers: AC-DV2-501-1
    expect(doc.menu_layout_id).toMatch(/@\d+$/); // covers: AC-DV2-501-1
    expect(doc.menu_layout_id).toBe(sel.menu_layout_id); // covers: AC-DV2-501-1

    // `vertical` congelato nel documento (l'asse che SiteView inoltra ai blocchi — non e' in
    // brief_fields_rendered di offerte, quindi NON arriva via block.data).
    expect(doc.vertical).toBe('ristorazione'); // covers: AC-DV2-501-1

    // section_layout_id PER-BLOCCO: ogni blocco del CORPO presente nella home porta un id versionato che
    // e' una variante di catalogo (BODY_LAYOUTS) del PROPRIO tipo-sezione — non il fallback interno del
    // renderer, ma un valore congelato dal freeze.
    const home = doc.pages[0];
    const bodyBlocks = home.blocks.filter((b) =>
      (BODY_SECTIONS as readonly string[]).includes(b.id),
    );
    // Anti-vacuita': la home ha PIU' di una sezione di corpo, altrimenti l'asserzione passerebbe a vuoto.
    expect(bodyBlocks.length).toBeGreaterThanOrEqual(2); // covers: AC-DV2-501-1
    for (const b of bodyBlocks) {
      expect(b.section_layout_id, b.id).toBeDefined(); // covers: AC-DV2-501-1
      expect(b.section_layout_id, b.id).toMatch(/@\d+$/); // covers: AC-DV2-501-1
      const layout = bodyLayoutFor(b.section_layout_id as string);
      expect(layout, b.id).toBeDefined(); // covers: AC-DV2-501-1 — id di catalogo reale
      expect(layout?.section, b.id).toBe(b.id); // covers: AC-DV2-501-1 — del tipo-sezione giusto
    }

    // Il freeze e' MIRATO: i blocchi che hanno un asse di DOCUMENTO (hero, offerte) NON ricevono un
    // section_layout_id per-blocco (uccide un freeze "a tappeto" che glielo assegnasse per errore).
    const offerteBlk = home.blocks.find((b) => b.id === 'offerte');
    expect(offerteBlk, 'la home ha un blocco offerte').toBeDefined(); // covers: AC-DV2-501-1
    expect(offerteBlk?.section_layout_id).toBeUndefined(); // covers: AC-DV2-501-1
    const heroBlk = home.blocks.find((b) => b.id === 'hero');
    expect(heroBlk, 'la home ha un blocco hero').toBeDefined(); // covers: AC-DV2-501-1
    expect(heroBlk?.section_layout_id).toBeUndefined(); // covers: AC-DV2-501-1
  });

  it('deterministico: stessi (seed, variantIndex) -> documento congelato IDENTICO', () => {
    // Nessun Date/Math.random nel percorso del freeze: la scelta per-blocco e' seminata dal solo seed.
    expect(frozenDoc(SEED, 2)).toEqual(frozenDoc(SEED, 2)); // covers: AC-DV2-501-1
  });

  it('re-passa parseDocument: il documento congelato coi campi nuovi resta GATED', () => {
    const doc = frozenDoc(SEED, 1);
    const regate = parseDocument(doc);
    expect(regate.ok).toBe(true); // covers: AC-DV2-501-1
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-501-2 — SiteView proietta gli assi alla radice e i blocchi ricevono design+vertical.
// ─────────────────────────────────────────────────────────────────────────────

describe('DV2-501 AC-DV2-501-2 — SiteView proietta gli assi e inoltra design+vertical ai blocchi', () => {
  it('radice coi data-* congelati; Offerte riceve il menu congelato E il vertical; il corpo il proprio layout', async () => {
    const resolved = frozenResolved(SEED, 0);
    const doc = resolved.document;
    const { container, root } = await renderResolved(resolved);

    // La radice del render porta gli assi di DESIGN come data-* (i valori CONGELATI, non i default).
    expect(root.getAttribute('data-hero-layout')).toBe(doc.hero_layout_id); // covers: AC-DV2-501-2
    expect(root.getAttribute('data-menu-layout')).toBe(doc.menu_layout_id); // covers: AC-DV2-501-2

    // Il blocco menu RICEVE la selezione (menu_layout_id) via prop: la sua radice porta lo STESSO id
    // congelato del documento — non il fallback 'menu-griglia@1' che userebbe senza freeze.
    const menuRoot = container.querySelector('.site-menu-v2');
    expect(menuRoot).not.toBeNull(); // covers: AC-DV2-501-2
    expect(menuRoot!.getAttribute('data-menu-layout')).toBe(doc.menu_layout_id); // covers: AC-DV2-501-2

    // Il blocco menu RICEVE il vertical via prop: il layout LOGICO segue il vertical 'ristorazione'
    // (menu-sections), non la variante generica 'simple-list' di 'altro'. Se il vertical NON arrivasse
    // al blocco (oggi non e' in block.data), questo attributo sarebbe 'simple-list'.
    expect(menuRoot!.getAttribute('data-offerings-layout')).toBe('menu-sections'); // covers: AC-DV2-501-2

    // Ogni blocco del CORPO rende il PROPRIO section_layout congelato (data-section-layout = l'id nel
    // documento), non il fallback interno del renderer: il wiring per-blocco arriva al DOM.
    const bodyBlocks = doc.pages[0].blocks.filter((b) =>
      (BODY_SECTIONS as readonly string[]).includes(b.id),
    );
    expect(bodyBlocks.length).toBeGreaterThanOrEqual(2); // covers: AC-DV2-501-2
    for (const b of bodyBlocks) {
      const el = container.querySelector(`[data-block-id="${b.id}"]`);
      expect(el, b.id).not.toBeNull(); // covers: AC-DV2-501-2
      expect(el!.getAttribute('data-section-layout'), b.id).toBe(b.section_layout_id); // covers: AC-DV2-501-2
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-501-3 — due documenti con hero/menu diversi rendono data-hero-layout/-menu-layout distinti.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cerca in modo DETERMINISTICO due varianti (dello stesso seed) i cui hero_layout_id E menu_layout_id
 * siano ENTRAMBI diversi — la precondizione ESPLICITA di AC-DV2-501-3. Fallisce forte se non trova una
 * coppia (segnale, non pass silenzioso). Nessun Date/Math.random: i seed sono stringhe fisse.
 */
function coppiaHeroMenuDistinti(): { a: VariantResolution; b: VariantResolution } {
  for (let s = 0; s < 30; s += 1) {
    const a = frozenResolved(`coppia-${s}`, 0);
    for (let i = 1; i < 5; i += 1) {
      const b = frozenResolved(`coppia-${s}`, i);
      if (
        a.document.hero_layout_id !== b.document.hero_layout_id &&
        a.document.menu_layout_id !== undefined &&
        b.document.menu_layout_id !== undefined &&
        a.document.menu_layout_id !== b.document.menu_layout_id
      ) {
        return { a, b };
      }
    }
  }
  throw new Error('nessuna coppia di varianti con hero E menu distinti (materiale insufficiente?)');
}

describe('DV2-501 AC-DV2-501-3 — hero/menu diversi -> data-hero-layout/-menu-layout distinti nel render', () => {
  it('due documenti congelati con hero/menu diversi rendono attributi radice distinti (aggancio ai mockup)', async () => {
    const { a, b } = coppiaHeroMenuDistinti();
    // Precondizione ESPLICITA: i due documenti differiscono su hero E menu (senza di essa il test
    // passerebbe anche se il render ignorasse gli assi).
    expect(a.document.hero_layout_id).not.toBe(b.document.hero_layout_id); // covers: AC-DV2-501-3
    expect(a.document.menu_layout_id).not.toBe(b.document.menu_layout_id); // covers: AC-DV2-501-3

    const rootA = (await renderResolved(a)).root;
    const rootB = (await renderResolved(b)).root;

    // Il render riflette gli assi congelati DISTINTI: la varieta' arriva ai mockup, non resta nel dato.
    expect(rootA.getAttribute('data-hero-layout')).toBe(a.document.hero_layout_id); // covers: AC-DV2-501-3
    expect(rootB.getAttribute('data-hero-layout')).toBe(b.document.hero_layout_id); // covers: AC-DV2-501-3
    expect(rootA.getAttribute('data-hero-layout')).not.toBe(rootB.getAttribute('data-hero-layout')); // covers: AC-DV2-501-3
    expect(rootA.getAttribute('data-menu-layout')).not.toBe(rootB.getAttribute('data-menu-layout')); // covers: AC-DV2-501-3

    // E il CORPO diverge: almeno una sezione di corpo rende un data-section-layout diverso fra i due
    // documenti (la prova che la varieta' del corpo — non solo hero/menu — raggiunge il mockup).
    const layoutFor = (root: HTMLElement, id: string) =>
      root.querySelector(`[data-block-id="${id}"]`)?.getAttribute('data-section-layout') ?? null;
    const corpoDiverge = BODY_SECTIONS.some((id) => {
      const la = layoutFor(rootA, id);
      const lb = layoutFor(rootB, id);
      return la !== null && lb !== null && la !== lb;
    });
    expect(corpoDiverge).toBe(true); // covers: AC-DV2-501-3
  });
});

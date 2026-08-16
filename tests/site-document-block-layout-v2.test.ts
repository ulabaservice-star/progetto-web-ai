import { describe, it, expect } from 'vitest';
import { parseDocument, type SiteDocument } from '@/domain/generation/document';

// DV2-401 (macrotask body-sections, design-engine-v2) — IL WIRING PER-BLOCCO di `section_layout_id`.
// A differenza di hero/menu (un solo blocco → un asse a livello DOCUMENTO), il corpo ha sezioni
// ETEROGENEE (chi-siamo, recensioni, faq, orari, contatti): un solo `section_layout_id` di documento non
// puo' descrivere layout diversi. Decisione DS-V2-D11: `section_layout_id` diventa un campo OPZIONALE del
// BLOCCO (BlockSchema), cosi' ogni sezione del corpo congela il PROPRIO layout. Nessun default per-blocco
// (un default sarebbe di settore): assente resta assente e il renderer cade sul proprio fallback. Il
// congelamento PIENO in generazione lo scrive variety-select (DV2-503); qui il documento lo ACCETTA.
//
// Le asserzioni derivano dalla decisione e dallo schema (VersionedIdSchema di document.ts):
// il gate accetta e PRESERVA un id versionato per-blocco, RIFIUTA una forma non versionata (o non
// stringa), e non fabbrica un default. Il lato ATTESO e' un letterale scritto qui: un campo mancante
// nello schema (strict) rende ROSSO il primo test, non verde per tautologia.

/**
 * Un documento one-pager MINIMO e valido, costruito come oggetto grezzo (input non fidato di
 * `parseDocument`): un solo blocco 'chi-siamo' con gli slot del corpo. La copia e' fresca a ogni
 * chiamata (nessuno stato condiviso fra i test).
 */
function baseDoc(): Record<string, unknown> {
  return {
    recipe_id: 'ricetta-base@1',
    theme_id: 'trattoria-rustica@1',
    pages: [
      {
        slug: 'home',
        role: 'home',
        title: 'Osteria del Borgo',
        meta_description: 'La cucina di casa dal 1962, nel cuore del borgo.',
        blocks: [
          {
            id: 'chi-siamo',
            content: {
              about_title: 'Chi siamo',
              about_body: 'Tre generazioni dietro lo stesso banco.',
              about_points: ['Pasta fatta in casa', 'Forno a legna'],
            },
            data: {},
            brief_fields_rendered: [],
            images: [],
          },
        ],
      },
    ],
  };
}

/** Il base doc col primo blocco che porta un `section_layout_id` (o un valore ostile) per-blocco. */
function conLayoutDiBlocco(sectionLayoutId: unknown): Record<string, unknown> {
  const doc = baseDoc();
  const blocco = (doc.pages as { blocks: Record<string, unknown>[] }[])[0].blocks[0];
  blocco.section_layout_id = sectionLayoutId;
  return doc;
}

function accettato(res: ReturnType<typeof parseDocument>): SiteDocument {
  if (!res.ok) throw new Error(`il documento doveva validare: ${JSON.stringify(res.error.issues)}`);
  return res.document;
}

function rifiutato(res: ReturnType<typeof parseDocument>) {
  if (res.ok) throw new Error(`il documento NON doveva validare: ${JSON.stringify(res.document)}`);
  return res.error.issues;
}

describe('DV2-401 (body-sections) · section_layout_id PER-BLOCCO nel gate', () => {
  it('accetta un section_layout_id versionato per-blocco e lo PRESERVA sul blocco', () => {
    const documento = accettato(parseDocument(conLayoutDiBlocco('chi-siamo-timeline@1')));
    const blocco = documento.pages[0].blocks[0];
    expect(blocco.section_layout_id).toBe('chi-siamo-timeline@1'); // covers: wiring DV2-401
  });

  it('un blocco SENZA section_layout_id resta senza: nessun default per-blocco fabbricato', () => {
    const documento = accettato(parseDocument(baseDoc()));
    // A differenza del section_layout_id di DOCUMENTO (che ha un default nel gate), il campo PER-BLOCCO
    // non ha default: un default per-blocco sarebbe di settore. Assente deve restare assente.
    expect(documento.pages[0].blocks[0].section_layout_id).toBeUndefined(); // covers: wiring DV2-401
  });

  it('RIFIUTA un section_layout_id non versionato (senza @N): non e un id congelabile', () => {
    const issues = rifiutato(parseDocument(conLayoutDiBlocco('chi-siamo-timeline')));
    expect(issues.length, 'un id senza @N doveva essere rifiutato').toBeGreaterThan(0); // covers: wiring DV2-401
  });

  it('RIFIUTA un section_layout_id non stringa (numero)', () => {
    rifiutato(parseDocument(conLayoutDiBlocco(42))); // covers: wiring DV2-401
  });

  it('lo schema resta STRICT: una chiave di blocco ignota resta rifiutata', () => {
    const doc = baseDoc();
    const blocco = (doc.pages as { blocks: Record<string, unknown>[] }[])[0].blocks[0];
    blocco.non_esiste = 'x';
    rifiutato(parseDocument(doc)); // covers: wiring DV2-401 (additivita' non allarga lo strict)
  });
});

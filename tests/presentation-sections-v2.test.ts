import { describe, it, expect } from 'vitest';
import { parseDocument, type SiteDocument } from '@/domain/generation/document';
import { withPresentationSections } from '@/domain/generation/presentation';

// DV2-402/AC-402-3 (macrotask body-sections-a) — LA COMPOSIZIONE DI PRESENTAZIONE. Le asserzioni DERIVANO
// dall'acceptance_criteria AC-DV2-402-3 e dalla decisione DS-V2-D11 #3: la composizione del documento
// mockup INCLUDE i blocchi recensioni/faq (che rendono lo scheletro), cosi' le sezioni non restano vuote;
// `blocksFor`/`generatable` (il gate di costo) restano INTATTI (provato nei loro file di test, che non
// cambiano). Qui si prova la funzione PURA: inclusione, idempotenza per id, immutabilita', re-gate.

/** Un documento valido con una home che porta i blocchi indicati (per id). */
function docConHome(homeBlockIds: readonly string[]): SiteDocument {
  const input = {
    recipe_id: 'ricetta-base@1',
    theme_id: 'trattoria-rustica@1',
    pages: [
      {
        slug: 'home',
        role: 'home',
        title: 'Osteria del Borgo',
        meta_description: 'La cucina di casa dal 1962, nel cuore del borgo.',
        blocks: homeBlockIds.map((id) => ({
          id,
          content: {},
          data: {},
          brief_fields_rendered: [],
          images: [],
        })),
      },
    ],
  };
  const res = parseDocument(input);
  if (!res.ok) throw new Error(`fixture non valida: ${JSON.stringify(res.error.issues)}`);
  return res.document;
}

function homeBlockIds(doc: SiteDocument): string[] {
  const home = doc.pages.find((p) => p.role === 'home');
  return (home?.blocks ?? []).map((b) => b.id);
}

describe('DV2-402/AC-402-3 · withPresentationSections (composizione del documento mockup)', () => {
  // covers: AC-DV2-402-3
  it('aggiunge recensioni E faq alla home quando mancano, cosi le sezioni non restano vuote', () => {
    const base = docConHome(['hero', 'chi-siamo', 'contatti']);
    const result = withPresentationSections(base);
    const ids = homeBlockIds(result);
    expect(ids).toContain('recensioni'); // covers: AC-DV2-402-3
    expect(ids).toContain('faq'); // covers: AC-DV2-402-3
    // Gli originali restano, nel loro ordine, e le sezioni nuove sono in coda.
    expect(ids.slice(0, 3)).toEqual(['hero', 'chi-siamo', 'contatti']); // covers: AC-DV2-402-3
  });

  // covers: AC-DV2-402-3
  it('e IDEMPOTENTE per id: una FAQ gia presente (faq_items reali) non viene duplicata', () => {
    const base = docConHome(['hero', 'faq']);
    const result = withPresentationSections(base);
    const ids = homeBlockIds(result);
    // faq resta UNA sola (non duplicata), e recensioni viene aggiunta.
    expect(ids.filter((id) => id === 'faq').length, 'faq duplicata').toBe(1); // covers: AC-DV2-402-3
    expect(ids).toContain('recensioni'); // covers: AC-DV2-402-3
  });

  it('e IMMUTABILE: il documento di ingresso non viene mutato', () => {
    const base = docConHome(['hero', 'chi-siamo']);
    const primaIds = homeBlockIds(base);
    withPresentationSections(base);
    expect(homeBlockIds(base), 'ingresso mutato').toEqual(primaIds);
  });

  it('il documento risultante passa ANCORA parseDocument (i blocchi scheletro sono validi)', () => {
    const base = docConHome(['hero', 'chi-siamo', 'contatti']);
    const result = withPresentationSections(base);
    const res = parseDocument(result);
    expect(res.ok, res.ok ? '' : JSON.stringify(res.error.issues)).toBe(true);
  });

  it('rispetta il tetto di blocchi per pagina: non aggiunge oltre blocks_per_page', () => {
    // Home GIA' piena (12 blocchi, il tetto DOCUMENT_LIMITS.blocks_per_page): non c'e' spazio, nessuna
    // aggiunta (un blocco oltre il tetto farebbe rifiutare il documento dal gate).
    const dodici = Array.from({ length: 12 }, (_, i) => `blocco-${i}`);
    const base = docConHome(dodici);
    const result = withPresentationSections(base);
    expect(homeBlockIds(result).length).toBe(12);
    expect(result).toBe(base); // nessuna aggiunta → ritorna l'ingresso invariato
  });

  it('senza pagina home ritorna il documento invariato (nessuna casa dove ospitarle)', () => {
    // Un documento le cui pagine non hanno ruolo 'home' e' fuori contratto per parseDocument (la home e'
    // imposta), quindi si costruisce a mano un SiteDocument-like per esercitare la difesa.
    const senzaHome = {
      recipe_id: 'r@1',
      theme_id: 't@1',
      pages: [{ slug: 'x', role: 'faq', title: 'x', meta_description: 'x', blocks: [{ id: 'faq', content: {}, data: {}, brief_fields_rendered: [], images: [] }] }],
    } as unknown as SiteDocument;
    expect(withPresentationSections(senzaHome)).toBe(senzaHome);
  });
});

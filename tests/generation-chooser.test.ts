// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import itMessages from '../messages/it.json';
import { selectDesign } from '@/domain/generation/design-select';
import { applyBriefUpdate, emptyBrief } from '@/domain/onboarding/brief';

// T-232 (macrotask generation-ui, P2) — ORACOLO del SELETTORE dei cinque mockup. Le asserzioni
// derivano da AC-232-1, AC-232-2 e AC-232-4 (04-generation-ui.md), taggate
// `// covers: AC-232-<n>` sulla riga dell'EXPECT.
//
// COSA SI MOCKA E PERCHE' NON E' HOLLOW:
//  - next-intl/server getTranslations: risolve dal catalogo REALE it (namespace 'site'), cosi'
//    i blocchi rendono con le etichette autentiche. E' l'unico I/O dei blocchi (T-231).
//  - next/navigation useRouter: il RegenerateButton (client) lo usa; qui non si clicca.
//  - @/data/generation-pools readHomePools: il seam di lettura dei pool. Il RENDERER (SiteView,
//    resolve, pages, blocks, temi) gira PER DAVVERO sul brief e sul pool reali.
//  - @/data/generation-regenerate regenerateVariant: il seam dell'azione, mai chiamato qui.
//  - @/data/anthropic runGenerationTurn: il CONFINE. Non e' nel percorso di render — e' mockato
//    proprio per PROVARE che rendere e cambiare variante non lo tocca (AC-232-4).
//
// PROPRIETA' PINNATE oltre agli AC:
//  - la card passa dallo STESSO renderer dell'anteprima (SiteView): la sequenza di id-blocco
//    (`data-block-id`, esposta da SiteSection, T-231) e' identica fra card e SiteView diretto.
//  - le cinque sequenze differiscono per PRESENZA/ORDINE di un blocco, non solo per il tema: la
//    sequenza di id-blocco e' indipendente dal tema, quindi ogni sua differenza e' strutturale.

const { getTranslationsMock } = vi.hoisted(() => ({
  getTranslationsMock: vi.fn(),
}));
vi.mock('next-intl/server', () => ({
  getTranslations: getTranslationsMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {} }),
}));

const { readHomePoolsSpy, poolsHolder } = vi.hoisted(() => {
  const holder = { current: { ok: true, shared: null as unknown, byVariant: {} as Record<number, unknown> } };
  return { poolsHolder: holder, readHomePoolsSpy: vi.fn(async () => holder.current) };
});
vi.mock('@/data/generation-pools', () => ({ readHomePools: readHomePoolsSpy }));

const { regenerateSpy } = vi.hoisted(() => ({ regenerateSpy: vi.fn(async () => ({ ok: true, poolId: 'p' })) }));
vi.mock('@/data/generation-regenerate', () => ({ regenerateVariant: regenerateSpy }));

const { boundarySpy } = vi.hoisted(() => ({ boundarySpy: vi.fn() }));
vi.mock('@/data/anthropic', () => ({ runGenerationTurn: boundarySpy }));

// Import DOPO i mock (vi.mock e' hoisted).
import { GenerationChooser } from '@/ui/generation/GenerationChooser';
import { VariantCard } from '@/ui/generation/VariantCard';
import { SiteView } from '@/ui/site/SiteView';
import { resolveVariantHome } from '@/domain/generation/variant-document';

// getTranslations REALE dal catalogo it, namespace 'site': una chiave assente ricade sul suo
// path, cosi' un blocco senza etichetta non fa cadere il render.
function realTranslations({ namespace }: { locale: string; namespace: string }) {
  const ns = ((itMessages as Record<string, unknown>)[namespace] ?? {}) as Record<string, unknown>;
  return (key: string) => {
    const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ns);
    return typeof value === 'string' ? value : `${namespace}.${key}`;
  };
}

// Brief RICCO, dominio REALE: sette blocchi di home esistono (hero, offerte, chi-siamo, orari,
// contatti, faq, cta-whatsapp), quindi le cinque direzioni compongono home DIVERSE. Valori
// DISCORDANTI: due chiavi orario diverse, tre offerte di cui una il PREFISSO di un'altra
// ('Antipasto' / 'Antipasto della casa').
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

// Un pool 'home' che riempie TUTTI gli slot dei blocchi della home con valori DISCORDANTI, cosi'
// nessun blocco viene scartato da `resolve` e ogni direzione rende i propri. La firma distingue
// il pool condiviso da quello di una variante. Gli id di slot portano la coppia PREFISSO del
// catalogo ('hero_title' e' prefisso di 'hero_title_kicker', T-201).
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

// Il SEED della generazione (id STABILE, opaco): da DE-206 card e resolveVariantHome derivano la
// selezione visiva da (brief.vertical, seed, variantIndex). Con lo STESSO seed e indice, card e
// anteprima compongono la STESSA home (identita' di AC-232-1).
const SEED = 'gen-chooser-1';

/** La sequenza degli id-blocco resi (in ordine di DOM), da `data-block-id` di SiteSection. */
function blockSeq(root: ParentNode): string[] {
  return [...root.querySelectorAll('[data-block-id]')].map(
    (el) => (el as HTMLElement).getAttribute('data-block-id') ?? '',
  );
}

beforeEach(() => {
  getTranslationsMock.mockImplementation(async (opts: { locale: string; namespace: string }) =>
    realTranslations(opts),
  );
  poolsHolder.current = { ok: true, shared: SHARED_POOL, byVariant: {} };
  readHomePoolsSpy.mockClear();
  regenerateSpy.mockClear();
  boundarySpy.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('T-232 selettore dei cinque mockup', () => {
  // covers: AC-232-1
  it('card e anteprima sullo stesso documento: sequenza di id-blocco IDENTICA (stesso renderer)', async () => {
    // given: un pool e la sua variante 0 (design da selectDesign(vertical, SEED, 0), DE-206)
    const resolved = resolveVariantHome(SHARED_POOL, RICH_BRIEF, SEED, 0);
    expect(resolved).not.toBeNull();

    // when: rendo la CARD della variante (VariantCard) col MEDESIMO seed e indice …
    const cardEl = await VariantCard({
      pool: SHARED_POOL,
      brief: RICH_BRIEF,
      locale: 'it',
      seed: SEED,
      variantIndex: 0,
    });
    const cardContainer = document.createElement('div');
    render(cardEl, { container: cardContainer });
    const cardSeq = blockSeq(cardContainer);

    // … e l'ANTEPRIMA (SiteView, il renderer di T-235) sullo STESSO documento risolto.
    const previewEl = await SiteView({
      document: resolved!.document,
      theme: resolved!.theme,
      locale: 'it',
    });
    const previewContainer = document.createElement('div');
    render(previewEl, { container: previewContainer });
    const previewSeq = blockSeq(previewContainer);

    // then: le due sequenze sono identiche e non vuote — card e anteprima passano dallo stesso
    // renderer, quindi cio' che l'utente scegle e' cio' che ottiene per costruzione.
    expect(cardSeq.length).toBeGreaterThan(0); // covers: AC-232-1
    expect(cardSeq).toEqual(previewSeq); // covers: AC-232-1
    // La prima sezione e' l'apertura hero: ancora la sequenza a un valore noto.
    expect(cardSeq[0]).toBe('hero'); // covers: AC-232-1
  });

  // covers: AC-232-2
  it('le cinque card NON hanno tutte la stessa sequenza: cambia presenza/ordine di un blocco, non solo il tema', async () => {
    // given: un pool ricco condiviso; when: rendo il selettore intero (cinque card)
    const ui = await GenerationChooser({
      siteId: 'site-1',
      generationId: 'gen-1',
      brief: RICH_BRIEF,
      locale: 'it',
      labels: { regenerate: 'Rigenera', unavailable: 'Non disponibile' },
    });
    render(ui);

    // then: esattamente CINQUE card, una per direzione. Il 5 e' LETTERALE (P2-D1: cinque
    // direzioni scelte da NOI, ne' piu' ne' meno), NON `RECIPES.length`: legare l'atteso alla
    // stessa sorgente resa e' tautologico — ridurre RECIPES a quattro terrebbe verde
    // `toBe(RECIPES.length)` mentre `toBe(5)` cade, ed e' precisamente la mutazione che deve
    // essere presa.
    const cards = [...document.querySelectorAll('[data-variant-index]')];
    expect(cards.length).toBe(5); // covers: AC-232-2

    const seqByVariant = new Map<number, string[]>();
    for (const card of cards) {
      const idx = Number((card as HTMLElement).dataset.variantIndex);
      seqByVariant.set(idx, blockSeq(card));
    }
    // Ogni card ha reso almeno un blocco (il pool riempie gli slot: nessuna card vuota).
    for (const seq of seqByVariant.values()) expect(seq.length).toBeGreaterThan(0); // covers: AC-232-2

    // then: la sequenza di id-blocco e' INDIPENDENTE dal tema, quindi sequenze diverse provano una
    // differenza STRUTTURALE (presenza/ordine di un blocco), non cromatica. Da DE-206 le cinque
    // varianti ricevono cinque RICETTE distinte (rotazione seminata di selectDesign su RECIPES),
    // quindi le cinque sequenze sono MUTUAMENTE distinte — non piu' "variante 0 = vetrina" (dipende
    // dal seed), ma resta vero per COSTRUZIONE che le cinque direzioni sono cinque e diverse.
    const seqs = [...seqByVariant.values()];
    const firme = seqs.map((seq) => seq.join(','));
    expect(new Set(firme).size).toBe(5); // covers: AC-232-2

    // Ancoraggio STRUTTURALE e SEED-INDIPENDENTE: fra le cinque direzioni ne esiste ESATTAMENTE UNA
    // ('scatto-alla-conversione') che rinuncia alla sezione FAQ nella home; le altre quattro la
    // portano. Poiche' la rotazione assegna TUTTE e cinque le ricette, fra le cinque card UNA SOLA
    // manca di 'faq' e QUATTRO la hanno — qualunque sia il seed. E' una differenza di PRESENZA di un
    // blocco (strutturale), non di colore.
    expect(seqs.filter((seq) => !seq.includes('faq')).length).toBe(1); // covers: AC-232-2
    expect(seqs.filter((seq) => seq.includes('faq')).length).toBe(4); // covers: AC-232-2
  });

  // covers: AC-232-4
  it('cambiare la VARIANTE mostrata (stesso seed, indice diverso): ZERO chiamate al confine, la card si aggiorna', async () => {
    // given: lo stesso pool e seed, DUE varianti diverse. Da DE-206 la ricetta e il tema di una card
    // NASCONO da selectDesign(vertical, seed, variantIndex) — non piu' passati da fuori — quindi
    // "cambiare cio' che la card mostra" e' cambiare la VARIANTE, non iniettare una ricetta.
    const cardA = await VariantCard({
      pool: SHARED_POOL,
      brief: RICH_BRIEF,
      locale: 'it',
      seed: SEED,
      variantIndex: 0,
    });
    const containerA = document.createElement('div');
    render(cardA, { container: containerA });

    const cardB = await VariantCard({
      pool: SHARED_POOL,
      brief: RICH_BRIEF,
      locale: 'it',
      seed: SEED,
      variantIndex: 1,
    });
    const containerB = document.createElement('div');
    render(cardB, { container: containerB });

    // then: rendere e cambiare variante NON tocca il confine — il render e' puro.
    // pin (GUARDIA DEBOLE, dichiarata): che `boundarySpy` non venga chiamato e' vero PER
    // COSTRUZIONE, non per sorveglianza. Il percorso di render (VariantCard -> SiteView ->
    // registry) non IMPORTA affatto `@/data/anthropic`, quindi lo spy non verrebbe chiamato
    // qualunque cosa si muti in questo test: la riga non cadrebbe mai, ed e' percio' un oracolo
    // debole. L'invariante REALE — nessun modulo del percorso di render raggiunge il confine —
    // e' oracolato dove vive davvero: tests/anthropic-boundary.test.ts (T-131, le dieci forme
    // d'import vietate sui layer client, src/ui/** compreso) e
    // tests/generation-boundary-import-guard.test.ts (T-224). L'assert resta come promemoria
    // della proprieta', non come sua prova.
    expect(boundarySpy).not.toHaveBeenCalled(); // covers: AC-232-4

    // then: la card mostra il TEMA RISOLTO della sua variante (da selectDesign, disaccoppiato dalla
    // ricetta, DS-D3): il `data-variant-theme` di ciascuna coincide con la selezione della PROPRIA
    // variante, non con un `recipe.theme_id` passato da fuori.
    const selA = selectDesign(RICH_BRIEF.vertical, SEED, 0);
    const selB = selectDesign(RICH_BRIEF.vertical, SEED, 1);
    const themeA = (containerA.querySelector('[data-variant-theme]') as HTMLElement).dataset.variantTheme;
    const themeB = (containerB.querySelector('[data-variant-theme]') as HTMLElement).dataset.variantTheme;
    expect(themeA).toBe(selA.theme_id); // covers: AC-232-4
    expect(themeB).toBe(selB.theme_id); // covers: AC-232-4

    // then: la card si e' AGGIORNATA — due varianti ricevono due RICETTE distinte (rotazione
    // seminata), quindi la sequenza di blocchi (indipendente dal tema) cambia.
    expect(blockSeq(containerA)).not.toEqual(blockSeq(containerB)); // covers: AC-232-4
  });
});

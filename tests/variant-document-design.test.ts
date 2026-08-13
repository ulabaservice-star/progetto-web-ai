// DE-206 (macrotask design-select) — ORACOLO del WIRING di `resolveVariantHome` col selettore design.
// Le asserzioni derivano DIRETTAMENTE dagli acceptance_criteria AC-DE-206-1/2/3 di
// docs/blueprint/design-engine/02-design-select.md, taggate `// covers: AC-DE-206-<n>` sulla riga
// dell'EXPECT.
//
// COSA PROVA (DE-206): `resolveVariantHome(pool, brief, seed, variantIndex)` ottiene la
// `DesignSelection` da `selectDesign(brief.vertical, seed, variantIndex)`, risolve recipe/theme dagli
// id, compone la home, CONGELA la tupla (hero_layout_id/section_treatment_id/effect_level/ornament_id)
// nel documento e la fa passare da `parseDocument`. Dominio PURO: nessun React, nessun I/O, nessun
// DB, nessun Date/Math.random — il seed e' un identificatore STABILE della generazione (opaco), mai
// testo libero del brief (P2-D1, anti-injection): l'unico ingresso di settore e' `brief.vertical`
// (enum chiuso di brief.ts).
//
// PERCHE' IL CROSS-CHECK CON `selectDesign` NON E' TAUTOLOGICO: `resolveVariantHome` USA `selectDesign`
// al suo interno, ma asserire che il documento congeli ESATTAMENTE cio' che `selectDesign(vertical,
// seed, i)` produce prova il WIRING — che sia passato il vertical giusto, il seed giusto, l'indice
// giusto, e che nessun campo della tupla si perda o si sostituisca nel freeze. Cade se una qualunque
// di quelle cose e' sbagliata.

import { describe, it, expect } from 'vitest';
import { applyBriefUpdate, emptyBrief } from '@/domain/onboarding/brief';
import { resolveVariantHome } from '@/domain/generation/variant-document';
import { selectDesign } from '@/domain/generation/design-select';
import { parseDocument, type SiteDocument } from '@/domain/generation/document';

// Brief RICCO, dominio REALE (vertical 'ristorazione'): i sette blocchi di home esistono, cosi' ogni
// direzione compone una home NON vuota. DISCIPLINA FIXTURE (lezione P1): PIU' di un elemento, valori
// DISCORDANTI, e un id che e' PREFISSO di un altro — tre offerte di cui 'Antipasto' e' PREFISSO di
// 'Antipasto della casa', due chiavi orario diverse: una fixture con un solo elemento, o senza la
// trappola del prefisso, non proverebbe nulla sull'identita' di cio' che viene congelato.
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
    { name: 'Antipasto della casa', section: 'Cucina' }, // 'Antipasto' e' PREFISSO di questa
    { name: 'Dolce', section: 'Dessert' },
  ],
}).brief;

// Un pool 'home' che riempie TUTTI gli slot dei blocchi della home con valori DISCORDANTI, cosi'
// nessun blocco viene scartato da `resolve` e la home e' valida per `parseDocument`. Gli id di slot
// portano la coppia PREFISSO del catalogo ('hero_title' e' prefisso di 'hero_title_kicker', T-201).
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

// Un seed STABILE di generazione (un id opaco), come lo fornisce il CALL-SITE (DE-206: generation_id):
// mai testo libero del brief. Un uuid v4 e' la forma reale dell'id di generazione del progetto.
const SEED = '11111111-1111-4111-8111-111111111111';

// Le cinque proposte di una generazione (P2-D3, pool 0..4).
const VARIANTI = 5;

/** La chiave dello SCHELETRO STRUTTURALE congelato: hero_layout + section_treatment (l'asse "forte"
 * della varieta', DS-D2). Lo spazio-separatore non compare negli id 'nome-kebab@N', quindi la
 * concatenazione non collide. */
function skeleton(doc: SiteDocument): string {
  return `${doc.hero_layout_id}|${doc.section_treatment_id}`;
}

describe('AC-DE-206-1 — le 5 varianti congelano una DesignSelection e sono distinte su >=1 asse strutturale', () => {
  it('resolveVariantHome per i=0..4: ogni documento congela FEDELE la tupla di selectDesign, e i 5 scheletri sono distinti', () => {
    const docs: SiteDocument[] = [];
    for (let i = 0; i < VARIANTI; i += 1) {
      // given: una generazione con 5 varianti; when: resolveVariantHome per la variante i.
      const resolved = resolveVariantHome(SHARED_POOL, RICH_BRIEF, SEED, i);
      expect(resolved).not.toBeNull(); // covers: AC-DE-206-1
      const doc = resolved!.document;

      // then: il documento CONGELA la DesignSelection che il selettore produce per (vertical, seed, i)
      // — fedele, campo per campo (freeze wiring corretto: vertical/seed/indice giusti, niente perso).
      const sel = selectDesign(RICH_BRIEF.vertical, SEED, i);
      expect(doc.hero_layout_id).toBe(sel.hero_layout_id); // covers: AC-DE-206-1
      expect(doc.section_treatment_id).toBe(sel.section_treatment_id); // covers: AC-DE-206-1
      expect(doc.effect_level).toBe(sel.effect_level); // covers: AC-DE-206-1
      // la recipe NASCE DENTRO la selezione (non piu' pre-scelta): recipe_id e theme_id del documento
      // sono quelli della selezione, non di una ricetta passata da fuori.
      expect(doc.recipe_id).toBe(sel.recipe_id); // covers: AC-DE-206-1
      expect(doc.theme_id).toBe(sel.theme_id); // covers: AC-DE-206-1
      // ornament_id: congelato SE E SOLO SE la selezione lo porta (un sito puo' non avere ornamento,
      // DS-D5). Nessuna prosa fabbricata: se la selezione non lo ha, resta assente.
      expect(doc.ornament_id).toBe(sel.ornament_id); // covers: AC-DE-206-1

      // gli id congelati sono VERSIONATI 'nome-kebab@N' (li ha appena accettati parseDocument), e
      // effect_level e' l'enum L0..L4.
      expect(doc.hero_layout_id).toMatch(/@\d+$/); // covers: AC-DE-206-1
      expect(doc.section_treatment_id).toMatch(/@\d+$/); // covers: AC-DE-206-1
      expect(doc.effect_level).toMatch(/^L[0-4]$/); // covers: AC-DE-206-1
      docs.push(doc);
    }

    // then: i cinque documenti sono distinti su >=1 asse STRUTTURALE — gli scheletri (hero+treatment)
    // sono mutuamente distinti, quindi la varieta' e' nel MARKUP, non solo nel colore (DS-D2, il
    // difetto n.1 del vecchio motore: "1 layout in 5 colori").
    const scheletri = docs.map(skeleton);
    expect(new Set(scheletri).size).toBe(VARIANTI); // covers: AC-DE-206-1
  });

  it('ornament ASSENTE: se la selezione non porta ornamento, il documento non ne FABBRICA uno (DS-D5)', () => {
    // Un (seed, variante) per cui la selezione di ristorazione NON ha ornamento (precondizione
    // ESPLICITA: senza di essa il ramo "assente" del freeze non sarebbe esercitato, e una mutazione
    // tipo `selection.ornament_id ?? 'fabbricato@1'` sopravviverebbe al test).
    const SEED_SENZA_ORNAMENTO = 'gen-senza-ornamento';
    const INDEX = 4;
    const sel = selectDesign(RICH_BRIEF.vertical, SEED_SENZA_ORNAMENTO, INDEX);
    expect(sel.ornament_id, 'precondizione: la selezione non porta ornamento').toBeUndefined(); // covers: AC-DE-206-1

    const resolved = resolveVariantHome(SHARED_POOL, RICH_BRIEF, SEED_SENZA_ORNAMENTO, INDEX);
    expect(resolved).not.toBeNull(); // covers: AC-DE-206-1
    // then: il documento congelato resta SENZA ornamento — nessun id fabbricato (DS-D5, la stessa
    // regola anti-invenzione dei recapiti). L'asserzione stretta uccide `... ?? 'fabbricato@1'`.
    expect(resolved!.document.ornament_id).toBeUndefined(); // covers: AC-DE-206-1
  });
});

describe('AC-DE-206-2 — (seed, variantIndex) fissi: documento riproducibile, stessi id congelati', () => {
  it('resolveVariantHome due volte con gli stessi (seed, index) da un documento IDENTICO', () => {
    const INDEX = 3;
    // given/when: due composizioni con gli stessi (pool, brief, seed, index).
    const a = resolveVariantHome(SHARED_POOL, RICH_BRIEF, SEED, INDEX);
    const b = resolveVariantHome(SHARED_POOL, RICH_BRIEF, SEED, INDEX);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();

    // then: documento RIPRODUCIBILE (deterministico: nessun Date/Math.random nel percorso — il PRNG
    // e' seminato dal solo seed).
    expect(b!.document).toEqual(a!.document); // covers: AC-DE-206-2
    // …e gli id di selezione CONGELATI coincidono (l'invariante esplicita del freeze).
    expect(b!.document.hero_layout_id).toBe(a!.document.hero_layout_id); // covers: AC-DE-206-2
    expect(b!.document.section_treatment_id).toBe(a!.document.section_treatment_id); // covers: AC-DE-206-2
    expect(b!.document.effect_level).toBe(a!.document.effect_level); // covers: AC-DE-206-2
    expect(b!.document.recipe_id).toBe(a!.document.recipe_id); // covers: AC-DE-206-2
    expect(b!.document.theme_id).toBe(a!.document.theme_id); // covers: AC-DE-206-2
    expect(b!.document.ornament_id).toBe(a!.document.ornament_id); // covers: AC-DE-206-2
  });
});

describe('AC-DE-206-3 — gate P2: una home valida passa parseDocument, altrimenti null', () => {
  it('pool che compone una home valida -> documento NON nullo che RIPASSA parseDocument (col design congelato)', () => {
    // given: un pool che riempie gli slot; when: resolveVariantHome.
    const resolved = resolveVariantHome(SHARED_POOL, RICH_BRIEF, SEED, 0);
    // then: il documento restituito e' quello GATED — ripassarlo da parseDocument resta ok anche coi
    // campi di selezione congelati (il gate resta il confine anche sui campi nuovi, P2/P4).
    expect(resolved).not.toBeNull(); // covers: AC-DE-206-3
    const regate = parseDocument(resolved!.document);
    expect(regate.ok).toBe(true); // covers: AC-DE-206-3
    expect(resolved!.document.pages).toHaveLength(1); // covers: AC-DE-206-3
    expect(resolved!.document.pages[0].role).toBe('home'); // covers: AC-DE-206-3
  });

  it('pool troppo incompleto per comporre una home (nessun blocco) -> null (invariante P2)', () => {
    // given: un pool SENZA contenuti: ogni blocco della home cade per slot mancanti -> pagina a 0
    // blocchi -> parseDocument RIFIUTA (min 1 blocco per pagina). when/then: resolveVariantHome non
    // congela un albero non validato — ritorna null.
    const vuoto = { pages: {} };
    const resolved = resolveVariantHome(vuoto, RICH_BRIEF, SEED, 0);
    expect(resolved).toBeNull(); // covers: AC-DE-206-3
  });
});

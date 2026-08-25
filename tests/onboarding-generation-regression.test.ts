import { describe, it, expect } from 'vitest';
import { applyBriefUpdate, emptyBrief } from '@/domain/onboarding/brief';
import { resolveVariantHome } from '@/domain/generation/variant-document';
import { parseDocument } from '@/domain/generation/document';

// OGW-601 (macrotask remove-chat) — ORACOLO di NON-REGRESSIONE della generazione.
// La rimozione della chat tocca SOLO la superficie di intervista (interview.ts, la rotta di
// turno, le stringhe i18n della chat e i loro test). NON tocca il Brief ne il motore
// (brief -> selectDesign -> resolveVariantHome -> SiteDocument). Questo characterization test
// PINNA il documento prodotto da un Brief fisso "come lo produce il wizard": lo snapshot cattura
// lo stato PRE-rimozione e resta l'oracolo dell'invarianza. Le asserzioni derivano da AC-601-3
// (given un Brief fisso, when lo si porta a documento col percorso invariato, then il documento
// e' identico a prima).
//
// Perche e' fedele e non hollow: il Brief e' costruito con applyBriefUpdate (la stessa fusione
// di dominio che usa il wizard, non la chat), il pool di fase1 e il seed sono FISSI e
// deterministici, e si pinna il DOCUMENTO INTERO (non una proiezione) — "identico" nel senso
// letterale dell'AC. Se la rimozione toccasse per errore un modulo del motore, lo snapshot
// cambierebbe e il test diventerebbe rosso.

// Brief RICCO, dominio reale (ristorazione): la home e' NON vuota (offerte con sezione), cosi il
// documento ha blocchi e il pin non e' vacuo. Disciplina fixture: piu offerte, sezioni distinte.
const WIZARD_BRIEF = applyBriefUpdate(emptyBrief('it'), {
  business_name: 'Trattoria Aurora',
  vertical: 'ristorazione',
  description: 'Cucina di mercato nel centro storico, aperta dal 1980.',
  whatsapp: '+39 333 4445566',
  phone: '+39 06 5551234',
  address: 'Via Verdi 12, Roma',
  hours: { 'lun-ven': '12:00-15:00', sab: '19:00-23:00' },
  offerings: [
    { name: 'Antipasto della casa', section: 'Cucina' },
    { name: 'Tagliatelle al ragu', section: 'Cucina' },
    { name: 'Tiramisu', section: 'Dessert' },
  ],
}).brief;

// Pool di fase1 FISSO: riempie tutti gli slot dei blocchi di home con valori deterministici,
// cosi nessun blocco viene scartato da resolve e il documento e' stabile e completo.
const POOL = {
  pages: {
    home: {
      hero_title_kicker: 'Dal 1980',
      hero_title: 'La cucina di mercato di Trattoria Aurora',
      hero_subtitle: 'Nel centro storico di Roma, ogni giorno.',
      offerings_title: 'I nostri piatti',
      offerings_intro: 'Una carta corta che cambia con la stagione.',
      about_title: 'Chi siamo',
      about_body: 'Una trattoria di famiglia aperta da tre generazioni.',
      about_points: ['Materie prime del mercato', 'Ricette della tradizione'],
      hours_title: 'Quando siamo aperti',
      hours_intro: 'A pranzo nei feriali, a cena il sabato.',
      contact_title: 'Vieni a trovarci',
      contact_intro: 'Prenota un tavolo o scrivici.',
      faq_title: 'Domande frequenti',
      faq_items: [
        { question: 'Accettate prenotazioni?', answer: 'Si, per telefono o WhatsApp.' },
        { question: 'Avete opzioni vegetariane?', answer: 'Ogni giorno almeno due piatti.' },
      ],
      whatsapp_cta_title: 'Scrivici su WhatsApp',
    },
  },
};

const SEED = '11111111-1111-4111-8111-111111111111';

describe('OGW-601 AC-601-3 — la generazione non regredisce dopo la rimozione della chat', () => {
  it('un Brief fisso del wizard produce un documento valido e non vuoto', () => {
    const resolved = resolveVariantHome(POOL, WIZARD_BRIEF, SEED, 0);
    expect(resolved).not.toBeNull(); // covers: AC-601-3
    const doc = resolved!.document;

    // Sanita' d'intento: il documento e' quello di QUESTO brief e passa il gate di forma.
    expect(parseDocument(doc).ok).toBe(true); // covers: AC-601-3
    expect(doc.vertical).toBe('ristorazione'); // covers: AC-601-3
    const home = doc.pages[0];
    expect(home.blocks.length).toBeGreaterThanOrEqual(2); // covers: AC-601-3 (home non vuota)
  });

  it('il documento e IDENTICO a quello pinnato prima della rimozione (invarianza byte-per-byte)', () => {
    const resolved = resolveVariantHome(POOL, WIZARD_BRIEF, SEED, 0);
    // Il DOCUMENTO INTERO e' l'invariante: "identico" nel senso letterale dell'AC-601-3. Lo
    // snapshot e' stato catturato sullo stato PRE-rimozione; resta rosso se il motore cambia.
    expect(resolved!.document).toMatchSnapshot(); // covers: AC-601-3
  });
});

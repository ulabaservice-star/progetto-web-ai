import { describe, it, expect } from 'vitest';
import {
  BRIEF_LIMITS,
  BriefUpdateSchema,
  applyBriefUpdate,
  emptyBrief,
} from '@/domain/onboarding/brief';
import type { BriefCorePatch } from '@/ui/onboarding/brief-fields';

// OGW-201 (macrotask offerings-editor) — le OFFERTE nel canale editabile del pannello.
// Le asserzioni derivano dagli acceptance_criteria AC-201-1 / AC-201-2 del blueprint
// docs/blueprint/onboarding-guided-wizard/02-offerings-editor.md.
//
// COSA PROVA, e a quale livello. La modifica di OGW-201 e' il TIPO `BriefCorePatch`
// (cio' che il pannello SPEDISCE) esteso con `offerings`, piu' il pannello che le
// include nella patch. Il DOMINIO e' invariato (OGW-D5): `BriefUpdateSchema` accetta
// gia' `offerings` e `applyBriefUpdate` le fonde. Questo file e' quindi un CONTRACT
// TEST del canale: una `BriefCorePatch` tipizzata percorre lo stesso gate di
// `upsertBrief` — `BriefUpdateSchema.safeParse(patch)` poi `applyBriefUpdate(base, ...)`
// (src/data/briefs.ts:164-181) — e si osserva cosa arriva nel brief.
//
// DICHIARAZIONE ONESTA (L-COL-006). AC-201-2 vive al layer `applyBriefUpdate`, non a
// quello di `upsertBrief`: quest'ultimo fa `BriefUpdateSchema.safeParse(update)` e su
// una voce d'offerta fuori forma ritorna 400 sull'INTERA patch (briefs.ts:164-165).
// La garanzia "la voce invalida e' scartata senza far fallire l'intero salvataggio" e'
// la difesa in profondita' dello scarto CAMPO-PER-CAMPO di `applyBriefUpdate` che il
// security_note del blueprint cita — la stessa che protegge il percorso di LETTURA
// (rowToBrief, briefs.ts) da dati fuori scala. E' cio' che questo test pinna.

// Il gate server di upsertBrief, riprodotto: prima BriefUpdateSchema (strict), poi il
// merge campo-per-campo. Ritorna cio' che l'utente RILEGGE dopo il salvataggio.
function throughServerGate(base: ReturnType<typeof emptyBrief>, patch: BriefCorePatch) {
  const parsed = BriefUpdateSchema.safeParse(patch);
  return { parsed, ...applyBriefUpdate(base, parsed.success ? parsed.data : {}) };
}

describe('OGW-201 offerings nel canale della patch del brief', () => {
  it('persiste le offerte valide spedite come BriefCorePatch (leggibili dopo il salvataggio)', () => {
    const patch: BriefCorePatch = {
      offerings: [
        { name: 'Espresso', price: '1.20', description: 'Miscela della casa', section: 'Bar' },
        { name: 'Cornetto', section: 'Colazione' },
      ],
    };

    const { parsed, brief, rejected } = throughServerGate(emptyBrief('it'), patch);

    // Il tipo UI esteso produce una patch che il gate server (BriefUpdateSchema) ACCETTA.
    expect(parsed.success).toBe(true); // covers: AC-201-1
    expect(rejected).not.toContain('offerings'); // covers: AC-201-1
    // Le offerte sono persistite nel brief e rileggibili, nell'ordine spedito.
    expect(brief.content.offerings).toEqual([
      { name: 'Espresso', price: '1.20', description: 'Miscela della casa', section: 'Bar' },
      { name: 'Cornetto', section: 'Colazione' },
    ]); // covers: AC-201-1
  });

  it('scarta la voce d’offerta fuori forma senza far fallire gli altri campi della patch', () => {
    // description oltre il tetto di P1-D17: la voce e' "fuori forma".
    const patch: BriefCorePatch = {
      business_name: 'Bar Centrale',
      offerings: [{ name: 'Espresso', description: 'x'.repeat(BRIEF_LIMITS.offering_description + 1) }],
    };

    const { brief, rejected } = applyBriefUpdate(emptyBrief('it'), patch);

    // La voce fuori forma e' scartata dalla validazione (l'intero campo offerings).
    expect(rejected).toContain('offerings'); // covers: AC-201-2
    expect(brief.content.offerings).toHaveLength(0); // covers: AC-201-2
    // ...senza far fallire l'intero salvataggio: gli altri campi validi passano.
    expect(brief.business_name).toBe('Bar Centrale'); // covers: AC-201-2
  });
});

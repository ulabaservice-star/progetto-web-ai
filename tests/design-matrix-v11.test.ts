import { describe, it, expect } from 'vitest';
import {
  isAllowed,
  allowedCombinations,
  type Combo,
  type Vertical,
} from '@/domain/generation/design-matrix';

// DE11-203 (macrotask variety-engine, design-engine-v1.1) — I NUOVI ASSI della matrice: il tratto
// dell'H1 (DE11-201), il layout di sezione del CORPO e il nastro (DE11-202), l'illustrazione
// (DE11-104). Le asserzioni DERIVANO dagli acceptance_criteria AC-DE11-203-1..4; ogni blocco e'
// taggato con l'AC che esercita. Questo file AFFIANCA design-matrix.test.ts (v1) senza toccarlo: i
// campi nuovi sono OPZIONALI, quindi le combo v1 (senza) restano valide e quel file non regredisce.
//
// COSA QUESTO FILE NON PROVA (L-COL-006): non prova che una combinazione sia BELLA — lo stile non e'
// oracolabile. Prova che `isAllowed` VIETA gli accoppiamenti che le regole dichiarano incoerenti
// (un'illustrazione su un hero che non le lascia posto, R3) e gli id che non risolvono nei cataloghi
// (proto-safe, mai per prefisso), AMMETTE quelli conformi, e che `allowedCombinations(vertical)`
// POPOLA i nuovi assi offrendo — per OGNI vertical dell'enum — un sottoinsieme di 5 combo con
// hero_layout_id tutti diversi E un asse del corpo (section_layout_id) diverso a due a due.
//
// ANTI-INJECTION (P2-D1, security_notes del task): l'input della matrice sono valori di CATALOGO + il
// `vertical` (enum chiuso di brief.ts), MAI testo libero del brief. Qui non esiste alcun `brief`: il
// tipo `Vertical` e' l'unica porta d'ingresso di settore, e i nuovi assi sono id di catalogo risolti
// per uguaglianza esatta su array.

// L'insieme ESATTO dei vertical dell'enum di brief.ts, come RECORD TOTALE su `Vertical`: se brief.ts
// aggiunge o rinomina un vertical, il tipo `Vertical` cambia e questo letterale non compila piu'
// (manca/avanza una chiave) → single-source-of-truth a compile-time, senza duplicare a mano una lista.
const VERTICAL_PRESENCE: Record<Vertical, true> = {
  ristorazione: true,
  fitness: true,
  salone_studio: true,
  negozio_artigiano: true,
  altro: true,
};
const VERTICALS = Object.keys(VERTICAL_PRESENCE) as readonly Vertical[];

// Data una lista di combo, il sottoinsieme dei RAPPRESENTANTI: la PRIMA combo di ogni hero_layout_id
// distinto, nell'ordine di enumerazione. E' esattamente il modo in cui DE11-204 cava una variante per
// hero: se questi rappresentanti hanno hero E section_layout a due a due distinti, la garanzia regge.
function rappresentantiPerHero(combos: readonly Combo[]): readonly Combo[] {
  const perHero = new Map<string, Combo>();
  for (const c of combos) {
    if (!perHero.has(c.hero_layout_id)) perHero.set(c.hero_layout_id, c);
  }
  return [...perHero.values()];
}

// ── AC-DE11-203-1 — una combo che viola una regola dei NUOVI assi → false ──────

describe('AC-DE11-203-1 — isAllowed VIETA le combinazioni incoerenti sui nuovi assi', () => {
  // covers: AC-DE11-203-1
  it("R3: un'illustrazione su un hero che NON ospita lo slot 'illustrazione' → false", () => {
    // 'centrato@1' (senza-foto) non dichiara slot: una scena non avrebbe dove vivere. L'illustrazione
    // 'piatto@1' ESISTE (l'id risolve): l'UNICO motivo di caduta e' R3, non un id fantasma.
    expect(
      isAllowed({
        theme_id: 'sole-mediterraneo@1',
        hero_layout_id: 'centrato@1',
        section_treatment_id: 'piano@1',
        effect_level: 'L1',
        illustration_id: 'piatto@1',
      }),
    ).toBe(false); // covers: AC-DE11-203-1
    // Anche su un hero a FOTO PIENA (immagine-piena@1, nessuno slot): la scena non ha casa → false.
    // 'piatto-fondo@1' e' il partner PREFISSO di 'piatto@1' (fixture con id prefisso di un altro).
    expect(
      isAllowed({
        theme_id: 'linea-essenziale@1',
        hero_layout_id: 'immagine-piena@1',
        section_treatment_id: 'piano@1',
        effect_level: 'L2',
        illustration_id: 'piatto-fondo@1',
      }),
    ).toBe(false); // covers: AC-DE11-203-1
  });

  // covers: AC-DE11-203-1
  it('un id di un NUOVO asse che non risolve nel catalogo (prefisso o proto) → false', () => {
    // h1_treatment_id: 'occhiello' e' PREFISSO-stringa di 'occhiello@1'/'occhiello-corsivo@1' ma non e'
    // l'id di alcun tratto → lookup esatto su array → cade. La base e' altrimenti conforme (hero senza
    // foto, trattamento ereditato, L1): isola l'asse sotto esame.
    expect(
      isAllowed({
        theme_id: 'sole-mediterraneo@1',
        hero_layout_id: 'centrato@1',
        section_treatment_id: 'piano@1',
        effect_level: 'L1',
        h1_treatment_id: 'occhiello',
      }),
    ).toBe(false); // covers: AC-DE11-203-1
    // Chiave EREDITATA da Object.prototype come h1_treatment_id: un lookup a oggetto la risolverebbe;
    // quello ad-array no → cade.
    expect(
      isAllowed({
        theme_id: 'sole-mediterraneo@1',
        hero_layout_id: 'centrato@1',
        section_treatment_id: 'piano@1',
        effect_level: 'L1',
        h1_treatment_id: '__proto__',
      }),
    ).toBe(false); // covers: AC-DE11-203-1
    // section_layout_id: 'contatti-scheda' e' PREFISSO di 'contatti-scheda@1'/'contatti-scheda-mappa@1'
    // ma non e' un id → cade; e 'constructor' (ereditato) → cade.
    expect(
      isAllowed({
        theme_id: 'sole-mediterraneo@1',
        hero_layout_id: 'centrato@1',
        section_treatment_id: 'piano@1',
        effect_level: 'L1',
        section_layout_id: 'contatti-scheda',
      }),
    ).toBe(false); // covers: AC-DE11-203-1
    expect(
      isAllowed({
        theme_id: 'sole-mediterraneo@1',
        hero_layout_id: 'centrato@1',
        section_treatment_id: 'piano@1',
        effect_level: 'L1',
        section_layout_id: 'constructor',
      }),
    ).toBe(false); // covers: AC-DE11-203-1
    // ribbon_id: 'gingham' e' PREFISSO di 'gingham@1'/'gingham-incrociato@1' ma non e' un id → cade;
    // 'toString' (ereditato) → cade.
    expect(
      isAllowed({
        theme_id: 'sole-mediterraneo@1',
        hero_layout_id: 'centrato@1',
        section_treatment_id: 'piano@1',
        effect_level: 'L1',
        ribbon_id: 'gingham',
      }),
    ).toBe(false); // covers: AC-DE11-203-1
    expect(
      isAllowed({
        theme_id: 'sole-mediterraneo@1',
        hero_layout_id: 'centrato@1',
        section_treatment_id: 'piano@1',
        effect_level: 'L1',
        ribbon_id: 'toString',
      }),
    ).toBe(false); // covers: AC-DE11-203-1
    // illustration_id: 'piatto' e' PREFISSO di 'piatto@1' ma non e' un id. Lo si prova su un hero che
    // OSPITA lo slot (editoriale-illustrato@1) cosi' R3 e' soddisfatta e l'UNICO motivo di caduta e'
    // l'id che non risolve — non uno scarto R3 che maschererebbe la prova.
    expect(
      isAllowed({
        theme_id: 'sole-mediterraneo@1',
        hero_layout_id: 'editoriale-illustrato@1',
        section_treatment_id: 'piano@1',
        effect_level: 'L1',
        illustration_id: 'piatto',
      }),
    ).toBe(false); // covers: AC-DE11-203-1
  });
});

// ── AC-DE11-203-2 — una combo conforme sui nuovi assi → true (contro-prova a delta singolo) ─

describe('AC-DE11-203-2 — isAllowed AMMETTE le combinazioni conformi sui nuovi assi', () => {
  // Combo conforme che valorizza TUTTI e quattro i nuovi assi, con gli id PIU' LUNGHI di ogni
  // coppia-prefisso (occhiello-corsivo, contatti-scheda-mappa, gingham-incrociato, piatto-fondo):
  // l'hero editoriale-illustrato@1 ospita lo slot 'illustrazione' (R3 ok), tema chiaro + piano@1
  // ereditato (R2 ok), media testo-illustrazione non foto-piena (R1 ok), L1.
  const baseConforme: Combo = {
    theme_id: 'sole-mediterraneo@1',
    hero_layout_id: 'editoriale-illustrato@1',
    section_treatment_id: 'piano@1',
    effect_level: 'L1',
    h1_treatment_id: 'occhiello-corsivo@1',
    section_layout_id: 'contatti-scheda-mappa@1',
    ribbon_id: 'gingham-incrociato@1',
    illustration_id: 'piatto-fondo@1',
  };

  // covers: AC-DE11-203-2
  it('la combo con tutti i nuovi assi valorizzati e coerenti → true', () => {
    expect(isAllowed(baseConforme)).toBe(true); // covers: AC-DE11-203-2
  });

  // covers: AC-DE11-203-2
  it('una seconda conforme, DISCORDANTE, con gli id PIU CORTI delle coppie-prefisso → true', () => {
    // Tema SCURO (linea-essenziale-notte@1) + fasce-alternate@1 (superficie 'scuro', stesso segno →
    // leggibile), hero split@1 (foto-affiancata, non foto-piena) a L3, e gli id corti occhiello@1 /
    // contatti-scheda@1 / scacchi-conici@1. Nessuna illustrazione (split non ospita lo slot): R3 non
    // scatta. Prova che il lookup esatto risolve anche il membro CORTO della coppia-prefisso.
    expect(
      isAllowed({
        theme_id: 'enoteca-scura@1',
        hero_layout_id: 'split@1',
        section_treatment_id: 'piano@1',
        effect_level: 'L3',
        h1_treatment_id: 'occhiello@1',
        section_layout_id: 'contatti-scheda@1',
        ribbon_id: 'scacchi-conici@1',
      }),
    ).toBe(true); // covers: AC-DE11-203-2
  });

  // covers: AC-DE11-203-2
  it('contro-prova a DELTA SINGOLO: cambiare SOLO l hero che la vieta (R3) fa false, e rimetterlo fa true', () => {
    // Da baseConforme (true) cambio SOLO l'hero in 'centrato@1' (che NON ospita lo slot): la sola
    // differenza e' quel campo, e R3 la fa cadere.
    const violante: Combo = { ...baseConforme, hero_layout_id: 'centrato@1' };
    expect(isAllowed(violante)).toBe(false); // covers: AC-DE11-203-2
    // Rimetto SOLO quel campo al valore conforme: torna true. Il predicato dipende da QUEL campo, non
    // e' un false/true costante.
    const riconforme: Combo = { ...violante, hero_layout_id: 'editoriale-illustrato@1' };
    expect(isAllowed(riconforme)).toBe(true); // covers: AC-DE11-203-2
  });
});

// ── AC-DE11-203-3 — allowedCombinations('ristorazione') popola i nuovi assi ────

describe("AC-DE11-203-3 — allowedCombinations('ristorazione') >=5, con sottoinsieme hero+corpo distinto", () => {
  const risto = allowedCombinations('ristorazione');

  // covers: AC-DE11-203-3
  it('enumera almeno cinque combinazioni, tutte ammesse dal predicato', () => {
    expect(risto.length).toBeGreaterThanOrEqual(5); // covers: AC-DE11-203-3
    for (const c of risto) {
      expect(isAllowed(c), JSON.stringify(c)).toBe(true); // covers: AC-DE11-203-3
    }
  });

  // covers: AC-DE11-203-3
  it('offre un sottoinsieme di 5 con hero_layout_id tutti diversi E section_layout_id diverso a coppie', () => {
    const rappresentanti = rappresentantiPerHero(risto);
    expect(rappresentanti.length).toBeGreaterThanOrEqual(5); // covers: AC-DE11-203-3
    const cinque = rappresentanti.slice(0, 5);
    // 5 hero a due a due DIVERSI: cinque valori distinti.
    expect(new Set(cinque.map((c) => c.hero_layout_id)).size).toBe(5); // covers: AC-DE11-203-3
    // >=1 asse del CORPO diverso a coppie: qui il section_layout_id, tutti e 5 distinti (il fix del
    // difetto v1 "corpo mai variato"). Popolato su OGNI combo del pool, mai undefined.
    expect(new Set(cinque.map((c) => c.section_layout_id)).size).toBe(5); // covers: AC-DE11-203-3
  });

  // covers: AC-DE11-203-3
  it("include l'OVERLAY di settore (hero scena-scura@1) e popola davvero i nuovi assi", () => {
    expect(risto.some((c) => c.hero_layout_id === 'scena-scura@1')).toBe(true); // covers: AC-DE11-203-3
    // I nuovi assi sono POPOLATI, non lasciati vuoti: ogni combo porta un h1_treatment_id e un
    // section_layout_id valorizzati (l'anti-regressione al difetto "assi mai riempiti").
    for (const c of risto) {
      expect(typeof c.h1_treatment_id).toBe('string'); // covers: AC-DE11-203-3
      expect(typeof c.section_layout_id).toBe('string'); // covers: AC-DE11-203-3
    }
  });

  // Oracolo AGGIUNTIVO (non mappa un AC) — DETERMINISMO/PUREZZA: due chiamate danno lo stesso elenco
  // (nessun Date/Math.random, nessuno stato fra le chiamate).
  it('e deterministica: due chiamate danno lo stesso identico elenco', () => {
    expect(allowedCombinations('ristorazione')).toEqual(risto);
  });
});

// ── AC-DE11-203-4 — OGNI vertical dell'enum: >=5, con sottoinsieme hero+corpo distinto ─

describe('AC-DE11-203-4 — ogni vertical dell enum popola i nuovi assi e offre 5 varianti distinte', () => {
  // covers: AC-DE11-203-4
  it('l elenco dei vertical e quello atteso dell enum (anti-vacuita)', () => {
    // Cinque vertical esatti: un ciclo su una lista vuota o parziale sarebbe vero per vacuita'.
    expect(VERTICALS.length).toBe(5); // covers: AC-DE11-203-4
    expect(new Set(VERTICALS)).toEqual(
      new Set(['ristorazione', 'fitness', 'salone_studio', 'negozio_artigiano', 'altro']),
    ); // covers: AC-DE11-203-4
  });

  // covers: AC-DE11-203-4
  it('per OGNI vertical: >=5 combinazioni, tutte ammesse, e un sottoinsieme di 5 con hero+corpo distinto', () => {
    for (const vertical of VERTICALS) {
      const pool = allowedCombinations(vertical);
      expect(pool.length, `${vertical}: sotto la soglia`).toBeGreaterThanOrEqual(5); // covers: AC-DE11-203-4
      for (const c of pool) {
        expect(isAllowed(c), `${vertical}: ${JSON.stringify(c)}`).toBe(true); // covers: AC-DE11-203-4
      }
      // >=5 hero_layout_id DISTINTI disponibili nel pool.
      const rappresentanti = rappresentantiPerHero(pool);
      expect(rappresentanti.length, `${vertical}: hero distinti`).toBeGreaterThanOrEqual(5); // covers: AC-DE11-203-4
      // Il sottoinsieme di 5: hero tutti diversi E section_layout tutti diversi (asse del corpo).
      const cinque = rappresentanti.slice(0, 5);
      expect(new Set(cinque.map((c) => c.hero_layout_id)).size, `${vertical}: hero`).toBe(5); // covers: AC-DE11-203-4
      expect(new Set(cinque.map((c) => c.section_layout_id)).size, `${vertical}: corpo`).toBe(5); // covers: AC-DE11-203-4
    }
  });

  // covers: AC-DE11-203-4
  it('i vertical NON-ristorazione usano il solo fallback universale sui nuovi assi (niente overlay)', () => {
    for (const vertical of VERTICALS) {
      if (vertical === 'ristorazione') continue;
      const pool = allowedCombinations(vertical);
      // Il layout di sezione OVERLAY (menu card-carta, scope ristorazione) NON esce fuori settore.
      expect(pool.some((c) => c.section_layout_id === 'menu-card-carta@1'), vertical).toBe(false); // covers: AC-DE11-203-4
      // I nastri OVERLAY (gingham della tovaglia) NON escono fuori settore.
      expect(pool.some((c) => c.ribbon_id === 'gingham@1'), vertical).toBe(false); // covers: AC-DE11-203-4
      expect(pool.some((c) => c.ribbon_id === 'gingham-incrociato@1'), vertical).toBe(false); // covers: AC-DE11-203-4
    }
  });
});

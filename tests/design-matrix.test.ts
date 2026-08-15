import { describe, it, expect } from 'vitest';
import {
  isAllowed,
  allowedCombinations,
  type Combo,
  type Vertical,
} from '@/domain/generation/design-matrix';

// DE-203 (macrotask design-select) — LA MATRICE DI COMPATIBILITA come DATI + predicato PURO. Le
// asserzioni DERIVANO dagli acceptance_criteria AC-DE-203-1..4
// (docs/blueprint/design-engine/02-design-select.md); ogni blocco e' taggato con l'AC che esercita.
//
// COSA QUESTO FILE NON PROVA (L-COL-006): non prova che una combinazione sia BELLA — lo stile non e'
// oracolabile. Prova che `isAllowed` VIETA gli accoppiamenti che le nostre regole dichiarano brutti
// (hero a foto piena con troppo movimento; trattamento che fissa una superficie di segno opposto al
// tema → testo illeggibile) e AMMETTE quelli conformi, che il predicato e' PROTO-SAFE (id ereditati
// da Object.prototype → false, mai un membro ereditato), e che `allowedCombinations(vertical)`
// enumera SOLO combinazioni ammesse — almeno cinque, strutturalmente varie — per OGNI vertical
// dell'enum, con l'overlay ristorazione IN AGGIUNTA al fallback universale.
//
// ANTI-INJECTION (P2-D1, security_notes del task): l'input della matrice sono valori di CATALOGO +
// il `vertical` (enum chiuso di brief.ts), MAI testo libero del brief. Qui non esiste alcun `brief`:
// il tipo `Vertical` e' l'unica porta d'ingresso di settore.

// L'insieme ESATTO dei vertical dell'enum di brief.ts, come RECORD TOTALE su `Vertical`: se
// brief.ts aggiunge o rinomina un vertical, il tipo `Vertical` cambia e questo letterale non
// compila piu' (manca/avanza una chiave) → single-source-of-truth a tempo di compilazione, senza
// duplicare a mano una lista che potrebbe divergere in silenzio.
const VERTICAL_PRESENCE: Record<Vertical, true> = {
  ristorazione: true,
  fitness: true,
  salone_studio: true,
  negozio_artigiano: true,
  altro: true,
};
const VERTICALS = Object.keys(VERTICAL_PRESENCE) as readonly Vertical[];

// Costruttore di combo per i test: rende esplicito e leggibile ogni fixture (valori DISCORDANTI a
// vista) senza ripetere la forma del tipo. `recipe_id`/`ornament_id` restano opzionali.
function combo(
  theme_id: string,
  hero_layout_id: string,
  section_treatment_id: string,
  effect_level: Combo['effect_level'],
  extra: { recipe_id?: string; ornament_id?: string } = {},
): Combo {
  return { theme_id, hero_layout_id, section_treatment_id, effect_level, ...extra };
}

// ── AC-DE-203-1 — una combo che viola una regola dichiarata → false ───────────

describe('AC-DE-203-1 — isAllowed VIETA le combinazioni che violano una regola', () => {
  // covers: AC-DE-203-1
  it('hero immagine-piena@1 + effetti L4 → false (la regola del task, alla lettera)', () => {
    // Tema CHIARO + trattamento EREDITATO: cosi' l'UNICO fattore che puo' far cadere la combo e' il
    // livello di effetto sopra il tetto dell'hero a foto piena (isolamento della regola).
    expect(isAllowed(combo('sole-mediterraneo@1', 'immagine-piena@1', 'piano@1', 'L4'))).toBe(false); // covers: AC-DE-203-1
    // L3 e' anch'esso sopra il tetto L2 dell'hero a foto piena → vietato.
    expect(isAllowed(combo('sole-mediterraneo@1', 'immagine-piena@1', 'piano@1', 'L3'))).toBe(false); // covers: AC-DE-203-1
    // ...ma L2 (il tetto, inclusivo) sullo STESSO hero e' ammesso: e' l'effetto a discriminare, non
    // l'hero in se'. Senza questa contro-prova la regola potrebbe vietare l'hero sempre.
    expect(isAllowed(combo('sole-mediterraneo@1', 'immagine-piena@1', 'piano@1', 'L2'))).toBe(true); // covers: AC-DE-203-1
  });

  // covers: AC-DE-203-1
  it('leggibilita: trattamento che fissa una superficie di segno OPPOSTO al tema → false', () => {
    // DS-V2-D9: le 23 palette di Claude Design sono TUTTE a superficie chiara (lo scuro e' il token
    // surface_dark delle SEZIONI, non un tema scuro). Il caso "tema SCURO + trattamento a superficie
    // chiara" non e' piu' rappresentabile; resta l'altra direzione, ancora valida qui sotto. (L'asse
    // section_treatment e' comunque legacy: il rifacimento della matrice e' in variety-select.)
    // Verso valido: tema CHIARO (sole-mediterraneo@1→trattoria-rustica@1) + fasce-alternate@1 (superficie
    // SCURA fissata) → testo scuro su fondo scuro → illeggibile.
    expect(isAllowed(combo('sole-mediterraneo@1', 'centrato@1', 'fasce-alternate@1', 'L1'))).toBe(
      false,
    ); // covers: AC-DE-203-1
    // Contro-prove che il fattore e' il TRATTAMENTO: gli stessi temi con piano@1 (superficie
    // EREDITATA, nessun tono fissato) sono ammessi.
    expect(isAllowed(combo('scatto-vitale@1', 'centrato@1', 'piano@1', 'L1'))).toBe(true); // covers: AC-DE-203-1
    expect(isAllowed(combo('sole-mediterraneo@1', 'centrato@1', 'piano@1', 'L1'))).toBe(true); // covers: AC-DE-203-1
  });

  // covers: AC-DE-203-1
  it('id inesistenti / ereditati da Object.prototype → false (proto-safe, nessuna regola su id fantasma)', () => {
    // Il NOME nudo 'centrato' e' PREFISSO-STRINGA di 'centrato@1' e 'centrato-foto@1' ma non e' l'id
    // di alcun hero: la matrice usa il lookup ESATTO dei cataloghi, quindi la combo cade.
    expect(isAllowed(combo('sole-mediterraneo@1', 'centrato', 'piano@1', 'L1'))).toBe(false); // covers: AC-DE-203-1
    // Chiavi speciali di JavaScript come id: se un lookup fosse un oggetto indicizzato per id
    // risolverebbero un membro EREDITATO da Object.prototype; il lookup su array le respinge.
    expect(isAllowed(combo('constructor', 'centrato@1', 'piano@1', 'L1'))).toBe(false); // covers: AC-DE-203-1
    expect(isAllowed(combo('sole-mediterraneo@1', '__proto__', 'piano@1', 'L1'))).toBe(false); // covers: AC-DE-203-1
    expect(isAllowed(combo('sole-mediterraneo@1', 'centrato@1', 'toString', 'L1'))).toBe(false); // covers: AC-DE-203-1
    // effect_level fuori da {L0..L4}: il cast forza il caso che il tipo vieta a monte, per provare
    // la guardia a RUNTIME (un documento gia' scritto potrebbe portare un livello ignoto).
    expect(isAllowed(combo('sole-mediterraneo@1', 'centrato@1', 'piano@1', 'L9' as Combo['effect_level']))).toBe(false); // covers: AC-DE-203-1
    // effect_level e' l'UNICO campo che a valle indicizza un OGGETTO (EFFECT_RANK[level]): le chiavi
    // EREDITATE come effect_level devono cadere sulla guardia ad-array (EFFECTS.some), non risolvere
    // un membro di Object.prototype. Se un domani la guardia diventasse un object-index (level in
    // EFFECT_RANK / !== undefined), 'toString'/'constructor' passerebbero → questo rosseggia.
    expect(isAllowed(combo('sole-mediterraneo@1', 'centrato@1', 'piano@1', 'toString' as Combo['effect_level']))).toBe(false); // covers: AC-DE-203-1
    expect(isAllowed(combo('sole-mediterraneo@1', 'centrato@1', 'piano@1', 'constructor' as Combo['effect_level']))).toBe(false); // covers: AC-DE-203-1
    // ornament_id / recipe_id, SE presenti, devono risolvere: un id fantasma fa cadere la combo.
    expect(
      isAllowed(combo('sole-mediterraneo@1', 'centrato@1', 'piano@1', 'L1', { ornament_id: 'watermark-cibo' })),
    ).toBe(false); // covers: AC-DE-203-1
    expect(
      isAllowed(combo('sole-mediterraneo@1', 'centrato@1', 'piano@1', 'L1', { recipe_id: 'vetrina-dell-offerta' })),
    ).toBe(false); // covers: AC-DE-203-1
  });
});

// ── AC-DE-203-2 — una combo conforme alle regole → true ───────────────────────

describe('AC-DE-203-2 — isAllowed AMMETTE le combinazioni conformi', () => {
  // covers: AC-DE-203-2
  it('combinazioni conformi con valori DISCORDANTI (inclusa la coppia-prefisso centrato@1/centrato-foto@1) → true', () => {
    // Tema chiaro + hero senza foto + trattamento ereditato + L1: conforme a tutte le regole.
    expect(isAllowed(combo('sole-mediterraneo@1', 'centrato@1', 'piano@1', 'L1'))).toBe(true); // covers: AC-DE-203-2
    // La coppia-prefisso: 'centrato-foto@1' (il piu' lungo) e' un hero valido e distinto; tema chiaro
    // + a-scheda@1 (superficie chiara) sono compatibili → conforme.
    expect(isAllowed(combo('sole-mediterraneo@1', 'centrato-foto@1', 'a-scheda@1', 'L2'))).toBe(true); // covers: AC-DE-203-2
    // DS-V2-D9: nessun tema scuro in CD → l'effetto AL TETTO L2 su hero a foto piena si prova con
    // superficie EREDITATA (piano@1), senza dipendere da un tema scuro. (section_treatment legacy.)
    expect(isAllowed(combo('griglia-e-brace@1', 'immagine-piena@1', 'piano@1', 'L2'))).toBe(
      true,
    ); // covers: AC-DE-203-2
    // Combo COMPLETA (recipe_id + ornament_id valorizzati): hero split (non a foto piena) regge L4;
    // tema chiaro + ereditato; recipe e ornamento esistenti → conforme.
    expect(
      isAllowed(
        combo('brezza-costiera@1', 'split@1', 'piano@1', 'L4', {
          recipe_id: 'vetrina-dell-offerta@1',
          ornament_id: 'divisori-linea@1',
        }),
      ),
    ).toBe(true); // covers: AC-DE-203-2
  });
});

// ── AC-DE-203-3 — vertical 'ristorazione' → >=5 combinazioni, tutte isAllowed ──

describe("AC-DE-203-3 — allowedCombinations('ristorazione') >=5, tutte ammesse", () => {
  const combosRisto = allowedCombinations('ristorazione');

  // covers: AC-DE-203-3
  it('enumera almeno cinque combinazioni', () => {
    expect(combosRisto.length).toBeGreaterThanOrEqual(5); // covers: AC-DE-203-3
  });

  // covers: AC-DE-203-3
  it('OGNI combinazione enumerata e ammessa dal predicato (nessuna combinazione vietata esce)', () => {
    for (const c of combosRisto) {
      expect(isAllowed(c), JSON.stringify(c)).toBe(true); // covers: AC-DE-203-3
    }
  });

  // covers: AC-DE-203-3
  it("include l'OVERLAY di settore (hero scena-scura@1), offerto IN AGGIUNTA al fallback universale", () => {
    // 'scena-scura@1' e' un hero con scope 'ristorazione': deve comparire per questo vertical.
    expect(combosRisto.some((c) => c.hero_layout_id === 'scena-scura@1')).toBe(true); // covers: AC-DE-203-3
  });

  // Oracolo AGGIUNTIVO (non mappa un AC) — VARIETA STRUTTURALE: DE-204 dovra' produrre 5 varianti
  // distinte su >=1 asse strutturale (hero/trattamento), quindi il pool deve offrire almeno cinque
  // scheletri (hero_layout_id, section_treatment_id) DIVERSI, non cinque cloni ricolorati.
  it('offre almeno cinque scheletri strutturali distinti (per DE-204)', () => {
    const scheletri = new Set(combosRisto.map((c) => `${c.hero_layout_id}|${c.section_treatment_id}`));
    expect(scheletri.size).toBeGreaterThanOrEqual(5);
  });

  // Oracolo AGGIUNTIVO (non mappa un AC) — DETERMINISMO/PUREZZA: due chiamate danno lo stesso
  // risultato (nessun Date/Math.random, nessuno stato fra le chiamate).
  it('e deterministica: due chiamate danno lo stesso identico elenco', () => {
    expect(allowedCombinations('ristorazione')).toEqual(combosRisto);
  });
});

// ── AC-DE-203-4 — OGNI vertical dell'enum → >=5 combinazioni ───────────────────

describe('AC-DE-203-4 — ogni vertical dell enum ha >=5 combinazioni (fallback universale)', () => {
  // covers: AC-DE-203-4
  it('l elenco dei vertical e quello atteso dell enum (anti-vacuita)', () => {
    // Cinque vertical esatti: un ciclo su una lista vuota o parziale sarebbe vero per vacuita'.
    expect(VERTICALS.length).toBe(5); // covers: AC-DE-203-4
    expect(new Set(VERTICALS)).toEqual(
      new Set(['ristorazione', 'fitness', 'salone_studio', 'negozio_artigiano', 'altro']),
    ); // covers: AC-DE-203-4
  });

  // covers: AC-DE-203-4
  it('per OGNI vertical: >=5 combinazioni e tutte ammesse', () => {
    for (const vertical of VERTICALS) {
      const combos = allowedCombinations(vertical);
      expect(combos.length, `${vertical}: sotto la soglia`).toBeGreaterThanOrEqual(5); // covers: AC-DE-203-4
      for (const c of combos) {
        expect(isAllowed(c), `${vertical}: ${JSON.stringify(c)}`).toBe(true); // covers: AC-DE-203-4
      }
    }
  });

  // Oracolo AGGIUNTIVO (non mappa un AC) — VARIETA STRUTTURALE PER OGNI VERTICAL: DE-204 esige 5
  // varianti distinte su >=1 asse strutturale su OGNI vertical (non solo ristorazione, dove e' gia
  // pinnato sopra). Un catalogo universale impoverito a <5 scheletri renderebbe AC-204-2 impossibile
  // per quei vertical RESTANDO verde sul solo conteggio combinazioni: qui invece rosseggia.
  it('OGNI vertical offre almeno cinque scheletri strutturali distinti (per DE-204)', () => {
    for (const vertical of VERTICALS) {
      const scheletri = new Set(
        allowedCombinations(vertical).map((c) => `${c.hero_layout_id}|${c.section_treatment_id}`),
      );
      expect(scheletri.size, `${vertical}: scheletri strutturali`).toBeGreaterThanOrEqual(5);
    }
  });

  // covers: AC-DE-203-4
  it('i vertical NON-ristorazione usano il solo fallback universale (nessun overlay di settore)', () => {
    for (const vertical of VERTICALS) {
      if (vertical === 'ristorazione') continue;
      const combos = allowedCombinations(vertical);
      // Gli overlay di ristorazione (hero scena-scura@1, ornamento watermark-cibo@1) NON compaiono.
      expect(combos.some((c) => c.hero_layout_id === 'scena-scura@1'), vertical).toBe(false); // covers: AC-DE-203-4
      expect(combos.some((c) => c.ornament_id === 'watermark-cibo@1'), vertical).toBe(false); // covers: AC-DE-203-4
    }
  });
});

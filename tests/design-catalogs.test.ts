import { describe, it, expect } from 'vitest';
import {
  HERO_LAYOUTS,
  heroLayoutFor,
  type SiteHeroLayout,
} from '@/domain/generation/hero-layouts';
import {
  SECTION_TREATMENTS,
  sectionTreatmentFor,
  type SiteSectionTreatment,
} from '@/domain/generation/section-treatments';
import {
  EFFECTS,
  effectFor,
  type EffectLevel,
  type SiteEffect,
} from '@/domain/generation/effects';
import {
  ORNAMENTS,
  ornamentFor,
  type SiteOrnament,
} from '@/domain/generation/ornaments';

// DE-201 (macrotask design-select) — I CATALOGHI VISIVI PURI. Le asserzioni DERIVANO dagli
// acceptance_criteria AC-DE-201-1..4 (docs/blueprint/design-engine/02-design-select.md). Dominio
// puro: nessun DB, nessuna rete, nessun mock, nessun tempo (seed non serve — qui non c'e' scelta,
// solo dati e lookup). Il file esercita i QUATTRO cataloghi con una sola tabella per gli invarianti
// trasversali (forma dell'id, proto-safety, trappola del prefisso), e con prove su DATI REALI dove
// l'AC lo chiede (la coppia hero centrato@1 / centrato-foto@1; i cinque livelli di effects).
//
// CIO' CHE QUESTO FILE NON PROVA (L-COL-006): non prova che un layout sia BELLO ne che un livello di
// effetto sia gradevole — lo stile non e' oracolabile. Prova che i cataloghi esistono, che gli id
// sono versionati e unici, che il lookup e' per uguaglianza esatta su array (mai per prefisso, mai un
// membro ereditato da Object.prototype) e che effects elenca esattamente L0..L4.

// La forma minima condivisa da ogni voce: un id e lo scope (idoneita). Gli invarianti trasversali
// valgono per OGNI catalogo, quindi si esercitano su una tabella che accoppia ogni array al suo
// lookup, invece di ripetere quattro volte lo stesso corpo di test.
type CatalogEntry = { readonly id: string; readonly scope: string };
type CatalogCase = {
  readonly nome: string;
  readonly voci: readonly CatalogEntry[];
  readonly lookup: (id: string) => CatalogEntry | undefined;
  readonly minVoci: number;
};

const CATALOGHI: readonly CatalogCase[] = [
  { nome: 'hero-layouts', voci: HERO_LAYOUTS, lookup: heroLayoutFor, minVoci: 3 },
  { nome: 'section-treatments', voci: SECTION_TREATMENTS, lookup: sectionTreatmentFor, minVoci: 2 },
  { nome: 'effects', voci: EFFECTS, lookup: effectFor, minVoci: 5 },
  { nome: 'ornaments', voci: ORNAMENTS, lookup: ornamentFor, minVoci: 1 },
];

// La forma canonica di un id versionato, DERIVATA dallo schema del documento (document.ts,
// SiteDocumentSchema: `/^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$/`, il gate P2/P4). Usare la STESSA regex
// significa che questi id sono pronti per il freeze in DE-205 senza far cadere il documento.
const ID_VERSIONATO = /^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$/;

describe('DE-201 · cataloghi visivi puri', () => {
  // covers: AC-DE-201-2
  it('ogni id, in ogni catalogo, e nella forma versionata nome@N ed e unico', () => {
    for (const { nome, voci, minVoci } of CATALOGHI) {
      // Un catalogo vuoto renderebbe i cicli veri per vacuita: la soglia lo impedisce.
      expect(voci.length, `${nome}: sotto la soglia di voci`).toBeGreaterThanOrEqual(minVoci); // covers: AC-DE-201-2
      for (const voce of voci) {
        expect(voce.id, `${nome}: id non versionato`).toMatch(ID_VERSIONATO); // covers: AC-DE-201-2
      }
      // Id UNICI dentro il catalogo: un doppione renderebbe il lookup ambiguo.
      const unici = new Set(voci.map((v) => v.id));
      expect(unici.size, `${nome}: id duplicati`).toBe(voci.length); // covers: AC-DE-201-2
    }
  });

  // covers: AC-DE-201-1
  it('xFor trova SOLO l id esatto, mai un prefisso ne un id di cui l id vero e prefisso (ogni catalogo)', () => {
    for (const { nome, voci, lookup } of CATALOGHI) {
      for (const { id } of voci) {
        const trovata = lookup(id);
        expect(trovata, `${nome}: ${id} non trovato per id esatto`).toBeDefined(); // covers: AC-DE-201-1
        expect(trovata?.id, `${nome}: ${id}`).toBe(id); // covers: AC-DE-201-1

        // Il NOME senza '@N' e' un PREFISSO STRETTO dell id: un confronto scritto con startsWith
        // invece che con uguaglianza lo accetterebbe, e DE-205 congelerebbe nel documento un id che
        // nessuna versione ha mai prodotto.
        const senzaVersione = id.replace(/@[0-9]+$/, '');
        expect(senzaVersione, `${nome}: ${id} gia privo di @N`).not.toBe(id);
        expect(lookup(senzaVersione), `${nome}: ${senzaVersione}`).toBeUndefined(); // covers: AC-DE-201-1

        // Verso opposto: l id vero e' PREFISSO di questo ('...@1' -> '...@10').
        expect(lookup(`${id}0`), `${nome}: ${id}0`).toBeUndefined(); // covers: AC-DE-201-1
        // Case sensitive: gli id sono minuscoli per forma.
        expect(lookup(id.toUpperCase()), `${nome}: ${id.toUpperCase()}`).toBeUndefined();
      }
    }
  });

  // covers: AC-DE-201-1
  it('hero-layouts REALE porta la coppia centrato@1 / centrato-foto@1 (un nome prefisso dell altro)', () => {
    const ids = HERO_LAYOUTS.map((h) => h.id);
    expect(ids, 'manca centrato@1').toContain('centrato@1'); // covers: AC-DE-201-1
    expect(ids, 'manca centrato-foto@1').toContain('centrato-foto@1'); // covers: AC-DE-201-1
    // La relazione di prefisso e' REALE sui dati: il token 'centrato' e' prefisso-stringa di
    // ENTRAMBI gli id ma non eguaglia nessuno dei due.
    expect('centrato@1'.startsWith('centrato')).toBe(true);
    expect('centrato-foto@1'.startsWith('centrato')).toBe(true);

    // L id esatto trova SOLO l esatto: lo si prova sui VALORI DISCORDANTI (media), non solo
    // sull id, cosi un lookup che restituisse la voce sbagliata (il prefisso) sarebbe rosso.
    const centrato: SiteHeroLayout | undefined = heroLayoutFor('centrato@1');
    const centratoFoto: SiteHeroLayout | undefined = heroLayoutFor('centrato-foto@1');
    expect(centrato?.id).toBe('centrato@1'); // covers: AC-DE-201-1
    expect(centratoFoto?.id).toBe('centrato-foto@1'); // covers: AC-DE-201-1
    expect(centrato?.media).toBe('senza-foto'); // covers: AC-DE-201-1
    expect(centratoFoto?.media).toBe('foto-riquadro'); // covers: AC-DE-201-1
    expect(centrato?.media).not.toBe(centratoFoto?.media); // covers: AC-DE-201-1

    // Il PREFISSO nudo 'centrato', prefisso-stringa di entrambi gli id veri, non e' una voce;
    // ne lo e' 'centrato-foto' senza versione, ne 'centrato@1' esteso.
    expect(heroLayoutFor('centrato')).toBeUndefined(); // covers: AC-DE-201-1
    expect(heroLayoutFor('centrato-foto')).toBeUndefined(); // covers: AC-DE-201-1
    expect(heroLayoutFor('centrato@11')).toBeUndefined(); // covers: AC-DE-201-1
  });

  // covers: AC-DE-201-3
  it('effects.ts elenca ESATTAMENTE i livelli L0, L1, L2, L3, L4', () => {
    const attesi: readonly EffectLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4'];
    const livelli: EffectLevel[] = EFFECTS.map((e) => e.level);

    // Esattamente cinque voci, una per livello: niente livello mancante o duplicato...
    expect(EFFECTS.length).toBe(attesi.length); // covers: AC-DE-201-3
    expect(new Set(livelli).size, 'livelli duplicati').toBe(attesi.length); // covers: AC-DE-201-3
    // ...ogni livello atteso presente...
    for (const livello of attesi) {
      expect(livelli, `manca ${livello}`).toContain(livello); // covers: AC-DE-201-3
    }
    // ...e NESSUN livello fuori da {L0..L4} (un 'L5' o altro renderebbe rosso).
    const insieme = new Set<string>(attesi);
    for (const livello of livelli) {
      expect(insieme.has(livello), `livello inatteso: ${livello}`).toBe(true); // covers: AC-DE-201-3
    }
    // Confronto d insieme in entrambi i versi, ancorato all ordinamento.
    expect([...livelli].sort()).toEqual([...attesi].sort()); // covers: AC-DE-201-3
  });

  // covers: AC-DE-201-4
  it('xFor con chiavi speciali di Object.prototype restituisce undefined (mai un membro ereditato)', () => {
    // Se il lookup fosse un accesso a un oggetto indicizzato per id, queste chiavi
    // risolverebbero il membro EREDITATO da Object.prototype e xFor restituirebbe qualcosa
    // che non e' una voce del catalogo.
    const chiaviProto = [
      'constructor',
      '__proto__',
      'toString',
      'valueOf',
      'hasOwnProperty',
      'prototype',
      '',
    ];
    for (const { nome, lookup } of CATALOGHI) {
      for (const chiave of chiaviProto) {
        expect(lookup(chiave), `${nome}: ${chiave}`).toBeUndefined(); // covers: AC-DE-201-4
      }
    }
  });

  // Oracolo AGGIUNTIVO (non mappa un AC): l IDONEITA di settore. Ogni voce marca lo scope
  // (universale vs overlay-di-settore), il campo che il fallback della matrice DE-203 usera. Qui si
  // prova che il campo c e', che i valori sono nell insieme ammesso, e che almeno un catalogo
  // MESCOLA universale e overlay (altrimenti il fallback non avrebbe due casi da separare).
  it('ogni voce marca l idoneita e almeno un catalogo mescola universale e overlay di settore', () => {
    const scopeAmmessi = new Set(['universale', 'ristorazione']);
    for (const { nome, voci } of CATALOGHI) {
      for (const voce of voci) {
        expect(typeof voce.scope, `${nome}: ${voce.id} senza scope`).toBe('string');
        expect(scopeAmmessi.has(voce.scope), `${nome}: ${voce.id} scope ignoto ${voce.scope}`).toBe(
          true,
        );
      }
    }
    // Distinzione OSSERVABILE su dati reali: gli ornamenti mescolano universale (divisori) e
    // overlay ristorazione (watermark-cibo).
    const scopeOrnamenti = new Set(ORNAMENTS.map((o) => o.scope));
    expect(scopeOrnamenti.has('universale')).toBe(true);
    expect(scopeOrnamenti.has('ristorazione')).toBe(true);

    // Valori DISCORDANTI anche fuori dagli hero (non un catalogo di cloni): il lookup per id
    // prova identita solo se le voci differiscono. Si toccano i tipi esportati di ogni catalogo.
    const trattamento: SiteSectionTreatment | undefined = sectionTreatmentFor('a-scheda@1');
    const ornamento: SiteOrnament | undefined = ornamentFor('watermark-cibo@1');
    const effetto: SiteEffect | undefined = effectFor('ricco@1');
    expect(trattamento?.surface).toBe('chiaro');
    expect(ornamento?.placement).toBe('angoli');
    expect(effetto?.level).toBe('L2');
  });
});

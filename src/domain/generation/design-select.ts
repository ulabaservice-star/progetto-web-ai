// DE-204 (macrotask design-select) — IL SELETTORE DETERMINISTICO SEMINATO. Da un `vertical` (enum
// chiuso di brief.ts) e un `seed` (stringa opaca) produce le 5 varianti di design di una generazione:
// `selectDesign(vertical, seed, variantIndex)` restituisce la `DesignSelection` i-esima. Dominio PURO
// come la matrice che interroga: nessun DB, nessun I/O, e — punto NON negoziabile del task — nessuna
// sorgente non deterministica (niente `Date`/`Date.now()`/`new Date()`/`Math.random()`). La sola
// casualita' e' un PRNG SEMINATO dal seed: hash della stringa → `mulberry32` → mescolamento
// deterministico. Stessi ingressi, stessa uscita, sempre.
//
// PERCHE' STA A VALLE DELLA MATRICE (DE-203): `allowedCombinations(vertical)` enumera SOLO le
// combinazioni ammesse (tema × hero × trattamento, con effetto e ornamento gia' entro le regole R1/R2);
// il selettore non inventa nulla e non puo' produrre una combinazione che `isAllowed` vieta — pesca da
// quell'insieme e vi attacca la RICETTA (il contenuto, asse ortogonale allo stile, DS-D3). Per questo
// AC-DE-204-4 (property test) regge: ogni selezione e' un elemento del pool ammesso + un recipe_id che
// esiste, quindi resta `isAllowed`.
//
// LA VARIETA' E' STRUTTURALE, non cromatica (il difetto n.1 del vecchio motore: "1 layout in 5
// colori"). DE11-204 (variety-engine) RAFFORZA la vecchia chiave: le 5 varianti si scelgono a
// hero_layout DISTINTO (al piu' UNA per hero), non piu' a "scheletro" hero+trattamento — che ammetteva
// lo STESSO hero su due varianti con trattamenti diversi (3/5 stesso hero). Cosi' il PRIMO SCHERMO
// cambia davvero fra le 5. E ogni coppia differisce anche su >=1 ASSE DEL CORPO, per due garanzie che
// si sommano: (a) `section_layout_id` (DE11-202) e' ancorato all'INDICE dell'hero nella matrice
// (DE11-203), quindi hero distinti ⇒ layout di corpo distinti; (b) la ricetta e' assegnata a ROTAZIONE
// seminata — le 5 varianti ricevono 5 ricette distinte (RECIPES ne ha cinque), un asse di contenuto
// che rafforza la distinzione del corpo. La matrice porta ora anche gli assi DE11-203 (titolo, corpo,
// nastro, illustrazione): la selezione li TRASPORTA tutti (nessun asse "cade" nel freeze del documento).
//
// SIGNALS (Piano B, PREDISPOSTO ma NON attivo): `selectDesign` accetta un 4o argomento OPZIONALE
// `signals` — flag booleani DERIVATI dal call-site (mai testo libero del brief, P2-D1) con cui un
// domani inclinare la scelta. Nel PIANO A e' IGNORATO: l'uscita dipende SOLO da (vertical, seed,
// variantIndex), cosi' introdurlo non tocca alcun mockup gia' prodotto (AC-DE11-204-1/5).
//
// ANTI-INJECTION (P2-D1, security_notes del task): gli unici ingressi sono `vertical` (enum) e `seed`
// (id di generazione, opaco). Non c'e' alcun parametro `brief`, nessun `brand_hints`, nessun testo
// libero: non esiste percorso dal testo del brief alla scelta visiva. Il `seed` non e' contenuto del
// brief — e' un identificatore di generazione fornito DAL CALL-SITE (DE-206) — e serve solo a seminare
// il PRNG, mai a comporre markup.
//
// DETERMINISMO DEL PRNG: `Math.imul`/`Math.floor` sono funzioni PURE (aritmetica a 32 bit e
// arrotondamento), non sorgenti casuali — l'unico `Math` proibito dal task e' `Math.random`, che qui
// non compare.

import {
  allowedCombinations,
  type Combo,
  type Vertical,
} from '@/domain/generation/design-matrix';
import { RECIPES } from '@/domain/generation/recipes';

/**
 * UNA SELEZIONE DI DESIGN congelabile nel documento (DE-205): SOLI id di catalogo esistenti. Coordina
 * con la `Combo` della matrice (DE-203) — stessi assi visivi — ma qui `recipe_id` e' OBBLIGATORIO
 * (il selettore sceglie anche il contenuto, non solo lo stile) e `ornament_id` resta opzionale (un
 * sito puo' non avere ornamento). `effect_level` e' la chiave canonica L0..L4, non un id di catalogo.
 */
export type DesignSelection = Combo & { readonly recipe_id: string };

/**
 * DE11-204 (variety-engine) — SEGNALI DERIVATI del PIANO B, oggi PREDISPOSTI ma NON usati. Un domani il
 * call-site potra' passarli per INCLINARE la scelta (es. "l'attivita' ha foto" → preferisci un hero
 * fotografico). Sono FLAG BOOLEANI DERIVATI a monte, MAI testo libero del brief (P2-D1, anti-injection):
 * i valori sono si'/no, non prosa, e non esiste percorso dal testo del brief a questa struttura. La
 * forma resta un semplice record di flag per non impegnare oggi la semantica che il Piano B decidera'.
 * Nel PIANO A `selectDesign` lo IGNORA: passarlo non cambia l'uscita (AC-DE11-204-1/5).
 */
export type DesignSignals = Readonly<Record<string, boolean>>;

/** Le varianti per generazione: cinque proposte, come il resto del motore (P2-D3, pool 0..4). */
const VARIANT_COUNT = 5;

/**
 * Hash a 32 bit di una stringa (FNV-1a). PURO e deterministico: nessun `Date`, nessun `Math.random`.
 * `Math.imul` fa la moltiplicazione a 32 bit con wrap; `>>> 0` normalizza a intero senza segno. Serve
 * solo a trasformare il seed testuale in un intero da cui seminare il PRNG.
 */
function hashStringToInt(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * `mulberry32`: un PRNG a 32 bit compatto e SEMINATO. Restituisce una funzione che a ogni chiamata da'
 * un float in [0, 1). Deterministico per costruzione — la stessa `seedInt` produce la stessa sequenza —
 * ed e' l'unica sorgente di "casualita'" del modulo. Nessun `Math.random`, nessun tempo.
 */
function mulberry32(seedInt: number): () => number {
  let state = seedInt >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates SEMINATO: ritorna una NUOVA copia mescolata (non muta l'ingresso — il pool della
 * matrice e' `readonly` e condiviso). Consuma il PRNG in modo deterministico.
 */
function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Costruisce l'INTERO insieme ordinato delle 5 varianti di una generazione (vertical, seed), da cui
 * `selectDesign` estrae la i-esima. Deterministico:
 *  1. enumera le combinazioni AMMESSE (DE-203) per il vertical;
 *  2. semina il PRNG dal seed e mescola il pool;
 *  3. sceglie AL PIU' UNA combinazione per hero_layout DISTINTO (DE11-204): i 5 hero delle varianti
 *     sono cosi' a due a due DIVERSI — piu' forte della vecchia chiave hero+trattamento, che ammetteva
 *     lo stesso hero su due varianti;
 *  4. assegna a ROTAZIONE seminata una ricetta distinta a ciascuna (asse del CORPO che, con
 *     `section_layout_id` ancorato all'hero, garantisce la differenza di corpo per ogni coppia).
 *
 * INVARIANTE della matrice: `allowedCombinations` offre >=5 hero_layout DISTINTI per ogni vertical
 * dell'enum (DE11-203, pinnato dai suoi test: >=5 hero universali, ciascuno almeno con `piano@1`). Se
 * cio' non fosse — regressione della matrice — la selezione non potrebbe garantire 5 varianti a hero
 * distinto: allora FALLISCE FORTE con un errore che nomina il vertical, invece di restituire in
 * silenzio meno di 5 varianti o dei cloni.
 */
function buildVariants(vertical: Vertical, seed: string): readonly DesignSelection[] {
  const pool = allowedCombinations(vertical);
  const rng = mulberry32(hashStringToInt(seed));

  const order = shuffled(pool, rng);
  const recipeOffset = Math.floor(rng() * RECIPES.length);

  // DE11-204 — DEDUP per hero_layout DISTINTO (non piu' per scheletro hero+trattamento): si prende la
  // PRIMA combinazione di ogni hero nell'ordine mescolato, cosi' i 5 hero risultano a due a due diversi
  // (il primo schermo cambia davvero). La differenza sul CORPO viene sopra, garantita: `section_layout_id`
  // e' ancorato all'indice dell'hero nella matrice (hero distinti ⇒ layout di corpo distinti) e la
  // ricetta e' a rotazione (5 ricette distinte).
  const picked: Combo[] = [];
  const usedHeroes = new Set<string>();
  for (const combo of order) {
    if (picked.length >= VARIANT_COUNT) break;
    if (usedHeroes.has(combo.hero_layout_id)) continue;
    usedHeroes.add(combo.hero_layout_id);
    picked.push(combo);
  }

  if (picked.length < VARIANT_COUNT) {
    throw new Error(
      `design-select: la matrice offre solo ${picked.length} hero_layout distinti per ` +
        `'${vertical}' (attesi almeno ${VARIANT_COUNT}) — regressione di design-matrix (DE11-203)`,
    );
  }

  return picked.map((combo, position) => {
    const recipe = RECIPES[(recipeOffset + position) % RECIPES.length];
    // La selezione E' la combinazione ammessa (TUTTI i suoi assi, inclusi i nuovi di DE11-203 —
    // h1_treatment/section_layout/ribbon/illustration) PIU' la ricetta. Lo spread TRASPORTA ogni asse
    // senza che uno possa "cadere" per dimenticanza; `allowedCombinations` non emette mai chiavi a
    // valore undefined (usa spread condizionali), quindi la copia resta pulita e `recipe_id` (una
    // stringa definita) soddisfa il tipo di `DesignSelection`.
    const selection: DesignSelection = { ...combo, recipe_id: recipe.id };
    return selection;
  });
}

/**
 * La `DesignSelection` della variante `variantIndex` (0..4) della generazione (vertical, seed). PURA e
 * DETERMINISTICA: due chiamate con gli stessi argomenti danno una selezione identica (AC-DE11-204-1).
 *
 * `signals` (DE11-204, PIANO B PREDISPOSTO) e' OPZIONALE e nel Piano A DELIBERATAMENTE IGNORATO: la
 * selezione dipende SOLO da (vertical, seed, variantIndex), quindi passarlo, ometterlo o passarne uno
 * arbitrario da' SEMPRE la stessa uscita (AC-DE11-204-1/5). E' un ingresso di flag DERIVATI, mai testo
 * libero del brief (P2-D1): predisporre la firma non apre alcun canale dal testo del brief allo stile.
 *
 * `variantIndex` fuori da 0..4 (o non intero) e' un errore del CALL-SITE, non un `undefined`
 * silenzioso: la funzione lo respinge con un `RangeError`. Le varianti si ricostruiscono a ogni
 * chiamata — la funzione e' pura, non porta cache tra le chiamate — coerente con l'uso di DE-206, che
 * chiama una volta per variante.
 */
export function selectDesign(
  vertical: Vertical,
  seed: string,
  variantIndex: number,
  signals?: DesignSignals,
): DesignSelection {
  // PIANO A — `signals` e' ACCETTATO ma IGNORATO (il Piano B non e' implementato qui). Il `void` lo
  // marca "usato" per il linter senza leggerlo: nessun ramo della selezione dipende da esso, cosi'
  // l'uscita resta funzione delle sole (vertical, seed, variantIndex).
  void signals;
  if (!Number.isInteger(variantIndex) || variantIndex < 0 || variantIndex >= VARIANT_COUNT) {
    throw new RangeError(
      `design-select: variantIndex ${variantIndex} fuori da 0..${VARIANT_COUNT - 1}`,
    );
  }
  return buildVariants(vertical, seed)[variantIndex];
}

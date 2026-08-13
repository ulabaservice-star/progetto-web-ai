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
// colori"). Le 5 varianti si scelgono a SCHELETRO STRUTTURALE distinto (hero_layout + section_treatment):
// la matrice garantisce >=5 scheletri distinti per ogni vertical (DE-203), quindi ogni coppia differisce
// su >=1 asse strutturale. In piu' la ricetta e' assegnata a ROTAZIONE seminata: le 5 varianti ricevono
// 5 ricette distinte (RECIPES ne ha cinque), un secondo asse strutturale che rafforza la distinzione.
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
 * La chiave dello SCHELETRO STRUTTURALE di una combinazione: hero_layout + section_treatment. Due
 * combinazioni con scheletro diverso differiscono su >=1 asse strutturale (l'asse "forte" della
 * varieta', §Parte 3 di ristorazione.md). Lo spazio come separatore non compare negli id
 * 'nome-kebab@N', quindi la concatenazione non collide.
 */
function skeletonKey(combo: Combo): string {
  return `${combo.hero_layout_id} ${combo.section_treatment_id}`;
}

/**
 * Costruisce l'INTERO insieme ordinato delle 5 varianti di una generazione (vertical, seed), da cui
 * `selectDesign` estrae la i-esima. Deterministico:
 *  1. enumera le combinazioni AMMESSE (DE-203) per il vertical;
 *  2. semina il PRNG dal seed e mescola il pool;
 *  3. sceglie le prime combinazioni a SCHELETRO STRUTTURALE distinto (>=1 asse strutturale per coppia);
 *  4. assegna a ROTAZIONE seminata una ricetta distinta a ciascuna (secondo asse strutturale).
 *
 * INVARIANTE della matrice: `allowedCombinations` offre >=5 scheletri distinti per ogni vertical
 * dell'enum (DE-203, pinnato dai suoi test). Se cio' non fosse — regressione della matrice — la
 * selezione non potrebbe garantire 5 varianti strutturalmente distinte: allora FALLISCE FORTE con un
 * errore che nomina il vertical, invece di restituire in silenzio meno di 5 varianti o dei cloni.
 */
function buildVariants(vertical: Vertical, seed: string): readonly DesignSelection[] {
  const pool = allowedCombinations(vertical);
  const rng = mulberry32(hashStringToInt(seed));

  const order = shuffled(pool, rng);
  const recipeOffset = Math.floor(rng() * RECIPES.length);

  const picked: Combo[] = [];
  const usedSkeletons = new Set<string>();
  for (const combo of order) {
    if (picked.length >= VARIANT_COUNT) break;
    const key = skeletonKey(combo);
    if (usedSkeletons.has(key)) continue;
    usedSkeletons.add(key);
    picked.push(combo);
  }

  if (picked.length < VARIANT_COUNT) {
    throw new Error(
      `design-select: la matrice offre solo ${picked.length} scheletri strutturali distinti per ` +
        `'${vertical}' (attesi almeno ${VARIANT_COUNT}) — regressione di design-matrix (DE-203)`,
    );
  }

  return picked.map((combo, position) => {
    const recipe = RECIPES[(recipeOffset + position) % RECIPES.length];
    const selection: DesignSelection = {
      recipe_id: recipe.id,
      theme_id: combo.theme_id,
      hero_layout_id: combo.hero_layout_id,
      section_treatment_id: combo.section_treatment_id,
      effect_level: combo.effect_level,
      ...(combo.ornament_id !== undefined ? { ornament_id: combo.ornament_id } : {}),
    };
    return selection;
  });
}

/**
 * La `DesignSelection` della variante `variantIndex` (0..4) della generazione (vertical, seed). PURA e
 * DETERMINISTICA: due chiamate con gli stessi argomenti danno una selezione identica (AC-DE-204-1).
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
): DesignSelection {
  if (!Number.isInteger(variantIndex) || variantIndex < 0 || variantIndex >= VARIANT_COUNT) {
    throw new RangeError(
      `design-select: variantIndex ${variantIndex} fuori da 0..${VARIANT_COUNT - 1}`,
    );
  }
  return buildVariants(vertical, seed)[variantIndex];
}

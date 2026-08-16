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
import { BODY_LAYOUTS } from '@/domain/generation/section-layouts';
import { themeFor } from '@/domain/generation/themes';

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
 * DV2-501 (variety-select) — IL `section_layout_id` PER-BLOCCO di una sezione del CORPO, congelato per
 * variante. `variant-document` lo assegna a ogni blocco del corpo (chi-siamo/orari/contatti/recensioni/
 * faq) cosi' che il renderer renda la variante di catalogo (BODY_LAYOUTS, DV2-401) invece del proprio
 * fallback, e le 5 varianti di un seed mostrino un CORPO diverso (la varieta' del corpo, non solo
 * dell'hero, raggiunge il mockup).
 *
 * PURO e DETERMINISTICO (nessun Date/Math.random): filtra il catalogo per SEZIONE e per SCOPE del
 * vertical (universale + overlay di settore, la stessa "idoneita' di settore" di `availableByScope` della
 * matrice), poi sceglie con un OFFSET seminato dal seed + il `variantIndex`. Con >=5 varianti per ogni
 * sezione del catalogo (DS-V2-D2), `(offset + variantIndex)` fa cadere le 5 varianti (0..4) su id
 * DISTINTI, senza collisione. `undefined` se la sezione non ha varianti (un blocco che NON e' del corpo —
 * hero/offerte — non ne riceve una: hanno un asse di DOCUMENTO, non un layout per-blocco).
 *
 * NON e' l'algoritmo greedy (DV2-503, out_of_scope qui): e' la derivazione per-blocco dell'asse
 * section_layout, seminata dal solo seed. La distinzione FORTE di hero/theme e la scelta delle combo
 * restano al selettore combinatorio.
 */
export function selectBodyLayout(
  section: string,
  vertical: Vertical,
  seed: string,
  variantIndex: number,
): string | undefined {
  const candidati = BODY_LAYOUTS.filter(
    (layout) =>
      layout.section === section && (layout.scope === 'universale' || layout.scope === vertical),
  );
  if (candidati.length === 0) return undefined;
  const offset = hashStringToInt(`${seed}:body:${section}`) % candidati.length;
  return candidati[(offset + variantIndex) % candidati.length].id;
}

/**
 * DV2-503 (variety-select) — GLI ASSI DI VARIETA' v2 (DS-V2-D9), la base della metrica di somiglianza
 * della greedy: theme, hero, menu, section-layout (di DOCUMENTO), recipe. NON gli assi decorativi legacy
 * (section_treatment/effect/ornament/ribbon/illustration): la decorazione vive DENTRO le varianti CD, la
 * greedy la ignora (DS-V2-D9). `section_layout_id` qui e' quello di DOCUMENTO del Combo; il corpo
 * per-blocco lo diversifica `selectBodyLayout`, seminato dal seed (sopra).
 */
const VARIETY_AXES = [
  'theme_id',
  'hero_layout_id',
  'menu_layout_id',
  'section_layout_id',
  'recipe_id',
] as const;

/** SOMIGLIANZA = numero di assi di varieta' col MEDESIMO valore fra due combinazioni (recipe inclusa). */
function similarity(a: Combo, b: Combo): number {
  let n = 0;
  for (const axis of VARIETY_AXES) {
    const va = a[axis];
    if (va !== undefined && va === b[axis]) n += 1;
  }
  return n;
}

/** La somiglianza MASSIMA di `c` con un insieme di gia' scelte (0 se l'insieme e' vuoto). */
function maxSimilarityTo(c: Combo, chosen: readonly Combo[]): number {
  let max = 0;
  for (const p of chosen) {
    const s = similarity(c, p);
    if (s > max) max = s;
  }
  return max;
}

// ── DV2-505 (variety-select, ibrido A) — DISTANZA CROMATICA DELLE PALETTE ─────────────────────────────
// La greedy esclude il `theme_id` esatto (5 temi distinti), ma un id distinto non garantisce una PALETTE
// visibilmente diversa: il catalogo ristorazione tende al caldo-crema, e senza guida la scelta puo'
// pescare 5 accenti tutti terracotta/bruno (il difetto "palette sempre uguale" notato al gate). Qui si
// misura una DISTANZA CROMATICA fra due temi — differenza di TINTA dell'accento (l'occhio nota l'accento)
// + differenza di LUMINOSITA' del fondo pagina (crema chiaro vs fondo scuro/freddo) — e la si usa come
// obiettivo SECONDARIO del farthest-first: fra i candidati che gia' minimizzano la somiglianza d'assi, si
// preferisce il tema piu' LONTANO cromaticamente da quelli scelti. Puro/deterministico (nessun
// Date/Math.random): legge i colori del catalogo dei temi.

/** HSL da un colore '#rrggbb'. PURO. `h` in [0,360), `s`/`l` in [0,1]. Un colore malformato -> l=0. */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (m === null) return { h: 0, s: 0, l: 0 };
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 0xff) / 255;
  const g = ((int >> 8) & 0xff) / 255;
  const b = (int & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/**
 * Distanza cromatica fra i temi di due id, in [0, ~1.7]. Componente TINTA d'accento (circolare, 0..1
 * normalizzando la differenza di hue su 180 gradi) PIU' componente LUMINOSITA' del fondo pagina (0..1),
 * quest'ultima pesata 0.7 (l'accento pesa piu' del fondo). La saturazione dell'accento scala il peso
 * della tinta: due accenti quasi grigi non "distano" per tinta (evita di inseguire hue instabili su colori
 * desaturati). Un id non risolvibile da' 0 (difesa; non accade coi temi del catalogo).
 */
function paletteDistance(themeIdA: string, themeIdB: string): number {
  const a = themeFor(themeIdA);
  const b = themeFor(themeIdB);
  if (a === undefined || b === undefined) return 0;
  const accA = hexToHsl(a.colors.accent);
  const accB = hexToHsl(b.colors.accent);
  const bgA = hexToHsl(a.colors.surface_page);
  const bgB = hexToHsl(b.colors.surface_page);
  const hueRaw = Math.abs(accA.h - accB.h);
  const hueDiff = Math.min(hueRaw, 360 - hueRaw) / 180; // circolare, 0..1
  const satWeight = Math.min(accA.s, accB.s); // tinte poco sature contano meno
  const lightDiff = Math.abs(bgA.l - bgB.l); // 0..1
  return hueDiff * satWeight + lightDiff * 0.7;
}

/** La distanza cromatica MINIMA di `c` dai temi gia' scelti (Infinity se l'insieme e' vuoto). */
function minPaletteDistTo(c: Combo, chosen: readonly Combo[]): number {
  let min = Infinity;
  for (const p of chosen) {
    const d = paletteDistance(c.theme_id, p.theme_id);
    if (d < min) min = d;
  }
  return min;
}

/**
 * DV2-504 (variety-select) — IL FAIL-SAFE DEL MATERIALE (DS-V2-D4 punto 6). L'esclusione DURA della
 * greedy presuppone che il pool offra >=VARIANT_COUNT `hero_layout_id` DISTINTI E >=VARIANT_COUNT
 * `theme_id` distinti: senza, non si possono dare 5 varianti a hero+theme a due a due diversi. Se il
 * materiale non c'e' (una regressione della matrice o un vertical povero), FALLISCE FORTE con un errore
 * che NOMINA il vertical — meglio un errore esplicito che 5 cloni silenziosi (L-COL-006). Puro: conta i
 * valori distinti, nessun Date/Math.random. E' esportato cosi' che il suo ramo di errore sia oracolabile
 * con un pool CRAFTED (i 5 vertical reali hanno sempre materiale sufficiente, DS-V2-D2, quindi
 * `selectDesign` non lo raggiunge mai su di essi — ma la rete c'e').
 */
export function assertSufficientMaterial(vertical: Vertical, pool: readonly Combo[]): void {
  const distinctHeroes = new Set(pool.map((c) => c.hero_layout_id)).size;
  const distinctThemes = new Set(pool.map((c) => c.theme_id)).size;
  if (distinctHeroes < VARIANT_COUNT || distinctThemes < VARIANT_COUNT) {
    throw new Error(
      `design-select: materiale insufficiente per '${vertical}' (hero distinti ${distinctHeroes}, ` +
        `theme distinti ${distinctThemes}, attesi almeno ${VARIANT_COUNT} ciascuno) — ` +
        `regressione di design-matrix`,
    );
  }
}

/**
 * Costruisce l'INTERO insieme ordinato delle 5 varianti di una generazione (vertical, seed), da cui
 * `selectDesign` estrae la i-esima. SELEZIONE GREEDY FARTHEST-FIRST (DS-V2-D4), deterministica:
 *  1. enumera le combinazioni AMMESSE (DE-203) per il vertical — ognuna porta gli assi di varieta' v2
 *     (theme/hero/menu/section-layout/recipe, quest'ultimo da DV2-502);
 *  2. semina il PRNG dal seed e mescola il pool (`order`): unica sorgente di casualita';
 *  3. PRIMA variante = la prima del pool mescolato;
 *  4. variante `i` (i>=1) = fra le combo NON scelte, quella che MINIMIZZA la somiglianza MASSIMA (n. di
 *     assi in comune, recipe inclusa) con le gia' scelte — la piu' "lontana" — con ESCLUSIONE DURA di
 *     hero_layout_id e theme_id finche' esistono hero/temi liberi (il primo schermo e la palette sono
 *     cio' che l'occhio nota per primo); tie-break DETERMINISTICO via l'ordine seminato (il primo
 *     candidato di `order` che raggiunge il minimo).
 *
 * L'esclusione dura si RILASSA in ordine solo se il materiale finisse (prima il theme, poi l'hero: l'hero
 * si difende piu' a lungo). Con DS-V2-D2 (molte palette + molti hero) non accade per N=5; DV2-504 pinna
 * il requisito. Se il pool non offre >=5 hero E >=5 theme DISTINTI, `buildVariants` FALLISCE FORTE
 * nominando il vertical (mai cloni silenziosi, L-COL-006).
 *
 * PURA E DETERMINISTICA: nessun Date/Math.random; l'unica sorgente e' `mulberry32(hash(seed))`. Stessi
 * (vertical, seed) -> stesse 5 varianti byte per byte.
 */
function buildVariants(vertical: Vertical, seed: string): readonly DesignSelection[] {
  const pool = allowedCombinations(vertical);
  // Requisito di materiale per l'esclusione dura (DV2-504): >=VARIANT_COUNT hero E theme DISTINTI. Senza,
  // la greedy non potrebbe dare 5 varianti a hero+theme distinti: FALLISCE FORTE nominando il vertical
  // (mai cloni silenziosi). Prima di seminare il PRNG: il fallimento non dipende dal seed.
  assertSufficientMaterial(vertical, pool);

  const rng = mulberry32(hashStringToInt(seed));
  const order = shuffled(pool, rng);

  const chosen: Combo[] = [order[0]];
  const chosenSet = new Set<Combo>([order[0]]);
  const usedHero = new Set<string>([order[0].hero_layout_id]);
  const usedTheme = new Set<string>([order[0].theme_id]);

  // Tiers di eleggibilita': esclusione DURA di hero+theme finche' c'e' materiale; poi rilassa in ordine
  // (prima il theme, poi l'hero, infine qualunque non-scelto).
  const tiers: readonly ((c: Combo) => boolean)[] = [
    (c) => !usedHero.has(c.hero_layout_id) && !usedTheme.has(c.theme_id),
    (c) => !usedHero.has(c.hero_layout_id),
    (c) => !usedTheme.has(c.theme_id),
    () => true,
  ];

  while (chosen.length < VARIANT_COUNT) {
    let candidati: Combo[] = [];
    for (const tier of tiers) {
      candidati = order.filter((c) => !chosenSet.has(c) && tier(c));
      if (candidati.length > 0) break;
    }
    // FARTHEST-FIRST a due obiettivi: (1) PRIMARIO — minimizza la somiglianza MASSIMA d'assi con le gia'
    // scelte; (2) SECONDARIO (DV2-505, ibrido A) — a parita' di somiglianza, MASSIMIZZA la distanza
    // cromatica minima dai temi scelti (palette piu' lontana: accento di tinta diversa, fondo piu'
    // chiaro/scuro). I candidati sono in `order` (mescolato dal seed) e i confronti sono STRETTI, quindi a
    // parita' PIENA vince il PRIMO in quell'ordine: tie-break deterministico e seminato.
    let best = candidati[0];
    let bestSim = maxSimilarityTo(best, chosen);
    let bestPal = minPaletteDistTo(best, chosen);
    for (const c of candidati) {
      const sim = maxSimilarityTo(c, chosen);
      if (sim > bestSim) continue;
      const pal = minPaletteDistTo(c, chosen);
      if (sim < bestSim || pal > bestPal) {
        best = c;
        bestSim = sim;
        bestPal = pal;
      }
    }
    chosen.push(best);
    chosenSet.add(best);
    usedHero.add(best.hero_layout_id);
    usedTheme.add(best.theme_id);
  }

  return chosen.map((combo) => {
    // La selezione E' la combinazione ammessa (TUTTI i suoi assi) con `recipe_id` obbligatorio. La
    // matrice (DV2-502) lo valorizza sempre; `?? RECIPES[0].id` e' la difesa DICHIARATA (mai un caso
    // vivo) contro una futura combo senza ricetta, e soddisfa il tipo di `DesignSelection`.
    const selection: DesignSelection = { ...combo, recipe_id: combo.recipe_id ?? RECIPES[0].id };
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

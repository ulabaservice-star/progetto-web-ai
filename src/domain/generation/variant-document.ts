// FX-CHOOSE(D1) — RIALLOCATO da src/ui/generation/ al DOMINIO. `poolForVariant` e
// `resolveVariantHome` sono TRASFORMAZIONI PURE di documento (pool + ricetta + brief -> documento
// della sola home, dietro `parseDocument`): nessun React, nessun I/O, nessun accesso al DB, e le
// sole dipendenze sono altri moduli di dominio (document/gate/pages/pool/resolve/recipes/themes) e
// il brief. Vivevano in src/ui/ solo perche' la card (VariantCard, T-232) fu il primo consumatore;
// ma la SCELTA & CONGELA lato dato (selectVariant, src/data/generation-choose.ts) le importava, e
// un import data->ui viola il contratto di layering. Portandole nel dominio, data->dominio e
// ui->dominio sono entrambi leciti e il renderer resta UNICO (la card e la scrittura passano dallo
// STESSO compositore, mai un secondo albero).
//
// T-232 (macrotask generation-ui, P2) — LA COMPOSIZIONE PURA di una card del selettore: da
// pool + ricetta + brief al DOCUMENTO della sola home, pronto per lo STESSO renderer che
// l'anteprima (T-235) usera' (SiteView, T-231). Nessun accesso al DB, nessun I/O, nessun
// side effect: gli stessi argomenti danno lo stesso documento, ed e' su questa purezza che
// poggiano AC-232-1 (card e anteprima identiche) e AC-232-4 (cambiare tema/ricetta e' puro,
// zero chiamate al confine).
//
// P2-D3 (copia-su-scrittura) VIVE IN `poolForVariant`: la variante `i` rende dal proprio pool
// se esiste, ALTRIMENTI dal pool CONDIVISO. E' cio' che rende AC-232-3 verificabile senza
// chiave — dopo una rigenerazione della sola variante 2, le altre quattro selezionano ancora
// lo STESSO oggetto pool condiviso, quindi rendono lo stesso albero per costruzione.
//
// DA DE-206 LA SELEZIONE VISIVA NASCE DENTRO `resolveVariantHome`, non piu' fuori: il compositore non
// riceve piu' una `recipe` gia' scelta, ma un `seed` (id STABILE della generazione, opaco) e un
// `variantIndex`, e chiede a `selectDesign(brief.vertical, seed, variantIndex)` (DE-204) la
// `DesignSelection` della variante — poi risolve `recipeFor`/`themeFor` dai suoi id. E' il verso
// giusto del disaccoppiamento (DS-D3): la RICETTA e' contenuto, il TEMA e le nuove manopole (hero,
// trattamento, effetti, ornamento) sono stile, e il selettore combinatorio li sceglie insieme fra le
// sole combinazioni AMMESSE dalla matrice (DE-203) — mai il modello.
//
// ANTI-INJECTION (P2-D1, security_note del task): l'UNICO ingresso di settore e' `brief.vertical`
// (enum chiuso di brief.ts); il `seed` non e' contenuto del brief ma un id di generazione fornito dal
// CALL-SITE. Non esiste alcun percorso dal testo libero del brief (`brand_hints` compreso) alla
// scelta visiva: un'iniezione riuscita nel brief non puo' alterare l'aspetto del sito.
//
// `themeFor`/`recipeFor` SONO LOOKUP ESATTI SU ARRAY (proto-safe): gli id vengono dal selettore, che
// pesca da THEMES/RECIPES, quindi risolvono sempre; il ramo `null` resta la difesa DICHIARATA contro
// una futura divergenza fra selettore e cataloghi, non un caso vivo.
//
// IL DOCUMENTO PASSA SEMPRE DA `parseDocument` PRIMA DI ESSERE RESO (T-202): `resolve` e' puro
// e non e' un gate (lo dichiara il suo file), quindi la card non rende il suo risultato grezzo
// — lo fa passare dal gate, esattamente come la scrittura (T-204). Un pool cosi' incompleto da
// produrre una pagina senza blocchi non e' un documento valido: la card allora non rende nulla
// (`null`) invece di montare un albero che il gate rifiuterebbe.

import {
  DOCUMENT_LIMITS,
  parseDocument,
  type SiteDocument,
} from '@/domain/generation/document';
import { isPlainObject } from '@/domain/generation/gate';
import { pagesFor } from '@/domain/generation/pages';
import type { Pool } from '@/domain/generation/pool';
import { resolve } from '@/domain/generation/resolve';
import { recipeFor, type SiteRecipe } from '@/domain/generation/recipes';
import { themeFor, type SiteTheme } from '@/domain/generation/themes';
import { selectDesign, selectBodyLayout } from '@/domain/generation/design-select';
import { withPresentationSections } from '@/domain/generation/presentation';
import type { Brief } from '@/domain/onboarding/brief';

/**
 * I pool 'home' di una generazione, letti da `readHomePools` (T-232 data): il pool CONDIVISO
 * (`shared`, `variant_index` null) e quelli PER VARIANTE (`byVariant`, indicizzati 0..4). E'
 * la forma su cui `poolForVariant` applica la copia-su-scrittura di P2-D3.
 */
export type HomePools = {
  readonly shared: unknown;
  readonly byVariant: Readonly<Record<number, unknown>>;
};

/** Il risultato di una card: la ricetta e il tema mostrati, e il documento GATED della home. */
export type VariantResolution = {
  readonly recipe: SiteRecipe;
  readonly theme: SiteTheme;
  readonly document: SiteDocument;
};

/**
 * IL POOL DELLA VARIANTE `index` (P2-D3, copia-su-scrittura): il pool proprio della variante se
 * esiste, ALTRIMENTI il pool condiviso. La lettura di `byVariant` e' su proprieta' PROPRIE
 * (`Object.hasOwn`): un indice non presente cade sul condiviso, e nessun membro di
 * Object.prototype puo' fingersi un pool di variante.
 */
export function poolForVariant(pools: HomePools, index: number): unknown {
  return Object.hasOwn(pools.byVariant, index) ? pools.byVariant[index] : pools.shared;
}

/**
 * COMPONE il documento della sola HOME per una variante e ne CONGELA la selezione visiva (DE-206).
 * Passi: chiede a `selectDesign(brief.vertical, seed, variantIndex)` (DE-204) la `DesignSelection`
 * della variante; risolve `recipeFor`/`themeFor` dai suoi id; applica ricetta e tema al pool sul set
 * della sola home (P2-D13, `pagesFor(...)[0]`); CONGELA `hero_layout_id`/`section_treatment_id`/
 * `effect_level`/`ornament_id?` nel documento (DS-D4, id versionati opzionali che il gate accetta e
 * non ri-deriva al render); e infine fa passare il tutto da `parseDocument`.
 *
 * Restituisce `null` se ricetta o tema non risolvono (difesa dichiarata, vedi l'intestazione) o se il
 * documento non supera il gate — mai un albero non validato.
 *
 * Il `seed` e' un id STABILE della generazione, opaco e fornito dal CALL-SITE (DE-206), MAI testo del
 * brief (P2-D1): con esso e col `variantIndex` la selezione e' deterministica e riproducibile. Il
 * `maxPages` e' `DOCUMENT_LIMITS.max_pages`, lo STESSO che la fase 1 usa per derivare la home
 * (phase1.ts): cosi' la home della card e' quella che verra' congelata (T-233), non un'altra.
 */
export function resolveVariantHome(
  pool: unknown,
  brief: Brief,
  seed: string,
  variantIndex: number,
): VariantResolution | null {
  // LA SELEZIONE DESIGN della variante (DE-204): input = brief.vertical (enum) + seed di generazione,
  // mai testo libero del brief. La ricetta NASCE QUI DENTRO, scelta dal selettore fra le sole
  // combinazioni ammesse, non piu' pre-scelta fuori.
  const selection = selectDesign(brief.vertical, seed, variantIndex);
  const recipe = recipeFor(selection.recipe_id);
  const theme = themeFor(selection.theme_id);
  if (recipe === undefined || theme === undefined) return null;

  const homeSpec = pagesFor(brief, { maxPages: DOCUMENT_LIMITS.max_pages })[0];
  // Il pool viene da jsonb OPACO (gia' validato in scrittura, T-201): la guardia serve solo a
  // non far cadere `resolve` se il contenuto non fosse un oggetto proprio (un pool condiviso
  // assente vale "pagina vuota", che il gate sotto respinge come card senza blocchi).
  const safePool = (isPlainObject(pool) ? pool : { pages: {} }) as Pool;

  const { document } = resolve(safePool, recipe, theme, brief, [homeSpec]);
  // DV2-402/AC-402-3 (body-sections-a) — COMPOSIZIONE DI PRESENTAZIONE: aggiunge alla home i blocchi
  // recensioni/faq (scheletro) quando mancano, cosi' il mockup non resta coi vuoti (DS-V2-D11 #3). Puro
  // e A VALLE di resolve: `blocksFor`/`generatable` (il gate di costo, T-210/T-215) restano INTATTI e la
  // regola anti-invenzione non cambia (le sezioni rendono copy UI fissa, mai dati del modello).
  const presentato = withPresentationSections(document);
  // DV2-501 (variety-select) — CONGELA il `section_layout_id` PER-BLOCCO di ogni sezione del CORPO
  // (DS-V2-D11 #2): il renderer del corpo (DV2-402/403) legge `block.section_layout_id` e rende la
  // variante di catalogo (BODY_LAYOUTS) invece del proprio fallback, cosi' le 5 varianti mostrano un
  // corpo diverso. `selectBodyLayout` e' PURO/DETERMINISTICO (seminato dal solo seed): un blocco che NON
  // e' del corpo (hero/offerte — hanno un asse di DOCUMENTO) riceve `undefined` e resta invariato.
  const pagineCongelate = presentato.pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      const sectionLayoutId = selectBodyLayout(block.id, brief.vertical, seed, variantIndex);
      return sectionLayoutId !== undefined ? { ...block, section_layout_id: sectionLayoutId } : block;
    }),
  }));
  // CONGELA la tupla di selezione (DS-D4): id versionati che il gate registra e non ri-deriva al
  // render, cosi' un sito scelto non si re-stila da solo dopo un ritocco ai cataloghi. `ornament_id`
  // solo se la selezione lo porta (un sito puo' non avere ornamento, DS-D5): niente id fabbricato.
  // DV2-501 aggiunge: l'asse MENU (`menu_layout_id`, se la selezione lo porta) cosi' Offerte rende la
  // variante scelta e non il fallback; e il `vertical`, che SiteView INOLTRA ai blocchi (Offerte sceglie
  // la variante logica per settore) — `vertical` non e' in `brief_fields_rendered` di offerte, quindi
  // NON arriva via `block.data`, e senza congelarlo il menu cadrebbe sulla variante generica.
  const frozen = {
    ...presentato,
    pages: pagineCongelate,
    vertical: brief.vertical,
    hero_layout_id: selection.hero_layout_id,
    section_treatment_id: selection.section_treatment_id,
    effect_level: selection.effect_level,
    ...(selection.ornament_id !== undefined ? { ornament_id: selection.ornament_id } : {}),
    ...(selection.menu_layout_id !== undefined ? { menu_layout_id: selection.menu_layout_id } : {}),
  };
  const parsed = parseDocument(frozen);
  if (!parsed.ok) return null;

  return { recipe, theme, document: parsed.document };
}

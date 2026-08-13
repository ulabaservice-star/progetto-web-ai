// DE-203 (macrotask design-select) — LA MATRICE DI COMPATIBILITA: quali combinazioni di manopole
// visive sono AMMESSE. Due funzioni PURE su dati dichiarati da noi: `isAllowed(combo)` vieta gli
// accoppiamenti brutti codificando REGOLE NOSTRE, e `allowedCombinations(vertical)` enumera SOLO le
// combinazioni ammesse per un settore (overlay ristorazione + fallback universale). Dominio PURO
// come i cataloghi che interroga: nessun DB, nessun I/O, nessun Date/Math.random — solo dati e
// aritmetica deterministica.
//
// PERCHE' STA QUI, ORTOGONALE ALLE RICETTE (DS-D3): la ricetta resta il CONTENUTO (quali sezioni, in
// che ordine); la matrice governa lo STILE (tema · hero · trattamento · effetti · ornamento). Per
// questo `recipe_id` nella `Combo` e' OPZIONALE e la matrice NON lo sceglie: lo attacchera' chi
// compone il documento (DE-206), e `isAllowed` si limita a verificarne l'esistenza se presente. Il
// selettore (DE-204) pesca da `allowedCombinations` e non puo' mai produrre una combinazione che
// `isAllowed` vieta — sono la stessa verita' vista da due lati.
//
// ANTI-INJECTION (P2-D1, security_notes del task): l'unica porta d'ingresso di SETTORE e' il
// `vertical` (enum chiuso di brief.ts), mai testo libero del brief (niente `brand_hints`). Non
// esiste alcun percorso dal testo del brief alla scelta visiva: un'iniezione riuscita nel brief non
// puo' alterare l'aspetto del sito. Tutti gli altri ingressi sono id di CATALOGO, risolti per
// uguaglianza esatta su array (proto-safe): un id ereditato da Object.prototype non risolve nulla.
//
// LE REGOLE, DICHIARATE E ANCORATE A PEZZI DI CATALOGO ESISTENTI (nessuna regola su id fantasma):
//   R1 · un hero a FOTO PIENA (full-bleed, `media === 'foto-piena'`) regge poco movimento: effetti
//        al piu' L2. Ancora al tratto `media` dell'hero, non a un id, cosi' un ritocco di versione
//        dell'hero non slega la regola.
//   R2 · LEGGIBILITA: un trattamento che FISSA una superficie (`surface` 'chiaro'/'scuro') di segno
//        OPPOSTO alla base del tema mette il testo del tema su un fondo del suo stesso segno →
//        illeggibile. Il segno del tema si legge dalla LUMINANZA del suo `background` reale (dato di
//        catalogo), il segno del trattamento dal suo `surface`. 'ereditato' non fissa nulla: sempre
//        compatibile.

import { EFFECTS, type EffectLevel } from '@/domain/generation/effects';
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
import { ORNAMENTS, ornamentFor, type SiteOrnament } from '@/domain/generation/ornaments';
import { THEMES, themeFor, type SiteTheme } from '@/domain/generation/themes';
import { recipeFor } from '@/domain/generation/recipes';
import type { CatalogScope } from '@/domain/generation/design-catalog';
import type { Brief } from '@/domain/onboarding/brief';

/**
 * Il settore, esattamente l'enum chiuso di `brief.ts` (`Brief['vertical']`): e' l'UNICO ingresso di
 * settore della matrice. Derivato dal brief e non riscritto a mano, cosi' un vertical nuovo o
 * rinominato nell'enum si propaga qui senza una seconda lista che diverga.
 */
export type Vertical = Brief['vertical'];

/**
 * UNA COMBINAZIONE di manopole visive. Coordinata con la `DesignSelection` che DE-204 produrra':
 * `recipe_id` e `ornament_id` sono OPZIONALI (la matrice sceglie lo stile, non il contenuto, e
 * l'ornamento e' un di piu'). `effect_level` e' la chiave canonica L0..L4 (la stessa del documento,
 * DE-205), non un id di catalogo.
 */
export type Combo = {
  readonly recipe_id?: string;
  readonly theme_id: string;
  readonly hero_layout_id: string;
  readonly section_treatment_id: string;
  readonly effect_level: EffectLevel;
  readonly ornament_id?: string;
};

/** I livelli di effetto in ordine crescente di movimento, DERIVATI dal catalogo (L0..L4). */
const ORDERED_LEVELS: readonly EffectLevel[] = EFFECTS.map((effect) => effect.level);

/** Il rango numerico di ogni livello, per confrontare "quanto movimento" con un tetto (R1). */
const EFFECT_RANK: Readonly<Record<EffectLevel, number>> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };

/** Il tetto di movimento di un hero a foto piena (R1): fino a L2 incluso, non oltre. */
const FULL_BLEED_EFFECT_CEILING = EFFECT_RANK.L2;

/**
 * Il tema e' "scuro" se il suo `background` reale ha luminanza bassa. Calcolo PURO su un colore
 * '#rrggbb' (luma BT.601 su 0..255): nessun dato fuori dal catalogo, nessun flag da tenere in
 * sincronia. Un background malformato da' `NaN` → non-scuro (default sicuro: R2 non sovra-vieta).
 */
function isDarkBackground(background: string): boolean {
  const r = parseInt(background.slice(1, 3), 16);
  const g = parseInt(background.slice(3, 5), 16);
  const b = parseInt(background.slice(5, 7), 16);
  const luma = r * 0.299 + g * 0.587 + b * 0.114;
  return luma < 128;
}

/**
 * R2 — il trattamento FISSA una superficie di segno OPPOSTO alla base del tema? 'ereditato' non
 * fissa alcun tono (segue il tema) → mai in conflitto. 'chiaro' su tema scuro, o 'scuro' su tema
 * chiaro, mette il testo del tema su un fondo del suo stesso segno → illeggibile.
 */
function surfaceConflictsWithTheme(theme: SiteTheme, treatment: SiteSectionTreatment): boolean {
  if (treatment.surface === 'ereditato') return false;
  const dark = isDarkBackground(theme.colors.background);
  if (dark && treatment.surface === 'chiaro') return true;
  if (!dark && treatment.surface === 'scuro') return true;
  return false;
}

/**
 * `true` se la combinazione e' AMMESSA: tutti gli id risolvono a voci di catalogo esistenti (lookup
 * esatto, proto-safe) e nessuna regola dichiarata la vieta. Un id fantasma o ereditato da
 * Object.prototype, o un `effect_level` fuori da L0..L4, la fanno cadere: la matrice non pronuncia
 * mai un verdetto su pezzi che non esistono.
 */
export function isAllowed(combo: Combo): boolean {
  const theme = themeFor(combo.theme_id);
  const hero = heroLayoutFor(combo.hero_layout_id);
  const treatment = sectionTreatmentFor(combo.section_treatment_id);
  if (theme === undefined || hero === undefined || treatment === undefined) return false;
  // `effect_level` deve essere un livello REALE del catalogo (guardia a runtime: un documento gia'
  // scritto potrebbe portare un valore che il tipo vieta a monte).
  if (!EFFECTS.some((effect) => effect.level === combo.effect_level)) return false;
  // Gli id opzionali, se presenti, devono risolvere: nessun riferimento pendente sopravvive.
  if (combo.ornament_id !== undefined && ornamentFor(combo.ornament_id) === undefined) return false;
  if (combo.recipe_id !== undefined && recipeFor(combo.recipe_id) === undefined) return false;

  // R1 — un hero a foto piena regge al piu' L2.
  if (hero.media === 'foto-piena' && EFFECT_RANK[combo.effect_level] > FULL_BLEED_EFFECT_CEILING) {
    return false;
  }
  // R2 — leggibilita: niente superficie fissata di segno opposto al tema.
  if (surfaceConflictsWithTheme(theme, treatment)) return false;

  return true;
}

/**
 * Le voci di un catalogo DISPONIBILI per un vertical: le UNIVERSALI (il fallback, sempre) piu'
 * quelle il cui overlay combacia col settore. E' la "idoneita' di settore" (`scope`) delle voci che
 * decide l'insieme — per 'ristorazione' entra anche l'overlay, per ogni altro vertical resta il solo
 * fallback universale.
 */
function availableByScope<T extends { readonly scope: CatalogScope }>(
  items: readonly T[],
  vertical: Vertical,
): readonly T[] {
  return items.filter((item) => item.scope === 'universale' || item.scope === vertical);
}

/**
 * Il livello di effetto per un hero, ruotato per SPARGERE i livelli lungo l'elenco (varieta' di
 * movimento per DE-204) ma sempre entro il tetto dell'hero (R1 non viene mai violata in origine).
 */
function pickEffectLevel(hero: SiteHeroLayout, index: number): EffectLevel {
  const ceiling = hero.media === 'foto-piena' ? FULL_BLEED_EFFECT_CEILING : EFFECT_RANK.L4;
  const consentiti = ORDERED_LEVELS.filter((level) => EFFECT_RANK[level] <= ceiling);
  return consentiti[index % consentiti.length];
}

/**
 * L'ornamento (opzionale) per una combinazione, ruotato fra "nessuno" e gli ornamenti DISPONIBILI
 * per il settore: da' varieta' e rende osservabile l'overlay (il watermark di cibo compare solo in
 * ristorazione). `undefined` = nessun ornamento.
 */
function pickOrnament(ornaments: readonly SiteOrnament[], index: number): string | undefined {
  const opzioni: readonly (string | undefined)[] = [undefined, ...ornaments.map((o) => o.id)];
  return opzioni[index % opzioni.length];
}

/**
 * Enumera SOLO le combinazioni AMMESSE per un vertical. Prodotto deterministico dei tre assi
 * PRIMARI di varieta' (tema × hero × trattamento — struttura + tipografia/colore, cfr.
 * ristorazione.md §Parte 3), con `effect_level` e `ornament_id` ruotati per spargere movimento e
 * decoro lungo l'elenco. Ogni combinazione passa da `isAllowed`, quindi le coppie illeggibili (R2)
 * sono scartate qui e l'elenco non contiene mai una combinazione vietata.
 *
 * PURA E DETERMINISTICA: cicli su cataloghi in ordine di dichiarazione + un contatore, nessun
 * Date/Math.random. `recipe_id` resta assente: la ricetta e' contenuto ortogonale (DS-D3), scelto a
 * valle da DE-206.
 */
export function allowedCombinations(vertical: Vertical): readonly Combo[] {
  const heroes = availableByScope(HERO_LAYOUTS, vertical);
  const treatments = availableByScope(SECTION_TREATMENTS, vertical);
  const ornaments = availableByScope(ORNAMENTS, vertical);

  const combos: Combo[] = [];
  let flavor = 0;
  for (const theme of THEMES) {
    for (const hero of heroes) {
      for (const treatment of treatments) {
        const effect_level = pickEffectLevel(hero, flavor);
        const ornament_id = pickOrnament(ornaments, flavor);
        flavor += 1;
        const candidate: Combo = {
          theme_id: theme.id,
          hero_layout_id: hero.id,
          section_treatment_id: treatment.id,
          effect_level,
          ...(ornament_id !== undefined ? { ornament_id } : {}),
        };
        if (isAllowed(candidate)) combos.push(candidate);
      }
    }
  }
  return combos;
}

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
//   R3 · (DE11-203, macrotask variety-engine) COERENZA HERO↔ILLUSTRAZIONE: un'illustrazione di
//        catalogo (`illustration_id`, DE11-104) puo' vestire SOLO un hero che OSPITA lo slot
//        'illustrazione' — oggi il solo 'editoriale-illustrato@1'. Appenderne una a un hero che non
//        le lascia posto (una foto piena, un centrato di sola tipografia) e' incoerente: la scena non
//        avrebbe dove vivere. Ancora al tratto `slots` dell'hero (dato di catalogo), non a un id.
//
// I NUOVI ASSI (DE11-203): la Combo cresce di quattro manopole OPZIONALI — `h1_treatment_id`
// (DE11-201, il tratto del titolo), `section_layout_id` (DE11-202, l'impaginazione del CORPO),
// `ribbon_id` (DE11-202, il nastro divisorio) e `illustration_id` (DE11-104). Sono ADDITIVE e
// retro-compatibili: una Combo v1 senza questi campi resta valida e `isAllowed` non la penalizza. Se
// presenti, `isAllowed` ne verifica l'ESISTENZA nei cataloghi (lookup esatto, proto-safe) e applica
// R3. `allowedCombinations` li POPOLA per rompere il difetto v1 "3/5 stesso hero, corpo mai variato":
// e' su `section_layout_id` (legato all'INDICE dell'hero) che poggia la garanzia di 5 varianti a hero
// E corpo tutti diversi.

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
// DE11-203 (variety-engine) — i cataloghi dei nuovi assi: il tratto dell'H1 (DE11-201), i layout di
// sezione e i nastri (DE11-202), le illustrazioni (DE11-104). Si importano sia gli ARRAY (per
// popolare in `allowedCombinations`) sia i LOOKUP esatti (per validare in `isAllowed`, proto-safe).
import { H1_TREATMENTS, h1TreatmentFor } from '@/domain/generation/h1-treatments';
import {
  SECTION_LAYOUTS,
  sectionLayoutFor,
  RIBBONS,
  ribbonFor,
  // DV2-303 (macrotask menu, design-engine-v2) — l'asse MENU: il catalogo (per popolare per-vertical)
  // e il lookup esatto (per validare in `isAllowed`, proto-safe).
  MENU_LAYOUTS,
  menuLayoutFor,
  type SiteSectionLayout,
  type SiteRibbon,
  type SiteMenuLayout,
} from '@/domain/generation/section-layouts';
import { ILLUSTRATIONS, illustrationFor } from '@/domain/generation/illustrations';
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
  // DE11-203 (variety-engine) — I NUOVI ASSI del titolo e del CORPO, tutti OPZIONALI e ADDITIVI: una
  // Combo v1 costruita senza di essi resta valida (i test v1 non regrediscono) e `isAllowed` non la
  // penalizza. Se presenti, devono risolvere nei rispettivi cataloghi (DE11-201/202/104), proto-safe.
  readonly h1_treatment_id?: string;
  readonly section_layout_id?: string;
  readonly ribbon_id?: string;
  readonly illustration_id?: string;
  // DV2-303 (macrotask menu) — l'ASSE MENU (design-engine-v2), OPZIONALE e ADDITIVO come gli altri di
  // v1.1: una Combo senza di esso resta valida (i test v1/v1.1 non regrediscono) e `isAllowed` non la
  // penalizza. Se presente, deve risolvere nel catalogo `MENU_LAYOUTS` (lookup esatto, proto-safe). E'
  // un asse INDIPENDENTE (non derivato dall'indice hero, cfr. `pickMenuLayout`): chiude il buco di v1.1
  // dove `menu-card-carta` non era mai selezionato perche' ancorato a `heroIndex % len`.
  readonly menu_layout_id?: string;
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
 * R3 (DE11-203) — l'hero OSPITA uno slot 'illustrazione'? Solo allora una scena del catalogo
 * illustrazioni (DE11-104) ha un posto dove vivere. Il segnale e' il tratto `slots` dell'hero (dato
 * di catalogo): oggi il solo 'editoriale-illustrato@1' lo dichiara; gli hero v1 non hanno `slots`
 * (campo opzionale) → nessuno spazio, quindi nessuna illustrazione ammessa. Guardia esplicita su
 * `undefined` invece dell'optional-chaining per leggere alla lettera "l'hero non ha slot".
 */
function heroHostsIllustration(hero: SiteHeroLayout): boolean {
  return hero.slots !== undefined && hero.slots.includes('illustrazione');
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
  // I NUOVI ASSI (DE11-203), se presenti, devono risolvere nei loro cataloghi (lookup esatto,
  // proto-safe): un id fantasma, un prefisso-senza-@N o una chiave ereditata da Object.prototype
  // fanno cadere la combinazione, come per gli assi storici.
  if (combo.h1_treatment_id !== undefined && h1TreatmentFor(combo.h1_treatment_id) === undefined) {
    return false;
  }
  if (
    combo.section_layout_id !== undefined &&
    sectionLayoutFor(combo.section_layout_id) === undefined
  ) {
    return false;
  }
  if (combo.ribbon_id !== undefined && ribbonFor(combo.ribbon_id) === undefined) return false;
  if (combo.illustration_id !== undefined && illustrationFor(combo.illustration_id) === undefined) {
    return false;
  }
  // DV2-303 — l'asse MENU, se presente, deve risolvere nel catalogo (lookup esatto, proto-safe): un id
  // fantasma, un prefisso-senza-@N o una chiave ereditata da Object.prototype fanno cadere la combo.
  if (combo.menu_layout_id !== undefined && menuLayoutFor(combo.menu_layout_id) === undefined) {
    return false;
  }

  // R1 — un hero a foto piena regge al piu' L2.
  if (hero.media === 'foto-piena' && EFFECT_RANK[combo.effect_level] > FULL_BLEED_EFFECT_CEILING) {
    return false;
  }
  // R2 — leggibilita: niente superficie fissata di segno opposto al tema.
  if (surfaceConflictsWithTheme(theme, treatment)) return false;
  // R3 — coerenza hero↔illustrazione: una scena solo su un hero che ne ospita lo slot.
  if (combo.illustration_id !== undefined && !heroHostsIllustration(hero)) return false;

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
 * DE11-203 — il trattamento dell'H1 (DE11-201) per una combinazione, ruotato lungo l'elenco per
 * SPARGERE la varieta' tipografica del titolo lungo il pool. Sempre valorizzato: tutti i tratti d'H1
 * sono 'universale', quindi non c'e' un caso "nessuno" da lasciar passare (a differenza di ornamento
 * e nastro, decorativi e opzionali).
 */
function pickH1Treatment(index: number): string {
  return H1_TREATMENTS[index % H1_TREATMENTS.length].id;
}

/**
 * DE11-203 — il nastro divisorio (DE11-202) per una combinazione, ruotato fra "nessuno" e i nastri
 * DISPONIBILI per il settore: da' varieta' e rende osservabile l'overlay (il gingham della tovaglia
 * compare solo in ristorazione, mai altrove — lo garantisce `availableByScope` a monte). `undefined`
 * = nessun nastro.
 */
function pickRibbon(ribbons: readonly SiteRibbon[], index: number): string | undefined {
  const opzioni: readonly (string | undefined)[] = [undefined, ...ribbons.map((r) => r.id)];
  return opzioni[index % opzioni.length];
}

/**
 * DE11-203 — il layout di sezione del CORPO (DE11-202), ANCORATO all'INDICE dell'hero nell'elenco
 * disponibile: hero DIVERSI ricevono cosi' layout di corpo DIVERSI (mappa INIETTIVA finche' gli hero
 * non superano i layout — oggi 5-6 hero contro >=6 layout). E' QUESTA scelta che regge la garanzia
 * "5 varianti con hero E corpo tutti diversi" con cui v1.1 rompe il difetto v1 "corpo mai variato":
 * poiche' OGNI combo di un dato hero porta lo STESSO section_layout, selezionandone una per hero
 * distinto i layout di corpo risultano a due a due distinti — senza dipendere da un contatore globale
 * (che potrebbe far collidere due hero sullo stesso layout). Sceglie con `heroIndex % layouts.length`:
 * se un domani gli hero superassero i layout, due hero condividerebbero un corpo, e allora la garanzia
 * andra' rinforzata (o il catalogo layout allargato).
 */
function pickSectionLayout(layouts: readonly SiteSectionLayout[], heroIndex: number): string {
  return layouts[heroIndex % layouts.length].id;
}

/**
 * DV2-303 (macrotask menu) — la variante di MENU per una combinazione, ruotata sul contatore GLOBALE
 * `flavor` (come `pickH1Treatment`/`pickRibbon`), NON sull'indice dell'hero. E' la differenza che
 * chiude il buco di v1.1: `pickSectionLayout` ancorava il layout del corpo a `heroIndex % len`, cosi'
 * tutte le combo di uno stesso hero portavano lo STESSO layout e `menu-card-carta` (unico menu del
 * corpo) non era mai raggiunto. Qui l'asse e' INDIPENDENTE: combo di uno stesso hero ma flavor diversi
 * (theme/treatment diversi) ricevono menu DIVERSI, e ruotando su `flavor` l'insieme copre TUTTO il
 * catalogo disponibile per il settore (>=2 id distinti, AC-DV2-303-1). `undefined` solo se il catalogo
 * filtrato fosse vuoto (non accade: le disposizioni generiche sono 'universale', sempre disponibili).
 */
function pickMenuLayout(menuLayouts: readonly SiteMenuLayout[], index: number): string | undefined {
  if (menuLayouts.length === 0) return undefined;
  return menuLayouts[index % menuLayouts.length].id;
}

/**
 * Enumera SOLO le combinazioni AMMESSE per un vertical. Prodotto deterministico dei tre assi
 * PRIMARI di varieta' (tema × hero × trattamento — struttura + tipografia/colore, cfr.
 * ristorazione.md §Parte 3), con gli assi DECORATIVI/DEL CORPO POPOLATI sopra: `effect_level`,
 * `ornament_id`, `h1_treatment_id` e `ribbon_id` ruotati sul contatore `flavor` per spargere
 * movimento, decoro, titolo e nastro lungo l'elenco; `section_layout_id` invece ANCORATO all'indice
 * dell'hero (vedi `pickSectionLayout`) e `illustration_id` acceso SOLO sull'hero che ospita lo slot
 * (R3). Ogni combinazione passa da `isAllowed`, quindi le coppie illeggibili (R2), gli hero a foto
 * piena sopra il tetto (R1) e le illustrazioni senza casa (R3) sono scartate qui e l'elenco non
 * contiene mai una combinazione vietata.
 *
 * LA GARANZIA DE11-203 (rompere "3/5 stesso hero, corpo mai variato"): l'iterazione visita TUTTI gli
 * hero DISPONIBILI (>=5 universali, +overlay), e ciascuno compare almeno con `piano@1` (superficie
 * 'ereditato', mai in conflitto R2) → >=5 hero_layout_id DISTINTI nel pool. Poiche' `section_layout_id`
 * e' funzione INIETTIVA dell'indice dell'hero, prendendo UNA combo per hero distinto si ottengono 5
 * combo con hero E corpo (section_layout) a due a due diversi — la premessa strutturale che DE11-204
 * trasforma in 5 varianti.
 *
 * PURA E DETERMINISTICA: cicli su cataloghi in ordine di dichiarazione + un contatore, nessun
 * Date/Math.random. `recipe_id` resta assente: la ricetta e' contenuto ortogonale (DS-D3), scelto a
 * valle da DE-206.
 */
export function allowedCombinations(vertical: Vertical): readonly Combo[] {
  const heroes = availableByScope(HERO_LAYOUTS, vertical);
  const treatments = availableByScope(SECTION_TREATMENTS, vertical);
  const ornaments = availableByScope(ORNAMENTS, vertical);
  // DE11-203 — i cataloghi dei nuovi assi filtrati per settore: i layout di sezione e i nastri
  // rispettano lo scope (il menu card-carta e il gingham sono overlay di ristorazione, non escono
  // altrove). Le illustrazioni non hanno scope (sono trasversali, DE11-104) → si attingono direttamente.
  const sectionLayouts = availableByScope(SECTION_LAYOUTS, vertical);
  const ribbons = availableByScope(RIBBONS, vertical);
  // DV2-303 — il catalogo del MENU filtrato per settore: la ristorazione vede tutte e 20 le varianti
  // (universali + overlay carta-ristorante), gli altri settori le sole disposizioni generiche
  // ('universale'). Mai vuoto (le generiche ci sono sempre), cosi' ogni combo porta un menu valido.
  const menuLayouts = availableByScope(MENU_LAYOUTS, vertical);

  const combos: Combo[] = [];
  let flavor = 0;
  for (const theme of THEMES) {
    for (let heroIndex = 0; heroIndex < heroes.length; heroIndex += 1) {
      const hero = heroes[heroIndex];
      for (const treatment of treatments) {
        const effect_level = pickEffectLevel(hero, flavor);
        const ornament_id = pickOrnament(ornaments, flavor);
        // DE11-203 — assi del titolo/CORPO/nastro. `h1_treatment_id` e `section_layout_id` sono
        // SEMPRE valorizzati (nessun caso "nessuno"); `ribbon_id` e' opzionale; `illustration_id` si
        // accende SOLO sull'hero che ne ospita lo slot, cosi' R3 non scarta mai una combo popolata qui.
        const h1_treatment_id = pickH1Treatment(flavor);
        const section_layout_id = pickSectionLayout(sectionLayouts, heroIndex);
        // DV2-303 — l'asse MENU ruota su `flavor` (INDIPENDENTE dall'indice hero): due combo di uno
        // stesso hero ma flavor diverso ricevono menu diversi, e l'insieme copre tutto il catalogo.
        const menu_layout_id = pickMenuLayout(menuLayouts, flavor);
        const ribbon_id = pickRibbon(ribbons, flavor);
        const illustration_id = heroHostsIllustration(hero)
          ? ILLUSTRATIONS[flavor % ILLUSTRATIONS.length].id
          : undefined;
        flavor += 1;
        const candidate: Combo = {
          theme_id: theme.id,
          hero_layout_id: hero.id,
          section_treatment_id: treatment.id,
          effect_level,
          h1_treatment_id,
          section_layout_id,
          ...(menu_layout_id !== undefined ? { menu_layout_id } : {}),
          ...(ornament_id !== undefined ? { ornament_id } : {}),
          ...(ribbon_id !== undefined ? { ribbon_id } : {}),
          ...(illustration_id !== undefined ? { illustration_id } : {}),
        };
        if (isAllowed(candidate)) combos.push(candidate);
      }
    }
  }
  return combos;
}

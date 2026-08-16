// T-231 (macrotask generation-ui, P2) — le firme condivise dal renderer del sito generato.
// Un modulo a parte perche' i componenti di blocco e il registry devono conoscere le stesse
// prop senza importarsi a vicenda (il registry importa i componenti, i componenti importano
// solo questo tipo).

import type { ReactElement } from 'react';
import type { SiteBlock } from '@/domain/generation/document';

/**
 * Cosa riceve OGNI componente di blocco: il blocco RISOLTO (content dal pool, data dai campi
 * del brief, images) e il locale del sito. Il TEMA non passa di qui: i suoi colori li applica
 * la RADICE del render (`siteThemeStyle` in SiteView) come custom property, e i blocchi da li'
 * in giu' riferiscono solo `var(--site-...)`. Nessun blocco legge un token del tema, quindi la
 * prop `theme` non esiste: era filata a ogni componente e a `renderBlock` senza che nessuno la
 * leggesse. P2-D14 resta invariato — i componenti non importano il design system del builder,
 * lo vieta ESLint — ma il tema lo consuma la radice, non il blocco.
 */
export type SiteBlockProps = {
  readonly block: SiteBlock;
  readonly locale: string;
  /**
   * Modalita EDITABLE (T-305, P3): quando true, gli slot di testo del blocco sono resi dentro
   * l'isola client <EditableText> (via `SiteText`) invece che come children puri. Opzionale e
   * falsy di default, cosi' il render di P2 (read-only) resta identico e i consumatori esistenti
   * non cambiano. La prop viaggia da `SiteView` attraverso `renderBlock` fino al blocco; nessun
   * blocco legge il TEMA (resta a `var(--site-...)` alla radice), ma la modalita si', perche' e'
   * il blocco a sapere QUALI dei suoi campi sono slot di testo editabili.
   */
  readonly editable?: boolean;
  /**
   * DV2-202 (macrotask hero, design-engine-v2) — la SELEZIONE DESIGN CONGELATA di cui un blocco ha
   * bisogno per scegliere la propria variante. Oggi la usa il SOLO Hero, che risolve
   * `hero_layout_id` (id versionato `hero-<kebab>@1` o uno dei 6 legacy) nella variante di catalogo
   * da rendere. Additiva e OPZIONALE: un blocco che non la legge resta identico, e un chiamante che
   * non la passa (`renderBlock` senza il 4o argomento) rende l'hero col suo fallback di default.
   *
   * E' un oggetto ristretto (non `SiteDesignSelection` di SiteView) per NON creare un ciclo di
   * import fra questo modulo e il renderer: qui vivono i soli campi che i blocchi consumano —
   * `hero_layout_id` per Hero (DV2-202) e `menu_layout_id` per Offerte (DV2-302). Additivi e
   * OPZIONALI: un blocco che non li legge resta identico, un chiamante che non li passa rende il
   * blocco col suo fallback di default.
   */
  readonly design?: {
    readonly hero_layout_id?: string;
    readonly menu_layout_id?: string;
  };
};

/**
 * Un componente di blocco: un Server Component ASINCRONO (legge le etichette con
 * `getTranslations`) che restituisce l'albero reso. E' la forma che il registry mappa da
 * id di blocco, e che T-237 estendera' coi blocchi di dati senza un secondo renderer.
 */
export type SiteBlockComponent = (props: SiteBlockProps) => Promise<ReactElement>;

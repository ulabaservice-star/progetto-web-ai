// T-231 (macrotask generation-ui, P2) — IL RENDERER CONDIVISO del sito generato (P2-D8: "un
// solo renderer per card e anteprima"). `SitePageView` rende UNA pagina del documento
// congelato; `SiteView` rende l'intero documento. Entrambi impostano ALLA RADICE le custom
// property del tema (`siteThemeStyle`), l'unico punto in cui i valori del tema diventano
// stile: i blocchi da qui in giu' riferiscono solo `var(--site-...)`.
//
// CONSUMATORE DI PRODUZIONE (P2-D26): in WF1 questo renderer non ha ancora una rotta che lo
// monti — la card (T-232) e l'anteprima (T-235) di WF2 lo importeranno. Non e' dead-code:
// e' l'interfaccia esportata su cui quei task poggiano, e non si aggiunge una rotta finta per
// "usarlo" (PIN di T-231). `data-block-id` sui blocchi espone la sequenza che AC-232-1
// confrontera' fra card e anteprima.
//
// I blocchi sono RISOLTI prima di comporre l'albero: `renderBlock` e' atteso e il suo
// risultato inserito come elemento gia' pronto, cosi' l'albero non contiene componenti
// asincroni annidati. Un blocco senza componente (un blocco di dati prima di T-237) rende
// `null` ed e' saltato.

// DE-101 (macrotask visual-skin) — il foglio UNICO del sito generato importato UNA SOLA VOLTA
// dal renderer condiviso: SitePageView + SiteView sono l'unico punto da cui i blocchi (card,
// anteprima, /s/) discendono, quindi un import qui copre ogni superficie senza una seconda
// copia altrove. Consuma i token che siteThemeStyle proietta alla radice (--site-scale-*,
// --site-space-*, --site-radius-*, --site-color-*).
import './site.css';
import type { ReactElement } from 'react';
import type { SiteDocument, SitePage } from '@/domain/generation/document';
import type { SiteTheme } from '@/domain/generation/themes';
import { siteThemeStyle } from '@/ui/site/theme-style';
import { SITE_FONT_VARIABLE_CLASSNAME } from '@/ui/site/site-fonts';
import { renderBlock } from '@/ui/site/registry';

// DE-207 (macrotask design-select) — LA SELEZIONE DESIGN CONGELATA nel documento (DS-D4): i quattro
// id versionati che il render proietta ALLA RADICE come data-attribute. E' un sottoinsieme del
// SiteDocument, non un tipo nuovo: cambia con esso, e restare un Pick impedisce che qui si nomini un
// campo che il documento non ha. Il render NON risolve gli id contro i cataloghi (altitudine: quello
// e' dominio) — congela i valori e lascia al CSS (site.css) e all'isola effetti (DE-302) di
// consumarli via i selettori d'attributo.
export type SiteDesignSelection = Pick<
  SiteDocument,
  'hero_layout_id' | 'section_treatment_id' | 'effect_level' | 'ornament_id'
>;

export async function SitePageView({
  page,
  theme,
  locale,
  editable,
  design,
}: {
  page: SitePage;
  theme: SiteTheme;
  locale: string;
  editable?: boolean;
  /**
   * DE-207 — la selezione design congelata, quando questa pagina e' la RADICE del render (una pagina
   * resa standalone). Opzionale: assente, la pagina non porta i data-attribute di selezione (React
   * omette un attributo il cui valore e' `undefined`). SiteView la passa sempre giu' dal documento.
   */
  design?: SiteDesignSelection;
}) {
  const rendered = await Promise.all(
    page.blocks.map((block) => renderBlock(block, locale, editable)),
  );

  return (
    <div
      className={`site-page ${SITE_FONT_VARIABLE_CLASSNAME}`}
      data-site-page={page.slug}
      style={siteThemeStyle(theme)}
      // DE-207 — i ganci d'attributo della selezione congelata. Valore `undefined` -> React omette
      // l'attributo, quindi l'ornamento assente (opzionale, DS-D5) non compare.
      data-hero-layout={design?.hero_layout_id}
      data-section-treatment={design?.section_treatment_id}
      data-ornament={design?.ornament_id}
      data-effects={design?.effect_level}
    >
      {rendered.map((element, index) =>
        element ? (
          <div key={index} className="site-block">
            {element}
          </div>
        ) : null,
      )}
    </div>
  );
}

export async function SiteView({
  document: siteDocument,
  theme,
  locale,
  editable,
}: {
  document: SiteDocument;
  theme: SiteTheme;
  locale: string;
  /**
   * Modalita EDITABLE (T-305, P3): inoltrata a ogni pagina e blocco. Quando true gli slot di
   * testo diventano isole client <EditableText>; quando falsy (default) il render e' identico a
   * quello read-only di P2. Il TEMA e la struttura non cambiano fra le due modalita: cambia solo
   * l'involucro attorno al testo. Renderer UNICO — nessuna copia client dei blocchi (P2-D8).
   */
  editable?: boolean;
}) {
  // DE-207 — la selezione design vive a livello di DOCUMENTO: la si estrae qui una volta e la si passa
  // a ogni pagina, cosi' la radice del render (la `.site-view`) e le radici di pagina portano gli
  // stessi ganci d'attributo. Un Pick del documento, non un oggetto nuovo di valori: se il gate ha
  // normalizzato i default (DE-205) sono gia' qui; ornament_id puo' restare `undefined`.
  const design: SiteDesignSelection = {
    hero_layout_id: siteDocument.hero_layout_id,
    section_treatment_id: siteDocument.section_treatment_id,
    effect_level: siteDocument.effect_level,
    ornament_id: siteDocument.ornament_id,
  };

  const pages: ReactElement[] = await Promise.all(
    siteDocument.pages.map((page) => SitePageView({ page, theme, locale, editable, design })),
  );

  return (
    <div
      className={`site-view ${SITE_FONT_VARIABLE_CLASSNAME}`}
      style={siteThemeStyle(theme)}
      // DE-207 — gli stessi ganci d'attributo alla RADICE del render dell'intero documento: il CSS
      // delle varianti (site.css) e l'isola effetti (DE-302) li leggono da qui. `undefined` -> attributo
      // omesso (ornamento opzionale, DS-D5).
      data-hero-layout={design.hero_layout_id}
      data-section-treatment={design.section_treatment_id}
      data-ornament={design.ornament_id}
      data-effects={design.effect_level}
    >
      {pages.map((element, index) => (
        <div key={index}>{element}</div>
      ))}
    </div>
  );
}

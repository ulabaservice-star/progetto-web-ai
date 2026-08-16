// DV2-402 (macrotask body-sections, design-engine-v2) — BLOCCO CHI-SIAMO v2: il racconto dell'attivita'
// come RENDERER UNICO di 12 impaginati tradotti da Claude Design (components/story/ChiSiamo.jsx). Il
// blocco consuma `block.section_layout_id` (DS-V2-D11, PER-BLOCCO), risolve la variante dal catalogo del
// dominio (`bodyLayoutFor`) e proietta `data-section-layout` sulla radice; il congelamento pieno lo
// scrive variety-select (DV2-503), qui senza id si cade sul fallback.
//
// GLI SLOT sono quelli di v1 (about_title / about_body / about_points): il brief NON e' reso qui
// (`brief_fields_rendered: []`, T-210) — description/highlights entrano nella proiezione e tornano come
// PROSA negli slot. Ogni stringa passa da `SiteText` ed e' ESCAPED da React (AC-DV2-402-4); nessun
// iniezione di HTML grezzo (vietata da AC-231-4). I colori sono SOLO var(--site-color-*) (nessun letterale). Le foto sono M5
// (`BodyPhoto`: la foto caricata o il PhotoPlaceholder di catalogo) — mai una risorsa esterna.

import type { CSSProperties, ReactElement } from 'react';
import { SiteText } from '@/ui/site/SiteText';
import { siteBlockLabel } from '@/ui/site/labels';
import { bodyLayoutFor } from '@/domain/generation/section-layouts';
import {
  BODY_CARD_SHADOW,
  BODY_SECTION_PAD_Y,
  BodyContainer,
  BodyEyebrow,
  BodyPhoto,
} from '@/ui/site/blocks/body-kit';
import type { SiteBlockProps } from '@/ui/site/types';
import type { ImageSlot } from '@/domain/generation/document';

/** I nomi delle 12 varianti di chi-siamo (l'asse VISIBILE del catalogo, section-layouts.ts BODY_LAYOUTS). */
type StoryVariantName =
  | 'overlap'
  | 'timeline'
  | 'punti-sotto'
  | 'banda-scura'
  | 'lettera'
  | 'mosaico'
  | 'numeri'
  | 'citazione'
  | 'foto-piena'
  | 'colonne'
  | 'ritratti'
  | 'manifesto';

const FALLBACK_SECTION_LAYOUT_ID = 'chi-siamo-overlap@1';
const FALLBACK_VARIANT: StoryVariantName = 'overlap';

/** Il contesto risolto passato a ogni variante: gli slot editabili e le immagini M5. */
type AboutContext = {
  readonly blockId: string;
  readonly editable?: boolean;
  readonly label: string;
  readonly title?: string;
  readonly body?: string;
  readonly points: readonly string[];
  readonly images: readonly ImageSlot[];
};

// ── helper condivisi (slot chi-siamo, sempre resi via SiteText per l'editabilita') ────────────────

/** Occhiello (etichetta di catalogo) + titolo display (slot about_title). */
function Head({
  ctx,
  align = 'left',
  onDark = false,
}: {
  ctx: AboutContext;
  align?: 'left' | 'center';
  onDark?: boolean;
}): ReactElement {
  return (
    <div style={{ textAlign: align, maxWidth: align === 'center' ? 680 : undefined, marginInline: align === 'center' ? 'auto' : undefined }}>
      <BodyEyebrow label={ctx.label} onDark={onDark} />
      {ctx.title ? (
        <h2
          className="site-about-v2__title"
          style={{
            margin: '12px 0 0',
            font: '500 var(--site-scale-2xl)/1.15 var(--site-font-display)',
            letterSpacing: '-0.01em',
            color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)',
          }}
        >
          <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.about_title">
            {ctx.title}
          </SiteText>
        </h2>
      ) : null}
    </div>
  );
}

/** Il racconto (slot about_body): un paragrafo di lettura, opzionalmente su fondo scuro/corsivo. */
function Story({
  ctx,
  onDark = false,
  italic = false,
  style,
}: {
  ctx: AboutContext;
  onDark?: boolean;
  italic?: boolean;
  style?: CSSProperties;
}): ReactElement | null {
  if (!ctx.body) return null;
  return (
    <p
      className="site-about-v2__body"
      style={{
        margin: 0,
        maxWidth: '58ch',
        font: italic
          ? 'italic 400 var(--site-scale-lg)/1.7 var(--site-font-display)'
          : '400 var(--site-scale-lg)/1.6 var(--site-font-body)',
        color: onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-body)',
        ...style,
      }}
    >
      <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.about_body">
        {ctx.body}
      </SiteText>
    </p>
  );
}

/** I punti (about_points) come indice numerato a filo (la lista editoriale del DNA). */
function PointsList({ ctx, onDark = false, style }: { ctx: AboutContext; onDark?: boolean; style?: CSSProperties }): ReactElement | null {
  if (ctx.points.length === 0) return null;
  return (
    <div className="site-about-v2__points" style={{ display: 'grid', gap: 16, ...style }}>
      {ctx.points.map((point, i) => (
        <div
          key={i}
          className="site-about-v2__point"
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'baseline',
            borderTop: `1px solid ${onDark ? 'var(--site-color-on-dark-line)' : 'var(--site-color-line)'}`,
            paddingTop: 14,
          }}
        >
          <span style={{ font: 'italic 500 20px/1 var(--site-font-display)', color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-eyebrow-color)', minWidth: 28 }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <span style={{ font: '600 var(--site-scale-base)/1.4 var(--site-font-body)', color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)' }}>
            <SiteText editable={ctx.editable} block={ctx.blockId} slot={`content.about_points.${i}`}>
              {point}
            </SiteText>
          </span>
        </div>
      ))}
    </div>
  );
}

/** I punti come griglia di card raccolte (per gli impaginati che vogliono i punti in evidenza). */
function PointsCards({ ctx, style }: { ctx: AboutContext; style?: CSSProperties }): ReactElement | null {
  if (ctx.points.length === 0) return null;
  return (
    <div
      className="site-about-v2__points"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
        gap: 18,
        ...style,
      }}
    >
      {ctx.points.map((point, i) => (
        <div
          key={i}
          className="site-about-v2__point"
          style={{
            background: 'var(--site-color-surface-card)',
            border: '1px solid var(--site-color-line)',
            borderRadius: 'var(--site-radius-md)',
            padding: '22px 24px',
            boxShadow: BODY_CARD_SHADOW,
          }}
        >
          <span style={{ font: 'italic 500 22px/1 var(--site-font-display)', color: 'var(--site-color-eyebrow-color)' }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <div style={{ marginTop: 10, font: '600 var(--site-scale-base)/1.4 var(--site-font-body)', color: 'var(--site-color-text-heading)' }}>
            <SiteText editable={ctx.editable} block={ctx.blockId} slot={`content.about_points.${i}`}>
              {point}
            </SiteText>
          </div>
        </div>
      ))}
    </div>
  );
}

// La griglia a due colonne che si impila su viewport stretti (il pattern ricorrente delle varianti).
const TWO_COL: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
  gap: 'clamp(32px, 5vw, 72px)',
  alignItems: 'center',
};

// ── le 12 varianti ───────────────────────────────────────────────────────────────────────────────

const VARIANTS: Readonly<Record<StoryVariantName, (ctx: AboutContext) => ReactElement>> = {
  // 01 — foto grande + dettaglio sovrapposto, racconto e indice numerato a destra.
  overlap: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ ...TWO_COL }}>
        <div style={{ position: 'relative', paddingBottom: 48, paddingRight: 40 }}>
          <BodyPhoto images={ctx.images} index={0} label={ctx.label} ratio="4 / 4.7" />
          <BodyPhoto
            images={ctx.images}
            index={1}
            label={ctx.label}
            dark
            style={{ position: 'absolute', right: 0, bottom: 0, width: '46%', height: 180, border: '6px solid var(--site-color-surface-page)' }}
          />
        </div>
        <div>
          <Head ctx={ctx} />
          <Story ctx={ctx} style={{ margin: '18px 0 0' }} />
          <PointsList ctx={ctx} style={{ marginTop: 28 }} />
        </div>
      </BodyContainer>
    </div>
  ),

  // 02 — la storia come linea del tempo verticale, foto affiancata.
  timeline: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ ...TWO_COL, alignItems: 'start' }}>
        <div>
          <Head ctx={ctx} />
          <Story ctx={ctx} style={{ margin: '16px 0 0' }} />
          {ctx.points.length > 0 ? (
            <div style={{ marginTop: 30, borderLeft: '1px solid var(--site-color-line-strong)', marginLeft: 6, display: 'grid', gap: 24 }}>
              {ctx.points.map((point, i) => (
                <div key={i} style={{ position: 'relative', paddingLeft: 28 }}>
                  <span style={{ position: 'absolute', left: -7, top: 6, width: 13, height: 13, borderRadius: '50%', background: 'var(--site-color-eyebrow-color)', border: '3px solid var(--site-color-surface-alt)' }} />
                  <span style={{ font: '600 var(--site-scale-lg)/1.3 var(--site-font-display)', color: 'var(--site-color-text-heading)' }}>
                    <SiteText editable={ctx.editable} block={ctx.blockId} slot={`content.about_points.${i}`}>
                      {point}
                    </SiteText>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <BodyPhoto images={ctx.images} index={0} label={ctx.label} ratio="4 / 5" />
      </BodyContainer>
    </div>
  ),

  // 03 — racconto + foto in alto, i punti in griglia di card a tutta larghezza sotto.
  'punti-sotto': (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <div style={{ ...TWO_COL }}>
          <div>
            <Head ctx={ctx} />
            <Story ctx={ctx} style={{ margin: '18px 0 0' }} />
          </div>
          <BodyPhoto images={ctx.images} index={0} label={ctx.label} ratio="16 / 10" />
        </div>
        <PointsCards ctx={ctx} style={{ marginTop: 'clamp(28px, 4vw, 48px)' }} />
      </BodyContainer>
    </div>
  ),

  // 04 — banda scura col racconto centrato, card chiare che debordano sul fondo pagina.
  'banda-scura': (ctx) => (
    <div>
      <div style={{ background: 'var(--site-color-surface-dark)', paddingTop: BODY_SECTION_PAD_Y, paddingBottom: 88 }}>
        <BodyContainer style={{ textAlign: 'center' }}>
          <Head ctx={ctx} align="center" onDark />
          <Story ctx={ctx} onDark style={{ margin: '18px auto 0', textAlign: 'left', maxWidth: '54ch' }} />
        </BodyContainer>
      </div>
      <div style={{ background: 'var(--site-color-surface-page)', paddingBottom: BODY_SECTION_PAD_Y }}>
        <BodyContainer>
          <PointsCards ctx={ctx} style={{ transform: 'translateY(-56px)', marginBottom: -30 }} />
        </BodyContainer>
      </div>
    </div>
  ),

  // 05 — il racconto come lettera su carta con firma; foto e punti a fianco.
  lettera: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ ...TWO_COL }}>
        <div style={{ background: 'var(--site-color-surface-card)', borderRadius: 'var(--site-radius-sm)', boxShadow: BODY_CARD_SHADOW, padding: 'clamp(30px, 4vw, 54px)' }}>
          <Head ctx={ctx} />
          <Story ctx={ctx} italic style={{ margin: '20px 0 0' }} />
          <div style={{ marginTop: 24, font: 'italic 600 26px var(--site-font-display)', color: 'var(--site-color-text-heading)' }}>— la famiglia</div>
        </div>
        <div>
          <BodyPhoto images={ctx.images} index={0} label={ctx.label} ratio="4 / 3" />
          <PointsList ctx={ctx} style={{ marginTop: 24 }} />
        </div>
      </BodyContainer>
    </div>
  ),

  // 06 — mosaico fotografico 2x2 accanto al racconto e all'indice.
  mosaico: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ ...TWO_COL }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '176px 176px', gap: 14 }}>
          <BodyPhoto images={ctx.images} index={0} label={ctx.label} style={{ gridColumn: 'span 2', height: '100%' }} />
          <BodyPhoto images={ctx.images} index={1} label={ctx.label} dark style={{ height: '100%' }} />
          <BodyPhoto images={ctx.images} index={2} label={ctx.label} style={{ height: '100%' }} />
        </div>
        <div>
          <Head ctx={ctx} />
          <Story ctx={ctx} style={{ margin: '18px 0 0' }} />
          <PointsList ctx={ctx} style={{ marginTop: 26 }} />
        </div>
      </BodyContainer>
    </div>
  ),

  // 07 — i punti come colonne numerate sotto un racconto ampio (numeri in evidenza).
  numeri: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', borderBlock: '1px solid var(--site-color-line)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <div style={{ display: 'flex', gap: 'clamp(24px, 4vw, 56px)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ font: '500 clamp(56px, 8vw, 104px)/0.9 var(--site-font-display)', color: 'var(--site-color-accent)', letterSpacing: '-0.03em' }}>
            {String(Math.max(ctx.points.length, 1)).padStart(2, '0')}
          </div>
          <div style={{ flex: 1, minWidth: 300 }}>
            <Head ctx={ctx} />
            <Story ctx={ctx} style={{ margin: '16px 0 0' }} />
          </div>
        </div>
        {ctx.points.length > 0 ? (
          <div style={{ marginTop: 'clamp(28px, 4vw, 44px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0 44px', borderTop: '1px solid var(--site-color-line-strong)' }}>
            {ctx.points.map((point, i) => (
              <div key={i} style={{ paddingTop: 20, font: '600 var(--site-scale-base)/1.4 var(--site-font-body)', color: 'var(--site-color-text-heading)' }}>
                <span style={{ color: 'var(--site-color-eyebrow-color)', fontStyle: 'italic', fontFamily: 'var(--site-font-display)', marginRight: 10 }}>{String(i + 1).padStart(2, '0')}</span>
                <SiteText editable={ctx.editable} block={ctx.blockId} slot={`content.about_points.${i}`}>
                  {point}
                </SiteText>
              </div>
            ))}
          </div>
        ) : null}
      </BodyContainer>
    </div>
  ),

  // 08 — il racconto come grande citazione centrata (<blockquote>, virgolette dal DNA), tre foto sotto.
  citazione: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ textAlign: 'center' }}>
        <Head ctx={ctx} align="center" />
        {ctx.body ? (
          <blockquote style={{ margin: 'clamp(24px, 3vw, 40px) auto 0', maxWidth: '26ch', font: 'italic 500 clamp(24px, 3.2vw, 38px)/1.35 var(--site-font-display)', color: 'var(--site-color-text-heading)' }}>
            <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.about_body">
              {ctx.body}
            </SiteText>
          </blockquote>
        ) : null}
        <div style={{ margin: '18px auto 0', width: 60, borderTop: '3px solid var(--site-color-eyebrow-color)' }} />
        <div style={{ marginTop: 'clamp(30px, 4vw, 48px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16, alignItems: 'end' }}>
          <BodyPhoto images={ctx.images} index={1} label={ctx.label} style={{ height: 200 }} />
          <BodyPhoto images={ctx.images} index={0} label={ctx.label} style={{ height: 260 }} />
          <BodyPhoto images={ctx.images} index={2} label={ctx.label} dark style={{ height: 200 }} />
        </div>
        <PointsList ctx={ctx} style={{ marginTop: 32, textAlign: 'left' }} />
      </BodyContainer>
    </div>
  ),

  // 09 — foto full-bleed con velo scuro e pannello racconto a destra.
  'foto-piena': (ctx) => (
    <div style={{ position: 'relative', background: 'var(--site-color-surface-dark)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <BodyPhoto images={ctx.images} index={0} label={ctx.label} dark background radius="0" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, color-mix(in srgb, var(--site-color-surface-dark) 24%, transparent), color-mix(in srgb, var(--site-color-surface-dark) 88%, transparent) 62%)' }} />
      </div>
      <div style={{ position: 'relative', paddingBlock: BODY_SECTION_PAD_Y }}>
        <BodyContainer style={{ display: 'grid', justifyItems: 'end' }}>
          <div style={{ maxWidth: 520 }}>
            <Head ctx={ctx} onDark />
            <Story ctx={ctx} onDark style={{ margin: '18px 0 0' }} />
            <PointsList ctx={ctx} onDark style={{ marginTop: 26 }} />
          </div>
        </BodyContainer>
      </div>
    </div>
  ),

  // 10 — impaginato a colonne da rivista: testata centrata a doppio filo, poi racconto/foto/punti.
  colonne: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-card)', borderBlock: '1px solid var(--site-color-line)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ maxWidth: '62rem' }}>
        <div style={{ textAlign: 'center', borderBottom: '3px double var(--site-color-line-strong)', paddingBottom: 20 }}>
          <Head ctx={ctx} align="center" />
        </div>
        <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '26px 40px', alignItems: 'start' }}>
          <Story ctx={ctx} italic />
          <BodyPhoto images={ctx.images} index={0} label={ctx.label} ratio="4 / 3" radius="var(--site-radius-sm)" />
          <PointsList ctx={ctx} />
        </div>
      </BodyContainer>
    </div>
  ),

  // 11 — tre ritratti (le generazioni): testata centrata, poi foto ad arco coi punti come didascalie.
  ritratti: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ textAlign: 'center' }}>
        <Head ctx={ctx} align="center" />
        <Story ctx={ctx} style={{ margin: '16px auto 0', textAlign: 'center' }} />
        <div style={{ marginTop: 'clamp(28px, 4vw, 48px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 24 }}>
          {(ctx.points.length > 0 ? ctx.points : ['', '', '']).map((point, i) => (
            <div key={i}>
              <BodyPhoto images={ctx.images} index={i} label={ctx.label} dark={i === 2} style={{ height: 280, borderRadius: '999px 999px var(--site-radius-sm) var(--site-radius-sm)' }} />
              {point ? (
                <div style={{ marginTop: 14, font: '600 var(--site-scale-base)/1.4 var(--site-font-body)', color: 'var(--site-color-text-heading)' }}>
                  <SiteText editable={ctx.editable} block={ctx.blockId} slot={`content.about_points.${i}`}>
                    {point}
                  </SiteText>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </BodyContainer>
    </div>
  ),

  // 12 — manifesto: titolo gigante e punti come proclami a filo.
  manifesto: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <BodyEyebrow label={ctx.label} />
          <span style={{ flex: 1, borderTop: '1px solid var(--site-color-line-strong)' }} />
        </div>
        {ctx.title ? (
          <h2 style={{ margin: 'clamp(16px, 3vw, 30px) 0 0', font: '500 clamp(36px, 6vw, 76px)/1.05 var(--site-font-display)', letterSpacing: '-0.015em', color: 'var(--site-color-text-heading)', maxWidth: '18ch' }}>
            <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.about_title">
              {ctx.title}
            </SiteText>
          </h2>
        ) : null}
        <Story ctx={ctx} style={{ margin: '20px 0 0' }} />
        {ctx.points.length > 0 ? (
          <div style={{ marginTop: 'clamp(26px, 3vw, 40px)', display: 'grid' }}>
            {ctx.points.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 'clamp(16px, 3vw, 44px)', alignItems: 'baseline', padding: '18px 0', borderTop: '1px solid var(--site-color-line-strong)', flexWrap: 'wrap' }}>
                <span style={{ font: 'italic 500 clamp(26px, 3vw, 40px)/1 var(--site-font-display)', color: 'var(--site-color-accent)' }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ flex: '1 1 260px', font: '600 clamp(18px, 2.2vw, 26px)/1.25 var(--site-font-display)', color: 'var(--site-color-text-heading)' }}>
                  <SiteText editable={ctx.editable} block={ctx.blockId} slot={`content.about_points.${i}`}>
                    {point}
                  </SiteText>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </BodyContainer>
    </div>
  ),
};

/** Risolve il nome-variante dal `section_layout_id` per-blocco: catalogo del dominio, proto-safe, fallback. */
function variantFor(sectionLayoutId: string | undefined): StoryVariantName {
  if (sectionLayoutId === undefined) return FALLBACK_VARIANT;
  const variant = bodyLayoutFor(sectionLayoutId)?.variant;
  return variant !== undefined && Object.hasOwn(VARIANTS, variant)
    ? (variant as StoryVariantName)
    : FALLBACK_VARIANT;
}

export async function ChiSiamo({ block, locale, editable }: SiteBlockProps): Promise<ReactElement> {
  const label = await siteBlockLabel(block, locale);
  const sectionLayoutId = block.section_layout_id ?? FALLBACK_SECTION_LAYOUT_ID;
  const variantName = variantFor(block.section_layout_id);
  const ctx: AboutContext = {
    blockId: block.id,
    editable,
    label,
    title: block.content.about_title,
    body: block.content.about_body,
    points: block.content.about_points ?? [],
    images: block.images,
  };

  return (
    <section
      aria-label={label}
      data-block-id={block.id}
      data-block-kind={block.id}
      data-section-layout={sectionLayoutId}
      className="site-about-v2"
    >
      {VARIANTS[variantName](ctx)}
    </section>
  );
}

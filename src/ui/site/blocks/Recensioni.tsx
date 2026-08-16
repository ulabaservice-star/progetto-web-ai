// DV2-402 (macrotask body-sections-a, design-engine-v2) — BLOCCO RECENSIONI v2: renderer unico di 10
// impaginati tradotti da Claude Design (components/recensioni/Recensioni.jsx).
//
// IL NODO, dichiarato invece che aggirato (T-210, DS-V2-D11): il brief v1 NON porta testimonianze
// (nessun quote/autore/voto), e la precondizione del blocco resta `() => false` — `blocksFor`/`generatable`
// (il gate di costo) non cambiano. Ma per FAR SPARIRE I VUOTI (DV2-402/AC-402-2) la composizione di
// presentazione (DV2-403 body-a) emette il blocco, e il renderer ne mostra uno SCHELETRO placeholder:
// barre decorative (la FORMA delle recensioni future) + una copy UI FISSA di catalogo i18n
// (`site.reviews.placeholder`), MAI una testimonianza fabbricata, MAI uno slot LLM riempito con dati
// finti (regola anti-invenzione intatta). `reviews_title`/`reviews_intro` (slot esistenti) sono resi via
// SiteText se presenti; il resto e' scheletro. Solo var(--site-color-*); escaping React; niente
// iniezione di HTML grezzo (AC-231-4); nessun autore/fonte inventati.

import type { CSSProperties, ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { SiteText } from '@/ui/site/SiteText';
import { siteBlockLabel } from '@/ui/site/labels';
import { bodyLayoutFor } from '@/domain/generation/section-layouts';
import { BODY_SECTION_PAD_Y, BodyContainer, BodyEyebrow } from '@/ui/site/blocks/body-kit';
import type { SiteBlockProps } from '@/ui/site/types';

/** I nomi delle 10 varianti di recensioni (l'asse VISIBILE del catalogo BODY_LAYOUTS). */
type ReviewsVariantName =
  | 'cards'
  | 'centrale'
  | 'scure'
  | 'colonna'
  | 'stelle'
  | 'gigante'
  | 'numerate'
  | 'cornici'
  | 'scontrini'
  | 'banda-accent';

const FALLBACK_SECTION_LAYOUT_ID = 'recensioni-cards@1';
const FALLBACK_VARIANT: ReviewsVariantName = 'cards';

/** Il contesto risolto: gli slot (se presenti) e la copy di catalogo dello scheletro. */
type ReviewCtx = {
  readonly blockId: string;
  readonly editable?: boolean;
  readonly label: string;
  /** reviews_title dal pool (prosa del modello, editabile) — o undefined. */
  readonly title?: string;
  /** reviews_intro dal pool (editabile) — o undefined. */
  readonly intro?: string;
  /** Il titolo di catalogo di ripiego (i18n) quando lo slot title e' assente. */
  readonly fallbackTitle: string;
  /** La copy UI FISSA dello scheletro (i18n, mai una testimonianza). */
  readonly placeholder: string;
};

// ── helper condivisi ───────────────────────────────────────────────────────────────────────────

/** Occhiello + titolo: reviews_title via SiteText se presente, altrimenti il titolo di catalogo i18n. */
function Head({ ctx, align = 'left', onDark = false }: { ctx: ReviewCtx; align?: 'left' | 'center'; onDark?: boolean }): ReactElement {
  return (
    <div style={{ textAlign: align, maxWidth: align === 'center' ? 680 : undefined, marginInline: align === 'center' ? 'auto' : undefined }}>
      <BodyEyebrow label={ctx.label} onDark={onDark} />
      <h2
        className="site-reviews-v2__title"
        style={{ margin: '12px 0 0', font: '500 var(--site-scale-2xl)/1.15 var(--site-font-display)', letterSpacing: '-0.01em', color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)' }}
      >
        {ctx.title ? (
          <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.reviews_title">
            {ctx.title}
          </SiteText>
        ) : (
          ctx.fallbackTitle
        )}
      </h2>
      {ctx.intro ? (
        <p className="site-reviews-v2__intro" style={{ margin: '14px 0 0', fontSize: 'var(--site-scale-lg)', color: onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-body)' }}>
          <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.reviews_intro">
            {ctx.intro}
          </SiteText>
        </p>
      ) : null}
    </div>
  );
}

/** La copy UI FISSA dello scheletro (i18n): l'unico TESTO delle recensioni finche' non ne arrivano di vere. */
function Placeholder({ ctx, onDark = false, align = 'center', style }: { ctx: ReviewCtx; onDark?: boolean; align?: 'left' | 'center'; style?: CSSProperties }): ReactElement {
  return (
    <p
      className="site-reviews-v2__placeholder"
      style={{
        margin: 0,
        textAlign: align,
        maxWidth: '46ch',
        marginInline: align === 'center' ? 'auto' : undefined,
        font: 'italic 400 var(--site-scale-lg)/1.55 var(--site-font-display)',
        color: onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-muted)',
        ...style,
      }}
    >
      {ctx.placeholder}
    </p>
  );
}

/** Il virgolettone decorativo (aria-hidden): un glifo tipografico, mai contenuto. */
function QuoteMark({ onDark = false, size = 54 }: { onDark?: boolean; size?: number }): ReactElement {
  return (
    <span aria-hidden="true" style={{ font: `700 ${size}px/0.6 var(--site-font-display)`, color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-eyebrow-color)' }}>
      {'“'}
    </span>
  );
}

/** Le barre di uno scheletro (aria-hidden): la FORMA di una testimonianza futura, mai testo. */
function Bars({ onDark = false, widths = ['100%', '92%', '68%'] }: { onDark?: boolean; widths?: readonly string[] }): ReactElement {
  const bar = onDark
    ? 'color-mix(in srgb, var(--site-color-on-dark-line) 70%, transparent)'
    : 'color-mix(in srgb, var(--site-color-line-strong) 55%, transparent)';
  return (
    <div aria-hidden="true" style={{ display: 'grid', gap: 9 }}>
      {widths.map((w, i) => (
        <span key={i} style={{ height: 9, width: w, borderRadius: 'var(--site-radius-pill)', background: bar }} />
      ))}
    </div>
  );
}

/** Una card scheletro: virgolettone + barre + una barra "autore" corta. Nessun testo finto. */
function SkeletonCard({ onDark = false, style, widths }: { onDark?: boolean; style?: CSSProperties; widths?: readonly string[] }): ReactElement {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 14, alignContent: 'start', ...style }}>
      <QuoteMark onDark={onDark} size={44} />
      <Bars onDark={onDark} widths={widths} />
      <span aria-hidden="true" style={{ height: 9, width: '38%', borderRadius: 'var(--site-radius-pill)', background: onDark ? 'var(--site-color-on-dark-line)' : 'var(--site-color-line)', marginTop: 2 }} />
    </figure>
  );
}

const GRID_3: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
  gap: 22,
};
const CARD: CSSProperties = {
  background: 'var(--site-color-surface-card)',
  border: '1px solid var(--site-color-line)',
  borderRadius: 'var(--site-radius-md)',
  padding: '28px 26px',
};
const HEAD_GAP = 'clamp(28px, 4vw, 48px)';

// ── le 10 varianti ──────────────────────────────────────────────────────────────────────────────

const VARIANTS: Readonly<Record<ReviewsVariantName, (ctx: ReviewCtx) => ReactElement>> = {
  // 01 — griglia di card con virgolettone.
  cards: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', borderBlock: '1px solid var(--site-color-line)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" />
        <div style={{ ...GRID_3, marginTop: HEAD_GAP }}>
          <SkeletonCard style={CARD} />
          <SkeletonCard style={CARD} />
          <SkeletonCard style={CARD} />
        </div>
        <Placeholder ctx={ctx} style={{ marginTop: 32 }} />
      </BodyContainer>
    </div>
  ),

  // 02 — una grande al centro, due ai lati.
  centrale: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: HEAD_GAP, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr) minmax(min(100%, 320px), 1.6fr) minmax(min(100%, 220px), 1fr))', gap: HEAD_GAP, alignItems: 'center' }}>
          <SkeletonCard widths={['100%', '80%']} />
          <div style={{ textAlign: 'center', borderInline: '1px solid var(--site-color-line)', padding: '10px clamp(16px, 2vw, 36px)' }}>
            <QuoteMark size={68} />
            <Bars widths={['100%', '96%', '90%', '60%']} />
            <Placeholder ctx={ctx} style={{ marginTop: 18 }} />
          </div>
          <SkeletonCard widths={['100%', '80%']} />
        </div>
      </BodyContainer>
    </div>
  ),

  // 03 — su fondo scuro, a filo.
  scure: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" onDark />
        <div style={{ ...GRID_3, marginTop: HEAD_GAP }}>
          <SkeletonCard onDark style={{ borderTop: '1px solid var(--site-color-on-dark-line)', paddingTop: 22 }} />
          <SkeletonCard onDark style={{ borderTop: '1px solid var(--site-color-on-dark-line)', paddingTop: 22 }} />
          <SkeletonCard onDark style={{ borderTop: '1px solid var(--site-color-on-dark-line)', paddingTop: 22 }} />
        </div>
        <Placeholder ctx={ctx} onDark style={{ marginTop: 32 }} />
      </BodyContainer>
    </div>
  ),

  // 04 — colonna singola a grandi fili.
  colonna: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ maxWidth: '48rem' }}>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: HEAD_GAP, display: 'grid' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ padding: '28px 0', borderTop: i === 0 ? '3px double var(--site-color-line-strong)' : '1px solid var(--site-color-line)' }}>
              <SkeletonCard widths={['100%', '94%', '72%']} />
            </div>
          ))}
        </div>
        <Placeholder ctx={ctx} style={{ marginTop: 24 }} />
      </BodyContainer>
    </div>
  ),

  // 05 — riquadri incorniciati (stelle vuote = valutazioni future, non un voto vantato).
  stelle: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <div style={{ textAlign: 'center' }}>
          <Head ctx={ctx} align="center" />
          <div aria-hidden="true" style={{ marginTop: 14, font: '500 28px/1 var(--site-font-display)', color: 'var(--site-color-line-strong)', letterSpacing: '0.12em' }}>
            {'☆☆☆☆☆'}
          </div>
        </div>
        <div style={{ marginTop: HEAD_GAP, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', border: '1px solid var(--site-color-line)', borderRadius: 'var(--site-radius-md)', overflow: 'hidden' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ background: i % 2 ? 'var(--site-color-surface-alt)' : 'var(--site-color-surface-card)', padding: '30px 28px', borderLeft: i === 0 ? 'none' : '1px solid var(--site-color-line)' }}>
              <SkeletonCard widths={['100%', '84%']} />
            </div>
          ))}
        </div>
        <Placeholder ctx={ctx} style={{ marginTop: 30 }} />
      </BodyContainer>
    </div>
  ),

  // 06 — una citazione gigante (scheletro) + la copy come nota.
  gigante: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ textAlign: 'center' }}>
        <Head ctx={ctx} align="center" />
        <div style={{ margin: 'clamp(24px, 3vw, 40px) auto 0', maxWidth: '32ch', display: 'grid', gap: 16, justifyItems: 'center' }}>
          <QuoteMark size={72} />
          <Bars widths={['100%', '100%', '80%']} />
        </div>
        <Placeholder ctx={ctx} style={{ marginTop: 'clamp(28px, 4vw, 44px)' }} />
      </BodyContainer>
    </div>
  ),

  // 07 — numerate editoriali a filo.
  numerate: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ maxWidth: '56rem' }}>
        <Head ctx={ctx} />
        <div style={{ marginTop: HEAD_GAP, display: 'grid' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 'clamp(18px, 3vw, 40px)', alignItems: 'baseline', padding: '24px 0', borderTop: '1px solid var(--site-color-line-strong)', flexWrap: 'wrap' }}>
              <span aria-hidden="true" style={{ font: 'italic 500 clamp(30px, 4vw, 46px)/1 var(--site-font-display)', color: 'var(--site-color-eyebrow-color)' }}>{String(i + 1).padStart(2, '0')}</span>
              <div style={{ flex: '1 1 320px' }}>
                <Bars widths={['100%', '90%']} />
              </div>
            </div>
          ))}
        </div>
        <Placeholder ctx={ctx} align="left" style={{ marginTop: 24 }} />
      </BodyContainer>
    </div>
  ),

  // 08 — riquadri a doppio bordo.
  cornici: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" />
        <div style={{ ...GRID_3, marginTop: HEAD_GAP }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ border: '1px solid var(--site-color-line-strong)', borderRadius: 'var(--site-radius-sm)', padding: 7, background: 'var(--site-color-surface-page)' }}>
              <div style={{ border: '1px solid var(--site-color-line)', borderRadius: 'var(--site-radius-sm)', padding: '26px 24px', height: '100%', boxSizing: 'border-box' }}>
                <SkeletonCard style={{ justifyItems: 'center', textAlign: 'center' }} widths={['100%', '80%']} />
              </div>
            </div>
          ))}
        </div>
        <Placeholder ctx={ctx} style={{ marginTop: 30 }} />
      </BodyContainer>
    </div>
  ),

  // 09 — scontrini leggermente ruotati su fondo scuro.
  scontrini: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" onDark />
        <div style={{ marginTop: HEAD_GAP, display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', alignItems: 'flex-start' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 300, background: 'var(--site-color-surface-card)', padding: '22px 22px 26px', transform: `rotate(${((i % 3) - 1) * 1.5}deg)` }}>
              <div aria-hidden="true" style={{ borderBottom: '2px dashed var(--site-color-line-strong)', paddingBottom: 12, marginBottom: 14 }} />
              <Bars widths={['100%', '92%', '70%']} />
              <div aria-hidden="true" style={{ borderTop: '2px dashed var(--site-color-line-strong)', paddingTop: 12, marginTop: 14, height: 9, width: '46%', marginInline: 'auto', borderRadius: 'var(--site-radius-pill)', background: 'var(--site-color-line)' }} />
            </div>
          ))}
        </div>
        <Placeholder ctx={ctx} onDark style={{ marginTop: 30 }} />
      </BodyContainer>
    </div>
  ),

  // 10 — banda color accento.
  'banda-accent': (ctx) => (
    <div style={{ background: 'var(--site-color-accent)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <div style={{ textAlign: 'center' }}>
          <div style={{ font: '600 var(--site-scale-sm)/1.2 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: 'var(--site-color-accent-contrast)', opacity: 0.85 }}>
            {ctx.label}
          </div>
          <h2 className="site-reviews-v2__title" style={{ margin: '12px 0 0', font: '500 var(--site-scale-2xl)/1.15 var(--site-font-display)', color: 'var(--site-color-accent-contrast)' }}>
            {ctx.title ? (
              <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.reviews_title">
                {ctx.title}
              </SiteText>
            ) : (
              ctx.fallbackTitle
            )}
          </h2>
        </div>
        <div style={{ ...GRID_3, marginTop: HEAD_GAP }}>
          <SkeletonCard style={{ ...CARD, border: 'none', boxShadow: 'none' }} />
          <SkeletonCard style={{ ...CARD, border: 'none', boxShadow: 'none' }} />
          <SkeletonCard style={{ ...CARD, border: 'none', boxShadow: 'none' }} />
        </div>
        <p className="site-reviews-v2__placeholder" style={{ margin: '30px auto 0', textAlign: 'center', maxWidth: '46ch', font: 'italic 400 var(--site-scale-lg)/1.55 var(--site-font-display)', color: 'var(--site-color-accent-contrast)', opacity: 0.9 }}>
          {ctx.placeholder}
        </p>
      </BodyContainer>
    </div>
  ),
};

/** Risolve il nome-variante dal section_layout_id per-blocco: catalogo del dominio, proto-safe, fallback. */
function variantFor(sectionLayoutId: string | undefined): ReviewsVariantName {
  if (sectionLayoutId === undefined) return FALLBACK_VARIANT;
  const variant = bodyLayoutFor(sectionLayoutId)?.variant;
  return variant !== undefined && Object.hasOwn(VARIANTS, variant)
    ? (variant as ReviewsVariantName)
    : FALLBACK_VARIANT;
}

export async function Recensioni({ block, locale, editable }: SiteBlockProps): Promise<ReactElement> {
  const label = await siteBlockLabel(block, locale);
  const t = await getTranslations({ locale, namespace: 'site' });
  const sectionLayoutId = block.section_layout_id ?? FALLBACK_SECTION_LAYOUT_ID;
  const variantName = variantFor(block.section_layout_id);
  const ctx: ReviewCtx = {
    blockId: block.id,
    editable,
    label,
    title: block.content.reviews_title,
    intro: block.content.reviews_intro,
    fallbackTitle: t('reviews.title'),
    placeholder: t('reviews.placeholder'),
  };

  return (
    <section
      aria-label={label}
      data-block-id={block.id}
      data-block-kind={block.id}
      data-section-layout={sectionLayoutId}
      className="site-reviews-v2"
    >
      {VARIANTS[variantName](ctx)}
    </section>
  );
}

// DV2-402 (macrotask body-sections-a, design-engine-v2) — BLOCCO FAQ v2: renderer unico di 10 impaginati
// tradotti da Claude Design (components/faq/Faq.jsx).
//
// DUAL-MODE: a differenza delle recensioni, la FAQ PUO' avere dati veri — quando `materieFaq >= 3`
// (T-210) il modello scrive `faq_items` (domande/risposte), prosa che passa da SiteText ed e' ESCAPED.
// Quando invece la sezione e' emessa senza dati (composizione di presentazione, DV2-403 body-a), il
// renderer mostra uno SCHELETRO placeholder (barre decorative + copy UI FISSA i18n `site.faq.placeholder`),
// mai domande/risposte inventate. `faq_title` (slot) e' reso via SiteText se presente, altrimenti il
// titolo di catalogo i18n. Niente <details> (l'editabilita' P3 vuole il testo in isole SiteText, non in
// summary): i Q&A sono blocchi statici. Solo var(--site-color-*); escaping React; niente
// iniezione di HTML grezzo (AC-231-4).

import type { CSSProperties, ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { SiteText } from '@/ui/site/SiteText';
import { siteBlockLabel } from '@/ui/site/labels';
import { bodyLayoutFor } from '@/domain/generation/section-layouts';
import { BODY_CARD_SHADOW, BODY_SECTION_PAD_Y, BodyContainer, BodyEyebrow } from '@/ui/site/blocks/body-kit';
import type { SiteBlockProps } from '@/ui/site/types';

/** I nomi delle 10 varianti di faq (l'asse VISIBILE del catalogo BODY_LAYOUTS). */
type FaqVariantName =
  | 'accordion'
  | 'griglia'
  | 'due-colonne'
  | 'numerata'
  | 'centrale'
  | 'scura'
  | 'tavola'
  | 'schede'
  | 'minimal'
  | 'carta';

const FALLBACK_SECTION_LAYOUT_ID = 'faq-accordion@1';
const FALLBACK_VARIANT: FaqVariantName = 'accordion';

type FaqItem = { readonly question: string; readonly answer: string };

type FaqCtx = {
  readonly blockId: string;
  readonly editable?: boolean;
  readonly label: string;
  readonly title?: string;
  readonly items: readonly FaqItem[];
  readonly fallbackTitle: string;
  readonly placeholder: string;
};

type RowOpts = {
  readonly onDark?: boolean;
  readonly qSize?: number;
  readonly numbered?: boolean;
  readonly style?: CSSProperties;
  readonly mark?: boolean;
};

// ── helper condivisi ───────────────────────────────────────────────────────────────────────────

/** Occhiello + titolo: faq_title via SiteText se presente, altrimenti il titolo di catalogo i18n. */
function Head({ ctx, align = 'left', onDark = false }: { ctx: FaqCtx; align?: 'left' | 'center'; onDark?: boolean }): ReactElement {
  return (
    <div style={{ textAlign: align, maxWidth: align === 'center' ? 680 : undefined, marginInline: align === 'center' ? 'auto' : undefined }}>
      <BodyEyebrow label={ctx.label} onDark={onDark} />
      <h2
        className="site-faq-v2__title"
        style={{ margin: '12px 0 0', font: '500 var(--site-scale-2xl)/1.15 var(--site-font-display)', letterSpacing: '-0.01em', color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)' }}
      >
        {ctx.title ? (
          <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.faq_title">
            {ctx.title}
          </SiteText>
        ) : (
          ctx.fallbackTitle
        )}
      </h2>
    </div>
  );
}

function NumberTag({ index, onDark = false, size = 15 }: { index: number; onDark?: boolean; size?: number }): ReactElement {
  return (
    <span aria-hidden="true" style={{ font: `italic 500 ${size}px/1 var(--site-font-display)`, color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-eyebrow-color)', minWidth: 26 }}>
      {String(index + 1).padStart(2, '0')}
    </span>
  );
}

/** Un Q&A reale (question + answer via SiteText, escaped). */
function Qa({ ctx, item, index, onDark = false, qSize = 19, numbered = false, mark = false, style }: RowOpts & { ctx: FaqCtx; item: FaqItem; index: number }): ReactElement {
  return (
    <div className="site-faq-v2__item" style={{ display: 'grid', gap: 8, ...style }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', justifyContent: mark ? 'space-between' : undefined, font: `600 ${qSize}px/1.3 var(--site-font-display)`, color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)' }}>
        <span style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          {numbered ? <NumberTag index={index} onDark={onDark} /> : null}
          <SiteText editable={ctx.editable} block={ctx.blockId} slot={`content.faq_items.${index}.question`}>
            {item.question}
          </SiteText>
        </span>
        {mark ? <span aria-hidden="true" style={{ font: '300 24px/1 var(--site-font-body)', color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-accent)' }}>+</span> : null}
      </div>
      <p style={{ margin: 0, fontSize: 'var(--site-scale-base)', lineHeight: 1.6, maxWidth: '60ch', color: onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-body)' }}>
        <SiteText editable={ctx.editable} block={ctx.blockId} slot={`content.faq_items.${index}.answer`}>
          {item.answer}
        </SiteText>
      </p>
    </div>
  );
}

/** Una riga scheletro (aria-hidden): la FORMA di un Q&A futuro, mai testo. */
function QaSkeleton({ index, onDark = false, numbered = false, mark = false, style }: RowOpts & { index: number }): ReactElement {
  const bar = onDark
    ? 'color-mix(in srgb, var(--site-color-on-dark-line) 70%, transparent)'
    : 'color-mix(in srgb, var(--site-color-line-strong) 55%, transparent)';
  return (
    <div className="site-faq-v2__item" aria-hidden="true" style={{ display: 'grid', gap: 10, ...style }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: mark ? 'space-between' : undefined }}>
        <span style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
          {numbered ? <NumberTag index={index} onDark={onDark} /> : null}
          <span style={{ height: 12, width: '52%', borderRadius: 'var(--site-radius-pill)', background: onDark ? 'var(--site-color-on-dark-line)' : 'var(--site-color-line-strong)' }} />
        </span>
        {mark ? <span style={{ font: '300 24px/1 var(--site-font-body)', color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-eyebrow-color)' }}>+</span> : null}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={{ height: 9, width: '100%', borderRadius: 'var(--site-radius-pill)', background: bar }} />
        <span style={{ height: 9, width: '78%', borderRadius: 'var(--site-radius-pill)', background: bar }} />
      </div>
    </div>
  );
}

/** Le righe della FAQ: i Q&A reali se ci sono, altrimenti 3 righe scheletro. */
function rows(ctx: FaqCtx, opts: RowOpts = {}): ReactElement[] {
  if (ctx.items.length > 0) {
    return ctx.items.map((item, i) => <Qa key={i} ctx={ctx} item={item} index={i} {...opts} />);
  }
  return [0, 1, 2].map((i) => <QaSkeleton key={i} index={i} {...opts} />);
}

/** La copy UI FISSA (i18n): compare SOLO quando non ci sono Q&A reali (lo scheletro). */
function EmptyNote({ ctx, onDark = false, align = 'left', style }: { ctx: FaqCtx; onDark?: boolean; align?: 'left' | 'center'; style?: CSSProperties }): ReactElement | null {
  if (ctx.items.length > 0) return null;
  return (
    <p
      className="site-faq-v2__placeholder"
      style={{ margin: 0, textAlign: align, maxWidth: '50ch', marginInline: align === 'center' ? 'auto' : undefined, font: 'italic 400 var(--site-scale-lg)/1.55 var(--site-font-display)', color: onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-muted)', ...style }}
    >
      {ctx.placeholder}
    </p>
  );
}

const HEAD_GAP = 'clamp(28px, 4vw, 48px)';
const CARD: CSSProperties = {
  background: 'var(--site-color-surface-card)',
  border: '1px solid var(--site-color-line)',
  borderRadius: 'var(--site-radius-md)',
  padding: '26px 28px',
  boxShadow: BODY_CARD_SHADOW,
};

// ── le 10 varianti ──────────────────────────────────────────────────────────────────────────────

const VARIANTS: Readonly<Record<FaqVariantName, (ctx: FaqCtx) => ReactElement>> = {
  // 01 — accordion a filo (statico), testata a sinistra e lista a destra.
  accordion: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'clamp(32px, 5vw, 72px)' }}>
        <Head ctx={ctx} />
        <div>
          <div style={{ display: 'grid', borderTop: '1px solid var(--site-color-line-strong)' }}>
            {rows(ctx, { mark: true, style: { borderBottom: '1px solid var(--site-color-line)', padding: '18px 2px' } })}
          </div>
          <EmptyNote ctx={ctx} style={{ marginTop: 22 }} />
        </div>
      </BodyContainer>
    </div>
  ),

  // 02 — griglia di card aperte.
  griglia: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', borderBlock: '1px solid var(--site-color-line)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: HEAD_GAP, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}>
          {rows(ctx, { qSize: 18, style: CARD })}
        </div>
        <EmptyNote ctx={ctx} align="center" style={{ marginTop: 28 }} />
      </BodyContainer>
    </div>
  ),

  // 03 — due colonne di testo (CSS columns).
  'due-colonne': (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: HEAD_GAP, columns: '2 340px', columnGap: 56 }}>
          {rows(ctx, { style: { breakInside: 'avoid', marginBottom: 26, borderTop: '1px solid var(--site-color-line-strong)', paddingTop: 16 } })}
        </div>
        <EmptyNote ctx={ctx} align="center" style={{ marginTop: 24 }} />
      </BodyContainer>
    </div>
  ),

  // 04 — numerata con cifre grandi.
  numerata: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ maxWidth: '56rem' }}>
        <Head ctx={ctx} />
        <div style={{ marginTop: HEAD_GAP, display: 'grid' }}>
          {rows(ctx, { numbered: true, qSize: 21, style: { padding: '22px 0', borderTop: '1px solid var(--site-color-line-strong)' } })}
        </div>
        <EmptyNote ctx={ctx} style={{ marginTop: 24 }} />
      </BodyContainer>
    </div>
  ),

  // 05 — colonna centrata stretta.
  centrale: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ maxWidth: '44rem' }}>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: HEAD_GAP, display: 'grid', borderTop: '1px solid var(--site-color-line-strong)' }}>
          {rows(ctx, { mark: true, style: { borderBottom: '1px solid var(--site-color-line)', padding: '18px 2px' } })}
        </div>
        <EmptyNote ctx={ctx} align="center" style={{ marginTop: 22 }} />
      </BodyContainer>
    </div>
  ),

  // 06 — pannello scuro, testata a sinistra e lista a destra.
  scura: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'clamp(32px, 5vw, 72px)' }}>
        <Head ctx={ctx} onDark />
        <div>
          <div style={{ display: 'grid', borderTop: '1px solid var(--site-color-on-dark-line)' }}>
            {rows(ctx, { onDark: true, mark: true, style: { borderBottom: '1px solid var(--site-color-on-dark-line)', padding: '18px 2px' } })}
          </div>
          <EmptyNote ctx={ctx} onDark style={{ marginTop: 22 }} />
        </div>
      </BodyContainer>
    </div>
  ),

  // 07 — tavola: domanda a sinistra, risposta a destra, righe a filo.
  tavola: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} />
        <div style={{ marginTop: HEAD_GAP, borderTop: '2px solid var(--site-color-text-heading)' }}>
          {(ctx.items.length > 0 ? ctx.items : [null, null, null]).map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr) minmax(min(100%, 320px), 1.6fr))', gap: '10px 44px', padding: '20px 4px', borderBottom: '1px solid var(--site-color-line)' }}>
              {item ? (
                <Qa ctx={ctx} item={item} index={i} qSize={20} />
              ) : (
                <QaSkeleton index={i} />
              )}
            </div>
          ))}
        </div>
        <EmptyNote ctx={ctx} style={{ marginTop: 22 }} />
      </BodyContainer>
    </div>
  ),

  // 08 — schede con badge numerato.
  schede: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: HEAD_GAP, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 18 }}>
          {(ctx.items.length > 0 ? ctx.items : [null, null, null]).map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 18, background: 'var(--site-color-surface-alt)', border: '1px solid var(--site-color-line)', borderRadius: 'var(--site-radius-md)', padding: '24px 24px' }}>
              <span aria-hidden="true" style={{ flex: 'none', width: 42, height: 42, borderRadius: '50%', background: 'var(--site-color-accent)', color: 'var(--site-color-accent-contrast)', display: 'grid', placeItems: 'center', font: 'italic 600 16px var(--site-font-display)' }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, alignSelf: 'center' }}>
                {item ? <Qa ctx={ctx} item={item} index={i} qSize={18} /> : <QaSkeleton index={i} />}
              </div>
            </div>
          ))}
        </div>
        <EmptyNote ctx={ctx} align="center" style={{ marginTop: 28 }} />
      </BodyContainer>
    </div>
  ),

  // 09 — minimale: domande enormi a filo.
  minimal: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <BodyEyebrow label={ctx.label} />
          <span style={{ flex: 1, borderTop: '1px solid var(--site-color-line-strong)' }} />
        </div>
        <div style={{ marginTop: HEAD_GAP, display: 'grid' }}>
          {rows(ctx, { qSize: 28, style: { padding: '24px 0', borderBottom: '1px solid var(--site-color-line)' } })}
        </div>
        <EmptyNote ctx={ctx} style={{ marginTop: 24 }} />
      </BodyContainer>
    </div>
  ),

  // 10 — carta su fondo scuro, filetto accent-2 in testa.
  carta: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <div style={{ maxWidth: '48rem', marginInline: 'auto', background: 'var(--site-color-surface-card)', borderRadius: 'var(--site-radius-sm)', boxShadow: BODY_CARD_SHADOW, borderTop: '6px solid var(--site-color-accent-2)', padding: 'clamp(28px, 4vw, 52px)' }}>
          <Head ctx={ctx} align="center" />
          <div style={{ marginTop: 24, display: 'grid', borderTop: '1px solid var(--site-color-line-strong)' }}>
            {rows(ctx, { mark: true, style: { borderBottom: '1px solid var(--site-color-line)', padding: '18px 2px' } })}
          </div>
          <EmptyNote ctx={ctx} align="center" style={{ marginTop: 22 }} />
        </div>
      </BodyContainer>
    </div>
  ),
};

/** Risolve il nome-variante dal section_layout_id per-blocco: catalogo del dominio, proto-safe, fallback. */
function variantFor(sectionLayoutId: string | undefined): FaqVariantName {
  if (sectionLayoutId === undefined) return FALLBACK_VARIANT;
  const variant = bodyLayoutFor(sectionLayoutId)?.variant;
  return variant !== undefined && Object.hasOwn(VARIANTS, variant)
    ? (variant as FaqVariantName)
    : FALLBACK_VARIANT;
}

export async function Faq({ block, locale, editable }: SiteBlockProps): Promise<ReactElement> {
  const label = await siteBlockLabel(block, locale);
  const t = await getTranslations({ locale, namespace: 'site' });
  const sectionLayoutId = block.section_layout_id ?? FALLBACK_SECTION_LAYOUT_ID;
  const variantName = variantFor(block.section_layout_id);
  const ctx: FaqCtx = {
    blockId: block.id,
    editable,
    label,
    title: block.content.faq_title,
    items: block.content.faq_items ?? [],
    fallbackTitle: t('faq.title'),
    placeholder: t('faq.placeholder'),
  };

  return (
    <section
      aria-label={label}
      data-block-id={block.id}
      data-block-kind={block.id}
      data-section-layout={sectionLayoutId}
      className="site-faq-v2"
    >
      {VARIANTS[variantName](ctx)}
    </section>
  );
}

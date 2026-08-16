// DV2-403 (macrotask body-sections-b, design-engine-v2) — BLOCCO ORARI v2: la settimana di apertura come
// RENDERER UNICO di 12 impaginati tradotti da Claude Design (components/orari/Orari.jsx). Il blocco consuma
// `block.section_layout_id` (DS-V2-D11, PER-BLOCCO), risolve la variante dal catalogo del dominio
// (`bodyLayoutFor`) e proietta `data-section-layout` sulla radice; il congelamento pieno lo scrive
// variety-select (DV2-503), qui senza id si cade sul fallback.
//
// GLI SLOT sono quelli di v1 (T-237): il TITOLO (content.hours_title) e l'INTRO (content.hours_intro) dal
// modello, e la MAPPA `data.hours` (giorno -> fascia) dal brief, resa tale e quale (P2-D4). Ogni VALORE
// orario e' uno slot EDITABILE instradato per la chiave del giorno (`data.hours.<day>`, path segmentato per
// le chiavi con '.'); il GIORNO e' la CHIAVE (operazione strutturale, children puri, comunque escaped da
// React). `Object.entries` legge le sole proprieta' PROPRIE, quindi una chiave dal prototipo non entra.
//
// IL GIORNO CORRENTE non e' nel documento (determinismo, AC-DV2-403-2): e' un effetto CLIENT dell'isola
// `OrariToday`, resa dentro la sezione, che marca a posteriori la riga di oggi (l'orologio vive SOLO li').
// Ogni riga porta `data-hours-key` (per l'isola) e la classe `.site-hours-v2__row` col valore in
// `.site-hours-v2__value` (per le cifre tabulari del foglio e per il test). Colori SOLO var(--site-color-*).

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
import { OrariToday } from '@/ui/site/blocks/OrariToday';
import type { SiteBlockProps } from '@/ui/site/types';
import type { ImageSlot } from '@/domain/generation/document';

/** I nomi delle 12 varianti di orari (l'asse VISIBILE del catalogo, section-layouts.ts BODY_LAYOUTS). */
type HoursVariantName =
  | 'tabella'
  | 'card-giorni'
  | 'banda-scura'
  | 'centrale'
  | 'doppia-colonna'
  | 'nastro'
  | 'registro'
  | 'insegna'
  | 'con-foto'
  | 'settimana'
  | 'verticale'
  | 'manifesto';

const FALLBACK_SECTION_LAYOUT_ID = 'orari-tabella@1';
const FALLBACK_VARIANT: HoursVariantName = 'tabella';

/** Lo spazio dopo la testata di sezione (il `--sect-gap-title` di Claude Design). */
const SECT_GAP = 'clamp(28px, 4vw, 48px)';

/** Il contesto risolto passato a ogni variante: gli slot editabili e le voci orario. */
type HoursContext = {
  readonly blockId: string;
  readonly editable?: boolean;
  readonly label: string;
  readonly title?: string;
  readonly intro?: string;
  /** Le voci [giorno, fascia] nell'ordine del documento (chiavi PROPRIE del record hours). */
  readonly entries: readonly (readonly [string, string])[];
  readonly images: readonly ImageSlot[];
};

// ── helper condivisi ───────────────────────────────────────────────────────────────────────────────

/** Occhiello (etichetta di catalogo) + titolo (hours_title) + intro (hours_intro), slot editabili. */
function Head({
  ctx,
  align = 'left',
  onDark = false,
}: {
  ctx: HoursContext;
  align?: 'left' | 'center';
  onDark?: boolean;
}): ReactElement {
  return (
    <div style={{ textAlign: align, maxWidth: align === 'center' ? 680 : undefined, marginInline: align === 'center' ? 'auto' : undefined }}>
      <BodyEyebrow label={ctx.label} onDark={onDark} />
      {ctx.title ? (
        <h2
          className="site-hours-v2__title"
          style={{
            margin: '12px 0 0',
            font: '500 var(--site-scale-2xl)/1.15 var(--site-font-display)',
            letterSpacing: '-0.01em',
            color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)',
          }}
        >
          <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.hours_title">
            {ctx.title}
          </SiteText>
        </h2>
      ) : null}
      {ctx.intro ? (
        <p
          className="site-hours-v2__intro"
          style={{
            margin: '14px 0 0',
            font: '400 var(--site-scale-lg)/1.6 var(--site-font-body)',
            color: onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-body)',
            maxWidth: '54ch',
          }}
        >
          <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.hours_intro">
            {ctx.intro}
          </SiteText>
        </p>
      ) : null}
    </div>
  );
}

/** Il VALORE orario editabile (slot data.hours.<day>): sempre in `.site-hours-v2__value` per le cifre tabulari. */
function HourValue({ ctx, day, value, style }: { ctx: HoursContext; day: string; value: string; style?: CSSProperties }): ReactElement {
  return (
    <span className="site-hours-v2__value" style={style}>
      <SiteText editable={ctx.editable} block={ctx.blockId} slot={`data.hours.${day}`} path={['data', 'hours', day]}>
        {value}
      </SiteText>
    </span>
  );
}

/** Una RIGA orario "leader-dots": giorno · guida di punti · valore. Porta data-hours-key per l'isola. */
function LeaderRow({
  ctx,
  day,
  value,
  onDark = false,
  first = false,
}: {
  ctx: HoursContext;
  day: string;
  value: string;
  onDark?: boolean;
  first?: boolean;
}): ReactElement {
  const line = onDark ? 'var(--site-color-on-dark-line)' : 'var(--site-color-line)';
  return (
    <div
      className="site-hours-v2__row"
      data-hours-key={day}
      style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '11px 0', borderTop: first ? 'none' : `1px solid ${line}` }}
    >
      <span
        className="site-hours-v2__day"
        style={{ font: '600 17px/1.2 var(--site-font-display)', color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)' }}
      >
        {day}
      </span>
      <span aria-hidden="true" style={{ flex: 1, borderBottom: `2px dotted ${line}`, transform: 'translateY(-4px)' }} />
      <HourValue
        ctx={ctx}
        day={day}
        value={value}
        style={{ font: '600 15px/1 var(--site-font-body)', letterSpacing: '.04em', color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-accent-2-deep)' }}
      />
    </div>
  );
}

/** La lista di righe leader dentro un contenitore a griglia. */
function LeaderList({ ctx, onDark = false }: { ctx: HoursContext; onDark?: boolean }): ReactElement {
  return (
    <div style={{ display: 'grid' }}>
      {ctx.entries.map(([day, value], i) => (
        <LeaderRow key={day} ctx={ctx} day={day} value={value} onDark={onDark} first={i === 0} />
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

const VARIANTS: Readonly<Record<HoursVariantName, (ctx: HoursContext) => ReactElement>> = {
  // 01 — tabella elegante su card, filo accent in testa.
  tabella: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', borderBlock: '1px solid var(--site-color-line)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ ...TWO_COL }}>
        <Head ctx={ctx} />
        <div style={{ background: 'var(--site-color-surface-card)', borderRadius: 'var(--site-radius-md)', boxShadow: BODY_CARD_SHADOW, padding: 'clamp(24px, 3vw, 40px)', borderTop: '6px solid var(--site-color-accent-2)' }}>
          <LeaderList ctx={ctx} />
        </div>
      </BodyContainer>
    </div>
  ),

  // 02 — griglia di card-giorno.
  'card-giorni': (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: SECT_GAP, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 14 }}>
          {ctx.entries.map(([day, value]) => (
            <div
              key={day}
              className="site-hours-v2__row"
              data-hours-key={day}
              style={{ background: 'var(--site-color-surface-card)', border: '1px solid var(--site-color-line-strong)', borderRadius: 'var(--site-radius-md)', padding: '20px 14px', textAlign: 'center' }}
            >
              <div className="site-hours-v2__day" style={{ font: '600 var(--site-scale-sm)/1 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: 'var(--site-color-eyebrow-color)' }}>{day}</div>
              <HourValue ctx={ctx} day={day} value={value} style={{ display: 'block', marginTop: 12, font: '600 16px/1 var(--site-font-body)', color: 'var(--site-color-accent-2-deep)' }} />
            </div>
          ))}
        </div>
      </BodyContainer>
    </div>
  ),

  // 03 — banda scura, giorni in colonna centrale.
  'banda-scura': (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ maxWidth: 760 }}>
        <Head ctx={ctx} align="center" onDark />
        <div style={{ marginTop: SECT_GAP }}>
          <LeaderList ctx={ctx} onDark />
        </div>
      </BodyContainer>
    </div>
  ),

  // 04 — carta centrata come cartello sulla porta.
  centrale: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <div style={{ maxWidth: 520, margin: '0 auto', background: 'var(--site-color-surface-card)', borderRadius: 'var(--site-radius-sm)', boxShadow: BODY_CARD_SHADOW, padding: 'clamp(28px, 4vw, 48px)', textAlign: 'center', border: '1px solid var(--site-color-line)' }}>
          <Head ctx={ctx} align="center" />
          <div style={{ margin: '24px 0 0', borderTop: '3px double var(--site-color-line-strong)', paddingTop: 8, textAlign: 'left' }}>
            <LeaderList ctx={ctx} />
          </div>
        </div>
      </BodyContainer>
    </div>
  ),

  // 05 — giorni su due colonne tipografiche.
  'doppia-colonna': (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} />
        <div style={{ marginTop: SECT_GAP, columns: '2 320px', columnGap: 56 }}>
          {ctx.entries.map(([day, value]) => (
            <div
              key={day}
              className="site-hours-v2__row"
              data-hours-key={day}
              style={{ breakInside: 'avoid', display: 'flex', alignItems: 'baseline', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--site-color-line)' }}
            >
              <span className="site-hours-v2__day" style={{ font: '600 17px/1.2 var(--site-font-display)', color: 'var(--site-color-text-heading)' }}>{day}</span>
              <span aria-hidden="true" style={{ flex: 1, borderBottom: '2px dotted var(--site-color-line)', transform: 'translateY(-4px)' }} />
              <HourValue ctx={ctx} day={day} value={value} style={{ font: '600 15px/1 var(--site-font-body)', letterSpacing: '.04em', color: 'var(--site-color-accent-2-deep)' }} />
            </div>
          ))}
        </div>
      </BodyContainer>
    </div>
  ),

  // 06 — nastro compatto a tutta larghezza su banda scura.
  nastro: (ctx) => (
    <div>
      <div style={{ background: 'var(--site-color-surface-page)', paddingTop: BODY_SECTION_PAD_Y, paddingBottom: 28 }}>
        <BodyContainer>
          <Head ctx={ctx} align="center" />
        </BodyContainer>
      </div>
      <div style={{ background: 'var(--site-color-surface-dark)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
          {ctx.entries.map(([day, value], i) => (
            <div
              key={day}
              className="site-hours-v2__row"
              data-hours-key={day}
              style={{ padding: '22px 10px', textAlign: 'center', borderLeft: i === 0 ? 'none' : '1px solid var(--site-color-on-dark-line)' }}
            >
              <div className="site-hours-v2__day" style={{ font: '600 var(--site-scale-sm)/1 var(--site-font-body)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--site-color-eyebrow-on-dark)' }}>{day.slice(0, 3)}</div>
              <HourValue ctx={ctx} day={day} value={value} style={{ display: 'block', marginTop: 8, font: '600 14px/1 var(--site-font-body)', color: 'var(--site-color-eyebrow-on-dark)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  ),

  // 07 — registro a righe piene, giorni in serif grande.
  registro: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ maxWidth: '55rem' }}>
        <Head ctx={ctx} />
        <div style={{ marginTop: SECT_GAP, borderTop: '2px solid var(--site-color-text-heading)' }}>
          {ctx.entries.map(([day, value]) => (
            <div
              key={day}
              className="site-hours-v2__row"
              data-hours-key={day}
              style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, padding: '15px 4px', borderBottom: '1px solid var(--site-color-line)', flexWrap: 'wrap' }}
            >
              <span className="site-hours-v2__day" style={{ font: '500 clamp(20px, 2.4vw, 26px)/1.1 var(--site-font-display)', color: 'var(--site-color-text-heading)' }}>{day}</span>
              <HourValue ctx={ctx} day={day} value={value} style={{ font: '600 16px/1 var(--site-font-body)', letterSpacing: '.04em', color: 'var(--site-color-accent-2-deep)' }} />
            </div>
          ))}
        </div>
      </BodyContainer>
    </div>
  ),

  // 08 — insegna: la fascia di punta gigante accanto all'elenco.
  insegna: (ctx) => {
    const featured = ctx.entries[0]?.[1] ?? '';
    return (
      <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
        <BodyContainer style={{ ...TWO_COL }}>
          <div>
            <Head ctx={ctx} />
            <div aria-hidden="true" style={{ marginTop: 24, font: '500 clamp(40px, 5vw, 64px)/1.1 var(--site-font-display)', color: 'var(--site-color-accent)', letterSpacing: '-0.01em' }}>{featured}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--site-color-line-strong)', paddingLeft: 'clamp(20px, 3vw, 44px)' }}>
            <LeaderList ctx={ctx} />
          </div>
        </BodyContainer>
      </div>
    );
  },

  // 09 — con foto della sala a pranzo (M5). NB alignItems resta 'center' (da TWO_COL): con 'stretch' il
  // placeholder (aspect-ratio 16/9) risolverebbe la larghezza dall'altezza stirata e sfonderebbe la traccia.
  'con-foto': (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ ...TWO_COL }}>
        <BodyPhoto images={ctx.images} index={0} label={ctx.label} ratio="4 / 3" style={{ minHeight: 360 }} />
        <div style={{ display: 'grid', alignContent: 'center' }}>
          <Head ctx={ctx} />
          <div style={{ marginTop: 22 }}>
            <LeaderList ctx={ctx} />
          </div>
        </div>
      </BodyContainer>
    </div>
  ),

  // 10 — settimana a calendario.
  settimana: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: SECT_GAP, border: '1px solid var(--site-color-line-strong)', borderRadius: 'var(--site-radius-sm)', overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          {ctx.entries.map(([day, value]) => (
            <div
              key={day}
              className="site-hours-v2__row"
              data-hours-key={day}
              style={{ minHeight: 150, padding: '16px 14px', background: 'var(--site-color-surface-card)', borderRight: '1px solid var(--site-color-line)', borderBottom: '1px solid var(--site-color-line)', display: 'grid', alignContent: 'space-between' }}
            >
              <div className="site-hours-v2__day" style={{ font: '600 15px var(--site-font-display)', color: 'var(--site-color-text-heading)' }}>{day}</div>
              <HourValue ctx={ctx} day={day} value={value} style={{ font: '600 14px/1 var(--site-font-body)', color: 'var(--site-color-accent-2-deep)' }} />
            </div>
          ))}
        </div>
      </BodyContainer>
    </div>
  ),

  // 11 — timeline verticale con pallini.
  verticale: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ maxWidth: 680 }}>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: SECT_GAP, borderLeft: '1px solid var(--site-color-line-strong)', marginLeft: 10, display: 'grid', gap: 20 }}>
          {ctx.entries.map(([day, value]) => (
            <div
              key={day}
              className="site-hours-v2__row"
              data-hours-key={day}
              style={{ position: 'relative', paddingLeft: 28, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}
            >
              <span aria-hidden="true" style={{ position: 'absolute', left: -6, top: 7, width: 11, height: 11, borderRadius: '50%', background: 'var(--site-color-accent-2)', border: '2px solid var(--site-color-surface-alt)' }} />
              <span className="site-hours-v2__day" style={{ font: '600 19px/1.2 var(--site-font-display)', color: 'var(--site-color-text-heading)' }}>{day}</span>
              <HourValue ctx={ctx} day={day} value={value} style={{ font: '600 15px/1 var(--site-font-body)', letterSpacing: '.04em', color: 'var(--site-color-accent-2-deep)' }} />
            </div>
          ))}
        </div>
      </BodyContainer>
    </div>
  ),

  // 12 — manifesto: titolo gigante e card degli orari a fianco.
  manifesto: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ ...TWO_COL }}>
        <div>
          <BodyEyebrow label={ctx.label} />
          {ctx.title ? (
            <div style={{ marginTop: 12, font: '500 clamp(44px, 7vw, 92px)/0.98 var(--site-font-display)', letterSpacing: '-0.02em', color: 'var(--site-color-text-heading)' }}>
              <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.hours_title">
                {ctx.title}
              </SiteText>
            </div>
          ) : null}
          {ctx.intro ? (
            <p style={{ margin: '18px 0 0', font: '400 var(--site-scale-lg)/1.6 var(--site-font-body)', color: 'var(--site-color-text-body)', maxWidth: '40ch' }}>
              <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.hours_intro">
                {ctx.intro}
              </SiteText>
            </p>
          ) : null}
        </div>
        <div style={{ background: 'var(--site-color-surface-card)', border: '1px solid var(--site-color-line-strong)', borderRadius: 'var(--site-radius-sm)', padding: 'clamp(22px, 3vw, 36px)' }}>
          <LeaderList ctx={ctx} />
        </div>
      </BodyContainer>
    </div>
  ),
};

/** Risolve il nome-variante dal `section_layout_id` per-blocco: catalogo del dominio, proto-safe, fallback. */
function variantFor(sectionLayoutId: string | undefined): HoursVariantName {
  if (sectionLayoutId === undefined) return FALLBACK_VARIANT;
  const variant = bodyLayoutFor(sectionLayoutId)?.variant;
  return variant !== undefined && Object.hasOwn(VARIANTS, variant)
    ? (variant as HoursVariantName)
    : FALLBACK_VARIANT;
}

export async function Orari({ block, locale, editable }: SiteBlockProps): Promise<ReactElement> {
  const label = await siteBlockLabel(block, locale);
  const sectionLayoutId = block.section_layout_id ?? FALLBACK_SECTION_LAYOUT_ID;
  const variantName = variantFor(block.section_layout_id);
  const ctx: HoursContext = {
    blockId: block.id,
    editable,
    label,
    title: block.content.hours_title,
    intro: block.content.hours_intro,
    entries: Object.entries(block.data.hours ?? {}),
    images: block.images,
  };

  return (
    <section
      aria-label={label}
      data-block-id={block.id}
      data-block-kind={block.id}
      data-section-layout={sectionLayoutId}
      className="site-hours-v2"
    >
      {VARIANTS[variantName](ctx)}
      {/* Isola CLIENT: marca la riga del giorno di oggi DOPO il mount (l'orologio vive solo qui). Il
          server-render non porta alcun marcatore -> documento byte-identico (AC-DV2-403-2). */}
      <OrariToday locale={locale} />
    </section>
  );
}

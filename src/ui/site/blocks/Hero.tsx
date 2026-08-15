// DV2-202 (macrotask hero, design-engine-v2) — IL RENDERER UNICO DELL'HERO. Un solo `Hero.tsx`, che
// vale identico per card / anteprima / `/s/` (P2-D8): dentro porta le 20 varianti di Claude Design
// (progetto c1dafc1f), tradotte in blocchi React sorgente. La variante da rendere la sceglie
// `design.hero_layout_id` (id versionato `hero-<kebab>@1`, oppure uno dei 6 layout legacy che mappano
// alla variante CD piu' vicina); assente la selezione, si cade sulla variante di default.
//
// LE REGOLE DEL LAYER, INVARIATE dai blocchi di P2 (AC-231-4 / DS-V2-D7):
//  - ogni stringa non fidata passa dai FIGLI di React (escaping automatico), avvolta in `SiteText`
//    cosi' l'edit inline di P3 resta possibile; MAI iniezione di HTML grezzo (nessun __html);
//  - NESSUN colore letterale (hex/rgb/hsl): solo `var(--site-color-*)` e `color-mix(in srgb, var(...))`
//    (le ombre di CD, che non hanno un token, diventano box-shadow con color-mix); px/clamp/% per le
//    DIMENSIONI sono ammessi;
//  - NESSUN `src`/`href` nato dal testo del brief: le foto sono `PhotoPlaceholder` di catalogo (nessun
//    `src`), le CTA hanno etichetta i18n di catalogo e href INTERNA statica (`#offerte`/`#contatti`);
//  - la RADICE dell'hero replica gli attributi che prima poneva `SiteSection` (l'hero v2 rende inline e
//    non lo usa piu'): `aria-label` (etichetta i18n), `data-block-id`, `data-block-kind="hero"`, piu' il
//    `data-hero-layout` congelato; resta un Server Component async, deterministico (nessun Date/random).
//
// L'INVARIANTE AC-231-5 E' PRESERVATA: fra i dati del brief l'hero rende SOLO `business_name` (la riga
// BRAND). Nessun altro campo di `block.data` e' letto — l'occhiello/titolo/sottotitolo vengono dagli
// slot di contenuto del pool, non dai dati del brief.

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { ImageSlot } from '@/domain/generation/document';
import { assetPublicUrl } from '@/config/storage';
import { Button, PhotoPlaceholder } from '@/ui/site/primitives';
import { SiteText } from '@/ui/site/SiteText';
import { siteBlockLabel } from '@/ui/site/labels';
import type { SiteBlockProps } from '@/ui/site/types';

// ── il contesto passato a ogni variante ───────────────────────────────────────
// Il testo degli slot piu' l'id del blocco e la modalita editable: le variant functions non toccano
// `block` direttamente, compongono questi pezzi gia' risolti. Le CTA e la label foto sono etichette di
// catalogo (i18n), non testo del brief.
type HeroContext = {
  readonly blockId: string;
  readonly editable?: boolean;
  readonly brand?: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly photoLabel: string;
  readonly ctaPrimary: string;
  readonly ctaSecondary: string;
  // Gli slot immagine del blocco (P4-M5): una posizione-foto `uploaded` diventa un <img> reale
  // (HeroPhoto), le altre restano il PhotoPlaceholder di catalogo. Le variant functions non toccano
  // `block`: leggono qui l'indice della loro foto protagonista.
  readonly images: readonly ImageSlot[];
};

// ── costanti di stile condivise (tradotte dagli helper di CD) ──────────────────
// `--sect-y` -> padding verticale fluido; `--container-*`/.rds-container -> un container centrato a
// 72rem; lo `scrim`/overlay -> gradiente di color-mix del solo surface-dark (mai rgba/hex).
const SECTION_Y: CSSProperties = {
  paddingTop: 'clamp(48px, 7vw, 96px)',
  paddingBottom: 'clamp(48px, 7vw, 96px)',
};

const GRID_2: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
  gap: 'clamp(28px, 4vw, 56px)',
  alignItems: 'center',
};

const CONTAINER_PAD = 'clamp(20px, 5vw, 48px)';

const SCRIM =
  'linear-gradient(180deg, color-mix(in srgb, var(--site-color-surface-dark) 30%, transparent), color-mix(in srgb, var(--site-color-surface-dark) 18%, transparent) 45%, color-mix(in srgb, var(--site-color-surface-dark) 88%, transparent))';

const PAPER_SHADOW =
  '0 18px 40px color-mix(in srgb, var(--site-color-surface-dark) 15%, transparent)';

const CARD_SHADOW =
  '0 18px 40px color-mix(in srgb, var(--site-color-surface-dark) 12%, transparent)';

// ── il container centrato (la .rds-container di CD) ────────────────────────────
function Container({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactElement {
  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: `0 ${CONTAINER_PAD}`, ...style }}>
      {children}
    </div>
  );
}

// ── gli slot editabili, resi da React (escaping) e avvolti in SiteText ─────────
// Ognuno rende `null` se lo slot e' vuoto (come faceva l'hero di P2): gli slot mancanti si omettono.

function Brand({
  ctx,
  onDark,
  style,
}: {
  ctx: HeroContext;
  onDark?: boolean;
  style?: CSSProperties;
}): ReactElement | null {
  if (!ctx.brand) return null;
  return (
    <p
      className="site-hero-v2__brand"
      style={{
        margin: 0,
        fontFamily: 'var(--site-font-display)',
        fontSize: 'var(--site-scale-lg)',
        letterSpacing: '0.02em',
        color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-accent)',
        ...style,
      }}
    >
      <SiteText editable={ctx.editable} block={ctx.blockId} slot="data.business_name">
        {ctx.brand}
      </SiteText>
    </p>
  );
}

function Eyebrow({
  ctx,
  onDark,
  style,
}: {
  ctx: HeroContext;
  onDark?: boolean;
  style?: CSSProperties;
}): ReactElement | null {
  if (!ctx.eyebrow) return null;
  return (
    <div
      className="site-hero-v2__eyebrow"
      style={{
        fontWeight: 600,
        fontSize: 'var(--site-scale-sm)',
        lineHeight: 1.2,
        fontFamily: 'var(--site-font-body)',
        letterSpacing: 'var(--site-tracking-label)',
        textTransform: 'uppercase',
        color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-eyebrow-color)',
        ...style,
      }}
    >
      <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.hero_title_kicker">
        {ctx.eyebrow}
      </SiteText>
    </div>
  );
}

// Il titolo E' un <h1> con la serif display (`var(--site-font-display)`): e' l'apertura della pagina.
function Title({
  ctx,
  onDark,
  style,
}: {
  ctx: HeroContext;
  onDark?: boolean;
  style?: CSSProperties;
}): ReactElement | null {
  if (!ctx.title) return null;
  return (
    <h1
      className="site-hero-v2__title"
      style={{
        margin: 0,
        fontFamily: 'var(--site-font-display)',
        fontWeight: 500,
        fontSize: 'var(--site-scale-3xl)',
        lineHeight: 1.08,
        letterSpacing: '-0.015em',
        color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)',
        ...style,
      }}
    >
      <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.hero_title">
        {ctx.title}
      </SiteText>
    </h1>
  );
}

function Subtitle({
  ctx,
  onDark,
  italic,
  style,
}: {
  ctx: HeroContext;
  onDark?: boolean;
  italic?: boolean;
  style?: CSSProperties;
}): ReactElement | null {
  if (!ctx.subtitle) return null;
  return (
    <p
      className="site-hero-v2__subtitle"
      style={{
        margin: 0,
        fontSize: 'var(--site-scale-lg)',
        lineHeight: 1.5,
        color: onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-body)',
        ...(italic ? { fontStyle: 'italic', fontFamily: 'var(--site-font-display)' } : null),
        ...style,
      }}
    >
      <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.hero_subtitle">
        {ctx.subtitle}
      </SiteText>
    </p>
  );
}

// Le due CTA di catalogo: etichetta i18n, href INTERNA statica, via il primitivo Button (mai testo
// del brief). Su fondo scuro cambiano variante (gold/onDark) per il contrasto.
function Ctas({
  ctx,
  onDark,
  center,
  column,
  style,
}: {
  ctx: HeroContext;
  onDark?: boolean;
  center?: boolean;
  column?: boolean;
  style?: CSSProperties;
}): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        flexWrap: 'wrap',
        justifyContent: center ? 'center' : 'flex-start',
        flexDirection: column ? 'column' : 'row',
        alignItems: column ? 'stretch' : 'center',
        ...style,
      }}
    >
      <Button label={ctx.ctaPrimary} href="#offerte" variant={onDark ? 'gold' : 'solid'} />
      <Button label={ctx.ctaSecondary} href="#contatti" variant={onDark ? 'onDark' : 'outline'} />
    </div>
  );
}

// La riga a righello (rules ai due lati di un occhiello centrato): un pattern di alcune varianti CD.
function RuleRow({ onDark, children }: { onDark?: boolean; children: ReactNode }): ReactElement {
  const rule: CSSProperties = {
    flex: 1,
    borderTop: `1px solid ${onDark ? 'var(--site-color-on-dark-line)' : 'var(--site-color-line-strong)'}`,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <span style={rule} />
      {children}
      <span style={rule} />
    </div>
  );
}

// La foto di una posizione dell'hero: l'immagine CARICATA dall'utente (block.images[index] uploaded)
// resa come <img> reale (M5/P4-D6a: src COSTRUITO da assetPublicUrl sul solo asset_id, MAI da testo
// libero — P2-D12), altrimenti il PhotoPlaceholder tipografico di catalogo (DS-V2-D3). `index` assente
// => sempre placeholder (foto decorativa). aria-hidden + alt="" come SiteImage (decorativo).
function HeroPhoto({
  ctx,
  index,
  dark,
  ratio,
  radius,
  style,
  background,
}: {
  ctx: HeroContext;
  index?: number;
  dark?: boolean;
  ratio?: string;
  radius?: string;
  style?: CSSProperties;
  background?: boolean;
}): ReactElement {
  const slot = index === undefined ? undefined : ctx.images[index];
  if (slot && slot.source === 'uploaded') {
    return (
      <img
        className="site-hero-v2__photo"
        data-image-asset={slot.asset_id}
        src={assetPublicUrl(slot.asset_id)}
        alt=""
        aria-hidden="true"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: radius ?? 'var(--site-radius-md)',
          ...(ratio ? { aspectRatio: ratio } : null),
          ...style,
        }}
      />
    );
  }
  return <PhotoPlaceholder label={ctx.photoLabel} dark={dark} ratio={ratio} radius={radius} style={style} background={background} />;
}

// ── LE 20 VARIANTI (tradotte da components/hero/Hero.jsx di Claude Design) ──────
// Ogni variante rende un <div> (la radice <section> con gli attributi la mette Hero, sotto), col
// proprio layout: fondo, griglia, posizionamento della foto, trattamento del titolo. Il `note`
// (indirizzo) di CD e' OMESSO (mai l'indirizzo del brief); `business_name` e' la riga BRAND in cima al
// testo.
const VARIANTS = {
  /* 01 full — foto full-bleed, testo in basso a sinistra (onDark, overlay) */
  full: (ctx: HeroContext): ReactElement => (
    <div
      style={{
        position: 'relative',
        minHeight: 'min(88vh, 680px)',
        display: 'flex',
        alignItems: 'flex-end',
        background: 'var(--site-color-surface-dark)',
      }}
    >
      <HeroPhoto ctx={ctx} index={0} dark background radius="0" style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: SCRIM }} />
      <Container style={{ position: 'relative', width: '100%', paddingTop: 120, paddingBottom: 'clamp(48px, 7vw, 88px)' }}>
        <Brand ctx={ctx} onDark />
        <Eyebrow ctx={ctx} onDark style={{ marginTop: 16 }} />
        <Title ctx={ctx} onDark style={{ marginTop: 16, maxWidth: '15ch' }} />
        <Subtitle ctx={ctx} onDark style={{ marginTop: 16, maxWidth: '46ch' }} />
        <Ctas ctx={ctx} onDark style={{ marginTop: 30 }} />
      </Container>
    </div>
  ),

  /* 02 split — 2 colonne, foto INCORNICIATA a destra (light) */
  split: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-page)' }}>
      <Container style={{ ...GRID_2, ...SECTION_Y }}>
        <div>
          <Brand ctx={ctx} />
          <Eyebrow ctx={ctx} style={{ marginTop: 16 }} />
          <Title ctx={ctx} style={{ marginTop: 16 }} />
          <Subtitle ctx={ctx} style={{ marginTop: 18, maxWidth: '44ch' }} />
          <Ctas ctx={ctx} style={{ marginTop: 30 }} />
        </div>
        <div style={{ position: 'relative', paddingBottom: 18, paddingRight: 18 }}>
          <div
            style={{
              position: 'absolute',
              top: 18,
              right: 0,
              bottom: 0,
              left: 18,
              border: '1px solid var(--site-color-eyebrow-color)',
              borderRadius: 'var(--site-radius-md)',
            }}
          />
          <HeroPhoto ctx={ctx} index={0} ratio="4 / 4.6" style={{ position: 'relative' }} />
        </div>
      </Container>
    </div>
  ),

  /* 03 editorial — centrato, sottotitolo corsivo, striscia di 3 foto */
  editorial: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-alt)', overflow: 'hidden' }}>
      <Container style={{ paddingTop: 'clamp(48px, 7vw, 96px)', textAlign: 'center' }}>
        <Brand ctx={ctx} />
        <RuleRow>
          <Eyebrow ctx={ctx} />
        </RuleRow>
        <Title ctx={ctx} style={{ margin: 'clamp(24px,3vw,40px) auto 0', maxWidth: '16ch' }} />
        <Subtitle ctx={ctx} italic style={{ margin: '18px auto 0', maxWidth: '52ch' }} />
        <Ctas ctx={ctx} center style={{ marginTop: 28 }} />
        <div
          style={{
            marginTop: 'clamp(32px,4vw,52px)',
            display: 'grid',
            gridTemplateColumns: '1fr 1.35fr 1fr',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <PhotoPlaceholder label={ctx.photoLabel} style={{ height: 230, borderRadius: 'var(--site-radius-md) var(--site-radius-md) 0 0' }} />
          <HeroPhoto ctx={ctx} index={0} style={{ height: 300, borderRadius: 'var(--site-radius-md) var(--site-radius-md) 0 0' }} />
          <PhotoPlaceholder label={ctx.photoLabel} style={{ height: 230, borderRadius: 'var(--site-radius-md) var(--site-radius-md) 0 0' }} />
        </div>
      </Container>
    </div>
  ),

  /* 04 fullCentrato — full-bleed testo centrato (onDark) */
  fullCentrato: (ctx: HeroContext): ReactElement => (
    <div
      style={{
        position: 'relative',
        minHeight: 'min(90vh, 700px)',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--site-color-surface-dark)',
      }}
    >
      <HeroPhoto ctx={ctx} index={0} dark background radius="0" style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--site-color-surface-dark) 62%, transparent)' }} />
      <Container style={{ position: 'relative', textAlign: 'center', paddingTop: 90, paddingBottom: 110 }}>
        <Brand ctx={ctx} onDark />
        <RuleRow onDark>
          <Eyebrow ctx={ctx} onDark />
        </RuleRow>
        <Title ctx={ctx} onDark style={{ margin: '24px auto 0', maxWidth: '16ch' }} />
        <Subtitle ctx={ctx} onDark style={{ margin: '16px auto 0', maxWidth: '48ch' }} />
        <Ctas ctx={ctx} onDark center style={{ marginTop: 30 }} />
      </Container>
    </div>
  ),

  /* 05 splitInverso — foto a SINISTRA a filo, testo a destra */
  splitInverso: (ctx: HeroContext): ReactElement => (
    <div
      style={{
        background: 'var(--site-color-surface-page)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
        alignItems: 'stretch',
      }}
    >
      <HeroPhoto ctx={ctx} index={0} radius="0" style={{ minHeight: 460 }} />
      <div style={{ display: 'grid', alignContent: 'center', padding: `clamp(40px, 6vw, 88px) ${CONTAINER_PAD}`, maxWidth: 640 }}>
        <Brand ctx={ctx} />
        <Eyebrow ctx={ctx} style={{ marginTop: 16 }} />
        <Title ctx={ctx} style={{ marginTop: 16 }} />
        <Subtitle ctx={ctx} style={{ marginTop: 18 }} />
        <Ctas ctx={ctx} style={{ marginTop: 30 }} />
      </div>
    </div>
  ),

  /* 06 banda — banda su surface-alt, foto quadrata */
  banda: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-alt)' }}>
      <Container
        style={{
          ...GRID_2,
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
          paddingTop: 'clamp(48px, 7vw, 96px)',
          paddingBottom: 'clamp(32px, 4vw, 48px)',
        }}
      >
        <div>
          <Brand ctx={ctx} />
          <Eyebrow ctx={ctx} style={{ marginTop: 14 }} />
          <Title ctx={ctx} style={{ marginTop: 14 }} />
          <Subtitle ctx={ctx} style={{ marginTop: 16, maxWidth: '42ch' }} />
          <Ctas ctx={ctx} style={{ marginTop: 26 }} />
        </div>
        <HeroPhoto ctx={ctx} index={0} ratio="1 / 1" radius="var(--site-radius-lg)" />
      </Container>
    </div>
  ),

  /* 07 copertina — titolo gigante, CTA a cavallo della foto larga */
  copertina: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-page)' }}>
      <Container style={{ ...SECTION_Y, textAlign: 'center' }}>
        <Brand ctx={ctx} />
        <RuleRow>
          <Eyebrow ctx={ctx} />
        </RuleRow>
        <Title ctx={ctx} style={{ margin: '26px auto 0', maxWidth: '14ch', fontSize: 'clamp(48px, 7vw, 92px)' }} />
        <Subtitle ctx={ctx} style={{ margin: '16px auto 0', maxWidth: '50ch' }} />
        <div style={{ position: 'relative', marginTop: 56 }}>
          <Ctas ctx={ctx} center style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: 'translateY(-50%)', zIndex: 1 }} />
          <HeroPhoto ctx={ctx} index={0} ratio="16 / 7" radius="var(--site-radius-lg)" />
        </div>
      </Container>
    </div>
  ),

  /* 08 duale — testo al centro, due foto ai lati */
  duale: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-page)' }}>
      <Container
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr minmax(min(100%, 340px), 1.7fr) 1fr',
          gap: 'clamp(16px, 3vw, 40px)',
          alignItems: 'center',
          ...SECTION_Y,
        }}
      >
        <PhotoPlaceholder label={ctx.photoLabel} ratio="3 / 4.4" />
        <div style={{ textAlign: 'center', padding: '0 8px' }}>
          <Brand ctx={ctx} />
          <Eyebrow ctx={ctx} style={{ marginTop: 14 }} />
          <Title ctx={ctx} style={{ margin: '14px auto 0' }} />
          <Subtitle ctx={ctx} style={{ margin: '16px auto 0', maxWidth: '40ch' }} />
          <Ctas ctx={ctx} center style={{ marginTop: 26 }} />
        </div>
        <HeroPhoto ctx={ctx} index={0} ratio="3 / 4.4" />
      </Container>
    </div>
  ),

  /* 09 cartaSuFoto — carta chiara sopra foto full-bleed (onDark bg) */
  cartaSuFoto: (ctx: HeroContext): ReactElement => (
    <div style={{ position: 'relative', background: 'var(--site-color-surface-dark)' }}>
      <HeroPhoto ctx={ctx} index={0} dark background radius="0" style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--site-color-surface-dark) 30%, transparent)' }} />
      <Container style={{ position: 'relative', ...SECTION_Y }}>
        <div
          style={{
            maxWidth: 560,
            background: 'var(--site-color-surface-card)',
            borderRadius: 'var(--site-radius-sm)',
            boxShadow: PAPER_SHADOW,
            padding: 'clamp(28px, 4vw, 48px)',
            borderTop: '6px solid var(--site-color-accent)',
          }}
        >
          <Brand ctx={ctx} />
          <Eyebrow ctx={ctx} style={{ marginTop: 14 }} />
          <Title ctx={ctx} style={{ marginTop: 14, fontSize: 'var(--site-scale-2xl)' }} />
          <Subtitle ctx={ctx} style={{ marginTop: 14 }} />
          <Ctas ctx={ctx} style={{ marginTop: 24 }} />
        </div>
      </Container>
    </div>
  ),

  /* 10 poster — poster scuro incorniciato, foto ad arco (onDark) */
  poster: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-dark)', padding: 'clamp(20px, 3vw, 36px)' }}>
      <div
        style={{
          border: '1px solid var(--site-color-on-dark-line)',
          borderRadius: 'var(--site-radius-sm)',
          padding: `clamp(36px, 5vw, 64px) ${CONTAINER_PAD}`,
          textAlign: 'center',
        }}
      >
        <HeroPhoto ctx={ctx} index={0} dark style={{ width: 'min(220px, 60%)', height: 250, margin: '0 auto', borderRadius: '999px 999px 0 0' }} />
        <Brand ctx={ctx} onDark style={{ marginTop: 26 }} />
        <Eyebrow ctx={ctx} onDark style={{ marginTop: 14 }} />
        <Title ctx={ctx} onDark style={{ margin: '14px auto 0', maxWidth: '16ch' }} />
        <Subtitle ctx={ctx} onDark italic style={{ margin: '14px auto 0', maxWidth: '46ch' }} />
        <Ctas ctx={ctx} onDark center style={{ marginTop: 28 }} />
      </div>
    </div>
  ),

  /* 11 arco — arco centrale, titolo a sinistra, testo a destra (3 col) */
  arco: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-alt)' }}>
      <Container
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'clamp(24px, 3vw, 48px)',
          alignItems: 'center',
          ...SECTION_Y,
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <Brand ctx={ctx} />
          <Eyebrow ctx={ctx} style={{ marginTop: 14 }} />
          <Title ctx={ctx} style={{ marginTop: 14 }} />
        </div>
        <HeroPhoto
          ctx={ctx}
          index={0}
          style={{ height: 'clamp(340px, 40vw, 460px)', borderRadius: '999px 999px var(--site-radius-sm) var(--site-radius-sm)', maxWidth: 340, margin: '0 auto', width: '100%' }}
        />
        <div>
          <Subtitle ctx={ctx} style={{ maxWidth: '36ch' }} />
          <Ctas ctx={ctx} style={{ marginTop: 24 }} />
        </div>
      </Container>
    </div>
  ),

  /* 12 biglietto — carta col separatore tratteggiato, foto affiancata */
  biglietto: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-page)' }}>
      <Container style={{ ...SECTION_Y }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
            background: 'var(--site-color-surface-card)',
            border: '1px solid var(--site-color-line)',
            borderRadius: 'var(--site-radius-md)',
            boxShadow: CARD_SHADOW,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 'clamp(32px, 4vw, 56px)', borderRight: '2px dashed var(--site-color-line-strong)' }}>
            <Brand ctx={ctx} />
            <Eyebrow ctx={ctx} style={{ marginTop: 14 }} />
            <Title ctx={ctx} style={{ marginTop: 14, fontSize: 'var(--site-scale-2xl)' }} />
            <Subtitle ctx={ctx} style={{ marginTop: 14, maxWidth: '44ch' }} />
            <Ctas ctx={ctx} style={{ marginTop: 26 }} />
          </div>
          <HeroPhoto ctx={ctx} index={0} radius="0" style={{ minHeight: 260 }} />
        </div>
      </Container>
    </div>
  ),

  /* 13 manifesto — titolo enorme, foto panoramica sotto */
  manifesto: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-page)' }}>
      <Container style={{ ...SECTION_Y }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Brand ctx={ctx} />
          <Eyebrow ctx={ctx} />
          <span style={{ flex: 1, borderTop: '1px solid var(--site-color-line-strong)' }} />
        </div>
        <Title ctx={ctx} style={{ margin: 'clamp(20px,3vw,36px) 0 0', fontSize: 'clamp(48px, 7.5vw, 100px)', maxWidth: '18ch' }} />
        <div style={{ marginTop: 22, display: 'flex', gap: 'clamp(20px, 4vw, 48px)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Subtitle ctx={ctx} style={{ maxWidth: '48ch' }} />
          <Ctas ctx={ctx} />
        </div>
        <HeroPhoto ctx={ctx} index={0} ratio="21 / 8" style={{ marginTop: 'clamp(26px, 3vw, 40px)' }} />
      </Container>
    </div>
  ),

  /* 14 laterale — pannello scuro laterale + foto con titolo in overlay (onDark) */
  laterale: (ctx: HeroContext): ReactElement => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', background: 'var(--site-color-surface-dark)' }}>
      <div style={{ maxWidth: 420, padding: `clamp(36px, 5vw, 64px) ${CONTAINER_PAD}`, display: 'grid', gap: 22, alignContent: 'center' }}>
        <Brand ctx={ctx} onDark />
        <Eyebrow ctx={ctx} onDark />
        <Subtitle ctx={ctx} onDark italic />
        <Ctas ctx={ctx} onDark column style={{ maxWidth: 260 }} />
      </div>
      <div style={{ position: 'relative', minHeight: 480, gridColumn: 'span 2' }}>
        <HeroPhoto ctx={ctx} index={0} dark background radius="0" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: SCRIM }} />
        <Title ctx={ctx} onDark style={{ position: 'absolute', left: 'clamp(20px,4vw,48px)', bottom: 'clamp(20px,4vw,44px)', maxWidth: '14ch' }} />
      </div>
    </div>
  ),

  /* 15 collage — collage di 3 foto a destra */
  collage: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-page)' }}>
      <Container style={{ ...GRID_2, ...SECTION_Y }}>
        <div>
          <Brand ctx={ctx} />
          <Eyebrow ctx={ctx} style={{ marginTop: 16 }} />
          <Title ctx={ctx} style={{ marginTop: 16 }} />
          <Subtitle ctx={ctx} style={{ marginTop: 18, maxWidth: '44ch' }} />
          <Ctas ctx={ctx} style={{ marginTop: 28 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gridTemplateRows: '1fr 1fr', gap: 14, minHeight: 440 }}>
          <HeroPhoto ctx={ctx} index={0} style={{ gridRow: 'span 2' }} />
          <PhotoPlaceholder label={ctx.photoLabel} />
          <PhotoPlaceholder label={ctx.photoLabel} dark />
        </div>
      </Container>
    </div>
  ),

  /* 16 cornice — tutto dentro una doppia cornice */
  cornice: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-alt)', padding: `clamp(20px, 3vw, 40px) ${CONTAINER_PAD}` }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto', border: '1px solid var(--site-color-line-strong)', padding: 8, borderRadius: 'var(--site-radius-sm)' }}>
        <div style={{ border: '1px solid var(--site-color-line)', borderRadius: 'var(--site-radius-sm)', overflow: 'hidden' }}>
          <HeroPhoto ctx={ctx} index={0} ratio="16 / 6" radius="0" />
          <div style={{ textAlign: 'center', padding: `clamp(28px, 4vw, 48px) ${CONTAINER_PAD}` }}>
            <Brand ctx={ctx} />
            <Eyebrow ctx={ctx} style={{ marginTop: 14 }} />
            <Title ctx={ctx} style={{ margin: '14px auto 0', maxWidth: '18ch' }} />
            <Subtitle ctx={ctx} style={{ margin: '14px auto 0', maxWidth: '50ch' }} />
            <Ctas ctx={ctx} center style={{ marginTop: 24 }} />
          </div>
        </div>
      </div>
    </div>
  ),

  /* 17 angolo — titolo che abbraccia la foto in alto a destra */
  angolo: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-page)' }}>
      <Container style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1.3fr))', gap: 'clamp(24px, 4vw, 56px)', ...SECTION_Y }}>
        <div style={{ display: 'grid', alignContent: 'space-between', gap: 28 }}>
          <div>
            <Brand ctx={ctx} />
            <Eyebrow ctx={ctx} style={{ marginTop: 14 }} />
            <Title ctx={ctx} style={{ marginTop: 14, fontSize: 'clamp(44px, 6.5vw, 84px)' }} />
          </div>
          <div>
            <Subtitle ctx={ctx} style={{ maxWidth: '46ch' }} />
            <Ctas ctx={ctx} style={{ marginTop: 24 }} />
          </div>
        </div>
        <HeroPhoto ctx={ctx} index={0} ratio="3 / 3.6" style={{ borderRadius: '0 0 0 var(--site-radius-lg)', borderLeft: '6px solid var(--site-color-eyebrow-color)' }} />
      </Container>
    </div>
  ),

  /* 18 fasce — tre fasce orizzontali piene */
  fasce: (ctx: HeroContext): ReactElement => (
    <div>
      <div style={{ background: 'var(--site-color-surface-alt)', borderBottom: '1px solid var(--site-color-line)' }}>
        <Container style={{ padding: `clamp(28px,4vw,44px) ${CONTAINER_PAD}` }}>
          <Brand ctx={ctx} />
          <Eyebrow ctx={ctx} style={{ marginTop: 12 }} />
          <Title ctx={ctx} style={{ marginTop: 12, maxWidth: '20ch' }} />
        </Container>
      </div>
      <div style={{ background: 'var(--site-color-surface-page)' }}>
        <Container style={{ padding: `22px ${CONTAINER_PAD}`, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Subtitle ctx={ctx} style={{ maxWidth: '52ch' }} />
          <Ctas ctx={ctx} />
        </Container>
      </div>
      <HeroPhoto ctx={ctx} index={0} radius="0" style={{ height: 'clamp(240px, 34vw, 380px)' }} />
    </div>
  ),

  /* 19 tipografico — il titolo E' l'immagine, foto bassa */
  tipografico: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-page)' }}>
      <Container style={{ ...SECTION_Y }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottom: '1px solid var(--site-color-line-strong)', paddingBottom: 14 }}>
          <Brand ctx={ctx} />
          <Eyebrow ctx={ctx} />
        </div>
        <Title ctx={ctx} style={{ margin: 'clamp(24px,4vw,48px) 0 0', fontSize: 'clamp(54px, 9vw, 124px)', maxWidth: '12ch' }} />
        <div style={{ marginTop: 26, display: 'flex', gap: 'clamp(20px,4vw,56px)', alignItems: 'center', flexWrap: 'wrap' }}>
          <Ctas ctx={ctx} />
          <Subtitle ctx={ctx} style={{ maxWidth: '40ch' }} />
        </div>
        <HeroPhoto ctx={ctx} index={0} style={{ marginTop: 'clamp(26px,3vw,44px)', height: 130 }} />
      </Container>
    </div>
  ),

  /* 20 gazzetta — prima pagina di quotidiano */
  gazzetta: (ctx: HeroContext): ReactElement => (
    <div style={{ background: 'var(--site-color-surface-card)' }}>
      <Container style={{ ...SECTION_Y, maxWidth: 980 }}>
        <div style={{ borderTop: '3px double var(--site-color-line-strong)', borderBottom: '1px solid var(--site-color-line-strong)', padding: '10px 0', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <Brand ctx={ctx} />
          <Eyebrow ctx={ctx} />
        </div>
        <Title ctx={ctx} style={{ margin: 'clamp(24px,3vw,40px) auto 0', textAlign: 'center', maxWidth: '16ch', fontSize: 'clamp(44px, 6vw, 82px)' }} />
        <Subtitle ctx={ctx} italic style={{ margin: '22px auto 0', maxWidth: '64ch', columnCount: 2, columnGap: 36, textAlign: 'left' }} />
        <HeroPhoto ctx={ctx} index={0} ratio="16 / 6" radius="var(--site-radius-sm)" style={{ marginTop: 28, border: '1px solid var(--site-color-line)' }} />
        <Ctas ctx={ctx} center style={{ marginTop: 28 }} />
      </Container>
    </div>
  ),
} satisfies Record<string, (ctx: HeroContext) => ReactElement>;

type VariantName = keyof typeof VARIANTS;

// ── la mappa id-layout -> variante CD ──────────────────────────────────────────
// I 20 id versionati di Claude Design mappano 1:1 sulla loro variante; i 6 layout LEGACY (P2/DE-207)
// mappano alla variante CD piu' vicina, cosi' un documento gia' pubblicato (che porta `centrato@1` &c)
// riceve comunque una pelle v2 invece di cadere. Lettura proto-safe (`Object.hasOwn`): un id come
// '__proto__' non risolve un membro di Object.prototype ma il fallback.
const LAYOUT_TO_VARIANT: Record<string, VariantName> = {
  // 20 varianti Claude Design (id `hero-<kebab>@1`).
  'hero-full@1': 'full',
  'hero-split@1': 'split',
  'hero-editorial@1': 'editorial',
  'hero-full-centrato@1': 'fullCentrato',
  'hero-split-inverso@1': 'splitInverso',
  'hero-banda@1': 'banda',
  'hero-copertina@1': 'copertina',
  'hero-duale@1': 'duale',
  'hero-carta-su-foto@1': 'cartaSuFoto',
  'hero-poster@1': 'poster',
  'hero-arco@1': 'arco',
  'hero-biglietto@1': 'biglietto',
  'hero-manifesto@1': 'manifesto',
  'hero-laterale@1': 'laterale',
  'hero-collage@1': 'collage',
  'hero-cornice@1': 'cornice',
  'hero-angolo@1': 'angolo',
  'hero-fasce@1': 'fasce',
  'hero-tipografico@1': 'tipografico',
  'hero-gazzetta@1': 'gazzetta',
  // 6 layout legacy (DE-207) -> variante CD piu' vicina (inclusione, non sostituzione).
  'centrato@1': 'fullCentrato',
  'centrato-foto@1': 'split',
  'immagine-piena@1': 'full',
  'split@1': 'split',
  'editoriale-illustrato@1': 'banda',
  'scena-scura@1': 'fullCentrato',
};

const FALLBACK_LAYOUT_ID = 'hero-full@1';
const FALLBACK_VARIANT: VariantName = 'full';

function variantFor(layoutId: string): VariantName {
  return Object.hasOwn(LAYOUT_TO_VARIANT, layoutId) ? LAYOUT_TO_VARIANT[layoutId] : FALLBACK_VARIANT;
}

/**
 * L'HERO — renderer UNICO delle 20 varianti Claude Design. Async (legge le etichette i18n). La
 * variante viene da `design.hero_layout_id`; il valore congelato finisce su `data-hero-layout` della
 * radice, che replica anche `aria-label`, `data-block-id`, `data-block-kind="hero"` (l'hero v2 rende
 * inline e non usa piu' `SiteSection`). La radice porta `site-hero-v2` (edge-to-edge in site.css); il
 * contenuto interno resta incolonnato dal container di ogni variante.
 */
export async function Hero({ block, locale, editable, design }: SiteBlockProps): Promise<ReactElement> {
  const label = await siteBlockLabel(block, locale);
  const t = await getTranslations({ locale, namespace: 'site' });

  const layoutId = design?.hero_layout_id ?? FALLBACK_LAYOUT_ID;
  const renderVariant = VARIANTS[variantFor(layoutId)];

  const ctx: HeroContext = {
    blockId: block.id,
    editable,
    // Fra i dati del brief l'hero rende SOLO business_name (AC-231-5): nessun altro campo di block.data.
    brand: block.data.business_name,
    eyebrow: block.content.hero_title_kicker,
    title: block.content.hero_title,
    subtitle: block.content.hero_subtitle,
    photoLabel: t('hero.photoLabel'),
    ctaPrimary: t('hero.ctaPrimary'),
    ctaSecondary: t('hero.ctaSecondary'),
    images: block.images,
  };

  return (
    <section
      aria-label={label}
      data-block-id={block.id}
      data-block-kind="hero"
      data-hero-layout={layoutId}
      className="site-hero-v2"
    >
      {renderVariant(ctx)}
    </section>
  );
}

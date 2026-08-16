// DV2-403 (macrotask body-sections-b, design-engine-v2) — BLOCCO CONTATTI v2: i recapiti + la mappa come
// RENDERER UNICO di 12 impaginati tradotti da Claude Design (components/contatti/Contatti.jsx). Il blocco
// consuma `block.section_layout_id` (DS-V2-D11, PER-BLOCCO), risolve la variante dal catalogo del dominio
// (`bodyLayoutFor`) e proietta `data-section-layout` sulla radice; il congelamento pieno lo scrive
// variety-select (DV2-503), qui senza id si cade sul fallback.
//
// SUPERFICIE DI RISCHIO (T-237/T-241, invariata): `phone`, `email`, `whatsapp` e i `social_links` sono
// TESTO LIBERO del brief da cui si costruiscono i LINK. NESSUN href nasce dal testo libero (AC-DV2-403,
// P2-D1): ogni link passa da un costruttore che valida il campo e sceglie lo schema dal CODICE
// (`safeTel/Mailto/Https/Whatsapp`). Un valore non valido NON produce alcun link — il recapito resta solo
// TESTO. Ogni valore visibile e' uno slot EDITABILE reso da React (escaping); l'href resta invariato.
//
// LA MAPPA e' un riquadro DECORATIVO di catalogo (`.site-photo-ph` tematico + un pin in accento), MAI una
// risorsa esterna (AC-DV2-403-3): porta le coordinate in `data-geo-*` e NESSUN attributo src/href, quindi
// un `geo` non puo' diventare una richiesta a un host di terzi. Colori SOLO var(--site-color-*).

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { SiteText } from '@/ui/site/SiteText';
import { siteBlockLabel } from '@/ui/site/labels';
import { bodyLayoutFor } from '@/domain/generation/section-layouts';
import { safeWhatsappHref } from '@/ui/site/blocks/whatsapp';
import { safeTelHref, safeMailtoHref, safeHttpsHref } from '@/ui/site/blocks/contact-links';
import { BODY_CARD_SHADOW, BODY_SECTION_PAD_Y, BodyContainer, BodyEyebrow } from '@/ui/site/blocks/body-kit';
import type { SiteBlockProps } from '@/ui/site/types';

/** I nomi delle 12 varianti di contatti (l'asse VISIBILE del catalogo, section-layouts.ts BODY_LAYOUTS). */
type ContactVariantName =
  | 'mappa'
  | 'mappa-piena'
  | 'tre-carte'
  | 'pannello-scuro'
  | 'centrale'
  | 'biglietto'
  | 'mappa-sinistra'
  | 'barra'
  | 'tipografico'
  | 'tabellone'
  | 'invito'
  | 'quartiere';

const FALLBACK_SECTION_LAYOUT_ID = 'contatti-mappa@1';
const FALLBACK_VARIANT: ContactVariantName = 'mappa';

const SECT_GAP = 'clamp(28px, 4vw, 48px)';

/** Le etichette UI (i18n, namespace 'site'): copy NOSTRA di catalogo, mai dal modello. */
type ContactLabels = {
  readonly address: string;
  readonly phone: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly social: string;
  readonly mapLabel: string;
};

/** Il contesto risolto passato a ogni variante: gli slot editabili, i recapiti e le etichette i18n. */
type ContactContext = {
  readonly blockId: string;
  readonly editable?: boolean;
  readonly label: string;
  readonly title?: string;
  readonly intro?: string;
  readonly address?: string;
  readonly phone?: string;
  readonly whatsapp?: string;
  readonly email?: string;
  readonly socials: readonly string[];
  readonly geo?: { readonly lat: number; readonly lng: number };
  readonly t: ContactLabels;
};

// ── helper condivisi ───────────────────────────────────────────────────────────────────────────────

/** Occhiello + titolo (contact_title) + intro (contact_intro), slot editabili. */
function Head({ ctx, align = 'left', onDark = false }: { ctx: ContactContext; align?: 'left' | 'center'; onDark?: boolean }): ReactElement {
  return (
    <div style={{ textAlign: align, maxWidth: align === 'center' ? 680 : undefined, marginInline: align === 'center' ? 'auto' : undefined }}>
      <BodyEyebrow label={ctx.label} onDark={onDark} />
      {ctx.title ? (
        <h2 style={{ margin: '12px 0 0', font: '500 var(--site-scale-2xl)/1.15 var(--site-font-display)', letterSpacing: '-0.01em', color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)' }}>
          <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.contact_title">
            {ctx.title}
          </SiteText>
        </h2>
      ) : null}
      {ctx.intro ? (
        <p style={{ margin: '14px 0 0', font: '400 var(--site-scale-lg)/1.6 var(--site-font-body)', color: onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-body)', maxWidth: '54ch' }}>
          <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.contact_intro">
            {ctx.intro}
          </SiteText>
        </p>
      ) : null}
    </div>
  );
}

/** Un valore editabile (slot dato), avvolto opzionalmente in un <a> con href SICURO (mai da testo libero). */
function ChannelValue({
  ctx,
  slot,
  value,
  href,
  onDark,
  style,
}: {
  ctx: ContactContext;
  slot: string;
  value: string;
  href: string | null;
  onDark?: boolean;
  style?: CSSProperties;
}): ReactElement {
  const text = (
    <SiteText editable={ctx.editable} block={ctx.blockId} slot={slot}>
      {value}
    </SiteText>
  );
  return href !== null ? (
    <a href={href} className="site-contact-v2__value" style={{ color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-accent)', ...style }}>
      {text}
    </a>
  ) : (
    <span className="site-contact-v2__value" style={{ color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)', ...style }}>
      {text}
    </span>
  );
}

/** Una RIGA etichettata (etichetta i18n + valore-canale). Ritorna null se il valore manca. */
function Field({
  ctx,
  kind,
  label,
  value,
  slot,
  href,
  onDark = false,
  first = false,
}: {
  ctx: ContactContext;
  kind: string;
  label: string;
  value: string | undefined;
  slot: string;
  href: string | null;
  onDark?: boolean;
  first?: boolean;
}): ReactElement | null {
  if (value === undefined || value.length === 0) return null;
  const line = onDark ? 'var(--site-color-on-dark-line)' : 'var(--site-color-line)';
  return (
    <div
      className={`site-contact-v2__field site-contact-v2__${kind}`}
      data-contact-field={kind}
      style={{ display: 'flex', gap: 16, alignItems: 'baseline', borderTop: first ? 'none' : `1px solid ${line}`, paddingTop: 14 }}
    >
      <span
        className="site-contact-v2__label"
        style={{ minWidth: 96, font: '600 var(--site-scale-sm)/1.2 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-eyebrow-color)' }}
      >
        {label}
      </span>
      <ChannelValue ctx={ctx} slot={slot} value={value} href={href} onDark={onDark} style={{ fontSize: 'var(--site-scale-base)' }} />
    </div>
  );
}

/** L'elenco etichettato di TUTTI i recapiti presenti (indirizzo/telefono/whatsapp/email) + i social. */
function Rows({ ctx, onDark = false }: { ctx: ContactContext; onDark?: boolean }): ReactElement {
  const fields = [
    { kind: 'address', label: ctx.t.address, value: ctx.address, slot: 'data.address', href: null as string | null },
    { kind: 'phone', label: ctx.t.phone, value: ctx.phone, slot: 'data.phone', href: safeTelHref(ctx.phone) },
    { kind: 'whatsapp', label: ctx.t.whatsapp, value: ctx.whatsapp, slot: 'data.whatsapp', href: safeWhatsappHref(ctx.whatsapp) },
    { kind: 'email', label: ctx.t.email, value: ctx.email, slot: 'data.email', href: safeMailtoHref(ctx.email) },
  ];
  const present = fields.filter((f) => f.value !== undefined && f.value.length > 0);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {present.map((f, i) => (
        <Field key={f.kind} ctx={ctx} kind={f.kind} label={f.label} value={f.value} slot={f.slot} href={f.href} onDark={onDark} first={i === 0} />
      ))}
      {ctx.socials.length > 0 ? (
        <div className="site-contact-v2__field site-contact-v2__social-row" data-contact-field="social" style={{ display: 'flex', gap: 16, alignItems: 'baseline', borderTop: present.length > 0 ? `1px solid ${onDark ? 'var(--site-color-on-dark-line)' : 'var(--site-color-line)'}` : 'none', paddingTop: 14 }}>
          <span className="site-contact-v2__label" style={{ minWidth: 96, font: '600 var(--site-scale-sm)/1.2 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-eyebrow-color)' }}>
            {ctx.t.social}
          </span>
          <SocialChips ctx={ctx} onDark={onDark} />
        </div>
      ) : null}
    </div>
  );
}

/** I social come chip a bordo, ognuno un <a https:> SICURO (safeHttpsHref) o solo testo se non valido. */
function SocialChips({ ctx, onDark = false }: { ctx: ContactContext; onDark?: boolean }): ReactElement {
  const chipStyle: CSSProperties = {
    font: '600 13px/1 var(--site-font-body)',
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-body)',
    border: `1px solid ${onDark ? 'var(--site-color-on-dark-line)' : 'var(--site-color-line-strong)'}`,
    borderRadius: 'var(--site-radius-sm)',
    padding: '8px 14px',
  };
  return (
    <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {ctx.socials.map((social, index) => {
        const href = safeHttpsHref(social);
        const text = (
          <SiteText editable={ctx.editable} block={ctx.blockId} slot={`data.social_links.${index}`}>
            {social}
          </SiteText>
        );
        return href !== null ? (
          <a key={index} href={href} className="site-contact-v2__social" style={chipStyle}>
            {text}
          </a>
        ) : (
          <span key={index} className="site-contact-v2__social" style={chipStyle}>
            {text}
          </span>
        );
      })}
    </span>
  );
}

/**
 * LA MAPPA come riquadro DECORATIVO di catalogo: il fondo tematico `.site-photo-ph` (ricolora col tema) +
 * un pin in accento. NESSUNA risorsa esterna (AC-DV2-403-3): le coordinate stanno in `data-geo-*` e non
 * c'e' alcun src/href. `role="img"` + aria-label dal catalogo i18n per l'accessibilita'.
 */
function MapBox({ ctx, ratio = '4 / 3.4', fill = false, style }: { ctx: ContactContext; ratio?: string; fill?: boolean; style?: CSSProperties }): ReactElement {
  return (
    <div
      className="site-contact-v2__map site-photo-ph"
      data-geo-lat={ctx.geo?.lat}
      data-geo-lng={ctx.geo?.lng}
      role="img"
      aria-label={ctx.t.mapLabel}
      style={fill ? { position: 'absolute', inset: 0, borderRadius: 0, ...style } : { aspectRatio: ratio, ...style }}
    >
      {/* Pin a goccia decorativo (aria-hidden): forma pura in accento, nessun testo, nessuna risorsa. */}
      <div aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50% 50% 50% 0', transform: 'rotate(45deg)', background: 'var(--site-color-accent)', boxShadow: BODY_CARD_SHADOW }} />
    </div>
  );
}

/** Un contenitore-carta chiaro riusato da piu' varianti. */
function Card({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactElement {
  return (
    <div style={{ background: 'var(--site-color-surface-card)', borderRadius: 'var(--site-radius-md)', boxShadow: BODY_CARD_SHADOW, padding: 'clamp(26px, 4vw, 44px)', border: '1px solid var(--site-color-line)', ...style }}>
      {children}
    </div>
  );
}

const TWO_COL: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
  gap: 'clamp(32px, 5vw, 64px)',
  alignItems: 'center',
};

// ── le 12 varianti ───────────────────────────────────────────────────────────────────────────────

const VARIANTS: Readonly<Record<ContactVariantName, (ctx: ContactContext) => ReactElement>> = {
  // 01 — righe etichettate + mappa a destra.
  mappa: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ ...TWO_COL }}>
        <div>
          <Head ctx={ctx} />
          <div style={{ marginTop: 26 }}><Rows ctx={ctx} /></div>
        </div>
        <MapBox ctx={ctx} />
      </BodyContainer>
    </div>
  ),

  // 02 — mappa full-bleed con carta dei recapiti sopra.
  'mappa-piena': (ctx) => (
    <div style={{ position: 'relative', background: 'var(--site-color-surface-alt)' }}>
      <MapBox ctx={ctx} fill />
      <BodyContainer style={{ position: 'relative', paddingBlock: BODY_SECTION_PAD_Y }}>
        <Card style={{ maxWidth: 520, borderTop: '6px solid var(--site-color-accent-2)' }}>
          <Head ctx={ctx} />
          <div style={{ marginTop: 22 }}><Rows ctx={ctx} /></div>
        </Card>
      </BodyContainer>
    </div>
  ),

  // 03 — tre carte: vieni, chiama, scrivi.
  'tre-carte': (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', borderTop: '1px solid var(--site-color-line)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: SECT_GAP, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 20 }}>
          {[
            { kind: 'address', label: ctx.t.address, value: ctx.address, slot: 'data.address', href: null as string | null },
            { kind: 'phone', label: ctx.t.phone, value: ctx.phone, slot: 'data.phone', href: safeTelHref(ctx.phone) },
            { kind: 'whatsapp', label: ctx.t.whatsapp, value: ctx.whatsapp, slot: 'data.whatsapp', href: safeWhatsappHref(ctx.whatsapp) },
          ]
            .filter((c) => c.value !== undefined && c.value.length > 0)
            .map((c) => (
              <div key={c.kind} className="site-contact-v2__field" data-contact-field={c.kind} style={{ background: 'var(--site-color-surface-card)', border: '1px solid var(--site-color-line)', borderRadius: 'var(--site-radius-md)', boxShadow: BODY_CARD_SHADOW, padding: '28px 26px', display: 'grid', gap: 14, textAlign: 'center', justifyItems: 'center' }}>
                <span className="site-contact-v2__label" style={{ font: '600 var(--site-scale-sm)/1 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: 'var(--site-color-eyebrow-color)' }}>{c.label}</span>
                <ChannelValue ctx={ctx} slot={c.slot} value={c.value as string} href={c.href} style={{ font: '500 21px/1.3 var(--site-font-display)', color: 'var(--site-color-text-heading)' }} />
              </div>
            ))}
        </div>
        <MapBox ctx={ctx} ratio="21 / 6" style={{ marginTop: 24 }} />
      </BodyContainer>
    </div>
  ),

  // 04 — pannello scuro + mappa piena a fianco.
  'pannello-scuro': (ctx) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))' }}>
      <div style={{ background: 'var(--site-color-surface-dark)', padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 64px)', display: 'grid', alignContent: 'center' }}>
        <Head ctx={ctx} onDark />
        <div style={{ marginTop: 24 }}><Rows ctx={ctx} onDark /></div>
      </div>
      <div style={{ position: 'relative', minHeight: 420 }}>
        <MapBox ctx={ctx} fill />
      </div>
    </div>
  ),

  // 05 — centrale: griglia di recapiti etichettati, mappa sotto.
  centrale: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} align="center" />
        <div style={{ marginTop: SECT_GAP, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '22px 32px', textAlign: 'center', borderTop: '1px solid var(--site-color-line-strong)', paddingTop: 26 }}>
          {[
            { kind: 'address', label: ctx.t.address, value: ctx.address, slot: 'data.address', href: null as string | null },
            { kind: 'phone', label: ctx.t.phone, value: ctx.phone, slot: 'data.phone', href: safeTelHref(ctx.phone) },
            { kind: 'whatsapp', label: ctx.t.whatsapp, value: ctx.whatsapp, slot: 'data.whatsapp', href: safeWhatsappHref(ctx.whatsapp) },
            { kind: 'email', label: ctx.t.email, value: ctx.email, slot: 'data.email', href: safeMailtoHref(ctx.email) },
          ]
            .filter((c) => c.value !== undefined && c.value.length > 0)
            .map((c) => (
              <div key={c.kind} className="site-contact-v2__field" data-contact-field={c.kind} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
                <span className="site-contact-v2__label" style={{ font: '600 var(--site-scale-sm)/1 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: 'var(--site-color-eyebrow-color)' }}>{c.label}</span>
                <ChannelValue ctx={ctx} slot={c.slot} value={c.value as string} href={c.href} style={{ font: '500 18px/1.4 var(--site-font-display)', color: 'var(--site-color-text-heading)' }} />
              </div>
            ))}
        </div>
        {ctx.socials.length > 0 ? <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}><SocialChips ctx={ctx} /></div> : null}
        <MapBox ctx={ctx} ratio="21 / 7" style={{ marginTop: 30 }} />
      </BodyContainer>
    </div>
  ),

  // 06 — biglietto da visita su mappa laterale.
  biglietto: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ ...TWO_COL }}>
        <div style={{ background: 'var(--site-color-surface-card)', border: '1px solid var(--site-color-line-strong)', borderRadius: 'var(--site-radius-sm)', padding: 'clamp(30px, 4vw, 52px)', boxShadow: BODY_CARD_SHADOW, textAlign: 'center' }}>
          <Head ctx={ctx} align="center" />
          <div style={{ margin: '18px auto 0', width: 54, borderTop: '3px solid var(--site-color-eyebrow-color)' }} />
          <div style={{ marginTop: 18, display: 'grid', gap: 8, font: '400 17px/1.6 var(--site-font-display)', color: 'var(--site-color-text-body)', justifyItems: 'center' }}>
            {ctx.address ? <ChannelValue ctx={ctx} slot="data.address" value={ctx.address} href={null} /> : null}
            {ctx.phone ? <ChannelValue ctx={ctx} slot="data.phone" value={ctx.phone} href={safeTelHref(ctx.phone)} /> : null}
            {ctx.email ? <ChannelValue ctx={ctx} slot="data.email" value={ctx.email} href={safeMailtoHref(ctx.email)} /> : null}
          </div>
          {ctx.socials.length > 0 ? <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}><SocialChips ctx={ctx} /></div> : null}
        </div>
        <MapBox ctx={ctx} ratio="4 / 3.6" />
      </BodyContainer>
    </div>
  ),

  // 07 — mappa a sinistra, recapiti a destra.
  'mappa-sinistra': (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ ...TWO_COL }}>
        <MapBox ctx={ctx} />
        <div>
          <Head ctx={ctx} />
          <div style={{ marginTop: 26 }}><Rows ctx={ctx} /></div>
        </div>
      </BodyContainer>
    </div>
  ),

  // 08 — barra recapiti scura + mappa a tutta larghezza.
  barra: (ctx) => (
    <div>
      <div style={{ background: 'var(--site-color-surface-dark)' }}>
        <BodyContainer style={{ paddingBlock: 'clamp(30px, 4vw, 48px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '20px 32px', alignItems: 'center' }}>
          <Head ctx={ctx} onDark />
          {[
            { kind: 'address', label: ctx.t.address, value: ctx.address, slot: 'data.address', href: null as string | null },
            { kind: 'phone', label: ctx.t.phone, value: ctx.phone, slot: 'data.phone', href: safeTelHref(ctx.phone) },
            { kind: 'whatsapp', label: ctx.t.whatsapp, value: ctx.whatsapp, slot: 'data.whatsapp', href: safeWhatsappHref(ctx.whatsapp) },
          ]
            .filter((c) => c.value !== undefined && c.value.length > 0)
            .map((c) => (
              <div key={c.kind} className="site-contact-v2__field" data-contact-field={c.kind} style={{ borderLeft: '1px solid var(--site-color-on-dark-line)', paddingLeft: 18 }}>
                <div className="site-contact-v2__label" style={{ font: '600 var(--site-scale-sm)/1 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: 'var(--site-color-eyebrow-on-dark)' }}>{c.label}</div>
                <ChannelValue ctx={ctx} slot={c.slot} value={c.value as string} href={c.href} onDark style={{ display: 'block', marginTop: 6, font: '500 17px/1.35 var(--site-font-display)', color: 'var(--site-color-on-dark)' }} />
              </div>
            ))}
        </BodyContainer>
      </div>
      <MapBox ctx={ctx} ratio="21 / 6" />
    </div>
  ),

  // 09 — tipografico: l'indirizzo come titolo gigante.
  tipografico: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <BodyEyebrow label={ctx.label} />
        {ctx.address ? (
          <div style={{ marginTop: 16, font: '500 clamp(34px, 5vw, 64px)/1.15 var(--site-font-display)', letterSpacing: '-0.015em', color: 'var(--site-color-text-heading)', maxWidth: '20ch' }}>
            <SiteText editable={ctx.editable} block={ctx.blockId} slot="data.address">
              {ctx.address}
            </SiteText>
          </div>
        ) : null}
        {ctx.intro ? (
          <p style={{ margin: '16px 0 0', font: '400 var(--site-scale-lg)/1.6 var(--site-font-body)', color: 'var(--site-color-text-body)', maxWidth: '50ch' }}>
            <SiteText editable={ctx.editable} block={ctx.blockId} slot="content.contact_intro">
              {ctx.intro}
            </SiteText>
          </p>
        ) : null}
        <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 'clamp(24px, 4vw, 56px)', alignItems: 'start' }}>
          <Rows ctx={ctx} />
          <MapBox ctx={ctx} ratio="16 / 8" />
        </div>
      </BodyContainer>
    </div>
  ),

  // 10 — tabellone: un box per ogni recapito.
  tabellone: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} />
        <div style={{ marginTop: SECT_GAP, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', border: '1px solid var(--site-color-line-strong)', borderRadius: 'var(--site-radius-sm)', overflow: 'hidden' }}>
          {[
            { kind: 'address', label: ctx.t.address, value: ctx.address, slot: 'data.address', href: null as string | null },
            { kind: 'phone', label: ctx.t.phone, value: ctx.phone, slot: 'data.phone', href: safeTelHref(ctx.phone) },
            { kind: 'whatsapp', label: ctx.t.whatsapp, value: ctx.whatsapp, slot: 'data.whatsapp', href: safeWhatsappHref(ctx.whatsapp) },
            { kind: 'email', label: ctx.t.email, value: ctx.email, slot: 'data.email', href: safeMailtoHref(ctx.email) },
          ]
            .filter((c) => c.value !== undefined && c.value.length > 0)
            .map((c, i) => (
              <div key={c.kind} className="site-contact-v2__field" data-contact-field={c.kind} style={{ background: i % 2 ? 'var(--site-color-surface-card)' : 'var(--site-color-surface-page)', padding: '26px 22px', borderLeft: i === 0 ? 'none' : '1px solid var(--site-color-line)' }}>
                <div className="site-contact-v2__label" style={{ font: '600 var(--site-scale-sm)/1 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: 'var(--site-color-eyebrow-color)' }}>{c.label}</div>
                <ChannelValue ctx={ctx} slot={c.slot} value={c.value as string} href={c.href} style={{ display: 'block', marginTop: 10, font: '500 18px/1.4 var(--site-font-display)', color: 'var(--site-color-text-heading)', overflowWrap: 'anywhere' }} />
              </div>
            ))}
        </div>
        {ctx.socials.length > 0 ? <div style={{ marginTop: 20 }}><SocialChips ctx={ctx} /></div> : null}
        <MapBox ctx={ctx} ratio="21 / 6" style={{ marginTop: 24 }} />
      </BodyContainer>
    </div>
  ),

  // 11 — invito: il WhatsApp al centro della scena, su banda scura.
  invito: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer style={{ maxWidth: 760, textAlign: 'center' }}>
        <Head ctx={ctx} align="center" onDark />
        <div style={{ marginTop: 28, display: 'grid', justifyItems: 'center', gap: 12 }}>
          {ctx.whatsapp ? (
            <ChannelValue ctx={ctx} slot="data.whatsapp" value={ctx.whatsapp} href={safeWhatsappHref(ctx.whatsapp)} onDark style={{ font: '500 clamp(26px, 4vw, 44px)/1.1 var(--site-font-display)', color: 'var(--site-color-eyebrow-on-dark)' }} />
          ) : null}
          {ctx.phone ? (
            <span style={{ font: 'italic 16px var(--site-font-display)', color: 'var(--site-color-on-dark-70)' }}>
              <ChannelValue ctx={ctx} slot="data.phone" value={ctx.phone} href={safeTelHref(ctx.phone)} onDark style={{ color: 'var(--site-color-on-dark-70)' }} />
            </span>
          ) : null}
        </div>
        <div style={{ marginTop: 32, borderTop: '1px solid var(--site-color-on-dark-line)', paddingTop: 22, display: 'flex', justifyContent: 'center', gap: '12px 30px', flexWrap: 'wrap' }}>
          {ctx.address ? <ChannelValue ctx={ctx} slot="data.address" value={ctx.address} href={null} onDark style={{ color: 'var(--site-color-on-dark-70)' }} /> : null}
          {ctx.email ? <ChannelValue ctx={ctx} slot="data.email" value={ctx.email} href={safeMailtoHref(ctx.email)} onDark style={{ color: 'var(--site-color-on-dark-70)' }} /> : null}
        </div>
        {ctx.socials.length > 0 ? <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}><SocialChips ctx={ctx} onDark /></div> : null}
      </BodyContainer>
    </div>
  ),

  // 12 — quartiere: mappa grande protagonista, recapiti in card a fianco.
  quartiere: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', paddingBlock: BODY_SECTION_PAD_Y }}>
      <BodyContainer>
        <Head ctx={ctx} />
        <div style={{ marginTop: SECT_GAP, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 2fr) minmax(min(100%, 260px), 1fr))', gap: 20, alignItems: 'start' }}>
          <MapBox ctx={ctx} ratio="16 / 9" />
          <div style={{ display: 'grid', gap: 14, alignContent: 'center', background: 'var(--site-color-surface-alt)', border: '1px solid var(--site-color-line)', borderRadius: 'var(--site-radius-md)', padding: '26px 24px' }}>
            <Rows ctx={ctx} />
          </div>
        </div>
      </BodyContainer>
    </div>
  ),
};

/** Risolve il nome-variante dal `section_layout_id` per-blocco: catalogo del dominio, proto-safe, fallback. */
function variantFor(sectionLayoutId: string | undefined): ContactVariantName {
  if (sectionLayoutId === undefined) return FALLBACK_VARIANT;
  const variant = bodyLayoutFor(sectionLayoutId)?.variant;
  return variant !== undefined && Object.hasOwn(VARIANTS, variant)
    ? (variant as ContactVariantName)
    : FALLBACK_VARIANT;
}

export async function Contatti({ block, locale, editable }: SiteBlockProps): Promise<ReactElement> {
  const label = await siteBlockLabel(block, locale);
  const t = await getTranslations({ locale, namespace: 'site' });
  const sectionLayoutId = block.section_layout_id ?? FALLBACK_SECTION_LAYOUT_ID;
  const variantName = variantFor(block.section_layout_id);

  const ctx: ContactContext = {
    blockId: block.id,
    editable,
    label,
    title: block.content.contact_title,
    intro: block.content.contact_intro,
    address: block.data.address,
    phone: block.data.phone,
    whatsapp: block.data.whatsapp,
    email: block.data.email,
    socials: block.data.social_links ?? [],
    geo: block.data.geo,
    t: {
      address: t('contact.address'),
      phone: t('contact.phone'),
      whatsapp: t('contact.whatsapp'),
      email: t('contact.email'),
      social: t('contact.social'),
      mapLabel: t('contact.mapLabel'),
    },
  };

  return (
    <section
      aria-label={label}
      data-block-id={block.id}
      data-block-kind={block.id}
      data-section-layout={sectionLayoutId}
      className="site-contact-v2"
    >
      {VARIANTS[variantName](ctx)}
    </section>
  );
}

// DV2-404 (macrotask body-sections-b, design-engine-v2) — IL PIE' DI PAGINA (footer) come CHROME del
// SiteView. RENDERER UNICO di 6 pie' tradotti da Claude Design (components/chrome/Footer.jsx). NON e' un
// blocco del documento: e' reso ATTORNO alle pagine (DS-V2-D11 #4), coi contenuti DERIVATI dal documento
// (deriveChromeData): nome del locale, recapiti, orari sintetici, navigazione. Nessuno slot LLM.
//
// DETERMINISMO: a differenza del Footer di Claude Design, QUI NON si usa `new Date().getFullYear()` — la
// chrome deve restare deterministica come il documento. Il credito e' una riga NEUTRA (copy i18n +
// nome del locale), senza anno. Il badge di pubblicazione (P4-D5) resta FUORI da qui (fratello di <main>):
// il footer non introduce nuovi vincoli di pubblicazione.
//
// SICUREZZA: valori come figli di React (escaping); href SOLO dai costruttori validati gia' derivati
// (tel/mailto/https-whatsapp) o dagli anchor di slug; colori SOLO var(--site-color-*), nessun letterale;
// nessuna iniezione di HTML grezzo (AC-231-4).

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { chromeLayoutFor } from '@/domain/generation/section-layouts';
import { BodyContainer } from '@/ui/site/blocks/body-kit';
import type { ChromeData } from '@/ui/site/chrome/derive';

/** I nomi delle 6 varianti di footer (l'asse VISIBILE del catalogo CHROME_LAYOUTS). */
type FooterVariantName = 'classico' | 'chiaro' | 'centrato' | 'massiccio' | 'minimale' | 'orari-evidenza';

const FALLBACK_VARIANT: FooterVariantName = 'classico';

/** Le intestazioni di colonna + il credito neutro (i18n, namespace 'site'). */
export type ChromeFooterLabels = {
  readonly contacts: string;
  readonly hours: string;
  readonly nav: string;
  readonly credit: string;
};

type FooterContext = {
  readonly data: ChromeData;
  readonly labels: ChromeFooterLabels;
};

// ── helper condivisi ───────────────────────────────────────────────────────────────────────────────

function textColor(onDark: boolean): string {
  return onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-body)';
}
function linkColor(onDark: boolean): string {
  return onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)';
}

function Eyebrow({ children, onDark }: { children: ReactNode; onDark: boolean }): ReactElement {
  return (
    <div style={{ font: '600 var(--site-scale-sm)/1.2 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-eyebrow-color)' }}>
      {children}
    </div>
  );
}

function Col({ heading, children, onDark }: { heading: string; children: ReactNode; onDark: boolean }): ReactElement {
  return (
    <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
      <Eyebrow onDark={onDark}>{heading}</Eyebrow>
      {children}
    </div>
  );
}

function Contacts({ data, onDark }: { data: ChromeData; onDark: boolean }): ReactElement {
  const line: CSSProperties = { font: '15px/1.5 var(--site-font-body)', color: textColor(onDark) };
  const link: CSSProperties = { ...line, color: linkColor(onDark), textDecoration: 'none' };
  return (
    <>
      {data.address !== null ? <span className="site-footer-v2__contact" style={line}>{data.address}</span> : null}
      {data.phone !== null ? (
        data.telHref !== null ? <a className="site-footer-v2__contact" href={data.telHref} style={link}>{data.phone}</a> : <span className="site-footer-v2__contact" style={line}>{data.phone}</span>
      ) : null}
      {data.whatsapp !== null ? (
        data.whatsappHref !== null ? <a className="site-footer-v2__contact" href={data.whatsappHref} style={{ ...link, color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-accent-2-deep)' }}>{data.whatsapp}</a> : <span className="site-footer-v2__contact" style={line}>{data.whatsapp}</span>
      ) : null}
      {data.email !== null ? (
        data.mailHref !== null ? <a className="site-footer-v2__contact" href={data.mailHref} style={link}>{data.email}</a> : <span className="site-footer-v2__contact" style={line}>{data.email}</span>
      ) : null}
    </>
  );
}

function Hours({ data, onDark }: { data: ChromeData; onDark: boolean }): ReactElement {
  const line: CSSProperties = { font: '15px/1.5 var(--site-font-body)', color: textColor(onDark) };
  return (
    <>
      {data.hours.map((h) => (
        <div key={h.label} className="site-footer-v2__hours-row" style={{ display: 'flex', gap: 12, ...line }}>
          <span style={{ minWidth: 74, color: linkColor(onDark) }}>{h.label}</span>
          <span>{h.value}</span>
        </div>
      ))}
    </>
  );
}

function NavLinks({ data, onDark, row = false }: { data: ChromeData; onDark: boolean; row?: boolean }): ReactElement {
  const link: CSSProperties = { font: '15px/1.5 var(--site-font-body)', color: linkColor(onDark), textDecoration: 'none' };
  const links = data.nav.map((item) => (
    <a key={item.href} href={item.href} className="site-footer-v2__navlink" style={link}>
      {item.label}
    </a>
  ));
  return row ? <nav style={{ display: 'flex', gap: 'clamp(16px, 2vw, 28px)', flexWrap: 'wrap' }}>{links}</nav> : <>{links}</>;
}

/** Il credito NEUTRO: nome del locale + copy i18n, SENZA anno (nessun new Date, determinismo). */
function Legal({ ctx, onDark, style }: { ctx: FooterContext; onDark: boolean; style?: CSSProperties }): ReactElement {
  return (
    <div className="site-footer-v2__legal" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between', font: '13px var(--site-font-body)', color: textColor(onDark), ...style }}>
      <span>{ctx.data.businessName !== null ? `${ctx.data.businessName} · ${ctx.labels.credit}` : ctx.labels.credit}</span>
    </div>
  );
}

function BrandBlock({ data, onDark, size = 26 }: { data: ChromeData; onDark: boolean; size?: number }): ReactElement {
  return (
    <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
      <div className="site-footer-v2__brand" style={{ font: `600 ${size}px/1.1 var(--site-font-display)`, color: linkColor(onDark) }}>
        {data.businessName}
      </div>
    </div>
  );
}

const COLS: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px 48px' };
const TOP_LINE = (onDark: boolean): string => (onDark ? '1px solid var(--site-color-on-dark-line)' : '1px solid var(--site-color-line)');

// ── le 6 varianti ────────────────────────────────────────────────────────────────────────────────

const VARIANTS: Readonly<Record<FooterVariantName, (ctx: FooterContext) => ReactElement>> = {
  // 01 — classico scuro a 4 colonne.
  classico: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)', borderTop: '3px solid var(--site-color-eyebrow-color)' }}>
      <BodyContainer style={{ paddingTop: 56, paddingBottom: 40 }}>
        <div style={{ ...COLS }}>
          <BrandBlock data={ctx.data} onDark />
          <Col heading={ctx.labels.contacts} onDark><Contacts data={ctx.data} onDark /></Col>
          <Col heading={ctx.labels.hours} onDark><Hours data={ctx.data} onDark /></Col>
          <Col heading={ctx.labels.nav} onDark><NavLinks data={ctx.data} onDark /></Col>
        </div>
        <Legal ctx={ctx} onDark style={{ marginTop: 48, paddingTop: 20, borderTop: TOP_LINE(true) }} />
      </BodyContainer>
    </div>
  ),

  // 02 — chiaro su fondo alternato a 4 colonne.
  chiaro: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-alt)', borderTop: '1px solid var(--site-color-line-strong)' }}>
      <BodyContainer style={{ paddingTop: 52, paddingBottom: 36 }}>
        <div style={{ ...COLS }}>
          <BrandBlock data={ctx.data} onDark={false} />
          <Col heading={ctx.labels.contacts} onDark={false}><Contacts data={ctx.data} onDark={false} /></Col>
          <Col heading={ctx.labels.hours} onDark={false}><Hours data={ctx.data} onDark={false} /></Col>
          <Col heading={ctx.labels.nav} onDark={false}><NavLinks data={ctx.data} onDark={false} /></Col>
        </div>
        <Legal ctx={ctx} onDark={false} style={{ marginTop: 44, paddingTop: 18, borderTop: TOP_LINE(false) }} />
      </BodyContainer>
    </div>
  ),

  // 03 — centrato in pila.
  centrato: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)' }}>
      <BodyContainer style={{ paddingTop: 56, paddingBottom: 36, textAlign: 'center', display: 'grid', gap: 22, justifyItems: 'center' }}>
        <div className="site-footer-v2__brand" style={{ font: '600 30px/1.1 var(--site-font-display)', color: 'var(--site-color-on-dark)' }}>{ctx.data.businessName}</div>
        <NavLinks data={ctx.data} onDark row />
        <div style={{ display: 'flex', gap: '12px 28px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Contacts data={ctx.data} onDark />
        </div>
        <Legal ctx={ctx} onDark style={{ width: '100%', marginTop: 14, paddingTop: 18, borderTop: TOP_LINE(true), justifyContent: 'center', gap: 24 }} />
      </BodyContainer>
    </div>
  ),

  // 04 — massiccio: nome gigante sopra le colonne.
  massiccio: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)' }}>
      <BodyContainer style={{ paddingTop: 56, paddingBottom: 36 }}>
        <div className="site-footer-v2__brand" style={{ font: '600 clamp(44px, 7vw, 92px)/1 var(--site-font-display)', letterSpacing: '-0.02em', color: 'var(--site-color-on-dark)', borderBottom: TOP_LINE(true), paddingBottom: 28 }}>
          {ctx.data.businessName}
        </div>
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px 44px' }}>
          <Col heading={ctx.labels.contacts} onDark><Contacts data={ctx.data} onDark /></Col>
          <Col heading={ctx.labels.hours} onDark><Hours data={ctx.data} onDark /></Col>
          <Col heading={ctx.labels.nav} onDark><NavLinks data={ctx.data} onDark /></Col>
        </div>
        <Legal ctx={ctx} onDark style={{ marginTop: 40, paddingTop: 18, borderTop: TOP_LINE(true) }} />
      </BodyContainer>
    </div>
  ),

  // 05 — minimale a una riga.
  minimale: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', borderTop: '1px solid var(--site-color-line-strong)' }}>
      <BodyContainer style={{ paddingBlock: 26, display: 'flex', gap: '14px 32px', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span className="site-footer-v2__brand" style={{ font: '600 19px/1 var(--site-font-display)', color: 'var(--site-color-text-heading)' }}>{ctx.data.businessName}</span>
        {ctx.data.address !== null ? <span style={{ font: '15px/1.5 var(--site-font-body)', color: 'var(--site-color-text-body)' }}>{ctx.data.address}</span> : null}
        <NavLinks data={ctx.data} onDark={false} row />
        <span style={{ marginLeft: 'auto', font: '13px var(--site-font-body)', color: 'var(--site-color-text-muted)' }}>{ctx.labels.credit}</span>
      </BodyContainer>
    </div>
  ),

  // 06 — orari in evidenza a sinistra, resto a destra.
  'orari-evidenza': (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)' }}>
      <BodyContainer style={{ paddingTop: 52, paddingBottom: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '36px 56px' }}>
        <div style={{ borderLeft: '3px solid var(--site-color-eyebrow-color)', paddingLeft: 24, display: 'grid', gap: 12, alignContent: 'start' }}>
          <Eyebrow onDark>{ctx.labels.hours}</Eyebrow>
          {ctx.data.hours.map((h) => (
            <div key={h.label} className="site-footer-v2__hours-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: TOP_LINE(true), paddingBottom: 10 }}>
              <span style={{ font: '600 18px var(--site-font-display)', color: 'var(--site-color-on-dark)' }}>{h.label}</span>
              <span style={{ font: '15px/1.5 var(--site-font-body)', color: textColor(true) }}>{h.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
          <BrandBlock data={ctx.data} onDark />
          <div style={{ display: 'grid', gap: 8 }}><Contacts data={ctx.data} onDark /></div>
          <NavLinks data={ctx.data} onDark row />
          <Legal ctx={ctx} onDark style={{ paddingTop: 16, borderTop: TOP_LINE(true) }} />
        </div>
      </BodyContainer>
    </div>
  ),
};

function variantFor(layoutId: string): FooterVariantName {
  const variant = chromeLayoutFor(layoutId)?.variant;
  return variant !== undefined && Object.hasOwn(VARIANTS, variant)
    ? (variant as FooterVariantName)
    : FALLBACK_VARIANT;
}

/**
 * Il pie' di pagina del sito, reso dal SiteView ATTORNO alle pagine. `layoutId` sceglie la variante di
 * catalogo (fallback 'classico'); proietta `data-footer-layout` sulla radice <footer>.
 */
export function SiteFooter({ data, layoutId, labels }: { data: ChromeData; layoutId: string; labels: ChromeFooterLabels }): ReactElement {
  const variantName = variantFor(layoutId);
  return (
    <footer className="site-footer-v2" data-footer-layout={layoutId}>
      {VARIANTS[variantName]({ data, labels })}
    </footer>
  );
}

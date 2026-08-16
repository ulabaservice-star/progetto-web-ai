// DV2-404 (macrotask body-sections-b, design-engine-v2) — LA TESTATA (header) come CHROME del SiteView.
// RENDERER UNICO di 6 testate tradotte da Claude Design (components/chrome/Header.jsx). NON e' un blocco
// del documento: e' resa ATTORNO alle pagine (DS-V2-D11 #4), coi contenuti DERIVATI dal documento
// (deriveChromeData): il nome del locale, la navigazione (dalle pagine), la CTA. Nessuno slot LLM.
//
// SICUREZZA: i valori sono figli di React (escaping); nessun href nasce dal testo libero (AC-DV2-404-3) —
// gli anchor di nav usano lo SLUG di pagina (gia' vincolato), la CTA usa un href SICURO gia' derivato
// (WhatsApp validato o anchor alla pagina contatti). Colori SOLO var(--site-color-*), nessun letterale;
// nessuna iniezione di HTML grezzo (AC-231-4).

import type { CSSProperties, ReactElement } from 'react';
import { chromeLayoutFor } from '@/domain/generation/section-layouts';
import { Button } from '@/ui/site/primitives';
import { BodyContainer } from '@/ui/site/blocks/body-kit';
import type { ChromeData, ChromeNavItem } from '@/ui/site/chrome/derive';

/** I nomi delle 6 varianti di testata (l'asse VISIBILE del catalogo CHROME_LAYOUTS). */
type HeaderVariantName = 'classico' | 'centrato' | 'scuro' | 'minimale' | 'bandiera' | 'impilato';

const FALLBACK_VARIANT: HeaderVariantName = 'classico';

/** La CTA della testata, gia' assemblata (etichetta i18n + href SICURO). null = nessuna CTA. */
export type ChromeCta = { readonly label: string; readonly href: string };

type HeaderContext = {
  readonly data: ChromeData;
  readonly cta: ChromeCta | null;
};

// ── helper condivisi ───────────────────────────────────────────────────────────────────────────────

function homeHref(nav: readonly ChromeNavItem[]): string {
  return nav[0]?.href ?? '#';
}

function Brand({ name, href, onDark = false, size = 24 }: { name: string | null; href: string; onDark?: boolean; size?: number }): ReactElement | null {
  if (name === null) return null;
  return (
    <a href={href} className="site-chrome-v2__brand" style={{ font: `600 ${size}px/1 var(--site-font-display)`, letterSpacing: '-0.01em', color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)', textDecoration: 'none' }}>
      {name}
    </a>
  );
}

function Nav({ items, onDark = false, style }: { items: readonly ChromeNavItem[]; onDark?: boolean; style?: CSSProperties }): ReactElement | null {
  if (items.length === 0) return null;
  return (
    <nav className="site-chrome-v2__nav" style={{ display: 'flex', gap: 'clamp(16px, 2vw, 28px)', flexWrap: 'wrap', alignItems: 'center', ...style }}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="site-chrome-v2__navlink"
          style={{ font: '600 13px/1 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-body)', textDecoration: 'none' }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function Cta({ cta, variant = 'solid' }: { cta: ChromeCta | null; variant?: 'solid' | 'gold' | 'outline' | 'onDark' }): ReactElement | null {
  if (cta === null) return null;
  return <Button label={cta.label} href={cta.href} variant={variant} style={{ padding: '12px 22px' }} />;
}

// ── le 6 varianti ────────────────────────────────────────────────────────────────────────────────

const VARIANTS: Readonly<Record<HeaderVariantName, (ctx: HeaderContext) => ReactElement>> = {
  // 01 — classico: filo accent in testa, brand + nav + CTA.
  classico: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', borderTop: '3px solid var(--site-color-eyebrow-color)', borderBottom: '1px solid var(--site-color-line)' }}>
      <BodyContainer style={{ display: 'flex', alignItems: 'center', gap: 'clamp(20px, 3vw, 40px)', flexWrap: 'wrap', paddingBlock: 14 }}>
        <Brand name={ctx.data.businessName} href={homeHref(ctx.data.nav)} />
        <Nav items={ctx.data.nav} style={{ marginLeft: 'auto' }} />
        <Cta cta={ctx.cta} />
      </BodyContainer>
    </div>
  ),

  // 02 — centrato: nome al centro, nav e CTA sotto.
  centrato: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', borderBottom: '1px solid var(--site-color-line)' }}>
      <BodyContainer style={{ textAlign: 'center', paddingBlock: 20, display: 'grid', gap: 14, justifyItems: 'center' }}>
        <Brand name={ctx.data.businessName} href={homeHref(ctx.data.nav)} size={28} />
        <div style={{ display: 'flex', gap: 'clamp(16px, 3vw, 32px)', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          <Nav items={ctx.data.nav} style={{ justifyContent: 'center' }} />
          <Cta cta={ctx.cta} variant="outline" />
        </div>
      </BodyContainer>
    </div>
  ),

  // 03 — scuro: banda scura, nav chiara, CTA oro.
  scuro: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-dark)', borderBottom: '1px solid var(--site-color-on-dark-line)' }}>
      <BodyContainer style={{ display: 'flex', alignItems: 'center', gap: 'clamp(20px, 3vw, 40px)', flexWrap: 'wrap', paddingBlock: 16 }}>
        <Brand name={ctx.data.businessName} href={homeHref(ctx.data.nav)} onDark />
        <Nav items={ctx.data.nav} onDark style={{ marginLeft: 'auto' }} />
        <Cta cta={ctx.cta} variant="gold" />
      </BodyContainer>
    </div>
  ),

  // 04 — minimale: brand + nav + link CTA in accento, senza bottone.
  minimale: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)' }}>
      <BodyContainer style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(20px, 3vw, 40px)', flexWrap: 'wrap', paddingBlock: 22 }}>
        <Brand name={ctx.data.businessName} href={homeHref(ctx.data.nav)} size={22} />
        <Nav items={ctx.data.nav} style={{ marginLeft: 'auto' }} />
        {ctx.cta !== null ? (
          <a href={ctx.cta.href} className="site-chrome-v2__navlink" style={{ font: '600 13px/1 var(--site-font-body)', letterSpacing: 'var(--site-tracking-label)', textTransform: 'uppercase', color: 'var(--site-color-accent)', textDecoration: 'none' }}>
            {ctx.cta.label}
          </a>
        ) : null}
      </BodyContainer>
    </div>
  ),

  // 05 — bandiera: blocco accent col nome, nav e CTA a fianco.
  bandiera: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', borderBottom: '1px solid var(--site-color-line)', display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
      <div style={{ background: 'var(--site-color-accent)', padding: '18px clamp(20px, 3vw, 40px)', display: 'grid', alignContent: 'center' }}>
        <span className="site-chrome-v2__brand" style={{ font: '600 22px/1 var(--site-font-display)', color: 'var(--site-color-accent-contrast)' }}>
          {ctx.data.businessName}
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'clamp(20px, 3vw, 40px)', flexWrap: 'wrap', padding: '14px clamp(20px, 5vw, 64px)' }}>
        <Nav items={ctx.data.nav} />
        <span style={{ marginLeft: 'auto' }}>
          <Cta cta={ctx.cta} />
        </span>
      </div>
    </div>
  ),

  // 06 — impilato: nome grande centrato, nav sotto a filo.
  impilato: (ctx) => (
    <div style={{ background: 'var(--site-color-surface-page)', borderBottom: '1px solid var(--site-color-line)' }}>
      <BodyContainer style={{ textAlign: 'center', paddingTop: 26 }}>
        <Brand name={ctx.data.businessName} href={homeHref(ctx.data.nav)} size={38} />
        <div style={{ marginTop: 20, borderTop: '1px solid var(--site-color-line)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(16px, 3vw, 32px)', flexWrap: 'wrap', paddingBlock: 14 }}>
          <Nav items={ctx.data.nav} style={{ justifyContent: 'center' }} />
          <Cta cta={ctx.cta} variant="outline" />
        </div>
      </BodyContainer>
    </div>
  ),
};

function variantFor(layoutId: string): HeaderVariantName {
  const variant = chromeLayoutFor(layoutId)?.variant;
  return variant !== undefined && Object.hasOwn(VARIANTS, variant)
    ? (variant as HeaderVariantName)
    : FALLBACK_VARIANT;
}

/**
 * La testata del sito, resa dal SiteView ATTORNO alle pagine. `layoutId` sceglie la variante di catalogo
 * (fallback 'classico'); proietta `data-header-layout` sulla radice <header>.
 */
export function SiteHeader({ data, layoutId, cta }: { data: ChromeData; layoutId: string; cta: ChromeCta | null }): ReactElement {
  const variantName = variantFor(layoutId);
  return (
    <header className="site-header-v2" data-header-layout={layoutId}>
      {VARIANTS[variantName]({ data, cta })}
    </header>
  );
}

// DV2-104 (macrotask `foundation`, design-engine-v2) — I PRIMITIVI CONDIVISI dei blocchi v2, tradotti
// dai componenti core di Claude Design (components/core/Button, SectionHead; components/media/Photo).
// Vivono in src/ui/site: consumano SOLO i token proiettati da theme-style come var(--site-color-*) /
// var(--site-font-*) — nessun colore letterale (AC-231-4). Il testo passa da slot ed è reso da React
// (escaping automatico); nessuna iniezione di HTML grezzo. Le foto sono PhotoPlaceholder di catalogo
// (DS-V2-D3): mai un <img> a risorsa esterna. I token colore di Claude Design (var(--accent), ...) sono
// mappati sui nostri (var(--site-color-accent), ...): stessi ruoli, stesso vocabolario semantico.

import type { CSSProperties } from 'react';

// ── Button ───────────────────────────────────────────────────────────────────
export type ButtonVariant = 'solid' | 'outline' | 'gold' | 'onDark' | 'green';

const BUTTON_VARIANTS: Readonly<Record<ButtonVariant, CSSProperties>> = {
  solid: {
    background: 'var(--site-color-accent)',
    color: 'var(--site-color-accent-contrast)',
    border: '1px solid transparent',
  },
  outline: {
    background: 'transparent',
    color: 'var(--site-color-text-heading)',
    border: '1px solid var(--site-color-line-strong)',
  },
  gold: {
    background: 'var(--site-color-eyebrow-on-dark)',
    color: 'var(--site-color-surface-dark)',
    border: '1px solid transparent',
  },
  onDark: {
    background: 'transparent',
    color: 'var(--site-color-on-dark)',
    border: '1px solid var(--site-color-on-dark-line)',
  },
  green: {
    background: 'var(--site-color-accent-2)',
    color: 'var(--site-color-accent-2-contrast)',
    border: '1px solid transparent',
  },
};

export type ButtonProps = {
  readonly label: string;
  readonly href?: string;
  readonly variant?: ButtonVariant;
  readonly style?: CSSProperties;
};

/** CTA a token. `label` è reso da React (escaping); `href` è una prop del chiamante (mai derivata dal testo). */
export function Button({ label, href = '#', variant = 'solid', style }: ButtonProps) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        font: '600 13px/1 var(--site-font-body)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '15px 28px',
        borderRadius: 'var(--site-radius-sm)',
        whiteSpace: 'nowrap',
        ...BUTTON_VARIANTS[variant],
        ...style,
      }}
    >
      {label}
    </a>
  );
}

// ── SectionHead ──────────────────────────────────────────────────────────────
export type SectionHeadProps = {
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
  readonly align?: 'left' | 'center';
  readonly onDark?: boolean;
  readonly style?: CSSProperties;
};

/** Occhiello + titolo display + intro, slot editabili resi da React. Colori dai token del tema. */
export function SectionHead({
  eyebrow,
  title,
  intro,
  align = 'left',
  onDark = false,
  style,
}: SectionHeadProps) {
  const centered = align === 'center';
  return (
    <div
      style={{
        maxWidth: centered ? 640 : 720,
        margin: centered ? '0 auto' : undefined,
        textAlign: centered ? 'center' : 'left',
        ...style,
      }}
    >
      {eyebrow ? (
        <div
          style={{
            font: '600 var(--site-scale-sm)/1.2 var(--site-font-body)',
            letterSpacing: 'var(--site-tracking-label)',
            textTransform: 'uppercase',
            color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-eyebrow-color)',
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <h2
        style={{
          margin: '12px 0 0',
          font: '500 var(--site-scale-2xl)/1.15 var(--site-font-display)',
          letterSpacing: '-0.01em',
          color: onDark ? 'var(--site-color-on-dark)' : 'var(--site-color-text-heading)',
        }}
      >
        {title}
      </h2>
      {intro ? (
        <p
          style={{
            margin: '14px 0 0',
            fontSize: 'var(--site-scale-lg)',
            color: onDark ? 'var(--site-color-on-dark-70)' : 'var(--site-color-text-body)',
          }}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}

// ── PhotoPlaceholder ─────────────────────────────────────────────────────────
export type PhotoPlaceholderProps = {
  /** L'etichetta del box (resa come "FOTO · <label>"). Testo di catalogo, reso da React. */
  readonly label?: string;
  readonly dark?: boolean;
  /** aspect-ratio CSS (es. "16 / 9"); di default lo dà .site-photo-ph. */
  readonly ratio?: string;
  readonly radius?: string;
  readonly style?: CSSProperties;
};

/**
 * Il placeholder tipografico di Claude Design (DS-V2-D3): un box che si ricolora da solo con la palette
 * del tema (classe .site-photo-ph in site.css). MAI un <img>/risorsa esterna: le foto reali sono P4-D7/F.
 */
export function PhotoPlaceholder({ label = 'FOTO', dark = false, ratio, radius, style }: PhotoPlaceholderProps) {
  return (
    <div
      className={dark ? 'site-photo-ph site-photo-ph--dark' : 'site-photo-ph'}
      style={{
        borderRadius: radius ?? 'var(--site-radius-md)',
        ...(ratio ? { aspectRatio: ratio } : null),
        ...style,
      }}
    >
      <span>{`FOTO · ${label}`}</span>
    </div>
  );
}

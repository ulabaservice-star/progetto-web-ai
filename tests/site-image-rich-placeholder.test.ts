// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assetPublicUrl } from '@/config/storage';
import type { ImageSlot } from '@/domain/generation/document';
import { SiteImage } from '@/ui/site/SiteImage';

// DE-104 (macrotask visual-skin) — ORACOLO del PLACEHOLDER RICCO dello slot immagine. Le
// asserzioni DERIVANO da AC-DE-104-1/2 (blueprint 01-visual-skin), taggate `// covers:` sulla
// riga dell'EXPECT.
//
// PROVA COSA: (104-1) un hero senza asset caricato non e' una scatola grigia — l'elemento
// placeholder porta il trattamento ricco (classe `site-image--placeholder`) e resta decorativo
// (aria-hidden, nessun <img>); il trattamento vive in site.css come background/gradiente derivato
// da var(--site-color-*) (NO letterali). (104-2) il branch `uploaded` (P4) NON regredisce: un
// asset presente rende <img src=assetPublicUrl(asset_id)>, costruito dal solo id.

afterEach(() => cleanup());

const placeholder = (token: string): ImageSlot => ({ source: 'theme-placeholder', token });
const uploaded = (assetId: string): ImageSlot => ({ source: 'uploaded', asset_id: assetId });

// Il sorgente REALE del foglio unico: il trattamento ricco vive qui, non inline (DE-101/DE-102).
// Sotto jsdom `import.meta.url` non e' un file: URL, quindi risolviamo dalla radice del repo (cwd
// di vitest) invece che da import.meta.
const CSS_PATH = join(process.cwd(), 'src', 'ui', 'site', 'site.css');
const cssSource = readFileSync(CSS_PATH, 'utf8');

// ═══════════════════════════════════════════════════════════════════════════════
// AC-DE-104-1 — il placeholder porta il trattamento ricco (classe + gradiente da token tema),
// e resta un placeholder decorativo (aria-hidden, nessun <img>).
// ═══════════════════════════════════════════════════════════════════════════════

describe('DE-104 AC-DE-104-1 — placeholder ricco: classe dedicata + gradiente da var(--site-color-*)', () => {
  it('l elemento del theme-placeholder porta la classe del trattamento ricco e resta decorativo', () => {
    const { container } = render(createElement(SiteImage, { image: placeholder('hero-warm') }));
    const box = container.querySelector('[data-image-token="hero-warm"]');

    expect(box).not.toBeNull(); // covers: AC-DE-104-1
    // Il trattamento ricco: la classe dedicata, OLTRE alla base 'site-image'.
    expect(box?.classList.contains('site-image--placeholder')).toBe(true); // covers: AC-DE-104-1
    expect(box?.classList.contains('site-image')).toBe(true); // covers: AC-DE-104-1
    // Resta un placeholder decorativo: aria-hidden, un <div>, e NESSUN <img> nasce da questa variante.
    expect(box?.tagName).toBe('DIV'); // covers: AC-DE-104-1
    expect(box?.getAttribute('aria-hidden')).toBe('true'); // covers: AC-DE-104-1
    expect(container.querySelectorAll('img')).toHaveLength(0); // covers: AC-DE-104-1
  });

  it('site.css definisce .site-image--placeholder con un background NON neutro derivato dal tema', () => {
    // Il selettore esiste nel foglio.
    const start = cssSource.indexOf('.site-image--placeholder');
    expect(start).toBeGreaterThanOrEqual(0); // covers: AC-DE-104-1

    // Isolo il blocco di dichiarazioni della regola: i gradienti usano PARENTESI (non graffe),
    // quindi la prima '}' dopo il selettore chiude davvero la regola.
    const block = cssSource.slice(start, cssSource.indexOf('}', start) + 1);

    // NON e' una scatola neutra: il fondo e' un gradiente CSS derivato da var(--site-color-*).
    expect(block.includes('gradient')).toBe(true); // covers: AC-DE-104-1
    expect(block.includes('var(--site-color')).toBe(true); // covers: AC-DE-104-1
    // FALSIFICABILE: gli scanner distinguono un gradiente-da-token da un fondo neutro/assente.
    expect('background-image: linear-gradient(135deg, var(--site-color-accent), var(--site-color-surface))'.includes('gradient')).toBe(true); // covers: AC-DE-104-1
    expect('background-color: var(--site-color-border)'.includes('gradient')).toBe(false); // covers: AC-DE-104-1
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AC-DE-104-2 — il branch uploaded resta INVARIATO: <img src=assetPublicUrl(asset_id)>.
// ═══════════════════════════════════════════════════════════════════════════════

// Fixture: DUE uuid in NEAR-COLLISION (35 char condivisi, differiscono SOLO nell'ultima cifra) +
// uno del tutto discordante. Un uuid ha lunghezza FISSA (36): un vero prefisso proprio fra due
// uuid validi e' irrappresentabile, quindi chi selezionasse per prefisso invece che per identita'
// esatta li confonderebbe.
const ASSET_A = '11111111-1111-4111-8111-111111111111';
const ASSET_B = '11111111-1111-4111-8111-111111111112'; // near-collision di ASSET_A
const ASSET_C = '22222222-2222-4222-8222-222222222222'; // forma discordante

describe('DE-104 AC-DE-104-2 — branch uploaded invariato: <img> col src da assetPublicUrl(asset_id)', () => {
  it('un asset presente rende un img il cui src e ESATTAMENTE assetPublicUrl(asset_id)', () => {
    const { container } = render(createElement(SiteImage, { image: uploaded(ASSET_A) }));
    const img = container.querySelector('img');

    expect(img).not.toBeNull(); // covers: AC-DE-104-2
    // Uguale al NOSTRO builder (stessa sorgente env di default): il branch P4 non e' regredito.
    expect(img?.getAttribute('src')).toBe(assetPublicUrl(ASSET_A)); // covers: AC-DE-104-2
    // Ancore INDIPENDENTI dal builder (letterali nel test), cosi' il confronto non e' tautologico:
    // e' l'URL del public object del NOSTRO bucket, costruito dal solo id.
    expect(img?.getAttribute('src')?.endsWith(`/${ASSET_A}`)).toBe(true); // covers: AC-DE-104-2
    expect(img?.getAttribute('src')?.includes('/site-assets/')).toBe(true); // covers: AC-DE-104-2
  });

  it('near-collision + un terzo discordante: ogni img dal PROPRIO id, per identita esatta mai per prefisso', () => {
    // Sanity: la coppia condivide davvero 35 char e differisce solo in coda.
    expect(ASSET_A.slice(0, 35)).toBe(ASSET_B.slice(0, 35)); // covers: AC-DE-104-2

    const { container } = render(
      createElement(
        'div',
        null,
        createElement(SiteImage, { key: 'a', image: uploaded(ASSET_A) }),
        createElement(SiteImage, { key: 'b', image: uploaded(ASSET_B) }),
        createElement(SiteImage, { key: 'c', image: uploaded(ASSET_C) }),
      ),
    );
    const srcs = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'));

    // Tre img, tre src DISTINTI (nessuna collisione, nessuna costante).
    expect(srcs).toHaveLength(3); // covers: AC-DE-104-2
    expect(new Set(srcs).size).toBe(3); // covers: AC-DE-104-2
    // Ogni img termina col PROPRIO id, e nessuno finisce col FRATELLO (no swap, no match per prefisso).
    expect(srcs[0]?.endsWith(`/${ASSET_A}`)).toBe(true); // covers: AC-DE-104-2
    expect(srcs[1]?.endsWith(`/${ASSET_B}`)).toBe(true); // covers: AC-DE-104-2
    expect(srcs[2]?.endsWith(`/${ASSET_C}`)).toBe(true); // covers: AC-DE-104-2
    expect(srcs[0]?.endsWith(`/${ASSET_B}`)).toBe(false); // covers: AC-DE-104-2
  });
});

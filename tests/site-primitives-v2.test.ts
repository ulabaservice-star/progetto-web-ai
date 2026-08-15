// DV2-104 (macrotask `foundation`) — oracolo di conformità dei primitivi condivisi (Button, SectionHead,
// PhotoPlaceholder). Asserzioni DERIVATE dagli acceptance_criteria (01-foundation.md), tag // covers.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Button, SectionHead, PhotoPlaceholder } from '@/ui/site/primitives';

const SRC = fileURLToPath(new URL('../src/ui/site/primitives.tsx', import.meta.url));
const source = readFileSync(SRC, 'utf8');

function hasLiteralColor(s: string): boolean {
  return /#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(/.test(s);
}

describe('design-engine-v2 · foundation · primitivi a token', () => {
  // covers: AC-DV2-104-1 — rendono a token, senza colori letterali né dangerouslySetInnerHTML.
  it('rendono a token (var(--site-*)) senza colori letterali né dangerouslySetInnerHTML', () => {
    const html = [
      renderToStaticMarkup(createElement(Button, { label: 'Prenota un tavolo' })),
      renderToStaticMarkup(
        createElement(SectionHead, { eyebrow: 'La casa', title: 'Chi siamo', intro: 'Dal 1990' }),
      ),
      renderToStaticMarkup(createElement(PhotoPlaceholder, { label: 'sala' })),
    ].join('\n');
    expect(html).toContain('var(--site-color-');
    expect(html).toContain('var(--site-font-');
    expect(hasLiteralColor(html), html).toBe(false);
    // il sorgente non USA dangerouslySetInnerHTML (il match è sull'uso `=`/`:`, non sul commento che lo vieta)
    expect(/dangerouslySetInnerHTML\s*[=:]/.test(source)).toBe(false);
  });

  // covers: AC-DV2-104-2 — PhotoPlaceholder rende un box "FOTO · <label>" e nessun <img>.
  it('PhotoPlaceholder rende un box "FOTO · <label>" e nessun <img>', () => {
    const html = renderToStaticMarkup(createElement(PhotoPlaceholder, { label: 'terrazza' }));
    expect(html).toMatch(/FOTO.{0,4}terrazza/); // "FOTO · terrazza", robusto al separatore
    expect(html).not.toContain('<img');
    expect(html).toContain('site-photo-ph');
  });

  // covers: AC-DV2-104-3 — testo di slot ostile escapato da React; nessun href/src nato dal testo.
  it('il testo di slot ostile è escapato da React (nessun markup iniettato, nessun href dal testo)', () => {
    const payload = '<script>alert(1)</script>';
    const btn = renderToStaticMarkup(createElement(Button, { label: payload }));
    const head = renderToStaticMarkup(
      createElement(SectionHead, { title: payload, eyebrow: payload, intro: payload }),
    );
    for (const html of [btn, head]) {
      expect(html).not.toContain('<script>'); // nessun markup grezzo iniettato
      expect(html).toContain('&lt;script&gt;'); // reso come testo escapato
    }
    // il payload nel label NON diventa un href: l'href del Button resta il default '#'
    const btnJs = renderToStaticMarkup(createElement(Button, { label: 'javascript:alert(1)' }));
    expect(btnJs).toContain('href="#"');
    expect(btnJs).not.toContain('href="javascript:');
  });
});

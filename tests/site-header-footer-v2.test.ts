// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import itMessages from '../messages/it.json';

// DV2-404 (macrotask body-sections-b, design-engine-v2) — HEADER + FOOTER come CHROME del SiteView. Le
// asserzioni DERIVANO da AC-DV2-404-1..3 (docs/blueprint/design-engine-v2/04-body-sections.md), riletti
// alla luce di DS-V2-D11 #4 (header/footer = chrome, non blocchi): i contenuti sono DERIVATI dal documento
// (deriveChromeData), MAI slot LLM; la variante e' un id di catalogo (data-*-layout congelato); gli href
// nascono SOLO dai costruttori validati o dagli anchor di slug.
//
// AC-DV2-404-2 (solo var(--site-*), nessun dangerouslySetInnerHTML) NON e' qui: e' gia' coperto per TUTTA
// src/ui/site/** — inclusa src/ui/site/chrome/** — dallo scan ricorsivo di tests/site-blocks-style.test.ts.
//
// renderToStaticMarkup (non testing-library/render): server-render fedele a /s/, deterministico, senza
// eseguire l'isola client SiteMotion. Il markup si parsa poi con innerHTML per interrogarlo come DOM.

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { locale: string; namespace: string }) => {
    const ns = ((itMessages as Record<string, unknown>)[namespace] ?? {}) as Record<string, unknown>;
    return (key: string) => {
      const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ns);
      return typeof value === 'string' ? value : `${namespace}.${key}`;
    };
  },
}));

import { deriveChromeData } from '@/ui/site/chrome/derive';
import { SiteHeader } from '@/ui/site/chrome/SiteHeader';
import { SiteFooter } from '@/ui/site/chrome/SiteFooter';
import { SiteView } from '@/ui/site/SiteView';
import { parseDocument, type SiteDocument } from '@/domain/generation/document';
import { THEMES } from '@/domain/generation/themes';
import type { ReactElement } from 'react';

function renderStatic(el: ReactElement): { html: string; root: HTMLElement } {
  const html = renderToStaticMarkup(el);
  const div = document.createElement('div');
  div.innerHTML = html;
  return { html, root: div };
}

const FOOTER_LABELS = { contacts: 'Contatti', hours: 'Orari', nav: 'Naviga', credit: 'Sito realizzato con cura.' };

// ── fixture: un documento valido con hero(business_name) + orari(hours) + contatti(recapiti), due pagine ─
function rawDocument(over?: { data?: Record<string, unknown>; hostile?: boolean }): Record<string, unknown> {
  const contact = over?.hostile
    ? { address: '"><img src=x onerror=alert(1)>', phone: 'javascript:alert(1)', whatsapp: 'javascript:x', email: 'not-an-email', social_links: ['javascript:alert(2)', 'http://insecure.example'] }
    : { address: 'Via delle Grazie 7, Roma', phone: '+39 06 5551234', whatsapp: '+39 333 4445566', email: 'info@trattoria.it', social_links: ['https://instagram.com/trattoria'], geo: { lat: 41.9, lng: 12.48 } };
  const businessName = over?.hostile ? '<script>alert(1)</script>' : 'Trattoria Aurora';
  return {
    recipe_id: 'ricetta-prova@1',
    theme_id: THEMES[0].id,
    pages: [
      {
        slug: 'home',
        role: 'home',
        title: 'Casa',
        meta_description: 'La trattoria nel centro storico',
        blocks: [
          { id: 'hero', content: { hero_title: 'Benvenuti' }, data: { business_name: businessName }, brief_fields_rendered: ['business_name'], images: [] },
          { id: 'orari', content: {}, data: { hours: { 'lun-ven': '12:00-15:00', sabato: '19:00-23:00' } }, brief_fields_rendered: ['hours'], images: [] },
          { id: 'contatti', content: {}, data: contact, brief_fields_rendered: [], images: [] },
        ],
      },
      {
        slug: 'contatti',
        role: 'contact',
        title: 'Contatti',
        meta_description: 'Dove siamo e come raggiungerci',
        blocks: [{ id: 'cta-whatsapp', content: {}, data: {}, brief_fields_rendered: [], images: [] }],
      },
    ],
  };
}

function buildDocument(over?: { hostile?: boolean }): SiteDocument {
  const parsed = parseDocument(rawDocument(over));
  if (!parsed.ok) throw new Error(`fixture DV2-404 non valida: ${JSON.stringify(parsed.error.issues)}`);
  return parsed.document;
}

// ── deriveChromeData — la derivazione degli attributi-sito (pura) ─────────────────────────────────────

describe('DV2-404 · deriveChromeData — estrae nome/nav/recapiti/orari dal documento', () => {
  it('estrae il nome dall hero, la nav dalle pagine, i recapiti col loro href SICURO', () => {
    const data = deriveChromeData(buildDocument());
    expect(data.businessName).toBe('Trattoria Aurora'); // covers: AC-DV2-404-1
    // Nav: una voce per pagina (titolo -> #slug).
    expect(data.nav).toEqual([
      { label: 'Casa', href: '#home' },
      { label: 'Contatti', href: '#contatti' },
    ]); // covers: AC-DV2-404-1
    // Recapiti + href dai costruttori validati (mai dal testo libero).
    expect(data.address).toBe('Via delle Grazie 7, Roma'); // covers: AC-DV2-404-1
    expect(data.telHref).toBe('tel:+39065551234'); // covers: AC-DV2-404-3
    expect(data.mailHref).toBe('mailto:info@trattoria.it'); // covers: AC-DV2-404-3
    expect(data.whatsappHref).toBe('https://wa.me/393334445566'); // covers: AC-DV2-404-3
    // Orari sintetici dal blocco orari.
    expect(data.hours).toEqual([
      { label: 'lun-ven', value: '12:00-15:00' },
      { label: 'sabato', value: '19:00-23:00' },
    ]); // covers: AC-DV2-404-1
    // La CTA della testata punta al deep-link WhatsApp validato.
    expect(data.ctaHref).toBe('https://wa.me/393334445566'); // covers: AC-DV2-404-3
    // Social: https valido -> href; il resto null.
    expect(data.socials).toEqual([{ value: 'https://instagram.com/trattoria', href: 'https://instagram.com/trattoria' }]); // covers: AC-DV2-404-3
  });

  it('valori ostili: nessun href nasce dal testo libero (telHref/whatsappHref/social null), fallback CTA su anchor', () => {
    const data = deriveChromeData(buildDocument({ hostile: true }));
    expect(data.telHref).toBeNull(); // covers: AC-DV2-404-3
    expect(data.whatsappHref).toBeNull(); // covers: AC-DV2-404-3
    expect(data.mailHref).toBeNull(); // covers: AC-DV2-404-3
    expect(data.socials.every((s) => s.href === null)).toBe(true); // covers: AC-DV2-404-3
    // Senza WhatsApp valido, la CTA cade sull'anchor alla pagina 'contact' (slug validato), mai su un url ostile.
    expect(data.ctaHref).toBe('#contatti'); // covers: AC-DV2-404-3
  });
});

// ── SiteHeader — data-header-layout congelato + slot resi + href sicuri ──────────────────────────────

describe('DV2-404 · SiteHeader — variante congelata, brand/nav resi, CTA sicura', () => {
  it('proietta data-header-layout, rende il brand e la nav con href agli slug', () => {
    const data = deriveChromeData(buildDocument());
    const cta = data.ctaHref !== null ? { label: 'Scrivici su WhatsApp', href: data.ctaHref } : null;
    const { root } = renderStatic(SiteHeader({ data, layoutId: 'header-classico@1', cta }));

    const header = root.querySelector('.site-header-v2');
    expect(header?.getAttribute('data-header-layout')).toBe('header-classico@1'); // covers: AC-DV2-404-1
    expect(root.querySelector('.site-chrome-v2__brand')?.textContent).toBe('Trattoria Aurora'); // covers: AC-DV2-404-1

    const navHrefs = [...root.querySelectorAll('.site-chrome-v2__navlink')].map((a) => a.getAttribute('href'));
    expect(navHrefs).toContain('#home'); // covers: AC-DV2-404-1
    expect(navHrefs).toContain('#contatti'); // covers: AC-DV2-404-1
    // La CTA usa l'href SICURO derivato (deep link WhatsApp), mai un href da testo libero.
    const ctaLink = [...root.querySelectorAll('a')].find((a) => a.getAttribute('href') === 'https://wa.me/393334445566');
    expect(ctaLink).not.toBeUndefined(); // covers: AC-DV2-404-3
  });

  it('un layoutId sconosciuto cade sul fallback (classico) ma porta comunque l id passato', () => {
    const data = deriveChromeData(buildDocument());
    const { root } = renderStatic(SiteHeader({ data, layoutId: 'header-inesistente@9', cta: null }));
    // La variante cade su 'classico' (renderer robusto) ma il data-attribute riflette l'id passato.
    expect(root.querySelector('.site-header-v2')?.getAttribute('data-header-layout')).toBe('header-inesistente@9'); // covers: AC-DV2-404-1
    expect(root.querySelector('.site-chrome-v2__brand')?.textContent).toBe('Trattoria Aurora'); // covers: AC-DV2-404-1
  });
});

// ── SiteFooter — data-footer-layout, colonne, credito NEUTRO (nessun new Date), determinismo ─────────

describe('DV2-404 · SiteFooter — variante congelata, colonne, credito senza anno', () => {
  it('proietta data-footer-layout, rende le colonne e il credito neutro col nome del locale', () => {
    const data = deriveChromeData(buildDocument());
    const { root, html } = renderStatic(SiteFooter({ data, layoutId: 'footer-classico@1', labels: FOOTER_LABELS }));

    expect(root.querySelector('.site-footer-v2')?.getAttribute('data-footer-layout')).toBe('footer-classico@1'); // covers: AC-DV2-404-1
    expect(root.querySelector('.site-footer-v2__brand')?.textContent).toBe('Trattoria Aurora'); // covers: AC-DV2-404-1
    // I recapiti nel footer usano gli href sicuri.
    const hrefs = [...root.querySelectorAll('.site-footer-v2__contact')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('tel:+39065551234'); // covers: AC-DV2-404-3
    expect(hrefs).toContain('mailto:info@trattoria.it'); // covers: AC-DV2-404-3
    // Gli orari sintetici sono resi.
    expect(root.querySelectorAll('.site-footer-v2__hours-row').length).toBe(2); // covers: AC-DV2-404-1
    // Il credito e' NEUTRO: la copy i18n + il nome, e NON contiene un anno (nessun new Date).
    expect(root.querySelector('.site-footer-v2__legal')?.textContent).toContain('Sito realizzato con cura.'); // covers: AC-DV2-404-1
    expect(html).not.toMatch(/\b20\d\d\b/); // covers: AC-DV2-404-1  (determinismo: nessun anno dall'orologio)
  });

  it('determinismo: lo stesso footer reso due volte e byte-identico (nessun new Date)', () => {
    const data = deriveChromeData(buildDocument());
    const a = renderToStaticMarkup(SiteFooter({ data, layoutId: 'footer-classico@1', labels: FOOTER_LABELS }));
    const b = renderToStaticMarkup(SiteFooter({ data, layoutId: 'footer-classico@1', labels: FOOTER_LABELS }));
    expect(a).toBe(b); // covers: AC-DV2-404-1
  });
});

// ── anti-injection — payload ostili escapati, nessun href da testo libero ─────────────────────────────

describe('DV2-404 · chrome — anti-injection su header e footer', () => {
  it('nome/indirizzo ostili sono escapati e i recapiti ostili non diventano link', () => {
    const data = deriveChromeData(buildDocument({ hostile: true }));
    const cta = data.ctaHref !== null ? { label: 'Contatti', href: data.ctaHref } : null;
    const header = renderToStaticMarkup(SiteHeader({ data, layoutId: 'header-classico@1', cta }));
    const footer = renderToStaticMarkup(SiteFooter({ data, layoutId: 'footer-classico@1', labels: FOOTER_LABELS }));
    const html = header + footer;

    // Escaping React: nessun markup iniettato dal business_name / address ostili.
    expect(html).not.toContain('<script>alert'); // covers: AC-DV2-404-3
    expect(html).not.toContain('<img'); // covers: AC-DV2-404-3
    expect(html).toContain('&lt;script&gt;'); // covers: AC-DV2-404-3
    // Nessun href da testo libero: niente javascript:/http: negli href (solo tel:/mailto:/https:/#anchor).
    expect(html).not.toContain('href="javascript:'); // covers: AC-DV2-404-3
    expect(html).not.toContain('href="http:'); // covers: AC-DV2-404-3
    // La CTA ostile cade sull'anchor sicuro alla pagina contatti.
    expect(html).toContain('href="#contatti"'); // covers: AC-DV2-404-3
  });
});

// ── integrazione — SiteView monta la chrome attorno alle pagine ───────────────────────────────────────

describe('DV2-404 · SiteView monta header e footer attorno alle pagine', () => {
  it('il render dell intero documento porta .site-header-v2 e .site-footer-v2 col nome del locale', async () => {
    const view = await SiteView({ document: buildDocument(), theme: THEMES[0], locale: 'it' });
    const { root } = renderStatic(view);

    const header = root.querySelector('.site-header-v2');
    const footer = root.querySelector('.site-footer-v2');
    expect(header?.getAttribute('data-header-layout')).toBe('header-classico@1'); // covers: AC-DV2-404-1
    expect(footer?.getAttribute('data-footer-layout')).toBe('footer-classico@1'); // covers: AC-DV2-404-1
    // Il nome del locale, derivato dall'hero, compare nella chrome.
    expect(root.querySelector('.site-header-v2 .site-chrome-v2__brand')?.textContent).toBe('Trattoria Aurora'); // covers: AC-DV2-404-1
    // La nav punta agli anchor delle pagine, che ora portano id=slug.
    expect(root.querySelector('#home')).not.toBeNull(); // covers: AC-DV2-404-1
    expect(root.querySelector('#contatti')).not.toBeNull(); // covers: AC-DV2-404-1
  });
});

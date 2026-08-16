// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';

// DV2-403 (macrotask body-sections-b, design-engine-v2) — ORARI + CONTATTI v2. Le asserzioni DERIVANO
// dagli acceptance_criteria AC-DV2-403-1..3 (docs/blueprint/design-engine-v2/04-body-sections.md).
//
// PERCHE' renderToStaticMarkup E NON testing-library/render: i blocchi contengono l'isola CLIENT
// `OrariToday`, il cui useEffect (in jsdom) marcherebbe la riga di oggi e sporcherebbe l'output. Il
// SERVER-render (renderToStaticMarkup) NON esegue gli effetti: e' esattamente cio' che /s/ emette e cio'
// che AC-DV2-403-2 pretende sia deterministico. Il markup si parsa poi con innerHTML (nessun effetto
// React) per interrogarlo come DOM. (Stessa lezione del gate menu: jsdom scarta i clamp; qui in piu'
// eviteremmo il non-determinismo dell'orologio.)
//
// COSA NON PROVA (L-COL-006): che orari/contatti siano BELLI (gate umano). Prova la struttura
// (data-section-layout congelato + slot resi), il DETERMINISMO (server byte-identico, niente giorno-oggi),
// e l'ASSENZA di risorse esterne nella mappa + l'anti-injection (escaping, href solo da costruttori validati).

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => {
    const cat = (locale === 'es' ? esMessages : itMessages) as Record<string, unknown>;
    const ns = (cat[namespace] ?? {}) as Record<string, unknown>;
    return (key: string) => {
      const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ns);
      return typeof value === 'string' ? value : `${namespace}.${key}`;
    };
  },
}));

import { Orari } from '@/ui/site/blocks/Orari';
import { Contatti } from '@/ui/site/blocks/Contatti';
import { matchTodayKey } from '@/ui/site/blocks/hours-today';
import { BODY_LAYOUTS } from '@/domain/generation/section-layouts';
import type { SiteBlock } from '@/domain/generation/document';
import type { ReactElement } from 'react';

// ── helper: server-render (nessun effetto React) + parse in DOM per l'interrogazione ─────────────────
function renderStatic(el: ReactElement): { html: string; root: HTMLElement } {
  const html = renderToStaticMarkup(el);
  const div = document.createElement('div');
  div.innerHTML = html;
  return { html, root: div };
}

// ── fixture (LOCALI, valori DISCORDANTI, trappola del prefisso) ──────────────────────────────────────

// PIU DI UNA chiave, valori DISCORDANTI, e la trappola del prefisso: 'sab' e' prefisso di 'sabato'.
const HOURS = { 'lun-ven': '12:00-15:00', sab: '19:00-23:00', sabato: 'Chiuso', domenica: 'Chiuso tutto il giorno' };

function orariBlock(sectionLayoutId?: string): SiteBlock {
  return {
    id: 'orari',
    content: { hours_title: 'Quando trovarci', hours_intro: 'A pranzo nei feriali, il sabato a cena.' },
    data: { hours: HOURS },
    brief_fields_rendered: ['hours'],
    images: [{ source: 'theme-placeholder', token: 'orari' }],
    ...(sectionLayoutId ? { section_layout_id: sectionLayoutId } : {}),
  };
}

function contattiBlock(sectionLayoutId?: string, over?: Partial<SiteBlock['data']>): SiteBlock {
  return {
    id: 'contatti',
    content: { contact_title: 'Vieni a trovarci', contact_intro: 'Nel cuore del centro storico.' },
    data: {
      address: 'Via delle Grazie 7, Roma',
      phone: '+39 06 5551234',
      whatsapp: '+39 333 4445566',
      email: 'info@trattoria.it',
      social_links: ['https://instagram.com/trattoria', 'https://facebook.com/trattoria'],
      geo: { lat: 41.9, lng: 12.48 },
      ...over,
    },
    brief_fields_rendered: ['address', 'phone', 'whatsapp', 'email', 'social_links'],
    images: [{ source: 'theme-placeholder', token: 'contatti' }],
    ...(sectionLayoutId ? { section_layout_id: sectionLayoutId } : {}),
  };
}

// ── AC-DV2-403-1 — struttura resa, data-section-layout congelato ──────────────────────────────────────

describe('DV2-403 · orari — struttura, section_layout_id, tutte le voci', () => {
  // covers: AC-DV2-403-1
  it('rende la radice .site-hours-v2 con data-section-layout congelato e tutte le voci', async () => {
    const { root } = renderStatic(await Orari({ block: orariBlock('orari-registro@1'), locale: 'it' }));
    const section = root.querySelector('.site-hours-v2');
    expect(section?.getAttribute('data-section-layout')).toBe('orari-registro@1'); // covers: AC-DV2-403-1
    expect(section?.getAttribute('data-block-kind')).toBe('orari'); // covers: AC-DV2-403-1

    // Ogni chiave del record e' resa una volta, col proprio valore: nessuna omessa, nessuna duplicata,
    // 'sab' e 'sabato' DISTINTE (trappola del prefisso).
    const rows = [...root.querySelectorAll('.site-hours-v2__row')];
    const rendered = Object.fromEntries(
      rows.map((r) => [r.getAttribute('data-hours-key'), r.querySelector('.site-hours-v2__value')?.textContent]),
    );
    expect(rendered).toEqual(HOURS); // covers: AC-DV2-403-1
    expect(root.querySelector('[data-hours-key="sab"] .site-hours-v2__value')?.textContent).toBe('19:00-23:00'); // covers: AC-DV2-403-1
    expect(root.querySelector('[data-hours-key="sabato"] .site-hours-v2__value')?.textContent).toBe('Chiuso'); // covers: AC-DV2-403-1

    // Titolo e intro dai LORO slot (valori discordanti).
    expect(root.querySelector('.site-hours-v2__title')?.textContent).toBe('Quando trovarci'); // covers: AC-DV2-403-1
    expect(root.querySelector('.site-hours-v2__intro')?.textContent).toBe('A pranzo nei feriali, il sabato a cena.'); // covers: AC-DV2-403-1
  });

  // covers: AC-DV2-403-1
  it('senza section_layout_id cade sul fallback orari-tabella@1 (nessun crash, tutte le voci)', async () => {
    const { root } = renderStatic(await Orari({ block: orariBlock(), locale: 'it' }));
    expect(root.querySelector('.site-hours-v2')?.getAttribute('data-section-layout')).toBe('orari-tabella@1'); // covers: AC-DV2-403-1
    expect(root.querySelectorAll('.site-hours-v2__row')).toHaveLength(Object.keys(HOURS).length); // covers: AC-DV2-403-1
  });

  // covers: AC-DV2-403-1 (distinzione VISIBILE fra varianti — non solo nominale)
  it('cinque varianti di orari rendono markup DIVERSO (distinzione strutturale, non cromatica)', async () => {
    const ids = ['orari-tabella@1', 'orari-banda-scura@1', 'orari-nastro@1', 'orari-verticale@1', 'orari-manifesto@1'];
    const htmls = await Promise.all(ids.map(async (id) => renderStatic(await Orari({ block: orariBlock(id), locale: 'it' })).html));
    expect(new Set(htmls).size, 'due varianti orari rendono lo stesso markup').toBe(ids.length); // covers: AC-DV2-403-1
  });
});

describe('DV2-403 · contatti — struttura, section_layout_id, canali sicuri', () => {
  // covers: AC-DV2-403-1
  it('rende la radice .site-contact-v2 con data-section-layout e i recapiti con href da costruttori validati', async () => {
    const { root } = renderStatic(await Contatti({ block: contattiBlock('contatti-mappa-sinistra@1'), locale: 'it' }));
    const section = root.querySelector('.site-contact-v2');
    expect(section?.getAttribute('data-section-layout')).toBe('contatti-mappa-sinistra@1'); // covers: AC-DV2-403-1
    expect(section?.getAttribute('data-block-kind')).toBe('contatti'); // covers: AC-DV2-403-1

    // Il telefono e' un <a tel:>, la mail un <a mailto:>, il whatsapp un <a https://wa.me/...> — tutti dai
    // costruttori validati, mai dal testo libero.
    const phone = root.querySelector('[data-contact-field="phone"] a');
    // safeTelHref toglie spazi/()/-/. dal '+39 06 5551234' -> 'tel:+39065551234' (schema tel: dal codice).
    expect(phone?.getAttribute('href')).toBe('tel:+39065551234'); // covers: AC-DV2-403-1
    expect(root.querySelector('[data-contact-field="email"] a')?.getAttribute('href')).toBe('mailto:info@trattoria.it'); // covers: AC-DV2-403-1
    expect(root.querySelector('[data-contact-field="whatsapp"] a')?.getAttribute('href')).toBe('https://wa.me/393334445566'); // covers: AC-DV2-403-1
    // L'indirizzo e' testo (nessun href da un indirizzo).
    const address = root.querySelector('[data-contact-field="address"]');
    expect(address?.textContent).toContain('Via delle Grazie 7, Roma'); // covers: AC-DV2-403-1
    expect(address?.querySelector('a')).toBeNull(); // covers: AC-DV2-403-1
  });

  // covers: AC-DV2-403-1
  it('senza section_layout_id cade sul fallback contatti-mappa@1', async () => {
    const { root } = renderStatic(await Contatti({ block: contattiBlock(), locale: 'it' }));
    expect(root.querySelector('.site-contact-v2')?.getAttribute('data-section-layout')).toBe('contatti-mappa@1'); // covers: AC-DV2-403-1
  });
});

// ── AC-DV2-403-2 — determinismo: server byte-identico, il giorno-oggi NON e' nel documento ────────────

describe('DV2-403 · determinismo — il giorno corrente e un effetto client, mai nel documento', () => {
  // covers: AC-DV2-403-2
  it('lo stesso block reso due volte (server) e byte-identico e non porta alcun marcatore di oggi', async () => {
    const a = renderStatic(await Orari({ block: orariBlock('orari-tabella@1'), locale: 'it' })).html;
    const b = renderStatic(await Orari({ block: orariBlock('orari-tabella@1'), locale: 'it' })).html;
    expect(a).toBe(b); // covers: AC-DV2-403-2
    // Il documento congelato non contiene il giorno-di-oggi: nessun data-today, nessun aria-current (li
    // scrive SOLO l'isola client, dopo il mount).
    expect(a).not.toContain('data-today'); // covers: AC-DV2-403-2
    expect(a).not.toContain('aria-current'); // covers: AC-DV2-403-2
    // Ma l'isola c'e', pronta a marcare lato client.
    expect(a).toContain('data-hours-today-island'); // covers: AC-DV2-403-2
  });

  // covers: AC-DV2-403-2 (la logica dell'isola, oracolabile senza orologio)
  it('matchTodayKey: il giorno di oggi combacia per nome pieno e per radice, senza falsi', () => {
    const keys = Object.keys(HOURS); // ['lun-ven','sab','sabato','domenica']
    // 'sabato' combacia la chiave piena 'sabato' (la prima che combacia nell'ordine e' 'sab' per radice).
    expect(matchTodayKey(keys, 'sabato')).toBe('sab'); // covers: AC-DV2-403-2  (radice 'sab' dentro 'sab' e 'sabato': vince la prima)
    // 'lunedì' combacia l'intervallo 'lun-ven' per radice 'lun' (accento ignorato).
    expect(matchTodayKey(keys, 'lunedì')).toBe('lun-ven'); // covers: AC-DV2-403-2
    // 'domenica' combacia la chiave piena.
    expect(matchTodayKey(keys, 'domenica')).toBe('domenica'); // covers: AC-DV2-403-2
    // Un giorno che non compare non marca nulla (nessun falso oggi).
    expect(matchTodayKey(keys, 'mercoledì')).toBeNull(); // covers: AC-DV2-403-2
    expect(matchTodayKey([], 'lunedì')).toBeNull(); // covers: AC-DV2-403-2
  });
});

// ── AC-DV2-403-3 — la mappa e' di catalogo, nessuna risorsa esterna; anti-injection ───────────────────

describe('DV2-403 · contatti — mappa senza risorse esterne + anti-injection', () => {
  // covers: AC-DV2-403-3
  it('la mappa e un riquadro di catalogo con geo in data-attr e NESSUN src/href, nessun host di terzi', async () => {
    const { root, html } = renderStatic(await Contatti({ block: contattiBlock('contatti-mappa@1'), locale: 'it' }));
    const map = root.querySelector('.site-contact-v2__map');
    expect(map).not.toBeNull(); // covers: AC-DV2-403-3
    // Le coordinate stanno in data-attr, non in un URL.
    expect(map?.getAttribute('data-geo-lat')).toBe('41.9'); // covers: AC-DV2-403-3
    expect(map?.getAttribute('data-geo-lng')).toBe('12.48'); // covers: AC-DV2-403-3
    // La mappa non porta alcun attributo di rete.
    expect(map?.getAttribute('src')).toBeNull(); // covers: AC-DV2-403-3
    expect(map?.getAttribute('href')).toBeNull(); // covers: AC-DV2-403-3
    // Nessun <img> nel blocco contatti (la mappa e' un <div> di catalogo, non un tile remoto).
    expect(root.querySelector('img')).toBeNull(); // covers: AC-DV2-403-3
    // Nessun tile a un host di terzi (google maps, tile servers) ne url() remoto nel markup.
    expect(html).not.toMatch(/googleapis|google\.com\/maps|openstreetmap|tile\.|maps\.|url\(\s*https?:/i); // covers: AC-DV2-403-3
  });

  // covers: AC-DV2-403-3 (nessun href da testo libero: valori ostili non diventano link)
  it('valori ostili non producono href: restano testo escapato', async () => {
    const hostile = contattiBlock('contatti-mappa@1', {
      phone: 'javascript:alert(1)',
      email: 'not-an-email',
      whatsapp: 'javascript:void(0)',
      social_links: ['javascript:alert(2)', 'http://insecure.example'],
      address: '"><img src=x onerror=alert(1)>',
    });
    const { root, html } = renderStatic(await Contatti({ block: hostile, locale: 'it' }));

    // Nessun costruttore valida quei valori -> nessun <a> nei rispettivi campi (resta il solo testo).
    expect(root.querySelector('[data-contact-field="phone"] a')).toBeNull(); // covers: AC-DV2-403-3
    expect(root.querySelector('[data-contact-field="email"] a')).toBeNull(); // covers: AC-DV2-403-3
    expect(root.querySelector('[data-contact-field="whatsapp"] a')).toBeNull(); // covers: AC-DV2-403-3
    // 'http://insecure' e 'javascript:' NON diventano href social (solo https: passa).
    for (const a of [...root.querySelectorAll('.site-contact-v2__social')]) {
      const href = a.getAttribute('href');
      if (href !== null) expect(href.startsWith('https:')).toBe(true); // covers: AC-DV2-403-3
    }
    // I valori ostili compaiono al piu' come TESTO (escapato), MAI come schema di un href: nessun
    // href="javascript:" ne href="http:" (solo tel:/mailto:/https: dai costruttori validati).
    expect(html).not.toContain('href="javascript:'); // covers: AC-DV2-403-3
    expect(html).not.toContain('href="http:'); // covers: AC-DV2-403-3
    // Il payload nell'indirizzo e' ESCAPATO da React: nessun <img> iniettato, nessun onerror attivo.
    expect(root.querySelector('img')).toBeNull(); // covers: AC-DV2-403-3
    expect(html).not.toContain('<img'); // covers: AC-DV2-403-3
    expect(html).toContain('&lt;img'); // covers: AC-DV2-403-3  (reso come testo)
  });

  // covers: AC-DV2-403-3 (payload ostile negli orari — escaping React)
  it('un payload ostile in un valore orario e escapato, nessun markup iniettato', async () => {
    const block: SiteBlock = {
      id: 'orari',
      content: {},
      data: { hours: { 'lun-ven': '<script>alert(1)</script>' } },
      brief_fields_rendered: ['hours'],
      images: [],
    };
    const { html, root } = renderStatic(await Orari({ block, locale: 'it' }));
    expect(root.querySelector('script')).toBeNull(); // covers: AC-DV2-403-3
    expect(html).not.toContain('<script>alert'); // covers: AC-DV2-403-3
    expect(html).toContain('&lt;script&gt;'); // covers: AC-DV2-403-3
  });
});

// Guardia sul catalogo consumato: i fallback dei renderer sono id REALI del catalogo (se sparissero, il
// render cadrebbe su un id inesistente e la variante non si risolverebbe).
describe('DV2-403 · i fallback dei renderer sono id reali del catalogo', () => {
  it('orari-tabella@1 e contatti-mappa@1 esistono in BODY_LAYOUTS', () => {
    const ids = new Set(BODY_LAYOUTS.map((l) => l.id));
    expect(ids.has('orari-tabella@1')).toBe(true);
    expect(ids.has('contatti-mappa@1')).toBe(true);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { createElement, type ReactNode } from 'react';
import itMessages from '../messages/it.json';
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  type OrganizationJsonLd,
  type WebSiteJsonLd,
} from '@/domain/marketing/organization-jsonld';
import { serializeJsonLdSafe } from '@/domain/generation/jsonld';
import MarketingHomePage from '@/app/[locale]/(marketing)/page';

// PUB-331 (macrotask seo-jsonld, p6a-public-surface) — ORACOLO del JSON-LD Organization + WebSite sulla
// HOME landing e della sua SERIALIZZAZIONE SICURA. Le asserzioni DERIVANO da AC-331-1..3
// (14-seo-jsonld.md), taggate `// covers: AC-331-<n>` sull'EXPECT.
//
// FALSIFICABILITA' (prova sull'effetto): il cuore del task e' che l'output escaped montato nel <script>
// NON contenga la sequenza grezza di chiusura del tag, e che i due blocchi (Organization E WebSite)
// esistano. Una variante che monti via innerHTML grezzo / bypassi serializeJsonLdSafe la lascerebbe
// passare (AC-331-2 rosso); una che ometta il blocco WebSite mancherebbe un @type (AC-331-1 rosso).
//
// Il nome BRAND e' il vettore ostile: getBrandName() legge NEXT_PUBLIC_BRAND_NAME (pilotata da
// vi.stubEnv). getLandingBaseUrl() legge NEXT_PUBLIC_LANDING_URL (pinnata != host sito): l'url dei due
// blocchi nasce SEMPRE dalla base landing, mai dall'Host della richiesta. La home legge env al RENDER
// (getLandingBaseUrl/getBrandName chiamate dentro il componente), quindi l'import statico e' sicuro.

// La sequenza di chiusura tag, spezzata in due letterali cosi' che NON compaia mai grezza nemmeno nel
// sorgente del test (che altrimenti la conterrebbe come stringa cercata).
const CLOSE_SCRIPT = '</' + 'script>';
// Nome brand che tenta il BREAKOUT: chiude il <script> e ne apre uno eseguibile.
const BREAKOUT_BRAND = 'Ulaba' + CLOSE_SCRIPT + '<script>alert(1)</script>';
const LANDING_URL = 'https://ulaba.net';
const SITE_URL = 'https://sites.ulaba.example'; // distinto dalla base landing

// Il file target_test e' `.ts` (non `.tsx`, come da 14-seo-jsonld.md): niente JSX → si compone l'albero
// con createElement. Il provider i18n serve solo a MarketingHome (client) dentro la home; i due <script>
// JSON-LD li rende il server component page.tsx a monte, indipendenti dal provider.
function wrap(ui: ReactNode) {
  // `children` va nelle props: il tipo di NextIntlClientProvider lo esige e createElement non lo
  // deriva dal 3o argomento posizionale in TS strict (TS2769).
  return createElement(NextIntlClientProvider, { locale: 'it', messages: itMessages, children: ui });
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_LANDING_URL', LANDING_URL);
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
  vi.stubEnv('NEXT_PUBLIC_BRAND_NAME', BREAKOUT_BRAND);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function renderHomeScripts(): { type: string; text: string; parsed: Record<string, unknown> }[] {
  render(wrap(MarketingHomePage()));
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  return scripts.map((el) => {
    const text = el.textContent ?? '';
    return {
      type: el.getAttribute('type') ?? '',
      text,
      parsed: JSON.parse(text) as Record<string, unknown>,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRUPPO A — builder PURI + serializzazione sicura (nessun render)
// ═══════════════════════════════════════════════════════════════════════════════

describe('PUB-331 builder puri Organization/WebSite — @type/name/url dagli argomenti', () => {
  it('buildOrganizationJsonLd: @context/@type costanti, name e url dagli argomenti', () => {
    const org: OrganizationJsonLd = buildOrganizationJsonLd(LANDING_URL, 'Ulaba');
    expect(org['@context']).toBe('https://schema.org'); // covers: AC-331-3
    expect(org['@type']).toBe('Organization'); // covers: AC-331-1
    expect(org.name).toBe('Ulaba'); // covers: AC-331-3
    expect(org.url).toBe(LANDING_URL); // covers: AC-331-3 — url = base landing, mai host sito
    expect(org.url).not.toBe(SITE_URL); // covers: AC-331-3
  });

  it('buildWebSiteJsonLd: @type WebSite, name e url dagli argomenti', () => {
    const site: WebSiteJsonLd = buildWebSiteJsonLd(LANDING_URL, 'Ulaba');
    expect(site['@type']).toBe('WebSite'); // covers: AC-331-1
    expect(site.name).toBe('Ulaba'); // covers: AC-331-3
    expect(site.url).toBe(LANDING_URL); // covers: AC-331-3
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRUPPO B — effetto sulla HOME: i due <script> ld+json ricevono la stringa escaped
// ═══════════════════════════════════════════════════════════════════════════════

describe('PUB-331 JSON-LD sulla home — Organization + WebSite montati come figlio testuale sicuro', () => {
  it('AC-331-1: la home rende almeno due <script ld+json>, uno Organization e uno WebSite', () => {
    const scripts = renderHomeScripts();
    // Almeno due blocchi JSON-LD (il LocalBusiness T-410 NON e' su questa rotta: qui solo i due nuovi).
    expect(scripts.length).toBeGreaterThanOrEqual(2); // covers: AC-331-1
    const types = scripts.map((s) => s.parsed['@type']);
    expect(types).toContain('Organization'); // covers: AC-331-1
    expect(types).toContain('WebSite'); // covers: AC-331-1
  });

  it('AC-331-2: un nome brand ostile con </script> esce ESCAPED — la chiusura del tag e irrappresentabile', () => {
    const scripts = renderHomeScripts();
    // Il brand ostile finisce nel `name` di entrambi i blocchi: in NESSUNO dei due testi compare la
    // sequenza grezza di chiusura del tag — una variante innerHTML grezzo / senza serializeJsonLdSafe
    // la lascerebbe passare (oracolo falsificabile a livello di pagina).
    for (const s of scripts) {
      expect(s.text.includes(CLOSE_SCRIPT)).toBe(false); // covers: AC-331-2
      expect(s.text.includes('<')).toBe(false); // covers: AC-331-2 — nessun '<' grezzo sopravvive
      expect(s.text).toContain('\\u003c'); // covers: AC-331-2 — '<' e' diventato l'escape unicode
    }
    // Nessuno script ESEGUIBILE e' nato dal breakout: gli unici <script> sono i ld+json (non eseguibili).
    for (const el of document.querySelectorAll('script')) {
      expect(el.getAttribute('type')).toBe('application/ld+json'); // covers: AC-331-2
    }
  });

  it('AC-331-3: il testo di ogni <script> round-trippa via JSON.parse e ricostruisce @type e il name esatto', () => {
    const scripts = renderHomeScripts();
    const org = scripts.find((s) => s.parsed['@type'] === 'Organization');
    const site = scripts.find((s) => s.parsed['@type'] === 'WebSite');
    expect(org).toBeDefined(); // covers: AC-331-3
    expect(site).toBeDefined(); // covers: AC-331-3
    if (org === undefined || site === undefined) throw new Error('blocchi JSON-LD mancanti');
    // Round-trip TRASPARENTE: l'escape non corrompe il dato, il name ostile e' ricostruito identico.
    expect(org.parsed.name).toBe(BREAKOUT_BRAND); // covers: AC-331-3
    expect(site.parsed.name).toBe(BREAKOUT_BRAND); // covers: AC-331-3
    // url = base landing per costruzione (mai l'Host della richiesta / il sito).
    expect(org.parsed.url).toBe(LANDING_URL); // covers: AC-331-3
    expect(site.parsed.url).toBe(LANDING_URL); // covers: AC-331-3
    // Il testo montato e' BYTE-per-byte quello di serializeJsonLdSafe (riuso, nessuna serializzazione
    // artigianale): lo stesso builder+serializer sul brand ostile riproduce il testo dello <script>.
    expect(org.text).toBe(serializeJsonLdSafe(buildOrganizationJsonLd(LANDING_URL, BREAKOUT_BRAND))); // covers: AC-331-3
  });
});

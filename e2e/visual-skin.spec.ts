import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { seedSite, seedGenerationWithDocument, seedPublication, cleanupSite } from './support/seed';
import { USER_FILE, type TestUser } from './support/paths';
import { buildInnocuousDocument } from './fixtures/innocuous-document';
import { attachObservables } from './support/effect-assertions';
import { parseDocument } from '@/domain/generation/document';

// DE-101 (macrotask visual-skin) — AC-DE-101-1: sulla rotta PUBBLICA e ANON /s/<slug> il titolo
// dell'hero (<h1 class="site-hero__title">) rende a una dimensione GRANDE davvero, non a quella
// di default del browser. E' l'EFFETTO misurato in un browser vero del foglio site.css (T-DE-101):
// siteThemeStyle proietta i token alla radice, il foglio da' al titolo un font-size fluido
// clamp(2rem, 5vw, var(--site-scale-3xl)), e su viewport desktop il clamp risolve al 3xl del tema.
// Il tema fissato e' sole-mediterraneo@1 (3xl = 3.25rem = 52px): la soglia >= 40 ha margine ampio
// e non dipende dal tema scelto dalla ricetta. Modellato su public-hostile.spec.ts (seed
// service_role, contesto anon, /s/<slug>), ma qui l'asserzione e' sulla TIPOGRAFIA, non sull'XSS.

// CONTESTO ANON (RLS anon-published): la pagina NON ha sessione — lo storageState di file
// (utente autenticato del globalSetup) e' SOSTITUITO da uno vuoto, cosi' /s/<slug> e' servita al
// ruolo Postgres `anon` e il documento arriva SOLO perche' is_published=true. Il viewport e'
// fissato a 1280x720 (il default di Playwright) perche' la misura del clamp e' deterministica.
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1280, height: 720 } });

/** L'utente di test provisionato dal globalSetup. Letto NEL test (mai a import-time, per --list). */
function testUser(): TestUser {
  return JSON.parse(readFileSync(USER_FILE, 'utf8')) as TestUser;
}

test.describe('DE-101 tipografia dell hero sulla rotta pubblica /s/<slug> (AC-DE-101-1)', () => {
  // Isolamento fra i casi: il teardown globale cancella comunque l'utente (CASCADE), questo tiene
  // pulite le tabelle fra un run e l'altro.
  const seededSites: string[] = [];
  test.afterAll(async () => {
    for (const siteId of seededSites) await cleanupSite(siteId);
  });

  test('il titolo dell hero rende a una font-size >= 40px (non il default del browser)', async ({
    page,
  }) => {
    // given: un sito dell'utente di test e un documento INNOCUO reale (percorso resolveVariantHome
    // -> parseDocument) con una home il cui blocco hero ha content.hero_title valorizzato; il
    // theme_id e' FISSATO su un tema del catalogo (sole-mediterraneo@1) e ri-attraversa parseDocument
    // (A05:2025). Una riga site_publications is_published=true lo espone ad anon. public_slug e site
    // slug sono NAMESPACED (unici globali, DB condiviso).
    const { accountId } = testUser();
    const suffix = randomUUID().slice(0, 8);
    const siteId = await seedSite({
      accountId,
      name: `E2E visual skin ${suffix}`,
      slug: `e2e-visual-skin-site-${suffix}`,
    });
    seededSites.push(siteId);

    const base = buildInnocuousDocument();
    const parsed = parseDocument({ ...base, theme_id: 'sole-mediterraneo@1' });
    if (!parsed.ok) {
      throw new Error('fixture visual-skin: il documento con theme_id fissato non ha superato parseDocument');
    }
    const doc = parsed.document;

    const genId = await seedGenerationWithDocument({
      accountId,
      siteId,
      document: doc,
      status: 'complete',
      chosenVariant: 0,
    });
    const publicSlug = `e2e-visual-skin-${suffix}`;
    await seedPublication({
      accountId,
      siteId,
      sourceGenerationId: genId,
      document: doc,
      publicSlug,
      locale: 'it',
    });

    // when: si visita la pagina pubblica da ANON.
    const response = await page.goto(`/s/${publicSlug}`);
    // 200 servito ad anon: la RLS anon-published ha restituito la riga, il gate parseDocument e'
    // passato, la pagina si e' resa.
    expect(response?.status()).toBe(200); // covers: AC-DE-101-1

    // then: l'<h1 class="site-hero__title"> esiste ed e' reso con una font-size RISOLTA (px) grande.
    // getComputedStyle risolve il clamp del foglio site.css al 3xl del tema su viewport desktop; il
    // default non stilizzato di un <h1> (2em ~= 32px) NON supererebbe 40.
    const heroTitle = page.locator('h1.site-hero__title');
    await expect(heroTitle).toBeVisible();
    const fontSizePx = await heroTitle
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(fontSizePx).toBeGreaterThanOrEqual(40); // covers: AC-DE-101-1
  });
});

// DE-102 (macrotask visual-skin) — AC-DE-102-3: sulla rotta PUBBLICA e ANON /s/<slug> l'hero non e'
// l'ennesima scheda identica alle altre. site.css da' a `.site-section[data-block-kind="hero"]` un
// trattamento pieno diverso (fondo della PAGINA invece della surface, respiro maggiore): l'EFFETTO
// misurato in un browser vero e' che il background computato dell'hero DIFFERISCE da quello di una
// sezione non-hero. Con sole-mediterraneo@1 la surface (#fffdf9) e il background (#fdf6ec) sono due
// colori distinti, quindi getComputedStyle li risolve a due rgb() diversi. Stesso pattern di seed e
// contesto anon del test DE-101 qui sopra.
test.describe('DE-102 hero visivamente distinto dalle altre sezioni su /s/<slug> (AC-DE-102-3)', () => {
  const seededSites: string[] = [];
  test.afterAll(async () => {
    for (const siteId of seededSites) await cleanupSite(siteId);
  });

  test('la section hero ha un background computato diverso da una sezione non-hero', async ({
    page,
  }) => {
    // given: un sito dell'utente di test e il documento INNOCUO reale (percorso resolveVariantHome ->
    // parseDocument), che porta un hero e almeno una sezione non-hero (offerte, orari, ...). Il
    // theme_id e' FISSATO su sole-mediterraneo@1 e ri-attraversa parseDocument. slug NAMESPACED.
    const { accountId } = testUser();
    const suffix = randomUUID().slice(0, 8);
    const siteId = await seedSite({
      accountId,
      name: `E2E visual skin hero ${suffix}`,
      slug: `e2e-visual-skin-hero-site-${suffix}`,
    });
    seededSites.push(siteId);

    const base = buildInnocuousDocument();
    const parsed = parseDocument({ ...base, theme_id: 'sole-mediterraneo@1' });
    if (!parsed.ok) {
      throw new Error('fixture visual-skin DE-102: il documento con theme_id fissato non ha superato parseDocument');
    }
    const doc = parsed.document;

    const genId = await seedGenerationWithDocument({
      accountId,
      siteId,
      document: doc,
      status: 'complete',
      chosenVariant: 0,
    });
    const publicSlug = `e2e-visual-skin-hero-${suffix}`;
    await seedPublication({
      accountId,
      siteId,
      sourceGenerationId: genId,
      document: doc,
      publicSlug,
      locale: 'it',
    });

    // when: si visita la pagina pubblica da ANON.
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-102-3

    // then: esistono la section hero e almeno una section non-hero, e i loro background computati
    // DIFFERISCONO — l'hero riceve un trattamento pieno distinto, non e' un'altra scheda identica.
    const heroSection = page.locator('section[data-block-kind="hero"]').first();
    const otherSection = page.locator('section[data-block-kind]:not([data-block-kind="hero"])').first();
    await expect(heroSection).toBeVisible();
    await expect(otherSection).toBeVisible();

    const heroBackground = await heroSection.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    const otherBackground = await otherSection.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    expect(heroBackground).not.toBe(otherBackground); // covers: AC-DE-102-3
  });
});

// DE-103 (macrotask visual-skin) — i font dei temi sono caricati DAVVERO e self-host. Sulla rotta
// PUBBLICA e ANON /s/<slug> con sole-mediterraneo@1 (heading 'Fraunces'):
//  - AC-DE-103-1: il font-family COMPUTATO di un elemento HEADING risolve alla famiglia di catalogo
//    del tema (contiene 'Fraunces'), non al solo fallback di sistema (Georgia/serif). NB (DE11-103,
//    design-engine-v1.1): la PELLE EDITORIALE porta l'<h1> hero alla famiglia DISPLAY (Playfair,
//    --site-font-display) via site.css; il token HEADING resta applicato al NOME dell'attivita'
//    (`p.site-hero__brand`, Hero.tsx, ancora var(--site-font-heading)) — e' li' che si prova
//    l'applicazione self-host del token heading (l'hero-title=display e' coperto da
//    e2e/editorial-skin.spec.ts). theme-style.ts antepone var(--font-fraunces) allo stack: il
//    browser sostituisce la variabile e getComputedStyle restituisce la lista risolta.
//  - AC-DE-103-2: caricando la pagina NESSUNA richiesta di rete va a un host di font esterno
//    (fonts.gstatic.com / fonts.googleapis.com); i .woff2 sono serviti da 'self' (/_next/static/
//    media), cioe' dallo stesso host dell'app — la CSP font-src 'self' resta intatta.
// Stesso pattern di seed e contesto anon dei test DE-101/DE-102 qui sopra.
test.describe('DE-103 font self-host mappati ai token del tema su /s/<slug> (AC-DE-103-1, AC-DE-103-2)', () => {
  const seededSites: string[] = [];
  test.afterAll(async () => {
    for (const siteId of seededSites) await cleanupSite(siteId);
  });

  /** Semina un sito pubblicato col tema fissato e ritorna il suo public slug. Stesso percorso reale
   * (parseDocument, seedGenerationWithDocument, seedPublication) dei test qui sopra. */
  async function seedPublishedSite(kind: string): Promise<string> {
    const { accountId } = testUser();
    const suffix = randomUUID().slice(0, 8);
    const siteId = await seedSite({
      accountId,
      name: `E2E visual skin ${kind} ${suffix}`,
      slug: `e2e-visual-skin-${kind}-site-${suffix}`,
    });
    seededSites.push(siteId);

    const base = buildInnocuousDocument();
    const parsed = parseDocument({ ...base, theme_id: 'sole-mediterraneo@1' });
    if (!parsed.ok) {
      throw new Error(`fixture visual-skin DE-103 ${kind}: il documento con theme_id fissato non ha superato parseDocument`);
    }
    const doc = parsed.document;

    const genId = await seedGenerationWithDocument({
      accountId,
      siteId,
      document: doc,
      status: 'complete',
      chosenVariant: 0,
    });
    const publicSlug = `e2e-visual-skin-${kind}-${suffix}`;
    await seedPublication({
      accountId,
      siteId,
      sourceGenerationId: genId,
      document: doc,
      publicSlug,
      locale: 'it',
    });
    return publicSlug;
  }

  test('il font-family computato di un elemento heading (brand) risolve alla famiglia di catalogo (Playfair Display), non al fallback di sistema', async ({
    page,
  }) => {
    // given: un sito pubblicato col tema sole-mediterraneo@1, il cui stack heading e' 'Fraunces, ...'.
    const publicSlug = await seedPublishedSite('font');

    // when: si visita la pagina pubblica da ANON.
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-103-1

    // then: il font-family COMPUTATO del NOME dell'attivita' (`p.site-hero__brand`, che applica ancora
    // var(--site-font-heading) — l'<h1> hero sotto la pelle editoriale usa invece la famiglia DISPLAY,
    // DE11-103) contiene la famiglia HEADING di catalogo del tema. Il valore risolto e' la lista
    // `var(--font-fraunces) sostituita, Fraunces, Georgia, serif`: contiene 'fraunces' (dalla famiglia
    // self-host e dal fallback del tema) e NON e' il solo fallback di sistema. Se i font non fossero
    // caricati e la variabile non mappata, il brand cadrebbe su 'Georgia, serif' e 'fraunces' non
    // comparirebbe.
    const heroBrand = page.locator('p.site-hero__brand');
    await expect(heroBrand).toBeVisible();
    const fontFamily = (
      await heroBrand.first().evaluate((element) => getComputedStyle(element).fontFamily)
    ).toLowerCase();
    // DS-V2-D1: le palette di Claude Design usano Playfair Display come famiglia HEADING (e display);
    // il tema fissato sole-mediterraneo@1 risolve via alias a trattoria-rustica@1 (CD).
    expect(fontFamily).toContain('playfair display'); // covers: AC-DE-103-1
    expect(fontFamily).not.toBe('georgia, serif'); // covers: AC-DE-103-1
    expect(fontFamily).not.toBe('serif'); // covers: AC-DE-103-1

    // PIN DEL DELIVERABLE (DE-103 #2): theme-style antepone var(--font-fraunces) allo stack. next/font
    // (self-host) genera, ACCANTO alla famiglia reale 'Fraunces', una fallback a metriche corrette
    // chiamata 'Fraunces Fallback' — e la variabile vale ["Fraunces", "Fraunces Fallback"]. Quel nome
    // di fallback compare nel font-family COMPUTATO del brand SOLO se la variabile next/font e' applicata
    // all'elemento. Se il prepend fosse rimosso, --site-font-heading resterebbe lo stack grezzo del tema
    // ('Fraunces, Georgia, serif'), PRIVO di 'Fraunces Fallback', e questa asserzione cadrebbe: e' cio'
    // che distingue "font self-host APPLICATO all'elemento" da "famiglia del tema soltanto nominata" (il
    // buco che 'contiene fraunces' non chiudeva, perche' 'Fraunces' e' gia' nello stack del tema).
    expect(fontFamily).toContain('playfair display fallback'); // covers: AC-DE-103-1

    // e a conferma che il font e' davvero CARICATO (self-host, non solo nominato): document.fonts
    // dichiara una face della famiglia (next/font inietta @font-face col nome generato '__Fraunces_*').
    const loadedFamilies = await page.evaluate(async () => {
      await document.fonts.ready;
      return Array.from(document.fonts).map((face) => face.family.toLowerCase());
    });
    expect(loadedFamilies.some((family) => family.includes('fraunces'))).toBe(true); // covers: AC-DE-103-1
  });

  test('nessuna richiesta di font a un host esterno: i font sono serviti da self', async ({ page }) => {
    // given: un sito pubblicato col tema del catalogo.
    const publicSlug = await seedPublishedSite('csp');

    // AGGANCIO le osservabili di rete PRIMA della navigazione: page.on('request') registrato ora
    // cattura ogni richiesta del caricamento, comprese quelle dei .woff2.
    const observables = await attachObservables(page);

    // when: si visita la pagina pubblica e si lascia stabilizzare la rete (i font si caricano).
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-103-2
    await page.waitForLoadState('networkidle');

    // L'host dell'app, derivato dall'URL corrente (non hardcoded): i font self-host vengono da qui.
    const appHost = new URL(page.url()).host;

    // then (1): ZERO richieste verso un host di font esterno. Se qualcuno reintroducesse un <link> a
    // Google Fonts o un @import, la richiesta a fonts.gstatic.com/googleapis.com comparirebbe qui.
    const externalFontHosts = observables.requests
      .map((request) => request.host)
      .filter((host) => /(^|\.)fonts\.gstatic\.com$/i.test(host) || /(^|\.)fonts\.googleapis\.com$/i.test(host));
    expect(externalFontHosts).toEqual([]); // covers: AC-DE-103-2

    // then (2): ogni richiesta di tipo 'font' e' servita dallo stesso host dell'app ('self'), mai da
    // un host esterno — e' la forma positiva della CSP font-src 'self'.
    const offHostFontRequests = observables.requests
      .filter((request) => request.resourceType === 'font')
      .filter((request) => request.host !== appHost);
    expect(offHostFontRequests).toEqual([]); // covers: AC-DE-103-2

    // then (3, ANTI-VACUITA'): un font self-host E' stato DAVVERO richiesto dall'host dell'app
    // (/_next/static/media), cosi' le due negative qui sopra non passano per vacuita' (nessun font
    // chiesto). Il match e' robusto: resourceType 'font' OPPURE un URL woff2/ttf/otf sotto
    // _next/static/media sullo stesso host — se i font non fossero applicati/preloadati cadrebbe.
    const selfFontRequests = observables.requests.filter(
      (request) =>
        request.host === appHost &&
        (request.resourceType === 'font' ||
          /\/_next\/static\/media\/[^?]*\.(woff2?|ttf|otf)(\?|$)/i.test(request.url)),
    );
    expect(selfFontRequests.length).toBeGreaterThan(0); // covers: AC-DE-103-2
  });
});

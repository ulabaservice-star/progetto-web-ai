import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { seedSite, seedGenerationWithDocument, seedPublication, cleanupSite } from './support/seed';
import { USER_FILE, type TestUser } from './support/paths';
import { buildInnocuousDocument } from './fixtures/innocuous-document';
import { attachObservables } from './support/effect-assertions';
import { parseDocument } from '@/domain/generation/document';

// DE11-102 (macrotask editorial-skin) — IL FONT DISPLAY SELF-HOST provato A RUNTIME sulla rotta
// PUBBLICA e ANON /s/<slug>. site-fonts.ts dichiara la serif DIDONE (Playfair Display) via next/font a
// livello di modulo e la mappa alla variabile --font-playfair-display; theme-style la antepone allo
// stack `display` del tema (--site-font-display). Questo spec misura in un browser vero che il TITOLO
// dell'hero adotta la famiglia display CARICATA (non un fallback di sistema) e che nessun font parte
// verso un host esterno (CSP font-src 'self' intatta, deploy-hardening T-3). Le asserzioni DERIVANO
// dagli acceptance_criteria, ognuna taggata `// covers: AC-DE11-102-n` sulla riga dell'expect.
//
// DIPENDENZA D'ORDINE (importante): l'<h1> hero applica --site-font-DISPLAY solo DOPO che DE11-103 la
// scrive in site.css sui titoli. Fino ad allora il titolo usa --site-font-heading (Fraunces per il
// tema fissato) e questo spec sarebbe rosso. E' voluto: l'orchestratore lo esegue AL CONFINE del
// macrotask, quando 101+102+103 sono tutti in albero. Questo file e' SOLO test: zero modifiche a src/.
// Modellato su e2e/visual-skin.spec.ts (DE-103), che prova la STESSA meccanica sul font HEADING.

// CONTESTO ANON (RLS anon-published): la pagina NON ha sessione — lo storageState di file (utente
// autenticato del globalSetup) e' SOSTITUITO da uno vuoto, cosi' /s/<slug> e' servita al ruolo Postgres
// `anon` e il documento arriva SOLO perche' is_published=true. Il viewport e' fissato a 1280x720
// (desktop, come pretende il given di AC-DE11-102-1).
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1280, height: 720 } });

/** L'utente di test provisionato dal globalSetup. Letto NEL test (mai a import-time, per --list). */
function testUser(): TestUser {
  return JSON.parse(readFileSync(USER_FILE, 'utf8')) as TestUser;
}

test.describe('DE11-102 font display self-host su /s/<slug> (AC-DE11-102-1, AC-DE11-102-2)', () => {
  // Isolamento fra i casi: il teardown globale cancella comunque l'utente (CASCADE), questo tiene
  // pulite le tabelle (sites -> generations/publications via FK cascade) fra un run e l'altro.
  const seededSites: string[] = [];
  test.afterAll(async () => {
    for (const siteId of seededSites) await cleanupSite(siteId);
  });

  /**
   * Semina un sito PUBBLICATO col documento INNOCUO reale (percorso resolveVariantHome -> parseDocument)
   * e il tema di catalogo sole-mediterraneo@1, il cui stack `display` e' 'Playfair Display, Georgia,
   * serif'. Ritorna il public slug. `public_slug` e slug del sito sono NAMESPACED con randomUUID (unici
   * globali, DB condiviso). Stesso percorso reale dei test visual-skin.
   */
  async function seedPublishedSite(kind: string): Promise<string> {
    const { accountId } = testUser();
    const suffix = randomUUID().slice(0, 8);
    const siteId = await seedSite({
      accountId,
      name: `E2E editorial skin ${kind} ${suffix}`,
      slug: `e2e-editorial-skin-${kind}-site-${suffix}`,
    });
    seededSites.push(siteId);

    const base = buildInnocuousDocument();
    const parsed = parseDocument({ ...base, theme_id: 'sole-mediterraneo@1' });
    if (!parsed.ok) {
      throw new Error(`fixture editorial-skin ${kind}: il documento con theme_id fissato non ha superato parseDocument`);
    }
    const doc = parsed.document;

    const genId = await seedGenerationWithDocument({
      accountId,
      siteId,
      document: doc,
      status: 'complete',
      chosenVariant: 0,
    });
    const publicSlug = `e2e-editorial-skin-${kind}-${suffix}`;
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

  test('AC-DE11-102-1 — il font-family computato dell hero contiene la famiglia display didone, non solo il fallback di sistema', async ({
    page,
  }) => {
    // given: un sito pubblicato col tema sole-mediterraneo@1, il cui stack `display` e' 'Playfair
    // Display, Georgia, serif'. Dopo DE11-103 l'<h1> hero applica --site-font-display.
    const publicSlug = await seedPublishedSite('applied');

    // when: si visita la pagina pubblica da ANON, viewport desktop.
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE11-102-1

    // then: il font-family COMPUTATO dell'<h1> hero risolve alla famiglia display del catalogo. Il
    // valore risolto e' 'var(--font-playfair-display) sostituita, Playfair Display, Georgia, serif':
    // contiene 'playfair display', e NON e' il solo fallback di sistema. Prima di DE11-103 l'hero
    // userebbe --site-font-heading ('Fraunces, ...'), privo di 'playfair': l'asserzione sarebbe rossa.
    const heroTitle = page.locator('h1.site-hero__title');
    await expect(heroTitle).toBeVisible(); // covers: AC-DE11-102-1
    const fontFamily = (
      await heroTitle.first().evaluate((element) => getComputedStyle(element).fontFamily)
    ).toLowerCase();
    expect(fontFamily).toContain('playfair display'); // covers: AC-DE11-102-1
    expect(fontFamily).not.toBe('georgia, serif'); // covers: AC-DE11-102-1
    expect(fontFamily).not.toBe('serif'); // covers: AC-DE11-102-1

    // PIN DEL DELIVERABLE (DE11-102): theme-style antepone var(--font-playfair-display) allo stack. Come
    // per ogni font next/font (self-host), ACCANTO alla famiglia reale next/font genera una fallback a
    // metriche corrette chiamata 'Playfair Display Fallback' (loader.js: `${fontFamily} Fallback`), e la
    // variabile la include. Quel nome compare nel font-family COMPUTATO dell'h1 SOLO se la variabile
    // next/font e' applicata all'elemento: se il prepend mancasse, --site-font-display resterebbe lo
    // stack grezzo del tema ('Playfair Display, Georgia, serif'), PRIVO di 'playfair display fallback'.
    // E' cio' che distingue "font display self-host APPLICATO al titolo" da "famiglia solo NOMINATA nello
    // stack" (il buco che 'contiene playfair display' da solo non chiuderebbe, perche' e' gia' nello
    // stack del tema come fallback).
    expect(fontFamily).toContain('playfair display fallback'); // covers: AC-DE11-102-1
  });

  test('AC-DE11-102-2 — la famiglia display e LOADED e nessun font parte verso un host esterno (self-host)', async ({
    page,
  }) => {
    // given: un sito pubblicato col tema del catalogo. Le osservabili di rete sono agganciate PRIMA
    // della navigazione, cosi' page.on('request') cattura ogni richiesta del caricamento (i .woff2).
    const publicSlug = await seedPublishedSite('loaded');
    const observables = await attachObservables(page);

    // when: si visita la pagina pubblica e si lascia stabilizzare la rete (i font si caricano).
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE11-102-2
    await page.waitForLoadState('networkidle');

    // then (LOADED): document.fonts espone una face della famiglia display (next/font inietta un
    // @font-face il cui family contiene 'playfair'), ed e' in stato 'loaded' — la face e' pronta all'uso,
    // non solo dichiarata. document.fonts.check sul nome esatto della face LOADED risolve a true.
    const displayFont = await page.evaluate(async () => {
      await document.fonts.ready;
      const faces = Array.from(document.fonts).map((face) => ({
        family: face.family,
        status: face.status,
      }));
      const playfair = faces.filter((face) => face.family.toLowerCase().includes('playfair'));
      const loaded = playfair.filter((face) => face.status === 'loaded');
      // check() sul nome ESATTO della face display caricata: true solo se la face e' pronta (LOADED).
      const checkLoaded =
        loaded.length > 0 ? document.fonts.check(`40px ${JSON.stringify(loaded[0].family)}`) : false;
      return { playfairCount: playfair.length, loadedCount: loaded.length, checkLoaded };
    });
    expect(displayFont.playfairCount).toBeGreaterThan(0); // covers: AC-DE11-102-2
    expect(displayFont.loadedCount).toBeGreaterThan(0); // covers: AC-DE11-102-2
    expect(displayFont.checkLoaded).toBe(true); // covers: AC-DE11-102-2

    // L'host dell'app, derivato dall'URL corrente (non hardcoded): i font self-host vengono da qui.
    const appHost = new URL(page.url()).host;

    // then (host esterno): ZERO richieste verso un host di font esterno. Se qualcuno reintroducesse un
    // <link> a Google Fonts o un @import per la display, la richiesta a fonts.gstatic.com/googleapis.com
    // comparirebbe qui — e la CSP font-src 'self' di /s/ non sarebbe piu' intatta.
    const externalFontHosts = observables.requests
      .map((request) => request.host)
      .filter((host) => /(^|\.)fonts\.gstatic\.com$/i.test(host) || /(^|\.)fonts\.googleapis\.com$/i.test(host));
    expect(externalFontHosts).toEqual([]); // covers: AC-DE11-102-2

    // then (self-host): ogni richiesta di tipo 'font' e' servita dallo STESSO host dell'app ('self'),
    // mai da un host esterno — la forma positiva della CSP font-src 'self'.
    const offHostFontRequests = observables.requests
      .filter((request) => request.resourceType === 'font')
      .filter((request) => request.host !== appHost);
    expect(offHostFontRequests).toEqual([]); // covers: AC-DE11-102-2

    // then (ANTI-VACUITA'): un font self-host E' stato DAVVERO richiesto dall'host dell'app
    // (/_next/static/media), cosi' le due negative qui sopra non passano per vacuita' (nessun font
    // chiesto). Match robusto: resourceType 'font' OPPURE un URL woff2/ttf/otf sotto _next/static/media
    // sullo stesso host.
    const selfFontRequests = observables.requests.filter(
      (request) =>
        request.host === appHost &&
        (request.resourceType === 'font' ||
          /\/_next\/static\/media\/[^?]*\.(woff2?|ttf|otf)(\?|$)/i.test(request.url)),
    );
    expect(selfFontRequests.length).toBeGreaterThan(0); // covers: AC-DE11-102-2
  });
});

// DE11-103 (macrotask editorial-skin) — LE REGOLE TIPOGRAFICHE del DNA provate A RUNTIME sulla rotta
// PUBBLICA e ANON /s/<slug>. site.css (DE11-103) applica --site-font-display sui titoli (superando il
// font-family inline legacy dei blocchi con !important), da' al corpo line-height 1.65, e rende le
// label/eyebrow uppercase col tracking esteso var(--site-tracking-label). Questo spec misura in un
// browser vero l'EFFETTO di quelle regole. Le asserzioni DERIVANO dagli acceptance_criteria, ognuna
// taggata `// covers: AC-DE11-103-n` sulla riga dell'expect. I tag sono COORDINATI con quelli di DE11-102
// qui sopra (102 = AC-DE11-102-*, 103 = AC-DE11-103-*): stesso file, superfici distinte. Solo test: zero
// modifiche a src/.
test.describe('DE11-103 regole tipografiche editoriali su /s/<slug> (AC-DE11-103-1, AC-DE11-103-2)', () => {
  const seededSites: string[] = [];
  test.afterAll(async () => {
    for (const siteId of seededSites) await cleanupSite(siteId);
  });

  /**
   * Semina un sito PUBBLICATO col documento innocuo reale (percorso resolveVariantHome -> parseDocument)
   * e il tema sole-mediterraneo@1 (stack `display` 'Playfair Display, Georgia, serif'; corpo con
   * line-height 1.65 e occhiello tracciato dal foglio). Ritorna il public slug. slug NAMESPACED con
   * randomUUID (unici globali, DB condiviso). Stesso percorso reale del describe DE11-102 qui sopra.
   */
  async function seedPublishedSite(kind: string): Promise<string> {
    const { accountId } = testUser();
    const suffix = randomUUID().slice(0, 8);
    const siteId = await seedSite({
      accountId,
      name: `E2E editorial typo ${kind} ${suffix}`,
      slug: `e2e-editorial-typo-${kind}-site-${suffix}`,
    });
    seededSites.push(siteId);

    const base = buildInnocuousDocument();
    const parsed = parseDocument({ ...base, theme_id: 'sole-mediterraneo@1' });
    if (!parsed.ok) {
      throw new Error(`fixture editorial-typo ${kind}: il documento con theme_id fissato non ha superato parseDocument`);
    }
    const doc = parsed.document;

    const genId = await seedGenerationWithDocument({
      accountId,
      siteId,
      document: doc,
      status: 'complete',
      chosenVariant: 0,
    });
    const publicSlug = `e2e-editorial-typo-${kind}-${suffix}`;
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

  test('AC-DE11-103-1 — l hero usa la famiglia display e il corpo respira a line-height ~1.65', async ({
    page,
  }) => {
    // given: un sito pubblicato col tema sole-mediterraneo@1. site.css mette --site-font-display sui
    // titoli e line-height 1.65 sul corpo (.site-section).
    const publicSlug = await seedPublishedSite('rhythm');

    // when: si visita la pagina pubblica da ANON, viewport desktop.
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE11-103-1

    // then (display sul titolo): il font-family COMPUTATO dell'<h1> hero contiene la famiglia display del
    // catalogo (Playfair Display), non il solo fallback di sistema. E' l'EFFETTO della regola site.css che
    // porta --site-font-display sui titoli superando l'inline heading legacy (!important); prima di
    // DE11-103 il titolo userebbe --site-font-heading ('Fraunces, ...'), privo di 'playfair'.
    const heroTitle = page.locator('h1.site-hero__title');
    await expect(heroTitle).toBeVisible(); // covers: AC-DE11-103-1
    const heroFont = (
      await heroTitle.first().evaluate((element) => getComputedStyle(element).fontFamily)
    ).toLowerCase();
    expect(heroFont).toContain('playfair display'); // covers: AC-DE11-103-1
    expect(heroFont).not.toBe('georgia, serif'); // covers: AC-DE11-103-1

    // then (corpo a ~1.65): una sezione NON-hero porta la line-height del corpo editoriale. La sezione e'
    // il contenitore del corpo e ne detta il ritmo; il suo testo la eredita (i titoli hanno la propria
    // line-height stretta e non ereditano 1.65). getComputedStyle risolve line-height in px, quindi il
    // rapporto line-height/font-size vale ~1.65 a prescindere dalla font-size di root. Il default di una
    // sezione non stilizzata (~1.2) NON cadrebbe in questa banda.
    const bodySection = page
      .locator('section.site-section[data-block-kind]:not([data-block-kind="hero"])')
      .first();
    await expect(bodySection).toBeVisible(); // covers: AC-DE11-103-1
    const bodyRhythm = await bodySection.evaluate((element) => {
      const style = getComputedStyle(element);
      return { lineHeight: parseFloat(style.lineHeight), fontSize: parseFloat(style.fontSize) };
    });
    const ratio = bodyRhythm.lineHeight / bodyRhythm.fontSize;
    expect(ratio).toBeGreaterThan(1.55); // covers: AC-DE11-103-1
    expect(ratio).toBeLessThan(1.75); // covers: AC-DE11-103-1
  });

  test('AC-DE11-103-2 — una label/eyebrow e uppercase con tracking maggiore del corpo', async ({
    page,
  }) => {
    // given: un sito pubblicato col tema del catalogo; il documento innocuo porta un occhiello hero
    // (hero_title_kicker), reso come <p class="site-hero__kicker">.
    const publicSlug = await seedPublishedSite('label');

    // when: si visita la pagina pubblica da ANON.
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE11-103-2

    // then: l'occhiello e' MAIUSCOLO (text-transform computato 'uppercase') e ha un tracking ESTESO. Il
    // letter-spacing computato (px risolti da var(--site-tracking-label)=0.18em) e' MAGGIORE di quello del
    // corpo, che non ha tracking ('normal' => 0 px).
    const kicker = page.locator('.site-hero__kicker').first();
    await expect(kicker).toBeVisible(); // covers: AC-DE11-103-2
    const kickerStyle = await kicker.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        textTransform: style.textTransform,
        letterSpacing: style.letterSpacing,
        fontSize: parseFloat(style.fontSize),
      };
    });
    expect(kickerStyle.textTransform).toBe('uppercase'); // covers: AC-DE11-103-2

    // il tracking del corpo: una sezione non-hero non ne ha (computa 'normal', che si normalizza a 0 px).
    const bodySection = page
      .locator('section.site-section[data-block-kind]:not([data-block-kind="hero"])')
      .first();
    const bodyLetterSpacing = await bodySection.evaluate(
      (element) => getComputedStyle(element).letterSpacing,
    );
    const bodyTracking = bodyLetterSpacing === 'normal' ? 0 : parseFloat(bodyLetterSpacing);
    const kickerTracking =
      kickerStyle.letterSpacing === 'normal' ? 0 : parseFloat(kickerStyle.letterSpacing);
    expect(kickerTracking).toBeGreaterThan(0); // covers: AC-DE11-103-2
    expect(kickerTracking).toBeGreaterThan(bodyTracking); // covers: AC-DE11-103-2

    // PIN DEL DELIVERABLE DE11-103: il tracking dell'occhiello viene DAVVERO da var(--site-tracking-label)
    // (0.18em, DE11-101), non dal tracking base di v1 (0.08em, site.css .site-hero__kicker). letter-spacing
    // in em scala con la font-size dell'elemento, quindi il rapporto letter-spacing/font-size vale ~0.18 e
    // supera 0.12; se si rimuovesse la regola DE11-103 (.site-hero__kicker { letter-spacing:
    // var(--site-tracking-label) }), l'occhiello tornerebbe a 0.08em (rapporto 0.08 < 0.12) e questa
    // asserzione cadrebbe. E' cio' che distingue il tracking EDITORIALE dal default di v1: senza questo
    // pin la mutazione "togli la regola tracking" sopravviverebbe (il test resta verde a 0.08em uppercase).
    const kickerEmRatio = kickerTracking / kickerStyle.fontSize;
    expect(kickerEmRatio).toBeGreaterThan(0.12); // covers: AC-DE11-103-2
  });
});

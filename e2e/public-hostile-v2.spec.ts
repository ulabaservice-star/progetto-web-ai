import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  attachObservables,
  assertNoInjectionEffect,
  readInjectionCounter,
} from './support/effect-assertions';
import {
  seedSite,
  seedGenerationWithDocument,
  seedAsset,
  seedPublication,
  cleanupSite,
} from './support/seed';
import { USER_FILE, type TestUser } from './support/paths';
import {
  buildRichHostileDocument,
  nearCollisionUuids,
  HOSTILE_PAYLOADS,
  ATTACKER_HOST,
  JSONLD_BREAKOUT_PAYLOAD,
} from './fixtures/hostile-brief';
import { insecureCanaryHtml } from './canary/insecure-canary';
import { assetPublicUrl } from '@/config/storage';

// DV2-602 (macrotask e2e-visual-v2, design-engine-v2) — ANTI-INJECTION sui NUOVI BLOCCHI RICCHI di v2,
// asserita sull'EFFETTO sulla rotta PUBBLICA e ANON /s/<slug>. E' l'estensione di T-417 (public-hostile,
// P4) alla superficie v2: quel test gia' gira sul codice v2, ma il suo documento ostile — un brief senza
// `hours`/`description` — non fa esistere ORARI ne CHI-SIAMO. Qui il brief ostile RICCO (buildRichHostileDocument)
// fa rendere TUTTI i blocchi ricchi con superficie di rischio — hero (foto uploaded), offerte (i sei payload),
// ORARI (payload nel valore, reso come testo), CONTATTI (social javascript:, mappa di catalogo senza risorse),
// header/footer CHROME (nome + recapiti derivati) — e prova che NESSUNO produce effetto d'iniezione, con lo
// STESSO oracolo condiviso di T-240 (assertNoInjectionEffect) e un CANARY che lo rende ROSSO. Misura l'EFFETTO
// (contatore, richieste col loro host, navigazioni), non la forma. Le asserzioni derivano da AC-DV2-602-1..3.

// CONTESTO ANON (RLS anon-published, P4): storageState vuoto -> la rotta /s/<slug> e' servita al ruolo
// Postgres `anon`, e il documento arriva SOLO perche' is_published=true.
test.use({ storageState: { cookies: [], origins: [] } });

const APP_HOST = '127.0.0.1:3000';

/** L'host pubblico dello Storage, DERIVATO dall'URL che l'app costruisce per l'asset (mai una porta a mano). */
function storageHostOf(assetId: string): string {
  return new URL(assetPublicUrl(assetId)).host;
}

/** L'utente di test provisionato dal globalSetup. Letto NEL test (mai a import-time, per --list). */
function testUser(): TestUser {
  return JSON.parse(readFileSync(USER_FILE, 'utf8')) as TestUser;
}

test.describe('DV2-602 documento ostile RICCO su /s/ — i blocchi ricchi v2 senza effetto (AC-DV2-602-1/2)', () => {
  // Isolamento fra i casi: il teardown globale cancella comunque l'utente (CASCADE), questo tiene pulite
  // le tabelle (sites -> assets/publications/generations via FK cascade) fra un run e l'altro.
  const seededSites: string[] = [];
  test.afterAll(async () => {
    for (const siteId of seededSites) await cleanupSite(siteId);
  });

  test('hero/menu/orari/contatti/chrome ostili non eseguono nulla, non chiamano host esterni, non navigano', async ({
    page,
  }) => {
    // given: un sito, DUE asset near-collision (>1 elemento, DISCORDANTI, uno prefisso dell'altro), un
    // documento PUBBLICATO ostile RICCO (hero uploaded + orari/chi-siamo/contatti ostili + chrome), e una
    // riga is_published=true. Percorso reale (buildRichHostileDocument -> parseDocument); slug NAMESPACED.
    const { accountId } = testUser();
    const suffix = randomUUID().slice(0, 8);
    const siteId = await seedSite({
      accountId,
      name: `E2E public ostile v2 ${suffix}`,
      slug: `e2e-public-ostile-v2-${suffix}`,
    });
    seededSites.push(siteId);

    const { used, sibling } = nearCollisionUuids();
    await seedAsset({ accountId, siteId, assetId: used });
    await seedAsset({ accountId, siteId, assetId: sibling });

    const doc = buildRichHostileDocument(used);
    const genId = await seedGenerationWithDocument({
      accountId,
      siteId,
      document: doc,
      status: 'complete',
      chosenVariant: 0,
    });
    const publicSlug = `e2e-public-hostile-v2-${suffix}`;
    await seedPublication({ accountId, siteId, sourceGenerationId: genId, document: doc, publicSlug, locale: 'it' });

    // ALLOWLIST DICHIARATA: app host + host Storage DERIVATO dallo stesso builder; ESCLUDE l'attaccante.
    const storageHost = storageHostOf(used);
    const allowedHosts = [APP_HOST, storageHost];

    // Osservabili agganciate PRIMA della navigazione (sentinella a 0, richieste, console, navigazioni).
    const observables = await attachObservables(page);
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DV2-602-1
    const publicUrl = page.url();

    // AC-DV2-602-1 (RETE ANTI-PLACEBO) — TUTTI E SEI i payload presenti come CONTENUTO TESTUALE: la
    // superficie ricca li esercita davvero (non passa perche' il testo ostile e' stato scartato a monte).
    const bodyText = await page.evaluate(() => document.body?.textContent ?? '');
    const payloads = Object.values(HOSTILE_PAYLOADS);
    expect(payloads).toHaveLength(6); // covers: AC-DV2-602-1
    for (const payload of payloads) {
      expect(bodyText).toContain(payload); // covers: AC-DV2-602-1
    }
    // il breakout del JSON-LD (nel business_name) e' reso come TESTO (hero/header brand), non eseguito.
    expect(bodyText).toContain(JSONLD_BREAKOUT_PAYLOAD); // covers: AC-DV2-602-1

    // I BLOCCHI RICCHI v2 sono TUTTI presenti: la superficie e' esercitata, non saltata. Orari e chi-siamo
    // sono i NUOVI (T-417 non li rendeva, il suo brief non aveva hours/description).
    await expect(page.locator('.site-hero-v2')).toBeVisible(); // hero // covers: AC-DV2-602-1
    expect(await page.locator('.site-menu-v2').count()).toBe(1); // offerte // covers: AC-DV2-602-1
    expect(await page.locator('.site-hours-v2').count()).toBe(1); // ORARI (nuovo) // covers: AC-DV2-602-1
    expect(await page.locator('.site-about-v2').count()).toBe(1); // CHI-SIAMO (nuovo) // covers: AC-DV2-602-1
    expect(await page.locator('.site-contact-v2').count()).toBe(1); // contatti // covers: AC-DV2-602-1
    expect(await page.locator('header.site-header-v2').count()).toBe(1); // chrome header // covers: AC-DV2-602-1
    expect(await page.locator('footer.site-footer-v2').count()).toBe(1); // chrome footer // covers: AC-DV2-602-1

    // AC-DV2-602-1 — il contatore globale che un'iniezione riuscita incrementerebbe e' ZERO: nessuno
    // script del brief/JSON-LD/valore-orario ha eseguito (ognuno TENTA di incrementarlo).
    expect(await readInjectionCounter(page)).toBe(0); // covers: AC-DV2-602-1

    // ORARI (nuovo blocco ricco) — il valore ostile e' reso come TESTO in .site-hours-v2__value (SiteText,
    // escaping React): il payload compare come testo, e non c'e' alcun <a> href (gli orari non hanno link).
    const hoursText = await page.locator('.site-hours-v2').first().evaluate((el) => el.textContent ?? '');
    expect(hoursText).toContain(HOSTILE_PAYLOADS.scriptTag); // covers: AC-DV2-602-1
    expect(await page.locator('.site-hours-v2 a').count()).toBe(0); // covers: AC-DV2-602-1

    // CONTATTI (v2) — NESSUN href nasce dal testo libero (AC-DV2-602-1): il social `javascript:` resta un
    // <span> (safeHttpsHref lo rifiuta), non un <a href="javascript:">. La MAPPA e' un box di catalogo
    // (.site-photo-ph): NESSUN <img>/src/href, le coordinate solo in data-geo-*.
    expect(await page.locator('.site-contact-v2 a[href^="javascript:"]').count()).toBe(0); // covers: AC-DV2-602-1
    const socialChips = page.locator('.site-contact-v2__social');
    expect(await socialChips.count()).toBeGreaterThan(0); // i social ostili sono resi (come span) // covers: AC-DV2-602-1
    const map = page.locator('.site-contact-v2__map').first();
    expect(await map.count()).toBeGreaterThan(0); // covers: AC-DV2-602-1
    expect(await page.locator('.site-contact-v2__map img').count()).toBe(0); // catalogo, non risorsa esterna // covers: AC-DV2-602-1
    expect(await page.locator('.site-contact-v2__map [src]').count()).toBe(0); // covers: AC-DV2-602-1

    // NESSUN href `javascript:` in TUTTA la pagina (copre contatti + hero CTA + chrome): la sanificazione
    // degli href vale su OGNI superficie, non solo su una.
    expect(await page.locator('a[href^="javascript:"]').count()).toBe(0); // covers: AC-DV2-602-1

    // PhotoPlaceholder/SVG di catalogo, mai risorse esterne: gli UNICI <img> della pagina hanno src verso
    // il NOSTRO host Storage (l'asset uploaded), costruito dall'asset_id ESATTO — mai un host di terzi.
    const imgs = page.locator('img');
    const imgCount = await imgs.count();
    for (let i = 0; i < imgCount; i += 1) {
      const src = (await imgs.nth(i).getAttribute('src')) ?? '';
      expect(new URL(src, publicUrl).host).toBe(storageHost); // covers: AC-DV2-602-1
    }
    // l'<img> uploaded dell'hero ha src verso l'asset ESATTO (uguaglianza, non prefisso: near-collision).
    const heroImg = page.locator(`img[data-image-asset="${used}"]`);
    expect(await heroImg.count()).toBe(1); // covers: AC-DV2-602-1
    const heroSrc = await heroImg.getAttribute('src');
    expect(heroSrc).toBe(assetPublicUrl(used)); // covers: AC-DV2-602-1
    expect(heroSrc?.endsWith(sibling)).toBe(false); // identita' esatta, mai prefisso // covers: AC-DV2-602-1

    // AC-DV2-602-2 (ALLOWLIST HOST) — nessuna richiesta verso un host fuori dall'allowlist DICHIARATA; in
    // particolare NESSUNA verso l'host attaccante. La raccolta NON e' vuota (documento + immagine asset).
    const requestedHosts = observables.requests.map((r) => r.host).filter((h) => h.length > 0);
    expect(requestedHosts.length).toBeGreaterThan(0); // non vacuo // covers: AC-DV2-602-2
    const allowed = new Set<string>(allowedHosts);
    const offHost = [...new Set(requestedHosts.filter((h) => !allowed.has(h)))];
    expect(offHost).toEqual([]); // covers: AC-DV2-602-2
    expect(requestedHosts.includes(ATTACKER_HOST)).toBe(false); // covers: AC-DV2-602-2
    expect(requestedHosts.includes(storageHost)).toBe(true); // l'allowlist e' ESERCITATA // covers: AC-DV2-602-2

    // AC-DV2-602-1 — nessuna navigazione, nessun errore attribuibile a codice iniettato.
    expect(page.url()).toBe(publicUrl); // covers: AC-DV2-602-1
    const injectedConsoleErrors = observables.consoleErrors.filter(
      (e) => !/failed to load resource/i.test(e.text),
    );
    expect(injectedConsoleErrors).toEqual([]); // covers: AC-DV2-602-1
    expect(observables.pageErrors).toEqual([]); // covers: AC-DV2-602-1

    // L'ORACOLO CONDIVISO di T-240 — lo STESSO assertNoInjectionEffect che il canary (AC-DV2-602-3) fa
    // FALLIRE, sulla superficie ricca NON fallisce, con l'allowlist dichiarata e l'URL /s/ atteso.
    await expect(
      assertNoInjectionEffect(page, observables, { allowedHosts, expectedUrl: publicUrl }),
    ).resolves.toBeUndefined(); // covers: AC-DV2-602-1, AC-DV2-602-2
  });
});

test.describe('DV2-602 canary — lo STESSO oracolo diventa ROSSO sulla stessa allowlist (AC-DV2-602-3)', () => {
  test('il canary insicuro montato via setContent fa FALLIRE lo stesso assertNoInjectionEffect', async ({
    page,
  }) => {
    // given: le osservabili agganciate, poi il canary insicuro montato (page.setContent, MAI una rotta app
    // — il marker di confinamento resta in e2e/canary). Si monta lo STESSO payload che la pagina ricca ha
    // reso INERTE (HOSTILE_PAYLOADS.eventAttribute), stavolta attraverso il SINK innerHTML: cio' che
    // distingue il verde del reale dal rosso del canary e' il SINK, non il payload.
    const observables = await attachObservables(page);
    await page.setContent(insecureCanaryHtml(HOSTILE_PAYLOADS.eventAttribute));
    const contentUrl = page.url();

    // La STESSA allowlist dichiarata del reale (host Storage DERIVATO da assetPublicUrl, dipende dall'env
    // non dall'id): l'oracolo diventa rosso con la STESSA allowlist, non una piu' stretta scritta ad hoc.
    const allowedHosts = [APP_HOST, storageHostOf(randomUUID())];

    // Sanity: l'iniezione e' AVVENUTA (il payload onerror ha eseguito). Se fosse zero, AC-DV2-602-3 sarebbe
    // vacuo (il canary non starebbe iniettando).
    expect(await readInjectionCounter(page)).toBeGreaterThan(0); // covers: AC-DV2-602-3

    // then: lo STESSO helper (e la STESSA allowlist) usato dallo scenario reale FALLISCE sul canary.
    await expect(
      assertNoInjectionEffect(page, observables, { allowedHosts, expectedUrl: contentUrl }),
    ).rejects.toThrow(/effetto d'iniezione rilevato/); // covers: AC-DV2-602-3
  });
});

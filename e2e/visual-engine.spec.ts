import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  seedSite,
  seedGenerationWithDocument,
  seedPublication,
  seedAsset,
  cleanupSite,
} from './support/seed';
import { USER_FILE, type TestUser } from './support/paths';
import {
  attachObservables,
  assertNoInjectionEffect,
  readInjectionCounter,
} from './support/effect-assertions';
import { buildInnocuousDocument } from './fixtures/innocuous-document';
import {
  buildPublishedHostileDocument,
  nearCollisionUuids,
  HOSTILE_PAYLOADS,
} from './fixtures/hostile-brief';
import { insecureCanaryHtml } from './canary/insecure-canary';
import { parseDocument } from '@/domain/generation/document';
import { assetPublicUrl } from '@/config/storage';

// DE-401 (macrotask e2e-visual) — IL MOTORE DI DESIGN PROVATO A RUNTIME sulla rotta PUBBLICA e ANON
// /s/<slug>. I macrotask precedenti (visual-skin DE-1xx, design-select DE-2xx, effects-runtime DE-3xx)
// hanno DICHIARATO nel markup la pelle, la varieta' di layout e gli effetti; questo spec misura in un
// browser vero cio' che PRIMA era solo un data-attribute o una regola CSS. Le asserzioni DERIVANO dai
// cinque acceptance_criteria (mai inventate), ognuna taggata `// covers: AC-DE-401-n` sulla RIGA
// dell'expect. Il verde vale SOLO perche' i DUE canary (PELLE e ANTI-INJECTION) sanno diventare ROSSI.
//
// Questo file e' SOLO test: zero modifiche a src/. Riusa l'harness P4 (seed service_role, oracolo
// condiviso dell'effetto, canary confinato, fixture ostile) — non re-implementa nulla. E' modellato su
// e2e/visual-skin.spec.ts (pelle), e2e/effects.spec.ts (effetti) e e2e/public-hostile.spec.ts
// (anti-injection) per seed e contesto, ma qui ogni AC e' una singola asserzione di runtime.

// CONTESTO ANON (RLS anon-published, A01:2025): la pagina NON ha sessione — lo storageState di file
// (utente autenticato del globalSetup) e' SOSTITUITO da uno vuoto, cosi' /s/<slug> e' servita al ruolo
// Postgres `anon` e il documento arriva SOLO perche' is_published=true. Il viewport e' fissato a
// 1280x720: la misura del clamp tipografico e la posizione della piega sono deterministiche.
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1280, height: 720 } });

// L'app host dell'auth locale (site_url della config Playwright). L'host dello Storage NON e'
// hardcoded: e' DERIVATO da assetPublicUrl (lo STESSO builder che l'app usa per l'src dell'immagine),
// cosi' l'allowlist e la pagina parlano dello stesso host anche se la porta cambiasse.
const APP_HOST = '127.0.0.1:3000';

/** L'host pubblico dello Storage, DERIVATO dall'URL che l'app costruisce per l'asset (mai una porta
 *  scritta a mano): dipende solo da NEXT_PUBLIC_SUPABASE_URL, non dall'id. */
function storageHostOf(assetId: string): string {
  return new URL(assetPublicUrl(assetId)).host;
}

/** L'utente di test provisionato dal globalSetup. Letto NEL test (mai a import-time, per --list). */
function testUser(): TestUser {
  return JSON.parse(readFileSync(USER_FILE, 'utf8')) as TestUser;
}

// Isolamento fra i casi: il teardown globale cancella comunque l'utente (CASCADE), questo tiene pulite
// le tabelle (sites -> generations/publications/assets via FK cascade) fra un run e l'altro.
const seededSites: string[] = [];
test.afterAll(async () => {
  for (const siteId of seededSites) await cleanupSite(siteId);
});

/**
 * Semina un sito PUBBLICATO col documento INNOCUO reale (percorso resolveVariantHome -> parseDocument),
 * il tema di catalogo sole-mediterraneo@1, e — quando richiesto — un hero-layout e/o un effect_level
 * ESPLICITI congelati nel documento (parseDocument normalizza al default centrato@1 / L1 se assenti,
 * quindi per un valore DIVERSO dal default va imposto). Ritorna il public slug. `public_slug` e slug
 * del sito sono NAMESPACED con randomUUID (unici globali, DB condiviso). L'override passa da
 * `parseDocument` (gate in scrittura), cosi' cio' che la rotta rende e' cio' che il gate ha lasciato.
 */
async function seedPublishedSite(opts: {
  kind: string;
  heroLayoutId?: string;
  effectLevel?: string;
}): Promise<string> {
  const { accountId } = testUser();
  const suffix = randomUUID().slice(0, 8);
  const siteId = await seedSite({
    accountId,
    name: `E2E visual-engine ${opts.kind} ${suffix}`,
    slug: `e2e-visual-engine-${opts.kind}-site-${suffix}`,
  });
  seededSites.push(siteId);

  // Input come Record<string, unknown>: parseDocument valida comunque, e cosi' hero_layout_id /
  // effect_level entrano come valori DEL DOMINIO senza forzare i tipi del documento sorgente.
  const input: Record<string, unknown> = {
    ...buildInnocuousDocument(),
    theme_id: 'sole-mediterraneo@1',
  };
  if (opts.heroLayoutId !== undefined) input.hero_layout_id = opts.heroLayoutId;
  if (opts.effectLevel !== undefined) input.effect_level = opts.effectLevel;
  const parsed = parseDocument(input);
  if (!parsed.ok) {
    throw new Error(`fixture visual-engine ${opts.kind}: il documento con override non ha superato parseDocument`);
  }
  const doc = parsed.document;

  const genId = await seedGenerationWithDocument({
    accountId,
    siteId,
    document: doc,
    status: 'complete',
    chosenVariant: 0,
  });
  const publicSlug = `e2e-visual-engine-${opts.kind}-${suffix}`;
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

/**
 * L'ORACOLO DELLA PELLE, condiviso fra il reale (AC-DE-401-1, che lo fa PASSARE) e il canary
 * (AC-DE-401-5a, che lo fa FALLIRE): legge la font-size COMPUTATA del titolo hero e LANCIA se sotto la
 * soglia. E' il predicato "hero >= soglia" reso funzione, cosi' che il verde del reale valga solo
 * perche' lo stesso predicato sa diventare rosso su un h1 dal font minuscolo montato via setContent.
 */
async function assertHeroTitleFontSize(page: Page, minPx: number): Promise<void> {
  const fontSizePx = await page
    .locator('h1.site-hero-v2__title')
    .first()
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  if (!(fontSizePx >= minPx)) {
    throw new Error(`assertHeroTitleFontSize: font-size ${fontSizePx}px sotto la soglia ${minPx}px`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-401-1 (PELLE) — sito pubblicato reso su /s/ -> font-size hero >= 40 su .site-hero-v2__title E
// font di catalogo caricato (fontFamily contiene 'playfair display', non un fallback di sistema;
// confermato via document.fonts). E' l'EFFETTO in un browser vero del foglio site.css + del font
// self-host (next/font) mappato sul token del tema, non solo l'attributo dichiarato. NB (DE11-103,
// design-engine-v1.1): la pelle editoriale porta l'<h1> hero alla famiglia DISPLAY (Playfair,
// --site-font-display); questo AC prova ora l'applicazione self-host della display sul titolo grande.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DE-401 AC-DE-401-1 (PELLE) — hero grande e font di catalogo caricato su /s/<slug>', () => {
  test('il titolo hero rende >= 40px con la famiglia display Playfair self-host (non un fallback di sistema)', async ({
    page,
  }) => {
    // given: un sito pubblicato col tema di catalogo (hero-layout di default centrato@1).
    const publicSlug = await seedPublishedSite({ kind: 'pelle' });

    // when: si visita la pagina pubblica da ANON.
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-401-1

    // then (dimensione): l'ORACOLO PELLE non lancia — la font-size computata del titolo hero e' >= 40.
    // getComputedStyle risolve il clamp del foglio (clamp(2rem, 5vw, --site-scale-3xl)) al 3xl del tema
    // su viewport desktop; il default non stilizzato di un <h1> (~32px) non supererebbe la soglia. E' lo
    // STESSO predicato che il canary (a) fa fallire.
    await expect(assertHeroTitleFontSize(page, 40)).resolves.toBeUndefined(); // covers: AC-DE-401-1

    // then (font di catalogo): il font-family COMPUTATO del titolo contiene la famiglia DISPLAY del tema
    // (Playfair Display, DE11-103) e NON e' il solo fallback di sistema — prova che theme-style mappa il
    // token --site-font-display e che il font self-host e' applicato all'elemento, non solo nominato.
    const heroTitle = page.locator('h1.site-hero-v2__title');
    await expect(heroTitle).toBeVisible(); // covers: AC-DE-401-1
    const fontFamily = (
      await heroTitle.first().evaluate((element) => getComputedStyle(element).fontFamily)
    ).toLowerCase();
    expect(fontFamily).toContain('playfair display'); // covers: AC-DE-401-1
    expect(fontFamily).not.toBe('georgia, serif'); // covers: AC-DE-401-1
    expect(fontFamily).not.toBe('serif'); // covers: AC-DE-401-1

    // then (caricamento reale): la PROVA PORTANTE della mappatura tema->font e' la riga sopra (il
    // font-family COMPUTATO dell'hero CONTIENE 'playfair display' e non e' un fallback di sistema). Qui
    // si conferma in PIU' che il webfont Playfair Display e' stato davvero CARICATO (stato loaded), non
    // solo dichiarato: document.fonts.check(...) e' vero SOLO se la face e' pronta all'uso — un fallback
    // di sistema non scaricherebbe nulla. (Nota di rigore: questo check da solo non discrimina il TEMA
    // attivo, perche' next/font registra le variabili di tutte le famiglie del catalogo; a inchiodare
    // l'AC e' :171.)
    const heroWebfontLoaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('40px "Playfair Display"');
    });
    expect(heroWebfontLoaded).toBe(true); // covers: AC-DE-401-1
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-401-2 (VARIETA, MIGRATO a Hero v2 / DV2-202) — due varianti con hero_layout DIVERSI rese su /s/
// hanno STRUTTURA computata distinta (non solo colore/attributo). In v2 la varieta' non e' piu' nel display
// della .site-section (regole site.css [data-hero-layout] di v1.1) ma nella STRUTTURA della variante Claude
// Design: centrato@1 -> 'fullCentrato' (foto full-bleed di SFONDO, position:absolute), split@1 -> 'split'
// (foto INCORNICIATA affiancata, position:relative). DISCIPLINA FIXTURE: TRE varianti con valori DISCORDANTI
// e un id PREFISSO-CONFONDIBILE — centrato@1, split@1, e centrato-foto@1 (condivide lo STEM 'centrato'). Si
// prova (a) che la posizione-foto di centrato@1 (absolute) DIFFERISCE da split@1 (relative), varieta'
// STRUTTURALE reale; (b) che centrato-foto@1 NON e' confuso con centrato@1 — l'id ESATTO alla radice, mai lo
// stem, e per giunta un layout diverso (centrato-foto@1 -> 'split').
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DE-401 AC-DE-401-2 (VARIETA) — hero_layout diversi -> struttura computata distinta su /s/<slug>', () => {
  /** Legge la POSITION COMPUTATA del placeholder foto dell'hero (l'asse strutturale che distingue le varianti
   *  Claude Design in v2: foto di SFONDO full-bleed = absolute vs foto INCORNICIATA = relative), piu' l'id di
   *  layout ESATTO scritto alla radice del render (.site-view) e alla radice del blocco hero. Il confronto e'
   *  sui VALORI COMPUTATI, non sugli attributi nel markup. */
  async function readHeroLayout(
    page: Page,
    kind: string,
    heroLayoutId: string,
  ): Promise<{ photoPosition: string; rootAttr: string | null; sectionAttr: string | null }> {
    const publicSlug = await seedPublishedSite({ kind, heroLayoutId });
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-401-2

    const hero = page.locator('section[data-block-kind="hero"]').first();
    await expect(hero).toBeVisible(); // covers: AC-DE-401-2
    const photoPosition = await hero
      .locator('.site-photo-ph')
      .first()
      .evaluate((element) => getComputedStyle(element).position);
    const rootAttr = await page.locator('.site-view').getAttribute('data-hero-layout');
    const sectionAttr = await hero.getAttribute('data-hero-layout');
    return { photoPosition, rootAttr, sectionAttr };
  }

  test('centrato@1 (foto sfondo) e split@1 (foto incorniciata) hanno struttura distinta, e centrato-foto@1 non e confuso con centrato@1', async ({
    page,
  }) => {
    // given: TRE siti pubblicati identici tranne l'hero-layout congelato — i tre resi in sequenza.
    const centrato = await readHeroLayout(page, 'var-centrato', 'centrato@1');
    const split = await readHeroLayout(page, 'var-split', 'split@1');
    const centratoFoto = await readHeroLayout(page, 'var-centrato-foto', 'centrato-foto@1');

    // then (varieta' strutturale, Hero v2): centrato@1 -> 'fullCentrato' rende la foto come SFONDO full-bleed
    // (position:absolute), split@1 -> 'split' come foto INCORNICIATA affiancata (position:relative) — due
    // layout computati DISTINTI, non due colori. La position della foto e' la differenza piu' robusta,
    // indipendente dal tema (l'unit test site-hero-v2 AC-DV2-202-3 prova lo stesso asse in isolamento).
    expect(centrato.photoPosition).toBe('absolute'); // covers: AC-DE-401-2
    expect(split.photoPosition).toBe('relative'); // covers: AC-DE-401-2
    expect(centrato.photoPosition).not.toBe(split.photoPosition); // varieta' reale, non solo attributo // covers: AC-DE-401-2

    // then (trappola del prefisso, a livello di RENDER): la radice del render (.site-view) E la radice del
    // blocco hero (.site-hero-v2) portano gli id ESATTI congelati, mai lo stem 'centrato'. In v2 centrato@1
    // (fullCentrato) e centrato-foto@1 (split) rendono per giunta layout DIVERSI (foto absolute vs relative),
    // quindi non sono confusi ne' nell'attributo ne' nella struttura. La discriminazione-per-prefisso della
    // SELEZIONE (heroLayoutFor/selectDesign) vive nel dominio ed e' coperta dagli unit test DV2-201/DE-201.
    expect(centrato.rootAttr).toBe('centrato@1'); // covers: AC-DE-401-2
    expect(split.rootAttr).toBe('split@1'); // covers: AC-DE-401-2
    expect(centratoFoto.rootAttr).toBe('centrato-foto@1'); // id ESATTO verbatim, mai lo stem 'centrato' // covers: AC-DE-401-2
    expect(centratoFoto.sectionAttr).toBe('centrato-foto@1'); // id esatto anche sulla radice del blocco hero (v2) // covers: AC-DE-401-2
    expect(centrato.photoPosition).not.toBe(centratoFoto.photoPosition); // v2: layout DIVERSI (absolute vs relative) // covers: AC-DE-401-2
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-401-3 (EFFETTI) — copertura ESSENZIALE (la profondita' vive in e2e/effects.spec.ts): per
// ciascuno dei tre casi si asserisce il difetto SPECIFICO, ognuno tracciato.
//  (a) motion default -> un [data-reveal] sotto la piega ottiene .is-visible allo scroll;
//  (b) prefers-reduced-motion: reduce -> nessun movimento e contenuto visibile;
//  (c) JS disabilitato -> contenuto visibile (progressive enhancement).
// Il reducedMotion in questa versione di Playwright NON e' una TestOption di primo livello: passa da
// contextOptions.reducedMotion (verso browser.newContext).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DE-401 AC-DE-401-3 (EFFETTI) — motion default: il reveal ottiene .is-visible allo scroll', () => {
  // Preferenza di movimento ESPLICITAMENTE assente: il caso "motion default", indipendente da come e'
  // configurata la macchina che esegue la suite. JS attivo (default del progetto).
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('un [data-reveal] sotto la piega e nascosto finche lo scroll non lo raggiunge, poi e rivelato', async ({
    page,
  }) => {
    // given: un sito pubblicato col livello L1 congelato e il JS attivo.
    const publicSlug = await seedPublishedSite({ kind: 'fx-motion', effectLevel: 'L1' });
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-401-3

    const root = page.locator('.site-view');
    await expect(root).toHaveAttribute('data-effects', 'L1'); // covers: AC-DE-401-3
    // ANTI-VACUITA': l'isola client E' montata (ha scritto il livello effettivo) — quindi la rivelazione
    // qui sotto e' una DECISIONE del JS, non il silenzio di un JS morto.
    await expect(root).toHaveAttribute('data-motion-level', 'L1'); // covers: AC-DE-401-3

    const reveals = page.locator('[data-reveal]');
    const revealCount = await reveals.count();
    expect(revealCount).toBeGreaterThanOrEqual(3); // fixture multi-elemento // covers: AC-DE-401-3
    const ultimo = reveals.nth(revealCount - 1);

    // given (verificato): l'ultimo reveal sta SOTTO LA PIEGA a 1280x720 (pagina non scrollata) ed e'
    // nascosto per davvero (opacity 0: il gate .site-motion-ready e' in vigore) — l'unico posto in cui
    // "entra nel viewport allo scroll" e' una transizione OSSERVABILE, non uno stato gia' pieno.
    const box = await ultimo.boundingBox();
    expect(box?.y ?? 0).toBeGreaterThan(720); // covers: AC-DE-401-3
    await expect(ultimo).toHaveCSS('opacity', '0'); // covers: AC-DE-401-3

    // when: lo scroll porta quel reveal dentro il viewport.
    await ultimo.scrollIntoViewIfNeeded();

    // then: ottiene .is-visible (token esatto) e con essa lo stato pieno.
    await expect(ultimo).toHaveClass(/(^|\s)is-visible(\s|$)/); // covers: AC-DE-401-3
    await expect(ultimo).toHaveCSS('opacity', '1'); // covers: AC-DE-401-3
  });
});

test.describe('DE-401 AC-DE-401-3 (EFFETTI) — reduced-motion: nessun movimento e contenuto visibile', () => {
  // La preferenza e' EMULATA nel contesto; il JS resta ATTIVO (l'utente reale che riduce le animazioni).
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('sotto prefers-reduced-motion i reveal sono interi e fermi, senza stato nascosto', async ({
    page,
  }) => {
    // given: lo stesso sito a L1, ma il browser dichiara la preferenza.
    const publicSlug = await seedPublishedSite({ kind: 'fx-reduce', effectLevel: 'L1' });
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-401-3

    // Il given e' DAVVERO in vigore (senza, tutto il resto passerebbe per il motivo sbagliato).
    const prefersReduce = await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    expect(prefersReduce).toBe(true); // covers: AC-DE-401-3
    await expect(page.locator('.site-view')).toHaveAttribute('data-effects', 'L1'); // covers: AC-DE-401-3
    // ANTI-VACUITA' (parita' col caso motion-default): l'isola client E' montata anche sotto reduce — ha
    // scritto il livello effettivo in data-motion-level. Cosi' il "nessun movimento" qui sotto e' una
    // DECISIONE del JS sotto reduce, non il silenzio di un'isola mai montata.
    await expect(page.locator('.site-view')).toHaveAttribute('data-motion-level', 'L1'); // covers: AC-DE-401-3
    // L'isola monta ma sotto reduce NON mette il gate: senza .site-motion-ready non esiste alcuno stato
    // nascosto da rivelare — il no-op e' sicuro perche' non c'e' nulla da tornare a mostrare.
    expect(await page.locator('.site-motion-ready').count()).toBe(0); // covers: AC-DE-401-3

    const reveals = page.locator('[data-reveal]');
    const revealCount = await reveals.count();
    expect(revealCount).toBeGreaterThanOrEqual(3); // covers: AC-DE-401-3

    // then: contenuto INTERO (visibile, opacity piena) e MOVIMENTO ZERO (transizione azzerata dal
    // @media) su ogni reveal — il difetto specifico del caso reduced-motion.
    for (let index = 0; index < revealCount; index += 1) {
      const reveal = reveals.nth(index);
      await expect(reveal).toBeVisible(); // covers: AC-DE-401-3
      await expect(reveal).toHaveCSS('opacity', '1'); // covers: AC-DE-401-3
      await expect(reveal).toHaveCSS('transition-duration', '0s'); // covers: AC-DE-401-3
    }
  });
});

test.describe('DE-401 AC-DE-401-3 (EFFETTI) — JS disabilitato: il contenuto e visibile (progressive enhancement)', () => {
  // JS DISABILITATO nel contesto: nessuna isola client puo' montare, quindi la radice NON riceve
  // .site-motion-ready PER COSTRUZIONE — il caso del crawler / hydration assente.
  test.use({ javaScriptEnabled: false });

  test('senza JS la radice non ha .site-motion-ready e i reveal restano visibili a opacity piena', async ({
    page,
  }) => {
    // given: un sito pubblicato col livello L1 congelato, servito interamente lato server.
    const publicSlug = await seedPublishedSite({ kind: 'fx-nojs', effectLevel: 'L1' });
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-401-3

    await expect(page.locator('.site-view')).toHaveAttribute('data-effects', 'L1'); // covers: AC-DE-401-3
    // Nessuna isola: la classe che introdurrebbe lo stato nascosto dei reveal non c'e'.
    expect(await page.locator('.site-motion-ready').count()).toBe(0); // covers: AC-DE-401-3

    const reveals = page.locator('[data-reveal]');
    const revealCount = await reveals.count();
    expect(revealCount).toBeGreaterThanOrEqual(3); // covers: AC-DE-401-3

    // then: anche il reveal SOTTO LA PIEGA (il posto in cui uno stato nascosto non voluto resterebbe
    // tale, nessuno scroll a scoprirlo) e' visibile e a opacity piena — il contenuto non dipende dal JS.
    const ultimo = reveals.nth(revealCount - 1);
    const box = await ultimo.boundingBox();
    expect(box?.y ?? 0).toBeGreaterThan(720); // covers: AC-DE-401-3
    await expect(ultimo).toBeVisible(); // covers: AC-DE-401-3
    await expect(ultimo).toHaveCSS('opacity', '1'); // covers: AC-DE-401-3
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-401-4 (ANTI-INJECTION) — un documento pubblicato OSTILE reso su /s/ non altera la SELEZIONE
// DESIGN e non produce alcun effetto d'iniezione. La selezione alla radice resta fatta di id di
// catalogo VALIDI (hero/section: ^[a-z0-9]+(-[a-z0-9]+)*@[0-9]+$; effects: ^L[0-4]$), SENZA payload
// ostile (niente '<', niente attacker.example, niente marker); e l'ORACOLO condiviso dell'effetto da'
// esito NULLO (payload come testo, allowlist [APP_HOST, storageHostOf(used)], expectedUrl = /s/).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DE-401 AC-DE-401-4 (ANTI-INJECTION) — documento ostile: selezione design invariata, effetto nullo', () => {
  const HERO_SECTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*@[0-9]+$/; // id versionato di catalogo
  const EFFECT_LEVEL_ID = /^L[0-4]$/; // enum chiuso dei livelli di effetto

  test('un documento pubblicato ostile con asset uploaded non altera i data-attribute di design ne esegue nulla', async ({
    page,
  }) => {
    // given: un sito, DUE asset reali con id NEAR-COLLISION (>1 elemento, DISCORDANTI, uno prefisso
    // dell'altro: la trappola di prefisso), un documento PUBBLICATO ostile che promuove `used` a hero
    // uploaded e alimenta il JSON-LD col breakout, e una riga is_published=true. Percorso reale
    // (buildPublishedHostileDocument -> parseDocument); slug NAMESPACED.
    const { accountId } = testUser();
    const suffix = randomUUID().slice(0, 8);
    const siteId = await seedSite({
      accountId,
      name: `E2E visual-engine ostile ${suffix}`,
      slug: `e2e-visual-engine-ostile-${suffix}`,
    });
    seededSites.push(siteId);

    const { used, sibling } = nearCollisionUuids();
    await seedAsset({ accountId, siteId, assetId: used });
    await seedAsset({ accountId, siteId, assetId: sibling });

    const doc = buildPublishedHostileDocument(used);
    const genId = await seedGenerationWithDocument({
      accountId,
      siteId,
      document: doc,
      status: 'complete',
      chosenVariant: 0,
    });
    const publicSlug = `e2e-visual-engine-ostile-${suffix}`;
    await seedPublication({
      accountId,
      siteId,
      sourceGenerationId: genId,
      document: doc,
      publicSlug,
      locale: 'it',
    });

    // ALLOWLIST DICHIARATA: app host + host Storage DERIVATO dallo stesso builder; ESCLUDE l'attaccante.
    const allowedHosts = [APP_HOST, storageHostOf(used)];

    // Osservabili agganciate PRIMA della navigazione (sentinella a 0, richieste, console, navigazioni).
    const observables = await attachObservables(page);
    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-401-4
    const publicUrl = page.url();

    // then (selezione design INVARIATA): i data-attribute alla radice sono id di catalogo VALIDI —
    // l'ostilita' del brief non e' colata nella selezione visiva (la scelta nasce da vertical/seed, non
    // dal testo). Ogni id passa la forma attesa, e NESSUNO porta un frammento ostile.
    const root = page.locator('.site-view');
    const heroLayout = (await root.getAttribute('data-hero-layout')) ?? '';
    const sectionTreatment = (await root.getAttribute('data-section-treatment')) ?? '';
    const effects = (await root.getAttribute('data-effects')) ?? '';
    expect(heroLayout).toMatch(HERO_SECTION_ID); // covers: AC-DE-401-4
    expect(sectionTreatment).toMatch(HERO_SECTION_ID); // covers: AC-DE-401-4
    expect(effects).toMatch(EFFECT_LEVEL_ID); // covers: AC-DE-401-4
    const designAttrs = `${heroLayout}|${sectionTreatment}|${effects}`;
    expect(designAttrs.includes('<')).toBe(false); // nessun markup nella selezione // covers: AC-DE-401-4
    expect(designAttrs.includes('attacker.example')).toBe(false); // nessun host ostile // covers: AC-DE-401-4
    for (const payload of Object.values(HOSTILE_PAYLOADS)) {
      expect(designAttrs.includes(payload)).toBe(false); // nessun payload/marker // covers: AC-DE-401-4
    }

    // then (effetto nullo, sanity anti-vacuita'): il contatore che un'iniezione riuscita incrementerebbe
    // e' ZERO, e la pagina HA chiesto qualcosa (documento + immagine dell'asset), cosi' "nessun host
    // esterno" non e' vero solo perche' non si e' raccolto nulla.
    expect(await readInjectionCounter(page)).toBe(0); // covers: AC-DE-401-4
    const requestedHosts = observables.requests.map((request) => request.host).filter((host) => host.length > 0);
    expect(requestedHosts.length).toBeGreaterThan(0); // covers: AC-DE-401-4
    expect(requestedHosts.includes(storageHostOf(used))).toBe(true); // l'allowlist e' ESERCITATA // covers: AC-DE-401-4
    // la near-collision NON confonde l'src dell'<img>: identita' esatta su `used`, mai `sibling`.
    const imgSrc = await page.locator(`img[data-image-asset="${used}"]`).getAttribute('src');
    expect(imgSrc).toBe(assetPublicUrl(used)); // covers: AC-DE-401-4
    expect(imgSrc?.endsWith(sibling)).toBe(false); // covers: AC-DE-401-4

    // then (ORACOLO CONDIVISO): lo STESSO assertNoInjectionEffect che il canary (b) fa FALLIRE, con la
    // STESSA allowlist e l'URL /s/ atteso, qui NON fallisce — nessuno script del brief/JSON-LD ha
    // eseguito, nessuna richiesta fuori allowlist, nessuna navigazione.
    await expect(
      assertNoInjectionEffect(page, observables, { allowedHosts, expectedUrl: publicUrl }),
    ).resolves.toBeUndefined(); // covers: AC-DE-401-4
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-401-5 (CANARY) — il verde vale SOLO perche' gli oracoli sanno diventare ROSSI. DUE canary
// confinati, montati via page.setContent (MAI una rotta app):
//  (a) PELLE — un h1.site-hero-v2__title con font-size minuscolo inline (8px): l'oracolo pelle
//      (fontSize >= 40) FALLISCE davvero;
//  (b) ANTI-INJECTION — il canary insicuro (sink innerHTML) inietta un payload che ESEGUE:
//      assertNoInjectionEffect, lo STESSO helper del reale con la STESSA allowlist, FALLISCE.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DE-401 AC-DE-401-5 (CANARY) — gli oracoli pelle e anti-injection diventano ROSSI', () => {
  test('(a) PELLE — l oracolo fontSize >= 40 FALLISCE su un titolo hero dal font minuscolo', async ({
    page,
  }) => {
    // given: un h1.site-hero-v2__title con font-size 8px inline, montato via setContent (mai una rotta): e'
    // il difetto che l'oracolo pelle deve prendere. Nessuno stile del sito e' caricato, quindi la sola
    // dimensione in gioco e' la font-size deliberatamente minuscola.
    await page.setContent(
      '<!doctype html><html lang="it"><body>' +
        '<h1 class="site-hero-v2__title" style="font-size:8px">Titolo canary</h1>' +
        '</body></html>',
    );

    // then: lo STESSO oracolo pelle usato dal reale (AC-DE-401-1) LANCIA — il predicato fontSize >= 40 e'
    // rosso. Se non sapesse fallire, il verde del reale non proverebbe nulla.
    await expect(assertHeroTitleFontSize(page, 40)).rejects.toThrow(/sotto la soglia/); // covers: AC-DE-401-5
  });

  test('(b) ANTI-INJECTION — assertNoInjectionEffect FALLISCE sul canary insicuro con la STESSA allowlist', async ({
    page,
  }) => {
    // given: le osservabili agganciate, poi il canary insicuro montato via setContent (MAI una rotta —
    // il marker di confinamento resta in e2e/canary). Si monta lo STESSO payload che la pagina pubblica
    // rende INERTE (HOSTILE_PAYLOADS.eventAttribute), stavolta attraverso il SINK innerHTML: cio' che
    // distingue il verde del reale dal rosso del canary e' il SINK, non il payload.
    const observables = await attachObservables(page);
    await page.setContent(insecureCanaryHtml(HOSTILE_PAYLOADS.eventAttribute));
    const contentUrl = page.url();

    // La STESSA allowlist dichiarata del reale: l'host Storage DERIVATO da assetPublicUrl (dipende solo
    // dall'env, non dall'id), cosi' l'oracolo e' rosso con la STESSA allowlist, non una scritta ad hoc.
    const allowedHosts = [APP_HOST, storageHostOf(randomUUID())];

    // Sanity: l'iniezione e' AVVENUTA (il payload onerror ha eseguito). Se fosse zero, AC-DE-401-5b
    // sarebbe vacuo (il canary non starebbe iniettando).
    expect(await readInjectionCounter(page)).toBeGreaterThan(0); // covers: AC-DE-401-5

    // then: lo STESSO helper (e la STESSA allowlist) del reale FALLISCE sul canary — l'oracolo e' rosso.
    await expect(
      assertNoInjectionEffect(page, observables, { allowedHosts, expectedUrl: contentUrl }),
    ).rejects.toThrow(/effetto d'iniezione rilevato/); // covers: AC-DE-401-5
  });
});

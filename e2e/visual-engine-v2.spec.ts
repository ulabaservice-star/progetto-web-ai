import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  seedSite,
  seedGenerationWithDocument,
  seedPublication,
  cleanupSite,
} from './support/seed';
import { USER_FILE, type TestUser } from './support/paths';
import { innocuousHomePool } from './fixtures/innocuous-document';
import { applyBriefUpdate, emptyBrief } from '@/domain/onboarding/brief';
import { resolveVariantHome } from '@/domain/generation/variant-document';
import { parseDocument, type SiteDocument } from '@/domain/generation/document';

// DV2-601 (macrotask e2e-visual-v2, design-engine-v2) — IL GATE FINALE DEL MOTORE v2, a runtime su /s/.
// I macrotask precedenti hanno DICHIARATO nel markup la varieta' (foundation/hero/menu/body-sections) e
// l'hanno CONGELATA nella selezione (variety-select). Qui si misura, in un browser vero e da ANON, che
// le CINQUE varianti REALI di uno stesso seed — prodotte da `resolveVariantHome` -> `selectDesign`, MAI
// documenti costruiti a mano — (a) DIVERGANO davvero sull'asse hero VISIBILE (computed-style) E su >=1
// asse del corpo; (b) mostrino il "wow" strutturale di v2 (hero editoriale con PhotoPlaceholder di
// catalogo, menu card-carta con prezzi + leader-dots, titolo display >= soglia computata); (c) con un
// CANARY confinato che rende ROSSO lo STESSO oracolo di varieta' (hero-layout forzato identico): il
// verde vale solo perche' l'oracolo sa fallire.
//
// SOLO TEST: zero modifiche a src/. Riusa l'harness P4 (seed service_role, rotta /s/ anon, publication).
// Le 5 varianti nascono da `selectDesign(vertical, seed)` DENTRO `resolveVariantHome`: la varieta' non e'
// un vettore di injection (P2-D1) — l'unico ingresso di settore e' `vertical` (enum), il `seed` e' opaco.
// Misura COMPUTED-STYLE (posizione/struttura), non pixel-diff.

// CONTESTO ANON (RLS anon-published, P4): la pagina NON ha sessione — lo storageState di file (utente
// autenticato del globalSetup) e' SOSTITUITO da uno vuoto, cosi' /s/<slug> e' servita al ruolo Postgres
// `anon` e il documento arriva SOLO perche' is_published=true. Viewport fisso 1280x720: la misura del
// clamp tipografico e delle posizioni e' deterministica. reducedMotion 'reduce': l'isola del reveal
// (DE-302) non mette il gate, quindi i blocchi SOTTO LA PIEGA (il corpo) sono a opacita' piena e la loro
// geometria computata e' leggibile senza scroll (progressive-enhancement, DE-401-3).
test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 1280, height: 720 },
  contextOptions: { reducedMotion: 'reduce' },
});

// IL SEED DEL GATE. Opaco per costruzione (id di generazione, mai testo del brief). Scelto perche' le sue
// 5 varianti mappano a 5 VARIANTI Claude Design dell'hero STRUTTURALMENTE distinte (biglietto, fullCentrato,
// full, banda, editorial): la greedy garantisce 5 hero_layout_id distinti per QUALUNQUE seed, ma alcuni id
// legacy collassano sulla stessa variante CD (es. scena-scura@1 e hero-full-centrato@1 -> entrambi
// fullCentrato) — questo seed evita quel collasso, cosi' l'oracolo di varieta' hero non e' vacuo su rumore.
const SEED = 'gate-v2-c';
const VARIANT_COUNT = 5;

// Le soglie dell'oracolo di varieta' (numero MINIMO di firme computed distinte fra le 5 varianti). Tarate
// sul rendering reale (sotto): il reale le supera con margine, il canary (hero identico) crolla a 1.
const HERO_MIN_DISTINCT = 4; // 5 varianti CD hero distinte -> ~5 firme; soglia con margine, canary=1 < 4
const BODY_MIN_DISTINCT = 3; // 5 varianti di corpo (section_layout per-blocco) -> corpo non clonato

/** L'utente di test provisionato dal globalSetup. Letto NEL test (mai a import-time, per --list). */
function testUser(): TestUser {
  return JSON.parse(readFileSync(USER_FILE, 'utf8')) as TestUser;
}

// Isolamento fra i casi: il teardown globale cancella comunque l'utente (CASCADE), questo tiene pulite le
// tabelle (sites -> generations/publications via FK cascade) fra un run e l'altro.
const seededSites: string[] = [];
test.afterAll(async () => {
  for (const siteId of seededSites) await cleanupSite(siteId);
});

/**
 * IL BRIEF PREZZATO di ristorazione — la sorgente reale da cui `resolveVariantHome` deriva i 5 documenti.
 * Ristorazione mostra i prezzi (`OFFERINGS_VARIANTS.ristorazione.show_price === true`, blocks.ts), cosi'
 * il menu rende `.site-menu-v2__price` + i leader-dots (Offerte). DISCIPLINA FIXTURE: quattro offerte,
 * DISCORDANTI, con la trappola del prefisso ('Tagliere' e' PREFISSO di 'Tagliere della casa'), su tre
 * portate (il raggruppamento del menu-sections). Con hours/address/canale/description la home ha hero +
 * offerte + chi-siamo + orari + contatti + cta + faq (materie >= 3), abbastanza corpo per misurarne la varieta'.
 */
function pricedBrief() {
  return applyBriefUpdate(emptyBrief('it'), {
    business_name: 'Trattoria Del Gate',
    vertical: 'ristorazione',
    description: 'Cucina romana di quartiere, aperta dal 1987: forno a legna e pasta tirata a mano.',
    whatsapp: '+39 333 1112233',
    phone: '+39 06 5550000',
    address: 'Via del Gate 12, Roma',
    hours: { 'lun-ven': '12:00-15:00', sab: '19:00-23:30' },
    offerings: [
      { name: 'Tagliere', description: 'Salumi e formaggi del territorio', price: '12', section: 'Antipasti' },
      { name: 'Tagliere della casa', description: 'La selezione dello chef', price: '18', section: 'Antipasti' },
      { name: 'Cacio e pepe', description: 'Tonnarelli tirati a mano', price: '13', section: 'Primi' },
      { name: 'Tiramisu', description: 'Ricetta di famiglia', price: '6', section: 'Dolci' },
    ],
  }).brief;
}

/** Il documento REALE della variante `i` del seed (percorso `resolveVariantHome` -> `selectDesign` ->
 *  `parseDocument`), MAI costruito a mano. Lancia se il gate lo rifiuta (un fixture che non rende non prova nulla). */
function realVariant(seed: string, variantIndex: number): SiteDocument {
  const resolved = resolveVariantHome(innocuousHomePool(), pricedBrief(), seed, variantIndex);
  if (resolved === null) {
    throw new Error(`fixture v2 gate: la variante ${variantIndex} non ha superato parseDocument`);
  }
  return resolved.document;
}

/** Un documento reale della variante `i` con gli assi di DESIGN sovrascritti (id di catalogo VALIDI) e
 *  RI-GATED da `parseDocument`. Serve al "wow" (menu-carta + hero fotografico imposti) e al CANARY (hero
 *  forzato identico). Gli override sono id versionati che il gate accetta senza ri-derivare (DS-D4). */
function overriddenVariant(
  seed: string,
  variantIndex: number,
  overrides: Partial<Pick<SiteDocument, 'hero_layout_id' | 'menu_layout_id'>>,
): SiteDocument {
  const base = realVariant(seed, variantIndex);
  const parsed = parseDocument({ ...base, ...overrides });
  if (!parsed.ok) {
    throw new Error(`fixture v2 gate: la variante ${variantIndex} con override non ha superato parseDocument`);
  }
  return parsed.document;
}

/** Semina un sito + una generazione + una PUBLICATION per un documento, e ritorna il public slug
 *  (NAMESPACED con randomUUID: `public_slug` e' unico globale su DB condiviso). */
async function publishDocument(kind: string, document: SiteDocument): Promise<string> {
  const { accountId } = testUser();
  const suffix = randomUUID().slice(0, 8);
  const siteId = await seedSite({
    accountId,
    name: `E2E visual-v2 ${kind} ${suffix}`,
    slug: `e2e-visual-v2-${kind}-site-${suffix}`,
  });
  seededSites.push(siteId);
  const genId = await seedGenerationWithDocument({
    accountId,
    siteId,
    document,
    status: 'complete',
    chosenVariant: 0,
  });
  const publicSlug = `e2e-visual-v2-${kind}-${suffix}`;
  await seedPublication({ accountId, siteId, sourceGenerationId: genId, document, publicSlug, locale: 'it' });
  return publicSlug;
}

// ── L'ORACOLO DI VARIETA' condiviso (reale verde <-> canary rosso) ──────────────────────────────────
/** Il numero di firme DISTINTE nell'insieme. */
function distinctCount(signatures: readonly string[]): number {
  return new Set(signatures).size;
}
/**
 * FALLISCE se le firme computed distinte sono meno di `min`. E' il predicato "le varianti divergono" reso
 * funzione, cosi' che il verde del reale (>= min distinte) valga SOLO perche' lo STESSO predicato diventa
 * rosso sul canary (hero forzato identico -> 1 firma). Il messaggio elenca le firme per la diagnosi.
 */
function assertVariety(signatures: readonly string[], min: number, label: string): void {
  const d = distinctCount(signatures);
  if (!(d >= min)) {
    throw new Error(
      `assertVariety(${label}): solo ${d} firme distinte su ${signatures.length} (attese >= ${min}) -> ${signatures.join(' ; ')}`,
    );
  }
}

/**
 * LA FIRMA COMPUTED (strutturale, non cromatica) dell'HERO di una pagina resa: la POSITION calcolata della
 * prima foto dell'hero (`.site-photo-ph`: SFONDO full-bleed = absolute vs INCORNICIATA = static/relative),
 * la POSIZIONE del titolo display (x/y del bounding box, in celle da 12px: centrato vs a sinistra, in alto
 * vs in basso) e la sua FONT-SIZE computata (il clamp risolto: alcune varianti hanno il titolo enorme).
 * E' cio' che distingue una variante Claude Design dall'altra a livello di layout, indipendente dal tema.
 */
async function heroSignature(page: Page): Promise<string> {
  const hero = page.locator('.site-hero-v2').first();
  const photo = hero.locator('.site-photo-ph').first();
  const photoPos =
    (await photo.count()) > 0
      ? await photo.evaluate((el) => getComputedStyle(el).position)
      : 'none';
  const title = hero.locator('.site-hero-v2__title').first();
  const box = await title.boundingBox();
  const fontSize = await title.evaluate((el) => Math.round(parseFloat(getComputedStyle(el).fontSize)));
  const cell = (n: number | undefined): number => Math.round((n ?? 0) / 12);
  return `${photoPos}|x${cell(box?.x)}|y${cell(box?.y)}|f${fontSize}`;
}

/**
 * LA FIRMA COMPUTED del CORPO (blocco chi-siamo): la POSITION della prima foto della sezione (assente in
 * alcune varianti, absolute nelle foto-piene), il TEXT-ALIGN computato del contenitore del titolo
 * (centrato vs a sinistra) e la X del titolo — tre segni della STRUTTURA della variante di corpo
 * (`section_layout_id` per-blocco, congelato per variante da `selectBodyLayout`). Se il corpo delle 5
 * varianti fosse clonato, queste firme collasserebbero.
 */
async function bodySignature(page: Page): Promise<string> {
  const about = page.locator('.site-about-v2').first();
  const photo = about.locator('.site-photo-ph').first();
  const photoPos =
    (await photo.count()) > 0
      ? await photo.evaluate((el) => getComputedStyle(el).position)
      : 'none';
  const heading = about.locator('h2').first();
  const headBox = (await heading.count()) > 0 ? await heading.boundingBox() : null;
  const headAlign =
    (await heading.count()) > 0
      ? await heading.evaluate((el) => getComputedStyle(el).textAlign)
      : 'none';
  const cell = (n: number | undefined): number => Math.round((n ?? 0) / 20);
  return `${photoPos}|${headAlign}|x${cell(headBox?.x)}`;
}

/** Rende le firme (hero, corpo) delle 5 varianti reali del seed su /s/. Un solo `page`, una navigazione
 *  per variante (documenti gia' pubblicati, sequenziali). */
async function collectRealSignatures(
  page: Page,
): Promise<{ hero: string[]; body: string[] }> {
  const hero: string[] = [];
  const body: string[] = [];
  for (let i = 0; i < VARIANT_COUNT; i += 1) {
    const slug = await publishDocument(`real-${i}`, realVariant(SEED, i));
    const response = await page.goto(`/s/${slug}`);
    expect(response?.status()).toBe(200); // covers: AC-DV2-601-1
    await expect(page.locator('.site-hero-v2').first()).toBeVisible(); // covers: AC-DV2-601-1
    hero.push(await heroSignature(page));
    body.push(await bodySignature(page));
  }
  return { hero, body };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-601-1 (VARIETA') — le 5 varianti REALI dello stesso seed differiscono sull'asse hero VISIBILE
// (computed) E su >=1 asse del corpo (computed). Non un solo colore: la firma hero e' fatta di posizione
// della foto, posizione e dimensione del titolo; la firma corpo di struttura della sezione chi-siamo.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DV2-601 AC-DV2-601-1 (VARIETA) — 5 varianti reali di un seed divergono su hero + corpo su /s/', () => {
  test('le firme computed dell hero e del corpo delle 5 varianti reali divergono (non solo colore)', async ({
    page,
  }) => {
    // given/when: le 5 varianti REALI del seed, prodotte da resolveVariantHome -> selectDesign (mai a mano),
    // pubblicate e rese su /s/ da ANON; se ne leggono le firme computed.
    const { hero, body } = await collectRealSignatures(page);

    // then (hero VISIBILE): almeno HERO_MIN_DISTINCT firme hero distinte fra le 5 — l'oracolo condiviso che
    // il canary (AC-DV2-601-3) fa diventare rosso.
    expect(() => assertVariety(hero, HERO_MIN_DISTINCT, 'hero-reale')).not.toThrow(); // covers: AC-DV2-601-1

    // then (>=1 asse del CORPO): almeno BODY_MIN_DISTINCT firme di corpo distinte — la varieta' raggiunge
    // il corpo (section_layout per-blocco), non si ferma all'hero.
    expect(() => assertVariety(body, BODY_MIN_DISTINCT, 'corpo-reale')).not.toThrow(); // covers: AC-DV2-601-1
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-601-2 (WOW STRUTTURALE) — una variante con hero fotografico (split) e menu card-carta imposti
// mostra: il PhotoPlaceholder di catalogo nell'hero, il menu impaginato come carta (prezzi + leader-dots),
// e il titolo display dell'hero >= soglia computata. Gli assi imposti sono id di catalogo VALIDI (mai
// testo del brief), ri-gated da parseDocument.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DV2-601 AC-DV2-601-2 (WOW) — PhotoPlaceholder hero + menu card-carta (prezzi+leader) + titolo >= soglia', () => {
  const HERO_TITLE_MIN_PX = 40; // il titolo display dell'hero (var(--site-scale-3xl) sullo split, desktop)

  test('l hero ha un PhotoPlaceholder, il menu e una card-carta con prezzi e leader-dots, il titolo e grande', async ({
    page,
  }) => {
    // given: una variante reale con hero fotografico (hero-split@1, foto INCORNICIATA) e menu CARD-CARTA
    // (menu-carta@1, price 'leader-dots') imposti — id di catalogo, ri-gated. when: resa su /s/ da ANON.
    const slug = await publishDocument('wow', overriddenVariant(SEED, 0, {
      hero_layout_id: 'hero-split@1',
      menu_layout_id: 'menu-carta@1',
    }));
    const response = await page.goto(`/s/${slug}`);
    expect(response?.status()).toBe(200); // covers: AC-DV2-601-2

    // then (PhotoPlaceholder di catalogo nell'hero): il box tipografico e' presente, ed e' un placeholder
    // (nessun <img>: senza upload le foto sono PhotoPlaceholder, DS-V2-D3).
    const hero = page.locator('.site-hero-v2').first();
    await expect(hero.locator('.site-photo-ph').first()).toBeVisible(); // covers: AC-DV2-601-2
    expect(await hero.locator('img').count()).toBe(0); // catalogo, non risorsa esterna // covers: AC-DV2-601-2

    // then (titolo display >= soglia): la font-size COMPUTATA del titolo hero risolve il clamp del foglio
    // al 3xl del tema su desktop; un <h1> non stilizzato (~32px) non la supererebbe.
    const titleFont = await page
      .locator('h1.site-hero-v2__title')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(titleFont).toBeGreaterThanOrEqual(HERO_TITLE_MIN_PX); // covers: AC-DV2-601-2

    // then (menu card-carta impaginato): la variante e' congelata su data-menu-layout, e rende i PREZZI
    // (.site-menu-v2__price, show_price ristorazione) con la guida di punti fra nome e prezzo
    // (.site-menu-v2__leader, il trattamento 'leader-dots' della carta).
    const menu = page.locator('.site-menu-v2').first();
    await expect(menu).toHaveAttribute('data-menu-layout', 'menu-carta@1'); // covers: AC-DV2-601-2
    expect(await menu.locator('.site-menu-v2__price').count()).toBeGreaterThan(0); // covers: AC-DV2-601-2
    expect(await menu.locator('.site-menu-v2__leader').count()).toBeGreaterThan(0); // covers: AC-DV2-601-2
    // il prezzo reso e' quello del brief (dato dell'utente), non fabbricato.
    await expect(menu.locator('.site-menu-v2__price').first()).toContainText('12'); // covers: AC-DV2-601-2
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DV2-601-3 (CANARY) — il verde vale SOLO perche' l'oracolo sa diventare rosso. Cinque documenti reali
// con hero_layout_id FORZATO IDENTICO (hero-split@1) rendono cinque firme hero IDENTICHE: lo STESSO
// assertVariety usato dal reale (con la STESSA soglia) FALLISCE. Il difetto e' confinato al test (documenti
// costruiti qui), servito comunque da /s/ e ri-gated.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DV2-601 AC-DV2-601-3 (CANARY) — hero forzato identico rende ROSSO lo stesso oracolo di varieta', () => {
  test('con hero_layout_id identico sulle 5 varianti, assertVariety (stessa soglia) FALLISCE', async ({
    page,
  }) => {
    // given/when: le 5 varianti reali del seed ma con lo STESSO hero imposto (menu/tema/corpo restano quelli
    // reali: e' l'ASSE HERO a essere clonato), pubblicate e rese; se ne leggono le firme hero.
    const heroSigs: string[] = [];
    for (let i = 0; i < VARIANT_COUNT; i += 1) {
      const slug = await publishDocument(`canary-${i}`, overriddenVariant(SEED, i, { hero_layout_id: 'hero-split@1' }));
      const response = await page.goto(`/s/${slug}`);
      expect(response?.status()).toBe(200); // covers: AC-DV2-601-3
      await expect(page.locator('.site-hero-v2').first()).toBeVisible(); // covers: AC-DV2-601-3
      heroSigs.push(await heroSignature(page));
    }

    // sanity anti-vacuita': le 5 firme del canary sono in realta' una sola (l'hero e' davvero clonato). Se
    // fossero gia' distinte, il canary non starebbe forzando nulla e AC-DV2-601-3 sarebbe vacuo.
    expect(distinctCount(heroSigs)).toBe(1); // covers: AC-DV2-601-3

    // then: lo STESSO oracolo (stessa soglia HERO_MIN_DISTINCT) che il reale supera qui FALLISCE — il rosso
    // e' la contro-prova che il verde di AC-DV2-601-1 non e' un placebo.
    expect(() => assertVariety(heroSigs, HERO_MIN_DISTINCT, 'canary-hero')).toThrow(/firme distinte/); // covers: AC-DV2-601-3
  });
});

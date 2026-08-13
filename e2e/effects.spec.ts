import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { seedSite, seedGenerationWithDocument, seedPublication, cleanupSite } from './support/seed';
import { USER_FILE, type TestUser } from './support/paths';
import { buildInnocuousDocument } from './fixtures/innocuous-document';
import { parseDocument } from '@/domain/generation/document';
import type { EffectLevel } from '@/domain/generation/effects';

// DE-301 (macrotask effects-runtime) — GLI EFFETTI L0-L4 IN CSS, misurati in un browser vero sulla
// rotta PUBBLICA e ANON /s/<slug>. Le asserzioni derivano dagli acceptance_criteria di
// 03-effects-runtime.md, taggate `// covers:` sulla RIGA dell'expect:
//
//  - AC-DE-301-1: data-effects="L1" e la radice SENZA .site-motion-ready (qui: JS DISABILITATO, cioe'
//    l'isola DE-302 non puo' montare per COSTRUZIONE) -> ogni [data-reveal] e' visibile e a opacity
//    PIENA. Il contenuto non dipende dal JS (progressive enhancement, crawler-safe).
//  - AC-DE-301-2: prefers-reduced-motion: reduce (JS attivo) -> nessuna animazione ne transform sui
//    reveal, e il contenuto e' intero.
//
// PIU' UN CONTROLLO (stesso AC-DE-301-2) che toglie la vacuita': senza la preferenza, a L1 la
// micro-transizione del reveal ESISTE davvero (durata > 0), quindi lo "0s" misurato sotto reduce e'
// un EFFETTO del @media e non l'assenza di qualunque regola; e a L0 la stessa durata e' 0, prova che
// il gating e' per LIVELLO ESATTO ([data-effects='L1']) e non un match a prefisso — che
// confonderebbe L0 con L1 — ne una regola cieca applicata a tutti.
//
// L'ISOLA SiteMotion NON ESISTE ancora (e' DE-302) e questo spec non la simula: proprio l'assenza di
// .site-motion-ready e' cio' che rende osservabile la promessa di progressive enhancement.
//
// FIXTURE: il documento INNOCUO reale (percorso resolveVariantHome -> parseDocument) — PIU' blocchi,
// valori discordanti — con `effect_level` FISSATO e RI-PASSATO da parseDocument (A05:2025), e il
// theme_id di catalogo sole-mediterraneo@1 come in visual-skin.spec.ts. A 1280x720 il documento e'
// piu' alto della piega: almeno un [data-reveal] sta SOTTO di essa, ed e' la' che uno stato nascosto
// non voluto sarebbe rimasto (un reveal in cima al viewport verrebbe scoperto comunque).
//
// CONTESTO ANON (RLS anon-published): storageState VUOTO -> la pagina non ha sessione e /s/<slug> e'
// servita al ruolo Postgres `anon`. Viewport fissato a 1280x720: la piega e' deterministica.
// Modellato su e2e/visual-skin.spec.ts per seed e contesto.

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1280, height: 720 } });

/** L'utente di test provisionato dal globalSetup. Letto NEL test (mai a import-time, per --list). */
function testUser(): TestUser {
  return JSON.parse(readFileSync(USER_FILE, 'utf8')) as TestUser;
}

// Isolamento fra i casi: il teardown globale cancella comunque l'utente (CASCADE), questo tiene
// pulite le tabelle fra un run e l'altro.
const seededSites: string[] = [];
test.afterAll(async () => {
  for (const siteId of seededSites) await cleanupSite(siteId);
});

/**
 * Semina un sito PUBBLICATO col documento innocuo, il tema di catalogo e il livello di effetto
 * richiesto CONGELATO nel documento; ritorna il suo public slug. Il livello passa da `parseDocument`
 * (gate in scrittura), cosi' cio' che la rotta rende e' cio' che il gate ha normalizzato. `public_slug`
 * e slug del sito sono NAMESPACED (unici globali, DB condiviso).
 */
async function seedPublishedSiteAt(level: EffectLevel, kind: string): Promise<string> {
  const { accountId } = testUser();
  const suffix = randomUUID().slice(0, 8);
  const siteId = await seedSite({
    accountId,
    name: `E2E effects ${kind} ${suffix}`,
    slug: `e2e-effects-${kind}-site-${suffix}`,
  });
  seededSites.push(siteId);

  const base = buildInnocuousDocument();
  const parsed = parseDocument({ ...base, theme_id: 'sole-mediterraneo@1', effect_level: level });
  if (!parsed.ok) {
    throw new Error(
      `fixture effects ${kind}: il documento con effect_level ${level} non ha superato parseDocument`,
    );
  }
  const doc = parsed.document;

  const genId = await seedGenerationWithDocument({
    accountId,
    siteId,
    document: doc,
    status: 'complete',
    chosenVariant: 0,
  });
  const publicSlug = `e2e-effects-${kind}-${suffix}`;
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
 * Le DURATE (in secondi) della transizione COMPUTATA di ogni [data-reveal] della pagina: per ciascun
 * elemento il MASSIMO fra le durate elencate (la shorthand ne dichiara una per proprieta'). Serve al
 * solo controllo di non-vacuita', dove il confronto e' numerico e non su una stringa esatta.
 */
async function revealTransitionSeconds(page: Page): Promise<number[]> {
  return page.locator('[data-reveal]').evaluateAll<number[], HTMLElement>((elements) =>
    elements.map((element) =>
      Math.max(
        ...getComputedStyle(element)
          .transitionDuration.split(',')
          .map((value) => parseFloat(value)),
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-301-1 — senza JS la radice non ha .site-motion-ready e i reveal sono a stato PIENO.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DE-301 AC-DE-301-1 — senza JS i [data-reveal] sono visibili a opacity piena', () => {
  // JS DISABILITATO nel contesto: nessuna isola client puo' montare, quindi la radice NON riceve
  // .site-motion-ready PER COSTRUZIONE — esattamente il given dell'AC ("JS non montato/assente").
  test.use({ javaScriptEnabled: false });

  test('la radice non porta .site-motion-ready e ogni reveal e visibile, opaco e senza transform', async ({
    page,
  }) => {
    // given: un sito pubblicato col livello L1 congelato nel documento.
    const publicSlug = await seedPublishedSiteAt('L1', 'nojs');

    // when: si visita la pagina pubblica da ANON, con JS spento.
    const response = await page.goto(`/s/${publicSlug}`);
    // 200 servito ad anon: la RLS anon-published ha restituito la riga e la pagina si e' resa
    // interamente lato server (nessun JS coinvolto).
    expect(response?.status()).toBe(200); // covers: AC-DE-301-1

    // then (given verificato): la radice porta il livello CONGELATO L1 ...
    await expect(page.locator('.site-view')).toHaveAttribute('data-effects', 'L1'); // covers: AC-DE-301-1
    // ... e NESSUN elemento porta .site-motion-ready: lo stato nascosto dei reveal, che esiste solo
    // sotto quella classe, non e' in gioco.
    expect(await page.locator('.site-motion-ready').count()).toBe(0); // covers: AC-DE-301-1

    const reveals = page.locator('[data-reveal]');
    const revealCount = await reveals.count();
    // FIXTURE MULTI-ELEMENTO: il documento innocuo ha piu' blocchi, quindi la promessa e' provata su
    // una sequenza, non su un elemento solo.
    expect(revealCount).toBeGreaterThanOrEqual(3); // covers: AC-DE-301-1
    // UN SOLO PUNTO nel renderer: il gancio del reveal sta sul wrapper .site-block, non sparso sui
    // blocchi. Se qualcuno lo duplicasse altrove i due conteggi divergerebbero.
    expect(await page.locator('.site-block[data-reveal]').count()).toBe(revealCount); // covers: AC-DE-301-1

    // then: OGNI reveal e' a stato pieno. `toBeVisible` da solo non basterebbe — Playwright non
    // guarda l'opacity — quindi si misura lo stile COMPUTATO: opacity piena e nessuna traslazione.
    for (let index = 0; index < revealCount; index += 1) {
      const reveal = reveals.nth(index);
      await expect(reveal).toBeVisible(); // covers: AC-DE-301-1
      await expect(reveal).toHaveCSS('opacity', '1'); // covers: AC-DE-301-1
      await expect(reveal).toHaveCSS('transform', 'none'); // covers: AC-DE-301-1
    }

    // e l'ultimo reveal sta SOTTO LA PIEGA (viewport 1280x720, pagina non scrollata): e' il caso in
    // cui uno stato nascosto non voluto resterebbe tale, perche' nessuno scroll lo scoprirebbe.
    const lastBox = await reveals.nth(revealCount - 1).boundingBox();
    expect(lastBox?.y ?? 0).toBeGreaterThan(720); // covers: AC-DE-301-1
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-DE-301-2 — sotto prefers-reduced-motion: reduce il contenuto e' intero e fermo.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DE-301 AC-DE-301-2 — con prefers-reduced-motion: reduce nessun movimento sui reveal', () => {
  // La preferenza e' EMULATA nel contesto; il JS resta ATTIVO (e' il caso reale di un utente che
  // naviga con le animazioni ridotte, non quello del crawler). In questa versione di Playwright
  // `reducedMotion` non e' una TestOption di primo livello: passa da `contextOptions`, che e' il
  // canale documentato verso browser.newContext (viewport e storageState del file restano, perche'
  // le opzioni specifiche hanno la precedenza su questa).
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('ogni reveal e visibile, senza transform, senza animazione e senza transizione', async ({
    page,
  }) => {
    // given: lo stesso sito pubblicato a L1, ma il browser dichiara la preferenza.
    const publicSlug = await seedPublishedSiteAt('L1', 'reduce');

    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-301-2

    // Il given e' DAVVERO in vigore: senza questa riga tutto il resto potrebbe passare perche' il
    // @media non e' mai entrato in gioco.
    const prefersReduce = await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    expect(prefersReduce).toBe(true); // covers: AC-DE-301-2
    await expect(page.locator('.site-view')).toHaveAttribute('data-effects', 'L1'); // covers: AC-DE-301-2

    const reveals = page.locator('[data-reveal]');
    const revealCount = await reveals.count();
    expect(revealCount).toBeGreaterThanOrEqual(3); // covers: AC-DE-301-2

    // then: contenuto INTERO (visibile, opacity piena) e MOVIMENTO ZERO (nessuna trasformazione,
    // nessuna animazione, nessuna transizione) su ogni reveal.
    for (let index = 0; index < revealCount; index += 1) {
      const reveal = reveals.nth(index);
      await expect(reveal).toBeVisible(); // covers: AC-DE-301-2
      await expect(reveal).toHaveCSS('opacity', '1'); // covers: AC-DE-301-2
      await expect(reveal).toHaveCSS('transform', 'none'); // covers: AC-DE-301-2
      await expect(reveal).toHaveCSS('animation-name', 'none'); // covers: AC-DE-301-2
      await expect(reveal).toHaveCSS('transition-duration', '0s'); // covers: AC-DE-301-2
    }

    // anche il reveal SOTTO LA PIEGA e' intero: la preferenza non nasconde la coda della pagina.
    const lastBox = await reveals.nth(revealCount - 1).boundingBox();
    expect(lastBox?.y ?? 0).toBeGreaterThan(720); // covers: AC-DE-301-2

    // CONTRO-PROVA DEL @media (la SECONDA CINTURA). Sotto reduce l'isola non mette il gate, quindi
    // fin qui "opacity 1 / transform none" sarebbe vero anche senza il blocco @media: non c'e' nulla
    // da forzare. Si mette allora a mano la SOLA condizione DOM che un'isola creerebbe — il gate dello
    // stato nascosto — e si ri-misura: il contenuto deve restare intero e fermo lo stesso. Togliendo
    // il @media dal foglio, queste righe cadono (opacity 0, transform translateY): e' quel blocco, e
    // non l'assenza di movimento, cio' che stanno provando.
    await page.evaluate(() => {
      document.querySelector('.site-view')?.classList.add('site-motion-ready');
    });
    for (let index = 0; index < revealCount; index += 1) {
      const reveal = reveals.nth(index);
      await expect(reveal).toBeVisible(); // covers: AC-DE-301-2
      await expect(reveal).toHaveCSS('opacity', '1'); // covers: AC-DE-301-2
      await expect(reveal).toHaveCSS('transform', 'none'); // covers: AC-DE-301-2
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLO di AC-DE-301-2 — senza la preferenza il movimento a L1 c'e' (lo "0s" di sopra e' un
// effetto del @media, non una vacuita'), e a L0 non c'e' (gating per LIVELLO ESATTO).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DE-301 controllo di AC-DE-301-2 — la micro-transizione esiste a L1 e non a L0', () => {
  // La preferenza e' ESPLICITAMENTE assente (non "il default del sistema"): il controllo misura il
  // caso senza riduzione del movimento, e non deve dipendere da com'e' configurata la macchina.
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('a L1 la transizione del reveal ha durata > 0, a L0 e 0s (nessun match a prefisso)', async ({
    page,
  }) => {
    // given: due siti pubblicati identici tranne il LIVELLO congelato. 'L0' e 'L1' condividono il
    // prefisso 'L': un selettore a prefisso ([data-effects^='L']) li confonderebbe, e questo caso e'
    // esattamente cio' che lo distingue da [data-effects='L1'].
    const slugL1 = await seedPublishedSiteAt('L1', 'ctl-l1');
    const slugL0 = await seedPublishedSiteAt('L0', 'ctl-l0');

    // when: si visita il sito a L1, senza preferenza di riduzione del movimento.
    const responseL1 = await page.goto(`/s/${slugL1}`);
    expect(responseL1?.status()).toBe(200); // covers: AC-DE-301-2
    await expect(page.locator('.site-view')).toHaveAttribute('data-effects', 'L1'); // covers: AC-DE-301-2

    // then: la micro-transizione del reveal e' DICHIARATA e non nulla — e' cio' che il @media di
    // AC-DE-301-2 azzera. Senza questa riga, "transition-duration: 0s sotto reduce" sarebbe vero
    // anche se il foglio non avesse alcuna regola di movimento.
    const secondsL1 = await revealTransitionSeconds(page);
    expect(secondsL1.length).toBeGreaterThanOrEqual(3); // covers: AC-DE-301-2
    expect(secondsL1.every((seconds) => seconds > 0)).toBe(true); // covers: AC-DE-301-2

    // when: si visita il sito a L0 (statico), nello stesso contesto.
    const responseL0 = await page.goto(`/s/${slugL0}`);
    expect(responseL0?.status()).toBe(200); // covers: AC-DE-301-2
    await expect(page.locator('.site-view')).toHaveAttribute('data-effects', 'L0'); // covers: AC-DE-301-2

    // then: nessuna transizione. Il livello e' letto per UGUAGLIANZA ESATTA: un selettore a prefisso
    // o *= renderebbe L0 indistinguibile da L1 e questa riga cadrebbe.
    const secondsL0 = await revealTransitionSeconds(page);
    expect(secondsL0.length).toBeGreaterThanOrEqual(3); // covers: AC-DE-301-2
    expect(secondsL0.every((seconds) => seconds === 0)).toBe(true); // covers: AC-DE-301-2
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DE-302 — L'ISOLA CLIENT (SiteMotion). Le stesse fixture e lo stesso seed di sopra: cambia solo che
// qui il JS e' ATTIVO e cio' che si misura e' il comportamento dell'isola. Le asserzioni derivano
// dagli acceptance_criteria di 03-effects-runtime.md, taggate `// covers:` sulla RIGA dell'expect:
//
//  - AC-DE-302-1: data-effects="L1" e JS attivo -> un [data-reveal] che entra nel viewport allo
//    SCROLL ottiene .is-visible.
//  - AC-DE-302-2: prefers-reduced-motion: reduce -> l'isola monta ma e' NO-OP (nessuna .is-visible) e
//    il contenuto e' gia' intero.
//
// L'ANCORA DI NON-VACUITA' DI ENTRAMBI e' `data-motion-level`: l'isola lo scrive sulla radice PRIMA
// di ogni altra decisione. Chi lo vede sa che il JS e' partito e che la decisione e' gia' presa —
// senza di esso "nessuna .is-visible" sotto reduce sarebbe vero anche a JS morto, e l'AC non direbbe
// piu' nulla.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attende DUE frame di rendering. Le notifiche dell'IntersectionObserver sono consegnate dal browser
 * nel ciclo di rendering, non in modo sincrono allo scroll: serve alle asserzioni NEGATIVE (nulla e'
 * comparso), dove non esiste una condizione da attendere e un'attesa a tempo sarebbe arbitraria.
 */
async function settleFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

/**
 * Quanti [data-reveal] portano il TOKEN di classe `is-visible`. `classList.contains` e' un match di
 * token ESATTO: una classe che avesse 'is-visible' come sottostringa non conterebbe.
 */
async function visibleRevealCount(page: Page): Promise<number> {
  return page
    .locator('[data-reveal]')
    .evaluateAll<number, HTMLElement>(
      (elements) => elements.filter((element) => element.classList.contains('is-visible')).length,
    );
}

test.describe('DE-302 AC-DE-302-1 — a L1 il reveal che entra nel viewport ottiene .is-visible', () => {
  // Preferenza di movimento ESPLICITAMENTE assente: il caso "motion default" del given, indipendente
  // da come e' configurata la macchina che esegue la suite.
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('il reveal sotto la piega e nascosto finche lo scroll non lo raggiunge, poi e rivelato', async ({
    page,
  }) => {
    // given: un sito pubblicato col livello L1 congelato e il JS attivo (default del progetto).
    const publicSlug = await seedPublishedSiteAt('L1', 'motion');

    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-302-1

    const root = page.locator('.site-view');
    await expect(root).toHaveAttribute('data-effects', 'L1'); // covers: AC-DE-302-1
    // L'isola e' montata e ha gia' deciso: il livello EFFETTIVO e' quello congelato ...
    await expect(root).toHaveAttribute('data-motion-level', 'L1'); // covers: AC-DE-302-1
    // ... e poiche' puo' davvero rivelare, ha messo il gate dello stato nascosto (una sola radice
    // nella pagina pubblica, quindi un solo elemento marcato).
    expect(await page.locator('.site-motion-ready').count()).toBe(1); // covers: AC-DE-302-1

    const reveals = page.locator('[data-reveal]');
    const revealCount = await reveals.count();
    // FIXTURE MULTI-ELEMENTO: la promessa e' provata su una sequenza, non su un elemento solo.
    expect(revealCount).toBeGreaterThanOrEqual(3); // covers: AC-DE-302-1
    const primo = reveals.first();
    const ultimo = reveals.nth(revealCount - 1);

    // given (verificato): l'ultimo reveal sta SOTTO LA PIEGA a 1280x720, pagina non scrollata — e'
    // l'unico posto in cui "entra nel viewport allo scroll" e' una transizione osservabile.
    const box = await ultimo.boundingBox();
    expect(box?.y ?? 0).toBeGreaterThan(720); // covers: AC-DE-302-1

    // L'observer ha gia' lavorato sul primo schermo: cio' che era IN VISTA e' rivelato ...
    await expect(primo).toHaveClass(/(^|\s)is-visible(\s|$)/); // covers: AC-DE-302-1
    // ... mentre l'ultimo non lo e' ancora ED E' NASCOSTO PER DAVVERO (opacity 0: il gate e' in
    // vigore). Questa meta' e' cio' che rende CAUSALE l'asserzione dopo lo scroll — senza, la classe
    // trovata dopo potrebbe esserci sempre stata.
    await expect(ultimo).toHaveCSS('opacity', '0'); // covers: AC-DE-302-1
    expect(await visibleRevealCount(page)).toBeLessThan(revealCount); // covers: AC-DE-302-1

    // when: lo scroll porta QUEL reveal dentro il viewport.
    await ultimo.scrollIntoViewIfNeeded();
    await settleFrames(page);

    // then: ottiene la classe .is-visible (token esatto) e con essa lo stato pieno.
    await expect(ultimo).toHaveClass(/(^|\s)is-visible(\s|$)/); // covers: AC-DE-302-1
    await expect(ultimo).toHaveCSS('opacity', '1'); // covers: AC-DE-302-1
    await expect(ultimo).toHaveCSS('transform', 'none'); // covers: AC-DE-302-1
  });
});

test.describe('DE-302 AC-DE-302-2 — sotto reduced-motion l isola monta ed e no-op', () => {
  // La preferenza e' EMULATA nel contesto e il JS resta ATTIVO: e' il caso reale dell'utente che
  // naviga con le animazioni ridotte. In questa versione di Playwright `reducedMotion` non e' una
  // TestOption di primo livello: passa da `contextOptions` (verso browser.newContext).
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('nessun [data-reveal] ottiene .is-visible, nemmeno dopo lo scroll, e il contenuto e intero', async ({
    page,
  }) => {
    // given: lo stesso sito a L1, ma il browser dichiara di volere meno movimento.
    const publicSlug = await seedPublishedSiteAt('L1', 'motion-reduce');

    const response = await page.goto(`/s/${publicSlug}`);
    expect(response?.status()).toBe(200); // covers: AC-DE-302-2

    // Il given e' DAVVERO in vigore (senza, tutto il resto passerebbe per il motivo sbagliato).
    const prefersReduce = await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    expect(prefersReduce).toBe(true); // covers: AC-DE-302-2

    const root = page.locator('.site-view');
    await expect(root).toHaveAttribute('data-effects', 'L1'); // covers: AC-DE-302-2
    // ANTI-VACUITA': l'isola E' montata (l'attributo lo prova) — quindi il no-op qui sotto e' una
    // DECISIONE dell'isola, non il silenzio di un JS che non e' mai partito.
    await expect(root).toHaveAttribute('data-motion-level', 'L1'); // covers: AC-DE-302-2
    // ... e la decisione e' stata: nessun gate. Senza .site-motion-ready non esiste alcuno stato
    // nascosto da rivelare, che e' il motivo per cui il no-op e' sicuro.
    expect(await page.locator('.site-motion-ready').count()).toBe(0); // covers: AC-DE-302-2

    const reveals = page.locator('[data-reveal]');
    const revealCount = await reveals.count();
    expect(revealCount).toBeGreaterThanOrEqual(3); // covers: AC-DE-302-2

    // then: NESSUNA .is-visible e' stata aggiunta, e il contenuto e' gia' intero su OGNI reveal.
    expect(await visibleRevealCount(page)).toBe(0); // covers: AC-DE-302-2
    for (let index = 0; index < revealCount; index += 1) {
      await expect(reveals.nth(index)).toBeVisible(); // covers: AC-DE-302-2
      await expect(reveals.nth(index)).toHaveCSS('opacity', '1'); // covers: AC-DE-302-2
    }

    // e resta cosi' dopo aver percorso la pagina fino in fondo: se un observer fosse comunque in
    // ascolto, questo scroll lo farebbe scattare sul reveal che era sotto la piega.
    const ultimo = reveals.nth(revealCount - 1);
    const box = await ultimo.boundingBox();
    expect(box?.y ?? 0).toBeGreaterThan(720); // covers: AC-DE-302-2
    await ultimo.scrollIntoViewIfNeeded();
    await settleFrames(page);
    expect(await visibleRevealCount(page)).toBe(0); // covers: AC-DE-302-2
    await expect(ultimo).toHaveCSS('opacity', '1'); // covers: AC-DE-302-2
  });
});

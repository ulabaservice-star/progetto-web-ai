import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { seedSite, adminClient } from './support/seed';
import { USER_FILE, type TestUser } from './support/paths';

// OGW-502 (macrotask wizard-shell) — l'END-TO-END del wizard su Chromium. Le asserzioni derivano
// da AC-502-4 (05-wizard-shell.md): i due percorsi 'import -> step -> genera' e 'da zero -> minimo
// -> genera' arrivano a una generazione OFFERTA (documento pubblicabile) sul percorso /generate
// INVARIATO. Tag `// covers: AC-502-4` sull'expect finale di ciascun percorso.
//
// CONFINE DICHIARATO (L-COL-006), coerente con la disciplina e2e del progetto (T-240/AC-240:
// SEED, non-run del confine LLM): l'e2e guida il wizard fino al punto in cui /generate OFFRE la
// generazione (il brief raccolto e' `generatable` -> compare la CTA "Genera cinque proposte", non
// lo stato "manca X"). NON lancia la generazione live (Anthropic, minuti/costo) ne' l'estrazione
// AI dell'import: la produzione del documento e' coperta dall'harness di P2 (seed-non-run), le
// chiamate AI dai loro oracoli di rotta, l'import da fromUrl. Qui si prova cio' che il WIZARD deve
// garantire: entrambe le porte d'ingresso conducono a un brief pronto sul percorso di generazione.
//
// Il percorso 'import' e' rappresentato da un brief DRAFT gia' pre-popolato (lo stato che un import
// produce), montato dal wizard: l'estrazione da URL vive nei suoi test, qui conta il flusso a valle.

function testUser(): TestUser {
  return JSON.parse(readFileSync(USER_FILE, 'utf8')) as TestUser;
}

// Un brief pre-popolato (come da import) e GENERATABLE: hero (nome) + offerte + chi-siamo
// (descrizione) + contatti (telefono) = 4 blocchi (GENERATABLE_MIN_BLOCKS). status='draft': il
// wizard lo confermera'.
async function seedDraftBrief(accountId: string, siteId: string): Promise<void> {
  const { error } = await adminClient().from('site_briefs').insert({
    account_id: accountId,
    site_id: siteId,
    business_name: 'Trattoria Rosa',
    vertical: 'ristorazione',
    description: 'Cucina romana di famiglia, dal 1980.',
    phone: '06 1234567',
    primary_goal: 'prenota',
    locale: 'it',
    status: 'draft',
    content: { offerings: [{ name: 'Carbonara' }], social_links: [], highlights: [] },
  });
  if (error) throw error;
}

// Attende il titolo (h2 del guscio) dello step corrente: ogni «Avanti» e' async (persist-on-Advance).
async function expectStep(page: Page, title: string) {
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

// Conferma finale (ReviewConfirm, due passi) e attesa del redirect a /generate.
async function confirmAndExpectGenerate(page: Page, siteId: string) {
  await page.getByRole('button', { name: 'Conferma il brief' }).click();
  await page.getByRole('button', { name: 'Confermo: il brief è definitivo' }).click();
  await page.waitForURL(`**/it/generate/${siteId}`);
  // Generazione OFFERTA: nessuno stato "manca X", e la CTA di lancio e' presente.
  await expect(page.locator('[data-generate-missing="true"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Genera cinque proposte' })).toBeVisible();
}

test.describe('OGW-502 wizard end-to-end (AC-502-4)', () => {
  test('da zero -> minimo -> genera: /generate offre la generazione', async ({ page }) => {
    const { accountId } = testUser();
    const suffix = randomUUID().slice(0, 8);
    const siteId = await seedSite({
      accountId,
      name: `E2E wizard scratch ${suffix}`,
      slug: `e2e-wizard-scratch-${suffix}`,
    });

    await page.goto(`/it/onboarding/${siteId}`);

    // Ingresso -> Base
    await page.getByRole('button', { name: 'Prosegui' }).click();
    await expectStep(page, "L'essenziale");
    await page.getByLabel("Nome dell'attività").fill('Trattoria Sole');
    await page.getByRole('button', { name: 'Ristorazione' }).click();
    await page.getByRole('button', { name: 'Far prenotare' }).click();

    // Racconto: scrivi e conferma la descrizione (senza ✨, che chiamerebbe l'AI live)
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expectStep(page, 'Racconta la tua attività');
    await page.getByLabel('Descrizione del sito').fill('Cucina casalinga romana, ricette di famiglia.');
    await page.getByRole('button', { name: 'Usa questa descrizione' }).click();

    // Offerte: aggiungi una voce
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expectStep(page, 'Che cosa offri');
    await page.getByRole('button', { name: 'Aggiungi voce' }).click();
    await page.getByLabel('Nome').fill('Carbonara');

    // Contatti&orari: telefono
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expectStep(page, 'Contatti e orari');
    await page.getByLabel('Telefono').fill('06 1234567');

    // Rivedi -> conferma -> /generate offre la generazione
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expectStep(page, 'Rivedi e genera');
    await confirmAndExpectGenerate(page, siteId); // covers: AC-502-4
  });

  test('import (brief pre-popolato) -> step -> genera: /generate offre la generazione', async ({ page }) => {
    const { accountId } = testUser();
    const suffix = randomUUID().slice(0, 8);
    const siteId = await seedSite({
      accountId,
      name: `E2E wizard import ${suffix}`,
      slug: `e2e-wizard-import-${suffix}`,
    });
    await seedDraftBrief(accountId, siteId);

    await page.goto(`/it/onboarding/${siteId}`);

    // Ingresso -> Base: il brief importato e' gia' nel draft (nome pre-compilato).
    await page.getByRole('button', { name: 'Prosegui' }).click();
    await expectStep(page, "L'essenziale");
    await expect(page.getByLabel("Nome dell'attività")).toHaveValue('Trattoria Rosa');

    // Attraversa gli step (dati gia' presenti dall'import) fino a Rivedi.
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expectStep(page, 'Racconta la tua attività');
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expectStep(page, 'Che cosa offri');
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expectStep(page, 'Contatti e orari');
    await page.getByRole('button', { name: 'Avanti' }).click();
    await expectStep(page, 'Rivedi e genera');

    await confirmAndExpectGenerate(page, siteId); // covers: AC-502-4
  });
});

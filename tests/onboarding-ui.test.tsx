// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';

// T-151 (macrotask onboarding-ui, P1 — riscritto in OGW-501/wizard-shell) — ORACOLO
// D'INTEGRAZIONE: monta la PAGINA SERVER REALE /{locale}/onboarding/{siteId} e verifica
// che la rotta renda il WIZARD guidato (non piu' i pannelli chat-led). Con OGW-501
// l'onboarding e' passato da chat + BriefPanel a un guscio a step (OnboardingWorkspace
// riscritto in loco): BriefPanel.tsx e ChatPanel.tsx sono ELIMINATI; il dominio chat
// (interview.ts) e l'endpoint POST /turn restano in repo finche' OGW-601 non li rimuove. Le asserzioni che restano
// derivano da AC-151-1 (il brief caricato e' reso), AC-151-3 (l'import PROPONE, non salva)
// e AC-151-4 (localizzazione), piu' l'anti-injection di §7 p.4; ognuna e' taggata
// `// covers: AC-151-<n>` dove mappa su un AC.
//
// L-COL-006 — SUPERFICIE DI TESTO NON FIDATO IN OGW-501: nel wizard l'UNICO step che rende
// testo NON FIDATO dell'utente e' `base` (il nome dell'attivita', in un `value` di Input).
// `description`, `offerte` e `orari` vivono in step PLACEHOLDER (StepPlaceholder) finche'
// OGW-502 non porta i componenti ricchi; la loro anti-injection (markup nei nodi di testo,
// href/src da campi ostili) e' coperta ALTROVE fino ad allora: dal recap di
// onboarding-review.test (T-152), che li rende gia' oggi. Quando OGW-502 aggiungera' quegli
// step, l'anti-injection dei rispettivi campi si aggiunge qui (o nel test del componente
// ricco), non prima: asserirla su uno StepPlaceholder sarebbe vera per costruzione.
//
// Cosa si mocka e perche' NON e' hollow:
//  - `@/data/briefs` getBrief: la pagina carica lo STATO CORRENTE del brief e lo passa al
//    wizard come `initialBrief`; il test di montaggio esegue quella pagina per davvero.
//    upsertBrief resta mockata per l'unico scopo di OSSERVARE CHE NON VIENE CHIAMATA:
//    l'import PROPONE e il wizard di OGW-501 non persiste (il salvataggio del brief e'
//    T-152/ReviewConfirm, coperto da onboarding-review.test).
//  - `@/data/sites` listSites: il seam di PROPRIETA' del sito (P1-D21) che la guardia
//    pretende PRIMA di leggere il brief. Non si ri-verifica quella guardia (e' T-150): si
//    fornisce il valore che la fa passare, senza cui la pagina non monterebbe il wizard.
//  - `@/domain/import/fromUrl` (NON la Server Action): la Server Action importBriefFromUrl
//    gira PER DAVVERO (T-151), quindi il suo gate di sessione, la validazione dell'input e
//    il fatto che non persista nulla sono provati sul codice di produzione, non su un doppio.
//  - `@/data/supabase-ssr` getUser: l'identita' che quel gate pretende.
// NON si mocka next-intl lato CLIENT: le stringhe del wizard si risolvono dai cataloghi
// REALI it/es dentro NextIntlClientProvider — lo stesso provider del layout /[locale] —
// cosi' AC-151-4 misura la SCELTA DELLE CHIAVI fatta dai componenti, non stringhe passate
// dal test. La chrome di pagina (titolo, stato) e' server-side e passa dal mock di
// next-intl/server, come nell'oracolo di T-150.
//
// NON DUPLICARE onboarding-wizard-shell.test: quello monta OnboardingWorkspace DIRETTAMENTE
// e copre navigazione/readiness + l'invariante PURA di mergeProposal (spostata in
// wizard/proposal.ts, non piu' esportata da OnboardingWorkspace). Qui si prova la ROTTA:
// la pagina server monta il guscio, il brief caricato lo raggiunge, l'import reale lo
// pre-riempie e il testo non fidato resta confinato.

const { upsertBriefSpy, getBriefSpy, briefsHolder } = vi.hoisted(() => {
  const holder = {
    // Risposta di getBrief: la pagina la carica e la passa al wizard come initialBrief.
    getResult: { ok: true, brief: null, status: null, complete: false } as unknown,
  };
  return {
    briefsHolder: holder,
    getBriefSpy: vi.fn(async () => holder.getResult),
    // upsertBrief resta mockata al solo scopo di OSSERVARE CHE NON VIENE CHIAMATA: il wizard
    // di OGW-501 non persiste (il salvataggio del brief e' T-152/ReviewConfirm).
    upsertBriefSpy: vi.fn(async () => ({ ok: true, complete: false }) as unknown),
  };
});
vi.mock('@/data/briefs', () => ({ upsertBrief: upsertBriefSpy, getBrief: getBriefSpy }));

// Seam di PROPRIETA' del sito (P1-D21): la pagina di T-150 accerta con listSites che il
// sito sia dell'utente PRIMA di leggere il brief. Qui non si ri-verifica quella guardia
// (e' l'oracolo di T-150): si fornisce il valore che la fa passare, perche' senza di
// esso la pagina non arriverebbe mai a montare il wizard.
const { sitesHolder, listSitesSpy } = vi.hoisted(() => {
  const holder = { list: { ok: true, sites: [] } as unknown };
  return { sitesHolder: holder, listSitesSpy: vi.fn(async () => holder.list) };
});
vi.mock('@/data/sites', () => ({ listSites: listSitesSpy }));

// redirect/notFound lanciano davvero, come in Next: cosi' un montaggio che passasse per
// una guardia negata non renderebbe nulla invece di rendere a meta'. usePathname serve
// ad AppShell (T-022), che avvolge la pagina.
const { redirectSpy, notFoundSpy } = vi.hoisted(() => ({
  redirectSpy: vi.fn(() => {
    throw new Error('redirect');
  }),
  notFoundSpy: vi.fn(() => {
    throw new Error('not-found');
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: redirectSpy,
  notFound: notFoundSpy,
  usePathname: () => '/it/onboarding/site-of-a',
}));

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  type LinkProps = { href: string; children?: ReactNode; 'aria-current'?: 'page' };
  return {
    default: ({ href, children, ...rest }: LinkProps) =>
      createElement('a', { href, ...rest }, children),
  };
});

// Le stringhe della CHROME di pagina (titolo, stato del brief) sono server-side: si
// risolvono dal catalogo REALE it, come fa l'oracolo di T-150. Quelle del WIZARD, che
// sono cio' che qui interessa, restano client-side e passano dal provider vero.
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { locale: string; namespace: string }) => {
    const ns = ((itMessages as Record<string, unknown>)[namespace] ?? {}) as Record<
      string,
      unknown
    >;
    return (key: string) => {
      const value = key
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ns);
      return typeof value === 'string' ? value : `${namespace}.${key}`;
    };
  },
}));

const { fromUrlSpy, importHolder } = vi.hoisted(() => {
  const holder = { proposal: null as unknown, calls: [] as unknown[][] };
  return {
    importHolder: holder,
    fromUrlSpy: vi.fn(async (...args: unknown[]) => {
      holder.calls.push(args);
      return holder.proposal;
    }),
  };
});
vi.mock('@/domain/import/fromUrl', () => ({ fromUrl: fromUrlSpy }));

const { authHolder } = vi.hoisted(() => ({
  authHolder: { user: null as { id: string } | null },
}));
vi.mock('@/data/supabase-ssr', () => ({ getUser: async () => authHolder.user }));

// Import DOPO i mock (vi.mock e' hoisted).
import { importBriefFromUrl } from '@/data/import';
import OnboardingPage from '@/app/[locale]/onboarding/[siteId]/page';
import { applyBriefUpdate, emptyBrief } from '@/domain/onboarding/brief';

const SITE_ID = 'site-of-a';

// Brief di fixture costruito col codice di dominio REALE (T-121/T-122): la forma non puo'
// divergere da quella che getBrief restituisce. Bastano i tre campi che lo step Base
// rende (nome + tipo + obiettivo): sono anche quelli su cui e' osservabile che il brief
// CARICATO dalla pagina raggiunge davvero il wizard.
const DRAFT_BRIEF = applyBriefUpdate(emptyBrief('it'), {
  business_name: 'Bar Sole',
  vertical: 'ristorazione',
  primary_goal: 'ordina',
}).brief;

const BLANK_BRIEF = emptyBrief('it');

const on = itMessages.onboarding;
const w = itMessages.onboarding.wizard;

function Wrapper({ locale, children }: { locale: 'it' | 'es'; children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={locale} messages={locale === 'es' ? esMessages : itMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

// Esegue la PAGINA di T-150 per davvero (guardie comprese) e rende il suo albero dentro lo
// STESSO provider next-intl che il layout /[locale] mette sopra ogni rotta — cioe' il
// modello completo della rotta, non solo del componente.
async function renderRoute(siteId = SITE_ID, locale: 'it' | 'es' = 'it') {
  const ui = await OnboardingPage({ params: Promise.resolve({ locale, siteId }) });
  return render(<Wrapper locale={locale}>{ui}</Wrapper>);
}

beforeEach(() => {
  authHolder.user = { id: 'user-a' };
  briefsHolder.getResult = { ok: true, brief: DRAFT_BRIEF, status: 'draft', complete: false };
  sitesHolder.list = { ok: true, sites: [{ id: SITE_ID, name: 'Officina di A' }] };
  getBriefSpy.mockClear();
  listSitesSpy.mockClear();
  redirectSpy.mockClear();
  notFoundSpy.mockClear();
  importHolder.proposal = null;
  importHolder.calls.length = 0;
  upsertBriefSpy.mockClear();
  fromUrlSpy.mockClear();
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// La rotta monta il WIZARD (integrazione, T151-V05 adattato a OGW-501).
// ---------------------------------------------------------------------------
// T151-V05 — il deliverable non era RAGGIUNGIBILE dall'applicazione se nessun modulo sotto
// src/app lo montava: "il componente esiste e si comporta bene" e' una proprieta' piu'
// debole di "la rotta lo rende". Con OGW-501 il componente montato e' il guscio wizard, non
// piu' i pannelli: questa suite asserisce che la ROTTA lo renda, eseguendo la PAGINA per
// davvero e rendendo il suo albero dentro il provider next-intl del layout.
describe('T-151 la rotta monta il wizard guidato (T151-V05)', () => {
  it('la pagina monta il wizard allo step Ingresso col brief caricato via getBrief', async () => {
    briefsHolder.getResult = { ok: true, brief: DRAFT_BRIEF, status: 'draft', complete: false };
    await renderRoute();

    // Le guardie hanno concesso l'accesso (non-vacuita': il montaggio non e' osservato su
    // una pagina che avrebbe dovuto negare).
    expect(listSitesSpy).toHaveBeenCalled();
    expect(redirectSpy).not.toHaveBeenCalled();
    expect(notFoundSpy).not.toHaveBeenCalled();
    expect(getBriefSpy).toHaveBeenCalledWith(SITE_ID);

    const main = within(screen.getByRole('main'));
    // La chrome di pagina (titolo + nome del sito) c'e'.
    expect(main.getByText(on.title)).toBeTruthy();
    expect(main.getByText('Officina di A')).toBeTruthy();

    // Il wizard parte allo step ENTRY: hint, barra d'import (Label+Input+Bottone) e
    // "Prosegui". Sul primo step il WizardNav non offre "Avanti"/"Indietro".
    expect(main.getByText(w.steps.entry)).toBeTruthy();
    expect(main.getByText(w.entry.hint)).toBeTruthy();
    expect(main.getByLabelText(on.import.url)).toBeTruthy();
    expect(main.getByRole('button', { name: on.import.submit })).toBeTruthy();
    expect(main.getByRole('button', { name: w.entry.continue })).toBeTruthy();
    expect(main.queryByRole('button', { name: w.nav.next })).toBeNull();
    expect(main.queryByRole('button', { name: w.nav.back })).toBeNull();
  });

  it('il brief caricato raggiunge lo step Base: nome + tipo + obiettivo riflettono getBrief', async () => {
    briefsHolder.getResult = { ok: true, brief: DRAFT_BRIEF, status: 'draft', complete: false };
    const user = userEvent.setup();
    await renderRoute();

    // Avanza a Base con "Prosegui" (l'avanzamento di Entry vive nello step, non nel nav).
    await user.click(screen.getByRole('button', { name: w.entry.continue }));

    // Il nome CARICATO dalla pagina e' nel value dell'Input: senza questa asserzione un
    // wizard montato con un brief vuoto (o con una fixture propria) passerebbe il montaggio.
    expect((screen.getByLabelText(w.base.name) as HTMLInputElement).value).toBe('Bar Sole'); // covers: AC-151-1
    // Gli enum caricati sono resi come BOTTONI premuti (aria-pressed), con l'etichetta
    // LOCALIZZATA — non il valore grezzo dell'allowlist.
    expect(
      screen.getByRole('button', { name: on.verticals.ristorazione }).getAttribute('aria-pressed'),
    ).toBe('true'); // covers: AC-151-1
    expect(
      screen.getByRole('button', { name: on.goals.ordina }).getAttribute('aria-pressed'),
    ).toBe('true'); // covers: AC-151-1
    // Una scelta NON caricata resta non premuta: il brief non e' inventato dalla UI.
    expect(
      screen.getByRole('button', { name: on.goals.prenota }).getAttribute('aria-pressed'),
    ).toBe('false'); // covers: AC-151-1
    // Su Base (step intermedio) il nav offre Avanti/Indietro; Base non e' saltabile.
    expect(screen.getByRole('button', { name: w.nav.next })).toBeTruthy();
    expect(screen.getByRole('button', { name: w.nav.back })).toBeTruthy();
    expect(screen.queryByRole('button', { name: w.nav.skip })).toBeNull();
  });

  // Sito PROPRIO senza brief ancora creato (getBrief → brief:null, caso legittimo): la
  // pagina non ha un brief da passare e usa emptyBrief(locale). Pinna quel ramo: un
  // initialBrief nullable farebbe crollare il wizard sul primo `draft.business_name`.
  it('sito proprio senza brief: il wizard e reso comunque, step Base col nome vuoto', async () => {
    briefsHolder.getResult = { ok: true, brief: null, status: null, complete: false };
    const user = userEvent.setup();
    await renderRoute();

    expect(notFoundSpy).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: w.entry.continue }));
    expect((screen.getByLabelText(w.base.name) as HTMLInputElement).value).toBe('');
    // Nessun tipo scelto: tutti i bottoni tipo sono non premuti (nessun default renderizzato
    // come scelta dell'utente — 'altro' e' il default dello schema, non una selezione).
    expect(
      screen.getByRole('button', { name: on.verticals.ristorazione }).getAttribute('aria-pressed'),
    ).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// Anti-injection T-151 (§7 p.4): il nome non fidato e' reso SOLO come value.
// ---------------------------------------------------------------------------
describe('T-151 testo del brief: input NON FIDATO in rendering (§7 p.4)', () => {
  // Un nome che arriva da una pagina ostile via fromUrl: markup che creerebbe un <img> se
  // finisse in innerHTML, e un <a href="javascript:..."> che sarebbe un link iniettato.
  // In OGW-501 il nome e' l'UNICO campo non fidato reso (L-COL-006), nello step Base, e
  // DEVE finire solo nel `value` dell'Input — mai come markup, mai in un href/src.
  const HOSTILE_NAME =
    '<img src=x onerror="document.title=1"><a href="javascript:alert(1)">clic</a>Bar Ostile';
  // Costruito col dominio REALE: sotto il tetto business_name (200), quindi non e' scartato
  // e nemmeno sanitizzato dallo schema (`.trim()` non tocca l'interno). Non-vacuita': il
  // valore SOPRAVVIVE, cosi' il caso reso e' davvero un nome ostile e non uno che il dominio
  // ha gia' neutralizzato.
  const HOSTILE_BRIEF = applyBriefUpdate(emptyBrief('it'), { business_name: HOSTILE_NAME }).brief;

  it('nome ostile: nessun img/script/href/src nato dal brief, solo value dell Input del nome', async () => {
    expect(HOSTILE_BRIEF.business_name).toBe(HOSTILE_NAME); // non-vacuita': il nome ostile e' quello reso
    briefsHolder.getResult = { ok: true, brief: HOSTILE_BRIEF, status: 'draft', complete: false };
    const user = userEvent.setup();
    const { container } = await renderRoute();

    // Naviga a Base, dove il nome e' reso.
    await user.click(screen.getByRole('button', { name: w.entry.continue }));

    // Il nome ostile e' reso come TESTO in un `value` di Input: e' l'unica sede in cui il
    // testo non fidato dell'utente compare, e vi compare PER INTERO (non troncato, non
    // sanitizzato — rimuovere il markup sarebbe corruzione silenziosa del dato).
    const name = screen.getByLabelText(w.base.name) as HTMLInputElement;
    expect(name.value).toBe(HOSTILE_NAME);
    expect(name.value).toContain('Bar Ostile'); // il ramo che le asserzioni sotto sorvegliano E' reso

    // NESSUN ELEMENTO NASCE DAL TESTO DEL BRIEF: un `value` di Input non crea elementi
    // nemmeno passando da innerHTML, quindi un <img>/<script> presente qui significherebbe
    // che il nome e' passato per dangerouslySetInnerHTML da qualche parte.
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    // Nessun href/src DAL BRIEF: gli unici `href` del DOM sono la chrome di AppShell (skip
    // link + link di navigazione della rotta), che non trasporta dati del brief. Si ENUMERA
    // l'insieme atteso — un valore del brief finito in un href cambierebbe la lista — e non
    // esiste alcun [src] (una <img> iniettata col suo src comparirebbe qui).
    const hrefs = [...container.querySelectorAll('[href]')].map((el) => el.getAttribute('href'));
    expect(hrefs).toEqual(['#main-content', `/it/dashboard`]);
    expect(container.querySelector('a[href*="javascript:"]')).toBeNull();
    expect(container.querySelector('[src]')).toBeNull();
    // Nessun anchor iniettato dal payload: solo i due della chrome.
    expect(container.querySelectorAll('a')).toHaveLength(2);
    // E l'onerror non e' scattato: nessuna esecuzione del payload.
    expect(document.title).not.toBe('1');
  });
});

// ---------------------------------------------------------------------------
// UrlImportBar: import REALE (Server Action) → PROPONE, non salva.
// ---------------------------------------------------------------------------
describe('T-151 UrlImportBar: import reale (Server Action) pre-riempie il draft', () => {
  const PROPOSED = applyBriefUpdate(emptyBrief('it'), {
    business_name: 'Bar Sole Web',
    phone: '+39 06 9998887',
    address: 'Piazza Grande 2, Modena',
  }).brief;
  const TARGET_URL = 'https://barsole.example/contatti';

  // covers: AC-151-3
  // La Server Action importBriefFromUrl gira PER DAVVERO (fromUrl mockata): pretende la
  // sessione, valida l'input e ritorna la PROPOSTA senza persistere. La proposta entra nel
  // draft del wizard (applyProposal) ed e' osservabile allo step Base.
  it('invio dell URL: fromUrl e invocata con QUELL url, il nome importato appare in Base, e upsertBrief NON e chiamata', async () => {
    const user = userEvent.setup();
    importHolder.proposal = { status: 'proposed', brief: PROPOSED };
    briefsHolder.getResult = { ok: true, brief: BLANK_BRIEF, status: null, complete: false };
    await renderRoute();

    await user.type(screen.getByLabelText(on.import.url), TARGET_URL);
    await user.click(screen.getByRole('button', { name: on.import.submit }));

    // La Server Action ha raggiunto fromUrl con ESATTAMENTE quell'URL (non uno riscritto).
    await waitFor(() => expect(fromUrlSpy).toHaveBeenCalledTimes(1)); // covers: AC-151-3
    expect(importHolder.calls[0][0]).toBe(TARGET_URL); // covers: AC-151-3

    // Alla navigazione a Base il nome PROPOSTO e' pre-riempito: su un brief blank sarebbe
    // stato '', quindi il pre-riempimento e' osservabile (non-tautologico col test blank).
    await user.click(screen.getByRole('button', { name: w.entry.continue }));
    expect((screen.getByLabelText(w.base.name) as HTMLInputElement).value).toBe('Bar Sole Web'); // covers: AC-151-3

    // L'IMPORT NON SALVA (P1-D5 / AC-151-3): la proposta pre-riempie il draft, il DB non e'
    // toccato. La scrittura del brief e' T-152 (ReviewConfirm), non il wizard di OGW-501.
    expect(upsertBriefSpy).not.toHaveBeenCalled(); // covers: AC-151-3
  });

  // La Server Action PRETENDE una sessione anche INDIPENDENTEMENTE dalla pagina (difesa in
  // profondita': una Server Action e' invocabile da sola, non solo dalla rotta gia' protetta).
  // Senza identita' il server sarebbe un proxy di sonde SSRF per chiunque: rifiuto TIPIZZATO
  // (nessun throw, che la barra non potrebbe distinguere da un guasto) e fromUrl non raggiunta.
  it('senza sessione la Server Action rifiuta (unauthorized) senza toccare fromUrl', async () => {
    authHolder.user = null;
    importHolder.proposal = { status: 'proposed', brief: PROPOSED };
    const result = await importBriefFromUrl('https://a.example/');
    expect(result).toEqual({ ok: false, reason: 'unauthorized' });
    expect(fromUrlSpy).not.toHaveBeenCalled();
  });

  it('la Server Action pretende una STRINGA: oggetto, array e null sono rifiutati senza toccare fromUrl', async () => {
    for (const notAString of [{ url: 'https://a.example' }, ['https://a.example'], null, 42]) {
      const result = await importBriefFromUrl(notAString);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('invalid-url');
    }
    expect(fromUrlSpy).not.toHaveBeenCalled();
  });

  it('la Server Action non persiste nulla: su proposta valida upsertBrief non e chiamata', async () => {
    importHolder.proposal = { status: 'proposed', brief: PROPOSED };
    const result = await importBriefFromUrl('https://barsole.example/');
    expect(result.ok).toBe(true);
    expect(upsertBriefSpy).not.toHaveBeenCalled();
  });

  // P1-D16 — `address-blocked` copre sia "non risolvibile" sia "IP interno" per negare
  // l'enumerazione DNS: la UI deve dare UN SOLO messaggio e non far capire quale sia. Con
  // un solo motivo di fixture, "messaggio unico" sarebbe vero per costruzione.
  it('P1-D16: motivi di fallimento diversi danno lo STESSO messaggio, e il motivo non entra nel DOM', async () => {
    const messages: string[] = [];
    for (const reason of ['address-blocked', 'network-error', 'scheme-not-allowed', 'timeout']) {
      const user = userEvent.setup();
      importHolder.proposal = { status: 'failed', reason };
      briefsHolder.getResult = { ok: true, brief: BLANK_BRIEF, status: null, complete: false };
      const { container } = await renderRoute();

      await user.type(screen.getByLabelText(on.import.url), TARGET_URL);
      await user.click(screen.getByRole('button', { name: on.import.submit }));

      const alert = await screen.findByRole('alert');
      messages.push(alert.textContent ?? '');
      expect(container.textContent).not.toContain(reason);
      cleanup();
    }
    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toBe(on.import.error);
  });

  // P1-D16, l'altra meta': il collasso dei motivi avviene nella Server Action, non solo
  // nella scelta della stringa da rendere. Senza questa asserzione un motivo di fromUrl
  // poteva ATTRAVERSARE il confine (e restare invisibile solo perche' la UI lo ignora).
  it('P1-D16: la Server Action collassa TUTTI i motivi di fromUrl in un unico reason', async () => {
    const returned = new Set<string>();
    for (const reason of [
      'address-blocked',
      'network-error',
      'scheme-not-allowed',
      'timeout',
      'too-large',
      'content-type-not-allowed',
      'too-many-redirects',
    ]) {
      importHolder.proposal = { status: 'failed', reason };
      const result = await importBriefFromUrl('https://a.example/');
      expect(result.ok).toBe(false);
      if (!result.ok) returned.add(result.reason);
    }
    expect([...returned]).toEqual(['import-failed']);
  });
});

// ---------------------------------------------------------------------------
// Localizzazione (locale es): le etichette del wizard vengono dal catalogo reale.
// ---------------------------------------------------------------------------
describe('T-151 localizzazione (locale es)', () => {
  // covers: AC-151-4
  it('resi in es: Ingresso, Base e navigazione del wizard sono in spagnolo (cataloghi reali)', async () => {
    const user = userEvent.setup();
    const es = esMessages.onboarding;
    await renderRoute(SITE_ID, 'es');

    // Step Ingresso in spagnolo.
    expect(screen.getByText(es.wizard.steps.entry)).toBeTruthy(); // covers: AC-151-4
    expect(screen.getByText(es.wizard.entry.hint)).toBeTruthy(); // covers: AC-151-4
    expect(screen.getByLabelText(es.import.url)).toBeTruthy(); // covers: AC-151-4
    expect(screen.getByRole('button', { name: es.import.submit })).toBeTruthy(); // covers: AC-151-4
    expect(screen.getByRole('button', { name: es.wizard.entry.continue })).toBeTruthy(); // covers: AC-151-4

    // Avanza a Base: nome, legende tipo/obiettivo e navigazione in spagnolo.
    await user.click(screen.getByRole('button', { name: es.wizard.entry.continue }));
    expect(screen.getByLabelText(es.wizard.base.name)).toBeTruthy(); // covers: AC-151-4
    expect(screen.getByText(es.fields.vertical)).toBeTruthy(); // covers: AC-151-4
    expect(screen.getByText(es.fields.primaryGoal)).toBeTruthy(); // covers: AC-151-4
    expect(screen.getByRole('button', { name: es.verticals.ristorazione })).toBeTruthy(); // covers: AC-151-4
    expect(screen.getByRole('button', { name: es.wizard.nav.next })).toBeTruthy(); // covers: AC-151-4
    expect(screen.getByRole('button', { name: es.wizard.nav.back })).toBeTruthy(); // covers: AC-151-4

    // Le chiavi rese sono DAVVERO diverse dall'italiano (spagnolo vero, non copiato).
    expect(es.wizard.steps.entry).not.toBe(w.steps.entry); // covers: AC-151-4
    expect(es.wizard.entry.continue).not.toBe(w.entry.continue); // covers: AC-151-4
    expect(es.wizard.base.name).not.toBe(w.base.name); // covers: AC-151-4
    expect(es.wizard.nav.next).not.toBe(w.nav.next); // covers: AC-151-4
    expect(es.import.submit).not.toBe(on.import.submit); // covers: AC-151-4
    expect(es.verticals.ristorazione).not.toBe(on.verticals.ristorazione); // covers: AC-151-4

    // E nessuna stringa italiana del wizard e' rimasta nel DOM reso in es.
    expect(screen.queryByText(w.base.name)).toBeNull(); // covers: AC-151-4
    expect(screen.queryByRole('button', { name: w.nav.next })).toBeNull(); // covers: AC-151-4
  });

  // covers: AC-151-4
  it('resi in es: anche il messaggio d errore d import viene dal catalogo spagnolo', async () => {
    const user = userEvent.setup();
    const es = esMessages.onboarding;
    importHolder.proposal = { status: 'failed', reason: 'address-blocked' };
    briefsHolder.getResult = { ok: true, brief: BLANK_BRIEF, status: null, complete: false };
    await renderRoute(SITE_ID, 'es');

    await user.type(screen.getByLabelText(es.import.url), 'https://a.example/');
    await user.click(screen.getByRole('button', { name: es.import.submit }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(es.import.error); // covers: AC-151-4
    expect(es.import.error).not.toBe(on.import.error); // covers: AC-151-4
  });
});

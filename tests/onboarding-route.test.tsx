// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import itMessages from '../messages/it.json';
import esMessages from '../messages/es.json';

// T-150 (macrotask onboarding-ui, P1) — ORACOLO della rotta onboarding protetta (la
// PAGINA). Le asserzioni derivano da AC-150-1/2/4 (04-onboarding-ui.md); ognuna e
// taggata `// covers: AC-150-<n>`. L'endpoint di turno chat e' stato RIMOSSO (OGW-601):
// qui resta la protezione della pagina e la negazione cross-tenant su di essa.
//
// Cosa mockiamo e perche NON e hollow:
//  - next/navigation: redirect/notFound con throw-sentinel, come in produzione (in
//    Next lanciano davvero e interrompono il render) + usePathname per AppShell.
//  - next/link: <a> semplice (nessun runtime Next).
//  - next-intl/server getTranslations: risolve dal catalogo REALE it, cosi le
//    asserzioni sulle etichette sono su stringhe autentiche, non finte.
//  - @/data/supabase-ssr getUser, @/data/sites listSites, @/data/briefs getBrief: i
//    seam dati che la pagina legge per accertare la proprieta e caricare il brief.
//
// Proprieta che questo oracolo PINNA oltre agli AC, ognuna perche una mutazione
// sopravvissuta ha dimostrato che senza asserzione esplicita non e provata:
//  - IDENTITA del siteId: le fixture hanno DUE siti posseduti con SITE_A NON in
//    posizione 0, cosi `sites[0].id` al posto di `siteId` e osservabile.
//  - UGUAGLIANZA ESATTA dell'id: un id che e solo PREFISSO di un id posseduto e negato.
//  - GUARDIA della pagina dove il middleware non arriva (siteId con un punto).
//  - GUASTO NOSTRO ≠ NON TROVATO sulla pagina: un ok:false di listSites non e un 404. Con
//    solo fixture ok:true la differenza non esisteva e la forma che le confondeva passava.

const { REDIRECT, NOT_FOUND, redirectSpy, notFoundSpy } = vi.hoisted(() => {
  const redirectSentinel = Symbol('redirect');
  const notFoundSentinel = Symbol('not-found');
  return {
    REDIRECT: redirectSentinel,
    NOT_FOUND: notFoundSentinel,
    redirectSpy: vi.fn(() => {
      throw redirectSentinel;
    }),
    notFoundSpy: vi.fn(() => {
      throw notFoundSentinel;
    }),
  };
});

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

const { authHolder } = vi.hoisted(() => ({
  authHolder: { user: null as { id: string } | null },
}));
vi.mock('@/data/supabase-ssr', () => ({ getUser: async () => authHolder.user }));

const { sitesHolder, listSitesSpy } = vi.hoisted(() => {
  const holder = {
    list: { ok: true, sites: [] } as unknown,
  };
  return { sitesHolder: holder, listSitesSpy: vi.fn(async () => holder.list) };
});
vi.mock('@/data/sites', () => ({ listSites: listSitesSpy }));

const { briefsHolder, getBriefSpy, upsertBriefSpy } = vi.hoisted(() => {
  const holder = {
    get: null as unknown,
    // Risposta di getBrief PER SITO. Serve perche le fixture hanno DUE siti posseduti:
    // se il mock ignorasse il siteId, leggere il brief del sito sbagliato sarebbe
    // indistinguibile da leggere quello giusto e la mutazione `sites[0].id` al posto di
    // `siteId` sopravviverebbe.
    getBySite: {} as Record<string, unknown>,
    upsertResult: { ok: true, complete: false } as unknown,
    // Cancello controllato dal TEST: finche non viene aperto, upsertBrief resta IN
    // VOLO. E l'unico modo per provare (non dichiarare) che il chunk `text` esce
    // PRIMA che la scrittura sul DB sia completata.
    gate: null as Promise<void> | null,
    upsertSettled: false,
    upsertCalls: [] as unknown[][],
  };
  return {
    briefsHolder: holder,
    getBriefSpy: vi.fn(async (siteId: string) => holder.getBySite[siteId] ?? holder.get),
    upsertBriefSpy: vi.fn(async (...args: unknown[]) => {
      holder.upsertCalls.push(args);
      if (holder.gate) await holder.gate;
      holder.upsertSettled = true;
      return holder.upsertResult;
    }),
  };
});
vi.mock('@/data/briefs', () => ({ getBrief: getBriefSpy, upsertBrief: upsertBriefSpy }));

// Import DOPO i mock (vi.mock e hoisted).
import OnboardingPage from '@/app/[locale]/onboarding/[siteId]/page';
import { applyBriefUpdate, emptyBrief } from '@/domain/onboarding/brief';

const SITE_A = 'site-of-a';
const SITE_A_NAME = 'Officina di A';
const SITE_B = 'site-of-b';
const SITE_B_NAME = 'Panetteria di B';
const UNKNOWN_SITE = 'site-che-non-esiste';
// PREFISSO PROPRIO di entrambi gli id posseduti: non e un id di nessun sito, ma
// `site.id.startsWith(siteId)` lo accetterebbe. Serve a provare che il confronto di
// proprieta e un'UGUAGLIANZA ESATTA: con soli id disgiunti (SITE_A vs SITE_B) un
// confronto per prefisso passerebbe i test.
const PREFIX_OF_OWNED = 'site-of';

const SITE_A_ROW = { id: SITE_A, name: SITE_A_NAME, slug: 'officina-di-a', status: 'draft' };
const SITE_B_ROW = { id: SITE_B, name: SITE_B_NAME, slug: 'panetteria-di-b', status: 'draft' };
// DUE siti posseduti, con SITE_A NON in posizione 0: e cio che rende osservabile la
// differenza fra `siteId` (la risorsa richiesta) e `sites[0].id` (il primo sito
// dell'utente). Con una sola fixture a un sito quella differenza non esiste e ogni
// asserzione sull'identita del sito e tautologica.
const OWNED_SITES = [SITE_B_ROW, SITE_A_ROW];

// Brief draft del sito S: costruito col codice di dominio REALE (T-121/T-122), non
// a mano, cosi la forma non puo divergere da quella che getBrief restituisce.
const DRAFT_BRIEF = applyBriefUpdate(emptyBrief('it'), {
  business_name: 'Bar Sole',
  description: 'Caffe e cornetti in centro',
  phone: '+39 06 1234567',
}).brief;

// Brief dell'ALTRO sito posseduto: valori disgiunti da DRAFT_BRIEF, cosi la loro
// comparsa nel DOM prova che si e letto il brief del sito sbagliato.
const SITE_B_BRIEF = applyBriefUpdate(emptyBrief('it'), {
  business_name: 'Panetteria Aurora',
  description: 'Pane a lievitazione naturale',
  phone: '+39 06 7654321',
}).brief;

// La pagina monta OnboardingWorkspace (T-151), che e un componente client e usa
// useTranslations: senza NextIntlClientProvider il render LANCIA. In produzione il
// provider c'e — src/app/[locale]/layout.tsx lo avvolge intorno a ogni rotta sotto
// /[locale], quindi anche a questa — percio si avvolge qui col catalogo REALE del
// locale invece di stubbare il pannello: cosi le asserzioni restano sul DOM che
// l'utente vede, e non su props che nessuno rende.
const CATALOGS = { it: itMessages, es: esMessages } as const;

const renderPage = async (siteId: string, locale: 'it' | 'es' = 'it') => {
  const ui = await OnboardingPage({ params: Promise.resolve({ locale, siteId }) });
  render(
    <NextIntlClientProvider locale={locale} messages={CATALOGS[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
};

beforeEach(() => {
  authHolder.user = { id: 'user-a' };
  sitesHolder.list = { ok: true, sites: OWNED_SITES };
  briefsHolder.get = { ok: true, brief: DRAFT_BRIEF, status: 'draft', complete: false };
  briefsHolder.getBySite = {};
  briefsHolder.upsertResult = { ok: true, complete: false };
  briefsHolder.gate = null;
  briefsHolder.upsertSettled = false;
  briefsHolder.upsertCalls.length = 0;
  redirectSpy.mockClear();
  notFoundSpy.mockClear();
  listSitesSpy.mockClear();
  getBriefSpy.mockClear();
  upsertBriefSpy.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('T-150 rotta onboarding protetta', () => {
  // covers: AC-150-1
  it('senza sessione: la pagina reindirizza al login e il contenuto dell onboarding non viene reso', async () => {
    // given: nessuna sessione autenticata
    authHolder.user = null;
    // when: si richiede /it/onboarding/<siteId>
    await expect(
      OnboardingPage({ params: Promise.resolve({ locale: 'it', siteId: SITE_A }) }),
    ).rejects.toBe(REDIRECT); // covers: AC-150-1
    // then: redirect al login del locale corrente…
    expect(redirectSpy).toHaveBeenCalledWith('/it/login'); // covers: AC-150-1
    // …e nulla dell'onboarding e stato reso ne letto (il redirect interrompe prima).
    expect(screen.queryByText(itMessages.onboarding.title)).toBeNull(); // covers: AC-150-1
    expect(screen.queryByText(SITE_A_NAME)).toBeNull(); // covers: AC-150-1
    expect(listSitesSpy).not.toHaveBeenCalled(); // covers: AC-150-1
    expect(getBriefSpy).not.toHaveBeenCalled(); // covers: AC-150-1
  });

  // covers: AC-150-1
  it('senza sessione: il locale fuori allowlist non entra grezzo nella destinazione del redirect', async () => {
    // given: nessuna sessione e un segmento [locale] arbitrario (input del client)
    authHolder.user = null;
    await expect(
      OnboardingPage({
        params: Promise.resolve({ locale: '../../evil.example.com', siteId: SITE_A }),
      }),
    ).rejects.toBe(REDIRECT); // covers: AC-150-1
    // then: la destinazione resta interna e vincolata all'allowlist (default it)
    expect(redirectSpy).toHaveBeenCalledWith('/it/login'); // covers: AC-150-1
  });

  // covers: AC-150-1
  // Il getUser della pagina NON e ridondanza: il matcher del middleware
  // (`/((?!api|_next|_vercel|.*\..*).*)`) esclude ogni pathname che contenga un punto,
  // quindi per /it/onboarding/a.b la guardia di route NON PARTE AFFATTO e questa e
  // l'unica difesa nel percorso. Pinnato qui perche il test del middleware invoca la
  // funzione direttamente e non puo vedere l'esclusione del matcher.
  it('senza sessione: la pagina reindirizza al login anche per un siteId che il matcher del middleware esclude', async () => {
    // given: nessuna sessione e un siteId che contiene un punto
    authHolder.user = null;
    await expect(
      OnboardingPage({ params: Promise.resolve({ locale: 'it', siteId: 'a.b' }) }),
    ).rejects.toBe(REDIRECT); // covers: AC-150-1
    // then: nega la pagina stessa, senza aver letto nulla
    expect(redirectSpy).toHaveBeenCalledWith('/it/login'); // covers: AC-150-1
    expect(listSitesSpy).not.toHaveBeenCalled(); // covers: AC-150-1
    expect(getBriefSpy).not.toHaveBeenCalled(); // covers: AC-150-1
  });

  // covers: AC-150-2
  it('utente A proprietario di DUE siti: rende il brief del sito RICHIESTO, non del primo dei suoi siti', async () => {
    // given: A possiede due siti (S non e il primo della lista) e ognuno ha un brief
    // distinto. E questa fixture che rende osservabile la differenza fra il siteId
    // della rotta e sites[0].id: un utente con 2+ siti vedrebbe altrimenti il brief
    // del sito sbagliato senza che nessuna asserzione se ne accorga.
    briefsHolder.getBySite = {
      [SITE_A]: { ok: true, brief: DRAFT_BRIEF, status: 'draft', complete: false },
      [SITE_B]: { ok: true, brief: SITE_B_BRIEF, status: 'confirmed', complete: true },
    };
    // when: apre /it/onboarding/S
    await renderPage(SITE_A);

    // then: nessun redirect e nessun 404 → la pagina risponde (200)
    expect(redirectSpy).not.toHaveBeenCalled(); // covers: AC-150-2
    expect(notFoundSpy).not.toHaveBeenCalled(); // covers: AC-150-2
    // then: il brief e caricato per QUEL sito, via getBrief — e per nessun altro
    expect(getBriefSpy).toHaveBeenCalledWith(SITE_A); // covers: AC-150-2
    expect(getBriefSpy).not.toHaveBeenCalledWith(SITE_B); // covers: AC-150-2
    // then: lo stato corrente del brief e reso (etichette localizzate + valori). Con
    // OGW-501 il montaggio non e' piu' il BriefPanel ma il WIZARD, che parte allo step
    // ENTRY: li' i valori del brief non sono ancora visibili. Il `business_name` vive nel
    // controllo EDITABILE dello step BASE, quindi si NAVIGA a Base ("Prosegui") e per un
    // input l'equivalente di getByText e' getByDisplayValue. La prova resta a livello di
    // DOM e non di props, quindi continua a morire se la pagina carica o passa il brief del
    // sito sbagliato. Lo status e il nome del sito sono resi dalla PAGE (fuori dal wizard),
    // quindi restano osservabili.
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: itMessages.onboarding.wizard.entry.continue }),
    );
    const main = within(screen.getByRole('main'));
    expect(main.getByText(itMessages.onboarding.wizard.base.name)).toBeTruthy(); // covers: AC-150-2
    expect(main.getByDisplayValue('Bar Sole')).toBeTruthy(); // covers: AC-150-2
    // `description` ('Caffe e cornetti in centro') e `phone` ('+39 06 1234567') vivono negli
    // step Racconto/Contatti, che in OGW-501 sono ancora StepPlaceholder: la loro resa (e
    // l'asserzione sui valori) e' demandata a OGW-502, che cabla quegli step.
    // OGW-502
    expect(main.getByText(SITE_A_NAME)).toBeTruthy(); // covers: AC-150-2
    expect(main.getByText(itMessages.onboarding.statusDraft)).toBeTruthy(); // covers: AC-150-2
    // then: NULLA dell'altro sito posseduto entra nel DOM — ne il nome ne il brief.
    expect(screen.queryByText(SITE_B_NAME)).toBeNull(); // covers: AC-150-2
    expect(screen.queryByDisplayValue('Panetteria Aurora')).toBeNull(); // covers: AC-150-2
    expect(screen.queryByDisplayValue('Pane a lievitazione naturale')).toBeNull(); // covers: AC-150-2
    expect(screen.queryByText(itMessages.onboarding.statusConfirmed)).toBeNull(); // covers: AC-150-2
  });

  // covers: AC-150-2
  it('sito proprio senza brief ancora creato: la pagina risponde e mostra lo stato vuoto, non un 404', async () => {
    // given: sito S di A senza brief (getBrief → brief:null LEGITTIMO)
    briefsHolder.get = { ok: true, brief: null, status: null, complete: false };
    // when: A apre /it/onboarding/S
    await renderPage(SITE_A);
    // then: la pagina e resa (brief:null NON e trattato come accesso negato). Il
    // segnaposto `briefEmpty` non esiste piu': la pagina monta il WIZARD (OGW-501) su un
    // brief VUOTO, quindi "stato vuoto" significa il guscio reso allo step ENTRY con i
    // campi in bianco — non un messaggio. Il titolo del BriefPanel (`panel.title`) non e'
    // piu' un osservabile: al suo posto si asserisce il titolo dello step Entry, reso dal
    // wizard che la page monta. Le due asserzioni insieme tengono la stessa forza di prima:
    // la pagina ha reso qualcosa (non 404) e non ha reso il brief di nessun altro.
    expect(notFoundSpy).not.toHaveBeenCalled(); // covers: AC-150-2
    const main = within(screen.getByRole('main'));
    expect(main.getByText(itMessages.onboarding.wizard.steps.entry)).toBeTruthy(); // covers: AC-150-2
    expect(screen.queryByDisplayValue('Bar Sole')).toBeNull(); // covers: AC-150-2
  });

  // covers: AC-150-2
  // GUASTO NOSTRO ≠ NON TROVATO. Con `sitesResult.ok ? find(...) : undefined` un ok:false
  // (500) diventava `site === undefined` e quindi notFound(): un errore transitorio di
  // infrastruttura veniva presentato come "questo sito non esiste" — falso, e l'endpoint
  // /api i due casi li distingueva gia. La mutazione che questo test fa morire e proprio
  // il ritorno a quella forma: senza l'asserzione, un ok:false indistinguibile da un sito
  // assente restava verde. Il rimedio non deve pero aprire un canale di enumerazione, e
  // il controllo di senso opposto in coda lo verifica: la distinzione ammessa e fra
  // ERRORE NOSTRO e NON TROVATO, mai fra "non tuo" e "inesistente" (P1-D21).
  it('guasto di listSites: la pagina fallisce come errore, NON come "sito non trovato"', async () => {
    for (const status of [500, 401] as const) {
      notFoundSpy.mockClear();
      getBriefSpy.mockClear();
      sitesHolder.list = { ok: false, status };

      // when: si apre l'onboarding di un sito proprio mentre l'elenco non e leggibile
      const failure = await OnboardingPage({
        params: Promise.resolve({ locale: 'it', siteId: SITE_A }),
      }).then(
        () => {
          throw new Error('la pagina non deve rendere nulla quando la proprieta e ignota');
        },
        (reason: unknown) => reason,
      );

      // then: e un errore server (500 via error boundary), non il sentinel di notFound
      expect(failure).toBeInstanceOf(Error); // covers: AC-150-2
      expect(failure).not.toBe(NOT_FOUND); // covers: AC-150-2
      expect(notFoundSpy).not.toHaveBeenCalled(); // covers: AC-150-2
      // then: nessun dettaglio interno nel messaggio (finisce nei log e, in dev, a schermo)
      expect((failure as Error).message).not.toContain(SITE_A); // covers: AC-150-2
      expect((failure as Error).message).not.toContain(String(status)); // covers: AC-150-2
      // then: del sito non si e letto nulla — il brief non viene toccato
      expect(getBriefSpy).not.toHaveBeenCalled(); // covers: AC-150-2
    }

    // CONTRO-PROVA (P1-D21): quando l'elenco si LEGGE, un sito non proprio e un sito
    // inesistente restano entrambi un notFound(). Il rimedio distingue il guasto, non il
    // tenant: nessun oracolo di enumerazione e stato aperto.
    sitesHolder.list = { ok: true, sites: [SITE_B_ROW] };
    for (const siteId of [SITE_A, UNKNOWN_SITE]) {
      notFoundSpy.mockClear();
      await expect(
        OnboardingPage({ params: Promise.resolve({ locale: 'it', siteId }) }),
      ).rejects.toBe(NOT_FOUND); // covers: AC-150-4
      expect(notFoundSpy).toHaveBeenCalledTimes(1); // covers: AC-150-4
    }
  });
});

describe('T-150 accesso cross-tenant negato (P1-D21)', () => {
  // covers: AC-150-4
  it('utente B non membro dell account di A: la pagina nega l accesso, getBrief non e MAI invocata e nessun dato del sito di A e esposto', async () => {
    // given: B autenticato, non membro dell'account di A; listSites (RLS-backed) non
    // contiene S. Nota: getBrief risponderebbe {ok:true, brief:null} — la stessa cosa
    // che risponde per un sito proprio senza brief: `brief === null` NON distingue i
    // due casi, percio la proprieta si accerta con listSites PRIMA di leggere.
    authHolder.user = { id: 'user-b' };
    sitesHolder.list = { ok: true, sites: [SITE_B_ROW] };
    briefsHolder.get = { ok: true, brief: DRAFT_BRIEF, status: 'draft', complete: false };

    // when: B richiede /it/onboarding/S
    await expect(
      OnboardingPage({ params: Promise.resolve({ locale: 'it', siteId: SITE_A }) }),
    ).rejects.toBe(NOT_FOUND); // covers: AC-150-4

    // then: accesso negato (404) e il brief non e stato caricato
    expect(notFoundSpy).toHaveBeenCalled(); // covers: AC-150-4
    expect(getBriefSpy).not.toHaveBeenCalled(); // covers: AC-150-4
    // then: nessun dato del sito di A e nulla del suo brief sono esposti
    expect(screen.queryByText(SITE_A_NAME)).toBeNull(); // covers: AC-150-4
    expect(screen.queryByText('Bar Sole')).toBeNull(); // covers: AC-150-4
  });

  // covers: AC-150-4
  it('pagina: sito di un altro tenant e sito inesistente sono INDISTINGUIBILI (nessun oracolo di enumerazione)', async () => {
    authHolder.user = { id: 'user-b' };
    sitesHolder.list = { ok: true, sites: [SITE_B_ROW] };
    for (const siteId of [SITE_A, UNKNOWN_SITE]) {
      notFoundSpy.mockClear();
      redirectSpy.mockClear();
      getBriefSpy.mockClear();
      await expect(
        OnboardingPage({ params: Promise.resolve({ locale: 'it', siteId }) }),
      ).rejects.toBe(NOT_FOUND); // covers: AC-150-4
      // Valore ATTESO ESPLICITO per OGNUNO dei due casi (non "uguale all'altro"): 404,
      // mai un redirect, e nessuna lettura del brief.
      expect(notFoundSpy).toHaveBeenCalledTimes(1); // covers: AC-150-4
      expect(redirectSpy).not.toHaveBeenCalled(); // covers: AC-150-4
      expect(getBriefSpy).not.toHaveBeenCalled(); // covers: AC-150-4
    }
  });

  // covers: AC-150-4
  // La proprieta del sito e un'UGUAGLIANZA ESATTA di id. Con soli id disgiunti
  // (SITE_A vs SITE_B) un confronto per PREFISSO — site.id.startsWith(siteId) —
  // passerebbe ogni caso cross-tenant: qui l'id richiesto e un prefisso proprio di
  // entrambi gli id posseduti, quindi un confronto lasco concederebbe a A l'accesso a un
  // sito che non esiste (e, con id generati da uno schema noto, a un intero sottoinsieme).
  it('un siteId che e solo PREFISSO di un id posseduto e negato: la pagina risponde 404', async () => {
    // given: A autenticato e proprietario di site-of-a e site-of-b (vedi beforeEach)
    // when: chiede 'site-of', che non e l'id di nessun sito
    await expect(
      OnboardingPage({ params: Promise.resolve({ locale: 'it', siteId: PREFIX_OF_OWNED }) }),
    ).rejects.toBe(NOT_FOUND); // covers: AC-150-4
    // then: la pagina nega e non legge nulla
    expect(notFoundSpy).toHaveBeenCalledTimes(1); // covers: AC-150-4
    expect(getBriefSpy).not.toHaveBeenCalled(); // covers: AC-150-4
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import { WaitlistForm } from '@/ui/waitlist/WaitlistForm';

// PUB-241/242 (macrotask waitlist-form, p6a-public-surface) — ORACOLO del form waitlist. Le stringhe
// NON si mockano: si risolvono dal catalogo REALE it dentro NextIntlClientProvider (il test misura la
// SCELTA DELLE CHIAVI del namespace 'landing.waitlist', non stringhe del test). La rete verso
// /api/waitlist è un `fetch` MOCKATO (nessuna chiave/DB nel verde); la site key pubblica è pilotata
// per-caso con vi.stubEnv. Le asserzioni derivano da AC-241-1..3 (widget/stati) e AC-242-1..3
// (consenso GDPR), ognuna taggata `// covers`.

const W = itMessages.landing.waitlist;
const TURNSTILE_ENV = 'NEXT_PUBLIC_TURNSTILE_SITE_KEY';

function wrap(ui: ReactNode, locale: 'it' | 'es' = 'it') {
  return (
    <NextIntlClientProvider locale={locale} messages={itMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('PUB-241/242 WaitlistForm — stati, confine /api/waitlist, consenso GDPR', () => {
  it('AC-241-1: email valida + consenso, 200 "inserted" => testo successNew e POST a /api/waitlist', async () => {
    vi.stubEnv(TURNSTILE_ENV, 'site-key-test');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'inserted' }));
    vi.stubGlobal('fetch', fetchMock);

    render(wrap(<WaitlistForm slot="hero" />));
    fireEvent.change(screen.getByLabelText(W.emailLabel), { target: { value: 'mario@bar.it' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: W.submit }));

    await waitFor(() => expect(screen.getByText(W.successNew)).toBeTruthy()); // covers: AC-241-1
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/waitlist'); // covers: AC-241-1
    expect(init.method).toBe('POST'); // covers: AC-241-1
    // Il corpo porta l'email inserita e il locale corrente (contratto con l'endpoint PUB-231).
    expect(JSON.parse(init.body as string)).toMatchObject({ email: 'mario@bar.it', locale: 'it' }); // covers: AC-241-1
  });

  it('AC-241-2: 200 "already" => testo successExisting (amichevole, NON un errore)', async () => {
    vi.stubEnv(TURNSTILE_ENV, 'site-key-test');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'already' }));
    vi.stubGlobal('fetch', fetchMock);

    render(wrap(<WaitlistForm slot="hero" />));
    fireEvent.change(screen.getByLabelText(W.emailLabel), { target: { value: 'mario@bar.it' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: W.submit }));

    await waitFor(() => expect(screen.getByText(W.successExisting)).toBeTruthy()); // covers: AC-241-2
    expect(screen.queryByText(W.error)).toBeNull(); // covers: AC-241-2
  });

  it('AC-241-2 (contro-prova): non-2xx => testo error (la UI non inventa un successo)', async () => {
    vi.stubEnv(TURNSTILE_ENV, 'site-key-test');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, { error: 'boom' }));
    vi.stubGlobal('fetch', fetchMock);

    render(wrap(<WaitlistForm slot="hero" />));
    fireEvent.change(screen.getByLabelText(W.emailLabel), { target: { value: 'mario@bar.it' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: W.submit }));

    await waitFor(() => expect(screen.getByText(W.error)).toBeTruthy()); // covers: AC-241-2
    expect(screen.queryByText(W.successNew)).toBeNull(); // covers: AC-241-2
    expect(screen.queryByText(W.successExisting)).toBeNull(); // covers: AC-241-2
  });

  it('AC-241-3: senza NEXT_PUBLIC_TURNSTILE_SITE_KEY la regione widget mostra unavailable, nessun crash', () => {
    vi.stubEnv(TURNSTILE_ENV, ''); // assente/vuota => widget non montato
    expect(() => render(wrap(<WaitlistForm slot="hero" />))).not.toThrow(); // covers: AC-241-3
    expect(screen.getByText(W.unavailable)).toBeTruthy(); // covers: AC-241-3
    // Nessun container `.cf-turnstile` è stato montato (solo il messaggio di indisponibilità).
    expect(document.querySelector('.cf-turnstile')).toBeNull(); // covers: AC-241-3
  });

  it('AC-242-1: consenso NON spuntato => submit disabilitato e NESSUN fetch', () => {
    vi.stubEnv(TURNSTILE_ENV, 'site-key-test');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(wrap(<WaitlistForm slot="hero" />));
    // Il checkbox parte NON spuntato (opt-in esplicito, mai pre-selezionato).
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false); // covers: AC-242-1
    fireEvent.change(screen.getByLabelText(W.emailLabel), { target: { value: 'mario@bar.it' } });
    const submit = screen.getByRole('button', { name: W.submit });
    expect((submit as HTMLButtonElement).disabled).toBe(true); // covers: AC-242-1
    fireEvent.click(submit);
    expect(fetchMock).not.toHaveBeenCalled(); // covers: AC-242-1
  });

  it('AC-242-2: spuntato il consenso, submit abilitato e il confine (fetch /api/waitlist) è invocato', async () => {
    vi.stubEnv(TURNSTILE_ENV, 'site-key-test');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'inserted' }));
    vi.stubGlobal('fetch', fetchMock);

    render(wrap(<WaitlistForm slot="hero" />));
    fireEvent.change(screen.getByLabelText(W.emailLabel), { target: { value: 'mario@bar.it' } });
    fireEvent.click(screen.getByRole('checkbox'));
    const submit = screen.getByRole('button', { name: W.submit });
    expect((submit as HTMLButtonElement).disabled).toBe(false); // covers: AC-242-2
    fireEvent.click(submit);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1)); // covers: AC-242-2
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/waitlist'); // covers: AC-242-2
  });

  it('AC-242-3: in locale "it" il link di consenso punta a /it/privacy (href interno fisso)', () => {
    vi.stubEnv(TURNSTILE_ENV, 'site-key-test');
    render(wrap(<WaitlistForm slot="hero" />, 'it'));
    const privacyLink = screen.getByRole('link', { name: itMessages.landing.nav.privacy });
    expect(privacyLink.getAttribute('href')).toBe('/it/privacy'); // covers: AC-242-3
  });
});

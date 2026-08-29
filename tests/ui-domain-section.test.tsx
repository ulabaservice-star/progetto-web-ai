// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import { DomainSection, type DomainView } from '@/ui/domains/DomainSection';

// DOM-501 (macrotask domain-ui, p5-custom-domains-fase2) — ORACOLO della sezione "Dominio
// personalizzato": mostra stato + istruzioni DNS di un collegamento, e le azioni Verifica/Scollega
// passano dagli endpoint guardati (/api/domains/verify|disconnect). Le asserzioni derivano da
// AC-501-1..4 di docs/blueprint/p5-custom-domains-fase2/11-domain-ui.md; ognuna e' taggata `// covers`.
//
// Come per BillingPanel: NON si mocka next-intl (le stringhe si risolvono dal catalogo REALE
// itMessages dentro NextIntlClientProvider — il test misura la SCELTA DELLE CHIAVI, non stringhe del
// test). La rete verso gli endpoint e' un fetch mockato (nessuna chiave provider nel verde). La UI
// riflette il piano/collegamenti risolti dal server (DOM-D5): qui li riceve gia' pronti come props.

const D = itMessages.domains;

function wrap(ui: ReactNode) {
  return (
    <NextIntlClientProvider locale="it" messages={itMessages}>
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
});

describe('DOM-501 DomainSection — stato, istruzioni DNS, azioni', () => {
  it('Pro con collegamento "verifying": mostra i record DNS e lo stato in chiaro', () => {
    const domains: DomainView[] = [
      {
        hostname: 'iltuobar.com',
        status: 'verifying',
        records: [
          { type: 'A', name: '@', value: '76.76.21.21' },
          { type: 'TXT', name: '_ulaba-verify', value: 'tok-abc-123' },
        ],
      },
    ];
    const { container } = render(
      wrap(<DomainSection plan="pro" siteId="s1" initialDomains={domains} subscriptionHref="/it/billing" />),
    );

    expect(screen.getByText('iltuobar.com')).toBeTruthy(); // covers: AC-501-1
    expect(screen.getByText(D.status.verifying)).toBeTruthy(); // covers: AC-501-1
    // I record DNS (type/name/value) sono resi in chiaro (istruzioni copiabili).
    expect(container.textContent).toContain('76.76.21.21'); // covers: AC-501-1
    expect(container.textContent).toContain('tok-abc-123'); // covers: AC-501-1
    expect(container.textContent).toContain('_ulaba-verify'); // covers: AC-501-1
  });

  it('Pro con collegamento "pending": Verifica invoca POST /verify e lo stato riflette l’esito', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'verifying' }));
    vi.stubGlobal('fetch', fetchMock);

    const domains: DomainView[] = [
      { hostname: 'iltuobar.com', status: 'pending', records: [{ type: 'A', name: '@', value: '76.76.21.21' }] },
    ];
    render(wrap(<DomainSection plan="pro" siteId="s1" initialDomains={domains} subscriptionHref="/it/billing" />));

    expect(screen.getByText(D.status.pending)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: D.verifyButton }));

    // Lo stato mostrato riflette l'esito del server ('verifying').
    await waitFor(() => expect(screen.getByText(D.status.verifying)).toBeTruthy()); // covers: AC-501-2
    expect(screen.queryByText(D.status.pending)).toBeNull(); // covers: AC-501-2

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/domains/verify'); // covers: AC-501-2
    expect(init.method).toBe('POST'); // covers: AC-501-2
    expect(JSON.parse(init.body as string)).toEqual({ hostname: 'iltuobar.com' }); // covers: AC-501-2
  });

  it('Pro con collegamento "active": Scollega invoca POST /disconnect e la sezione torna a "nessun dominio"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const domains: DomainView[] = [{ hostname: 'iltuobar.com', status: 'active', records: [] }];
    render(wrap(<DomainSection plan="pro" siteId="s1" initialDomains={domains} subscriptionHref="/it/billing" />));

    fireEvent.click(screen.getByRole('button', { name: D.disconnectButton }));

    await waitFor(() => expect(screen.getByText(D.noDomains)).toBeTruthy()); // covers: AC-501-3
    expect(screen.queryByText('iltuobar.com')).toBeNull(); // covers: AC-501-3

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/domains/disconnect'); // covers: AC-501-3
    expect(init.method).toBe('POST'); // covers: AC-501-3
    expect(JSON.parse(init.body as string)).toEqual({ hostname: 'iltuobar.com' }); // covers: AC-501-3
  });

  it('Hostname con markup pericoloso: reso come TESTO con escaping, mai iniettato', () => {
    const evil = '<img src=x onerror="alert(1)">.evil.example';
    const domains: DomainView[] = [{ hostname: evil, status: 'pending', records: [] }];
    const { container } = render(
      wrap(<DomainSection plan="pro" siteId="s1" initialDomains={domains} subscriptionHref="/it/billing" />),
    );

    // Nessun <img> iniettato dal markup dell'hostname: React lo rende come nodo di testo.
    expect(container.querySelector('img')).toBeNull(); // covers: AC-501-4
    // L'hostname compare come testo (escaping preservato).
    expect(screen.getByText(evil)).toBeTruthy(); // covers: AC-501-4
    // Nessun href e' costruito dall'hostname non fidato.
    for (const anchor of Array.from(container.querySelectorAll('a'))) {
      expect(anchor.getAttribute('href') ?? '').not.toContain('evil.example'); // covers: AC-501-4
    }
  });
});

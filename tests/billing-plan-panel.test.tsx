// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import { BillingPanel } from '@/ui/billing/BillingPanel';

// BIL-401 (macrotask billing-ui, p5-billing-fase1) — ORACOLO del pannello "Abbonamento":
// mostra il piano corrente letto server-side (plan) e, se Free, la CTA che apre il Checkout.
// Le asserzioni derivano da AC-401-1..3 di docs/blueprint/p5-billing-fase1/04-billing-ui.md;
// ognuna e' taggata `// covers: AC-401-<n>`.
//
// NON si mocka next-intl: le stringhe si risolvono dai cataloghi REALI (itMessages) dentro
// NextIntlClientProvider — cosi' il test misura la SCELTA DELLE CHIAVI del componente
// (piano da `billing.plan.*`, CTA da `billing.upgradeCta`), non stringhe del test.
//
// La UI NON decide l'entitlement (BIL-D2): riceve plan/status gia' risolti dal server e li
// riflette. Il redirect e' iniettato (`navigate`) per osservare la destinazione senza navigare
// davvero; la rete verso l'endpoint checkout e' un fetch mockato (nessuna chiave Stripe nel verde).

const B = itMessages.billing;

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

describe('BIL-401 BillingPanel — stato piano + CTA Passa a Pro', () => {
  it('Free: mostra il piano Free e la CTA "Passa a Pro"', () => {
    render(wrap(<BillingPanel plan="free" status={null} navigate={vi.fn()} />));

    expect(screen.getByText(B.plan.free)).toBeTruthy(); // covers: AC-401-1
    expect(screen.getByRole('button', { name: B.upgradeCta })).toBeTruthy(); // covers: AC-401-1
  });

  it('Free + click CTA: invoca l’endpoint createCheckout e reindirizza alla url ricevuta', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { url: 'https://checkout.stripe.test/session-1' }));
    vi.stubGlobal('fetch', fetchMock);
    const navigate = vi.fn();

    render(wrap(<BillingPanel plan="free" status={null} navigate={navigate} />));
    fireEvent.click(screen.getByRole('button', { name: B.upgradeCta }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://checkout.stripe.test/session-1')); // covers: AC-401-2
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/billing/checkout'); // covers: AC-401-2
    expect(init.method).toBe('POST'); // covers: AC-401-2
  });

  it('Pro: mostra il piano Pro attivo e NESSUNA CTA di upgrade', () => {
    render(wrap(<BillingPanel plan="pro" status="active" navigate={vi.fn()} />));

    expect(screen.getByText(B.plan.pro)).toBeTruthy(); // covers: AC-401-3
    expect(screen.queryByRole('button', { name: B.upgradeCta })).toBeNull(); // covers: AC-401-3
  });
});

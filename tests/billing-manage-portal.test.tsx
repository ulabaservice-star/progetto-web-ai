// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import { BillingPanel } from '@/ui/billing/BillingPanel';

// BIL-402 (macrotask billing-ui, p5-billing-fase1) — ORACOLO della GESTIONE abbonamento:
// pulsante che apre il Billing Portal + esposizione comprensibile degli stati. Le asserzioni
// derivano da AC-402-1..3 di docs/blueprint/p5-billing-fase1/04-billing-ui.md; ognuna e'
// taggata `// covers: AC-402-<n>`.
//
// Stringhe dai cataloghi REALI (itMessages) dentro NextIntlClientProvider: il test misura la
// SCELTA DELLE CHIAVI (stato da `billing.status.*`, azione da `billing.manageCta`), non stringhe
// del test. Anti-tautologia su AC-402-2: past_due NON deve leggersi come "scaduto" — si asserisce
// la presenza dell'etichetta di grazia E l'assenza della parola "scaduto"/"scaduta" nel pannello.

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

describe('BIL-402 BillingPanel — gestione portale + stati', () => {
  it('sub gestibile + click "Gestisci": invoca openBillingPortal e reindirizza al portale', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { url: 'https://billing.stripe.test/portal-1' }));
    vi.stubGlobal('fetch', fetchMock);
    const navigate = vi.fn();

    render(wrap(<BillingPanel plan="pro" status="active" navigate={navigate} />));
    fireEvent.click(screen.getByRole('button', { name: B.manageCta }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://billing.stripe.test/portal-1')); // covers: AC-402-1
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/billing/portal'); // covers: AC-402-1
    expect(init.method).toBe('POST'); // covers: AC-402-1
  });

  it('past_due (in grazia): comunica "ancora attivo, regolarizza", MAI "scaduto"', () => {
    const { container } = render(wrap(<BillingPanel plan="pro" status="past_due" navigate={vi.fn()} />));

    expect(screen.getByText(B.status.pastDue)).toBeTruthy(); // covers: AC-402-2
    // La grazia non deve MAI apparire come "scaduto/scaduta" (retrocessione morbida, BIL-D6).
    expect(container.textContent?.toLowerCase()).not.toContain('scadut'); // covers: AC-402-2
  });

  it('canceled: mostra lo stato disdetto e l’opzione di ri-abbonarsi (CTA Passa a Pro)', () => {
    render(wrap(<BillingPanel plan="free" status="canceled" navigate={vi.fn()} />));

    expect(screen.getByText(B.status.canceled)).toBeTruthy(); // covers: AC-402-3
    expect(screen.getByRole('button', { name: B.upgradeCta })).toBeTruthy(); // covers: AC-402-3
    // Un abbonamento disdetto non ha nulla da "gestire" in Fase 1: niente pulsante portale.
    expect(screen.queryByRole('button', { name: B.manageCta })).toBeNull(); // covers: AC-402-3
  });
});

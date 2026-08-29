// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import { DomainSection, type DomainView } from '@/ui/domains/DomainSection';

// DOM-502 (macrotask domain-ui, p5-custom-domains-fase2) — ORACOLO del gate Pro/Free della sezione
// "Dominio personalizzato". Le asserzioni derivano da AC-502-1..3 di
// docs/blueprint/p5-custom-domains-fase2/11-domain-ui.md; ognuna e' taggata `// covers`.
//
// La decisione Pro/Free e' una funzione PURA della prop `plan`, che la PAGINA risolve server-side
// da getAccountEntitlement (DOM-D5): il componente la riflette e non offre alcun modo client di
// ribaltarla. Il wiring server (getAccountEntitlement) e' esercitato dalla pagina; qui si prova che
// il ramo Free non monta MAI form/pulsanti, coerente col gate server DOM-301.

const D = itMessages.domains;

function wrap(ui: ReactNode) {
  return (
    <NextIntlClientProvider locale="it" messages={itMessages}>
      {ui}
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe('DOM-502 DomainSection — gate Pro/Free', () => {
  it('Pro: mostra il form di collegamento, non la CTA di upgrade', () => {
    render(wrap(<DomainSection plan="pro" siteId="s1" initialDomains={[]} subscriptionHref="/it/billing" />));

    expect(screen.getByRole('button', { name: D.connectButton })).toBeTruthy(); // covers: AC-502-1
    expect(screen.getByLabelText(D.hostnameLabel)).toBeTruthy(); // covers: AC-502-1
    expect(screen.queryByRole('link', { name: D.upgradeCta })).toBeNull(); // covers: AC-502-1
  });

  it('Free: mostra la card "Passa a Pro" con link ad Abbonamento e NESSUN form/pulsante', () => {
    const { container } = render(
      wrap(<DomainSection plan="free" siteId="s1" initialDomains={[]} subscriptionHref="/it/billing" />),
    );

    const link = screen.getByRole('link', { name: D.upgradeCta });
    expect(link.getAttribute('href')).toBe('/it/billing'); // covers: AC-502-2
    expect(screen.getByText(D.upgradeBody)).toBeTruthy(); // covers: AC-502-2
    // Il ramo Free non monta alcun controllo di collegamento: nessun input, nessun pulsante.
    expect(container.querySelector('input')).toBeNull(); // covers: AC-502-2
    expect(container.querySelector('button')).toBeNull(); // covers: AC-502-2
    expect(screen.queryByRole('button', { name: D.connectButton })).toBeNull(); // covers: AC-502-2
  });

  it('Free anche con collegamenti presenti: nessuna azione (decisione dal solo `plan` server)', () => {
    // Malgrado initialDomains popolato, il gate dipende SOLO da `plan` (risolto server-side): un Free
    // non vede stato ne' azioni ne' record, solo la CTA di upgrade. Se la decisione derivasse da un
    // flag/collegamento del client, qui comparirebbe il form: non accade.
    const domains: DomainView[] = [
      { hostname: 'iltuobar.com', status: 'active', records: [{ type: 'A', name: '@', value: '76.76.21.21' }] },
    ];
    const { container } = render(
      wrap(<DomainSection plan="free" siteId="s1" initialDomains={domains} subscriptionHref="/it/billing" />),
    );

    expect(container.querySelector('button')).toBeNull(); // covers: AC-502-3
    expect(screen.queryByText(D.disconnectButton)).toBeNull(); // covers: AC-502-3
    expect(screen.queryByText(D.status.active)).toBeNull(); // covers: AC-502-3
    expect(container.textContent).not.toContain('76.76.21.21'); // covers: AC-502-3
    expect(screen.getByRole('link', { name: D.upgradeCta })).toBeTruthy(); // covers: AC-502-3
  });
});

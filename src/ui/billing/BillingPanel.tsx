'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SubscriptionStatus } from '@/domain/billing/entitlement';
import { requestCheckoutUrl, requestPortalUrl } from '@/ui/billing/billing-calls';

type Plan = 'free' | 'pro';

type BillingPanelProps = {
  /** Il piano EFFETTIVO servito, risolto server-side (BIL-D2): la UI lo riflette, non lo decide. */
  plan: Plan;
  /** Lo stato grezzo della subscription presso il provider, o null se l'account non ne ha alcuna. */
  status: SubscriptionStatus | null;
  /**
   * Il redirect a una url ESTERNA (Checkout/Portal Stripe). Iniettabile per i test (osservano la
   * destinazione senza navigare davvero); in produzione naviga il browser. next/navigation non
   * serve: la destinazione e' fuori dall'app, non una rotta interna.
   */
  navigate?: (url: string) => void;
};

function defaultNavigate(url: string): void {
  window.location.assign(url);
}

// L'etichetta di stato, mappata a CHIAVI LETTERALI (mai un template dinamico: cosi' resta una
// chiave valida del catalogo e tsc la verifica). 'trialing' e' comunicato come attivo (non
// abbiamo una etichetta di prova dedicata); il past_due e' etichettato come grazia (BIL-D6), MAI
// come "scaduto"; 'canceled' come disdetto.
function statusLabelKey(status: SubscriptionStatus): 'active' | 'pastDue' | 'canceled' {
  switch (status) {
    case 'past_due':
      return 'pastDue';
    case 'canceled':
      return 'canceled';
    // 'active' e 'trialing' (una prova e' servita come piano attivo, BIL-102) → "Attivo".
    default:
      return 'active';
  }
}

// BIL-401/402 (macrotask billing-ui) — il pannello "Abbonamento". Presentazionale: riceve il
// piano/stato gia' risolti dal server e RIFLETTE l'entitlement (non lo determina, BIL-D2). Due
// azioni via gli endpoint esistenti, poi redirect a Stripe (nessun dato di carta da noi, PCI).
export function BillingPanel({ plan, status, navigate = defaultNavigate }: BillingPanelProps) {
  const t = useTranslations('billing');
  const [busy, setBusy] = useState(false);

  // CTA upgrade ⟺ plan === 'free' (mai abbonato, oppure disdetto → si (ri)abbona: AC-402-3).
  const showUpgrade = plan === 'free';
  // Gestisci ⟺ una subscription VIVA presso il provider (active/trialing, o past_due da
  // regolarizzare): un abbonamento disdetto (canceled) non ha nulla da gestire in Fase 1.
  const showManage =
    status === 'active' || status === 'trialing' || status === 'past_due';

  async function go(request: () => Promise<string | null>): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const url = await request();
      if (url) navigate(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="billing-title" className="flex flex-col gap-md">
      <h1 id="billing-title" className="text-2xl font-semibold text-foreground">
        {t('title')}
      </h1>

      <div className="flex flex-col gap-sm rounded-lg border border-border p-lg">
        <p className="text-sm text-muted-foreground">
          {t('currentPlanLabel')}:{' '}
          <strong className="text-foreground">
            {plan === 'pro' ? t('plan.pro') : t('plan.free')}
          </strong>
        </p>

        <p className="text-sm text-foreground">
          {plan === 'pro' ? t('proSummary') : t('freeSummary')}
        </p>

        {status !== null && (
          <p className="text-sm text-muted-foreground">
            {t('statusLabel')}:{' '}
            <span className="text-foreground">{t(`status.${statusLabelKey(status)}`)}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-sm pt-sm">
          {showManage && (
            <button
              type="button"
              onClick={() => void go(requestPortalUrl)}
              disabled={busy}
              className="rounded-md border border-border px-md py-sm text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {t('manageCta')}
            </button>
          )}
          {showUpgrade && (
            <button
              type="button"
              onClick={() => void go(requestCheckoutUrl)}
              disabled={busy}
              className="rounded-md bg-primary px-md py-sm text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {t('upgradeCta')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

import { type NextRequest } from 'next/server';
import { getStripePaymentProvider } from '@/data/payment/stripe';
import { billingActionRoute } from '@/app/api/billing/_guard';

// BIL-203 (macrotask stripe-checkout-webhook, p5-billing-fase1) — Apre il Billing Portal
// (cambio carta / disdetta). Stesse guardie + accountId derivato + scheletro del checkout;
// qui resta solo l'azione: la porta risolve il customer id del provider e ritorna la url.

export function POST(request: NextRequest): Promise<Response> {
  return billingActionRoute(request, 'billing/portal', 'portal-failed', (accountId) =>
    getStripePaymentProvider().openBillingPortal(accountId),
  );
}

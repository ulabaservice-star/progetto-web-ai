import { type NextRequest } from 'next/server';
import { getStripePaymentProvider } from '@/data/payment/stripe';
import { billingActionRoute } from '@/app/api/billing/_guard';

// BIL-203 (macrotask stripe-checkout-webhook, p5-billing-fase1) — Apre un Checkout per passare
// a Pro. Guardie + accountId derivato + scheletro dal preambolo condiviso (_guard); qui resta
// solo l'azione sulla porta. Nessun dato di carta transita da noi (Stripe ospita il checkout,
// noi restituiamo la url). Fase 1 vende SOLO Pro: il piano e' fisso, non un input del client.

export function POST(request: NextRequest): Promise<Response> {
  return billingActionRoute(request, 'billing/checkout', 'checkout-failed', (accountId) =>
    getStripePaymentProvider().createCheckout(accountId, 'pro'),
  );
}

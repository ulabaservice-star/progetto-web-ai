import { NextResponse, type NextRequest } from 'next/server';
import { getStripePaymentProvider } from '@/data/payment/stripe';
import { applySubscriptionEvent } from '@/data/subscriptions-write';
import { applySoftDowngrade } from '@/data/subscription-downgrade';

// BIL-202 (macrotask stripe-checkout-webhook, p5-billing-fase1) — L'endpoint webhook, unica
// sorgente di verita' dello stato dell'abbonamento (BIL-D5). NON usa la catena same-origin
// (guardMutatingRequest): un webhook e' server-to-server (il provider non manda
// Sec-Fetch-Site/Origin) e verrebbe respinto. La difesa e' la FIRMA verificata sul corpo
// GREZZO (request.text(), non request.json() che lo altererebbe): firma non valida => 400,
// nessuna scrittura (anti-spoof). L'idempotenza (dedup per event id) e la scrittura sotto
// service_role vivono in applySubscriptionEvent. Catch che LOGGA + non-2xx: mai un 2xx opaco
// a registrazione mancante, cosi' il provider riprova.

export async function POST(request: NextRequest): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    // Nessuna firma da verificare: non e' un evento autenticabile del provider.
    return NextResponse.json({ error: 'missing-signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  const provider = getStripePaymentProvider();

  let event;
  try {
    event = await provider.parseWebhook(rawBody, signature);
  } catch {
    // Firma non valida => nessun evento, nessuna scrittura (A08:2025 / BIL-D5).
    return NextResponse.json({ error: 'invalid-signature' }, { status: 400 });
  }

  // Evento verificato ma non pertinente ai tipi gestiti: no-op, 2xx (il provider non riprova).
  if (!event) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    await applySubscriptionEvent(event);
    // BIL-502 — applica la retrocessione morbida alla luce dello stato appena persistito:
    // porta offline i SOLI siti eccedenti (mai delete), no-op se l'entitlement resta pro
    // (grazia/attivo). `now` preso UNA volta al confine (gemello di resolveEntitlement).
    // Idempotente: sicuro anche sul replay del provider (nessun eccedente => nessuna azione).
    await applySoftDowngrade(
      event.account_id,
      {
        plan: event.plan,
        status: event.status,
        current_period_end: event.current_period_end,
      },
      new Date(),
    );
    // 2xx sia alla prima applicazione sia sul replay (idempotente): registrazione avvenuta.
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // Osservabilita': logga la causa, MAI un 502/2xx opaco. non-2xx => il provider riprova.
    console.error('[billing/webhook] applicazione evento fallita', error);
    return NextResponse.json({ error: 'processing-failed' }, { status: 500 });
  }
}

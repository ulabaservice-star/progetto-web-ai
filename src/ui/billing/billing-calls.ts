'use client';

// BIL-401/402 (macrotask billing-ui, p5-billing-fase1) — il CONFINE CLIENT verso i due
// endpoint billing (checkout + portal). Un POST same-origin col body vuoto `{}` apre una
// sessione presso il provider e riceve la url a cui reindirizzare; qui vive l'UNICO punto
// che conosce le rotte, fa il `fetch` e traduce la risposta in `url | null`.
//
// Perche' un fetch e non una Server Action: gli endpoint sono route handler con le guardie
// condivise (_guard: same-origin + identita' + accountId derivato dal server, mai dal client).
// Un fetch same-origin POST porta con se' Sec-Fetch-Site: same-origin, che guardMutatingRequest
// esige. Il body e' `{}` (z.object({}).strict lato server): il client NON passa alcun campo —
// l'accountId lo deriva il server dall'identita', cosi' "cross-account" e' impossibile (BIL-D2).
//
// Sicurezza: nessun dato di carta transita da noi (Stripe ospita checkout/portal); riceviamo
// SOLO la url e la validiamo nella FORMA (typeof string) prima di reindirizzare. Un non-2xx,
// una rete caduta o una forma inattesa => null (nessun redirect a una url falsa).

async function openBillingSession(endpoint: string): Promise<string | null> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const url = (data as { url?: unknown }).url;
    return typeof url === 'string' ? url : null;
  } catch {
    return null;
  }
}

/** Apre un Checkout per l'upgrade a Pro e ritorna la sua url (o null se fallisce). */
export function requestCheckoutUrl(): Promise<string | null> {
  return openBillingSession('/api/billing/checkout');
}

/** Apre il Billing Portal (gestione/disdetta) e ritorna la sua url (o null se fallisce). */
export function requestPortalUrl(): Promise<string | null> {
  return openBillingSession('/api/billing/portal');
}

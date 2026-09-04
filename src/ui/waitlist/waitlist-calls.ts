'use client';

// PUB-241 (macrotask waitlist-form, p6a-public-surface) — il CONFINE CLIENT verso l'endpoint della
// waitlist (POST /api/waitlist). Gemello di src/ui/domains/domain-calls.ts: qui vive l'UNICO punto
// che conosce la rotta, fa il `fetch` same-origin e traduce la risposta in un tipo stretto; un
// non-2xx / rete caduta / forma inattesa => esito d'errore (la UI non inventa uno stato).
//
// Il POST porta la stessa FORMA che l'endpoint (PUB-231) attende: email + locale + i campi anti-spam
// (honeypot vuoto per un umano; captchaToken se il widget Turnstile è montato). Un fetch same-origin
// POST porta con sé Sec-Fetch-Site: same-origin, che guardMutatingRequest esige (P6A-D3).
//
// SICUREZZA (A05:2025): nessun valore utente viene interpolato in un URL — la rotta è una costante.
// Il segreto Turnstile NON vive qui (resta server-only, PUB-222): il client conosce solo il token
// emesso dal widget con la site key PUBBLICA.

/** L'esito del POST come lo consuma il form: sottoinsieme stretto del contratto { status } (PUB-232). */
export type WaitlistOutcome = { readonly kind: 'inserted' | 'already' | 'error' };

/** Il corpo inviato a /api/waitlist: la FORMA attesa dall'endpoint (PUB-231). */
export type WaitlistSubmission = {
  readonly email: string;
  readonly locale: string;
  readonly honeypot?: string;
  readonly captchaToken?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * POSTa l'iscrizione a /api/waitlist (same-origin) e mappa il contratto { status } dell'endpoint
 * (PUB-232) al tipo stretto { kind }. 'inserted' e 'already' sono ENTRAMBI esiti di successo
 * (anti-enumerazione P6A-D5, ma il form li distingue nel COPY, non nel destino). Qualunque non-2xx,
 * rete caduta o forma inattesa => 'error': la UI riflette solo un esito esplicito del server, mai
 * uno stato inventato.
 */
export async function submitWaitlist(input: WaitlistSubmission): Promise<WaitlistOutcome> {
  try {
    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) return { kind: 'error' };
    const data = (await response.json()) as unknown;
    if (isRecord(data) && (data.status === 'inserted' || data.status === 'already')) {
      return { kind: data.status };
    }
    return { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

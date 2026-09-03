// @vitest-environment node
//
// PUB-232 (macrotask waitlist-endpoint, p6a-public-surface) — ORACOLO della fetta VALIDAZIONE + INSERT
// di POST /api/waitlist. Le asserzioni derivano dagli acceptance_criteria AC-232-1..3
// (09-waitlist-endpoint.md), taggate `// covers: AC-232-x` sulla riga dell'EXPECT.
//
// Lo store e' iniettabile (vi.mock di @/data/waitlist): un fake in-memory/spy, nessun DB reale nel
// verde. Turnstile NON configurato qui (turnstileHolder.configured=false) per isolare la validazione
// dell'email e l'idempotenza dall'anti-spam captcha (coperto da PUB-231). Proprieta' di sicurezza:
// 'inserted' e 'already' sono lo STESSO 200 (anti-enumerazione, P6A-D5); un'email malformata non tocca
// mai lo store.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { insertLeadSpy, turnstileHolder } = vi.hoisted(() => ({
  // Tipizzato sull'esito reale di insertLead (InsertLeadResult): { status: 'inserted' | 'already' },
  // cosi' mockResolvedValue accetta entrambi i rami (idempotenza) senza restringere al solo 'inserted'.
  insertLeadSpy: vi.fn(
    async (): Promise<{ status: 'inserted' | 'already' }> => ({ status: 'inserted' }),
  ),
  turnstileHolder: { configured: false },
}));

vi.mock('@/data/waitlist', () => ({ insertLead: insertLeadSpy }));
vi.mock('@/data/captcha/turnstile', () => ({
  isTurnstileConfigured: () => turnstileHolder.configured,
  getTurnstileVerifier: () => {
    throw new Error('getTurnstileVerifier non deve essere invocato quando Turnstile non e configurato');
  },
}));

import { POST } from '@/app/api/waitlist/route';

const ORIGIN = 'http://localhost';

function waitlistRequest(body: unknown): NextRequest {
  const headers = new Headers({
    'content-type': 'application/json',
    origin: ORIGIN,
    'sec-fetch-site': 'same-origin',
  });
  return new NextRequest(new URL('/api/waitlist', ORIGIN), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  insertLeadSpy.mockClear();
  insertLeadSpy.mockResolvedValue({ status: 'inserted' });
  turnstileHolder.configured = false;
});

describe('PUB-232 POST /api/waitlist — validazione email + insert idempotente', () => {
  it('email valida, store => inserted: 200 { status: inserted } e insertLead chiamato con email+locale', async () => {
    insertLeadSpy.mockResolvedValue({ status: 'inserted' });

    const res = await POST(waitlistRequest({ email: 'mario@bar.it', locale: 'it' }));

    expect(res.status).toBe(200); // covers: AC-232-1
    expect(await res.json()).toEqual({ status: 'inserted' }); // covers: AC-232-1
    expect(insertLeadSpy).toHaveBeenCalledTimes(1); // covers: AC-232-1
    expect(insertLeadSpy).toHaveBeenCalledWith({ email: 'mario@bar.it', locale: 'it', source: 'landing' }); // covers: AC-232-1
  });

  it('store => already (email gia in lista): 200 { status: already }, idempotente, nessun errore', async () => {
    insertLeadSpy.mockResolvedValue({ status: 'already' });

    const res = await POST(waitlistRequest({ email: 'mario@bar.it', locale: 'it' }));

    expect(res.status).toBe(200); // covers: AC-232-2 — stesso 200 di 'inserted' (anti-enumerazione)
    expect(await res.json()).toEqual({ status: 'already' }); // covers: AC-232-2
    expect(insertLeadSpy).toHaveBeenCalledTimes(1); // covers: AC-232-2
  });

  it('email malformata => 422 e insertLead NON chiamato', async () => {
    const res = await POST(waitlistRequest({ email: 'non-una-email', locale: 'it' }));

    expect(res.status).toBe(422); // covers: AC-232-3
    expect(insertLeadSpy).not.toHaveBeenCalled(); // covers: AC-232-3 — nessun insert su forma invalida
  });

  it('CONTRO-PROVA: locale del body propagato allo store (es, non it)', async () => {
    insertLeadSpy.mockResolvedValue({ status: 'inserted' });

    await POST(waitlistRequest({ email: 'ana@bar.es', locale: 'es' }));

    expect(insertLeadSpy).toHaveBeenCalledWith({ email: 'ana@bar.es', locale: 'es', source: 'landing' }); // covers: AC-232-1
  });
});

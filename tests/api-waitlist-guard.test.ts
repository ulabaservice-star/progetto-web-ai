// @vitest-environment node
//
// PUB-231 (macrotask waitlist-endpoint, p6a-public-surface) — ORACOLO della fetta GUARDIE + ANTI-SPAM
// di POST /api/waitlist. Le asserzioni derivano dagli acceptance_criteria AC-231-1..4
// (09-waitlist-endpoint.md), taggate `// covers: AC-231-x` sulla riga dell'EXPECT.
//
// Store e CaptchaVerifier sono INIETTABILI via i loro moduli (gemello dell'idioma DOM-301: si mocka la
// factory/getter e lo store): nessun DB reale, nessuna chiave Turnstile nel verde (P6A-D6/D9). L'endpoint
// e' anonimo (nessun getUser da mockare). La proprieta' di sicurezza: cross-origin/honeypot/captcha-non-ok
// sono respinti PRIMA di scrivere (insertLead mai chiamato).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { makeFakeCaptchaVerifier, type CaptchaVerifier } from '@/domain/captcha/captcha-port';

// vi.hoisted e' issato SOPRA gli import: non puo' invocare makeFakeCaptchaVerifier (non ancora
// inizializzato). Il default e' un literal inline (verify => ok:true); beforeEach lo rimpiazza col fake.
const { insertLeadSpy, turnstileHolder, verifierHolder } = vi.hoisted(() => ({
  insertLeadSpy: vi.fn(async () => ({ status: 'inserted' as const })),
  turnstileHolder: { configured: false },
  verifierHolder: { current: { verify: async () => ({ ok: true }) } as CaptchaVerifier },
}));

vi.mock('@/data/waitlist', () => ({ insertLead: insertLeadSpy }));
vi.mock('@/data/captcha/turnstile', () => ({
  isTurnstileConfigured: () => turnstileHolder.configured,
  getTurnstileVerifier: () => verifierHolder.current,
}));

import { POST } from '@/app/api/waitlist/route';

const ORIGIN = 'http://localhost';

type Init = {
  origin?: string | null;
  fetchSite?: string | null;
  contentLength?: string;
  body?: unknown;
};
function waitlistRequest(init: Init = {}): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  const origin = init.origin === undefined ? ORIGIN : init.origin;
  if (origin !== null) headers.set('origin', origin);
  const fetchSite = init.fetchSite === undefined ? 'same-origin' : init.fetchSite;
  if (fetchSite !== null) headers.set('sec-fetch-site', fetchSite);
  if (init.contentLength !== undefined) headers.set('content-length', init.contentLength);
  const body =
    init.body === undefined ? { email: 'mario@bar.it', locale: 'it' } : init.body;
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
  verifierHolder.current = makeFakeCaptchaVerifier({ ok: true });
});

describe('PUB-231 POST /api/waitlist — guardie same-origin + anti-spam (honeypot + captcha)', () => {
  it('richiesta cross-site (Sec-Fetch-Site assente) => 403 fail-closed, nessun insert', async () => {
    const res = await POST(waitlistRequest({ fetchSite: null }));

    expect(res.status).toBe(403); // covers: AC-231-1
    expect(insertLeadSpy).not.toHaveBeenCalled(); // covers: AC-231-1 — nessuna scrittura
  });

  it('cross-origin esplicito (Origin di un altro sito) => 403, nessun insert', async () => {
    const res = await POST(waitlistRequest({ origin: 'https://evil.example' }));

    expect(res.status).toBe(403); // covers: AC-231-1
    expect(insertLeadSpy).not.toHaveBeenCalled(); // covers: AC-231-1
  });

  it('honeypot valorizzato => 200 SILENTE e insertLead NON chiamato (bot scartato)', async () => {
    const res = await POST(waitlistRequest({ body: { email: 'bot@bar.it', locale: 'it', honeypot: 'ciao' } }));

    expect(res.status).toBe(200); // covers: AC-231-2
    expect(await res.json()).toEqual({ status: 'inserted' }); // covers: AC-231-2 — indistinguibile da un successo
    expect(insertLeadSpy).not.toHaveBeenCalled(); // covers: AC-231-2 — nessun insert
  });

  it('Turnstile configurato + CaptchaVerifier fake { ok:false } => 4xx, nessun insert', async () => {
    turnstileHolder.configured = true;
    verifierHolder.current = makeFakeCaptchaVerifier({ ok: false });

    const res = await POST(
      waitlistRequest({ body: { email: 'mario@bar.it', locale: 'it', captchaToken: 'invalid' } }),
    );

    expect(res.status).toBeGreaterThanOrEqual(400); // covers: AC-231-3
    expect(res.status).toBeLessThan(500); // covers: AC-231-3 — un 4xx, non un 500
    expect(insertLeadSpy).not.toHaveBeenCalled(); // covers: AC-231-3
  });

  it('CONTRO-PROVA: Turnstile configurato + captcha { ok:true } NON blocca (l\'iscrizione procede)', async () => {
    turnstileHolder.configured = true;
    verifierHolder.current = makeFakeCaptchaVerifier({ ok: true });

    const res = await POST(
      waitlistRequest({ body: { email: 'mario@bar.it', locale: 'it', captchaToken: 'good' } }),
    );

    expect(res.status).toBe(200); // covers: AC-231-3 — falsifica un gate captcha sempre-4xx
    expect(insertLeadSpy).toHaveBeenCalledTimes(1); // covers: AC-231-3
  });

  it('isTurnstileConfigured false + body valido same-origin => NON 500, l\'iscrizione procede', async () => {
    turnstileHolder.configured = false;

    const res = await POST(waitlistRequest({ body: { email: 'mario@bar.it', locale: 'it' } }));

    expect(res.status).toBe(200); // covers: AC-231-4 — inerte, mai 500
    expect(res.status).not.toBe(500); // covers: AC-231-4
    expect(insertLeadSpy).toHaveBeenCalledTimes(1); // covers: AC-231-4 — degrada senza captcha, non rifiuta
  });

  it('Content-Length oltre il tetto => 413 prima di leggere il corpo, nessun insert', async () => {
    const res = await POST(waitlistRequest({ contentLength: '100000' }));

    expect(res.status).toBe(413); // covers: AC-231-1 (tetto byte della catena request-guard)
    expect(insertLeadSpy).not.toHaveBeenCalled(); // covers: AC-231-1
  });
});

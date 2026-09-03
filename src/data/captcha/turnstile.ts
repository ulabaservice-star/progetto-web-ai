import 'server-only';

// PUB-222 (macrotask captcha-port, p6a-public-surface) — L'ADATTATORE Cloudflare Turnstile della porta
// CaptchaVerifier. E' l'UNICO punto che conosce l'endpoint di verifica Turnstile: il resto del sistema
// dipende dalla porta (src/domain/captcha/captcha-port.ts), mai da Cloudflare. Modello del confine come
// src/data/domain/vercel.ts e src/data/payment/stripe.ts — `import 'server-only'` (il secret sta di qua,
// fuori dal bundle client) + verify LAZY dietro config INIETTABILE, cosi' importare il modulo senza
// chiavi non lancia e i test iniettano un `fetchImpl` senza rete.
//
// SICUREZZA:
//  - A07/A02:2025 — TURNSTILE_SECRET_KEY e' config di DEPLOY (env Vercel), MAI nel sorgente; letto solo
//    da env (source iniettabile nei test). `import 'server-only'` impedisce il leak nel bundle client.
//  - A01:2025 SSRF — si POSTa SOLO all'endpoint FISSO di Cloudflare; il token dell'utente entra solo nel
//    body come parametro, mai nell'URL: nessun probe verso host arbitrari.
//  - P6A-D6/D9 inerzia dichiarata — senza secret (o su errore di rete/parse) verify ritorna { ok: false }
//    SENZA lanciare (nessun 500) e isTurnstileConfigured e' false, cosi' l'endpoint degrada a "captcha non
//    disponibile", come le CTA Stripe inerti senza env. Nel verde nessuna chiamata reale a Cloudflare.

import type { CaptchaVerifier } from '@/domain/captcha/captcha-port';

/** Endpoint FISSO di verifica Turnstile (anti-SSRF: mai derivato da input). */
const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Config dell'adattatore, iniettabile. `fetchImpl` e' il seam di mock (default: `fetch` globale). */
export type TurnstileConfig = {
  readonly secret: string;
  /** Seam iniettabile per i test (nessuna rete). Default: `fetch` globale. */
  readonly fetchImpl?: typeof fetch;
};

/**
 * `true` SOLO se TURNSTILE_SECRET_KEY e' valorizzato (vuoto/whitespace = false, stessa semantica di
 * loadEnv e degli accessor dei modelli). Assente => adattatore inerte: l'endpoint (PUB-231) degradera' a
 * "captcha non disponibile", mai un 500. `source` iniettabile per i test (default: process.env).
 */
export function isTurnstileConfigured(
  source: Record<string, string | undefined> = process.env,
): boolean {
  const value = source.TURNSTILE_SECRET_KEY;
  return value !== undefined && value.trim() !== '';
}

/** Estrae in modo difensivo `success` dal payload Turnstile (robusto a differenze di forma). */
function successFrom(payload: unknown): boolean {
  return typeof payload === 'object' && payload !== null && (payload as { success?: unknown }).success === true;
}

/**
 * Costruisce un CaptchaVerifier su una config Turnstile iniettata. `verify` POSTa il secret+token
 * all'endpoint FISSO di Cloudflare via `fetchImpl` e mappa la risposta a { ok }. INERTE per costruzione:
 * secret assente => nessuna rete e { ok: false }; qualunque errore di rete/parse => { ok: false } SENZA
 * lanciare (nessun 500). Gemello di createVercelDomainProvider (server-only + config iniettabile).
 */
export function createTurnstileVerifier(config: TurnstileConfig): CaptchaVerifier {
  const doFetch = config.fetchImpl ?? fetch;
  const secret = config.secret;

  return {
    async verify(token: string): Promise<{ ok: boolean }> {
      // Inerte senza secret: non tocca la rete, nega (P6A-D9) — l'endpoint decide su { ok }.
      if (secret.trim() === '') return { ok: false };
      try {
        const body = new URLSearchParams({ secret, response: token });
        const res = await doFetch(TURNSTILE_SITEVERIFY_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
        });
        const payload: unknown = await res.json();
        return { ok: successFrom(payload) };
      } catch {
        // Rete giu'/parse fallito => nega senza propagare (nessun 500 all'endpoint).
        return { ok: false };
      }
    },
  };
}

/**
 * L'adattatore Turnstile REALE, costruito dalla config di DEPLOY (env). Legge TURNSTILE_SECRET_KEY SOLO
 * da env (mai dal sorgente, A07/A02:2025) e delega a createTurnstileVerifier. Gemello di
 * getVercelDomainProvider / getStripePaymentProvider: il route handler (PUB-231) consuma QUESTO getter e
 * non conosce il secret. INERTE senza env (secret vuoto => verify nega senza rete, nessun 500 — P6A-D6/D9):
 * l'endpoint gatea la chiamata con isTurnstileConfigured, quindi qui il secret e' valorizzato quando serve.
 */
export function getTurnstileVerifier(): CaptchaVerifier {
  return createTurnstileVerifier({ secret: process.env.TURNSTILE_SECRET_KEY ?? '' });
}

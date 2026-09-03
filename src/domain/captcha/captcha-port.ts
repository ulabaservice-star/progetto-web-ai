// PUB-221 (macrotask captcha-port, p6a-public-surface) — La PORTA dell'anti-spam, dominio PURO (solo
// un'interfaccia + un fake iniettabile: nessun I/O, nessun env, nessuna rete, nessun segreto). L'endpoint
// waitlist (PUB-231) dipende da QUESTA astrazione, mai da Turnstile: l'adattatore reale
// (src/data/captcha/turnstile.ts, PUB-222) la implementa con import 'server-only'; nei test un fake
// iniettato la implementa senza chiavi (P6A-D6/D9), cosi' il checkpoint e' verde senza TURNSTILE_SECRET_KEY.
// Gemella di src/domain/domains/domain-port.ts vs src/data/domain/vercel.ts. Un provider anti-spam
// diverso sara' un nuovo adattatore della stessa porta, endpoint invariato.

/**
 * La porta anti-spam. `verify` prende il token di challenge prodotto dal widget client e ritorna un
 * esito NORMALIZZATO { ok }: `true` = challenge superata (procedi), `false` = fallita/assente (rifiuta).
 * Non lancia mai: l'adattatore assorbe rete/parse e l'endpoint decide su { ok }, non su un'eccezione.
 */
export type CaptchaVerifier = {
  verify(token: string): Promise<{ ok: boolean }>;
};

/**
 * Fake iniettabile della porta per i test: ritorna SEMPRE l'esito predeterminato `result`, senza rete
 * ne' chiavi (gemello di createFakeDomainProvider). Cosi' l'endpoint/UI a valle si prova con un captcha
 * "passa" o "fallisce" deterministico e nessun TURNSTILE_SECRET_KEY entra nel verde.
 */
export function makeFakeCaptchaVerifier(result: { ok: boolean }): CaptchaVerifier {
  return {
    // Nessun parametro: una fn 0-ario e' assegnabile a verify(token: string) (come i fake di
    // domain-port) => niente arg inutilizzato da lint, il fake ignora il token per costruzione.
    async verify(): Promise<{ ok: boolean }> {
      return { ok: result.ok };
    },
  };
}

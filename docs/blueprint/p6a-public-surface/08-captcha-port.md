# 08-captcha-port — Macrotask `captcha-port`

> L'anti-spam dietro una **porta** `CaptchaVerifier` pura (PUB-221, con fake iniettabile per i test) e
> l'**adattatore Turnstile** che la implementa (PUB-222): `import 'server-only'`, client **lazy** su
> config iniettabile, **env-gated** su `TURNSTILE_SECRET_KEY`. Senza env l'adattatore è **inerte
> dichiarato** — `isTurnstileConfigured()` è `false` e un `verify` non lancia mai (nessun 500), come le
> CTA Stripe (P6A-D6/D9). Nessuna chiave reale entra nel verde: i test iniettano un fake e un `fetch`
> controllato. Gemello del pattern porta+adattatore di `src/domain/domains/domain-port.ts` +
> `src/data/domain/vercel.ts`.

## Task atomici

```yaml
- id: PUB-221
  title: "Porta pura CaptchaVerifier + fake iniettabile (src/domain/captcha/captcha-port.ts)"
  macrotask: "captcha-port"
  depends_on: []
  objective: >
    Definire la porta PURA CaptchaVerifier in un modulo dominio nuovo (src/domain/captcha/captcha-port.ts):
    un'interfaccia con verify(token: string): Promise<{ ok: boolean }> e una factory di fake iniettabile
    (gemello del fake DomainProvider) che ritorna un esito predeterminato. Nessun I/O, nessun env, nessuna
    rete: il confine astratto che l'endpoint consuma e i test soddisfano senza chiavi reali.
  definition_of_done:
    - "Nuovo modulo src/domain/captcha/captcha-port.ts che esporta l'interfaccia CaptchaVerifier con verify(token: string): Promise<{ ok: boolean }>"
    - "Factory di fake (es. makeFakeCaptchaVerifier(result: { ok: boolean })) che implementa CaptchaVerifier ritornando l'esito iniettato"
    - "Nessun import di next, process.env, fetch/undici o dell'adattatore Turnstile nel modulo (porta pura)"
  acceptance_criteria:
    - id: AC-221-1
      given: "un fake creato con { ok: true }"
      when: "si invoca verify('qualsiasi-token')"
      then: "risolve { ok: true }"
    - id: AC-221-2
      given: "un fake creato con { ok: false }"
      when: "si invoca verify('qualsiasi-token')"
      then: "risolve { ok: false }"
  target_tests:
    - file: "tests/captcha-port.test.ts"
      covers: [AC-221-1, AC-221-2]
  security_notes:
    - "A07:2025 — la porta è pura e non conosce segreti; nei test il fake sostituisce il provider reale, così nessun TURNSTILE_SECRET_KEY entra nel verde"
    - "Confine (DOM-D2 analogo) — l'anti-spam è dietro un'astrazione: un domani un provider diverso si aggancia senza toccare l'endpoint"
  out_of_scope:
    - "L'adattatore Turnstile concreto (PUB-222)"
    - "L'uso della porta nell'endpoint (PUB-231)"

- id: PUB-222
  title: "Adattatore Turnstile server-only, lazy, env-gated, inerte senza env (src/data/captcha/turnstile.ts)"
  macrotask: "captcha-port"
  depends_on: [PUB-221]
  objective: >
    Implementare l'adattatore Turnstile in src/data/captcha/turnstile.ts con import 'server-only': un
    isTurnstileConfigured(source?) che è true SOLO se TURNSTILE_SECRET_KEY è valorizzato, e un
    createTurnstileVerifier(opts) che costruisce un CaptchaVerifier su config INIETTABILE (secret + fetch
    iniettabile) e chiama l'endpoint di verifica di Cloudflare in modo LAZY. Senza secret l'adattatore è
    INERTE dichiarato: verify non fa rete e non lancia mai (ritorna { ok: false }), e isTurnstileConfigured
    è false così l'endpoint può degradare a "captcha non disponibile" (P6A-D6/D9), mai un 500. Gemello
    dell'adattatore Vercel (server-only + client lazy su config iniettabile, no segreti nel verde).
  definition_of_done:
    - "Nuovo modulo src/data/captcha/turnstile.ts con import 'server-only' in testa"
    - "isTurnstileConfigured(source?: Record<string,string|undefined>): boolean — true solo se TURNSTILE_SECRET_KEY è valorizzato (vuoto/whitespace = false, come loadEnv)"
    - "createTurnstileVerifier(opts: { secret: string; fetchImpl?: typeof fetch }): CaptchaVerifier — verify(token) POSTa a Cloudflare siteverify il secret+token via fetchImpl (iniettabile) e mappa la risposta a { ok }"
    - "Assenza di secret o errore di rete/parse => verify ritorna { ok: false } SENZA lanciare (inerte, nessun 500); nessuna chiave hardcoded nel sorgente"
  acceptance_criteria:
    - id: AC-222-1
      given: "source senza TURNSTILE_SECRET_KEY (o valore '   ')"
      when: "si invoca isTurnstileConfigured(source)"
      then: "ritorna false (adattatore inerte: l'endpoint degraderà a 'non disponibile', non un 500)"
    - id: AC-222-2
      given: "createTurnstileVerifier con un fetchImpl fake che risponde { success: true }"
      when: "verify('token-valido')"
      then: "risolve { ok: true }"
    - id: AC-222-3
      given: "createTurnstileVerifier con un fetchImpl fake che risponde { success: false } oppure lancia un errore di rete"
      when: "verify('token')"
      then: "risolve { ok: false } senza propagare eccezioni (nessun 500)"
  target_tests:
    - file: "tests/captcha-turnstile.test.ts"
      covers: [AC-222-1, AC-222-2, AC-222-3]
  security_notes:
    - "A07:2025 / A02:2025 — TURNSTILE_SECRET_KEY letto SOLO da env (source iniettabile nei test), mai nel sorgente; import 'server-only' impedisce il leak nel bundle client"
    - "P6A-D9 — inerte senza env (isTurnstileConfigured false, verify no-throw): il collegamento reale è no-op dichiarato, come le CTA Stripe; il checkpoint è verde col fake"
    - "Testabilità senza segreti — fetchImpl iniettabile: nel verde nessuna chiamata di rete reale a Cloudflare"
  out_of_scope:
    - "La decisione dell'endpoint quando isTurnstileConfigured è false (PUB-231)"
    - "Il widget client e la site key pubblica (PUB-241)"
```

## Self-check

- **Checkpoint**: `hygiene` (2 nuovi file clone-free; adattatore gemello di `vercel.ts` = pattern in
  baseline), `security` (`gitleaks` — nessun segreto nel sorgente; `import 'server-only'`), `suite` +
  `AC` (fake + `fetch` iniettato, nessuna rete/chiave reale).
- **Mutazione**: far ritornare `true` a `isTurnstileConfigured` con env assente → AC-222-1 rosso; far
  ri-lanciare `verify` sull'errore di rete → AC-222-3 rosso (throw invece di `{ ok: false }`);
  ignorare il campo `success` della risposta → AC-222-2 rosso.

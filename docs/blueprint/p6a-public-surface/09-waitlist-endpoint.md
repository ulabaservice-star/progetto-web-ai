# 09-waitlist-endpoint — Macrotask `waitlist-endpoint`

> `POST /api/waitlist` in due fette che compongono i pezzi verdi: **PUB-231** le guardie e l'anti-spam
> (same-origin + tetto byte via `guardMutatingRequest`, **honeypot**, **CaptchaVerifier** iniettabile),
> **PUB-232** la validazione e l'inserimento idempotente via lo store (`23505` → `200` "già in lista").
> L'endpoint vive sotto `/api` (escluso dal middleware): la sua difesa è **nel route handler** (P6A-D3).
> Store e verifier sono **iniettabili** → il verde non tocca né DB reale né chiavi (P6A-D6).

## Task atomici

```yaml
- id: PUB-231
  title: "POST /api/waitlist: guardMutatingRequest (same-origin+byte) + honeypot + CaptchaVerifier, inerte senza env Turnstile"
  macrotask: "waitlist-endpoint"
  depends_on: [PUB-211, PUB-221]
  objective: >
    Creare il route handler src/app/api/waitlist/route.ts che, PRIMA di ogni lavoro, applica
    guardMutatingRequest (Sec-Fetch-Site same-origin fail-closed + tetto byte via Content-Length, riuso
    da _shared/request-guard) e parse-a con zod il body { email, locale, honeypot, captchaToken }. Un
    HONEYPOT non vuoto e' un bot: 200 con successo SILENTE, nessun insert. Se isTurnstileConfigured e'
    true, verifica captchaToken con la CaptchaVerifier (INIETTABILE, default adattatore Turnstile): esito
    non-ok => 4xx, nessun insert. Se Turnstile NON e' configurato, l'endpoint degrada senza captcha
    (honeypot + same-origin restano) e NON risponde 500 (inerte dichiarato, P6A-D6).
  definition_of_done:
    - "Nuovo route handler src/app/api/waitlist/route.ts (POST) che invoca guardMutatingRequest(request, { maxBodyBytes: MAX_WAITLIST_BODY_BYTES }) prima di leggere il body"
    - "Body validato con zod: { email: string, locale: 'it'|'es', honeypot?: string, captchaToken?: string }; forma inattesa => jsonError(422/400)"
    - "honeypot non vuoto => risposta 200 di successo SILENTE, senza chiamare lo store (nessun insert)"
    - "isTurnstileConfigured() true => CaptchaVerifier.verify(captchaToken); { ok:false } => jsonError(4xx), nessun insert. CaptchaVerifier iniettabile (default createTurnstileVerifier), fake nei test"
    - "isTurnstileConfigured() false => nessuna verifica captcha, l'iscrizione procede su honeypot+same-origin, nessun 500"
  acceptance_criteria:
    - id: AC-231-1
      given: "una richiesta POST priva dell'header Sec-Fetch-Site (cross-site)"
      when: "colpisce POST /api/waitlist"
      then: "riceve 403 (guardMutatingRequest fail-closed), nessun insert"
    - id: AC-231-2
      given: "un body con honeypot valorizzato (es. honeypot: 'ciao') e uno store/verifier fake iniettati"
      when: "POST /api/waitlist"
      then: "risponde 200 e lo store.insertLead NON e' chiamato (bot scartato in silenzio)"
    - id: AC-231-3
      given: "Turnstile configurato e una CaptchaVerifier fake che ritorna { ok: false }"
      when: "POST /api/waitlist con captchaToken non valido"
      then: "risponde con un 4xx e lo store.insertLead NON e' chiamato"
    - id: AC-231-4
      given: "isTurnstileConfigured false (nessun TURNSTILE_SECRET_KEY) e un body valido same-origin"
      when: "POST /api/waitlist"
      then: "NON risponde 500: l'iscrizione procede (honeypot vuoto, same-origin ok) senza verifica captcha"
  target_tests:
    - file: "tests/api-waitlist-guard.test.ts"
      covers: [AC-231-1, AC-231-2, AC-231-3, AC-231-4]
  security_notes:
    - "A01:2025 CSRF — guardMutatingRequest (Sec-Fetch-Site same-origin fail-closed + tetto byte) su un route handler che muta stato, che NON eredita il controllo d'origine delle Server Action"
    - "P6A-D3 — la difesa dell'endpoint a-consumo e' nel route handler (il middleware esclude /api); l'anonimo non spende oltre l'insert di un lead"
    - "P6A-D6 — honeypot + Turnstile dietro porta (fake nei test); inerte senza env (nessun 500)"
  out_of_scope:
    - "L'inserimento e l'idempotenza 23505 (PUB-232)"
    - "Il rate-limit in-memory (v1, gestibile qui o come follow-up; non oracolato in questo AC)"

- id: PUB-232
  title: "Validazione email + insertLead via store; 23505/'already' -> 200 'già in lista'; email invalida -> 422"
  macrotask: "waitlist-endpoint"
  depends_on: [PUB-211, PUB-221]
  objective: >
    Completare il route handler: superate le guardie e l'anti-spam (PUB-231), validare la forma
    dell'email con zod e inserirla via insertLead dello store (PUB-211). Esito { status:'inserted' } =>
    200 di conferma; { status:'already' } (unique-violation 23505 mappata) => 200 con messaggio "già in
    lista" (idempotente, indistinguibile: nessuna enumerazione degli iscritti). Email malformata => 422,
    nessun insert. Lo store e' iniettabile: nei test un fake in-memory, nessun DB reale nel verde.
  definition_of_done:
    - "email validata con zod (formato email); malformata => jsonError(422), insertLead NON chiamato"
    - "email valida => insertLead({ email, locale, source }, store) con source derivato dalla richiesta (es. 'landing')"
    - "{ status: 'inserted' } => 200 di conferma; { status: 'already' } => 200 con corpo che segnala 'già in lista' (stesso 200, idempotente)"
    - "Il CORPO JSON della 200 porta il campo status: 'inserted' | 'already' (contratto condiviso con waitlist-calls, PUB-241): 'inserted' per il nuovo lead, 'already' per il duplicato idempotente"
    - "Nessuna risposta espone se l'email era nuova o già presente in modo da consentire enumerazione (P6A-D5): 'inserted' e 'already' sono entrambi 200 di successo"
  acceptance_criteria:
    - id: AC-232-1
      given: "un body valido same-origin (honeypot vuoto, captcha ok) e uno store fake che ritorna 'inserted'"
      when: "POST /api/waitlist con email 'mario@bar.it'"
      then: "risponde 200 con corpo { status: 'inserted' } e insertLead e' chiamato con email 'mario@bar.it' e il locale del body"
    - id: AC-232-2
      given: "uno store fake che ritorna { status: 'already' } (email già in lista)"
      when: "POST /api/waitlist con quella email"
      then: "risponde 200 con corpo { status: 'already' } (segnala 'già in lista'; nessun errore, idempotente)"
    - id: AC-232-3
      given: "un body con email malformata 'non-una-email'"
      when: "POST /api/waitlist"
      then: "risponde 422 e insertLead NON e' chiamato"
  target_tests:
    - file: "tests/api-waitlist-insert.test.ts"
      covers: [AC-232-1, AC-232-2, AC-232-3]
  security_notes:
    - "A01:2025 / P6A-D5 — la scrittura passa SOLO dallo store service_role (PUB-211); il client non tocca mai waitlist_leads; nessun account/identità richiesto (superficie anonima)"
    - "Anti-enumerazione — 'inserted' e 'already' sono entrambi 200 (idempotenza indistinguibile), come gli slug non pubblicati (P1-D21)"
    - "P6A-D7 — nessun IP raccolto; il source è un'etichetta di provenienza, non un identificatore personale"
  out_of_scope:
    - "Il form client e i suoi stati (PUB-241/PUB-242)"
    - "L'invio di email di conferma / double opt-in (fuori scope v1, P6A-D7)"
```

## Self-check

- **Checkpoint**: `hygiene` (route handler = entry Next; boilerplate del route dello stesso genere già
  in baseline → ratchet additivo se necessario), `security` (`semgrep`/`rls_check` — nessun
  `service_role` nel percorso utente diretto: passa dallo store; guardia same-origin presente), `suite`
  + `AC` (store fake + CaptchaVerifier fake iniettati, nessuna rete/DB).
- **Mutazione**: rimuovere la chiamata `guardMutatingRequest` → AC-231-1 rosso; inserire il lead anche
  con honeypot valorizzato → AC-231-2 rosso; trattare `{ status:'already' }` come errore (4xx) → AC-232-2
  rosso; saltare la validazione zod dell'email → AC-232-3 rosso.

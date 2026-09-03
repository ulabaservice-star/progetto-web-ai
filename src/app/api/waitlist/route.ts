import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { guardMutatingRequest, jsonError } from '@/app/api/_shared/request-guard';
import { insertLead } from '@/data/waitlist';
import { isTurnstileConfigured, getTurnstileVerifier } from '@/data/captcha/turnstile';

// PUB-231/232 (macrotask waitlist-endpoint, p6a-public-surface) — POST /api/waitlist: l'UNICO
// canale di scrittura della waitlist pubblica. Compone i pezzi gia' verdi in due fette:
//  - PUB-231 (guardie + anti-spam): guardMutatingRequest (same-origin fail-closed + tetto byte,
//    riuso da _shared/request-guard) PRIMA di leggere il corpo; poi zod sulla FORMA del body;
//    HONEYPOT non vuoto => 200 SILENTE senza insert (bot scartato); CaptchaVerifier (porta PUB-221,
//    default adattatore Turnstile PUB-222) verificata SOLO se isTurnstileConfigured e' true, esito
//    non-ok => 4xx. Senza env Turnstile l'endpoint DEGRADA (honeypot+same-origin restano), mai 500.
//  - PUB-232 (validazione + insert): forma dell'email con zod, poi insertLead (store service_role
//    confinato, PUB-211). 'inserted' e 'already' (unique-violation 23505 assorbita) sono ENTRAMBI
//    200 (idempotenza indistinguibile): il corpo porta status: 'inserted' | 'already' (contratto con
//    il form PUB-241), mai un canale per enumerare gli iscritti.
//
// Vive sotto /api (il matcher del middleware ESCLUDE /api del tutto): la sua difesa e' QUI, nel
// route handler (P6A-D3), non nel middleware. E' anonimo (nessun getUser): la superficie pubblica
// non ha identita' — un lead non e' un account.
//
// SICUREZZA:
//  - A01:2025 CSRF — guardMutatingRequest (Sec-Fetch-Site same-origin fail-closed + Origin + tetto
//    byte) su un route handler che MUTA stato e NON eredita il controllo d'origine delle Server
//    Action; i cookie Supabase sono SameSite=Lax, quindi la same-origin va verificata esplicitamente.
//  - P6A-D3 contenimento del costo — l'anonimo non spende oltre l'insert di un lead: nessuna chiamata
//    a pagamento, nessuna risorsa proporzionale all'input.
//  - P6A-D5 anti-enumerazione — 'inserted' e 'already' sono lo stesso 200: la risposta non rivela se
//    l'email era nuova o gia' presente (come gli slug non pubblicati, P1-D21).
//  - P6A-D6/D9 inerzia — honeypot + Turnstile dietro porta; senza TURNSTILE_SECRET_KEY il verify e'
//    inerte (l'endpoint degrada, mai 500), come le CTA Stripe inerti senza env.
//  - P6A-D7 — nessun IP raccolto; `source` e' un'etichetta di provenienza, non un identificatore.
//  - R7 — nessuna service_role nel percorso utente diretto: la scrittura passa SOLO dallo store
//    (insertLead), e il secret Turnstile resta dietro l'adattatore `import 'server-only'`.

// Tetto sui BYTE del corpo. Il body legittimo e' { email (<=254), locale, honeypot (vuoto), captchaToken
// (il token Turnstile arriva fino a ~2 KiB) }: 4 KiB e' abbondante e rifiuta qualunque cosa assurda
// PRIMA di materializzarla, senza tagliare un token legittimo. Confronto su Content-Length (request-guard).
const MAX_WAITLIST_BODY_BYTES = 4096;

// Etichetta di provenienza del lead (P6A-D7): non un identificatore personale. La superficie pubblica
// scrive sempre 'landing'; un canale diverso sara' un'altra etichetta, non un dato dell'utente.
const WAITLIST_SOURCE = 'landing';

// La FORMA del corpo (input NON FIDATO dal browser), strict: nessuna chiave extra. `email` e' solo una
// stringa non vuota QUI — la sua FORMA (formato email) e' validata dopo l'anti-spam (PUB-232), cosi' un
// bot che riempie l'honeypot con un'email malformata riceve comunque il 200 silente (indistinguibile).
const WaitlistShape = z
  .object({
    email: z.string().min(1),
    locale: z.enum(['it', 'es']),
    honeypot: z.string().optional(),
    captchaToken: z.string().optional(),
  })
  .strict();

// Il formato dell'email (PUB-232), applicato DOPO le guardie e l'anti-spam: malformata => 422.
const EmailFormat = z.string().email();

export async function POST(request: NextRequest): Promise<Response> {
  // 1) Catena same-origin + tetto byte (CSRF), PRIMA di qualunque lavoro (AC-231-1).
  const guardFailure = guardMutatingRequest(request, { maxBodyBytes: MAX_WAITLIST_BODY_BYTES });
  if (guardFailure) return guardFailure;

  // 2) Corpo: input NON FIDATO. Un corpo non-JSON => 400; una forma inattesa => 422.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, 'invalid-body');
  }
  const parsed = WaitlistShape.safeParse(rawBody);
  if (!parsed.success) return jsonError(422, 'invalid-body');
  const { email, locale, honeypot, captchaToken } = parsed.data;

  // 3) HONEYPOT: il campo-esca (invisibile all'utente) valorizzato e' un bot. 200 di successo
  //    SILENTE, senza toccare lo store (AC-231-2): scartato in modo indistinguibile da un successo.
  if ((honeypot ?? '').trim() !== '') {
    return NextResponse.json({ status: 'inserted' }, { status: 200 });
  }

  // 4) CAPTCHA: verifica il token SOLO se Turnstile e' configurato. Esito non-ok => 4xx, nessun
  //    insert (AC-231-3). Se NON configurato, l'endpoint degrada su honeypot+same-origin e NON
  //    risponde 500 (AC-231-4): il verify inerte non viene nemmeno invocato (P6A-D6/D9).
  if (isTurnstileConfigured()) {
    const { ok } = await getTurnstileVerifier().verify(captchaToken ?? '');
    if (!ok) return jsonError(403, 'captcha-failed');
  }

  // 5) FORMA dell'email (PUB-232): malformata => 422, nessun insert (AC-232-3).
  if (!EmailFormat.safeParse(email).success) return jsonError(422, 'invalid-email');

  // 6) INSERT idempotente via store service_role confinato (PUB-211). 'inserted' (nuovo lead) e
  //    'already' (23505 assorbita) sono ENTRAMBI 200 col medesimo contratto { status } (AC-232-1/2):
  //    anti-enumerazione P6A-D5. Nessun IP, nessun double opt-in (P6A-D7).
  const result = await insertLead({ email, locale, source: WAITLIST_SOURCE });
  return NextResponse.json({ status: result.status }, { status: 200 });
}

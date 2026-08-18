import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/data/supabase-ssr';
import { guardMutatingRequest } from '@/app/api/_shared/request-guard';
import { guardOwnedSite, loadRouteBrief } from '@/app/api/_shared/route-guards';
import { onboardingLlmPort } from '@/data/llm-ports';
import { createAiUsagePort } from '@/data/ai-usage';
import { generateDescription } from '@/domain/onboarding/generate-description';
import {
  checkAiBudget,
  recordAiUsage,
  DEFAULT_AI_BUDGET_LIMITS,
  type AiUsagePort,
  type AiBudgetDecision,
} from '@/domain/onboarding/ai-budget';

// OGW-302 (macrotask generate-description, onboarding-guided-wizard) — endpoint del pulsante
// ✨ "Genera descrizione": same-origin -> identita' -> proprieta' del sito -> body -> brief
// (per il vertical) -> BUDGET AI (checkAiBudget) -> confine LLM (generateDescription) ->
// recordAiUsage (consume-on-success) -> 200 con la descrizione proposta.
//
// Sicurezza (OWASP 2025), RIUSANDO le guardie condivise (nessuna copia divergente):
//  - A01:2025 (CSRF) + A05:2025 (dimensione): guardMutatingRequest (Sec-Fetch-Site preteso +
//    Origin + tetto byte), la STESSA catena di POST /turn e /generate (T-230).
//  - A01:2025 (cross-tenant, P1-D21): getUser (identita' server-side) + guardOwnedSite (un
//    siteId non proprio riceve la STESSA risposta 404 di uno inesistente). Nessun service_role.
//  - A07/A02:2025 (segreti): la chiave Anthropic resta dietro il confine server-only (T-131),
//    raggiunto solo via il dominio; nulla di segreto attraversa la rotta.
//  - OGW-D4 (spesa governata): checkAiBudget PRIMA della chiamata AI (cap -> 429, rate-limit),
//    recordAiUsage SOLO dopo una descrizione valida (consume-on-success): al cap il modello
//    non viene nemmeno chiamato, e un output fuori-forma non consuma budget.
//  - OGW-D2 (anti-invenzione): la descrizione e' RESTITUITA come proposta editabile (la UI la
//    conferma), mai auto-scritta nel brief: questo endpoint non tocca site_briefs.
//
// L'istante `now` e' prelevato UNA volta e passato sia a checkAiBudget sia a recordAiUsage
// (ai-budget.ts): il rate-limit resta coerente fra il controllo e la registrazione.

// Cap sulla frase in ingresso: una FRASE, non un documento. 2000 code unit sono abbondanti per
// due righe di spunto e sotto il tetto del campo description che espande. Lo `.max()` PRIMA del
// `.trim()` misura la stringa GREZZA (coerente con i cap di P1-D22), `.min(1)` DOPO il trim
// (una frase di soli spazi non ha nulla da espandere). `.strict()`: nessuna chiave extra.
const MAX_PHRASE_CHARS = 2000;
const PhraseSchema = z.string().max(MAX_PHRASE_CHARS).trim().min(1);
const GenerateDescriptionRequestSchema = z.object({ phrase: PhraseSchema }).strict();

// Tetto sui BYTE del body, PRIMA di leggere il corpo (i route handler non hanno il
// bodySizeLimit delle Server Action). Derivato dal cap della frase: 6 byte per code unit (caso
// peggiore UTF-8/\\uXXXX) + involucro JSON `{"phrase":""}`. Un solo campo di testo -> molto piu'
// piccolo del corpo di /turn (che rigioca la history).
const MAX_BODY_BYTES = MAX_PHRASE_CHARS * 6 + 256;

type RouteContext = { params: Promise<{ siteId: string }> };

// Motivo GENERICO: nessun dettaglio interno (anti-enumerazione, P1-D21).
function jsonError(status: number, reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status });
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  // 1) same-origin (CSRF) + tetto sui byte, catena condivisa (T-230).
  const guardFailure = guardMutatingRequest(request, { maxBodyBytes: MAX_BODY_BYTES });
  if (guardFailure) return guardFailure;

  // 2) Identita' server-side validata (mai un flag client). Un endpoint fetch nega 401 JSON.
  const user = await getUser();
  if (!user) return jsonError(401, 'unauthorized');

  const { siteId } = await context.params;

  // 3) Proprieta' del sito (P1-D21): non proprio o inesistente -> stesso 404.
  const ownership = await guardOwnedSite(siteId);
  if (ownership) return ownership;

  // 4) Body: input NON FIDATO. Il tetto sui byte l'ha gia' applicato la guardia al punto (1).
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, 'invalid-body');
  }
  const parsed = GenerateDescriptionRequestSchema.safeParse(rawBody);
  if (!parsed.success) return jsonError(400, 'invalid-body');

  // 5) Brief del sito (RLS): serve il vertical per contestualizzare la descrizione. Brief
  //    assente (sito proprio mai compilato) -> brief vuoto (vertical 'altro'): si genera comunque.
  const briefLoad = await loadRouteBrief(siteId);
  if (!briefLoad.ok) return briefLoad.response;

  // 6) BUDGET AI (OGW-D4), PRIMA della chiamata al modello. Un guasto del contatore (DB) e' un
  //    500 onesto, non un 429 ne' una chiamata AI non governata.
  const now = new Date();
  let usagePort: AiUsagePort;
  let decision: AiBudgetDecision;
  try {
    usagePort = await createAiUsagePort();
    decision = await checkAiBudget(usagePort, siteId, now, DEFAULT_AI_BUDGET_LIMITS);
  } catch (error) {
    console.error('[onboarding/generate-description] controllo budget fallito:', error);
    return jsonError(500, 'unavailable');
  }
  // Cap o rate-limit: 429 e il modello non viene chiamato, il contatore non incrementa.
  if (!decision.allow) return jsonError(429, decision.reason);

  // 7) Il confine LLM (OGW-301 -> T-131). AWAIT prima di rispondere: un guasto resta un 502
  //    ONESTO che LOGGA la causa reale (no 502 opaco), non un output silenzioso.
  let result: Awaited<ReturnType<typeof generateDescription>>;
  try {
    result = await generateDescription(onboardingLlmPort, {
      vertical: briefLoad.brief.vertical,
      phrase: parsed.data.phrase,
    });
  } catch (error) {
    console.error('[onboarding/generate-description] generateDescription ha lanciato:', error);
    return jsonError(502, 'generation-failed');
  }
  // Output fuori forma (vuoto/oltre il tetto): NON e' un successo -> nessuna descrizione
  // proposta e nessun consumo di budget (consume-on-success stretto).
  if (!result.ok) {
    console.error('[onboarding/generate-description] output fuori forma:', result.reason);
    return jsonError(502, 'generation-failed');
  }

  // 8) CONSUME-ON-SUCCESS: registra l'uso SOLO ora che una descrizione valida esiste. Un guasto
  //    di scrittura del contatore non annulla la descrizione (l'AI e' gia' stata spesa): si
  //    LOGGA e si risponde 200 col valore. LIMITE DICHIARATO: under-counting su guasto DB, non
  //    un canale d'abuso (l'utente non controlla il guasto della scrittura).
  try {
    await recordAiUsage(usagePort, siteId, 'generate_description', now);
  } catch (error) {
    console.error('[onboarding/generate-description] recordAiUsage ha lanciato:', error);
  }

  // La descrizione e' una PROPOSTA editabile (OGW-D2): la UI la conferma, l'endpoint non
  // tocca il brief.
  return NextResponse.json({ description: result.description }, { status: 200 });
}

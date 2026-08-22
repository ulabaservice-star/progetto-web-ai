import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/data/supabase-ssr';
import { guardMutatingRequest } from '@/app/api/_shared/request-guard';
import { guardOwnedSite, loadRouteBrief } from '@/app/api/_shared/route-guards';
import { onboardingLlmPort } from '@/data/llm-ports';
import { createAiUsagePort } from '@/data/ai-usage';
import { suggestOfferings } from '@/domain/onboarding/suggest-offerings';
import {
  checkAiBudget,
  recordAiUsage,
  DEFAULT_AI_BUDGET_LIMITS,
  type AiUsagePort,
  type AiBudgetDecision,
} from '@/domain/onboarding/ai-budget';

// OGW-402 (macrotask suggest-offerings, onboarding-guided-wizard) — endpoint del pulsante
// ✨ "Suggerisci voci tipiche": same-origin -> identita' -> proprieta' del sito -> body ->
// brief (per vertical e descrizione) -> BUDGET AI (checkAiBudget) -> confine LLM
// (suggestOfferings) -> recordAiUsage (consume-on-success) -> 200 con i suggerimenti proposti.
//
// Sicurezza (OWASP 2025), RIUSANDO le guardie condivise (nessuna copia divergente), come
// l'endpoint gemello generate-description:
//  - A01:2025 (CSRF) + A05:2025 (dimensione): guardMutatingRequest (Sec-Fetch-Site + Origin +
//    tetto byte).
//  - A01:2025 (cross-tenant, P1-D21): getUser + guardOwnedSite (un siteId non proprio riceve la
//    STESSA 404 di uno inesistente). Nessun service_role.
//  - A07/A02:2025 (segreti): la chiave Anthropic resta dietro il confine server-only (T-131),
//    raggiunto solo via il dominio.
//  - OGW-D4 (spesa governata): checkAiBudget PRIMA della chiamata AI (cap -> 429), recordAiUsage
//    SOLO dopo suggerimenti validi (consume-on-success): al cap il modello non e' chiamato, e
//    una lista vuota non consuma budget.
//  - OGW-D2 (anti-invenzione): i suggerimenti sono RESTITUITI come placeholder a prezzo vuoto
//    (la UI li conferma per-voce), mai auto-scritti nel brief: questo endpoint non tocca site_briefs.
//
// INPUT: nessun campo dal client — vertical e descrizione vengono dal BRIEF del sito (nessuna
// nuova superficie non fidata). Il body atteso e' l'oggetto VUOTO; qualsiasi chiave (o un
// non-oggetto) e' rifiutata (strict), cosi' l'endpoint non promette un contratto che non onora.

// Il body e' vuoto per costruzione: solo `{}` passa. Un endpoint senza input dal client, ma il
// guscio JSON resta obbligatorio per distinguere una POST malformata da una lecita.
const SuggestOfferingsRequestSchema = z.object({}).strict();

// Tetto sui BYTE del corpo, PRIMA di leggerlo: `{}` piu' margine. Molto piu' piccolo del corpo
// di generate-description (che porta una frase).
const MAX_BODY_BYTES = 256;

type RouteContext = { params: Promise<{ siteId: string }> };

// Motivo GENERICO: nessun dettaglio interno (anti-enumerazione, P1-D21).
function jsonError(status: number, reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status });
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  // 1) same-origin (CSRF) + tetto sui byte, catena condivisa.
  const guardFailure = guardMutatingRequest(request, { maxBodyBytes: MAX_BODY_BYTES });
  if (guardFailure) return guardFailure;

  // 2) Identita' server-side validata (mai un flag client).
  const user = await getUser();
  if (!user) return jsonError(401, 'unauthorized');

  const { siteId } = await context.params;

  // 3) Proprieta' del sito (P1-D21): non proprio o inesistente -> stesso 404.
  const ownership = await guardOwnedSite(siteId);
  if (ownership) return ownership;

  // 4) Body: deve essere l'oggetto vuoto. Nessun input dal client (vertical/descrizione dal brief).
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, 'invalid-body');
  }
  if (!SuggestOfferingsRequestSchema.safeParse(rawBody).success) return jsonError(400, 'invalid-body');

  // 5) Brief del sito (RLS): da' il vertical (etichetta/settore) e la descrizione con cui
  //    personalizzare i suggerimenti. Brief assente -> brief vuoto (vertical 'altro').
  const briefLoad = await loadRouteBrief(siteId);
  if (!briefLoad.ok) return briefLoad.response;

  // 6) BUDGET AI (OGW-D4), PRIMA della chiamata al modello. Un guasto del contatore e' un 500
  //    onesto, non un 429 ne' una chiamata AI non governata.
  const now = new Date();
  let usagePort: AiUsagePort;
  let decision: AiBudgetDecision;
  try {
    usagePort = await createAiUsagePort();
    decision = await checkAiBudget(usagePort, siteId, now, DEFAULT_AI_BUDGET_LIMITS);
  } catch (error) {
    console.error('[onboarding/suggest-offerings] controllo budget fallito:', error);
    return jsonError(500, 'unavailable');
  }
  if (!decision.allow) return jsonError(429, decision.reason);

  // 7) Il confine LLM (OGW-401 -> T-131). AWAIT prima di rispondere: un guasto resta un 502
  //    ONESTO che LOGGA la causa reale (no 502 opaco).
  let suggestions: Awaited<ReturnType<typeof suggestOfferings>>;
  try {
    suggestions = await suggestOfferings(onboardingLlmPort, {
      vertical: briefLoad.brief.vertical,
      description: briefLoad.brief.description,
    });
  } catch (error) {
    console.error('[onboarding/suggest-offerings] suggestOfferings ha lanciato:', error);
    return jsonError(502, 'suggestion-failed');
  }
  // Nessuna voce valida: NON e' un successo -> nessun suggerimento proposto e nessun consumo di
  // budget (consume-on-success stretto, simmetrico all'output vuoto di generate-description).
  if (suggestions.length === 0) {
    console.error('[onboarding/suggest-offerings] nessun suggerimento valido');
    return jsonError(502, 'suggestion-failed');
  }

  // 8) CONSUME-ON-SUCCESS: registra l'uso SOLO ora che dei suggerimenti validi esistono. Un
  //    guasto di scrittura del contatore non annulla i suggerimenti (l'AI e' gia' stata spesa):
  //    si LOGGA e si risponde 200. LIMITE DICHIARATO: under-counting su guasto DB, non un canale
  //    d'abuso (l'utente non controlla il guasto della scrittura).
  try {
    await recordAiUsage(usagePort, siteId, 'suggest_offerings', now);
  } catch (error) {
    console.error('[onboarding/suggest-offerings] recordAiUsage ha lanciato:', error);
  }

  // I suggerimenti sono PROPOSTE editabili a prezzo vuoto (OGW-D2): la UI li conferma per-voce,
  // l'endpoint non tocca il brief.
  return NextResponse.json({ offerings: suggestions }, { status: 200 });
}

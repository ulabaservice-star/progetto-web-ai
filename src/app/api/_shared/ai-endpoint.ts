import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { getUser } from '@/data/supabase-ssr';
import { getAccountEntitlementForUser } from '@/data/subscriptions';
import { guardMutatingRequest } from '@/app/api/_shared/request-guard';
import { guardOwnedSite, loadRouteBrief } from '@/app/api/_shared/route-guards';
import { createAiUsagePort } from '@/data/ai-usage';
import {
  checkAiBudget,
  recordAiUsage,
  DEFAULT_AI_BUDGET_LIMITS,
  type AiUsageKind,
  type AiUsagePort,
  type AiBudgetDecision,
} from '@/domain/onboarding/ai-budget';
import type { Brief } from '@/domain/onboarding/brief';

// macrotask onboarding-ai-dedup — LA PIPELINE CONDIVISA dei due endpoint AI on-demand
// dell'onboarding (generate-description OGW-302 e suggest-offerings OGW-402). Entrambi eseguono
// la STESSA disciplina IDENTICA prima del lavoro proprio: same-origin -> identita' -> proprieta'
// del sito -> body -> brief -> BUDGET AI (checkAiBudget PRIMA) -> confine LLM -> recordAiUsage
// (consume-on-success). Le due rotte la scrivevano verbatim (misurato come duplicazione dal
// controllo d'igiene del checkpoint) -> estratta qui, ACCANTO a route-guards/request-guard, con
// cui condivide lo stesso principio: cio' che le rotte che MUTANO STATO devono fare identico.
//
// Sicurezza (OWASP 2025), invariata rispetto alle copie che sostituisce:
//  - A01:2025 (CSRF) + A05:2025 (dimensione): guardMutatingRequest (Sec-Fetch-Site + Origin + byte).
//  - A01:2025 (cross-tenant, P1-D21): getUser + guardOwnedSite (sito non proprio -> stessa 404 di
//    uno inesistente). Nessun service_role.
//  - A07/A02:2025 (segreti): la chiave Anthropic resta dietro il confine server-only (T-131),
//    raggiunto solo via il dominio iniettato in `run`.
//  - OGW-D4 (spesa governata): checkAiBudget PRIMA (cap/rate -> 429, modello mai chiamato),
//    recordAiUsage SOLO su esito valido (consume-on-success): un output fuori forma non consuma.
//  - OGW-D2 (anti-invenzione): l'esito e' RESTITUITO come proposta editabile (la UI conferma), mai
//    auto-scritto nel brief: l'endpoint non tocca site_briefs.
//
// L'istante `now` e' prelevato UNA volta e passato sia a checkAiBudget sia a recordAiUsage: il
// rate-limit resta coerente fra il controllo e la registrazione.

// Contesto di rotta App Router (il siteId dinamico del segmento). Locale: la factory lo cattura
// internamente, le rotte non lo nominano piu' (structural typing, nessun export speculativo).
type AiRouteContext = { params: Promise<{ siteId: string }> };

/** Motivo GENERICO del rifiuto: nessun dettaglio interno (anti-enumerazione, P1-D21). */
function jsonError(status: number, reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status });
}

/**
 * La configurazione specifica di UN endpoint AI. Tutto cio' che varia fra i due gemelli:
 * il tetto/schema del body, il tag di log, il `kind` d'uso e il motivo di fallimento, e la
 * funzione `run` che chiama il dominio e VALIDA l'esito.
 *
 * @typeParam S schema zod del body; `z.infer<S>` tipizza `body` in `run`.
 */
type AiEndpointConfig<S extends z.ZodTypeAny> = {
  /** Tetto sui BYTE del corpo, applicato PRIMA di leggerlo (i route handler non hanno bodySizeLimit). */
  maxBodyBytes: number;
  /** Schema del body (input NON FIDATO); `.strict()` a carico del chiamante. */
  bodySchema: S;
  /** Prefisso dei log dell'endpoint (es. 'onboarding/suggest-offerings'). */
  logTag: string;
  /** Categoria d'uso registrata a consumo riuscito. */
  kind: AiUsageKind;
  /** Motivo generico del 502 quando il confine AI lancia o l'esito e' fuori forma. */
  failReason: string;
  /**
   * Il lavoro proprio dell'endpoint: dal brief (fidato) e dal body (validato) chiama il dominio
   * e RI-VALIDA l'esito. Ritorna il payload JSON di risposta, oppure `null` se l'esito e' fuori
   * forma (-> 502, nessun consumo di budget). Un lancio -> 502 loggato (no 502 opaco).
   */
  run: (input: { brief: Brief; body: z.infer<S> }) => Promise<Record<string, unknown> | null>;
};

/** Il tipo del route handler App Router che la factory produce. */
type AiRouteHandler = (request: NextRequest, context: AiRouteContext) => Promise<Response>;

/**
 * Fabbrica il route handler `POST` di un endpoint AI on-demand: cattura la config specifica e
 * ritorna l'handler che esegue la pipeline condivisa. La rotta esporta direttamente il risultato
 * (`export const POST = aiEndpoint({...})`) — nessun preludio di delega ripetuto fra le rotte.
 * Il verdetto di ogni passo e' una risposta HTTP, mai un'eccezione risalente al chiamante.
 */
export function aiEndpoint<S extends z.ZodTypeAny>(config: AiEndpointConfig<S>): AiRouteHandler {
  return async (request, context) => {
    // 1) same-origin (CSRF) + tetto sui byte, catena condivisa (T-230).
    const guardFailure = guardMutatingRequest(request, { maxBodyBytes: config.maxBodyBytes });
    if (guardFailure) return guardFailure;

    // 2) Identita' server-side validata (mai un flag client).
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
    const parsed = config.bodySchema.safeParse(rawBody);
    if (!parsed.success) return jsonError(400, 'invalid-body');

    // 5) Brief del sito (RLS): dati fidati per il lavoro proprio. Brief assente -> brief vuoto.
    const briefLoad = await loadRouteBrief(siteId);
    if (!briefLoad.ok) return briefLoad.response;

    // 6) BUDGET AI (OGW-D4), PRIMA della chiamata al modello. Un guasto del contatore (DB) e' un
    //    500 onesto, non un 429 ne' una chiamata AI non governata.
    const now = new Date();
    let usagePort: AiUsagePort;
    let decision: AiBudgetDecision;
    try {
      usagePort = await createAiUsagePort();
      // BIL-304 (plan-gates) — la SOGLIA del cap deriva dal PIANO dell'account (ai_monthly_cap), non
      // da una costante: Pro ottiene un cap ampio, Free il base. Il rate-limit (finestra) NON dipende
      // dal piano, resta il default. Entitlement dell'account dell'utente (proprietario gia' verificato
      // al punto 3), sotto RLS, fail-safe => free (in dubbio il cap piu' stretto, mai piu' ampio).
      const entitlement = await getAccountEntitlementForUser(user.id);
      const budgetLimits = {
        ...DEFAULT_AI_BUDGET_LIMITS,
        maxTotal: entitlement.limits.ai_monthly_cap,
      };
      decision = await checkAiBudget(usagePort, siteId, now, budgetLimits);
    } catch (error) {
      console.error(`[${config.logTag}] controllo budget fallito:`, error);
      return jsonError(500, 'unavailable');
    }
    // Cap o rate-limit: 429 e il modello non viene chiamato, il contatore non incrementa.
    if (!decision.allow) return jsonError(429, decision.reason);

    // 7) Il confine LLM (T-131). AWAIT prima di rispondere: un guasto resta un 502 ONESTO che
    //    LOGGA la causa reale (no 502 opaco); un esito fuori forma (null) e' 502 senza consumo.
    let payload: Record<string, unknown> | null;
    try {
      payload = await config.run({ brief: briefLoad.brief, body: parsed.data });
    } catch (error) {
      console.error(`[${config.logTag}] confine AI ha lanciato:`, error);
      return jsonError(502, config.failReason);
    }
    if (payload === null) {
      console.error(`[${config.logTag}] esito AI fuori forma`);
      return jsonError(502, config.failReason);
    }

    // 8) CONSUME-ON-SUCCESS: registra l'uso SOLO ora che un esito valido esiste. Un guasto di
    //    scrittura del contatore non annulla l'esito (l'AI e' gia' stata spesa): si LOGGA e si
    //    risponde 200. LIMITE DICHIARATO: under-counting su guasto DB, non un canale d'abuso.
    try {
      await recordAiUsage(usagePort, siteId, config.kind, now);
    } catch (error) {
      console.error(`[${config.logTag}] recordAiUsage ha lanciato:`, error);
    }

    return NextResponse.json(payload, { status: 200 });
  };
}

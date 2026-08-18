// OGW-102 (macrotask ai-usage-guard, onboarding-guided-wizard) — la DECISIONE di spesa AI
// dell'onboarding, dominio PURO. Governa i tre pulsanti AI on-demand (import /
// genera-descrizione / suggerisci-offerte): NEGA oltre un TETTO totale (cap -> 429) e oltre
// una FREQUENZA (rate-limit a finestra), e REGISTRA l'uso solo su chiamata riuscita
// (consume-on-success). Il contatore persistito e' public.onboarding_ai_usage (OGW-101).
//
// DETERMINISMO (OGW-D4, no orologio nel dominio): il tempo corrente `now`/`at` e i tetti
// `limits` sono INGRESSI, mai letti da Date.now/Math.random qui. Il call-site (l'endpoint)
// preleva l'istante UNA volta e lo passa sia a checkAiBudget sia a recordAiUsage: cosi' il
// rate-limit e' riproducibile in test senza aspettare tempo reale.
//
// DEPENDENCY INVERSION (come OnboardingLlmPort in llm-port.ts): il dominio non importa il
// confine server-only del data-layer; riceve una PORTA `AiUsagePort` come argomento. Il
// provider reale (client Supabase con sessione, RLS attiva) la implementa lato src/data (il
// primo endpoint che ne ha bisogno); i test la sostituiscono con un doppio in-memory.
//
// CONSUME-ON-SUCCESS: check e record sono DUE funzioni separate, di proposito. checkAiBudget
// NON ha effetti collaterali (non registra nulla: al cap non deve "consumare" un uso che non
// c'e' stato); recordAiUsage e' l'INSERT append-only, chiamato dall'endpoint solo DOPO che la
// chiamata AI e' andata a buon fine. Nessuna funzione combinata che consumi prima del successo.

/** Quale dei tre pulsanti AI on-demand ha generato l'uso (metadato del contatore). */
export type AiUsageKind = 'import' | 'generate_description' | 'suggest_offerings';

/** I tetti di spesa, INIETTATI (mai costanti nel dominio): un cap totale + una finestra. */
export type AiBudgetLimits = {
  /** Numero massimo di usi AI TOTALI per sito prima del 429. */
  readonly maxTotal: number;
  /** Ampiezza della finestra di rate-limit, in millisecondi. */
  readonly windowMs: number;
  /** Numero massimo di usi AI dentro la finestra prima del rate-limit. */
  readonly maxInWindow: number;
};

/** L'esito del controllo: consentito, oppure negato con il MOTIVO (cap o frequenza). */
export type AiBudgetDecision =
  | { readonly allow: true }
  | { readonly allow: false; readonly reason: 'cap' | 'rate' };

/**
 * Porta di lettura/scrittura del contatore d'uso AI (OGW-101). Astrae l'accesso al DB: il
 * dominio conta e registra senza sapere COME sono persistiti gli usi. Le letture sono
 * separate (totale vs finestra) perche' governano due tetti distinti; la scrittura e' un
 * INSERT append-only (mai un update: il contatore non si azzera ne' si falsifica).
 */
export type AiUsagePort = {
  /** Usi AI TOTALI registrati per il sito (per il cap). */
  countTotal(siteId: string): Promise<number>;
  /** Usi AI del sito con used_at >= `since` (per il rate-limit sulla finestra). */
  countSince(siteId: string, since: Date): Promise<number>;
  /** Registra un uso: UNA riga append-only con l'istante `at` iniettato. */
  record(siteId: string, kind: AiUsageKind, at: Date): Promise<void>;
};

/**
 * Decide se un uso AI e' consentito per il sito, SENZA registrarlo (nessun effetto
 * collaterale: il consumo e' separato e avviene solo su successo). Deterministico: l'esito
 * dipende solo dallo stato del contatore + `now` e `limits` INIETTATI.
 *
 * Ordine: prima il CAP totale (piu' duro), poi la FREQUENZA nella finestra; il countSince
 * non viene nemmeno interrogato se il cap ha gia' negato.
 */
export async function checkAiBudget(
  port: AiUsagePort,
  siteId: string,
  now: Date,
  limits: AiBudgetLimits,
): Promise<AiBudgetDecision> {
  const total = await port.countTotal(siteId);
  if (total >= limits.maxTotal) {
    return { allow: false, reason: 'cap' };
  }
  const since = new Date(now.getTime() - limits.windowMs);
  const inWindow = await port.countSince(siteId, since);
  if (inWindow >= limits.maxInWindow) {
    return { allow: false, reason: 'rate' };
  }
  return { allow: true };
}

/**
 * Registra un uso AI riuscito: incrementa di UNO il contatore del sito (una riga
 * append-only). Da chiamare SOLO dopo che la chiamata AI e' andata a buon fine
 * (consume-on-success), mai prima del check. `at` iniettato (nessun orologio nel dominio).
 */
export async function recordAiUsage(
  port: AiUsagePort,
  siteId: string,
  kind: AiUsageKind,
  at: Date,
): Promise<void> {
  await port.record(siteId, kind, at);
}

/**
 * Tetti di default per l'onboarding: un cap generoso ma FINITO (un onboarding curato usa
 * 3-6 usi; molto oltre e' abuso) e una finestra anti-raffica. Parametrici: gli endpoint AI
 * (OGW-3xx/4xx) possono sovrascriverli. Vivono qui accanto alla decisione perche' sono la
 * sua taratura di default, non un valore di dominio immutabile.
 */
export const DEFAULT_AI_BUDGET_LIMITS: AiBudgetLimits = {
  maxTotal: 30,
  windowMs: 60_000,
  maxInWindow: 6,
};

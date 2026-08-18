import type Anthropic from '@anthropic-ai/sdk';
import type { OnboardingLlmPort } from '@/domain/onboarding/llm-port';
import { BRIEF_LIMITS, type Brief } from '@/domain/onboarding/brief';

// OGW-301 (macrotask generate-description, onboarding-guided-wizard) — la prima delle due
// funzioni AI NUOVE dell'onboarding on-demand: espande la frase libera dell'utente in una
// DESCRIZIONE (copy), dietro il budget di ai-usage-guard (l'endpoint OGW-302 applica il
// gating). Dominio PURO rispetto all'I/O: la porta LLM e' INIETTATA (dependency inversion,
// come runInterviewTurn in interview.ts e checkAiBudget in ai-budget.ts) — qui non si
// importa il confine server-only @/data/anthropic; il layer che chiama costruisce e passa
// la porta reale (onboardingLlmPort). Riusa OnboardingLlmPort con `tools: []`: nessun
// secondo confine col modello da sorvegliare (P1-D7), l'espansione e' testo, non tool-call.
//
// ANTI-INVENZIONE (P2-D7 / OGW-D2): il system prompt vincola il modello a ESPANDERE le
// parole date, NON ad aggiungere fatti che l'utente non ha scritto. E' oracolata come PROXY
// (il prompt CONTIENE la clausola — AC-301-3), non come prova che il modello non inventi: la
// difesa REALE e' strutturale (l'output e' un suggerimento EDITABILE che l'utente conferma,
// mai auto-scritto nel brief). Dichiarato (L-COL-006).
//
// SICUREZZA (A05:2025, come briefStateSection in interview.ts): la `phrase` e' input NON
// FIDATO e va nel ruolo `user`, MAI nel system prompt. Il `vertical` e' un enum chiuso
// (allowlist di T-121): non trasporta testo iniettato, quindi puo' contestualizzare il
// system. Superficie di prompt-injection minima: nessun contenuto esterno (l'import da URL
// e' un altro pulsante). L'output e' ri-validato per FORMA prima di essere proposto.

/** L'ingresso: il tipo di attivita' (enum chiuso) e la frase libera da espandere. */
export type GenerateDescriptionInput = {
  readonly vertical: Brief['vertical'];
  readonly phrase: string;
};

/**
 * L'esito. Il fallimento e' NOMINATO e la descrizione fuori-forma non e' mai restituita come
 * valida (AC-301-2): `empty` = il modello non ha prodotto testo utile; `too_long` = ha
 * sforato il tetto del campo description. Motivi distinti perche' dicono cose diverse a chi
 * chiama (un tetto da rivedere vs una risposta vuota), come i motivi di runGenerationTurn.
 */
export type GenerateDescriptionResult =
  | { readonly ok: true; readonly description: string }
  | { readonly ok: false; readonly reason: 'empty' | 'too_long' };

// Il system prompt, in italiano (meta-istruzione al modello, non l'output: la LINGUA della
// copy la decide la frase dell'utente, vedi l'ultima riga). La clausola anti-invenzione e'
// esplicita e AC-301-3 la pinna per sottostringa. "Solo la descrizione" evita preamboli che
// finirebbero nel campo. Il tetto e' dichiarato in prosa (come CAPS_HINT in interview.ts):
// il numero viene da BRIEF_LIMITS, non riscritto a mano.
const SYSTEM_PROMPT = [
  "Sei l'assistente di onboarding di Belora: aiuti un micro-business locale a scrivere la descrizione del suo sito.",
  "A partire dalle parole che l'utente ti da, scrivi UNA descrizione breve e concreta della sua attivita'.",
  'ESPANDI le parole dell utente: NON aggiungere fatti, servizi, premi o dettagli che l utente non ha scritto. Non inventare nulla.',
  `Resta entro ${BRIEF_LIMITS.description} caratteri. Rispondi con la SOLA descrizione, senza preamboli ne' virgolette.`,
  'Scrivi nella stessa lingua della frase dell utente.',
].join('\n');

/**
 * Espande la frase dell'utente in una descrizione validata, oppure il motivo per cui non ne
 * produce una valida. Il `vertical` contestualizza il system (enum chiuso); la `phrase` va
 * nel ruolo user (input non fidato). L'output e' concatenato dai blocchi `text` della
 * risposta (come runInterviewTurn), trimmato e RI-VALIDATO per forma: vuoto o oltre il tetto
 * del campo description e' scartato, mai troncato (troncare sceglierebbe in silenzio cosa
 * perdere, come lo scarto di applyBriefUpdate).
 *
 * @param llm porta LLM iniettata (il dominio non importa il confine server-only).
 * @param input il vertical (enum) e la frase libera dell'utente.
 */
export async function generateDescription(
  llm: OnboardingLlmPort,
  input: GenerateDescriptionInput,
): Promise<GenerateDescriptionResult> {
  const reply = await llm({
    system: `${SYSTEM_PROMPT}\nTipo di attivita': ${input.vertical}.`,
    messages: [{ role: 'user', content: input.phrase }],
    tools: [],
  });

  const text = reply.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (text.length === 0) return { ok: false, reason: 'empty' };
  if (text.length > BRIEF_LIMITS.description) return { ok: false, reason: 'too_long' };
  return { ok: true, description: text };
}

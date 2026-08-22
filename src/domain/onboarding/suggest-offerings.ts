import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { OnboardingLlmPort } from '@/domain/onboarding/llm-port';
import { BRIEF_LIMITS, type Brief } from '@/domain/onboarding/brief';

// OGW-401 (macrotask suggest-offerings, onboarding-guided-wizard) — la seconda funzione AI
// NUOVA dell'onboarding on-demand, e l'unico punto in cui l'AI propone contenuto
// PLAUSIBILE-ma-non-reale: dato un vertical (+ una descrizione opzionale) propone voci
// d'offerta TIPICHE del settore (pizzeria -> "Margherita"/"Marinara") come PLACEHOLDER da
// personalizzare. Dominio PURO: la porta LLM e' INIETTATA (dependency inversion, come
// generateDescription in generate-description.ts); il layer che chiama passa la porta reale.
//
// ANTI-INVENZIONE STRUTTURALE (OGW-D2 / P2-D7): la difesa NON e' fidarsi del prompt, e'
// STRUTTURALE — le voci tornano a PREZZO VUOTO (il tipo di ritorno non porta prezzo) e ciascuna
// entra nel brief solo su CONFERMA per-voce a valle (la UI di OGW-402). Il system chiede esempi
// tipici del settore, non dati reali dell'attivita': e' oracolato come PROXY (L-COL-006), la
// difesa vera e' il prezzo vuoto + la conferma.
//
// TRASPORTO = TOOL-USE (a differenza di generateDescription, che e' testo con tools:[]):
// l'output qui e' una LISTA strutturata, quindi il modello la restituisce via lo strumento
// `propose_offerings` e il dominio VALIDA il suo input. La porta condivisa OnboardingLlmPort
// non cambia (accetta gia' `tools`); nessun tool_choice forzato (la porta non lo espone) — il
// system istruisce l'uso dello strumento, e una risposta senza tool_use degrada a lista vuota.
//
// SICUREZZA (A05:2025, come generateDescription): la `description` e' input NON FIDATO e va nel
// ruolo `user`, MAI nel system. Il `vertical` e' un enum chiuso (allowlist di T-121): non
// trasporta testo iniettato, quindi contestualizza il system. L'input dello strumento e'
// RI-VALIDATO per FORMA prima di essere proposto (voci fuori-forma scartate, prezzo ignorato).

/** L'ingresso: il tipo di attivita' (enum chiuso) e una descrizione libera opzionale. */
export type SuggestOfferingsInput = {
  readonly vertical: Brief['vertical'];
  readonly description?: string;
};

/**
 * Una voce suggerita: solo `name` (obbligatorio) e `section` (opzionale). NIENTE `price` (ne'
 * `description`/`photo_ref`): il placeholder a prezzo vuoto e' STRUTTURALE (AC-401-3), non una
 * scelta del prompt. E' un sottoinsieme valido di OfferingSchema (brief.ts) -> le voci
 * confermate entrano pulite nel brief senza essere scartate a valle.
 */
export type SuggestedOffering = {
  readonly name: string;
  readonly section?: string;
};

// Cap prudente sul numero di suggerimenti: un onboarding curato ne usa pochi; muri di voci
// sarebbero rumore. Non e' un acceptance_criteria (dichiarato, L-COL-006): igiene di prodotto.
const SUGGESTIONS_LIMIT = 12;

// Lo strumento dichiarato al confine. L'input_schema NON include `price`: al modello si chiede
// solo nome (+ sezione), cosi' il prezzo vuoto parte gia' dalla richiesta. La validazione sotto
// e' comunque difensiva (un price proposto ugualmente viene ignorato).
const PROPOSE_OFFERINGS_TOOL: Anthropic.Tool = {
  name: 'propose_offerings',
  description:
    "Proponi alcune voci di offerta TIPICHE del settore, come esempi generici da personalizzare. Nessun prezzo, nessun dato reale dell'attivita'.",
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Le voci proposte (esempi tipici del settore).',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome della voce (es. un piatto, un servizio, un corso).' },
            section: { type: 'string', description: 'Gruppo/sezione opzionale (es. "Pizze", "Antipasti").' },
          },
          required: ['name'],
        },
      },
    },
    required: ['items'],
  },
};

const SYSTEM_PROMPT = [
  "Sei l'assistente di onboarding di Belora: aiuti un micro-business locale a compilare l'elenco delle sue offerte.",
  'Proponi alcune voci TIPICHE del settore, come ESEMPI generici che l utente potra personalizzare o cancellare.',
  'NON inventare dati reali dell attivita (nomi propri, prezzi, indirizzi, numeri): sono solo esempi del settore.',
  'NON indicare prezzi: il prezzo lo mettera l utente.',
  'Usa lo strumento propose_offerings per elencare le voci. Scrivi i nomi nella stessa lingua della descrizione, se presente.',
].join('\n');

// L'involucro dell'input dello strumento: `items` deve essere un array; ogni elemento e'
// validato a parte (unknown), cosi' una voce fuori-forma non fa cadere l'intero elenco.
const ItemsEnvelopeSchema = z.object({ items: z.array(z.unknown()) });

// Una voce valida: `name` obbligatorio entro il tetto (trim, min 1); `section` opzionale entro
// il tetto. `.strip()` (default zod) IGNORA le chiavi non dichiarate — un `price` proposto dal
// modello viene rimosso senza scartare la voce (AC-401-3). I tetti vengono da BRIEF_LIMITS
// (unica sede), cosi' la voce e' un sottoinsieme valido di OfferingSchema.
const RawItemSchema = z.object({
  name: z.string().trim().min(1).max(BRIEF_LIMITS.offering_name),
  section: z.string().trim().max(BRIEF_LIMITS.offering_section).optional(),
});

/**
 * Propone voci d'offerta d'esempio per il vertical, validate per forma e a prezzo vuoto. Il
 * `vertical` contestualizza il system (enum chiuso); la `description` va nel ruolo user (input
 * non fidato). L'elenco arriva via lo strumento `propose_offerings`: ogni voce e' validata a
 * parte (le fuori-forma scartate, il prezzo ignorato), poi limitata a SUGGESTIONS_LIMIT. Una
 * risposta senza tool_use (o con items vuoto) e' una lista vuota, mai un errore.
 *
 * @param llm porta LLM iniettata (il dominio non importa il confine server-only).
 * @param input il vertical (enum) e la descrizione libera opzionale.
 */
export async function suggestOfferings(
  llm: OnboardingLlmPort,
  input: SuggestOfferingsInput,
): Promise<SuggestedOffering[]> {
  const userContent = input.description?.trim()
    ? `Tipo di attivita': ${input.vertical}. Descrizione dell'attivita': ${input.description.trim()}`
    : `Tipo di attivita': ${input.vertical}.`;

  const reply = await llm({
    system: `${SYSTEM_PROMPT}\nTipo di attivita': ${input.vertical}.`,
    messages: [{ role: 'user', content: userContent }],
    tools: [PROPOSE_OFFERINGS_TOOL],
  });

  const toolUse = reply.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === 'tool_use' && block.name === PROPOSE_OFFERINGS_TOOL.name,
  );
  if (!toolUse) return [];

  const envelope = ItemsEnvelopeSchema.safeParse(toolUse.input);
  if (!envelope.success) return [];

  const out: SuggestedOffering[] = [];
  for (const raw of envelope.data.items) {
    const parsed = RawItemSchema.safeParse(raw);
    if (!parsed.success) continue; // voce fuori-forma scartata (AC-401-2)
    // section omessa se vuota dopo il trim (mai una sezione '' nel brief).
    const section = parsed.data.section && parsed.data.section.length > 0 ? parsed.data.section : undefined;
    out.push(section ? { name: parsed.data.name, section } : { name: parsed.data.name });
    if (out.length >= SUGGESTIONS_LIMIT) break;
  }
  return out;
}

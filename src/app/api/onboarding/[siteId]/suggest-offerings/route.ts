import { z } from 'zod';
import { onboardingLlmPort } from '@/data/llm-ports';
import { suggestOfferings } from '@/domain/onboarding/suggest-offerings';
import { aiEndpoint } from '@/app/api/_shared/ai-endpoint';

// OGW-402 (macrotask suggest-offerings) — endpoint del pulsante ✨ "Suggerisci voci tipiche".
// La disciplina di rotta (same-origin -> identita' -> proprieta' -> body -> brief -> budget ->
// confine LLM -> consume-on-success) e' la STESSA del gemello generate-description: vive in
// `_shared/ai-endpoint` (runAiEndpoint). Qui resta SOLO cio' che e' proprio di questo endpoint.
//
// INPUT: nessun campo dal client — vertical e descrizione vengono dal BRIEF del sito (nessuna
// nuova superficie non fidata). Il body atteso e' l'oggetto VUOTO; qualsiasi chiave (o un
// non-oggetto) e' rifiutata (strict), cosi' l'endpoint non promette un contratto che non onora.

// Il body e' vuoto per costruzione: solo `{}` passa. Il guscio JSON resta obbligatorio per
// distinguere una POST malformata da una lecita.
const SuggestOfferingsRequestSchema = z.object({}).strict();

// Tetto sui BYTE del corpo: `{}` piu' margine. Molto piu' piccolo del corpo di generate-description.
const MAX_BODY_BYTES = 256;

export const POST = aiEndpoint({
  maxBodyBytes: MAX_BODY_BYTES,
  bodySchema: SuggestOfferingsRequestSchema,
  logTag: 'onboarding/suggest-offerings',
  kind: 'suggest_offerings',
  failReason: 'suggestion-failed',
  // vertical + descrizione vengono dal brief (il body e' vuoto). Nessuna voce valida -> null
  // -> 502 senza consumo (simmetrico all'output vuoto di generate-description). I suggerimenti
  // tornano come placeholder a prezzo vuoto: la UI li conferma per-voce (OGW-D2).
  run: async ({ brief }) => {
    const suggestions = await suggestOfferings(onboardingLlmPort, {
      vertical: brief.vertical,
      description: brief.description,
    });
    return suggestions.length === 0 ? null : { offerings: suggestions };
  },
});

import { z } from 'zod';
import { onboardingLlmPort } from '@/data/llm-ports';
import { generateDescription } from '@/domain/onboarding/generate-description';
import { aiEndpoint } from '@/app/api/_shared/ai-endpoint';

// OGW-302 (macrotask generate-description) — endpoint del pulsante ✨ "Genera descrizione".
// La disciplina di rotta (same-origin -> identita' -> proprieta' -> body -> brief -> budget ->
// confine LLM -> consume-on-success) e' la STESSA del gemello suggest-offerings: vive in
// `_shared/ai-endpoint` (runAiEndpoint). Qui resta SOLO cio' che e' proprio di questo endpoint:
// il contratto del body (una frase da espandere) e la chiamata al dominio generateDescription.

// Cap sulla frase in ingresso: una FRASE, non un documento. 2000 code unit sono abbondanti per
// due righe di spunto e sotto il tetto del campo description che espande. Lo `.max()` PRIMA del
// `.trim()` misura la stringa GREZZA (coerente con i cap di P1-D22), `.min(1)` DOPO il trim
// (una frase di soli spazi non ha nulla da espandere). `.strict()`: nessuna chiave extra.
const MAX_PHRASE_CHARS = 2000;
const PhraseSchema = z.string().max(MAX_PHRASE_CHARS).trim().min(1);
const GenerateDescriptionRequestSchema = z.object({ phrase: PhraseSchema }).strict();

// Tetto sui BYTE del body: 6 byte per code unit (caso peggiore UTF-8/\\uXXXX) + involucro JSON
// `{"phrase":""}`. Un solo campo di testo -> molto piu' piccolo del corpo di /turn.
const MAX_BODY_BYTES = MAX_PHRASE_CHARS * 6 + 256;

export const POST = aiEndpoint({
  maxBodyBytes: MAX_BODY_BYTES,
  bodySchema: GenerateDescriptionRequestSchema,
  logTag: 'onboarding/generate-description',
  kind: 'generate_description',
  failReason: 'generation-failed',
  // Il vertical (dal brief) contestualizza; la phrase (dal body validato) e' l'input da
  // espandere. L'output ri-validato (result.ok) diventa la proposta editabile; fuori forma
  // -> null -> 502 senza consumo (OGW-D2 anti-invenzione, consume-on-success stretto).
  run: async ({ brief, body }) => {
    const result = await generateDescription(onboardingLlmPort, {
      vertical: brief.vertical,
      phrase: body.phrase,
    });
    return result.ok ? { description: result.description } : null;
  },
});

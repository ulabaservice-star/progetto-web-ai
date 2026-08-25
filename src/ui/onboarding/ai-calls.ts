'use client';

// OGW-502 (macrotask wizard-shell) — il CONFINE CLIENT verso i due endpoint AI on-demand
// dell'onboarding. I componenti (GenerateDescriptionField, OfferingSuggestions) ricevono la
// chiamata INIETTATA e non conoscono la rotta (restano provabili senza rete): qui vive l'unico
// punto che sa gli URL, fa il `fetch` e traduce lo STATUS HTTP nell'esito che il wizard usa.
//
// Perche' un `fetch` e non una Server Action (come importBriefFromUrl): i due endpoint AI sono
// route handler (governano il budget AI con checkAiBudget/recordAiUsage e rispondono 429 al cap),
// e il 429 e' un'informazione che la UI deve rendere (disabilita il pulsante, `atCap`). Un fetch
// same-origin POST porta con se' Sec-Fetch-Site: same-origin, che guardMutatingRequest esige.
//
// L'esito distingue TRE casi che il wizard tratta diversamente:
//  - ok:true  -> il payload valido (descrizione / voci suggerite), da proporre editabile;
//  - ok:false, atCap:true  -> budget esaurito (429): il wizard alza `atCap` e disabilita il ✨;
//  - ok:false, atCap:false -> ogni altro errore (rete, 400/401/404/500/502, forma inattesa):
//    il wizard mostra il messaggio d'errore del componente, senza toccare `atCap`.
//
// Sicurezza: la risposta e' comunque validata nella FORMA prima dell'uso (typeof/Array.isArray);
// il siteId e' codificato nel path (encodeURIComponent). Nessun testo della risposta entra mai in
// un href o in innerHTML: i componenti lo mettono solo in `value`/nodi di testo (T-151).

export type AiCallResult<T> = { ok: true; value: T } | { ok: false; atCap: boolean };

// La voce suggerita: solo nome (+ sezione), mai un prezzo (placeholder a prezzo vuoto, OGW-D2).
export type SuggestedOffering = { name: string; section?: string };

// 429 = budget esaurito (cap o rate-limit): il solo status che alza `atCap`.
const AT_CAP_STATUS = 429;

// L'adattatore che i due step AI condividono: dall'esito della chiamata (con `atCap`) all'esito
// che i componenti si aspettano (senza `atCap`), sollevando `atCap` nel guscio come side-effect.
// Estratto perche' StepStory e StepOfferings lo ripetevano identico (clone d'igiene): qui il 429
// alza il flag una volta sola; lo step aggiunge solo la propria chiave di payload al ramo `ok`.
export function withAtCap<T>(
  result: AiCallResult<T>,
  onAtCap: () => void,
): { ok: true; value: T } | { ok: false } {
  if (result.ok) return { ok: true, value: result.value };
  if (result.atCap) onAtCap();
  return { ok: false };
}

// La pipeline CONDIVISA dei due endpoint AI: POST same-origin -> mappa lo STATUS nell'esito ->
// estrae/valida il payload. Estratta perche' i due gemelli la ripetevano verbatim (il controllo
// d'igiene del checkpoint la misurava come clone): 429 -> atCap, non-2xx/rete/forma inattesa ->
// errore, 2xx con payload valido -> ok. `extract` e' l'unico pezzo proprio di ogni endpoint (dal
// payload al valore tipizzato, oppure null se fuori forma).
async function postAi<T>(
  url: string,
  body: unknown,
  extract: (payload: unknown) => T | null,
): Promise<AiCallResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, atCap: false };
  }
  if (response.status === AT_CAP_STATUS) return { ok: false, atCap: true };
  if (!response.ok) return { ok: false, atCap: false };
  try {
    const value = extract(await response.json());
    return value === null ? { ok: false, atCap: false } : { ok: true, value };
  } catch {
    return { ok: false, atCap: false };
  }
}

/**
 * Chiede all'endpoint di espandere una frase in una descrizione.
 * @param siteId sito corrente (codificato nel path).
 * @param phrase la frase da espandere (input dell'utente).
 */
export async function requestDescription(
  siteId: string,
  phrase: string,
): Promise<AiCallResult<string>> {
  return postAi(
    `/api/onboarding/${encodeURIComponent(siteId)}/generate-description`,
    { phrase },
    (payload) => {
      const description = (payload as { description?: unknown }).description;
      return typeof description === 'string' ? description : null;
    },
  );
}

/**
 * Chiede all'endpoint le voci d'offerta tipiche del settore (vertical/descrizione dal brief).
 * @param siteId sito corrente (codificato nel path). Il body e' vuoto per contratto (strict).
 */
export async function requestOfferingSuggestions(
  siteId: string,
): Promise<AiCallResult<SuggestedOffering[]>> {
  return postAi(
    `/api/onboarding/${encodeURIComponent(siteId)}/suggest-offerings`,
    {},
    (payload) => {
      const raw = (payload as { offerings?: unknown }).offerings;
      if (!Array.isArray(raw)) return null;
      // Ogni voce validata nella forma: name stringa (+ section opzionale). Le altre si scartano.
      return raw
        .filter((item): item is { name: string; section?: unknown } =>
          typeof (item as { name?: unknown })?.name === 'string',
        )
        .map((item) => ({
          name: item.name,
          ...(typeof item.section === 'string' ? { section: item.section } : {}),
        }));
    },
  );
}

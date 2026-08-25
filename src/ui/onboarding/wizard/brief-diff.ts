import type { Brief } from '@/domain/onboarding/brief';
import type { BriefCorePatch } from '@/ui/onboarding/brief-fields';
import { sameHours } from '@/ui/onboarding/hours';

// OGW-502 (macrotask wizard-shell) — il DIFF PURO fra il brief PERSISTITO e il brief-bozza, che
// regge il persist-on-Advance. A ogni «Avanti» il contenitore calcola questa patch e la spedisce
// a upsertBrief: gli endpoint AI e /generate leggono il brief PERSISTITO (i loro body sono strict
// e non trasportano il brief), quindi senza salvare a ogni passo girerebbero su un `vertical`/una
// `description` stantii. La patch e' un sottoinsieme FLAT di BriefUpdateSchema (la validazione
// resta server-side): qui c'e' solo la FORMA di cio' che cambia.
//
// ADDITIVO, non distruttivo — SCELTA DICHIARATA. Un campo core di testo entra nella patch SOLO se
// il draft ne porta un valore NON VUOTO e diverso dal persistito. Non si spedisce mai la stringa
// vuota: business_name ha `.min(1)` (T-121) e una '' farebbe fallire l'INTERA patch con 400 (nulla
// salvato, si perderebbero anche i campi validi dello stesso «Avanti»). Lo SVUOTAMENTO di un campo
// e' un'azione della schermata Rivedi (buildReviewPatch, che lo gestisce con la conferma esplicita),
// non un effetto della navigazione.
//
// LIMITE EREDITATO (T-122), dichiarato: `offerings` si fonde per NOME in applyBriefUpdate (name
// uguale aggiorna, name nuovo appende) e non ha un canale di rimozione. Quindi il persist-on-Advance
// AGGIORNA/APPENDE le offerte, ma togliere una voce e ri-avanzare non la rimuove dal DB. Non si
// risolve qui (sarebbe toccare il dominio brief): la rimozione fine resta un limite noto del confine.

export type BriefDiffPatch = BriefCorePatch &
  Partial<{
    geo: { lat: number; lng: number };
    highlights: string[];
    social_links: string[];
    brand_hints: string;
  }>;

const CORE_TEXT_FIELDS = [
  'business_name',
  'description',
  'address',
  'phone',
  'whatsapp',
  'email',
] as const;

// Uguaglianza di due liste di offerte per valore: stessa lunghezza e, indice per indice, gli
// stessi cinque campi (gli opzionali assenti valgono ''). Serve a non ri-spedire offerte immutate.
function sameOfferings(
  a: Brief['content']['offerings'],
  b: Brief['content']['offerings'],
): boolean {
  return (
    a.length === b.length &&
    a.every((item, i) => {
      const other = b[i];
      return (
        item.name === other.name &&
        (item.description ?? '') === (other.description ?? '') &&
        (item.price ?? '') === (other.price ?? '') &&
        (item.photo_ref ?? '') === (other.photo_ref ?? '') &&
        (item.section ?? '') === (other.section ?? '')
      );
    })
  );
}

function sameStrings(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

function sameGeo(a: Brief['geo'], b: Brief['geo']): boolean {
  if (!a || !b) return a === b;
  return a.lat === b.lat && a.lng === b.lng;
}

export function briefDiff(persisted: Brief, draft: Brief): BriefDiffPatch {
  const patch: BriefDiffPatch = {};

  for (const field of CORE_TEXT_FIELDS) {
    const value = draft[field];
    // Non vuoto e diverso dal persistito: additivo, mai lo svuotamento (sopra).
    if (typeof value === 'string' && value.length > 0 && value !== persisted[field]) {
      patch[field] = value;
    }
  }

  // vertical porta sempre un valore (default 'altro', T-121): si spedisce solo se cambia.
  if (draft.vertical !== persisted.vertical) patch.vertical = draft.vertical;
  // primary_goal e' opzionale: si spedisce solo se presente e cambiato (l'enum non ammette '').
  if (draft.primary_goal && draft.primary_goal !== persisted.primary_goal) {
    patch.primary_goal = draft.primary_goal;
  }

  if (draft.geo && !sameGeo(draft.geo, persisted.geo)) patch.geo = draft.geo;

  const draftHours = draft.hours ?? {};
  if (!sameHours(draftHours, persisted.hours ?? {})) patch.hours = draftHours;

  if (!sameOfferings(draft.content.offerings, persisted.content.offerings)) {
    patch.offerings = draft.content.offerings;
  }
  if (!sameStrings(draft.content.highlights, persisted.content.highlights)) {
    patch.highlights = draft.content.highlights;
  }
  if (!sameStrings(draft.content.social_links, persisted.content.social_links)) {
    patch.social_links = draft.content.social_links;
  }
  if ((draft.content.brand_hints ?? '') !== (persisted.content.brand_hints ?? '')) {
    patch.brand_hints = draft.content.brand_hints ?? '';
  }

  return patch;
}

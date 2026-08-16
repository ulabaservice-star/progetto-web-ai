// DV2-402/AC-402-3 (macrotask body-sections-a, design-engine-v2) — LA COMPOSIZIONE DI PRESENTAZIONE del
// documento mockup (DS-V2-D11 #3). Fa SPARIRE I VUOTI aggiungendo alla HOME i blocchi RECENSIONI e FAQ
// quando il documento non li porta, cosi' che il mockup mostri un impaginato completo (le sezioni
// rendono uno SCHELETRO placeholder, DV2-402 — copy UI fissa, mai contenuto inventato).
//
// PERCHE' QUI E NON IN blocksFor/generatable (la scelta portante, DS-V2-D11 #3): il GATE DI COSTO
// (`generatable`, T-215) e la precondizione dei blocchi (`blocksFor`, T-210) restano INTATTI — un brief
// senza recensioni resta "non generabile" sui blocchi REALI, e `recensioni.precondition` resta
// `() => false` (P2-D7: nessun blocco-segnaposto nel gate a pagamento). Lo scheletro e' una scelta di
// PRESENTAZIONE del documento gia' composto, non un blocco che "esiste" per il modello: il modello non
// riceve mai gli slot di queste sezioni (T-220), quindi non puo' riempirle di dati finti. La regola
// anti-invenzione resta strutturalmente intatta.
//
// DOMINIO PURO: nessun accesso al DB, nessun I/O, nessun Date/Math.random. Immutabile — ritorna un
// documento NUOVO (nuovi array/oggetti), mai muta l'ingresso. Idempotente per id: se la home porta gia'
// un blocco 'recensioni' o 'faq' (es. la FAQ quando materieFaq>=3), non lo duplica. NON e' un gate: chi
// chiama fa passare il risultato da `parseDocument` (T-202), come per `resolve`.

import { DOCUMENT_LIMITS, type SiteBlock, type SiteDocument, type SitePage } from '@/domain/generation/document';

/** Il ruolo della pagina che ospita le sezioni di presentazione: la HOME (dove rientrano le sezioni). */
const HOME_ROLE = 'home';

/**
 * Gli id dei blocchi di presentazione, NELL'ORDINE in cui si aggiungono in coda alla home. Sono blocchi
 * ESISTENTI del catalogo (T-210): non si registra nulla di nuovo, si compone soltanto.
 */
const PRESENTATION_BLOCK_IDS = ['recensioni', 'faq'] as const;

/**
 * Un blocco di presentazione VUOTO: nessuno slot di prosa, nessun dato del brief, nessuna immagine. Il
 * renderer (Recensioni/Faq v2) ne rende lo SCHELETRO placeholder (copy UI fissa i18n). I quattro campi
 * dati sono presenti-e-vuoti come il contratto del documento richiede (T-202); `section_layout_id` resta
 * ASSENTE (senza default per-blocco): il renderer cade sul proprio fallback, e variety-select (DV2-503)
 * lo congelera'.
 */
function presentationBlock(id: string): SiteBlock {
  return { id, content: {}, data: {}, brief_fields_rendered: [], images: [] };
}

/**
 * Il documento con le sezioni di presentazione (recensioni, faq) aggiunte alla HOME quando mancano.
 *
 * - Trova la pagina 'home' (se assente, ritorna il documento invariato: nessuna casa dove ospitarle).
 * - Per ciascun id di presentazione NON gia' presente nella home, accoda un blocco vuoto — finche' c'e'
 *   spazio sotto `DOCUMENT_LIMITS.blocks_per_page` (aggiungere oltre il tetto farebbe rifiutare il
 *   documento dal gate; il guard tiene la composizione TOTALE invece di produrre un documento che cade).
 * - Ritorna un documento NUOVO (immutabile). Se non c'e' nulla da aggiungere, ritorna l'ingresso.
 */
export function withPresentationSections(document: SiteDocument): SiteDocument {
  const homeIndex = document.pages.findIndex((page) => page.role === HOME_ROLE);
  if (homeIndex === -1) return document;

  const home = document.pages[homeIndex];
  // Una home SENZA contenuto reale (0 blocchi) resta vuota: aggiungerci lo scheletro produrrebbe un
  // mockup fatto SOLO di sezioni-segnaposto e aggirerebbe la difesa P2-D7 (una pagina senza blocchi non
  // e' valida → `resolveVariantHome` ritorna null su un pool vuoto). Lo scheletro ARRICCHISCE un
  // impaginato che gia' esiste, non lo INVENTA dal nulla.
  if (home.blocks.length === 0) return document;
  const presenti = new Set(home.blocks.map((blocco) => blocco.id));
  const daAggiungere: SiteBlock[] = [];
  let spazio = DOCUMENT_LIMITS.blocks_per_page - home.blocks.length;

  for (const id of PRESENTATION_BLOCK_IDS) {
    if (presenti.has(id)) continue;
    if (spazio <= 0) break;
    daAggiungere.push(presentationBlock(id));
    spazio -= 1;
  }

  if (daAggiungere.length === 0) return document;

  const nuovaHome: SitePage = { ...home, blocks: [...home.blocks, ...daAggiungere] };
  const pages = document.pages.map((page, i) => (i === homeIndex ? nuovaHome : page));
  return { ...document, pages };
}

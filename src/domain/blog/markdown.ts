// PUB-401 (macrotask blog-pipeline, p6a-public-surface) — LA PIPELINE MARKDOWN PURA del blog. Un solo
// modulo di dominio: gray-matter estrae il frontmatter, la catena unified converte il corpo in HTML
// SANIFICATO. Dominio PURO: nessun accesso a env, filesystem o rete, nessuna sorgente non-deterministica
// (data/random). E' il cuore oracolabile su cui poggeranno il loader dei file (PUB-411), le rotte
// (PUB-421/431) e i seed (PUB-451): qui c'e' solo la trasformazione raw -> { frontmatter, html }.
//
// PERCHE' rehype-sanitize E' UN PUNTO DI SICUREZZA, NON DECORAZIONE (A05:2025 injection, P6A-D9). Il
// corpo markdown puo' contenere HTML grezzo (<script>, <img onerror>, href javascript:). Anche se il
// contenuto e' FIDATO (entra per git review), la difesa e' in PROFONDITA': rehype-sanitize con lo schema
// di default rimuove tag pericolosi, gestori inline on* e URL javascript: PRIMA che l'HTML raggiunga la
// pagina (dove sara' reso solo a valle, PUB-431). La sanificazione e' di LIBRERIA PROVATA
// (hast-util-sanitize), non artigianale.
//
// PERCHE' allowDangerousHtml + rehype-raw. remark-rehype, di default, SCARTA l'HTML grezzo del markdown:
// cosi' <script> sparirebbe da solo e rehype-sanitize non avrebbe nulla da rimuovere (sarebbe un placebo).
// Con `allowDangerousHtml: true` l'HTML grezzo entra come nodi `raw`; rehype-raw li RI-PARSA in veri
// elementi hast; solo allora rehype-sanitize li VEDE e li neutralizza. Cosi' la sanificazione e'
// osservabile e la batteria di mutazione (togliere rehype-sanitize) la prova rossa: senza di essa
// <script>/onerror/onclick SOPRAVVIVONO nell'output.

import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

/**
 * L'esito della pipeline: il frontmatter (mappa opaca chiave->valore, cosi' com'e' letto da gray-matter;
 * la sua VALIDAZIONE con zod e l'accoppiamento translationKey sono di PUB-411) e l'HTML gia' SANIFICATO
 * del corpo. Entrambi deterministici rispetto a `raw`.
 */
export type RenderedMarkdown = {
  readonly frontmatter: Record<string, unknown>;
  readonly html: string;
};

/**
 * La catena unified, costruita e CONGELATA UNA sola volta (processSync la freeza): riusarla e' sicuro e
 * deterministico. remark-parse (markdown -> mdast) -> remark-rehype con `allowDangerousHtml` (mdast ->
 * hast, l'HTML grezzo resta come nodi raw) -> rehype-raw (raw -> veri elementi hast) -> rehype-sanitize
 * (schema di default: via <script>, gestori on*, javascript:) -> rehype-stringify (hast -> HTML). Nessun
 * `allowDangerousHtml` su stringify: dopo la sanificazione non c'e' piu' HTML pericoloso da riemettere.
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize)
  .use(rehypeStringify)
  .freeze();

/**
 * Trasforma un documento markdown grezzo (frontmatter --- ... --- + corpo) in { frontmatter, html }.
 * PURA e SINCRONA (processSync): stesso `raw` -> stesso output, byte per byte (nessuna sorgente
 * non-deterministica, nessun I/O). L'HTML e' SANIFICATO dalla catena sopra (difesa in profondita', P6A-D9).
 */
export function renderMarkdown(raw: string): RenderedMarkdown {
  const { data, content } = matter(raw);
  const html = String(processor.processSync(content));
  return { frontmatter: data as Record<string, unknown>, html };
}

import 'server-only';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { renderMarkdown } from '@/domain/blog/markdown';

// PUB-411 (macrotask blog-content, p6a-public-surface) — IL LOADER dei post del blog sopra
// content/blog/{it,es}/<slug>.md. Poggia sulla pipeline PURA renderMarkdown (PUB-401) per rendere
// l'HTML SANIFICATO del corpo; qui si aggiunge cio' che la pipeline lascia fuori: leggere i file,
// VALIDARE il frontmatter con zod e ACCOPPIARE le traduzioni fra i due locali per translationKey.
//
// SICUREZZA:
//  - A01:2025 path traversal (CWE-22). getPost vincola lo slug a [a-z0-9-]+ PRIMA di comporre il path:
//    uno slug con `..` o separatori e' respinto (fail-closed a null) e nessun readFile avviene fuori da
//    content/blog. La stessa guardia filtra i nomi di file letti da listPosts: solo <slug>.md conforme
//    conta come post.
//  - A05:2025 injection. Il contenuto e' FIDATO (entra per git review) ma comunque il corpo e' sanificato
//    a valle da renderMarkdown (rehype-sanitize, P6A-D9) e il frontmatter e' validato con zod
//    (fail-closed: un campo mancante/di tipo errato fa lanciare un errore che nomina il campo).
//  - `import 'server-only'`: legge il filesystem, quindi non deve MAI finire nel bundle client (i test lo
//    risolvono a empty.js via vitest, come per gli adattatori di src/data/**). La resa nella pagina e' di
//    blog-post (PUB-431), il caricamento dei post seed reali di blog-seed (PUB-451).

/**
 * I due locali del blog. Fonte di verita' del set di lingue: `@/i18n/routing` (locales ['it','es']);
 * qui e' ribadito in locale per tenere il dominio libero da import di framework — i due valori vanno
 * mantenuti allineati a routing (content/blog ha esattamente le cartelle {it,es}).
 */
const LOCALES = ['it', 'es'] as const;
export type BlogLocale = (typeof LOCALES)[number];

/**
 * Schema zod del frontmatter di un post. `date` e' una STRINGA ISO (es. "2026-03-01"): nel markdown va
 * QUOTATA, altrimenti YAML la coerce a un oggetto Date e questa validazione la respinge (campo non
 * conforme). `translationKey` accoppia le traduzioni fra i locali. Un frontmatter non conforme fa
 * lanciare zod con un errore che NOMINA il campo mancante/invalido (fail-closed, A05:2025).
 */
export const blogFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string().min(1),
  translationKey: z.string().min(1),
  draft: z.boolean().optional(),
});
export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

/** Il riassunto di un post (senza HTML) usato dalle liste; getPost aggiunge `html`. */
export type BlogPostSummary = {
  readonly slug: string;
  readonly locale: BlogLocale;
  readonly frontmatter: BlogFrontmatter;
};
/** Un post completo: riassunto + HTML del corpo gia' SANIFICATO da renderMarkdown. */
export type BlogPost = BlogPostSummary & { readonly html: string };
/** Una traduzione dell'ALTRO locale che condivide translationKey. */
export type PostAlternate = { readonly locale: BlogLocale; readonly slug: string };

/** Opzioni comuni: la root del contenuto e' INIETTABILE (default alla dir reale) per i test su fixture. */
export type ContentOptions = { readonly root?: string };

/** Solo [a-z0-9-]+ e' uno slug lecito: nessun `.` o separatore raggiunge mai il filesystem. */
const SLUG_RE = /^[a-z0-9-]+$/;

/** La root reale del contenuto, risolta pigramente al momento della chiamata (mai al load del modulo). */
function contentRoot(options?: ContentOptions): string {
  return options?.root ?? join(process.cwd(), 'content', 'blog');
}

/**
 * Costruisce il riassunto di un file di post, oppure null se il nome non e' un post lecito (non `.md`
 * o slug non conforme: `.DS_Store`, README, sottocartelle sono ignorati). Il frontmatter e' validato:
 * un file conforme come nome ma con frontmatter invalido fa lanciare zod (fail-closed, non nascosto).
 */
function toSummary(root: string, locale: BlogLocale, filename: string): BlogPostSummary | null {
  if (!filename.endsWith('.md')) return null;
  const slug = filename.slice(0, -'.md'.length);
  if (!SLUG_RE.test(slug)) return null;
  const { frontmatter: raw } = renderMarkdown(readFileSync(join(root, locale, filename), 'utf8'));
  const frontmatter = blogFrontmatterSchema.parse(raw);
  return { slug, locale, frontmatter };
}

/**
 * I post del locale (esclusi i draft) ordinati per data DECRESCENTE (il piu' recente primo). Se la dir
 * del locale non esiste ancora (il seed arriva con PUB-451) ritorna [] senza lanciare.
 */
export function listPosts(locale: BlogLocale, options?: ContentOptions): BlogPostSummary[] {
  const dir = join(contentRoot(options), locale);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((filename) => toSummary(contentRoot(options), locale, filename))
    .filter((post): post is BlogPostSummary => post !== null)
    .filter((post) => post.frontmatter.draft !== true)
    .sort((a, b) => Date.parse(b.frontmatter.date) - Date.parse(a.frontmatter.date));
}

/**
 * Il post `slug` del locale con { slug, locale, frontmatter, html }, oppure null se il file non esiste.
 * Lo slug e' validato PRIMA di comporre il path: uno slug ostile (`../../secret`) e' respinto a null
 * senza toccare il filesystem (anti path-traversal).
 */
export function getPost(locale: BlogLocale, slug: string, options?: ContentOptions): BlogPost | null {
  if (!SLUG_RE.test(slug)) return null;
  const file = join(contentRoot(options), locale, `${slug}.md`);
  if (!existsSync(file)) return null;
  const { frontmatter: raw, html } = renderMarkdown(readFileSync(file, 'utf8'));
  const frontmatter = blogFrontmatterSchema.parse(raw);
  return { slug, locale, frontmatter, html };
}

/**
 * Le traduzioni dell'ALTRO locale che condividono translationKey con (locale, slug). Array VUOTO se
 * nessuna (nessun alternate fittizio: un post senza controparte non genera hreflang, P6A-D9). Fail-closed
 * anche sullo slug ostile: se il post di partenza non si risolve, ritorna [].
 */
export function resolvePostAlternates(
  locale: BlogLocale,
  slug: string,
  options?: ContentOptions,
): PostAlternate[] {
  const current = getPost(locale, slug, options);
  if (current === null) return [];
  const key = current.frontmatter.translationKey;
  const alternates: PostAlternate[] = [];
  for (const other of LOCALES) {
    if (other === locale) continue;
    for (const post of listPosts(other, options)) {
      if (post.frontmatter.translationKey === key) {
        alternates.push({ locale: other, slug: post.slug });
      }
    }
  }
  return alternates;
}

// C4 di blog-seed (PUB-451): i post SEED reali sotto content/blog/{it,es}. A differenza di
// blog-content.test.ts (fixture temporanea con root iniettata), qui si gira il contenuto VERO attraverso
// il loader (PUB-411) e la pipeline (PUB-401) con la root REALE (process.cwd()/content/blog): i seed
// devono passare lo schema zod del frontmatter (nessun draft:true), accoppiarsi it<->es via
// translationKey condiviso, e rendere HTML che conserva il contenuto legittimo dopo la sanificazione.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  blogFrontmatterSchema,
  getPost,
  listPosts,
  resolvePostAlternates,
} from '@/domain/blog/content';
import { renderMarkdown } from '@/domain/blog/markdown';

// Le coppie seed reali (invarianti pinnate dal blueprint blog-seed): slug it/es + translationKey
// condiviso. Il PAIR A porta un'intestazione h2 nota, verificata da AC-451-3.
const PAIR_A = {
  key: 'local-web-vs-social',
  it: 'perche-il-tuo-negozio-ha-bisogno-di-un-sito',
  es: 'por-que-tu-negocio-necesita-una-pagina-web',
  itPinnedH2: 'Il tuo sito lavora anche quando tu dormi',
};
const PAIR_B = {
  key: 'build-site-with-ai',
  it: 'crea-il-tuo-sito-con-ai-in-pochi-minuti',
  es: 'crea-tu-web-con-inteligencia-artificial',
};

// Tutti i file seed (locale + slug) su cui vale AC-451-1.
const SEEDS = [
  { locale: 'it' as const, slug: PAIR_A.it },
  { locale: 'es' as const, slug: PAIR_A.es },
  { locale: 'it' as const, slug: PAIR_B.it },
  { locale: 'es' as const, slug: PAIR_B.es },
];

// Legge il frontmatter GREZZO di un seed dal disco (root reale), via la stessa pipeline usata dal loader.
function rawFrontmatter(locale: 'it' | 'es', slug: string): Record<string, unknown> {
  const file = join(process.cwd(), 'content', 'blog', locale, `${slug}.md`);
  return renderMarkdown(readFileSync(file, 'utf8')).frontmatter;
}

describe('post seed reali del blog (PUB-451)', () => {
  // AC-451-1
  it('AC-451-1: ogni seed ha frontmatter valido secondo lo schema zod e nessuno e un draft', () => {
    for (const seed of SEEDS) {
      const fm = rawFrontmatter(seed.locale, seed.slug);
      const res = blogFrontmatterSchema.safeParse(fm);
      expect(res.success, `frontmatter non valido per ${seed.locale}/${seed.slug}`).toBe(true);
      expect(fm.draft, `${seed.locale}/${seed.slug} non deve essere un draft`).not.toBe(true);
    }
    // La coppia condivide lo stesso translationKey (accoppiamento it<->es).
    expect(rawFrontmatter('it', PAIR_A.it).translationKey).toBe(PAIR_A.key);
    expect(rawFrontmatter('es', PAIR_A.es).translationKey).toBe(PAIR_A.key);
    expect(rawFrontmatter('it', PAIR_B.it).translationKey).toBe(PAIR_B.key);
    expect(rawFrontmatter('es', PAIR_B.es).translationKey).toBe(PAIR_B.key);
  });

  // AC-451-1 (DoD): i seed compaiono in listPosts e sono leggibili con getPost.
  it('i seed compaiono in listPosts e sono leggibili con getPost', () => {
    const itSlugs = listPosts('it').map((p) => p.slug);
    const esSlugs = listPosts('es').map((p) => p.slug);
    expect(itSlugs).toContain(PAIR_A.it);
    expect(itSlugs).toContain(PAIR_B.it);
    expect(esSlugs).toContain(PAIR_A.es);
    expect(esSlugs).toContain(PAIR_B.es);
    expect(getPost('it', PAIR_A.it)).not.toBeNull();
    expect(getPost('es', PAIR_A.es)).not.toBeNull();
  });

  // AC-451-2
  it('AC-451-2: la coppia si accoppia via resolvePostAlternates (solo la controparte reale)', () => {
    expect(resolvePostAlternates('it', PAIR_A.it)).toEqual([{ locale: 'es', slug: PAIR_A.es }]);
    expect(resolvePostAlternates('it', PAIR_B.it)).toEqual([{ locale: 'es', slug: PAIR_B.es }]);
    // Reciproco per costruzione: da es si torna a it.
    expect(resolvePostAlternates('es', PAIR_A.es)).toEqual([{ locale: 'it', slug: PAIR_A.it }]);
  });

  // AC-451-3
  it('AC-451-3: renderMarkdown conserva un frammento legittimo noto del corpo dopo la sanificazione', () => {
    const post = getPost('it', PAIR_A.it);
    expect(post).not.toBeNull();
    expect(post?.html).toContain(`<h2>${PAIR_A.itPinnedH2}</h2>`);
  });
});

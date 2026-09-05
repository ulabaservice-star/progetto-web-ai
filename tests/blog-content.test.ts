// C4 di blog-content (PUB-411): il loader dei post src/domain/blog/content.ts. Verifica
// listPosts (ordine per data DESC, draft esclusi), getPost (frontmatter + html via renderMarkdown,
// null sul mancante), resolvePostAlternates (accoppiamento per translationKey, [] senza controparte) e
// la guardia anti path-traversal sullo slug. La root del contenuto e' iniettata su una FIXTURE
// temporanea: il test NON dipende dal seed reale (PUB-451). Gli oracoli C1/C2 + la mutazione
// (.trueline/pub-blog-content-mutants.mjs) sono a parte.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  blogFrontmatterSchema,
  getPost,
  listPosts,
  resolvePostAlternates,
  type BlogFrontmatter,
} from '@/domain/blog/content';

// Compone un documento markdown (frontmatter + corpo). La data e' QUOTATA di proposito: cosi' YAML la
// tiene stringa (lo schema zod la vuole stringa; una data nuda diventerebbe un oggetto Date).
function post(fm: Record<string, string | boolean>, body: string): string {
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`);
  return ['---', ...lines, '---', '', body, ''].join('\n');
}

let tmp: string;
let root: string; // la dir content/blog iniettata (contiene it/ ed es/)
let secretPath: string; // un file FUORI da root, bersaglio del path-traversal

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'blog-content-'));
  root = join(tmp, 'blog');
  mkdirSync(join(root, 'it'), { recursive: true });
  mkdirSync(join(root, 'es'), { recursive: true });

  // Tre post it di date diverse + un draft (data la piu' recente: se il filtro draft sparisse,
  // comparirebbe PRIMO).
  writeFileSync(
    join(root, 'it', 'primo.md'),
    post({ title: 'Primo', description: 'desc primo', date: '2026-03-01', translationKey: 'k1' }, '# Primo\n\nCorpo primo.'),
  );
  writeFileSync(
    join(root, 'it', 'secondo.md'),
    post({ title: 'Secondo', description: 'desc secondo', date: '2026-02-01', translationKey: 'solo-it' }, '# Secondo\n\nCorpo secondo.'),
  );
  writeFileSync(
    join(root, 'it', 'terzo.md'),
    post({ title: 'Terzo', description: 'desc terzo', date: '2026-01-01', translationKey: 'k3' }, '# Terzo\n\nCorpo terzo.'),
  );
  writeFileSync(
    join(root, 'it', 'bozza.md'),
    post({ title: 'Bozza', description: 'desc bozza', date: '2026-04-01', translationKey: 'kb', draft: true }, '# Bozza\n\nNon pubblicata.'),
  );
  // La controparte es di 'primo' (stesso translationKey 'k1').
  writeFileSync(
    join(root, 'es', 'primo-es.md'),
    post({ title: 'Primo ES', description: 'desc primo es', date: '2026-03-01', translationKey: 'k1' }, '# Primo ES\n\nCuerpo primero.'),
  );
  // Il bersaglio del path-traversal: DUE livelli sopra root/it, cioe' tmp/secret.md. E' un post VALIDO
  // di proposito: senza la guardia sullo slug, getPost('it','../../secret') lo leggerebbe (non null).
  secretPath = join(tmp, 'secret.md');
  writeFileSync(
    secretPath,
    post({ title: 'Secret', description: 'segreto', date: '2026-01-01', translationKey: 'leak' }, '# Secret\n\nDato riservato.'),
  );
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('content loader del blog (PUB-411)', () => {
  // AC-411-1
  it('AC-411-1: listPosts ordina per data DESC ed esclude i draft', () => {
    const slugs = listPosts('it', { root }).map((p) => p.slug);
    expect(slugs).toEqual(['primo', 'secondo', 'terzo']);
    expect(slugs).not.toContain('bozza');
  });

  // AC-411-2
  it('AC-411-2: getPost ritorna frontmatter+html sul post esistente, null sull inesistente', () => {
    const p = getPost('it', 'primo', { root });
    expect(p).not.toBeNull();
    expect(p?.frontmatter.title).toBe('Primo');
    expect(p?.html).toContain('<p>Corpo primo.</p>');
    expect((p?.html.length ?? 0) > 0).toBe(true);
    expect(getPost('it', 'inesistente', { root })).toBeNull();
  });

  // AC-411-3
  it('AC-411-3: resolvePostAlternates accoppia le traduzioni per translationKey', () => {
    expect(resolvePostAlternates('it', 'primo', { root })).toEqual([{ locale: 'es', slug: 'primo-es' }]);
    // Reciproco per costruzione: da es torna a it.
    expect(resolvePostAlternates('es', 'primo-es', { root })).toEqual([{ locale: 'it', slug: 'primo' }]);
  });

  // AC-411-4
  it('AC-411-4: nessun accoppiamento fittizio senza controparte (array vuoto)', () => {
    expect(resolvePostAlternates('it', 'secondo', { root })).toEqual([]);
  });

  // AC-411-5
  it('AC-411-5: uno slug ostile e respinto a null senza uscire da content/blog', () => {
    // Il bersaglio esiste davvero fuori da root: e' la guardia sullo slug a fermare la lettura, non un
    // file mancante (senza guardia, join(root,'it','../../secret.md') === tmp/secret.md sarebbe letto).
    expect(existsSync(secretPath)).toBe(true);
    expect(getPost('it', '../../secret', { root })).toBeNull();
  });
});

// DoD PUB-411 (schema zod): il frontmatter e' validato fail-closed — un campo mancante fa fallire il
// parse nominando il campo, `draft` e' opzionale. Non e' fra i 5 AC ma e' un requisito del DoD.
describe('blogFrontmatterSchema — validazione fail-closed del frontmatter (PUB-411)', () => {
  it('accetta un frontmatter conforme (draft opzionale assente) e ne tipizza BlogFrontmatter', () => {
    const fm: BlogFrontmatter = blogFrontmatterSchema.parse({
      title: 'T',
      description: 'D',
      date: '2026-03-01',
      translationKey: 'k1',
    });
    expect(fm.title).toBe('T');
    expect(fm.draft).toBeUndefined();
  });

  it('rifiuta un frontmatter senza translationKey NOMINANDO il campo mancante', () => {
    const res = blogFrontmatterSchema.safeParse({ title: 'T', description: 'D', date: '2026-03-01' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((issue) => issue.path.includes('translationKey'))).toBe(true);
    }
  });

  it('rifiuta un title vuoto (stringa non vuota richiesta)', () => {
    const res = blogFrontmatterSchema.safeParse({ title: '', description: 'D', date: '2026-03-01', translationKey: 'k1' });
    expect(res.success).toBe(false);
  });
});

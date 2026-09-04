// C4 di blog-pipeline (PUB-401): la pipeline markdown PURA renderMarkdown. Verifica frontmatter estratto,
// corpo convertito (<h1>/<p>), SANIFICAZIONE (via <script>, gestori on*) e DETERMINISMO. Nessun accesso a
// env/FS/rete: e' dominio puro (P6A-D9). Gli oracoli del checkpoint (C1/C2) + la batteria di mutazione
// (.trueline/pub-blog-pipeline-mutants.mjs) sono a parte.
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/domain/blog/markdown';

describe('renderMarkdown — pipeline markdown pura (PUB-401)', () => {
  // AC-401-1: frontmatter estratto + corpo convertito in <h1> + <p>.
  it('AC-401-1: estrae il frontmatter e converte titolo # e paragrafo in <h1>/<p>', () => {
    const raw = ['---', 'title: Il mio post', 'date: 2026-01-15', '---', '', '# Benvenuto', '', 'Questo e\' il corpo.', ''].join('\n');
    const { frontmatter, html } = renderMarkdown(raw);
    expect(frontmatter.title).toBe('Il mio post');
    expect(html).toContain('<h1>Benvenuto</h1>');
    expect(html).toMatch(/<p>Questo e' il corpo\.<\/p>/);
  });

  // AC-401-2: <script> nel corpo NON sopravvive nell'HTML (rehype-sanitize lo rimuove).
  it('AC-401-2: rimuove <script> dal corpo (nessuna sottostringa <script)', () => {
    const raw = ['---', 'title: X', '---', '', 'Testo <script>alert(1)</script> fine.', ''].join('\n');
    const { html } = renderMarkdown(raw);
    expect(html).not.toContain('<script');
    expect(html).toContain('Testo');
    expect(html).toContain('fine.');
  });

  // AC-401-3: gli attributi-gestore inline (onerror/onclick) sono rimossi.
  it('AC-401-3: rimuove gli attributi-gestore on* (onerror, onclick)', () => {
    const raw = ['---', 'title: X', '---', '', '<img src=x onerror="alert(1)"> e <a onclick="x()">link</a>.', ''].join('\n');
    const { html } = renderMarkdown(raw);
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
  });

  // AC-401-4: stesso raw -> stesso html (determinismo).
  it('AC-401-4: e\' deterministica (stesso input -> html identico)', () => {
    const raw = ['---', 'title: Deterministico', 'date: 2026-02-02', '---', '', '# Titolo', '', 'Corpo con <script>x</script> e testo **grassetto**.', ''].join('\n');
    const a = renderMarkdown(raw).html;
    const b = renderMarkdown(raw).html;
    expect(a).toBe(b);
  });
});

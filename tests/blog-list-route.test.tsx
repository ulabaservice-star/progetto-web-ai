// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import itMessages from '../messages/it.json';
import { BlogList, type BlogListItem } from '@/ui/marketing/BlogList';
import { generateStaticParams } from '@/app/[locale]/(marketing)/blog/page';

// PUB-421 (macrotask blog-list, p6a-public-surface) — ORACOLO della rotta di listing del blog. Le
// stringhe statiche NON si mockano: si risolvono dal catalogo REALE it dentro NextIntlClientProvider,
// cosi' il test misura la SCELTA DELLE CHIAVI del namespace 'blog' (pageTitle) e la resa delle card, non
// stringhe del test. Le card si iniettano come dati (indipendenti dal seed reale, PUB-451): AC-421-1 (N
// post -> N link /it/blog/<slug> + i titoli), AC-421-2 (generateStaticParams -> [it, es]), AC-421-3
// (lista vuota -> nessuna card, nessuna eccezione). La parita' del namespace e' in blog-i18n-parity.

function wrap(ui: ReactNode, locale: 'it' | 'es' = 'it') {
  const messages = itMessages;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

// Tre card sintetiche: la resa non dipende dal seed reale (PUB-451).
const POSTS: BlogListItem[] = [
  { slug: 'primo', title: 'Primo post', description: 'desc uno', date: '2026-03-01' },
  { slug: 'secondo', title: 'Secondo post', description: 'desc due', date: '2026-02-01' },
  { slug: 'terzo', title: 'Terzo post', description: 'desc tre', date: '2026-01-01' },
];

afterEach(cleanup);

describe('PUB-421 blog listing route — card, generateStaticParams, lista vuota', () => {
  it('AC-421-1: N post it → N link /it/blog/<slug> con i titoli, sotto il pageTitle del catalogo', () => {
    render(wrap(<BlogList locale="it" posts={POSTS} />, 'it'));

    // Il titolo di pagina viene dal catalogo 'blog' (nessuna stringa hard-coded).
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe(itMessages.blog.pageTitle); // covers: AC-421-1

    // Una card per post, ciascuna col suo titolo e un link all'URL per-locale corretto.
    expect(screen.getAllByTestId('blog-card')).toHaveLength(POSTS.length); // covers: AC-421-1

    const hrefs = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((h): h is string => h !== null && h.startsWith('/it/blog/'));
    expect(hrefs).toHaveLength(POSTS.length); // covers: AC-421-1
    for (const post of POSTS) {
      expect(hrefs).toContain(`/it/blog/${post.slug}`); // covers: AC-421-1
      expect(screen.getByText(post.title)).toBeTruthy(); // covers: AC-421-1
    }
  });

  it('AC-421-2: generateStaticParams() ritorna esattamente [{ locale: it }, { locale: es }]', () => {
    expect(generateStaticParams()).toEqual([{ locale: 'it' }, { locale: 'es' }]); // covers: AC-421-2
  });

  it('AC-421-3: un locale senza post → nessuna card e la resa non lancia', () => {
    expect(() => render(wrap(<BlogList locale="it" posts={[]} />, 'it'))).not.toThrow(); // covers: AC-421-3
    expect(screen.queryAllByTestId('blog-card')).toHaveLength(0); // covers: AC-421-3
    // nessun link ai post: gli unici href non puntano a /it/blog/<slug>
    const postLinks = screen
      .queryAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((h): h is string => h !== null && h.startsWith('/it/blog/'));
    expect(postLinks).toHaveLength(0); // covers: AC-421-3
  });
});

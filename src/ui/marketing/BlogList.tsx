'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

// PUB-421 (macrotask blog-list, p6a-public-surface) — la LISTA dei post del blog, resa sotto il chrome
// marketing (PUB-131). Estratta in un componente client renderizzabile in jsdom (pattern MarketingHome /
// PrivacyNotice) cosi' da essere provata sui cataloghi REALI dentro NextIntlClientProvider: il test
// misura la SCELTA DELLE CHIAVI del namespace 'blog' e la resa delle card, non stringhe del test. Il
// caricamento dei post (listPosts, PUB-411) resta nel server wrapper page.tsx; qui arrivano gia' come
// card serializzabili.
//
// SICUREZZA (A05:2025): output SOLO testo JSX (escaping React su title/description/date). L'href della
// card e' `/{locale}/blog/{slug}`: il locale proviene dall'allowlist del routing (validato a 404 nel
// layout radice) e lo slug e' gia' vincolato a [a-z0-9-]+ dal loader (PUB-411), quindi nessun valore
// libero raggiunge l'URL — nessun open-redirect/XSS. Nessun innerHTML/dangerouslySetInnerHTML, nessun
// dato utente, nessuna auth, nessuna query. Ogni etichetta statica viene dal catalogo 'blog'.

/** La card di un post nella lista: la forma serializzabile che il server wrapper passa al client. */
export type BlogListItem = {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly date: string;
};

export function BlogList({
  locale,
  posts,
}: {
  locale: string;
  posts: readonly BlogListItem[];
}): ReactElement {
  const t = useTranslations('blog');

  return (
    <main className="site-page">
      <section
        aria-labelledby="blog-list-heading"
        className="mx-auto flex max-w-5xl flex-col gap-lg px-md py-2xl"
      >
        <header className="flex flex-col gap-sm">
          <h1 className="text-balance text-4xl font-semibold text-foreground">{t('pageTitle')}</h1>
          <p id="blog-list-heading" className="max-w-2xl text-lg text-muted-foreground">
            {t('listHeading')}
          </p>
        </header>

        {/* Un locale senza post (listPosts -> []) rende SOLO il messaggio di lista vuota: nessuna card,
            nessuna eccezione (AC-421-3). Il seed reale arriva con PUB-451. */}
        {posts.length === 0 ? (
          <p data-testid="blog-empty" className="text-muted-foreground">
            {t('empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-lg">
            {posts.map((post) => (
              <li key={post.slug}>
                <article data-testid="blog-card" className="flex flex-col gap-sm">
                  <h2 className="text-2xl font-semibold text-foreground">{post.title}</h2>
                  <p className="text-muted-foreground">{post.description}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="sr-only">{t('dateLabel')} </span>
                    <time dateTime={post.date}>{post.date}</time>
                  </p>
                  <Link
                    href={`/${locale}/blog/${post.slug}`}
                    className="font-medium text-foreground"
                  >
                    {t('readMore')}
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

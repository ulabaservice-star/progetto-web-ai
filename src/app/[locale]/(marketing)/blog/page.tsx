import type { ReactElement } from 'react';
import { routing } from '@/i18n/routing';
import { listPosts, type BlogLocale } from '@/domain/blog/content';
import { BlogList, type BlogListItem } from '@/ui/marketing/BlogList';

// PUB-421 (macrotask blog-list, p6a-public-surface) — la rotta di LISTING `/{locale}/blog`, dentro il
// route group (marketing) (PUB-131): eredita il chrome header/footer del layout del group. Server
// component in SSG che enumera i locali con generateStaticParams e carica i post del locale con
// listPosts (PUB-411); la resa delle card e' delegata al componente client BlogList (renderizzabile in
// jsdom, provato sui cataloghi reali). Stesso pattern della home (MarketingHomePage -> MarketingHome) e
// della privacy (PrivacyPage -> PrivacyNotice): niente plumbing di locale per le stringhe (il
// NextIntlClientProvider del layout radice le fornisce al client).
//
// SICUREZZA (A05:2025): la rotta UI legge solo dal DOMINIO (listPosts, @/domain/blog/content), mai da
// src/data; nessuna auth, nessun dato utente. Gli slug che compongono gli href sono gia' vincolati a
// [a-z0-9-]+ dal loader (PUB-411): nessun valore libero raggiunge l'URL.

/**
 * SSG: una voce per ogni locale di routing (localePrefix 'always' → anche 'it' e' prefissato). Ritorna
 * esattamente [{ locale: 'it' }, { locale: 'es' }] (AC-421-2).
 */
export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

type BlogListPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BlogListPage({ params }: BlogListPageProps): Promise<ReactElement> {
  const { locale } = await params;
  // listPosts esclude i draft e ordina per data DESC; se content/blog/<locale> non esiste ancora (il
  // seed arriva con PUB-451) ritorna [] → lista vuota, nessun crash (AC-421-3).
  const posts: BlogListItem[] = listPosts(locale as BlogLocale).map((post) => ({
    slug: post.slug,
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    date: post.frontmatter.date,
  }));

  return <BlogList locale={locale} posts={posts} />;
}

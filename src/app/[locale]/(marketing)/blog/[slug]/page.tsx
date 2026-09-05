import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import { routing } from '@/i18n/routing';
import { getLandingBaseUrl } from '@/config/env';
import { serializeJsonLdSafe } from '@/domain/generation/jsonld';
import { getPost, listPosts, resolvePostAlternates, type BlogLocale } from '@/domain/blog/content';

// Mappa i due locali del routing (host-classify PUB-102 / i18n PUB-121) al loro tag OG BCP-47. Ripiego
// su it_IT per qualunque valore fuori allowlist (il segmento [locale] è già validato a 404 nel layout
// radice, quindi in pratica solo 'it'|'es' arriva qui).
const OG_LOCALE: Record<string, string> = { it: 'it_IT', es: 'es_ES' };

// Placeholder OG: percorso RELATIVO, risolto in assoluto da metadataBase (host landing, PUB-321) senza
// mai interpolare l'Host della richiesta. L'immagine definitiva 1200×630 è un'azione manuale del
// founder (VISION §10); qui si dichiarano solo le dimensioni attese dai social.
const OG_IMAGE = '/og-image.png';

// PUB-431 (macrotask blog-post, p6a-public-surface) — la rotta del SINGOLO POST
// `/{locale}/blog/{slug}`, dentro il route group (marketing) (PUB-131): eredita il chrome
// header/footer del layout del group. Server component in SSG che rende l'HTML del corpo e i metadati
// del post caricato dal loader di dominio (getPost/resolvePostAlternates, PUB-411). Tre invarianti di
// sicurezza (P6A-D9, A05:2025):
//
//  1. HTML SOLO SANIFICATO. L'unico html iniettato via dangerouslySetInnerHTML è `post.html`, GIÀ
//     passato da rehype-sanitize nella pipeline PURA renderMarkdown (PUB-401) dentro getPost: mai il
//     testo grezzo del corpo, mai il frontmatter. Il titolo/la data escono come figli di testo React
//     (escaping), non come markup.
//
//  2. JSON-LD ANTI-BREAKOUT. Il blocco `Article` è serializzato con serializeJsonLdSafe (riuso da
//     src/domain/generation/jsonld.ts): `<` `>` `&` U+2028/U+2029 → escape unicode, così la sequenza
//     di chiusura del <script> è irrappresentabile anche se il titolo la contenesse. Montato come
//     FIGLIO TESTUALE di <script type="application/ld+json">, mai innerHTML grezzo / concatenazione.
//
//  3. HREFLANG ONESTO. `alternates.languages` è popolato SOLO fra traduzioni REALI
//     (resolvePostAlternates): un post mono-lingua non emette alcun hreflang; quando la controparte
//     esiste il set è reciproco (self + le reali), nessun alternate fittizio verso un locale senza
//     post. Canonical/og:url nascono da getLandingBaseUrl() (config landing), mai dall'Host.
//
// Uno slug inesistente → getPost null → notFound() (404), come la rotta pubblica /s/<slug> (P4).

type BlogPostPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

/**
 * SSG: una voce { locale, slug } per OGNI post di OGNI locale di routing (listPosts esclude i draft).
 * Se un locale non ha ancora contenuto (il seed arriva con PUB-451) contribuisce con zero voci.
 */
export function generateStaticParams(): { locale: string; slug: string }[] {
  return routing.locales.flatMap((locale) =>
    listPosts(locale as BlogLocale).map((post) => ({ locale, slug: post.slug })),
  );
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPost(locale as BlogLocale, slug);
  if (post === null) notFound();

  const base = getLandingBaseUrl();
  const canonical = `${base}/${locale}/blog/${slug}`;
  const { title, description } = post.frontmatter;

  // Hreflang SOLO fra traduzioni reali (P6A-D9): un post mono-lingua (resolvePostAlternates → []) non
  // emette `languages`; quando esistono controparti il set è reciproco (self incluso).
  const alternates = resolvePostAlternates(locale as BlogLocale, slug);
  const languages =
    alternates.length > 0
      ? {
          [locale]: canonical,
          ...Object.fromEntries(
            alternates.map((alt) => [alt.locale, `${base}/${alt.locale}/blog/${alt.slug}`]),
          ),
        }
      : undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
      ...(languages !== undefined ? { languages } : {}),
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      locale: OG_LOCALE[locale] ?? OG_LOCALE.it,
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps): Promise<ReactElement> {
  const { locale, slug } = await params;
  const post = getPost(locale as BlogLocale, slug);
  if (post === null) notFound(); // slug inesistente -> getPost null -> 404 (AC-431-4)

  // JSON-LD Article: la headline viene dal frontmatter (contenuto FIDATO via git review, ma comunque
  // reso irrappresentabile come markup da serializeJsonLdSafe, riuso da jsonld.ts). Montato come figlio
  // testuale del <script>, mai innerHTML grezzo (A05:2025).
  const articleJsonLd = serializeJsonLdSafe({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.frontmatter.title,
    description: post.frontmatter.description,
    datePublished: post.frontmatter.date,
  });

  return (
    <>
      <script type="application/ld+json">{articleJsonLd}</script>
      <main className="site-page">
        <article className="mx-auto flex max-w-3xl flex-col gap-lg px-md py-2xl">
          <header className="flex flex-col gap-sm">
            <h1 className="text-balance text-4xl font-semibold text-foreground">
              {post.frontmatter.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              <time dateTime={post.frontmatter.date}>{post.frontmatter.date}</time>
            </p>
          </header>
          {/* SICUREZZA (A05:2025): l'UNICO html iniettato è post.html, GIÀ passato da rehype-sanitize
              nella pipeline pura renderMarkdown (PUB-401) dentro getPost (PUB-411). Mai il testo grezzo
              del corpo o del frontmatter. */}
          <div
            className="flex flex-col gap-md text-foreground"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        </article>
      </main>
    </>
  );
}

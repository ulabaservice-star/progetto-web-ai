import type { MetadataRoute } from 'next';
import { getLandingBaseUrl } from '@/config/env';
import { routing } from '@/i18n/routing';
import { listPosts, resolvePostAlternates, type BlogLocale } from '@/domain/blog/content';

// PUB-311 (macrotask seo-sitemap, p6a-public-surface) — LA SITEMAP DELLA LANDING (/sitemap.xml, via il
// file convention MetadataRoute.Sitemap di Next). Oggi esiste solo la sitemap PER-SITO
// /s/<slug>/sitemap.xml (P4); questa e' la sua sorella pubblica per la superficie di MARKETING: le pagine
// STABILI della landing (home + /privacy + indice /blog), ciascuna con l'hreflang IT<->ES
// (alternates.languages) tra le due sole lingue del routing (localePrefix 'always', quindi anche il
// default 'it' e' prefissato). E' la sitemap che robots.ts (PUB-301) NOMINA sul ramo 'landing'.
//
// PERCHE' LA BASE E' UN PUNTO DI SICUREZZA, NON DECORAZIONE (A05:2025 host-injection / open-redirect).
// Gli URL sono ASSOLUTI e la loro origine (schema+host) nasce SEMPRE da getLandingBaseUrl()
// (NEXT_PUBLIC_LANDING_URL, config pubblica), MAI da getSiteBaseUrl ne dall'Host grezzo della richiesta:
// una sitemap non deve poter essere ridiretta verso un host arbitrario da un header Host contraffatto.
// La funzione e' percio' PURA rispetto alla richiesta (nessun headers()): resta staticamente renderizzabile
// e la sua origine e' fissata dalla config, non dal traffico.
//
// hreflang SOLO tra i locali dell'ALLOWLIST del routing (routing.locales = 'it','es'): mai un codice
// lingua arbitrario. Alle tre pagine STABILI (P6A-D8) blog-sitemap (PUB-441) aggiunge ora una voce per
// OGNI post pubblicato di ENTRAMBI i locali, con hreflang popolato SOLO fra traduzioni reali (P6A-D9).
// Nessun dato privato, nessuna enumerazione di righe DB: solo URL pubblici e statici.

// Le pagine stabili della landing, come SUFFISSO di percorso DOPO il segmento locale ('' = home). Il
// blog qui e' solo l'indice /blog; i post sono di PUB-441.
const LANDING_PATHS = ['', '/privacy', '/blog'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getLandingBaseUrl();

  const stable: MetadataRoute.Sitemap = LANDING_PATHS.map((path) => {
    // Una voce per pagina: `url` e' la variante nel locale di default (canonica, gia' prefissata perche'
    // localePrefix e' 'always'), e alternates.languages elenca l'hreflang per OGNI locale dell'allowlist.
    const languages: Record<string, string> = Object.fromEntries(
      routing.locales.map((locale) => [locale, `${base}/${locale}${path}`] as const),
    );
    return {
      url: `${base}/${routing.defaultLocale}${path}`,
      alternates: { languages },
    };
  });

  // PUB-441 (blog-sitemap) — una voce per OGNI post pubblicato di ENTRAMBI i locali (listPosts esclude i
  // draft). Come per le pagine stabili, gli URL nascono SEMPRE da getLandingBaseUrl() (base landing), MAI
  // dall'Host della richiesta ne da getSiteBaseUrl (A05:2025 host-injection): solo URL pubblici della
  // landing, mai host app., mai rotte non pubbliche. hreflang ONESTO (P6A-D8/D9): alternates.languages e'
  // popolato SOLO fra traduzioni reali (self + le controparti reali via resolvePostAlternates); un post
  // mono-lingua non emette alcun hreflang fittizio. Nessun headers(): il blocco resta puro e statico.
  const posts: MetadataRoute.Sitemap = routing.locales.flatMap((locale) =>
    listPosts(locale as BlogLocale).map((post) => {
      const url = `${base}/${locale}/blog/${post.slug}`;
      const alternates = resolvePostAlternates(locale as BlogLocale, post.slug);
      const languages =
        alternates.length > 0
          ? {
              [locale]: url,
              ...Object.fromEntries(
                alternates.map((alt) => [alt.locale, `${base}/${alt.locale}/blog/${alt.slug}`]),
              ),
            }
          : undefined;
      return languages ? { url, alternates: { languages } } : { url };
    }),
  );

  return [...stable, ...posts];
}

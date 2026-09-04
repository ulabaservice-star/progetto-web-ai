import type { MetadataRoute } from 'next';
import { getLandingBaseUrl } from '@/config/env';
import { routing } from '@/i18n/routing';

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
// lingua arbitrario. I singoli POST del blog NON sono qui — li aggiungera' blog-sitemap (PUB-441); qui
// solo le tre pagine stabili (P6A-D8). Nessun dato privato, nessuna enumerazione di righe DB: solo URL
// pubblici e statici.

// Le pagine stabili della landing, come SUFFISSO di percorso DOPO il segmento locale ('' = home). Il
// blog qui e' solo l'indice /blog; i post sono di PUB-441.
const LANDING_PATHS = ['', '/privacy', '/blog'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getLandingBaseUrl();

  return LANDING_PATHS.map((path) => {
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
}

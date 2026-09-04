import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { classifyRequestHost } from '@/domain/hosting/classify-host';
import { getAppHost, getLandingHost, getLandingBaseUrl, getSiteBaseUrl } from '@/config/env';

// PUB-301 (macrotask seo-robots, p6a-public-surface) — robots.txt HOST-AWARE (P6A-D8). Con lo split di
// dominio (P6A-D1) un unico robots globale non basta piu': lo stesso monolite serve tre superfici e a
// ognuna corrisponde una postura di indicizzazione diversa. L'Host arriva da headers() (che forza il
// render DINAMICO: il robots non e' piu' statico) ed e' classificato SEMPRE da classifyRequestHost
// (host-classify, PUB-101) su una allowlist di config (appHost/landingHost da env), mai interpolato da
// testo libero (A05:2025). Tre rami:
//
//  - 'landing' (ulaba.net) = la superficie di MARKETING e' indicizzabile: allow '/' (la home) e '/s/'
//    (i siti pubblicati), conserva i Disallow di editor/preview, e la riga Sitemap: punta alla sitemap
//    LANDING (getLandingBaseUrl, PUB-102) — mai getSiteBaseUrl ne l'Host grezzo. Il robots landing NON
//    nomina mai l'host dell'app (AC-301-3): superficie di ricognizione minima.
//
//  - 'app' (app.ulaba.net, e ogni Host non-landing non-custom) = l'app NON e' mai indicizzabile:
//    Disallow totale '/', nessuna regola di marketing, nessuna riga Sitemap landing (A01:2025 — nessuna
//    superficie privata dell'app finisce nell'indice).
//
//  - 'custom' (dominio cliente collegato) = comportamento PRE-ESISTENTE P5/P4 preservato (non-regressione,
//    fuori scope qui): allow '/s/', Disallow editor/preview, Sitemap dalla base del sito servito
//    (getSiteBaseUrl). E' anche il ripiego fail-safe quando la config e' assente (appHost/landingHost null
//    => 'custom' => tutto come oggi).

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host')?.toLowerCase().split(':')[0] ?? '';
  const category = classifyRequestHost(host, { appHost: getAppHost(), landingHost: getLandingHost() });

  if (category === 'landing') {
    return {
      rules: {
        userAgent: '*',
        allow: ['/', '/s/'],
        disallow: ['/*/editor', '/*/preview'],
      },
      sitemap: `${getLandingBaseUrl()}/sitemap.xml`,
    };
  }

  if (category === 'app') {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  // 'custom' — la postura P5/P4 immutata (e il fail-safe senza config).
  return {
    rules: {
      userAgent: '*',
      allow: '/s/',
      disallow: ['/*/editor', '/*/preview'],
    },
    sitemap: `${getSiteBaseUrl()}/sitemap.xml`,
  };
}

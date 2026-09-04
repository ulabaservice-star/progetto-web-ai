import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getLandingBaseUrl } from '@/config/env';
import { MarketingHome } from '@/ui/marketing/MarketingHome';

type MarketingHomePageProps = {
  params: Promise<{ locale: string }>;
};

// Mappa i due locali del routing (host-classify PUB-102 / i18n PUB-121) al loro tag OG BCP-47. Ripiego
// su it_IT per qualunque valore fuori allowlist (il segmento [locale] è già validato a 404 nel layout
// radice, quindi in pratica solo 'it'|'es' arriva qui).
const OG_LOCALE: Record<string, string> = { it: 'it_IT', es: 'es_ES' };

// Placeholder OG: percorso RELATIVO, risolto in assoluto da metadataBase (host landing) senza mai
// interpolare l'Host della richiesta. L'immagine definitiva 1200×630 è un'azione manuale del founder
// (VISION §10); qui si dichiarano solo le dimensioni attese dai social.
const OG_IMAGE = '/og-image.png';

// PUB-321 (macrotask seo-metadata, p6a-public-surface) — I METADATI della HOME marketing `/{locale}`.
// Tre invarianti di sicurezza/SEO (P6A-D4/D8, A05:2025):
//
//  1. CANONICAL FISSO SULL'HOST LANDING. `alternates.canonical` = getLandingBaseUrl() (config pubblica,
//     NEXT_PUBLIC_LANDING_URL), lo STESSO qualunque sia il locale o l'Host della richiesta: un Host
//     ostile non sposta il canonical, il segnale SEO resta stabile. È il canonical della PROPRIA pagina
//     (la home = la radice della landing), non ereditato dal layout.
//
//  2. HREFLANG HTML-LEVEL RECIPROCO. `alternates.languages { it, es }` emette i <link rel=alternate>
//     per le due sole lingue del routing (localePrefix 'always' → anche 'it' è prefissato). È la
//     reciprocità piena che la sitemap (PUB-311, una-voce-per-pagina) non garantisce da sola.
//
//  3. NIENTE TESTO LIBERO NEGLI URL. canonical, og:url e og:image nascono da getLandingBaseUrl /
//     metadataBase, mai da input utente. title/description vengono dai cataloghi i18n (landing.meta),
//     resi come testo (nessun innerHTML). og:image è un placeholder finché il founder non carica la
//     definitiva (VISION §10). twitter.card = 'summary_large_image' per l'anteprima social del link.
export async function generateMetadata({ params }: MarketingHomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing.meta' });

  const base = getLandingBaseUrl();
  const title = t('title');
  const description = t('description');

  return {
    title,
    description,
    alternates: {
      canonical: base,
      languages: {
        it: `${base}/it`,
        es: `${base}/es`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: base,
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

// PUB-141 (macrotask marketing-home, p6a-public-surface) — la HOME pubblica `/{locale}`, dentro il
// route group (marketing) (PUB-131): eredita il chrome header/footer del layout del group. Server
// component sottile che rende la composizione client MarketingHome; il locale/le stringhe arrivano
// dal NextIntlClientProvider del layout radice [locale]/layout.tsx (che resta INVARIATO), quindi
// niente plumbing di locale qui. Sostituisce il vecchio placeholder [locale]/page.tsx (spostato nel
// group perché la home È una rotta marketing; un page.tsx fuori dal group risolverebbe alla stessa
// rotta /{locale} e romperebbe il build). Solo contenuto statico: nessun dato, nessuna auth.
export default function MarketingHomePage() {
  return <MarketingHome />;
}

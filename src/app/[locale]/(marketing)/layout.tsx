import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MarketingHeader } from '@/ui/marketing/MarketingHeader';
import { MarketingFooter } from '@/ui/marketing/MarketingFooter';
import { getLandingBaseUrl } from '@/config/env';

// PUB-321 (macrotask seo-metadata, p6a-public-surface) — metadataBase impostato UNA VOLTA per l'intera
// superficie marketing (host LANDING, host-classify PUB-102): l'origine assoluta contro cui Next risolve
// canonical e og:image relativi delle pagine del group. Nasce SEMPRE da getLandingBaseUrl()
// (NEXT_PUBLIC_LANDING_URL, config pubblica), MAI dall'Host della richiesta (A05:2025 host-injection /
// open-redirect): un Host contraffatto non deve poter spostare la base dei metadati (P6A-D4). Qui NON si
// mette un `alternates.canonical` unico: lo erediterebbero /privacy e /blog canonicalizzando tutte alla
// home — ogni pagina marketing dichiara il PROPRIO canonical nel suo generateMetadata (la home in
// page.tsx). getLandingBaseUrl ha un ripiego di sviluppo valido, quindi `new URL(...)` non lancia mai.
export const metadata: Metadata = {
  metadataBase: new URL(getLandingBaseUrl()),
};

// PUB-131 (macrotask marketing-layout, p6a-public-surface) — layout del route group (marketing):
// avvolge SOLO le rotte pubbliche (home/blog/privacy) col chrome marketing (header nav landing +
// footer). È un layout ANNIDATO dentro [locale]/layout.tsx (html/body + NextIntlClientProvider +
// ThemeProvider), che resta INVARIATO. Le rotte app (dashboard/login/onboarding/generate/preview/
// editor/…) vivono FUORI dal group e non sono avvolte da questo chrome (non-regressione, P6A-D4).
// Solo testo JSX (escaping React), nessun innerHTML/dangerouslySetInnerHTML.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}

import type { ReactNode } from 'react';
import { MarketingHeader } from '@/ui/marketing/MarketingHeader';
import { MarketingFooter } from '@/ui/marketing/MarketingFooter';

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

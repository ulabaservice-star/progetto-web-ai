import { MarketingHome } from '@/ui/marketing/MarketingHome';

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

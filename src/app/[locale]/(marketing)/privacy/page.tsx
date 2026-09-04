import type { ReactElement } from 'react';
import { PrivacyNotice } from '@/ui/marketing/PrivacyNotice';

// PUB-341 (macrotask privacy-page, p6a-public-surface) — la pagina pubblica `/{locale}/privacy`,
// dentro il route group (marketing) (PUB-131): eredita il chrome header/footer del layout del group.
// Server component sottile che rende la composizione client PrivacyNotice; il locale/le stringhe
// arrivano dal NextIntlClientProvider del layout radice [locale]/layout.tsx (INVARIATO), quindi
// niente plumbing di locale qui — stesso pattern della home (MarketingHomePage → MarketingHome).
//
// METADATA (DoD PUB-341): la pagina NON ridefinisce canonical/OG/hreflang qui — riusa il metadataBase
// del layout marketing (PUB-321, host landing) senza dichiarare metadati propri. Superficie pubblica:
// nessuna auth, nessun dato utente, contenuto statico (destinazione del link di consenso, PUB-242).
export default function PrivacyPage(): ReactElement {
  return <PrivacyNotice />;
}

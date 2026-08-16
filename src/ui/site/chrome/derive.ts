// DV2-404 (macrotask body-sections-b, design-engine-v2) — LA DERIVAZIONE DEGLI ATTRIBUTI-SITO per la
// CHROME (header/footer). DS-V2-D11 #4: header e footer sono la chrome del SiteView, FUORI dal documento
// congelato, e i loro contenuti sono DERIVATI dal documento — MAI slot LLM. Questa e' la sola sede di
// quella derivazione, pura e oracolabile: legge il SiteDocument e ne estrae il nome del locale, la
// navigazione (dalle pagine), i recapiti (dal blocco contatti) e gli orari (dal blocco orari).
//
// PROVENIENZA (perche' e' sicuro): i valori sono gli stessi campi del brief gia' passati da parseDocument
// (business_name, address, phone, whatsapp, email, hours). Gli HREF nascono SOLO dai costruttori validati
// (safeTel/Mailto/Https/Whatsapp), mai dal testo libero (AC-DV2-404-3); gli anchor di navigazione usano lo
// SLUG di pagina, gia' vincolato nella forma da PageSlugSchema. Il render (SiteHeader/SiteFooter) mette i
// valori come figli di React (escaping). Nessun I/O, nessun Date/Math.random: funzione pura.

import type { SiteDocument } from '@/domain/generation/document';
import { safeTelHref, safeMailtoHref, safeHttpsHref } from '@/ui/site/blocks/contact-links';
import { safeWhatsappHref } from '@/ui/site/blocks/whatsapp';

/** Una voce di navigazione: l'etichetta (titolo di pagina, escaped) e l'anchor allo slug della pagina. */
export type ChromeNavItem = { readonly label: string; readonly href: string };

/** Un social derivato: il testo visibile e, se valido, il suo href https sicuro (altrimenti null). */
type ChromeSocial = { readonly value: string; readonly href: string | null };

/** Una voce oraria per il footer: la chiave-giorno e la fascia (dal record data.hours). */
type ChromeHoursItem = { readonly label: string; readonly value: string };

/**
 * GLI ATTRIBUTI-SITO derivati dal documento per la chrome. Tutto opzionale: un documento privo di un
 * blocco (niente orari, niente contatti) lascia i campi vuoti e il renderer omette quella colonna/voce.
 */
export type ChromeData = {
  /** Il nome del locale (dal business_name reso dall'hero), o null se assente. */
  readonly businessName: string | null;
  /** La navigazione, una voce per pagina del documento (titolo -> #slug). */
  readonly nav: readonly ChromeNavItem[];
  readonly address: string | null;
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly email: string | null;
  /** Gli href SICURI dei recapiti (dai costruttori validati), o null quando il valore non e' valido. */
  readonly telHref: string | null;
  readonly mailHref: string | null;
  readonly whatsappHref: string | null;
  readonly socials: readonly ChromeSocial[];
  /** Gli orari sintetici per il footer (dal record data.hours del blocco orari). */
  readonly hours: readonly ChromeHoursItem[];
  /**
   * L'href della CTA della testata: il deep-link WhatsApp se valido, altrimenti l'anchor alla pagina
   * 'contact' (se esiste), altrimenti null (nessuna CTA). Mai un href da testo libero.
   */
  readonly ctaHref: string | null;
};

/** La prima stringa non vuota, o undefined. */
function firstText(value: string | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/**
 * Deriva gli attributi-sito per la chrome dal documento congelato. PURA: nessun I/O, nessun orologio.
 * Il nome del locale e i recapiti si CERCANO per presenza di campo (non per id di blocco), cosi' la
 * derivazione regge anche se l'ordine o gli id dei blocchi cambiano.
 */
export function deriveChromeData(document: SiteDocument): ChromeData {
  const blocks = document.pages.flatMap((page) => page.blocks);

  const businessName = firstText(
    blocks.map((b) => b.data.business_name).find((v) => firstText(v) !== null),
  );

  // Il blocco recapiti: il primo che porta almeno un canale (indirizzo/telefono/whatsapp/email).
  const contact = blocks.find(
    (b) =>
      firstText(b.data.address) !== null ||
      firstText(b.data.phone) !== null ||
      firstText(b.data.whatsapp) !== null ||
      firstText(b.data.email) !== null,
  );
  const address = firstText(contact?.data.address);
  const phone = firstText(contact?.data.phone);
  const whatsapp = firstText(contact?.data.whatsapp);
  const email = firstText(contact?.data.email);
  const socials: ChromeSocial[] = (contact?.data.social_links ?? [])
    .filter((s) => firstText(s) !== null)
    .map((value) => ({ value, href: safeHttpsHref(value) }));

  // Gli orari: il primo blocco che porta un record hours con almeno una chiave PROPRIA.
  const hoursBlock = blocks.find((b) => Object.keys(b.data.hours ?? {}).length > 0);
  const hours: ChromeHoursItem[] = Object.entries(hoursBlock?.data.hours ?? {}).map(([label, value]) => ({
    label,
    value,
  }));

  const nav: ChromeNavItem[] = document.pages.map((page) => ({
    label: page.title,
    href: `#${page.slug}`,
  }));

  const whatsappHref = safeWhatsappHref(whatsapp ?? undefined);
  const contactPage = document.pages.find((page) => page.role === 'contact');
  const contactAnchor = contactPage !== undefined ? `#${contactPage.slug}` : null;

  return {
    businessName,
    nav,
    address,
    phone,
    whatsapp,
    email,
    telHref: safeTelHref(phone ?? undefined),
    mailHref: safeMailtoHref(email ?? undefined),
    whatsappHref,
    socials,
    hours,
    ctaHref: whatsappHref ?? contactAnchor,
  };
}

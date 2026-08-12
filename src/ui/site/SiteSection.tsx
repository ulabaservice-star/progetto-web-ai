// T-231 (macrotask generation-ui, P2) — l'INVOLUCRO condiviso di ogni blocco: un landmark
// <section> col nome i18n della sezione, gli slot immagine, e i figli del blocco. Vive una
// volta sola cosi' che il landmark, il nome accessibile e la resa delle immagini non siano
// riscritti da ogni blocco (e da ogni blocco di dati che T-237 aggiungera').
//
// IL NOME DEL LANDMARK E' L'ETICHETTA i18n (P2-D10), non la prosa del modello: la sezione
// porta come `aria-label` l'etichetta del catalogo del locale, mentre il titolo VISIBILE
// resta la prosa che il modello ha scritto nello slot. Il `data-block-id` espone la sequenza
// dei blocchi resi, che e' cio' su cui T-232 verifichera' che card e anteprima passino dallo
// stesso renderer (AC-232-1).
//
// DE-102 (macrotask visual-skin) — gli STILI STATICI della sezione (fondo, testo, bordo, font,
// padding) non stanno piu' inline: vivono in site.css sotto `.site-section`, e l'unico stile
// inline del render resta `siteThemeStyle` alla RADICE (dinamico, dipende dal tema). Ogni sezione
// porta inoltre `data-block-kind` col TIPO del blocco: per l'invariante del registry (registry.ts)
// `block.id` E' la chiave del catalogo, cioe' la kind (hero, offerte, orari, chi-siamo, faq,
// contatti, cta-whatsapp, recensioni), quindi la STESSA stringa serve da id di sequenza
// (`data-block-id`) e da tipo per il CSS — site.css distingue l'hero via
// `.site-section[data-block-kind="hero"]`.
//
// I colori arrivano SOLO da `var(--site-...)` (in site.css e nei figli), impostate alla radice del
// render da `siteThemeStyle`: nessun valore letterale, come pretende AC-231-4 su tutta la directory.

import type { ReactNode } from 'react';
import type { ImageSlot } from '@/domain/generation/document';
import { SiteImage } from '@/ui/site/SiteImage';

type SiteSectionProps = {
  readonly blockId: string;
  readonly label: string;
  readonly images: readonly ImageSlot[];
  readonly children: ReactNode;
};

export function SiteSection({ blockId, label, images, children }: SiteSectionProps) {
  return (
    <section
      aria-label={label}
      data-block-id={blockId}
      data-block-kind={blockId}
      className="site-section"
    >
      {images.map((image, index) => (
        <SiteImage key={index} image={image} />
      ))}
      {children}
    </section>
  );
}

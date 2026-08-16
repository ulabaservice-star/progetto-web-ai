// DV2-402 (macrotask body-sections, design-engine-v2) — I PRIMITIVI CONDIVISI dei blocchi di CORPO v2
// (chi-siamo, recensioni, faq — e, in body-sections-b, orari, contatti). Come primitives.tsx per
// foundation, ma specifici del corpo: il CONTAINER centrato dentro la sezione edge-to-edge, l'OCCHIELLO
// maiuscoletto, e la FOTO M5 — l'UNICA sede della logica `uploaded → assetPublicUrl` per il corpo (un
// solo URL builder, come SiteImage/HeroPhoto). Regole del layer: colori SOLO da var(--site-color-*),
// nessun letterale; il testo passa da React (escaping), niente HTML grezzo; le foto sono la foto
// CARICATA o il PhotoPlaceholder di catalogo (DS-V2-D3) — mai una risorsa esterna.

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { PhotoPlaceholder } from '@/ui/site/primitives';
import { assetPublicUrl } from '@/config/storage';
import type { ImageSlot } from '@/domain/generation/document';

/** Padding verticale di una banda di sezione del corpo (il `--sect-y` di Claude Design). */
export const BODY_SECTION_PAD_Y = 'clamp(56px, 8vw, 104px)';

/** Un'ombra soffusa: non esiste un token ombra, quindi color-mix sul fondo scuro del tema (nessun letterale). */
export const BODY_CARD_SHADOW =
  '0 18px 50px color-mix(in srgb, var(--site-color-surface-dark) 12%, transparent)';

const CONTAINER_STYLE: CSSProperties = {
  width: 'min(72rem, 100%)',
  marginInline: 'auto',
  paddingInline: 'clamp(20px, 5vw, 64px)',
};

/** La colonna di lettura centrata dentro la sezione edge-to-edge (il contenuto non va a piena larghezza). */
export function BodyContainer({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}): ReactElement {
  return <div style={{ ...CONTAINER_STYLE, ...style }}>{children}</div>;
}

/** L'occhiello maiuscoletto spaziato del DNA editoriale. `label` è etichetta di catalogo, mai testo del brief. */
export function BodyEyebrow({
  label,
  onDark,
  style,
}: {
  label: string;
  onDark?: boolean;
  style?: CSSProperties;
}): ReactElement {
  return (
    <div
      style={{
        font: '600 var(--site-scale-sm)/1.2 var(--site-font-body)',
        letterSpacing: 'var(--site-tracking-label)',
        textTransform: 'uppercase',
        color: onDark ? 'var(--site-color-eyebrow-on-dark)' : 'var(--site-color-eyebrow-color)',
        ...style,
      }}
    >
      {label}
    </div>
  );
}

/**
 * LA FOTO M5 del corpo: la foto CARICATA (`images[index].source === 'uploaded'` → `<img
 * src={assetPublicUrl(asset_id)}>`, object-fit cover, decorativa) oppure il `PhotoPlaceholder` di
 * catalogo. È l'UNICA sede della logica uploaded del corpo — un solo URL builder (`assetPublicUrl`),
 * come SiteImage/HeroPhoto — così sostituire block.images con un placeholder-only non rompe P4-M5.
 * `src` di un uploaded nasce SEMPRE da `assetPublicUrl(asset_id)` (P2-D12), MAI da testo del documento;
 * `label` è etichetta di catalogo (mai testo del brief).
 */
export function BodyPhoto({
  images,
  index,
  label,
  dark,
  ratio,
  radius,
  style,
  background,
}: {
  images: readonly ImageSlot[];
  index: number;
  label: string;
  dark?: boolean;
  ratio?: string;
  radius?: string;
  style?: CSSProperties;
  background?: boolean;
}): ReactElement {
  const slot = images[index];
  if (slot && slot.source === 'uploaded') {
    return (
      <img
        className="site-body-v2__photo"
        data-image-asset={slot.asset_id}
        src={assetPublicUrl(slot.asset_id)}
        alt=""
        aria-hidden="true"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: radius ?? 'var(--site-radius-md)',
          ...(ratio ? { aspectRatio: ratio } : null),
          ...style,
        }}
      />
    );
  }
  return (
    <PhotoPlaceholder label={label} dark={dark} ratio={ratio} radius={radius} style={style} background={background} />
  );
}

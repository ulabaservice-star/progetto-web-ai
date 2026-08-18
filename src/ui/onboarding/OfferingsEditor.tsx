'use client';

import { useTranslations } from 'next-intl';
import { Button, Input, Label } from '@/ui/primitives';
import { emptyBrief, type Brief } from '@/domain/onboarding/brief';
import { resolveOfferings } from '@/domain/generation/blocks';

// OGW-202 (macrotask offerings-editor) — editor GENERICO e settore-agnostico delle
// offerte (menu / corsi / servizi / catalogo / elenco). Rende ogni voce come campi
// EDITABILI (nome, gruppo, prezzo, descrizione) con aggiungi/rimuovi, e chiama
// `onChange` con l'array aggiornato ad ogni azione. Livello UI: nessuna validazione
// autoritativa (resta server-side, BriefUpdateSchema/OfferingSchema, invariati).
//
// Sicurezza (T-151, invariante del pannello): le voci sono INPUT NON FIDATO — possono
// arrivare da una pagina ostile via fromUrl o da un suggerimento AI. Ogni valore finisce
// SOLO in un `value` di <input> (reso da React come testo, mai parsato) o in un nodo di
// testo localizzato: nessun dangerouslySetInnerHTML, nessun valore della voce in href/src.
//
// SETTORE-AGNOSTICO (OGW-D3): il `vertical` decide SOLO l'etichetta di sezione e se il
// prezzo comparira' sul sito. Entrambe derivano da `resolveOfferings` (P2), la stessa
// sorgente del sito generato — cosi' editor e sito non possono divergere. Nessun ramo
// per-settore, solo dati.

type Offerings = Brief['content']['offerings'];

type OfferingsEditorProps = {
  vertical: Brief['vertical'];
  // Voci correnti (controllato dal contenitore: BriefPanel). L'editor non tiene stato.
  offerings: Offerings;
  // Ogni add/edit/remove emette l'array aggiornato; il contenitore lo spedira' nella patch.
  onChange: (offerings: Offerings) => void;
};

// I campi editabili di una voce, nell'ordine di rendering. `photo_ref` NON e' esposto:
// le foto sono un altro workstream (roadmap), e il suo unico effetto qui sarebbe un
// campo che l'utente non sa riempire.
const FIELDS = ['name', 'section', 'price', 'description'] as const;

export function OfferingsEditor({ vertical, offerings, onChange }: OfferingsEditorProps) {
  const t = useTranslations('onboarding.offerings');
  // Root: l'etichetta di sezione vive nel catalogo del SITO (`site.offerings.*`), la
  // stessa chiave che `resolveOfferings` restituisce — nessuna stringa duplicata.
  const tRoot = useTranslations();

  // Solo la VARIANTE del vertical serve (label_key + show_price): un brief minimale del
  // vertical la risolve senza trascinare voci (le `items` risultano vuote e si ignorano).
  const variant = resolveOfferings({ ...emptyBrief('it'), vertical });
  const sectionLabel = tRoot(variant.label_key);
  const showPrice = variant.show_price;

  const setField = (index: number, field: (typeof FIELDS)[number], value: string) =>
    onChange(offerings.map((offering, i) => (i === index ? { ...offering, [field]: value } : offering)));
  const addRow = () => onChange([...offerings, { name: '' }]);
  const removeAt = (index: number) => onChange(offerings.filter((_offering, i) => i !== index));

  return (
    <fieldset className="flex flex-col gap-sm border-0 p-0">
      <legend className="text-sm font-medium text-foreground">{sectionLabel}</legend>

      {/* Il prezzo puo' essere inserito comunque, ma per alcuni settori (salone/studio)
          il sito NON lo mostra: l'hint lo rende esplicito qui, dove si digita. */}
      {!showPrice && <p className="text-sm text-muted-foreground">{t('priceHiddenHint')}</p>}

      {offerings.map((offering, index) => (
        <div key={index} className="flex flex-col gap-xs rounded-md border border-border p-md">
          {FIELDS.map((field) => (
            <div key={field} className="flex flex-col gap-xs">
              <Label htmlFor={`offering-${index}-${field}`}>{t(field)}</Label>
              <Input
                id={`offering-${index}-${field}`}
                value={offering[field] ?? ''}
                onChange={(event) => setField(index, field, event.target.value)}
              />
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => removeAt(index)}>
            {t('remove')}
          </Button>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addRow}>
        {t('add')}
      </Button>
    </fieldset>
  );
}

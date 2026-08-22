'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/ui/primitives';

// OGW-402 (macrotask suggest-offerings) — il pulsante ✨ "Suggerisci voci tipiche" e la lista
// dei suggerimenti proposti. Ogni voce e' un PLACEHOLDER a prezzo vuoto etichettato "esempio",
// ed entra nell'editor delle offerte SOLO su CONFERMA per-voce (OGW-D2 / P2-D7: anti-invenzione
// strutturale — nessun suggerimento auto-inserito nel brief). Componente CONTROLLATO/isolato
// come GenerateDescriptionField: non conosce la rotta ne' tiene stato autoritativo del brief.
//
// LA CHIAMATA E' INIETTATA (`onSuggest`): il componente non importa fetch ne' l'endpoint, e
// resta provabile senza rete. L'integrazione nel flusso (cablare onSuggest al POST
// /api/onboarding/[siteId]/suggest-offerings, e onAccept all'aggiornamento delle offerte del
// brief accanto a OfferingsEditor) e' demandata a wizard-shell (OGW-502) — stesso confine di
// scope di GenerateDescriptionField, per non riscrivere due volte il wiring del pannello.
//
// SICUREZZA (T-151): il nome/sezione del suggerimento e' output del modello / input NON FIDATO.
// Finisce SOLO in nodi di testo (React li rende come testo, mai parsati): nessun
// dangerouslySetInnerHTML, nessun valore in href/src.
//
// CAP (parte UI): quando il budget AI del sito e' esaurito (`atCap`), il pulsante e'
// disabilitato e un messaggio lo dichiara — la difesa autoritativa resta l'endpoint (429).

// Una voce suggerita: solo nome (+ sezione), MAI un prezzo (placeholder a prezzo vuoto). Tipo
// LOCALE (structural typing, non esportato): il chiamante passa/riceve un oggetto conforme —
// nessun consumatore esterno oggi, quindi niente export speculativo. wizard-shell (OGW-502)
// cablera' onSuggest/onAccept senza importarlo.
type SuggestedOffering = { readonly name: string; readonly section?: string };

// L'esito della suggerimento iniettato: le voci proposte, oppure un fallimento.
type SuggestOfferingsOutcome =
  | { readonly ok: true; readonly offerings: ReadonlyArray<SuggestedOffering> }
  | { readonly ok: false };

type OfferingSuggestionsProps = {
  // Chiede i suggerimenti (iniettata: chiama l'endpoint). Il componente non conosce la rotta.
  onSuggest: () => Promise<SuggestOfferingsOutcome>;
  // Conferma ESPLICITA di UNA voce: la aggiunge alle offerte. Il contenitore (wizard-shell) la
  // traduce nell'aggiornamento del brief. NON e' chiamata dalla proposta.
  onAccept: (offering: SuggestedOffering) => void;
  // Budget AI esaurito: disabilita il pulsante e mostra il messaggio.
  atCap?: boolean;
};

export function OfferingSuggestions({ onSuggest, onAccept, atCap = false }: OfferingSuggestionsProps) {
  const t = useTranslations('onboarding.suggestOfferings');
  // I suggerimenti PENDENTI vivono nel componente: compaiono con la suggerimento, escono verso
  // il brief solo con `onAccept`, o spariscono con lo scarto. Cosi' AC-402-3 e' strutturale —
  // non esiste un percorso che inserisca una voce senza il clic di conferma.
  const [pending, setPending] = useState<SuggestedOffering[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const suggest = async () => {
    setBusy(true);
    setFailed(false);
    const outcome = await onSuggest();
    setBusy(false);
    if (outcome.ok) setPending([...outcome.offerings]);
    else setFailed(true);
  };

  const removeAt = (index: number) => setPending(pending.filter((_offering, i) => i !== index));
  // Conferma: la voce esce verso il brief E lascia i pendenti (le altre restano da decidere).
  const accept = (index: number) => {
    onAccept(pending[index]);
    removeAt(index);
  };

  return (
    <div className="flex flex-col gap-sm">
      <Button type="button" onClick={suggest} disabled={atCap || busy}>
        {t('button')}
      </Button>

      {atCap && <p className="text-sm text-muted-foreground">{t('capReached')}</p>}
      {failed && <p className="text-sm text-destructive">{t('error')}</p>}

      {pending.length > 0 && (
        <ul className="flex list-none flex-col gap-xs p-0">
          {pending.map((offering, index) => (
            <li key={index} className="flex flex-col gap-xs rounded-md border border-border p-md">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('exampleBadge')}
              </span>
              <span className="text-sm font-medium text-foreground">{offering.name}</span>
              {offering.section && <span className="text-sm text-muted-foreground">{offering.section}</span>}
              <div className="flex gap-sm">
                <Button type="button" onClick={() => accept(index)}>
                  {t('add')}
                </Button>
                <Button type="button" variant="secondary" onClick={() => removeAt(index)}>
                  {t('discard')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

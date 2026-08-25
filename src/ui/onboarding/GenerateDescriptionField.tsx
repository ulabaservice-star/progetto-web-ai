'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Label, Textarea } from '@/ui/primitives';
import { AiFieldStatus } from '@/ui/onboarding/AiFieldStatus';

// OGW-302 (macrotask generate-description) — il campo ✨ dello step Racconto: espande una
// frase dell'utente in una descrizione (copy) tramite l'AI, la PROPONE in un campo
// EDITABILE, e la salva nel brief SOLO su conferma esplicita (OGW-D2 / P2-D7:
// anti-invenzione strutturale — l'output AI e' un suggerimento, mai auto-scritto). Componente
// CONTROLLATO/isolato come OfferingsEditor: non conosce la rotta ne' tiene stato autoritativo.
//
// LA CHIAMATA E' INIETTATA (`onGenerate`): il componente non importa fetch ne' l'endpoint, e
// resta provabile senza rete. L'integrazione nel flusso (cablare onGenerate al POST
// /api/onboarding/[siteId]/generate-description, e onConfirm alla patch del brief) e'
// demandata a wizard-shell (OGW-501), che riorganizza OnboardingWorkspace — stesso confine di
// scope di OfferingsEditor (§2), per non riscrivere due volte il wiring del pannello.
//
// SICUREZZA (T-151): la descrizione e' output del modello / input NON FIDATO. Finisce SOLO nel
// `value` di una <textarea> (React la rende come testo, mai parsata): nessun
// dangerouslySetInnerHTML, nessun valore in href/src.
//
// CAP (AC-302-3, lato UI): quando il budget AI del sito e' esaurito (`atCap`), il pulsante di
// generazione e' disabilitato e un messaggio lo dichiara — la difesa autoritativa resta
// l'endpoint (429), questa e' la sua resa ergonomica.

// L'esito della generazione iniettata: la descrizione proposta, oppure un fallimento. Tipo
// LOCALE (non esportato): il chiamante passa un oggetto strutturalmente conforme (structural
// typing) — nessun consumatore esterno oggi, quindi niente export speculativo. wizard-shell
// (OGW-501) cablera' onGenerate al POST senza bisogno di importarlo.
type GenerateDescriptionOutcome =
  | { readonly ok: true; readonly description: string }
  | { readonly ok: false };

type GenerateDescriptionFieldProps = {
  // Descrizione corrente del brief (il punto di partenza del campo editabile).
  value: string;
  // Conferma ESPLICITA: salva la descrizione corrente del campo nel brief. Il contenitore
  // (wizard-shell) la traduce in una patch. NON e' chiamata dalla generazione.
  onConfirm: (description: string) => void;
  // Genera la descrizione (iniettata: chiama l'endpoint). Il componente non conosce la rotta.
  // OGW-502: riceve la FRASE corrente del campo (il testo da espandere): l'endpoint la vuole nel
  // body (`phrase`), e senza passarla girerebbe su un input vuoto. Il testo e' input dell'utente.
  onGenerate: (phrase: string) => Promise<GenerateDescriptionOutcome>;
  // Budget AI esaurito: disabilita la generazione e mostra il messaggio (AC-302-3, lato UI).
  atCap?: boolean;
};

export function GenerateDescriptionField({
  value,
  onConfirm,
  onGenerate,
  atCap = false,
}: GenerateDescriptionFieldProps) {
  const t = useTranslations('onboarding.generateDescription');
  // La proposta EDITABILE vive nel componente: parte dal brief, cambia con la generazione o
  // con la mano dell'utente, ed entra nel brief solo con `onConfirm`. Cosi' AC-302-4 e'
  // strutturale — non esiste un percorso che salvi senza il clic di conferma.
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const generate = async () => {
    setBusy(true);
    setFailed(false);
    // La frase da espandere e' il testo CORRENTE del campo (trimmato): e' cio' che l'utente ha
    // scritto come spunto. L'esito la sostituisce con la descrizione proposta (editabile).
    const outcome = await onGenerate(draft.trim());
    setBusy(false);
    if (outcome.ok) setDraft(outcome.description);
    else setFailed(true);
  };

  // "Rigenera" se c'e' gia' del testo, "Genera" se il campo e' vuoto: la stessa azione, con
  // l'etichetta che riflette lo stato (come add/edit in OfferingsEditor sono lo stesso onChange).
  const generateLabel = draft.trim().length > 0 ? t('regenerate') : t('generate');

  return (
    <div className="flex flex-col gap-sm">
      <Label htmlFor="generate-description-field">{t('label')}</Label>
      <Textarea
        id="generate-description-field"
        rows={4}
        value={draft}
        placeholder={t('phrasePlaceholder')}
        onChange={(event) => setDraft(event.target.value)}
      />

      <AiFieldStatus atCap={atCap} failed={failed} capMessage={t('capReached')} errorMessage={t('error')} />

      <div className="flex gap-sm">
        <Button type="button" variant="secondary" onClick={generate} disabled={atCap || busy}>
          {generateLabel}
        </Button>
        <Button type="button" onClick={() => onConfirm(draft)}>
          {t('confirm')}
        </Button>
      </div>
    </div>
  );
}

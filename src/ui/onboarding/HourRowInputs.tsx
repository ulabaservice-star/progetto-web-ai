'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/ui/primitives';

// OGW-502 (macrotask wizard-shell) — la COPPIA di campi di UNA riga orario (giorno + fascia), in
// una sola sede. La rendono identica l'editor degli orari (HoursEditor, step Contatti&orari) e il
// recap (ReviewConfirm): erano due blocchi JSX uguali (il controllo d'igiene li misurava come
// clone). Estratti qui — presentazionale puro, senza stato: chi lo monta passa i valori e gli
// handler (l'editor li fonde in un record, il recap in un diff).
//
// Sicurezza (T-151): valori resi solo in `value`; le etichette dei campi sono POSIZIONALI e
// localizzate (mai il giorno, che e' input non fidato, come etichetta del proprio campo).

type HourRowInputsProps = {
  // Posizione (1-based nell'etichetta): le chiavi orario sono libere/non fidate, quindi
  // l'etichetta e' l'indice, non il giorno.
  index: number;
  dayValue: string;
  hourValue: string;
  onDayChange: (value: string) => void;
  onHourChange: (value: string) => void;
};

export function HourRowInputs({
  index,
  dayValue,
  hourValue,
  onDayChange,
  onHourChange,
}: HourRowInputsProps) {
  const t = useTranslations('onboarding');
  return (
    <>
      <Input
        aria-label={t('panel.hoursDay', { n: String(index + 1) })}
        value={dayValue}
        onChange={(event) => onDayChange(event.target.value)}
        className="max-w-xs"
      />
      <Input
        aria-label={t('panel.hoursValue', { n: String(index + 1) })}
        value={hourValue}
        onChange={(event) => onHourChange(event.target.value)}
        className="max-w-xs"
      />
    </>
  );
}

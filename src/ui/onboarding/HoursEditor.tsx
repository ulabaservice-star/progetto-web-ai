'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/ui/primitives';
import type { Brief } from '@/domain/onboarding/brief';
import { HourRowInputs } from '@/ui/onboarding/HourRowInputs';
import { hoursToRows, rowsToHours, type HourRow } from '@/ui/onboarding/hours';

// OGW-502 (macrotask wizard-shell) — l'editor degli orari dello step Contatti&orari. RICREA il
// widget che viveva in BriefPanel (eliminato in OGW-501): coppie giorno/fascia, con aggiungi e
// rimuovi. Volutamente elementare (P1-D13: gli orari sono una mappa a chiavi libere, non un
// calendario) — nessun widget speculativo.
//
// STATO INTERNO delle righe (come BriefPanel): la vista lavora su una lista `HourRow[]` che puo'
// contenere righe VUOTE in composizione (l'utente sta digitando un nuovo giorno), mentre il brief
// vuole una MAPPA senza chiavi vuote. Un editor puramente controllato perderebbe la riga vuota a
// ogni tasto; quindi le righe vivono qui, e a ogni modifica si emette al contenitore la mappa
// PULITA (rowsToHours scarta le chiavi vuote). Seed una-tantum dal brief: tornando allo step le
// coppie salvate restano, le righe vuote no (limite dichiarato, ereditato da BriefPanel).
//
// Sicurezza (T-151): chiavi/valori sono INPUT NON FIDATO (possono arrivare dal JSON-LD di una
// pagina ostile via fromUrl). Ogni valore finisce SOLO in `value` di <input>; le etichette dei
// campi sono POSIZIONALI e localizzate (mai il giorno come etichetta del proprio campo).

type HoursEditorProps = {
  hours: Brief['hours'];
  // Ogni modifica emette la mappa PULITA; il contenitore la spedira' nella patch (patchCore).
  onChange: (hours: Record<string, string>) => void;
};

export function HoursEditor({ hours, onChange }: HoursEditorProps) {
  const t = useTranslations('onboarding');
  const [rows, setRows] = useState<HourRow[]>(() => hoursToRows(hours));

  const apply = (next: HourRow[]) => {
    setRows(next);
    onChange(rowsToHours(next));
  };
  const setRow = (index: number, patch: Partial<HourRow>) =>
    apply(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const addRow = () => apply([...rows, { key: '', value: '' }]);
  const removeAt = (index: number) => apply(rows.filter((_row, i) => i !== index));

  return (
    <fieldset className="flex flex-col gap-sm border-0 p-0">
      <legend className="text-sm font-medium text-foreground">{t('fields.hours')}</legend>

      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-sm">
          <HourRowInputs
            index={index}
            dayValue={row.key}
            hourValue={row.value}
            onDayChange={(value) => setRow(index, { key: value })}
            onHourChange={(value) => setRow(index, { value })}
          />
          <Button type="button" variant="secondary" onClick={() => removeAt(index)}>
            {t('panel.hoursRemove')}
          </Button>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addRow}>
        {t('panel.hoursAdd')}
      </Button>
    </fieldset>
  );
}

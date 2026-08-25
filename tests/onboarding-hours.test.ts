import { describe, it, expect } from 'vitest';
import { rowsToHours, hoursToRows, sameHours, type HourRow } from '@/ui/onboarding/hours';

// OGW-502 (macrotask wizard-shell) — la logica PURA degli orari, condivisa da HoursEditor e
// ReviewConfirm. Non e' il target_test di un AC del blueprint (gli AC-502 sono d'integrazione):
// e' la rete dell'unita' che regge il persist-on-Advance e il recap.

describe('hours (puro)', () => {
  it('rowsToHours scarta le righe con chiave vuota e normalizza la chiave (trim)', () => {
    const rows: HourRow[] = [
      { key: ' lun ', value: '9-18' },
      { key: '', value: 'orfano' },
      { key: '   ', value: 'solo spazi' },
      { key: 'mar', value: '' },
    ];
    expect(rowsToHours(rows)).toEqual({ lun: '9-18', mar: '' });
  });

  it('hoursToRows converte la mappa in righe e regge un brief senza orari', () => {
    expect(hoursToRows({ lun: '9-18' })).toEqual([{ key: 'lun', value: '9-18' }]);
    expect(hoursToRows(undefined)).toEqual([]);
  });

  it('rowsToHours e hoursToRows sono inverse sui dati puliti', () => {
    const hours = { lun: '9-18', mar: 'chiuso' };
    expect(rowsToHours(hoursToRows(hours))).toEqual(hours);
  });

  it('sameHours confronta per valore, non per riferimento', () => {
    expect(sameHours({ lun: '9-18' }, { lun: '9-18' })).toBe(true);
    expect(sameHours({ lun: '9-18' }, { lun: '9-19' })).toBe(false);
    expect(sameHours({ lun: '9-18' }, { lun: '9-18', mar: 'x' })).toBe(false);
    expect(sameHours({}, {})).toBe(true);
  });
});

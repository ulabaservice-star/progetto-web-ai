import { describe, it, expect } from 'vitest';
import { emptyBrief, type Brief } from '@/domain/onboarding/brief';
import { briefDiff } from '@/ui/onboarding/wizard/brief-diff';

// OGW-502 (macrotask wizard-shell) — la rete del persist-on-Advance: il diff che decide cosa
// spedire a upsertBrief a ogni «Avanti». Unita' di supporto (regge AC-502-3 «brief salvato»), non
// il target_test di un AC.

function briefWith(patch: Partial<Brief>): Brief {
  return { ...emptyBrief('it'), ...patch };
}

describe('briefDiff (puro)', () => {
  it('due brief uguali producono una patch vuota', () => {
    const b = briefWith({ business_name: 'Bar Sole', vertical: 'ristorazione' });
    expect(briefDiff(b, b)).toEqual({});
  });

  it('spedisce i campi core cambiati (nome, tipo, obiettivo)', () => {
    const persisted = emptyBrief('it');
    const draft = briefWith({
      business_name: 'Bar Sole',
      vertical: 'ristorazione',
      primary_goal: 'prenota',
    });
    expect(briefDiff(persisted, draft)).toEqual({
      business_name: 'Bar Sole',
      vertical: 'ristorazione',
      primary_goal: 'prenota',
    });
  });

  it('NON spedisce una stringa core svuotata (additivo: evita il 400 di business_name.min(1))', () => {
    const persisted = briefWith({ business_name: 'Bar Sole' });
    const draft = briefWith({ business_name: '' });
    expect(briefDiff(persisted, draft).business_name).toBeUndefined();
  });

  it('spedisce la descrizione (lo step Racconto) quando cambia', () => {
    const persisted = briefWith({ vertical: 'ristorazione' });
    const draft = briefWith({ vertical: 'ristorazione', description: 'Trattoria dal 1980.' });
    expect(briefDiff(persisted, draft)).toEqual({ description: 'Trattoria dal 1980.' });
  });

  it('spedisce le offerte quando cambiano (lo step Offerte)', () => {
    const persisted = emptyBrief('it');
    const draft = briefWith({
      content: { offerings: [{ name: 'Carbonara' }], social_links: [], highlights: [] },
    });
    expect(briefDiff(persisted, draft).offerings).toEqual([{ name: 'Carbonara' }]);
  });

  it('NON spedisce le offerte quando sono identiche per valore', () => {
    const offerings = [{ name: 'Carbonara', price: '12' }];
    const persisted = briefWith({ content: { offerings, social_links: [], highlights: [] } });
    const draft = briefWith({
      content: { offerings: [{ name: 'Carbonara', price: '12' }], social_links: [], highlights: [] },
    });
    expect(briefDiff(persisted, draft).offerings).toBeUndefined();
  });

  it('spedisce gli orari quando cambiano e li omette quando no', () => {
    const persisted = briefWith({ hours: { lun: '9-18' } });
    const changed = briefWith({ hours: { lun: '9-20' } });
    const same = briefWith({ hours: { lun: '9-18' } });
    expect(briefDiff(persisted, changed).hours).toEqual({ lun: '9-20' });
    expect(briefDiff(persisted, same).hours).toBeUndefined();
  });

  it('spedisce geo solo se presente e cambiato', () => {
    const persisted = emptyBrief('it');
    const draft = briefWith({ geo: { lat: 41.9, lng: 12.5 } });
    expect(briefDiff(persisted, draft).geo).toEqual({ lat: 41.9, lng: 12.5 });
    expect(briefDiff(draft, draft).geo).toBeUndefined();
  });
});

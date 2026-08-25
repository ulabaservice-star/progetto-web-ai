import type { Brief } from '@/domain/onboarding/brief';

// OGW-502 (macrotask wizard-shell) — la logica PURA degli orari, in UNA sola sede. Gli orari
// del brief sono una mappa a chiavi libere (P1-D13: giorno -> fascia), ma una UISono coppie
// ORDINATE e con righe vuote in composizione, quindi la vista lavora su una lista `HourRow[]`
// e questa converte fra le due forme.
//
// PERCHE' vive qui e non dentro un componente: `HoursEditor` (lo step Contatti&orari) e
// `ReviewConfirm` (il recap) fanno la STESSA conversione riga<->mappa e lo STESSO confronto per
// valore. Erano due copie (il controllo d'igiene del checkpoint le misurava come duplicazione):
// estratte qui, ACCANTO a brief-fields.ts, con cui condividono lo stesso principio — cio' che
// piu' schermate del brief devono fare identico sta in un modulo, non ricopiato.
//
// Sicurezza (T-151, invariata): le chiavi/valori orario sono INPUT NON FIDATO (possono arrivare
// dal JSON-LD di una pagina ostile via fromUrl). Qui sono solo dati: nessun rendering, nessun
// href. Le righe con la CHIAVE vuota si scartano (una chiave '' non e' un giorno e passerebbe
// BriefUpdateSchema senza che nessuno se ne accorga — stessa regola di casa dei campi svuotati).

export type HourRow = { key: string; value: string };

// Le righe (vista) -> la mappa da spedire nella patch. Scarta le righe con chiave vuota (trim)
// e normalizza la chiave (trim); il valore resta com'e' (uno spazio nel valore e' lecito).
export function rowsToHours(rows: readonly HourRow[]): Record<string, string> {
  return Object.fromEntries(
    rows.filter((row) => row.key.trim().length > 0).map((row) => [row.key.trim(), row.value]),
  );
}

// La mappa del brief -> le righe della vista, nell'ordine di iterazione della mappa.
export function hoursToRows(hours: Brief['hours']): HourRow[] {
  return Object.entries(hours ?? {}).map(([key, value]) => ({ key, value }));
}

// Confronto PER VALORE di due mappe di orari: serve a non spedire `hours` quando non e'
// cambiato (evita di toccare updated_at e di ri-scrivere lo stesso stato).
export function sameHours(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  return (
    keysA.length === Object.keys(b).length &&
    keysA.every((key) => Object.hasOwn(b, key) && a[key] === b[key])
  );
}

// DV2-403 (macrotask body-sections-b, design-engine-v2) — IL MATCH DEL GIORNO CORRENTE, funzione PURA.
//
// Il giorno-di-oggi negli orari e' un effetto CLIENT dell'isola (OrariToday), FUORI dal documento
// congelato (AC-DV2-403-2): il server-render resta byte-identico a parita' di seed. Questa e' la sola
// logica di quella evidenza, estratta qui come funzione pura cosi' e' oracolabile senza un orologio —
// il test le passa un weekday FISSO e verifica quale chiave marca. L'isola le passa il weekday
// localizzato dal `new Date()` del BROWSER (l'unico posto in cui l'orologio e' lecito).
//
// Il match e' BEST-EFFORT: le chiavi di `data.hours` sono etichette LIBERE del brief ('Lunedì',
// 'lun-ven', 'lunes', 'Lun–Ven') e non un enum. Si normalizza (minuscole, senza accenti) e si prova
// l'inclusione piena e per RADICE di 3 lettere (il gambo del nome del giorno, es. 'lun'), che copre sia
// 'lunedì' sia gli intervalli 'lun-ven'. Se nessuna chiave combacia, NIENTE e' marcato (nessun falso
// oggi): meglio non evidenziare che evidenziare il giorno sbagliato.

/** Minuscole, senza segni diacritici: 'Lunedì' -> 'lunedi', cosi' il confronto non dipende dagli accenti. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

/**
 * La chiave di `data.hours` che corrisponde al giorno di oggi, o `null` se nessuna combacia.
 *
 * @param keys le chiavi del record orari, nell'ordine del documento (la PRIMA che combacia vince).
 * @param weekday il nome del giorno corrente gia' localizzato (es. 'lunedì', 'lunes', 'monday').
 * @returns la chiave ORIGINALE (non normalizzata) da marcare, o `null`.
 */
export function matchTodayKey(keys: readonly string[], weekday: string): string | null {
  const w = normalize(weekday);
  if (w.length === 0) return null;
  // La RADICE del nome del giorno (le prime 3 lettere), che intercetta anche gli intervalli 'lun-ven'.
  const stem = w.slice(0, 3);
  for (const key of keys) {
    const k = normalize(key);
    if (k.length === 0) continue;
    // Inclusione piena in un verso o nell'altro ('lunedi' ~ 'lunedi'), o per radice ('lun' dentro
    // 'lun-ven'): la prima chiave che combacia vince (ordine del documento).
    if (k.includes(w) || w.includes(k) || k.includes(stem)) return key;
  }
  return null;
}

'use client';

// DV2-403 (macrotask body-sections-b, design-engine-v2) — L'ISOLA DEL GIORNO CORRENTE degli orari.
//
// PERCHE' UN'ISOLA CLIENT (AC-DV2-403-2): l'evidenza del giorno di oggi dipende dall'OROLOGIO, che sul
// server renderebbe il documento NON deterministico (due render dello stesso seed divergerebbero) e lo
// legherebbe al fuso del server. Sta percio' FUORI dal documento congelato: il server-render non porta
// alcun marcatore di oggi (lo prova il test con renderToStaticMarkup), e questa isola — che gira SOLO nel
// browser, in `useEffect` dopo il mount — marca a posteriori la riga del giorno. Nessun mismatch di
// idratazione: sia sul server sia al primo render client questo componente e' lo stesso <span> nascosto;
// la marcatura e' una mutazione del DOM POST-mount, non parte del render.
//
// COME SiteMotion (DE-302): un'isola che marca elementi gia' resi dal server, mai una seconda copia del
// blocco. Trova le righe per `data-hours-key` dentro la propria sezione e delega il match alla funzione
// PURA `matchTodayKey` (oracolabile senza orologio). L'orologio (`new Date()`) e' qui e SOLO qui.

import { useEffect, useRef } from 'react';
import { matchTodayKey } from '@/ui/site/blocks/hours-today';

export function OrariToday({ locale }: { locale: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const anchor = ref.current;
    if (anchor === null) return;
    // La sezione orari e' l'antenato che porta data-block-kind="orari"; fallback al genitore diretto.
    const section = anchor.closest('[data-block-kind="orari"]') ?? anchor.parentElement;
    if (section === null) return;
    const rows = Array.from(section.querySelectorAll<HTMLElement>('[data-hours-key]'));
    if (rows.length === 0) return;

    const keys = rows.map((row) => row.getAttribute('data-hours-key') ?? '');
    let weekday = '';
    try {
      // L'UNICO uso dell'orologio: il nome del giorno di oggi nella lingua del sito (client-only).
      weekday = new Date().toLocaleDateString(locale, { weekday: 'long' });
    } catch {
      weekday = new Date().toLocaleDateString(undefined, { weekday: 'long' });
    }

    const todayKey = matchTodayKey(keys, weekday);
    if (todayKey === null) return;

    const marked: HTMLElement[] = [];
    for (const row of rows) {
      if (row.getAttribute('data-hours-key') === todayKey) {
        row.setAttribute('data-today', 'true');
        row.setAttribute('aria-current', 'date');
        marked.push(row);
      }
    }

    // Cleanup: togli i marcatori se il locale cambia o l'isola si smonta (nessuno stato residuo).
    return () => {
      for (const row of marked) {
        row.removeAttribute('data-today');
        row.removeAttribute('aria-current');
      }
    };
  }, [locale]);

  return <span ref={ref} hidden aria-hidden="true" data-hours-today-island="" />;
}

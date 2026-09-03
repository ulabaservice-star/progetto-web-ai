import 'server-only';
import { createAdminClient } from '@/data/supabase-admin';

// PUB-211 (macrotask waitlist-store, p6a-public-surface) — il WRITER applicativo dei lead
// della waitlist pubblica. E' l'UNICO percorso che scrive public.waitlist_leads (PUB-201):
// la tabella ha RLS abilitata + ZERO policy (deny-all deliberato, P6A-D5) e GRANT SOLO a
// service_role, quindi il client (anon/authenticated) non puo' MAI inserire. La scrittura
// passa esclusivamente da service_role (createAdminClient), che BYPASSA la RLS ed e' confinato
// server-side (`import 'server-only'` fa fallire il build se questo modulo entra in un bundle
// client — R7 / A01:2025). Nessun IP, nessun double opt-in: si scrive solo email/normalized_email/
// locale/source (P6A-D7).
//
// Lo STORE e' una porta iniettabile (gemella di SiteDomainWriteStore, DOM-222): il default parla
// col DB via service_role; i test iniettano uno store in-memory e inchiodano la logica del writer
// (normalizzazione dell'email + mappatura idempotente della unique-violation) senza rete ne'
// chiave reale.

const TABLE = 'waitlist_leads';

// PUB-201: le due locali della superficie pubblica (IT + ES da subito, P6A-D10). Il CHECK di
// waitlist_leads ammette solo questi valori.
export type WaitlistLocale = 'it' | 'es';

/** L'input applicativo di un'iscrizione: email grezza (come inserita), locale, provenienza. */
export type WaitlistLeadInput = {
  email: string;
  locale: WaitlistLocale;
  source?: string | null;
};

/** La riga scritta in waitlist_leads: email trimmata (case preservato) + forma canonica per
 *  l'idempotenza (normalized_email = email.trim().toLowerCase(), l'ancora dell'UNIQUE PUB-201). */
export type WaitlistLeadRow = {
  email: string;
  normalized_email: string;
  locale: WaitlistLocale;
  source: string | null;
};

/** Esito idempotente dell'iscrizione: 'inserted' = nuovo lead scritto; 'already' = email canonica
 *  gia' presente (la unique-violation 23505 e' assorbita, non e' un errore). */
export type InsertLeadResult = { status: 'inserted' | 'already' };

/** Porta di persistenza: insert di un lead via service_role. Solleva su errore, preservando il
 *  `code` Postgres (23505 = unique_violation), che insertLead mappa a 'already'. */
export type WaitlistStore = {
  insert(row: WaitlistLeadRow): Promise<void>;
};

/** Store reale su service_role (createAdminClient): confinato server-side, mai nel browser. */
function adminStore(): WaitlistStore {
  const admin = createAdminClient();
  return {
    async insert(row) {
      const { error } = await admin.from(TABLE).insert(row);
      // Rilancia PRESERVANDO il code Postgres: la unique-violation 23505 (UNIQUE normalized_email)
      // e' il segnale che insertLead intercetta per l'idempotenza. Un `new Error(message)` grezzo
      // lo perderebbe -> Object.assign porta il code oltre il confine dello store.
      if (error) {
        throw Object.assign(new Error(`waitlist_leads insert fallito: ${error.message}`), {
          code: error.code,
        });
      }
    },
  };
}

/** True se l'errore porta il code Postgres 23505 (unique_violation): iscrizione gia' presente. */
function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === '23505';
}

/**
 * Iscrive un lead alla waitlist. Normalizza l'email (trim + lowercase in normalized_email,
 * preservando `email` come inserita al netto del trim) e la scrive via service_role confinato
 * (store di default), mai dal client. Un secondo invio della stessa email canonica solleva 23505
 * sulla UNIQUE(normalized_email) di PUB-201: insertLead lo INTERCETTA e ritorna { status: 'already' }
 * (idempotente), senza propagare; un'iscrizione nuova ritorna { status: 'inserted' }.
 */
export async function insertLead(
  input: WaitlistLeadInput,
  store: WaitlistStore = adminStore(),
): Promise<InsertLeadResult> {
  const email = input.email.trim();
  const normalized_email = email.toLowerCase();
  const row: WaitlistLeadRow = {
    email,
    normalized_email,
    locale: input.locale,
    source: input.source ?? null,
  };
  try {
    await store.insert(row);
    return { status: 'inserted' };
  } catch (err) {
    if (isUniqueViolation(err)) return { status: 'already' };
    throw err;
  }
}

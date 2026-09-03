import { describe, it, expect, vi } from 'vitest';
import { insertLead, type WaitlistStore, type WaitlistLeadRow } from '@/data/waitlist';

// PUB-211 (macrotask waitlist-store, p6a-public-surface) — writer dei lead della waitlist,
// con service_role CONFINATO (fuori dal percorso utente) e store INIETTABILE. Le asserzioni
// derivano dagli acceptance_criteria AC-211-1..3 (07-waitlist-store.md).
//
// Come DOM-222 (site-domains-writer) e BIL-202 (applySubscriptionEvent): lo STORE e' una porta
// iniettabile; qui iniettiamo uno store IN-MEMORY / una spy e inchiodiamo la logica del writer
// (normalizzazione dell'email trim+lowercase; mappatura idempotente della unique-violation 23505
// -> 'already'; iniettabilita' provata dallo store spy) SENZA rete ne' chiave reale. Il default
// store (service_role via createAdminClient) resta inerte: i test iniettano sempre uno store,
// quindi createAdminClient (che esige env) non viene mai invocato.

/** Store fake che cattura l'ultima riga scritta e conta le insert. Non tocca il DB. */
function memoryStore() {
  const rows: WaitlistLeadRow[] = [];
  const store: WaitlistStore = {
    async insert(row) {
      rows.push({ ...row });
    },
  };
  return { store, rows, last: () => rows[rows.length - 1] };
}

/** Errore Postgres come lo solleva lo store reale: porta il `code` oltre il confine. */
function pgError(code: string): Error & { code: string } {
  return Object.assign(new Error(`pg error ${code}`), { code });
}

describe('PUB-211 insertLead — normalizzazione email (store iniettato)', () => {
  it('email con spazi e maiuscole: normalized_email = trim+lowercase, email = solo trim; ritorna inserted', async () => {
    const m = memoryStore();

    const result = await insertLead(
      { email: '  Mario@Bar.IT ', locale: 'it', source: 'hero' },
      m.store,
    );

    expect(result).toEqual({ status: 'inserted' }); // covers: AC-211-1 — nuovo lead scritto
    const row = m.last();
    expect(row.normalized_email).toBe('mario@bar.it'); // covers: AC-211-1 — trim + lowercase (KILL: rimozione toLowerCase)
    expect(row.email).toBe('Mario@Bar.IT'); // covers: AC-211-1 — email trimmata, case PRESERVATO
    expect(row.locale).toBe('it'); // covers: AC-211-1
    expect(row.source).toBe('hero'); // covers: AC-211-1
  });

  it('source assente -> null (colonna nullable PUB-201)', async () => {
    const m = memoryStore();
    const result = await insertLead({ email: 'a@b.co', locale: 'es' }, m.store);
    expect(result).toEqual({ status: 'inserted' }); // covers: AC-211-1
    expect(m.last().source).toBeNull(); // covers: AC-211-1 — source opzionale mappato a null
  });
});

describe('PUB-211 insertLead — idempotenza sulla unique-violation 23505 (store iniettato)', () => {
  it('lo store solleva 23505 (UNIQUE normalized_email) -> ritorna already SENZA propagare', async () => {
    const store: WaitlistStore = {
      async insert() {
        throw pgError('23505'); // duplicato: email canonica gia' iscritta
      },
    };

    const result = await insertLead({ email: 'mario@bar.it', locale: 'it', source: 'hero' }, store);

    expect(result).toEqual({ status: 'already' }); // covers: AC-211-2 — 23505 assorbita, mai un throw (KILL: rilancio invece di mappare)
  });

  it('un errore NON-23505 (es. 42501/500) si propaga: non e\' idempotenza', async () => {
    const store: WaitlistStore = {
      async insert() {
        throw pgError('42501');
      },
    };
    // Solo il 23505 e' idempotente; ogni altro guasto DEVE risalire (non lo si maschera come 'already').
    await expect(
      insertLead({ email: 'x@y.z', locale: 'it', source: 'hero' }, store),
    ).rejects.toMatchObject({ code: '42501' }); // covers: AC-211-2 — la mappatura e' 23505-specifica
  });
});

describe('PUB-211 insertLead — iniettabilita\' dello store (spy)', () => {
  it('usa lo store INIETTATO (spy chiamata), non il default createAdminClient', async () => {
    const insert = vi.fn(async () => {});
    const store: WaitlistStore = { insert };

    const result = await insertLead({ email: 'io@dominio.it', locale: 'it', source: 'closing' }, store);

    expect(insert).toHaveBeenCalledTimes(1); // covers: AC-211-3 — la insert dello store INIETTATO e' chiamata (KILL: uso del default adminStore)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ normalized_email: 'io@dominio.it', locale: 'it', source: 'closing' }),
    ); // covers: AC-211-3 — riceve la riga normalizzata dal writer
    expect(result).toEqual({ status: 'inserted' }); // covers: AC-211-3
  });
});

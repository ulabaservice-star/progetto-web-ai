// DOM-201 (macrotask domain-port, p5-custom-domains-fase2) — La PORTA del domain provider, dominio
// PURO (solo tipi: nessun SDK, nessuna rete, nessun segreto). Il resto del sistema dipende da QUESTA
// interfaccia, mai da Vercel (DOM-D4/A01:2025): l'adattatore reale (src/data/domain/vercel.ts, DOM-211)
// la implementa contro l'SDK/HTTP con import 'server-only'; nei test un fake iniettato la implementa
// senza rete ne' chiavi (DOM-D9), cosi' il checkpoint e' verde senza segreti reali — gemella di
// payment-port.ts vs stripe.ts. Un provider alternativo (Cloudflare, Oltre-P5) sara' un nuovo
// adattatore della stessa porta, gating invariato.

/**
 * Lo stato NORMALIZZATO della verifica di un dominio, indipendente dal provider. L'adattatore traduce
 * lo stato nativo (per Vercel: verified / non-ancora-verificato / DNS errato) in questi tre casi.
 *  • 'verified'      — il dominio e' verificato e servibile.
 *  • 'pending'       — collegato, verifica DNS non ancora completata (transizione ad attivo lato server).
 *  • 'misconfigured' — DNS presente ma errato/incompleto (l'utente deve correggere i record).
 */
export type VerificationState = 'verified' | 'pending' | 'misconfigured';

/**
 * Un requisito di verifica NORMALIZZATO che l'utente deve soddisfare presso il proprio DNS (challenge
 * del provider). Forma neutra del record-challenge restituito da addDomain: l'endpoint connect (DOM-302)
 * la compone con le istruzioni DNS pure (dnsInstructionsFor, DOM-131) per la resa all'utente (DOM-501).
 */
export type VerificationRequirement = {
  /** Tipo di record DNS del challenge (es. 'TXT', 'CNAME'). */
  readonly type: string;
  /** Nome/host su cui impostare il record (es. '_ulaba-verify.<host>'). */
  readonly domain: string;
  /** Valore atteso del record. */
  readonly value: string;
  /** Motivo normalizzato del challenge (opzionale, diagnostico). */
  readonly reason?: string;
};

/**
 * La porta del domain provider. L'adattatore Vercel la implementa contro l'API reale; nei test un fake
 * iniettato la implementa in-memory senza rete ne' chiavi (DOM-D9). Le firme sono NORMALIZZATE
 * sull'hostname gia' canonico (normalizeHostname, DOM-111) — il provider non re-normalizza.
 */
export type DomainProvider = {
  /**
   * Collega `normalized` presso il provider e ritorna l'id opaco del dominio + i requisiti di verifica
   * (challenge) da mostrare all'utente. Non attiva nulla: la transizione ad 'active'/servibile la muove
   * il server SOLO dopo una verifica riuscita (DOM-D4).
   */
  addDomain(normalized: string): Promise<{
    readonly providerDomainId: string;
    readonly verification: VerificationRequirement[];
  }>;
  /**
   * Interroga lo stato di verifica corrente di `normalized` presso il provider. `detail` porta un
   * messaggio diagnostico opzionale (es. quale record manca) senza fidarsi di input del client.
   */
  getVerificationStatus(normalized: string): Promise<{
    readonly state: VerificationState;
    readonly detail?: string;
  }>;
  /** Scollega `normalized` dal provider (idempotente lato adattatore). */
  removeDomain(normalized: string): Promise<void>;
};

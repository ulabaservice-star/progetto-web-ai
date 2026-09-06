// PUB-501 — macrotask cutover (p6a-public-surface): decisione PURA go/no-go del go-live di dominio.
// Consuma SOLO gli esiti delle sonde passati come argomenti: nessun DB, nessuna rete, nessun curl,
// nessun process.env, nessun orologio. Il curl reale delle sonde resta manuale/human-gated a monte.
// Ordine obbligato P6A-D12: finche' l'Auth URL non punta all'host app, il go e' negato
// (spostare l'app prima romperebbe magic-link/OAuth). La decisione ACCUMULA i blocker,
// non corto-circuita: piu' fallimenti => piu' chiavi, nell'ordine dichiarato sotto.

// Chiavi di blocco possibili, in ordine di valutazione (P6A-D12). Contratto pubblico STABILE
// (DoD PUB-501): il consumatore della decisione e' l'operatore del cutover (runbook), non un import
// dell'app — @public dichiara a knip che l'export e' intenzionale, non dead-code.
/** @public */
export type CutoverBlocker =
  | 'landing-root-not-200'
  | 'app-unreachable'
  | 'auth-redirect-not-app-host'
  | 'robots-host-split-incorrect';

// Esiti grezzi delle sonde curl (raccolti a mano), unico input della decisione.
export interface CutoverProbes {
  readonly appHost: string;
  readonly landingRootStatus: number;
  readonly appReachable: boolean;
  readonly authRedirectHost: string;
  readonly robotsHostSplitCorrect: boolean;
}

// Verdetto: go solo se nessun blocker; altrimenti l'elenco ordinato dei motivi.
export interface CutoverDecision {
  readonly go: boolean;
  readonly reasons: readonly CutoverBlocker[];
}

// Valuta le sonde e decide il go-live, accumulando i blocker nell'ordine P6A-D12.
export function evaluateCutover(probes: CutoverProbes): CutoverDecision {
  const reasons: CutoverBlocker[] = [];

  // La radice della landing pubblica deve rispondere 200.
  if (probes.landingRootStatus !== 200) {
    reasons.push('landing-root-not-200');
  }

  // L'host app deve essere raggiungibile.
  if (probes.appReachable === false) {
    reasons.push('app-unreachable');
  }

  // Ordine P6A-D12: l'Auth URL deve gia' puntare all'host app prima di spostare l'app.
  if (probes.authRedirectHost !== probes.appHost) {
    reasons.push('auth-redirect-not-app-host');
  }

  // Lo split di host in robots (landing vs app) deve essere corretto.
  if (probes.robotsHostSplitCorrect === false) {
    reasons.push('robots-host-split-incorrect');
  }

  const go = reasons.length === 0;
  return { go, reasons };
}

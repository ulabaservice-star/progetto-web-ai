# 22-cutover — Macrotask `cutover`

> L'ULTIMO macrotask, **human-gated** (P6A-D12): il go-live che sposta l'app da `ulaba.net` a
> `app.ulaba.net` e libera la radice per la landing. Dipende da TUTTA la superficie pubblica (host-guard,
> waitlist-form, robots, sitemap, privacy, blog). La verifica reale è **manuale/`curl`** e resta un "vai"
> umano (deploy-coupling **coupled**): qui si costruisce e si oracola solo la **DECISIONE pura** —
> `evaluateCutover(probes)` in `src/domain/hosting/cutover.ts` — che dagli esiti delle sonde ritorna
> go/no-go + ragioni, con l'**ordine obbligato** codificato (Auth URL su `app.` PRIMA di spostare l'app,
> pena magic-link/OAuth rotti). Deliverable gemello: il **RUNBOOK** ordinato con le azioni manuali del
> founder (§10). Nessun segreto, nessuna infrastruttura mutata dal codice.

## Task atomici

```yaml
- id: PUB-501
  title: "evaluateCutover(probes) puro — go/no-go del cutover dagli esiti delle sonde, ordine P6A-D12 codificato + RUNBOOK"
  macrotask: "cutover"
  depends_on: [PUB-111, PUB-241, PUB-301, PUB-311, PUB-341, PUB-431, PUB-441]
  objective: >
    Fornire la DECISIONE pura del go-live e il runbook che ne guida l'esecuzione manuale. La funzione
    evaluateCutover(probes) in src/domain/hosting/cutover.ts, dati gli esiti delle sonde (curl della
    landing root su ulaba.net; app raggiungibile su app.; host della Redirect/Site URL di Supabase Auth;
    robots host-split corretto), ritorna { go, reasons }: go=true SOLO se tutte le sonde sono verdi,
    altrimenti go=false con le chiavi-blocker corrispondenti. L'ordine obbligato P6A-D12 è codificato:
    finché l'Auth URL non punta all'host app, il go è negato (spostare l'app prima romperebbe
    magic-link/OAuth). PURA: nessun DB, nessuna rete, nessun curl, nessun orologio interno. In parallelo,
    il RUNBOOK docs/blueprint/p6a-public-surface/runbooks/cutover.md scrive i passi ordinati e le azioni
    manuali del founder (§10). La verifica reale resta manuale/human-gated: qui si oracola la decisione.
  definition_of_done:
    - "src/domain/hosting/cutover.ts con evaluateCutover(probes: CutoverProbes) -> CutoverDecision, funzione PURA (nessun DB/rete/curl/orologio)"
    - "CutoverProbes = { appHost: string, landingRootStatus: number, appReachable: boolean, authRedirectHost: string, robotsHostSplitCorrect: boolean }"
    - "CutoverDecision = { go: boolean, reasons: readonly CutoverBlocker[] }; CutoverBlocker union di chiavi stabili: 'landing-root-not-200' | 'app-unreachable' | 'auth-redirect-not-app-host' | 'robots-host-split-incorrect'"
    - "go=true (e reasons=[]) SOLO se: landingRootStatus===200 AND appReachable===true AND authRedirectHost===appHost AND robotsHostSplitCorrect===true"
    - "ogni sonda non verde aggiunge la sua chiave-blocker a reasons e forza go=false; più fallimenti => più chiavi (accumulate, non corto-circuitate)"
    - "RUNBOOK docs/blueprint/p6a-public-surface/runbooks/cutover.md con l'ORDINE OBBLIGATO P6A-D12 (1: deploy landing live+verde su ulaba.net -> 2: verifica curl root 200 -> 3: Supabase Auth Site/Redirect URL -> app. -> 4: rescope Cloudflare Access solo su app. -> 5: sposta l'app su app. -> 6: verifica oracolare curl) e le AZIONI MANUALI del founder (§10: rescope Access, DNS app/www, chiavi Turnstile + NEXT_PUBLIC_LANDING_URL su Vercel, Supabase Auth URL, CORS/webhook Stripe-test, Google Search Console, copy/OG)"
  acceptance_criteria:
    - id: AC-501-1
      given: "sonde tutte verdi: { appHost:'app.ulaba.net', landingRootStatus:200, appReachable:true, authRedirectHost:'app.ulaba.net', robotsHostSplitCorrect:true }"
      when: "si chiama evaluateCutover(probes)"
      then: "ritorna { go: true, reasons: [] }"
    - id: AC-501-2
      given: "sonde con landingRootStatus:502 (la root non risponde 200) e le altre verdi"
      when: "si chiama evaluateCutover(probes)"
      then: "go è false e reasons include 'landing-root-not-200' (non si libera la radice se la landing non è live)"
    - id: AC-501-3
      given: "sonde con authRedirectHost:'ulaba.net' (ancora la root, non appHost 'app.ulaba.net') e le altre verdi"
      when: "si chiama evaluateCutover(probes)"
      then: "go è false e reasons include 'auth-redirect-not-app-host' (viola l'ordine P6A-D12: l'Auth URL va spostato su app. PRIMA dell'app)"
    - id: AC-501-4
      given: "sonde con robotsHostSplitCorrect:false (robots per-host incoerente) e le altre verdi"
      when: "si chiama evaluateCutover(probes)"
      then: "go è false e reasons include 'robots-host-split-incorrect' (landing indicizzabile / app disallow non ancora corretto)"
  target_tests:
    - file: "tests/cutover-evaluate.test.ts"
      covers: [AC-501-1, AC-501-2, AC-501-3, AC-501-4]
  security_notes:
    - "A07:2025 secret via env — nessun segreto entra nella funzione né nel runbook: evaluateCutover consuma solo esiti di sonde (status/booleani/host pubblici); il runbook nomina le variabili (Turnstile, NEXT_PUBLIC_LANDING_URL, Supabase Auth URL) che il founder imposta su Vercel/Supabase, senza incollarne i valori"
    - "A01:2025 ordine di cutover (P6A-D12) — la chiave 'auth-redirect-not-app-host' nega il go finché la Site/Redirect URL di Supabase Auth non punta all'host app: impedisce di spostare l'app prima che l'auth la segua (altrimenti magic-link/OAuth si rompono)"
    - "Nessuna infrastruttura mutata dal codice — evaluateCutover DECIDE, non esegue: il rescope Access, il DNS e lo spostamento restano azioni manuali; il merge/cutover è un 'vai' umano (deploy-coupling coupled), la sonda curl reale è manuale"
  out_of_scope:
    - "L'esecuzione reale delle sonde curl e le azioni infrastrutturali (rescope Cloudflare Access, DNS app/www, Supabase Auth URL, CORS/webhook Stripe): manuali/human-gated (§10), non codice"
    - "Il merge su main e il deploy (deploy-coupling coupled): restano un 'vai' umano, non automatizzati qui"
    - "Google Search Console (verifica DNS TXT + invio sitemap) e il copy/OG definitivi: azioni founder post-cutover (§10)"
```

## Self-check

- **Checkpoint**: funzione **pura** per valore su sonde fake (nessun DB/rete/curl); RUNBOOK presente con
  l'ordine obbligato P6A-D12 e le azioni manuali del founder (§10). **Mutazione**: rimuovere il check
  `landingRootStatus===200` → AC-501-2 rosso; accettare `authRedirectHost !== appHost` → AC-501-3 rosso
  (violazione P6A-D12 non più intercettata); ignorare `robotsHostSplitCorrect` → AC-501-4 rosso; ritornare
  `go:true` con `reasons` non vuoto → AC-501-1 rosso. Nessun gate visivo (decisione, non UI).

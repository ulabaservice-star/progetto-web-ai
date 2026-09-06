# Runbook cutover di dominio (PUB-501)

Questo runbook descrive la sequenza operativa del go-live che sposta l'app da `ulaba.net` a `app.ulaba.net`, liberando la radice del dominio per la landing pubblica. Il deploy-coupling è COUPLED: un push su `main` è già un deploy su `ulaba.net`, quindi la verifica reale non è automatizzabile e resta un "vai" umano. La funzione pura `evaluateCutover(probes)` è l'oracolo della DECISIONE (dato l'insieme delle sonde, dice se si può andare in produzione), mentre questo documento è la sequenza dell'ESECUZIONE. Il go NON si dichiara finché le sonde non sono tutte verdi: prima si eseguono i passi, poi si raccolgono gli esiti, poi `evaluateCutover` emette il verdetto.

## Ordine obbligato (P6A-D12)

L'ordine di questi passi è esso stesso una misura di sicurezza: l'Auth URL deve puntare su `app.` PRIMA di spostare l'app, altrimenti magic-link e OAuth si rompono nella finestra di transizione. Esegui i sei passi in questo ordine ESATTO.

1. Deploy della landing LIVE e verde su `ulaba.net` (le superfici pubbliche sono già mergiate su `main`).
2. Verifica curl: la root di `ulaba.net` risponde `200` (sonda `landingRootStatus`).
3. Supabase Auth: imposta Site URL e Redirect URL sull'host `app.ulaba.net` (sonda `authRedirectHost === appHost`). QUESTO PASSO PRECEDE lo spostamento dell'app.
4. Rescope Cloudflare Access: la protezione resta SOLO su `app.ulaba.net` (la landing resta pubblica).
5. Sposta l'app su `app.ulaba.net` (dominio primario dell'app; la radice serve la landing).
6. Verifica oracolare finale via curl: raccogli gli esiti delle sonde `{ appHost, landingRootStatus, appReachable, authRedirectHost, robotsHostSplitCorrect }` e passali a `evaluateCutover`; go-live SOLO se `go === true` (`reasons` vuoto).

## Mappa sonda -> chiave-blocker

Ogni sonda, quando non è verde, produce una chiave-blocker in `reasons`. Usa questa tabella per tradurre un fallimento di sonda nella causa da correggere prima di ritentare.

| Sonda non verde | Chiave-blocker restituita |
| --- | --- |
| `landingRootStatus != 200` | `landing-root-not-200` |
| `appReachable = false` | `app-unreachable` |
| `authRedirectHost != appHost` | `auth-redirect-not-app-host` |
| `robotsHostSplitCorrect = false` | `robots-host-split-incorrect` |

## Azioni manuali del founder (VISION §10, non-codice)

Questi passi non sono codice e vanno eseguiti a mano dal founder sulle console dei provider. I VALORI dei secret non vanno MAI incollati in questo file: qui si nominano solo le variabili.

- Rescope Cloudflare Access -> protezione solo su `app.ulaba.net`.
- DNS: record per l'host `app` e per `www`.
- Turnstile: chiavi site e secret, più `NEXT_PUBLIC_LANDING_URL`, configurate su Vercel. Finché sono assenti, il form della waitlist si mostra `unavailable` e l'endpoint degrada in modo controllato: comportamenti inerti dichiarati, nessun `500`.
- Supabase Auth: Site URL e Redirect URL -> host `app.ulaba.net`.
- CORS e webhook Stripe-test: sposta l'origine consentita da `ulaba.net` a `app.ulaba.net`.
- Google Search Console: verifica proprietà via record DNS TXT e invio della sitemap.
- Copy definitivo della landing IT+ES e immagine OG `1200x630`.

I valori dei secret (chiavi Turnstile, credenziali, token) restano fuori da questo documento: si configurano solo sulle console e su Vercel.

## Nota di sicurezza

`evaluateCutover` DECIDE, non esegue: è una funzione pura che valuta le sonde e non muta alcuna infrastruttura. Nessuna risorsa (Cloudflare Access, DNS, dominio primario dell'app) è modificata dal codice. Il rescope di Access, i record DNS, lo spostamento dell'app e il merge/deploy restano azioni umane, esplicite e reversibili.

# session-start — p5-custom-domains-fase2

> Da incollare all'apertura di ogni sessione di lavoro (dopo la prima). Legge SESSION-STATE, sceglie
> il macrotask corrente, ripete task/criteri/test, prepara il branch.

```
Riprendiamo il lavoro su **p5-custom-domains-fase2** (Fase 2 di P5 — domini custom) di Ulaba/Belora
(supabase-jsts). Il blueprint è il piano: si costruisce secondo i task, non si ridiscute il design.

1) RECUPERO CONTESTO — leggi PRIMA di qualunque azione:
   • docs/blueprint/p5-custom-domains-fase2/SESSION-STATE.md (stato vivo: macrotask fatti/in corso,
     baseline, §5 carry-over, §6 copertura)
   • 00-INDEX.md + il modulo del macrotask di oggi (task atomici)
   • Verifica i path reali all'apertura: src/domain/domains/ (dominio puro: hostname, dns-instructions,
     domain-port, domain-downgrade), src/data/site-domains.ts (store RLS), src/data/public-domain.ts
     (lettura pubblica host→slug, gemella di public-site.ts), src/data/domain/vercel.ts (adattatore,
     gemello di payment/stripe.ts), src/app/api/domains/ (connect/verify/disconnect), src/ui/domains/
     (UI), src/middleware.ts (host-routing), src/app/api/billing/webhook/route.ts (aggancio downgrade).
     Riferimenti Fase 1: src/domain/billing/entitlement.ts (custom_domain in PLAN_LIMITS,
     resolveEntitlement, getAccountEntitlement), src/domain/billing/payment-port.ts (modello di porta).

2) SELEZIONA IL MACROTASK CORRENTE rispettando il DAG (12 macrotask piccoli, vedi 00-INDEX §Build order):
   primi eleggibili {domain-schema, domain-hostname, domain-port}; poi {domain-companion, domain-dns}
   da domain-hostname, domain-vercel da domain-port, {domain-store, domain-routing} da domain-schema;
   domain-connect (schema+hostname+companion+port+store) → domain-verify-disconnect → domain-ui;
   domain-downgrade (schema+store). Scegli il primo non chiuso le cui dipendenze sono verdi — ogni
   macrotask è 1–3 micro-task: una sessione leggera.

3) RIPETI i task atomici del macrotask: per ciascuno enuncia definition_of_done · acceptance_criteria
   (given/when/then) · target_tests (l'oracolo del controllo 4).

4) PREPARA IL BRANCH (es. trueline/build/<macrotask>) da main pulito. Lavora SU BRANCH, mai su main.

5) PROMEMORIA al confine: CHECKPOINT (4 controlli oracolari) prima di committare; per domain-ui anche
   GATE VISIVO umano. Merge su main GATED dal verde E dal deploy-coupling coupled (push su main =
   deploy su ulaba.net) → verifica in LOCALE (vitest, e2e Chromium, next build) prima del merge.
   Batteria di mutazione per macrotask (ripristino backup+sha256, MAI git checkout — il macrotask è
   uncommitted).

NOTE OPERATIVE (dal repo, non riscoprirle):
  • Verdetto dal JSON del checkpoint (green/summary/controls[]), mai dall'exit code o via | tail.
  • Checkpoint MONOLITICO in background detached = 0xC0000142 → decomporre (foreground funziona per
    build/e2e/vitest/driver).
  • e2e/ escluso da jscpd; i .test.ts sono esclusi da jscpd. Per la misura diretta per-file dei cloni
    usa jscpd@4 --mode strict (≠ v5 di npx jscpd).
  • RLS di site_domains: SELECT owner-only (is_account_member(account_id)) + INSERT/DELETE owner-only,
    ZERO policy UPDATE per authenticated (lo stato attivo lo muove solo il server dopo la verifica),
    + UNA SELECT anon vincolata a status='active' con GRANT column-level (hostname, public_slug).
    Modello da subscriptions (owner-only) + site_publications (anon column-level published-only).
  • Provider dietro porta: adattatore Vercel con import 'server-only' + client LAZY su config iniettabile
    (token/projectId da env); nei test un fake DomainProvider iniettato → nessuna chiave reale nel verde.
    Senza env il collegamento reale è no-op dichiarato (DOM-D9), come le CTA Stripe.
  • Host-routing: il middleware aggiunge il caso host-custom PRIMA di locale/guardia auth; NON toccare
    l'esclusione /s/* né la guardia auth degli host di piattaforma (non-regressione su
    tests/auth-middleware.test.ts). Lookup host→slug come anon, mai service_role sull'edge.
  • Downgrade: applyDomainDowngrade puro (gemello di applyDowngrade/BIL-501) + applySoftDomainDowngrade
    agganciato nel webhook dopo applySoftDowngrade (Fase 1), idempotente, mai delete.
  • Segreti Vercel via env, mai nel sorgente. Guardie di rotta condivise: _shared/request-guard
    (same-origin/byte) + route-guards (identità/proprietà del sito). Nessun service_role nel percorso utente.
  • scratchpad/ NON è gitignorato → ripuliscilo da report/log prima del driver del checkpoint.
  • Migrazione site_domains: applicarla a Supabase Cloud (POOLER, come da meccanismo autonomo) e
    verificare RLS/GRANT via node pg prima del merge.

Dopo aver letto SESSION-STATE: dichiara in poche righe lo stato, il macrotask scelto coi suoi
task/criteri/test, il branch preparato, ed eventuali blocchi. Poi attendi il mio via.
```

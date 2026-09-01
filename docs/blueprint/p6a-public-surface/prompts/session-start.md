# session-start — p6a-public-surface

> Da incollare all'apertura di ogni sessione di lavoro (dopo la prima). Legge SESSION-STATE, sceglie il
> macrotask corrente, ripete task/criteri/test, prepara il branch.

```
Riprendiamo il lavoro su **p6a-public-surface** (superficie pubblica) di Ulaba/Belora (supabase-jsts).
Il blueprint è il piano: si costruisce secondo i task, non si ridiscute il design (ledger P6A-D1…D13).

1) RECUPERO CONTESTO — leggi PRIMA di qualunque azione:
   • docs/blueprint/p6a-public-surface/SESSION-STATE.md (stato vivo: macrotask fatti/in corso,
     baseline, §5 carry-over, §6 prossimi passi)
   • 00-INDEX.md + il modulo del macrotask di oggi (task atomici)
   • Verifica i path reali all'apertura: src/domain/hosting/ (classify-host, cutover — puri),
     src/domain/captcha/ (porta), src/domain/blog/ (markdown pipeline, content loader),
     src/data/waitlist.ts (writer), src/data/captcha/turnstile.ts (adattatore),
     src/app/api/waitlist/route.ts, src/app/[locale]/(marketing)/** (layout, home, privacy, blog),
     src/ui/waitlist/** (form), src/app/robots.ts (host-aware), src/app/sitemap.ts (landing),
     src/config/env.ts (getter landing), src/middleware.ts (host-guard). Riferimenti da riusare:
     src/domain/generation/jsonld.ts (serializeJsonLdSafe), src/app/api/_shared/request-guard.ts,
     src/data/supabase-admin.ts (createAdminClient), il pattern porta+fake di src/domain/domains/.

2) SELEZIONA IL MACROTASK CORRENTE rispettando il DAG (22 macrotask piccoli, vedi 00-INDEX §Build order):
   primi eleggibili {host-classify, marketing-i18n, waitlist-schema, captcha-port, blog-pipeline}; poi
   host-guard (da host-classify); marketing-layout (da i18n) → marketing-home; seo-robots/sitemap/
   metadata/privacy (da layout); seo-jsonld (da home); waitlist-store (da schema) + waitlist-endpoint
   (store+captcha) → waitlist-form (home+endpoint); blog-content (da pipeline) → blog-list/blog-post/
   blog-sitemap/blog-seed; cutover per ULTIMO. Scegli il primo non chiuso le cui dipendenze sono verdi.

3) RIPETI i task atomici del macrotask: per ciascuno enuncia definition_of_done · acceptance_criteria
   (given/when/then) · target_tests (l'oracolo del controllo 4).

4) METODO — costruisci con **dynamic workflow command-free** (ultracode): 1 builder command-free per
   micro-task (solo Read/Write/Edit; MAI eseguire tsc/vitest/knip — si stallano), micro-task in
   parallelo se non condividono file, poi UN solo ciclo di oracoli (checkpoint 4/4 + mutazione) in
   FOREGROUND dall'orchestratore = unico giudice del verde. Vedi la memoria dynamic-workflow-build-method.

5) PREPARA IL BRANCH (es. trueline/build/<macrotask>) da main pulito. Lavora SU BRANCH, mai su main.

6) PROMEMORIA al confine: CHECKPOINT (4 controlli oracolari) prima di committare; per i macrotask con
   UI (marketing-home, waitlist-form, pagine marketing/blog) valuta un GATE VISIVO umano. Merge su main
   GATED dal verde E dal deploy-coupling coupled (push su main = deploy su ulaba.net) → verifica in
   LOCALE (vitest, e2e Chromium, next build) prima del merge. Batteria di mutazione per macrotask
   (ripristino backup + sha256, MAI git checkout — il macrotask è uncommitted).

NOTE OPERATIVE (dal repo, non riscoprirle):
  • Verdetto dal JSON del checkpoint (green/summary/controls[]), mai dall'exit code o via | tail.
  • Checkpoint MONOLITICO in background detached = 0xC0000142 → decomporre (foreground funziona per
    build/e2e/vitest/driver).
  • e2e/ escluso da jscpd; i .test.ts sono esclusi da jscpd. Per la misura diretta per-file dei cloni
    usa jscpd@4 --mode strict (≠ v5 di npx jscpd).
  • RLS di waitlist_leads: RLS enabled + ZERO policy anon/authenticated + revoke all + nessun GRANT
    anon/authenticated → scrive SOLO service_role (che bypassa RLS). Lo zero-policy è la POSTURA VOLUTA
    (l'app non usa mai anon/authenticated su questa tabella): R2 non si applica, il deny-all è
    intenzionale, e il test RLS DB-reale sotto anon lo PROVA (anti-placebo, come site_domains).
  • Turnstile dietro porta CaptchaVerifier: adattatore con import 'server-only' + client LAZY su config
    iniettabile (TURNSTILE_SECRET_KEY da env); nei test un fake iniettato → nessuna chiave reale nel
    verde. Senza env il verify reale è inerte dichiarato (nessun 500), come le CTA Stripe.
  • Host-guard: guard SIMMETRICO nel middleware PRIMA del locale/guardia auth, ma NON toccare
    l'esclusione /s/*, il ramo host-custom (routeCustomHost), né la guardia auth degli host di
    piattaforma (non-regressione auth-middleware/public-exclusion/host-routing). Fail-safe:
    NEXT_PUBLIC_LANDING_URL assente → nessun redirect landing (tutto come oggi).
  • robots.ts host-aware: legge Host via headers() (rotta dinamica); landing indicizzabile + Sitemap
    landing, app disallow, MAI linkare app.* dal robots landing.
  • JSON-LD e HTML blog: serializeJsonLdSafe (riuso da jsonld.ts) come figlio testuale di <script>, mai
    innerHTML grezzo; HTML del blog reso SOLO dopo rehype-sanitize.
  • Segreti via env, mai nel sorgente. Guardie di rotta condivise: _shared/request-guard
    (same-origin/byte). Nessun service_role nel percorso utente/edge.
  • scratchpad/ NON è gitignorato → ripuliscilo da report/log prima del driver del checkpoint.
  • Migrazione waitlist_leads: applicarla a Supabase Cloud (POOLER, meccanismo autonomo) e verificare
    RLS/GRANT via node pg prima del merge.

Dopo aver letto SESSION-STATE: dichiara in poche righe lo stato, il macrotask scelto coi suoi
task/criteri/test, il branch preparato, ed eventuali blocchi. Poi attendi il mio via.
```

# session-start — p5-billing-fase1

> Da incollare all'apertura di ogni sessione di lavoro (dopo la prima). Legge SESSION-STATE, sceglie
> il macrotask corrente, ripete task/criteri/test, prepara il branch.

```
Riprendiamo il lavoro su **p5-billing-fase1** (Fase 1 di P5 — nucleo billing) di Ulaba/Belora
(supabase-jsts). Il blueprint è il piano: si costruisce secondo i task, non si ridiscute il design.

1) RECUPERO CONTESTO — leggi PRIMA di qualunque azione:
   • docs/blueprint/p5-billing-fase1/SESSION-STATE.md (stato vivo: macrotask fatti/in corso, baseline,
     §5 carry-over, §6 copertura)
   • 00-INDEX.md + il modulo del macrotask di oggi (task atomici)
   • Verifica i path reali all'apertura: src/domain/billing/ (dominio puro: PLAN_LIMITS,
     resolveEntitlement, applyDowngrade), src/data/subscriptions.ts + src/data/payment/ (porta +
     adattatore Stripe), src/app/api/billing/ (webhook, checkout, portal), src/ui/billing/ (pagina
     "Passa a Pro"); punti di gate esistenti: src/data/site-publications.ts + src/app/s/[slug]/Badge.tsx
     (badge), la creazione sito, il generatore SEO, src/app/api/_shared/ai-endpoint.ts (cap AI).

2) SELEZIONA IL MACROTASK CORRENTE rispettando il DAG:
   entitlement-core → {stripe-checkout-webhook, plan-gates} → {billing-ui, downgrade-lifecycle}.
   Scegli il primo non chiuso le cui dipendenze sono verdi.

3) RIPETI i task atomici del macrotask: per ciascuno enuncia definition_of_done · acceptance_criteria
   (given/when/then) · target_tests (l'oracolo del controllo 4).

4) PREPARA IL BRANCH (es. trueline/build/<macrotask>) da main pulito. Lavora SU BRANCH, mai su main.

5) PROMEMORIA al confine: CHECKPOINT (4 controlli oracolari) prima di committare; per billing-ui anche
   GATE VISIVO umano. Merge su main GATED dal verde E dal deploy-coupling coupled (push su main =
   deploy su ulaba.net) → verifica in LOCALE (vitest, e2e Chromium, next build) prima del merge.
   Batteria di mutazione per macrotask (ripristino backup+sha256, MAI git checkout — il macrotask è
   uncommitted).

NOTE OPERATIVE (dal repo, non riscoprirle):
  • Verdetto dal JSON del checkpoint (green/summary/controls[]), mai dall'exit code o via | tail.
  • Checkpoint MONOLITICO in background detached = 0xC0000142 → decomporre (foreground funziona per
    build/e2e/vitest/driver). run_checkpoint --baseline vuole un file ARRAY.
  • e2e/ escluso da jscpd; i .test.ts sono esclusi da jscpd (i target test nuovi non entrano nel gate
    igiene). Per la misura diretta per-file dei cloni usa jscpd@4 --mode strict (≠ v5 di npx jscpd).
  • RLS di subscriptions: SELECT owner-only, ZERO policy di scrittura per authenticated (l'entitlement
    lo muove solo il webhook, service_role fuori dal percorso utente); modello da onboarding_ai_usage.
  • Guardie di rotta condivise: _shared/request-guard (same-origin/byte) + route-guards (identità/
    proprietà). Nessun service_role nel percorso utente. Segreti Stripe via env, mai nel sorgente.
  • Provider dietro porta: nei test un fake PaymentProvider iniettato → nessuna chiave reale nel verde.
  • Webhook: firma verificata + idempotenza (dedup event id); catch che LOGGA (no 502 opaco).
  • scratchpad/ NON è gitignorato → ripuliscilo da report/log prima del driver del checkpoint.

Dopo aver letto SESSION-STATE: dichiara in poche righe lo stato, il macrotask scelto coi suoi
task/criteri/test, il branch preparato, ed eventuali blocchi. Poi attendi il mio via.
```

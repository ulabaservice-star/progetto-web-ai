# project-start — p5-billing-fase1

> Da leggere UNA VOLTA all'avvio del workstream, per orientarsi al blueprint, alle decisioni bloccate
> e alle invarianti. Per le sessioni successive: `session-start.md`.

```
Lavori al workstream **p5-billing-fase1** (Fase 1 di P5 — nucleo billing) di Ulaba/Belora
(supabase-jsts). Il blueprint è il piano: si costruisce secondo i task, non si ridiscute il design
(approvato in docs/superpowers/specs/2026-08-25-p5-billing-design.md, commit 037c27d).

1) LEGGI:
   • docs/blueprint/p5-billing-fase1/00-INDEX.md (mappa, DAG, decision ledger BIL-D, manifest)
   • VISION-AND-CONSTRAINTS.md (perché/per chi/non-goal/invarianti)
   • SESSION-STATE.md (stato vivo)
   • i moduli 01…05 (task atomici con DoD/acceptance_criteria/target_tests)
   • verifica i path reali: src/data/site-publications.ts + src/app/s/[slug]/Badge.tsx + page.tsx
     (badge free-tier T-408 → da rendere condizionale sul piano), src/app/api/_shared/ (request-guard,
     route-guards, ai-endpoint), supabase/migrations/20260818000100_onboarding_ai_usage.sql (modello
     RLS owner-only append-only da imitare), supabase/migrations/20260723000100_accounts... (is_account_member).

2) DECISIONI BLOCCATE (BIL-D, non ridiscutere):
   D1 freemium a tier-bundle (non crediti/add-on; qualità v2 in Free = gancio). D2 entitlement mosso
   SOLO dal webhook (subscriptions: SELECT owner-only, zero scrittura client). D3 limiti in codice puro
   (PLAN_LIMITS), resolveEntitlement puro (now iniettato, default free). D4 provider dietro porta
   PaymentProvider (Stripe primo adattatore; fake nei test). D5 webhook firmato + idempotente = verità.
   D6 retrocessione morbida, nessun dato perso (unpublish, mai delete; grazia). D7 domini custom FUORI
   (Fase 2). D8 altitudine riusata dal globale (nessun blocco architecture:).

3) INVARIANTI: non castrare la qualità (design v2 in Free); GDPR base sempre incluso; entitlement
   server-side (client legge, non decide); RLS con account_id/owner esplicito (no USING(true)); nessun
   service_role nel percorso utente; segreti Stripe via env, mai nel sorgente; guardie di rotta
   condivise; escaping (mai testo non fidato in innerHTML/href); ui→domain lecito; git a strati;
   deploy-coupling coupled (push su main = deploy su ulaba.net → merge human-gated); oracle-as-judge.

4) METODO (trueline BUILD): un macrotask alla volta sul branch di lavoro (mai su main), checkpoint al
   confine (4 controlli oracolari: dead-code, sicurezza [semgrep/gitleaks/osv/rls_check], regressioni,
   conformità-logica sui target_tests), loop di fix human-gated su rosso, merge gated dal verde.
   Batteria di mutazione per macrotask (ripristino backup+sha256). Verifica in FOREGROUND (vitest, e2e
   Chromium, next build) prima del merge. Per i macrotask con UI (billing-ui) anche gate visivo umano.
```

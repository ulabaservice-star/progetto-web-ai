# project-start — onboarding-guided-wizard

> Da leggere UNA VOLTA all'avvio del workstream, per orientarsi al blueprint, alle decisioni bloccate
> e alle invarianti. Per le sessioni successive: `session-start.md`.

```
Lavori al workstream **onboarding-guided-wizard** di Ulaba/Belora (supabase-jsts). Il blueprint è il
piano: si costruisce secondo i task, non si ridiscute il design (approvato in
docs/superpowers/specs/2026-08-18-onboarding-guided-wizard-design.md).

1) LEGGI:
   • docs/blueprint/onboarding-guided-wizard/00-INDEX.md (mappa, DAG, decision ledger OGW-D, manifest)
   • VISION-AND-CONSTRAINTS.md (perché/per chi/non-goal/invarianti)
   • SESSION-STATE.md (stato vivo)
   • i moduli 01…06 (task atomici con DoD/acceptance_criteria/target_tests)

2) DECISIONI BLOCCATE (OGW-D, non ridiscutere):
   D1 chat libera rimossa (remove-chat = ULTIMO). D2 ogni output AI = suggerimento editabile confermato;
   suggerimenti-offerte = placeholder a prezzo vuoto. D3 offerte settore-agnostiche (etichetta da
   resolveOfferings; resa per-settore fuori scope). D4 spesa governata per-sito (cap→429 + rate-limit,
   consume-on-success). D5 Brief/generazione/motore-v2 invariati. D6 altitudine riusata dal globale.

3) INVARIANTI: wizard deterministico; AI solo on-demand (import/genera-descrizione/suggerisci-offerte);
   anti-invenzione (niente entra nel brief senza conferma); guardie di rotta + RLS owner-only + fetchSafe;
   escaping (mai testo non fidato in innerHTML/href); ui→domain lecito; git a strati; deploy-coupling
   coupled (push su main = deploy su ulaba.net → merge human-gated); oracle-as-judge + gate visivo umano.

4) METODO (trueline BUILD): un macrotask alla volta sul branch di lavoro (mai su main), checkpoint al
   confine (4 controlli oracolari: dead-code, sicurezza, regressioni, conformità-logica sui target_tests),
   loop di fix human-gated su rosso, merge gated dal verde. Batteria di mutazione per macrotask
   (ripristino backup+sha256). Verifica in FOREGROUND (vitest, e2e Chromium, next build) prima del merge.
```

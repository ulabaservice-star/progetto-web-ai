# session-end — p5-custom-domains-fase2

> Da incollare alla chiusura di ogni sessione. Verifica che il checkpoint sia girato, aggiorna
> SESSION-STATE, registra lo stato git e il deploy-coupling.

```
Chiudo la sessione su **p5-custom-domains-fase2**. Prima di fermarmi:

1) CHECKPOINT — conferma che il checkpoint del macrotask è girato e il VERDETTO viene dal JSON
   (green/summary/controls[]), non dall'exit code. Se rosso o incompleto: dichiaralo, non fingere verde.

2) GATE (se dovuto): per il macrotask con UI (domain-ui) registra l'esito del gate visivo umano. La
   bellezza/ovvietà UX non è oracolabile (L-COL-006).

3) AGGIORNA docs/blueprint/p5-custom-domains-fase2/SESSION-STATE.md:
   • §1 tabella macrotask (stato → done, commit, checkpoint)
   • §2 macrotask corrente / prossimo selezionabile (DAG)
   • §3 stato git (branch, ultimo commit, stato merge su main, main_deploy_coupled)
   • §4 baseline (igiene/sicurezza ri-catturate al confine; RLS di site_domains: owner-only + anon-active,
     nessuna UPDATE authenticated; segreti Vercel via env)
   • §5 carry-over (lezioni nuove, gotcha: verifica DNS prima dell'attivazione, host-routing
     non-regressione, fake DomainProvider, reserved-domains, idempotenza downgrade)
   • §6 copertura dichiarata (target_tests coperti, mutazioni, gate, cosa NON coperto)

4) GIT: commit atomico del macrotask sul branch; merge su main SOLO su via umana esplicita
   (deploy-coupling coupled → deploy su ulaba.net), dopo verifica locale completa (vitest, e2e Chromium,
   next build). Se il macrotask introduce la migrazione site_domains: applicarla a Supabase Cloud
   (POOLER; SQL Editor + registrazione in schema_migrations come ripiego) e verificare RLS/GRANT via
   node pg. Registra i commit in SESSION-STATE.

5) Commit del session-end (docs) — mai lasciare SESSION-STATE disallineato dallo stato reale.
```

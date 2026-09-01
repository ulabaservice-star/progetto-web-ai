# session-end — p6a-public-surface

> Da incollare alla chiusura di ogni sessione. Verifica che il checkpoint sia girato, aggiorna
> SESSION-STATE, registra lo stato git e il deploy-coupling.

```
Chiudo la sessione su **p6a-public-surface**. Prima di fermarmi:

1) CHECKPOINT — conferma che il checkpoint del macrotask è girato e il VERDETTO viene dal JSON
   (green/summary/controls[]), non dall'exit code. Se rosso o incompleto: dichiaralo, non fingere verde.

2) GATE (se dovuto): per i macrotask con UI (marketing-home, waitlist-form, pagine marketing/blog)
   registra l'esito del gate visivo umano. La bellezza/ovvietà UX non è oracolabile (L-COL-006). La
   landing È la demo del prodotto: se è amatoriale contraddice la promessa.

3) AGGIORNA docs/blueprint/p6a-public-surface/SESSION-STATE.md:
   • §1 tabella macrotask (stato → done, commit, checkpoint)
   • §2 macrotask corrente / prossimo selezionabile (DAG)
   • §3 stato git (branch, ultimo commit, stato merge su main, deploy-coupling)
   • §4 baseline (igiene/sicurezza ri-catturate al confine; RLS di waitlist_leads: enabled zero-policy
     solo-server; segreto Turnstile via env; dep del blog sotto OSV)
   • §5 carry-over (lezioni nuove, gotcha: host-guard non-regressione /s/* e guardia auth; fake
     CaptchaVerifier; idempotenza 23505; robots host-aware; rehype-sanitize; hreflang solo fra
     traduzioni reali; zero-policy giustificata)
   • §6 copertura dichiarata (target_tests coperti, mutazioni, gate, cosa NON coperto)

4) GIT: commit atomico del macrotask sul branch; merge su main SOLO su via umana esplicita
   (deploy-coupling coupled → deploy su ulaba.net), dopo verifica locale completa (vitest, e2e Chromium,
   next build). Se il macrotask introduce la migrazione waitlist_leads: applicarla a Supabase Cloud
   (POOLER; SQL Editor + registrazione in schema_migrations come ripiego) e verificare RLS/GRANT via
   node pg. Se introduce nuove dep (blog): registra il passaggio sotto OSV (C2). Registra i commit in
   SESSION-STATE.

5) Il macrotask **cutover** è HUMAN-GATED e non-codice per la parte infrastrutturale: registra quali
   azioni manuali del founder (VISION §10) restano da fare e l'esito delle sonde curl (evaluateCutover).
   Non dichiarare il go-live finché le sonde non sono verdi nell'ordine obbligato (P6A-D12).

6) Commit del session-end (docs) — mai lasciare SESSION-STATE disallineato dallo stato reale.
```

# session-start — onboarding-guided-wizard

> Da incollare all'apertura di ogni sessione di lavoro (dopo la prima). Legge SESSION-STATE, sceglie il
> macrotask corrente, ripete task/criteri/test, prepara il branch.

```
Riprendiamo il lavoro su **onboarding-guided-wizard** di Ulaba/Belora (supabase-jsts). Il blueprint è il
piano: si costruisce secondo i task, non si ridiscute il design.

1) RECUPERO CONTESTO — leggi PRIMA di qualunque azione:
   • docs/blueprint/onboarding-guided-wizard/SESSION-STATE.md (stato vivo: macrotask fatti/in corso,
     baseline, §5 carry-over, §6 copertura)
   • 00-INDEX.md + il modulo del macrotask di oggi (task atomici)
   • Verifica i path reali all'apertura: src/domain/onboarding/ (brief, interview [da rimuovere in
     remove-chat], llm-port), src/ui/onboarding/ (OnboardingWorkspace, BriefPanel, ChatPanel [da
     rimuovere], UrlImportBar), src/app/api/onboarding/ (turn [da rimuovere]), src/domain/import/
     (fromUrl/fetchSafe — RIUSO), src/domain/generation/blocks.ts (resolveOfferings — RIUSO),
     src/data/anthropic.ts (modello onboarding).

2) SELEZIONA IL MACROTASK CORRENTE rispettando il DAG:
   {ai-usage-guard, offerings-editor} → generate-description · suggest-offerings → wizard-shell →
   remove-chat. Scegli il primo non chiuso le cui dipendenze sono verdi.

3) RIPETI i task atomici del macrotask: per ciascuno enuncia definition_of_done · acceptance_criteria
   (given/when/then) · target_tests (l'oracolo del controllo 4).

4) PREPARA IL BRANCH (es. trueline/build/<macrotask>) da main pulito. Lavora SU BRANCH, mai su main.

5) PROMEMORIA al confine: CHECKPOINT (4 controlli oracolari) prima di committare; per i macrotask con UI
   (offerings-editor, wizard-shell) anche GATE VISIVO umano. Merge su main GATED dal verde E dal
   deploy-coupling coupled (push su main = deploy su ulaba.net) → verifica in LOCALE (vitest, e2e Chromium,
   next build) prima del merge. Batteria di mutazione per macrotask (ripristino backup+sha256, MAI git
   checkout — il macrotask è uncommitted).

NOTE OPERATIVE (dal repo, non riscoprirle):
  • Verdetto dal JSON del checkpoint (green/summary/controls[]), mai dall'exit code o via | tail.
  • Checkpoint MONOLITICO in background detached = 0xC0000142 → decomporre (foreground funziona per
    build/e2e/vitest/driver). run_checkpoint --baseline vuole un file ARRAY.
  • e2e/ escluso da jscpd. RLS della nuova tabella (OGW-101) provata a runtime (rls_check + test).
  • Guardie di rotta condivise: _shared/request-guard (same-origin/byte) + route-guards (identità/proprietà
    P1-D21). Nessun service_role nel percorso utente.
  • Anti-invenzione: ogni output AI è editabile e non entra nel brief senza conferma; catch degli endpoint
    che LOGGA (no 502 opaco).

Dopo aver letto SESSION-STATE: dichiara in poche righe lo stato, il macrotask scelto coi suoi
task/criteri/test, il branch preparato, ed eventuali blocchi. Poi attendi il mio via.
```

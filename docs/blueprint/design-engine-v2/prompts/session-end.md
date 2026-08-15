# session-end — Belora/Ulaba · design-engine-v2 (catalogo da Claude Design + varietà greedy)

> Da incollare **alla chiusura di ogni sessione**. Verifica che il checkpoint (e il gate visivo) siano
> girati, aggiorna SESSION-STATE, registra lo stato git e il deploy-coupling.

```
Chiudiamo la sessione su **design-engine-v2**. Aggiorna la fonte di verità dello stato vivo.

1) CHECKPOINT + GATE VISIVO — conferma che, per ogni macrotask toccato in questa sessione,
   run_checkpoint.mjs è girato e il verdetto è letto dal JSON (green, summary, controls[]) — dead-code
   · sicurezza · regressioni · conformità-logica sui target_tests — E che il GATE VISIVO umano
   (screenshot su /s/) è stato fatto. Se un macrotask è rimasto ROSSO o incompleto, o il gate visivo
   non ha convinto, NON dichiararlo done: registra lo stato reale (in_progress) e cosa manca. La
   BELLEZZA non è oracolabile: se le varianti reali non convincono all'occhio, va registrato, non
   nascosto dietro il verde.

2) AGGIORNA docs/blueprint/design-engine-v2/SESSION-STATE.md:
   • §1 Stato dei macrotask: foundation / hero / menu / body-sections / variety-select / e2e-visual-v2
     → todo | in_progress | done, con il commit del checkpoint e una riga di note (task coperti, esito
     4/4, igiene ri-catturata, eventuali FP baselinati, esito gate visivo).
   • §2 Macrotask corrente: il prossimo nel DAG e le sue dipendenze.
   • §3 Stato git: branch di lavoro, ultimo commit, stato merge su `main`, deploy-coupling (coupled).
   • §4 Baseline & budget: baseline di sicurezza/igiene ricatturate (valori), budget residuo.
   • §5 Carry-over: note ereditate ancora valide.
   • §6 Copertura dichiarata: quali AC/target_tests sono passati; cosa NON è coperto (dichiaralo, non
     riempirlo con una stima — L-COL-006; la bellezza estetica non è oracolabile).

3) STATO GIT — registra: mai lavorato su `main`; commit atomici sul branch (citano i task + esito
   gate); merge su `main` SOLO su autorizzazione esplicita (deploy-coupling coupled → il merge innesca
   il deploy su ulaba.net; deploy non supervisionato BLOCCATO). Verifica LOCALE fatta prima del merge
   (vitest, e2e Chromium, computed-style, next build).

4) MEMORIA — se qualcosa di non ovvio è emerso (una lezione, una decisione, un emendamento al ledger
   DS-V2-Dx), registralo: emendamento nel 00-INDEX §Decision ledger, lezione nella memoria di progetto
   (design-engine-v2-claude-design / design-engine-progress).

Chiudi con un riassunto di 3-5 righe: cosa è verde e mergiato, cosa resta, il prossimo macrotask.
```

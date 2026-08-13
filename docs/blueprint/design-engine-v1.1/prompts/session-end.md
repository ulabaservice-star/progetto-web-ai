# session-end — Belora/Ulaba · design-engine-v1.1 ("wow, meglio di Wix")

> Da incollare **alla chiusura di ogni sessione**. Verifica che il checkpoint sia girato, aggiorna
> SESSION-STATE, registra lo stato git e il deploy-coupling.

```
Chiudiamo la sessione su **design-engine-v1.1**. Aggiorna la fonte di verità dello stato vivo.

1) CHECKPOINT — conferma che, per ogni macrotask toccato in questa sessione, run_checkpoint.mjs è
   girato e il verdetto è letto dal JSON (green, summary, controls[]) — dead-code · sicurezza ·
   regressioni · conformità-logica sui target_tests. Se un macrotask è rimasto ROSSO o incompleto,
   NON dichiararlo done: registra lo stato reale (in_progress) e cosa manca. Ricorda: il NUCLEO
   (hero-menu-wow) è anche il gate umano di validazione dell'approccio — se le 5 varianti reali non
   convincono all'occhio, va registrato (eventuale Piano B, DS-D14), non nascosto dietro il verde.

2) AGGIORNA docs/blueprint/design-engine-v1.1/SESSION-STATE.md:
   • §1 Stato dei macrotask: editorial-skin / variety-engine / hero-menu-wow / section-inventory /
     e2e-visual-v11 → todo | in_progress | done, con il commit del checkpoint e una riga di note
     (task coperti, esito 4/4, igiene, eventuali FP baselinati).
   • §2 Macrotask corrente: il prossimo nel DAG e le sue dipendenze.
   • §3 Stato git: branch di lavoro, ultimo commit, stato merge su `main`, deploy-coupling (coupled).
   • §4 Baseline & budget: baseline di sicurezza/igiene ricatturate (valori), budget residuo.
   • §5 Carry-over: note ereditate ancora valide.
   • §6 Copertura dichiarata: quali AC/target_tests sono passati; cosa NON è coperto (dichiaralo, non
     riempirlo con una stima — L-COL-006; la bellezza estetica non è oracolabile).

3) STATO GIT — registra: mai lavorato su `main`; commit atomici sul branch (citano i task + esito
   gate); merge su `main` SOLO su autorizzazione esplicita (deploy-coupling coupled → il merge
   innesca il deploy su ulaba.net; deploy non supervisionato BLOCCATO). Verifica LOCALE fatta prima
   del merge (vitest, e2e Chromium, computed-style, next build).

4) MEMORIA — se qualcosa di non ovvio è emerso (una lezione, una decisione, un emendamento al ledger
   DS-Dx), registralo: emendamento nel 00-INDEX §4, lezione nella memoria di progetto
   (design-engine-progress).

Chiudi con un riassunto di 3-5 righe: cosa è verde e mergiato, cosa resta, il prossimo macrotask.
```

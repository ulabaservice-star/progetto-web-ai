# VISION-AND-CONSTRAINTS — onboarding-guided-wizard

> Perché/per chi/non-goal del ridisegno onboarding di Ulaba/Belora. Design a monte:
> `docs/superpowers/specs/2026-08-18-onboarding-guided-wizard-design.md` (approvato).
> Ecosistema `supabase-jsts`. Prosa in italiano, identificatori in inglese.

## Perché

Con `design-engine-v2` la qualità di generazione è risolta ("meglio di Wix"). Il collo di
bottiglia è ora il **flusso d'ingresso**: l'onboarding chat-led (P1) è **inaffidabile**
(`update_brief` saltato/ritardato), **costoso e non governato** (nessun cap su turni/frequenza,
chat libera derivabile e usabile come chatbot generico), e **poco ergonomico** per raccogliere
dati strutturati un turno alla volta.

## Per chi

Micro-business locali (ristorazione, fitness, salone/studio, negozio artigiano, altro) in
IT/ES/LATAM. Utente non tecnico, spesso da mobile, poco tempo. Visione: "un Wix migliore" —
più facile, non più complicato.

## Cosa (decisione di fondo)

L'onboarding diventa un **wizard guidato deterministico**; l'AI si usa **solo on-demand** nei
tre punti in cui aggiunge valore reale: **import-URL** (riuso), **genera-descrizione**,
**suggerisci-offerte**. I dati strutturati entrano da campi/scelte (zero chiamate, nessuna
deriva). La **chat libera viene rimossa**. La spesa AI è governata da un **contatore per-sito**
(cap → 429) + rate-limit; il cap crediti pieno resta P5.

## Non-goal (fuori scope, dichiarati)

- **Resa visiva delle offerte per settori non-ristorazione** — macrotask "settori" (roadmap),
  separato. Il modello dati delle offerte è già settore-agnostico; qui si tratta solo il FORM.
- **Billing / cap crediti (P5)** — l'onboarding vi si legherà quando esisterà.
- **Chat conversazionale / persistenza trascrizione** — ritirata; recuperabile come modello Z
  (wizard a risposte assistite) in futuro, senza rivoluzioni.
- **Rate-limit distribuito d'infrastruttura** — qui basta il contatore per-sito.

## Vincoli / invarianti

- **Anti-invenzione (P2-D7).** Ogni output AI è un **suggerimento editabile**; niente entra nel
  brief senza un clic dell'utente. Suggerimenti-offerte = **placeholder a prezzo vuoto**.
- **Brief, generazione e motore v2 INVARIATI**: il wizard scrive gli stessi campi via
  `applyBriefUpdate`/`upsertBrief`.
- **Sicurezza rotte**: same-origin/CSRF + tetto byte (`_shared/request-guard`), identità +
  proprietà sito (`route-guards`, P1-D21); nessuna `service_role` nel percorso utente (RLS).
- **Import = contenuto non fidato**: `fetchSafe` (timeout/anti-SSRF) + `extract_brief`
  ("solo i dati presenti, non inventare"); l'esito è una proposta rivedibile.
- **Un sito = una lingua** (locale è proprietà del sito).
- **Deploy-coupling `coupled`**: push su `main` = deploy su ulaba.net → merge human-gated.
- **Altitudine**: riuso del contratto globale del repo (`tests/architecture-contract.test.ts`);
  il blueprint NON ridichiara `architecture:`.

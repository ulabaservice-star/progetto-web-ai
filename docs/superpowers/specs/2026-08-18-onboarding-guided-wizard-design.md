# Onboarding guidato + AI mirata — design

> Design doc (brainstorming → spec) per il ridisegno dell'**onboarding** di Ulaba/Belora.
> Prosa in italiano, identificatori/nomi-file in inglese. Ecosistema: `supabase-jsts`
> (Next.js 16 App Router + TypeScript + Supabase). Segue il completamento di
> `design-engine-v2` (qualità di generazione risolta). Prossimo passo dopo l'approvazione:
> skill `writing-plans` → blueprint trueline → build.

## 1. Contesto e problema

Ulaba genera siti per **micro-business locali** (ristorazione, fitness, saloni/studi,
negozi artigiani, altro) in IT/ES/LATAM. L'utente-tipo **non è tecnico**, spesso da mobile,
ha poco tempo. La visione è "un **Wix migliore**": più facile, non più complicato.

Con `design-engine-v2` la **qualità visiva** della generazione è risolta (5 mockup davvero
diversi, "meglio di Wix"). Il collo di bottiglia si è spostato sul **flusso d'ingresso**:
l'onboarding oggi è **chat-led** (P1) e ha tre problemi, emersi al brainstorming:

1. **Affidabilità** — l'intervista chat chiama il tool `update_brief` in ritardo o lo
   salta: `tool_choice: auto` + prompt debole + una history rigiocata **solo-testo** (per
   sicurezza anti-injection, P1-D19: il modello non rivede le proprie tool-call). Risultato
   misurato: dati non registrati, l'onboarding non converge.
2. **Costo/controllo spesa** — l'endpoint del turno cappa il *singolo* turno (dimensione)
   ma **non** il numero di turni né la frequenza (dichiarato fuori scope in P1-D22). Una chat
   libera invita a conversazioni lunghe/off-topic ("com'è il tempo oggi?"), ognuna una
   chiamata LLM: spesa non governata, e un canale per usarci come chatbot generico.
3. **Ergonomia** — raccogliere dati **strutturati** (nome, tipo, orari, menu) un turno alla
   volta in linguaggio libero è **lento e fragile** proprio dove un form è veloce e sicuro.

## 2. Decisione di fondo

**L'onboarding diventa un wizard guidato deterministico, con l'AI usata solo dove aggiunge
valore reale.** I dati strutturati entrano da **campi e scelte** (zero chiamate, nessuna
deriva, nessuna allucinazione); l'AI si concentra su tre punti in cui fa risparmiare tempo:
**import da URL**, **generazione della descrizione**, **suggerimento delle offerte**. Tutte
le chiamate sono **on-demand** (scattano su un clic esplicito), quindi la spesa è governabile
per costruzione.

Conseguenza esplicita, accettata al brainstorming: **la chat libera esce di scena**, e con
essa il "fix dell'intervista" che era la richiesta iniziale — non c'è più un `update_brief`
conversazionale da rendere affidabile. L'AI non sparisce: si sposta dai punti in cui era
fragile e costosa (raccogliere "come ti chiami") a quelli in cui è magica (incolla il tuo
sito e ti compilo tutto).

Alternative considerate e scartate:
- **X — chat come spina dorsale + guardrail** (conversatore vincolato + cap-turni): massimo
  "feel AI", ma massimo costo/fragilità; le toppe raccontano il problema.
- **Z — wizard conversazionale a risposte assistite** (chat con chip di risposta rapida): via
  di mezzo valida, ma aggiunge complessità di UI conversazionale per un guadagno marginale su
  un form guidato ben fatto. Recuperabile in futuro senza rivoluzioni.

## 3. Principi invarianti (ereditati, non negoziabili)

- **Anti-invenzione (P2-D7, visione §5).** Il sito non mette in vetrina dati che l'utente non
  ha dato. Ogni output AI di questo flusso è un **suggerimento editabile** che l'utente
  conferma; **niente entra nel brief senza un suo clic**. Il gate a valle (`blocksFor`/
  `generatable`) resta intatto: un blocco senza dati reali non esiste.
- **Sicurezza delle rotte.** Le funzioni AI passano dalle guardie condivise
  (`_shared/request-guard`: same-origin/CSRF + tetto byte; `route-guards`: identità +
  proprietà del sito P1-D21). Nessuna `service_role` nel percorso utente (RLS attiva).
- **Import = contenuto non fidato.** `fetchSafe` (timeout, anti-SSRF) e `extract_brief`
  ("solo i dati presenti, non dedurre, non inventare") restano la difesa; l'output import è
  una **proposta** che l'utente rivede (mai auto-salvata).
- **Un sito = una lingua** (locale è proprietà del sito, non dato importabile/AI).
- **Determinismo del prodotto finale invariato:** il wizard scrive sugli **stessi campi**
  del `Brief` (T-121) via `applyBriefUpdate`/`upsertBrief`; la generazione (`/generate`) e il
  motore v2 **non cambiano**.

## 4. Flusso utente (il wizard)

Wizard a step con **"Salta"** sui non essenziali. Il minimo per generare resta basso
(nome + tipo + obiettivo): chi ha fretta salta il resto e genera; chi vuole cura completa.

- **Ingresso — due porte.**
  - *"Ho già un sito / Instagram"* → incolli l'URL → **import AI** (`fromUrl`) pre-compila il
    brief come **proposta** rivedibile.
  - *"Parto da zero"* → wizard vuoto.
- **Step 1 — Base** *(essenziale, zero AI):* nome (testo) · tipo di attività (bottoni:
  Ristorante/Palestra/Salone/Negozio/Altro, da `VERTICAL_OPTIONS`) · obiettivo (bottoni:
  Prenota/Ordina/Contatta, da `GOAL_OPTIONS`).
- **Step 2 — Racconto:** campo "descrivi in una frase cosa fai" + pulsante **✨ Genera
  descrizione** (AI: espande *le tue parole* in copy; resta editabile e confermabile).
- **Step 3 — Offerte** (etichetta per settore da `resolveOfferings`: Menu/Corsi/Servizi/
  Catalogo/Elenco): **editor generico** di voci `{nome · descrizione · prezzo opzionale ·
  gruppo}` + **✨ Suggerisci voci tipiche** (placeholder, vedi §6.3). Saltabile.
- **Step 4 — Contatti & orari** *(deterministico):* telefono/whatsapp/email/indirizzo (form)
  + **widget orari** già esistente (righe giorno→fascia).
- **Step 5 — Rivedi & conferma:** riepilogo completo editabile → **Genera** (`ReviewConfirm`
  esteso, poi `/generate`).

Il prezzo nell'editor offerte è **sempre editabile**; per i settori in cui il sito non lo
mostra (salone/studio, `show_price: false`) un **hint** lo spiega ("il prezzo non comparirà
sul sito per questo tipo di attività"). Nessun ramo per-settore nel form: solo etichette.

## 5. Architettura e componenti

`Brief`, `applyBriefUpdate`, `upsertBrief`, `briefToUpdate`, la generazione e il motore v2
sono **invariati**. Il wizard è una riorganizzazione del **layer UI onboarding** + due nuove
funzioni AI di dominio + un contatore di spesa.

| | |
|---|---|
| **Riuso as-is** | `fromUrl`+`fetchSafe`+`extract_brief` (import); **widget orari** di `BriefPanel`; `Brief`/`applyBriefUpdate`/`upsertBrief`; `resolveOfferings` (etichette settore); `ReviewConfirm`→`/generate`; guardie `_shared/request-guard` e `route-guards` |
| **Cambio/estendo** | `BriefPanel` → offerte **editabili** + campi organizzati per step; `BriefCorePatch` (`brief-fields.ts`) esteso a `offerings`; `OnboardingWorkspace` → **contenitore wizard a step** (navigazione, "Salta", stato condiviso); i `<select>` tipo/obiettivo → bottoni |
| **Rimuovo (deprecato)** | `ChatPanel`; `interview.ts` (`runInterviewTurn` + tool `update_brief`/`mark_ready`); `POST /api/onboarding/[siteId]/turn`; i test e le stringhe i18n della chat |
| **Creo** | `OfferingsEditor` (editor generico voci, label per-settore); dominio + endpoint per **genera-descrizione** e **suggerisci-offerte**; **contatore cost-control** per-sito; scaffolding wizard (step + navigazione) |

**Isolamento (design for clarity).** Ogni unità ha uno scopo unico e un confine chiaro:
- `OfferingsEditor` — edita `offerings[]` in memoria; input = voci + etichetta settore; output
  = `offerings[]` aggiornato via callback. Non conosce il DB.
- funzioni AI di dominio (`generateDescription`, `suggestOfferings`) — **pure rispetto
  all'I/O**: ricevono una **porta LLM iniettata** (come `runInterviewTurn` oggi), input
  strutturato (settore/frase), output validato con zod. Nessun accesso diretto al confine.
- endpoint AI — guardie + cost-control + chiamata alla funzione di dominio + risposta. Sottili.
- contenitore wizard — stato del brief in bozza + navigazione step; l'unica sede dello stato
  condiviso (come `OnboardingWorkspace` oggi per chat+panel).

## 6. Le funzioni AI mirate

Tutte **on-demand** (un clic = al più una chiamata), tutte dietro le guardie di rotta e il
cost-control (§7), tutte con output = **suggerimento editabile** (§3).

### 6.1 Import da URL — *riuso*
Invariato: `fromUrl` (`fetchSafe` + `extract_brief`). Wiring UI come porta d'ingresso del
wizard; l'esito pre-compila il brief-bozza come **proposta** (fusione già esistente
`mergeProposal`: sovrascrive i campi portati, non svuota le collezioni, riafferma il locale).

### 6.2 Genera-descrizione — *nuova*
Input: `vertical` (enum) + una frase libera dell'utente (cappata in lunghezza). Output: una
descrizione (copy) entro il tetto `BRIEF_LIMITS.description`, resa in un campo **editabile**.
Il prompt vincola il modello a **espandere le parole dell'utente**, non ad aggiungere fatti
(indirizzi, anni, premi) che l'utente non ha detto. Output ri-validato (lunghezza) prima di
proporlo; l'utente lo accetta/modifica/scarta. Modello: `getAnthropicOnboardingModel()`
(economico). Nessun contenuto esterno in ingresso → superficie di injection minima.

### 6.3 Suggerisci-offerte — *nuova, con guardia anti-invenzione esplicita*
Input: `vertical` (enum) + opzionale la descrizione già raccolta. Output: un elenco di voci
**tipiche del settore** (es. pizzeria → "Margherita", "Marinara"…) come **placeholder**:
- etichettate visibilmente "esempio — personalizzalo";
- **prezzo vuoto** e nessun dato di contatto/quantità inventato;
- **nessuna** entra nel `Brief` finché l'utente non la **conferma** (clic per voce);
- l'utente le modifica/scarta liberamente.

È l'unico punto in cui l'AI propone contenuto plausibile-ma-non-reale, e la mitigazione è
strutturale (placeholder + conferma esplicita per voce), non una nota nel prompt. Coerente
con P2-D7: senza conferma, nulla finisce nel sito. Output validato con zod (forma delle voci,
tetti) prima di proporlo.

## 7. Controllo della spesa

La spesa AI dell'onboarding è **solo on-demand**. Difesa in due livelli, entrambi per-sito:

1. **Contatore d'uso AI per-sito (persistito).** Ogni chiamata riuscita a una delle tre
   funzioni (import / genera-descrizione / suggerisci-offerte) incrementa un contatore legato
   al `siteId`. Oltre un **tetto** (parametro, default d'ordine ~**20 usi totali** per sito —
   un onboarding curato ne usa 3-6), l'endpoint risponde **429** e la UI disabilita i pulsanti
   ✨ con un messaggio ("hai raggiunto il limite di assistenza AI per questo sito"). Il wizard
   resta **pienamente usabile a mano** (i campi non dipendono dall'AI).
2. **Rate-limit leggero anti-raffica** (parametro, es. pochi usi/minuto per sito): chiude lo
   scripting automatico. Realizzabile con lo stesso contatore + finestra temporale, o rimandato
   all'infra se già disponibile.

Il contatore vive lato server (RLS per-sito). Sede esatta (colonna su tabella esistente vs
tabella `onboarding_ai_usage`) → decisione del **piano di implementazione**; requisito qui:
per-sito, persistito, RLS owner-only, incrementato **solo su chiamata riuscita**.

Il **cap crediti pieno** resta **P5** (billing): quando esisterà, l'onboarding potrà legarsi
al ledger; fino ad allora contatore + rate-limit sono la difesa. Lo **spend cap Anthropic**
(hard, globale) resta l'ultima rete.

## 8. Modello dati

- `Brief` (T-121) **invariato**. Il wizard scrive gli stessi campi.
- `BriefCorePatch` (`brief-fields.ts`) **esteso** con `offerings` (e valutare
  `highlights`/`social_links`) così l'editor può persistere via il canale esistente
  (`upsertBrief`/`briefToUpdate` già accettano `offerings`).
- **Contatore d'uso AI** per-sito (nuovo): `{ site_id, count, window? }`, RLS owner-only, FK a
  `sites`. Nessun dato sensibile.

## 9. Gestione degli errori

- **Import fallito** (timeout/SSRF-block/estrazione vuota): messaggio non bloccante; il wizard
  prosegue a mano (l'import è un acceleratore, non un requisito).
- **Genera-descrizione / suggerisci-offerte falliti** (guasto LLM, 502): messaggio locale sul
  pulsante; **nessun consumo di stato** (il brief resta invariato). Il catch **logga** la causa
  reale server-side (lezione del 502 opaco già corretta altrove).
- **Cap raggiunto** (429): pulsanti ✨ disabilitati con messaggio; wizard usabile a mano.
- **Output AI fuori forma**: scartato dalla ri-validazione zod → nessun suggerimento proposto,
  non uno stato a metà.

## 10. Testing

- **Dominio (unit, doppio LLM iniettato):** `generateDescription`/`suggestOfferings`
  deterministici con una porta LLM finta — validazione output, tetti, anti-invenzione (un
  input che tenta di far aggiungere fatti resta espansione delle parole date; le voci suggerite
  sono placeholder a prezzo vuoto). `resolveOfferings` etichette per-settore già coperto.
- **Cost-control:** il contatore incrementa solo su successo; al tetto → 429; il rate-limit
  scatta nella finestra. Test deterministici (nessun orologio reale: finestra iniettata).
- **UI (component/integration):** wizard naviga fra gli step, "Salta" preserva il minimo per
  generare; `OfferingsEditor` aggiunge/edita/scarta voci; i suggerimenti non entrano senza
  conferma; il pannello non rende mai testo non fidato in `innerHTML`/`href` (invariante T-151).
- **Sicurezza (rotte):** gli endpoint AI passano le stesse guardie di `/turn` (same-origin,
  ownership, byte cap) — riuso dei pattern/test esistenti.
- **e2e:** un percorso "import → step → genera" e un percorso "da zero → minimo → genera"
  arrivano a un documento pubblicabile; l'AbUso (raffica) è respinto.
- **Regressione:** la rimozione della chat non rompe la generazione (il brief prodotto è lo
  stesso); i test della chat vengono ritirati con la loro superficie (migrazione onesta).

## 11. Migrazione / rimozione della chat

Rimozione ordinata, non un taglio secco:
- eliminare `ChatPanel`, `interview.ts`, `POST /turn`, i loro test e le stringhe i18n;
- il modello onboarding (`getAnthropicOnboardingModel`) **resta** ma serve le funzioni AI
  mirate (import + genera + suggerisci), non più la chat;
- `OnboardingWorkspace` riscritto attorno al wizard (lo stato condiviso resta lì).
Nessun dato migra: il `Brief` è invariato, i siti già in onboarding ripartono dal wizard con
lo stesso brief persistito.

## 12. Fuori scope (dichiarato)

- **Resa visiva delle offerte per settori non-ristorazione** — il catalogo Claude Design
  tradotto in v2 è di ristorazione; fitness/salone/negozio usano oggi le varianti "universali".
  Cataloghi visivi per-settore = macrotask **"E — settori"** già in roadmap, separato.
- **Billing / cap crediti (P5)** — l'onboarding vi si legherà quando esisterà.
- **Persistenza della trascrizione / chat conversazionale** — ritirata; recuperabile in futuro
  come modello Z (wizard a risposte assistite) senza rivoluzioni.
- **Rate-limit distribuito d'infrastruttura** — qui basta il contatore per-sito; l'edge rate
  limit è infra.

## 13. Rischi e domande aperte

- **Qualità di "genera-descrizione"** su un modello economico: se debole, valutare il modello
  di generazione per questo solo passo (on-demand, costo trascurabile). Da misurare in build.
- **UX dei suggerimenti-offerte**: il confine "esempio da personalizzare" deve essere ovvio a
  colpo d'occhio, o l'utente pubblica placeholder. Gate visivo in build.
- **Taratura del cap e del rate-limit**: i default (~20 usi/sito, pochi/minuto) sono stime da
  confermare sui costi reali misurati.
- **Sede del contatore** (colonna vs tabella dedicata): decisione del piano.

## 14. Prossimo passo

Approvazione di questo spec → skill `writing-plans` per il blueprint trueline (task atomici
con DoD/AC/target_tests) → build con checkpoint + gate visivo, deploy-coupling `coupled`
(merge human-gated).

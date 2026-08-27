# project-start — p5-custom-domains-fase2

> Da incollare UNA volta all'avvio del workstream (prima sessione), per orientare l'agente al blueprint,
> alle decisioni bloccate, al piano di macrotask e alle invarianti dell'intera Fase 2.

```
Avvio il workstream **p5-custom-domains-fase2** (Fase 2 di P5 — domini custom) di Ulaba/Belora
(supabase-jsts). Seguito di p5-billing-fase1 (nucleo billing, DAG chiuso). Il blueprint è il piano:
si costruisce secondo i task, non si ridiscute il design (le decisioni sono bloccate nel ledger).

1) LEGGI PRIMA di qualunque azione:
   • docs/blueprint/p5-custom-domains-fase2/VISION-AND-CONSTRAINTS.md (perché, per chi, non-goals, vincoli)
   • docs/blueprint/p5-custom-domains-fase2/00-INDEX.md (mappa macrotask, DAG, decision ledger DOM-D1…D10)
   • docs/blueprint/p5-custom-domains-fase2/SESSION-STATE.md (stato vivo)
   • i moduli 01–06 (task atomici con definition_of_done · acceptance_criteria · target_tests)

2) DECISIONI BLOCCATE (decision ledger — non ridiscuterle, sono input umano):
   • DOM-D1 solo connessione, non vendita (non siamo un registrar)
   • DOM-D2 provider = Vercel Domains API dietro la porta DomainProvider (scelto su costi vs Cloudflare)
   • DOM-D3 apex + sottodominio; DOM-D4 verifica DNS obbligatoria prima dell'attivazione
   • DOM-D5 entitlement custom_domain mosso solo dal server; DOM-D6 lettura routing pubblica minima (attivi-only)
   • DOM-D7 reserved-domains non collegabili; DOM-D8 downgrade morbido reversibile (mai delete)
   • DOM-D9 provider inerte senza env Vercel; DOM-D10 altitudine dal contratto globale (no blocco architecture)
   • DOM-D11 auto-www: collegare l'apex collega anche il www (companion); il subdomain no

3) PIANO DI BUILD — 12 macrotask PICCOLI (BUILD sessione-per-sessione, poco contesto a sessione).
   DAG: primi eleggibili {domain-schema, domain-hostname, domain-port}; poi domain-companion+domain-dns
   (da hostname), domain-vercel (da port), domain-store+domain-routing (da schema); domain-connect
   (schema+hostname+companion+port+store) → domain-verify-disconnect → domain-ui; domain-downgrade
   (schema+store). Un macrotask alla volta; checkpoint al confine. Dettaglio in 00-INDEX §Build order.

4) INVARIANTI (valgono per tutta la Fase 2):
   entitlement dal server (client legge, non decide); verifica di proprietà DNS PRIMA dell'attivazione;
   RLS con account_id/owner esplicito (mai USING(true)); lettura di routing anon limitata ai domini
   attivi + colonne minime; nessun service_role nel percorso utente/edge; provider dietro porta + inerte
   senza env; host-routing che non tocca locali/`/s/*` e degrada sicuro su host sconosciuto; host mai in
   innerHTML/href non sanificato; ui→domain lecito; git a strati + deploy-coupling coupled;
   oracle-as-judge + gate umano; retrocessione morbida senza perdita dati.

Poi passa al session-start per selezionare il primo macrotask (domains-core o domain-provider-port).
```

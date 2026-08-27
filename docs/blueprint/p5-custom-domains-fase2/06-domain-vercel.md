# 06-domain-vercel — Macrotask `domain-vercel`

> L'**adattatore Vercel** della porta (l'unico punto che conosce l'API Vercel). Un micro-task,
> isolato: server-only, lazy, env-gated, senza segreti nel sorgente. Gemello di `payment/stripe.ts`.

## Task atomici

```yaml
- id: DOM-211
  title: "Adattatore Vercel di DomainProvider (server-only, lazy, config iniettabile, no segreti hardcoded)"
  macrotask: "domain-vercel"
  depends_on: [DOM-201]
  objective: >
    Implementare DomainProvider contro la Vercel Domains/Projects API. import 'server-only'; client
    HTTP costruito LAZY dietro config iniettabile (token/projectId/teamId + apexTarget/cnameTarget da
    env), così importarlo senza chiavi non lancia. Mappa le risposte Vercel negli esiti neutri della
    porta; errori tipizzati e loggati (mai 502 opaco, mai token nei log). Senza env => no-op dichiarato.
  definition_of_done:
    - "src/data/domain/vercel.ts con import 'server-only' + createVercelDomainProvider(config) e getVercelDomainProvider() (cache lazy da env)"
    - "VercelDomainConfig { token, projectId, teamId?, apexTarget, cnameTarget }; nessun segreto hardcoded"
    - "addDomain/removeDomain/getVerificationStatus mappano le risposte Vercel negli esiti neutri; errori tipizzati e loggati, non un throw opaco"
    - "senza VERCEL_TOKEN/VERCEL_PROJECT_ID il provider è costruibile ma le operazioni sono no-op dichiarato (DOM-D9)"
  acceptance_criteria:
    - id: AC-211-1
      given: "il modulo vercel.ts importato senza alcuna env Vercel"
      when: "lo si importa"
      then: "non lancia (client lazy; nessuna lettura di env a import-time)"
    - id: AC-211-2
      given: "una config iniettata che simula una risposta Vercel 'verified' per un host"
      when: "si chiama getVerificationStatus(host)"
      then: "ritorna l'esito neutro 'verified' (mappatura corretta)"
    - id: AC-211-3
      given: "una config che simula 'domain già usato' su addDomain"
      when: "si chiama addDomain(host)"
      then: "ritorna/solleva un esito tipizzato (non un throw opaco), loggato, senza esporre il token"
    - id: AC-211-4
      given: "il file dell'adattatore"
      when: "si cercano segreti hardcoded (gitleaks)"
      then: "nessun token/chiave nel sorgente; il token arriva solo da config/env"
  target_tests:
    - file: "tests/domain-vercel-adapter.test.ts"
      covers: [AC-211-1, AC-211-2, AC-211-3, AC-211-4]
  security_notes:
    - "A07:2025/A02:2025 segreti — VERCEL_TOKEN/projectId sono config di deploy (env Vercel), MAI nel sorgente; import 'server-only' li tiene fuori dal bundle client (gitleaks verde)"
    - "A01:2025 SSRF — l'adattatore chiama SOLO l'endpoint fisso dell'API Vercel, mai un URL derivato dall'hostname dell'utente; nessun probe HTTP verso il dominio del cliente"
    - "Robustezza (gemello BIL-D5) — errori del provider tipizzati e loggati, mai un 502 opaco; il token non finisce nei log/errori"
  out_of_scope:
    - "L'orchestrazione connect/verify (macrotask domain-connect / domain-verify)"
```

## Self-check

- **Checkpoint**: `import 'server-only'`, costruzione lazy, nessun segreto hardcoded (`gitleaks`).
  **Mutazione**: lettura di env a import-time → AC-211-1 rosso; token letterale nel sorgente → AC-211-4
  rosso.

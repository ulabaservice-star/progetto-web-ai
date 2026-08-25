-- BIL-202 (macrotask stripe-checkout-webhook, p5-billing-fase1) — Ledger di IDEMPOTENZA del
-- webhook: un event id per riga, registrato SOLO ad avvenuta applicazione dell'evento. Il
-- provider ri-consegna lo stesso evento (BIL-D5): il webhook consulta questo ledger e NON
-- riapplica un evento gia' visto.
--
-- MODELLO DI SICUREZZA — tabella PURAMENTE INTERNA al webhook (service_role), NON user-facing.
-- A differenza di subscriptions/onboarding_ai_usage (owner-only, account_id nella policy),
-- qui NON c'e' colonna di tenancy: un event id del provider e' globale, non appartiene a un
-- account. Percio' NON esiste alcun accesso client: RLS ABILITATA (default-deny per ogni
-- comando, nessuna policy per anon/authenticated) + GRANT solo a service_role. anon e
-- authenticated => 42501 su qualunque verbo. Solo il webhook (service_role, fuori dal
-- percorso utente) legge/scrive qui. La RLS abilitata senza policy client e' DELIBERATA: e'
-- la forma piu' stretta (nessuno passa dal percorso utente), coerente con "service_role
-- confinato server-side" (R7).
--
-- Applicata dopo subscriptions (20260825000100): indipendente da essa (nessuna FK), ma
-- concettualmente parte dello stesso canale webhook.

-- ── Tabella ────────────────────────────────────────────────────────────────────

create table public.billing_webhook_events (
  -- Id opaco dell'evento presso il provider (Stripe: evt_...). PK: la dedup per event id
  -- diventa STRUTTURALE (una riga per evento); un secondo insert dello stesso id => 23505.
  event_id    text        primary key,
  -- Istante di registrazione (osservabilita'/eventuale retention futura). Default = rete.
  received_at timestamptz not null default now()
);

comment on table public.billing_webhook_events is
  'Ulaba/Belora — ledger di idempotenza del webhook billing (BIL-202): un event id del provider per riga, scritto solo ad avvenuta applicazione; tabella INTERNA (service_role), NON user-facing: RLS abilitata senza policy client (default-deny) + GRANT solo service_role => anon/authenticated negati.';

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table public.billing_webhook_events enable row level security;

-- DENY ESPLICITO per authenticated: la tabella non ha percorso utente (nessuna tenancy), quindi
-- il predicato e' la costante `false` — nessuna riga, mai. E' voluto (non una dimenticanza di
-- policy): documenta in chiaro che il client non legge/scrive qui e la muove solo il webhook
-- via service_role (che bypassa la RLS). Difesa a due strati col revoke sottostante (nessun
-- GRANT a authenticated): l'una o l'altro basterebbe, insieme sono ridondanza voluta. Nessuna
-- policy anon (nessun accesso pubblico): anon => 42501.
create policy billing_webhook_events_deny_authenticated
  on public.billing_webhook_events
  for select
  to authenticated
  using (false);

-- ── GRANT privilegi ai ruoli della Data API ──────────────────────────────────────
-- config.toml non attiva auto_expose_new_tables: GRANT espliciti. revoke all annulla anche
-- REFERENCES/TRIGGER/TRUNCATE delle default privileges della piattaforma (TRUNCATE BYPASSA la
-- RLS). NIENTE ad anon/authenticated (nessun accesso client). service_role: select (dedup) +
-- insert (registrazione); niente update/delete (append-only; l'idempotenza non si riscrive).
revoke all on public.billing_webhook_events from anon, authenticated, service_role;
grant select, insert on public.billing_webhook_events to service_role;

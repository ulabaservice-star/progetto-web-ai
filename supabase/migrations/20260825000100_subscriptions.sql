-- BIL-101 (macrotask entitlement-core, p5-billing-fase1) — Abbonamento di un account,
-- isolato per proprietario via RLS in SOLA LETTURA (OWASP A01:2025 + BIL-D2).
--
-- SCOPO: rappresentare lo stato del piano di un ACCOUNT (non di un sito: il n. di siti
-- e una feature del piano, e `accounts` e gia l'entita di tenancy). La riga esiste solo
-- quando c'e un abbonamento presso il provider; la sua ASSENZA significa piano 'free'
-- (resolveEntitlement(null) => free, BIL-102). I LIMITI non stanno qui: sono costanti
-- pure in codice (PLAN_LIMITS, BIL-D3), cambiarle e un deploy, non una migrazione.
--
-- MODELLO DI SICUREZZA — owner-only, SOLA LETTURA client (BIL-D2). Gemello di
-- onboarding_ai_usage (owner-only, account_id ESPLICITO nel testo della policy: lezione
-- RLS004, l'isolamento resta auditabile staticamente dall'oracolo RLS solo se la colonna
-- di tenancy compare nel TESTO; mai USING(true), mai predicato nascosto in una funzione
-- DEFINER). MA con le scritture client AZZERATE DEL TUTTO: qui esiste SOLO la policy
-- SELECT. NIENTE INSERT/UPDATE/DELETE per `authenticated` E' DELIBERATO — l'entitlement
-- lo muove SOLO il webhook del payment provider (service_role, fuori dal percorso utente,
-- firma verificata, BIL-D5). Un utente che potesse scrivere la propria subscription si
-- auto-concederebbe 'pro' (self-grant) o si azzererebbe un downgrade (self-reset): la
-- SOLA lettura chiude entrambi. Difesa a DUE strati: assenza di policy DML + assenza di
-- GRANT DML a authenticated (una sola delle due basterebbe; insieme sono ridondanza
-- voluta). Nessuna policy/GRANT anon: la tabella non ha colonne pubbliche -> anon = 42501.
--
-- account_id come PRIMARY KEY: "una sola subscription per account" diventa STRUTTURALE
-- (la PK e UNIQUE + NOT NULL), non un vincolo aggiunto. La FK -> accounts(id) on delete
-- cascade fa cadere la subscription con l'account (a cascata dall'utente owner).
--
-- Applicata dopo tenancy (public.accounts, public.is_account_member, 20260723000100):
-- questi esistono gia.

-- ── Tabella ────────────────────────────────────────────────────────────────────

create table public.subscriptions (
  -- Colonna di tenancy E chiave: ancoraggio delle policy RLS e "una per account".
  -- on delete cascade: rimosso l'account, la sua subscription cade con esso.
  account_id               uuid primary key references public.accounts (id) on delete cascade,
  -- Piano corrente presso il provider. 'business' e dichiarato ma Oltre-P5 (agenzie):
  -- il CHECK lo ammette per non richiedere una migrazione quando arrivera. La MAPPA dei
  -- limiti (PLAN_LIMITS) vive in codice, non qui.
  plan                     text        not null check (plan in ('free', 'pro', 'business')),
  -- Stato dell'abbonamento presso il provider. 'past_due' e servito ancora Pro fino a
  -- fine grazia (downgrade morbido, BIL-D6); 'canceled'/scaduto => resolveEntitlement
  -- degrada a 'free'. Il check vincola i valori: metadato di stato, non un canale di authz.
  status                   text        not null check (status in ('active', 'trialing', 'past_due', 'canceled')),
  -- Provider di pagamento astratto dietro la porta PaymentProvider (BIL-D4): 'stripe'
  -- oggi, un adattatore LATAM domani. Nullable: una riga puo preesistere all'aggancio.
  provider                 text,
  -- Identificatori opachi del provider (per il webhook e il billing portal). Nullable.
  provider_subscription_id text,
  provider_customer_id     text,
  -- Fine del periodo pagato: sostiene la scadenza (resolveEntitlement confronta con 'now'
  -- iniettato, BIL-D3). Nullable: 'free'/assenza non ha periodo.
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  -- Ultimo movimento della riga (lo scrive il webhook). Il default e rete di sicurezza.
  updated_at               timestamptz not null default now()
);

comment on table public.subscriptions is
  'Ulaba/Belora — abbonamento di un account (BIL-101): una riga per account (account_id PK); RLS owner-only in SOLA LETTURA (nessuna policy/GRANT DML a authenticated: il piano lo muove SOLO il webhook service_role, anti self-grant/self-reset); assenza di riga => piano free; nessuna colonna pubblica -> anon negato.';

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table public.subscriptions enable row level security;

-- SELECT (membri): un membro legge SOLO la subscription dei propri account. account_id
-- nel testo -> isolamento auditabile (R4); nessuna USING(true). E' l'UNICA policy: la
-- RLS nega di default i comandi privi di policy, quindi INSERT/UPDATE/DELETE del client
-- sono in DEFAULT-DENY. Nessuna policy anon (nessuna colonna pubblica): anon = 42501.
create policy subscriptions_select_member
  on public.subscriptions
  for select
  to authenticated
  using (public.is_account_member(account_id));

-- NESSUNA policy INSERT/UPDATE/DELETE per authenticated: SOLA LETTURA (vedi intestazione,
-- BIL-D2). L'entitlement lo muove solo il webhook (service_role, fuori dal percorso utente).

-- ── GRANT privilegi ai ruoli della Data API ──────────────────────────────────────
-- config.toml non attiva auto_expose_new_tables: GRANT espliciti (RLS = gate FINE su
-- quali righe; GRANT = gate COARSE su quali tabelle/verbi rispondono via PostgREST).
-- revoke all annulla anche REFERENCES/TRIGGER/TRUNCATE delle default privileges della
-- piattaforma (TRUNCATE BYPASSA la RLS). NIENTE ad anon. authenticated: SOLO select
-- (sola lettura, secondo strato oltre l'assenza di policy DML). service_role
-- (webhook/setup/oracolo/cleanup): tutte le scritture, ma bypassa comunque la RLS ed e
-- fuori dal percorso utente.
revoke all on public.subscriptions from anon, authenticated, service_role;
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;

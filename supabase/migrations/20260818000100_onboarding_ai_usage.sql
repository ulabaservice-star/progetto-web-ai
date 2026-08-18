-- OGW-101 (macrotask ai-usage-guard, onboarding-guided-wizard) — Contatore d'uso AI
-- dell'onboarding, PER-SITO, isolato per proprietario via RLS (OWASP A01:2025).
--
-- SCOPO (OGW-D4): governare la spesa dei tre pulsanti AI on-demand (import da URL /
-- genera-descrizione / suggerisci-offerte). NON e' il ledger crediti (P5): e' un
-- contatore anti-abuso. Ogni uso RIUSCITO scrive UNA riga (modello righe-per-uso):
-- il conteggio totale per sito sostiene il CAP (-> 429), il conteggio nella finestra
-- temporale sostiene il RATE-LIMIT anti-raffica. La decisione vive nel dominio
-- (checkAiBudget, OGW-102), deterministica: la finestra 'now' e i tetti sono iniettati
-- dal call-site, mai letti da un orologio nel dominio.
--
-- MODELLO DI SICUREZZA — owner-only, account_id ESPLICITO (lezione RLS004 di tenancy:
-- l'isolamento resta auditabile staticamente dall'oracolo RLS solo se la colonna di
-- tenancy compare nel TESTO della policy; mai USING(true), mai predicato nascosto in
-- una funzione DEFINER che lo static check non vede). Le policy ancorano a
-- public.is_account_member(account_id) (20260723000100): un utente tocca SOLO il
-- contatore dei siti dei propri account. Nessuna policy/GRANT anon: il contatore non
-- ha colonne pubbliche -> anon SELECT = 42501.
--
-- APPEND-ONLY (scelta di sicurezza, non minimalismo): per `authenticated` esistono SOLO
-- le policy SELECT e INSERT. NIENTE UPDATE/DELETE lato utente E' DELIBERATO: un contatore
-- anti-abuso su cui l'utente potesse DELETE le proprie righe si azzererebbe da solo,
-- aggirando il cap; un UPDATE falsificherebbe used_at per eludere il rate-limit. La
-- pulizia delle righe avviene solo per CASCADE (rimosso il sito o l'account, le sue
-- righe d'uso cadono con esso), mai per mano dell'utente.
--
-- FK COMPOSITA (account_id, site_id) -> sites (account_id, id): difesa in profondita'
-- (come assets/site_briefs). La RLS ancora account_id ma non lega da sola site_id
-- all'account; senza questo vincolo un tenant potrebbe, via PostgREST col PROPRIO
-- account_id (legittimo per la WITH CHECK), scrivere una riga d'uso ancorata al sito
-- ALTRUI. Poggia su sites_account_id_id_key (unique su (account_id, id), 20260724000200).
--
-- Applicata dopo tenancy (public.accounts, public.is_account_member) e sites (col vincolo
-- sites_account_id_id_key): questi esistono gia'.

-- ── Tabella ────────────────────────────────────────────────────────────────────

create table public.onboarding_ai_usage (
  id         uuid primary key default gen_random_uuid(),
  -- Colonna di tenancy: ancoraggio delle policy RLS. on delete cascade: rimosso
  -- l'account (a cascata dall'utente owner) le sue righe d'uso cadono con esso.
  account_id uuid not null references public.accounts (id) on delete cascade,
  -- Nessuna FK indipendente su site_id: la coerenza site<->account e' imposta dalla FK
  -- COMPOSITA in coda. Una FK semplice direbbe "il sito esiste", non "e' TUO".
  site_id    uuid not null,
  -- Istante dell'uso: sostiene il conteggio nella finestra (rate-limit). Il dominio
  -- passa 'at' esplicito (nessun orologio nel dominio); il default e' rete di sicurezza.
  used_at    timestamptz not null default now(),
  -- Quale dei tre pulsanti AI on-demand ha generato l'uso. Il check vincola i valori
  -- ammessi: metadato per l'osservabilita', non un canale di autorizzazione.
  kind       text not null check (kind in ('import', 'generate_description', 'suggest_offerings')),
  -- FK COMPOSITA (account_id, site_id) -> sites (account_id, id). on delete cascade:
  -- rimosso il sito, le sue righe d'uso cadono con esso.
  constraint onboarding_ai_usage_account_site_fk
    foreign key (account_id, site_id)
    references public.sites (account_id, id) on delete cascade
);

comment on table public.onboarding_ai_usage is
  'Ulaba/Belora — contatore d''uso AI dell''onboarding (OGW-101): una riga per uso riuscito dei tre pulsanti on-demand; account-scoped; RLS owner-only APPEND-ONLY (no UPDATE/DELETE utente: il contatore non si azzera per aggirare il cap); nessuna colonna pubblica -> anon negato.';

-- ── Indici ──────────────────────────────────────────────────────────────────────
-- R9: colonne di policy e di conteggio indicizzate. Indice dedicato su account_id
-- (colonna di policy RLS) come sites/assets. Indice composito (site_id, used_at):
-- copre sia il conteggio TOTALE per sito (cap) sia il conteggio nella FINESTRA
-- (rate-limit, range su used_at) senza scansione piena.
create index onboarding_ai_usage_account_id_idx on public.onboarding_ai_usage (account_id);
create index onboarding_ai_usage_site_used_idx on public.onboarding_ai_usage (site_id, used_at);

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table public.onboarding_ai_usage enable row level security;

-- SELECT (membri): un membro conta/legge SOLO le righe d'uso dei propri account.
-- account_id nel testo -> isolamento auditabile (R4); nessuna USING(true). Nessuna
-- policy anon (il contatore non ha colonne pubbliche): anon SELECT = 42501.
create policy onboarding_ai_usage_select_member
  on public.onboarding_ai_usage
  for select
  to authenticated
  using (public.is_account_member(account_id));

-- INSERT: si registra un uso SOLO in un account di cui si e' membri. La WITH CHECK e'
-- il gate a livello DB, indipendente dal codice applicativo; combinata con la FK
-- composita impedisce di ancorare la riga al sito di un altro tenant.
create policy onboarding_ai_usage_insert_member
  on public.onboarding_ai_usage
  for insert
  to authenticated
  with check (public.is_account_member(account_id));

-- NESSUNA policy UPDATE/DELETE per authenticated: append-only (vedi intestazione). La
-- RLS nega di default i comandi privi di policy -> l'utente non puo' azzerare/falsificare
-- il proprio contatore.

-- ── GRANT privilegi ai ruoli della Data API ──────────────────────────────────────
-- config.toml non attiva auto_expose_new_tables: GRANT espliciti (RLS = gate FINE su
-- quali righe; GRANT = gate COARSE su quali tabelle rispondono via PostgREST). revoke all
-- annulla anche REFERENCES/TRIGGER/TRUNCATE delle default privileges della piattaforma
-- (TRUNCATE BYPASSA la RLS). NIENTE ad anon. authenticated: solo select+insert (append-only,
-- coerente con l'assenza delle policy UPDATE/DELETE). service_role (setup/oracolo/cleanup):
-- anche delete, ma bypassa comunque la RLS ed e' fuori dal percorso utente.
revoke all on public.onboarding_ai_usage from anon, authenticated, service_role;
grant select, insert on public.onboarding_ai_usage to authenticated;
grant select, insert, delete on public.onboarding_ai_usage to service_role;

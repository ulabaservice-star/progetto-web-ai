-- PUB-201 (macrotask waitlist-schema, p6a-public-surface) — public.waitlist_leads:
-- i lead ANONIMI della waitlist della superficie pubblica. La postura RLS piu chiusa
-- del repo: RLS abilitata + ZERO policy (deny-all deliberato) + GRANT SOLO a service_role.
--
-- SCOPO: raccogliere le email di chi si iscrive alla waitlist dalla landing pubblica.
-- Il client (browser, ruoli anon/authenticated) NON legge e NON scrive MAI questa tabella:
-- l'iscrizione passa da un endpoint server (il writer PUB-211) che usa service_role e
-- BYPASSA la RLS, confinato server-side. UNIQUE su normalized_email da l'idempotenza: una
-- seconda iscrizione con la stessa email canonica solleva 23505 (il server la tratta come
-- gia-iscritto, senza rivelare nulla al client).
--
-- MODELLO DI SICUREZZA — RLS ZERO-POLICY (P6A-D5). Diverso da subscriptions/site_domains,
-- che sono owner-only ancorati a is_account_member: QUI NON C'E' UN OWNER. La waitlist e'
-- una superficie PUBBLICA e anonima, senza sessione e senza account a cui ancorare una
-- policy — quindi la postura corretta NON e' owner-only ma DENY-ALL: RLS abilitata con
-- ZERO policy per anon/authenticated. La RLS nega di default ogni comando privo di policy,
-- dunque SELECT/INSERT/UPDATE/DELETE del client sono tutti in DEFAULT-DENY. Poiche' questa
-- e' la postura VOLUTA (nessun accesso client, non un owner-only da completare), R2 (ogni
-- tabella deve avere almeno una policy o essere dichiarata deny-all) NON si applica: la
-- tabella e' deny-all DELIBERATO.
--
-- OWASP A01:2025 (Broken Access Control): `email` e `normalized_email` sono PII e non devono
-- essere MAI leggibili da un ruolo pubblico — un elenco di email raccolte e' un bersaglio da
-- esfiltrazione. Difesa a DUE strati, ridondanza voluta: (1) ASSENZA di policy anon/
-- authenticated (default-deny della RLS sulle righe) + (2) ASSENZA di GRANT anon/authenticated
-- (default-deny COARSE della Data API: nessun verbo risponde via PostgREST -> 42501 prima
-- ancora di valutare la RLS). Una sola delle due basterebbe; insieme sono difesa in profondita.
--
-- P6A-D7: NESSUN indirizzo IP in chiaro (niente colonna IP: minimizzazione del dato,
-- l'anti-spam vive altrove — honeypot + Turnstile + same-origin), e NESSUN double opt-in in
-- v1 (niente colonna di conferma / token: si raccoglie e basta). Tabella STANDALONE: nessuna
-- FK (non c'e' un account a cui legare un lead anonimo), nessun updated_at (i lead sono
-- append-only lato server; non si aggiornano).

-- ── Tabella ──────────────────────────────────────────────────────────────────

create table public.waitlist_leads (
  -- Chiave surrogata opaca. Nessun significato pubblico: il client non la vede mai.
  id               uuid        primary key default gen_random_uuid(),
  -- Email come inserita dall'utente (preservata per un eventuale invio futuro / audit lato
  -- server). PII: mai leggibile da anon/authenticated (nessun GRANT). La forma su cui si
  -- fa il match dell'idempotenza e' normalized_email.
  email            text        not null,
  -- Forma canonica dell'email (lowercased/trim: la normalizzazione vive nel writer PUB-211).
  -- UNIQUE: e' l'ancora dell'idempotenza — un duplicato solleva 23505, che il server assorbe.
  normalized_email text        not null,
  -- Lingua della landing da cui e' arrivato il lead. Vincolato alle due locali della
  -- superficie pubblica (P6A: IT + ES da subito).
  locale           text        not null check (locale in ('it', 'es')),
  -- Provenienza opzionale (campagna / pagina d'origine), popolata dal server. Nullable.
  source           text,
  created_at       timestamptz not null default now(),
  -- UNIQUE su normalized_email: idempotenza dell'iscrizione (una email canonica = un lead).
  unique (normalized_email)
);

comment on table public.waitlist_leads is
  'Ulaba/Belora — lead anonimi della waitlist (PUB-201): RLS zero-policy (deny-all deliberato, P6A-D5) solo-server (service_role bypassa la RLS; nessun accesso client); UNIQUE su normalized_email per l''idempotenza (duplicato => 23505). Nessun IP in chiaro, nessun double opt-in (P6A-D7).';

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.waitlist_leads enable row level security;

-- NESSUNA policy per anon/authenticated: DENY-ALL DELIBERATO (P6A-D5). La superficie e'
-- pubblica e anonima, senza owner da ancorare — la postura voluta e' "nessun accesso client",
-- non un owner-only. La RLS nega di default ogni comando privo di policy: SELECT/INSERT/
-- UPDATE/DELETE del client sono tutti in DEFAULT-DENY. Le scritture (solo INSERT, dal writer
-- PUB-211) passano ESCLUSIVAMENTE da service_role, che BYPASSA la RLS ed e' confinato
-- server-side (mai nel browser). Nessuna policy anon/authenticated qui e', e resta, corretto.

-- ── GRANT privilegi ai ruoli della Data API ──────────────────────────────────
-- config.toml non attiva auto_expose_new_tables: GRANT espliciti (RLS = gate FINE su quali
-- righe; GRANT = gate COARSE su quali tabelle/verbi rispondono via PostgREST). revoke all
-- annulla anche REFERENCES/TRIGGER/TRUNCATE delle default privileges della piattaforma
-- (TRUNCATE BYPASSA la RLS): le azzeriamo su TUTTA la superficie e ri-concediamo il
-- vocabolario preciso al SOLO service_role. NIENTE ad anon E NIENTE ad authenticated
-- (secondo strato oltre l'assenza di policy: la Data API risponde 42501 al client prima
-- ancora di valutare la RLS). Nessun UPDATE/DELETE nemmeno a service_role: il writer PUB-211
-- INSERISCE soltanto; downgrade/delete non sono previsti su questa tabella.
revoke all on public.waitlist_leads from anon, authenticated, service_role;
grant select, insert on public.waitlist_leads to service_role;

-- DOM-101/DOM-102 (macrotask domain-schema, p5-custom-domains-fase2) — public.site_domains:
-- il collegamento (mai la vendita, DOM-D1) fra un dominio del cliente e un suo sito
-- pubblicato. UNA migrazione, DUE superfici RLS distinte:
--
--  - DOM-101 — GESTIONE owner-only: il proprietario LEGGE/CREA/ELIMINA i propri
--    collegamenti (SELECT/INSERT/DELETE TO authenticated ancorate a is_account_member,
--    account_id ESPLICITO nel testo di OGNI policy -> isolamento auditabile staticamente,
--    lezione RLS004; mai USING(true)). NESSUNA policy UPDATE per authenticated E'
--    DELIBERATO (DOM-D4/D5): la transizione ad 'active' la muove SOLO il server
--    (service_role) DOPO la verifica DNS del provider — un utente che potesse fare UPDATE
--    si auto-attiverebbe un dominio non verificato (self-activation / domain-hijack).
--    Difesa a DUE strati come subscriptions: assenza di policy UPDATE + assenza di GRANT
--    UPDATE a authenticated.
--
--  - DOM-102 — ROUTING pubblico: l'host-routing gira sull'edge come `anon`, senza
--    sessione, e ha bisogno della SOLA lettura host->slug. UNA policy SELECT TO anon
--    vincolata a status='active' (anon vede SOLO gli attivi, mai un pending/suspended:
--    fail-closed, indistinguibile da inesistente, P1-D21) + GRANT COLUMN-LEVEL ad anon
--    sulle sole (normalized_hostname, public_slug). verification_token / account_id /
--    site_id NON sono leggibili da anon (difesa DB oltre la SELECT mirata del reader
--    DOM-401). Gemella della superficie anon di site_publications (P4).
--
-- public_slug e' DENORMALIZZATO qui (copia dello slug pubblico del sito, popolata dal
-- server sui collegamenti attivi): il reader di routing (DOM-401) proietta { public_slug }
-- da questa sola tabella come anon, senza join ne' esposizione di site_id (DOM-D6). Un
-- apex e il suo companion www (auto-www, DOM-D11) puntano allo stesso sito -> stesso
-- public_slug: nessun UNIQUE su public_slug (UNIQUE solo su normalized_hostname).
--
-- Applicata dopo tenancy (public.accounts, public.is_account_member, 20260723*) e sites
-- (col vincolo sites_account_id_id_key su (account_id, id)): questi esistono gia'.

-- ── Tabella ──────────────────────────────────────────────────────────────────

create table public.site_domains (
  id                  uuid primary key default gen_random_uuid(),
  -- Colonna di tenancy: ancoraggio delle policy RLS. on delete cascade: rimosso l'account
  -- (a cascata dall'utente owner), i suoi collegamenti cadono con esso.
  account_id          uuid        not null,
  -- Il sito servito da questo dominio. Nessuna FK indipendente: la coerenza sito<->account
  -- e' imposta dalla FK COMPOSITA in coda (site DEVE essere dell'account). on delete
  -- cascade dalla stessa FK composita.
  site_id             uuid        not null,
  -- Hostname come inserito dall'utente (preservato per la UI); la forma canonica per il
  -- match e' normalized_hostname. La normalizzazione (DOM-111) vive nel dominio puro.
  hostname            text        not null,
  -- Forma canonica su cui si fa il match esatto del routing. UNIQUE GLOBALE: due tenant
  -- non possono rivendicare lo stesso host (ancora d'identita del collegamento).
  normalized_hostname text        not null,
  -- apex (A/ALIAS) o subdomain (CNAME) — governa le istruzioni DNS (DOM-131) e l'auto-www
  -- (DOM-121: solo l'apex genera il companion www).
  kind                text        not null check (kind in ('apex', 'subdomain')),
  -- Ciclo di vita del collegamento. La transizione a 'active' la muove SOLO il server dopo
  -- la verifica DNS (nessuna UPDATE authenticated). anon vede solo gli 'active'.
  status              text        not null default 'pending'
                        check (status in ('pending', 'verifying', 'active', 'suspended', 'error')),
  -- Token di verifica di proprieta (record TXT). NON leggibile da anon (GRANT column-level).
  verification_token  text,
  -- Provider dietro la porta DomainProvider (DOM-D2): 'vercel' oggi, un adattatore domani.
  provider            text,
  -- Identificatore opaco del dominio presso il provider (per verify/disconnect). Nullable.
  provider_domain_id  text,
  -- Slug pubblico del sito, DENORMALIZZATO per la lettura di routing anon (DOM-D6): l'unica
  -- colonna, con normalized_hostname, che anon puo leggere. Popolato dal server sui domini
  -- attivi; nullable finche' il collegamento non serve un sito pubblicato.
  public_slug         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Momento della verifica DNS riuscita (lo scrive il server all'attivazione). NULL finche'
  -- non verificato.
  verified_at         timestamptz,
  -- UNIQUE GLOBALE su normalized_hostname: un host appartiene a un solo collegamento.
  unique (normalized_hostname),
  -- FK su account_id -> accounts(id): il collegamento appartiene a un account reale e cade
  -- con esso.
  constraint site_domains_account_fk
    foreign key (account_id) references public.accounts (id) on delete cascade,
  -- FK COMPOSITA: (account_id, site_id) DEVE combaciare con un sito DELL'account. Difesa in
  -- profondita OLTRE la RLS (lezione site_publications / T-120): la WITH CHECK della INSERT
  -- guarda solo account_id, quindi senza questo vincolo un tenant potrebbe, via PostgREST
  -- diretto col PROPRIO account_id, collegare un dominio al site_id di un ALTRO tenant.
  -- Poggia su sites_account_id_id_key. on delete cascade: rimosso il sito, i suoi domini
  -- cadono con esso.
  constraint site_domains_account_site_fk
    foreign key (account_id, site_id)
    references public.sites (account_id, id) on delete cascade
);

comment on table public.site_domains is
  'Ulaba/Belora — collegamento dominio custom<->sito (DOM-101/102): gestione RLS owner-only (SELECT/INSERT/DELETE, NESSUNA UPDATE authenticated: lo stato lo muove solo il server dopo la verifica DNS) + una SELECT anon sui soli attivi con GRANT column-level (normalized_hostname, public_slug) per l''host-routing; normalized_hostname unico globale.';

-- ── Indici ─────────────────────────────────────────────────────────────────
-- R9: colonne di policy e di join indicizzate. L'indice implicito dell'UNIQUE copre gia'
-- normalized_hostname (lookup del routing); indici dedicati per gli assi di tenancy/join.
create index site_domains_account_id_idx on public.site_domains (account_id);
create index site_domains_site_id_idx on public.site_domains (site_id);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.site_domains enable row level security;

-- DOM-101 — GESTIONE owner-only (TO authenticated). account_id ESPLICITO nel testo di ogni
-- policy -> isolamento auditabile (R4/R5); mai USING(true) (R3).

-- SELECT (membri): un membro legge SOLO i collegamenti dei propri account.
create policy site_domains_select_member
  on public.site_domains
  for select
  to authenticated
  using (public.is_account_member(account_id));

-- INSERT (membri): si crea un collegamento SOLO in un proprio account. La FK composita
-- garantisce inoltre che il site_id sia dell'account (difesa cross-tenant).
create policy site_domains_insert_member
  on public.site_domains
  for insert
  to authenticated
  with check (public.is_account_member(account_id));

-- DELETE (membri): si elimina un collegamento SOLO dei propri account.
create policy site_domains_delete_member
  on public.site_domains
  for delete
  to authenticated
  using (public.is_account_member(account_id));

-- NESSUNA policy UPDATE per authenticated (DOM-D4/D5): la transizione di stato (a 'active'
-- dopo la verifica DNS, a 'suspended' nel downgrade) la muove SOLO il server (service_role,
-- fuori dal percorso utente). Un UPDATE del client sarebbe self-activation di un dominio
-- non verificato.

-- DOM-102 — ROUTING pubblico (TO anon). Unica lettura senza sessione: SOLO gli attivi.
create policy site_domains_select_active_anon
  on public.site_domains
  for select
  to anon
  using (status = 'active');

-- ── GRANT privilegi ai ruoli della Data API ──────────────────────────────────
-- config.toml non attiva auto_expose_new_tables: GRANT espliciti (RLS = gate FINE su quali
-- righe; GRANT = gate COARSE su quali tabelle/colonne/verbi rispondono via PostgREST). Le
-- default privileges della piattaforma concedono da sole REFERENCES/TRIGGER/TRUNCATE a
-- TUTTI i ruoli (TRUNCATE BYPASSA la RLS): le annulliamo su TUTTA la superficie e
-- ri-concediamo il vocabolario preciso a ciascun ruolo (lezione P2-D19).
revoke all on public.site_domains from anon, authenticated, service_role;

-- authenticated: SELECT/INSERT/DELETE sulle proprie righe (le policy membro fanno il gate
-- fine). NIENTE UPDATE: secondo strato oltre l'assenza di policy UPDATE (anti self-activation).
grant select, insert, delete on public.site_domains to authenticated;

-- service_role (verify/disconnect/downgrade/setup/oracolo): tutte le scritture, incluso
-- UPDATE dello stato. Bypassa la RLS ma e' confinata server-side (mai nel browser).
grant select, insert, update, delete on public.site_domains to service_role;

-- anon: SELECT COLUMN-LEVEL SOLO su (normalized_hostname, public_slug) — la lettura minima
-- del routing (DOM-D6). Nessun GRANT di tabella (esporrebbe OGNI colonna): verification_token
-- / account_id / site_id restano irreferenziabili in lettura da anon (42501). Nessun GRANT
-- di scrittura anon.
grant select (normalized_hostname, public_slug) on public.site_domains to anon;

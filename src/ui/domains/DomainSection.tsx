'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@/ui/primitives';
import type { SiteDomainStatus } from '@/data/site-domains';
import {
  requestConnect,
  requestVerify,
  requestDisconnect,
  type ConnectedDomainView,
  type DnsRecordView,
} from '@/ui/domains/domain-calls';

// DOM-501/502 (macrotask domain-ui, p5-custom-domains-fase2) — la sezione "Dominio personalizzato".
// Presentazionale + stateful come le altre isole client (BillingPanel, SiteRow): RICEVE dal server
// il piano risolto (entitlement.custom_domain, DOM-D5/DOM-502) e i collegamenti gia' con le
// istruzioni DNS, e li RIFLETTE. La UI non decide l'entitlement e non e' la difesa: gli endpoint
// ri-gate dal server (DOM-301/311). Le tre azioni passano dagli endpoint guardati via domain-calls.
//
// GATE Pro/Free (DOM-502): plan==='pro' => il form di collegamento + gli stati/azioni dei domini;
// plan!=='pro' => la sola card "Passa a Pro" con link alla pagina Abbonamento, NESSUN form ne'
// pulsante (un Free non ha alcuna azione dominio, coerente col gate server DOM-301). Il ramo Free
// ritorna prima di montare qualunque controllo: non e' un form nascosto via CSS.
//
// ESCAPING (DOM-501 AC-501-4, A05:2025): l'hostname e i valori DNS sono input NON FIDATO. Sono resi
// SOLO come children di testo JSX (React li escapa) — mai dangerouslySetInnerHTML, mai interpolati
// in un href/src. Nessun link viene costruito dall'hostname dell'utente.

type Plan = 'free' | 'pro';

/** La vista di un collegamento come la riceve la sezione dal server (owner-side, con istruzioni DNS). */
export type DomainView = {
  readonly hostname: string;
  readonly status: SiteDomainStatus;
  readonly records: readonly DnsRecordView[];
};

type DomainSectionProps = {
  /** Il piano EFFETTIVO risolto server-side (getAccountEntitlement, DOM-502): la UI lo riflette. */
  readonly plan: Plan;
  /** Il sito a cui i collegamenti appartengono (passato al POST /connect; mai l'accountId). */
  readonly siteId: string;
  /** I collegamenti gia' esistenti, risolti server-side (owner-side RLS) con le istruzioni DNS. */
  readonly initialDomains: readonly DomainView[];
  /** Destinazione della CTA di upgrade (pagina Abbonamento del locale), costruita dal server. */
  readonly subscriptionHref: string;
};

// L'etichetta di stato mappata a CHIAVI LETTERALI (mai un template dinamico: cosi' resta una chiave
// valida del catalogo e tsc la verifica, come statusLabelKey di BillingPanel). Esaustiva sull'unione
// SiteDomainStatus: nessun default, cosi' un nuovo stato non compilato e' un errore di build, non un
// buco silenzioso.
function statusLabelKey(
  status: SiteDomainStatus,
): 'status.pending' | 'status.verifying' | 'status.active' | 'status.suspended' | 'status.error' {
  switch (status) {
    case 'pending':
      return 'status.pending';
    case 'verifying':
      return 'status.verifying';
    case 'active':
      return 'status.active';
    case 'suspended':
      return 'status.suspended';
    case 'error':
      return 'status.error';
  }
}

/** Copia best-effort negli appunti (guardata: senza clipboard e' un no-op silenzioso, mai un throw). */
function copyToClipboard(value: string): void {
  void globalThis.navigator?.clipboard?.writeText?.(value);
}

export function DomainSection({ plan, siteId, initialDomains, subscriptionHref }: DomainSectionProps) {
  const t = useTranslations('domains');
  const [domains, setDomains] = useState<DomainView[]>([...initialDomains]);
  const [hostname, setHostname] = useState('');
  const [busy, setBusy] = useState(false);

  // GATE Free (DOM-502, AC-502-2): solo la card di upgrade. Ritorno anticipato => il ramo Free non
  // monta MAI il form ne' i pulsanti di azione.
  if (plan !== 'pro') {
    return (
      <section aria-labelledby="domain-title" className="flex flex-col gap-md">
        <h1 id="domain-title" className="text-2xl font-semibold text-foreground">
          {t('title')}
        </h1>
        <div className="flex flex-col gap-sm rounded-lg border border-border p-lg">
          <h2 className="text-lg font-medium text-foreground">{t('upgradeTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('upgradeBody')}</p>
          <Link href={subscriptionHref} className="text-sm font-medium text-primary underline">
            {t('upgradeCta')}
          </Link>
        </div>
      </section>
    );
  }

  // Inserisce/aggiorna i collegamenti creati dal POST /connect (apex + eventuale www), riusando la
  // chiave hostname: un ri-collegamento dello stesso host sostituisce la riga, non la duplica.
  function upsert(created: ConnectedDomainView[]): void {
    setDomains((prev) => {
      const next = [...prev];
      for (const link of created) {
        const view: DomainView = { hostname: link.hostname, status: link.status, records: link.records };
        const at = next.findIndex((existing) => existing.hostname === link.hostname);
        if (at >= 0) next[at] = view;
        else next.push(view);
      }
      return next;
    });
  }

  async function onConnect(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const host = hostname.trim();
    if (busy || host === '') return;
    setBusy(true);
    try {
      const created = await requestConnect(siteId, host);
      if (created) {
        upsert(created);
        setHostname('');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(host: string): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const status = await requestVerify(host);
      if (status) {
        setDomains((prev) => prev.map((d) => (d.hostname === host ? { ...d, status } : d)));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDisconnect(host: string): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await requestDisconnect(host);
      if (ok) setDomains((prev) => prev.filter((d) => d.hostname !== host));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="domain-title" className="flex flex-col gap-md">
      <h1 id="domain-title" className="text-2xl font-semibold text-foreground">
        {t('title')}
      </h1>
      <p className="text-sm text-muted-foreground">{t('intro')}</p>

      <form onSubmit={onConnect} className="flex flex-wrap items-end gap-sm">
        <Input
          aria-label={t('hostnameLabel')}
          placeholder={t('hostnameLabel')}
          value={hostname}
          onChange={(event) => setHostname(event.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" disabled={busy}>
          {t('connectButton')}
        </Button>
      </form>

      {domains.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noDomains')}</p>
      ) : (
        <ul className="flex flex-col gap-md">
          {domains.map((domain) => (
            <li
              key={domain.hostname}
              className="flex flex-col gap-sm rounded-md border border-border p-md"
            >
              <div className="flex flex-wrap items-center gap-sm">
                {/* Hostname = input NON FIDATO: nodo di testo JSX (escaping React), mai href/innerHTML. */}
                <span className="text-sm font-medium text-foreground">{domain.hostname}</span>
                <span className="text-xs text-muted-foreground">{t(statusLabelKey(domain.status))}</span>
              </div>

              {domain.records.length > 0 ? (
                <div className="flex flex-col gap-xs">
                  <p className="text-xs text-muted-foreground">{t('dnsRecordsTitle')}</p>
                  <ul className="flex flex-col gap-xs">
                    {domain.records.map((record, index) => (
                      <li
                        key={`${record.type}-${record.name}-${index}`}
                        className="flex flex-wrap items-center gap-sm text-xs"
                      >
                        <span className="font-mono text-muted-foreground">
                          {t('recordType')}: {record.type}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {t('recordName')}: {record.name}
                        </span>
                        <span className="font-mono text-foreground">
                          {t('recordValue')}: {record.value}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          aria-label={t('copyRecord')}
                          onClick={() => copyToClipboard(record.value)}
                        >
                          {t('copyRecord')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-sm">
                {domain.status !== 'active' ? (
                  <Button type="button" disabled={busy} onClick={() => onVerify(domain.hostname)}>
                    {t('verifyButton')}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onDisconnect(domain.hostname)}
                >
                  {t('disconnectButton')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

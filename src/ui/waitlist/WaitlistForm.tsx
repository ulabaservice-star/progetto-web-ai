'use client';

import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Input, Label } from '@/ui/primitives';
import { submitWaitlist } from '@/ui/waitlist/waitlist-calls';

// PUB-241/242 (macrotask waitlist-form, p6a-public-surface) — il FORM waitlist client, montato nei
// due data-testid="waitlist-slot" della home (PUB-141). È PRESENTAZIONALE: POSTa a /api/waitlist (via
// waitlist-calls) e RIFLETTE l'esito del server, non decide nulla (P6A-D5). Copy TUTTO dal namespace
// 'landing.waitlist' (PUB-121); il locale corrente da useLocale().
//
// STATI: idle -> submitting -> inserted | already | error. 'inserted' (nuovo iscritto) e 'already'
// (già in lista) sono ENTRAMBI amichevoli, con copy distinto (successNew / successExisting); un
// non-2xx / rete caduta => error (mai uno stato inventato: lo mappa il confine).
//
// WIDGET TURNSTILE (PUB-241): si monta SOLO se la site key PUBBLICA NEXT_PUBLIC_TURNSTILE_SITE_KEY è
// presente. Il valore è letto LETTERALMENTE da process.env (così Next lo inietta a build-time) DENTRO
// il render (così i test lo pilotano per-caso). Assente => la regione widget mostra 'unavailable' e il
// componente NON lancia (inerte, P6A-D6/D9), coerente con l'endpoint che degrada senza il secret.
//
// CONSENSO GDPR (PUB-242): checkbox NON pre-spuntato (opt-in esplicito, P6A-D7); il submit resta
// BLOCCATO (pulsante disabilitato + guardia nell'handler, nessun fetch) finché il consenso non è dato.
//
// SICUREZZA:
//  - A05:2025 output — email e copy resi SOLO come testo JSX (escaping React); nessun innerHTML/
//    dangerouslySetInnerHTML. Il link privacy ha un href interno FISSO /{locale}/privacy, mai da input
//    utente (anti open-redirect); il locale viene dall'allowlist del routing.
//  - A07:2025 — nel client vive SOLO la site key PUBBLICA; il secret Turnstile resta server-side (PUB-222).
//  - ANTI-SPAM — honeypot (campo-esca invisibile) + widget Turnstile; l'endpoint è comunque la difesa.

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

type Status = 'idle' | 'submitting' | 'inserted' | 'already' | 'error';

type WaitlistFormProps = {
  /** Distingue i due montaggi (hero/closing) per rendere UNICI gli id dei campi sulla stessa pagina. */
  readonly slot: string;
};

export function WaitlistForm({ slot }: WaitlistFormProps): ReactElement {
  const t = useTranslations('landing');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  // Site key PUBBLICA, letta letteralmente da process.env (Next la inietta a build-time). Vuota/assente
  // => nessun widget: la regione mostra 'unavailable' e il form resta inerte (mai un crash).
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const widgetReady = typeof siteKey === 'string' && siteKey.trim() !== '';

  // Carica lo script Turnstile UNA volta, solo se la site key è configurata: la sua api.js auto-renderizza
  // ogni `.cf-turnstile` e inietta il token in un hidden input `cf-turnstile-response`. Guardato e
  // idempotente (dedup per src): due montaggi del form non caricano due script. Senza site key non parte.
  useEffect(() => {
    if (!widgetReady || typeof document === 'undefined') return;
    if (document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)) return;
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [widgetReady]);

  const fieldId = `waitlist-${slot}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    // Guardia di consenso (PUB-242) + anti doppio-invio: nessun fetch senza consenso o durante l'invio.
    if (!consent || status === 'submitting') return;

    const form = event.currentTarget;
    // Il token Turnstile, se il widget è montato, è iniettato dallo script in un hidden input; assente
    // => stringa vuota (il server decide, inerte senza il secret). Idem l'honeypot (vuoto per un umano).
    const tokenField = form.elements.namedItem('cf-turnstile-response');
    const captchaToken = tokenField instanceof HTMLInputElement ? tokenField.value : '';
    const honeypotField = form.elements.namedItem(`${fieldId}-company`);
    const honeypot = honeypotField instanceof HTMLInputElement ? honeypotField.value : '';

    setStatus('submitting');
    const outcome = await submitWaitlist({ email, locale, honeypot, captchaToken });
    setStatus(outcome.kind);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-sm" aria-describedby={`${fieldId}-status`}>
      <Label htmlFor={`${fieldId}-email`}>{t('waitlist.emailLabel')}</Label>
      <Input
        id={`${fieldId}-email`}
        type="email"
        required
        autoComplete="email"
        value={email}
        placeholder={t('waitlist.emailPlaceholder')}
        onChange={(event) => setEmail(event.target.value)}
        className="max-w-sm"
      />

      {/* HONEYPOT: campo-esca invisibile all'utente (fuori dal tab order, aria-hidden). Un bot lo
          riempie e l'endpoint scarta la richiesta con un 200 silente (PUB-231). Mai annunciato/mostrato. */}
      <input
        type="text"
        name={`${fieldId}-company`}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        defaultValue=""
      />

      {/* WIDGET Turnstile: montato SOLO con la site key pubblica; assente => 'non disponibile'
          (nessun crash — l'adattatore server è a sua volta inerte senza il secret, P6A-D6/D9). */}
      {widgetReady ? (
        <div className="cf-turnstile" data-sitekey={siteKey} data-testid={`${fieldId}-widget`} />
      ) : (
        <p data-testid={`${fieldId}-widget`} className="text-sm text-muted-foreground">
          {t('waitlist.unavailable')}
        </p>
      )}

      {/* CONSENSO GDPR (PUB-242): NON pre-spuntato; il submit resta bloccato finché non è dato. Il link
          privacy ha un href interno fisso /{locale}/privacy (mai da input utente). */}
      <Label htmlFor={`${fieldId}-consent`} className="flex items-start gap-sm font-normal">
        <input
          id={`${fieldId}-consent`}
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span className="text-sm text-muted-foreground">
          {t('waitlist.consentLabel')}{' '}
          <Link href={`/${locale}/privacy`} className="underline">
            {t('nav.privacy')}
          </Link>
        </span>
      </Label>

      <Button type="submit" disabled={!consent || status === 'submitting'} className="max-w-sm">
        {status === 'submitting' ? t('waitlist.submitting') : t('waitlist.submit')}
      </Button>

      {/* ESITO: il copy del catalogo secondo il { kind } risolto dal server (mai innerHTML). */}
      <p id={`${fieldId}-status`} role="status" aria-live="polite" className="text-sm text-foreground">
        {status === 'inserted' ? t('waitlist.successNew') : null}
        {status === 'already' ? t('waitlist.successExisting') : null}
        {status === 'error' ? t('waitlist.error') : null}
      </p>
    </form>
  );
}

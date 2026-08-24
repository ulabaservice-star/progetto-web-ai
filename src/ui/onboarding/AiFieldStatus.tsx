// macrotask onboarding-ai-dedup — i due messaggi di stato condivisi dai campi AI on-demand
// dell'onboarding (GenerateDescriptionField OGW-302 e OfferingSuggestions OGW-402): il messaggio
// di CAP (budget AI esaurito, `atCap`) e il messaggio di ERRORE (la chiamata iniettata e'
// fallita, `failed`). I due componenti li rendevano verbatim (misurato come duplicazione dal
// controllo d'igiene) -> estratti qui. Le STRINGHE arrivano dal chiamante: i due componenti
// vivono in namespace i18n distinti (`onboarding.generateDescription.*` /
// `onboarding.suggestOfferings.*`), quindi il testo lo risolve chi rende, non questo blocco.
//
// Presentazionale puro: nessuno stato, nessuna difesa da aggiungere — i messaggi sono testo
// dei cataloghi (fidato), non output del modello. La resa a prezzo/anti-injection resta nei
// componenti che lo compongono.

type AiFieldStatusProps = {
  /** Budget AI del sito esaurito: mostra il messaggio di cap (la difesa autoritativa e' il 429). */
  atCap: boolean;
  /** L'ultima chiamata iniettata e' fallita: mostra il messaggio d'errore. */
  failed: boolean;
  /** Testo del messaggio di cap (dal catalogo i18n del componente chiamante). */
  capMessage: string;
  /** Testo del messaggio d'errore (dal catalogo i18n del componente chiamante). */
  errorMessage: string;
};

export function AiFieldStatus({ atCap, failed, capMessage, errorMessage }: AiFieldStatusProps) {
  return (
    <>
      {atCap && <p className="text-sm text-muted-foreground">{capMessage}</p>}
      {failed && <p className="text-sm text-destructive">{errorMessage}</p>}
    </>
  );
}

import { emptyBrief, type Brief } from '@/domain/onboarding/brief';

// OGW-501 (macrotask wizard-shell) — la fusione di una PROPOSTA d'import nel brief-bozza del
// wizard. SPOSTATA VERBATIM da OnboardingWorkspace (T-151): il guscio a step non e' piu' l'unica
// sede dello stato condiviso, e la regola "la proposta sovrascrive i campi che porta, non svuota
// le collezioni, non cambia il locale del sito" e' logica pura che il reducer del wizard
// (applyProposal) riusa — quindi vive in un modulo suo, testabile e importabile, non dentro il
// componente-contenitore. Comportamento IDENTICO a prima (stessi commenti, stesse invarianti):
// l'oracolo dell'invariante locale continua a valere su questa funzione.

// I campi core che una proposta di import puo' pre-riempire. `locale` NON e' nel tipo, e questa
// e' la differenza fra "omesso per convenzione" e IRRAPPRESENTABILE: un sito = una lingua (T-121)
// e la lingua e' proprieta' del sito, non un dato che la pagina di qualcun altro possa cambiare,
// quindi scrivere `locale: proposal.locale` piu' sotto e' un errore di compilazione (proprieta'
// in eccesso su un literal di ritorno tipizzato) e non una svista che passa la review. Anche
// `content` e' fuori: le collezioni si fondono con una regola loro (sotto), non per sovrascrittura.
type ProposalCore = Omit<Brief, 'locale' | 'content'>;

function proposalCore(proposal: Brief): ProposalCore {
  return {
    business_name: proposal.business_name,
    vertical: proposal.vertical,
    description: proposal.description,
    address: proposal.address,
    geo: proposal.geo,
    hours: proposal.hours,
    phone: proposal.phone,
    whatsapp: proposal.whatsapp,
    email: proposal.email,
    primary_goal: proposal.primary_goal,
  };
}

// I campi che la pagina ha DAVVERO prodotto.
//
// `fromUrl` (T-141) costruisce la proposta su `emptyBrief()`, quindi un campo che la pagina non
// ha prodotto non arriva "assente": arriva con il valore di DEFAULT dello schema. Il caso
// concreto e' `vertical`, che ha `default('altro')` in T-121: senza questo filtro OGNI import
// proponeva 'altro' anche per una pagina che del tipo di attivita' non dice niente, la vista lo
// mostrava e la conferma lo mandava a upsertBrief — cioe' l'import CANCELLAVA la scelta
// dell'utente. Il risultato di `fromUrl` non ha un canale per distinguere i due casi e aggiungerlo
// e' T-141 (fuori scope), quindi la distinzione si ricostruisce qui: si confronta con il brief
// VUOTO dello STESSO locale della proposta e si tiene solo cio' che ne differisce. Cosi'
// "prodotto dalla pagina" e' una proprieta' CALCOLATA dai default di T-121, non un elenco di
// campi da tenere aggiornato a mano.
//
// Un solo confronto copre entrambi i modi di non esserci: il campo assente (nel brief vuoto e'
// `undefined`, quindi `undefined !== undefined` e' falso e il campo si scarta — e' cio' che
// impedisce a un `undefined` della proposta di CANCELLARE un valore che c'era) e il campo col
// valore di default.
//
// COSTO DICHIARATO: una pagina che dichiara DAVVERO `vertical: 'altro'` non pre-riempie quel
// campo. E' innocuo — 'altro' e' anche il valore che il brief porta finche' l'utente non scelga.
function proposedFields(proposal: Brief): Partial<ProposalCore> {
  const blank = proposalCore(emptyBrief(proposal.locale));
  return Object.fromEntries(
    Object.entries(proposalCore(proposal)).filter(
      ([key, value]) => value !== blank[key as keyof ProposalCore],
    ),
  ) as Partial<ProposalCore>;
}

// La proposta SOVRASCRIVE i campi che porta: importare e' un'azione esplicita dell'utente e nulla
// viene salvato finche' non conferma, quindi "riempi solo i buchi" avrebbe scartato in silenzio
// proprio i dati che ha chiesto di importare. Le collezioni, invece, non si SVUOTANO: una
// proposta senza offerte non deve cancellare le offerte gia' raccolte.
//
// Esportata per l'oracolo: il locale non e' osservabile dal DOM (nessuno step lo rende), quindi
// la sola sede in cui si puo' asserire che la proposta non cambia la lingua del sito e' la fusione.
export function mergeProposal(current: Brief, proposal: Brief): Brief {
  return {
    ...current,
    ...proposedFields(proposal),
    // La lingua e' del SITO: si riafferma DOPO lo spread. Non e' ridondante — rende la mutazione
    // "prendi il locale dalla proposta" una riscrittura di questa riga (o una chiave duplicata,
    // che TypeScript rifiuta), non una riga in piu' che nessuno nota.
    locale: current.locale,
    content: {
      offerings:
        proposal.content.offerings.length > 0
          ? proposal.content.offerings
          : current.content.offerings,
      social_links:
        proposal.content.social_links.length > 0
          ? proposal.content.social_links
          : current.content.social_links,
      highlights:
        proposal.content.highlights.length > 0
          ? proposal.content.highlights
          : current.content.highlights,
      brand_hints: proposal.content.brand_hints ?? current.content.brand_hints,
    },
  };
}

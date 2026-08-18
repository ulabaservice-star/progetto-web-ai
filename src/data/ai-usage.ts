import 'server-only';
import { createServerSupabaseClient } from '@/data/supabase-ssr';
import type { AiUsagePort, AiUsageKind } from '@/domain/onboarding/ai-budget';

// OGW-302 (macrotask generate-description, onboarding-guided-wizard) — il PROVIDER REALE della
// porta d'uso AI (OGW-101/102): implementa AiUsagePort sul contatore persistito
// public.onboarding_ai_usage col client Supabase legato alla SESSIONE (RLS attiva), MAI la
// service_role (R7). E' il primo call-site che ne ha bisogno: il dominio (ai-budget.ts) ha
// dichiarato la porta e delegato l'implementazione al layer data del primo endpoint che la
// consuma — questo.
//
// SICUREZZA (A01:2025 / P1-D21): l'account della riga d'uso e' quello del SITO, letto dalla
// riga sites del site_id — NON derivato da accounts.owner_id (che assumerebbe l'owner). E' la
// derivazione coerente con la FK COMPOSITA (account_id, site_id) -> sites: la riga d'uso e'
// ancorata all'account che POSSIEDE il sito, chiunque lo scriva. La RLS di sites lascia vedere
// solo i propri siti e l'endpoint accerta gia' la proprieta' (guardOwnedSite) prima di
// costruire la porta; la RLS INSERT di onboarding_ai_usage (is_account_member(account_id)) e la
// FK compongono la difesa in profondita'. Solo metodi tipati .eq()/.gte()/.insert() (niente
// .or()/.filter() interpolati).
//
// APPEND-ONLY (OGW-101): `record` e' un INSERT, mai un update/delete (il contatore anti-abuso
// non si azzera ne' si falsifica). I conteggi sono separati (totale vs finestra) perche'
// governano due tetti distinti nel dominio (cap vs rate-limit): un unico builder li serve
// entrambi, la finestra e' solo un predicato in piu' su used_at.

const TABLE = 'onboarding_ai_usage';

/**
 * Costruisce la porta d'uso AI per la sessione corrente. I conteggi passano dalla RLS
 * (filtrata alle righe dei propri account) piu' un filtro esplicito per site_id; la
 * registrazione ancora la riga all'account del sito. Lancia sui guasti di lettura/scrittura DB
 * (l'endpoint li tratta: un guasto del contatore non e' un verde finto).
 */
export async function createAiUsagePort(): Promise<AiUsagePort> {
  const supabase = await createServerSupabaseClient();

  // Un solo builder per i due conteggi: `since` opzionale distingue il totale (cap) dalla
  // finestra (rate-limit). Evita due query gemelle (che sarebbero duplicazione verbatim).
  const countUsage = async (siteId: string, since?: Date): Promise<number> => {
    let query = supabase.from(TABLE).select('id', { count: 'exact', head: true }).eq('site_id', siteId);
    if (since) query = query.gte('used_at', since.toISOString());
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  };

  return {
    countTotal(siteId: string): Promise<number> {
      return countUsage(siteId);
    },
    countSince(siteId: string, since: Date): Promise<number> {
      return countUsage(siteId, since);
    },
    async record(siteId: string, kind: AiUsageKind, at: Date): Promise<void> {
      // account_id dalla riga sites del site_id (RLS: solo i propri siti). Coerente con la FK
      // composita; mai un account_id dal client.
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('account_id')
        .eq('id', siteId)
        .single();
      if (siteError || !site) throw new Error('ai-usage: sito non risolto per la registrazione');

      const { error } = await supabase.from(TABLE).insert({
        account_id: site.account_id as string,
        site_id: siteId,
        kind,
        used_at: at.toISOString(),
      });
      if (error) throw error;
    },
  };
}

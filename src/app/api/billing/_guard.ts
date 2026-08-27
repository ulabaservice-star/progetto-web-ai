import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, getUser } from '@/data/supabase-ssr';
import { resolveOwnAccountId } from '@/data/account';
import { guardMutatingRequest, jsonError } from '@/app/api/_shared/request-guard';

// BIL-203 (macrotask stripe-checkout-webhook, p5-billing-fase1) — Preambolo condiviso dei due
// endpoint billing (checkout + portal): stessa catena di guardie + stesso scheletro di route,
// in UN solo posto (le due rotte differiscono solo per l'azione sulla porta — tenerle come
// copie sarebbe il modo classico in cui una perde un controllo alla prossima modifica).
//
// GUARDIE (resolveBillingActor), in ordine:
//  1. same-origin + tetto byte (guardMutatingRequest): sono chiamate dal BROWSER, non un
//     webhook — la catena CSRF vale. 403/413.
//  2. identita' validata (getUser): 401 se assente.
//  3. body z.object({}).strict(): non c'e' NIENTE da passare. Un body con campi (es. un
//     account_id iniettato) => 403: il client NON decide l'identita' — l'accountId lo deriva
//     il server. Cosi' "cross-account" e' strutturalmente impossibile (A01:2025).
//  4. accountId = accounts.id dove owner_id === auth.uid() (UNIQUE(owner_id) rende .single()
//     sicuro). Mai un account_id dal client.

// Tetto dei due body: entrambi accettano solo {} (nessun campo) — 256 byte bastano e avanzano.
const MAX_BODY_BYTES = 256;

const EmptyBody = z.object({}).strict();

// Locali: solo billingActionRoute (sotto) li consuma — nessun altro modulo importa la guardia
// grezza, l'unico ingresso pubblico e' lo scheletro di route.
type BillingActor =
  | { ok: true; accountId: string }
  | { ok: false; response: NextResponse };

/** Applica le guardie e deriva l'accountId proprio del chiamante, o restituisce il rifiuto. */
async function resolveBillingActor(request: NextRequest): Promise<BillingActor> {
  const guardFailure = guardMutatingRequest(request, { maxBodyBytes: MAX_BODY_BYTES });
  if (guardFailure) return { ok: false, response: guardFailure };

  const user = await getUser();
  if (!user) return { ok: false, response: jsonError(401, 'unauthorized') };

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return { ok: false, response: jsonError(400, 'invalid-body') };
  }
  // L'unico modo in cui {} strict fallisce e' la presenza di campi extra: un tentativo di
  // pilotare l'azione dal client (es. account_id altrui) => forbidden.
  if (!EmptyBody.safeParse(rawBody).success) {
    return { ok: false, response: jsonError(403, 'forbidden') };
  }

  const supabase = await createServerSupabaseClient();
  const accountId = await resolveOwnAccountId(supabase, user.id);
  if (accountId === null) {
    return { ok: false, response: jsonError(500, 'unavailable') };
  }

  return { ok: true, accountId };
}

/**
 * Scheletro condiviso di un endpoint billing: guardie + accountId derivato, poi delega
 * `action` alla porta col SOLO account del chiamante e restituisce la sua url. Un errore
 * della porta => 502 loggato (mai un 2xx opaco): il client non riceve un url falso.
 */
export async function billingActionRoute(
  request: NextRequest,
  logTag: string,
  failReason: string,
  action: (accountId: string) => Promise<{ url: string }>,
): Promise<Response> {
  const actor = await resolveBillingActor(request);
  if (!actor.ok) return actor.response;

  try {
    const { url } = await action(actor.accountId);
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error(`[${logTag}] apertura sessione fallita`, error);
    return jsonError(502, failReason);
  }
}

import { describe, it, expect, vi, afterEach } from 'vitest';
import { requestDescription, requestOfferingSuggestions, withAtCap } from '@/ui/onboarding/ai-calls';

// OGW-502 (macrotask wizard-shell) — il confine client verso gli endpoint AI. Unita' di supporto
// (regge AC-502-1 lato wiring e il gating atCap del cap 429), non il target_test di un AC.

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ai-calls (client)', () => {
  it('requestDescription: 200 -> ok con la descrizione, e POSTa allURL del sito', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { description: 'Trattoria dal 1980.' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestDescription('site-1', 'trattoria romana');

    expect(result).toEqual({ ok: true, value: 'Trattoria dal 1980.' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/onboarding/site-1/generate-description');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ phrase: 'trattoria romana' });
  });

  it('requestDescription: 429 -> ok:false con atCap:true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(429, { error: 'cap-reached' })));
    expect(await requestDescription('s', 'x')).toEqual({ ok: false, atCap: true });
  });

  it('requestDescription: 502 -> ok:false senza atCap; rete caduta -> idem', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(502, { error: 'generation-failed' })));
    expect(await requestDescription('s', 'x')).toEqual({ ok: false, atCap: false });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await requestDescription('s', 'x')).toEqual({ ok: false, atCap: false });
  });

  it('requestDescription: forma inattesa (description non stringa) -> ok:false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { description: 42 })));
    expect(await requestDescription('s', 'x')).toEqual({ ok: false, atCap: false });
  });

  it('requestOfferingSuggestions: 200 -> voci filtrate per forma (name stringa, section opzionale)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        offerings: [
          { name: 'Carbonara', section: 'Primi' },
          { name: 'Amatriciana' },
          { name: 123 }, // scartata: name non stringa
          { section: 'orfana' }, // scartata: senza name
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestOfferingSuggestions('site-2');

    expect(result).toEqual({
      ok: true,
      value: [{ name: 'Carbonara', section: 'Primi' }, { name: 'Amatriciana' }],
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/onboarding/site-2/suggest-offerings');
    expect(JSON.parse(init.body)).toEqual({});
  });

  it('requestOfferingSuggestions: 429 -> atCap; body non-array -> ok:false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(429, {})));
    expect(await requestOfferingSuggestions('s')).toEqual({ ok: false, atCap: true });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { offerings: 'nope' })));
    expect(await requestOfferingSuggestions('s')).toEqual({ ok: false, atCap: false });
  });
});

describe('withAtCap (adattatore condiviso degli step AI)', () => {
  it('ok -> {ok:true,value}, senza alzare atCap', () => {
    const onAtCap = vi.fn();
    expect(withAtCap({ ok: true, value: 'x' }, onAtCap)).toEqual({ ok: true, value: 'x' });
    expect(onAtCap).not.toHaveBeenCalled();
  });

  it('atCap:true -> {ok:false} E alza atCap una volta', () => {
    const onAtCap = vi.fn();
    expect(withAtCap({ ok: false, atCap: true }, onAtCap)).toEqual({ ok: false });
    expect(onAtCap).toHaveBeenCalledTimes(1);
  });

  it('errore non-cap -> {ok:false} senza alzare atCap', () => {
    const onAtCap = vi.fn();
    expect(withAtCap({ ok: false, atCap: false }, onAtCap)).toEqual({ ok: false });
    expect(onAtCap).not.toHaveBeenCalled();
  });
});

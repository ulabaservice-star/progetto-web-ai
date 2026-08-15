// DV2-101 (macrotask `foundation`) — oracolo di conformità-logica del task. Le asserzioni DERIVANO
// dagli acceptance_criteria del blueprint (docs/blueprint/design-engine-v2/01-foundation.md); ogni
// blocco porta il tag `// covers: <AC-id>`. Verifica STRUTTURA e RETRO-COMPAT, non la bellezza (non
// oracolabile, L-COL-006).
import { describe, it, expect } from 'vitest';
import { THEMES, THEME_ID_ALIASES, themeFor, type SiteTheme } from '@/domain/generation/themes';
import { DOCUMENT_LIMITS, SiteDocumentSchema } from '@/domain/generation/document';

// Le chiavi colore attese: i 21 semantici CD + i 10 legacy derivati (32 in tutto). La verifica di
// completezza è "ogni tema ha ESATTAMENTE lo stesso insieme di chiavi del primo", così l'oracolo cade
// se un tema perde o aggiunge un token senza dover ri-elencare a mano l'unione (che il compilatore già
// impone come Record totale).
const COLOR_KEYS = Object.keys(THEMES[0].colors).sort();

const SCALE_STEPS = ['sm', 'base', 'lg', 'xl', '2xl', '3xl'] as const;
const SPACE_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
const RADIUS_STEPS = ['sm', 'md', 'lg', 'pill'] as const;

function nonEmpty(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

describe('design-engine-v2 · foundation · THEMES (Claude Design)', () => {
  // covers: AC-DV2-101-1 — ≥8 palette (di fatto 23), ognuna un SiteTheme COMPLETO (Record totale).
  it('espone ≥8 palette, ognuna con tutti i token del tipo valorizzati', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(8);
    for (const t of THEMES) {
      expect(nonEmpty(t.id)).toBe(true);
      // stesso insieme di chiavi colore per ogni tema, tutte non vuote
      expect(Object.keys(t.colors).sort()).toEqual(COLOR_KEYS);
      for (const key of COLOR_KEYS) {
        expect(nonEmpty((t.colors as Record<string, string>)[key])).toBe(true);
      }
      // tipografia / scala / spazio / raggi tutti presenti e non vuoti
      for (const role of ['heading', 'body', 'display'] as const) {
        expect(nonEmpty(t.typography.font_family[role])).toBe(true);
      }
      for (const s of SCALE_STEPS) expect(nonEmpty(t.typography.scale[s])).toBe(true);
      expect(nonEmpty(t.typography.tracking.label)).toBe(true);
      expect(typeof t.typography.tabular_nums).toBe('boolean');
      expect(typeof t.typography.h1_italic_default).toBe('boolean');
      for (const s of SPACE_STEPS) expect(nonEmpty(t.spacing[s])).toBe(true);
      for (const s of RADIUS_STEPS) expect(nonEmpty(t.radius[s])).toBe(true);
    }
  });

  // covers: AC-DV2-101-2 — token semantici CD presenti; superficie chiara distinta dalla scura.
  it('ogni palette porta i token semantici CD, con surface_page ≠ surface_dark', () => {
    const required = [
      'surface_page', 'surface_dark', 'text_heading', 'accent', 'line', 'on_dark', 'eyebrow_color',
    ] as const;
    for (const t of THEMES) {
      for (const token of required) {
        expect(nonEmpty(t.colors[token])).toBe(true);
      }
      expect(t.colors.surface_page).not.toBe(t.colors.surface_dark);
    }
  });

  // covers: AC-DV2-101-3 — lookup esatto + alias storico + proto-safe.
  it('themeFor risolve id esatti e alias storici, ed è proto-safe', () => {
    // esatto
    expect(themeFor('trattoria-rustica@1')?.id).toBe('trattoria-rustica@1');
    // alias storico (DS-V2-D1): l'id v1.1 rimappa alla paletta CD, non cade
    expect(themeFor('sole-mediterraneo@1')?.id).toBe('trattoria-rustica@1');
    expect(themeFor('festa-brillante@1')?.id).toBe('pizzeria-napoletana@1');
    // ogni alias risolve a un tema reale
    for (const [oldId, cdId] of Object.entries(THEME_ID_ALIASES)) {
      expect(themeFor(oldId)?.id).toBe(cdId);
      expect(THEMES.some((t) => t.id === cdId)).toBe(true);
    }
    // inesistente → undefined (nessun clone silenzioso)
    expect(themeFor('inesistente@9')).toBeUndefined();
    // (migrato DE-202) match ESATTO, mai per prefisso: l'id senza '@N' non risolve il tema versionato
    expect(themeFor('trattoria-rustica')).toBeUndefined();
    // due id che condividono un prefisso di nome non si risolvono a vicenda
    expect(themeFor('osteria-contemporanea@1')?.id).toBe('osteria-contemporanea@1');
    expect(themeFor('osteria-di-citta@1')?.id).toBe('osteria-di-citta@1');
    // proto-safe: chiavi speciali non risolvono un membro ereditato
    expect(themeFor('__proto__')).toBeUndefined();
    expect(themeFor('constructor')).toBeUndefined();
    expect(themeFor('toString')).toBeUndefined();
  });

  // covers: AC-DV2-101-4 — inclusione, non biiezione: il catalogo è ricco e non pinnato a una lista fissa.
  it('verifica le palette per inclusione (catalogo CD ampio), non per biiezione con una lista fissa', () => {
    // ricchezza del catalogo CD (DS-V2-D2), senza fissare gli id
    expect(THEMES.length).toBeGreaterThanOrEqual(20);
    // gli id sono versionati 'nome@N' e distinti a due a due
    const ids = THEMES.map((t: SiteTheme) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/@\d+$/);
  });
});

// Invarianti di DOMINIO migrate da tests/generation-themes.test.ts (ritirato: pinnava gli 8 temi v1.1
// per BIIEZIONE — conteggio, id storici, hex/rem, famiglie per-tema — tutto sostituito da v2). Restano
// valide per il catalogo CD e sono provate per INCLUSIONE. In v2 tipografia/scala/spazi sono CONDIVISI
// di proposito (DS-V2-D1): la distinzione a coppie e' sui COLORI, non piu' sulle famiglie/scale.
describe('design-engine-v2 · foundation · invarianti di dominio dei temi', () => {
  function themeStrings(theme: SiteTheme): string[] {
    const out: string[] = [];
    const walk = (n: unknown): void => {
      if (typeof n === 'string') { out.push(n); return; }
      if (n && typeof n === 'object') for (const v of Object.values(n)) walk(v);
    };
    walk(theme);
    return out;
  }

  // (migrato AC-211-3) Nessun valore di tema rimanda a una variabile del builder: dominio puro.
  // Gli hex e i color-mix() vivono qui (fuori da src/ui/site), ma MAI un var(--...).
  it('nessun valore di nessun tema contiene var(', () => {
    for (const t of THEMES) {
      for (const s of themeStrings(t)) {
        expect(s.includes('var('), `${t.id}: ${s}`).toBe(false);
      }
    }
  });

  // (migrato AC-211-2) Palette distinte a due a due sui COLORI.
  it('ogni coppia di temi differisce su almeno un token di colore', () => {
    for (let i = 0; i < THEMES.length; i += 1) {
      for (let j = i + 1; j < THEMES.length; j += 1) {
        const a = THEMES[i].colors as Record<string, string>;
        const b = THEMES[j].colors as Record<string, string>;
        const diff = COLOR_KEYS.some((k) => a[k] !== b[k]);
        expect(diff, `${THEMES[i].id} e ${THEMES[j].id} hanno la stessa palette`).toBe(true);
      }
    }
  });

  // (migrato dalla precondizione T-202) Ogni theme_id e' versionato 'nome@N', passa lo schema del
  // documento e fa passare parseDocument; senza versione il documento cade. Derivato dal contratto a
  // monte (SiteDocumentSchema), non riscritto.
  it('ogni theme_id passa lo schema del documento e sta sotto il tetto di lunghezza', () => {
    const schemaThemeId = SiteDocumentSchema.innerType().shape.theme_id;
    for (const t of THEMES) {
      expect(schemaThemeId.safeParse(t.id).success, t.id).toBe(true);
      expect(t.id.length, t.id).toBeLessThanOrEqual(DOCUMENT_LIMITS.versioned_id);
    }
  });
});

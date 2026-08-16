import { describe, it, expect } from 'vitest';
import { selectDesign } from '@/domain/generation/design-select';
import { themeFor } from '@/domain/generation/themes';
import type { Vertical } from '@/domain/generation/design-matrix';

// DV2-505 (variety-select, ibrido A) — ORACOLO dello SPREAD CROMATICO DELLE PALETTE. La greedy esclude il
// `theme_id` esatto (5 temi distinti), ma un id distinto non basta a rendere le palette VISIBILMENTE
// diverse: il catalogo ristorazione tende al caldo-crema, e al gate le 5 varianti apparivano "sempre la
// stessa palette". L'ibrido A aggiunge alla greedy un obiettivo secondario di DISTANZA CROMATICA (tinta
// d'accento + luminosita' del fondo), cosi' i 5 mockup spaziano davvero sulla ruota dei colori.
//
// COSA PROVA: fra le 5 varianti di un seed gli ACCENTI coprono famiglie di tinta diverse E almeno uno e'
// FREDDO (verde/teal/blu) — cosa che una scelta per-id soltanto NON garantirebbe (potrebbe restare tutta
// calda). La tinta e' RICALCOLATA qui dall'accento del tema (hex -> hue), non importata: non e' tautologico.
// NON prova la BELLEZZA delle palette (gate umano) ne' il fondo scuro/freddo (ibrido B, catalogo temi).

const RISTORAZIONE: Vertical = 'ristorazione';

/** Hue [0,360) da un colore '#rrggbb'. Indipendente dall'implementazione (calcolo proprio del test). */
function hue(hex: string): number {
  const int = parseInt(hex.replace('#', ''), 16);
  const r = ((int >> 16) & 0xff) / 255;
  const g = ((int >> 8) & 0xff) / 255;
  const b = (int & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** La famiglia di tinta di un hue: bucket grossolani (rosso/arancio/oro/oliva-verde/teal-blu/viola). */
function family(h: number): string {
  if (h < 20 || h >= 330) return 'rosso';
  if (h < 45) return 'arancio';
  if (h < 70) return 'oro';
  if (h < 160) return 'verde';
  if (h < 260) return 'blu-teal';
  return 'viola';
}

/** Le tinte d'accento delle 5 varianti di un seed. */
function accentHues(seed: string): number[] {
  return [0, 1, 2, 3, 4].map((i) => {
    const theme = themeFor(selectDesign(RISTORAZIONE, seed, i).theme_id);
    if (theme === undefined) throw new Error(`tema non risolto per (${seed}, ${i})`);
    return hue(theme.colors.accent);
  });
}

// MOLTI seed (deterministici): la garanzia dell'obiettivo cromatico e' che vale per OGNI seed, non solo
// per qualche seed fortunato. Un test su pochi seed non ucciderebbe la mutazione "ignora la palette"
// (la sola sequenza seminata spande gia' per certi seed); su 24 seed, se la palette-distanza e' spenta
// almeno un seed ricade in un cluster caldo e il test cade.
const SEEDS = Array.from({ length: 24 }, (_, i) => `gen-palette-${i}`);

describe('DV2-505 ibrido A — la greedy spande la tinta d accento fra le 5 varianti', () => {
  it('per OGNI seed: almeno un accento FREDDO (verde/teal/blu, hue in [90,260]) fra le 5', () => {
    // La garanzia del farthest-first cromatico: la 2a variante e' la palette piu' LONTANA dalla 1a — se
    // la 1a e' calda, la 2a cade sul lato freddo della ruota. Quindi OGNI seed porta >=1 accento freddo.
    // Senza l'obiettivo cromatico (greedy seminata e basta) qualche seed resterebbe tutto caldo: e' cio'
    // che l'utente ha notato al gate ("palette sempre uguale"). Il catalogo i freddi li ha (basilico,
    // teal mediterraneo); la greedy ora li PESCA.
    const senzaFreddo = SEEDS.filter((seed) => accentHues(seed).every((h) => h < 90 || h > 260));
    expect(senzaFreddo, `seed senza accento freddo: ${senzaFreddo.join(',')}`).toEqual([]); // covers spread
  });

  it('su tutti i seed: la MEDIA di famiglie di tinta distinte per generazione e alta (spread reale)', () => {
    // Non "3/5 stesso hero, palette calda" di prima: mediamente le 5 varianti coprono molte famiglie.
    const famiglieCount = SEEDS.map((seed) => new Set(accentHues(seed).map(family)).size);
    const media = famiglieCount.reduce((a, b) => a + b, 0) / famiglieCount.length;
    expect(media, `famiglie per seed: ${famiglieCount.join(',')}`).toBeGreaterThanOrEqual(3.5);
    // e nessun seed sotto 3 famiglie (nessuna generazione monocroma).
    expect(Math.min(...famiglieCount)).toBeGreaterThanOrEqual(3);
  });

  it('resta DETERMINISTICO: stesso seed -> stesse tinte (nessun Date/Math.random)', () => {
    const seed = 'gen-palette-det';
    expect(accentHues(seed)).toEqual(accentHues(seed));
  });
});

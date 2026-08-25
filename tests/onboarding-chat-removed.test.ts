import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// OGW-601 (macrotask remove-chat) — ORACOLO STATICO della rimozione della superficie chat.
// Non c'e' comportamento da esercitare: la proprieta e' l'ASSENZA, nell'albero dei sorgenti di
// PRODUZIONE, del file della rotta di turno, del modulo di orchestrazione dell'intervista, e di
// ogni import residuo verso di essi o verso il pannello di chat. Le asserzioni derivano da
// AC-601-1 (la rotta POST /turn non esiste piu') e AC-601-2 (nessun import residuo di
// ChatPanel/interview; il dead-code residuo lo prova knip nel controllo 1 del checkpoint).
//
// Perche STATICO e non hollow: la rotta e l'orchestrazione erano FILE reali; un test che li
// importasse per provarne l'assenza non compilerebbe. La proprieta osservabile e "il file non
// c'e' e nessun sorgente lo tira". Stessa tecnica del confine LLM (anthropic-boundary) e del
// confine dati (supabase-clients): si giudica l'albero dei sorgenti, non un percorso di comodo.

const root = process.cwd();

// Cammina src/ e raccoglie tutti i moduli .ts/.tsx di PRODUZIONE (i test non contano: possono
// nominare i simboli rimossi in fixture-stringa o commenti — vedi anthropic-boundary).
function sourceModules(dir = resolve(root, 'src')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceModules(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

// Un import residuo si riconosce dal SPECIFICATORE del modulo (`from '...'`), non da una
// menzione in un commento: cosi il commento "ChatPanel ELIMINATO" non e un falso positivo.
const FORBIDDEN_IMPORTS: { label: string; specifier: RegExp }[] = [
  { label: 'onboarding/interview', specifier: /from\s+['"][^'"]*onboarding\/interview(\.js)?['"]/ },
  { label: 'ChatPanel', specifier: /from\s+['"][^'"]*\/ChatPanel['"]/ },
  { label: 'onboarding/[siteId]/turn/route', specifier: /from\s+['"][^'"]*\/turn\/route['"]/ },
];

describe("OGW-601 AC-601-1 — la rotta POST /turn non esiste piu'", () => {
  it('il file della rotta di turno chat e assente', () => {
    const routeFile = resolve(root, 'src/app/api/onboarding/[siteId]/turn/route.ts');
    expect(existsSync(routeFile)).toBe(false); // covers: AC-601-1
  });

  it("la cartella turn/ dell'endpoint onboarding e assente (nessuna rotta annidata superstite)", () => {
    const turnDir = resolve(root, 'src/app/api/onboarding/[siteId]/turn');
    expect(existsSync(turnDir)).toBe(false); // covers: AC-601-1
  });
});

describe('OGW-601 AC-601-2 — nessun import residuo della superficie chat', () => {
  it("il modulo di orchestrazione dell'intervista e assente", () => {
    const interviewFile = resolve(root, 'src/domain/onboarding/interview.ts');
    expect(existsSync(interviewFile)).toBe(false); // covers: AC-601-2
  });

  it('nessun sorgente di produzione importa interview, ChatPanel o la rotta di turno', () => {
    const modules = sourceModules();
    // Anti-vacuita': l'albero dei sorgenti esiste e non e' vuoto.
    expect(modules.length).toBeGreaterThan(0); // covers: AC-601-2

    const violations: string[] = [];
    for (const file of modules) {
      const src = readFileSync(file, 'utf8');
      for (const rule of FORBIDDEN_IMPORTS) {
        if (rule.specifier.test(src)) {
          violations.push(`${file.slice(root.length + 1)} importa ${rule.label}`);
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]); // covers: AC-601-2
  });
});

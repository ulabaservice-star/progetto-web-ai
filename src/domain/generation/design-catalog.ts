// DE-201 (macrotask design-select) — L'IDONEITA DI SETTORE delle voci di catalogo, condivisa dai
// quattro cataloghi visivi (hero-layouts, section-treatments, effects, ornaments). Dominio PURO: un
// solo TIPO, nessun valore, nessun import, nessun I/O — il modulo dichiara una forma e nient'altro.
//
// PERCHE' E' UN TIPO SOLO E CONDIVISO: ogni voce di ogni catalogo dichiara a CHI si rivolge. La
// matrice `allowedCombinations(vertical)` (DE-203) enumerera', per un dato vertical, le voci
// UNIVERSALI (il fallback, sempre disponibile) PIU' le voci il cui overlay combacia col vertical.
// Tenere l'idoneita' in un tipo unico evita che i quattro cataloghi ne diano quattro definizioni
// che poi divergono.
//
// PERCHE' E' UNA STRINGA E NON L'ENUM DI brief.ts: il catalogo resta AUTONOMO (nessun import da
// src/domain/onboarding) e la matrice confrontera' per uguaglianza col `vertical` del brief. In v1
// l'unico overlay di settore e' 'ristorazione' (INDEX §7: gli altri settori sono successivi); un
// nuovo settore aggiunge qui il suo letterale, senza toccare la forma delle voci.

/**
 * L'idoneita' di una voce di catalogo rispetto ai settori (il `vertical` del brief).
 * - `'universale'`: la voce vale per OGNI vertical → e' il fallback che la matrice (DE-203) offre
 *   sempre, qualunque sia il settore.
 * - `'ristorazione'`: la voce e' un OVERLAY del settore ristorazione, offerta IN AGGIUNTA
 *   all'universale solo quando `vertical === 'ristorazione'`.
 */
export type CatalogScope = 'universale' | 'ristorazione';

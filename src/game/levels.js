// Level generator: base word -> common sub-words -> crossword layout. Deterministic (seeded).
// tools/gen_levels.js runs it once at build time and freezes the result in src/data/levels.js, so a word-list
// update never changes levels players already know. generateOne() also works at runtime (endless levels).
//
// Difficulty (psych pass, 2026-10-27): a Candy Crush style sawtooth over the long-term growth (4 -> 7 letters,
// 3 -> 10 words). Every level has a tier: facil | normal | dificil | superdificil (tierOf). There is no fail state,
// so the honest "fail" proxy is a simulated player (simulate): fail = it gets stuck before the crossword is complete
// and would need a hint. The generator builds several candidates per level and keeps the one whose simulated fail
// rate is closest to the tier's target (targetOf). tools/sim_curve.js measures the frozen curve.
(function (root) {
  'use strict';
  const PAL = root.PAL || (root.PAL = {});
  const T = PAL.text;

  const LEVEL_COUNT = 600;
  const PACK_SIZE = 20;
  const PACKS = [
    'Primeros pasos', 'Plaza Mayor', 'Mercado de abastos', 'Paseo marítimo', 'Tarde de café',
    'Huerta valenciana', 'Calles de Oaxaca', 'Sobremesa', 'Patio andaluz', 'Malecón habanero',
    'Valle del Elqui', 'Barrio de San Telmo', 'Camino de Santiago', 'Cafetal colombiano', 'Pueblos blancos',
    'Lago Titicaca', 'Rías gallegas', 'Cerros de Valparaíso', 'Noche de verbena', 'Viñedos de Mendoza',
    'Islas Canarias', 'Bosque nuboso', 'Sierra Nevada', 'Mar Caribe', 'Pampa infinita',
    'Biblioteca antigua', 'Ruta del Quijote', 'Volcanes de Antigua', 'Tertulia de amigos', 'Patagonia',
  ];

  function packOf(n) {
    const i = Math.floor((n - 1) / PACK_SIZE);
    const round = Math.floor(i / PACKS.length);
    const name = PACKS[i % PACKS.length] + (round ? ' ' + ['II', 'III', 'IV', 'V', 'VI'][Math.min(round - 1, 4)] : '');
    return { index: i, name, first: i * PACK_SIZE + 1, last: (i + 1) * PACK_SIZE };
  }

  // ---- tiers -----------------------------------------------------------------------------------------
  // 1-9 facil onboarding (one new thing at a time: TEACH), 10 the first dificil. From 25 on, 15-level cycles:
  // boss (superdificil) at 25, 40, 55... (10 + 15k), dificil at boss+5 and boss+10, facil right after every
  // dificil and two facil after a boss, the rest normal (ramping inside the cycle). The first cycle (10-24) is
  // gentler: 10 dificil, 11 facil, 20 dificil, 21 facil.
  const TIERS = ['facil', 'normal', 'dificil', 'superdificil'];
  const TIER_CODE = { facil: 'f', normal: 'n', dificil: 'd', superdificil: 's' };
  const CODE_TIER = { f: 'facil', n: 'normal', d: 'dificil', s: 'superdificil' };
  // first-try fail targets for the simulated player (PSYCH-PROGRESS shared contract)
  const BANDS = { facil: [0, 0.10], normal: [0.15, 0.30], dificil: [0.45, 0.60], superdificil: [0.65, 0.80] };
  const TEACH = { 1: 'word', 2: 'cross', 3: 'bonus', 4: 'shuffle', 5: 'hint' };

  function tierOf(n) {
    if (n <= 9) return 'facil';
    const c = (n - 10) % 15;
    if (n < 25) return n === 10 || n === 20 ? 'dificil' : n === 11 || n === 21 ? 'facil' : 'normal';
    if (c === 0) return 'superdificil';
    if (c === 1 || c === 2 || c === 6 || c === 11) return 'facil';
    if (c === 5 || c === 10) return 'dificil';
    return 'normal';
  }
  // the fail rate the generator aims at: band centre; normal ramps from 17% to 28% inside the cycle
  function targetOf(n) {
    const t = tierOf(n);
    if (t === 'facil') return n <= 9 ? 0.02 : 0.05;
    if (t === 'dificil') return 0.525;
    if (t === 'superdificil') return 0.725;
    const c = n < 25 ? (n - 10) : (n - 10) % 15;
    return 0.17 + 0.11 * (c / 14);
  }

  // ---- size and word rarity per level ----------------------------------------------------------------
  // long-term growth: letters 4 -> 7, words 3 -> 10, rarer words later. The tier adds or removes words, letters
  // and rarity on top (the sawtooth). Candidates then vary the rarity bias (alpha) and the base word.
  const CAP = { 4: 4, 5: 6, 6: 8, 7: 10 };
  function params(n) {
    const tier = tierOf(n);
    let letters = n <= 9 ? 4 : n <= 50 ? 5 : n <= 180 ? 6 : 7;
    const grow = 3 + Math.floor((n + 15) / 40);
    const early = n <= 60 ? 1 : 0;   // 5-letter levels have few sub-words: one more word keeps them honest
    let target;
    if (tier === 'facil') target = n <= 9 ? (n <= 2 ? 3 : 4) : Math.max(3, grow - 2);
    else if (tier === 'normal') target = grow + early;
    else if (tier === 'dificil') { if (n <= 50) letters++; target = grow + 1 + early; }
    else { if (letters < 7) letters++; target = grow + 2 + early; }
    target = Math.min(CAP[letters], target);
    const minWords = Math.max(3, target - 2);
    const mult = { facil: 0.55, normal: 1, dificil: 1.35, superdificil: 1.6 }[tier];
    const wordRank = Math.min(13900, Math.round((4000 + n * 20) * mult));   // words in the grid
    const baseRank = Math.min(12000, Math.round((3500 + n * 15) * Math.max(0.7, mult)));  // the base word
    // alpha: weight (rank + 300)^-alpha when picking sub-words. High = the obvious common words; low or
    // negative = rarer words, the obvious ones left out (they become bonus words, i.e. decoys)
    const alpha = { facil: [1.6, 3], normal: [0.2, 1.6], dificil: [-0.9, 0.8], superdificil: [-1, 0.6] }[tier];
    const candidates = { facil: 12, normal: 20, dificil: 32, superdificil: 40 }[tier];
    return { tier, letters, target, minWords, wordRank, baseRank, alpha, candidates };
  }

  function pickWords(base, subs, target, alpha, r) {
    // keep the base, then sub-words drawn by weight (rank-based, alpha) without replacement
    const pool = subs.filter((w) => w !== base).map((w, i) => ({ w, wt: Math.pow(i + 3, -alpha) * (0.6 + 0.2 * w.length) }));
    const chosen = [base];
    while (chosen.length < target && pool.length) {
      let tot = 0;
      for (const p of pool) tot += p.wt;
      let u = r() * tot, i = 0;
      for (; i < pool.length - 1; i++) { u -= pool[i].wt; if (u <= 0) break; }
      chosen.push(pool[i].w);
      pool.splice(i, 1);
    }
    return chosen;
  }

  // ---- simulated player (the "fail" proxy) -----------------------------------------------------------
  // A player who reached level n. Vocabulary: knows a word with p = 1 / (1 + (rank / r50)^2) (r50 grows with n:
  // players who get far are better). Search: each attempt tries one formable word they know, drawn by salience
  // (frequent and short words come to mind first; a grid slot primes its words; revealed crossing letters boost a
  // word by 1 + 8 f^2, f = share of its letters shown). A word they don't know can still be guessed from the grid
  // pattern once half of it is shown. Blind spots: 8% of known words get 1/5 of the salience. Each attempt that
  // is not a grid word (a bonus word or a slip) spends patience; `patience` attempts in a row without a new grid
  // word, or nothing left to try = stuck = fail (would need a hint). Calibrated once on 2026-10-27 so that the
  // old 600 levels sat around 20% early and 50% late; see tools/sim_curve.js and PSYCH-PROGRESS.md.
  const LENF = [0, 0, 0, 0.9, 1, 0.9, 0.7, 0.5, 0.4];
  function playerFor(n) {
    const g = Math.min(1, Math.max(0, (n - 1) / 450));
    return { r50: 13000 + 9000 * g, blind: 0.08, patience: 7 + 4 * g, slip: 0.12, gridPrior: 1.3, revealBoost: 8 };
  }
  function simPrep(level, dict) {
    const subs = dict.formable(level.letters.join(''), { minLen: 3 });
    const gi = new Map(level.words.map((w, i) => [w.word, i]));
    const cellId = new Map();
    const wcells = level.words.map((p) => {
      const dx = p.dir === 'H' ? 1 : 0, dy = 1 - dx, out = [];
      for (let i = 0; i < p.word.length; i++) {
        const k = (p.x + dx * i) + ',' + (p.y + dy * i);
        if (!cellId.has(k)) cellId.set(k, cellId.size);
        out.push(cellId.get(k));
      }
      return out;
    });
    const m = subs.length;
    const rank = new Float64Array(m), g = new Int16Array(m), sal = new Float64Array(m);
    subs.forEach((k, i) => {
      rank[i] = dict.rankOf(k);
      g[i] = gi.has(k) ? gi.get(k) : -1;
      sal[i] = Math.pow(rank[i] + 300, -0.5) * (LENF[k.length] || 0.4);
    });
    return { m, rank, g, sal, wcells, ncells: cellId.size, nGrid: level.words.length };
  }
  function simOnce(S, M, r) {
    const m = S.m, nG = S.nGrid;
    const base = new Float64Array(m), know = new Uint8Array(m), wt = new Float64Array(m);
    const shown = new Uint8Array(S.ncells), found = new Uint8Array(nG), gridSlot = new Int32Array(nG).fill(-1);
    let tot = 0;
    for (let i = 0; i < m; i++) {
      know[i] = r() < 1 / (1 + Math.pow(S.rank[i] / M.r50, 2)) ? 1 : 0;
      base[i] = S.sal[i] * (r() < M.blind ? 0.2 : 1) * (S.g[i] >= 0 ? M.gridPrior : 1);
      if (S.g[i] >= 0) gridSlot[S.g[i]] = i;
      else if (know[i]) { wt[i] = base[i]; tot += wt[i]; }
    }
    const gridWeight = (j) => {
      const i = gridSlot[j], cs = S.wcells[j];
      let s = 0;
      for (let c = 0; c < cs.length; c++) s += shown[cs[c]];
      const f = s / cs.length;
      return know[i] ? base[i] * (1 + M.revealBoost * f * f) : f >= 0.5 ? base[i] * 3 * f * f * f : 0;
    };
    const refreshGrid = () => {
      for (let j = 0; j < nG; j++) {
        const i = gridSlot[j];
        tot -= wt[i];
        wt[i] = found[j] ? 0 : gridWeight(j);
        tot += wt[i];
      }
    };
    refreshGrid();
    let nFound = 0, streak = 0;
    for (;;) {
      if (r() < M.slip) { if (++streak >= M.patience) return false; continue; }   // a fumble or a non-word
      if (tot <= 1e-12) return false;
      let u = r() * tot, pick = -1;
      for (let i = 0; i < m; i++) { if (wt[i] > 0) { pick = i; u -= wt[i]; if (u <= 0) break; } }
      if (pick < 0) return false;
      tot -= wt[pick];
      wt[pick] = 0;
      const j = S.g[pick];
      if (j >= 0) {
        streak = 0;
        found[j] = 1; nFound++;
        for (const c of S.wcells[j]) shown[c] = 1;
        for (let k = 0; k < nG; k++) if (!found[k] && S.wcells[k].every((c) => shown[c])) { found[k] = 1; nFound++; }
        if (nFound >= nG) return true;
        refreshGrid();
      } else if (++streak >= M.patience) return false;
    }
  }
  // fail rate of the simulated player on a level (0..1), deterministic for a seed
  function simulate(level, dict, n, runs, seed) {
    const S = simPrep(level, dict), M = playerFor(n), r = T.rng(T.hash('sim:' + (seed || 1) + ':' + n));
    let fail = 0;
    for (let i = 0; i < runs; i++) if (!simOnce(S, M, r)) fail++;
    return fail / runs;
  }

  // ---- generator -------------------------------------------------------------------------------------
  function buildCandidate(dict, n, p, base, alpha, r) {
    const subs = dict.formable(base, { maxRank: p.wordRank, minLen: 3 });
    if (subs.length < p.minWords) return null;
    const words = pickWords(base, subs, p.target, alpha, r);
    if (words.length < p.minWords) return null;
    const lay = PAL.layout.generate(words, r, { maxW: Math.max(7, p.letters + 1), maxH: 9 });
    if (lay.words.length < p.minWords || !lay.words.some((w) => w.word === base)) return null;
    if (n >= 3 && n <= 9) {
      // onboarding: from level 3 ("bonus words") on there is always a bonus word to find
      const inGrid = new Set(lay.words.map((w) => w.word));
      if (!dict.allFormable(base, 3).some((k) => !inGrid.has(k))) return null;
    }
    // wheel order: shuffled so the base word is not readable
    let letters = base.split('');
    for (let t = 0; t < 10; t++) {
      letters = T.shuffle(letters, r);
      if (letters.join('') !== base) break;
    }
    return { id: n, base, letters, w: lay.w, h: lay.h, words: lay.words, pack: packOf(n), difficulty: p.tier };
  }

  // Candidates (base word x rarity bias) until one sits well inside the tier band, else the closest to the target.
  // opts.runs: simulated players per candidate (default 120, the frozen data); opts.candidates caps the search
  // (endless levels at runtime use fewer of both).
  function generateOne(dict, n, used, seed, opts) {
    const o = opts || {};
    const p = params(n);
    const r = T.rng(T.hash('palabras:' + (seed || 1) + ':' + n));
    const bases = [];
    const limit = Math.min(dict.commonKeys.length, p.baseRank);
    for (let i = 0; i < limit; i++) {
      const k = dict.commonKeys[i];
      if (k.length === p.letters && !(used && used.has(k.split('').sort().join('')))) bases.push(k);
    }
    const order = T.shuffle(bases, r);
    const target = targetOf(n), runs = o.runs || 120, maxCand = o.candidates || p.candidates;
    const [lo, hi] = BANDS[p.tier], margin = Math.min(0.04, (hi - lo) / 4);
    const inside = (x) => (lo === 0 || x >= lo + margin) && x <= hi - margin;
    let best = null, tried = 0;
    for (const base of order.slice(0, 800)) {
      const alpha = p.alpha[0] + (p.alpha[1] - p.alpha[0]) * r();
      const lv = buildCandidate(dict, n, p, base, alpha, r);
      if (!lv) continue;
      let est = simulate(lv, dict, n, runs, seed);
      // close calls get a second, bigger sample (less noise when it matters)
      if (Math.abs(est - target) < (hi - lo) * 0.75) est = (est + 3 * simulate(lv, dict, n, runs * 3, (seed || 1) + 1000)) / 4;
      lv.sim = est;
      const d = Math.abs(est - target);
      if (!best || d < best.d) best = { d, lv };
      if (++tried >= maxCand || inside(est)) { if (inside(est)) best = { d, lv }; break; }
    }
    if (!best) throw new Error('no level could be built for n=' + n);
    if (used) used.add(best.lv.base.split('').sort().join(''));  // never the same letter set twice
    return best.lv;
  }

  function generateAll(dict, count, seed, onLevel) {
    const used = new Set();
    const out = [];
    for (let n = 1; n <= count; n++) {
      out.push(generateOne(dict, n, used, seed));
      if (onLevel) onLevel(out[n - 1]);
    }
    return out;
  }

  // compact form for src/data/levels.js: "letters|w|h|word,x,y,d;word,x,y,d|tier" (tier: f n d s)
  function encode(level) {
    return [level.letters.join(''), level.w, level.h,
      level.words.map((p) => [p.word, p.x, p.y, p.dir].join(',')).join(';'), TIER_CODE[level.difficulty || tierOf(level.id)]].join('|');
  }
  function decode(str, n) {
    const [letters, w, h, ws, tc] = str.split('|');
    const words = ws.split(';').map((s) => { const [word, x, y, dir] = s.split(','); return { word, x: +x, y: +y, dir }; });
    const base = words.reduce((a, b) => (b.word.length > a.length ? b.word : a), '');
    return { id: n, base, letters: Array.from(letters), w: +w, h: +h, words, pack: packOf(n), difficulty: CODE_TIER[tc] || tierOf(n) };
  }

  PAL.levels = {
    LEVEL_COUNT, PACK_SIZE, PACKS, TIERS, BANDS, TEACH, packOf, tierOf, targetOf, params, playerFor, simulate,
    generateOne, generateAll, encode, decode,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = PAL;
})(typeof window !== 'undefined' ? window : globalThis);

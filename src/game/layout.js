// Crossword layout: places words on a small grid, every word crossing at least one other, no two words
// side by side (so no accidental words appear), deterministic for a given rng.
(function (root) {
  'use strict';
  const PAL = root.PAL || (root.PAL = {});
  const K = (x, y) => x + ',' + y;

  function Board() { this.cells = new Map(); this.placed = []; this.minX = 0; this.maxX = -1; this.minY = 0; this.maxY = -1; }
  Board.prototype.get = function (x, y) { return this.cells.get(K(x, y)); };
  Board.prototype.empty = function (x, y) { return !this.cells.has(K(x, y)); };
  Board.prototype.size = function () { return { w: this.maxX - this.minX + 1, h: this.maxY - this.minY + 1 }; };

  // returns number of crossings, or -1 if the word cannot go there
  Board.prototype.check = function (word, x, y, dir, maxW, maxH) {
    const dx = dir === 'H' ? 1 : 0, dy = dir === 'V' ? 1 : 0;
    if (!this.empty(x - dx, y - dy) || !this.empty(x + dx * word.length, y + dy * word.length)) return -1;
    let crossings = 0;
    for (let i = 0; i < word.length; i++) {
      const cx = x + dx * i, cy = y + dy * i;
      const cell = this.get(cx, cy);
      if (cell) {
        if (cell.ch !== word[i] || cell[dir]) return -1;
        crossings++;
      } else if (dir === 'H') {
        if (!this.empty(cx, cy - 1) || !this.empty(cx, cy + 1)) return -1;
      } else if (!this.empty(cx - 1, cy) || !this.empty(cx + 1, cy)) return -1;
    }
    if (this.placed.length && crossings === 0) return -1;
    if (crossings === word.length) return -1;
    if (this.placed.length) {
      const minX = Math.min(this.minX, x), minY = Math.min(this.minY, y);
      const maxX = Math.max(this.maxX, x + dx * (word.length - 1)), maxY = Math.max(this.maxY, y + dy * (word.length - 1));
      if (maxX - minX + 1 > maxW || maxY - minY + 1 > maxH) return -1;
    } else if ((dir === 'H' ? word.length > maxW : word.length > maxH)) return -1;
    return crossings;
  };

  Board.prototype.place = function (word, x, y, dir) {
    const dx = dir === 'H' ? 1 : 0, dy = dir === 'V' ? 1 : 0;
    for (let i = 0; i < word.length; i++) {
      const cx = x + dx * i, cy = y + dy * i, k = K(cx, cy);
      const cell = this.cells.get(k) || { ch: word[i], H: false, V: false };
      cell[dir] = true;
      this.cells.set(k, cell);
    }
    if (!this.placed.length) { this.minX = x; this.minY = y; this.maxX = x; this.maxY = y; }
    this.minX = Math.min(this.minX, x); this.minY = Math.min(this.minY, y);
    this.maxX = Math.max(this.maxX, x + dx * (word.length - 1)); this.maxY = Math.max(this.maxY, y + dy * (word.length - 1));
    this.placed.push({ word, x, y, dir });
  };

  // candidate positions for word: cross an existing letter perpendicular to it
  Board.prototype.candidates = function (word) {
    const out = [];
    for (const [k, cell] of this.cells) {
      if (cell.H && cell.V) continue;
      const comma = k.indexOf(',');
      const cx = +k.slice(0, comma), cy = +k.slice(comma + 1);
      const dir = cell.H ? 'V' : 'H';
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== cell.ch) continue;
        out.push(dir === 'H' ? { x: cx - i, y: cy, dir } : { x: cx, y: cy - i, dir });
      }
    }
    return out;
  };

  function attempt(order, r, maxW, maxH) {
    const b = new Board();
    const first = order[0];
    b.place(first, 0, 0, first.length <= maxW ? 'H' : 'V');
    let pending = order.slice(1);
    let progress = true;
    while (pending.length && progress) {
      progress = false;
      const next = [];
      for (const w of pending) {
        let best = null, bestScore = -Infinity;
        for (const c of b.candidates(w)) {
          const cross = b.check(w, c.x, c.y, c.dir, maxW, maxH);
          if (cross < 0) continue;
          const dx = c.dir === 'H' ? 1 : 0, dy = 1 - dx;
          const w2 = Math.max(b.maxX, c.x + dx * (w.length - 1)) - Math.min(b.minX, c.x) + 1;
          const h2 = Math.max(b.maxY, c.y + dy * (w.length - 1)) - Math.min(b.minY, c.y) + 1;
          // more crossings, smaller box, a bit taller than wide (portrait), small random tie-break
          const score = cross * 6 - w2 * h2 * 0.25 - Math.max(0, w2 - h2 - 1) * 0.8 + r() * 0.6;
          if (score > bestScore) { bestScore = score; best = c; }
        }
        if (best) { b.place(w, best.x, best.y, best.dir); progress = true; } else next.push(w);
      }
      pending = next;
    }
    return b;
  }

  // words: normalised keys, words[0] is placed first (the base word). Returns {w, h, words:[{word,x,y,dir}], dropped}
  function generate(words, r, opts) {
    const o = opts || {};
    const maxW = o.maxW || 9, maxH = o.maxH || 10, tries = o.attempts || 14;
    let best = null;
    for (let t = 0; t < tries; t++) {
      const rest = words.slice(1).map((w) => ({ w, k: w.length + r() })).sort((a, b) => b.k - a.k).map((x) => x.w);
      const b = attempt([words[0]].concat(rest), r, maxW, maxH);
      const s = b.size();
      let cross = 0;
      for (const c of b.cells.values()) if (c.H && c.V) cross++;
      const score = b.placed.length * 1000 + cross * 10 - s.w * s.h;
      if (!best || score > best.score) best = { score, b };
      if (b.placed.length === words.length && t >= 3) break;
    }
    const b = best.b, s = b.size();
    const placed = b.placed.map((p) => ({ word: p.word, x: p.x - b.minX, y: p.y - b.minY, dir: p.dir }));
    const names = new Set(placed.map((p) => p.word));
    return { w: s.w, h: s.h, words: placed, dropped: words.filter((w) => !names.has(w)) };
  }

  // validates a layout: letters agree, no side-by-side contact, connected, inside the box
  function validate(layout) {
    const grid = new Map();
    const errors = [];
    for (const p of layout.words) {
      const dx = p.dir === 'H' ? 1 : 0, dy = 1 - dx;
      for (let i = 0; i < p.word.length; i++) {
        const x = p.x + dx * i, y = p.y + dy * i;
        if (x < 0 || y < 0 || x >= layout.w || y >= layout.h) errors.push('out of box: ' + p.word);
        const k = K(x, y), cur = grid.get(k);
        if (cur && cur.ch !== p.word[i]) errors.push('clash at ' + k + ' ' + p.word);
        const cell = cur || { ch: p.word[i], ids: [] };
        cell.ids.push(p.word);
        grid.set(k, cell);
      }
    }
    // the set of horizontal and vertical runs of letters must be exactly the placed words (no accidental words)
    const runs = [];
    for (let y = 0; y < layout.h; y++) {
      let s = '';
      for (let x = 0; x <= layout.w; x++) {
        const c = grid.get(K(x, y));
        if (c) s += c.ch; else { if (s.length > 1) runs.push(s); s = ''; }
      }
    }
    for (let x = 0; x < layout.w; x++) {
      let s = '';
      for (let y = 0; y <= layout.h; y++) {
        const c = grid.get(K(x, y));
        if (c) s += c.ch; else { if (s.length > 1) runs.push(s); s = ''; }
      }
    }
    const want = layout.words.map((p) => p.word).sort();
    if (JSON.stringify(runs.sort()) !== JSON.stringify(want)) errors.push('runs ' + runs.join(',') + ' != words ' + want.join(','));
    // connectivity through shared cells
    if (layout.words.length) {
      const seen = new Set([layout.words[0].word]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const c of grid.values()) {
          if (c.ids.some((id) => seen.has(id))) for (const id of c.ids) if (!seen.has(id)) { seen.add(id); grew = true; }
        }
      }
      if (seen.size !== layout.words.length) errors.push('not connected');
    }
    return errors;
  }

  PAL.layout = { generate, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = PAL;
})(typeof window !== 'undefined' ? window : globalThis);

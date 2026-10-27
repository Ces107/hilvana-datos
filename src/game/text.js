// Text helpers, seeded RNG and the dictionary. Works in the browser (window.PAL) and in node (require).
(function (root) {
  'use strict';
  const PAL = root.PAL || (root.PAL = {});

  // ---- normalisation: lowercase, accents removed, ñ kept as its own letter -------------------------
  const MAP = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u', 'â': 'a', 'ê': 'e', 'î': 'i', 'ô': 'o', 'û': 'u', 'ä': 'a', 'ë': 'e', 'ï': 'i', 'ö': 'o' };
  function normalize(s) {
    let out = '';
    for (const ch of String(s).toLowerCase()) out += MAP[ch] || ch;
    return out;
  }
  const upper = (k) => k.toLocaleUpperCase('es');
  const LETTERS = 'abcdefghijklmnñopqrstuvwxyz';

  function counts(word) {
    const c = {};
    for (const ch of word) c[ch] = (c[ch] || 0) + 1;
    return c;
  }
  function canForm(word, letterCounts) {
    const used = {};
    for (const ch of word) {
      used[ch] = (used[ch] || 0) + 1;
      if (used[ch] > (letterCounts[ch] || 0)) return false;
    }
    return true;
  }

  // ---- seeded RNG (mulberry32) and string hash ------------------------------------------------------
  function rng(seed) {
    let a = seed >>> 0;
    const next = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = (n) => Math.floor(next() * n);
    return next;
  }
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function shuffle(arr, r) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ---- dictionary -----------------------------------------------------------------------------------
  // data = window.PALABRAS_WORDS: {common: "que los ... está ...", bonus: "front-coded keys"}
  function decodeFront(str) {
    const out = [];
    let prev = '';
    if (!str) return out;
    for (const tok of str.split(' ')) {
      const m = /^(\d)(.*)$/.exec(tok);
      const w = m ? prev.slice(0, +m[1]) + m[2] : tok;
      out.push(w);
      prev = w;
    }
    return out;
  }

  function Dict(data) {
    const forms = data.common.split(' ');
    this.commonKeys = [];
    this.rank = new Map();
    this.displayForm = new Map();
    for (const f of forms) {
      const k = normalize(f);
      if (this.rank.has(k)) continue;
      this.rank.set(k, this.commonKeys.length);
      this.displayForm.set(k, f);
      this.commonKeys.push(k);
    }
    this.all = new Set(this.commonKeys);
    for (const k of decodeFront(data.bonus)) this.all.add(k);
    this.byLength = {};
    for (const k of this.all) (this.byLength[k.length] || (this.byLength[k.length] = [])).push(k);
  }
  // extra accepted words (bonus only), e.g. regional words from our own ¿Cómo se dice? data (guagua, pibe)
  Dict.prototype.addWords = function (words) {
    let n = 0;
    for (const w of words) {
      const k = normalize(w);
      if (k.length < 3 || k.length > 8 || !/^[a-zñ]+$/.test(k) || this.all.has(k)) continue;
      this.all.add(k);
      (this.byLength[k.length] || (this.byLength[k.length] = [])).push(k);
      n++;
    }
    return n;
  };
  Dict.regionalWords = function (reg) {
    const out = [];
    for (const set of [reg && reg.concepts, reg && reg.spain_internal]) for (const c of set || []) for (const v of c.variants) out.push(v.word);
    return out;
  };
  Dict.prototype.has = function (word) { return this.all.has(normalize(word)); };
  Dict.prototype.rankOf = function (k) { const r = this.rank.get(k); return r === undefined ? Infinity : r; };
  Dict.prototype.display = function (k) { return this.displayForm.get(k) || k; };
  Dict.prototype.isCommon = function (k) { return this.rank.has(k); };
  // common words formable from the letters, most frequent first
  Dict.prototype.formable = function (letters, opts) {
    const o = opts || {};
    const minLen = o.minLen || 3, maxLen = o.maxLen || letters.length, maxRank = o.maxRank || Infinity;
    const c = counts(letters);
    const out = [];
    const n = Math.min(this.commonKeys.length, maxRank);
    for (let i = 0; i < n; i++) {
      const k = this.commonKeys[i];
      if (k.length >= minLen && k.length <= maxLen && canForm(k, c)) out.push(k);
    }
    return out;
  };
  // every accepted word (common + bonus) formable from the letters
  Dict.prototype.allFormable = function (letters, minLen) {
    const c = counts(letters);
    const out = [];
    for (let len = minLen || 3; len <= letters.length; len++) {
      for (const k of this.byLength[len] || []) if (canForm(k, c)) out.push(k);
    }
    return out;
  };

  PAL.text = { normalize, upper, counts, canForm, rng, hash, shuffle, decodeFront, LETTERS };
  PAL.Dict = Dict;
  if (typeof module !== 'undefined' && module.exports) module.exports = PAL;
})(typeof window !== 'undefined' ? window : globalThis);

// Freezes the level list: node tools/gen_levels.js [--dry]  -> src/data/levels.js (MPL-2.0, contains dictionary words)
// Each level is tuned toward its tier's fail target by the simulated player (src/game/levels.js); --dry prints the
// stats without writing. Validate the frozen curve with: node tools/sim_curve.js
'use strict';
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');
globalThis.window = globalThis;
require(path.join(SRC, 'data', 'words.js'));
const PAL = require(path.join(SRC, 'game', 'text.js'));
require(path.join(SRC, 'game', 'layout.js'));
require(path.join(SRC, 'game', 'levels.js'));
const L = PAL.levels;

const SEED = 1;
const dry = process.argv.includes('--dry');
const count = +(process.argv.find((a) => /^--count=/.test(a)) || '--count=' + L.LEVEL_COUNT).split('=')[1];
const t0 = Date.now();
const dict = new PAL.Dict(window.PALABRAS_WORDS);
const levels = L.generateAll(dict, count, SEED, (l) => { if (l.id % 50 === 0) process.stdout.write(l.id + ' '); });
console.log('');
const body = 'window.PALABRAS_LEVELS = ' + JSON.stringify(levels.map(L.encode)) + ';\n';
if (!dry) {
  const header = fs.readFileSync(path.join(SRC, 'data', 'words.js'), 'utf8').split('*/')[0] + '*/\n';
  fs.writeFileSync(path.join(SRC, 'data', 'levels.js'), header + body);
}

const hist = {};
for (const l of levels) { const k = l.letters.length + 'L/' + l.words.length + 'w'; hist[k] = (hist[k] || 0) + 1; }
console.log(levels.length + ' levels in ' + (Date.now() - t0) + ' ms, ' + (Buffer.byteLength(body) / 1024).toFixed(1) + ' KB' + (dry ? ' (dry run)' : ''));
console.log(JSON.stringify(hist));
// generation-time estimate per tier (the honest number comes from tools/sim_curve.js, with fresh seeds)
for (const t of L.TIERS) {
  const s = levels.filter((l) => l.difficulty === t).map((l) => l.sim);
  const [lo, hi] = L.BANDS[t];
  const inBand = s.filter((x) => x >= lo && x <= hi).length;
  console.log(t.padEnd(13), 'n=' + String(s.length).padEnd(4), 'mean ' + (s.reduce((a, b) => a + b, 0) / s.length).toFixed(3),
    'min ' + Math.min(...s).toFixed(2), 'max ' + Math.max(...s).toFixed(2), 'in band ' + Math.round(100 * inBand / s.length) + '%');
}
for (const n of [1, 2, 10, 11, 25, 51, 120, 200, 400, 600].filter((x) => x <= count)) {
  const l = levels[n - 1];
  console.log(n, l.difficulty, l.sim.toFixed(2), l.pack.name, l.letters.join('').toUpperCase(), l.w + 'x' + l.h, l.words.map((w) => dict.display(w.word)).join(' '));
}

// delta-recount.mjs with one added tally: noCr, the texts in each corpus that hold no CR (derived by string replacement; otherwise identical).
// Usage: node delta-recount.mjs <base dist> <head dist> <fence-probe.mjs>
// The fence cases are read from fence-probe.mjs's CASES literal; the six N2 cases are retyped here from the PR's description of
// them (crlf-differential.mjs N2_CASES). Placements, renderings and the tally are this file's own code.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [baseDist, headDist, probePath] = process.argv.slice(2);
const scanOf = async (d) => (await import(pathToFileURL(join(d, 'git-object-reader.js')).href)).scanActiveContent;
const base = await scanOf(baseDist);
const head = await scanOf(headDist);
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const B = '```';
const T = '~~~';
const S = '<script>x</script>';
const P = '## PROBE [p](probe.md)';

const src = readFileSync(probePath, 'utf8');
const i0 = src.indexOf('const CASES = [');
const i1 = src.indexOf('\n];', i0);
const FENCE = new Function('B', 'T', 'return ' + src.slice(i0 + 'const CASES = '.length, i1 + 2) + ';')(B, T).map((row) => row[2]);
const N2 = [[T, B, T, S, T, B, T], [B, S, B + ' text'], [T, S, T + ' text'], [B, S, B + ' text', B, 'after'], [T, B, T, 'mid', T, B, S, T], [B, 'x', B + '\t', S, B, 'y', B]];

const ends = {
  lf: () => LF,
  crlf: () => CR + LF,
  cr: () => CR,
  firstCrlf: (i) => (i === 0 ? CR + LF : LF),
  lastCrlf: (i, n) => (i === n - 1 ? CR + LF : LF),
  firstCr: (i) => (i === 0 ? CR : LF),
  cycle: (i) => [LF, CR + LF, CR][i % 3],
};
function* placed(lines) {
  yield lines;
  for (const ins of [S, P]) {
    for (let s = 0; s <= lines.length; s += 1) yield [...lines.slice(0, s), ins, ...lines.slice(s)];
    for (let i = 0; i < lines.length; i += 1) yield lines.map((l, j) => (j === i ? l + ins : l));
  }
}
const key = (f) => f.form + (f.context ? ':' + f.context : '') + (f.form === 'malformed-code-context' ? '@' + f.line : '');
const same = (a, b) => JSON.stringify(a.map(key).sort()) === JSON.stringify(b.map(key).sort());
function tally(cases) {
  const t = { texts: 0, refuses: 0, accepts: 0, sameDecisionOtherFindings: 0, unchanged: 0 };
  for (const lines of cases) {
    for (const p of placed(lines)) {
      for (const end of Object.values(ends)) {
        for (const final of [true, false]) {
          let text = '';
          for (let i = 0; i < p.length; i += 1) text += p[i] + (i === p.length - 1 && !final ? '' : end(i, p.length));
          t.texts += 1; if (!text.includes(CR)) { t.noCr = (t.noCr ?? 0) + 1; }
          const b = base(text);
          const h = head(text);
          if ((b.length > 0) !== (h.length > 0)) t[h.length > 0 ? 'refuses' : 'accepts'] += 1;
          else t[same(b, h) ? 'unchanged' : 'sameDecisionOtherFindings'] += 1;
        }
      }
    }
  }
  return t;
}
console.log(JSON.stringify({ fenceCases: FENCE.length, fence: tally(FENCE), n2Cases: N2.length, n2: tally(N2) }));

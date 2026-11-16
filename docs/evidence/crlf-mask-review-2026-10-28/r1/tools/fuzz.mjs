// R-GP-IMPL-CRLF-MASK-1 reviewer fuzz: base mask (f7ea8584 / d621bfa2) against head mask (c399eda9 / 6928b50a).
// Usage: node fuzz.mjs <base dist> <head dist> <out.json> [iterations] [seed]
// Every text is synthetic. The LF form of a text is computed here by an independent scanner (not a regex split): a CR followed
// by LF is one line end, a lone CR is one line end, an LF is one line end; each becomes one LF.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const [baseDist, headDist, out, itersArg, seedArg] = process.argv.slice(2);
const ITERS = Number(itersArg ?? 20000);
const SEED = Number(seedArg ?? 544);
const load = async (dist) => ({
  scan: (await import(pathToFileURL(join(dist, 'git-object-reader.js')).href)).scanActiveContent,
  mask: (await import(pathToFileURL(join(dist, 'markdown-code-context.js')).href)).maskMarkdownCodeContexts,
});
const base = await load(baseDist);
const head = await load(headDist);

const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const CRLF = CR + LF;
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const HI = String.fromCharCode(0xd800);
const LO = String.fromCharCode(0xdc00);
const NBSP = String.fromCharCode(0xa0);

// mulberry32
let state = SEED >>> 0;
const rand = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (xs) => xs[Math.floor(rand() * xs.length)];

// Independent line model: returns { lines, terms } scanning char by char.
function lineModel(text) {
  const lines = [];
  const terms = [];
  let cur = '';
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === CR) {
      if (text[i + 1] === LF) { terms.push(CRLF); i += 1; } else terms.push(CR);
      lines.push(cur); cur = '';
    } else if (c === LF) { terms.push(LF); lines.push(cur); cur = ''; }
    else cur += c;
  }
  lines.push(cur); terms.push('');
  return { lines, terms };
}
const lfFormOf = (text) => { const m = lineModel(text); return m.lines.map((l, i) => l + (m.terms[i] === '' ? '' : LF)).join(''); };
// Re-terminate an LF-only text with another text's terminators (same line count required).
const reterminate = (lfText, terms) => {
  const parts = lfText.split(LF);
  if (parts.length !== terms.length) return undefined;
  return parts.map((p, i) => p + terms[i]).join('');
};

const LINE_POOL = [
  '```', '~~~', '````', '`````', '~~~~', ' ```', '   ```', '    ```', '\t```', '```js', '``` js', '```a`b', '~~~a`b', '``` text', '```\t', '```   ',
  '- ```', '> ```', '``', '`', 'a `b', 'c` d', '`x`', '``x``', 'x ``` y', '<script>x</script>', '<div>', '<svg>', '<!-- c -->', '<a onload=x>',
  '[a](javascript:x)', '[b](&#106;x)', 'plain text', '', ' ', '  ', '# Head', '- item', `x${LS}y`, `\`\`\`${LS}`, `~~~${PS}`, `${HI}x`, `${LO}`, `a${HI}${LO}b`,
  `\`${HI}\``, `${NBSP}\`\`\``, '```' + LS + '```', '~~~ a`b',
];
const CHAR_POOL = ['`', '`', '`', '~', '~', ' ', ' ', '\t', 'x', '<', '>', 's', 'a', LF, LF, CR, CR, LS, HI, LO, '-', '>', '#', '[', ']', '(', ')', ':', '='];

function randomLines() {
  const n = Math.floor(rand() * 10);
  const lines = [];
  for (let i = 0; i < n; i += 1) {
    if (rand() < 0.75) lines.push(pick(LINE_POOL));
    else { let s = ''; const k = Math.floor(rand() * 8); for (let j = 0; j < k; j += 1) { const c = pick(CHAR_POOL); if (c !== CR && c !== LF) s += c; } lines.push(s); }
  }
  return lines;
}
const MODES = ['lf', 'crlf', 'cr', 'mixed'];
function terminatorsFor(n, mode, final) {
  return Array.from({ length: n }, (_, i) => {
    if (i === n - 1 && !final) return '';
    if (mode === 'lf') return LF;
    if (mode === 'crlf') return CRLF;
    if (mode === 'cr') return CR;
    return pick([LF, CRLF, CR]);
  });
}
function randomSoup() {
  const k = Math.floor(rand() * 40);
  let s = '';
  for (let j = 0; j < k; j += 1) s += pick(CHAR_POOL);
  return s;
}

const EDGE = ['', CR, LF, CRLF, CR + CR + LF, LF + CR, CR + CR, LF + LF, CRLF + CRLF, 'a' + CR, 'a' + CRLF, '```' + CR, '```' + CRLF + '```' + CR,
  CR + '```' + CR + 'x' + CR + '```', HI, LO, HI + CR + LO, '`' + HI + CR + '`', CR + CR + CR + LF + LF, '```' + CR + CR + LF + '```' + LF + CR];

const counts = { texts: 0, lfTexts: 0, crTexts: 0, uniformCrlf: 0, H1fail: 0, H2fail: 0, H3fail: 0, H4fail: 0, H5fail: 0,
  baseVsHead: { refuses: 0, accepts: 0, sameDecisionOtherFindings: 0, positionOnly: 0, unchanged: 0 },
  positionVsLf: { rowsWithNonMalformedPositionDiff: 0, rowsMalformedLineDiffFromBase: 0 } };
const failures = [];
const fail = (check, text, detail) => { counts[`${check}fail`] += 1; if (failures.length < 40) failures.push({ check, text: JSON.stringify(text), detail }); };
const decision = (findings) => findings.map((f) => `${f.form}${f.context ? ':' + f.context : ''}${f.form === 'malformed-code-context' ? '@' + f.line : ''}`).sort();
const decisionNoLine = (findings) => findings.map((f) => `${f.form}${f.context ? ':' + f.context : ''}`).sort();

function check(text) {
  counts.texts += 1;
  const hasCr = text.includes(CR);
  const hT = { mask: head.mask(text), scan: head.scan(text) };
  const bT = { mask: base.mask(text), scan: base.scan(text) };
  // H5: the mask's masked text keeps length, every CR and LF at its offset, every other unit its own or a space.
  if (hT.mask.kind === 'masked') {
    const m = hT.mask.masked;
    let bad = m.length !== text.length ? 'length' : undefined;
    for (let i = 0; bad === undefined && i < text.length; i += 1) {
      const o = text[i];
      if (o === CR || o === LF) { if (m[i] !== o) bad = `terminator@${i}`; }
      else if (m[i] !== o && m[i] !== ' ') bad = `byte@${i}`;
    }
    if (bad) fail('H5', text, bad);
  }
  if (!hasCr) {
    counts.lfTexts += 1;
    // H1: an LF text (no CR anywhere) is read identically at base and head: mask and findings, positions included.
    if (!isDeepStrictEqual(hT, bT)) fail('H1', text, { base: bT, head: hT });
    return;
  }
  counts.crTexts += 1;
  const L = lfFormOf(text);
  const { terms } = lineModel(text);
  const hL = { mask: head.mask(L), scan: head.scan(L) };
  const bL = { mask: base.mask(L), scan: base.scan(L) };
  if (!isDeepStrictEqual(hL, bL)) fail('H1', L, { base: bL, head: hL });
  // H2: the head mask of T is exactly the head mask of L with T's own terminators put back.
  if (hT.mask.kind !== hL.mask.kind) fail('H2', text, { kind: [hT.mask.kind, hL.mask.kind] });
  else if (hT.mask.kind === 'malformed') {
    if (hT.mask.reason !== hL.mask.reason || hT.mask.line !== hL.mask.line) fail('H2', text, { t: hT.mask, l: hL.mask });
  } else {
    const expected = reterminate(hL.mask.masked, terms);
    if (expected !== hT.mask.masked || hT.mask.fences !== hL.mask.fences || hT.mask.spans !== hL.mask.spans) fail('H2', text, { t: hT.mask, l: hL.mask, expected });
  }
  // H3: the scan decision of T equals L's (forms, contexts, malformed line).
  if (!isDeepStrictEqual(decision(hT.scan), decision(hL.scan))) fail('H3', text, { t: hT.scan, l: hL.scan });
  // H4: a text with CRLF after every line (and no other CR) has findings deep-equal to L's, positions included.
  const uniformCrlf = terms.every((t, i) => t === CRLF || (i === terms.length - 1 && t === '')) && terms.some((t) => t === CRLF);
  if (uniformCrlf) {
    counts.uniformCrlf += 1;
    if (!isDeepStrictEqual(hT.scan, hL.scan)) fail('H4', text, { t: hT.scan, l: hL.scan });
  } else if (!isDeepStrictEqual(hT.scan, hL.scan) && isDeepStrictEqual(decision(hT.scan), decision(hL.scan))) {
    counts.positionVsLf.rowsWithNonMalformedPositionDiff += 1;
  }
  // base vs head on T itself
  const bEx = bT.scan.length > 0;
  const hEx = hT.scan.length > 0;
  const k = counts.baseVsHead;
  if (bEx !== hEx) { if (hEx) k.refuses += 1; else k.accepts += 1; }
  else if (!isDeepStrictEqual(decisionNoLine(bT.scan), decisionNoLine(hT.scan))) k.sameDecisionOtherFindings += 1;
  else if (!isDeepStrictEqual(bT.scan, hT.scan)) {
    k.positionOnly += 1;
    if (bT.scan.some((f) => f.form === 'malformed-code-context')) counts.positionVsLf.rowsMalformedLineDiffFromBase += 1;
  } else k.unchanged += 1;
}

for (const e of EDGE) check(e);
for (let i = 0; i < ITERS; i += 1) {
  const r = rand();
  if (r < 0.45) {
    const lines = randomLines();
    const mode = pick(MODES);
    const final = rand() < 0.6;
    const terms = terminatorsFor(lines.length, mode, final);
    check(lines.map((l, j) => l + terms[j]).join(''));
    // and the same lines in each uniform rendering, so every LF form is also checked against base directly
    if (mode !== 'lf') check(lines.map((l, j) => l + (terms[j] === '' ? '' : LF)).join(''));
  } else if (r < 0.75) {
    check(randomSoup());
  } else {
    // soup with no CR at all: the LF population, base must equal head
    check(randomSoup().split(CR).join(''));
  }
}
const result = { tool: 'rev-544/tools/fuzz.mjs', seed: SEED, iterations: ITERS, edgeCases: EDGE.length, counts, failures };
writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify(counts));
if (failures.length > 0) { console.log('first failure', JSON.stringify(failures[0]).slice(0, 800)); process.exit(1); }

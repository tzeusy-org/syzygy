// Round 3 (rev-544-r3): round 2's slice-rebuild.mjs with the five separators of the round-2 repair (VT and FF added), and a
// count of texts holding none. Independent rebuild of the differential's separator slice, and where each separator lands at the head.
// The corpora are read as the differential reads them (the vet's corpus.mjs, the CASES literal of fence-probe.mjs), and the six N2
// cases are retyped from crlf-differential.mjs; the construction below is this tool's own. Each separator occurrence is classed by
// an instrumented copy of the head mask: inside a fence, inside an inline span (delimiters excluded), or outside every context;
// a text the head mask calls malformed has no mask, and is classed by reason.
// Usage: node slice-rebuild.mjs <evidence dir> <head dist> <node_modules> <scratch dir, must not exist> [<slice dump json>]
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [evidence, headDist, nodeModules, scratch, dump] = process.argv.slice(2);
if (existsSync(scratch)) throw new Error(`${scratch} exists`);
const ch = (n) => String.fromCharCode(n);
const B = '```', T = '~~~', LF = '\n', P = '<script>x</script>';
const { CASES: VET } = await import(pathToFileURL(join(evidence, 'vet-v-crlf-mask-1', 'tools', 'corpus.mjs')).href);
const src = readFileSync(join(evidence, '..', 'syzygy-bpyt-6-3', 'fence-probe.mjs'), 'utf8');
const s0 = src.indexOf('const CASES = [');
const s1 = src.indexOf('\n];', s0);
const FENCE = new Function('B', 'T', `return ${src.slice(s0 + 'const CASES = '.length, s1 + 2)};`)(B, T).map((c) => c[2]);
const N2 = [[T, B, T, P, T, B, T], [B, P, `${B} text`], [T, P, `${T} text`], [B, P, `${B} text`, B, 'after'], [T, B, T, 'mid', T, B, P, T], [B, 'x', `${B}\t`, P, B, 'y', B]];
const SEPS = [0x2028, 0x2029, 0x85, 0x0b, 0x0c].map(ch);
const texts = new Set();
for (const lines of [...VET.map((c) => c.lines), ...FENCE, ...N2]) {
  for (const body of [lines, lines.concat([P])]) {
    for (const sep of SEPS) {
      const n = body.length;
      texts.add(body.join(sep));
      for (let i = 0; i < n; i += 1) {
        const appended = body.slice(); appended[i] = appended[i] + sep; texts.add(appended.join(LF));
        const prepended = body.slice(); prepended[i] = sep + prepended[i]; texts.add(prepended.join(LF));
      }
      for (let i = 1; i < n; i += 1) texts.add(body.slice(0, i).join(LF) + sep + body.slice(i).join(LF));
    }
  }
}
const list = [...texts];
const digest = (l) => createHash('sha256').update(JSON.stringify([...l].sort())).digest('hex');
const none = list.filter((t) => !SEPS.some((sep) => t.includes(sep)));
const out = { holdingNone: none.length, holdingNoneTexts: none.map((t) => JSON.stringify(t)), holdingEach: Object.fromEntries(SEPS.map((sep) => [sep.charCodeAt(0).toString(16), list.filter((t) => t.includes(sep)).length])), cases: { vet: VET.length, fence: FENCE.length, n2: N2.length }, texts: list.length, withCr: list.filter((t) => t.includes('\r')).length, sortedDigest: digest(list) };
if (dump) {
  const theirs = JSON.parse(readFileSync(dump, 'utf8'));
  out.differentialSlice = { texts: theirs.length, sortedDigest: digest(theirs), equalSets: theirs.length === list.length && digest(theirs) === digest(list) };
}
// Instrumented head mask: fence lines are filled with U+E001, span content with U+E002.
mkdirSync(scratch, { recursive: true });
symlinkSync(nodeModules, join(scratch, 'node_modules'));
const dist = join(scratch, 'dist');
cpSync(headDist, dist, { recursive: true });
const maskPath = join(dist, 'markdown-code-context.js');
let m = readFileSync(maskPath, 'utf8');
const swaps = [
  ['out.push(...pending.map(blank));', `out.push(...pending.map((s) => '${ch(0xe001)}'.repeat(s.length)));`],
  ["rendered += span === undefined ? line[cursor] : ' ';", `rendered += span === undefined ? line[cursor] : '${ch(0xe002)}';`],
];
for (const [a, b] of swaps) { if (m.split(a).length !== 2) throw new Error('instrument: ' + a); m = m.replace(a, () => b); }
writeFileSync(maskPath, m);
const { maskMarkdownCodeContexts: inst } = await import(pathToFileURL(maskPath).href);
const { scanActiveContent } = await import(pathToFileURL(join(headDist, 'git-object-reader.js')).href);
const perSep = {};
let excludedByHead = 0;
for (const sep of SEPS) perSep[`U+${sep.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`] = { texts: 0, fence: 0, span: 0, outside: 0, malformedAtHead: 0 };
for (const t of list) {
  if (scanActiveContent(t).length > 0) excludedByHead += 1;
  const r = inst(t);
  for (const sep of SEPS) {
    if (!t.includes(sep)) continue;
    const row = perSep[`U+${sep.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`];
    row.texts += 1;
    if (r.kind !== 'masked') { row.malformedAtHead += 1; continue; }
    const classes = new Set();
    for (let i = 0; i < t.length; i += 1) {
      if (t[i] !== sep) continue;
      classes.add(r.masked[i] === ch(0xe001) ? 'fence' : r.masked[i] === ch(0xe002) ? 'span' : r.masked[i] === sep ? 'outside' : 'other');
    }
    for (const c of classes) row[c] = (row[c] ?? 0) + 1;
  }
}
out.excludedByHead = excludedByHead;
out.perSeparator = perSep;
out.note = 'fence / span / outside count texts holding at least one occurrence of that separator at such a position (a text can count in more than one); malformedAtHead counts texts with no mask';
rmSync(scratch, { recursive: true, force: true });
console.log(JSON.stringify(out, null, 1));

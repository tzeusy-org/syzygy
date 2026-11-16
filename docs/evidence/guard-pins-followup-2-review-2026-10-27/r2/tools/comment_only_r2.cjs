// rev-541b: the testkit change is comment-only, by esbuild (not the TypeScript compiler the lane and round 1 used) and by a
// line-level check. esbuild strips types and every non-legal comment; with whitespace minified and identifiers kept, two sources
// that differ only in comments give the same output. Selftest: a regex character, an identifier and a string literal each change
// the output; an added comment does not.
// Usage: node comment_only_r2.cjs <esbuild dir> <out.json> <testkit blob A> <testkit blob B> [<blob C> ...]
const fs = require('node:fs');
const crypto = require('node:crypto');
const [esbuildDir, out, ...blobs] = process.argv.slice(2);
const esbuild = require(esbuildDir);
const strip = (src) => esbuild.transformSync(src, { loader: 'ts', minifyWhitespace: true, minifyIdentifiers: false, minifySyntax: false, legalComments: 'none', format: 'esm' }).code;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const srcs = blobs.map((p) => fs.readFileSync(p, 'utf8'));
const stripped = srcs.map(strip);
const pairs = [];
for (let i = 1; i < srcs.length; i++) pairs.push({ from: blobs[i - 1].split('/').pop(), to: blobs[i].split('/').pop(), bytesDiffer: srcs[i - 1] !== srcs[i], strippedEqual: stripped[i - 1] === stripped[i] });

// Line-level: every changed line (LCS over lines, via a simple DP) lies inside the comment that closes on the line before
// `const LOCAL_VERSION = `, and starts with ` * `.
function changed(a, b) {
  const A = a.split('\n'), B = b.split('\n');
  const n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const removed = [], added = [];
  let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) removed.push(i++ + 1); else added.push(j++ + 1); }
  while (i < n) removed.push(i++ + 1);
  while (j < m) added.push(j++ + 1);
  return { A, B, removed, added };
}
function docSpan(lines) {
  const end = lines.findIndex((l) => l.startsWith('const LOCAL_VERSION = '));
  let start = end - 1;
  while (start >= 0 && !lines[start].startsWith('/**')) start--;
  return [start + 1, end]; // 1-based first line of the comment, and the last (the line before LOCAL_VERSION)
}
const lineLevel = [];
for (let k = 1; k < srcs.length; k++) {
  const { A, B, removed, added } = changed(srcs[k - 1], srcs[k]);
  const [as, ae] = docSpan(A), [bs, be] = docSpan(B);
  const bad = [...removed.filter((l) => l < as || l > ae || !A[l - 1].startsWith(' * ')).map((l) => ['-', l, A[l - 1]]),
    ...added.filter((l) => l < bs || l > be || !B[l - 1].startsWith(' * ')).map((l) => ['+', l, B[l - 1]])];
  const lvA = A.find((l) => l.startsWith('const LOCAL_VERSION = ')), lvB = B.find((l) => l.startsWith('const LOCAL_VERSION = '));
  lineLevel.push({ from: blobs[k - 1].split('/').pop(), to: blobs[k].split('/').pop(), removed, added, docComment: { from: [as, ae], to: [bs, be] }, outsideOrNotStarLine: bad, localVersionLineEqual: lvA === lvB, lineCounts: [A.length, B.length] });
}

const base = srcs[srcs.length - 1];
const one = (s, a, b) => { if (s.split(a).length !== 2) throw new Error('selftest edit not unique: ' + a); return s.replace(a, b); };
const selftest = {
  regexCharChanged: strip(one(base, 'tar\\.gz)$/iu;', 'tar\\.gx)$/iu;')) === strip(base),
  identifierRenamed: strip(base.replaceAll('localNames', 'localNamez')) === strip(base),
  stringLiteralChanged: strip(one(base, "'./dist/'", "'./dist2/'")) === strip(base),
  commentAdded: strip(one(base, 'const LOCAL_VERSION = ', '/* x */ const LOCAL_VERSION = ')) === strip(base),
  docCommentLineAdded: strip(one(base, ' * GP-Q0 ruling first. */', ' * GP-Q0 ruling first.\n * extra */')) === strip(base),
};
const ok = !selftest.regexCharChanged && !selftest.identifierRenamed && !selftest.stringLiteralChanged && selftest.commentAdded && selftest.docCommentLineAdded;
const record = { esbuild: require(esbuildDir + '/package.json').version, blobs: blobs.map((p, k) => ({ file: p.split('/').pop(), sha256: sha(srcs[k]), strippedSha256: sha(stripped[k]) })), pairs, lineLevel, selftest, selftestOk: ok };
fs.writeFileSync(out, JSON.stringify(record, null, 1) + '\n');
console.log(JSON.stringify({ pairs, lineLevel: lineLevel.map((x) => ({ from: x.from, to: x.to, removed: x.removed, added: x.added, bad: x.outsideOrNotStarLine.length, lv: x.localVersionLineEqual })), selftest, ok }));

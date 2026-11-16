// Reviewer's own differential for syzygy-bpyt.1.18 (R-GP-IMPL-SPREAD-LOOPS-1), inputs the lane's tools did not run.
// Usage: node own-differential.mjs <base dist> <head dist> <md list file> <repo root> <out.json>
//   <md list file>: NUL-separated tracked .md paths (git ls-files -z '*.md'), read from <repo root> (the Syzygy clone itself; no
//   observed repository is read). Every other text is synthetic.
// Corpora and predicates (any failure is listed, exit 1):
//   A  long closed fence holding <script>, then <script> after it (200,000 inner lines; LF, CRLF, CR): HEAD's scan findings have the
//      forms of HEAD's (and BASE's) scan of the same text with a 10-line fence, and HEAD's mask equals HEAD's mask of the 10-line text
//      with the fence region replaced. BASE's result is recorded, whatever it is.
//   B  unclosed fence of 200,000 and 400,000 lines (three line ends): BASE and HEAD deep-equal for mask and scan.
//   C  closed fence of empty lines at the read limit (1,048,000 inner LF lines; 1 byte each): HEAD mask equals the blanking oracle.
//   D  CRLF and LF success lists near the read limit (extractSource, one class): HEAD keeps every item, its first 50,000 items equal
//      BASE's whole result on a 50,000-bullet text in the same line end; BASE and HEAD deep-equal at 50,000.
//   E  several fences each 100,000 lines (sum 300,000, three line ends): BASE and HEAD deep-equal (each spread is under the bound).
//   F  20,000 seeded random small texts over fence, span, script and line-end tokens: BASE and HEAD deep-equal for mask and scan.
//   G  every tracked .md in the list: extractSource with all nine classes, under its own path and under heart-and-soul/vision.md,
//      and scanActiveContent: BASE and HEAD deep-equal.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

const [baseDist, headDist, listFile, repoRoot, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: own-differential.mjs <base dist> <head dist> <md list> <repo root> <out.json>');
const load = async (dist) => {
  const reader = await import(pathToFileURL(join(dist, 'git-object-reader.js')).href);
  const mask = await import(pathToFileURL(join(dist, 'markdown-code-context.js')).href);
  const extraction = await import(pathToFileURL(join(dist, 'project-shape-extraction.js')).href);
  return { scan: reader.scanActiveContent, mask: mask.maskMarkdownCodeContexts, extract: extraction.extractSource };
};
const base = await load(baseDist);
const head = await load(headDist);
const attempt = (fn) => {
  try {
    return { returned: fn() };
  } catch (error) {
    return { threw: `${error.name}: ${error.message}` };
  }
};
const ENDS = { LF: '\n', CRLF: '\r\n', CR: '\r' };
const result = { node: process.version, execArgv: process.execArgv, rows: {}, failures: [] };
const check = (ok, what) => {
  if (!ok) result.failures.push(what);
};
const forms = (r) => (Array.isArray(r.returned) ? r.returned.map((f) => f.form) : r);
const blankOracle = (text) => text.replace(/[^\r\n]/g, ' ');

// A
result.rows.A = [];
for (const [name, end] of Object.entries(ENDS)) {
  const make = (n) => `~~~${end}<script>${end}${`x${end}`.repeat(n)}~~~${end}<script>alert(1)</script>${end}`;
  const long = make(200000);
  const short = make(10);
  const headLong = attempt(() => head.scan(long));
  const headShort = attempt(() => head.scan(short));
  const baseShort = attempt(() => base.scan(short));
  const baseLong = attempt(() => base.scan(long));
  const headMaskLong = attempt(() => head.mask(long));
  const fenceEnd = long.lastIndexOf(`~~~${end}`) + 3 + end.length;
  const maskOracle = blankOracle(long.slice(0, fenceEnd)) + long.slice(fenceEnd);
  const ok = isDeepStrictEqual(forms(headLong), forms(headShort)) && isDeepStrictEqual(forms(headShort), forms(baseShort))
    && headMaskLong.returned?.kind === 'masked' && headMaskLong.returned.masked === maskOracle && headMaskLong.returned.fences === 1;
  result.rows.A.push({ end: name, bytes: long.length, base: baseLong.threw ?? forms(baseLong), head: forms(headLong), shortHead: forms(headShort), shortBase: forms(baseShort), headMaskEqualsOracle: headMaskLong.returned?.masked === maskOracle, ok });
  check(ok, `A ${name}`);
}

// B
result.rows.B = [];
for (const [name, end] of Object.entries(ENDS)) {
  for (const n of [200000, 400000]) {
    const text = `\`\`\`${end}<script>${end}${`x${end}`.repeat(n)}`;
    const m = [attempt(() => base.mask(text)), attempt(() => head.mask(text))];
    const s = [attempt(() => base.scan(text)), attempt(() => head.scan(text))];
    const ok = isDeepStrictEqual(m[0], m[1]) && isDeepStrictEqual(s[0], s[1]);
    result.rows.B.push({ end: name, inner: n, base: m[0].threw ?? m[0].returned, head: m[1].threw ?? m[1].returned, scanHead: s[1].returned ?? s[1].threw, ok });
    check(ok, `B ${name} ${n}`);
  }
}

// C
{
  const text = `~~~\n${'\n'.repeat(1048000)}~~~\n`;
  const b = attempt(() => base.mask(text));
  const h = attempt(() => head.mask(text));
  const ok = h.returned?.kind === 'masked' && h.returned.masked === blankOracle(text) && h.returned.fences === 1;
  result.rows.C = { bytes: Buffer.byteLength(text), base: b.threw ?? b.returned.kind, head: h.threw ?? h.returned.kind, ok };
  check(ok, 'C');
}

// D
result.rows.D = [];
const bullets = (n, end) => `# Butlers${end}${end}## What Success Looks Like${end}${end}${`- x${end}`.repeat(n)}${end}## What Butlers Is Not${end}${end}Not a toy.${end}`;
const ex = (impl, text) => attempt(() => impl.extract({ path: 'heart-and-soul/vision.md', extractionClasses: ['success-criterion'] }, text));
for (const [name, end, big] of [['LF', '\n', 262000], ['CRLF', '\r\n', 209000]]) {
  const small = bullets(50000, end);
  const bSmall = ex(base, small);
  const hSmall = ex(head, small);
  const bigText = bullets(big, end);
  const hBig = ex(head, bigText);
  const bBig = ex(base, bigText);
  const smallItems = bSmall.returned?.items;
  const bigItems = hBig.returned?.items;
  const kept = hBig.returned?.kind === 'extracted' && bigItems.length === big && hBig.returned.denominators['success-criterion'] === big;
  const prefix = kept && Array.isArray(smallItems) && smallItems.length === 50000 && isDeepStrictEqual(bigItems.slice(0, 50000), smallItems);
  const ok = isDeepStrictEqual(bSmall, hSmall) && kept && prefix;
  result.rows.D.push({ end: name, bigBullets: big, bigBytes: Buffer.byteLength(bigText), smallKind: bSmall.returned?.kind ?? bSmall.threw, smallItems: smallItems?.length, base: bBig.threw ?? bBig.returned.kind, head: hBig.threw ?? `${hBig.returned.kind}, ${bigItems?.length}`, prefixEqual: prefix, ok });
  check(ok, `D ${name}`);
}

// E
result.rows.E = [];
for (const [name, end] of Object.entries(ENDS)) {
  const fence = `\`\`\`${end}${`x${end}`.repeat(100000)}\`\`\`${end}`;
  const text = `${fence}a \`b\` c${end}${fence}<script>${end}${fence}`;
  const m = [attempt(() => base.mask(text)), attempt(() => head.mask(text))];
  const s = [attempt(() => base.scan(text)), attempt(() => head.scan(text))];
  const ok = m[0].returned !== undefined && isDeepStrictEqual(m[0], m[1]) && isDeepStrictEqual(s[0], s[1]);
  result.rows.E.push({ end: name, bytes: text.length, base: m[0].threw ?? `${m[0].returned.kind} fences ${m[0].returned.fences}`, scan: forms(s[1]), ok });
  check(ok, `E ${name}`);
}

// F
{
  let seed = 0x5eed1185;
  const rand = (n) => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed % n;
  };
  const TOKENS = ['```', '~~~', '````', '`', '``', 'x', ' ', '  ', '<script>', '</script>', '<iframe src=a>', 'on' + 'click=a', '\n', '\r\n', '\r', '\n', '```js', '~~~ `x`', '    ```', '\u2028'];
  let diffs = 0;
  const examples = [];
  for (let i = 0; i < 20000; i += 1) {
    const len = 1 + rand(40);
    let text = '';
    for (let j = 0; j < len; j += 1) text += TOKENS[rand(TOKENS.length)];
    const same = isDeepStrictEqual(attempt(() => base.mask(text)), attempt(() => head.mask(text))) && isDeepStrictEqual(attempt(() => base.scan(text)), attempt(() => head.scan(text)));
    if (!same) {
      diffs += 1;
      if (examples.length < 5) examples.push(JSON.stringify(text));
    }
  }
  result.rows.F = { texts: 20000, differing: diffs, examples };
  check(diffs === 0, 'F');
}

// G
{
  const ALL = ['project-account-section', 'principle', 'success-criterion', 'catalog-entry', 'design-contract', 'baseline-spec', 'topology-component', 'craft-policy', 'roster-identity'];
  const paths = readFileSync(listFile, 'utf8').split('\0').filter((p) => p.endsWith('.md'));
  let compared = 0;
  let differing = 0;
  const kinds = {};
  const examples = [];
  for (const p of paths) {
    let text;
    try {
      text = readFileSync(join(repoRoot, p), 'utf8');
    } catch {
      continue;
    }
    for (const asPath of [p, 'heart-and-soul/vision.md']) {
      const b = attempt(() => base.extract({ path: asPath, extractionClasses: ALL }, text));
      const h = attempt(() => head.extract({ path: asPath, extractionClasses: ALL }, text));
      compared += 1;
      const k = b.threw ?? b.returned.kind;
      kinds[k] = (kinds[k] ?? 0) + 1;
      if (!isDeepStrictEqual(b, h)) {
        differing += 1;
        if (examples.length < 5) examples.push(`${p} as ${asPath}`);
      }
    }
    const sb = attempt(() => base.scan(text));
    const sh = attempt(() => head.scan(text));
    compared += 1;
    if (!isDeepStrictEqual(sb, sh)) {
      differing += 1;
      if (examples.length < 5) examples.push(`${p} scan`);
    }
  }
  result.rows.G = { files: paths.length, comparisons: compared, differing, baseExtractKinds: kinds, examples };
  check(differing === 0, 'G');
}

writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ failures: result.failures, F: result.rows.F, G: result.rows.G }));
process.exit(result.failures.length === 0 ? 0 : 1);

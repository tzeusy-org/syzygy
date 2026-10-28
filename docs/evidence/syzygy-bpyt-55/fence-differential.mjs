// Differential for syzygy-bpyt.55: the extractor, the index-link reader and the root-index reader recognize fences by the
// PWB-REQ-006 profile's recognizer (the link reader alone also its code spans), and the mask is built from the same recognizer.
// Usage: node fence-differential.mjs <base dist> <head dist> <fixtures.json> <out.json>
//   <dist> is packages/three-surface-poc-core/dist of a built checkout: BASE the parent of the change, HEAD the change.
//   <fixtures.json> holds the extraction test's real-shaped fixtures (docs/evidence/syzygy-bpyt-55/fixtures.json).
// Every text is synthetic or a tracked Markdown file of this repository; nothing is read from any observed repository.
//
// Checks (any failure is listed and the tool exits 1):
//   M1  mask unchanged     for every text, at every rendering, scanActiveContent and maskMarkdownCodeContexts are deep-equal at BASE and
//                          HEAD: the masked text byte for byte, the counts, the malformed reason and line, the findings.
//   R1  HEAD recognizer    recognizeCodeContexts at HEAD equals REF, an independent character-level recognizer written here without
//                          regular expressions: the fence ranges, the span ranges, the two counts and the first malformation.
//   R2  REF is the old mask  REF's malformed reason and line, fence count and span count equal the BASE mask's, and the BASE masked
//                          text equals the text with REF's ranges blanked (every terminator kept). It ties REF to the code it replaces.
//   O1  links oracle       on a text the profile reads as well formed, with no bare CR: HEAD indexLinkTargets(T) equals BASE
//                          indexLinkTargets(N), where N is T with each profile span deleted (CR and LF kept) and each fenced run of
//                          reader lines rewritten as a column-0 fence of the same lines, which the OLD reader reads as the profile does.
//   O2  roots oracle       the same for rootIndexPillarRoots, N without span deletion.
//   O3  root-index oracle  the same for extractRootIndex.
//   O4  class oracle       the same for extractClass of every class that reads Markdown (all but roster-identity).
//   O5  TOML class         extractClass('roster-identity') reads TOML lines and no fence: BASE and HEAD agree on the text itself.
//   D1  manifest           deriveProjectShapeManifest at HEAD over a Butlers-shaped fixture tree: a probe link on a line of a root index
//                          or a pillar index is followed iff the profile leaves it visible (REF).
// A text whose N still holds a line the OLD reader would take for a fence opener that the profile does not (a tab-indented opener,
// a tilde fence made by deleting a span) is not oracle-checked for that reader; it is counted by tag, and its base-versus-head
// change is still tallied. A text the profile reads as malformed never reaches a reader (the gate excludes it first); it is checked
// by M1, R1 and R2 only. Bare-CR and mixed renderings are tallied base against head and carry no oracle claim (the readers keep their
// LF-only line model, so a bare-CR text is one reader line).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const [baseDist, headDist, fixturesPath, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: fence-differential.mjs <base dist> <head dist> <fixtures.json> <out.json>');
const QUICK = process.env.FENCE_DIFF_QUICK === '1';

const loadDist = async (dist) => {
  const imp = (file) => import(pathToFileURL(join(dist, file)).href);
  const [reader, ctx, ext, man] = await Promise.all([imp('git-object-reader.js'), imp('markdown-code-context.js'), imp('project-shape-extraction.js'), imp('project-shape-manifest.js')]);
  return { scan: reader.scanActiveContent, mask: ctx.maskMarkdownCodeContexts, recognize: ctx.recognizeCodeContexts, links: man.indexLinkTargets, roots: man.rootIndexPillarRoots, derive: man.deriveProjectShapeManifest, rootIndex: ext.extractRootIndex, cls: ext.extractClass };
};
const base = await loadDist(baseDist);
const head = await loadDist(headDist);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));

const B = '```';
const T = '~~~';
const LF = '\n';
const CRLF = '\r\n';
const CR = '\r';
const PAYLOAD = '<script>x</script>';
const PROBE = '## PROBE [p](probe.md)';

// ------------------------------------------------------------------ REF: the independent recognizer
// Written from the profile's text, one character at a time, with no regular expression and no shared helper. The state machine is the
// profile's (a fence opener is recognized before inline context, a run closes a span only at its own length); the line split, the
// opener and closer tests and the offsets are this file's own.
const isFenceChar = (c) => c === '`' || c === '~';
function refLines(text) {
  const lines = [];
  let p = 0;
  for (;;) {
    let e = p;
    while (e < text.length && text[e] !== '\n' && text[e] !== '\r') e += 1;
    if (e >= text.length) {
      lines.push({ start: p, end: e });
      return lines;
    }
    const next = text[e] === '\r' && text[e + 1] === '\n' ? e + 2 : e + 1;
    lines.push({ start: p, end: e });
    p = next;
  }
}
// zero to three spaces, then a run of three or more of one fence character; the rest of the line may not hold U+2028 or U+2029
// (the profile's `.` does not match them, so such a line is no opener).
function refOpener(line) {
  let i = 0;
  while (i < line.length && line[i] === ' ') i += 1;
  if (i > 3) return undefined;
  const ch = line[i];
  if (ch === undefined || !isFenceChar(ch)) return undefined;
  let j = i;
  while (j < line.length && line[j] === ch) j += 1;
  if (j - i < 3) return undefined;
  for (let k = j; k < line.length; k += 1) if (line[k] === '\u2028' || line[k] === '\u2029') return undefined;
  return { char: ch, length: j - i, backtickInInfo: ch === '`' && line.indexOf('`', j) >= 0 };
}
// zero to three spaces, a run of the opener's character at least its length, then spaces only.
function refCloses(line, char, length) {
  let i = 0;
  while (i < line.length && line[i] === ' ') i += 1;
  if (i > 3) return false;
  const ch = line[i];
  if (ch === undefined || !isFenceChar(ch)) return false;
  let j = i;
  while (j < line.length && line[j] === ch) j += 1;
  if (j - i < 3) return false;
  for (let k = j; k < line.length; k += 1) if (line[k] !== ' ') return false;
  return ch === char && j - i >= length;
}
function ref(text) {
  const fenceRanges = [];
  const spanRanges = [];
  let malformed;
  const note = (reason, line) => {
    if (malformed === undefined) malformed = { reason, line };
  };
  let fence;
  let span;
  const lines = refLines(text);
  for (let n = 0; n < lines.length; n += 1) {
    const { start, end } = lines[n];
    const line = text.slice(start, end);
    if (fence !== undefined) {
      if (refCloses(line, fence.char, fence.length)) {
        fenceRanges.push([fence.start, end]);
        fence = undefined;
      }
      continue;
    }
    const opener = refOpener(line);
    if (opener !== undefined) {
      if (span !== undefined) {
        note('unclosed-inline-span', span.line);
        span = undefined;
      }
      if (opener.backtickInInfo) note('backtick-fence-with-backtick-in-info-string', n + 1);
      fence = { char: opener.char, length: opener.length, line: n + 1, start };
      continue;
    }
    for (let c = 0; c < line.length; ) {
      if (line[c] !== '`') {
        c += 1;
        continue;
      }
      let d = c;
      while (d < line.length && line[d] === '`') d += 1;
      if (span === undefined) span = { length: d - c, line: n + 1, start: start + c };
      else if (d - c === span.length) {
        spanRanges.push([span.start, start + d]);
        span = undefined;
      }
      c = d;
    }
  }
  const fences = fenceRanges.length;
  const spans = spanRanges.length;
  if (fence !== undefined) {
    note('unclosed-fence', fence.line);
    fenceRanges.push([fence.start, text.length]);
  }
  if (span !== undefined) note('unclosed-inline-span', span.line);
  return { fenceRanges, spanRanges, fences, spans, ...(malformed === undefined ? {} : { malformed }) };
}
const inRanges = (ranges, x) => {
  let lo = 0;
  let hi = ranges.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (ranges[mid][1] > x) hi = mid;
    else lo = mid + 1;
  }
  return lo < ranges.length && ranges[lo][0] <= x;
};
const blankByRanges = (text, r) => {
  const chars = text.split('');
  const cut = (a, b) => {
    for (let i = a; i < b; i += 1) if (text[i] !== '\n' && text[i] !== '\r') chars[i] = ' ';
  };
  for (const [a, b] of r.fenceRanges) cut(a, b);
  for (const [a, b] of r.spanRanges) cut(a, b);
  return chars.join('');
};

// ------------------------------------------------------------------ the oracle's neutral form
// N(T): the reader lines (split at LF) that the profile marks fenced are rewritten as one column-0 fence per run, interior lines `x`,
// the CR of a CRLF line kept; with `deleteSpans`, each profile span's characters are first removed (CR and LF kept).
const OLD_LINKS_OPENER = /^\s{0,3}(`{3,}|~{3,})/;
const OLD_EXTRACT_OPENER = /^(`{3,}|~{3,})/;
function neutral(text, r, deleteSpans) {
  const parts = text.split(LF);
  const starts = [];
  let offset = 0;
  for (const part of parts) {
    starts.push(offset);
    offset += part.length + 1;
  }
  const fenced = starts.map((s) => inRanges(r.fenceRanges, s));
  let work = text;
  if (deleteSpans && r.spanRanges.length > 0) {
    const pieces = [];
    let at = 0;
    for (const [a, b] of r.spanRanges) {
      pieces.push(text.slice(at, a), text.slice(a, b).replace(/[^\r\n]/g, ''));
      at = b;
    }
    pieces.push(text.slice(at));
    work = pieces.join('');
  }
  const wparts = work.split(LF);
  if (wparts.length !== parts.length) throw new Error('neutral: the line count moved');
  // Each fenced run becomes a tilde fence of its own length (three plus the run's number) around `x` lines, so the run can be told
  // from any other in a reader's output: a statement that holds fenced lines holds them verbatim, and `swaps` puts them back.
  const outLines = [];
  const swaps = [];
  const noCr = (line) => (line.endsWith(CR) ? line.slice(0, -1) : line);
  for (let i = 0; i < wparts.length; ) {
    if (!fenced[i]) {
      outLines.push(wparts[i]);
      i += 1;
      continue;
    }
    let j = i;
    while (j + 1 < wparts.length && fenced[j + 1]) j += 1;
    if (j === i) throw new Error('neutral: a single-line fence run');
    const fence = '~'.repeat(3 + swaps.length);
    const neutralLines = [fence, ...Array.from({ length: j - i - 1 }, () => 'x'), fence];
    for (let k = i; k <= j; k += 1) outLines.push(neutralLines[k - i] + (wparts[k].endsWith(CR) ? CR : ''));
    swaps.push({ neutral: neutralLines.join(LF), original: wparts.slice(i, j + 1).map(noCr).join(LF) });
    i = j + 1;
  }
  const leakLinks = outLines.some((l, i) => !fenced[i] && OLD_LINKS_OPENER.test(l));
  const leakExtract = outLines.some((l, i) => !fenced[i] && OLD_EXTRACT_OPENER.test(noCr(l)));
  return { text: outLines.join(LF), leakLinks, leakExtract, swaps };
}

// ------------------------------------------------------------------ the readers
const CLASS_PATHS = {
  'project-account-section': 'heart-and-soul/architecture.md',
  principle: 'heart-and-soul/vision.md',
  'success-criterion': 'heart-and-soul/v1.md',
  'catalog-entry': 'legends-and-lore/README.md',
  'design-contract': 'legends-and-lore/README.md',
  'topology-component': 'lay-and-land/components.md',
  'craft-policy': 'craft-and-care/README.md',
  'roster-identity': 'roster/alfred/butler.toml',
};
// `roster-identity` reads TOML lines directly and no fence at all; the oracle (which rewrites fenced lines) does not apply to it. It is
// held to a plain invariant instead: BASE and HEAD return the same value on the text itself (O5).
const CLASSES = Object.keys(CLASS_PATHS).filter((cls) => cls !== 'roster-identity');
const TOML_CLASS = 'roster-identity';
const attempt = (fn) => {
  try {
    return { value: fn() };
  } catch (error) {
    return { value: `throw:${error instanceof Error ? error.message : String(error)}` };
  }
};
const escapeRegExp = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// One pass over every string of a reader's output, putting each neutral run back as the lines it stood for.
function swapBack(value, swaps) {
  if (swaps.length === 0) return value;
  const byNeutral = new Map(swaps.map((w) => [w.neutral, w.original]));
  const pattern = new RegExp([...byNeutral.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|'), 'g');
  const walk = (v) => {
    if (typeof v === 'string') return v.replace(pattern, (m) => byNeutral.get(m));
    if (Array.isArray(v)) return v.map(walk);
    if (v instanceof Map) return new Map([...v].map(([k, x]) => [walk(k), walk(x)]));
    if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value);
}
const ser = (value) => JSON.stringify(value, (_k, v) => (v instanceof Map ? { map: [...v.entries()] } : v));
// The same value with the whitespace around every line end removed from each string, and each string trimmed. A statement the extractor
// builds from a paragraph is trimmed as a whole, so the first line of a fenced run that opens a paragraph loses its indentation and the last
// line its trailing spaces; the lines and their order are what the oracle compares (`matchedModuloIndentation` counts these).
function dropIndent(v) {
  if (typeof v === 'string') return v.replace(/[ \t]*\n[ \t]*/g, '\n').trim();
  if (Array.isArray(v)) return v.map(dropIndent);
  if (v instanceof Map) return new Map([...v].map(([k, x]) => [dropIndent(k), dropIndent(x)]));
  if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dropIndent(x)]));
  return v;
}
const readLinks = (impl, text) => attempt(() => impl.links(text)).value;
const readRoots = (impl, text) => attempt(() => impl.roots(text)).value;
const readRootIndex = (impl, text) => attempt(() => impl.rootIndex(text)).value;
const readClass = (impl, cls, text) => attempt(() => impl.cls(cls, CLASS_PATHS[cls], text)).value;

// ------------------------------------------------------------------ measurement
const failureCounts = new Map();
const failures = [];
const fail = (check, corpus, detail) => {
  failureCounts.set(check, (failureCounts.get(check) ?? 0) + 1);
  if ((failureCounts.get(check) ?? 0) <= 8) failures.push({ check, corpus, detail });
};
const stats = new Map();
const statOf = (corpus) => {
  if (!stats.has(corpus)) {
    stats.set(corpus, {
      texts: 0,
      wellFormed: 0,
      malformed: 0,
      maskChanged: 0,
      recognizerMismatch: 0,
      refVsBaseMaskMismatch: 0,
      oracleChecked: { links: 0, roots: 0, rootIndex: 0, classes: 0 },
      oracleExcluded: { links: 0, roots: 0, rootIndex: 0, classes: 0 },
      oracleFailures: 0,
      matchedModuloIndentation: 0,
      changed: { texts: 0, links: 0, roots: 0, rootIndex: 0, classes: 0 },
      bareCrOrMixed: { wellFormed: 0, changedTexts: 0 },
    });
  }
  return stats.get(corpus);
};
const examples = new Map();
const keepExample = (corpus, key, text, b, h) => {
  const id = `${corpus}/${key}`;
  const list = examples.get(id) ?? [];
  list.push({ text, base: b.slice(0, 400), head: h.slice(0, 400) });
  list.sort((x, y) => x.text.length - y.text.length);
  examples.set(id, list.slice(0, 3));
};

function analyze(corpus, text) {
  const s = statOf(corpus);
  s.texts += 1;
  // M1
  const bm = base.mask(text);
  const hm = head.mask(text);
  if (!isDeepStrictEqual(bm, hm) || !isDeepStrictEqual(base.scan(text), head.scan(text))) {
    s.maskChanged += 1;
    fail('M1', corpus, { text, base: bm, head: hm });
  }
  // R1
  const r = ref(text);
  const hr = head.recognize(text);
  if (!isDeepStrictEqual(JSON.parse(JSON.stringify(hr)), JSON.parse(JSON.stringify(r)))) {
    s.recognizerMismatch += 1;
    fail('R1', corpus, { text, head: hr, ref: r });
  }
  // R2
  const r2ok =
    bm.kind === 'malformed'
      ? r.malformed !== undefined && r.malformed.reason === bm.reason && r.malformed.line === bm.line
      : r.malformed === undefined && r.fences === bm.fences && r.spans === bm.spans && bm.masked === blankByRanges(text, r);
  if (!r2ok) {
    s.refVsBaseMaskMismatch += 1;
    fail('R2', corpus, { text, baseMask: bm, ref: r });
  }
  if (r.malformed !== undefined) {
    s.malformed += 1;
    return;
  }
  s.wellFormed += 1;

  // base against head on the text itself
  const bareCr = /\r(?!\n)/.test(text);
  const sig = {
    links: [readLinks(base, text), readLinks(head, text)],
    roots: [readRoots(base, text), readRoots(head, text)],
    rootIndex: [readRootIndex(base, text), readRootIndex(head, text)],
    classes: [...CLASSES, TOML_CLASS].map((cls) => [readClass(base, cls, text), readClass(head, cls, text)]),
  };
  const differs = ([x, y]) => ser(x) !== ser(y);
  const diff = {
    links: differs(sig.links),
    roots: differs(sig.roots),
    rootIndex: differs(sig.rootIndex),
    classes: sig.classes.some(differs),
  };
  const any = diff.links || diff.roots || diff.rootIndex || diff.classes;
  if (bareCr) {
    s.bareCrOrMixed.wellFormed += 1;
    if (any) {
      s.bareCrOrMixed.changedTexts += 1;
      for (const k of ['links', 'roots', 'rootIndex', 'classes']) {
        if (!diff[k]) continue;
        const pair = k === 'classes' ? sig.classes.find(differs) : sig[k];
        keepExample(corpus, `bare-cr-${k}`, text, ser(pair[0]), ser(pair[1]));
      }
    }
    return;
  }
  if (any) {
    s.changed.texts += 1;
    for (const k of ['links', 'roots', 'rootIndex', 'classes']) {
      if (diff[k]) {
        s.changed[k] += 1;
        const pair = k === 'classes' ? sig.classes.find(differs) : sig[k];
        keepExample(corpus, k, text, ser(pair[0]), ser(pair[1]));
      }
    }
  }

  // the oracle
  const withSpans = neutral(text, r, true);
  const noSpans = neutral(text, r, false);
  const agrees = (name, key, expected, got, detail) => {
    if (ser(expected) === ser(got)) return true;
    if (ser(dropIndent(expected)) === ser(dropIndent(got))) {
      s.matchedModuloIndentation += 1;
      return true;
    }
    s.oracleFailures += 1;
    fail(name, corpus, { text, ...detail, baseOnNeutral: ser(expected).slice(0, 300), head: ser(got).slice(0, 300) });
    return false;
  };
  if (withSpans.leakLinks) s.oracleExcluded.links += 1;
  else {
    s.oracleChecked.links += 1;
    agrees('O1', 'links', readLinks(base, withSpans.text), sig.links[1], { neutral: withSpans.text });
  }
  if (noSpans.leakLinks) s.oracleExcluded.roots += 1;
  else {
    s.oracleChecked.roots += 1;
    agrees('O2', 'roots', readRoots(base, noSpans.text), sig.roots[1], { neutral: noSpans.text });
  }
  if (noSpans.leakExtract) {
    s.oracleExcluded.rootIndex += 1;
    s.oracleExcluded.classes += 1;
  } else {
    s.oracleChecked.rootIndex += 1;
    agrees('O3', 'rootIndex', swapBack(readRootIndex(base, noSpans.text), noSpans.swaps), sig.rootIndex[1], { neutral: noSpans.text });
    s.oracleChecked.classes += 1;
    if (ser(sig.classes[CLASSES.length][0]) !== ser(sig.classes[CLASSES.length][1])) {
      s.oracleFailures += 1;
      fail('O5', corpus, { text, base: ser(sig.classes[CLASSES.length][0]).slice(0, 300), head: ser(sig.classes[CLASSES.length][1]).slice(0, 300) });
    }
    for (let c = 0; c < CLASSES.length; c += 1) {
      if (!agrees('O4', 'classes', swapBack(readClass(base, CLASSES[c], noSpans.text), noSpans.swaps), sig.classes[c][1], { cls: CLASSES[c], neutral: noSpans.text })) break;
    }
  }
}

// ------------------------------------------------------------------ renderings
const RENDERINGS = {
  lf: () => LF,
  crlf: () => CRLF,
  cr: () => CR,
  cycle: (i) => [LF, CRLF, CR][i % 3],
};
const render = (lines, rendering, final) => lines.map((line, i) => line + (i === lines.length - 1 && !final ? '' : RENDERINGS[rendering](i, lines.length))).join('');

// ------------------------------------------------------------------ the construct corpus (Part A)
const fenceSource = readFileSync(join(repoRoot, 'docs/evidence/syzygy-bpyt-6-3/fence-probe.mjs'), 'utf8');
const FENCE_CASES = (() => {
  const start = fenceSource.indexOf('const CASES = [');
  const end = fenceSource.indexOf('\n];', start);
  if (start < 0 || end < 0 || fenceSource.indexOf('const CASES = [', start + 1) >= 0) throw new Error('fence-probe CASES: not exactly one literal');
  return new Function('B', 'T', `return ${fenceSource.slice(start + 'const CASES = '.length, end + 2)};`)(B, T).map(([id, what, lines]) => ({ id, what, lines }));
})();
const SPAN_CASES = [
  { id: 'span-one-line', what: 'a span on one line', lines: ['see `a` end'] },
  { id: 'span-three-lines', what: 'a single-backtick span opened and closed on lines of their own', lines: ['`', 'x', '`'] },
  { id: 'span-double-three-lines', what: 'a double-backtick span over three lines', lines: ['``', 'x', '``'] },
  { id: 'span-opened-mid-line', what: 'a span opened mid-line and closed mid-line, two lines later', lines: ['see `a', 'x', 'b` end'] },
  { id: 'span-two-lines', what: 'a span over two lines', lines: ['a `b', 'c` d'] },
  { id: 'span-then-fence', what: 'a one-line span, then a fence', lines: ['`a`', B, 'x', B] },
  { id: 'fence-then-span', what: 'a fence, then a one-line span', lines: [B, 'x', B, '`a`'] },
  { id: 'stray-pair', what: 'two stray single backticks on different lines (the residual shape)', lines: ['a `b', 'x', 'c` d'] },
  { id: 'double-span-around-single', what: 'a double span holding a single backtick', lines: ['``a`b``'] },
  { id: 'span-longer-run-inside', what: 'a single span holding a longer run', lines: ['`a``b`'] },
  { id: 'tab-indented-opener', what: 'a tab-indented backtick opener (the old link reader opened a fence)', lines: ['\t' + B, 'x', B] },
  { id: 'nbsp-indented-opener', what: 'a no-break-space-indented opener (the old link reader opened a fence)', lines: ['\u00a0' + B, 'x', B] },
  { id: 'indent1-opener', what: 'a one-space-indented opener (the old extractor did not open a fence)', lines: [' ' + B, 'x', B] },
  { id: 'indent3-opener', what: 'a three-space-indented opener', lines: ['   ' + B, 'x', B] },
  { id: 'closer-indent2', what: 'a closer indented two spaces (the old extractor did not close)', lines: [B, 'x', '  ' + B] },
  { id: 'closer-info', what: 'a closer-shaped line with an info string, then the real closer', lines: [B, 'x', B + 'js', 'y', B] },
  { id: 'closer-trailing-tab', what: 'a closer-shaped line ending in a tab, then the real closer', lines: [B, 'x', B + '\t', 'y', B] },
  { id: 'closer-trailing-spaces', what: 'a closer with trailing spaces', lines: [B, 'x', B + '   '] },
  { id: 'longer-closer', what: 'a closer longer than the opener', lines: [B, 'x', B + '`'] },
  { id: 'shorter-closer', what: 'a closer shorter than the opener, then the real one', lines: [B + '`', 'x', B, 'y', B + '`'] },
  { id: 'tilde-closes-backtick', what: 'a tilde line inside a backtick fence, then the real closer', lines: [B, 'x', T, 'y', B] },
  { id: 'line-separator-opener', what: 'an opener whose info string holds U+2028 (the profile reads it as no opener)', lines: [B + '\u2028x', 'y', B] },
];
const ALL_CASES = [...FENCE_CASES, ...SPAN_CASES];
function placements(lines, probe) {
  const n = lines.length;
  const result = [{ slot: 'control', lines }];
  for (let s = 0; s <= n; s += 1) result.push({ slot: `line-before-${s + 1}`, lines: [...lines.slice(0, s), probe, ...lines.slice(s)] });
  for (let i = 0; i < n; i += 1) result.push({ slot: `appended-to-${i + 1}`, lines: lines.map((line, j) => (j === i ? line + probe : line)) });
  return result;
}

// Part A: per construct, the probe's visibility and the gate, base and head.
const probeVisible = {
  links: (impl, text) => impl.links(text).includes('probe.md'),
  extraction: (impl, text) => {
    const result = impl.cls('project-account-section', 'architecture.md', text);
    return result.kind === 'items' && result.items.some((item) => (item.statement ?? '').includes('PROBE'));
  },
};
const partA = new Map();
for (const c of ALL_CASES) {
  const row = { id: c.id, what: c.what, rows: 0, malformedRows: 0, gateChanged: 0, links: { unchanged: 0, newlyHidden: 0, newlyShown: 0 }, extraction: { unchanged: 0, newlyHidden: 0, newlyShown: 0 }, renderings: {} };
  for (const rendering of ['lf', 'crlf', 'cr']) {
    const cell = { rows: 0, links: { newlyHidden: 0, newlyShown: 0 }, extraction: { newlyHidden: 0, newlyShown: 0 } };
    for (const p of placements(c.lines, PROBE)) {
      for (const final of [true, false]) {
        const text = render(p.lines, rendering, final);
        analyze(`constructs-probe/${rendering}`, text);
        row.rows += 1;
        cell.rows += 1;
        if (ref(text).malformed !== undefined) {
          row.malformedRows += 1;
          continue;
        }
        for (const k of ['links', 'extraction']) {
          const b = probeVisible[k](base, text);
          const h = probeVisible[k](head, text);
          if (b === h) row[k].unchanged += 1;
          else {
            row[k][h ? 'newlyShown' : 'newlyHidden'] += 1;
            cell[k][h ? 'newlyShown' : 'newlyHidden'] += 1;
          }
        }
      }
    }
    for (const p of placements(c.lines, PAYLOAD)) {
      const text = render(p.lines, rendering, true);
      analyze(`constructs-payload/${rendering}`, text);
      if ((base.scan(text).length > 0) !== (head.scan(text).length > 0)) row.gateChanged += 1;
    }
    row.renderings[rendering] = cell;
  }
  partA.set(c.id, row);
}

// ------------------------------------------------------------------ fixtures, mutated (Part B1)
const ROOT_TABLE = ['# Butlers', '', '| Pillar | Directory |', '| --- | --- |', '| Heart and Soul | `about/heart-and-soul/` |', '| Legends and Lore | `about/legends-and-lore/` |', '| Spec and Spine | `openspec/` |', '| Lay and Land | `about/lay-and-land/` |', '| Craft and Care | `about/craft-and-care/` |', '', 'See [the vision](about/heart-and-soul/vision.md).', ''].join(LF);
const SEED_FIXTURES = [...fixtures.fixtures.map((f) => ({ id: f.path, text: f.text })), { id: 'root-index (extraction test)', text: fixtures.rootIndex }, { id: 'root pillar table', text: ROOT_TABLE }];
const WRAPS = [
  ['plain', B, B], ['tilde', T, T], ['indent1-closer', B, ' ' + B], ['indent3-closer', B, '   ' + B], ['tab-closer-then-plain', B, B + '\t' + LF + 'y' + LF + B],
  ['info-closer-then-plain', B, B + 'js' + LF + 'y' + LF + B], ['indent4-opener', '    ' + B, '    ' + B], ['longer', B + '`', B + '`'], ['tab-opener', '\t' + B, B],
  ['indent2-opener-tilde', '  ' + T, T + '~'],
];
function fixtureMutants(text) {
  const lines = text.split(LF);
  const out = [];
  const n = lines.length;
  const stride = n > 24 ? Math.ceil(n / 24) : 1;
  for (let i = 0; i <= n; i += stride) {
    for (const [, open, close] of WRAPS) {
      out.push([...lines.slice(0, i), open, 'filler', close, ...lines.slice(i)].join(LF));
      if (i < n) out.push([...lines.slice(0, i), open, ...lines.slice(i, i + 1), close, ...lines.slice(i + 1)].join(LF));
    }
    if (i < n) {
      const l = lines[i];
      out.push(lines.map((x, j) => (j === i ? '`' + x + '`' : x)).join(LF));
      out.push(lines.map((x, j) => (j === i ? '``' + x + '``' : x)).join(LF));
      out.push([...lines.slice(0, i), '`', ...lines.slice(i, i + 2), '`', ...lines.slice(i + 2)].join(LF));
      out.push([...lines.slice(0, i), '``', ...lines.slice(i, i + 2), '``', ...lines.slice(i + 2)].join(LF));
      out.push(lines.map((x, j) => (j === i ? '`' + l : j === Math.min(n - 1, i + 2) ? x + '`' : x)).join(LF));
      out.push(lines.map((x, j) => (j === i ? l + ' `a` `b` ' : x)).join(LF));
    }
  }
  return out;
}
for (const seed of SEED_FIXTURES) {
  analyze('fixtures/seed', seed.text);
  analyze('fixtures/seed-crlf', seed.text.split(LF).join(CRLF));
  for (const mutant of fixtureMutants(seed.text)) {
    analyze('fixtures/mutated-lf', mutant);
    analyze('fixtures/mutated-crlf', mutant.split(LF).join(CRLF));
  }
}

// ------------------------------------------------------------------ fuzz (Part B2)
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ALPHA = [B, T, B + '`', T + '~', '  ' + B, ' ' + T, '   ' + B, '    ' + B, '\t' + B, B + 'js', B + ' js', B + '\t', B + ' ', B + 'a`b', T + ' x`y', '`', '``', B + '` ', 'a `b` c', 'a ``b`` c', 'x `y', 'z` w', '[a](a.md)', '- [b](b.md)', '`[c](c.md)`', '[d](d`e.md)', '[e](e`x`.md)', '## H', '# T', '', 'text', '1. **A.** one', '| a | b |', '\u2028' + B, B + '\u2029x', PAYLOAD, '`' + PAYLOAD + '`', '\u00a0' + B, '[Heart and Soul](heart-and-soul/)', '## Key Architectural Facts'];
const FUZZ_TEXTS = QUICK ? 3000 : 40000;
{
  const rnd = mulberry32(55);
  for (let t = 0; t < FUZZ_TEXTS; t += 1) {
    const n = 1 + Math.floor(rnd() * 10);
    const lines = Array.from({ length: n }, () => ALPHA[Math.floor(rnd() * ALPHA.length)]);
    const final = rnd() < 0.5;
    for (const rendering of ['lf', 'crlf', 'cr', 'cycle']) analyze(`fuzz/${rendering}`, render(lines, rendering, final));
  }
}

// ------------------------------------------------------------------ tracked Markdown files (Part C)
const tracked = execFileSync('git', ['ls-files', '-z', '--', '*.md'], { cwd: repoRoot, maxBuffer: 1 << 28 }).toString('utf8').split('\0').filter((p) => p !== '');
const repoBytes = { files: 0, unreadable: 0 };
for (const file of QUICK ? tracked.slice(0, 150) : tracked) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(join(repoRoot, file)));
  } catch {
    repoBytes.unreadable += 1;
    continue;
  }
  repoBytes.files += 1;
  analyze('repo-markdown/as-is', text);
  if (!text.includes(CR)) analyze('repo-markdown/crlf', text.split(LF).join(CRLF));
}

// ------------------------------------------------------------------ Part D: the manifest, through the readers
const oid = (n) => n.toString(16).padStart(40, '0');
const blob = (path, n) => ({ mode: '100644', type: 'blob', objectId: oid(n), sizeBytes: 100 + n, path });
const TREE = [
  blob('about/README.md', 3), blob('about/heart-and-soul/README.md', 5), blob('about/heart-and-soul/vision.md', 6), blob('about/heart-and-soul/architecture.md', 7), blob('about/heart-and-soul/v1.md', 4),
  blob('about/heart-and-soul/notes.md', 8), blob('about/legends-and-lore/README.md', 10), blob('about/spec-and-spine/README.md', 12), blob('about/lay-and-land/README.md', 13),
  blob('about/lay-and-land/components.md', 14), blob('about/craft-and-care/README.md', 16), blob('about/craft-and-care/policies/testing.md', 17),
];
const ROOT_PATH = 'about/README.md';
const HS_PATH = 'about/heart-and-soul/README.md';
const ROOT_HEAD = ['# Butlers', ''];
const ROOT_TAIL = ['Read [Legends and Lore](legends-and-lore/README.md), [Spec and Spine](./spec-and-spine), [Lay and Land](lay-and-land/README.md#top) and', '[Craft and Care](craft-and-care "the craft").', ''];
const HS_TAIL = ['- [Vision](vision.md)', '- [Architecture](./architecture.md#arch)', '- [V1](v1.md?x=1)', ''];
const OTHER_INDEXES = { 'about/legends-and-lore/README.md': 'See [rfcs](rfcs).\n', 'about/spec-and-spine/README.md': 'x\n', 'about/lay-and-land/README.md': '[Components](components.md)\n', 'about/craft-and-care/README.md': '[Testing](policies/testing.md)\n' };
function runDerive(impl, rootText, hsText) {
  const texts = { ...OTHER_INDEXES, [ROOT_PATH]: rootText, [HS_PATH]: hsText };
  const readSeed = (seed) => {
    const text = texts[seed.path];
    if (text === undefined) return { kind: 'unavailable', reason: 'fixture has no index text' };
    if (impl.scan(text).length > 0) return { kind: 'unavailable', reason: 'phase A source excluded: active-content' };
    return { kind: 'text', text };
  };
  const result = impl.derive({ repositoryId: 'repository:probe', revision: 'f'.repeat(40), tree: TREE, readSeed });
  if (result.kind !== 'manifest') return { kind: result.kind };
  return { sources: result.manifest.sources.map((s) => s.path).sort() };
}
const PROBE_ROOT = 'Read [Heart and Soul](heart-and-soul/) first.';
const PROBE_HS = '- [Notes](notes.md)';
const HS_FOLLOWED = 'about/heart-and-soul/notes.md';
const ROOT_FOLLOWED = 'about/heart-and-soul/README.md';
const manifestRows = [];
let dChecked = 0;
let dChanged = 0;
for (const c of ALL_CASES) {
  for (const which of ['root', 'pillar']) {
    const probe = which === 'root' ? PROBE_ROOT : PROBE_HS;
    for (const rendering of ['lf', 'crlf']) {
      for (const p of placements(c.lines, probe)) {
        if (p.slot === 'control') continue;
        const lines = which === 'root' ? [...ROOT_HEAD, ...p.lines, ...ROOT_TAIL] : [...p.lines, ...HS_TAIL];
        const text = render(lines, rendering, true);
        const rootText = which === 'root' ? text : [...ROOT_HEAD, PROBE_ROOT, ...ROOT_TAIL].join(LF);
        const hsText = which === 'root' ? HS_TAIL.join(LF) : text;
        const b = runDerive(base, rootText, hsText);
        const h = runDerive(head, rootText, hsText);
        dChecked += 1;
        // D1: the probe's target is read iff the profile leaves the probe link visible (a malformed text is excluded by the screen).
        const r = ref(text);
        const at = text.indexOf(probe);
        const unreadable = r.malformed !== undefined;
        const visible = !unreadable && at >= 0 && !inRanges(r.fenceRanges, text.lastIndexOf(LF, at - 1) + 1) && !inRanges(r.spanRanges, at) && !inRanges(r.spanRanges, at + probe.length - 1);
        const followed = (h.sources ?? []).includes(which === 'root' ? ROOT_FOLLOWED : HS_FOLLOWED);
        if (!unreadable && followed !== visible) fail('D1', `manifest/${which}/${rendering}`, { case: c.id, slot: p.slot, followed, visible });
        if (!isDeepStrictEqual(b, h)) {
          dChanged += 1;
          manifestRows.push({ case: c.id, index: which, rendering, slot: p.slot, baseReads: b.sources ?? null, headReads: h.sources ?? null });
        }
      }
    }
  }
}

// ------------------------------------------------------------------ report
const byCheck = (check) => failureCounts.get(check) ?? 0;
const total = (key) => [...stats.values()].reduce((a, s) => a + s[key], 0);
const sumNested = (key, sub) => [...stats.values()].reduce((a, s) => a + s[key][sub], 0);
const constructRows = [...partA.values()];
const moduleDigests = (dist) => Object.fromEntries(['markdown-code-context.js', 'project-shape-extraction.js', 'project-shape-manifest.js'].map((f) => [f, sha(readFileSync(join(dist, f)))]));
const result = {
  tool: 'docs/evidence/syzygy-bpyt-55/fence-differential.mjs',
  quick: QUICK,
  baseDistModules: moduleDigests(baseDist),
  headDistModules: moduleDigests(headDist),
  inputs: { fixtures: { path: 'docs/evidence/syzygy-bpyt-55/fixtures.json', sha256: sha(readFileSync(fixturesPath)) }, fenceProbe: { path: 'docs/evidence/syzygy-bpyt-6-3/fence-probe.mjs', sha256: sha(fenceSource) } },
  population: {
    texts: total('texts'),
    wellFormed: total('wellFormed'),
    malformed: total('malformed'),
    constructCases: { fenceProbe: FENCE_CASES.length, added: SPAN_CASES.length },
    fixtureSeeds: SEED_FIXTURES.length,
    fuzzBaseTexts: FUZZ_TEXTS,
    renderings: Object.keys(RENDERINGS),
    trackedMarkdown: { listed: tracked.length, ...repoBytes },
    manifestRows: dChecked,
  },
  checks: {
    M1_maskAndGateUnchanged: { texts: total('texts'), failures: byCheck('M1') },
    R1_headRecognizerEqualsReference: { texts: total('texts'), failures: byCheck('R1') },
    R2_referenceEqualsOldMask: { texts: total('texts'), failures: byCheck('R2') },
    O1_linksOracle: { checked: sumNested('oracleChecked', 'links'), excludedOldReaderOpensAFence: sumNested('oracleExcluded', 'links'), failures: byCheck('O1') },
    O2_rootsOracle: { checked: sumNested('oracleChecked', 'roots'), excludedOldReaderOpensAFence: sumNested('oracleExcluded', 'roots'), failures: byCheck('O2') },
    O3_rootIndexOracle: { checked: sumNested('oracleChecked', 'rootIndex'), excludedOldReaderOpensAFence: sumNested('oracleExcluded', 'rootIndex'), failures: byCheck('O3') },
    O5_tomlClassUnchanged: { checked: sumNested('oracleChecked', 'classes'), failures: byCheck('O5') },
    O4_classOracle: { checked: sumNested('oracleChecked', 'classes'), excludedOldReaderOpensAFence: sumNested('oracleExcluded', 'classes'), failures: byCheck('O4') },
    D1_manifestFollowsProfileVisibility: { rows: dChecked, failures: byCheck('D1') },
  },
  gate: {
    note: 'the mask and scanActiveContent are deep-equal at BASE and HEAD on every text: no text is newly refused and none newly accepted by the gate itself',
    textsWhoseMaskOrFindingsChanged: total('maskChanged'),
    constructPayloadRowsWhoseDecisionChanged: constructRows.reduce((a, r) => a + r.gateChanged, 0),
  },
  readerChanges: Object.fromEntries([...stats.entries()].map(([k, s]) => [k, { texts: s.texts, wellFormed: s.wellFormed, malformedExcludedByGate: s.malformed, changedLfCrlf: s.changed, bareCrOrMixed: s.bareCrOrMixed, oracleExcluded: s.oracleExcluded, matchedModuloIndentation: s.matchedModuloIndentation }])),
  constructs: constructRows,
  manifest: { rowsChecked: dChecked, rowsChanged: dChanged, changed: manifestRows },
  examples: Object.fromEntries([...examples.entries()].sort(([a], [b]) => (a < b ? -1 : 1))),
  failingChecks: [...failureCounts.keys()].sort(),
  failureCount: [...failureCounts.values()].reduce((a, b) => a + b, 0),
  failures,
};
// ASCII only: a non-ASCII character of a probe text is written as a JSON escape, so no file of this record holds a no-break space.
writeFileSync(out, `${JSON.stringify(result, null, 1).replace(/[\u007f-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)}\n`);
console.log(JSON.stringify({ population: result.population, checks: result.checks, gate: result.gate }, null, 1));
if (failures.length > 0) {
  console.error(`${result.failureCount} failure(s); first: ${JSON.stringify(failures[0]).slice(0, 800)}`);
  process.exit(1);
}

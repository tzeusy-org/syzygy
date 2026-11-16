// Is a change to production TypeScript comment-only, checked on the source and not on the emit? For syzygy-bpyt.6.3 stack 3 (the
// fence-rule finding), beside comment-only.mjs.
// Usage: node line-level-check.mjs <git repo> <base commit> <head commit> <out.json>
//        node line-level-check.mjs --selftest
// Run from a checkout that has `typescript` installed (npm ci).
//
// Why a second check. comment-only.mjs compares the JavaScript that ts.transpileModule emits with comments removed, so it is
// emit-equal (runtime-equal) evidence: an edit that only changes a type (`readonly string[]` to `string[]`) emits the same JavaScript and
// passes it. This tool reads the TypeScript. For every non-test .ts file under packages/*/src and apps/*/src that differs between the two
// commits it requires both of these, and fails the file otherwise:
//   print   the TypeScript printer's output for the parsed file, with comments removed (types, modifiers and every statement kept), is
//           byte-equal before and after;
//   lines   every changed line, once the characters the parser reads as comment are removed from it (not text inside a string or a
//           template) and its trailing space trimmed, equals its counterpart; or, in a hunk whose line counts differ, every removed and
//           every added line is empty or wholly comment. Each changed line is reported as a trailing comment added, a comment edited, or
//           code.
// Files added or removed by the change are listed and fail. Exit status 1 when any file fails.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const ts = createRequire(import.meta.url)('typescript');
const sha = (v) => createHash('sha256').update(v).digest('hex');

const printed = (source, path) => ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed }).printFile(ts.createSourceFile(path, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS));

// Every comment range of a parsed file, as a Map from its start offset to its end offset.
function commentRanges(source, path) {
  const sf = ts.createSourceFile(path, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const ranges = new Map();
  const add = (list) => { for (const r of list ?? []) ranges.set(r.pos, r.end); };
  const visit = (node) => {
    add(ts.getLeadingCommentRanges(source, node.getFullStart()));
    add(ts.getTrailingCommentRanges(source, node.getEnd()));
    for (const child of node.getChildren(sf)) visit(child);
  };
  visit(sf);
  return ranges;
}

// Offset of the start of each line, for mapping a character of a line to the ranges.
function lineStarts(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) if (source[i] === '\n') starts.push(i + 1);
  return starts;
}

// The runs of lines that differ between two versions, by a longest-common-subsequence diff of the lines: [{i1, i2, j1, j2}], the old
// lines i1..i2 and the new lines j1..j2 (half-open, 0-based). The common prefix and suffix are trimmed first.
function hunks(a, b) {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1;
  const x = a.slice(head, a.length - tail), y = b.slice(head, b.length - tail);
  const cols = y.length + 1;
  const table = new Int32Array((x.length + 1) * cols);
  for (let i = x.length - 1; i >= 0; i -= 1) for (let j = y.length - 1; j >= 0; j -= 1) {
    table[i * cols + j] = x[i] === y[j] ? table[(i + 1) * cols + j + 1] + 1 : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
  }
  const out = [];
  let i = 0, j = 0, open = null;
  const close = () => { if (open !== null) { out.push({ i1: head + open.i, i2: head + i, j1: head + open.j, j2: head + j }); open = null; } };
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) { close(); i += 1; j += 1; continue; }
    if (open === null) open = { i, j };
    if (j < y.length && (i === x.length || table[i * cols + j + 1] >= table[(i + 1) * cols + j])) j += 1; else i += 1;
  }
  close();
  return out;
}

// The line with every character a comment range covers removed, trailing space trimmed. `from` is the line's offset in the file.
function withoutComments(line, ranges, from) {
  let out = '';
  for (let k = 0; k < line.length; k += 1) if (![...ranges].some(([pos, end]) => pos <= from + k && from + k < end)) out += line[k];
  return out.trimEnd();
}

// Classify each changed line: a trailing comment added, a comment edited, or code.
function lineRows(before, after, path) {
  const a = before.split('\n'), b = after.split('\n');
  const ra = commentRanges(before, path), rb = commentRanges(after, path);
  const sa = lineStarts(before), sb = lineStarts(after);
  const rows = [];
  let ok = true;
  for (const { i1, i2, j1, j2 } of hunks(a, b)) {
    const oldStripped = (k) => withoutComments(a[k], ra, sa[k]);
    const newStripped = (k) => withoutComments(b[k], rb, sb[k]);
    if (i2 - i1 !== j2 - j1) {
      const onlyComment = [...Array(i2 - i1).keys()].every((k) => oldStripped(i1 + k).trim() === '') && [...Array(j2 - j1).keys()].every((k) => newStripped(j1 + k).trim() === '');
      rows.push({ kind: onlyComment ? 'comment-lines-added-or-removed' : 'CODE', oldLines: [i1 + 1, i2], newLines: [j1 + 1, j2] });
      ok = ok && onlyComment;
      continue;
    }
    for (let k = 0; k < i2 - i1; k += 1) {
      const same = oldStripped(i1 + k) === newStripped(j1 + k);
      const hadComment = oldStripped(i1 + k) !== a[i1 + k].trimEnd();
      const kind = !same ? 'CODE' : hadComment ? 'comment-edited' : 'trailing-line-comment';
      rows.push({ line: i1 + k + 1, kind });
      ok = ok && same;
    }
  }
  return { rows, ok };
}

export function check(before, after, path = 'x.ts') {
  const printEqual = printed(before, path) === printed(after, path);
  const lines = lineRows(before, after, path);
  return { printEqual, lines: lines.rows, linesOk: lines.ok, commentOnly: printEqual && lines.ok };
}

function selftest() {
  const base = ['/** A doc.', ' * Second line. */', 'export function f(xs: readonly string[]): number {', "  const s = 'a // b';", '  return xs.length + s.length; // count', '}', ''].join('\n');
  const edit = (from, to) => { if (base.split(from).length !== 2) throw new Error(`fixture: ${from} not once`); return base.replace(from, to); };
  const cases = [
    ['identical', base, true],
    ['trailing comment added', edit("  const s = 'a // b';", "  const s = 'a // b'; // the text"), true],
    ['jsdoc line edited', edit(' * Second line. */', ' * Second line, reworded. */'), true],
    ['trailing comment edited', edit('// count', '// the count'), true],
    ['code edited', edit('xs.length + s.length', 'xs.length - s.length'), false],
    ['type-only edit (emit-equal)', edit('readonly string[]', 'string[]'), false],
    ['text appended inside a string', edit("'a // b'", "'a // b // c'"), false],
    ['comment line added', edit('}\n', '}\n// a new line\n'), true],
    ['code line added', edit('}\n', '}\nconst late = 1;\n'), false],
    ['code line removed', edit('  const s = \'a // b\';\n', ''), false],
    ['whitespace-only change (print-equal, not comment-only)', edit('  return xs.length', '    return xs.length'), false],
    ['code moved into a comment', edit('  return xs.length + s.length; // count', '  // return xs.length + s.length; count'), false],
  ];
  const rows = cases.map(([name, after, expectPass]) => { const r = check(base, after); return { name, expectPass, got: r.commentOnly, ok: r.commentOnly === expectPass, printEqual: r.printEqual, linesOk: r.linesOk }; });
  // The lines predicate is the stricter of the two (a whitespace-only change is print-equal and fails it); the print predicate reads the
  // TypeScript and is the second method for the type-level edits an emit comparison cannot see.
  const bad = rows.filter((r) => !r.ok);
  console.log(JSON.stringify({ selftest: rows, pass: bad.length === 0 }, null, 1));
  process.exit(bad.length === 0 ? 0 : 1);
}

function main() {
  if (process.argv[2] === '--selftest') return selftest();
  const [repo, base, head, out] = process.argv.slice(2);
  if (out === undefined) throw new Error('usage: line-level-check.mjs <git repo> <base> <head> <out.json> | --selftest');
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 1 << 28 });
  const changed = git('diff', '--name-status', '-z', base, head).toString('utf8').split('\0').filter(Boolean);
  const entries = [];
  for (let i = 0; i < changed.length; i += 2) entries.push({ status: changed[i], path: changed[i + 1] });
  const production = entries.filter((e) => /^(packages|apps)\/[^/]+\/src\/.*\.ts$/.test(e.path) && !e.path.endsWith('.test.ts'));
  const rows = production.map(({ status, path }) => {
    if (status !== 'M') return { path, status, commentOnly: false };
    const before = git('show', `${base}:${path}`).toString('utf8');
    const after = git('show', `${head}:${path}`).toString('utf8');
    const r = check(before, after, path);
    return { path, status, sourceSha256Base: sha(before), sourceSha256Head: sha(after), printSha256Base: sha(printed(before, path)), printSha256Head: sha(printed(after, path)), printEqual: r.printEqual, linesOk: r.linesOk, changedLines: r.lines, commentOnly: r.commentOnly };
  });
  const result = {
    base, head,
    method: 'ts.createPrinter({removeComments: true}).printFile per file (types kept), before against after; and every changed line a trailing // comment or wholly inside a comment',
    typescriptVersion: ts.version,
    changedFiles: entries.length,
    changedProductionFiles: production.length,
    commentOnly: rows.filter((r) => r.commentOnly).length,
    notCommentOnly: rows.filter((r) => !r.commentOnly).map((r) => r.path),
    rows,
  };
  writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
  console.log(`production files changed ${production.length}, comment-only (print and lines) ${result.commentOnly}, not ${result.notCommentOnly.length}`);
  process.exit(result.notCommentOnly.length === 0 ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

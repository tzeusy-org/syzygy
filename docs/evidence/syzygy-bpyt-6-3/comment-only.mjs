// Is a change to production TypeScript comment-only? For syzygy-bpyt.6.3 stack 3 (the fence-rule finding).
// Usage: node comment-only.mjs <git repo> <base commit> <head commit> <out.json>
// Run from a checkout that has `typescript` installed (npm ci). For every non-test .ts file under packages/*/src and
// apps/*/src that differs between the two commits, transpile both versions with comments removed and compare the
// emitted JavaScript byte for byte. A file whose emit is equal differs only in comments and whitespace that the emitter
// drops. Files added or removed by the change are listed and are not comment-only. Exit status 1 when any differs.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const [repo, base, head, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: comment-only.mjs <git repo> <base> <head> <out.json>');
const ts = createRequire(import.meta.url)('typescript');
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 1 << 28 });
const sha = (v) => createHash('sha256').update(v).digest('hex');

const changed = git('diff', '--name-status', '-z', base, head).toString('utf8').split('\0').filter(Boolean);
const entries = [];
for (let i = 0; i < changed.length; i += 2) entries.push({ status: changed[i], path: changed[i + 1] });
const production = entries.filter((e) => /^(packages|apps)\/[^/]+\/src\/.*\.ts$/.test(e.path) && !e.path.endsWith('.test.ts'));

const emit = (source, path) => ts.transpileModule(source, { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, removeComments: true } }).outputText;
const rows = production.map(({ status, path }) => {
  if (status !== 'M') return { path, status, commentOnly: false };
  const before = git('show', `${base}:${path}`).toString('utf8');
  const after = git('show', `${head}:${path}`).toString('utf8');
  const a = emit(before, path), b = emit(after, path);
  return { path, status, sourceSha256Base: sha(before), sourceSha256Head: sha(after), emitSha256Base: sha(a), emitSha256Head: sha(b), commentOnly: a === b };
});
const result = {
  base, head,
  method: 'ts.transpileModule, target ES2022, module NodeNext, removeComments, per file, before against after',
  typescriptVersion: ts.version,
  changedFiles: entries.length,
  changedProductionFiles: production.length,
  commentOnly: rows.filter((r) => r.commentOnly).length,
  notCommentOnly: rows.filter((r) => !r.commentOnly).map((r) => r.path),
  rows,
};
writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log(`production files changed ${production.length}, comment-only ${result.commentOnly}, not ${result.notCommentOnly.length}`);
process.exit(result.notCommentOnly.length === 0 ? 0 : 1);

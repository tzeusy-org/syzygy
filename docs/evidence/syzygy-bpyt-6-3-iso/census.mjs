// Census of the object-shape predicates and the ISO date / instant helpers for syzygy-bpyt.6.3 stack 4.
// Usage: node census.mjs <git repo> <commit> <out.json>
//
// Population: every tracked .ts, .mjs and .cjs file under packages/, apps/ and scripts/ at the commit, read from the commit
// (never the worktree), tests included and counted apart.
// Method one (this file) walks the syntax tree of every file. It records:
//   named    every declaration of a function-like value named isObj, isObject, isRecord, isoOf or isIsoDate, with its exact text;
//   shape    every function-like with ONE parameter P whose body (the expression, or the sole `return`) names `typeof P === 'object'`,
//            under any name: the object-shape predicates, so a copy under another name is counted, not missed;
//   date     every function-like with ONE parameter whose body names Date.parse, toISOString or `new Date(`: the date helpers.
// Method two (census-grep.py) counts the same declarations with `git grep -c -E`; the per-file counts must equal method one's.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const NAMES = ['isObj', 'isObject', 'isRecord', 'isoOf', 'isIsoDate'];
const ROOTS = ['packages/', 'apps/', 'scripts/'];
const EXT = ['.ts', '.mjs', '.cjs'];

export const sha = (text) => createHash('sha256').update(text).digest('hex');
export const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 1 << 28 });

export function trackedFiles(repo, commit) {
  return git(repo, 'ls-tree', '-r', '-z', '--name-only', commit)
    .toString('utf8')
    .split('\0')
    .filter((f) => f && ROOTS.some((r) => f.startsWith(r)) && EXT.some((e) => f.endsWith(e)));
}

export function loadTs(repo) {
  return createRequire(resolve(repo, 'package.json'))('typescript');
}

const isTest = (file) => /\.test\.(ts|mjs|cjs)$/.test(file) || /\.testkit\.ts$/.test(file);

/** The function-like nodes of a source file with the name they are bound to (declaration or `const name = ...`), or ''. */
export function functionLikes(ts, file, text) {
  const kind = file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const out = [];
  const visit = (node) => {
    let name = '';
    let fn;
    let whole = node;
    if (ts.isFunctionDeclaration(node) && node.body) {
      fn = node;
      name = node.name?.text ?? '';
    } else if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && node.parent) {
      fn = node;
      const p = node.parent;
      if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
        name = p.name.text;
        // the whole statement is the exact text of the definition
        whole = p.parent && ts.isVariableDeclarationList(p.parent) && p.parent.parent && ts.isVariableStatement(p.parent.parent) ? p.parent.parent : p;
      } else if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) {
        name = p.name.text;
        whole = p;
      }
    }
    if (fn) {
      const line = sf.getLineAndCharacterOfPosition(whole.getStart(sf)).line + 1;
      const endLine = sf.getLineAndCharacterOfPosition(whole.getEnd()).line + 1;
      out.push({ ts, sf, fn, name, whole, line, endLine });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** The expression a function decides with: the arrow's expression body, or the single `return` expression of a block body. */
function decidingExpression(ts, fn) {
  if (!fn.body) return undefined;
  if (!ts.isBlock(fn.body)) return fn.body;
  const statements = fn.body.statements;
  if (statements.length === 1 && ts.isReturnStatement(statements[0]) && statements[0].expression) return statements[0].expression;
  return undefined;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function classify(ts, sf, fn, name) {
  const params = fn.parameters;
  const body = fn.body ? fn.body.getText(sf) : '';
  const kinds = [];
  if (NAMES.includes(name)) kinds.push('named');
  if (params.length === 1 && ts.isIdentifier(params[0].name)) {
    const p = params[0].name.text;
    const expr = decidingExpression(ts, fn);
    const text = expr ? expr.getText(sf) : '';
    if (new RegExp(`typeof\\s+${escapeRe(p)}\\s*===\\s*['"]object['"]`).test(text)) kinds.push('shape');
    if (/\bDate\.parse\(|\.toISOString\(|\bnew\s+Date\(/.test(body)) kinds.push('date');
  }
  return kinds;
}

export function census(repo, commit) {
  const ts = loadTs(repo);
  const files = trackedFiles(repo, commit);
  const rows = [];
  for (const file of files) {
    const text = git(repo, 'show', `${commit}:${file}`).toString('utf8');
    for (const { sf, fn, name, whole, line, endLine } of functionLikes(ts, file, text)) {
      const kinds = classify(ts, sf, fn, name);
      if (kinds.length === 0) continue;
      const exact = whole.getText(sf);
      rows.push({
        file,
        line,
        endLine,
        name: name || '(anonymous)',
        kinds,
        test: isTest(file),
        exported: /\bexport\b/.test(exact.slice(0, 40)) || (ts.getCombinedModifierFlags?.(whole) & ts.ModifierFlags.Export) !== 0 || false,
        params: fn.parameters.map((p) => p.getText(sf)),
        returnType: fn.type ? fn.type.getText(sf) : null,
        exactText: exact,
        exactSha256: sha(exact),
        normalizedSha256: sha(exact.replace(/\s+/g, ' ').trim()),
      });
    }
  }
  return { files, rows };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [repo, commit, out] = process.argv.slice(2);
  if (out === undefined) throw new Error('usage: census.mjs <git repo> <commit> <out.json>');
  const { files, rows } = census(repo, commit);
  const named = rows.filter((r) => r.kinds.includes('named'));
  const summary = {
    commit: git(repo, 'rev-parse', commit).toString().trim(),
    population: `${files.length} tracked ${EXT.join(', ')} files under ${ROOTS.join(', ')}`,
    populationFiles: files.length,
    rows: rows.length,
    named: Object.fromEntries(NAMES.map((n) => [n, named.filter((r) => r.name === n).length])),
    namedTotal: named.length,
    namedInPackagesAndApps: named.filter((r) => !r.file.startsWith('scripts/')).length,
    namedTests: named.filter((r) => r.test).length,
    shape: rows.filter((r) => r.kinds.includes('shape')).length,
    shapeUnderOtherNames: rows.filter((r) => r.kinds.includes('shape') && !r.kinds.includes('named')).map((r) => `${r.file}:${r.line} ${r.name}`),
    date: rows.filter((r) => r.kinds.includes('date')).length,
  };
  writeFileSync(out, `${JSON.stringify({ summary, rows }, null, 1)}\n`);
  console.log(JSON.stringify(summary, null, 1));
}

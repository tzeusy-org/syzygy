// Static source/config/pragma/import-closure inventory. It executes no observed source and establishes no timing claim.
// Usage: node source_applicability.mjs TREE THREAD_COMMIT PROCESS_COMMIT CURRENT_COMMIT OUT.json
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [tree, thread, processCpu, current, output] = process.argv.slice(2);
const ts = createRequire(resolve(tree, 'package.json'))('typescript');
const helperPath = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts';
const { resolveIn } = await import(pathToFileURL(resolve(tree, helperPath)).href);
const git = (...args) => execFileSync('git', args, { cwd: tree });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const roots = ['packages/polaris-generation-core/src/dossier-profile.ts', 'packages/polaris-generation-core/src/excerpt.ts',
  'packages/three-surface-poc-core/src/test-artifact-verification.ts'];
const tests = roots.map(file => file.replace(/\.ts$/u, '.test.ts'));

function inventory(commit) {
  const paths = git('ls-tree', '-r', '-z', '--name-only', commit).toString().split('\0').filter(Boolean);
  const files = new Set(paths);
  const read = file => git('show', `${commit}:${file}`);
  const manifests = new Map(paths.filter(file => file === 'package.json' || /^(?:apps|packages)\/[^/]+\/package\.json$/u.test(file))
    .map(file => {
      const manifest = JSON.parse(read(file));
      return [manifest.name, { ...manifest, dir: posix.dirname(file) }];
    }));
  const workspace = { manifests, isFile: file => files.has(file) };
  const closures = roots.map(root => {
    const queue = [root], seen = new Set(queue), edges = [], unresolved = [], unsupported = [];
    for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
      if (!files.has(file)) { unresolved.push({ file, reason: 'root absent' }); continue; }
      const source = ts.createSourceFile(file, read(file).toString(), ts.ScriptTarget.Latest, true);
      const specifiers = [];
      const visit = node => {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
        if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) specifiers.push(node.argument.literal.text);
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const argument = node.arguments[0];
          if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) specifiers.push(argument.text);
          else unsupported.push({ file, expression: node.getText(source) });
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
      for (const specifier of specifiers) {
        const target = resolveIn(workspace, file, specifier);
        if (target === null) continue;
        if (target === undefined) { unresolved.push({ file, specifier }); continue; }
        edges.push({ from: file, specifier, to: target });
        if (!seen.has(target)) { seen.add(target); queue.push(target); }
      }
    }
    return { root, files: [...seen].sort().filter(file => files.has(file)).map(path => ({ path, sha256: sha(read(path)) })), edges, unresolved, unsupported };
  });
  const configuration = paths.filter(path => /(^|\/)vitest[^/]*\.[cm]?ts$/u.test(path)
    || ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.base.json'].includes(path))
    .map(path => ({ path, sha256: sha(read(path)) }));
  return { commit, closures, configuration,
    tests: tests.map(path => ({ path, sha256: sha(read(path)),
      leadingRunnerPragmas: read(path).toString().split(/\bimport\b/u, 1)[0].split('\n').filter(line => /@(?:vitest|jest)-/u.test(line)) })) };
}
const snapshots = [thread, processCpu, current].map(inventory);
const currentRows = new Map(snapshots[2].closures.flatMap(closure => closure.files).map(row => [row.path, row.sha256]));
const moved = snapshots.slice(0, 2).map(snapshot => {
  const before = new Map(snapshot.closures.flatMap(closure => closure.files).map(row => [row.path, row.sha256]));
  return { from: snapshot.commit, to: current,
    files: [...new Set([...before.keys(), ...currentRows.keys()])].sort()
      .filter(path => before.get(path) !== currentRows.get(path))
      .map(path => ({ path, historicalSha256: before.get(path) ?? null, currentSha256: currentRows.get(path) ?? null })) };
});
writeFileSync(output, JSON.stringify({ schema: 'test-clock-source-applicability/1',
  method: 'TypeScript syntax and the existing workspace resolver, applied to git objects at each identified commit; finite literal import forms only.',
  helper: { path: helperPath, sha256: sha(git('show', `${current}:${helperPath}`)) },
  compiler: ts.version, snapshots, moved, currentTiming: 'Unknown',
  note: 'The actual current closure and source/config changes are disclosed. Equal masked test emits alone do not establish applicability. No historical timing is promoted to a current measurement.' }, null, 2) + '\n');

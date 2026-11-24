// Replay from a clean npm-ci checkout of the audited source. Only reads Git blobs and local imports.
// node docs/evidence/syzygy-bpyt-8-44/current-source-census.mjs <audited-commit>
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import ts from 'typescript';

const root = realpathSync(process.cwd());
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 1 << 25 });
const subject = git('rev-parse', '--verify', `${process.argv[2]}^{commit}`).toString().trim();
if (process.argv[2] !== subject) throw new Error('pass the full audited commit');
git('diff', '--quiet', subject, '--', 'apps', 'packages');
const get = (path) => git('show', `${subject}:${path}`).toString();
const sha = (value) => createHash('sha256').update(value).digest('hex');
const entries = (value) => value.toString().split('\0').filter(Boolean);
const files = (...paths) => entries(git('ls-tree', '-rz', '--name-only', subject, '--', ...paths));
const roots = [
  'apps/syzygy/src',
  'apps/three-surface-poc/src/polaris-generation',
  'packages/polaris-dossier/src',
  'packages/polaris-generation-consent/src',
  'packages/polaris-generation-core/src',
];
const dossier = 'packages/polaris-dossier/src';
const core = 'packages/polaris-generation-core/src';
const candidatePaths = files(...roots).filter((path) => path.endsWith('.ts'));
const production = candidatePaths.filter((path) => !/\.(test|testkit)\.ts$/u.test(path));
const reportUnions = [];
const objectTestPaths = [];
const literalFlag = (member, kind) => member !== undefined && ts.isLiteralTypeNode(member) && member.literal.kind === kind;
function reportArm(type, kind, requiresReport) {
  if (!ts.isTypeLiteralNode(type)) return false;
  const ok = type.members.find((member) => member.name?.getText() === 'ok');
  return literalFlag(ok?.type, kind) && (!requiresReport || type.members.some((member) => member.name?.getText() === 'report'));
}
for (const path of production) {
  const text = get(path);
  const syntax = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (ts.isUnionTypeNode(node)
      && node.types.some((type) => reportArm(type, ts.SyntaxKind.TrueKeyword, true))
      && node.types.some((type) => reportArm(type, ts.SyntaxKind.FalseKeyword, false))) {
      reportUnions.push({ path, line: syntax.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(syntax);
  if (/typeof\s+(\w+)\s*===\s*['"]object['"]\s*&&\s*\1\s*!==\s*null\s*&&\s*!Array\.isArray\(\1\)/u.test(text)) objectTestPaths.push(path);
}

const guardPath = `${core}/island-boundary.test.ts`;
const guard = get(guardPath);
function guardList(name) {
  const declaration = guard.match(new RegExp(`const ${name} = \\[([\\s\\S]+?)\\];`, 'u'));
  return [...declaration[1].matchAll(/'([^']+)'/gu)].map((entry) => entry[1]);
}
const island = guardList('ISLAND');
const parked = guardList('PARKED_REMAINDER');
const workspacePaths = files('apps', 'packages');
const workspaceRoots = workspacePaths
  .filter((path) => /^(apps|packages)\/[^/]+\/package\.json$/u.test(path))
  .map((path) => path.replace(/package\.json$/u, 'src/'));
const islandOrigins = workspacePaths.filter((path) =>
  workspaceRoots.some((parent) => path.startsWith(parent)) && /\.[cm]?[jt]s$/u.test(path)
  && !/\.(?:test|testkit)\.[cm]?[jt]s$|\.d\.[cm]?ts$/u.test(path));
const reachTool = 'docs/evidence/syzygy-bpyt-8-7/tools/reach.mjs';
git('diff', '--quiet', subject, '--', reachTool);
const reach = guardList('ENTRIES').map((entry) => {
  const result = JSON.parse(execFileSync(process.execPath, [reachTool, root, entry], { cwd: root }));
  return {
    entry,
    reachable: result.reachable.length,
    unresolved: result.unresolved,
    islandOrParked: result.reachable.filter((path) => island.includes(path) || parked.includes(path)),
  };
});

const manifest = JSON.parse(get('packages/polaris-dossier/package.json'));
const readme = get('packages/polaris-dossier/README.md');
const subpaths = Object.keys(manifest.exports).filter((path) => path !== '.').sort();
const documented = [...readme.matchAll(/^\| `(\.\/[^ `]+)` \|/gmu)].map((match) => match[1]).sort();
const barrel = [...get(`${dossier}/index.ts`).matchAll(/^export \{ (\w+) \}/gmu)].map((match) => match[1]).sort();
const splitFiles = [
  'check.ts', 'check-derive.ts', 'check-model.ts', 'review.ts', 'review-model.ts',
  'review-packet.ts', 'review-verdict.ts', 'inventory.ts', 'run-dir.ts',
].map((f) => `${dossier}/${f}`).concat(
  ['dossier-evaluation.ts', 'dossier-manifest.ts', 'dossier-page-scan.ts'].map((f) => `${core}/${f}`)
);
const lines = Object.fromEntries(splitFiles.map((path) => [path, get(path).split('\n').length - 1]));
const repairSources = [
  'docs/evidence/syzygy-bpyt-8-7/reconciliation-gen1.json',
  'docs/evidence/syzygy-bpyt-8-40/importer-census.json',
  'docs/evidence/syzygy-bpyt-8-40/original-outcome-disposition.json',
  'docs/evidence/syzygy-bpyt-8-41/entity-decoder-differential-2026-11-04.json',
  'docs/evidence/syzygy-bpyt-8-43/outcome-command-parity-2026-11-23.json',
  'docs/evidence/syzygy-bpyt-1-26/G1-RECONCILIATION.md',
  'docs/evidence/syzygy-bpyt-1-27/quotation-domains-2026-11-05.json',
  guardPath,
  `${dossier}/polaris.ts`,
];
const bindings = Object.fromEntries(repairSources.map((path) => [path, sha(git('show', `${subject}:${path}`))]));

console.log(JSON.stringify({
  audited: subject,
  typescript: ts.version,
  island: { originPopulation: islandOrigins.length, listed: island, permittedRemainder: parked, reach },
  outcomes: { roots, candidateFiles: candidatePaths.length, productionFiles: production.length, excludedTests: candidatePaths.length - production.length, reportUnions },
  objectTestPaths,
  packageBoundary: { barrel, subpaths, documented, splitFileLines: lines },
  inputSha256: bindings,
}, null, 2));

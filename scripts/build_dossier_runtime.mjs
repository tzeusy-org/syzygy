// Trusted build inputs only. This prepares executable support, not observed
// project code; the runtime rechecks these exact inputs and outputs before use.
import { build } from 'esbuild';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileDossierSessionSupport } from './compile_dossier_session_support.mjs';
import { compileDossierOrderedScreen, ORDERED_SCREEN_SOURCES } from './compile_dossier_ordered_screen.mjs';

const root = await realpath(fileURLToPath(new URL('..', import.meta.url)));
const relative = name => name.length > 0 && !path.isAbsolute(name) && !name.includes('\\')
  && name.split('/').every(part => part !== '' && part !== '.' && part !== '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const worker = 'packages/polaris-dossier/src/git-memory-worker.ts';
const renderer = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';
const profileSources = ['session-profile', 'session-launch', 'session-controller', 'session-egress-policy', 'session-response',
  'session-tools', 'session-host', 'session-relay', 'session-broker', 'session-url-view', 'session-credential',
  'session-control', 'session-peer', 'url-role-plan', 'url-session-budget', 'url-session-audit', 'url-origin-ledger', 'url-run-origins', 'url-source-reader', 'git-object-reader',
  'url-run-sessions', 'url-run-artifacts', 'url-product-reads', 'url-operation-products', 'url-question-ui', 'url-supervisor-state', 'url-launch-history', 'url-design-view',
  'url-design-product', 'url-design-delivery', 'url-ordered-design-request', 'url-ordered-design-audit', 'url-ordered-design-writer',
  'url-machine-instance', 'url-machine-lifecycle', 'url-machine-store', 'url-ordered-design-bounds', 'url-ordered-design-session', 'url-ordered-design-work-budget', 'url-rendered-site-screen', 'url-rendered-source-proof', 'url-stored-render', 'url-dossier-result', 'url-ordered-render-value',
  'reverify', 'brief', 'inventory', 'review', 'review-packet', 'session-handover', 'session-statement', 'waiting-sessions', 'render', 'check',
  'check-model', 'review-model', 'credential-probe', 'cli', 'url-run-record', 'url-mode-registry', 'url-parent-adoption', 'url-runtime', 'polaris']
  .map(name => `packages/polaris-dossier/src/${name}.ts`);
const captured = new Map();
const capture = (name, bytes) => {
  if (captured.has(name) && hash(captured.get(name)) !== hash(bytes)) throw new Error('build input changed during compilation');
  captured.set(name, Buffer.from(bytes));
};
const sourceBytes = await readFile(path.join(root, worker));
const parsed = ts.createSourceFile(worker, sourceBytes.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const banners = [];
for (const statement of parsed.statements) {
  if (!ts.isVariableStatement(statement) || !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && declaration.name.text === 'GIT_MEMORY_WORKER_BUNDLE_BANNER'
      && declaration.initializer && ts.isStringLiteral(declaration.initializer)) banners.push(declaration.initializer.text);
  }
}
if (banners.length !== 1) throw new Error('worker bootstrap banner is not one exported literal');
const capturePlugin = { name: 'capture-exact-inputs', setup(builder) {
  builder.onLoad({ filter: /\.(?:[cm]?[jt]sx?|json)$/ }, async args => {
    const name = path.relative(root, args.path).split(path.sep).join('/');
    if (!relative(name) || !(await realpath(args.path)).startsWith(`${root}/`)) throw new Error('build input outside checkout');
    const contents = await readFile(args.path); capture(name, contents);
    const extension = path.extname(args.path);
    const loader = extension === '.json' ? 'json' : ['.ts', '.mts', '.cts'].includes(extension) ? 'ts'
      : extension === '.tsx' ? 'tsx' : extension === '.jsx' ? 'jsx' : 'js';
    return { contents, loader, resolveDir: path.dirname(args.path) };
  });
} };
const result = await build({ absWorkingDir: root, entryPoints: [worker], bundle: true, platform: 'node', format: 'esm',
  conditions: ['source'], target: 'node24', banner: { js: banners[0] }, outfile: 'worker.mjs', write: false, metafile: true, logLevel: 'silent',
  plugins: [capturePlugin],
});
if (result.outputFiles.length !== 1 || result.outputFiles[0].contents.length > 8_388_608) throw new Error('unexpected worker build output');
const outputs = new Map([['worker.mjs', result.outputFiles[0].contents]]);
// Compile only the exact captured first-party C input. The native helper stays
// outside support/, which is the role-visible script mount. It never enters a
// role's filesystem or selects an executable from observed-project content.
const peerSource = 'packages/polaris-dossier/src/session-peer.c';
const peerBytes = await readFile(path.join(root, peerSource)); capture(peerSource, peerBytes);
const dist = path.join(root, 'packages/polaris-dossier/dist');
await mkdir(dist, { recursive: true });
const temporaryRoot = path.join(os.homedir(), '.tmp');
await mkdir(temporaryRoot, { recursive: true });
const scratch = await mkdtemp(path.join(temporaryRoot, 'syzygy-peer-build-'));
try {
  await writeFile(path.join(scratch, 'peer.c'), peerBytes, { flag: 'wx', mode: 0o600 });
  execFileSync('/usr/bin/cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-O2', 'peer.c', '-o', 'peer'],
    { cwd: scratch, env: { PATH: '/usr/bin:/bin', LANG: 'C' }, stdio: 'pipe', timeout: 10_000, maxBuffer: 65_536 });
  const native = await readFile(path.join(scratch, 'peer'));
  if (native.length === 0 || native.length > 262_144 || !native.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])))
    throw new Error('unexpected native peer helper output');
  outputs.set('host/session-peer', native);
} finally { await rm(scratch, { recursive: true, force: true }); }
// Consume the trusted root's entire compiler graph as well as the worker's.
// Reading a hand-picked source list after compilation cannot establish which
// dependencies a control/origin/launcher implementation actually consumed.
const host = await build({ absWorkingDir: root, entryPoints: ['packages/polaris-dossier/src/polaris.ts'], bundle: true,
  platform: 'node', format: 'esm', conditions: ['source'], target: 'node24', outfile: 'host-identity.mjs',
  write: false, metafile: true, logLevel: 'silent', plugins: [capturePlugin] });
const design = await build({ absWorkingDir: root, entryPoints: [renderer], bundle: true,
  platform: 'node', format: 'esm', conditions: ['source'], target: 'node24', outfile: 'renderer.mjs',
  write: false, metafile: true, logLevel: 'silent', plugins: [capturePlugin] });
if (design.outputFiles.length !== 1 || design.outputFiles[0].contents.length > 8_388_608) throw new Error('unexpected renderer build output');
outputs.set('renderer.mjs', design.outputFiles[0].contents);
const orderedScreen = await compileDossierOrderedScreen(root, [capturePlugin]);
outputs.set('host/ordered-screen.mjs', orderedScreen.outputFiles[0].contents);
const inputs = new Set([...Object.keys(result.metafile.inputs), ...Object.keys(host.metafile.inputs), ...Object.keys(design.metafile.inputs),
  ...Object.keys(orderedScreen.metafile.inputs), ...ORDERED_SCREEN_SOURCES, ...profileSources,
  worker, peerSource, 'scripts/build_dossier_runtime.mjs', 'scripts/compile_dossier_session_support.mjs', 'package-lock.json']);
for (const name of [...Object.keys(host.metafile.inputs), ...Object.keys(design.metafile.inputs), ...Object.keys(orderedScreen.metafile.inputs)])
  if (!captured.has(name)) throw new Error('uncaptured host/renderer/screen compiler input');
// Resolution metadata belongs to the captured graph even though esbuild does
// not deliver package.json files through onLoad merely to resolve exports.
inputs.add('package.json'); inputs.add('packages/polaris-dossier/package.json');
for (const name of [...inputs]) {
  let directory = path.dirname(name);
  while (directory !== '.' && directory !== path.dirname(directory)) {
    try { const file = path.join(directory, 'package.json'); const bytes = await readFile(path.join(root, file));
      capture(file, bytes); inputs.add(file); break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    directory = path.dirname(directory);
  }
}
for (const name of Object.keys(result.metafile.inputs)) if (!captured.has(name)) throw new Error('uncaptured compiler input');
for (const [name, bytes] of await compileDossierSessionSupport(async file => {
  inputs.add(file);
  const bytes = await readFile(path.join(root, file)); capture(file, bytes);
  return bytes;
})) outputs.set(name, bytes);
const records = [];
for (const name of [...inputs].sort()) {
  if (!relative(name) || !/^(?:packages|apps|node_modules|scripts)\//u.test(name) && !['package-lock.json', 'package.json'].includes(name)) throw new Error('build input outside known trees');
  const file = path.join(root, name), resolved = await realpath(file);
  if (!resolved.startsWith(`${root}/`)) throw new Error('build input resolves outside checkout');
  const bytes = captured.get(name) ?? await readFile(file);
  records.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
}
// Ensure the worker source used to select the banner has not changed during
// bundling. A later check covers the complete input population again.
if (hash(sourceBytes) !== records.find(record => record.path === worker)?.sha256) throw new Error('worker source changed during build');
const destination = path.join(root, 'packages/polaris-dossier/dist/runtime');
await mkdir(path.dirname(destination), { recursive: true });
await mkdir(destination);
for (const directory of ['support', 'design-support', 'host']) await mkdir(path.join(destination, directory));
const files = [];
// Keep the manifest order closed and independent of compilation order.
for (const name of ['worker.mjs', 'renderer.mjs', 'support/session-bridge.js', 'support/session-mcp.js', 'host/session-peer',
  'design-support/session-mcp.js', 'host/ordered-screen.mjs']) {
  const bytes = outputs.get(name);
  if (bytes === undefined) throw new Error('missing runtime output');
  await writeFile(path.join(destination, name), bytes, { flag: 'wx', mode: name === 'host/session-peer' ? 0o755 : 0o644 });
  files.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
}
for (const record of records) if (hash(await readFile(path.join(root, record.path))) !== record.sha256) throw new Error('build input changed before manifest');
const node = await realpath(process.execPath), nodeBytes = await readFile(node);
const manifest = { format: 'polaris-url-runtime/1', node: { version: process.version, sha256: hash(nodeBytes), bytes: nodeBytes.length },
  inputTreeSha256: hash(JSON.stringify(records)), inputs: records, files };
await writeFile(path.join(destination, 'manifest.json'), JSON.stringify(manifest) + '\n', { flag: 'wx', mode: 0o644 });
process.stdout.write(`Prepared URL runtime: ${records.length} checked inputs, ${files.length} executable support files.\n`);

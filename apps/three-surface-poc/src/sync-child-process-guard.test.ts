import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { WORKSPACE, resolveIn, type Workspace } from '../../../packages/polaris-generation-core/src/workspace-reach.testkit.js';
import { SYSTEM_TEST_SUFFIX, TIERS, workspaceDirectories } from '../../../vitest.tiers.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// The test roots are the `src/` of each workspace package of the root package.json, derived through vitest.tiers.ts, which
// the vitest.config.ts tier projects use too, so a package added there is scanned here (syzygy-bpyt.4.1: a hand list had missed
// two of seven; syzygy-bpyt.4.3: the config names tiers, not roots). A vitest worker
// answers its parent over an RPC with a fixed 60s
// timeout; a test that blocks the worker's event loop longer than that makes
// the pending `onTaskUpdate` call time out, and the run exits 1 with every
// test passed (syzygy-w90k). An install, a build or a documented command can
// run past 60s under load, so only short local tools may run synchronously,
// in a test file or in any module a test file imports (syzygy-3f5c).
const VITEST_CONFIG = 'vitest.config.ts';
// A test that imports a workspace package runs its source, through the `source` condition of the package's exports, which the
// config resolves first (syzygy-bpyt.4.2). The scan follows the same exports, so it refuses a config that loads them otherwise.
const SOURCE_CONDITION = /\bssr:\s*\{\s*resolve:\s*\{\s*conditions:\s*\[\s*'source'\s*,/;
const ALIAS_KEY = /\balias\s*:/;
// A plugin can resolve a workspace package to any module, its dist among them, in one project or in all (the PR 549 review's
// X9, syzygy-bpyt.65), so the config may declare none: a `plugins` key, bare or quoted, fails before anything else is read.
const PLUGINS_KEY = /\bplugins\b['"]?\s*:/;
const SHORT_COMMANDS = new Set(['git', 'mkfifo', 'bd', 'which', 'ss']);
// The long synchronous calls the scan finds and keeps, by module and
// command, each with why it cannot hold a worker near the 60s bound. An entry
// that matches no call fails, so none outlives its call. Syzygy runs no
// observed test suite (syzygy-hjuz: SEC-3, RFC5-18), so no entry may name one.
const LAUNCHER = 'the `syzygy polaris` launcher at run time; suite tests import only its pure helpers (blockingWhy, toolPathsFor), and no suite test calls runPolarisCli';
const EXEMPT: Readonly<Record<string, string>> = {
  "packages/polaris-dossier/src/polaris.ts 'tmux'": LAUNCHER,
  "packages/polaris-dossier/src/polaris.ts 'sh'": LAUNCHER,
  "packages/polaris-dossier/src/session-view.ts 'bwrap'": 'viewProbeRefusal is called by the launcher; its reader fixture replaces spawnSync and starts no process',
};
const DOSSIER = 'packages/polaris-dossier/src/';
const PEER_MODULE = DOSSIER + 'session-peer.ts';
const MACHINE_PEER_MODULE = DOSSIER + 'url-machine-peer.ts';
// Each exact location must be consumed once. Pin the parsed call, including argv and options.
// Short fixture-only Git and FIFO calls have the same local-work rationale as their bare forms.
const NATIVE_SITES = new Map<string, ReadonlyMap<string, string>>([
  [DOSSIER + 'acquisition-process.test.ts', new Map([
    ['321c5c8541458741cd416b0e42f9f4925d4e205ff448af1697c9a8e4fb6dcfef', 'local Git setup for the temporary upload fixture'],
    ['dc195423d11f4dc4ace38129aca4bcf5c05ff427878579362c73686dab7250b2', 'make one FIFO in the local census fixture'],
  ])],
  [DOSSIER + 'effective-run-record.test.ts', new Map([
    ['c63c670931555dfb7a241aeb33a0e4c35aa008718c6f72d852517ed545ae58a8', 'make one FIFO in the malformed record fixture'],
  ])],
  [DOSSIER + 'git-memory-pack.test.ts', new Map([
    ['f3b5e9f0103bf7bfa4e56bdd2bde8a4439ae7a68b18d56ea2b2e694a8e67c2b8', 'local synthetic Git object and pack construction, 5s'],
  ])],
  [DOSSIER + 'git-memory-ssh.test.ts', new Map([
    ['8e255a9c2026c018d523497f1471627978732670b0df0f2169e81fd30a2fc2df', 'generate a fixture-only Ed25519 key, 5s'],
    ['b66e96a8cf2f45b79fa24b55f5466d9b6eb4a7d0ecf634ead740dcc8528aeaf5', 'local synthetic Git repository setup, 5s'],
    ['57115c12a0840cf43ae98795df4c5a6034b7f93b692ffa47128e816c3a4171dd', 'sshd config check with -t on generated fixture config, 5s'],
    ['ec94ac44dcb372e7b2ef8048cc3c08be9a61836c5023b498a850b636331f2554', 'list files beneath the temporary SSH fixture home, 1s'],
    ['f408dc0e00bc1778c5e2256075b7e8366bae034d7851fefceaac3f2210057334', 'load fixture keys into the fixture-owned SSH agent, 1s'],
    ['78c3bf0d77bc43157b7b4841e7eed3c67ee883130dfbff397d5fc37640850050', 'write the restricted synthetic control file, 1s'],
    ['3c2749a296180a23143cb264e9dc72a5b686399451f0b7fc1f3955c5d21abf52', 'stat the synthetic control path, 1s'],
    ['f362efb721ee907a4cc1e990e43cc84d9cd13895d1ae10d707a7804cd21e7555', 'set local fixture HEAD, 1s'],
  ])],
  [DOSSIER + 'git-memory-store.test.ts', new Map([
    ['faeab4caf438bf74bd0cdd6b6dc57f40a9ca6b104dd0fda6e07194919610f6bc', 'local Git synthesis in a temporary bare repository'],
    ['b4f95608fcf2114198efe529ceea525d819bea74d9453743b057ccc7e2a00f8f', 'read back local synthetic HEAD and objects'],
  ])],
  [DOSSIER + 'git-memory-transport.test.ts', new Map([
    ['00a4b1b10cc41538a74c7fe792c806f9eb0bdc0511f0e3daf3dd6f7845dbd084', 'local synthetic Git transport fixture setup, 5s'],
    ['b52226c1c49d1bb19a83f9899ba02884f353dce0bf29d34f00ca981a5c61c15a', 'list files beneath the temporary transport fixture home, 5s'],
    ['325f79f09c7828fec8a7bb6ba58e52bb21a5b745586ebf0c994bed718ac99eca', 'hash one synthetic census file, 5s'],
    ['7827e48f295d73cba50488b606eeaee2170aca7aaebc4854ae029b2d630486fb', 'stat one synthetic census file, 5s'],
    ['487fe659406e0da6f84d2942f78e334c00186a76ba6905c0f140688822d84780', 'local upload-pack fixture advertisement, 5s'],
    ['9e112f8ef42532df715c861d0ae53a8b004958ef1043abb540aa62e05ceac069', 'local upload-pack fixture response, 5s'],
    ['21b1e36f48fe5b707a61ec45f6b6e40faee9d03fb93ffdbf4e32af2b65506a85', 'write the restricted synthetic control file, 1s'],
    ['31829c80eeb7a5b9186394d2adc7b098080ea4c6c4d982abe7f71823bf8f5a19', 'set local fixture HEAD, 1s'],
    ['dc9dc7ff1a4a5198318a6f145d8051c90fcd12913f84ebbbfc3a6d8019621feb', 'exercise local fixture ref drift, 1s'],
  ])],
  [DOSSIER + 'git-memory-worker.test.ts', new Map([
    ['1702fdda3cdc5377e9c82672bb2df8decda45b39d4cb2015844a8f8d0d6356ba', 'read one synthetic blob in the temporary worker repository'],
  ])],
  [DOSSIER + 'session-peer.test.ts', new Map([
    ['d5dea8e4382174a6f337c42849dc31649a3d82814b30e06ba72e8368a32329e2', 'make one FIFO in the malformed helper fixture'],
  ])],
  [PEER_MODULE, new Map([
    ['d386763019be3da14cc3355f44f4cb440547291c7846ec5f2cfd49a86eaeb6e4', 'prlimit hard CPU 1s, held helper on fd4, 1s SIGKILL, 128 output bytes, reserved capacity before exec'],
  ])],
  [MACHINE_PEER_MODULE, new Map([
    ['a91baeff25ce94e5c56a9306b460dd766124f95c695fd8cc626019e67953e87f', 'prlimit hard CPU 1s, held pinned image, fixed modes, 1s SIGKILL, 64KiB plus 512 output bytes, reserved capacity before exec'],
  ])],
  [DOSSIER + 'session-tools.test.ts', new Map([
    ['1e3dffa0ed4e69c22beded3774568d9b6aaae2104390b9624fecd38636978120', 'local Git setup in the owned synthetic source fixture'],
  ])],
  [DOSSIER + 'url-acquisition.test.ts', new Map([
    ['e6e409891649683791cacaeee8f6e65c83c04a6f9ecd023281a8799304e0854d', 'local Git setup in the owned synthetic acquisition fixture'],
  ])],
  [DOSSIER + 'url-mode-registry.test.ts', new Map([
    ['7e96c681d64c2161548aa940552f97bd8a04a2d305cc17528f28dc7eee68e24d', 'make one FIFO in the malformed mode record fixture'],
  ])],
]);
// This exact template supplies a fixture process launched asynchronously by the test.
const EMBEDDED_FIXTURE = DOSSIER + 'acquisition-process.test.ts';
const EMBEDDED_CALL = '496476a19a8b66906bd56990727e80e227041208e23bd8af1b01026751afd69b';
// Bind the child-file writer and the production fd verification to the admitted calls.
const FIXTURE_WRITER = 'e49f3dc7ce221b2a257bcbc95f0ad98201ddcf5f433fd6e8f44ba7e71e852cb7';
const PEER_SOURCE = '9b297766e237b26b25947b054e32a52edbf65260662c26cc37937a825fb08163';
const PEER_CAPTURE = '008ddd0641401d72b40fe0524fc920588d8da678ed7f46c8fcc5035ac27ccef5';
// The call's limits and image verifier are shared helpers/constants. Bind that
// complete context as well as the one admitted call; another call still fails.
const MACHINE_PEER_SOURCE = '17e2f123075882267c95a45005a0430745418d4c56538b000d8952b9339cd21f';
const SELF = 'apps/three-surface-poc/src/sync-child-process-guard.test.ts';
const SYNC_FUNCTIONS = ['execFileSync', 'execSync', 'spawnSync'];
const MODULE_SPECIFIER = /(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g;
const CHILD_PROCESS_LITERAL = /['"](?:node:)?child_process['"]/g;
// Each recognized way to bind child_process; any other mention fails closed.
const CHILD_PROCESS_BINDINGS = [
  /\bimport\s+(?:type\s+)?([^;'"]*?)\s+from\s+['"](?:node:)?child_process['"]/g,
  /\b(?:const|let|var)\s+([^=;]+?)\s*=\s*(?:await\s+import|require)\s*\(\s*['"](?:node:)?child_process['"]\s*\)/g,
];
// Mentions that bind no call here: a type query, and a vi.mock whose factory
// forwards to the real function, whose callers are scanned where they call.
const CHILD_PROCESS_NON_BINDINGS = [
  /\btypeof\s+import\s*\(\s*['"](?:node:)?child_process['"]\s*\)/g,
  /\bvi\s*\.\s*mock\s*\(\s*['"](?:node:)?child_process['"]/g,
];

interface SyncCall { readonly line: number; readonly command: string; readonly offset?: number }

/** Refuses a root vitest config that loads a workspace package other than by its source condition: a plugin, an alias, or no
 * `source` first in the server conditions. The test files themselves come from the tier lists (vitest.tiers.ts). */
function checkSuiteConfig(config: string): void {
  if (PLUGINS_KEY.test(config)) throw new Error(`${VITEST_CONFIG}: a plugin may load a workspace package by other than its source condition`);
  if (!SOURCE_CONDITION.test(config) || ALIAS_KEY.test(config)) throw new Error(`${VITEST_CONFIG}: workspace packages do not load by their source condition alone`);
}

/** The `src/` roots of the workspace packages, whose tests every tier scans. */
const suiteRoots = (): string[] => workspaceDirectories(REPO_ROOT).map((directory) => `${directory}/src/`);

/** The path of every own key in `value`, through objects and arrays at any depth. The text checks above miss an alias written
 * in shorthand (`resolve: { alias }`), so the loaded config is read too (syzygy-bpyt.70, the PR 554 round-2 review's N4). */
function keyPaths(value: unknown, at: readonly string[] = []): (readonly string[])[] {
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, member]) => [[...at, key], ...keyPaths(member, [...at, key])]);
}
const aliasKeys = (config: unknown): string[] => keyPaths(config).filter((path) => path.at(-1) === 'alias').map((path) => path.join('.'));

/** Each `test.projects` entry of the loaded config that does not inherit the root config, which holds the source condition. Vitest
 * 3.2 loads an entry whose `extends` is a string from that file, which the text checks never read and which may declare a plugin;
 * a string entry, a function or a promise likewise; and an entry with any other `extends`, or none, from no config file. So an entry
 * must be an object whose `extends` is `true` (the PR 558 round-1 review's N3, syzygy-bpyt.4.42). */
function detachedProjects(config: unknown): string[] {
  const projects = (config as { readonly test?: { readonly projects?: unknown } } | undefined)?.test?.projects;
  if (!Array.isArray(projects)) return ['test.projects is not an array'];
  return projects.flatMap((entry: unknown, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return [`test.projects.${index} is not an object`];
    return (entry as { readonly extends?: unknown }).extends === true ? [] : [`test.projects.${index}.extends is not true`];
  });
}

const lineOf = (source: string, index: number): number => source.slice(0, index).split('\n').length;
const escape = (name: string): string => name.replace(/[$]/g, '\\$');

/** Every synchronous child-process call in `source`, under whatever name it binds them. */
function syncCalls(source: string): SyncCall[] {
  const direct = new Set<string>();
  const namespaces = new Set<string>();
  const recognized = new Set<number>();
  const bindingSpans: [number, number][] = [];
  for (const pattern of CHILD_PROCESS_BINDINGS) {
    for (const match of source.matchAll(pattern)) {
      bindingSpans.push([match.index ?? 0, (match.index ?? 0) + match[0].length]);
      recognized.add((match.index ?? 0) + match[0].search(/['"](?:node:)?child_process['"]/));
      const clause = match[1]!.trim();
      const braces = /\{([^}]*)\}/.exec(clause);
      for (const spec of braces?.[1]?.split(',') ?? []) {
        const binding = /^(?:type\s+)?(\w+)(?:\s*(?:as|:)\s*(\w+))?$/.exec(spec.trim());
        if (binding !== null && !spec.trim().startsWith('type ') && SYNC_FUNCTIONS.includes(binding[1]!)) direct.add(binding[2] ?? binding[1]!);
      }
      const namespace = /\*\s+as\s+(\w+)/.exec(clause)?.[1] ?? (/^(\w+)\s*(?:,|$)/.exec(clause)?.[1]);
      if (namespace !== undefined && namespace !== 'type') namespaces.add(namespace);
    }
  }
  for (const pattern of CHILD_PROCESS_NON_BINDINGS) {
    for (const match of source.matchAll(pattern)) recognized.add((match.index ?? 0) + match[0].search(/['"](?:node:)?child_process['"]/));
  }
  const calls: SyncCall[] = [];
  // Fail closed on re-binding (syzygy-ty1x): outside its own binding, a sync
  // name may only be called, and a namespace only reached through
  // `.<name>`, a sync one only called. `const run = execFileSync`,
  // `const { execSync } = cp`, `cp['execSync']` and `const run =
  // cp.execFileSync` would otherwise call it under a name nothing follows.
  const insideBinding = (index: number): boolean => bindingSpans.some(([start, end]) => index >= start && index < end);
  for (const name of direct) {
    for (const match of source.matchAll(new RegExp(`(?<![\\w.$])${escape(name)}(?![\\w$])(?!\\s*\\()`, 'g'))) {
      if (!insideBinding(match.index ?? 0)) calls.push({ line: lineOf(source, match.index ?? 0), command: `<${name} re-bound>` });
    }
  }
  for (const name of namespaces) {
    for (const match of source.matchAll(new RegExp(`(?<![\\w.$])${escape(name)}(?![\\w$])(?:\\s*\\.\\s*(\\w+)(\\s*\\()?)?`, 'g'))) {
      if (insideBinding(match.index ?? 0)) continue;
      const member = match[1];
      if (member === undefined || (SYNC_FUNCTIONS.includes(member) && match[2] === undefined)) {
        calls.push({ line: lineOf(source, match.index ?? 0), command: `<${name}${member === undefined ? '' : `.${member}`} re-bound>` });
      }
    }
  }
  for (const literal of source.matchAll(CHILD_PROCESS_LITERAL)) {
    if (!recognized.has(literal.index ?? 0)) calls.push({ line: lineOf(source, literal.index ?? 0), command: '<unrecognized child_process binding>' });
  }
  const callees = [...[...direct].map(escape), ...[...namespaces].map((name) => `${escape(name)}\\s*\\.\\s*(?:${SYNC_FUNCTIONS.join('|')})`)];
  if (callees.length === 0) return calls;
  for (const match of source.matchAll(new RegExp(`(?<![\\w.$])(?:${callees.join('|')})\\s*\\(\\s*([^,)\\n]*)`, 'g'))) {
    calls.push({ line: lineOf(source, match.index ?? 0), command: match[1]!.trim(), offset: match.index ?? 0 });
  }
  return calls.sort((a, b) => a.line - b.line);
}

/** The calls whose command is not a literal short local tool. */
function longSyncCalls(source: string): SyncCall[] {
  return syncCalls(source).filter(({ command }) => {
    const literal = /^(['"`])(.*)\1$/.exec(command);
    return literal === null || !SHORT_COMMANDS.has(literal[2]!);
  });
}

const printer = ts.createPrinter({ removeComments: true });
const fingerprintOf = (source: ts.SourceFile, node: ts.Node, hint = ts.EmitHint.Unspecified): string =>
  createHash('sha256').update(printer.printNode(hint, node, source)).digest('hex');

function exactFunction(source: ts.SourceFile, name: string, fingerprint: string): ts.FunctionDeclaration | undefined {
  return source.statements.find((statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement)
    && statement.name?.text === name && fingerprintOf(source, statement) === fingerprint);
}

function guardedSyncCalls(path: string, text: string): { calls: SyncCall[]; missing: string[] } {
  const known = NATIVE_SITES.get(path);
  if (known === undefined && path !== EMBEDDED_FIXTURE) return { calls: longSyncCalls(text), missing: [] };
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const peerCapture = path === PEER_MODULE && fingerprintOf(source, source) === PEER_SOURCE
    ? exactFunction(source, 'captureKernelUnixPeer', PEER_CAPTURE) : undefined;
  const machinePeer = path !== MACHINE_PEER_MODULE || fingerprintOf(source, source) === MACHINE_PEER_SOURCE;
  const writesFixture = path === EMBEDDED_FIXTURE && exactFunction(source, 'fake', FIXTURE_WRITER) !== undefined;
  const sites = new Map<number, string>();
  let fixture: ts.TemplateExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (known !== undefined && SYNC_FUNCTIONS.includes(node.expression.text)) {
        const start = node.getStart(source);
        const inPeerCapture = peerCapture !== undefined && start >= peerCapture.getStart(source) && node.end <= peerCapture.end;
        const fingerprint = fingerprintOf(source, node, ts.EmitHint.Expression);
        if (known.has(fingerprint) && (path !== PEER_MODULE || inPeerCapture) && machinePeer) sites.set(start, fingerprint);
      }
      const argument = node.arguments[1];
      if (writesFixture && node.expression.text === 'fake' && fixture === undefined && argument !== undefined
        && ts.isTemplateExpression(argument) && fingerprintOf(source, node, ts.EmitHint.Expression) === EMBEDDED_CALL) fixture = argument;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  let masked = text;
  if (fixture !== undefined) {
    // Mask only the text of the exact child program. Interpolations remain scanned.
    for (const part of [fixture.head, ...fixture.templateSpans.map(span => span.literal)]) {
      const start = part.getStart(source), end = part.getEnd();
      masked = masked.slice(0, start) + masked.slice(start, end).replace(/[^\n\r]/g, ' ') + masked.slice(end);
    }
  }
  const used = new Set<string>();
  const calls = longSyncCalls(masked).filter(({ offset }) => {
    const fingerprint = offset === undefined ? undefined : sites.get(offset);
    if (fingerprint === undefined || used.has(fingerprint)) return true;
    used.add(fingerprint);
    return false;
  });
  const missing = [...(known ?? [])].filter(([fingerprint]) => !used.has(fingerprint)).map(([, description]) => description);
  if (path === EMBEDDED_FIXTURE && fixture === undefined) missing.push('asynchronous synthetic grandchild fixture');
  return { calls, missing };
}

/** Every module a vitest worker loads for `tests`: the tests and their relative and workspace imports, transitively. A workspace
 * import is followed through its package's exports, as the shared resolver reads them. */
function importClosure(tests: readonly string[], read: (path: string) => string | undefined, manifests: Workspace['manifests'] = WORKSPACE.manifests): string[] {
  const workspace: Workspace = { manifests, isFile: (path) => read(path) !== undefined };
  const seen = new Set(tests);
  const pending = [...tests];
  while (pending.length > 0) {
    const path = pending.pop()!;
    for (const match of (read(path) ?? '').matchAll(MODULE_SPECIFIER)) {
      const target = resolveIn(workspace, path, match[1]!);
      if (typeof target === 'string' && !seen.has(target)) {
        seen.add(target);
        pending.push(target);
      }
    }
  }
  return [...seen].sort();
}

function trackedTypeScript(): Map<string, string> {
  const paths = execFileSync('git', ['-C', REPO_ROOT, 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '*.ts'], { encoding: 'utf8' }).split('\0').filter((path) => path !== '');
  const sources = new Map<string, string>();
  for (const path of paths) {
    try { sources.set(path, readFileSync(join(REPO_ROOT, path), 'utf8')); } catch { /* listed but deleted in the worktree */ }
  }
  return sources;
}

describe('suite child processes and the vitest worker RPC', () => {
  it('runs only short local tools synchronously in a suite test file or any module it imports', () => {
    const sources = trackedTypeScript();
    checkSuiteConfig(readFileSync(join(REPO_ROOT, VITEST_CONFIG), 'utf8'));
    const roots = suiteRoots();
    // The system tests run under their own config (packages/cap1-system/vitest.config.ts), as before this scan followed tiers.
    const tests = [...sources.keys()].filter((path) => path.endsWith('.test.ts') && !path.endsWith(SYSTEM_TEST_SUFFIX) && roots.some((root) => path.startsWith(root)));
    const modules = importClosure(tests, (path) => sources.get(path));
    // Every workspace package's tests, in every tier, are scanned.
    expect(roots.length).toBeGreaterThanOrEqual(7);
    expect(roots).toEqual(expect.arrayContaining(['packages/polaris-dossier/src/', 'packages/polaris-generation-consent/src/']));
    // The workspaces with no test file here are the only roots left unscanned: the daemon entry app, and cap1-system (system
    // tests only).
    expect(roots.filter((root) => !tests.some((path) => path.startsWith(root)))).toEqual(['packages/cap1-system/src/', 'apps/syzygy/src/']);
    expect(tests.length).toBeGreaterThan(100);
    expect(tests).toContain(SELF);
    expect(modules.length).toBeGreaterThan(tests.length + 100);
    expect(modules).toContain('apps/three-surface-poc/src/test-model-fixture.ts');
    expect(modules).toContain('packages/three-surface-poc-core/src/work-items.ts');
    expect([...NATIVE_SITES.keys()].filter(path => !modules.includes(path))).toEqual([]);
    const missing: string[] = [];
    const found = modules
      .filter((path) => path !== SELF)
      .flatMap((path) => {
        const checked = guardedSyncCalls(path, sources.get(path)!);
        missing.push(...checked.missing.map(description => `${path}: ${description}`));
        return checked.calls.map(({ line, command }) => ({ at: `${path}:${line} ${command}`, key: `${path} ${command}` }));
      });
    expect(found.filter(({ key }) => !Object.hasOwn(EXEMPT, key)).map(({ at }) => at)).toEqual([]);
    expect(missing).toEqual([]);
    expect(Object.keys(EXEMPT).filter((key) => !found.some((call) => call.key === key))).toEqual([]);
  });

  it('flags an install, a build or a computed command and leaves async and short tools alone', () => {
    const named = "import { execFileSync, execSync, spawnSync, execFile } from 'node:child_process';\n";
    const commands = (body: string): string[] => longSyncCalls(named + body).map(({ command }) => command);
    expect(commands("execFileSync('npm', ['ci'])")).toEqual(["'npm'"]);
    expect(commands('execSync("npm run build:poc")')).toEqual(['"npm run build:poc"']);
    expect(commands('spawnSync(`npx`, [])')).toEqual(['`npx`']);
    expect(commands('execFileSync(documented[0]!, args)')).toEqual(['documented[0]!']);
    expect(commands('execFileSync(git, args)')).toEqual(['git']);
    expect(commands("await run('npm', ['ci'])")).toEqual([]);
    expect(commands("execFile('npm', ['ci'])")).toEqual([]);
    expect(commands("execFileSync('git', ['rev-parse', 'HEAD'])")).toEqual([]);
    expect(commands('spawnSync("mkfifo", [path])')).toEqual([]);
    expect(commands("execSync('git status')")).toEqual(["'git status'"]);
  });

  it('refuses changed, copied or duplicated native calls and changes to the generated child fixture', () => {
    const fixture = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');
    const change = (source: string, from: string, to: string): string => {
      expect(source).toContain(from);
      return source.replace(from, to);
    };
    const commands = (path: string, source: string): string[] => guardedSyncCalls(path, source).calls.map(call => call.command);

    const fifoFile = DOSSIER + 'effective-run-record.test.ts';
    const fifo = "execFileSync('/usr/bin/mkfifo', [file])";
    expect(commands('packages/other/src/fixture.test.ts', fixture(fifoFile))).toEqual(["'/usr/bin/mkfifo'"]);
    const duplicate = change(fixture(fifoFile), fifo, `(${fifo}, ${fifo})`);
    expect(commands(fifoFile, duplicate)).toEqual(["'/usr/bin/mkfifo'"]);
    const changedFifo = change(fixture(fifoFile), fifo, "execFileSync('/usr/bin/mkfifo', [outside])");
    expect(guardedSyncCalls(fifoFile, changedFifo).missing).toEqual(['make one FIFO in the malformed record fixture']);
    expect(commands(fifoFile, changedFifo)).toEqual(["'/usr/bin/mkfifo'"]);

    const sshFile = DOSSIER + 'git-memory-ssh.test.ts';
    expect(commands(sshFile, change(fixture(sshFile), "['-t', '-f', config]", "['-D', '-f', config]"))).toEqual(["'/usr/sbin/sshd'"]);
    const peer = fixture(PEER_MODULE);
    expect(commands(PEER_MODULE, change(peer, 'timeout: 1000', 'timeout: 60_000'))).toEqual(["'/usr/bin/prlimit'"]);
    expect(commands(PEER_MODULE, change(peer, '!== program.sha256', '!== otherDigest'))).toEqual(["'/usr/bin/prlimit'"]);
    for (const [from, to] of [
      ['total > maximum', 'false'],
      ["child.stderr!.on('data', refuse);", ''],
      ['channel.ino !== afterChannel.ino', 'false'],
      ["mode === 'identity' ? 128 : 65_536 + 512", '134_217_728'],
    ]) expect(commands(PEER_MODULE, change(peer, from!, to!))).toEqual(["'/usr/bin/prlimit'"]);

    const machine = fixture(MACHINE_PEER_MODULE);
    expect(commands(MACHINE_PEER_MODULE, change(machine, 'timeout: 1000', 'timeout: 60_000'))).toEqual(["'/usr/bin/prlimit'"]);
    expect(commands(MACHINE_PEER_MODULE, change(machine, '!== expected', '!== otherDigest'))).toEqual(["'/usr/bin/prlimit'"]);
    expect(commands(MACHINE_PEER_MODULE, change(machine, 'chunkBytes: 65_536', 'chunkBytes: 65_536_000'))).toEqual(["'/usr/bin/prlimit'"]);
    for (const [module, source] of [[PEER_MODULE, peer], [MACHINE_PEER_MODULE, machine]]) {
      expect(commands(module!, change(source!, '--cpu=1:1', '--cpu=2:2'))).toEqual(["'/usr/bin/prlimit'"]);
      expect(commands(module!, change(source!, 'chargeNativeCpuMicroseconds?.(2_000_000);', ''))).toEqual(["'/usr/bin/prlimit'"]);
      expect(commands(module!, change(source!, '2_000_000', '1_000_000'))).toEqual(["'/usr/bin/prlimit'"]);
    }

    const acquisition = fixture(EMBEDDED_FIXTURE);
    for (const changed of [
      change(acquisition, '.spawnSync(process.execPath', '.spawnSync(otherExecutable'),
      change(acquisition, "'trusted-fixture-git'", "'unverified-fixture-git'"),
    ]) {
      const checked = guardedSyncCalls(EMBEDDED_FIXTURE, changed);
      expect(checked.calls.map(call => call.command)).toContain('<c re-bound>');
      expect(checked.missing).toEqual(['asynchronous synthetic grandchild fixture']);
    }
  });

  it('follows every way of binding the synchronous calls, and fails closed on a binding it does not recognize', () => {
    const commands = (source: string): string[] => longSyncCalls(source).map(({ command }) => command);
    expect(commands("import { execFileSync as run } from 'node:child_process';\nrun('npm', ['ci']);")).toEqual(["'npm'"]);
    expect(commands("import * as cp from 'child_process';\ncp.spawnSync('npm', ['ci']);")).toEqual(["'npm'"]);
    expect(commands("import cp from 'node:child_process';\ncp . execSync('npm ci');")).toEqual(["'npm ci'"]);
    expect(commands("const { execFileSync: sh } = await import('node:child_process');\nsh('npm', []);")).toEqual(["'npm'"]);
    expect(commands("const cp = require('child_process');\ncp.execFileSync('npm', []);")).toEqual(["'npm'"]);
    expect(commands("export { execFileSync } from 'node:child_process';")).toEqual(['<unrecognized child_process binding>']);
    expect(commands("vi.mock('node:child_process', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:child_process')>()) }));")).toEqual([]);
    expect(commands("const loader = () => import('node:child_process');")).toEqual(['<unrecognized child_process binding>']);
    expect(commands("import { type ExecFileSyncOptions, execFile } from 'node:child_process';\nexecFile('npm', []);")).toEqual([]);
    expect(commands("import { execFileSync as run } from 'node:child_process';\nrun('git', ['status']);\nother.run('npm');")).toEqual([]);
  });

  it('fails closed when a sync function is re-bound to a name the scan does not follow (syzygy-ty1x)', () => {
    const commands = (source: string): string[] => longSyncCalls(source).map(({ command }) => command);
    const namespace = "import * as cp from 'node:child_process';\n";
    const named = "import { execFileSync } from 'node:child_process';\n";
    expect(commands(`${namespace}const { execSync } = cp;\nexecSync('npm ci');`)).toEqual(['<cp re-bound>']);
    expect(commands(`${namespace}const run = cp.execFileSync;\nrun('npm', []);`)).toEqual(['<cp.execFileSync re-bound>']);
    expect(commands(`${named}const run = execFileSync;\nrun('npm', []);`)).toEqual(['<execFileSync re-bound>']);
    expect(commands(`${namespace}cp['execSync']('npm ci');`)).toEqual(['<cp re-bound>']);
    expect(commands("const cp = require('child_process');\nconst sh = cp.spawnSync;")).toEqual(['<cp.spawnSync re-bound>']);
    expect(commands("import { execFileSync as run } from 'node:child_process';\nexport { run };")).toEqual(['<run re-bound>']);
    // Calls, async members and other objects' same-named members stay clean.
    expect(commands(`${namespace}cp.execFileSync('git', []);\ncp.spawn('npm', []);\nconst spawn = cp.spawn;\nother.cp = 1;`)).toEqual([]);
    expect(commands(`${named}execFileSync('git', ['status']);\nactual.execFileSync(file, args);\nconst passed = actual.execFileSync;\nconst o = { execFileSyncLike: 1 };`)).toEqual([]);
  });

  it('refuses a vitest config that could load a workspace package other than by its source condition', () => {
    const project = "{ extends: true, test: { name: 'p', include: ['packages/a/src/**/*.test.ts'] } },";
    const ssr = "ssr: { resolve: { conditions: ['source', 'module', 'node', 'development|production'] } },";
    expect(() => checkSuiteConfig(`${ssr}\n${project}`)).not.toThrow();
    // A config that loads a workspace package by anything but its source condition: the scan would follow other modules.
    expect(() => checkSuiteConfig(project)).toThrow(/source condition alone/);
    expect(() => checkSuiteConfig(`ssr: { resolve: { conditions: ['module', 'source'] } },\n${project}`)).toThrow(/source condition alone/);
    expect(() => checkSuiteConfig(`resolve: { alias: { '@syzygy/a': path.join(root, 'a') } },\n${ssr}\n${project}`)).toThrow(/source condition alone/);
    // A plugin, in a project entry or at the root, its name single- or double-quoted, under a bare or a quoted key (syzygy-bpyt.65).
    const plugin = (name: string): string => `plugins: [{ name: ${name}, resolveId: (id: string) => (id === '@syzygy/a' ? 'a/dist/index.js' : null) }],`;
    for (const config of [
      `${ssr}\n{ extends: true, ${plugin("'p'")} test: { name: 'p', include: ['packages/a/src/**/*.test.ts'] } },`,
      `${ssr}\n{ extends: true, ${plugin('"p"')} test: { name: 'p', include: ['packages/a/src/**/*.test.ts'] } },`,
      `${plugin('"p"')}\n${ssr}\n${project}`,
      `'plugins': [],\n${ssr}\n${project}`,
    ]) expect(() => checkSuiteConfig(config), config).toThrow(/a plugin may load a workspace package by other than its source condition/);
  });

  it('loads the vitest config and finds no alias key at any depth and no project entry detached from the root config', async () => {
    const config: unknown = (await import(pathToFileURL(join(REPO_ROOT, VITEST_CONFIG)).href)).default;
    const paths = keyPaths(config).map((path) => path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['ssr.resolve.conditions', 'test.setupFiles']));
    expect(paths.some((path) => /^test\.projects\.\d+\.test\.globalSetup$/u.test(path))).toBe(true);
    expect(aliasKeys(config)).toEqual([]);
    // Joined, so that a failure names each entry: vitest abbreviates a longer array in its message.
    expect(detachedProjects(config).join('; ')).toBe('');
  });

  it('runs the hermetic unit tier under the refusal setup and no other tier under it (syzygy-bpyt.4.3)', async () => {
    const config = (await import(pathToFileURL(join(REPO_ROOT, VITEST_CONFIG)).href)).default as {
      readonly test: { readonly projects: readonly { readonly test: { readonly name: string; readonly setupFiles?: readonly string[] } }[] };
    };
    expect(config.test.projects.map((project) => project.test.name)).toEqual([...TIERS]);
    const guarded = config.test.projects.filter((project) => (project.test.setupFiles ?? []).some((file) => file.endsWith('/vitest.unit-guard.setup.ts')));
    expect(guarded.map((project) => project.test.name)).toEqual(['unit']);
  });

  it('reads an alias key wherever the config holds one, and no other key', () => {
    const alias = { '@syzygy/a': '/a/src/index.ts' };
    expect(aliasKeys({ resolve: { alias } })).toEqual(['resolve.alias']);
    expect(aliasKeys({ test: { projects: [{ test: {} }, { resolve: { alias: [] } }] } })).toEqual(['test.projects.1.resolve.alias']);
    expect(aliasKeys({ alias: {}, ssr: { resolve: { alias: undefined } } })).toEqual(['alias', 'ssr.resolve.alias']);
    expect(aliasKeys({ resolve: { aliases: {}, myalias: {}, conditions: ['alias'] }, alias_: 1, 'x.alias': 2 })).toEqual([]);
  });

  it('reads every project entry that does not inherit the root config through extends: true', () => {
    const test = { name: 'p', include: ['packages/a/src/**/*.test.ts'] };
    expect(detachedProjects({ test: { projects: [{ extends: true, test }, { extends: true, test }] } })).toEqual([]);
    expect(detachedProjects({ test: { projects: [
      { extends: './vitest.other.config.ts', test }, { extends: false, test }, { extends: 'true', test }, { test },
      'packages/a/vitest.config.ts', () => ({ test }), Promise.resolve({ test }), null, [{ extends: true, test }],
    ] } })).toEqual([
      'test.projects.0.extends is not true', 'test.projects.1.extends is not true', 'test.projects.2.extends is not true',
      'test.projects.3.extends is not true', 'test.projects.4 is not an object', 'test.projects.5 is not an object',
      'test.projects.6.extends is not true', 'test.projects.7 is not an object', 'test.projects.8 is not an object',
    ]);
    for (const config of [{}, { test: {} }, { test: { projects: { 0: { extends: true, test } } } }, undefined]) {
      expect(detachedProjects(config), JSON.stringify(config)).toEqual(['test.projects is not an array']);
    }
  });

  it('scans a helper module a test imports, through relative and workspace imports', () => {
    const files: Record<string, string> = {
      'apps/x/src/a.test.ts': "import { helper } from './helpers/build.js';\nimport { core } from '@syzygy/three-surface-poc-core';",
      'apps/x/src/helpers/build.ts': "import { execFileSync as sh } from 'node:child_process';\nexport const helper = () => sh('npm', ['run', 'build']);",
      'packages/three-surface-poc-core/src/index.ts': "export * from './deep.js';",
      'packages/three-surface-poc-core/src/deep.ts': "import * as cp from 'node:child_process';\nexport const core = () => cp.execSync('npm ci');",
      'apps/x/src/unused.ts': "import { execFileSync } from 'node:child_process';\nexecFileSync('npm', []);",
    };
    const modules = importClosure(['apps/x/src/a.test.ts'], (path) => files[path]);
    expect(modules).toEqual(['apps/x/src/a.test.ts', 'apps/x/src/helpers/build.ts', 'packages/three-surface-poc-core/src/deep.ts', 'packages/three-surface-poc-core/src/index.ts']);
    expect(modules.flatMap((path) => longSyncCalls(files[path]!).map(({ line, command }) => `${path}:${line} ${command}`))).toEqual([
      "apps/x/src/helpers/build.ts:2 'npm'",
      "packages/three-surface-poc-core/src/deep.ts:2 'npm ci'",
    ]);
  });
});

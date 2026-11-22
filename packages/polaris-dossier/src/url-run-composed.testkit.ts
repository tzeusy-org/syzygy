import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { sha256 } from '@syzygy/support';
import { DOSSIER_USAGE, runDossierCli, type CliPorts } from './cli.js';
import { fixtureSources, makeClone } from './full-run.testkit.js';
import { initRun } from './init.js';
import { issueBrief } from './brief.js';
import { startSessions } from './session-handover.js';
import { writeLaunchedMarker } from './launched.js';
import { readRunRecord } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { DOSSIER_POLICY_PATH, readCommittedPolicy, readCommittedUrlOriginPolicy, type PolicyBinding } from './policy-snapshot.js';
import { bindUrlSourceReader } from './url-source-reader.js';
import { prepareUrlRolePlans } from './url-role-plan.js';
import { createUrlRunOrigins } from './url-run-origins.js';
import { createUrlRunDeclaration, URL_ORIGIN_POLICY_PATH, URL_PROFILE_ID, urlSourceTransportIdentity } from './url-run-record.js';
import { readUrlRuntime, loadUrlDossierRenderer, type UrlRuntime } from './url-runtime.js';
import { URL_CLI_PROGRAM } from './session-launch.js';
import { createUrlRunArtifacts } from './url-run-artifacts.js';
import { effectiveUrlProjection } from './effective-run-record.js';
import { beginRunProductReads } from './url-operation-products.js';
import { reviewCheck } from './review.js';
import { readUrlParentAdoption, URL_PARENT_DEFAULT_REF, URL_PARENT_RECORD, URL_PARENT_TAG } from './url-parent-adoption.js';
import { packageUrlRunModeAuthority, registerUrlRunMode } from './url-mode-registry.js';

/** The production cold verifier reads actual observing Git objects and refs.
 * This owned repository installs the same reviewed bytes through a real merge,
 * version tag and later adoption row; no parent-adoption gate is mocked. */
export async function createComposedObserver(directory: string) {
  const observer = path.join(directory, 'observing');
  await fs.mkdir(observer, { mode: 0o700 });
  const git = async (...args: string[]) => (await exec('git', ['-C', observer, '-c', 'user.name=Owned Fixture',
    '-c', 'user.email=owned@example.invalid', ...args], { env: { PATH: '/usr/bin:/bin', LANG: 'C',
      GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_NO_LAZY_FETCH: '1' }, timeout: 10_000, maxBuffer: 65_536 })).stdout.trim();
  const copy = async (file: string) => { const target = path.join(observer, file); await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(root, file), target); };
  const base = 'openspec/changes/dossier-url-declared-source-run/proposed';
  const subjects = [`${base}/polaris-generation/spec.md`, `${base}/contracts/DOSSIER-URL-LOCAL-MACHINE-CREDENTIAL-AMENDMENT.md`,
    URL_ORIGIN_POLICY_PATH, '.syzygy/governance/decisions/DOSSIER-URL-RUN-CONTRACT-APPLICABILITY.md'];
  const header = '# Agent adoptions\n\n| Id | Date | Commit | What changed | Why | Revert | Tag |\n|---|---|---|---|---|---|---|\n';
  await git('init', '-q', '--initial-branch=main', '--template=');
  await copy(DOSSIER_POLICY_PATH);
  await copy('.syzygy/governance/doctrine/security.md');
  await fs.mkdir(path.dirname(path.join(observer, URL_PARENT_RECORD)), { recursive: true });
  await fs.writeFile(path.join(observer, URL_PARENT_RECORD), header);
  await git('add', '.'); await git('commit', '-qm', 'Owned observing predecessor');
  await git('switch', '-qc', 'reviewed-package');
  for (const file of [...subjects, '.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md',
    '.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md',
    '.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md']) await copy(file);
  await git('add', '.'); await git('commit', '-qm', 'Owned reviewed package');
  await git('switch', '-q', 'main'); await git('merge', '-q', '--no-ff', '-m', 'Owned package landing', 'reviewed-package');
  const landed = await git('rev-parse', 'HEAD');
  await git('tag', '-am', 'Owned reviewed version', URL_PARENT_TAG, landed);
  const links = subjects.map(file => `[subject](https://github.com/tzeusy-org/syzygy/blob/${landed}/${file})`).join(' · ');
  await fs.writeFile(path.join(observer, URL_PARENT_RECORD), `${header}| A-14 | 2026-11-22 | \`${landed}\` | ${links} | Owned fixture adoption | \`git revert -m 1 ${landed}\` | \`${URL_PARENT_TAG}\` |\n`);
  await git('add', '.'); await git('commit', '-qm', 'Record owned fixture adoption');
  await git('update-ref', URL_PARENT_DEFAULT_REF, 'HEAD');
  const policy = own(readCommittedPolicy(observer), 'committed base policy');
  const origin = own(readCommittedUrlOriginPolicy(observer), 'committed origin policy');
  const parent = readUrlParentAdoption(observer, origin.binding.sha256);
  if (parent === null) throw new Error('owned observing adoption refused');
  return { root: observer, policy, origin, parent };
}

const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const exec = promisify(execFile);
const own = <T extends { readonly ok: boolean }>(result: T, operation: string): Extract<T, { readonly ok: true }> => {
  if (!result.ok) throw new Error(`owned composed ${operation}: ${JSON.stringify(result)}`);
  return result as Extract<T, { readonly ok: true }>;
};

/** The public composed fixture requires the runtime at its CLI checkout. */
export async function buildComposedRuntime(): Promise<UrlRuntime> {
  await fs.rm(path.join(root, 'packages/polaris-dossier/dist/runtime'), { recursive: true, force: true });
  return buildRuntime(root);
}

/** Build from the current source bytes in the renderer test's own directory.
 * Keep npm's relative workspace links pointed at the copied sources. */
export async function buildIsolatedComposedRuntime(checkout: string): Promise<UrlRuntime> {
  const entries = ['apps', 'packages', 'scripts', 'node_modules', 'package.json', 'package-lock.json',
    'tsconfig.json', 'tsconfig.base.json'];
  for (const entry of entries) {
    await fs.cp(path.join(root, entry), path.join(checkout, entry), {
      recursive: true,
      verbatimSymlinks: true,
      filter: source => {
        const relative = path.relative(root, source).split(path.sep).join('/');
        return !/^(?:apps|packages)\/[^/]+\/(?:dist|node_modules)$/u.test(relative)
          && !/^node_modules\/\.vite(?:-temp)?$/u.test(relative);
      },
    });
  }
  return buildRuntime(checkout);
}

async function buildRuntime(checkout: string): Promise<UrlRuntime> {
  await exec(process.execPath, ['scripts/build_dossier_runtime.mjs'], {
    cwd: checkout, env: { PATH: '/usr/bin:/bin', LANG: 'C' }, timeout: 60_000, maxBuffer: 65_536,
  });
  return own(await readUrlRuntime(checkout), 'runtime').runtime;
}

/** Actual initial producers and genuine role/origin capabilities. Provider
 * responses, not these producers, are the composed fixture's synthetic seam. */
export async function prepareComposedRun(runtime: UrlRuntime, recovery?: { readonly hostRoot: string }) {
  const directory = await fs.mkdtemp(path.join(os.homedir(), '.tmp/url-composed-'));
  await fs.chmod(directory, 0o700);
  const observer = recovery === undefined ? null : await createComposedObserver(directory);
  const { clone, commit } = makeClone(directory), state = path.join(directory, 'runs');
  await fs.mkdir(state, { mode: 0o700 });
  let live = true;
  const current = () => live;
  const binding = async (name: string) => {
    if (observer !== null) { const snapshot = name === DOSSIER_POLICY_PATH ? observer.policy : observer.origin;
      return { bytes: snapshot.bytes, binding: snapshot.binding }; }
    const bytes = await fs.readFile(path.join(root, name)), document = JSON.parse(bytes.toString()) as { policyId: string; policyVersion: string };
    return { bytes, binding: { path: name, commit: 'a'.repeat(40), policyId: document.policyId,
      policyVersion: document.policyVersion, sha256: sha256(bytes) } satisfies PolicyBinding };
  };
  const policy = await binding(DOSSIER_POLICY_PATH), origin = await binding(URL_ORIGIN_POLICY_PATH);
  const actualScreen = own(buildDossierScreen(policy.bytes, true, null, 'private'), 'screen').screen;
  const screen = actualScreen;
  const sources = { ...fixtureSources(commit), ...(observer === null ? {} : { recordsRoot: observer.root }), declaredPolicy: async () => ({ ok: true as const, ...policy }) };
  const openReader = bindUrlSourceReader({ clone, revision: commit, store: 'owned-loose', current });
  const initialized = own(await initRun({ clone, revision: commit, url: 'https://example.invalid/own/source', stateRoot: state,
    configText: JSON.stringify({ operator: 'owned-composed', agentTool: 'claude-code', agentToolVersion: URL_CLI_PROGRAM.version,
      agentProvider: 'anthropic', model: 'claude-sonnet-4-6', deadline: 'PT2H', agentTurnBudget: 100,
      maxRepairCycles: 3, maxQuestions: 1, audience: 'owned readers', operatorIsOwner: false }),
  }, { sources, openReader, now: Date.now }), 'init');
  const record = own(readRunRecord(initialized.initializedRecordText), 'record').record;
  const { run, runId } = initialized.report;
  for (const directory of ['drafts', 'inventory', 'reviews', 'checks']) await fs.mkdir(path.join(run, directory), { recursive: true, mode: 0o700 });
  const directories = { author: run, inventory: `${run}.sessions/session-1`, fidelity: `${run}.sessions/fidelity-1`, design: `${run}.sessions/design-1` };
  const views = path.join(directory, 'views');
  if (recovery !== undefined) await fs.mkdir(path.join(recovery.hostRoot, 'acquisitions'), { recursive: true, mode: 0o700 });
  const hidden = recovery === undefined ? path.join(directory, 'protected') : await fs.mkdtemp(path.join(recovery.hostRoot, 'acquisitions/attempt-'));
  await fs.mkdir(views, { mode: 0o700 }); await fs.mkdir(hidden, { recursive: true, mode: 0o700 });
  if (recovery !== undefined && ((await fs.stat(hidden)).mode & 0o7777) !== 0o700)
    throw new Error('owned recovery audit parent mode is not 0700');
  const canaryDirectory = recovery === undefined ? hidden : path.join(hidden, 'canaries');
  await fs.mkdir(canaryDirectory, { recursive: true, mode: 0o700 });
  const canaries = ['source', 'authentication', 'audit'].map(name => path.join(canaryDirectory, name));
  for (const file of canaries) await fs.writeFile(file, 'OWN SYNTHETIC CANARY\n', { mode: 0o600 });
  const plans = own(await prepareUrlRolePlans({ run, record, screen, sessionDirectories: directories, runtime,
    cliExecutable: await fs.realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)), parent: views,
    // Production protects the host root, which contains both the first audit
    // and the fresh sibling audit created by public resume.
    protectedPaths: [run, `${run}.sessions`, clone, recovery?.hostRoot ?? hidden], canaries, current, now: Date.now(),
    audit: () => { throw new Error('owned preparation must not launch a CLI'); },
  }), 'roles');
  const renderer = await loadUrlDossierRenderer(runtime);
  if (renderer === null) throw new Error('owned composed renderer unavailable');
  const origins = await createUrlRunOrigins({ runId, record, screen, basePolicyBytes: policy.bytes,
    originPolicy: origin, current, roles: plans.roles, renderer });
  const transport = own(urlSourceTransportIdentity('https://example.invalid/own/source'), 'transport');
  const H = sha256('owned frozen source selection');
  const sourceTransport = { originalLocator: transport.originalLocator, destination: transport.destination, providerId: transport.providerId,
    acquisitionId: 'acq-0123456789abcdef0123456789abcdef', metadataClasses: ['code-structure'] as const,
    selectionOrigin: 'validated-destination-before-acquisition' as const, commandSha256: H, protocolSha256: H,
    configurationSha256: H, executableSha256: H, environmentSha256: H };
  const context = { runId, expectedBasePolicy: policy.binding, expectedOriginPolicy: origin.binding, expectedSourceTransport: sourceTransport,
    expectedProfileSha256: runtime.profileRegistrySha256 };
  const declared = own(createUrlRunDeclaration(initialized.initializedRecordText, { runId, originPolicy: origin.binding, sourceTransport,
    inference: { provider: 'anthropic', tool: 'claude-code', toolVersion: URL_CLI_PROGRAM.version, model: 'claude-sonnet-4-6',
      modelSelection: 'supported-default', profile: { id: URL_PROFILE_ID, sha256: runtime.profileRegistrySha256 } },
    roles: plans.roles.map(plan => plan.declaration), plannedOrigins: origins.plannedOrigins, protectedAudit: `url-audit:${runId}`,
  }, context), 'declaration');
  const effectiveDeclaration = { declaration: declared.declaration, bytes: Buffer.from(declared.text),
    context: { ...context, expectedSidecarSha256: declared.sha256 } };
  if (recovery !== undefined && !registerUrlRunMode({ root: recovery.hostRoot, run, context: effectiveDeclaration.context }))
    throw new Error('owned protected mode registration refused');
  const createMetadataScreen = () => (value: string) => screen.screenSecrets(value) === undefined;
  const urlSources = { ...sources, effectiveRunDeclaration: recovery !== undefined && observer !== null
    ? packageUrlRunModeAuthority(observer.root, recovery.hostRoot)
    : () => ({ kind: 'url' as const, context: effectiveDeclaration.context, createMetadataScreen }) };
  await fs.writeFile(path.join(run, 'url-declaration.json'), declared.text, { mode: 0o600, flag: 'wx' });
  writeLaunchedMarker(run, runId, Date.now());
  const loadScreen = async () => ({ ok: true as const, screen });
  const brief = own(await issueBrief(run, { sources: urlSources, openReader, now: Date.now, loadScreen }), 'brief');
  const sessions = own(await startSessions(run, {}, { sources: urlSources, openReader, now: Date.now, loadScreen, waitModeSigned: () => true }, plans.roles), 'sessions');
  const deadline = Date.parse(brief.report.deadlineEndsAt);
  const ports: CliPorts = { sources: urlSources, openReader, now: Date.now, loadScreen, renderer: renderer.renderer, urlRenderer: renderer, waitModeSigned: () => true };
  const producerReports: unknown[] = [];
  const productReadReports: unknown[] = [];
  const actualArtifacts = createUrlRunArtifacts({ run, record, origins, roles: plans.roles, current, screen, helpText: DOSSIER_USAGE,
    statusProjection: effectiveUrlProjection(record, declared.declaration), initializedCoreBytes: Buffer.from(initialized.initializedRecordText), effectiveDeclaration,
    runDossier: role => async (argv, stdin, review, awaitProductRead) => {
      const operation = argv[1] === 'check' ? 'author-check' : argv[1] === 'await' ? role === 'inventory' ? 'inventory-check' : 'review-check' : undefined;
      const products = operation === undefined ? undefined : beginRunProductReads(run, artifacts, operation, deadline, awaitProductRead);
      try {
        if (review !== undefined) {
          if (role !== 'design' || !products || !stdin) throw new Error('owned composed unexpected review');
          const result = own(await reviewCheck(run, { kind: 'design' }, { sources: urlSources, now: Date.now, openReader, productReads: products },
            { bytes: stdin, proof: review }), 'design check');
          const passed = result.report.outcome === 'validated';
          return { stdout: JSON.stringify({ command: 'await', format: 'polaris-dossier-await/1', outcome: 'submitted', role: 'review', kind: 'design',
            session: 1, passed, check: result.report, next: 'Wait for the next design round or run termination.', disclosures: [] }), stderr: '', exit: passed ? 0 : 1 };
        }
        let stdout = '', stderr = '';
        const exit = await runDossierCli(argv.slice(1), { stdout: value => { stdout += value; }, stderr: value => { stderr += value; } },
          { ...ports, ...(products === undefined ? {} : { productReads: products }), readStdin: async () => stdin });
        let metadata: Record<string, unknown> = {};
        try { const doc = JSON.parse(stdout) as Record<string, unknown>; metadata = { keys: Object.keys(doc), command: doc.command, outcome: doc.outcome, stage: doc.stage }; }
        catch { metadata = { json: false }; }
        producerReports.push({ role, operation: argv[1], exit, stderrEmpty: stderr === '', ...metadata });
        if (producerReports.length > 20) producerReports.shift();
        return { stdout, stderr, exit };
      } finally { products?.close(); }
    },
  });
  const artifacts: ReturnType<typeof createUrlRunArtifacts> = { ...actualArtifacts,
    readProduct: (...args) => {
      try { const result = actualArtifacts.readProduct(...args); productReadReports.push({ paths: [args[1]], kind: result.kind }); return result; }
      catch (error) { productReadReports.push({ paths: [args[1]], failure: error instanceof Error ? error.message : 'Unknown' }); throw error; }
    },
    readProducts: (...args) => {
      try { const result = actualArtifacts.readProducts(...args); productReadReports.push({ paths: args[1], kinds: result.map(value => value.kind) }); return result; }
      catch (error) { productReadReports.push({ paths: args[1], failure: error instanceof Error ? error.message : 'Unknown' }); throw error; }
    },
  };
  artifacts.registerInitial({ brief: brief.report, sessions: sessions.report });
  return { root: directory, observer, machine: observer === null ? null : { governanceRoot: path.join(observer.root, '.syzygy'),
    protectedRoot: path.join(hidden, 'machine-lifecycle'), parent: observer.parent }, run, runId, commit, record, screen, policy, origin, runtime, renderer, plans: plans.roles, origins,
    artifacts, directories, canaries, hidden, deadline, current, effectiveDeclaration, sources: urlSources, ports, openReader, brief: brief.report, sessions: sessions.report,
    declaration: declared.declaration, producerReports: () => producerReports, productReadReports: () => productReadReports.slice(-16),
    close: async () => { live = false; if (recovery !== undefined) await fs.rm(hidden, { recursive: true, force: true }); await fs.rm(directory, { recursive: true, force: true }); await fs.rm(plans.socketRoot, { recursive: true, force: true }); },
  };
}

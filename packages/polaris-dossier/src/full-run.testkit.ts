import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDossierCli, type CliPorts } from './cli.js';
import type { DossierRenderer } from './render.js';
import { NO_PROVIDER_STATEMENTS, type GateSources } from './gate-sources.js';
import { buildDossierScreen } from './screen.js';

/** One full operator-agent run over a fixture repository, through the `syzygy dossier` command family as the CLI exposes it: preflight,
 * init, brief, check, the inventory session, the fidelity review, render, the rendered-design review, render again, close and status.
 * The gate records are fixtures injected through the CLI's ports; everything else is the commands' own code. The no-egress proof runs it
 * in a child process under an operating-system capture (`no-egress.test.ts`, through `test-support/no-egress-driver.ts`); the close
 * tests run it in-process. The renderer is passed in: it lives in apps/three-surface-poc, outside this package. Test support only. */

/** The Syzygy checkout; a bundled copy of this module, which no longer sits in the checkout, is told it by `FULL_RUN_ROOT_ENV`. */
export const FULL_RUN_ROOT_ENV = 'SYZYGY_FULL_RUN_ROOT';
export const REAL_ROOT = process.env[FULL_RUN_ROOT_ENV] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const FIXTURE_URL = 'https://github.com/redis/redis';
/** No automatic gc or maintenance in any fixture repository: a detached `git maintenance run --auto` after a commit or fetch can
 * still be writing when the fixture is removed (syzygy-y733). Set through the environment, never the repository's config, which
 * init's clone check admits only as `git init` writes it. */
export const NO_MAINTENANCE = { GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'gc.auto', GIT_CONFIG_VALUE_0: '0', GIT_CONFIG_KEY_1: 'maintenance.auto', GIT_CONFIG_VALUE_1: 'false' };
export const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', ...NO_MAINTENANCE, GIT_AUTHOR_DATE: '2026-10-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-10-01T00:00:00Z' };
export const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
export const LATER = NOW + 60_000;
/** A credential-shaped string the fixture's own agent writes into its draft's reported commands; a sweep must not find it stored. */
export const PLANTED_SECRET = 'ghp_0123456789abcdefghijklmnopqrstuvwxyzAB';

const KESTREL = [
  '/* Kestrel keeps every key in memory.',
  ' * Each command **runs to completion** before',
  ' * the next one starts. */',
  'int main(void) { return 0; }',
  '',
].join('\n');
const FILES: Record<string, string> = { 'src/kestrel.c': KESTREL, 'docs/notes.txt': 'Snapshots are written periodically.\n', 'README.md': '# Kestrel\n' };

/** `git init -q [...args] <dir>` from a fresh, empty template directory the helper owns, removed after the init whether it succeeds or
 * fails. Without `--template`, git copies its default or ambient template (`GIT_TEMPLATE_DIR`, `init.templateDir`, the host's share
 * directory) into `.git`, and a concurrent host git upgrade leaves `description.dpkg-new` and `description.dpkg-tmp` there, which the
 * strict clone-shape guard rightly refuses (syzygy-157b). The explicit option overrides every ambient source without touching it. */
export function gitInitFromEmptyTemplate(dir: string, args: readonly string[]): void {
  const parent = path.dirname(dir);
  fs.mkdirSync(parent, { recursive: true });
  const template = fs.mkdtempSync(path.join(parent, '.git-empty-template-'));
  try {
    execFileSync('git', ['init', '-q', `--template=${template}`, ...args, dir], { env: GIT_ENV });
  } finally {
    fs.rmSync(template, { recursive: true, force: true });
  }
}

/** A clone made as the consent states and preflight prints: `commit` fetched alone, shallow, into a new empty repository at `clone`,
 * HEAD detached at it. `origin` must allow fetching any commit by identifier (set here). */
export function consentedClone(origin: string, commit: string, clone: string): string {
  execFileSync('git', ['-C', origin, 'config', 'uploadpack.allowAnySHA1InWant', 'true'], { env: GIT_ENV });
  gitInitFromEmptyTemplate(clone, []);
  execFileSync('git', ['-C', clone, 'fetch', '-q', '--depth=1', `file://${origin}`, commit], { env: GIT_ENV });
  execFileSync('git', ['-C', clone, 'checkout', '-q', '--detach', 'FETCH_HEAD'], { env: GIT_ENV });
  return clone;
}

/** A committed fixture repository and a clone of it, both under `dir`. */
export function makeClone(dir: string): { readonly clone: string; readonly commit: string } {
  const origin = path.join(dir, 'origin');
  fs.mkdirSync(origin, { recursive: true });
  const git = (...args: string[]): string => execFileSync('git', ['-C', origin, ...args], { encoding: 'utf8', env: GIT_ENV }).trim();
  gitInitFromEmptyTemplate(origin, ['-b', 'main']);
  for (const [file, body] of Object.entries(FILES)) {
    fs.mkdirSync(path.dirname(path.join(origin, file)), { recursive: true });
    fs.writeFileSync(path.join(origin, file), body);
  }
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'fixture');
  const commit = git('rev-parse', 'HEAD');
  return { clone: consentedClone(origin, commit, path.join(dir, 'kestrel')), commit };
}

const LIVE_POLICY = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'));
export const FIXTURE_SCREEN = buildDossierScreen(new TextEncoder().encode(JSON.stringify({
  policyId: 'fixture-public-source', policyVersion: '1', detectors: LIVE_POLICY.detectors, sourceAdmission: LIVE_POLICY.sourceAdmission,
  publicSourceScope: { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.c', '.txt'] }] } },
})));

export function fixtureSources(commit: string): GateSources {
  const ok = { state: 'ok', record: 'FIXTURE-ACT' } as const;
  return {
    recordsRoot: REAL_ROOT,
    repositoryIdsFor: async () => ['redis-redis'],
    consentedRevisionsFor: async () => [{ label: 'fixture', commitId: commit }],
    observationConsentFor: async (_id, revision) => (revision === commit ? { satisfied: true, record: 'PUBLIC-OBS-FIXTURE@1' } : { satisfied: false, why: 'the consent does not name it' }),
    registryEntry: async () => ok,
    screeningPolicy: async () => ok,
    d9: async () => ok,
    rfc720Ruling: async () => ({ state: 'ok', record: 'RFC7-20-RULING-FIXTURE' }),
    projectInput: { drawerFor: async () => ({ stated: true, drawer: 'absent', record: 'PROJECT-INPUT-FIXTURE@1' }) },
    providerStatements: NO_PROVIDER_STATEMENTS,
  };
}

export type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const cite = (id: string, file = 'src/kestrel.c', startLine = 1, endLine = 3) => ({ id, path: file, startLine, endLine });
const UNDERSTANDING = ['purpose', 'beneficiary', 'proposition', 'capabilities', 'components', 'choices', 'tradeOffs', 'limits', 'terminology', 'contradictions', 'openQuestions'];
export const draft = (commit: string, plantSecret = false): Doc => ({
  schemaVersion: 'polaris-dossier-local-draft-v2',
  pinnedRevision: commit,
  sessionId: 'authoring-session-1',
  title: 'Kestrel',
  introduction: { id: 'intro', label: 'inferred', basis: 'source', text: 'The project states: "Kestrel keeps every key in memory."', citations: [cite('c-intro', 'src/kestrel.c', 1, 1)], quotations: ['c-intro'] },
  understanding: Object.fromEntries(UNDERSTANDING.map((key) => [key, [{ id: `u-${key}`, label: 'inferred', statement: `Understanding of ${key}.`, scope: 'The server.', citations: [cite(`u-${key}-c`)] }]])),
  sections: [{
    id: 'core-ideas', title: 'Core ideas',
    paragraphs: [
      { id: 'p1', label: 'inferred', basis: 'source', text: 'The project states: "Each command runs to completion before the next one starts."', citations: [cite('c-p1', 'src/kestrel.c', 2, 3)], quotations: ['c-p1'], children: [] },
      { id: 'p2', label: 'inferred', basis: 'source', text: 'The project states: "Snapshots are written periodically."', citations: [cite('c-p2', 'docs/notes.txt', 1, 1)], quotations: ['c-p2'], children: [] },
    ],
    disposition: { kind: 'produced', assetIds: ['core-ideas'] },
  }],
  diagrams: [],
  deepDives: [],
  unresolved: [],
  discovery: { inspected: ['src/kestrel.c', 'README.md'], selected: [], excluded: [], unresolved: [], deferred: [], stoppingReason: 'Read the server first.' },
  clarifications: [],
  executions: [
    { id: 'x-1', command: 'git log --oneline -1', workingDirectory: 'the clone', purpose: 'Find the pinned commit.' },
    ...(plantSecret ? [{ id: 'x-2', command: `curl -H 'Authorization: token ${PLANTED_SECRET}' https://api.github.com/user`, workingDirectory: 'the clone', purpose: 'A command whose text carries a token.' },
      { id: 'x-3', command: 'ls', workingDirectory: `/tmp/${PLANTED_SECRET}`, purpose: 'A command whose working directory carries a token.' }] : []),
  ],
});
export const inventory = (commit: string): Doc => ({
  schemaVersion: 'polaris-dossier-local-inventory-v1',
  pinnedRevision: commit,
  sessionId: 'inventory-1',
  entries: [
    { id: 'e-purpose', kind: 'purpose', label: 'inferred', statement: 'The project states: "Kestrel keeps every key in memory."', citations: [cite('c-e-purpose', 'src/kestrel.c', 1, 1)], quotations: ['c-e-purpose'] },
    { id: 'e-snap', kind: 'capability', label: 'inferred', statement: 'It writes snapshots.', citations: [cite('c-e-snap', 'docs/notes.txt', 1, 1)], quotations: [] },
  ],
  coverage: { inspected: ['src/kestrel.c', 'docs/notes.txt'], excluded: [], deferred: [], stoppingReason: 'Read every file.' },
});
export const fidelityVerdict = (commit: string, packetSha256: string, spans: readonly { id: string; path: string; startLine: number }[]): Doc => {
  const kestrel = spans.filter((span) => span.path === 'src/kestrel.c' && span.startLine === 1).slice(0, 1).map((span) => span.id);
  const notes = spans.filter((span) => span.path === 'docs/notes.txt').map((span) => span.id);
  return {
    schemaVersion: 'polaris-dossier-local-fidelity-verdict-v1',
    pinnedRevision: commit,
    packetSha256,
    sessionId: 'reviewer-1',
    inventoryCoverage: [
      { entryId: 'e-purpose', disposition: 'represented', blockIds: ['intro'], reason: 'The introduction says it.', quotations: [] },
      { entryId: 'e-snap', disposition: 'represented', blockIds: ['p2'], reason: 'p2 says it.', quotations: [] },
    ],
    inventoryAccuracy: [
      { entryId: 'e-purpose', accuracy: 'accurate', spanIds: kestrel, reason: 'The span says it.', quotations: [] },
      { entryId: 'e-snap', accuracy: 'accurate', spanIds: notes, reason: 'The span says it.', quotations: [] },
    ],
    blockSupport: [
      { blockId: 'intro', verdict: 'supported', spanIds: kestrel, reason: 'The span says it.', quotations: [] },
      { blockId: 'p1', verdict: 'supported', spanIds: spans.filter((span) => span.path === 'src/kestrel.c' && span.startLine === 2).map((span) => span.id), reason: 'The span says it.', quotations: [] },
      { blockId: 'p2', verdict: 'supported', spanIds: notes, reason: 'The span says it.', quotations: [] },
    ],
    findings: [],
    readiness: 'ready',
  };
};
export const designVerdict = (commit: string, packetSha256: string, pages: readonly string[]): Doc => ({
  schemaVersion: 'polaris-dossier-local-design-verdict-v1',
  pinnedRevision: commit,
  packetSha256,
  sessionId: 'design-reviewer-1',
  pageReview: pages.map((page) => ({ page, verdict: 'acceptable', reason: 'Legible, labelled and navigable.' })),
  findings: [],
  readiness: 'ready',
});

export interface FullRunOptions {
  readonly clone: string;
  readonly commit: string;
  /** Where init makes the run directory; the configuration file is written beside it. */
  readonly stateRoot: string;
  /** The close arguments after the run directory, e.g. `['--usage-tokens', '1200']`; none declares no usage. */
  readonly closeArgs?: readonly string[];
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** The multi-page dossier renderer of apps/three-surface-poc. */
  readonly renderer: DossierRenderer;
  /** The draft reports a command whose text carries a credential-shaped token (`PLANTED_SECRET`). */
  readonly plantSecret?: boolean;
  /** The brief record names the permitting arm, as a permitting brief would (the arm itself is off in production); every later step
   * then runs the credential check, so `env` must name a credential list. */
  readonly permitted?: boolean;
  /** The draft's `executions` in place of the fixture's, given the clone's path. */
  readonly executions?: (clone: string) => readonly Doc[];
}

export interface FullRunStep { readonly argv: readonly string[]; readonly exit: number; readonly stdout: string; readonly stderr: string }

/** Run every step; throws, naming the step, on any exit the flow does not expect. */
export async function fullFixtureRun(options: FullRunOptions): Promise<{ readonly run: string; readonly steps: readonly FullRunStep[] }> {
  const { clone, commit, stateRoot } = options;
  let clock = NOW;
  const ports: CliPorts = {
    env: options.env ?? {}, now: () => clock, sources: fixtureSources(commit), loadScreen: async () => FIXTURE_SCREEN, renderer: options.renderer,
  };
  const steps: FullRunStep[] = [];
  const cli = async (argv: readonly string[], expected = 0): Promise<Doc> => {
    let stdout = '', stderr = '';
    const exit = await runDossierCli([...argv, '--json'], { stdout: (t) => { stdout += t; }, stderr: (t) => { stderr += t; } }, ports);
    steps.push({ argv, exit, stdout, stderr });
    if (exit !== expected) throw new Error(`fixture step ${argv.join(' ')} exited ${exit}: ${stderr || stdout}`);
    return JSON.parse(stdout) as Doc;
  };
  const write = (file: string, doc: Doc): void => fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  const pagesOf = (site: string): string[] => {
    const out: string[] = [];
    const walk = (dir: string): void => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (entry.name.endsWith('.html')) out.push(path.relative(site, full)); } };
    walk(site);
    return out.sort();
  };

  await cli(['preflight', FIXTURE_URL]);
  const configFile = path.join(stateRoot, 'run-config.json');
  fs.mkdirSync(stateRoot, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify({
    operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'claude-opus-5-5',
    deadline: 'PT1H', agentTokenBudget: 100_000, maxRepairCycles: 3, maxQuestions: 1, audience: 'an operator', operatorIsOwner: true,
  }));
  const init = await cli(['init', clone, '--url', FIXTURE_URL, '--config', configFile, '--state-root', stateRoot]);
  const run = init['run'] as string;
  await cli(['brief', run]);
  if (options.permitted === true) {
    const briefRecord = JSON.parse(fs.readFileSync(path.join(run, 'brief.json'), 'utf8')) as Doc;
    write(path.join(run, 'brief.json'), { ...briefRecord, executionRule: { arm: 'permitting' } });
  }
  clock = LATER;
  fs.mkdirSync(path.join(run, 'drafts'), { recursive: true });
  write(path.join(run, 'drafts', 'next.json'), { ...draft(commit, options.plantSecret ?? false), ...(options.executions ? { executions: options.executions(clone) } : {}) });
  await cli(['check', run]);
  const inv = await cli(['session-prompt', run, 'inventory']);
  write(path.join(inv['directory'] as string, 'inventory.json'), inventory(commit));
  await cli(['inventory-check', run]);
  await cli(['launch-form', run, 'inventory', 'terminal']);
  const fidelity = await cli(['session-prompt', run, 'review', '--kind', 'fidelity']);
  const spans = JSON.parse(fs.readFileSync(path.join(fidelity['directory'] as string, 'packet.json'), 'utf8')).spans;
  write(path.join(fidelity['directory'] as string, 'verdict.json'), fidelityVerdict(commit, fidelity['packetSha256'] as string, spans));
  await cli(['review-check', run, '--kind', 'fidelity']);
  await cli(['launch-form', run, 'review', 'terminal', '--kind', 'fidelity']);
  const first = await cli(['render', run]);
  const design = await cli(['session-prompt', run, 'review', '--kind', 'design']);
  write(path.join(design['directory'] as string, 'verdict.json'), designVerdict(commit, design['packetSha256'] as string, pagesOf(first['site'] as string)));
  await cli(['review-check', run, '--kind', 'design']);
  await cli(['launch-form', run, 'review', 'terminal', '--kind', 'design']);
  await cli(['render', run]);
  await cli(['close', run, ...(options.closeArgs ?? [])]);
  await cli(['status', run]);
  return { run, steps };
}

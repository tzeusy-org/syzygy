import { commitPolicyFixture, policyFixture } from './full-run.testkit.js';
import { committedUrlPoliciesCurrent, committedUrlPoliciesCurrentAsync, DOSSIER_POLICY_PATH, DOSSIER_PREDECESSOR_POLICY_PATH, DOSSIER_REACH_POLICY_PATH, DOSSIER_URL_ORIGIN_POLICY_PATH, readCommittedPolicy, readCommittedUrlOriginPolicy } from './policy-snapshot.js';
import { buildDossierScreen, loadDossierScreen, placementSubjectOf } from './screen.js';
import { createHash } from 'node:crypto';
import { buildSync } from 'esbuild';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DECISIONS_DIR, INSTANCES_DIR, LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM, POLICY_PATH } from '@syzygy/polaris-generation-consent';
import { loadRecorderForms, renderDossierLocalAgentAct, renderLocalAgentSignoff, renderPolicyAct, renderRecorderAct } from '@syzygy/polaris-generation-consent/testing';
import { beforeAll, describe, expect, it } from 'vitest';
import { createSessionController } from './session-controller.js';
import { createOrderedDesignSessionProfile, createSessionProfile, DEFAULT_SESSION_MODEL } from './session-profile.js';
import { SESSION_CONTENT_CLASSES } from './session-egress-policy.js';
import { runDossierCli } from './cli.js';
import { consentedClone, GIT_ENV as FIXTURE_GIT_ENV, gitInitFromEmptyTemplate, makeClone } from './full-run.testkit.js';
import { createPackageGateSources, type ProjectInputSource, type ProviderStatementRecord, type ProviderStatementSource } from './gate-sources.js';
import { cloneGitDirShape, cloneStoreShape } from './clone-shape.js';
import { openPinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { initRun, type InitResult } from './init.js';
import { preflight } from './preflight.js';
import { reverifyPinnedRevision } from './reverify.js';
import { runStatus } from './status.js';
import { GIT_ENV_NO_MAINTENANCE as GIT_ENV, tempDir } from '@syzygy/test-kit';

// The recorder forms render once, before the file collects its tests: some tables render at collection (syzygy-bpyt.4.8).
await loadRecorderForms();

// syzygy-qkea.4 (S3): every refusal arm of REQ-polaris-generation-033's start gates, with independently prepared fixtures. The records
// root is a temporary Syzygy checkout whose act records are rendered by the real recorders; the clone is a real Git repository built
// here with the git CLI (the code under test runs no process). Expected values are literals, never imported from the module under test.

const execFileAsync = promisify(execFile);
const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const URL_ = 'https://github.com/redis/redis';
/** The kit's `git` runs under plain GIT_ENV and would drop the no-maintenance keys, so these helpers keep their own env (syzygy-y733). */
const gitIn = (cwd: string, ...args: string[]): string => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env: GIT_ENV }).trim();

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// After the sitting the real-tree preflight reads every act record and sweeps every decisions file (about 4.4 s alone), past Vitest's 5 s default under load; gate-acts.test.ts gives its real-tree tests the same budget (30d2c2c9).
const TREE_TIMEOUT = 60_000;
// The fixture repositories run git under the kit's GIT_ENV_NO_MAINTENANCE (no user or system config, fixed dates, no automatic gc or
// maintenance: syzygy-y733), through the environment because config would be refused by init.

// The clone: commit A (plain), commit B (adds a .syzygy/ path), commit C (adds an openspec/ path), commit U (never consented by the
// default records), and off A, commits S (a symlink entry named .syzygy), G (a gitlink entry named openspec) and A2 (plain).
let origin: string;
const commits: Record<'A' | 'B' | 'C' | 'U' | 'S' | 'G' | 'A2', string> = { A: '', B: '', C: '', U: '', S: '', G: '', A2: '' };
beforeAll(() => {
  origin = tempDir('dossier-origin-');
  const git = (...args: string[]): string => gitIn(origin, ...args);
  const commit = (file: string, text: string): string => {
    fs.mkdirSync(path.dirname(path.join(origin, file)), { recursive: true });
    fs.writeFileSync(path.join(origin, file), text);
    git('add', file);
    git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', file);
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q', '-b', 'main');
  commits.A = commit('src/server.c', 'int main(void) { return 0; }\n');
  commits.B = commit('.syzygy/notes/draft.md', '# not adopted\n');
  commits.C = commit('openspec/specs/x/spec.md', '# spec\n');
  commits.U = commit('README.md', '# later\n');
  // Off commit A, each on its own branch so a clone carries it: S adds a symlink entry named .syzygy, G a gitlink entry named openspec.
  const entryCommit = (branch: string, add: () => void, message: string): string => {
    git('checkout', '-q', '-b', branch, commits.A);
    add();
    git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', message);
    const id = git('rev-parse', 'HEAD');
    git('checkout', '-q', 'main');
    return id;
  };
  commits.S = entryCommit('symlink', () => { fs.symlinkSync('src', path.join(origin, '.syzygy')); git('add', '.syzygy'); }, 'symlink .syzygy');
  commits.G = entryCommit('gitlink', () => git('update-index', '--add', '--cacheinfo', `160000,${commits.U},openspec`), 'gitlink openspec');
  commits.A2 = entryCommit('plain', () => { fs.writeFileSync(path.join(origin, 'src', 'util.c'), 'int util(void) { return 1; }\n'); git('add', 'src/util.c'); }, 'src/util.c');
});

/** A clone made as the consent states: `commit` fetched alone, shallow, into a new empty repository, HEAD detached at it; `initArgs`
 * go to `git init` (a template, say). */
const cloneAt = (commit: string, initArgs: readonly string[] = []): string => {
  const dir = path.join(tempDir('dossier-clone-'), 'redis');
  execFileSync('git', ['-C', origin, 'config', 'uploadpack.allowAnySHA1InWant', 'true'], { env: GIT_ENV });
  execFileSync('git', ['init', '-q', ...initArgs, dir], { env: GIT_ENV });
  fetchInto(dir, commit);
  execFileSync('git', ['-C', dir, 'checkout', '-q', '--detach', 'FETCH_HEAD'], { env: GIT_ENV });
  return dir;
};
/** Fetches `commit` alone into `clone` (after a run started, to give a test's rewritten pin its objects). */
const fetchInto = (clone: string, commit: string, depth = 1): void => {
  execFileSync('git', ['-C', clone, 'fetch', '-q', `--depth=${depth}`, `file://${origin}`, commit], { env: GIT_ENV });
};
/** A full clone of the origin, every branch and commit, checked out (detached) at `commit`. */
const fullCloneAt = (commit: string): string => {
  const dir = path.join(tempDir('dossier-full-clone-'), 'redis');
  execFileSync('git', ['clone', '-q', '--no-hardlinks', origin, dir], { env: GIT_ENV });
  execFileSync('git', ['-C', dir, 'checkout', '-q', '--detach', commit], { env: GIT_ENV });
  return dir;
};

const consentText = (rows: readonly [string, string][], extra = ''): string => `# redis observation consent (public repository)

Record ID: \`PUBLIC-OBS-REDIS-2026-10-03\`

Record version: \`0.1.0-candidate.7\`

Subject: \`(project:syzygy, repository:redis-redis)\`

Upstream: ${URL_} (public; configuration, not repository identity)
${extra}
| Label | Commit object id |
|---|---|
${rows.map(([label, id]) => `| \`${label}\` | \`${id}\` |`).join('\n')}

Proposed revocation state: active; supersedes no earlier consent
`;
const ENTRY = `${JSON.stringify({ entries: [{ observerId: 'polaris-dossier-reader', implementationId: 'polaris-dossier/git-object-reader', implementationVersion: '0.1.0' }] }, null, 2)}\n`;
const POLICY = `${JSON.stringify({ policyId: 'fixture', publicSourceScope: { classes: ['code-content'] } }, null, 2)}\n`;
const CONSENT_PATH = `${INSTANCES_DIR}/redis/OBSERVATION-CONSENT.md`;
const CONSENT_ACT = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`;
const ENTRY_PATH = LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.installed;
const REGISTRY_ACT = `${DECISIONS_DIR}/${LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.file}`;
const POLICY_ACT = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md`;

/** The local-agent entry's v1.1 sign-off record (the gate's version) as the recorder renders it over `entry` installed. */
const signoffs = new Map<string, string>();
const signoffOver = (entry: string): string => {
  const hit = signoffs.get(entry);
  if (hit !== undefined) return hit;
  const scratch = tempDir('dossier-signoff-');
  fs.mkdirSync(path.dirname(path.join(scratch, ENTRY_PATH)), { recursive: true });
  fs.writeFileSync(path.join(scratch, ENTRY_PATH), entry);
  const text = renderLocalAgentSignoff(scratch, '2026-10-05', '2026-10-05T09:30:00Z');
  signoffs.set(entry, text);
  return text;
};

/** The records every gate needs, in force at NOW; `over` replaces or (with null) removes a file, `rows` replaces the consented revisions. */
const records = (over: Record<string, string | null> = {}, rows?: readonly [string, string][]): string => {
  const consent = consentText(rows ?? [['fixture-a', commits.A], ['fixture-b', commits.B], ['fixture-c', commits.C]]);
  const files: Record<string, string | null> = {
    [CONSENT_PATH]: consent,
    [CONSENT_ACT]: renderRecorderAct('redis-observation', sha(consent), '2026-10-04', '2026-10-04T09:30:00Z'),
    [ENTRY_PATH]: ENTRY,
    [REGISTRY_ACT]: signoffOver(ENTRY),
    [POLICY_PATH]: POLICY,
    [POLICY_ACT]: renderPolicyAct(sha(POLICY), '2026-10-04', '2026-10-04T10:00:00Z'),
    ...over,
  };
  const root = tempDir('dossier-records-');
  for (const [rel, text] of Object.entries(files)) {
    if (text === null) continue;
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return commitPolicyFixture(root, policyFixture().bytes);
};

const NO_DRAWER: ProjectInputSource = { drawerFor: async () => ({ stated: true, drawer: 'absent', record: 'PROJECT-INPUT-REDIS@1' }) };
const DRAWER: ProjectInputSource = { drawerFor: async () => ({ stated: true, drawer: 'present', record: 'PROJECT-INPUT-REDIS@1' }) };
const STATEMENT: ProviderStatementRecord = {
  recordId: 'STATEMENT-REDIS-ANTHROPIC', version: '1', digest: 'a'.repeat(64), agentTool: 'claude-code', provider: 'anthropic', contentClasses: ['code-content'],
  withdrawn: false, act: { identity: 'STATEMENT-REDIS-ANTHROPIC-ACT-2026-10-06', inForceAt: Date.UTC(2026, 9, 6) },
};
const statements = (...list: ProviderStatementRecord[]): ProviderStatementSource => ({ statementsFor: async () => list });
const CONFIG = JSON.stringify({
  operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'claude-opus-5-5',
  deadline: 'PT2H', agentTurnBudget: 200, maxRepairCycles: 2, maxQuestions: 3, audience: 'a new contributor', operatorIsOwner: true,
});

interface Setup { root?: string; clone?: string; projectInput?: ProjectInputSource; providerStatements?: ProviderStatementSource; now?: number; url?: string; config?: string; stateRoot?: string }
/** Run init and observe whether any object reader was opened. */
async function init(setup: Setup = {}): Promise<{ result: InitResult; readerOpened: boolean; stateRoot: string; clone: string; root: string }> {
  const root = setup.root ?? records();
  const clone = setup.clone ?? cloneAt(commits.A);
  const stateRoot = setup.stateRoot ?? path.join(tempDir('dossier-state-'), 'runs');
  let readerOpened = false;
  const now = setup.now ?? NOW;
  const sources = createPackageGateSources({ root, now: () => now, projectInput: setup.projectInput ?? NO_DRAWER, ...(setup.providerStatements ? { providerStatements: setup.providerStatements } : {}) });
  const result = await initRun(
    { clone, url: setup.url ?? URL_, configText: setup.config ?? CONFIG, stateRoot },
    { sources, now: () => now, runId: () => 'run-0123456789abcdef0123456789abcdef', openReader: (o: PinnedObjectReaderOptions) => { readerOpened = true; return openPinnedObjectReader(o); } },
  );
  return { result, readerOpened, stateRoot, clone, root };
}
const refusal = (result: InitResult) => (result.ok ? null : result.refusal);

describe('init: a declared pinned source', () => {
  it('writes one /2 record without launch records or clone writes', async () => {
    const { result, clone, stateRoot, root } = await init({ clone: cloneAt(commits.U) });
    const policyPath = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json';
    const committed = gitIn(root, 'rev-parse', 'HEAD');
    const exactBytes = execFileSync('git', ['-C', root, 'show', `${committed}:${policyPath}`], { env: FIXTURE_GIT_ENV });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.subject).toMatchObject({ repository: { repositoryId: 'redis-redis', role: 'observed-source' }, pinnedRevision: { commit: commits.U, label: 'detached HEAD' },
      visibility: { value: 'private', source: 'conservative-default', label: 'Inferred' },
      screeningPolicy: { path: policyPath, commit: committed, policyId: 'polaris-butlers-project-shape-secrets',
        policyVersion: 'dossier-declared-source/4.0.0', sha256: createHash('sha256').update(exactBytes).digest('hex') } });
    expect(Object.keys(result.report.subject).filter(key => key.toLowerCase().includes('repository'))).toEqual(['repository']);
    expect(fs.readdirSync(result.report.run)).toEqual(['run.json']);
    expect(fs.readdirSync(stateRoot)).toHaveLength(1);
    expect(JSON.parse(fs.readFileSync(path.join(result.report.run, 'run.json'), 'utf8')).format).toBe('polaris-dossier-run/2');
    expect(gitIn(clone, 'status', '--porcelain', '--ignored')).toBe('');
  });

  it('records the clone by its real path, not the path typed: a symlink or a `..` segment is resolved (R-POLARIS-DOSSIER-S3-GATES-2 note 12)', async () => {
    const clone = cloneAt(commits.A);
    const link = path.join(tempDir('dossier-clone-link-'), 'via-link');
    fs.symlinkSync(clone, link);
    const linked = await init({ clone: link });
    expect(linked.result.ok && linked.result.report.subject.clone.path).toBe(clone);
    const dotted = await init({ clone: path.join(clone, 'src', '..') });
    expect(dotted.result.ok && dotted.result.report.subject.clone.path).toBe(clone);
  });

  it('records the clone by its real path when the operator names it through a symbolic link', async () => {
    const clone = cloneAt(commits.A);
    const link = path.join(tempDir('dossier-link-'), 'via');
    fs.symlinkSync(clone, link);
    const { result } = await init({ clone: link });
    expect(result.ok && result.report.subject.clone).toEqual({ path: fs.realpathSync(clone), declaredBy: 'operator', label: 'Inferred', use: 'read' });
  });

  it('starts from a clone of a commit with a parent, shallow at exactly that commit', async () => {
    const clone = cloneAt(commits.B);
    expect(fs.readFileSync(path.join(clone, '.git', 'shallow'), 'utf8')).toBe(`${commits.B}\n`);
    const { result } = await init({ clone, providerStatements: statements(STATEMENT) });
    expect(result.ok && result.report.subject.pinnedRevision.commit).toBe(commits.B);
  });

  it('accepts the exact SHA-256 init/fetch form and still rejects extra extensions before object reads (REQ-polaris-generation-047)', async () => {
    const base = tempDir('dossier-sha256-admission-');
    const upstream = path.join(base, 'upstream');
    gitInitFromEmptyTemplate(upstream, ['--object-format=sha256', '-b', 'release-next']);
    fs.writeFileSync(path.join(upstream, 'README.md'), '# Synthetic source\n');
    gitIn(upstream, 'add', 'README.md');
    gitIn(upstream, '-c', 'user.name=Synthetic fixture', '-c', 'user.email=fixture@invalid', 'commit', '-qm', 'synthetic SHA-256 snapshot');
    const selected = gitIn(upstream, 'rev-parse', 'HEAD');
    expect(selected).toMatch(/^[0-9a-f]{64}$/u);
    const clone = path.join(base, 'clone');
    gitInitFromEmptyTemplate(clone, ['--object-format=sha256']);
    gitIn(clone, 'fetch', '-q', '--depth=1', '--no-tags', '--no-recurse-submodules', `file://${upstream}`, selected);
    gitIn(clone, 'checkout', '-q', '--detach', selected);
    const before = fs.readFileSync(path.join(clone, '.git', 'config'), 'utf8');
    const admitted = await init({ clone });
    expect(admitted.result.ok, admitted.result.ok ? undefined : admitted.result.refusal.reason).toBe(true);
    if (admitted.result.ok) expect(admitted.result.report.subject.pinnedRevision.commit).toBe(selected);
    expect(fs.readFileSync(path.join(clone, '.git', 'config'), 'utf8')).toBe(before);
    for (const extra of ['\n[extensions]\n\tpartialclone = origin\n', '\n[include]\n\tpath = never-read-fixture-config\n']) {
      fs.writeFileSync(path.join(clone, '.git', 'config'), before + extra);
      const refused = await init({ clone });
      expect(refused.result.ok).toBe(false);
      expect(refused.readerOpened).toBe(false);
      if (!refused.result.ok) expect(refused.result.refusal.stage).toBe('clone-shape');
    }
  });

  it('starts from a clone of a root commit shallow at it, or with no shallow file: a root commit has no parent to cut', async () => {
    const clone = cloneAt(commits.A);
    expect(fs.readFileSync(path.join(clone, '.git', 'shallow'), 'utf8')).toBe(`${commits.A}\n`);
    expect(fs.readFileSync(path.join(clone, '.git', 'FETCH_HEAD'), 'utf8')).toContain(commits.A);
    expect((await init({ clone })).result.ok).toBe(true);
    fs.rmSync(path.join(clone, '.git', 'shallow'));
    expect((await init({ clone })).result.ok).toBe(true);
  });
});

describe('init: the clone holds the consented commit alone (syzygy-qkea.24)', () => {
  it('runs the fixture git helpers with automatic gc and maintenance off (syzygy-y733)', () => {
    expect(gitIn(origin, 'config', '--get', 'gc.auto')).toBe('0');
    expect(gitIn(origin, 'config', '--get', 'maintenance.auto')).toBe('false');
  });
  const SHAPE = 'the clone must hold the consented commit alone, fetched into an empty repository (git init, git fetch --depth=1 <url> <commit>, git checkout --detach FETCH_HEAD)';
  const REMAKE = 'make it again in a new directory with git init --template= <dir> (an empty template, so no template or global init configuration adds anything), then the printed fetch and checkout';
  // A .git refusal (before any object is read) also says how to make the clone again; a store refusal does not.
  const refusedShape = async (clone: string, reason: string, objectsRead: boolean, setup: Partial<Setup> = {}) => {
    const run = await init({ clone, ...setup });
    expect(refusal(run.result)).toMatchObject({ stage: 'clone-shape', reason: objectsRead ? `${reason}; ${SHAPE}` : `${reason}; ${SHAPE}; ${REMAKE}`, objectsRead });
    expect(fs.existsSync(run.stateRoot)).toBe(false);
  };
  const git = gitIn;
  const dotGit = (clone: string, ...parts: string[]): string => path.join(clone, '.git', ...parts);
  const never = (name: string): string => `.git holds ${name}, which the consented form never leaves there`;
  const packStem = (clone: string): string => {
    const names = fs.readdirSync(dotGit(clone, 'objects', 'pack')).filter(name => name.endsWith('.pack'));
    expect(names).toHaveLength(1);
    return names[0]!.slice(0, -'.pack'.length);
  };
  /** The pinned commit's objects as one pack (a small fetch leaves them loose). */
  const packedCloneAt = (commit: string): string => {
    const clone = cloneAt(commit);
    git(clone, 'repack', '-a', '-d', '-q', '-n');
    return clone;
  };

  it('leaves in .git exactly the entries the allowlist names, as the header derives them', () => {
    const clone = cloneAt(commits.A);
    expect(fs.readdirSync(dotGit(clone)).sort()).toEqual(['FETCH_HEAD', 'HEAD', 'config', 'description', 'hooks', 'index', 'info', 'logs', 'objects', 'refs', 'shallow']);
    expect(fs.readdirSync(dotGit(clone, 'info'))).toEqual(['exclude']);
    expect(fs.readdirSync(dotGit(clone, 'logs'))).toEqual(['HEAD']);
    expect(fs.readdirSync(dotGit(clone, 'hooks')).every(name => name.endsWith('.sample'))).toBe(true);
    expect(fs.readdirSync(dotGit(clone, 'objects', 'info'))).toEqual([]);
    expect(cloneGitDirShape(dotGit(clone), commits.A)).toEqual({ ok: true });
  });

  it('starts from a clone whose objects are packed, with a reverse index', async () => {
    const clone = packedCloneAt(commits.A);
    expect(fs.readdirSync(dotGit(clone, 'objects', 'pack')).map(name => path.extname(name)).sort()).toEqual(['.idx', '.pack', '.rev']);
    expect((await init({ clone })).result.ok).toBe(true);
  });

  it('refuses a full clone, before reading any object', async () => {
    const clone = fullCloneAt(commits.A);
    const run = await init({ clone });
    expect(refusal(run.result)).toMatchObject({ stage: 'clone-shape', reason: `${never('packed-refs')}; ${SHAPE}; ${REMAKE}`, objectsRead: false });
    expect(run.readerOpened).toBe(false);
  });

  it('refuses HEAD on a branch at the consented commit: the branch is a ref', async () => {
    const clone = cloneAt(commits.A);
    git(clone, 'checkout', '-q', '-B', 'pinned', commits.A);
    await refusedShape(clone, `HEAD is not detached at ${commits.A}`, false);
  });

  it('refuses an extra ref, loose or packed', async () => {
    const tagged = cloneAt(commits.A);
    git(tagged, 'update-ref', 'refs/tags/extra', commits.A);
    await refusedShape(tagged, 'refs/tags/extra is a ref or not a directory, and the clone may hold no ref but HEAD', false);
    git(tagged, 'pack-refs', '--all');
    expect(fs.existsSync(dotGit(tagged, 'refs', 'tags', 'extra'))).toBe(false);
    await refusedShape(tagged, never('packed-refs'), false);
  });

  it('refuses FETCH_HEAD naming another commit, and passes it naming the pinned commit alone', async () => {
    const clone = cloneAt(commits.A);
    const fetched = fs.readFileSync(dotGit(clone, 'FETCH_HEAD'), 'latin1');
    fs.writeFileSync(dotGit(clone, 'FETCH_HEAD'), `${fetched}${commits.B}\t\t'${commits.B}' of file:///elsewhere\n`);
    await refusedShape(clone, `FETCH_HEAD names an object other than ${commits.A}`, false);
    fs.writeFileSync(dotGit(clone, 'FETCH_HEAD'), fetched);
    expect((await init({ clone })).result.ok).toBe(true);
  });

  it('refuses every top-level name the consented form never leaves: commondir, modules, worktrees, pseudo-refs, bisect and rebase state', async () => {
    const add: [string, (clone: string) => void][] = [
      ['commondir', clone => fs.writeFileSync(dotGit(clone, 'commondir'), `${fullCloneAt(commits.A)}/.git\n`)],
      ['gitdir', clone => fs.writeFileSync(dotGit(clone, 'gitdir'), '/elsewhere/.git\n')],
      ['modules', clone => fs.cpSync(dotGit(fullCloneAt(commits.A)), dotGit(clone, 'modules', 'deps'), { recursive: true })],
      ['worktrees', clone => fs.mkdirSync(dotGit(clone, 'worktrees', 'other'), { recursive: true })],
      ['ORIG_HEAD', clone => fs.writeFileSync(dotGit(clone, 'ORIG_HEAD'), `${commits.A}\n`)],
      ['BISECT_EXPECTED_REV', clone => fs.writeFileSync(dotGit(clone, 'BISECT_EXPECTED_REV'), `${commits.B}\n`)],
      ['rebase-merge', clone => { fs.mkdirSync(dotGit(clone, 'rebase-merge')); fs.writeFileSync(dotGit(clone, 'rebase-merge', 'orig-head'), `${commits.B}\n`); }],
      ['description.dpkg-new', clone => fs.writeFileSync(dotGit(clone, 'description.dpkg-new'), 'Unnamed repository\n')],
      ['description.dpkg-tmp', clone => fs.writeFileSync(dotGit(clone, 'description.dpkg-tmp'), 'Unnamed repository\n')],
    ];
    for (const [name, make] of add) {
      const clone = cloneAt(commits.A);
      make(clone);
      await refusedShape(clone, never(name), false);
    }
  });

  it('refuses objects/info/alternates and http-alternates, as a file or a link, and whatever they name', async () => {
    for (const name of ['alternates', 'http-alternates']) {
      const clone = cloneAt(commits.A);
      fs.writeFileSync(dotGit(clone, 'objects', 'info', name), `${dotGit(fullCloneAt(commits.A), 'objects')}\n`);
      await refusedShape(clone, `objects/info/${name} exists, and would lend the clone another repository's objects`, false);
      const linked = cloneAt(commits.A);
      fs.symlinkSync('/nonexistent', dotGit(linked, 'objects', 'info', name));
      await refusedShape(linked, `objects/info/${name} exists, and would lend the clone another repository's objects`, false);
    }
    const relative = cloneAt(commits.A);
    fs.cpSync(dotGit(fullCloneAt(commits.A), 'objects'), dotGit(relative, 'extra-objects'), { recursive: true });
    fs.writeFileSync(dotGit(relative, 'objects', 'info', 'alternates'), '../extra-objects\n');
    await refusedShape(relative, 'objects/info/alternates exists, and would lend the clone another repository\'s objects', false);
  });

  it('refuses in the object store anything but loose objects, an empty info/ and paired packs', async () => {
    const write = (clone: string, rel: string, text = ''): void => { fs.mkdirSync(path.dirname(dotGit(clone, rel)), { recursive: true }); fs.writeFileSync(dotGit(clone, rel), text); };
    const tmp = cloneAt(commits.A);
    write(tmp, `objects/tmp_obj_${commits.U}`, 'x');
    await refusedShape(tmp, `objects/tmp_obj_${commits.U} is not an entry the consented form leaves in the object store`, false);
    const info = cloneAt(commits.A);
    write(info, 'objects/info/packs', 'P pack-x.pack\n');
    await refusedShape(info, 'objects/info holds packs, and the consented form leaves it empty', false);
    const misnamed = cloneAt(commits.A);
    write(misnamed, `objects/${commits.A.slice(0, 2)}/not-an-object`, 'x');
    await refusedShape(misnamed, `objects/${commits.A.slice(0, 2)}/not-an-object is not a loose object`, false);
    for (const extension of ['promisor', 'keep', 'bitmap']) {
      const clone = packedCloneAt(commits.A);
      write(clone, `objects/pack/${packStem(clone)}.${extension}`);
      await refusedShape(clone, `objects/pack/${packStem(clone)}.${extension} is not a pack, index or reverse index the consented form leaves`, false);
    }
    const unpaired = packedCloneAt(commits.A);
    const stem = packStem(unpaired);
    fs.rmSync(dotGit(unpaired, 'objects', 'pack', `${stem}.idx`));
    await refusedShape(unpaired, `objects/pack/${stem} is not a .pack with its .idx`, false);
  });

  it('refuses unknown files under the allowed directories: hooks that run, grafts, other logs', async () => {
    const hook = cloneAt(commits.A);
    fs.writeFileSync(dotGit(hook, 'hooks', 'post-checkout'), '#!/bin/sh\n', { mode: 0o755 });
    await refusedShape(hook, 'hooks/post-checkout is not a sample hook, the only kind the consented form leaves', false);
    const grafts = cloneAt(commits.A);
    fs.writeFileSync(dotGit(grafts, 'info', 'grafts'), `${commits.A} ${commits.U}\n`);
    await refusedShape(grafts, 'info/grafts is not info/exclude, the only entry the consented form leaves there', false);
    const logs = cloneAt(commits.A);
    fs.mkdirSync(dotGit(logs, 'logs', 'refs', 'heads'), { recursive: true });
    await refusedShape(logs, 'logs/refs is not logs/HEAD, the only log the consented form leaves', false);
  });

  it('refuses logs/HEAD naming any commit but the pinned one or the zero identifier', async () => {
    const clone = cloneAt(commits.A);
    const log = fs.readFileSync(dotGit(clone, 'logs', 'HEAD'), 'latin1');
    expect(log.startsWith(`${'0'.repeat(40)} ${commits.A} `)).toBe(true);
    fs.writeFileSync(dotGit(clone, 'logs', 'HEAD'), `${log}${commits.A} ${commits.B} t <t@example.invalid> 1791330124 +0000\tcheckout: moving\n`);
    await refusedShape(clone, `logs/HEAD names ${commits.B}, an object other than ${commits.A}`, false);
  });

  it('refuses a symbolic link anywhere under .git, never following it', async () => {
    const at: [string, (clone: string) => void][] = [
      ['worktrees', clone => fs.symlinkSync(dotGit(cloneAt(commits.B)), dotGit(clone, 'worktrees'))],
      ['objects/zz', clone => fs.symlinkSync(dotGit(fullCloneAt(commits.A), 'objects', 'pack'), dotGit(clone, 'objects', 'zz'))],
      ['hooks/pre-commit.sample', clone => { fs.rmSync(dotGit(clone, 'hooks', 'pre-commit.sample')); fs.symlinkSync('/bin/true', dotGit(clone, 'hooks', 'pre-commit.sample')); }],
      ['refs/heads', clone => { fs.rmSync(dotGit(clone, 'refs', 'heads'), { recursive: true }); fs.symlinkSync(dotGit(fullCloneAt(commits.A), 'refs', 'heads'), dotGit(clone, 'refs', 'heads')); }],
      ['FETCH_HEAD', clone => { fs.rmSync(dotGit(clone, 'FETCH_HEAD')); fs.symlinkSync('/dev/zero', dotGit(clone, 'FETCH_HEAD')); }],
    ];
    for (const [rel, make] of at) {
      const clone = cloneAt(commits.A);
      make(clone);
      await refusedShape(clone, `${rel} is a symbolic link; nothing under .git is followed`, false);
    }
  });

  it('refuses an allowed name of the wrong kind', async () => {
    const hooks = cloneAt(commits.A);
    fs.rmSync(dotGit(hooks, 'hooks'), { recursive: true });
    fs.writeFileSync(dotGit(hooks, 'hooks'), '');
    await refusedShape(hooks, 'hooks is not a directory', false);
    const index = cloneAt(commits.A);
    fs.rmSync(dotGit(index, 'index'));
    fs.mkdirSync(dotGit(index, 'index'));
    await refusedShape(index, 'index is not a regular file', false);
  });

  it('reads shallow without following a link, and only as a regular file', () => {
    const none = { parents: [], stored: 1, reachable: 1, beyondCount: 0, beyond: [] };
    const linked = cloneAt(commits.A);
    fs.rmSync(dotGit(linked, 'shallow'));
    fs.symlinkSync(dotGit(cloneAt(commits.B), 'shallow'), dotGit(linked, 'shallow'));
    expect(cloneStoreShape(dotGit(linked), commits.A, none)).toEqual({ ok: false, reason: `shallow is a symbolic link; nothing under .git is followed; ${SHAPE}` });
    const directory = cloneAt(commits.A);
    fs.rmSync(dotGit(directory, 'shallow'));
    fs.mkdirSync(dotGit(directory, 'shallow'));
    expect(cloneStoreShape(dotGit(directory), commits.A, none)).toEqual({ ok: false, reason: `shallow is not a regular file; ${SHAPE}` });
  });

  it('refuses a file over its bound, and a .git with more entries than the walk\'s bound', async () => {
    const big = cloneAt(commits.A);
    fs.appendFileSync(dotGit(big, 'FETCH_HEAD'), ' '.repeat(1024 * 1024));
    await refusedShape(big, 'FETCH_HEAD is larger than 1048576 bytes', false);
    const clone = cloneAt(commits.A);
    const entries = fs.readdirSync(dotGit(clone), { recursive: true }).length;
    expect(cloneGitDirShape(dotGit(clone), commits.A, { maxEntries: entries })).toEqual({ ok: true });
    expect(cloneGitDirShape(dotGit(clone), commits.A, { maxEntries: entries - 1 })).toEqual({ ok: false, reason: `.git holds more than ${entries - 1} entries; ${SHAPE}; ${REMAKE}` });
  });

  it('refuses a two-commit shallow clone, and a clone shallow at another commit or not shallow', async () => {
    const two = path.join(tempDir('dossier-clone-'), 'redis');
    git(origin, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
    execFileSync('git', ['init', '-q', two], { env: GIT_ENV });
    fetchInto(two, commits.C, 2);
    git(two, 'checkout', '-q', '--detach', 'FETCH_HEAD');
    await refusedShape(two, `the clone is shallow at 1 commit(s), not at ${commits.C} alone`, true, { providerStatements: statements(STATEMENT) });

    const elsewhere = cloneAt(commits.C);
    fs.writeFileSync(dotGit(elsewhere, 'shallow'), `${commits.C}\n${commits.B}\n`);
    await refusedShape(elsewhere, `the clone is shallow at 2 commit(s), not at ${commits.C} alone`, true, { providerStatements: statements(STATEMENT) });
    fs.rmSync(dotGit(elsewhere, 'shallow'));
    await refusedShape(elsewhere, `the clone is not shallow, and ${commits.C} has 1 parent(s)`, true, { providerStatements: statements(STATEMENT) });
  });

  it('refuses an object store that names an object beyond the pinned commit and its tree', async () => {
    const clone = cloneAt(commits.A);
    const loose = (repo: string, id: string): string => path.join(repo, '.git', 'objects', id.slice(0, 2), id.slice(2));
    fs.mkdirSync(path.dirname(loose(clone, commits.U)), { recursive: true });
    fs.copyFileSync(loose(origin, commits.U), loose(clone, commits.U));
    await refusedShape(clone, `the object store names 1 object(s) that are neither ${commits.A} nor under its tree (first: ${commits.U})`, true);

    // The same object named only by a pack index.
    const packed = cloneAt(commits.A);
    execFileSync('git', ['-C', origin, 'pack-objects', '-q', path.join(packed, '.git', 'objects', 'pack', 'pack')], { input: `${commits.U}\n`, env: GIT_ENV });
    expect(fs.readdirSync(path.join(packed, '.git', 'objects', 'pack')).some(name => name.endsWith('.idx'))).toBe(true);
    await refusedShape(packed, `the object store names 1 object(s) that are neither ${commits.A} nor under its tree (first: ${commits.U})`, true);
  });

  it('reads config bounded and without following a link, and admits the [core] keys git init writes on each mainstream platform', async () => {
    const clone = cloneAt(commits.A);
    expect(fs.readFileSync(dotGit(clone, 'config'), 'utf8')).toBe('[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n\tlogallrefupdates = true\n');
    // macOS adds ignorecase and precomposeunicode, Windows symlinks and ignorecase; comments and blank lines are not settings.
    fs.writeFileSync(dotGit(clone, 'config'), '# made by git init\n[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = false\n\tlogallrefupdates = true\n\n\tsymlinks = false\n\tignorecase = true\n\tprecomposeunicode = true\n; end\n');
    expect((await init({ clone })).result.ok).toBe(true);
    // Absent, git takes every default: nothing is configured.
    fs.rmSync(dotGit(clone, 'config'));
    expect((await init({ clone })).result.ok).toBe(true);

    const big = cloneAt(commits.A);
    fs.appendFileSync(dotGit(big, 'config'), `# ${'x'.repeat(1024 * 1024)}\n`);
    await refusedShape(big, 'config is larger than 1048576 bytes', false);
    const linked = cloneAt(commits.A);
    fs.rmSync(dotGit(linked, 'config'));
    fs.symlinkSync(dotGit(cloneAt(commits.B), 'config'), dotGit(linked, 'config'));
    await refusedShape(linked, 'config is a symbolic link; nothing under .git is followed', false);
  });

  it('refuses config naming a remote, a promisor, an include or a command the agent\'s git would run (R-POLARIS-DOSSIER-CLONE-SHAPE-2 finding 1)', async () => {
    const cases: [string, (clone: string) => void][] = [
      // Probe 03b: a promisor remote lets a plain read fetch any object lazily.
      ['config holds a [remote "up"] section, and the config git init writes holds [core] alone', clone => { git(clone, 'config', 'remote.up.url', `file://${origin}`); git(clone, 'config', 'remote.up.promisor', 'true'); }],
      // Probe 03: a partial clone needs format version 1 and the extension.
      ['config sets core.repositoryformatversion to a value git init never writes there', clone => { git(clone, 'config', 'core.repositoryformatversion', '1'); git(clone, 'config', 'extensions.partialClone', 'origin'); }],
      ['config holds a [extensions] section, and the config git init writes holds [core] alone', clone => git(clone, 'config', 'extensions.partialClone', 'origin')],
      // Note 7: a named remote, even one the consent's fetch could have used.
      ['config holds a [remote "origin"] section, and the config git init writes holds [core] alone', clone => git(clone, 'remote', 'add', 'origin', `file://${origin}`)],
      // Probes 03c and 03d: configuration from a file outside the clone.
      ['config holds a [include] section, and the config git init writes holds [core] alone', clone => git(clone, 'config', 'include.path', '/elsewhere/gitconfig')],
      ['config holds a [includeIf "gitdir:/"] section, and the config git init writes holds [core] alone', clone => git(clone, 'config', 'includeIf.gitdir:/.path', '/elsewhere/gitconfig')],
      // Probes 12a and 12b, and note 6: settings that run a command or move the working tree.
      ['config sets core.hooksPath, which git init never writes', clone => git(clone, 'config', 'core.hooksPath', '/elsewhere/hooks')],
      ['config sets core.fsmonitor, which git init never writes', clone => git(clone, 'config', 'core.fsmonitor', '/elsewhere/monitor')],
      ['config sets core.worktree, which git init never writes', clone => git(clone, 'config', 'core.worktree', '/elsewhere')],
      ['config sets core.bare to a value git init never writes there', clone => git(clone, 'config', 'core.bare', 'true')],
      ['config sets core.filemode to a value git init never writes there', clone => git(clone, 'config', 'core.filemode', 'maybe')],
      // An inherited name is not a key git init writes, and is refused rather than looked up.
      ['config sets core.constructor, which git init never writes', clone => fs.appendFileSync(dotGit(clone, 'config'), '\tconstructor = true\n')],
      ['config sets core.FileMode more than once', clone => fs.appendFileSync(dotGit(clone, 'config'), '\tFileMode = true\n')],
      ['config line 6 continues onto the next line, which the config git init writes never does', clone => fs.appendFileSync(dotGit(clone, 'config'), '\tsymlinks = tr\\\nue\n')],
      ['config line 1 is not a [core] key = value line the config git init writes', clone => fs.writeFileSync(dotGit(clone, 'config'), `filemode = true\n${fs.readFileSync(dotGit(clone, 'config'), 'utf8')}`)],
      ['config line 6 is not a [core] key = value line the config git init writes', clone => fs.appendFileSync(dotGit(clone, 'config'), '\tsymlinks\n')],
    ];
    for (const [reason, make] of cases) {
      const clone = cloneAt(commits.A);
      make(clone);
      await refusedShape(clone, reason, false);
    }
  }, TREE_TIMEOUT);

  it('starts from a clone made with an older git\'s template, which leaves an empty branches/, or an empty one; refuses anything in branches/', async () => {
    // Gits older than about 2.49 copy branches/ from their default template (R-POLARIS-DOSSIER-CLONE-SHAPE-2 finding 2).
    const template = tempDir('dossier-template-');
    for (const dir of ['branches', 'hooks', 'info']) fs.mkdirSync(path.join(template, dir));
    fs.writeFileSync(path.join(template, 'description'), 'Unnamed repository; edit this file \'description\' to name the repository.\n');
    fs.writeFileSync(path.join(template, 'hooks', 'pre-commit.sample'), '#!/bin/sh\n', { mode: 0o755 });
    fs.writeFileSync(path.join(template, 'info', 'exclude'), '# git ls-files --others --exclude-from=.git/info/exclude\n');
    const older = cloneAt(commits.A, [`--template=${template}`]);
    expect(fs.readdirSync(dotGit(older)).sort()).toEqual(['FETCH_HEAD', 'HEAD', 'branches', 'config', 'description', 'hooks', 'index', 'info', 'logs', 'objects', 'refs', 'shallow']);
    expect(fs.readdirSync(dotGit(older, 'branches'))).toEqual([]);
    expect((await init({ clone: older })).result.ok).toBe(true);
    fs.writeFileSync(dotGit(older, 'branches', 'origin'), `file://${origin}#main\n`);
    await refusedShape(older, 'branches/origin is not allowed: an older git\'s template leaves branches/ empty, and an entry there names a remote', false);

    // The remedy every .git refusal prints: an empty template leaves no hooks, info or description.
    const empty = cloneAt(commits.A, ['--template=']);
    expect(fs.readdirSync(dotGit(empty)).sort()).toEqual(['FETCH_HEAD', 'HEAD', 'config', 'index', 'logs', 'objects', 'refs', 'shallow']);
    expect((await init({ clone: empty })).result.ok).toBe(true);

    // The fixture helpers own an empty template: a contaminated ambient one (a host git upgrade's description.dpkg-* leftovers) never reaches them (syzygy-157b).
    const ambient = tempDir('dossier-ambient-template-');
    const sentinels = ['description.dpkg-new', 'description.dpkg-tmp'];
    for (const name of sentinels) fs.writeFileSync(path.join(ambient, name), 'dpkg\n');
    const hadOwn = Object.prototype.hasOwnProperty.call(FIXTURE_GIT_ENV, 'GIT_TEMPLATE_DIR');
    const previous = (FIXTURE_GIT_ENV as Record<string, string | undefined>).GIT_TEMPLATE_DIR;
    (FIXTURE_GIT_ENV as Record<string, string | undefined>).GIT_TEMPLATE_DIR = ambient;
    try {
      const made = makeClone(tempDir('dossier-ambient-'));
      const direct = consentedClone(path.join(path.dirname(made.clone), 'origin'), made.commit, path.join(tempDir('dossier-ambient-direct-'), 'redis'));
      for (const repo of [path.join(path.dirname(made.clone), 'origin'), made.clone, direct]) {
        for (const name of sentinels) expect(fs.existsSync(dotGit(repo, name))).toBe(false);
      }
      for (const repo of [made.clone, direct]) expect(cloneGitDirShape(dotGit(repo), made.commit)).toEqual({ ok: true });

      // A real init failure (the destination is a regular file) propagates, and leaves no private template behind.
      const parent = tempDir('dossier-ambient-fail-');
      const destination = path.join(parent, 'redis');
      fs.writeFileSync(destination, 'a regular file\n');
      const before = fs.readdirSync(parent).sort();
      expect(() => consentedClone(path.join(path.dirname(made.clone), 'origin'), made.commit, destination)).toThrow();
      expect(fs.readdirSync(parent).sort()).toEqual(before);
    } finally {
      if (hadOwn) (FIXTURE_GIT_ENV as Record<string, string | undefined>).GIT_TEMPLATE_DIR = previous; else delete (FIXTURE_GIT_ENV as Record<string, string | undefined>).GIT_TEMPLATE_DIR;
    }
    expect(fs.readdirSync(ambient).sort()).toEqual(sentinels);
  });

  it('the fixture helpers ignore an ambient init.templateDir config too', () => {
    const sentinels = ['description.dpkg-new', 'description.dpkg-tmp'];
    // The `init.templateDir` config channel (here through the fixture env's global config file) never reaches the helpers either.
    const configured = tempDir('dossier-config-template-');
    for (const name of sentinels) fs.writeFileSync(path.join(configured, name), 'dpkg\n');
    const globalConfig = path.join(tempDir('dossier-config-global-'), 'gitconfig');
    fs.writeFileSync(globalConfig, `[init]\n\ttemplateDir = ${configured}\n`);
    const env = FIXTURE_GIT_ENV as Record<string, string | undefined>;
    const priorGlobal = env.GIT_CONFIG_GLOBAL;
    env.GIT_CONFIG_GLOBAL = globalConfig;
    try {
      const viaConfig = makeClone(tempDir('dossier-config-'));
      for (const repo of [path.join(path.dirname(viaConfig.clone), 'origin'), viaConfig.clone]) {
        for (const name of sentinels) expect(fs.existsSync(dotGit(repo, name))).toBe(false);
      }
    } finally {
      env.GIT_CONFIG_GLOBAL = priorGlobal;
    }
    expect(fs.readdirSync(configured).sort()).toEqual(sentinels);
  });

  it('the scale-measure script inits its origin through the owned-template helper, never a bare git init', () => {
    const source = fs.readFileSync(path.join(REAL_ROOT, 'scripts', 'dossier_scale_measure.mjs'), 'utf8');
    expect(source).toContain("kit.gitInitFromEmptyTemplate(origin, ['-b', 'main'])");
    expect(source).not.toMatch(/'init', '-q'/);
  });

  it('the owned-template init runs under the fixture env, not the ambient process env', () => {
    // `init.defaultBranch` set only in the fixture env's config channel is honoured iff the helper passes that env to git.
    const env = FIXTURE_GIT_ENV as Record<string, string | undefined>;
    const priorKeys = { count: env.GIT_CONFIG_COUNT, key: env.GIT_CONFIG_KEY_2, value: env.GIT_CONFIG_VALUE_2 };
    env.GIT_CONFIG_COUNT = '3'; env.GIT_CONFIG_KEY_2 = 'init.defaultBranch'; env.GIT_CONFIG_VALUE_2 = 'fixture-env-branch';
    try {
      const repo = path.join(tempDir('dossier-env-pin-'), 'repo');
      gitInitFromEmptyTemplate(repo, []);
      expect(fs.readFileSync(path.join(repo, '.git', 'HEAD'), 'utf8')).toBe('ref: refs/heads/fixture-env-branch\n');
    } finally {
      env.GIT_CONFIG_COUNT = priorKeys.count; env.GIT_CONFIG_KEY_2 = priorKeys.key; env.GIT_CONFIG_VALUE_2 = priorKeys.value;
    }
  });

  it('refuses an identifier in FETCH_HEAD or logs/HEAD in upper case or run on, even the pinned commit\'s', async () => {
    const fetchHead = cloneAt(commits.A);
    const fetched = fs.readFileSync(dotGit(fetchHead, 'FETCH_HEAD'), 'latin1');
    fs.writeFileSync(dotGit(fetchHead, 'FETCH_HEAD'), `${commits.B.toUpperCase()}\t\tpasted\n${fetched}`);
    await refusedShape(fetchHead, `FETCH_HEAD names an object other than ${commits.A}`, false);
    fs.writeFileSync(dotGit(fetchHead, 'FETCH_HEAD'), fetched.replace(commits.A, commits.A.toUpperCase()));
    await refusedShape(fetchHead, `FETCH_HEAD names an object other than ${commits.A}`, false);
    fs.writeFileSync(dotGit(fetchHead, 'FETCH_HEAD'), `${commits.A}${commits.B.slice(0, 4)}\n`);
    await refusedShape(fetchHead, `FETCH_HEAD names an object other than ${commits.A}`, false);
    const log = cloneAt(commits.A);
    fs.appendFileSync(dotGit(log, 'logs', 'HEAD'), `${commits.A} ${commits.B.toUpperCase()} t <t@example.invalid> 1791330124 +0000\tcheckout: moving\n`);
    await refusedShape(log, `logs/HEAD names ${commits.B.toUpperCase()}, an object other than ${commits.A}`, false);
  });

  it('never reads the working tree: an uncommitted change, or a nested repository, does not change the listing or the decision', async () => {
    const clone = cloneAt(commits.A);
    fs.mkdirSync(path.join(clone, '.syzygy'));
    fs.writeFileSync(path.join(clone, '.syzygy', 'x.md'), 'uncommitted\n');
    fs.mkdirSync(path.join(clone, 'openspec'));
    fs.writeFileSync(path.join(clone, 'openspec', 'y.md'), 'uncommitted\n');
    fs.cpSync(fullCloneAt(commits.A), path.join(clone, 'nested'), { recursive: true });
    const { result } = await init({ clone });
    expect(result.ok && result.report.subject.governed.kind).toBe('unstated');
    // The residual is disclosed: the working tree outside .git is not inspected.
    expect(result.ok && result.report.disclosures.some(d => d.includes('the working tree outside .git is not inspected, though the agent reads the checked-out files'))).toBe(true);
    // So are the content .git's admitted files hold, and the host's own git configuration (R-POLARIS-DOSSIER-CLONE-SHAPE-2 notes 1 and 5).
    expect(result.ok && result.report.disclosures.some(d => d.includes('nor is the content of the hook samples, info/exclude, description and index, or FETCH_HEAD\'s text other than identifiers'))).toBe(true);
    expect(result.ok && result.report.disclosures.some(d => d.includes('global, system and environment git configuration (~/.gitconfig, /etc/gitconfig, GIT_CONFIG_*) is on the operator\'s host and was not'))).toBe(true);
  });
});

  const cli = async (argv: readonly string[], root: string, env: Record<string, string> = {}, projectInput: ProjectInputSource = NO_DRAWER) => {
    let stdout = '';
    let stderr = '';
    const sources = createPackageGateSources({ root, now: () => NOW, projectInput });
    const code = await runDossierCli(argv, { stdout: t => { stdout += t; }, stderr: t => { stderr += t; } }, { env, now: () => NOW, sources });
    return { code, stdout, stderr };
  };

describe('declared-source admission and continuation boundaries', () => {
  const edit = (run: string, change: (record: any) => void): void => {
    const file = path.join(run, 'run.json'); const record = JSON.parse(fs.readFileSync(file, 'utf8')); change(record); fs.writeFileSync(file, JSON.stringify(record));
  };
  const started = async () => { const out = await init(); if (!out.result.ok) throw new Error(out.result.refusal.reason); return { ...out, run: out.result.report.run }; };
  const guard = (run: string, root: string) => reverifyPinnedRevision(run, createPackageGateSources({ root, now: () => NOW }), NOW);
  it('never consults retired consent, registry, drawer, provider-statement or ruling ports', async () => {
    const root = records(); const base = createPackageGateSources({ root, now: () => NOW });
    const retired = async (): Promise<never> => { throw new Error('retired admission port called'); };
    const sources = { ...base, repositoryIdsFor: retired, observationConsentFor: retired, observationConsentNaming: retired, observationRecords: retired,
      consentedRevisionsFor: retired, registryEntry: retired, screeningPolicy: retired, rfc720Ruling: retired,
      projectInput: { drawerFor: retired }, providerStatements: { statementsFor: retired } };
    const result = await initRun({ clone: cloneAt(commits.U), url: URL_, configText: CONFIG, stateRoot: path.join(tempDir('declared-state-'), 'runs') }, { sources, now: () => NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const run = result.report.run;
    expect(JSON.parse(fs.readFileSync(path.join(run, 'raw-read-disclosure.json'), 'utf8'))).toEqual({
      schemaVersion: 'polaris-dossier-raw-read-disclosure/1', runId: result.report.runId,
      declaredProvider: 'anthropic', authorHandoff: 'not-reached',
    });
    expect(fs.existsSync(path.join(run, 'brief.json'))).toBe(false);
    expect(fs.existsSync(path.join(run, 'site'))).toBe(false);
    expect((await reverifyPinnedRevision(run, sources, NOW)).ok).toBe(true);
  });
  it.each(['public', 'private'] as const)('records explicit %s visibility as an attributed declaration', async visibility => {
    const root = records(); const result = await initRun({ clone: cloneAt(commits.A), url: URL_, visibility, configText: CONFIG, stateRoot: path.join(tempDir('declared-visible-'), 'runs') }, { sources: createPackageGateSources({ root, now: () => NOW }), now: () => NOW });
    expect(result.ok && result.report.subject.visibility).toEqual({ value: visibility, source: 'declaration', declaredBy: 'Tzeusy', label: 'Inferred' });
  });
  it('refuses a missing committed policy before any object read', async () => {
    const root = tempDir('declared-no-policy-'); const out = await init({ root });
    expect(refusal(out.result)).toMatchObject({ stage: 'policy', objectsRead: false }); expect(out.readerOpened).toBe(false); expect(fs.existsSync(out.stateRoot)).toBe(false);
  });
  it('cannot start or prepare a new run from a retained policy snapshot', async () => {
    const root = records(), actual = createPackageGateSources({ root, now: () => NOW });
    const retained = policyFixture(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json')));
    const sources = { ...actual, declaredPolicy: async () => ({ ...retained, binding: { ...retained.binding,
      path: '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json' } }) };
    const stateRoot = path.join(tempDir('declared-old-policy-'), 'runs');
    const out = await initRun({ clone: cloneAt(commits.A), url: URL_, configText: CONFIG, stateRoot }, { sources, now: () => NOW,
      openReader: () => { throw new Error('the reader must stay closed'); } });
    expect(refusal(out)).toMatchObject({ stage: 'policy', objectsRead: false,
      reason: 'a new run requires the current committed dossier policy binding' });
    expect(fs.existsSync(stateRoot)).toBe(false);
    expect(await preflight(URL_, sources, NOW)).toEqual({ ok: false,
      reason: 'preparation for a new run requires the current committed dossier policy binding' });
  });
  it('refuses malformed declarations before any object read', async () => {
    const out = await init({ url: 'https://user:fixture@example.invalid/repo' });
    expect(refusal(out.result)).toMatchObject({ stage: 'url', objectsRead: false }); expect(out.readerOpened).toBe(false);
  });
  it('refuses an explicit revision that differs from the supplied HEAD', async () => {
    const root = records(); const result = await initRun({ clone: cloneAt(commits.A), url: URL_, revision: commits.B, configText: CONFIG, stateRoot: path.join(tempDir('declared-pin-'), 'runs') }, { sources: createPackageGateSources({ root, now: () => NOW }), now: () => NOW });
    expect(refusal(result)).toMatchObject({ stage: 'revision', objectsRead: false });
  });
  it('rechecks committed policy bytes and refuses both dirty and committed policy changes', async () => {
    const { run, root } = await started(); expect((await guard(run, root)).ok).toBe(true);
    const file = path.join(root, DOSSIER_POLICY_PATH); fs.appendFileSync(file, ' ');
    expect(await guard(run, root)).toMatchObject({ ok: false, refusals: [{ code: 'policy' }] });
    gitIn(root, 'add', DOSSIER_POLICY_PATH); gitIn(root, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'different policy');
    expect(await guard(run, root)).toMatchObject({ ok: false, refusals: [{ code: 'policy-changed' }] });
  });
  it('keeps a retained v3 binding even when v4 is missing, and refuses if that v3 binding drifts', async () => {
    const { run, root } = await started();
    const policyPath = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json';
    const file = path.join(root, policyPath), bytes = fs.readFileSync(path.join(REAL_ROOT, policyPath));
    fs.writeFileSync(file, bytes);
    gitIn(root, 'add', policyPath);
    gitIn(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Retained v3');
    edit(run, record => {
      record.subject.screeningPolicy = { path: policyPath, commit: gitIn(root, 'rev-parse', 'HEAD'),
        policyId: 'polaris-butlers-project-shape-secrets', policyVersion: 'dossier-declared-source/3.0.0',
        sha256: createHash('sha256').update(bytes).digest('hex') };
    });
    const record = path.join(run, 'run.json'), before = fs.readFileSync(record);
    const subject = JSON.parse(before.toString()).subject;
    fs.unlinkSync(path.join(root, DOSSIER_POLICY_PATH));
    expect(await guard(run, root)).toMatchObject({ ok: true });
    expect(await loadDossierScreen(root, NOW, placementSubjectOf(subject))).toMatchObject({ ok: true,
      screen: { policyVersion: 'dossier-declared-source/3.0.0', policySha256: subject.screeningPolicy.sha256 } });
    fs.appendFileSync(file, ' ');
    expect(await guard(run, root)).toMatchObject({ ok: false, refusals: [{ code: 'policy',
      reason: expect.stringMatching(/v3\.json \(dossier-declared-source\/3\.0\.0\).*start a new run.*v4\.json \(dossier-declared-source\/4\.0\.0\)/) }] });
    expect(fs.readFileSync(record)).toEqual(before);
  });
  it('loads the URL origin policy independently and refuses absent, dirty or wrong-species bindings', () => {
    const root = records(), base = readCommittedPolicy(root);
    expect(base.ok).toBe(true); expect(readCommittedUrlOriginPolicy(root).ok).toBe(false);
    const file = path.join(root, DOSSIER_URL_ORIGIN_POLICY_PATH);
    const bytes = JSON.stringify({ policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', fixture: 'OWN-NONSECRET-ORIGIN' });
    fs.writeFileSync(file, bytes);
    expect(readCommittedUrlOriginPolicy(root).ok).toBe(false);
    gitIn(root, 'add', DOSSIER_URL_ORIGIN_POLICY_PATH); gitIn(root, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'own fixture origin policy');
    const origin = readCommittedUrlOriginPolicy(root);
    expect(origin).toMatchObject({ ok: true, binding: { path: DOSSIER_URL_ORIGIN_POLICY_PATH,
      policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', sha256: sha(bytes) } });
    expect(readCommittedPolicy(root)).toMatchObject({ ok: true, binding: { sha256: base.ok ? base.binding.sha256 : '' } });
    fs.appendFileSync(file, ' '); expect(readCommittedUrlOriginPolicy(root).ok).toBe(false);
    fs.writeFileSync(file, JSON.stringify({ policyId: 'OWN-WRONG-SPECIES', policyVersion: '1.0.0' }));
    gitIn(root, 'add', DOSSIER_URL_ORIGIN_POLICY_PATH); gitIn(root, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'own wrong species fixture');
    expect(readCommittedUrlOriginPolicy(root)).toEqual({ ok: false, why: 'the committed URL origin policy has an unsupported identity or version' });
  });
  it.each([DOSSIER_POLICY_PATH, DOSSIER_URL_ORIGIN_POLICY_PATH])('rechecks the coherent committed pair when %s changes', async changed => {
    const root = records(), overlay = path.join(root, DOSSIER_URL_ORIGIN_POLICY_PATH);
    const commit = (message: string) => gitIn(root, '-c', 'user.name=Own fixture', '-c', 'user.email=own@example.invalid', 'commit', '-qm', message, '--allow-empty');
    fs.writeFileSync(overlay, JSON.stringify({ policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0' }));
    gitIn(root, 'add', DOSSIER_URL_ORIGIN_POLICY_PATH);
    commit('Own origin policy');
    const base = readCommittedPolicy(root), origin = readCommittedUrlOriginPolicy(root);
    if (!base.ok || !origin.ok) throw new Error('Own committed policy pair is unreadable');
    const current = () => committedUrlPoliciesCurrent(root, base.binding, origin.binding);
    const currentAsync = () => committedUrlPoliciesCurrentAsync(root, base.binding, origin.binding);
    expect(current()).toBe(true);
    await expect(currentAsync()).resolves.toBe(true);
    commit('Own unrelated commit');
    gitIn(root, 'pack-refs', '--all');
    expect(current()).toBe(true);
    await expect(currentAsync()).resolves.toBe(true);
    const file = path.join(root, changed), bytes = fs.readFileSync(file);
    const pending = currentAsync();
    fs.appendFileSync(file, ' ');
    await expect(pending).resolves.toBe(false);
    expect(current()).toBe(false);
    await expect(currentAsync()).resolves.toBe(false);
    gitIn(root, 'add', changed);
    commit('Own changed policy');
    expect(current()).toBe(false);
    await expect(currentAsync()).resolves.toBe(false);
    fs.writeFileSync(file, bytes);
    expect(current()).toBe(false);
    await expect(currentAsync()).resolves.toBe(false);
  });
  it.each(['symlink', 'oversize', 'invalid-utf8', 'malformed-json'] as const)('refuses %s policy files without using their contents', kind => {
    const root = records(); const file = path.join(root, DOSSIER_POLICY_PATH);
    if (kind === 'symlink') {
      const other = path.join(tempDir('declared-policy-link-'), 'policy.json'); fs.copyFileSync(file, other); fs.unlinkSync(file); fs.symlinkSync(other, file);
    } else {
      fs.writeFileSync(file, kind === 'oversize' ? Buffer.alloc(2_097_153, 32) : kind === 'invalid-utf8' ? Buffer.concat([Buffer.from('{"policyId":"fixture","policyVersion":"'), Buffer.from([0xc3]), Buffer.from('"}')]) : '{');
      gitIn(root, 'add', DOSSIER_POLICY_PATH); gitIn(root, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'invalid fixture policy');
    }
    expect(readCommittedPolicy(root)).toMatchObject({ ok: false });
  });
  it('refuses a FIFO policy without waiting for a writer', async () => {
    const root = records(); const policy = path.join(root, DOSSIER_POLICY_PATH); fs.unlinkSync(policy); execFileSync('mkfifo', [policy]);
    const bundle = path.join(tempDir('declared-policy-fifo-'), 'read.mjs');
    buildSync({ stdin: { contents: `import { readCommittedPolicy } from ${JSON.stringify(path.join(REAL_ROOT, 'packages/polaris-dossier/src/policy-snapshot.ts'))}; process.stdout.write(JSON.stringify(readCommittedPolicy(process.argv[2])));`, resolveDir: REAL_ROOT }, bundle: true, platform: 'node', format: 'esm', conditions: ['source'], outfile: bundle });
    const { stdout } = await execFileAsync(process.execPath, [bundle, root], { encoding: 'utf8', timeout: 3000 });
    expect(JSON.parse(stdout)).toEqual({ ok: false, why: 'the dossier policy must be a bounded regular file' });
  });
  it('does not invalidate the policy binding for an unrelated Syzygy commit', async () => {
    const { run, root } = await started(); fs.writeFileSync(path.join(root, 'note.txt'), 'unrelated fixture'); gitIn(root, 'add', 'note.txt'); gitIn(root, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'unrelated');
    expect((await guard(run, root)).ok).toBe(true);
  });
  it('refuses a pin whose objects do not exist in the bound clone', async () => {
    const { run, root } = await started(); edit(run, r => { r.subject.pinnedRevision.commit = 'f'.repeat(40); });
    expect(await guard(run, root)).toMatchObject({ ok: false, refusals: [{ code: 'listing' }] });
  });
  it('refuses provider and tool drift after a brief binds their declarations', async () => {
    const { run, root } = await started(); fs.writeFileSync(path.join(run, 'brief.json'), JSON.stringify({ pinnedRevision: commits.A, sourceBindingSha256: 'a'.repeat(64), agent: { tool: 'claude-code', provider: 'anthropic' } }));
    edit(run, r => { r.declared.agentProvider = 'openai'; });
    expect(await guard(run, root)).toMatchObject({ ok: false, refusals: expect.arrayContaining([{ code: 'declared-changed', reason: expect.any(String) }]) });
  });
  it('every local continuation command leaves a legacy run and its retained log byte-equal', async () => {
    const { run, root } = await started(); edit(run, r => { r.format = 'polaris-dossier-run/1'; });
    fs.writeFileSync(path.join(run, 'steps.jsonl'), '{"retained":"original history"}\n');
    const capture = (): Record<string, string> => Object.fromEntries(fs.readdirSync(run, { recursive: true }).map(String).sort().map(name => [name, fs.readFileSync(path.join(run, name)).toString('base64')]));
    const before = capture();
    for (const argv of [['brief', run], ['check', run], ['inventory-brief', run], ['inventory-check', run], ['review-packet', run, '--kind', 'fidelity'], ['review-check', run], ['render', run], ['close', run], ['session-prompt', run, 'inventory'], ['launch-form', run, 'inventory', 'terminal'], ['status', run]]) {
      const result = await cli(argv, root); expect.soft(result.code, argv[0]).toBe(1); expect.soft(result.stdout + result.stderr, argv[0]).toContain('start a new run'); expect.soft(capture(), argv[0]).toEqual(before);
    }
  });
  it('refuses legacy /1 without rewriting its bytes or artifacts', async () => {
    const { run, root } = await started(); edit(run, r => { r.format = 'polaris-dossier-run/1'; });
    const file = path.join(run, 'run.json'); const before = fs.readFileSync(file); const names = fs.readdirSync(run);
    const result = await guard(run, root); expect(result).toMatchObject({ ok: false, refusals: [{ code: 'record-invalid', reason: expect.stringContaining('start a new run') }] });
    expect(fs.readFileSync(file)).toEqual(before); expect(fs.readdirSync(run)).toEqual(names);
  });
});

describe('preflight: declared metadata preparation', () => {
  const run = (root: string, input = URL_) => preflight(input, createPackageGateSources({ root, now: () => NOW }), NOW);

  it('prepares a locator and committed policy with every retired record port inaccessible', async () => {
    const root = commitPolicyFixture(tempDir('preflight-no-records-'), policyFixture().bytes);
    const actual = createPackageGateSources({ root, now: () => NOW });
    const sources = new Proxy(actual, { get(target, key) {
      if (key !== 'declaredPolicy') throw new Error(`retired source port read: ${String(key)}`);
      return target.declaredPolicy;
    } });
    const result = await preflight(URL_, sources, NOW);
    expect(result).toMatchObject({ ok: true, report: {
      outcome: 'prepared', url: 'github.com/redis/redis', label: 'Inferred',
      repository: { repositoryId: 'redis-redis', identitySource: 'derived' },
      revision: { state: 'Unknown' }, visibility: { default: 'private', label: 'Inferred' },
      screeningPolicy: { policyVersion: 'dossier-declared-source/4.0.0' },
    } });
    if (!result.ok) return;
    expect(result.report).not.toHaveProperty('consentedRevisions');
    expect(result.report).not.toHaveProperty('cloneCommands');
    expect(result.report.disclosures).toContain('Prepared is not run readiness: the selected commit, supplied clone, declared provider/configuration and current policy still require validation at launch.');
  });

  it('neither missing nor present historical acts change preparation', async () => {
    expect(await run(records())).toMatchObject({ ok: true, report: { outcome: 'prepared' } });
    expect(await run(records({ [CONSENT_ACT]: null, [POLICY_ACT]: null, [REGISTRY_ACT]: null })))
      .toMatchObject({ ok: true, report: { outcome: 'prepared' } });
  });

  it('refuses missing or changed committed policy rather than using a policy act', async () => {
    const root = records();
    fs.appendFileSync(path.join(root, DOSSIER_POLICY_PATH), '\n');
    expect(await run(root)).toMatchObject({ ok: false, reason: 'the dossier policy differs from its committed bytes; start only from a committed policy' });
    fs.unlinkSync(path.join(root, DOSSIER_POLICY_PATH));
    expect((await run(root)).ok).toBe(false);
  });

  it('refuses a credential-bearing locator before consulting any source port and never echoes it', async () => {
    const sources = new Proxy({} as ReturnType<typeof createPackageGateSources>, { get() { throw new Error('source read before URI validation'); } });
    const result = await preflight('https://user:token@github.com/redis/redis', sources, NOW);
    expect(result).toEqual({ ok: false, reason: 'the repository URL is not admitted: an https://, http:// or git:// locator carries no user information; it is not printed, stored or recorded' });
  });

  it('screens secret-shaped metadata before returning a normalized locator', async () => {
    const nonsecretCanary = 'AKIA' + 'A'.repeat(16);
    const result = await run(records(), `https://git.example.org/team/${nonsecretCanary}`);
    expect(result).toEqual({ ok: false, reason: 'the repository locator is excluded by the committed metadata screening policy; it is not printed or stored' });
    expect(JSON.stringify(result)).not.toContain(nonsecretCanary);
  });

  it('normalizes another host and derives identity without matching any consent', async () => {
    expect(await run(records(), 'https://git.example.org/team/tool.git')).toMatchObject({ ok: true, report: {
      outcome: 'prepared', url: 'git.example.org/team/tool', repository: { repositoryId: 'team-tool', identitySource: 'derived' },
    } });
    expect(await run(records(), 'https://git.example.org/tool')).toMatchObject({ ok: true, report: {
      repository: { repositoryId: null, identitySource: 'requires-explicit-identity' },
    } });
  });
});

describe('the CLI: preflight and init', () => {
  const configFile = (): string => { const file = path.join(tempDir('dossier-config-'), 'run.json'); fs.writeFileSync(file, CONFIG); return file; };

  it('init refuses with no state root, there being no default', async () => {
    const clone = cloneAt(commits.A);
    const result = await cli(['init', clone, '--url', URL_, '--config', configFile(), '--json'], records());
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({ command: 'init', outcome: 'refused', stage: 'state-root', reason: 'no state root: pass --state-root <dir> or set SYZYGY_DOSSIER_STATE_ROOT; there is no default, and none is derived from the clone', objectsRead: false });
  });
  it('init takes the state root from the environment when no flag is given, and the flag over the environment', async () => {
    const fromEnv = path.join(tempDir('dossier-state-'), 'env');
    const viaEnv = await cli(['init', cloneAt(commits.A), '--url', URL_, '--config', configFile(), '--json'], records(), { SYZYGY_DOSSIER_STATE_ROOT: fromEnv });
    expect(viaEnv.code).toBe(0);
    expect(JSON.parse(viaEnv.stdout).run.startsWith(`${fromEnv}/run-`)).toBe(true);
    const fromFlag = path.join(tempDir('dossier-state-'), 'flag');
    const viaFlag = await cli(['init', cloneAt(commits.A), '--url', URL_, '--config', configFile(), '--state-root', fromFlag, '--json'], records(), { SYZYGY_DOSSIER_STATE_ROOT: fromEnv });
    expect(JSON.parse(viaFlag.stdout).run.startsWith(`${fromFlag}/run-`)).toBe(true);
  });
  it('init refuses a missing configuration file and prints the refusal in both forms', async () => {
    const missing = path.join(tempDir('dossier-config-'), 'absent.json');
    const result = await cli(['init', cloneAt(commits.A), '--url', URL_, '--config', missing, '--state-root', path.join(tempDir('s-'), 'r'), '--json'], records());
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ stage: 'config', reason: `${missing} cannot be read (ENOENT)` });
    expect(result.stderr).toContain('stage: config\n');
  });
  it.each([
    [['init'], 'init takes exactly one positional argument, the clone directory'],
    [['init', '/c'], 'init requires --config <run.json>'],
    [['init', '/c', '--url'], '--url requires a value'],
    [['init', '/c', '--url', 'u', '--url', 'v'], '--url given more than once'],
    [['init', '/c', '--force'], 'unknown option: --force'],
    [['preflight'], 'preflight takes exactly one argument, the repository URL'],
    [['preflight', URL_, '--provider'], 'unknown option for preflight: --provider'],
  ])('exits 2 for %j', async (argv, detail) => {
    const result = await cli(argv, records());
    expect(result.code).toBe(2);
    expect(result.stderr.startsWith(`syzygy dossier: ${detail}\n`)).toBe(true);
  });
  it('preflight exits 0 for preparation without registry records and 1 for a missing committed policy', async () => {
    const prepared = await cli(['preflight', URL_, '--json'], records({ [REGISTRY_ACT]: null }));
    expect(prepared.code).toBe(0);
    expect(JSON.parse(prepared.stdout).outcome).toBe('prepared');
    const root = records();
    fs.unlinkSync(path.join(root, DOSSIER_POLICY_PATH));
    const missing = await cli(['preflight', URL_, '--json'], root);
    expect(missing.code).toBe(1);
    expect(JSON.parse(missing.stdout)).toMatchObject({ command: 'preflight', outcome: 'refused' });
    expect(missing.stdout).not.toContain('observation consent:');
  });
});

describe('the package gate sources answer whether another act\'s observation consent names a revision (REQ-polaris-generation-047\'s class rule)', () => {
  it('answers from the observation records in force, for any repository, and is unsatisfied for an identifier none names', async () => {
    const sources = createPackageGateSources({ root: records(), now: () => NOW });
    expect(await sources.observationConsentNaming(commits.A)).toEqual({ satisfied: true, record: 'PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7' });
    expect((await sources.observationConsentNaming(commits.U)).satisfied).toBe(false);
    expect((await sources.observationConsentNaming('f'.repeat(40))).satisfied).toBe(false);
  });
});

// syzygy-3efd.24 (REQ-polaris-generation-046 from specification version 2.6): new runs bind the successor; a run bound to the predecessor
// is screened under it, never moved, and a step of it that can no longer read the predecessor refuses with the restart explanation,
// changing no file of the run. Expected values are literals.
describe('the declared-source policy successor 2.0.0 and runs bound to its predecessor', () => {
  const V1 = fs.readFileSync(path.join(REAL_ROOT, DOSSIER_PREDECESSOR_POLICY_PATH));
  const RESTART = (why: string): string => `this run is bound to the screening policy .syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json (dossier-declared-source/1.0.0), which can no longer be read as its binding (${why}); `
    + 'a run is never re-screened under another version or moved to it, so start a new run, which binds .syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json (dossier-declared-source/4.0.0)';
  const commitFile = (root: string, rel: string, bytes: Buffer | null, message: string): void => {
    if (bytes === null) gitIn(root, 'rm', '-q', rel);
    else { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), bytes); gitIn(root, 'add', rel); }
    gitIn(root, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', message);
  };
  const capture = (dir: string): string => JSON.stringify(fs.readdirSync(dir, { recursive: true }).map(String).sort().map(rel => {
    const file = path.join(dir, rel); return [rel, fs.statSync(file).isFile() ? sha(fs.readFileSync(file, 'utf8')) : 'dir'];
  }));
  /** A started run whose record binds the predecessor, in a records root that commits the predecessor beside the successor. */
  const predecessorRun = async () => {
    const out = await init(); if (!out.result.ok) throw new Error(out.result.refusal.reason);
    const run = out.result.report.run;
    commitFile(out.root, DOSSIER_PREDECESSOR_POLICY_PATH, V1, 'predecessor policy');
    const file = path.join(run, 'run.json'); const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    record.subject.screeningPolicy = { ...record.subject.screeningPolicy, path: DOSSIER_PREDECESSOR_POLICY_PATH, policyVersion: 'dossier-declared-source/1.0.0',
      sha256: createHash('sha256').update(V1).digest('hex') };
    fs.writeFileSync(file, JSON.stringify(record));
    return { run, root: out.root, subject: record.subject };
  };

  it('a new run binds the successor, names governance-text among its classes, and its screen sends a design document as governance-text', async () => {
    const out = await init(); if (!out.result.ok) throw new Error(out.result.refusal.reason);
    const subject = out.result.report.subject;
    expect([subject.screeningPolicy.path, subject.screeningPolicy.policyVersion, subject.contentClasses]).toEqual([
      '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json', 'dossier-declared-source/4.0.0', ['code-content', 'project-documentation', 'governance-text']]);
    const stored = JSON.parse(fs.readFileSync(path.join(out.result.report.run, 'run.json'), 'utf8'));
    expect(stored.subject.contentClasses).toEqual(['code-content', 'project-documentation', 'governance-text']);
    const load = await loadDossierScreen(out.root, NOW, placementSubjectOf(subject));
    if (!load.ok) throw new Error(load.why);
    expect(['design/storage.rst', 'pkg/design-overview.rst', 'ARCHITECTURE.md'].map(p => [load.screen.contentClass(p), load.screen.stageOf(p)]))
      .toEqual([['governance-text', 2], ['governance-text', 2], ['governance-text', 2]]);
  });

  it('a run bound to the predecessor is screened under it, never under the successor', async () => {
    const { run, root, subject } = await predecessorRun();
    expect((await reverifyPinnedRevision(run, createPackageGateSources({ root, now: () => NOW }), NOW)).ok).toBe(true);
    const load = await loadDossierScreen(root, NOW, placementSubjectOf(subject));
    if (!load.ok) throw new Error(load.why);
    expect([load.screen.policyVersion, load.screen.twoStage, load.screen.screenPath('.ssh/deploy.sh'), load.screen.contentClass('.ssh/deploy.sh'), load.screen.screenPath('ARCHITECTURE.md')])
      .toEqual(['dossier-declared-source/1.0.0', false, undefined, 'code-content', 'unknown-extraction-class']);
  });

  it.each<[string, Buffer | null, string, string]>([
    ['removed', null, 'policy', 'the committed dossier screening policy cannot be read as bounded UTF-8 JSON'],
    ['changed', Buffer.concat([V1, Buffer.from(' ')]), 'policy-changed', 'the committed policy identity, version or bytes differ from this run binding'],
  ])('a step of a run bound to the predecessor, %s, refuses with the restart explanation and changes no file of the run', async (_name, bytes, code, why) => {
    const { run, root, subject } = await predecessorRun();
    commitFile(root, DOSSIER_PREDECESSOR_POLICY_PATH, bytes, 'predecessor gone or changed');
    const before = capture(run);
    expect(await reverifyPinnedRevision(run, createPackageGateSources({ root, now: () => NOW }), NOW)).toMatchObject({ ok: false, refusals: [{ code, reason: RESTART(why) }] });
    const load = await loadDossierScreen(root, NOW, placementSubjectOf(subject));
    expect(load).toEqual({ ok: false, why: RESTART(bytes === null ? why : 'the committed policy bytes differ from this run binding') });
    expect(capture(run)).toBe(before);
  });

  it('a records root may bind no other policy path', () => {
    expect(readCommittedPolicy(records(), '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'))
      .toEqual({ ok: false, why: 'the dossier policy path is not one a run may bind' });
  });
});

// Current policy and every real role share this boundary. Synthetic metadata is
// tested under the committed policy, without provider access or credentials.
it('initializes every supported role under the current declared-source policy', () => {
  const policy = buildDossierScreen(policyFixture().bytes, true, null, 'private');
  expect(policy.ok).toBe(true); if (!policy.ok) throw new Error(policy.why);
  const { screen } = policy;
  const run = 'run-' + 'a'.repeat(32), sessionId = '12345678-1234-4234-8234-123456789012';
  expect(screen.screenSecrets(`syzygy:${run}:author:${sessionId}`)).toBe('secret-detector-match');
  for (const role of ['author', 'inventory', 'fidelity', 'design'] as const) {
    const compiled = createSessionProfile({ binding: { run, role, sourceBinding: sha('owned source'), policy: screen.policySha256,
      provider: 'anthropic', model: DEFAULT_SESSION_MODEL }, sessionId, systemPrompt: 'Use the owned fixture tools.',
      initialPrompt: 'Read the owned fixture.', utcDate: '2026-11-22', kernelRelease: '7.0.0-fixture' });
    expect(compiled.ok).toBe(true); if (!compiled.ok) throw new Error(compiled.reason);
    const { profile } = compiled.value;
    expect(() => createSessionController({ profile, declaredClasses: SESSION_CONTENT_CLASSES,
      initialOrigin: { binding: profile.input.binding, id: 'initial:owned', kind: 'initial-prompt',
        canonicalText: profile.input.initialPrompt, classes: ['governance-text'], originIds: ['host:owned-fixture'] },
      scanSecrets: text => screen.screenSecrets(text) !== undefined,
      validateToolInput: () => false,
    })).not.toThrow();
    if (role === 'design') {
      const ordered = createOrderedDesignSessionProfile(profile.input);
      expect(ordered.ok).toBe(true); if (!ordered.ok) throw new Error(ordered.reason);
      expect(screen.screenSecrets(ordered.value.profile.baselineOrigin.canonicalText)).toBeUndefined();
    }
  }
});

// REQ-polaris-generation-046 keeps the exact policy for older runs and names the current policy on refusal.
describe('the current declared-source policy and runs bound to version 2.0.0', () => {
  const V2 = fs.readFileSync(path.join(REAL_ROOT, DOSSIER_REACH_POLICY_PATH));
  const RESTART = (why: string): string => `this run is bound to the screening policy .syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json (dossier-declared-source/2.0.0), which can no longer be read as its binding (${why}); `
    + 'a run is never re-screened under another version or moved to it, so start a new run, which binds .syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json (dossier-declared-source/4.0.0)';
  const commitFile = (root: string, rel: string, bytes: Buffer | null, message: string): void => {
    if (bytes === null) gitIn(root, 'rm', '-q', rel);
    else { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), bytes); gitIn(root, 'add', rel); }
    gitIn(root, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', message);
  };
  const capture = (dir: string): string => JSON.stringify(fs.readdirSync(dir, { recursive: true }).map(String).sort().map(rel => {
    const file = path.join(dir, rel); return [rel, fs.statSync(file).isFile() ? sha(fs.readFileSync(file, 'utf8')) : 'dir'];
  }));
  /** A started run whose record binds 2.0.0, in a records root that commits 2.0.0 beside 4.0.0. */
  const reachRun = async () => {
    const out = await init(); if (!out.result.ok) throw new Error(out.result.refusal.reason);
    const run = out.result.report.run;
    commitFile(out.root, DOSSIER_REACH_POLICY_PATH, V2, 'version 2.0.0 policy');
    const file = path.join(run, 'run.json'); const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    record.subject.screeningPolicy = { ...record.subject.screeningPolicy, path: DOSSIER_REACH_POLICY_PATH, policyVersion: 'dossier-declared-source/2.0.0',
      sha256: createHash('sha256').update(V2).digest('hex') };
    fs.writeFileSync(file, JSON.stringify(record));
    return { run, root: out.root, subject: record.subject };
  };

  it('a new run binds 4.0.0, and its screen places a re-admitted format', async () => {
    const out = await init(); if (!out.result.ok) throw new Error(out.result.refusal.reason);
    const subject = out.result.report.subject;
    expect([subject.screeningPolicy.path, subject.screeningPolicy.policyVersion]).toEqual([
      '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json', 'dossier-declared-source/4.0.0']);
    const load = await loadDossierScreen(out.root, NOW, placementSubjectOf(subject));
    if (!load.ok) throw new Error(load.why);
    expect(['src/app/Main.scala', 'design/storage.adoc', 'src/app/main.vb'].map(p => load.screen.screenPath(p) ?? `${load.screen.contentClass(p)}/${load.screen.stageOf(p)}`))
      .toEqual(['code-content/2', 'governance-text/2', 'unknown-extraction-class']);
  });

  it('a run bound to 2.0.0 continues under its exact predecessor binding', async () => {
    const { run, root, subject } = await reachRun();
    expect((await reverifyPinnedRevision(run, createPackageGateSources({ root, now: () => NOW }), NOW)).ok).toBe(true);
    const load = await loadDossierScreen(root, NOW, placementSubjectOf(subject));
    if (!load.ok) throw new Error(load.why);
    expect([load.screen.policyVersion, load.screen.twoStage, load.screen.screenPath('src/app/Main.scala'), load.screen.contentClass('outputs.tf')])
      .toEqual(['dossier-declared-source/2.0.0', true, 'unknown-extraction-class', 'code-content']);
  });

  it.each<[string, Buffer | null, string, string]>([
    ['removed', null, 'policy', 'the committed dossier screening policy cannot be read as bounded UTF-8 JSON'],
    ['changed', Buffer.concat([V2, Buffer.from(' ')]), 'policy-changed', 'the committed policy identity, version or bytes differ from this run binding'],
  ])('a step of a run bound to 2.0.0, %s, refuses with the restart explanation and changes no file of the run', async (_name, bytes, code, why) => {
    const { run, root, subject } = await reachRun();
    commitFile(root, DOSSIER_REACH_POLICY_PATH, bytes, 'version 2.0.0 gone or changed');
    const before = capture(run);
    expect(await reverifyPinnedRevision(run, createPackageGateSources({ root, now: () => NOW }), NOW)).toMatchObject({ ok: false, refusals: [{ code, reason: RESTART(why) }] });
    const load = await loadDossierScreen(root, NOW, placementSubjectOf(subject));
    expect(load).toEqual({ ok: false, why: RESTART(bytes === null ? why : 'the committed policy bytes differ from this run binding') });
    expect(capture(run)).toBe(before);
  });
});

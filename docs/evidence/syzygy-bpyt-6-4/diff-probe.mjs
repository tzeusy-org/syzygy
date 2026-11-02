// Old-versus-new differential probe for syzygy-bpyt.6.4 (DC-4, typed Unknown reasons).
// Usage: node diff-probe.mjs <built clone> <out.json>
//   Build the clone with `npm run build:poc` first. TMPDIR must be a short private directory: the
//   fixture repositories sit under it and their paths enter the model, so two outputs are comparable
//   only when made under the same TMPDIR string (both committed outputs used TMPDIR=/tmp/b64t).
// Every digest is taken with node:crypto directly.
//
// Corpus, one row per model:
//   the syzygy-bpyt.6.3 project-shape variants and ten prose mutations, the item-state fixtures
//   (unknown, contradicted), and the non-claim Unknown producers this bead retypes: unreachable code
//   structure and work items, non-JSON and malformed work-item answers, no seeds, a materialized
//   worker change without, with, mismatched and failing test artifacts.
// Per model: the JSON digest and length, responseIdentity, every GET route pocRoutes registers
// (human, machine, presentation, source pages per source identity) under the direct and the tailnet
// Host header, as status, content type and body digest; and the deriveUnknownSubjects population.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: diff-probe.mjs <built clone> <out.json>');
const load = (p) => import(pathToFileURL(join(root, p)).href);
const core = await load('packages/three-surface-poc-core/dist/index.js');
const fx = await load('apps/three-surface-poc/dist/test-model-fixture.js');
const shape = await load('apps/three-surface-poc/dist/test-project-shape-fixture.js');
const judg = await load('apps/three-surface-poc/dist/test-walkthrough-judgment-fixture.js');
const { pocRoutes } = await load('apps/three-surface-poc/dist/routes.js');
const { TAILNET_HOST } = await load('apps/three-surface-poc/dist/browser-origin.js');
const { SOURCE_IDENTITY_PARAM } = await load('apps/three-surface-poc/dist/polaris-source.js');

const h = (v) => createHash('sha256').update(v).digest('hex');
const owned = [];
const tmp = process.env.TMPDIR ?? '/tmp';
const PINNED = { ...process.env, GIT_AUTHOR_DATE: '2026-08-29T00:00:00Z', GIT_COMMITTER_DATE: '2026-08-29T00:00:00Z' };
const git = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: PINNED, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const realGit = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });

function fixed(name, made) {
  const path = join(tmp, name);
  rmSync(path, { recursive: true, force: true });
  cpSync(made.repoRoot, path, { recursive: true });
  return { repoRoot: path, revision: made.revision };
}
const fixedRepo = fixed('probe-fixed-fixture-repo', fx.fixtureRepoWithGit(owned));
const build = (options = {}) => fx.buildFixtureModel(owned, { fixtureRepo: fixedRepo, ...options });

// A worker-change repository: the sweep test's commit naming the materialized Bead.
const workerRepo = (() => {
  const made = fixed('probe-worker-repo', fx.fixtureRepoWithGit(owned));
  for (const [path, contents] of [
    ['src/butlers/connectors/whatsapp_user_client.py', 'x = 1\n'],
    ['tests/connectors/test_whatsapp_user_client.py', 'def test_normalization(): pass\n'],
  ]) {
    mkdirSync(dirname(join(made.repoRoot, path)), { recursive: true });
    writeFileSync(join(made.repoRoot, path), contents, 'utf8');
  }
  git(made.repoRoot, ['add', '-A']);
  git(made.repoRoot, ['-c', 'user.name=probe', '-c', 'user.email=probe@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fix(whatsapp): normalize single-event sender [bu-sweep-1]']);
  const changed = git(made.repoRoot, ['rev-parse', 'HEAD']);
  git(made.repoRoot, ['update-ref', 'refs/remotes/origin/main', changed]);
  git(made.repoRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);
  return { ...made, changed };
})();

// A lifecycle-contradicted repository: the followed change also present under archive/.
const archivedRepo = (() => {
  const made = fixed('probe-archived-repo', fx.fixtureRepoWithGit(owned));
  const path = 'openspec/changes/archive/2026-08-01-repair-whatsapp-identity-reconciliation/proposal.md';
  mkdirSync(dirname(join(made.repoRoot, path)), { recursive: true });
  writeFileSync(join(made.repoRoot, path), '# archived\n', 'utf8');
  git(made.repoRoot, ['add', '-A']);
  git(made.repoRoot, ['-c', 'user.name=probe', '-c', 'user.email=probe@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'archive copy']);
  return { repoRoot: made.repoRoot, revision: git(made.repoRoot, ['rev-parse', 'HEAD']) };
})();

const rows = [{ revision: 'dolt-rev-2', id: 'bu-sweep-1', title: 'Materialized work item', status: 'in_progress', issue_type: 'task', priority: 2, created_at: '2026-08-30T00:00:00Z', updated_at: '2026-08-30T00:00:00Z', closed_at: null }];
const workerBase = {
  seeds: fx.BUTLERS_POC_SEEDS ?? core.BUTLERS_POC_SEEDS,
  repoRoot: workerRepo.repoRoot,
  repositoryRevision: workerRepo.changed,
  observerRevision: workerRepo.revision,
  evaluation: { snapshot: 'butlers@worker-change', asOf: '2026-08-30T12:00:00Z' },
  materializationRecord: { beadId: 'bu-sweep-1', externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization', targetRepoRoot: workerRepo.repoRoot, createdAt: '2026-08-30T00:00:00Z', doltRevisionAtCreation: 'dolt-rev-1', attribution: 'test-actor' },
  runWorkItemQuery: (_r, sql) => (sql.includes('WHERE id LIKE') ? JSON.stringify(rows) : JSON.stringify([{ revision: 'dolt-rev-2' }])),
};
const seam = workerBase.seeds.workerChangeSeam;
const artifact = (commit, overrides = {}) => ({
  provenance: 'operator-reported',
  command: ['python3', '-m', 'pytest', seam.testPath, '-q'],
  exitCode: 0,
  ingestedAt: '2026-08-30T06:00:00Z',
  repositoryCommit: commit,
  scope: seam.testPath,
  digest: 'sha256:' + '1'.repeat(64),
  summary: '3 passed, 0 failed, 0 errored, 0 skipped in 0.42s',
  ...overrides,
});
const plainInput = (snapshot, extra) => ({
  seeds: workerBase.seeds,
  repoRoot: fixedRepo.repoRoot,
  repositoryRevision: fixedRepo.revision,
  observerRevision: fixedRepo.revision,
  evaluation: { snapshot, asOf: '2026-08-30T12:00:00Z' },
  ...extra,
});

const HOSTS = { direct: '127.0.0.1:7478', tailnet: TAILNET_HOST };
function served(model) {
  const routes = pocRoutes(() => model).filter((r) => r.method === 'GET');
  const sources = model.projectShape.kind === 'observed' ? model.projectShape.sources.map((s) => s.identity) : [];
  const out = {};
  for (const route of routes) {
    const queries = route.path.endsWith('/polaris/source') || route.path.includes('source') ? ['', ...sources.slice(0, 40)] : [''];
    for (const [hostName, host] of Object.entries(HOSTS)) {
      for (const q of queries) {
        const query = new URLSearchParams(q === '' ? '' : `${SOURCE_IDENTITY_PARAM}=${encodeURIComponent(q)}`);
        const response = route.handle({ request: { method: 'GET', path: route.path, query, headers: { host } } });
        out[`${route.path}${q === '' ? '' : `?${h(q).slice(0, 12)}`}@${hostName}`] = { status: response.status, contentType: response.contentType, sha256: h(response.body), bytes: Buffer.byteLength(response.body) };
      }
    }
  }
  return out;
}

function probe(label, make) {
  try {
    const model = make();
    const json = JSON.stringify(model);
    return {
      label,
      modelSha256: h(json),
      modelBytes: json.length,
      responseIdentity: core.buildResponseIdentity(model),
      unknownSubjects: model.unknownSubjects.map((s) => `${s.id}|${s.epistemic.closedReason}|${h(JSON.stringify(s.epistemic)).slice(0, 16)}`),
      routes: served(model),
    };
  } catch (error) {
    return { label, error: String(error && error.message ? error.message : error).slice(0, 300) };
  }
}

const TEXTS = shape.PROJECT_SHAPE_FIXTURE_TEXTS;
const ADMIT = shape.ADMITTING_AUTHORITY;
const gitFor = (texts) => shape.projectShapeFixtureGit(texts);
const withShape = (texts, extra = {}) => build({ projectShape: { authority: ADMIT, runGit: gitFor(texts) }, ...extra });
const mapTexts = (fn) => Object.fromEntries(Object.entries(TEXTS).map(([p, t]) => [p, fn(t, p)]));
const firstKey = Object.keys(TEXTS)[0];
const BARE_ROOT = { ...TEXTS, 'about/README.md': TEXTS['about/README.md'].split('\n### Precedence Order')[0] };
const failing = (inner, verb) => (args) => { if (args[0] === verb) throw new Error(`fixture: ${verb} refused`); return inner(args); };

const VARIANTS = {
  unevaluated: () => build(),
  rejected: () => build({ projectShape: { authority: shape.REJECTING_AUTHORITY, runGit: gitFor(TEXTS) } }),
  observed: () => withShape(TEXTS),
  'observed-without-precedence': () => withShape(shape.PROJECT_SHAPE_FIXTURE_TEXTS_WITHOUT_PRECEDENCE),
  'observed-bare-root': () => withShape(BARE_ROOT),
  'observed-with-secret': () => withShape(shape.PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET),
  'observed-with-baseline-spec': () => withShape(shape.PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC),
  'observation-failed-ls-tree': () => build({ projectShape: { authority: ADMIT, runGit: failing(gitFor(TEXTS), 'ls-tree') } }),
  'observation-failed-cat-file': () => build({ projectShape: { authority: ADMIT, runGit: failing(gitFor(TEXTS), 'cat-file') } }),
  'observation-failed-show': () => build({ projectShape: { authority: ADMIT, runGit: failing(gitFor(TEXTS), 'show') } }),
  'item-unknown': () => shape.projectShapeItemStateFixture(withShape(TEXTS), 'unknown'),
  'item-contradicted': () => shape.projectShapeItemStateFixture(withShape(TEXTS), 'contradicted'),
  'judgment-absent': () => build({ walkthroughJudgment: judg.walkthroughJudgmentFixture('absent-run-record') }),
  'judgment-unlawful': () => build({ walkthroughJudgment: judg.walkthroughJudgmentFixture('unlawful') }),
  'judgment-ready': () => build({
    projectShape: { authority: ADMIT, runGit: gitFor(TEXTS) },
    walkthroughJudgment: judg.walkthroughJudgmentFixture('lawful-state-1', 'judgment-eval-0001', { traversed: ['/polaris'] }),
  }),
  unreachable: () => core.buildPocModel(plainInput('butlers@unreachable', {
    runGit: (r, args) => { if (args[0] === 'ls-tree') throw new Error('refused'); return realGit(r, args); },
    runWorkItemQuery: () => { throw new Error('connection refused'); },
  })),
  'work-items-non-json': () => core.buildPocModel(plainInput('butlers@non-json', { runWorkItemQuery: () => 'not json' })),
  'work-items-bad-shape': () => core.buildPocModel(plainInput('butlers@bad-shape', { runWorkItemQuery: () => '{"a":1}' })),
  'work-items-two-revisions': () => core.buildPocModel(plainInput('butlers@two-rev', {
    runWorkItemQuery: (_r, sql) => (sql.includes('WHERE id LIKE') ? JSON.stringify([{ ...rows[0], revision: 'a' }, { ...rows[0], id: 'bu-x', revision: 'b' }]) : JSON.stringify([{ revision: 'a' }])),
  })),
  'lifecycle-contradicted': () => fx.buildFixtureModel(owned, { fixtureRepo: archivedRepo }),
  'no-seeds': () => core.buildPocModel({ repoRoot: fixedRepo.repoRoot, repositoryRevision: fixedRepo.revision, observerRevision: fixedRepo.revision, evaluation: { snapshot: 'butlers@no-seeds', asOf: '2026-08-30T12:00:00Z' } }),
  'worker-change': () => core.buildPocModel(workerBase),
  'worker-change-reported': () => core.buildPocModel({ ...workerBase, testArtifactRecord: artifact(workerRepo.changed) }),
  'worker-change-mismatched': () => core.buildPocModel({ ...workerBase, testArtifactRecord: artifact('a-different-commit-entirely') }),
  'worker-change-failed': () => core.buildPocModel({ ...workerBase, testArtifactRecord: artifact(workerRepo.changed, { exitCode: 1 }) }),
  'worker-change-no-intent': () => core.buildPocModel({ ...workerBase, seeds: { ...workerBase.seeds, workerChangeIntentId: '' }, testArtifactRecord: artifact(workerRepo.changed) }),
};

const MUTATIONS = {
  crlf: (t) => t.replace(/\n/g, '\r\n'),
  'appended-prose': (t) => `${t}\nAn appended sentence that is only prose.\n`,
  'agent-claim': (t) => `${t}\nDrafted by agent: Claude Code and recorded by the syzygy daemon.\n`,
  'fence-line': (t, p) => (p === firstKey ? `${t}\n\`\`\`\nnot a fence close\n` : t),
  'emptied-file': (t, p) => (p === firstKey ? '' : t),
  unicode: (t) => t.replace(/^(#+ )(.*)$/gm, '$1$2 é\u{1F600}'),
  'secret-token': (t) => `${t}\nAKIAABCDEFGHIJKLMNOP\n`,
  'duplicated-row': (t) => t.replace(/^(- .*)$/m, '$1\n$1'),
  uppercase: (t) => t.toUpperCase(),
  retitled: (t) => t.replace(/^# .*$/m, '# A different title'),
};

const models = [];
for (const [name, make] of Object.entries(VARIANTS)) models.push(probe(`variant:${name}`, make));
for (const [name, fn] of Object.entries(MUTATIONS)) models.push(probe(`mutation:${name}`, () => withShape(mapTexts(fn))));

writeFileSync(out, JSON.stringify({ models }, null, 1) + '\n');
for (const dir of owned) rmSync(dir, { recursive: true, force: true });
rmSync(fixedRepo.repoRoot, { recursive: true, force: true });
rmSync(workerRepo.repoRoot, { recursive: true, force: true });
rmSync(archivedRepo.repoRoot, { recursive: true, force: true });
const routeRows = models.reduce((n, m) => n + Object.keys(m.routes ?? {}).length, 0);
console.log(`models ${models.length} errors ${models.filter((m) => m.error).length} routeRows ${routeRows} unknownSubjects ${models.reduce((n, m) => n + (m.unknownSubjects?.length ?? 0), 0)}`);
for (const m of models.filter((x) => x.error)) console.log(`error ${m.label}: ${m.error}`);

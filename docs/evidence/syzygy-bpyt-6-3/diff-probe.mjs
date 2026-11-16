// Old-versus-new differential probe for syzygy-bpyt.6.3 (DC-3): model, rendered bytes, response identity.
// Usage: node diff-probe.mjs <built clone> <out.json> <governance revision>
//   TMPDIR must be a short private directory: the fixture builders copy a fixture repository under it.
//   The output depends on the TMPDIR string: the fixture repository sits at <TMPDIR>/probe-fixed-fixture-repo and that path
//   enters 24 of the 68 compared rows (every model row). Two outputs are comparable only when made under the same TMPDIR.
//   The committed probe-output.json was made with TMPDIR=/tmp/lc63x (a directory you create); the same tree under another
//   TMPDIR differs from it in those 24 rows and in no other, which is not a behaviour change.
// Run once in a clone at the base commit and once at the head, each built with `npm run build:poc`, then
// compare the two outputs with compare-probe.py. Every digest below is taken with node:crypto directly,
// never through the helper under test.
//
// Corpus:
//  A  the twelve Polaris model variants of polaris-copy.test.ts, plus the project-shape texts altered by ten
//     prose mutations (CRLF, appended prose, an agent claim, a fence line, an emptied file, Unicode, a secret
//     token, a duplicated row, upper-casing, a retitled heading), through buildFixtureModel;
//     per model: JSON digest, responseIdentity, deep-freeze census, and the three rendered surfaces at two
//     mount prefixes;
//  B  the two owner-act gates (body-read authority, walkthrough judgment) through their production loaders at
//     <governance revision>: JSON digest and deep-freeze census of each evaluation; contentDigestOf over a byte corpus; draftOwnerAct over an artifact corpus; digestCanonicalJson over a
//     value corpus; resourceLimitsDigest over mutated limits.
import { createHash } from 'node:crypto';
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, out, revision] = process.argv.slice(2);
if (revision === undefined) throw new Error('usage: diff-probe.mjs <built clone> <out.json> <governance revision>');
const load = (p) => import(pathToFileURL(join(root, p)).href);
const core = await load('packages/three-surface-poc-core/dist/index.js');
const gen = await load('packages/polaris-generation-core/dist/canonical-json.js');
const fx = await load('apps/three-surface-poc/dist/test-model-fixture.js');
const shape = await load('apps/three-surface-poc/dist/test-project-shape-fixture.js');
const judg = await load('apps/three-surface-poc/dist/test-walkthrough-judgment-fixture.js');
const { renderPolarisPage } = await load('apps/three-surface-poc/dist/polaris.js');
const { renderTrajectoryPage } = await load('apps/three-surface-poc/dist/trajectory.js');
const { renderOrreryPage } = await load('apps/three-surface-poc/dist/orrery.js');

const h = (v) => createHash('sha256').update(v).digest('hex');
const owned = [];

// The fixture repository path enters the model (root, targetRepoRoot, the inputs digest, the response identity),
// and the builders mint a random one per call. Build every model over one copy at a fixed path so that two runs
// of the same tree are byte-identical; the revision is already pinned by the builder.
const fixedRepo = (() => {
  const made = fx.fixtureRepoWithGit(owned);
  const fixedPath = join(process.env.TMPDIR ?? '/tmp', 'probe-fixed-fixture-repo');
  rmSync(fixedPath, { recursive: true, force: true });
  cpSync(made.repoRoot, fixedPath, { recursive: true });
  return { repoRoot: fixedPath, revision: made.revision };
})();
const build = (options = {}) => fx.buildFixtureModel(owned, { fixtureRepo: fixedRepo, ...options });

function census(value) {
  const seen = new Set();
  let objects = 0;
  let frozen = 0;
  const unfrozen = [];
  const walk = (v, path) => {
    if (v === null || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (ArrayBuffer.isView(v)) return;
    objects++;
    if (Object.isFrozen(v)) frozen++;
    else if (unfrozen.length < 10) unfrozen.push(path);
    for (const [k, c] of Object.entries(v)) walk(c, `${path}/${k}`);
  };
  walk(value, '');
  return { objects, frozen, unfrozen };
}

function surfaces(model) {
  const pages = {};
  for (const prefix of ['', '/m']) {
    pages[`polaris${prefix}`] = h(renderPolarisPage(model, prefix));
    pages[`trajectory${prefix}`] = h(renderTrajectoryPage(model, prefix));
    pages[`orrery${prefix}`] = h(renderOrreryPage(model, prefix));
  }
  return pages;
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
      freeze: census(model),
      pages: surfaces(model),
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
const VARIANTS = {
  unevaluated: () => build(),
  rejected: () => build({ projectShape: { authority: shape.REJECTING_AUTHORITY, runGit: gitFor(TEXTS) } }),
  observed: () => withShape(TEXTS),
  'observed-without-precedence': () => withShape(shape.PROJECT_SHAPE_FIXTURE_TEXTS_WITHOUT_PRECEDENCE),
  'observed-bare-root': () => withShape(BARE_ROOT),
  'observed-with-secret': () => withShape(shape.PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET),
  'observed-with-baseline-spec': () => withShape(shape.PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC),
  'observation-failed': () => {
    const inner = gitFor(TEXTS);
    return build({ projectShape: { authority: ADMIT, runGit: (args) => { if (args[0] === 'ls-tree') throw new Error('fixture: tree listing refused'); return inner(args); } } });
  },
  'judgment-absent': () => build({ walkthroughJudgment: judg.walkthroughJudgmentFixture('absent-run-record') }),
  'judgment-unlawful': () => build({ walkthroughJudgment: judg.walkthroughJudgmentFixture('unlawful') }),
  'judgment-lawful': () => build({ walkthroughJudgment: judg.walkthroughJudgmentFixture('lawful-state-1') }),
  'judgment-ready': () => build({
    projectShape: { authority: ADMIT, runGit: gitFor(TEXTS) },
    walkthroughJudgment: judg.walkthroughJudgmentFixture('lawful-state-1', 'judgment-eval-0001', { traversed: ['/polaris'] }),
  }),
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
// the same mutation on a model that also carries a lawful judgment, so readiness sees altered prose
for (const name of ['agent-claim', 'crlf']) {
  models.push(probe(`mutation+judgment:${name}`, () => withShape(mapTexts(MUTATIONS[name]), {
    walkthroughJudgment: judg.walkthroughJudgmentFixture('lawful-state-1', 'judgment-eval-0001', { traversed: ['/polaris'] }),
  })));
}

// B. direct helpers
const gov = await load('apps/three-surface-poc/dist/governance-inputs.js');
const walk = await load('apps/three-surface-poc/dist/walkthrough-inputs.js');
const gateOptions = { repoRoot: root, governanceRevision: revision, evaluationInstant: '2026-10-21T18:00:00Z' };
const bodyEvaluation = core.evaluateBodyReadAuthority(gov.loadBodyReadAuthorityInputs({ ...gateOptions, evaluationId: 'evaluation:probe' }));
const judgmentEvaluation = core.evaluateWalkthroughJudgment(
  walk.walkthroughJudgmentInputsFor({ ...gateOptions, evaluationId: 'evaluation:probe-judgment' })({ evaluationIdentity: 'probe' }),
);
const gates = [['body-read-authority', bodyEvaluation], ['walkthrough-judgment', judgmentEvaluation]]
  .map(([label, evaluation]) => ({ label, sha256: h(JSON.stringify(evaluation)), freeze: census(evaluation) }));
const bytesCorpus = [
  new Uint8Array(0), new Uint8Array([0]), new Uint8Array([0xef, 0xbb, 0xbf, 0x61]), Uint8Array.from({ length: 256 }, (_, i) => i),
  new TextEncoder().encode('é\u{1F600} line\r\nline\n'), new Uint8Array(70000).fill(97), new Uint8Array([0xc3, 0x28]),
];
const contentDigests = bytesCorpus.map((b) => core.contentDigestOf(b));

const CLAIM = { claimId: 'claim:a', epistemic: { label: 'Unknown', reasons: { primary: 'no-currency-bound-declared', secondary: [] }, freshness: 'fresh' } };
const artifacts = ['', 'a', 'policies:\n  currency-bound: 30d\n', 'é\u{1F600}', 'x'.repeat(100000), 'a\0b', '\ud800'];
const drafts = artifacts.map((bytes) => core.draftOwnerAct({ reason: 'no-currency-bound-declared', claims: [CLAIM], artifact: { path: '.syzygy/policies/q.yaml', bytes }, actType: 'policy' }));

const limits = { maxBytes: 1 << 20, maxNodes: 10000, maxDepth: 32 };
const values = [null, true, 0, -0, 1.5, 'a', 'é\u{1F600}', [], {}, [1, [2, [3]]], { b: 1, a: { d: [], c: null } }, { '': '', 'é': 'x' }, { a: 'x'.repeat(5000) }];
const digests = values.map((v) => gen.digestCanonicalJson(v, limits));
const refused = [undefined, NaN, Infinity, { a: undefined }, Object.create(null), new Date(0), { get a() { return 1; } }].map((v) => {
  try { return gen.digestCanonicalJson(v, limits); } catch (error) { return { refused: error.code ?? error.message }; }
});
const limitsDigests = [core.PWB_RESOURCE_LIMITS, ...Object.keys(core.PWB_RESOURCE_LIMITS).filter((k) => typeof core.PWB_RESOURCE_LIMITS[k] === 'number').map((k) => ({ ...core.PWB_RESOURCE_LIMITS, [k]: core.PWB_RESOURCE_LIMITS[k] + 1 }))]
  .map((l) => core.resourceLimitsDigest(l));

writeFileSync(out, JSON.stringify({ models, helpers: { gates, contentDigests, drafts, digests, refused, limitsDigests } }, null, 1) + '\n');
for (const dir of owned) rmSync(dir, { recursive: true, force: true });
rmSync(fixedRepo.repoRoot, { recursive: true, force: true });
console.log(`models ${models.length} errors ${models.filter((m) => m.error).length} contentDigests ${contentDigests.length} drafts ${drafts.length} canonical ${digests.length}+${refused.length} limits ${limitsDigests.length}`);

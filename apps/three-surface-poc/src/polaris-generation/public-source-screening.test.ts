import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { withConsent, POLICY_ACT_FORMS, type AdmissionRecord } from '@syzygy/polaris-generation-consent';
import { DEFAULT_DISCOVERY_BUDGET, discoverAndSelect, excludedSourceId, generationSourceIdentity, generationSourcesForBody, gitBlobObjectId, runGenerationPipeline, stageSchema, validateGenerationSources, validateStage, reviewVerdict, type GenerationSource, type PipelinePorts, type PipelineResult } from '@syzygy/polaris-generation-core';
import { compileDetectors, detectSecrets, PWB_DENIED_PATH_RULES, PWB_SECRET_POLICY } from '@syzygy/three-surface-poc-core';

import { renderDossier } from './dossier-render.js';
import { runSyntheticProject, syntheticProjects } from './pipeline-demo.js';
import { checkoutPolicyActPort, screenedRepoCorpusVerifier, loadPublicSourceScreen, readScreenedRepoCorpus, type PublicSourcePolicyActPort } from './public-source-screening.js';
import { buildPipelineRequest, CorpusRefusal, readRepoCorpus, type CorpusAdmissionPort, type ReaderConfig } from './repo-corpus.js';

// Every secret is assembled at runtime so no literal token sits in this file.
const SECRETS = {
  'private-key-material': `-----BEGIN ${'OPENSSH'} PRIVATE KEY-----\nAAAAsyntheticfixture\n`,
  'known-token-formats': `const id = "${'AK'}IA${'Q'.repeat(16)}";\n`,
  'credential-assignment': `db_${'pass'}word = "${'correcthorse'}-fixture"\n`,
  'credential-bearing-url': `const u = "https://alice:${'hunter2'}@example.invalid/";\n`,
} as const;
const SENTINEL = 'SCREEN-SENTINEL-7f3a';
const PATH_TOKEN = `${'AK'}IA${'R'.repeat(16)}`, DIR_TOKEN = `${'gh'}p_${'x'.repeat(30)}`;
// A detector match beyond the first 100,000-character piece of an oversize body.
const LATE_SECRET = `${SENTINEL}\n${'int filler_line_of_code = 0;\n'.repeat(4000)}${SECRETS['known-token-formats']}`;
const FILES: Record<string, string | Buffer> = {
  'src/clean.c': `int answer(void) { return 42; } /* ${'clean-body-marker'} */\n`,
  'src/secret-key-material.txt': `${SENTINEL}\n${SECRETS['private-key-material']}`,
  'src/secret-token.js': `${SENTINEL}\n${SECRETS['known-token-formats']}`,
  'src/secret-assignment.py': `${SENTINEL}\n${SECRETS['credential-assignment']}`,
  'src/secret-url.ts': `${SENTINEL}\n${SECRETS['credential-bearing-url']}`,
  // A detector runs inside inert code contexts too.
  'docs/secret-fenced.md': `${SENTINEL}\n\`\`\`\n${SECRETS['private-key-material']}\`\`\`\n`,
  'docs/active-script.md': `${SENTINEL}\n<script>alert(1)</script>\n`,
  'docs/active-unclosed.md': `${SENTINEL}\n\`\`\`\nnever closed\n`,
  // An inert fence keeps markup inert: admitted.
  'docs/inert.md': '# Inert\n\n```html\n<b>shown as code</b>\n```\n',
  '.env': `${SENTINEL}\nX=1\n`,
  'certs/denied-server.pem': `${SENTINEL}\n`,
  // Denied by the `.env.` prefix although `.c` is a code-content extension: only the denied-path rule withholds it.
  'config/.env.c': `${SENTINEL} env-prefixed source\n`,
  // A detector match in a file name or a directory name withholds the blob unread.
  [`src/${PATH_TOKEN}.ts`]: `${SENTINEL} path-token\n`,
  [`keys/${DIR_TOKEN}/a.c`]: `${SENTINEL} dir-token\n`,
  // No code-content extension (the match is case-sensitive): indeterminate, withheld unread.
  'README-screen-fixture': `${SENTINEL} no extension\n`,
  'docs/guide-screen.rst': `${SENTINEL} prose\n`,
  'src/UPPER-SCREEN.C': `${SENTINEL} upper-case extension\n`,
  // Excluded for the reader's own reasons; with a screen in force they are withheld rows too.
  'assets/logo-screen.bin': Buffer.from([0, 1, 2, 3]),
  'src/empty-screen.c': '',
  'src/late-secret.c': LATE_SECRET,
};
const WITHHELD = Object.keys(FILES).filter(path => !['src/clean.c', 'docs/inert.md'].includes(path));
const UNREAD = ['.env', 'certs/denied-server.pem', 'config/.env.c', `src/${PATH_TOKEN}.ts`, `keys/${DIR_TOKEN}/a.c`, 'README-screen-fixture', 'docs/guide-screen.rst', 'src/UPPER-SCREEN.C'];
const FIXTURE_EXTENSIONS = ['.c', '.js', '.py', '.ts', '.md', '.txt', '.bin'];
const fixtureScope = (sourceExtensions: unknown = FIXTURE_EXTENSIONS) => ({ contentClassification: { rules: [{ class: 'code-structure', rule: 'paths' }, { class: 'code-content', sourceExtensions }] } });
const allow: CorpusAdmissionPort = { decide: async () => ({ allowed: true, permissionIdentity: 'fixture-consent-v1' }) };
const budget = { maxCalls: 7, maxInputBytes: 5_000_000, maxOutputBytes: 1_000_000, maxUsageUnits: 100, maxElapsedMs: 30_000, maxRepairCycles: 1, accountingPolicy: 'fixture-v1' };

const policyBytes = (extra: Record<string, unknown> = { publicSourceScope: fixtureScope() }): Uint8Array => new TextEncoder().encode(`${JSON.stringify({
  policyId: 'synthetic-public-source-policy', policyVersion: '9.9.0-fixture.1',
  sourceAdmission: { deniedPathBasenames: PWB_DENIED_PATH_RULES.basenames, deniedPathPrefixes: PWB_DENIED_PATH_RULES.prefixes, deniedPathSuffixes: PWB_DENIED_PATH_RULES.suffixes },
  detectors: PWB_SECRET_POLICY.detectors, ...extra,
}, null, 2)}\n`);
const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
// The version-1 recorder's form: its title, one Date line and the identity that date gives (POLICY_ACT_FORMS[0], written out here).
const actRecord = (digest: string, overrides: { readonly title?: string; readonly date?: string; readonly identity?: string; readonly type?: string; readonly artifact?: string } = {}): string => [
  overrides.title ?? '# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope)', '',
  overrides.date ?? 'Date: 2026-10-03', '',
  overrides.identity ?? 'Act identity: `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-03`', '',
  overrides.type ?? 'Act type: `approve-policy`', '',
  'Project identity: `project:syzygy`', '',
  overrides.artifact ?? 'Artifact identity: `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`', '',
  `Exact digest (SHA-256): \`${digest}\``, '',
].join('\n');
const port = (record: string | undefined, policy: Uint8Array | undefined): PublicSourcePolicyActPort => ({ read: async () => ({ actRecord: record, policy }) });
const goodPolicy = policyBytes();
const goodPort = port(actRecord(sha(goodPolicy)), goodPolicy);

let root = '', commit = '', emptyRoot = '', emptyCommit = '';
const fixtureRepo = (files: Record<string, string | Buffer>): { root: string; commit: string } => {
  const dir = tempDir('syzygy-public-screen-');
  const run = (...args: string[]): string => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
  run('init', '-q'); run('config', 'gc.auto', '0'); run('config', 'maintenance.auto', 'false'); run('config', 'user.email', 'f@example.invalid'); run('config', 'user.name', 'F');
  for (const [path, body] of Object.entries(files)) { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), body); }
  run('add', '-A'); run('commit', '-q', '--allow-empty', '-m', 'fixture');
  return { root: dir, commit: run('rev-parse', 'HEAD') };
};
beforeAll(() => {
  ({ root, commit } = fixtureRepo(FILES));
  ({ root: emptyRoot, commit: emptyCommit } = fixtureRepo({}));
});

const cfg = (revision = commit) => ({ repositoryId: 'repository:fixture', revision, include: ['**'], exclude: [], oversize: 'split' as const });
const leaks = (text: string): string[] => [SENTINEL, PATH_TOKEN, DIR_TOKEN, 'filler_line_of_code', ...Object.values(SECRETS).map(secret => secret.trim()), ...WITHHELD].filter(needle => text.includes(needle));
const objectIdOf = (path: string, repo = root, revision = commit): string => execFileSync('git', ['-C', repo, 'rev-parse', `${revision}:${path}`], { encoding: 'utf8' }).trim();

describe('synthetic secrets of each detector class', () => {
  it('each fixture matches exactly its own detector, so each class is exercised alone', () => {
    for (const [id, text] of Object.entries(SECRETS)) {
      const hits = PWB_SECRET_POLICY.detectors.filter(detector => detectSecrets(compileDetectors({ detectors: [detector] }), text) !== undefined).map(detector => detector.id);
      expect(hits).toEqual([id]);
    }
  });

  it('withholds every secret, active-content, denied-path, indeterminate, binary and empty blob and admits the rest', async () => {
    const corpus = await readScreenedRepoCorpus(root, cfg(), { admission: allow, policyAct: goodPort });
    expect(corpus.count).toMatchObject({ listed: 20, selected: 20, deniedPath: 3, secretDetectorMatches: 8, activeContent: 2, indeterminate: 3, binaryOrNonUtf8: 1, emptyFiles: 1, sourceRows: 20 });
    const reasons = corpus.sources.filter(source => source.exclusion.excluded).map(source => source.exclusion.excluded ? source.exclusion.reason : '').sort();
    expect(reasons).toEqual(['active-content', 'active-content', 'binary-or-non-utf8', 'denied-path', 'denied-path', 'denied-path', 'empty-file',
      ...Array(8).fill('secret-detector-match'), 'unknown-extraction-class', 'unknown-extraction-class', 'unknown-extraction-class']);
    expect(corpus.sources.filter(source => !source.exclusion.excluded).map(source => source.path).sort()).toEqual(['docs/inert.md', 'src/clean.c']);
    validateGenerationSources(corpus.sources);
  });

  it('a withheld row carries an opaque per-run id and no path, object id or body', async () => {
    const key = Buffer.alloc(32, 7);
    const a = await readScreenedRepoCorpus(root, cfg(), { admission: allow, policyAct: goodPort, runKey: key });
    const b = await readScreenedRepoCorpus(root, cfg(), { admission: allow, policyAct: goodPort, runKey: key });
    const c = await readScreenedRepoCorpus(root, cfg(), { admission: allow, policyAct: goodPort, runKey: Buffer.alloc(32, 8) });
    const ids = (corpus: typeof a) => corpus.sources.filter(source => source.exclusion.excluded).map(source => source.sourceId).sort();
    expect(ids(a)).toEqual(ids(b));
    expect(ids(a).filter(id => ids(c).includes(id))).toEqual([]);
    const plain = await readRepoCorpus(root, cfg(), { admission: allow });
    expect(ids(a).filter(id => plain.sources.some(source => source.sourceId === id))).toEqual([]);
    for (const source of a.sources.filter(row => row.exclusion.excluded)) {
      expect(source).toEqual({ repositoryId: 'repository:fixture', revision: commit, path: `withheld/${source.sourceId}`, objectId: null,
        evaluationId: `corpus:repository:fixture@${commit}`, sourceId: source.sourceId, classificationBasis: 'body', exclusion: source.exclusion, spans: [] });
      expect(source.sourceId).toMatch(/^s-[0-9a-f]{24}$/u);
    }
  });

  it('a denied path, a path with a detector match and an indeterminate blob are withheld without their blobs being read', async () => {
    const read: string[][] = [];
    const { readGitBlobsBatch } = await import('../git-blob-batch.js');
    await readScreenedRepoCorpus(root, cfg(), { admission: allow, policyAct: goodPort, readBlobs: (repo, objects) => { read.push([...objects]); return readGitBlobsBatch(repo, objects); } });
    const unreadIds = UNREAD.map(path => objectIdOf(path));
    expect(new Set(unreadIds).size).toBe(UNREAD.length);
    expect(read.flat().filter(id => unreadIds.includes(id))).toEqual([]);
    expect(read.flat()).toHaveLength(12);
  });

  it('a secret in an unrepresentable path is counted, and the path, its digest and its object id are not carried', async () => {
    const only = fixtureRepo({ 'src/ok.c': 'int ok;\n', [`src/back\\${DIR_TOKEN}.c`]: 'int a;\n', [`src/new\nline-${DIR_TOKEN}.c`]: 'int b;\n' });
    writeFileSync(Buffer.concat([Buffer.from(`${only.root}/src/bad-`), Buffer.from([0xff]), Buffer.from(`-${DIR_TOKEN}.c`)]), 'int c;\n');
    execFileSync('git', ['-C', only.root, 'add', '-A']); execFileSync('git', ['-C', only.root, 'commit', '-qm', 'odd names']);
    const revision = execFileSync('git', ['-C', only.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const ids = execFileSync('git', ['-C', only.root, 'ls-tree', '-r', '-z', revision], { encoding: 'utf8' }).split('\0').filter(Boolean)
      .filter(row => !row.endsWith('\tsrc/ok.c')).map(row => row.split(' ')[2]!.split('\t')[0]!);
    expect(ids).toHaveLength(3);
    const corpus = await readScreenedRepoCorpus(only.root, cfg(revision), { admission: allow, policyAct: goodPort });
    expect(corpus.count).toMatchObject({ listed: 4, unquotablePath: 3, selected: 1, unquotablePathSecretMatches: 3, secretDetectorMatches: 0, sourceRows: 1 });
    expect(corpus.unrepresentable).toEqual([]);
    const serialized = JSON.stringify(corpus);
    expect(serialized).not.toContain(DIR_TOKEN);
    for (const id of ids) expect(serialized).not.toContain(id);
    // Without a screen the reader still lists them by digest, as before.
    expect((await readRepoCorpus(only.root, cfg(revision), { admission: allow })).unrepresentable).toHaveLength(3);
  });

  it('screens the whole body before splitting: a match past the first 100,000-character piece withholds the file', async () => {
    expect(LATE_SECRET.length).toBeGreaterThan(100_000);
    expect(LATE_SECRET.indexOf(SECRETS['known-token-formats'])).toBeGreaterThan(100_000);
    const only = fixtureRepo({ 'src/late-secret.c': LATE_SECRET.replace(SENTINEL, 'late') });
    const corpus = await readScreenedRepoCorpus(only.root, cfg(only.commit), { admission: allow, policyAct: goodPort });
    expect(corpus.count).toMatchObject({ selected: 1, secretDetectorMatches: 1, sourceRows: 1 });
    expect(corpus.sources[0]!.exclusion).toEqual({ excluded: true, reason: 'secret-detector-match' });
  });

  it('an oversize body excluded by configuration is a withheld row, not a path-bearing one', async () => {
    const big = `${'int clean_padding_line = 0;\n'.repeat(4000)}`;
    const only = fixtureRepo({ 'src/oversize-screen.c': big });
    const corpus = await readScreenedRepoCorpus(only.root, { ...cfg(only.commit), oversize: 'exclude' }, { admission: allow, policyAct: goodPort });
    expect(corpus.count).toMatchObject({ selected: 1, oversizeFiles: 1, oversizeExcluded: 1, sourceRows: 1 });
    const [row] = corpus.sources;
    expect(row).toMatchObject({ path: `withheld/${row!.sourceId}`, objectId: null, exclusion: { excluded: true, reason: 'oversize-source-excluded' }, spans: [] });
    expect(JSON.stringify(corpus)).not.toContain('oversize-screen');
  });

  it('one run key keys the withheld rows and an ordinary excluded row alike (syzygy-75ds)', async () => {
    const key = Buffer.alloc(32, 9);
    const { readGitBlobsBatch } = await import('../git-blob-batch.js');
    const cleanId = execFileSync('git', ['-C', root, 'rev-parse', `${commit}:src/clean.c`], { encoding: 'utf8' }).trim();
    const corpus = await readScreenedRepoCorpus(root, cfg(), { admission: allow, policyAct: goodPort, runKey: key,
      readBlobs: (repo, objects) => new Map([...readGitBlobsBatch(repo, objects)].map(([id, bytes]) => [id, id === cleanId ? new Uint8Array([0]) : bytes])) });
    // Under a screen an ordinary exclusion is a withheld row too: keyed by the same run key, with no path or object id.
    const sourceId = excludedSourceId(key, generationSourceIdentity({ repositoryId: 'repository:fixture', revision: commit, path: 'src/clean.c', objectId: cleanId }));
    expect(corpus.sources.find(source => source.sourceId === sourceId)).toEqual({ repositoryId: 'repository:fixture', revision: commit, path: `withheld/${sourceId}`, objectId: null,
      evaluationId: `corpus:repository:fixture@${commit}`, sourceId, classificationBasis: 'body', exclusion: { excluded: true, reason: 'binary-or-non-utf8' }, spans: [] });
    expect(corpus.sources.some(source => source.path === 'src/clean.c')).toBe(false);
  });
});

describe('excluded bodies never leave the process', () => {
  it('no secret, path or body reaches the provider port, its receipts, the run record or a rendered page', async () => {
    const corpus = await readScreenedRepoCorpus(root, cfg(), { admission: allow, policyAct: goodPort });
    // Discovery's model ports see only what the corpus admitted.
    const offered: unknown[] = [];
    const discovery = await discoverAndSelect(corpus.sources, ['What is it?'], DEFAULT_DISCOVERY_BUDGET, {
      permitted: async () => true, receipt: async receipt => { offered.push(receipt); },
      map: async input => { offered.push(input); return { claims: input.items.map(item => ({ blobId: item.blobId, claim: 'fixture claim', relevance: 1 })), usageUnits: 1 }; },
      reduce: async input => { offered.push(input); return { ranked: input.subsystems.flatMap(group => group.claims.map(claim => claim.blobId)), usageUnits: 1 }; },
    });
    expect(offered.length).toBeGreaterThan(0);
    expect(JSON.stringify(offered)).toContain('clean-body-marker');
    expect(leaks(JSON.stringify(offered))).toEqual([]);
    expect(leaks(JSON.stringify(discovery.report))).toEqual([]);
    const config: ReaderConfig = { ...cfg(), readerQuestions: [{ id: 'core-ideas', topics: ['core-ideas'], text: 'What is it?' }], requestedAssets: [{ id: 'overview', kind: 'section', required: true }], budget };
    const request = buildPipelineRequest(corpus, config, 1_000);
    const sent: string[] = [], receipts: unknown[] = [];
    let ordinal = 0;
    const ports: PipelinePorts = {
      now: () => 1_000, verifySources: async () => true, permissionIdentity: async () => 'fixture-permission',
      admit: async () => ({ kind: 'reserved', permit: { attemptId: `a${ordinal++}`, maxUsageUnits: 5, maxOutputBytes: 10_000 } }),
      permitted: async () => true, releaseUnsent: async () => undefined, responseSchema: stageSchema, validate: validateStage, fidelity: reviewVerdict,
      // The stubbed provider: it records every byte offered and answers nothing usable, so the run stops after one call.
      generate: async input => { sent.push(input.system, input.input); return { body: '{}', model: 'stub', usageUnits: 1 }; },
      record: async (permit, outcome) => { receipts.push({ permit, outcome }); },
      lateReceipt: async () => undefined,
    };
    const result: PipelineResult = await runGenerationPipeline(request, ports, new AbortController().signal);
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.join('\n')).toContain('clean-body-marker');
    expect(leaks(sent.join('\n'))).toEqual([]);
    expect(leaks(JSON.stringify(receipts))).toEqual([]);
    expect(leaks(JSON.stringify(result))).toEqual([]);
    // The run record the trigger writes, and the full request with its sources.
    expect(leaks(JSON.stringify({ permissionIdentity: corpus.permissionIdentity, corpusCount: corpus.count, request }))).toEqual([]);
    const synthetic = await runSyntheticProject(syntheticProjects[0]!);
    if (synthetic.result.status !== 'awaiting-rendered-review') throw new Error('synthetic pipeline stopped');
    const withheld: GenerationSource[] = corpus.sources.filter(source => source.exclusion.excluded);
    const { files } = renderDossier({ result: synthetic.result, sources: [...synthetic.sources, ...withheld] });
    const pages = [...files.values()].join('\n');
    for (const source of withheld) expect(pages).toContain(source.sourceId);
    expect(leaks(pages)).toEqual([]);
  });
});

describe('the policy act gate fails closed', () => {
  const refusal = async (policyAct: PublicSourcePolicyActPort): Promise<string> => {
    let touched = false;
    const watching: CorpusAdmissionPort = { decide: async request => { touched = true; return allow.decide(request); } };
    const error = await readScreenedRepoCorpus(root, cfg(), { admission: watching, policyAct }).then(() => undefined, (caught: unknown) => caught);
    expect(error).toBeInstanceOf(CorpusRefusal);
    expect(touched).toBe(false);
    return (error as CorpusRefusal).reason;
  };
  it('refuses with no act in force, saying why when the port says', async () => {
    expect(await refusal(port(undefined, goodPolicy))).toBe('public-source-policy: no screening-scope policy act is in force');
    const why: PublicSourcePolicyActPort = { read: async () => ({ actRecord: undefined, why: 'fixture reason', policy: goodPolicy }) };
    expect(await refusal(why)).toBe('public-source-policy: no screening-scope policy act is in force (fixture reason)');
  });
  it('refuses with no policy', async () => { expect(await refusal(port(actRecord(sha(goodPolicy)), undefined))).toMatch(/^public-source-policy: no policy/u); });
  it('refuses when the policy does not hash to the act argument', async () => {
    expect(await refusal(port(actRecord(sha(goodPolicy)), policyBytes({ publicSourceScope: { purpose: 'other bytes' } })))).toBe('public-source-policy: policy bytes do not hash to the act argument');
  });
  it('refuses an act record of another act', async () => {
    const digest = sha(goodPolicy);
    for (const overrides of [{ identity: 'Act identity: `PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-2026-10-02`' }, { type: 'Act type: `approve-registry-entry`' }, { artifact: 'Artifact identity: `other.json`' },
      // No recorder's title; another form's identity under this form's title; an identity for another date; two dates.
      { title: '# Owner act — synthetic fixture' },
      { identity: 'Act identity: `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-03`' },
      { date: 'Date: 2026-10-04' }, { date: 'Date: 2026-10-03\n\nDate: 2026-10-03' }]) {
      expect(await refusal(port(actRecord(digest, overrides), goodPolicy))).toBe('public-source-policy: act record is not a public-source scope approve-policy act');
    }
  });
  it('admits each later recorder\'s form at its own identity', async () => {
    const digest = sha(goodPolicy);
    for (const [title, identity] of [
      ['# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope, version 2)', 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-03'],
      ['# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope, version 3)', 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-APPROVAL-2026-10-03'],
    ] as const) {
      expect((await loadPublicSourceScreen(port(actRecord(digest, { title, identity: `Act identity: \`${identity}\`` }), goodPolicy))).policySha256).toBe(digest);
    }
  });
  it('refuses a record naming two digests', async () => {
    expect(await refusal(port(`${actRecord(sha(goodPolicy))}Exact digest (SHA-256): \`${'0'.repeat(64)}\`\n`, goodPolicy))).toBe('public-source-policy: act record does not name exactly one exact digest');
  });
  it('refuses approved bytes without a publicSourceScope', async () => {
    const bare = policyBytes({});
    expect(await refusal(port(actRecord(sha(bare)), bare))).toBe('public-source-policy: policy carries no publicSourceScope');
  });
  it('refuses a policy whose detectors or denied paths cannot be read', async () => {
    const noDetectors = policyBytes({ publicSourceScope: fixtureScope(), detectors: [] });
    expect(await refusal(port(actRecord(sha(noDetectors)), noDetectors))).toMatch(/^public-source-policy: detectors: /u);
    // Each of the three lists, missing alone, refuses.
    for (const missing of ['deniedPathBasenames', 'deniedPathPrefixes', 'deniedPathSuffixes']) {
      const lists: Record<string, readonly string[]> = { deniedPathBasenames: ['.env'], deniedPathPrefixes: ['.env.'], deniedPathSuffixes: ['.pem'] };
      delete lists[missing];
      const noDenied = policyBytes({ publicSourceScope: fixtureScope(), sourceAdmission: lists });
      expect(await refusal(port(actRecord(sha(noDenied)), noDenied))).toBe('public-source-policy: policy denied-path rules unreadable');
    }
  });
  it('refuses a scope whose code-content extension list cannot be read', async () => {
    const twoRules = { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.c'] }, { class: 'code-content', sourceExtensions: ['.py'] }] } };
    for (const scope of [{ purpose: 'no classification' }, fixtureScope(null), fixtureScope([]), fixtureScope(['c']), fixtureScope(['.c', 7]), twoRules,
      fixtureScope(['..']), fixtureScope(['.c', '..c']), fixtureScope(['.c', '. c']), fixtureScope(['.c\t']), fixtureScope(['.c\n'])]) {
      const bytes = policyBytes({ publicSourceScope: scope });
      expect(await refusal(port(actRecord(sha(bytes)), bytes))).toBe('public-source-policy: policy sourceExtensions unreadable');
    }
  });
  it('refuses a short run key', async () => {
    await expect(loadPublicSourceScreen(goodPort, new Uint8Array(16))).rejects.toThrow('run key shorter than 32 bytes');
  });
  it('the default port reads this checkout\'s chain: the latest recorded version loads the policy it names', async () => {
    // syzygy-p83h: the port read only the version-1 record, so it refused from the version-2 act on. It now reads the act the chain
    // puts in force, whichever version that is; the expected digest is read from the latest version's own record here.
    const fs = await import('node:fs');
    const repo = new URL('../../../../', import.meta.url);
    // The chain's own closed list of forms, latest first, so a later version's install needs no edit here.
    const latest = [...POLICY_ACT_FORMS].reverse().map(form => form.file)
      .map(file => new URL(`.syzygy/governance/decisions/${file}`, repo)).find(url => fs.existsSync(url));
    const port = checkoutPolicyActPort();
    if (latest === undefined) { await expect(loadPublicSourceScreen(port)).rejects.toThrow(/^Corpus read refused: public-source-policy: no screening-scope policy act is in force/u); return; }
    const argument = /^Exact digest \(SHA-256\): `([0-9a-f]{64})`$/mu.exec(fs.readFileSync(latest, 'utf8'))?.[1];
    const screen = await loadPublicSourceScreen(port);
    expect(screen.policyId).toBe('polaris-butlers-project-shape-secrets');
    expect(screen.policySha256).toBe(argument);
  });
});

describe('an empty corpus', () => {
  it('a commit with no blobs is refused by the population validator, never read as an empty success', async () => {
    await expect(readScreenedRepoCorpus(emptyRoot, cfg(emptyCommit), { admission: allow, policyAct: goodPort })).rejects.toThrow('Generation source rejected: invalid-source');
  });

  it('a corpus screened down to nothing admitted makes no provider call', async () => {
    const only = fixtureRepo({ 'src/secret-token.js': FILES['src/secret-token.js']!, 'docs/active-script.md': FILES['docs/active-script.md']! });
    const corpus = await readScreenedRepoCorpus(only.root, cfg(only.commit), { admission: allow, policyAct: goodPort });
    expect(corpus.count).toMatchObject({ selected: 2, secretDetectorMatches: 1, activeContent: 1, sourceRows: 2 });
    const request = buildPipelineRequest(corpus, { ...cfg(only.commit), readerQuestions: [{ id: 'core-ideas', topics: ['core-ideas'], text: 'What is it?' }], requestedAssets: [{ id: 'overview', kind: 'section', required: true }], budget }, 1_000);
    let calls = 0;
    const refuseAll = async (): Promise<never> => { calls++; throw new Error('unreachable'); };
    const result = await runGenerationPipeline(request, { now: () => 1_000, verifySources: async () => true, permissionIdentity: refuseAll, admit: refuseAll, permitted: refuseAll,
      releaseUnsent: refuseAll, responseSchema: stageSchema, validate: validateStage, fidelity: reviewVerdict, generate: refuseAll, record: refuseAll, lateReceipt: refuseAll }, new AbortController().signal);
    expect(result).toMatchObject({ status: 'stopped', reason: 'source-refused' });
    expect(calls).toBe(0);
  });
});

// Policy residuals: the detectors match literal forms only. These tests pin the
// residual so a change to it is seen; they are not a claim the policy is sufficient.
describe('policy residuals (the detectors see literal forms only)', () => {
  it('RESIDUAL: a base64-encoded private key and a token split across lines are admitted', async () => {
    const encoded = Buffer.from(SECRETS['private-key-material']).toString('base64');
    const token = `${'AK'}IA${'S'.repeat(16)}`;
    const only = fixtureRepo({
      'src/residual-b64.c': `static const char *k = "${encoded}";\n`,
      'src/residual-split.c': `static const char *a = "${token.slice(0, 10)}"\n  "${token.slice(10)}";\n`,
    });
    const corpus = await readScreenedRepoCorpus(only.root, cfg(only.commit), { admission: allow, policyAct: goodPort });
    expect(corpus.count).toMatchObject({ selected: 2, secretDetectorMatches: 0, sourceRows: 2 });
    expect(corpus.sources.every(source => !source.exclusion.excluded)).toBe(true);
  });

  // syzygy-bpyt.16 (ruled on syzygy-bpyt.1.14): a CRLF or CR body gets the active-content decision its LF form gets. The first body was
  // admitted under CRLF and CR before the fix (a backtick opener with a backtick in its info text hides a script element as an inline
  // span), the second withheld (a tilde fence the mask did not recognize, leaving the script element it holds in the open).
  it.each([['LF', '\n'], ['CRLF', '\r\n'], ['CR', '\r']])('%s: a body is withheld as active content or admitted as its LF form is', async (_name, end) => {
    const screen = await loadPublicSourceScreen(goodPort);
    const failOpen = ['# Guide', '', '```a`b', '<script>alert(1)</script>', '```', ''].join(end);
    const benign = ['# Guide', '', '~~~', '<script>alert(1)</script>', '~~~', 'after', ''].join(end);
    expect(screen.screenBody(failOpen)).toBe('active-content');
    expect(screen.screenBody(benign)).toBeUndefined();
    expect(screen.screenTargetBody(failOpen, 'README.md')).toEqual({ kind: 'excluded', outcome: 'active-content' });
    expect(screen.screenTargetBody(benign, 'README.md')).toEqual({ kind: 'admitted' });
  });

  it('a path secret is caught in the file name and in a directory name, in literal form only', async () => {
    const screen = await loadPublicSourceScreen(goodPort);
    expect(screen.screenPath(`src/${PATH_TOKEN}.ts`)).toBe('secret-detector-match');
    expect(screen.screenPath(`keys/${DIR_TOKEN}/a.c`)).toBe('secret-detector-match');
    // RESIDUAL: the same token base64-encoded in a path passes the detectors.
    expect(screen.screenPath(`src/${Buffer.from(PATH_TOKEN).toString('base64').replace(/[/+=]/gu, '_')}.ts`)).toBeUndefined();
  });
});

// syzygy-2coz: the project-documentation class of screening scope version 2, under the live scope's rules. It is classified only while
// the RFC5-14 class amendment act is confirmed (the scope's prerequisite); its bodies pass every detector and the active-content scan.
describe('the project-documentation class', () => {
  const LIVE_CLASSIFICATION = (JSON.parse(readFileSync(new URL('../../../../.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json', import.meta.url), 'utf8'))
    .publicSourceScope.contentClassification) as Record<string, unknown>;
  const LIVE_RULES = LIVE_CLASSIFICATION['rules'] as Record<string, unknown>[];
  const livePolicy = policyBytes({ publicSourceScope: { contentClassification: LIVE_CLASSIFICATION } });
  // The port states the prerequisite; the checkout port decides it with the strict class act reader at its clock, which the dossier's
  // screen test drives over records roots (a future-dated act, a withdrawal) against both screens. No default for `inForce`: an absent
  // answer is passed as `undefined`, which a default would replace.
  const docPort = (inForce: boolean | undefined, policy = livePolicy): PublicSourcePolicyActPort =>
    ({ read: async () => ({ actRecord: actRecord(sha(policy)), policy, ...(inForce === undefined ? {} : { classActInForce: inForce }) }) });

  it('admits a root document, a docs guide and a license text, and keeps withholding the rest', async () => {
    const screen = await loadPublicSourceScreen(docPort(true));
    expect(screen.projectDocumentation).toBe(true);
    // Version 5: a root MANIFESTO is governance-text, admitted under that class rather than withheld.
    expect(['README.md', 'docs/guide.md', 'licenses/MIT.txt', 'src/server.c', 'MANIFESTO', 'docs/design.md', 'src/README.md', 'redis.conf'].map(path => screen.screenPath(path)))
      .toEqual([undefined, undefined, undefined, undefined, undefined, 'unknown-extraction-class', 'unknown-extraction-class', 'unknown-extraction-class']);
    expect(['README.md', 'licenses/MIT.txt', 'src/server.c', 'docs/design.md'].map(path => screen.contentClass(path)))
      .toEqual(['project-documentation', 'project-documentation', 'code-content', undefined]);
  });

  it.each<[string, boolean | undefined]>([
    ['the class act not in force', false],
    ['no answer from the port', undefined],
  ])('leaves documentation indeterminate with %s, and still screens code', async (_name, inForce) => {
    const screen = await loadPublicSourceScreen(docPort(inForce));
    expect(screen.projectDocumentation).toBe(false);
    expect(screen.screenPath('README.md')).toBe('unknown-extraction-class');
    expect(screen.contentClass('README.md')).toBeUndefined();
    expect(screen.screenPath('src/server.c')).toBeUndefined();
  });

  it('refuses a malformed project-documentation rule whether or not the class act is in force', async () => {
    const rules = LIVE_RULES.map(rule => (rule['class'] === 'project-documentation' ? { ...rule, docTreeRoots: ['docs/api'] } : rule));
    const policy = policyBytes({ publicSourceScope: { contentClassification: { ...LIVE_CLASSIFICATION, rules } } });
    for (const inForce of [true, false]) {
      const error = await loadPublicSourceScreen(docPort(inForce, policy)).then(() => undefined, (caught: unknown) => caught);
      expect(error).toBeInstanceOf(CorpusRefusal);
      expect((error as CorpusRefusal).message).toContain('public-source-policy: policy project-documentation rule docTreeRoots is unreadable');
    }
  });

  it('reads admitted documentation bodies through the detectors and the active-content scan, and never reads an excluded one', async () => {
    const only = fixtureRepo({
      'README.md': '# Fixture\n\nA clean introduction.\n',
      'docs/guide.md': `${SENTINEL}\n\`\`\`\n${SECRETS['credential-assignment']}\`\`\`\n`,
      'licenses/MIT.txt': `${SENTINEL}\n<script>alert(1)</script>\n`,
      'docs/design.md': `${SENTINEL} design\n`,
    });
    const read: string[][] = [];
    const { readGitBlobsBatch } = await import('../git-blob-batch.js');
    const corpus = await readScreenedRepoCorpus(only.root, cfg(only.commit), { admission: allow, policyAct: docPort(true),
      readBlobs: (repo, objects) => { read.push([...objects]); return readGitBlobsBatch(repo, objects); } });
    expect(corpus.count).toMatchObject({ selected: 4, secretDetectorMatches: 1, activeContent: 1, indeterminate: 1, sourceRows: 4 });
    expect(corpus.sources.filter(source => !source.exclusion.excluded).map(source => source.path)).toEqual(['README.md']);
    expect(read.flat()).not.toContain(objectIdOf('docs/design.md', only.root, only.commit));
    expect(leaks(JSON.stringify(corpus))).toEqual([]);
  });
});

// syzygy-wsev / P-105: version 3's code-content exemption in this screen. The exemption's texts are the builder's own (variant all),
// re-derived from the checkout, so this holds before and after the act; the fixture exempts `.c` only of its fixture extensions.
// Since the version-4 act (2026-10-20) the version-3 base is recovered through version 4's base, the version-3 row `all`.
describe('the code-content exemption (screening scope version 3)', () => {
  const C_BODY = 'static int cmp(int a, int b, int c, int d) {\n    return a<b && c>d;\n}\n';
  let exemption: Record<string, unknown> = {};
  beforeAll(async () => {
    const py = `import json, sys; sys.path.insert(0, 'scripts')
import build_public_source_screening_scope_v2 as b2, build_public_source_screening_scope_v3 as b, build_public_source_screening_scope_v4 as b4, build_public_source_screening_scope_v5 as b5
v4_span, _mode = b5.base_bytes()
v3_all = b2.reverse_patch((b4.ROOT / b4.patch_path(b5.V4_BASE_VARIANT)).read_text(), v4_span)
assert b4.sha(v3_all) == b4.v3.manifest_rows(b4.ROOT)[b4.V3_BASE_VARIANT] and b4.propose(v3_all, b5.V4_BASE_VARIANT) == v4_span
base = b2.reverse_patch((b.ROOT / b.patch_path('all')).read_text(), v3_all)
assert b.propose(base, 'all') == v3_all
sys.stdout.write(json.dumps(json.loads(b.propose(base, 'all'))[b.SCOPE_KEY]['activeContent']['codeContentExemption']))`;
    const run = await promisify(execFile)('python3', ['-c', py], { cwd: fileURLToPath(new URL('../../../../', import.meta.url)), encoding: 'utf8' });
    exemption = JSON.parse(run.stdout) as Record<string, unknown>;
  });
  const exemptPolicy = (overrides: Record<string, unknown> = {}): Uint8Array =>
    policyBytes({ publicSourceScope: { ...fixtureScope(), activeContent: { codeContentExemption: { ...exemption, exemptExtensions: ['.c'], ...overrides } } } });
  const exemptPort = (policy = exemptPolicy()): PublicSourcePolicyActPort => port(actRecord(sha(policy)), policy);

  it('admits an exempt extension\'s body that the active-content scan reads as a tag, and only with its path', async () => {
    const screen = await loadPublicSourceScreen(exemptPort());
    expect(screen.codeContentExemption).toBe(true);
    expect(screen.screenBody(C_BODY, 'src/server.c')).toBeUndefined();
    expect(screen.screenBody(C_BODY)).toBe('active-content');
    // A code-content extension the exemption does not list is still scanned.
    expect(screen.screenBody(C_BODY, 'src/server.js')).toBe('active-content');
    // Every detector still runs over an exempt body.
    expect(screen.screenBody(`${C_BODY}${SECRETS['known-token-formats']}\n`, 'src/server.c')).toBe('secret-detector-match');
  });

  it('without the exemption the same body is withheld as active content', async () => {
    const screen = await loadPublicSourceScreen(goodPort);
    expect(screen.codeContentExemption).toBe(false);
    expect(screen.screenBody(C_BODY, 'src/server.c')).toBe('active-content');
  });

  it('reads the corpus through it: the .c body is admitted and the .js body withheld', async () => {
    const only = fixtureRepo({ 'src/cmp.c': C_BODY, 'src/cmp.js': C_BODY });
    const corpus = await readScreenedRepoCorpus(only.root, cfg(only.commit), { admission: allow, policyAct: exemptPort() });
    expect(corpus.count).toMatchObject({ selected: 2, activeContent: 1, sourceRows: 2 });
    expect(corpus.sources.filter(source => !source.exclusion.excluded).map(source => source.path)).toEqual(['src/cmp.c']);
  });

  it('refuses an exemption whose texts or extensions this screen does not implement', async () => {
    expect(await loadPublicSourceScreen(exemptPort(exemptPolicy({ rule: 'another rule' }))).then(() => '', (error: unknown) => (error as CorpusRefusal).reason))
      .toBe('public-source-policy: policy code-content exemption rule is not a text this screen implements');
    expect(await loadPublicSourceScreen(exemptPort(exemptPolicy({ exemptExtensions: ['.h'] }))).then(() => '', (error: unknown) => (error as CorpusRefusal).reason))
      .toBe('public-source-policy: policy code-content exemption exemptExtensions is not a non-empty list of distinct sourceExtensions entries');
  });
});


describe('the v4 redacted corpus behind the original-object verification boundary', () => {
  const mixed = 'a\rg\ntoken=abcdefghij\nh\nvisible\nlast\n';
  const current = new Uint8Array(readFileSync(new URL('../../../../.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json', import.meta.url)));
  const policyAct: PublicSourcePolicyActPort = { read: async () => ({ actRecord: actRecord(sha(current)), policy: current, classActInForce: true }) };

  it('returns only marked retained material with original identity, line coordinates and exact counts', async () => {
    const only = fixtureRepo({ 'docs/mixed.md': mixed, 'src/secret.c': 'token=abcdefghij\n' });
    const corpus = await readScreenedRepoCorpus(only.root, cfg(only.commit), { admission: allow, policyAct });
    expect(corpus.count).toMatchObject({ listed: 2, selected: 2, sourceRows: 2, redactedFiles: 1, withheldLines: 3, secretDetectorMatches: 1 });
    const kept = corpus.sources.find(source => source.path === 'docs/mixed.md')!;
    expect(kept.objectId).toBe(objectIdOf('docs/mixed.md', only.root, only.commit));
    expect(kept.body).toBe('a\r[redacted-span: 3 withheld line(s) in this file]\nvisible\nlast\n');
    expect(kept.spans.map(span => [span.original, span.text])).toEqual([
      [{ start: 0, startLine: 1, endLine: 1 }, 'a\r'], [{ start: 23, startLine: 5, endLine: 6 }, 'visible\nlast\n'],
    ]);
    expect(JSON.stringify(corpus)).not.toContain('abcdefghij');
    expect(JSON.stringify(corpus)).not.toContain('token=');
    expect(validateGenerationSources(corpus.sources)).toHaveLength(2);
    const request = buildPipelineRequest(corpus, { ...cfg(only.commit), budget, readerQuestions: [{ id: 'why', topics: [], text: 'Why?' }], requestedAssets: [] }, Date.now());
    const fresh = await screenedRepoCorpusVerifier(only.root, cfg(only.commit), { admission: allow, policyAct })(request);
    expect(Array.isArray(fresh)).toBe(true);
    expect(validateGenerationSources(fresh as readonly GenerationSource[]).find(source => source.path === 'docs/mixed.md')?.body).toBe(kept.body);
  });

  it('refuses wrong original bytes before screening and fails replay closed when the fresh object read changes', async () => {
    const only = fixtureRepo({ 'docs/mixed.md': mixed });
    const corpus = await readScreenedRepoCorpus(only.root, cfg(only.commit), { admission: allow, policyAct });
    const ports = { admission: allow, policyAct, readBlobs: (_repo: string, objects: readonly string[]) => new Map(objects.map(oid => [oid, Buffer.from('arbitrary safe body\n')])) };
    await expect(readScreenedRepoCorpus(only.root, cfg(only.commit), ports)).rejects.toThrow('corpus-object-mismatch');
    expect(await screenedRepoCorpusVerifier(only.root, cfg(only.commit), ports)(buildPipelineRequest(corpus, { ...cfg(only.commit), budget, readerQuestions: [{ id: 'why', topics: [], text: 'Why?' }], requestedAssets: [] }, Date.now()))).toBe(false);
  });

  it('binds the complete mixed population through fresh verification and consent before any provider input', async () => {
    const only = fixtureRepo({ 'docs/mixed.md': mixed, 'src/control.c': 'int ordinary = 7;\n', '.env': 'withheld-fixture\n' });
    const corpus = await readScreenedRepoCorpus(only.root, cfg(only.commit), { admission: allow, policyAct });
    const now = Date.now(), sent: string[] = [];
    const request = buildPipelineRequest(corpus, { ...cfg(only.commit), budget,
      readerQuestions: [{ id: 'why', topics: [], text: 'Why?' }], requestedAssets: [] }, now);
    const routes = Object.fromEntries(Object.keys(request.routes).map(stage => [stage, 'fixture'])) as typeof request.routes;
    const recordBase = { project: 'project:fixture', version: '1', digest: 'a'.repeat(64), inForceAt: now - 1, withdrawnAt: null,
      supersedes: null, supersessionAt: null, upstream: null, revisionLabels: [] };
    const records: AdmissionRecord[] = [
      { ...recordBase, recordId: 'fixture-observation', class: 'observation', repositoryId: 'repository:fixture', providerId: null,
        admittedRevisions: [only.commit], revisionLabels: ['fixture'], admittedRepositories: [], contentClasses: [] },
      { ...recordBase, recordId: 'fixture-egress', class: 'egress', repositoryId: null, providerId: 'fixture-provider', admittedRevisions: [],
        admittedRepositories: ['repository:fixture'], contentClasses: ['project-documentation', 'code-content'] },
    ];
    const base: PipelinePorts = { now: () => now, verifySources: screenedRepoCorpusVerifier(only.root, cfg(only.commit), { admission: allow, policyAct }),
      permissionIdentity: async () => { throw Error('consent must replace this port'); },
      admit: async input => ({ kind: 'reserved', permit: { attemptId: String(input.ordinal), maxUsageUnits: 1, maxOutputBytes: 1_000 } }),
      permitted: async () => true, releaseUnsent: async () => undefined, responseSchema: () => ({ version: 'fixture', schema: {} }),
      generate: async input => { sent.push(input.input); return { body: '{}', model: 'fixture', usageUnits: 1 }; },
      validate: (_stage, data) => data, record: async () => undefined, lateReceipt: async () => undefined, fidelity: () => ({ blocking: false, findings: [] }) };
    const run = async (sources: readonly GenerationSource[]) => runGenerationPipeline({ ...request, routes, sources }, withConsent(base, {
      now: () => now, reader: { read: async () => records }, consentingProject: 'project:fixture', routeProviders: { fixture: 'fixture-provider' },
      sources, contentClassOf: source => source.path.startsWith('docs/') ? 'project-documentation' : 'code-content', instructionClass: 'code-content', audit: async () => undefined,
    }), new AbortController().signal);
    const control = await run(JSON.parse(JSON.stringify(corpus.sources)));
    expect(control.status === 'stopped' ? control.reason : control.status).toBe('awaiting-rendered-review');
    expect(sent).toHaveLength(5);
    expect(JSON.parse(sent[1]!).inputs.sources.map((source: { sourceId: string }) => source.sourceId).sort()).toEqual(corpus.sources.map(source => source.sourceId).sort());
    expect(sent[0]).toContain('[redacted-span: 3 withheld line(s) in this file]');
    sent.length = 0;
    const ordinary = corpus.sources.find(source => source.path === 'src/control.c')!;
    const forgedBody = 'pass' + 'word=forged-secret-sentinel\n';
    const forged = generationSourcesForBody({ ...ordinary, objectId: gitBlobObjectId(forgedBody), body: forgedBody } as Parameters<typeof generationSourcesForBody>[0])[0]!;
    const extra = generationSourcesForBody({ ...ordinary, sourceId: 'extra-source', path: 'src/unpinned.c', body: ordinary.body!, objectId: ordinary.objectId! } as Parameters<typeof generationSourcesForBody>[0])[0]!;
    const populations = [
      corpus.sources.map(source => source.sourceId === ordinary.sourceId ? forged : source),
      corpus.sources.filter(source => source.sourceId !== ordinary.sourceId),
      corpus.sources.map(source => source.objectId === null ? { ...source, exclusion: { excluded: true as const, reason: 'active-content' as const } } : source),
      [...corpus.sources, extra],
    ];
    for (const sources of populations) expect(await run(sources)).toMatchObject({ status: 'stopped', reason: 'source-refused' });
    expect(sent).toHaveLength(0);
    const aliases = corpus.sources.map(source => source.objectId !== null ? source : { ...source, sourceId: `s-${'c'.repeat(24)}`, path: `withheld/s-${'c'.repeat(24)}` });
    expect((await run(aliases)).status).toBe('awaiting-rendered-review');
    expect(sent).toHaveLength(5);
    expect(sent.join('\n')).not.toContain('forged-secret-sentinel');
  });

});

// P-116 (screening scope version 5, D): the reader loads the screen for the repository it reads (its consent identity, as configured)
// at the revision it reads, so an owner placement applies only there. The live policy with its one placement re-pointed at this fixture.
describe('the version-5 owner placements through the corpus reader', () => {
  const live = JSON.parse(readFileSync(new URL('../../../../.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json', import.meta.url), 'utf8')) as Record<string, any>;
  const placing = (repository: string, commits: readonly string[]): PublicSourcePolicyActPort => {
    const doc = structuredClone(live);
    const rule = (doc.publicSourceScope.contentClassification.rules as Record<string, unknown>[]).find(entry => entry['class'] === 'project-documentation')!;
    rule['ownerPlacements'] = [{ repository, commits, paths: ['tls.md'] }];
    const bytes = new TextEncoder().encode(`${JSON.stringify(doc, null, 2)}\n`);
    return { read: async () => ({ actRecord: actRecord(sha(bytes)), policy: bytes, classActInForce: true }) };
  };
  let placed: { root: string; commit: string };
  beforeAll(() => { placed = fixtureRepo({ 'TLS.md': '# TLS\nUse port 6380.\n', 'src/a.c': 'int a;\n' }); });
  const paths = async (policyAct: PublicSourcePolicyActPort): Promise<string[]> =>
    (await readScreenedRepoCorpus(placed.root, cfg(placed.commit), { admission: allow, policyAct })).sources.filter(source => !source.exclusion.excluded).map(source => source.path).sort();

  it('admits the placed path for the configured repository at the read revision', async () => {
    expect(await paths(placing('repository:fixture', [placed.commit]))).toEqual(['TLS.md', 'src/a.c']);
  });
  it.each<[string, string, () => string[]]>([
    ['another revision', 'repository:fixture', () => ['0'.repeat(40)]],
    ['another repository', 'repository:other', () => [placed.commit]],
  ])('withholds it for %s', async (_name, repository, commits) => {
    expect(await paths(placing(repository, commits()))).toEqual(['src/a.c']);
  });
});

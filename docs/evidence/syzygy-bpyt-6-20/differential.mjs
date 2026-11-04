// Operator-run synthetic differential; no observed repository or provider is contacted.
// Usage: node docs/evidence/syzygy-bpyt-6-20/differential.mjs <artifact-dir> [head-label]
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, chmodSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const artifact = resolve(process.argv[2]);
const base = 'f5487c186626513724e1eff28a2789a4d78c154c';
const head = process.argv[3] ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
mkdirSync(artifact, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');
const source = (path, old) => old ? execFileSync('git', ['show', `${base}:${path}`], { maxBuffer: 16 * 1024 * 1024, encoding: 'utf8' }) : readFileSync(join(root, path), 'utf8');
const files = {
  worker: 'packages/three-surface-poc-core/src/worker-change-observation.ts',
  code: 'packages/three-surface-poc-core/src/code-structure.ts',
  observation: 'apps/three-surface-poc/src/git-observation.ts',
  governance: 'apps/three-surface-poc/src/governance-inputs.ts',
};
const appends = {
  [files.worker]: '\nexport { defaultRunGit as g5WorkerRun };',
  [files.code]: '\nexport { defaultRunGit as g5CodeRun };',
  [files.observation]: '\nexport { readGit as g5RepositoryRun };',
};
const entry = [
  ...Object.values(files).map((path) => `export * from './${path}';`),
  "export * from './packages/three-surface-poc-core/src/index.ts';",
  "export * from './apps/three-surface-poc/src/verbatim-route.ts';",
  "export * from './apps/three-surface-poc/src/test-model-fixture.ts';",
  "export * from './apps/three-surface-poc/src/test-project-shape-fixture.ts';",
  "export * from './apps/three-surface-poc/src/routes.ts';",
  "export * from './apps/three-surface-poc/src/polaris.ts';",
  "export * from 'g5-governance-fixtures';",
  "export * from 'g5-parity-fixtures';",
].join('\n');
const manifests = {};
for (const old of [true, false]) {
  const label = old ? 'old' : 'new';
  manifests[label] = [];
  await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, outfile: join(artifact, `${label}.mjs`), bundle: true, platform: 'node', format: 'esm', banner: { js: "import {createRequire as g5CreateRequire} from 'node:module';const require = g5CreateRequire(import.meta.url);" }, plugins: [{ name: 'frozen-sources', setup(b) {
    b.onResolve({ filter: /^@syzygy\// }, (args) => {
      const name = args.path.slice('@syzygy/'.length);
      if (name.includes('/')) throw new Error(`unexpected subpath ${name}`);
      return { path: join(root, 'packages', name, 'src/index.ts') };
    });
    b.onResolve({ filter: /^g5-parity-fixtures$/ }, () => ({ path: 'parity', namespace: 'g5-parity' }));
    b.onLoad({ filter: /.*/, namespace: 'g5-parity' }, () => {
      const path = 'apps/three-surface-poc/src/polaris-parity-sweep.test.ts';
      manifests[label].push({ path, sha256: sha(source(path, old)), role: 'virtual parity oracle prelude' });
      let text = source(path, old).split("describe('PWB-REQ-020 exhaustive Polaris parity sweep'")[0];
      text = text.replace(/import \{ afterEach, describe, expect, it \} from 'vitest';/, '').replace(/afterEach\(\(\) => \{[\s\S]*?\n\}\);/, '');
      return { contents: `${text}\nexport { sweep as g5ParitySweep };`, loader: 'ts', resolveDir: join(root, 'apps/three-surface-poc/src') };
    });
    b.onResolve({ filter: /^g5-governance-fixtures$/ }, () => ({ path: 'fixture', namespace: 'g5' }));
    b.onLoad({ filter: /.*/, namespace: 'g5' }, () => {
      const path = 'apps/three-surface-poc/src/governance-inputs.test.ts';
      manifests[label].push({ path, sha256: sha(source(path, old)), role: 'virtual authority corpus prelude' });
      let text = source(path, old).split("describe('loadBodyReadAuthorityInputs (hermetic)'")[0];
      text = text.replace(/import \{ describe, expect, it[^}]*\} from 'vitest';/, '').replace(/const REPO_ROOT = .*?;/, `const REPO_ROOT = ${JSON.stringify(root)};`);
      // Freeze the original fixture prelude; the new regression imports are harmless but not needed here.
      return { contents: `${text}\nexport { fakeTree as g5FakeTree, loaderFor as g5LoaderFor };`, loader: 'ts', resolveDir: join(root, 'apps/three-surface-poc/src') };
    });
    b.onLoad({ filter: /\.ts$/ }, (args) => {
      const path = args.path.slice(root.length + 1);
      const text = source(path, old);
      manifests[label].push({ path, sha256: sha(text) });
      return { contents: text + (appends[path] ?? ''), loader: 'ts', resolveDir: dirname(args.path) };
    });
  } }] });
}
writeFileSync(join(artifact, 'bundle-source-manifest.json'), JSON.stringify(manifests, null, 2));

const bin = join(artifact, 'bin'); mkdirSync(bin, { recursive: true });
const fakeGit = `#!${process.execPath}\nimport fs from 'node:fs';
const c=JSON.parse(fs.readFileSync(process.env.G5_CASE,'utf8'));
fs.appendFileSync(c.log,JSON.stringify({argv:process.argv.slice(2),cwd:process.cwd(),env:{G5_SENTINEL:process.env.G5_SENTINEL,GIT_OPTIONAL_LOCKS:process.env.GIT_OPTIONAL_LOCKS}})+'\\n');
const write=(fd,n)=>{const chunk=Buffer.alloc(Math.min(n,65536),fd===1?97:101);while(n>0){const take=Math.min(n,chunk.length);fs.writeSync(fd,chunk,0,take);n-=take;}};
if(c.stdoutSize!==undefined)write(1,c.stdoutSize);else fs.writeSync(1,Buffer.from(c.stdout??'','base64'));
if(c.stderrSize!==undefined)write(2,c.stderrSize);else fs.writeSync(2,Buffer.from(c.stderr??'','base64'));
process.exit(c.status??0);\n`;
// .mjs makes the fixture independent of package-type inference at its executable path.
writeFileSync(join(bin, 'fake-git.mjs'), fakeGit); chmodSync(join(bin, 'fake-git.mjs'), 0o755);
writeFileSync(join(bin, 'git'), `#!/bin/sh\nexec '${process.execPath}' '${join(bin, 'fake-git.mjs')}' "$@"\n`); chmodSync(join(bin, 'git'), 0o755);
const child = `import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const m=await import(pathToFileURL(process.argv[2]));const c=JSON.parse(readFileSync(process.argv[3]));
const value=v=>v===undefined?{type:'undefined'}:v===null?{type:'null'}:typeof v==='string'?{type:'string',length:v.length,sha256:createHash('sha256').update(v).digest('hex'),...(v.length<4096?{text:v}:{})}:{type:v.constructor.name,length:v.length,sha256:createHash('sha256').update(v).digest('hex'),...(v.length<4096?{base64:Buffer.from(v).toString('base64')}:{})};
if(c.allocFail)Buffer.concat=()=>{throw new RangeError('synthetic allocation failure');};
try{let v;switch(c.profile){case 1:v=m.g5WorkerRun(c.root,c.args);break;case 2:v=m.defaultRunGit(c.root,c.args);break;case 3:v=m.defaultReadGitBlob(c.root,c.object??'object');break;case 4:v=m.g5RepositoryRun(c.root,c.args);break;case 5:v=m.g5CodeRun(c.root,c.args);break;case 6:v=m.gitRunnerFor(c.root)(c.args);break;case 7:v=m.gitBlobReaderFor(c.root,{...m.PWB_RESOURCE_LIMITS,maxBytesPerSource:c.limit??1048576})(c.args);break;}console.log(JSON.stringify({ok:true,value:value(v)}));}
catch(e){console.log(JSON.stringify({ok:false,error:{name:e.name,code:e.code,status:e.status,signal:e.signal,stdout:value(e.stdout),stderr:value(e.stderr)}}));}`;
writeFileSync(join(artifact, 'transport-child.mjs'), child);
const transport = [];
const rootOne = join(artifact, 'root-one'); const rootTwo = join(artifact, 'root-two');
mkdirSync(rootOne, { recursive: true }); mkdirSync(rootTwo, { recursive: true });
const raw = Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0, 0xff, 0xc3, 0xa9, 0]);
for (let profile = 1; profile <= 7; profile++) {
  if (process.env.G5_PROFILES && !process.env.G5_PROFILES.split(',').includes(String(profile))) continue;
  const bound = profile === 1 ? 67_108_864 : profile === 5 || profile === 6 ? 268_435_456 : 1_048_576;
  const cases = [
    { name: 'valid-utf8-bom-nul', stdout: Buffer.from('\ufefftext é\0path\nline\0').toString('base64') },
    { name: 'invalid-utf8', stdout: raw.toString('base64') },
    { name: 'nonzero-both-streams', stdout: raw.toString('base64'), stderr: raw.toString('base64'), status: 7 },
    { name: 'stderr-pressure', stdout: Buffer.from('ok').toString('base64'), stderrSize: bound + 1 },
    { name: 'missing-executable', missingExecutable: true },
    ...[-1, 0, 1].map((d) => ({ name: `stdout-bound${d}`, stdoutSize: bound + d })),
    { name: 'distinct-root-and-env', stdout: Buffer.from('repeat').toString('base64'), otherRoot: true },
  ];
  if (profile === 7) cases.push(...[-1, 0, 1].map((d) => ({ name: `narrow-envelope${d}`, limit: 64, stdoutSize: 64 + d })));
  if (profile === 5) cases.push(
    { name: 'listing-valid', stdout: Buffer.from(`100644 blob ${'1'.repeat(40)}       1\tone.ts\0`).toString('base64') },
    { name: 'listing-gitlink-before-decode', stdout: Buffer.concat([Buffer.from(`160000 commit ${'2'.repeat(40)}       -\t`), Buffer.from([255, 0]), Buffer.from(`100644 blob ${'1'.repeat(40)}       1\tone.ts\0`)]).toString('base64') },
    { name: 'listing-allocation-failed', stdout: Buffer.from('listing').toString('base64'), allocFail: true },
  );
  for (const test of cases) {
    if (process.env.G5_CASE_FILTER && !test.name.includes(process.env.G5_CASE_FILTER)) continue;
    const record = { profile, case: test.name, bound: test.limit ?? bound, outputs: {} };
    for (const label of ['old', 'new']) {
      const log = join(artifact, 'git-call-log.jsonl'); writeFileSync(log, '');
      const request = { ...test, profile, args: ['ls-tree', '-r', '-z', '-l', 'unresolved ref'], root: test.otherRoot ? rootTwo : rootOne, log };
      const path = join(artifact, 'transport-case.json'); writeFileSync(path, JSON.stringify(request));
      const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
      Object.assign(environment, { G5_CASE: path, G5_SENTINEL: test.otherRoot ? 'second' : 'first', GIT_OPTIONAL_LOCKS: 'sentinel', PATH: test.missingExecutable ? join(artifact, 'no-executables') : `${bin}:/usr/bin:/bin` });
      const result = spawnSync(process.execPath, [join(artifact, 'transport-child.mjs'), join(artifact, `${label}.mjs`), path], { cwd: root, env: environment, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
      if (result.status !== 0) throw new Error(`transport child ${profile}/${test.name}/${label}: ${result.stderr}`);
      record.outputs[label] = { result: JSON.parse(result.stdout), parentStderr: result.stderr, calls: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) };
    }
    record.equal = JSON.stringify(record.outputs.old) === JSON.stringify(record.outputs.new);
    transport.push(record);
  }
}
writeFileSync(join(artifact, 'transport-differential.json'), JSON.stringify({ base, head, node: process.version, v8: process.versions.v8, harnessSha256: sha(readFileSync(import.meta.filename)), fakeGitSha256: sha(fakeGit), cases: transport.length, differences: transport.filter((x) => !x.equal).map(({ profile, case: name }) => ({ profile, case: name })), results: transport }, null, 2));
console.log(JSON.stringify({ stage: 'transport', cases: transport.length, differences: transport.filter((x) => !x.equal).length }));

if (process.env.G5_SKIP_CALLERS) { if (transport.some((x) => !x.equal)) process.exitCode = 1; } else {
const old = await import(pathToFileURL(join(artifact, 'old.mjs')));
const next = await import(pathToFileURL(join(artifact, 'new.mjs')));
const caller = [];
const add = (name, fn) => {
  const capture = (m) => { try { return fn(m); } catch (e) { return { thrown: { name: e.name, code: e.code, status: e.status, signal: e.signal, message: e.message, stdout: e.stdout === undefined ? undefined : { type: typeof e.stdout === 'string' ? 'string' : e.stdout.constructor.name, sha256: sha(e.stdout) }, stderr: e.stderr === undefined || e.stderr === null ? e.stderr : { type: typeof e.stderr === 'string' ? 'string' : e.stderr.constructor.name, sha256: sha(e.stderr) } } }; } };
  const before = capture(old); const after = capture(next);
  if (name.startsWith('model-and-served') && (before.thrown || after.thrown)) throw new Error(`model corpus did not execute ${name}: ${JSON.stringify({before,after})}`);
  caller.push({ name, old: before, new: after, equal: JSON.stringify(before) === JSON.stringify(after) });
};
const encoder = new TextEncoder();
const observedAt = '2026-11-03T06:58:26Z';
const fixtureRepo = old.fixtureRepoWithGit([]);
for (const [name, authority] of [['admitted', old.ADMITTING_AUTHORITY], ['refused', old.REJECTING_AUTHORITY]]) {
  for (const corpus of ['normal', 'secret', 'baseline-spec']) {
    const texts = corpus === 'secret' ? old.PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET : corpus === 'baseline-spec' ? old.PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC : old.PROJECT_SHAPE_FIXTURE_TEXTS;
    add(`model-and-served-${name}-${corpus}`, (m) => {
      const calls = []; const run = m.projectShapeFixtureGit(texts);
      const model = m.buildFixtureModel([], { fixtureRepo, evaluationAsOf: observedAt, projectShape: { authority, runGit: (args) => { calls.push(args); return run(args); } } });
      const html = m.renderPolarisPage(model);
      const machine = JSON.stringify(model);
      const parity = m.g5ParitySweep(model);
      if (parity.reports.some((r) => r.onlyHuman.length || r.onlyMachine.length)) throw new Error('PWB-REQ-020 per-tuple parity failed');
      const routes = m.pocRoutes(() => model);
      const served = ['/polaris', '/trajectory', '/orrery', '/api/poc'].map((path) => {
        const route = routes.find((r) => r.path === path);
        const answer = route.handle({ request: { method: 'GET', path, query: new URLSearchParams(), headers: {} } });
        return { path, status: answer.status, contentType: answer.contentType, bytes: Buffer.byteLength(answer.body), sha256: sha(answer.body) };
      });
      return { parity, served, modelSha256: sha(machine), responseIdentity: m.buildResponseIdentity(model), human: { bytes: Buffer.byteLength(html), sha256: sha(html) }, machine: { bytes: Buffer.byteLength(machine), sha256: sha(machine) }, projectShape: model.projectShape, calls };
    });
  }
}
// Every authority x altered-prose/withdrawal/supersession fixture is compared without "fixing" existing classifications.
for (const kind of ['consent', 'policy', 'registry']) {
  for (const alteration of ['unchanged', 'altered-date', 'widened-effect', 'removed-limits', 'appended-withdrawal', 'missing', 'unreadable', 'invalid-utf8', 'missing-tag', 'superseded', 'revoked']) {
    for (const reading of ['faithful', 'isolated']) add(`authority-${kind}-${alteration}-${reading}`, (m) => {
      const tree = m.g5FakeTree(); const path = m.PWB_ACT_RECORDS[kind]; const text = tree.files.get(path);
      if (alteration === 'altered-date') tree.files.set(path, text.replace(/^(Date: .+)$/m, '$1 [altered]'));
      if (alteration === 'widened-effect') tree.files.set(path, text.replace(/(\n## (?:Effect|What this records)\n\n)[^\n]+(?:\n[^\n]+)*/, '$1Every repository, egress and write is granted.'));
      if (alteration === 'removed-limits') tree.files.set(path, text.replace(/\n## What this (?:act does not authorize|does not do)\n[\s\S]*?(?=\n## |$)/, ''));
      if (alteration === 'appended-withdrawal') tree.files.set(path, `${text}\n## Withdrawal\n\nThe owner withdraws this act; it no longer counts.\n`);
      if (alteration === 'missing') tree.files.delete(path);
      if (alteration === 'unreadable') tree.unreadablePaths.add(path);
      if (alteration === 'invalid-utf8') tree.invalidUtf8Paths.add(path);
      if (alteration === 'missing-tag') tree.tags.delete(m.pwbAuthorityExpectations(observedAt).authorities[kind].recordingTag);
      if (alteration === 'superseded' || alteration === 'revoked') tree.files.set('.syzygy/governance/decisions/SYNTHETIC-LIFECYCLE-ACT.md', `# Synthetic\n\nAct identity: ` + '`SYNTHETIC-LATER`' + `\n\nSupersession / revocation: ${alteration === 'revoked' ? 'revokes' : 'supersedes'} ` + '`' + m.pwbAuthorityExpectations(observedAt).authorities[kind].actIdentity + '`' + '\n');
      if (reading === 'isolated') for (const key of tree.taggedRecords.keys()) if (key.endsWith(`:${path}`)) tree.taggedRecords.set(key, tree.files.get(path) ?? '');
      const authority = m.evaluateBodyReadAuthority(m.g5LoaderFor(tree));
      if (alteration === 'superseded' || alteration === 'revoked') { const state = authority[kind]; if (state.kind !== 'invalid' || state.caseId !== `${kind}:${alteration}`) throw new Error(`synthetic lifecycle fixture did not exercise ${kind}:${alteration}`); }
      let bodyCalls = 0;
      const result = m.observeProjectShape({ authority, read: () => { bodyCalls++; return 'admitted-synthetic-reader'; } });
      if (!authority.admits && bodyCalls !== 0) throw new Error('body read before authority');
      return { authority, result, bodyCalls };
    });
  }
}
// Listing grammar/string injection is retained separately from P1 and covers invalid records and NUL framing.
for (const [name, raw] of [['valid', `100644 blob ${'1'.repeat(40)}       1\tone.ts\0`], ['unterminated', `100644 blob ${'1'.repeat(40)}       1\tone.ts`], ['malformed', 'garbage\0'], ['embedded-nul', 'bad\0record\0']]) {
  add(`code-listing-${name}`, (m) => { const calls = []; return { result: m.observeCodeStructure({ repoRoot: fixtureRepo.repoRoot, revision: 'unresolved-ref', capturedAt: observedAt, runGit: (r, a) => { calls.push([r, a]); return raw; } }), calls }; });
}
for (const repository of [fixtureRepo.repoRoot, join(artifact, 'missing-repository')]) {
  add(`worker-${repository === fixtureRepo.repoRoot ? 'valid' : 'missing'}`, (m) => m.observeWorkerChange({ repoRoot: repository, beadId: 'synthetic-1', seam: { sourcePath: 'one.ts', testPath: 'one.test.ts' }, capturedAt: observedAt }));
  add(`binding-${repository === fixtureRepo.repoRoot ? 'valid' : 'missing'}`, (m) => m.resolvePwbRepositoryBinding(repository, { approvedLocator: repository }));
}
const call = (args) => execFileSync('git', ['-C', fixtureRepo.repoRoot, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GIT_AUTHOR_DATE: '2026-08-24T00:00:00Z', GIT_COMMITTER_DATE: '2026-08-24T00:00:00Z' } }).trim();
for (const [name, args] of [['missing-ref', ['rev-parse', 'no-such-ref']], ['missing-object', ['cat-file', 'blob', 'no-such-object']]]) {
  for (const profile of [1, 2, 4, 6, 7]) add(`real-git-${name}-profile${profile}`, (m) => {
    if (profile === 1) return m.g5WorkerRun(fixtureRepo.repoRoot, args);
    if (profile === 2) return m.defaultRunGit(fixtureRepo.repoRoot, args);
    if (profile === 4) return m.g5RepositoryRun(fixtureRepo.repoRoot, args);
    if (profile === 6) return m.gitRunnerFor(fixtureRepo.repoRoot)(args);
    return m.gitBlobReaderFor(fixtureRepo.repoRoot)(args);
  });
}
add('code-repeat-observation', (m) => [0, 1].map(() => m.observeCodeStructure({ ...fixtureRepo, capturedAt: observedAt })));
writeFileSync(join(fixtureRepo.repoRoot, 'new-file.ts'), 'export const sentinel = 1;\n');
add('git-dirty-metadata', (m) => m.observeGitRepository(fixtureRepo.repoRoot));
call(['add', '-A']); call(['commit', '-qm', 'synthetic next revision']);
add('git-horizon-metadata', (m) => m.observeGitHorizon(fixtureRepo.repoRoot, fixtureRepo.revision));
writeFileSync(join(artifact, 'caller-differential.json'), JSON.stringify({ base, head, node: process.version, harnessSha256: sha(readFileSync(import.meta.filename)), cases: caller.length, differences: caller.filter((x) => !x.equal).map((x) => x.name), results: caller }, null, 2));
console.log(JSON.stringify({ stage: 'callers', cases: caller.length, differences: caller.filter((x) => !x.equal).length }));
rmSync(fixtureRepo.repoRoot, { recursive: true, force: true });
if (transport.some((x) => !x.equal) || caller.some((x) => !x.equal)) process.exitCode = 1;

}

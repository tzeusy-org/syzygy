import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { encodeQuestionFile, QUESTION_FILE, type HeldOutEntry, type ReaderAnswer } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';
import { prepareBenchmarkStore } from './scripted-benchmark-store.js';
import { BENCHMARK_LIMITS, fixtureBytes, scriptedBenchmark, type BlindBenchmarkQuestion, type FixtureKey } from './scripted-benchmark.js';
import { viewBinds, viewFor, type ViewRole } from './session-view.js';

const runId = `run-${'a'.repeat(32)}`;
const repository = 'example.invalid/evaluator/test';
const commit = 'a'.repeat(40);
const roles: readonly ViewRole[] = ['author', 'inventory', 'fidelity', 'design'];
const signal = () => new AbortController().signal;
const allow = { screenBody: () => undefined };

const key: FixtureKey = {
  format: 'polaris-scripted-benchmark-key/1',
  id: 'held-out-key',
  questions: [
    { id: 'one', prompt: 'Graded question one', facts: 'alpha\nbeta' },
    { id: 'two', prompt: 'Graded question two', facts: 'cedar\npine' },
    { id: 'three', prompt: 'Graded question three', facts: 'circle\nsquare' },
    { id: 'four', prompt: 'Graded question four', facts: 'spring\nautumn' },
  ],
};

function makeFixture(overrides: Partial<HeldOutEntry> = {}) {
  const root = fs.realpathSync(tempDir('scripted-benchmark-'));
  const dir = (name: string): string => {
    const path = join(root, name);
    fs.mkdirSync(path, { mode: 0o700 });
    return path;
  };
  const stateRoot = dir('state');
  const runDir = dir(`state/${runId}`);
  dir(`state/${runId}/drafts`);
  const runRecord = 'prior fixture record\n';
  fs.writeFileSync(join(runDir, 'run.json'), runRecord, { mode: 0o600 });
  const sourceCheckout = dir('source');
  const syzygyCheckout = dir('syzygy');
  const shimDir = dir('shim');
  const toolPath = dir('tool');
  const privateRoot = dir('private');
  const views = roles.map(role => {
    const base = dir(role);
    return viewFor({
      role, clone: sourceCheckout, runDir, sessionDir: role === 'author' ? runDir : base,
      agentHome: dir(`${role}/home`), checkout: syzygyCheckout, toolPaths: [toolPath], shimDir,
      socketDir: dir(`${role}/socket`), brokerSocket: join(base, 'socket', 'fixture.sock'),
    });
  });
  const keyBytes = fixtureBytes(key);
  const depthBytes = fixtureBytes(Array.from({ length: 10 }, (_, index) => `Fixture depth row ${index + 1}`));
  const tasksBytes = fixtureBytes(Array.from({ length: 5 }, (_, index) => `Fixture task row ${index + 1}`));
  const entry: HeldOutEntry = {
    id: 'comparison', repository, commit,
    graded: { state: 'frozen', key: key.id, sha256: sha256(keyBytes), count: 4, requiredFacts: 8 },
    depth: { state: 'frozen', key: 'depth', sha256: sha256(depthBytes), count: 10 },
    tasks: { state: 'frozen', key: 'tasks', sha256: sha256(tasksBytes), count: 5 },
    ...overrides,
  };
  const instrument = Buffer.from(encodeQuestionFile({
    ...QUESTION_FILE, heldOut: { rule: QUESTION_FILE.heldOut.rule, entries: [entry] },
  }));
  const inputs = { questionFile: join(privateRoot, 'questions'), key: join(privateRoot, 'key'),
    depth: join(privateRoot, 'depth'), tasks: join(privateRoot, 'tasks') };
  const input = { stateRoot, runId, runRecordSha256: sha256(runRecord), sourceCheckout, syzygyCheckout, views, inputs };
  fs.writeFileSync(inputs.questionFile, instrument, { mode: 0o600 });
  fs.writeFileSync(inputs.key, keyBytes, { mode: 0o600 });
  fs.writeFileSync(inputs.depth, depthBytes, { mode: 0o600 });
  fs.writeFileSync(inputs.tasks, tasksBytes, { mode: 0o600 });
  const identity = { runId, repository, commit, entry: entry.id, questionFileSha256: sha256(instrument), session: 'fixture-arm-a' };
  return { input, views, runDir, privateRoot, identity, keyBytes, instrument };
}

const answered = (text: string): ReaderAnswer => ({ kind: 'answered', text, citations: [], attemptedPaths: [] });

function script(unknownCue = 'unsupported'): Readonly<Record<string, ReaderAnswer>> {
  return {
    one: answered('\tbeta\t\r\n alpha \nalpha\n'),
    two: answered('pine'),
    three: answered(`circle\n${unknownCue}`),
    four: { kind: 'cannot-answer', reason: 'Refuses the synthetic prompt', attemptedPaths: [] },
  };
}

const expectedPacket = [
  { position: 1, kind: 'answered', answer: [1, 2], required: [1, 2] },
  { position: 2, kind: 'answered', answer: [2], required: [1, 2] },
  { position: 3, kind: 'answered', answer: [1, 3], required: [1, 2] },
  { position: 4, kind: 'cannot-answer', answer: [], required: [1, 2] },
];

const expectedGrades = [
  { position: 1, outcome: 'right', matched: 2, required: 2 },
  { position: 2, outcome: 'partial', matched: 1, required: 2 },
  { position: 3, outcome: 'wrong', matched: 1, required: 2 },
  { position: 4, outcome: 'refused', matched: 0, required: 2 },
];

describe('the scripted benchmark evaluator', () => {
  it('stores and reopens bound answers and strips arm, page, question and text from the grader packet', async () => {
    const trial = async (session: string, chrome: string, cue: string) => {
      const fixture = makeFixture();
      const store = prepareBenchmarkStore(fixture.input);
      let packet: readonly BlindBenchmarkQuestion[] | undefined;
      const benchmark = scriptedBenchmark({
        store, identity: { ...fixture.identity, session }, script: script(cue), screen: allow,
        pages: [{ path: 'visible-page.html', html: chrome }],
        onBlindPacket: captured => { packet = captured; },
      });
      expect(benchmark.grade()).toEqual({ status: 'unknown', reason: 'companion-absent' });
      expect(fs.readdirSync(store.directory)).toEqual([]);
      expect(store.directory).toBe(join(fixture.input.stateRoot, 'benchmark', runId));

      const digest = await benchmark.storeAnswers(signal());
      const raw = fs.readFileSync(join(store.directory, 'answers.json'));
      expect(sha256(raw)).toBe(digest);
      expect(JSON.parse(raw.toString('utf8'))).toMatchObject({
        format: 'polaris-scripted-benchmark-answers/1', label: 'Inferred',
        binding: {
          runId, entry: 'comparison', repository, commit, questionFileSha256: fixture.identity.questionFileSha256,
          session, keySha256: sha256(fixture.keyBytes), scriptSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
        },
        answers: [
          { question: 'one', kind: 'answered', text: '\tbeta\t\r\n alpha \nalpha\n' },
          { question: 'two', kind: 'answered', text: 'pine' },
          { question: 'three', kind: 'answered', text: `circle\n${cue}` },
          { question: 'four', kind: 'cannot-answer', text: 'Refuses the synthetic prompt' },
        ],
      });
      const stored = {
        format: 'polaris-scripted-benchmark-grade/1', label: 'Inferred',
        answerSha256: digest, keySha256: sha256(fixture.keyBytes), scores: expectedGrades,
      };
      expect(benchmark.grade()).toEqual({ status: 'graded', grade: stored });
      expect(JSON.parse(fs.readFileSync(join(store.directory, 'grade.json'), 'utf8'))).toEqual(stored);
      expect(fs.statSync(join(store.directory, 'answers.json')).mode & 0o777).toBe(0o600);
      expect(fs.readFileSync(join(fixture.runDir, 'run.json'), 'utf8')).toBe('prior fixture record\n');
      expect(packet).toEqual(expectedPacket);
      return JSON.stringify(packet);
    };
    const first = await trial('arm-alpha-session', 'Syzygy chrome canary alpha', 'unknown inline cue alpha');
    expect(await trial('arm-beta-session', 'Syzygy chrome canary beta', 'unknown inline cue beta')).toBe(first);
  });

  it('binds reopened answers to the issuing evaluator receipt and does not overwrite an existing artifact', async () => {
    const fixture = makeFixture();
    const store = prepareBenchmarkStore(fixture.input);
    const args = { store, identity: fixture.identity, screen: allow, script: script(), pages: [] };
    const benchmark = scriptedBenchmark(args);
    const outcomes = await Promise.allSettled([benchmark.storeAnswers(signal()), benchmark.storeAnswers(signal())]);
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.find(outcome => outcome.status === 'rejected')).toMatchObject({ reason: { reason: 'artifact-exists' } });
    expect(fs.readdirSync(store.directory)).toEqual(['answers.json']);

    expect(() => scriptedBenchmark(args).grade()).toThrow('answer-changed');
    const answerPath = join(store.directory, 'answers.json');
    const original = fs.readFileSync(answerPath, 'utf8');
    fs.writeFileSync(answerPath, original.replace('unsupported', 'not the recorded answer'));
    expect(() => benchmark.grade()).toThrow('answer-changed');
    expect(fs.readdirSync(store.directory)).toEqual(['answers.json']);
    fs.writeFileSync(answerPath, original);
    expect(benchmark.grade()).toMatchObject({ status: 'graded' });
    const grade = fs.readFileSync(join(store.directory, 'grade.json'));
    expect(() => benchmark.grade()).toThrow('artifact-exists');
    expect(fs.readFileSync(join(store.directory, 'grade.json'))).toEqual(grade);
  });

  it('refuses an answer with no facts and compares non-ASCII whitespace literally', async () => {
    const fixture = makeFixture();
    const store = prepareBenchmarkStore(fixture.input);
    const benchmark = scriptedBenchmark({
      store, identity: fixture.identity, script: { ...script(), one: answered('\t\r\n '), two: answered('pine\u00a0') },
      screen: allow, pages: [],
    });
    await benchmark.storeAnswers(signal());
    expect(benchmark.grade()).toMatchObject({ status: 'graded', grade: { scores: [
      { position: 1, outcome: 'wrong', matched: 0, required: 2 },
      { position: 2, outcome: 'wrong', matched: 0, required: 2 },
      ...expectedGrades.slice(2),
    ] } });
  });

  it('refuses grading after the associated run configuration changes', async () => {
    const fixture = makeFixture();
    const store = prepareBenchmarkStore(fixture.input);
    const benchmark = scriptedBenchmark({ store, identity: fixture.identity, script: script(), screen: allow, pages: [] });
    await benchmark.storeAnswers(signal());
    fs.appendFileSync(join(fixture.runDir, 'run.json'), 'changed');
    expect(() => benchmark.grade()).toThrow('custody-invalid');
    expect(fs.readdirSync(store.directory)).toEqual(['answers.json']);
  });

  it('refuses changed bindings, counts, incomplete lists and screened key or answer text', async () => {
    const fixture = makeFixture();
    const start = (f = fixture, screen: Parameters<typeof scriptedBenchmark>[0]['screen'] = allow) =>
      scriptedBenchmark({ store: prepareBenchmarkStore(f.input), identity: f.identity, screen, script: script(), pages: [] });
    const benchmark = start();
    await benchmark.storeAnswers(signal());
    fs.writeFileSync(fixture.input.inputs.key, fixture.keyBytes.toString('utf8').replace('cedar', 'birch'));
    expect(() => benchmark.grade()).toThrow('binding-invalid');
    expect(fs.existsSync(join(fixture.input.stateRoot, 'benchmark', runId, 'grade.json'))).toBe(false);
    await expect(start(makeFixture({ tasks: { state: 'not-written', reason: 'not frozen' } })).storeAnswers(signal())).rejects.toThrow('binding-invalid');
    const missing = makeFixture();
    fs.unlinkSync(missing.input.inputs.depth);
    await expect(start(missing).storeAnswers(signal())).rejects.toThrow('artifact-invalid');
    const changed = makeFixture();
    fs.appendFileSync(changed.input.inputs.tasks, ' ');
    await expect(start(changed).storeAnswers(signal())).rejects.toThrow('binding-invalid');
    const graded = { state: 'frozen' as const, key: key.id, sha256: sha256(fixture.keyBytes), count: 4, requiredFacts: 7 };
    await expect(start(makeFixture({ graded })).storeAnswers(signal())).rejects.toThrow('binding-invalid');
    const divergent = makeFixture();
    await expect(start({ ...divergent, identity: { ...divergent.identity, commit: 'c'.repeat(40) } }).storeAnswers(signal())).rejects.toThrow('binding-invalid');
    for (const canary of ['Graded question two', 'unsupported']) {
      const screened = makeFixture();
      await expect(start(screened, {
        screenBody: body => body.includes(canary) ? 'secret-detector-match' : undefined,
      }).storeAnswers(signal())).rejects.toMatchObject({ reason: 'screening-refused', message: 'screening-refused' });
      expect(fs.readdirSync(join(screened.input.stateRoot, 'benchmark', runId))).toEqual([]);
    }
  });
});

describe('scripted fixture custody', () => {
  it('accounts for each role, the actual ordered defaults and resolved overlays', () => {
    const fixture = makeFixture();
    for (const role of roles) {
      expect(() => prepareBenchmarkStore({ ...fixture.input, views: fixture.views.filter(view => view.role !== role) })).toThrow('custody-invalid');
    }
    expect(viewBinds(fixture.views[0]!).slice(0, 4)).toEqual([
      { option: '--ro-bind-try', path: '/usr' }, { option: '--ro-bind-try', path: '/etc' },
      { option: '--ro-bind-try', path: '/opt' }, { option: '--ro-bind-try', path: '/run/systemd/resolve' },
    ]);
    const alias = join(dirname(fixture.privateRoot), 'alias');
    fs.symlinkSync(fixture.privateRoot, alias);
    const changed = fixture.views.map(view => view.role === 'design' ? { ...view, readOnlyOver: [alias] } : view);
    expect(() => prepareBenchmarkStore({ ...fixture.input, views: changed })).toThrow('custody-invalid');
    expect(() => prepareBenchmarkStore({ ...fixture.input, syzygyCheckout: fixture.privateRoot })).toThrow('custody-invalid');
    const boundState = fixture.views.map(view => view.role === 'fidelity' ? { ...view, readOnlyOver: [fixture.input.stateRoot] } : view);
    expect(() => prepareBenchmarkStore({ ...fixture.input, views: boundState })).toThrow('custody-invalid');
    expect(fs.readdirSync(fixture.input.stateRoot)).toEqual([runId]);

    const store = prepareBenchmarkStore(fixture.input);
    const previous = fixture.views[0]!;
    fixture.views[0] = { ...previous, readOnlyOver: [alias] };
    expect(() => store.readInput('key', BENCHMARK_LIMITS.key)).toThrow('custody-invalid');
    fixture.views[0] = previous;
    expect(store.readInput('key', BENCHMARK_LIMITS.key)).toEqual(fixture.keyBytes);
    fs.renameSync(fixture.input.sourceCheckout, fixture.input.sourceCheckout + '-old');
    fs.mkdirSync(fixture.input.sourceCheckout);
    expect(() => store.readInput('key', BENCHMARK_LIMITS.key)).toThrow('custody-invalid');
  });

  it('uses strict single-descriptor bounds for each private artifact', () => {
    expect(BENCHMARK_LIMITS).toMatchObject({ key: 262_144, answers: 1_048_576, grade: 65_536 });
    const fixture = makeFixture();
    const store = prepareBenchmarkStore(fixture.input);
    const candidates = [
      [fixture.input.inputs.key, BENCHMARK_LIMITS.key, () => store.readInput('key', BENCHMARK_LIMITS.key)],
      [join(store.directory, 'answers.json'), BENCHMARK_LIMITS.answers, () => store.readStored('answers', BENCHMARK_LIMITS.answers)],
      [join(store.directory, 'grade.json'), BENCHMARK_LIMITS.grade, () => store.readStored('grade', BENCHMARK_LIMITS.grade)],
    ] as const;
    for (const [path, limit, read] of candidates) {
      fs.writeFileSync(path, Buffer.alloc(limit, 0x20), { mode: 0o600 });
      expect(read(), basename(path)).toHaveLength(limit);
      fs.appendFileSync(path, ' ');
      expect(read, basename(path)).toThrow('artifact-limit');
    }
    fs.unlinkSync(fixture.input.inputs.key);
    fs.symlinkSync(fixture.input.inputs.questionFile, fixture.input.inputs.key);
    expect(() => store.readInput('key', BENCHMARK_LIMITS.key)).toThrow('artifact-invalid');
    fs.unlinkSync(fixture.input.inputs.key);
    fs.linkSync(fixture.input.inputs.questionFile, fixture.input.inputs.key);
    expect(() => store.readInput('key', BENCHMARK_LIMITS.key)).toThrow('artifact-invalid');
    fs.unlinkSync(fixture.input.inputs.key);
    expect(spawnSync('mkfifo', [fixture.input.inputs.key], { timeout: 2000 }).status).toBe(0);
    expect(() => store.readInput('key', BENCHMARK_LIMITS.key)).toThrow('artifact-invalid');
  });
});

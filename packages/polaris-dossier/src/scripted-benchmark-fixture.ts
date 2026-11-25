import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { encodeQuestionFile, QUESTION_FILE, type HeldOutEntry, type ReaderAnswer } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { screenLoaderOf } from './screen.js';
import { BenchmarkRefusal, prepareBenchmarkStore } from './scripted-benchmark-store.js';
import { fixtureBytes, scriptedBenchmark, type FixtureKey } from './scripted-benchmark.js';
import { viewFor, type ViewRole } from './session-view.js';
import { createRunDirectory } from './state-directory.js';

const fixtureRoles: readonly ViewRole[] = ['author', 'inventory', 'fidelity', 'design'];
const repository = 'example.invalid/syzygy/scripted-fixture';
const commit = 'a'.repeat(40);

function makeDirectory(path: string): string {
  fs.mkdirSync(path, { mode: 0o700 });
  return path;
}

function makePrivateInput(privateRoot: string, name: string, bytes: Buffer): string {
  const path = join(privateRoot, name);
  fs.writeFileSync(path, bytes, { mode: 0o600, flag: 'wx' });
  return path;
}

function reference(key: string, rows: readonly string[]) {
  return { state: 'frozen' as const, key, sha256: sha256(fixtureBytes(rows)), count: rows.length };
}

async function runFixture(syzygyCheckout: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const checkout = fs.realpathSync(syzygyCheckout);
  const screen = await screenLoaderOf(undefined, checkout, Date.now())({ repository: `repository:${repository}`, commit, visibility: 'private' });
  if (!screen.ok) throw new BenchmarkRefusal('screening-refused');

  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'syzygy-scripted-fixture-')));
  const stateRoot = makeDirectory(join(root, 'state'));
  const privateRoot = makeDirectory(join(root, 'private'));
  const sourceCheckout = makeDirectory(join(root, 'source'));
  const shimDir = makeDirectory(join(root, 'shim'));
  const toolPath = makeDirectory(join(root, 'tool'));
  const roleRoot = makeDirectory(join(root, 'roles'));

  // Run-specific text stays outside mounts, including the checkout containing this generator.
  const nonce = randomBytes(8).toString('hex');
  const questions = ['first', 'second', 'third', 'fourth'].map(id => ({
    id, prompt: `What are the ${id} fixture facts for ${nonce}?`,
    facts: `${id} marker ${nonce} opens the sample door\n${id} marker ${nonce} closes the sample door`,
  }));
  const key: FixtureKey = { format: 'polaris-scripted-benchmark-key/1', id: 'fixture-key', questions };
  const keyBytes = fixtureBytes(key);
  const depth = Array.from({ length: 10 }, (_, index) => `Fixture depth ${nonce} item ${index + 1}`);
  const tasks = Array.from({ length: 5 }, (_, index) => `Fixture task ${nonce} item ${index + 1}`);
  const entry: HeldOutEntry = {
    id: 'fixture-comparison', repository, commit,
    graded: { state: 'frozen', key: key.id, sha256: sha256(keyBytes), count: questions.length, requiredFacts: 8 },
    depth: reference('fixture-depth', depth),
    tasks: reference('fixture-tasks', tasks),
  };
  const questionBytes = Buffer.from(encodeQuestionFile({
    ...QUESTION_FILE, heldOut: { rule: QUESTION_FILE.heldOut.rule, entries: [entry] },
  }));
  const questionFileSha256 = sha256(questionBytes);
  const keyPath = makePrivateInput(privateRoot, 'key.json', keyBytes);
  const questionFile = makePrivateInput(privateRoot, 'questions.json', questionBytes);
  const depthPath = makePrivateInput(privateRoot, 'depth.json', fixtureBytes(depth));
  const tasksPath = makePrivateInput(privateRoot, 'tasks.json', fixtureBytes(tasks));

  const runRecord = fixtureBytes({
    format: 'polaris-scripted-benchmark-fixture-run/1', repository, commit,
    questionFile: { format: QUESTION_FILE.format, version: QUESTION_FILE.version, sha256: questionFileSha256 },
  });
  const run = createRunDirectory(stateRoot, sourceCheckout, runRecord.toString('utf8'));
  if (!run.created) throw new BenchmarkRefusal('custody-invalid');
  makeDirectory(join(run.runDir, 'drafts'));
  const views = fixtureRoles.map(role => {
    const dir = makeDirectory(join(roleRoot, role));
    const socketDir = makeDirectory(join(dir, 'socket'));
    return viewFor({
      role, clone: sourceCheckout, runDir: run.runDir,
      sessionDir: role === 'author' ? run.runDir : makeDirectory(join(dir, 'session')),
      agentHome: makeDirectory(join(dir, 'home')), checkout, toolPaths: [toolPath], shimDir,
      socketDir, brokerSocket: join(socketDir, 'fixture.sock'),
    });
  });
  const store = prepareBenchmarkStore({
    stateRoot, runId: run.runId, runRecordSha256: sha256(runRecord), sourceCheckout, syzygyCheckout: checkout, views,
    inputs: { questionFile, key: keyPath, depth: depthPath, tasks: tasksPath },
  });
  const answered = (text: string): ReaderAnswer => ({ kind: 'answered', text, citations: [], attemptedPaths: [] });
  const benchmark = scriptedBenchmark({
    store, screen: screen.screen,
    identity: { runId: run.runId, repository, commit, entry: entry.id, questionFileSha256, session: 'fixture-reader' },
    script: {
      first: answered(questions[0]!.facts),
      second: answered(questions[1]!.facts.split('\n')[0]!),
      third: answered(`Fixture ${nonce} rejects the sample door`),
      fourth: { kind: 'cannot-answer', reason: 'No supported fixture answer', attemptedPaths: [] },
    },
    pages: [{ path: 'index.html', html: '<main><h1>Scripted comparison fixture</h1></main>' }],
  });
  await benchmark.storeAnswers(signal);
  const result = benchmark.grade();
  if (result.status !== 'graded') throw new BenchmarkRefusal('answer-changed');
  return { runId: run.runId, directory: store.directory, ...result.grade };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) {
    process.stderr.write('Usage: npm run scripted-benchmark-fixture --workspace @syzygy/polaris-dossier\n');
    process.exitCode = 2;
  } else {
    try {
      const result = await runFixture(process.cwd(), new AbortController().signal);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      // Errors from the filesystem, decoder or policy loader may contain private paths or bytes.
      const reason = error instanceof BenchmarkRefusal ? error.reason : 'fixture-unavailable';
      process.stderr.write(`${reason}\n`);
      process.exitCode = 1;
    }
  }
}

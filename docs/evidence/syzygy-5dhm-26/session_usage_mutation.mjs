// Recorded mutation run over the session-usage predicates (syzygy-5dhm.26), adapted from
// docs/evidence/syzygy-5dhm-135/question_kind_mutation.mjs.
// Usage: node session_usage_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the checks of its group, and restores the source in
// `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node session_usage_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const P = 'packages/polaris-dossier/src';
const USAGE = `${P}/session-usage.ts`, CLOSE = `${P}/close.ts`, STATUS = `${P}/status.ts`, RENDER = `${P}/render.ts`;
const REGION = 'apps/three-surface-poc/src/polaris-generation/dossier-render-local.ts';
const UNIT = `${P}/session-usage.test.ts`, FLOW = `${P}/close-session-usage.test.ts`;
const TESTS = { [USAGE]: [UNIT, FLOW], [CLOSE]: [FLOW], [STATUS]: [FLOW, `${P}/status.test.ts`], [RENDER]: [FLOW], [REGION]: [FLOW] };
const TIMEOUT_MS = 900_000;

const MUTANTS = [
  // --- whole-run Unknowns
  ['operator-started-read', USAGE, "if (marker === 'absent') return { ...head, label: 'Unknown', why: 'operator-started' };", ''],
  ['marker-unreadable-read', USAGE, "if (marker === 'unreadable') return { ...head, label: 'Unknown', why: 'launched-marker-unreadable' };", ''],
  // --- the walk: links, depth, count, empty
  ['link-skipped', USAGE, "        return 'link-or-special-entry';\n      }\n    }\n    return null;", '        continue;\n      }\n    }\n    return null;'],
  ['depth-unbounded', USAGE, "if (depth >= TRANSCRIPT_DEPTH_MAX) return 'too-many-transcripts';", ''],
  ['files-unbounded', USAGE, "if (files.length >= TRANSCRIPT_FILES_MAX) return 'too-many-transcripts';", ''],
  ['no-transcript-zero', USAGE, "if (files.length === 0) return unknown('no-transcript');", ''],
  ['home-absent-zero', USAGE, "try { homeStat = fs.lstatSync(home); } catch { return unknown('no-agent-home'); }", "try { homeStat = fs.lstatSync(home); } catch { return unknown('no-transcript'); }"],
  // --- lines: the unterminated last line, malformed lines, non-objects
  ['unterminated-strict', USAGE, '      if (index === lines.length) continue;\n', ''],
  ['malformed-tolerated', USAGE, "      if (index === lines.length) continue;\n      return 'transcript-malformed-line';", '      continue;'],
  ['non-object-tolerated', USAGE, "    if (!isRecord(entry)) return 'transcript-malformed-line';", '    if (!isRecord(entry)) continue;'],
  // --- responses: synthetic, identity, usage, one per identity, largest count
  ['synthetic-counted', USAGE, '    if (message[\'model\'] === SYNTHETIC_MODEL) continue;\n', ''],
  ['identity-optional', USAGE, "    if (typeof id !== 'string' || id === '') return 'response-without-identity';", "    if (typeof id !== 'string') return 'response-without-identity';"],
  ['usage-optional', USAGE, "    if (!isRecord(usage)) return 'response-without-usage';", '    if (!isRecord(usage)) continue;'],
  ['per-line-sum', USAGE, 'counts[field] = Math.max(counts[field] ?? 0, value);', 'counts[field] = (counts[field] ?? 0) + value;'],
  ['response-per-line', USAGE, '    tally.responses.set(id, counts);', '    tally.responses.set(`${id}/${tally.responses.size}`, counts);'],
  ['kind-missing-zero', USAGE, 'if (!nonnegative(value)) { tally.unreadable.add(field); continue; }', 'if (!nonnegative(value)) continue;'],
  // --- totals and span
  ['session-unknown-ignored', USAGE, "    if (!all) return { state: 'unknown', why: 'session-unknown' };\n", ''],
  ['total-kind-unknown-ignored', USAGE, "    return counts.find((count) => count.state === 'unknown') ?? sum(counts.map((count) => (count as { value: number }).value));", "    return sum(counts.map((count) => (count.state === 'counted' ? count.value : 0)));"],
  ['span-summed', USAGE, 'ms: Math.max(...bounds.map((b) => b!.last)) - Math.min(...bounds.map((b) => b!.first))', 'ms: bounds.reduce((n, b) => n + b!.last - b!.first, 0)'],
  ['role-span-zero', USAGE, "spanMs: bounds === null ? { state: 'unknown', why: 'no-instant' } : { state: 'measured', ms: bounds.last - bounds.first },", "spanMs: { state: 'measured', ms: 0 },"],
  // --- the cost line and the stored-form test
  ['cost-label-unknown', USAGE, "return { label: 'Inferred', text: `Cost: ${parts.join(', ')}; ${COST_LINE_BASIS}.` };", "return { label: 'Unknown', text: `Cost: ${parts.join(', ')}; ${COST_LINE_BASIS}.` };"],
  ['cost-unknown-names-dropped', USAGE, 'text: `Cost: run total Unknown (${unknown.join(\'; \')})', 'text: `Cost: run total Unknown ()'],
  ['stored-extra-key-admitted', USAGE, "(value['label'] === 'Inferred' && Object.keys(value).length === 6 && nonnegative(value['transcripts'])", "(value['label'] === 'Inferred' && nonnegative(value['transcripts'])"],
  ['stored-role-order-free', USAGE, 'SESSION_ROLES.every((role, index) => isRoleUsage(sessions[index], role))', 'SESSION_ROLES.every((_role, index) => isRoleUsage(sessions[index], (sessions[index] as { role: SessionRole }).role))'],
  // --- close, status, render and the region
  ['close-member-dropped', CLOSE, '    sessionUsage: usageRead,\n', ''],
  ['status-closed-reads-now', STATUS, 'cost: steps.closed ? closedCost(path.join(run, RUN_LAYOUT.record))', 'cost: false ? closedCost(path.join(run, RUN_LAYOUT.record))'],
  ['status-older-record-unknown', STATUS, "  if (!Object.hasOwn(record, 'sessionUsage')) return COST_NOT_IN_RECORD;\n", ''],
  ['status-unvalidated', STATUS, "  return isSessionUsage(record['sessionUsage']) ? costLine(record['sessionUsage']).text : COST_RECORD_UNREADABLE;", "  return costLine(record['sessionUsage'] as never).text;"],
  ['render-item-dropped', RENDER, '    costStatusItem(run),\n', ''],
  ['region-every-page', REGION, 'items.filter(item => showDigests || item.id !== COST_STATUS_ID)', 'items'],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [
  { id: 'read-follows-link', file: USAGE, old: 'readBoundedFile(file, TRANSCRIPT_BYTES_MAX, { followLink: false })',
    why: 'the walk refuses a link entry (link-skipped above) before any read, so following a link at the read is reachable only when a file is swapped for a link between the walk and the open, which no hermetic test can time; kept as defence in depth' },
  { id: 'over-bound', file: USAGE, old: "cause instanceof PastBoundError ? 'transcript-over-bound' : 'transcript-unreadable'",
    why: 'a transcript past 268,435,456 bytes is not written in a unit test; both reasons are Unknown, so the role is Unknown either way' },
];
for (const { id, file, old } of EQUIVALENT) {
  const count = fs.readFileSync(path.join(root, file), 'utf8').split(old).length - 1;
  if (count !== 1) throw new Error(`${id}: the fragment occurs ${count} times in ${file}`);
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = [...new Set(MUTANTS.map(([, file]) => file))].sort();
const originals = new Map(files.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const wrong = [];
for (const [id, file, old] of MUTANTS) {
  const count = originals.get(file).split(old).length - 1;
  if (count !== 1) wrong.push(`${id}: the fragment occurs ${count} times in ${file}`);
}
if (wrong.length > 0) throw new Error(wrong.join('\n'));
if (new Set(MUTANTS.map(([id]) => id)).size !== MUTANTS.length) throw new Error('a mutant id repeats');
if (dry) { process.stdout.write(`${MUTANTS.length} mutants, each fragment once\n`); process.exit(0); }
const restoreAll = () => { for (const [file, text] of originals) fs.writeFileSync(path.join(root, file), text); };
process.on('SIGINT', () => { restoreAll(); process.exit(130); });
process.on('SIGTERM', () => { restoreAll(); process.exit(143); });

async function runPython(tag, commands) {
  const failedTests = [];
  for (const command of commands) {
    const child = spawn('python3', command, { cwd: root, stdio: 'ignore' });
    const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c)));
    if (code !== 0) failedTests.push(`python3 ${command.join(' ')} (exit ${code})`);
  }
  return { code: failedTests.length === 0 ? 0 : 1, timedOut: false, failedTests, total: commands.length };
}

async function runGroup(tag, group) {
  if (Array.isArray(group)) return runTests(tag, group);
  const python = await runPython(tag, group.python);
  if (group.vitest === undefined) return python;
  const vitest = await runTests(tag, group.vitest);
  return { code: python.code || vitest.code, timedOut: vitest.timedOut, failedTests: [...python.failedTests, ...vitest.failedTests], total: python.total + (vitest.total ?? 0) };
}

async function runTests(tag, tests) {
  const report = path.join(scratch, `mutation-${tag}.json`);
  fs.rmSync(report, { force: true });
  const child = spawn('npx', ['vitest', 'run', ...tests, '--testTimeout=120000', '--reporter=json', `--outputFile=${report}`], { cwd: root, detached: true, stdio: 'ignore' });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }, TIMEOUT_MS);
  const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c)));
  clearTimeout(timer);
  try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
  const failedTests = [];
  let total = null;
  if (fs.existsSync(report)) {
    const json = JSON.parse(fs.readFileSync(report, 'utf8'));
    total = json.numTotalTests;
    for (const result of json.testResults) {
      const failed = result.assertionResults.filter((a) => a.status === 'failed').map((a) => `${path.relative(root, result.name)} > ${a.fullName}`);
      for (const name of failed) failedTests.push(name);
      if (failed.length === 0 && result.status === 'failed') failedTests.push(`${path.relative(root, result.name)} (file failed: ${String(result.message).slice(0, 200)})`);
    }
  }
  return { code, timedOut, failedTests, total };
}

const head = await new Promise((resolve) => { const c = spawn('git', ['-C', root, 'rev-parse', 'HEAD']); let s = ''; c.stdout.on('data', (d) => { s += d; }); c.on('exit', () => resolve(s.trim())); });
const record = {
  format: 'mutation-run/1',
  ranAt: new Date().toISOString(),
  commit: head,
  subject: Object.fromEntries(files.map((file) => [file, sha(originals.get(file))])),
  command: 'npx vitest run <the test files of the mutant\'s source file> --testTimeout=120000 --reporter=json --outputFile=<scratch>/mutation-<id>.json; for a Python or JSON source, python3 <each listed command> (a non-zero exit is a failure)',
  method: `Each mutant replaces one fragment (asserted to occur exactly once) in its file, runs the test files listed for that file under vitest with the JSON reporter, and restores every source in finally. A mutant is killed when the run exits non-zero and at least one test fails (failedTests lists each) or is stopped after ${TIMEOUT_MS / 1000} s; a run that exits non-zero with no failed test and no timeout is recorded as not run, never as killed. The unmutated baseline of each group runs first and must pass.`,
  testFiles: TESTS,
  baselines: [],
  mutants: [],
  equivalent: EQUIVALENT,
  summary: null,
};
try {
  for (const file of files) {
    const baseline = await runGroup(`baseline-${path.basename(file)}`, TESTS[file]);
    record.baselines.push({ file, exitCode: baseline.code, tests: baseline.total, failedTests: baseline.failedTests });
    if (baseline.code !== 0) throw new Error(`the baseline for ${file} fails: ${baseline.failedTests.join('; ')}`);
  }
  for (const [id, file, old, replacement] of MUTANTS) {
    const started = Date.now();
    try {
      fs.writeFileSync(path.join(root, file), originals.get(file).replace(old, () => replacement));
      const result = await runGroup(id, TESTS[file]);
      const killed = result.timedOut || (result.code !== 0 && result.failedTests.length > 0);
      const notRun = !result.timedOut && result.code !== 0 && result.failedTests.length === 0;
      record.mutants.push({ id, file, old, new: replacement, killed, killedBy: result.timedOut ? 'timeout' : killed ? 'tests' : null, ...(notRun ? { notRun: true } : {}), tests: result.total, failedTests: result.failedTests, seconds: Math.round((Date.now() - started) / 1000) });
      process.stdout.write(`${id}: ${killed ? 'killed' : notRun ? 'NOT RUN' : 'SURVIVED'} (${result.failedTests.length} failed${result.timedOut ? ', timeout' : ''})\n`);
    } finally {
      restoreAll();
    }
  }
} finally {
  restoreAll();
  for (const file of files) if (sha(fs.readFileSync(path.join(root, file))) !== record.subject[file]) throw new Error(`${file} was not restored`);
  const killed = record.mutants.filter((m) => m.killed).length;
  record.summary = { mutants: record.mutants.length, killed, survived: record.mutants.length - killed, byTimeout: record.mutants.filter((m) => m.killedBy === 'timeout').length, equivalentNotRun: EQUIVALENT.length };
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
}

import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOSSIER_READER_QUESTIONS, QUESTION_FILE, dossierQuestionsFile, encodeQuestionFile, type QuestionFile } from '@syzygy/polaris-generation-core/live';
import { beforeAll, describe, expect, it } from 'vitest';
import { BRIEF_TOPICS, renderBrief } from './brief.js';
import { readSec3 } from './doctrine-quote.js';
import { decideExecutionRule, type ExecutionRule } from './execution-rule.js';
import { declaredSubjectFixture } from './full-run.testkit.js';
import type { GateState } from './gate-sources.js';
import { renderInventoryBrief } from './inventory.js';
import { heldOutFindings, readHeldOutNeedles, type KeyQuestion, type RolePacket } from './regression-hold-out.testkit.js';
import { fidelityCriteria } from './review-packet.js';
import { parseRunConfig, type RunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, type RunSubject } from './run-record.js';
import { bwrapArgs, viewFor, type ViewInputs } from './session-view.js';

/**
 * Exercise the lexical predicate on selected fixture-built role texts under
 * syzygy-5dhm.21. The evaluator lookup holds only artificial key material.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const REV = '498ecd0d6d007db11ddb3aea9428552598a78622';
const RUN_ID = `run-${'a'.repeat(32)}`;
const OK: GateState = { state: 'ok', record: 'FIXTURE-ACT' };
const SUBJECT: RunSubject = {
  repository: { url: 'github.com/redis/redis', repositoryId: 'redis-redis', role: 'observed-source' },
  clone: { path: '/srv/clones/redis', declaredBy: 'operator', label: 'Inferred', use: 'read' },
  pinnedRevision: { commit: REV, label: 'label-in-run-json', pinnedAt: '2026-10-07T10:00:00.000Z' },
  ...declaredSubjectFixture(),
  governed: { kind: 'non-governed', because: ['the project input fixture states that no kernel evidence drawer exists'] },
  workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
};
const config = (): RunConfig => {
  const parsed = parseRunConfig(JSON.stringify({
    operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'claude-opus-5-5',
    deadline: 'PT1H', agentTokenBudget: 100_000, maxRepairCycles: 3, maxQuestions: 2, audience: 'an operator', operatorIsOwner: true,
  }));
  if (!parsed.ok) throw new Error('fixture configuration refused');
  return parsed.config;
};

const GRADED = {
  questions: [
    { id: 'Q1', question: 'Why does a copper lighthouse send three quiet signals through the fog',
      required_facts: ['The keeper paints every narrow handrail lavender before inspecting the lantern'] },
    { id: 'Q2', question: 'How does the striped trolley avoid the cracked bridge during a storm',
      required_facts: ['The driver turns east at the antique fountain every Tuesday'] },
  ],
};
const DEPTH = { depth: Array.from({ length: 10 }, (_, index) =>
  ({ id: `D${index + 1}`, fact: `Observation ${index + 1} concerns imported ceramics in a vaulted attic` })) };
const TASKS = { tasks: Array.from({ length: 5 }, (_, index) =>
  ({ id: `T${index + 1}`, task: `Find drawer ${index + 1} near the clock under the spiral bench` })) };
const gradedKey = Buffer.from(JSON.stringify(GRADED));
const depthKey = Buffer.from(JSON.stringify(DEPTH));
const taskKey = Buffer.from(JSON.stringify(TASKS));
const custody = new Map([
  ['grade-fixture-v1', gradedKey],
  ['depth-fixture-v1', depthKey],
  ['tasks-fixture-v1', taskKey],
]);
const digest = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const FIXTURE_FILE: QuestionFile = {
  ...QUESTION_FILE,
  heldOut: {
    ...QUESTION_FILE.heldOut,
    entries: [{
      id: 'synthetic-comparison',
      repository: 'example.test/fixtures/keepsake',
      commit: '4'.repeat(40),
      graded: { state: 'frozen', key: 'grade-fixture-v1', sha256: digest(gradedKey), count: 2, requiredFacts: 2 },
      depth: { state: 'frozen', key: 'depth-fixture-v1', sha256: digest(depthKey), count: 10 },
      tasks: { state: 'frozen', key: 'tasks-fixture-v1', sha256: digest(taskKey), count: 5 },
    }],
  },
};
const lookup = (key: string): Buffer | undefined => custody.get(key);

let needles: KeyQuestion[] = [];
let listsRead = 0;
let packets: RolePacket[] = [];

beforeAll(async () => {
  ({ needles, listsRead } = readHeldOutNeedles(lookup, FIXTURE_FILE));
  const sec3 = readSec3(ROOT);
  if (!sec3.ok) throw new Error(sec3.reason);
  const rule = async (role: 'authoring' | 'inventory'): Promise<ExecutionRule> => decideExecutionRule({
    role, runDir: '/r', runId: RUN_ID, pinnedRevision: REV, operatorIsOwner: true, sec3: sec3.sec3, now: NOW, d9: async () => OK, launched: () => 'absent', permitting: { enabled: false },
  });
  const brief = renderBrief({ runId: RUN_ID, subject: SUBJECT, declared: config(), issuedAt: NOW, schemaSha256: '0'.repeat(64), executionRule: await rule('authoring'), revisionLabel: '8.10.2', copy: null });
  const inventory = renderInventoryBrief({ runDir: '/r', runId: RUN_ID, subject: SUBJECT, declared: config(), deadlineEnds: NOW + 3_600_000, session: 1,
    executionRule: await rule('inventory'), census: { ok: false, why: 'fixture: no census', consented: null }, copy: null });
  packets = [
    { role: 'author', packet: 'brief.md', text: brief },
    { role: 'editor', packet: 'brief.md', text: brief },
    { role: 'inventory', packet: 'inventory-brief.md', text: inventory },
    { role: 'reviewer', packet: 'fidelity-criteria', text: fidelityCriteria('/r').join('\n\n') },
    { role: 'editor', packet: 'provider-reader-questions.json', text: dossierQuestionsFile() },
    { role: 'scout', packet: 'discovery-reader-questions', text: DOSSIER_READER_QUESTIONS.map((question) => question.text).join('\n') },
    { role: 'author', packet: 'question-file-v1.json', text: encodeQuestionFile(FIXTURE_FILE) },
  ];
});

describe('the question file’s synthetic hold-out controls', () => {
  it('loads the three frozen evaluator lists and enumerates their nineteen distinct needles', () => {
    expect(listsRead).toBe(3);
    expect(needles.map(({ id }) => id)).toEqual([
      'synthetic-comparison/graded/Q1', 'synthetic-comparison/graded/Q2',
      'synthetic-comparison/graded/Q1#1', 'synthetic-comparison/graded/Q2#1',
      'synthetic-comparison/depth/D1', 'synthetic-comparison/depth/D2', 'synthetic-comparison/depth/D3',
      'synthetic-comparison/depth/D4', 'synthetic-comparison/depth/D5', 'synthetic-comparison/depth/D6',
      'synthetic-comparison/depth/D7', 'synthetic-comparison/depth/D8', 'synthetic-comparison/depth/D9',
      'synthetic-comparison/depth/D10', 'synthetic-comparison/tasks/T1', 'synthetic-comparison/tasks/T2',
      'synthetic-comparison/tasks/T3', 'synthetic-comparison/tasks/T4', 'synthetic-comparison/tasks/T5',
    ]);
  });

  it('never requests a key for the shipped comparison entry while its lists are unwritten', () => {
    expect(readHeldOutNeedles((key) => { throw new Error(`unexpected key lookup: ${key}`); }, QUESTION_FILE))
      .toEqual({ needles: [], listsRead: 0 });
  });

  it('checks seven packets over five roles, each one non-empty, and finds nothing held out in any', () => {
    expect(packets.map(({ role, packet }) => `${role}:${packet}`)).toEqual([
      'author:brief.md', 'editor:brief.md', 'inventory:inventory-brief.md', 'reviewer:fidelity-criteria',
      'editor:provider-reader-questions.json', 'scout:discovery-reader-questions', 'author:question-file-v1.json',
    ]);
    expect(Math.min(...packets.map(({ text }) => text.length))).toBeGreaterThan(300);
    // The brief carries the public topics the file holds, so the population is the one the file feeds.
    for (const topic of BRIEF_TOPICS) expect(packets[0]?.text).toContain(topic.text);
    expect(heldOutFindings(packets, needles)).toEqual([]);
  });

  it('reports a packet with a held-out question or fact planted in it, by role, packet and id, without repeating the text', () => {
    const question = needles.find(({ id }) => id === 'synthetic-comparison/graded/Q1');
    const fact = needles.find(({ id }) => id === 'synthetic-comparison/graded/Q2#1');
    if (question === undefined || fact === undefined) throw new Error('fixture needles missing');
    for (const [index, { role, packet }] of packets.entries()) {
      const planted = packets.map((each, at) => (at === index ? { ...each, text: `${each.text}\n\n${question.question}\n` } : each));
      expect(heldOutFindings(planted, needles)).toEqual([`${role}:${packet}: synthetic-comparison/graded/Q1`]);
    }
    const findings = heldOutFindings([{ role: 'inventory', packet: 'inventory-brief.md', text: `${packets[2]?.text}\n- ${fact.question}` }], needles);
    expect(findings).toEqual(['inventory:inventory-brief.md: synthetic-comparison/graded/Q2#1']);
    expect(findings.join('\n')).not.toContain(fact.question.slice(0, 30));
  });

  it('finds a needle serialized into JSON, escaped or wrapped, and does not read a short fragment as one', () => {
    const question = needles.find(({ id }) => id === 'synthetic-comparison/graded/Q2');
    if (question === undefined) throw new Error('fixture needle missing');
    const words = question.question.split(' ');
    const escaped = JSON.stringify({ readerQuestions: [words.slice(0, 6).join(' ') + '\n' + words.slice(6).join(' ')] });
    expect(escaped).toContain('\\n');
    expect(heldOutFindings([{ role: 'editor', packet: 'stage-request.json', text: escaped }], needles)).toEqual(['editor:stage-request.json: synthetic-comparison/graded/Q2']);
    const unicode = JSON.stringify({ q: question.question }).replace(/ /gu, '\\u0020');
    expect(heldOutFindings([{ role: 'scout', packet: 'map-input.json', text: unicode }], needles)).toEqual(['scout:map-input.json: synthetic-comparison/graded/Q2']);
    expect(heldOutFindings([{ role: 'author', packet: 'brief.md', text: words.slice(0, 7).join(' ') }], needles)).toEqual([]);
  });

  it('refuses missing, stale or miscounted evaluator keys', () => {
    const entry = FIXTURE_FILE.heldOut.entries[0];
    if (entry === undefined || entry.graded.state !== 'frozen') throw new Error('fixture entry missing');
    const stale = { ...FIXTURE_FILE, heldOut: { ...FIXTURE_FILE.heldOut, entries: [{ ...entry, graded: { ...entry.graded, sha256: 'f'.repeat(64) } }] } };
    expect(() => readHeldOutNeedles(lookup, stale)).toThrow("the key's bytes do not hash to the question file's digest");
    const miscounted = { ...FIXTURE_FILE, heldOut: { ...FIXTURE_FILE.heldOut, entries: [{ ...entry, graded: { ...entry.graded, count: 3 } }] } };
    expect(() => readHeldOutNeedles(lookup, miscounted)).toThrow("the key's counts differ from the question file's");
    expect(() => readHeldOutNeedles((key) => (key === 'tasks-fixture-v1' ? undefined : lookup(key)), FIXTURE_FILE))
      .toThrow('held-out synthetic-comparison/tasks: the evaluator key is unavailable');
  });

  it('keeps a sibling evaluator key out of each supervised view and detects the same key under a mounted checkout', () => {
    const mounts = {
      checkout: '/fixture/syzygy',
      clone: '/fixture/observed',
      runDir: '/fixture/run',
      sessionDir: '/fixture/session',
      agentHome: '/fixture/home',
      socketDir: '/fixture/socket',
      brokerSocket: '/fixture/socket/broker',
      shimDir: '/fixture/shim',
      toolPaths: ['/fixture/tools'],
    };
    const roles: readonly ViewInputs['role'][] = ['author', 'inventory', 'fidelity', 'design'];
    for (const role of roles) {
      const args = bwrapArgs(viewFor({ role, ...mounts }));
      const mounted = args.flatMap((arg, index) =>
        ['--ro-bind', '--ro-bind-try', '--bind'].includes(arg) ? [args[index + 2]] : []);
      const visible = (file: string): boolean => mounted.some((root) => file === root || file.startsWith(`${root}/`));
      expect([role, visible('/fixture/syzygy/public-question-source.json')]).toEqual([role, true]);
      expect([role, visible('/fixture/evaluator/grade-fixture-v1')]).toEqual([role, false]);
      expect([role, visible('/fixture/syzygy/evaluator/grade-fixture-v1')]).toEqual([role, true]);
    }
  });
});

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOSSIER_READER_QUESTIONS, QUESTION_FILE, dossierQuestionsFile, encodeQuestionFile } from '@syzygy/polaris-generation-core/live';
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

/** The question file's hold-out (syzygy-5dhm.21, R1 slice 1): no packet an authoring, inventory, editor or scout session is given carries
 * a held-out text of the question file, and a packet that does is reported by role, packet and needle id, never by its text.
 *
 * The needles are every held-out list the question file marks frozen, read from the key file it names and checked against its digest
 * and counts (`readHeldOutNeedles`). The packets are each role's text as this tree builds it from fixtures: the operator-agent brief
 * (author and editor: the repair loop re-reads the same brief), the inventory brief, the fidelity reviewer's criteria, the provider
 * profile's frozen reader-questions file that every provider stage request carries (inventory, plan, author, edit, repair), the
 * discovery scout's reader-question strings, and the question file itself, which is public. Expected values are literals. */

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

let needles: KeyQuestion[] = [];
let listsRead = 0;
let packets: RolePacket[] = [];

beforeAll(async () => {
  ({ needles, listsRead } = readHeldOutNeedles(ROOT));
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
    { role: 'author', packet: 'question-file-v1.json', text: encodeQuestionFile(QUESTION_FILE) },
  ];
});

describe('the question file\'s held-out part stays out of every authoring packet', () => {
  it('reads every frozen held-out list the file names: today the pilot\'s graded key, 24 questions and 81 facts', () => {
    expect(listsRead).toBe(1);
    expect(needles).toHaveLength(105);
    expect(needles[0]?.id).toBe('redis-pilot-2026-11-21/graded/Q01');
    expect(needles.at(-1)?.id).toBe('redis-pilot-2026-11-21/graded/Q24#3');
    expect(new Set(needles.map(({ id }) => id)).size).toBe(105);
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
    const question = needles.find(({ id }) => id === 'redis-pilot-2026-11-21/graded/Q05');
    const fact = needles.find(({ id }) => id === 'redis-pilot-2026-11-21/graded/Q11#2');
    if (question === undefined || fact === undefined) throw new Error('fixture needles missing');
    for (const [index, { role, packet }] of packets.entries()) {
      const planted = packets.map((each, at) => (at === index ? { ...each, text: `${each.text}\n\n${question.question}\n` } : each));
      expect(heldOutFindings(planted, needles)).toEqual([`${role}:${packet}: redis-pilot-2026-11-21/graded/Q05`]);
    }
    const findings = heldOutFindings([{ role: 'inventory', packet: 'inventory-brief.md', text: `${packets[2]?.text}\n- ${fact.question}` }], needles);
    expect(findings).toEqual(['inventory:inventory-brief.md: redis-pilot-2026-11-21/graded/Q11#2']);
    expect(findings.join('\n')).not.toContain(fact.question.slice(0, 30));
  });

  it('finds a needle serialized into JSON, escaped or wrapped, and does not read a short fragment as one', () => {
    const question = needles.find(({ id }) => id === 'redis-pilot-2026-11-21/graded/Q02');
    if (question === undefined) throw new Error('fixture needle missing');
    const words = question.question.split(' ');
    const escaped = JSON.stringify({ readerQuestions: [words.slice(0, 6).join(' ') + '\n' + words.slice(6).join(' ')] });
    expect(escaped).toContain('\\n');
    expect(heldOutFindings([{ role: 'editor', packet: 'stage-request.json', text: escaped }], needles)).toEqual(['editor:stage-request.json: redis-pilot-2026-11-21/graded/Q02']);
    const unicode = JSON.stringify({ q: question.question }).replace(/ /gu, '\\u0020');
    expect(heldOutFindings([{ role: 'scout', packet: 'map-input.json', text: unicode }], needles)).toEqual(['scout:map-input.json: redis-pilot-2026-11-21/graded/Q02']);
    expect(heldOutFindings([{ role: 'author', packet: 'brief.md', text: words.slice(0, 7).join(' ') }], needles)).toEqual([]);
  });

  it('refuses a question file whose held-out reference does not match its key, so a stale key cannot pass the check unread', () => {
    const entry = QUESTION_FILE.heldOut.entries[0];
    if (entry === undefined || entry.graded.state !== 'frozen') throw new Error('fixture entry missing');
    const stale = { ...QUESTION_FILE, heldOut: { ...QUESTION_FILE.heldOut, entries: [{ ...entry, graded: { ...entry.graded, sha256: 'f'.repeat(64) } }] } };
    expect(() => readHeldOutNeedles(ROOT, stale)).toThrow('the key\'s bytes do not hash to the question file\'s digest');
    const miscounted = { ...QUESTION_FILE, heldOut: { ...QUESTION_FILE.heldOut, entries: [{ ...entry, graded: { ...entry.graded, count: 23 } }] } };
    expect(() => readHeldOutNeedles(ROOT, miscounted)).toThrow('the key\'s counts differ from the question file\'s');
    expect(fs.existsSync(path.join(ROOT, entry.graded.key))).toBe(true);
  });
});

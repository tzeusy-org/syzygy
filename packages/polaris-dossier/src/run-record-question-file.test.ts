import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { declaredSubjectFixture } from './full-run.testkit.js';
import { parseRunConfig, type RunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, readRunRecord, type RunSubject } from './run-record.js';

// syzygy-5dhm.21 (REQ-polaris-generation-033 version 2.27): the run record names the question file's digest. The expected digest is
// computed here from the JSON copy's bytes, never imported from the module under test.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const FILE_SHA = createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'docs/polaris-generation/question-file-v1.json'))).digest('hex');
const SUBJECT: RunSubject = {
  repository: { url: 'github.com/redis/redis', repositoryId: 'redis-redis', role: 'observed-source' },
  clone: { path: '/srv/clones/redis', declaredBy: 'operator', label: 'Inferred', use: 'read' },
  pinnedRevision: { commit: '498ecd0d6d007db11ddb3aea9428552598a78622', label: '8.10.2', pinnedAt: '2026-10-07T10:00:00.000Z' },
  ...declaredSubjectFixture(),
  governed: { kind: 'non-governed', because: ['fixture'] },
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
const stored = (): Record<string, unknown> => JSON.parse(encodeRunRecord(config(), SUBJECT)) as Record<string, unknown>;
const text = (record: Record<string, unknown>): string => `${JSON.stringify(record, null, 2)}\n`;

describe('the run record names the question file', () => {
  it('writes the question file\'s format, version and digest at init, and reads them back', () => {
    expect(FILE_SHA).toBe('b389837535a755d3886b223ce776bbb99bb87a0fac121294613b6bfa3dc1db0f');
    const record = stored();
    expect(record['questionFile']).toEqual({ format: 'polaris-question-file/1', version: 1, sha256: FILE_SHA });
    expect(Object.keys(record)).toEqual(['format', 'mode', 'declared', 'declaredBy', 'label', 'modelVersionProvider', 'principal', 'subject', 'questionFile']);
    const read = readRunRecord(text(record));
    expect(read.ok && read.record.questionFile).toEqual({ format: 'polaris-question-file/1', version: 1, sha256: FILE_SHA });
  });

  it('reads a record written before 2.27, which names no question file, with the file Unknown (null), never refused or rewritten', () => {
    const before = stored();
    delete before['questionFile'];
    const read = readRunRecord(text(before));
    expect(read.ok).toBe(true);
    expect(read.ok && read.record.questionFile).toBeNull();
  });

  it('refuses a malformed binding and a stray field', () => {
    const cases: [string, unknown][] = [
      ['other format', { format: 'polaris-question-file/2', version: 1, sha256: FILE_SHA }],
      ['short digest', { format: 'polaris-question-file/1', version: 1, sha256: FILE_SHA.slice(1) }],
      ['upper-case digest', { format: 'polaris-question-file/1', version: 1, sha256: FILE_SHA.toUpperCase() }],
      ['version zero', { format: 'polaris-question-file/1', version: 0, sha256: FILE_SHA }],
      ['extra member', { format: 'polaris-question-file/1', version: 1, sha256: FILE_SHA, path: 'docs/x.json' }],
      ['null', null],
    ];
    for (const [name, binding] of cases) {
      const read = readRunRecord(text({ ...stored(), questionFile: binding }));
      expect([name, read.ok, !read.ok && read.detail]).toEqual([name, false, 'run.json questionFile must carry exactly the polaris-question-file/1 format, a version and a SHA-256']);
    }
    const stray = readRunRecord(text({ ...stored(), questions: [] }));
    expect(stray.ok).toBe(false);
    expect(!stray.ok && stray.detail).toBe('run.json carries fields declared, declaredBy, format, label, mode, modelVersionProvider, principal, questionFile, questions, subject; expected declared, declaredBy, format, label, mode, modelVersionProvider, principal, questionFile, subject (questionFile absent only in a record written before it)');
  });
});

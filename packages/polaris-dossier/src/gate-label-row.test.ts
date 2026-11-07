import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { templateFields, type RecorderTemplate } from '@syzygy/polaris-generation-consent';
import { renderDossierLocalAgentAct, renderProviderV2Act, type DossierLocalAgentActKey } from '@syzygy/polaris-generation-consent/testing';
import { beforeAll, describe, expect, it } from 'vitest';
import { D9_ACT_FORM, DRAWER_FORMS, PROVIDER_V2_FORM, RFC7_20_RULING_ACT_FORM, STATEMENT_FORMS } from './gate-sources.js';

// syzygy-bpyt.8.21: the sitting templates' row `| "{label}" | "{description}" |` holds two line slots. Read as two plain groups, a
// record that failed after a label holding `" | "` k times cost about k times its line: 16-17 s at about 104 KB
// (R-GP-IMPL-RECORDER-LINE-SLOT-1 note 1). Each template now reads the row once. The records come from the real recorders over the
// real sitting records, as in gate-acts.test.ts.

const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const real = (rel: string): string => fs.readFileSync(path.join(REAL_ROOT, rel), 'utf8');
const DATE = '2026-10-07';
const INSTANT = '2026-10-07T09:30:00Z';
const INSTANCES = '.syzygy/governance/contracts/candidates/dossier-local-agent-acts/instances';
const RECORDS: Record<DossierLocalAgentActKey, string> = {
  'redis-no-evidence-drawer': `${INSTANCES}/redis/NO-EVIDENCE-DRAWER-STATEMENT.md`,
  'redis-agent-anthropic': `${INSTANCES}/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md`,
  'redis-agent-openai': `${INSTANCES}/redis/AGENT-PROVIDER-STATEMENT-OPENAI.md`,
  'd9-in-force': `${INSTANCES}/in-force/D9-IN-FORCE-RECORD.md`,
  'rfc7-20-reading-in-force': `${INSTANCES}/in-force/RFC7-20-READING-IN-FORCE-RECORD.md`,
};
const V2_RECORD = '.syzygy/governance/contracts/candidates/dossier-agent-provider-v2/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md';
/** `run()`, stopped by a throw once it has run `ms` milliseconds: V8 interrupts a regular expression that is still backtracking. */
const within = <T>(ms: number, run: () => T): T => vm.runInNewContext('run()', { run }, { timeout: ms }) as T;
/** The recorders run in Python (about a second each under load), so the records are rendered once, before any read is timed. */
const RENDER_TIMEOUT = 60_000;

describe('the label row of every template that has one, read once (syzygy-bpyt.8.21)', () => {
  /** Each template with the row and a record its recorder renders: the five sitting acts, version 2 of the Anthropic statement, and
   * version 1 as version 2's form reads past it. */
  let templates: readonly (readonly [string, RecorderTemplate, string])[] = [];
  beforeAll(() => {
    const act = (key: DossierLocalAgentActKey) => renderDossierLocalAgentAct(key, sha(real(RECORDS[key])), DATE, INSTANT);
    templates = [
      ['redis-no-evidence-drawer', DRAWER_FORMS['redis-redis']!.template!, act('redis-no-evidence-drawer')],
      ['redis-agent-anthropic', STATEMENT_FORMS['redis-redis']![0]!.form.template!, act('redis-agent-anthropic')],
      ['redis-agent-openai', STATEMENT_FORMS['redis-redis']![1]!.form.template!, act('redis-agent-openai')],
      ['d9-in-force', D9_ACT_FORM.template!, act('d9-in-force')],
      ['rfc7-20-reading-in-force', RFC7_20_RULING_ACT_FORM.template!, act('rfc7-20-reading-in-force')],
      ['provider-v2', PROVIDER_V2_FORM.template!, renderProviderV2Act(sha(real(V2_RECORD)), DATE, '2026-10-07T10:30:00Z', sha(real(RECORDS['redis-agent-anthropic'])), DATE)],
      ['provider-v2, version 1 read past', PROVIDER_V2_FORM.exemptRecords![0]!.template, act('redis-agent-anthropic')],
    ];
  }, RENDER_TIMEOUT);
  const LABEL = `${'q" | "'.repeat(20_000)}z`;

  it('reads back a 120 KB label holding the separator, and refuses within a second wherever the record then fails', () => {
    expect(templates).toHaveLength(7);
    for (const [key, template, record] of templates) {
      const fields = templateFields(template, record)!;
      expect(fields, key).not.toBeNull();
      const row = `\n| "${fields['label']}" | "${fields['description']}" |\n`;
      expect(record.split(row), key).toHaveLength(2);
      const longRow = (end: string) => record.replace(row, `\n| "${LABEL}" | "${fields['description']}${end}\n`), long = longRow('" |');
      expect(long.length, key).toBeGreaterThan(120_000);
      expect(within(1000, () => templateFields(template, long)), key).toEqual({ ...fields, label: LABEL });
      const failing = {
        'at its last byte': `${long.slice(0, -1)}!`,
        'with no closing mark on the row': longRow('" ;'),
        'with a break in the description': longRow('\r" |'),
      };
      for (const [how, text] of Object.entries(failing)) {
        expect(text, `${key} ${how}`).not.toBe(long);
        expect(within(1000, () => templateFields(template, text)), `${key} ${how}`).toBeNull();
      }
    }
  }, 30_000);
});

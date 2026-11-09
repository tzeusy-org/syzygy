import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { drawerPhrase, nameOnBranchWarning, observationPhrase, providerPhrase, questionOpening, statementText } from './launch-question.js';
import { parseLaunchRecord, recordIdFor, renderLaunchRecord, type LaunchRecord } from './launch-record.js';

/** REQ-polaris-generation-046, line 17 (record fields, digest binding, provenance, ceremony), line 21 (three separate records), line 11
 * (the phrase and the question's statements, the warning). Expected values are literals; each digest is recomputed with node:crypto,
 * independently of the module's own sha256. */

const REV = '0123456789abcdef0123456789abcdef01234567';
const base: LaunchRecord = {
  recordClass: 'observation-consent', recordId: recordIdFor('observation-consent', REV, '2026-11-09T10:00:00Z', 'repository:redis-redis'), identity: 'repository:redis-redis',
  identitySource: 'derived from the clone\'s remote URL by the identity rule', normalisedUrl: 'github.com/redis/redis', urlSource: 'the clone\'s remote origin',
  publicDeclaration: 'public', revision: REV, grantInstant: '2026-11-09T10:00:00Z', supersedes: null,
  phrase: 'CONSENT TO OBSERVE repository:redis-redis AT 0123456789ab', terminal: '/dev/pts/7', question: 'Q line 1\nQ line 2',
};
const digestOf = (text: string): string => createHash('sha256').update(text.slice(0, text.lastIndexOf('Content digest'))).digest('hex');

describe('the record', () => {
  it('names its class and revision in an identity-free file name', () => {
    expect(base.recordId).toBe('LAUNCH-OBSERVATION-0123456789ab-20261109T100000Z-d6e02d31');
    expect(recordIdFor('provider-statement', REV, '2026-11-09T10:00:00Z', 'repository:redis-redis')).toBe('LAUNCH-PROVIDER-0123456789ab-20261109T100000Z-d6e02d31');
  });

  it('binds the exact digest of its content and round-trips', () => {
    const text = renderLaunchRecord(base);
    expect(text.endsWith(`Content digest (SHA-256): \`${digestOf(text)}\`\n`)).toBe(true);
    const parsed = parseLaunchRecord(text);
    expect(parsed).toEqual({ ok: true, record: base, digest: digestOf(text) });
  });

  it('carries every field line 17 lists, for an observation consent', () => {
    const text = renderLaunchRecord(base);
    for (const line of [
      'Record class: `observation-consent`',
      'Subject: `(project:syzygy, repository:redis-redis)`',
      'Repository identity: `repository:redis-redis` [Inferred]: proposed from derived from the clone\'s remote URL by the identity rule and declared by the owner\'s phrase',
      'Public declaration: `public` [Inferred]: the operator\'s declaration whether the repository is public',
      `Scope: the commit object \`${REV}\` and the tree and blob objects reachable from its root tree, and nothing else, held in the operator's own clone; Syzygy fetches nothing`,
      'Granting principal: the owner, as declared by the operator [Inferred]',
      'Grant instant: `2026-11-09T10:00:00Z` (Syzygy\'s clock at the answer)',
      'Revocation state: none',
      'Provenance state: `owner-adopted (bootstrap, uncorrelated)`',
      'A1 audit-record identity: explicitly absent',
      'Execution choice: none; a launch consent is never an execution choice and records none',
      'Who answered: the operator\'s declaration that the owner answered in person [Inferred]; Syzygy cannot observe who typed the answer',
      'Terminal: `/dev/pts/7`',
      'CONSENT TO OBSERVE repository:redis-redis AT 0123456789ab',
      'Q line 1',
    ]) expect(text.split('\n')).toContain(line);
    expect(text).toContain('a locator hint, never the identity');
  });

  it('a drawer statement and a provider statement are separate records, neither naming a revision as its scope', () => {
    const drawer = renderLaunchRecord({ ...base, recordClass: 'drawer-statement', recordId: recordIdFor('drawer-statement', REV, base.grantInstant, base.identity) });
    expect(drawer).toContain('Statement: no kernel evidence drawer (RFC-0006 §3.5) exists for this subject');
    expect(drawer).toContain(`Scope: the subject, not any revision; asked at the launch pinned to \`${REV}\``);
    expect(drawer).not.toContain('Pinned revision:');
    const provider = renderLaunchRecord({ ...base, recordClass: 'provider-statement', recordId: recordIdFor('provider-statement', REV, base.grantInstant, base.identity), supersedes: 'LAUNCH-PROVIDER-aaaaaaaaaaaa-20261101T000000Z-00000000',
      provider: { agentTool: 'claude-code', provider: 'anthropic', contentClasses: ['code-content', 'project-documentation'] } });
    expect(provider).toContain('Subject: `(project:syzygy, repository:redis-redis, agent-provider:anthropic)`');
    expect(provider).toContain('- `code-content`\n- `project-documentation`\n');
    expect(provider).toContain('Supersedes: `LAUNCH-PROVIDER-aaaaaaaaaaaa-20261101T000000Z-00000000`');
    expect(parseLaunchRecord(provider).ok).toBe(true);
    expect(parseLaunchRecord(drawer).ok).toBe(true);
  });

  it('refuses bytes that do not hash to the digest they bind, and a record not exactly in the form', () => {
    const text = renderLaunchRecord(base);
    expect(parseLaunchRecord(text.replace('Revocation state: none', 'Revocation state: nonE'))).toEqual({ ok: false, why: 'the record\'s bytes do not hash to the content digest it binds' });
    const edited = text.replace('Q line 2', 'Q line 2\nextra');
    const rebound = `${edited.slice(0, edited.lastIndexOf('Content digest'))}Content digest (SHA-256): \`${digestOf(edited)}\`\n`;
    expect(parseLaunchRecord(rebound).ok).toBe(true);   // the question is free text, rebound to its digest
    const extraField = text.replace('Revocation state: none\n', 'Revocation state: none\n\nExecution choice: build\n');
    const reboundField = `${extraField.slice(0, extraField.lastIndexOf('Content digest'))}Content digest (SHA-256): \`${digestOf(extraField)}\`\n`;
    expect(parseLaunchRecord(reboundField)).toEqual({ ok: false, why: 'the record is not exactly what the launch record form writes from its own fields' });
  });
});

describe('the phrases name the consent, the identity and the first twelve hex digits', () => {
  it('per record', () => {
    expect(observationPhrase('repository:redis-redis', REV)).toBe('CONSENT TO OBSERVE repository:redis-redis AT 0123456789ab');
    expect(drawerPhrase('repository:redis-redis', REV)).toBe('STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT 0123456789ab');
    expect(providerPhrase('repository:redis-redis', REV, 'claude-code', 'anthropic')).toBe('CONSENT TO AGENT PROVIDER anthropic WITH claude-code FOR repository:redis-redis AT 0123456789ab');
  });
});

describe('the question', () => {
  const opening = questionOpening({
    identity: 'repository:redis-redis', identitySource: 'derived', url: 'github.com/redis/redis', urlSource: 'the clone\'s remote origin', revision: REV,
    revisionVia: 'refs/remotes/origin/HEAD -> refs/remotes/origin/unstable', committerDate: '1762000000 +0000', updateCommand: 'git -C \'/c\' fetch origin',
    existing: [{ recordId: 'LAUNCH-OBSERVATION-aaaaaaaaaaaa-20261101T000000Z-00000000', recordClass: 'observation-consent', identity: 'repository:redis-redis', state: 'revoked by .syzygy/governance/decisions/X.md', commit: 'c0ffee' }],
    notCarrying: [], inForceElsewhere: [], asks: { observation: true, drawer: true },
  });

  it.each([
    'Only the owner may answer this question, in person, by typing; never an agent.',
    'Repository identity (proposed): repository:redis-redis [Inferred], derived from the clone\'s remote URL by the identity rule. The phrase you type declares it.',
    'Normalised URL: github.com/redis/redis [Inferred], from the clone\'s remote origin; a locator hint, never the identity.',
    `Pinned revision: ${REV}, chosen by refs/remotes/origin/HEAD -> refs/remotes/origin/unstable; committer date 1762000000 +0000.`,
    'Syzygy did not fetch',
    'To update the clone before a later run: git -C \'/c\' fetch origin',
    'The observation consent covers that one revision only.',
    '- LAUNCH-OBSERVATION-aaaaaaaaaaaa-20261101T000000Z-00000000 (observation-consent, repository:redis-redis): revoked by .syzygy/governance/decisions/X.md',
    '[Inferred] A clone re-identified under another URL',
    '[Inferred] A fork or mirror at a commit an upstream record names',
    '[Inferred] Two repositories whose normalised URLs share their last two path segments',
    'revocable only by a later owner act naming it (RFC5-13)',
    'A launch consent is never an execution choice',
  ])('states %s', words => expect(opening).toContain(words));

  it('labels the statement\'s classes a preview and says the agent reads the clone without restriction', () => {
    const text = statementText({ agentTool: 'claude-code', provider: 'anthropic', classes: ['code-content'], supersedes: null });
    expect(text).toContain('Content classes (a preview: the policy\'s classification as it would apply once the observation consent admits the repository): code-content.');
    expect(text).toContain('The agent sessions read the clone without restriction, whatever content classes the statement names');
  });

  it('the name-on-branch warning names the identity, the URL, the reference, no push and that one push publishes, and asks nothing', () => {
    const warning = nameOnBranchWarning('repository:acme-secret', 'git.example/acme/secret');
    expect(warning).toBe('Warning: a confirmed answer records the repository identity repository:acme-secret and its normalised URL git.example/acme/secret in the launch consent records, which Syzygy commits on refs/heads/launch-consent-records in the observing project\'s own repository. Syzygy never pushes that reference; one push of it would publish them. This is a warning only: nothing here asks you to confirm it.');
    expect(warning).not.toMatch(/\?|type|confirm it\?/iu);
  });
});

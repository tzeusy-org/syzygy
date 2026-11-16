import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GIT_ENV } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';
import { recordIdFor, renderLaunchRecord, type LaunchRecord } from './launch-record.js';
import { LAUNCH_REF, homeGit, readLaunchRecords, recordingSubject, writeLaunchRecords, type GitRun } from './launch-store.js';
import { gitIn, listing, makeHome, writeFiles } from './launch.testkit.js';

/** The write consent's scope (WRITE-CONSENT-LAUNCH-RECORDS, `Scope`) and REQ-polaris-generation-046 line 23 (records read only from the
 * dedicated reference's commits; v8 counts only files a recording commit added). Every fixture home is a temporary repository; the
 * oracle is `git` run by this file and an independent listing of references, HEAD, index and working tree. */

const REV = '0123456789abcdef0123456789abcdef01234567';
const record = (instant: string, more: Partial<LaunchRecord> = {}): { recordId: string; text: string } => {
  const recordClass = more.recordClass ?? 'observation-consent';
  const r: LaunchRecord = {
    recordClass, recordId: recordIdFor(recordClass, REV, instant, 'repository:o-r'), identity: 'repository:o-r', identitySource: 'derived from the clone\'s remote URL by the identity rule',
    normalisedUrl: 'h.example/o/r', urlSource: 'the clone\'s remote origin', publicDeclaration: 'public', revision: REV, grantInstant: instant, supersedes: null,
    phrase: `CONSENT TO OBSERVE repository:o-r AT ${REV.slice(0, 12)}`, terminal: '/dev/pts/0', question: 'q', ...more,
  };
  return { recordId: r.recordId, text: renderLaunchRecord(r) };
};
const write = (home: string, records: readonly { recordId: string; text: string }[], expectedTip: string | null) =>
  writeLaunchRecords(home, { records, expectedTip, operator: 'Op Erator', message: `${recordingSubject(records.map(r => r.recordId))}\n` });
const tipOf = (home: string): string => gitIn(home, 'rev-parse', LAUNCH_REF);

describe('the recording commit', () => {
  it('first: no parent, only the record files, nothing else in the home changes, hooks do not run', () => {
    const home = makeHome();
    const marker = path.join(home, 'hook-ran');
    writeFiles(home, { '.git/hooks/reference-transaction': `#!/bin/sh\ntouch '${marker}'\n` });
    fs.chmodSync(path.join(home, '.git/hooks/reference-transaction'), 0o755);
    const before = listing(home);
    const a = record('2026-11-09T10:00:00Z');
    const w = write(home, [a], null);
    expect(w.ok).toBe(true);
    const after = listing(home);
    expect(after.head).toBe(before.head);
    expect(after.index).toBe(before.index);
    expect(after.tree).toBe(before.tree);
    expect(after.refs.split('\n').filter(r => !r.startsWith(`${LAUNCH_REF} `))).toEqual(before.refs.split('\n'));
    expect(fs.existsSync(marker)).toBe(false);
    expect(gitIn(home, 'rev-list', '--parents', '-n', '1', LAUNCH_REF)).toBe(tipOf(home));   // no parent
    expect(gitIn(home, 'ls-tree', '-r', '--name-only', LAUNCH_REF)).toBe(`.syzygy/governance/decisions/launch-consent/${a.recordId}.md`);
    expect(gitIn(home, 'log', '-1', '--format=%an|%cn', LAUNCH_REF)).toBe('Op Erator|Syzygy');
    const blob = gitIn(home, 'cat-file', 'blob', `${LAUNCH_REF}:.syzygy/governance/decisions/launch-consent/${a.recordId}.md`);
    expect(`${blob}\n`).toBe(a.text);
    expect(gitIn(home, 'remote')).toBe('');   // nothing to push to, and nothing pushed
  });

  it('later: exactly one parent, the tip; adds files only; refuses a tip that moved, and an existing file', () => {
    const home = makeHome();
    const a = record('2026-11-09T10:00:00Z');
    expect(write(home, [a], null).ok).toBe(true);
    const first = tipOf(home);
    const b = record('2026-11-09T11:00:00Z', { recordClass: 'drawer-statement', phrase: `STATE NO KERNEL EVIDENCE DRAWER FOR repository:o-r AT ${REV.slice(0, 12)}` });
    expect(write(home, [b], null)).toEqual({ ok: false, why: `${LAUNCH_REF} moved since its records were read (absent then, ${first} now); nothing was written` });
    expect(write(home, [b], first).ok).toBe(true);
    expect(gitIn(home, 'rev-list', '--parents', '-n', '1', LAUNCH_REF)).toBe(`${tipOf(home)} ${first}`);
    expect(gitIn(home, 'diff-tree', '-r', '--name-status', first, LAUNCH_REF)).toBe(`A\t.syzygy/governance/decisions/launch-consent/${b.recordId}.md`);
    expect(write(home, [a], tipOf(home))).toEqual({ ok: false, why: `.syzygy/governance/decisions/launch-consent/${a.recordId}.md already exists; a recording commit adds new files only` });
  });

  it('refuses when the reference moves between the tip read and update-ref, leaving the other writer\'s tip (review F5)', () => {
    const home = makeHome();
    expect(write(home, [record('2026-11-09T10:00:00Z')], null).ok).toBe(true);
    const first = tipOf(home);
    // Another writer's commit, made by plain git: the tip the old-value check must protect.
    const other = gitIn(home, 'commit-tree', gitIn(home, 'rev-parse', `${first}^{tree}`), '-p', first, '-m', 'another writer');
    const racing = (identity: { readonly author: string; readonly committer: string }): GitRun => {
      const real = homeGit(home, identity);
      return (args, input) => {
        if (args[0] === 'update-ref') gitIn(home, 'update-ref', LAUNCH_REF, other);
        return real(args, input);
      };
    };
    const b = record('2026-11-09T11:00:00Z');
    const w = writeLaunchRecords(home, { records: [b], expectedTip: first, operator: 'Op Erator', message: `${recordingSubject([b.recordId])}\n` }, racing);
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.why).toMatch(new RegExp(`^${LAUNCH_REF} could not be moved from ${first} \\(it may have moved\\); the recording commit [0-9a-f]{40} is on no reference$`));
    expect(tipOf(home)).toBe(other);
  });

  it('writes nothing while the dedicated reference is the current branch of a worktree', () => {
    const home = makeHome();
    expect(write(home, [record('2026-11-09T10:00:00Z')], null).ok).toBe(true);
    const wt = path.join(path.dirname(home), `${path.basename(home)}-wt`);
    gitIn(home, 'worktree', 'add', '-q', wt, 'launch-consent-records');
    try {
      const tip = tipOf(home);
      expect(write(home, [record('2026-11-09T12:00:00Z')], tip)).toEqual({ ok: false, why: `${LAUNCH_REF} is the current branch of a worktree of the governance home, so Syzygy writes nothing under the write consent` });
      expect(tipOf(home)).toBe(tip);
    } finally {
      gitIn(home, 'worktree', 'remove', '--force', wt);
    }
  });
});

describe('the reader counts only files a recording commit on the dedicated reference added', () => {
  it('reads every record with its digest and the commit that added it', () => {
    const home = makeHome();
    const a = record('2026-11-09T10:00:00Z');
    write(home, [a], null);
    const read = readLaunchRecords(home);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.records.map(r => [r.record.recordId, r.state, r.commit, r.digest])).toEqual([[a.recordId, 'active', tipOf(home),
      createHash('sha256').update(a.text.slice(0, a.text.lastIndexOf('Content digest'))).digest('hex')]]);
  });

  it('a home with no dedicated reference reads no record, and the trunk\'s own files are never read as records', () => {
    const home = makeHome();
    writeFiles(home, { [`.syzygy/governance/decisions/launch-consent/${record('2026-11-09T10:00:00Z').recordId}.md`]: record('2026-11-09T10:00:00Z').text });
    gitIn(home, 'add', '-A'); gitIn(home, 'commit', '-q', '-m', 'a record on the trunk');
    expect(readLaunchRecords(home)).toEqual({ ok: true, tip: null, records: [] });
  });

  const tamper = (home: string, args: (tip: string) => string[]) => {
    // A commit no recording made, put on the reference by plain git, outside the code under test.
    const tip = tipOf(home);
    const commit = gitIn(home, ...args(tip));
    gitIn(home, 'update-ref', LAUNCH_REF, commit);
  };

  it.each([
    ['edits a record', (home: string) => {
      const wt = fs.mkdtempSync(path.join(path.dirname(home), 'edit-'));
      gitIn(home, 'worktree', 'add', '-q', '--detach', wt, LAUNCH_REF);
      const file = fs.readdirSync(path.join(wt, '.syzygy/governance/decisions/launch-consent'))[0]!;
      fs.appendFileSync(path.join(wt, '.syzygy/governance/decisions/launch-consent', file), 'x');
      gitIn(wt, 'commit', '-q', '-am', 'edit');
      gitIn(home, 'update-ref', LAUNCH_REF, gitIn(wt, 'rev-parse', 'HEAD'));
      gitIn(home, 'worktree', 'remove', '--force', wt);
    }, /changes ".syzygy\/governance\/decisions\/launch-consent\/LAUNCH-OBSERVATION-0123456789ab-20261109T100000Z-27192271.md" \(M\)/],
    ['adds a file outside the location', (home: string) => {
      tamper(home, tip => ['commit-tree', gitIn(home, 'rev-parse', 'main^{tree}'), '-p', tip, '-m', 'trunk tree']);
    }, /changes "README.md" \(A\)|which a recording commit never does/],
    ['merges the trunk', (home: string) => tamper(home, tip => ['commit-tree', gitIn(home, 'rev-parse', `${tip}^{tree}`), '-p', tip, '-p', 'main', '-m', 'merge'])],
  ] as const)('a commit that %s makes the reference unreadable', (_name, mutate, pattern = /parents; a recording commit has at most one/) => {
    const home = makeHome();
    write(home, [record('2026-11-09T10:00:00Z')], null);
    mutate(home);
    const read = readLaunchRecords(home);
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.why).toMatch(pattern);
  });

  /** A commit that adds one well-formed record file on top of the tip, made by plain git outside the code under test, with the
   * committer and message given. Returns the added record's ID. */
  const forge = (home: string, committer: { name: string; email: string }, message: (id: string) => string): string => {
    const r = record('2026-11-09T13:00:00Z');
    const wt = fs.mkdtempSync(path.join(path.dirname(home), 'forge-'));
    gitIn(home, 'worktree', 'add', '-q', '--detach', wt, LAUNCH_REF);
    writeFiles(wt, { [`.syzygy/governance/decisions/launch-consent/${r.recordId}.md`]: r.text });
    gitIn(wt, 'add', '-A');
    execFileSync('git', ['-C', wt, 'commit', '-q', '-m', message(r.recordId)], { env: { ...GIT_ENV, GIT_AUTHOR_NAME: 'Op Erator', GIT_AUTHOR_EMAIL: 'op@example.invalid', GIT_COMMITTER_NAME: committer.name, GIT_COMMITTER_EMAIL: committer.email } });
    gitIn(home, 'update-ref', LAUNCH_REF, gitIn(wt, 'rev-parse', 'HEAD'));
    gitIn(home, 'worktree', 'remove', '--force', wt);
    return r.recordId;
  };
  const SYZYGY = { name: 'Syzygy', email: 'syzygy@launch-consent.invalid' };

  it('an add-only commit not attributed to Syzygy as committer makes the reference unreadable (review F1)', () => {
    const home = makeHome();
    write(home, [record('2026-11-09T10:00:00Z')], null);
    forge(home, { name: 'An Agent', email: 'agent@example.invalid' }, id => `launch consent: ${id}`);
    expect(readLaunchRecords(home)).toEqual({ ok: false, why: `the commit ${tipOf(home)} on ${LAUNCH_REF} is not attributed to Syzygy as committer ("An Agent <agent@example.invalid>"), so it is not a recording commit` });
  });

  it('an add-only commit attributed to Syzygy without the recording subject makes the reference unreadable (review F1)', () => {
    const home = makeHome();
    write(home, [record('2026-11-09T10:00:00Z')], null);
    forge(home, SYZYGY, id => `add ${id}`);
    expect(readLaunchRecords(home)).toEqual({ ok: false, why: `the commit ${tipOf(home)} on ${LAUNCH_REF} does not carry a recording commit's message for the records it adds` });
  });

  it('the residual, pinned: a commit copying the committer and the subject is read, since attribution is a stored claim', () => {
    const home = makeHome();
    const a = record('2026-11-09T10:00:00Z');
    write(home, [a], null);
    const id = forge(home, SYZYGY, x => `launch consent: ${x}`);
    const read = readLaunchRecords(home);
    expect(read.ok && read.records.map(x => x.record.recordId)).toEqual([a.recordId, id]);
  });

  it('a recording commit\'s subject lists its records sorted, whatever order the writer was given', () => {
    expect(recordingSubject(['LAUNCH-PROVIDER-b', 'LAUNCH-OBSERVATION-a'])).toBe('launch consent: LAUNCH-OBSERVATION-a, LAUNCH-PROVIDER-b');
  });

  it('a decisions file naming a record revokes it; a later record naming it in Supersedes supersedes it', () => {
    const home = makeHome();
    const p1 = record('2026-11-09T10:00:00Z', { recordClass: 'provider-statement', provider: { agentTool: 'claude-code', provider: 'anthropic', contentClasses: ['code-content'] } });
    const o1 = record('2026-11-09T10:00:00Z');
    write(home, [o1, p1], null);
    const p2 = record('2026-11-09T11:00:00Z', { recordClass: 'provider-statement', supersedes: p1.recordId, provider: { agentTool: 'claude-code', provider: 'anthropic', contentClasses: ['code-content', 'project-documentation'] } });
    write(home, [p2], tipOf(home));
    writeFiles(home, { '.syzygy/governance/decisions/REVOKE-X.md': `# Owner act — revoke\n\nRevokes ${o1.recordId}.\n` });
    const read = readLaunchRecords(home);
    expect(read.ok && read.records.map(r => [r.record.recordId, r.state, r.stateBy])).toEqual([
      [o1.recordId, 'revoked', '.syzygy/governance/decisions/REVOKE-X.md'], [p1.recordId, 'superseded', p2.recordId], [p2.recordId, 'active', null]]);
  });
});

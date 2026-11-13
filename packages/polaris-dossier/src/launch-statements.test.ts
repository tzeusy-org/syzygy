import { describe, expect, it } from 'vitest';
import { BRIEFS_NOT_REACHED, issuedBriefStatement, questionCopyStatements, stageStatements, type LaunchState } from './launch-statements.js';

/** REQ-polaris-generation-047's stage rule over the statements 046 and 047 add: each stage a run reached gets its statement, each it did not
 * reach says so and states nothing of the thing itself, and a no-copy run's form of every copy statement is that no copy was made. Every
 * expected text is a literal. */

const C = 'a'.repeat(40), L = 'b'.repeat(40);
const UPDATE = "git -C '/srv/clone' fetch origin";
const METHOD = 'The run\'s clone is a copy of the pinned commit alone, which Syzygy made from the operator\'s clone with Git over the local file transport and no network request. To make it, Git read the operator\'s clone\'s configuration, references and object store, the stored bytes of delta bases outside the pinned commit\'s objects included. Syzygy used nothing Git read but the copy it produced, and itself read of the operator\'s clone only the references, remote names and URLs and other files REQ-polaris-generation-047 lists.';
const RELIANCE = 'For every Git process the copy step started, Syzygy relies on Git starting no program that the operator\'s clone\'s own configuration or hooks name while it serves the copy.';
const NAMED = `The named identifier is ${C}, from refs/remotes/origin/HEAD -> refs/remotes/origin/main. Syzygy made no network request to choose or verify it; whether it is the upstream's latest commit is Inferred. To update the clone before a later run: ${UPDATE}`;

const base: LaunchState = {
  runClass: 'copy-class',
  named: { commit: C, via: 'refs/remotes/origin/HEAD -> refs/remotes/origin/main', updateCommand: UPDATE, localElsewhere: null },
  copy: { reached: 'formed', location: '/state/copies/copy-AbC123' },
  copyEnd: 'kept',
  pinned: { commit: C, committerDate: '1762689600 +0000' },
  questionAsked: true,
  beyondConsent: false,
};
const texts = (s: LaunchState) => stageStatements(s).map(x => [x.id, x.stage, x.runClass, x.reached, x.text]);

describe('the stage rule over the launch statements (REQ-polaris-generation-047)', () => {
  it('a completed copy-class run: every stage up to the question, the copy method, its location and the Inferred reliance', () => {
    expect(texts(base)).toEqual([
      ['named-identifier', 'identifier named', 'both', true, NAMED],
      ['copy', 'copy step started', 'copy-class', true, METHOD],
      ['copy-location', 'copy step started', 'copy-class', true, 'The copy of the pinned commit at /state/copies/copy-AbC123 is the run\'s clone; it is kept after the run, outside the run\'s state directory, until the operator removes it.'],
      ['copy-reliance', 'copy step started', 'copy-class', true, RELIANCE],
      ['pinned-commit', 'commit pinned', 'both', true, `The pinned revision is ${C}; its committer date, as the commit object records it, is 1762689600 +0000.`],
      ['question', 'question asked', 'both', true, 'A question was asked at the terminal.'],
    ]);
    expect(stageStatements(base).every(s => s.label === 'Inferred')).toBe(true);
  });

  it('a no-copy run: no copy was made, and no reliance or copy location is stated', () => {
    expect(texts({ ...base, runClass: 'no-copy', copy: null, copyEnd: null, questionAsked: false })).toEqual([
      ['named-identifier', 'identifier named', 'both', true, NAMED],
      ['copy', 'copy step started', 'no-copy', false, 'No copy was made: this is a no-copy run, whose clone is the operator\'s own.'],
      ['pinned-commit', 'commit pinned', 'both', true, `The pinned revision is ${C}; its committer date, as the commit object records it, is 1762689600 +0000.`],
      ['question', 'question asked', 'both', false, 'No question was asked.'],
    ]);
  });

  it('a run refused before any identifier was named states every stage as not reached', () => {
    expect(texts({ runClass: null, named: null, copy: null, copyEnd: null, pinned: null, questionAsked: false, beyondConsent: false })).toEqual([
      ['named-identifier', 'identifier named', 'both', false, 'No identifier was named.'],
      ['copy', 'copy step started', null, false, 'No copy was made: the run ended before its class was decided.'],
      ['pinned-commit', 'commit pinned', 'both', false, 'The commit was not pinned, and its committer date is Unknown.'],
      ['question', 'question asked', 'both', false, 'No question was asked.'],
    ]);
  });

  it('a copy-class run refused before its copy step started', () => {
    expect(texts({ ...base, copy: { reached: 'not-started' }, copyEnd: null, pinned: null, questionAsked: false }).slice(1, 2)).toEqual([
      ['copy', 'copy step started', 'copy-class', false, 'No copy was made: the copy step did not start.'],
    ]);
  });

  it('a copy step that ended before the fetch, at a failed fetch, and after the fetch before the form check; each removal said', () => {
    const removed = { state: 'removed' as const, location: '/state/copies/copy-AbC123' };
    const at = (copy: LaunchState['copy'], beyond = false) => texts({ ...base, copy, copyEnd: removed, pinned: null, questionAsked: false, beyondConsent: beyond }).filter(t => String(t[1]) === 'copy step started');
    expect(at({ reached: 'before-fetch', location: '/state/copies/copy-AbC123' }, true)).toEqual([
      ['copy', 'copy step started', 'copy-class', true, 'The copy step started at /state/copies/copy-AbC123 and ended there, before Syzygy started the fetch process: Git read nothing of the operator\'s clone.'],
      ['copy-location', 'copy step started', 'copy-class', true, 'The copy at /state/copies/copy-AbC123 was removed, its directory included.'],
      ['copy-reliance', 'copy step started', 'copy-class', true, RELIANCE],
      ['copy-beyond-consent', 'copy step started', 'copy-class', true, 'The launch observation consent this run relies on records its scope in the operator\'s own clone with no fetch by Syzygy; the copy step ended before Syzygy started the fetch process, so no fetch was made.'],
    ]);
    expect(at({ reached: 'fetch-failed', location: '/state/copies/copy-AbC123', report: 'fatal: not our ref' }, true).map(t => t[4])).toEqual([
      'The copy step used the method a copy is made by: a local fetch of the named identifier alone from the operator\'s clone over Git\'s local file transport, with no network request. A fetch was started and failed, as Git reported: fatal: not our ref. The copy had not passed its form check.',
      'The copy at /state/copies/copy-AbC123 was removed, its directory included.',
      RELIANCE,
      'The launch observation consent this run relies on records its scope in the operator\'s own clone with no fetch by Syzygy; a fetch was started and failed, as Git reported: fatal: not our ref.',
    ]);
    expect(at({ reached: 'fetched', location: '/state/copies/copy-AbC123', where: 'at its form check' }).map(t => t[4])).toEqual([
      'The copy step used the method a copy is made by: a local fetch of the named identifier alone from the operator\'s clone over Git\'s local file transport, with no network request. It ended at its form check; the copy had not passed its form check.',
      'The copy at /state/copies/copy-AbC123 was removed, its directory included.',
      RELIANCE,
    ]);
    // Once the copy's checkout pinned the commit, the form check failing after it: the pinned commit.
    expect(texts({ ...base, copy: { reached: 'fetched', location: '/state/copies/copy-AbC123', where: 'at its form check' }, copyEnd: removed, pinned: { commit: C, committerDate: '1762689600 +0000' }, questionAsked: false })[1]![4])
      .toBe('The copy step used the method a copy is made by: a local fetch of the pinned commit alone from the operator\'s clone over Git\'s local file transport, with no network request. It ended at its form check; the copy had not passed its form check.');
  });

  it('a completed run relying on a version 1.1 launch observation consent: the copy goes beyond its wording', () => {
    expect(texts({ ...base, beyondConsent: true }).find(t => t[0] === 'copy-beyond-consent')?.[4])
      .toBe('The copy goes beyond the launch observation consent\'s "no fetch by Syzygy" wording: that consent records its scope in the operator\'s own clone, and Syzygy fetched the pinned commit from that clone into the copy over the local file transport. The consent is otherwise relied on as it was recorded.');
  });

  it('a local branch of the remote default\'s name elsewhere: both identifiers, and that a local commit is not the trunk default', () => {
    expect(texts({ ...base, named: { ...base.named!, localElsewhere: { ref: 'refs/heads/main', commit: L } } })[1]).toEqual(
      ['local-not-trunk', 'identifier named', 'both', true, `The local branch refs/heads/main points to ${L}, not to the trunk default ${C}: a local commit is not the trunk default, and no local branch is consulted while a remote default is recorded.`]);
  });

  it('a run that was not launched: its HEAD named with no update command, and its pinned revision with no committer date read', () => {
    expect(texts({ ...base, runClass: 'no-copy', named: { ...base.named!, via: 'detached HEAD', updateCommand: null }, copy: null, copyEnd: null, pinned: { commit: C, committerDate: 'not-read' }, questionAsked: false })).toEqual([
      ['named-identifier', 'identifier named', 'both', true, `The named identifier is ${C}, from detached HEAD. Syzygy made no network request to choose or verify it; whether it is the upstream's latest commit is Inferred.`],
      ['copy', 'copy step started', 'no-copy', false, 'No copy was made: this is a no-copy run, whose clone is the operator\'s own.'],
      ['pinned-commit', 'commit pinned', 'both', true, `The pinned revision is ${C}.`],
      ['question', 'question asked', 'both', false, 'No question was asked.'],
    ]);
  });

  it('a pinned commit whose commit object was not read: its committer date is Unknown, saying what happened, in each class (R-PDJA-33-SLICE-D-1 finding 2)', () => {
    const unknown = { unknown: 'Syzygy could not read the copy\'s commit object (fixture refusal)' };
    expect(texts({ ...base, pinned: { commit: C, committerDate: unknown } }).find(t => t[0] === 'pinned-commit')?.[4])
      .toBe(`The pinned revision is ${C}: the copy's detached checkout left the copy's HEAD there. Its committer date is Unknown: Syzygy could not read the copy's commit object (fixture refusal).`);
    expect(texts({ ...base, runClass: 'no-copy', copy: null, copyEnd: null, pinned: { commit: C, committerDate: { unknown: 'Syzygy has not read its commit object' } } }).find(t => t[0] === 'pinned-commit')?.[4])
      .toBe(`The pinned revision is ${C}. Its committer date is Unknown: Syzygy has not read its commit object.`);
  });
});

describe('the brief stage and the question\'s copy statements', () => {
  it('each issued brief\'s statement, from whether that brief named a copy; the not-reached form init records (R-PDJA-33-SLICE-D-1 finding 5)', () => {
    expect(issuedBriefStatement({ role: 'authoring' }, true)).toEqual({ id: 'briefs/authoring', stage: 'brief or packet delivered', runClass: 'copy-class', reached: true, label: 'Inferred',
      text: 'The authoring brief Syzygy issued directed its session to work in the copy and not to read the operator\'s clone. Whether the session stayed in the copy is its own report [Inferred].' });
    expect(issuedBriefStatement({ role: 'inventory', session: 2 }, false)).toEqual({ id: 'briefs/inventory-2', stage: 'brief or packet delivered', runClass: 'no-copy', reached: true, label: 'Inferred',
      text: 'The inventory brief for session 2 Syzygy issued named the operator\'s clone as the run\'s clone, where its session is to work; whether the session worked there is its own report [Inferred]. No copy was made.' });
    expect(BRIEFS_NOT_REACHED).toEqual({ id: 'briefs', stage: 'brief or packet delivered', runClass: 'both', reached: false, label: 'Inferred', text: 'Syzygy issued no brief and delivered no packet.' });
  });

  it('the question\'s copy statements', () => {
    expect(questionCopyStatements('/state/copies/copy-AbC123')).toEqual([
      METHOD,
      'The authoring and inventory sessions are directed, by their briefs, to work in the copy, while the operator\'s clone stays on the host; that a session stayed in the copy is its own report.',
      'The copy, its checked-out files included, was made at /state/copies/copy-AbC123 before your answer, and Syzygy has read none of its blobs. It is removed if the run ends before its brief, or named with the removal\'s failure where its removal fails, and is otherwise kept after the run, at a location the launch output names, until the operator removes it.',
    ]);
    // A no-copy run: the form of every copy statement is that no copy was made (R-PDJA-33-SLICE-D-1 finding 4).
    expect(questionCopyStatements(null)).toEqual([
      'How the copy was made, where the sessions are directed to work in it, and the copy made before your answer: no copy was made. This is a no-copy run, whose clone is the operator\'s own.',
    ]);
  });
});

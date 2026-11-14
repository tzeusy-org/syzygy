import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { briefCopyOf, launchDisclosureItems, launchDisclosureUnknown, publicDeclarationOf, readLaunchDisclosure, statementItemId, storedBriefItem, type LaunchDisclosure } from './launch-disclosure.js';

/** The run record's launch disclosure (REQ-polaris-generation-046, line 37): read back fail-closed, and its human form, item by item. Every
 * expected value is a literal. */

const C = 'c'.repeat(40), R = 'd'.repeat(40);
const statement = (id: string, stage: string | null, runClass: string | null, reached: boolean, text: string) => ({ id, stage, runClass, reached, label: 'Inferred', text });
const launched: LaunchDisclosure = {
  format: 'polaris-dossier-launch-disclosure/1', runClass: 'copy-class', launched: true, operatorClone: '/home/op/redis', copy: '/state/copies/copy-AbC123',
  consents: { recorded: ['LAUNCH-OBSERVATION-x', 'LAUNCH-DRAWER-y'], commit: R, relied: ['launch observation consent LAUNCH-OBSERVATION-x'] },
  subject: { identity: 'repository:redis-redis', url: 'github.com/redis/redis', source: 'the clone\'s remote origin', proposedBy: 'derived', publicDeclaration: 'public' },
  drawer: 'LAUNCH-DRAWER-y',
  statements: [
    statement('named-identifier', 'identifier named', 'both', true, 'Named.'),
    statement('copy', 'copy step started', 'copy-class', true, 'Copied.'),
    statement('pinned-commit', 'commit pinned', 'both', true, 'Pinned.'),
    statement('question', 'question asked', 'both', true, 'A question was asked at the terminal.'),
    statement('briefs', 'brief or packet delivered', 'both', false, 'Syzygy issued no brief and delivered no packet.'),
  ] as LaunchDisclosure['statements'],
  label: 'Inferred',
};
const write = (text: string): string => {
  const dir = tempDir('launch-disclosure-');
  fs.writeFileSync(path.join(dir, 'launch.json'), text);
  return dir;
};

describe('reading the run record\'s launch disclosure back (fail-closed)', () => {
  it('the record init writes reads back whole', () => {
    expect(readLaunchDisclosure(write(JSON.stringify(launched)))).toEqual({ state: 'ok', disclosure: launched });
  });

  it('no file: absent, a run initialised before it was written', () => {
    expect(readLaunchDisclosure(tempDir('launch-disclosure-'))).toEqual({ state: 'absent' });
  });

  it('refuses what is not the record: another format, an extra or missing key, a malformed statement, a class its copy contradicts', () => {
    const why = (v: unknown) => { const r = readLaunchDisclosure(write(JSON.stringify(v))); return r.state === 'unreadable' ? r.why : r.state; };
    const field = 'it carries a field that is not of the form polaris-dossier-launch-disclosure/1 gives';
    expect(why({ ...launched, format: 'polaris-dossier-launch-disclosure/2' })).toBe('it is not a polaris-dossier-launch-disclosure/1 record');
    expect(why({ ...launched, extra: 1 })).toBe('it is not a polaris-dossier-launch-disclosure/1 record');
    const { drawer: _drawer, ...missing } = launched;
    expect(why(missing)).toBe('it is not a polaris-dossier-launch-disclosure/1 record');
    expect(why({ ...launched, label: 'Observed' })).toBe('it is not a polaris-dossier-launch-disclosure/1 record');
    expect(why({ ...launched, copy: null })).toBe(field);
    expect(why({ ...launched, runClass: 'no-copy' })).toBe(field);
    expect(why({ ...launched, launched: false })).toBe(field);
    expect(why({ ...launched, consents: { ...launched.consents, commit: null } })).toBe(field);
    expect(why({ ...launched, consents: { ...launched.consents, recorded: [] } })).toBe(field);
    expect(why({ ...launched, statements: [] })).toBe(field);
    expect(why({ ...launched, statements: [{ ...launched.statements[0], stage: 'copied' }] })).toBe(field);
    expect(why({ ...launched, statements: [{ ...launched.statements[0], label: 'Observed' }] })).toBe(field);
    expect(why({ ...launched, statements: [{ ...launched.statements[0], extra: true }] })).toBe(field);
    expect(why({ ...launched, subject: { ...launched.subject, url: '' } })).toBe(field);
    expect(readLaunchDisclosure(write('{"format":'))).toEqual({ state: 'unreadable', why: 'it is not one bounded JSON object (invalid-json)' });
  });

  it('a directory or a link at the name is unreadable, never followed', () => {
    const dir = tempDir('launch-disclosure-');
    fs.mkdirSync(path.join(dir, 'launch.json'));
    expect(readLaunchDisclosure(dir)).toEqual({ state: 'unreadable', why: 'it is not a regular file' });
    const linked = tempDir('launch-disclosure-');
    fs.symlinkSync(path.join(write(JSON.stringify(launched)), 'launch.json'), path.join(linked, 'launch.json'));
    expect(readLaunchDisclosure(linked)).toEqual({ state: 'unreadable', why: 'it is not a regular file' });
  });
});

describe('the launch disclosure in human form', () => {
  it('a launched run that recorded its consents: each item 046 names, the residuals, the stage statements, the drawer and who answered', () => {
    const briefs = statement('briefs/authoring', 'brief or packet delivered', 'copy-class', true, 'Briefed.');
    expect(launchDisclosureItems(launched, [storedBriefItem({ stageStatement: briefs }, 'The authoring brief', 'authoring')]).map(i => [i.id, i.label, i.text.slice(0, 80)])).toEqual([
      ['launch/consents', 'Inferred', 'The consents were recorded at launch: LAUNCH-OBSERVATION-x, LAUNCH-DRAWER-y, in '],
      ['launch/identity', 'Inferred', 'The repository identity repository:redis-redis and its normalised URL github.com'],
      ['launch/public', 'Inferred', 'The operator\'s declaration whether the repository is public: public [Inferred].'],
      ['launch/proposed', 'Inferred', 'The identity was proposed by the rule (derived) and declared by the owner\'s phra'],
      ['launch/residual-1', 'Inferred', '[Inferred] A clone re-identified under another URL, at a commit no record names '],
      ['launch/residual-2', 'Inferred', '[Inferred] A fork or mirror at a commit an upstream record names, or at a child '],
      ['launch/residual-3', 'Inferred', '[Inferred] Two repositories whose normalised URLs share their last two path segm'],
      ['launch/residual-4', 'Inferred', '[Inferred] Two repositories whose URLs differ only in a port, which normalisatio'],
      ['launch/identifier-named/both/reached/named-identifier', 'Inferred', 'Named.'],
      ['launch/copy-step-started/copy-class/reached/copy', 'Inferred', 'Copied.'],
      ['launch/commit-pinned/both/reached/pinned-commit', 'Inferred', 'Pinned.'],
      ['launch/question-asked/both/reached/question', 'Inferred', 'A question was asked at the terminal.'],
      ['launch/brief-or-packet-delivered/copy-class/reached/briefs/authoring', 'Inferred', 'Briefed.'],
      ['launch/drawer', 'Inferred', 'The drawer statement relied on: LAUNCH-DRAWER-y.'],
      ['launch/answered', 'Inferred', 'Who answered rests on the operator\'s declaration that the owner answered in pers'],
    ]);
    expect(launchDisclosureItems(launched, [])[0]!.text).toBe(`The consents were recorded at launch: LAUNCH-OBSERVATION-x, LAUNCH-DRAWER-y, in the recording commit ${R}.`);
    expect(launchDisclosureItems(launched, [])[1]!.text).toBe('The repository identity repository:redis-redis and its normalised URL github.com/redis/redis are Inferred, from the clone\'s remote origin.');
  });

  it('the brief stage: the record\'s not-reached form until a brief is issued; then each brief\'s stored statement, or Unknown where none can be read (R-PDJA-33-SLICE-D-1 findings 5 and 10)', () => {
    const briefItems = (issued: Parameters<typeof launchDisclosureItems>[1]) => launchDisclosureItems(launched, issued).filter(i => i.id.includes('brief')).map(i => [i.id, i.label, i.text]);
    expect(briefItems([])).toEqual([['launch/brief-or-packet-delivered/both/not-reached/briefs', 'Inferred', 'Syzygy issued no brief and delivered no packet.']]);
    const noCopy = statement('briefs/inventory-1', 'brief or packet delivered', 'no-copy', true, 'Sent to the operator\'s clone.');
    expect(briefItems([storedBriefItem({ stageStatement: noCopy }, 'The inventory brief for session 1', 'inventory-1'), storedBriefItem({ copy: null }, 'The authoring brief', 'authoring')])).toEqual([
      ['launch/brief-or-packet-delivered/no-copy/reached/briefs/inventory-1', 'Inferred', 'Sent to the operator\'s clone.'],
      ['launch/brief-or-packet-delivered/unknown/authoring', 'Unknown', 'The authoring brief was issued, and its record carries no brief-stage statement Syzygy can read, so whether it directed its session to a copy is Unknown.'],
    ]);
    // A stored statement of another stage, or not reached, is not a brief's statement.
    for (const bad of [{ ...noCopy, stage: 'question asked' }, { ...noCopy, reached: false }, { ...noCopy, label: 'Observed' }, 'Briefed.']) {
      expect(storedBriefItem({ stageStatement: bad }, 'The authoring brief', 'authoring').label).toBe('Unknown');
    }
  });

  it('none recorded, no declaration, no drawer, no question', () => {
    const quiet: LaunchDisclosure = {
      ...launched, consents: { recorded: [], commit: null, relied: ['launch observation consent LAUNCH-OBSERVATION-x (' + C + ')'] },
      subject: { ...launched.subject, publicDeclaration: null }, drawer: null,
      statements: [...launched.statements.slice(0, 3), statement('question', 'question asked', 'both', false, 'No question was asked.')] as LaunchDisclosure['statements'],
    };
    const texts = launchDisclosureItems(quiet, []).map(i => i.text);
    expect(texts[0]).toBe(`No consent was recorded at launch: the run rests on launch consent records already in force: launch observation consent LAUNCH-OBSERVATION-x (${C}).`);
    expect(texts[2]).toBe('The operator made no declaration whether the repository is public [Inferred].');
    expect(texts.slice(-2)).toEqual(['No drawer statement was relied on.', 'No question was asked, so no one answered it.']);
  });

  it('the public declaration: as given or recorded, none where the operator gave none or no launch observation consent records one', () => {
    expect([publicDeclarationOf('public'), publicDeclarationOf('not-public'), publicDeclarationOf('not-given'), publicDeclarationOf(null)])
      .toEqual(['public', 'not-public', null, null]);
  });

  it('a statement\'s page id carries its stage, its class and whether it was reached', () => {
    expect(statementItemId({ id: 'copy', stage: 'copy step started', runClass: null, reached: false, label: 'Inferred', text: 'x' })).toBe('launch/copy-step-started/class-undecided/not-reached/copy');
  });

  it('a run with no readable disclosure renders Unknown, saying why', () => {
    expect(launchDisclosureUnknown({ state: 'absent' })).toEqual({ id: 'launch/unknown', label: 'Unknown', text: 'The run directory holds no launch.json: the run was initialised before Syzygy recorded its launch disclosure, so whether it was launched, its class, whether a copy was made and every launch statement are Unknown.' });
    expect(launchDisclosureUnknown({ state: 'unreadable', why: 'it is not a regular file' })).toEqual({ id: 'launch/unknown', label: 'Unknown', text: 'The run\'s launch.json cannot be read as the record init writes (it is not a regular file), so whether it was launched, its class, whether a copy was made and every launch statement are Unknown.' });
  });
});

describe('whether a brief names a copy, decided fail-closed (R-PDJA-33-SLICE-D-1 finding 7)', () => {
  const root = tempDir('launch-disclosure-root-');
  const runDir = path.join(root, 'run-0123456789abcdef0123456789abcdef');
  const copy = path.join(root, 'copies', 'copy-AbC123');
  fs.mkdirSync(runDir); fs.mkdirSync(copy, { recursive: true });
  const before = '2026-11-12T23:59:59.000Z', since = '2026-11-13T00:00:00.000Z';
  const ok = (d: LaunchDisclosure) => ({ state: 'ok' as const, disclosure: d });
  const own = { ...launched, copy, operatorClone: '/home/op/redis' };

  it('a clone under the state root\'s copies directory: copy-class whatever the disclosure says; absent, unreadable or no-copy refuses', () => {
    const run = { dir: runDir, clone: copy, pinnedAt: before };
    expect(briefCopyOf(ok(own), run)).toEqual({ ok: true, copy: { dir: copy, operatorClone: '/home/op/redis' } });
    const refusal = (why: string) => ({ ok: false, reason: `the run record's clone ${copy} lies under the state root's copies directory, so the run is copy-class, but ${why}, so its brief cannot name the operator's clone it must not read` });
    // Absent, even for a run record pinned before the disclosure existed.
    expect(briefCopyOf({ state: 'absent' }, run)).toEqual(refusal('the run directory holds no launch.json'));
    expect(briefCopyOf({ state: 'unreadable', why: 'it is not a regular file' }, run)).toEqual(refusal('the run\'s launch.json cannot be read as the record init writes (it is not a regular file)'));
    expect(briefCopyOf(ok({ ...own, runClass: 'no-copy', copy: null }), run)).toEqual(refusal('the run\'s launch.json says it is a no-copy run'));
  });

  it('a clone elsewhere: absent is a legacy no-copy run only where the run record was pinned before the disclosure existed', () => {
    const run = { dir: runDir, clone: '/home/op/redis', pinnedAt: before };
    expect(briefCopyOf({ state: 'absent' }, run)).toEqual({ ok: true, copy: null });
    expect(briefCopyOf({ state: 'absent' }, { ...run, pinnedAt: since })).toEqual({ ok: false,
      reason: `the run directory holds no launch.json, and its run record was pinned at ${since}, not before 2026-11-13T00:00:00Z, the cutoff before which a run record may lack one, so it is not taken for a run initialised before the disclosure existed, so whether the brief must direct its session to a copy cannot be decided` });
    // A pinnedAt that does not parse is never before the cutoff (R-PDJA-33-SLICE-CD-2 finding 4).
    expect(briefCopyOf({ state: 'absent' }, { ...run, pinnedAt: 'not-an-instant' })).toEqual({ ok: false,
      reason: 'the run directory holds no launch.json, and its run record was pinned at not-an-instant, not before 2026-11-13T00:00:00Z, the cutoff before which a run record may lack one, so it is not taken for a run initialised before the disclosure existed, so whether the brief must direct its session to a copy cannot be decided' });
    expect(briefCopyOf({ state: 'unreadable', why: 'x' }, run)).toEqual({ ok: false, reason: 'the run\'s launch.json cannot be read as the record init writes (x), so whether the brief must direct its session to a copy cannot be decided' });
    expect(briefCopyOf(ok({ ...own, runClass: 'no-copy', copy: null }), { ...run, pinnedAt: since })).toEqual({ ok: true, copy: null });
    expect(briefCopyOf(ok(own), run)).toEqual({ ok: false, reason: `the run's launch.json names the copy ${copy}, but the run record's clone is /home/op/redis` });
  });

  it('the copies directory itself, or a sibling of it named alike, is not under it', () => {
    expect(briefCopyOf({ state: 'absent' }, { dir: runDir, clone: path.join(root, 'copies'), pinnedAt: before })).toEqual({ ok: true, copy: null });
    expect(briefCopyOf({ state: 'absent' }, { dir: runDir, clone: path.join(root, 'copies-x', 'copy-AbC123'), pinnedAt: before })).toEqual({ ok: true, copy: null });
  });
});

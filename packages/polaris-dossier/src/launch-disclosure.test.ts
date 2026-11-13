import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { launchDisclosureItems, launchDisclosureUnknown, readLaunchDisclosure, statementItemId, type LaunchDisclosure } from './launch-disclosure.js';

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
    const briefs = statement('briefs', 'brief or packet delivered', 'copy-class', true, 'Briefed.') as LaunchDisclosure['statements'][number];
    expect(launchDisclosureItems(launched, briefs).map(i => [i.id, i.label, i.text.slice(0, 80)])).toEqual([
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
      ['launch/brief-or-packet-delivered/copy-class/reached/briefs', 'Inferred', 'Briefed.'],
      ['launch/drawer', 'Inferred', 'The drawer statement relied on: LAUNCH-DRAWER-y.'],
      ['launch/answered', 'Inferred', 'Who answered rests on the operator\'s declaration that the owner answered in pers'],
    ]);
    expect(launchDisclosureItems(launched, null)[0]!.text).toBe(`The consents were recorded at launch: LAUNCH-OBSERVATION-x, LAUNCH-DRAWER-y, in the recording commit ${R}.`);
    expect(launchDisclosureItems(launched, null)[1]!.text).toBe('The repository identity repository:redis-redis and its normalised URL github.com/redis/redis are Inferred, from the clone\'s remote origin.');
  });

  it('none recorded, no declaration, no drawer, no question', () => {
    const quiet: LaunchDisclosure = {
      ...launched, consents: { recorded: [], commit: null, relied: ['launch observation consent LAUNCH-OBSERVATION-x (' + C + ')'] },
      subject: { ...launched.subject, publicDeclaration: null }, drawer: null,
      statements: [...launched.statements.slice(0, 3), statement('question', 'question asked', 'both', false, 'No question was asked.')] as LaunchDisclosure['statements'],
    };
    const texts = launchDisclosureItems(quiet, null).map(i => i.text);
    expect(texts[0]).toBe(`No consent was recorded at launch: the run rests on launch consent records already in force: launch observation consent LAUNCH-OBSERVATION-x (${C}).`);
    expect(texts[2]).toBe('The operator made no declaration whether the repository is public [Inferred].');
    expect(texts.slice(-2)).toEqual(['No drawer statement was relied on.', 'No question was asked, so no one answered it.']);
  });

  it('a statement\'s page id carries its stage, its class and whether it was reached', () => {
    expect(statementItemId({ id: 'copy', stage: 'copy step started', runClass: null, reached: false, label: 'Inferred', text: 'x' })).toBe('launch/copy-step-started/class-undecided/not-reached/copy');
  });

  it('a run with no readable disclosure renders Unknown, saying why', () => {
    expect(launchDisclosureUnknown({ state: 'absent' })).toEqual({ id: 'launch/unknown', label: 'Unknown', text: 'The run directory holds no launch.json: the run was initialised before Syzygy recorded its launch disclosure, so whether it was launched, its class, whether a copy was made and every launch statement are Unknown.' });
    expect(launchDisclosureUnknown({ state: 'unreadable', why: 'it is not a regular file' })).toEqual({ id: 'launch/unknown', label: 'Unknown', text: 'The run\'s launch.json cannot be read as the record init writes (it is not a regular file), so whether it was launched, its class, whether a copy was made and every launch statement are Unknown.' });
  });
});

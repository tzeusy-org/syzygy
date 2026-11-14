import type { ObservationRecordSummary } from '@syzygy/polaris-generation-consent/live';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { installReadLog, sealExcept } from './fs-patch.testkit.js';
import { execFileSync, spawnSync } from 'node:child_process';
import { initRun } from './init.js';
import { EventEmitter } from 'node:events';
import { interruptWatch, type CopyGitRun } from './launch-copy.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { launchConsent, type LaunchOutcome, type LaunchPorts, type LaunchRequest } from './launch.js';
import { LAUNCH_REF, readLaunchRecords, writeLaunchRecords } from './launch-store.js';
import { parseLaunchRecord, renderLaunchRecord } from './launch-record.js';
import { withLaunchRecords } from './launch-sources.js';
import { NON_PUBLIC_SUCCESSOR } from './launch-cli.js';
import { briefCopyOf, cloneUnderCopies, readLaunchDisclosure } from './launch-disclosure.js';
import { fixtureClasses, fullClone, gitIn, listing, makeHome, makeUpstream, noOtherActs, scriptedTerminal, writeFiles, type ScriptedTerminal } from './launch.testkit.js';

/** REQ-polaris-generation-046 and 047, conformance by scenario and falsifier arm, against fixture governance homes and clones made by
 * `git` outside the code under test. Object reads are captured by a read-logging wrapper around the object reader: it records each call
 * and its revision, and the oracle asserts no `readBlobs` call. References, HEAD, index and working trees are compared by an independent
 * listing before and after. Expected phrases, identities, record sets and refusals are literals. */

const NOW = Date.parse('2026-11-09T12:00:00Z');
const URL_RR = 'https://github.com/redis/redis.git';

/** `answers`: what each `storedType` call resolved to, or `refused <reason>`, so a header answer is told from a refused full read. */
interface Captured { readonly calls: string[]; readonly answers: string[]; readonly dirs: string[] }
function readLog(): { readonly open: (o: PinnedObjectReaderOptions) => PinnedObjectReader; readonly log: Captured } {
  const log: Captured = { calls: [], answers: [], dirs: [] };
  return {
    log,
    open: o => {
      log.dirs.push(o.gitDir);
      const r = openPinnedObjectReader(o);
      const wrap = <K extends keyof PinnedObjectReader>(k: K) => ((...args: unknown[]) => { log.calls.push(`${String(k)} ${o.revision}`); return (r[k] as (...a: unknown[]) => unknown)(...args); }) as PinnedObjectReader[K];
      return { revision: r.revision, algorithm: r.algorithm, tree: wrap('tree'), readBlobs: wrap('readBlobs'), listTree: wrap('listTree'), inventory: wrap('inventory'), commitHead: wrap('commitHead'),
        storedType: () => wrap('storedType')().then(t => { log.answers.push(t); return t; }, (e: unknown) => { log.answers.push(`refused ${(e as { reason?: string }).reason}`); throw e; }) };
    },
  };
}

function setup(answers: readonly (string | null)[], more: { isTTY?: boolean; ports?: Partial<LaunchPorts>; request?: Partial<LaunchRequest>; home?: string; clone?: string } = {}) {
  const home = more.home ?? makeHome();
  const terminal = scriptedTerminal(answers, more.isTTY ?? true);
  const reads = readLog();
  const ports: LaunchPorts = {
    home, now: () => NOW, terminal, sources: noOtherActs(), writeConsent: async () => ({ state: 'ok', record: 'WRITE-CONSENT-LAUNCH-RECORDS-2026-11-08' }),
    nonPublic: async () => ({ admitted: false, successor: NON_PUBLIC_SUCCESSOR }), previewClasses: fixtureClasses, a1InForce: () => false, openReader: reads.open,
    copyRoot: path.join(tempDir('syzygy-launch-state-'), 'copies'),
    ...more.ports,
  };
  const request = (clone: string): LaunchRequest => ({ clone, agentTool: 'claude-code', agentProvider: 'anthropic', operator: 'op', headConsentedElsewhere: false, command: 'syzygy dossier init <clone> --config c --state-root s', ...more.request });
  return { home, terminal, reads, ports, request };
}

const run = async (clone: string, s: ReturnType<typeof setup>): Promise<LaunchOutcome> => launchConsent(s.request(clone), s.ports);
const recordsOf = (home: string) => { const r = readLaunchRecords(home); if (!r.ok) throw new Error(r.why); return r.records; };
const askedPhrases = (t: ScriptedTerminal) => t.prompts.filter(p => p.startsWith('Type exactly: ')).map(p => p.slice('Type exactly: '.length, -3));
const noBlobRead = (log: Captured) => expect(log.calls.filter(c => c.startsWith('readBlobs'))).toEqual([]);

describe('REQ-polaris-generation-046: first run, public, non-governed, no drawer', () => {
  it('asks once before any blob, commits one observation consent and one drawer statement, and changes nothing else', async () => {
    const up = makeUpstream({ 'src/a.c': 'int a;\n' });
    const clone = fullClone(up.dir, URL_RR);
    const rev = up.commits[0]!, r12 = rev.slice(0, 12);
    const s = setup(['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`]);
    const homeBefore = listing(s.home), cloneBefore = listing(clone);
    const out = await run(clone, s);
    expect(out.kind).toBe('recorded');
    if (out.kind !== 'recorded') return;
    expect(out.subject).toEqual({ identity: 'repository:redis-redis', identitySource: 'derived', url: 'github.com/redis/redis', urlSource: 'the clone\'s remote origin', publicDeclaration: 'public' });
    expect(out.pin).toMatchObject({ commit: rev, via: 'refs/remotes/origin/HEAD -> refs/remotes/origin/main', fetched: false, updateCommand: `git -C '${clone}' fetch origin` });
    expect(askedPhrases(s.terminal)).toEqual([`CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`]);
    expect(s.terminal.printed[0]).toContain('Only the owner may answer this question, in person');
    expect(s.terminal.printed[0]).toContain('Repository identity (proposed): repository:redis-redis [Inferred]');
    noBlobRead(s.reads.log);
    const records = recordsOf(s.home);
    expect(records.map(r => [r.record.recordClass, r.record.identity, r.record.revision, r.state])).toEqual([
      ['drawer-statement', 'repository:redis-redis', rev, 'active'], ['observation-consent', 'repository:redis-redis', rev, 'active']]);
    expect(new Set(records.map(r => r.commit)).size).toBe(1);   // one recording commit per confirmed answer
    expect(records[1]!.record.question).toContain('Only the owner may answer');
    expect(records[1]!.record.terminal).toBe('/dev/pts/fixture');
    const homeAfter = listing(s.home);
    expect([homeAfter.head, homeAfter.index, homeAfter.tree]).toEqual([homeBefore.head, homeBefore.index, homeBefore.tree]);
    expect(homeAfter.refs.split('\n').filter(l => !l.startsWith(LAUNCH_REF))).toEqual(homeBefore.refs.split('\n'));
    expect(listing(clone)).toEqual(cloneBefore);
  });
});

describe('governed subjects and the provider statement', () => {
  const governedUp = () => makeUpstream({ 'openspec/specs/x.md': '# x\n', 'src/a.c': 'int a;\n' });

  it('records an observation consent and a provider statement, separately, each binding its own digest', async () => {
    const up = governedUp();
    const clone = fullClone(up.dir, URL_RR), r12 = up.commits[0]!.slice(0, 12);
    const s = setup(['public', 'unknown', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `CONSENT TO AGENT PROVIDER anthropic WITH claude-code FOR repository:redis-redis AT ${r12}`]);
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'recorded', statementDeclined: false });
    const records = recordsOf(s.home);
    expect(records.map(r => [r.record.recordClass, r.record.provider?.contentClasses ?? null])).toEqual([['observation-consent', null], ['provider-statement', ['code-content', 'project-documentation']]]);
    expect(records[0]!.digest).not.toBe(records[1]!.digest);
    expect(s.terminal.printed.join('\n')).toContain('Content classes (a preview: the policy\'s classification as it would apply once the observation consent admits the repository): code-content, project-documentation.');
  });

  it('drawer unknown on a non-governed tree: no drawer statement, the statement is asked for', async () => {
    const up = makeUpstream({ 'src/a.c': 'int a;\n' });
    const clone = fullClone(up.dir, URL_RR), r12 = up.commits[0]!.slice(0, 12);
    const s = setup(['public', 'unknown', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, '']);
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'recorded', statementDeclined: true });
    expect(askedPhrases(s.terminal)).toEqual([`CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `CONSENT TO AGENT PROVIDER anthropic WITH claude-code FOR repository:redis-redis AT ${r12}`]);
    expect(recordsOf(s.home).map(r => r.record.recordClass)).toEqual(['observation-consent']);   // declined: the observation consent alone
  });

  it('reuses a covering statement at a new revision, and widens one that does not cover, superseding it', async () => {
    const up = makeUpstream({ 'openspec/a.c': 'x\n' }, [{ 'src/b.c': 'y\n' }, { 'docs/c.md': 'z\n' }]);
    const [c1, c2, c3] = up.commits as [string, string, string];
    const home = makeHome();
    const at = (commit: string) => { const clone = fullClone(up.dir, URL_RR); gitIn(clone, 'checkout', '-q', '--detach', commit); return clone; };
    const s1 = setup(['public', 'exists', `CONSENT TO OBSERVE repository:redis-redis AT ${c1.slice(0, 12)}`, `CONSENT TO AGENT PROVIDER anthropic WITH claude-code FOR repository:redis-redis AT ${c1.slice(0, 12)}`], { home, request: { revision: c1 } });
    expect((await run(at(c1), s1)).kind).toBe('recorded');
    const s2 = setup(['public', 'exists', `CONSENT TO OBSERVE repository:redis-redis AT ${c2.slice(0, 12)}`], { home, request: { revision: c2 } });
    const out2 = await run(at(c2), s2);
    expect(askedPhrases(s2.terminal)).toEqual([`CONSENT TO OBSERVE repository:redis-redis AT ${c2.slice(0, 12)}`]);
    expect(out2.kind === 'recorded' && out2.relied.some(r => r.startsWith('per-project statement LAUNCH-PROVIDER-'))).toBe(true);
    expect(recordsOf(home).filter(r => r.record.recordClass === 'provider-statement')).toHaveLength(1);
    const s3 = setup(['public', 'exists', `CONSENT TO OBSERVE repository:redis-redis AT ${c3.slice(0, 12)}`, `CONSENT TO AGENT PROVIDER anthropic WITH claude-code FOR repository:redis-redis AT ${c3.slice(0, 12)}`], { home, request: { revision: c3 } });
    expect((await run(at(c3), s3)).kind).toBe('recorded');
    const statements = recordsOf(home).filter(r => r.record.recordClass === 'provider-statement');
    expect(statements.map(r => [r.state, r.record.provider!.contentClasses])).toEqual([['superseded', ['code-content']], ['active', ['code-content', 'project-documentation']]]);
    expect(statements[1]!.record.supersedes).toBe(statements[0]!.record.recordId);
  });
});

describe('refusals before asking, and refusals of the answer, record nothing', () => {
  const plain = () => { const up = makeUpstream({ 'src/a.c': 'int a;\n' }); return { up, clone: fullClone(up.dir, URL_RR) }; };

  it('standard input not a terminal: refuses, naming the missing consents and the command, and asks nothing', async () => {
    const { clone } = plain();
    const s = setup([], { isTTY: false });
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'terminal', command: 'syzygy dossier init <clone> --config c --state-root s', recorded: false } });
    if (out.kind === 'refused') expect(out.refusal.missing[0]).toMatch(/^an observation consent for repository:redis-redis at [0-9a-f]{40}$/);
    expect(s.terminal.prompts).toEqual([]);
    noBlobRead(s.reads.log);
    expect(gitIn(s.home, 'for-each-ref', LAUNCH_REF)).toBe('');
  });

  it.each([
    ['text other than the phrase', ['public', 'none', 'yes']],
    ['no answer', ['public', 'none', null]],
    ['a public declaration that is none of the answers', ['yes']],
  ])('%s: refused, no record exists afterwards', async (_name, answers) => {
    const { clone } = plain();
    const s = setup(answers);
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'answer', recorded: false } });
    expect(gitIn(s.home, 'for-each-ref', LAUNCH_REF)).toBe('');
    noBlobRead(s.reads.log);
  });

  it.each([
    ['the phrase in lower case', (r12: string) => `consent to observe repository:redis-redis at ${r12}`],
    ['the phrase with a trailing space', (r12: string) => `CONSENT TO OBSERVE repository:redis-redis AT ${r12} `],
    ['the phrase naming another identity', (r12: string) => `CONSENT TO OBSERVE repository:redis-other AT ${r12}`],
  ])('an observation answer that is %s, before an exact drawer phrase: refused, no record exists afterwards', async (_name, answer) => {
    const { up, clone } = plain();
    const r12 = up.commits[0]!.slice(0, 12);
    const s = setup(['public', 'none', answer(r12), `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`]);
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'answer', recorded: false, reason: 'the answer was not the exact phrase for the observation consent; nothing was recorded. The owner runs, in person at a terminal:' } });
    expect(gitIn(s.home, 'for-each-ref', LAUNCH_REF)).toBe('');
  });

  it('not declared public while no policy admits non-public sources: refused before any record, naming the successor', async () => {
    const { clone } = plain();
    for (const declaration of ['not public', '']) {
      const s = setup([declaration]);
      const out = await run(clone, s);
      expect(out).toEqual({ kind: 'refused', refusal: { stage: 'not-public', recorded: false, statements: expect.any(Array), missing: expect.any(Array),
        reason: `the operator did not declare the repository public, and no effective policy admits non-public sources: ${NON_PUBLIC_SUCCESSOR} is missing; nothing was recorded`,
        copy: { state: 'removed', location: expect.stringMatching(/\/copies\/copy-[A-Za-z0-9]{6}$/) }, copyStatement: expect.stringMatching(/^The copy at \S+\/copies\/copy-[A-Za-z0-9]{6} was removed, its directory included\.$/) } });
      expect(gitIn(s.home, 'for-each-ref', LAUNCH_REF)).toBe('');
    }
  });

  it('not declared public where a policy admits it: the warning precedes the phrase, asks nothing, and the phrase is unchanged', async () => {
    const { up, clone } = plain();
    const r12 = up.commits[0]!.slice(0, 12);
    const s = setup(['not public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`], { ports: { nonPublic: async () => ({ admitted: true, successor: '' }) } });
    const out = await run(clone, s);
    expect(out.kind).toBe('recorded');
    const warning = 'Warning: a confirmed answer records the repository identity repository:redis-redis and its normalised URL github.com/redis/redis in the launch consent records, which Syzygy commits on refs/heads/launch-consent-records in the observing project\'s own repository. Syzygy never pushes that reference; one push of it would publish them. This is a warning only: nothing here asks you to confirm it.';
    expect(s.terminal.printed).toContain(warning);
    expect(s.terminal.prompts.length).toBe(4);   // the declaration, the drawer and the two phrases: no confirmation of the warning
    expect(askedPhrases(s.terminal)[0]).toBe(`CONSENT TO OBSERVE repository:redis-redis AT ${r12}`);
    expect(recordsOf(s.home)[0]!.record.publicDeclaration).toBe('not-public');
  });

  it('write consent absent: asks nothing and refuses, naming it', async () => {
    const { clone } = plain();
    const s = setup([], { ports: { writeConsent: async () => ({ state: 'absent', why: 'the launch-record write consent is not in force: no act' }) } });
    expect(await run(clone, s)).toMatchObject({ kind: 'refused', refusal: { stage: 'write-consent', reason: 'Syzygy asks nothing: the launch-record write consent is not in force: no act' } });
    expect(s.terminal.prompts).toEqual([]);
  });

  it('an unreadable launch-records reference: refuses before asking, naming why, and records nothing (review F5)', async () => {
    const { clone } = plain();
    const s = setup([], { ports: { readStore: () => ({ ok: false, why: 'the commit c0ffee on refs/heads/launch-consent-records has 2 parents' }) } });
    expect(await run(clone, s)).toMatchObject({ kind: 'refused', refusal: { stage: 'records', reason: 'the launch consent records on refs/heads/launch-consent-records cannot be read: the commit c0ffee on refs/heads/launch-consent-records has 2 parents' } });
    expect(s.terminal.prompts).toEqual([]);
  });

  it('an A1 mechanism in force: refuses to record without a state selection', async () => {
    const { clone } = plain();
    const s = setup([], { ports: { a1InForce: () => true } });
    expect(await run(clone, s)).toMatchObject({ kind: 'refused', refusal: { stage: 'a1' } });
    expect(s.terminal.prompts).toEqual([]);
  });

  it('the clone from the governance home itself: refused before asking, printing the separate-clone command', async () => {
    const home = makeHome();
    const s = setup([], { home });
    const out = await run(home, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'self-observation' } });
    if (out.kind === 'refused') expect(out.refusal.command).toMatch(/^git clone --no-local --no-checkout .+ <new-dir> && git -C <new-dir> checkout --detach [0-9a-f]{40}$/);
    expect(s.terminal.prompts).toEqual([]);
  });

  it('matching records that disagree on identity: refused before asking, naming both', async () => {
    const up = makeUpstream({ 'src/a.c': 'x\n' }, [{ 'src/b.c': 'y\n' }]);
    const [c1, c2] = up.commits as [string, string];
    const home = makeHome();
    const first = fullClone(up.dir, 'https://github.com/a/one'); gitIn(first, 'checkout', '-q', '--detach', c1);
    expect(await run(first, setup(['public', 'none', `CONSENT TO OBSERVE repository:a-one AT ${c1.slice(0, 12)}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:a-one AT ${c1.slice(0, 12)}`], { home, request: { revision: c1 } }))).toMatchObject({ kind: 'recorded' });
    const second = fullClone(up.dir, 'https://github.com/b/two'); gitIn(second, 'checkout', '-q', '--detach', c1);
    expect(await run(second, setup(['public', 'none', `CONSENT TO OBSERVE repository:other-id AT ${c1.slice(0, 12)}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:other-id AT ${c1.slice(0, 12)}`], { home, request: { revision: c1, identity: 'other-id' } }))).toMatchObject({ kind: 'recorded' });
    const third = fullClone(up.dir, 'https://github.com/a/one');
    const s = setup([], { home });
    const out = await run(third, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'identity' } });
    if (out.kind === 'refused') {
      expect(out.refusal.reason).toMatch(/^the matching records carry more than one identity, so Syzygy proposes none: /);
      expect(out.refusal.reason).toContain('(repository:a-one, active; matched by identity and url and parent)');
      expect(out.refusal.reason).toContain('(repository:other-id, active; matched by parent)');
    }
    expect(s.terminal.prompts).toEqual([]);
    void c2;
  });
});

describe('records in force, revocation and self-observation', () => {
  it('records already in force: asks nothing, writes nothing, names them', async () => {
    const up = makeUpstream({ 'src/a.c': 'int a;\n' });
    const r12 = up.commits[0]!.slice(0, 12);
    const home = makeHome();
    await run(fullClone(up.dir, URL_RR), setup(['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`], { home }));
    const tip = gitIn(home, 'rev-parse', LAUNCH_REF);
    const s = setup([], { home });
    const out = await run(fullClone(up.dir, URL_RR), s);
    expect(out.kind).toBe('covered');
    if (out.kind === 'covered') expect(out.relied.map(r => r.replace(/LAUNCH-[A-Z]+-[0-9a-f]{12}-\d{8}T\d{6}Z-[0-9a-f]{8}/g, 'ID').replace(/\([0-9a-f]{40}\)/, '(C)'))).toEqual(['launch observation consent ID (C)', 'drawer statement ID']);
    expect(s.terminal.prompts).toEqual([]);
    expect(gitIn(home, 'rev-parse', LAUNCH_REF)).toBe(tip);
  });

  it('an earlier consent revoked: the question names it and its state; a new answer is a new grant and the old stays revoked', async () => {
    const up = makeUpstream({ 'src/a.c': 'x\n' }, [{ 'src/b.c': 'y\n' }]);
    const [c1, c2] = up.commits as [string, string];
    const home = makeHome();
    const first = fullClone(up.dir, URL_RR); gitIn(first, 'checkout', '-q', '--detach', c1);
    expect(await run(first, setup(['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${c1.slice(0, 12)}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${c1.slice(0, 12)}`], { home, request: { revision: c1 } }))).toMatchObject({ kind: 'recorded' });
    const old = recordsOf(home).find(r => r.record.recordClass === 'observation-consent')!.record.recordId;
    writeFiles(home, { '.syzygy/governance/decisions/REVOKE.md': `Revokes ${old}.\n` });
    const s = setup(['public', `CONSENT TO OBSERVE repository:redis-redis AT ${c2.slice(0, 12)}`], { home });
    const out = await run(fullClone(up.dir, URL_RR), s);
    expect(out.kind).toBe('recorded');
    expect(s.terminal.printed[0]).toContain(`- ${old} (observation-consent, repository:redis-redis): revoked by .syzygy/governance/decisions/REVOKE.md`);
    expect(recordsOf(home).map(r => [r.record.recordClass, r.record.revision, r.state])).toEqual([['drawer-statement', c1, 'active'], ['observation-consent', c1, 'revoked'], ['observation-consent', c2, 'active']]);
  });

  it('self-observation from a separate clone keeps the trunk tip stable, and a second run at that tip asks nothing', async () => {
    const home = makeHome();
    const trunk = gitIn(home, 'rev-parse', 'main');
    const clone = fullClone(home, 'https://github.com/tzeusy-org/syzygy');
    const r12 = trunk.slice(0, 12);
    // The home's tree holds .syzygy/ paths, so the subject is governed and needs the statement too.
    const first = await run(clone, setup(['public', 'none', `CONSENT TO OBSERVE repository:tzeusy-org-syzygy AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:tzeusy-org-syzygy AT ${r12}`,
      `CONSENT TO AGENT PROVIDER anthropic WITH claude-code FOR repository:tzeusy-org-syzygy AT ${r12}`], { home }));
    expect(first).toMatchObject({ kind: 'recorded' });
    expect(gitIn(home, 'rev-parse', 'main')).toBe(trunk);
    const s = setup([], { home });
    const second = await run(fullClone(home, 'https://github.com/tzeusy-org/syzygy'), s);
    expect(second).toMatchObject({ kind: 'covered', pin: { commit: trunk } });
    expect(s.terminal.prompts).toEqual([]);
  });
});

describe('REQ-polaris-generation-047 against real clones', () => {
  it('HEAD elsewhere in a no-copy run: refused before asking, the clone unchanged, the checkout command printed', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' }, [{ 'b.c': 'y\n' }]);
    const clone = fullClone(up.dir, URL_RR);
    gitIn(clone, 'checkout', '-q', '--detach', up.commits[0]!);
    const before = listing(clone);
    const s = setup([], { ports: { sources: { ...noOtherActs(), observationConsentNaming: async r => (r === up.commits[1] ? { satisfied: true, record: 'OTHER-ACT@1' } : { satisfied: false, why: 'no' }) } } });
    expect(await run(clone, s)).toEqual({ kind: 'refused', refusal: { stage: 'head', missing: [], recorded: false, statements: expect.any(Array),
      reason: `the clone's HEAD is ${up.commits[0]}, not the pinned revision ${up.commits[1]} (refs/remotes/origin/HEAD -> refs/remotes/origin/main); Syzygy does not change the checkout`,
      command: `git -C '${clone}' checkout --detach ${up.commits[1]}` } });
    expect(listing(clone)).toEqual(before);
    expect(s.reads.log.calls).toEqual([`storedType ${up.commits[1]}`, `tree ${up.commits[1]}`]);   // the pinned commit's header, then the commit re-hashed, before the refusal
    expect(s.reads.log.answers).toEqual(['commit']);
  });

  it('a no-copy run\'s question states the no-copy form of each copy statement, and none of the copy-class forms (R-PDJA-33-SLICE-D-1 finding 4)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const s = setup([], { ports: { sources: { ...noOtherActs(), observationConsentNaming: async r => (r === up.commits[0] ? { satisfied: true, record: 'OTHER-ACT@1' } : { satisfied: false, why: 'no' }) } } });
    expect(await run(fullClone(up.dir, URL_RR), s)).toMatchObject({ kind: 'refused', refusal: { stage: 'answer' } });
    const opening = s.terminal.printed.find(p => p.startsWith('Syzygy launch consent'))!;
    expect(opening.split('\n')).toContain('How the copy was made, where the sessions are directed to work in it, and the copy made before your answer: no copy was made. This is a no-copy run, whose clone is the operator\'s own.');
    for (const copyClass of ['The run\'s clone is a copy', 'directed, by their briefs, to work in the copy', 'before your answer, and Syzygy has read none of its blobs']) expect(opening).not.toContain(copyClass);
  });

  it('a pinned commit whose commit object cannot be read: the committer date is Unknown, saying what happened, in each class (R-PDJA-33-SLICE-D-1 finding 2)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const refusing = (o: PinnedObjectReaderOptions): PinnedObjectReader => ({ ...openPinnedObjectReader(o), commitHead: async () => { throw new GitObjectReadRefusal('corrupt-object', 'fixture refusal'); } });
    const noCopy = setup([], { ports: { openReader: refusing, sources: { ...noOtherActs(), observationConsentNaming: async r => (r === up.commits[0] ? { satisfied: true, record: 'OTHER-ACT@1' } : { satisfied: false, why: 'no' }) } } });
    const a = await run(fullClone(up.dir, URL_RR), noCopy);
    expect(a).toMatchObject({ kind: 'refused', refusal: { stage: 'listing' } });
    if (a.kind !== 'refused') return;
    expect(a.refusal.statements.find(x => x.id === 'pinned-commit')?.text)
      .toBe(`The pinned revision is ${up.commits[0]}. Its committer date is Unknown: Syzygy could not read the commit object (fixture refusal).`);
    const copied = await run(fullClone(up.dir, URL_RR), setup([], { ports: { openReader: refusing } }));
    expect(copied).toMatchObject({ kind: 'refused', refusal: { stage: 'listing', copy: { state: 'removed' } } });
    if (copied.kind !== 'refused') return;
    expect(copied.refusal.statements.find(x => x.id === 'pinned-commit')?.text)
      .toBe(`The pinned revision is ${up.commits[0]}: the copy's detached checkout left the copy's HEAD there. Its committer date is Unknown: Syzygy could not read the commit object (fixture refusal).`);
  });

  it('an annotated tag or a blob named by --revision in a no-copy run refuses from its header alone; its body is never read (syzygy-pdja.30)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    gitIn(up.dir, 'tag', '-a', 'v1', '-m', 'a tag message');
    const clone = fullClone(up.dir, URL_RR);
    const tag = gitIn(clone, 'rev-parse', 'v1'), blob = gitIn(clone, 'rev-parse', 'HEAD:a.c');
    const tagSize = gitIn(clone, 'cat-file', '-s', tag);
    // Each object's stored bytes become its header, sync-flushed, then bytes no zlib stream continues with: only a header read answers.
    for (const [id, header] of [[tag, `tag ${tagSize}\0`], [blob, 'blob 2\0']] as const) {
      const file = path.join(clone, '.git', 'objects', id.slice(0, 2), id.slice(2));
      fs.rmSync(file, { force: true });
      fs.writeFileSync(file, Buffer.concat([zlib.deflateSync(Buffer.from(header, 'latin1'), { finishFlush: zlib.constants.Z_SYNC_FLUSH }), Buffer.alloc(4096, 0xff)]));
    }
    for (const [revision, id] of [['v1', tag], [blob, blob]] as const) {
      const s = setup([], { request: { revision }, ports: { sources: { ...noOtherActs(), observationConsentNaming: async () => ({ satisfied: true, record: 'OTHER-ACT@1' }) } } });
      expect(await run(clone, s), revision).toEqual({ kind: 'refused', refusal: { stage: 'revision', missing: [], recorded: false, statements: expect.any(Array),
        reason: `--revision ${revision} resolves to ${id}, which is not a commit the clone's store holds` } });
      expect(s.reads.log.calls, revision).toEqual([`storedType ${id}`]);
      expect(s.reads.log.answers, revision).toEqual([revision === 'v1' ? 'tag' : 'blob']);   // answered from the header, not a refused full read
    }
  });

  it('a trunk named master with no remote default; an abbreviated --revision', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    gitIn(clone, 'remote', 'set-head', 'origin', '-d');
    gitIn(clone, 'branch', '-m', 'main', 'master');
    const s = setup(['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${up.commits[0]!.slice(0, 12)}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${up.commits[0]!.slice(0, 12)}`]);
    expect(await run(clone, s)).toMatchObject({ kind: 'recorded', pin: { commit: up.commits[0], via: 'refs/heads/master' } });
    const s2 = setup([], { home: s.home, request: { revision: up.commits[0]!.slice(0, 8) } });
    expect(await run(clone, s2)).toMatchObject({ kind: 'covered', pin: { commit: up.commits[0], via: `--revision ${up.commits[0]!.slice(0, 8)}` } });
  });

  it('existing consent at HEAD made by another act: pins HEAD and returns to that path, asking nothing', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' }, [{ 'b.c': 'y\n' }]);
    const clone = fullClone(up.dir, URL_RR);
    gitIn(clone, 'checkout', '-q', '--detach', up.commits[0]!);
    const s = setup([], { request: { headConsentedElsewhere: true } });
    expect(await run(clone, s)).toEqual({ kind: 'head-consented', commit: up.commits[0] });
    expect(fs.existsSync(path.join(s.home, '.git', 'refs', 'heads', 'launch-consent-records'))).toBe(false);
  });
});

/** The launch's in-process reads of the operator's clone, by the API-independent oracle (R-PDJA-33-SLICE-A-1 finding 1): every file
 * of the clone's `.git` but `readable` is sealed (mode 000) until the copy step's first Git process, which unseals them, since Git, not
 * Syzygy, then reads the clone; and every content read and path examination under `.git`, by any `node:fs` or `node:fs/promises` entry
 * point, is logged for the whole run. The object reads of the copy go through the re-hashing reader and are captured by `s.reads`. */
async function sealedReads<T extends ReturnType<typeof setup>>(clone: string, readable: readonly string[], make: (copyGit: CopyGitRun) => T, inner?: CopyGitRun): Promise<{ readonly opened: readonly string[]; readonly examined: readonly string[]; readonly out: LaunchOutcome; readonly s: T; readonly sealed: readonly string[] }> {
  // The seal and the log are rooted at the clone, its working tree included, and paths are given relative to its .git ("../a.c" is a
  // working-tree file): 046's closed list admits none of the working tree. The clone is unsealed only while a Git process for the copy
  // runs, and re-sealed when it returns, so an in-process read after the copy step starts fails too (R-PDJA-33-SLICE-B-1 finding 3).
  const fromGitDir = (rel: string) => rel === '.git' ? '.' : rel.startsWith('.git/') ? rel.slice('.git/'.length) : rel === '.' ? '..' : `../${rel}`;
  const seal = sealExcept(clone, readable.map(r => `.git/${r}`));
  const s = make((args, o) => {
    seal.unseal();
    try {
      if (inner !== undefined) return inner(args, o);
      const r = spawnSync('git', args, { cwd: o.cwd, env: o.env, encoding: 'utf8' });
      return { status: r.status ?? -1, stderr: r.stderr ?? '' };
    } finally { seal.reseal(); }
  });
  const { log, restore } = installReadLog(clone);
  let out: LaunchOutcome;
  try { out = await run(clone, s); } finally { restore(); seal.unseal(); }
  const of = (paths: readonly string[]) => [...new Set(paths.map(fromGitDir))].sort();
  return { opened: of(log.opened), examined: of(log.examined), out, s, sealed: seal.sealed.map(fromGitDir) };
}

describe('REQ-polaris-generation-046 line 17: the remote URL read as a remote locator, against real clones', () => {
  const answersFor = (c: string, id: string) => ['public', 'none', `CONSENT TO OBSERVE ${id} AT ${c.slice(0, 12)}`, `STATE NO KERNEL EVIDENCE DRAWER FOR ${id} AT ${c.slice(0, 12)}`];

  it('a remote URL carrying user information: removed before the identity and URL derive, said so, and in no record, question or output', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, 'https://bob:hunter2@git.example.org/a/b.git');
    const s = setup(answersFor(up.commits[0]!, 'repository:a-b'));
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'recorded', subject: { identity: 'repository:a-b', url: 'git.example.org/a/b', urlSource: 'the clone\'s remote origin' } });
    const said = 'The URL of the clone\'s remote origin carried user information; Syzygy removed it before deriving anything and does not print, store or record it.';
    expect(out.kind === 'recorded' && out.output.split('\n')).toContain(said);
    expect(s.terminal.printed).toContain(said);
    const everything = JSON.stringify({ out, printed: s.terminal.printed, prompts: s.terminal.prompts, records: recordsOf(s.home) });
    expect(everything.includes('hunter2') || everything.includes('bob')).toBe(false);
  });

  it('a refusal after the identity carries the user-information statement too', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, 'https://bob:hunter2@git.example.org/a/b.git');
    const out = await run(clone, setup([], { isTTY: false }));
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'terminal',
      locatorStatements: ['The URL of the clone\'s remote origin carried user information; Syzygy removed it before deriving anything and does not print, store or record it.'] } });
    expect(JSON.stringify(out).includes('hunter2')).toBe(false);
  });

  it('an identity refusal after the remote URL is read carries the user-information statement: a one-segment path (R-PDJA-33-SLICE-CD-2 finding 1)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, 'https://bob:hunter2@git.example.org/onlyone.git');
    const s = setup([]);
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'identity',
      reason: 'the normalised URL git.example.org/onlyone has fewer than two path segments, so no identity derives from it; give --identity',
      locatorStatements: ['The URL of the clone\'s remote origin carried user information; Syzygy removed it before deriving anything and does not print, store or record it.'] } });
    expect(s.terminal.prompts).toEqual([]);
    expect(JSON.stringify({ out, printed: s.terminal.printed }).includes('hunter2') || JSON.stringify(out).includes('bob')).toBe(false);
  });

  it('a remote URL that is no locator: refused before asking, naming the remote and the rule, the URL in no output', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, 'https://git.example.org/a/b?private_token=x');
    const s = setup([]);
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'identity',
      reason: 'the URL of the clone\'s remote origin is not a remote locator (it carries a query or a fragment), so it derives nothing, as for a clone with no remote; give --identity and --upstream' } });
    expect(s.terminal.prompts).toEqual([]);
    expect(JSON.stringify({ out, printed: s.terminal.printed }).includes('private_token')).toBe(false);
  });

  it('an --upstream not admitted is refused before asking, by its rule, and never printed', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    gitIn(clone, 'remote', 'remove', 'origin');
    const s = setup([], { request: { identity: 'x-y', upstream: 'https://u:secret@git.example.org/a/b' } });
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'identity', reason: 'the --upstream URL is not admitted: an https://, http:// or git:// locator carries no user information; it is not printed, stored or recorded' } });
    expect(JSON.stringify({ out, printed: s.terminal.printed }).includes('secret')).toBe(false);
  });
});

describe('REQ-polaris-generation-046 line 17: observation consents made by other acts are existing records, matched by their normalised Upstream: URL', () => {
  const otherAct = (over: Partial<ObservationRecordSummary> & { revisions?: readonly string[] }) => {
    const record: ObservationRecordSummary = { record: 'PUBLIC-OBS-CD@1', repositoryId: 'c-d', upstream: 'https://git.example.org/c/d.git', admittedRevisions: over.revisions ?? [], state: 'in force', ...over };
    return { ...noOtherActs(), observationRecords: async () => ({ ok: true as const, records: [record] }) };
  };

  it('scenario "Consent found by its upstream URL": it matches by URL, is named with how it matched, proposes its identity, and no new observation consent is asked', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, 'git@git.example.org:c/d');
    const c = up.commits[0]!;
    const sources = { ...otherAct({ revisions: [c] }),
      observationConsentFor: async (id: string, r: string) => (id === 'c-d' && r === c ? { satisfied: true as const, record: 'PUBLIC-OBS-CD@1' } : { satisfied: false as const, why: 'no' }),
      observationConsentNaming: async (r: string) => (r === c ? { satisfied: true as const, record: 'PUBLIC-OBS-CD@1' } : { satisfied: false as const, why: 'no' }) };
    const s = setup(['public', 'none', `STATE NO KERNEL EVIDENCE DRAWER FOR repository:c-d AT ${c.slice(0, 12)}`], { ports: { sources } });
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'recorded', subject: { identity: 'repository:c-d', identitySource: 'matching-records', url: 'git.example.org/c/d' } });
    expect(s.terminal.printed.join('\n')).toContain('- PUBLIC-OBS-CD@1 (observation consent made by another act, repository:c-d): in force; matches this run by identity and url and revision');
    expect(askedPhrases(s.terminal)).toEqual([`STATE NO KERNEL EVIDENCE DRAWER FOR repository:c-d AT ${c.slice(0, 12)}`]);
  });

  it('by URL alone: a consent whose identity differs matches by its normalised Upstream: (host and whole path) and its identity is proposed', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, 'ssh://git@Git.Example.org:2222/C/D.git');
    const s = setup([], { ports: { sources: otherAct({ record: 'PUBLIC-OBS-ZZ@1', repositoryId: 'zz-zz' }) } });
    await run(clone, s);
    expect(s.terminal.printed.join('\n')).toContain('- PUBLIC-OBS-ZZ@1 (observation consent made by another act, repository:zz-zz): in force; matches this run by url');
    expect(s.terminal.printed.join('\n')).toContain('repository:zz-zz');
  });

  it('scenario "Same-named repository on two hosts": an Upstream on another host does not match by URL, but the identity does, and is named so', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, 'https://gitlab.com/a/b.git');
    const s = setup([], { ports: { sources: otherAct({ record: 'PUBLIC-OBS-AB@1', repositoryId: 'a-b', upstream: 'https://github.com/a/b' }) } });
    await run(clone, s);
    expect(s.terminal.printed.join('\n')).toContain('- PUBLIC-OBS-AB@1 (observation consent made by another act, repository:a-b): in force; matches this run by identity');
  });

  it('a same-named repository under another group does not match by URL alone', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, 'https://git.example.org/x/sub/name');
    const s = setup([], { request: { identity: 'mine-here' }, ports: { sources: otherAct({ record: 'PUBLIC-OBS-Y@1', repositoryId: 'other-id', upstream: 'https://git.example.org/y/sub/name' }) } });
    await run(clone, s);
    expect(s.terminal.printed.join('\n')).not.toContain('PUBLIC-OBS-Y@1');
  });

  it('a withdrawn consent made by another act still matches, named with its state; the URL match never stops a revision match', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, 'https://git.example.org/c/d');
    const s = setup([], { ports: { sources: otherAct({ state: 'is withdrawn', upstream: 'https://elsewhere.example/z/z', revisions: [up.commits[0]!] }) } });
    await run(clone, s);
    expect(s.terminal.printed.join('\n')).toContain('- PUBLIC-OBS-CD@1 (observation consent made by another act, repository:c-d): is withdrawn; matches this run by identity and revision');
  });

  it('records that cannot be read refuse the launch before asking: the records matching the run are not known', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const s = setup([], { ports: { sources: { ...noOtherActs(), observationRecords: async () => ({ ok: false as const, why: 'fixture refusal' }) } } });
    expect(await run(clone, s)).toMatchObject({ kind: 'refused', refusal: { stage: 'records',
      reason: 'the observation consents made by other acts cannot be read, so the records matching the run are not known: fixture refusal' } });
    expect(s.terminal.prompts).toEqual([]);
  });
});

describe('REQ-polaris-generation-047: the launch reads of the operator\'s clone are the closed list (registry entry v1.1, item 1b)', () => {
  it('a full clone with history, branches, tags, stash and a second remote: the values of the listed references alone', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' }, [{ 'b.c': 'y\n' }]);
    gitIn(up.dir, 'tag', 'v1', up.commits[0]!);
    gitIn(up.dir, 'branch', 'dev', up.commits[0]!);
    const clone = fullClone(up.dir, URL_RR);
    gitIn(clone, 'branch', 'topic', up.commits[0]!);
    gitIn(clone, 'remote', 'add', 'mirror', 'https://example.org/mirror/redis.git');
    gitIn(clone, 'update-ref', 'refs/remotes/mirror/main', up.commits[0]!);
    fs.writeFileSync(path.join(clone, 'a.c'), 'changed\n');
    gitIn(clone, 'stash', '-q');
    const before = listing(clone);
    const expected = ['HEAD', 'config', 'packed-refs', 'refs/heads/main', 'refs/remotes/origin/HEAD'];
    const r = await sealedReads(clone, expected, copyGit => setup([], { isTTY: false, ports: { copyGit } }));
    expect(r.out).toMatchObject({ kind: 'refused', refusal: { stage: 'terminal', copy: { state: 'removed' } } });
    expect(r.opened).toEqual(expected);
    // The sealed population is what makes the second half bite: the unlisted loose references, the stash, and every object file.
    expect(r.sealed).toEqual(expect.arrayContaining(['refs/heads/topic', 'refs/stash', 'refs/remotes/mirror/main', 'logs/HEAD']));
    expect(listing(clone)).toEqual(before);
  });

  it('a reference --revision names is read; a full identifier lists no store and opens nothing more', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    gitIn(clone, 'tag', 'pin', up.commits[0]!);
    const pinned = ['HEAD', 'config', 'packed-refs', 'refs/heads/main', 'refs/remotes/origin/HEAD', 'refs/tags/pin'];
    const byRef = await sealedReads(clone, pinned, copyGit => setup([], { isTTY: false, request: { revision: 'pin' }, ports: { copyGit } }));
    expect(byRef.out).toMatchObject({ kind: 'refused', refusal: { stage: 'terminal' } });
    expect(byRef.opened).toEqual(pinned);
    const full = ['HEAD', 'config', 'packed-refs', 'refs/heads/main', 'refs/remotes/origin/HEAD'];
    const byId = await sealedReads(clone, full, copyGit => setup([], { isTTY: false, request: { revision: up.commits[0]! }, ports: { copyGit } }));
    expect(byId.out).toMatchObject({ kind: 'refused', refusal: { stage: 'terminal' } });
    expect(byId.opened).toEqual(full);
    // --revision HEAD: HEAD and its reference, already admitted, and nothing more (R-PDJA-33-SLICE-A-1 finding 4).
    const byHead = await sealedReads(clone, full, copyGit => setup([], { isTTY: false, request: { revision: 'HEAD' }, ports: { copyGit } }));
    expect(byHead.out).toMatchObject({ kind: 'refused', refusal: { stage: 'terminal', missing: [`an observation consent for repository:redis-redis at ${up.commits[0]}`, expect.any(String)] } });
    expect(byHead.opened).toEqual(full);
  });

  it('references in the reftable backend: refused before any Git process starts and before any object is read', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const parent = path.dirname(fullClone(up.dir, URL_RR));
    const clone = path.join(parent, 'reftable');
    gitIn(parent, 'clone', '-q', '--ref-format=reftable', up.dir, clone);
    const r = await sealedReads(clone, ['HEAD'], copyGit => setup([], { ports: { copyGit } }));
    const s = r.s;
    expect(r.out).toEqual({ kind: 'refused', refusal: { stage: 'clone', missing: [], recorded: false,
      reason: 'the clone stores its references in the reftable backend; Syzygy reads references only as loose files and packed-refs, so the run is refused before any Git process starts',
      // 047's stage rule: every stage not reached, and nothing of the thing itself.
      statements: [
        { id: 'named-identifier', stage: 'identifier named', runClass: 'both', reached: false, label: 'Inferred', text: 'No identifier was named.' },
        { id: 'copy', stage: 'copy step started', runClass: null, reached: false, label: 'Inferred', text: 'No copy was made: the run ended before its class was decided.' },
        { id: 'pinned-commit', stage: 'commit pinned', runClass: 'both', reached: false, label: 'Inferred', text: 'The commit was not pinned, and its committer date is Unknown.' },
        { id: 'question', stage: 'question asked', runClass: 'both', reached: false, label: 'Inferred', text: 'No question was asked.' },
      ] } });
    // Told by HEAD's placeholder alone: the reftable directory is neither examined nor read (R-PDJA-33-SLICE-A-1 finding 3).
    expect(r.opened).toEqual(['HEAD']);
    expect(r.examined.filter(p => p.startsWith('reftable'))).toEqual([]);
    expect(s.reads.log.calls).toEqual([]);
    expect(s.terminal.prompts).toEqual([]);
  });

  it('a SHA-256 clone is not refused for its object format; a 40-digit --revision abbreviates at its 64-digit width', async () => {
    const dir = path.join(path.dirname(fullClone(makeUpstream({ 'x': 'x\n' }).dir, URL_RR)), 'up256');
    gitIn(path.dirname(dir), 'init', '-q', '--object-format=sha256', '-b', 'main', dir);
    writeFiles(dir, { 'a.c': 'x\n' });
    gitIn(dir, 'add', '-A');
    gitIn(dir, 'commit', '-q', '-m', 'upstream');
    const commit = gitIn(dir, 'rev-parse', 'HEAD');
    expect(commit).toHaveLength(64);
    const clone = fullClone(dir, URL_RR);
    const s = setup([], { isTTY: false, request: { revision: commit.slice(0, 40) } });
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'terminal', copy: { state: 'removed' } } });
    // A copy-class run: the pinned commit is read once pinned, the copy is checked, then its tree is read; nothing of the operator's clone.
    expect(s.reads.log.calls).toEqual([`commitHead ${commit}`, `inventory ${commit}`, `listTree ${commit}`]);
    expect(s.reads.log.dirs.every(d => d.includes(`${path.sep}copies${path.sep}copy-`))).toBe(true);
  });

  it('the width comes from the configuration, not from HEAD: an unborn HEAD in a SHA-256 clone still abbreviates at 64 digits', async () => {
    const dir = path.join(path.dirname(fullClone(makeUpstream({ 'x': 'x\n' }).dir, URL_RR)), 'up256');
    gitIn(path.dirname(dir), 'init', '-q', '--object-format=sha256', '-b', 'main', dir);
    writeFiles(dir, { 'a.c': 'x\n' });
    gitIn(dir, 'add', '-A');
    gitIn(dir, 'commit', '-q', '-m', 'upstream');
    const commit = gitIn(dir, 'rev-parse', 'HEAD');
    const clone = fullClone(dir, URL_RR);
    gitIn(clone, 'checkout', '-q', '--orphan', 'unborn');
    const out = await run(clone, setup([], { isTTY: false, request: { revision: commit.slice(0, 12) } }));
    // Named at 64 digits: a copy-class run, never refused for the operator's HEAD, reaches the question's terminal check.
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'terminal', missing: [`an observation consent for repository:redis-redis at ${commit}`, expect.any(String)] } });
  });
});

describe('REQ-polaris-generation-047: the copy step of a copy-class run', () => {
  const R12 = (c: string) => c.slice(0, 12);
  const consentAnswers = (c: string) => ['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${R12(c)}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${R12(c)}`];
  /** The real git, with every call's arguments and Git environment recorded: an independent capture of the copy's processes. */
  function capturingGit(): { readonly run: CopyGitRun; readonly calls: { args: readonly string[]; git: Record<string, string> }[] } {
    const calls: { args: readonly string[]; git: Record<string, string> }[] = [];
    return {
      calls,
      run: (args, o) => {
        calls.push({ args, git: Object.fromEntries(Object.entries(o.env).filter(([k]) => k.startsWith('GIT_'))) });
        const r = spawnSync('git', args, { cwd: o.cwd, env: o.env, encoding: 'utf8' });
        return { status: r.status ?? -1, stderr: r.stderr ?? '' };
      },
    };
  }
  const copyOf = (out: LaunchOutcome) => (out.kind === 'covered' || out.kind === 'recorded' ? out.copy : null);
  const COPY_OPTIONS = ['-c', 'core.hooksPath=/dev/null', '-c', 'core.attributesFile=/dev/null', '-c', 'user.name=Syzygy', '-c', 'user.email=syzygy@invalid', '-c', 'maintenance.auto=false'];

  it('HEAD elsewhere, on a branch with uncommitted changes: a copy at the trunk tip, the operator\'s checkout unchanged and absent from it', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' }, [{ 'b.c': 'y\n' }]);
    const clone = fullClone(up.dir, URL_RR);
    gitIn(clone, 'checkout', '-q', '-b', 'topic', up.commits[0]!);
    fs.writeFileSync(path.join(clone, 'a.c'), 'uncommitted\n');
    const before = listing(clone);
    const git = capturingGit();
    // The same API-independent oracle as the closed list's: only the listed files are readable before the copy step, and every
    // in-process read of the clone's .git is logged, for the whole run.
    const listed = ['HEAD', 'config', 'packed-refs', 'refs/heads/main', 'refs/heads/topic', 'refs/remotes/origin/HEAD'];
    const r = await sealedReads(clone, listed, copyGit => setup(consentAnswers(up.commits[1]!), { ports: { copyGit } }), git.run);
    const { out, s } = r;
    expect(out).toMatchObject({ kind: 'recorded', pin: { commit: up.commits[1] } });
    expect(r.opened).toEqual(listed);
    expect(r.examined.some(p => p.startsWith('objects/') && p !== 'objects/info/alternates')).toBe(false);
    const copy = copyOf(out)!;
    expect(fs.readFileSync(path.join(copy.gitDir, 'HEAD'), 'utf8')).toBe(`${up.commits[1]}\n`);
    expect(fs.readFileSync(path.join(copy.dir, 'a.c'), 'utf8')).toBe('x\n');
    expect(fs.readFileSync(path.join(copy.dir, 'b.c'), 'utf8')).toBe('y\n');
    expect(listing(clone)).toEqual(before);
    // Three processes, in the stated environment, fetching the one identifier from the operator's clone over the file transport.
    expect(git.calls.map(c => c.args)).toEqual([
      [...COPY_OPTIONS, 'init', '-q', '--template=', '--object-format=sha1', copy.dir],
      [...COPY_OPTIONS, '-C', copy.dir, 'fetch', '-q', '--depth=1', '--no-tags', '--no-recurse-submodules', `file://${clone}`, up.commits[1]],
      [...COPY_OPTIONS, '-C', copy.dir, 'checkout', '-q', '--detach', up.commits[1]],
    ]);
    for (const c of git.calls) expect(c.git).toEqual({ GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_ALLOW_PROTOCOL: 'file', GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0', GIT_ATTR_NOSYSTEM: '1' });
    // Syzygy itself reads no object of the operator's clone: every object read is of the copy, and no type test is made.
    expect(s.reads.log.dirs.every(d => d === copy.gitDir)).toBe(true);
    expect(s.reads.log.calls).toEqual([`commitHead ${up.commits[1]}`, `inventory ${up.commits[1]}`, `listTree ${up.commits[1]}`]);
  });

  it('no Git variable of the operator\'s environment reaches the copy\'s processes', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const git = capturingGit();
    const saved = { GIT_CONFIG_PARAMETERS: process.env['GIT_CONFIG_PARAMETERS'], GIT_DIR: process.env['GIT_DIR'] };
    process.env['GIT_CONFIG_PARAMETERS'] = "'core.hookspath'='/nonexistent'";
    process.env['GIT_DIR'] = '/nonexistent';
    try {
      expect((await run(clone, setup(consentAnswers(up.commits[0]!), { ports: { copyGit: git.run } }))).kind).toBe('recorded');
    } finally {
      for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    for (const c of git.calls) expect(Object.keys(c.git).sort()).toEqual(['GIT_ALLOW_PROTOCOL', 'GIT_ATTR_NOSYSTEM', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM', 'GIT_NO_LAZY_FETCH', 'GIT_TERMINAL_PROMPT']);
  });

  it('the operator\'s global attributes and identity do not reach the copy: its files are the pinned blobs, its reflog names Syzygy (R-PDJA-33-SLICE-B-1 findings 4 and 5)', async () => {
    const up = makeUpstream({ 'a.c': 'x $Id$\n' });
    const clone = fullClone(up.dir, URL_RR);
    const xdg = tempDir('syzygy-launch-xdg-');
    fs.mkdirSync(path.join(xdg, 'git'));
    fs.writeFileSync(path.join(xdg, 'git', 'attributes'), '* text eol=crlf ident\n');
    const saved = { XDG_CONFIG_HOME: process.env['XDG_CONFIG_HOME'] };
    process.env['XDG_CONFIG_HOME'] = xdg;
    let out: LaunchOutcome;
    try { out = await run(clone, setup(consentAnswers(up.commits[0]!))); } finally {
      for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    const copy = copyOf(out)!;
    expect(fs.readFileSync(path.join(copy.dir, 'a.c'), 'utf8')).toBe('x $Id$\n');
    expect(fs.readFileSync(path.join(copy.gitDir, 'logs', 'HEAD'), 'utf8')).toMatch(/^[0-9a-f]{40} [0-9a-f]{40} Syzygy <syzygy@invalid> \d+ [+-]\d{4}\t/);
  });

  it('an existing full clone with history, tags, stash and reflogs: the copy holds one commit and what its tree reaches', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' }, [{ 'b.c': 'y\n' }, { 'c.c': 'z\n' }]);
    gitIn(up.dir, 'tag', '-a', 'old', '-m', 'old', up.commits[0]!);
    const clone = fullClone(up.dir, URL_RR);
    fs.writeFileSync(path.join(clone, 'a.c'), 'stashed\n');
    gitIn(clone, 'stash', '-q');
    const out = await run(clone, setup(consentAnswers(up.commits[2]!)));
    const copy = copyOf(out)!;
    const objects = gitIn(copy.dir, 'cat-file', '--batch-all-objects', '--batch-check=%(objecttype)').split('\n').sort();
    expect(objects).toEqual(['blob', 'blob', 'blob', 'commit', 'tree']);
    expect(gitIn(copy.dir, 'for-each-ref')).toBe('');
    expect(fs.readFileSync(path.join(copy.gitDir, 'shallow'), 'utf8')).toBe(`${up.commits[2]}\n`);
  });

  it('a configuration and hooks of the operator\'s clone naming commands: the copy is made and none of them runs', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const marks = tempDir('syzygy-launch-marks-');
    gitIn(clone, 'config', 'core.fsmonitor', `touch ${marks}/fsmonitor`);
    gitIn(clone, 'config', 'uploadpack.packObjectsHook', `touch ${marks}/packobjects`);
    for (const hook of ['post-checkout', 'pre-auto-gc', 'reference-transaction', 'post-index-change']) {
      fs.writeFileSync(path.join(clone, '.git', 'hooks', hook), `#!/bin/sh\ntouch ${marks}/${hook}\n`, { mode: 0o755 });
    }
    expect((await run(clone, setup(consentAnswers(up.commits[0]!)))).kind).toBe('recorded');
    expect(fs.readdirSync(marks)).toEqual([]);
  });

  it('a SHA-256 clone is copied as a SHA-256 repository', async () => {
    const parent = tempDir('syzygy-launch-up256-'), dir = path.join(parent, 'up');
    gitIn(parent, 'init', '-q', '--object-format=sha256', '-b', 'main', dir);
    writeFiles(dir, { 'a.c': 'x\n' });
    gitIn(dir, 'add', '-A');
    gitIn(dir, 'commit', '-q', '-m', 'upstream');
    const commit = gitIn(dir, 'rev-parse', 'HEAD');
    const out = await run(fullClone(dir, URL_RR), setup(consentAnswers(commit)));
    const copy = copyOf(out)!;
    expect(gitIn(copy.dir, 'rev-parse', '--show-object-format')).toBe('sha256');
    expect(gitIn(copy.dir, 'rev-parse', 'HEAD')).toBe(commit);
  });

  it('the question states the copy statements before any answer, and the launch output states every stage reached (REQ-polaris-generation-046 line 11; 047)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const s = setup(consentAnswers(up.commits[0]!));
    const out = await run(clone, s);
    if (out.kind !== 'recorded') throw new Error(JSON.stringify(out));
    const copy = copyOf(out)!;
    const printed = s.terminal.printed.join('\n');
    for (const line of [
      'The run\'s clone is a copy of the pinned commit alone, which Syzygy made from the operator\'s clone with Git over the local file transport and no network request. To make it, Git read the operator\'s clone\'s configuration, references and object store, the stored bytes of delta bases outside the pinned commit\'s objects included. Syzygy used nothing Git read but the copy it produced, and itself read of the operator\'s clone only the references, remote names and URLs and other files REQ-polaris-generation-047 lists.',
      'The authoring and inventory sessions are directed, by their briefs, to work in the copy, while the operator\'s clone stays on the host; that a session stayed in the copy is its own report.',
      `The copy, its checked-out files included, was made at ${copy.dir} before your answer, and Syzygy has read none of its blobs. It is removed if the run ends before its brief, or named with the removal's failure where its removal fails, and is otherwise kept after the run, at a location the launch output names, until the operator removes it.`,
    ]) expect(printed.split('\n')).toContain(line);
    // Stated before the first answer is asked for.
    expect(s.terminal.prompts[0]).toBe('Is the repository public? Type "public", "not public", or press Enter to give no declaration: ');
    expect(out.statements.map(x => [x.id, x.reached])).toEqual([['named-identifier', true], ['copy', true], ['copy-location', true], ['copy-reliance', true], ['pinned-commit', true], ['question', true]]);
    expect(out.output.split('\n').slice(0, 6)).toEqual(out.statements.map(x => x.text));
    expect(out.statements.find(x => x.id === 'copy-location')?.text).toBe(`The copy of the pinned commit at ${copy.dir} is the run's clone; it is kept after the run, outside the run's state directory, until the operator removes it.`);
    // The record's scope is version 1.2's: held in the copy (046, line 21).
    expect(recordsOf(s.home).find(r => r.record.recordClass === 'observation-consent')?.record.observationScope).toBe('copy');
  });

  it('a local branch of the remote default\'s name elsewhere: the output states both identifiers and that a local commit is not the trunk default (047)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' }, [{ 'b.c': 'y\n' }]);
    const clone = fullClone(up.dir, URL_RR);
    gitIn(clone, 'checkout', '-q', '--detach', up.commits[1]!);
    gitIn(clone, 'branch', '-f', 'main', up.commits[0]!);
    const out = await run(clone, setup(consentAnswers(up.commits[1]!)));
    if (out.kind !== 'recorded') throw new Error(JSON.stringify(out));
    expect(out.statements.find(x => x.id === 'local-not-trunk')?.text).toBe(`The local branch refs/heads/main points to ${up.commits[0]}, not to the trunk default ${up.commits[1]}: a local commit is not the trunk default, and no local branch is consulted while a remote default is recorded.`);
    expect(out.output).toContain('a local commit is not the trunk default');
  });

  it('a run resting on a launch observation consent version 1.1 recorded: the copy goes beyond its "no fetch by Syzygy" wording (047)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    // The first launch writes its observation consent with the scope version 1.1 recorded.
    const asV11: typeof writeLaunchRecords = (home, input) => writeLaunchRecords(home, { ...input, records: input.records.map(r => {
      const parsed = parseLaunchRecord(r.text);
      if (!parsed.ok || parsed.record.recordClass !== 'observation-consent') return r;
      return { recordId: r.recordId, text: renderLaunchRecord({ ...parsed.record, observationScope: 'operator-clone' }) };
    }) });
    const first = setup(consentAnswers(up.commits[0]!), { ports: { writeStore: asV11 } });
    expect((await run(clone, first)).kind).toBe('recorded');
    expect(recordsOf(first.home).find(r => r.record.recordClass === 'observation-consent')?.record.observationScope).toBe('operator-clone');
    const out = await run(clone, setup([], { home: first.home }));
    if (out.kind !== 'covered') throw new Error(JSON.stringify(out));
    expect(out.statements.find(x => x.id === 'copy-beyond-consent')?.text).toBe('The copy goes beyond the launch observation consent\'s "no fetch by Syzygy" wording: that consent records its scope in the operator\'s own clone, and Syzygy fetched the pinned commit from that clone into the copy over the local file transport. The consent is otherwise relied on as it was recorded.');
    // A run resting on a version 1.2 record states none.
    const fresh = setup(consentAnswers(up.commits[0]!));
    await run(clone, fresh);
    const again = await run(clone, setup([], { home: fresh.home }));
    expect(again.kind === 'covered' && again.statements.some(x => x.id === 'copy-beyond-consent')).toBe(false);
  }, 20_000);   // three launches, each with its copy step: past the 5 s default under a loaded full run

  it('a failed fetch: the refusal states that a fetch was started and failed, as Git reported, and that the copy was removed', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const failingFetch: CopyGitRun = (args, o) => args.includes('fetch') ? { status: 128, stderr: 'fatal: fixture fetch failure\n' } : (() => { const r = spawnSync('git', args, { cwd: o.cwd, env: o.env, encoding: 'utf8' }); return { status: r.status ?? -1, stderr: r.stderr ?? '' }; })();
    const out = await run(clone, setup([], { ports: { copyGit: failingFetch } }));
    if (out.kind !== 'refused') throw new Error(JSON.stringify(out));
    expect(out.refusal.statements.filter(x => x.stage === 'copy step started').map(x => x.text)).toEqual([
      'The copy step used the method a copy is made by: a local fetch of the named identifier alone from the operator\'s clone over Git\'s local file transport, with no network request. A fetch was started and failed, as Git reported: fatal: fixture fetch failure. The copy had not passed its form check.',
      `The copy at ${out.refusal.copy?.location} was removed, its directory included.`,
      'For every Git process the copy step started, Syzygy relies on Git starting no program that the operator\'s clone\'s own configuration or hooks name while it serves the copy.',
    ]);
    expect(out.refusal.statements.find(x => x.id === 'pinned-commit')?.text).toBe('The commit was not pinned, and its committer date is Unknown.');
  });

  it('a copy step that throws before the fetch, in it and after it: Git read nothing; a fetch was started and failed; the step ended after the fetch', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const real: CopyGitRun = (args, o) => { const r = spawnSync('git', args, { cwd: o.cwd, env: o.env, encoding: 'utf8' }); return { status: r.status ?? -1, stderr: r.stderr ?? '' }; };
    const throwing = (on: string): CopyGitRun => (args, o) => { if (args.includes(on)) throw new Error('fixture failure'); return real(args, o); };
    const atInit = await run(clone, setup([], { ports: { copyGit: throwing('init') } }));
    if (atInit.kind !== 'refused') throw new Error(JSON.stringify(atInit));
    expect(atInit.refusal.statements.find(x => x.id === 'copy')?.text).toBe(`The copy step started at ${atInit.refusal.copy?.location} and ended there, before Syzygy started the fetch process: Git read nothing of the operator's clone.`);
    const atCheckout = await run(clone, setup([], { ports: { copyGit: throwing('checkout') } }));
    if (atCheckout.kind !== 'refused') throw new Error(JSON.stringify(atCheckout));
    expect(atCheckout.refusal.statements.find(x => x.id === 'copy')?.text).toBe('The copy step used the method a copy is made by: a local fetch of the named identifier alone from the operator\'s clone over Git\'s local file transport, with no network request. It ended after the fetch, where it failed: the copy step failed after its directory was made (Error: fixture failure); the copy had not passed its form check.');
    const atFetch = await run(clone, setup([], { ports: { copyGit: throwing('fetch') } }));
    if (atFetch.kind !== 'refused') throw new Error(JSON.stringify(atFetch));
    expect(atFetch.refusal.statements.find(x => x.id === 'copy')?.text).toBe('The copy step used the method a copy is made by: a local fetch of the named identifier alone from the operator\'s clone over Git\'s local file transport, with no network request. A fetch was started and failed, as Git reported: the copy step failed after its directory was made (Error: fixture failure). The copy had not passed its form check.');
  });

  it('a repeat run at a launch-consented HEAD: a copy-class run that asks nothing', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const first = setup(consentAnswers(up.commits[0]!));
    expect((await run(clone, first)).kind).toBe('recorded');
    const second = setup([], { home: first.home });
    const out = await run(clone, second);
    expect(out).toMatchObject({ kind: 'covered', pin: { commit: up.commits[0] } });
    expect(copyOf(out)).not.toBeNull();
    expect(second.terminal.prompts).toEqual([]);
  });

  it('an annotated tag named by --revision: refused as not a commit, never followed, read by Syzygy not at all, and the copy removed', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    gitIn(up.dir, 'tag', '-a', 'v1', '-m', 'a tag message');
    const clone = fullClone(up.dir, URL_RR);
    const tag = gitIn(clone, 'rev-parse', 'v1');
    const s = setup([], { request: { revision: 'v1' } });
    const out = await run(clone, s);
    expect(out).toEqual({ kind: 'refused', refusal: { stage: 'revision', missing: [], recorded: false, statements: expect.any(Array),
      reason: `--revision v1 names ${tag}, which is not a commit: the copy's detached checkout did not leave the copy's HEAD at it; Syzygy does not follow it`,
      copy: { state: 'removed', location: expect.any(String) }, copyStatement: expect.stringMatching(/ was removed, its directory included\.$/) } });
    if (out.kind === 'refused') expect(fs.existsSync(out.refusal.copy!.location)).toBe(false);
    expect(s.reads.log.calls).toEqual([]);
    expect(out.kind === 'refused' && out.refusal.reason.includes(up.commits[0]!)).toBe(false);   // the commit the tag names is never stated
    // Never pinned: the copy statement names the named identifier, never a pinned commit (R-PDJA-33-SLICE-D-1 finding 1).
    const statements = out.kind === 'refused' ? out.refusal.statements : [];
    expect(statements.find(x => x.id === 'copy')?.text).toBe('The copy step used the method a copy is made by: a local fetch of the named identifier alone from the operator\'s clone over Git\'s local file transport, with no network request. It ended at the copy\'s detached checkout, which did not leave the copy\'s HEAD at the named identifier; the copy had not passed its form check.');
    expect(statements.find(x => x.id === 'pinned-commit')?.text).toBe('The commit was not pinned, and its committer date is Unknown.');
  });

  it('a blob named by --revision: the checkout fails, refused as not shown to be a commit, never as not a commit; the copy removed', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const blob = gitIn(clone, 'rev-parse', 'HEAD:a.c');
    const s = setup([], { request: { revision: blob } });
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'revision', copy: { state: 'removed' } } });
    const reason = out.kind === 'refused' ? out.refusal.reason : '';
    expect(reason.startsWith(`the copy's detached checkout of ${blob} (--revision ${blob}) failed (exit 128): `)).toBe(true);
    expect(reason.endsWith('; the object was not shown to be a commit: it is either not a commit or a commit that could not be checked out')).toBe(true);
    expect(s.reads.log.calls).toEqual([]);
    const statements = out.kind === 'refused' ? out.refusal.statements : [];
    expect(statements.find(x => x.id === 'copy')?.text).toBe('The copy step used the method a copy is made by: a local fetch of the named identifier alone from the operator\'s clone over Git\'s local file transport, with no network request. It ended at the copy\'s detached checkout, which failed; the copy had not passed its form check.');
    expect(statements.some(x => x.text.includes('pinned commit'))).toBe(false);
  });

  it('a partial clone missing an object: the fetch fails, refused with Git\'s report, nothing fetched elsewhere, the copy removed', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    gitIn(up.dir, 'config', 'uploadpack.allowFilter', 'true');
    const parent = tempDir('syzygy-launch-partial-'), clone = path.join(parent, 'clone');
    gitIn(parent, 'clone', '-q', '--filter=blob:none', '--no-checkout', `file://${up.dir}`, clone);
    gitIn(clone, 'remote', 'set-url', 'origin', URL_RR);
    const git = capturingGit();
    const out = await run(clone, setup([], { ports: { copyGit: git.run } }));
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'copy', copy: { state: 'removed' } } });
    expect(out.kind === 'refused' && out.refusal.reason.startsWith('git fetch for the copy failed (exit 128): ')).toBe(true);
    const after = (args: readonly string[]) => args.slice(COPY_OPTIONS.length);
    expect(git.calls.map(c => after(c.args)[0] === '-C' ? after(c.args)[2] : after(c.args)[0])).toEqual(['init', 'fetch']);
  });

  it('a clone with an alternate: refused before the copy step starts, and no copy was made', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    fs.writeFileSync(path.join(clone, '.git', 'objects', 'info', 'alternates'), `${path.join(up.dir, '.git', 'objects')}\n`);
    const s = setup([]);
    expect(await run(clone, s)).toEqual({ kind: 'refused', refusal: { stage: 'clone', missing: [], recorded: false,
      reason: 'the operator\'s clone has an objects/info/alternates file, and a copy-class run refuses a clone with an alternate before its copy step starts',
      copy: null, copyStatement: 'No copy was made.',
      statements: [
        expect.objectContaining({ id: 'named-identifier', reached: true }),
        { id: 'copy', stage: 'copy step started', runClass: 'copy-class', reached: false, label: 'Inferred', text: 'No copy was made: the copy step did not start.' },
        { id: 'pinned-commit', stage: 'commit pinned', runClass: 'both', reached: false, label: 'Inferred', text: 'The commit was not pinned, and its committer date is Unknown.' },
        { id: 'question', stage: 'question asked', runClass: 'both', reached: false, label: 'Inferred', text: 'No question was asked.' },
      ] } });
    expect(fs.existsSync(s.ports.copyRoot!)).toBe(false);
    expect(s.reads.log.calls).toEqual([]);
  });

  it('a copy root inside the operator\'s clone, or the governance home\'s working tree or a linked worktree: refused before the copy step', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const home = makeHome();
    const linked = path.join(tempDir('syzygy-launch-linked-'), 'wt');
    gitIn(home, 'worktree', 'add', '-q', '--detach', linked);
    for (const [root, what] of [[path.join(clone, 'state', 'copies'), 'the operator\'s clone\'s working tree'], [path.join(home, 'state', 'copies'), 'the governance home\'s working tree'],
      [path.join(linked, 'copies'), 'a linked worktree of the governance home\'s repository']] as const) {
      const s = setup([], { home, ports: { copyRoot: root } });
      const out = await run(clone, s);
      expect(out, what).toMatchObject({ kind: 'refused', refusal: { stage: 'copy', copy: null, copyStatement: 'No copy was made.' } });
      expect(out.kind === 'refused' && out.refusal.reason.includes(`inside ${what}`), what).toBe(true);
      expect(fs.existsSync(root), what).toBe(false);
    }
  });

  it('a copy that departs from the clone form after its checkout (an extra ref, an extra object): refused, the copy removed', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const after = (extra: (dir: string) => void): CopyGitRun => {
      const git = capturingGit();
      return (args, o) => {
        const r = git.run(args, o);
        if (r.status === 0 && args.includes('checkout')) extra(args[COPY_OPTIONS.length + 1]!);
        return r;
      };
    };
    for (const [what, extra, why] of [
      ['an extra ref', (dir: string) => gitIn(dir, 'update-ref', 'refs/heads/extra', up.commits[0]!), 'refs/heads/extra is a ref or not a directory, and the clone may hold no ref but HEAD'],
      ['an extra object', (dir: string) => { execFileSync('git', ['-C', dir, 'hash-object', '-w', '--stdin'], { input: 'extra\n' }); }, 'the object store names 1 object(s) that are neither '],
    ] as const) {
      const out = await run(clone, setup([], { ports: { copyGit: after(extra) } }));
      expect(out, what).toMatchObject({ kind: 'refused', refusal: { stage: 'copy', copy: { state: 'removed' } } });
      if (out.kind !== 'refused') continue;
      expect(out.refusal.reason.startsWith('the copy departs from the form one commit fetched alone and checked out detached leaves: '), what).toBe(true);
      expect(out.refusal.reason, what).toContain(why);
      if (what === 'an extra object') expect(out.refusal.reason).toContain('nor under its tree (first: 0f2287157f7cb0dd40498c7a92f74b6975fa2d57)');
      expect(fs.existsSync(out.refusal.copy!.location), what).toBe(false);
      // The copy's checkout pinned the commit before the form or store check failed: its committer date is read from the copy's commit object
      // and stated (R-PDJA-33-SLICE-D-1 finding 3).
      expect(out.refusal.statements.find(x => x.id === 'pinned-commit'), what).toEqual({ id: 'pinned-commit', stage: 'commit pinned', runClass: 'both', reached: true, label: 'Inferred',
        text: `The pinned revision is ${up.commits[0]}; its committer date, as the commit object records it, is 1790812800 +0000.` });
    }
  });

  it('a copy whose commit object cannot be read once pinned, and whose form check then fails: that read is the one stated (R-PDJA-33-SLICE-D-1 finding 2)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const refusing = (o: PinnedObjectReaderOptions): PinnedObjectReader => ({ ...openPinnedObjectReader(o), commitHead: async () => { throw new GitObjectReadRefusal('corrupt-object', 'fixture refusal'); } });
    const git = capturingGit();
    const extraRef: CopyGitRun = (args, o) => { const r = git.run(args, o); if (r.status === 0 && args.includes('checkout')) gitIn(args[COPY_OPTIONS.length + 1]!, 'update-ref', 'refs/heads/extra', up.commits[0]!); return r; };
    const formed = await run(fullClone(up.dir, URL_RR), setup([], { ports: { openReader: refusing, copyGit: extraRef } }));
    expect(formed).toMatchObject({ kind: 'refused', refusal: { stage: 'copy' } });
    if (formed.kind !== 'refused') return;
    expect(formed.refusal.statements.find(x => x.id === 'pinned-commit')?.text)
      .toBe(`The pinned revision is ${up.commits[0]}: the copy's detached checkout left the copy's HEAD there. Its committer date is Unknown: Syzygy could not read the copy's commit object (fixture refusal).`);
  });

  it('a port that throws after the copy step started: refused, the copy removed and the removal said (R-PDJA-33-SLICE-B-1 finding 2)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const s = setup([], { ports: { terminal: { isTTY: true, name: '/dev/pts/9', print: () => {}, ask: async () => { throw new Error('fixture terminal failure'); } } } });
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'failure', reason: 'the launch failed after its copy step started: Error: fixture terminal failure', recorded: false,
      copy: { state: 'removed' }, copyStatement: expect.stringMatching(/^The copy at \S+\/copies\/copy-[A-Za-z0-9]{6} was removed, its directory included\.$/) } });
    if (out.kind !== 'refused' || out.refusal.copy == null) return;
    expect(fs.existsSync(out.refusal.copy.location)).toBe(false);
  });

  it('no answer at the question (an interrupt or the end of input): refused, the copy removed', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const s = setup([null]);
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { recorded: false, copy: { state: 'removed' } } });
    if (out.kind !== 'refused' || out.refusal.copy == null) return;
    expect(fs.existsSync(out.refusal.copy.location)).toBe(false);
  });

  it('a Git process for the copy that throws: the copy\'s directory is still returned, removed and said', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const s = setup([], { ports: { copyGit: () => { throw new Error('fixture spawn failure'); } } });
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'copy', reason: 'the copy step failed after its directory was made (Error: fixture spawn failure)', copy: { state: 'removed' } } });
    if (out.kind !== 'refused' || out.refusal.copy == null) return;
    expect(fs.existsSync(out.refusal.copy.location)).toBe(false);
  });

  it('a removal that fails: the copy is named as not removed, with its location and the failure, and kept', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const s = setup([], { isTTY: false, ports: { removeCopy: () => { throw Object.assign(new Error('fixture refusal'), { code: 'EACCES' }); } } });
    const out = await run(clone, s);
    expect(out).toMatchObject({ kind: 'refused', refusal: { stage: 'terminal', copy: { state: 'not-removed', failure: 'EACCES: fixture refusal' } } });
    if (out.kind !== 'refused' || out.refusal.copy?.state !== 'not-removed') return;
    expect(out.refusal.copyStatement).toBe(`The copy at ${out.refusal.copy.location} was not removed (EACCES: fixture refusal); it is kept until the operator removes it.`);
    expect(fs.existsSync(out.refusal.copy.location)).toBe(true);
  });
});

describe('REQ-polaris-generation-047: init runs a copy-class run on its copy, removing it when the run ends before its brief', () => {
  const CONFIG = JSON.stringify({
    operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'claude-opus-5-5',
    deadline: 'PT2H', agentTurnBudget: 200, maxRepairCycles: 2, maxQuestions: 3, audience: 'a new contributor', operatorIsOwner: true,
  });
  const initWith = (clone: string, answers: readonly (string | null)[], over: { sources?: ReturnType<typeof noOtherActs>; home?: string; ports?: Partial<LaunchPorts>; isTTY?: boolean } = {}) => {
    const s = setup(answers, { ...(over.home === undefined ? {} : { home: over.home }), ...(over.ports === undefined ? {} : { ports: over.ports }), ...(over.isTTY === undefined ? {} : { isTTY: over.isTTY }) });
    const stateRoot = path.join(tempDir('syzygy-launch-init-'), 'runs');
    const { sources: _sources, now: _now, openReader: _open, copyRoot: _root, ...launch } = s.ports;
    return { s, stateRoot, result: initRun({ clone, configText: CONFIG, stateRoot }, { sources: over.sources ?? noOtherActs(), now: () => NOW, openReader: s.reads.open, launch }) };
  };

  it('a completed init keeps the copy outside the run directory, names it, and records it as the run\'s clone', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' }, [{ 'b.c': 'y\n' }]);
    const clone = fullClone(up.dir, URL_RR);
    gitIn(clone, 'checkout', '-q', '--detach', up.commits[0]!);
    const r12 = up.commits[1]!.slice(0, 12);
    const { s, stateRoot, result } = initWith(clone, ['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`]);
    const out = await result;
    if (!out.ok) throw new Error(JSON.stringify(out.refusal));
    const copyDir = out.report.subject.clone.path;
    expect(path.dirname(copyDir)).toBe(path.join(fs.realpathSync(stateRoot), 'copies'));
    expect(path.basename(copyDir)).toMatch(/^copy-[A-Za-z0-9]{6}$/);
    // The layout init writes is the one the brief's fail-closed test reads: the run's clone lies under the state root's copy directory, so a
    // brief decides the run is copy-class whatever launch.json says, and refuses once launch.json is gone (R-PDJA-33-SLICE-D-1 finding 7).
    expect(cloneUnderCopies(out.report.run, copyDir)).toBe(true);
    expect(cloneUnderCopies(out.report.run, clone)).toBe(false);
    fs.rmSync(path.join(out.report.run, 'launch.json'));
    expect(briefCopyOf(readLaunchDisclosure(out.report.run), { dir: out.report.run, clone: copyDir, pinnedAt: '2026-01-01T00:00:00.000Z' })).toMatchObject({ ok: false });
    expect(out.report.subject.pinnedRevision.commit).toBe(up.commits[1]);
    expect(out.report.disclosures).toContain(`The copy of the pinned commit at ${copyDir} is the run's clone; it is kept after the run, outside the run's state directory, until the operator removes it.`);
    expect(fs.existsSync(path.join(copyDir, 'b.c'))).toBe(true);
    expect(s.reads.log.dirs.every(d => d === path.join(copyDir, '.git'))).toBe(true);
  });

  it('a repository on another host completes: the GitHub-only refusal is retired, and the run record carries the normalised URL', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, 'git@git.example.org:team/sub/tool.git');
    const r12 = up.commits[0]!.slice(0, 12);
    const { result } = initWith(clone, ['public', 'none', `CONSENT TO OBSERVE repository:sub-tool AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:sub-tool AT ${r12}`]);
    const out = await result;
    if (!out.ok) throw new Error(JSON.stringify(out.refusal));
    expect(out.report.subject.repository).toEqual({ url: 'git.example.org/team/sub/tool', repositoryId: 'sub-tool' });
    // The run record's launch disclosure of a run that recorded its consents at launch (046, line 37).
    const disclosure = JSON.parse(fs.readFileSync(path.join(out.report.run, 'launch.json'), 'utf8')) as { consents: { recorded: string[]; commit: string | null }; subject: Record<string, unknown> };
    expect(disclosure.subject).toEqual({ identity: 'repository:sub-tool', url: 'git.example.org/team/sub/tool', source: 'the clone\'s remote origin', proposedBy: 'derived', publicDeclaration: 'public' });
    expect(disclosure.consents.recorded.map(id => id.replace(/[0-9a-f]{12}-20261109T120000Z-[0-9a-f]{8}$/, '…'))).toEqual(['LAUNCH-OBSERVATION-…', 'LAUNCH-DRAWER-…']);
    expect(disclosure.consents.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(out.report.disclosures).toContain('The operator\'s declaration whether the repository is public: public [Inferred].');
  });

  it('a SHA-256 copy passes init\'s form check with the object-format setting its initialisation wrote', async () => {
    const parent = tempDir('syzygy-launch-init256-'), dir = path.join(parent, 'up');
    gitIn(parent, 'init', '-q', '--object-format=sha256', '-b', 'main', dir);
    writeFiles(dir, { 'a.c': 'x\n' });
    gitIn(dir, 'add', '-A');
    gitIn(dir, 'commit', '-q', '-m', 'upstream');
    const commit = gitIn(dir, 'rev-parse', 'HEAD');
    const r12 = commit.slice(0, 12);
    const { result } = initWith(fullClone(dir, URL_RR), ['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`]);
    const out = await result;
    if (!out.ok) throw new Error(JSON.stringify(out.refusal));
    expect(out.report.subject.pinnedRevision.commit).toBe(commit);
    expect(gitIn(out.report.subject.clone.path, 'rev-parse', '--show-object-format')).toBe('sha256');
  });

  it('init prints the user-information statement on every path: a recorded run, a covered run that asks nothing, and a refusal (R-PDJA-33-SLICE-D-1 finding 6)', async () => {
    const said = 'The URL of the clone\'s remote origin carried user information; Syzygy removed it before deriving anything and does not print, store or record it.';
    const up = makeUpstream({ 'a.c': 'x\n' });
    const commit = up.commits[0]!, r12 = commit.slice(0, 12);
    const home = makeHome();
    const sources = () => withLaunchRecords(noOtherActs(), { home, now: () => NOW });
    const withUser = 'https://bob:hunter2@github.com/redis/redis';
    const recorded = await initWith(fullClone(up.dir, withUser), ['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`], { home, sources: sources() }).result;
    if (!recorded.ok) throw new Error(JSON.stringify(recorded.refusal));
    expect(recorded.report.disclosures).toContain(said);
    // Covered: the launch asks nothing, and so prints nothing on the terminal; init's output still says it.
    const covered = initWith(fullClone(up.dir, withUser), [], { home, sources: sources() });
    const out = await covered.result;
    if (!out.ok) throw new Error(JSON.stringify(out.refusal));
    expect(covered.s.terminal.prompts).toEqual([]);
    expect(out.report.disclosures).toContain(said);
    expect(JSON.stringify(out).includes('hunter2')).toBe(false);
    // A refusal after the URL reading: no terminal to ask at.
    const refused = await initWith(fullClone(makeUpstream({ 'b.c': 'y\n' }).dir, 'https://bob:hunter2@git.example.org/a/b.git'), [], { isTTY: false }).result;
    expect(refused).toMatchObject({ ok: false, refusal: { stage: 'launch' } });
    if (refused.ok) return;
    expect(refused.refusal.disclosures).toContain(said);
    expect(JSON.stringify(refused).includes('hunter2')).toBe(false);
  }, 20_000);

  it('a repeat init --url at a HEAD only a launch consent names runs on a copy, with sources wrapped as the CLI wraps them (R-PDJA-33-SLICE-B-1 finding 1)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const commit = up.commits[0]!, r12 = commit.slice(0, 12);
    const home = makeHome();
    // As cli.ts wires them: the other acts' sources with the launch records added.
    const cliSources = () => withLaunchRecords(noOtherActs(), { home, now: () => NOW });
    const first = await initWith(fullClone(up.dir, URL_RR), ['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`], { home, sources: cliSources() }).result;
    if (!first.ok) throw new Error(JSON.stringify(first.refusal));
    // The operator's own clone in the one-commit form (the v1.1-era fetch form), at the launch-consented commit.
    const parent = tempDir('syzygy-launch-repeat-'), clone = path.join(parent, 'one');
    gitIn(parent, 'init', '-q', '--template=', clone);
    gitIn(clone, 'remote', 'add', 'origin', URL_RR);
    gitIn(clone, 'fetch', '-q', '--depth=1', '--no-tags', `file://${up.dir}`, commit);
    gitIn(clone, 'checkout', '-q', '--detach', 'FETCH_HEAD');
    const s = setup([], { home });
    const stateRoot = path.join(tempDir('syzygy-launch-init-'), 'runs');
    const { sources: _sources, now: _now, openReader: _open, copyRoot: _root, ...launch } = s.ports;
    const again = await initRun({ clone, url: 'https://github.com/redis/redis', configText: CONFIG, stateRoot }, { sources: cliSources(), now: () => NOW, openReader: s.reads.open, launch });
    if (!again.ok) throw new Error(JSON.stringify(again.refusal));
    const copyDir = again.report.subject.clone.path;
    expect(path.dirname(copyDir)).toBe(path.join(fs.realpathSync(stateRoot), 'copies'));
    expect(copyDir).not.toBe(fs.realpathSync(clone));
    expect(s.terminal.prompts).toEqual([]);
    expect(fs.readdirSync(path.join(stateRoot, 'copies'))).toEqual([path.basename(copyDir)]);
    expect(s.reads.log.dirs.length).toBeGreaterThan(0);
    // The launch's records are named as launch records, once each: none satisfies the launch's "another act" lookups.
    expect(again.report.disclosures.filter(d => d.includes('the run rests on'))).toEqual([expect.stringMatching(
      /^No consent was recorded at launch: the run rests on launch consent records already in force: launch observation consent LAUNCH-OBSERVATION-[0-9a-f]{12}-20261109T120000Z-[0-9a-f]{8} \([0-9a-f]{40}\); drawer statement LAUNCH-DRAWER-[0-9a-f]{12}-20261109T120000Z-[0-9a-f]{8}\.$/)]);
    expect(s.reads.log.dirs.every(d => d === path.join(copyDir, '.git'))).toBe(true);
    // The run record's launch disclosure (046, line 37): a launched copy-class run that recorded nothing, its copy and the operator's clone.
    const disclosure = JSON.parse(fs.readFileSync(path.join(again.report.run, 'launch.json'), 'utf8')) as Record<string, unknown> & { statements: { id: string; reached: boolean }[] };
    expect({ ...disclosure, consents: { ...(disclosure['consents'] as object), relied: 'checked above' }, statements: disclosure.statements.map(x => [x.id, x.reached]) }).toEqual({
      format: 'polaris-dossier-launch-disclosure/1', runClass: 'copy-class', launched: true, operatorClone: fs.realpathSync(clone), copy: copyDir,
      consents: { recorded: [], commit: null, relied: 'checked above' },
      subject: { identity: 'repository:redis-redis', url: 'github.com/redis/redis', source: 'the clone\'s remote origin', proposedBy: 'matching-records', publicDeclaration: 'public' },
      drawer: expect.stringMatching(/^LAUNCH-DRAWER-[0-9a-f]{12}-20261109T120000Z-[0-9a-f]{8}$/),
      statements: [['named-identifier', true], ['copy', true], ['copy-location', true], ['copy-reliance', true], ['pinned-commit', true], ['question', false], ['briefs', false]],
      label: 'Inferred',
    });
  });

  it('a port that throws after the launch made the copy: init refuses, removes the copy and says so (R-PDJA-33-SLICE-B-1 finding 2)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const r12 = up.commits[0]!.slice(0, 12);
    const base = noOtherActs();
    const throwing = { ...base, consentedRevisionsFor: async () => { throw new Error('fixture records failure'); } };
    const { stateRoot, result } = initWith(clone, ['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`], { sources: throwing });
    const out = await result;
    expect(out).toMatchObject({ ok: false, refusal: { stage: 'failure', reason: expect.stringMatching(/^init failed after the launch made the copy: Error: fixture records failure; the launch's consent records stay recorded: LAUNCH-OBSERVATION-[0-9a-f]{12}-20261109T120000Z-[0-9a-f]{8}, LAUNCH-DRAWER-[0-9a-f]{12}-20261109T120000Z-[0-9a-f]{8}, in the recording commit [0-9a-f]{40}$/),
      copy: { state: 'removed' }, copyStatement: expect.stringMatching(/^The copy at \S+\/copies\/copy-[A-Za-z0-9]{6} was removed, its directory included\.$/) } });
    expect(fs.readdirSync(path.join(stateRoot, 'copies'))).toEqual([]);
  });

  it('an interrupt from the copy step to the outcome removes the copy and says so: during the copy step, and after the records are written (R-PDJA-33-SLICE-C-1 finding 3)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const r12 = up.commits[0]!.slice(0, 12);
    const answers = ['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${r12}`];
    const real: CopyGitRun = (args, o) => { const r = spawnSync('git', args, { cwd: o.cwd, env: o.env, encoding: 'utf8' }); return { status: r.status ?? -1, stderr: r.stderr ?? '' }; };
    // During the copy step: Ctrl-C while the fetch runs.
    const duringCopy = new EventEmitter();
    const atFetch: CopyGitRun = (args, o) => { if (args.includes('fetch')) duringCopy.emit('SIGINT'); return real(args, o); };
    const copying = initWith(fullClone(up.dir, URL_RR), answers, { ports: { copyGit: atFetch, interrupt: interruptWatch(duringCopy) } });
    expect(await copying.result).toMatchObject({ ok: false, refusal: { stage: 'launch', launch: { stage: 'failure', reason: 'the launch failed after its copy step started: Interrupted: the run was interrupted (SIGINT)', recorded: false, copy: { state: 'removed' } } } });
    expect(fs.readdirSync(path.join(copying.stateRoot, 'copies'))).toEqual([]);
    expect(copying.s.terminal.prompts).toEqual([]);
    expect(duringCopy.listenerCount('SIGINT')).toBe(0);
    // After the records are written: init refuses before it writes the run directory, and names the records that stay.
    const afterWrite = new EventEmitter();
    const writeStore: typeof writeLaunchRecords = (home, input) => { afterWrite.emit('SIGINT'); return writeLaunchRecords(home, input); };
    const writing = initWith(fullClone(up.dir, URL_RR), answers, { ports: { writeStore, interrupt: interruptWatch(afterWrite) } });
    const out = await writing.result;
    expect(out).toMatchObject({ ok: false, refusal: { stage: 'failure', copy: { state: 'removed' } } });
    if (out.ok) return;
    expect(out.refusal.reason).toMatch(/^init failed after the launch made the copy: Interrupted: the run was interrupted \(SIGINT\); the launch's consent records stay recorded: LAUNCH-OBSERVATION-[0-9a-f]{12}-20261109T120000Z-[0-9a-f]{8}, LAUNCH-DRAWER-[0-9a-f]{12}-20261109T120000Z-[0-9a-f]{8}, in the recording commit [0-9a-f]{40}$/);
    expect(fs.readdirSync(path.join(writing.stateRoot, 'copies'))).toEqual([]);
    expect(fs.readdirSync(writing.stateRoot)).toEqual(['copies']);
    expect(afterWrite.listenerCount('SIGINT')).toBe(0);
  });

  it('the launch\'s own checks: after the copy step, before the question and before the write, each ends the launch at the failure path', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const real: CopyGitRun = (args, o) => { const r = spawnSync('git', args, { cwd: o.cwd, env: o.env, encoding: 'utf8' }); return { status: r.status ?? -1, stderr: r.stderr ?? '' }; };
    const FAILURE = 'the launch failed after its copy step started: Interrupted: the run was interrupted (SIGINT)';
    const consentAnswers = (c: string) => ['public', 'none', `CONSENT TO OBSERVE repository:redis-redis AT ${c.slice(0, 12)}`, `STATE NO KERNEL EVIDENCE DRAWER FOR repository:redis-redis AT ${c.slice(0, 12)}`];
    // After the copy step, in a run that asks nothing: the launch refuses there, not later.
    const clone = fullClone(up.dir, URL_RR);
    const first = setup(consentAnswers(up.commits[0]!));
    expect((await run(clone, first)).kind).toBe('recorded');
    const atCopy = new EventEmitter();
    const covered = await run(clone, setup([], { home: first.home, ports: { interrupt: interruptWatch(atCopy), copyGit: (args, o) => { if (args.includes('fetch')) atCopy.emit('SIGINT'); return real(args, o); } } }));
    expect(covered).toMatchObject({ kind: 'refused', refusal: { stage: 'failure', reason: FAILURE, copy: { state: 'removed' } } });
    // During the pre-answer reads: nothing is asked.
    const atReads = new EventEmitter();
    const reads = setup(consentAnswers(up.commits[0]!), { ports: { interrupt: interruptWatch(atReads), writeConsent: async () => { atReads.emit('SIGINT'); return { state: 'ok', record: 'WRITE-CONSENT-LAUNCH-RECORDS-2026-11-08' }; } } });
    expect(await run(fullClone(up.dir, URL_RR), reads)).toMatchObject({ kind: 'refused', refusal: { stage: 'failure', reason: FAILURE, copy: { state: 'removed' } } });
    expect(reads.terminal.prompts).toEqual([]);
    // At the last answer: nothing is written.
    const atAnswer = new EventEmitter();
    const answering = setup(consentAnswers(up.commits[0]!), { ports: { interrupt: interruptWatch(atAnswer) } });
    const ask = answering.ports.terminal.ask;
    const ports: LaunchPorts = { ...answering.ports, terminal: { ...answering.ports.terminal, ask: async prompt => { if (prompt.startsWith('Type exactly: STATE')) atAnswer.emit('SIGINT'); return ask(prompt); } } };
    expect(await launchConsent(answering.request(fullClone(up.dir, URL_RR)), ports)).toMatchObject({ kind: 'refused', refusal: { stage: 'failure', reason: FAILURE, recorded: false, copy: { state: 'removed' } } });
    expect(recordsOf(answering.home)).toEqual([]);
  });

  it('the interrupt watch: armed once, a SIGINT is held until a check, and disarming removes its listener', () => {
    const signals = new EventEmitter(), watch = interruptWatch(signals);
    watch.check();
    watch.arm(); watch.arm();
    expect(signals.listenerCount('SIGINT')).toBe(1);
    watch.check();
    signals.emit('SIGINT');
    expect(() => watch.check()).toThrow('the run was interrupted (SIGINT)');
    watch.disarm();
    expect(signals.listenerCount('SIGINT')).toBe(0);
  });

  it('objectsRead is decided from the reads: a copy-stage refusal reads none, a refusal after the pre-answer reads read some (R-PDJA-33-SLICE-B-1 finding 6)', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' });
    const failingInit: CopyGitRun = () => ({ status: 128, stderr: 'fatal: fixture init failure' });
    const atCopy = await initWith(fullClone(up.dir, URL_RR), [], { ports: { copyGit: failingInit } }).result;
    expect(atCopy).toMatchObject({ ok: false, refusal: { stage: 'launch', launch: { stage: 'copy', reason: 'git init for the copy failed (exit 128): fatal: fixture init failure' }, objectsRead: false } });
    const atTerminal = await initWith(fullClone(up.dir, URL_RR), [], { isTTY: false }).result;
    expect(atTerminal).toMatchObject({ ok: false, refusal: { stage: 'launch', launch: { stage: 'terminal' }, objectsRead: true } });
  });

  it('a refusal after the launch removes the copy and says so', async () => {
    const up = makeUpstream({ 'openspec/x.md': '# x\n' });
    const clone = fullClone(up.dir, URL_RR);
    const r12 = up.commits[0]!.slice(0, 12);
    // A governed subject whose statement is declined: the launch records the observation consent, and init then refuses for the statement.
    const { stateRoot, result } = initWith(clone, ['public', 'exists', `CONSENT TO OBSERVE repository:redis-redis AT ${r12}`, '']);
    const out = await result;
    expect(out).toMatchObject({ ok: false, refusal: { stage: 'statement', copy: { state: 'removed' } } });
    expect(fs.readdirSync(path.join(stateRoot, 'copies'))).toEqual([]);
  });
});


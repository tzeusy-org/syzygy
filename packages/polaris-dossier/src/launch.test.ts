import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { launchConsent, type LaunchOutcome, type LaunchPorts, type LaunchRequest } from './launch.js';
import { LAUNCH_REF, readLaunchRecords } from './launch-store.js';
import { NON_PUBLIC_SUCCESSOR } from './launch-cli.js';
import { fixtureClasses, fullClone, gitIn, listing, makeHome, makeUpstream, noOtherActs, scriptedTerminal, writeFiles, type ScriptedTerminal } from './launch.testkit.js';

/** REQ-polaris-generation-046 and 047, conformance by scenario and falsifier arm, against fixture governance homes and clones made by
 * `git` outside the code under test. Object reads are captured by a read-logging wrapper around the object reader: it records each call
 * and its revision, and the oracle asserts no `readBlobs` call. References, HEAD, index and working trees are compared by an independent
 * listing before and after. Expected phrases, identities, record sets and refusals are literals. */

const NOW = Date.parse('2026-11-09T12:00:00Z');
const URL_RR = 'https://github.com/redis/redis.git';

interface Captured { readonly calls: string[] }
function readLog(): { readonly open: (o: PinnedObjectReaderOptions) => PinnedObjectReader; readonly log: Captured } {
  const log: Captured = { calls: [] };
  return {
    log,
    open: o => {
      const r = openPinnedObjectReader(o);
      const wrap = <K extends keyof PinnedObjectReader>(k: K) => ((...args: unknown[]) => { log.calls.push(`${String(k)} ${o.revision}`); return (r[k] as (...a: unknown[]) => unknown)(...args); }) as PinnedObjectReader[K];
      return { revision: r.revision, algorithm: r.algorithm, tree: wrap('tree'), readBlobs: wrap('readBlobs'), listTree: wrap('listTree'), inventory: wrap('inventory'), commitHead: wrap('commitHead') };
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

  it('not declared public while no policy admits non-public sources: refused before any record, naming the successor', async () => {
    const { clone } = plain();
    for (const declaration of ['not public', '']) {
      const s = setup([declaration]);
      const out = await run(clone, s);
      expect(out).toEqual({ kind: 'refused', refusal: { stage: 'not-public', recorded: false, missing: expect.any(Array),
        reason: `the operator did not declare the repository public, and no effective policy admits non-public sources: ${NON_PUBLIC_SUCCESSOR} is missing; nothing was recorded` } });
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
  it('HEAD elsewhere: refused before asking, the clone unchanged, the checkout command printed', async () => {
    const up = makeUpstream({ 'a.c': 'x\n' }, [{ 'b.c': 'y\n' }]);
    const clone = fullClone(up.dir, URL_RR);
    gitIn(clone, 'checkout', '-q', '--detach', up.commits[0]!);
    const before = listing(clone);
    const s = setup([]);
    expect(await run(clone, s)).toEqual({ kind: 'refused', refusal: { stage: 'head', missing: [], recorded: false,
      reason: `the clone's HEAD is ${up.commits[0]}, not the pinned revision ${up.commits[1]} (refs/remotes/origin/HEAD -> refs/remotes/origin/main); Syzygy does not change the checkout`,
      command: `git -C '${clone}' checkout --detach ${up.commits[1]}` } });
    expect(listing(clone)).toEqual(before);
    expect(s.reads.log.calls.filter(c => !c.startsWith('tree '))).toEqual([]);   // only the pinned commit object, re-hashed, before the refusal
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

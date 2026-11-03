import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DECISIONS_DIR, LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM, readDigestBoundActState, type DigestBoundActForm } from '@syzygy/polaris-generation-consent';
import { HEAD_FIELD_ALTERATION, PROSE_ALTERATIONS, recorderRecordPaths, renderDossierLocalAgentAct, renderLocalAgentSignoff, renderProviderV2Act, type DossierLocalAgentActKey } from '@syzygy/polaris-generation-consent/testing';
import { describe, expect, it } from 'vitest';
import { preflight } from './preflight.js';
import { D9_ACT_FORM, DRAWER_FORMS, PROVIDER_V2_FORM, RFC7_20_RULING_ACT_FORM, STATEMENT_FORMS, createPackageGateSources, providerStatementGate } from './gate-sources.js';
import { tempDir } from '@syzygy/test-kit';

// syzygy-qkea.21: the gate sources read the local-agent sitting's acts (scripts/record_dossier_local_agent_acts.py) and the
// version-tagged sign-off of the local-agent registry entry (scripts/record_versioned_signoff.py). Act text comes from the real
// recorders over the real sitting records; expected values are literals, never imported from the module under test.

const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const DATE = '2026-10-07';
const INSTANT = '2026-10-07T09:30:00Z';
const AT = Date.UTC(2026, 9, 7, 9, 30, 0);
const INSTANCES = '.syzygy/governance/contracts/candidates/dossier-local-agent-acts/instances';
const SECURITY = '.syzygy/governance/doctrine/security.md';
const V1 = '.syzygy/governance/doctrine/v1.md';
const DIRECTION = `${DECISIONS_DIR}/POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-DIRECTION.md`;
const PROPOSED_ENTRY = '.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json';
const INSTALLED_ENTRY = '.syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json';
const SIGNOFF = `${DECISIONS_DIR}/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md`;

/** Each act: its record under the sitting's instances, and the dedicated decisions file the recorder writes for it. */
const ACTS: Record<DossierLocalAgentActKey, { readonly record: string; readonly file: string }> = {
  'redis-no-evidence-drawer': { record: `${INSTANCES}/redis/NO-EVIDENCE-DRAWER-STATEMENT.md`, file: `${DECISIONS_DIR}/DOSSIER-LOCAL-AGENT-REDIS-NO-EVIDENCE-DRAWER-ACT.md` },
  'redis-agent-anthropic': { record: `${INSTANCES}/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md`, file: `${DECISIONS_DIR}/DOSSIER-LOCAL-AGENT-REDIS-AGENT-ANTHROPIC-ACT.md` },
  'redis-agent-openai': { record: `${INSTANCES}/redis/AGENT-PROVIDER-STATEMENT-OPENAI.md`, file: `${DECISIONS_DIR}/DOSSIER-LOCAL-AGENT-REDIS-AGENT-OPENAI-ACT.md` },
  'd9-in-force': { record: `${INSTANCES}/in-force/D9-IN-FORCE-RECORD.md`, file: `${DECISIONS_DIR}/DOSSIER-LOCAL-AGENT-D9-IN-FORCE-ACT.md` },
  'rfc7-20-reading-in-force': { record: `${INSTANCES}/in-force/RFC7-20-READING-IN-FORCE-RECORD.md`, file: `${DECISIONS_DIR}/DOSSIER-LOCAL-AGENT-RFC7-20-READING-IN-FORCE-ACT.md` },
};
const KEYS = Object.keys(ACTS) as DossierLocalAgentActKey[];
/** Version 2 of the Anthropic statement (scripts/record_dossier_agent_provider_v2_act.py): its record and its act's decisions file. */
const V2_RECORD = '.syzygy/governance/contracts/candidates/dossier-agent-provider-v2/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md';
const V2_ACT = `${DECISIONS_DIR}/DOSSIER-AGENT-PROVIDER-V2-REDIS-ANTHROPIC-ACT.md`;
const V2_INSTANT = '2026-10-07T10:30:00Z';
const V2_AT = Date.UTC(2026, 9, 7, 10, 30, 0);
const real = (rel: string): string => fs.readFileSync(path.join(REAL_ROOT, rel), 'utf8');

const write = (root: string, rel: string, text: string): void => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};

/** A records root holding the real sitting records and the files they bind, with the named acts recorded at INSTANT, and (when
 * `signoff`) the local-agent entry installed and signed off v1.0. An unrelated decisions file keeps the directory present. */
function world(acts: readonly DossierLocalAgentActKey[], signoff = false, v2 = false): string {
  const root = tempDir('dossier-gate-acts-');
  for (const rel of [...KEYS.map(k => ACTS[k].record), SECURITY, V1, DIRECTION, V2_RECORD]) write(root, rel, real(rel));
  write(root, `${DECISIONS_DIR}/UNRELATED.md`, '# Unrelated\n');
  for (const key of acts) write(root, ACTS[key].file, renderDossierLocalAgentAct(key, sha(real(ACTS[key].record)), DATE, INSTANT));
  if (signoff) {
    write(root, INSTALLED_ENTRY, real(PROPOSED_ENTRY));
    write(root, SIGNOFF, renderLocalAgentSignoff(root, DATE, INSTANT));
  }
  if (v2) write(root, V2_ACT, v2Act());
  return root;
}
/** The version-2 act as its recorder renders it, superseding the version-1 act of DATE over the real version-1 record. */
const v2Act = (verdict = 'CONFIRM'): string =>
  renderProviderV2Act(sha(real(V2_RECORD)), DATE, V2_INSTANT, sha(real(ACTS['redis-agent-anthropic'].record)), DATE, verdict);
const sources = (root: string, now = NOW) => createPackageGateSources({ root, now: () => now });
const notEstablished = (what: string) => ({
  state: 'absent',
  why: `no owner-act record binds a digest of ${what}, so the act cross-check of RFC3-16(a) cannot establish it in force; a status word, a log row or a file's presence is not read as one`,
});
const D9_WHAT = 'the D9 text (SEC-3 amendment)';
const RFC720_WHAT = 'the RFC7-20 reading (POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05, item 1)';
const UNSTATED = { stated: false, why: 'no admitted project input record (REQ-polaris-generation-001) for this subject exists, so whether a kernel evidence drawer exists is not stated' };
/** These walk the whole real decisions tree, or eight worlds in turn: about 2-5 s unloaded, past vitest's 5 s default under load (0a08add9). */
const TREE_TIMEOUT = 60_000;
const CLASSES = ['governance-text', 'code-structure', 'code-content', 'evidence-content', 'derived-composites'];

describe('the sitting\'s acts as gate sources, with no act recorded', () => {
  it('establish nothing: D9 and the reading not established, the drawer unstated, no statement, no registry entry', async () => {
    const s = sources(world([]));
    expect(await s.d9()).toEqual(notEstablished(D9_WHAT));
    expect(await s.rfc720Ruling()).toEqual(notEstablished(RFC720_WHAT));
    expect(await s.projectInput.drawerFor('redis-redis')).toEqual(UNSTATED);
    expect(await s.providerStatements.statementsFor('redis-redis')).toEqual([]);
    expect(await s.registryEntry()).toEqual({ state: 'absent', why: `no owner-act record ${SIGNOFF} exists` });
  });
  it('follow this checkout\'s tree: each source absent while its act record is, and established once the sitting records it', async () => {
    await expectFollowsTree(REAL_ROOT, Date.now());
  }, TREE_TIMEOUT);
  it('follow the tree in either state: no records, every record, and each act alone', async () => {
    await expectFollowsTree(world([]), NOW);
    await expectFollowsTree(world(KEYS, true), NOW);
    for (const key of KEYS) await expectFollowsTree(world([key]), NOW);
    await expectFollowsTree(world([], true), NOW);
    await expectFollowsTree(world(KEYS, true, true), NOW);
    await expectFollowsTree(world([], false, true), NOW);
  }, TREE_TIMEOUT);
});

// P-106 (owner act of 2026-10-08): version 2 of the Redis statement for Claude Code with Anthropic supersedes version 1 from its own
// act's instant (RFC5-13), so the gate and preflight see exactly one statement for the pair (round-2 note 3 of the package review).
describe('version 2 of the Anthropic statement', () => {
  const V2_CLASSES = [...CLASSES, 'project-documentation'];
  it('replaces version 1 from its act\'s instant, one statement for the pair, the OpenAI statement untouched', async () => {
    const root = world(KEYS, true, true);
    const statements = await sources(root).providerStatements.statementsFor('redis-redis');
    expect(statements).toEqual([
      { recordId: 'AGENT-PROVIDER-redis-redis-anthropic', version: '0.2.0-candidate.1', digest: sha(real(V2_RECORD)), agentTool: 'claude-code', provider: 'anthropic', contentClasses: V2_CLASSES, withdrawn: false, act: { identity: 'AGENT-PROVIDER-V2-REDIS-ANTHROPIC-2026-10-07', inForceAt: V2_AT } },
      { recordId: 'AGENT-PROVIDER-redis-redis-openai', version: '0.1.0-candidate.1', digest: sha(real(ACTS['redis-agent-openai'].record)), agentTool: 'codex', provider: 'openai', contentClasses: CLASSES, withdrawn: false, act: { identity: 'AGENT-PROVIDER-REDIS-OPENAI-2026-10-07', inForceAt: AT } },
    ]);
    expect(providerStatementGate(statements, 'claude-code', 'anthropic', NOW)).toEqual({ state: 'ok', record: 'AGENT-PROVIDER-redis-redis-anthropic@0.2.0-candidate.1' });
  });
  it('leaves version 1 alone in force before version 2\'s instant', async () => {
    const statements = await sources(world(KEYS, true, true), V2_AT - 1).providerStatements.statementsFor('redis-redis');
    expect(statements.map(r => `${r.recordId}@${r.version}`)).toEqual(['AGENT-PROVIDER-redis-redis-anthropic@0.1.0-candidate.1', 'AGENT-PROVIDER-redis-redis-openai@0.1.0-candidate.1']);
    expect(providerStatementGate(statements, 'claude-code', 'anthropic', V2_AT - 1)).toEqual({ state: 'ok', record: 'AGENT-PROVIDER-redis-redis-anthropic@0.1.0-candidate.1' });
  });
  it('is what preflight lists in force, before and after its instant, agreeing with the gate', async () => {
    const root = world(KEYS, true, true);
    for (const [now, version] of [[NOW, '0.2.0-candidate.1'], [V2_AT - 1, '0.1.0-candidate.1']] as const) {
      const s = { ...sources(root, now), repositoryIdsFor: async () => ['redis-redis'], consentedRevisionsFor: async () => [] };
      const result = await preflight('https://github.com/redis/redis', s, now);
      expect(result.ok).toBe(true);
      const inForce = result.ok ? result.report.providerStatements.inForce : [];
      expect(inForce.map(r => r.record)).toEqual([`AGENT-PROVIDER-redis-redis-anthropic@${version}`, 'AGENT-PROVIDER-redis-redis-openai@0.1.0-candidate.1']);
      expect(providerStatementGate(await s.providerStatements.statementsFor('redis-redis'), 'claude-code', 'anthropic', now)).toEqual({ state: 'ok', record: inForce[0]!.record });
    }
  });
  it('closes no other gate: D9, the reading, the drawer and the registry sign-off stay established beside it', async () => {
    const s = sources(world(KEYS, true, true));
    expect([(await s.d9()).state, (await s.rfc720Ruling()).state, (await s.projectInput.drawerFor('redis-redis')).stated, (await s.registryEntry()).state]).toEqual(['ok', 'ok', true, 'ok']);
  });
  it.each([
    ['an appended line', (t: string) => `${t}\nWithdrawn.\n`],
    ['another supersession', (t: string) => t.replace('this act supersedes, prospectively', 'this act supersedes, retroactively')],
    ['another effect', (t: string) => t.replace('## Effect\n\n', '## Effect\n\nWidened. ')],
    ['a digest in the packet words', (t: string) => t.replace(/its words "[^"\n]+"/, `its words "${'a'.repeat(64)}"`)],
  ])('fails closed when its act record has %s: version 1 reads withdrawn and version 2 unbound, so the pair has no statement', async (_name, mutate) => {
    const root = world(KEYS, true, true);
    const mutated = mutate(v2Act());
    expect(mutated).not.toBe(v2Act());
    write(root, V2_ACT, mutated);
    const statements = await sources(root).providerStatements.statementsFor('redis-redis');
    // Version 1 is withdrawn either way: by the successor rule, or (once the record no longer renders) by its own sweep, which then
    // reads the record as a file naming it.
    expect(statements.filter(r => r.provider === 'anthropic').map(r => [r.withdrawn, r.version === 'unestablished' || r.act === null])).toEqual([[true, _name === 'a digest in the packet words' ? false : true], [false, true]]);
    expect(providerStatementGate(statements, 'claude-code', 'anthropic', NOW).state).toBe('absent');
    expect(providerStatementGate(statements, 'codex', 'openai', NOW).state).toBe('ok');
  });
  it('fails closed once its record changes after the act', async () => {
    const root = world(KEYS, true, true);
    fs.appendFileSync(path.join(root, V2_RECORD), ' ');
    const statements = await sources(root).providerStatements.statementsFor('redis-redis');
    expect(statements.filter(r => r.provider === 'anthropic').map(r => [r.withdrawn, r.act === null])).toEqual([[true, false], [false, true]]);
    expect(providerStatementGate(statements, 'claude-code', 'anthropic', NOW).state).toBe('absent');
  });
  it.each([
    ['its phrase label', 'Withdrawn: CONSENT TO ANTHROPIC AGENT PROVIDER VERSION 2 FOR REDIS'],
    ['its title', 'Withdrawn: agent-provider statement for redis/redis, version 2: Claude Code with Anthropic'],
    ['its act identity', 'The owner withdraws AGENT-PROVIDER-V2-REDIS-ANTHROPIC.'],
    ['its record\'s path', `Withdrawn: ${V2_RECORD}`],
  ])('is withdrawn by a decisions file naming it by %s, and version 1 does not come back', async (_name, withdrawal) => {
    const root = world(KEYS, true, true);
    write(root, `${DECISIONS_DIR}/WITHDRAW.md`, `${withdrawal}\n`);
    const statements = await sources(root).providerStatements.statementsFor('redis-redis');
    expect(statements.filter(r => r.provider === 'anthropic').map(r => r.withdrawn)).toEqual([true, true]);
    expect(providerStatementGate(statements, 'claude-code', 'anthropic', NOW).state).toBe('absent');
  });
  it('reads version 1\'s act record past only at its exact render, and version 1 reads version 2\'s the same way', async () => {
    // Version 1's record, edited, names version 2's artifact basename in a form neither reader defines: version 2 refuses, and so does
    // version 1 itself (its own record no longer renders).
    const root = world(KEYS, true, true);
    fs.appendFileSync(path.join(root, ACTS['redis-agent-anthropic'].file), '\nedit\n');
    const statements = await sources(root).providerStatements.statementsFor('redis-redis');
    expect(statements.filter(r => r.provider === 'anthropic').map(r => r.act === null)).toEqual([true, true]);
  });
  it('reads past version 1\'s exact render only at version 1\'s own file: a byte-identical copy elsewhere names version 2', async () => {
    const root = world(KEYS, true, true);
    write(root, `${DECISIONS_DIR}/COPY-OF-V1.md`, fs.readFileSync(path.join(root, ACTS['redis-agent-anthropic'].file), 'utf8'));
    const statements = await sources(root).providerStatements.statementsFor('redis-redis');
    expect(statements.filter(r => r.provider === 'anthropic').map(r => r.withdrawn)).toEqual([true, true]);
    expect(providerStatementGate(statements, 'claude-code', 'anthropic', NOW).state).toBe('absent');
  });
  it('is the form its recorder writes: the file it writes and the record byte for byte, CONFIRM and CONFIRM WITH EXCEPTIONS', () => {
    expect(`${DECISIONS_DIR}/${PROVIDER_V2_FORM.file}`).toBe(V2_ACT);
    expect(STATEMENT_FORMS['redis-redis']![0]!.successor).toBe(PROVIDER_V2_FORM);
    for (const verdict of ['CONFIRM', 'CONFIRM WITH EXCEPTIONS']) {
      const fields = { date: DATE, instant: V2_INSTANT, argument: sha(real(V2_RECORD)), opening: 'opening', label: 'label', description: 'description', quote: 'Sign the Redis Anthropic provider statement, version 2', frozen: 'f'.repeat(40), manifest: 'b'.repeat(64), verdict, reviewed: 'c'.repeat(40), superseded: sha(real(ACTS['redis-agent-anthropic'].record)), supersededDate: DATE };
      expect(PROVIDER_V2_FORM.template!.render(fields)).toBe(v2Act(verdict));
    }
  });
  it('sweeps its artifact by the artifact\'s own heading', () => {
    expect(PROVIDER_V2_FORM.stems).toContain(/^# (.+)$/m.exec(real(V2_RECORD))![1]!);
  });
});

/** The real-tree pin, per source: the expected state is decided by whether that source's act record exists under `root`, so the
 * commit that records the sitting needs no edit here, and a record that exists yet does not establish its source still fails. */
async function expectFollowsTree(root: string, now: number): Promise<void> {
  const has = (rel: string): boolean => fs.existsSync(path.join(root, rel));
  const s = sources(root, now);
  if (has(ACTS['d9-in-force'].file)) expect(await s.d9()).toEqual({ state: 'ok', record: expect.stringMatching(/^D9-IN-FORCE-OPERATOR-AGENT-\d{4}-\d{2}-\d{2}$/) });
  else expect(await s.d9()).toEqual(notEstablished(D9_WHAT));
  if (has(ACTS['rfc7-20-reading-in-force'].file)) expect(await s.rfc720Ruling()).toEqual({ state: 'ok', record: expect.stringMatching(/^RFC7-20-READING-IN-FORCE-OPERATOR-AGENT-\d{4}-\d{2}-\d{2}$/) });
  else expect(await s.rfc720Ruling()).toEqual(notEstablished(RFC720_WHAT));
  if (has(ACTS['redis-no-evidence-drawer'].file)) expect(await s.projectInput.drawerFor('redis-redis')).toEqual({ stated: true, drawer: 'absent', record: expect.stringMatching(/^NO-EVIDENCE-DRAWER-redis-redis@/) });
  else expect(await s.projectInput.drawerFor('redis-redis')).toEqual(UNSTATED);
  const statements = await s.providerStatements.statementsFor('redis-redis');
  // Version 2 of the Anthropic statement replaces version 1 one for one: either act recorded gives one Anthropic statement, at version 2
  // when its act is recorded (the trees here are read after its instant).
  const recorded = (['redis-agent-anthropic', 'redis-agent-openai'] as const).filter(key => has(ACTS[key].file) || (key === 'redis-agent-anthropic' && has(V2_ACT)));
  expect(statements.map(r => [r.recordId, r.withdrawn, r.act === null])).toEqual(recorded.map(key => [key === 'redis-agent-anthropic' ? 'AGENT-PROVIDER-redis-redis-anthropic' : 'AGENT-PROVIDER-redis-redis-openai', false, false]));
  const anthropic = statements.find(r => r.provider === 'anthropic');
  if (anthropic !== undefined) expect([anthropic.version, anthropic.contentClasses.includes('project-documentation')]).toEqual(has(V2_ACT) ? ['0.2.0-candidate.1', true] : ['0.1.0-candidate.1', false]);
  if (has(SIGNOFF)) expect(await s.registryEntry()).toEqual({ state: 'ok', record: 'public-git-source-acquisition-local-agent-v1.0' });
  else expect(await s.registryEntry()).toEqual({ state: 'absent', why: `no owner-act record ${SIGNOFF} exists` });
}

describe('the sitting\'s acts as gate sources, once recorded', () => {
  it('establish every source when every act is recorded, none hiding another', async () => {
    const s = sources(world(KEYS, true));
    expect(await s.d9()).toEqual({ state: 'ok', record: 'D9-IN-FORCE-OPERATOR-AGENT-2026-10-07' });
    expect(await s.rfc720Ruling()).toEqual({ state: 'ok', record: 'RFC7-20-READING-IN-FORCE-OPERATOR-AGENT-2026-10-07' });
    expect(await s.projectInput.drawerFor('redis-redis')).toEqual({ stated: true, drawer: 'absent', record: 'NO-EVIDENCE-DRAWER-redis-redis@0.1.0-candidate.1' });
    expect(await s.registryEntry()).toEqual({ state: 'ok', record: 'public-git-source-acquisition-local-agent-v1.0' });
    const statements = await s.providerStatements.statementsFor('redis-redis');
    expect(statements).toEqual([
      { recordId: 'AGENT-PROVIDER-redis-redis-anthropic', version: '0.1.0-candidate.1', digest: sha(real(ACTS['redis-agent-anthropic'].record)), agentTool: 'claude-code', provider: 'anthropic', contentClasses: CLASSES, withdrawn: false, act: { identity: 'AGENT-PROVIDER-REDIS-ANTHROPIC-2026-10-07', inForceAt: AT } },
      { recordId: 'AGENT-PROVIDER-redis-redis-openai', version: '0.1.0-candidate.1', digest: sha(real(ACTS['redis-agent-openai'].record)), agentTool: 'codex', provider: 'openai', contentClasses: CLASSES, withdrawn: false, act: { identity: 'AGENT-PROVIDER-REDIS-OPENAI-2026-10-07', inForceAt: AT } },
    ]);
    expect(providerStatementGate(statements, 'claude-code', 'anthropic', NOW)).toEqual({ state: 'ok', record: 'AGENT-PROVIDER-redis-redis-anthropic@0.1.0-candidate.1' });
    expect(providerStatementGate(statements, 'codex', 'openai', NOW)).toEqual({ state: 'ok', record: 'AGENT-PROVIDER-redis-redis-openai@0.1.0-candidate.1' });
  });
  it('consent to one tool with one provider: Codex with Anthropic, or Claude Code with OpenAI, finds no statement', async () => {
    const statements = await sources(world(KEYS)).providerStatements.statementsFor('redis-redis');
    expect(providerStatementGate(statements, 'codex', 'anthropic', NOW)).toEqual({ state: 'absent', why: 'no per-project statement names the operator\'s agent tool codex with the provider anthropic (AGENT-PROVIDER-redis-redis-anthropic@0.1.0-candidate.1 names claude-code with anthropic; AGENT-PROVIDER-redis-redis-openai@0.1.0-candidate.1 names codex with openai)' });
    expect(providerStatementGate(statements, 'claude-code', 'openai', NOW)).toEqual({ state: 'absent', why: 'no per-project statement names the operator\'s agent tool claude-code with the provider openai (AGENT-PROVIDER-redis-redis-anthropic@0.1.0-candidate.1 names claude-code with anthropic; AGENT-PROVIDER-redis-redis-openai@0.1.0-candidate.1 names codex with openai)' });
  });
  it('establish only what was recorded: one act alone leaves every other source as it was', async () => {
    const d9 = sources(world(['d9-in-force']));
    expect(await d9.d9()).toEqual({ state: 'ok', record: 'D9-IN-FORCE-OPERATOR-AGENT-2026-10-07' });
    expect(await d9.rfc720Ruling()).toEqual(notEstablished(RFC720_WHAT));
    expect(await d9.projectInput.drawerFor('redis-redis')).toEqual(UNSTATED);
    expect(await d9.providerStatements.statementsFor('redis-redis')).toEqual([]);
    const drawer = sources(world(['redis-no-evidence-drawer']));
    expect(await drawer.projectInput.drawerFor('redis-redis')).toEqual({ stated: true, drawer: 'absent', record: 'NO-EVIDENCE-DRAWER-redis-redis@0.1.0-candidate.1' });
    expect(await drawer.d9()).toEqual(notEstablished(D9_WHAT));
    const openai = await sources(world(['redis-agent-openai'])).providerStatements.statementsFor('redis-redis');
    expect(openai.map(r => r.recordId)).toEqual(['AGENT-PROVIDER-redis-redis-openai']);
    expect(providerStatementGate(openai, 'claude-code', 'anthropic', NOW)).toEqual({ state: 'absent', why: 'no per-project statement names the operator\'s agent tool claude-code with the provider anthropic' });
    expect((await sources(world(['rfc7-20-reading-in-force'])).rfc720Ruling()).state).toBe('ok');
  });
  it('state the drawer for redis-redis only', async () => {
    const s = sources(world(KEYS));
    expect(await s.projectInput.drawerFor('psf-requests')).toEqual(UNSTATED);
    expect(await s.providerStatements.statementsFor('psf-requests')).toEqual([]);
    expect(await s.projectInput.drawerFor('__proto__')).toEqual(UNSTATED);
  });
  it('establish nothing before the acts\' instant', async () => {
    const s = sources(world(KEYS, true), AT - 1);
    expect(await s.d9()).toEqual({ state: 'absent', why: 'the act D9-IN-FORCE-OPERATOR-AGENT-2026-10-07 is not in force yet' });
    expect(await s.projectInput.drawerFor('redis-redis')).toEqual({ stated: false, why: 'the project-input statement for this subject is not in force: the act NO-EVIDENCE-DRAWER-REDIS-2026-10-07 is not in force yet' });
    expect(await s.providerStatements.statementsFor('redis-redis')).toEqual([]);
    expect(await s.registryEntry()).toEqual({ state: 'absent', why: 'the sign-off public-git-source-acquisition-local-agent-v1.0 is not in force yet' });
  });
});

describe('the sitting\'s acts fail closed', () => {
  it('refuse D9 once either doctrine file it binds changes, though the record and its act are untouched', async () => {
    for (const file of [SECURITY, V1]) {
      const root = world(['d9-in-force']);
      fs.appendFileSync(path.join(root, file), '\nedit\n');
      expect(await sources(root).d9()).toEqual({ state: 'refused', why: `the bytes of ${file} differ from the digest the act's artifact binds` });
    }
  });
  it('refuse the reading once the direction file changes, and when it is missing', async () => {
    const root = world(['rfc7-20-reading-in-force']);
    fs.appendFileSync(path.join(root, DIRECTION), '\nedit\n');
    expect(await sources(root).rfc720Ruling()).toEqual({ state: 'refused', why: `the bytes of ${DIRECTION} differ from the digest the act's artifact binds` });
    fs.rmSync(path.join(root, DIRECTION));
    expect(await sources(root).rfc720Ruling()).toEqual({ state: 'refused', why: `the bound file ${DIRECTION} cannot be read` });
  });
  it('refuse an in-force record whose table binds other files than the form names, even when an act binds its bytes', async () => {
    const root = world([]);
    const record = real(ACTS['d9-in-force'].record).replace(/^\| `\.syzygy\/governance\/doctrine\/v1\.md` \|.*\n/m, '');
    write(root, ACTS['d9-in-force'].record, record);
    write(root, ACTS['d9-in-force'].file, renderDossierLocalAgentAct('d9-in-force', sha(record), DATE, INSTANT));
    expect(await sources(root).d9()).toEqual({ state: 'refused', why: `the act's artifact binds ${SECURITY}, not exactly ${SECURITY}, ${V1}` });
    const readme = '.syzygy/governance/doctrine/README.md';
    write(root, readme, real(readme));
    const other = real(ACTS['d9-in-force'].record).replace(/^\| `\.syzygy\/governance\/doctrine\/v1\.md` \| `[0-9a-f]{64}` \|$/m, `| \`${readme}\` | \`${sha(real(readme))}\` |`);
    write(root, ACTS['d9-in-force'].record, other);
    write(root, ACTS['d9-in-force'].file, renderDossierLocalAgentAct('d9-in-force', sha(other), DATE, INSTANT));
    expect(await sources(root).d9()).toEqual({ state: 'refused', why: `the act's artifact binds ${SECURITY}, ${readme}, not exactly ${SECURITY}, ${V1}` });
    const twice = `${record}\n| File | SHA-256 |\n|---|---|\n`;
    write(root, ACTS['d9-in-force'].record, twice);
    write(root, ACTS['d9-in-force'].file, renderDossierLocalAgentAct('d9-in-force', sha(twice), DATE, INSTANT));
    expect(await sources(root).d9()).toEqual({ state: 'refused', why: 'the act\'s artifact does not carry exactly one bound-files table' });
  });
  it('refuse every act whose record changed after it', async () => {
    const root = world(KEYS);
    for (const key of KEYS) fs.appendFileSync(path.join(root, ACTS[key].record), ' ');
    const s = sources(root);
    expect((await s.d9()).state).toBe('refused');
    expect((await s.rfc720Ruling()).state).toBe('refused');
    expect(await s.projectInput.drawerFor('redis-redis')).toEqual({ stated: false, why: `the project-input statement for this subject is not in force: the bytes of ${ACTS['redis-no-evidence-drawer'].record} differ from the act's argument` });
    const statements = await s.providerStatements.statementsFor('redis-redis');
    expect(statements.map(r => [r.recordId, r.act])).toEqual([['AGENT-PROVIDER-redis-redis-anthropic', null], ['AGENT-PROVIDER-redis-redis-openai', null]]);
    expect(providerStatementGate(statements, 'claude-code', 'anthropic', NOW)).toEqual({ state: 'absent', why: 'no per-project statement naming the agent tool claude-code with the provider anthropic is in force: AGENT-PROVIDER-redis-redis-anthropic@unestablished has no owner act binding its bytes' });
  });
  it('refuse an act another decisions file names: a withdrawal in a form the reader does not define', async () => {
    const root = world(KEYS, true);
    write(root, `${DECISIONS_DIR}/WITHDRAW.md`, 'The owner withdraws NO-EVIDENCE-DRAWER-REDIS and AGENT-PROVIDER-REDIS-OPENAI, D9-IN-FORCE-OPERATOR-AGENT, RFC7-20-READING-IN-FORCE-OPERATOR-AGENT and the public-git-source-acquisition-local-agent sign-off.\n');
    const s = sources(root);
    const named = `${DECISIONS_DIR}/WITHDRAW.md names the act without being its record: a withdrawal or a form this reader does not define`;
    expect(await s.d9()).toEqual({ state: 'refused', why: named });
    expect(await s.rfc720Ruling()).toEqual({ state: 'refused', why: named });
    expect(await s.projectInput.drawerFor('redis-redis')).toEqual({ stated: false, why: `the project-input statement for this subject is not in force: ${named}` });
    expect((await s.providerStatements.statementsFor('redis-redis')).map(r => [r.recordId, r.act === null, r.withdrawn])).toEqual([['AGENT-PROVIDER-redis-redis-anthropic', false, false], ['AGENT-PROVIDER-redis-redis-openai', true, true]]);
    expect(await s.registryEntry()).toEqual({ state: 'refused', why: named });
    fs.rmSync(path.join(root, DECISIONS_DIR, 'WITHDRAW.md'));
    expect((await s.registryEntry()).state).toBe('ok');
    write(root, `${DECISIONS_DIR}/WITHDRAW-ENTRY.md`, `Withdrawn: \`${INSTALLED_ENTRY}\`.\n`);
    expect(await s.registryEntry()).toEqual({ state: 'refused', why: `${DECISIONS_DIR}/WITHDRAW-ENTRY.md names the act without being its record: a withdrawal or a form this reader does not define` });
  });
  // R-POLARIS-DOSSIER-GATE-SOURCES-1 finding 1: a statement says it is withdrawn by "a later owner act naming this record".
  it.each([
    ['its Record ID', (id: string) => `The owner withdraws the agent-provider statement \`${id}\`.\n`],
    ['its Record ID, in another case and spelling', (id: string) => `Withdrawn: ${id.toUpperCase().replaceAll('-', '_')}\n`],
    ['its Subject', (_id: string, provider: string) => `Subject: \`(project:syzygy, repository:redis-redis, agent-provider:${provider})\` withdrawn.\n`],
    ['its Subject in prose', (_id: string, provider: string) => `The owner withdraws consent for (project:syzygy, repository:redis-redis, agent-provider:${provider}).\n`],
  ])('withdraw a statement another decisions file names by %s, and only that statement', async (_name, withdrawal) => {
    for (const [id, provider, tool, other] of [['AGENT-PROVIDER-redis-redis-anthropic', 'anthropic', 'claude-code', 'AGENT-PROVIDER-redis-redis-openai'], ['AGENT-PROVIDER-redis-redis-openai', 'openai', 'codex', 'AGENT-PROVIDER-redis-redis-anthropic']] as const) {
      const root = world(KEYS);
      write(root, `${DECISIONS_DIR}/WITHDRAW.md`, withdrawal(id, provider));
      const statements = await sources(root).providerStatements.statementsFor('redis-redis');
      expect(statements.filter(r => r.withdrawn).map(r => r.recordId)).toEqual([id]);
      expect(statements.find(r => r.recordId === other)!.act).not.toBeNull();
      expect(providerStatementGate(statements, tool, provider, NOW)).toEqual({ state: 'absent', why: `no per-project statement naming the agent tool ${tool} with the provider ${provider} is in force: ${id}@unestablished is withdrawn` });
    }
  });
  it('withdraw a statement the aggregate acceptance record names on a Record ID or Subject field line, though not in its prose', async () => {
    const root = world(KEYS);
    const aggregate = `${DECISIONS_DIR}/ACCEPTANCE-ACT-RECORD.md`;
    write(root, aggregate, '# Acceptance\n\n| Record | Act |\n|---|---|\n| `AGENT-PROVIDER-redis-redis-anthropic` | (project:syzygy, repository:redis-redis, agent-provider:openai) |\n');
    expect((await sources(root).providerStatements.statementsFor('redis-redis')).map(r => r.withdrawn)).toEqual([false, false]);
    write(root, aggregate, '# Acceptance\n\nRecord ID: `AGENT-PROVIDER-redis-redis-anthropic` withdrawn\n');
    expect((await sources(root).providerStatements.statementsFor('redis-redis')).map(r => r.withdrawn)).toEqual([true, false]);
    write(root, aggregate, '# Acceptance\n\n- **Subject**: `(project:syzygy, repository:redis-redis, agent-provider:openai)` withdrawn\n');
    expect((await sources(root).providerStatements.statementsFor('redis-redis')).map(r => r.withdrawn)).toEqual([false, true]);
  });
  // Finding 2: the sign-off's act identity is its tag; no register row is read past.
  it.each([
    ['its tag', 'The owner withdraws the sign-off tagged public-git-source-acquisition-local-agent-v1.0.\n'],
    ['its tag, in another case', 'Withdrawn: PUBLIC_GIT_SOURCE_ACQUISITION_LOCAL_AGENT_V1.0\n'],
    ['the package as signed off, spelled sign-off', 'The public-git-source-acquisition-local-agent sign-off is withdrawn.\n'],
    ['the package as signed off, spelled signoff', 'The public-git-source-acquisition-local-agent signoff is withdrawn.\n'],
  ])('refuse the registry sign-off another decisions file names by %s', async (_name, withdrawal) => {
    const root = world([], true);
    write(root, `${DECISIONS_DIR}/WITHDRAW.md`, withdrawal);
    expect(await sources(root).registryEntry()).toEqual({ state: 'refused', why: `${DECISIONS_DIR}/WITHDRAW.md names the act without being its record: a withdrawal or a form this reader does not define` });
  });
  // R-POLARIS-DOSSIER-GATE-SOURCES-2 finding 1, after P-104 resolved: no register row is read past. The resolved row is stem-free and
  // passes as any other line; a row that cites the sign-off's tag, the old open row's shape included, refuses like any other file's.
  it('read the resolved P-104 register row as any other line, and refuse a row that cites the sign-off\'s tag', async () => {
    const register = `${DECISIONS_DIR}/PENDING-OWNER-DECISIONS.md`;
    const rows = real(register).split('\n').filter(line => line.startsWith('| P-104 |'));
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.startsWith('| P-104 | [Observed] **Resolved ')).toBe(true);
    expect(row).not.toContain('public-git-source-acquisition-local-agent-v1.0');
    const root = world([], true);
    const named = { state: 'refused', why: `${register} names the act without being its record: a withdrawal or a form this reader does not define` };
    write(root, register, `# Register\n\n| ID | Question |\n|---|---|\n${row}\n`);
    expect((await sources(root).registryEntry()).state).toBe('ok');
    const open = '| P-104 | The local-agent Redis sitting: seven decisions, row 2 signs off the registry entry (tag public-git-source-acquisition-local-agent-v1.0) |';
    for (const extra of [open, '| P-105 | Withdraw public-git-source-acquisition-local-agent-v1.0 |']) {
      write(root, register, `# Register\n\n| ID | Question |\n|---|---|\n${extra}\n`);
      expect(await sources(root).registryEntry(), extra.slice(0, 40)).toEqual(named);
    }
    write(root, register, '# Register\n');
    write(root, `${DECISIONS_DIR}/DECISION-HISTORY.md`, `# History\n\n${open}\n`);
    expect(await sources(root).registryEntry()).toEqual({ state: 'refused', why: `${DECISIONS_DIR}/DECISION-HISTORY.md names the act without being its record: a withdrawal or a form this reader does not define` });
  });
  // Finding 2: a record counts only when it is byte for byte what its recorder renders from its own fields.
  it.each([
    ['its supersession line removed', (t: string) => t.replace(/^Supersession \/ revocation: .*\n.*\n\n/m, '')],
    ['another supersession', (t: string) => t.replace('supersedes nothing', 'supersedes the earlier act')],
    ['its phrase removed', (t: string) => t.replace(/```text\n.*\n```\n\n/, '')],
    ['a phrase whose argument is not the exact digest', (t: string) => t.replace(/^([A-Z0-9 -]+: )[0-9a-f]{64}$/m, `$1${'0'.repeat(64)}`)],
    ['another second provenance line', (t: string) => t.replace('explicitly selected by the owner\'s option selection recorded below', 'selected by an agent')],
    ['a second provenance state', (t: string) => t.replace(/^(A1 audit-record identity .*)$/m, 'Provenance state: `agent-asserted`\n\n$1')],
    ['another effect', (t: string) => t.replace('## Effect\n\n', '## Effect\n\nWidened. ')],
    ['"Withdrawn by this record." appended', (t: string) => `${t}\nWithdrawn by this record.\n`],
    ['a digest in the owner\'s selection', (t: string) => t.replace('| "label" |', `| "${'a'.repeat(64)}" |`)],
    ['a recording tag for another date', (t: string) => t.replace(/-signed-(\d{4}-\d{2}-\d{2})`/, '-signed-2026-01-01`')],
    // R-POLARIS-DOSSIER-GATE-SOURCES-3 note 3: the recorders refuse a blank selection; a line break of either kind is never one line.
    ['a blank selection label', (t: string) => t.replace('| "label" |', '| " " |')],
    ['a carriage return in the selection', (t: string) => t.replace('| "label" |', '| "la\rbel" |')],
  ])('refuse every sitting act whose record has %s', async (_name, mutate) => {
    const root = world(KEYS);
    for (const key of KEYS) {
      const text = fs.readFileSync(path.join(root, ACTS[key].file), 'utf8'), mutated = mutate(text);
      expect(mutated, key).not.toBe(text);
      write(root, ACTS[key].file, mutated);
    }
    const s = sources(root);
    expect((await s.d9()).state).toBe('refused');
    expect((await s.rfc720Ruling()).state).toBe('refused');
    expect((await s.projectInput.drawerFor('redis-redis')).stated).toBe(false);
    expect((await s.providerStatements.statementsFor('redis-redis')).map(r => r.act)).toEqual([null, null]);
  });
  it.each([
    ['no Owner selection line', (t: string) => t.replace(/^Owner selection: .*\n\n/m, '')],
    ['no Review line', (t: string) => t.replace(/^Review: .*\n\n/m, '')],
    ['no Reviewed commit line', (t: string) => t.replace(/^Reviewed commit: .*\n\n/m, '')],
    ['no Disposition line', (t: string) => t.replace(/^Disposition: .*\n\n/m, '')],
    ['no Scope A extension line', (t: string) => t.replace(/^Scope A extension: .*\n\n/m, '')],
    ['no "What this does not do" section', (t: string) => t.replace(/\n## What this does not do\n[\s\S]*$/, '\n')],
    ['its supersession line removed', (t: string) => t.replace(/^Supersession \/ revocation: .*\n.*\n\n/m, '')],
    ['another second provenance line', (t: string) => t.replace('the owner\'s option selection quoted above\n', 'an agent\'s selection\n')],
    ['"Withdrawn by this record." appended', (t: string) => `${t}\nWithdrawn by this record.\n`],
    ['a selection that does not name the Scope A extension', (t: string) => t.replace(/^Owner selection: .*$/m, 'Owner selection: Sign off v1.0')],
    ['a digest in the selection', (t: string) => t.replace(/^Owner selection: (.*)$/m, `Owner selection: $1 ${'a'.repeat(64)}`)],
    ['CONFIRM WITH EXCEPTIONS and no disposition record', (t: string) => t.replace(/^Review verdict: CONFIRM$/m, 'Review verdict: CONFIRM WITH EXCEPTIONS')],
    ['CONFIRM and a disposition record', (t: string) => t.replace(/^Disposition: none$/m, 'Disposition: pkg/ROUND-1-DISPOSITIONS.md')],
  ])('refuse the registry sign-off whose record has %s', async (_name, mutate) => {
    const root = world([], true);
    const text = fs.readFileSync(path.join(root, SIGNOFF), 'utf8'), mutated = mutate(text);
    expect(mutated).not.toBe(text);
    write(root, SIGNOFF, mutated);
    expect((await sources(root).registryEntry()).state).toBe('refused');
  });
  it('count a CONFIRM WITH EXCEPTIONS sign-off that names its disposition record', async () => {
    const root = world([], true);
    const text = fs.readFileSync(path.join(root, SIGNOFF), 'utf8');
    write(root, SIGNOFF, text.replace(/^Review verdict: CONFIRM$/m, 'Review verdict: CONFIRM WITH EXCEPTIONS').replace(/^Disposition: none$/m, 'Disposition: pkg/ROUND-1-DISPOSITIONS.md'));
    expect(await sources(root).registryEntry()).toEqual({ state: 'ok', record: 'public-git-source-acquisition-local-agent-v1.0' });
  });
  // Note 3: the other ways a decisions file names one of these records.
  it.each([
    ['the statement\'s governance-relative path', 'Withdrawn: contracts/candidates/dossier-local-agent-acts/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md', 'anthropic'],
    ['the statement\'s basename', 'Withdrawn: AGENT-PROVIDER-STATEMENT-ANTHROPIC.md', 'anthropic'],
    ['the statement act\'s phrase label', 'Withdrawn: CONSENT TO AGENT PROVIDER ANTHROPIC FOR REDIS-REDIS', 'anthropic'],
    ['the statement act\'s title', 'Withdrawn: agent-provider statement for redis/redis: Claude Code with Anthropic', 'anthropic'],
    ['the Subject spaced after its colons', 'Withdrawn: (project: syzygy, repository: redis-redis, agent-provider: anthropic)', 'anthropic'],
    ['the Subject with each part quoted', 'Withdrawn: (`project:syzygy`, `repository:redis-redis`, `agent-provider:anthropic`)', 'anthropic'],
    ['the D9 record\'s relative path', 'Withdrawn: in-force/D9-IN-FORCE-RECORD.md', 'd9'],
    ['the D9 act\'s phrase label', 'Withdrawn: BIND D9 TO EXACT BYTES FOR OPERATOR-AGENT RUNS', 'd9'],
    ['the reading record\'s basename', 'Withdrawn: RFC7-20-READING-IN-FORCE-RECORD.md', 'rfc720'],
    ['the drawer record\'s basename', 'Withdrawn: NO-EVIDENCE-DRAWER-STATEMENT.md', 'drawer'],
    ['the drawer\'s Subject on a field line', 'Subject: `(project:syzygy, repository:redis-redis)` drawer statement withdrawn', 'drawer'],
    ['the installed entry\'s basename', 'Withdrawn: POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json', 'registry'],
    ['the package as signed off at a version', 'The public-git-source-acquisition-local-agent entry, signed off at 1.0, is withdrawn.', 'registry'],
    ['the sign-off record\'s title', 'Withdrawn: Public Git source acquisition, local-agent version — version-tagged sign-off v1.0', 'registry'],
    // R-POLARIS-DOSSIER-GATE-SOURCES-3 note 2: each artifact's own heading.
    ['the D9 record\'s heading', 'Withdrawn: D9 for operator-agent runs — exact-bytes record', 'd9'],
    ['the reading record\'s heading', 'Withdrawn: the owner\'s RFC7-20 reading for operator-agent runs — exact-bytes record', 'rfc720'],
    ['the drawer record\'s heading', 'Withdrawn: No kernel evidence drawer — redis-redis', 'drawer'],
    ['the statement\'s heading', 'Withdrawn: Agent-provider statement — redis-redis to anthropic', 'anthropic'],
  ])('withdraw what a decisions file names by %s', async (_name, withdrawal, which) => {
    const root = world(KEYS, true);
    write(root, `${DECISIONS_DIR}/WITHDRAW.md`, `${withdrawal}\n`);
    const s = sources(root);
    const state = {
      d9: (await s.d9()).state, rfc720: (await s.rfc720Ruling()).state, drawer: (await s.projectInput.drawerFor('redis-redis')).stated ? 'ok' : 'refused',
      anthropic: (await s.providerStatements.statementsFor('redis-redis'))[0]!.withdrawn ? 'refused' : 'ok', registry: (await s.registryEntry()).state,
    };
    expect(state).toEqual({ d9: 'ok', rfc720: 'ok', drawer: 'ok', anthropic: 'ok', registry: 'ok', [which]: 'refused' });
  });
  // Mutant S5 at a6157cb0: a decisions file named for the act refuses it whatever its body says.
  it('withdraw D9 by a decisions file named for its act record, with a body that names nothing', async () => {
    const root = world(KEYS, true);
    write(root, `${DECISIONS_DIR}/DOSSIER-LOCAL-AGENT-D9-IN-FORCE-WITHDRAWAL.md`, 'Withdrawn.\n');
    const s = sources(root);
    expect([(await s.d9()).state, (await s.rfc720Ruling()).state, (await s.registryEntry()).state]).toEqual(['refused', 'ok', 'ok']);
  });
  it('leave the drawer stated when its Subject tuple appears only in prose, as the statements\' Effect quotes it', async () => {
    const root = world(KEYS);
    write(root, `${DECISIONS_DIR}/NOTE.md`, 'The consent covers (`project:syzygy`, `repository:redis-redis`) only.\n');
    expect((await sources(root).projectInput.drawerFor('redis-redis')).stated).toBe(true);
  });

  // Note 4: the lines every recorder writes for RFC3-16(b) items 7 and 9.
  it.each([
    ['no owner', (t: string) => t.replace(/^Owner: Tzeusy\n/m, '')],
    ['another owner', (t: string) => t.replace(/^Owner: Tzeusy$/m, 'Owner: someone')],
    ['no provenance state', (t: string) => t.replace(/^Provenance state: .*\n/m, '')],
    ['another provenance state', (t: string) => t.replace('`owner-adopted (bootstrap, uncorrelated)`', '`agent-asserted`')],
    ['no A1 line', (t: string) => t.replace(/^A1 audit-record identity .*\n/m, '')],
    ['an A1 identity', (t: string) => t.replace('**explicitly absent**', '`a1:0001`')],
    ['no scope', (t: string) => t.replace(/^Scope: .*\n/m, '')],
    ['a wider scope', (t: string) => t.replace(/^Scope: .*$/m, 'Scope: every operator-agent run')],
    ['a second scope', (t: string) => t.replace(/^(Scope: .*)$/m, '$1\n\nScope: every operator-agent run')],
  ])('refuse an act record, and the registry sign-off, with %s', async (_name, mutate) => {
    const root = world(KEYS, true);
    for (const key of KEYS) write(root, ACTS[key].file, mutate(fs.readFileSync(path.join(root, ACTS[key].file), 'utf8')));
    write(root, SIGNOFF, mutate(fs.readFileSync(path.join(root, SIGNOFF), 'utf8')));
    const s = sources(root);
    expect((await s.d9()).state).toBe('refused');
    expect((await s.rfc720Ruling()).state).toBe('refused');
    expect((await s.projectInput.drawerFor('redis-redis')).stated).toBe(false);
    expect((await s.providerStatements.statementsFor('redis-redis')).map(r => r.act)).toEqual([null, null]);
    expect((await s.registryEntry()).state).toBe('refused');
  });
  // Note 5: the bound-files table, predicate by predicate.
  it.each([
    ['a second table inside a fence', (t: string) => `${t}\n\`\`\`\n| File | SHA-256 |\n|---|---|\n\`\`\`\n`, 'the act\'s artifact does not carry exactly one bound-files table'],
    ['another separator row', (t: string) => t.replace('| File | SHA-256 |\n|---|---|', '| File | SHA-256 |\n|:--|:--|'), 'the act\'s artifact does not carry exactly one bound-files table'],
    ['a third row', (t: string) => t.replace(/^(\| `\.syzygy\/governance\/doctrine\/v1\.md` \|.*)$/m, `$1\n| \`${SECURITY}\` | \`${'0'.repeat(64)}\` |`), `the act's artifact binds ${SECURITY}, ${V1}, ${SECURITY}, not exactly ${SECURITY}, ${V1}`],
  ])('refuse D9 when its record carries %s', async (_name, mutate, why) => {
    const root = world([]);
    const record = mutate(real(ACTS['d9-in-force'].record));
    write(root, ACTS['d9-in-force'].record, record);
    write(root, ACTS['d9-in-force'].file, renderDossierLocalAgentAct('d9-in-force', sha(record), DATE, INSTANT));
    expect(await sources(root).d9()).toEqual({ state: 'refused', why });
  });
  it.each([
    ['another subject', (t: string) => t.replace('repository:redis-redis)`', 'repository:redis-redis-fork)`')],
    ['another statement', (t: string) => t.replace('Statement: no kernel evidence drawer', 'Statement: a kernel evidence drawer')],
    ['no record id', (t: string) => t.replace(/^Record ID: .*\n/m, '')],
    ['no record version', (t: string) => t.replace(/^Record version: .*\n/m, '')],
    ['a second Record ID line', (t: string) => t.replace(/^(Record ID: .*)$/m, '$1\n\n$1')],
    ['a second Subject line', (t: string) => t.replace(/^(Subject: .*)$/m, '$1\n\n$1')],
  ])('leave the drawer unstated for a record with %s, even under an act', async (_name, mutate) => {
    const root = world([]);
    const record = mutate(real(ACTS['redis-no-evidence-drawer'].record));
    write(root, ACTS['redis-no-evidence-drawer'].record, record);
    write(root, ACTS['redis-no-evidence-drawer'].file, renderDossierLocalAgentAct('redis-no-evidence-drawer', sha(record), DATE, INSTANT));
    expect(await sources(root).projectInput.drawerFor('redis-redis')).toEqual({ stated: false, why: 'the record NO-EVIDENCE-DRAWER-REDIS-2026-10-07 binds does not state, for exactly this subject, that no kernel evidence drawer exists' });
  });
  it.each([
    ['another provider', (t: string) => t.replace('agent-provider:anthropic)`', 'agent-provider:openai)`')],
    ['another repository', (t: string) => t.replace('repository:redis-redis, agent-provider', 'repository:redis-fork, agent-provider')],
    ['another record id', (t: string) => t.replace('`AGENT-PROVIDER-redis-redis-anthropic`', '`AGENT-PROVIDER-redis-redis-openai`')],
    ['another agent tool', (t: string) => t.replace('Agent tool: Claude Code, run by', 'Agent tool: Codex, run by')],
    ['a second agent tool line', (t: string) => t.replace('Agent tool: Claude Code, run by', 'Agent tool: Claude Code, run by the operator\n\nAgent tool: Codex, run by')],
    ['no record version', (t: string) => t.replace(/^Record version: .*\n/m, '')],
    ['a second Record ID line', (t: string) => t.replace(/^(Record ID: .*)$/m, '$1\n\n$1')],
    ['a second Subject line', (t: string) => t.replace(/^(Subject: .*)$/m, '$1\n\n$1')],
  ])('carry no act for a statement whose record names %s, even under an act', async (_name, mutate) => {
    const root = world([]);
    const record = mutate(real(ACTS['redis-agent-anthropic'].record));
    write(root, ACTS['redis-agent-anthropic'].record, record);
    write(root, ACTS['redis-agent-anthropic'].file, renderDossierLocalAgentAct('redis-agent-anthropic', sha(record), DATE, INSTANT));
    expect((await sources(root).providerStatements.statementsFor('redis-redis')).map(r => [r.provider, r.act])).toEqual([['anthropic', null]]);
  });
});

describe('the registry entry\'s version-tagged sign-off', () => {
  it('refuses once the installed entry changes', async () => {
    const root = world([], true);
    fs.appendFileSync(path.join(root, INSTALLED_ENTRY), ' ');
    expect(await sources(root).registryEntry()).toEqual({ state: 'refused', why: `the bytes of ${INSTALLED_ENTRY} differ from the SHA-256 the sign-off records` });
    fs.rmSync(path.join(root, INSTALLED_ENTRY));
    expect(await sources(root).registryEntry()).toEqual({ state: 'refused', why: `the signed entry ${INSTALLED_ENTRY} cannot be read` });
  });
  it.each([
    ['another title', (t: string) => t.replace('local-agent version — version-tagged sign-off v1.0', 'local-agent version — version-tagged sign-off v1.1')],
    ['another version', (t: string) => t.replace(/^Version: 1\.0$/m, 'Version: 1.1')],
    ['another tag', (t: string) => t.replace(/^Tag: .*$/m, 'Tag: public-git-source-acquisition-v1.0')],
    ['another package', (t: string) => t.replace(/^Package: .*$/m, 'Package: public-admission-registry-entries')],
    ['another kind', (t: string) => t.replace(/^Kind: .*$/m, 'Kind: specification delta')],
    ['another installed path', (t: string) => t.replace(/^Installed entry: .*$/m, `Installed entry: ${PROPOSED_ENTRY}`)],
    ['another act type', (t: string) => t.replace('`adopt-registry-entry`', '`approve-policy`')],
    ['a REVISE verdict', (t: string) => t.replace(/^Review verdict: CONFIRM$/m, 'Review verdict: REVISE')],
    ['no recording instant', (t: string) => t.replace(/^Recorded at \(UTC\): .*\n/m, '')],
    ['an instant on another day', (t: string) => t.replace(`Recorded at (UTC): ${INSTANT}`, 'Recorded at (UTC): 2026-10-06T09:30:00Z')],
    ['its SHA-256 only inside a fence', (t: string) => t.replace(/^(Installed entry SHA-256: [0-9a-f]{64})$/m, '```\n$1\n```')],
  ])('refuses a record with %s', async (_name, mutate) => {
    const root = world([], true);
    write(root, SIGNOFF, mutate(fs.readFileSync(path.join(root, SIGNOFF), 'utf8')));
    expect((await sources(root).registryEntry()).state).toBe('refused');
  });
  it('is the form the recorder writes for this package', () => {
    expect(LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM).toMatchObject({ file: 'PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md', installed: INSTALLED_ENTRY });
  });
});

// The readers' ports of the recorders' templates and file names, held to the recorders themselves (R-POLARIS-DOSSIER-GATE-SOURCES-2
// finding 2 and note 8): a drifted template refuses every record, and a drifted file name would read a recorded act as absent.
describe('the gate forms against the recorders', () => {
  const FORMS: Record<DossierLocalAgentActKey, DigestBoundActForm> = {
    'redis-no-evidence-drawer': DRAWER_FORMS['redis-redis']!, 'redis-agent-anthropic': STATEMENT_FORMS['redis-redis']![0]!.form,
    'redis-agent-openai': STATEMENT_FORMS['redis-redis']![1]!.form, 'd9-in-force': D9_ACT_FORM, 'rfc7-20-reading-in-force': RFC7_20_RULING_ACT_FORM,
  };
  it('read each record at the path its recorder writes it', () => {
    const paths = recorderRecordPaths();
    expect(Object.fromEntries(KEYS.map(key => [key, `${DECISIONS_DIR}/${FORMS[key].file}`]))).toEqual(paths.acts);
    expect(Object.fromEntries(KEYS.map(key => [key, ACTS[key].file]))).toEqual(paths.acts);
    expect(`${DECISIONS_DIR}/${LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.file}`).toBe(paths.signoff);
  });
  it('render each act record byte for byte as render_act does, from the same fields', () => {
    for (const key of KEYS) {
      const argument = sha(real(ACTS[key].record));
      const fields = { date: DATE, instant: INSTANT, argument, opening: 'opening', label: 'label', description: 'description', frozen: 'f'.repeat(40), manifest: 'b'.repeat(64), verdict: 'CONFIRM', reviewed: 'c'.repeat(40) };
      expect(FORMS[key].template!.render(fields), key).toBe(renderDossierLocalAgentAct(key, argument, DATE, INSTANT));
    }
  });
  // R-POLARIS-DOSSIER-GATE-SOURCES-3 note 4: both field sets render_record writes, with and without a disposition record.
  it.each([
    ['CONFIRM', null],
    ['CONFIRM WITH EXCEPTIONS', 'pkg/ROUND-1-DISPOSITIONS.md'],
  ] as const)('render the sign-off record byte for byte as render_record does, from the same fields: %s', async (verdict, disposition) => {
    const root = world([], true);
    const fields = { date: DATE, quote: 'Extend Scope A and sign off v1.0', review: 'docs/reviews/R-STUB-RAW.md', commit: 'c'.repeat(40), verdict, disposition: disposition ?? 'none', instant: INSTANT, sha: sha(real(PROPOSED_ENTRY)) };
    const record = renderLocalAgentSignoff(root, DATE, INSTANT, verdict, disposition);
    expect(LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.template.render(fields)).toBe(record);
    write(root, SIGNOFF, record);
    expect(await sources(root).registryEntry()).toEqual({ state: 'ok', record: 'public-git-source-acquisition-local-agent-v1.0' });
  });
  // Note 2: each sitting form sweeps its artifact's own H1, read here from the artifact itself.
  it('sweep each artifact by its own heading', () => {
    for (const key of KEYS) {
      const heading = /^# (.+)$/m.exec(real(ACTS[key].record))![1]!;
      expect(FORMS[key].stems, key).toContain(heading);
    }
  });
});

// syzygy-bpyt.8.10, characterization: the byte-exact families against the alterations the field-parsed readers accept
// (package-reader.test.ts). A literal line altered, removed or added refuses; a slot is free text within its pattern, so other owner words
// in a slot still count (the residual of byte-exact recognition). These literals pin today's verdicts; changing one is an owner decision (GP-Q0).
describe('altered prose in a byte-exact act record (characterization, syzygy-bpyt.8.10)', () => {
  const REFUSED = { state: 'refused', why: 'invalid-records' };
  /** The verdict each `PROSE_ALTERATIONS` entry gets, by name: the slot-held owner selection is the one that still counts. */
  const EXPECTED = (ok: object): Record<string, object> => ({ 'effect-widened': REFUSED, 'limits-removed': REFUSED, 'selection-replaced': ok, 'withdrawal-appended': REFUSED });
  it('a sitting act (D9): refused once its Effect or limits change or a withdrawal is appended; its selection label is a slot, so other words count', async () => {
    const root = world(['d9-in-force']), record = path.join(root, ACTS['d9-in-force'].file), text = fs.readFileSync(record, 'utf8');
    const ok = { state: 'ok', record: 'D9-IN-FORCE-OPERATOR-AGENT-2026-10-07' };
    expect(await sources(root).d9()).toEqual(ok);
    for (const [name, alter] of PROSE_ALTERATIONS) {
      expect(alter(text), name).not.toBe(text);
      fs.writeFileSync(record, alter(text));
      expect(await sources(root).d9(), name).toEqual(EXPECTED(ok)[name]);
    }
    fs.writeFileSync(record, HEAD_FIELD_ALTERATION(text));
    expect(await sources(root).d9()).toEqual(REFUSED);
  });
  it('version 2 of the statement: the same verdicts, read by its own form', async () => {
    const root = world(['redis-agent-anthropic'], false, true), record = path.join(root, V2_ACT), text = fs.readFileSync(record, 'utf8');
    const read = async () => {
      const state = await readDigestBoundActState({ root, now: NOW, form: PROVIDER_V2_FORM });
      return state.state === 'ok' ? { state: 'ok', record: state.act.identity } : state;
    };
    const ok = { state: 'ok', record: 'AGENT-PROVIDER-V2-REDIS-ANTHROPIC-2026-10-07' };
    expect(await read()).toEqual(ok);
    for (const [name, alter] of PROSE_ALTERATIONS) {
      expect(alter(text), name).not.toBe(text);
      fs.writeFileSync(record, alter(text));
      expect(await read(), name).toEqual(EXPECTED(ok)[name]);
    }
  });
  it('the registry sign-off: refused once its What-this-records paragraph or its limits change, a withdrawal is appended or its selection drops the Scope A words; other words that keep them count', async () => {
    const root = world([], true), text = fs.readFileSync(path.join(root, SIGNOFF), 'utf8');
    const ok = { state: 'ok', record: 'public-git-source-acquisition-local-agent-v1.0' };
    expect(await sources(root).registryEntry()).toEqual(ok);
    for (const [name, alter] of PROSE_ALTERATIONS) {
      expect(alter(text), name).not.toBe(text);
      write(root, SIGNOFF, alter(text));
      expect(await sources(root).registryEntry(), name).toEqual(REFUSED);
    }
    write(root, SIGNOFF, text.replace(/^Owner selection: .+$/m, 'Owner selection: Extend Scope A and sign off every entry at every version'));
    expect(await sources(root).registryEntry()).toEqual(ok);
  });
});

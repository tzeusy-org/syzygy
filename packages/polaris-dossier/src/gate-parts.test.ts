import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveCloneHead } from './clone-head.js';
import { providerStatementGate, registryEntryUsable, type ProviderStatementRecord } from './gate-sources.js';
import { dossierRepositoryUrl } from './github-url.js';
import { governedSubject, type DrawerStatement } from './governed.js';
import { tempDir } from '@syzygy/test-kit';

// The pure parts of the S3 start gates (syzygy-qkea.4): the repository URL, the clone's HEAD, the governed predicate
// (REQ-polaris-generation-033, R3-F9), the per-project statement gate and the registry entry's usability. Expected values are literals.

describe('repository URL (parsed, never fetched)', () => {
  it.each([
    ['https://github.com/redis/redis', 'https://github.com/redis/redis'],
    ['https://github.com/redis/redis.git', 'https://github.com/redis/redis'],
    ['https://github.com/redis/redis/', 'https://github.com/redis/redis'],
  ])('%s is %s', (input, url) => {
    expect(dossierRepositoryUrl(input)).toEqual({ ok: true, url });
  });
  it.each([
    'http://github.com/redis/redis', 'https://gitlab.com/redis/redis', 'https://user:token@github.com/redis/redis',
    'https://github.com/redis', 'https://github.com/redis/..', 'git@github.com:redis/redis.git',
  ])('refuses %s', (input) => {
    expect(dossierRepositoryUrl(input).ok).toBe(false);
  });
  it('refuses a ref in the URL: the revision is the clone\'s HEAD, checked against the consent', () => {
    expect(dossierRepositoryUrl('https://github.com/redis/redis/tree/8.0.0')).toEqual({
      ok: false,
      reason: 'the URL names the ref 8.0.0; name the repository only — the run\'s revision is the clone\'s HEAD, which must be a revision the observation consent names',
    });
  });
});

describe('the clone\'s HEAD', () => {
  const C1 = '1111111111111111111111111111111111111111';
  const C2 = '2222222222222222222222222222222222222222222222222222222222222222';
  const clone = (files: Record<string, string>): string => {
    const dir = tempDir('dossier-head-');
    for (const [name, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, '.git', name)), { recursive: true });
      fs.writeFileSync(path.join(dir, '.git', name), text);
    }
    return dir;
  };
  it('reads a detached HEAD, SHA-1 or SHA-256', () => {
    expect(resolveCloneHead(clone({ HEAD: `${C1}\n` }))).toMatchObject({ ok: true, commit: C1, via: 'detached HEAD' });
    expect(resolveCloneHead(clone({ HEAD: `${C2}\n` }))).toMatchObject({ ok: true, commit: C2, via: 'detached HEAD' });
  });
  it('follows a branch to its loose ref, else to its one packed-refs entry', () => {
    expect(resolveCloneHead(clone({ HEAD: 'ref: refs/heads/main\n', 'refs/heads/main': `${C1}\n` }))).toMatchObject({ ok: true, commit: C1, via: 'refs/heads/main' });
    expect(resolveCloneHead(clone({ HEAD: 'ref: refs/heads/main\n', 'packed-refs': `# pack-refs with: peeled\n${C1} refs/heads/main\n${C1} refs/tags/v1\n` }))).toMatchObject({ ok: true, commit: C1, via: 'refs/heads/main' });
  });
  it.each([
    ['an abbreviated commit', { HEAD: '1111111\n' }, 'HEAD is neither a full commit identifier nor a branch reference'],
    ['a tag ref', { HEAD: 'ref: refs/tags/v1\n' }, 'HEAD names "refs/tags/v1", which is not a branch under refs/heads/'],
    ['a ref escaping refs/heads', { HEAD: 'ref: refs/heads/../../config\n' }, 'HEAD names "refs/heads/../../config", which is not a branch under refs/heads/'],
    ['a dangling branch', { HEAD: 'ref: refs/heads/main\n' }, 'HEAD names refs/heads/main, which has no loose file and no packed-refs entry'],
    ['a twice-packed branch', { HEAD: 'ref: refs/heads/main\n', 'packed-refs': `${C1} refs/heads/main\n${C1} refs/heads/main\n` }, 'packed-refs holds 2 entries for refs/heads/main; exactly one is required'],
    ['a branch holding a symbolic ref', { HEAD: 'ref: refs/heads/main\n', 'refs/heads/main': 'ref: refs/heads/other\n' }, 'refs/heads/main does not hold a full commit identifier'],
  ])('refuses %s', (_name, files, reason) => {
    expect(resolveCloneHead(clone(files))).toEqual({ ok: false, reason });
  });
  it('refuses a .git file (a gitdir pointer) and a .git symbolic link, never following either', () => {
    const pointer = tempDir('dossier-head-');
    fs.writeFileSync(path.join(pointer, '.git'), 'gitdir: /elsewhere\n');
    expect(resolveCloneHead(pointer)).toEqual({ ok: false, reason: `${path.join(pointer, '.git')} is not a directory (a gitdir pointer is refused, never followed); use a plain clone` });
    const target = clone({ HEAD: `${C1}\n` });
    const link = tempDir('dossier-head-');
    fs.symlinkSync(path.join(target, '.git'), path.join(link, '.git'));
    expect(resolveCloneHead(link)).toEqual({ ok: false, reason: `${path.join(link, '.git')} is a symbolic link; it is refused, never followed` });
  });
  it('agrees with git on a real clone, detached and on a branch', () => {
    const dir = tempDir('dossier-head-git-');
    const git = (...args: string[]): string => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' } }).trim();
    git('init', '-q', '-b', 'main');
    git('config', 'gc.auto', '0');
    git('config', 'maintenance.auto', 'false');
    fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
    git('add', 'a.txt');
    git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'a');
    const commit = git('rev-parse', 'HEAD');
    expect(resolveCloneHead(dir)).toMatchObject({ ok: true, commit, via: 'refs/heads/main' });
    git('checkout', '-q', '--detach');
    expect(resolveCloneHead(dir)).toMatchObject({ ok: true, commit, via: 'detached HEAD' });
  });
});

describe('governed predicate (R3-F9: any .syzygy/ path counts, adopted or not)', () => {
  const ABSENT: DrawerStatement = { stated: true, drawer: 'absent', record: 'PI-1@1' };
  const PRESENT: DrawerStatement = { stated: true, drawer: 'present', record: 'PI-1@1' };
  const SILENT: DrawerStatement = { stated: false, why: 'no record' };
  it('is non-governed only when the input states no drawer and no openspec/ or .syzygy/ path is listed', () => {
    expect(governedSubject(ABSENT, ['README.md', 'src/a.c', 'docs/syzygy.md', 'tests/openspec.txt'])).toEqual({
      kind: 'non-governed', statementRequired: false, drawer: ABSENT,
      governingPaths: { openspec: 0, syzygy: 0, firstPaths: [] },
      because: ['the project input PI-1@1 states that no kernel evidence drawer exists, and the pinned tree lists no openspec/ or .syzygy/ path'],
    });
  });
  it('is unstated when the project input does not say, even with no governing path', () => {
    expect(governedSubject(SILENT, ['README.md'])).toMatchObject({ kind: 'unstated', statementRequired: true, because: ['the project input does not state whether a kernel evidence drawer exists (no record)'] });
  });
  it('is governed when the input records a drawer, whatever the tree holds', () => {
    expect(governedSubject(PRESENT, ['README.md'])).toMatchObject({ kind: 'governed', statementRequired: true, because: ['the project input PI-1@1 records a kernel evidence drawer'] });
  });
  it.each([
    ['a root openspec/ spec', 'openspec/specs/auth/spec.md', 1, 0],
    ['a nested openspec/ directory', 'tools/openspec/changes/x/proposal.md', 1, 0],
    ['openspec/ in another letter case', 'OpenSpec/README.md', 1, 0],
    ['a .syzygy/ capability declaration, not adopted', '.syzygy/map/topology-candidates/x.yaml', 0, 1],
    ['a nested .syzygy/ directory', 'vendor/sub/.syzygy/governance/doctrine/x.md', 0, 1],
    ['.syzygy/ in another letter case', '.Syzygy/notes.md', 0, 1],
    ['openspec/ spelled with a long s (U+017F)', 'openſpec/x.md', 1, 0],
    ['.syzygy/ spelled with a long s (U+017F)', '.ſyzygy/x.md', 0, 1],
    ['openspec/ in fullwidth letters', 'ｏｐｅｎｓｐｅｃ/x.md', 1, 0],
    ['openspec/ with a trailing dot', 'openspec./x.md', 1, 0],
    ['.syzygy/ with a trailing space', '.syzygy /x.md', 0, 1],
    ['an entry named openspec itself (a symlink or gitlink)', 'openspec', 1, 0],
  ])('is governed for %s, even when the input states no drawer', (_name, file, openspec, syzygy) => {
    const decision = governedSubject(ABSENT, ['README.md', file]);
    expect(decision.kind).toBe('governed');
    expect(decision.statementRequired).toBe(true);
    expect(decision.governingPaths).toEqual({ openspec, syzygy, firstPaths: [file] });
  });
});

describe('per-project statement gate', () => {
  const NOW = Date.UTC(2026, 9, 7, 12);
  const statement = (over: Partial<ProviderStatementRecord> = {}): ProviderStatementRecord => ({
    recordId: 'STMT-REDIS', version: '1', digest: 'a'.repeat(64), agentTool: 'claude-code', provider: 'anthropic', contentClasses: ['code-content'], withdrawn: false,
    act: { identity: 'STMT-REDIS-ACT-2026-10-06', inForceAt: NOW - 1 }, ...over,
  });
  const NONE = 'no per-project statement names the operator\'s agent tool claude-code with the provider anthropic';
  const NOT_IN_FORCE = 'no per-project statement naming the agent tool claude-code with the provider anthropic is in force: STMT-REDIS@1';
  it('is ok for exactly one in-force statement naming the declared tool with the provider', () => {
    expect(providerStatementGate([statement(), statement({ recordId: 'OTHER', agentTool: 'codex', provider: 'openai' })], 'claude-code', 'anthropic', NOW)).toEqual({ state: 'ok', record: 'STMT-REDIS@1' });
  });
  it.each([
    ['none at all', [], NONE],
    ['one naming another provider', [statement({ provider: 'openai' })], `${NONE} (STMT-REDIS@1 names claude-code with openai)`],
    ['one naming the provider for another tool (Codex with Anthropic against the Claude Code statement)', [statement({ agentTool: 'codex' })], `${NONE} (STMT-REDIS@1 names codex with anthropic)`],
    ['one naming neither', [statement({ agentTool: 'codex', provider: 'openai' })], NONE],
    ['a provider spelled in another case', [statement({ provider: 'Anthropic' })], `${NONE} (STMT-REDIS@1 names claude-code with Anthropic)`],
    ['a tool spelled in another case', [statement({ agentTool: 'Claude-Code' })], `${NONE} (STMT-REDIS@1 names Claude-Code with anthropic)`],
    ['a withdrawn one', [statement({ withdrawn: true })], `${NOT_IN_FORCE} is withdrawn`],
    ['one no act binds', [statement({ act: null })], `${NOT_IN_FORCE} has no owner act binding its bytes`],
    ['one not in force yet', [statement({ act: { identity: 'x', inForceAt: NOW + 1 } })], `${NOT_IN_FORCE} is not in force yet`],
    ['one naming no content class', [statement({ contentClasses: [] })], `${NOT_IN_FORCE} names no content class`],
  ])('is absent for %s', (_name, records, why) => {
    expect(providerStatementGate(records, 'claude-code', 'anthropic', NOW)).toEqual({ state: 'absent', why });
  });
  it('is absent for the Claude Code run against the Codex statement for the same provider (the reverse pairing)', () => {
    expect(providerStatementGate([statement({ agentTool: 'codex' })], 'claude-code', 'anthropic', NOW).state).toBe('absent');
    expect(providerStatementGate([statement()], 'codex', 'anthropic', NOW)).toEqual({ state: 'absent', why: 'no per-project statement names the operator\'s agent tool codex with the provider anthropic (STMT-REDIS@1 names claude-code with anthropic)' });
  });
  it('is refused when two in-force statements name the provider', () => {
    expect(providerStatementGate([statement(), statement({ version: '2' })], 'claude-code', 'anthropic', NOW).state).toBe('refused');
  });
});

describe('source-acquisition registry entry usability', () => {
  const entry = (fields: Record<string, unknown>): string => JSON.stringify({ entries: [{ observerId: 'x', ...fields }] });
  it('is ok when the entry names the dossier reader with a version', () => {
    expect(registryEntryUsable(entry({ implementationId: 'polaris-dossier/git-object-reader', implementationVersion: '1.0.0' }), 'ACT-1')).toEqual({ state: 'ok', record: 'ACT-1' });
  });
  it.each([
    ['the candidate entry\'s implementation', entry({ implementationId: 'polaris-generation/public-git-source-acquisition', implementationVersion: '1.0.0' }), 'the registry entry bound by ACT-1 names the implementation "polaris-generation/public-git-source-acquisition", not polaris-dossier/git-object-reader'],
    ['an Unknown implementation version', entry({ implementationId: 'polaris-dossier/git-object-reader', implementationVersion: null }), 'the registry entry bound by ACT-1 has no implementation version (Unknown), so RFC4-3 admits no output from it'],
    ['two entries', JSON.stringify({ entries: [{}, {}] }), 'the registry entry file bound by ACT-1 does not hold exactly one entry'],
    ['not JSON', '{', 'the registry entry bound by ACT-1 is not JSON'],
  ])('is refused for %s', (_name, text, why) => {
    expect(registryEntryUsable(text, 'ACT-1')).toEqual({ state: 'refused', why });
  });
  it('refuses the candidate entry in this checkout as it stands', () => {
    const text = fs.readFileSync(path.resolve(__dirname, '../../../.syzygy/governance/contracts/candidates/public-admission-registry-entries/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-CANDIDATE.json'), 'utf8');
    expect(registryEntryUsable(text, 'ACT-1').state).toBe('refused');
  });
});

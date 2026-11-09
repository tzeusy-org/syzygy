import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DECISIONS_DIR } from '@syzygy/polaris-generation-consent/live';
import { LAUNCH_RECORD_DIR, parseLaunchRecord, recordFileFor, type LaunchRecord } from './launch-record.js';

/** The launch consent records' one store: the dedicated reference of the governance home (REQ-polaris-generation-046, line 23; the
 * write consent `WRITE-CONSENT-LAUNCH-RECORDS-2026-11-09`, its Scope).
 *
 * Writes. One recording commit per confirmed answer, made with Git plumbing only (`hash-object -w`, `mktree`, `commit-tree`,
 * `update-ref` with its old-value check), so no working tree, index, HEAD or other reference changes. "The branch's first recording
 * commit has no parent. Every later recording commit has exactly one parent: the branch's tip at the moment of the move." Its tree
 * differs from its parent's (or the empty tree) only by files it adds under `.syzygy/governance/decisions/launch-consent/` that the
 * parent's tree does not hold. "Every write runs with the repository's hooks disabled" (`core.hooksPath=/dev/null`), and nothing is
 * pushed or fetched: no git command here takes a remote. "While `refs/heads/launch-consent-records` is the current branch of any
 * worktree of that repository, Syzygy writes nothing under this consent." The commit is attributed to Syzygy (committer) and the
 * operator (author).
 *
 * Reads. "Syzygy SHALL read launch consent records only from that reference's commits, as Git objects." The reader walks the chain from
 * the tip and counts a file only when a recording commit on the reference added it: every commit must have at most one parent, the root
 * commit's tree must hold only record files directly under the location, and every later commit must differ from its parent only by
 * files it adds there. A commit outside that form, a record that does not parse, or a file whose name is not its record's makes the
 * whole reference unreadable, which the caller refuses on, never reading past it. Replacement objects are not honoured. Revocation:
 * a record is revoked or withdrawn when any file of the governance home's decisions tree names its record ID (a later owner act naming
 * it, RFC5-13); superseded when a valid later record on the reference names it in `Supersedes`. The records, the reference and the
 * decisions tree lie within the agent sessions' write reach. */

export const LAUNCH_REF = 'refs/heads/launch-consent-records';
export const LAUNCH_REF_SHORT = 'launch-consent-records';
const LOCATION_SEGMENTS = LAUNCH_RECORD_DIR.split('/');
const MAX_CHAIN = 10_000;
const MAX_DECISIONS_FILES = 20_000;

export type RecordState = 'active' | 'superseded' | 'revoked';
export interface StoredRecord {
  readonly record: LaunchRecord;
  readonly digest: string;
  readonly file: string;
  /** The recording commit that added the file. */
  readonly commit: string;
  readonly state: RecordState;
  /** The file or record that revoked or superseded it. */
  readonly stateBy: string | null;
}
export type StoreRead =
  | { readonly ok: true; readonly tip: string | null; readonly records: readonly StoredRecord[] }
  | { readonly ok: false; readonly why: string };

export interface GitRun { (args: readonly string[], input?: Buffer | string): { readonly status: number; readonly stdout: Buffer; readonly stderr: string } }

/** Git in the governance home, its environment reduced to what the command needs: no inherited `GIT_*` variable (a `GIT_DIR`, an
 * `GIT_INDEX_FILE` or a `GIT_OBJECT_DIRECTORY` would redirect the write), hooks off, replacements and signing off, no prompt. */
export function homeGit(home: string, identity: { readonly author?: string; readonly committer?: string } = {}): GitRun {
  const env: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(process.env)) if (!k.startsWith('GIT_')) env[k] = v;
  env['GIT_NO_REPLACE_OBJECTS'] = '1';
  env['GIT_TERMINAL_PROMPT'] = '0';
  env['GIT_CONFIG_NOSYSTEM'] = '1';
  const person = (who: string | undefined, role: 'AUTHOR' | 'COMMITTER') => {
    if (who === undefined) return;
    env[`GIT_${role}_NAME`] = who;
    env[`GIT_${role}_EMAIL`] = `${who.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')}@launch-consent.invalid`;
  };
  person(identity.author, 'AUTHOR');
  person(identity.committer, 'COMMITTER');
  return (args, input) => {
    const r = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', '-c', 'commit.gpgSign=false', '-C', home, ...args],
      { env, input: input ?? '', maxBuffer: 256 * 1024 * 1024 });
    return { status: r.status ?? -1, stdout: r.stdout ?? Buffer.alloc(0), stderr: (r.stderr ?? Buffer.alloc(0)).toString('utf8') };
  };
}

const text = (git: GitRun, args: readonly string[]): string | null => {
  const r = git(args);
  return r.status === 0 ? r.stdout.toString('utf8') : null;
};

/** The dedicated reference's tip, null when it is absent, or why it cannot be read. */
export function readTip(git: GitRun): { readonly tip: string | null } | { readonly why: string } {
  const out = text(git, ['for-each-ref', '--format=%(refname) %(objectname) %(objecttype)', LAUNCH_REF]);
  if (out === null) return { why: 'the governance home\'s references cannot be listed' };
  const rows = out.split('\n').filter(row => row.startsWith(`${LAUNCH_REF} `));
  if (rows.length === 0) return { tip: null };
  const [, oid, type] = rows[0]!.split(' ');
  if (rows.length !== 1 || type !== 'commit' || oid === undefined) return { why: `${LAUNCH_REF} does not name exactly one commit` };
  return { tip: oid };
}

/** The committer every recording commit carries (REQ-polaris-generation-046: attributed to Syzygy and the operator). */
export const RECORDING_COMMITTER = 'Syzygy <syzygy@launch-consent.invalid>';
/** The first line of a recording commit's message: the record IDs it adds, sorted by code unit so writer and reader agree. */
export const recordingSubject = (recordIds: readonly string[]): string => `launch consent: ${[...recordIds].sort().join(', ')}`;

interface CommitHead { readonly tree: string; readonly parents: readonly string[]; readonly committer: string | null; readonly subject: string }
function commitHead(git: GitRun, oid: string): CommitHead | null {
  const body = text(git, ['cat-file', 'commit', oid]);
  if (body === null) return null;
  const split = body.indexOf('\n\n');
  const header = body.slice(0, split < 0 ? body.length : split).split('\n');
  const tree = /^tree ([0-9a-f]+)$/.exec(header[0] ?? '')?.[1];
  if (tree === undefined) return null;
  const parents: string[] = [];
  let at = 1;
  for (; at < header.length; at++) {
    const m = /^parent ([0-9a-f]+)$/.exec(header[at]!);
    if (m === null) break;
    parents.push(m[1]!);
  }
  const committerLine = header.find(line => line.startsWith('committer '));
  const committer = committerLine === undefined ? null : /^committer (.+) \d+ [+-]\d{4}$/.exec(committerLine)?.[1] ?? null;
  const subject = split < 0 ? '' : body.slice(split + 2).split('\n')[0] ?? '';
  return { tree, parents, committer, subject };
}

const RECORD_FILE = /^LAUNCH-[A-Z]+-[0-9a-f]{12}-\d{8}T\d{6}Z-[0-9a-f]{8}\.md$/;
const underLocation = (p: string): string | null => {
  const prefix = `${LAUNCH_RECORD_DIR}/`;
  if (!p.startsWith(prefix)) return null;
  const name = p.slice(prefix.length);
  return RECORD_FILE.test(name) ? name : null;
};

/** The files `commit` adds, when it is a recording commit: only additions of record files directly under the location. */
function addedFiles(git: GitRun, commit: string, parent: string | null): { readonly files: readonly { readonly path: string; readonly blob: string }[] } | { readonly why: string } {
  const args = parent === null ? ['ls-tree', '-r', '-z', '--full-tree', commit] : ['diff-tree', '-r', '-z', '--no-renames', '--no-commit-id', parent, commit];
  const r = git(args);
  if (r.status !== 0) return { why: `the recording commit ${commit} cannot be compared with its parent` };
  const fields = r.stdout.toString('utf8').split('\0');
  const files: { path: string; blob: string }[] = [];
  if (parent === null) {
    for (const row of fields.filter(f => f !== '')) {
      const m = /^(\d{6}) (blob|tree|commit) ([0-9a-f]+)\t(.+)$/s.exec(row);
      if (m === null || m[1] !== '100644' || m[2] !== 'blob' || underLocation(m[4]!) === null) return { why: `the root commit ${commit} holds ${JSON.stringify((m?.[4] ?? row).slice(0, 200))}, which is not a record file under ${LAUNCH_RECORD_DIR}/` };
      files.push({ path: m[4]!, blob: m[3]! });
    }
  } else {
    for (let i = 0; i < fields.length - 1; i += 2) {
      const m = /^:(\d{6}) (\d{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z])$/.exec(fields[i]!);
      const p = fields[i + 1]!;
      if (m === null || m[5] !== 'A' || m[1] !== '000000' || m[2] !== '100644' || underLocation(p) === null) {
        return { why: `the commit ${commit} on ${LAUNCH_REF} ${m === null ? 'cannot be read as a change list' : `changes ${JSON.stringify(p.slice(0, 200))} (${m[5]}), which a recording commit never does: it only adds record files under ${LAUNCH_RECORD_DIR}/`}` };
      }
      files.push({ path: p, blob: m[4]! });
    }
  }
  if (files.length === 0) return { why: `the commit ${commit} on ${LAUNCH_REF} adds no record` };
  return { files };
}

/** Every file name in the governance home's decisions tree (its working tree) whose text carries `needle`. */
function decisionsNaming(home: string, needles: ReadonlySet<string>): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  if (needles.size === 0) return out;
  const root = path.join(home, DECISIONS_DIR);
  const pending = [''];
  let seen = 0;
  while (pending.length > 0) {
    const rel = pending.pop()!;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (++seen > MAX_DECISIONS_FILES) throw new Error('decisions tree too large');
      const child = rel === '' ? e.name : `${rel}/${e.name}`;
      if (e.isDirectory()) { pending.push(child); continue; }
      if (!e.isFile()) continue;
      let body: string;
      try { body = fs.readFileSync(path.join(root, child), 'utf8'); } catch { continue; }
      for (const needle of needles) if (!out.has(needle) && body.includes(needle)) out.set(needle, `${DECISIONS_DIR}/${child}`);
    }
  }
  return out;
}

/** Every launch consent record on the dedicated reference, with its state; or why the reference cannot be read. */
export function readLaunchRecords(home: string, git: GitRun = homeGit(home)): StoreRead {
  const tipRead = readTip(git);
  if ('why' in tipRead) return { ok: false, why: tipRead.why };
  if (tipRead.tip === null) return { ok: true, tip: null, records: [] };
  const chain: { commit: string; parent: string | null; committer: string | null; subject: string }[] = [];
  const visited = new Set<string>();
  for (let at: string | null = tipRead.tip; at !== null;) {
    if (visited.has(at) || chain.length >= MAX_CHAIN) return { ok: false, why: `${LAUNCH_REF} is longer than ${MAX_CHAIN} commits or loops` };
    visited.add(at);
    const head = commitHead(git, at);
    if (head === null) return { ok: false, why: `the commit ${at} on ${LAUNCH_REF} cannot be read` };
    if (head.parents.length > 1) return { ok: false, why: `the commit ${at} on ${LAUNCH_REF} has ${head.parents.length} parents; a recording commit has at most one` };
    chain.push({ commit: at, parent: head.parents[0] ?? null, committer: head.committer, subject: head.subject });
    at = head.parents[0] ?? null;
  }
  const found: Omit<StoredRecord, 'state' | 'stateBy'>[] = [];
  for (const { commit, parent, committer, subject } of chain.reverse()) {
    const added = addedFiles(git, commit, parent);
    if ('why' in added) return { ok: false, why: added.why };
    // Attribution is a stored claim any writer of the reference can copy. Checking it refuses commits that do not even claim to be
    // Syzygy's recording commits (an agent's or an operator's own); a commit that copies the claim is read (the write consent's residual).
    if (committer !== RECORDING_COMMITTER) return { ok: false, why: `the commit ${commit} on ${LAUNCH_REF} is not attributed to Syzygy as committer (${JSON.stringify((committer ?? 'none').slice(0, 120))}), so it is not a recording commit` };
    const firstFound = found.length;
    for (const file of added.files) {
      const body = git(['cat-file', 'blob', file.blob]);
      if (body.status !== 0) return { ok: false, why: `the record ${file.path} cannot be read` };
      let decoded: string;
      try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(body.stdout); } catch { return { ok: false, why: `the record ${file.path} is not UTF-8` }; }
      const parsed = parseLaunchRecord(decoded);
      if (!parsed.ok) return { ok: false, why: `the record ${file.path} added by ${commit} is unreadable: ${parsed.why}` };
      if (path.posix.basename(file.path) !== recordFileFor(parsed.record.recordId)) return { ok: false, why: `the file ${file.path} holds the record ${parsed.record.recordId}, which is not its name` };
      found.push({ record: parsed.record, digest: parsed.digest, file: file.path, commit });
    }
    const ids = found.slice(firstFound).map(f => f.record.recordId);
    if (subject !== recordingSubject(ids)) return { ok: false, why: `the commit ${commit} on ${LAUNCH_REF} does not carry a recording commit's message for the records it adds` };
  }
  const ids = new Set(found.map(f => f.record.recordId));
  if (ids.size !== found.length) return { ok: false, why: `${LAUNCH_REF} holds two records with one record ID` };
  let named: ReadonlyMap<string, string>;
  try { named = decisionsNaming(home, ids); } catch { return { ok: false, why: 'the governance home\'s decisions tree cannot be swept for revocations' }; }
  const supersededBy = new Map<string, string>();
  for (const f of found) if (f.record.supersedes !== null) supersededBy.set(f.record.supersedes, f.record.recordId);
  const records = found.map((f): StoredRecord => {
    const revokedBy = named.get(f.record.recordId);
    if (revokedBy !== undefined) return { ...f, state: 'revoked', stateBy: revokedBy };
    const by = supersededBy.get(f.record.recordId);
    return by === undefined ? { ...f, state: 'active', stateBy: null } : { ...f, state: 'superseded', stateBy: by };
  });
  return { ok: true, tip: tipRead.tip, records };
}

export type WriteResult = { readonly ok: true; readonly commit: string; readonly files: readonly string[] } | { readonly ok: false; readonly why: string };

/** One recording commit adding `records` on the dedicated reference, whose tip must still be `expectedTip` (the tip the reader read). */
export function writeLaunchRecords(
  home: string,
  input: { readonly records: readonly { readonly recordId: string; readonly text: string }[]; readonly expectedTip: string | null; readonly operator: string; readonly message: string },
  gitOf: (identity: { readonly author: string; readonly committer: string }) => GitRun = identity => homeGit(home, identity),
): WriteResult {
  const git = gitOf({ author: input.operator, committer: 'Syzygy' });
  if (input.records.length === 0) return { ok: false, why: 'a recording commit adds at least one record' };
  const worktrees = text(git, ['worktree', 'list', '--porcelain']);
  if (worktrees === null) return { ok: false, why: 'the governance home\'s worktrees cannot be listed' };
  if (worktrees.split('\n').includes(`branch ${LAUNCH_REF}`)) return { ok: false, why: `${LAUNCH_REF} is the current branch of a worktree of the governance home, so Syzygy writes nothing under the write consent` };
  const tipRead = readTip(git);
  if ('why' in tipRead) return { ok: false, why: tipRead.why };
  if (tipRead.tip !== input.expectedTip) return { ok: false, why: `${LAUNCH_REF} moved since its records were read (${input.expectedTip ?? 'absent'} then, ${tipRead.tip ?? 'absent'} now); nothing was written` };
  const format = text(git, ['rev-parse', '--show-object-format'])?.trim();
  if (format !== 'sha1' && format !== 'sha256') return { ok: false, why: 'the governance home\'s object format cannot be read' };
  const zero = '0'.repeat(format === 'sha1' ? 40 : 64);

  const blobs: { name: string; oid: string }[] = [];
  for (const r of input.records) {
    const w = git(['hash-object', '-w', '--stdin'], r.text);
    if (w.status !== 0) return { ok: false, why: `the record ${r.recordId} could not be written as a blob` };
    blobs.push({ name: recordFileFor(r.recordId), oid: w.stdout.toString('utf8').trim() });
  }
  const baseTree = tipRead.tip === null ? null : commitHead(git, tipRead.tip)?.tree ?? undefined;
  if (baseTree === undefined) return { ok: false, why: `the tip ${tipRead.tip} cannot be read` };

  const rebuild = (tree: string | null, segments: readonly string[]): { oid: string } | { why: string } => {
    const entries: string[] = [];
    if (tree !== null) {
      const listed = git(['ls-tree', '-z', tree]);
      if (listed.status !== 0) return { why: `the tree ${tree} cannot be listed` };
      entries.push(...listed.stdout.toString('utf8').split('\0').filter(e => e !== ''));
    }
    const nameOf = (entry: string) => entry.slice(entry.indexOf('\t') + 1);
    if (segments.length === 0) {
      for (const b of blobs) {
        if (entries.some(e => nameOf(e) === b.name)) return { why: `${LAUNCH_RECORD_DIR}/${b.name} already exists; a recording commit adds new files only` };
        entries.push(`100644 blob ${b.oid}\t${b.name}`);
      }
    } else {
      const at = entries.findIndex(e => nameOf(e) === segments[0]);
      let child: string | null = null;
      if (at >= 0) {
        const m = /^(\d+) (\w+) ([0-9a-f]+)\t/.exec(entries[at]!);
        if (m === null || m[2] !== 'tree') return { why: `${segments[0]} in the tip's tree is not a directory` };
        child = m[3]!;
      }
      const built = rebuild(child, segments.slice(1));
      if ('why' in built) return built;
      const entry = `040000 tree ${built.oid}\t${segments[0]}`;
      if (at >= 0) entries[at] = entry; else entries.push(entry);
    }
    const made = git(['mktree', '-z'], entries.map(e => `${e}\0`).join(''));
    if (made.status !== 0) return { why: 'a tree for the recording commit could not be made' };
    return { oid: made.stdout.toString('utf8').trim() };
  };
  const tree = rebuild(baseTree, LOCATION_SEGMENTS);
  if ('why' in tree) return { ok: false, why: tree.why };
  const commit = git(['commit-tree', tree.oid, ...(tipRead.tip === null ? [] : ['-p', tipRead.tip]), '-F', '-'], input.message);
  if (commit.status !== 0) return { ok: false, why: 'the recording commit could not be made' };
  const oid = commit.stdout.toString('utf8').trim();
  const moved = git(['update-ref', '-m', 'launch consent: record', LAUNCH_REF, oid, tipRead.tip ?? zero]);
  if (moved.status !== 0) return { ok: false, why: `${LAUNCH_REF} could not be moved from ${tipRead.tip ?? 'absent'} (it may have moved); the recording commit ${oid} is on no reference` };
  return { ok: true, commit: oid, files: blobs.map(b => `${LAUNCH_RECORD_DIR}/${b.name}`) };
}

/** The governance home's top level, Git directory and common Git directory, real paths; null when it is not a Git repository. */
export function homeGitDirs(home: string, git: GitRun = homeGit(home)): { readonly top: string; readonly gitDir: string; readonly common: string } | null {
  const out = text(git, ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir']);
  if (out === null) return null;
  const [top, gitDir, common] = out.trim().split('\n');
  if (top === undefined || gitDir === undefined || common === undefined) return null;
  const real = (p: string) => { try { return fs.realpathSync(p); } catch { return p; } };
  return { top: real(top), gitDir: real(gitDir), common: real(common) };
}

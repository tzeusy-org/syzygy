import { execFileSync } from 'node:child_process';
import { sha256, decodeUtf8 } from '@syzygy/support';

export const URL_PARENT_DEFAULT_REF = 'refs/remotes/origin/main';
export const URL_PARENT_TAG = 'polaris-dossier-url-declared-source-run-v2.1';
export const URL_PARENT_RECORD = '.syzygy/governance/decisions/AGENT-ADOPTIONS.md';
const TAG_REF = `refs/tags/${URL_PARENT_TAG}`;
export const URL_PARENT_REF_ARGS = ['for-each-ref', '--format=%(refname)%00%(objectname)%00%(symref)', URL_PARENT_DEFAULT_REF, TAG_REF] as const;
const PACKAGE = 'openspec/changes/dossier-url-declared-source-run/proposed';
const GOVERNANCE = '.syzygy/governance';
const REVIEWED_SUBJECTS = [
  [`${PACKAGE}/polaris-generation/spec.md`, 'e30836f902361c74943cc0cf69ae907a3e9d678a542b27676677e47c8a5fa865'],
  [`${PACKAGE}/contracts/DOSSIER-URL-LOCAL-MACHINE-CREDENTIAL-AMENDMENT.md`, 'fdbb30efae2b01946a8f8265b9b7bbbd81c89e007aacc94455f7527fcb19aa6d'],
  [`${GOVERNANCE}/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json`, '930efcc2cbdae55be92ce7929820e771f554502a9110e8ac5f8925132961e421'],
  [`${GOVERNANCE}/decisions/DOSSIER-URL-RUN-CONTRACT-APPLICABILITY.md`, '38e3b6f924c81187cfe7bb31e5383a994d98339689bb0256dd0c1763c8267386'],
] as const;
const INSTALLED_CLAUSES = [
  ['RFC-0003/manifests-and-namespace.md', 'RFC3-2'],
  ['RFC-0003/governance-homes-and-owner-acts.md', 'RFC3-15'],
  ['RFC-0003/governance-homes-and-owner-acts.md', 'RFC3-16'],
  ['RFC-0003/governance-homes-and-owner-acts.md', 'RFC3-16(a)'],
  ['RFC-0003/governance-homes-and-owner-acts.md', 'RFC3-16(b)'],
  ['RFC-0003/governance-homes-and-owner-acts.md', 'RFC3-16(d)'],
  ['RFC-0005/admission-and-boundary.md', 'RFC5-6'],
] as const;
const CONTRACT_SUBJECT = REVIEWED_SUBJECTS[1][0];
const MAX_SUBJECT_BYTES = 2_097_152;
const MAX_PARENT_REVISIONS = 64;
const CONTRACT_FILES = [...new Set(INSTALLED_CLAUSES.map(([file]) => `${GOVERNANCE}/contracts/rfcs/${file}`))];
const LEDGER_HEADER = '| Id | Date | Commit | What changed | Why | Revert | Tag |';
const LEDGER_DIVIDER = '|---|---|---|---|---|---|---|';
const NEXT_CLAUSE = /^\*\*RFC[0-9]+-[0-9]+(?:\([a-z]\))?(?:\.|\s+[—-])/mu;
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

export interface UrlParentAdoption {
  readonly rowId: string;
  readonly landedCommit: string;
  readonly defaultCommit: string;
  readonly tagObject: string;
  readonly subjects: readonly { readonly path: string; readonly sha256: string }[];
}

/** Parse enumerated ref names so Git's revision-name lookup cannot stand in for
 * a missing exact default or version reference. Both refs must be direct. */
export function parseUrlParentRefs(output: Buffer): { readonly defaultCommit: string; readonly tagObject: string } | null {
  const refs = new Map<string, string>();
  for (const row of output.toString('utf8').trimEnd().split('\n')) {
    const [name, oid, symbolic, ...extra] = row.split('\0');
    if (name !== URL_PARENT_DEFAULT_REF && name !== TAG_REF) continue;
    if (symbolic !== '' || extra.length !== 0 || oid === undefined || !COMMIT.test(oid) || refs.has(name)) return null;
    refs.set(name, oid);
  }
  const defaultCommit = refs.get(URL_PARENT_DEFAULT_REF), tagObject = refs.get(TAG_REF);
  return defaultCommit === undefined || tagObject === undefined ? null : { defaultCommit, tagObject };
}

function ledgerRows(record: string): string[][] | null {
  if (!record.startsWith('# Agent adoptions\n')) return null;
  const lines = record.split('\n');
  const tables: string[][][] = [];
  let fence: string | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line);
    if (fence !== undefined) {
      if (marker?.[1]?.startsWith(fence) && marker[2]?.trim() === '') fence = undefined;
      continue;
    }
    if (marker !== null) {
      fence = marker[1];
      continue;
    }
    // The ledger preamble is plain Markdown. Raw HTML could hide a sample table.
    if (tables.length === 0 && /<(?:[!?]|\/?[A-Za-z][A-Za-z0-9-]*(?:\s|\/?>))/u.test(line)) return null;
    if (line !== LEDGER_HEADER || lines[index + 1] !== LEDGER_DIVIDER) continue;
    const rows: string[][] = [];
    const ids = new Set<string>();
    for (let row = index + 2; lines[row]?.startsWith('|'); row += 1) {
      const cells = lines[row]!.split('|').slice(1, -1).map(field => field.trim());
      const id = cells[0];
      if (cells.length !== 7 || id === undefined || !/^A-[1-9][0-9]*$/u.test(id) || ids.has(id)) return null;
      ids.add(id);
      rows.push(cells);
    }
    tables.push(rows);
  }
  return tables.length === 1 ? tables[0]! : null;
}

/** A row is a locator. Its commit, exact installed bytes and tag still need Git proof. */
export function findUrlParentAdoption(record: string): { readonly id: string; readonly commit: string } | null {
  const rows = ledgerRows(record);
  if (rows === null) return null;
  const claimants = rows.filter(fields => fields[6] === `\`${URL_PARENT_TAG}\``);
  if (claimants.length !== 1) return null;
  const fields = claimants[0]!;
  const [id, date, commitCell, changed, reason, revert, tag] = fields;
  const commit = commitCell?.slice(1, -1) ?? '';
  if (fields.length !== 7 || !/^A-[1-9][0-9]*$/u.test(id ?? '') || !/^\d{4}-\d{2}-\d{2}$/u.test(date ?? '')
    || !COMMIT.test(commit) || commitCell !== `\`${commit}\`` || !reason || tag !== `\`${URL_PARENT_TAG}\``
    || revert !== `\`git revert -m 1 ${commit}\``) return null;
  const root = `https://github.com/tzeusy-org/syzygy/blob/${commit}/`;
  if (!REVIEWED_SUBJECTS.every(([file]) => changed?.includes(`](${root}${file})`))) return null;
  // Later decisions must identify the adoption or the subjects they affect.
  // A newer, expressly linked decision leaves this exact reviewed version unavailable.
  const adoption = new RegExp(`^\`?${id}\`?(?![A-Za-z0-9-])`, 'u');
  for (const later of rows.slice(rows.indexOf(fields) + 1)) {
    const action = /^(?:veto(?:es|ed)?|revert(?:s|ed)?|retire(?:s|d)?|reversion of|retirement of|supersede(?:s|d)?|amend(?:s|ed)?|replace(?:s|d)?|withdraw(?:s|n)?|revoke(?:s|d)?)\s+(?:of\s+)?(?:the\s+)?(?:adoption\s+)?(?:row\s+)?(.+)$/iu.exec(later[3] ?? '')?.[1];
    if (action === undefined) continue;
    const target = /^(?:`([^`]+)`|\[.+?\]\(https:\/\/github\.com\/tzeusy-org\/syzygy\/blob\/[0-9a-f]{40}\/(.+?)\)|([^\s,;]+))/u.exec(action);
    const subject = target?.[1] ?? target?.[2] ?? target?.[3];
    if (adoption.test(action) || (subject !== undefined && /^[a-f0-9]{7,64}$/u.test(subject) && commit.startsWith(subject))
      || subject === URL_PARENT_TAG || REVIEWED_SUBJECTS.some(([file]) => subject === file)) return null;
  }
  return { id: id!, commit };
}

function installedClausesMatch(reviewed: string, read: (file: string) => string): boolean {
  const docs = new Map<string, string>();
  for (const [module, clause] of INSTALLED_CLAUSES) {
    const prefix = `\n## Clause: ${clause}\n`;
    const start = reviewed.indexOf(prefix);
    if (start < 0) return false;
    const next = reviewed.indexOf('\n## Clause: ', start + prefix.length);
    const proposed = reviewed.slice(start + prefix.length, next < 0 ? reviewed.length : next);
    const opening = `\n**${clause}.`;
    const bodyStart = proposed.indexOf(opening);
    if (bodyStart < 0) return false;
    const body = proposed.slice(bodyStart).trimEnd() + '\n\n';
    const file = `${GOVERNANCE}/contracts/rfcs/${module}`;
    let installed = docs.get(file);
    if (installed === undefined) {
      installed = read(file);
      docs.set(file, installed);
    }
    const offset = installed.indexOf(opening);
    if (offset < 0 || offset !== installed.lastIndexOf(opening)) return false;
    const tail = installed.slice(offset + 1);
    const nextBoundary = clause === 'RFC3-16(d)' ? /^### /mu : NEXT_CLAUSE;
    const end = tail.slice(1).search(nextBoundary);
    const current = end < 0 ? tail : tail.slice(0, end + 1);
    if (current !== body.slice(1)) return false;
  }
  return true;
}

/** Consult only the trusted observing checkout's last observed default-branch
 * ref. This reads local Git objects and runs no fetch or user Git hooks. */
export function readUrlParentAdoption(
  root: string, originPolicySha256: string, previous?: UrlParentAdoption,
): UrlParentAdoption | null {
  try {
    if (originPolicySha256 !== REVIEWED_SUBJECTS[2][1]) return null;
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
    Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1' });
    const deadline = performance.now() + 10_000;
    const git = (...args: string[]): Buffer => {
      const remaining = Math.floor(deadline - performance.now());
      if (remaining <= 0) throw new Error('URL parent probe deadline');
      return execFileSync('git', ['--no-replace-objects', '-C', root, ...args], {
        env, maxBuffer: MAX_SUBJECT_BYTES, timeout: remaining, stdio: ['ignore', 'pipe', 'pipe'],
      });
    };
    const refs = parseUrlParentRefs(git(...URL_PARENT_REF_ARGS));
    if (refs === null) return null;
    const { defaultCommit, tagObject } = refs;
    const landedCommit = git('rev-parse', '--verify', `${tagObject}^{commit}`).toString('ascii').trim();
    if (!COMMIT.test(landedCommit) || git('cat-file', '-t', defaultCommit).toString('ascii') !== 'commit\n') return null;
    const firstParentAncestor = (ancestor: string): boolean => git('rev-list', '-1', '--first-parent',
      '--exclude-first-parent-only', ancestor, `^${defaultCommit}`).length === 0;
    if (!firstParentAncestor(landedCommit)) return null;
    if (previous !== undefined) {
      if (previous.landedCommit !== landedCommit || previous.tagObject !== tagObject
        || previous.defaultCommit === defaultCommit || !firstParentAncestor(previous.defaultCommit)) return null;
    }
    const show = (commit: string, file: string): Buffer => git('show', `${commit}:${file}`);
    const utf8 = (bytes: Buffer): string => {
      const text = decodeUtf8(bytes);
      if (text === undefined) throw new Error('URL parent text');
      return text;
    };
    const record = show(defaultCommit, URL_PARENT_RECORD), authority = findUrlParentAdoption(utf8(record));
    if (authority?.commit !== landedCommit || (previous !== undefined && previous.rowId !== authority.id)) return null;
    const historyStart = previous?.defaultCommit ?? landedCommit;
    const interval = `${historyStart}..${defaultCommit}`;
    const changed = (limit: number, paths: readonly string[]): string[] => {
      const result = git('rev-list', `--max-count=${limit}`, '--first-parent', interval, '--', ...paths).toString('ascii').trim();
      const commits = result === '' ? [] : result.split('\n');
      if (!commits.every(commit => COMMIT.test(commit))) throw new Error('URL parent history');
      return commits;
    };
    if (changed(1, REVIEWED_SUBJECTS.map(([file]) => file)).length !== 0) return null;
    const ledgerRevisions = changed(MAX_PARENT_REVISIONS + 1, [URL_PARENT_RECORD]);
    let governingRows = ledgerRows(utf8(show(historyStart, URL_PARENT_RECORD)));
    if (ledgerRevisions.length > MAX_PARENT_REVISIONS || governingRows === null) return null;
    for (const commit of ledgerRevisions.reverse()) {
      const document = utf8(show(commit, URL_PARENT_RECORD));
      const nextRows = ledgerRows(document);
      if (nextRows === null || governingRows.some((row, index) =>
        row.some((cell, column) => cell !== nextRows[index]?.[column]))) return null;
      if (nextRows.some(row => row[6] === `\`${URL_PARENT_TAG}\``) && findUrlParentAdoption(document)?.commit !== landedCommit) return null;
      governingRows = nextRows;
    }
    const subjects: { path: string; sha256: string }[] = [];
    for (const [file, digest] of REVIEWED_SUBJECTS) {
      if (sha256(show(landedCommit, file)) !== digest || sha256(show(defaultCommit, file)) !== digest) return null;
      subjects.push({ path: file, sha256: digest });
    }
    const reviewed = utf8(show(landedCommit, CONTRACT_SUBJECT));
    if (!installedClausesMatch(reviewed, file => utf8(show(landedCommit, file)))) return null;
    const revisions = changed(MAX_PARENT_REVISIONS + 1, CONTRACT_FILES);
    if (revisions.length > MAX_PARENT_REVISIONS || revisions.some(commit =>
      !installedClausesMatch(reviewed, file => utf8(show(commit, file))))) return null;
    if (!installedClausesMatch(reviewed, file => {
      const raw = show(defaultCommit, file);
      subjects.push({ path: file, sha256: sha256(raw) });
      return utf8(raw);
    })) return null;
    const finalRefs = parseUrlParentRefs(git(...URL_PARENT_REF_ARGS));
    if (finalRefs?.defaultCommit !== defaultCommit || finalRefs.tagObject !== tagObject) return null;
    return { rowId: authority.id, landedCommit, defaultCommit, tagObject, subjects };
  } catch { return null; }
}

import { execFileSync } from 'node:child_process';
import { sha256, decodeUtf8 } from '@syzygy/support';

export const URL_PARENT_DEFAULT_REF = 'refs/remotes/origin/main';
export const URL_PARENT_TAG = 'polaris-dossier-url-declared-source-run-v2.1';
export const URL_PARENT_RECORD = '.syzygy/governance/decisions/AGENT-ADOPTIONS.md';
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
const NEXT_CLAUSE = /^\*\*RFC[0-9]+-[0-9]+(?:\([a-z]\))?(?:\.|\s+[—-])/mu;
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

export interface UrlParentAdoption {
  readonly landedCommit: string;
  readonly defaultCommit: string;
  readonly subjects: readonly { readonly path: string; readonly sha256: string }[];
}

/** A row is a locator. Its commit, exact installed bytes and tag still need Git proof. */
export function findUrlParentAdoption(record: string): { readonly id: string; readonly commit: string } | null {
  const rows = record.split('\n').filter(line => line.startsWith('|')).map(line => line.split('|').slice(1, -1).map(field => field.trim()));
  const claimants = rows.filter(fields => fields.includes(`\`${URL_PARENT_TAG}\``));
  if (claimants.length !== 1) return null;
  const fields = claimants[0]!;
  const [id, date, commitCell, changed, reason, revert, tag] = fields;
  const commit = commitCell?.slice(1, -1) ?? '';
  if (fields.length !== 7 || !/^A-[1-9][0-9]*$/u.test(id ?? '') || !/^\d{4}-\d{2}-\d{2}$/u.test(date ?? '')
    || !COMMIT.test(commit) || commitCell !== `\`${commit}\`` || !reason || tag !== `\`${URL_PARENT_TAG}\``
    || revert !== `\`git revert -m 1 ${commit}\``) return null;
  const root = `https://github.com/tzeusy-org/syzygy/blob/${commit}/`;
  if (!REVIEWED_SUBJECTS.every(([file]) => changed?.includes(`](${root}${file})`))) return null;
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
    const git = (...args: string[]): Buffer => execFileSync('git', ['--no-replace-objects', '-C', root, ...args], {
      env, maxBuffer: MAX_SUBJECT_BYTES, timeout: 10_000, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const ref = (name: string): string => {
      const commit = git('rev-parse', '--verify', `${name}^{commit}`).toString('ascii').trim();
      if (!COMMIT.test(commit)) throw new Error('URL parent ref');
      return commit;
    };
    const defaultCommit = ref(URL_PARENT_DEFAULT_REF), landedCommit = ref(`refs/tags/${URL_PARENT_TAG}`);
    git('merge-base', '--is-ancestor', landedCommit, defaultCommit);
    if (previous !== undefined) {
      if (previous.landedCommit !== landedCommit || previous.defaultCommit === defaultCommit) return null;
      git('merge-base', '--is-ancestor', previous.defaultCommit, defaultCommit);
    }
    const show = (commit: string, file: string): Buffer => git('show', `${commit}:${file}`);
    const utf8 = (bytes: Buffer): string => {
      const text = decodeUtf8(bytes);
      if (text === undefined) throw new Error('URL parent text');
      return text;
    };
    const record = show(defaultCommit, URL_PARENT_RECORD), authority = findUrlParentAdoption(utf8(record));
    if (authority?.commit !== landedCommit) return null;
    const subjects: { path: string; sha256: string }[] = [];
    for (const [file, digest] of REVIEWED_SUBJECTS) {
      if (sha256(show(landedCommit, file)) !== digest || sha256(show(defaultCommit, file)) !== digest) return null;
      subjects.push({ path: file, sha256: digest });
    }
    const reviewed = utf8(show(landedCommit, CONTRACT_SUBJECT));
    if (!installedClausesMatch(reviewed, file => utf8(show(landedCommit, file)))) return null;
    if (!installedClausesMatch(reviewed, file => {
      const raw = show(defaultCommit, file);
      subjects.push({ path: file, sha256: sha256(raw) });
      return utf8(raw);
    })) return null;
    if (ref(URL_PARENT_DEFAULT_REF) !== defaultCommit || ref(`refs/tags/${URL_PARENT_TAG}`) !== landedCommit) return null;
    return { landedCommit, defaultCommit, subjects };
  } catch { return null; }
}

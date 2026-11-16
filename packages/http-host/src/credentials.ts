import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { admitClient, type AdmissionResult, type Credential } from '@syzygy/cap1-core';

// RT3 — local credential lifecycle (CAP1-REQ-012's admission context;
// RFC5-3: classification by credential presented, never network
// location; RFC5-5/RFC5-6: the daemon's real credential store, arriving
// exactly where core admission.ts said it would).
//
// Posture:
// - Issuance and verification are LOCAL. No external identity provider,
//   no network call, no clock read: the token is random bytes minted
//   once and persisted under the daemon state directory.
// - Fail-closed polarity, inherited from core `admitClient`: every arm
//   that is not affirmatively admitted is core's own named refusal
//   `{ admitted: false, served: 'nothing' }` — never a bare error
//   string, never a partial admission. This module NARROWS core
//   admission (the token must equal the minted token), it never widens
//   it: a credential core would refuse is refused here by core itself,
//   before any comparison runs.
// - Every filesystem write is routed through `authorizeStateWrite` —
//   the daemon's only write boundary (it performs no governed-plane
//   write). The state directory is the daemon's ONE authorized write home;
//   nothing here can write anywhere else.

// The fixed credential location inside the state directory. Fixed here
// once; nothing configures it (same discipline as the declaration
// path in observation.ts).
export const CREDENTIAL_FILE_NAME = 'machine-credential.token' as const;

// Owner-only: the token admits machine clients, so its bytes are
// readable by the daemon's own user and nobody else.
export const CREDENTIAL_FILE_MODE = 0o600;
export const STATE_DIR_MODE = 0o700;

// Token size in random bytes; persisted as lowercase hex (64 chars).
export const CREDENTIAL_TOKEN_BYTES = 32;

// --- State-directory write boundary -------------------------------------

// The daemon's runtime writes fall in exactly one plane: the daemon state
// directory (credential and daemon state — THIS boundary). It performs no
// governed-plane write (openspec/**, .syzygy/**; CAP1-REQ-061, observed
// externally by the cap1-system write-boundary test). Judgment is on the
// NORMALIZED path, symlink reality included, and every arm that is not
// affirmatively authorized is a named refusal.
export const STATE_WRITE_REFUSALS = [
  'degenerate-input',
  'traversal',
  'symlink-escape',
] as const;

export type StateWriteRefusalName = (typeof STATE_WRITE_REFUSALS)[number];

export type StateWriteAuthorization =
  | {
      readonly authorized: true;
      /** Absolute filesystem path the write will land at (normalized). */
      readonly absolutePath: string;
    }
  | {
      readonly authorized: false;
      readonly candidatePath: string;
      readonly refusedBy: StateWriteRefusalName;
      readonly detail: string;
    };

/** Nearest existing ancestor of an absolute path (always terminates at '/'). */
function nearestExistingAncestor(absolutePath: string): string {
  let current = absolutePath;
  for (;;) {
    if (fs.existsSync(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return current;
    }
    current = parent;
  }
}

function isWithin(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root + path.sep);
}

/**
 * Authorize a write inside the daemon state directory. Normalizes
 * first, then enforces containment (lexical and via symlink reality).
 * Pure decision; performs no write.
 */
export function authorizeStateWrite(
  stateDir: string,
  candidatePath: string,
): StateWriteAuthorization {
  const root = path.resolve(stateDir);

  const trimmed = candidatePath.trim();
  if (trimmed === '' || trimmed === '.') {
    return {
      authorized: false,
      candidatePath,
      refusedBy: 'degenerate-input',
      detail: 'empty or "." candidate names no file',
    };
  }

  const resolved = path.resolve(root, candidatePath);
  if (resolved === root) {
    return {
      authorized: false,
      candidatePath,
      refusedBy: 'degenerate-input',
      detail: 'candidate normalizes to the state directory itself, naming no file',
    };
  }
  if (!isWithin(root, resolved)) {
    return {
      authorized: false,
      candidatePath,
      refusedBy: 'traversal',
      detail: `normalized path ${resolved} escapes the state directory ${root}`,
    };
  }

  // Symlink escape: a component under the state dir may be a symlink
  // whose target lives outside it. Judge the write target's REAL
  // location (nearest existing ancestor resolved, unbuilt tail
  // re-appended).
  const realRoot = fs.existsSync(root) ? fs.realpathSync(root) : root;
  const ancestor = nearestExistingAncestor(resolved);
  const realAncestor = fs.realpathSync(ancestor);
  const tail = path.relative(ancestor, resolved);
  const realTarget = tail === '' ? realAncestor : path.join(realAncestor, tail);
  if (!isWithin(realRoot, realTarget) || realTarget === realRoot) {
    return {
      authorized: false,
      candidatePath,
      refusedBy: 'symlink-escape',
      detail: `real location ${realTarget} leaves the state directory ${realRoot}`,
    };
  }

  return { authorized: true, absolutePath: resolved };
}

// --- Credential provisioning ---------------------------------------------

// The three provisioning outcomes, named. The failure arm carries no
// token: an unprovisionable credential can never admit anyone.
export type CredentialProvision =
  | {
      readonly kind: 'minted';
      readonly path: string;
      readonly token: string;
    }
  | {
      readonly kind: 'reused';
      readonly path: string;
      readonly token: string;
    }
  | {
      readonly kind: 'unprovisionable';
      readonly path: string;
      readonly detail: string;
    };

// --- Reuse inspection -----------------------------------------------------

// The stat fields reuse inspection reads. Injectable so a foreign owner
// can be exercised without a second user account.
export type CredentialStat = Pick<
  fs.Stats,
  'mode' | 'uid' | 'isFile' | 'isDirectory' | 'isSymbolicLink'
>;

export interface CredentialInspection {
  /** Defaults to `fs.lstatSync`; never follows a symlink. */
  readonly lstat?: (target: string) => CredentialStat;
  /**
   * Defaults to `process.getuid()` when the key is absent. Present and
   * undefined stands for a platform without uids: every reuse refuses.
   */
  readonly uid?: number | undefined;
}

function isNotFound(cause: unknown): boolean {
  return (cause as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';
}

function octal(mode: number): string {
  return `0${(mode & 0o777).toString(8)}`;
}

/**
 * Decide whether an existing credential may be trusted for reuse. Returns
 * the refusal detail, or undefined when the token is private to this uid:
 * an owner-only regular file in a directory this uid owns and nobody else
 * can write. A 0755 directory is accepted — others may list it, but a
 * 0600 file inside it is still unreadable to them. Reads no token bytes.
 */
function inspectReuse(
  stateDir: string,
  fileStat: CredentialStat,
  lstat: (target: string) => CredentialStat,
  uid: number | undefined,
): string | undefined {
  if (uid === undefined) {
    return 'existing credential cannot be verified: this platform reports no process uid';
  }

  let dirStat: CredentialStat;
  try {
    dirStat = lstat(stateDir);
  } catch (cause) {
    return `state directory cannot be inspected: ${
      cause instanceof Error ? cause.message : String(cause)
    }`;
  }
  if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) {
    return 'state directory is a symbolic link or not a directory; refusing to reuse the credential inside it';
  }
  if (dirStat.uid !== uid) {
    return `state directory is owned by uid ${dirStat.uid}, not the daemon's uid ${uid}; refusing to reuse the credential inside it`;
  }
  if ((dirStat.mode & 0o022) !== 0) {
    return `state directory mode ${octal(dirStat.mode)} is group- or other-writable; another user could replace the credential (chmod 700 to repair)`;
  }

  if (fileStat.isSymbolicLink()) {
    return 'existing credential file is a symbolic link; refusing to read a token through it';
  }
  if (!fileStat.isFile()) {
    return 'existing credential file is not a regular file';
  }
  if (fileStat.uid !== uid) {
    return `existing credential file is owned by uid ${fileStat.uid}, not the daemon's uid ${uid}`;
  }
  if ((fileStat.mode & 0o077) !== 0) {
    return `existing credential file mode ${octal(fileStat.mode)} grants group or other access; another user may hold the token (chmod 600 to repair, or delete it to mint afresh)`;
  }
  return undefined;
}

/**
 * Ensure the daemon's machine credential exists under `stateDir`.
 *
 * First start: mints a random token (node:crypto), persists it at
 * `<stateDir>/machine-credential.token` with mode 0600, creating the
 * state directory (mode 0700) if needed. Restart: reads and reuses the
 * persisted token unchanged. An existing-but-empty or unreadable file
 * is a NAMED failure — never a silent re-mint (re-minting would
 * silently invalidate a credential some client may hold; the operator
 * deletes the file to rotate deliberately).
 *
 * Reuse is trusted only when no other user can have read or planted
 * the token (`inspectReuse`): every other existing file is a named
 * failure, refused before a byte of it is read.
 *
 * Writes: at most the state directory itself and the credential file,
 * the latter routed through `authorizeStateWrite`. Nothing else is
 * touched.
 */
export function ensureCredential(
  stateDir: string,
  inspection: CredentialInspection = {},
): CredentialProvision {
  const write = authorizeStateWrite(stateDir, CREDENTIAL_FILE_NAME);
  if (!write.authorized) {
    return {
      kind: 'unprovisionable',
      path: path.resolve(stateDir, CREDENTIAL_FILE_NAME),
      detail: `credential path refused by state-write boundary (${write.refusedBy}): ${write.detail}`,
    };
  }
  const credentialPath = write.absolutePath;
  const lstat = inspection.lstat ?? fs.lstatSync;

  // lstat, not existsSync: a dangling symlink at the credential path is
  // an existing entry to refuse, never an absence to mint through.
  let fileStat: CredentialStat | undefined;
  try {
    fileStat = lstat(credentialPath);
  } catch (cause) {
    if (!isNotFound(cause)) {
      return {
        kind: 'unprovisionable',
        path: credentialPath,
        detail: `existing credential file cannot be inspected: ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
      };
    }
  }

  if (fileStat !== undefined) {
    const refusal = inspectReuse(
      path.resolve(stateDir),
      fileStat,
      lstat,
      'uid' in inspection ? inspection.uid : process.getuid?.(),
    );
    if (refusal !== undefined) {
      return { kind: 'unprovisionable', path: credentialPath, detail: refusal };
    }
    let raw: string;
    try {
      raw = fs.readFileSync(credentialPath, 'utf8');
    } catch (cause) {
      return {
        kind: 'unprovisionable',
        path: credentialPath,
        detail: `existing credential file is unreadable: ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
      };
    }
    const token = raw.trim();
    if (token.length === 0) {
      return {
        kind: 'unprovisionable',
        path: credentialPath,
        detail:
          'existing credential file is empty; delete it to mint a fresh credential deliberately',
      };
    }
    return { kind: 'reused', path: credentialPath, token };
  }

  const token = randomBytes(CREDENTIAL_TOKEN_BYTES).toString('hex');
  try {
    fs.mkdirSync(path.resolve(stateDir), { recursive: true, mode: STATE_DIR_MODE });
    fs.writeFileSync(credentialPath, token, {
      encoding: 'utf8',
      mode: CREDENTIAL_FILE_MODE,
    });
  } catch (cause) {
    return {
      kind: 'unprovisionable',
      path: credentialPath,
      detail: `credential could not be persisted: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    };
  }
  return { kind: 'minted', path: credentialPath, token };
}

// --- Credential verification ---------------------------------------------

/**
 * Map an incoming `Authorization` header onto the core `Credential`
 * type. Anything that is not exactly a Bearer scheme with a non-empty
 * token is a NOT-PRESENTED credential — there is no "malformed" arm
 * wider than core's vocabulary, so every malformation refuses through
 * core `admitClient` itself.
 */
export function credentialFromAuthorizationHeader(
  header: string | readonly string[] | undefined,
): Credential {
  if (typeof header !== 'string') {
    return { presented: false };
  }
  const match = /^Bearer (.+)$/.exec(header);
  const token = match?.[1];
  if (token === undefined) {
    return { presented: false };
  }
  return { presented: true, token };
}

// Constant-time token comparison: both sides are hashed to equal-length
// digests first so `timingSafeEqual` is applicable whatever the
// presented token's length, and no length information leaks through an
// early return.
function tokensEqual(presented: string, expected: string): boolean {
  const a = createHash('sha256').update(presented, 'utf8').digest();
  const b = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(a, b);
}

/**
 * Verify a presented credential against the daemon's minted token.
 *
 * Core `admitClient` decides FIRST (its polarity may never be widened:
 * a non-presented or empty credential is refused by core itself); this
 * layer then narrows admission to the one minted token. Every refusal
 * is core's own named vocabulary — `{ admitted: false, served:
 * 'nothing' }` — never a bare string.
 */
export function verifyCredential(
  expectedToken: string,
  credential: Credential,
): AdmissionResult {
  const admission = admitClient(credential);
  if (!admission.admitted) {
    return admission;
  }
  if (!credential.presented || !tokensEqual(credential.token, expectedToken)) {
    return { admitted: false, served: 'nothing' };
  }
  return admission;
}

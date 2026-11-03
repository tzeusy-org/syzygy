
import { decodeUtf8 } from '@syzygy/support';

import { parseGitLsTree } from './git-tree.js';
import { gitRunnerFor } from './project-shape-observation.js';
import type { PocProvenance } from './model.js';

const CODE_LANGUAGE_CLASSIFICATIONS = [
  'typescript',
  'javascript',
  'python',
  'markdown',
  'json',
  'yaml',
  'shell',
  'html',
  'css',
  'sql',
  'toml',
  'other',
] as const;

export type CodeLanguageClassification = (typeof CODE_LANGUAGE_CLASSIFICATIONS)[number];

const EXTENSION_LANGUAGE: Readonly<Record<string, CodeLanguageClassification>> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.json': 'json',
  '.jsonl': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sh': 'shell',
  '.bash': 'shell',
  '.html': 'html',
  '.css': 'css',
  '.sql': 'sql',
  '.toml': 'toml',
};

function classifyLanguage(path: string): CodeLanguageClassification {
  const dot = path.lastIndexOf('.');
  const slash = path.lastIndexOf('/');
  if (dot <= slash) {
    return 'other';
  }
  const extension = path.slice(dot).toLowerCase();
  return EXTENSION_LANGUAGE[extension] ?? 'other';
}

export interface CodeStructureFileEntry {
  readonly path: string;
  readonly sizeBytes: number;
  readonly digest: string;
  readonly language: CodeLanguageClassification;
}

/**
 * POC-REQ-001 "One statement of provenance": the observation names its
 * revision once, in the shared `PocProvenance` shape the entities and
 * relationships carry, and no entry restates it. `capturedAt` is the second
 * half of the observation's identity, not a second statement of provenance.
 */
export interface CodeStructureObserved {
  readonly kind: 'observed';
  readonly provenance: PocProvenance;
  readonly capturedAt: string;
  readonly files: readonly CodeStructureFileEntry[];
}

interface CodeStructureUnknown {
  readonly kind: 'unknown';
  readonly reason: string;
}

export type CodeStructureResult = CodeStructureObserved | CodeStructureUnknown;

export interface ObserveCodeStructureInput {
  readonly repoRoot: string;
  readonly revision: string;
  readonly capturedAt: string;
  /** The provenance record's `source`; the model passes its git provenance source. */
  readonly provenanceSource?: string;
  /** Returns git's stdout decoded as strict UTF-8, or throws; a replacing decoder would record a lossy path as Observed. */
  readonly runGit?: (repoRoot: string, args: readonly string[]) => string;
}

/** Git's output is not valid UTF-8: a path a JS string cannot carry exactly. */
class NonUtf8GitOutput extends Error {}

/** The head git prints for every gitlink (`-l` pads the size column, which is `-`). A record is dropped only when it starts with this. */
const GITLINK_HEAD = /^160000 commit [0-9a-f]{40,64} +-\t/;
/** Longest head git can print: mode, type, a 64-digit id, the padded size column and the tab. */
const GITLINK_HEAD_BYTES = 128;

/**
 * Drops each NUL-terminated record whose head is a well-formed gitlink (mode 160000); any other record, a malformed one starting `160000` included, is kept for the parser to refuse. A gitlink is a commit of another repository, not a file of this revision,
 * and its path is never recorded, so a submodule path that is not UTF-8, or that the parser cannot read, must not fail the listing.
 * An unterminated tail is kept, for the NUL-termination check to refuse.
 */
function withoutGitlinkRecords(bytes: Buffer): Buffer {
  const kept: Buffer[] = [];
  let start = 0;
  for (let end = bytes.indexOf(0, start); end !== -1; end = bytes.indexOf(0, start)) {
    const record = bytes.subarray(start, end + 1);
    // The head is ASCII; latin1 maps each byte to one code unit, so the path after the tab, whatever its bytes, is never decoded.
    const head = record.subarray(0, GITLINK_HEAD_BYTES).toString('latin1');
    if (!GITLINK_HEAD.test(head)) kept.push(record);
    start = end + 1;
  }
  if (start < bytes.length) kept.push(bytes.subarray(start));
  return Buffer.concat(kept);
}

function defaultRunGit(repoRoot: string, args: readonly string[]): string {
  // The one production Git runner (same flags, buffer bound and stdio as the PWB reader's); the decode below is this observer's own.
  const stdout = gitRunnerFor(repoRoot)(args);
  const bytes = Buffer.from(stdout.buffer, stdout.byteOffset, stdout.byteLength);
  // The gitlink filter runs inside the try, as the decode always did: a copy it cannot allocate is reported like the bytes that
  // could not be decoded, so the Unknown reason for a failure here is the one this module has always given.
  try {
    const text = decodeUtf8(withoutGitlinkRecords(bytes));
    if (text !== undefined) return text;
  } catch {
    // falls through to the refusal below
  }
  throw new NonUtf8GitOutput();
}

const SHA1_OBJECT_ID = /^[0-9a-f]{40}$/;

/**
 * `git ls-tree` reads only tree/blob metadata for the named revision; it
 * never opens blob contents, so this observer structurally cannot leak
 * file bytes (POC-REQ-002). `-z` makes git emit each path unquoted: without
 * it git C-quotes a path holding a special or non-ASCII byte, and the quoted
 * form was recorded as the path (syzygy-bpyt.6.1). The bytes are decoded as
 * strict UTF-8, so a path that is not valid UTF-8 makes the inventory
 * Unknown instead of a replacement-character path that can collide with
 * another. Submodule gitlink records are dropped first, before decoding and
 * before parsing, since their paths are never recorded. A record the shared
 * parser cannot read, or a listing that is not NUL-terminated, makes the
 * whole inventory Unknown, never a skip.
 */
export function observeCodeStructure(input: ObserveCodeStructureInput): CodeStructureResult {
  const runGit = input.runGit ?? defaultRunGit;
  let raw: string;
  try {
    raw = runGit(input.repoRoot, ['ls-tree', '-r', '-z', '-l', input.revision]);
  } catch (error) {
    if (error instanceof NonUtf8GitOutput) {
      return { kind: 'unknown', reason: 'code-structure observation produced a path that is not valid UTF-8' };
    }
    return {
      kind: 'unknown',
      reason: 'repository or revision was unreadable during code-structure observation',
    };
  }

  const malformed: CodeStructureUnknown = {
    kind: 'unknown',
    reason: 'code-structure observation produced a malformed inventory entry',
  };
  // `-z` ends every record with NUL; a listing that does not is not the format asked for.
  if (raw !== '' && !raw.endsWith('\0')) {
    return malformed;
  }
  // A submodule gitlink (mode 160000) is not a file of this revision and its path is never recorded, so its record is dropped before
  // parsing, whichever runner answered; the default runner already dropped it from git's bytes, before decoding.
  const parsed = parseGitLsTree(raw.split('\0').filter((record) => !GITLINK_HEAD.test(record)).join('\0'));
  if (parsed.kind === 'malformed') {
    return malformed;
  }
  const files: CodeStructureFileEntry[] = [];
  // Only blobs are files of this revision.
  for (const entry of parsed.entries.filter((candidate) => candidate.type === 'blob')) {
    // The digest names its scheme; an id of another object format would make it false.
    if (entry.sizeBytes === undefined || !SHA1_OBJECT_ID.test(entry.objectId)) {
      return malformed;
    }
    files.push({
      path: entry.path,
      sizeBytes: entry.sizeBytes,
      digest: `git-blob-sha1:${entry.objectId}`,
      language: classifyLanguage(entry.path),
    });
  }

  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  return {
    kind: 'observed',
    provenance: {
      kind: 'git-revision',
      source: input.provenanceSource ?? 'Observed repository',
      revision: input.revision,
    },
    capturedAt: input.capturedAt,
    files,
  };
}

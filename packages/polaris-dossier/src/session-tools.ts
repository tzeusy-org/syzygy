import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, realpath, rename, unlink, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, sha256 } from '@syzygy/support';
import { authorRule, awaitRule, type BrokerResponse, type BrokerRunner } from './broker.js';
import { checkDraftShape, localDraftSchema } from './draft-schema.js';
import { bindUrlSourceReader } from './url-source-reader.js';
import { sourceBindingSha256, type RecordedRunConfig } from './run-record.js';
import type { DossierScreen } from './screen.js';
import { SESSION_CONTENT_CLASSES, type SessionBinding, type SessionContentClass, type SessionTool } from './session-egress-policy.js';
import type { SessionMcpTool } from './session-mcp.js';
import { invokeUrlSessionControl, isUrlSessionControlPort, type UrlSessionControlPort } from './session-control.js';
import { urlDossierReportExit } from './url-dossier-result.js';
import { URL_DESIGN_VIEW_ARTIFACT } from './url-design-view.js';
import type { ViewRole } from './session-view.js';

const MAX_FILE_BYTES = 1_048_576;
const JSON_BOUNDS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 } as const;
const DRAFT_BOUNDS = { maxBytes: MAX_FILE_BYTES, maxNodes: 65_536, maxDepth: 16 } as const;
const PLAIN_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;
const HELPER_PACKET = /^(?:round-[1-9][0-9]{0,5}\/)?(?:packet\.json|packet\.sha256|brief\.md|brief\.json|draft\.schema\.json|verdict\.schema\.json)$/u;
const RAW_HELPER_PACKET = /^(?:round-[1-9][0-9]{0,5}\/)?packet\.(?:json|sha256)$/u;
const AUTHOR_ARTIFACT = /^(?:brief\.md|brief\.json|draft\.schema\.json|drafts\/next\.json|checks\/rev-(?:0|[1-9][0-9]{0,5})\.json)$/u;
// A recipient reads only a copy independently registered by the trusted
// producer bridge, beneath its own directory. This grants no other role tree.
const REPAIR_FEEDBACK = /^feedback\/(?:fidelity|design)-verdict-(?:0|[1-9][0-9]{0,5})\.json$/u;
export interface SessionToolOrigins {
  readonly digest: string;
  readonly classes: readonly SessionContentClass[];
  readonly originIds: readonly string[];
}
export interface SessionToolsReceipt {
  readonly binding: SessionBinding;
  readonly id: string;
  readonly kind: 'tool-result';
  readonly toolName: SessionTool;
  readonly toolInput: Readonly<Record<string, unknown>>;
  /** Exact JSON text the stdio shim emits, checked against the bounded canonical encoder for this closed reply schema. */
  readonly canonicalText: string;
  readonly classes: readonly SessionContentClass[];
  readonly originIds: readonly string[];
  readonly digest: string;
  readonly bytes: number;
}
export interface SessionDesignArtifactRead {
  readonly bytes: Uint8Array;
  readonly origins: SessionToolOrigins;
  readonly revalidate: () => void;
  readonly waitForSample?: () => Promise<void>;
  readonly close: () => void;
}
export interface SessionToolsOptions {
  readonly role: ViewRole;
  readonly run: string;
  readonly sessionDir: string;
  readonly record: RecordedRunConfig;
  readonly binding: SessionBinding;
  readonly screen: DossierScreen;
  /** The current policy's exact detector-only predicate. True or a thrown error excludes. */
  readonly scanSecrets: (text: string) => boolean;
  readonly reverify: () => Promise<boolean>;
  /** The root selects the packed or loose profile when it binds the source. */
  readonly sourceReader?: ReturnType<typeof bindUrlSourceReader>;
  readonly runDossier: BrokerRunner;
  readonly onReceipt: (receipt: SessionToolsReceipt, waitForSample?: () => Promise<void>) => void | Promise<void>;
  readonly artifactOrigins?: (relativePath: string, bytes: Uint8Array) => SessionToolOrigins | null | Promise<SessionToolOrigins | null>;
  /** Fresh audited view from the supervisor. Virtual paths never use role files. */
  readonly designArtifact?: (relativePath: string) => Promise<SessionDesignArtifactRead | null>;
  readonly inputOrigins?: (tool: SessionMcpTool, input: Readonly<Record<string, unknown>>, bytes: Uint8Array) => SessionToolOrigins | null | Promise<SessionToolOrigins | null>;
  /** Genuine root-issued capability; no provider schema or arbitrary command extension. */
  readonly urlControl?: UrlSessionControlPort;
  readonly dossierOrigins?: (argv: readonly string[], response: BrokerResponse) => SessionToolOrigins | null | Promise<SessionToolOrigins | null>;
}
export type SessionToolReply = Readonly<Record<string, unknown>> & { readonly ok: boolean };
type ReleaseReply = (reply: SessionToolReply, revalidate?: () => void) => void;
type Invocation = { readonly tool: SessionMcpTool; readonly input: Readonly<Record<string, unknown>> };
type Code = 'invalid-input' | 'binding-changed' | 'role-refused' | 'path-refused' | 'source-unavailable' | 'source-excluded'
  | 'artifact-unavailable' | 'content-excluded' | 'unknown-origin' | 'schema-refused' | 'command-refused'
  | 'dossier-refused' | 'operation-unavailable' | 'receipt-unavailable' | 'capacity-exhausted';
const REASONS: Readonly<Record<Code, string>> = {
  'invalid-input': 'Use the tool\'s bounded input schema.', 'binding-changed': 'The current run, pin, policy or provider could not be verified.',
  'role-refused': 'This tool is unavailable to this role.', 'path-refused': 'This role cannot access that artifact or source path.',
  'source-unavailable': 'The pinned source cannot be verified within the source bounds.',
  'source-excluded': 'The requested source is excluded; no source content or excluded object identity is returned.',
  'artifact-unavailable': 'The artifact is unavailable or is not a bounded regular file in this role\'s directory.',
  'content-excluded': 'The supplied or returned content is excluded by the current policy.',
  'unknown-origin': 'The exact content has no matching independently registered origin.',
  'schema-refused': 'The artifact does not match the run\'s bounded JSON schema.',
  'command-refused': 'Use only this role\'s fixed dossier operation and its permitted arguments.',
  'dossier-refused': 'The dossier operation did not complete; inspect the run through its permitted status operation.',
  'operation-unavailable': 'The requested operation could not complete.',
  'receipt-unavailable': 'The canonical tool reply could not be registered; no successful reply is released.',
  'capacity-exhausted': 'The session tool concurrency bound was reached.',
};
class Refused { constructor(readonly code: Code) {} }
const refuse = (code: Code): never => { throw new Refused(code); };
const failure = (code: Code): SessionToolReply => ({ ok: false, code, reason: REASONS[code] });
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'
  && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const exact = (value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean =>
  required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
const validText = (value: unknown, maxBytes = MAX_FILE_BYTES): value is string => typeof value === 'string'
  && Buffer.byteLength(value, 'utf8') <= maxBytes && Buffer.from(value, 'utf8').toString('utf8') === value
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
const metadataText = (value: unknown, maxBytes = MAX_FILE_BYTES): value is string => validText(value, maxBytes) && !/[\r\n\t]/u.test(value);
function relative(value: unknown): value is string {
  return metadataText(value, 4096) && value.length <= 4096 && value.length > 0 && !value.includes('\\')
    && !value.startsWith('/') && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}
const copy = <T>(value: T): T => deepFreeze(parseBoundedJson(encodeCanonicalJson(value, JSON_BOUNDS), JSON_BOUNDS)) as T;
function invocation(value: unknown): Invocation {
  const cloned = copy(value);
  if (!record(cloned) || !exact(cloned, ['tool', 'input']) || !record(cloned.input)) return refuse('invalid-input');
  const input = cloned.input;
  switch (cloned.tool) {
    case 'source_read':
      if (!exact(input, ['path'], ['offset', 'limit']) || !validText(input.path, 4096) || input.path.length > 4096
        || (input.path !== '' && input.path !== '.' && !relative(input.path))
        || (input.offset !== undefined && (!Number.isSafeInteger(input.offset) || (input.offset as number) < 0))
        || (input.limit !== undefined && (!Number.isSafeInteger(input.limit) || (input.limit as number) < 1 || (input.limit as number) > 2000))) return refuse('invalid-input');
      break;
    case 'artifact_read': if (!exact(input, ['path']) || !relative(input.path)) return refuse('invalid-input'); break;
    case 'artifact_write': if (!exact(input, ['path', 'content']) || !relative(input.path) || !validText(input.content)) return refuse('invalid-input'); break;
    case 'dossier_step':
      if (!exact(input, ['argv'], ['stdin']) || !Array.isArray(input.argv) || input.argv.length < 2 || input.argv.length > 16
        || !input.argv.every(arg => metadataText(arg, 4096)) || (input.stdin !== undefined && !validText(input.stdin))) return refuse('invalid-input');
      break;
    default: return refuse('invalid-input');
  }
  return cloned as unknown as Invocation;
}

/** Stable directory descriptors prevent a swapped child directory from redirecting an artifact operation.
 * The caller supplies canonical owned roots. This is not general credential or same-user isolation. */
async function parent(root: string, file: string): Promise<{ readonly directory: FileHandle; readonly name: string }> {
  if (!relative(file) || !path.isAbsolute(root) || await realpath(root) !== root) return refuse('artifact-unavailable');
  let directory = await open(root, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    const parts = file.split('/');
    for (const part of parts.slice(0, -1)) {
      const next = await open(`/proc/self/fd/${directory.fd}/${part}`, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      await directory.close(); directory = next;
    }
    return { directory, name: parts.at(-1)! };
  } catch (error) { await directory.close(); throw error; }
}
async function artifactBytes(root: string, name: string): Promise<Uint8Array> {
  const where = await parent(root, name);
  try {
    const file = await open(`/proc/self/fd/${where.directory.fd}/${where.name}`, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.nlink !== 1 || stat.size > MAX_FILE_BYTES) return refuse('artifact-unavailable');
      const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
      let length = 0;
      while (length < buffer.length) {
        const read = await file.read(buffer, length, buffer.length - length, null);
        if (read.bytesRead === 0) break;
        length += read.bytesRead;
      }
      if (length > MAX_FILE_BYTES) return refuse('artifact-unavailable');
      return buffer.subarray(0, length);
    } finally { await file.close(); }
  } finally { await where.directory.close(); }
}
async function writeDraft(run: string, bytes: Uint8Array): Promise<void> {
  const where = await parent(run, 'drafts/next.json');
  const base = `/proc/self/fd/${where.directory.fd}`;
  const pending = `${base}/.next-${randomBytes(16).toString('hex')}.tmp`;
  try {
    try {
      const current = await lstat(`${base}/next.json`);
      if (!current.isFile() || current.nlink !== 1) return refuse('artifact-unavailable');
    } catch (error) { if (error instanceof Refused || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const file = await open(pending, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try { await file.writeFile(bytes); } finally { await file.close(); }
    await rename(pending, `${base}/next.json`);
  } finally { try { await unlink(pending); } catch { /* absent after rename */ } await where.directory.close(); }
}

/** Four host-side operations. Role and all authority come from this factory, never request fields.
 * Replies to admitted requests are registered before delivery. Invalid or excluded inputs, changed
 * bindings, capacity refusals and failed receipt callbacks return only bounded refusals. */
export function createSessionTools(options: SessionToolsOptions): {
  readonly invoke: (value: unknown, release?: ReleaseReply) => Promise<SessionToolReply>;
  /** Pure role/schema check for provider tool-use admission. Actual authority,
   * input origins and current binding are checked again before any effect. */
  readonly validateToolInput: (name: SessionTool, input: Readonly<Record<string, unknown>>) => boolean;
} {
  // Snapshot callback ports before the first asynchronous operation.
  options = Object.freeze({ ...options });
  const urlControl = options.urlControl;
  const frozenRecord = copy(options.record);
  const binding = copy(options.binding);
  const run = path.resolve(options.run), sessionDir = path.resolve(options.sessionDir);
  const ownTarget = (given: unknown, expected: string): boolean => given === expected || given === `${expected}/`;
  const pin = frozenRecord.subject.pinnedRevision.commit;
  let sourceReader = options.sourceReader;
  let sequence = 0, pending = 0;
  let serial = Promise.resolve();
  const secretSafe = (text: string): boolean => { try { return !options.scanSecrets(text); } catch { return false; } };
  const agentSafe = (text: string): boolean => { try { return validText(text) && secretSafe(text) && options.screen.screenBody(text) === undefined; } catch { return false; } };
  const screenedJson = (text: string): unknown => {
    if (!agentSafe(text)) return refuse('content-excluded');
    let parsed: unknown;
    try { parsed = parseBoundedJson(text, DRAFT_BOUNDS); } catch { return refuse('schema-refused'); }
    const strings: string[] = [];
    const visit = (value: unknown): void => {
      if (typeof value === 'string') { if (!agentSafe(value)) refuse('content-excluded'); strings.push(value); }
      else if (Array.isArray(value)) for (const child of value) visit(child);
      else if (record(value)) for (const [key, child] of Object.entries(value)) { if (!agentSafe(key)) refuse('content-excluded'); visit(child); }
    };
    visit(parsed);
    if (!secretSafe(strings.join(''))) return refuse('content-excluded');
    return parsed;
  };
  const current = async (): Promise<void> => {
    try {
      if (!['author', 'inventory', 'fidelity', 'design'].includes(options.role) || !Object.values(binding).every(value => metadataText(value, 256) && PLAIN_ID.test(value) && agentSafe(value)) || binding.role !== options.role
        || binding.run !== path.basename(run) || binding.sourceBinding !== sourceBindingSha256(frozenRecord.subject)
        || binding.policy !== frozenRecord.subject.screeningPolicy.sha256 || binding.policy !== options.screen.policySha256
        || options.screen.policyId !== frozenRecord.subject.screeningPolicy.policyId || options.screen.policyVersion !== frozenRecord.subject.screeningPolicy.policyVersion
        || options.screen.visibility !== frozenRecord.subject.visibility.value
        || binding.provider !== frozenRecord.declared.agentProvider || binding.model !== frozenRecord.declared.model
        || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(pin) || await realpath(run) !== run
        || (options.role !== 'author' && await realpath(sessionDir) !== sessionDir) || !await options.reverify()) refuse('binding-changed');
    } catch { refuse('binding-changed'); }
  };
  const origin = (given: SessionToolOrigins | null | undefined, digest: string): SessionToolOrigins => {
    if (given === null || given === undefined || given.digest !== digest || !Array.isArray(given.classes) || given.classes.length === 0 || given.classes.length > 7
      || given.classes.some(value => !SESSION_CONTENT_CLASSES.includes(value)) || !Array.isArray(given.originIds)
      || given.originIds.length === 0 || given.originIds.length > 128 || given.originIds.some(value => !metadataText(value, 256) || !PLAIN_ID.test(value) || !agentSafe(value))) return refuse('unknown-origin');
    return copy({ digest, classes: [...new Set(given.classes)].sort(), originIds: [...new Set(given.originIds)].sort() });
  };
  const classesOf = (...sets: readonly (readonly SessionContentClass[])[]): readonly SessionContentClass[] => [...new Set(sets.flat())].sort();
  const idsOf = (...sets: readonly (readonly string[])[]): readonly string[] => [...new Set(sets.flat())].sort();
  const body = (bytes: Uint8Array): string => {
    try { const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); if (!validText(text)) refuse('content-excluded'); return text; }
    catch { return refuse('content-excluded'); }
  };
  const artifactAllowed = (file: string): boolean => {
    if (URL_DESIGN_VIEW_ARTIFACT.test(file)) return options.role === 'design' && options.designArtifact !== undefined;
    if (options.role === 'author') return AUTHOR_ARTIFACT.test(file) || REPAIR_FEEDBACK.test(file);
    if (options.role === 'inventory') return file === 'inventory-brief.md' || HELPER_PACKET.test(file) || REPAIR_FEEDBACK.test(file);
    return HELPER_PACKET.test(file) && (options.role !== 'design' || !RAW_HELPER_PACKET.test(file));
  };
  const artifact = async (file: string, design?: SessionDesignArtifactRead): Promise<{ text: string; origins: SessionToolOrigins }> => {
    if (!artifactAllowed(file)) return refuse('path-refused');
    let bytes: Uint8Array;
    if (URL_DESIGN_VIEW_ARTIFACT.test(file)) {
      if (!design || design.bytes.byteLength > MAX_FILE_BYTES) return refuse('artifact-unavailable');
      bytes = Uint8Array.from(design.bytes);
    } else {
      try { bytes = await artifactBytes(options.role === 'author' ? run : sessionDir, file); } catch { return refuse('artifact-unavailable'); }
    }
    const text = body(bytes);
    // Decoded JSON strings are screened too; escaping does not hide a detector match.
    if (file.endsWith('.json')) screenedJson(text);
    else if (!agentSafe(text)) return refuse('content-excluded');
    const supplied = design === undefined ? await options.artifactOrigins?.(file, new Uint8Array(bytes)) : design.origins;
    const origins = origin(supplied, sha256(bytes));
    return { text, origins };
  };
  const draft = (text: string): Uint8Array => {
    const value = screenedJson(text);
    if (checkDraftShape(localDraftSchema({ pinnedRevision: pin, maxQuestions: frozenRecord.declared.maxQuestions }), value).length !== 0) return refuse('schema-refused');
    return new TextEncoder().encode(text);
  };
  const source = async (input: Invocation['input']): Promise<{ reply: SessionToolReply; classes: readonly SessionContentClass[]; originIds: readonly string[] }> => {
    if (options.role !== 'author' && options.role !== 'inventory') return refuse('role-refused');
    const file = input.path as string, offset = input.offset as number | undefined ?? 0, limit = input.limit as number | undefined ?? 200;
    const clone = frozenRecord.subject.clone.path;
    const reader = (() => {
      try {
        sourceReader ??= bindUrlSourceReader({ clone, revision: pin, store: 'owned-loose', current: () => true });
        return sourceReader({ gitDir: path.join(clone, '.git'), revision: pin });
      } catch { return refuse('source-unavailable'); }
    })();
    if (file === '' || file === '.') {
      const tree = await reader.tree();
      await current();
      const entries = await reader.listTree();
      const paths = entries.filter(entry => (entry.mode === '100644' || entry.mode === '100755') && relative(entry.path)
        && agentSafe(entry.path) && options.screen.screenPath(entry.path) === undefined
        && SESSION_CONTENT_CLASSES.includes(options.screen.contentClass(entry.path) as SessionContentClass)).map(entry => entry.path).sort();
      const selected = paths.slice(offset, offset + limit);
      return { reply: { ok: true, kind: 'source-paths', paths: selected, offset, nextOffset: offset + selected.length < paths.length ? offset + selected.length : null,
        scope: 'path-classification-only; bodies may still be excluded', provenance: { commit: pin, tree } }, classes: ['code-structure'], originIds: [`tree:${tree}`] };
    }
    if (options.screen.screenPath(file) !== undefined) return refuse('source-excluded');
    const contentClass = options.screen.contentClass(file);
    if (contentClass === undefined || !SESSION_CONTENT_CLASSES.includes(contentClass)) return refuse('source-excluded');
    const blob = (await reader.readBlobs([file]))[0];
    if (!blob) return refuse('source-unavailable');
    if (blob.mode !== '100644' && blob.mode !== '100755') return refuse('source-excluded');
    const raw = body(blob.bytes);
    const screened = options.screen.screenTargetBody(raw, file);
    if (screened.kind === 'excluded') return refuse('source-excluded');
    const retained = screened.kind === 'redacted' ? screened.retained : raw;
    // The exact path-based target policy, including its source exemption, applies; no arbitrary composite inherits it.
    if (!secretSafe(retained)) return refuse('source-excluded');
    const lines = retained.match(/[^\n]*(?:\n|$)/gu) ?? [];
    if (lines.at(-1) === '') lines.pop();
    const text = lines.slice(offset, offset + limit).join('');
    return { reply: { ok: true, kind: 'source-span', path: file, text, offset, nextOffset: offset + limit < lines.length ? offset + limit : null,
      contentClass, redacted: screened.kind === 'redacted', provenance: { commit: pin, objectId: blob.id } },
    classes: classesOf(['code-structure'], [contentClass]), originIds: [`blob:${blob.id}`] };
  };
  const controlCommand = (input: Invocation['input']): 'poll' | 'clarify' | null => {
    if (!isUrlSessionControlPort(urlControl, binding, run)) return null;
    const argv = input.argv as string[];
    if (argv.length === 3 && argv[0] === 'dossier' && argv[1] === 'poll' && argv[2] === run && input.stdin === undefined) return 'poll';
    if (options.role === 'author' && argv.length === 4 && argv[0] === 'dossier' && argv[1] === 'clarify'
      && argv[2] === run && argv[3] === '--stdin' && typeof input.stdin === 'string') return 'clarify';
    return null;
  };
  const command = (input: Invocation['input']): { argv: readonly string[]; stdin: Uint8Array | null; submit: boolean } => {
    const argv = [...input.argv as string[]];
    if (options.role === 'author') {
      const json = argv.at(-1) === '--json'; if (json) argv.pop();
      const valid = argv[0] === 'dossier' && (argv[1] === 'help' ? argv.length === 2
        : (argv[1] === 'check' || argv[1] === 'status') && argv.length === 3 && ownTarget(argv[2], run));
      if (!valid || input.stdin !== undefined || authorRule(run)(input.argv as string[]) !== null) return refuse('command-refused');
      const fixed = [...input.argv as string[]]; if (fixed.length > 2) fixed[2] = run;
      return { argv: fixed, stdin: null, submit: false };
    }
    if (argv[0] !== 'dossier' || argv[1] !== 'await' || !ownTarget(argv[2], sessionDir) || awaitRule(sessionDir)(argv) !== null) return refuse('command-refused');
    argv[2] = sessionDir;
    if (argv.at(-1) === '--json') argv.pop();
    if (argv[3] === '--submit') {
      const name = argv[4];
      if (argv.length !== 6 || argv[5] !== '--stdin' || typeof input.stdin !== 'string'
        || (options.role === 'inventory' ? name !== 'inventory.json' : !/^round-[1-9][0-9]{0,5}\/verdict\.json$/u.test(name ?? ''))) return refuse('command-refused');
      screenedJson(input.stdin);
      const fixed = [...input.argv as string[]]; fixed[2] = sessionDir;
      return { argv: fixed, stdin: new TextEncoder().encode(input.stdin), submit: true };
    }
    if (input.stdin !== undefined) return refuse('command-refused');
    let round = false, wait = false;
    for (let index = 3; index < argv.length; index += 2) {
      const key = argv[index], value = argv[index + 1];
      if (key === '--round' && !round && /^[1-9][0-9]{0,5}$/u.test(value ?? '')) round = true;
      else if (key === '--wait-minutes' && !wait && value !== undefined && value === '1') wait = true;
      else return refuse('command-refused');
    }
    if (!wait) argv.push('--wait-minutes', '1');
    if ((input.argv as string[]).at(-1) === '--json') argv.push('--json');
    return { argv, stdin: null, submit: false };
  };
  const execute = async (request: Invocation, supplied: SessionToolOrigins | null, design?: SessionDesignArtifactRead):
    Promise<{ reply: SessionToolReply; classes: readonly SessionContentClass[]; originIds: readonly string[] }> => {
    const input = request.input;
    if (request.tool === 'source_read') return source(input);
    if (request.tool === 'artifact_read') {
      const file = input.path as string, read = await artifact(file, design);
      return { reply: { ok: true, kind: 'artifact', path: file, text: read.text, sha256: read.origins.digest }, classes: read.origins.classes, originIds: read.origins.originIds };
    }
    if (request.tool === 'artifact_write') {
      if (options.role !== 'author') return refuse('role-refused');
      if (input.path !== 'drafts/next.json') return refuse('path-refused');
      const bytes = draft(input.content as string);
      const admitted = supplied ?? refuse('unknown-origin');
      await current();
      try { await writeDraft(run, bytes); } catch (error) { if (error instanceof Refused) throw error; return refuse('artifact-unavailable'); }
      return { reply: { ok: true, kind: 'artifact-written', path: 'drafts/next.json', sha256: admitted.digest },
        classes: classesOf(['work-history', 'derived-composites'], admitted.classes), originIds: admitted.originIds };
    }
    const controlled = controlCommand(input);
    if (controlled !== null) return invokeUrlSessionControl(urlControl!, binding, run, controlled, input.stdin as string | undefined, supplied);
    const prepared = command(input);
    let prior: SessionToolOrigins | null = null;
    if (prepared.submit) prior = supplied ?? refuse('unknown-origin');
    // A protected design submission goes directly from authenticated stdin
    // to the host checker. Its round paths are virtual on both tool surfaces.
    if (prepared.submit && !(options.role === 'design' && options.designArtifact !== undefined)) {
      try {
        const where = await parent(sessionDir, prepared.argv[4]!);
        try {
          try { const stat = await lstat(`/proc/self/fd/${where.directory.fd}/${where.name}`);
            if (!stat.isFile() || stat.nlink !== 1) refuse('artifact-unavailable');
          } catch (error) { if (error instanceof Refused || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        } finally { await where.directory.close(); }
      } catch { return refuse('artifact-unavailable'); }
    }
    if (options.role === 'author' && prepared.argv[1] === 'check') {
      const read = await artifact('drafts/next.json'); draft(read.text); prior = read.origins;
    }
    await current();
    let response: BrokerResponse;
    try { response = await options.runDossier(prepared.argv, prepared.stdin); } catch { return refuse('dossier-refused'); }
    if (!record(response) || !exact(response, ['stdout', 'stderr', 'exit']) || typeof response.exit !== 'number'
      || !validText(response.stdout) || !validText(response.stderr) || !agentSafe(response.stdout) || !agentSafe(response.stderr)
      || !secretSafe(response.stdout + response.stderr)) return refuse('dossier-refused');
    const report = /^\s*[\[{]/u.test(response.stdout) ? screenedJson(response.stdout) : undefined;
    if (/^\s*[\[{]/u.test(response.stderr)) screenedJson(response.stderr);
    if (response.exit !== 0 && (!isUrlSessionControlPort(urlControl, binding, run) || response.stderr !== ''
      || response.exit !== urlDossierReportExit(prepared.argv[1]!, prepared.submit, report))) {
      return refuse('dossier-refused');
    }
    const cloned = copy(response);
    const digest = sha256(encodeCanonicalJson(cloned, JSON_BOUNDS));
    const admitted = origin(await options.dossierOrigins?.(prepared.argv, cloned), digest);
    return { reply: { ok: true, kind: 'dossier-result', stdout: cloned.stdout, stderr: cloned.stderr, exit: cloned.exit },
      classes: classesOf(['work-history'], admitted.classes, prior?.classes ?? []), originIds: idsOf(admitted.originIds, prior?.originIds ?? []) };
  };
  const handle = async (value: unknown, release?: ReleaseReply): Promise<SessionToolReply> => {
    let request: Invocation;
    let supplied: SessionToolOrigins | null = null;
    try {
      request = invocation(value);
      const encoded = encodeCanonicalJson(request, JSON_BOUNDS);
      if (!secretSafe(encoded)) return failure('content-excluded');
      const strings: string[] = [];
      const visit = (item: unknown): void => {
        if (typeof item === 'string') { if (!agentSafe(item)) refuse('content-excluded'); strings.push(item); }
        else if (Array.isArray(item)) for (const child of item) visit(child);
        else if (record(item)) for (const [key, child] of Object.entries(item)) { if (!agentSafe(key)) refuse('content-excluded'); visit(child); }
      };
      visit(request.input);
      if (!secretSafe(strings.join(''))) return failure('content-excluded');
      await current();
      const payload = request.tool === 'artifact_write' ? request.input.content : request.tool === 'dossier_step' ? request.input.stdin : undefined;
      if (typeof payload === 'string') {
        // A valid inner JSON document is decoded and screened before any origin callback. Malformed,
        // otherwise safe text may still have a known provider origin; its schema refusal is reportable.
        try { screenedJson(payload); } catch (error) {
          if (!(error instanceof Refused) || error.code !== 'schema-refused') throw error;
        }
        const bytes = new TextEncoder().encode(payload);
        supplied = origin(await options.inputOrigins?.(request.tool, request.input, new Uint8Array(bytes)), sha256(bytes));
      }
    } catch (error) { return failure(error instanceof Refused ? error.code : 'invalid-input'); }
    let result: Awaited<ReturnType<typeof execute>>;
    let design: SessionDesignArtifactRead | undefined;
    try {
      if (request.tool === 'artifact_read' && URL_DESIGN_VIEW_ARTIFACT.test(request.input.path as string)) {
        const file = request.input.path as string;
        if (!artifactAllowed(file)) refuse('path-refused');
        design = await options.designArtifact?.(file) ?? refuse('artifact-unavailable');
      }
      result = await execute(request, supplied, design);
    }
    catch (error) {
      result = { reply: failure(error instanceof Refused ? error.code : request.tool === 'source_read' ? 'source-unavailable' : 'operation-unavailable'),
        classes: classesOf(['work-history'], supplied?.classes ?? []), originIds: idsOf(['broker:refusal'], supplied?.originIds ?? []) };
    }
    try {
      await current();
      const canonicalText = encodeCanonicalJson(result.reply, JSON_BOUNDS);
      const reply = deepFreeze(parseBoundedJson(canonicalText, JSON_BOUNDS)) as SessionToolReply;
      if (JSON.stringify(reply) !== canonicalText || !secretSafe(canonicalText)) return failure('content-excluded');
      const digest = sha256(canonicalText);
      const admitted = origin({ digest, classes: result.classes, originIds: result.originIds }, digest);
      const toolName = `mcp__syzygy__${request.tool}` as SessionTool;
      // Binding, invocation and origin metadata are already detached snapshots.
      // Encode the complete receipt below to enforce the combined bounds and screen it.
      const receipt: SessionToolsReceipt = deepFreeze({ binding, id: `tool-${sha256(encodeCanonicalJson([binding, ++sequence, request, digest], JSON_BOUNDS))}`,
        kind: 'tool-result', toolName, toolInput: request.input, canonicalText, classes: admitted.classes, originIds: admitted.originIds,
        digest, bytes: Buffer.byteLength(canonicalText, 'utf8') });
      if (!secretSafe(encodeCanonicalJson(receipt, JSON_BOUNDS))) return failure('content-excluded');
      const waitForSample = reply.ok ? design?.waitForSample : undefined;
      if (waitForSample !== undefined) await waitForSample();
      if (reply.ok) design?.revalidate();
      if (waitForSample !== undefined) await waitForSample();
      await options.onReceipt(receipt, waitForSample);
      await current();
      if (waitForSample !== undefined) await waitForSample();
      const revalidate = reply.ok && design ? () => design.revalidate() : undefined;
      if (release) release(reply, revalidate);
      else revalidate?.();
      return reply;
    } catch (error) { return failure(error instanceof Refused && error.code === 'binding-changed' ? 'binding-changed' : 'receipt-unavailable'); }
    finally { design?.close(); }
  };
  return { validateToolInput: (name, input) => {
    try {
      if (!name.startsWith('mcp__syzygy__')) return false;
      const request = invocation({ tool: name.slice('mcp__syzygy__'.length), input });
      if (request.tool === 'source_read') return options.role === 'author' || options.role === 'inventory';
      if (request.tool === 'artifact_read') return artifactAllowed(request.input.path as string);
      if (request.tool === 'artifact_write') return options.role === 'author' && request.input.path === 'drafts/next.json';
      if (controlCommand(request.input) !== null) return true;
      command(request.input); return true;
    } catch { return false; }
  }, invoke: (value, release) => {
    if (pending >= 4) return Promise.resolve(failure('capacity-exhausted'));
    pending++;
    const operation = serial.then(() => handle(value, release));
    serial = operation.then(() => {}, () => {});
    return operation.finally(() => { pending--; });
  } };
}

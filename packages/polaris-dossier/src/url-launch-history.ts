import { isOrderedDesignSessionProfile } from './session-profile.js';
import * as fs from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { readRunRecord, sourceBindingSha256 } from './run-record.js';
import { URL_RUN_SIDECAR } from './effective-run-record.js';
import { RUN_ID } from './state-directory.js';
import { isoOf } from './iso-of.js';
import { isPreparedUrlRolePlan, type UrlRolePlan } from './url-role-plan.js';
import { urlSessionViewFor } from './session-url-view.js';
import { URL_CLI_PROGRAM } from './session-launch.js';
import type { DossierScreen } from './screen.js';
import type { SessionBinding } from './session-egress-policy.js';
import { readEffectiveRunDeclaration, type UrlRoleDeclaration } from './url-run-record.js';

export const URL_LAUNCH_HISTORY_FORMAT = 'polaris-dossier-url-launch-history/1';
const BOUNDS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 };
const canonical = (v: unknown): string => encodeCanonicalJson(v, BOUNDS);
const hex = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const positive = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
function refuse(): never { throw new Error('url-launch-history-unavailable'); }
interface LaunchCapture { readonly pid: number | 'Unknown'; readonly startedAt: number | 'Unknown' }
export interface UrlLaunchHistoryOptions {
  readonly run: string; readonly runId: string; readonly plan: UrlRolePlan; readonly compatiblePromptSha256: string;
  readonly capture: LaunchCapture;
  /** Immutable physical successor slot, selected only by the recovering host. */
  readonly generation?: string;
  readonly screen: DossierScreen; readonly current: () => boolean | Promise<boolean>;
}
export type UrlLaunchHistoryRole = Exclude<UrlRolePlan['role'], 'author'>;
export const URL_HELPER_LAUNCH_FILES = Object.freeze({
  inventory: 'inventory/session-1.launch.json',
  fidelity: 'reviews/fidelity-session-1.launch.json',
  design: 'reviews/design-session-1.launch.json',
});
/** Logical helper prompt/session identities stay fixed; each recovering host
 * writes a distinct physical history slot and leaves predecessor bytes intact. */
export function urlHelperLaunchFile(role: UrlLaunchHistoryRole, generation?: string): string {
  if (!Object.hasOwn(URL_HELPER_LAUNCH_FILES, role) || (generation !== undefined && !hex(generation))) return refuse();
  const fixed = URL_HELPER_LAUNCH_FILES[role];
  return generation === undefined ? fixed : `${fixed.slice(0, -'.launch.json'.length)}.${generation}.launch.json`;
}
export function isUrlHelperLaunchFile(role: UrlLaunchHistoryRole, file: unknown): file is string {
  if (!Object.hasOwn(URL_HELPER_LAUNCH_FILES, role) || typeof file !== 'string') return false;
  const fixed = URL_HELPER_LAUNCH_FILES[role], prefix = `${fixed.slice(0, -'.launch.json'.length)}.`, suffix = '.launch.json';
  return file === fixed || (file.startsWith(prefix) && file.endsWith(suffix) && hex(file.slice(prefix.length, -suffix.length)));
}

declare const historyBrand: unique symbol;
export interface UrlLaunchHistoryCapability { readonly [historyBrand]: true }
interface UrlLaunchHistoryIdentity {
  readonly run: string; readonly runId: string; readonly role: UrlLaunchHistoryRole; readonly file: string;
  readonly plan: UrlRolePlan; readonly pin: string; readonly coreSha256: string;
  readonly promptFile: string; readonly promptSha256: string; readonly promptRecordSha256: string;
  readonly promptIdentity: { readonly device: bigint; readonly inode: bigint };
  readonly sha256: string; readonly bytes: Uint8Array;
}
const written = new WeakMap<UrlLaunchHistoryCapability, (observeRead?: (bytes: number) => void) => UrlLaunchHistoryIdentity>();
export function inspectUrlLaunchHistory(capability: UrlLaunchHistoryCapability,
  observeRead?: (bytes: number) => void): UrlLaunchHistoryIdentity {
  try { return (written.get(capability) ?? refuse())(observeRead); } catch { return refuse(); }
}

const directoryFlags = fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW;
const same = (a: fs.BigIntStats, b: fs.BigIntStats): boolean => a.dev === b.dev && a.ino === b.ino && a.uid === b.uid && a.mode === b.mode;
const unchanged = (a: fs.BigIntStats, b: fs.BigIntStats): boolean => same(a, b) && a.size === b.size
  && a.nlink === b.nlink && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
function readRegular(anchor: string, name: string, observeRead?: (bytes: number) => void): { readonly bytes: Buffer; readonly stat: fs.BigIntStats } {
  const namedFile = path.join(anchor, name);
  const fd = fs.openSync(namedFile, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size > BigInt(BOUNDS.maxBytes)) return refuse();
    const buffer = Buffer.alloc(Number(before.size) + 1); let length = 0;
    while (length < buffer.length) {
      const count = fs.readSync(fd, buffer, length, buffer.length - length, null);
      if (!count) break;
      observeRead?.(count);
      length += count;
    }
    const after = fs.fstatSync(fd, { bigint: true }), named = fs.lstatSync(namedFile, { bigint: true });
    if (length !== Number(before.size) || !unchanged(before, after) || !unchanged(after, named)) return refuse();
    return { bytes: buffer.subarray(0, length), stat: after };
  } finally { fs.closeSync(fd); }
}
const matchesFile = (expected: ReturnType<typeof readRegular>, found: ReturnType<typeof readRegular>): boolean =>
  unchanged(expected.stat, found.stat) && expected.bytes.equals(found.bytes);
const parse = (bytes: Uint8Array): unknown => parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), BOUNDS);

async function requireCurrent(current: UrlLaunchHistoryOptions['current']): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (await Promise.race([Promise.resolve().then(current), new Promise<false>(resolve => { timer = setTimeout(() => resolve(false), 1000); })]) !== true) refuse();
  } finally { clearTimeout(timer); }
}
function screenHistory(value: unknown, screenBody: DossierScreen['screenBody'], screenSecrets: DossierScreen['screenSecrets']): void {
  const fields: string[] = [], values: string[] = [];
  const visit = (item: unknown): void => {
    if (typeof item === 'string') { fields.push(item); values.push(item); }
    else if (typeof item === 'number' || typeof item === 'boolean') values.push(String(item));
    else if (Array.isArray(item)) for (const child of item) visit(child);
    else if (isRecord(item)) for (const [key, child] of Object.entries(item)) { fields.push(key); visit(child); }
  };
  visit(value);
  for (const text of [canonical(value), ...fields, fields.join(''), values.join(''), values.join('\n'), values.join(' ')])
    if (screenBody(text) !== undefined || screenSecrets(text) !== undefined) refuse();
}
function verifyPromptSubject(prompt: unknown, role: UrlLaunchHistoryRole, runId: string, pin: string, directory: string,
  compatiblePromptSha256: string): asserts prompt is Record<string, unknown> {
  const inventory = role === 'inventory';
  if (!isRecord(prompt) || prompt.format !== 'polaris-dossier-session-prompt/2' || prompt.role !== (inventory ? 'inventory' : 'review')
    || prompt.runId !== runId || prompt.session !== 1 || prompt.pinnedRevision !== pin || (!inventory && prompt.kind !== role)
    || typeof prompt.prompt !== 'string' || prompt.promptSha256 !== compatiblePromptSha256
    || sha256(prompt.prompt) !== compatiblePromptSha256 || prompt.directory !== directory) refuse();
}
function historyRecord(subject: {
  readonly runId: string; readonly role: UrlRolePlan['role']; readonly promptSha256: string; readonly directory: string;
  readonly executable: string; readonly binding: SessionBinding; readonly declaration: UrlRoleDeclaration;
}, capture: LaunchCapture) {
  const { runId, role, promptSha256, directory, executable, binding, declaration } = subject;
  const roleFields = role === 'author' ? { role: 'author' as const } : {
    role: role === 'inventory' ? 'inventory' as const : 'review' as const, ...(role === 'inventory' ? {} : { kind: role }), session: 1 };
  return { format: URL_LAUNCH_HISTORY_FORMAT, runId, ...roleFields,
    form: { value: 'syzygy-launched', declaredBy: 'syzygy', label: 'Inferred' }, promptSha256,
    actualInputPacketSha256: declaration.inputPacketSha256, sessionId: declaration.sessionId, binding,
    executable, executableSha256: declaration.executableSha256, commandSha256: declaration.commandSha256,
    instructionSha256: declaration.instructionSha256, viewSha256: declaration.viewSha256, compiledProfileSha256: declaration.compiledProfileSha256,
    scaffoldSha256: declaration.scaffoldSha256, mcpSha256: declaration.mcpSha256, configurationSha256: declaration.configurationSha256, directory,
    capture: { pid: capture.pid, startedAt: capture.startedAt === 'Unknown' ? 'Unknown' : isoOf(capture.startedAt),
      unknownReason: capture.pid === 'Unknown' || capture.startedAt === 'Unknown' ? 'runtime-capture-unavailable' : null, label: 'Inferred' },
    label: 'Inferred' };
}

/** Compatible history only, never a live launch attestation or recovery proof.
 * The genuine host plan supplies identities; the runtime supplies its bounded
 * capture. Only an actual issued helper prompt may bind its legacy prompt slot. */
export async function writeUrlLaunchHistory(given: UrlLaunchHistoryOptions) {
  if (!isPreparedUrlRolePlan(given.plan)) return refuse();
  const { run, runId, plan, compatiblePromptSha256, current } = given, capture = { ...given.capture };
  const screenBody = given.screen.screenBody, screenSecrets = given.screen.screenSecrets, policy = given.screen.policySha256;
  const sync = promisify(fs.fsync);
  let root: number | undefined, helper: number | undefined;
  try {
    if (!path.isAbsolute(run) || path.resolve(run) !== run || path.basename(run) !== runId || !RUN_ID.test(runId)
      || fs.realpathSync(run) !== run || !hex(compatiblePromptSha256) || typeof current !== 'function'
      || [screenBody, screenSecrets].some(f => typeof f !== 'function')
      || capture.pid !== 'Unknown' && !positive(capture.pid) || capture.startedAt !== 'Unknown' && !positive(capture.startedAt)) return refuse();
    root = fs.openSync(run, directoryFlags);
    const initial = fs.fstatSync(root, { bigint: true }), anchor = `/proc/self/fd/${root}`;
    if (!initial.isDirectory() || initial.uid !== BigInt(process.getuid?.() ?? -1)) return refuse();
    const check = async (): Promise<void> => {
      await requireCurrent(current);
      if (fs.realpathSync(run) !== run || !same(initial, fs.lstatSync(run, { bigint: true })) || !same(initial, fs.fstatSync(root!, { bigint: true }))) return refuse();
    };
    await check();
    const base = readRegular(anchor, 'run.json'), read = readRunRecord(new TextDecoder('utf-8', { fatal: true }).decode(base.bytes));
    if (!read.ok) return refuse();
    const binding = plan.profile.input.binding, declaration = plan.declaration;
    if (binding.run !== runId || binding.role !== plan.role || binding.policy !== policy || policy !== read.record.subject.screeningPolicy.sha256
      || binding.sourceBinding !== sourceBindingSha256(read.record.subject) || binding.provider !== read.record.declared.agentProvider || binding.model !== read.record.declared.model
      || declaration.role !== plan.role || declaration.sessionId !== plan.profile.input.sessionId || declaration.compiledProfileSha256 !== sha256(plan.profile.canonicalText)
      || declaration.inputPacketSha256 !== sha256(plan.profile.input.initialPrompt) || declaration.instructionSha256 !== sha256(plan.profile.input.systemPrompt)
      || !plan.profile.input.initialPrompt.includes(canonical(['dossier', 'poll', isOrderedDesignSessionProfile(plan.profile) ? runId : run]))
      || declaration.viewSha256 !== sha256(canonical(urlSessionViewFor(plan.view))) || declaration.executableSha256 !== URL_CLI_PROGRAM.sha256
      || [declaration.commandSha256, declaration.configurationSha256, declaration.scaffoldSha256, declaration.mcpSha256].some(value => !hex(value))) return refuse();
    const directory = plan.role === 'author' ? run : `${run}.sessions/${plan.role === 'inventory' ? 'session' : plan.role}-1`;
    let prompt: ReturnType<typeof readRegular> | undefined, helperInitial: fs.BigIntStats | undefined, child = '', promptName = '';
    if (plan.role !== 'author') {
      child = plan.role === 'inventory' ? 'inventory' : 'reviews';
      helper = fs.openSync(path.join(anchor, child), directoryFlags);
      helperInitial = fs.fstatSync(helper, { bigint: true }); if (!helperInitial.isDirectory() || helperInitial.uid !== initial.uid) return refuse();
      promptName = `${plan.role === 'inventory' ? '' : `${plan.role}-`}session-1.json`;
      prompt = readRegular(`/proc/self/fd/${helper}`, promptName);
      const parsed = parse(prompt.bytes);
      verifyPromptSubject(parsed, plan.role, runId, read.record.subject.pinnedRevision.commit, path.relative(path.dirname(run), directory), compatiblePromptSha256);
      screenHistory(parsed, screenBody, screenSecrets);
      if (!plan.profile.input.initialPrompt.includes(canonical(['dossier', 'await', isOrderedDesignSessionProfile(plan.profile) ? '/work' : directory]))) return refuse();
    }
    const record = deepFreeze(historyRecord({ runId, role: plan.role, promptSha256: compatiblePromptSha256, directory,
      executable: plan.view.cliExecutable, binding, declaration }, capture));
    screenHistory({ run, record }, screenBody, screenSecrets); await check();
    if (!matchesFile(base, readRegular(anchor, 'run.json'))) return refuse();
    if (plan.role === 'author') return { file: null, record, capability: null };
    if (helper === undefined || prompt === undefined || helperInitial === undefined) return refuse();
    const role = plan.role, issuedPrompt = prompt, helperIdentity = helperInitial;
    const relativeFile = urlHelperLaunchFile(role, given.generation), name = path.basename(relativeFile), file = path.join(run, relativeFile);
    const helperAnchor = `/proc/self/fd/${helper}`;
    if (!same(helperIdentity, fs.lstatSync(path.join(anchor, child), { bigint: true }))
      || !same(helperIdentity, fs.fstatSync(helper, { bigint: true }))
      || !matchesFile(issuedPrompt, readRegular(helperAnchor, promptName))) return refuse();
    const bytes = Buffer.from(canonical(record) + '\n');
    const fd = fs.openSync(path.join(helperAnchor, name), fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    let stat: fs.BigIntStats;
    try {
      if (fs.writeSync(fd, bytes) !== bytes.length) return refuse();
      stat = fs.fstatSync(fd, { bigint: true });
      if (!stat.isFile() || stat.uid !== initial.uid || stat.nlink !== 1n || (stat.mode & 0o777n) !== 0o600n) return refuse();
      // Keep the original descriptor through flush and recheck its exact
      // metadata before admitting the separate directory flush.
      await sync(fd);
      await check();
      if (!unchanged(stat, fs.fstatSync(fd, { bigint: true }))
        || !unchanged(stat, fs.lstatSync(path.join(helperAnchor, name), { bigint: true }))
        || !same(helperIdentity, fs.lstatSync(path.join(anchor, child), { bigint: true }))
        || !same(helperIdentity, fs.fstatSync(helper, { bigint: true }))) return refuse();
    } finally { fs.closeSync(fd); }
    await sync(helper);
    const identity = { run, runId, role, file: relativeFile, plan, pin: read.record.subject.pinnedRevision.commit,
      coreSha256: sha256(base.bytes), promptFile: `${child}/${promptName}`, promptSha256: compatiblePromptSha256,
      promptRecordSha256: sha256(issuedPrompt.bytes),
      promptIdentity: Object.freeze({ device: issuedPrompt.stat.dev, inode: issuedPrompt.stat.ino }), sha256: sha256(bytes) };
    const inspect = (observeRead?: (bytes: number) => void): UrlLaunchHistoryIdentity => {
      const runFd = fs.openSync(run, directoryFlags);
      try {
        const runAnchor = `/proc/self/fd/${runFd}`, childPath = path.join(runAnchor, child);
        const childFd = fs.openSync(childPath, directoryFlags);
        try {
          const childAnchor = `/proc/self/fd/${childFd}`;
          if (!same(initial, fs.fstatSync(runFd, { bigint: true })) || !same(helperIdentity, fs.fstatSync(childFd, { bigint: true }))
            || !matchesFile(base, readRegular(runAnchor, 'run.json', observeRead))
            || !matchesFile(issuedPrompt, readRegular(childAnchor, promptName, observeRead))
            || !matchesFile({ bytes, stat }, readRegular(childAnchor, name, observeRead))
            || !same(helperIdentity, fs.lstatSync(childPath, { bigint: true }))
            || !same(initial, fs.lstatSync(run, { bigint: true })) || fs.realpathSync(run) !== run) return refuse();
          return Object.freeze({ ...identity, bytes: Uint8Array.from(bytes) });
        } finally { fs.closeSync(childFd); }
      } finally { fs.closeSync(runFd); }
    };
    await check();
    inspect();
    const capability = Object.freeze({}) as UrlLaunchHistoryCapability;
    written.set(capability, inspect);
    return { file, record, capability };
  } catch { return refuse(); }
  finally { if (helper !== undefined) fs.closeSync(helper); if (root !== undefined) fs.closeSync(root); }
}

export interface UrlRetainedLaunchHistoryExpected {
  readonly file: string; readonly recordSha256: string; readonly recordBytes: number;
  readonly promptRecordSha256: string; readonly promptSha256: string; readonly sessionId: string;
}
export interface UrlRetainedLaunchHistoryOptions {
  readonly run: string; readonly runId: string; readonly role: UrlLaunchHistoryRole;
  /** Exact launch-history payload independently verified in the protected audit. */
  readonly expected: UrlRetainedLaunchHistoryExpected;
  /** Independently pinned subject and role identities. */
  readonly coreSha256: string; readonly declarationSha256: string; readonly pin: string;
  readonly roleDeclaration: UrlRoleDeclaration; readonly executable: string;
  readonly screen: DossierScreen; readonly current: () => boolean | Promise<boolean>;
}
declare const retainedHistoryBrand: unique symbol;
export interface VerifiedRetainedUrlLaunchHistory {
  readonly [retainedHistoryBrand]: true;
  readonly authorization: 'none'; readonly replay: 'forbidden';
  readonly role: UrlLaunchHistoryRole; readonly sessionId: string; readonly pin: string;
  readonly runId: string; readonly sourceBindingSha256: string; readonly policySha256: string;
  readonly recordSha256: string; readonly promptRecordSha256: string; readonly promptSha256: string;
}
const verifiedRetainedHistory = new WeakSet<VerifiedRetainedUrlLaunchHistory>();
export function isVerifiedRetainedUrlLaunchHistory(value: unknown): value is VerifiedRetainedUrlLaunchHistory {
  return typeof value === 'object' && value !== null && verifiedRetainedHistory.has(value as VerifiedRetainedUrlLaunchHistory);
}

const EXPECTED_FIELDS = ['file', 'recordSha256', 'recordBytes', 'promptRecordSha256', 'promptSha256', 'sessionId'];
const PROMPT_FIELDS = ['format', 'role', 'runId', 'pinnedRevision', 'session', 'directory', 'prompt', 'promptSha256'];
const OPTIONAL_PROMPT_FIELDS = ['kind', 'mode', 'issuedAt', 'brief', 'executionRule', 'stageStatement', 'packet', 'commands', 'context', 'label'];
const fields = (value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> =>
  isRecord(value) && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
const absolute = (value: unknown): value is string => typeof value === 'string' && Buffer.byteLength(value) <= 4096
  && path.isAbsolute(value) && path.resolve(value) === value;
function recordedCapture(value: unknown): LaunchCapture {
  if (!isRecord(value) || !isRecord(value.capture)) refuse();
  const { pid, startedAt } = value.capture;
  if (pid !== 'Unknown' && !positive(pid)) refuse();
  if (startedAt === 'Unknown') return { pid, startedAt };
  if (typeof startedAt !== 'string') refuse();
  const milliseconds = Date.parse(startedAt);
  if (!positive(milliseconds) || isoOf(milliseconds) !== startedAt) refuse();
  return { pid, startedAt: milliseconds };
}

/** Verify retained compatible history against already verified protected
 * expectations. This issues no writer capability or current launch authority. */
export async function verifyRetainedUrlLaunchHistory(given: UrlRetainedLaunchHistoryOptions): Promise<VerifiedRetainedUrlLaunchHistory> {
  let root: number | undefined, helper: number | undefined;
  try {
    const { run, runId, role, coreSha256, declarationSha256, pin, executable, current } = given;
    const { policySha256, screenBody, screenSecrets } = given.screen;
    const expected = parseBoundedJson(canonical(given.expected), BOUNDS);
    const expectedRole = canonical(given.roleDeclaration);
    if (!absolute(run) || path.basename(run) !== runId || !RUN_ID.test(runId) || !Object.hasOwn(URL_HELPER_LAUNCH_FILES, role)
      || !absolute(executable) || !hex(coreSha256) || !hex(declarationSha256) || !hex(policySha256)
      || typeof pin !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(pin)
      || !fields(expected, EXPECTED_FIELDS) || !isUrlHelperLaunchFile(role, expected.file)
      || !hex(expected.recordSha256) || !positive(expected.recordBytes) || expected.recordBytes > BOUNDS.maxBytes
      || !hex(expected.promptRecordSha256) || !hex(expected.promptSha256) || typeof expected.sessionId !== 'string'
      || [current, screenBody, screenSecrets].some(fn => typeof fn !== 'function')) refuse();

    await requireCurrent(current);
    if (fs.realpathSync(run) !== run) refuse();
    const rootFd = fs.openSync(run, directoryFlags);
    root = rootFd;
    const rootStat = fs.fstatSync(rootFd, { bigint: true }), anchor = `/proc/self/fd/${rootFd}`;
    if (!rootStat.isDirectory() || rootStat.uid !== BigInt(process.getuid?.() ?? -1)) refuse();
    const child = path.dirname(expected.file), launchName = path.basename(expected.file);
    const childPath = path.join(anchor, child);
    const helperFd = fs.openSync(childPath, directoryFlags);
    helper = helperFd;
    const helperStat = fs.fstatSync(helperFd, { bigint: true }), helperAnchor = `/proc/self/fd/${helperFd}`;
    if (!helperStat.isDirectory() || helperStat.uid !== rootStat.uid) refuse();
    const checkDirectories = (): void => {
      if (fs.realpathSync(run) !== run || !same(rootStat, fs.lstatSync(run, { bigint: true })) || !same(rootStat, fs.fstatSync(rootFd, { bigint: true }))
        || !same(helperStat, fs.lstatSync(childPath, { bigint: true })) || !same(helperStat, fs.fstatSync(helperFd, { bigint: true }))) refuse();
    };
    checkDirectories();
    const promptName = launchName.replace(/\.launch\.json$/u, '.json');
    const files = [[anchor, 'run.json'], [anchor, URL_RUN_SIDECAR], [helperAnchor, launchName], [helperAnchor, promptName]] as const;
    const read = ([parent, name]: typeof files[number]): ReturnType<typeof readRegular> => {
      const file = readRegular(parent, name);
      if (file.stat.uid !== rootStat.uid) refuse();
      return file;
    };
    const core = read(files[0]), sidecar = read(files[1]), launch = read(files[2]), prompt = read(files[3]);
    if ((launch.stat.mode & 0o7777n) !== 0o600n || sha256(core.bytes) !== coreSha256 || sha256(sidecar.bytes) !== declarationSha256
      || launch.bytes.length !== expected.recordBytes || sha256(launch.bytes) !== expected.recordSha256
      || sha256(prompt.bytes) !== expected.promptRecordSha256) refuse();
    const matched = readEffectiveRunDeclaration(core.bytes, sidecar.bytes, { runId, expectedSidecarSha256: declarationSha256 });
    if (!matched.ok || matched.effective.kind !== 'url') refuse();
    const subject = matched.effective.declaration, declaration = subject.roles.find(item => item.role === role);
    if (subject.pinnedCommit !== pin || subject.basePolicy.sha256 !== policySha256 || !declaration || canonical(declaration) !== expectedRole
      || declaration.sessionId !== expected.sessionId || declaration.executableSha256 !== URL_CLI_PROGRAM.sha256) refuse();

    const directory = `${run}.sessions/${role === 'inventory' ? 'session' : role}-1`;
    const parsedPrompt = parse(prompt.bytes);
    if (!fields(parsedPrompt, PROMPT_FIELDS, OPTIONAL_PROMPT_FIELDS) || (role === 'inventory' && Object.hasOwn(parsedPrompt, 'kind'))) refuse();
    verifyPromptSubject(parsedPrompt, role, runId, pin, path.relative(path.dirname(run), directory), expected.promptSha256);
    const parsedLaunch = parse(launch.bytes);
    const binding: SessionBinding = { run: runId, role, sourceBinding: subject.sourceBindingSha256, policy: subject.basePolicy.sha256,
      provider: subject.inference.provider, model: subject.inference.model };
    const exactRecord = historyRecord({ runId, role, promptSha256: expected.promptSha256, directory, executable, binding, declaration }, recordedCapture(parsedLaunch));
    if (!launch.bytes.equals(Buffer.from(canonical(exactRecord) + '\n'))) refuse();
    screenHistory(parsedPrompt, screenBody, screenSecrets);
    screenHistory({ run, record: exactRecord }, screenBody, screenSecrets);

    checkDirectories();
    await requireCurrent(current);
    checkDirectories();
    if (![core, sidecar, launch, prompt].every((prior, index) => matchesFile(prior, read(files[index]!)))) refuse();
    checkDirectories();
    const verified = Object.freeze({ authorization: 'none', replay: 'forbidden', role, sessionId: declaration.sessionId, pin, runId,
      sourceBindingSha256: subject.sourceBindingSha256, policySha256, recordSha256: expected.recordSha256, promptRecordSha256: expected.promptRecordSha256,
      promptSha256: expected.promptSha256 }) as VerifiedRetainedUrlLaunchHistory;
    verifiedRetainedHistory.add(verified);
    return verified;
  } catch { return refuse(); }
  finally {
    let closed = true;
    try { if (helper !== undefined) fs.closeSync(helper); } catch { closed = false; }
    try { if (root !== undefined) fs.closeSync(root); } catch { closed = false; }
    if (!closed) refuse();
  }
}

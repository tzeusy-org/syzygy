import { isOrderedDesignSessionProfile } from './session-profile.js';
import * as fs from 'node:fs';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { readRunRecord, sourceBindingSha256 } from './run-record.js';
import { RUN_ID } from './state-directory.js';
import { isoOf } from './iso-of.js';
import { isPreparedUrlRolePlan, type UrlRolePlan } from './url-role-plan.js';
import { urlSessionViewFor } from './session-url-view.js';
import { URL_CLI_PROGRAM } from './session-launch.js';
import type { DossierScreen } from './screen.js';

export const URL_LAUNCH_HISTORY_FORMAT = 'polaris-dossier-url-launch-history/1';
const BOUNDS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 };
const canonical = (v: unknown): string => encodeCanonicalJson(v, BOUNDS);
const hex = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const positive = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const refuse = (): never => { throw new Error('url-launch-history-unavailable'); };
export interface UrlLaunchHistoryOptions {
  readonly run: string; readonly runId: string; readonly plan: UrlRolePlan; readonly compatiblePromptSha256: string;
  readonly capture: { readonly pid: number | 'Unknown'; readonly startedAt: number | 'Unknown' };
  readonly screen: DossierScreen; readonly current: () => boolean | Promise<boolean>;
}
export type UrlLaunchHistoryRole = Exclude<UrlRolePlan['role'], 'author'>;
export const URL_HELPER_LAUNCH_FILES = Object.freeze({
  inventory: 'inventory/session-1.launch.json',
  fidelity: 'reviews/fidelity-session-1.launch.json',
  design: 'reviews/design-session-1.launch.json',
});
declare const historyBrand: unique symbol;
export interface UrlLaunchHistoryCapability { readonly [historyBrand]: true }
interface UrlLaunchHistoryIdentity {
  readonly run: string; readonly runId: string; readonly role: UrlLaunchHistoryRole; readonly file: string;
  readonly plan: UrlRolePlan; readonly pin: string; readonly coreSha256: string;
  readonly promptFile: string; readonly promptSha256: string; readonly promptRecordSha256: string;
  readonly promptIdentity: { readonly device: bigint; readonly inode: bigint };
  readonly sha256: string; readonly bytes: Uint8Array;
}
const written = new WeakMap<UrlLaunchHistoryCapability, () => UrlLaunchHistoryIdentity>();
export function inspectUrlLaunchHistory(capability: UrlLaunchHistoryCapability): UrlLaunchHistoryIdentity {
  try { return (written.get(capability) ?? refuse())(); } catch { return refuse(); }
}

const directoryFlags = fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW;
const same = (a: fs.BigIntStats, b: fs.BigIntStats): boolean => a.dev === b.dev && a.ino === b.ino && a.uid === b.uid && a.mode === b.mode;
const unchanged = (a: fs.BigIntStats, b: fs.BigIntStats): boolean => same(a, b) && a.size === b.size
  && a.nlink === b.nlink && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
function readRegular(anchor: string, name: string): { readonly bytes: Buffer; readonly stat: fs.BigIntStats } {
  const namedFile = path.join(anchor, name);
  const fd = fs.openSync(namedFile, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size > BigInt(BOUNDS.maxBytes)) return refuse();
    const buffer = Buffer.alloc(Number(before.size) + 1); let length = 0;
    while (length < buffer.length) {
      const count = fs.readSync(fd, buffer, length, buffer.length - length, null); if (!count) break; length += count;
    }
    const after = fs.fstatSync(fd, { bigint: true }), named = fs.lstatSync(namedFile, { bigint: true });
    if (length !== Number(before.size) || !unchanged(before, after) || !unchanged(after, named)) return refuse();
    return { bytes: buffer.subarray(0, length), stat: after };
  } finally { fs.closeSync(fd); }
}
const matchesFile = (expected: ReturnType<typeof readRegular>, found: ReturnType<typeof readRegular>): boolean =>
  unchanged(expected.stat, found.stat) && expected.bytes.equals(found.bytes);

/** Compatible history only, never a live launch attestation or recovery proof.
 * The genuine host plan supplies identities; the runtime supplies its bounded
 * capture. Only an actual issued helper prompt may bind its legacy prompt slot. */
export async function writeUrlLaunchHistory(given: UrlLaunchHistoryOptions) {
  if (!isPreparedUrlRolePlan(given.plan)) return refuse();
  const { run, runId, plan, compatiblePromptSha256, current } = given, capture = { ...given.capture };
  const screenBody = given.screen.screenBody, screenSecrets = given.screen.screenSecrets, policy = given.screen.policySha256;
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
      let timer: ReturnType<typeof setTimeout> | undefined;
      try { if (await Promise.race([Promise.resolve().then(current), new Promise<false>(resolve => { timer = setTimeout(() => resolve(false), 1000); })]) !== true) return refuse(); }
      finally { clearTimeout(timer); }
      if (fs.realpathSync(run) !== run || !same(initial, fs.lstatSync(run, { bigint: true })) || !same(initial, fs.fstatSync(root!, { bigint: true }))) return refuse();
    };
    const safe = (v: unknown): void => {
      const fields: string[] = [], values: string[] = [];
      const visit = (item: unknown): void => {
        if (typeof item === 'string') { fields.push(item); values.push(item); }
        else if (typeof item === 'number' || typeof item === 'boolean') values.push(String(item));
        else if (Array.isArray(item)) for (const child of item) visit(child);
        else if (isRecord(item)) for (const [key, child] of Object.entries(item)) { fields.push(key); visit(child); }
      };
      visit(v);
      for (const value of [canonical(v), ...fields, fields.join(''), values.join(''), values.join('\n'), values.join(' ')])
        if (screenBody(value) !== undefined || screenSecrets(value) !== undefined) return refuse();
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
    const helperRole = plan.role === 'inventory' ? 'inventory' : 'review';
    const directory = plan.role === 'author' ? run : `${run}.sessions/${plan.role === 'inventory' ? 'session' : plan.role}-1`;
    let prompt: ReturnType<typeof readRegular> | undefined, helperInitial: fs.BigIntStats | undefined, child = '', promptName = '';
    const roleFields = plan.role === 'author' ? { role: 'author' as const } : { role: helperRole, ...(plan.role === 'inventory' ? {} : { kind: plan.role }), session: 1 };
    if (plan.role !== 'author') {
      child = plan.role === 'inventory' ? 'inventory' : 'reviews';
      helper = fs.openSync(path.join(anchor, child), directoryFlags);
      helperInitial = fs.fstatSync(helper, { bigint: true }); if (!helperInitial.isDirectory() || helperInitial.uid !== initial.uid) return refuse();
      promptName = `${plan.role === 'inventory' ? '' : `${plan.role}-`}session-1.json`;
      prompt = readRegular(`/proc/self/fd/${helper}`, promptName);
      const parsed = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(prompt.bytes), BOUNDS);
      if (!isRecord(parsed) || parsed['format'] !== 'polaris-dossier-session-prompt/2' || parsed['role'] !== helperRole || parsed['runId'] !== runId || parsed['session'] !== 1
        || parsed['pinnedRevision'] !== read.record.subject.pinnedRevision.commit
        || plan.role !== 'inventory' && parsed['kind'] !== plan.role || typeof parsed['prompt'] !== 'string'
        || parsed['promptSha256'] !== compatiblePromptSha256 || sha256(parsed['prompt']) !== compatiblePromptSha256
        || parsed['directory'] !== path.relative(path.dirname(run), directory)) return refuse();
      safe(parsed);
      if (!plan.profile.input.initialPrompt.includes(canonical(['dossier', 'await', isOrderedDesignSessionProfile(plan.profile) ? '/work' : directory]))) return refuse();
    }
    const record = deepFreeze({ format: URL_LAUNCH_HISTORY_FORMAT, runId, ...roleFields,
      form: { value: 'syzygy-launched', declaredBy: 'syzygy', label: 'Inferred' }, promptSha256: compatiblePromptSha256,
      actualInputPacketSha256: sha256(plan.profile.input.initialPrompt), sessionId: plan.profile.input.sessionId, binding,
      executable: plan.view.cliExecutable, executableSha256: URL_CLI_PROGRAM.sha256, commandSha256: declaration.commandSha256,
      instructionSha256: declaration.instructionSha256, viewSha256: declaration.viewSha256, compiledProfileSha256: declaration.compiledProfileSha256,
      scaffoldSha256: declaration.scaffoldSha256, mcpSha256: declaration.mcpSha256, configurationSha256: declaration.configurationSha256, directory,
      capture: { pid: capture.pid, startedAt: capture.startedAt === 'Unknown' ? 'Unknown' : isoOf(capture.startedAt),
        unknownReason: capture.pid === 'Unknown' || capture.startedAt === 'Unknown' ? 'runtime-capture-unavailable' : null, label: 'Inferred' },
      label: 'Inferred' });
    safe({ run, record }); await check();
    if (!matchesFile(base, readRegular(anchor, 'run.json'))) return refuse();
    if (plan.role === 'author') return { file: null, record, capability: null };
    if (helper === undefined || prompt === undefined || helperInitial === undefined) return refuse();
    const role = plan.role, issuedPrompt = prompt, helperIdentity = helperInitial;
    const relativeFile = URL_HELPER_LAUNCH_FILES[role], name = path.basename(relativeFile), file = path.join(run, relativeFile);
    const helperAnchor = `/proc/self/fd/${helper}`;
    if (!same(helperIdentity, fs.lstatSync(path.join(anchor, child), { bigint: true }))
      || !same(helperIdentity, fs.fstatSync(helper, { bigint: true }))
      || !matchesFile(issuedPrompt, readRegular(helperAnchor, promptName))) return refuse();
    const bytes = Buffer.from(canonical(record) + '\n');
    const fd = fs.openSync(path.join(helperAnchor, name), fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    let stat: fs.BigIntStats;
    try {
      if (fs.writeSync(fd, bytes) !== bytes.length) return refuse();
      fs.fsyncSync(fd);
      stat = fs.fstatSync(fd, { bigint: true });
      if (!stat.isFile() || stat.uid !== initial.uid || stat.nlink !== 1n || (stat.mode & 0o777n) !== 0o600n) return refuse();
    } finally { fs.closeSync(fd); }
    fs.fsyncSync(helper);
    const identity = { run, runId, role, file: relativeFile, plan, pin: read.record.subject.pinnedRevision.commit,
      coreSha256: sha256(base.bytes), promptFile: `${child}/${promptName}`, promptSha256: compatiblePromptSha256,
      promptRecordSha256: sha256(issuedPrompt.bytes),
      promptIdentity: Object.freeze({ device: issuedPrompt.stat.dev, inode: issuedPrompt.stat.ino }), sha256: sha256(bytes) };
    const inspect = (): UrlLaunchHistoryIdentity => {
      const runFd = fs.openSync(run, directoryFlags);
      try {
        const runAnchor = `/proc/self/fd/${runFd}`, childPath = path.join(runAnchor, child);
        const childFd = fs.openSync(childPath, directoryFlags);
        try {
          const childAnchor = `/proc/self/fd/${childFd}`;
          if (!same(initial, fs.fstatSync(runFd, { bigint: true })) || !same(helperIdentity, fs.fstatSync(childFd, { bigint: true }))
            || !matchesFile(base, readRegular(runAnchor, 'run.json'))
            || !matchesFile(issuedPrompt, readRegular(childAnchor, promptName))
            || !matchesFile({ bytes, stat }, readRegular(childAnchor, name))
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

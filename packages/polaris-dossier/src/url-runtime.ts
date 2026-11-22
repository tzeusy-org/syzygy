import { createHash } from 'node:crypto';
import { constants, type Stats } from 'node:fs';
import { lstat, open, realpath, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import type { DossierRenderer } from './render.js';
import type { GitMemoryWorkerProgram } from './git-memory-worker.js';
import type { KernelPeerProgram } from './session-peer.js';
import type { UrlSessionViewInputs } from './session-url-view.js';
import type { OrderedScreenProgram } from './url-ordered-design-screen.js';

const BOUNDS = { maxBytes: 2_097_152, maxNodes: 32_768, maxDepth: 8 };
const INPUT_READS = 8;
const NODE_HASH_CHUNK = 1_048_576;
const ORDINARY_MCP = 'support/session-mcp.js';
const DESIGN_MCP = 'design-support/session-mcp.js';
const ORDERED_SCREEN = 'host/ordered-screen.mjs';
const MACHINE_PEER = 'host/machine-peer';
const OUTPUTS = ['worker.mjs', 'renderer.mjs', 'support/session-bridge.js', ORDINARY_MCP, 'host/session-peer', DESIGN_MCP, ORDERED_SCREEN, MACHINE_PEER];
const RENDERER_ENTRY = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';
const PROFILE_SOURCES = ['session-profile', 'session-launch', 'session-controller', 'session-egress-policy', 'session-response',
  'session-tools', 'session-host', 'session-machine-transport', 'session-relay', 'session-broker', 'session-url-view', 'session-credential',
  'session-control', 'session-peer', 'url-role-plan', 'url-session-budget', 'url-session-audit', 'url-origin-ledger', 'url-run-origins', 'url-source-reader', 'git-object-reader',
  'url-run-sessions', 'url-run-machine', 'url-run-ordered-attempt', 'url-run-cpu-budget', 'url-ordered-design-host', 'url-run-artifacts', 'url-check-product-shape', 'url-product-reads', 'url-operation-products', 'url-question-ui', 'url-supervisor-state', 'url-launch-history', 'url-design-view',
  'url-design-product', 'url-design-delivery', 'url-ordered-design-request', 'url-ordered-design-audit', 'url-ordered-design-writer',
  'url-machine-instance', 'url-machine-lifecycle', 'url-machine-store', 'url-machine-peer', 'url-ordered-design-bounds', 'url-ordered-design-session', 'url-ordered-design-work-budget',
  'url-ordered-design-screen', 'url-ordered-design-screen-worker', 'url-ordered-design-screen-protocol',
  'url-rendered-site-screen', 'url-rendered-source-proof', 'url-stored-render', 'url-dossier-result', 'url-ordered-render-value',
  'reverify', 'brief', 'inventory', 'review', 'review-packet', 'session-handover', 'session-statement', 'waiting-sessions', 'render', 'check',
  'check-model', 'review-model', 'credential-probe', 'cli', 'url-run-record', 'url-mode-registry', 'url-parent-adoption', 'url-runtime', 'polaris']
  .map(name => `packages/polaris-dossier/src/${name}.ts`);
const exact = (value: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const relative = (value: unknown): value is string => typeof value === 'string' && value.length <= 4096 && value.length > 0
  && !path.isAbsolute(value) && !value.includes('\\') && !/[\u0000-\u001f\u007f]/u.test(value)
  && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');
type FileIdentity = { readonly path: string; readonly bytes: number; readonly sha256: string };
const identity = (value: unknown): value is FileIdentity => isRecord(value) && exact(value, ['path', 'bytes', 'sha256'])
  && relative(value.path) && Number.isSafeInteger(value.bytes) && Number(value.bytes) > 0 && hex(value.sha256);
function sameRuntimeFile(before: Stats, after: Stats): boolean {
  return after.isFile() && after.dev === before.dev && after.ino === before.ino
    && after.nlink === before.nlink && after.mode === before.mode && after.size === before.size
    && after.mtimeMs === before.mtimeMs && after.ctimeMs === before.ctimeMs;
}
async function readStable<T>(file: string, maxBytes: number, root: string, program: boolean,
  consume: (handle: FileHandle, size: number) => Promise<T>): Promise<{ value: T; stats: Stats }> {
  const resolved = await realpath(file);
  if (!resolved.startsWith(`${root}/`)) throw new Error();
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1 || (program && (before.mode & 0o022) !== 0) || before.size > maxBytes) throw new Error();
    const value = await consume(handle, before.size);
    const after = await handle.stat(), named = await lstat(file);
    if (!sameRuntimeFile(before, after) || !sameRuntimeFile(before, named)) throw new Error();
    return { value, stats: before };
  } finally { await handle.close(); }
}
async function read(file: string, maxBytes: number, root: string, program = false): Promise<Uint8Array> {
  const { value } = await readStable(file, maxBytes, root, program, async (handle, size) => {
    const buffer = Buffer.alloc(size + 1);
    let length = 0;
    while (length < buffer.length) {
      const part = await handle.read(buffer, length, buffer.length - length, null);
      if (!part.bytesRead) break;
      length += part.bytesRead;
    }
    if (length !== size) throw new Error();
    return buffer.subarray(0, length);
  });
  return value;
}
async function readNodeDigest(file: string, expectedBytes: number): Promise<{ digest: string; stats: Stats }> {
  const { value: digest, stats } = await readStable(file, expectedBytes, path.dirname(file), true, async (handle, size) => {
    if (size !== expectedBytes) throw new Error();
    const chunk = Buffer.alloc(NODE_HASH_CHUNK), hash = createHash('sha256');
    let length = 0;
    while (length <= size) {
      const part = await handle.read(chunk, 0, Math.min(chunk.length, size + 1 - length), null);
      if (!part.bytesRead) break;
      hash.update(chunk.subarray(0, part.bytesRead));
      length += part.bytesRead;
    }
    if (length !== size) throw new Error();
    return hash.digest('hex');
  });
  return { digest, stats };
}
async function verifyInputs(root: string, inputs: readonly FileIdentity[]): Promise<void> {
  for (let start = 0; start < inputs.length; start += INPUT_READS) {
    const checked = await Promise.allSettled(inputs.slice(start, start + INPUT_READS).map(async input => {
      const value = await read(path.join(root, input.path), input.bytes, root);
      if (value.length !== input.bytes || sha256(value) !== input.sha256) throw new Error();
    }));
    if (checked.some(result => result.status === 'rejected')) throw new Error();
  }
}
export interface UrlRuntime {
  readonly worker: GitMemoryWorkerProgram;
  /** Host-only SO_PEERCRED primitive; never included in the role support mount. */
  readonly peerProgram: KernelPeerProgram;
  readonly supportDirectory: string;
  readonly supportSha256: Readonly<Record<'session-bridge.js' | 'session-mcp.js', string>>;
  readonly manifestSha256: string;
  readonly inputTreeSha256: string;
  /** Identity of installed policy/scaffold/protocol/configuration implementation,
   * separate from each variable-bound compiled role profile. */
  readonly profileRegistrySha256: string;
}

const installed = new WeakMap<UrlRuntime, { readonly root: string; readonly rendererBytes: Uint8Array; readonly rendererSha256: string;
  readonly orderedScreenProgram: OrderedScreenProgram; readonly machineReaderProgram: KernelPeerProgram }>();

/** Select only the screening images verified with this genuine runtime. The
 * runner reopens, holds and rehashes both images at invocation; the caller also
 * supplies protected currentness. A serialized runtime issues no selection. */
export function urlOrderedScreenProgram(runtime: UrlRuntime): OrderedScreenProgram | null {
  return installed.get(runtime)?.orderedScreenProgram ?? null;
}

/** Select only the exact host-only native reader verified in this genuine runtime.
 * The peer adapter reopens and rehashes its held executable on every invocation. */
export function urlMachineReaderProgram(runtime: UrlRuntime): KernelPeerProgram | null {
  return installed.get(runtime)?.machineReaderProgram ?? null;
}

/** Identify the payload for an explicitly requested support variant. This
 * lookup supplies no launch authorization. */
export function urlSessionMcpSupportPath(role: UrlSessionViewInputs['role'], variant: 'ordinary' | 'ordered-design'):
  typeof ORDINARY_MCP | typeof DESIGN_MCP | null {
  if (variant === 'ordinary') return ORDINARY_MCP;
  return role === 'design' && variant === 'ordered-design' ? DESIGN_MCP : null;
}

/** A clean build emits the worker, installed renderer, standalone role
 * support and a host-only native peer primitive. Rehash the captured inputs and exact output
 * set; stale or altered dist cannot become a different program silently. This
 * is local build integrity, not same-UID tamperproof execution or adoption. */
export async function readUrlRuntime(root: string): Promise<{ readonly ok: true; readonly runtime: UrlRuntime }
  | { readonly ok: false; readonly code: 'url-runtime-unavailable' }> {
  try {
    if (!path.isAbsolute(root) || path.resolve(root) !== root || await realpath(root) !== root) throw new Error();
    const directory = path.join(root, 'packages/polaris-dossier/dist/runtime');
    const manifestPath = path.join(directory, 'manifest.json');
    const bytes = await read(manifestPath, BOUNDS.maxBytes, root);
    const manifestSha256 = sha256(bytes);
    const manifest: unknown = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), BOUNDS);
    if (!isRecord(manifest) || !exact(manifest, ['format', 'node', 'inputTreeSha256', 'inputs', 'files']) || manifest.format !== 'polaris-url-runtime/1'
      || !isRecord(manifest.node) || !exact(manifest.node, ['version', 'sha256', 'bytes']) || manifest.node.version !== 'v24.6.0'
      || process.version !== manifest.node.version || !hex(manifest.node.sha256) || !Number.isSafeInteger(manifest.node.bytes)
      || Number(manifest.node.bytes) < 1 || Number(manifest.node.bytes) > 134_217_728 || !hex(manifest.inputTreeSha256)
      || !Array.isArray(manifest.inputs) || manifest.inputs.length < 3 || manifest.inputs.length > 4096
      || !manifest.inputs.every(identity) || !Array.isArray(manifest.files) || manifest.files.length !== OUTPUTS.length
      || !manifest.files.every(identity)) throw new Error();
    const inputs = manifest.inputs, files = manifest.files;
    if (sha256(JSON.stringify(inputs)) !== manifest.inputTreeSha256 || new Set(inputs.map(item => item.path)).size !== inputs.length
      || JSON.stringify(inputs.map(item => item.path)) !== JSON.stringify(inputs.map(item => item.path).sort())
      || JSON.stringify(files.map(item => item.path)) !== JSON.stringify(OUTPUTS)
      || files[3]!.sha256 === files[5]!.sha256
      || !['packages/polaris-dossier/src/git-memory-worker.ts', 'packages/polaris-dossier/src/session-bridge.ts',
        'packages/polaris-dossier/src/session-mcp.ts', 'packages/polaris-dossier/src/session-peer.c',
        'packages/polaris-dossier/src/url-machine-peer.c', RENDERER_ENTRY, 'scripts/build_dossier_runtime.mjs',
        'scripts/compile_dossier_session_support.mjs', 'scripts/compile_dossier_ordered_screen.mjs',
        'package-lock.json', 'package.json', 'packages/polaris-dossier/package.json', ...PROFILE_SOURCES]
        .every(file => inputs.some(input => input.path === file))) throw new Error();
    let totalBytes = 0;
    for (const input of inputs) {
      if (!/^(?:packages|apps|node_modules|scripts)\//u.test(input.path) && !['package-lock.json', 'package.json'].includes(input.path)
        || (!/\.(?:[cm]?[jt]sx?|json)$/u.test(input.path) && !['packages/polaris-dossier/src/session-peer.c', 'packages/polaris-dossier/src/url-machine-peer.c'].includes(input.path)) || input.bytes > 16_777_216) throw new Error();
      totalBytes += input.bytes; if (totalBytes > 67_108_864) throw new Error();
    }
    const node = await realpath(process.execPath);
    const [inputCheck, nodeCheck] = await Promise.allSettled([verifyInputs(root, inputs), readNodeDigest(node, Number(manifest.node.bytes))]);
    if (inputCheck.status !== 'fulfilled' || nodeCheck.status !== 'fulfilled' || nodeCheck.value.digest !== manifest.node.sha256) throw new Error();
    let rendererBytes: Uint8Array | undefined;
    for (const file of files) {
      if (file.bytes > (file.path === 'worker.mjs' || file.path === 'renderer.mjs' || file.path === ORDERED_SCREEN ? 8_388_608 : 262_144)) throw new Error();
      const value = await read(path.join(directory, file.path), file.bytes, root, true);
      if (value.length !== file.bytes || sha256(value) !== file.sha256) throw new Error();
      if (file.path === 'renderer.mjs') rendererBytes = Uint8Array.from(value);
    }
    if (sha256(await read(manifestPath, bytes.length, root)) !== manifestSha256
      || await realpath(process.execPath) !== node || !sameRuntimeFile(nodeCheck.value.stats, await lstat(node))) throw new Error();
    const runtime: UrlRuntime = deepFreeze({ worker: { bundle: path.join(directory, 'worker.mjs'), bundleSha256: files[0]!.sha256,
      node, nodeSha256: manifest.node.sha256 }, peerProgram: { executable: path.join(directory, 'host/session-peer'), sha256: files[4]!.sha256 },
      supportDirectory: path.join(directory, 'support'),
      supportSha256: { 'session-bridge.js': files[2]!.sha256, 'session-mcp.js': files[3]!.sha256 },
      manifestSha256, inputTreeSha256: manifest.inputTreeSha256,
      profileRegistrySha256: sha256(JSON.stringify({ format: 'polaris-supported-cli-registry/1', profile: 'claude-2.1.327-sonnet46/2',
        inputs })) });
    if (rendererBytes === undefined) throw new Error();
    installed.set(runtime, { root, rendererBytes, rendererSha256: files[1]!.sha256,
      machineReaderProgram: deepFreeze({ executable: path.join(directory, MACHINE_PEER), sha256: files[7]!.sha256 }),
      orderedScreenProgram: deepFreeze({ node: { path: node, bytes: Number(manifest.node.bytes), sha256: manifest.node.sha256 },
        worker: { path: path.join(directory, ORDERED_SCREEN), bytes: files[6]!.bytes, sha256: files[6]!.sha256 } }) });
    return { ok: true, runtime };
  } catch { return { ok: false, code: 'url-runtime-unavailable' }; }
}

/** A capability for the actual captured first-party renderer. A function or marker
 * supplied by a caller is never interchangeable with this loader result. */
export interface UrlLoadedRenderer {
  readonly renderer: DossierRenderer;
  readonly identity: { readonly format: 'polaris-url-installed-renderer/1'; readonly sourceEntry: string;
    readonly programSha256: string; readonly programBytes: number; readonly inputTreeSha256: string;
    readonly manifestSha256: string; readonly profileRegistrySha256: string };
}
const loadedRenderers = new WeakMap<UrlLoadedRenderer, UrlRuntime>();
export const isLoadedUrlRenderer = (value: UrlLoadedRenderer): boolean => loadedRenderers.has(value);
export async function loadUrlDossierRenderer(runtime: UrlRuntime): Promise<UrlLoadedRenderer | null> {
  try {
    const captured = installed.get(runtime); if (captured === undefined) return null;
    const fresh = await readUrlRuntime(captured.root);
    if (!fresh.ok || JSON.stringify(fresh.runtime) !== JSON.stringify(runtime)) return null;
    // Import the exact already verified bytes, not a pathname that can change
    // between verification and module loading. This contains trusted Syzygy code only.
    const module: unknown = await import(`data:text/javascript;base64,${Buffer.from(captured.rendererBytes).toString('base64')}`);
    if (!isRecord(module) || typeof module['renderLocalDossier'] !== 'function') return null;
    const after = await readUrlRuntime(captured.root);
    if (!after.ok || JSON.stringify(after.runtime) !== JSON.stringify(runtime)) return null;
    const result: UrlLoadedRenderer = Object.freeze({ renderer: module['renderLocalDossier'] as DossierRenderer,
      identity: deepFreeze({ format: 'polaris-url-installed-renderer/1' as const, sourceEntry: RENDERER_ENTRY,
        programSha256: captured.rendererSha256, programBytes: captured.rendererBytes.length,
        inputTreeSha256: runtime.inputTreeSha256, manifestSha256: runtime.manifestSha256,
        profileRegistrySha256: runtime.profileRegistrySha256 }) });
    loadedRenderers.set(result, runtime); return result;
  } catch { return null; }
}

/** Revalidate current captured inputs/programs without treating serialized identities as capabilities. */
export async function urlRendererCurrent(renderer: UrlLoadedRenderer): Promise<boolean> {
  try {
    const runtime = loadedRenderers.get(renderer), captured = runtime === undefined ? undefined : installed.get(runtime);
    if (runtime === undefined || captured === undefined) return false;
    const fresh = await readUrlRuntime(captured.root);
    return fresh.ok && JSON.stringify(fresh.runtime) === JSON.stringify(runtime);
  } catch { return false; }
}

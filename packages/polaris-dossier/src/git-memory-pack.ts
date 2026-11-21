import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

export type GitMemoryFormat = 'sha1' | 'sha256';
export type GitMemoryObjectType = 'commit' | 'tree' | 'blob';
export interface GitMemoryPackLimits {
  readonly maxPackBytes: number; readonly maxObjectBytes: number; readonly maxObjects: number;
  readonly maxInflatedBytes: number; readonly maxResolvedBytes: number; readonly maxWorkingBytes: number;
  readonly maxDeltaDepth: number; readonly maxWorkBytes: number; readonly maxEntries: number;
  readonly maxTreeDepth: number; readonly maxPathBytes: number; readonly maxMilliseconds: number;
}
/** Configurable downward. Accounted buffers are bounded, not the JS heap or zlib's internal memory.
 * The trusted host must supply a bounded worker for hard CPU/wall/host-memory enforcement. */
export const GIT_MEMORY_PACK_LIMITS: GitMemoryPackLimits = Object.freeze({ maxPackBytes: 16_777_216, maxObjectBytes: 2_097_152,
  maxObjects: 16_384, maxInflatedBytes: 33_554_432, maxResolvedBytes: 33_554_432, maxWorkingBytes: 100_663_296,
  maxDeltaDepth: 64, maxWorkBytes: 134_217_728, maxEntries: 262_144, maxTreeDepth: 4096, maxPathBytes: 4096, maxMilliseconds: 5000 });
export interface GitMemoryObject {
  readonly oid: string; readonly type: GitMemoryObjectType; readonly size: number;
  /** A fresh defensive copy on every access. Structural verification is not policy admission. */
  readonly body: Uint8Array;
}
export interface DecodedGitMemoryPack {
  readonly objectFormat: GitMemoryFormat; readonly objects: readonly GitMemoryObject[];
  readonly compressedBytes: number; readonly inflatedBytes: number; readonly resolvedBytes: number; readonly deltaCount: number;
}
export interface GitMemoryClosure {
  readonly commit: string; readonly tree: string; readonly parents: readonly string[];
  readonly objects: readonly GitMemoryObject[];
  readonly paths: readonly { readonly path: string; readonly mode: '100644' | '100755'; readonly oid: string }[];
  /** Includes root path ''. Every shared subtree alias is represented separately. */
  readonly trees: readonly { readonly path: string; readonly oid: string }[];
}
export type GitMemoryPackCode = 'invalid-input' | 'invalid-limits' | 'budget-exceeded' | 'deadline-exceeded' | 'pack-framing'
  | 'pack-trailer' | 'object-type' | 'object-stream' | 'duplicate-object' | 'delta-invalid' | 'delta-unresolved'
  | 'pin-mismatch' | 'shallow-mismatch' | 'commit-invalid' | 'tree-invalid' | 'unsafe-path' | 'closure-mismatch' | 'decode-failed';
export interface GitMemoryPackFailure { readonly ok: false; readonly code: GitMemoryPackCode; readonly reason: string }
const REASONS: Readonly<Record<GitMemoryPackCode, string>> = Object.freeze({
  'invalid-input': 'Supply only the supported in-memory pack and full selected object format.',
  'invalid-limits': 'Decoder bounds must be positive safe integers within the supported profile.',
  'budget-exceeded': 'The in-memory object or closure bounds were exceeded.', 'deadline-exceeded': 'A decoder deadline check refused further work.',
  'pack-framing': 'The pack version, count, entry framing or exact end is invalid.', 'pack-trailer': 'The complete pack trailer does not match its selected object format.',
  'object-type': 'Only commit, tree and blob objects are supported.', 'object-stream': 'An object compressed stream, size or complete end is invalid.',
  'duplicate-object': 'The pack repeats a full object identity.', 'delta-invalid': 'An internal delta is malformed or outside its bounded base/result.',
  'delta-unresolved': 'A delta has no bounded acyclic internal base.', 'pin-mismatch': 'The exact selected object is not the required tip commit.',
  'shallow-mismatch': 'Exactly one depth-one shallow boundary matching the selected tip is required.',
  'commit-invalid': 'The selected commit uses unsupported or malformed headers, identity or text.',
  'tree-invalid': 'A tree has malformed, duplicate, wrongly typed or unsupported entries.',
  'unsafe-path': 'The tree contains an unsafe, ambiguous or unsupported path or mode.',
  'closure-mismatch': 'The pack is not exactly the selected commit and its complete tree/blob closure.',
  'decode-failed': 'The in-memory verification could not complete.',
});
class Refusal { constructor(readonly code: GitMemoryPackCode) {} }
const refuse = (code: GitMemoryPackCode): never => { throw new Refusal(code); };
const failed = (error: unknown): GitMemoryPackFailure => { const code = error instanceof Refusal ? error.code : 'decode-failed'; return Object.freeze({ ok: false, code, reason: REASONS[code] }); };
function limits(lower: Partial<GitMemoryPackLimits> = {}): GitMemoryPackLimits {
  if (lower === null || typeof lower !== 'object' || Array.isArray(lower)) return refuse('invalid-limits');
  for (const key of Object.keys(lower)) {
    if (!Object.hasOwn(GIT_MEMORY_PACK_LIMITS, key)) return refuse('invalid-limits');
    const value = lower[key as keyof GitMemoryPackLimits];
    if (!Number.isSafeInteger(value) || value! < 1 || value! > GIT_MEMORY_PACK_LIMITS[key as keyof GitMemoryPackLimits]) return refuse('invalid-limits');
  }
  return Object.freeze({ ...GIT_MEMORY_PACK_LIMITS, ...lower });
}
class Budget {
  readonly started = performance.now(); private work = 0; private memory = 0;
  constructor(readonly bounds: GitMemoryPackLimits) {}
  check(): void { if (performance.now() - this.started > this.bounds.maxMilliseconds) refuse('deadline-exceeded'); }
  charge(work: number): void { this.work += work; if (!Number.isSafeInteger(this.work) || this.work > this.bounds.maxWorkBytes) refuse('budget-exceeded'); this.check(); }
  allocate(bytes: number): void { this.memory += bytes; if (!Number.isSafeInteger(this.memory) || this.memory > this.bounds.maxWorkingBytes) refuse('budget-exceeded'); }
}
interface FullObject { oid: string; type: GitMemoryObjectType; body: Buffer; depth: number }
interface InternalPack { readonly format: GitMemoryFormat; readonly objects: ReadonlyMap<string, FullObject>; readonly publicObjects: readonly GitMemoryObject[] }
const decoded = new WeakMap<DecodedGitMemoryPack, InternalPack>();
const oidOf = (format: GitMemoryFormat, type: GitMemoryObjectType, body: Uint8Array): string => createHash(format).update(`${type} ${body.length}\0`).update(body).digest('hex');
const publicObject = (object: FullObject): GitMemoryObject => Object.freeze({ oid: object.oid, type: object.type, size: object.body.length,
  get body(): Uint8Array { return new Uint8Array(object.body); } });
interface Entry { offset: number; kind: number; payload: Buffer; baseOffset?: number; baseOid?: string; full?: FullObject }
const TYPES: Readonly<Record<number, GitMemoryObjectType | undefined>> = { 1: 'commit', 2: 'tree', 3: 'blob' };
function delta(base: Buffer, instructions: Buffer, budget: Budget, remainingResolvedBytes: number): Buffer {
  let at = 0;
  const byte = (): number => { if (at >= instructions.length) return refuse('delta-invalid'); return instructions[at++]!; };
  const number = (): number => {
    let value = 0, factor = 1, count = 0, part: number;
    do { part = byte(); if (++count > 8) return refuse('delta-invalid'); value += (part & 127) * factor; factor *= 128;
      if (!Number.isSafeInteger(value)) return refuse('delta-invalid'); } while (part & 128);
    if (count > 1 && (part & 127) === 0) return refuse('delta-invalid');
    return value;
  };
  const source = number(), target = number();
  if (source !== base.length) return refuse('delta-invalid');
  if (target > budget.bounds.maxObjectBytes || target > remainingResolvedBytes) return refuse('budget-exceeded');
  budget.allocate(target); budget.charge(target + instructions.length);
  const out = Buffer.alloc(target); let written = 0, operations = 0;
  while (at < instructions.length) {
    if (++operations % 1024 === 0) budget.check();
    const op = byte();
    if (op & 128) {
      let from = 0, count = 0;
      for (let bit = 0; bit < 4; bit++) if (op & (1 << bit)) from += byte() * 2 ** (8 * bit);
      for (let bit = 0; bit < 3; bit++) if (op & (16 << bit)) count += byte() * 2 ** (8 * bit);
      if (count === 0) count = 65_536;
      if (from + count > base.length || written + count > target) return refuse('delta-invalid');
      out.set(base.subarray(from, from + count), written); written += count;
    } else {
      if (op === 0 || at + op > instructions.length || written + op > target) return refuse('delta-invalid');
      instructions.copy(out, written, at, at + op); at += op; written += op;
    }
  }
  if (written !== target) return refuse('delta-invalid');
  return out;
}

/** PACK bytes only; the host separately validates wire packet framing. No IO, filesystem import or execution occurs here.
 * Complete streams and independently reconstructed full identities are required. This result is not source-policy admission. */
export function decodeGitMemoryPack(request: { readonly pack: Uint8Array; readonly objectFormat: GitMemoryFormat; readonly limits?: Partial<GitMemoryPackLimits> }):
  { readonly ok: true; readonly pack: DecodedGitMemoryPack } | GitMemoryPackFailure {
  try {
    const bound = limits(request.limits), budget = new Budget(bound), format = request.objectFormat;
    if ((format !== 'sha1' && format !== 'sha256') || !(request.pack instanceof Uint8Array)
      || request.pack.buffer instanceof SharedArrayBuffer) return refuse('invalid-input');
    const width = format === 'sha1' ? 20 : 32;
    if (request.pack.length > bound.maxPackBytes) return refuse('budget-exceeded');
    if (request.pack.length < 12 + width) return refuse('pack-framing');
    budget.allocate(request.pack.length); budget.charge(request.pack.length);
    const pack = Buffer.from(request.pack), end = pack.length - width;
    if (pack.toString('latin1', 0, 4) !== 'PACK' || pack.readUInt32BE(4) !== 2) return refuse('pack-framing');
    const count = pack.readUInt32BE(8);
    if (count === 0) return refuse('pack-framing');
    if (count > bound.maxObjects) return refuse('budget-exceeded');
    budget.allocate(count * 256);
    if (!createHash(format).update(pack.subarray(0, end)).digest().equals(pack.subarray(end))) return refuse('pack-trailer');
    budget.check();
    let at = 12, inflatedBytes = 0, resolvedBytes = 0, deltaCount = 0;
    const entries: Entry[] = [], byOffset = new Map<number, Entry>(), byOid = new Map<string, FullObject>();
    const ofsChildren = new Map<number, Entry[]>(), refChildren = new Map<string, Entry[]>();
    const queue: Entry[] = [];
    const resolved = (entry: Entry, type: GitMemoryObjectType, body: Buffer, depth: number): void => {
      resolvedBytes += body.length;
      if (resolvedBytes > bound.maxResolvedBytes) return refuse('budget-exceeded');
      budget.charge(body.length); const oid = oidOf(format, type, body);
      if (byOid.has(oid)) return refuse('duplicate-object');
      entry.full = { oid, type, body, depth }; byOid.set(oid, entry.full); queue.push(entry);
    };
    for (let index = 0; index < count; index++) {
      budget.check(); const offset = at;
      const byte = (): number => { if (at >= end) return refuse('pack-framing'); return pack[at++]!; };
      let part = byte(), size = part & 15, factor = 16, groups = 1;
      const kind = (part >> 4) & 7;
      while (part & 128) { part = byte(); if (++groups > 8) return refuse('pack-framing'); size += (part & 127) * factor; factor *= 128; }
      if (!Number.isSafeInteger(size) || (groups > 1 && (part & 127) === 0)) return refuse('pack-framing');
      if (size > bound.maxObjectBytes) return refuse('budget-exceeded');
      if (TYPES[kind] === undefined && kind !== 6 && kind !== 7) return refuse('object-type');
      let baseOffset: number | undefined, baseOid: string | undefined;
      if (kind === 6) {
        part = byte(); let back = part & 127, groups = 1;
        while (part & 128) { part = byte(); if (++groups > 8) return refuse('delta-invalid'); back = (back + 1) * 128 + (part & 127); }
        if (!Number.isSafeInteger(back) || back < 1 || !byOffset.has(offset - back)) return refuse('delta-invalid');
        baseOffset = offset - back;
      } else if (kind === 7) {
        if (at + width > end) return refuse('pack-framing');
        baseOid = pack.toString('hex', at, at + width); at += width;
      }
      if (TYPES[kind] !== undefined && resolvedBytes + size > bound.maxResolvedBytes) return refuse('budget-exceeded');
      inflatedBytes += size;
      if (inflatedBytes > bound.maxInflatedBytes) return refuse('budget-exceeded');
      budget.allocate(size + 1); budget.charge(size);
      let payload: Buffer, consumed: number;
      try {
        const out = inflateSync(pack.subarray(at, end), { maxOutputLength: size + 1, info: true }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } };
        payload = out.buffer; consumed = out.engine.bytesWritten;
      } catch { return refuse('object-stream'); }
      budget.check();
      if (payload.length !== size || !Number.isSafeInteger(consumed) || consumed < 1 || at + consumed > end) return refuse('object-stream');
      at += consumed;
      const entry: Entry = { offset, kind, payload, ...(baseOffset === undefined ? {} : { baseOffset }), ...(baseOid === undefined ? {} : { baseOid }) };
      entries.push(entry); byOffset.set(offset, entry);
      const type = TYPES[kind];
      if (type !== undefined) resolved(entry, type, payload, 0);
      else {
        deltaCount++;
        if (baseOffset !== undefined) { const children = ofsChildren.get(baseOffset) ?? []; children.push(entry); ofsChildren.set(baseOffset, children); }
        else { const children = refChildren.get(baseOid!) ?? []; children.push(entry); refChildren.set(baseOid!, children); }
      }
    }
    if (at !== end) return refuse('pack-framing');
    for (let index = 0; index < queue.length; index++) {
      budget.check(); const base = queue[index]!.full!;
      const children = [...(ofsChildren.get(queue[index]!.offset) ?? []), ...(refChildren.get(base.oid) ?? [])];
      for (const child of children) {
        if (child.full !== undefined) continue;
        const depth = base.depth + 1;
        if (depth > bound.maxDeltaDepth) return refuse('budget-exceeded');
        resolved(child, base.type, delta(base.body, child.payload, budget, bound.maxResolvedBytes - resolvedBytes), depth);
      }
    }
    if (byOid.size !== count) return refuse('delta-unresolved');
    const objects = Object.freeze(entries.map(entry => publicObject(entry.full!)));
    const result: DecodedGitMemoryPack = Object.freeze({ objectFormat: format, objects, compressedBytes: pack.length, inflatedBytes, resolvedBytes, deltaCount });
    decoded.set(result, { format, objects: byOid, publicObjects: objects });
    return Object.freeze({ ok: true, pack: result });
  } catch (error) { return failed(error); }
}

interface TreeEntry { mode: '40000' | '100644' | '100755'; name: string; oid: string }
const UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const HFS_IGNORED = /[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/gu;
function safeName(name: string): boolean {
  const lowered = name.replace(HFS_IGNORED, '').toLowerCase();
  return name !== '' && Buffer.byteLength(name) <= 255 && name !== '.' && name !== '..' && !/[\\/:\u0000-\u001f\u007f\p{Cf}\p{Zl}\p{Zp}]/u.test(name)
    && !/[. ]$/u.test(name) && name.normalize('NFC') === name && lowered !== '.git' && lowered !== 'git~1'
    && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/u.test(lowered);
}
function treeEntries(object: FullObject, format: GitMemoryFormat, budget: Budget): readonly TreeEntry[] {
  const body = object.body, width = format === 'sha1' ? 20 : 32, out: TreeEntry[] = [], names = new Set<string>();
  let at = 0; let previous: Buffer | undefined;
  budget.charge(body.length);
  while (at < body.length) {
    budget.check();
    const space = body.indexOf(32, at), nul = space < 0 ? -1 : body.indexOf(0, space + 1);
    if (space < 0 || nul < 0 || nul + 1 + width > body.length) return refuse('tree-invalid');
    const mode = body.toString('latin1', at, space);
    if (mode !== '40000' && mode !== '100644' && mode !== '100755') return refuse('unsafe-path');
    let name: string; try { name = UTF8.decode(body.subarray(space + 1, nul)); } catch { return refuse('unsafe-path'); }
    if (!safeName(name)) return refuse('unsafe-path');
    const key = name.toLowerCase(); if (names.has(key)) return refuse('tree-invalid'); names.add(key);
    const sortKey = Buffer.concat([body.subarray(space + 1, nul), mode === '40000' ? Buffer.from('/') : Buffer.alloc(0)]);
    if (previous !== undefined && Buffer.compare(previous, sortKey) >= 0) return refuse('tree-invalid'); previous = sortKey;
    budget.allocate(256 + 2 * Buffer.byteLength(name));
    if (out.length >= budget.bounds.maxEntries) return refuse('budget-exceeded');
    out.push({ name, mode, oid: body.toString('hex', nul + 1, nul + 1 + width) }); at = nul + 1 + width;
  }
  return out;
}
function commitEnvelope(object: FullObject, format: GitMemoryFormat, budget: Budget): { tree: string; parents: string[] } {
  budget.charge(object.body.length);
  let text: string; try { text = UTF8.decode(object.body); } catch { return refuse('commit-invalid'); }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) return refuse('commit-invalid');
  const end = text.indexOf('\n\n'); if (end < 0) return refuse('commit-invalid');
  const header = text.slice(0, end); if (/[\u0000-\u0009\u000b-\u001f\u007f]/u.test(header)) return refuse('commit-invalid');
  const rows = header.split('\n'), width = format === 'sha1' ? 40 : 64;
  const tree = new RegExp(`^tree ([0-9a-f]{${width}})$`, 'u').exec(rows[0] ?? ''); if (tree === null) return refuse('commit-invalid');
  let at = 1; const parents: string[] = [], seen = new Set<string>();
  while (rows[at]?.startsWith('parent ')) {
    const parent = new RegExp(`^parent ([0-9a-f]{${width}})$`, 'u').exec(rows[at]!);
    if (parent === null || seen.has(parent[1]!) || parent[1] === object.oid) return refuse('commit-invalid');
    seen.add(parent[1]!); parents.push(parent[1]!); at++;
  }
  const identity = /^(author|committer) [^<>\r\n]+ <[^<>\r\n]+> -?(?:0|[1-9][0-9]{0,14}) ([+-])([0-9]{2})([0-9]{2})$/u;
  for (const kind of ['author', 'committer']) {
    const found = identity.exec(rows[at++] ?? '');
    if (found === null || found[1] !== kind || Number(found[3]) > 23 || Number(found[4]) > 59) return refuse('commit-invalid');
  }
  if (at !== rows.length) return refuse('commit-invalid');
  return { tree: tree[1]!, parents };
}

/** Requires this module's genuine in-memory decoder result. Parent commits remain metadata only.
 * Every raw object and every returned file/tree alias still needs the host's independent whole-body/path admission. */
export function validateGitMemoryClosure(request: { readonly pack: DecodedGitMemoryPack; readonly selectedCommit: string;
  readonly shallow: readonly string[]; readonly limits?: Partial<GitMemoryPackLimits> }): { readonly ok: true; readonly closure: GitMemoryClosure } | GitMemoryPackFailure {
  try {
    const bound = limits(request.limits), budget = new Budget(bound), internal = decoded.get(request.pack);
    if (internal === undefined) return refuse('invalid-input');
    const pin = request.selectedCommit, width = internal.format === 'sha1' ? 40 : 64;
    if (typeof pin !== 'string' || pin.length !== width || !/^[0-9a-f]+$/u.test(pin)) return refuse('pin-mismatch');
    if (!Array.isArray(request.shallow) || request.shallow.length !== 1 || request.shallow[0] !== pin) return refuse('shallow-mismatch');
    if (request.pack.compressedBytes > bound.maxPackBytes || request.pack.inflatedBytes > bound.maxInflatedBytes
      || request.pack.resolvedBytes > bound.maxResolvedBytes || internal.objects.size > bound.maxObjects) return refuse('budget-exceeded');
    budget.allocate(request.pack.resolvedBytes + internal.objects.size * 256);
    const commit = internal.objects.get(pin); if (commit?.type !== 'commit') return refuse('pin-mismatch');
    if (commit.body.length > bound.maxObjectBytes) return refuse('budget-exceeded');
    const envelope = commitEnvelope(commit, internal.format, budget), reachable = new Set<string>([pin]), active = new Set<string>();
    const cached = new Map<string, readonly TreeEntry[]>(), paths: GitMemoryClosure['paths'][number][] = [], trees: GitMemoryClosure['trees'][number][] = [];
    const names = new Set<string>(); let visits = 0;
    const stack: { oid: string; prefix: string; pathBytes: number; depth: number; exit?: boolean }[] = [{ oid: envelope.tree, prefix: '', pathBytes: 0, depth: 0 }];
    while (stack.length > 0) {
      budget.check(); const item = stack.pop()!;
      if (item.exit) { active.delete(item.oid); continue; }
      if (active.has(item.oid)) return refuse('closure-mismatch');
      if (item.depth > bound.maxTreeDepth || ++visits > bound.maxEntries) return refuse('budget-exceeded');
      const object = internal.objects.get(item.oid); if (object?.type !== 'tree') return refuse('closure-mismatch');
      if (object.body.length > bound.maxObjectBytes) return refuse('budget-exceeded');
      reachable.add(item.oid); active.add(item.oid); trees.push(Object.freeze({ path: item.prefix, oid: item.oid }));
      stack.push({ ...item, exit: true });
      let entries = cached.get(item.oid); if (entries === undefined) { entries = treeEntries(object, internal.format, budget); cached.set(item.oid, entries); }
      for (let index = entries.length - 1; index >= 0; index--) {
        const entry = entries[index]!, bytes = item.pathBytes + (item.prefix === '' ? 0 : 1) + Buffer.byteLength(entry.name);
        if (bytes > bound.maxPathBytes || ++visits > bound.maxEntries) return refuse('budget-exceeded');
        budget.allocate(256 + 2 * bytes); budget.charge(bytes);
        const name = item.prefix === '' ? entry.name : `${item.prefix}/${entry.name}`, key = name.toLowerCase();
        if (names.has(key)) return refuse('tree-invalid'); names.add(key);
        if (entry.mode === '40000') stack.push({ oid: entry.oid, prefix: name, pathBytes: bytes, depth: item.depth + 1 });
        else {
          const blob = internal.objects.get(entry.oid); if (blob?.type !== 'blob') return refuse('closure-mismatch');
          if (blob.body.length > bound.maxObjectBytes) return refuse('budget-exceeded');
          reachable.add(entry.oid); paths.push(Object.freeze({ path: name, mode: entry.mode, oid: entry.oid }));
        }
      }
    }
    if (reachable.size !== internal.objects.size) return refuse('closure-mismatch');
    for (const oid of internal.objects.keys()) if (!reachable.has(oid)) return refuse('closure-mismatch');
    return Object.freeze({ ok: true, closure: Object.freeze({ commit: pin, tree: envelope.tree, parents: Object.freeze(envelope.parents),
      objects: internal.publicObjects, paths: Object.freeze(paths.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)),
      trees: Object.freeze(trees.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)) }) });
  } catch (error) { return failed(error); }
}

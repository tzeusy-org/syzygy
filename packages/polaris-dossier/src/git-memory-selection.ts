import { decodeUtf8, sha256 } from '@syzygy/support';
import { planUrlRevision, selectUrlRevision, type UrlRevisionPlan, type UrlRevisionResult, type UrlRevisionSelection } from './url-revision.js';
import type { GitMemoryEvidence, GitMemoryFailure, GitMemoryLimits } from './git-memory-transport.js';

export interface GitSelectionMetadata {
  readonly stage: 'connect' | 'ls-refs'; readonly sourceProvider: string; readonly url: string;
  readonly destination: Readonly<Record<string, string | number>>;
  readonly selector: string | null; readonly plan: UrlRevisionPlan;
  readonly objectFormat: 'sha1' | 'sha256' | null; readonly classes: readonly ['code-structure'];
  readonly protocol: 'git-v2-stateless' | 'git-v2-ssh'; readonly wire: Uint8Array;
  readonly digest: string; readonly bytes: number; readonly config: Readonly<Record<string, unknown>>;
  readonly configDigest: string; readonly bindingDigest: string;
}
export interface GitSelectionRequest {
  readonly url: string; readonly home?: string; readonly selector?: string;
  readonly sourceProvider: string; readonly limits?: Partial<GitMemoryLimits>;
  /** Same independent declaration, metadata classification/screen and durable pre-send audit
   * as reception; no first-envelope or caller-string grant. Full pins require no network. */
  readonly admitMetadata: (metadata: GitSelectionMetadata) => boolean | Promise<boolean>;
  readonly admitIncomingMetadata?: GitIncomingAdmission;
}
export type GitSelectionPlanFailure = Extract<UrlRevisionResult<never>, { ok: false }>;
export interface GitSelectionOperation {
  readonly selector: string | null; readonly plan: UrlRevisionPlan;
  readonly admitMetadata: GitSelectionRequest['admitMetadata'];
  readonly admitIncomingMetadata?: GitIncomingAdmission;
}
export type GitSelectionResult = { readonly ok: true; readonly selection: UrlRevisionSelection; readonly evidence: GitMemoryEvidence }
  | { readonly ok: false; readonly code: GitMemoryFailure | Exclude<UrlRevisionResult<never>, { ok: true }>['code']; readonly reason: string; readonly evidence: GitMemoryEvidence };
export function prepareGitSelection(request: Pick<GitSelectionRequest, 'selector' | 'admitMetadata' | 'admitIncomingMetadata'>): UrlRevisionResult<GitSelectionOperation> {
  const result = planUrlRevision(request.selector);
  if (!result.ok) return result;
  const plan = result.value;
  const frozen: UrlRevisionPlan = plan.kind === 'remote-ref'
    ? Object.freeze({ ...plan, references: Object.freeze([...plan.references]), queries: Object.freeze([...plan.queries]) })
    : Object.freeze({ ...plan, queries: Object.freeze([...plan.queries]) }) as UrlRevisionPlan;
  return { ok: true, value: Object.freeze({ selector: request.selector ?? null, plan: frozen, admitMetadata: request.admitMetadata, admitIncomingMetadata: request.admitIncomingMetadata }) };
}
function packet(text: string): Buffer { const bytes = Buffer.from(text, 'utf8'); return Buffer.concat([Buffer.from((bytes.length + 4).toString(16).padStart(4, '0')), bytes]); }
/** Git v2 uses prefix requests; exact response matching still occurs below. */
export function gitLsRefsWire(plan: UrlRevisionPlan, format: 'sha1' | 'sha256'): Buffer {
  if (plan.kind === 'full-commit') return Buffer.alloc(0);
  const prefixes = plan.kind === 'remote-default' ? ['HEAD'] : plan.references;
  return Buffer.concat([packet('command=ls-refs\n'), packet(`object-format=${format}\n`), Buffer.from('0001'), packet('symrefs\n'), packet('peel\n'), ...prefixes.map(ref => packet(`ref-prefix ${ref}\n`)), Buffer.from('0000')]);
}
/** Decode only the known ls-refs schema, then reuse the unchanged semantic selector.
 * Unknown attributes, prefix overmatches, duplicate/mixed-format rows fail closed. */
export function selectGitLsRefs(plan: UrlRevisionPlan, format: 'sha1' | 'sha256', packets: readonly Uint8Array[]): UrlRevisionResult<UrlRevisionSelection> {
  const invalid = (): UrlRevisionResult<never> => ({ ok: false, code: 'metadata-invalid', reason: 'The Git v2 reference metadata is malformed, conflicting or outside the exact requested schema.' });
  if (plan.kind === 'full-commit') return selectUrlRevision(plan, '');
  if (packets.length > 128 || packets.reduce((bytes, packet) => bytes + packet.length + 4, 0) > 65_536) return { ok: false, code: 'metadata-limit', reason: 'The Git v2 reference metadata exceeds the bounded selection profile.' };
  const requested = new Set(plan.kind === 'remote-default' ? ['HEAD'] : plan.references);
  const identifier = format === 'sha1' ? /^[a-f0-9]{40}$/iu : /^[a-f0-9]{64}$/iu;
  const rows: string[] = [];
  for (const packet of packets) {
    const text = decodeUtf8(packet);
    if (text === undefined || !Buffer.from(text, 'utf8').equals(Buffer.from(packet))) return invalid();
    if (!text.endsWith('\n') || /[\x00-\x1f\x7f]/u.test(text.slice(0, -1))) return invalid();
    const [oid, ref, ...attributes] = text.slice(0, -1).split(' ');
    if (oid === undefined || ref === undefined || !identifier.test(oid) || !requested.has(ref)) return invalid();
    let target: string | null = null, peeled: string | null = null;
    for (const attribute of attributes) {
      if (attribute.startsWith('symref-target:') && target === null && plan.kind === 'remote-default' && ref === 'HEAD') target = attribute.slice(14);
      else if (attribute.startsWith('peeled:') && peeled === null && plan.kind === 'remote-ref' && ref.startsWith('refs/tags/') && identifier.test(attribute.slice(7))) peeled = attribute.slice(7);
      else return invalid();
    }
    if (target !== null) rows.push(`ref: ${target}\tHEAD\n`);
    rows.push(`${oid}\t${ref}\n`);
    if (peeled !== null) rows.push(`${peeled}\t${ref}^{}\n`);
  }
  return selectUrlRevision(plan, rows.join(''));
}

export type GitIncomingUnit = 'advertisement' | 'ls-refs' | 'fetch-header' | 'fetch-end';
export type GitIncomingProtocol = 'git-v2-stateless' | 'git-v2-ssh';
export type GitObjectFormat = 'sha1' | 'sha256';
export type GitIncomingParsed =
  | { readonly kind: 'advertisement'; readonly protocolVersion: 2; readonly agent: string | null; readonly lsRefs: '' | 'unborn' | null; readonly fetch: readonly ('shallow' | 'wait-for-done')[]; readonly serverOption: boolean; readonly objectFormat: GitObjectFormat }
  | { readonly kind: 'ls-refs'; readonly objectFormat: GitObjectFormat; readonly rows: readonly { readonly identifier: string; readonly reference: string; readonly attributes: readonly { readonly kind: 'symref-target' | 'peeled'; readonly value: string }[] }[] }
  | { readonly kind: 'fetch-header'; readonly objectFormat: GitObjectFormat; readonly shallowIdentifier: string; readonly leadingResponseEnd: boolean }
  | { readonly kind: 'fetch-end'; readonly objectFormat: GitObjectFormat; readonly header: Extract<GitIncomingParsed, { kind: 'fetch-header' }>; readonly headerDigest: string; readonly endMarkers: readonly (0 | 2)[] };
export interface GitDecodedIncomingUnit {
  readonly parsed: GitIncomingParsed;
  /** Exact decoded framed wire and exact concatenated textual packet payloads. */
  readonly text: string; readonly payloadText: string;
  readonly decodedFields: readonly string[]; readonly composition: string;
}
export interface GitIncomingMetadata extends GitDecodedIncomingUnit {
  readonly stage: 'advertisement' | 'ls-refs' | 'fetch-metadata'; readonly unit: GitIncomingUnit;
  readonly operation: 'selection' | 'receive'; readonly protocol: GitIncomingProtocol;
  readonly sourceProvider: string; readonly url: string; readonly destination: Readonly<Record<string, string | number>>;
  readonly pin: string | null; readonly selector: string | null; readonly plan: UrlRevisionPlan | null;
  readonly objectFormat: GitObjectFormat | null; readonly classes: readonly ['code-structure'];
  readonly profile: string; readonly configDigest: string; readonly rawWire: Uint8Array;
  readonly digest: string; readonly bytes: number; readonly bindingDigest: string;
  readonly previousBindingDigest: string | null; readonly cumulativeText: string; readonly cumulativeComposition: string;
}
export type GitIncomingAdmission = (metadata: GitIncomingMetadata) => boolean | Promise<boolean>;
export const GIT_INCOMING_METADATA_LIMITS = Object.freeze({ bytes: 65_536, frames: 132, fields: 1024, units: 3, cumulativeBytes: 196_608 });
/** Reconstruct the exact already-framed textual/control subsequence. PACK/sideband bytes
 * must never be supplied. The bounds precede concatenation/allocation by callers. */
export function gitMetadataFrame(value: Uint8Array | 0 | 1 | 2): Buffer {
  if (typeof value === 'number') return Buffer.from(value.toString(16).padStart(4, '0'));
  return Buffer.concat([Buffer.from((value.length + 4).toString(16).padStart(4, '0')), value]);
}
function freezeMetadata<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeMetadata(child);
    Object.freeze(value);
  }
  return value;
}
/** Host and worker can rederive this bounded known schema from raw metadata, rather
 * than trusting an asserted parsed object, decoded text or detector composition. */
export function decodeGitIncomingUnit(unit: GitIncomingUnit, protocol: GitIncomingProtocol, objectFormat: GitObjectFormat | null, rawWire: Uint8Array): GitDecodedIncomingUnit | undefined {
  if (!(rawWire instanceof Uint8Array) || rawWire.length > GIT_INCOMING_METADATA_LIMITS.bytes || !['git-v2-stateless', 'git-v2-ssh'].includes(protocol)) return undefined;
  const raw = Buffer.from(rawWire), text = decodeUtf8(raw);
  if (text === undefined || !Buffer.from(text, 'utf8').equals(raw)) return undefined;
  const frames: (Buffer | 0 | 1 | 2)[] = [], fields: string[] = [], payloads: string[] = [];
  let at = 0;
  while (at < raw.length) {
    if (frames.length >= GIT_INCOMING_METADATA_LIMITS.frames || at + 4 > raw.length) return undefined;
    const header = raw.subarray(at, at + 4);
    if (!header.every(byte => (byte >= 48 && byte <= 57) || (byte >= 97 && byte <= 102))) return undefined;
    const count = Number.parseInt(header.toString('ascii'), 16); at += 4;
    if (count <= 2) { frames.push(count as 0 | 1 | 2); fields.push(header.toString('ascii')); continue; }
    if (count < 5 || count > 65_520 || at + count - 4 > raw.length) return undefined;
    const body = raw.subarray(at, at + count - 4); at += count - 4;
    const payload = decodeUtf8(body);
    if (payload === undefined || !Buffer.from(payload, 'utf8').equals(body) || /[\x00-\x09\x0b-\x1f\x7f]/u.test(payload) || payload.slice(0, -1).includes('\n')) return undefined;
    frames.push(body); payloads.push(payload);
    for (const field of payload.replace(/\n$/u, '').split(/[ =:]/u)) { if (field !== '') fields.push(field); }
    if (fields.length > GIT_INCOMING_METADATA_LIMITS.fields) return undefined;
  }
  const payload = (frame: Buffer | 0 | 1 | 2 | undefined): string | undefined => Buffer.isBuffer(frame) ? decodeUtf8(frame) : undefined;
  const oid = (value: string, format: GitObjectFormat): boolean => (format === 'sha1' ? /^[a-f0-9]{40}$/iu : /^[a-f0-9]{64}$/iu).test(value);
  let parsed: GitIncomingParsed;
  if (unit === 'advertisement') {
    if (payload(frames[0]) !== 'version 2\n' || frames.at(-1) !== 0) return undefined;
    let agent: string | null = null, lsRefs: '' | 'unborn' | null = null, fetch: ('shallow' | 'wait-for-done')[] | null = null, serverOption = false, format: GitObjectFormat | null = null;
    const seen = new Set<string>();
    for (const frame of frames.slice(1, -1)) {
      const line = payload(frame); if (line === undefined || !/^[\x20-\x7e]+\n$/.test(line)) return undefined;
      const key = line.replace(/\n$/u, '').split('=')[0]!;
      if (seen.has(key)) return undefined; seen.add(key);
      if (key === 'agent' && /^agent=[A-Za-z0-9./_+-]{1,200}\n$/.test(line)) agent = line.slice(6, -1);
      else if (line === 'ls-refs=\n' || line === 'ls-refs=unborn\n') lsRefs = line === 'ls-refs=\n' ? '' : 'unborn';
      else if (key === 'fetch') {
        const values = line.slice(6, -1).split(' ');
        if (!values.includes('shallow') || new Set(values).size !== values.length || values.some(value => value !== 'shallow' && value !== 'wait-for-done')) return undefined;
        fetch = values as ('shallow' | 'wait-for-done')[];
      } else if (line === 'server-option\n') serverOption = true;
      else if (line === 'object-format=sha1\n' || line === 'object-format=sha256\n') format = line === 'object-format=sha1\n' ? 'sha1' : 'sha256';
      else return undefined;
    }
    if (fetch === null || format === null || (objectFormat !== null && objectFormat !== format)) return undefined;
    parsed = { kind: 'advertisement', protocolVersion: 2, agent, lsRefs, fetch, serverOption, objectFormat: format };
  } else if (unit === 'ls-refs') {
    if (objectFormat === null) return undefined;
    let selected = frames;
    if (protocol === 'git-v2-stateless') { if (selected.at(-1) !== 2) return undefined; selected = selected.slice(0, -1); if (selected[0] === 2) selected = selected.slice(1); }
    if (selected.at(-1) !== 0) return undefined;
    const rows: Extract<GitIncomingParsed, { kind: 'ls-refs' }>['rows'][number][] = [];
    for (const frame of selected.slice(0, -1)) {
      const line = payload(frame); if (line === undefined || !line.endsWith('\n')) return undefined;
      const [identifier, reference, ...attributes] = line.slice(0, -1).split(' ');
      if (identifier === undefined || reference === undefined || !oid(identifier, objectFormat) || reference.length > 1024 || (reference !== 'HEAD' && !reference.startsWith('refs/')) || /[\x00-\x20\x7f]/u.test(reference)) return undefined;
      const decoded: { kind: 'symref-target' | 'peeled'; value: string }[] = [], seen = new Set<string>();
      for (const attribute of attributes) {
        const separator = attribute.indexOf(':'), name = attribute.slice(0, separator), value = attribute.slice(separator + 1);
        if (separator < 0 || seen.has(name)) return undefined; seen.add(name);
        if (name === 'symref-target' && reference === 'HEAD' && value.startsWith('refs/') && value.length <= 1024 && !/[\x00-\x20\x7f]/u.test(value)) decoded.push({ kind: name, value });
        else if (name === 'peeled' && reference.startsWith('refs/tags/') && oid(value, objectFormat)) decoded.push({ kind: name, value });
        else return undefined;
      }
      rows.push({ identifier, reference, attributes: decoded });
    }
    parsed = { kind: 'ls-refs', objectFormat, rows };
  } else if (unit === 'fetch-header') {
    if (objectFormat === null) return undefined;
    const leadingResponseEnd = protocol === 'git-v2-stateless' && frames[0] === 2, selected = leadingResponseEnd ? frames.slice(1) : frames;
    if (selected.length !== 4 || payload(selected[0]) !== 'shallow-info\n' || selected[2] !== 1 || payload(selected[3]) !== 'packfile\n') return undefined;
    const shallow = payload(selected[1]); if (shallow === undefined || !/^shallow [a-f0-9]+\n?$/iu.test(shallow)) return undefined;
    const shallowIdentifier = shallow.slice(8).replace(/\n$/u, ''); if (!oid(shallowIdentifier, objectFormat)) return undefined;
    parsed = { kind: 'fetch-header', objectFormat, shallowIdentifier, leadingResponseEnd };
  } else if (unit === 'fetch-end') {
    if (objectFormat === null) return undefined;
    const count = protocol === 'git-v2-stateless' ? 2 : 1, markers = frames.slice(-count);
    if (markers[0] !== 0 || (count === 2 && markers[1] !== 2)) return undefined;
    const headerWire = Buffer.concat(frames.slice(0, -count).map(frame => gitMetadataFrame(frame)));
    const header = decodeGitIncomingUnit('fetch-header', protocol, objectFormat, headerWire);
    if (header?.parsed.kind !== 'fetch-header') return undefined;
    parsed = { kind: 'fetch-end', objectFormat, header: header.parsed, headerDigest: sha256(headerWire), endMarkers: markers as (0 | 2)[] };
  } else return undefined;
  return freezeMetadata({ parsed, text, payloadText: payloads.join(''), decodedFields: fields, composition: fields.join('') });
}

/** Counts before framing/copying. Its inputs are only text/control packets. */
export class GitMetadataUnitBuffer {
  private readonly parts: Buffer[] = []; private bytes = 0;
  constructor(private readonly maxBytes: number = GIT_INCOMING_METADATA_LIMITS.bytes, private readonly maxFrames: number = GIT_INCOMING_METADATA_LIMITS.frames) {}
  append(value: Uint8Array | 0 | 1 | 2): boolean {
    const bytes = typeof value === 'number' ? 4 : value.length + 4;
    if (this.parts.length >= Math.min(this.maxFrames, GIT_INCOMING_METADATA_LIMITS.frames) || this.bytes + bytes > Math.min(this.maxBytes, GIT_INCOMING_METADATA_LIMITS.bytes)) return false;
    this.parts.push(gitMetadataFrame(value)); this.bytes += bytes; return true;
  }
  wire(): Buffer { return Buffer.concat(this.parts, this.bytes); }
}

import { isRecord, sha256 } from '@syzygy/support';

/** Shape packs (REQ-polaris-generation-034 version 2.4, syzygy-3efd.43): versioned data that supplies the technology dimensions the
 * reader standards' RS-11 asks a dossier to cover, selected by the pinned tree's traits, so a repository that is not a server is not asked
 * about networking, state and concurrency. Implementation data, never authority: the reader standards are working guidance
 * (REQ-polaris-generation-014).
 *
 * Each pack is a JSON document under `shape-packs/` (`default.json`, `server.json`). The packs this module ships are the same documents
 * held here as data, so the `syzygy` binary reads no file to compose a brief; a test holds each file byte-identical to its pack's encoding
 * (two-space JSON, one trailing newline), which is also the text its digest is taken over. A version moves whenever any other byte of
 * its pack changes. */

export const SHAPE_PACK_FORMAT = 'polaris-dossier-shape-pack/1';

export interface ShapePackDimension { readonly id: string; readonly order: number; readonly lines: readonly string[] }
export interface ShapePack {
  readonly format: typeof SHAPE_PACK_FORMAT;
  readonly id: string;
  readonly version: number;
  readonly selectedBy: null | { readonly trait: string };
  readonly dimensions: readonly ShapePackDimension[];
}

/** The always-selected pack: four dimensions that suit any shape, the architecture dimension without the server form. */
export const DEFAULT_PACK: ShapePack = {
  format: SHAPE_PACK_FORMAT,
  id: 'default',
  version: 1,
  selectedBy: null,
  dimensions: [
    { id: 'language-and-runtime', order: 10, lines: ['  - Language and runtime: languages, runtime or VM, and versions where they', '    matter.'] },
    { id: 'architecture', order: 20, lines: ['  - Architecture: how the product is divided into parts (modules,', '    packages, commands or processes), and which part holds what.'] },
    { id: 'interfaces', order: 60, lines: ['  - Interfaces: how people and programs reach it (CLI, API, SDK, protocol)', '    and which of these are stable.'] },
    { id: 'platforms-and-dependencies', order: 70, lines: ['  - Platforms and dependencies: supported systems and hardware, and the', '    dependencies the design rests on.'] },
  ],
};

/** The server pack, selected by the trait `server-entry`: the server-only dimensions and the server form of architecture, each byte for
 * byte the RS-11 bullet of `polaris-reader-standards-v1`. */
export const SERVER_PACK: ShapePack = {
  format: SHAPE_PACK_FORMAT,
  id: 'server',
  version: 1,
  selectedBy: { trait: 'server-entry' },
  dimensions: [
    { id: 'architecture', order: 20, lines: ['  - Architecture: how the product is deployed and divided (server and', '    clients, embedded library, single process or distributed cluster), and', '    which part holds what.'] },
    { id: 'networking', order: 30, lines: ['  - Networking: protocols and transports (TCP, UDP, HTTP, gRPC, a custom', '    wire protocol), the wire format, and how peers find each other.'] },
    { id: 'state-and-persistence', order: 40, lines: ['  - State and persistence: where state lives (memory, files, an embedded or', '    external database), how it is made durable, and what consistency it', '    promises.'] },
    { id: 'concurrency', order: 50, lines: ['  - Concurrency: threads, event loop, processes or actors, and what that', '    means for throughput and ordering.'] },
  ],
};

/** The pack's encoding: its members in the schema's order, two-space JSON, one trailing newline. */
export const encodeShapePack = (pack: ShapePack): string => `${JSON.stringify({
  format: pack.format, id: pack.id, version: pack.version, selectedBy: pack.selectedBy,
  dimensions: pack.dimensions.map((dimension) => ({ id: dimension.id, order: dimension.order, lines: dimension.lines })),
}, null, 2)}\n`;
export const shapePackIdentity = (pack: Pick<ShapePack, 'id' | 'version'>): string => `${pack.id}@${pack.version}`;
export const shapePackSha256 = (pack: ShapePack): string => sha256(encodeShapePack(pack));

const PACK_ID = /^[a-z][a-z0-9-]*$/u;
const PACK_KEYS = ['format', 'id', 'version', 'selectedBy', 'dimensions'];
const DIMENSION_KEYS = ['id', 'order', 'lines'];
/** A dimension bullet: its first line opens an RS-11 bullet, every other line continues it. */
const FIRST_LINE = /^ {2}- [A-Z][^\n]*$/u;
const NEXT_LINE = /^ {4}\S[^\n]*$/u;

/** Why a parsed document is not a shape pack of this format, or undefined when it is one. Checked: the members and their order, the
 * format, the identity, a positive integer version, `selectedBy`, and each dimension's identity (unique), positive integer order and
 * bullet lines. */
export function shapePackRefusal(value: unknown): string | undefined {
  if (!isRecord(value)) return 'a shape pack is a JSON object';
  if (Object.keys(value).join(',') !== PACK_KEYS.join(',')) return `a shape pack has exactly the members ${PACK_KEYS.join(', ')}, in that order`;
  if (value['format'] !== SHAPE_PACK_FORMAT) return `a shape pack's format is ${SHAPE_PACK_FORMAT}`;
  if (typeof value['id'] !== 'string' || !PACK_ID.test(value['id'])) return 'a shape pack\'s id is lower-case letters, digits and hyphens, starting with a letter';
  if (typeof value['version'] !== 'number' || !Number.isSafeInteger(value['version']) || value['version'] < 1) return 'a shape pack\'s version is a positive integer';
  const selectedBy = value['selectedBy'];
  if (selectedBy !== null && !(isRecord(selectedBy) && Object.keys(selectedBy).join(',') === 'trait' && typeof selectedBy['trait'] === 'string' && PACK_ID.test(selectedBy['trait']))) {
    return 'a shape pack\'s selectedBy is null or {"trait": <trait id>}';
  }
  if (!Array.isArray(value['dimensions']) || value['dimensions'].length === 0) return 'a shape pack holds at least one dimension';
  const seen = new Set<string>();
  for (const [i, dimension] of value['dimensions'].entries()) {
    if (!isRecord(dimension) || Object.keys(dimension).join(',') !== DIMENSION_KEYS.join(',')) return `dimension ${i} has exactly the members ${DIMENSION_KEYS.join(', ')}, in that order`;
    if (typeof dimension['id'] !== 'string' || !PACK_ID.test(dimension['id']) || seen.has(dimension['id'])) return `dimension ${i}'s id is a unique identity of lower-case letters, digits and hyphens`;
    seen.add(dimension['id']);
    if (typeof dimension['order'] !== 'number' || !Number.isSafeInteger(dimension['order']) || dimension['order'] < 1) return `dimension ${i}'s order is a positive integer`;
    const lines = dimension['lines'];
    if (!Array.isArray(lines) || lines.length === 0 || !lines.every((line, k) => typeof line === 'string' && (k === 0 ? FIRST_LINE : NEXT_LINE).test(line))) {
      return `dimension ${i}'s lines are one RS-11 bullet: a first line opening "  - " and continuation lines indented four spaces`;
    }
  }
  return undefined;
}

/** The packs this Syzygy ships, by identity. Each is checked against the schema when the module loads. */
export const SHIPPED_PACKS: ReadonlyMap<string, ShapePack> = new Map([DEFAULT_PACK, SERVER_PACK].map((pack) => {
  const refusal = shapePackRefusal(JSON.parse(encodeShapePack(pack)));
  if (refusal !== undefined) throw new Error(`shape pack ${shapePackIdentity(pack)}: ${refusal}`);
  return [shapePackIdentity(pack), pack] as const;
}));

/** The trait profile packs are selected by: here the one trait a pack names, `server-entry`. */
export interface PackTraits { readonly serverEntry: boolean }

/** The selection: the default pack, then every pack whose trait holds, in identity code-unit order. Deterministic: the same traits give
 * the same packs. A trait profile that could not be derived (null) selects the default pack alone. */
export function selectShapePacks(traits: PackTraits | null): readonly ShapePack[] {
  const holds = (trait: string): boolean => traits !== null && trait === 'server-entry' && traits.serverEntry;
  const chosen = [...SHIPPED_PACKS.values()].filter((pack) => pack.selectedBy !== null && holds(pack.selectedBy.trait))
    .sort((a, b) => { const x = shapePackIdentity(a), y = shapePackIdentity(b); return x < y ? -1 : x > y ? 1 : 0; });
  return [DEFAULT_PACK, ...chosen];
}

/** The composed dimensions: the first pack's, each later pack replacing a dimension of the same id and adding any other, ordered by
 * `order`, then by `id`. */
export function composeDimensions(packs: readonly ShapePack[]): readonly ShapePackDimension[] {
  const byId = new Map<string, ShapePackDimension>();
  for (const pack of packs) for (const dimension of pack.dimensions) byId.set(dimension.id, dimension);
  return [...byId.values()].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

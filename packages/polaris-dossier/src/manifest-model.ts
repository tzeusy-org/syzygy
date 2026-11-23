/** What the manifest readers (`manifest-json.ts`, `manifest-toml.ts`, `manifest-yaml.ts`) hand the recognizers, and the fault order every
 * recognizer applies (REQ-polaris-generation-034 version 2.7, syzygy-3efd.25). Pure.
 *
 * A reader parses one admitted body into a tree of nodes, each carrying the 1-based lines it occupies, numbered as the path-and-range check
 * numbers them (a line ends at CRLF, CR or LF; a final terminator opens no line). It never throws on its input: it states whether the text
 * is valid in its format as far as it read (`syntax`), whether it holds a form the reader does not read (`beyond`), and every mapping in
 * which a name was repeated, by the path of keys that leads to that mapping (`'#'` for an array element). */

export type ParseFault = 'duplicate-key' | 'syntax' | 'field-type' | 'beyond-reader';
export interface Lines { readonly first: number; readonly last: number }

export type MKey = { readonly kind: 'string'; readonly value: string } | { readonly kind: 'other' } | { readonly kind: 'beyond' };
export interface MEntry { readonly key: MKey; readonly value: MNode; readonly lines: Lines }
export type MNode =
  | { readonly kind: 'string'; readonly value: string; readonly lines: Lines }
  /** A number, boolean, null or other scalar that is not a string; for a plain YAML scalar the core schema resolves to an integer, its
   * text as written (`int`, infrastructure recognizers: only `compose-file` reads it). */
  | { readonly kind: 'other'; readonly lines: Lines; readonly int?: string }
  /** A value in a form the reader does not read (a YAML alias, a TOML date-time). */
  | { readonly kind: 'beyond'; readonly lines: Lines }
  | { readonly kind: 'array'; readonly items: readonly MNode[]; readonly lines: Lines }
  | { readonly kind: 'map'; readonly entries: readonly MEntry[]; readonly lines: Lines };

export interface Parsed {
  /** The document's value; null when the text is not valid as far as it was read, or holds no document. */
  readonly root: MNode | null;
  readonly syntax: boolean;
  readonly beyond: boolean;
  /** The key path of every mapping in which a name was repeated. */
  readonly duplicates: readonly (readonly string[])[];
  /** A YAML stream's documents, each root in order (null for an empty document), where the reader read one (infrastructure recognizers). */
  readonly documents?: readonly (MNode | null)[];
}

export type FactKind = 'package' | 'module' | 'workspace-member' | 'dependency' | 'workflow' | 'workflow-trigger' | 'job' | 'job-needs'
  | 'service' | 'service-image' | 'service-port' | 'service-depends-on' | 'kubernetes-object' | 'terraform-resource' | 'terraform-module'
  | 'make-target' | 'cmake-project' | 'cmake-target';
/** One fact a recognizer reads, before the value checks: its kind, its lines and its members' values in the requirement's member order. */
export interface RawFact { readonly fact: FactKind; readonly lines: Lines; readonly values: readonly (string | null)[] }
export type Recognized = { readonly ok: true; readonly facts: readonly RawFact[] } | { readonly ok: false; readonly parseFault: ParseFault };

/** The member names of each kind, in order, and whether each is taken from the body (and so value-checked) rather than bounded by a rule. */
export const FACT_MEMBERS: Readonly<Record<FactKind, readonly { readonly name: string; readonly fromBody: boolean }[]>> = {
  package: [{ name: 'name', fromBody: true }],
  module: [{ name: 'name', fromBody: true }],
  'workspace-member': [{ name: 'pattern', fromBody: true }],
  dependency: [{ name: 'name', fromBody: true }, { name: 'section', fromBody: false }, { name: 'group', fromBody: true }],
  workflow: [{ name: 'name', fromBody: true }],
  'workflow-trigger': [{ name: 'event', fromBody: true }],
  job: [{ name: 'job', fromBody: true }],
  'job-needs': [{ name: 'from', fromBody: true }, { name: 'to', fromBody: true }],
  // The infrastructure recognizers. A `targetKind` is bounded by the rule (the command's name), never taken from the body.
  service: [{ name: 'service', fromBody: true }],
  'service-image': [{ name: 'service', fromBody: true }, { name: 'image', fromBody: true }],
  'service-port': [{ name: 'service', fromBody: true }, { name: 'port', fromBody: true }],
  'service-depends-on': [{ name: 'from', fromBody: true }, { name: 'to', fromBody: true }],
  'kubernetes-object': [{ name: 'kind', fromBody: true }, { name: 'name', fromBody: true }],
  'terraform-resource': [{ name: 'type', fromBody: true }, { name: 'name', fromBody: true }],
  'terraform-module': [{ name: 'name', fromBody: true }, { name: 'source', fromBody: true }],
  'make-target': [{ name: 'target', fromBody: true }],
  'cmake-project': [{ name: 'name', fromBody: true }],
  'cmake-target': [{ name: 'target', fromBody: true }, { name: 'targetKind', fromBody: false }],
};
export const FACT_KIND_ORDER: readonly FactKind[] = [
  'package', 'module', 'workspace-member', 'dependency', 'workflow', 'workflow-trigger', 'job', 'job-needs',
  'service', 'service-image', 'service-port', 'service-depends-on', 'kubernetes-object', 'terraform-resource', 'terraform-module',
  'make-target', 'cmake-project', 'cmake-target',
];

/** The 1-based line of each UTF-16 offset of `text`, by the path-and-range check's line rule. */
export function lineIndex(text: string): (offset: number) => number {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0x0d && text.charCodeAt(i + 1) === 0x0a) { i++; starts.push(i + 1); } else if (c === 0x0d || c === 0x0a) starts.push(i + 1);
  }
  return (offset) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid]! <= offset) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

/** How many lines the path-and-range check counts in `text`: a final terminator ends the last line and opens none. */
export function lineCountOf(text: string): number {
  if (text.length === 0) return 0;
  const last = lineIndex(text)(text.length - 1);
  return last;
}

/** What a recognizer's walk over a parsed tree found: the facts, and whether a field it reads had the wrong type or a form it does not read. */
export class FieldWalk {
  readonly facts: RawFact[] = [];
  fieldType = false;
  beyond = false;
  add(fact: FactKind, lines: Lines, ...values: (string | null)[]): void { this.facts.push({ fact, lines, values }); }
  /** A read field's value: false when it is in a form the reader does not read (noted) or of another type than `want` (noted). */
  is<K extends MNode['kind']>(node: MNode, want: K): node is Extract<MNode, { kind: K }> {
    if (node.kind === want) return true;
    if (node.kind === 'beyond') this.beyond = true; else this.fieldType = true;
    return false;
  }
  /** A key a member is taken from: its string, or undefined (a non-string key is a `field-type` fault, an unread one `beyond-reader`). */
  keyOf(key: MKey): string | undefined {
    if (key.kind === 'string') return key.value;
    if (key.kind === 'beyond') this.beyond = true; else this.fieldType = true;
    return undefined;
  }
}

/** The value of the member named `name` of a mapping (its first, when repeated; a repetition the recognizer reads is a fault first). */
export const member = (map: Extract<MNode, { kind: 'map' }>, name: string): MEntry | undefined =>
  map.entries.find((entry) => entry.key.kind === 'string' && entry.key.value === name);

/** The fault a body takes, the first that applies in the requirement's order, or the walk's facts. `isRead` names the mappings the
 * recognizer reads; `duplicatesInvalid` is whether a repeated name anywhere makes the text invalid in its format (TOML, YAML), as it
 * does not in JSON. */
export function resolveFaults(parsed: Parsed, isRead: (path: readonly string[]) => boolean, duplicatesInvalid: boolean, walk: (root: MNode) => FieldWalk): Recognized {
  if (parsed.duplicates.some(isRead)) return { ok: false, parseFault: 'duplicate-key' };
  if (parsed.syntax || (duplicatesInvalid && parsed.duplicates.length > 0)) return { ok: false, parseFault: 'syntax' };
  // No value: a reader that stopped at a form it does not read, or a document with none (a comment-only workflow, whose root is no mapping).
  if (parsed.root === null) return { ok: false, parseFault: parsed.beyond ? 'beyond-reader' : 'field-type' };
  const found = walk(parsed.root);
  if (found.fieldType) return { ok: false, parseFault: 'field-type' };
  if (parsed.beyond || found.beyond) return { ok: false, parseFault: 'beyond-reader' };
  return { ok: true, facts: found.facts };
}

/** The name a requirement string gives: its longest leading run matching `[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?`, or undefined. */
export function requirementName(requirement: string): string | undefined {
  return /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?/u.exec(requirement)?.[0];
}

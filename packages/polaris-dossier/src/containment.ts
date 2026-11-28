import { checkShape, handle } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { CONTAINMENT_BOUNDS, CONTAINMENT_KIND, GROUPS_FIELD, LOCAL_DRAFT_SCHEMA_VERSION_V11, hasContainmentForm, precedesContainment } from './draft-schema.js';
import { type CheckFinding, list } from './check-model.js';
import { isHandle } from './finding-names.js';

/** The containment figure (REQ-polaris-generation-034 version 2.23, schema v11): its groups' walk, its names in findings, its field-version
 * paths in an earlier draft, and the three structural findings check and render both derive. Pure; reads the draft alone. */

/** One group of a containment, as the walk meets it: its record, path, level (1 for a top-level group) and the group it is drawn in. */
export interface GroupVisit {
  readonly group: Readonly<Record<string, unknown>>;
  readonly at: string;
  readonly level: number;
  readonly parent: { readonly group: Readonly<Record<string, unknown>>; readonly at: string } | undefined;
}

/** Each containment diagram of a v11 draft (records only), in draft order, with its index. None in any other version. */
export function containmentDiagrams(doc: Readonly<Record<string, unknown>>): { readonly diagram: Readonly<Record<string, unknown>>; readonly i: number }[] {
  if (!hasContainmentForm(doc['schemaVersion'])) return [];
  return list(doc['diagrams']).flatMap((diagram, i) => (isRecord(diagram) && diagram['kind'] === CONTAINMENT_KIND ? [{ diagram, i }] : []));
}

/** A containment's groups in preorder (a group before its children, children in their order), records only, at every level. */
export function groupsOf(diagram: Readonly<Record<string, unknown>>, i: number): GroupVisit[] {
  const out: GroupVisit[] = [];
  const visit = (values: unknown, at: string, level: number, parent: GroupVisit['parent']): void => {
    list(values).forEach((group, j) => {
      if (!isRecord(group)) return;
      const own = `${at}[${j}]`;
      out.push({ group, at: own, level, parent });
      visit(group['children'], `${own}.children`, level + 1, { group, at: own });
    });
  };
  visit(diagram[GROUPS_FIELD], `$.diagrams[${i}].${GROUPS_FIELD}`, 1, undefined);
  return out;
}

/** `<diagram>` in a containment finding's detail: the diagram's identity, or `$.diagrams[<index>]` where it has no well-formed one. */
export function containmentName(diagram: Readonly<Record<string, unknown>>, i: number): string {
  const id = diagram['id'];
  return typeof id === 'string' && checkShape({ root: handle, defs: {} }, id).length === 0 ? id : `$.diagrams[${i}]`;
}

/** A group as a `unit-reference` finding names it: by its identity, or by its path where it has none. */
export const groupName = (group: Readonly<Record<string, unknown>>, at: string): string =>
  (isHandle(group['id']) ? `the group ${JSON.stringify(group['id'])}` : `the group at ${at}`);

/** The `field-version` findings of a draft of schema v10 or earlier (version 2.23): at a diagram's `kind` where it is `containment`, and
 * at its `groups` where it carries one, each in place of the schema finding at that path. None in a v11 or v13 draft. */
export function containmentFieldVersionFindings(doc: Readonly<Record<string, unknown>>): CheckFinding[] {
  if (!precedesContainment(doc['schemaVersion'])) return [];
  return list(doc['diagrams']).flatMap((diagram, i): CheckFinding[] => {
    if (!isRecord(diagram)) return [];
    const name = containmentName(diagram, i);
    return [
      ...(diagram['kind'] === CONTAINMENT_KIND ? [{ kind: 'field-version' as const, at: `$.diagrams[${i}].kind`, detail: `${name}: the kind \`${CONTAINMENT_KIND}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V11}` }] : []),
      ...(Object.hasOwn(diagram, GROUPS_FIELD) ? [{ kind: 'field-version' as const, at: `$.diagrams[${i}].${GROUPS_FIELD}`, detail: `${name}: \`${GROUPS_FIELD}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V11}` }] : []),
    ];
  });
}

/** The paths of those findings, for the schema check to read as reported. */
export const containmentFieldVersionPaths = (doc: Readonly<Record<string, unknown>>): string[] => containmentFieldVersionFindings(doc).map((finding) => finding.at);

/** Whether a schema finding stands at a containment's `groups` list or any `children` list in it: such a figure has no structural finding. */
function listFault(i: number, schemaPaths: ReadonlySet<string>): boolean {
  const lists = new RegExp(`^\\$\\.diagrams\\[${i}\\]\\.${GROUPS_FIELD}(?:\\[\\d+\\]\\.children)*$`, 'u');
  return [...schemaPaths].some((at) => lists.test(at));
}

/** The structural findings of a v11 draft's containments (version 2.23), in the order the version states: every `containment-depth`, then
 * every `containment-size`, then every `containment-flat`, each in diagram order and, within a diagram, in preorder. A figure is read only
 * where its `groups` is a list and neither it nor any `children` list in it has a schema finding (`schemaPaths`). */
export function containmentStructuralFindings(doc: Readonly<Record<string, unknown>>, schemaPaths: ReadonlySet<string>): CheckFinding[] {
  const depth: CheckFinding[] = [], size: CheckFinding[] = [], flat: CheckFinding[] = [];
  for (const { diagram, i } of containmentDiagrams(doc)) {
    if (!Array.isArray(diagram[GROUPS_FIELD]) || listFault(i, schemaPaths)) continue;
    const name = containmentName(diagram, i);
    const groups = groupsOf(diagram, i);
    for (const { at, level } of groups) {
      if (level === CONTAINMENT_BOUNDS.levels + 1) depth.push({ kind: 'containment-depth', at, detail: `${name}: a containment nests at most ${CONTAINMENT_BOUNDS.levels} levels; this group is at level ${CONTAINMENT_BOUNDS.levels + 1}` });
    }
    const at = `$.diagrams[${i}].${GROUPS_FIELD}`;
    if (groups.length > CONTAINMENT_BOUNDS.total) size.push({ kind: 'containment-size', at, detail: `${name}: a containment holds at most ${CONTAINMENT_BOUNDS.total} groups; this one holds ${groups.length}` });
    if (groups.every(({ level }) => level === 1)) flat.push({ kind: 'containment-flat', at, detail: `${name}: a containment nests at least one group in another` });
  }
  return [...depth, ...size, ...flat];
}

/** The containments whose nestings are never decided (version 2.23): those with a `figure-kind`, `containment-depth`, `containment-size`
 * or `containment-flat` finding, by diagram index, read from the findings the caller holds. */
export function undecidedContainments(findings: readonly CheckFinding[]): ReadonlySet<number> {
  const out = new Set<number>();
  for (const { kind, at } of findings) {
    if (kind !== 'figure-kind' && kind !== 'containment-depth' && kind !== 'containment-size' && kind !== 'containment-flat') continue;
    const index = /^\$\.diagrams\[(\d+)\]/u.exec(at)?.[1];
    if (index !== undefined) out.add(Number(index));
  }
  return out;
}

/** Check's findings after every finding version 2.22 reports (hero findings included): the three structural findings above. The caller
 * then reports the groups' `unit-reference` and the nestings' `relation-challenged` findings (check.ts). */
export function applyContainmentFindings(doc: Readonly<Record<string, unknown>>, findings: CheckFinding[]): void {
  if (!hasContainmentForm(doc['schemaVersion'])) return;
  const schemaPaths = new Set(findings.filter((finding) => finding.kind === 'schema').map((finding) => finding.at));
  findings.push(...containmentStructuralFindings(doc, schemaPaths));
}

import { isRecord } from '@syzygy/support';
import { type CheckFinding, list } from './check-model.js';
import { containmentName } from './containment.js';
import {
  CONTAINMENT_BOUNDS, CONTAINMENT_KIND, ELEMENT_TYPES, LOCAL_DRAFT_SCHEMA_VERSION_V10, LOCAL_DRAFT_SCHEMA_VERSION_V11, LOCAL_DRAFT_SCHEMA_VERSION_V12,
  BASE_FIELD, MODEL_FIELD, UNIT_FIELD, UNIT_KIND_TYPES, VIEW_FIELD, hasModelForm, precedesModel,
} from './draft-schema.js';
import { BASE_BASIS, type BaseContext, type ResolvedBase, baseEndElement, baseEndFindings, baseNode, baseOf, isBaseEnd, readBases, screenedViewDetail } from './derived-base.js';
import { DIAGRAM_KINDS, type LocalModel } from '@syzygy/polaris-generation-core/live';
import { type RelationType, type UnitFault, type UnitTree, type WitnessDecision, UNIT_FAULT_WORDS, derivable, unitFault, unitOf, witnessWords } from './relation-witness.js';

/** The system model of a v12 draft (REQ-polaris-generation-034 version 2.24): its elements and relationships, the views that select from
 * them, each view's expansion into the schema-v11 diagram it is drawn as, the findings the model and its views draw, and the pure migration
 * of a v10 or v11 draft to v12. Pure; reads the draft alone (and, for `unit-reference`, the caller's tree). */

type Doc = Readonly<Record<string, unknown>>;
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const GRAPH_KINDS: ReadonlySet<unknown> = new Set(DIAGRAM_KINDS);

/** The model's elements and relationships, records only, with their paths and positions. */
export interface ModelIndex {
  readonly elements: readonly { readonly element: Doc; readonly j: number; readonly at: string }[];
  readonly relationships: readonly { readonly relationship: Doc; readonly j: number; readonly at: string; readonly derived: boolean }[];
  /** The first element and relationship with each identity, by identity. */
  readonly elementById: ReadonlyMap<string, { readonly element: Doc; readonly j: number; readonly at: string }>;
  readonly relationshipById: ReadonlyMap<string, { readonly relationship: Doc; readonly j: number; readonly at: string; readonly derived: boolean }>;
}

export function modelIndex(doc: Doc): ModelIndex {
  const model = isRecord(doc[MODEL_FIELD]) ? doc[MODEL_FIELD] : {};
  const elements = list(model['elements']).flatMap((element, j) => (isRecord(element) ? [{ element, j, at: `$.${MODEL_FIELD}.elements[${j}]` }] : []));
  const relationships = list(model['relationships']).flatMap((relationship, j) => (isRecord(relationship)
    ? [{ relationship, j, at: `$.${MODEL_FIELD}.relationships[${j}]`, derived: relationship['basis'] === 'derived' }] : []));
  const elementById = new Map<string, ModelIndex['elements'][number]>();
  for (const entry of elements) { const id = text(entry.element['id']); if (id !== undefined && !elementById.has(id)) elementById.set(id, entry); }
  const relationshipById = new Map<string, ModelIndex['relationships'][number]>();
  for (const entry of relationships) { const id = text(entry.relationship['id']); if (id !== undefined && !relationshipById.has(id)) relationshipById.set(id, entry); }
  return { elements, relationships, elementById, relationshipById };
}

/** Whether a diagram of a v12 draft is drawn as a view: a graph kind or a containment. */
export const isViewKind = (diagram: Doc): boolean => GRAPH_KINDS.has(diagram['kind']) || diagram['kind'] === CONTAINMENT_KIND;

/** A view's two lists, identities only (a non-string entry is skipped: it is a schema finding's matter). */
export function viewLists(diagram: Doc): { readonly elements: readonly string[]; readonly relationships: readonly string[] } {
  const view = isRecord(diagram[VIEW_FIELD]) ? diagram[VIEW_FIELD] : {};
  return { elements: list(view['elements']).flatMap((id) => (typeof id === 'string' ? [id] : [])), relationships: list(view['relationships']).flatMap((id) => (typeof id === 'string' ? [id] : [])) };
}

/** Syzygy's words for a derived relationship's relation: the words version 2.19 gives a witnessed edge, or the relation's own name. */
export const derivedWords = (relation: unknown): string => (typeof relation === 'string' ? witnessWords(relation as RelationType) ?? relation : '');

/** The members of an element a node or group carries: its `id`, `label`, `epistemic`, `citations` and any `unit`. */
const claimOf = (element: Doc): Record<string, unknown> => {
  const { type: _type, parent: _parent, ...rest } = element;
  return rest;
};

/** A path of a v12 view's expansion, moved back to the draft member it was read from. */
export type PathMove = (at: string) => string;

/** The expansion of a v12 draft (version 2.24): the schema-v11 draft each view's figure is drawn as. Every member but `model` and the
 * views is kept; each graph view becomes `nodes` (each selected element, in view order) and `edges` (each selected relationship whose two
 * ends the view selects, in view order: a cited one with its own members, a derived one with Syzygy's words as `label`, `epistemic`
 * `inferred` as the rule reads it, no citation and `"basis": "derived"`), and each containment view `groups` (the selected elements whose
 * parent is absent or not selected, in view order, each holding the selected elements whose parent it is). An entry naming nothing in the
 * model is left out (a finding's matter). `move` maps a path into the expansion back to the model or view member it came from. */
export function expandModel(doc: Doc, bases: ReadonlyMap<number, ResolvedBase> = new Map()): { readonly doc: Record<string, unknown>; readonly move: PathMove } {
  const index = modelIndex(doc);
  const moves = new Map<string, string>();
  const diagrams = list(doc['diagrams']).map((diagram, i) => {
    if (!isRecord(diagram) || !isViewKind(diagram) || !isRecord(diagram[VIEW_FIELD])) return diagram;
    const { [VIEW_FIELD]: _view, ...shared } = diagram;
    const lists = viewLists(diagram);
    const selected = lists.elements.flatMap((id) => { const entry = index.elementById.get(id); return entry === undefined ? [] : [{ id, ...entry }]; });
    // A view with a `base` resolved against an established map (version 2.35): its base elements, in Syzygy's words, join the figure.
    const base = bases.get(i);
    const baseAt = `$.diagrams[${i}].${VIEW_FIELD}.${BASE_FIELD}`;
    if (diagram['kind'] === CONTAINMENT_KIND) {
      const chosen = new Set(selected.map(({ id }) => id));
      const placed = new Set<string>();
      const groupOf = (entry: typeof selected[number], at: string): Record<string, unknown> => {
        placed.add(entry.id);
        moves.set(at, entry.at);
        const children = selected.filter((child) => !placed.has(child.id) && text(child.element['parent']) === entry.id);
        const own = children.map((child, k) => groupOf(child, `${at}.children[${k}]`));
        // The base elements a `group` entry places inside this element, after the children the expansion gives it.
        const grouped = base === undefined ? [] : base.shown.filter((k) => base.groupOf.get(k) === entry.id);
        grouped.forEach((k, n) => moves.set(`${at}.children[${own.length + n}]`, baseAt));
        return { ...claimOf(entry.element), children: [...own, ...grouped.map((k) => baseNode(base!, k, [], true))] };
      };
      const tops = selected.filter((entry) => { const parent = text(entry.element['parent']); return parent === undefined || !chosen.has(parent) || parent === entry.id; });
      const groups: Record<string, unknown>[] = [];
      for (const entry of tops) if (!placed.has(entry.id)) groups.push(groupOf(entry, `$.diagrams[${i}].groups[${groups.length}]`));
      if (base !== undefined) {
        const ungrouped = base.shown.filter((k) => !base.groupOf.has(k));
        const root = ungrouped.find((k) => base.map.elements[k]!.root === true);
        const outer = base.map.map === 'directories' && root !== undefined
          ? [baseNode(base, root, ungrouped.filter((k) => k !== root).map((k) => baseNode(base, k, [])))]
          : ungrouped.map((k) => baseNode(base, k, []));
        for (const group of outer) { moves.set(`$.diagrams[${i}].groups[${groups.length}]`, baseAt); groups.push(group); }
      }
      return { ...shared, groups };
    }
    const chosen = new Set(selected.map(({ id }) => id));
    const baseNodes = base === undefined ? [] : base.shown.map((k) => baseNode(base, k));
    const shownBase = new Set(base?.shown ?? []);
    // A base end names the factual element it resolves to among those the view shows; any other end leaves the relationship out.
    const endOf = (end: unknown): string | undefined => {
      if (typeof end === 'string') return chosen.has(end) ? end : undefined;
      const k = baseEndElement(end, base?.spec, base?.map, shownBase);
      return k === undefined ? undefined : base!.map.elements[k]!.factId;
    };
    baseNodes.forEach((_, k) => moves.set(`$.diagrams[${i}].nodes[${k}]`, baseAt));
    const nodes = [...baseNodes, ...selected.map((entry, k) => { moves.set(`$.diagrams[${i}].nodes[${baseNodes.length + k}]`, entry.at); return claimOf(entry.element); })];
    // The directory map's `contains` facts joining two shown base elements, in Syzygy's words, before the relationships the view selects.
    const shownFacts = new Set(baseNodes.map((node) => node['id']));
    const rootFact = base?.map.elements.find((element) => element.root === true)?.factId;
    const containsEdges = base === undefined || rootFact === undefined || !shownFacts.has(rootFact) ? [] : base.map.contains.filter((fact) => shownFacts.has(fact.to))
      .map((fact) => ({ id: fact.factId, from: rootFact, to: fact.to, relation: 'contains', label: 'contains', epistemic: fact.epistemic, citations: [], basis: BASE_BASIS }));
    containsEdges.forEach((_, k) => moves.set(`$.diagrams[${i}].edges[${k}]`, baseAt));
    const edges = lists.relationships.flatMap((id) => {
      const entry = index.relationshipById.get(id);
      if (entry === undefined) return [];
      const from = endOf(entry.relationship['from']), to = endOf(entry.relationship['to']);
      if (from === undefined || to === undefined) return [];
      const { relationship } = entry;
      return [{ entry, edge: entry.derived
        ? { id: relationship['id'], from: relationship['from'], to: relationship['to'], relation: relationship['relation'], label: derivedWords(relationship['relation']), epistemic: 'inferred', citations: [], basis: 'derived' }
        : { ...relationship, from, to } }];
    }).map(({ entry, edge }, k) => { moves.set(`$.diagrams[${i}].edges[${containsEdges.length + k}]`, entry.at); return edge; });
    return { ...shared, nodes, edges: [...containsEdges, ...edges] };
  });
  const { [MODEL_FIELD]: _model, ...rest } = doc;
  const move: PathMove = (at) => {
    let best: string | undefined;
    for (const prefix of moves.keys()) {
      if ((at === prefix || at.startsWith(`${prefix}.`) || at.startsWith(`${prefix}[`)) && (best === undefined || prefix.length > best.length)) best = prefix;
    }
    return best === undefined ? at : `${moves.get(best)!}${at.slice(best.length)}`;
  };
  return { doc: { ...rest, schemaVersion: LOCAL_DRAFT_SCHEMA_VERSION_V11, diagrams }, move };
}

/** The model a render hands the site (version 2.24): each element and relationship in model order, with the diagrams whose view selects
 * it, in diagram order. A render follows a passing check, so every identity, type and relation here is the schema's. */
export function localModelOf(doc: Doc, baseEnd: (end: Doc) => string | null = () => null): LocalModel {
  const index = modelIndex(doc);
  const selecting = (pick: (lists: ReturnType<typeof viewLists>) => readonly string[], id: string): string[] => list(doc['diagrams']).flatMap((diagram) => (
    isRecord(diagram) && isViewKind(diagram) && isRecord(diagram[VIEW_FIELD]) && pick(viewLists(diagram)).includes(id) && typeof diagram['id'] === 'string' ? [diagram['id']] : []));
  return {
    elements: index.elements.map(({ element }) => {
      const id = text(element['id']) ?? '';
      return { id, type: text(element['type']) ?? '', parent: text(element['parent']) ?? null, views: selecting((lists) => lists.elements, id) };
    }),
    relationships: index.relationships.map(({ relationship, derived }) => {
      const id = text(relationship['id']) ?? '';
      // A base end (version 2.35) is written as the fact identity it resolves to at this render, never as the path the draft wrote.
      const end = (value: unknown): string | null => (isBaseEnd(value) ? baseEnd(value) : text(value) ?? '');
      return { id, from: end(relationship['from']), to: end(relationship['to']), relation: text(relationship['relation']) ?? '', basis: derived ? 'derived' as const : 'cited' as const,
        views: selecting((lists) => lists.relationships, id) };
    }),
  };
}

/** Whether a draft member at `at` reads anything a `schema` finding stands at: the path itself, a member below it, or one it lies within. */
export const touchesSchema = (at: string, schemaPaths: ReadonlySet<string>): boolean => [...schemaPaths].some((fault) => fault === at
  || fault.startsWith(`${at}.`) || fault.startsWith(`${at}[`) || at.startsWith(`${fault}.`) || at.startsWith(`${fault}[`));

/** The `field-version` findings of a draft of schema v11 or earlier (version 2.24): at `$.model` where it carries one, and at each diagram's
 * `view`, each in place of the schema finding at that path. None in a v12 or v13 draft. */
export function modelFieldVersionFindings(doc: Doc): CheckFinding[] {
  if (!precedesModel(doc['schemaVersion'])) return [];
  return [
    ...(Object.hasOwn(doc, MODEL_FIELD) ? [{ kind: 'field-version' as const, at: `$.${MODEL_FIELD}`, detail: `\`${MODEL_FIELD}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V12}` }] : []),
    ...list(doc['diagrams']).flatMap((diagram, i): CheckFinding[] => (isRecord(diagram) && Object.hasOwn(diagram, VIEW_FIELD)
      ? [{ kind: 'field-version', at: `$.diagrams[${i}].${VIEW_FIELD}`, detail: `${containmentName(diagram, i)}: \`${VIEW_FIELD}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V12}` }] : [])),
  ];
}
export const modelFieldVersionPaths = (doc: Doc): string[] => modelFieldVersionFindings(doc).map((finding) => finding.at);

/** The shape of a containment view's expansion: how many top-level groups, the most children of any group, and whether any group nests. */
function containmentShape(expanded: Doc): { readonly tops: number; readonly widest: number; readonly nested: boolean } {
  const groups = list(expanded['groups']).filter(isRecord);
  let widest = 0, nested = false;
  const visit = (group: Doc): void => {
    const children = list(group['children']).filter(isRecord);
    widest = Math.max(widest, children.length);
    if (children.length > 0) nested = true;
    children.forEach(visit);
  };
  groups.forEach(visit);
  return { tops: groups.length, widest, nested };
}

/** The model's findings (version 2.24), in the stated order, excluding `relation-challenged`: the elements' (`unresolved-reference` at a
 * parent, `element-type`, `unit-reference`, `element-parent`), the relationships' (`unresolved-reference` at an end,
 * `relationship-not-derivable`), each view's (`unresolved-reference`, `view-duplicate`, `view-relationship`, `view-shape`,
 * `containment-flat`), then `model-unviewed`. Each is computed only where the members it reads have no `schema` finding (`schemaPaths`). */
export function modelFindings(doc: Doc, schemaPaths: ReadonlySet<string>, tree: UnitTree | undefined, baseContext?: BaseContext): CheckFinding[] {
  if (!hasModelForm(doc['schemaVersion'])) return [];
  // A v15 draft's bases (version 2.35), read where the caller states the maps: never where it does not (a base is then left unresolved).
  const bases = baseContext === undefined ? undefined : readBases(doc, baseContext, schemaPaths);
  const index = modelIndex(doc);
  const out: CheckFinding[] = [];
  const clean = (at: string): boolean => !touchesSchema(at, schemaPaths);
  const idOr = (value: Doc, at: string): string => text(value['id']) ?? at;

  // Elements: an unresolved parent, then the type against the unit, then the unit, then the chain of parents.
  const parentFaults = new Set<number>();
  for (const { element, j, at } of index.elements) {
    const parent = text(element['parent']);
    if (parent !== undefined && clean(`${at}.parent`) && !index.elementById.has(parent)) parentFaults.add(j);
  }
  const anyParentFault = parentFaults.size > 0 || index.elements.some(({ at, element }) => Object.hasOwn(element, 'parent') && !clean(`${at}.parent`));
  for (const { element, j, at } of index.elements) {
    const id = idOr(element, at);
    if (parentFaults.has(j)) out.push({ kind: 'unresolved-reference', at: `${at}.parent`, detail: `${text(element['parent'])}: no element of the model has this identity` });
    const unit = unitOf(element[UNIT_FIELD]);
    const type = text(element['type']);
    if (clean(`${at}.type`) && (!Object.hasOwn(element, UNIT_FIELD) || clean(`${at}.${UNIT_FIELD}`)) && unit !== undefined && type !== undefined
      && (ELEMENT_TYPES as readonly string[]).includes(type)) {
      const standsFor = UNIT_KIND_TYPES[unit.kind];
      if (type === 'module' || type === 'store' || type === 'person') out.push({ kind: 'element-type', at: `${at}.type`, detail: `${id}: an element of type ${type} carries no unit` });
      else if (standsFor !== type) out.push({ kind: 'element-type', at: `${at}.type`, detail: `${id}: an element with a ${unit.kind} unit is of type ${standsFor}` });
    }
    if (unit !== undefined && clean(`${at}.${UNIT_FIELD}`)) {
      const fault: UnitFault | undefined = unitFault(unit, tree);
      if (fault !== undefined) out.push({ kind: 'unit-reference', at: `${at}.${UNIT_FIELD}`, detail: `the element ${JSON.stringify(id)}: its ${unit.kind} unit names no unit of that kind: ${UNIT_FAULT_WORDS[fault]}` });
    }
    if (!anyParentFault && text(element['parent']) !== undefined && elementParentFault(index, element)) {
      out.push({ kind: 'element-parent', at: `${at}.parent`, detail: `${id}: an element is part of at most two elements above it and never of itself` });
    }
  }
  const elementFindings = out.length;

  // Relationships: an unresolved end, then a derived one no row of the eligibility table could derive.
  for (const { relationship, at, derived } of index.relationships) {
    if (!clean(at)) continue;
    let resolved = true;
    for (const end of ['from', 'to'] as const) {
      const named = text(relationship[end]);
      if (named !== undefined && !index.elementById.has(named)) { resolved = false; out.push({ kind: 'unresolved-reference', at: `${at}.${end}`, detail: `${named}: no element of the model has this identity` }); }
    }
    if (!derived || !resolved) continue;
    const from = unitOf(index.elementById.get(text(relationship['from']) ?? '')?.element[UNIT_FIELD]);
    const to = unitOf(index.elementById.get(text(relationship['to']) ?? '')?.element[UNIT_FIELD]);
    if (from === undefined || to === undefined || !derivable(relationship['relation'] as RelationType, from, to)) {
      out.push({ kind: 'relationship-not-derivable', at, detail: `${idOr(relationship, at)}: a derived relationship needs two ends whose units a row of rule relation-witness version 1 joins by its relation` });
    }
  }
  // The findings at base ends follow the relationships' findings, in model order (version 2.35).
  if (baseContext !== undefined) out.push(...baseEndFindings(doc, baseContext.maps, schemaPaths, baseContext.admit, baseContext.hidden));
  const elementOrParentFault = out.slice(0, elementFindings).some((finding) => finding.kind === 'element-parent' || (finding.kind === 'unresolved-reference' && finding.at.endsWith('.parent')));

  // Each view, in diagram order.
  const expanded = list(expandModel(doc, bases?.resolved).doc['diagrams']);
  let anyViewSchema = false;
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram) || !isViewKind(diagram) || !Object.hasOwn(diagram, VIEW_FIELD)) return;
    const at = `$.diagrams[${i}].${VIEW_FIELD}`;
    const name = containmentName(diagram, i);
    const view = isRecord(diagram[VIEW_FIELD]) ? diagram[VIEW_FIELD] : {};
    const listsClean = clean(at);
    if (!listsClean) anyViewSchema = true;
    const entries = (member: 'elements' | 'relationships') => list(view[member]).map((value, k) => ({ value, k, at: `${at}.${member}[${k}]` }));
    const unresolvedHere: CheckFinding[] = [];
    for (const member of ['elements', 'relationships'] as const) {
      for (const { value, at: entryAt } of entries(member)) {
        if (typeof value !== 'string' || !clean(entryAt)) continue;
        const known = member === 'elements' ? index.elementById.has(value) : index.relationshipById.has(value);
        if (!known) unresolvedHere.push({ kind: 'unresolved-reference', at: entryAt, detail: `${value}: no ${member === 'elements' ? 'element' : 'relationship'} of the model has this identity` });
      }
    }
    out.push(...unresolvedHere);
    const base = baseOf(doc, diagram);
    const baseFindings = bases?.findings.get(i) ?? [];
    if (!listsClean) { out.push(...baseFindings); return; }
    for (const member of ['elements', 'relationships'] as const) {
      const seen = new Set<string>();
      for (const { value, at: entryAt } of entries(member)) {
        if (typeof value !== 'string') continue;
        if (seen.has(value)) out.push({ kind: 'view-duplicate', at: entryAt, detail: `${name}: a view names each element and each relationship once` });
        seen.add(value);
      }
    }
    const selected = new Set(entries('elements').flatMap(({ value }) => (typeof value === 'string' ? [value] : [])));
    // A base end (version 2.35) is shown where the view's base shows the one element it names; where the view's base is not resolved (its
    // map not established, or a base-reference or base-conflict finding standing) an end of its map is left undecided, never a finding.
    const resolved = bases?.resolved.get(i);
    const shownEnd = (end: unknown): boolean => {
      if (!isBaseEnd(end)) return selected.has(text(end) ?? '');
      if (base === undefined || end['map'] !== base.map) return false;
      if (resolved === undefined) return true;
      return baseEndElement(end, base, resolved.map, new Set(resolved.shown)) !== undefined;
    };
    for (const { value, at: entryAt } of entries('relationships')) {
      const entry = typeof value === 'string' ? index.relationshipById.get(value) : undefined;
      if (entry === undefined) continue;
      if (!shownEnd(entry.relationship['from']) || !shownEnd(entry.relationship['to'])) {
        out.push({ kind: 'view-relationship', at: entryAt, detail: `${name}: a view shows a relationship only where it shows both its ends` });
      }
    }
    // A view with a `base` takes `view-shape` and `containment-flat` only where its base is clear, over its figure base elements included,
    // their details screened (version 2.35); then its base findings.
    const shaped = base === undefined || bases?.clear.has(i) === true;
    if (diagram['kind'] === CONTAINMENT_KIND && !elementOrParentFault && unresolvedHere.length === 0 && shaped) {
      const said = (detail: string): string => (base === undefined || baseContext === undefined ? detail : screenedViewDetail(baseContext.admit, name, detail));
      const shape = containmentShape(isRecord(expanded[i]) ? expanded[i] : {});
      if (shape.tops > CONTAINMENT_BOUNDS.groups[1] || shape.widest > CONTAINMENT_BOUNDS.children[1]) {
        out.push({ kind: 'view-shape', at: `${at}.elements`, detail: said(`${name}: a containment view shows one to five outermost elements and at most eight inside any one`) });
      }
      if (!shape.nested) out.push({ kind: 'containment-flat', at: `${at}.elements`, detail: said(`${name}: a containment nests at least one group in another`) });
    }
    out.push(...baseFindings);
  });

  // Every element and relationship some view selects, whatever its diagram's disposition.
  if (!anyViewSchema) {
    const shown = { elements: new Set<string>(), relationships: new Set<string>() };
    for (const diagram of list(doc['diagrams'])) {
      if (!isRecord(diagram) || !isViewKind(diagram)) continue;
      const lists = viewLists(diagram);
      lists.elements.forEach((id) => shown.elements.add(id));
      lists.relationships.forEach((id) => shown.relationships.add(id));
    }
    for (const { element, at } of index.elements) {
      const id = text(element['id']);
      if (id !== undefined && !shown.elements.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${id}: every element and relationship of the model is shown by at least one view` });
    }
    for (const { relationship, at } of index.relationships) {
      const id = text(relationship['id']);
      if (id !== undefined && !shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${id}: every element and relationship of the model is shown by at least one view` });
    }
  }
  return out;
}

/** Whether an element's chain of parents, followed one `parent` at a time from the element until it reaches an element with no `parent` or
 * one already reached, the element itself included, takes more than two steps or ends by reaching an element already reached. */
function elementParentFault(index: ModelIndex, element: Doc): boolean {
  const reached = new Set<Doc>([element]);
  let current = element, steps = 0;
  for (;;) {
    const parent = text(current['parent']);
    if (parent === undefined) return false;
    const next = index.elementById.get(parent)?.element;
    if (next === undefined) return false;
    steps += 1;
    if (reached.has(next) || steps > 2) return true;
    reached.add(next);
    current = next;
  }
}

/** Whether a v12 draft holds any finding that keeps rule `relation-witness` from deciding its relationships and parents (version 2.24). */
export const modelUndecided = (findings: readonly CheckFinding[]): boolean => findings.some((finding) => finding.kind === 'schema'
  || finding.kind === 'element-type' || finding.kind === 'element-parent' || finding.kind === 'unresolved-reference');

/** The containment views with a `view-shape` or `containment-flat` finding, by diagram index: their parents are never decided. */
export function undecidedViews(findings: readonly CheckFinding[]): ReadonlySet<number> {
  const out = new Set<number>();
  for (const { kind, at } of findings) {
    if (kind !== 'view-shape' && kind !== 'containment-flat') continue;
    const index = /^\$\.diagrams\[(\d+)\]\.view/u.exec(at)?.[1];
    if (index !== undefined) out.add(Number(index));
  }
  return out;
}

/** The migration of a draft of schema v10 or v11 to schema v12 (version 2.24): pure, deterministic, reading the draft alone. Every member
 * is kept but `schemaVersion` (v12) and each graph or containment diagram's figure members, which become a `view` of the model: each node,
 * in its order, an element (its members, and `type` from its unit or `module`); each edge a cited relationship (all its members); each
 * group, in preorder, an element with its members but `children` and with `parent` naming the group it is drawn in. Elements and
 * relationships are merged by identity (none merge in a v10 or v11 draft, whose identities are unique). Undefined for any other version. */
export function migrateDraft(doc: Doc): Record<string, unknown> | undefined {
  if (doc['schemaVersion'] !== LOCAL_DRAFT_SCHEMA_VERSION_V10 && doc['schemaVersion'] !== LOCAL_DRAFT_SCHEMA_VERSION_V11) return undefined;
  const elements: Record<string, unknown>[] = [], relationships: Record<string, unknown>[] = [];
  const elementIds = new Set<string>(), relationshipIds = new Set<string>();
  const typeOf = (value: Doc): string => { const unit = unitOf(value[UNIT_FIELD]); return unit === undefined ? 'module' : UNIT_KIND_TYPES[unit.kind]!; };
  const addElement = (value: Doc, parent: string | undefined): string | undefined => {
    const id = text(value['id']);
    if (id !== undefined && elementIds.has(id)) return id;
    const { children: _children, unit, ...rest } = value;
    const { id: _id, label, epistemic, citations, ...others } = rest;
    elements.push({ id: value['id'], label, type: typeOf(value), epistemic, citations, ...(parent === undefined ? {} : { parent }), ...(unit === undefined ? {} : { unit }), ...others });
    if (id !== undefined) elementIds.add(id);
    return id;
  };
  const diagrams = list(doc['diagrams']).map((diagram) => {
    if (!isRecord(diagram)) return diagram;
    if (diagram['kind'] === CONTAINMENT_KIND && doc['schemaVersion'] === LOCAL_DRAFT_SCHEMA_VERSION_V11) {
      const { groups, disposition, ...shared } = diagram;
      const ids: string[] = [];
      const visit = (group: unknown, parent: string | undefined): void => {
        if (!isRecord(group)) return;
        const id = addElement(group, parent);
        if (id !== undefined) ids.push(id);
        for (const child of list(group['children'])) visit(child, id);
      };
      for (const group of list(groups)) visit(group, undefined);
      return { ...shared, [VIEW_FIELD]: { elements: ids }, disposition };
    }
    if (!GRAPH_KINDS.has(diagram['kind'])) return diagram;
    const { nodes, edges, disposition, ...shared } = diagram;
    const nodeIds = list(nodes).flatMap((node) => { if (!isRecord(node)) return []; const id = addElement(node, undefined); return id === undefined ? [] : [id]; });
    const edgeIds = list(edges).flatMap((edge) => {
      if (!isRecord(edge)) return [];
      const id = text(edge['id']);
      if (id === undefined) return [];
      if (!relationshipIds.has(id)) { relationships.push({ ...edge }); relationshipIds.add(id); }
      return [id];
    });
    return { ...shared, [VIEW_FIELD]: { elements: nodeIds, relationships: edgeIds }, disposition };
  });
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === 'diagrams') { out[key] = diagrams; out[MODEL_FIELD] = { elements, relationships }; continue; }
    out[key] = key === 'schemaVersion' ? LOCAL_DRAFT_SCHEMA_VERSION_V12 : value;
  }
  if (!Object.hasOwn(out, MODEL_FIELD)) out[MODEL_FIELD] = { elements, relationships };
  return out;
}

/** A decided relationship or nesting of a v12 draft's expansion, as `relationDecisions` gives it. */
interface Decided { readonly id: string; readonly decision: WitnessDecision }

/** The model's decisions (version 2.24), each relationship and each element's parent once, in model order: the expansion's edges of produced
 * graph views by relationship identity, and its nestings of produced containment views by the child element's identity. */
export function modelDecisions(doc: Doc, edges: readonly (Decided & { readonly relation: RelationType })[], nestings: readonly (Decided & { readonly parentId: string })[]):
  { readonly relationships: readonly { readonly at: string; readonly id: string; readonly relation: RelationType; readonly decision: WitnessDecision }[];
    readonly parents: readonly { readonly at: string; readonly id: string; readonly decision: WitnessDecision }[] } {
  const index = modelIndex(doc);
  const byEdge = new Map<string, (typeof edges)[number]>();
  for (const edge of edges) if (!byEdge.has(edge.id)) byEdge.set(edge.id, edge);
  const byChild = new Map<string, (typeof nestings)[number]>();
  for (const nesting of nestings) if (!byChild.has(nesting.id)) byChild.set(nesting.id, nesting);
  return {
    relationships: index.relationships.flatMap(({ relationship, at }) => {
      const id = text(relationship['id']);
      const decided = id === undefined || index.relationshipById.get(id)?.at !== at ? undefined : byEdge.get(id);
      return decided === undefined ? [] : [{ at, id: decided.id, relation: decided.relation, decision: decided.decision }];
    }),
    parents: index.elements.flatMap(({ element, at }) => {
      const id = text(element['id']);
      const decided = id === undefined || index.elementById.get(id)?.at !== at ? undefined : byChild.get(id);
      return decided === undefined || decided.parentId !== text(element['parent']) ? [] : [{ at: `${at}.parent`, id: decided.id, decision: decided.decision }];
    }),
  };
}

/** The `relation-challenged` findings of a v12 draft (version 2.24): each challenged relationship at its path, with the detail version 2.19
 * gives a challenged edge naming the relationship, then each challenged parent at the element's `parent`, with the detail version 2.23 gives
 * a challenged nesting, `model` for the diagram. */
export function modelRelationFindings(decided: ReturnType<typeof modelDecisions>): CheckFinding[] {
  return [
    ...decided.relationships.flatMap(({ at, id, relation, decision }): CheckFinding[] => (decision.state !== 'challenged' ? [] : [{ kind: 'relation-challenged', at,
      detail: `the relationship ${JSON.stringify(id)}, relation ${relation}: no ${decision.factKind} fact joins this edge's two units in what rule ${decision.rule} version ${decision.ruleVersion} derived at the pinned revision; correct the arrow, its relation or its units` }])),
    ...decided.parents.flatMap(({ at, id, decision }): CheckFinding[] => (decision.state !== 'challenged' ? [] : [{ kind: 'relation-challenged', at,
      detail: `model: no ${decision.factKind} fact joins the units of group ${id} and the group it is drawn in, in what rule ${decision.rule} version ${decision.ruleVersion} derived at the pinned revision; correct the nesting or its groups' units` }])),
  ];
}

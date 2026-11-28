import { checkShape, handle, type LocalViewLevel } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { type CheckFinding, list } from './check-model.js';
import { containmentName } from './containment.js';
import { type BaseMaps, baseOf, shownOf } from './derived-base.js';
import {
  type BaseMapName, LEVEL_FIELD, LEVEL_SCHEMA, LOCAL_DRAFT_SCHEMA_VERSION_V17, SCOPE_FIELD, SCOPE_SCHEMA, VIEW_FIELD, VIEW_LEVELS, type ViewLevel, hasLevelForm, hasModelForm,
} from './draft-schema.js';
import { isViewKind, modelIndex } from './system-model.js';

/** A view's level and scope in a schema-v17 draft (REQ-polaris-generation-034 version 2.50, syzygy-3efd.39).
 *
 * A graph or containment `view` may carry `level`, its level of abstraction, and `scope`, the element of the model it is about. Both are the
 * authoring session's account of what the view shows, never a claim: check reads them here alone, after every other finding, and hands every
 * other reader the draft without them (`withoutLevels`), so no record, count, ledger, packet or machine view moves for them; the render
 * reads them once more (`viewLevelsAt`) for its figures' two attributes and its zoom links. */

type Doc = Readonly<Record<string, unknown>>;
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The five container types, each standing at the container level. */
export const CONTAINER_TYPES: ReadonlySet<string> = new Set(['directory', 'package', 'service', 'job', 'store']);
/** The types each level admits: a context view the three of the context level; a container view every type but `module`; a component view
 * every type but `system`. */
const ADMITS: Readonly<Record<ViewLevel, ReadonlySet<string>>> = Object.freeze({
  context: new Set(['system', 'external', 'person']),
  container: new Set(['system', 'external', 'person', 'directory', 'package', 'service', 'job', 'store']),
  component: new Set(['external', 'person', 'directory', 'package', 'service', 'job', 'store', 'module']),
});
/** The order a base view's `view-level` finding picks its type in: the first a shown base element has that the level does not admit. */
const BASE_TYPE_ORDER = Object.freeze(['system', 'directory', 'package', 'module'] as const);

export const LEVEL_DETAIL = Object.freeze({
  /** A view carrying one of the two members alone (decision recorded in the PR: the requirement gives the finding, not its words). */
  alone: '`level` and `scope` stand together, or neither',
  scopeType: (diagram: string): string => `${diagram}: a context or container view is about a system, and a component view about a directory, package, service, job or store`,
  contextUnselected: (diagram: string): string => `${diagram}: a context view shows the system it is about`,
  level: (diagram: string, level: string, type: string): string => `${diagram}: a ${level} view shows no element of type ${type}`,
  outside: (diagram: string, element: string, scope: string): string => `${diagram}: ${element} lies outside ${scope}, the element this view is about`,
  unresolved: (name: string): string => `${name}: no element of the model has this identity`,
  fieldVersion: (diagram: string): string => `${diagram}: \`${LEVEL_FIELD}\` and \`${SCOPE_FIELD}\` need draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V17}`,
});

/** Every graph or containment diagram whose `view` carries `level` or `scope`, in diagram order. */
function levelledViews(doc: Doc): { readonly diagram: Doc; readonly i: number; readonly view: Doc; readonly at: string }[] {
  return list(doc['diagrams']).flatMap((diagram, i) => (isRecord(diagram) && isRecord(diagram[VIEW_FIELD])
    && (Object.hasOwn(diagram[VIEW_FIELD], LEVEL_FIELD) || Object.hasOwn(diagram[VIEW_FIELD], SCOPE_FIELD))
    ? [{ diagram, i, view: diagram[VIEW_FIELD], at: `$.diagrams[${i}].${VIEW_FIELD}` }] : []));
}

/** A v17 draft without its views' `level` and `scope`, which every reader but this module's findings and the render's figures is handed;
 * any other draft unchanged, so either member in it stays one the schema check reads (and reports as field-version where the draft has a
 * system model). */
export function withoutLevels<T>(doc: T): T {
  if (!isRecord(doc) || !hasLevelForm(doc['schemaVersion']) || levelledViews(doc).length === 0) return doc;
  const diagrams = (doc['diagrams'] as readonly unknown[]).map((diagram) => {
    if (!isRecord(diagram) || !isRecord(diagram[VIEW_FIELD])) return diagram;
    const view = diagram[VIEW_FIELD];
    if (!Object.hasOwn(view, LEVEL_FIELD) && !Object.hasOwn(view, SCOPE_FIELD)) return diagram;
    const { [LEVEL_FIELD]: _level, [SCOPE_FIELD]: _scope, ...rest } = view;
    return { ...diagram, [VIEW_FIELD]: rest };
  });
  return { ...doc, diagrams } as T;
}

/** `level` and `scope` in a draft of schema v12, v14, v15 or v16: a field-version finding at each member carried, in place of the schema
 * finding there. A v13 draft, and one of v11 or earlier, admits no `view` and takes none. */
export function levelFieldVersionPaths(doc: Doc): string[] {
  const version = doc['schemaVersion'];
  if (!hasModelForm(version) || hasLevelForm(version)) return [];
  return levelledViews(doc).flatMap(({ view, at }) => [LEVEL_FIELD, SCOPE_FIELD].flatMap((member) => (Object.hasOwn(view, member) ? [`${at}.${member}`] : [])));
}
export const levelFieldVersionFindings = (doc: Doc): CheckFinding[] => {
  const diagrams = list(doc['diagrams']);
  return levelFieldVersionPaths(doc).map((at) => {
    const i = Number(/^\$\.diagrams\[(\d+)\]/u.exec(at)![1]);
    return { kind: 'field-version', at, detail: LEVEL_DETAIL.fieldVersion(containmentName(diagrams[i] as Doc, i)) };
  });
};

/** The type a base element has for a view's level: the repository root `system`, a top-level directory `directory`, a listed `package`
 * fact `package` and a listed `module` fact `module`. */
function baseTypes(map: NonNullable<BaseMaps[BaseMapName]>, shown: readonly number[]): ReadonlySet<string> {
  return new Set(shown.map((k) => {
    const element = map.elements[k]!;
    return map.map === 'directories' ? (element.root === true ? 'system' : 'directory') : element.unitFact ?? 'package';
  }));
}

/** Whether `id`'s element lies below `scope`: following `parent` one element at a time, the walk reaches the scope before an element with no
 * `parent`, a `parent` naming no element, or an element it has already reached. */
function below(id: string, scope: string, parentOf: (id: string) => string | undefined, known: (id: string) => boolean): boolean {
  const reached = new Set<string>([id]);
  let at = id;
  for (;;) {
    const parent = parentOf(at);
    if (parent === undefined || !known(parent)) return false;
    if (parent === scope) return true;
    if (reached.has(parent)) return false;
    reached.add(parent);
    at = parent;
  }
}

/** The findings of a v17 draft's levelled views (version 2.50), after every other finding check reports (`prior`), the views in diagram
 * order and each view's `schema`, then `unresolved-reference`, `view-scope`, `view-level` (elements in list order, then base) and
 * `view-scope-outside`, in list order. `maps` are the base maps check derived; a map absent is not established, and no `view-level` finding
 * at a base of it is computed. */
export function levelFindings(doc: Doc, prior: readonly CheckFinding[], maps: BaseMaps): CheckFinding[] {
  if (!hasLevelForm(doc['schemaVersion'])) return [];
  const schemaPaths = prior.filter((finding) => finding.kind === 'schema').map((finding) => finding.at);
  const touched = (at: string): boolean => schemaPaths.some((fault) => fault === at || fault.startsWith(`${at}.`) || fault.startsWith(`${at}[`)
    || at.startsWith(`${fault}.`) || at.startsWith(`${fault}[`));
  const index = modelIndex(doc);
  const parentFault = prior.some((finding) => finding.kind === 'element-parent' || (finding.kind === 'unresolved-reference' && /^\$\.model\.elements\[\d+\]\.parent$/u.test(finding.at)));
  const typeOf = (id: string): string | undefined => {
    const entry = index.elementById.get(id);
    return entry === undefined || touched(`${entry.at}.type`) ? undefined : text(entry.element['type']);
  };
  const parentOf = (id: string): string | undefined => text(index.elementById.get(id)?.element['parent']);
  const out: CheckFinding[] = [];
  for (const { diagram, i, view, at } of levelledViews(doc)) {
    if (!isViewKind(diagram)) continue;
    const name = containmentName(diagram, i);
    const own: CheckFinding[] = [];
    const hasLevel = Object.hasOwn(view, LEVEL_FIELD), hasScope = Object.hasOwn(view, SCOPE_FIELD);
    if (hasLevel) for (const fault of checkShape({ root: LEVEL_SCHEMA, defs: {} }, view[LEVEL_FIELD])) own.push({ kind: 'schema', at: `${at}.${LEVEL_FIELD}${fault.path.slice(1)}`, detail: fault.detail });
    if (hasScope) for (const fault of checkShape({ root: SCOPE_SCHEMA, defs: {} }, view[SCOPE_FIELD])) own.push({ kind: 'schema', at: `${at}.${SCOPE_FIELD}${fault.path.slice(1)}`, detail: fault.detail });
    if (hasLevel !== hasScope) own.push({ kind: 'schema', at: `${at}.${hasLevel ? LEVEL_FIELD : SCOPE_FIELD}`, detail: LEVEL_DETAIL.alone });
    out.push(...own);
    if (own.length > 0 || touched(`${at}.elements`) || touched(`${at}.relationships`) || touched(`${at}.${LEVEL_FIELD}`) || touched(`${at}.${SCOPE_FIELD}`)) continue;
    const level = view[LEVEL_FIELD] as ViewLevel, scope = view[SCOPE_FIELD] as string;
    if (!index.elementById.has(scope)) {
      const named = checkShape({ root: handle, defs: {} }, scope).length === 0 ? scope : `${at}.${SCOPE_FIELD}`;
      out.push({ kind: 'unresolved-reference', at: `${at}.${SCOPE_FIELD}`, detail: LEVEL_DETAIL.unresolved(named) });
      continue;
    }
    const entries = list(view['elements']).map((value, k) => ({ id: text(value), at: `${at}.elements[${k}]` }));
    const scopeType = typeOf(scope);
    if (scopeType !== undefined && (level === 'component' ? !CONTAINER_TYPES.has(scopeType) : scopeType !== 'system')) {
      out.push({ kind: 'view-scope', at: `${at}.${SCOPE_FIELD}`, detail: LEVEL_DETAIL.scopeType(name) });
    }
    if (level === 'context' && !entries.some((entry) => entry.id === scope)) out.push({ kind: 'view-scope', at: `${at}.${SCOPE_FIELD}`, detail: LEVEL_DETAIL.contextUnselected(name) });
    for (const entry of entries) {
      const type = entry.id === undefined ? undefined : typeOf(entry.id);
      if (type !== undefined && !ADMITS[level].has(type)) out.push({ kind: 'view-level', at: entry.at, detail: LEVEL_DETAIL.level(name, level, type) });
    }
    const base = baseOf(doc, diagram);
    const map = base === undefined ? undefined : maps[base.map];
    const baseBlocked = prior.some((finding) => (finding.kind === 'base-reference' || finding.kind === 'base-conflict') && finding.at.startsWith(`$.diagrams[${i}].`));
    if (base !== undefined && map !== undefined && !baseBlocked) {
      const types = baseTypes(map, shownOf(base, map));
      const first = BASE_TYPE_ORDER.find((type) => types.has(type) && !ADMITS[level].has(type));
      if (first !== undefined) out.push({ kind: 'view-level', at: `${at}.base`, detail: LEVEL_DETAIL.level(name, level, first) });
    }
    if (parentFault || level === 'context') continue;
    for (const entry of entries) {
      if (entry.id === undefined || entry.id === scope) continue;
      const type = typeOf(entry.id);
      const bounded = level === 'container' ? type !== undefined && CONTAINER_TYPES.has(type) : type === 'module';
      if (bounded && !below(entry.id, scope, parentOf, (id) => index.elementById.has(id))) out.push({ kind: 'view-scope-outside', at: entry.at, detail: LEVEL_DETAIL.outside(name, entry.id, scope) });
    }
  }
  return out;
}

/** A passed v17 draft's levelled views, by diagram identity, for the render: each view carrying a well-formed `level` and a string `scope`.
 * Empty for every other draft. */
export function viewLevelsAt(doc: Doc): ReadonlyMap<string, LocalViewLevel> {
  if (!hasLevelForm(doc['schemaVersion'])) return new Map();
  return new Map(levelledViews(doc).flatMap(({ diagram, view }) => {
    const id = text(diagram['id']), level = view[LEVEL_FIELD], scope = view[SCOPE_FIELD];
    return id !== undefined && isViewKind(diagram) && (VIEW_LEVELS as readonly unknown[]).includes(level) && typeof scope === 'string'
      ? [[id, { level: level as ViewLevel, scope }] as const] : [];
  }));
}

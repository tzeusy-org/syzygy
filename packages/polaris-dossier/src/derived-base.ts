import { isRecord } from '@syzygy/support';
import { checkShape, type SchemaWithDefs } from '@syzygy/polaris-generation-core/live';
import { type CheckFinding, list } from './check-model.js';
import { secretPathOf, type DossierScreen } from './screen.js';
import type { TreeFacts } from './derive.js';
import type { ManifestFacts } from './manifest-facts.js';
import type { WitnessDecision } from './relation-witness.js';
import type { LocalBase, LocalBaseLeftOut, LocalDerivedStructure, LocalManifestFacts } from '@syzygy/polaris-generation-core/live';
import { containmentName } from './containment.js';
import {
  BASE_BOUNDS, BASE_END_SCHEMA, BASE_FIELD, BASE_MAPS, BASE_SCHEMA, CONTAINMENT_KIND, LOCAL_DRAFT_SCHEMA_VERSION_V15, MODEL_FIELD, VIEW_FIELD,
  hasBaseForm, hasModelForm, type BaseMapName,
} from './draft-schema.js';

/** The derived base of a v15 view (REQ-polaris-generation-034 version 2.35, syzygy-3efd.38): the shape of `base` and of a cited
 * relationship's base ends, the map a base starts from as check or render derives it, what a base path names there, the six base findings
 * and their screening, the `field-version` findings of a v12 or v14 draft, and the elements a view with a `base` shows. Pure. A base never
 * writes to the map: it names a map and paths of its elements, and every base element keeps Syzygy's label, mark and identity. */

type Doc = Readonly<Record<string, unknown>>;
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The unit a base element takes for rule `relation-witness` (version 2.35): the unit its map gives it. */
export type BaseUnit = { readonly kind: 'repository-root' } | { readonly kind: 'top-level-directory'; readonly path: string } | { readonly kind: 'package-manifest'; readonly path: string };

/** One element of a base map, in the map's order. */
export interface BaseElement {
  /** The path the render resolves it to: `.` or a top-level directory's path, or `<manifest path>#<k>`. */
  readonly path: string;
  /** Its fact's identity (`data-derived-id` or `data-manifest-id`), never a draft identity: every fact identity starts with `_`. */
  readonly factId: string;
  /** Its box label, as the map labels it. */
  readonly label: string;
  /** Its name in Syzygy's words: `Repository root`, `<path>/`, or the declared name. */
  readonly name: string;
  /** The name a draft label is compared with (`base-label`): `Repository root`, its path, or its declared name. */
  readonly compared: string;
  readonly epistemic: 'observed' | 'inferred' | 'unknown';
  readonly unknownReason: string | null;
  readonly unit: BaseUnit;
  /** For the unit map: the manifest file that declares it. */
  readonly manifest?: string;
  /** For the directory map: whether it is the repository root. */
  readonly root?: boolean;
  /** For the unit map: the fact it lists, `package` or `module`, which gives its type for a view's level (version 2.50). */
  readonly unitFact?: 'package' | 'module';
}

/** A base map as check or render derives it: its elements and, for the directory map, the `contains` facts joining the root to each
 * listed directory; and what the map counts and does not list. */
export interface BaseMap {
  readonly map: BaseMapName;
  readonly elements: readonly BaseElement[];
  readonly contains: readonly { readonly factId: string; readonly to: string; readonly epistemic: 'observed' | 'inferred' | 'unknown'; readonly unknownReason: string | null }[];
  readonly notListed: { readonly directories: number; readonly secretPathsLeftOut: number; readonly submodules: number }
    | { readonly facts: number; readonly unknownFiles: number; readonly secretPathsLeftOut: number };
}

/** The two maps as one derivation states them: each `undefined` where that map is not established. */
export interface BaseMaps { readonly directories?: BaseMap; readonly units?: BaseMap }

/** The four package recognizers the unit map reads (version 2.9). */
export const UNIT_MAP_RULES: readonly string[] = Object.freeze(['npm-package-manifest', 'cargo-manifest', 'python-project-manifest', 'go-module-manifest']);

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** The directory map's elements from directory facts: the root, then every listed top-level directory in the record's order. `count` is the
 * files a fact counts; `epistemic` its mark at that derivation (Observed at check, where no currency rule is read). */
export function directoryBase(facts: readonly { readonly id: string; readonly fact: string; readonly path: string; readonly count: number; readonly to: string | null;
  readonly epistemic: 'observed' | 'unknown'; readonly unknownReason: string | null }[], notListed: { readonly directories: number; readonly secretPathsLeftOut: number; readonly submodules: number }): BaseMap {
  const root = facts.find((fact) => fact.fact === 'tree-root');
  const units = facts.filter((fact) => fact.fact === 'top-level-unit');
  const elements: BaseElement[] = [
    ...(root === undefined ? [] : [{ path: '.', factId: root.id, label: 'Repository root', name: 'Repository root', compared: 'Repository root', epistemic: root.epistemic,
      unknownReason: root.unknownReason, unit: { kind: 'repository-root' as const }, root: true }]),
    ...units.map((fact) => ({ path: fact.path, factId: fact.id, label: `${fact.path}/ (${plural(fact.count, 'file', 'files')})`, name: `${fact.path}/`, compared: fact.path,
      epistemic: fact.epistemic, unknownReason: fact.unknownReason, unit: { kind: 'top-level-directory' as const, path: fact.path } })),
  ];
  const contains = facts.filter((fact) => fact.fact === 'contains' && fact.to !== null).map((fact) => ({ factId: fact.id, to: fact.to!, epistemic: fact.epistemic, unknownReason: fact.unknownReason }));
  return { map: 'directories', elements, contains, notListed };
}

/** The unit map's elements from a derived manifest member: each listed `package` and `module` fact of the four package recognizers, in the
 * member's order, labelled with its declared name, Inferred; the k-th of a manifest file's facts resolves to `<path>#<k>`. */
export function unitBase(member: { readonly facts: readonly Readonly<Record<string, unknown>>[]; readonly factsNotListed: number;
  readonly recognizers: readonly { readonly rule: string; readonly unknown: number; readonly secretPathsLeftOut: number }[] }): BaseMap {
  const seen = new Map<string, number>();
  const elements: BaseElement[] = member.facts.filter((fact) => UNIT_MAP_RULES.includes(text(fact['rule']) ?? '') && (fact['fact'] === 'package' || fact['fact'] === 'module'))
    .map((fact) => {
      const manifest = text(fact['path']) ?? '';
      const k = (seen.get(manifest) ?? 0) + 1;
      seen.set(manifest, k);
      const name = text(fact['name']) ?? '';
      return { path: `${manifest}#${k}`, factId: text(fact['id']) ?? '', label: name, name, compared: name, epistemic: 'inferred' as const, unknownReason: null,
        unit: { kind: 'package-manifest' as const, path: manifest }, manifest, unitFact: fact['fact'] === 'module' ? 'module' as const : 'package' as const };
    });
  const read = member.recognizers.filter((entry) => UNIT_MAP_RULES.includes(entry.rule));
  return { map: 'units', elements, contains: [], notListed: { facts: member.factsNotListed, unknownFiles: read.reduce((sum, entry) => sum + entry.unknown, 0),
    secretPathsLeftOut: read.reduce((sum, entry) => sum + entry.secretPathsLeftOut, 0) } };
}

/** The indices of the base elements a base path names (version 2.35). For the directory map `.` names the root and a top-level directory's
 * path that directory. For the unit map a manifest file's path names each of its listed facts, and that path, `#` and a decimal `<k>` from 1
 * with no leading zero the k-th of them; a path ending in `#` and digits is read in that form, so `#0` or `#01` names nothing. */
export function resolveBasePath(map: BaseMap, path: string): number[] {
  if (map.map === 'directories') {
    const at = path === '.' ? map.elements.findIndex((element) => element.root === true) : map.elements.findIndex((element) => element.root !== true && element.path === path);
    return at === -1 ? [] : [at];
  }
  const numbered = /^(.*)#(\d+)$/su.exec(path);
  if (numbered !== null) {
    const at = /^[1-9]\d*$/u.test(numbered[2]!) ? map.elements.findIndex((element) => element.path === path) : -1;
    return at === -1 ? [] : [at];
  }
  return map.elements.flatMap((element, i) => (element.manifest === path ? [i] : []));
}

/** A v15 view's `base`, read where it is a record naming one of the two maps. */
export interface BaseSpec {
  readonly map: BaseMapName;
  readonly hide: readonly { readonly paths: readonly string[]; readonly reason: string }[] | undefined;
  readonly select: readonly string[] | undefined;
  readonly restReason: string | undefined;
  readonly group: readonly { readonly element: string; readonly paths: readonly string[] }[];
  readonly names: readonly { readonly path: string; readonly label: string; readonly epistemic: unknown; readonly citations: unknown; readonly record: Doc }[];
}

/** The `base` of a diagram of a v15 draft, or undefined where it carries none or it is not a record naming a map. Members of the wrong form
 * are a `schema` finding's matter; here they read as absent. */
export function baseOf(doc: Doc, diagram: unknown): BaseSpec | undefined {
  if (!hasBaseForm(doc['schemaVersion']) || !isRecord(diagram) || !isRecord(diagram[VIEW_FIELD])) return undefined;
  const base = diagram[VIEW_FIELD][BASE_FIELD];
  if (!isRecord(base) || !(BASE_MAPS as readonly unknown[]).includes(base['map'])) return undefined;
  const strings = (value: unknown): string[] => list(value).flatMap((entry) => (typeof entry === 'string' ? [entry] : []));
  return {
    map: base['map'] as BaseMapName,
    hide: Object.hasOwn(base, 'hide') ? list(base['hide']).flatMap((entry) => (isRecord(entry) ? [{ paths: strings(entry['paths']), reason: text(entry['reason']) ?? '' }] : [])) : undefined,
    select: Object.hasOwn(base, 'select') ? strings(base['select']) : undefined,
    restReason: text(base['restReason']),
    group: list(base['group']).flatMap((entry) => (isRecord(entry) ? [{ element: text(entry['element']) ?? '', paths: strings(entry['paths']) }] : [])),
    names: list(base['names']).flatMap((entry) => (isRecord(entry) ? [{ path: text(entry['path']) ?? '', label: text(entry['label']) ?? '', epistemic: entry['epistemic'], citations: entry['citations'], record: entry }] : [])),
  };
}

/** Whether a diagram carries a `base` member at all (any value), in any schema. */
export const carriesBase = (diagram: unknown): boolean => isRecord(diagram) && isRecord(diagram[VIEW_FIELD]) && Object.hasOwn(diagram[VIEW_FIELD], BASE_FIELD);

/** A relationship end that is a base end, as written: a record, never an identity. */
export const isBaseEnd = (end: unknown): end is Doc => isRecord(end);

/** The `schema` faults of a v15 view's `base` (version 2.35), each `{path, detail}` with its path in the draft: the generic shape faults of
 * the member, then a `hide` beside a `select` (at `hide`), a `select` without `restReason`, a `restReason` without `select`, and `group` in a
 * graph view, each at that member. */
export function baseShapeFaults(diagram: Doc, i: number, defs: SchemaWithDefs['defs']): { readonly path: string; readonly detail: string }[] {
  const at = `$.diagrams[${i}].${VIEW_FIELD}.${BASE_FIELD}`;
  const base = isRecord(diagram[VIEW_FIELD]) ? diagram[VIEW_FIELD][BASE_FIELD] : undefined;
  const out = checkShape({ root: BASE_SCHEMA, defs }, base).map((fault) => ({ path: `${at}${fault.path.slice(1)}`, detail: fault.detail }));
  if (!isRecord(base)) return out;
  if (Object.hasOwn(base, 'hide') && Object.hasOwn(base, 'select')) out.push({ path: `${at}.hide`, detail: 'a base carries `hide` or `select`, never both' });
  if (Object.hasOwn(base, 'select') && !Object.hasOwn(base, 'restReason')) out.push({ path: `${at}.select`, detail: '`select` needs `restReason`, the one reason for every base element it leaves out' });
  if (Object.hasOwn(base, 'restReason') && !Object.hasOwn(base, 'select')) out.push({ path: `${at}.restReason`, detail: '`restReason` stands only beside `select`' });
  if (Object.hasOwn(base, 'group') && diagram['kind'] !== CONTAINMENT_KIND) out.push({ path: `${at}.group`, detail: '`group` is a containment view\'s alone' });
  return out;
}

/** The `schema` faults of a cited relationship's base end (version 2.35), at the end's path. */
export function baseEndFaults(end: unknown, at: string, defs: SchemaWithDefs['defs']): { readonly path: string; readonly detail: string }[] {
  return checkShape({ root: BASE_END_SCHEMA, defs }, end).map((fault) => ({ path: `${at}${fault.path.slice(1)}`, detail: fault.detail }));
}

/** What the screen says of a value a detail would carry (version 2.35): admitted, withheld, or unavailable where the screen cannot classify
 * it. */
export type Admission = 'admitted' | 'withheld' | 'unavailable';
export type Admit = (value: string) => Admission;

/** The two fixed details a screened derived-base finding carries where a value it uses is not admitted (version 2.35). */
export const BASE_REFERENCE_UNAVAILABLE = 'Base reference unavailable under source screening.';
export const BASE_DETAIL_UNAVAILABLE = 'Derived-base detail unavailable under source screening.';

/** The literal detail where every draft-supplied value it uses is admitted (and, for `base-reference`, the map's evidence for its claim is
 * admitted), else the fixed detail. */
const screened = (admit: Admit, values: readonly string[], detail: string, fixed: string, evidence = true): string =>
  (evidence && values.every((value) => admit(value) === 'admitted') ? detail : fixed);

/** The `field-version` findings of a v12 or v14 draft (version 2.35): at each view's `base` and at each relationship's `from` or `to` that is
 * a base end, each in place of the `schema` finding at that path, its detail screened. None in any other schema. */
export function baseFieldVersionFindings(doc: Doc, admit: Admit): CheckFinding[] {
  const version = doc['schemaVersion'];
  if (!hasModelForm(version) || hasBaseForm(version)) return [];
  const out: CheckFinding[] = [];
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram) || !carriesBase(diagram)) return;
    const name = containmentName(diagram, i);
    out.push({ kind: 'field-version', at: `$.diagrams[${i}].${VIEW_FIELD}.${BASE_FIELD}`,
      detail: screened(admit, [name], `${name}: \`${BASE_FIELD}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V15}`, BASE_DETAIL_UNAVAILABLE) });
  });
  const model = isRecord(doc[MODEL_FIELD]) ? doc[MODEL_FIELD] : {};
  list(model['relationships']).forEach((relationship, k) => {
    if (!isRecord(relationship)) return;
    for (const end of ['from', 'to'] as const) {
      if (!isBaseEnd(relationship[end])) continue;
      const id = text(relationship['id']) ?? `$.${MODEL_FIELD}.relationships[${k}]`;
      out.push({ kind: 'field-version', at: `$.${MODEL_FIELD}.relationships[${k}].${end}`,
        detail: screened(admit, [id], `${id}: a base end needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V15}`, BASE_DETAIL_UNAVAILABLE) });
    }
  });
  return out;
}
export const baseFieldVersionPaths = (doc: Doc): string[] => baseFieldVersionFindings(doc, () => 'admitted').map((finding) => finding.at);

/** The base elements a view shows, as indices into the map in the map's order: those `select` names, or every element but those `hide`
 * names. */
export function shownOf(base: BaseSpec, map: BaseMap): readonly number[] {
  if (base.select !== undefined) {
    const named = new Set(base.select.flatMap((path) => resolveBasePath(map, path)));
    return map.elements.flatMap((_, k) => (named.has(k) ? [k] : []));
  }
  const hidden = new Set((base.hide ?? []).flatMap((entry) => entry.paths.flatMap((path) => resolveBasePath(map, path))));
  return map.elements.flatMap((_, k) => (hidden.has(k) ? [] : [k]));
}

/** Two texts compared as `base-label` compares them: surrounding white space and one trailing `/` removed from each, then case-folded. */
export const labelKey = (value: string): string => { const trimmed = value.trim(); return (trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed).toLowerCase(); };

/** The model's elements by identity: label and parent, for `base-label` and `base-group`. */
interface ModelElements { readonly byId: ReadonlyMap<string, Doc> }
const modelElements = (doc: Doc): ModelElements => {
  const model = isRecord(doc[MODEL_FIELD]) ? doc[MODEL_FIELD] : {};
  const byId = new Map<string, Doc>();
  for (const element of list(model['elements'])) { const id = isRecord(element) ? text(element['id']) : undefined; if (id !== undefined && !byId.has(id)) byId.set(id, element as Doc); }
  return { byId };
};

/** The levels the elements a containment view selects take in version 2.24's expansion: a selected element whose parent is absent or not
 * selected is a top-level group (level 1), and each other selected element one level below its parent. */
export function selectedLevels(doc: Doc, selected: readonly string[]): ReadonlyMap<string, number> {
  const { byId } = modelElements(doc);
  const chosen = new Set(selected.filter((id) => byId.has(id)));
  const levels = new Map<string, number>();
  const visit = (id: string, level: number): void => {
    if (levels.has(id)) return;
    levels.set(id, level);
    for (const child of selected) if (chosen.has(child) && !levels.has(child) && text(byId.get(child)!['parent']) === id) visit(child, level + 1);
  };
  for (const id of selected) {
    if (!chosen.has(id)) continue;
    const parent = text(byId.get(id)!['parent']);
    if (parent === undefined || !chosen.has(parent) || parent === id) visit(id, 1);
  }
  return levels;
}

/** One base path of a view, where it stands in the draft, and which list it belongs to. */
interface PathEntry { readonly path: string; readonly at: string; readonly list: 'select' | 'hide' | 'group' | 'names'; readonly names?: number }
function pathEntries(base: BaseSpec, at: string): PathEntry[] {
  return [
    ...(base.select ?? []).map((path, k) => ({ path, at: `${at}.select[${k}]`, list: 'select' as const })),
    ...(base.hide ?? []).flatMap((entry, j) => entry.paths.map((path, k) => ({ path, at: `${at}.hide[${j}].paths[${k}]`, list: 'hide' as const }))),
    ...base.group.flatMap((entry, j) => entry.paths.map((path, k) => ({ path, at: `${at}.group[${j}].paths[${k}]`, list: 'group' as const }))),
    ...base.names.map((entry, k) => ({ path: entry.path, at: `${at}.names[${k}].path`, list: 'names' as const, names: k })),
  ];
}

/** Whether a member of a draft path touches a `schema` finding. */
const touches = (at: string, schemaPaths: ReadonlySet<string>): boolean => [...schemaPaths].some((fault) => fault === at
  || fault.startsWith(`${at}.`) || fault.startsWith(`${at}[`) || at.startsWith(`${fault}.`) || at.startsWith(`${fault}[`));

/** The base findings of one view of a v15 draft (version 2.35), in the stated order (`base-reference`, `base-conflict`, `base-root`,
 * `base-group`, `base-size`, `base-label`), each kind in the order of its paths; and whether the view stands with no `base-reference` or
 * `base-conflict` finding, so its `view-shape` and `containment-flat` findings are computed over its expanded figure. Empty, and not clear,
 * where the view's `base` has a `schema` finding or its map is not established. */
export function viewBaseFindings(doc: Doc, diagram: Doc, i: number, maps: BaseMaps, schemaPaths: ReadonlySet<string>, admit: Admit,
  hidden: (path: string) => boolean): { readonly findings: CheckFinding[]; readonly clear: boolean } {
  const base = baseOf(doc, diagram);
  const at = `$.diagrams[${i}].${VIEW_FIELD}.${BASE_FIELD}`;
  const map = base === undefined ? undefined : maps[base.map];
  if (base === undefined || map === undefined || touches(at, schemaPaths)) return { findings: [], clear: false };
  const name = containmentName(diagram, i);
  const mapWord = base.map === 'directories' ? 'directory' : 'unit';
  const entries = pathEntries(base, at);
  const findings: CheckFinding[] = [];
  const reference = (entry: { readonly path: string; readonly at: string }, owner: string, many: boolean): CheckFinding | undefined => {
    const named = resolveBasePath(map, entry.path);
    // The map's evidence for an absence is admitted only where the path is not one the map leaves out unnamed.
    const evidence = !hidden(entry.path);
    if (named.length === 0) {
      return { kind: 'base-reference', at: entry.at, detail: screened(admit, [owner, entry.path], `${owner}: ${entry.path} names no element of the ${mapWord} map at this revision`, BASE_REFERENCE_UNAVAILABLE, evidence) };
    }
    if (many && named.length > 1) {
      return { kind: 'base-reference', at: entry.at, detail: screened(admit, [owner, entry.path],
        `${owner}: ${entry.path} names ${named.length} elements of the unit map; a display name or an arrow end names one, as ${entry.path}#<k>`, BASE_REFERENCE_UNAVAILABLE, evidence) };
    }
    return undefined;
  };
  for (const entry of entries) { const finding = reference(entry, name, entry.list === 'names'); if (finding !== undefined) findings.push(finding); }
  const referenced = findings.length > 0;

  // base-conflict: a later path naming a base element an earlier path of the same list names; a group path or display name naming a base
  // element the view does not show.
  const shown = new Set(shownOf(base, map));
  const conflict = (entry: PathEntry): CheckFinding => ({ kind: 'base-conflict', at: entry.at,
    detail: screened(admit, [name], `${name}: a base element is selected, hidden, grouped or named at most once, and grouped or named only where shown`, BASE_DETAIL_UNAVAILABLE) });
  const seen = { select: new Set<number>(), hide: new Set<number>(), group: new Set<number>(), names: new Set<number>() };
  for (const entry of entries) {
    const named = resolveBasePath(map, entry.path);
    const repeated = named.some((k) => seen[entry.list].has(k));
    named.forEach((k) => seen[entry.list].add(k));
    const unshown = (entry.list === 'group' || entry.list === 'names') && named.some((k) => !shown.has(k));
    if (repeated || unshown) findings.push(conflict(entry));
  }
  const clear = !findings.some((finding) => finding.kind === 'base-reference' || finding.kind === 'base-conflict');
  void referenced;

  // base-root: a containment of the directory map shows the root, never hides or groups it.
  if (base.map === 'directories' && diagram['kind'] === CONTAINMENT_KIND) {
    const root = map.elements.findIndex((element) => element.root === true);
    const rootDetail = screened(admit, [name], `${name}: the repository root frames a containment of the directory map and is shown, never hidden or grouped`, BASE_DETAIL_UNAVAILABLE);
    if (base.select !== undefined && !base.select.some((path) => resolveBasePath(map, path).includes(root))) findings.push({ kind: 'base-root', at: `${at}.select`, detail: rootDetail });
    for (const entry of entries) {
      if ((entry.list === 'hide' || entry.list === 'group') && resolveBasePath(map, entry.path).includes(root)) findings.push({ kind: 'base-root', at: entry.at, detail: rootDetail });
    }
  }
  if (!clear) return { findings, clear };

  const view = isRecord(diagram[VIEW_FIELD]) ? diagram[VIEW_FIELD] : {};
  const selected = list(view['elements']).flatMap((id) => (typeof id === 'string' ? [id] : []));
  const { byId } = modelElements(doc);
  // base-group: a group's element is one the view selects, at level 1 or 2 of version 2.24's expansion.
  if (diagram['kind'] === CONTAINMENT_KIND) {
    const levels = selectedLevels(doc, selected);
    base.group.forEach((entry, j) => {
      const level = levels.get(entry.element);
      if (level === undefined || level > 2) {
        findings.push({ kind: 'base-group', at: `${at}.group[${j}].element`,
          detail: screened(admit, [name], `${name}: a group places base elements inside an element this view selects, at level 1 or 2`, BASE_DETAIL_UNAVAILABLE) });
      }
    });
  }
  // base-size: one to 40 boxes, the shown base elements and the model elements the view selects.
  const boxes = shown.size + new Set(selected.filter((id) => byId.has(id))).size;
  if (boxes === 0 || boxes > BASE_BOUNDS.boxes) {
    findings.push({ kind: 'base-size', at, detail: screened(admit, [name], `${name}: a view shows one to 40 boxes, its base elements included`, BASE_DETAIL_UNAVAILABLE) });
  }
  // base-label: the draft's words never take the name of a base element the figure draws.
  const labelDetail = screened(admit, [name], `${name}: the draft's words never take the name of an element Syzygy draws in the same figure`, BASE_DETAIL_UNAVAILABLE);
  const baseNames = new Set([...shown].map((k) => labelKey(map.elements[k]!.compared)));
  const selectedLabels = new Set(selected.flatMap((id) => { const label = text(byId.get(id)?.['label']); return label === undefined ? [] : [labelKey(label)]; }));
  base.names.forEach((entry, k) => {
    const key = labelKey(entry.label);
    const another = base.names.some((other, m) => m !== k && labelKey(other.label) === key);
    if (baseNames.has(key) || selectedLabels.has(key) || another) findings.push({ kind: 'base-label', at: `${at}.names[${k}].label`, detail: labelDetail });
  });
  list(view['elements']).forEach((id, k) => {
    const label = typeof id === 'string' ? text(byId.get(id)?.['label']) : undefined;
    if (label !== undefined && baseNames.has(labelKey(label))) findings.push({ kind: 'base-label', at: `$.diagrams[${i}].${VIEW_FIELD}.elements[${k}]`, detail: labelDetail });
  });
  if (base.map === 'directories' && diagram['kind'] !== CONTAINMENT_KIND) {
    const model = isRecord(doc[MODEL_FIELD]) ? doc[MODEL_FIELD] : {};
    const relationships = new Map<string, Doc>();
    for (const relationship of list(model['relationships'])) { const id = isRecord(relationship) ? text(relationship['id']) : undefined; if (id !== undefined && !relationships.has(id)) relationships.set(id, relationship as Doc); }
    list(view['relationships']).forEach((id, k) => {
      const relationship = typeof id === 'string' ? relationships.get(id) : undefined;
      if (relationship === undefined || relationship['basis'] === 'derived') return;
      const label = text(relationship['label']);
      if (label !== undefined && labelKey(label) === 'contains') findings.push({ kind: 'base-label', at: `$.diagrams[${i}].${VIEW_FIELD}.relationships[${k}]`, detail: labelDetail });
    });
  }
  return { findings, clear };
}

/** The `base-reference` findings at the base ends of a v15 model's cited relationships (version 2.35), in model order, `model` standing for
 * the diagram: an end whose path names no element of its map, or more than one. None where the end's map is not established. */
export function baseEndFindings(doc: Doc, maps: BaseMaps, schemaPaths: ReadonlySet<string>, admit: Admit, hidden: (path: string) => boolean): CheckFinding[] {
  if (!hasBaseForm(doc['schemaVersion'])) return [];
  const model = isRecord(doc[MODEL_FIELD]) ? doc[MODEL_FIELD] : {};
  const out: CheckFinding[] = [];
  list(model['relationships']).forEach((relationship, k) => {
    if (!isRecord(relationship)) return;
    for (const end of ['from', 'to'] as const) {
      const value = relationship[end];
      const at = `$.${MODEL_FIELD}.relationships[${k}].${end}`;
      if (!isBaseEnd(value) || touches(at, schemaPaths)) continue;
      const map = maps[value['map'] as BaseMapName];
      const path = text(value['path']);
      if (map === undefined || path === undefined) continue;
      const named = resolveBasePath(map, path);
      const mapWord = map.map === 'directories' ? 'directory' : 'unit';
      const evidence = !hidden(path);
      // The fixed word `model` is no draft-supplied value.
      if (named.length === 0) out.push({ kind: 'base-reference', at, detail: screened(admit, [path], `model: ${path} names no element of the ${mapWord} map at this revision`, BASE_REFERENCE_UNAVAILABLE, evidence) });
      else if (named.length > 1) out.push({ kind: 'base-reference', at, detail: screened(admit, [path], `model: ${path} names ${named.length} elements of the unit map; a display name or an arrow end names one, as ${path}#<k>`, BASE_REFERENCE_UNAVAILABLE, evidence) });
    }
  });
  return out;
}

/** The element a base end names among the elements a view shows: its index in the map, or undefined. */
export function baseEndElement(end: unknown, base: BaseSpec | undefined, map: BaseMap | undefined, shown: ReadonlySet<number>): number | undefined {
  if (!isBaseEnd(end) || base === undefined || map === undefined || end['map'] !== base.map) return undefined;
  const path = text(end['path']);
  const named = path === undefined ? [] : resolveBasePath(map, path);
  return named.length === 1 && shown.has(named[0]!) ? named[0] : undefined;
}

/** The base of a view resolved against an established map: the elements it shows (in the map's order), the group each is placed in, and
 * each display name's element. */
export interface ResolvedBase {
  readonly spec: BaseSpec;
  readonly map: BaseMap;
  readonly shown: readonly number[];
  /** The model element each grouped base element is drawn inside, by map index. */
  readonly groupOf: ReadonlyMap<number, string>;
  /** The display names, each with the map index of the element it names and its claim identity `<diagram>:name:<k>`. */
  readonly names: readonly { readonly element: number; readonly id: string; readonly k: number; readonly entry: BaseSpec['names'][number] }[];
}

export function resolveBase(base: BaseSpec, map: BaseMap, diagramId: string): ResolvedBase {
  const shown = shownOf(base, map);
  const visible = new Set(shown);
  const groupOf = new Map<number, string>();
  for (const entry of base.group) for (const path of entry.paths) for (const k of resolveBasePath(map, path)) if (visible.has(k) && !groupOf.has(k)) groupOf.set(k, entry.element);
  const names = base.names.flatMap((entry, k) => { const named = resolveBasePath(map, entry.path); return named.length === 1 ? [{ element: named[0]!, id: `${diagramId}:name:${k + 1}`, k, entry }] : []; });
  return { spec: base, map, shown, groupOf, names };
}

/** The `basis` a base element's node or group, and a `contains` fact's edge, carry in a view's expansion: Syzygy's, never the draft's. */
export const BASE_BASIS = 'base';

/** A base element as the expansion draws it (version 2.35): its fact identity, Syzygy's label and mark, no citation, and the unit its map
 * gives it, which rule `relation-witness` reads; `grouped` where a `group` entry places it inside an element of the model, which nesting is
 * the draft's claim. With `children`, a containment group. */
export function baseNode(base: ResolvedBase, k: number, children?: readonly Record<string, unknown>[], grouped = false): Record<string, unknown> {
  const element = base.map.elements[k]!;
  return { id: element.factId, label: element.label, epistemic: element.epistemic, citations: [], unit: element.unit, basis: BASE_BASIS,
    ...(grouped ? { grouped: true } : {}), ...(children === undefined ? {} : { children }) };
}

/** What check or render reads a v15 draft's bases against: the maps as it derives them, the screen's admission of a value a detail would
 * carry, and whether a path is one the map leaves out unnamed (a secret path or under one, or a denied path). */
export interface BaseContext { readonly maps: BaseMaps; readonly admit: Admit; readonly hidden: (path: string) => boolean }

/** Every base view of a v15 draft read against `context` (version 2.35): each view's base findings by diagram index, and the bases resolved
 * for the views with no `base-reference` or `base-conflict` finding, which the expansion draws. */
export function readBases(doc: Doc, context: BaseContext, schemaPaths: ReadonlySet<string>): {
  readonly findings: ReadonlyMap<number, readonly CheckFinding[]>; readonly clear: ReadonlySet<number>; readonly resolved: ReadonlyMap<number, ResolvedBase> } {
  const findings = new Map<number, readonly CheckFinding[]>(), clear = new Set<number>(), resolved = new Map<number, ResolvedBase>();
  if (!hasBaseForm(doc['schemaVersion'])) return { findings, clear, resolved };
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram)) return;
    const base = baseOf(doc, diagram);
    if (base === undefined) return;
    const read = viewBaseFindings(doc, diagram, i, context.maps, schemaPaths, context.admit, context.hidden);
    findings.set(i, read.findings);
    const map = context.maps[base.map];
    if (read.clear && map !== undefined) { clear.add(i); resolved.set(i, resolveBase(base, map, text(diagram['id']) ?? '')); }
  });
  return { findings, clear, resolved };
}

/** A screened detail for a finding version 2.24 states and version 2.35 computes over a base view's expanded figure (`view-shape`,
 * `containment-flat`). */
export const screenedViewDetail = (admit: Admit, name: string, detail: string): string => screened(admit, [name], detail, BASE_DETAIL_UNAVAILABLE);

const VIEW_LIST_FAULT = /^\$\.diagrams\[(\d+)\]\.view\.(elements|relationships)$/u;
const BASE_MEMBER_FAULT = /^\$\.diagrams\[(\d+)\]\.view\.base$/u;
const END_FAULT = /^\$\.model\.relationships\[(\d+)\]\.(from|to)$/u;
const COUNT_FAULT = /^must hold \d+ to \d+ items; holds (\d+)$/u;

/** How the schema check reads `base` and base ends (version 2.35). A v15 draft is checked against the v14 schema, which names neither, so
 * each fault the generic check gives at them is replaced: `base` by its own faults, a base view's list bounds by zero to 40 and zero to 80,
 * and a cited relationship's base end by the end's faults. In a v12 or v14 draft each such path is reported as `field-version` instead
 * (`fieldVersioned`). Any other draft: neither. */
export function baseSchemaReading(doc: Doc, defs: SchemaWithDefs['defs']): {
  readonly replaced: (error: { readonly path: string; readonly detail: string }) => readonly { readonly path: string; readonly detail: string }[] | undefined;
  readonly fieldVersioned: ReadonlySet<string> } {
  const version = doc['schemaVersion'];
  const fieldVersioned = new Set(baseFieldVersionPaths(doc));
  if (!hasBaseForm(version)) return { replaced: () => undefined, fieldVersioned };
  const diagrams = list(doc['diagrams']);
  const relationships = isRecord(doc[MODEL_FIELD]) ? list(doc[MODEL_FIELD]['relationships']) : [];
  return {
    fieldVersioned,
    replaced: (error) => {
      const member = BASE_MEMBER_FAULT.exec(error.path);
      if (member !== null && error.detail === 'is not a field of this form') {
        const i = Number(member[1]);
        return baseShapeFaults(diagrams[i] as Doc, i, defs);
      }
      const bounded = VIEW_LIST_FAULT.exec(error.path);
      const count = COUNT_FAULT.exec(error.detail);
      if (bounded !== null && count !== null && carriesBase(diagrams[Number(bounded[1])])) {
        const [low, high] = bounded[2] === 'elements' ? BASE_BOUNDS.viewElements : BASE_BOUNDS.viewRelationships;
        const holds = Number(count[1]);
        return holds >= low && holds <= high ? [] : [{ path: error.path, detail: `must hold ${low} to ${high} items; holds ${holds}` }];
      }
      const end = END_FAULT.exec(error.path);
      if (end !== null) {
        const relationship = relationships[Number(end[1])];
        if (isRecord(relationship) && !Object.hasOwn(relationship, 'basis') && isBaseEnd(relationship[end[2]!])) return baseEndFaults(relationship[end[2]!], error.path, defs);
      }
      return undefined;
    },
  };
}

/** The screen's admission of a value a derived-base detail would carry (version 2.35): withheld where a secret detector matches it, read as
 * a path or as text; unavailable where the screen cannot say. */
export function admitOf(screen: Pick<DossierScreen, 'screenPath' | 'screenBody'>): Admit {
  const isSecretPath = secretPathOf(screen);
  return (value) => {
    try {
      return isSecretPath(value) || screen.screenBody(value) === 'secret-detector-match' ? 'withheld' : 'admitted';
    } catch {
      return 'unavailable';
    }
  };
}

/** The two maps as check derives them (version 2.35): the directory map from the tree facts it derived for the revision, the unit map from its
 * `manifestFacts` member; each undefined where it is not established. Check reads no currency rule, so every directory fact is Observed. */
export function checkBaseMaps(tree: TreeFacts | undefined, manifests: ManifestFacts | undefined): BaseMaps {
  const directories = tree === undefined ? undefined : directoryBase(tree.facts.map((fact) => ({
    id: fact.id, fact: fact.fact, path: fact.path, count: fact.fact === 'tree-root' ? fact.rootFiles : fact.fact === 'top-level-unit' ? fact.files : 0,
    to: fact.fact === 'contains' ? fact.to : null, epistemic: 'observed' as const, unknownReason: null })),
  { directories: tree.unitsNotListed, secretPathsLeftOut: tree.secretPathsLeftOut, submodules: tree.submodules });
  const units = manifests === undefined || manifests.state !== 'derived' ? undefined : unitBase(manifests);
  return { ...(directories === undefined ? {} : { directories }), ...(units === undefined ? {} : { units }) };
}

/** The `relation-challenged` findings of a v15 draft's base nestings (version 2.35): a base element a `group` entry places inside an element
 * of the model is the draft's claim, decided by rule `relation-witness` as an element's `parent` is. Each challenged one is a finding at the
 * first `group` path naming it, its detail the one version 2.23 gives a challenged nesting, with the base path for the group and screened. */
export function baseNestingFindings(doc: Doc, bases: ReadonlyMap<number, ResolvedBase>,
  nestings: readonly { readonly id: string; readonly diagram: number; readonly decision: WitnessDecision }[], admit: Admit): CheckFinding[] {
  const out: CheckFinding[] = [];
  for (const { id, diagram: i, decision } of nestings) {
    const base = bases.get(i);
    if (base === undefined || decision.state !== 'challenged') continue;
    const k = base.map.elements.findIndex((element) => element.factId === id);
    if (k === -1 || !base.groupOf.has(k)) continue;
    const name = containmentName(list(doc['diagrams'])[i] as Doc, i);
    let at: string | undefined, path: string | undefined;
    base.spec.group.forEach((entry, j) => entry.paths.forEach((written, n) => {
      if (at === undefined && resolveBasePath(base.map, written).includes(k)) { at = `$.diagrams[${i}].${VIEW_FIELD}.${BASE_FIELD}.group[${j}].paths[${n}]`; path = written; }
    }));
    if (at === undefined || path === undefined) continue;
    out.push({ kind: 'relation-challenged', at, detail: screened(admit, [name, path],
      `${name}: no ${decision.factKind} fact joins the units of group ${path} and the group it is drawn in, in what rule ${decision.rule} version ${decision.ruleVersion} derived at the pinned revision; correct the nesting or its groups' units`,
      BASE_DETAIL_UNAVAILABLE) });
  }
  return out;
}

/** The two maps as a render derives them (version 2.35): the directory map from the derived structure its region states, established
 * where that is `derived` (a fact the currency rule renders Unknown is drawn Unknown); the unit map from the render's own `manifestFacts`. */
export function renderBaseMaps(derived: LocalDerivedStructure | undefined, manifests: LocalManifestFacts | undefined): BaseMaps {
  const directories = derived === undefined || derived.state !== 'derived' ? undefined : directoryBase(derived.facts.map((fact) => ({
    id: fact.id, fact: fact.fact, path: fact.path, count: fact.count ?? 0, to: fact.to, epistemic: fact.epistemic, unknownReason: fact.unknownReason })),
  { directories: derived.tree.unitsNotListed, secretPathsLeftOut: derived.tree.secretPathsLeftOut, submodules: derived.tree.submodules });
  const units = manifests === undefined || manifests.state !== 'derived' ? undefined : unitBase(manifests as unknown as Parameters<typeof unitBase>[0]);
  return { ...(directories === undefined ? {} : { directories }), ...(units === undefined ? {} : { units }) };
}

/** A view's base as the render hands it on before its display names' citations are read: `names` keep the draft's record. */
export type PendingBase = Exclude<LocalBase, { readonly state: 'drawn' }>
  | (Omit<Extract<LocalBase, { readonly state: 'drawn' }>, 'names'> & { readonly names: readonly { readonly id: string; readonly factId: string; readonly path: string; readonly record: Doc }[] });

/** The fixed reasons a figure refused under source screening carries (version 2.35): neither names the reason's text. */
export const BASE_REASON_WITHHELD = 'A reason this figure gives for what it leaves out is withheld under source screening.';
export const BASE_REASON_UNAVAILABLE = 'A reason this figure gives for what it leaves out could not be screened.';

/** Every base view of a v15 draft at a render (version 2.35). A view whose map is not established is Unknown; one whose base any finding
 * of version 2.35 would name at this render (`late`, by diagram index) does not resolve; one whose `hide` or `restReason` text the screen
 * withholds or cannot screen is refused, both forms; every other is drawn, its base resolved for the expansion. */
export function renderBases(doc: Doc, maps: BaseMaps, late: ReadonlySet<number>, screenReason: (reason: string) => Admission): {
  readonly resolved: ReadonlyMap<number, ResolvedBase>; readonly pending: ReadonlyMap<string, PendingBase>; readonly refused: ReadonlyMap<number, string> } {
  const resolved = new Map<number, ResolvedBase>(), pending = new Map<string, PendingBase>(), refused = new Map<number, string>();
  if (!hasBaseForm(doc['schemaVersion'])) return { resolved, pending, refused };
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram) || !isRecord(diagram['disposition']) || diagram['disposition']['kind'] !== 'produced') return;
    const base = baseOf(doc, diagram);
    const id = text(diagram['id']);
    if (base === undefined || id === undefined) return;
    const map = maps[base.map];
    if (map === undefined) { pending.set(id, { state: 'unknown', map: base.map }); return; }
    if (late.has(i)) { pending.set(id, { state: 'unresolved', map: base.map }); return; }
    const reasons = [...(base.hide ?? []).map((entry) => entry.reason), ...(base.select === undefined ? [] : [base.restReason ?? ''])];
    const screened = reasons.map(screenReason);
    if (screened.includes('withheld')) { refused.set(i, BASE_REASON_WITHHELD); return; }
    if (screened.includes('unavailable')) { refused.set(i, BASE_REASON_UNAVAILABLE); return; }
    const read = resolveBase(base, map, id);
    resolved.set(i, read);
    const shown = new Set(read.shown);
    const leftOut = (indices: readonly number[], reason: string): LocalBaseLeftOut => {
      const sorted = [...new Set(indices)].sort((a, b) => a - b);
      return { count: sorted.length, names: sorted.map((k) => map.elements[k]!.name), root: sorted.some((k) => map.elements[k]!.root === true),
        paths: sorted.map((k) => map.elements[k]!.path), reason };
    };
    const directories = map.elements.filter((element) => element.root !== true);
    const rootAt = map.elements.findIndex((element) => element.root === true);
    pending.set(id, {
      state: 'drawn', map: base.map,
      elements: read.shown.map((k) => {
        const element = map.elements[k]!;
        const contains = map.contains.find((fact) => fact.to === element.factId);
        return { factId: element.factId, path: element.path, label: element.label, name: element.name, epistemic: element.epistemic, unknownReason: element.unknownReason,
          contains: contains === undefined ? null : { factId: contains.factId, epistemic: contains.epistemic } };
      }),
      shown: read.shown.filter((k) => map.elements[k]!.root !== true).length,
      total: directories.length,
      root: base.map === 'units' ? null : rootAt !== -1 && shown.has(rootAt) ? 'shown' : 'hidden',
      notListed: map.notListed,
      select: base.select === undefined ? null : read.shown.map((k) => map.elements[k]!.path),
      restReason: base.select === undefined ? null : leftOut(map.elements.flatMap((_, k) => (shown.has(k) ? [] : [k])), base.restReason ?? ''),
      hides: (base.hide ?? []).map((entry) => leftOut(entry.paths.flatMap((path) => resolveBasePath(map, path)), entry.reason)),
      names: read.names.map((name) => ({ id: name.id, factId: map.elements[name.element]!.factId, path: map.elements[name.element]!.path, record: name.entry.record })),
    });
  });
  return { resolved, pending, refused };
}

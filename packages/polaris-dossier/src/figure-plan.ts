import { CONTAINMENT_KIND, DIAGRAM_KINDS, FIGURE_KINDS } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import type { CheckFinding } from './check-model.js';
import { FIGURE_PLAN_FIELD, hasFigurePlanForm } from './draft-schema.js';
import { carriesBase } from './derived-base.js';
import { expandModel, isViewKind, modelIndex } from './system-model.js';

/** The figure plan of a schema-v14 draft and the figure advice (REQ-polaris-generation-034 version 2.33, syzygy-3efd.84).
 *
 * The plan is the authoring session's working record, read by check alone: check reports its repair findings here, after every finding
 * version 2.32 reports, and then hands every other reader the draft without it (`withoutFigurePlan`), so no page, record, packet, count or
 * ledger carries it. The advice reads the produced figures, each graph or containment as its view's expansion, and gates nothing. */

type Doc = Readonly<Record<string, unknown>>;

/** The nine figure kinds a planned figure may name: versions 2.5 and 2.23. */
export const PLAN_FIGURE_KINDS: readonly string[] = Object.freeze([...DIAGRAM_KINDS, ...FIGURE_KINDS, CONTAINMENT_KIND]);
const QUESTION_LIMIT = 300;
/** White space as the requirement defines it: U+0009 to U+000D and U+0020, and no other character. */
const isSpace = (ch: string): boolean => ch === ' ' || (ch >= '\t' && ch <= '\r');

export const FIGURE_PLAN_DETAIL = Object.freeze({
  absent: 'a v14 draft plans its figures: one `figurePlan` entry for the overview, each section and each deep dive',
  notList: '`figurePlan` is a list of plan entries',
  malformed: 'a plan entry is {"home", "question", "kind", "figure"} or {"home", "omitted"}',
});

/** Whether a draft is one whose `figurePlan` check reads: schema v14, and schema v15 (version 2.35). */
export const plansFigures = (doc: unknown): doc is Doc => isRecord(doc) && hasFigurePlanForm(doc['schemaVersion']);

/** A v14 draft without its plan, which every reader but the plan's own findings is handed; any other draft unchanged. */
export function withoutFigurePlan<T>(doc: T): T {
  if (!plansFigures(doc) || !Object.hasOwn(doc, FIGURE_PLAN_FIELD)) return doc;
  const { [FIGURE_PLAN_FIELD]: _plan, ...rest } = doc;
  return rest as T;
}

interface Place { readonly kind: 'overview' | 'section' | 'deep-dive'; readonly target?: string }
const placeKey = (place: Place): string => JSON.stringify([place.kind, place.target ?? null]);
const placeWords = (place: Place): string => (place.kind === 'overview' ? 'overview' : `${place.kind === 'section' ? 'section' : 'deep dive'} ${place.target}`);

const exactKeys = (value: Doc, keys: readonly string[]): boolean => {
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
};

function placeOf(home: unknown): Place | undefined {
  if (!isRecord(home)) return undefined;
  if (home['kind'] === 'overview') return exactKeys(home, ['kind']) ? { kind: 'overview' } : undefined;
  if ((home['kind'] === 'section' || home['kind'] === 'deep-dive') && exactKeys(home, ['kind', 'target']) && typeof home['target'] === 'string') {
    return { kind: home['kind'], target: home['target'] };
  }
  return undefined;
}

const isPlanText = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const points = [...value];
  return points.length >= 1 && points.length <= QUESTION_LIMIT && points.some((ch) => !isSpace(ch));
};

type Entry = { readonly place: Place; readonly planned?: { readonly kind: string; readonly figure: unknown } };

function entryOf(value: unknown): Entry | undefined {
  if (!isRecord(value)) return undefined;
  const place = placeOf(value['home']);
  if (place === undefined) return undefined;
  if (exactKeys(value, ['home', 'omitted'])) return isPlanText(value['omitted']) ? { place } : undefined;
  if (!exactKeys(value, ['home', 'question', 'kind', 'figure'])) return undefined;
  if (!isPlanText(value['question']) || typeof value['kind'] !== 'string' || !PLAN_FIGURE_KINDS.includes(value['kind'])) return undefined;
  return { place, planned: { kind: value['kind'], figure: value['figure'] } };
}

const idsOf = (parts: unknown): string[] => (Array.isArray(parts) ? parts : []).flatMap((part) => (isRecord(part) && typeof part['id'] === 'string' ? [part['id']] : []));

/** The plan's repair findings (version 2.33), in entry order and then the places no entry names; none for a draft of another schema. */
export function figurePlanFindings(doc: unknown): CheckFinding[] {
  if (!plansFigures(doc)) return [];
  if (!Object.hasOwn(doc, FIGURE_PLAN_FIELD)) return [{ kind: 'figure-plan', at: `$.${FIGURE_PLAN_FIELD}`, detail: FIGURE_PLAN_DETAIL.absent }];
  const plan = doc[FIGURE_PLAN_FIELD];
  if (!Array.isArray(plan)) return [{ kind: 'figure-plan', at: `$.${FIGURE_PLAN_FIELD}`, detail: FIGURE_PLAN_DETAIL.notList }];
  const sections = idsOf(doc['sections']), dives = idsOf(doc['deepDives']);
  const diagrams = Array.isArray(doc['diagrams']) ? doc['diagrams'] : [];
  const findings: CheckFinding[] = [];
  const named = new Set<string>();
  plan.forEach((value, k) => {
    const at = `$.${FIGURE_PLAN_FIELD}[${k}]`;
    const entry = entryOf(value);
    if (entry === undefined) { findings.push({ kind: 'figure-plan', at, detail: FIGURE_PLAN_DETAIL.malformed }); return; }
    const { place } = entry;
    const resolved = place.kind === 'overview' || (place.kind === 'section' ? sections : dives).includes(place.target!);
    if (!resolved) {
      findings.push({ kind: 'unresolved-reference', at: `${at}.home.target`, detail: `no section or deep dive has the identity named by \`${FIGURE_PLAN_FIELD}[${k}].home.target\`` });
    } else if (named.has(placeKey(place))) {
      findings.push({ kind: 'figure-plan', at: `${at}.home`, detail: `${placeWords(place)}: a second plan entry for this place` });
    } else named.add(placeKey(place));
    if (entry.planned === undefined) return;
    const { figure, kind } = entry.planned;
    const diagram = diagrams.find((candidate) => isRecord(candidate) && typeof figure === 'string' && candidate['id'] === figure);
    if (!isRecord(diagram)) {
      findings.push({ kind: 'unresolved-reference', at: `${at}.figure`, detail: `no diagram has the identity named by \`${FIGURE_PLAN_FIELD}[${k}].figure\`` });
      return;
    }
    const home = diagram['home'];
    const homed = isRecord(home) && home['kind'] === place.kind && home['target'] === place.target;
    if (resolved && !homed) findings.push({ kind: 'figure-plan', at: `${at}.figure`, detail: `${String(figure)}: a planned figure is homed at its plan entry's place` });
    if (diagram['kind'] !== kind) findings.push({ kind: 'figure-plan', at: `${at}.figure`, detail: `${String(figure)}: a planned figure is of the kind its plan entry names` });
  });
  const places: Place[] = [{ kind: 'overview' }, ...sections.map((target): Place => ({ kind: 'section', target })), ...dives.map((target): Place => ({ kind: 'deep-dive', target }))];
  const unplanned = new Set<string>();
  for (const place of places) {
    const key = placeKey(place);
    if (named.has(key) || unplanned.has(key)) continue;
    unplanned.add(key);
    findings.push({ kind: 'figure-plan', at: `$.${FIGURE_PLAN_FIELD}`, detail: `${placeWords(place)}: no plan entry for this place` });
  }
  return findings;
}

// ---- Figure advice --------------------------------------------------------------------------------------------------------------------

export const FIGURE_ADVICE_RULES = Object.freeze([
  { id: 'figure-information-floor', version: 1 },
  { id: 'figure-duplicate', version: 1 },
  { id: 'figure-mixed-levels', version: 1 },
] as const);
export type FigureAdviceRule = (typeof FIGURE_ADVICE_RULES)[number]['id'];

export interface FigureAdvisory { readonly rule: FigureAdviceRule; readonly diagram: string; readonly at: string; readonly detail: string }
export interface FigureAdvice {
  readonly rules: typeof FIGURE_ADVICE_RULES;
  readonly examined: number;
  readonly advisories: readonly FigureAdvisory[];
}

const GRAPH_KINDS: ReadonlySet<unknown> = new Set(DIAGRAM_KINDS);
const familyOf = (kind: unknown): string | undefined => (GRAPH_KINDS.has(kind) ? 'graph'
  : kind === 'sequence' || kind === 'swimlane' || kind === CONTAINMENT_KIND ? kind : undefined);
const records = (value: unknown): Doc[] => (Array.isArray(value) ? value.filter(isRecord) : []);

/** A label's key: leading and trailing white space removed, each inner run one space, A to Z lowercased; nothing else changed. */
export function labelKey(label: unknown): string {
  const points = [...(typeof label === 'string' ? label : '')];
  let start = 0, end = points.length;
  while (start < end && isSpace(points[start]!)) start++;
  while (end > start && isSpace(points[end - 1]!)) end--;
  let out = '', run = false;
  for (const ch of points.slice(start, end)) {
    if (isSpace(ch)) { run = true; continue; }
    if (run) { out += ' '; run = false; }
    out += ch >= 'A' && ch <= 'Z' ? ch.toLowerCase() : ch;
  }
  return out;
}

/** A containment's groups in draft (or expansion) order, each before its children, with the group it is drawn inside. */
function groupsInOrder(diagram: Doc): { readonly group: Doc; readonly parent: Doc | undefined; readonly ancestors: readonly Doc[] }[] {
  const out: { group: Doc; parent: Doc | undefined; ancestors: readonly Doc[] }[] = [];
  const visit = (groups: unknown, ancestors: readonly Doc[]): void => {
    for (const group of records(groups)) {
      out.push({ group, parent: ancestors[ancestors.length - 1], ancestors });
      visit(group['children'], [...ancestors, group]);
    }
  };
  visit(diagram['groups'], []);
  return out;
}

interface Figure { readonly index: number; readonly id: string; readonly diagram: Doc; readonly family: string; readonly viewed: boolean }

const KEY_PAIRS: Readonly<Record<string, readonly [string, string, string, string]>> = {
  graph: ['nodes', 'edges', 'from', 'to'],
  sequence: ['participants', 'messages', 'from', 'to'],
  swimlane: ['lanes', 'steps', 'lane', ''],
};

/** A figure's keys (rule `figure-duplicate`), as a set of their JSON spellings, and whether it has one `arrow`, `step` or `in` key. */
function keysOf(figure: Figure): { readonly keys: ReadonlySet<string>; readonly drawn: boolean } {
  const keys = new Set<string>();
  let drawn = false;
  const add = (key: readonly string[]): void => { keys.add(JSON.stringify(key)); if (key[0] !== 'box') drawn = true; };
  if (figure.family === CONTAINMENT_KIND) {
    for (const { group, parent } of groupsInOrder(figure.diagram)) {
      add(['box', labelKey(group['label'])]);
      if (parent !== undefined) add(['in', labelKey(parent['label']), labelKey(group['label'])]);
    }
    return { keys, drawn };
  }
  const [boxes, links, fromKey, toKey] = KEY_PAIRS[figure.family]!;
  const byId = new Map<string, Doc>();
  for (const box of records(figure.diagram[boxes])) {
    add(['box', labelKey(box['label'])]);
    if (typeof box['id'] === 'string' && !byId.has(box['id'])) byId.set(box['id'], box);
  }
  const boxOf = (ref: unknown): Doc | undefined => (typeof ref === 'string' ? byId.get(ref) : undefined);
  for (const link of records(figure.diagram[links])) {
    const from = boxOf(link[fromKey]);
    if (from === undefined) continue;
    if (figure.family === 'swimlane') { add(['step', labelKey(from['label']), labelKey(link['label'])]); continue; }
    const to = boxOf(link[toKey]);
    if (to !== undefined) add(['arrow', labelKey(from['label']), labelKey(to['label'])]);
  }
  return { keys, drawn };
}

function informationFloor(figure: Figure): boolean {
  const { diagram, family } = figure;
  if (family === 'graph') { const nodes = records(diagram['nodes']).length; return nodes <= 3 && records(diagram['edges']).length <= nodes - 1; }
  if (family === 'swimlane') return records(diagram['steps']).length <= 3;
  if (family === 'sequence') return records(diagram['messages']).length <= 2;
  return groupsInOrder(diagram).length <= 3;
}

type Unit = Readonly<Record<string, unknown>>;
const ENCLOSED_BY_DIRECTORY: ReadonlySet<unknown> = new Set(['package-manifest', 'workflow-job', 'compose-service']);

/** Whether unit X encloses unit Y (rule `figure-mixed-levels`). */
function unitEncloses(x: Unit | undefined, y: Unit | undefined): boolean {
  if (x === undefined || y === undefined) return false;
  if (x['kind'] === 'repository-root') return typeof y['kind'] === 'string' && y['kind'] !== 'repository-root' && y['kind'] !== 'dependency-name';
  if (x['kind'] === 'top-level-directory' && typeof x['path'] === 'string') {
    return ENCLOSED_BY_DIRECTORY.has(y['kind']) && typeof y['path'] === 'string' && y['path'].startsWith(`${x['path']}/`);
  }
  return false;
}

/** The first pair a graph or containment figure draws, a part beside a part within it, without saying that one holds the other. */
function mixedLevels(figure: Figure, parentOf: (id: string) => string | undefined): readonly [string, string] | undefined {
  const { diagram, family } = figure;
  let members: { readonly id: string; readonly unit: Unit | undefined }[];
  let holds: (x: string, y: string) => boolean;
  if (family === CONTAINMENT_KIND) {
    const order = groupsInOrder(diagram);
    members = order.map(({ group }) => ({ id: String(group['id']), unit: isRecord(group['unit']) ? group['unit'] : undefined }));
    const inside = new Map(order.map(({ group, ancestors }) => [String(group['id']), new Set(ancestors.map((ancestor) => String(ancestor['id'])))] as const));
    holds = (x, y) => inside.get(y)?.has(x) === true;
  } else if (family === 'graph') {
    members = records(diagram['nodes']).map((node) => ({ id: String(node['id']), unit: isRecord(node['unit']) ? node['unit'] : undefined }));
    const contains = new Map<string, string[]>();
    for (const edge of records(diagram['edges'])) {
      if (edge['relation'] !== 'contains' || typeof edge['from'] !== 'string' || typeof edge['to'] !== 'string') continue;
      contains.set(edge['from'], [...(contains.get(edge['from']) ?? []), edge['to']]);
    }
    holds = (x, y) => {
      const seen = new Set<string>([x]);
      const queue = [x];
      while (queue.length > 0) {
        for (const next of contains.get(queue.shift()!) ?? []) {
          if (next === y) return true;
          if (!seen.has(next)) { seen.add(next); queue.push(next); }
        }
      }
      return false;
    };
  } else return undefined;
  const ancestor = (x: string, y: string): boolean => {
    if (!figure.viewed) return false;
    const reached = new Set<string>([y]);
    for (let at = parentOf(y); at !== undefined && !reached.has(at); at = parentOf(at)) {
      if (at === x) return true;
      reached.add(at);
    }
    return false;
  };
  for (const x of members) {
    for (const y of members) {
      if (x === y) continue;
      if ((ancestor(x.id, y.id) || unitEncloses(x.unit, y.unit)) && !holds(x.id, y.id)) return [x.id, y.id];
    }
  }
  return undefined;
}

/** The figure advice of a v14 or v15 draft (versions 2.33 and 2.35), reading no figure whose view carries a `base`: Inferred, from the draft's bytes alone. Undefined for any other draft; a caller
 * reports it only where check reports no `schema` finding, and a throw means no advice, never a failed check. */
export function figureAdvice(doc: unknown): FigureAdvice | undefined {
  if (!plansFigures(doc)) return undefined;
  const expanded = expandModel(doc).doc;
  const original = Array.isArray(doc['diagrams']) ? doc['diagrams'] : [];
  const index = modelIndex(doc);
  const parentOf = (id: string): string | undefined => {
    const parent = index.elementById.get(id)?.element['parent'];
    return typeof parent === 'string' && index.elementById.has(parent) ? parent : undefined;
  };
  const figures: Figure[] = [];
  (Array.isArray(expanded['diagrams']) ? expanded['diagrams'] : []).forEach((diagram, index_) => {
    if (!isRecord(diagram)) return;
    const disposition = diagram['disposition'];
    if (!isRecord(disposition) || disposition['kind'] !== 'produced') return;
    const family = familyOf(diagram['kind']);
    if (family === undefined) return;
    const source = original[index_];
    // A figure whose view carries a `base` draws boxes only a computed map holds: the advice reads it not at all (version 2.35).
    if (carriesBase(source)) return;
    figures.push({ index: index_, id: String(diagram['id']), diagram, family, viewed: isRecord(source) && isViewKind(source) });
  });
  const keyed = figures.map((figure) => ({ figure, ...keysOf(figure) }));
  const advisories: FigureAdvisory[] = [];
  for (const [n, figure] of figures.entries()) {
    const advise = (rule: FigureAdviceRule, detail: string): void => { advisories.push({ rule, diagram: figure.id, at: `$.diagrams[${figure.index}]`, detail }); };
    if (informationFloor(figure)) advise('figure-information-floor', `${figure.id}: a chain of three or fewer is a sentence; say it in the prose, or draw what a sentence cannot hold`);
    const self = keyed[n]!;
    if (self.drawn) {
      const other = keyed.find((candidate, m) => m !== n && candidate.figure.family === figure.family && [...self.keys].every((key) => candidate.keys.has(key))
        && ([...candidate.keys].some((key) => !self.keys.has(key)) || (candidate.keys.size === self.keys.size && m < n)));
      if (other !== undefined) advise('figure-duplicate', `${figure.id}: everything it draws is drawn by ${other.figure.id}; keep one figure, or draw what the other does not`);
    }
    const pair = mixedLevels(figure, parentOf);
    if (pair !== undefined) advise('figure-mixed-levels', `${figure.id}: ${pair[0]} and ${pair[1]} stand for a part and a part within it, and the figure does not show that one holds the other; draw one level, or show the containment`);
  }
  return { rules: FIGURE_ADVICE_RULES, examined: figures.length, advisories };
}

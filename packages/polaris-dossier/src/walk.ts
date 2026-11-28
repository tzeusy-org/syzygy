import { DIAGRAM_KINDS, type LocalWalkStep } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import type { CheckFinding } from './check-model.js';
import { type BaseMaps, type ResolvedBase, baseOf, resolveBasePath, shownOf } from './derived-base.js';
import { LOCAL_DRAFT_SCHEMA_VERSIONS, LOCAL_DRAFT_SCHEMA_VERSION_V16, PRESENTATION_ELEMENT_KINDS, SUBSECTIONS_FIELD, WALK_FIELD, hasWalkForm } from './draft-schema.js';
import { isViewKind, modelIndex, viewLists } from './system-model.js';

/** The figure walk of a schema-v16 draft (REQ-polaris-generation-034 version 2.40, syzygy-3efd.88).
 *
 * A section or a deep dive may carry `walk`, one reading path through one graph figure drawn there, in numbered steps, each naming one
 * element the figure draws and one of the place's cited paragraphs. A walk is presentation: check reads it here alone, after every other
 * finding, and hands every other reader the draft without it (`withoutWalks`), so no record, count, ledger, packet or machine view moves for
 * it; the render reads it once more (`walksAt`) to draw the layer and the list beside the figure. */

type Doc = Readonly<Record<string, unknown>>;
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The six graph kinds a walk's figure may be. */
const GRAPH_KINDS: ReadonlySet<unknown> = new Set(DIAGRAM_KINDS);
/** The presentation elements of a place's `paragraphs` (draft-schema.ts, the set check reads): a block inside one is never a step's paragraph. */
const PRESENTATION_KINDS = PRESENTATION_ELEMENT_KINDS;
/** A walk's bounds: two to twelve steps. */
export const WALK_STEPS = Object.freeze([2, 12] as const);
/** The places that may carry a walk, sections' before deep dives'. */
const PLACES = ['sections', 'deepDives'] as const;

export const WALK_DETAIL = Object.freeze({
  malformed: 'a walk is {"figure", "steps"}, its steps a list of 2 to 12 {"element", "block"}',
  unresolved: 'no diagram has the identity named by `walk.figure`',
  home: (id: string): string => `${id}: a walk's figure is drawn where the walk is`,
  kind: (id: string): string => `${id}: a walk's figure is of a graph kind`,
  element: (k: number, id: string): string => `\`walk.steps[${k}].element\` names no element drawn in ${id}`,
  repeated: (element: string): string => `${element}: a second step for this element`,
  block: (k: number): string => `\`walk.steps[${k}].block\` names no paragraph of this section or deep dive`,
  uncited: (block: string): string => `${block}: a step's paragraph cites its sources`,
  fieldVersion: `\`${WALK_FIELD}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V16}`,
});

/** A record carrying exactly the members named. */
const exactly = (value: unknown, members: readonly string[]): value is Doc =>
  isRecord(value) && Object.keys(value).length === members.length && members.every((member) => Object.hasOwn(value, member));

/** A step's element as written: an identity, or a base end `{"map", "path"}`. */
type StepElement = { readonly kind: 'identity'; readonly id: string } | { readonly kind: 'base'; readonly map: string; readonly path: string };
interface WellFormedWalk { readonly figure: string; readonly steps: readonly { readonly element: StepElement; readonly block: string }[] }

/** A walk read in its one well-formed shape, or undefined. */
export function wellFormed(walk: unknown): WellFormedWalk | undefined {
  if (!exactly(walk, ['figure', 'steps']) || typeof walk['figure'] !== 'string' || !Array.isArray(walk['steps'])) return undefined;
  const steps = walk['steps'] as readonly unknown[];
  if (steps.length < WALK_STEPS[0] || steps.length > WALK_STEPS[1]) return undefined;
  const read: WellFormedWalk['steps'][number][] = [];
  for (const step of steps) {
    if (!exactly(step, ['element', 'block']) || typeof step['block'] !== 'string') return undefined;
    const element = step['element'];
    if (typeof element === 'string') read.push({ element: { kind: 'identity', id: element }, block: step['block'] });
    else if (exactly(element, ['map', 'path']) && typeof element['map'] === 'string' && typeof element['path'] === 'string') {
      read.push({ element: { kind: 'base', map: element['map'], path: element['path'] }, block: step['block'] });
    } else return undefined;
  }
  return { figure: walk['figure'], steps: read };
}

/** Every walk a draft carries, in draft order (sections' before deep dives'), with its place and path. */
function walksOf(doc: Doc): { readonly place: Doc; readonly part: typeof PLACES[number]; readonly at: string; readonly walk: unknown }[] {
  return PLACES.flatMap((part) => list(doc[part]).flatMap((place, i) => (isRecord(place) && Object.hasOwn(place, WALK_FIELD)
    ? [{ place, part, at: `$.${part}[${i}].${WALK_FIELD}`, walk: place[WALK_FIELD] }] : [])));
}

/** A v16 draft without its walks, which every reader but the walk's own findings and the render's layer is handed; any other draft
 * unchanged, so a `walk` in it stays a member the schema check reads (and reports as field-version). */
export function withoutWalks<T>(doc: T): T {
  if (!isRecord(doc) || !hasWalkForm(doc['schemaVersion'])) return doc;
  const strip = (places: unknown): unknown => (Array.isArray(places) ? places.map((place) => {
    if (!isRecord(place) || !Object.hasOwn(place, WALK_FIELD)) return place;
    const { [WALK_FIELD]: _walk, ...rest } = place;
    return rest;
  }) : places);
  if (!PLACES.some((part) => list(doc[part]).some((place) => isRecord(place) && Object.hasOwn(place, WALK_FIELD)))) return doc;
  return { ...doc, ...Object.fromEntries(PLACES.filter((part) => Object.hasOwn(doc, part)).map((part) => [part, strip(doc[part])])) } as T;
}

/** A `walk` in a draft of schema v15 or earlier: a field-version finding at its path, in place of the schema finding there. */
export function walkFieldVersionPaths(doc: Doc): string[] {
  if (hasWalkForm(doc['schemaVersion']) || !LOCAL_DRAFT_SCHEMA_VERSIONS.some((known) => known === doc['schemaVersion'])) return [];
  return walksOf(doc).map((entry) => entry.at);
}
export const walkFieldVersionFindings = (doc: Doc): CheckFinding[] =>
  walkFieldVersionPaths(doc).map((at) => ({ kind: 'field-version', at, detail: WALK_DETAIL.fieldVersion }));

/** The identities of the paragraphs a step may name in a place: the claim blocks its own `paragraphs` list holds and, for a section, those
 * its subsections' `paragraphs` lists hold; never a block inside a presentation element, a child of a block or a subsection's `answer`. */
export function paragraphsOf(place: Doc, part: typeof PLACES[number]): ReadonlyMap<string, Doc> {
  const out = new Map<string, Doc>();
  const read = (entries: unknown): void => {
    for (const entry of list(entries)) {
      if (!isRecord(entry) || PRESENTATION_KINDS.has(text(entry['kind']) ?? '')) continue;
      const id = text(entry['id']);
      if (id !== undefined && !out.has(id)) out.set(id, entry);
    }
  };
  read(place['paragraphs']);
  if (part === 'sections') for (const subsection of list(place[SUBSECTIONS_FIELD])) if (isRecord(subsection)) read(subsection['paragraphs']);
  return out;
}

/** Whether a diagram's `home` names the walk's place. */
function homedAt(diagram: Doc, place: Doc, part: typeof PLACES[number]): boolean {
  const home = diagram['home'];
  return isRecord(home) && home['kind'] === (part === 'sections' ? 'section' : 'deep-dive') && typeof place['id'] === 'string' && home['target'] === place['id'];
}

/** The identities a string step may name in a figure: for a view, the elements of the model it selects; otherwise its nodes. A base element
 * is named by a base end, never by its fact identity. */
function drawnIdentities(doc: Doc, diagram: Doc): ReadonlySet<string> {
  if (isViewKind(diagram) && isRecord(diagram['view'])) {
    const elements = modelIndex(doc).elementById;
    return new Set(viewLists(diagram).elements.filter((id) => elements.has(id)));
  }
  return new Set(list(diagram['nodes']).flatMap((node) => (isRecord(node) && typeof node['id'] === 'string' ? [node['id']] : [])));
}

/** How a step's base end resolves in its figure: the fact identity of the one base element it names among those the figure shows; `absent`
 * where it names none of them (or the figure carries no base, or one of another map); `unestablished` where the figure's base map is not
 * established, so check reports nothing for the step's element. */
type BaseStep = { readonly state: 'shown'; readonly factId: string } | { readonly state: 'absent' } | { readonly state: 'unestablished' };
function baseStep(doc: Doc, diagram: Doc, element: Extract<StepElement, { kind: 'base' }>, maps: BaseMaps): BaseStep {
  const base = baseOf(doc, diagram);
  if (base === undefined || base.map !== element.map) return { state: 'absent' };
  const map = maps[base.map];
  if (map === undefined) return { state: 'unestablished' };
  const named = resolveBasePath(map, element.path);
  return named.length === 1 && shownOf(base, map).includes(named[0]!) ? { state: 'shown', factId: map.elements[named[0]!]!.factId } : { state: 'absent' };
}

/** The walk findings of a v16 draft (version 2.40), reported after every other finding: each walk in draft order, the sections' before the
 * deep dives', its findings in the stated order. `maps` are the base maps as check derived them, each absent where not established. No
 * detail carries a path a base end writes: such a step's element is named by its index. */
export function walkFindings(doc: Doc, maps: BaseMaps): CheckFinding[] {
  if (!hasWalkForm(doc['schemaVersion'])) return [];
  const out: CheckFinding[] = [];
  const diagrams = list(doc['diagrams']);
  for (const { place, part, at, walk } of walksOf(doc)) {
    const read = wellFormed(walk);
    if (read === undefined) { out.push({ kind: 'walk', at, detail: WALK_DETAIL.malformed }); continue; }
    const diagram = diagrams.find((entry): entry is Doc => isRecord(entry) && entry['id'] === read.figure);
    if (diagram === undefined) out.push({ kind: 'unresolved-reference', at: `${at}.figure`, detail: WALK_DETAIL.unresolved });
    else {
      if (!homedAt(diagram, place, part)) out.push({ kind: 'walk', at: `${at}.figure`, detail: WALK_DETAIL.home(read.figure) });
      if (!GRAPH_KINDS.has(diagram['kind'])) out.push({ kind: 'walk', at: `${at}.figure`, detail: WALK_DETAIL.kind(read.figure) });
    }
    const graph = diagram !== undefined && GRAPH_KINDS.has(diagram['kind']) ? diagram : undefined;
    const drawn = graph === undefined ? new Set<string>() : drawnIdentities(doc, graph);
    const paragraphs = paragraphsOf(place, part);
    const named = new Set<string>();
    read.steps.forEach((step, k) => {
      const stepAt = `${at}.steps[${k}]`;
      if (graph !== undefined) {
        const element = step.element;
        const resolved: { readonly key: string; readonly name: string } | 'absent' | 'skip' = element.kind === 'identity'
          ? (drawn.has(element.id) ? { key: `element:${element.id}`, name: element.id } : 'absent')
          : (() => { const found = baseStep(doc, graph, element, maps); return found.state === 'unestablished' ? 'skip' as const : found.state === 'absent' ? 'absent' as const
            : { key: `base:${found.factId}`, name: `\`walk.steps[${k}].element\`` }; })();
        if (resolved === 'absent') out.push({ kind: 'walk', at: `${stepAt}.element`, detail: WALK_DETAIL.element(k, read.figure) });
        else if (resolved !== 'skip') {
          if (named.has(resolved.key)) out.push({ kind: 'walk', at: `${stepAt}.element`, detail: WALK_DETAIL.repeated(resolved.name) });
          named.add(resolved.key);
        }
      }
      const block = paragraphs.get(step.block);
      if (block === undefined) out.push({ kind: 'walk', at: `${stepAt}.block`, detail: WALK_DETAIL.block(k) });
      else if (list(block['citations']).length === 0) out.push({ kind: 'walk', at: `${stepAt}.block`, detail: WALK_DETAIL.uncited(step.block) });
    });
  }
  return out;
}

/** Whether a section or deep dive renders the draft's content: its disposition is `produced`. */
const producedPlace = (place: Doc): boolean => isRecord(place['disposition']) && place['disposition']['kind'] === 'produced';

/** A v16 draft's walks at a render (version 2.40), by the identity of the figure each walks: each step's node in the figure as this render
 * draws it and its block, for a place whose content renders (its disposition `produced`). `bases` are the views' bases as this render resolved them, by diagram index. The draft passed check, so every
 * identity resolves; a base end is resolved again here, and a walk one of whose base ends names no base element the figure shows, or one an
 * earlier step names, is left out, so it renders nowhere. Empty for any other draft. */
export function walksAt(doc: Doc, bases: ReadonlyMap<number, ResolvedBase>): ReadonlyMap<string, readonly LocalWalkStep[]> {
  const out = new Map<string, readonly LocalWalkStep[]>();
  if (!hasWalkForm(doc['schemaVersion'])) return out;
  const diagrams = list(doc['diagrams']);
  for (const { place, walk } of walksOf(doc)) {
    // A place whose disposition is not `produced` renders none of the draft's content, so none of the paragraphs its steps link to: its
    // walk renders nowhere, wherever its figure is drawn (review R88, finding 1).
    if (!producedPlace(place)) continue;
    const read = wellFormed(walk);
    if (read === undefined) continue;
    const index = diagrams.findIndex((entry) => isRecord(entry) && entry['id'] === read.figure);
    const resolved = bases.get(index);
    const seen = new Set<string>();
    const steps: LocalWalkStep[] = [];
    for (const step of read.steps) {
      let node: string | undefined;
      if (step.element.kind === 'identity') node = step.element.id;
      else if (resolved !== undefined && resolved.spec.map === step.element.map) {
        const named = resolveBasePath(resolved.map, step.element.path);
        node = named.length === 1 && resolved.shown.includes(named[0]!) ? resolved.map.elements[named[0]!]!.factId : undefined;
      }
      if (node === undefined || seen.has(node)) { steps.length = 0; break; }
      seen.add(node);
      steps.push({ node, block: step.block });
    }
    if (steps.length > 0) out.set(read.figure, steps);
  }
  return out;
}

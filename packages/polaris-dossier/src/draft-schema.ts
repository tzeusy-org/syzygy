import { UNKNOWN_REASONS } from '@syzygy/cap1-core';
import {
  DIAGRAM_KINDS, FIGURE_KINDS, QUOTE_LEAD_IN, checkShape, choice, handle, list, object, one, ref, refs, text, type Schema, type SchemaError, type SchemaWithDefs,
} from '@syzygy/polaris-generation-core/live';
import { EXECUTION_SCOPES } from './execution-flags.js';
import { RELATION_TYPES, UNIT_TEXT_LIMIT } from './relation-witness.js';

/** The local-agent draft schema (REQ-polaris-generation-034; design "The local-agent draft schema").
 *
 * The provider pipeline's draft (title, introduction, sections, diagrams, deep dives, unresolved) with the design's three changes:
 * every claim cites `{path, startLine, endLine}` at the pinned revision instead of a source id; every claim block carries a label
 * (`inferred`, `unknown` with an RFC2-24 reason, or `non-normative`) and the citations its label requires; and four new top-level
 * parts, `understanding`, `discovery`, `clarifications` and `executions`. A claim resting on the agent's building or running of the
 * observed project is `inferred` with `basis: execution` and names the executions it rests on. There is no `observed` label anywhere:
 * an agent cannot label its own claim Observed, and Observed is reserved for a quotation Syzygy verifies.
 *
 * One schema is written per run, because it carries the run's pinned revision and its clarification-question limit; its version is
 * fixed here. The schema checks shape only. Unique identities, resolving references, quotations, paths and ranges at the pinned
 * revision, and the execution marking against the executions list are `check`'s, over the frozen revision. */

/** v2: an execution's `workingDirectory` is optional and it may state its `scope` (v1.1, N6). */
export const LOCAL_DRAFT_SCHEMA_VERSION_V2 = 'polaris-dossier-local-draft-v2';
/** v3: a section's or deep dive's `paragraphs` may also hold the rich elements of v1.3 (tables, callouts, steps, definitions, cards and
 * collapsible details; syzygy-mea.10.5). A v2 draft still checks: v3 only adds forms. */
export const LOCAL_DRAFT_SCHEMA_VERSION_V3 = 'polaris-dossier-local-draft-v3';
/** v4 (dossier spec v1.5): an Inferred block may carry `judgement: true`, and only so marked may it cite nothing; a list element (steps,
 * definitions or cards) may name, in `repeatsDiagram`, a diagram of its section that it repeats; and the draft may divide its sections
 * into `poles`, naming in `whySection` the section that answers why the project exists. A v2 or v3 draft still checks, and in one every
 * Inferred block still cites, since only v4 has the mark. */
export const LOCAL_DRAFT_SCHEMA_VERSION_V4 = 'polaris-dossier-local-draft-v4';
/** v5 (syzygy-3efd.18): a diagram names its page in `home` (a section, a deep dive or the overview) in place of `sectionId`, so a figure
 * can sit on a deep dive or on the first page a reader sees. Everything else is v4; a v4 or earlier draft still checks and renders as
 * before, with `sectionId`. */
export const LOCAL_DRAFT_SCHEMA_VERSION_V5 = 'polaris-dossier-local-draft-v5';
/** v6 (REQ-polaris-generation-034 version 2.4, syzygy-3efd.56): a required `thesisBasis` says what the introduction, the dossier's thesis,
 * rests on. Everything else is v5; a v5 or earlier draft still checks and renders as before, and a `thesisBasis` in one is field-version. */
export const LOCAL_DRAFT_SCHEMA_VERSION_V6 = 'polaris-dossier-local-draft-v6';
/** v7 (REQ-polaris-generation-034 version 2.5, syzygy-3efd.30): a diagram's `kind` may also be `sequence` (`participants` and `messages`)
 * or `swimlane` (`lanes` and `steps`), each in place of `nodes` and `edges`. Everything else is v6; a v6 or earlier draft still checks and
 * renders as before, and the new kinds and members in one are field-version. */
export const LOCAL_DRAFT_SCHEMA_VERSION_V7 = 'polaris-dossier-local-draft-v7';
/** v8 (REQ-polaris-generation-034 version 2.16, syzygy-3efd.50): a section may carry `subsections`, two to twelve, each a short title, a
 * one-sentence answer and its paragraphs. Everything else is v7; a v7 or earlier draft still checks and renders as before, and
 * `subsections` in one is field-version. */
export const LOCAL_DRAFT_SCHEMA_VERSION_V8 = 'polaris-dossier-local-draft-v8';
/** v9 (REQ-polaris-generation-034 version 2.19, syzygy-3efd.28): every edge of a graph diagram carries `relation`, one of the eleven
 * relation types, and a graph node may carry `unit`, one of the six unit forms. Everything else is v8; a v8 or earlier draft still checks and
 * renders as before, and `relation` or `unit` in one is field-version. */
export const LOCAL_DRAFT_SCHEMA_VERSION = 'polaris-dossier-local-draft-v9';
export const LOCAL_DRAFT_SCHEMA_VERSIONS = Object.freeze([LOCAL_DRAFT_SCHEMA_VERSION_V2, LOCAL_DRAFT_SCHEMA_VERSION_V3, LOCAL_DRAFT_SCHEMA_VERSION_V4, LOCAL_DRAFT_SCHEMA_VERSION_V5, LOCAL_DRAFT_SCHEMA_VERSION_V6, LOCAL_DRAFT_SCHEMA_VERSION_V7, LOCAL_DRAFT_SCHEMA_VERSION_V8, LOCAL_DRAFT_SCHEMA_VERSION] as const);
/** Whether a draft's version has the v4 forms: v4 and every later version. */
export const hasV4Forms = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION_V4 || hasHomeForm(version);
/** Whether a draft's version names a diagram's page in `home`: v5 and every later version. */
export const hasHomeForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION_V5 || hasThesisBasisForm(version);
/** Whether a draft's version carries the required `thesisBasis`: v6 and every later version. */
export const hasThesisBasisForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION_V6 || hasFigureKindForm(version);
/** Whether a draft's version has the figure kinds `sequence` and `swimlane`: v7 and every later version. */
export const hasFigureKindForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION_V7 || hasSubsectionForm(version);
/** Whether a draft's version lets a section carry `subsections`: v8 (version 2.16) and every later version. */
export const hasSubsectionForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION_V8 || hasRelationForm(version);
/** Whether a draft's graph edges carry `relation` and its graph nodes may carry `unit`: v9 (version 2.19). */
export const hasRelationForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION;
/** The members only a v9 graph diagram's edges and nodes carry, each a field-version finding in an earlier draft (version 2.19). */
export const RELATION_FIELD = 'relation';
export const UNIT_FIELD = 'unit';
/** The bounds of a v8 section's `subsections` and of one subsection's `paragraphs`. */
export const SUBSECTION_BOUNDS = Object.freeze({ subsections: [2, 12] as const, paragraphs: [0, 30] as const });
export const SUBSECTIONS_FIELD = 'subsections';
/** The members each diagram kind takes (v7): a graph kind `nodes` and `edges`, a sequence `participants` and `messages`, a swimlane
 * `lanes` and `steps`; every other diagram member is shared. */
export const FIGURE_MEMBERS = Object.freeze(['nodes', 'edges', 'participants', 'messages', 'lanes', 'steps'] as const);
export type FigureMember = typeof FIGURE_MEMBERS[number];
/** The members only a v7 draft's diagram may carry, each a field-version finding in an earlier draft. */
export const V7_FIGURE_MEMBERS = Object.freeze(['participants', 'messages', 'lanes', 'steps'] as const);
export const membersOfKind = (kind: unknown): readonly FigureMember[] | undefined => (kind === 'sequence' ? ['participants', 'messages']
  : kind === 'swimlane' ? ['lanes', 'steps'] : (DIAGRAM_KINDS as readonly unknown[]).includes(kind) ? ['nodes', 'edges'] : undefined);
/** The bounds of the v7 figure kinds' lists. */
export const FIGURE_BOUNDS: Readonly<Record<Exclude<FigureMember, 'nodes' | 'edges'>, readonly [number, number]>> = Object.freeze({
  participants: [2, 5], messages: [1, 30], lanes: [2, 5], steps: [2, 20],
});
/** What a v6 draft's introduction rests on. */
export const THESIS_BASES = Object.freeze(['stated', 'code-reading', 'none'] as const);
export type ThesisBasis = typeof THESIS_BASES[number];
/** The fields only a v4 or later draft may carry, each a finding in an earlier version. */
export const V4_FIELDS = Object.freeze(['judgement', 'repeatsDiagram', 'poles', 'whySection'] as const);
/** The draft schema versions before v5. `inventoryOmissions` (syzygy-5dhm.28, dossier spec 2.12) is a field of v5 and every later
 * version; in one of these it is a field-version finding. */
export const PRE_V5_SCHEMA_VERSIONS: readonly string[] = Object.freeze([LOCAL_DRAFT_SCHEMA_VERSION_V2, LOCAL_DRAFT_SCHEMA_VERSION_V3, LOCAL_DRAFT_SCHEMA_VERSION_V4]);
/** The first draft schema version that has `inventoryOmissions`. */
export const INVENTORY_OMISSIONS_SINCE = 'polaris-dossier-local-draft-v5';
/** The author's justified-omission record: what the schema says of it, and so what `draft.schema.json` tells the authoring session. */
export const INVENTORY_OMISSIONS_DESCRIPTION = 'Optional. Each entry records that this draft leaves out, on purpose, one entry of the independent inventory that `syzygy dossier check` listed as uncovered: `entryId` is the identifier check gave, and `reason` says in your own words why a reader of this dossier does not need it. An entry named here is not listed as uncovered again. The record is never rendered and claims nothing about the project; the fidelity reviewer reads it and still decides whether the omission is justified.';
/** The pages a v5 diagram may name as its home. */
export const DIAGRAM_HOME_KINDS = Object.freeze(['section', 'deep-dive', 'overview'] as const);
/** The tones a callout takes; each renders with its visible name. */
export const CALLOUT_TONES = Object.freeze(['note', 'tip', 'caution', 'important'] as const);

/** Task routes (the index-and-task-routes change): `taskRoutes`, an optional member of a v5 or later draft, holds the reader tasks the dossier
 * answers by a route. A draft that carries the member carries this many routes, each of this many steps. */
export const TASK_ROUTE_MIN = 8;
export const TASK_ROUTE_MAX = 15;
export const TASK_ROUTE_STEP_MAX = 8;
/** The pages of the dossier a route step may send its reader to. */
export const TASK_ROUTE_SEE_KINDS = Object.freeze(['section', 'deep-dive'] as const);
export const TASK_ROUTE_FIELD = 'taskRoutes';

/** The understanding record's items, in REQ-polaris-generation-002's order. */
export const UNDERSTANDING_ITEMS = Object.freeze([
  'purpose', 'beneficiary', 'proposition', 'capabilities', 'components', 'choices',
  'tradeOffs', 'limits', 'terminology', 'contradictions', 'openQuestions',
] as const);

export const CLARIFICATION_ANSWER_KINDS = Object.freeze(['free-text', 'selected-interpretation', 'leave-unknown', 'defer'] as const);

/** The schema form, written once in `@syzygy/polaris-generation-core`'s closed-schema module (syzygy-bpyt.8.5). */
export type DraftSchema = Schema;

/** The schema and the named definitions its `$ref`s point at. */
export type DraftSchemaWithDefs = SchemaWithDefs;

const COMMIT_IDENTIFIER = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
function requirePinnedRevision(pinnedRevision: string): void {
  if (!COMMIT_IDENTIFIER.test(pinnedRevision)) throw new Error('draft-schema: the pinned revision is not a commit identifier');
}

/** A schema as the JSON Schema document a brief or packet carries; `$defs` follows the root when there are any. */
function schemaDocument(version: string, title: string, { root, defs }: DraftSchemaWithDefs): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `urn:syzygy:polaris-dossier:${version}`,
    title: `${title} (${version})`,
    ...root,
    ...(Object.keys(defs).length > 0 ? { $defs: defs } : {}),
  };
}

/** A repository path as `git ls-tree` names it: relative, no NUL. Whether it names a blob is `check`'s. */
const repoPath: DraftSchema = { type: 'string', minLength: 1, maxLength: 1024, pattern: '^[^/\\u0000][^\\u0000]*$' };
const line: DraftSchema = { type: 'integer', minimum: 1, maximum: 10_000_000 };
const citations = (minItems: number): DraftSchema => list(ref('citation'), minItems, 50);
const reason = ref('unknownReason');
/** A short presentation label: a caption, column, title, term, card label or summary. */
const presentationLabel: DraftSchema = { type: 'string', minLength: 1, maxLength: 120 };
/** A unit's directory name, dependency name, job key or service key (v9). */
const unitText: DraftSchema = { type: 'string', minLength: 1, maxLength: UNIT_TEXT_LIMIT };

/** The one form a quotation takes, stated in a brief and in its schema's `quotations` description alike. `check` and `inventory-check`
 * count only this form; quoted text without the lead-in is the agent's prose. */
const quotationForm = (field: string, holder: string): string => `Write each quotation in ${holder}'s \`${field}\` with the lead-in and straight double quotes, exactly: ${QUOTE_LEAD_IN} "Each command runs to completion before the next one starts." The ${holder.replace(/^an? /u, '')}'s \`quotations\` names, in order, the citation each such quotation is taken from. Quoted text without the lead-in is your prose, not a quotation: Syzygy does not verify it and never renders it as Observed.`;
export const QUOTATION_FORM = quotationForm('text', 'a block');
export const INVENTORY_QUOTATION_FORM = quotationForm('statement', 'an entry');

/** A session's identifier, as that session declares it (REQ-polaris-generation-035): the draft, the inventory and each verdict carry
 * their own, and Syzygy compares them, never trusting any as observed. */
export const SESSION_ID_PATTERN = '^[A-Za-z0-9][A-Za-z0-9._:-]*$';
const sessionId: DraftSchema = { type: 'string', minLength: 1, maxLength: 200, pattern: SESSION_ID_PATTERN };
/** The brief's sentence on `sessionId`, for the draft and the inventory alike. */
export const SESSION_ID_RULE = (subject: 'draft' | 'inventory'): string => `Put this session's own identifier in \`sessionId\` (letters, digits and \`._:-\`, starting with a letter or digit): the identifier your agent tool gives this session, or, where it shows none, one you choose now and keep for every revision. ${subject === 'draft' ? 'The inventory and review sessions declare theirs, and Syzygy refuses one that equals yours' : 'Syzygy refuses an inventory whose identifier equals the authoring session\'s'}; every identifier is a session's own declaration, labelled Inferred.`;

const quotationRefs = (description: string): DraftSchema => ({ ...refs(0, 20), description });
const repeatsDiagram: DraftSchema = { ...handle, description: 'The id of a diagram in this list\'s own section that the list repeats in words; the list then renders collapsed under it. Omit it when the list adds what the diagram does not show.' };
const packetSha256: DraftSchema = { type: 'string', minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' };

/** The thesis basis (v6): the description the schema gives `thesisBasis`. */
export const THESIS_BASIS_DESCRIPTION = 'What the introduction, the dossier\'s thesis, rests on: stated (a statement of the project\'s purpose by its maintainers, which the introduction cites), code-reading (no source you found states the purpose; the introduction says what the code does, quotes nothing and cites at least two entry points) or none (the introduction is an unknown or non-normative block).';

const THESIS_BASIS: DraftSchema = { type: 'string', minLength: 1, maxLength: 12, enum: THESIS_BASES, description: THESIS_BASIS_DESCRIPTION };

/** The judgement mark (v4): the block is the authoring session's own assessment of the project and asserts no fact about it. */
export const JUDGEMENT_DESCRIPTION = 'Set true only on an Inferred block that is your own assessment of the project, such as that a design is sound or a trade-off is worth making, and asserts no fact about its rules, behaviour, structure, status, history or decisions. Only a block so marked may cite nothing; a fact with no citation is Unknown, never a judgement. A cited block may carry the mark too.';
const judgement: DraftSchema = { type: 'boolean', description: JUDGEMENT_DESCRIPTION };

/** The four claim forms. `quotations` lists, in order, the citation each `The project states: "…"` span in `text` is taken from. An
 * Inferred form's citations may be empty in the schema: whether it must cite (every version but v4, and in v4 any block without the
 * judgement mark) is `check`'s, which names the rule. */
function claimForms(extra: Record<string, DraftSchema>, optional: readonly string[]): DraftSchema {
  const quotations = quotationRefs(QUOTATION_FORM);
  return { oneOf: [
    object({ id: handle, label: one('inferred'), basis: one('source'), text, citations: citations(0), quotations, judgement, ...extra }, ['judgement', ...optional]),
    object({ id: handle, label: one('inferred'), basis: one('execution'), executionIds: refs(1, 20), text, citations: citations(0), quotations, judgement, ...extra }, ['judgement', ...optional]),
    object({ id: handle, label: one('unknown'), reason, text, citations: citations(0), ...extra }, optional),
    object({ id: handle, label: one('non-normative'), text, ...extra }, optional),
  ] };
}
// One level of nesting, as in the provider draft: the parent summarizes its children.
const disposition: DraftSchema = { oneOf: [
  object({ kind: one('produced'), assetIds: refs(1, 50) }),
  object({ kind: one('omitted'), reason: text, citations: citations(0) }),
  object({ kind: one('unresolved'), reason: text, citations: citations(0) }),
] };
const epistemic = choice(['inferred', 'unknown']);
const understandingItem: DraftSchema = { oneOf: [
  object({ id: handle, label: one('inferred'), statement: text, scope: text, citations: citations(1) }),
  object({ id: handle, label: one('unknown'), reason, statement: text, scope: text, citations: citations(0) }),
] };
const pathReason = object({ path: repoPath, reason: text });

/** Shared definitions, written once in the document and reached by `$ref`. */
const DEFS: Readonly<Record<string, DraftSchema>> = Object.freeze({
  citation: object({ id: handle, path: repoPath, startLine: line, endLine: line }),
  unknownReason: choice(UNKNOWN_REASONS),
  paragraph: claimForms({}, []),
  block: claimForms({ children: list(ref('paragraph'), 0, 12) }, []),
  // v1.3 rich elements. Their labels (caption, columns, title, term, label, summary) are presentation, never a claim or a quotation;
  // every text-bearing cell or item is a claim form, checked, reviewed and rendered as a block is.
  table: object({ kind: one('table'), id: handle, caption: presentationLabel, columns: list(presentationLabel, 1, 8), rowHeaders: { type: 'boolean' },
    rows: list(object({ id: handle, cells: list({ oneOf: [ref('paragraph'), object({ kind: one('empty') })] }, 1, 8) }), 1, 40) }),
  callout: object({ kind: one('callout'), id: handle, tone: choice(CALLOUT_TONES), title: presentationLabel, children: list(ref('block'), 1, 12) }),
  // A list may name, in `repeatsDiagram` (v4), a diagram of its own section that it repeats: it renders collapsed under it.
  steps: object({ kind: one('steps'), id: handle, items: list(ref('paragraph'), 2, 20), repeatsDiagram }, ['repeatsDiagram']),
  definitions: object({ kind: one('definitions'), id: handle, entries: list(object({ term: presentationLabel, definition: ref('paragraph') }), 1, 40), repeatsDiagram }, ['repeatsDiagram']),
  cards: object({ kind: one('cards'), id: handle, items: list(object({ label: presentationLabel, body: ref('paragraph') }), 2, 6), repeatsDiagram }, ['repeatsDiagram']),
  details: object({ kind: one('details'), id: handle, summary: presentationLabel, elements: list(ref('detailContent'), 1, 30) }),
  // A code excerpt names one citation of 1 to 60 lines; Syzygy renders the lines from its own read, never from the draft. `language` is
  // a presentation hint (v1.3 note 5): where it is absent the renderer derives one from the path.
  code: object({ kind: one('code'), id: handle, language: presentationLabel, citation: ref('citation') }, ['language']),
  detailContent: { oneOf: [ref('block'), ref('table'), ref('callout'), ref('steps'), ref('definitions'), ref('cards'), ref('code')] },
  content: { oneOf: [ref('block'), ref('table'), ref('callout'), ref('steps'), ref('definitions'), ref('cards'), ref('code'), ref('details')] },
  disposition,
  understandingItem,
  pathReason,
  // A route step (the index-and-task-routes change) is the cited Inferred claim form and nothing else: it names the file and lines to read or change, so a
  // step that cites nothing has no form here. `see` names the section or deep dive that explains the step; like a diagram's home, its
  // key is `target`, never `id`.
  routeStep: object({ id: handle, label: one('inferred'), basis: one('source'), text, citations: citations(1), quotations: quotationRefs(QUOTATION_FORM),
    see: object({ kind: choice(TASK_ROUTE_SEE_KINDS), target: handle }) }, ['see']),
  taskRoute: object({ id: handle, task: presentationLabel, steps: list(ref('routeStep'), 1, TASK_ROUTE_STEP_MAX) }),
  // A subsection (v8, version 2.16): a short title naming the question it answers, its answer in a paragraph form (whether that answer is
  // Inferred or Unknown and one sentence is `check`'s `subsection-answer` rule, which names it), and zero to thirty paragraphs.
  subsection: object({ id: handle, title: presentationLabel, answer: ref('paragraph'), paragraphs: list(ref('content'), ...SUBSECTION_BOUNDS.paragraphs) }),
  // A unit (v9, version 2.19): the one unit of the pinned repository a graph node stands for, by the keys the derived facts carry. A
  // directory name, name, job key or service key is 1 to 256 code units; the schema bounds code points, and `check` adds the code-unit bound.
  unit: { oneOf: [
    object({ kind: one('repository-root') }),
    object({ kind: one('top-level-directory'), path: unitText }),
    object({ kind: one('package-manifest'), path: repoPath }),
    object({ kind: one('dependency-name'), name: unitText }),
    object({ kind: one('workflow-job'), path: repoPath, job: unitText }),
    object({ kind: one('compose-service'), path: repoPath, service: unitText }),
  ] },
  // Share these shapes across the graph kinds so the issued draft schema fits
  // in the ordinary URL client's inline artifact result.
  relationNode: object({ id: handle, label: text, epistemic, citations: citations(1), unit: ref('unit') }, ['unit']),
  relationEdge: object({ id: handle, from: handle, to: handle, relation: choice(RELATION_TYPES), label: text, epistemic, citations: citations(1) }),
});

export interface DraftSchemaParameters {
  /** The run's pinned revision; the draft must name it. */
  readonly pinnedRevision: string;
  /** The declared clarification-question limit. */
  readonly maxQuestions: number;
}

/** The draft schema. `diagramForm` says how a diagram names its page: `home` (schema v5 and later, what the brief publishes) or
 * `sectionId` (schema v4 and earlier, which `check` applies to such a draft so that its findings stay byte for byte those of the version
 * before). `thesisBasis` says whether the draft carries its required `thesisBasis` (schema v6 and later) or has no such member (schema
 * v5 and earlier, whose findings stay those of the version before). `figureKinds` says whether a diagram may be a `sequence` or `swimlane`
 * with its own members (schema v7 and later; REQ-polaris-generation-034 version 2.5) or is a graph of `nodes` and `edges` only (schema v6
 * and earlier); `unnamed` is the form `check` reads a diagram naming no kind against. `subsections` says whether a section may carry
 * `subsections` (schema v8 and later; version 2.16) or has no such member (schema v7 and earlier). `relations` says whether a graph edge
 * carries its required `relation` and a graph node may carry `unit` (schema v9, what the brief publishes; version 2.19) or neither (schema
 * v8 and earlier). */
export function localDraftSchema(parameters: DraftSchemaParameters, diagramForm: 'home' | 'sectionId' = 'home', thesisBasis: 'required' | 'absent' = 'required',
  figureKinds: 'taken' | 'absent' | 'unnamed' = 'taken', subsections: 'taken' | 'absent' = 'taken', relations: 'taken' | 'absent' = 'taken'): DraftSchemaWithDefs {
  requirePinnedRevision(parameters.pinnedRevision);
  if (!Number.isSafeInteger(parameters.maxQuestions) || parameters.maxQuestions < 0) throw new Error('draft-schema: the question limit is not a nonnegative integer');
  const graph = (kind: Schema): Record<string, Schema> => ({
    // One of the two, by version: `sectionId` up to v4, `home` from v5 (the draft's structure also reports a home in the wrong form, and
    // names the version). A home names a section or a deep dive in `target`, or is the overview and names none. Not `id`: every `id` in
    // a draft is an identity of its own.
    id: handle, title: text,
    ...(diagramForm === 'home' ? { home: object({ kind: choice(DIAGRAM_HOME_KINDS), target: handle }, ['target']) } : { sectionId: handle }),
    kind, relationship: text,
    // v9 (version 2.19): a graph edge carries `relation`, one of the eleven relation types, and a graph node may carry `unit`.
    nodes: list(relations === 'taken'
      ? ref('relationNode')
      : object({ id: handle, label: text, epistemic, citations: citations(1) }), 1, 40),
    edges: list(relations === 'taken'
      ? ref('relationEdge')
      : object({ id: handle, from: handle, to: handle, label: text, epistemic, citations: citations(1) }), 1, 80),
    disposition: ref('disposition'),
  });
  // v7 (version 2.5): one form per kind, each naming its kind, so a graph diagram's faults are reported against the graph form exactly as
  // in v6 and a figure kind's against its own. A figure kind shares every member but `nodes` and `edges`, which its own members replace.
  const figure = (kind: 'sequence' | 'swimlane'): Schema => {
    const { nodes: _nodes, edges: _edges, disposition, ...shared } = graph(one(kind));
    const element = { id: handle, label: text, epistemic, citations: citations(1) };
    const own: Record<string, Schema> = kind === 'sequence'
      ? { participants: list(object(element), ...FIGURE_BOUNDS.participants), messages: list(object({ id: handle, from: handle, to: handle, label: text, epistemic, citations: citations(1) }), ...FIGURE_BOUNDS.messages) }
      : { lanes: list(object(element), ...FIGURE_BOUNDS.lanes), steps: list(object({ id: handle, lane: handle, label: text, epistemic, citations: citations(1) }), ...FIGURE_BOUNDS.steps) };
    return object({ ...shared, ...own, disposition: disposition! });
  };
  // 'unnamed' is never published: `check` reads a v7 diagram that names none of the eight kinds against it, the v6 graph form with
  // every v7 kind permitted, so that diagram's faults are each reported as v6 reports them (version 2.5).
  const diagram: Schema = figureKinds === 'absent' ? object(graph(choice(DIAGRAM_KINDS)))
    : figureKinds === 'unnamed' ? object(graph(choice([...DIAGRAM_KINDS, ...FIGURE_KINDS])))
    : { oneOf: [...DIAGRAM_KINDS.map((kind) => object(graph(one(kind)))), figure('sequence'), figure('swimlane')] };
  return { defs: DEFS, root: object({
    schemaVersion: choice(LOCAL_DRAFT_SCHEMA_VERSIONS),
    pinnedRevision: one(parameters.pinnedRevision),
    sessionId,
    title: text,
    introduction: ref('paragraph'),
    understanding: object(Object.fromEntries(UNDERSTANDING_ITEMS.map((item) => [item, list(ref('understandingItem'), 1, 100)]))),
    // A v8 section may carry `subsections` (version 2.16); in an earlier draft the member is a field-version finding (check-derive).
    sections: list(subsections === 'taken'
      ? object({ id: handle, title: text, paragraphs: list(ref('content'), 1, 30), [SUBSECTIONS_FIELD]: list(ref('subsection'), ...SUBSECTION_BOUNDS.subsections), disposition: ref('disposition') }, [SUBSECTIONS_FIELD])
      : object({ id: handle, title: text, paragraphs: list(ref('content'), 1, 30), disposition: ref('disposition') }), 1, 30),
    diagrams: list(diagram, 0, 20),
    deepDives: list(object({ id: handle, title: text, sectionId: handle, paragraphs: list(ref('content'), 1, 30), disposition: ref('disposition') }), 0, 30),
    unresolved: list(object({ id: handle, question: text, reason: text, citations: citations(0) }), 0, 100),
    discovery: object({
      inspected: list(repoPath, 0, 10_000),
      selected: list(ref('pathReason'), 0, 5_000),
      excluded: list(ref('pathReason'), 0, 5_000),
      // REQ-polaris-generation-036 names material the agent "could not resolve" beside what it excluded or deferred.
      unresolved: list(ref('pathReason'), 0, 5_000),
      deferred: list(ref('pathReason'), 0, 5_000),
      stoppingReason: text,
    }),
    clarifications: list(object({
      id: handle, question: text, evidence: citations(0), consequence: text, options: list(text, 0, 10),
      answer: text, answerKind: choice(CLARIFICATION_ANSWER_KINDS), attribution: one('operator'),
    }), 0, parameters.maxQuestions),
    // REQ-polaris-generation-033 (v1.1, N6): a command is admitted whether or not it carries its working directory and scope; where
    // execution was permitted, Syzygy flags one without them or outside the clone or scope (execution-flags.ts), and refuses nothing.
    executions: list(object({ id: handle, command: text, workingDirectory: text, scope: choice(EXECUTION_SCOPES), purpose: text }, ['workingDirectory', 'scope']), 0, 500),
    // Poles (v4, dossier spec v1.5): page boundaries that carry no claim, each a short label and its sections. The run's Pole limit, an
    // empty Pole and a section in no Pole or two are repair findings with their own wording, so the schema bounds only the shape.
    poles: list(object({ label: presentationLabel, sections: refs(0, 30) }), 1, 30),
    whySection: handle,
    ...(thesisBasis === 'required' ? { thesisBasis: THESIS_BASIS } : {}),
    // The justified-omission record (dossier spec 2.12): identifiers of inventory entries and the author's reasons, never a claim. Not
    // `id`: an `entryId` names an identity of the inventory, not one of this draft.
    inventoryOmissions: { ...list(object({ entryId: handle, reason: text }), 0, 2000), description: INVENTORY_OMISSIONS_DESCRIPTION },
    // Task routes (the index-and-task-routes change): reader tasks, each a short label phrased as the reader's task and a route of cited steps. In a draft
    // before v5 the member is a field-version finding (check-derive's structure).
    [TASK_ROUTE_FIELD]: list(ref('taskRoute'), TASK_ROUTE_MIN, TASK_ROUTE_MAX),
  }, ['poles', 'whySection', 'inventoryOmissions', TASK_ROUTE_FIELD]) };
}

/** The schema as the JSON Schema document written to `draft.schema.json`. The internal form already uses JSON Schema's keywords. */
export function draftSchemaDocument(parameters: DraftSchemaParameters): Record<string, unknown> {
  return schemaDocument(LOCAL_DRAFT_SCHEMA_VERSION, 'Polaris dossier local-agent draft', localDraftSchema(parameters));
}

/** The local-agent inventory schema (REQ-polaris-generation-035, 006). The inventory session prepares it from the clone without the
 * draft: entries of what the project states, in REQ-polaris-generation-006's kinds, each `inferred` with path and line-range citations
 * or `unknown` with an RFC2-24 reason, quotations in the one lead-in form, and its own account of what it covered. Syzygy checks its
 * quotations and citations as `check` checks a draft's; its completeness over the clone stays the session's self-report, Inferred. */
export const LOCAL_INVENTORY_SCHEMA_VERSION = 'polaris-dossier-local-inventory-v1';
export const INVENTORY_ENTRY_KINDS = Object.freeze(['purpose', 'beneficiary', 'thesis', 'capability', 'choice', 'term', 'qualification', 'conflict', 'other'] as const);

const INVENTORY_DEFS: Readonly<Record<string, DraftSchema>> = Object.freeze({
  citation: DEFS['citation']!,
  unknownReason: DEFS['unknownReason']!,
  pathReason,
  entry: { oneOf: [
    object({ id: handle, kind: choice(INVENTORY_ENTRY_KINDS), label: one('inferred'), statement: text, citations: citations(1),
      quotations: quotationRefs(INVENTORY_QUOTATION_FORM) }),
    object({ id: handle, kind: choice(INVENTORY_ENTRY_KINDS), label: one('unknown'), reason, statement: text, citations: citations(0) }),
  ] },
});

export function localInventorySchema(parameters: { readonly pinnedRevision: string }): DraftSchemaWithDefs {
  requirePinnedRevision(parameters.pinnedRevision);
  return { defs: INVENTORY_DEFS, root: object({
    schemaVersion: one(LOCAL_INVENTORY_SCHEMA_VERSION),
    pinnedRevision: one(parameters.pinnedRevision),
    sessionId,
    entries: list(ref('entry'), 1, 2000),
    coverage: object({
      inspected: list(repoPath, 0, 10_000),
      excluded: list(ref('pathReason'), 0, 5_000),
      deferred: list(ref('pathReason'), 0, 5_000),
      stoppingReason: text,
    }),
  }) };
}

/** The inventory schema as the JSON Schema document the inventory brief carries. */
export function inventorySchemaDocument(parameters: { readonly pinnedRevision: string }): Record<string, unknown> {
  return schemaDocument(LOCAL_INVENTORY_SCHEMA_VERSION, 'Polaris dossier local-agent inventory', localInventorySchema(parameters));
}

/** The local-agent fidelity verdict schema (REQ-polaris-generation-035, 006). The review session writes it from its packet alone: the
 * packet's digest, its own session identifier, coverage of every inventory entry by the draft, support of every claim block by the
 * packet's spans, the accuracy of every inventory entry against those spans, and every finding with its severity and its deficient
 * subject. A quotation in a `reason` or `message` takes the lead-in form and names, in `quotations`, the packet span it is taken from. */
export const LOCAL_FIDELITY_VERDICT_SCHEMA_VERSION_V1 = 'polaris-dossier-local-fidelity-verdict-v1';
/** v2 (dossier spec v1.5): a row may be `withheld`, for a withheld item or an inventory entry whose every cited span is withheld, or, in
 * `blockSupport`, `advisory`, for an uncited judgement block. Neither is an accuracy or support judgment, and neither blocks readiness.
 * A v1 verdict still validates; the values are the same rows' widened set. */
export const LOCAL_FIDELITY_VERDICT_SCHEMA_VERSION = 'polaris-dossier-local-fidelity-verdict-v2';
export const WITHHELD_ENTRY = 'withheld';
export const ADVISORY_ENTRY = 'advisory';
export const DEFICIENT_SUBJECTS = Object.freeze(['discovery', 'understanding', 'clarification', 'argument', 'prose', 'asset', 'rendering'] as const);
export const VERDICT_QUOTATION_FORM = `Write each quotation in a \`reason\` or \`message\` with the lead-in and straight double quotes, exactly: ${QUOTE_LEAD_IN} "Each command runs to completion before the next one starts." The row's \`quotations\` names, in order, the packet span each such quotation is taken from. Quoted text without the lead-in is your prose, not a quotation.`;

export function localVerdictSchema(parameters: { readonly pinnedRevision: string }): DraftSchemaWithDefs {
  requirePinnedRevision(parameters.pinnedRevision);
  const quotations = quotationRefs(VERDICT_QUOTATION_FORM);
  return { defs: {}, root: object({
    schemaVersion: choice([LOCAL_FIDELITY_VERDICT_SCHEMA_VERSION_V1, LOCAL_FIDELITY_VERDICT_SCHEMA_VERSION]),
    pinnedRevision: one(parameters.pinnedRevision),
    packetSha256,
    sessionId,
    inventoryCoverage: list(object({
      entryId: handle, disposition: choice(['represented', 'justified-omission', 'unsupported', 'unresolved', WITHHELD_ENTRY]), blockIds: refs(0, 5000), reason: text, quotations,
    }), 1, 5000),
    inventoryAccuracy: list(object({ entryId: handle, accuracy: choice(['accurate', 'inaccurate', 'unresolved', WITHHELD_ENTRY]), spanIds: refs(0, 200), reason: text, quotations }), 1, 5000),
    blockSupport: list(object({
      blockId: handle, verdict: choice(['supported', 'anchor-does-not-support', 'unresolved', WITHHELD_ENTRY, ADVISORY_ENTRY]), spanIds: refs(0, 200), reason: text, quotations,
    }), 1, 5000),
    findings: list(object({ severity: choice(['blocking', 'advisory']), subject: choice(DEFICIENT_SUBJECTS), target: handle, message: text, quotations }), 0, 1000),
    readiness: choice(['ready', 'not-ready']),
  }) };
}

/** The verdict schema as the JSON Schema document the fidelity packet carries. */
export function verdictSchemaDocument(parameters: { readonly pinnedRevision: string }): Record<string, unknown> {
  return schemaDocument(LOCAL_FIDELITY_VERDICT_SCHEMA_VERSION, 'Polaris dossier local-agent fidelity verdict', localVerdictSchema(parameters));
}

/** The local-agent rendered-design verdict schema (REQ-polaris-generation-035, 006). The design review session writes it from its packet
 * alone: the packet's digest, its own session identifier, a judgement of every HTML page of the render, and every finding with its
 * severity, its deficient subject and the page it concerns. It quotes nothing: no span of the design packet verifies a quotation. */
export const LOCAL_DESIGN_VERDICT_SCHEMA_VERSION = 'polaris-dossier-local-design-verdict-v1';
export const DESIGN_PAGE_VERDICTS = Object.freeze(['acceptable', 'deficient', 'unresolved'] as const);

export function localDesignVerdictSchema(parameters: { readonly pinnedRevision: string }): DraftSchemaWithDefs {
  requirePinnedRevision(parameters.pinnedRevision);
  return { defs: {}, root: object({
    schemaVersion: one(LOCAL_DESIGN_VERDICT_SCHEMA_VERSION),
    pinnedRevision: one(parameters.pinnedRevision),
    packetSha256,
    sessionId,
    pageReview: list(object({ page: repoPath, verdict: choice(DESIGN_PAGE_VERDICTS), reason: text }), 1, 20_000),
    findings: list(object({ severity: choice(['blocking', 'advisory']), subject: choice(DEFICIENT_SUBJECTS), page: repoPath, message: text }), 0, 1000),
    readiness: choice(['ready', 'not-ready']),
  }) };
}

/** The design verdict schema as the JSON Schema document the design packet carries. */
export function designVerdictSchemaDocument(parameters: { readonly pinnedRevision: string }): Record<string, unknown> {
  return schemaDocument(LOCAL_DESIGN_VERDICT_SCHEMA_VERSION, 'Polaris dossier local-agent rendered-design verdict', localDesignVerdictSchema(parameters));
}

export type DraftSchemaError = SchemaError;

/** Check a parsed draft against the schema; every error names the JSON path to repair. Only own, enumerable data properties of plain
 * objects and arrays count; a proxy, accessor or symbol key is refused. */
export const checkDraftShape: (schema: DraftSchemaWithDefs, value: unknown) => readonly DraftSchemaError[] = checkShape;

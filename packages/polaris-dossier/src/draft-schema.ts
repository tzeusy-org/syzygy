import { UNKNOWN_REASONS } from '@syzygy/cap1-core';
import {
  DIAGRAM_KINDS, QUOTE_LEAD_IN, checkShape, choice, handle, list, object, one, ref, refs, text, type Schema, type SchemaError, type SchemaWithDefs,
} from '@syzygy/polaris-generation-core/live';
import { EXECUTION_SCOPES } from './execution-flags.js';

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
export const LOCAL_DRAFT_SCHEMA_VERSION = 'polaris-dossier-local-draft-v2';

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
const packetSha256: DraftSchema = { type: 'string', minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' };

/** The four claim forms. `quotations` lists, in order, the citation each `The project states: "…"` span in `text` is taken from. */
function claimForms(extra: Record<string, DraftSchema>): DraftSchema {
  const quotations = quotationRefs(QUOTATION_FORM);
  return { oneOf: [
    object({ id: handle, label: one('inferred'), basis: one('source'), text, citations: citations(1), quotations, ...extra }),
    object({ id: handle, label: one('inferred'), basis: one('execution'), executionIds: refs(1, 20), text, citations: citations(1), quotations, ...extra }),
    object({ id: handle, label: one('unknown'), reason, text, citations: citations(0), ...extra }),
    object({ id: handle, label: one('non-normative'), text, ...extra }),
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
  paragraph: claimForms({}),
  block: claimForms({ children: list(ref('paragraph'), 0, 12) }),
  disposition,
  understandingItem,
  pathReason,
});

export interface DraftSchemaParameters {
  /** The run's pinned revision; the draft must name it. */
  readonly pinnedRevision: string;
  /** The declared clarification-question limit. */
  readonly maxQuestions: number;
}

export function localDraftSchema(parameters: DraftSchemaParameters): DraftSchemaWithDefs {
  requirePinnedRevision(parameters.pinnedRevision);
  if (!Number.isSafeInteger(parameters.maxQuestions) || parameters.maxQuestions < 0) throw new Error('draft-schema: the question limit is not a nonnegative integer');
  return { defs: DEFS, root: object({
    schemaVersion: one(LOCAL_DRAFT_SCHEMA_VERSION),
    pinnedRevision: one(parameters.pinnedRevision),
    sessionId,
    title: text,
    introduction: ref('paragraph'),
    understanding: object(Object.fromEntries(UNDERSTANDING_ITEMS.map((item) => [item, list(ref('understandingItem'), 1, 100)]))),
    sections: list(object({ id: handle, title: text, paragraphs: list(ref('block'), 1, 30), disposition: ref('disposition') }), 1, 30),
    diagrams: list(object({
      id: handle, title: text, sectionId: handle, kind: choice(DIAGRAM_KINDS), relationship: text,
      nodes: list(object({ id: handle, label: text, epistemic, citations: citations(1) }), 1, 40),
      edges: list(object({ id: handle, from: handle, to: handle, label: text, epistemic, citations: citations(1) }), 1, 80),
      disposition: ref('disposition'),
    }), 0, 20),
    deepDives: list(object({ id: handle, title: text, sectionId: handle, paragraphs: list(ref('block'), 1, 30), disposition: ref('disposition') }), 0, 30),
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
  }) };
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
export const LOCAL_FIDELITY_VERDICT_SCHEMA_VERSION = 'polaris-dossier-local-fidelity-verdict-v1';
export const DEFICIENT_SUBJECTS = Object.freeze(['discovery', 'understanding', 'clarification', 'argument', 'prose', 'asset', 'rendering'] as const);
export const VERDICT_QUOTATION_FORM = `Write each quotation in a \`reason\` or \`message\` with the lead-in and straight double quotes, exactly: ${QUOTE_LEAD_IN} "Each command runs to completion before the next one starts." The row's \`quotations\` names, in order, the packet span each such quotation is taken from. Quoted text without the lead-in is your prose, not a quotation.`;

export function localVerdictSchema(parameters: { readonly pinnedRevision: string }): DraftSchemaWithDefs {
  requirePinnedRevision(parameters.pinnedRevision);
  const quotations = quotationRefs(VERDICT_QUOTATION_FORM);
  return { defs: {}, root: object({
    schemaVersion: one(LOCAL_FIDELITY_VERDICT_SCHEMA_VERSION),
    pinnedRevision: one(parameters.pinnedRevision),
    packetSha256,
    sessionId,
    inventoryCoverage: list(object({
      entryId: handle, disposition: choice(['represented', 'justified-omission', 'unsupported', 'unresolved']), blockIds: refs(0, 5000), reason: text, quotations,
    }), 1, 5000),
    inventoryAccuracy: list(object({ entryId: handle, accuracy: choice(['accurate', 'inaccurate', 'unresolved']), spanIds: refs(0, 200), reason: text, quotations }), 1, 5000),
    blockSupport: list(object({
      blockId: handle, verdict: choice(['supported', 'anchor-does-not-support', 'unresolved']), spanIds: refs(0, 200), reason: text, quotations,
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

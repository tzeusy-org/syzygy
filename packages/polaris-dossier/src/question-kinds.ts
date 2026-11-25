import { isRecord } from '@syzygy/support';
import { collectBlocks } from './check-derive.js';
import { list, text } from './check-model.js';
import type { TreeFacts } from './derive.js';
import { QUESTION_KINDS, QUESTION_KINDS_FIELD, hasWorthKnowingForm, type QuestionKind } from './draft-schema.js';

/** The per-kind floor (syzygy-5dhm.135, pursuit 2026-11-21b move R29 slice 3; REQ-polaris-generation-034 version 2.32).
 *
 * The comprehension pilot asks a newcomer's questions of six kinds (purpose, structure, mechanism, rationale, change, limits), and its
 * newest dossier answered almost none of one kind ("where do I change this") while answering others well. This tells the author, at
 * check time, which kinds no block of the draft answers for each major unit of the repository, so a kind a reader will ask about is not
 * left out by accident. The kind a block answers is the author's own declaration, in the draft's top-level `questionKinds`; check counts
 * the declarations and judges none of them.
 *
 * A major unit is the repository as a whole, and each top-level directory of the pinned tree that holds at least one twentieth of the
 * tree's listed files, at most `MAJOR_UNIT_LIMIT` of them, from the facts of rule `top-level-unit` this check derived. A declared block
 * answers its kinds for the whole repository, and for each major directory one of its citations names a path inside.
 *
 * Advice, like `inventoryCoverageAdvice`: on `check`'s report only, never a finding, the outcome, the exit code or the stored check record.
 * A draft that declares no kind, one whose schema has no `questionKinds`, and a tree that could not be listed each give an Unknown advice
 * with the reason, never six missing kinds. */

export const QUESTION_KIND_RULE = Object.freeze({ id: 'question-kind-floor', version: 1 } as const);
export const MAJOR_UNIT_RULE = Object.freeze({ id: 'major-unit', version: 1 } as const);
/** A top-level directory is major when it holds at least one in this many of the tree's listed files. */
export const MAJOR_UNIT_SHARE = 20;
/** At most this many top-level directories are major units, the largest first. */
export const MAJOR_UNIT_LIMIT = 8;
/** The whole repository, always a major unit. */
export const WHOLE_REPOSITORY = '.';

export interface QuestionKindUnit {
  /** `.` for the whole repository, else a top-level directory's name as rule `top-level-unit` gives it. */
  readonly unit: string;
  /** The listed files the unit holds: for `.`, every listed file of the tree. */
  readonly files: number;
  /** For each kind, in `QUESTION_KINDS` order, how many counted blocks declare it for this unit. */
  readonly answered: Readonly<Record<QuestionKind, number>>;
  /** The kinds no counted block declares for this unit, in `QUESTION_KINDS` order. */
  readonly missing: readonly QuestionKind[];
}

export type QuestionKindAdvice =
  | { readonly state: 'unknown'; readonly why: string; readonly note: string }
  | {
    readonly state: 'compared';
    readonly rule: typeof QUESTION_KIND_RULE;
    readonly majorUnits: { readonly rule: typeof MAJOR_UNIT_RULE; readonly share: string; readonly limit: number; readonly unitsNotListed: number };
    readonly kinds: readonly QuestionKind[];
    readonly units: readonly QuestionKindUnit[];
    /** The draft's declarations: `rows`, the rows that name a block and at least one kind; `counted`, the distinct blocks they name that
     * are counted; `unmatched`, identifiers naming no claim block labelled Inferred, in first-mention order; `duplicated`, identifiers more
     * than one row names, in order of second mention (their kinds are joined). */
    readonly declarations: { readonly rows: number; readonly counted: number; readonly unmatched: readonly string[]; readonly duplicated: readonly string[] };
    readonly label: 'Inferred';
    readonly basis: string;
    readonly note: string;
  };

const KIND_SET: ReadonlySet<string> = new Set(QUESTION_KINDS);

const NOTE = `Advice: it sets no outcome and is not stored in the check record. For each major unit (the whole repository, and each top-level directory holding at least 1 in ${MAJOR_UNIT_SHARE} of the pinned tree's listed files, at most ${MAJOR_UNIT_LIMIT}, largest first), \`missing\` lists the kinds of newcomer question (purpose: what it is for; structure: how the parts fit; mechanism: how it works; rationale: why it is built this way; change: where to change something; limits: what it does not do and how it fails) that no block of this draft answers for that unit, by the draft's own \`${QUESTION_KINDS_FIELD}\`. A block counts when it is a claim block labelled Inferred, other than an understanding item, that \`${QUESTION_KINDS_FIELD}\` names by its \`id\`; it answers its kinds for the whole repository and for each major directory a path it cites is inside. A missing kind is a gap a reader will ask about: write a block that answers it, or leave it where the unit truly has nothing to say. Declare only what a block answers, never to fill a list: the kinds are your own report, labelled Inferred, and check judges none of them.`;
const UNKNOWN_NOTE = `Advice: it sets no outcome and is not stored in the check record. Which kinds of newcomer question this draft answers per major unit is Unknown at this check, never six missing kinds: declare in \`${QUESTION_KINDS_FIELD}\` the kinds each block answers, then check again.`;
const BASIS = `the authoring session's own declarations in the draft's \`${QUESTION_KINDS_FIELD}\`, counted by check; the units are derived from the pinned tree's listing`;

const unknown = (why: string): QuestionKindAdvice => ({ state: 'unknown', why, note: UNKNOWN_NOTE });

/** The major units of rule `major-unit` version 1 over the facts of rule `top-level-unit`: the whole repository, then each listed
 * top-level directory with at least 1 in `MAJOR_UNIT_SHARE` of the listed files, by files descending and then by code unit, at most
 * `MAJOR_UNIT_LIMIT`. The listed files leave out every path a secret detector matches, which rule `top-level-unit` names nowhere. */
export function majorUnits(facts: TreeFacts): readonly { readonly unit: string; readonly files: number }[] {
  const listed = facts.files - facts.secretPathsLeftOut;
  const directories = facts.facts.flatMap((fact) => (fact.fact === 'top-level-unit' && fact.files * MAJOR_UNIT_SHARE >= listed ? [{ unit: fact.path, files: fact.files }] : []))
    .sort((a, b) => b.files - a.files || (a.unit < b.unit ? -1 : a.unit > b.unit ? 1 : 0))
    .slice(0, MAJOR_UNIT_LIMIT);
  return [{ unit: WHOLE_REPOSITORY, files: listed }, ...directories];
}

/** The advice for one parsed draft. Pure; `facts` is undefined where this check could not list the pinned tree. */
export function questionKindAdvice(draft: unknown, facts: TreeFacts | undefined): QuestionKindAdvice {
  const doc: Readonly<Record<string, unknown>> = isRecord(draft) ? draft : {};
  if (!hasWorthKnowingForm(doc['schemaVersion'])) return unknown(`this draft's schema has no \`${QUESTION_KINDS_FIELD}\`; it is a member of draft schema polaris-dossier-local-draft-v13`);
  if (facts === undefined) return unknown('the pinned tree could not be listed, so its major units are not known');

  const declared = new Map<string, Set<QuestionKind>>();
  const duplicated: string[] = [];
  let rows = 0;
  for (const row of list(doc[QUESTION_KINDS_FIELD])) {
    if (!isRecord(row)) continue;
    const blockId = text(row['blockId']);
    const kinds = list(row['kinds']).filter((kind): kind is QuestionKind => typeof kind === 'string' && KIND_SET.has(kind));
    if (blockId === undefined || blockId === '' || kinds.length === 0) continue;
    rows++;
    const seen = declared.get(blockId);
    if (seen === undefined) declared.set(blockId, new Set(kinds));
    else {
      if (!duplicated.includes(blockId)) duplicated.push(blockId);
      for (const kind of kinds) seen.add(kind);
    }
  }
  if (rows === 0) return unknown(`the draft declares no question kind in \`${QUESTION_KINDS_FIELD}\`, so which kinds its blocks answer is not known`);

  const units = majorUnits(facts);
  const directories = new Set(units.slice(1).map((entry) => entry.unit));
  const counts = new Map(units.map((entry) => [entry.unit, new Map<QuestionKind, number>()]));
  const counted = new Set<string>();
  for (const block of collectBlocks(doc)) {
    if (block.textKey !== 'text' || block.value['label'] !== 'inferred') continue;
    const blockId = text(block.value['id']);
    const kinds = blockId === undefined ? undefined : declared.get(blockId);
    if (blockId === undefined || kinds === undefined || counted.has(blockId)) continue;
    counted.add(blockId);
    const reached = new Set([WHOLE_REPOSITORY]);
    for (const citation of list(block.value['citations'])) {
      const cited = isRecord(citation) ? text(citation['path']) : undefined;
      const slash = cited === undefined ? -1 : cited.indexOf('/');
      if (slash > 0 && directories.has(cited!.slice(0, slash))) reached.add(cited!.slice(0, slash));
    }
    for (const unit of reached) {
      const tally = counts.get(unit)!;
      for (const kind of kinds) tally.set(kind, (tally.get(kind) ?? 0) + 1);
    }
  }
  return {
    state: 'compared', rule: QUESTION_KIND_RULE,
    majorUnits: { rule: MAJOR_UNIT_RULE, share: `1/${MAJOR_UNIT_SHARE}`, limit: MAJOR_UNIT_LIMIT, unitsNotListed: facts.unitsNotListed },
    kinds: QUESTION_KINDS,
    units: units.map(({ unit, files }) => {
      const tally = counts.get(unit)!;
      const answered = Object.fromEntries(QUESTION_KINDS.map((kind) => [kind, tally.get(kind) ?? 0])) as Record<QuestionKind, number>;
      return { unit, files, answered, missing: QUESTION_KINDS.filter((kind) => answered[kind] === 0) };
    }),
    declarations: { rows, counted: counted.size, unmatched: [...declared.keys()].filter((blockId) => !counted.has(blockId)), duplicated },
    label: 'Inferred', basis: BASIS, note: NOTE,
  };
}

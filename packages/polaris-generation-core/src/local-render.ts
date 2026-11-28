import type { DossierDraft, DraftParagraph, EpistemicMarking } from './draft-model.js';

/**
 * What the multi-page dossier renderer takes for an operator-agent run
 * (REQ-polaris-generation-034, 036; design "Command surface", `render`).
 * Types only. `packages/polaris-dossier` derives every value at the render
 * step from objects it re-reads and re-hashes; the renderer lays them out,
 * escaped, in the human pages and the machine view alike, and decides no
 * label itself.
 */

/** The one named region of every page that a later render may change without retiring a rendered-design review. */
export const REVIEW_STATUS_REGION = 'review-status';
/** The region's opening tag, exactly as the renderer writes it. */
export const REVIEW_STATUS_REGION_OPEN = `<aside class="review-status" data-review-status-region="${REVIEW_STATUS_REGION}" aria-label="Review status">`;

/**
 * The page with its review-status region removed, or undefined unless the page
 * holds exactly one. The region's items are escaped text, so its first
 * `</aside>` closes it.
 */
export function withoutReviewStatusRegion(html: string): string | undefined {
  const start = html.indexOf(REVIEW_STATUS_REGION_OPEN);
  if (start === -1 || html.indexOf(REVIEW_STATUS_REGION_OPEN, start + 1) !== -1) return undefined;
  const close = html.indexOf('</aside>', start);
  if (close === -1) return undefined;
  return html.slice(0, start) + html.slice(close + '</aside>'.length);
}

/** RFC7-10's anchor of a quotation or a source page: an evidence artifact identifier with integrity digest. */
export interface EvidenceAnchor {
  readonly targetClass: 'evidence-artifact-identifier-with-integrity-digest';
  /** The blob's object identifier as Syzygy recomputed it from the bytes it read: the owning identifier and the integrity digest at once. */
  readonly identifier: string;
  /** The hash algorithm the consented revision's identifier is written in. */
  readonly algorithm: 'sha1' | 'sha256';
  /** The span's UTF-8 byte range in the blob, `[start, end)`; null for the whole blob. */
  readonly fragment: { readonly start: number; readonly end: number } | null;
  /** The pinned revision. */
  readonly targetState: string;
  /** The repository path, shown beside the anchor as a label, never as its identity. */
  readonly pathLabel: string;
}

export type LocalSegment =
  | { readonly kind: 'prose'; readonly text: string }
  /** A quotation Syzygy located at this render in a blob it read and verified: Syzygy's own bytes, never the agent's copy. `sourceId`
   * names the source (or piece) the span starts in; `start` and `end` are UTF-8 byte offsets into the whole blob. */
  | { readonly kind: 'quotation'; readonly sourceId: string; readonly start: number; readonly end: number; readonly text: string; readonly anchor: EvidenceAnchor }
  /** A quotation from a blob screening excluded: not verified, and none of its text is shown. */
  | { readonly kind: 'withheld'; readonly reason: 'excluded-content' };

/** One claim block of the draft as it renders: its marking, decided by the caller, and its text as segments. */
export interface LocalBlock {
  readonly marking: EpistemicMarking | 'non-normative';
  /** The RFC2-24 reason of an Unknown block; null otherwise. */
  readonly unknownReason: string | null;
  /** Why the block carries its marking. */
  readonly basis: string;
  readonly segments: readonly LocalSegment[];
  /** The commands a claim resting on execution names, as the agent reported them (Inferred, self-reported). */
  readonly executions: readonly { readonly id: string; readonly command: string }[];
  /** Dossier spec v1.5: `uncited` for an Inferred block the draft marks as a judgement and that cites nothing, `cited` for a marked block
   * that cites; absent for an unmarked block. */
  readonly judgement?: 'uncited' | 'cited';
  /** A withheld item (v1.5): every span it cites, or a span it quotes, is withheld. Its segments are Syzygy's words, never the agent's. */
  readonly withheld?: WithheldNote;
  /** A block citing both admitted and withheld spans, not a withheld item: how many of its cited spans are withheld. */
  readonly withheldSpans?: number;
  /** A secret detector matches the block's own text (the index-and-task-routes change): its segments are Syzygy's words, it names
   * nothing in the generated index, and a route step that is one shows no file and no dossier link. */
  readonly secretMatched?: true;
}

/** The spans a text writes between two backticks on one line, in order: the one pairing rule the generated index and its secret
 * screening share. Callers pass one prose segment at a time, so a backtick never pairs across a quotation. */
export function backtickSpans(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/`([^`\n]+)`/gu)) out.push(match[1]!);
  return out;
}

/** What Syzygy says of a withheld item: how many withheld sources it rests on, and those it may name. A path a secret detector matches is
 * counted and never named. */
export interface WithheldNote {
  readonly sources: number;
  readonly named: readonly string[];
}

/** Dossier spec v1.5's counts, disclosed in the appendix and the machine form. `null` where the count rests on a record that does not
 * count at this render (the withheld inventory entries, while no fidelity review counts). */
export interface LocalCounts {
  readonly uncitedJudgements: number;
  readonly withheldItems: number;
  readonly withheldExcerpts: number;
  readonly withheldInventoryEntries: number | null;
}

/** A line of the run disclosure or of the review-status region, with the label its content carries (null for a plain statement of
 * what Syzygy did or did not do). */
export interface LocalDisclosureItem {
  readonly id: string;
  readonly text: string;
  readonly label: 'Observed' | 'Inferred' | 'Unknown' | null;
}

/** A labelled record on one of the run's own pages (understanding, discovery, clarifications, executions, review). Its `id` carries a
 * `/`, so it never equals a draft block's. */
export interface LocalPageItem {
  readonly id: string;
  readonly marking: EpistemicMarking;
  readonly unknownReason: string | null;
  readonly title: string | null;
  readonly text: string;
  readonly details: readonly string[];
  /** Sources with a page that the item cites. */
  readonly sourceIds: readonly string[];
}

export interface LocalPageGroup {
  readonly id: string;
  readonly heading: string;
  /** What the group is and how it is labelled, stated above it. */
  readonly note: string;
  readonly items: readonly LocalPageItem[];
  /** Shown when the group holds no item. */
  readonly empty: string;
}

export interface LocalPage {
  /** A `isDossierPagePath` at depth 1 (one segment). */
  readonly path: string;
  readonly title: string;
  readonly intro: string;
  readonly groups: readonly LocalPageGroup[];
}

/** RFC7-20 as the owner's reading applies it to an operator-computed draft: the editorial-draft state only while every condition holds. */
export type LocalDraftLayer =
  | {
    readonly state: 'editorial-draft';
    /** The in-force record of the owner's reading the run relies on. */
    readonly ruling?: string;
    /** The generated prose's inference provenance: the operator-declared model identity and version. */
    readonly inferenceProvenance: { readonly provider?: string; readonly modelIdentity: string; readonly modelVersion: string | null; readonly declaredBy: 'operator'; readonly label: 'Inferred' };
  }
  | { readonly state: 'unknown'; readonly reason: 'unconsented-source-or-provider' | 'missing-declaration'; readonly why: readonly string[] };

/** One derived structural fact as a render reads it from the kept record (REQ-polaris-generation-034 version 2.3), with the currency
 * outcome the render decided: Observed only while the bound declared for its rule and version holds. */
export interface LocalDerivedFact {
  readonly id: string;
  readonly fact: 'tree-root' | 'top-level-unit' | 'contains';
  readonly rule: string;
  readonly ruleVersion: number;
  /** `.` for the root; a directory's raw first path segment otherwise. */
  readonly path: string;
  /** Files at the root (`tree-root`) or under the directory (`top-level-unit`); null for `contains`. */
  readonly count: number | null;
  /** A containment's target fact; null for any other fact. */
  readonly to: string | null;
  readonly epistemic: 'observed' | 'unknown';
  readonly unknownReason: null | 'no-currency-bound-declared' | 'stale-beyond-currency-bound';
}

/** The derived-structure region of the landing page and its record, as the render decided them. */
export type LocalDerivedStructure =
  | {
    readonly state: 'derived';
    /** The render's pinned revision. */
    readonly revision: string;
    /** The record's own revision and capture instant: the figure's snapshot and as-of instant. */
    readonly recordRevision: string;
    readonly capturedAt: string;
    /** The kept record's exact text, published unchanged as `derived-structure.json`, and the SHA-256 of its bytes. */
    readonly recordText: string;
    readonly sha256: string;
    readonly currencyPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string } | null;
    readonly facts: readonly LocalDerivedFact[];
    readonly unitsNotListed: number;
    /** The render's own re-derivation of the tree (version 2.9), never the record's counts: what the directory map's coverage line counts. */
    readonly tree: LocalTreeCounts;
    /** Whether the record's `files`, `secretPathsLeftOut` and `submodules` each equal the re-derivation's (version 2.9). */
    readonly countsMatch: boolean;
  }
  | {
    /** `missing`: nothing stands at the draft revision's derived-record path; `unusable` (version 2.10): something does that is no
     * readable record, or the path cannot be examined; `unknown`: the record states it, or the render cannot list the tree. */
    readonly state: 'missing' | 'unusable' | 'unknown';
    readonly revision: string;
    readonly unknownReason: 'missing-evidence' | 'source-uncaptured-or-unreachable';
  };

/** The counts a render re-derives from the tree it lists (version 2.9): blob entries (`files`), files at the root, the listed top-level
 * directories and the files under them, the directories counted and not listed, secret-matching paths and submodules. */
export interface LocalTreeCounts {
  readonly files: number;
  readonly rootFiles: number;
  readonly unitsListed: number;
  readonly unitFiles: number;
  readonly unitsNotListed: number;
  readonly secretPathsLeftOut: number;
  readonly submodules: number;
}

/** The declared manifest facts a render derives itself (REQ-polaris-generation-034 versions 2.7 and 2.9 and the infrastructure recognizers), in the shape
 * `packages/polaris-dossier`'s `deriveManifestFacts` gives them; never read from a stored check record. */
export interface LocalManifestFileEntry {
  readonly path: string;
  readonly epistemic: 'inferred' | 'unknown';
  readonly unknownReason: string | null;
  readonly parseFault: string | null;
  readonly facts: number | null;
  readonly valuesLeftOut: number | null;
}
export interface LocalManifestRecognizerEntry {
  readonly rule: string;
  readonly ruleVersion: number;
  readonly label: 'inferred';
  readonly candidates: number;
  readonly secretPathsLeftOut: number;
  readonly setApart: number;
  readonly inferred: number;
  readonly unknown: number;
  readonly valuesLeftOut: number;
  readonly facts: number;
  readonly files: readonly LocalManifestFileEntry[];
  readonly filesNotListed: number;
}
export interface LocalManifestFact {
  readonly id: string;
  readonly fact: string;
  readonly rule: string;
  readonly ruleVersion: number;
  readonly path: string;
  readonly lines: readonly [number, number];
  readonly epistemic: 'inferred';
  readonly [member: string]: unknown;
}
/** The member's coverage remainder (infrastructure recognizers): the blob entries no recognizer names as a candidate, by place. */
export interface LocalManifestRemainder {
  readonly files: number;
  readonly secretPathsLeftOut: number;
  readonly candidates: number;
  readonly notCandidates: number;
  readonly places: readonly { readonly place: string | null; readonly files: number; readonly notCandidates: number }[];
  readonly placesNotListed: number;
  readonly filesInPlacesNotListed: number;
  readonly notCandidatesInPlacesNotListed: number;
}
export type LocalManifestFacts =
  | {
    readonly format: string;
    readonly state: 'derived';
    readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
    readonly recognizers: readonly LocalManifestRecognizerEntry[];
    readonly facts: readonly LocalManifestFact[];
    readonly factsNotListed: number;
    readonly remainder: LocalManifestRemainder;
  }
  | { readonly format: string; readonly state: 'unknown'; readonly why: string };

/** The declared test names this render derived itself (REQ-polaris-generation-034 version 2.42): four lexical recognizers' names in the
 * admitted test files of the pinned tree, each Inferred, mapped to its unit by rule `top-level-unit`. */
export interface LocalTestNamesFile {
  readonly path: string;
  readonly epistemic: 'inferred' | 'unknown';
  readonly unknownReason: string | null;
  readonly parseFault: string | null;
  readonly names: number | null;
  readonly valuesLeftOut: number | null;
}
export interface LocalTestNamesRecognizer {
  readonly rule: string;
  readonly ruleVersion: number;
  readonly label: 'inferred';
  readonly candidates: number;
  readonly secretPathsLeftOut: number;
  readonly setApart: number;
  readonly inferred: number;
  readonly unknown: number;
  readonly valuesLeftOut: number;
  readonly names: number;
  readonly files: readonly LocalTestNamesFile[];
  readonly filesNotListed: number;
}
export interface LocalTestName {
  readonly id: string;
  readonly name: string;
  readonly kind: 'test' | 'suite';
  readonly rule: string;
  readonly ruleVersion: number;
  readonly path: string;
  readonly line: number;
  readonly unit: string | null;
  readonly epistemic: 'inferred';
}
export type LocalTestNames =
  | {
    readonly format: string;
    readonly state: 'derived';
    readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
    readonly unitRule: { readonly rule: string; readonly ruleVersion: number };
    readonly recognizers: readonly LocalTestNamesRecognizer[];
    readonly units: readonly { readonly unit: string | null; readonly files: number; readonly names: number; readonly byRule: Readonly<Record<string, number>> }[];
    readonly unitsNotListed: number;
    readonly names: readonly LocalTestName[];
    readonly namesNotListed: number;
  }
  | { readonly format: string; readonly state: 'unknown'; readonly why: string };
/** The rough-edge markers this render derived itself (REQ-polaris-generation-034 version 2.43): recognizer `rough-edge-marker` v1's
 * TODO, FIXME, HACK, deprecation and issue-reference markers in the admitted source files of the pinned tree, each Observed with its quoted
 * line, mapped to its unit by rule `top-level-unit`. */
export interface LocalRoughEdgesFile {
  readonly path: string;
  readonly epistemic: 'observed' | 'unknown';
  readonly unknownReason: string | null;
  readonly parseFault: string | null;
  readonly markers: number | null;
  readonly valuesLeftOut: number | null;
}
export interface LocalRoughEdgesRecognizer {
  readonly rule: string;
  readonly ruleVersion: number;
  readonly label: 'observed';
  readonly candidates: number;
  readonly secretPathsLeftOut: number;
  readonly setApart: number;
  readonly observed: number;
  readonly unknown: number;
  readonly valuesLeftOut: number;
  readonly markers: number;
  readonly files: readonly LocalRoughEdgesFile[];
  readonly filesNotListed: number;
}
export interface LocalRoughEdgeMarker {
  readonly id: string;
  readonly kind: 'todo' | 'fixme' | 'hack' | 'deprecation' | 'issue-reference';
  readonly marker: string;
  readonly path: string;
  readonly line: number;
  readonly unit: string | null;
  readonly blob: string;
  readonly quote: string;
  readonly epistemic: 'observed';
  readonly referenceContent: 'unknown' | null;
}
export type LocalRoughEdges =
  | {
    readonly format: string;
    readonly state: 'derived';
    readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
    readonly unitRule: { readonly rule: string; readonly ruleVersion: number };
    readonly recognizer: LocalRoughEdgesRecognizer;
    readonly units: readonly { readonly unit: string | null; readonly files: number; readonly markers: number; readonly byKind: Readonly<Record<string, number>> }[];
    readonly unitsNotListed: number;
    readonly markers: readonly LocalRoughEdgeMarker[];
    readonly markersNotListed: number;
  }
  | { readonly format: string; readonly state: 'unknown'; readonly why: string };
/** The documents' paths and identifiers this render resolved itself (REQ-polaris-generation-034 version 2.48): recognizer `doc-reference`
 * v1's rows, each `resolves`, `document-only` or `unknown`, from the admitted Markdown documents of the pinned tree. */
export interface LocalDocsFile {
  readonly path: string;
  readonly epistemic: 'observed' | 'unknown';
  readonly unknownReason: string | null;
  readonly parseFault: string | null;
  readonly resolves: number | null;
  readonly documentOnly: number | null;
  readonly unknown: number | null;
  readonly valuesLeftOut: number | null;
}
export interface LocalDocsPopulation {
  readonly candidates: number;
  readonly secretPathsLeftOut: number;
  readonly setApart: number;
  readonly observed: number;
  readonly unknown: number;
  readonly files: readonly LocalDocsFile[];
  readonly filesNotListed: number;
}
export interface LocalDocRow {
  readonly id: string;
  readonly document: string;
  readonly line: number;
  readonly quote: string;
  readonly quoteExcerpt: boolean;
  readonly written: 'code-span' | 'link';
  readonly value: string;
  readonly form: 'path' | 'identifier';
  readonly outcome: 'resolves' | 'document-only' | 'unknown';
  readonly epistemic: 'observed' | 'unknown';
  readonly unknownReason: string | null;
  readonly resolution:
    | { readonly entry: 'file' | 'directory'; readonly path: string }
    | { readonly entry: 'identifier'; readonly path: string; readonly line: number; readonly blob: string; readonly searched: 'code-text' | 'comment-or-string' | 'file-text' }
    | null;
}
export type LocalDocsAndCode =
  | {
    readonly format: string;
    readonly state: 'derived';
    readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
    readonly rule: { readonly rule: string; readonly ruleVersion: number };
    readonly documents: LocalDocsPopulation & { readonly spansNotChecked: number; readonly linksNotChecked: number; readonly valuesLeftOut: number };
    readonly code: LocalDocsPopulation & { readonly read: boolean };
    readonly counts: { readonly resolves: number; readonly documentOnly: number; readonly unknown: number };
    readonly rows: readonly LocalDocRow[];
    readonly rowsNotListed: number;
  }
  | { readonly format: string; readonly state: 'unknown'; readonly why: string };
/** A schema-v12 draft's model (version 2.24): identities, types, parents, bases and the views (diagram ids, in diagram order) selecting
 * each. Labels, marks and citations stay in the expanded figures' claims. */
export interface LocalModel {
  readonly elements: readonly { readonly id: string; readonly type: string; readonly parent: string | null; readonly views: readonly string[] }[];
  readonly relationships: readonly {
    /** A base end (schema v15) names the fact identity it resolves to in the map the render derives, or null where that map is not
     * established at the render or the path names no one element of it. */
    readonly id: string; readonly from: string | null; readonly to: string | null; readonly relation: string; readonly basis: 'cited' | 'derived'; readonly views: readonly string[];
  }[];
}

/** One schema-v9 graph edge's relation and witness state at a render (version 2.19). `witness` is the machine form. A witnessed edge alone
 * names its fact, rule and version and carries `evidence`: Syzygy's words for the relation, the witnessing fact's kind, and the revision and
 * digest of the record it is a fact of; every other edge carries nulls there and no `evidence`. */
export type LocalEdgeRelation =
  | {
    readonly relation: string;
    readonly witness: { readonly state: 'witnessed'; readonly reason: null; readonly fact: string; readonly rule: string; readonly ruleVersion: number };
    readonly evidence: { readonly words: string; readonly factKind: string; readonly revision: string; readonly recordSha256: string };
  }
  | {
    readonly relation: string;
    readonly witness: { readonly state: 'challenged' | 'unknown'; readonly reason: string | null; readonly fact: null; readonly rule: null; readonly ruleVersion: null };
    readonly evidence?: undefined;
  };

/** One base element a view shows (version 2.35), in Syzygy's words: its fact identity, the path the render resolves it to, its box label,
 * its name, and its fact's mark. */
export interface LocalBaseElement {
  readonly factId: string;
  readonly path: string;
  readonly label: string;
  readonly name: string;
  readonly epistemic: 'observed' | 'inferred' | 'unknown';
  readonly unknownReason: string | null;
  /** For a top-level directory: the record's `contains` fact joining the root to it, its identity and mark; null otherwise. */
  readonly contains: { readonly factId: string; readonly epistemic: 'observed' | 'inferred' | 'unknown' } | null;
}
/** A display name the draft gives a shown base element (version 2.35): a claim of the draft, its identity `<diagram>:name:<k>`. */
export interface LocalBaseName {
  readonly id: string;
  readonly factId: string;
  readonly path: string;
  readonly label: string;
  readonly epistemic: 'inferred' | 'unknown';
  readonly sourceIds: readonly string[];
}
/** What one `hide` entry, or `select`'s `restReason`, leaves out: the count, the names in Syzygy's words in the map's order, whether the
 * repository root is among them, the resolved paths and the screened reason. */
export interface LocalBaseLeftOut { readonly count: number; readonly names: readonly string[]; readonly root: boolean; readonly paths: readonly string[]; readonly reason: string }
/** A view's base at a render (version 2.35): drawn from an established map; Unknown where the map is not established; or not resolving
 * against the map at this render where check could not read it. */
export type LocalBase =
  | {
    readonly state: 'drawn';
    readonly map: 'directories' | 'units';
    /** The shown base elements, in the map's order. */
    readonly elements: readonly LocalBaseElement[];
    readonly shown: number;
    readonly total: number;
    readonly root: 'shown' | 'hidden' | null;
    readonly notListed: { readonly directories: number; readonly secretPathsLeftOut: number; readonly submodules: number }
      | { readonly facts: number; readonly unknownFiles: number; readonly secretPathsLeftOut: number };
    /** The shown elements' paths where the view selects, else null. */
    readonly select: readonly string[] | null;
    readonly restReason: LocalBaseLeftOut | null;
    readonly hides: readonly LocalBaseLeftOut[];
    readonly names: readonly LocalBaseName[];
  }
  /** The map is not established at this render: the figure is the map's own Unknown, read from `derivedStructure` or `manifestFacts`. */
  | { readonly state: 'unknown'; readonly map: 'directories' | 'units' }
  | { readonly state: 'unresolved'; readonly map: 'directories' | 'units' };

export interface LocalRenderInput {
  /** The checked draft in the renderer's shape. `sourceIds` name only sources Syzygy read and screening admitted, and may be empty. No
   * part of it renders while the draft layer is Unknown. */
  readonly draft: DossierDraft;
  /** The dossier's title while the draft layer is Unknown, when the draft's own title is draft content and is not shown. */
  readonly withheldTitle: string;
  readonly draftLayer: LocalDraftLayer;
  /** Every claim block of the draft (introduction, section and deep-dive paragraphs and children), by id. */
  readonly blocks: ReadonlyMap<string, LocalBlock>;
  /** The glossary: the understanding record's terminology. */
  readonly glossary: readonly LocalPageItem[];
  /** The run disclosure, on every page and in the machine view. */
  readonly disclosure: readonly LocalDisclosureItem[];
  /** The RFC7-10 anchor of each source page, by source id. */
  readonly sourceAnchors: ReadonlyMap<string, EvidenceAnchor>;
  readonly pages: readonly LocalPage[];
  /** The one named review-status region of every page: the only part a later render may change without retiring a rendered-design review. */
  readonly reviewStatus: readonly LocalDisclosureItem[];
  /** Diagram nodes and edges, and understanding items, that are withheld items (v1.5), by claim id; blocks carry their own note. */
  readonly withheldElements?: ReadonlyMap<string, WithheldNote>;
  readonly counts?: LocalCounts;
  /** The cited lines behind each citation mark, by claim id, then source id: shown on the mark's hover and focus (v1.5). */
  readonly citationLines?: ReadonlyMap<string, ReadonlyMap<string, readonly { readonly start: number; readonly end: number }[]>>;
  /** The operator-declared agent tool and model, named in the one sentence every page carries (v1.5). */
  readonly authoring?: { readonly tool: string; readonly model: string };
  /** The agent's own reasons for selecting each path, by repository path, as its discovery record reports them: self-reported and
   * Inferred. Shown beside the source of that path on the sources index. */
  readonly selectionReasons?: ReadonlyMap<string, string>;
  /** A schema-v4 draft's Poles (dossier spec v1.5): page boundaries that carry no claim, each a short label and its sections in order,
   * with the section that answers why the project exists. Absent when the draft declares none: its sections then stay on one page. */
  readonly poles?: { readonly whySection: string; readonly poles: readonly { readonly label: string; readonly sections: readonly string[] }[] };
  /** The structure Syzygy derived from the pinned tree (version 2.3): drawn in its own region at the end of the landing page, published
   * as `derived-structure.json` and named in the machine view. Absent only for an input built by hand; `syzygy dossier render` always
   * supplies it. */
  readonly derivedStructure?: LocalDerivedStructure;
  /** The declared manifest facts this render derived itself (version 2.9), from which the unit map and the CI pipeline map are drawn. The
   * three computed map pages render only where this and `derivedStructure` are both present; `syzygy dossier render` always supplies both. */
  readonly manifestFacts?: LocalManifestFacts;
  /** The declared test names this render derived itself (version 2.42), from which the test-names reference page is drawn. The page
   * renders only where this and `derivedStructure` are both present, so an input without it keeps its pages and machine view. */
  readonly testNames?: LocalTestNames;
  /** The rough-edge markers this render derived itself (version 2.43), from which the rough-edges reference page is drawn. The page renders
   * only where this and `derivedStructure` are both present, so an input without it keeps its pages and machine view. */
  readonly roughEdges?: LocalRoughEdges;
  /** The documents' paths and identifiers this render resolved itself (version 2.48), from which the docs-and-code reference page is drawn.
   * The page renders only where this and `derivedStructure` are both present, so an input without it keeps its pages and machine view. */
  readonly docsAndCode?: LocalDocsAndCode;
  /** A schema-v9 draft's graph edges (REQ-polaris-generation-034 version 2.19), by edge id: each edge's relation and the witness state rule
   * `relation-witness` gives it at this render. Absent for every earlier draft, so its pages and machine view keep their bytes. */
  readonly edgeRelations?: ReadonlyMap<string, LocalEdgeRelation>;
  /** A schema-v12 draft's system model (REQ-polaris-generation-034 version 2.24): its elements and relationships, each with the views that
   * select it, whose figures the draft's `diagrams` carry already expanded. Absent for every earlier draft, so its pages and machine view
   * keep their bytes. */
  readonly model?: LocalModel;
  /** A schema-v15 draft's views with a `base` (REQ-polaris-generation-034 version 2.35), by diagram identity: what the render drew each
   * from. Absent for every other draft, so its pages and machine view keep their bytes. */
  readonly bases?: ReadonlyMap<string, LocalBase>;
  /** A schema-v6 draft's `thesisBasis` (REQ-polaris-generation-034 version 2.4): what the authoring session says its introduction rests
   * on, and whether the code-reading line renders before it. Absent for every earlier draft, so its pages and machine view keep their
   * bytes. */
  readonly thesisBasis?: { readonly value: 'stated' | 'code-reading' | 'none'; readonly lineRendered: boolean };
  /** A schema-v10 draft's overview figure, or the checked claim block that explains its omission. */
  readonly hero?: { readonly form: 'figure'; readonly diagram: string } | { readonly form: 'omitted'; readonly reason: DraftParagraph };
  /** The draft's task routes (the index-and-task-routes change): reader tasks, each a short label and its steps in order. Every step is a claim block of
   * `blocks`, checked and reviewed as any block is. Absent when the draft declares none: the find-by-task page then says so and shows
   * no route. */
  readonly taskRoutes?: readonly LocalTaskRoute[];
  /** Backticked spans of the blocks' own text that the path secret detector matches (the index-and-task-routes change). The generated index lists none of
   * them as an identifier. Absent or empty when no block writes one. */
  readonly unindexedNames?: readonly string[];
  /** A schema-v13 draft's worth-knowing marks (REQ-polaris-generation-034 version 2.26): the ids of its marked blocks, each one of a
   * section's own paragraphs, in draft order, and the indexes into `poles` of the Poles that say none of their blocks meets the test.
   * Absent for every earlier draft, so its pages keep their bytes. */
  readonly worthKnowing?: { readonly blockIds: readonly string[]; readonly nonePoles: readonly number[] };
}

/** One task route: a reader's task as a short label, and the cited steps that answer it. A step may name, in `see`, the section or deep
 * dive of the dossier that explains it. */
export interface LocalTaskRoute {
  readonly id: string;
  readonly task: string;
  readonly steps: readonly { readonly paragraph: { readonly id: string; readonly text: string; readonly sourceIds: string[] }; readonly see?: { readonly kind: 'section' | 'deep-dive'; readonly id: string } }[];
}

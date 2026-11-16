// N8 slice 1 (syzygy-u05.8) — measure how general the unmodified PWB
// extraction pipeline is, over synthetic corpora in container shapes
// Butlers does not use. This module runs `extractClass` (the literal
// grammar, unchanged) against each fixture in `fixtures/synthetic-corpora.js`
// for every one of the nine extraction classes, and reports each cell's
// outcome honestly: `extracted` with its item count, or `unknown` with the
// pipeline's own failure reason. A cell is never coerced to pass, and an
// unextracted cell is never reported as zero — it carries no count at all,
// only the reason.
//
// `repairKind` records what closing a gap would need, not whether it is
// authorized:
//   - 'profile-row': the class's own extractor never ran the corpus's
//     grammar at all, because `project-shape-extraction.ts` gates that
//     class on one literal basename or path pattern
//     (`posixBasename(path) !== 'vision.md'`, and similarly for the other
//     eight). A container-shape profile row could in principle admit the
//     path without a code change; the class's own grammar would still need
//     to recognize what is actually there. N8 slice 2 (syzygy-u05.8)
//     investigated building that row: `principle`'s admission basename and
//     grammar (`vision.md`, top-level decimal list) are the literal PWB-
//     REQ-002 "Reader definitions" text in
//     `openspec/changes/polaris-project-wide-butlers-model/specs/
//     polaris-project-wide-butlers-model/spec.md` — independently confirmed
//     against that file's line 33-34 for `principle`, matching the
//     extractor exactly. (No test in this package proves the per-class
//     admission basenames byte-equal to any registry or policy JSON;
//     `project-shape-manifest.test.ts`'s registry/policy comparison covers
//     only `PWB_DISCOVERY_VERSION`, `PWB_ROOT_INDEX_PATH`, and
//     `PWB_INDEX_DEPTH`, never the nine per-class basenames — the spec-text
//     citation is the only verified anchor and is sufficient on its own.)
//     Admitting a new container shape is therefore a governed-plane change
//     (a spec amendment plus a registry/policy amendment act), not an
//     implementation-plane one, and stays undone here; this module still
//     only reports the gap honestly.
//   - 'code-path': the corpus's own target class *is* admitted by the
//     basename gate, and its own grammar failure is a genuine shape
//     mismatch: `malformed-list` or `malformed-row` (a bullet list where a
//     decimal list is expected, a table where a list is expected, prose
//     where a table is expected), or `malformed-toml` for the one
//     TOML-shaped class (`roster-identity`; `extractRosterIdentity`,
//     `project-shape-extraction.ts:548-575` — a non-TOML body under an
//     admitted `roster/*/butler.toml` path fails "no [butler] table", the
//     TOML analogue of "no top-level decimal list"). Only new parsing logic
//     closes this gap; no profile row can. Narrowed in N8 slice 2 to these
//     three reasons only: a target-class failure for any other reason (a
//     missing or duplicated heading, an ambiguous leading label) is a
//     defect in the fixture's own authoring, not a generality finding about
//     the pipeline, and must not be labeled as one.
// Every other failing cell (a class whose basename happens to match a
// corpus it was not authored for, so it fails on missing content rather
// than a shape or basename question) carries its raw reason with no
// repair classification — it is not a generality finding.

import { EXTRACTION_CLASSES, type ExtractionClass } from './project-shape-manifest.js';
import { extractClass, type ClassExtraction } from './project-shape-extraction.js';
import { SYNTHETIC_CORPORA, type SyntheticCorpusFixture } from './fixtures/synthetic-corpora.js';

type RepairKind = 'profile-row' | 'code-path';

// The extraction failures a genuine shape mismatch can produce (N8 slice
// 2, corrected in review): the line/table/TOML walker ran and found
// content, but not in the grammar's expected list, row, or TOML-table
// form. `malformed-toml` covers `roster-identity`, the one TOML-shaped
// class (project-shape-extraction.ts:548-575); every other class fails
// `malformed-list` or `malformed-row`. Any other failure reason on the
// target class itself (a misnamed or duplicated heading, an ambiguous
// leading label) is a fixture defect, not a generality finding, and
// `repairFor` must not label it 'code-path'.
const SHAPE_MISMATCH_REASONS = ['malformed-list', 'malformed-row', 'malformed-toml'] as const;

interface ClassCellResult {
  readonly class: ExtractionClass;
  readonly outcome: 'extracted' | 'unknown';
  // Present only when `outcome` is `extracted`; PWB-REQ-002 never yields a
  // partial item set, so count and denominator are the same number.
  readonly count?: number;
  readonly denominator?: number;
  readonly failureReason?: string;
  readonly failureDetail?: string;
  readonly repairKind?: RepairKind;
  readonly repairNote?: string;
}

export interface CorpusRow {
  readonly corpus: SyntheticCorpusFixture;
  readonly cells: readonly ClassCellResult[];
  readonly extractedCount: number;
  readonly unknownCount: number;
  readonly denominator: number;
}

function repairFor(cls: ExtractionClass, corpus: SyntheticCorpusFixture, extraction: Extract<ClassExtraction, { kind: 'failed' }>): { readonly kind: RepairKind; readonly note: string } | undefined {
  if (extraction.failure.reason === 'unsupported-source') {
    return {
      kind: 'profile-row',
      note: `"${cls}" admission is keyed to a literal basename or path pattern in project-shape-extraction.ts, not any shape signal in this corpus; a container-shape profile row could admit the path, but "${cls}"'s own grammar would still need to recognize what is there.`,
    };
  }
  if (cls === corpus.targetClass && (SHAPE_MISMATCH_REASONS as readonly string[]).includes(extraction.failure.reason)) {
    return {
      kind: 'code-path',
      note: `the basename admits this source under "${cls}", but its line/table walker has no rule for the "${corpus.shape}" shape; only new parsing logic closes this, not a profile row.`,
    };
  }
  return undefined;
}

export function runSyntheticCorpusCoverage(corpus: SyntheticCorpusFixture): CorpusRow {
  const cells: ClassCellResult[] = EXTRACTION_CLASSES.map((cls) => {
    const extraction = extractClass(cls, corpus.path, corpus.text);
    if (extraction.kind === 'items') {
      return { class: cls, outcome: 'extracted', count: extraction.items.length, denominator: extraction.items.length };
    }
    const repair = repairFor(cls, corpus, extraction);
    return {
      class: cls,
      outcome: 'unknown',
      failureReason: extraction.failure.reason,
      ...(extraction.failure.detail === undefined ? {} : { failureDetail: extraction.failure.detail }),
      ...(repair === undefined ? {} : { repairKind: repair.kind, repairNote: repair.note }),
    };
  });
  const extractedCount = cells.filter((cell) => cell.outcome === 'extracted').length;
  return { corpus, cells, extractedCount, unknownCount: cells.length - extractedCount, denominator: cells.length };
}

export function runAllSyntheticCorpusCoverage(corpora: readonly SyntheticCorpusFixture[] = SYNTHETIC_CORPORA): readonly CorpusRow[] {
  return corpora.map(runSyntheticCorpusCoverage);
}

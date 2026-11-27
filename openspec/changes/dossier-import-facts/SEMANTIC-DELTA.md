# Version 2.39 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-60/import_facts_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-migration-parity/proposed/polaris-generation/spec.md` (dossier migration parity version 2.38, row A-269, tag `polaris-dossier-migration-parity-v2.38`; sha256 `3f292ca99bec13885c08e2c4e84932156962de847022f3e35f8a910ed82f52be`), the REQ-034 this version is adopted over. [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-import-facts/proposed/polaris-generation/spec.md`, sha256 `6d99063e20218f01a88bbf3a6e394d5ff65aa67c3c2e05be3eb63b477145fd81`) replaces that text. It was drafted and reviewed over figure plan 2.33 under the placeholder 2.NN (`design.md` D8) and is rebuilt over 2.38 as version 2.39 by re-running the build script with its anchors, which changes the predecessor, its name and number and the label alone. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.33's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1821 lines, 1820 appear byte for byte and in order in the new text; 1 are amended in place (below) and none is removed. All 264 predecessor scenarios are carried with their blocks byte for byte (276 in the new text). The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-60/import_facts_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.39 and this change. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…write the full record. Apart from": displaced "`manifestFacts`,"; now "`manifestFacts` and, since version 2.39, `importFacts`,".
- After "…no `executionFlags`, `quotations`, `excludedContent`, `citedBlobs`, `figureFit`,": displaced "`readingLedger`"; now "`readingLedger`, `importFacts`".
- After "…a draft check record carries `figureFit`,": displaced "`readingLedger`"; now "`readingLedger`, `importFacts`".

## Added

[Observed] 5 paragraphs, placed immediately after the paragraph beginning "Since version 2.14 the member also states its coverage remainder: which files of the …":

- "In the operator-agent mode `syzygy dossier check`, for each draft revision it checks and writes a …"
- "The candidates are the blob entries of the pinned tree (modes 100644, 100755 and 120000) whose …"
- "A scanned body is read as TypeScript tokens from its first code point, a leading U+FEFF …"
- "Each statement is collapsed to units, from the tree listing and the `manifestFacts` member alone; no …"
- "Each statement takes exactly one outcome, the first of these that applies: `unknown` with the reason …"

[Observed] 1 paragraph, placed immediately after the paragraph beginning "These are the bytes version 2.14 changes. In the operator-agent mode: every draft check …":

- "These are the bytes version 2.39 changes. In the operator-agent mode every draft check record that …"

[Observed] 12 scenarios, after the predecessor's scenario "Witnessed edge to a withheld node leaves the migration parity" and before the Form line: "Import facts give a workspace's unit graph", "Comments, strings, templates and regular expressions hold no import", "Forms outside the grammar are counted and never resolved", "Only a whole body the screen admits is scanned", "An interrupted scan keeps what closed before it", "An undecidable target address is Unknown, never passed over", "A package name resolves only against complete manifest facts", "An undecidable source unit is Unknown", "Read limits are inclusive and stop in path order", "Listing stops at the byte budget and counts the rest", "A byte-order mark and CRLF lines keep line numbers citable", "Earlier records and every other output keep their bytes".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As the added paragraph beginning "These are the bytes version 2.39 changes" states and `design.md` D7 explains: every full draft check record written in the operator-agent mode gains `importFacts` before `manifestFacts`, and with it check's report and the record's digest. The structure record, `manifestFacts`, inventory check records, the brief, the draft schemas, every rendered page, `machine.json`, `dossier.json`, the size report, the review packets, the relation witness states and every provider-mode byte are unchanged.

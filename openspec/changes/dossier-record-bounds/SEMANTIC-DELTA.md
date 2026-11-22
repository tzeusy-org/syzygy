# Version 2.10 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-computed-maps/proposed/polaris-generation/spec.md` (computed maps version 2.9, row A-30, tag `polaris-dossier-computed-maps-v2.9`; that file's SHA-256 is `63902cc6f737295f7aac4953b7c950ced6142d5648bdd63abc4996d31a8d0987`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject, `MAPS_SUBJECTS`).

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.9 (and therefore after 2.8, 2.7, 2.5, 2.4, 2.3, 2.2, 2.0, and 2.1 where it is in force; 2.6 does not touch REQ-034). Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 100 to 106 scenarios; no other requirement changes. Its warrants block gains one parent requirement, REQ-polaris-generation-035, so its dependency union (`GOVERNING-DEPENDENCIES.json`) is version 2.9's with that one added. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every other line of the predecessor requirement (its paragraphs, its 100 scenarios except the three lines below, its `Oracle independence` line and the rest of its warrants block) appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a line diff against the predecessor shows, besides the file's title and preamble, exactly the changed lines listed below and the three insertions (three paragraphs, six scenarios).

## Added

[Observed] Three paragraphs, after the paragraph that ends "So the member alone never takes a check record past that bound, and the listing caps are unchanged." (the version 2.7 and 2.8 paragraph on `manifestFacts` and the read bound):

1. [Inferred] The bounded form (syzygy-3efd.73 (a)). Every draft and inventory check record Syzygy writes lies within the version 2.8 read bound; a step that would write a record past it measures it first and writes the bounded form instead, which keeps only the members whose size does not grow with the subject, with outcome `findings` and one repair finding of the new kind `check-record-bound`; check's report carries `findingsLeftOut`. The paragraph states the measured worst cases with every parameter (at least 19,946,240 bytes for a draft, 16,995,454 for an inventory, at least 60 bytes per withheld line range and 263,852 ranges past the bound, and 117,082 and 121,398 bytes for the two bounded forms, the credential reason charged at its real cap), says the value and depth arms are tested through an injected measure, and names the sentences of this requirement, of check's report and of the run file to which a bounded form is the exception.
2. [Inferred] The inventory check record's readers (syzygy-3efd.74). Syzygy deciding whether an inventory counts and the launched run's supervisor read it under the same bound; every reader of a draft or inventory check record opens the path once without blocking, refuses anything but a regular file and any size past the bound before reading a byte, and reads at most one byte past the bound; a record past the bound cannot be read, so the inventory does not count and the supervisor takes it as no checked revision. It states the earlier bounds (none; 262,144 bytes, 4,096 values, 8 levels) and that an inventory record of 368 quotations passed the latter.
3. [Inferred] The byte list for version 2.10, including check's report, `run-advice.json`, the step log and the close record's digests.

[Observed] Six scenarios, after the last scenario of version 2.9 ("Unreadable check record in the run file"): "Passed draft whose check record would pass the read bound", "Check record past the bound for a draft with findings", "Inventory too large for its check record", "Inventory check record read under the bound", "Inventory check record past the earlier reader bound counts", "Derived record kept but unusable told apart from none kept".

## Amended

[Observed] The title and preamble (file head, not requirement text) name version 2.10.

[Observed] In the derived-structure paragraph (version 2.3, as amended), the machine view's `state`:

- Was: "`state` is the record's `state`, or `missing` where the draft revision has no readable record;"
- Now: "`state` is the record's `state`, or, where the draft revision has no readable record, `missing` where no entry stands at its path and `unusable` where one does (version 2.10);"

[Observed] In the currency paragraph (version 2.3, as amended by 2.8), the region's reasons and words (syzygy-3efd.73 (b)):

- Was: "with the reason and words `missing-evidence`, `no derived record was kept when this draft revision was checked`; or `source-uncaptured-or-unreachable`, `the pinned tree could not be listed`; and no record is published."
- Now: the first pair applies only where examining the draft revision's `derived/rev-<n>.json` without following a link reports nothing there (no such entry, or a parent that is not a directory); a second `missing-evidence` pair, with the words `this draft revision's derived-record path holds something this render cannot use or cannot examine; Syzygy or its screen may have changed since the revision was checked, or the path may have been altered`, applies where examining it reports anything else; the third pair is unchanged; followed by the rule by which the render reads that path (as a check record's readers do, under the derived record's 4,194,304-byte bound), the order in which the render decides, and a sentence saying what the version 2.9 words got wrong. The reason code is unchanged in every case: `missing-evidence` is RFC2-24's reason for a declaration with no current evidence artifact, which both cases are; only the words, and the machine view's `state`, tell them apart.

[Observed] Scenario "No derived record, or a tree that cannot be listed", its AND line:

- Was: "- **AND** `derivedStructure` states `missing` or `unknown` with no facts, and its `file` and `sha256` are null"
- Now: "- **AND** `derivedStructure` states `missing`, `unusable` or `unknown` with no facts, and its `file` and `sha256` are null"

[Observed] Scenario "Derived record naming a directory not in the tree" (version 2.8), its THEN line and first AND line:

- Was: "- **THEN** the region holds its heading and the `Not established.` sentence with `missing-evidence`, and no figure, list or `derived-structure.json`" and "- **AND** `derivedStructure` states `missing` with no facts, its `file` and `sha256` null, and that directory's name appears on no page, in no `machine.json` and in no published file"
- Now: the THEN line adds "and the words for an entry that is no readable record" after `missing-evidence`; the AND line states `unusable` for `missing`. The rest of both lines is unchanged.

[Observed] Form lines, each extended at its end, none of its existing text changed: **Case** (records just within and past the byte bound, and the value and depth bounds through an injected measure, a draft with findings past it, inventory records at the earlier and the new bound read by both readers, a derived record check wrote read under a changed screen, removed, or replaced by a directory, a FIFO or a device, a path that cannot be examined, and a device, a FIFO and a growing file at a check record's path); **Observable** (record bytes, values, depth, form, outcome, findings and `findingsLeftOut`; whether the inventory counts and why; the supervisor's phase and stop; whether a byte of an oversized file is read; the region's and map's words and both `state` members); **Oracle** (record sizes measured outside the code under test, literals for forms, words and states, and goldens for unchanged bytes); **Falsifier** (six further falsifying clauses, appended before its final period).

[Observed] Warrants: `parent_requirements` gains `REQ-polaris-generation-035`, whose inventory this version's readers decide on.

## What a reader of the previous text would now do differently

[Inferred]

- A step about to write a draft or inventory check record past 16,777,216 bytes, 2,000,000 values or 16 levels writes the bounded form, and that draft or inventory does not pass.
- Syzygy deciding whether an inventory counts reads its check record under the 16,777,216-byte bound, opened once and refused unless a regular file within the bound, where it read under 262,144 bytes; the supervisor reads it under that bound where it read with none; and the render reads the derived record by the same rule under its own bound.
- A render whose draft revision's derived-record path holds something that is no readable record, or cannot be examined, says so, and states `unusable` in `machine.json`, where it said no record was kept and stated `missing`.

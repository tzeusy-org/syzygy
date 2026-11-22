# Version 2.12 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-spec-corrections/proposed/polaris-generation/spec.md` (spec corrections version 2.11, row A-36, tag `polaris-dossier-spec-corrections-v2.11`; that file's SHA-256 is `376f27c0261120d0238d0d4a6685fe08b19ff03a9d00fcb4a6702349f64834c3`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject).

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.11 (and therefore after 2.10, 2.9, 2.8, 2.7, 2.5, 2.4, 2.3, 2.2, 2.0, and 2.1 where it is in force). Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 110 to 117 scenarios; no other requirement changes. Its warrants block is the predecessor's byte for byte, which already names REQ-polaris-generation-035 (the independent inventory, the inventory of record and the fidelity review the advice reads and leaves unchanged) as a parent requirement, so its dependency union is the predecessor's. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every other line of the predecessor requirement (its paragraphs, its 110 scenarios, its `Oracle independence` line, its warrants block) appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a line diff against the predecessor shows, besides the file's title and preamble, exactly the changed lines listed below and the insertions.

## Added

- Five paragraphs after the predecessor's last paragraph (the classes of check's advice and the run file `run-advice.json`), before the `ID:` line: the advice, its place on check's report and what it is not; the inventory compared and the advice's two forms, compared and Unknown; rule `overlap-or-path-named` version 1; what `uncovered` and `omissions` list and what the advice never carries; and the draft's `inventoryOmissions` member.
- 7 scenarios after the predecessor's last, "Readable layout stacks every graph of two or more layers": Uncovered inventory entry listed before review; Entry covered by overlapping lines or a named path; Compared advice names its rule, its inventory and its counts; Justified omission recorded by the author; No inventory of record gives Unknown coverage; Omission record in an earlier schema or malformed; Secret-matching path of an entry not named.

## Modified

[Observed] 6 changes inside existing lines. Where a Form line is named, the predecessor line is kept as a prefix and the text is appended after it; otherwise the quoted span is replaced. Old and new, quoted exactly:

```json
[
  {
    "where": "Schema-v5 paragraph, the v4 and v5 sentences",
    "old": "`lanes` or `steps`. A draft in schema v5 SHALL be checked and rendered exactly as version 2.3 checks and renders it, except for those same two additions of version 2.4 and that addition of version 2.5. The provider mode is unaffected.",
    "new": "`lanes` or `steps`; and except for the addition of version 2.12, a `field-version` finding for an `inventoryOmissions` member. A draft in schema v5 SHALL be checked and rendered exactly as version 2.3 checks and renders it, except for those same two additions of version 2.4 and that addition of version 2.5, and except that from version 2.12 it MAY carry the `inventoryOmissions` member the omission-record paragraph below states; without that member its findings and rendered bytes are those of version 2.11. The `inventoryCoverageAdvice` member of version 2.12 is on check's report alone, whatever the draft's schema, and is no finding and no rendered byte. The provider mode is unaffected."
  },
  {
    "where": "Scenario \"Schema-v4 draft unchanged\", its AND line",
    "old": "- **AND** a diagram of such a draft that carries `home`, such a draft that carries `thesisBasis`, and a diagram of such a draft whose kind is `sequence` or `swimlane` or that carries `participants`, `messages`, `lanes` or `steps`, is each a `field-version` repair finding",
    "new": "- **AND** a diagram of such a draft that carries `home`, such a draft that carries `thesisBasis`, such a draft that carries `inventoryOmissions`, and a diagram of such a draft whose kind is `sequence` or `swimlane` or that carries `participants`, `messages`, `lanes` or `steps`, is each a `field-version` repair finding"
  },
  {
    "where": "Form line Case: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " With inventory coverage, vary whether an inventory counts and each reason it does not, a highest-numbered revision with findings after one that passed, the frozen inventory's bytes after its check, a reader that fails, and checking an inventory; for one entry vary each citation's path and line range against each part of the draft that cites (introduction, section, deep dive, table cell, code excerpt, diagram node and edge, unresolved item, understanding record, discovery account), ranges that touch at one line and that miss by one line, a path named in a claim block's `text`, inside a longer path there, in a short label and in an understanding item, an entry citing nothing, an entry whose every cited file screening withholds, and a path a secret detector matches; and vary the omission record over absent, matching, unmatched, naming a covered entry, naming one entry twice, each bound exceeded by one, a missing or extra member, and each schema version."
  },
  {
    "where": "Form line Observable: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " Check's report's `inventoryCoverageAdvice` member, its `rule`, `inventory`, `counts`, lists and `note`, and its absence from an inventory check's report, the check record, the step log, every packet but for the draft's own `inventoryOmissions`, and every rendered file; the check's outcome, findings and exit status with and without an inventory; each `field-version` and schema finding for the omission record."
  },
  {
    "where": "Form line Oracle: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " For inventory coverage, the expected covered, omitted and uncovered entries, paths and counts written in the fixture as literals from the fixture draft's and inventory's citations by the stated rule, never from check's code."
  },
  {
    "where": "Form line Falsifier: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " The coverage advice carries any statement, kind, label, Unknown reason, quotation, citation identifier or line range of an inventory entry, or names a path a secret detector matches; it lists a covered or omitted entry, or omits an uncovered one; its three counts do not sum to its entries; ranges sharing one line count as disjoint, or ranges one line apart as overlapping; a citation of the understanding record or the discovery account, or a path in a short label, covers an entry; it compares an earlier passed revision while a later one has findings, names a revision or digest other than the one read, or labels the inventory Observed; an advice is given as zero uncovered entries where no inventory was compared; its note lacks one of its six statements; the advice, or a failure to compute it, changes an outcome, a finding, an exit status or a refusal, is written by check to the check record or any other file, or appears on an inventory check's report; an omission record is rendered, counts among the draft's identities, is a finding in a v5 draft when well formed, or passes in a v4 draft; an omitted entry's reviewer disposition is fixed by the record; a path that is both denied and matched by a secret detector is named; an object without a non-empty `reason` omits an entry; a repeated identifier is absent from `duplicated`; the fidelity criteria say nothing of the record, or change otherwise."
  }
]
```

The first change keeps the two byte-identity sentences of the schema-v5 paragraph true: a v2, v3 or v4 draft gains one more `field-version` case, a v5 draft may carry the new optional member and is otherwise as version 2.11 left it, and the advice is named as neither a finding nor a rendered byte. The second names the new `field-version` case in the scenario that pins earlier schemas.

## Removed

None. No sentence of the predecessor is deleted.

## Not changed, and why

[Inferred] The brief's version and its words (the schema digest a brief states changes with the schema file it issues, which now describes the new member); the draft schema's version identifiers; the check record and its format identifier `polaris-dossier-check/1` (the advice is on the report only); the step log; the inventory, its brief and its check; the fidelity packet's construction, the verdict schema and readiness (REQ-polaris-generation-035); rendering; secret screening, the screening policy and the class gate. A draft that passed before this version passes with the same findings, and a draft without `inventoryOmissions` renders the same bytes.

## Changed outside the draft and the report

[Observed] One sentence is added to the coverage criterion the fidelity packet carries (`fidelityCriteria`, `packages/polaris-dossier/src/review-packet.ts`): it tells the review session that the draft may carry `inventoryOmissions`, that each `reason` is the author's unverified statement and settles nothing, and that the changed-block list does not show a change to the record. [Inferred] The criteria are part of every fidelity packet's bytes, so the digest of a packet built after this version differs from the digest the same inputs gave before it; a verdict names the digest of the packet it was written against, so no stored verdict is affected. REQ-polaris-generation-035's text is not changed: it does not fix the criteria's wording, and this requirement states the added sentence.

## Rebuilt on a later predecessor, twice

[Observed] This delta was first drafted as version 2.5 over ledger, packs and thesis version 2.4 and reviewed in that form. Figure kinds took version 2.5 (row A-21) before it landed, so the requirement was rebuilt from the figure kinds bytes and renumbered 2.6, amended as `design.md` ("Second review") records. Versions 2.6 to 2.11 were then adopted by other changes (rows A-27 to A-31 and A-36), five of them complete replacements of this requirement, so it was rebuilt again, from the spec corrections 2.11 bytes, as version 2.12: the same five paragraphs, seven scenarios and Form-line additions, with the version numbers changed and two amendments that `design.md` ("Rebuilt as version 2.12") states: the compared form's `omissions` names all five of its members, and one sentence places the advice against version 2.9's advice classes and run file. The warrants change of the earlier forms is gone, since the predecessor already carries it. The one fresh-reader review is bound to the first bytes; no further round was run.

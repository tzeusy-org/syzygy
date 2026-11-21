# Version 2.5 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-ledger-packs-thesis/proposed/polaris-generation/spec.md` (ledger, packs and thesis version 2.4, row A-20, tag `polaris-dossier-ledger-packs-thesis-v2.4`; that file's SHA-256 is `500a7771f3df85046ff2c0c41a36c2067cf0bf44b1ba65e5bb5f52d4dbd9fded`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject).

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.4 (and therefore after 2.3, 2.2, 2.0, and 2.1 where it is in force). Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 60 to 67 scenarios; no other requirement changes. Its warrants gain one parent requirement, REQ-polaris-generation-035 (the independent inventory, the inventory of record and the fidelity review the advice reads and leaves unchanged), so its dependency union changes by that one entry. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every other line of the predecessor requirement (its paragraphs, its 60 scenarios, its `Oracle independence` line, the rest of its warrants block) appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a line diff against the predecessor shows, besides the file's title and preamble, exactly the changed lines listed below and the insertions.

## Added

- Five paragraphs after the predecessor's last paragraph (the rendered thesis-basis line and `machine.json`'s `thesisBasis`), before the `ID:` line: the advice, its place on check's report and what it is not; the inventory compared and the advice's two forms, compared and Unknown; rule `overlap-or-path-named` version 1; what `uncovered` and `omissions` list and what the advice never carries; and the draft's `inventoryOmissions` member.
- 7 scenarios after "Withheld thesis carries no basis line": Uncovered inventory entry listed before review; Entry covered by overlapping lines or a named path; Compared advice names its rule, its inventory and its counts; Justified omission recorded by the author; No inventory of record gives Unknown coverage; Omission record in an earlier schema or malformed; Secret-matching path of an entry not named.

## Modified

[Observed] 7 changes inside existing lines. Where a Form line is named, the predecessor line is kept as a prefix and the text is appended after it; otherwise the quoted span is replaced. Old and new, quoted exactly:

```json
[
  {
    "where": "Schema-v5 paragraph, the v4 and v5 sentences",
    "old": "and except for the additions of version 2.4, the `readingLedger` member of its check record and a `field-version` finding for a `thesisBasis` member. A draft in schema v5 SHALL be checked and rendered exactly as version 2.3 checks and renders it, except for those same two additions of version 2.4. The provider mode is unaffected.",
    "new": "and except for the additions of version 2.4, the `readingLedger` member of its check record and a `field-version` finding for a `thesisBasis` member; and except for the addition of version 2.5, a `field-version` finding for an `inventoryOmissions` member. A draft in schema v5 SHALL be checked and rendered exactly as version 2.3 checks and renders it, except for those same two additions of version 2.4, and except that from version 2.5 it MAY carry the `inventoryOmissions` member the omission-record paragraph below states; without that member its findings and rendered bytes are those of version 2.4. The `inventoryCoverage` advice of version 2.5 is on check's report alone, whatever the draft's schema, and is no finding and no rendered byte. The provider mode is unaffected."
  },
  {
    "where": "Scenario \"Schema-v4 draft unchanged\", its AND line",
    "old": "- **AND** a diagram of such a draft that carries `home`, and such a draft that carries `thesisBasis`, is each a `field-version` repair finding",
    "new": "- **AND** a diagram of such a draft that carries `home`, such a draft that carries `thesisBasis`, and such a draft that carries `inventoryOmissions`, is each a `field-version` repair finding"
  },
  {
    "where": "Form line Case: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " With inventory coverage, vary whether an inventory counts and each reason it does not, a highest-numbered revision with findings after one that passed, the frozen inventory's bytes after its check, a reader that fails, and checking an inventory; for one entry vary each citation's path and line range against each part of the draft that cites (introduction, section, deep dive, table cell, code excerpt, diagram node and edge, unresolved item, understanding record, discovery account), ranges that touch at one line and that miss by one line, a path named in a claim block's `text`, inside a longer path there, in a short label and in an understanding item, an entry citing nothing, an entry whose every cited file screening withholds, and a path a secret detector matches; and vary the omission record over absent, matching, unmatched, naming a covered entry, naming one entry twice, each bound exceeded by one, a missing or extra member, and each schema version."
  },
  {
    "where": "Form line Observable: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " Check's report's `inventoryCoverage` member, its `rule`, `inventory`, `counts`, lists and `note`, and its absence from an inventory check's report, the check record, the step log, every packet but for the draft's own `inventoryOmissions`, and every rendered file; the check's outcome, findings and exit status with and without an inventory; each `field-version` and schema finding for the omission record."
  },
  {
    "where": "Form line Oracle: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " For inventory coverage, the expected covered, omitted and uncovered entries, paths and counts written in the fixture as literals from the fixture draft's and inventory's citations by the stated rule, never from check's code."
  },
  {
    "where": "Form line Falsifier: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " The coverage advice carries any statement, kind, label, Unknown reason, quotation, citation identifier or line range of an inventory entry, or names a path a secret detector matches; it lists a covered or omitted entry, or omits an uncovered one; its three counts do not sum to its entries; ranges sharing one line count as disjoint, or ranges one line apart as overlapping; a citation of the understanding record or the discovery account, or a path in a short label, covers an entry; it compares an earlier passed revision while a later one has findings, names a revision or digest other than the one read, or labels the inventory Observed; an advice is given as zero uncovered entries where no inventory was compared; its note lacks one of its six statements; the advice, or a failure to compute it, changes an outcome, a finding, an exit status or a refusal, is written by check to the check record or any other file, or appears on an inventory check's report; an omission record is rendered, counts among the draft's identities, is a finding in a v5 draft when well formed, or passes in a v4 draft; an omitted entry's reviewer disposition is fixed by the record."
  },
  {
    "where": "Warrants block, parent_requirements line",
    "old": "REQ-polaris-generation-033, REQ-polaris-generation-014]",
    "new": "REQ-polaris-generation-033, REQ-polaris-generation-014, REQ-polaris-generation-035]"
  }
]
```

The first change keeps the two byte-identity sentences of the schema-v5 paragraph true: a v2, v3 or v4 draft gains one more `field-version` case, a v5 draft may carry the new optional member and is otherwise as version 2.4 left it, and the advice is named as neither a finding nor a rendered byte. The second names the new `field-version` case in the scenario that pins earlier schemas.

## Removed

None. No sentence of the predecessor is deleted.

## Not changed, and why

[Inferred] The brief's version and its words (the schema digest a brief states changes with the schema file it issues, which now describes the new member); the draft schema's version identifiers; the check record and its format identifier `polaris-dossier-check/1` (the advice is on the report only); the step log; the inventory, its brief and its check; the fidelity packet's construction and criteria, the verdict schema and readiness (REQ-polaris-generation-035); rendering; secret screening, the screening policy and the class gate. A draft that passed before this version passes with the same findings, and a draft without `inventoryOmissions` renders the same bytes.

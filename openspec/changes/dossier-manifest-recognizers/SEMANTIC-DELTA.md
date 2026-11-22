# Version 2.7 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-figure-kinds/proposed/polaris-generation/spec.md` (figure kinds version 2.5, row A-21, tag `polaris-dossier-figure-kinds-v2.5`; that file's SHA-256 is `a949eebfae9492c70b36e703955449cbef9d4b5e6d65bc6151dbe6716ac37a2c`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject). Version 2.6 (`dossier-declared-source-reach`, row A-27) replaced REQ-polaris-generation-046 and left REQ-034 as 2.5 gave it.

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.5 (and therefore after 2.4, 2.3, 2.2, 2.0, and 2.1 where it is in force). Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 70 to 82 scenarios; no other requirement changes. Its warrants block is unchanged, so its dependency union (`GOVERNING-DEPENDENCIES.json`) is byte for byte version 2.5's. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every other line of the predecessor requirement (its paragraphs, its 70 scenarios, its `Oracle independence` line and its warrants block) appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a line diff against the predecessor shows, besides the file's title and preamble, exactly the changed lines listed below and the two insertions.

## Added

- 5 paragraphs after the predecessor's last paragraph (figure fit for the sequence and swimlane kinds), before the `ID:` line: declared manifest facts, what they state and where check stores them (`manifestFacts` in the draft check record); the five recognizers and the exact fields each reads; each candidate's disposition, the read path through the screen and the pinned object reader, the Unknown reasons and parse faults, the value checks, and what policies 1.0.0 and 2.0.0 admit; the member's shape, the fact form, line spans, order, identities, caps and determinism; and the Inferred label and the qualification a later version needs before any upgrade.
- 12 scenarios after "Provider mode unchanged by figure kinds": Workspace manifests read into the check record; Python project and its dependency sections; Workflow jobs and their needs; Malformed manifest is Unknown, never empty; Empty manifests; Excluded or withheld blob never read; Go modules Unknown under the bound policy; Manifest facts deterministic and independent of the draft; Manifest facts stay Inferred; More manifests than the member lists; Unread files sorting first do not hide read ones; Pages and provider unchanged by manifest facts.

## Modified

[Observed] 5 changes. Where a Form line is named, the predecessor line is kept as a prefix and the text is appended after it; otherwise the quoted span is replaced. Old and new, quoted exactly (generated from the build script's own change list):

```json
[
  {
    "where": "Derived-structure paragraph, the sentence defining a derived structural fact",
    "old": "and no rule reads a file body, a size or an object identifier.",
    "new": "and no rule reads a file body, a size or an object identifier (the declared manifest facts of version 2.7, below, are not derived structural facts: their recognizers read admitted bodies, and no page renders them)."
  },
  {
    "where": "Form line Case: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " With manifest recognizers, vary each recognizer's file over a workspace, a single package, an empty file, a malformed file, a wrong-typed field, a repeated key and a form beyond the reader; each path rule's boundary (a basename differing in case, a workflow one directory deeper, a `.yml` and a `.yaml`); each disposition (a path over 512 code units or with a control character, a secret-matching path or prefix, a vendored, generated or tests segment, a symbolic link, a denied, indeterminate or unconsented path, the 250th and 251st readable file, a refused read, a non-UTF-8 body, a blob of 1,048,576 bytes and one byte more, a body a detector or the active-content rule excludes, a body a screen double retains with lines withheld); unread named files sorting before and after read ones; a value of 256 and 257 code units, one with a control character and one a detector matches; 1,000 and 1,001 facts; the bound policy (1.0.0 and 2.0.0) and the run's content classes; and the draft, parsing and not."
  },
  {
    "where": "Form line Observable: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " Each check record's `manifestFacts` member and its bytes, every recognizer entry and file entry and their counts, every fact and its line span, check's report, and which blobs the object reader is asked for; and every page, `machine.json` and published file of a render of such a run."
  },
  {
    "where": "Form line Oracle: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " For manifest recognizers, the expected facts, spans, dispositions, reasons, parse faults and counts of each golden fixture written as literals before the recognizer runs, never read from its code; a reader double that records every path it is asked for and fails on any path the stated dispositions do not read; the screen's outcomes for the fixture paths fixed by running the bound policy's screen, as the screening scenarios do, except the retained-body case, which runs under a screen double; and for unchanged bytes, the goldens of pages, `machine.json`, `derived-structure.json` and the provider mode rendered before this version."
  },
  {
    "where": "Form line Falsifier: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " A manifest fact is recorded from a blob that is secret-matching, set apart, withheld, excluded, retained with lines withheld, past the read limit or not read whole through the pinned object reader, or the object reader is asked for such a blob; a secret-matching or set-apart path is named; a file that does not parse, or is withheld, yields any fact, is named Inferred, or has a count where null is stated; a fact lacks its rule, rule version, path, line span or `\"epistemic\": \"inferred\"`, states a version requirement, a size, an object identifier or a field the recognizer does not read, or carries a body-taken string the value checks refuse, or a raw path over 512 code units or with a control character; a line span is a range the path-and-range check refuses for its path, or does not cover what declares the fact; a manifest fact or recognizer entry is labelled other than Inferred, or a draft, model, agent session or run-directory file changes a label; two checks of one run write different `manifestFacts` bytes, or a draft changes them; the member appears in an inventory check record, or is missing from a draft check record of this version, its `unknown` form included where the tree could not be listed; `candidates` differs from the sum of its parts, or a listing cap or count differs from the stated rules, or a file that was read is not listed; a `go.mod` is read under declared-source policy 1.0.0 or 2.0.0; a page, `machine.json`, `derived-structure.json`, brief or provider-mode byte changes, or a manifest fact appears in any of them."
  }
]
```

The first change keeps the 2.3 definition of a derived structural fact ("no rule reads a file body") true beside the new recognizers, which read admitted bodies: it says in place that declared manifest facts are a different class that no page renders. The four Form-line additions name the new cases, observables, oracle and falsifiers.

## Removed

None. No sentence of the predecessor is deleted.

## Not changed, and why

[Inferred] The draft schema (`polaris-dossier-local-draft-v7` and earlier) and brief (`polaris-dossier-brief-v12` and earlier), every finding, the derived-structure record of rule `top-level-unit` and its published `derived-structure.json`, the structure record's members on check's report, the reading ledger, figure fit, shape packs and trait rules, the rendered pages and `machine.json`, review, readiness, secret screening and the screening policy, and the provider mode are unchanged. The check record's format identifier stays `polaris-dossier-check/1`.

# Version 2.8 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-manifest-recognizers/proposed/polaris-generation/spec.md` (manifest recognizers version 2.7, row A-28, tag `polaris-dossier-manifest-recognizers-v2.7`; that file's SHA-256 is `55cc14dc4da4ccebaf72f3fa14937be357a2e873ab967a8a8fe79e0db7c3caaa`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject).

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.7 (and therefore after 2.5, 2.4, 2.3, 2.2, 2.0, and 2.1 where it is in force; 2.6 does not touch REQ-034). Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 82 to 87 scenarios; no other requirement changes. Its warrants block is unchanged, so its dependency union (`GOVERNING-DEPENDENCIES.json`) is byte for byte version 2.7's. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every other line of the predecessor requirement (its paragraphs, its other 81 scenarios unchanged, its `Oracle independence` line and its warrants block) appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a line diff against the predecessor shows, besides the file's title and preamble, exactly the changed lines listed below and the one insertion of scenarios.

## Added

- 5 scenarios after "Pages and provider unchanged by manifest facts": Largest manifest facts read back with the check; Derived record naming a directory not in the tree; Deep-dive page named per code point; Graph diagram with a missing or foreign member in schema v7; Records Syzygy wrote and the provider unchanged by the repairs.
- Two passages of three sentences each, appended in place to existing paragraphs (the derived-record readability rule; the check-record read bound and the member's size), listed below with their anchors as appended text.

## Modified

[Observed] 9 changes. Where `old` is empty the text is appended immediately after the anchor named in `where` (a Form line, a paragraph sentence or a scenario line), which is kept; otherwise the quoted span is replaced. Old and new, quoted exactly (generated from the build script's own change list):

```json
[
  {
    "where": "Reading-ledger paragraph, the deep-dive page name",
    "old": "with every code unit outside `A-Z`, `a-z`, `0-9`, `_`, `.` and `-` replaced by `_`;",
    "new": "with every code point outside `A-Z`, `a-z`, `0-9`, `_`, `.` and `-` replaced by one `_`, the rule by which the renderer names that deep dive's page: a character outside the Basic Multilingual Plane, written as two UTF-16 code units, is one code point and gives one `_`, and so does a lone surrogate;"
  },
  {
    "where": "Currency paragraph, after the sentence that no stale or unbounded fact is drawn solid or labelled Observed",
    "old": "",
    "new": " The run directory lies within the agent sessions' write reach, so a render SHALL take a record as readable only where every fact's `rule` and `ruleVersion` are `top-level-unit` and 1, the rule and version that render's own re-derivation uses, and every path its `top-level-unit` and `contains` facts name is the path of a `top-level-unit` fact among the facts that render re-derives from the tree it lists; a record naming any other rule, version or path (a directory the tree does not hold, or one past the render's own listing of 250) is no readable record, and nothing of it is drawn, listed, carried in `machine.json` or published, so every path and rule the region names, Observed or Unknown, is one the render itself derived at the pinned revision. A render that cannot list the tree states `source-uncaptured-or-unreachable`, below, whatever the record names. A fact of a readable record that is not current keeps the record's count, labelled Unknown with `stale-beyond-currency-bound`."
  },
  {
    "where": "Figure-kinds paragraph, the graph-kind byte-identity sentence",
    "old": "Each graph-kind diagram of a v7 draft SHALL be checked, laid out, measured for fit and rendered byte for byte as the same diagram in a v6 draft.",
    "new": "Each graph-kind diagram of a v7 draft SHALL be checked, laid out, measured for fit and rendered byte for byte as the same diagram in a v6 draft, except in the findings about its members: where a graph-kind diagram of a v7 draft lacks `nodes` or `edges`, the `figure-kind` finding at `$.diagrams[<i>]` naming that member stands in place of the `schema` finding a v6 draft reports at `$.diagrams[<i>].nodes` or `$.diagrams[<i>].edges`, and no `schema` finding is reported at that member's path; and where it carries `participants`, `messages`, `lanes` or `steps`, the `figure-kind` finding at that member's path stands in place of the `field-version` finding a v6 draft reports there. Such a diagram does not pass its check, so no page or `machine.json` byte depends on this exception."
  },
  {
    "where": "Manifest-facts member paragraph, after its determinism sentence",
    "old": "",
    "new": " Wherever Syzygy reads a draft check record back (review, render and close taking the latest passed draft revision, the reading difference reading an earlier run's records, the run's end screen counting outcomes, and every other reader), it SHALL read it as one JSON document of at most 16,777,216 bytes and 2,000,000 values, no value nested more than 16 levels below the root (the root at depth 0), and a record past any of those bounds is one that cannot be read, never counted or reported as a passed draft or as a draft check refused. At this version's caps the member, encoded as the check record encodes it, takes fewer than 10,000,000 bytes whatever the tree holds: its widest form has every count a safe integer, every listed fact a `dependency` whose path is 512 code units of three-byte characters and whose `name` and `group` are each 256 lone surrogates, written as six-byte escapes, and every file entry an Unknown `path-not-citable` entry whose census-form path begins with 512 control characters. So the member alone never takes a check record past that bound, and the listing caps are unchanged."
  },
  {
    "where": "Scenario Derived record not current renders Unknown, its WHEN line",
    "old": "",
    "new": ", every path its facts name being the path of a `top-level-unit` fact the render re-derives"
  },
  {
    "where": "Form line Case: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " With the version 2.8 repairs, vary a check record carrying a `manifestFacts` member at every cap in its widest form, and check records of 16,777,216 bytes and one byte more, of 2,000,000 values and one more, and with a value nested 16 and 17 levels below the root, each read by review, render, close, the reading difference and the end screen; a derived record, otherwise read, naming a non-secret top-level directory the tree does not hold, one the tree holds past the render's listing of 250, a rule other than `top-level-unit` or a version other than 1, and a stale record whose every path the render derives; a deep-dive identity holding a character outside the Basic Multilingual Plane, a lone surrogate, or only the permitted characters; and a schema-v7 graph diagram lacking `nodes`, lacking `edges`, and carrying each of `participants`, `messages`, `lanes` and `steps`."
  },
  {
    "where": "Form line Observable: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " Each check-record reader's outcome for each such record (review's packets, render's site or refusal, close, the reading difference and the end screen's counts) and the member's encoded size; for each such derived record, the `derived-structure` region, `machine.json`'s `derivedStructure`, whether `derived-structure.json` is published, and every place the directory's name appears; each reading-ledger page name; and each finding and its path for each such graph diagram."
  },
  {
    "where": "Form line Oracle: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " For the version 2.8 repairs, the widest member built by hand from the stated caps outside the code under test and measured by encoding it as the check record does; the expected page names, regions, findings and paths written as literals in the fixture, never read from the code under test; and for unchanged bytes, the goldens of check records, pages, `machine.json`, `derived-structure.json` and the provider mode rendered before this version."
  },
  {
    "where": "Form line Falsifier: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " A reader of a draft check record refuses one within 16,777,216 bytes, 2,000,000 values and 16 levels below the root, reads one past any of them, or counts or reports such a record as a passed draft or a draft check refused; the `manifestFacts` member at this version's caps takes 10,000,000 bytes or more; a derived region, `machine.json` or published file names a path that no `top-level-unit` fact of the render's own re-derivation holds, or a rule or version other than `top-level-unit` version 1, or a record holding one is drawn, listed or published; a reading-ledger page name differs from the path the renderer's rule gives the same deep dive, or counts a surrogate pair as two characters; a schema-v7 graph diagram lacking `nodes` or `edges` reports a `schema` finding at that member's path or no `figure-kind` finding, or one carrying `participants`, `messages`, `lanes` or `steps` reports a `field-version` finding for it; a check record, page, `machine.json`, `derived-structure.json` or provider-mode byte changes for a run whose records check wrote under the same screen and Syzygy version as the render, whose check records each take at most 4,194,304 bytes, and whose deep-dive identities hold only the permitted characters."
  }
]
```

Which bead each serves:

- syzygy-3efd.68 (page name): the reading-ledger replacement.
- syzygy-3efd.67 (derived paths): the currency-paragraph addition and the narrowed WHEN line of "Derived record not current renders Unknown", whose case (facts other than those re-derived) now covers only records whose every path the render derives; a record naming another path is the new scenario's.
- syzygy-3efd.71 (graph members): the byte-identity sentence's replacement.
- syzygy-3efd.72 (read bound): the manifest-facts paragraph's addition.
- All four: the five scenarios and the four Form-line additions.

## Removed

None. No sentence of the predecessor is deleted. Two spans are replaced: the page-name clause keeps its predecessor's words except that "code unit" becomes "code point" and "replaced by" gains "one", with the rest appended before its semicolon; the byte-identity sentence keeps its predecessor's words up to its final period, which becomes a comma before the appended qualification.

## Bytes this version changes

[Inferred] Rendered, by the derived-record rule: for a run whose `derived/rev-<n>.json` names a top-level directory the render's re-derivation does not hold, or a rule or version other than `top-level-unit` version 1, `index.html`'s `derived-structure` region, `machine.json`'s `derivedStructure`, and the file `derived-structure.json` (no longer published). Rendered, by the read bound: for a run whose latest check passed and whose check record takes more than 4,194,304 and at most 16,777,216 bytes, render produces the whole site (every page, `machine.json`, `derived-structure.json` and every other published file) where version 2.7 refused with "the check result of draft revision <n> cannot be read", review builds its fidelity and design packets where it refused, and close takes that revision; and the run's end-screen line counting check outcomes no longer counts a check record it cannot read (one past the bound, or one that does not parse) as a draft check refused. Written: the check record's `readingLedger` member, and check's report, for a draft with a produced deep dive whose identity holds a character outside the Basic Multilingual Plane. Nothing else: every record check writes, every page of a run whose records check wrote under the render's own screen and Syzygy version and each take at most 4,194,304 bytes, every brief and draft schema, and every provider-mode byte are unchanged.

## Not changed, and why

[Inferred] The draft schema (`polaris-dossier-local-draft-v7` and earlier) and brief (`polaris-dossier-brief-v12` and earlier), every finding kind, every cap and listing rule of `manifestFacts`, the derived record's format and the bytes check writes for it, the region's words and reason codes, the currency policy, figure fit, shape packs, the screening policy and its detectors, and the provider mode. The check record's format identifier stays `polaris-dossier-check/1`.

# Version 2.3 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-figure-homes-and-fit/proposed/polaris-generation/spec.md` (figure homes and fit version 2.2, row A-18, tag `polaris-dossier-figure-homes-and-fit-v2.2`; that file's SHA-256 is `32bef7ddf28d36b3bc4e5d31a30caf1e82e509ab4779263ceb1c39f29f10632e`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject).

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.2 (and therefore after 2.0, and 2.1 where it is in force). Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 38 to 49 scenarios; no other requirement changes. Its warrants gain three contract clauses, RFC2-9 (the currency-bound declaration mechanism), RFC7-28 (curated diagrams; computed/curated provenance on every visual) and RFC9-38 (a scene names its evaluation, snapshot and as-of instant, on the surface), so its dependency union changes by those three.

[Inferred] The same adoption installs the policy `.syzygy/governance/policies/POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1.json`, the currency-bound declaration the new paragraphs name. RFC3-15 places currency-bound declarations (RFC2-9) in `policies/`, whose install gate is an agent adoption; the requirement names the policy and does not restate its values as its own declaration.

## Carried unchanged

[Observed] Every other line of the predecessor requirement (its paragraphs, its 38 scenarios, its `Oracle independence` line, the rest of its warrants block) appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a line diff against the predecessor shows exactly the changed lines listed below and the two insertions.

## Added

- Five paragraphs after the predecessor's last paragraph (figure fit), before the `ID:` line: what a derived structural fact is and the one rule (`top-level-unit`, version 1) whose facts render; the evidence record `derived/rev-<n>.json` that `syzygy dossier check` keeps per draft revision, its publication unchanged as `derived-structure.json` by each render with the render's re-derivation, and the `derivedStructure` member of `machine.json`; the currency bound, how a render reads the policy, and the Unknown outcomes with their fixed words; the `derived-structure` region on `index.html` with its figure, attributes and evidence text; and the separation from curated figures (no upgrade, `data-visual-provenance="curated"`, no draft reach, provider mode unaffected).
- 11 scenarios after "Figure fit stored and deterministic": Derived tree figure renders Observed; Rule without a declared currency bound renders Unknown; Derived record not current renders Unknown; No derived record, or a tree that cannot be listed; No size or object id derived for a private repository; Authored element stays dashed; Draft cannot set Observed; Derived legend and tally agree with the drawing; More top-level directories than the figure draws; Derived structure stable across renders; Provider mode unchanged by derived structure.

## Modified

[Observed] Nine changes inside existing lines. For the first two, only the quoted sentence of the line changes; for the next three the whole line is quoted; each Form line keeps its predecessor text as a prefix and gains the appended text. Old and new, quoted exactly:

```json
[
  {
    "where": "Labelling rules paragraph, last clause of its first sentence",
    "old": "and Observed is reserved for a quotation that Syzygy has verified.",
    "new": "and Observed is reserved for a quotation that Syzygy has verified and, in the operator-agent mode, for a derived structural fact that Syzygy renders under the derived-structure paragraphs below, which no draft can label, place or alter."
  },
  {
    "where": "Schema-v5 paragraph, its v4 byte-identity sentence",
    "old": "A draft in schema v4 or earlier SHALL be checked and rendered exactly as before this version, the same findings and the same bytes on every page, except that a `home` on one of its diagrams is a `field-version` finding.",
    "new": "A draft in schema v4 or earlier SHALL be checked and rendered exactly as before version 2.2, the same findings and the same bytes on every page, except that a `home` on one of its diagrams is a `field-version` finding, and except for the additions of version 2.3 that the derived-structure paragraphs below state, which every operator-agent check and rendering carries whatever its draft's schema: the record `derived/rev-<n>.json` in the run directory, the `derived-structure` region on `index.html`, `data-visual-provenance=\"curated\"` on each figure, the file `derived-structure.json`, the `derivedStructure` member of `machine.json`, and the size report's measures of the pages so changed."
  },
  {
    "where": "Scenario \"Agent labels its own claim Observed\", its last AND line",
    "old": "- **AND** Observed appears on the page only on a quotation Syzygy verified, and an Unknown block with no source to cite passes",
    "new": "- **AND** Observed appears on the page only on a quotation Syzygy verified or on a derived structural fact in the region Syzygy computes, and an Unknown block with no source to cite passes"
  },
  {
    "where": "Scenario \"Schema-v4 draft unchanged\", its THEN line",
    "old": "- **THEN** its findings and the bytes of every rendered page equal those the version before this one produces for the same draft",
    "new": "- **THEN** its findings and the bytes of every rendered page equal those version 2.1 produces for the same draft, except for the additions of version 2.3: the record `derived/rev-<n>.json`, the `derived-structure` region on `index.html`, `data-visual-provenance=\"curated\"` on each figure, the file `derived-structure.json`, the `derivedStructure` member of `machine.json` and the size report's measures of the pages so changed"
  },
  {
    "where": "Form line Case: the predecessor line is kept as a prefix and this text appended after one space",
    "old": "",
    "new": "With the derived structure, vary the pinned tree's top-level directories, root files, submodules and secret-matching paths, their number at one, past twelve and past 250, the repository's visibility and each exclusion ground, the committed currency policy's presence, digest and declaration for the rule, the record's presence, state, revision and facts, the tree listing's success at check and at render, a second render of one draft revision, a draft figure matching a derived fact, a draft element labelled `observed`, and the mode."
  },
  {
    "where": "Form line Observable: the predecessor line is kept as a prefix and this text appended after one space",
    "old": "",
    "new": "The run directory's `derived/rev-<n>.json`, the `derived-structure` region, its figure's drawing, legend, tally and list, each derived element's and entry's attributes and evidence text, every figure's `data-visual-provenance`, the file `derived-structure.json` and its digest, and the `derivedStructure` member of `machine.json`."
  },
  {
    "where": "Form line Oracle: the predecessor line is kept as a prefix and this text appended after one space",
    "old": "",
    "new": "For derived structure, the expected facts and counts computed from the fixture tree's paths and modes by an independent walk outside Syzygy, the expected digest recomputed from the written file's bytes, and the expected currency outcome fixed in the fixture from the fixture policy bytes and their digest."
  },
  {
    "where": "Form line Falsifier: the predecessor line is kept as a prefix and this text appended after one space",
    "old": "",
    "new": "A derived element is drawn solid or labelled Observed without a declared bound from the adopted policy bytes, for a record of another revision, or for facts the render's own re-derivation does not reproduce; a derived fact states a size, an object identifier, a body or anything its rule did not match, names a secret-matching path, or lacks its rule, version, path, record digest or revision in its attributes or evidence view; a figure lacks `data-visual-provenance`, a curated figure carries `computed` or draws a solid element, or the computed figure carries draft text; a draft element is upgraded to Observed, or a draft reaches the derived figure or record; the published record differs from the kept one or its digest from its bytes, or the record lacks its source, capture time, scope or provenance; a re-render of one draft revision changes a byte outside the review-status region; the derived figure's legend or tally disagrees with its drawing; a provider-mode byte changes."
  },
  {
    "where": "Warrants block, contracts line",
    "old": "  contracts: [RFC2-23, RFC2-24, RFC5-17, RFC7-2, RFC7-9, RFC7-10, RFC7-13, RFC7-19, RFC7-20, RFC7-33, RFC7-34, RFC4-19, RFC5-14]",
    "new": "  contracts: [RFC2-23, RFC2-24, RFC5-17, RFC7-2, RFC7-9, RFC7-10, RFC7-13, RFC7-19, RFC7-20, RFC7-33, RFC7-34, RFC4-19, RFC5-14, RFC2-9, RFC7-28, RFC9-38]"
  }
]
```

The first change is the one the owner decision named: the predecessor reserved Observed for "a quotation that Syzygy has verified"; it now also covers a derived structural fact rendered under the new paragraphs, and only in the operator-agent mode. The second and fourth re-anchor version 2.2's "before this version" and "the version before this one" to the version they were written against (2.1), so the v4 byte-identity promise stays true while version 2.3 adds its record, region, attribute, published file, machine-view member and the size report's changed measures to every operator-agent check and rendering.

## Removed

None. No sentence of the predecessor is deleted; the two re-anchored sentences keep every word but the version reference and gain a clause.

## Not changed, and why

[Inferred] The brief is unchanged (`polaris-dossier-brief-v10`, schema v5): a draft gains no field and is told nothing new, since no draft can reach the derived figure. Figure-fit advice examines the draft's diagrams only, as before; the computed figure is not a draft diagram. The check record (`checks/rev-<n>.json`) is unchanged: the derived record is a file of its own beside it. The draft schemas are unchanged: they already carry no `observed` label for a diagram element, so a draft element labelled Observed is already a finding.

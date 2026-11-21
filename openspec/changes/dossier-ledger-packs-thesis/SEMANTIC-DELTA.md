# Version 2.4 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-derived-observed-facts/proposed/polaris-generation/spec.md` (derived observed facts version 2.3, row A-19, tag `polaris-dossier-derived-observed-facts-v2.3`; that file's SHA-256 is `6c663a807817f825a7a3c6f1f9ff39864745e57ae6c3bb6a8498d98c90fad461`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject).

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.3 (and therefore after 2.2, 2.0, and 2.1 where it is in force). Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 49 to 60 scenarios; no other requirement changes. Its warrants gain one parent requirement, REQ-polaris-generation-014 (the reader standards are guidance, never a completion oracle), so its dependency union changes by that one entry. Nothing is installed under `.syzygy/governance/`: the shape packs are implementation data the requirement describes.

## Carried unchanged

[Observed] Every other line of the predecessor requirement (its paragraphs, its 49 scenarios, its `Oracle independence` line, the rest of its warrants block) appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a line diff against the predecessor shows, besides the file's title and preamble, exactly the changed lines listed below and the insertions.

## Added

- Eight paragraphs after the predecessor's last paragraph (derived structure kept apart from curated figures), before the `ID:` line: the reading ledger's pages and placement; its member `readingLedger` and its numbers; check's `readingDifference` and how the previous run is found; the shape-pack schema and the two packs; the `server-entry` trait rule, selection and composition; the brief's composed reader standards, the design packet and the brief record's `shapePacks`; schema v6's `thesisBasis`, brief v11 and the `thesis-basis` finding; and the rendered thesis-basis line and `machine.json`'s `thesisBasis`.
- 11 scenarios after "Provider mode unchanged by derived structure": Reading ledger stored with the check; Reading ledger deterministic; Difference from the previous run of the repository; No previous run gives an Unknown difference; Server pack keeps the brief; Default pack drops server-only dimensions; Pack selection recorded and deterministic; Code-read thesis marked; Unsupported thesis basis refused; Thesis basis in an earlier schema; Withheld thesis carries no basis line.

## Modified

[Observed] 8 changes inside existing lines. Where a Form line or the warrants line is named, the predecessor line is kept as a prefix and the text is appended after it; otherwise the quoted span is replaced. Old and new, quoted exactly:

```json
[
  {
    "where": "Schema-v5 paragraph",
    "old": "The brief, issued as `polaris-dossier-brief-v10` with readability guidance `polaris-dossier-readability-v5`, SHALL state that a v5 diagram names its home and SHALL name the three kinds and the `target` key; it issues schema v5, and a draft in v2, v3, v4 or v5 is accepted. A draft in schema v4 or earlier SHALL be checked and rendered exactly as before version 2.2, the same findings and the same bytes on every page, except that a `home` on one of its diagrams is a `field-version` finding, and except for the additions of version 2.3 that the derived-structure paragraphs below state, which every operator-agent check and rendering carries whatever its draft's schema: the record `derived/rev-<n>.json` in the run directory, the `derived-structure` region on `index.html`, `data-visual-provenance=\"curated\"` on each figure, the file `derived-structure.json`, the `derivedStructure` member of `machine.json`, and the size report's measures of the pages so changed.",
    "new": "The brief, issued as `polaris-dossier-brief-v10` with readability guidance `polaris-dossier-readability-v5`, and from version 2.4 as `polaris-dossier-brief-v11` with the same readability guidance, SHALL state that a v5 diagram names its home and SHALL name the three kinds and the `target` key; brief v10 issues schema v5 and brief v11 issues schema v6 (below), and a draft in v2, v3, v4, v5 or v6 is accepted. A draft in schema v4 or earlier SHALL be checked and rendered exactly as before version 2.2, the same findings and the same bytes on every page, except that a `home` on one of its diagrams is a `field-version` finding, and except for the additions of version 2.3 that the derived-structure paragraphs below state, which every operator-agent check and rendering carries whatever its draft's schema: the record `derived/rev-<n>.json` in the run directory, the `derived-structure` region on `index.html`, `data-visual-provenance=\"curated\"` on each figure, the file `derived-structure.json`, the `derivedStructure` member of `machine.json`, and the size report's measures of the pages so changed; and except for the additions of version 2.4, the `readingLedger` member of its check record and a `field-version` finding for a `thesisBasis` member. A draft in schema v5 SHALL be checked and rendered exactly as version 2.3 checks and renders it, except for those same two additions of version 2.4."
  },
  {
    "where": "Figure-fit paragraph",
    "old": "Unlike check's other advice, which is on its report only, the advice SHALL also be written into the check record that check writes once for the revision, `checks/rev-<n>.json`, and into no other check record (an inventory check record carries none), as its member `figureFit`: `{\"textPx\": 13, \"minTextPx\": 11, \"viewports\": [{\"viewportPx\": 1440, \"columnPx\": 966}, {\"viewportPx\": 390, \"columnPx\": 261}], \"examined\": <count>, \"entries\": [...]}`, its entries in the draft's diagram order and then the viewport order 1440, 390.",
    "new": "Unlike check's other advice, which is on its report only (the reading ledger below stores only counts of it), the advice SHALL also be written into the check record that check writes once for the revision, `checks/rev-<n>.json`, and into no other check record (an inventory check record carries none), as its member `figureFit`: `{\"textPx\": 13, \"minTextPx\": 11, \"viewports\": [{\"viewportPx\": 1440, \"columnPx\": 966}, {\"viewportPx\": 390, \"columnPx\": 261}], \"examined\": <count>, \"entries\": [...]}`, its entries in the draft's diagram order and then the viewport order 1440, 390."
  },
  {
    "where": "Scenario \"Schema-v4 draft unchanged\", its AND line",
    "old": "- **AND** a diagram of such a draft that carries `home` is a `field-version` repair finding",
    "new": "- **AND** a diagram of such a draft that carries `home`, and such a draft that carries `thesisBasis`, is each a `field-version` repair finding"
  },
  {
    "where": "Form line Case: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " With the reading ledger, vary the draft's Poles, why section, deep dives and their dispositions, figure homes, advisories of each standard and figure-fit entries, a section in no Pole, checking one draft twice and checking an inventory; and vary the state root's other runs: none, one of another repository, one of this repository with and without a ledger, two of this repository with different and equal check times, and pages added, removed, changed and unchanged between two ledgers. With shape packs, vary each `server-entry` basename and each exclusion ground, a secret-matching path, the trait profile's derivation, a brief record naming an unshipped pack or a digest the recomposition does not give, and the mode. With thesis basis, vary `thesisBasis` over its three values and its absence, the introduction's label, basis, quotations and citations, each cited path's rules, withheld spans, a withheld draft layer and the schema version."
  },
  {
    "where": "Form line Observable: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " Each check record's `readingLedger` and its bytes, check's report's `readingDifference`, `unreadableRuns` and `unreadableCheckRecords`, and every file a check writes; the structure record's `traits.serverEntry`; the brief, its sentence before the standards, its reader-standards section and heading, the brief record's `readerStandards` and `shapePacks`, and the design packet's standards, their introducing sentence and its refusals; each `thesis-basis` and `field-version` finding, the thesis-basis line and its place, and `machine.json`'s `thesisBasis`."
  },
  {
    "where": "Form line Oracle: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " For the reading ledger, the expected pages and numbers computed by hand from the fixture draft by the stated rules, never from check's code; for the difference, the expected entries fixed in the fixture from two hand-written ledgers and their runs' records; for shape packs, the expected selection fixed per fixture tree, the expected server-selection brief taken from the brief-v10 golden with the stated lines changed, and the default pack's composed lines fixed in the fixture as literals; for thesis basis, the expected findings and line fixed in the fixture."
  },
  {
    "where": "Form line Falsifier: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " The reading ledger differs between two checks of the same draft bytes, places a unit, figure or advisory on a page these rules do not place it on, counts the derived figure, or appears in an inventory check record; a difference is written to a file, compares a run of another repository, finds its predecessor by directory name or URL, or reports a number where no predecessor exists; a difference claims an absence over a run or check record it could not read; a ledger or difference changes an outcome or a finding. The selection `default@1`, `server@1` changes a byte of the carried standards, their heading or `readerStandards`, or a brief for it differs from brief v10 beyond the stated lines; a brief of the default pack alone carries a server-only dimension; one tree yields two selections, a selection rests on anything but the trait profile, or a brief record lacks its packs, digests or reasons; a secret-matching path is named or counted for a trait, or alone makes it hold; a composed standards text is carried under version 1's digest or sentence, or a design packet falls back to version 1 when recomposition fails; a provider-mode byte changes. A `code-reading` thesis passes with fewer than two entry points, with a quotation, or not Inferred from sources; a `stated` thesis passes citing nothing; a `none` thesis passes Inferred; the thesis-basis line is missing for a rendered `code-reading` thesis, renders for `stated` or `none` or beside a withheld introduction, sits inside the introduction's block, or carries a label token; a draft of schema v5 or earlier yields a finding or a byte other than those stated."
  },
  {
    "where": "Warrants block, parent_requirements line",
    "old": "  parent_requirements: [REQ-polaris-generation-002, REQ-polaris-generation-003, REQ-polaris-generation-004, REQ-polaris-generation-006, REQ-polaris-generation-012, REQ-polaris-generation-019, REQ-polaris-generation-025, REQ-polaris-generation-033]",
    "new": "  parent_requirements: [REQ-polaris-generation-002, REQ-polaris-generation-003, REQ-polaris-generation-004, REQ-polaris-generation-006, REQ-polaris-generation-012, REQ-polaris-generation-019, REQ-polaris-generation-025, REQ-polaris-generation-033, REQ-polaris-generation-014]"
  }
]
```

The first change spans two adjacent sentences of the schema-v5 paragraph, quoted together: the brief sentence re-states which brief issues which schema (brief v10 still issues v5, brief v11 issues v6), and the v4 byte-identity sentence stays true by naming the two additions of version 2.4 every check carries (the check record's `readingLedger`, and a `field-version` finding for `thesisBasis`), followed by a new sentence giving a v5 draft the same promise against version 2.3. The second keeps the figure-fit paragraph true now that the ledger stores counts of the other advice. The scenario's AND line names the new `field-version` case beside `home`.

## Removed

None. No sentence of the predecessor is deleted.

## Not changed, and why

[Inferred] The reader topics, the voice rules, the dossier and readability guidance, the provider profile's questions and requested assets, the figure-fit constants, the 2.3 derived structure and its currency policy, review and readiness are unchanged. The check record's format identifier stays `polaris-dossier-check/1`, as it did when `figureFit` was added.

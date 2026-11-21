# Version 2.5 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-ledger-packs-thesis/proposed/polaris-generation/spec.md` (ledger, packs and thesis version 2.4, row A-20, tag `polaris-dossier-ledger-packs-thesis-v2.4`; that file's SHA-256 is `500a7771f3df85046ff2c0c41a36c2067cf0bf44b1ba65e5bb5f52d4dbd9fded`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject).

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.4 (and therefore after 2.3, 2.2, 2.0, and 2.1 where it is in force). Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 60 to 70 scenarios; no other requirement changes. Its warrants block is unchanged, so its dependency union (`GOVERNING-DEPENDENCIES.json`) is byte for byte version 2.4's. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every other line of the predecessor requirement (its paragraphs, its 60 scenarios, its `Oracle independence` line and its warrants block) appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a line diff against the predecessor shows, besides the file's title and preamble, exactly the changed lines listed below and the two insertions.

## Added

- Five paragraphs after the predecessor's last paragraph (the rendered thesis-basis line), before the `ID:` line: schema v7 and the two records, with the node and edge rule mapping; the findings, brief v12 and its one paragraph quoted whole, and the earlier schemas' byte identity; the two layouts and their constants; the rendered figure, its phone form and the stylesheet's container rule; and figure fit by the displayed form, the declarative sources, `machine.json`'s `figureStructures`, the reading ledger and the provider mode.
- 10 scenarios after "Withheld thesis carries no basis line": Sequence figure drawn; Swimlane figure drawn; Figure kinds fit at both widths; Swimlane reads as a numbered stepper on a phone; Message naming an unknown participant refused; Members that do not fit the kind refused; Figure kinds in an earlier schema; Graph figures unchanged by figure kinds; Brief v12 states the figure kinds; Provider mode unchanged by figure kinds.

## Modified

[Observed] 9 changes inside existing lines. Where a Form line is named, the predecessor line is kept as a prefix and the text is appended after it; otherwise the quoted span is replaced. Old and new, quoted exactly (generated from the build script's own change list):

```json
[
  {
    "where": "Schema-v5 paragraph, the brief sentence",
    "old": "The brief, issued as `polaris-dossier-brief-v10` with readability guidance `polaris-dossier-readability-v5`, and from version 2.4 as `polaris-dossier-brief-v11` with the same readability guidance, SHALL state that a v5 diagram names its home and SHALL name the three kinds and the `target` key; brief v10 issues schema v5 and brief v11 issues schema v6 (below), and a draft in v2, v3, v4, v5 or v6 is accepted.",
    "new": "The brief, issued as `polaris-dossier-brief-v10` with readability guidance `polaris-dossier-readability-v5`, from version 2.4 as `polaris-dossier-brief-v11` and from version 2.5 as `polaris-dossier-brief-v12`, each with the same readability guidance, SHALL state that a v5 diagram names its home and SHALL name the three kinds and the `target` key; brief v10 issues schema v5, brief v11 issues schema v6 and brief v12 issues schema v7 (below), and a draft in v2, v3, v4, v5, v6 or v7 is accepted."
  },
  {
    "where": "Schema-v5 paragraph, the byte-identity sentences",
    "old": "and except for the additions of version 2.4, the `readingLedger` member of its check record and a `field-version` finding for a `thesisBasis` member. A draft in schema v5 SHALL be checked and rendered exactly as version 2.3 checks and renders it, except for those same two additions of version 2.4.",
    "new": "and except for the additions of version 2.4, the `readingLedger` member of its check record and a `field-version` finding for a `thesisBasis` member; and except for the addition of version 2.5, the `field-version` findings it states, in place of the `schema` findings at the same paths, for a diagram whose kind is `sequence` or `swimlane` or that carries `participants`, `messages`, `lanes` or `steps`. A draft in schema v5 SHALL be checked and rendered exactly as version 2.3 checks and renders it, except for those same two additions of version 2.4 and that addition of version 2.5."
  },
  {
    "where": "Figure-fit paragraph, the drawn-width sentence",
    "old": "so D = W, and where W = 1048 px, D = min(W, max(C, 860 px)).",
    "new": "so D = W, and where W = 1048 px, D = min(W, max(C, 860 px)); a sequence or swimlane figure (version 2.5) is drawn, and its fit taken, as the figure-kind paragraphs below state."
  },
  {
    "where": "Scenario \"Schema-v4 draft unchanged\", its AND line",
    "old": "- **AND** a diagram of such a draft that carries `home`, and such a draft that carries `thesisBasis`, is each a `field-version` repair finding",
    "new": "- **AND** a diagram of such a draft that carries `home`, such a draft that carries `thesisBasis`, and a diagram of such a draft whose kind is `sequence` or `swimlane` or that carries `participants`, `messages`, `lanes` or `steps`, is each a `field-version` repair finding"
  },
  {
    "where": "Form line Case: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " With figure kinds, vary a diagram's kind over the six graph kinds, `sequence` and `swimlane`; each kind's members present, absent and swapped for another kind's; each count at, below and past its bounds; each `from`, `to` and `lane` resolving in its own diagram, naming an element of another diagram and naming nothing; a message to itself; consecutive steps in one lane and in two; a participant or lane named by nothing; withheld participants, messages, lanes and steps; each home; the schema version from v2 to v7; the mode; and the width of the figure's box, at 390 and 1440 px and at each W and one pixel less."
  },
  {
    "where": "Form line Observable: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " Each `unresolved-reference`, `figure-kind`, `figure-unused` and `field-version` finding and its location; each sequence and swimlane figure's attributes, drawing coordinates, laid-out width and height, phone form, legend, tally, list of every component and relationship and declarative source; which form is displayed, and the figure box's and the page's scroll width against their client width, at 390 and 1440 px in a browser with scripts off; the style rules each page carries; each check record's `figureFit` for these figures; `machine.json`'s `figureStructures` and claims; and brief v12."
  },
  {
    "where": "Form line Oracle: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " For figure kinds, the expected coordinates, laid-out widths and heights of the fixture's small sequence and swimlane computed by hand from the stated constants and written as literals, never read from the layout's code; the expected findings, phone-form text, tally and declarative source fixed in the fixture; the displayed form and scroll widths measured in a browser at both viewports, never computed by the renderer; and for unchanged bytes, the goldens of graph figures, of schema-v6 and earlier drafts and of the provider mode rendered before this version."
  },
  {
    "where": "Form line Falsifier, a carried clause replaced in place",
    "old": "a draft of schema v4 or earlier yields a different finding or page byte;",
    "new": "a draft of schema v4 or earlier yields a different finding or page byte, other than the `field-version` findings versions 2.4 and 2.5 state;"
  },
  {
    "where": "Form line Falsifier: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " A sequence or swimlane passes whose `from`, `to` or `lane` names nothing in its own diagram, whose members are another kind's, or whose participant or lane nothing names; such a diagram in a draft of schema v6 or earlier yields no `field-version` finding; a `figure-kind` or `field-version` finding stands at a path other than the stated one, beside a `schema` finding at that path, or not in its place; a count outside its bounds passes; a laid-out width differs from 40 + 184 x n px, or a figure of these kinds whose layout resolves has a figure-fit entry at 1440 or 390, or one whose layout does not is reported as fitting; at some width of its box both forms or neither are displayed, either form scrolls sideways at 390 px, or the switch needs a script; the phone form carries an identity, citation, anchor or label token, or text other than the stated item form, or its order differs from the draft's; a declarative source differs from the stated statements, indentation or final newline; a message's or step's order arrow carries a claim or enters the tally; a graph-kind figure, a page holding no figure of these kinds, a draft of schema v6 or earlier, or its `machine.json` changes a byte; `figureStructures` appears in a render with no such figure, or omits one; brief v12 differs from brief v11 beyond the stated lines; a provider-mode byte changes."
  }
]
```

The first two changes are in the schema-v5 paragraph: the brief sentence names brief v12 and schema v7 beside the earlier briefs and schemas, and the byte-identity sentences for drafts of schema v5 or earlier name the one addition of version 2.5 every check carries, a `field-version` finding for the new kinds or members. The third tells a reader of the figure-fit paragraph that the two new kinds are drawn and measured as the new paragraphs state, so its "D = W" sentence is not read as covering a phone form. The scenario's AND line names the new `field-version` case beside `home` and `thesisBasis`. The carried Falsifier clause on drafts of schema v4 or earlier is qualified in place, so that it does not count the `field-version` findings versions 2.4 and 2.5 state as a broken promise (review finding F7); the predecessor's own wording had the same tension for `thesisBasis`.

## Removed

None. No sentence of the predecessor is deleted.

## Not changed, and why

[Inferred] The six graph kinds, their record, layout, findings and rendering; the figure-fit constants (966 and 261 px, 13 and 11 px, the 1048 px rule); the readability guidance `polaris-dossier-readability-v5`; the reading ledger, shape packs and thesis basis of version 2.4; the 2.3 derived structure; review, readiness, secret screening and the screening policy; and the provider mode are unchanged. The check record's format identifier stays `polaris-dossier-check/1`.

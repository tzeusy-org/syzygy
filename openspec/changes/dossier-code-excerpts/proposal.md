# Dossier code excerpts — version 2.54

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10, built over walk errata 2.53 (design D1).

## Why

- [Observed] syzygy-3efd.33 (Q5 S2): "A code excerpt shows line numbers, highlighted ranges and cited margin notes, and the brief tells the author to use one where a mechanism is explained", with the exclusions "no syntax highlighting; no excerpt of a blob screening excludes; the transcript variant for command-line sessions is left to a later slice", and the note "the walk element's shape from syzygy-3efd.32, so notes and steps share one citation form".
- [Observed] Since the rich elements a code excerpt is one citation of 1 to 60 lines that Syzygy renders from its own read as an Observed quotation. Nothing numbers its lines, points at the lines that matter or ties a line to the paragraph that explains it, and the brief never asks for an excerpt.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- Draft schema v18: a code excerpt may carry `highlights`, 1 to 12 `{"startLine", "endLine"}`, and `notes`, 1 to 12 `{"line", "block"}`, `block` a cited paragraph of the excerpt's place, as a walk step's `block` is.
- Check: `code-highlight` findings for a highlight that is reversed, outside the excerpt's lines or not after the one before it; `code-note` findings for a note's line outside the excerpt or not after the one before it, and for a paragraph with no citation; `unresolved-reference` where `block` names no paragraph of the place. They read no blob and hold whatever screening decides.
- Render: a verified excerpt of a v18 draft is framed with a gutter of line numbers beside its `<pre>`, which is byte for byte unchanged, bands under its highlighted lines, a sentence naming them, and a list of notes linking each paragraph; the numbers and bands line up by construction, copying the code copies no number, and nothing runs.
- Earlier schemas: `highlights` and `notes` are `field-version` findings in v3 to v17, and those drafts keep every byte.
- Brief v26 issues schema v18, with one paragraph after the level paragraph asking for an excerpt where a mechanism is explained.
- Ten scenarios are added, and the four Form lines are extended.

## Non-goals

[Inferred] The following are left out:
- syntax highlighting, and any change to the excerpt's own lines, quotation parts or fidelity rules;
- an excerpt of a blob screening excludes: its highlights and notes render nowhere, as it renders Unknown today;
- the transcript variant for command-line sessions (a later slice);
- a note's own text (design D2);
- numbered lines for drafts of schema v17 or earlier (design D4);
- the code, which follows on syzygy-3efd.33 itself (`design.md` D8).

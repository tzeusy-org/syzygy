# Dossier walk advice — version 2.47

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10, built over view levels 2.45 (design D1).

## Why

- [Observed] syzygy-3efd.35 (Q5 S4): "check advises the author when a walk step only restates the label of the element it points at, so walks explain instead of narrating the picture", with the exclusion "advice only; no gate", and the design note "comparing a step's text with its element's label after normalising case and punctuation; state the similarity rule exactly".
- [Observed] Since 2.40 a walk ties each step's element to one of the place's cited paragraphs, and whether that paragraph explains the element is "the authoring session's report and the fidelity and rendered-design reviews' judgement, never a check". Nothing tells the author, at check, that a step's paragraph only repeats the element's name.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- Check's report gains a member `walkAdvice`, `{"rules": [{"id": "walk-step-restates-label", "version": 1}], "examined", "advisories"}`, for a v16 or v17 draft with no `schema` finding, in the manner of 2.33's `figureAdvice`.
- Rule `walk-step-restates-label` version 1 reads each step of each walk with no finding, comparing the paragraph's words with the label's words:
  - both texts are lowercased A to Z, every character that is not a letter or digit becomes a space, and the result is split into words;
  - 30 listed filler words of the paragraph are ignored;
  - a paragraph word matches a label word where they are equal or one is the other plus `s` or `es`;
  - the step is advised on where every non-filler paragraph word matches; one new word stops it (threshold zero).
- The label is the draft's `label` for a model element or node, the expansion's for an expansion node, and Syzygy's label (2.40) for a base element, never a `names` display name.
- The advisory's detail names the figure, the step number and the paragraph's identity, never a word of the draft or a path (2.35 screening).
- It gates nothing and moves no finding, record, page or brief; a failure to compute it leaves no member. It reads no 2.45 `level`, `scope` or zoom link.
- Seven scenarios are added, and the four Form lines are extended.

## Non-goals

[Inferred] The following are left out:
- a reader standard or a brief change (design D2): the brief, its standards and their digest are unchanged;
- any fuzzy similarity (edit distance, stems beyond a plural `s` or `es`, synonyms) or a fractional threshold;
- reading other elements' labels or the figure's arrows as "the picture";
- a repair finding, an outcome, a review input or a rendered byte;
- the code, which follows on syzygy-3efd.35 itself (`design.md` D7).

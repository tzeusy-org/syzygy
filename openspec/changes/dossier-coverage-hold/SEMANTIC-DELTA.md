# Version 2.28 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-035 is the MODIFIED text in `openspec/changes/dossier-run-tree-read-bounds/proposed/polaris-generation/spec.md` (run-tree read bounds version 2.18, row A-53; that file's SHA-256 is `84fc7c71221705b6a2b614e3acf4496d10bb2e3ba4815c1e776ad450b3bc19a5`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject). A sweep of every `openspec/changes/*/proposed/polaris-generation/spec.md` and `specs/polaris-generation/spec.md` for `ID: REQ-polaris-generation-035` finds four files (local-agent mode, URL declared-source run 2.1, declared-source model 2.0, run-tree read bounds 2.18); versions 2.19 to 2.26 do not replace 035.

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-035 replaces that text. Its ID, Source line, Scope line, requirement name and warrants block are unchanged, and its Form block gains one line, so its dependency union is the predecessor's 035 warrants. The requirement goes from 40 to 44 scenarios; no other requirement changes. The paragraph names the rule of check's inventory-coverage advice (REQ-polaris-generation-034 since version 2.12) as the coverage rule it reuses and REQ-polaris-generation-048 as the supervisor it binds; 034 is already a parent of 035, and 048's own text is unchanged. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] `docs/evidence/syzygy-5dhm-29/coverage_hold_survival.py` over the two blocks: all 206 non-empty predecessor lines carried in order, byte for byte, 18 non-empty lines added and nothing else (206 + 18 = 224); 40 predecessor scenarios, 44 successor scenarios. The proposed file is built by `coverage_hold_build_spec.py`, which asserts the predecessor's digest.

## Added

1. One paragraph, after the paragraph beginning "Since version 2.18 every reader of a file this requirement states": the hold (the text is in `proposed/polaris-generation/spec.md`).
2. Four scenarios, after the predecessor's last scenario ("Delivered packet read under its recorded size") and before `Form: lifecycle transition.`: "Fidelity review waits for an entry without an outcome", "The review proceeds once every entry has an outcome", "Earlier drafts and withheld entries do not hold the review", "The supervisor tells the author once".
3. One line after the Form block's `**Falsifier:**` line: "**Case, oracle and falsifier (coverage hold):**", naming the fixture, its literal oracle and what falsifies it (CC-SPEC-4).

## Displaced

None. No sentence of the predecessor is removed or reworded. [Inferred] Before this version 035 required a fidelity packet to be emitted for each review once its inputs were frozen; the hold adds a precondition to that emission and changes nothing a packet holds.

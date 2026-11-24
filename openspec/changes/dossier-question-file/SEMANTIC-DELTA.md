# Version 2.27 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-033 is the MODIFIED text in `openspec/changes/dossier-verify-text/proposed/polaris-generation/spec.md` (verify-text version 2.21; that file's SHA-256 is `a5453cb1a5c8813fbba513e0b232e6cfc483ceb7ee87061b7f7b67516f0d9cd7`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject). Versions 2.22 to 2.26 change only REQ-polaris-generation-034 and -006. No later version replaces REQ-033.

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-033 replaces that text. Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 16 to 18 scenarios; no other requirement changes. Its warrants block is the predecessor's byte for byte, so its dependency union is the predecessor's and `GOVERNING-DEPENDENCIES.json` is version 2.21's file, byte for byte.

## Carried unchanged

[Observed] Every line of the predecessor requirement, from `### Requirement: Operator-agent authoring mode` to the end of its warrants block, is carried byte for byte: the proposed block is the predecessor block with insertions only. A script over the two blocks (`docs/evidence/syzygy-5dhm-21/question_file_delta.py`) finds all 110 non-empty predecessor lines in the proposed block in their order, 16 and 18 scenarios, and 9 added non-empty lines. The proposed file's SHA-256 is `13cd442575ceef40b6798833f510a29ca0589dc95256f1a9a391e201e9e7b23a`.

## Added

1. One paragraph, before the paragraph beginning "The run record and the dossier's appendix SHALL disclose in human form": the run record's `questionFile` member (format `polaris-question-file/1`, version, SHA-256), what the question file holds, how an earlier record is read, and that no held-out text enters an authoring, inventory, editor or scout packet.
2. Two scenarios, after the predecessor's last scenario ("Verify writes nothing into a run") and before `Form: event-response.`: "The run record names the question file" and "Held-out text never reaches an authoring packet".
3. One line after the Form block's "**Case, oracle and falsifier (verify):**" line: "**Case, oracle and falsifier (question file):**" (CC-SPEC-4).

## Displaced

None. No sentence of the predecessor is removed or reworded.

## Observable change

[Inferred] A run initialised after adoption writes `run.json` with one more member, so its bytes differ from a run initialised before; nothing rendered changes, and the brief's bytes are unchanged (its topics move into the question file with the same words and order). A stored run record without the member is read as before.

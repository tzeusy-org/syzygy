# Version 2.27 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-033 is the MODIFIED text in `openspec/changes/dossier-verify-text/proposed/polaris-generation/spec.md` (verify-text version 2.21; that file's SHA-256 is `a5453cb1a5c8813fbba513e0b232e6cfc483ceb7ee87061b7f7b67516f0d9cd7`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject). Versions 2.22 to 2.26 change only REQ-polaris-generation-034 and -006. No later version replaces REQ-033.

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-033 replaces that text. Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 16 to 18 scenarios; no other requirement changes. Its warrants block is the predecessor's byte for byte, so its dependency union is the predecessor's and `GOVERNING-DEPENDENCIES.json` is version 2.21's file, byte for byte.

## Carried unchanged

[Observed] Every line of the predecessor requirement, from `### Requirement: Operator-agent authoring mode` to the end of its warrants block, is carried byte for byte: the proposed block is the predecessor block with insertions only. A script over the two blocks (`docs/evidence/syzygy-5dhm-21/question_file_delta.py`) finds all 110 non-empty predecessor lines in the proposed block in their order, 16 and 18 scenarios, and 11 added non-empty lines. The proposed file's SHA-256 is `147954d8089b52e98deadf9710c061324c670f8ddfc4b7406fedbb9ab8c18b18`.

## Added

1. One paragraph, before the paragraph beginning "The run record and the dossier's appendix SHALL disclose in human form": the run record's `questionFile` member (format `polaris-question-file/1`, version, SHA-256); what the question file holds (a public part the brief and the provider profile read, from which the reader-questions file the reader test and scorecard are given is derived; a held-out part giving per subject and list a frozen reference by evaluator key identifier, digest and count, or a not-written state, with the depth and task counts fixed); how an earlier record is read; that the binding is not rendered in this version; and that no held-out text enters the packets of an authoring (author or editor), inventory, reviewer or scout session, with the evaluator custody rule, the public regression boundary, the synthetic control coverage and the Unknowns stated.
2. Two scenarios, after the predecessor's last scenario ("Verify writes nothing into a run") and before `Form: event-response.`: "The run record names the question file" and "Synthetic hold-out checks cover selected packets and supervised mounts".
3. One line after the Form block's "**Case, oracle and falsifier (verify):**" line: "**Case, oracle and falsifier (question file):**" (CC-SPEC-4).

## Displaced

None. No sentence of the predecessor is removed or reworded.

## Observable change

[Inferred] A run initialised after adoption writes `run.json` with one more member, so its bytes differ from a run initialised before; nothing rendered changes, and the brief's bytes are unchanged (its topics move into the question file with the same words and order). A stored run record without the member is read as before.

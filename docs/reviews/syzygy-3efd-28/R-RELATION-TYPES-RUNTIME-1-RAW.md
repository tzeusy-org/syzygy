# Independent runtime review of Syzygy relation types 2.19

Verdict: REVISE

[Observed] Reviewed commit `f69f08661b21706a83dcc2d778284085021fc1a1` over `2a1ef3e8e5f4ba404184143079af52b226bff94a` in an independent detached checkout. Governing text is REQ-polaris-generation-034 version 2.19 (A-52), especially the unit and witness clauses at lines 90–106, and SEC-5. This is a review of Syzygy’s implementation under CC-REV-1, in the secrets and deterministic observation classes.

## Findings

### F1 — Blocking — The fidelity review packet keeps detector-matched unit values

[Observed] In `packages/polaris-dossier/src/relation-witness.ts:114`–122, hidden paths intentionally bypass the unit blob check. `packages/polaris-dossier/src/relation-types.test.ts:409`–415 confirms that a draft with a matched package-manifest unit passes and the resulting site does not name the path. The fidelity packet is a separate output. `packages/polaris-dossier/src/review-packet.ts:80`–93 drops the discovery account and collects citations for span screening. A v9 diagram node’s `unit` is outside the citation collection. `review-packet.ts:167` embeds all remaining draft members and lines 178–181 serialize the packet. The same packet builder supplies session delivery in `packages/polaris-dossier/src/session-handover.ts:292` and 477.

[Inferred] The v9 runtime would therefore send a structured detector-matched unit value to a fidelity review session even when the check and render protect it. SEC-5 governs that output regardless of the spec design note that leaves packet treatment unconfirmed. Apply the bound screening decision to structured unit values at packet emission, keeping the frozen original and well-formed unaffected subjects. Verify the entire serialized packet with a harmless marked test value, in addition to the existing check and site assertions.

### N1 — Note — A refused SVG can retain a machine edge

[Observed] `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:602`–605 accumulates machine edge rows while preparing the edge list. Lines 614–619 can replace the entire diagram with its unresolved notice if layout or the inert SVG check refuses. The accumulated rows still reach `machine.json` at line 1039.

[Inferred] The recognized fallback can claim a drawing was present via the machine output even though the human page only carries a notice. REQ-034 line 102 ties the machine member to the edge as rendered. Publish the diagram’s rows after the successful draw, alongside the drawing. I did not find a current check-passing fixture that produces this refusal, so this is a fallback-path note.

## Acceptance and evidence

- AC1, identical-type edge renders solid with provenance. [Observed] `relation-types.test.ts:186`–205 exercises the real check and render entry points and verifies the SVG group, exact evidence note and record digest, legend, tally, machine entry and exclusion from draft claims.
- AC2, a different relation does not upgrade. [Observed] `relation-types.test.ts:232`–248 verifies independent machine reasons, no solid arrow and preserved original authored edge where the relation cannot witness. `relation-witness.test.ts` additionally exercises exact type, direction, unit and rule equality.
- AC3, challenge only under complete coverage. [Observed] `relation-types.test.ts:256`–260 verifies the literal finding and its path at the edge. Lines 288–304 cover partial structure, including submodules, secret paths and unlisted units, and exercise an Unknown edge with a witnessed control.
- AC4, provider golden and full gate. [Observed] An independent detached run passed 22 unit tests across the witness and provider golden files and 25 relation integration tests. The exact-base byte comparison contains 28 synthetic v2–v8 inputs and 490 corresponding files. Differences are the intended v15 brief bundle and the earlier-schema relation-field exception in check records. Its denominator is the synthetic corpus, with the supported provider golden verified separately. [Unknown] Terminal `npm run check:all` and rule-6 mutation summaries had not been recorded at review time, so I do not attest to those requirements.

[Observed] The review worktree has clean tracked source and used no external observed-repository execution.

# Review brief — Polaris dossier local-agent mode, version 1.6, round 2

> **Candidate — binds nothing.** Instructions for a fresh review.

Review the frozen commit you are given: this directory, and the three subjects
reconstructed by applying `proposed/*.patch` to the installed version 1.5 bytes
under `openspec/changes/polaris-dossier-local-agent-mode/`
(`PROPOSED-SUBJECTS.json`, which
`scripts/build_polaris_dossier_local_agent_mode_v1_6.py --check` verifies).

Round 1 returned `REVISE` (`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-1-RAW.md`).
Judge the repairs listed in `ROUND-1-DISPOSITIONS.md` against that raw, and
what they touch. Every repair edits the subject, so read REQ-polaris-generation-035
as proposed in full, not only the changed lines. Report anything you notice
elsewhere in the package, graded as usual: there is no lesser grade for an
out-of-scope finding. Say where each finding sits, and state what you read and
what you did not.

Read the governing clauses themselves:
- VIS-2, VIS-3, VIS-4;
- CC-REV-2, CC-REV-4, CC-SPEC-1 to 11;
- REQ-polaris-generation-033, 034 and 035 in the installed
  `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`;
- REQ-polaris-generation-006 as
  `openspec/changes/polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md`
  states it;
- the direction record
  `.syzygy/governance/decisions/OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09.md`;
- the design note `docs/polaris-generation/fidelity-delta-review-proposal.md`.

Add a section `## Repair questions`. For each finding in `ROUND-1-DISPOSITIONS.md`, answer three questions, each with one reason:
- Does the repair resolve the finding? Answer yes, no or partly.
- Does it change a rule's meaning, an owner ruling or a label? Answer yes, no or unsure.
- Does it introduce a new defect? Answer yes, no or unsure.

Criteria:

1. A confirmation keeps its meaning. No sentence may let a verdict count with an entry missing, let an entry of an earlier verdict count for a later revision, or revive a retired verdict. Name any sentence that does.
2. REQ-polaris-generation-035's binding is not weakened. The list is inside the packet and its digest. The rebuild at validation and at render covers the list and its named base inputs, and fails closed on a missing input. Quote REQ-polaris-generation-033's "rebuilding the review packet from the frozen subject" and test the reading against it.
3. Each "contract reading" in the delta holds against the clause, quoted.
4. The list is fully determined by bytes and records:
   - which packets carry it;
   - its base round, keyed by session directory, with failed and refused verdicts treated as stated;
   - what it lists, and what it says it does not compare;
   - that no judgement of materiality enters it.
5. Requirements and scenarios agree. Each change has a scenario and a falsifier, each scenario can be tested, and every label is VIS-2 correct. That includes nothing Observed resting on a stored record.
6. "Which form, and why" is honest about all three forms and the trade-off. It attributes to the owner only what the direction record says.
7. Design and proposal agree with the spec and overstate nothing. The delta's blocks match the patches.

Never read an observed repository body or a run's output. Run no provider call.
Begin your report with these four lines, in this order, no blank line among them:

```
<one title line>
Reviewed commit: <the frozen commit you were given>
Manifest SHA-256: <sha256 of the proposed spec.md, which you compute yourself>
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
```

In this brief, `Manifest SHA-256` means the digest of the proposed `spec.md` bytes:
- Reconstruct those bytes by applying `proposed/spec.md.patch` to the installed spec. The result is the `proposed_sha256` of the spec row in `PROPOSED-SUBJECTS.json`; re-derive it yourself.
- The recorder binds your review to that digest, read from the first four non-blank lines, and to no other file's digest.
- It is not the digest of the patch file or of this directory, and it differs from round 1's.

Name the other two subject digests in the body.

`scripts/record_versioned_signoff.py` also reads a `## Findings` section with numbered findings, so include one. Each finding carries a severity and an anchor. Output your raw report as your final message.

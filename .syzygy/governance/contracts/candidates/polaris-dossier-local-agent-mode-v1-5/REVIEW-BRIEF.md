# Review brief — Polaris dossier local-agent mode, version 1.5

> **Candidate — binds nothing.** Instructions for a fresh review.

Review the frozen commit you are given: this directory, and the three subjects
reconstructed by applying `proposed/*.patch` to the version 1.4 bytes
(`PROPOSED-SUBJECTS.json`). Read the governing clauses themselves: VIS-2, VIS-4,
SEC-2, SEC-5, RFC2-24, RFC5-17, RFC7-2, RFC7-10, RFC7-13, RFC7-20, RFC7-33,
RFC7-34, CC-REV-2, CC-REV-4, CC-SPEC-1 to 11, the parent requirements
REQ-polaris-generation-003, 004, 006, 012 in
`openspec/changes/polaris-manifesto-generation/specs/polaris-generation/spec.md`,
and the two directions named in `SEMANTIC-DELTA.md`.

Scope of this round, by the owner's directions
(`decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-07.md` and `-2.md`): judge the repairs to round 6 and
what they touch, read with `ROUND-6-DISPOSITIONS.md` and `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-5-6-RAW.md`.
Report anything you notice elsewhere, graded as usual: there is no lesser grade for a finding out of scope, and
say where each finding sits. State in your report what you read and what you did not.

Add a section `## Repair questions`. For each repair in round 6, and each later repair `ROUND-*-DISPOSITIONS.md`
lists, answer yes, no or unsure, with one reason: does it change a rule's meaning or an owner ruling, or touch
the withheld rule, screening or secret handling? A repair that edits a test of the withheld rule touches it.
The author of the repairs does not decide this; you do.

Criteria, over that scope:

1. Each "contract reading" in the delta holds against the clause, quoted.
2. No accepted contract or doctrine clause is weakened without an act; name any.
3. Requirements and scenarios agree, each change has a scenario, and each scenario
   can be tested. Flag anything only a human could judge that is written as a check.
4. Design and proposal agree with the spec and overstate nothing.
5. The delta's blocks match the patches, and the three owner bounds on withheld
   claims are all enforceable.
6. Reading view and evidence view leave every marking recoverable without a
   pointer, without colour and with scripts off.

Never read an observed repository body or a run's output. Run no provider call.
Begin your report with these four lines, in this order, no blank line among them:

```
<one title line>
Reviewed commit: <the frozen commit you were given>
Manifest SHA-256: <sha256 of the proposed spec.md, which you compute yourself>
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
```

`Manifest SHA-256` here means the proposed `spec.md` bytes, reconstructed by applying
`proposed/spec.md.patch` to the installed spec: the recorder binds your review to that digest,
and to no other file's. Name the other two subject digests in the body.
`scripts/record_versioned_signoff.py` also reads a `## Findings` section with numbered findings, so give
one. Findings carry a severity and an anchor. Output your raw report as your final message.

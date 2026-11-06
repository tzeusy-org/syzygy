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

Criteria:

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
Report a verdict word, CONFIRM, CONFIRM WITH EXCEPTIONS or REVISE, on its own line
in the head, and name the subject digests you checked. Findings carry a severity
and an anchor. Output your raw report as your final message.

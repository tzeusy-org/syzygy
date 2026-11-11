# Review brief — Polaris dossier local-agent mode, version 1.7

> **Candidate — binds nothing.** Instructions for a fresh review (CC-REV-2).

Review the frozen commit you are given: this directory, and the three subjects
reconstructed by applying `proposed/*.patch` to the installed version 1.6 bytes
under `openspec/changes/polaris-dossier-local-agent-mode/`
(`PROPOSED-SUBJECTS.json`, which
`scripts/build_polaris_dossier_local_agent_mode_v1_7.py --check` verifies).
Read `SEMANTIC-DELTA.md` first, then the proposed spec's changed requirements
in full, then `IMPACT-LEDGER.md` and `OWNER-SIGNOFF.md`. A
`ROUND-n-DISPOSITIONS.md` here, if any, says what an earlier round found and
how it was repaired.

Read the governing clauses themselves:
- VIS-1, VIS-2, VIS-3, VIS-4;
- CC-REV-2, CC-REV-4, CC-SPEC-1 to 11;
- RFC7-2, RFC7-10, RFC7-12, RFC7-13, RFC7-33 and RFC7-34 in
  `.syzygy/governance/contracts/rfcs/RFC-0007/`;
- REQ-polaris-generation-033 to 036 as installed (v1.6) and as proposed;
- REQ-polaris-generation-006 as
  `openspec/changes/polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md`
  states it;
- `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-05.md`, item 3;
- `docs/pursuits/2026-11-09-vision-pursuit.md`, "Ranked moves" P1, P3, P5 and
  P13, and "Owner decisions after the run";
- `openspec/changes/polaris-dossier-one-command-run/proposed/polaris-generation/spec.md`,
  lines 1 to 60 (a candidate that binds nothing; read for the change boundary);
- `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`
  (for the sentences of REQ-033 it quotes);
- `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-7-RAW.md`, Findings 3 and 4 (the
  carried notes).

You may read product code to test a claim the package makes about it
(`packages/polaris-dossier/src/`, `packages/polaris-generation-core/src/quote-fidelity.ts`,
`quote-locate.ts`, `apps/three-surface-poc/src/polaris-generation/dossier-site.ts`).
Never read an observed repository body or a run's output, and run no provider
call or dossier run.

Criteria:

1. **Change boundary.** Every P1 item is sorted to the change that states it.
   The delta amends no byte of the one-command-run candidate or the
   launch-consent change, and the findings for the owner say what P1 needs from
   the one-command-run change. Check the claim that no quoted sentence of
   REQ-033 to 036 the two changes rely on is broken, by a method of your own.
2. **Settle-items.** Each has an answer or an explicit owner question: P1 (a)
   render trigger and its interaction with REQ-035's "pages published after
   the rendered-design review SHALL be the reviewed pages with only the named
   review-status region changed"; (b) two limits, with check-refusal counting
   kept as the 2026-11-05 direction keeps it; (c) close's record; (d) refuse or
   label; (e) the pre-pass, and whether it decides readiness; (f) the
   launch-consent quotations. P3: the landing clause, the legend, the one
   sentence and appendix (REQ-033, scenario "Disclosure placed in the
   appendix"), schema v5 and the served-pillar rule. P5: the hero slot and the
   annotated walk's labels. P13: the display rule, the RFC7-10 anchor, and the
   falsifier that replaces "a rendered quotation comes from the agent's text".
   Carried notes 3 and 4.
3. **Determinacy.** Which limit a resubmission counts against, the site of
   record, each review standing and the end state are fully determined by
   Syzygy's records and the bytes it verifies; say where a rule leaves a case
   open (for example, a fidelity and a design verdict both blocking on one
   revision; a design-repair revision whose check is refused).
4. **No weakening.** No sentence lets a verdict count for pages or a revision
   it did not read, lets a review be skipped, lets close present an unreviewed
   site as reviewed or ready, or loosens a citation, quotation, withheld-item
   or labelling rule. Test the P13 rule against REQ-033's "Syzygy SHALL NOT rest
   an Observed label on a record it stored" and the "re-derive ... every
   rendered quotation" sentence.
5. **Contract readings.** Each reading in "Contract readings the review must
   test" holds against the clause, quoted. Say whether RFC7-10 or RFC7-12 needs
   a change, which would stop this version (the bead's stop condition).
6. **Requirements and scenarios agree.** Each change has a scenario and a
   falsifier disjunct; each scenario can be tested; every label is VIS-2
   correct, nothing Observed rests on a stored record.
7. **Package integrity.** The affected-ids block and the clause blocks are
   what `--check` says they are; design.md and proposal.md agree with the spec
   and overstate nothing; the owner page attributes to the owner only what the
   records say (option A named P1, P3 and P5; choice B added the display rule).

Run `python3 scripts/build_polaris_dossier_local_agent_mode_v1_7.py --check`,
its `--selftest`, and `python3 scripts/check_governance.py`, and report their
output.

Begin your report with these four lines, in this order, no blank line among
them:

```
<one title line>
Reviewed commit: <the full 40-hex frozen commit you were given>
Manifest SHA-256: <sha256 of the proposed spec.md, which you compute yourself>
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
```

In this brief, `Manifest SHA-256` means the digest of the proposed `spec.md`
bytes:
- Reconstruct those bytes by applying `proposed/spec.md.patch` to the installed
  spec. The result is the `proposed_sha256` of the spec row in
  `PROPOSED-SUBJECTS.json`; re-derive it yourself.
- The recorder binds your review to that digest, read from the first four
  non-blank lines, and to no other file's digest.
- It is not the digest of the patch file or of this directory.

Name the other two subject digests in the body. Name the package as
`Package: polaris-dossier-local-agent-mode` on its own line after the head.

`scripts/record_versioned_signoff.py` reads a `## Findings` section, so include
one. Write each finding as `**Finding N — title** (severity)` at a line start,
numbered from 1, with severity `blocking`, `revise` or `note` (a note may add
", editorial" or ", for the owner"), and give each an anchor. Say what you read
and what you did not. Output your raw report as your final message.

# Review brief — Polaris dossier launch-time consent, version 1.1, round 1

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. Stopping rule, set before round 1: at most three rounds; CONFIRM,
> or CONFIRM WITH EXCEPTIONS with notes only, clears the bytes; a third
> REVISE goes to the owner with all three raws.

## What the reviewer is given, and nothing else

CC-REV-1 calls for a fresh context holding only the artifact, its governing
references and the acceptance criteria. Run on the default model.

**Network.** Do not fetch any content of any external or target repository:
no `gh api` contents, no raw URLs, no clone, no web access. The only network
use allowed is `git fetch` of this repository.

**The artifact under review.** In
`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent-v1-1/`:

- `proposed/spec.md.patch` (the subject);
- `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md`, `OWNER-SIGNOFF.md` and this brief;
- the builder `scripts/build_polaris_dossier_launch_consent_v1_1.py`, the
  `signed=` hook added to `scripts/build_polaris_dossier_launch_consent.py`,
  and the `polaris-dossier-launch-consent@1.1` entry in
  `scripts/record_versioned_signoff.py`.

Apply the patch to `openspec/changes/polaris-dossier-launch-consent/` in a
scratch worktree of the commit under review (`git worktree add --detach`
and `git apply`), and read the post-apply spec beside the v1.0 bytes;
`git diff` is the change.

**Governing references.**

- The owner's answer:
  `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md`,
  item `syzygy-pdja.23-confidence`, answer C; the question it answered,
  item 2 of
  `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/OWNER-DECISION-PACKET.md`;
  and the held v8 selection,
  `.syzygy/governance/decisions/OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08.md`.
- The v1.0 sign-off record
  `.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.0.md`,
  the review it names, and the v1.0 package's `OWNER-SIGNOFF.md` (the notes
  v1.1 carries).
- The change's `design.md` (§4, "Self-observation and the trunk tip", on the dedicated reference; §5 on private
  repositories).
- RFC5-12 (`.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`),
  read at its defining clause and quoted (verification rule 8);
  `DIRECTIVE-REGISTER.md` gives file and line.
- `.syzygy/governance/contracts/candidates/policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md`
  and `SEMANTIC-DELTA-TEMPLATE.md`; CC-SPEC-1 to CC-SPEC-11 and CC-IMPACT-1
  to CC-IMPACT-7 in that directory (in force under craft acts 6 and 7; the
  path still says candidate); CC-REV-1 and CC-REV-2.
- Doctrine VIS-1, VIS-2, VIS-4 and SEC-2, SEC-4.
- `AGENTS.md`, "Hard prohibitions" and "Verification rules".

The reviewer does not receive the drafting conversation, the drafter's
messages to the lead, or any signal of a desired verdict.

## Acceptance criteria

Each is a yes/no question with the evidence that settles it.

1. **Is the change the owner's answer, and only that?** Every hunk of the
   patch maps to answer C: the warning, its scenario, its falsifier arm,
   the case's widened variable and the warrant entry. A hunk that maps to
   none, that asks the owner for any confirmation or answer, or that grants
   read, egress, write or execution beyond v1.0, is blocking.
2. **Does the warning say what the owner chose, no wider and no
   narrower?** It must state that the repository's name and URL go onto the
   dedicated branch in Syzygy's own repository, which one push would
   publish; apply whenever the operator does not declare the repository
   public, including when no declaration is given; come before the answer
   is asked for; and ask for no confirmation. Is "repository identity" and
   "normalised URL" the right reading of "name and URL"? Is "the observing
   project's own repository" the right reading of "Syzygy's own
   repository"?
3. **Is it consistent with the rest of REQ-046 and with v8?** Including
   v1.0's falsifier arm forbidding a record without a public declaration,
   the refusal while no effective policy admits non-public sources, the
   rule "Syzygy SHALL NOT push or otherwise publish the dedicated
   reference", and the paragraph saying a successor that asks more of the
   question "needs this requirement amended alongside it".
4. **Is every quotation exact?** Re-extract by script each quotation of the
   owner's answer, the v8 packet, the v8 policy patch and the v1.0 spec in
   `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md` and `OWNER-SIGNOFF.md`, and
   compare.
5. **Can the new scenario be falsified as written?** One WHEN/THEN pair, an
   independent oracle under the requirement's existing form, and a
   falsifier arm a wrong implementation would trip.
6. **Is the change class right?** The delta says Normative.
7. **Is the impact ledger reproducible?** Re-run its sweep predicate at the
   commit it names and compare every row; re-compute the digests and
   counts; re-run its scratch install and compare.
8. **Are the v1.0 notes carried unchanged?** `OWNER-SIGNOFF.md` must list
   I2 to I6 and G5 to G9 as carried and repair none; no v1.0 byte, package
   or record is edited.
9. **Is the owner page fair and plain?** Does it state the question, the
   version and the option label exactly, say what signing does not do
   (v8, the write consent, implementation), and disclose the "would publish"
   residual?
10. **Does the tooling hold?** `--check` and `--selftest` of the v1.1
    builder pass; each predicate has a mutation fixture that fails it
    (verification rule 6); the v1.0 builder's `--check` fails on v1.1 bytes
    no v1.1 record covers; the recorder's selftest passes.

## Output

A raw review stored verbatim; the lead retains it as
docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-1-*n*-RAW.md, in the
`polaris-launch-consent` review campaign, whose pattern it matches. Its
first four non-blank lines are exactly

```text
# Review R-POLARIS-LAUNCH-CONSENT-V1-1-<n>
Reviewed commit: <40-hex commit the reviewer read>
Manifest SHA-256: <sha256 of openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md after applying proposed/spec.md.patch to that commit, computed by script>
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
```

with no blank line among them. This package has no manifest: the recorder
reads `Manifest SHA-256` as the digest of the post-apply spec (the
builder's `subject_bytes()`), and refuses any other value. The raw must
also name the package key polaris-dossier-launch-consent as a whole token on
a line outside any fenced block.

Then `## Findings`, each numbered continuously as
`**Finding N — title** (blocking|revise|note)`, with the file and line, the
clause quoted, and the repair you would accept. Open every finding with
that exact form and no other heading, bullet or label. For `CONFIRM WITH
EXCEPTIONS` every finding must be a `note`.

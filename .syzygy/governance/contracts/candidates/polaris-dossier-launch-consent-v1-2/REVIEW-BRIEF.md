# Review brief — Polaris dossier launch-time consent, version 1.2, round 12 (scoped)

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. Round 11 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-11-RAW.md`,
> `REVISE` at line 4), the round the owner ordered on 2026-11-10 after
> ruling on the open points, found three revise findings and five notes.
> These bytes are their repair, with an arm-by-arm sweep of both falsifiers
> (`ROUND-11-DISPOSITIONS.md`). No round 12 has been dispatched; the owner
> decides the next review step.
>
> **Scope.** Round 12, if ordered, reads the repaired sentences and what they
> touch, not the whole spec again: the seven changed lines below, the
> clauses each one checks or restates, and the arm table. The scope may
> change if the owner orders otherwise; a whole-spec round would use the
> round-11 criteria, kept at this file's previous commit.
>
> **Stopping rule.** `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only,
> clears the bytes. Whatever the verdict, the package then returns to the
> owner.

## Changed blocks under review

Post-apply spec lines; the word-level change is `git diff` between the
round-11 post-apply spec (commit `e5a37fa1`) and this one.

| Line | Requirement | Change | Touches |
|---|---|---|---|
| 11 | 046, question | both agent-session clauses tagged "(stage: question asked)" | stage rule, line 244 |
| 37 | 046, disclosures | no-copy agent form: "directed to work in the operator's clone, that whether a session did so is its own report, labelled Inferred, and that no copy was made" | line 258; stage rule; arms 046.4, 046.27, 047.24, 047.25 |
| 223 | 046, falsifier | v1.1-consent arm bound to the one-commit refusal; the copy's files outside the removal arm; rewriting "from Git or SSH configuration" | lines 17, 35, 242, 253, 255, 258 |
| 240 | 047 | "the reference it came from, or that `--revision` gave it" | line 238; arm 047.6 |
| 254 | 047, read list | the object format read in every launch-consented run | lines 9, 248, 250, 256; arms 046.3, 047.15 |
| 258 | 047 | no-copy agent form, as line 37 | line 37; stage rule |
| 396 | 047, falsifier | arms 047.2, 047.6, 047.12, 047.13, 047.16, 047.17, 047.23 | lines 238, 240, 242, 246, 248, 253, 255, 258 |

## What the reviewer is given, and nothing else

CC-REV-1 calls for a fresh context holding only the artifact, its governing
references and the acceptance criteria. Run on the default model.

**Network.** Do not fetch any content of any external or target repository:
no `gh api` contents, no raw URLs, no clone, no web access. The only network
use allowed is `git fetch` of this repository. Fixture clones you build
yourself with `git init` and local commits in a scratch directory are
allowed, including fixtures that test how Git behaves when it fetches
from a local clone over `file://` (hooks, configuration, partial clones,
alternates); delete them afterwards.

**The artifact under review.** In
`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent-v1-2/`:

- `proposed/spec.md.patch` (the subject);
- `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md`, `OWNER-SIGNOFF.md`,
  `PROPOSED-SUBJECTS.json`, `ROUND-1-DISPOSITIONS.md`,
  `ROUND-2-DISPOSITIONS.md`, `ROUND-3-DISPOSITIONS.md`,
  `ROUND-4-DISPOSITIONS.md`, `ROUND-5-DISPOSITIONS.md`,
  `ROUND-6-DISPOSITIONS.md`, `ROUND-7-DISPOSITIONS.md`,
  `ROUND-8-DISPOSITIONS.md`,
  `ROUND-9-DISPOSITIONS.md`,
  `ROUND-10-DISPOSITIONS.md`, `ROUND-11-PREP.md`,
  `ROUND-11-DISPOSITIONS.md` and this brief;
- the raws of rounds 1 to 11,
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-1-RAW.md` to
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-11-RAW.md`, whose findings
  the dispositions answer (round 3's as superseded by the redesign);
- the builder `scripts/build_polaris_dossier_launch_consent_v1_2.py`;
- the peel-and-delegate change to
  `scripts/build_polaris_dossier_launch_consent_v1_1.py`;
- the `polaris-dossier-launch-consent@1.2` entry and its routing selftest in
  `scripts/record_versioned_signoff.py`;
- the closed-set line in
  `scripts/prepare_three_surface_poc_governedby_reference_recording.py`.

Apply the patch to `openspec/changes/polaris-dossier-launch-consent/` in a
scratch worktree of the commit under review (`git worktree add --detach`,
then `git apply`). Read the post-apply spec beside the v1.1 bytes;
`git diff` is the change.

**Governing references.**

- The owner direction
  `.syzygy/governance/decisions/OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`.
  It holds four sections: the two first selections, the four rulings on
  the draft's points, the redesign of 2026-11-10, which supersedes rulings
  1 and 2 for this design, and the rulings after review round 10, also of
  2026-11-10.
- The v1.1 sign-off record
  `.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.1.md`
  and the review it names.
- The change's `design.md`: §4 (the revision) and §5 (the registry-entry
  reading).
- The source-acquisition registry entry
  `.syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`,
  `typedAuthority.readAuthority` and `typedAuthority.fetch`.
- The clone-shape check `packages/polaris-dossier/src/clone-shape.ts`,
  whose form the copy must equal (read only; it is product code, not under
  review).
- The redis observation consent
  `.syzygy/governance/contracts/candidates/public-repo-admission/instances/redis/OBSERVATION-CONSENT.md`
  (its Scope) and review `docs/reviews/R-POLARIS-DOSSIER-CLONE-SHAPE-1-RAW.md`.
- The local-agent mode's REQ-polaris-generation-033
  (`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`).
- The held screening scope v8 (`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/SEMANTIC-DELTA.md`)
  and the performed write consent
  (`.syzygy/governance/decisions/LAUNCH-CONSENT-WRITE-CONSENT-ACT.md`).
- RFC1-2, RFC3-6 and RFC5-12. Read each at its defining clause and quote it
  (verification rule 8); `DIRECTIVE-REGISTER.md` gives file and line.
- The normative-change rules:
  - `.syzygy/governance/contracts/candidates/policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md`;
  - CC-SPEC-1 to CC-SPEC-11 and CC-IMPACT-1 to CC-IMPACT-7 in that
    directory;
  - CC-REV-1 and CC-REV-2.
- Doctrine VIS-1, VIS-2, VIS-4 and SEC-2, SEC-4, SEC-5.
- `AGENTS.md`, "Hard prohibitions" and "Verification rules".

The reviewer does not receive the drafting conversation, the drafter's
messages to the lead, or any signal of a desired verdict.

## Acceptance criteria

Each is a yes/no question with the evidence that settles it. Read only the
changed lines above and the clauses in their "Touches" column, unless a
question needs more.

1. **Does each round-11 repair land as disposed?** For Findings 1 to 3 and
   notes 4, 6 and 7, does the post-apply text carry the wording
   `ROUND-11-DISPOSITIONS.md` quotes, verbatim, at the line it names? Is
   note 5 confined to `OWNER-SIGNOFF.md`, the spec text unchanged?
2. **Can any conforming run trip a changed arm?** For each arm the table
   marks repaired (046.4, 046.5, 046.12, 046.19, 047.2, 047.6, 047.12,
   047.13, 047.16, 047.17, 047.23, 047.24), test it against every refusal
   and statement the body requires:
   - in a copy-class run at each stage (refused before the copy step,
     after it, at checkout, at the form check, at the question, declined,
     completed);
   - in a launch-consented no-copy run;
   - in a predecessor-class run.
   Does any run the body forbids now pass it?
3. **Does the arm table hold?** Re-split both falsifiers on top-level `;`
   by script. Is the population 57 (31 and 26), and are 23 arms
   byte-identical to v1.1's? Is any row's result wrong, above all the 44
   marked holds and the 046.2 residual? Is any arm missing?
4. **Is every agent statement achievable?** Do lines 11, 37 and 258 state
   nothing about whether a session started, received, read or worked
   except as its own report, labelled Inferred? Do lines 37 and 258 now
   prescribe one form for one disclosure?
5. **Is the object-format read placed right?** Is line 254's read within
   line 250's "every launch-consented run" heading, and does REQ-046's
   pre-answer list take it? Does it reach anything beyond a configuration
   key?
6. **Do the prose pages match?** Do `SEMANTIC-DELTA.md` (warrant, D2),
   `IMPACT-LEDGER.md`, `OWNER-SIGNOFF.md` and the campaign file say what the
   changed lines say? Do the delta's exact blocks match `git diff` of the
   applied patch?
7. **Does the tooling hold?** `--check` and `--selftest` of the v1.0, v1.1
   and v1.2 builders pass, and the recorder's selftest passes.
8. **Did the repair re-open anything?** Does any round-1-to-11 finding
   return in the changed lines or in what they touch?

## Output

A raw review, stored verbatim. The lead retains it as
docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-*n*-RAW.md, in the
`polaris-launch-consent` review campaign, whose pattern it matches.

The recorder (`scripts/record_versioned_signoff.py`) enforces this contract,
and refuses a raw that departs from it.

**The head.** The raw's first four non-blank lines are exactly these, with
no blank line among them:

```text
Review: R-POLARIS-LAUNCH-CONSENT-V1-2-<n>
Reviewed commit: <40-hex commit the reviewer read>
Manifest SHA-256: <sha256 of openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md after applying proposed/spec.md.patch to that commit, computed by script>
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
```

This package has no manifest. The recorder reads `Manifest SHA-256` as the
digest of the post-apply spec (the builder's `subject_bytes()`), and refuses
any other value.

**The package key.** The raw must name the bare package key
polaris-dossier-launch-consent as a whole token, on a line outside any
fenced block.

**Findings.** Then `## Findings`, numbered continuously. Each finding opens
at a line start, in this exact form and no other heading, bullet or label:

```text
**Finding N — title** (blocking)
**Finding N — title** (revise)
**Finding N — title** (note)
```

- A `note` may carry a qualifier made only of `for the owner`, `editorial`
  or `not resolved` (for example `(note, for the owner)`). Any other
  qualifier wording refuses as ambiguous.
- Give the file and line, the clause quoted, and the repair you would
  accept.
- For `CONFIRM WITH EXCEPTIONS`, every finding must be a `note`.

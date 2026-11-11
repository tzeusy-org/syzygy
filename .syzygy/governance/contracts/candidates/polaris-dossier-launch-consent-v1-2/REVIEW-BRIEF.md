# Review brief — Polaris dossier launch-time consent, version 1.2, round 17 (scoped; only if the owner orders it)

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. Round 16 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-16-RAW.md`,
> `REVISE` at line 4), scoped to the round-15 repair and the last round
> under the owner's ruling, found one revise finding and seven notes. These
> bytes are their repair (`ROUND-16-DISPOSITIONS.md`).
>
> **Only if the owner orders it.** No ruling in force orders a round 17.
> This brief is prepared so that one can run if the owner orders it, and is
> not dispatched from the drafting session.
>
> **Scope.** Fixes only: the ten changed lines below, the clauses each
> touches, the "remov" sweep and the extended matrix in
> `ROUND-16-DISPOSITIONS.md`. The scope may change if the owner orders
> otherwise.
>
> **Stopping rule.** `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only,
> clears the bytes. After a `REVISE` the owner decides what follows.

## Changed blocks under review

Post-apply spec lines. The word-level change is the `git diff` between the
round-16 post-apply spec (commit `482b1252`) and this one.

| Line | Requirement | Change | Touches |
|---|---|---|---|
| 37 | 046, disclosures | early-ended branches keyed on "before Syzygy started the fetch process" and "after Syzygy started the fetch process"; "and, where the fetch failed, that a fetch was started and failed, as Git reported" | lines 242, 244, 248, 258; arms 046.4, 047.25 |
| 223 | 046, falsifier | arm 046.5: the failed-fetch form; "no fetch was made" only before Syzygy started the fetch process | line 242 |
| 242 | 047, v1.1 consent | the same three forms | arms 046.5, 047.16; line 258 |
| 246 | 047, copy statements | "that it was not removed, where its removal failed" | lines 244, 248 |
| 254 | 047, read list | configuration also read as text for `core.bare` and `core.worktree`, "to locate its repository's working trees" | lines 248, 252; the arm on reads of the operator's clone |
| 346, 363, 368, 373 | 047, scenarios | "and removes the copy, or names it as not removed where its removal fails" | line 248; line 187; arms 047.21, 047.22 |
| 396 | 047, falsifier | arm 047.16 as arm 046.5 | line 242 |

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
  `ROUND-11-DISPOSITIONS.md`, `ROUND-12-DISPOSITIONS.md`,
  `ROUND-13-DISPOSITIONS.md`, `ROUND-14-DISPOSITIONS.md`,
  `ROUND-15-DISPOSITIONS.md`, `ROUND-16-DISPOSITIONS.md` and this brief;
- the raws of rounds 1 to 16,
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-1-RAW.md` to
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-16-RAW.md`, whose findings
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
  It holds five sections: the two first selections, the four rulings on
  the draft's points, the redesign of 2026-11-10, which supersedes rulings
  1 and 2 for this design, and the rulings after review rounds 10 and 12,
  also of 2026-11-10.
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

Each is a yes/no question with the evidence that settles it. Read the
changed lines above and what their "Touches" column names, unless a question
needs more.

1. **Does each round-16 repair land as disposed?** Is the wording
   `ROUND-16-DISPOSITIONS.md` quotes at the line it names, verbatim?
2. **Does every removal duty survive a failed removal?** Re-run the "remov"
   sweep over these bytes.
   - Is the population 50 occurrences on 16 lines, and is any occurrence
     misclassed?
   - Does any clause, scenario or arm still require a conforming run to
     remove its copy, or to say it did, where the removal fails?
3. **Is the matrix population complete now?** Is any copy statement,
   scenario or arm that a run refused inside the copy step must meet missing
   from its 35 rows, and is any cell wrong?
4. **Can a run tell which early-ended form applies?** Do line 37, line 242
   and arms 046.5 and 047.16 turn only on whether Syzygy started the fetch
   process? Does each form agree with line 258's refusal of a failed Git
   process?
5. **Is the widened configuration read closed?** Does line 254 admit what
   locating the operator's repository's working trees needs, and nothing
   that would let Syzygy honour the configuration?
6. **Is the owner page fair?** Does it state the failed removal, the
   early-ended forms and the worktree-locating reads in plain words, and no
   more than the spec binds?
7. **Do the prose pages and tooling match?**
   - Do the delta's exact blocks match `git diff` of the applied patch?
   - Do `--check` and `--selftest` pass for the three builders, and does the
     recorder's selftest pass?
8. **Did the fixes re-open anything?** Does any round-1-to-16 finding return
   in the changed lines or in what they touch?

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

# Review brief — Polaris dossier launch-time consent, version 1.2, round 14 (scoped)

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. Round 13 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-13-RAW.md`,
> `REVISE` at line 4), the fixes-only round the owner ordered, found one
> revise finding and six notes. These bytes are their repair
> (`ROUND-13-DISPOSITIONS.md`). Not dispatched from the drafting session; the
> owner decides whether round 14 runs.
>
> **Scope.** Fixes only: the six changed lines below, the clauses each
> touches, and the 33-unit re-test in `ROUND-13-DISPOSITIONS.md`. The scope
> may change if the owner orders otherwise.
>
> **Stopping rule.** `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only,
> clears the bytes. Whatever the verdict, the package then returns to the
> owner.

## Changed blocks under review

Post-apply spec lines; the word-level change is `git diff` between the
round-13 post-apply spec (commit `054a4f11`) and this one.

| Line | Requirement | Change | Touches |
|---|---|---|---|
| 9 | 046, pre-answer reads | "and the artifacts REQ-polaris-generation-033 requires to name the pinned revision, as that revision" among the stores | arm 046.2; REQ-033 (local-agent spec line 13) |
| 11 | 046, question | "that the authoring and inventory sessions are directed, by their briefs, to work in the copy (stage: question asked; copy-class)" | line 258; stage rule, line 244 |
| 37 | 046, disclosures | "that the authoring and inventory sessions were directed, by their briefs, to work in the copy" | line 258; REQ-035 review sessions |
| 223 | 046, falsifier | 046.2 as line 9; 046.12 "in either case other than by the making, keeping or removal of a copy that a copy step makes" | lines 27, 33, 35, 220, 248 |
| 248 | 047, copy step | the copy's directory never inside any working tree of the governance home's repository, linked worktrees included, nor its Git directory or common Git directory, nor the operator's clone's working tree or Git directory, refused before the copy step; an object format Git does not support fails the copy's `init` | lines 31, 35, 242, 244, 258; arms 046.12, 047.15, 047.18 |
| 396 | 047, falsifier | 047.15 as line 248; 047.18 excepts the unsupported object format | line 248 |

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
  `ROUND-13-DISPOSITIONS.md` and this brief;
- the raws of rounds 1 to 13,
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-1-RAW.md` to
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-13-RAW.md`, whose findings
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

1. **Does each round-13 repair land as disposed?** Is the wording
   `ROUND-13-DISPOSITIONS.md` quotes at the line it names, verbatim? Is the
   present tense at line 11 right for a statement made at "question asked"?
2. **Is the placement class closed?**
   - Can a conforming copy-class run place its copy anywhere that changes a
     working tree, index, reference or file of the governance home's
     repository (any worktree) or of the operator's clone?
   - Can arm 046.12, with its exemption, trip on a conforming run, or does
     the exemption let a forbidden change pass?
   - Do line 248 and arm 047.15 name the same places?
3. **Is the refusal placed right under the stage rule?** Its stage (before
   the copy step), its class (copy-class), and what such a run states.
4. **Does the re-test hold?** Re-run the selection over these bytes. Is the
   population 33 units, is any row wrong, and is any clause naming a working
   tree, the governance home or removal missing?
5. **Do the notes land?**
   - Is it now stated, or exempted, that review sessions are directed to no
     clone?
   - Does every REQ-033 artifact naming the pinned revision fall inside line
     9 and arm 046.2?
   - Is an object format Git does not support refused under the Git-failure
     rule, and excepted in arm 047.18?
6. **Is the owner reading on "governing criteria" stated fairly?** Does
   `OWNER-SIGNOFF.md` state it in plain words, as a reading accepted by
   signing, with the spec unchanged?
7. **Do the prose pages and tooling match?** The delta's exact blocks
   against `git diff` of the applied patch; `--check` and `--selftest` of
   the three builders; the recorder's selftest.
8. **Did the fixes re-open anything?** Does any round-1-to-13 finding return
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

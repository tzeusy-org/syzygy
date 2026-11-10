# Review brief — Polaris dossier launch-time consent, version 1.2, round 15 (scoped)

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. Round 14 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-14-RAW.md`,
> `REVISE` at line 4), scoped to the round-13 repair under the owner's
> "Fixes-only rounds until clean", found one revise finding and seven notes.
> These bytes are their repair (`ROUND-14-DISPOSITIONS.md`). Not dispatched
> from the drafting session.
>
> **Scope.** Fixes only: the three changed lines below, the clauses each
> touches, and the 12-unit sweep in `ROUND-14-DISPOSITIONS.md`. The scope may
> change if the owner orders otherwise.
>
> **Stopping rule.** `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only,
> clears the bytes. A `REVISE` leads to another fixes-only round under the
> owner's ruling.

## Changed blocks under review

Post-apply spec lines. The word-level change is the `git diff` between the
round-14 post-apply spec (commit `67dd3554`) and this one.

| Line | Requirement | Change | Touches |
|---|---|---|---|
| 37 | 046, disclosures | "that each brief Syzygy issued, of the authoring brief and the inventory brief, directed its session to work in the copy" | line 11; line 244 (stage rule); line 258; REQ-034 and REQ-035 (when each brief is issued); arms 046.4, 047.25 |
| 248 | 047, copy step | operator side: "the operator's clone's working tree, Git directory or common Git directory, or any linked worktree of its repository"; an unsupported object format "is refused as every failure of a Git process for the copy is refused below" | lines 242, 256, 258; arms 046.12, 047.15, 047.18 |
| 396 | 047, falsifier | arm 047.15 widened as line 248 | line 248 |

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
  `ROUND-13-DISPOSITIONS.md`, `ROUND-14-DISPOSITIONS.md` and this brief;
- the raws of rounds 1 to 14,
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-1-RAW.md` to
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-14-RAW.md`, whose findings
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

1. **Does each round-14 repair land as disposed?** Is the wording
   `ROUND-14-DISPOSITIONS.md` quotes at the line it names, verbatim?
2. **Is line 37 true at every stage it binds?** Take a copy-class run that
   issued the authoring brief only, the inventory brief only, both, or a
   review packet after both. Does the statement make a run say anything
   false, or does it let a run leave out a brief it issued? Do arms 046.4
   and 047.25 agree with it?
3. **Does the sweep hold?** Re-run the selection over these bytes.
   - Is the population 12 units?
   - Is any row wrong?
   - Does any statement naming more than one artifact or session still bind
     a run that issued one item and not the other?
4. **Is the placement rule symmetric and closed?**
   - Do line 248 and arm 047.15 name the same places on both sides?
   - Can a conforming copy change any worktree, Git directory or common Git
     directory of either repository?
   - Does arm 046.12's exemption let a forbidden placement pass?
5. **Is the object-format refusal cited exactly?** Does "as every failure of
   a Git process for the copy is refused below" point at one clause, and
   does arm 047.18 agree?
6. **Is the owner page fair?** Does it state the "governing criteria"
   reading with the consent instruction conditional, and the widened
   placement in plain words?
7. **Do the prose pages and tooling match?**
   - Do the delta's exact blocks match `git diff` of the applied patch?
   - Do `--check` and `--selftest` pass for the three builders, and does the
     recorder's selftest pass?
8. **Did the fixes re-open anything?** Does any round-1-to-14 finding return
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

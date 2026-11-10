# Review brief — Polaris dossier launch-time consent, version 1.2, round 13 (fixes only)

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. Round 12 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-12-RAW.md`,
> `REVISE` at line 4), scoped to the round-11 repair, found two revise
> findings and five notes. The owner then chose "Briefs only (Recommended)"
> and "One more fixes-only round (Recommended)" (direction record, section
> "Rulings after review round 12, 2026-11-10"). These bytes are the round-12
> repair (`ROUND-12-DISPOSITIONS.md`). Not dispatched from the drafting
> session.
>
> **Scope.** Fixes only: the nine changed lines below, the clauses each one
> checks or restates, the predecessor requirements those lines put duties
> beside, and the two sweeps in `ROUND-12-DISPOSITIONS.md`. The scope may
> change if the owner orders otherwise.
>
> **Stopping rule.** `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only,
> clears the bytes. Whatever the verdict, the package then returns to the
> owner.

## Changed blocks under review

Post-apply spec lines. The word-level change is `git diff` between the
round-12 post-apply spec (commit `736d9fcd`) and this one.

| Line | Requirement | Change | Touches |
|---|---|---|---|
| 9 | 046, pre-answer reads | "and every page, as the run record's statements" among the stores | line 37; arm 046.2; REQ-033's page disclosures |
| 11 | 046, question | "(stage: question asked; both classes)", "(stage: question asked; copy-class)" | stage rule, line 244 |
| 37 | 046, disclosures | no-copy form: "that the run's clone, where the agent sessions are to work, is the operator's clone, that whether a session worked there is its own report, labelled Inferred, and that no copy was made" | line 258; line 244; arms 046.4, 047.25, 047.26 |
| 223 | 046, falsifier | 046.2 takes pages; 046.12's round-11 exemption removed | lines 9, 35, 242, 248 |
| 248 | 047, copy step | the copy's directory never inside the governance home's working tree, Git directory or common Git directory; a run that would put it there refused before its copy step | line 244 (stage rule); line 35; arms 046.12, 047.15 |
| 256 | 047, read list | the abbreviation's identifier width from `extensions.objectFormat`, failing closed | lines 238, 248, 254; REQ-033's hash-algorithm clause |
| 258 | 047 | briefs alone name the copy; a review packet carries exactly REQ-035's contents; no-copy agent form as line 37 | REQ-034; REQ-035; line 37; arm 047.24 |
| 310 | 047, scenario | "every brief names the copy as the clone to work in, and every review packet carries exactly REQ-polaris-generation-035's contents" | line 258; REQ-035 |
| 396 | 047, falsifier | new arm 047.15 (copy directory placement); 047.24 (briefs; packets as REQ-035) | lines 248, 258; REQ-035 |

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
  `ROUND-11-DISPOSITIONS.md`, `ROUND-12-DISPOSITIONS.md` and this brief;
- the raws of rounds 1 to 12,
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-1-RAW.md` to
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-12-RAW.md`, whose findings
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

1. **Does each round-12 repair land as disposed?** For Findings 1 and 2 and
   notes 3, 4, 6 and 7, is the wording `ROUND-12-DISPOSITIONS.md` quotes at
   the line it names, verbatim? Do lines 37 and 258 carry the same no-copy
   form?
2. **Does the "Briefs only" ruling land as made?** Do only the authoring
   and inventory briefs carry the copy duty? Does a review packet of a
   copy-class run carry exactly REQ-polaris-generation-035's contents
   (`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`)?
   Do line 258, scenario line 310 and arm 047.24 agree, and do
   `IMPACT-LEDGER.md`, `OWNER-SIGNOFF.md` and the delta's D5 say the same?
3. **Is the placement rule and its refusal sound?**
   - Can a conforming copy-class run still change the governance home's
     working tree, Git directory or common Git directory?
   - Does arm 046.12, without its round-11 exemption, still hold for every
     conforming run?
   - Is the new refusal's stage (before the copy step) and class
     (copy-class) consistent with the stage rule, and what does such a run
     state?
4. **Is every changed arm sound?** For 046.2, 046.12, 047.15 and 047.24, can
   a run that does what the body requires trip it, in either class and at
   any stage? Can a run the body forbids pass it?
5. **Does the predecessor sweep hold?** In `ROUND-12-DISPOSITIONS.md`:
   - Re-run the selection over these bytes. Is the population 37 sentences?
   - Is any row's governing text or result wrong? Test above all D11, D27,
     D28 and D30.
   - Is a new duty on a brief, packet, run record or page missing, for
     example one named by a pronoun?
   - Does any new duty conflict with REQ-033, 034, 035, 036 or v1.1's
     unchanged text?
6. **Is the identifier width settled?** Does line 256 say what the width
   is taken from? Does a mismatch fail closed in both classes, and does
   anything conflict with REQ-033's rule that the hash algorithm for object
   reads is never one the clone's configuration declares?
7. **Do the prose pages and tooling match?**
   - Do the delta's exact blocks match `git diff` of the applied patch?
   - Do the v1.0, v1.1 and v1.2 builders' `--check` and `--selftest` pass,
     and does the recorder's selftest pass?
8. **Did the fixes re-open anything?** Does any round-1-to-12 finding return
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

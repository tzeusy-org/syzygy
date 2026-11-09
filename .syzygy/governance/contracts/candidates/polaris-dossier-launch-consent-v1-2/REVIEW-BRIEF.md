# Review brief — Polaris dossier launch-time consent, version 1.2, round 1

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. The stopping rule is set before round 1:
>
> - at most three rounds;
> - `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only, clears the
>   bytes;
> - a third `REVISE` goes to the owner with all three raws.

## What the reviewer is given, and nothing else

CC-REV-1 calls for a fresh context holding only the artifact, its governing
references and the acceptance criteria. Run on the default model.

**Network.** Do not fetch any content of any external or target repository:
no `gh api` contents, no raw URLs, no clone, no web access. The only network
use allowed is `git fetch` of this repository. Fixture clones you build
yourself with `git init` and local commits in a scratch directory are
allowed; delete them afterwards.

**The artifact under review.** In
`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent-v1-2/`:

- `proposed/spec.md.patch` (the subject);
- `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md`, `OWNER-SIGNOFF.md`,
  `PROPOSED-SUBJECTS.json` and this brief;
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
  It holds both of its sections: the two first selections, and the four
  rulings on the draft's points.
- The v1.1 sign-off record
  `.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.1.md`
  and the review it names.
- The change's `design.md`: §4 (the revision) and §5 (the registry-entry
  reading).
- The source-acquisition registry entry
  `.syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`,
  `typedAuthority.readAuthority` and `typedAuthority.fetch`.
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

Each is a yes/no question with the evidence that settles it.

1. **Is the change the owner's answers, and only those?**
   - Every hunk maps to one of the two first selections or the four rulings.
   - A hunk that maps to none is blocking. So is a hunk that grants a read,
     egress, write or execution beyond v1.1, or that admits a local path.
2. **Does each ruling land as selected?**
   - (1) Delta bases are input only, and the run discloses it.
   - (2) Disclosure only: no pinned-tree copy, and the delta records that
     the owner chose this over the recommended copy.
   - (3) Two segments for every host, with the shared-records consequence
     stated plainly.
   - (4) Remote derivation keeps v1.1's `http` and `git` normalisation.
   - Is D6's choice to keep operator-given URLs at https and ssh a fair
     reading of ruling 4 and the first selection?
3. **Is the closed read list closed?**
   - Can a conforming implementation of REQ-047's list read history, another
     reference's objects, the working tree, the index or any other file of
     the Git directory?
   - Can it honour the clone's configuration, or start a process in the
     clone?
   - Is the delta-base allowance bounded to rebuilding in-scope objects?
4. **Is REQ-046's derivation byte-for-byte v1.1?**
   - Compare the derivation sentence before and after.
   - Does the added reading (every host, the two-segment floor) change any
     identity v1.1 derived for a path of two or more segments?
   - Do the records' identities in force (`repository:redis-redis`,
     `repository:psf-requests`, `repository:tzeusy-org-syzygy`) still
     derive?
5. **Does lookup by `Upstream:` behave as D7 says?**
   - A consent made by another act is found only by the whole normalised
     URL, never by the two segments.
   - A locator that found such a consent under v1.1 (`https://github.com/...`)
     still finds it.
6. **Is the trunk rule consistent with v1.1 and the implemented reading?**
   - The remote-tracking default, `origin` first.
   - The several-remotes refusal.
   - Local branches not consulted while a default is recorded.
7. **Are credentials kept out of every output?**
   - Refused when typed.
   - Stripped and disclosed, never printed, when found in a remote.
8. **Is every quotation exact?**
   - Re-extract by script each quotation in `SEMANTIC-DELTA.md`,
     `IMPACT-LEDGER.md` and `OWNER-SIGNOFF.md` of the owner's words, the
     records, the registry entry and the v1.1 spec, and compare.
   - Check the delta's exact blocks against `git diff` of the applied patch.
9. **Is the rule-9 sweep reproducible?** Re-run its predicates over the
   populations it names at the commit it names, and compare every row and
   the identity counts.
10. **Can each new scenario be falsified as written?**
    - One WHEN/THEN pair each.
    - An independent oracle under the requirement's form.
    - A falsifier arm a wrong implementation would trip.
11. **Is the change one coherent category, overlapping no other change?**
    Is the change class (Normative) right?
12. **Is the owner page fair and plain?** Does it state the question, the
    version and the option label exactly, and name the shared-records,
    agent-reach and dirty-tree costs?
13. **Does the tooling hold?**
    - `--check` and `--selftest` of the v1.0, v1.1 and v1.2 builders pass.
    - Each predicate has a mutation fixture that fails it (verification
      rule 6).
    - The v1.0 builder's `--check` fails on v1.2 bytes that no v1.2 record
      covers.
    - The recorder's selftest passes.

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

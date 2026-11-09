# Review brief — Polaris dossier launch-time consent, version 1.2, round 6

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. Rounds 1 to 3 returned `REVISE` on a design in which Syzygy read
> the pinned commit in place in the operator's full clone. After round 3 the
> owner chose a redesign: Syzygy copies the pinned commit from the
> operator's clone into a one-commit clone of its own over Git's local file
> transport, and the signed read rules apply to the copy. Rounds 4 and 5,
> the first reviews of the redesign, returned `REVISE` on the text's
> consistency; these bytes are round 5's repair, and round 6 reviews them.
> Read the post-apply spec as a whole, not only the repaired clauses.
>
> **Stopping rule.** The coordinating session treats the redesign as a fresh
> sequence: round 4 was its first round. `CONFIRM`, or `CONFIRM WITH
> EXCEPTIONS` with notes only, clears the bytes. The rule set before round 5
> sent the package to the owner after round 6. Per the owner's 2026-11-10
> instruction, relayed by the coordinating session, the loop continues past
> that stopping rule while rounds converge, and goes to the owner when a
> round stops making progress.

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
  `ROUND-4-DISPOSITIONS.md`, `ROUND-5-DISPOSITIONS.md` and this brief;
- the raws of rounds 1 to 5,
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-1-RAW.md` to
  `docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-5-RAW.md`, whose findings
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
  It holds three sections: the two first selections, the four rulings on
  the draft's points, and the redesign of 2026-11-10, which supersedes
  rulings 1 and 2 for this design.
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

Each is a yes/no question with the evidence that settles it.

1. **Is the change the owner's answers, and only those?**
   - Every hunk maps to one of the two first selections, rulings 3 and 4,
     or the redesign selection.
   - A hunk that maps to none is blocking. So is a hunk that grants a read,
     egress, write or execution beyond v1.1 and the redesign, or that admits
     a local path.
2. **Does each selection land as made?**
   - The redesign: the copy over the local file transport, no network,
     Git's reads of the operator's clone (delta bases included) disclosed,
     the signed read rules applied to the copy, the agents working in the
     copy.
   - Does the delta say plainly that the redesign supersedes the in-place
     design and ruling 2 ("Disclose only"), and that the owner chose the
     copy after declining it on 2026-11-09?
   - (3) Two segments for every host, with the shared-records consequence
     stated plainly.
   - (4) Remote derivation keeps v1.1's `http` and `git` normalisation.
   - D6 admits typed `http://` and `git://` URLs as v1.1 does, credentials
     refused, on a reading it labels Inferred and attributes to the
     coordinating session. Is that stated plainly, and put to the owner?
3. **Is the copy step exact and safe?**
   - Is the Git invocation class fixed: an empty directory and repository of
     Syzygy's own (never derived from the clone's path), an empty template,
     the pinned commit alone by full identifier at depth one, no tags, no
     submodules, a detached checkout?
   - Does every Git process run with system and global configuration off,
     no other Git variable, only the file transport, lazy fetching off and
     no hook path? Can a conforming implementation make a network request?
   - Does the copy's required form equal the one `clone-shape.ts` checks,
     and is it checked before the question?
   - Is a missing object (a partial clone's included) refused with nothing
     fetched elsewhere? Are alternates and reftable refused before any Git
     process starts?
   - Can a hook or a code-running setting of the operator's clone run? Is
     the residual stated, labelled Inferred, and is D2's fixture evidence
     reproducible?
   - Is the copy removed when the run ends before its brief, and is a
     completed run's copy kept, located and disclosed as the spec says?
   - Are the copy step's Git processes kept apart from Syzygy's own reads in
     REQ-046's pre-answer list, its blob and pre-answer falsifier arms and
     both oracles, without widening what Syzygy itself may read before the
     answer?
   - Does every write, removal and file absolute of REQ-046 and REQ-047 hold
     for a conforming copy run, no-copy run and refusal run? Is a non-commit
     `--revision` (blob, tree, annotated tag) refused without Syzygy reading
     the object, and does the round-5 self-review table in
     `ROUND-5-DISPOSITIONS.md` hold row by row?
4. **Is Syzygy's list of reads of the operator's clone closed and small?**
   - Can a conforming implementation read an object, the working tree, the
     index or any other Git-directory file of the operator's clone in a run
     that makes a copy? Can it honour the clone's configuration?
   - Does the trunk tip get chosen with no Git process in the operator's
     clone before the copy?
   - Do REQ-046's pre-answer list, REQ-047's list, both falsifiers, the
     scenarios and the question's copy statements name the same reads?
5. **Which runs make a copy, and do the populations agree?**
   - Do the preamble's two classes partition the runs on conditions known
     at launch, keyed on the pinned revision?
   - Every run REQ-047 pins makes a copy unless another act's consent, or a
     launch observation consent recorded with version 1.1's scope, names its
     pinned revision. Does each no-copy run keep its consent's scope or form
     and the v1.1 HEAD refusal, and is a full clone refused under a
     v1.1-scoped launch consent alone?
   - Do REQ-047's read list, the copy rule, the scenarios and the falsifier
     name the same populations? Do the rules bind a run that ends in a
     refusal or a decline?
6. **After the copy, do the signed rules apply unchanged?** Is the copy the
   clone REQ-033 to 036 name, with no edit to their bytes? Does REQ-046's
   write reading extend to the copy's directory, and is that the only write?
7. **Is the registry conflict stated honestly?** Does D9 name, field by
   field, every `typedAuthority` field the redesign contradicts, quoting
   each exactly? Are reads carried from v1.1 kept apart from new
   conflicts? Is the conclusion (a signed successor is needed before v1.2
   can be used) put first on the owner page, with the same fields? Is any
   other signed byte the redesign contradicts left unnamed?
8. **Is REQ-046's derivation byte-for-byte v1.1?**
   - Compare the derivation sentence before and after.
   - Does the added reading (every host, the two-segment floor) change any
     identity v1.1 derived for a path of two or more segments?
   - Do `repository:redis-redis`, `repository:psf-requests` and
     `repository:tzeusy-org-syzygy` still derive?
9. **Does the match by `Upstream:` behave as D7 says?** Does it only add to
   REQ-046's matching and REQ-047's revision branch, and is the other-host
   claim bounded to the URL match?
10. **Is the trunk rule consistent with v1.1 and the implemented reading?**
    The remote-tracking default, `origin` first; the several-remotes
    refusal; local branches not consulted while a default is recorded;
    `--revision` ambiguity from names alone; a non-commit refused once the
    copy shows its type, never followed.
11. **Are credentials kept out of every output?** Refused when typed;
    stripped and disclosed when found in a remote; a remote URL that is not
    a locator never printed, stored or recorded; the copy's file URL never
    recorded as a locator.
12. **Is every quotation exact?** Re-extract by script each quotation in
    `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md`, `OWNER-SIGNOFF.md` and the
    dispositions of the owner's words, the records, the registry entry and
    the specs, and compare. Check the delta's exact blocks against
    `git diff` of the applied patch.
13. **Is the rule-9 sweep reproducible?** Re-run its predicates over the
    populations it names at the commit it names.
14. **Can each new scenario be falsified as written?** One WHEN/THEN pair
    each, an independent oracle under the requirement's form, and a
    falsifier arm a wrong implementation would trip.
15. **Is the change one coherent category, overlapping no other change?**
    Is the change class (Normative) right?
16. **Is the owner page fair and plain?** The question, the version and the
    option label exactly; the shared-records, pre-answer copy, Git-reads,
    hooks residual and agent-reach costs; the registry successor, the typed
    `http`/`git` reading, the port-and-case merge, the SHA-256 refusal and
    the v1.1-recorded consents under "Before you sign".
17. **Does the tooling hold?** `--check` and `--selftest` of the v1.0, v1.1
    and v1.2 builders pass; each predicate has a mutation fixture that
    fails it (verification rule 6); the recorder's selftest passes.
18. **Does any earlier concern survive?** For each finding of rounds 1 to 5,
    is it answered by the redesigned text or by its disposition? A concern
    the redesign re-opens in a new place is a finding.

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

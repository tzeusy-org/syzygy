# Review brief — write consent for launch consent records, round 2

> **Candidate — binds nothing.** Not a review; carries no verdict. Round 1
> (`docs/reviews/R-LAUNCH-WRITE-CONSENT-1-RAW.md`, over `1a368d04`) returned
> `REVISE`, with two findings requiring a change (F1, F2) and six notes (F3
> to F8). The drafter's repairs are recorded in `ROUND-1-DISPOSITIONS.md`.
> Round 2 is scoped to those repairs and to what they touch.

**Offer condition.** The package is offered to the owner for signing only on
`CONFIRM`, or on `CONFIRM WITH EXCEPTIONS` whose exceptions are all notes,
none requiring a change. Any other verdict goes back to the owner with the
raw, not straight to another round.

## What the reviewer is given

CC-REV-1: a fresh context holding the artifact, its governing references and
these criteria. Read no secret, read or clone no target repository, make no
dossier run and no provider call, and create no branch or commit in any
repository. Read the round-1 raw for its findings; do not take the drafter's
dispositions as evidence that a repair holds.

**Scope:**
- `docs/reviews/R-LAUNCH-WRITE-CONSENT-1-RAW.md`;
- the package's `ROUND-1-DISPOSITIONS.md`;
- `git diff 1a368d04 <the dispatched commit>` over
  `.syzygy/governance/contracts/candidates/launch-consent-write-consent/`
  and `scripts/build_launch_consent_write_consent.py`;
- every clause of the record, the semantic delta and the packet that those
  edits touch, read in full where an edit changes its meaning.

**References**, for the touched clauses only: SEC-4
(`.syzygy/governance/doctrine/security.md`); RFC5-12 and RFC5-13
(`.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`);
REQ-polaris-generation-046 and 047 in
`openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`;
screening scope version 8's record population,
`../public-source-screening-scope-v8/SEMANTIC-DELTA.md`.

## Acceptance criteria

Each is a yes/no question; quote the clause that settles it (rule 8).

1. **F1, the parents.** The record now fixes them: no parent for the first
   recording commit, the branch's tip for each later one, and no other
   commit. Does that close the restore path round 1 found, so that a commit
   the operator removes, by deleting the branch or moving it back, can never
   be brought back onto the branch by a recording commit? Is the branch
   kept from sharing trunk history? Do the packet's costs and its "Undoing a
   record" section say this in plain words, without overstating it (for
   example, about commits an agent or the operator makes)?
2. **F2, the transient files.** Does the new clause bring Git's lock and
   temporary object files within the write, so that a compliant
   implementation exists, without permitting any write that spec line 161's
   falsifier forbids?
3. **F3, hooks.** Is "every write runs with the repository's hooks disabled"
   consistent with the exclusions of configuration, hooks and execution?
   Does it require anything the record cannot grant?
4. **F4, rule 6.** Run `--check` and `--selftest`. Does each new mutant fail
   for the reason it names? Remove each guarded test in turn from a
   temporary copy of the builder (the trunk comparison, the reference's
   trailing slash, the location's trailing slash, the parent-rule predicate,
   and the stale refusal in `run()`): does some case fail each time? Name
   any docstring predicate still without a killing mutant.
5. **F5 and F7.** Is the self-observation identity condition stated
   correctly in the semantic delta and the packet? Does the packet's
   "until it is read or revoked", with the operator's removal, now match
   screening scope 8 and the record?
6. **F6.** Is the spec note carried without editing any spec byte, and is it
   labelled as a note for a later version, not a change?
7. **Regressions.** Does any round-1 repair widen the write population,
   weaken an exclusion, or contradict an unedited clause? Run
   `python3 scripts/check_governance.py` and report its summary line.

## Result

First four non-blank lines: the title, `Reviewed commit: <40 hex>`,
`Manifest SHA-256: <the manifest file's sha256>` and
`Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`. The Manifest SHA-256
is the sha256 of the manifest **file**
`LAUNCH-CONSENT-WRITE-CONSENT-MANIFEST.txt`, as
`python3 scripts/build_launch_consent_write_consent.py --manifest-digest`
prints it, never the manifest row's digest: the row is the act's argument,
and a raw's head binds the container. Put findings under a `## Findings`
heading as `**Finding N — title** (requires change|note)`. Give each
file:line and a concrete failure, and label it `[Observed]`, `[Inferred]`
or `[Unknown]`. Grade every exception, because the offer condition depends
on it. Store the raw verbatim as R-LAUNCH-WRITE-CONSENT-2-RAW.md under
docs/reviews/. The campaign file `launch-write-consent.md` under
docs/review-campaigns/ already matches it, and its verdict line is updated
in the same commit.

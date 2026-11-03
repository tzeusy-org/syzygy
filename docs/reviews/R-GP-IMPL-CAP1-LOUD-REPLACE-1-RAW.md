# R-GP-IMPL-CAP1-LOUD-REPLACE-1 — CC-REV-1 review of the syzygy-bpyt.7.9 loud corrupting replaces (PR #603), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 1085ce75
Subject: r1-review.diff sha256 56a7229e751bbbcc98af9a8c390331e048b2bcd87457c3a67bfd64b64f5ba7dd

Reviewer: fresh-context PR reviewer (Claude Sonnet 5.5), 2026-11-03. Exact head
1085ce75aad5d19d093217a88ca51f3b6cef789c; PR base d0844243ed109b1d47f65b910c047af10b8afd9e
(merge-base with origin/main at review time; origin/main has since moved to
bbbffb2f070fe3836c8243a62369a0ebbb573b8a and the PR touches no file that
commit range changed). The subject diff is `git diff d0844243 1085ce75 --
packages` (six files, 27 added lines, 10 removed). The PR also adds three
evidence files under `docs/evidence/syzygy-bpyt-7-9/`. I read no body of
Butlers or of any observed repository.

Reviewed against: the bead `syzygy-bpyt.7.9` (description, design, acceptance
criteria 1 "M03 killed in all five files (rule-6 record with old/new and
commit)" and 2 "Conformance count and titles unchanged"); AGENTS.md
"Conformance expected values are hard-coded literals", "fixtures inputs only",
verification rules 6, 9 and 11.

Blob digests at the head (`git show 1085ce75:<path> | sha256sum`):
m03-mutant-2026-11-03.json 164635cb0d8fefe0cd83f645a47eec9b237bfc565c096f8d9774bd09c46d50bc,
mutate-m03.sh 21523731d08acf045bcda2f474cf52054e5dd961d9a2fe370d2336e2c5ef2a2c,
conformance-test-list.txt 1405ed600058af931543508be2859d9b7cca7bd6a919fff3a9b4c3becfff74bc
(equals the record's `testList.sha256`), fixtures/index.ts
871aa100fdf392b84ba8a08615f473f508af744b03852f02d8fcc021611a374a (equals the
record's `subjectDigests` entry; the other five subject digests also recompute
equal).

## Summary

Both acceptance criteria hold and reproduce at the exact head. M03 is killed in
all five files with the helper's own message, the conformance project is 366
tests before and after with byte-identical sorted name lists, and the helper
keeps needles and replacements as literals at the call site. Of the eight
`.replace(` lines left unchanged, seven are loud by their own next assertion;
one (`req-060` line 40) is the same silent-no-op class and degrades one test
quietly. That, a record field that overstates, and an untested helper are
notes; none blocks the merge and none changes the acceptance result. That is
CONFIRM WITH EXCEPTIONS: notes only, no revise finding.

## What I re-ran, and what came back

R1 (`npm ci`, then typecheck). `npm ci` exit 0 in a detached checkout of the
head; `npm run typecheck` exit 0. CI on the head: `node` and `checks` both pass.

R2 (AC 2, count and titles). `npx vitest run --project @syzygy/cap1-conformance
--reporter=json` at the head: 366 total, 0 failed, 366 passed. Same command at
d0844243: 366 total, 0 failed. Both runs reduced to a sorted `file::fullName`
list: `cmp` reports the two lists identical, and the head list is byte-equal
to the committed `conformance-test-list.txt`. The PR body's "Tests: +0 ~5 -0"
matches the diff (five test lines changed, none added or removed).

R3 (AC 1, rule 6, M03 at the head). The record's own `mutate-m03.sh head
<outdir>` (mutation site asserted to occur exactly once, file restored by a
trap, `git status` clean afterwards): 6 failed of 366, in req-002 (1),
req-004 (1), req-005 (1), req-042 (2), req-063 (1). Every one of the six
failure messages is the helper's `corrupt(): expected exactly one occurrence of
"owner: uniquosity@gmail.com" in the fixture source`; req-004's needle carries
a trailing `\n`. So no file is killed by an unrelated assertion any more, which
was the base behaviour for req-002, 004 and 063.

R4 (the pre-fix claim). The same script, taken from the head and run at
d0844243: 3 failed of 366, req-002, req-004 and req-063, each on a later
assertion; req-005 and req-042 pass silently. That equals the record's
`atBaseCommit` block and the bead's own "3 failed | 309 passed (312)" shape
(a smaller project then).

R5 (rule 9, the sweep population). `git grep -n "\.replace(\|replaceAll"`
over `packages/cap1-conformance/src` at d0844243: 13 lines in 8 files, no
`replaceAll`; at the head 8 lines remain in req-001, 002 (x2), 003, 004 (x2),
005, 060, which are exactly the record's `otherReplaceSitesNotChanged` list
with the same line numbers. Population and remainder both match the record's
`sweepPopulation`. A sweep of `packages/cap1-*/src` outside those six files
found no other `.replace(` on a string needle.

R6 (the eight left sites, one method per site). I patched
`String.prototype.replace` in a throwaway checkout (not the PR) to log the
needle's occurrence count in the receiver for each call made from a req-001,
002, 003, 004, 005 or 060 test file, then ran those six files. All eight left
sites report exactly one occurrence today: the id in req-001, `role:
governance-root` in req-002 (x2) and req-004, `schema_version: "1"\n` in
req-003, `owner:` in req-004, `Orbital Mechanics` in req-005 and `Original
Name` in req-060. So the record's "each needle was not checked to occur exactly
once" is now checked, and the answer is yes, today. The patch was reverted and
the checkout is discarded.

## Notes

N1 (not blocking; the one left site that is the same class). `req-060`
line 40, `SOURCE_AFTER = SOURCE_BEFORE.replace('Original Name', 'Renamed
Project')`. If the name in `SOURCE_BEFORE` changed and the needle did not,
`SOURCE_AFTER` equals `SOURCE_BEFORE`. The scenario test then fails on
`displayName` ... `toBe('Renamed Project')`, but the second test, "sweep: the
identity-field set ... is byte-identical across the rename", compares before
with after and passes vacuously (its denominator asserts, `length` 1 and 2,
do not look at the rename). The other seven are loud by their own next
assertion (`not.toEqual(original)` in req-005, `projectId` equals `otherId` in
req-001, `read.ok` false or `status` failed in req-002/004, `missing` equal to
the two named fields in req-003), so a no-op there fails the same test.
Neither the bead nor the PR claims req-060; the follow-up is one `corrupt()`
call (or an `expect(SOURCE_AFTER).not.toBe(SOURCE_BEFORE)`) in `req-060`.
The record says "each is a silent no-op if absent"; for seven of eight the
test still fails, only the report differs, and the record could say which one
degrades quietly.

N2 (not blocking; a record field that overstates). `atFixCommit.failureMessageInEvery`
is the string with needle `"owner: uniquosity@gmail.com"` and says it is in
every failure. Five of six failures carry that needle; req-004's carries
`"owner: uniquosity@gmail.com\n"`. The shape is the same and the claim is true
as a prefix. Rule 11 is satisfied by `subjectDigests`; I would reword the
field to "the message begins `corrupt(): expected exactly one occurrence of
\"owner: uniquosity@gmail.com`".

N3 (not blocking; the record has no run commit for the fix side). `atBaseCommit`
carries `ranAt`; `atFixCommit` does not, and `fixCommit` is b8e181a0 while the
recorded head is 1085ce75. I checked that the two differ only by the three
`docs/evidence/syzygy-bpyt-7-9/` files (`git diff --stat b8e181a0 1085ce75`:
3 files, 487 insertions), so the fix-side run at the head is the same source;
the `commitNote` also says the commit is unstable under rebase-merge and the
file digests are the anchor, which I recomputed. Naming `ranAt` on the
fix side is a one-line addition.

N4 (not blocking; the helper has no direct test). `corrupt()` throws when the
needle is absent or occurs twice and splices otherwise. The M03 run exercises
the absent arm (six failures) and every passing call exercises the one
occurrence arm; the "occurs twice" arm is untested. A two-line unit test
beside the fixtures would pin it, but the test-growth rule favours not adding
one for a four-line helper whose absent arm is already killed by M03; I note
it, not require it.

N5 (not blocking; design observation). The call sites repeat the literal
`owner: uniquosity@gmail.com` rather than reading `FIXTURE_OWNER`, which is
what makes the failure loud on a default change and also what keeps the
expected spelling a literal (the AGENTS.md rule). The bead's alternative
(`projectYaml({ ..., owner: '""' })`) would remove the coupling altogether
but changes five bodies instead of five lines; the chosen route is consistent
with "fixtures inputs only" and with the bead's design text ("assert ...
before use"). No change asked.

## Boundaries

I did not edit PR #603. The review checkout was a detached worktree of the head
under a scratch directory, with a monkeypatch applied and reverted there only;
the repository's own working tree was not touched. No Butlers body read, no
network call other than `gh` for PR metadata and checks.

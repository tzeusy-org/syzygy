# R-GP-IMPL-CAP1-TEST-ONLY-EXPORTS-AUDIT-1 — CC-REV-1 review of the syzygy-bpyt.7.7 test-only export audit (PR #590), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 34296881
Subject: r1-review.diff sha256 4734420b4a11e4f6b9e9eede98d78825aaf53d753729d95dd9e7122fdc2125fb

Reviewer: fresh-context PR reviewer (Claude Sonnet 5.5), 2026-11-03. Exact head
34296881d93208c9cb8918b0d9816638610b6e93; base 0285819da45684e6299e81402d6ad1b7e4032eab
(the audit's own subject commit, so the PR merges onto the code it audited). The
diff is `git diff origin/main pr590`: four new files under
`docs/evidence/syzygy-bpyt-7-7/` (1,669 lines), nothing else. I read no body of
Butlers or of any observed repository; every fixture below is the repository's
own source or a synthetic mutation of it.

Reviewed against: the bead `syzygy-bpyt.7.7` (description, design, 2026-10-22
note, acceptance criteria 1 and 2); the adopted CAP1 spec at the audit's subject
commit (file sha256 65b66c913cd2650881a9df8cb34a3c63b3f518041e83f45d2451980d9f1d0448,
the digest the record carries); AGENTS.md verification rules 2, 4, 6, 8, 9, 11.

Blob digests of the reviewed evidence at the head (computed with
`git show pr590:<path> | sha256sum`): audit_sweep.py
7b7ce4797e86c85f71bd6bf7927661bc2157f71d2f61c302f8bbbf97b584e761 (equals
`sweepScript.sha256` in the record), evidence.json
1fdb589928624d5a39fb9ec16435c384524d2766911ee8c1910e736ba8749066, README.md
77b5f2f3fe2739cb746f58b535b7787a1b742d520b45d9761474c4b16ea0fbe4,
probe-req060.test.ts.txt
9e28ac5dbf868ae20937e2b62df931ba3f10c161f1b86a14eb2562283ba028e6 (equals the
record's `sourceSha256`).

## Summary

The audit's mechanical claims reproduce, and I found no verdict that is wrong on
the bead's own binary (test support versus gap). Of the 16 rows, none of the ten
"test support" verdicts hides a requirement that is wholly unwired. Three
verdicts are narrower than the prose around them (N1, N2, N3 below): each leaves
a requirement limb unwired or unpinned that the record discloses only in a note,
or not at all, and N1 and N2 name no bead that owns the limb. No finding changes
a verdict count or blocks the merge; all are repairable by a note, a follow-up
bead, or a one-line README sentence. That is CONFIRM WITH EXCEPTIONS: notes
only, no revise finding.

## What I re-ran, and what came back

R1 (rule 4, the check's own output). `audit_sweep.py --selftest` at the head:
seven mutant lines, all `ok`, `selftest: passed`.

R2. `audit_sweep.py <root> --check evidence.json`. Run in a checkout of the
audit's subject commit 0285819d: `sweep matches the stored record`, exit 0.
Run at the PR head itself it prints MISMATCH; I diffed the two JSON documents
and the only keys that differ are `subject` (the commit hash, 34296881 against
0285819d, which the sweep reads from `HEAD`), plus `probes` and `notes`, which
the sweep does not recompute. So the check is valid only at the subject commit,
as the README implies ("recomputes everything but `probes` and `notes` against
HEAD"). README sentence worth adding: run it in a checkout of 0285819d, not at
the PR head (N5).

R3 (rule 6, mutate the input per predicate). I committed six mutants one at a
time to a scratch worktree of 0285819d and ran the sweep; each was detected:
(M1) a production call of `deriveEffectiveStatus` in `apps/syzygy/src/main.ts`
-> "no longer test-only"; (M2) `getAuthorityExposures` supplied in main.ts ->
anchor missing and absence anchor matched, for both u2a.13 rows; (M3) an
`isLocatorShaped` call in `declaration.ts` -> "no longer test-only" and the
absence anchor; (M4) the `OPEN_PROPOSALS` initializer reworded -> anchor
missing; (M5) an `assessCurrency` caller in `coverage.ts` -> absence anchor;
(M6) an `owningAuthority` member added in `pipeline.ts` -> the citeBasis
absence anchor. The shipped `--selftest` itself mutates only the
`authorizeObservation` fixture, so the other rows' anchors and absence anchors
are exercised only by my M1-M6, not by the record's own fixtures (N6).

R4 (rule 2, "used only by tests", second method). The sweep's population is
`.ts` files under `packages/**/src/` and `apps/**/src/`. I re-ran the check by a
different route: every tracked `.ts .tsx .js .mjs .cjs .py .json .html .sh .yml`
file (4,938 of 8,369 tracked files at 0285819d) outside `docs/`, `openspec/`,
`.syzygy/` and `.beads/`, word-bounded match, `.test.ts` excluded. Each of the
16 names appears only in its defining file, with three further hits that are not
uses: `answersAgree` is a local summary key in `scripts/measure_decisions_sweep.mjs`
and `scripts/measure_line_slot_reads.mjs`; `authorizeWrite` is named in a comment
at `packages/cap1-daemon/src/consent-loading.ts:153`. The test-only claim holds
for all 16 over a population wider than the sweep's.

R5 (rule 8, quoted clauses). For the ten distinct requirements the record quotes
(016, 046, 014, 053, 064, 045, 042, 060, 062, 061) I checked that the heading is
at the recorded line and that the quoted paragraph is a verbatim, whitespace-
normalized substring of the spec text under that heading. All ten match; the
spec file digest in the record equals the file at 0285819d.

R6 (rule 8, anchors). I read the recorded anchor lines for the load-bearing
rows: main.ts:229 (`const getEvaluation = () => projectEvaluation;`), :235
(`...humanRoutes({ getEvaluation }),`), :140 (`governedPlaneViolation`);
routes-machine.ts:187 (`OPEN_PROPOSALS`), :246 (the empty planes comment);
distinction.ts:35 (`name: 'epistemic-label'`); declaration.ts:162
(`project.id` non-empty only); write-boundary.ts:20 (the false-permit comment);
routes-human.ts:355 (`Stated basis:`). Each line says what the record says it
says. The human channel's per-unit `data-epistemic-label` attribute, which the
epistemicMarking rationale cites, comes from `renderFact`'s `extractDistinctions`
loop (routes-human.ts:151-160), while the recorded anchor pins only the
`fact-label` text span (:167); the claim is true, the anchor is the weaker half.

R7 (the runtime probe, Observed). I ran `probe-req060.test.ts.txt` at 0285819d
(`npm ci` in the scratch worktree, copy to
`packages/cap1-conformance/src/zz-b77-probe.test.ts`, `npx vitest run`, delete).
Output: `PROBE-REQ060 {"candidateProjectId":"https://example.com/acme/project",
"candidateRepositoryId":"/srv/repos/shared","isLocatorShapedProjectId":true,
"isLocatorShapedRepositoryId":true,"declarationReadOk":true,
"registrationStatus":"registered","servedIdentityFields":[{"field":
"facts.projectId","value":"https://example.com/acme/project"}]}`, identical to
the record's `probes` output; the run left the worktree clean. The
`isLocatorShaped` gap is real and the stable-identity.ts header comment ("Used
fail-closed at admission points") describes a use that does not exist.

R8 (counts). 16 = the bead's 15 named functions + `authorizeWrite`; 9 + 1 = 10
test support, 2 + 2 = 4 filed, 2 new; 9 + 4 + 2 = 15. The README's "10 test
support (9 of the 15)" is arithmetic-consistent. `authorizeWrite` has five
`it` blocks that call it in `req-061.conformance.test.ts` (the five under the
describe "authorizeWrite permits governed-plane writes, refuses external"),
against the bead's "6 tests"; the record's "5" is right, and the file has
seven call sites in all.

R9. Scope. `git diff --stat origin/main pr590` lists four files, all new, all
under `docs/evidence/syzygy-bpyt-7-7/`; no code, test or governed-plane file
changes, consistent with "report only, no deletion". The PR body states
`Tests: +0 ~0 -0`.

## Findings (all notes; none is a revise finding)

N1 (medium). `citeBasis` is classified "test support" and carries bead
`syzygy-u2a.13`, but its verdict text admits the positive limb of CAP1-REQ-045
("every answer's cited basis is its owning authority") has no production source
(`ExplanationFactSet.owningAuthority` is populated by nothing in the daemon; I
re-ran the grep: the only non-test `owningAuthority` writes outside the
authority exposure type are in `authority.ts` and `drawer.ts`). On the bead's own
binary that limb is an unwired requirement, which the bead says to file under
syzygy-u2a, not to call test support. Worse, `syzygy-u2a.13`'s description,
design and acceptance criteria cover CAP1-REQ-046 authority exposures only, and
its acceptance criterion 2 says nothing of the explanation basis, so "follows
u2a.13" is not a tracked owner. Repair options: split the row (prohibition limb
test support, positive limb gap), or extend u2a.13's acceptance text to name the
REQ-045 basis limb. Either way the README table should not show a plain "test
support" for a row that has an open limb.

N2 (medium). The `authorizeWrite` row quotes the whole of CAP1-REQ-061 and
concludes "test support", but REQ-061's second limb ("no manifest field may
widen that write universe: a field purporting to do so is inoperative and
renders as a contradiction routed to the owner") is carried in the same
conformance file by `detectWideningFields` and `reportEffectBoundary`, neither
of which has a non-test caller (I re-ran the grep over non-test `.ts`: the
definitions and `WIDENING_FIELD_NAMES` only). The record's
`siblingsOutsideTheFifteen` note says production surfaces a widening field "as a
named unknown-field declaration failure ... not as a contradiction routed to the
owner" and labels it Inferred, but proposes no gap bead for it and the README
omits it. A refused declaration is stricter than an inoperative field, and it is
not the contradiction the clause names, so the limb is at best unverified. File
a candidate (or record why the unknown-field failure satisfies the clause and
route that reading to the owner), and add the sibling to the README, not only
to `evidence.json` notes.

N3 (low-medium). `authorizeObservation` is "test support" because production
decides consent per pair in `decideRepositoryConsent`. That is true, but the
audit does not say which test pins the production pair refusal, and the REQ-016
conformance file does not: its sweep (req-016.conformance.test.ts:94) runs
`computeCoverage` over `decisionsFor(...)` from `fixtures/index.ts`, a test-side
reimplementation of the decision (`record-subject-mismatch` at
fixtures/index.ts:339), and its cross-project falsifiers (:84, :120, :144) run
`resolveConsent` and `authorizeObservation`. The production refusal
`record-subject-mismatch` (consent-decision.ts:643) is pinned by one test,
`cap1-daemon/src/source-snapshot.test.ts:273`. So deleting `authorizeObservation`
would leave REQ-016's cross-project and cross-repository falsifiers in the
conformance file pinned against a fixture copy, not against production. The
verdict stands (the requirement is wired); the deletion consequence the bead
asks the audit to weigh does not. Also unlisted: `resolveConsent`
(consent.ts:76), the producer of `authorizeObservation`'s input, has no
non-test caller either (production hits are comments only), and is in neither
the 15 nor the siblings note.

N4 (low). Label discipline. Rows labelled `Observed` (authorizeObservation,
isComplete, epistemicMarking, presentProject, presentRepository, authorizeWrite)
combine observed anchors with an equivalence judgment ("the requirement is
carried by that other path"), and AGENTS.md says an LLM assertion is Inferred.
The row label is the anchors', the verdict is the judgment. `authorizeObservation`
already carries an inline `[Inferred: superseded by the consent-decision
pipeline]` inside an `Observed` row. Suggest labelling the verdict and the
anchors separately, or marking these rows Inferred for the verdict.

N5 (low). The README's `--check` command is valid only in a checkout of the
subject commit 0285819d (R2), and the PR head is by construction a different
commit. A later reader running the README line at the merged commit will see
MISMATCH on `subject` and may read it as drift in a verdict. Add "run in a
checkout of the subject commit". Also, the record's PR 585 note ("its diff adds
no production caller ... at its head 3c30b2e2") is point-in-time: PR 585 is
still open at that head today (checked via `gh pr view 585`), so the claim holds
now; the record already says to re-run after u2a.7 merges. Separately, u2a.7's
Outcome lists "proposal ... arms" while its Non-goals list "proposals"; the
rows that assign `computeDiscoverabilityWithProposal` to u2a.7 rest on its
Context naming REQ-050..053, which is defensible, but the ownership is not
spelled out in u2a.7's text.

N6 (low). Rule 6. `--selftest` holds one fixture (`authorizeObservation`) and
five mutants plus the comment-only and absence-anchor cases; it does not
exercise the duplicate-definition arm, the scope-prefix arm of an absence
anchor, or `strip_comments` on block comments. M1-M6 above show the shipped
predicates do fire on the real tree, so this is a fixture gap, not a defect.
`strip_comments` treats any line beginning with `*` as a comment, which a
continuation line of code can begin with; it fails in the safe direction only
if the continuation names none of the 16 functions, which holds at 0285819d
(R4).

I1 (information). The record is honest about what it does not establish: the
siblings are labelled Inferred, the PR 585 note carries its head, the proposed
gap beads say "owner gate first" and "fold into dov.2 if the owner prefers",
and `authorizeWrite` is recommended as keep-and-pin (option a) rather than
deleted, which I agree with: option (b) would remove five REQ-061 conformance
tests and four req-integration assertions for no production gain, and the
false permit for `openspec/../README.md` is already recorded at
write-boundary.ts:20 with the external oracle named. The `isLocatorShaped` gap
is a real defect in the stable-identity contract (REQ-060), reproduced at
runtime, and should reach the owner as the record proposes.

## Not reviewed

I did not run the full test suite or the CI battery (the diff touches no code
or test). `scripts/check_governance.py` and
`scripts/check_docs_review_campaign_partition.py` are run on the review PR that
retains this raw, not on the audited head.

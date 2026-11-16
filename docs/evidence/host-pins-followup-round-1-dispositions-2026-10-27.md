# Host pins follow-ups: review dispositions, round 1

[Observed] This record gives the dispositions of the one CC-REV-1 review
round of `syzygy-bpyt.7.16` (pull request #542). The change adds test-only
rows for four notes of the PR #535 review: N3, N4, N5, and the optional N7.
Each row pins behaviour the code already has:
- N3 (class 1): a state-write row refuses the upper-cased sibling
  directory as `traversal`;
- N4 (class 4): the "any other whitespace" Bearer row gains a leading-space
  form and a no-break-space form;
- N5 (class 4): a browser-origin row refuses a suffix-shaped origin and the
  `null` origin;
- N7 (class 4): the breach row gains a fifth, case-folded population, which
  is withheld.

The lane's evidence is under `docs/evidence/syzygy-bpyt-7-16/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-HOST-PINS-FOLLOWUP-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `fb481b4d` | `r1-review.diff` sha256 `189e8f8ab41d52414a4773885f75551603f62916f30b2ebc440a7d4de5d166e0` |

The subject equals `git diff eb8fb6cb fb481b4d`: 19 files, of which three are
test files (`credentials.test.ts`, `browser-origin.test.ts` and
`http-host/src/server.test.ts`). The other 16 are the lane's evidence. No
product byte changes: the blob ids of `credentials.ts`, `browser-origin.ts`
and `http-host/src/server.ts` are equal at `eb8fb6cb`, `0d7eaf08` and
`fb481b4d` (raw section 1). `0d7eaf08` is git's own merge of the code commit
`acb92078` with main `eb8fb6cb` (raw section 1, `git merge-tree`).

At landing the branch took one more merge: `9c607812`, the landing head of
PR #538. That commit already holds main `973965a8`. The branch merged it
rather than main alone, so the commit landed here holds both PRs' bytes, and
the battery that ran on it covers the tree main has after both merges.
[Observed] Main changed 355 paths from `eb8fb6cb` to `9c607812`, and none
of them is one of the PR's 19. After the merge,
`git diff 9c607812 HEAD | sha256sum` printed the subject digest above. Hosted
`checks` and `node` passed at `fb481b4d`, and the lane's clean-clone battery
gave `commands=114 nonzero=0` there. The battery ran again on the landing
commit (rule 7), and hosted CI on that commit was checked before the merge.
PR #542 was merged only after PR #538.

The round found notes only. Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), it clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class and the GP-Q0 ruling

The PR declared classes 1 and 4, and the reviewer ruled the same (raw section
2, "Class ruling"):
- class 1, because the N3 row pins `authorizeStateWrite`, the daemon's one
  write boundary;
- class 4, because of Bearer admission, the browser-origin check and the
  content-blind breach diagnostic.

Classes 3 and 6 are not touched.

GP-Q0's checks:
- **Differential.** The product modules are byte-identical at base and head,
  so an old-versus-new differential would run the same code twice. The
  reviewer accepted "identical by construction" as discharging it for a
  test-only subject.
- **A rule-6 mutant per predicate.** The PR 535 reviewer's targets V2, V4,
  V6 and V10 survive at base and are each killed at head by its own row
  alone, and so are the lane's own mutants O1 and O2. The reviewer re-ran
  them over the import closure (1,022 tests in 105 files at base) and added
  mutants of its own (raw sections 3.2 and 3.3).
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing.

**Gates.** No product byte changes, so no gate's code changes. The one output
that moves is the POC surface version, a content address of both source
trees. The reviewer found no run record for it to stop matching: 0 files
under `.syzygy/governance/records/` and 0 tracked paths containing
`PWB-WALKTHROUGH-001`, at `fb481b4d` and at `973965a8`. So nothing a gate
accepts or refuses changes. The reviewer also ruled that the version's move
is not "a rendered byte" in GP-Q0's sense (`:53`), since reading it that way
would forbid every `apps/**` change that `:51` permits. The owner may
reclassify (CC-REV-1).

## Round 1: six notes

**N1, R6 survives: the real-location check is not pinned against case
folding.** Carried to `syzygy-bpyt.32` item 1, a symlink row expecting
`symlink-escape`. This is a pre-existing gap on the class-1 write boundary,
not caused by this PR. The new row's comment "containment compares case too"
(`credentials.test.ts:300`) is wider than the one call the row pins, and the
same bead corrects it.

**N2, R8 survives: the breach allow-list is not pinned against a prefix
match.** Carried to `syzygy-bpyt.32` item 2, a sixth population that starts
with a listed reason. This is a pre-existing gap outside N7's case-only
scope.

**N3, the surface-version carrier claim and the landing move.** Corrected
here; no byte of the PR changes.
- The PR body's "`git grep` at head finds neither value in any tracked file"
  holds at `0d7eaf08`, where `record.py` runs. At `fb481b4d` exactly 1
  tracked file carries both values: this PR's own `summary.json`, which is
  evidence and bound by no act.
- The PR states its move from base to head
  (`polaris@ddd7d1721dd8` to `polaris@8928d19927d7`). The move main sees is
  measured against the tree main has just before this merge, after PR #538:
  `polaris@a7110fcf05f6` at `9c607812`, to `polaris@6a19eceef137` at the
  branch's merge commit `c176a802`. The landing commit adds only files under
  `docs/`, so it carries the same version. The reviewer's pair against
  `973965a8` (`polaris@dec8a22f7541` to `polaris@3dfdcc5bd309`) was measured
  before PR #538 landed.

**N4, one changed evidence line holds a literal U+00A0.** That line is
`docs/evidence/syzygy-bpyt-7-16/own-head.json:53`, in O1's failure message.
It is verbatim tool output, and `record.py`'s O1 check relies on it, so it
is kept. The PR's claim that "`record.py` fails if any subject file holds a
literal U+00A0" covers the three test files, not the evidence. The reviewer
ruled that its no-literal trigger does not reach a verbatim failure message.
One retained reviewer tool also holds a literal U+00A0:
`docs/evidence/host-pins-followup-review-2026-10-27/r1/tools/nonascii.py:41`,
as raw section 8 discloses. It is kept as it ran, because its digest is the
tool that produced `nonascii.json`. The hazard is carried to
`syzygy-bpyt.34`.

**N5, two kept titles are narrower than their populations.** Carried to
`syzygy-bpyt.32` item 4, optional, for the next touch. The bead allowed both
forms to be added without a retitle, and each row's comment states its whole
population.

**N6, the lane's survival denominators were its 19 paths, not the import
closure.** Every survival claim still holds over the closure (raw section
3.1). The process point, deriving a mutant run's file list from the import
closure, is carried to `syzygy-bpyt.32` item 5.

## The lane's follow-ups

The lane's worker report named three follow-ups. Each is filed:
- V7 and V8, the case-variant origin rows, are `syzygy-bpyt.32` item 3. They
  are optional, because the PR 535 review calls both equivalent under the
  browser threat model.
- The tree sweep in `polaris-authority-sweep.test.ts` took 7,656 ms against
  the 5 s default in one of two full runs at load1 61.7. That is
  `syzygy-bpyt.33`.
- The tool-input hazard that turns a typed escape into a literal U+00A0 is
  `syzygy-bpyt.34`.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/host-pins-followup-review-2026-10-27/r1/`, 42 files. The raw's
section 8 lists 46 kept files with their sha256. At landing a script checked
all 46 against the reviewer's directory: 46 matched, 0 failed, and no kept
file was unlisted. Not retained, though the raw quotes each one's result line:
the governance, quotation, typecheck and `npm ci` logs, 4 files. A governance
log quotes the retired phrases it reports, so a tracked copy would fail
CG-2a. The two probe tests under `tools/` (`zz-rev542-*.test.ts`) sit outside
every root Vitest project's `include`, so the suite never collects them.

## Acceptance criteria

The bead has no `acceptance_criteria` field, so the reviewer took its four
items as the criteria (raw section 6):
- N3: done, with round 1's N1 as the residual.
- N4: done; the no-break-space form is written as an escape.
- N5: done. V7 and V8 survive as disclosed residuals.
- N7 (optional): done, with round 1's N2 as the residual.
- GP-Q0's review rule: the differential (by construction) and the mutants
  are met, and the owner notice is posted at landing.
- `Tests: +2 ~2 -0`. No other row's body or title changes.

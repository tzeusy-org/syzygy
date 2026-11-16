# R-GP-IMPL-OBSERVED-LEAVES-2 — CC-REV-1 implementation review of syzygy-bpyt.4.26, round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: cf01d1f3
Subject: `git diff origin/main cf01d1f3` sha256 55d7dbc9fe607f875dd07608b76915c5ddc7b1ce7de809eee73f3c14a84bd41b; PR body sha256 8672e50c547a2ff15b4196517a55cf4b15be2d06940e6172f6c9dd00088c42a8

Reviewer: syzygy-bpyt.80 round-2 worker (fresh context), 2026-11-02. Scope per the coordinator's brief: confirm the round-1 text
for F1, N2 and N4 is in the PR body as round 1 required; confirm the rebase onto latest `origin/main` changed nothing but the
`docs/README.md` partition figures; say whether the owner notice the round-1 disposition calls for exists; report N1 as a
follow-up. I changed no byte of the test or of the evidence; the one rebase was authorized by the coordinator and owner (merge
queue on; `docs/README.md` conflict). This raw and the `docs/README.md` row/count are added in a separate commit after
`cf01d1f3`.

## 1. Subject identity

- [Observed] PR #559 head before the rebase: `644618a13e3fb3e8627dd40ef291e316902207db` (`gh pr view 559`, `git ls-remote`),
  `mergeStateStatus` `DIRTY`.
- [Observed] `git rebase origin/main` (main `b77bae09`, "Merge pull request #561") stopped on one conflict, in
  `docs/README.md` only, at the fourth commit (`644618a1`). `scripts/` prepare helper also reported `rebase-conflict` and
  aborted cleanly; the rebase was then done by hand.
- [Observed] Rebased head `cf01d1f3`: four commits (`18d39ab6` test, `492235e6`, `e16ce244`, `cf01d1f3` docs) over
  `b77bae09`; `git log HEAD..origin/main` empty at review time.
- [Observed] `git diff origin/main cf01d1f3 | sha256sum` = `55d7dbc9fe607f875dd07608b76915c5ddc7b1ce7de809eee73f3c14a84bd41b`;
  `--shortstat`: 26 files changed, 2619 insertions(+), 59 deletions(-).

## 2. The rebase changed nothing but the README figures

- [Observed] Python/`git` comparison: the set of paths other than `docs/README.md` changed by the old head against its old merge
  base (`e5667689`) is 25; the set changed by `cf01d1f3` against `origin/main` is the same 25 (`diff` empty). For each of the 25
  `git rev-parse 644618a1:<path>` equals `git rev-parse cf01d1f3:<path>`. All 25 blobs are byte-identical, including
  `packages/polaris-dossier/src/review.test.ts` and the 16 retained evidence files.
- [Observed] `git diff origin/main cf01d1f3 -- docs/README.md` changes one line, the "Greenfield-parity implementation" row:
  the count cell `102` -> `103`, and one appended segment, "`syzygy-bpyt.4.26`, the observed-only leaf check off the TMPDIR path
  (PR #559): round 1 `REVISE` ... (notes carried to `syzygy-bpyt.4.43`)". The row's date range, its `syzygy-bpyt.55` segment
  (main's, from #561) and every other row are main's bytes. The count sentence below the table is unchanged from main (`111`
  rows, `617` files); it is stale by one at `cf01d1f3` (the PR adds one raw to `docs/reviews/`). [Observed] The partition
  helper, run at `cf01d1f3`, prints `total=618 assigned=618 raw=584 other=34 unmatched=0 overlaps=0 observed=2026-11-02` and
  `Greenfield-parity implementation 103 2026-10-21 -> 2026-11-02`; the count sentence is re-derived in the commit that adds this
  raw (it then reads one more).
- Conclusion [Observed]: apart from the README row and count, the rebase changed no byte.

## 3. F1, N2 and N4 in the PR body

- [Observed] `gh pr view 559 --json body --jq .body | sha256sum` = `8672e50c547a2ff15b4196517a55cf4b15be2d06940e6172f6c9dd00088c42a8`,
  6,692 bytes; equal to the digest the coordinator recorded.
- F1, Summary sentence [Observed]: the round-1 raw's replacement ("It also asserts that the `os.tmpdir()` string no longer
  occurs anywhere in that JSON, and that the digest of the packet the test assembled still does.") occurs in the body once,
  after whitespace normalization (the raw hard-wraps at 120 columns, the body does not).
- F1, "## New test refusals" section [Observed]: the raw's replacement (heading through "...a leaf right before, right after or
  under the run path also fails it).", 1,730 characters) occurs in the body once, after the same normalization. The old
  sentences "An Observed holder that carries a path under `os.tmpdir()` outside the run directory" and "no longer carries the
  packet digest it observes" do not occur in the body.
- N1 option [Observed]: the raw said that if N1's code fix is not applied the unescaped-comparison sentence stays; the body keeps
  "The comparison is the unescaped `os.tmpdir()` string against JSON text, so a TMPDIR holding `\"` or `\\` never matches", and
  its "Review round 1" paragraph says N1 goes to a follow-up bead. Consistent.
- N2 [Observed]: the body's "Tests delta and class" holds "CC-REV-1 class 3 (deterministic observation, the deterministic/inferred
  seam) at the test-oracle level, by the round-1 review's ruling; I had read it as class 4." The old "as the author I read this as
  class 4" and "That is my reading, not a ruling" do not occur. (The bullet reads "CC-REV-1 class: CC-REV-1 class 3 ..."; the
  doubled label is the reviewer's own replacement text inside the existing bullet. Cosmetic, not a note.)
- N4 [Observed]: "(no product module, config, manifest or `scripts/` change; the evidence tools are under
  `docs/evidence/syzygy-bpyt-4-26/tools/`)" occurs once.
- Body's own staleness [Observed]: "Checks" quotes the full suite at `a64518bd` and says the battery "at this head, `6d95c626`" is
  running. Those are the figures the round-1 raw reviewed and are labelled by their heads, so no sentence is false. They say
  nothing about `cf01d1f3` (see §5, the landing note).

## 4. The owner notice

- [Observed] The round-1 disposition, `docs/evidence/observed-leaves-dispositions-2026-10-29.md`, section "Class and the GP-Q0
  ruling", says: "The coordinator posts a notice on `syzygy-bpyt.10` at landing that names class 3, the narrowing and the exact
  refusals, as the body's 'New test refusals' section now states them."
- [Observed] `bd comments syzygy-bpyt.10` (2,556 lines) holds no comment naming `syzygy-bpyt.4.26`, `#559`, the observed-only
  row or the class 3 ruling for this change. The only hit for `bpyt.4.26` is a line in an earlier notice (the PR #524
  review's N4) saying the defect was filed as `syzygy-bpyt.4.26`. So the notice **does not exist yet**. It is due at landing
  (non-blocking under GP-Q0: "a non-blocking owner notice in the cycle report"), so its absence now is not a defect.
- Required content, from the round-1 raw (§2, N2, F1) and the disposition, for whoever posts it (I do not author owner acts):
  1. The change: `packages/polaris-dossier/src/review.test.ts` only (plus retained evidence); no product module, gate, config or
     `scripts/` change; PR #559, bead `syzygy-bpyt.4.26`.
  2. The class: CC-REV-1 class 3 (deterministic observation, the deterministic/inferred seam) at the test-oracle level, by the
     round-1 ruling; the lane had read class 4. GP-Q0's stop clause does not fire (no product gate changes), per round 1.
  3. The narrowing: the observed-only row no longer refuses a verdict leaf whose every occurrence in a holder's string values lies
     inside, or straddles the edge of, an occurrence of the run path. This is the bead's own acceptance criterion.
  4. The exact new refusals, as the body states them: (a) the `os.tmpdir()` string still occurring in a holder's JSON after the run
     path is replaced, with the caveats the body lists (a `<run>-old` sibling is replaced along with the run path and is not
     refused; text that merely begins with the `os.tmpdir()` string, such as `<tmpdir>-other`, is refused though it is not under
     `os.tmpdir()`; the comparison is unescaped, so a TMPDIR holding `"` or `\` never matches, which is `syzygy-bpyt.4.43`; a
     symlinked TMPDIR is refused only where the stray path contains the TMPDIR's own spelling); (b) the assembled packet digest
     absent from the replaced text (a vacuity guard, not a pin of `packetSha256`).
  5. The evidence: round 1 `REVISE` on PR-body text only, repaired with the reviewer's exact text; this round 2; the dispositions
     file; the 8-mutant records under `docs/evidence/syzygy-bpyt-4-26/`; tests delta +1 (5810 -> 5811).

## 5. Verification at `cf01d1f3`

- [Observed] `npm ci` in a fresh worktree, exit 0 (12 `@syzygy/*` links).
- [Observed] `npm run typecheck` exit 0.
- [Observed] `npx vitest run packages/polaris-dossier/src/review.test.ts`: 1 file, 63 passed (63), exit 0, with the default TMPDIR; and
  again with `TMPDIR` set to a directory whose name holds `p1` (`.../tmpdir-p1-x`): 63 passed (63), exit 0. Round 1 reported 62 -> 63
  rows; the same count holds after the rebase.
- [Observed] Review threads on PR #559 (`list_review_threads.py`): 0 threads, 0 unresolved.
- [Unknown] The full suite and the canonical battery at `cf01d1f3` were not run by me; round 1 ran the full suite at `6d95c626`
  (5,811 passed). The files that changed between `6d95c626` and `cf01d1f3` besides `docs/README.md` are none (§2), but main
  gained #557, #558 and #561 in the meantime; hosted CI at the exact pushed head is the gate for that.

## 6. Notes (none blocking)

- N-A (owner notice): not yet posted; content listed in §4. Due at landing.
- N-B (stale heads in the body): "Checks" and "Rule 6" quote results taken at `a64518bd`/`6d95c626`. The landing note on the PR should
  give the battery result, hosted `checks` and `node` results and the surface version at the exact landing head (the disposition
  already promises this).
- N-C (README count): the count sentence at `cf01d1f3` is main's own and is one short; re-derived with the partition helper in the
  commit that adds this raw. Treat it as a CG-26 style coupled edit: if main moves again before the queue merges, re-run the
  helper after any rebase even when git reports a clean merge.
- N-D (N1 follow-up): `syzygy-bpyt.4.43` ("review.test.ts: compare JSON-escaped TMPDIR and leaves so a TMPDIR holding a quote or
  backslash does not fail falsely (PR #559 R1 N1)") exists and is open; it carries the round-1 two-line fix. Reported as the
  follow-up; no action on this PR.

## 7. Verdict

No blocking finding. F1, N2 and N4 are in the body as round 1 required; the rebase changed only the README figures; the owner
notice is owed at landing and its content is listed; N1 is `syzygy-bpyt.4.43`. Under the stopping rule no further round is
requested.

Verdict: CONFIRM WITH EXCEPTIONS (notes N-A to N-D only), over `cf01d1f3`.

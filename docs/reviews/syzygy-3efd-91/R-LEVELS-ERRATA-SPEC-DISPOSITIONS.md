# R-LEVELS-ERRATA-SPEC-1: dispositions

Review: `R-LEVELS-ERRATA-SPEC-1-RAW.md` in this directory, verdict `REVISE` (line 2), over `02234e39b` (install `fe32fd9f4`). It has one blocking finding and six notes. One round; no confirmation review follows (D10).

The spec repairs are in install commit `041073ce8`, made by the package's anchored build script, with the delta regenerated and `VLERR_SUBJECTS` rebound. Row A-346 names `1243b1b3e`, the package's last commit (its README's rollback note); the spec is unchanged since `041073ce8`.

## 1. Blocking: "four produced graphs" with `hidden` omitted

Repaired. The zoom target scenario's lead-in now reads "four graphs about `app`, every one produced but `hidden`", which agrees with the omitted `hidden` and with the test (`view-level.test.ts`, three produced graphs and one omitted).

## 2. Note: D7's [Observed] claims cite unpushed code and an untracked raw

Repaired.

- The .35 repair and its review files are pushed on `agent/syzygy-3efd.35-code`:
  - the repair commit is `0fbcadcc4`;
  - the R35 raw, campaign and dispositions are in `6842f9a56`;
  - the branch head when D7 was written is `3760f645d`.
- D7 cites those commits and says that the code is not on main yet.
- The row states that A-346 lands, and its tag is made, only after the .35 code lands. `tasks.md` says the same of the tag.

## 3. Note: the revert chain does not apply cleanly

Repaired.

- The row's revert column now runs newest first: `1243b1b3e` (the README's rollback note), `960433d94` (a census note made after merging main), `041073ce8`, `02234e39b`, `fe32fd9f4`, `be6c1d7ce`, then the wiring commit `d7c42eb6b` with the adoption log restored from `HEAD`, then the first install `4ae2baf18`.
- The README's "Rollback after a veto" gives the `d7c42eb6b` step as three commands. It says that this commit holds the census, status and index lines and the checker's count constants, and that it comes before the first install's revert.
- The README's "Rollback after a veto" also says how to resolve a conflict with another change's later edit of the same lines: keep the later side and delete only this version's own lines and names. After the merge of main that brought in session usage 2.45, the wiring revert conflicts in `PROJECT-STATUS.md`, and the first install's revert conflicts in both checker scripts.
- [Observed] The chain was run by that procedure in a scratch clone at the branch head named in the PR body. The result differs from the default branch only by the kept row and this review's three files. Every revert applied; the `d7c42eb6b` step stopped on a conflict in the adoption log alone, which the checkout resolved. The result differs from the merge base `3f04944bb` only by the kept row and this review's three files.

## 4. Note: the refusal sentence has no named means of verification

Repaired.

- The requirement now says that no checked draft reaches the case. It is verified only by a test that makes the inertness check fail for a chosen target and observes the refusal, with no site written.
- `tasks.md` lists that code test as a follow-up.

## 5. Note: the added scenario's walk advice line names no draft, view or walk; no `.kube` test

Repaired.

- The line now names its draft: a v17 draft with no finding, whose section `s1` walks a produced graph view `d`. The view's base is the `directories` map, selecting `src`, `kubeconfig` and `.kube`, with one step on each.
- It states the result: `examined` 1.
- The .35 check-level test under the committed policy now also holds `.kube/notes` and walks `.kube` (`0fb0fd9b3`).
- `tasks.md` keeps the literal test of this scenario's own tree as a follow-up.

## 6. Note: `kubeconfig/notes` itself is not denied

Repaired.

- The scenario's AND says that `kubeconfig/notes` is not itself a denied path, because the basename rule reads a path's final segment and so names only the directory's own path.
- D7 records the same, and records that no policy change is implied.

## 7. Note: line numbers moved on main

Repaired. D7 names the commit each line number is read at (`3f04944bb`), gives the approximate lines at `edb073890`, and names the symbols (`zoomTargets`, `drawnFigures`).

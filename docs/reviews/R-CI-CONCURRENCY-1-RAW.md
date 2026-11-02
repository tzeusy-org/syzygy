# R-CI-CONCURRENCY-1 — PR #577 review of syzygy-9alf (review bead syzygy-f1yt)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 8dd061ecc9cf98724d8322be8a7f9dcebb6481b4
Subject: git diff e423811a24fe6a85ff0feb4efeacf54949b08135 8dd061ecc9cf98724d8322be8a7f9dcebb6481b4 sha256 00bf18b728cf2c6691aa8cd002dbc166b9e7a0951bd51ffe4394b9c1ac08d2d0

Reviewer: fresh-context PR-review worker (Claude Sonnet 5.5), GitHub login Tzeusy, 2026-11-03.
Base: the PR's merge base `e423811a`; the PR head is behind current `origin/main` but touches only
two workflow files and merges without conflict. No rebase performed on the PR branch.
Scope: two commits, 16 added lines, `.github/workflows/node-ci.yml` and
`.github/workflows/governance-docs.yml`. Tests: the PR states +0 ~0 -0, which is correct for a CI-config change.

## Verdict basis

The block does what the PR says for every trigger these two workflows declare. Two low notes and one
unobserved-evidence note; none needs a change before merge.

## Checks run

- [Observed] Declared triggers, parsed with PyYAML from the head blobs: both workflows declare exactly
  `push` (branches main), `pull_request` (branches main) and `merge_group` (checks_requested). Neither
  declares `workflow_dispatch`, `schedule` or `pull_request_target`. `generation-mutation-gate.yml`
  (schedule and `workflow_dispatch` only) is untouched and was not in scope.
- [Observed] The block in both files is byte-identical: `group: ${{ github.workflow }}-${{
  github.event.pull_request.number || github.run_id }}` and `cancel-in-progress: ${{ github.event_name ==
  'pull_request' }}` (`node-ci.yml:36-38`, `governance-docs.yml:31-33`). The two `name:` values differ
  (`node-ci`, `governance-docs`), so the two workflows never share a group.
- [Inferred, from GitHub's documented event payloads] Per trigger:
  - `pull_request`: the payload carries `pull_request.number`, so the group is `<workflow>-<PR number>`
    and `cancel-in-progress` is true: a newer head cancels the older run and replaces any pending one.
  - `merge_group`: the payload has a `merge_group` object and no `pull_request`, so the `||` falls to
    `github.run_id`. Each run has its own group and `cancel-in-progress` is false.
  - `push` to main: no `pull_request` in the payload; same fallback, same result.
  - A unique group is what stops the pending-run displacement. In a shared group a newer pending run
    replaces an older pending one even with `cancel-in-progress: false`; here no two runs share a group,
    so nothing is displaced. The PR comment states this correctly.
  - No numeric collision: a PR number is at most a few digits, a run id is 11 digits.
- [Observed] The `pull_request` cancellation works. Runs 41476580922 (governance-docs) and 41476581036
  (node-ci), both `pull_request` on head `224c8113`, ended `cancelled` (updated 15:57:23Z). The head
  `8dd061ec` runs 41476674135 and 41476674168 were created at 15:57:21Z and passed. `224c8113` already
  carried the same block (`git show 224c8113:.github/workflows/node-ci.yml` lines 36-38), so the older run
  was in the group that cancelled it.
- [Unknown] The `merge_group` and `push` isolation has no observed run. No run of either event has
  executed with the block, since the PR is unmerged. The conclusion rests on the documented payload
  shape only. The first queued PR after merge is the observation; nothing in the repo can produce one
  earlier.
- [Observed] `gh pr checks 577` at the head: `checks` (governance-docs) pass, `node` (node-ci) pass.
- [Observed] `python3 scripts/check_governance.py` with the two head workflow files applied over current
  `origin/main` (`0670bdb5`): `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0. CG-26 compares the step list
  of `governance-docs.yml` with the PROJECT-STATUS battery and this PR adds no step.
- [Observed] Pins: `git grep` over `scripts/`, `apps/`, `packages/` for the workflow paths finds
  consumers in `scripts/check_governance.py` (CG-26 `BATTERY_WORKFLOW_FILE`, step list only) and in
  builders and installers that carry the path as data. None asserts the absence of a `concurrency` key
  or the bytes of the header. No test or check pins these bytes.
- [Observed] `scripts/check_docs_review_campaign_partition.py` with this raw and the new campaign file:
  see the run recorded in the PR, `unmatched=0`.

## Findings

N1 (low, `node-ci.yml:36-38`, `governance-docs.yml:31-33`) [Inferred]. A manual re-run of an old
`pull_request` run keeps `github.event_name == 'pull_request'` and the same group, so it cancels a newer
head's in-progress run of that PR. It cancels a run that is still wanted. It cannot touch push or
merge_group runs. This is the usual cost of the pattern; accepted as is. No change requested.

N2 (nit, `node-ci.yml:32`, `governance-docs.yml:27`). The first line of the new header comment is 116
columns while the following lines wrap near 78, which is what a one-word edit in the second commit left
behind. Cosmetic; no check reads it.

N3 (note, no file). The PR is behind `main` by the changes merged since `e423811a`. The two files do not
conflict with any of them, so the merge queue will integrate it. Nothing for the author.

## Not checked

- Behaviour under fork PRs or a changed target branch: the workflows only trigger for branches main.
- The hosted-runner saturation that motivated the bead; the PR is a mitigation and this review does not
  measure queue depth.

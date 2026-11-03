# R-GP-IMPL-NON-HUMAN-PINS-2 — CC-REV-1 implementation review of syzygy-bpyt.6.11, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: a6ac1314
Subject: git diff 5f0ab21f a6ac1314 (PR #614 head against its merge base) sha256 136f55a7160327a563a08531f946c1483461906663c9212bebc0ac22058c2ac8

Reviewer: fresh-context PR reviewer (Sonnet 5.5), 2026-11-03. I did not author the change. No
target-repository content was fetched or read; every input is a Syzygy file, the bead, or the PR
body. Source of the work: `docs/reviews/R-GP-IMPL-NON-HUMAN-PINS-1-RAW.md`, notes N3 and N4.
Exceptions: notes N1 to N3 below, none blocking.

## 1. Subject identity

- [Observed] PR #614 head is `a6ac1314085ad04b1f218bc5477938c9bb3d16c3`; merge base with
  `origin/main` (`2e27bd41`) is `5f0ab21f`. `origin/main` has moved since the base, so
  "identical to main" was checked against both.
- [Observed] Six commits over the base: `e6701ada` (comments), `16145259` and `bf5f5263`
  (harness), `0274a690` (selftest and mutants records), `6e58892b` (verification record),
  `a6ac1314` (drop the governance logs). 13 files changed, 2 outside `docs/evidence/`.
- [Observed] CI on the head: `checks`, `node`, `node (unit)`, `node (integration)`,
  `node (e2e)` all SUCCESS. No review threads. No session URL in any of the six commit messages
  (0 matches for `claude.ai/code` over `git log 5f0ab21f..a6ac1314 --format=%B`).

## 2. Production bytes

- [Observed] `git diff --quiet` of `act-fields.ts`, `body-read-authority.ts` and
  `walkthrough-judgment.ts` (all under `packages/three-surface-poc-core/src/`) returns 0 against
  the merge base AND against current `origin/main`: all three byte-identical both ways.
- [Observed] `git diff 5f0ab21f a6ac1314 -- packages` touches exactly the two test files, and
  every hunk is a `//` comment inside the `NON_HUMAN_OWNERS` array (20 lines changed in each,
  28 insertions, 12 deletions in all). No table row, no assertion changed.
- [Observed] The 2026-10-22 evidence directory is untouched (the old script is digest-cited, so
  the successor is a copy, as the PR body says).

## 3. Are the corrected comments true

- [Observed] Rule (`act-fields.ts:31-32`): arm 1 `^(agent|bot|machine|service|system|ci|pipeline|model)([:\s-]|$)`;
  arm 3 `^(?:agent|bot|ci|system|daemon|service|pipeline|automation|model|claude|syzygy)(?:[\s:/-]|$)`.
- [Observed] I derived each comment sentence from the rule, then checked it against the
  retained mutants record (`mutants-2026-11-03.json`, `failing` per mutant), and re-ran the
  harness (section 5) so the record is not taken on trust.
  - "bot, service: deploy, system, pipeline-7, model: x, agent: nightly ... kill only the
    deletion of that word from both arms at once": each of the six fails exactly one mutant,
    `both-arms-drop-<word>`, and no other. True, and it is N3's first request.
  - "agent/triage, bot/deploy, system/cron, service/gateway, pipeline/build, model/v2 (slash)
    and daemon nightly (whitespace) kill the single-arm deletions (second arm) and the separator
    deletions": each slash owner fails `arm3-drop-<word>`, `arm3-sep-drop-/` and
    `both-arms-drop-<word>`; `daemon nightly` fails `arm3-drop-daemon` and `arm3-sep-drop-\s`.
    True. The comment says "second arm" and arm 1 has no slash, which is why.
  - "daemon-7 (hyphen) kills the deletion of daemon from the second arm and of the hyphen from
    that arm's separator class": fails `arm3-drop-daemon`, `arm3-sep-drop--`. True. The
    hyphen needs `daemon-7` because `pipeline-7` also matches arm 1's hyphen.
  - "machine: build-42, machine runner and machine-7 are matched by the first arm alone and kill
    the colon, whitespace and hyphen deletions from its separator class": `machine` is in arm 1
    only; the three fail `arm1-sep-drop-colon`, `arm1-sep-drop-\s`, `arm1-sep-drop--` and
    `arm1-drop-machine`. True.
  - "Section 3H of R-GP-IMPL-OWNER-ACT-FIELDS-1 lists the first seven below": 3H
    (`R-GP-IMPL-OWNER-ACT-FIELDS-1-RAW.md:394-404`) names six both-arms word deletions and the
    colon deletion, which are the first seven rows (the colon one is `machine: build-42`). True.
- [Observed] The two comment blocks are byte-identical in the two files.
- [Inferred] N3's request is met in full: both halves, plus `daemon-7`. N3's third item (quote
  the headline as "every alternative whose deletion changes the language" in dispositions) is a
  disposition-text request, not a repository edit, and the PR body does say "8 equivalent
  survivors with arguments".

## 4. The harness copy (`mutate_non_human_principal.py`, `regex-differential.mjs`)

- [Observed] Reading the script against N4's list:
  - Self-digests: `harnessDigests` is written into the mutants record (`main`), and equals the
    on-disk sha256 of both files (`6d7ab39a…`, `b748775a…`; recomputed by `sha256`).
  - Total guard: `require_same_total` is called after every mutant and raises `SystemExit`; the
    `finally` restores the rule file first. The record carries `everyObservedTotalEqualsBaseline`
    (true; baseline 464).
  - Unchanged-mutant guard: `require_changed`; unrestored-file guard: `require_restored`.
  - `load_rule` asserts the file's regex equals the four arms the script spells, so a changed
    rule stops the run.
- [Observed] `--selftest` runs 9 cases (4 `load_rule`, 1 `require_changed`, 2
  `require_same_total`, 2 `require_restored`, one of them on a real file altered on disk). I
  ran it: exit 0, `allRefused` true, and its `cases` array is equal to the retained
  `selftest-2026-11-03.json`, with the same harness digest.
- [Observed] The rule-6 record of the selftest's own run exists (`selftest-2026-11-03.json`,
  old/new per case, commit `bf5f5263`).

### N1 — note (low). The selftest pins the predicates, not their wiring.

- Evidence:
  - [Observed] `selftest()` calls `load_rule`, `require_changed`, `require_same_total` and
    `require_restored` directly. It never calls `main`.
  - [Observed] I copied the script, deleted the three guard calls in `main`
    (`require_changed`, `require_restored`, `require_same_total`; `diff` shows exactly those
    three lines gone) and ran `--selftest`: exit 0, `allRefused` true. So the total guard that
    N4 asked for, the one that stops a mutant that breaks module load, can be removed from the
    run loop and nothing fails.
  - [Observed] As called, `require_restored(mid, sha(rule), ...)` runs after
    `rule.write_bytes(original_bytes)` in the same loop, so it checks that a write of the
    original bytes hashes to the original; it cannot detect anything but a filesystem fault.
    The `finally` is the real guard. [Inferred] harmless, but the "file not restored -> must
    fail" criterion is met at predicate level only.
- Failure scenario: a later edit drops the `require_same_total` line while tidying; the selftest
  and the retained records stay green, and the broken-module-load class reappears as a "survivor".
- Proposed fix (follow-up): move the loop body into a function taking an injectable
  `run_tests`, and add a selftest case that feeds it a fake that returns a short total and
  requires the refusal.

## 5. Re-runs and a mutation of my own

- [Observed] `npm ci` first. Then, in a detached worktree at the head:
  - `assemble_verification.py --verify verification-2026-11-03.json`: `{"checked": 5,
    "mismatched": []}`, exit 0.
  - Full harness run: `mutate_non_human_principal.py <tree> mine.json`. Baseline 464 tests, 0
    failed; 53 planned, 45 killed, 8 survivors, `section3HKilled` 8 of 8, `allRestored` true. My
    record equals the retained one on the id, `killed` and `observed` of all 53 mutants, the
    baseline and the harness digests; `git status --porcelain` clean afterwards.
  - Mutation of the verification input (copy of the directory): appended one line to
    `logs/typecheck.log` -> `--verify` exit 1, `mismatched: ["typecheck.log"]`; removed
    `logs/quotations-base.txt` -> exit 1, `mismatched: ["quotations-base.txt"]`. Both predicates
    refuse.

### N2 — note (low). `--verify` checks the five log hashes and nothing else in the record.

- Evidence:
  - [Observed] In my copy I changed `Tests  6110 passed` to `Tests  9999 passed` in
    `verification-2026-11-03.json` and ran `--verify`: exit 0, `mismatched: []`. The record's
    derived lines (`fullSuite.testsLine`, the typecheck and sweep lines, the quotation
    identity flag, the harness digests) are not re-derived from the retained logs or files.
  - [Observed] The record does not carry the sha256 of `mutants-2026-11-03.json` or
    `selftest-2026-11-03.json`, the two records its `mutants` and `harness` sections summarise
    (rule 11 names the subject and its digest). I recomputed that their `commit`,
    `harnessDigests` and `subjectDigests` agree with the tree, and they do.
- The PR body says "five retained log digests re-check with --verify", and that is exactly
  what it does; the gap is that "re-hashable" does not extend to the record's own claims.
- Proposed fix (follow-up, tooling only): have `--verify` re-run `line_matching` over the logs
  and compare to the record, and add the two record digests to `logDigests`-style output.

## 6. The eight survivors

- [Observed] The eight: `arm1-drop-{agent,bot,service,system,ci,pipeline,model}` and
  `arm3-drop-claude`. `machine` is not among them, correctly: it exists in arm 1 only.
- [Observed] Argument, by hand from the rule: the seven words are in both line-start arms; both
  arms carry `^` and flag `i`; arm 3's separator class `[\s:/-]|$` is a superset of arm 1's
  `[:\s-]|$`, so arm 3 matches whatever arm 1's copy of the word matched. `arm3-drop-claude`:
  arm 2 `\bclaude\b` matches `claude` at index 0 whenever arm 3's `claude` followed by a
  separator or end did, since a separator is non-word and index 0 before `c` is a boundary.
- [Observed] Independent check, not the harness corpus: 25,088 strings (14 words including
  `Claude`, `CLAUDE`, Kelvin-sign and dotless-i and long-s variants, 7 prefixes, 16 x 16
  suffix pairs including NBSP, EM SPACE, newline and `[bot]`), the original rule against each of
  the eight mutants: 0 disagreements.
- [Inferred] The eight are equivalent. The harness records an `equivalenceArgument` for each and
  puts none in `survivorsWithCorpusWitness` or `survivorsEquivalentOnCorpusWithoutArgument`
  (both `[]`).

## 7. Dropping the governance-log digests under rule 11

- [Observed] The retained set is five logs (`vitest-full.log`, `typecheck.log`,
  `authority-sweep.log`, `quotations-base.txt`, `quotations-head.txt`), each digest in
  `logDigests` and checked by `--verify`. The two `check_governance` logs are not retained and
  have no digest. The record says so: `gates.governance.logsRetained` false, and carries the
  last line of each (`32 OK, 21 WARN, 0 FAIL (53 checks)` at base and at head) and
  `lineDifferenceBaseToHead`, computed by `log_difference` from the two logs, not typed. That
  replaces the 2026-10-22 string literal N4 faulted.
- [Observed] The governance logs quote a retired acceptance phrase and CG-2a refuses a tracked
  file that does; `6e58892b` carried them and `a6ac1314` removed them (1425 and 1419 lines).
- [Inferred] This is acceptable under rule 11. The record names the tree it ran on
  (`tree.head` `6e58892b`, an ancestor of the reviewed head: `git merge-base --is-ancestor`
  true; the only later changes are the assembler, the record and the deleted logs) and the
  command, so the gate can be re-run at that commit; and N4's alternative was written as
  "retain the seven logs ... or drop logDigests in a new record", which this is. What is lost is
  a digest to compare a re-run against, which the record discloses rather than hides.

### N3 — note (low). The assembler's docstring contradicts itself; one record field names a commit that holds bytes the tree no longer has.

- Evidence:
  - [Observed] The docstring of `assemble_verification.py` says the logs are retained in
    `logs/` and lists `governance-base.txt, governance-head.txt` among them, then says the two
    governance logs are not retained. The code (`LOG_NAMES`) is the second.
  - [Observed] `filesChangedBaseToHead` in the record lists
    `logs/governance-base.txt` and `logs/governance-head.txt`, files that do not exist in the
    reviewed tree, because the list was taken at `6e58892b`. [Inferred] expected and
    disclosed by `tree.head`, but a reader who greps the tree for them finds nothing.
  - [Inferred] `6e58892b` is reachable only while the PR branch or a merge commit keeps it. The
    repository has merged PRs with merge commits (`Merge pull request #...` in the log), so it
    stays reachable; a rebase-merge would orphan it (AGENTS.md note on recorded heads).
- Proposed fix: correct the docstring; say in the record that the list is as of `tree.head`.

## 8. Findings summary

- Blocking: none.
- N1 (low): selftest pins the guard predicates, not the calls in the run loop.
- N2 (low): `--verify` re-hashes five logs but does not re-derive the record's claims or bind
  the two sibling records by digest.
- N3 (low): docstring contradiction and a file list as of an earlier commit.
- N4 and N3 of the predecessor review: N3 closed (comments true, verified against the mutants
  record and a fresh run); N4 closed except as N1 and N2 above, with the governance-log
  digests dropped acceptably (section 7).

## 9. Checks not done

- [Unknown] I did not run `check_governance.py` or `check_quotations.py` on the reviewed head
  to re-derive the governance last line; the record's base/head last lines are taken from it,
  and CI `checks` passed on the head. The full vitest suite was not re-run beyond the two gate
  test files inside the harness (464 tests); hosted CI is the broad evidence.
- [Observed] I did not edit PR #614.

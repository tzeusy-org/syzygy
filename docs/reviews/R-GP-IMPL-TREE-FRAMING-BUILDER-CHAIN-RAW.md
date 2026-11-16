# R-GP-IMPL-TREE-FRAMING-BUILDER-CHAIN — implementation review of syzygy-r11z, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: acc86577cd0f1d7a8123c0b0b7297c986aff67dd
Subject: PR #698

Reviewer: independent PR reviewer (review bead `syzygy-ze1d`). I did not author the change and did not
change it. Every command ran in the foreground in detached scratch worktrees at the reviewed commit
(`/tmp/r698/wt` for gates, `/tmp/r698/mt` for mutants), `TMPDIR=/tmp/r698`. No target-repository
content was read.

Diff population: `git diff f6085268 acc86577 --stat` names one file,
`scripts/build_pwb_behavior_contract_repin_tree_framing.py` (+70 −8). Base `f6085268` is the
merge-base with `origin/main`.

## Findings

F1 (exception, low, latent). `_scratch` reverses the later acts before this package's own patch, and
the docstring overclaims what that achieves. At line 384 the body is `subject_at_predecessor(ROOT,
subject)` and only then, `if performed(...)`, this package's patch is reversed. Were the tree-framing
re-pin performed, it would be performed after scope v5 and the machine ceiling, so its patch is the
newest and must be reversed first. More than that, `subject_at_act` would refuse on its first hash
check, because the live bytes would carry this package's patch on top of the scope-v5 argument. The
docstring sentence at line 377, "The fixtures then mean the same before and after this package's
acts and the later ones", is therefore [Inferred] false for the "after this package's acts" half.
My mutant M7, which moves the reversal of the package's own patch first, survives 50/50: no subject
is performed, so the branch is never exercised. It is latent only. `--check` refuses to build the
package over the current tree, so it cannot be performed without a redraft, and a redraft rewrites
this function anyway. Repair: fix the order or narrow the docstring, or file it against the redraft.

F2 (observation). Nothing pins the order of the `spec.md` chain. Mutant M5 swaps the anchor-resolution
and class-granular links in `build_pwb_behavior_contract_repin.LATER_SPEC_SIGNOFFS`, and it survives
50/50. [Inferred] The two patches commute over the current bytes, so the mutant is equivalent today.
I derived the order myself from each record's first-add commit, and it matches the tuple: tree framing
2026-10-03, anchor resolution 2026-10-14 15:44, class granular 2026-10-14 17:47, accessible name
2026-10-15 16:09, opening index 2026-10-15 16:54 (+08:00). The policy chain order is pinned by hash.
Mutant M4 swaps v2 and v3 and is killed with a ValueError. Its `Recorded at (UTC)` lines are v1
2026-10-07T17:47:25Z, v2 17:49:25Z, v3 2026-10-08T16:24:27Z, v4 2026-10-20T14:48:37Z and v5
2026-11-03T06:58:26Z. The machine ceiling is 2026-10-20T17:57:09Z. Both predecessor acts
(`…-BEHAVIOR-CONTRACT-REPIN-ACT.md`) date from 2026-10-02, before every later link.

F3 (observation). The 13 new fixtures take their expected values from the act records, not from
literals. The replay targets are `predecessor_digest` (the predecessor record's exact-digest line) and
`signed_spec_digest` (the tree-framing manifest row). Both are independent of the module under test,
so the oracle is sound. The chain lengths are not pinned: 1 for the registry, 5 for the policy and 4
for `spec.md`, which gives 3 + 10 = 13. A link deleted from the reused table also deletes its own
"without X" fixture. The main replay fixture still fails by hash, though (PR mutants; my M1, M2 and
M6), so no deletion survives. A dead link (M6, a record that does not exist) is caught by its own
"chain fails: policy without NO-SUCH-ACT.md" fixture.

F4 (observation). The `finally:` restore of `first_repin.LATER_SUBJECT_ACTS` (M8, replaced by `pass`)
survives 50/50. No later fixture reads the leaked policy chain. The restore is still correct hygiene.

F5 (observation). The "package stale" state is honest and was there before this PR. `--check` exits 1
with the same output at base `f6085268` and at the head: "registry: the subject hashes to f2b3573c…,
not the argument ad9cd676… of …REGISTRY-BEHAVIOR-CONTRACT-REPIN-ACT.md", and the same for policy
against …POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md. The PR changes neither `check` nor `base_bytes`.
The new replay is used only in `_scratch` and in the selftest, so it cannot hide a real-tree staleness.
The PR body calls this "reported stale". That paraphrases a refusal: the literal "stale and must be
redrafted" branch is never reached. `check_spec_reconciliation --selftest` gives the same answer on its
own: "pins-after-tree-framing-repin-acts not run: the package does not build over this tree".

## Digest-bound and act-cited bytes

- [Observed] Nothing bound changed. The one changed path is not a key of
  `check_governance.ACT_DIGEST_COPY_FILES`, which I tested by script. The only tracked `*MANIFEST*`
  or `*.txt` citer of the path is `docs/evidence/p115-implementation-authorization-2026-10-28/MANIFEST.json`.
- [Observed] That P115 evidence set cites the base blob's sha256 (`a0aab728…`) in four records:
  MANIFEST.json, SOURCE-BINDINGS.json, CURRENT-SOURCE-REFRESH.json and CONSUMER-CENSUS.json. Each one
  is a census of the file at a named `sourceHead` (`973965a8…`), with a `retainedAt` copy.
- [Observed] `git grep` finds no reader of `CURRENT-SOURCE-REFRESH` or of that directory under
  `scripts/`, `packages/`, `apps/` or `.github/`. So the census records history and is not a live
  binding, and this edit retires nothing.
- [Observed] The head blob's sha256 (`62c7237b…`) is cited nowhere.
- [Observed] There is no `PWB_SUCCESSOR_CHAIN` change: the diff has 0 occurrences of it. The PR adds
  no act record and no tree-framing re-pin record: `PWB-*TREE-FRAMING-REPIN*` matches nothing in
  `decisions/`.
- [Observed] The reuse only reads `first_repin`'s existing tables of performed acts. It asserts no new
  adoption order.

## Chain-order correctness of the reuse

- [Observed] `LATER_SPEC_SIGNOFFS` is the first re-pin's chain sliced after the index of
  `SIGNING_RECORD`, which is `PWB-TREE-FRAMING-AMENDMENT-SIGNOFF-v1.0.md`. This package pins the
  tree-framing manifest's `spec.md` row, so the later sign-offs are the other four, which is right.
- [Observed] Mutant M1 (slice from `_SIGNING_AT`) is killed: the replay lands on `0d50f8f4…`, not the
  pinned row. Mutant M2 (slice from `_SIGNING_AT + 2`) is killed with a ValueError.
- [Observed] This package's predecessors are the behaviour-contract re-pin acts, the very acts whose
  successors `first_repin.LATER_SUBJECT_ACTS` lists. Delegating to `subject_at_act` is therefore the
  right reversal for an unperformed package (see F1 for the performed case).

## Rule-6 mutants (mine; at acc86577, each restored, `git status` clean afterwards)

| ID | Target | old → new | Result |
|---|---|---|---|
| M1 | tree-framing | `LATER_SPEC_SIGNOFFS[_SIGNING_AT + 1:])` → `[_SIGNING_AT:])` | KILLED, ValueError in `spec_at_pin` |
| M2 | tree-framing | `[_SIGNING_AT + 1:])` → `[_SIGNING_AT + 2:])` | KILLED, ValueError in `spec_at_pin` |
| M3 | tree-framing | `return first_repin.subject_at_act(root, subject)` → `return read(root, subject.path)` | KILLED, 50 fixtures, 23 failing |
| M4 | first re-pin | swap the scope-V2 and scope-V3 tuples in `LATER_SUBJECT_ACTS["policy"]` | KILLED, ValueError (policy hash vs the V2 argument) |
| M5 | first re-pin | swap the anchor-resolution and class-granular tuples in `LATER_SPEC_SIGNOFFS` | SURVIVED, 50/0 (F2; equivalent today) |
| M6 | first re-pin | append `(DECISIONS / "NO-SUCH-ACT.md", pathlib.Path("no/such.patch"))` after scope V3 | KILLED, 51 fixtures, 1 failing |
| M7 | tree-framing | reverse own patch from live first, then `body = subject_at_predecessor(...)` | SURVIVED, 50/0 (F1; branch unexercised) |
| M8 | tree-framing | `finally: first_repin.LATER_SUBJECT_ACTS = kept` → `finally: pass` | SURVIVED, 50/0 (F4) |

M4 and M5 were re-run with `__pycache__` removed and `PYTHONDONTWRITEBYTECODE=1`. The first M5 run
reused a stale `.pyc` of the imported module, written within the same second at the same size by M4,
and is discarded. M1–M3 and M7–M8 mutate the `__main__` script, which is never cached.

## Gates (at acc86577, scratch worktree `/tmp/r698/wt`, all foreground)

- `python3 scripts/build_pwb_behavior_contract_repin_tree_framing.py --selftest`: exit 0, "50 fixtures,
  0 failing", 50 PASS lines.
- `… --check`: exit 1, the two refusals quoted in F5, identical at the base.
- `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `python3 scripts/check_governance.py --selftest`: exit 0, "433 fixtures, 0 failing".
- `python3 scripts/check_spec_reconciliation.py --check`: exit 0, "7 of 7 predicates without FAIL;
  PASS". R6 WARN reports 2 stale pins, which is pre-existing and report-only.
- `python3 scripts/check_spec_reconciliation.py --selftest`: exit 0, "SELFTEST PASS … 102 of 102
  mutants killed by their expected predicate (commit acc86577cd0f)".

## Test delta

The PR states "+13 ~0 -0". I counted 13 new fixtures (registry 1 + 1, policy 1 + 5, `spec.md` 1 + 4).
They extend the existing `selftest()` and reuse its result list, and they do not assert any source
text.

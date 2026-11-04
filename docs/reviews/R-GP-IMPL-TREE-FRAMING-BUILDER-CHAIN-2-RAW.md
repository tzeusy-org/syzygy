# R-GP-IMPL-TREE-FRAMING-BUILDER-CHAIN-2 — implementation review of syzygy-9w15, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 3b4dd593ec0f1c1c7541bdab8beb4a7a01ab230c
Subject: PR #706

Reviewer: independent PR reviewer (review bead `syzygy-73ol`). I did not author the change and did not
change it. Every command ran in detached scratch worktrees at the reviewed commit (`/tmp/r706/head` for
gates, `/tmp/r706/mt` for mutants) and at the base (`/tmp/r706/base`), with `TMPDIR=/tmp/r706` and
`PYTHONDONTWRITEBYTECODE=1`. No target-repository content was read.

Diff population: PR #706 is stacked on #698. `git diff origin/agent/syzygy-r11z...3b4dd593 --stat` names one
file, `scripts/build_pwb_behavior_contract_repin_tree_framing.py` (+152 −30), in one commit. The base head is
`acc86577cd0f1d7a8123c0b0b7297c986aff67dd`, the commit round 1 of this campaign (`R-GP-IMPL-TREE-FRAMING-BUILDER-CHAIN-RAW.md`
on `agent/syzygy-ze1d`) reviewed.

## Findings

F1 (exception, low, latent). The PR fixes the act order in `_scratch` but leaves the opposite order in
`base_bytes`, so in a performed tree the two encode different histories. `subject_at_predecessor` now
assumes this package's act lands after the later acts (own patch reversed first, then the later chain).
`base_bytes` (lines 234-250, unchanged) reverses only the package's own patch and compares the result with
the predecessor's digest, so it assumes nothing was performed between the two. I built the PR's own
synthetic performed tree (stand-in patches, stub records) in a probe and called both functions over it.
`subject_at_predecessor` returns `ad9cd676…` and `66cd41ee…`. `base_bytes` refuses both subjects:
"registry: the tree with the patch reversed hashes to f2b3573c…, not the argument ad9cd676…", and the
same for policy at `e8a2f4f3…`. So `check()` would refuse the same tree whose scratch replays cleanly.
The `_scratch` docstring sentence "The fixtures then mean the same before and after this package's acts and
the later ones" is [Observed] true for the scratch and [Inferred] not true for the package. The PR body says
plainly that `check()` and `base_bytes()` are untouched. The finding stays latent for the reason round 1
gave: the package does not build over the current tree (F5 of round 1), and a redraft over the current
tree would have to change `base_bytes` or the predecessor anyway. Repair: name this in the redraft bead, or
make `base_bytes` reverse through `subject_at_predecessor`'s order.

F2 (observation). The own-patch reversal reads no digest of this package's own act, although the
docstring says every reversal starts "each from its own exact digest". The synthetic records are one line,
`# synthetic superseding record`, with no exact-digest line, and the post-act fixture still passes. The
reversal is still guarded: the scope-v5 and machine-ceiling checks inside `first_repin.subject_at_act`
refuse any body that does not hash to their argument after the reversal (the PR's corrupt-patch fixture
proves it fails). This matches the sibling, whose `base_bytes` does not read its own record's digest
either. A record carrying the wrong digest would go unnoticed here.

F3 (observation). The `source` parameter of `_scratch` is pinned only where it reaches the subjects. My
mutants N9 (`spec_at_pin(source)` → `spec_at_pin(ROOT)`) and N10 (`shutil.copyfile(source / rel, …)` →
`shutil.copyfile(ROOT / rel, …)`) both survive 58/0. [Inferred] Both are equivalent in the fixture: the
performed source copies `spec.md` from ROOT, and the post-act fixture hashes only the two subjects, so the
package patch copied from ROOT and not from the stand-in source is never examined. This is harmless today
and would matter only for a fixture that reads the scratch's patch or spec.

F4 (observation). The performed-source fixture builds its tree with the module under test's own
`_chain_inputs(ROOT)`. That is why mutant N3, which drops the `LATER_SPEC_SIGNOFFS` loop from
`_chain_inputs`, is killed: the source lacks the later `spec.md` patches, so `spec_at_pin(source)` refuses.
`subject_at_predecessor`'s view does not need those files. The kill is real, but it comes through fixture
construction, not through the function the loop serves.

## Act order (is the new order correct?)

[Observed] Yes. This package is unperformed: `ls .syzygy/governance/decisions | grep -i TREE-FRAMING-REPIN`
is empty. Every link in `first_repin.LATER_SUBJECT_ACTS` is performed and dated after both predecessor acts.

| Record | `Recorded at (UTC)` | First-add commit (committer, +08:00) |
|---|---|---|
| `…-BEHAVIOR-CONTRACT-REPIN-ACT.md` (registry, policy) | (none) | 2026-10-02 22:13:03 |
| `…-PUBLIC-SOURCE-SCOPE-ACT.md` | 2026-10-07T17:47:25Z | 2026-10-08 02:11:41 |
| `…-SCOPE-V2-ACT.md` | 2026-10-07T17:49:25Z | 2026-10-08 02:11:41 |
| `…-SCOPE-V3-ACT.md` | 2026-10-08T16:24:27Z | 2026-10-09 04:41:59 |
| `…-SCOPE-V4-ACT.md` | 2026-10-20T14:48:37Z | 2026-10-20 22:50:47 |
| `…-SCOPE-V5-ACT.md` | 2026-11-03T06:58:26Z | 2026-11-03 14:42:29 |
| `…-REGISTRY-MACHINE-CEILING-ACT.md` | 2026-10-20T17:57:09Z | 2026-10-21 02:06:19 |

So were this package performed, its act would be the newest, and reversing its patch first is the right
order. That matches the sibling: `first_repin.base_bytes` reverses `subject_at_act` first and its own patch
second, because its own acts (2026-10-02) predate the later chain.

[Observed] The `spec.md` literal order matches each sign-off's first-add commit. Author dates are anchor
resolution 2026-10-14 15:44:14, class granular 17:47:56, accessible name 2026-10-15 16:09:44 and opening
index 16:54:27, which are the times the fixture comment quotes. Committer dates are 16:00:13, 18:03:39,
16:26:09 and 17:45:17, in the same order. The comment's times are author dates, which it does not say.

[Observed] The literal digests match the records: the exact-digest lines of the two
`…-BEHAVIOR-CONTRACT-REPIN-ACT.md` records begin `ad9cd676` and `66cd41ee`, and the tree-framing manifest's
`spec.md` row begins `d0ac6ba2`. The selftest also asserts all three in full.

## Synthetic performed tree (is it faithful?)

[Observed] Faithful for what `_scratch` reads, and only that. The source holds every `_inputs()` file and
every `_chain_inputs(ROOT)` file. Each subject is the live tree with one stand-in edit on top
(`"schemaVersion": 1` → `2` for the registry; one added space after `"policyVersion"` for the policy). The
stand-in patch is a `difflib` unified diff written at the package's own `patch_path`, and a stub record
sits at `subject.record`, so `performed()` is true. The real patches cannot stand in, because they were
drafted over the predecessor bytes (round 1 F5). The stub records carry no digest, which is faithful
because nothing on this path reads them (F2), and `check()` is not exercised over this tree (F1). The
negative fixture, which corrupts the registry stand-in's added line, proves the replay read the source.
Without it the same digests are reached from ROOT.

## Digest-bound and act-cited bytes

- [Observed] Nothing bound changed. The one changed path is not a key of
  `check_governance.ACT_DIGEST_COPY_FILES` (tested by script). `git diff … -- .syzygy openspec` is empty.
- [Observed] The head blob's sha256 (`8daf38c0…`) and the base blob's (`62c7237b…`) are each cited by no
  tracked file. I swept with `git grep -l` on each 16-hex prefix at the head and got 0 hits.
- [Observed] No `PWB_SUCCESSOR_CHAIN` link was added: the diff has 0 occurrences of the identifier. The PR
  adds no act record and asserts no new adoption order. It reads `first_repin`'s existing tables, and the
  sibling builder is byte-unchanged.

## Real-tree `--check`

[Observed] Byte-identical. `--check` exits 1 at the head and at the base, and `cmp` of the two outputs
reports no difference. Both carry the two refusals quoted in F1, over the live tree (`f2b3573c…` against
`ad9cd676…`, `e8a2f4f3…` against `66cd41ee…`).

## Rule-6 mutants (mine; at 3b4dd593 in `/tmp/r706/mt`, `__pycache__` removed before each, each restored)

| ID | Target | old → new | Result |
|---|---|---|---|
| N1 | tree-framing | insert `return first_repin.subject_at_act(root, subject)` before the own-patch reversal (the performed branch ignores its own patch) | KILLED, 58 fixtures, 1 failing: post-act scratch |
| N2 | tree-framing | `paths \|= {record, first_repin._later_patch(root, record, patch)}` → `paths \|= {record, patch}` | KILLED, selftest crashes (FileNotFoundError on the unresolved `{variant}` path) |
| N3 | tree-framing | delete the `LATER_SPEC_SIGNOFFS` loop from `_chain_inputs` | KILLED, 1 failing: post-act scratch (through fixture construction, F4) |
| N5 | first re-pin | swap the accessible-name and opening-index tuples in `LATER_SPEC_SIGNOFFS` | KILLED, 1 failing: "chain: spec.md is the 4 later sign-offs in act order" |
| N6 | first re-pin | swap the scope-V4 and scope-V5 tuples in `LATER_SUBJECT_ACTS["policy"]` | KILLED, ValueError (policy hash `e8a2f4f3…` against the V4 argument) |
| N7 | tree-framing | `if not performed(root, subject):` → `if True:` | KILLED, 1 failing: post-act scratch |
| N9 | tree-framing | `spec_at_pin(source)` → `spec_at_pin(ROOT)` in `_scratch` | SURVIVED, 58/0 (F3; equivalent in the fixture) |
| N10 | tree-framing | `shutil.copyfile(source / rel, dest / rel)` → `shutil.copyfile(ROOT / rel, dest / rel)` | SURVIVED, 58/0 (F3) |
| N11 | tree-framing | delete `(view / subject.path).write_bytes(body)` | KILLED, 1 failing: post-act scratch |

N5 now kills round 1's surviving M5 class (swap two commuting `spec.md` links). After the run, `git status
--porcelain` in the mutant worktree showed only my untracked `node_modules` link.

## Gates (at 3b4dd593, `/tmp/r706/head`, after `npm ci`)

- `python3 scripts/build_pwb_behavior_contract_repin_tree_framing.py --selftest`: exit 0, "58 fixtures, 0
  failing"; 58 PASS lines, 0 FAIL lines.
- `… --check`: exit 1, byte-identical to the base output (see above).
- `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `python3 scripts/check_governance.py --selftest`: exit 0, "433 fixtures, 0 failing".
- `python3 scripts/check_spec_reconciliation.py --check`: exit 0, "7 of 7 predicates without FAIL; PASS".
- `python3 scripts/check_spec_reconciliation.py --selftest`: exit 0, "SELFTEST PASS … 102 of 102
  mutants killed by their expected predicate (commit 3b4dd593ec0f)". It ran in the background over the clean
  head worktree (`git status` clean apart from `node_modules`), so the label is the reviewed commit itself.

## Test delta

[Observed] The PR states 50 → 58. I recount: 50 − 13 old chain fixtures + 21 new = 58. The 21 are 2 literal
digest fixtures, registry 3 (order, replay, 1 dropped link), policy 7 (order, replay, 5 dropped links), 1
table restore, `spec.md` 6 (order, replay, 4 dropped links) and 2 post-act scratch. They extend the existing
`selftest()` and its result list, and they assert no source text. Expected values are literals, never
read back from the module under test.

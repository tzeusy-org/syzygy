# Fixture PID sweep: review dispositions, round 3

[Observed] This record dispositions the CC-REV-1 reviews of `syzygy-bpyt.4.10`
(pull request #509). The change names each three-surface POC fixture copy and
template by its owner process and PID namespace
(`p<pid>-n<pid-namespace-inode>`). One sweep per run then removes only those
fixture directories whose owner is dead in the sweeper's own namespace, are
directories under `lstat` and belong to the same user. The sweep runs as the
app project's Vitest global setup and at the start of
`polaris-accessibility-main.ts`. Where `/proc/self/ns/pid` cannot be read, the
sweep lists and removes nothing.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-FIXTURE-PID-SWEEP-1-RAW.md` | `REVISE` | `c64d2834` | `r1-review.diff` sha256 `095dd13e22e3ed61ca2733f80f8bbdf86cef2aeadf875278346acfed741042f2` |
| 2 | `docs/reviews/R-GP-IMPL-FIXTURE-PID-SWEEP-2-RAW.md` | `REVISE` | `564ec47c` | `r2-review.diff` sha256 `809899094eee9ebbb60d07a47900b3d512d167c80c15d7992767a99edc5ffd1d` |
| 3 | `docs/reviews/R-GP-IMPL-FIXTURE-PID-SWEEP-3-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `a6be8816` | `r3-review.diff` sha256 `ce3b908688b10fa5c43449734c3f783785e378d65b5bfb05550437fd5dd3b8cb` |

Round 3's subject equals `git diff 9a30237ed700e6579f3fcc1c6292e6c759861c3f
a6be88169abd9287de0fe181f83d36d61983cd34`. At landing the branch took one
merge of main `ce322e1a` (#516). The reviewer found no file overlap (section 1).
After that merge, `git diff origin/main HEAD | sha256sum` printed the same
digest as the subject.

Round 3 reports "There are no new F findings." (raw line 11). It has two notes,
N12 and N13. Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Rounds 1 and 2

[Observed in the raws] Round 1 had four blocking findings (F1–F4) and six notes.
Round 2 found F1–F4 and N1–N3 repaired. It raised one blocking finding, F5: the
`0` fallback treated every PID namespace without a readable `/proc` as one
namespace, so a sweep there removed a live run's directories. It also raised five
notes, N7–N11. The coordinator's round-2 dispositions:
- F5: fix fail-closed, with no reading meaning no sweep;
- N7: a stated residual;
- N8, N9 and N10: fix;
- N11: filed as `syzygy-bpyt.4.18`.

Round 3 (section 4) found:
- F5 repaired, with the reviewer's own two-sandbox `--tmpfs /proc` probe;
- N7 stated in the PR body;
- N8 and N9 repaired;
- N10 repaired for the four tools round 2 named;
- F1–F4 and N1–N3 still repaired.

## Class

Round 3 rules **class none** (section 2): test support, plus one operator CLI
that removes dead runs' fixture directories under its own temp directory. No
auth surface, egress path, governed write or external interface changes. So
GP-Q0's three extra checks do not apply, and no `syzygy-bpyt.10` owner notice is
due.

## Retained review evidence

Each reviewer's tools and summary results are kept under
`docs/evidence/fixture-pid-sweep-review-2026-10-24/`, one directory per round:
- `r1/` (21 files): round 1's scripts and result JSONs. The Vitest logs and the
  re-derived diff are not kept; the raw quotes their result lines.
- `r2/` (36 files): round 2's `tools/` directory as the reviewer left it.
- `r3/` (43 files): round 3's `tools/` directory as the reviewer left it.

[Observed] The eight round-3 files the raw cites by digest each hash to the value
it gives:
- `my-mutants.json` `60897615ba6778aa01a7b2ef3ab73d7f3f6d660354471e8c6fb1ec1862dde32d`;
- `noproc-vitest.log` `d1d74fa67af2838dae6de65e3fb0dd6b107faf95fd910ac06cd51b0f58ec38e6`;
- `kill-probe.json` `10458f4b974d6cb1b68ef77cf7d9fe93b714b9b23472f4c34fe1fb6e80c60da1`;
- `ns-probe-head.json` `8191c65f70f05e8980f7f154a0b2cc5161c47a48c4789736f4ad442a9377e8c8`;
- `ns-probe-reads-as-0.json` `7ba611c4b50c11dc3a6c811aeaa0f044cef405914541cfb9f4f810ee7790778c`;
- `cli-probe.json` `6080c22f6d4f37e65c96b196634aa74253c04a3329ef098891f6ffc0de37a686`;
- `fixture-directories.head.mjs` `2bf2fe12d1deb358fd3ebb0848ae56c94fede9db376bcfda1f3fb01cc26eba5e`;
- `fixture-directories.reads-as-0.mjs` `c154cf7c56150c1ac48f1370c53eb276461486aea6638480e8aba34dc5b7273e`.

## N12: the two F5 tests fail wherever the PID namespace cannot be read

[Observed by the reviewer] `fixture-directories.test.ts:19` falls back to
`NS = '0'`. In the F5 test, the names at lines 154 and 156 then coincide, so the
test expects three directories where two exist. Inside `bwrap --unshare-user
--unshare-pid --tmpfs /proc`, the file reported "(16 tests | 2 failed | 7
skipped)". The sweep itself behaved correctly there: it listed nothing and
removed nothing. The comment at lines 21-23 says the unreadable case runs
everywhere. This repository's CI reads its namespace, so CI is unaffected.

**Disposition:** filed as `syzygy-bpyt.4.20`. Give the third name its own
suffix, re-run the sandboxed file, and record 0 failures with the full commit.
It cannot ride in this PR, because any byte change would retire round 3.

## N13: `leak_by_file.py` empties directories under an unguarded scratch root

[Observed by the reviewer] `docs/evidence/poc-fixture-leak-2026-10-22/leak_by_file.py`
runs `shutil.rmtree` on `<root>/fNN` (lines 36-37 and 53) without the
`private_directory()` guard that round 2's N10 added to four other tools. The
PR body's "the four evidence tools that take a scratch directory" undercounts:
five take one. This is evidence tooling only; the suite never runs it.

**Disposition:** filed as `syzygy-bpyt.4.20`, beside N12. Guard the root, add
the tool to `guard_probe.py`'s population and wiring check, and re-run
`guard_probe`. Until then, read the PR body's N10 row as "four of the five".
`leak_by_file.py` is the fifth.

## Acceptance criteria (raw section 7)

- AC1 met. The diagnosis record names its base in full. The AC's "39 callers" is
  an earlier count; the record's population is disclosed (42 at base, 43 at the
  code commit).
- AC2 met. "Never a live PID" now holds without `/proc` too (raw runs 6 and 7).
- AC3 met. In the reviewer's own SIGKILL probe at `a6be8816`, 6 dead-pid
  directories remained after the kill and 0 after one fresh run, which exited 0.
  With the sweep disabled, the lane's record keeps 5.
- AC4 met. Live-pid and legacy names survive, in tests, and their mutants are
  killed.
- AC5 met. Hosted CI is green at `a6be8816` (5126 passed, 0 failed),
  `Tests: +18 ~0 -0` is verified, and the class is none.
